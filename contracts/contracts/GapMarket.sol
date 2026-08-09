// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice The subset of Chainlink's AggregatorV3Interface GapMarket needs.
/// Works unchanged against MockAggregator (testnet) or a real Chainlink feed
/// (mainnet) — the market's price source is never trusted off-chain.
interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/// @title GapMarket
/// @notice Non-custodial pari-mutuel prediction market: bet whether a stock's
/// price rises or falls during a session, resolved by reading the same
/// on-chain price feed at session start and session end. No off-chain
/// resolver, no admin fund access — createMarket is the only owner-gated
/// action, everything else (lock, resolve, claim) is permissionless.
/// Testnet only for now — see CLAUDE.md.
contract GapMarket {
    enum State {
        Created,
        Locked,
        Resolved
    }

    enum Outcome {
        Undecided,
        Up,
        Down,
        Push
    }

    struct Market {
        bytes32 ticker;
        address feed;
        uint64 locksAt; // betting closes, start price snapshot taken at/after this
        uint64 resolvesAt; // end price snapshot taken at/after this
        int256 startPrice;
        int256 endPrice;
        uint256 upPool;
        uint256 downPool;
        State state;
        Outcome outcome;
    }

    /// @notice A feed reading older than this is refused as a lock/resolve
    /// snapshot — protects against resolving off a price the pusher script
    /// stopped updating a long time ago.
    uint256 public constant MAX_PRICE_STALENESS = 30 minutes;

    address public owner;
    uint256 public marketCount;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public upBets;
    mapping(uint256 => mapping(address => uint256)) public downBets;
    mapping(uint256 => mapping(address => bool)) public claimed;

    uint256 private _reentrancyLock = 1;

    event MarketCreated(
        uint256 indexed id,
        bytes32 indexed ticker,
        address feed,
        uint64 locksAt,
        uint64 resolvesAt
    );
    event BetPlaced(uint256 indexed id, address indexed user, bool up, uint256 amount);
    event MarketLocked(uint256 indexed id, int256 startPrice);
    event MarketResolved(uint256 indexed id, Outcome outcome, int256 startPrice, int256 endPrice);
    event Claimed(uint256 indexed id, address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier nonReentrant() {
        require(_reentrancyLock == 1, "reentrant");
        _reentrancyLock = 2;
        _;
        _reentrancyLock = 1;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        owner = newOwner;
    }

    /// @param ticker Short ticker as bytes32, e.g. bytes32("NVDA").
    /// @param feed AggregatorV3-compatible price feed for this ticker.
    /// @param locksAt Unix timestamp betting closes / start price is read at.
    /// @param resolvesAt Unix timestamp end price is read at. Must be after locksAt.
    function createMarket(
        bytes32 ticker,
        address feed,
        uint64 locksAt,
        uint64 resolvesAt
    ) external onlyOwner returns (uint256 id) {
        require(feed != address(0), "zero feed");
        require(locksAt > block.timestamp, "locksAt in the past");
        require(resolvesAt > locksAt, "resolvesAt before locksAt");

        id = marketCount++;
        markets[id] = Market({
            ticker: ticker,
            feed: feed,
            locksAt: locksAt,
            resolvesAt: resolvesAt,
            startPrice: 0,
            endPrice: 0,
            upPool: 0,
            downPool: 0,
            state: State.Created,
            outcome: Outcome.Undecided
        });

        emit MarketCreated(id, ticker, feed, locksAt, resolvesAt);
    }

    /// @notice Bet that the price will be higher (`up = true`) or lower
    /// (`up = false`) at `resolvesAt` than at `locksAt`. Add to an existing
    /// position by calling again before locksAt.
    function placeBet(uint256 id, bool up) external payable {
        Market storage m = markets[id];
        require(m.feed != address(0), "no such market");
        require(block.timestamp < m.locksAt, "betting closed");
        require(msg.value > 0, "no stake");

        if (up) {
            upBets[id][msg.sender] += msg.value;
            m.upPool += msg.value;
        } else {
            downBets[id][msg.sender] += msg.value;
            m.downPool += msg.value;
        }

        emit BetPlaced(id, msg.sender, up, msg.value);
    }

    /// @notice Snapshots the start price. Permissionless and callable by
    /// anyone once `locksAt` has passed — the price itself comes from the
    /// feed, not from the caller, so there's nothing to trust about who calls it.
    function lockMarket(uint256 id) external {
        Market storage m = markets[id];
        require(m.state == State.Created, "already locked");
        require(block.timestamp >= m.locksAt, "too early to lock");

        m.startPrice = _readFreshPrice(m.feed);
        m.state = State.Locked;

        emit MarketLocked(id, m.startPrice);
    }

    /// @notice Snapshots the end price and settles the outcome. Permissionless,
    /// same trust model as lockMarket.
    function resolveMarket(uint256 id) external {
        Market storage m = markets[id];
        require(m.state == State.Locked, "not locked");
        require(block.timestamp >= m.resolvesAt, "too early to resolve");

        m.endPrice = _readFreshPrice(m.feed);

        if (m.endPrice > m.startPrice) {
            m.outcome = Outcome.Up;
        } else if (m.endPrice < m.startPrice) {
            m.outcome = Outcome.Down;
        } else {
            m.outcome = Outcome.Push;
        }
        m.state = State.Resolved;

        emit MarketResolved(id, m.outcome, m.startPrice, m.endPrice);
    }

    /// @notice Claims this caller's winnings (or refund, on a Push / a
    /// decisive outcome nobody bet on) for a resolved market.
    function claim(uint256 id) external nonReentrant {
        require(markets[id].state == State.Resolved, "not resolved");
        require(!claimed[id][msg.sender], "already claimed");

        uint256 payout = claimableOf(id, msg.sender);
        require(payout > 0, "nothing to claim");

        claimed[id][msg.sender] = true; // effects before interaction

        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "transfer failed");

        emit Claimed(id, msg.sender, payout);
    }

    /// @notice View-only payout preview for the frontend; same math as claim().
    function claimableOf(uint256 id, address user) public view returns (uint256) {
        Market storage m = markets[id];
        if (m.state != State.Resolved || claimed[id][user]) return 0;

        uint256 up = upBets[id][user];
        uint256 down = downBets[id][user];
        if (up == 0 && down == 0) return 0;

        if (m.outcome == Outcome.Push) {
            return up + down;
        }

        bool upWon = m.outcome == Outcome.Up;
        uint256 winnerPool = upWon ? m.upPool : m.downPool;
        uint256 loserPool = upWon ? m.downPool : m.upPool;
        uint256 userWinnerStake = upWon ? up : down;

        if (winnerPool == 0) {
            // A decisive outcome nobody bet on — refund both sides rather
            // than stranding the pool with no eligible claimant.
            return up + down;
        }
        if (userWinnerStake == 0) return 0;

        return userWinnerStake + (userWinnerStake * loserPool) / winnerPool;
    }

    function _readFreshPrice(address feed) private view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = IAggregatorV3(feed).latestRoundData();
        require(answer > 0, "bad feed answer");
        require(block.timestamp - updatedAt <= MAX_PRICE_STALENESS, "stale price");
        return answer;
    }
}

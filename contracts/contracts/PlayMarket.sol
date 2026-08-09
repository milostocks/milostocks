// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice The subset of Chainlink's AggregatorV3Interface PlayMarket needs.
/// Identical to GapMarket's — see that file for why this isn't imported from
/// a shared location (two contracts, one tiny interface, not worth a package).
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

/// @title PlayMarket
/// @notice Free-to-play sibling of GapMarket: same pari-mutuel bet/lock/
/// resolve/claim mechanic, but denominated in a non-transferable "chip"
/// balance instead of real ETH. Anyone can claim WEEKLY_CHIPS once per
/// calendar week (block.timestamp / 7 days) — claiming **resets** the
/// balance to WEEKLY_CHIPS rather than adding to it, so last week's winnings
/// (or losses) don't carry over: a fresh weekly leaderboard, not an all-time
/// one. Chips have no monetary value and can never leave this contract —
/// there is deliberately no withdraw/transfer path.
contract PlayMarket {
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
        uint64 locksAt;
        uint64 resolvesAt;
        int256 startPrice;
        int256 endPrice;
        uint256 upPool;
        uint256 downPool;
        State state;
        Outcome outcome;
    }

    uint256 public constant WEEKLY_CHIPS = 0.1 ether; // a virtual unit, not real ETH — see contract notice
    uint256 public constant WEEK = 7 days;

    /// @notice A feed reading older than this is refused as a lock/resolve
    /// snapshot — same staleness guard as GapMarket.
    uint256 public constant MAX_PRICE_STALENESS = 30 minutes;

    address public owner;
    uint256 public marketCount;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public upBets;
    mapping(uint256 => mapping(address => uint256)) public downBets;
    mapping(uint256 => mapping(address => bool)) public claimed;

    mapping(address => uint256) public chipBalance;
    /// @notice Week index (block.timestamp / WEEK) this address last claimed. 0 = never claimed.
    mapping(address => uint256) public lastClaimedWeek;

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
    event ChipsClaimed(address indexed user, uint256 week, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        owner = newOwner;
    }

    function currentWeek() public view returns (uint256) {
        return block.timestamp / WEEK;
    }

    /// @notice Claims this week's free chips — once per address per week.
    /// Resets `chipBalance` to WEEKLY_CHIPS rather than adding to it: last
    /// week's balance (won, lost, or unspent) doesn't carry over.
    function claimWeeklyChips() external {
        uint256 week = currentWeek();
        require(lastClaimedWeek[msg.sender] != week, "already claimed this week");

        lastClaimedWeek[msg.sender] = week;
        chipBalance[msg.sender] = WEEKLY_CHIPS;

        emit ChipsClaimed(msg.sender, week, WEEKLY_CHIPS);
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

    /// @notice Bet `amount` chips that the price will be higher (`up = true`)
    /// or lower (`up = false`) at `resolvesAt` than at `locksAt`. Deducted
    /// immediately from `chipBalance` — top up with claimWeeklyChips() first.
    function placeBet(uint256 id, bool up, uint256 amount) external {
        Market storage m = markets[id];
        require(m.feed != address(0), "no such market");
        require(block.timestamp < m.locksAt, "betting closed");
        require(amount > 0, "no stake");
        require(chipBalance[msg.sender] >= amount, "insufficient chips");

        chipBalance[msg.sender] -= amount;

        if (up) {
            upBets[id][msg.sender] += amount;
            m.upPool += amount;
        } else {
            downBets[id][msg.sender] += amount;
            m.downPool += amount;
        }

        emit BetPlaced(id, msg.sender, up, amount);
    }

    /// @notice Snapshots the start price. Permissionless, same trust model as GapMarket.
    function lockMarket(uint256 id) external {
        Market storage m = markets[id];
        require(m.state == State.Created, "already locked");
        require(block.timestamp >= m.locksAt, "too early to lock");

        m.startPrice = _readFreshPrice(m.feed);
        m.state = State.Locked;

        emit MarketLocked(id, m.startPrice);
    }

    /// @notice Snapshots the end price and settles the outcome. Permissionless.
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

    /// @notice Credits this caller's winnings (or refund, on a Push / a
    /// decisive outcome nobody bet on) back into `chipBalance`. No external
    /// call is made (unlike GapMarket's ETH transfer), so there's no
    /// reentrancy surface to guard against here.
    function claim(uint256 id) external {
        require(markets[id].state == State.Resolved, "not resolved");
        require(!claimed[id][msg.sender], "already claimed");

        uint256 payout = claimableOf(id, msg.sender);
        require(payout > 0, "nothing to claim");

        claimed[id][msg.sender] = true;
        chipBalance[msg.sender] += payout;

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

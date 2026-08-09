// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal AggregatorV3Interface-compatible mock. Robinhood Chain
/// testnet has no real Chainlink stock feeds, so `scripts/push-mock-price.ts`
/// mirrors the real mainnet price into this contract on a schedule.
/// GapMarket reads it through the exact same interface it would use against
/// a real feed on mainnet — only the feed address changes later, not the code.
contract MockAggregator {
    address public owner;
    uint8 public constant decimals = 8;
    string public description;

    int256 private _answer;
    uint256 private _updatedAt;
    uint80 private _roundId;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(string memory description_, int256 initialAnswer) {
        require(initialAnswer > 0, "bad answer");
        owner = msg.sender;
        description = description_;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    /// @param answer Price with 8 decimals, matching real Chainlink stock feeds.
    function setAnswer(int256 answer) external onlyOwner {
        require(answer > 0, "bad answer");
        _answer = answer;
        _updatedAt = block.timestamp;
        _roundId += 1;
        emit AnswerUpdated(answer, _roundId, _updatedAt);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }
}

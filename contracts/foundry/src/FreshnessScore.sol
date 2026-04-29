// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// NOTE: Scaffold only. ZK proof validation and spoilage model integration are TODO.
contract FreshnessScore {
    event FreshnessUpdated(bytes32 indexed shipmentId, uint256 previousScore, uint256 newScore);

    mapping(bytes32 => uint256) public score;

    function initialize(bytes32 shipmentId, uint256 initialScore) external {
        require(score[shipmentId] == 0, "already initialized");
        require(initialScore <= 100, "score too high");
        score[shipmentId] = initialScore;
        emit FreshnessUpdated(shipmentId, 0, initialScore);
    }

    function updateScore(bytes32 shipmentId, uint256 newScore) external {
        require(newScore <= 100, "score too high");
        uint256 previous = score[shipmentId];
        score[shipmentId] = newScore;
        emit FreshnessUpdated(shipmentId, previous, newScore);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// NOTE: Scaffold only. Add verification of external proofs (LayerZero/CCIP).
contract InteroperabilityAnchor {
    event AnchorRecorded(bytes32 indexed anchorId, bytes32 merkleRoot, address recorder);

    mapping(bytes32 => bytes32) public anchorRoot;

    function recordAnchor(bytes32 anchorId, bytes32 merkleRoot) external {
        anchorRoot[anchorId] = merkleRoot;
        emit AnchorRecorded(anchorId, merkleRoot, msg.sender);
    }
}

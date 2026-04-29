// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// NOTE: Scaffold only. Multi-sig enforcement and access policies are TODO.
contract RegulatorVaultAccess {
    event AccessRequested(
        bytes32 indexed requestId,
        bytes32 indexed shipmentId,
        bytes32 documentHash,
        address requester
    );
    event AccessApproved(bytes32 indexed requestId, address approver);

    mapping(bytes32 => bool) public approved;

    function requestAccess(bytes32 shipmentId, bytes32 documentHash) external returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(shipmentId, documentHash, msg.sender, block.timestamp));
        emit AccessRequested(requestId, shipmentId, documentHash, msg.sender);
    }

    function approveAccess(bytes32 requestId) external {
        // TODO: Restrict to regulator multi-sig or threshold approvals.
        approved[requestId] = true;
        emit AccessApproved(requestId, msg.sender);
    }
}

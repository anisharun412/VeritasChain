// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// DWH protocol reference: docs/protocols/dwh.md
// NOTE: Scaffold only. Signature verification and Merkle proof checks are TODO.
contract DWHVerifier {
    event HandoffComplete(
        bytes32 indexed shipmentId,
        bytes32 indexed handoffHash,
        address sender,
        address receiver
    );
    event HandoffContested(
        bytes32 indexed shipmentId,
        bytes32 indexed handoffHash,
        address receiver,
        string reason
    );

    mapping(bytes32 => bytes32) public latestHandoff;

    function recordHandoff(
        bytes32 shipmentId,
        bytes32 handoffHash,
        address sender,
        address receiver
    ) external {
        // TODO: Verify sender and receiver signatures and Merkle root authenticity.
        latestHandoff[shipmentId] = handoffHash;
        emit HandoffComplete(shipmentId, handoffHash, sender, receiver);
    }

    function contestHandoff(
        bytes32 shipmentId,
        bytes32 handoffHash,
        string calldata reason
    ) external {
        // TODO: Enforce authorization and signature checks for contested handoffs.
        emit HandoffContested(shipmentId, handoffHash, msg.sender, reason);
    }
}

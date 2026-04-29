// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title DWHVerifier — Dual-Witness Handoff Verifier
/// @notice On-chain layer for the VeritasChain DWH protocol.
///
///         Each physical custody transfer produces a dual-signed handoff bundle.
///         This contract:
///           1. Accepts the Merkle root of the bundle.
///           2. Verifies ECDSA signatures from BOTH sender and receiver against
///              that root (EIP-191 personal_sign).
///           3. Emits HandoffComplete on success.
///           4. Emits HandoffContested with the rejection reason when signatures
///              mismatch, a party contests, or proof verification fails.
///           5. Updates the latest handoff hash for each shipment, making the
///              root available for cross-chain anchoring via InteroperabilityAnchor.
///
/// @dev    After a successful `recordHandoff`, callers should invoke
///         InteroperabilityAnchor.recordAnchor with the same Merkle root so
///         that LayerZero / CCIP adapters can broadcast it cross-chain.
contract DWHVerifier is AccessControl, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ─────────────────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 public constant SUBMITTER_ROLE = keccak256("SUBMITTER_ROLE");
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    struct HandoffRecord {
        bytes32 shipmentId;
        bytes32 merkleRoot;
        address sender;
        address receiver;
        uint64  recordedAt;
        bool    contested;
    }

    /// @notice shipmentId → latest accepted (non-contested) handoff hash.
    ///         Only updated when both dual-signatures are valid.
    mapping(bytes32 => bytes32) public latestHandoff;

    /// @notice handoffHash → HandoffRecord
    mapping(bytes32 => HandoffRecord) public handoffRecords;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────
    event HandoffComplete(
        bytes32 indexed shipmentId,
        bytes32 indexed handoffHash,
        bytes32         merkleRoot,
        address indexed sender,
        address         receiver,
        uint64          timestamp
    );

    event HandoffContested(
        bytes32 indexed shipmentId,
        bytes32 indexed handoffHash,
        address indexed contestedBy,
        string          reason,
        uint64          timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(SUBMITTER_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core — dual-signature handoff submission
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Record a completed Dual-Witness Handoff.
    ///
    ///         The submitted Merkle root covers:
    ///           - shipmentId + previous handoff hash
    ///           - NFC seal attestation hash
    ///           - ZK temperature-compliance proof hash
    ///           - Document hashes for the current leg
    ///           - GPS, timestamp, and field notes hash
    ///
    ///         Both `senderSig` and `receiverSig` must be EIP-191 personal_sign
    ///         signatures over the Merkle root.
    ///
    /// @param  shipmentId   Unique shipment identifier.
    /// @param  merkleRoot   Merkle root of the full handoff bundle.
    /// @param  sender       Expected sender address (custody giver).
    /// @param  receiver     Expected receiver address (custody taker).
    /// @param  senderSig    EIP-191 signature from sender over merkleRoot.
    /// @param  receiverSig  EIP-191 signature from receiver over merkleRoot.
    /// @return handoffHash  Deterministic identifier for this handoff record.
    function recordHandoff(
        bytes32 shipmentId,
        bytes32 merkleRoot,
        address sender,
        address receiver,
        bytes calldata senderSig,
        bytes calldata receiverSig
    )
        external
        nonReentrant
        onlyRole(SUBMITTER_ROLE)
        returns (bytes32 handoffHash)
    {
        require(shipmentId  != bytes32(0), "empty shipment id");
        require(merkleRoot  != bytes32(0), "empty merkle root");
        require(sender      != address(0), "invalid sender");
        require(receiver    != address(0), "invalid receiver");
        require(sender      != receiver,   "sender == receiver");

        // ── Verify both sender and receiver ECDSA signatures ────────────────────
        bytes32 ethSignedRoot = merkleRoot.toEthSignedMessageHash();
        address recoveredSender   = ethSignedRoot.recover(senderSig);
        address recoveredReceiver = ethSignedRoot.recover(receiverSig);

        if (recoveredSender != sender || recoveredReceiver != receiver) {
            // Use `true` salt so contested hash never collides with a valid hash
            // for the same shipment+root in the same block.
            handoffHash = _buildHandoffHash(shipmentId, merkleRoot, true);
            handoffRecords[handoffHash] = HandoffRecord({
                shipmentId:  shipmentId,
                merkleRoot:  merkleRoot,
                sender:      sender,
                receiver:    receiver,
                recordedAt:  uint64(block.timestamp),
                contested:   true
            });
            emit HandoffContested(
                shipmentId,
                handoffHash,
                msg.sender,
                "ECDSA signature mismatch",
                uint64(block.timestamp)
            );
            return handoffHash;
        }

        // ── Both signatures valid — commit record ────────────────────────────
        handoffHash = _buildHandoffHash(shipmentId, merkleRoot, false);

        handoffRecords[handoffHash] = HandoffRecord({
            shipmentId:  shipmentId,
            merkleRoot:  merkleRoot,
            sender:      sender,
            receiver:    receiver,
            recordedAt:  uint64(block.timestamp),
            contested:   false
        });

        latestHandoff[shipmentId] = handoffHash;

        emit HandoffComplete(
            shipmentId,
            handoffHash,
            merkleRoot,
            sender,
            receiver,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Contested handoff — voluntary or authority-triggered
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Contest an existing handoff record (e.g. receiver rejects after
    ///         discovering a seal breach or temperature excursion).
    ///         Emits HandoffContested for immediate liability attribution.
    ///         The caller must be sender, receiver, or an ADMIN.
    /// @param  shipmentId   Shipment identifier.
    /// @param  handoffHash  The specific handoff being contested.
    /// @param  reason       Human-readable or structured reason string.
    function contestHandoff(
        bytes32 shipmentId,
        bytes32 handoffHash,
        string  calldata reason
    )
        external
        nonReentrant
    {
        HandoffRecord storage rec = handoffRecords[handoffHash];
        require(rec.recordedAt != 0, "handoff not found");
        require(!rec.contested,      "already contested");
        require(rec.shipmentId == shipmentId, "shipmentId mismatch");

        bool authorized = (
            msg.sender == rec.sender   ||
            msg.sender == rec.receiver ||
            hasRole(ADMIN_ROLE, msg.sender)
        );
        require(authorized, "not authorized to contest");

        rec.contested = true;

        emit HandoffContested(
            shipmentId,
            handoffHash,
            msg.sender,
            reason,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev `isContest` salt ensures a contested-handoff hash never equals
    ///      a valid-handoff hash for the same inputs in the same block.
    function _buildHandoffHash(
        bytes32 shipmentId,
        bytes32 merkleRoot,
        bool    isContest
    )
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(shipmentId, merkleRoot, block.timestamp, block.number, msg.sender, isContest)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns the Merkle root from the latest accepted handoff.
    function latestMerkleRoot(bytes32 shipmentId)
        external
        view
        returns (bytes32)
    {
        return handoffRecords[latestHandoff[shipmentId]].merkleRoot;
    }

    /// @notice Returns true if a handoff is in the contested state.
    function isContested(bytes32 handoffHash) external view returns (bool) {
        return handoffRecords[handoffHash].contested;
    }
}

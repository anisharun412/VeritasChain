// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./IShipmentRegistry.sol";

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
contract DWHVerifier is AccessControl, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;
    bytes32 public constant HANDOFF_TYPEHASH = keccak256(
        "Handoff(bytes32 shipmentId,bytes32 merkleRoot,bytes32 prevHandoffHash,address sender,address receiver,uint8 contested,bytes32 reasonHash)"
    );

    IShipmentRegistry public immutable shipmentRegistry;


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
        bytes32 prevHandoffHash;
        address sender;
        address receiver;
        uint64  recordedAt;
        bool    contested;
        bytes32 reasonHash;
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
    constructor(address registryAddress) EIP712("VeritasChainDWH", "1") {
        require(registryAddress != address(0), "invalid registry");
        shipmentRegistry = IShipmentRegistry(registryAddress);
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
    ///         Both `senderSig` and `receiverSig` must be EIP-712 typed data
    ///         signatures over the Handoff payload.
    ///
    /// @param  shipmentId       Unique shipment identifier.
    /// @param  merkleRoot       Merkle root of the full handoff bundle.
    /// @param  prevHandoffHash  Previous handoff hash in the chain.
    /// @param  sender           Expected sender address (custody giver).
    /// @param  receiver         Expected receiver address (custody taker).
    /// @param  senderSig        EIP-712 signature from sender.
    /// @param  receiverSig      EIP-712 signature from receiver.
    /// @return handoffHash      Deterministic identifier for this handoff record.
    function recordHandoff(
        bytes32 shipmentId,
        bytes32 merkleRoot,
        bytes32 prevHandoffHash,
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
        require(shipmentRegistry.exists(shipmentId), "shipment not found");
        _requirePrevHandoff(shipmentId, prevHandoffHash);

        // ── Verify both sender and receiver ECDSA signatures ────────────────────
        bytes32 digest = _hashHandoff(
            shipmentId,
            merkleRoot,
            prevHandoffHash,
            sender,
            receiver,
            0,
            bytes32(0)
        );
        address recoveredSender   = digest.recover(senderSig);
        address recoveredReceiver = digest.recover(receiverSig);
        require(recoveredSender == sender && recoveredReceiver == receiver, "signature mismatch");

        // ── Both signatures valid — commit record ────────────────────────────
        handoffHash = _buildHandoffHash(
            shipmentId,
            merkleRoot,
            prevHandoffHash,
            sender,
            receiver,
            false,
            bytes32(0)
        );
        require(handoffRecords[handoffHash].recordedAt == 0, "handoff already recorded");

        handoffRecords[handoffHash] = HandoffRecord({
            shipmentId:  shipmentId,
            merkleRoot:  merkleRoot,
            prevHandoffHash: prevHandoffHash,
            sender:      sender,
            receiver:    receiver,
            recordedAt:  uint64(block.timestamp),
            contested:   false,
            reasonHash:  bytes32(0)
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
    // Contested handoff submission (single-party signed)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Record a contested handoff when one party refuses to co-sign.
    ///         The contested party must sign the same handoff payload with
    ///         `contested = 1` and a `reasonHash` derived from the reason string.
    function recordContestedHandoff(
        bytes32 shipmentId,
        bytes32 merkleRoot,
        bytes32 prevHandoffHash,
        address sender,
        address receiver,
        address contestedBy,
        string  calldata reason,
        bytes   calldata contestedSig
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
        require(contestedBy == sender || contestedBy == receiver, "invalid contestedBy");
        require(shipmentRegistry.exists(shipmentId), "shipment not found");
        _requirePrevHandoff(shipmentId, prevHandoffHash);

        bytes32 reasonHash = keccak256(bytes(reason));
        bytes32 digest = _hashHandoff(
            shipmentId,
            merkleRoot,
            prevHandoffHash,
            sender,
            receiver,
            1,
            reasonHash
        );
        address recovered = digest.recover(contestedSig);
        require(recovered == contestedBy, "signature mismatch");

        handoffHash = _buildHandoffHash(
            shipmentId,
            merkleRoot,
            prevHandoffHash,
            sender,
            receiver,
            true,
            reasonHash
        );
        require(handoffRecords[handoffHash].recordedAt == 0, "handoff already recorded");

        handoffRecords[handoffHash] = HandoffRecord({
            shipmentId:  shipmentId,
            merkleRoot:  merkleRoot,
            prevHandoffHash: prevHandoffHash,
            sender:      sender,
            receiver:    receiver,
            recordedAt:  uint64(block.timestamp),
            contested:   true,
            reasonHash:  reasonHash
        });

        emit HandoffContested(
            shipmentId,
            handoffHash,
            contestedBy,
            reason,
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
        rec.reasonHash = keccak256(bytes(reason));

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
        bytes32 prevHandoffHash,
        address sender,
        address receiver,
        bool    isContest,
        bytes32 reasonHash
    )
        internal
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                shipmentId,
                merkleRoot,
                prevHandoffHash,
                sender,
                receiver,
                isContest,
                reasonHash
            )
        );
    }

    function _requirePrevHandoff(bytes32 shipmentId, bytes32 prevHandoffHash)
        internal
        view
    {
        bytes32 latest = latestHandoff[shipmentId];
        if (latest == bytes32(0)) {
            require(prevHandoffHash == bytes32(0), "prev handoff required");
        } else {
            require(!handoffRecords[latest].contested, "prev handoff contested");
            require(prevHandoffHash == latest, "prev handoff mismatch");
        }
    }

    function _hashHandoff(
        bytes32 shipmentId,
        bytes32 merkleRoot,
        bytes32 prevHandoffHash,
        address sender,
        address receiver,
        uint8   contested,
        bytes32 reasonHash
    )
        internal
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    HANDOFF_TYPEHASH,
                    shipmentId,
                    merkleRoot,
                    prevHandoffHash,
                    sender,
                    receiver,
                    contested,
                    reasonHash
                )
            )
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
        bytes32 latest = latestHandoff[shipmentId];
        require(latest != bytes32(0), "no handoff for shipment");
        require(!handoffRecords[latest].contested, "handoff contested");
        return handoffRecords[latest].merkleRoot;
    }

    /// @notice Returns the EIP-712 digest to sign for a handoff.
    function handoffDigest(
        bytes32 shipmentId,
        bytes32 merkleRoot,
        bytes32 prevHandoffHash,
        address sender,
        address receiver,
        uint8   contested,
        bytes32 reasonHash
    )
        external
        view
        returns (bytes32)
    {
        return _hashHandoff(
            shipmentId,
            merkleRoot,
            prevHandoffHash,
            sender,
            receiver,
            contested,
            reasonHash
        );
    }

    /// @notice Returns true if a handoff is in the contested state.
    function isContested(bytes32 handoffHash) external view returns (bool) {
        return handoffRecords[handoffHash].contested;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./IShipmentRegistry.sol";

interface IDWHVerifier {
    function shipmentRegistry() external view returns (IShipmentRegistry);
    function latestHandoff(bytes32 shipmentId) external view returns (bytes32);
    function handoffRecords(bytes32 handoffHash)
        external
        view
        returns (
            bytes32 shipmentId,
            bytes32 merkleRoot,
            bytes32 prevHandoffHash,
            address sender,
            address receiver,
            uint64 recordedAt,
            bool contested,
            bytes32 reasonHash
        );
}

/// @title InteroperabilityAnchor
/// @notice Publishes canonical Merkle roots that cross-chain relayers
///         (LayerZero V2 and Chainlink CCIP) can read and attest.
///         Any chain that receives a relayed root can call
///         `verifyExternalAnchor` to check it against the stored value.
///
/// @dev    LayerZero and CCIP message delivery is handled off-chain
///         (by the respective gateway contracts). This contract stores
///         the authoritative roots and exposes a standard verification
///         interface so that destination-chain contracts can trustlessly
///         confirm that an anchor originated here.
contract InteroperabilityAnchor is AccessControl, ReentrancyGuard {
        IDWHVerifier public immutable dwhVerifier;
    // ─────────────────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 public constant ANCHOR_WRITER_ROLE = keccak256("ANCHOR_WRITER_ROLE");
    bytes32 public constant BRIDGE_RELAYER_ROLE = keccak256("BRIDGE_RELAYER_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────
    enum BridgeProtocol { LAYERZERO, CCIP, INTERNAL }

    struct AnchorRecord {
        bytes32        merkleRoot;
        address        recorder;
        uint64         anchoredAt;
        BridgeProtocol protocol;
        /// @dev layerZero chain-id or CCIP chain-selector (0 = source chain)
        uint64         sourceChainRef;
        bool           verified;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────
    /// @notice anchorId → AnchorRecord
    mapping(bytes32 => AnchorRecord) public anchors;

    /// @notice shipmentId → latest anchorId (convenience index)
    mapping(bytes32 => bytes32) public latestAnchorOf;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────
    event AnchorRecorded(
        bytes32 indexed anchorId,
        bytes32 indexed shipmentId,
        bytes32         merkleRoot,
        BridgeProtocol  protocol,
        uint64          sourceChainRef,
        address         recorder,
        uint64          timestamp
    );

    event AnchorVerified(
        bytes32 indexed anchorId,
        bytes32         merkleRoot,
        BridgeProtocol  protocol,
        address         verifiedBy,
        uint64          timestamp
    );

    event MerkleRootExported(
        bytes32 indexed anchorId,
        bytes32         merkleRoot,
        BridgeProtocol  targetProtocol,
        uint64          destinationChainRef,
        uint64          timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────
    constructor(address dwhVerifierAddress) {
        require(dwhVerifierAddress != address(0), "invalid DWH verifier");
        dwhVerifier = IDWHVerifier(dwhVerifierAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ANCHOR_WRITER_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core — anchor recording
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Record a new Merkle root anchor for a shipment.
    ///         Called by the DWH verifier or the off-chain sync service once
    ///         a handoff bundle is ready to be cross-chain broadcast.
    /// @param  shipmentId       Shipment this anchor belongs to.
    /// @param  merkleRoot       Merkle root of the handoff bundle.
    /// @param  protocol         Which bridge will relay it.
    /// @param  sourceChainRef   LayerZero EID or CCIP selector (0 = local).
    /// @return anchorId         Deterministic anchor identifier.
    function recordAnchor(
        bytes32        shipmentId,
        bytes32        merkleRoot,
        BridgeProtocol protocol,
        uint64         sourceChainRef
    )
        external
        nonReentrant
        onlyRole(ANCHOR_WRITER_ROLE)
        returns (bytes32 anchorId)
    {
        require(shipmentId != bytes32(0), "empty shipment id");
        require(merkleRoot != bytes32(0), "empty root");

        bytes32 latestHandoff = dwhVerifier.latestHandoff(shipmentId);
        if (latestHandoff != bytes32(0)) {
            (
                bytes32 recShipmentId,
                bytes32 recRoot,
                bytes32 _prevHandoff,
                address _sender,
                address _receiver,
                uint64  _recordedAt,
                bool    contested,
                bytes32 _reasonHash
            ) = dwhVerifier.handoffRecords(latestHandoff);
            require(recShipmentId == shipmentId, "handoff shipment mismatch");
            require(!contested, "latest handoff contested");
            require(recRoot == merkleRoot, "root not latest handoff");
        } else {
            // Fallback: Anchor the origin metaHash if no handoff exists
            bytes32 metaHash = dwhVerifier.shipmentRegistry().metaHash(shipmentId);
            require(metaHash == merkleRoot, "root not meta hash");
        }

        anchorId = keccak256(
            abi.encodePacked(shipmentId, merkleRoot, block.timestamp, block.number, msg.sender)
        );
        require(anchors[anchorId].anchoredAt == 0, "anchor already exists");

        anchors[anchorId] = AnchorRecord({
            merkleRoot:      merkleRoot,
            recorder:        msg.sender,
            anchoredAt:      uint64(block.timestamp),
            protocol:        protocol,
            sourceChainRef:  sourceChainRef,
            verified:        false
        });

        latestAnchorOf[shipmentId] = anchorId;

        emit AnchorRecorded(
            anchorId,
            shipmentId,
            merkleRoot,
            protocol,
            sourceChainRef,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cross-chain verification
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Called by a trusted bridge relayer to confirm that the Merkle
    ///         root delivered to a destination chain matches the recorded root.
    ///         LayerZero: called inside `lzReceive` on the remote OApp.
    ///         CCIP:      called inside the `ccipReceive` handler.
    /// @param  anchorId    The anchor whose root is being attested.
    /// @param  claimedRoot The root the relayer says it delivered.
    /// @return ok          True when the claimed root matches the recorded root.
    ///                     The anchor's `verified` flag is set to true on the
    ///                     first successful match; subsequent calls return true
    ///                     but do not alter state (idempotent after first match).
    function verifyExternalAnchor(bytes32 anchorId, bytes32 claimedRoot)
        external
        onlyRole(BRIDGE_RELAYER_ROLE)
        returns (bool ok)
    {
        require(claimedRoot != bytes32(0), "empty claimed root");
        AnchorRecord storage rec = anchors[anchorId];
        require(rec.anchoredAt != 0, "anchor not found");

        ok = (rec.merkleRoot == claimedRoot);
        if (ok && !rec.verified) {
            rec.verified = true;
            emit AnchorVerified(
                anchorId,
                rec.merkleRoot,
                rec.protocol,
                msg.sender,
                uint64(block.timestamp)
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Standard Merkle root export (read by bridge adapters)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns the latest Merkle root for a shipment — standard entry
    ///         point for LayerZero OApp adapters and CCIP sender contracts.
    /// @param  shipmentId  Shipment to query.
    /// @return merkleRoot  Most recently anchored Merkle root.
    /// @return anchoredAt  Block timestamp of that anchor.
    function exportMerkleRoot(bytes32 shipmentId)
        external
        view
        returns (bytes32 merkleRoot, uint64 anchoredAt)
    {
        bytes32 aid = latestAnchorOf[shipmentId];
        require(aid != bytes32(0), "no anchor for shipment");
        AnchorRecord storage rec = anchors[aid];
        return (rec.merkleRoot, rec.anchoredAt);
    }

    /// @notice Emits `MerkleRootExported` so off-chain bridge adapters can
    ///         trigger a cross-chain message via LayerZero or CCIP.
    ///         The actual message-passing is done by the adapter; this
    ///         function provides the signed trail on-chain.
    /// @param  anchorId           Anchor to export.
    /// @param  targetProtocol     Bridge that will carry the message.
    /// @param  destinationChainRef  LayerZero EID or CCIP chain selector.
    function signalExport(
        bytes32        anchorId,
        BridgeProtocol targetProtocol,
        uint64         destinationChainRef
    )
        external
        nonReentrant
        onlyRole(ANCHOR_WRITER_ROLE)
    {
        AnchorRecord storage rec = anchors[anchorId];
        require(rec.anchoredAt != 0, "anchor not found");

        emit MerkleRootExported(
            anchorId,
            rec.merkleRoot,
            targetProtocol,
            destinationChainRef,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Convenience view
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns true if the given anchor root has been verified by a
    ///         bridge relayer.
    function isAnchorVerified(bytes32 anchorId) external view returns (bool) {
        return anchors[anchorId].verified;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PostHashAnchors
/// @notice Anchors post-quantum SPHINCS+ document hashes on-chain so that
///         every document in the VeritasChain custody trail has an immutable,
///         independently verifiable on-chain fingerprint.
///
///         Use-cases:
///           • Anchoring the birth-certificate document bundle at origin.
///           • Anchoring each leg's document set at handoff time.
///           • Anchoring regulatory inspection reports.
///
///         Hash format convention:
///           `sphincsPqHash` = SPHINCS+-SHA2-128s hash of the raw document
///           bytes, computed off-chain and stored on IPFS/Filecoin.
///           The IPFS CIDv1 is provided as `ipfsCid` for human lookup but is NOT
///           used in any on-chain logic (stored as a bytes field for gas
///           efficiency and forward-compatibility with IPFS multihash formats).
///
/// @dev    This contract purposely separates document anchoring from the
///         DWH handoff flow so that documents can be anchored independently
///         (e.g. between handoffs) and queried by the Inspect app without
///         needing a full handoff record.
contract PostHashAnchors is AccessControl, ReentrancyGuard {
    // ─────────────────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────
    enum DocumentType {
        BIRTH_CERTIFICATE,
        HANDOFF_BUNDLE,
        TEMPERATURE_REPORT,
        REGULATORY_INSPECTION,
        CUSTOMS_DECLARATION,
        OTHER
    }

    struct HashAnchor {
        bytes32      sphincsPqHash;   // SPHINCS+ PQ hash of the document
        bytes        ipfsCid;         // IPFS CIDv1 multihash bytes
        DocumentType docType;
        address      anchoredBy;
        uint64       anchoredAt;
        bytes32      shipmentId;
        uint32       legIndex;        // 0 = origin, 1 = first leg, etc.
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice anchorId → HashAnchor
    mapping(bytes32 => HashAnchor) public anchors;

    /// @notice shipmentId → list of anchorIds (ordered by insertion)
    mapping(bytes32 => bytes32[]) private _shipmentAnchors;

    /// @notice Global counter for unique anchor ordering
    uint64 public anchorCount;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────
    event HashAnchored(
        bytes32 indexed anchorId,
        bytes32 indexed shipmentId,
        bytes32         sphincsPqHash,
        DocumentType    docType,
        uint32          legIndex,
        address         anchoredBy,
        uint64          timestamp
    );

    event AnchorRevoked(
        bytes32 indexed anchorId,
        address         revokedBy,
        string          reason,
        uint64          timestamp
    );

    // Track revoked anchors separately (we don't delete to preserve history)
    mapping(bytes32 => bool)   public isRevoked;
    mapping(bytes32 => string) public revokeReason;

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ANCHOR_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core — anchor a document hash
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Anchor a SPHINCS+ post-quantum hash for a document bundle.
    /// @param  shipmentId    Shipment this document belongs to.
    /// @param  sphincsPqHash SPHINCS+-SHA2-128s hash of the document bytes.
    /// @param  ipfsCid       IPFS CIDv1 multihash bytes for human retrieval.
    /// @param  docType       Category of document being anchored.
    /// @param  legIndex      Leg number (0 = birth certificate at origin).
    /// @return anchorId      Deterministic anchor identifier.
    function anchorHash(
        bytes32      shipmentId,
        bytes32      sphincsPqHash,
        bytes  calldata ipfsCid,
        DocumentType docType,
        uint32       legIndex
    )
        external
        nonReentrant
        onlyRole(ANCHOR_ROLE)
        returns (bytes32 anchorId)
    {
        require(sphincsPqHash != bytes32(0), "empty hash");
        require(ipfsCid.length > 0,          "empty CID");
        require(ipfsCid.length <= 128,        "CID too long");  // CIDv1 multihash <= 128 bytes
        require(shipmentId != bytes32(0),    "empty shipment id");

        anchorCount += 1;
        anchorId = keccak256(
            abi.encodePacked(
                shipmentId,
                sphincsPqHash,
                msg.sender,
                block.timestamp,
                anchorCount
            )
        );

        anchors[anchorId] = HashAnchor({
            sphincsPqHash: sphincsPqHash,
            ipfsCid:       ipfsCid,
            docType:       docType,
            anchoredBy:    msg.sender,
            anchoredAt:    uint64(block.timestamp),
            shipmentId:    shipmentId,
            legIndex:      legIndex
        });

        _shipmentAnchors[shipmentId].push(anchorId);

        emit HashAnchored(
            anchorId,
            shipmentId,
            sphincsPqHash,
            docType,
            legIndex,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Verification helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Verify whether a SPHINCS+ hash has been anchored for a shipment.
    ///         Used by the Inspect app and regulatory tools.
    /// @dev    Iterates the shipment's anchor list. This is safe for typical
    ///         usage (< 200 legs per shipment) but callers should prefer
    ///         `getAnchorsForShipment` + off-chain lookup for very large sets.
    /// @param  maxIterations  Safety cap on loop iterations (0 = use default 256).
    /// @return verified   True when found and not revoked.
    /// @return anchorId   The matching anchor id (bytes32(0) if not found).
    function verifyHash(
        bytes32 shipmentId,
        bytes32 sphincsPqHash,
        uint256 maxIterations
    )
        external
        view
        returns (bool verified, bytes32 anchorId)
    {
        bytes32[] storage ids = _shipmentAnchors[shipmentId];
        uint256 limit = maxIterations == 0 ? 256 : maxIterations;
        uint256 end   = ids.length < limit ? ids.length : limit;
        for (uint256 i = 0; i < end; i++) {
            if (
                anchors[ids[i]].sphincsPqHash == sphincsPqHash &&
                !isRevoked[ids[i]]
            ) {
                return (true, ids[i]);
            }
        }
        return (false, bytes32(0));
    }

    /// @notice Returns all anchor IDs for a shipment (in insertion order).
    function getAnchorsForShipment(bytes32 shipmentId)
        external
        view
        returns (bytes32[] memory)
    {
        return _shipmentAnchors[shipmentId];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin — revoke a fraudulent anchor
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Mark an anchor as revoked (e.g. document was falsified).
    ///         The anchor record is preserved for forensic audit.
    function revokeAnchor(bytes32 anchorId, string calldata reason)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(anchors[anchorId].anchoredAt != 0, "anchor not found");
        require(!isRevoked[anchorId], "already revoked");

        isRevoked[anchorId]  = true;
        revokeReason[anchorId] = reason;

        emit AnchorRevoked(anchorId, msg.sender, reason, uint64(block.timestamp));
    }
}

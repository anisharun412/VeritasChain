// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ShipmentRegistry
/// @notice Birth-certificate registry for every VeritasChain shipment.
///
///         On registration the origin operator anchors:
///           - A SPHINCS+ post-quantum metadata hash (covers product info,
///             DID of the registrar, NFC seal ID, and cold-chain spec).
///           - The DID URI of the originating organisation.
///           - The NFC seal public-key fingerprint.
///
///         Subsequent components (DWHVerifier, FreshnessScore, PostHashAnchors,
///         InteroperabilityAnchor) reference shipmentIds issued here.
///
/// @dev    Access control uses OpenZeppelin AccessControl.
///         REGISTRAR_ROLE is granted to DID-verified entities by the admin.
contract ShipmentRegistry is AccessControl, ReentrancyGuard {
    // ─────────────────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────
    enum ShipmentStatus { REGISTERED, IN_TRANSIT, DELIVERED, CONTESTED, RECALLED }

    struct Shipment {
        /// @dev SPHINCS+ hash of the birth-certificate metadata bundle.
        bytes32        sphincsPqMetaHash;
        /// @dev W3C DID URI of the registrar (max 256 bytes, stored as bytes).
        bytes          registrarDid;
        /// @dev NFC seal public-key fingerprint (SHA-256 of the seal's pubkey).
        bytes32        nfcSealFingerprint;
        address        registrar;
        uint64         registeredAt;
        ShipmentStatus status;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────
    mapping(bytes32 => Shipment) public shipments;
    uint64 public shipmentCount;
    mapping(bytes32 => bool) public usedSealFingerprints;
    mapping(bytes32 => bool) public usedMetaHashes;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────
    event ShipmentRegistered(
        bytes32 indexed shipmentId,
        bytes32         sphincsPqMetaHash,
        bytes           registrarDid,
        bytes32         nfcSealFingerprint,
        address         registrar,
        uint64          timestamp
    );

    event ShipmentStatusUpdated(
        bytes32 indexed shipmentId,
        ShipmentStatus  previousStatus,
        ShipmentStatus  newStatus,
        address         updatedBy,
        uint64          timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core — registration
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Register a new shipment and anchor its birth-certificate hash.
    /// @param  sphincsPqMetaHash  SPHINCS+ hash of the metadata bundle.
    /// @param  registrarDid       W3C DID URI of the registrar.
    /// @param  nfcSealFingerprint SHA-256 of the NFC seal's public key.
    /// @return shipmentId         Deterministic shipment identifier.
    function registerShipment(
        bytes32 sphincsPqMetaHash,
        bytes   calldata registrarDid,
        bytes32 nfcSealFingerprint
    )
        external
        nonReentrant
        onlyRole(REGISTRAR_ROLE)
        returns (bytes32 shipmentId)
    {
        require(sphincsPqMetaHash  != bytes32(0), "empty meta hash");
        require(registrarDid.length > 0,           "empty DID");
        require(registrarDid.length <= 256,        "DID too long");  // W3C DID max practical length
        require(nfcSealFingerprint != bytes32(0),  "empty seal fingerprint");
        require(!usedMetaHashes[sphincsPqMetaHash], "meta hash already used");
        require(!usedSealFingerprints[nfcSealFingerprint], "seal already used");

        shipmentCount += 1;
        shipmentId = keccak256(
            abi.encodePacked(
                sphincsPqMetaHash,
                msg.sender,
                block.timestamp,
                shipmentCount
            )
        );
        require(shipments[shipmentId].registeredAt == 0, "collision: try again");

        shipments[shipmentId] = Shipment({
            sphincsPqMetaHash:  sphincsPqMetaHash,
            registrarDid:       registrarDid,
            nfcSealFingerprint: nfcSealFingerprint,
            registrar:          msg.sender,
            registeredAt:       uint64(block.timestamp),
            status:             ShipmentStatus.REGISTERED
        });

        usedMetaHashes[sphincsPqMetaHash] = true;
        usedSealFingerprints[nfcSealFingerprint] = true;

        emit ShipmentRegistered(
            shipmentId,
            sphincsPqMetaHash,
            registrarDid,
            nfcSealFingerprint,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Status management
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Update the status of a registered shipment.
    ///         Only callable by ADMIN_ROLE holders.
    /// @dev    Enforces a strict state machine:
    ///           REGISTERED → IN_TRANSIT
    ///           IN_TRANSIT  → DELIVERED
    ///           DELIVERED   → (no forward transition; terminal)
    ///           Any state   → CONTESTED  (exception/dispute override)
    ///           Any state   → RECALLED   (recall override)
    ///         Backward transitions and no-op same-state transitions revert.
    function updateStatus(bytes32 shipmentId, ShipmentStatus newStatus)
        external
        onlyRole(ADMIN_ROLE)
    {
        Shipment storage s = shipments[shipmentId];
        require(s.registeredAt != 0, "shipment not found");

        ShipmentStatus prev = s.status;
        require(prev != newStatus, "status unchanged");
        require(prev != ShipmentStatus.CONTESTED, "terminal state: contested");
        require(prev != ShipmentStatus.RECALLED, "terminal state: recalled");

        // CONTESTED and RECALLED are always reachable from any state.
        if (newStatus != ShipmentStatus.CONTESTED && newStatus != ShipmentStatus.RECALLED) {
            // Enforce strict one-step-forward transitions.
            if (prev == ShipmentStatus.REGISTERED) {
                require(newStatus == ShipmentStatus.IN_TRANSIT, "invalid status transition");
            } else if (prev == ShipmentStatus.IN_TRANSIT) {
                require(newStatus == ShipmentStatus.DELIVERED, "invalid status transition");
            } else {
                // DELIVERED, CONTESTED, RECALLED are terminal — no forward step.
                revert("invalid status transition");
            }
        }

        s.status = newStatus;

        emit ShipmentStatusUpdated(
            shipmentId,
            prev,
            newStatus,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns true when a shipmentId is registered.
    function exists(bytes32 shipmentId) external view returns (bool) {
        return shipments[shipmentId].registeredAt != 0;
    }

    /// @notice Quick accessor for the metadata hash (used by Inspect app).
    function metaHash(bytes32 shipmentId)
        external
        view
        returns (bytes32)
    {
        return shipments[shipmentId].sphincsPqMetaHash;
    }
}

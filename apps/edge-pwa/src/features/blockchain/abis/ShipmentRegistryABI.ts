/**
 * Human-readable ABI for ShipmentRegistry.sol (Foundry)
 * Compatible with ethers.js v6 Interface
 */
export const SHIPMENT_REGISTRY_ABI = [
  // ─── Write ───────────────────────────────────────────────────────
  "function registerShipment(bytes32 sphincsPqMetaHash, bytes registrarDid, bytes32 nfcSealFingerprint) external returns (bytes32 shipmentId)",
  "function updateStatus(bytes32 shipmentId, uint8 newStatus) external",

  // ─── Read ────────────────────────────────────────────────────────
  "function exists(bytes32 shipmentId) external view returns (bool)",
  "function metaHash(bytes32 shipmentId) external view returns (bytes32)",
  "function shipmentCount() external view returns (uint64)",
  "function shipments(bytes32 shipmentId) external view returns (bytes32 sphincsPqMetaHash, bytes registrarDid, bytes32 nfcSealFingerprint, address registrar, uint64 registeredAt, uint8 status)",

  // ─── Events ──────────────────────────────────────────────────────
  "event ShipmentRegistered(bytes32 indexed shipmentId, bytes32 sphincsPqMetaHash, bytes registrarDid, bytes32 nfcSealFingerprint, address registrar, uint64 timestamp)",
  "event ShipmentStatusUpdated(bytes32 indexed shipmentId, uint8 previousStatus, uint8 newStatus, address updatedBy, uint64 timestamp)",
] as const;

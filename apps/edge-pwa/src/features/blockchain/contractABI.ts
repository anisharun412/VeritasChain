/**
 * Human-readable ABI for HandoffRegistry.sol
 * Compatible with ethers.js v6 Interface
 */
export const HANDOFF_REGISTRY_ABI = [
  // ─── Write ───────────────────────────────────────────────────────
  "function recordHandoff(string shipmentId, address receiver, bytes32 merkleRoot, string zkProofHash) external",
  "function contestHandoff(string shipmentId, string reason) external",

  // ─── Read ────────────────────────────────────────────────────────
  "function getHandoffCount(string shipmentId) external view returns (uint256)",
  "function getHandoff(string shipmentId, uint256 index) external view returns (address sender, address receiver, bytes32 merkleRoot, string zkProofHash, uint256 timestamp, bool contested, string contestReason)",
  "function isContested(string shipmentId) external view returns (bool)",
  "function totalShipments() external view returns (uint256)",

  // ─── Events ──────────────────────────────────────────────────────
  "event HandoffRecorded(string indexed shipmentId, address indexed sender, address indexed receiver, bytes32 merkleRoot, string zkProofHash, uint256 timestamp)",
  "event HandoffContested(string indexed shipmentId, address indexed contester, string reason, uint256 timestamp)",
] as const;

/**
 * Contract address — set via VITE_CONTRACT_ADDRESS env variable after deploying.
 * Default is zero address (undeployed state).
 */
export const CONTRACT_ADDRESS: string =
  import.meta.env.VITE_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000";

/** Ganache local chain ID */
export const GANACHE_CHAIN_ID = 1337;

/** Ganache RPC URL (GUI: 7545, CLI: 8545) */
export const GANACHE_RPC = "http://127.0.0.1:7545";

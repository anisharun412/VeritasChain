/**
 * Human-readable ABI for FreshnessScore.sol (Foundry)
 * Compatible with ethers.js v6 Interface
 */
export const FRESHNESS_SCORE_ABI = [
  // ─── Write ───────────────────────────────────────────────────────
  "function initialize(bytes32 shipmentId) external",
  "function updateScoreWithProof(bytes32 shipmentId, uint8 newScore, bytes proof, uint256[] publicSignals) external",
  "function adminSetScore(bytes32 shipmentId, uint8 newScore) external",

  // ─── Read ────────────────────────────────────────────────────────
  "function getScore(bytes32 shipmentId) external view returns (uint8)",
  "function isCritical(bytes32 shipmentId) external view returns (bool)",
  "function records(bytes32 shipmentId) external view returns (uint8 score, uint64 lastUpdatedAt, bytes32 lastProofHash, uint32 updateCount, bool initialized)",
  "function CRITICAL_THRESHOLD() external view returns (uint8)",

  // ─── Events ──────────────────────────────────────────────────────
  "event FreshnessInitialized(bytes32 indexed shipmentId, uint8 initialScore, uint64 timestamp)",
  "event FreshnessUpdated(bytes32 indexed shipmentId, uint8 previousScore, uint8 newScore, uint8 penalty, bytes32 proofHash, uint64 timestamp)",
  "event FreshnessCritical(bytes32 indexed shipmentId, uint8 score, uint64 timestamp)",
] as const;

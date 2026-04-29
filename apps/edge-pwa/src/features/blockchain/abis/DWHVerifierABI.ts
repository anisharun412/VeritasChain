/**
 * Human-readable ABI for DWHVerifier.sol (Foundry)
 * Compatible with ethers.js v6 Interface
 */
export const DWH_VERIFIER_ABI = [
  // ─── Write ───────────────────────────────────────────────────────
  "function recordHandoff(bytes32 shipmentId, bytes32 merkleRoot, bytes32 prevHandoffHash, address sender, address receiver, bytes senderSig, bytes receiverSig) external returns (bytes32 handoffHash)",
  "function recordContestedHandoff(bytes32 shipmentId, bytes32 merkleRoot, bytes32 prevHandoffHash, address sender, address receiver, address contestedBy, string reason, bytes contestedSig) external returns (bytes32 handoffHash)",
  "function contestHandoff(bytes32 shipmentId, bytes32 handoffHash, string reason) external",

  // ─── Read ────────────────────────────────────────────────────────
  "function latestHandoff(bytes32 shipmentId) external view returns (bytes32)",
  "function handoffRecords(bytes32 handoffHash) external view returns (bytes32 shipmentId, bytes32 merkleRoot, bytes32 prevHandoffHash, address sender, address receiver, uint64 recordedAt, bool contested, bytes32 reasonHash)",
  "function latestMerkleRoot(bytes32 shipmentId) external view returns (bytes32)",
  "function handoffDigest(bytes32 shipmentId, bytes32 merkleRoot, bytes32 prevHandoffHash, address sender, address receiver, uint8 contested, bytes32 reasonHash) external view returns (bytes32)",
  "function isContested(bytes32 handoffHash) external view returns (bool)",

  // ─── Events ──────────────────────────────────────────────────────
  "event HandoffComplete(bytes32 indexed shipmentId, bytes32 indexed handoffHash, bytes32 merkleRoot, address indexed sender, address receiver, uint64 timestamp)",
  "event HandoffContested(bytes32 indexed shipmentId, bytes32 indexed handoffHash, address indexed contestedBy, string reason, uint64 timestamp)",
] as const;

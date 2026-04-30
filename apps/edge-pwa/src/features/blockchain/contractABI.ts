/**
 * Multi-contract configuration for the VeritasChain On-Chain Layer.
 *
 * After deploying contracts to Ganache, set the VITE_* env variables
 * in apps/edge-pwa/.env.local:
 *   VITE_REGISTRY_ADDRESS=0x...
 *   VITE_DWH_ADDRESS=0x...
 *   VITE_FRESHNESS_ADDRESS=0x...
 */

export { SHIPMENT_REGISTRY_ABI } from './abis/ShipmentRegistryABI';
export { DWH_VERIFIER_ABI }      from './abis/DWHVerifierABI';
export { FRESHNESS_SCORE_ABI }   from './abis/FreshnessScoreABI';

// ─── Contract Addresses ─────────────────────────────────────────────
const ZERO = '0x0000000000000000000000000000000000000000';

export const REGISTRY_ADDRESS: string =
  import.meta.env.VITE_REGISTRY_ADDRESS ?? ZERO;

export const DWH_ADDRESS: string =
  import.meta.env.VITE_DWH_ADDRESS ?? ZERO;

export const FRESHNESS_ADDRESS: string =
  import.meta.env.VITE_FRESHNESS_ADDRESS ?? ZERO;

/** Legacy single-address export (points to DWH for backward compat) */
export const CONTRACT_ADDRESS: string =
  import.meta.env.VITE_CONTRACT_ADDRESS ?? DWH_ADDRESS;

// ─── Network Config ─────────────────────────────────────────────────

/** Ganache local chain ID */
export const GANACHE_CHAIN_ID = 1337;

/** Ganache RPC URL (GUI: 7545, CLI: 8545) */
export const GANACHE_RPC = 'http://127.0.0.1:7545';

// ─── Deployment status helpers ──────────────────────────────────────

export function isContractDeployed(address: string): boolean {
  return address !== ZERO && address.length === 42;
}

export const contracts = {
  registry:  { name: 'ShipmentRegistry',  address: REGISTRY_ADDRESS,  deployed: isContractDeployed(REGISTRY_ADDRESS) },
  dwh:       { name: 'DWHVerifier',       address: DWH_ADDRESS,       deployed: isContractDeployed(DWH_ADDRESS) },
  freshness: { name: 'FreshnessScore',    address: FRESHNESS_ADDRESS, deployed: isContractDeployed(FRESHNESS_ADDRESS) },
} as const;

/** True when ALL three core contracts are deployed */
export const allDeployed = contracts.registry.deployed && contracts.dwh.deployed && contracts.freshness.deployed;

// ─── Old ABI kept for backward compat (will be removed) ────────────
export const HANDOFF_REGISTRY_ABI = [
  "function recordHandoff(string shipmentId, address receiver, bytes32 merkleRoot, string zkProofHash) external",
  "function contestHandoff(string shipmentId, string reason) external",
  "function getHandoffCount(string shipmentId) external view returns (uint256)",
  "function getHandoff(string shipmentId, uint256 index) external view returns (address sender, address receiver, bytes32 merkleRoot, string zkProofHash, uint256 timestamp, bool contested, string contestReason)",
  "function isContested(string shipmentId) external view returns (bool)",
  "function totalShipments() external view returns (uint256)",
  "event HandoffRecorded(string indexed shipmentId, address indexed sender, address indexed receiver, bytes32 merkleRoot, string zkProofHash, uint256 timestamp)",
  "event HandoffContested(string indexed shipmentId, address indexed contester, string reason, uint256 timestamp)",
] as const;

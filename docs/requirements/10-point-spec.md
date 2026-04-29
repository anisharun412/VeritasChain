# VeritasChain requirements (spec)

This document mirrors the 10-point product and system requirements used for the initial build.

## 1. The problem
Build a blockchain-based provenance system for perishable goods that:
- Creates immutable, timestamped records at every custody handoff.
- Anchors cold-chain documents to on-chain hashes.
- Allows any stakeholder to verify the full document trail in real time.
- Flags anomalies automatically (gaps, hash mismatches, inconsistencies).

Constraints:
- Works with intermittent connectivity.
- Operable by non-technical actors at handoff points.

## 2. Core innovation: Dual-Witness Handoff (DWH)
- Mandatory co-signing by sender and receiver at the physical handoff.
- Works offline using peer-to-peer connection.
- Closes the trust gap in traditional traceability systems.
- KPI: Time-to-Liability-Attribution (TTLA) = 0 seconds for attested handoffs.

## 3. System overview (four layers)
- Physical layer: Unclonable identity anchors for packages.
- Edge client layer: Offline DWH ceremony and signing.
- On-chain layer: Immutable notarization and freshness updates.
- Off-chain services and privacy layer: ZK proof generation and encrypted storage.

## 4. Physical layer
- NFC tamper-evident seal with a unique key; breaks on peel.
- ITEMprint PUF (future): physical fingerprint built into packaging.
- IoT temperature logger with secure element; generates ZK proofs on-device.

## 5. Edge client layer
- Two PWAs (sender and receiver) using Bluetooth and NFC with no internet.
- DWH ceremony: scan seal, verify ZK proof, review hashes, dual sign, queue bundle offline.
- Contested handoff: receiver signs a rejection, alerts stakeholders when online.
- Inspect app: QR scan for green/red status and freshness score without raw data.

## 6. Off-chain services and privacy layer
- ZK prover service for compliance, hash matching, and freshness calculations.
- Distributed vault (IPFS/Filecoin) with threshold encryption.
- Paymaster and identity registry for gas sponsorship and DID-based org identity.

## 7. On-chain layer (Arbitrum L2)
- DWH verifier contract for dual signatures and Merkle root anchoring.
- Dynamic freshness score contract for ZK-proven updates.
- Regulator vault access contract for threshold decryption approval.
- Interoperability anchor for cross-chain verification.
- Post-quantum safe SPHINCS+ hashes for long-term evidence integrity.

## 8. Complete shipment journey (golden path)
- Digital birth certificate at origin.
- First DWH handoff between manufacturer and forwarder.
- In-transit ZK monitoring updates freshness score.
- Border crossing verification with Inspect app.
- Final delivery with unbroken dual-signed chain and freshness score of 94.
- If falsification occurs, ZK proof fails or signature mismatch triggers a contested handoff.

## 9. Key technical specifications
- Blockchain: Arbitrum One, Solidity 0.8.26, OpenZeppelin 5.2, Foundry, Hardhat 3.
- Edge apps: React PWA, Web Bluetooth, Web NFC, IndexedDB queue, Viem/Wagmi.
- ZK stack: Circom 2.x, Groth16 via SnarkJS, SP1 or RISC Zero zkVM.
- Privacy: Threshold BLS encryption, W3C DIDs.
- Interoperability: Standard Merkle anchor, LayerZero V2, Chainlink CCIP.
- Post-quantum: SPHINCS+ for document hashes.
- Cost target: under $0.10 per shipment (L2 gas + proof).

## 10. Success scenario
A contaminated pharmaceutical shipment with a falsified temperature log cannot reach a hospital undetected. Any party can see exactly where the document trail breaks and who was responsible, with cryptographic proof.

## 11. Regulatory alignment and roadmap
- Align with EU GDP, FDA 21 CFR Part 11, and WHO cold-chain guidelines.
- Future phases: ITEMprint PUF, sensor health analytics, and federated anomaly detection.

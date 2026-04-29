# Architecture overview

VeritasChain uses a four-layer architecture that separates physical identity, offline handoff workflows, on-chain notarization, and privacy-preserving services.

## Diagram
See [docs/diagrams/diagram-export-4-29-2026-3_37_43-PM.svg](docs/diagrams/diagram-export-4-29-2026-3_37_43-PM.svg).

## Physical layer
- NFC tamper-evident seal provides a unique identity and intactness proof.
- IoT temperature logger with secure element generates ZK proofs.
- Optional ITEMprint PUF adds a physical fingerprint to packaging.

## Edge client layer
- Sender and receiver PWAs perform the Dual-Witness Handoff (DWH) offline.
- Devices verify seal status and temperature proofs, review hashes, and co-sign.
- Handoff bundles are queued locally and synced when online.

## On-chain layer
- Arbitrum L2 smart contracts anchor Merkle roots and verify dual signatures.
- Freshness score is updated from ZK-proven statistics.
- Alerts are emitted for contested handoffs or missing proofs.

## Off-chain services and privacy layer
- ZK prover service generates Groth16 proofs for compliance and freshness.
- Distributed vault stores encrypted documents with threshold access.
- Identity services manage DIDs and Verifiable Credentials.

## Data flow summary
1. Origin creates a digital birth certificate bound to the physical seal.
2. Each custody transfer performs a DWH ceremony and creates a dual-signed bundle.
3. Bundles sync on-chain when connectivity returns.
4. Off-chain provers update freshness and compliance proofs.
5. Inspect app verifies status from on-chain anchors without revealing raw data.

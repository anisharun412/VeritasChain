# VeritasChain

VeritasChain is a unified trust infrastructure for perishable supply chains. It creates immutable, dual-signed custody records, anchors document hashes on-chain, and uses zero-knowledge proofs to verify cold-chain compliance without exposing raw data.

This repository is a base scaffold for a four-person team to build:
- Physical identity anchors (NFC seals, secure logger)
- Dual-Witness Handoff (DWH) edge apps
- ZK prover services and encrypted vault
- On-chain verifier and freshness scoring

Key innovation: Dual-Witness Handoff (DWH). See [docs/protocols/dwh.md](docs/protocols/dwh.md).

## Repository layout
- apps/edge-pwa: Sender/receiver PWA for offline DWH handoffs
- apps/inspect: Veritas Inspect app for regulators and consumers
- contracts/foundry: Foundry workspace for core contracts
- contracts/hardhat: Hardhat 3 workspace for deployment and scripting
- circuits: Circom circuits and Groth16 artifacts
- services/prover: ZK proof generation and verification APIs
- services/vault: Encrypted document storage with threshold access
- services/identity: DID and credential services
- services/indexer: Event indexing and analytics
- packages/shared: Shared utilities
- packages/crypto: Cryptography helpers and hash tools
- packages/types: Shared types and schemas
- firmware/logger: Secure element logger firmware
- infra: Infrastructure and deployment templates
- docs: Architecture, protocol, and requirements

## Getting started
- Prerequisites: Node 20 LTS, pnpm, and Foundry (forge/cast/anvil).
- Run `pnpm install` at the repo root.
- Verify workspaces: `pnpm -r run lint --if-present`, `pnpm -r run test --if-present`, `pnpm -r run build --if-present`.

### Quick start
1. Contracts (Foundry): `cd contracts/foundry` then `forge build`
2. Contracts (Hardhat): `pnpm -C contracts/hardhat test`
3. Edge PWA: `pnpm -C apps/edge-pwa dev`
4. Inspect app: `pnpm -C apps/inspect dev`
5. Optional local services: `cd docker` then `docker compose up -d`

Full setup guide: [docs/setup.md](docs/setup.md)

## Docs
- Docs index: [docs/README.md](docs/README.md)
- Architecture diagram: [docs/diagrams/diagram-export-4-29-2026-3_37_43-PM.svg](docs/diagrams/diagram-export-4-29-2026-3_37_43-PM.svg)
- docs/requirements/10-point-spec.md
- docs/architecture/overview.md
- docs/architecture/tech-stack.md
- docs/protocols/dwh.md
- docs/diagrams

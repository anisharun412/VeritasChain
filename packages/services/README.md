# Off-chain Services Layer

Node.js (Express) services for VeritasChain: ZK proof generation, encrypted vault storage, and paymaster relaying.

## Tech stack alignment
- ZK proving system: Groth16 via `snarkjs` (proof route is mocked unless an external prover is configured).
- Decentralized storage: IPFS via `web3.storage` with a local fallback.
- Threshold encryption: `threshold-bls` (Rust) via an optional HTTP bridge; local fallback uses `secrets.js-grempe`.
- Paymaster relayer: ERC-4337 JSON-RPC to bundlers (Pimlico/Stackup compatible).

## Setup

From repo root:

```bash
cd packages/services
npm install
npm start
```

## Environment

Copy `.env.example` to `.env` and set values.

## API

### Health
- `GET /health`

### Proofs
- `POST /api/proof/generate`
  - Body: `{ "temperatures": [number], "min": number, "max": number, "docHash": "0x..." }`
  - Response: `{ "proof": "0x...", "publicInputs": [1, "0x..."] }`

### Vault
- `POST /api/vault/store` (multipart/form-data)
  - Fields: `shipmentId`, `document`
  - Response: `{ "ipfsCid": "...", "shares": ["..."] }`

- `POST /api/vault/access`
  - Body: `{ "shipmentId": "...", "courtOrderHash": "0x...", "sharesProvided": ["..."] }`
  - Response: downloadable file

- `POST /api/vault/register-court-order`
  - Body: `{ "courtOrderHash": "0x..." }`

### Relayer
- `POST /api/relay/submit`
  - Body: `UserOperation` JSON
  - Response: `{ "txHash": "0x..." }`

## Notes
- Vault storage falls back to local `vault-storage/` if no `STORAGE_API_TOKEN` is set.
- Proof generation is mocked unless `PROVER_URL` points to a prover (local or external).
- Threshold encryption uses `THRESHOLD_BLS_URL` when available, otherwise falls back to local Shamir shares.

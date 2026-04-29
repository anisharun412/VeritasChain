# Local Prover Service

Groth16 prover service that generates proofs for temperature range checks using Circom + snarkjs.

## Setup

From repo root:

```bash
pnpm -C services/prover install
pnpm -C services/prover build:artifacts
pnpm -C services/prover start
```

This starts the prover on port 4001 by default.

## Environment

Copy `.env.example` to `.env` and adjust as needed:

```
PORT=4001
CIRCUIT_NAME=temperature_range
CIRCUIT_DIR=./circuits
ARTIFACTS_DIR=./artifacts
PTAU_PATH=./artifacts/pot12_final.ptau
```

## API

### POST /api/proof/generate

Body:
```json
{
	"temperatures": [10, 12, 15],
	"min": 8,
	"max": 20
}
```

Response:
```json
{
	"proof": { "pi_a": [], "pi_b": [], "pi_c": [] },
	"publicInputs": ["...", "...", "..."]
}
```

## Notes
- Requires Circom 2.x installed and available in PATH.
- Uses `circomlib` comparators for range checks.

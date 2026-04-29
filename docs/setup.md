co# Setup guide

## Prerequisites
- Node.js 20 LTS
- pnpm 9.x
- Foundry (forge/cast/anvil)
- Docker (optional, for local services)
- Circom + SnarkJS (optional, for circuit builds)

### Verify tools
- `node -v`
- `pnpm -v`
- `forge --version`

## Install dependencies
From the repo root:
- `pnpm install`

If pnpm prompts about build scripts, run:
- `pnpm approve-builds`

## Contracts
### Foundry
- `cd contracts/foundry`
- `forge build`

### Hardhat
- `pnpm -C contracts/hardhat test`

## Apps
### Edge PWA
- `pnpm -C apps/edge-pwa dev`

### Inspect app
- `pnpm -C apps/inspect dev`

## Circuits
- `cd circuits`
- `pnpm build`

This runs `circom` over the placeholder circuits and outputs artifacts under `circuits/build/`.

## Local services (optional)
From `docker/`:
- `docker compose up -d`
- `docker compose down`

Set `ANVIL_FORK_URL` to fork an Arbitrum RPC endpoint when starting Anvil.

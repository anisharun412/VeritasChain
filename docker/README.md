# Local dev services

This compose file starts local services for development:
- Anvil (Ethereum dev chain)
- IPFS node
- Postgres

## Usage
- Start: `docker compose up -d`
- Stop: `docker compose down`

## Optional forking
Set `ANVIL_FORK_URL` to fork an Arbitrum RPC endpoint.

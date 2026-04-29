# Contributing

Thanks for helping build VeritasChain. This repo is a monorepo; each module has its own README with scope and ownership.

## Workflow
- Create a branch from main: feat/..., fix/..., docs/...
- Keep changes scoped to one module when possible.
- Add docs updates when behavior or interfaces change.
- Use descriptive PR titles and link related issues.

## Code review
- At least one reviewer from another module.
- Prefer small, focused PRs.

## Local checks
- pnpm -r run lint --if-present
- pnpm -r run test --if-present
- pnpm -r run build --if-present

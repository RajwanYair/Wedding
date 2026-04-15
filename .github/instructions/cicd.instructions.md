---
applyTo: "**/*.yml,**/*.yaml,.github/**"
description: "Use when: editing CI/CD workflows, GitHub Actions, or any YAML config."
---

# CI/CD Instructions

## Workflow Standards

- Use `actions/checkout@v4` and `actions/setup-node@v4` (current stable)
- `permissions: contents: read` (least privilege)
- Install deps via `npm ci`; use `cache: 'npm'` in `setup-node` (CI creates its own `node_modules/`; locally deps resolve from parent `../MyScripts/node_modules/`)
- Lint via `npm run lint:html`, `npm run lint:css`, `npm run lint:js`, `npm run lint:md` — all must exit 0
- Unit tests: `npm test` (Vitest, 1392+ tests) — Node matrix: `["22", "24"]`
- **Never** use `npx vitest run` — use `npm test` to avoid DEPRECATED cache warning
- Deploy via GitHub Pages on push to `main`
- Release: `release.yml` auto-attaches artifacts on tags (`vX.Y.Z`)

## Node.js Target

Node.js ≥ 20 (`engines.node` in `package.json`); CI runs on 22 + 24

## Commit Convention

`feat:` | `fix:` | `style:` | `docs:` | `ci:` | `chore:`

## Security

- Never log secrets in CI output
- Use `${{ secrets.TOKEN }}` for credentials
- Pin action versions to specific tags (e.g. `@v4`, not `@latest`)

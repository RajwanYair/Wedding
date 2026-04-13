---
applyTo: "**/*.yml,**/*.yaml,.github/**"
description: "Use when: editing CI/CD workflows, GitHub Actions, or any YAML config."
---

# CI/CD Instructions

## Workflow Standards

- Use `actions/checkout@v4` and `actions/setup-node@v4` (current stable)
- `permissions: contents: read` (least privilege)
- Install deps via `npm ci`; use `cache: 'npm'` in `setup-node`
- Lint via `npm run lint:html`, `npm run lint:css`, `npm run lint:js`, `npm run lint:md` — all must exit 0
- Unit tests: `node --test tests/wedding.test.mjs` — Node matrix: `["20", "22"]`
- Deploy via GitHub Pages on push to `main`
- Release: `release.yml` auto-attaches artifacts on tags (`vX.Y.Z`)

## Node.js Target

Node.js ≥ 20 (`engines.node` in `package.json`)

## Commit Convention

`feat:` | `fix:` | `style:` | `docs:` | `ci:` | `chore:`

## Security

- Never log secrets in CI output
- Use `${{ secrets.TOKEN }}` for credentials
- Pin action versions to specific tags (e.g. `@v4`, not `@latest`)

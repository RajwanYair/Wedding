---
applyTo: "**/*.yml,**/*.yaml,.github/**"
description: "Use when: editing CI/CD workflows, GitHub Actions, or any YAML config."
---

# CI/CD Instructions

## Workflow Standards

- Use `actions/checkout@v6` and `actions/setup-node@v6` (major-tag pins — sub-version tags like `@v6.0.2` do not exist and cause VS Code "unable to resolve" errors)
- `permissions: contents: read` (least privilege); escalate only when the job needs write access
- Install deps via `npm ci`; use `cache: 'npm'` in `setup-node` (CI creates its own `node_modules/`; locally deps resolve from parent `../MyScripts/node_modules/`)
- Keep `package.json` `packageManager` current so local tooling, cache behavior, and Copilot environment hints stay aligned
- Lint via `npm run lint` — must exit 0 with **0 errors, 0 warnings** (ESLint `--max-warnings 0`)
- i18n parity: `npm run check:i18n`
- Unit tests: `npm test` (Vitest 4, current suite) — Node matrix: `["22", "24"]`
- **Never** use `npx vitest run` in workflows — use `npm test` to avoid DEPRECATED cache warning
- Prefer `npm run build` over direct `npx vite build` so hooks and script-level conventions stay centralized
- Deploy via GitHub Pages on push to `main`
- Release: `release.yml` auto-attaches artifacts on tags (`vX.Y.Z`)
- CodeQL for JavaScript: use `github/codeql-action@v4`, `build-mode: none`, `security-extended,security-and-quality`
- SBOM: `sbom.yml` generates CycloneDX SBOM on every tag push
- Supply chain: `scorecard.yml` and `trivy.yml` run weekly hardened security scans

## Lint Gate — Zero Tolerance

| Tool | Scope | Rule |
| --- | --- | --- |
| ESLint | `src/**/*.js`, `scripts/`, `vite.config.js` | 0 errors, 0 warnings (`--max-warnings 0`) |
| Stylelint | `css/**/*.css` | 0 errors, 0 warnings |
| HTMLHint | `index.html` | 0 errors |
| markdownlint | `*.md` | 0 errors |

No `// eslint-disable` without a real violation. Stale disables error via `reportUnusedDisableDirectives`.

## Node.js Target

Node.js ≥ 22 (`engines.node` in `package.json`); CI matrix: `["22", "24"]`.

## Commit Convention

`feat:` | `fix:` | `style:` | `docs:` | `ci:` | `chore:`
Commit after **every Copilot chat session** or sprint with a clear summary message.

## Security

- Never log secrets in CI output
- Use `${{ secrets.TOKEN }}` for credentials
- Pin action versions to specific major tags (e.g. `@v4`, not `@latest`)
- `npm audit --audit-level=high` must return 0 high/critical vulns before tagging
- `node scripts/check-plaintext-secrets.mjs` must exit 0 on every PR

## Copilot Code Review

Copilot PR review is enabled via `.github/copilot/config.json`. Review instructions are applied
automatically to all PRs. Do not suppress or override them in workflow files.

## VS Code Extension — Known False Positives

The GitHub Actions extension cannot always resolve all action versions from GitHub. These are confirmed valid and intentional:

| Location | Warning | Why it's correct |
| --- | --- | --- |
| `deploy.yml` | `github-pages` env name "not valid" | GitHub Pages **requires** this exact environment name for `actions/deploy-pages` |
| `project-automation.yml` | `actions/labeler@v5` not found | Valid published tag; extension resolution is offline/cached |
| `sbom.yml` / `scorecard.yml` | `actions/upload-artifact@v4` not found | Same action + version works without error in `ci.yml` — extension cache issue |

Do **not** change these to work around the extension warning.

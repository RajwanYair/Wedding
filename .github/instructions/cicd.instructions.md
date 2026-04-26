---
applyTo: "**/*.yml,**/*.yaml,.github/**"
description: "Use when: editing CI/CD workflows, GitHub Actions, or any YAML config."
---

# CI/CD Instructions

## Workflow Standards

- Use `actions/checkout@v6.0.2` and `actions/setup-node@v6.4.0` (exact pins — resolves VS Code action-version linting errors and guards against supply-chain drift)
- `permissions: contents: read` (least privilege)
- Install deps via `npm ci`; use `cache: 'npm'` in `setup-node` (CI creates its own `node_modules/`; locally deps resolve from parent `../MyScripts/node_modules/`)
- Keep `package.json` `packageManager` current so local tooling, cache behavior, and Copilot environment hints stay aligned
- Lint via `npm run lint` — must exit 0 with **0 errors, 0 warnings** (ESLint `--max-warnings 0`)
- i18n parity: `npm run check:i18n`
- Unit tests: `npm test` (Vitest, current suite) — Node matrix: `["22", "24"]`
- **Never** use `npx vitest run` — use `npm test` to avoid DEPRECATED cache warning
- Prefer `npm run build` over direct `npx vite build` in workflows so hooks and script-level conventions stay centralized
- Deploy via GitHub Pages on push to `main`
- Release: `release.yml` auto-attaches artifacts on tags (`vX.Y.Z`)
- CodeQL for JavaScript should use `github/codeql-action@v4`, `build-mode: none`, and `security-extended,security-and-quality`

## Lint Gate — Zero Tolerance

| Tool | Scope | Rule |
| --- | --- | --- |
| ESLint | `src/**/*.js`, `scripts/`, `vite.config.js` | 0 errors, 0 warnings (`--max-warnings 0`) |
| Stylelint | `css/**/*.css` | 0 errors, 0 warnings |
| HTMLHint | `index.html` | 0 errors |
| markdownlint | `*.md` | 0 errors |

No `// eslint-disable` without a real violation. Stale disables error via `reportUnusedDisableDirectives`.

## Node.js Target

Node.js ≥ 22 (`engines.node` in `package.json`); CI runs on 22 + 24

## Commit Convention

`feat:` | `fix:` | `style:` | `docs:` | `ci:` | `chore:`
Commit after **every Copilot chat session** or sprint with a clear summary message.

## Security

- Never log secrets in CI output
- Use `${{ secrets.TOKEN }}` for credentials
- Pin action versions to specific tags (e.g. `@v4`, not `@latest`)
- `npm audit --audit-level=high` must return 0 high/critical vulns before tagging

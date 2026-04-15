# Wedding Manager — Claude Config

> Full spec: `.github/copilot-instructions.md` · v3.8.0

## Commands

```bash
npm test                  # 1407+ tests (106+ suites) — must all pass · 0 Node warnings
npm run lint              # HTML + CSS + JS + Markdown — 0 errors, 0 warnings
npm run lint:fix          # Auto-fix CSS + JS
npm run ci                # lint + test (same as CI)
npm run test:e2e          # Playwright smoke + visual regression (Chromium)
npm run test:coverage     # Vitest with V8 coverage (gates enforced in CI — S6.11)
npm run size              # Bundle size report with gzip
npm run sri               # SHA-384 integrity hashes for local assets
npm run build             # Vite build → dist/ (postbuild runs generate-precache)
# Provision shared node_modules (one-time):
cd ../MyScripts && npm install
```

## Critical Gotchas

| Area | Rule |
| --- | --- |
| Vite entry | **`src/main.js`** is the entry point — `js/main.js` is legacy; `vite-plugin-legacy-globals.mjs` is removed |
| ESLint scope | `js/` excluded from linting; `src/` uses `^_` varsIgnorePattern only |
| Font keywords | Stylelint: lowercase `tahoma` ✅ `Tahoma` ❌; multi-word `"Segoe UI"` ✅ |
| Vitest | `npm test` only — `pool: "forks"` + `--no-warnings` in vite.config.js |
| `vite build` | `npm run build` only — never `npx vite build` |
| node_modules | Shared at `../MyScripts/node_modules/` — no local copy; CI does its own `npm ci` |
| Auth credentials | `GOOGLE_CLIENT_ID`, `FB_APP_ID`, `APPLE_SERVICE_ID`, `SHEETS_WEBAPP_URL` in `js/config.js` |
| GH Actions | `checkout@v4` · `setup-node@v4` · `upload-pages-artifact@v3` · `deploy-pages@v4` |
| `sanitize(input,schema)` | Use for all user input validation — returns `{ value, errors }` |
| `enqueueWrite(key,fn)` | Use instead of direct `syncStoreKeyToSheets()` calls — debounces at 1.5 s |
| Tests count | 1407+ tests, 106+ suites — update header comment in `wedding.test.mjs` when adding |
| ESLint disable | Any `// eslint-disable` must reference a real violation — stale ones error (`reportUnusedDisableDirectives`) |
| Offline queue retries | `_MAX_RETRIES = 5`, `_RETRY_BASE_MS = 10_000` in `js/offline-queue.js` (S3.9) |
| GAS backend | `sheets-webapp.gs` v2.0.0 — `ALLOWED_SHEETS` includes Vendors/Expenses/RSVP_Log (S3.5) |
| Lighthouse | `.lighthouserc.json` — performance/a11y/seo/best-practices at `error`/0.90+ (S4.9) |
| Coverage gate | `continue-on-error` removed from CI coverage step — failures block CI (S6.11) |
| Visual regression | `tests/e2e/visual.spec.mjs` — run `--update-snapshots` first time (S6.9) |
| Quote style | Source uses double-quotes; test `JS.includes()` calls must match — use `'case "string"'` not `"case 'string'"` |
| `postbuild` hook | `generate-precache.mjs` auto-runs after `npm run build` — patches `dist/sw.js` APP_SHELL (S4.4) |
| Lint cache | ESLint + Stylelint use `node_modules/.cache/` via `--cache-location` flag |
| Unit test environment | `@vitest-environment happy-dom` required for tests that use DOM APIs |

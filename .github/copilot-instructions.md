# GitHub Copilot Instructions — Wedding Manager v13.4.0

> Modular wedding app · Hebrew RTL · RSVP · Tables · WhatsApp · Google Sheets sync · Minimal Runtime Deps

## Quick Facts

| Key | Value |
| --- | --- |
| Version | **v13.4.0** |
| Stack | HTML5 · vanilla CSS3 (`@layer` + nesting) · vanilla JS (ES2025, modules) |
| Runtime deps | **3** — `@supabase/supabase-js`, `dompurify`, `valibot`; devDeps: ESLint, Stylelint, HTMLHint, markdownlint, Vitest, Playwright |
| Node modules | Shared `../MyScripts/node_modules/` — run `npm install` from parent dir; CI uses its own `npm ci` |
| Language | Hebrew RTL primary, English toggle (lazy JSON) |
| Tests | `npm test` — **3153 tests** across 225 files · 0 Node warnings |
| Lint | `npm run lint` → 0 errors · 0 warnings (ESLint --cache, Stylelint --cache) |
| Deploy | GitHub Pages — <https://rajwanyair.github.io/Wedding> |
| Build | Vite 8 · `src/main.js` entry · pure ESM (no `window.*`) |
| Commit rule | After every Copilot chat session **or** completed sprint: `git commit` with clear message + `git push` |
| Auth providers | Google · Facebook · Apple OAuth + email allowlist + anonymous guest |

## File Structure

```text
index.html           # HTML shell
css/                 # 7 modules: variables · base · layout · components · responsive · print · auth
src/                 # Active ESM source (Vite entry: src/main.js)
  core/              # store · events · i18n · nav · state · ui · dom · config · template-loader
  sections/          # 18 section modules with mount/unmount lifecycle
  services/          # auth · sheets · sheets-impl · backend · presence · supabase
  utils/             # phone · date · sanitize · misc
  templates/         # 15 section HTML files (lazy-loaded by nav.js)
  modals/            # 7 modal HTML files (lazy-loaded on first open)
  i18n/              # 4 language files (he · en · ar · ru)
public/              # sw.js · manifest.json · icons
scripts/             # check-i18n-parity · inject-config · size-report · generate-icons · generate-precache · sri-check · sync-version
tests/               # repo sanity + unit/integration/e2e coverage
  e2e/               # Playwright: smoke · visual regression
.github/             # workflows · instructions · copilot · agents · prompts · Dependabot
.vscode/             # settings · extensions · tasks
```

## Mandatory Rules

1. `textContent` only — never `innerHTML` with unsanitized data
2. Every visible string: `data-i18n="key"` on HTML, `t('key')` in JS — both `he`+`en` required
3. All colors via CSS custom properties — never hardcode
4. DOM refs via `el` object — no inline `getElementById`
5. All data in `localStorage` with `wedding_v1_` prefix (JSON)
6. Phone: `cleanPhone()` converts Israeli `05X` → `+972` (wa.me ready)
7. Dates: `Asia/Jerusalem` timezone
8. After any edit: `npm run lint` must exit 0 (0 errors, 0 warnings)
9. Auth: anonymous users auto-enter as guest; admins sign in via email allowlist or Google/Facebook/Apple OAuth
10. Cross-module calls via `src/core/store.js`; events via `data-action`

## Data Models

Canonical runtime types live in `src/types.d.ts`.

- Guest/Table/Vendor/Expense enums, modal names, and storage keys live in `src/core/constants.js`
- Store defaults and persisted store domains live in `src/core/defaults.js`
- Prefer referencing those runtime files instead of duplicating shape definitions in new docs or agent files

## Auth Providers

| Provider | Status | Config key |
| --- | --- | --- |
| Email allowlist | ✅ Primary | `ADMIN_EMAILS` + Settings → User Access |
| Google | ✅ Active (GIS SDK) | `GOOGLE_CLIENT_ID` in `src/core/config.js` |
| Facebook | ✅ Active (FB JS SDK, dynamic) | `FB_APP_ID` in `src/core/config.js` |
| Apple | ✅ Active (AppleID SDK, dynamic) | `APPLE_SERVICE_ID` in `src/core/config.js` |
| Guest / Anonymous | ✅ Default | Auto-login, RSVP-only |

All OAuth providers call `isApprovedAdmin(email)` — allowlist is the single source of truth.

## CSS Architecture

- `@layer`: `variables → base → layout → components → auth → responsive → print`
- Native nesting with `&`; glassmorphism `backdrop-filter: blur(16px)`
- 5 themes: `body.theme-{rosegold,gold,emerald,royal}` + default purple
- RTL-first: `dir="rtl"` · `lang="he"` · breakpoints: 768 px · 480 px

## Version Bump Checklist

1. `src/core/config.js`, `public/sw.js`, `package.json`, `tests/wedding.test.mjs` — version string
2. `CHANGELOG.md` — new entry; `README.md` — badge + tests badge
3. `.github/copilot-instructions.md` — version + test count (Quick Facts row + Pre-release checklist)
4. `.github/copilot/config.json` — welcomeMessage version + test count
5. `.github/instructions/workspace.instructions.md` — version in title
6. `.github/workflows/ci.yml` — version in header comment
7. `ARCHITECTURE.md` — version in h1; `ROADMAP.md` — current state block + release table
8. `npm run lint && npm test` — 0 fail, 0 warn, 0 Node warnings
9. `git tag vX.Y.Z && git push --tags`

## Pre-Release Checklist

Run before every version tag / GitHub Pages deploy. All items must be green.

| # | Check | Command / Action |
| --- | --- | --- |
| 1 | **Zero lint errors/warnings** | `npm run lint` — 0 errors, 0 warnings, 0 Node warnings |
| 2 | **Zero test failures** | `npm test` — all current suites pass, 0 skipped |
| 3 | **Zero deprecation notices** | No `npm WARN deprecated` in `npm ci` output |
| 4 | **No dead code/files** | No unused exports, no orphaned templates or JS modules |
| 5 | **No eval/innerHTML** | CI security scan passes (`src/**/*.js`, `index.html`) |
| 6 | **Vite build succeeds** | `npm run build` exits 0; check `dist/` size with `npm run size` |
| 7 | **SW cache name bumped** | `public/sw.js` `CACHE_NAME` matches new `vX.Y.Z` |
| 8 | **Docs current** | `CHANGELOG.md` has entry; `README.md` badge matches `package.json` |
| 9 | **Auth providers confirmed** | Google · Facebook · Apple secrets in GitHub Secrets; email allowlist current |
| 10 | **Commit + push** | `git commit -m "vX.Y.Z — ..."` + `git push` + `git tag vX.Y.Z && git push --tags` |
| 11 | **GH issues closed** | Link each resolved issue to commit hash in its closing comment |
| 12 | **i18n complete** | Every new `t('key')` has both `he` + `en` entries in `src/i18n/*.json` |

## Known Gotchas

| Area | Rule |
| --- | --- |
| ESLint scope | `src/` uses `^_` varsIgnorePattern |
| Stylelint fonts | lowercase: `tahoma` ✅; multi-word: `"Segoe UI"` ✅ |
| GH Actions | `checkout@v6` · `setup-node@v6` · `upload-pages-artifact@v4` · `deploy-pages@v5` |
| Copilot customizations | Prefer `.agent.md` + `.prompt.md` + `.instructions.md` + `.vscode/mcp.json`; use Chat Customizations editor for discovery |
| OAuth globals | `FB`, `AppleID`, `google` declared `readonly` in `eslint.config.mjs` |
| RSVP flow | `lookupRsvpByPhone()` fires on phone input; phone-first lookup |
| Sheets sync | `enqueueWrite(key, fn)` only — never call `syncStoreKeyToSheets` directly |
| RSVP log | `enqueueWrite("rsvp_log", () => appendToRsvpLog(entry))` — logs to RSVP_Log sheet |
| Vitest | `npm test` only — `pool: "forks"` with `--no-warnings` suppresses happy-dom noise |
| Lint cache | ESLint + Stylelint use `node_modules/.cache/` — no manual cache files in repo root |
| node_modules | Shared at `../MyScripts/node_modules/`; CI runs its own `npm ci` |
| SW update | `initSW()` in `src/core/ui.js` — detects new deployments; shows banner or auto-reloads |
| Guest default | Guests land on `landing` section; `PUBLIC_SECTIONS` controls no-auth access |
| Session commit | After every Copilot chat session or sprint: commit with clear message and push |

## Key Patterns

```js
t('key')                        // i18n lookup
data-i18n="key"                 // HTML binding
sanitize(input, schema)         // validates + coerces — returns { value, errors }
cleanPhone('054-123-4567')      // → '972541234567'
enqueueWrite('guests', syncFn)  // debounced write queue — do NOT call sheets directly
appendToRsvpLog(entry)          // log RSVP submissions to RSVP_Log sheet tab
announce(message)               // ARIA live region announcement (src/core/ui.js)
lookupRsvpByPhone(raw)          // phone-first RSVP lookup
getGuestStats()                 // total · confirmed · pending · seated · meals
getVendorStats()                // total · totalCost · totalPaid · outstanding · paymentRate
getCheckinStats()               // total · checkedIn · checkinRate · remaining
getExpenseSummary()             // total · byCategory
filterGuestsByStatus(status?)   // filter guests by status or return all
initKeyboardShortcuts()         // Alt+1–9 section navigation (returns cleanup fn)
```

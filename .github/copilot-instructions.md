# GitHub Copilot Instructions — Wedding Manager v3.8.0

> Modular wedding app · Hebrew RTL · RSVP · Tables · WhatsApp · Google Sheets sync · Zero Runtime Deps

## Quick Facts

| Key | Value |
| --- | --- |
| Version | **v3.8.0** |
| Stack | HTML5 · vanilla CSS3 (`@layer` + nesting) · vanilla JS (ES2025, modules) |
| Runtime deps | **Zero** — devDeps only (ESLint, Stylelint, HTMLHint, markdownlint, Vitest, Playwright) |
| Node modules | Shared `../MyScripts/node_modules/` — run `npm install` from parent dir; CI uses its own `npm ci` |
| Language | Hebrew RTL primary, English toggle (lazy JSON) |
| Tests | `npm test` — **1407+ pass (106+ suites)** · 0 Node warnings |
| Lint | `npm run lint` → 0 errors · 0 warnings (ESLint --cache, Stylelint --cache) |
| Deploy | GitHub Pages — <https://rajwanyair.github.io/Wedding> |
| Build | Vite 8 · `src/main.js` entry · pure ESM (no `window.*`) |

## File Structure

```text
index.html           # HTML shell
css/                 # 7 modules: variables · base · layout · components · responsive · print · auth
js/                  # 38 legacy modules (excluded from linting — js/ is kept for backward compat)
src/                 # Active ESM source (Vite entry: src/main.js)
  core/              # store · events · i18n · nav · state · ui · dom · config · template-loader
  sections/          # 18 section modules with mount/unmount lifecycle
  services/          # auth · sheets (Google OAuth + Sheets sync)
  utils/             # phone · date · sanitize · misc
  templates/         # 15 section HTML files (lazy-loaded by nav.js)
  modals/            # 6 modal HTML files (lazy-loaded on first open)
public/              # sw.js · manifest.json · icons
scripts/             # sri-check · inject-config · size-report · send-push · generate-icons · generate-precache
tests/               # 1407+ tests: wedding.test.mjs (1136) + 15 unit/integration files
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

```text
Guest:  { id, firstName, lastName, phone, email, count, children,
          status: pending|confirmed|declined|maybe,
          side: groom|bride|mutual, group: family|friends|work|other,
          meal: regular|vegetarian|vegan|gluten_free|kosher,
          mealNotes, accessibility, tableId, gift, notes, sent, checkedIn,
          rsvpDate, createdAt, updatedAt }
Table:  { id, name, capacity, shape: round|rect }
Vendor: { id, category, name, contact, phone, price, paid, notes, updatedAt, createdAt }
Expense:{ id, category, description, amount, date, createdAt }
```

## Auth Providers

| Provider | Status | Config key |
| --- | --- | --- |
| Email allowlist | ✅ Primary | `ADMIN_EMAILS` + Settings → User Access |
| Google | ✅ Active (GIS SDK) | `GOOGLE_CLIENT_ID` in `js/config.js` |
| Facebook | ✅ Active (FB JS SDK, dynamic) | `FB_APP_ID` in `js/config.js` |
| Apple | ✅ Active (AppleID SDK, dynamic) | `APPLE_SERVICE_ID` in `js/config.js` |
| Guest / Anonymous | ✅ Default | Auto-login, RSVP-only |

All OAuth providers call `isApprovedAdmin(email)` — allowlist is the single source of truth.

## CSS Architecture

- `@layer`: `variables → base → layout → components → auth → responsive → print`
- Native nesting with `&`; glassmorphism `backdrop-filter: blur(16px)`
- 5 themes: `body.theme-{rosegold,gold,emerald,royal}` + default purple
- RTL-first: `dir="rtl"` · `lang="he"` · breakpoints: 768 px · 480 px

## Version Bump Checklist

1. `js/config.js`, `public/sw.js`, `package.json`, `tests/wedding.test.mjs` — version string
2. `CHANGELOG.md` — new entry; `README.md` — badge; `CLAUDE.md` — version + test count
3. `.github/copilot-instructions.md` — version + test count (Quick Facts row)
4. `npm run lint && npm test` — 0 fail, 0 warn, 0 Node warnings
5. `git tag vX.Y.Z && git push --tags`

## Known Gotchas

| Area | Rule |
| --- | --- |
| ESLint scope | `js/` excluded from linting; `src/` uses `^_` varsIgnorePattern |
| Stylelint fonts | lowercase: `tahoma` ✅; multi-word: `"Segoe UI"` ✅ |
| GH Actions | `checkout@v4` · `setup-node@v4` · `upload-pages-artifact@v3` · `deploy-pages@v4` |
| OAuth globals | `FB`, `AppleID`, `google` declared `readonly` in `eslint.config.mjs` |
| RSVP flow | `lookupRsvpByPhone()` fires on phone input; phone-first lookup |
| Sheets sync | `enqueueWrite(key, fn)` only — never call `syncStoreKeyToSheets` directly |
| RSVP log | `enqueueWrite("rsvp_log", () => appendToRsvpLog(entry))` — logs to RSVP_Log sheet |
| Vitest | `npm test` only — `pool: "forks"` with `--no-warnings` suppresses happy-dom noise |
| Lint cache | ESLint + Stylelint use `node_modules/.cache/` — no manual cache files in repo root |
| node_modules | Shared at `../MyScripts/node_modules/`; CI runs its own `npm ci` |

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

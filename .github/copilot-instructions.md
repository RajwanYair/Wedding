# GitHub Copilot Instructions — Wedding Manager v1.19.0

> Modular wedding app · Hebrew RTL · RSVP · Tables · WhatsApp · Google Sheets sync · Zero Runtime Deps

## Quick Facts

| Key | Value |
| --- | --- |
| Version | **v1.19.0** |
| Stack | HTML5 · vanilla CSS3 · vanilla JS (ES2020+) |
| Runtime deps | Zero — devDeps only (ESLint, Stylelint, HTMLHint, markdownlint, Playwright) |
| Language | Hebrew RTL primary, English toggle |
| Tests | `npm test` — 535 pass (71 suites) |
| Lint | `npm run lint` → 0 errors · 0 warnings |
| Deploy | GitHub Pages — <https://rajwanyair.github.io/Wedding> |

## File Structure

```text
index.html           # HTML shell (links css/ + js/)
css/                 # 6 modules: variables · base · layout · components · responsive · print
js/                  # 32 modules: config · i18n · dom · state · utils · ui · nav · dashboard
                     #   guests · tables · invitation · whatsapp · rsvp · settings · sheets
                     #   auth · analytics · app · timeline · gallery · checkin · registry
                     #   expenses · contact-collector · offline-queue · audit · error-monitor
                     #   email · push · router · guest-landing
sw.js                # Service Worker — stale-while-revalidate + push + notificationclick
scripts/             # sri-check.mjs · inject-config.mjs · size-report.mjs · send-push.mjs
tests/wedding.test.mjs   # 535 unit tests (71 suites)
tests/e2e/           # Playwright smoke tests (smoke.spec.mjs)
playwright.config.mjs
.github/workflows/   # ci.yml · deploy.yml · release.yml
.vscode/             # settings · extensions · tasks · mcp
```

## Mandatory Rules

1. `textContent` only — never `innerHTML` with unsanitized data
2. Every visible string: `data-i18n="key"` on HTML, `t('key')` in JS — both `he`+`en` required
3. All colors via CSS custom properties — never hardcode
4. DOM refs cached in `el` object — no inline `getElementById`
5. All data in `localStorage` with `wedding_v1_` prefix (JSON)
6. Phone: `cleanPhone()` converts Israeli `05X` → `+972` (wa.me ready)
7. Dates: `Asia/Jerusalem` timezone
8. After any edit: `npm run lint` must exit 0 (0 errors, 0 warnings)
9. Auth: anonymous users auto-enter as guest; admins sign in via email allowlist or Google/Facebook/Apple OAuth (all check `isApprovedAdmin(email)`)

## Guest Data Model (v1.1.0)

```text
Guest: { id, firstName, lastName, phone, email, count, children,
  status: pending|confirmed|declined|maybe,
  side: groom|bride|mutual,  group: family|friends|work|other,
  meal: regular|vegetarian|vegan|gluten_free|kosher,  ← data value; displays as "מהדרין/Mehadrin"
  mealNotes, accessibility: bool, tableId, gift, notes, sent: bool,
  rsvpDate, createdAt, updatedAt }
Table: { id, name, capacity, shape: round|rect }
```

## Auth Providers (js/auth.js)

| Provider | Status | Config key |
| --- | --- | --- |
| Email allowlist | ✅ Primary | `ADMIN_EMAILS` + Settings → User Access |
| Google | ✅ Active (GIS SDK) | `GOOGLE_CLIENT_ID` in `js/config.js` |
| Facebook | ✅ Active (FB JS SDK, dynamic) | `FB_APP_ID` in `js/config.js` |
| Apple | ✅ Active (AppleID SDK, dynamic) | `APPLE_SERVICE_ID` in `js/config.js` |
| Guest / Anonymous | ✅ Default | Auto-login, RSVP-only |

All OAuth providers call `isApprovedAdmin(email)` — allowlist is the single source of truth for authorization.

## CSS Architecture

- Glassmorphism: `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px)`
- 5 themes: `body.theme-{rosegold,gold,emerald,royal}` + default purple
- RTL-first: `dir="rtl"` · `lang="he"` — `margin-right: auto` for LTR accents
- Breakpoints: 768px · 480px · `prefers-reduced-motion`: disables animations

## Version Bump Checklist

1. `js/config.js`, `sw.js`, `package.json`, `tests/wedding.test.mjs` — version string
2. `CHANGELOG.md` — new entry; `README.md` — badge
3. `npm run lint && node --test tests/wedding.test.mjs` — 0 fail, 0 warn
4. `git tag vX.Y.Z && git push --tags`

## Known Gotchas

| Area | Rule |
| --- | --- |
| ESLint `varsIgnorePattern` | onclick= handlers use `varsIgnorePattern` — do not remove it; prefixes include `^lookup` |
| Stylelint font keywords | lowercase: `tahoma` ✅ `Tahoma` ❌; multi-word: `"Segoe UI"` ✅ |
| markdownlint MD024 | `.markdownlint.json` sets `"MD024": { "siblings_only": true }` — do not remove |
| Instructions `applyTo` | Never `"**"` — always scope to a glob (`**/*.html`, `**/*.yml`) |
| GH Actions versions | `checkout@v4` · `setup-node@v4` · `upload-pages-artifact@v3` · `deploy-pages@v4` |
| OAuth globals | `FB`, `AppleID`, `google` declared `readonly` in `eslint.config.mjs` |
| RSVP phone-first | `lookupRsvpByPhone()` fires on phone input; reveals rest of form; pre-fills from guest list |
| Google Sheets sync | `SHEETS_WEBAPP_URL` in config.js — Apps Script Web App URL required for writes; reads use gviz/tq |

## Key Patterns

```js
t('key')                      // i18n lookup
data-i18n="key"               // HTML binding
saveAll()                     // persist guests + tables + weddingInfo
cleanPhone('054-123-4567')    // → '972541234567'
const x = obj?.prop ?? def;  // ES2020+ preferred
_oauthLogin(email, name, pic, provider)  // central OAuth success handler
lookupRsvpByPhone()           // phone-first RSVP: search → pre-fill or reveal empty form
renderAnalytics()             // render SVG donut + bar charts for analytics section
```

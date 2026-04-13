# Wedding Manager — Claude Project Config

> Full spec in `.github/copilot-instructions.md`. This file: minimal fast-load context.

## Commands

```bash
node --test tests/wedding.test.mjs   # 192 tests — must all pass
npm run lint                         # HTML + CSS + JS + Markdown — 0 errors, 0 warnings
npm run lint:fix                     # Auto-fix CSS + JS
npm run ci                           # lint + test (same as CI)
```

## Architecture (v1.12.0 — modular)

| Path | Role |
| --- | --- |
| `index.html` | HTML shell — links `css/` + `js/` |
| `css/` (6 files) | variables · base · layout · components · responsive · auth |
| `js/` (18 files) | config · i18n · dom · state · utils · ui · nav · dashboard · guests · tables · invitation · whatsapp · rsvp · settings · sheets · auth · analytics · app |
| `sw.js` | Stale-while-revalidate + 5-min update polling |
| `manifest.json` | PWA manifest |
| `tests/wedding.test.mjs` | 192 unit tests (Node built-in runner) |

## Auth Setup

Credentials go in `js/config.js`:

```js
const GOOGLE_CLIENT_ID  = "YOUR_ID.apps.googleusercontent.com"; // console.cloud.google.com
const FB_APP_ID         = "";   // developers.facebook.com
const APPLE_SERVICE_ID  = "";   // developer.apple.com
const SHEETS_WEBAPP_URL = "";   // Apps Script Web App URL — required for sheet writes
```

Google GIS SDK is loaded as `<script>` in `index.html`. Facebook and Apple SDKs are loaded dynamically by `loadFBSDK()` / `loadAppleSDK()` in `auth.js` when their App ID / Service ID is set. All OAuth providers check `isApprovedAdmin(email)` — the email allowlist is the single authorization source.

## Mandatory Rules

1. `textContent` only — never `innerHTML` with dynamic data
2. Every new visible string: `data-i18n="key"` on HTML, `t('key')` in JS — both `he`+`en` required
3. All colors via CSS custom properties — never hardcode
4. All DOM refs via `el` object — no inline `getElementById`
5. All data in `localStorage` with `wedding_v1_` prefix
6. `npm run lint` must exit 0 after every change

## Version Bump Checklist

1. `js/config.js`, `sw.js`, `package.json`, `tests/wedding.test.mjs` — version string
2. `CHANGELOG.md` — new entry; `README.md` — badge
3. `npm run lint && node --test tests/wedding.test.mjs` — 0 failures
4. `git tag vX.Y.Z && git push --tags`

## Key Patterns

```js
t('key')                              // i18n lookup
data-i18n="key"                       // HTML binding
saveAll()                             // persists guests + tables + weddingInfo
cleanPhone('054-123-4567')            // → '972541234567'  (wa.me ready)
_oauthLogin(email, name, pic, prov)   // central OAuth success handler
lookupRsvpByPhone()                   // phone-first RSVP: fired oninput; pre-fills or reveals form
renderAnalytics()                     // SVG donut + bar chart analytics section
```

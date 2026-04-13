# Wedding Manager — Claude Project Config

> Full spec in `.github/copilot-instructions.md`. This file: minimal fast-load context.

## Commands

```bash
node --test tests/wedding.test.mjs   # 125 tests — must all pass
npm run lint                         # HTML + CSS + JS + Markdown — 0 errors, 0 warnings
npm run lint:html                    # HTMLHint → index.html
npm run lint:css                     # Stylelint → css/*.css
npm run lint:js                      # ESLint → js/*.js
npm run lint:md                      # markdownlint-cli2
```

## Architecture (v1.3.0 — modular)

| Path | Role |
| --- | --- |
| `index.html` | HTML shell — links `css/` + `js/` |
| `css/` (6 files) | variables · base · layout · components · responsive · auth |
| `js/` (17 files) | config · i18n · dom · state · utils · ui · nav · dashboard · guests · tables · invitation · whatsapp · rsvp · settings · sheets · auth · app |
| `sw.js` | Stale-while-revalidate + 5-min update polling |
| `manifest.json` | PWA manifest |
| `tests/wedding.test.mjs` | 125 unit tests (Node built-in runner) |

## Auth Setup

Credentials go in `js/config.js`:

```js
const GOOGLE_CLIENT_ID  = "YOUR_ID.apps.googleusercontent.com"; // console.cloud.google.com
const FB_APP_ID         = "";   // developers.facebook.com
const APPLE_SERVICE_ID  = "";   // developer.apple.com
```

SDKs must be loaded as `<script>` tags in `index.html` for Facebook and Apple.

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
t('key')                      // i18n lookup
data-i18n="key"               // HTML binding
saveAll()                     // persists guests + tables + weddingInfo
cleanPhone('054-123-4567')    // → '972541234567'  (wa.me ready)
```

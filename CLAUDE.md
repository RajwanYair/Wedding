# Wedding Manager — Claude Project Config

> Read `.github/copilot-instructions.md` for full project spec. This file provides the minimal fast-load context for Claude.

## Commands

```bash
node --test tests/wedding.test.mjs   # 125 tests — must all pass
npm run lint                         # HTML + CSS + JS + Markdown — 0 errors, 0 warnings
npm run lint:html                    # HTMLHint
npm run lint:css                     # Stylelint (extracts <style> block)
npm run lint:js                      # ESLint   (extracts <script> block)
npm run lint:md                      # markdownlint-cli2
```

## Architecture

Single file: `index.html` embeds all HTML, CSS, and JS. No build step, no runtime deps.

| File                     | Role                                  |
| ------------------------ | ------------------------------------- |
| `index.html`             | Complete app                          |
| `sw.js`                  | Offline cache (APP_SHELL)             |
| `manifest.json`          | PWA manifest                          |
| `invitation.jpg`         | Default invitation image              |
| `tests/wedding.test.mjs` | 125 unit tests (Node built-in runner) |

## Mandatory Rules

1. `textContent` only — never `innerHTML` with dynamic data
2. Every new visible string: `data-i18n="key"` on HTML, `t('key')` in JS — both `he`+`en` required
3. All colors via CSS custom properties — never hardcode
4. All DOM refs via `el` object — no inline `getElementById`
5. All data in `localStorage` with `wedding_v1_` prefix
6. `npm run lint` must exit 0 after every change

## Guest Model (v1.1.0)

```text
{ id, firstName, lastName, phone, email, count, children,
  status: pending|confirmed|declined|maybe,
  side: groom|bride|mutual,  group: family|friends|work|other,
  meal: regular|vegetarian|vegan|gluten_free|kosher,
  mealNotes, accessibility: boolean,
  tableId, gift, notes, sent, rsvpDate, createdAt, updatedAt }
```

## Version Bump Checklist

1. `index.html`, `sw.js`, `CHANGELOG.md`, `README.md` (badge), `package.json`, `tests/wedding.test.mjs`
2. `npm run lint && node --test tests/wedding.test.mjs` — 0 failures
3. `git tag vX.Y.Z && git push --tags`

## Key Patterns

```js
// Phone normalization
cleanPhone('054-123-4567')   // → '972541234567'  (wa.me ready)

// i18n
t('key')                     // JS string lookup
data-i18n="key"              // HTML attribute
data-i18n-placeholder="key"  // input placeholder
data-i18n-tooltip="key"      // tooltip

// Storage
saveAll()                    // persists _guests, _tables, _weddingInfo
```

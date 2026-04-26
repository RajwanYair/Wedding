# Locale Contribution Guide

> How to add a new language to Wedding Manager

## Quick start

1. Copy `src/i18n/en.json` → `src/i18n/<code>.json` (e.g. `fr.json`)
2. Translate every value — **do not rename keys**
3. Add your locale to `loadLocale()` in `src/core/i18n.js`
4. Declare RTL if needed (see [RTL requirements](#rtl-requirements))
5. Run parity check: `node scripts/check-i18n-parity.mjs`
6. Run `npm run lint && npm test` — 0 errors, 0 failures

---

## File format

JSON object — flat key/value pairs. All values are strings.

```jsonc
{
  "app_title": "Wedding Manager",
  "nav_dashboard": "Dashboard",
  "rsvp_deadline_soon": "⏰ {days} days until RSVP deadline"
}
```

### Supported interpolation syntax

| Pattern | Meaning |
|---------|---------|
| `{key}` | Simple string or number replacement |
| `{count, plural, one {# guest} other {# guests}}` | ICU plural (uses `Intl.PluralRules`) |
| `{n, plural, =0 {none} one {# item} other {# items}}` | Exact-value plural |

Hebrew and English are the reference locales. When in doubt, check `he.json` or `en.json`.

---

## Adding the locale to the codebase

### 1 — `src/core/i18n.js` — `loadLocale()`

Add an `else if` branch:

```js
} else if (lang === "fr") {
  const { default: dict } = await import("../i18n/fr.json");
  _dict = dict;
```

### 2 — `src/utils/locale-detector.js` — supported list

Add `"fr"` to the `SUPPORTED` set (if not already present) so `resolveAppLocale()` can auto-detect it.

### 3 — `src/core/i18n.js` — `preloadLocale()`

Add:

```js
else if (lang === "fr") import("../i18n/fr.json");
```

### 4 — `src/main.js` — auto-detect

Pass your locale code into `resolveAppLocale()`:

```js
resolveAppLocale(detectLocale(), ["he", "en", "ar", "ru", "fr"], "he")
```

---

## RTL requirements

If your language is right-to-left (e.g. Arabic, Hebrew, Farsi), add it to the `RTL_LANGS` Set in `src/core/i18n.js`:

```js
const RTL_LANGS = new Set(["he", "ar", "fa"]);
```

The app uses `dir="rtl"` on `<html>` — CSS is RTL-first by default. No additional layout work is needed for most languages.

---

## Parity check

Run this to find any keys present in English but missing in your locale file:

```sh
node scripts/check-i18n-parity.mjs
```

Or validate a specific file:

```sh
node scripts/validate-i18n.mjs src/i18n/fr.json
```

Both scripts exit 0 on success, non-zero on any gap. CI runs parity check automatically.

---

## Plural rules

Wedding Manager uses `Intl.PluralRules` for correct plurals. ICU categories:

| Category | Used for |
|----------|---------|
| `zero` | Arabic, etc. |
| `one` | English, Hebrew, most European |
| `two` | Arabic, Hebrew |
| `few` | Arabic, Russian, Czech, Polish |
| `many` | Arabic, Russian |
| `other` | Always required — catch-all |

Example for French (no "few"/"many", only "one" and "other"):

```json
"guest_count": "{count, plural, one {# invité} other {# invités}}"
```

---

## Testing your locale

1. Open the app in a browser: `npm run dev`
2. Open Settings → Language → select your locale (or add it to the switcher temporarily)
3. Check every visible string — untranslated keys fall back to English via `loadFallbackLocale()`
4. Run unit tests: `npm test`

---

## Checklist before submitting a PR

- [ ] All keys from `en.json` are present in your file (parity check passes)
- [ ] No placeholder values like `"TODO"` or `"..."` remain
- [ ] RTL added to `RTL_LANGS` if applicable
- [ ] `loadLocale()` and `preloadLocale()` updated
- [ ] `npm run lint && npm test` — 0 errors, 0 failures
- [ ] A brief note in `CHANGELOG.md` under the current version

---

## Current locales

| Code | Language | RTL | Status |
|------|----------|-----|--------|
| `he` | Hebrew | ✅ | Primary / reference |
| `en` | English | ❌ | Fallback |
| `ar` | Arabic | ✅ | Community |
| `ru` | Russian | ❌ | Community |

## Per-locale screenshots

> Reviewers compare visual parity across locales. Drop one screenshot of each
> primary section per locale into `docs/screenshots/<locale>/<section>.png`
> (kept out of the repo until needed; create the folder when you start).

| Section | Hebrew (he) | English (en) | Arabic (ar) | Russian (ru) |
| --- | --- | --- | --- | --- |
| Landing | _todo_ | _todo_ | _todo_ | _todo_ |
| Dashboard | _todo_ | _todo_ | _todo_ | _todo_ |
| Guests | _todo_ | _todo_ | _todo_ | _todo_ |
| RSVP | _todo_ | _todo_ | _todo_ | _todo_ |
| Tables | _todo_ | _todo_ | _todo_ | _todo_ |
| Vendors | _todo_ | _todo_ | _todo_ | _todo_ |
| Settings | _todo_ | _todo_ | _todo_ | _todo_ |

### How to capture

`pwsh
npx playwright test tests/e2e/visual.spec.mjs --project=chromium-light
`

Visual baselines from Playwright land in `tests/e2e/visual.spec.mjs-snapshots/`;
copy the relevant per-locale renders into `docs/screenshots/` for the guide.

## RTL parity checklist

- [ ] `dir="rtl"` is applied automatically by `i18n.applyDirection()` for `he` and `ar`
- [ ] Icons that imply direction (chevrons, arrows) flip via CSS logical props
- [ ] Numbers stay LTR inside RTL paragraphs (`unicode-bidi: plaintext` on
      phone/date spans)
- [ ] Tahoma + `"Segoe UI"` font stack covers all 4 scripts
- [ ] `tests/e2e/visual.spec.mjs` snapshots updated per locale after layout changes

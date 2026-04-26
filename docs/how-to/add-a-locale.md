# How-To — Add a Locale

> **Audience**: contributors who want to ship a new UI language.
> **Prerequisites**: working repo (`npm install` clean, `npm test` green),
> familiarity with JSON. This is a _task-oriented_ Diátaxis page; for
> conceptual background see [`../locale-guide.md`](../locale-guide.md).

Wedding Manager ships four locales out of the box: `he` (Hebrew, primary),
`en`, `ar`, `ru`. This page walks you through adding a fifth — we will use
`fr` (French) as the running example.

## 1. Pick a BCP-47 code

Use a 2-letter code where possible (`fr`, `de`, `es`). For regional variants
use `<lang>-<region>` (`pt-BR`). The code becomes:

- File name: `src/i18n/<code>.json`
- HTML lang attribute: `<html lang="<code>">`
- UI selector value: `<code>`

## 2. Copy English as the seed

```bash
cp src/i18n/en.json src/i18n/fr.json
```

Translate every value. Leave the keys untouched — they are referenced from
`data-i18n` attributes and `t('key')` calls across the app.

## 3. Register the locale

Edit `src/core/i18n.js` and add `fr` to `SUPPORTED_LANGUAGES`:

```js
export const SUPPORTED_LANGUAGES = ["he", "en", "ar", "ru", "fr"];
```

If your locale is right-to-left, also add it to `RTL_LANGUAGES` in the same
file.

## 4. Add a UI label for the language picker

In `src/i18n/he.json`, `src/i18n/en.json`, and your new `fr.json`, add the
display name:

```json
{
  "language.fr": "Français"
}
```

Add the equivalent translation in every other locale.

## 5. Run the parity check

```bash
npm run check:i18n
```

The script fails if any locale is missing a key that exists in `he`. Fix
gaps by translating, never by deleting.

## 6. Lint, test, build

```bash
npm run lint
npm test
npm run build
```

All three must exit 0.

## 7. (Optional) Add an E2E smoke test

In `tests/e2e/smoke.spec.mjs`, extend the language matrix to include `fr`:

```js
for (const lang of ["he", "en", "fr"]) {
  test(`smoke: ${lang}`, async ({ page }) => { /* … */ });
}
```

## 8. Commit

```bash
git add src/i18n/fr.json src/core/i18n.js src/i18n/*.json
git commit -m "feat(i18n): add French locale (fr)"
```

## Common pitfalls

- **Stale parity report**: run `npm run check:i18n` after _every_ key edit.
- **Mixed RTL/LTR**: add to `RTL_LANGUAGES` _and_ verify `dir` flips in
  `src/core/i18n.js#applyDirection`.
- **Hard-coded strings**: every visible label must use `data-i18n` or
  `t('key')`. The lint pipeline catches most cases via
  `audit:trusted-types`.

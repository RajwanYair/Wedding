# How-to: Add a new locale

> Diátaxis: how-to guide. For the locale system architecture, see the
> [locale guide](../locale-guide.md).

This recipe walks you through adding a new RTL or LTR locale to the Wedding
Manager. It assumes you already have translations ready in JSON.

## When to use

- Onboarding a new market (e.g. French, Spanish).
- Adding a regional variant that diverges from an existing base locale.

## You will need

- A complete `<locale>.json` mirroring every key in `src/i18n/he.json`.
- Native-speaker review for any visible string.
- ~20 minutes for the integration steps below.

## Steps

### 1. Create the locale JSON

Copy `src/i18n/en.json` to `src/i18n/<code>.json` (`<code>` is the BCP-47 tag,
e.g. `fr`, `es`, `pt-BR`). Translate every value. Keep keys identical.

```bash
cp src/i18n/en.json src/i18n/fr.json
```

### 2. Register the locale

Open `src/core/i18n.js` and add `<code>` to the `SUPPORTED_LOCALES` array.
If the locale is RTL, also add it to `RTL_LOCALES`.

### 3. Add the picker entry

In `src/templates/settings.html` find the locale `<select>` and add:

```html
<option value="fr" data-i18n="locale.fr">Français</option>
```

Then add the `locale.fr` key to **all** existing locale JSON files (so the
picker label is itself localized).

### 4. Verify parity

Run the parity guard. It will fail if any key is missing or extra.

```bash
npm run check:i18n
```

### 5. Lint and test

```bash
npm run lint
npm test
```

### 6. Smoke-test in the browser

```bash
npm run dev
```

Open the app, go to Settings → Language, pick the new locale, and confirm:

- All visible strings switch language.
- RTL/LTR direction is correct (`<html dir>` flips for RTL locales).
- Date/time formatting uses the locale (look at the dashboard date strip).

### 7. Commit

```bash
git add src/i18n/<code>.json src/core/i18n.js src/templates/settings.html src/i18n/*.json
git commit -m "feat(i18n): add <code> locale"
```

## Troubleshooting

| Symptom                          | Likely cause                              | Fix                                          |
| -------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `check:i18n` fails on `extra`    | Stale key in your new file                | Remove keys not in `he.json`                 |
| `check:i18n` fails on `missing`  | Untranslated keys                         | Copy from `en.json`, translate               |
| Picker label is the BCP-47 code  | Forgot the `locale.<code>` key            | Add to every `*.json` file                   |
| Layout direction wrong           | Forgot to add to `RTL_LOCALES`            | Update `src/core/i18n.js`                    |

## See also

- [docs/locale-guide.md](../locale-guide.md) — architecture and runtime contract.
- [scripts/check-i18n-parity.mjs](../../scripts/check-i18n-parity.mjs) — parity guard source.

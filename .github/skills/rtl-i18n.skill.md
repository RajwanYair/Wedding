---
description: "RTL and i18n patterns for the Hebrew-first Wedding Manager UI."
---

# Skill: RTL + i18n

## Document Direction

The app is RTL-first. `index.html` has `dir="rtl" lang="he"`. English is a secondary toggle.

- Never hard-code `left`/`right` in CSS — use `inset-inline-start` / `inset-inline-end`.
- Use `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`.
- Use `text-align: start` not `text-align: right`.
- Icons that imply direction (arrows, carets) need RTL flips: `transform: scaleX(-1)` under `[dir="ltr"]`.

## Adding a New String

1. Add the key to `src/i18n/he.json` (Hebrew — required).
2. Add the same key to `src/i18n/en.json` (English — required).
3. Optionally add to `src/i18n/ar.json` and `src/i18n/ru.json`.
4. In HTML: `<span data-i18n="myKey"></span>`.
5. In JS: `t('myKey')` — imported from `src/core/i18n.js`.
6. Run `npm run check:i18n` to verify parity across all locale files.

## Plurals

Use ICU message format for plurals:

```json
{ "guestCount": "{count, plural, one {אורח אחד} other {{count} אורחים}}" }
```

In JS: `t('guestCount', { count: n })`.

## Date / Number Formatting

- Dates: always `Asia/Jerusalem` timezone via `Intl.DateTimeFormat`.
- Numbers: use `Intl.NumberFormat` with locale from the active language store key.
- Phone: `cleanPhone(raw)` from `src/utils/phone.js` — converts `05X` → `+972`.

## Language Toggle

- Active locale stored in `localStorage` as `wedding_v1_lang`.
- `src/core/i18n.js` exposes `setLocale(lang)` and `t(key, vars?)`.
- Locale JSON files lazy-loaded on first switch (`ar`, `ru`); `he` and `en` bundled.

## Checklist Before Submitting

- [ ] All visible strings use `data-i18n` / `t()`.
- [ ] Both `he` + `en` entries added.
- [ ] No hardcoded Hebrew or English text in JS.
- [ ] CSS uses logical properties (no `left`/`right`).
- [ ] `npm run check:i18n` passes (0 missing keys).

---
applyTo: "**/*.html"
description: "Use when: editing the wedding app HTML file. Coding standards for HTML/CSS/JS, i18n, and data patterns."
---

# Wedding HTML Instructions — v1.0.0

## CSS Rules

- Use CSS custom properties defined in `:root` — never hardcode colors
- Variables: `--bg-primary`, `--bg-card`, `--accent`, `--gold`, `--rose`, `--text-primary`, `--text-secondary`, `--positive`, `--negative`, `--warning`
- 5 themes override all variables: `body.theme-{rosegold,gold,emerald,royal}` + default purple
- RTL layout: `dir="rtl"`, `lang="he"` — use `margin-right: auto` for accents
- Glassmorphism: `backdrop-filter: blur(16px)` on cards
- `prefers-reduced-motion`: disables all animations

## JavaScript Rules

- Cache DOM in `el` object — no repeated `getElementById`
- `textContent` for external data — never `innerHTML` with unsanitized content
- All user text must use i18n: `data-i18n` attribute on HTML, `t(key)` in JS
- ES2020+: async/await, `?.`, `??`
- localStorage with `wedding_v1_` prefix
- Phone numbers: `cleanPhone()` converts Israeli format to international

## i18n Rules

- Every visible string needs `data-i18n="key"` attribute
- Placeholders use `data-i18n-placeholder="key"`
- JS strings use `t('key')` function
- Both `he` and `en` translations in `I18N` object
- Language persisted in localStorage

## Data Model

```
Guest: { id, name, phone, count, status, group, tableId, notes, sent, createdAt }
Table: { id, name, capacity, shape }
WeddingInfo: { groom, bride, date, time, venue, address }
```

# GitHub Copilot Instructions — Wedding Manager v1.0.0

> Wedding management app · Hebrew RTL · RSVP · Table Seating · WhatsApp · Zero Dependencies

## Quick Facts

| Key | Value |
| --- | --- |
| Main file | `index.html` (HTML + CSS + JS) |
| Version | **v1.0.0** |
| Stack | HTML5, vanilla CSS3, vanilla JS (ES2020+) |
| Dependencies | Zero — no npm, no build, no frameworks |
| Language | Hebrew RTL (primary), English (toggle) |
| Tests | `node --test tests/wedding.test.mjs` |
| SW | `sw.js` v1.0.0 — APP_SHELL cache + offline fallback |
| Release | `index.html` + `sw.js` + `manifest.json` + `icon.svg` |

## Mandatory Rules

1. No npm/build tools — zero-dependency project
2. No external JS/CSS libraries or CDNs
3. No hardcoded colors — use CSS custom properties (`--accent`, etc.)
4. No `innerHTML` with unsanitized data — use `textContent`
5. DOM refs cached in `el` object — no repeated `getElementById`
6. All data persisted in `localStorage` (prefix `wedding_v1_`)
7. All user-facing text must use i18n system (`data-i18n` / `t()`)
8. Support Hebrew (RTL) and English (LTR) with toggle button
9. 5 themes: default purple, rose gold, classic gold, emerald, royal blue
10. WhatsApp integration via `wa.me` deep links (no API needed)
11. RSVP is client-side with localStorage (no backend required)
12. All dates use `Asia/Jerusalem` timezone formatting
13. Guests, tables, wedding info stored in localStorage as JSON

## Features

| Feature | Description |
| --- | --- |
| Dashboard | Stats overview, countdown, progress bars, quick actions |
| Guests | CRUD guest list with search, filter by status, group tags |
| Tables | Visual seating floor plan, drag-and-drop guest assignment |
| Invitation | SVG auto-generated invitation + custom image upload (JPG/PNG/SVG) |
| WhatsApp | Message template with placeholders, bulk/individual send via wa.me |
| RSVP | Public-facing form for guest self-registration, auto-match existing |
| Export | CSV export with UTF-8 BOM for Hebrew, print-friendly layout |
| i18n | Full Hebrew/English support with `data-i18n` attributes |
| Themes | 5 elegant wedding themes via CSS custom properties |
| PWA | Installable, offline-capable via Service Worker |

## CSS Architecture

- Glassmorphism: `backdrop-filter: blur(16px)` on cards
- CSS custom properties for all colors (5 theme variants)
- RTL-first layout: `dir="rtl"`, `lang="he"`
- Responsive: 3 breakpoints (768px, 480px)
- Print stylesheet hides UI chrome
- `prefers-reduced-motion` disables all animations

## Version Bump Checklist

1. `index.html` — version span + comment block
2. `sw.js` — `CACHE_NAME`
3. `CHANGELOG.md` — full entry
4. `README.md` — badge
5. `package.json` — version
6. `tests/wedding.test.mjs` — version assertion
7. Run: `node --test tests/wedding.test.mjs` — 0 fail
8. `git tag vX.Y.Z` + push

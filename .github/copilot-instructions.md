# GitHub Copilot Instructions — Wedding Manager v1.2.0

> Modular wedding app · Hebrew RTL · RSVP · Tables · WhatsApp · Zero Runtime Dependencies

## Quick Facts

| Key | Value |
| --- | --- |
| Main file | `index.html` (HTML shell) + `css/` (6 files) + `js/` (17 files) |
| Version | **v1.2.0** |
| Stack | HTML5, vanilla CSS3, vanilla JS (ES2020+) |
| Runtime deps | Zero — devDeps for lint only |
| Language | Hebrew RTL (primary), English (toggle) |
| Tests | `node --test tests/wedding.test.mjs` |
| Lint | `npm run lint` → 0 errors, 0 warnings |
| SW | `sw.js` — APP_SHELL cache + offline fallback |

## File Structure

```text
Wedding/
├── index.html            # HTML shell (links CSS + JS)
├── css/                  # 6 CSS modules (variables, base, layout, components, responsive, auth)
├── js/                   # 17 JS modules (config, i18n, dom, state, utils, ui, nav, dashboard,
│                         #   guests, tables, invitation, whatsapp, rsvp, settings, sheets, auth, app)
├── sw.js / manifest.json / icon.svg / invitation.jpg
├── package.json          # devDeps: eslint, stylelint, htmlhint, markdownlint-cli2
├── eslint.config.mjs / .stylelintrc.json / .htmlhintrc / .markdownlint.json
├── tests/wedding.test.mjs
└── .github/ → copilot-instructions.md, instructions/, prompts/, agents/, workflows/
```

## Mandatory Rules

1. No external JS/CSS libs or CDNs
2. No hardcoded colors — CSS custom properties only (`--accent`, `--bg-primary`, etc.)
3. No `innerHTML` with unsanitized data — use `textContent`
4. DOM refs cached in `el` object — no `getElementById` repeats
5. All data in `localStorage` with `wedding_v1_` prefix (JSON)
6. All visible strings: `data-i18n="key"` on HTML, `t('key')` in JS — both `he`/`en` keys required
7. Dates use `Asia/Jerusalem` timezone
8. Phone: `cleanPhone()` converts Israeli `05X` → international `+972`
9. After any edit: `npm run lint` must pass (0 errors, 0 warnings)

## Guest Data Model (v1.1.0)

```text
Guest: {
  id, firstName, lastName, phone, email,
  count, children,
  status: 'pending'|'confirmed'|'declined'|'maybe',
  side:   'groom'|'bride'|'mutual',
  group:  'family'|'friends'|'work'|'other',
  relationship, meal: 'regular'|'vegetarian'|'vegan'|'gluten_free'|'kosher',
  mealNotes, accessibility: boolean,
  tableId, gift, notes, sent: boolean,
  rsvpDate, createdAt, updatedAt
}
Table: { id, name, capacity, shape: 'round'|'rect' }
WeddingInfo: { groom, bride, date, time, venue, address }
```

## Features

| Feature | Description |
| --- | --- |
| Dashboard | Stats, countdown, progress, quick actions |
| Guests | CRUD, search, filter by status/side/group, sort |
| Tables | Visual floor plan, drag-and-drop seating |
| Invitation | SVG auto-generated + custom image upload (JPG/PNG/SVG) |
| WhatsApp | Template placeholders, bulk/individual `wa.me` send |
| RSVP | Public form, auto-match existing guest by phone/name |
| Export | CSV UTF-8 BOM for Hebrew, print stylesheet |
| Themes | 5 CSS-var themes (purple, rose gold, gold, emerald, royal blue) |
| PWA | Installable, offline-first via Service Worker |

## CSS Architecture

- Glassmorphism: `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px)`
- 5 themes: `body.theme-{rosegold,gold,emerald,royal}` + default purple
- RTL-first: `dir="rtl"`, `lang="he"` — `margin-right: auto` for LTR accents
- Breakpoints: 768px, 480px
- `prefers-reduced-motion`: disables all animations

## Version Bump Checklist

1. `index.html` — version span + comment block
2. `sw.js` — `CACHE_NAME`
3. `CHANGELOG.md` — full entry
4. `README.md` — badge
5. `package.json` — version
6. `tests/wedding.test.mjs` — version assertion
7. Run: `node --test tests/wedding.test.mjs` + `npm run lint` — 0 fail, 0 warn
8. `git tag vX.Y.Z` + push

## Known Gotchas (AI Reference)

### ESLint — `varsIgnorePattern`

`index.html` onclick= handlers call functions defined in `<script>` scope. ESLint sees them as unused. The `eslint.config.mjs` uses `varsIgnorePattern` — do not remove it.

### Stylelint — Font Keywords

Font family keywords must be lowercase: `tahoma` ✅ `Tahoma` ❌. Multi-word names must be quoted: `"Segoe UI"` ✅.

### GitHub Actions Versions

Only these versions are verified to exist:

| Action | Version |
| --- | --- |
| `actions/checkout` | `@v4` |
| `actions/setup-node` | `@v4` |
| `actions/upload-pages-artifact` | `@v3` |
| `actions/deploy-pages` | `@v4` |
| `actions/upload-artifact` | `@v4` |

Do NOT use `@v5` or `@v6` — they do not exist for most actions.

### markdownlint — CHANGELOG

`CHANGELOG.md` uses `### Added` in multiple versions. This triggers `MD024` (duplicate headings). The `.markdownlint.json` sets `"MD024": { "siblings_only": true }` — do not remove it.

### Instructions `applyTo`

Never set `applyTo: "**"` — this loads the instruction on every file type and wastes AI context tokens. Always scope to a specific file glob (`**/*.html`, `**/*.yml`).

---
applyTo: "src/**/*.js,scripts/**/*.mjs"
---

# JavaScript Conventions — Wedding Manager

## Module System

- Pure ESM (`"type": "module"` in package.json). No `require()`, no `module.exports`.
- Every file starts with a JSDoc block comment describing purpose and sprint tag.
- Imports are grouped: (1) Node built-ins, (2) local `../core/`, (3) local `../services/`, (4) local `../utils/`, (5) local `../sections/`.

## Safety Rules

- **Never use `innerHTML`** with unsanitized data. Use `textContent` for text, or `sanitize()` from `src/utils/sanitize.js` before DOM insertion.
- **No `eval()`**, `Function()`, or dynamic `import()` outside `src/core/nav.js` and `src/core/template-loader.js`.
- All user-facing strings: use `t('key')` from `src/core/i18n.js`. Never hardcode display text.
- All DOM refs: use the `el` object from `src/core/dom.js`. No inline `getElementById` in section modules.

## Data & State

- All persistent data lives in `localStorage` with `wedding_v1_` prefix. Use `storeGet`/`storeSet` from `src/core/store.js`.
- Cross-module communication: store subscriptions via `storeSubscribe()`. Do NOT import section modules into other section modules.
- Sheets writes: `enqueueWrite('key', fn)` only. Never call `syncStoreKeyToSheets` directly from sections.

## Section Module Contract

Every section file in `src/sections/` must export:

- `mount()` — called when section becomes active; registers store subscriptions; returns nothing
- `unmount()` — cleans up subscriptions and timers
- `render*()` — one or more render functions called internally and via namespace from `src/main.js`

## Naming

- Functions: `camelCase`. Classes: `PascalCase`. Constants: `UPPER_SNAKE_CASE`.
- Private helpers (not exported): prefix with `_`, e.g. `_buildRow()`.
- Exported section render functions: `render` + PascalCase section name, e.g. `renderDashboard()`.

## Error Handling

- Use `try/catch` only at I/O boundaries (Sheets sync, Supabase calls, fetch).
- Log errors with `logError(context, err)` from `src/services/audit.js`, not bare `console.error`.
- User-facing failures: `showToast(t('error_key'), 'error')`.

## Phone Numbers

- Always normalize via `cleanPhone()` from `src/utils/phone.js` before storage or WhatsApp links.
- Israeli mobile: `05X-XXX-XXXX` → `972XXXXXXXXX` (no `+`).

## Dates

- All date operations use `Asia/Jerusalem` timezone.
- Use `formatDate()` / `formatDateHe()` from `src/utils/date.js`. Never use `toLocaleDateString` directly.

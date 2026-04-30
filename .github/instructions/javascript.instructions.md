---
applyTo: "src/**/*.js,scripts/**/*.mjs"
---

# JavaScript Conventions — Wedding Manager

## Module System

- Pure ESM (`"type": "module"` in package.json). No `require()`, no `module.exports`.
- Every file starts with a JSDoc `/** @file ... */` block describing purpose and sprint tag.
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

## Architecture Layers

```text
src/sections/       — UI mount/unmount/render only; no direct data access
src/handlers/       — data-action dispatch; thin glue between UI and services
src/repositories/   — CRUD helpers; the only place raw store arrays are mutated
src/services/       — business logic (auth, sheets, seating, commerce …)
src/core/           — store, nav, i18n, events, config, dom (shared infrastructure)
```

- Section modules **must not** call repository functions directly — go via handlers.
- Repository functions **must not** call section render functions — mutations trigger reactivity via `storeSet`.

## Section Module Contract

Every section file in `src/sections/` must export:

- `mount()` — called when section becomes active; registers store subscriptions; returns nothing
- `unmount()` — cleans up subscriptions and timers; must not throw
- `render*()` — one or more render functions called internally and via namespace from `src/main.js`

```js
const _unsubs = [];

export function mount() {
  _unsubs.push(storeSubscribe('guests', renderGuests));
  renderGuests();
}

export function unmount() {
  _unsubs.forEach(fn => fn());
  _unsubs.length = 0;
}
```

## Input Validation

Use `sanitize(input, schema)` from `src/utils/sanitize.js` (backed by `valibot`) for all user-supplied inputs:

```js
import { sanitize } from '../utils/sanitize.js';
const { value, errors } = sanitize(rawPhone, { type: 'string', minLength: 7 });
if (errors.length) return showError(errors);
```

Never roll your own validation. All schemas live in `src/utils/sanitize.js`.

## Naming

- Functions: `camelCase`. Classes: `PascalCase`. Constants: `UPPER_SNAKE_CASE`.
- Private helpers (not exported): prefix with `_`, e.g. `_buildRow()`.
- Exported section render functions: `render` + PascalCase section name, e.g. `renderDashboard()`.
- Handler files: `<domain>-handlers.js`, e.g. `guest-handlers.js`.
- Repository files: `<domain>-repo.js`, e.g. `guest-repo.js`.

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

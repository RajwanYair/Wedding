---
applyTo: "src/utils/**/*.js"
description: "Utility helper conventions for src/utils/*.js — pure functions, JSDoc, test pairing."
---

# Utility Helper Conventions — Wedding Manager

## What Belongs in `src/utils/`

Pure, stateless helper functions with **no** side-effects. Utilities must not:

- Access the DOM
- Read/write `localStorage` or the store
- Make network requests
- Import from `src/sections/`, `src/services/`, or `src/core/` (except types)

## Required JSDoc Headers

Every utility file must start with:

```js
/**
 * src/utils/<name>.js — brief purpose (sprint tag)
 *
 * @module <name>
 * @owner <domain>   // e.g. guest | vendor-crm | rsvp | checkin | calendar | plugin-runtime
 */
```

Valid `@owner` values match Phase C domains: `guest`, `vendor-crm`, `rsvp`, `checkin`, `calendar`, `plugin-runtime`, `whatsapp`, `analytics`.

## ID Counters for Testability

When a util generates sequential IDs, use a module-level counter with a reset export:

```js
let _idCounter = 0;

/** Reset ID counter — testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

export function createFoo(name) {
  return { id: `foo_${++_idCounter}`, name };
}
```

In tests: call `resetIdCounter()` in `beforeEach()`.

## Immutable Patterns

Return new objects — never mutate the input:

```js
// ✅
export function setStatus(item, status) {
  return { ...item, status };
}

// ✗ — mutates input
export function setStatus(item, status) {
  item.status = status;
  return item;
}
```

## Test File Pairing

Every utility file `src/utils/<name>.js` **must** have a matching test file:

- `tests/unit/<name>.test.mjs`
- Import with `import { ... } from "../../src/utils/<name>.js"`
- Cover: happy path, edge cases (null/empty/boundary), and each exported function

Test file must **not** use `// @vitest-environment happy-dom` — utils are DOM-free.

## Naming Conflicts

Before creating a new utility, check for an existing file:

```bash
Get-ChildItem src/utils -Filter "*.js" | Select-Object Name
```

If a file for the domain already exists (e.g., `vendor-sla.js`), extend it rather than creating a duplicate.

## Lint Requirements

- No `let` when `const` is possible (`prefer-const`).
- No unused imports or exports (`no-unused-vars`, `^_` prefix to intentionally ignore).
- No `console.*` calls (use caller-side logging).
- Run `npx eslint src/utils/<name>.js` before committing — must exit 0.

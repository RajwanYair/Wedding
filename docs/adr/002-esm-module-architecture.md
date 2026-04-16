# ADR-002: ESM Module Architecture

**Status:** Accepted
**Date:** 2025-01-15
**Context:** Wedding Manager v5 migration from legacy `js/` to `src/`

## Decision

All active source code uses ES modules (`import`/`export`) with Vite as the build tool.
Legacy code in `js/` is preserved for backward compatibility but excluded from linting.

## Rationale

- Native browser module support (no bundler required for dev)
- Tree-shaking via Vite reduces bundle size
- Clear dependency graph — no implicit globals
- Section modules follow mount/unmount lifecycle for clean teardown

## Module Patterns

- **Sections** (`src/sections/*.js`): Export `mount(container)` and `unmount()`
- **Core** (`src/core/*.js`): Shared utilities (store, events, i18n, dom)
- **Services** (`src/services/*.js`): External integrations (auth, sheets, supabase)
- **Utils** (`src/utils/*.js`): Pure helpers (phone, date, sanitize)

## Section Lifecycle

```js
export function mount(container) {
  // Subscribe to store, render initial state, bind events
  _unsubs.push(storeSubscribe("key", renderFn));
  renderFn();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}
```

## Consequences

- `js/` folder is dead code but kept for reference
- All cross-module communication goes through `src/core/store.js`
- Event delegation via `data-action` attributes + `src/core/events.js`

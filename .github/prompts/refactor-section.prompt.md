---
mode: agent
description: Refactor a section module to follow the current section contract
---

# Refactor Section

Refactor the section `${input:sectionName}` (`src/sections/${input:sectionName}.js`) to conform to the current section module contract.

## Section Module Contract

Every section must:

### Exports
```js
export function mount() { /* ... */ }    // required
export function unmount() { /* ... */ }  // required
export function render<Name>() { /* ... */ }  // at least one render fn
```

### `mount()` Pattern
```js
const _unsubs = [];

export function mount() {
  _unsubs.push(storeSubscribe('relevantKey', renderSection));
  renderSection();
}
```

### `unmount()` Pattern
```js
export function unmount() {
  _unsubs.forEach(fn => fn());
  _unsubs.length = 0;
  // cancel any pending timers
}
```

## Checklist

- [ ] `mount()` exported and registers all store subscriptions
- [ ] `unmount()` cleans up all subscriptions and timers
- [ ] No direct `getElementById` — uses `el` from `src/core/dom.js`
- [ ] No `innerHTML` with unsanitized data — uses `textContent` or `sanitize()`
- [ ] All user-facing strings use `t('key')` with `data-i18n` on HTML elements
- [ ] All Sheets writes via `enqueueWrite(key, fn)` only
- [ ] Section does NOT import other section modules
- [ ] All event wiring via `data-action` attribute (no inline `addEventListener` on static HTML)
- [ ] Private helpers prefixed with `_`

## After Refactoring

```bash
npm run lint && npm test
```

Both must exit 0. Commit:
```
refactor(<sectionName>): align section to mount/unmount/render contract
```

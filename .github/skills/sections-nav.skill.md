---
description: "Section module lifecycle, template loading, and navigation patterns."
---

# Skill: Sections & Navigation

## Section Lifecycle

Every section in `src/sections/<name>.js` must export:

```js
export function mount(container) { /* setup */ }
export function unmount() { /* cleanup */ }
export function render<Name>() { /* re-render */ }
```

## mount() Contract

1. Load template: `const html = await loadTemplate('<name>');`
2. Insert into container: `container.innerHTML = html;` (templates are trusted — pre-sanitized)
3. Cache DOM refs in `el` object: `el.list = container.querySelector('[data-ref="list"]');`
4. Subscribe to store: `_unsubs.push(storeSubscribe('key', renderFn));`
5. Register actions: `on('sectionName:action', handler);`

## unmount() Contract

1. Unsubscribe all: `_unsubs.forEach(fn => fn()); _unsubs = [];`
2. Null refs: `el = {};`
3. Clear timers/intervals if any

## Navigation

`src/core/nav.js` manages section transitions:

- `navigateTo(sectionId)` — unmounts current, mounts target
- `PUBLIC_SECTIONS` — sections accessible without auth
- Keyboard: `Alt+1–9` for quick section switching
- Command palette: `Ctrl+K` opens fuzzy section search

## Template Loading

`src/core/template-loader.js`:

```js
const html = await loadTemplate('guests'); // loads src/templates/guests.html
```

- Templates are lazy-loaded and cached after first fetch
- Use `data-i18n="key"` for all visible strings
- Use `data-action="section:action"` for interactive elements
- Use `data-ref="name"` for programmatic element references

## Section List

Canonical list in `src/core/constants.js` → `SECTION_LIST`:

```text
landing · dashboard · guests · tables · invitation · whatsapp · rsvp
budget · analytics · timeline · gallery · checkin · settings · changelog
```

Extra sections (not in nav): `vendors`, `expenses`

## Adding a Section

1. Create `src/sections/<name>.js` with lifecycle exports
2. Create `src/templates/<name>.html`
3. Add to `SECTION_LIST` in constants
4. Import in `src/main.js`
5. Add i18n keys (he + en)
6. Create handler in `src/handlers/` if needed

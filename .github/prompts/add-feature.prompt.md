---
mode: agent
description: "Scaffold a new feature section in the wedding app."
---

# Add Feature — Wedding Manager

Scaffold a new feature using the current modular architecture. Ask the user what feature to add if not already specified.

## Checklist

- [ ] Read `src/core/constants.js` and a similar `src/sections/` module before editing
- [ ] Create `src/templates/{name}.html` with `data-i18n` on all visible strings
- [ ] Create `src/sections/{name}.js` with `mount()`, `unmount()`, and `render{Name}()` exports
- [ ] If new CRUD data: create `src/repositories/{name}-repo.js` with `create`, `read`, `update`, `delete` helpers
- [ ] If new data-action handlers: create or extend `src/handlers/{domain}-handlers.js`
- [ ] Add `{NAME}: '{name}'` to `SECTION_LIST` or `EXTRA_SECTIONS` in `src/core/constants.js`
- [ ] Import as namespace in `src/main.js`: `import * as {Name}Section from "./sections/{name}.js"`
- [ ] Add `he` + `en` keys to `src/i18n/he.json` and `src/i18n/en.json`; run `npm run check:i18n`
- [ ] Persist any new data in `localStorage` with `wedding_v1_` prefix via `storeGet`/`storeSet`
- [ ] Validate all user inputs via `sanitize(input, schema)` from `src/utils/sanitize.js`
- [ ] Use `textContent` — never `innerHTML` with dynamic data
- [ ] Add responsive styles inside `@scope` block in `css/components.css`
- [ ] Add unit test file `tests/unit/{name}.test.mjs` covering exported helpers
- [ ] Run `npm run lint && npm test` — both must exit 0 before finishing

---
agent: agent
description: "Scaffold a new feature section in the wedding app."
---

# Add Feature — Wedding Manager

Scaffold a new feature using the current modular architecture. Ask the user what feature to add if not already specified.

## Checklist

- [ ] Read `src/core/nav.js`, `src/core/section-resolver.js`, and a similar `src/sections/` module before editing
- [ ] Create or update `src/templates/{name}.html` and `src/sections/{name}.js` with mount/unmount lifecycle
- [ ] Register the section through the current nav/section registry path instead of legacy inline handlers
- [ ] Add translation keys to `src/i18n/he.json`, `src/i18n/en.json`, and mirror them in the other locale files when needed
- [ ] Persist any new data in `localStorage` with `wedding_v1_` prefix
- [ ] Use `textContent` — never `innerHTML` with dynamic data
- [ ] Add responsive styles at `768px` and `480px` breakpoints
- [ ] Run `npm run lint` — must exit 0 before finishing

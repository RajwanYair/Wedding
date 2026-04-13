---
mode: agent
description: "Scaffold a new feature section in the wedding app."
---

# Add Feature — Wedding Manager

Scaffold a new feature section in `index.html`. Ask the user what feature to add if not already specified.

## Checklist

- [ ] Read `index.html` to understand existing section/nav patterns
- [ ] Add nav tab: icon + `data-i18n` label, `onclick="showSection('{name}')"`
- [ ] Add `<section class="section" id="sec-{name}">` with a glassmorphism card
- [ ] Add `he` and `en` translation keys to the `I18N` object (both languages)
- [ ] Persist any new data in `localStorage` with `wedding_v1_` prefix
- [ ] Use `textContent` — never `innerHTML` with dynamic data
- [ ] Add responsive styles at `768px` and `480px` breakpoints
- [ ] Run `npm run lint` — must exit 0 before finishing

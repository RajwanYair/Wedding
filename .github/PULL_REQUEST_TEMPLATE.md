# Pull Request

## Description

<!-- A brief description of the changes in this PR. Link the related issue: Closes #N -->

## Type of Change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💄 UI/UX improvement
- [ ] 📝 Documentation
- [ ] ⚙️ CI/CD / tooling
- [ ] ♻️ Refactoring
- [ ] 🔒 Security hardening
- [ ] ⚡ Performance improvement

## Checklist

### Functionality

- [ ] Tested in browser — Hebrew RTL + English LTR
- [ ] All 5 themes render correctly (default / rose-gold / gold / emerald / royal)
- [ ] Responsive at 768 px and 480 px
- [ ] Auth guard respected (admin-only sections blocked for guests)

### Code Quality

- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npm test` passes (2385+ tests, 147 suites)
- [ ] No `innerHTML` with unsanitized data — `textContent` only
- [ ] No hardcoded colors — CSS custom properties only
- [ ] No inline `getElementById` — `el` object only

### i18n

- [ ] All new visible strings: `data-i18n="key"` in HTML, `t('key')` in JS
- [ ] Both Hebrew (`he`) and English (`en`) translations added

### If new JS added

- [ ] `// @ts-check` header present
- [ ] `'use strict'` present
- [ ] Function registered via `data-action` or via `window.xxx` for cross-module calls

### If CSS changed

- [ ] Inside correct `@layer` block
- [ ] Font keywords lowercase (`tahoma` not `Tahoma`)
- [ ] Multi-word fonts quoted (`"Segoe UI"`)

### Version bump (if releasing)

- [ ] `src/core/config.js`, `public/sw.js`, `package.json`, `tests/wedding.test.mjs` updated
- [ ] `CHANGELOG.md` new entry added

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
- [ ] `npm test` passes (4187+ tests, 269 files, 0 Node warnings)
- [ ] No `innerHTML` with unsanitized data — `textContent` or `sanitize()` only
- [ ] No hardcoded colors — CSS custom properties only
- [ ] No inline `getElementById` — `el` object only
- [ ] New exports have corresponding unit tests

### i18n

- [ ] All new visible strings: `data-i18n="key"` in HTML, `t('key')` in JS
- [ ] Both Hebrew (`he`) and English (`en`) translations added

### If new JS added

- [ ] Section exports `mount()`, `unmount()`, and `render*()` if it's a section module
- [ ] User inputs validated via `sanitize(input, schema)` from `src/utils/sanitize.js`
- [ ] New data domain has a repository file `src/repositories/<domain>-repo.js`

### If CSS changed

- [ ] Inside correct `@layer` block
- [ ] Section-scoped styles wrapped in `@scope ([data-section="{name}"])` block
- [ ] Font keywords lowercase (`tahoma` not `Tahoma`)
- [ ] Multi-word fonts quoted (`"Segoe UI"`)

### Version bump (if releasing)

- [ ] `package.json` + `src/core/config.js` bumped, then `npm run sync:version` run
- [ ] `CHANGELOG.md` new entry added
- [ ] `README.md` test-count badge updated

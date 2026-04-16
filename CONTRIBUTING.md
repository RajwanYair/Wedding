# Contributing to Wedding Manager

Thank you for considering contributing! This guide covers the development workflow.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/RajwanYair/Wedding.git
cd Wedding

# Install shared dependencies (one-time)
cd ../MyScripts && npm install && cd Wedding

# Run tests
npm test              # 1000+ unit tests — must all pass
npm run lint          # HTML + CSS + JS + Markdown — 0 errors, 0 warnings

# Start dev server
npm run dev           # Vite dev server at http://localhost:5173/Wedding/
```

## Project Structure

```
src/              # ES module source — Vite entry
  core/           # Foundation: store, events, nav, i18n, ui, dom
  sections/       # One module per app section
  services/       # External services: auth, sheets
  utils/          # Pure utilities: phone, date, sanitize, misc
  templates/      # Lazy HTML templates (one per section)
  modals/         # Modal HTML fragments
css/              # 7 CSS modules with @layer cascade
tests/
  unit/           # Vitest unit + integration tests (happy-dom)
  e2e/            # Playwright E2E + visual regression
```

## Development Rules

1. **No `innerHTML` with untrusted data** — use `textContent` only
2. **Every string visible to users**: `data-i18n="key"` (HTML) + `t('key')` (JS) — both `he` and `en` required
3. **All colors via CSS custom properties** — never hardcode hex/rgb
4. **Zero runtime deps** — no npm packages loaded at runtime
5. **Named exports only** — no `window.*` assignments in `src/`
6. **`sanitize(input, schema)`** for all user input validation at boundaries

## Adding a Feature

1. Pick the relevant `src/sections/` module (or create one)
2. Export named functions — no default exports
3. Register any new `data-action` handlers in `src/main.js`
4. Add i18n keys to both `src/i18n/he.json` and `src/i18n/en.json`
5. Add unit tests in `tests/unit/`
6. Add content tests in `tests/wedding.test.mjs`
7. Run `npm run lint && npm test` — must exit 0

## Test Requirements

- **Every new feature** gets at least 2 unit tests
- **DOM interactions** use `@vitest-environment happy-dom`
- **E2E** for user-facing flows — add to `tests/e2e/smoke.spec.mjs`
- Test count in `tests/wedding.test.mjs` header comment must stay current

## Commit Convention

```
type(scope): short description

feat(guests): add accessibility labels to guest table rows
fix(sheets): handle empty response from Apps Script
test(nav): add swipe debounce coverage
docs(readme): update architecture diagram
```

Types: `feat` · `fix` · `test` · `docs` · `chore` · `refactor` · `perf`

## Pull Request Checklist

- [ ] `npm run lint` exits 0 (0 errors, 0 warnings)
- [ ] `npm test` exits 0 (all tests pass)
- [ ] i18n keys added to both `he.json` and `en.json`
- [ ] Unit tests for new logic
- [ ] No `innerHTML` with unsanitized data
- [ ] No hardcoded colors (use CSS vars)
- [ ] No new runtime dependencies

## Review Process

PRs require at least one review approval and all CI checks to pass before merging.
The CI runs: lint → type check → unit tests → Vite build → coverage → security scan → bundle size.

## Tutorial: Adding a New Section

Follow these steps to add a new section (e.g. "gifts"):

### 1. Create the template

Create `src/templates/gifts.html` with your section's HTML:

```html
<div class="section-content">
  <div class="card">
    <div class="card-header">
      <span class="icon">🎁</span>
      <span data-i18n="gifts_title">מתנות</span>
    </div>
    <div id="giftsList"></div>
  </div>
</div>
```

### 2. Create the section module

Create `src/sections/gifts.js` with mount/unmount lifecycle:

```js
import { storeGet, storeSubscribe } from "../core/store.js";
import { t } from "../core/i18n.js";

const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", _render));
  _render();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

function _render() {
  const el = document.getElementById("giftsList");
  if (!el) return;
  // Render your section content here using textContent (never innerHTML with user data)
}
```

### 3. Add i18n keys

Add keys to all 4 locale files:

- `src/i18n/he.json` — Hebrew translations
- `src/i18n/en.json` — English translations
- `js/i18n/he.json` — Legacy Hebrew
- `js/i18n/en.json` — Legacy English

### 4. Register navigation

Add your section to the nav list in `src/core/nav.js` and the sidebar in `index.html`.

### 5. Test and lint

```bash
npm run lint   # Must exit 0
npm test       # All tests must pass
```

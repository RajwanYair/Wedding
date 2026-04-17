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
npm test              # 1957+ unit tests — must all pass
npm run lint          # HTML + CSS + JS + Markdown — 0 errors, 0 warnings

# Start dev server
npm run dev           # Vite dev server at http://localhost:5173/Wedding/
```

## Project Structure

```
src/              # ES module source — Vite entry
  core/           # Foundation: store, events, nav, i18n, ui, dom, config, constants
  handlers/       # Action handler registration (~7 files)
  sections/       # One module per app section (~20 modules)
  services/       # External services: auth, sheets, supabase, backend, presence
  utils/          # Pure utilities: phone, date, sanitize, misc, form-helpers
  plugins/        # Optional plugins: contact, gallery, registry
  templates/      # Lazy HTML templates (one per section)
  modals/         # Modal HTML fragments
css/              # 7 CSS modules with @layer cascade
supabase/
  migrations/     # SQL migration files
  functions/      # Edge Functions
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
7. **Action registry** — add any new `data-action` value to `src/core/action-registry.js` (ACTIONS constant)
8. **Constants** — new enums, section names, and storage keys go in `src/core/constants.js`

## Adding a Feature

1. Pick the relevant `src/sections/` module (or create one)
2. Export named functions — no default exports
3. Add new `data-action` constant to `ACTIONS` in `src/core/action-registry.js`
4. Register handler in the relevant `src/handlers/*.js` file
5. Add i18n keys to both `src/i18n/he.json` and `src/i18n/en.json`
5. Add unit tests in `tests/unit/`
6. Add content tests in `tests/wedding.test.mjs`
7. Run `npm run lint && npm test` — must exit 0

## Repository Pattern (Supabase)

Database access uses typed repository classes.  Never call `supabase.from()`
directly in section/handler code — always go through a repository.

```text
src/repositories/
  supabase-base-repository.js   ← extend this for new tables
  supabase-guest-repository.js
  supabase-table-repository.js
  supabase-vendor-repository.js
  supabase-expense-repository.js
  supabase-rsvp-log-repository.js
```

**Mock pattern for repository tests** — use the flat chainable mock
defined in `tests/unit/supabase-repositories.test.mjs`:

```js
function makeSupabase(rows = [], singleRow = null) {
  const chain = {};
  const methods = ["select","insert","upsert","update","eq","is","ilike",
                   "lt","or","order","not","neq","gte","lte","gt"];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.single      = vi.fn().mockResolvedValue({ data: singleRow, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: singleRow, error: null });
  chain.then = (resolve) => Promise.resolve({ data: rows, error: null }).then(resolve);
  return { from: vi.fn().mockReturnValue(chain) };
}
```

## Security Checklist for New Features

Before submitting a PR that touches auth, data persistence, or user input:

- [ ] No PII logged to `console.*` in production paths
- [ ] User input validated with `sanitize(input, schema)` at boundaries
- [ ] Rate-sensitive actions use `createRateLimiter` (see `src/services/rate-limiter.js`)
- [ ] New DB tables have RLS enabled — verify with `verifyRlsEnabled(supabase)`
- [ ] Audit-worthy actions logged via `createAuditPipeline` (see `src/services/audit-pipeline.js`)
- [ ] JWT claims checked before rendering admin UI (`hasRole`, `isTokenExpired`)

## Test File Naming Convention

| Type | Pattern | Location |
|------|---------|----------|
| Unit test | `{module-name}.test.mjs` | `tests/unit/` |
| Integration test | `{feature}-integration.test.mjs` | `tests/integration/` |
| Regression test | `{domain}-regression.test.mjs` | `tests/integration/` |
| E2E | `{flow}.spec.mjs` | `tests/e2e/` |

Note: if a test file name would clash with an existing file, prefix with the
source folder — e.g. `services-crypto.test.mjs` for `src/services/crypto.js`
(because `tests/unit/crypto.test.mjs` already exists for `src/utils/crypto.js`).

## CHANGELOG.md Format

Every sprint entry **must** follow this exact pattern — missing blank lines
cause Markdown lint failures:

```markdown
### Sprint N — Short title

- Deliverable 1
- Deliverable 2
```

The blank line before the bullet list is mandatory (MD022 / MD032).

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

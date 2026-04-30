---
applyTo: "tests/**"
---

# Test Conventions — Wedding Manager

## Framework & Runner

- **Vitest 4** for unit and integration tests (`npm test` = `vitest run --pool forks --no-warnings`).
- **Playwright** for E2E tests (`npm run test:e2e`); configs in `playwright.config.mjs`.
- Test files: `*.test.mjs` (unit/integration), `*.spec.mjs` (E2E).
- **Current suite**: **4187 tests** across **269 files** · 0 Node warnings.

## File Organization

```text
tests/
  wedding.test.mjs          — Repo sanity: version, structure, architecture assertions
  test-constants.mjs        — Shared test helpers and constants
  unit/                     — Unit tests per module (*.test.mjs)
  integration/              — Cross-module integration tests (*.integration.test.mjs)
  e2e/                      — Playwright: smoke.spec.mjs, visual.spec.mjs
  perf/                     — Performance benchmarks
```

## Naming Rules

- Unit test file: `tests/unit/<module>.test.mjs` matching the source file basename.
- Integration test file: `tests/unit/<domain>.integration.test.mjs`.
- Describe blocks: `describe('<ModuleName>', () => { ... })`.
- Test names: plain English describing the behavior. `it('<verb> <subject> when <condition>', ...)`.

## Section Name Constraints

- Use only sections from `SECTION_LIST` in `src/core/constants.js` for nav/routing tests.
- `SECTION_LIST` = `["landing","dashboard","guests","tables","invitation","whatsapp","rsvp","budget","analytics","timeline","gallery","checkin","settings","changelog"]`.
- `vendors` and `expenses` are in `EXTRA_SECTIONS` only — do NOT use them in navigation tests.

## Test Data

- Import shared fixtures from `tests/test-constants.mjs`.
- Always reset store state in `beforeEach` to avoid test cross-contamination.
- Use `vi.stubGlobal` / `vi.spyOn` for globals (localStorage, fetch, window.location).

## DOM Environment

- Tests use `happy-dom` (configured in `vite.config.js`).
- Add `// @vitest-environment happy-dom` as first comment when DOM is needed.
- Set `document.documentElement.lang = 'he'` and `dir = 'rtl'` when testing i18n.

## Mock Patterns

**constants.js** — must mock ALL exported names or Vitest throws:

```js
vi.mock("../../src/core/constants.js", () => ({
  STORAGE_KEYS: { GUESTS: "wedding_v1_guests" },
  GUEST_STATUSES: ["confirmed", "pending", "declined", "maybe"],
  GUEST_SIDES: ["groom", "bride", "mutual"],
  GUEST_GROUPS: ["family", "friends", "work", "neighbors", "other"],
  MEAL_TYPES: ["regular", "vegetarian", "vegan", "gluten_free", "kosher"],
  TABLE_SHAPES: ["round", "rect"],
  DATA_CLASS: Object.freeze({ PUBLIC: "public", GUEST_PRIVATE: "guest-private",
    ADMIN_SENSITIVE: "admin-sensitive", OPERATIONAL: "operational" }),
  STORE_DATA_CLASS: {},
  VENDOR_CATEGORIES: [], EXPENSE_CATEGORIES: [], MODALS: {},
  SECTION_LIST: [], EXTRA_SECTIONS: [], ALL_SECTIONS: [],
  PUBLIC_SECTIONS: new Set(), RSVP_RESPONSE_STATUSES: [],
}));
```

**config.js** — must include `STORAGE_PREFIX` at minimum:

```js
vi.mock("../../src/core/config.js", () => ({
  CDN_IMAGE_HOST: "",
  STORAGE_PREFIX: "wedding_v1_",
  APP_VERSION: "0.0.0",
  TOAST_DURATION_MS: 3000,
  DEBOUNCE_MS: 1500,
  ADMIN_EMAILS: [],
  BACKEND_TYPE: "sheets",
}));
```

**store.js** — use `_s` Map pattern for isolation:

```js
const _s = new Map();
vi.mock("../../src/core/store.js", () => ({
  storeGet: k => _s.get(k),
  storeSet: (k, v) => _s.set(k, v),
  storeSubscribe: vi.fn(() => () => {}),
}));
```

## Coverage Thresholds (ratchet floor — never lower)

| Scope | Lines | Branches | Functions | Statements |
| --- | --- | --- | --- | --- |
| Global | 58% | 51% | 66% | 58% |
| `src/utils/**` | 97% | 82% | 94% | 94% |
| `src/repositories/**` | 95% | 54% | 97% | 83% |
| `src/services/**` | 77% | 66% | 77% | 76% |
| `src/core/**` | 78% | 67% | 66% | 74% |
| `src/sections/**` | 29% | 27% | 43% | 29% |

Coverage is enforced in `vite.config.js` under `test.coverage.thresholds`. Raise floors after adding tests — never lower them.

## What NOT to Test

- Private `_` functions — test exported behavior only.
- Third-party SDK internals (Google GIS, FB JS SDK, AppleID SDK).
- Browser APIs directly (mock them).
- Vite build output.
- CSS computed styles.

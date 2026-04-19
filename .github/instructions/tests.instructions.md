---
applyTo: "tests/**"
---

# Test Conventions — Wedding Manager

## Framework & Runner

- **Vitest** for unit and integration tests (`npm test` = `vitest run --pool forks`).
- **Playwright** for E2E tests (`npm run test:e2e`); configs in `playwright.config.mjs`.
- Test files: `*.test.mjs` (unit/integration), `*.spec.mjs` (E2E).

## File Organization

```text
tests/
  unit/          # single-module unit tests
  integration/   # multi-module integration tests
  e2e/           # Playwright browser tests
  perf/          # performance benchmarks
  test-constants.mjs  # shared test data/constants
  wedding.test.mjs    # repo sanity + wiring checks
```

## Naming Rules

- Test files: `<module-name>.test.mjs` matching the source file basename.
- Describe blocks: `describe('<ModuleName>', () => { ... })`.
- Test names: plain English describing the behavior, not the implementation.
- Example: `it('returns 0 when no guests are confirmed', ...)` not `it('getConfirmed works', ...)`.

## Section Name Constraints

- Use only sections from `SECTION_LIST` in `src/core/nav.js` for nav/routing tests.
- `SECTION_LIST` = `["landing","dashboard","guests","tables","invitation","whatsapp","rsvp","budget","analytics","timeline","gallery","checkin","settings","changelog"]`.
- `vendors` and `expenses` are in `EXTRA_SECTIONS` only — do NOT use them in navigation tests.

## Test Data

- Import shared fixtures from `tests/test-constants.mjs`.
- Always reset store state in `beforeEach` to avoid test cross-contamination.
- Use `vi.stubGlobal` / `vi.spyOn` for globals (localStorage, fetch, window.location).

## DOM Environment

- Tests use `happy-dom` (configured in `vitest.config.js`).
- Set `document.documentElement.lang = 'he'` and `dir = 'rtl'` when testing i18n.

## Coverage

- Run with `npm run test:coverage`.
- Coverage thresholds: lines ≥ 80%, branches ≥ 75% (configured in `vitest.config.js`).

## What NOT to Test

- Do not test implementation details (private `_` functions) — test exported behavior.
- Do not duplicate E2E scenarios in unit tests.
- Do not mock `src/core/store.js` unless absolutely necessary — prefer real store with reset.

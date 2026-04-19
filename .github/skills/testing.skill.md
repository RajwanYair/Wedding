---
description: "Testing conventions and patterns for the Wedding Manager test suite."
---

# Skill: Testing

## Test Runner

Vitest 4 (`pool: forks`, `--no-warnings`). Run: `npm test`.

## File Organization

```text
tests/
  wedding.test.mjs          — Repo sanity: version, structure, architecture assertions
  test-constants.mjs        — Shared test helpers and constants
  unit/                     — Unit tests per module (*.test.mjs)
  integration/              — Cross-module integration tests (*.integration.test.mjs)
  e2e/                      — Playwright: smoke.spec.mjs, visual.spec.mjs
  perf/                     — Performance tests
```

## Naming Rules

- Unit test file: `tests/unit/<module>.test.mjs`.
- Integration test file: `tests/unit/<domain>.integration.test.mjs`.
- Test suite: `describe('<ModuleName>', () => { ... })`.
- Test case: `it('<verb> <subject> when <condition>', () => { ... })`.

## Section Names in Tests

The navigation section list is:

```js
[
  "landing",
  "dashboard",
  "guests",
  "tables",
  "invitation",
  "whatsapp",
  "rsvp",
  "budget",
  "analytics",
  "timeline",
  "gallery",
  "checkin",
  "settings",
  "changelog",
];
```

`vendors` and `expenses` are in `EXTRA_SECTIONS` — not in nav tests.

## DOM Environment

For tests needing DOM, use `happy-dom`:

```js
// @vitest-environment happy-dom
```

Add as first comment in the test file.

## Test Data

Use `tests/test-constants.mjs` for shared fixtures:

```js
import { MOCK_GUEST, MOCK_TABLE, MOCK_EVENT } from "../test-constants.mjs";
```

## What to Test

- Pure functions: full input/output coverage.
- Store mutations: before/after state, subscription callbacks called.
- Section `mount()`/`unmount()`: subscriptions registered/cleaned up.
- Sanitize: valid inputs pass, invalid inputs return `errors`.
- i18n: `t('key')` returns expected string for `he` + `en` locales.

## What NOT to Test

- Third-party SDK internals (Google GIS, FB JS SDK, AppleID SDK).
- Browser APIs directly (mock them).
- Vite build output.
- CSS computed styles.

## Assertions

Prefer `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.throws` from Node `assert`:

```js
import assert from "node:assert/strict";
```

Or Vitest's `expect()` — both are fine.

## Checklist

- [ ] New module has a corresponding `tests/unit/<module>.test.mjs`.
- [ ] New section exports tested: `mount()`, `unmount()`, at least one `render*()`.
- [ ] New i18n keys tested: `t('key')` returns non-empty string.
- [ ] `npm test` passes with 0 failures after your changes.
- [ ] No `it.only` / `describe.only` left in committed code.

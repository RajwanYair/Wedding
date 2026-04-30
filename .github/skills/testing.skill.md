---
description: "Testing conventions and patterns for the Wedding Manager test suite."
---

# Skill: Testing

## Test Runner

Vitest 4 (`pool: forks`, `--no-warnings`). Run: `npm test`.
Current suite: **4187 tests** across **269 files** · 0 Node warnings.

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
  "landing", "dashboard", "guests", "tables", "invitation",
  "whatsapp", "rsvp", "budget", "analytics", "timeline",
  "gallery", "checkin", "settings", "changelog",
];
```

`vendors` and `expenses` are in `EXTRA_SECTIONS` — not in nav tests.

## DOM Environment

For tests needing DOM, add as first comment:

```js
// @vitest-environment happy-dom
```

## Test Data

Use `tests/test-constants.mjs` for shared fixtures:

```js
import { MOCK_GUEST, MOCK_TABLE, MOCK_EVENT } from "../test-constants.mjs";
```

## Critical Mock Patterns

**constants.js** — must include ALL exports or Vitest throws "no X export is defined":

```js
vi.mock("../../src/core/constants.js", () => ({
  STORAGE_KEYS: { GUESTS: "wedding_v1_guests", ERRORS: "wedding_v1_errors" },
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

**store.js** — use `_s` Map for per-test isolation:

```js
const _s = new Map();
vi.mock("../../src/core/store.js", () => ({
  storeGet: k => _s.get(k),
  storeSet: (k, v) => _s.set(k, v),
  storeSubscribe: vi.fn(() => () => {}),
}));
// in beforeEach:
_s.clear();
```

**guests.js `_getSelectedIds()`** reads `dataset.guestId` (not `dataset.id`):

```js
const cb = document.createElement('input');
cb.type = 'checkbox';
cb.checked = true;
cb.dataset.guestId = '123'; // ← MUST be guestId, not id
```

## What to Test

- Pure functions: full input/output coverage.
- Store mutations: before/after state, subscription callbacks called.
- Section `mount()`/`unmount()`: subscriptions registered/cleaned up.
- Sanitize: valid inputs pass, invalid inputs return `errors`.
- i18n: `t('key')` returns expected string for `he` + `en` locales.
- Repository CRUD: create/read/update/delete with store stub.

## What NOT to Test

- Third-party SDK internals (Google GIS, FB JS SDK, AppleID SDK).
- Browser APIs directly (mock them).
- Vite build output or CSS computed styles.
- Private `_` functions — test exported behavior only.

## Assertions

Prefer `assert` from Node:

```js
import assert from "node:assert/strict";
```

Or Vitest’s `expect()` — do not mix both in the same file.

## Checklist

- [ ] New module has a corresponding `tests/unit/<module>.test.mjs`.
- [ ] `beforeEach` resets any store state mutated by tests.
- [ ] All mocked modules include every exported name.
- [ ] Coverage does not drop below the per-scope ratchet floor after the change.
- [ ] New section exports tested: `mount()`, `unmount()`, at least one `render*()`.
- [ ] New i18n keys tested: `t('key')` returns non-empty string.
- [ ] `npm test` passes with 0 failures after your changes.
- [ ] No `it.only` / `describe.only` left in committed code.

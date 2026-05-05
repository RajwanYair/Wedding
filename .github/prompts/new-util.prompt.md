---
mode: agent
description: "Scaffold a new pure utility helper in src/utils/ with JSDoc, tests, lint, and commit."
---

# New Utility Helper — Wedding Manager

Create a new utility module for: **`${input:utilityDescription}`**

## Pre-flight (read first, don't skip)

```bash
# 1. Check existing utils to avoid duplicates
Get-ChildItem src/utils -Filter "*.js" | Select-Object Name | Sort-Object Name

# 2. Check if the domain already has a file
#    e.g. vendor-sla.js, vendor-contracts.js — extend rather than create a new file
```

Read `src/core/constants.js` and `src/types.d.ts` — use existing enums, don't invent new ones.

## File: `src/utils/${input:fileName}.js`

```js
/**
 * src/utils/${input:fileName}.js — ${input:utilityDescription}
 *
 * @module ${input:fileName}
 * @owner ${input:owner|guest}
 */
```

Valid `@owner` values: `guest` | `vendor-crm` | `rsvp` | `checkin` | `calendar` | `analytics` | `plugin-runtime` | `whatsapp` | `ai-proxy` | `floor-plan` | `tables` | `shared`

### Mandatory patterns

- **Pure functions only** — no DOM, no store, no network, no `localStorage`
- **Immutable** — return new objects, never mutate inputs (`{ ...obj, key: value }`)
- **ID counters** (if needed) — `let _idCounter = 0` + `export function resetIdCounter(start = 0)`
- **No `let` when `const` works** — `prefer-const` is enforced
- **JSDoc `@param` + `@returns`** on every export
- **`@typedef`** for every data shape used across multiple functions

### Imports allowed from utils

```js
import { fnv1a32 } from "./fnv1a.js";        // hashing
import { cleanPhone } from "./phone.js";       // phone normalization
import { formatDate } from "./date.js";        // date helpers
import { sanitize } from "./sanitize.js";      // input validation (boundary use only)
```

Do NOT import from `src/core/`, `src/sections/`, or `src/services/`.

## File: `tests/unit/${input:fileName}.test.mjs`

```js
// tests/unit/${input:fileName}.test.mjs
import { describe, it, expect, beforeEach } from "vitest";
import { resetIdCounter, /* ... exports */ } from "../../src/utils/${input:fileName}.js";

beforeEach(() => resetIdCounter?.());  // only if IDs are generated

describe("${input:fileName}", () => {
  // cover: happy path, null/empty/boundary, each exported function
});
```

No `@vitest-environment happy-dom` — utils are DOM-free.

## Verify + Commit

```bash
# Run tests
npx vitest run tests/unit/${input:fileName}.test.mjs
# → Must show: Tests N passed (N)  (0 failed)

# Lint
npx eslint src/utils/${input:fileName}.js
# → Must exit 0, 0 warnings

# Commit
git add -A
git commit -m "feat(SXXX): ${input:fileName} — ${input:utilityDescription} + N tests"
```

## Checklist

- [ ] JSDoc `@module` + `@owner` on file
- [ ] All exports have `@param` + `@returns`
- [ ] No mutations of input objects
- [ ] `resetIdCounter` exported if IDs are generated
- [ ] Test file covers every export
- [ ] `npx eslint src/utils/${input:fileName}.js` exits 0
- [ ] `npx vitest run tests/unit/${input:fileName}.test.mjs` — 0 failures
- [ ] `git commit` done

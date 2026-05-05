---
mode: agent
description: "Implement the next N roadmap sprints in priority order — commit each sprint, release at end."
---

# Sprint Runner — Wedding Manager

Implement the next **`${input:count|10}`** roadmap sprints in priority order.

> Read `ROADMAP.md` and `AGENTS.md` before starting. Check current test baseline with `npm test -- --reporter=verbose 2>&1 | tail -3`.

## Sprint Execution Loop

Repeat for each sprint:

### 1. Identify
- Read `ROADMAP.md` (Phase C/D sections) to pick the next unimplemented priority.
- Run `Get-ChildItem src/utils -Filter "*.js" | Select-Object Name` to avoid duplicates.
- Cross-check `src/sections/`, `src/repositories/`, `src/handlers/` for the target domain.

### 2. Implement
Choose the correct layer:

| What | Where | Pattern |
|------|-------|---------|
| Pure helper | `src/utils/<name>.js` | `@module`, `@owner`, pure functions, `resetIdCounter` if IDs needed |
| Section feature | `src/sections/<name>.js` | `mount()`, `unmount()`, `render*()` exports |
| Data access | `src/repositories/<name>-repo.js` | CRUD via `storeGet`/`storeSet` |
| Action handler | `src/handlers/<domain>-handlers.js` | `data-action` dispatch |

**Rules:**
- `textContent` only — no raw `innerHTML`
- All colors via `var(--color-*)`
- i18n: `t('key')` in JS, `data-i18n="key"` in HTML — both `he` + `en` required
- `enqueueWrite()` for Sheets sync — never direct
- `localStorage` keys: `wedding_v1_` prefix

### 3. Write Tests
- File: `tests/unit/<name>.test.mjs`
- Cover: happy path, null/empty, each export
- Run: `npx vitest run tests/unit/<name>.test.mjs`
- Must show: `Tests N passed (N)`

### 4. Lint + Commit
```bash
npx eslint src/utils/<name>.js   # or the edited file
git add -A
git commit -m "feat(SXXX): <description> + N tests"
```

No warnings = commit. Warnings = fix first.

### 5. Next Sprint
Update todo list: mark sprint completed, next sprint in-progress.

## End of Session

After the final sprint, run the release agent or version bump prompt:
- Update `package.json` version → `npm run sync:version`
- Update CHANGELOG, README badges, copilot-instructions.md counts
- `npm run lint && npm test`
- `git tag vX.Y.Z && git push --tags`
- `gh release create vX.Y.Z --notes-file release-notes.tmp.md`

## Quick Reference

```js
// Utils pattern
import { fnv1a32 } from "./fnv1a.js";         // hash
import { cleanPhone } from "./phone.js";        // phone normalize
import { sanitize } from "./sanitize.js";       // input validation

// Tests pattern
beforeEach(() => resetIdCounter());             // reset sequential IDs

// Commit convention
"feat(S{N}): {domain} — {what} + {count} tests"
```

---
mode: agent
description: Debug a reported issue with structured investigation steps
---

# Debug Issue

Investigate and fix the reported issue: `${input:issueDescription}`

## Investigation Steps

### 1. Reproduce

- Identify which section(s) are affected
- Check if the issue is auth-gated (admin only vs guest)
- Check if it is RTL/Hebrew-specific or language-agnostic

### 2. Locate the Code

Search for relevant code using these patterns:

- Section module: `src/sections/<name>.js`
- Action handler: `src/handlers/<domain>-handlers.js`
- Store key: `storeGet('<key>')` / `storeSet('<key>', ...)`
- i18n key: `t('<key>')` / `data-i18n="<key>"`
- Template: `src/templates/<name>.html`

### 3. Check Common Failure Points

| Area | What to Check |
|------|--------------|
| Render not updating | Is there a `storeSubscribe` in `mount()`? Is `unmount()` cleaning it up? |
| Data not persisting | Is `storeSet` being called with the correct `wedding_v1_` key? |
| Sheets sync broken | Is `enqueueWrite()` used (not direct `syncStoreKeyToSheets`)? |
| Phone lookup failing | Is `cleanPhone()` normalizing the input before lookup? |
| Auth redirect loop | Is `PUBLIC_SECTIONS` including the target section? |
| Missing i18n text | Does the key exist in both `he.json` and `en.json`? |
| Modal not opening | Is `openModal('<modalName>')` called with the correct name from `MODALS` in `constants.js`? |
| Validation error | Did `sanitize(input, schema)` return `errors`? Check the schema in `src/utils/sanitize.js`. |
| Repository not found | Does `src/repositories/<domain>-repo.js` exist and export the expected helper? |
| Handler not firing | Is the `data-action` attribute value registered in the handlers map in `src/core/events.js`? |

### 4. Write a Failing Test

Before fixing, add a test in the relevant `tests/unit/<name>.test.mjs` that reproduces the bug.

### 5. Fix

Apply the minimal change required. Do not refactor unrelated code.

### 6. Verify

```bash
npm run lint && npm test
```

Both must exit 0.

### 7. Commit

```text
fix(<scope>): <short description>

Closes #<issue-number>
```

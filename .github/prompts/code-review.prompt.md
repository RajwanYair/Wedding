---
mode: agent
description: "Full code review: security, UI, i18n, data integrity, and performance audit for the wedding app."
---

# Code Review — Wedding Manager

Review the active change set against the modular runtime. Inspect the touched
`src/`, `css/`, `src/templates/`, `src/modals/`, `tests/`, and workflow/docs files as needed.
Report findings first, ordered by severity, with file:line references for every failure.

## Security

- [ ] No `innerHTML` with unsanitized external data
- [ ] No `eval()`, `Function()`, or `document.write()`
- [ ] All user inputs go through `sanitize(input, schema)` from `src/utils/sanitize.js` (valibot-backed)
- [ ] Phone numbers sanitized with `cleanPhone()` before use in URLs
- [ ] File upload validates type and size
- [ ] No XSS vectors in guest names, notes, or any free-text field
- [ ] No hardcoded credentials in source (run `npm run check:credentials`)

## Architecture

- [ ] Section modules do not import other section modules
- [ ] Section modules do not call repository functions directly — go via handlers
- [ ] Repository functions do not call section render functions
- [ ] Sheets writes use `enqueueWrite()` — never direct `syncStoreKeyToSheets`
- [ ] `mount()` registers subscriptions; `unmount()` cleans them all up

## i18n

- [ ] Every visible string has `data-i18n` or uses `t()`
- [ ] Both `he` and `en` translations exist for all new keys
- [ ] RTL/LTR direction switches correctly
- [ ] Placeholders use `data-i18n-placeholder`
- [ ] `npm run check:i18n` exits 0

## Data Integrity

- [ ] localStorage save/load handles missing data gracefully
- [ ] Guest IDs are unique
- [ ] Table deletion unassigns guests
- [ ] CSV export includes UTF-8 BOM
- [ ] Phone format conversion handles edge cases

## UI/UX

- [ ] All themes render correctly (default, rosegold, gold, emerald, royal)
- [ ] Responsive at 768px and 480px breakpoints
- [ ] Modal closes on Escape and overlay click
- [ ] Print stylesheet hides interactive elements
- [ ] `prefers-reduced-motion` respected
- [ ] Section styles inside `@scope` block — no bare `[data-section]` selectors

## Test Coverage

- [ ] New exported functions have corresponding unit tests
- [ ] Coverage does not drop below ratchet floor after change

Prefer bug risk, regression risk, missing tests, and security findings over stylistic commentary.

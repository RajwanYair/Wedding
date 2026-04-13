---
mode: ask
description: "Full code review: security, UI, i18n, data integrity, and performance audit for the wedding app."
---

# Code Review — Wedding Manager

Review `index.html` for:

## Security

- [ ] No `innerHTML` with unsanitized external data
- [ ] No `eval()`, `Function()`, or `document.write()`
- [ ] Phone numbers sanitized before use in URLs
- [ ] File upload validates type and size
- [ ] No XSS vectors in guest names or notes

## i18n

- [ ] Every visible string has `data-i18n` or uses `t()`
- [ ] Both `he` and `en` translations exist for all keys
- [ ] RTL/LTR direction switches correctly
- [ ] Placeholders use `data-i18n-placeholder`

## Data Integrity

- [ ] localStorage save/load handles missing data gracefully
- [ ] Guest IDs are unique
- [ ] Table deletion unassigns guests
- [ ] CSV export includes UTF-8 BOM
- [ ] Phone format conversion handles edge cases

## UI/UX

- [ ] All themes render correctly
- [ ] Responsive at 768px and 480px breakpoints
- [ ] Modal closes on Escape and overlay click
- [ ] Print stylesheet hides interactive elements
- [ ] `prefers-reduced-motion` respected

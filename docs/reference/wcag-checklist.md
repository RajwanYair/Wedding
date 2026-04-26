# Reference: WCAG 2.2 AA manual audit checklist

> Companion to [ADR-029](../adr/029-wcag-2-2-aa.md). Run before every minor release.

Each row is independently verifiable. Mark ✅ or ❌ in your release PR description.

## 1. Perceivable

| SC | Test | Result |
| --- | --- | --- |
| 1.3.1 | All form inputs have associated `<label>` | |
| 1.3.5 | `autocomplete` set on phone, email, name fields | |
| 1.4.3 | Body text contrast ≥ 4.5:1 (use DevTools "Color contrast") | |
| 1.4.10 | App zooms to 400% without horizontal scrolling at 1280px | |
| 1.4.11 | Icon buttons have ≥ 3:1 contrast against background | |
| 1.4.12 | Text remains readable when line-height set to 1.5 | |

## 2. Operable

| SC | Test | Result |
| --- | --- | --- |
| 2.1.1 | All sections reachable via keyboard alone | |
| 2.1.4 | Single-key shortcuts (Alt+1–9) can be remapped or disabled | |
| 2.4.7 | `:focus-visible` ring visible on every interactive element | |
| 2.4.11 | Sticky header does not obscure focused row mid-scroll | |
| 2.5.7 | Drag-drop on tables has a non-drag fallback ("Move to…") | |
| 2.5.8 | Every icon button is at least 24×24 CSS px tap target | |

## 3. Understandable

| SC | Test | Result |
| --- | --- | --- |
| 3.1.1 | `<html lang>` matches active locale | |
| 3.2.6 | Help link in same position on every section | |
| 3.3.1 | Form errors identified inline + announced via `announce()` | |
| 3.3.7 | RSVP phone lookup pre-fills name/email; user not asked twice | |
| 3.3.8 | OAuth flows do not require remembering a password | |

## 4. Robust

| SC | Test | Result |
| --- | --- | --- |
| 4.1.2 | Modals expose `role="dialog"` + `aria-modal="true"` + `aria-labelledby` | |
| 4.1.3 | `announce()` writes to a polite live region | |

## How to run

1. Set `lang="he"` and `dir="rtl"`; repeat with `lang="en"`.
2. Tab through every section once with the address bar focused.
3. Toggle `prefers-reduced-motion: reduce` and confirm no animation regressions.
4. Run `npx playwright test tests/e2e/a11y.spec.mjs` once ADR-029 A1 lands.

## Linked

- [ADR-029: WCAG 2.2 AA roadmap](../adr/029-wcag-2-2-aa.md)
- [ADR-011: Focus-trap accessibility](../adr/011-focus-trap-accessibility.md)

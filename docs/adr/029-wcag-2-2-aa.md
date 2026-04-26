# ADR-029: WCAG 2.2 AA compliance roadmap

> Status: **Accepted** · Phase: A4 · Targets: v11.12 → v12.0
> Owner: UX/Platform

## Context

The app already implements RTL Hebrew, ARIA live regions (`announce()`),
keyboard shortcuts, focus traps in modals (ADR-011), and `:focus-visible`
styles. We have **no formal WCAG audit** and no automated gate.

WCAG 2.2 AA was finalised October 2023; the new success criteria
relevant to us:

| SC | Title | Affected |
| --- | --- | --- |
| 2.4.11 | Focus Not Obscured (Minimum) | Sticky header / toasts |
| 2.5.7 | Dragging Movements | Table-seating drag-drop |
| 2.5.8 | Target Size (Minimum) — 24×24 CSS px | All icon buttons |
| 3.2.6 | Consistent Help | Settings & RSVP help links |
| 3.3.7 | Redundant Entry | RSVP phone-first lookup |
| 3.3.8 | Accessible Authentication (Minimum) | OAuth & email allowlist |

## Decision

Adopt WCAG 2.2 AA as the contractual baseline. Phase the work so each
release ships measurable improvements without blocking other tracks.

## Phases

| Phase | Gate | Scope |
| --- | --- | --- |
| **A0** _(v11.11, this batch)_ | merged | This ADR + manual audit checklist [`docs/reference/wcag-checklist.md`](../reference/wcag-checklist.md). |
| **A1** _(v11.12)_ | landed | Automated `axe-core` Playwright sweep on every section; advisory in CI. |
| **A2** _(v11.13)_ | landed | Fix 2.5.8 — audit all icon buttons for `min-width/height: 24px` (CSS variable). |
| **A3** _(v11.14)_ | landed | Fix 2.4.11 — toast/snackbar offset to never obscure focused row. |
| **A4** _(v12.0)_ | enforced | `axe-core` advisory becomes blocking; 0 violations required. |

## Acceptance criteria per phase

- A1: Playwright job runs `@axe-core/playwright` against `landing`,
  `dashboard`, `guests`, `tables`, `rsvp`, `settings`. Outputs a JSON
  report under `reports/axe-*.json` (gitignored).
- A2: All button-like elements pass a Stylelint rule `min-tap-target`.
- A3: `announce()` toasts spawn at `inset-block-end: max(8vh, env(safe-area-inset-bottom))`.
- A4: CI fails on any new `serious` or `critical` axe violation.

## Non-goals

- AAA criteria (contrast 7:1, etc.) — out of scope.
- Color-only redesign — handled separately if A2 audit reveals contrast gaps.

## Related

- [ADR-011: Focus-trap accessibility](011-focus-trap-accessibility.md)
- [WCAG 2.2 spec](https://www.w3.org/TR/WCAG22/)

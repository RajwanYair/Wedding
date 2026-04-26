# ADR-011: Focus Trap Pattern for Modal Accessibility

**Status:** Accepted
**Date:** 2025-01-01
**Deciders:** Engineering Team

## Context

WCAG 2.1 SC 2.1.2 (No Keyboard Trap, Level A) requires that keyboard users can navigate into and
out of modal dialogs. Without a focus trap, Tab will move focus outside an open modal to the underlying
page content, making the modal effectively inaccessible.

## Decision

Implement a pure-JS `createFocusTrap(container, opts)` utility (`src/utils/focus-trap.js`) that:

1. On `activate()`: attaches a `keydown` listener on `document` and moves focus to the first tabbable element inside `container`.
2. On `Tab` (forward): wraps from last focusable → first focusable element.
3. On `Shift+Tab` (backward): wraps from first → last focusable element.
4. On `deactivate()`: removes the listener and restores focus to the trigger element.

## Consequences

**Positive:**

- Fully keyboard-accessible modals with no ARIA role changes required.
- Testable in happy-dom without a real browser.
- Zero dependencies.

**Negative:**

- Requires callers to call `activate()` / `deactivate()` at the right lifecycle moments.
- Does not handle `aria-hidden` on background content — callers must manage that separately if needed.

## Alternatives Considered

| Option | Reason rejected |
|--------|----------------|
| `focus-trap` npm package | Runtime dependency, ADR-001 |
| `<dialog>` native `inert` | Browser support still incomplete as of 2024 |

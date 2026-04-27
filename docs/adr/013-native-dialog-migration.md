# ADR 013 — Native `<dialog>` Modal Migration

**Status**: Accepted (S103/S104, v12.5.8)

## Context

The Wedding Manager modal system was built before broad `<dialog>` support and
uses a manual `.modal-overlay > .modal-box` pattern with a JS focus trap and
custom Escape-key handling in `src/core/ui.js`. As of 2025, all evergreen
browsers (Chrome 37+, Firefox 98+, Safari 15.4+) implement
`HTMLDialogElement.showModal()` with native focus trapping, top-layer
rendering, and the `::backdrop` pseudo-element.

Maintaining the parallel JS focus-trap is technical debt: it competes with the
platform, complicates testing, and requires extra ARIA bookkeeping
(`aria-modal`, `aria-hidden`).

## Decision

1. `openModal(id)` and `closeModal(id)` in `src/core/ui.js` detect `<dialog>`
   elements and delegate to `showModal()` / `close()` (S103). Legacy
   `.modal-overlay` divs continue to use the JS focus-trap path.
2. New modals SHOULD use `<dialog class="modal-overlay">` so they inherit the
   shared modal CSS (overlay tint, blur, animation) but get native trap and
   `::backdrop` for free.
3. `src/core/dialog.js` (S102) provides direct helpers
   (`openDialog`, `closeDialog`, `toggleDialog`, `awaitDialogClose`) for
   call-sites that don't need the high-level `openModal` flow (e.g. transient
   confirmation prompts).
4. Existing modals (`guestModal`, `tableModal`, `vendorModal`, etc.) will be
   migrated incrementally, one per future sprint, in priority order:
   `shortcutsModal` → `searchModal` → `conflictModal` → form modals.
5. The JS focus-trap implementation in `ui.js` will be removed only after the
   last `.modal-overlay` is converted (target: v14).
6. `scripts/audit-modals.mjs` reports the adoption ratio. CI may enforce a
   non-decreasing baseline once adoption begins.

## Consequences

- **+** Smaller JS surface long-term; fewer custom keyboard-trap bugs.
- **+** Native top-layer rendering avoids `z-index` wars with toasts.
- **+** `::backdrop` styling unlocked for richer transitions.
- **−** Migration spans multiple releases; mixed-mode codebase until done.
- **−** `<dialog>` cannot be opened during a portrait-orientation lock
  exception (orientation API is unrelated but happens to log noise in tests).

## References

- ROADMAP §S102/S103 (Modal `<dialog>` adoption)
- `src/core/dialog.js`, `src/core/ui.js`, `scripts/audit-modals.mjs`
- MDN: [HTMLDialogElement.showModal()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)

# ADR-036 — Per-section CSS isolation via `@scope`

- Status: Proposed
- Date: 2026-04
- Related: ROADMAP §3.1 (CSS) and §6 Phase B7

## Context

CSS today lives in seven global `@layer`-ordered files under `css/`:
`variables`, `base`, `layout`, `components`, `auth`, `responsive`, `print`.
Section-specific styles either:

- Live in `components.css` under a class prefix (e.g. `.guests-list .row`).
- Live in `layout.css` keyed off `[data-section="guests"]`.
- Bleed across sections because selectors are global.

The cost is small but real: a selector intended for the guests table can
match a near-identical structure in the analytics charts; a refactor in
one section's HTML can break another section's appearance.

CSS now ships native `@scope` (Baseline 2024 in major engines). It lets
us declare "these rules apply only inside this DOM subtree" without JS
runtime cost.

## Decision

Adopt `@scope` rules **per section** for any rule that does not belong
in the shared `components.css` or `layout.css` global concerns.

### Rules

1. Section-specific styles live inside a `@scope` block keyed to the
   section's root selector.

   ```css
   @layer components {
     @scope ([data-section="guests"]) {
       .row { /* … */ }
       .row.is-confirmed { /* … */ }
     }
   }
   ```

2. Theme tokens, design tokens, and base typography stay global.
3. `@scope` is additive. Existing global rules continue to work. We do
   not rewrite working rules in a single big sweep.

### Migration phases

| Phase | Scope                                               | Gate     |
| ----- | --------------------------------------------------- | -------- |
| SC0   | Inventory: `scripts/audit-css-scope.mjs`            | advisory |
| SC1   | Wrap clearly section-local rules in `components.css`| advisory |
| SC2   | Move section-local rules out of `layout.css`        | advisory |
| SC3   | Stylelint rule: `selector-no-unscoped-data-section` | enforce  |

## Consequences

Positive:

- Section refactors stop breaking neighbours.
- New contributors can locate the rules for one section without grep.
- No runtime cost (zero JS).

Negative:

- Slightly nested CSS; readers must understand `@scope`.
- Older browsers (Safari < 17.4) need a polyfill or graceful fallback;
  we fall back to global rules — visual parity preserved.

## Non-goals

- CSS-in-JS, CSS Modules, or any build-time isolation.
- Renaming existing classes.
- Component-level isolation (`@scope` is per section, not per element).

## Rollout

- This release ships `audit:css-scope` advisory + this ADR.
- One phase per release thereafter; SC3 enforcement gated on Stylelint
  rule support.

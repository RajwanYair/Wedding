# ADR-034 — Adopt `BaseSection` across all 18 sections

- Status: Proposed
- Date: 2026-04
- Related: ADR-002 (ESM module architecture), ROADMAP §6 Phase B1

## Context

`src/core/section-base.js` provides a `BaseSection` class with uniform
`mount`/`unmount` lifecycle, automatic store-subscription cleanup, and an
`addCleanup(fn)` registry. It exists since v10.x and is fully exercised by
unit tests. **No production section uses it.** Every section in
`src/sections/` re-implements mount/unmount as a free-function pair and
manages its own teardown.

The cost of the parallel pattern:

- Each section invents its own subscription-cleanup convention. ~3 of them
  leak subscriptions on remount (caught by smoke tests, not prevented).
- Adding a cross-cutting concern (telemetry, perf marks, route guards)
  requires touching 18 files instead of one base class.
- The contract test in `tests/unit/section-contract.test.mjs` cannot
  enforce subscription-leak invariants because there is no shared state to
  inspect.

## Decision

Adopt `BaseSection` as the **only** allowed pattern for new sections, and
migrate the existing 18 over a multi-phase plan:

| Phase | Scope                                              | Gate                  |
| ----- | -------------------------------------------------- | --------------------- |
| BS0   | Inventory: `scripts/audit-base-section.mjs`        | advisory              |
| BS1   | Migrate 5 simplest sections (`landing`, `changelog`, `contact-form`, `registry`, `guest-landing`) | advisory |
| BS2   | Migrate 7 medium sections (`dashboard`, `invitation`, `analytics`, `timeline`, `gallery`, `checkin`, `vendors`) | advisory |
| BS3   | Migrate 6 complex sections (`guests`, `tables`, `whatsapp`, `rsvp`, `budget`, `settings`, `expenses`) | advisory |
| BS4   | Flip `audit:base-section` to ENFORCE; ESLint rule rejects `mount`/`unmount` named exports outside `BaseSection.prototype` | enforce |

Migration recipe per section (see also
[docs/how-to/migrate-section-to-base.md](../how-to/migrate-section-to-base.md)):

1. `class <Name>Section extends BaseSection { … }`
2. Move section-local state to instance fields.
3. Move existing `mount()` body into `onMount()`.
4. Replace `storeSubscribe(...)` calls with `this.subscribe(...)` so the
   base class auto-unsubscribes on `unmount()`.
5. Replace `unmount()` body with `onUnmount()` plus `this.addCleanup(fn)`
   for any non-store teardown.
6. Export the adapter: `export const { mount, unmount, capabilities } = fromSection(new <Name>Section("<name>"));`

## Consequences

Positive:

- Single lifecycle. Telemetry/perf/route-guard concerns hook in once.
- Subscription leaks become structurally impossible.
- New contributors learn one pattern.

Negative:

- ~18 mechanical migrations. Risk concentrated in the complex 6.
- Tests must run after each phase; visual regression must be re-baselined
  if any section accidentally re-orders its DOM.

## Non-goals

- Rewriting section logic. The migration is purely structural.
- Introducing a virtual-DOM or signals layer (separate ADRs).

## Rollout

- This release: ship `audit:base-section` advisory + the ADR + the how-to.
- One phase per release thereafter; each phase stands alone behind a
  feature-neutral commit.

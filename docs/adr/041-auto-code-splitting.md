# ADR-041: Auto code-splitting (remove `manualChunks`)

- **Status**: Accepted (planning) — 2026-04-26
- **Phase**: B8 (v13)
- **Owner**: Build
- **Related**: [ROADMAP §6 B8](../../ROADMAP.md), [ADR-024 bundle size budget](./024-bundle-size-budget.md)

## Context

`vite.config.js` currently configures `build.rollupOptions.output.manualChunks`
to force a hand-tuned chunk graph: `core`, `services`, `vendor`,
`i18n`, etc. The split was right for v9, but six minor releases of
section additions and dynamic imports later it is producing
*worse* chunks than Rollup's default heuristic:

- New section bundles inherit a "vendor" chunk that includes code
  they don't actually import.
- Cache invalidation cascades: a one-line change in a small service
  busts the whole `services` chunk.
- The mental model ("which chunk does this file land in?") drifts
  out of sync with the file tree on every refactor.

Rollup 5 + Vite 8 ship a default chunking algorithm that:

- Walks the dynamic-import graph.
- Co-locates only modules sharing a load-boundary.
- Produces stable hashes per actual usage, not per developer
  intuition.

## Decision

Remove `manualChunks` from `vite.config.js`. Rely on Rollup's default
algorithm. Lock the policy in with an audit script that fails CI if
the override is reintroduced without an ADR amendment.

## Phasing

| Phase | Goal                                                            | Gate                                                              |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| MC0   | Add `audit:manual-chunks` advisory; baseline current overrides. | Script reports non-zero count; CI prints diff.                    |
| MC1   | Document why each existing entry exists (or delete it).         | One-line rationale per surviving entry; ADR amendment if any.     |
| MC2   | Delete `manualChunks` block; rebuild; compare bundle report.    | `npm run size` shows ≤ +5 % total + chunk count within 25 % of prior. |
| MC3   | Flip audit to `--enforce`; CI fails on reintroduction.          | Workflow update; ADR closes.                                      |

## Consequences

### Positive

- Cache hit rate on incremental deploys goes up; users redownload
  only what actually changed.
- One fewer place where adding a new section requires "wiring".
- Consistent with ADR-001 (no implicit policies hand-coded into the
  build).

### Negative

- Loss of a forcing function: the manual config currently doubles as
  documentation. Replaced by the audit script + this ADR.
- A single bad day: chunk filenames change, so SW pre-cache manifest
  regenerates. No user impact (filenames are content-hashed) but CDN
  cold cache costs ~one revalidation per asset.

## Audit & enforcement

- `npm run audit:manual-chunks` — greps `vite.config.js` for the
  property; fails with `--enforce` if found after MC3.
- Bundle audit (`npm run audit:bundle`) acts as the safety net.

## Rollback

Restore the `manualChunks` block from git history. Add an ADR
amendment with the empirical reason. The audit script's `--enforce`
flag can be flipped back to advisory in the workflow without a code
change.

## See also

- [ADR-024 bundle size budget](./024-bundle-size-budget.md)
- [ROADMAP §6 B8](../../ROADMAP.md)
- [vite.config.js](../../vite.config.js)

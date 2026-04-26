# ADR-032 — Migrate `console.error` call sites to `reportError()`

- Status: Proposed
- Date: 2025-12
- Supersedes: —
- Related: ADR-028 (error monitor envelope v1)

## Context

ADR-028 introduced `reportError(err, context)` in `src/services/error-monitor.js`
as the canonical error-reporting surface. It produces an envelope-v1 payload
suitable for downstream sinks (Supabase, Sentry-shim, log files).

Today the codebase still calls `console.error(...)` from ~30 call sites in
`src/`. Those errors:

- Bypass the envelope schema (no event ID, no version, no context map).
- Cannot be filtered, sampled, or rate-limited.
- Are invisible to the monitor pipeline and to ops dashboards.

We want one logging contract: `reportError()` for unexpected failures,
`console.warn()` for expected/recoverable conditions.

## Decision

Adopt a multi-phase migration (C0 → C4):

| Phase | Scope                                              | Gate                  |
| ----- | -------------------------------------------------- | --------------------- |
| C0    | Inventory: `scripts/audit-console-error.mjs`       | advisory              |
| C1    | Migrate `src/sections/**` (user-facing)            | advisory              |
| C2    | Migrate `src/handlers/**` + `src/core/**`          | advisory              |
| C3    | Migrate `src/services/**` (excluding monitor self) | enforce in `npm run ci` |
| C4    | ESLint rule: `no-restricted-syntax` for `console.error` outside allowlist | enforce |

`reportError()` MUST be called with a context object containing at minimum
`{ source: "<module>", op: "<verb>" }`. Existing throw-sites that already log
via `console.error` then re-throw should switch to `reportError(err, ctx); throw err;`.

### Allowlist (permanent `console.error` sites)

- `src/services/error-monitor.js` — the monitor itself, when its own sink fails.
- `src/services/health.js` — bootstrap diagnostics before the monitor is ready.
- `scripts/**` — Node-side build/audit tools (not in `src/`).

## Consequences

Positive:

- Single envelope schema across the whole app.
- Ops can wire one sink and catch every reported failure.
- Sampling, dedup, and PII-strip happen in one place.

Negative:

- ~30 call sites to touch (mechanical).
- Added import in each migrated module.

## Rollout

- C0: ship `audit:console-error` advisory + this ADR. (this release)
- C1–C3: one phase per release; each phase commits `reportError()` swaps in
  the targeted directory and updates the audit baseline.
- C4: flip the ESLint rule once C3 is at zero.

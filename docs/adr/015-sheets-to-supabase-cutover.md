# ADR-015: Sheets → Supabase Cutover Plan

**Status:** Proposed (target v12.0.0)
**Date:** 2026-04-28
**Deciders:** Engineering · Data
**Supersedes:** Implicit "Sheets-first" runtime in v8 → v11.

## Context

Roadmap §4 lists this as the headline P0 item for v12:

> `BACKEND_TYPE = "sheets"` still active at v11 — Supabase never flipped as
> primary. **High likelihood / Critical impact** (rate limits, no realtime,
> integrity).

All Supabase scaffolding already exists:

- 22 numbered migrations in `supabase/migrations/`.
- `src/services/supabase.js` client wrapper.
- `src/repositories/` layer (advisory; not enforced).
- `src/services/backend.js` dispatcher already keyed on `BACKEND_TYPE`.

The only question is the **sequencing** of the flip and the **fallback** if
Supabase is unreachable mid-event (RSVP day).

## Decision

Cut over in three labelled stages, each shipped in its own minor release so
risk is bounded and reversible.

### Stage 1 — `BACKEND_TYPE = "supabase"` for **reads only** (v11.7.0)

- Reads pulled from Supabase; writes still dual-fire to Sheets + Supabase
  via `enqueueWrite()`.
- Discrepancy alarm: `services/backend.js` compares write success counts
  per minute and logs a Sentry breadcrumb if Sheets > Supabase by > 1 %.
- Repositories layer becomes the only call path used by sections; ESLint
  `no-restricted-imports` forbids `services/sheets.js` from `sections/*`.

### Stage 2 — `BACKEND_TYPE = "supabase"` everywhere (v12.0.0)

- Sheets calls removed from runtime imports; `services/sheets.js` survives
  only as a one-shot CLI helper for `scripts/migrate-from-sheets.mjs`.
- `enqueueWrite()` rewires to Supabase upserts only.
- Migration `023_canonical_schema_alignment.sql` lands (column parity).
- Edge functions (RSVP webhook, GDPR erasure, push send) deploy.

### Stage 3 — Sheets removed entirely (v12.1.0)

- `services/sheets.js` and `services/sheets-impl.js` deleted.
- Sheets-only utilities relocated to `scripts/legacy/sheets-export.mjs`.

## Backout Plan

If a regression in Stage 1 or 2 surfaces in production:

1. Revert the single config flip in `src/core/config.js`
   (`BACKEND_TYPE = "sheets"`) and tag a patch release.
2. The `enqueueWrite()` dual-fire in Stage 1 means no data is lost.
3. Manual Supabase → Sheets reconciliation script lives at
   `scripts/legacy/reconcile-sheets-from-supabase.mjs` (to be added in
   Stage 1).

## Consequences

**Positive:**

- Removes Apps Script rate-limit cliff at ~300-guest scale.
- Unlocks Realtime presence + conflict UI (Phase C4).
- Removes ~40 KB of Sheets/Apps-Script-shaped retry / queue code from the
  runtime (Phase 3.1 footprint goal).
- All data subject to RLS and audit log (migration 004).

**Negative:**

- Couples runtime to Supabase availability. Mitigation: persistent IDB
  write queue + Background Sync + edge function fallback.
- Anonymous users now write to Supabase via `anon` role; RLS must allow
  `INSERT` only into `rsvp_log` and `guests` (status update). Migration
  `024_anon_rsvp_policy.sql` to be authored in Stage 2.

## Migration Audit Hooks

- `scripts/migrate-from-sheets.mjs` (new): reads each tab via Apps Script
  `getRange`, validates rows against the same Valibot schemas used at
  runtime, upserts into Supabase with `imported_at` column for provenance.
- `scripts/verify-cutover.mjs` (new): row-count parity check between
  Sheets and Supabase per table; prints diff; exits non-zero on mismatch.

## Alternatives considered

- **Big-bang flip.** Rejected: no read-only fallback; one bug = lost data
  on a wedding day.
- **Stay on Sheets, add caching.** Rejected: caps still bite at scale; no
  RLS; no realtime; no edge functions.
- **Self-host Postgres.** Rejected (see Open Decision O4): operational
  burden vastly outweighs any privacy gain at our scale.

## References

- Roadmap §6 Phase A1, §7.1 Migration Playbook
- Existing migrations: `supabase/migrations/001` through `022`
- `src/services/backend.js` — dispatcher
- `src/repositories/` — write path
- ADR-007 — event-scoping (RLS predicates rely on `event_id`)

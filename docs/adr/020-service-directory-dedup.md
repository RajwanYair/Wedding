# ADR-020 — Service Directory Deduplication

> **Status:** Accepted · **Date:** 2026-04-29 · **Owners:** Architecture · **Related:** ROADMAP §5.3 #3, ADR-019 (repositories enforcement)

## Context

`src/services/` has accumulated overlapping helpers that share scope but were
introduced at different times:

| Pair | Status |
| --- | --- |
| `share.js` ↔ `share-service.js` | overlapping Web Share + fallback helpers |
| `audit.js` ↔ `audit-pipeline.js` | overlapping audit-log writers |
| `sheets.js` ↔ `sheets-impl.js` | provider façade vs concrete impl |
| `presence.js` ↔ `realtime-presence.js` | older polling presence vs Supabase Realtime |

This duplication is a recurring source of confusion: tests cover both, sections import
either, and migrations (ADR-015 Sheets → Supabase) have to handle two surfaces.

## Decision

For each pair we keep the **canonical** module and make the other a thin re-export
that emits a `console.warn(...)` in development only. Re-exports are removed in the
next major (v12.0.0).

| Pair | Canonical | Deprecated re-export |
| --- | --- | --- |
| Share | `share.js` (single API surface used by sections) | `share-service.js` |
| Audit | `audit-pipeline.js` (queue + transport) | `audit.js` |
| Sheets | `sheets.js` (façade chosen by `BACKEND_TYPE`) | `sheets-impl.js` |
| Presence | `realtime-presence.js` (Supabase Realtime path) | `presence.js` |

### Steps (sequenced over v11.7.0 → v12.0.0)

1. **v11.7.x** — verify canonical export coverage; add Vitest tests asserting parity of
   public APIs between each pair.
2. **v11.7.x** — convert deprecated module to a thin re-export with a one-time
   `console.warn` in development (`import.meta.env.DEV`). Update CHANGELOG entry under
   "Deprecations".
3. **v11.8.x** — find-and-replace all internal callers to canonical; CI check forbids
   new imports of deprecated modules (`no-restricted-imports`).
4. **v12.0.0** — remove deprecated modules entirely; update ADR-020 status to
   "Implemented".

## Consequences

- Single import path per concern; faster onboarding for contributors.
- Bundle drops by the de-duplicated weight (currently ~2 KB gzip aggregated across
  the four pairs).
- Tests halve for each pair.
- A short deprecation window protects external callers we may have missed.

## Alternatives Considered

- **Delete deprecated modules now:** rejected — risk of breaking unwired but
  pre-shipped utilities (see ROADMAP §4 P3 "15+ utilities built with no UI").
- **Keep both forever:** rejected — see Context.
- **Merge into a single mega-service:** rejected — bloats public surface.

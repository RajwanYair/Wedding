# ADR-033 — Versioned `localStorage` schema migrations

- Status: Proposed
- Date: 2025-12
- Related: ADR-003 (store-driven reactivity), ADR-008 (PII classification)

## Context

All persisted state lives under the `wedding_v1_` key prefix. The `_v1_`
namespace was a forward-looking guess; in practice we have already silently
extended individual record shapes (e.g. adding `meal` to guests, `paid` to
vendors) without a formal migration step. New users get the new shape;
returning users get whatever was last serialized — sometimes missing fields,
sometimes carrying stale ones.

This is fine while the schema is additive and defensively read, but it does
not scale to:

- Renamed keys (`wedding_v1_rsvps` → `wedding_v1_rsvp_log`).
- Removed fields with PII implications.
- Multi-domain restructures (splitting `settings` into `settings.event`,
  `settings.style`, `settings.flags`).

## Decision

Introduce a deterministic, versioned migration pipeline:

1. Store a single root key `wedding_schema_version` (integer, default `1`).
2. Each release that mutates persisted shape ships a numbered migration in
   `src/core/migrations/00NN-<slug>.js` exporting:

   ```js
   export const version = 2;          // target version
   export const description = "split settings into scoped subkeys";
   export function up(read, write) { /* read+write within try/catch */ }
   ```

3. On boot (in `src/core/storage.js`), `runMigrations()` reads the current
   version and applies every migration with `version > current` in order,
   wrapped in try/catch with `reportError()` (ADR-032). If any migration
   throws, the app aborts with a recovery banner — no partial writes.
4. Migrations MUST be idempotent (re-running is a no-op) and PII-safe
   (never widen exposure; redact when narrowing).
5. We bump to `wedding_v2_` prefix only when an irreversible breaking
   change makes parallel reads impossible — an explicit ADR per bump.

## Consequences

Positive:

- Returning users are not stranded on stale shape.
- Each schema change is auditable as a discrete migration file.
- PII narrowing is enforced on upgrade rather than left to drift.

Negative:

- Adds a small boot-time cost (synchronous; ~ms).
- Requires discipline: every persisted-shape change must ship a migration,
  not a “read-with-default” patch.

## Non-goals

- Server-side / Supabase migrations (handled in `supabase/migrations/`).
- IndexedDB migration (we do not use IDB today).
- Cross-device merge / CRDT — out of scope.

## Rollout

- This ADR ships the contract only. Code lands in a follow-up release that
  introduces the first real migration (likely splitting `settings`).
- Until then, all `wedding_schema_version` reads default to `1` and the
  pipeline is a no-op, keeping behaviour identical for existing users.

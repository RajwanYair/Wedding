# ADR-027: Supabase as the Single Runtime Backend

- **Status**: Proposed
- **Date**: 2026-04-29
- **Targeted release**: v12.0.0 (Phase A1)
- **Related**: ADR-009 (optimistic updates), ROADMAP §6 Phase A, §7.1 cutover playbook

## Context

`src/core/config.js` ships `BACKEND_TYPE = "sheets"` — Google Sheets is
**still the runtime backend**. Supabase is wired and migrated, but the
flip has not happened. The result:

- Every write hits the Sheets sync queue first, with Supabase as a
  best-effort secondary (or off entirely).
- Sheets API quotas, write latency (often > 1.5 s), and 100-cell write
  limits leak into UX as "saving…" spinners and reconciliation conflicts.
- Sheets cannot enforce RLS, foreign keys, or transactions — every
  invariant is duplicated in client code.
- `BACKEND_TYPE` is also persisted per-user in
  `localStorage.backendType` via `app-config.js` and a Settings UI
  selector. This means **two writers** can pick conflicting backends;
  the canonical value is unclear.

ROADMAP §0 priority #1 commits to flipping this in v12.0.0. ADR-027
documents the cutover plan and what the user-facing selector becomes.

## Decision

After v12.0.0, Supabase is the **only** runtime backend. Sheets becomes
**import/export only**.

### `BACKEND_TYPE` semantics change

| Release | Constant value | User selector | Sheets at runtime |
| --- | --- | --- | --- |
| ≤ v11.x | `"sheets"` (default) | "sheets" or "supabase" | Yes (primary) |
| v12.0.0 | `"supabase"` | Removed | No (CLI export script only) |
| ≥ v13.0.0 | Removed (selector + constant deleted) | n/a | n/a |

### Migration phases

| Phase | Release | Scope |
| --- | --- | --- |
| B0 | v11.10.0 (this ADR) | Specification only |
| B1 | v11.11.x | Default `BACKEND_TYPE = "supabase"` for fresh installs; existing users keep their localStorage choice; "Sheets" option marked **Legacy** in Settings |
| B2 | v11.12.x | Add a one-shot migrator: on first `BACKEND_TYPE === "sheets"` boot post-upgrade, prompt to import sheet data into Supabase, then flip the user's stored choice |
| B3 | v12.0.0 | Constant pinned to `"supabase"`; selector removed; `services/sheets.js` deleted from runtime; `scripts/sheets-export.mjs` retains read-only CSV export |
| B4 | v13.0.0 | `BACKEND_TYPE` constant deleted; all repositories assume Supabase |

### Repository contract (post-flip)

Every section talks to a repository, never to a backend service:

```text
Section → Handler → Repository → Supabase client → Postgres + RLS
```

`services/backend.js` (the dispatcher) becomes a thin wrapper around
the Supabase client, and is deleted in v13.

### What Sheets keeps

Sheets remains valuable for:

1. **Import** — a couple migrating from another tool can paste a Google
   Sheet URL into Settings → Import to populate the guest list.
2. **Export** — `scripts/sheets-export.mjs` writes any event back to a
   Sheet for archival or sharing with non-technical helpers.
3. **RSVP log mirror** — opt-in, via edge function (post-v12).

### What changes for users mid-migration

- A one-time banner: *"Wedding Manager now uses Supabase as the primary
  backend. Click Migrate to copy your Sheet data."*
- `localStorage.backendType` is rewritten to `"supabase"` after the
  migration completes.
- Sheets remains accessible as a read-only diagnostic in Settings →
  Advanced for two minor releases.

## Alternatives considered

1. **Keep dual backends forever** — rejected: doubles the test matrix,
   forces every invariant to be enforced in client code, prevents RLS
   correctness guarantees.
2. **Cut over to IndexedDB only (no remote)** — rejected: collaboration
   between bride/groom/planner is a core requirement.
3. **Cut over to a custom Postgres on Render/Fly** — rejected: ops cost,
   no realtime or auth without rebuilding what Supabase ships.

## Consequences

- **CI**: integration tests target only Supabase from v12; sheets
  integration tests move to a separate `sheets-cli.test.mjs` suite.
- **Bundle**: dropping the Sheets API client saves ~6 KB gzip.
- **Edge functions**: the WABA proxy, push send, and GDPR erasure already
  assume Supabase — no change needed.
- **Documentation**: `docs/integrations/supabase.md` becomes the canonical
  guide; Sheets gets a "legacy import/export" reference page.

## Acceptance criteria for B0 (this ADR)

- [x] Decision document committed
- [x] Phase boundaries pinned to releases
- [ ] B1 ticket opened — flip the default for new installs
- [ ] User-facing migration copy drafted in `src/i18n/he.json` + `en.json`

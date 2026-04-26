# ADR-023: Organization & Team Scoping (Phase D)

- **Status**: Proposed
- **Date**: 2026-04-29
- **Targeted release**: v15.0.0 (planner workspace)
- **Supersedes**: —
- **Related**: ADR-007 (event-scoping), ADR-008 (PII classification)

## Context

Wedding Manager today is **single-tenant per browser**: a deployment is owned
by one couple (or one wedding planner manually swapping credentials). Several
users have asked for a **planner workspace** where one professional can manage
many weddings, share access with assistants, and see aggregate analytics
without copy-pasting data between deployments.

This requires multi-tenancy at three layers:

1. **Identity** — a stable `org_id` independent of any single user.
2. **Authorization** — every Supabase row carries `org_id`; RLS policies join
   on `org_members.org_id = auth.uid()` to enforce isolation.
3. **UI scoping** — every store domain key (`guests`, `tables`, …) is
   namespaced by the active org so switching orgs swaps the data set without
   leaking across tabs.

ADR-007 already scoped data per **event**; ADR-023 layers an **org → events →
data** hierarchy on top.

## Decision

Adopt a three-tier model, rolled out in phases through v15.

### Tier model

```text
Organization (org)
└── Team members (auth.users joined via org_members)
    └── Events (existing event_id scoping from ADR-007)
        └── Domain rows (guests, tables, vendors, …)
```

- An **org** owns billing, branding, and member roles.
- Each **team member** has one of: `owner`, `admin`, `editor`, `viewer`.
- Each **event** belongs to exactly one org (FK `events.org_id`).
- Existing `event_id` scoping in queries continues unchanged.

### Phasing

| Phase | Release | Scope |
| --- | --- | --- |
| D0 | v11.9.0 (this ADR) | Specification + migration plan only — no code |
| D1 | v12.x | Add `orgs` and `org_members` tables; nullable `events.org_id`; default-org backfill for existing data |
| D2 | v13.x | RLS policies enforce `org_members.uid = auth.uid()`; client carries `org_id` claim |
| D3 | v14.x | UI org switcher; per-org store namespace prefix (`wedding_v1_<org>_<key>`) |
| D4 | v15.0 | Planner workspace cross-event analytics; remove nullable from `events.org_id` |

### Schema sketch (D1)

```sql
create table orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table org_members (
  org_id      uuid not null references orgs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','admin','editor','viewer')),
  invited_by  uuid references auth.users(id),
  joined_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);

alter table events add column org_id uuid references orgs(id);
create index events_org_id_idx on events(org_id);
```

### Authorization rules (D2)

- Anonymous users continue to access only `PUBLIC_SECTIONS` (RSVP, landing).
- Admin allowlist becomes **org-owner allowlist** at the deployment level —
  the first signed-in admin email auto-creates an org and becomes its owner.
- RLS template: `using (exists(select 1 from org_members om where om.org_id = events.org_id and om.user_id = auth.uid()))`.
- All edge functions read `org_id` from the JWT's `app_metadata` instead of
  trusting client-supplied values.

### Client storage namespace (D3)

```text
wedding_v1_<org_slug>_<domain>           # per-org data
wedding_v1__shared_<domain>              # cross-org cache (read-only)
```

- Switching orgs clears the in-memory store and rehydrates from the new prefix.
- Locale, theme, and a11y preferences stay in the user-scoped key
  `wedding_v1__user_<key>` (independent of the active org).

## Alternatives considered

1. **Single shared workspace per planner** (no org isolation) — rejected:
   PII bleed, no per-couple deletion, fails ADR-008 classification.
2. **One Supabase project per org** — rejected: operational nightmare,
   prevents cross-event analytics.
3. **Workspace = single special "events" row** — rejected: collapses two
   distinct concepts (wedding event vs. business org) and forces couples to
   model themselves as a 1-event "org".

## Consequences

- **Migration risk**: backfilling `events.org_id` on prod data must be
  idempotent and reversible (see `docs/operations/migrations.md`).
- **Free tier impact**: existing solo couples get an auto-created
  `personal-<random>` org and never see the org UI until D3 ships.
- **Test surface**: every Supabase repository test must add an `org_id` axis;
  in-memory repositories grow an `orgId` field for parity.
- **Bundle**: planner-only routes lazy-load (see ADR-024 budget).

## Acceptance criteria for D0 (this ADR)

- [x] Decision document committed
- [x] Schema sketch reviewed
- [x] Phasing aligned with semver-major boundaries
- [ ] Follow-up tickets opened for D1 migration scaffolding

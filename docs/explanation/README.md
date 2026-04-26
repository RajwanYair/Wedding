# Explanation — Understanding-Oriented Docs

> **Diátaxis quadrant**: explanation. **Audience**: engineers and reviewers
> who want to understand _why_ Wedding Manager is built the way it is —
> not how to use it (tutorials/how-to) and not what each surface returns
> (reference).

This folder is the explanation quadrant. Most explanation lives next door
in [`../adr/`](../adr/) — every architectural decision has its own ADR.
This index page exists so the four-quadrant Diátaxis layout is complete
and discoverable.

## Where to find what

| You want to understand … | Read |
| --- | --- |
| Why we ship zero runtime deps | [ADR-001](../adr/001-zero-runtime-deps.md) |
| Why ESM modules with no bundler runtime | [ADR-002](../adr/002-esm-module-architecture.md) |
| Why a custom Proxy store instead of Redux/Zustand | [ADR-003](../adr/003-store-driven-reactivity.md) |
| Why guest tokens are short-lived JWTs | [ADR-006](../adr/006-guest-token-design.md) |
| Why every event row has an `event_id` | [ADR-007](../adr/007-event-scoping.md) |
| Why guest data is treated as PII | [ADR-008](../adr/008-pii-classification.md) |
| Why we use a custom event bus | [ADR-012](../adr/012-event-bus.md) |
| Why we are migrating action names to `domain:verb` | [ADR-022](../adr/022-action-namespace-migration.md) |
| Why org/team scoping is being added | [ADR-023](../adr/023-org-team-scoping.md) |
| Why we set per-route bundle budgets | [ADR-024](../adr/024-bundle-size-budget.md) |
| Why we are replacing the hash router | [ADR-025](../adr/025-pushstate-router.md) |
| Why we encrypt tokens at rest | [ADR-026](../adr/026-encrypt-tokens-at-rest.md) |
| Why Supabase is becoming the only backend | [ADR-027](../adr/027-supabase-single-backend.md) |

## High-level themes

The ADRs cluster around five themes:

### 1. Privacy & data ownership

ADRs 006, 007, 008, 023, 026 — guest data is sensitive, scoped per
event, optionally scoped per org, and encrypted at rest.

### 2. Performance & bundle discipline

ADRs 001, 002, 014, 024 — minimal runtime deps, native ESM, lazy
section/modal templates, hard gzip budgets per route.

### 3. Architecture clarity

ADRs 003, 012, 020, 022, 025 — a single Proxy store, a single event
bus, repository layer for IO, namespaced action names, typed routes.

### 4. Operational maturity

ADRs 015, 018, 021 — observability with PII scrubbing, Trusted Types
roadmap, Diátaxis docs reorganisation.

### 5. Strategic direction

ADRs 023, 027 — multi-tenant org/team mode, Supabase-only backend.

## Reading order for new contributors

1. [ADR-001](../adr/001-zero-runtime-deps.md) — the foundational constraint.
2. [ADR-003](../adr/003-store-driven-reactivity.md) — how the app's state model works.
3. [ADR-012](../adr/012-event-bus.md) — how cross-module communication works.
4. [ADR-007](../adr/007-event-scoping.md) — how multi-event data isolation works.
5. [ADR-027](../adr/027-supabase-single-backend.md) — where the backend is going.

After those five, every other ADR should slot into a familiar context.

## See also

- [`../adr/README.md`](../adr/README.md) — full ADR index with status legend.
- [`../README.md`](../README.md) — Diátaxis top-level index.
- [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) — system overview.

# ADR 007 — Multi-Event Database Scoping

**Status**: Accepted
**Date**: 2025
**Deciders**: Core team

## Context

The Wedding Manager was initially designed as a single-event application.
As the user base grew, couples asked to manage rehearsal dinners, engagement
parties, and future weddings in the same account.  We needed a database
design that isolated events without requiring tenant-level Supabase projects.

## Decision

Add an `event_id` foreign key column to every user-owned table (`guests`,
`tables`, `vendors`, `expenses`, `contacts`, `timeline`, `rsvp_log`).

All queries are scoped with `.eq("event_id", eventId)` in the base repository
(`SupabaseBaseRepository._query()`), so no call site needs to repeat the
filter.  RLS policies enforce event isolation at the database layer
(`auth.jwt() ->> 'event_id' = event_id::text`).

A single JWT claim `event_id` is set when the admin logs in and is validated
by `isEventOwner(session, eventId)` in `src/services/auth-claims.js`.

## Consequences

**Positive:**
- A single Supabase project serves all events with no cross-contamination.
- Repository pattern hides the scoping: callers pass `eventId` at
  construction time and never repeat it in queries.
- RLS is the safety net if the application-level scope is ever bypassed.

**Negative:**
- All migration files must remember to add `event_id` to new tables.
- `COUNT(*)` queries that aggregate across events (e.g. platform analytics)
  must explicitly omit the event filter — this is done via raw SQL, not
  through the repository.
- RSVP log rows are tied to an event; historical imports must supply a
  synthetic `event_id`.

## Alternatives Considered

| Option | Reason rejected |
|--------|-----------------|
| One Supabase project per event | Cost and operational overhead |
| Schema-per-event (PostgreSQL schemas) | Supabase does not support this easily; migrations would be complex |
| Row-level namespace column `namespace` | Less expressive than `event_id`; harder to put in RLS |

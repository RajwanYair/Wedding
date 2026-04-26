# ADR-019 — Repositories Layer Enforcement

> **Status:** Accepted · **Date:** 2026-04-29 · **Owners:** Architecture · **Related:** ROADMAP §3.3 + §5.3 #1, ADR-002 (ESM module architecture)

## Context

`src/repositories/` exists as the *intended* boundary between sections/handlers and
backend services. In practice today, sections still import services directly
(`src/services/*.js`) for some reads, and `arch-check.mjs` is **advisory** — it warns
but does not fail CI.

This is the architectural source of two recurring debt items:

- Sheets/Supabase migration (ROADMAP §3.2) cannot complete cleanly while sections call
  Sheets-specific helpers directly.
- Service-directory dedup (ADR-020 follow-up) is harder when services have many entry
  points across the codebase.

## Decision

1. **Repositories are the only allowed import path for backend reads/writes from
   sections and handlers.** Sections may import:
   - `src/core/*` (store, events, i18n, nav, dom, ui)
   - `src/utils/*` (pure helpers)
   - `src/repositories/*` (data access)
   - `src/handlers/*` (action handlers, when invoked)
2. **Sections must NOT import:** `src/services/*` (other than `monitoring`/`auth` which
   are cross-cutting capabilities, not data sources). The exact allowlist lives in
   `eslint.config.mjs` `no-restricted-imports`.
3. **Strict mode timeline:**
   - **v11.x** — `arch-check.mjs` stays advisory; ESLint `no-restricted-imports` runs
     in advisory mode (`continue-on-error: true`) for the same set.
   - **v12.0.0** — `arch-check.mjs --strict` becomes a hard CI gate. Any direct
     section→service import fails the build.
   - **v13.0.0** — handlers also constrained; only repositories may call services.
4. **New repositories shadow the existing service surface.** When a service capability
   is needed by a section, expose a method on the matching repository
   (`guests-repository.js`, `tables-repository.js`, …) rather than re-exporting the
   service.
5. **Cross-cutting capabilities exempt:**
   - `services/monitoring.js` (error pipeline)
   - `services/auth.js` (session)
   - `services/i18n-loader.js` if introduced
   These are not data services and remain importable from anywhere.

## Consequences

- Backend swaps (Sheets → Supabase) become a one-file change per repository; sections
  do not move.
- Test surface shrinks: repositories are the only seam to mock for section unit tests.
- Adding a new section requires: `mount/unmount` + template + i18n + repository
  binding — no direct backend coupling.

## Alternatives Considered

- **Keep service imports allowed:** rejected — that is the status quo causing the
  P1 risk.
- **Move services into repositories:** rejected — services have legitimate non-data
  responsibilities (sync queue orchestration, retry logic) that don't belong in a
  repository.
- **TypeScript-enforced module boundaries via `tsconfig` paths:** retained as a
  follow-on once Phase B (`core/`, `services/`, `handlers/` → TS strict) lands.

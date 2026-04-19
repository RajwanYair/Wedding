# Wedding Manager — Roadmap

> Active product direction for the production codebase. Architecture details live in `ARCHITECTURE.md`; release history lives in `CHANGELOG.md`.

## Current State

- Runtime: Vite 8 + vanilla ESM with `src/main.js` as the production entry
- UX: Hebrew RTL first with English toggle, lazy templates/modals, offline-capable shell
- Quality gate: `npm run lint`, `npm test`, and `npm run build` are the baseline merge requirements
- Active backend path: Google Sheets remains wired; Supabase is present as the intended production upgrade path

## Near-Term Priorities

### 1. Production Security

- Rotate any credentials that previously existed in source control
- Keep admin allowlists and third-party keys injected at build/deploy time only
- Tighten CSP and keep SRI coverage current for external SDKs

### 2. Backend Convergence

- Finish the transition from split Sheets/Supabase design to one authoritative production backend
- Keep Google Sheets as import/export or operational fallback only once Supabase is active
- Validate event isolation, auth, and row-level access rules before switching defaults

### 3. Storage and Offline Resilience

- Continue routing state through the storage abstraction rather than direct browser storage calls
- Preserve one-time migration paths and verify offline RSVP/check-in flows against the current service worker behavior
- Keep background sync, queue flushing, and recovery flows covered by tests

### 4. Production UX Polish

- Maintain bilingual Hebrew/English UI quality, including accessibility labels and runtime direction changes
- Keep responsive layout, print views, and event-day flows stable on mobile browsers
- Continue pruning dormant UI affordances and unused extension points

## Medium-Term Priorities

### Backend Activation

- Provision and validate the Supabase production environment
- Wire active CRUD and realtime flows to the chosen backend path
- Add integration coverage for the activated backend mode

### PWA Hardening

- Improve offline fallback behavior and installability
- Keep manifest, service worker, and sync flows aligned with the production deployment model
- Maintain Lighthouse performance and accessibility targets without adding framework overhead

### Type Safety and Contracts

- Continue strengthening JSDoc and TypeScript boundaries around core and service modules
- Prefer canonical runtime constants and defaults over duplicated local definitions
- Keep external-service and persistence paths under the strongest available validation

## Deferred / Optional Work

- AI-assisted seating or RSVP features
- Expanded multi-tenant event management beyond the current event model
- Additional runtime dependencies beyond security- or validation-justified cases

## Working Principles

1. Production code beats aspirational code.
2. One canonical source per concern: constants, defaults, config, docs.
3. Security and data integrity outrank convenience.
4. Offline and mobile behavior are first-class, not edge cases.
5. Dead code and dead docs are maintenance debt and should be removed quickly.

## Release Line

| Version | Focus | Status |
| --- | --- | --- |
| v8.2.x | Security hardening, storage centralization, production cleanup | Active |
| v8.3.x | Backend convergence and PWA hardening | Planned |
| v8.4.x | UX/performance refinement and stronger contracts | Planned |
| v9.x | Backend finalization, broader platform improvements | Deferred |

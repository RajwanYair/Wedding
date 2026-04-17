# Wedding Manager Roadmap

> Strategic reset for making the project a best-in-class wedding management application.
> Last updated: 2025-07-19
> Current baseline: v7.1.0 on main

---

## Table of Contents

1. Executive Summary
2. Baseline Reality
3. Best-in-Class Definition
4. Decision Reset
5. Keep, Improve, Retire
6. Architecture Target
7. Product Roadmap
8. Old Roadmap Consolidation
9. External Services and API Strategy
10. Documentation Roadmap
11. Quality, Security, and Operations Targets
12. Release Plan
13. Success Metrics
14. Non-Negotiables

---

## Executive Summary

Wedding Manager already has a strong frontend core: modular ES modules, no runtime dependencies, a clean event delegation model, a good testing culture, multilingual support, and a surprisingly capable feature set for a static-first application.

The project is not yet best in class because several foundational decisions are still split between old and new directions:

- The app behaves like a production product, but its primary data model still assumes Google Sheets.
- The codebase claims a modern architecture, but some docs still describe deleted legacy paths and outdated counts.
- Supabase exists, but it is not yet the clear source of truth.
- The product has strong tests, but limited operational visibility and incomplete security hardening around PII.
- The app has excellent breadth, but its roadmap still mixes completed work, deferred work, and aspirational work without enough sequencing discipline.

This roadmap resets the plan around one principle:

**Stop growing surface area until the platform, data, trust, and operational model are unquestionably strong.**

The next era of the project should focus on five outcomes:

1. A single authoritative backend model.
2. A stricter and more explicit frontend contract.
3. Stronger privacy, security, and observability.
4. Documentation that matches reality and supports contributors.
5. Premium UX polish only after the platform is trustworthy.

---

## Baseline Reality

This roadmap is based on the code currently in the repository, not on older assumptions.

### What exists today

| Area | Current state |
| --- | --- |
| Frontend stack | HTML5, vanilla CSS, vanilla JS ES modules, Vite 8 |
| Code organization | `src/core`, `src/handlers`, `src/sections`, `src/services`, `src/utils` |
| Main entry | `src/main.js`, now focused on orchestration rather than a god module |
| Data backends | Google Sheets Apps Script is primary; Supabase exists but is partial |
| Auth | Custom Google, Facebook, Apple, email allowlist, anonymous guest mode |
| Storage | IndexedDB primary with fallbacks; local persistence still important |
| Testing | 1957 passing tests, coverage thresholds configured, Playwright present |
| CI | Lint, typecheck, validation, tests, build, security scan, Lighthouse, size, E2E |
| Hosting | GitHub Pages deploy workflow in place |
| Security headers | `_headers` file exists with CSP and cache directives |
| i18n | Hebrew, English, Arabic, Russian |
| Runtime dependencies | Zero |

### Where reality and intent still diverge

| Topic | Current reality | Strategic issue |
| --- | --- | --- |
| Backend source of truth | Sheets first, Supabase partial | Split architecture and migration risk |
| Docs accuracy | Several docs still describe `js/`, older counts, older versions | Trust erosion for maintainers |
| Auth model | Custom provider handling in client | Too much identity logic in frontend |
| PII model | Sensitive guest data can still live in browser storage | Privacy and incident risk |
| Observability | Limited production telemetry | Failures can go unnoticed |
| Roadmap shape | Mixes completed and future work | Hard to prioritize what actually matters |

---

## Best-in-Class Definition

For this product, best in class does not mean the largest feature list. It means the app is excellent on the dimensions that matter for a real wedding workflow.

### Product goals

- Reliable guest and RSVP management under real event pressure.
- Fast mobile-first experience for guests and admins.
- Strong offline and degraded-network behavior.
- Clean and safe collaboration for multiple admins.
- Low operational overhead for a single-event deployment.
- Clear upgrade path from hobby project to durable product.

### Best-in-class bar

| Dimension | Target |
| --- | --- |
| Reliability | No ambiguous source of truth, safe sync, visible failures |
| Speed | Fast first load, responsive UI at 1,000+ guests |
| Trust | Strong privacy model, explicit auditability, secure defaults |
| Usability | Premium RSVP and admin UX on desktop and mobile |
| Maintainability | Typed contracts, current docs, predictable releases |
| Extensibility | New sections and plugins without deep rewiring |

---

## Decision Reset

This section rethinks major project decisions, including ones that looked clean when they were made.

### 1. Vanilla JS and zero runtime dependencies

**Decision:** Keep.

This is still a strong differentiator and remains technically defensible. Modern browser APIs, Vite, and native ES modules are enough for this product. The constraint is useful because it forces disciplined architecture.

**What changes:**

- Stop treating zero runtime deps as a reason to avoid stronger developer tooling.
- Use build-time and CI-time tools aggressively where they improve safety.
- Invest in first-party primitives where frameworks would normally help.

### 2. Language strategy

**Decision:** Move to a typed-first codebase, but do it pragmatically.

The codebase already uses `checkJs`, `strict`, and modern TS config settings. That means the project has already outgrown the old JS-only position.

**Recommended direction:**

- Adopt TypeScript for new or heavily refactored core and service modules.
- Keep small, stable, low-risk files in JS if conversion cost outweighs benefit.
- Prioritize type-safe domain contracts over file-extension purity.

**Why this is better than an all-or-nothing rewrite:**

- It preserves momentum.
- It concentrates typing effort where defects are most expensive.
- It avoids churn in presentation-only modules.

### 3. Frontend architecture

**Decision:** Keep the modular SPA architecture, but formalize contracts.

The current structure is one of the project's strongest decisions: sections, handlers, services, and core primitives are reasonably separated.

**What must improve:**

- Formal section contract: every section exposes mount, unmount, and capability metadata.
- Formal action registry: every `data-action` value should be registered, typed, and validated.
- Formal render contract: rendering code should be pure where possible and mutation boundaries explicit.

### 4. Data and backend architecture

**Decision:** Sheets should stop being the primary backend.

Google Sheets was a good bootstrap decision, but it is now the main limiter across integrity, scale, realtime collaboration, and incident recovery.

**Recommended direction:**

- Supabase becomes the primary transactional backend.
- Google Sheets becomes optional import and reporting export.
- The app should support a local-first UX, but not a browser-first source of truth.

### 5. Auth and identity

**Decision:** Move identity out of the client.

The current custom provider handling is serviceable, but it makes the client carry too much auth logic and too many trust assumptions.

**Recommended direction:**

- Use Supabase Auth as the primary identity layer.
- Keep email allowlist logic, but enforce it through claims and policies rather than only client checks.
- Preserve anonymous guest mode, but narrow its permissions sharply.

### 6. Storage model

**Decision:** Keep local-first behavior, but narrow what is persisted.

Offline capability is valuable. Persisting too much sensitive data in the browser is not.

**Recommended direction:**

- Persist drafts, queues, cache, and public assets locally.
- Avoid long-lived plaintext storage of full guest PII where possible.
- Introduce a data classification model: public, guest-private, admin-sensitive, operational.

### 7. Service worker and PWA approach

**Decision:** Keep PWA support, upgrade cache strategy.

Manual service worker control gave early flexibility, but the app now needs more predictable asset lifecycle management.

**Recommended direction:**

- Keep the custom model only if it stays small and testable.
- Otherwise move to a generated precache strategy with a tighter upgrade protocol.
- Add explicit offline acceptance tests and cache invalidation tests.

### 8. Hosting and infrastructure

**Decision:** Split static delivery from dynamic capabilities.

GitHub Pages is fine for static delivery, but it is not enough to support the operational future of the app alone.

**Recommended direction:**

- Keep static hosting simple.
- Use Supabase Edge Functions for trusted server-side behavior.
- Re-evaluate Cloudflare Pages only if preview environments, edge routing, or header control become a limiting factor beyond the current setup.

### 9. Documentation strategy

**Decision:** Reduce vanity docs, increase living operational docs.

There is a lot of documentation, but not all of it is current, and some of it optimizes for narrative completeness rather than maintainability.

**Recommended direction:**

- Fewer overview docs with duplicated counts and version numbers.
- More living docs tied to actual architecture, operations, and contributor workflows.
- Auto-generate where possible, especially API and topology references.

### 10. Feature strategy

**Decision:** Slow feature expansion until the platform is hardened.

The app already has meaningful product breadth. The next big gains are not from adding another admin widget; they are from making the current system safer, sharper, and easier to trust.

---

## Keep, Improve, Retire

### Keep

| Area | Keep | Reason |
| --- | --- | --- |
| App shell | Modular section-based SPA | Good fit for this scope |
| Event handling | `data-action` delegation | Scalable and low overhead |
| Styling | CSS layers, custom properties, RTL-first design | Strong design-system foundation |
| Testing culture | High automated coverage and broad test surface | Competitive advantage |
| i18n model | `t()` plus `data-i18n` | Clear and enforceable |
| Build model | Vite with zero runtime deps | Fast and clean |
| Plugin concept | Lightweight internal extensibility | Good long-term leverage |

### Improve

| Area | Improve | Why |
| --- | --- | --- |
| Domain types | Shared typed schemas for guest, table, vendor, expense, timeline | Reduce drift and implicit rules |
| Section API | Stable lifecycle and capability contract | Simplify mounting and cross-section tooling |
| Store API | Batch updates, scoped subscriptions, immutable update helpers | Performance and leak prevention |
| Forms | Unified form helpers, schemas, and validation messages | Less duplicated logic and fewer edge bugs |
| Docs | Accuracy-first architecture and ops docs | Reduce contributor confusion |
| E2E | Multi-browser, offline, auth, and conflict scenarios | Cover actual production risk |
| CI | Faster split pipelines, stronger release gating | Improve feedback without losing rigor |

### Retire

| Area | Retire | Replacement |
| --- | --- | --- |
| Sheets-first sync model | Primary writes to Apps Script | Supabase-first transactional writes |
| Client-auth-heavy provider flow | Frontend-managed social auth plumbing | Supabase Auth and server-side policy |
| Repeated runtime config mutation | Ad hoc local overrides for backend secrets | Explicit environment and admin config model |
| Stale docs with hardcoded counts | Manual narrative updates everywhere | Living docs plus generated references |
| Browser as durable admin database | Long-lived sensitive local state | Cached operational state with classified persistence |

---

## Architecture Target

### Target system shape

```text
Client UI
  -> Core app shell
  -> Typed domain services
  -> Local cache / draft queue
  -> Supabase Auth
  -> Supabase Postgres + Realtime + Storage + Edge Functions
  -> Optional exports: Google Sheets, calendar, WhatsApp, email
```

### Preferred architectural principles

1. One source of truth per domain.
2. One clear owner for identity and authorization.
3. Browser cache is an optimization, not the canonical database.
4. Domain rules live in shared contracts, not duplicated UI logic.
5. Every external integration is optional, isolated, and failure-tolerant.
6. Every major subsystem has observable health and explicit ownership.

### Proposed domain boundaries

| Boundary | Responsibility |
| --- | --- |
| Core shell | Boot, navigation, lifecycle, event routing, UI primitives |
| Domain layer | Guest, RSVP, seating, vendors, expenses, timeline, messaging |
| Data layer | Repository interfaces, sync, conflict handling, cache policy |
| Identity layer | Session, roles, guest tokens, admin claims |
| Integration layer | Sheets, WhatsApp, email, maps, analytics |
| Operations layer | Audit log, error log, telemetry, health checks |

### Key architectural upgrades

- Introduce repository interfaces per domain instead of backend-specific calls leaking upward.
- Define explicit DTOs and view models.
- Centralize conflict resolution rules instead of spreading them across service and UI code.
- Create a formal configuration system with three scopes: build, deployment, runtime-admin.
- Separate public guest experience from admin application concerns more aggressively.

---

## Product Roadmap

The roadmap below is sequenced by leverage. The early phases deliberately prioritize trust, correctness, and maintainability over new feature count.

### Phase 0: Truth and Alignment

**Goal:** Make docs, architecture claims, and release expectations match the current repository.

**Priority:** P0

**Deliverables:**

- Rewrite `README.md` so it reflects `src/` architecture, current tests, current workflows, and current deployment reality.
- Audit `ARCHITECTURE.md`, `CONTRIBUTING.md`, API docs, and feature claims for stale references.
- Define official project vocabulary: section, handler, service, repository, integration, plugin.
- Replace version-count bragging in docs with generated or scripted metadata where possible.
- Add a docs freshness checklist to release flow.

**Exit criteria:**

- No top-level doc references deleted legacy paths.
- No conflicting source-of-truth statements about backend, auth, or deployment.
- Contributors can understand the system without reverse-engineering old docs.

### Phase 1: Frontend Contracts and Domain Cleanup

**Goal:** Make the frontend architecture explicit and safer to evolve.

**Priority:** P0

**Deliverables:**

- Create typed domain models and constants for all major entities.
- Build a formal action registry and validate templates against it.
- Define a section contract with lifecycle hooks and optional capabilities.
- Standardize render helpers, list diffing strategy, and empty/loading/error states.
- Consolidate duplicated form logic, field metadata, and select option definitions.
- Introduce repository interfaces used by sections instead of backend-specific services.

**Exit criteria:**

- No section depends directly on Sheets or Supabase implementation details.
- `data-action` values are validated in CI.
- Option lists and domain enums exist in one place.

### Phase 2: Store V2 and Local-First Discipline

**Goal:** Make the state layer predictable under scale and navigation churn.

**Priority:** P0

**Deliverables:**

- Add batched mutations.
- Add scoped subscriptions with automatic cleanup.
- Add explicit dirty-state and sync-state metadata per domain.
- Add immutable update helpers for high-risk collections.
- Measure store behavior at realistic scales such as 500, 1,000, and 2,000 guests.
- Tighten what is persisted locally and classify stored data.

**Exit criteria:**

- Repeated navigation does not leak subscribers.
- Bulk guest updates trigger bounded render work.
- Offline queues and drafts remain intact without exposing unnecessary PII.

### Phase 3: Supabase-First Data Platform

**Goal:** End backend ambiguity.

**Priority:** P0

**Deliverables:**

- Design and migrate a normalized PostgreSQL schema.
- Introduce typed repositories for guests, tables, vendors, expenses, timeline, settings, RSVP log, audit log, and error log.
- Promote Supabase to primary write path.
- Keep Sheets only as import/export and reporting mirror.
- Add migrations, seed data, local-dev reproducibility, and repository integration tests.
- Introduce clear conflict semantics for concurrent admin edits.

**Exit criteria:**

- Supabase is authoritative.
- Sheets can be disabled without breaking core flows.
- Local dev and CI can run data-layer tests deterministically.

### Phase 4: Identity, Roles, and Secure Boundaries

**Goal:** Make authorization real instead of implied.

**Priority:** P0

**Deliverables:**

- Move social auth flows to Supabase Auth.
- Implement admin and guest roles through claims and RLS.
- Add short-lived guest access patterns for RSVP and personal lookup flows.
- Minimize client-side trust assumptions around admin approval.
- Add audit trails for privileged actions.
- Define data-access rules per role and per table.

**Exit criteria:**

- Privileged access is server-enforced.
- Guest access is narrow and explicit.
- Auth logic in the frontend is materially smaller and simpler.

### Phase 5: Security, Privacy, and Compliance-Lite Hardening

**Goal:** Make the app safe enough for real guest data.

**Priority:** P0

**Deliverables:**

- Introduce a PII handling policy and data retention policy.
- Reduce plaintext sensitive storage in browser persistence.
- Review CSP, headers, token handling, origin policy, and webhook verification.
- Add security regression tests for auth, role leakage, and unsafe DOM patterns.
- Create incident response notes for data exposure, bad sync, and broken messaging credentials.
- Add privacy-focused admin UX for export, purge, and role review.

**Exit criteria:**

- Sensitive data handling is documented, enforced, and tested.
- Security posture is based on controls, not assumptions.

### Phase 6: Premium Admin and Guest UX

**Goal:** Improve quality of experience only after platform trust is strong.

**Priority:** P1

**Deliverables:**

- Refine information architecture between guest, family, and admin surfaces.
- Upgrade seating workflows, vendor workflows, and timeline workflows for speed.
- Improve RSVP mobile UX, accessibility, and recovery from partial submissions.
- Create a clearer design system for cards, metrics, forms, toasts, and empty states.
- Add print and export polish for seating, badges, summaries, and timeline assets.
- Introduce perception-focused performance work: skeletons, optimistic states, chunk warmup.

**Exit criteria:**

- Common tasks are faster and clearer.
- Mobile admin experience is viable, not just tolerated.
- Guest RSVP flow feels premium, simple, and trustworthy.

### Phase 7: Messaging and Communication Platform

**Goal:** Turn communication into a first-class subsystem rather than scattered actions.

**Priority:** P1

**Deliverables:**

- Create a messaging domain covering invitation, reminder, follow-up, confirmation, and thank-you flows.
- Keep `wa.me` as baseline fallback.
- Add optional WhatsApp Cloud API integration via server-side functions.
- Add email sending through a server-side provider abstraction.
- Store message templates, delivery state, and retry records.
- Add campaign analytics and suppression controls.

**Exit criteria:**

- Messaging is observable, retryable, and auditable.
- Manual links remain available when automation is not configured.

### Phase 8: Observability and Operations

**Goal:** Make failures visible and diagnosable.

**Priority:** P1

**Deliverables:**

- Add structured client error capture.
- Add server-side error and audit logs.
- Add health endpoints for backend and integration surfaces.
- Build admin-facing operational dashboards for sync health, failed jobs, and integration status.
- Define release health checks and rollback guidance.

**Exit criteria:**

- The team can see failures before users report them.
- Operational issues have clear traces and remediation steps.

### Phase 9: Documentation and Contributor Experience

**Goal:** Make the project easier to maintain than to misunderstand.

**Priority:** P1

**Deliverables:**

- Split docs into product, architecture, integration, operations, and contributor tracks.
- Keep auto-generated API docs, but pair them with human-maintained architecture and operating docs.
- Add ADRs only for irreversible or expensive decisions.
- Add deployment runbooks, migration runbooks, and integration setup guides.
- Add a roadmap governance rule: completed items move out, deferred items get explicit reasons.

**Exit criteria:**

- The docs are navigable by job to be done.
- Strategic docs stop duplicating tactical docs.

### Phase 10: Ecosystem and Commercial Readiness

**Goal:** Prepare the app for reuse across multiple events without poisoning the current product with premature abstraction.

**Priority:** P2

**Deliverables:**

- Clarify whether the product remains single-event-first or becomes multi-tenant.
- Define event provisioning, billing assumptions, and tenant boundaries if productized.
- Harden plugin boundaries and supported extension points.
- Add importers and exporters that support migration from spreadsheets and external tools.
- Evaluate whether themed deployment presets or template packs are worth supporting.

**Exit criteria:**

- Reuse is intentional, not accidental.
- The app can evolve into a platform without contaminating current reliability goals.

---

## Old Roadmap Consolidation

The previous roadmap mixed completed items, active transitions, and speculative upgrades. The carry-forward items below are the ones still worth keeping.

### Carry forward unchanged

| Old theme | Keep? | Reason |
| --- | --- | --- |
| Typed contracts and stronger TS posture | Yes | Still high leverage |
| Store improvements | Yes | Needed for scale and correctness |
| Supabase-first backend | Yes | Core strategic shift |
| Realtime collaboration | Yes | Best fit once Supabase is primary |
| Better testing gates | Yes | Already partly underway, should be completed |
| Error reporting | Yes | Operational gap remains |
| WhatsApp Cloud API as optional path | Yes | Valuable if isolated behind server-side integration |

### Carry forward, but demote

| Old theme | New status | Why |
| --- | --- | --- |
| Cloudflare Pages migration | Optional | Not necessary until hosting limits are real |
| Full TypeScript conversion of every file | Selective | Better to type high-risk modules first |
| CSS modules and component-scoped CSS | Optional | Lower leverage than data and security work |
| Aggressive chunk micro-optimization | Later | Not the current bottleneck |
| Plugin ecosystem expansion | Later | Platform trust matters more than ecosystem breadth |

### Retire from active roadmap

| Old theme | Reason for retirement |
| --- | --- |
| Version-heavy sprint history in roadmap | Belongs in changelog, not strategy |
| Overly detailed completed sprint inventory | Creates maintenance noise |
| Broad claims that migration is complete when it is not | Misleading and slows correct decisions |

---

## External Services and API Strategy

Every integration should be evaluated by business value, failure mode, security posture, and replaceability.

### Keep as core

| Service | Role | Long-term status |
| --- | --- | --- |
| Supabase | Database, auth, realtime, edge functions, storage | Primary platform dependency |
| GitHub Actions | CI and deployment automation | Keep |
| GitHub Pages | Static delivery | Keep while sufficient |

### Keep as optional or transitional

| Service | Role | Long-term status |
| --- | --- | --- |
| Google Sheets Apps Script | Import, export, mirror, admin familiarity | Transitional optional integration |
| WhatsApp `wa.me` | Manual send fallback | Permanent baseline fallback |
| WhatsApp Cloud API | Automated messaging | Optional premium integration |
| Nominatim and map-related APIs | Address and map assistance | Optional utility integration |

### Reduce or remove over time

| Service | Current use | Plan |
| --- | --- | --- |
| Client-loaded Google, Facebook, Apple auth SDKs | Login flows | Replace with Supabase Auth flows |
| Direct frontend handling of secrets and provider variability | Multiple config paths | Move behind server-side boundaries |

### Integration standards

1. No integration is allowed to become a hidden source of truth.
2. Every integration must have a failure fallback or degraded mode.
3. Every integration must have ownership, setup docs, and health checks.
4. Credentials must be scoped, rotated, and excluded from the client whenever possible.

---

## Documentation Roadmap

The project needs fewer stale overview docs and stronger, better-scoped living docs.

### Proposed doc set

| Document | Purpose |
| --- | --- |
| `README.md` | Accurate project overview, setup, current architecture summary |
| `ARCHITECTURE.md` | Current system structure, boundaries, flows, and tradeoffs |
| `ROADMAP.md` | Strategic priorities and sequencing only |
| `docs/API.md` | Generated API reference |
| `docs/operations/*.md` | Deploy, rollback, incident, migrations, secrets |
| `docs/integrations/*.md` | Sheets, Supabase, WhatsApp, email, auth providers |
| `docs/adr/*.md` | Major irreversible decisions only |
| `CONTRIBUTING.md` | How to work in the repo today |

### Documentation rules

1. The roadmap is not a changelog.
2. The changelog is not an architecture document.
3. Generated docs should not carry narrative promises.
4. Human-maintained docs should not duplicate generated references.
5. Every release should include a docs accuracy pass.

### Highest-value doc improvements

- Rewrite the README first.
- Add an operations directory next.
- Add an integration matrix with setup state, owner, and risk.
- Add data model docs that explain rules, not just fields.

---

## Quality, Security, and Operations Targets

### Testing targets

| Area | Target |
| --- | --- |
| Unit and integration | Maintain high coverage with stronger repository and security tests |
| E2E browsers | Chromium, Firefox, WebKit |
| E2E flows | Guest RSVP, admin auth, sync recovery, conflict handling, offline resume |
| Accessibility | Automated gate for critical flows plus manual spot audits |
| Performance | Scenario-based benchmarks for 500 to 2,000 guests |

### Security targets

| Area | Target |
| --- | --- |
| Data exposure | Minimize sensitive browser persistence |
| Auth | Server-enforced roles and claims |
| Auditability | Admin actions logged and queryable |
| Headers and CSP | Strict, reviewed, and aligned with actual integrations |
| Secrets | Server-side wherever possible |

### Operations targets

| Area | Target |
| --- | --- |
| Error visibility | Structured client and server error pipeline |
| Sync visibility | Queue state, failed writes, retries, and drift surfaced to admins |
| Deployment safety | Repeatable health checks and rollback path |
| Release discipline | Roadmap, docs, version, migrations, and health all verified |

---

## Release Plan

This plan is outcome-based, not sprint-count-based.

| Release train | Focus | Gate |
| --- | --- | --- |
| R1 | Truth and docs reset | Docs accurate, architecture terminology stable |
| R2 | Frontend contracts and store upgrades | Action registry, section contract, store V2 |
| R3 | Supabase-first backend | Primary write path migrated, repositories tested |
| R4 | Auth and security hardening | Server-enforced roles, audit log, reduced PII persistence |
| R5 | Premium UX and messaging | Faster workflows, optional Cloud API messaging, polished guest flow |
| R6 | Observability and platform readiness | Error pipeline, health dashboards, mature operations docs |

### Recommended sequencing

1. Do not start large UX rewrites before R2 and R3 are stable.
2. Do not expand integrations before R4 defines trust boundaries.
3. Do not productize multi-event or tenant-level abstractions before R6.

---

## Success Metrics

### Product metrics

- RSVP completion rate.
- Admin task completion time for common tasks.
- Seating workflow time and error rate.
- Message delivery success and recovery rate.

### Engineering metrics

- Time to diagnose sync failures.
- Number of stale docs found during release.
- E2E flake rate.
- Mean bundle size trend.
- Time to add a new section or major field without regressions.

### Trust metrics

- Number of privileged operations with audit coverage.
- Percentage of sensitive data persisted locally.
- Number of auth or policy bypass defects.
- Recovery success after offline or conflict scenarios.

---

## Non-Negotiables

1. Zero runtime dependencies remains a product constraint.
2. All user-facing strings stay under i18n discipline.
3. No unsanitized HTML injection.
4. Security and privacy work is not optional polish.
5. Docs must match the repository, not aspirations.
6. One source of truth per subsystem.
7. New features do not outrank platform trust until the backend and auth story are coherent.

---

## Appendix A: Toolchain Audit and Version Strategy

### Current toolchain (as of v6.0.0)

| Tool | Current version | Role | Assessment |
| --- | --- | --- | --- |
| Vite | ^8.0.8 | Build, dev server, HMR | Keep — best ESM-native bundler |
| Vitest | ^4.1.4 | Unit and integration tests | Keep — fast, Vite-compatible |
| Playwright | ^1.59.1 | E2E browser tests | Keep — extend to Firefox and WebKit |
| ESLint | ^10.2.0 (flat config) | JS lint | Keep — review rules annually |
| Stylelint | ^17.7.0 | CSS lint | Keep |
| HTMLHint | ^1.9.2 | HTML lint | Keep |
| markdownlint-cli2 | ^0.22.0 | Markdown lint | Keep |
| @axe-core/playwright | ^4.10.2 | Accessibility | Underused — promote to CI gate |
| @vitest/coverage-v8 | ^4.1.4 | Coverage | Keep — thresholds enforced |
| web-push | ^3.6.7 | Push notification tooling | Keep for scripts |
| TypeScript | via checkJs + tsconfig | Type checking | Upgrade to full `.ts` for core modules |
| Node.js | >=20 (CI: 22 + 24) | Runtime for CI and scripts | Keep — evaluate Node 24 LTS adoption |

### Version policy

- Pin major versions in `package.json` using caret ranges.
- Run `npm audit` monthly and in CI.
- Upgrade Playwright and Vitest with each release train.
- Track Vite major releases and evaluate within 30 days of release.
- Never add runtime dependencies. Dev dependencies are infrastructure, not product.

### Tools to evaluate

| Tool | Purpose | When to evaluate |
| --- | --- | --- |
| Workbox (build-time) | Generated SW precache manifest | Phase 2 (store and cache discipline) |
| supabase CLI | Local dev, migrations, type generation | Phase 3 (Supabase-first backend) |
| @typescript-eslint | Parser and rules for `.ts` files | Phase 1 (typed domain contracts) |
| Lighthouse CI | Automated performance and a11y budget | Already in CI — tighten thresholds |
| Bundlewatch or size-limit | Bundle budget enforcement | Phase 2 |

---

## Appendix B: Database and Schema Design

### Current state

Six SQL migrations exist in `supabase/migrations/`:

| Migration | Content |
| --- | --- |
| `001_create_tables.sql` | 10 tables: guests, tables, vendors, expenses, budget, timeline, contacts, gallery, config, rsvp_log |
| `002_rls_policies.sql` | RLS enabled on all tables; `is_admin()` helper; admin full access; anon read/update guests, insert contacts and rsvp_log |
| `003_triggers.sql` | `updated_at` auto-touch trigger |
| `004_audit_log.sql` | Audit log table for admin action tracking |
| `005_error_log.sql` | Client error capture table |
| `006_weddinginfo_config.sql` | JSONB config approach |

### Schema gaps to address in Phase 3

| Gap | Detail | Fix |
| --- | --- | --- |
| No FK from guests to tables | `table_id TEXT` with no constraint | Add `REFERENCES tables(id) ON DELETE SET NULL` |
| No unique constraint on guest phone | Duplicates possible at DB level | Add conditional unique index `WHERE phone != ''` |
| Config as key-value vs JSONB | Migration 006 exists but client still uses KV | Complete JSONB migration and client code path |
| No pagination support | All reads are `SELECT *` | Add cursor-based pagination for guests and rsvp_log |
| No event scoping | Tables are single-event | Add `event_id TEXT` column for multi-event support in Phase 10 |
| No soft delete | Hard deletes lose audit trail | Add `deleted_at TIMESTAMPTZ` and filter active rows |

### Target schema principles

1. All tables have `id TEXT PRIMARY KEY`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
2. All enum columns use `CHECK` constraints matching TypeScript union types.
3. All foreign keys are explicit with appropriate cascade behavior.
4. Indexes exist for every column used in WHERE, ORDER BY, or JOIN.
5. RLS policies enforce admin/guest/anon boundaries at the database level.
6. Migrations are idempotent and forward-only.

---

## Appendix C: Code Architecture and Methods

### Current module inventory

| Layer | Modules | Primary patterns |
| --- | --- | --- |
| Core | config, constants, defaults, dom, events, i18n, nav, nav-auth, plugins, section-resolver, state, status-bar, storage, store, template-loader, ui, whats-new, conflict-resolver | Singleton services, pure functions, Proxy reactive store |
| Handlers | guest-handlers, table-handlers, vendor-handlers, section-handlers, settings-handlers, event-handlers, auth-handlers | Action registration via `on(action, fn)` |
| Sections | 20 modules with mount/unmount lifecycle | Render functions, store subscriptions, DOM manipulation |
| Services | auth, backend, offline-queue, presence, sheets, sheets-impl, supabase | Async fetch, lazy imports, dispatcher pattern |
| Utils | date, form-helpers, misc, phone, sanitize, undo, error-monitor | Pure functions, no state |
| Plugins | contact-plugin, gallery-plugin, registry-plugin | `registerPlugin()` with mount/unmount/i18n |

### Key architectural patterns in use

- **Event delegation:** Single document listener routes `data-action` clicks through `events.js`.
- **Reactive store:** Proxy-based `store.js` with batched notifications and scoped subscriptions.
- **Lazy templates:** HTML fragments loaded via `import.meta.glob` on first section visit.
- **Backend dispatcher:** `backend.js` routes sync calls to sheets or supabase based on runtime config.
- **Section lifecycle:** Each section exports `mount(container)` and `unmount()` with capability metadata.
- **Sanitize-at-boundary:** `sanitize(input, schema)` validates all user input at entry points.
- **i18n everywhere:** `t(key)` in JS, `data-i18n` in HTML, ICU plural support.

### Patterns to introduce or strengthen

| Pattern | Description | Phase |
| --- | --- | --- |
| Repository interface | Abstract data access behind `GuestRepository`, `TableRepository`, etc. Sections call repositories, not backend services. | Phase 1 |
| Domain service | Business logic functions that operate on typed domain objects, independent of UI or persistence. | Phase 1 |
| Action registry | Typed map of action names to handler functions, validated at build time against templates. | Phase 1 |
| Optimistic update | Apply mutation to local store immediately, reconcile after server response. | Phase 2 |
| Immutable update | Helper functions that return new arrays/objects instead of mutating in place. | Phase 2 |
| Command/query separation | Distinguish write operations (commands) from read operations (queries) at the repository level. | Phase 3 |
| Conflict resolution protocol | Standardized compare-and-merge logic using `updated_at` timestamps and field-level diffing. | Phase 3 |

### What the codebase should stop doing

- Sections should not import from `sheets.js` or `supabase.js` directly.
- Backend selection logic should not live in section code.
- Form field metadata should not be duplicated across section renderers.
- Magic strings for section names, action names, and storage keys should be replaced with typed constants.
- `load()` from `state.js` should not be used alongside `storeGet()` in section code.

---

## Appendix D: TypeScript Migration Strategy

### Current state

- `tsconfig.json` has `strict: true`, `checkJs: true`, `target: "ES2022"`, `lib: ["ES2023", "DOM"]`.
- `src/types.d.ts` defines 15+ typed interfaces with discriminated union enums.
- All `.js` files are type-checked via `tsc --noEmit` in CI.
- `@type` JSDoc annotations are used throughout but some are weak (`any`, `unknown`).

### Migration approach: incremental, not big-bang

| Priority | Modules | Rationale |
| --- | --- | --- |
| P0 — Convert first | `src/core/store.js`, `src/core/config.js`, `src/core/constants.js`, `src/types.d.ts` | These define the contracts everything else depends on |
| P0 — Convert next | `src/services/backend.js`, `src/services/supabase.js`, `src/services/auth.js` | External boundaries carry the most type-safety value |
| P1 — Convert when touched | `src/utils/*`, `src/handlers/*` | Convert during normal feature work |
| P2 — Convert last | `src/sections/*` | Presentation modules have lowest conversion urgency |

### Rules for the migration

1. New files must be `.ts`.
2. Files being significantly refactored should be renamed to `.ts` as part of the refactoring.
3. No `any` casts without a paired comment explaining why.
4. Domain types in `types.d.ts` (or `.ts`) are the single source of truth.
5. `tsc --noEmit` must remain a blocking CI step.

---

## Appendix E: External APIs and Integration Matrix

### Active integrations

| Integration | Current use | Client or server | Auth method | Free tier | Risk |
| --- | --- | --- | --- | --- | --- |
| Google Apps Script | Primary sync (sheets) | Client fetch | Public Web App URL | Yes | URL hardcoded, rate limits, no transactions, schema drift |
| Google GIS SDK | OAuth login | Client SDK load | OAuth client ID | Yes | Unpinned CDN version, provider can break silently |
| Facebook JS SDK | OAuth login | Client SDK load | App ID | Yes | Same CDN risk, GDPR consent concerns |
| Apple SignIn SDK | OAuth login | Client SDK load | Service ID | Yes | Same CDN risk |
| Supabase PostgREST | Data sync (partial) | Client fetch | Anon key | 500 MB DB free | Not yet primary, key exposed in client |
| Supabase Edge Functions | Health check, RSVP email | Client fetch | Function URL | Free tier | Not yet configured in production |
| Nominatim (OSM) | Address geocoding | Client fetch | None | Yes | Rate limited, no SLA |
| WhatsApp `wa.me` | Message deep links | Client-side URL | None | Yes | Manual, no delivery tracking |

### Target integration model

| Integration | Target role | Client or server | Timeline |
| --- | --- | --- | --- |
| Supabase Auth | Primary identity provider | Server-side (Supabase hosted) | Phase 4 |
| Supabase Postgres | Primary database | Server-side via PostgREST | Phase 3 |
| Supabase Realtime | Live collaboration | Client WebSocket | Phase 3 |
| Supabase Edge Functions | Trusted server-side operations | Server-side | Phase 3 onward |
| Google Sheets | Optional export/mirror | Server-side Edge Function | Phase 3 |
| WhatsApp Cloud API | Optional automated messaging | Server-side Edge Function | Phase 7 |
| Email provider (Resend, etc.) | RSVP confirmations | Server-side Edge Function | Phase 7 |
| Client-loaded OAuth SDKs | Remove | Not applicable | Phase 4 |

### Integration safety rules

1. Never expose service-role keys in client code.
2. Every integration must have a health check callable from the admin dashboard.
3. Every integration must degrade gracefully when unavailable.
4. API credentials should be environment variables, not hardcoded config.
5. Rate-limited APIs must have client-side backoff and queue discipline.

---

## Appendix F: Infrastructure and Deployment

### Current deployment

| Component | Platform | Cost |
| --- | --- | --- |
| Static hosting | GitHub Pages via `deploy.yml` | $0 |
| CI/CD | GitHub Actions (6 jobs) | $0 (free tier) |
| Database | Not yet deployed (Supabase free tier planned) | $0 |
| CDN | GitHub Pages built-in | Included |
| DNS | GitHub Pages default domain | $0 |
| Secrets | GitHub Actions secrets for OAuth IDs and Sheets URLs | Included |

### Current CI pipeline

```text
push to main
  -> lint-and-test (Node 22 + 24 matrix)
       -> lint:html, lint:css, lint:js, lint:md
       -> tsc --noEmit (type check)
       -> validate (action registry)
       -> validate:i18n (locale parity)
       -> vitest run (1957 tests)
       -> vite build
       -> coverage report (Node 22 only)
  -> security-scan
       -> npm audit
       -> grep for eval, innerHTML, document.write, javascript: URIs
       -> check for inline scripts in index.html
  -> lighthouse (main branch only)
  -> size-report (bundle budget: 50 KB gzip hard limit)
  -> e2e (Chromium only, main branch only)
```

### Infrastructure improvements by phase

| Phase | Change | Rationale |
| --- | --- | --- |
| Phase 0 | No infrastructure changes | Focus on docs accuracy |
| Phase 2 | Add bundle budget enforcement with explicit size-limit config | Prevent regression |
| Phase 3 | Provision Supabase project; add `supabase` CLI to CI for migration validation | Database-first development |
| Phase 3 | Add Supabase local dev setup (`supabase start`) to CONTRIBUTING.md | Reproducible dev environment |
| Phase 4 | Configure Supabase Auth providers (Google, Facebook, Apple) | Server-side identity |
| Phase 5 | Review and tighten `_headers` CSP after removing client-loaded OAuth SDKs | Reduced attack surface |
| Phase 7 | Deploy Edge Functions for messaging (WhatsApp, email) | Server-side trusted operations |
| Phase 8 | Add error log and health dashboard Edge Functions | Operational visibility |

### Hosting decision tree

Stay on GitHub Pages unless one of these becomes a real blocker:

1. Need for server-side redirects beyond `_headers` capability.
2. Need for branch preview deployments for PRs.
3. Need for edge-computed responses (SSR, dynamic OG images).
4. CDN performance issues for target audience.

If any of these trigger, evaluate Cloudflare Pages first (free, similar model, better header control).

---

## Appendix G: Security Posture Assessment

### Current security controls

| Control | Status | Strength |
| --- | --- | --- |
| CSP via `_headers` | Implemented | Good — but overly permissive `connect-src` due to Sheets and OAuth |
| `X-Frame-Options: DENY` | Implemented | Strong |
| `X-Content-Type-Options: nosniff` | Implemented | Strong |
| `Referrer-Policy: strict-origin-when-cross-origin` | Implemented | Adequate |
| `Permissions-Policy` | Implemented (camera, mic, geo denied) | Good |
| No `innerHTML` with unsanitized data | Enforced in CI security scan | Strong |
| No `eval()` | Enforced in CI security scan | Strong |
| `sanitize(input, schema)` at boundaries | Implemented in code | Good pattern, needs wider adoption |
| SRI hashing | Build-time generation | Good |
| Session rotation | Every 2 hours for admin sessions | Adequate |

### Security gaps to close

| Gap | Risk | Fix | Phase |
| --- | --- | --- | --- |
| Guest PII in plaintext localStorage/IndexedDB | XSS reads full guest list | Encrypt sensitive fields with Web Crypto AES-GCM or move to server-only access | Phase 5 |
| OAuth SDKs from unpinned CDNs | Supply chain attack vector | Replace with Supabase Auth (no client SDK loading) | Phase 4 |
| Supabase anon key in client | Key exposure allows PostgREST access | RLS policies must assume anon key is public; restrict to minimum viable permissions | Phase 4 |
| Apps Script URL hardcoded | If redeployed, all clients break | Move to server-configurable URL or eliminate Sheets as primary | Phase 3 |
| No CSP `report-uri` or `report-to` | CSP violations invisible | Add reporting endpoint via Edge Function | Phase 5 |
| Admin allowlist only in client | Client can be bypassed | Enforce via Supabase RLS `is_admin()` function | Phase 4 |
| No rate limiting on client-side operations | Abuse potential | Add rate limiting at Edge Function level | Phase 5 |

---

## Appendix H: Data Model Detailed Review

### Guest model gaps

| Field | Issue | Recommendation |
| --- | --- | --- |
| `phone` | No format validation at DB level | Add CHECK constraint for E.164 format or allow empty |
| `accessibility` | String field, no structure | Consider structured options or keep freeform with documented convention |
| `transport` | String field, no enum | Define transport options if they are finite |
| `tags` | JSONB array, no validation | Add application-level schema validation |
| `history` | JSONB array of notes | Consider separate `guest_notes` table for queryability |
| `gift` | Freeform string | Consider structured `gift_amount` (numeric) + `gift_notes` (text) |
| Missing: `plus_one_names` | Plus-ones referenced in UI but not in base model | Add structured field or relation |
| Missing: `dietary_allergies` | Separate from meal preference | Add dedicated field or merge into `mealNotes` convention |

### Table model gaps

| Field | Issue | Recommendation |
| --- | --- | --- |
| No `zone` or `location` | Tables have no spatial metadata | Add optional zone/area field for venue mapping |
| No `assignment_priority` | Smart assign uses hardcoded rules | Add configurable priority field |

### Vendor model gaps

| Field | Issue | Recommendation |
| --- | --- | --- |
| `category` | Freeform string | Define enum or allow custom with suggested defaults |
| No `status` field | No way to mark vendor as confirmed, pending, cancelled | Add status enum |
| No `payment_schedule` | Single `paid` field insufficient for installments | Consider `vendor_payments` relation table |

### Cross-model consistency

- All models should use the same timestamp format (ISO 8601 / TIMESTAMPTZ).
- All models should have `created_at` and `updated_at` managed by database triggers.
- ID generation should be consistent: currently client-generated UUIDs via `uid()`.
- Consider server-generated UUIDs for Supabase-primary tables using `gen_random_uuid()`.

---

## Final Direction

The right next move is not a glamorous rewrite. It is a deliberate consolidation.

The project already proved that a zero-runtime-dependency wedding app can be ambitious. The next step is proving it can also be operationally mature, secure, typed where it matters, and clear about its system boundaries.

If we execute this roadmap in order, the application will stop feeling like a very good side project and start behaving like a disciplined product platform.

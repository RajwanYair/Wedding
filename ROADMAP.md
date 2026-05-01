# Wedding Manager — Roadmap v29.0.0 (2026 Best-in-Class Refresh)

> Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · History: [CHANGELOG.md](CHANGELOG.md) ·
> Contributors: [CONTRIBUTING.md](CONTRIBUTING.md) · ADRs: [docs/adr/](docs/adr/) ·
> Operations: [docs/operations/](docs/operations/)

This document is a **deep, full-stack re-evaluation of every architecturally significant decision**
in the project — frontend, backend, language, docs, build tooling, configuration, external APIs,
database, and infrastructure — including decisions previously sealed as "clean" or "done." Nothing
is grandfathered. The goal is a **best-in-class, Hebrew-first RTL, offline-first, WhatsApp-native,
open-source, self-hostable wedding management platform** with a bundle 5–10× smaller than every
commercial competitor.

This roadmap **supersedes and consolidates** the prior v13.21 roadmap. Decisions and sprints from
the prior plan that are now done are recorded in §17 ("Done — Carried Forward"); only live items
flow into the forward plan.

---

## Contents

0. [Executive Summary](#0-executive-summary-tldr)
1. [North Star & Current State (v29.0.0)](#1-north-star--current-state-v2900)
2. [Re-opened Decisions — Master Verdict Matrix](#2-re-opened-decisions--master-verdict-matrix)
3. [First-Principles Rethink — If We Built Today (mid-2026)](#3-first-principles-rethink--if-we-built-today-mid-2026)
4. [Competitive Landscape & Harvest Matrix](#4-competitive-landscape--harvest-matrix)
5. [Honest Audit by Layer](#5-honest-audit-by-layer)
6. [Lessons Learned](#6-lessons-learned)
7. [Technical Debt & Risk Register](#7-technical-debt--risk-register)
8. [Improve / Rewrite / Refactor / Enhance](#8-improve--rewrite--refactor--enhance)
9. [Phased Plan v30 → v36](#9-phased-plan-v30--v36)
10. [Sprint Backlog — Next 30 Sprints](#10-sprint-backlog--next-30-sprints)
11. [Migration Playbooks](#11-migration-playbooks)
12. [Cost & Self-Hosting Profile](#12-cost--self-hosting-profile)
13. [Success Metrics & SLOs](#13-success-metrics--slos)
14. [Open Decisions Register](#14-open-decisions-register)
15. [Working Principles](#15-working-principles)
16. [Release Line](#16-release-line)
17. [Done — Carried Forward (v13 → v29)](#17-done--carried-forward-v13--v29)

---

## 0. Executive Summary (TL;DR)

**State (2026-05-01, v29.0.0):**

- **5341 tests** across **365** files · 0 lint errors · 0 warnings · 0 Node warnings
- **24** sections · **25** services · **11** repositories · **7** handlers · **31** core modules ·
  **130** utilities · **26** Supabase migrations · **12** edge functions · **6** locales
  (HE · EN · AR · FR · ES · RU)
- `BACKEND_TYPE = "supabase"` (primary, runtime); Sheets demoted to import/export
- Auth: email allowlist + Google + Apple OAuth (Facebook removed); anonymous guest default
- Bundle target ≤ 60 KB gzip (hard CI gate); WCAG 2.2 AA + axe-zero; Lighthouse ≥ 95
- pushState router · View Transitions API · native `<dialog>` modals · Preact Signals store
- Offline: Service Worker strategy cache + IDB queue + Background Sync API
- 7 GitHub Actions workflows · CodeQL · OpenSSF Scorecard · CycloneDX SBOM · Trivy weekly · OIDC
- GitHub Pages canonical · MIT licence · zero-telemetry pledge

### The five highest-leverage decisions this cycle

1. **Audit & consolidate the 130-utility sprawl** — pre-emptive over-engineering risk.
   Cull, merge, or wire every util; cap at ≤ 100 with `audit:utils` in CI.
2. **Re-open the language decision: pilot TypeScript on new files** via opt-in ADR.
   With TSC at 0 errors, the migration cost surface has narrowed; quantify in v30.
3. **Plugin / theme marketplace + public REST API** — convert the OSS moat into a platform.
4. **Native mobile (Capacitor) + iOS/Android signing pipeline** — close the only gap
   competitors win on (PWA install rates plateau ~30%).
5. **AI edge proxy (BYO key, multi-provider, streaming)** — finally wire the prompt-builders.

### Top 3 unique advantages to defend

1. **Bundle ≤ 60 KB gzip** — 5–10× smaller than every competitor. Hard CI gate, immutable.
2. **WhatsApp-native** — only category app shipping WhatsApp Cloud API + bulk + delivery webhooks.
3. **MIT + self-hostable + offline-first + RTL-first** — privacy, portability, locale moat.

---

## 1. North Star & Current State (v29.0.0)

### North Star

*The fastest, most accessible, RTL-native, offline-first, open-source wedding manager on the web.
Self-hostable in one click. Operable on flaky 3G in Hebrew. Integrated end-to-end with WhatsApp.
Planner-grade analytics. AI-optional, privacy-first. A bundle 5–10× smaller than every commercial
competitor. $0/month self-hosted.*

### Quality bar — every PR

| Gate | Threshold |
| --- | --- |
| `npm run lint` | 0 errors, 0 warnings, 0 Node warnings |
| `npm test` | All suites pass; 0 skipped |
| `npm run build` | Exits 0; bundle ≤ 60 KB gzip (CI hard gate) |
| `npm run audit:arch` | 0 violations |
| `npm run check:i18n` | 100% parity across all 6 locales |
| `npm run check:credentials` | 0 plaintext secrets |
| Lighthouse CI | ≥ 95 on perf · a11y · best-practices · SEO |
| axe-core (Playwright) | 0 violations on every locale |
| Coverage | ≥ 80% lines, ≥ 75% branches (enforced) |
| TypeScript (`tsc --noEmit`) | 0 errors against `types.d.ts` |

### Live state matrix

| Dimension | Value | Health |
| --- | --- | --- |
| Tests | 5341 / 365 files / 0 Node warnings | ✅ |
| Sections | 24 (BaseSection lifecycle) | ✅ |
| Services | 25 (target ≤ 25 held) | ✅ |
| Utilities | 130 | ⚠ audit & cap |
| Repositories | 11 (mandatory data path) | ✅ |
| Handlers | 7 | ✅ |
| Core modules | 31 | ✅ |
| Locales | 6 (HE · EN · AR · FR · ES · RU) | ✅ |
| Migrations | 26 (Supabase) | ✅ |
| Edge functions | 12 (csp-report, gdpr-erasure, guest-lookup, health, push-dispatcher, rsvp-email, rsvp-webhook, send-email, sync-to-sheets, waba-bulk-send, whatsapp-send, error-receiver) | ✅ |
| Active backend | `BACKEND_TYPE = "supabase"` | ✅ |
| Auth | Email allowlist + Google + Apple + anonymous guest | ✅ |
| Realtime | Supabase Realtime active (presence + counters) | ✅ |
| Router | pushState + typed routes + View Transitions | ✅ |
| Modals | Native `<dialog>` (8 modals) | ✅ |
| State | Preact Signals reactive store | ✅ |
| Storage | IndexedDB primary + AES-GCM PII at rest | ✅ |
| Offline queue | IDB-persistent + Background Sync | ✅ |
| Service Worker | Strategy cache (5-mode) + precache + queue flush | ✅ |
| Monitoring | Glitchtip/Sentry adapter (DSN env-driven) | ✅ |
| CI/CD | OIDC tokens (no long-lived PATs) | ✅ |
| Trusted Types | Enforced in production CSP | ✅ |
| Bundle | ~50 KB gzip (gate ≤ 60 KB) | ✅ |
| Mobile | PWA only — no Capacitor build | ⚠ |
| Public API | None | ⚠ |
| Plugin marketplace | Manifest validated; runtime not wired | ⚠ |
| AI | Prompt-builders + adapters; edge proxy not deployed | ⚠ |
| Compliance pack | GDPR erasure edge function only | ⚠ |
| Visual regression | Playwright smoke + per-section baseline | ✅ |
| Mutation testing | Stryker pilot on `core/` + `repositories/` | ✅ |

---

## 2. Re-opened Decisions — Master Verdict Matrix

> **Every architecturally significant decision is re-opened from scratch — May 2026.**
> Verdict columns: **KEEP**, **EVOLVE** (refine, no rewrite), **REPLACE** (rewrite), **DROP**.
> Each REPLACE / DROP requires an ADR before implementation work begins.

### 2.1 Frontend — runtime, build, UI primitives

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 1 | UI runtime (vanilla ES2025, no framework) | Active | **KEEP** | Bundle moat indefensible with any framework. Re-validated annually. |
| 2 | Reactive state (Preact Signals 1.x, ~3 KB) | Active (S400) | **KEEP** | Explicit, 0-overhead, drop-in for the prior Proxy store. |
| 3 | Build tool (Vite 8) | Active | **EVOLVE → Vite 9 (Rolldown) once stable** | In-place upgrade; Rolldown reduces CI build time ~40%. |
| 4 | Build runtime (Node 22 LTS) | Active | **EVOLVE → Node 24 LTS Q4 2026** | Track LTS; pin in `.nvmrc` and CI. |
| 5 | Local dev runtime (Bun) | Not used | **EVOLVE — adopt for `bun test` locally** | ~4× faster locally; CI stays Node for stability. |
| 6 | CSS architecture (`@layer` + nesting + `@scope`) | Active | **KEEP + extend** | Native primitives outpace every CSS library at our scale. |
| 7 | CSS modern primitives (container-q, `light-dark()`, `color-mix()`) | Partial | **EVOLVE — finish coverage** | Free wins; zero dep cost. |
| 8 | Tailwind / Panda / UnoCSS | Not adopted | **DROP — permanent reject** | Token system already CSS-var-based; Tailwind v4 adds ~4 KB. |
| 9 | Web Components | Not used | **EVOLVE — adopt for atomic primitives only** | `<wedding-badge>`, `<rsvp-pill>`, `<table-card>` — not sections. |
| 10 | Routing (`pushState` + typed routes + View Transitions) | Active (S390–392) | **KEEP** | Solved. Maintain typed-route table. |
| 11 | Modals (native `<dialog>` + Popover API) | Active (S402–403) | **KEEP** | Solved. Removed focus-trap polyfill. |
| 12 | Animation (CSS + View Transitions API) | Active | **EVOLVE — Animation Timeline API** | Scroll-driven section reveals; 0 KB JS cost. |
| 13 | Virtual scrolling (manual DOM, no library) | Active in Guests | **EVOLVE — extend to Vendors + RSVP_Log** | Threshold 200 rows. |
| 14 | URL filter state | Active | **KEEP** | Power-user table-stakes. |
| 15 | Error boundaries (BaseSection level) | Active (S380) | **KEEP** | Section crash isolated; toast fallback. |
| 16 | Font strategy (system stack) | Active | **KEEP** | HE RTL renders best with system fonts; zero font-load. |
| 17 | Print pipeline (`services/print-rows.js`) | Wired | **EVOLVE — add seating cards + dietary cards UI triggers** | Service is built; add UI. |
| 18 | Structured data (JSON-LD `Event` schema) | Not added | **EVOLVE — add to public website builder** | SEO + rich results. |
| 19 | Visual regression baseline | Per-section + per-theme | **KEEP — extend per-locale (HE/AR RTL parity)** | RTL leadership defended in CI. |
| 20 | UI delegation (`data-action` namespacing) | Active | **KEEP** | `module:action` enforced. |

### 2.2 Backend, Data, Auth

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 21 | Primary backend (Supabase Postgres + RLS) | Active (S396) | **KEEP + harden** | Solved. Add cross-region read replicas Phase E. |
| 22 | DB indexing (composite on every `event_id` FK) | Done (S382) | **KEEP** | Re-audit on every new table. |
| 23 | Soft delete + 90-day hard-delete cron | Active | **KEEP** | Retention policy caps storage; undo retains tombstones. |
| 24 | Edge runtime (Supabase Edge primary; CF Workers fallback) | Hybrid | **EVOLVE — split LLM proxy + heavy CPU to CF Workers** | Free 100 K/day; faster cold start. |
| 25 | Auth (Supabase Auth: Google + Apple + email allowlist) | Active | **KEEP + add WebAuthn passkeys** | Passkeys for admin; biometric kiosk unlock. |
| 26 | Auth admin model (`admin_users` table + RLS) | Active (S386) | **KEEP** | Co-planner change requires zero deploy. |
| 27 | Storage primary (IndexedDB + AES-GCM at rest) | Active (S393) | **KEEP** | 5 MB cap retired; PII encrypted. |
| 28 | Offline write queue (IDB + Background Sync API) | Active (S394) | **KEEP** | Survives page crash. |
| 29 | Realtime (Supabase Realtime: presence + counters) | Active | **EVOLVE — add live RSVP feed + conflict resolver UI** | Differentiator already built; expose more. |
| 30 | File storage (Supabase Storage + signed URLs) | Active | **EVOLVE — Cloudflare image transforms in front** | Same provider; CDN-delivered. |
| 31 | Secrets (GitHub Secrets + Actions OIDC) | Active | **KEEP** | OIDC tokens are short-lived; no rotation. |
| 32 | Database lint (`supabase db lint` in CI) | Active | **KEEP** | Catches RLS / NULL / FK gaps before merge. |
| 33 | CRDT | Not used | **DROP — permanent reject** | Realtime + last-write-wins suffices at couple+planner scale. |
| 34 | Multi-tenant model | Single-tenant per deploy | **EVOLVE — `org_id` + RLS for SaaS path** | Optional Phase D; self-host stays single-tenant. |
| 35 | Audit log surface | Tables exist; UI absent | **EVOLVE — Settings → Audit log viewer** | Required for SOC 2 / GDPR posture. |

### 2.3 Code Language & Quality

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 36 | Code language (JS + JSDoc-strict + `types.d.ts` + `checkJs`) | TSC = 0 errors | **EVOLVE — pilot `.ts` for new files via opt-in ADR** | At 0 TSC errors the migration cost is now containable; quantify in Phase A. |
| 37 | Validation (Valibot 100% boundary coverage) | Active | **KEEP** | 1 KB; same DX as Zod. |
| 38 | Sanitization (DOMPurify + Trusted Types) | Active | **KEEP** | XSS depth-defence enforced in CSP. |
| 39 | Linting (ESLint 10 flat) | Active | **EVOLVE — Biome as supplemental local speed check** | ESLint depth + Biome speed. |
| 40 | Formatting (Prettier) | Active | **KEEP** | Single source for code style. |
| 41 | Architecture enforcement (`arch-check.mjs --strict`) | Active | **KEEP + extend handler→repo contract enforcement** | Section → handler → repo → service is canonical. |
| 42 | Dead-export audit | Gated 0 | **KEEP** | Prevents dead-code accumulation. |
| 43 | Coverage gate (≥ 80% lines / 75% branches) | Enforced | **KEEP — ratchet upward** | Floor never drops. |
| 44 | JSDoc gate (eslint-plugin-jsdoc) | All `src/` | **KEEP** | 100% function coverage required. |
| 45 | Mutation testing (Stryker on `core/` + `repositories/`) | Active | **EVOLVE — extend to handlers + critical utils** | Reveals tests passing on dead code. |
| 46 | **Utility sprawl audit (130 files)** | New concern | **REPLACE — inventory + cull + cap ≤ 100; `audit:utils` in CI** | S444→S553 expansion accumulated debt; some utils are unused. |

### 2.4 Build, Test, Tooling

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 47 | Bundler (Vite 8) | Active | **EVOLVE — Vite 9 (Rolldown) when stable** | In-place. |
| 48 | Code splitting (dynamic `import()` only; no `manualChunks`) | Active (S385) | **KEEP** | Vite tree-shakes better than manual config. |
| 49 | Package manager (npm 11) | Active | **EVOLVE — pnpm pilot in CI-only mode** | Phantom-dep blocking; shared `node_modules/` migration plan. |
| 50 | Test runner (Vitest 4) | Active | **KEEP** | `pool: forks` is the only stable mode for happy-dom. |
| 51 | E2E (Playwright + axe + visual reg) | Active | **EVOLVE — full RSVP + offline + multi-event + per-locale a11y** | One smoke is not a regression suite. |
| 52 | Performance test (Lighthouse CI hard gate ≥ 95) | Active | **EVOLVE — per-locale + per-theme matrix** | RTL parity defended pixel-for-pixel. |
| 53 | Service Worker (custom strategy cache) | Active | **EVOLVE — Workbox patterns without the dep** | Adopt patterns; reject the 30 KB. |
| 54 | PWA (manifest + share target + protocol handlers) | Active | **EVOLVE — Badge API + Periodic Sync + Push payload encryption** | 2026 PWA baseline. |
| 55 | GitHub Actions (7 workflows + OIDC) | Active | **KEEP + add Trivy daily + ZAP weekly** | Static + runtime defence. |
| 56 | Dependabot (grouped) | Active | **KEEP** | Weekly cadence. |
| 57 | Stryker mutation gate | Active | **KEEP — score ≥ 70%** | Floor never drops. |
| 58 | Bundle budget (`scripts/bundle.budget.json`) | Active | **KEEP — ≤ 60 KB gzip immutable** | Bundle moat is the moat. |

### 2.5 Infrastructure & Hosting

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 59 | Hosting (GitHub Pages canonical) | Active | **KEEP — add Cloudflare proxy** | Brotli, HTTP/3, DDoS, image transforms; free. |
| 60 | Custom domain | Not acquired | **EVOLVE — acquire short vanity domain ($10/yr)** | Memorable RSVP URLs. |
| 61 | Self-host templates | Not built | **EVOLVE — 1-click deploy to Vercel · Netlify · CF · Render** | Required for enterprise self-host adoption. |
| 62 | Monitoring (Sentry/Glitchtip) | Active (DSN env) | **KEEP + add UptimeRobot free** | Free 50-monitor, 5-min checks. |
| 63 | Multi-region | Single region | **EVOLVE — region pick on self-host (GDPR data-residency)** | Phase E. |
| 64 | Incident runbook | `docs/operations/` exists | **EVOLVE — quarterly chaos drill** | Test the runbook; don't just write it. |

### 2.6 i18n & Accessibility

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 65 | i18n format (flat JSON + ICU MessageFormat for HE/AR plurals) | Partial | **EVOLVE — finish ICU coverage on HE + AR** | Plural forms not expressible in flat strings. |
| 66 | Locales (HE · EN · AR · FR · ES · RU) | 6 active | **EVOLVE — community pipeline for additional languages** | Lower the bar to add a locale. |
| 67 | Locale fallback (HE primary; per-key EN fallback) | Active | **KEEP** | Prevents blank strings. |
| 68 | RTL testing (Playwright per-locale) | Active | **KEEP — pixel delta < 5% HE↔EN** | RTL leadership claim defended. |
| 69 | Accessibility (WCAG 2.2 AA + axe-zero) | Active | **EVOLVE — real Hebrew screen-reader test (NVDA + VoiceOver)** | axe catches syntax; SR catches semantics. |
| 70 | Reduced-motion / high-contrast | Partial | **EVOLVE — full coverage on every section** | OS preferences honoured everywhere. |

### 2.7 External APIs & Integrations

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 71 | WhatsApp (`wa.me` + WABA helper + Cloud API edge fn) | Active | **EVOLVE — bulk sender UI + delivery webhooks + A/B** | Cloud API is wired; expose more in UI. |
| 72 | Google OAuth (via Supabase Auth) | Active | **KEEP** | Three SDKs removed; uniform JWT. |
| 73 | Apple OAuth (via Supabase Auth) | Active | **KEEP** | Same as above. |
| 74 | Facebook OAuth | Removed | **KEEP — permanent drop** | < 2% adoption; GDPR cost too high. |
| 75 | AI / LLM (BYO key edge proxy, multi-provider, streaming) | Adapters built; proxy not deployed | **REPLACE — deploy CF Worker proxy + Ollama local opt-in** | Phase A. |
| 76 | Payments (deep links Bit/PayBox/PayPal + Stripe Checkout for vendors) | Partial | **EVOLVE — Stripe Connect + receipts + milestones** | HoneyBook-style contracts + e-sign. |
| 77 | Maps (OSM embed + Waze + Google Maps deep link) | Active | **KEEP** | Privacy-first + IL-native (Waze). |
| 78 | Calendar (`.ics` + Google Calendar OAuth two-way sync) | Partial | **EVOLVE — finish two-way sync** | Couples expect "add to calendar" to actually sync. |
| 79 | Web Push (VAPID + payload encryption + Badge API) | Active | **EVOLVE — Periodic Sync for re-engagement** | 2026 baseline. |
| 80 | Photo CDN (Supabase Storage + CF transforms) | Partial | **EVOLVE — finish CF transform layer** | Signed URLs delivered via CF. |
| 81 | Vendor catalogue (CSV/JSON import + IL enrichment) | Partial | **EVOLVE — Lystio-format importer** | OSS-aligned; no walled directory. |
| 82 | Registry (deep links: Amazon IL + boutique stores) | Not added | **EVOLVE — structured deep links + UI** | Couples expect this. |
| 83 | Compliance API (GDPR + CCPA + LGPD erasure + portability) | GDPR erasure only | **EVOLVE — full pack Phase E** | EU/CA/BR self-host. |

### 2.8 Documentation & Developer Experience

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 84 | Docs structure (Diátaxis: tutorial / how-to / reference / explanation) | Partial | **EVOLVE — complete; archive >2 minor versions old** | Discoverability. |
| 85 | Docs renderer (Markdown only) | Active | **KEEP — MkDocs/Starlight only if `docs/` > 80 files** | Markdown survives every renderer. |
| 86 | ADR practice | 12+ ADRs | **KEEP — mandate ADR for every REPLACE/DROP verdict** | The "why" must outlive contributors. |
| 87 | Mermaid diagrams (`validate-mermaid.mjs` in CI) | Active | **EVOLVE — sequence diagrams for auth, sync, RSVP, push, AI flows** | Diagrams are the living spec. |
| 88 | User-facing guides (couple, planner, vendor, self-host) | Partial | **EVOLVE — finish all four** | Required for "best in class". |
| 89 | Copilot agents (5 custom) | Active | **EVOLVE — add `supabase-agent`, `security-agent`, `performance-agent`, `i18n-agent`** | Agents encode domain knowledge. |
| 90 | Inline docs (eslint-plugin-jsdoc on all `src/`) | Active | **KEEP** | 100% coverage. |
| 91 | `AGENTS.md` + `.github/copilot-instructions.md` duplication | Live | **EVOLVE — consolidate to single source-of-truth** | One file, multiple symlinks/excerpts. |
| 92 | Contribution flow | `CONTRIBUTING.md` | **EVOLVE — first-PR Codespaces template** | Lower contribution friction. |

### 2.9 Security

| # | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 93 | CSP (production + Trusted Types) | Active | **KEEP — ratchet `unsafe-inline` removal** | Already require-trusted-types-for 'script'. |
| 94 | SRI (CDN assets) | Active | **KEEP — validate in CI** | Already gated. |
| 95 | Supply chain (SBOM + Trivy + Scorecard + CodeQL + OIDC) | Active | **EVOLVE — add `trufflehog` + Dependency Review** | Catch secrets regex misses. |
| 96 | PII encryption (AES-GCM at rest in IDB) | Active | **KEEP** | All PII keys encrypted. |
| 97 | Telemetry pledge (zero in upstream build) | Active | **KEEP — document in `docs/principles/no-telemetry.md`** | Privacy moat is documented + testable. |
| 98 | OWASP runtime (ZAP weekly) | Not active | **EVOLVE — add weekly ZAP against Vite preview** | Static covered; runtime gap. |
| 99 | Secret scanning | `check-plaintext-secrets.mjs` | **EVOLVE — add `trufflehog` GH Action** | Layered. |
| 100 | Compliance posture | Partial | **EVOLVE — Phase E full pack (GDPR + CCPA + LGPD)** | EU/CA/BR self-host. |

---

## 3. First-Principles Rethink — If We Built Today (mid-2026)

> Pretend the repo is blank. It is May 2026. We are building a Hebrew-first RTL wedding manager
> for a 300-guest event, $0/month budget, offline-capable, WhatsApp-native, open-source.

| Layer | 2026 greenfield choice | Current reality | Decision |
| --- | --- | --- | --- |
| UI runtime | Vanilla ES2025 + Preact Signals (3 KB) | Same | **MATCH — keep** |
| Build | Vite 8 → 9 (Rolldown) + dynamic imports | Same | **MATCH — track Vite 9** |
| CSS | `@layer` + `@scope` + container-q + `light-dark()` + `color-mix()` + View Transitions | Same | **MATCH — finish primitive coverage** |
| Modals | Native `<dialog>` + Popover API + Anchor Positioning | Same | **MATCH — keep** |
| Routing | `pushState` + typed routes + View Transitions | Same | **MATCH — keep** |
| State | Preact Signals — explicit, 0-overhead | Same | **MATCH — keep** |
| Storage | IndexedDB + AES-GCM at rest + persistent queue | Same | **MATCH — keep** |
| Backend | Supabase as single source of truth | Same | **MATCH — keep** |
| Edge | Supabase Edge (DB-coupled) + Cloudflare Workers (stateless + LLM) | Hybrid | **GAP — deploy CF Worker for AI** |
| Auth | Supabase Auth (Google + Apple OIDC) + magic link + WebAuthn passkeys | OAuth + email allowlist | **GAP — add passkeys** |
| Code language | JS + JSDoc-strict + 0 TSC errors; pilot `.ts` for new files | Same | **MATCH — pilot ADR Phase A** |
| Validation | Valibot at every boundary (100%) | Same | **MATCH — re-audit annually** |
| i18n | ICU MessageFormat + 6 locales | Partial ICU | **GAP — finish HE/AR plurals** |
| Offline | SW strategy cache + Background Sync + Periodic Sync + Push | Same minus Periodic Sync | **GAP — add Periodic Sync** |
| Tests | Vitest + Playwright + axe-per-locale + LH-CI + visual reg + mutation | Same | **MATCH — extend per-locale matrix** |
| Hosting | GH Pages canonical + Cloudflare proxy | GH Pages only | **GAP — add CF proxy** |
| AI | Edge proxy + BYO key (multi-provider + Ollama) + streaming | Adapters only | **GAP — deploy proxy** |
| Mobile | PWA primary + Capacitor when install rate < 30% | PWA only | **GAP — Phase B Capacitor** |
| Payments | Stripe Connect (vendor) + IL deep-links (registry) | Partial | **GAP — Stripe Connect** |
| Photos | Supabase Storage + CF transforms + signed URLs | Partial | **GAP — CF transform layer** |
| Monitoring | Sentry/Glitchtip opt-in DSN + UptimeRobot | Sentry only | **GAP — add UptimeRobot** |
| Plugin marketplace | Manifest + sandboxed runtime + review pipeline | Manifest only | **GAP — Phase C runtime** |
| Public REST API | Supabase PostgREST + API key UI + webhook subs | None | **GAP — Phase D** |
| Docs | Diátaxis + ADR + user guides + Codespaces | Partial | **GAP — finish guides** |
| Security | OWASP gated + Trusted Types in CSP + OIDC + ZAP weekly | All but ZAP | **GAP — add ZAP** |

**Net verdict:** the current architecture **matches** the 2026 greenfield design across most layers.
The remaining gaps cluster in three workstreams: **AI proxy deployment**, **Capacitor native mobile**,
and **platform features (plugin runtime, public API, marketplace)**. These define Phases A → D.

---

## 4. Competitive Landscape & Harvest Matrix

### 4.1 Deep feature comparison — 16 products (2026)

| Capability | Zola | Joy | RSVPify | Eventbrite | Withjoy | Aisle Planner | PlanningPod | Greenvelope | Honeyfund | Lystio IL | Minted | Riley&Grey | HoneyBook | Bridebook | **Ours v29.0.0** | **Target v36** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest + RSVP | CRM, +1 | Group RSVP | **Best forms** | Tickets | Co-edit live | Full CRM | Full CRM | Email-rich | Registry-RSVP | HE basic | Gallery | Boutique | CRM | Full CRM | **Phone-first + WhatsApp + conditional** | Conditional Q chains + dietary |
| Seating chart | DnD conflict | DnD | Add-on | None | DnD realtime | **Floor plan** | DnD + floor | None | None | None | None | None | None | None | DnD + conflict + AI solver | AI CSP solver + floor plan + furniture |
| Budget | Vendor-pay | Simple | None | None | None | Full | **Best** | None | Registry | None | None | None | None | Benchmarks | Categories + variance + projection | Burn-down + forecast + cohort |
| Vendor mgmt | Marketplace | List | None | None | None | **Best** | Full CRM | Curated | None | 5 000+ IL | Curated | Premium | **Full CRM** | 70 K+ UK | CRUD + payment + WA + import | Inbox + contracts + e-sign |
| Website builder | 100+ themes | **AI builder** | Form only | None | Modern + live | Limited | None | Email+web | Registry page | None | **Premium** | **Premium typography** | None | Limited | Data model + slug | AI builder + custom domain |
| Event check-in | None | None | Add-on | **QR+NFC+kiosk** | None | None | None | None | None | None | None | None | None | None | Real-time stats + NFC + QR | NFC kiosk + badge print + offline |
| WhatsApp | None | None | None | None | None | None | None | None | None | Basic `wa.me` | None | None | None | None | **WABA Cloud API + bulk** | + scheduled + A/B + automations |
| Offline | None | None | None | None | None | None | None | None | None | None | None | None | None | None | **SW + IDB queue + Background Sync** | + Periodic Sync |
| Multi-language | EN | EN | EN | 50+ | EN | EN | EN | EN | EN | **HE** | EN | EN | EN | EN | **HE+EN+AR+FR+ES+RU + ICU partial** | ICU full + community pipeline |
| Accessibility | Partial | Partial | Partial | Solid | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | **WCAG 2.2 AA + axe-zero + per-locale** | + Hebrew SR test |
| Privacy / OSS | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | **OSS MIT + self-host + zero-telemetry** | + 1-click deploy + GDPR pack |
| Multi-event | One | One | Pro | Many | **Realtime co-edit** | Best | **Best** | Multi | One | One | One | One | **Best** | Multi | Multi-event + workspace roles | Org/team/planner SaaS path |
| AI features | Venue match | **Site builder AI** | None | None | AI seating | None | None | None | None | None | None | None | None | Shortlisting | Adapters built; proxy pending | BYO-key edge proxy + streaming + Ollama |
| Analytics | Basic | Min | Funnels | Solid | None | Full | **Best** | Email opens | None | None | None | None | None | Market data | Funnel + budget + check-in + cohort | + A/B + no-show ML |
| Realtime collab | None | None | None | Limited | **Best** | None | None | None | None | None | None | None | None | None | **Active: presence + counters** | + conflict resolver UI |
| Payments | Zola Pay | Registry | Stripe add-on | Stripe | Registry | Stripe | Stripe | Stripe | **Registry best** | None | Stripe | Stripe | **Contracts+Stripe** | Stripe | Deep-links + Stripe partial | Stripe Connect + e-sign |
| Native mobile | iOS+Android | iOS+Android | Web | iOS+Android | iOS+Android | iOS+Android | iOS+Android | Web | iOS+Android | iOS+Android | iOS+Android | iOS+Android | iOS+Android | iOS+Android | **PWA only** | Capacitor iOS + Android |
| Bundle gzip | ~300 KB | ~250 KB | ~180 KB | ~250 KB | ~220 KB | ~350 KB | ~400 KB | ~200 KB | ~180 KB | ~200 KB | ~350 KB | ~300 KB | ~300 KB | ~280 KB | **~50 KB** | Hard gate ≤ 60 KB |
| Open source | No | No | No | No | No | No | No | No | No | No | No | No | No | No | **Yes (MIT)** | + plugin & theme marketplace |
| Pricing | Subscription | Freemium | Subscription | Commission | Subscription | Subscription | Subscription | Subscription | Commission | Subscription | Commission | Subscription | % revenue | Freemium | **Free + self-hosted** | $0 default + optional managed |

### 4.2 Our unique advantages — defend and double down

| Advantage | Moat strength | Investment needed |
| --- | --- | --- |
| **Bundle ≤ 60 KB gzip** | 5–10× smaller than every competitor | Hard CI gate; immutable |
| **WhatsApp Cloud API native** | Only category app shipping bulk + delivery webhooks | Expose bulk UI Phase A |
| **RTL-first HE + AR** | Unmatched depth | Finish ICU + Hebrew SR test |
| **MIT + self-host + zero-telemetry** | Privacy + portability moat | 1-click deploys (Phase B) |
| **Offline + Background Sync** | No competitor ships this | Add Periodic Sync (Phase A) |
| **Multi-event planner workspace** | Most consumer tools cap at one event | Workspace roles UI (Phase B) |
| **Open source** | Forkable, auditable, community-buildable | Plugin & theme marketplace (Phase C) |

### 4.3 Capabilities to harvest — concrete sources

| From | What to harvest | Why now |
| --- | --- | --- |
| **RSVPify** | Conditional RSVP question engine + plus-one chains + dietary cascade | Best RSVP forms in category |
| **Zola** | DnD seating with relationship constraints + visual conflict surfacing | We have the algorithm; UI gap |
| **Joy 2026** | AI website builder with live preview + custom domain handoff | Edge AI proxy unblocks |
| **Eventbrite** | QR/NFC scan-in + offline-first verify + badge print | We have QR/NFC; finish kiosk UX |
| **PlanningPod** | Vendor CRM: inbox + contracts + payment timeline + SLA scoring | We are CRUD-only |
| **Aisle Planner** | Venue floor-plan builder — furniture, head table, dance floor | Extend DnD seating |
| **HoneyBook** | Contract templates + e-signature + payment milestones | Phase C |
| **Withjoy 2026** | Realtime co-edit any field simultaneously | Realtime channels active; expand |
| **Riley & Grey** | Premium typography + animated section entrances | View Transitions + Animation Timeline |
| **Bridebook** | Vendor SLA scoring + regional budget benchmarks | Planner-grade analytics |
| **Loops.so** | Scheduled WhatsApp/email + trigger automations | WABA Cloud API ready |
| **Cal.com** | Public-page builder + theme tokens + custom domain CNAME + password | Matches our website-builder |
| **Linear / Height** | Keyboard-first power UX + ⌘K + saved views | Cmd-K palette pending |
| **Stripe Apps** | Plugin manifest + permission scopes + sandboxed runtime | Plugin runtime pending |
| **Notion AI** | Inline ⌘K AI commands in any field | Cmd-K + edge proxy |
| **Eventbrite Day-of** | Offline kiosk + badge print + buffer flush on reconnect | Finish UX |
| **Lystio IL** | Israeli vendor directory import format | CSV/JSON importer |
| **Cal.com (OSS)** | Self-host playbook + 1-click templates | Phase B |
| **Plausible / Umami** | Privacy-first analytics opt-in | Zero-telemetry pledge stays default |

### 4.4 Technical stack benchmark — May 2026

| Dimension | Zola | Joy | RSVPify | PlanningPod | HoneyBook | Lystio IL | **Ours v29.0.0** | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Frontend | React 18 + Next SSR | React 18 + AI | Vue 3 + Nuxt | Angular 15 | React 18 | PHP + jQuery | **Vanilla ES2025 + Vite 8 + Signals** | **Lead** |
| CSS | Tailwind + CSS Modules | Styled-components | Sass + Bootstrap | Material UI | Tailwind | Bootstrap 3 | **`@layer` + nesting + `@scope`** | **Lead** |
| State | Redux RTK | Apollo cache | Vuex | NgRx | Zustand | jQuery globals | **Preact Signals** | Lead |
| Routing | Next file router | React Router | Vue Router | Angular Router | React Router | PHP routes | **pushState + typed routes + View Transitions** | Lead |
| Backend | Node microservices | GraphQL + Lambda | Rails monolith | .NET + SQL Server | Node + PG | PHP + MySQL | **Supabase Postgres + RLS** | Match |
| Edge | Lambda | Lambda + CF | n/a | n/a | Lambda | None | **Hybrid Supabase + CF Workers (planned)** | Match |
| Auth | NextAuth | Auth0 | Devise | Custom | Firebase Auth | PHP sessions | **Supabase Auth (Google + Apple)** | Match |
| DB | PG + Redis | DynamoDB + RDS | PG | SQL Server | PG | MySQL | **Supabase PG + RLS (26 mig)** | Match |
| Realtime | Pusher | GraphQL subs | Polling | SignalR | None | None | **Supabase Realtime (active)** | Match |
| File storage | S3 + CF | S3 | S3-compatible | Azure Blob | S3 | Local disk | **Supabase Storage** | Match |
| Offline | None | None | None | None | None | None | **SW + IDB + Background Sync** | **Lead** |
| Errors | Datadog | Sentry | Rollbar | Raygun | None | None | **Glitchtip/Sentry adapter** | Match |
| CI/CD | GHA + Vercel | GHA + AWS | CircleCI | Azure DevOps | GHA | Manual FTP | **7 GHA + OIDC + Trivy + CodeQL** | Lead |
| Bundle gzip | ~300 KB | ~250 KB | ~180 KB | ~400 KB | ~300 KB | ~200 KB | **~50 KB** | **Lead 5–10×** |
| Hosting | Vercel SSR | AWS CF | Heroku | Azure | AWS | cPanel | **GH Pages (+ CF planned)** | Match (cost lead) |
| AI | Some | **Yes (site)** | None | None | None | None | **Adapters; proxy planned** | Gap |
| Native mobile | iOS+Android | iOS+Android | Web | iOS+Android | iOS+Android | iOS+Android | **PWA only** | **Gap** |
| Open source | No | No | No | No | No | No | **Yes (MIT)** | **Lead** |

---

## 5. Honest Audit by Layer

### 5.1 Frontend

✅ Vanilla ES2025 · ✅ Vite 8 (→ 9) · ✅ Preact Signals · ✅ `@layer` + `@scope` · ✅ pushState ·
✅ View Transitions · ✅ Native `<dialog>` · ✅ `data-action` namespacing · ✅ Virtual scroll (Guests) ·
✅ Error boundaries · ✅ System fonts · ⚠ Container queries partial · ⚠ `light-dark()` partial ·
⚠ Animation Timeline API not used · ⚠ Web Component primitives not used · ⚠ Print pipeline UI gaps ·
⚠ JSON-LD structured data missing.

### 5.2 Backend & Data

✅ Supabase primary · ✅ RLS + 26 migrations · ✅ Composite indexes · ✅ Soft delete + retention cron ·
✅ IDB primary + AES-GCM PII · ✅ Background Sync queue · ✅ Realtime active · ✅ Supabase Storage ·
✅ 12 edge functions · ✅ Admin table · ⚠ Audit log UI absent · ⚠ Multi-tenant `org_id` model not yet ·
⚠ Cross-region replicas single-region.

### 5.3 Code Language & Quality

✅ JS + JSDoc-strict + TSC=0 · ✅ Valibot 100% boundaries · ✅ DOMPurify + Trusted Types · ✅ ESLint 10 ·
✅ Prettier · ✅ Repositories enforced · ✅ Coverage 80/75 enforced · ✅ Mutation Stryker pilot ·
⚠ **130 utilities — sprawl audit overdue** · ⚠ TypeScript pilot decision pending.

### 5.4 Build & Tooling

✅ Vite 8 dynamic imports only · ✅ Vitest 4 forks · ✅ Playwright + axe + visual reg ·
✅ Lighthouse CI hard gate · ✅ Stryker · ✅ ESLint flat · ⚠ Bun for local dev not piloted ·
⚠ pnpm pilot pending · ⚠ Vite 9 (Rolldown) tracking.

### 5.5 Infrastructure & Hosting

✅ GH Pages canonical · ✅ 7 GHA workflows · ✅ OIDC (no PATs) · ✅ Trivy + CodeQL + Scorecard + SBOM ·
✅ Sentry/Glitchtip adapter · ⚠ Cloudflare proxy pending · ⚠ Custom domain pending ·
⚠ UptimeRobot pending · ⚠ 1-click deploy templates pending · ⚠ Multi-region pending.

### 5.6 i18n & Accessibility

✅ 6 locales · ✅ HE primary · ✅ EN per-key fallback · ✅ axe-zero CI · ✅ Per-locale Playwright ·
⚠ ICU MessageFormat partial · ⚠ AR quality pass partial · ⚠ Hebrew screen-reader test missing ·
⚠ Reduced-motion / high-contrast partial coverage.

### 5.7 External APIs

✅ WhatsApp Cloud API edge fn · ✅ `wa.me` fallback · ✅ Supabase Auth (Google + Apple) ·
✅ OSM + Waze + GMaps · ✅ ICS calendar · ✅ Web Push VAPID · ✅ Supabase Storage ·
✅ GDPR erasure edge fn · ⚠ AI proxy not deployed · ⚠ Stripe Connect partial ·
⚠ Google Calendar two-way sync partial · ⚠ Vendor catalogue importer partial ·
⚠ Registry deep links missing.

### 5.8 Documentation

✅ Diátaxis structure · ✅ 12+ ADRs · ✅ Mermaid in CI · ✅ JSDoc 100% · ✅ AGENTS.md ·
⚠ User guides incomplete · ⚠ AGENTS.md / copilot-instructions.md partial duplication ·
⚠ Codespaces template missing.

### 5.9 Security

✅ CSP + Trusted Types · ✅ SRI · ✅ SBOM + Trivy + Scorecard + CodeQL · ✅ AES-GCM PII ·
✅ OIDC Actions · ✅ Zero-telemetry · ⚠ ZAP runtime scan missing · ⚠ Trufflehog missing.

---

## 6. Lessons Learned

### 6.1 What we got right

1. **Vanilla + Vite + ESM** — bundle moat is 5–10× smaller than every competitor.
2. **`@layer` CSS** — cascade is sane; theme switching is one body class; zero specificity wars.
3. **Repositories + handlers separation** — the architectural layer with the highest payback.
4. **Valibot over Zod** — 1 KB vs 13 KB; same DX where it matters.
5. **`enqueueWrite` debounced queue** — saved Sheets from quota every wedding season; survived
   the Supabase flip without any caller change.
6. **JSDoc + `types.d.ts` + `checkJs`** — types without compilation overhead; TSC = 0.
7. **ADR culture** — 12+ ADRs make the *why* survive the people.
8. **Hard CI gates from day one** — 0 lint warnings + LH ≥ 95 + bundle ≤ 60 KB; immutable.
9. **Hebrew-first RTL** — every component tested RTL from birth; competitors retrofit and fail.
10. **Open source from v0** — every external review tightens the codebase.
11. **BaseSection adoption** — all 24 sections on one lifecycle = uniform mount/unmount/error surface.
12. **`@scope` per section** — zero cross-section CSS bleed since S297.
13. **Trusted Types ratchet** — XSS depth-defence enforced in CI from S327.
14. **The Supabase flip (S396)** — the single decision that unlocked Realtime, Storage, Edge,
   and the auth consolidation.
15. **Keeping vanilla through 29 majors** — every framework wave (React, Vue, Svelte, Solid, Qwik)
   came and went; bundle moat survived.

### 6.2 What we got wrong (and how we fixed it)

| # | Mistake | Cost paid | Fix shipped |
| --- | --- | --- | --- |
| 1 | Kept `BACKEND_TYPE = "sheets"` for 3 majors | Sheets quota failures under concurrent RSVP | Flipped S396 ✅ |
| 2 | 3 OAuth SDKs in parallel | ~30 KB bundle; non-uniform JWT | Consolidated to Supabase Auth ✅ |
| 3 | Auth tokens in plaintext `localStorage` | OWASP A02 risk | AES-GCM via `secure-storage.js` ✅ |
| 4 | Services grew to 62 with duplicate pairs | Dead exports inflated; refactor velocity halved | Consolidated to 25 ✅ |
| 5 | Custom Proxy store with deep-mutation tracking | Nested mutations silently missed | Replaced with Preact Signals S400 ✅ |
| 6 | Hash router with `replaceState` semantics | Back button broken; no deep links | pushState + View Transitions S390–392 ✅ |
| 7 | In-memory write queue | Page crash mid-debounce = silent data loss | IDB + Background Sync S394 ✅ |
| 8 | `manualChunks` in Vite config | Build broke on file rename | Removed S385 ✅ |
| 9 | `ADMIN_EMAILS` in source-controlled config | Co-planner change required full deploy | `admin_users` table + Settings UI S386 ✅ |
| 10 | 8 div-based modals + focus-trap polyfill | 8 lazy loads; non-native focus behaviour | Native `<dialog>` S402–403 ✅ |
| 11 | Coverage was advisory | Coverage drift undetected | Enforced 80/75 S379 ✅ |
| 12 | Monitoring adapter built but DSN unset | Production failures invisible | Activated S381 ✅ |
| 13 | **Utility expansion S444–S553 unchecked** | **130 utils; some unused; no per-util ownership** | **OPEN — Phase A audit** |
| 14 | Aspired to full TypeScript migration (v12) | High disruption, marginal benefit | **Revised:** TSC=0 with JSDoc; pilot `.ts` for new modules |
| 15 | `AGENTS.md` and `copilot-instructions.md` duplicated content | Drift between the two files | **OPEN — consolidate Phase A** |

### 6.3 Anti-patterns we refuse

- **No workarounds.** If a rule fires, fix the code. Suppression requires an ADR.
- **No silent failures.** Every catch logs; every queue persists; every retry is observable.
- **No `innerHTML` with anything that did not pass through `sanitize()`.** Trusted Types enforces this.
- **No new runtime dependencies without a bundle-cost ADR.**
- **No "built but not wired" utilities — features tracked separately as built vs wired.**
- **No `window.*` globals — everything ESM.**
- **No hardcoded colours — every colour is a CSS custom property.**
- **No section-to-service direct imports — sections flow through handlers → repositories.**
- **No string-format dates — `Asia/Jerusalem` timezone, ISO at the wire.**
- **No long-lived GitHub Secrets where OIDC is possible.**
- **No plaintext PII in `localStorage` — AES-GCM in IDB.**
- **No telemetry in upstream builds.**

---

## 7. Technical Debt & Risk Register

> **P0** = production blocker · **P1** = significant risk · **P2** = maintenance drag · **P3** = capability gap

| Sev | Pri | Area | Risk | Effort | Target |
| --- | --- | --- | --- | --- | --- |
| Med | P1 | Utilities | 130 utils; sprawl risk; unwired duplicates; no per-util owner | M | v30 |
| Med | P1 | Docs | `AGENTS.md` ↔ `copilot-instructions.md` drift | S | v30 |
| Med | P1 | Mobile | PWA only; no Capacitor build → losing on App Store discovery | XL | v31 |
| Med | P1 | AI | Adapters built; edge proxy not deployed | M | v30 |
| Med | P2 | Security | No runtime ZAP scan | S | v30 |
| Med | P2 | Security | Trufflehog secret scan missing | XS | v30 |
| Med | P2 | Hosting | No Cloudflare proxy; no custom domain | S | v30 |
| Med | P2 | Hosting | No UptimeRobot | XS | v30 |
| Med | P2 | i18n | ICU MessageFormat partial; Hebrew SR test missing | M | v31 |
| Med | P2 | A11y | Reduced-motion / high-contrast partial coverage | M | v31 |
| Med | P2 | Lang | TS pilot decision pending | M | v30 |
| Low | P3 | Platform | No public REST API; no plugin runtime; no marketplace | XL | v32–v33 |
| Low | P3 | Compliance | GDPR erasure only; CCPA + LGPD pending | M | v33 |
| Low | P3 | Multi-tenancy | `org_id` model not yet in migrations | L | v32 |
| Low | P3 | Audit log | Tables exist; UI absent | M | v31 |
| Low | P4 | Multi-region | Single-region Supabase | L | v34 |

---

## 8. Improve / Rewrite / Refactor / Enhance

### 8.1 Improve — low disruption, high payoff (sprintable)

1. **Utility audit & cull** — `audit:utils` script: detect unused exports across `src/utils/`,
   merge near-duplicates, document each utility's owner module; cap at ≤ 100.
2. **Docs consolidation** — single source for project facts (`AGENTS.md`); generate
   `copilot-instructions.md` excerpt at sync-version time.
3. **Add UptimeRobot** — 5-minute external monitor; zero code change.
4. **Cloudflare proxy** — front GH Pages with CF (Brotli, HTTP/3, image transforms); free.
5. **Trufflehog GH Action** — layered secret scanning.
6. **OWASP ZAP weekly** — runtime scan against Vite preview.
7. **Hebrew screen-reader test** — Playwright + NVDA in CI matrix.
8. **Reduced-motion / high-contrast audit** — every section honours OS prefs.
9. **Codespaces template** — first-PR friction removed.
10. **Periodic Sync API** — re-engagement push; PWA baseline.

### 8.2 Rewrite — worth the disruption

1. **AI edge proxy (Cloudflare Worker)** — multi-provider, BYO key, streaming, Ollama opt-in.
2. **Stripe Connect for vendor receipts + milestones + e-sign** — replaces partial Stripe Checkout.
3. **Plugin runtime** — manifest validator → sandboxed dynamic import + permission scopes.
4. **Capacitor native shell** — iOS + Android signing pipeline; native NFC + haptics + share.
5. **Audit log UI** — Settings → Audit log viewer (read from existing tables).

### 8.3 Refactor — code health, zero user impact

1. **Utility ownership** — each util tagged with `@owner <section|service>` JSDoc; CI gate on missing.
2. **Handler → repository contract types** — JSDoc `@param`/`@returns` to all 7 handlers.
3. **`@scope` last-mile** — any section still using bare `[data-section]` selectors.
4. **Action namespacing CI gate** — duplicate-detection on `module:action` keys.
5. **`AGENTS.md` source of truth** — `copilot-instructions.md` becomes a generated excerpt.
6. **Web Component primitives** — extract `<wedding-badge>`, `<rsvp-pill>`, `<table-card>`.

### 8.4 Enhance — new capabilities

| Priority | Feature | Section / Entry | Built? | Wired? |
| --- | --- | --- | --- | --- |
| P0 | AI edge proxy + UI | All sections (Cmd-K) | Adapters ✅ | ❌ |
| P0 | Capacitor iOS + Android | Build + CI | ❌ | ❌ |
| P0 | Stripe Connect (vendor) | Vendors | Partial | ❌ |
| P0 | Audit log UI | Settings | Tables ✅ | ❌ |
| High | Public website builder UI | Website section | Data model ✅ | ❌ |
| High | Workspace roles UI | Settings | Data model ✅ | ❌ |
| High | Plugin runtime (sandboxed) | Settings | Manifest ✅ | ❌ |
| High | ICU plurals (HE + AR) | i18n | ❌ | ❌ |
| High | Vendor CRM (inbox + contracts) | Vendors | ❌ | ❌ |
| Med | Floor-plan builder (extend DnD) | Tables | ❌ | ❌ |
| Med | Cmd-K command palette | Nav | `search-index.js` ✅ | ❌ |
| Med | Theme marketplace | Settings | ❌ | ❌ |
| Med | Public REST API + webhook UI | Settings | ❌ | ❌ |
| Med | Conditional RSVP question engine | RSVP | ❌ | ❌ |
| Med | Registry deep links (Amazon IL +) | Registry | ❌ | ❌ |
| Med | Animation Timeline API on section reveals | All sections | ❌ | ❌ |
| Phase D | Multi-tenant `org_id` SaaS path | Migrations | ❌ | ❌ |
| Phase D | CCPA + LGPD compliance | Edge functions | GDPR ✅ | ❌ |
| Phase E | Cross-region read replicas | Infra | ❌ | ❌ |
| Phase E | Hybrid event support (video deep links + virtual RSVP track) | RSVP | ❌ | ❌ |

---

## 9. Phased Plan v30 → v36

> Each phase ends with a checkpoint. Every REPLACE / DROP verdict in §2 requires an ADR.

### Phase A — v30.0.0 — Consolidation & AI Activation

**Goal:** Cull utility sprawl. Deploy AI edge proxy. Close infrastructure gaps.

| # | Workstream | Deliverable | Exit condition |
| --- | --- | --- | --- |
| A1 | Utility audit | `audit:utils` script + cull/merge unused; each util has `@owner` | ≤ 100 utils; CI gate green |
| A2 | Docs consolidation | `AGENTS.md` is canonical; `copilot-instructions.md` is generated | One file edits propagate |
| A3 | AI edge proxy | CF Worker: multi-provider, BYO key, streaming, Ollama opt-in | Cmd-K AI works on free tier |
| A4 | Cloudflare proxy | CF in front of GH Pages (Brotli + HTTP/3 + transforms) | LH score unchanged or up |
| A5 | UptimeRobot | 5-minute external monitor | Alert on outage within 10 min |
| A6 | Trufflehog | Weekly GH Action | 0 secrets surfaced |
| A7 | OWASP ZAP | Weekly scan against Vite preview | 0 highs |
| A8 | Periodic Sync | PWA re-engagement | Manifest declares; SW handles |
| A9 | TS pilot ADR | Decision recorded | New `.ts` files allowed where ADR signed |
| A10 | v30.0.0 release | Sync-version + CHANGELOG + tag + GH release | All pre-release checks green |

**Phase OKR:** *AI works · utilities sane · CDN edge fronted · external monitoring live.*

### Phase B — v31.0.0 — Mobile Native & Locale Depth

| # | Workstream | Deliverable | Exit condition |
| --- | --- | --- | --- |
| B1 | Capacitor scaffold | iOS + Android shells; signing + provisioning | Local debug builds run |
| B2 | Native NFC + haptics + share | Native plugin bridges | Day-of kiosk works on iOS NFC |
| B3 | Store listings | iOS App Store + Play Store | Builds in TestFlight + Internal Testing |
| B4 | ICU MessageFormat | Full HE + AR plural/gender coverage | `check:i18n --icu` 100% |
| B5 | Hebrew SR test | Playwright + NVDA + VoiceOver | CI runs on every PR |
| B6 | Reduced-motion / high-contrast | Every section honours OS prefs | axe + manual audit pass |
| B7 | Audit log UI | Settings → Audit log viewer | Filter by user/action/date |
| B8 | Animation Timeline API | Section reveals + scroll-driven | 0 KB JS cost |
| B9 | Web Component primitives | `<wedding-badge>` `<rsvp-pill>` `<table-card>` | 3 atomic primitives |
| B10 | v31.0.0 release | Standard | Standard |

**Phase OKR:** *iOS + Android in stores · Hebrew SR-validated · ICU complete · audit log surfaced.*

### Phase C — v32.0.0 — Vendor CRM, Payments, Plugin Runtime

| # | Deliverable |
| --- | --- |
| C1 | Vendor CRM: inbox + contracts + payment timeline + SLA scoring |
| C2 | Stripe Connect: vendor accounts + receipts + milestones + e-sign |
| C3 | Floor-plan builder: extend DnD seating with furniture, head table, dance floor |
| C4 | Conditional RSVP question engine: plus-one chains, dietary cascade |
| C5 | Plugin runtime: sandboxed dynamic import + permission scopes + review pipeline |
| C6 | Cmd-K command palette + AI inline commands per section |
| C7 | Public website builder UI: theme picker + live preview + custom domain CNAME + password |
| C8 | Workspace roles UI: owner / co-planner / vendor / photographer / guest |
| C9 | Registry deep links: Amazon IL + boutique stores |

**Phase OKR:** *Vendor CRM prod-ready · payments end-to-end · plugin marketplace alpha.*

### Phase D — v33.0.0 — Platform & Multi-Tenancy

| # | Deliverable |
| --- | --- |
| D1 | Multi-tenant `org_id` migrations + RLS update |
| D2 | Public REST API via Supabase PostgREST + API key UI + webhook subscriptions |
| D3 | Theme marketplace: community themes + review/install UI |
| D4 | One-click deploy templates: Vercel + Netlify + Cloudflare + Render |
| D5 | Codespaces template + DevContainer |
| D6 | CCPA + LGPD compliance pack: erasure, portability, audit-log surfacing |
| D7 | SOC 2-ready logging via edge function pipeline |

### Phase E — v34.0.0 — Scale & Resilience

| # | Deliverable |
| --- | --- |
| E1 | Cross-region read replicas + region pick on self-host |
| E2 | Hybrid event support: video call deep links + virtual RSVP track |
| E3 | Quarterly chaos drills (game-day) |
| E4 | Observability v2: Glitchtip + UptimeRobot + LH-CI weekly cron + metrics export |
| E5 | WebAuthn passkeys for admin (replaces email allowlist) |

### Phase F — v35.0.0 → v36.0.0 — AI-Native, Compliance-Ready

| # | Deliverable |
| --- | --- |
| F1 | AI assistant in every section (Cmd-K driven; multi-turn streaming; multi-provider) |
| F2 | Photo auto-tagging + face recognition (Ollama local; opt-in only) |
| F3 | RSVP photo-extraction (snap a paper card → guest fields) |
| F4 | Predictive no-show modelling (cohort-based; fully local; no external data) |
| F5 | A/B test framework for invite flows |
| F6 | Full GDPR + CCPA + LGPD pack with audit trail UI |

---

## 10. Sprint Backlog — Next 30 Sprints

> Phase A priority. Each sprint is one commit, one scope.

### Cluster A — Consolidation & AI (Sprints 554–573, target v30.0.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 554 | `audit:utils` script — detect unused exports + duplicates across `src/utils/` | S |
| 555 | Utility cull batch 1 — remove confirmed-unused; merge near-duplicates (target -15) | M |
| 556 | Utility cull batch 2 — wire dormant utilities into sections; document owners | M |
| 557 | `@owner` JSDoc tag + ESLint rule | S |
| 558 | `AGENTS.md` canonicalisation; generate `.github/copilot-instructions.md` from it | S |
| 559 | UptimeRobot integration + status badge in README | XS |
| 560 | Cloudflare proxy + DNS + custom domain acquisition | S |
| 561 | Trufflehog GH Action (weekly) | XS |
| 562 | OWASP ZAP GH Action (weekly against Vite preview) | S |
| 563 | Periodic Sync API in SW + manifest declaration | S |
| 564 | AI edge proxy scaffold — CF Worker + provider router | M |
| 565 | AI edge proxy — OpenAI + Anthropic + Gemini + Ollama adapters | M |
| 566 | AI edge proxy — streaming + BYO key UI in Settings | M |
| 567 | Cmd-K command palette wiring (uses `search-index.js`) | M |
| 568 | TypeScript pilot ADR + first new file as `.ts` | S |
| 569 | Container-q coverage finish across remaining sections | S |
| 570 | `light-dark()` + `color-mix()` finish across all theme tokens | S |
| 571 | Animation Timeline API on dashboard + analytics section reveals | S |
| 572 | Web Component primitive: `<wedding-badge>` | S |
| 573 | v30.0.0 release — sync-version + CHANGELOG + tag + GH release | S |

### Cluster B — Mobile Native & Locale Depth (Sprints 574–593, target v31.0.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 574 | Capacitor 6 scaffold (iOS + Android) | M |
| 575 | Capacitor signing + provisioning + CI build matrix | L |
| 576 | Native NFC bridge (read+write) | M |
| 577 | Native haptics + share sheet bridges | S |
| 578 | iOS App Store metadata + screenshots + privacy manifest | M |
| 579 | Play Store metadata + screenshots + content rating | M |
| 580 | TestFlight + Internal Testing distribution | S |
| 581 | ICU MessageFormat — HE plural/gender coverage | M |
| 582 | ICU MessageFormat — AR plural/gender coverage | M |
| 583 | `check:i18n --icu` CI gate | S |
| 584 | Hebrew screen-reader Playwright test (NVDA matrix) | M |
| 585 | VoiceOver Playwright test on macOS runner | M |
| 586 | Reduced-motion full audit + per-section fix | S |
| 587 | High-contrast theme + OS pref detection | S |
| 588 | Audit log viewer UI (Settings → Audit log) | M |
| 589 | Web Component primitives: `<rsvp-pill>` `<table-card>` | S |
| 590 | Animation Timeline API on section transitions (View Transitions integration) | S |
| 591 | LH-CI per-locale matrix in CI | S |
| 592 | Visual regression per-locale (HE/AR RTL parity) | S |
| 593 | v31.0.0 release | S |

---

## 11. Migration Playbooks

### 11.1 Utility audit (Sprint 554)

```js
// scripts/audit-utils.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const utilsDir = "src/utils";
const allSrc = await import("./scan-src.mjs"); // returns concatenated source of src/**
const violations = [];

for (const file of readdirSync(utilsDir)) {
  if (!file.endsWith(".js")) continue;
  const src = readFileSync(join(utilsDir, file), "utf8");
  const exports = [...src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1]);
  for (const name of exports) {
    const importedRe = new RegExp(`\\b${name}\\b`);
    const usedElsewhere = allSrc.allFilesExceptUtils.some((f) => importedRe.test(f));
    if (!usedElsewhere) violations.push({ file, name });
  }
  const ownerTag = src.match(/@owner\s+([\w-]+)/);
  if (!ownerTag) violations.push({ file, missing: "@owner" });
}

if (violations.length) {
  console.error(JSON.stringify(violations, null, 2));
  process.exit(1);
}
```

### 11.2 AI edge proxy (Sprint 564–566)

```js
// supabase/functions/_shared/ai-proxy.ts (Cloudflare Worker variant in workers/ai-proxy.ts)
// Multi-provider router with BYO key + streaming + redaction.

const PROVIDERS = {
  openai: { url: "https://api.openai.com/v1/chat/completions", header: "Authorization", prefix: "Bearer " },
  anthropic: { url: "https://api.anthropic.com/v1/messages", header: "x-api-key", prefix: "" },
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent", header: "x-goog-api-key", prefix: "" },
  ollama: { url: process.env.OLLAMA_URL ?? "http://localhost:11434/api/chat", header: "x-ollama-token", prefix: "" },
};

export default async (req: Request) => {
  const { provider, key, prompt } = await req.json();
  const cfg = PROVIDERS[provider];
  if (!cfg) return new Response("unknown provider", { status: 400 });

  const upstream = await fetch(cfg.url, {
    method: "POST",
    headers: { "content-type": "application/json", [cfg.header]: cfg.prefix + key },
    body: JSON.stringify({ stream: true, messages: redactPii(prompt) }),
  });
  return new Response(upstream.body, { headers: { "content-type": "text/event-stream" } });
};
```

### 11.3 Capacitor scaffold (Sprint 574–575)

```bash
# Phase B kick-off
npm i -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android
npx cap init "Wedding Manager" "il.wedding.manager" --web-dir dist
npx cap add ios && npx cap add android
# CI matrix builds + TestFlight + Play Internal upload
```

### 11.4 ICU MessageFormat (Sprint 581–583)

```jsonc
// src/i18n/he.json (snippet)
{
  "rsvp.guests_confirmed": "{count, plural, =0 {אין מאשרים} one {מאשר אחד} two {שני מאשרים} other {# מאשרים}}",
  "guest.greeting": "{gender, select, male {שלום} female {שלום} other {שלום}} {name}"
}
```

```js
// src/core/i18n.js (additive)
import IntlMessageFormat from "intl-messageformat"; // dev dep only when ICU keys detected
export function tIcu(key, vars) {
  const raw = lookup(key);
  if (!raw.includes("{")) return raw;
  return new IntlMessageFormat(raw, currentLocale).format(vars);
}
```

---

## 12. Cost & Self-Hosting Profile

| Tier | Backend | Edge | Storage | Realtime | Auth | Push | LLM | Hosting | **Monthly** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Self-host (default)** | Supabase free | Supabase free | Supabase free 1 GB | Supabase free | Supabase free | VAPID free | Ollama local | GH Pages + CF free | **$0** |
| **Small wedding** | Supabase free | Supabase free | Supabase free | Supabase free | Supabase free | VAPID free | BYO OpenAI key | GH Pages + CF free | **~$0–10** |
| **Large wedding (1 000 guests)** | Supabase Pro | Supabase Pro | Supabase Pro 100 GB | Supabase Pro | Supabase Pro | VAPID free | BYO key | CF Pages | **~$25** |
| **Planner SaaS (10 events)** | Supabase Pro | Supabase Pro | Supabase Pro | Supabase Pro | Supabase Pro | VAPID free | BYO key | CF Pages + custom domain | **~$25–35** |

> No subscription is ever enforced. Every paid tier above is opt-in; the free path remains viable
> for any single wedding.

---

## 13. Success Metrics & SLOs

| Dimension | Floor (immutable) | Target |
| --- | --- | --- |
| Bundle gzip | ≤ 60 KB | ≤ 50 KB |
| Lighthouse perf | ≥ 95 | ≥ 99 |
| Lighthouse a11y | ≥ 95 | 100 |
| LH best-practices | ≥ 95 | 100 |
| LH SEO | ≥ 95 | 100 |
| axe violations | 0 | 0 |
| Coverage lines | ≥ 80% | ≥ 85% |
| Coverage branches | ≥ 75% | ≥ 80% |
| Mutation score | ≥ 70% | ≥ 80% |
| RTL pixel-delta HE↔EN | < 5% | < 2% |
| TTI on 3G (HE locale) | < 3 s | < 2 s |
| Offline write loss | 0 | 0 |
| Production error budget | < 0.1% requests | < 0.05% |
| Uptime (GH Pages + CF) | 99.9% | 99.95% |
| WhatsApp Cloud API delivery | ≥ 95% | ≥ 98% |
| Locale parity (key coverage) | 100% across 6 | 100% across 6+ |

---

## 14. Open Decisions Register

| ID | Decision | Owner | Status | Target |
| --- | --- | --- | --- | --- |
| OD-01 | TypeScript pilot scope (new files only? new services only?) | core | Open | Sprint 568 |
| OD-02 | Utility cap (≤ 100 hard or ≤ 80 stretch?) | core | Open | Sprint 555 |
| OD-03 | pnpm vs npm 11 | infra | Open | Phase B |
| OD-04 | Custom domain choice | infra | Open | Sprint 560 |
| OD-05 | Theme marketplace economics (free / paid / sponsorship) | platform | Open | Phase D |
| OD-06 | SaaS managed-tier pricing (or zero) | platform | Open | Phase D |
| OD-07 | Capacitor 6 vs Tauri 2 vs Lynx for shell | mobile | Open | Sprint 574 |
| OD-08 | Multi-tenant `org_id` in shared DB vs schema-per-org | data | Open | Phase D |
| OD-09 | LLM default provider for hosted demo (none = BYO only?) | platform | Open | Sprint 564 |
| OD-10 | WebAuthn rollout (admin only? or all users?) | auth | Open | Phase E |

Each row above must close with an ADR before its target sprint.

---

## 15. Working Principles

1. **One rule per change.** Every PR fixes exactly one rule, lints clean, tests green.
2. **No suppressions without ADR.** ESLint disables, TS-ignore, axe-ignore — all require ADR.
3. **Every dependency has a bundle cost.** New runtime dep = ADR with gzip impact.
4. **Built ≠ Done.** A utility with no UI entry point does not count as shipped.
5. **Privacy is a feature.** Zero telemetry; PII encrypted at rest; AI is opt-in BYO key.
6. **RTL is the floor, not the ceiling.** Every component is born RTL-correct.
7. **Offline is not optional.** Every write goes through `enqueueWrite`; queue is persistent.
8. **Visibility before features.** Monitoring + audit log come before new capability.
9. **Open by default.** New ideas land as ADRs in `docs/adr/`.
10. **Sprint = commit.** One sprint = one focused commit + push, ASCII-only message.
11. **After every sprint or chat session — commit + push.** No pending work in working tree.
12. **Tests first; lint zero; build green.** No PR merges with red.

---

## 16. Release Line

| Version | Theme | Target |
| --- | --- | --- |
| **v29.0.0** | Utility expansion X (S544–S553) — color, html-entities, cookies, abort, trigram, FNV-1a, throttle, shuffle, BOM strip | **Released 2026-05-01** |
| v30.0.0 | Consolidation & AI Activation (Phase A) | Q3 2026 |
| v31.0.0 | Mobile Native & Locale Depth (Phase B) | Q4 2026 |
| v32.0.0 | Vendor CRM, Payments, Plugin Runtime (Phase C) | Q1 2027 |
| v33.0.0 | Platform & Multi-Tenancy (Phase D) | Q2 2027 |
| v34.0.0 | Scale & Resilience (Phase E) | Q3 2027 |
| v35.0.0 | AI-Native I (Phase F.1) | Q4 2027 |
| v36.0.0 | Compliance-Ready (Phase F.2) | Q1 2028 |

---

## 17. Done — Carried Forward (v13 → v29)

The prior roadmap cycle (v13 → v29) shipped the following major decisions; they are now sealed.
A new ADR is required to revisit any of them.

- ✅ `BACKEND_TYPE = "supabase"` flip (S396)
- ✅ Auth consolidation through Supabase Auth (Google + Apple); Facebook dropped
- ✅ `admin_users` table + Settings UI; `ADMIN_EMAILS` removed from source config
- ✅ Storage encryption: IndexedDB primary + AES-GCM at rest for all PII
- ✅ Offline write queue: IDB-persistent + Background Sync API
- ✅ Router: `pushState` + typed routes + View Transitions API
- ✅ Modals: native `<dialog>` (8 modals) + Popover API; focus-trap polyfill removed
- ✅ State: Preact Signals reactive store (replaces custom Proxy)
- ✅ Coverage gate enforced (≥ 80% lines, ≥ 75% branches)
- ✅ Monitoring activated (Sentry/Glitchtip adapter, opt-in DSN, PII scrubber)
- ✅ Trusted Types in production CSP (`require-trusted-types-for 'script'`)
- ✅ GitHub Actions OIDC (no long-lived PATs)
- ✅ DB composite indexes on every `event_id` FK table
- ✅ Edge functions: 12 deployed (csp-report, gdpr-erasure, guest-lookup, health, push-dispatcher,
  rsvp-email, rsvp-webhook, send-email, sync-to-sheets, waba-bulk-send, whatsapp-send, error-receiver)
- ✅ 6 locales (HE · EN · AR · FR · ES · RU)
- ✅ Realtime: presence badges + live counters
- ✅ Service Worker: 5-strategy cache + precache + queue flush
- ✅ Mutation testing: Stryker pilot on `core/` + `repositories/`
- ✅ JSDoc gate extended to all `src/`
- ✅ `manualChunks` removed (dynamic `import()` only)
- ✅ Error boundaries in `BaseSection`
- ✅ Virtual scroll in Guests section
- ✅ 24 sections on `BaseSection` lifecycle
- ✅ 11 repositories enforced as the data path
- ✅ 7 handlers with clean separation
- ✅ Visual regression per-section per-theme baseline
- ✅ Lighthouse CI hard gate ≥ 95
- ✅ Bundle ≤ 60 KB gzip immutable CI gate
- ✅ S444–S553: ten consecutive utility-expansion sprint cycles (now under audit Phase A)

> **Anything in this list reopens only via a new ADR.**

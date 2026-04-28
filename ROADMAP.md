# Wedding Manager — Roadmap v12.7.0 (Best-in-Class Rethink)

> Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · History: [CHANGELOG.md](CHANGELOG.md) ·
> Contributors: [CONTRIBUTING.md](CONTRIBUTING.md) · ADRs: [docs/adr/](docs/adr/) ·
> Operations: [docs/operations/](docs/operations/)

This document is a **deep, first-principles re-evaluation** of every significant decision in this
project — including the ones previously labelled "clean" or "done". Every layer is audited from
scratch: **frontend, backend, code language, docs, tools, configuration, external APIs, database,
infrastructure, build, deploy, and observability**. Nothing is sacred. The goal is to build, ship,
and defend a **best-in-class Hebrew-first RTL wedding management application** — open-source,
offline-capable, WhatsApp-native, privacy-respecting, AI-optional, self-hostable in one click.

For v12.7.0 we re-opened ten further decisions that prior roadmaps had treated as settled
(bundler, package manager, CSS preprocessor, hosting, code language, AI runtime, monitoring vendor,
docs format, search runtime, native shell). The verdict matrix in §2 reflects every reconsideration.
Nothing is silently dropped. Items still relevant from prior roadmaps are consolidated here.

---

## 0. Executive Summary (TL;DR)

**State (2026-04-28, v12.7.0):** **2 756 tests passing** across 196 files · 0 lint errors / 0 warnings
· ~45 KB gzip bundle (hard CI gate ≤ 60 KB) · WCAG 2.2 AA + axe-zero · Lighthouse ≥ 95 · 7 GitHub
Actions workflows · CodeQL on · OpenSSF Scorecard + CycloneDX SBOM + Trivy weekly · Node 22 LTS in
CI + `.nvmrc` · GitHub Pages deploy · **4 locales** (HE primary · EN · AR · FR · ES scaffold) · 22
Supabase migrations · 12 ADRs · live theme picker · realtime helpers wired but idle.
Sprints 118–137 complete (Cluster V): ICU MessageFormat, theme.json export, print prep, notification
centre, vendor analytics, RSVP funnel, budget burndown, run-of-show editor, What's New engine, CDN
image builder, DNS CNAME helpers, deploy-button URLs, Lighthouse-CI config, theme export/import,
workspace RBAC, plugin manifest validator, public website builder data model, FR locale bootstrap,
Capacitor config builder, ES locale scaffold.

**The one decision that matters most:** flip `BACKEND_TYPE` from `"sheets"` to `"supabase"`.
This single line of code unblocks every other capability in this roadmap. Three major versions
have shipped while it stayed deferred. v13 is when it ships.

**Top 5 P0 problems remaining (after v12.5.4):**

1. **Sheets is still the runtime backend** — quotas fail under concurrent RSVP load; failures are silent.
2. **Auth tokens in plaintext `localStorage`** — single XSS = full account takeover (OWASP A02).
3. **Router is broken** — `replaceState` kills the back button; no query-param deep links.
4. **62 service files** — ~3× the healthy maximum; duplicate pairs cause regressions.
5. **15+ utilities built but dark** — no UI entry point; wasted investment, inflated metrics.

**Top 3 unique advantages to defend:**

1. **Bundle ≤ 60 KB** — 5–10× smaller than every commercial competitor. Hard CI gate keeps it.
2. **WhatsApp-native** — no commercial wedding app ships this. Cloud API upgrade locks it in.
3. **MIT + self-hostable + offline-first + RTL-first** — the privacy + portability + locale moat.

**Next 10 sprints (77–86):** see §10. **Phased plan to v18:** see §9. **Cost target:** $0/month
self-hosted; $0–$2/month with custom domain (§12).

---

## Contents

0. [Executive Summary](#0-executive-summary-tldr)
1. [North Star & Current State](#1-north-star--current-state)
2. [Decisions Reopened — Master Verdict Matrix](#2-decisions-reopened--master-verdict-matrix)
3. [First-Principles Rethink — If We Built Today](#3-first-principles-rethink)
4. [Lessons Learned — What We Got Right and What We Got Wrong](#4-lessons-learned)
5. [Competitive Landscape & Harvest Matrix](#5-competitive-landscape--harvest-matrix)
6. [Honest Audit by Layer](#6-honest-audit-by-layer)
7. [Technical Debt & Risk Register](#7-technical-debt--risk-register)
8. [Improve / Rewrite / Refactor / Enhance](#8-improve--rewrite--refactor--enhance)
9. [Phased Plan v13 → v18](#9-phased-plan-v13--v18)
10. [Sprint Backlog 77 → 130](#10-sprint-backlog-77--130)
11. [Migration Playbooks](#11-migration-playbooks)
12. [Cost & Self-Hosting Profile](#12-cost--self-hosting-profile)
13. [Success Metrics & SLOs](#13-success-metrics--slos)
14. [Open Decisions Register](#14-open-decisions-register)
15. [Working Principles](#15-working-principles)
16. [Release Line](#16-release-line)

---

## 1. North Star & Current State

### Actual state — v12.7.0 · 2026-04-28

| Metric | Value | Health |
| --- | --- | --- |
| Tests | **2 756 passing · 196 files · 0 Node warnings** | ✅ |
| TypeScript errors | trending down via JSDoc-strict | ⚠ ratchet active |
| Dead exports | tracked via `audit:dead` (baseline ratchet) | ⚠ ratchet active |
| Lint (JS · CSS · HTML · MD · i18n parity) | 0 errors · 0 warnings | ✅ |
| Sections | **19** modules · **18** templates · **8** modals | ✅ |
| Services | **82** files | ⚠ target ≤ 25 (Phase B1) |
| Repositories | mandatory data path | ✅ |
| Handlers | clean separation | ✅ |
| Utilities | wired/built ratio improving each cluster | ⚠ |
| i18n keys (HE = primary) | **1 201** keys × 5 locales (HE · EN · AR · FR · ES scaffold) | ✅ HE/EN/AR · ⚠ FR/ES translation |
| DB migrations | **22** Supabase migrations | ✅ |
| Active backend | `BACKEND_TYPE = "sheets"` · Supabase wired but not primary | ❌ P0 (flip in v13) |
| Auth tokens | plaintext in `localStorage` | ❌ P0 (encrypt in v13) |
| Bundle | ~45 KB gzip · hard CI gate ≤ 60 KB | ✅ |
| Node version | **22 LTS** in CI matrix + `.nvmrc` | ✅ |
| Supply-chain | OpenSSF Scorecard · CycloneDX SBOM · Trivy weekly · CodeQL · Dependabot grouped | ✅ |
| Auth providers | Google · Facebook · Apple OAuth + email allowlist + anonymous | ⚠ 3 SDKs to consolidate |
| Service Worker | precache + memory write queue | ⚠ in-memory queue lost on crash |
| Realtime | Supabase Realtime wired but **idle** | ⚠ no UI |
| Edge functions | partial (push sender) | ⚠ expand to WABA + AI proxy + GDPR + RSVP webhook |
| Themes | 5 base + theme.json export/import + live-edit CSS vars (S119/S131) | ✅ |
| Plugin surface | manifest validator (S133) — runtime not yet wired | ⚠ data model only |
| Public website builder | data model + slug + sections (S134) — UI not wired | ⚠ data model only |
| Workspace RBAC | role/permission helpers (S132) — UI not wired | ⚠ data model only |
| Native shell | Capacitor config builder (S136) — no platform builds | ⚠ config only |
| Deploy | GitHub Pages · <https://rajwanyair.github.io/Wedding> | ✅ |

### North Star

*The fastest, most accessible, RTL-native, offline-first, open-source wedding manager on the web.
Self-hostable in one click. Operable on flaky 3G in Hebrew. Integrated end-to-end with WhatsApp.
With planner-grade analytics and opt-in AI assistance. At a bundle 5–10× smaller than every
commercial competitor. $0/month self-hosted.*

### Quality bar — every PR

`npm run lint` → 0 errors · `npm test` → 0 fail · axe → 0 violations · Lighthouse ≥ 95 ·
bundle ≤ 60 KB gzip · `npm run audit:security` → 0 findings · i18n parity 100 %.

---

## 2. Decisions Reopened — Master Verdict Matrix

> Every architecturally significant decision in this project, opened to first-principles review.
> One row per decision. Verdict is binding for the next two minor versions unless an ADR overrides.

| # | Layer | Decision | Today | Verdict | Rationale (one line) |
| --- | --- | --- | --- | --- | --- |
| 1 | UI runtime | Vanilla ES2025, no framework | Vanilla + custom Proxy store | **Keep direction; upgrade internals** | Bundle moat is only defensible without a framework. |
| 2 | UI reactivity | Custom Proxy deep-watch | `core/store.js` | **Replace internals with Preact Signals (~3 KB)** | Nested mutations silently miss reactivity in Proxy. |
| 3 | Build tool | Vite 8 + `manualChunks` | 4 manual chunks | **Keep Vite; remove `manualChunks`** | Manual config breaks on rename; dynamic import auto-splits. |
| 4 | Build runtime | Node + npm | Node 22 LTS · npm 11 | **Keep** | Bun considered → no payoff vs disruption; npm shared `node_modules/` works. |
| 5 | CSS | `@layer` + nesting | 7 files | **Keep + add `@scope`, container queries, `light-dark()`** | Per-section scope eliminates leak; native primitives replace polyfills. |
| 6 | Theming | 5 `body.theme-*` classes | Static + live picker (Sprint 74) | **Keep + extend with CSS vars exposed to user** | Live picker shipped; expose more vars in v16 D1. |
| 7 | Modal system | 8 div-based HTML files | Lazy-loaded | **Migrate to native `<dialog>` (Phase B9)** | Drops focus-trap polyfill; better a11y; less code. |
| 8 | Routing | Hash router | `core/nav.js` | **Replace with `pushState` + typed routes + View Transitions** | Browser back is broken; deep links don't work. |
| 9 | Service Worker | Custom precache + memory queue | `public/sw.js` | **Rewrite: strategy cache + IDB queue + Background Sync** | Memory queue lost on crash → silent data loss. |
| 10 | UI delegation | `data-action` event delegation | `events.js` + `action-registry.js` | **Keep + uniformly namespace `module:action`** | Already proven; just enforce uniform style. |
| 11 | UI primitives | Manual focus management | Tooltip + dropdown polyfill | **Adopt Popover API + Anchor Positioning** | Native; smaller; better a11y. |
| 12 | Backend | Google Sheets primary | `BACKEND_TYPE = "sheets"` | **Flip to Supabase — P0** | Sheets quotas fail under concurrent RSVP load. |
| 13 | Database | Supabase Postgres + RLS | 22 migrations | **Keep + harden** | `supabase db lint` in CI; composite indexes on every hot table. |
| 14 | Edge runtime | Supabase Edge Functions only | Partial | **Hybrid: Supabase Edge for DB-coupled work; Cloudflare Workers for stateless proxy** | Cloudflare Workers cold-starts faster, free tier larger; keep Supabase Edge for things that touch the DB to avoid cross-region latency. |
| 15 | Auth | 3 OAuth SDKs + email allowlist | GIS + FB + AppleID + JS | **Replace with Supabase Auth (Google + Apple)** | Drops ~30 KB and 3 moving parts. **Drop Facebook entirely** — low adoption, high cost. |
| 16 | Auth admin model | `ADMIN_EMAILS` array in `config.js` | Source-controlled | **Move to `admin_users` table + RLS** | Adding a co-planner today requires a deploy. |
| 17 | Storage | `localStorage` primary, plaintext | `wedding_v1_*` keys | **IndexedDB primary + AES-GCM via `secure-storage.js`** | 5 MB cap; XSS reads sessions; no crash recovery. |
| 18 | Offline queue | In-memory `enqueueWrite` | 1.5 s debounce | **IDB-persisted + Background Sync API** | Crash mid-queue = silent data loss today. |
| 19 | Service sprawl | 62 service files | 3× healthy max | **Consolidate to ≤ 25** | Duplicate pairs (`sheets.js`/`sheets-impl.js` …) cause regressions. |
| 20 | Repositories layer | `src/repositories/` (11) | Optional path | **Mandatory — only data path** | ESLint `no-restricted-imports` + `arch-check.mjs --strict`. |
| 21 | Handlers layer | `src/handlers/` (6) | Clean | **Keep + add typed contracts** | Architecture is clean; just type the seams. |
| 22 | Code language | JS + JSDoc + `types.d.ts` | `checkJs`, 134 errors | **Keep JSDoc-strict; drive TSC errors → 0** *(REVISED from previous "migrate to TS")* | Migration cost > benefit; we already get types via JSDoc. |
| 23 | Validation | Valibot at most boundaries | ~80 % coverage | **Complete to 100 % at every external input** | Well-chosen tool; finish the job. |
| 24 | Sanitization | DOMPurify | `utils/sanitize.js` | **Keep** | Required, minimal, no alternative. |
| 25 | Runtime deps | 3 (supabase, dompurify, valibot) | | **≤ 5** (add Preact Signals, possibly idb-keyval) | Every dep needs ADR justification. |
| 26 | Realtime | Supabase Realtime wired but idle | | **Activate** — presence + live RSVP counter | Built-in; near-zero cost; differentiates. |
| 27 | i18n format | Flat JSON key/value | 2 locales (HE + EN) | **Add ICU MessageFormat for plurals + gender** | HE/AR plural forms are not flat. |
| 28 | i18n locales | HE primary + EN | AR/RU stubbed | **Complete AR before adding any new locale** | Defends RTL leadership claim. |
| 29 | Validation runtime | Valibot ≪ Zod | | **Keep Valibot** | Bundle: 1 KB vs 13 KB. |
| 30 | Tests — unit | Vitest 4 | 2 509 / 155 files | **Keep + 80 % gate** | Currently advisory; gate locks regressions. |
| 31 | Tests — E2E | Playwright | smoke + visual regression | **Expand: full RSVP, offline, multi-event, a11y per locale** | One smoke isn't enough. |
| 32 | Tests — accessibility | axe-core | runs in Playwright | **Keep + per-locale + zero-violations gate** | RTL screen-reader is the differentiator. |
| 33 | Tests — performance | Lighthouse CI | hard gate | **Keep** | Single best front-end signal. |
| 34 | Bundling — code splitting | Vite `manualChunks` | 4 manual entries | **Remove; rely on dynamic `import()`** | Less config, fewer rename-time bugs. |
| 35 | Hosting | GitHub Pages | active | **Keep canonical + add Cloudflare proxy** | HTTP/3 + Brotli + image transforms; free. |
| 36 | Custom domain | None | `github.io/Wedding` | **Acquire short vanity (~$10/yr)** | Memorable; opt-in for self-hosters. |
| 37 | Monitoring | Adapter ready, not wired | `services/monitoring.js` | **Activate Sentry/Glitchtip** | Production failures invisible without it. |
| 38 | Analytics | None (privacy decision) | | **Self-host Umami via Supabase OR remain analytics-free** | Decide via ADR-13 in Phase B. Default: **none**. |
| 39 | AI | Prompt-builders only | `ai-draft.js`, `ai-seating.js` | **Edge function proxy + BYO key (multi-provider)** | Never expose keys in client bundle. |
| 40 | Payments | Deep links (Bit/PayBox/PayPal) | `payment-link.js` | **Add Stripe Checkout for vendor flows** | Hosted, no PCI scope. |
| 41 | Photos | Gallery section, no backend | | **Supabase Storage + signed URLs + image transforms** | Already have Supabase. |
| 42 | Maps | None | | **OpenStreetMap embed + Waze deep link** | Privacy + zero dep. |
| 43 | Calendar | Helper exists | `calendar-link.js` (wired Sprint 72) | **Keep — done** | Add Google Calendar OAuth in v15. |
| 44 | WhatsApp | `wa.me` + WABA helper | `whatsapp.js` | **Upgrade to Cloud API via edge function** | Bulk send + delivery webhooks + A/B. |
| 45 | Web Push | Wired (Sprint 75) | | **Keep — done** | Edge sender + VAPID complete in v15. |
| 46 | PWA install | Manifest + SW | | **Add Badge API + Share Target + Periodic Sync** | Native-class polish. |
| 47 | Mobile native | PWA only | | **Defer to v16 (Capacitor)** | Justifiable only with PWA install-rate data. |
| 48 | Documentation structure | ~30 markdown files, mixed | strong ADR culture | **Re-org into Diátaxis (tutorial/how-to/reference/explanation)** | Discoverability today is poor. |
| 49 | User-facing docs | None | | **Add couple-guide, planner-guide, vendor-guide, self-host-guide** | Required for "best in class". |
| 50 | Inline JSDoc | Partial | 519/519 in `core/services/` | **Gate via `eslint-plugin-jsdoc` on all of `src/`** | Already at 100 %; just enforce. |
| 51 | ADR practice | 12 ADRs | strong | **Mandate one ADR per "Replace" decision in §2** | Already required by working principles; just enforce. |
| 52 | Mermaid diagrams | `ARCHITECTURE.md` | | **Add `mermaid-validate` CI step + sequence diagram for RSVP flow** | Diagrams are live spec. |
| 53 | Coverage gate | Advisory | `vitest --coverage` runs | **Enforce: 80 % lines, 75 % branches** | Today coverage can drop silently. |
| 54 | Supply chain | SBOM + Trivy + Scorecard live | Sprint 68 | **Keep — done** | Three new badges already on README. |
| 55 | Secrets rotation | Runbook live | `docs/operations/rotation.md` (Sprint 69) | **Keep — done** | 90-day cadence documented. |
| 56 | CI security | CodeQL + Dependabot grouped | active | **Add Trusted Types policy in production** | XSS depth-defence. |
| 57 | CSP + SRI | enforced | active | **Add Trusted Types + nonce on inline scripts** | Locks the script execution surface. |
| 58 | Lighthouse CI | hard gate | active | **Keep + extend to per-locale runs** | RTL Lighthouse parity matters. |
| 59 | Visual regression | Playwright pixel diff | smoke only | **Extend to per-section screenshot tests** | Catches CSS layer bleeds before review. |
| 60 | Plugin surface | None | | **Defer to v17 — JSON manifest + dynamic import** | Don't open before core ships. |
| 61 | Bundler choice | Vite 8 (current) | Rolldown / Bun / Turbopack also reviewed | **Stay Vite 8 → Vite 9 when stable** | Rolldown lands inside Vite; switching disturbs hard CI gates without payoff. |
| 62 | Package manager | npm 11 + shared `node_modules/` | pnpm/Bun reviewed | **Stay npm + add `package-lock.json` audit gate** | Shared workspace works; Bun runtime is a separate question and currently **rejected** for production. |
| 63 | CSS preprocessor | None (vanilla `@layer` + nesting) | Sass/PostCSS-preset-env reviewed | **Stay vanilla; add PostCSS only if a polyfill is unavoidable** | Native nesting + `@scope` + `light-dark()` covers everything. |
| 64 | Hosting canonical | GH Pages | Cloudflare Pages / Vercel / Netlify reviewed | **Stay GH Pages canonical + Cloudflare proxy** | Free, durable, OSS-aligned. Self-hosters get one-click templates (D8). |
| 65 | Code language | JS + JSDoc-strict + `types.d.ts` | Full TS migration reviewed and rejected | **Reject TS migration — drive `tsc --noEmit` → 0 with JSDoc** | Migration cost dominates benefit; types already enforced. |
| 66 | Search runtime | None (planned `search-index.js`) | FlexSearch / minisearch / Pagefind reviewed | **Build pure: prefix + word-start + substring scoring** | Cmd-K does not need a 30 KB index lib for ≤ 5 K records. |
| 67 | Monitoring vendor | none active | Sentry SaaS · Glitchtip self-host · Highlight reviewed | **Glitchtip self-host on Supabase as default; Sentry free tier opt-in** | Privacy-by-default; Glitchtip is Sentry-protocol-compatible. |
| 68 | AI runtime | none active | OpenAI direct · Anthropic direct · Cloudflare Workers AI · Ollama reviewed | **BYO key via Cloudflare Worker proxy; Ollama opt-in for self-host** | No keys in client; multi-provider; local fallback. |
| 69 | Docs format | Markdown + Diátaxis target | MkDocs · Astro Starlight · VitePress reviewed | **Stay Markdown; render with Starlight only if `docs/` grows past 60 files** | Markdown survives every renderer. |
| 70 | Native shell | PWA (current) + Capacitor (planned, Phase D7) | Tauri / Expo / React Native reviewed | **Capacitor only — same code path; native NFC/haptics/share** | Tauri/Expo would force a parallel UI. |
| 71 | Validator runtime | Valibot (current) | Zod / ArkType / TypeBox reviewed | **Stay Valibot — 1 KB vs Zod 13 KB; ArkType still pre-1.0** | Bundle moat. |
| 72 | Date/time runtime | native `Intl.DateTimeFormat` + `Asia/Jerusalem` | Day.js / date-fns / Temporal polyfill reviewed | **Stay native; adopt `Temporal` once Stage 4 ships in V8/Spider** | Zero deps; locale-correct. |
| 73 | Charts runtime | none (DOM-rendered SVG) | Chart.js · ApexCharts · uPlot reviewed | **Stay vanilla SVG — analytics charts are tiny; ≤ 60 KB gate** | We do not need a chart library. |
| 74 | Markdown engine (in-app) | none (server-rendered docs only) | Marked · MicroMark · markdown-it reviewed | **Stay none; only the docs site needs MD** | Defer until in-app rich text is real. |
| 75 | Image transforms | none active | Cloudflare Images · imgix · Bunny CDN reviewed | **Cloudflare Images via Worker (URL builder shipped S127)** | Free tier covers single-event; falls back to original URL. |
| 76 | Auth fallback for self-host | Supabase Auth (planned) + email allowlist | Pocketbase · Authentik · Keycloak reviewed | **Stay Supabase + WebAuthn passkeys (Phase E2)** | Avoid second auth surface. |
| 77 | Vendor catalogue | CRUD only | Walled directory · CSV/JSON import reviewed | **Open import (CSV/JSON) — no walled garden (Phase E3)** | OSS-aligned; no lock-in. |
| 78 | Realtime CRDT | none | Yjs · Automerge reviewed | **Reject CRDT — Realtime channels + last-write-wins suffice for couple+planner edit volume** | CRDT cost is not justified at our scale. |
| 79 | Telemetry-free pledge | implicit | reviewed and **made explicit** | **No analytics in upstream build; opt-in self-host of Umami if user wishes** | Privacy moat. Documented in `docs/principles/no-telemetry.md`. |
| 80 | Compliance posture | none formal | reviewed and scoped | **Phase F: GDPR + CCPA + LGPD pack — erasure, portability, audit log surfacing** | Required for EU/CA/BR self-host adoption. |

---

## 3. First-Principles Rethink

> Pretend the repo is blank. It is 2026. We are building a Hebrew-first RTL wedding manager for a
> 300-guest event with an ~$0/month budget, offline-capable, WhatsApp-native, and open-source.

| Layer | Build-from-zero choice (2026) | Current reality | Action |
| --- | --- | --- | --- |
| UI runtime | Vanilla ES2025 + Preact Signals (~3 KB) | Vanilla + custom Proxy | Adopt Signals under existing API. |
| Build | Vite 8 + dynamic imports | Vite 8 + `manualChunks` | Drop manual chunks. |
| CSS | `@layer` + `@scope` + container queries + `light-dark()` + `color-mix()` + View Transitions | `@layer` + nesting + 5 themes (no `@scope`) | Add `@scope` per section in Phase B7. |
| Modals | Native `<dialog>` + Popover API + Anchor Positioning | div-based modal system | Migrate in Phase B9. |
| Routing | `pushState` + typed routes + query params + View Transitions API | Hash router; back broken | Replace in Phase A5. |
| State | Preact Signals under stable `storeGet/Set/Subscribe` | Custom recursive Proxy | Replace internals in Phase B4. |
| Storage | IDB primary + AES-GCM at rest + persistent offline queue | `localStorage` + plaintext + memory queue | Replace in Phase A4 + B5. |
| Backend | Supabase as single source of truth | `BACKEND_TYPE = "sheets"` | Flip in Phase A1. |
| Edge runtime | **Hybrid:** Supabase Edge for DB-coupled work; Cloudflare Workers for stateless proxy/AI/WABA | Supabase Edge partial only | Split per-function in Phase A6 + C2/C3. |
| Auth | Supabase Auth (Google + Apple OIDC) + magic link + WebAuthn passkeys for admin | 3 SDKs (GIS + FB + AppleID) + plaintext LS | Phase A3. Drop FB entirely. |
| Code language | JS + JSDoc + `types.d.ts` strict (drive TSC → 0) **revised** | JS + JSDoc, 134 TSC errors | Continue JSDoc; do not migrate. Phase B2. |
| Validation | Valibot at every boundary | Valibot at most | Complete to 100 %. Phase B. |
| i18n | ICU MessageFormat + 4 locales | flat JSON + HE/EN | Phase C. |
| Offline | SW strategy cache + Background Sync + Periodic Sync + Push API + Badge API | SW + memory queue | Phase B5. |
| Services | ≤ 20 service files, single-responsibility | 62 files | Consolidate. Phase A10 + B1. |
| Tests | Vitest + Playwright + axe-per-locale + LH-CI gate + visual regression per section | Strong unit + smoke E2E | Expand. Phase B12. |
| Hosting | GH Pages + Cloudflare proxy | GH Pages only | Phase D6. |
| AI | Edge proxy + BYO key (OpenAI / Anthropic / Ollama / Gemini) + streaming | Prompt-builders only | Phase C3. |
| Payments | Stripe Checkout + receipts + regional deep-links | Deep links only | Phase C6. |
| Photos | Supabase Storage + transforms + signed URLs | None | Phase C7. |
| Monitoring | Sentry/Glitchtip (opt-in DSN) + UptimeRobot + LH-CI weekly | Adapter only | Phase A7. |
| Mobile | PWA primary + Capacitor on App/Play stores | PWA only | Phase D7. |
| Docs | Diátaxis + ADR per Replace + user guides | 12 ADRs, mixed structure | Phase B+. |

**Net verdict:** the project's *direction* is exactly right. The *execution gaps* concentrate in
five deferrable-no-longer systems — backend, auth, storage, router, services. Fixing those five
unlocks every capability after.

---

## 4. Lessons Learned

### 4.1 What we got right

1. **Vanilla + Vite + ESM** — bundle is 5–10× smaller than every competitor. Defends the moat.
2. **`@layer` CSS + nesting** — cascade is sane; theme switching is one body class.
3. **Repositories + handlers separation** — the architectural layer that pays back the most.
4. **Valibot over Zod** — 1 KB vs 13 KB; same DX where it matters.
5. **`enqueueWrite` debounced queue** — saved Sheets from quota every wedding season.
6. **JSDoc + `types.d.ts` + `checkJs`** — types without compilation tax; works for vanilla.
7. **ADR culture** — 12 ADRs make the *why* survive the people.
8. **Hard CI gates from day one** — 0 lint warnings + LH ≥ 95 + bundle ≤ 60 KB. Non-negotiable.
9. **Hebrew-first RTL** — every component tested in RTL; competitors retrofit and fail.
10. **Open source from v0** — every external review tightens the codebase.

### 4.2 What we got wrong (and how we fix it)

| # | Mistake | Cost paid | Fix |
| --- | --- | --- | --- |
| 1 | Kept `BACKEND_TYPE = "sheets"` for 3 major versions | Silent quota failures; 62 services hedge for two backends | Flip in v13.0 (Phase A1). |
| 2 | Stored auth tokens in plaintext `localStorage` | OWASP A02 risk; trivially exploitable via any future XSS | AES-GCM via `secure-storage.js`, Phase A4. |
| 3 | Built 3 OAuth SDKs in parallel instead of routing through Supabase Auth | ~30 KB bundle; non-uniform JWT expiry; FB code is dead weight | Drop FB entirely; route Google + Apple through Supabase Auth. |
| 4 | Let services grow to 62 files with duplicate pairs | Dead exports inflated to 117; refactor velocity halved | Consolidate to ≤ 25 in v13–v14. |
| 5 | Built 15+ utilities ahead of UI | Inflated coverage; users see nothing; "built ≠ done" violated | Phase C1: every utility wired or deleted. |
| 6 | Custom Proxy store with deep mutation tracking | Subtle reactivity bugs; nested mutations silently miss subscribers | Replace internals with Preact Signals; keep public API. |
| 7 | Hash router with `replaceState` semantics | Back button broken; no deep links via query params | Replace with `pushState` + typed routes (Phase A5). |
| 8 | In-memory write queue | Page crash mid-debounce = silent data loss | IDB persistence + Background Sync (Phase B5). |
| 9 | `manualChunks` in Vite config | Build breaks on file rename; manual maintenance | Drop; rely on dynamic `import()`. |
| 10 | `ADMIN_EMAILS` in source-controlled config | Adding a co-planner requires a full deploy | Move to `admin_users` table + Settings UI (Phase A2). |
| 11 | Aspired to full TypeScript migration | High disruption + marginal benefit (we already get types via JSDoc) | **Revised:** drive TSC errors → 0 with JSDoc + `types.d.ts`. Stop pursuing `.ts` migration. |
| 12 | Coverage was advisory, not enforced | Coverage drift went undetected across refactors | Enforce 80 % / 75 % (Phase A9). |
| 13 | Built modals as 8 separate div-based HTML files | 8 lazy loads; div + JS focus trap polyfill | Migrate to native `<dialog>` (Phase B9). |
| 14 | Built CSS without `@scope` | Theme transitions occasionally bled across sections | Add per-section `@scope` (Phase B7). |
| 15 | Did not pin Node to LTS until v12.5.4 | Local dev on Node 25 (non-LTS) silently shipped npm-audit blind spots | **Fixed in Sprint 67.** |

### 4.3 Anti-patterns we now refuse

- **No workarounds.** If a linter rule fires, fix the code. Suppression requires an ADR.
- **No silent failures.** Every catch logs; every queue persists; every retry is observable.
- **No `innerHTML` with anything that did not pass through `sanitize()`.**
- **No new runtime dependencies without a bundle-cost ADR.**
- **No "built but not wired" utilities — features are tracked separately as built vs wired.**
- **No `window.*` globals — everything ESM.**
- **No hardcoded colours — every colour is a CSS custom property.**
- **No section-to-service direct imports — sections go through repositories or handlers.**
- **No string format dates — `Asia/Jerusalem` timezone, ISO at the wire.**

---

## 5. Competitive Landscape & Harvest Matrix

### 5.1 Feature comparison — 14 products

| Capability | **Zola** | **Joy** | **RSVPify** | **Eventbrite** | **Appy Couple** | **Bridebook** | **Riley & Grey** | **PlanningPod** | **Greenvelope** | **Minted** | **Lystio (IL)** | **Withjoy** | **Aisle Planner** | **Notion (DIY)** | **Ours v12.5.4** | Next target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest + RSVP | CRM, +1 logic | Group RSVP | **Best forms** | Ticket | Travel + meals | Supplier-led | Boutique | Full CRM | Email-rich | Gallery | Basic HE | Modern | Pro planner | Manual | Phone-first, WhatsApp, multi-event | Conditional Q chains, custom field engine |
| Seating chart | DnD, conflict | DnD | Add-on | None | None | DnD | None | DnD + floor plan | None | None | None | None | Floor plan + furniture | None | DnD, capacity, conflict detection | AI CSP solver, relationship-aware |
| Budget | Vendor + pay | Simple | None | None | None | UK benchmarks | None | **Best** | None | None | None | None | Full | Manual | Categories, payment-rate, variance | Burn-down, cash-flow forecast, SLA |
| Vendor mgmt | Marketplace | List | None | None | List | UK 3 000+ | Premium | **Full CRM** | Curated | Curated | 5 000+ IL | List | Best-in-class | None | CRUD + payment + WhatsApp + vCard | Inbox, contracts, e-sign, payouts |
| Wedding website | 100+ themes | Modern + AI | Form only | None | App | Themes | **Premium typography** | None | Email | Premium | None | Modern | Limited | Manual | 5 themes + live picker (Sprint 74) | Custom domain, password, builder |
| Event-day check-in | None | None | Add-on | **QR + kiosk + NFC** | Limited | None | None | None | None | None | None | None | None | None | Real-time stats; QR/NFC built, no kiosk UI | NFC kiosk, badge print, offline scan |
| WhatsApp messaging | None | None | None | None | Push only | None | None | None | None | None | wa.me link | None | None | Manual | **Native + WABA helper** | Cloud API: bulk + delivery + A/B |
| Offline support | None | None | None | None | None | None | None | None | None | None | None | None | None | None | **SW + memory queue + IDB partial** | Background Sync, persistent queue |
| Multi-language | EN | EN | EN | 50+ | EN | EN | EN | EN | EN | EN | **HE** | EN | EN | Manual | **HE + EN** (AR/RU planned) | 4+ with ICU plurals |
| Accessibility | Partial | Partial | Partial | Solid | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Manual | WCAG 2.2 axe in CI | RTL screen-reader parity |
| Privacy / self-host | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Self-host | **OSS · MIT · self-host** | Encrypted at rest, GDPR, 1-click deploy |
| Multi-event | One | One | Pro | Many | One | UK planners | One | **Best** | Multi | One | One | One | Best-in-class | Many | Multi-event namespacing | Org / team / planner workspaces |
| AI features | Venue match + copy | Site builder AI | None | None | None | None | None | None | None | None | None | None | None | Manual | Prompt-builders ready | Seating CSP, copy, FAQ bot, photo tag |
| Analytics | Basic | Min | Funnels | Solid | None | UK benchmarks | None | Best | Email opens | None | None | None | Full | None | **Funnel + budget + check-in + dietary** | Cohort funnel, A/B, no-show prediction |
| Realtime collab | None | None | None | Limited | None | None | None | None | None | None | None | None | None | Yes | Wired but idle | Presence badges, live counter |
| Payments | Zola Pay | Registry | Stripe add-on | Stripe | None | Stripe (UK) | Stripe | Stripe | Stripe | Stripe | None | Registry | Stripe | Manual | Deep-links only | Stripe + vendor receipts |
| Native mobile | iOS + Android | iOS + Android | Web | iOS + Android | iOS + Android | iOS + Android | iOS + Android | iOS + Android | Web | iOS + Android | iOS + Android | iOS + Android | iOS + Android | Web | **PWA** | Capacitor (Phase D) |
| Edge runtime | Lambda | Lambda | n/a | Lambda | n/a | Lambda | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Supabase Edge partial | **Hybrid: Supabase + Cloudflare Workers** |
| AI-native | Some | Yes (site) | No | No | No | No | No | No | No | No | No | No | No | No | Plan: BYO key, multi-provider | First privacy-respecting AI in category |
| Open source | No | No | No | No | No | No | No | No | No | No | No | No | No | No | **Yes (MIT)** | Plugin + theme marketplace |
| Bundle (gzip) | ~300 KB | ~250 KB | ~180 KB | ~250 KB | ~200 KB | ~250 KB | ~300 KB | ~400 KB | ~200 KB | ~350 KB | ~200 KB | ~250 KB | ~350 KB | n/a | **~45 KB** | Hard gate ≤ 60 KB |

### 5.2 Our unique advantages — defend and double down

| Advantage | Why it is a moat | Investment |
| --- | --- | --- |
| **WhatsApp-native** | No commercial competitor ships this | Upgrade `wa.me` → WhatsApp Cloud API (Phase C2). |
| **RTL-first (HE + AR)** | No competitor supports RTL at this depth | Complete AR; FR/RU community pipeline. |
| **MIT + self-host** | Privacy moat; enterprises can deploy internally | One-click Vercel/Cloudflare/Netlify templates (Phase D). |
| **Offline + Background Sync** | No competitor ships offline write capabilities | Phase B5 SW rewrite. |
| **Bundle ≤ 60 KB** | 5–10× smaller than every competitor | Hard CI gate; Signals not framework. |
| **Multi-event planner model** | Most consumer tools cap at one event | Org/team/planner mode (Phase D). |
| **Open source** | Forkable, auditable, community-buildable | Plugin surface + theme marketplace (Phase E). |

### 5.3 Capabilities to harvest — concrete sources

| From | Steal | Why |
| --- | --- | --- |
| **RSVPify** | Conditional RSVP question engine + plus-one chains + branching logic | Best RSVP forms in the category. |
| **Zola** | DnD seating with relationship constraints + visual conflict surfacing | Algorithm built; UI missing. |
| **Joy** | Live theme picker — CSS variable sliders | **Shipped Sprint 74; extend to all CSS vars in Phase D1.** |
| **Eventbrite** | QR/NFC scan-in with offline-first verify + badge print | `qr-code.js` + `nfc.js` already exist. |
| **PlanningPod** | Vendor CRM (inbox, contracts, payment timeline, SLA tracking) | Our vendors are CRUD-only. |
| **Aisle Planner** | Full venue floor-plan builder (furniture, head table, dance floor) | Extends DnD seating to a venue layout. |
| **Stripe** | Hosted checkout, receipts, webhooks, vendor payouts | Removes friction for vendors. |
| **Riley & Grey** | Premium animated transitions + typography | Lifts perceived quality without framework. |
| **Bridebook** | Vendor SLA scoring + regional budget benchmarks | Planner-grade analytics. |
| **OpenAI / Claude / Gemini** | Invitation copy, seating CSP, FAQ bot, RSVP photo extraction | Edge-function proxy; BYO key; opt-in. |
| **Withjoy 2026** | Co-edit document model — both partners edit any field, conflict surfacing | Realtime channels already wired. |
| **The Knot 2026** | Vendor inbox + structured replies (templated) | Builds on `notification-centre.js` (S121). |
| **Eventbrite Day-of** | Offline-first kiosk with badge print + buffer flush on reconnect | `qr-code.js`+`nfc.js` shipped; needs UI. |
| **Notion 2026 AI** | Inline ⌘K AI commands inside any field | Cmd-K palette (S109) extended with AI actions. |
| **Linear / Height** | Keyboard-first power user workflow + hash-deep-linkable filters | Adopt after pushState router (Phase A5). |
| **GitHub Projects** | Saved views + URL-encoded filter state | Matches our store-driven URL params plan. |
| **Loops.so** | Scheduled message campaigns + `since`/`until` triggers | WABA Cloud API (Phase C2) makes this cheap. |
| **Cal.com** | Public-page builder with theme tokens + slug + custom domain | Matches `website-builder.js` (S134) + DNS helper (S128). |
| **Stripe Apps platform** | Plugin manifest + permission scopes + sandboxed runtime | Matches `plugin-manifest.js` (S133) — runtime still pending. |

### 5.4 Technical stack benchmark

| Dimension | **Zola** | **Joy** | **RSVPify** | **PlanningPod** | **Lystio (IL)** | **Ours v12.5.4** | 2026 verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frontend | React 18 + Next SSR | React 18 + Apollo | Vue 3 + Nuxt | Angular 15 | PHP + jQuery | Vanilla ES2025 + Vite 8 | **Keep vanilla** — Signals closes reactivity gap. |
| CSS | CSS Modules + Tailwind | Styled-components | Sass + Bootstrap | Material UI | Bootstrap 3 | `@layer` + nesting | **Ahead** — add `@scope` + container queries. |
| State | Redux + RTK Query | Apollo cache | Vuex | NgRx | jQuery globals | Custom Proxy | **Replace internals** with Preact Signals. |
| Routing | Next file router | React Router | Vue Router | Angular Router | PHP routes | Hash router (broken back) | **Replace** with pushState + typed routes. |
| Backend | Node microservices | GraphQL + Lambda | Rails monolith | .NET + SQL Server | PHP + MySQL | Supabase (Sheets active) | **Complete cutover.** |
| Edge runtime | Lambda | Lambda + CloudFront | n/a | n/a | none | Supabase Edge partial | **Hybrid:** Supabase (DB-coupled) + Cloudflare Workers (stateless). |
| Auth | NextAuth | Auth0 | Devise | Custom | PHP sessions | 3 OAuth SDKs + LS session | **Replace** with Supabase Auth. |
| DB | PG + Redis | DynamoDB + RDS | PG | SQL Server | MySQL | Supabase Postgres (22 mig) | **Keep + harden** — RLS assertions in CI. |
| Realtime | Pusher | GraphQL subs | Polling | SignalR | None | Supabase Realtime (idle) | **Activate.** |
| File storage | S3 + CloudFront | S3 | S3-compatible | Azure Blob | Local disk | None | **Add** Supabase Storage. |
| Offline | None | None | None | None | None | SW + memory | **Upgrade** — IDB + Background Sync. |
| Errors | Datadog | Sentry | Rollbar | Raygun | None | None | **Activate** — Sentry/Glitchtip free. |
| CI/CD | GHA + Vercel | GHA + AWS CDK | CircleCI + Heroku | Azure DevOps | Manual FTP | 7 pinned GHA | **Add** SBOM + Trivy + Scorecard ✅ done. |
| Bundle gzip | ~300 KB | ~250 KB | ~180 KB | ~400 KB | ~200 KB | **~45 KB** | **Defend** — gate at 60 KB. |
| Hosting | Vercel SSR | AWS CloudFront | Heroku | Azure | cPanel | GH Pages | **Add CDN** — Cloudflare. |
| AI integration | Some | Yes | None | None | None | Plan only | **Privacy-first BYO-key** — first in category. |

### 5.5 Lystio (Israel) — direct local benchmark

| Feature | **Lystio** | **Ours** | Position |
| --- | --- | --- | --- |
| Hebrew UX | Hebrew-only | Hebrew-first + EN | We lead |
| WhatsApp invites | Basic `wa.me` | Full WABA helper + Cloud API plan | We lead |
| Israeli vendor directory | 5 000+ vendors | CRUD only | **Gap — catalogue import (Phase C)** |
| Bit / PayBox payments | None | Deep-link utils built | We lead (wire it) |
| Israeli phone format | Yes | `cleanPhone()` handles | Parity |
| Offline support | None | Yes (SW + IDB plan) | We lead |
| PWA / installable | None | Yes | We lead |
| Tech stack age | PHP + jQuery (legacy) | ES2025 (modern) | We lead |
| Pricing | Subscription | Free + self-hosted | We lead |
| Open source | No | Yes (MIT) | We lead |

---

## 6. Honest Audit by Layer

### 6.1 Frontend

`Vanilla ES2025` ✅ keep · `Vite 8` ✅ keep · `manualChunks` ❌ remove · `@layer` ✅ keep ·
`@scope` ➕ add · `container queries` ➕ add · `light-dark()` ➕ add · `5 themes` ✅ keep + extend ·
`8 div modals` ❌ migrate to `<dialog>` · `hash router` ❌ replace with pushState · `Proxy store` ❌ replace internals with Signals ·
`SW custom` ✅ keep + rewrite · `data-action delegation` ✅ keep + namespace ·
`Popover API + Anchor Positioning` ➕ adopt · `View Transitions API (cross-doc)` ➕ adopt.

### 6.2 Backend & data

`Sheets primary` ❌ flip to Supabase · `Supabase Postgres + RLS` ✅ keep + harden ·
`22 migrations` ✅ keep + add `db lint` in CI · `event_id composite indexes` ➕ add on every hot table ·
`localStorage primary` ❌ replace with IDB · `plaintext tokens` ❌ replace with AES-GCM ·
`memory queue` ❌ replace with IDB + Background Sync · `62 services` ❌ consolidate to ≤ 25 ·
`ADMIN_EMAILS in config.js` ❌ move to `admin_users` table · `Realtime idle` ❌ activate ·
`Conflict resolver built but idle` ❌ wire into store sync · `Edge functions partial` ➕ expand (WABA + push + GDPR + RSVP webhook + LLM proxy).

### 6.3 Code language & quality

`JS + JSDoc + types.d.ts` ✅ keep · `Drive TSC → 0` 🔄 in progress (134 today; was 157) ·
`Valibot at boundaries` ✅ keep + complete to 100 % · `DOMPurify` ✅ keep · `Repositories enforced` ➕ via ESLint + arch-check ·
`Handlers separated` ✅ keep · `Constants centralised` ✅ keep · `Action namespacing mixed` ➕ unify on `module:action`.

**Revised:** stop pursuing full TypeScript migration. Drive TSC errors → 0 with JSDoc + `types.d.ts`.
The cost/benefit of `.ts` migration is unfavourable given current quality.

### 6.4 Documentation

`12 ADRs` ✅ keep + mandate one ADR per Replace decision · `Copilot agents (5)` ✅ keep + extend ·
`Mermaid diagrams` ✅ keep + add CI validate + RSVP sequence diagram ·
`User-facing docs` ❌ missing — add couple/planner/vendor/self-host guides ·
`Diátaxis re-org` ➕ apply to `docs/` · `Inline JSDoc 519/519` ✅ keep + ESLint gate ·
`Doc volume audit` ➕ archive items older than 2 minor versions per release.

### 6.5 Tooling & configuration

`Node 22 LTS in CI + .nvmrc` ✅ done (Sprint 67) · `Vite 8` ✅ keep · `Vitest 4` ✅ keep · `Playwright` ✅ keep + expand ·
`ESLint 10 flat` ✅ keep + add `no-restricted-imports` ➕ done (Sprint 71) · `Coverage gate` ❌ enforce 80/75 ·
`manualChunks` ❌ remove · `Sentry adapter` ❌ wire DSN · `supabase db lint` ➕ add to CI ·
`Trusted Types policy` ➕ add in production · `LH-CI per locale` ➕ extend · `Visual regression per section` ➕ extend.

### 6.6 External APIs & services

| Service | Today | Action |
| --- | --- | --- |
| Google OAuth (GIS) | Active runtime | Migrate to Supabase Auth |
| Facebook OAuth (FB) | Dynamic load | **Drop entirely** (low adoption, high cost) |
| Apple OAuth (AppleID) | Dynamic load | Migrate to Supabase Auth |
| Google Sheets | Runtime primary | Demote to import/export scripts |
| WhatsApp `wa.me` | Active | Extend to Cloud API |
| Web Push (VAPID) | Wired Sprint 75 | Edge sender + dashboard |
| Calendar `.ics` | Wired Sprint 72 | Add Google Calendar OAuth |
| Maps | None | Add OSM embed + Waze deep link |
| Payments | Deep links | Add Stripe Checkout + edge function |
| LLM (BYO) | Prompt-builders | Wire edge proxy (Cloudflare Worker) |
| Photo CDN | None | Add Supabase Storage |
| Sentry / Glitchtip | Adapter only | Activate |
| UptimeRobot | None | Add (free tier) |

### 6.7 Database & infrastructure

`Postgres + RLS (22 mig)` ✅ keep + harden · `Soft delete (009/015/017)` ✅ keep + 90-day cron ·
`Audit log (004)` ✅ surface in Settings · `Backups Supabase managed` ✅ keep + quarterly drill ·
`GH Pages` ✅ keep canonical + Cloudflare proxy · `Custom domain` ❌ acquire ·
`Secrets management` ✅ + 90-day rotation runbook (Sprint 69) ·
`Supply chain (SBOM + Trivy + Scorecard + CodeQL + Dependabot)` ✅ done (Sprint 68) ·
`Edge functions` ➕ split: Supabase Edge for DB-coupled; Cloudflare Workers for stateless.

---

## 7. Technical Debt & Risk Register

> **P0** = production blocker · **P1** = significant risk · **P2** = maintenance drag · **P3** = capability gap

| Sev | Pri | Area | Risk | Effort | Target |
| --- | --- | --- | --- | --- | --- |
| High | P0 | Backend | `BACKEND_TYPE = "sheets"` runtime; quotas fail under concurrent RSVP | L | v13.0 |
| High | P0 | Security | Auth tokens plaintext in `localStorage` (OWASP A02) | M | v13.0 |
| High | P0 | Monitoring | Zero production error tracking | S | v13.0 |
| High | P1 | Services | 62 service files; duplicate pairs cause regressions | M | v13.0 |
| High | P1 | Storage | `localStorage` 5 MB cap, no encryption, no crash recovery | M | v13.0 |
| High | P1 | Router | `replaceState` breaks back button; no query-param deep links | S | v13.0 |
| Med | P1 | Auth | 3 OAuth SDKs in bundle (~30 KB); non-uniform JWT expiry | L | v13.0 |
| Med | P2 | PWA | Memory write queue lost on crash | M | v13.0 |
| Med | P2 | State | Proxy deep mutations silently miss reactivity | M | v14.0 |
| Med | P2 | CI | No coverage gate — drift undetected | S | v13.0 |
| Med | P2 | Build | `manualChunks` breaks on rename | S | v13.0 |
| Med | P2 | Admin | `ADMIN_EMAILS` in source; deploy to add co-planner | S | v13.0 |
| Med | P2 | i18n | AR stub only; ICU plurals absent | L | v15.0 |
| Low | P3 | CSS | No `@scope` — global selectors can leak | M | v14.0 |
| Low | P3 | Modals | 8 div-based modals + focus-trap polyfill | M | v14.0 |
| Low | P3 | Arch | Not all 19 sections extend `BaseSection` | M | v14.0 |
| Low | P3 | Unwired | 8+ utilities with no UI | L | v15.0 |
| Low | P3 | Realtime | Wired but never activated | M | v15.0 |
| Low | P4 | Mobile | PWA only, no App Store/Play Store | XL | v16.0 |
| Low | P4 | API | No public REST API | XL | v17.0 |
| Low | P4 | Catalogue | No vendor directory import | L | v15.0 |

### 7.1 Cost of continued deferral

- **Sheets quota failure:** A 300-guest wedding with concurrent RSVPs exceeds Apps Script quotas;
  in-memory queue retries silently while the user sees "saved" but nothing persists.
- **PII leak via XSS:** A single `innerHTML` slip + plaintext session token = full account takeover.
  Trusted Types + AES-GCM eliminates this entire risk class.
- **Service sprawl compounds:** Every new dev interaction with 62 service files adds confusion and
  spawns more dead exports. Baseline grows unless actively reversed.
- **Bundle regression:** Without the hard CI gate, a single `import lodash from "lodash"` could
  quadruple bundle size overnight. Gate exists; every bypass is a risk.

---

## 8. Improve / Rewrite / Refactor / Enhance

### 8.1 Improve — low disruption, high payoff (sprintable)

1. ~~Switch Node to 22 LTS~~ ✅ (Sprint 67)
2. ~~OpenSSF Scorecard + SBOM + Trivy~~ ✅ (Sprint 68)
3. ~~Secrets rotation runbook~~ ✅ (Sprint 69)
4. ~~Live theme picker~~ ✅ (Sprint 74)
5. **Coverage gate 80 % / 75 %** — `vitest --coverage` enforced in CI.
6. **Activate Sentry/Glitchtip** — opt-in DSN env var; PII scrubbed at source.
7. **Move `ADMIN_EMAILS` to `admin_users` Supabase table** + Settings UI.
8. **JSDoc gate** — `eslint-plugin-jsdoc` on all public functions in `core/` + `services/`.
9. **`supabase db lint` in CI** — catches RLS gaps and missing indexes.
10. **Diátaxis re-org of `docs/`** — tutorial / how-to / reference / explanation split.
11. **`docs/operations/disaster-recovery.md`** — Supabase backup restore drill.
12. **Locale screenshots** — per-locale per-section in `docs/locale-guide.md`.
13. **Dependabot grouped + weekly auto-merge minor security** — already configured; verify cadence.
14. **`mermaid-validate` CI step** — catch diagram-drift in PRs.
15. **Trusted Types policy** in production `index.html` CSP.

### 8.2 Rewrite — worth the disruption

1. **Auth subsystem** — drop GIS/FB/AppleID SDKs; route all OAuth through Supabase Auth.
2. **Storage layer** — IDB primary; AES-GCM PII; persistent offline queue.
3. **Router** — `pushState` + typed route table + query params + View Transitions.
4. **Service Worker** — strategy cache + Background Sync + precache from Vite manifest.
5. **Sheets sync layer** — demote to import/export; flip `BACKEND_TYPE = "supabase"`.
6. **Service consolidation** — 62 → ≤ 25 across v13–v14.

### 8.3 Refactor — code health

1. Repositories layer enforced as only data path (ESLint `no-restricted-imports` + `arch-check`).
2. JSDoc-strict throughout `core/` + `services/` + `handlers/`. Drive TSC → 0.
3. `BaseSection` adoption across all 19 sections (`audit:sections --strict`).
4. Store internals → Preact Signals; public API unchanged.
5. Remove `manualChunks`; dynamic `import()` only.
6. Modal system → native `<dialog>`; remove focus-trap polyfill.
7. Action namespacing — `module:action` everywhere; CI dup-detection.
8. `@scope` per section; eliminate cross-section style bleed.

### 8.4 Enhance — new capabilities (priority-ordered)

| Pri | Feature | Section / Entry | Util built? |
| --- | --- | --- | --- |
| High | QR / NFC event-day kiosk | Check-in section | `qr-code.js`, `nfc.js` |
| High | WhatsApp Cloud API end-to-end | WhatsApp section | `whatsapp-cloud-api.js` |
| High | Cmd-K command palette | Nav (Ctrl+K) | `search-index.js` |
| High | AI seating — CSP solver + UI | Tables section | `seating-constraints.js`, `seating-ai.js` |
| High | AI message drafts + tone picker | WhatsApp + Invitations | `ai-draft.js` |
| High | Realtime presence badges | Tables + Guests | `presence.js`, `realtime-presence.js` |
| High | Onboarding wizard (first-run) | Dashboard | `tour-guide.js` |
| Med | PDF export (guests + seating) | Guests, Tables | `pdf-layout.js`, `pdf-export.js` |
| Med | Venue map + Waze | Ceremony details | none (OSM embed) |
| Med | Stripe Checkout for vendors | Vendors section | `payment-link.js` (partial) |
| Med | Photo gallery + guest uploads | Gallery section | needs Supabase Storage |
| Med | In-app notification centre | Nav / Dashboard | `notification-builder.js` |
| Low | Seating chart export (CSV/JSON) | Tables | `seating-exporter.js` |
| Low | Live theme picker — full var sliders | Settings | extend Sprint 74 |
| Low | Guest relationship editor | Tables | `guest-relationships.js` |
| Low | Budget burn-down chart | Budget | `budget-burndown.js` |
| Low | Vendor payment timeline chart | Vendors | `vendor-analytics.js` |
| Low | Message personalizer live preview | WhatsApp | `message-personalizer.js` |
| Low | RSVP funnel chart | Analytics | `rsvp-analytics.js` |
| Low | What's New modal on version bump | Dashboard | `changelog-parser.js` |
| Phase D | Public wedding website builder | New section | none |
| Phase D | Plugin / extension surface | Settings | none |
| Phase D | Org / team / planner mode | New section | multi-event built |
| Phase E | Capacitor native app | Build | none |
| Phase E | Public REST API | Supabase PostgREST | none |

---

## 9. Phased Plan v13 → v18

> Each phase ends with a decision-review checkpoint. Every "Replace" decision in §2 requires an
> ADR before implementation begins. Each phase ships with a Git tag.

### Phase A — v13.0.0 — *Backend Convergence + P0 Security*

**Goal:** Supabase is the single authoritative backend. Auth tokens never touch `localStorage`
in plaintext. Back button works. Production errors are visible.

| # | Workstream | Deliverable | Exit condition |
| --- | --- | --- | --- |
| A1 | Supabase primary | `BACKEND_TYPE = "supabase"`; Sheets removed from hot path | Zero Sheets calls at runtime |
| A2 | Admin table | `admin_users` + RLS + Settings UI | Admin change = zero deploys |
| A3 | Auth migration | Supabase Auth (Google + Apple); drop GIS/FB/AppleID | Three SDKs removed; `supabase.auth.*` everywhere |
| A4 | Storage encryption | AES-GCM via `secure-storage.js`; IDB migration | No raw JWT or email in `localStorage` |
| A5 | Router | `pushState` + typed routes + query params + View Transitions | Back works; `?guestId=X` opens guest modal |
| A6 | Edge functions | WABA proxy, push sender, GDPR erasure, RSVP webhook | Zero API keys in client bundle |
| A7 | Monitoring | Sentry/Glitchtip; opt-in DSN | Production errors visible; PII scrubbed |
| A8 | Coverage gate | CI fails below 80 / 75 | `vitest --coverage` enforced |
| A9 | Service consolidation (start) | Duplicate pairs merged; ≤ 40 service files | `audit:services` passes |
| A10 | Trusted Types | Production `trustedTypes` policy + nonce | XSS depth-defence active |

**Phase OKR:** *Zero plaintext credentials · One canonical backend · Visible error stream · Back button works.*

### Phase B — v14.0.0 — *DX, Type Safety, Architecture Cleanup*

| # | Workstream | Deliverable | Exit condition |
| --- | --- | --- | --- |
| B1 | Service consolidation (finish) | ≤ 25 service files | `audit:services` ≤ 25 |
| B2 | JSDoc-strict + TSC → 0 | All `core/services/handlers` typed; zero TSC errors | `tsc --noEmit` exits 0 |
| B3 | BaseSection adoption | All 19 sections extend it | `audit:sections --strict` passes |
| B4 | Store internals → Preact Signals | Signals under stable API | Nested mutations fire reactivity |
| B5 | SW rewrite | Strategy cache + IDB queue + Background Sync | Queue survives crash |
| B6 | Dead-export purge | `audit:dead` baseline ≤ 5 % of exports | Already 117 → 85 → push lower |
| B7 | `@scope` CSS | Per-section scope blocks | Zero cross-section bleed |
| B8 | Arch enforcement | `arch-check.mjs --strict` | Sections cannot import services directly |
| B9 | Modal → native `<dialog>` | All 8 modals converted | Focus-trap polyfill removed |
| B10 | Remove `manualChunks` | Dynamic `import()` only | Vite builds without manual config |
| B11 | Playwright expansion | Full RSVP + offline + multi-event + a11y per locale | 0 axe violations across all locales |
| B12 | `supabase db lint` in CI | RLS + index gaps caught | New migration without indexes fails CI |

**Phase OKR:** *JSDoc-strict typed core · Strict architecture · Services ≤ 25 · No dead code · Offline queue survives crash.*

### Phase C — v15.0.0 — *Smart and Native-Class*

| # | Deliverable |
| --- | --- |
| C1 | Wire all High + Med utilities — every dormant feature reachable from a UI |
| C2 | WhatsApp Cloud API: template approval, bulk send, delivery webhooks, A/B |
| C3 | AI edge functions (Cloudflare Workers): seating CSP + invitation copy + FAQ + photo tag — BYO key, multi-provider, streaming |
| C4 | Realtime: presence badges, live RSVP counter, conflict-resolver UI |
| C5 | Web Push end-to-end: VAPID, opt-in, Badge API, Share Target |
| C6 | Stripe Checkout for vendor flows + receipts |
| C7 | Photo gallery: Supabase Storage + guest uploads + transforms + signed URLs |
| C8 | QR/NFC event-day kiosk: offline-first verify + badge print |
| C9 | OSM venue map + Waze deep link + Google Calendar OAuth |
| C10 | Complete AR locale; ICU MessageFormat plurals + gender |

**Phase OKR:** *Every built utility wired · AI is BYO-key opt-in · Payments and check-in production-ready · Arabic ships.*

### Phase D — v16.0.0 — *Platform & Scale*

| # | Deliverable |
| --- | --- |
| D1 | Live theme picker — full CSS variable sliders + presets + export `theme.json` |
| D2 | Public wedding website builder: theme + live preview + custom domain CNAME + password |
| D3 | Org / team / planner mode: workspaces; roles (owner / co-planner / vendor / photographer / guest) |
| D4 | Plugin surface: `plugin.json` manifest + theme + integration API |
| D5 | FR + ES locales (community pipeline); 4 locales total |
| D6 | Cloudflare CDN proxy + custom vanity domain |
| D7 | Capacitor native app (iOS + Android): native NFC, haptics, share sheet |
| D8 | One-click deploy templates: Vercel + Netlify + Cloudflare + Render |
| D9 | RU locale; community pipeline for additional languages |

### Phase E — v17.0.0 — *Open Platform*

| # | Deliverable |
| --- | --- |
| E1 | Public REST API via Supabase PostgREST + API key UI + webhook subscriptions |
| E2 | WebAuthn passkeys for admin (replaces email allowlist) |
| E3 | Vendor catalogue import (CSV/JSON; no walled directory) |
| E4 | Theme marketplace: community themes via plugin manifest + review/install UI |
| E5 | Multi-region: Supabase region selection on self-host; GDPR data-residency controls |
| E6 | Observability v2: Glitchtip + UptimeRobot + LH-CI weekly cron + metrics export |

### Phase F — v18.0.0 — *AI-Native, Compliance-Ready*

| # | Deliverable |
| --- | --- |
| F1 | AI assistant in every section (Cmd-K driven; multi-turn streaming) |
| F2 | Photo auto-tagging + face recognition opt-in (local Ollama option) |
| F3 | RSVP photo-extraction (snap a paper card → guest fields) |
| F4 | Predictive no-show modeling (cohort-based) |
| F5 | GDPR + CCPA + LGPD compliance pack: erasure, portability, audit log surfacing |
| F6 | SOC 2-ready logging via edge function pipeline |

---

## 10. Sprint Backlog 77 → 130

> Concrete next sprints after v12.5.4. Each sprint is one commit; one merged PR. Order is the
> binding execution order until reprioritised in writing.

### Cluster I — Backend convergence prep (Sprints 77–86, target v12.6.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 77 | **ROADMAP v12.5.5 deep rethink** *(this sprint)* | M |
| 78 | Activate Sentry/Glitchtip — wire DSN; PII scrubber; Settings opt-out | S |
| 79 | Coverage gate — enforce 80 % lines / 75 % branches in `vitest.config` + CI | XS |
| 80 | `eslint-plugin-jsdoc` strict on `src/core/` + `src/services/` + `src/handlers/` | S |
| 81 | `mermaid-validate` CI step + RSVP sequence diagram in `ARCHITECTURE.md` | S |
| 82 | `supabase db lint` workflow + composite indexes audit | M |
| 83 | Move `ADMIN_EMAILS` → `admin_users` table + Settings UI | M |
| 84 | Service consolidation #1 — merge `sheets.js` + `sheets-impl.js` | M |
| 85 | Service consolidation #2 — merge `audit.js` + `audit-pipeline.js` | S |
| 86 | Service consolidation #3 — merge `share.js` + `share-service.js` | S |

### Cluster II — P0 security + backend flip (Sprints 87–96, target v13.0.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 87 | `secure-storage.js` activation — AES-GCM PII at rest | M |
| 88 | IDB migration completion — drop `localStorage` for hot keys | M |
| 89 | Persistent IDB write queue + Background Sync (replace memory queue) | L |
| 90 | Trusted Types + nonce policy in production CSP | S |
| 91 | Hash router → `pushState` + typed routes + query params | M |
| 92 | View Transitions API on section navigation | S |
| 93 | Drop Facebook OAuth SDK entirely | XS |
| 94 | Drop GIS/AppleID SDKs; route Google + Apple through Supabase Auth | L |
| 95 | Edge functions — WABA proxy + push sender + GDPR erasure + RSVP webhook | L |
| 96 | **Flip `BACKEND_TYPE = "supabase"`** + Sheets demoted to import/export scripts | M |

### Cluster III — Architecture cleanup (Sprints 97–106, target v14.0.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 97 | Service consolidation push to ≤ 30 (target ≤ 25 by sprint 106) | M |
| 98 | TSC errors 134 → 0 via JSDoc fixes | L |
| 99 | Dead exports 85 → ≤ 30 | M |
| 100 | `BaseSection` adoption across all 19 sections; `audit:sections --strict` | M |
| 101 | Store internals → Preact Signals (~3 KB); public API unchanged | M |
| 102 | Modal system → native `<dialog>` (4 modals first batch) | M |
| 103 | Modal system → native `<dialog>` (4 modals second batch) | M |
| 104 | Drop focus-trap polyfill | XS |
| 105 | Remove Vite `manualChunks` | XS |
| 106 | `@scope` CSS per section + visual regression sweep | M |

### Cluster IV — Smart capabilities (Sprints 107–116, target v15.0.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 107 | QR/NFC event-day kiosk UI in Check-in section | M |
| 108 | WhatsApp Cloud API end-to-end (edge function + UI) | L |
| 109 | Cmd-K command palette + `search-index.js` | M |
| 110 | AI seating CSP solver UI in Tables section | L |
| 111 | AI message drafts + tone picker in WhatsApp section | M |
| 112 | Realtime presence badges in Tables + Guests | M |
| 113 | Onboarding wizard first-run | M |
| 114 | Stripe Checkout for vendors + receipts | L |
| 115 | Photo gallery + Supabase Storage + guest uploads | L |
| 116 | OSM venue map + Waze + Google Calendar OAuth | M |

### Cluster V — Polish, locales, platform prep (Sprints 117–130)

| # | Sprint | Effort |
| --- | --- | --- |
| 117 | Complete AR locale (machine-assisted + human review) | XL |
| 118 | ICU MessageFormat plurals + gender (HE + AR critical) | M |
| 119 | Live theme picker — full var sliders | M |
| 120 | PDF export (guests + seating) | M |
| 121 | Notification centre wiring | M |
| 122 | Vendor analytics + payment timeline chart | M |
| 123 | RSVP funnel chart | S |
| 124 | Budget burn-down chart | S |
| 125 | Run-of-show timeline editor | M |
| 126 | "What's New" modal on version bump | S |
| 127 | Cloudflare CDN proxy + image transforms | M |
| 128 | Custom vanity domain + CNAME | XS |
| 129 | One-click Vercel + Cloudflare + Netlify deploy templates | M |
| 130 | LH-CI per locale + visual regression per section sweep | M |

### Cluster VI — Phase D platform scaffolding (Sprints 118–137 — **complete in v12.6.0 / v12.7.0**)

| # | Sprint | Status |
| --- | --- | --- |
| 118 | ICU MessageFormat plurals + gender (`src/utils/icu-format.js`) | ✅ v12.6.0 |
| 119 | Live theme variable editor (`src/services/theme-vars.js`) | ✅ v12.6.0 |
| 120 | Print preparation pipeline (`src/services/print-rows.js`) | ✅ v12.6.0 |
| 121 | Notification centre (`src/services/notification-centre.js`) | ✅ v12.6.0 |
| 122 | Vendor payment timeline (`src/services/vendor-timeline.js`) | ✅ v12.6.0 |
| 123 | RSVP funnel (`src/services/rsvp-funnel.js`) | ✅ v12.6.0 |
| 124 | Budget burndown + projection (`src/services/budget-projection.js`) | ✅ v12.6.0 |
| 125 | Run-of-show editor (`src/services/run-of-show.js`) | ✅ v12.6.0 |
| 126 | What's New decision engine (`src/services/whats-new-engine.js`) | ✅ v12.6.0 |
| 127 | Cloudflare CDN image URL builder (`src/utils/cdn-image.js`) | ✅ v12.6.0 |
| 128 | DNS CNAME helpers (`src/utils/dns-cname.js`) | ✅ v12.7.0 |
| 129 | One-click deploy URL builders (`src/utils/deploy-buttons.js`) | ✅ v12.7.0 |
| 130 | Lighthouse-CI per-locale config builder (`src/utils/lhci-config.js`) | ✅ v12.7.0 |
| 131 | theme.json export/import (`src/services/theme-export.js`) | ✅ v12.7.0 |
| 132 | Workspace RBAC helpers (`src/services/workspace-roles.js`) | ✅ v12.7.0 |
| 133 | Plugin manifest validator (`src/services/plugin-manifest.js`) | ✅ v12.7.0 |
| 134 | Public wedding website builder data model (`src/services/website-builder.js`) | ✅ v12.7.0 |
| 135 | FR locale bootstrap + locale-scaffold helpers (`src/utils/locale-bootstrap.js`, `src/i18n/fr.json`) | ✅ v12.7.0 |
| 136 | Capacitor config builder (`src/utils/capacitor-config.js`) | ✅ v12.7.0 |
| 137 | ES locale scaffold (`src/i18n/es.json`) | ✅ v12.7.0 |

### Cluster VII — Phase D wiring + Phase E prep (Sprints 138–160, target v12.8 → v13.0)

> Cluster V/VI shipped *data models, builders, and pure helpers*. Cluster VII wires them into UI
> and closes Phase A's P0 prerequisites in parallel.

| # | Sprint | Effort | Wires |
| --- | --- | --- | --- |
| 138 | Theme picker UI consuming `theme-vars` + `theme-export` (Settings → Themes tab) | M | S119 + S131 |
| 139 | Public website builder section (preview iframe + section toggles) | L | S134 |
| 140 | Workspace switcher + role badges in nav (consumes `workspace-roles`) | M | S132 |
| 141 | Plugin install/list UI in Settings (validates manifest + permission prompt) | L | S133 |
| 142 | Capacitor build job in CI (Android AAB + iOS IPA on tag) | L | S136 |
| 143 | Notification centre dropdown wired into header bell | S | S121 |
| 144 | Run-of-show editor section + drag reorder + overlap warnings | M | S125 |
| 145 | Budget burndown + projection chart on Budget section | S | S124 |
| 146 | RSVP funnel chart on Analytics section | S | S123 |
| 147 | Vendor timeline chart on Vendors section | S | S122 |
| 148 | What's New modal triggered on version bump | XS | S126 + `core/whats-new.js` |
| 149 | Print preview modal + per-section template picker | M | S120 |
| 150 | ICU plurals migration sweep — replace ad-hoc `count + ' ' + label` strings | M | S118 |
| 151 | Cloudflare image URLs adopted for any user-uploaded image | S | S127 |
| 152 | Deploy-button widget on README + Settings (Vercel + Netlify + Cloudflare + Render) | XS | S129 |
| 153 | LH-CI workflow per-locale via `buildLighthouseConfig()` | S | S130 |
| 154 | DNS instructions UI in Public-website builder Settings tab | S | S128 |
| 155 | FR + ES translation completion pass — community pipeline kickoff doc | M | S135 + S137 |
| 156 | Glitchtip self-host edge proxy + opt-in DSN env var (Phase A7 prep) | M | new |
| 157 | `secure-storage.js` activation — AES-GCM PII at rest (Phase A4 prep) | M | new |
| 158 | Persistent IDB write queue (Phase B5 prep — landing earlier than B because P0) | L | new |
| 159 | `pushState` router scaffold under feature flag (Phase A5 prep) | M | new |
| 160 | `BACKEND_TYPE = "supabase"` dual-write rehearsal harness (Phase A1 prep) | L | new |

**Cluster VII OKR:** *Every Phase D builder reachable from a UI · Phase A P0 prerequisites scaffolded
behind feature flags · Cluster I sprints (78–86) re-validated · 2 950+ tests · zero regressions.*

---

## 11. Migration Playbooks

### 11.1 Sheets → Supabase cutover (Sprint 96)

```js
// src/core/config.js — single-line flip
export const BACKEND_TYPE = "supabase"; // was "sheets"
```

```js
// src/repositories/guests.js — becomes the only write path
import { backend } from "../services/backend.js";
import { sanitize, GuestSchema } from "../utils/sanitize.js";

export async function saveGuest(input) {
  const { value, errors } = sanitize(input, GuestSchema);
  if (errors) throw new ValidationError(errors);
  return backend.upsert("guests", value);
}
```

```sql
-- supabase/migrations/023_canonical_schema_alignment.sql
ALTER TABLE guests ADD COLUMN IF NOT EXISTS accessibility_needs text;
CREATE INDEX IF NOT EXISTS guests_event_id_idx ON guests (event_id);
CREATE INDEX IF NOT EXISTS guests_phone_idx   ON guests (phone);
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event owner read"  ON guests FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
CREATE POLICY "event owner write" ON guests FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
```

### 11.2 Hash → `pushState` router (Sprint 91)

```js
// src/core/nav.js — replaces hash routing
function navigateTo(section, params = {}) {
  const url = new URL(location.pathname, location.origin);
  url.pathname = `${import.meta.env.BASE_URL}${section}`;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  history.pushState({ section, params }, "", url.toString());
  _mountSection(section, params);
}

window.addEventListener("popstate", (e) => {
  if (e.state?.section) _mountSection(e.state.section, e.state.params ?? {});
});

// Hash fallback for PWAs installed from previous versions
if (location.hash && !location.pathname.includes("/")) {
  const [s, qs] = location.hash.slice(1).split("?");
  navigateTo(s, Object.fromEntries(new URLSearchParams(qs ?? "")));
}
```

### 11.3 `localStorage` → encrypted IDB (Sprint 87–88)

```js
// src/services/secure-storage.js — activate existing file
async function getDerivedKey() {
  let raw = await idbGet("__device_key__");
  if (!raw) {
    raw = crypto.getRandomValues(new Uint8Array(32));
    await idbSet("__device_key__", raw);
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function setSecure(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getDerivedKey(),
    encoded,
  );
  await idbSet(key, { iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) });
}
```

### 11.4 Custom Proxy → Preact Signals (Sprint 101)

```js
// src/core/store.js — drop-in internals replacement
import { signal, effect } from "@preact/signals-core";

const _signals = new Map();

function _getOrCreate(key, defaultVal) {
  if (!_signals.has(key)) _signals.set(key, signal(defaultVal));
  return _signals.get(key);
}

export function storeGet(key)             { return _getOrCreate(key, undefined).value; }
export function storeSet(key, value)      { _getOrCreate(key, value).value = value; }
export function storeSubscribe(key, cb)   {
  const s = _getOrCreate(key, undefined);
  return effect(() => cb(s.value));   // returns cleanup function
}
```

### 11.5 Auth SDK consolidation (Sprint 93–94)

```js
// src/services/auth.js — drop three SDK loaders
import { supabase } from "../core/supabase-client.js";
import { isApprovedAdmin } from "../core/config.js";

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin },
  });
  if (error) throw error;
}

export async function signInWithApple() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: location.origin },
  });
  if (error) throw error;
}

supabase.auth.onAuthStateChange((_event, session) => {
  const email = session?.user?.email ?? null;
  if (email && !isApprovedAdmin(email)) supabase.auth.signOut();
});
```

### 11.6 IDB-persistent write queue (Sprint 89)

```js
// src/core/sync.js — persistent queue
import { idbGet, idbSet, idbDel } from "./storage.js";

const QUEUE_KEY = "__sync_queue__";

export async function enqueueWrite(key, fn) {
  const q = (await idbGet(QUEUE_KEY)) ?? [];
  q.push({ key, ts: Date.now() });
  await idbSet(QUEUE_KEY, q);
  if ("sync" in self.registration) await self.registration.sync.register("flush-queue");
  return fn().then(() => _markDone(key));
}

async function _markDone(key) {
  const q = ((await idbGet(QUEUE_KEY)) ?? []).filter((e) => e.key !== key);
  await idbSet(QUEUE_KEY, q);
}
```

---

## 12. Cost & Self-Hosting Profile

The application is designed to operate at $0–$2/month for personal use. Costs scale linearly only at planner-team scale. Free tiers cover 99 % of single-event usage.

| Component | Provider | Free tier covers | First paid tier | Required for v12.5.4? |
| --- | --- | --- | --- | --- |
| Hosting | GitHub Pages | Unlimited public repos | n/a | ✅ Yes — $0 |
| DB + Auth + Realtime + Storage | Supabase | 500 MB · 2 GB egress · 50 K MAU · 1 GB storage | $25/mo Pro tier | ✅ Yes — $0 |
| Edge functions | Supabase Edge | 500 K invocations/mo | included in Pro | ✅ Yes — $0 |
| Edge functions (stateless) | Cloudflare Workers | 100 K req/day free | $5/mo Workers Paid | Optional — $0 |
| CDN proxy | Cloudflare Free | Unlimited | $20/mo Pro | Optional — $0 |
| Custom domain | Cloudflare Registrar | n/a | ~$10/year `.com` | Optional |
| Email (transactional) | Supabase Auth bundled | 4 emails/hour | Resend $20/mo (free 3 K/mo) | ✅ Yes — $0 |
| Web Push | VAPID + Supabase tables | Unlimited (browser-side) | n/a | ✅ Yes — $0 |
| Error tracking | Glitchtip self-host on Supabase OR Sentry free | 5 K errors/mo | Sentry $26/mo | Optional — $0 |
| Uptime monitoring | UptimeRobot free | 50 monitors · 5-min checks | $7/mo Pro | Optional — $0 |
| AI (BYO key) | User-supplied OpenAI / Anthropic / Ollama | n/a | Pay-per-use | Optional — $0 |
| Analytics | None (privacy decision) | n/a | n/a | ✅ — $0 |

**Self-host total at single-event scale: $0–$10/year (domain optional).**

**Open-source release SBOM:** every dep is documented in `sbom.cdx.json`; no proprietary
service is required to run a fork. The `supabase start` command provides full local DB + Auth +
Storage + Realtime for development without an account.

---

## 13. Success Metrics & SLOs

| Metric | v12.5.4 (now) | v13 target | v14 target | v15 target | v16 target |
| --- | --- | --- | --- | --- | --- |
| Tests passing | 2 509 / 2 509 | ≥ 2 700 | ≥ 2 900 | ≥ 3 100 | ≥ 3 300 |
| Coverage (lines, enforced) | advisory | ≥ 80 % | ≥ 85 % | ≥ 90 % | ≥ 92 % |
| TypeScript errors (`tsc --noEmit`) | 134 | ≤ 50 | **0** | 0 | 0 |
| Dead exports | 85 | ≤ 50 | ≤ 25 | ≤ 10 | ≤ 5 |
| Lint errors / warnings | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Lighthouse Performance | ≥ 95 | ≥ 95 | ≥ 97 | ≥ 98 | ≥ 99 |
| Lighthouse Accessibility | ≥ 95 | ≥ 97 | ≥ 99 | 100 | 100 |
| Bundle (gzip) | ~45 KB | ≤ 60 KB | ≤ 55 KB | ≤ 50 KB | ≤ 50 KB |
| axe violations | 0 | 0 | 0 | 0 | 0 |
| Service files | 62 | ≤ 40 | ≤ 25 | ≤ 22 | ≤ 20 |
| Locales shipped | 2 (HE, EN) | 2 | 2 | 3 (+ AR) | 4 (+ FR) |
| P0 security issues | 3 (Sheets, plaintext auth, no monitoring) | 0 | 0 | 0 | 0 |
| Active backend | Sheets | Supabase | Supabase | Supabase | Supabase |
| Error tracking | None | Active (opt-in) | Active | Active | Active |
| Offline queue durability | Memory-only | IDB-persisted | IDB + Sync | IDB + Sync + Periodic | + Background Push |
| Utilities wired / built | ~15/23 | ~20/25 | 25/25 | 30/30 + new | 35/35 + new |
| Admin management | Requires deploy | DB-driven | DB-driven | DB-driven | + WebAuthn |
| Realtime UI | Idle | Activated | Polished | Multi-section | Multi-tenant |

### SLOs (production targets)

| SLO | Target |
| --- | --- |
| Availability (GH Pages canonical) | ≥ 99.9 % (3 nines) |
| RSVP submission P99 latency | ≤ 2 s on 3G |
| Error budget | ≤ 0.1 % of page loads produce an unhandled JS exception |
| CI pipeline (lint + test + build) | ≤ 3 min |
| Deploy after push to `main` | ≤ 2 min |
| First Contentful Paint (3G) | ≤ 1.5 s |
| Time to Interactive (3G) | ≤ 3 s |
| Cumulative Layout Shift | ≤ 0.05 |
| RTL parity (HE vs EN visual diff) | 100 % under 5 % pixel delta |

---

## 14. Open Decisions Register

> Each item requires an ADR before the corresponding phase begins. Decision closes when the ADR is accepted.

| # | Decision | Options | Current leaning | Blocks |
| --- | --- | --- | --- | --- |
| OD-01 | Reactive store: Preact Signals vs alternatives | Signals (3 KB) · keep Proxy · MobX · Zustand | **Signals** | Phase B4 |
| OD-02 | `<dialog>` strategy for older Safari | polyfill · progressive enhancement · min-version | **Progressive** | Phase B9 |
| OD-03 | Typed route definition | config-based (`route-table.js`) · file-based | **Config** (scaffolded) | Phase A5 |
| OD-04 | AI provider strategy | OpenAI only · Anthropic only · multi · Ollama-first | **Multi-provider BYO key** | Phase C3 |
| OD-05 | WhatsApp integration level | wa.me only · Cloud API only · both with toggle | **Both with toggle** | Phase C2 |
| OD-06 | CDN provider | Cloudflare (free) · Fastly · none | **Cloudflare** | Phase D6 |
| OD-07 | Native app strategy | Capacitor · Expo · React Native · PWA-only | **Capacitor** (reuses 100 % code) | Phase D7 |
| OD-08 | Photo storage | Supabase Storage · Cloudinary · Bunny | **Supabase Storage** | Phase C7 |
| OD-09 | Plugin architecture | JSON manifest + dynamic import · iframe · none | **JSON manifest + dynamic import** | Phase D4 |
| OD-10 | Payments | Stripe only · multi-PSP · regional | **Stripe vendors; deep-links guests** | Phase C6 |
| OD-11 | AR locale strategy | Full in-house · machine-assisted + human · community | **Machine-assisted + human review** | Phase C10 |
| OD-12 | FB OAuth removal | Remove · keep behind flag · move to Supabase OIDC | **Remove entirely** | Sprint 93 |
| OD-13 | Analytics | None · Plausible · Umami self-host | **None default; Umami opt-in self-host** | Phase B |
| OD-14 | Edge runtime split | Supabase only · Cloudflare only · hybrid | **Hybrid: Supabase DB-coupled + Cloudflare stateless** | Phase A6/C3 |
| OD-15 | Code language migration | full TS · JSDoc-strict · stay as-is | **JSDoc-strict, TSC → 0** *(revised)* | Phase B2 |
| OD-16 | Coverage tool | c8 (current) · `@vitest/coverage-istanbul` | **c8** (default; faster) | Sprint 79 |
| OD-17 | CRDT for collab | Yjs · Automerge · none (Realtime channels suffice) | **None — Realtime is enough** | Phase C4 |
| OD-18 | Bundler change | Vite (current) · Bun · Rolldown · Turbopack | **Stay Vite** — no payoff vs disruption | n/a |
| OD-19 | Package manager | npm (current) · pnpm · bun · yarn | **Stay npm** — shared `node_modules/` | n/a |
| OD-20 | Deployment target | GH Pages (current) · Cloudflare Pages · Vercel · Netlify | **GH Pages canonical + Cloudflare proxy** | Phase D6 |

---

## 15. Working Principles

1. **One source of truth per concern.** State in one place; constants in `core/constants.js`; config in `core/config.js`.
2. **No workarounds — fix the root cause.** Suppression requires an ADR.
3. **Security is a first-class constraint.** Trusted Types + AES-GCM at rest + zero API keys in client + no `innerHTML` with unvalidated data + OWASP Top 10 scan on every PR.
4. **RTL is not an afterthought.** Every new UI feature tested in Hebrew. AR when shipped.
5. **Bundle size is a feature.** Every new runtime dep needs an ADR. Hard CI gate at 60 KB.
6. **Every utility ships with a UI.** "Built" ≠ "done". Tracked separately.
7. **Docs are code.** ADR per Replace decision. CHANGELOG per version. Copilot instructions updated with every structural change.
8. **Offline-first means the queue never lies.** Writes persist to IDB; conflict resolution surfaces to user.
9. **Open source means auditable.** No secret algorithms, no vendor lock-in, no telemetry without opt-in.
10. **Accessibility is not a badge.** WCAG 2.2 AA is the floor. axe-zero is a CI gate. Real Hebrew RTL screen-reader testing.
11. **Cost is a design constraint.** $0/month single-event. Free tiers cover 99 % of usage.
12. **The release ratchet only goes one way.** Once a metric improves and is gated, it cannot regress without an ADR. (Bundle, dead exports, TSC errors, coverage.)

---

## 16. Release Line

| Version | Status | Theme | Key deliverables |
| --- | --- | --- | --- |
| v12.5.1 | Released 2026-04-27 | Production hardening | A11y `for=` labels; TS strict analytics; CI action pins |
| v12.5.2 | Released 2026-04-27 | Tooling accuracy | Dead-export audit regex (202 false → 117 actual); baseline 201→117 |
| v12.5.3 | Released 2026-04-27 | TSC accuracy + dead-export reduction | TSC 157→134; dead exports 117→85; repository JSDoc fixes |
| v12.5.4 | Released 2026-04-27 | Node LTS + supply chain + theme picker | Sprints 67–76: `.nvmrc` 22 LTS; SBOM + Trivy + Scorecard; rotation runbook; arch enforcement; live theme picker |
| **v12.5.5** | Released 2026-04-27 | Roadmap deep rethink | Sprint 77: ROADMAP rewrite — verdict matrix, lessons learned, sprint backlog 77–130, cost profile, hybrid edge runtime decision, JSDoc-strict (revised TS path) |
| v12.5.6 | Released 2026-04-27 | Backend convergence prep | Sprints 78–87 |
| **v12.6.0** | Released 2026-04-28 | Cluster V — Locales, charts & polish | Sprints 118–127: ICU MessageFormat, theme-vars editor, print pipeline, notification centre, vendor timeline, RSVP funnel, budget burndown, run-of-show, What's New engine, CDN image builder |
| **v12.7.0** | **This release** | **Cluster VI — Phase D platform scaffolding** | **Sprints 128–137: DNS CNAME helpers, deploy-button URLs, LHCI per-locale, theme.json export/import, workspace RBAC, plugin manifest validator, public website builder, FR + ES locale bootstrap, Capacitor config builder; new ROADMAP rethink (sections §0/§1/§2 OD-21..OD-30, §5 expanded harvest, §10 Cluster VII)** |
| v12.8.x | Candidate | Cluster VII — Phase D UI wiring | Sprints 138–155: theme picker UI, website builder UI, workspace switcher, plugin install UI, Capacitor CI, notification dropdown, run-of-show + chart sections, ICU sweep |
| **v13.0.0** | Next major | Backend convergence + P0 security | Sprints 87–96: encryption, IDB queue, pushState router, drop FB/GIS/AppleID, Supabase Auth, **flip BACKEND_TYPE = supabase** |
| **v14.0.0** | Later | Architecture cleanup | Sprints 97–106: services ≤ 25, BaseSection, Signals, native `<dialog>`, `@scope`, TSC → 0 |
| **v15.0.0** | Later | Smart + native-class | Sprints 107–116: WhatsApp Cloud API, AI edge, Realtime, Stripe, Storage, kiosk, AR locale |
| **v16.0.0** | Candidate | Platform & scale | Sprints 117–130: live theme builder, public site builder, org/team, CDN, Capacitor |
| **v17.0.0** | Candidate | Open platform | Public REST API, WebAuthn passkeys, vendor catalogue import, theme marketplace, multi-region |
| **v18.0.0** | Candidate | AI-native + compliance | AI in every section, photo auto-tag, RSVP photo extraction, no-show prediction, GDPR/CCPA/LGPD pack, SOC 2-ready logging |

---

*Last updated: 2026-04-28 · v12.7.0 · See [CHANGELOG.md](CHANGELOG.md) for detailed history. ·
For decisions, see [docs/adr/](docs/adr/). · For runbooks, see [docs/operations/](docs/operations/).*

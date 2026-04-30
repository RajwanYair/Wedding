# Wedding Manager — Roadmap v13.21.0 (2026 Best-in-Class Refresh)

> Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · History: [CHANGELOG.md](CHANGELOG.md) ·
> Contributors: [CONTRIBUTING.md](CONTRIBUTING.md) · ADRs: [docs/adr/](docs/adr/) ·
> Operations: [docs/operations/](docs/operations/)

This document is a **complete re-evaluation of every significant decision** in this project — reopened
from scratch including decisions previously labelled "clean" or "done". Every layer is audited:
**frontend, backend, code language, docs, tools, configuration, external APIs, database, and
infrastructure**. Nothing is sacred. The goal is a **best-in-class Hebrew-first RTL wedding
management application** — open-source, offline-capable, WhatsApp-native, privacy-respecting,
AI-optional, self-hostable in one click, at a bundle 5–10× smaller than every commercial competitor.

---

## Contents

0. [Executive Summary](#0-executive-summary-tldr)
1. [North Star & Current State](#1-north-star--current-state)
2. [Decisions — Master Verdict Matrix](#2-decisions--master-verdict-matrix)
3. [First-Principles Rethink — If We Built Today (2026)](#3-first-principles-rethink--if-we-built-today-2026)
4. [Competitive Landscape & Harvest Matrix](#4-competitive-landscape--harvest-matrix)
5. [Honest Audit by Layer](#5-honest-audit-by-layer)
6. [Lessons Learned](#6-lessons-learned)
7. [Technical Debt & Risk Register](#7-technical-debt--risk-register)
8. [Improve / Rewrite / Refactor / Enhance](#8-improve--rewrite--refactor--enhance)
9. [Phased Plan v13 → v19](#9-phased-plan-v13--v19)
10. [Sprint Backlog — Next 30 Sprints](#10-sprint-backlog--next-30-sprints)
11. [Migration Playbooks](#11-migration-playbooks)
12. [Cost & Self-Hosting Profile](#12-cost--self-hosting-profile)
13. [Success Metrics & SLOs](#13-success-metrics--slos)
14. [Open Decisions Register](#14-open-decisions-register)
15. [Working Principles](#15-working-principles)
16. [Release Line](#16-release-line)

---

## 0. Executive Summary (TL;DR)

**State (2026-04-30, v13.21.0):** **4 179 tests passing** across 268 files · 0 lint errors / 0 warnings
· ~45 KB gzip bundle (hard CI gate ≤ 60 KB) · WCAG 2.2 AA + axe-zero · Lighthouse ≥ 95 ·
7 GitHub Actions workflows · CodeQL · OpenSSF Scorecard + CycloneDX SBOM + Trivy weekly ·
Node 22 LTS in CI + `.nvmrc` · GitHub Pages deploy · **5 locales** (HE · EN · AR · FR · ES) ·
25 Supabase migrations · 12+ ADRs · live theme picker · realtime helpers wired but idle ·
coverage lines 58% / branches 51%.

### The one decision that remains most deferred

> **Flip `BACKEND_TYPE` from `"sheets"` to `"supabase"`.**
> This single line unblocks every other capability in this roadmap.
> Every major version has shipped while it stayed deferred. v14 is the final deadline.

### Top 5 P0 problems

1. **Sheets is the runtime backend** — quotas silently fail under concurrent RSVP load.
2. **Router is still hash-based** — back button broken; no query-param deep links.
3. **3 OAuth SDKs still load at startup** — ~30 KB; Facebook SDK is dead weight.
4. **No production error visibility** — `services/monitoring.js` wired but DSN not set.
5. **Coverage gate advisory, not enforced** — regressions arrive silently.

### Top 3 unique advantages to defend

1. **Bundle ≤ 60 KB gzip** — 5–10× smaller than every competitor. Hard CI gate.
2. **WhatsApp-native** — no commercial app ships this. Cloud API upgrade locks it in.
3. **MIT + self-hostable + offline-first + RTL-first** — the privacy + portability + locale moat.

---

## 1. North Star & Current State

### Actual state — v17.0.0 · 2026-06-01

| Metric | Value | Health |
| --- | --- | --- |
| Tests | **4 189 passing · 269 files · 0 Node warnings** | ✅ |
| TypeScript errors | **0** — baseline cleared S293 | ✅ |
| Dead exports | 0 — all exports wired | ✅ |
| Lint (JS · CSS · HTML · MD · i18n parity) | 0 errors · 0 warnings | ✅ |
| Sections | **24** modules · **19** templates · **8** modals · all on BaseSection | ✅ |
| Services | **25** files (target ≤ 25 held) | ✅ |
| console.error | 0 outside allowlist (ADR-032) | ✅ |
| CSS @scope | 0 bare `[data-section]` selectors | ✅ |
| Trusted Types | 5 structural sinks (ratchet enforced) | ✅ |
| SQL lint | 0 violations | ✅ |
| Coverage | lines 58% · branches 51% (floor ratchet) | ✅ |
| Repositories | mandatory data path; ESLint enforced | ✅ |
| Handlers | clean separation; 7 files | ✅ |
| i18n keys | **1 373** keys × 5 locales (HE · EN · AR · FR · ES) | ✅ |
| DB migrations | **25** Supabase migrations | ✅ |
| Active backend | `BACKEND_TYPE = "supabase"` · Supabase is primary backend | ✅ |
| Auth tokens | AES-GCM encrypted (`secure-storage.js`) | ✅ |
| Bundle | ~45 KB gzip · hard CI gate ≤ 60 KB | ✅ |
| Node | **22 LTS** CI matrix + `.nvmrc` | ✅ |
| Supply-chain | OpenSSF Scorecard · SBOM · Trivy · CodeQL · Dependabot grouped | ✅ |
| Auth providers | Supabase Auth (Google · Apple · email allowlist + anonymous) · SDKs removed | ✅ |
| Service Worker | precache + 5-strategy cache (cache-first / network-first / SWR) | ✅ |
| Realtime | Supabase Realtime **active** — live indicator + presence badges | ✅ |
| Undo | Ctrl+Z toast for guest/table/vendor deletes | ✅ |
| Gallery | Supabase Storage upload + data-URL fallback | ✅ |
| Edge functions | partial (push sender · WABA sender) | ⚠ expand |
| Themes | 5 base + theme.json + live CSS-var editor | ✅ |
| Store | Preact Signals reactive store (S400) | ✅ |
| Modals | 8 native `<dialog>` · autofocus + ESC focus-restore (S402–S403) | ✅ |
| Mutation testing | Stryker pilot scoped to `core/` + `repositories/` (S406) | ✅ |
| pnpm pilot | parallel CI workflow evaluating install-time (S407 · ADR-043) | ⚠ in progress |
| Plugin surface | manifest validator — data model only | ⚠ |
| Public website builder | data model + slug — UI not wired | ⚠ |
| Workspace RBAC | role/permission helpers — UI not wired | ⚠ |
| Monitoring | `services/monitoring.js` wired, DSN unset | ⚠ |
| Deploy | GitHub Pages · <https://rajwanyair.github.io/Wedding> | ✅ |

### North Star

*The fastest, most accessible, RTL-native, offline-first, open-source wedding manager on the web.
Self-hostable in one click. Operable on flaky 3G in Hebrew. Integrated end-to-end with WhatsApp.
With planner-grade analytics, AI-optional assistance, and a bundle 5–10× smaller than every
commercial competitor. $0/month self-hosted.*

### Quality bar — every PR

`npm run lint` → 0 errors · `npm test` → 0 fail · axe → 0 violations · Lighthouse ≥ 95 ·
bundle ≤ 60 KB gzip · `npm run audit:security` → 0 findings · i18n parity 100% ·
`npm run audit:arch` → 0 violations · `npm run check:i18n` → 0 missing keys.

---

## 2. Decisions — Master Verdict Matrix

> Every architecturally significant decision, re-opened from scratch — April 2026.
> Verdict is binding until a new ADR overrides it.

### 2.1 Frontend

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | UI runtime | Vanilla ES2025, no framework | Vanilla + custom Proxy store | **Keep vanilla · upgrade internals** | Bundle moat only defensible without framework overhead. |
| 2 | UI reactivity | Custom deep Proxy watch | `core/store.js` | **Replace internals → Preact Signals (~3 KB)** | Nested mutations miss reactivity; Signals are explicit + 0-config. |
| 3 | Build tool | Vite 8 | active | **Stay Vite 8 → Vite 9 when stable** | Rolldown-backed Vite 9 lands inside Vite; no disruption. |
| 4 | Build runtime | Node 22 LTS · npm 11 | active | **Stay · evaluate Bun for local dev-test speed** | Bun test runs ~4× faster locally; CI stays Node for stability. |
| 5 | CSS architecture | `@layer` + nesting + `@scope` | 7 modules | **Keep + add container queries · `light-dark()` · `color-mix()`** | Native primitives outpace every CSS library at our scale. |
| 6 | CSS tooling | Vanilla (no preprocessor) | active | **Stay vanilla; PostCSS only if a polyfill is unavoidable** | `@layer`, `@scope`, nesting, container-q all baseline 2025+. |
| 7 | Tailwind CSS v4 | Not adopted | reviewed | **Reject** — our token system is more specific; 0 KB advantage | Tailwind v4 uses CSS vars like us; adds ~4 KB gzip overhead. |
| 8 | Theming | 5 `body.theme-*` classes + live picker | active | **Keep + expose all vars to user** | Live picker shipped; full var editor in Phase D1. |
| 9 | Modal system | 8 div-based HTML files | active | **Migrate to native `<dialog>` + Popover API** | Native focus management; drops polyfill; better a11y. |
| 10 | Routing | Hash router (`core/nav.js`) | active | **Replace → `pushState` + typed routes + View Transitions** | Back button broken; no deep links; broken PWA share. |
| 11 | UI delegation | `data-action` event delegation | active | **Keep + enforce `module:action` namespace uniformly** | Proven; just close the naming gap. |
| 12 | UI primitives | Manual focus + tooltip polyfill | active | **Adopt Popover API + Anchor Positioning + CSS Anchor Positioning** | Native; 0 KB; better a11y. |
| 13 | Web Components | Not used | reviewed | **Reject for sections; use for atomic shared elements only** | Custom elements good for `<wedding-badge>`, `<rsvp-pill>`; not sections. |
| 14 | Virtual scrolling | Not implemented | reviewed | **Add — pure DOM, no library** | 1 000+ guest lists today are O(n) DOM nodes. |
| 15 | URL filter state | Not in URL | reviewed | **Adopt after router refactor (Phase A5)** | Deep-linkable filters are table-stakes for power users. |
| 16 | Error boundaries | Not in BaseSection | reviewed | **Add to `BaseSection` — per-section recovery + toast fallback** | A crash in one section should not take down the app. |
| 17 | Animation | CSS transitions only | active | **Add View Transitions API + Animation Timeline** | Cross-document + cross-section transitions; CSS-only fallback. |
| 18 | Font strategy | System font stack (Tahoma · Segoe UI) | active | **Keep system fonts** | HE RTL rendering is best with system fonts; zero font-load cost. |
| 19 | Print pipeline | `services/print-rows.js` built | unverified | **Wire in Phase C8 — dietary cards, seating cards, programme** | Service is built; just needs UI trigger. |
| 20 | Structured data | None | reviewed | **Add JSON-LD `Event` schema to public wedding website** | SEO + Google rich results for venue/date search. |

### 2.2 Backend & Data

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 21 | Primary backend | Google Sheets | `BACKEND_TYPE = "sheets"` | **Flip to Supabase — P0, v14 deadline** | Sheets quotas fail; dual-write rehearsal shows Supabase is ready. |
| 22 | Database | Supabase Postgres + RLS | 25 migrations | **Keep + harden** | `supabase db lint` in CI; composite indexes on every hot table. |
| 23 | Database indexing | Partial | active | **Add composite indexes on every `event_id` FK table** | All queries are event-scoped; missing indexes = full-table scans. |
| 24 | Soft delete | `deleted_at` columns | migrations 009/015/017 | **Keep + automate 90-day hard-delete cron via Edge Function** | Undo feature requires tombstones; retention policy caps storage. |
| 25 | Edge runtime | Supabase Edge partial | partial | **Hybrid: Supabase Edge for DB-coupled; Cloudflare Workers for stateless** | Workers cold-start faster; free 100 K req/day; Supabase for DB. |
| 26 | Auth system | 3 OAuth SDKs + email allowlist | GIS + FB + AppleID | **Replace → Supabase Auth (Google + Apple); drop FB entirely** | −30 KB bundle; uniform JWT; email magic link included. |
| 27 | Auth admin model | `ADMIN_EMAILS` in `config.js` | source-controlled | **Move to `admin_users` table + RLS + Settings UI** | Co-planner today requires a full deploy. |
| 28 | Auth future | Email/OAuth only | reviewed | **Add WebAuthn passkeys for admin (Phase E2)** | Passkeys > passwords; biometric unlock for event-day kiosk. |
| 29 | Storage primary | `localStorage` (5 MB, plaintext) | active | **IndexedDB primary + AES-GCM at rest** | 5 MB cap; XSS reads sessions; no crash recovery. |
| 30 | Offline write queue | In-memory 1.5 s debounce | `enqueueWrite()` | **IDB-persisted + Background Sync API** | Memory queue lost on page crash = silent data loss. |
| 31 | Realtime | Supabase Realtime wired | idle | **Activate: presence badges + live RSVP counter + conflict resolver** | Built-in; near-zero cost; differentiates from every competitor. |
| 32 | File storage | None | reviewed | **Supabase Storage + signed URLs + image transforms** | Same provider; free 1 GB; CDN-delivered signed URLs. |
| 33 | Secrets management | GitHub Secrets + rotation runbook | active | **Keep + add OIDC token auth for Actions (no long-lived secrets)** | OIDC = zero-rotation for GH Actions. |
| 34 | CRDT | None | reviewed | **Reject** — Realtime channels + last-write-wins suffice at our scale | CRDT complexity unjustified for couple+planner edit volume. |

### 2.3 Code Quality & Language

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 35 | Code language | JS + JSDoc + `types.d.ts` | TSC 0 errors | **Stay JSDoc-strict** — TypeScript migration cost/benefit still unfavourable | TSC at 0 errors means type coverage is equivalent; migration saves nothing. |
| 36 | TypeScript (reopen) | Rejected in v12 roadmap | TSC now 0 errors | **Reopen for new files only as ADR opt-in** | With 0 TSC errors, new services/handlers *could* ship as `.ts`; test appetite first. |
| 37 | Validation | Valibot at most boundaries | ~80% coverage | **Complete to 100% at every external input** | Well-chosen tool; finish the job. |
| 38 | Validation runtime | Valibot (1 KB) | active | **Keep Valibot** vs Zod (13 KB) / ArkType / TypeBox | Bundle moat; same DX where it matters. |
| 39 | Sanitization | DOMPurify | `utils/sanitize.js` | **Keep** | Required; minimal; no alternative. |
| 40 | Linting | ESLint 10 flat config | active | **Keep + evaluate Biome as supplemental speed check** | Biome is faster but has fewer rules; ESLint for depth, Biome for local CI speed. |
| 41 | Formatting | Prettier (`.prettierrc.json`) | active | **Keep** | Single source of truth for code style; scripts added v13.20.0. |
| 42 | Arch enforcement | `arch-check.mjs --strict` + ESLint | active | **Keep + extend to handler→repository layer checks** | Sections → handlers → repositories → services is the canonical path. |
| 43 | Dead export audit | `dead-export-check.mjs` | baseline 0 | **Keep gated; enforce in CI on every PR** | Export audit prevents silent dead-code accumulation. |
| 44 | Coverage tool | `@vitest/coverage-v8` (c8) | advisory | **Enforce: 80% lines / 75% branches gate in CI** | Currently advisory; regressions arrive silently. |
| 45 | JSDoc coverage | eslint-plugin-jsdoc | `core/services` gated | **Extend gate to all of `src/`** | 100% in `core/services/` already; extend to sections/utils. |

### 2.4 Build & Tooling

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 46 | Bundler | Vite 8 + `manualChunks` | active | **Drop `manualChunks`; use dynamic `import()` only** | Manual config breaks on rename; Vite auto-splits dynamically. |
| 47 | Package manager | npm 11 + shared `node_modules/` | active | **Stay npm; evaluate pnpm for strict phantom-dep blocking** | pnpm strict mode would catch phantom deps; migration cost is low. |
| 48 | pnpm adoption | Not adopted | reviewed | **Pilot pnpm in CI-only mode first** | Stricter than npm; shared `node_modules/` workspace may conflict. |
| 49 | Bun runtime | Not adopted | reviewed | **Use Bun for local test speed; keep Node 22 in CI** | `bun test` is ~4× faster locally; CI stability favours Node LTS. |
| 50 | Code splitting | `manualChunks` | active | **Remove; rely on dynamic `import()`** | Less config; fewer rename-time bugs; Vite tree-shakes better. |
| 51 | Service Worker | Custom precache + queue | `public/sw.js` | **Rewrite: strategy cache + Workbox patterns, no Workbox dep** | Workbox adds 30 KB; adopt its *patterns* without the dep. |
| 52 | PWA | Manifest v2 + SW | active | **Upgrade: Badge API + Share Target + Periodic Sync + Protocol Handlers** | Native-class install experience; competitive differentiator. |
| 53 | CI matrix | Node 22 single version | active | **Keep single LTS; add Bun matrix entry as advisory** | Node 22 is the authoritative gate; Bun is exploratory. |
| 54 | GitHub Actions | 7 workflows | active | **Keep + add OIDC token auth; remove legacy PATs** | OIDC is more secure; no rotation required. |

### 2.5 Infrastructure & Hosting

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 55 | Hosting | GitHub Pages | canonical | **Keep GH Pages canonical + Cloudflare proxy** | HTTP/3 + Brotli + image transforms; free. |
| 56 | CDN | None | reviewed | **Add Cloudflare proxy (free plan)** | Brotli compression alone reduces ~45 KB further; DDoS protection. |
| 57 | Custom domain | None | `github.io/Wedding` | **Acquire short vanity domain (~$10/yr)** | Memorable; couples share the RSVP URL. |
| 58 | Self-host templates | None | reviewed | **Add one-click templates: Vercel + Netlify + Cloudflare + Render** | Needed for enterprise adoption. |
| 59 | Monitoring | Adapter wired, DSN unset | `monitoring.js` | **Activate Sentry free / Glitchtip self-host; opt-in DSN env var** | Production failures invisible today. |
| 60 | Uptime monitoring | None | reviewed | **Add UptimeRobot free (50 monitors, 5-min check)** | Free; instant alert if GH Pages is down. |
| 61 | Edge geography | Supabase region | single region | **Plan multi-region for Phase E4** | GDPR data-residency; EU / IL / US coverage. |

### 2.6 i18n & Accessibility

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 62 | i18n format | Flat JSON key/value | 1 209 keys × 5 locales | **Add ICU MessageFormat for plurals + gender** | HE/AR plural forms are not expressible in flat strings. |
| 63 | i18n locales | HE · EN · AR · FR · ES | 5 locales | **Complete AR quality pass first; then add RU (community)** | Defends RTL leadership claim. |
| 64 | Locale fallback | Falls through to HE | active | **Keep HE primary; add per-key en fallback for partial locales** | Prevents blank strings in community locales. |
| 65 | RTL testing | Manual + CI Lighthouse | active | **Extend Playwright a11y tests to per-locale RTL parity** | Pixel delta < 5% between HE and EN layout. |
| 66 | Accessibility | WCAG 2.2 AA + axe-zero | CI gate | **Keep + add real Hebrew RTL screen-reader test in Playwright** | axe catches syntax; only screen-reader test catches semantics. |

### 2.7 External APIs & Integrations

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 67 | WhatsApp | `wa.me` + WABA helper | active | **Upgrade → WhatsApp Cloud API via edge function** | Bulk send + delivery webhooks + A/B tests; `wa.me` as fallback. |
| 68 | Google OAuth | GIS SDK in bundle | active | **Migrate to Supabase Auth provider; drop GIS SDK** | −12 KB; Supabase handles refresh tokens. |
| 69 | Facebook OAuth | FB SDK dynamically loaded | active | **Drop entirely** | < 2% adoption; SDK is 30 KB; GDPR cost is high. |
| 70 | Apple OAuth | AppleID SDK dynamically loaded | active | **Migrate to Supabase Auth provider; drop AppleID SDK** | Same rationale as Google migration. |
| 71 | AI / LLM | Prompt-builders only | `ai-draft.js`, `ai-seating.js` | **Edge function proxy (CF Worker) + BYO key + streaming** | Never expose keys in client bundle; multi-provider; Ollama local opt-in. |
| 72 | Payments | Deep links (Bit/PayBox/PayPal) | `payment-link.js` | **Add Stripe Checkout via edge function for vendor receipts** | Hosted; no PCI scope in client; receipt emails via Stripe. |
| 73 | Maps | None | reviewed | **OpenStreetMap embed + Waze + Google Maps deep link** | Privacy-first (OSM); zero dep; Waze is dominant in IL. |
| 74 | Calendar | ICS + Google Cal deep link | wired S72 | **Keep + add Google Calendar OAuth for two-way sync** | Couples expect "add to calendar" to actually sync. |
| 75 | Web Push | VAPID + Supabase tables | wired S75 | **Keep + add Badge API + Push payload encryption** | Encrypted push is a 2026 baseline expectation. |
| 76 | Photo CDN | None | reviewed | **Supabase Storage + Cloudflare image transforms** | Same provider; signed URLs; transform via Cloudflare Worker. |
| 77 | Vendor catalogue | CRUD only | active | **Add CSV/JSON import; no walled directory** | OSS-aligned; no lock-in; IL vendors export from Lystio/Bridebook. |
| 78 | Registry integration | None | reviewed | **Add structured deep links: Amazon IL · boutique gift stores** | Couples expect registry links; no API keys needed for deep links. |
| 79 | Compliance API | None | reviewed | **Phase F: GDPR erasure endpoint + data-portability export** | Required for EU self-hosters. |

### 2.8 Documentation & Developer Experience

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 80 | Docs structure | Diátaxis (tutorial/how-to/reference/explanation) | partially applied | **Complete Diátaxis re-org; archive docs > 2 minor versions old** | Discoverability still poor; old docs mislead new contributors. |
| 81 | Docs renderer | Markdown only | active | **Stay Markdown; add MkDocs/Starlight if `docs/` passes 80 files** | Markdown survives every renderer. |
| 82 | ADR practice | 12 ADRs | active | **Mandate ADR for every "Replace" verdict in §2** | Already required; enforce in PR template checklist. |
| 83 | Mermaid diagrams | `ARCHITECTURE.md` + `validate-mermaid.mjs` in CI | active | **Keep + add sequence diagrams for auth, sync, RSVP, push flows** | Diagrams are the living spec. |
| 84 | User-facing guides | None | reviewed | **Add: couple-guide · planner-guide · vendor-guide · self-host-guide** | Required for "best in class"; every competitor has user docs. |
| 85 | Copilot agents | 5 custom agents | `.github/agents/` | **Keep + add `supabase-agent`, `security-agent`, `performance-agent`** | Agents encode domain knowledge; reduce PR review overhead. |
| 86 | Inline docs | `eslint-plugin-jsdoc` gated | `core/services/` | **Extend gate to all `src/`** | 100% in core; extend to sections/handlers/repositories. |

### 2.9 Testing

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 87 | Unit tests | Vitest 4 · 4 179 tests · 268 files | active | **Keep + enforce 80% lines / 75% branches CI gate** | Gate is advisory today; regressions arrive silently. |
| 88 | E2E tests | Playwright · smoke + visual regression | active | **Expand: full RSVP · offline · multi-event · a11y per locale** | One smoke test is not a regression suite. |
| 89 | Visual regression | Playwright pixel diff | smoke only | **Extend to per-section per-theme screenshot baseline** | CSS layer bleeds caught before review. |
| 90 | Performance tests | Lighthouse CI hard gate | active | **Keep + extend to per-locale runs** | RTL Lighthouse parity is the differentiator. |
| 91 | Mutation testing | None | reviewed | **Evaluate Stryker on `core/` and `repositories/`** | Reveals tests that pass on dead code. |
| 92 | Contract tests | None | reviewed | **Add MSW contracts for Supabase RPC + Edge Functions** | Catches breaking API changes before deploy. |

### 2.10 Security

| # | Layer | Decision | Today | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| 93 | CSP | Enforced in production | active | **Keep + add `require-trusted-types-for 'script'`** | Trusted Types policy already ratcheted; enforce in CSP. |
| 94 | SRI | Applied to CDN assets | active | **Keep + validate in CI (`npm run sri`)** | Already gated; no action. |
| 95 | Supply chain | SBOM + Trivy + Scorecard + CodeQL | active | **Keep + add GitHub Actions OIDC (no long-lived PATs)** | OIDC tokens are short-lived; no rotation required. |
| 96 | PII handling | `secure-storage.js` AES-GCM | active | **Complete: IDB primary + all PII keys encrypted + audit log surface** | Only session token is encrypted today; guest email/phone are not. |
| 97 | Secret scanning | `check-plaintext-secrets.mjs` | active | **Keep + add `trufflesecurity/trufflehog` GH Action** | Catches secrets that regex misses. |
| 98 | Telemetry | None in upstream build | active | **Keep zero-telemetry pledge; document in `docs/principles/no-telemetry.md`** | Privacy moat is a documented, testable commitment. |
| 99 | OWASP compliance | Security scan in CI | active | **Keep + add automated OWASP ZAP scan against Vite preview** | `security-scan.mjs` covers static; ZAP covers runtime. |
| 100 | Compliance posture | None formal | reviewed | **Phase F: GDPR + CCPA + LGPD erasure + portability + audit-log surfacing** | Required for EU/CA/BR self-host. |

---

## 3. First-Principles Rethink — If We Built Today (2026)

> Pretend the repo is blank. It is 2026. We are building a Hebrew-first RTL wedding manager for
> a 300-guest event, $0/month budget, offline-capable, WhatsApp-native, open-source.

| Layer | 2026 greenfield choice | Current reality | Decision |
| --- | --- | --- | --- |
| UI runtime | Vanilla ES2026 + Preact Signals (3 KB) | Vanilla + custom Proxy | Adopt Signals under existing API |
| Build | Vite 9 (Rolldown) + dynamic imports | Vite 8 + `manualChunks` | Remove `manualChunks`; adopt Vite 9 when stable |
| CSS | `@layer` + `@scope` + container-q + `light-dark()` + `color-mix()` + View Transitions | Same + 5 themes | Add remaining CSS primitives per section |
| Modals | Native `<dialog>` + Popover API + Anchor Positioning | 8 div-based modals | Migrate in Phase B6 |
| Routing | `pushState` + typed routes + query params + View Transitions API | Hash router, broken back | Replace in Phase A5 |
| State | Preact Signals — explicit, 0-overhead | Custom recursive Proxy (silent misses) | Replace internals; keep public API |
| Storage | IDB primary + AES-GCM at rest + persistent queue | `localStorage` plaintext | Phase A4 + A6 |
| Backend | Supabase as single source of truth | Sheets runtime primary | Flip — Phase A1 |
| Edge | Supabase Edge (DB-coupled) + Cloudflare Workers (stateless) | Supabase Edge partial | Split per-function Phase A6 + C2–C3 |
| Auth | Supabase Auth (Google + Apple OIDC) + magic link + WebAuthn passkeys | 3 SDKs + email allowlist | Phase A3; drop FB |
| Code language | JS + JSDoc-strict (`types.d.ts`) + TSC → 0 | Already 0 TSC errors | Continue; pilot `.ts` for new files via ADR |
| Validation | Valibot at every boundary (100%) | Valibot at ~80% | Complete to 100% |
| i18n | ICU MessageFormat + 5 locales | Flat JSON + 5 locales | Add ICU for plurals/gender |
| Offline | SW strategy cache + Background Sync + Periodic Sync + Push API | SW + IDB queue | Phase B4 SW rewrite |
| Services | ≤ 20 files, single-responsibility | 25 files (held target) | Keep ≤ 25; aim ≤ 20 in v15 |
| Tests | Vitest + Playwright + axe-per-locale + LH-CI + visual-reg per section | Strong unit + smoke E2E | Expand E2E; add mutation testing |
| Hosting | GH Pages canonical + Cloudflare proxy | GH Pages only | Phase D6 |
| AI | Edge proxy + BYO key (multi-provider + Ollama) + streaming | Prompt-builders only | Phase C3 |
| Payments | Stripe Checkout (vendor) + IL deep-links (guest registry) | Deep links only | Phase C6 |
| Photos | Supabase Storage + transforms + signed URLs | None | Phase C7 |
| Monitoring | Sentry/Glitchtip opt-in DSN + UptimeRobot | Adapter unactivated | Phase A7 |
| Mobile | PWA primary + Capacitor when install-rate data available | PWA only | Phase D9 |
| Docs | Diátaxis + ADR per Replace + user guides | Partially Diátaxis | Phase B+ |
| Security | OWASP Top 10 gated + Trusted Types in CSP + OIDC Actions | Mostly gated | Complete Trusted Types + OIDC |

**Net verdict:** direction is exactly right. Gaps concentrate in five deferrable-no-longer systems:
**backend flip, auth consolidation, storage encryption, router replacement, Signals adoption.**
Fixing these five unlocks every other capability downstream.

---

## 4. Competitive Landscape & Harvest Matrix

### 4.1 Deep feature comparison — 16 products (2026)

| Capability | Zola | Joy | RSVPify | Eventbrite | Withjoy | Aisle Planner | PlanningPod | Greenvelope | Honeyfund | Lystio IL | Minted | Riley&Grey | HoneyBook | Bridebook | **Ours v13.20** | **Target** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest + RSVP | CRM, +1 | Group RSVP | **Best forms** | Ticket | Co-edit live | Full CRM | Full CRM | Email-rich | Registry-RSVP | HE basic | Gallery | Boutique | CRM | Full CRM | Phone-first, WhatsApp | Conditional Q chains |
| Seating chart | DnD conflict | DnD | Add-on | None | DnD realtime | **Floor plan** | DnD + floor | None | None | None | None | None | None | None | DnD + conflict | AI CSP solver + floor plan |
| Budget | Vendor-pay | Simple | None | None | None | Full | **Best** | None | Registry | None | None | None | None | Benchmarks | Categories + variance | Burn-down, forecast |
| Vendor mgmt | Marketplace | List | None | None | None | **Best** | Full CRM | Curated | None | 5 000+ IL | Curated | Premium | **Full CRM** | 70 K+ UK | CRUD+pay+WA | Inbox, contracts, e-sign |
| Website builder | 100+ themes | **AI builder** | Form only | None | Modern + live | Limited | None | Email+web | Registry page | None | **Premium** | **Premium typography** | None | Limited | 5 themes + live picker | AI builder + custom domain |
| Event check-in | None | None | Add-on | **QR+NFC+kiosk** | None | None | None | None | None | None | None | None | None | None | Real-time stats | NFC kiosk + badge print |
| WhatsApp | None | None | None | None | None | None | None | None | None | Basic wa.me | None | None | None | None | **WABA helper + Cloud API** | Cloud API bulk+webhooks |
| Offline | None | None | None | None | None | None | None | None | None | None | None | None | None | None | **SW + IDB queue** | Background Sync |
| Multi-language | EN | EN | EN | 50+ | EN | EN | EN | EN | EN | **HE** | EN | EN | EN | EN | **HE+EN+AR+FR+ES** | ICU plurals + RU |
| Accessibility | Partial | Partial | Partial | Solid | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | **WCAG 2.2 AA + axe-CI** | RTL screen-reader parity |
| Privacy / OSS | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | **OSS MIT self-host** | GDPR pack + 1-click deploy |
| Multi-event | One | One | Pro | Many | **Realtime co-edit** | Best | **Best** | Multi | One | One | One | One | **Best** | Multi | Multi-event | Org/team/planner |
| AI features | Venue match | **Site builder AI** | None | None | AI seating | None | None | None | None | None | None | None | None | Shortlisting | Prompt-builders | BYO-key edge proxy |
| Analytics | Basic | Min | Funnels | Solid | None | Full | **Best** | Email opens | None | None | None | None | None | Market data | Funnel+budget+checkin | Cohort, A/B, no-show ML |
| Realtime collab | None | None | None | Limited | **Best** | None | None | None | None | None | None | None | None | None | Wired but idle | Presence badges |
| Payments | Zola Pay | Registry | Stripe add-on | Stripe | Registry | Stripe | Stripe | Stripe | **Registry best** | None | Stripe | Stripe | **Contracts+Stripe** | Stripe | Deep-links IL | Stripe vendor receipts |
| Native mobile | iOS+Android | iOS+Android | Web | iOS+Android | iOS+Android | iOS+Android | iOS+Android | Web | iOS+Android | iOS+Android | iOS+Android | iOS+Android | iOS+Android | iOS+Android | **PWA** | Capacitor Phase D |
| Bundle gzip | ~300 KB | ~250 KB | ~180 KB | ~250 KB | ~220 KB | ~350 KB | ~400 KB | ~200 KB | ~180 KB | ~200 KB | ~350 KB | ~300 KB | ~300 KB | ~280 KB | **~45 KB** | Hard gate ≤ 60 KB |
| Open source | No | No | No | No | No | No | No | No | No | No | No | No | No | No | **Yes (MIT)** | Plugin + theme marketplace |
| Pricing | Subscription | Freemium | Subscription | Commission | Subscription | Subscription | Subscription | Subscription | Commission | Subscription | Commission | Subscription | % revenue | Freemium | **Free + self-hosted** | $0 default |

### 4.2 Our unique advantages — defend and double down

| Advantage | Moat strength | Investment needed |
| --- | --- | --- |
| **WhatsApp-native** | No commercial competitor ships this | Upgrade → Cloud API (Phase C2) |
| **RTL-first HE + AR** | No competitor supports RTL at this depth | Complete AR quality; Playwright RTL parity |
| **MIT + self-host** | Privacy moat; enterprises can deploy internally | 1-click deploy templates (Phase D) |
| **Offline + Background Sync** | No competitor ships offline write capabilities | Phase B4 SW rewrite |
| **Bundle ≤ 60 KB gzip** | 5–10× smaller than every competitor | Hard CI gate; Signals not framework |
| **Multi-event planner model** | Most consumer tools cap at one event | Org/team/planner mode (Phase D) |
| **Open source** | Forkable, auditable, community-buildable | Plugin + theme marketplace (Phase E) |
| **Phone-first RSVP** | Matches Israeli/Middle-East communication norms | Wire to Cloud API; improve validation UX |

### 4.3 Capabilities to harvest — concrete sources

| From | What to steal | Why |
| --- | --- | --- |
| **RSVPify** | Conditional RSVP question engine + plus-one chains + dietary questions | Best RSVP forms in the category |
| **Zola** | DnD seating with relationship constraints + visual conflict surfacing | Algorithm built (`seating-ai.js`); UI missing |
| **Joy 2026** | AI website builder with live preview + custom domain handoff | Matches `website-builder.js` (S134); AI edge proxy gives this for free |
| **Eventbrite** | QR/NFC scan-in + offline-first verify + badge print | `qr-code.js` + `nfc.js` already built |
| **PlanningPod** | Vendor CRM: inbox, contracts, payment timeline, SLA scoring | Our vendors are CRUD-only |
| **Aisle Planner** | Venue floor-plan builder — furniture, head table, dance floor | Extends DnD seating to full venue layout |
| **HoneyBook** | Contract templates + e-signature + payment milestones for vendors | Phase C6 extension |
| **Withjoy 2026** | Realtime co-edit: both partners edit any field simultaneously | Realtime channels already wired |
| **Riley & Grey** | Premium CSS transitions + typography + animated section entrances | View Transitions API + Animation Timeline |
| **Bridebook** | Vendor SLA scoring + regional budget benchmarks | Planner-grade analytics section |
| **Loops.so** | Scheduled WhatsApp/email campaigns + trigger automations | WABA Cloud API (Phase C2) makes this cheap |
| **Cal.com** | Public-page builder + theme tokens + custom domain CNAME + password | Matches `website-builder.js` |
| **Linear / Height** | Keyboard-first power UX + hash-deep-linkable filters + saved views | After pushState router (Phase A5) |
| **Stripe Apps** | Plugin manifest + permission scopes + sandboxed runtime | Matches `plugin-manifest.js` (S133) |
| **Notion AI** | Inline ⌘K AI commands in any field | Cmd-K palette (S109) + edge AI proxy |
| **Eventbrite Day-of** | Offline kiosk with badge print + buffer flush on reconnect | `qr-code.js` + `nfc.js` + badge print |
| **Lystio IL** | Israeli vendor directory import | Phase C vendor catalogue |

### 4.4 Technical stack benchmark — 2026

| Dimension | Zola | Joy | RSVPify | PlanningPod | HoneyBook | Lystio IL | **Ours v13.20** | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Frontend | React 18 + Next SSR | React 18 + AI | Vue 3 + Nuxt | Angular 15 | React 18 | PHP + jQuery | **Vanilla ES2026 + Vite 8** | **Keep vanilla** |
| CSS | Tailwind + CSS Modules | Styled-components | Sass + Bootstrap | Material UI | Tailwind | Bootstrap 3 | **`@layer` + nesting + `@scope`** | **Ahead** |
| State | Redux RTK | Apollo cache | Vuex | NgRx | Zustand | jQuery globals | Custom Proxy → **Signals** | Adopt Signals |
| Routing | Next file router | React Router | Vue Router | Angular Router | React Router | PHP routes | **Hash → pushState** | Replace |
| Backend | Node microservices | GraphQL + Lambda | Rails monolith | .NET + SQL Server | Node + PG | PHP + MySQL | **Supabase (Sheets active)** | **Flip to Supabase** |
| Edge | Lambda | Lambda + CF | n/a | n/a | Lambda | None | **Hybrid Supabase + CF Workers** | Split per-function |
| Auth | NextAuth | Auth0 | Devise | Custom | Firebase Auth | PHP sessions | **3 SDKs → Supabase Auth** | Consolidate |
| DB | PG + Redis | DynamoDB + RDS | PG | SQL Server | PG | MySQL | **Supabase PG + RLS (25 mig)** | Keep + harden |
| Realtime | Pusher | GraphQL subs | Polling | SignalR | None | None | **Supabase Realtime (idle)** | **Activate** |
| File storage | S3 + CF | S3 | S3-compatible | Azure Blob | S3 | Local disk | **None → Supabase Storage** | Add |
| Offline | None | None | None | None | None | None | **SW + IDB queue** | Upgrade |
| Errors | Datadog | Sentry | Rollbar | Raygun | None | None | **Monitoring.js (unactivated)** | Activate |
| CI/CD | GHA + Vercel | GHA + AWS | CircleCI | Azure DevOps | GHA | Manual FTP | **7 pinned GHA workflows** | Add OIDC |
| Bundle gzip | ~300 KB | ~250 KB | ~180 KB | ~400 KB | ~300 KB | ~200 KB | **~45 KB** | Defend ≤ 60 KB |
| Hosting | Vercel SSR | AWS CF | Heroku | Azure | AWS | cPanel | **GH Pages + CF proxy** | Add CF |
| AI | Some | **Yes (site)** | None | None | None | None | **Plan: BYO-key edge proxy** | Privacy-first |
| Open source | No | No | No | No | No | No | **Yes (MIT)** | Extend |

### 4.5 Lystio / local IL market — direct benchmark

| Feature | Lystio | Ours | Position |
| --- | --- | --- | --- |
| Hebrew UX | Hebrew-only | Hebrew-first + EN + AR (partial) | We lead (depth) |
| WhatsApp invites | Basic `wa.me` | WABA helper + Cloud API plan | We lead |
| Israeli vendor directory | 5 000+ vendors (subscription) | CRUD + CSV import (Phase C) | **Gap — import route** |
| Bit / PayBox payments | None | Deep-link utils built | We lead (wire it) |
| Israeli phone format | Yes | `cleanPhone()` handles | Parity |
| Offline support | None | SW + IDB queue | We lead |
| PWA / installable | None | Yes | We lead |
| Tech stack age | PHP + jQuery (legacy) | ES2026 (modern) | We lead |
| Open source | No | MIT | We lead |
| Pricing | Subscription | Free + self-hosted | We lead |

---

## 5. Honest Audit by Layer

### 5.1 Frontend

✅ **Vanilla ES2026** — keep · ✅ **Vite 8** — keep; upgrade to Vite 9 when stable ·
❌ **`manualChunks`** — remove; dynamic import only · ✅ **`@layer` CSS** — keep ·
✅ **`@scope` per section** — keep + extend · ➕ **Container queries** — add in remaining sections ·
➕ **`light-dark()`** — adopt for system color-scheme respect · ✅ **5 themes** — keep + extend vars ·
❌ **8 div-based modals** — migrate to native `<dialog>` · ❌ **Hash router** — replace with pushState ·
❌ **Custom Proxy store** — replace internals with Preact Signals · ✅ **SW** — keep + rewrite patterns ·
✅ **`data-action` delegation** — keep + namespace · ➕ **Popover API** — adopt for tooltips/dropdowns ·
➕ **View Transitions API** — adopt for section navigation · ➕ **Virtual scroll** — add for guest lists ·
➕ **Error boundaries in BaseSection** — add section-level recovery.

### 5.2 Backend & Data

❌ **Sheets runtime** — flip to Supabase P0 · ✅ **Supabase PG + RLS** — keep + harden ·
➕ **Composite indexes** — add on every event_id FK table · ✅ **Soft delete** — keep + 90-day cron ·
❌ **`localStorage` primary** — replace with IDB · ❌ **Plaintext PII** — encrypt with AES-GCM ·
❌ **Memory write queue** — replace with IDB + Background Sync · ✅ **Services ≤ 25** — hold gate ·
❌ **`ADMIN_EMAILS` in config** — move to `admin_users` table · ❌ **Realtime idle** — activate ·
➕ **Edge functions** — expand: WABA + push + GDPR + RSVP webhook + LLM proxy.

### 5.3 Code Language & Quality

✅ **JS + JSDoc + `types.d.ts`** — keep · ✅ **TSC → 0** — hold · ✅ **Valibot** — keep + complete 100% ·
✅ **DOMPurify** — keep · ✅ **Repositories enforced** — keep arch-check · ✅ **Handlers separated** — keep ·
✅ **Action namespacing** — keep + enforce `module:action` uniformly · ✅ **Constants centralised** — keep ·
❌ **Coverage advisory** — enforce 80/75 gate in CI · ❌ **JSDoc gate stops at core** — extend to all `src/`.

### 5.4 Infrastructure & Tooling

✅ **Node 22 LTS + `.nvmrc`** — keep · ✅ **Vite 8** — keep → Vite 9 path · ✅ **Vitest 4** — keep ·
✅ **Playwright** — keep + expand · ✅ **ESLint 10 flat** — keep · ✅ **Coverage** — enforce gate ·
❌ **`manualChunks`** — remove · ❌ **Monitoring DSN unset** — activate · ✅ **supabase db lint** — keep ·
✅ **Trusted Types ratchet** — keep + add to CSP · ✅ **LH-CI** — keep + per-locale extension ·
➕ **Visual regression per section** — extend Playwright.

### 5.5 External APIs & Services

| Service | Today | Action |
| --- | --- | --- |
| Google OAuth (GIS) | Active runtime | Migrate to Supabase Auth |
| Facebook OAuth (FB JS SDK) | Dynamic load | **Drop entirely** |
| Apple OAuth (AppleID SDK) | Dynamic load | Migrate to Supabase Auth |
| Google Sheets | Runtime primary | Demote to import/export scripts |
| WhatsApp `wa.me` | Active | Extend to Cloud API; keep as fallback |
| Web Push (VAPID) | Wired | Activate + Badge API |
| Calendar `.ics` | Wired S72 | Add Google Calendar OAuth |
| Maps | None | OSM embed + Waze + Google Maps deep link |
| Payments | Deep links only | Add Stripe Checkout (vendor) via edge function |
| AI / LLM | Prompt-builders only | Wire edge proxy (Cloudflare Worker) + BYO key |
| Photo CDN | None | Add Supabase Storage + transforms |
| Sentry / Glitchtip | Adapter only | Activate; opt-in DSN env var |
| UptimeRobot | None | Add free monitor |

---

## 6. Lessons Learned

### 6.1 What we got right

1. **Vanilla + Vite + ESM** — bundle moat is 5–10× smaller than every competitor. Non-negotiable.
2. **`@layer` CSS** — cascade is sane; theme switching is one body class; zero specificity wars.
3. **Repositories + handlers separation** — the architectural layer with the highest payback.
4. **Valibot over Zod** — 1 KB vs 13 KB; same developer experience where it matters.
5. **`enqueueWrite` debounced queue** — saved Sheets from quota on every wedding season.
6. **JSDoc + `types.d.ts` + `checkJs`** — types without compilation overhead; drives TSC → 0.
7. **ADR culture** — 12+ ADRs make the *why* survive the people.
8. **Hard CI gates from day one** — 0 lint warnings + LH ≥ 95 + bundle ≤ 60 KB. Unbreakable.
9. **Hebrew-first RTL** — every component tested RTL from birth; competitors retrofit and fail.
10. **Open source from v0** — every external review tightens the codebase.
11. **BaseSection adoption** — all 23 sections on one lifecycle = uniform mount/unmount/error surface.
12. **`@scope` per section** — zero cross-section CSS bleed after S297.
13. **Trusted Types ratchet** — XSS depth-defence enforced in CI from S327.

### 6.2 What we got wrong (and how we fix it)

| # | Mistake | Cost paid | Fix |
| --- | --- | --- | --- |
| 1 | Kept `BACKEND_TYPE = "sheets"` for 3+ major versions | Silent quota failures; 25 services hedge two backends | Flip in v14 Phase A1 — hard deadline |
| 2 | Stored auth tokens in plaintext `localStorage` | OWASP A02 risk; trivially exploitable via any XSS | AES-GCM via `secure-storage.js` Phase A4 ✅ partial |
| 3 | Built 3 OAuth SDKs in parallel instead of routing through Supabase Auth | ~30 KB bundle; non-uniform JWT expiry; FB is dead weight | Drop FB; route Google+Apple through Supabase |
| 4 | Let services grow to 62 files with duplicate pairs | Dead exports inflated; refactor velocity halved | Consolidate to ≤ 25 ✅ held; target ≤ 20 in v15 |
| 5 | Built 15+ utilities ahead of UI entry points | "Built ≠ done"; metrics inflated | Phase C1: every utility wired or deleted |
| 6 | Custom Proxy store with deep-mutation tracking | Nested mutations silently miss subscribers | Replace internals with Preact Signals; keep API |
| 7 | Hash router with `replaceState` semantics | Back button broken; no deep links; PWA share broken | Replace with `pushState` + typed routes Phase A5 |
| 8 | In-memory write queue | Page crash mid-debounce = silent data loss | IDB persistence + Background Sync Phase B4 |
| 9 | `manualChunks` in Vite config | Build breaks on file rename; manual maintenance | Drop; rely on dynamic `import()` |
| 10 | `ADMIN_EMAILS` in source-controlled config | Adding a co-planner requires a full deploy | Move to `admin_users` table + Settings UI Phase A2 |
| 11 | Aspired to full TypeScript migration (v12) | High disruption, marginal benefit | **Revised:** drive TSC → 0 with JSDoc; pilot `.ts` for new modules via ADR opt-in |
| 12 | Coverage was advisory, not enforced | Coverage drift undetected across refactors | Enforce 80% / 75% Phase A8 |
| 13 | 8 div-based modals + focus-trap polyfill | 8 lazy loads; non-native focus behaviour | Migrate to `<dialog>` Phase B6 |
| 14 | CSS without `@scope` (pre-S297) | Theme transitions bled across sections | Fixed S297 ✅; enforce in CI |
| 15 | Did not pin Node to LTS until v12.5.4 | Non-LTS dev silently bypassed npm-audit findings | Fixed Sprint 67 ✅ |
| 16 | Monitoring adapter built but DSN never set | Production failures are invisible | Activate Phase A7 — no more excuses |

### 6.3 Anti-patterns we refuse

- **No workarounds.** If a rule fires, fix the code. Suppression requires an ADR.
- **No silent failures.** Every catch logs; every queue persists; every retry is observable.
- **No `innerHTML` with anything that did not pass through `sanitize()`.** Trusted Types enforces this.
- **No new runtime dependencies without a bundle-cost ADR.**
- **No "built but not wired" utilities — features are tracked separately as built vs wired.**
- **No `window.*` globals — everything ESM.**
- **No hardcoded colours — every colour is a CSS custom property.**
- **No section-to-service direct imports — sections flow through handlers → repositories.**
- **No string-format dates — `Asia/Jerusalem` timezone, ISO at the wire.**
- **No long-lived GitHub Secrets where OIDC is possible.**
- **No plaintext PII in `localStorage` — AES-GCM or IDB.**

---

## 7. Technical Debt & Risk Register

> **P0** = production blocker · **P1** = significant risk · **P2** = maintenance drag · **P3** = capability gap

| Sev | Pri | Area | Risk | Effort | Target |
| --- | --- | --- | --- | --- | --- |
| High | P0 | Backend | `BACKEND_TYPE = "sheets"` runtime; Sheets quotas fail ≥ 5 concurrent RSVPs | L | v14 |
| High | P0 | Router | Hash router; back button broken; no deep links; PWA share broken | M | v14 |
| High | P0 | Auth SDKs | 3 OAuth SDKs loaded at startup; ~30 KB; FB SDK is dead weight | M | v14 |
| High | P0 | Monitoring | Zero production error visibility; `monitoring.js` wired but DSN unset | S | v14 |
| High | P0 | Coverage | Coverage gate is advisory; regressions arrive silently | XS | v14 |
| Med | P1 | Storage | `localStorage` 5 MB cap; PII not fully encrypted; no crash recovery | M | v14 |
| Med | P1 | PWA | Memory write queue lost on crash; Background Sync not used | M | v14 |
| Med | P1 | Auth admin | `ADMIN_EMAILS` in source; deploy required to add co-planner | S | v14 |
| Med | P2 | State | Proxy deep mutations silently miss reactivity | M | v15 |
| Med | P2 | Modals | 8 div-based modals + focus-trap polyfill | M | v15 |
| Med | P2 | Build | `manualChunks` breaks on rename; manual maintenance | S | v14 |
| Med | P2 | CI | No OIDC for GitHub Actions; long-lived PATs require rotation | S | v14 |
| Med | P2 | i18n | AR partial quality; ICU plurals absent for HE/AR | L | v15 |
| Low | P3 | Realtime | Wired but never activated | M | v15 |
| Low | P3 | Utilities | 8+ utilities built with no UI entry point | L | v15 |
| Low | P3 | Virtual scroll | Guest lists are O(n) DOM nodes for large events | M | v14 |
| Low | P3 | Error boundaries | Section crash propagates to whole app | M | v14 |
| Low | P3 | DB indexes | Composite indexes missing on several hot FK tables | S | v14 |
| Low | P4 | Mobile | PWA only; no App Store/Play Store | XL | v17 |
| Low | P4 | Public API | No REST API for integrations | XL | v18 |
| Low | P4 | Compliance | No GDPR/CCPA erasure or portability endpoint | L | v19 |

---

## 8. Improve / Rewrite / Refactor / Enhance

### 8.1 Improve — low disruption, high payoff (sprintable)

1. **Coverage gate** — enforce 80% lines / 75% branches in `vitest.config` + CI.
2. **Activate Sentry/Glitchtip** — opt-in DSN env var; PII scrubber at source; Settings opt-out.
3. **Move `ADMIN_EMAILS` → `admin_users` Supabase table** + Settings UI.
4. **Add composite DB indexes** on every `event_id` FK table.
5. **`eslint-plugin-jsdoc` gate** extended to all `src/`.
6. **Activate `monitoring.js`** — wire DSN; no new code needed.
7. **Activate Realtime** — presence badges + live RSVP counter; services are ready.
8. **Error boundaries in `BaseSection`** — catch + toast fallback per section.
9. **Virtual scroll for guest list** — pure DOM; no library; threshold at 200 rows.
10. **`manualChunks` removal** — one-line Vite config change; dynamic imports already exist.
11. **UptimeRobot free monitor** — 5 minutes; zero code change.
12. **GitHub Actions OIDC** — replace PATs in deploy/release workflows.
13. **Trusted Types in production CSP** — `require-trusted-types-for 'script'`.

### 8.2 Rewrite — worth the disruption

1. **Auth subsystem** — drop GIS/FB/AppleID SDKs; route all OAuth through Supabase Auth.
2. **Storage layer** — IDB primary; AES-GCM all PII; persistent offline queue.
3. **Router** — `pushState` + typed route table + query params + View Transitions.
4. **Service Worker** — strategy cache (stale-while-revalidate + network-first per route) + Background Sync.
5. **Sheets sync layer** — demote to import/export tools; flip `BACKEND_TYPE = "supabase"`.

### 8.3 Refactor — code health, zero user impact

1. **Store internals → Preact Signals** — under stable `storeGet/Set/Subscribe` API.
2. **Remove `manualChunks`** from `vite.config.js`; add dynamic `import()` where missing.
3. **Modal system → native `<dialog>`** — 8 modals; remove focus-trap polyfill.
4. **`@scope` extension** — any section still using bare selectors.
5. **Action namespacing** — `module:action` everywhere; CI duplicate-detection gate.
6. **Handler → repository contracts** — JSDoc `@param`/`@returns` types to all 7 handler files.

### 8.4 Enhance — new capabilities

| Priority | Feature | Section / Entry | Util built? |
| --- | --- | --- | --- |
| P0 | Supabase backend flip | All data paths | `backend.js` ready |
| P0 | Router `pushState` + View Transitions | `core/nav.js` | scaffold exists |
| P0 | Monitoring activation | All error catch paths | `monitoring.js` wired |
| High | QR / NFC event-day kiosk | Check-in | `qr-code.js`, `nfc.js` built |
| High | WhatsApp Cloud API | WhatsApp section | `wa-messaging.js` built |
| High | Cmd-K command palette | Nav | `search-index.js` built |
| High | AI seating solver + UI | Tables | `seating-ai.js` built |
| High | AI message drafts + tone | WhatsApp + Invitation | `ai-draft.js` built |
| High | Realtime presence badges | Tables + Guests | `realtime-presence.js` built |
| High | Error boundaries per section | BaseSection | not yet |
| High | Virtual scroll guest list | Guests | not yet |
| Med | PDF export (guests + seating + dietary) | Guests, Tables | `pdf-export.js` built |
| Med | Venue map + Waze + Google Maps deep link | Settings / Ceremony | OSM embed (no dep) |
| Med | Stripe Checkout for vendors | Vendors | `payment-link.js` partial |
| Med | Photo gallery + Supabase Storage | Gallery | Storage SDK available |
| Med | Onboarding wizard first-run | Dashboard | `tour-guide.js` built |
| Med | Budget burn-down + projection chart | Budget | `budget-projection.js` built |
| Med | Vendor payment timeline chart | Vendors | `vendor-timeline.js` built |
| Med | RSVP funnel chart | Analytics | `rsvp-funnel.js` built |
| Med | What's New modal on version bump | Dashboard | `whats-new-engine.js` built |
| Med | Notification centre dropdown | Nav (bell icon) | `notification-centre.js` built |
| Low | Seating chart PDF + QR table cards | Tables, Print | `print-rows.js` built |
| Phase D | Public wedding website builder UI | New section | `website-builder.js` data model ✅ |
| Phase D | Plugin / extension surface | Settings | `plugin-manifest.js` ✅ |
| Phase D | Org / team / planner workspace mode | New section | `workspace-roles.js` ✅ |
| Phase E | Capacitor native app (iOS + Android) | Build + CI | reopen at Phase D9 |
| Phase E | Public REST API | Supabase PostgREST | none |
| Phase F | GDPR / CCPA / LGPD compliance pack | Supabase Edge | none |

---

## 9. Phased Plan v13 → v19

> Each phase ends with a checkpoint. Every "Replace" verdict in §2 requires an ADR before work begins.

### Phase A — v14.0.0 — Backend Convergence + P0 Security

**Goal:** Supabase is the single backend. Auth through one SDK. Router works. Errors are visible.

| # | Workstream | Deliverable | Exit condition |
| --- | --- | --- | --- |
| A1 | Supabase primary | `BACKEND_TYPE = "supabase"`; Sheets demoted to import/export | Zero Sheets calls at runtime |
| A2 | Admin table | `admin_users` + RLS + Settings UI | Admin change requires zero deploys |
| A3 | Auth migration | Supabase Auth (Google + Apple); drop GIS/FB/AppleID SDKs | Three SDKs removed; `supabase.auth.*` everywhere |
| A4 | Storage encryption | AES-GCM via `secure-storage.js`; IDB migration for all PII | No raw JWT, email, or phone in `localStorage` |
| A5 | Router | `pushState` + typed routes + query params + View Transitions | Back works; `?guestId=X` opens guest modal |
| A6 | Edge functions | WABA proxy, push sender, GDPR erasure, RSVP webhook | Zero API keys in client bundle |
| A7 | Monitoring | Sentry/Glitchtip activate; opt-in DSN env var; PII scrubbed | Production errors visible within 30 min |
| A8 | Coverage gate | CI fails below 80% lines / 75% branches | `vitest --coverage` enforced |
| A9 | Error boundaries | BaseSection catches + toasts; no whole-app crash | Each section fails independently |
| A10 | DB indexes | Composite indexes on every `event_id` FK table | `EXPLAIN ANALYZE` shows index scans |
| A11 | GitHub Actions OIDC | Replace PATs in deploy/release workflows | No long-lived secrets in Actions |
| A12 | Trusted Types in CSP | `require-trusted-types-for 'script'` in production headers | CSP blocks script injection |

**Phase OKR:** *Zero plaintext PII · One canonical backend · Visible errors · Back button works · DB indexed.*

### Phase B — v15.0.0 — DX, Type Safety, Architecture Polish

| # | Workstream | Deliverable | Exit condition |
| --- | --- | --- | --- |
| B1 | Services ≤ 22 | Reduce from 25; merge near-duplicate pairs | `audit:services` ≤ 22 |
| B2 | JSDoc gate extended | eslint-plugin-jsdoc on all `src/`; 100% function coverage | `npm run lint` enforces |
| B3 | Preact Signals | Replace Proxy internals; keep `storeGet/Set/Subscribe` API | Nested mutations fire reactivity |
| B4 | SW rewrite | Strategy cache + IDB queue + Background Sync | Queue survives page crash |
| B5 | Remove `manualChunks` | Dynamic `import()` only | Vite builds without manual config |
| B6 | Modal → native `<dialog>` | All 8 modals converted; focus-trap polyfill removed | `audit:modals` passes |
| B7 | Virtual scroll | Pure DOM virtual scroll in Guests section | 1 000 guests render in ≤ 16 ms |
| B8 | Playwright expansion | Full RSVP + offline + multi-event + a11y per locale | 0 axe violations across all 5 locales |
| B9 | Visual regression | Per-section per-theme screenshot baseline | Pixel delta gate < 5% |
| B10 | Mutation testing | Stryker pilot on `core/` + `repositories/` | Mutation score ≥ 70% |
| B11 | pnpm evaluation | Pilot pnpm in CI; document result in ADR | Decision: adopt or document why not |

**Phase OKR:** *Proxy → Signals · SW queue survives crash · All modals native · Virtual scroll ready.*

### Phase C — v16.0.0 — Smart, Native-Class, Connected

| # | Deliverable |
| --- | --- |
| C1 | Wire all built utilities — every dormant feature reachable from a UI |
| C2 | WhatsApp Cloud API: template approval, bulk send, delivery webhooks, A/B |
| C3 | AI edge functions (Cloudflare Workers): seating CSP + copy + FAQ + photo tag — BYO key, streaming |
| C4 | Realtime: presence badges, live RSVP counter, conflict-resolver UI |
| C5 | Web Push: VAPID end-to-end, opt-in, Badge API, Periodic Sync |
| C6 | Stripe Checkout for vendor receipts + milestones + HoneyBook-style contracts |
| C7 | Photo gallery: Supabase Storage + guest uploads + transforms + signed CDN URLs |
| C8 | QR/NFC event-day kiosk: offline-first verify + badge print + QR table cards |
| C9 | OSM venue map + Waze + Google Maps + Google Calendar OAuth two-way sync |
| C10 | AR locale quality pass; ICU MessageFormat HE + AR plurals + gender |
| C11 | Vendor catalogue CSV/JSON import + Israeli vendor enrichment |
| C12 | Onboarding wizard first-run + contextual help |

**Phase OKR:** *Every built utility wired · AI opt-in · Payments + check-in prod-ready · Arabic ships.*

### Phase D — v17.0.0 — Platform & Scale

| # | Deliverable |
| --- | --- |
| D1 | Live theme picker: full CSS var sliders + presets + `theme.json` export/import |
| D2 | Public wedding website builder: theme + live preview + password + custom domain CNAME |
| D3 | Org / team / planner workspaces: roles (owner, co-planner, vendor, photographer, guest) |
| D4 | Plugin surface: `plugin.json` manifest + permission scopes + sandboxed dynamic import |
| D5 | RU locale + community pipeline for additional languages |
| D6 | Cloudflare CDN proxy + Brotli + custom vanity domain |
| D7 | One-click deploy templates: Vercel + Netlify + Cloudflare + Render |
| D8 | LH-CI per-locale + visual regression per-section + Stryker gate |
| D9 | Capacitor native app (iOS + Android): native NFC, haptics, share sheet |

### Phase E — v18.0.0 — Open Platform

| # | Deliverable |
| --- | --- |
| E1 | Public REST API via Supabase PostgREST + API key UI + webhook subscriptions |
| E2 | WebAuthn passkeys for admin (replaces email allowlist) |
| E3 | Theme marketplace: community themes + review/install UI |
| E4 | Multi-region: Supabase region selection on self-host; GDPR data-residency controls |
| E5 | Observability v2: Glitchtip + UptimeRobot + LH-CI weekly cron + metrics export |
| E6 | Gift registry deep-link integrations: Amazon IL, boutique gift stores |
| E7 | Hybrid event support: video call deep links + virtual RSVP track |

### Phase F — v19.0.0 — AI-Native, Compliance-Ready

| # | Deliverable |
| --- | --- |
| F1 | AI assistant in every section (Cmd-K driven; multi-turn streaming; multi-provider) |
| F2 | Photo auto-tagging + face recognition (Ollama local option; opt-in only) |
| F3 | RSVP photo-extraction (snap a paper card → guest fields) |
| F4 | Predictive no-show modelling (cohort-based; fully local; no external data) |
| F5 | GDPR + CCPA + LGPD compliance pack: erasure, portability, audit-log surfacing |
| F6 | SOC 2-ready logging via edge function pipeline |

---

## 10. Sprint Backlog — Next 30 Sprints

> Phase A priority. Each sprint is one commit, one scope. Order is binding until reprioritised.

### Cluster A — Backend Convergence + P0 Fixes (Sprints 379–398, target v14.0.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 379 | **Coverage gate** — enforce 80% lines / 75% branches in `vitest.config` + `ci.yml` | XS |
| 380 | **Error boundaries** — `BaseSection._onError()` catch + toast; remove whole-app propagation | S |
| 381 | **Monitoring activation** — wire Glitchtip/Sentry opt-in DSN; PII scrubber; Settings toggle | S |
| 382 | **DB composite indexes** — migration: `event_id` on guests/tables/vendors/expenses/rsvp_log | S |
| 383 | **GitHub Actions OIDC** — replace PATs in deploy.yml + release.yml | S |
| 384 | **Trusted Types in CSP** — `require-trusted-types-for 'script'` in `_headers` | S |
| 385 | **Remove `manualChunks`** from `vite.config.js`; verify build passes | XS |
| 386 | **Move `ADMIN_EMAILS` → `admin_users` table** — migration + Settings UI | M |
| 387 | **Auth: drop Facebook SDK** — remove dynamic load; update auth UI | S |
| 388 | **Auth: migrate Google to Supabase Auth** — drop GIS SDK; update sign-in flow | M |
| 389 | **Auth: migrate Apple to Supabase Auth** — drop AppleID SDK; update sign-in flow | M |
| 390 | **pushState router scaffold** — `core/nav.js` rewrite; hash-URL backward compat | L |
| 391 | **View Transitions API** — section navigation uses `document.startViewTransition()` | S |
| 392 | **URL filter state** — guest + vendor sort/filter state in URL query params | M |
| 393 | **IDB storage primary** — migrate hot `localStorage` keys to IndexedDB | L |
| 394 | **IDB persistent write queue** — replace memory queue with IDB + Background Sync | L |
| 395 | **Edge functions expand** — WABA proxy + GDPR erasure + RSVP webhook in `supabase/functions/` | L |
| 396 | **`BACKEND_TYPE = "supabase"` flip** — remove Sheets from hot path | M |
| 397 | **Virtual scroll** — guest list DOM virtual scroll; threshold 200 rows | M |
| 398 | **v14.0.0 release** — sync-version + CHANGELOG + tag + release artifacts | S |

### Cluster B — Architecture & DX Polish (Sprints 399–408, target v15.0.0)

| # | Sprint | Effort |
| --- | --- | --- |
| 399 | JSDoc gate extended — eslint-plugin-jsdoc on all `src/sections/` + `src/utils/` | M |
| 400 | Preact Signals — replace store internals; keep public API | M |
| 401 | SW rewrite — strategy cache patterns (stale-while-revalidate + network-first) | L |
| 402 | Modal → native `<dialog>` batch 1 (4 modals) | M |
| 403 | Modal → native `<dialog>` batch 2 (4 modals) + remove focus-trap polyfill | M |
| 404 | Playwright expansion — full RSVP + offline + multi-event flows | L |
| 405 | Visual regression — per-section per-theme screenshot baseline in CI | M |
| 406 | Mutation testing pilot — Stryker on `core/` + `repositories/` | M |
| 407 | pnpm evaluation — pilot in CI; result documented in ADR | S |
| 408 | v15.0.0 release | S |

### Cluster C — Smart, Connected, Native-Class (Sprints 409–418, target v16.0.0)

| Sprint | Goal | Size |
| --- | --- | --- |
| 409 | Supabase Realtime live indicator in dashboard | S |
| 410 | Presence avatar badges on guest rows | S |
| 411 | Ctrl+Z undo toast handler + pushUndo on deleteTable | S |
| 417 | Gallery Supabase Storage upload + data-URL fallback | M |
| 418 | v16.0.0 release | S |

---

## 11. Migration Playbooks

### 11.1 Sheets → Supabase flip (Sprint 396)

```js
// src/core/config.js — the one-line flip
export const BACKEND_TYPE = "supabase"; // was "sheets"
```

```sql
-- supabase/migrations/026_hot_table_indexes.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_event ON guests (event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_phone ON guests (phone);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tables_event ON tables (event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_event ON vendors (event_id);
```

### 11.2 Hash → pushState router (Sprint 390)

```js
// src/core/nav.js — replaces hash routing
export function navigateTo(section, params = {}) {
  const url = new URL(location.pathname, location.origin);
  url.pathname = `${import.meta.env.BASE_URL}${section}`;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      history.pushState({ section, params }, "", url.toString());
      _mountSection(section, params);
    });
  } else {
    history.pushState({ section, params }, "", url.toString());
    _mountSection(section, params);
  }
}

window.addEventListener("popstate", (e) => {
  if (e.state?.section) _mountSection(e.state.section, e.state.params ?? {});
});
```

### 11.3 Auth SDK consolidation (Sprints 388–389)

```js
// src/services/auth.js — Supabase Auth replaces 3 SDKs
import { supabase } from "../core/supabase-client.js";
import { isApprovedAdmin } from "../core/config.js";

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
  if (error) throw error;
}

export async function signInWithApple() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
  if (error) throw error;
}

supabase.auth.onAuthStateChange((_event, session) => {
  const email = session?.user?.email ?? null;
  if (email && !isApprovedAdmin(email)) supabase.auth.signOut();
});
```

### 11.4 Preact Signals store internals (Sprint 400)

```js
// src/core/store.js — drop-in Signals internals; public API unchanged
import { signal, effect, batch } from "@preact/signals-core";

const _signals = new Map();

function _sig(key, defaultVal) {
  if (!_signals.has(key)) _signals.set(key, signal(defaultVal));
  return _signals.get(key);
}

export const storeGet = (key) => _sig(key, undefined).value;
export const storeSet = (key, value) => { _sig(key, value).value = value; };
export const storeBatch = (fn) => batch(fn);
export const storeSubscribe = (key, cb) => {
  const s = _sig(key, undefined);
  return effect(() => cb(s.value)); // returns cleanup fn
};
```

### 11.5 IDB persistent write queue (Sprint 394)

```js
// src/core/sync.js — IDB-backed queue
import { idbGet, idbSet } from "./storage.js";
const QUEUE_KEY = "__sync_queue__";

export async function enqueueWrite(key, fn) {
  const q = (await idbGet(QUEUE_KEY)) ?? [];
  q.push({ key, ts: Date.now() });
  await idbSet(QUEUE_KEY, q);
  const reg = await navigator.serviceWorker?.ready;
  if (reg && "sync" in reg) await reg.sync.register("flush-queue");
  return fn().then(async () => {
    const remaining = ((await idbGet(QUEUE_KEY)) ?? []).filter((e) => e.key !== key);
    await idbSet(QUEUE_KEY, remaining);
  });
}
```

### 11.6 BaseSection error boundary (Sprint 380)

```js
// src/core/section-base.js — add to BaseSection
_onError(err) {
  const msg = err?.message ?? String(err);
  import("./ui.js").then(({ showToast }) => showToast(msg, "error"));
  import("../services/monitoring.js").then(({ captureError }) => captureError(err));
}

mount() {
  try { this._mount(); }
  catch (err) { this._onError(err); }
}
```

---

## 12. Cost & Self-Hosting Profile

| Component | Provider | Free tier | First paid | Required? |
| --- | --- | --- | --- | --- |
| Hosting | GitHub Pages | Unlimited public | n/a | ✅ $0 |
| DB + Auth + Realtime + Storage | Supabase | 500 MB · 2 GB egress · 50 K MAU · 1 GB storage | $25/mo Pro | ✅ $0 |
| Edge functions | Supabase Edge | 500 K invocations/mo | included in Pro | ✅ $0 |
| Edge functions (stateless) | Cloudflare Workers | 100 K req/day | $5/mo Workers Paid | Optional $0 |
| CDN proxy | Cloudflare Free | Unlimited bandwidth | $20/mo Pro | Optional $0 |
| Custom domain | Cloudflare Registrar | n/a | ~$10/year `.com` | Optional |
| Email (transactional) | Supabase Auth bundled | 4 emails/hour | Resend 3 K/mo free | ✅ $0 |
| Web Push | VAPID (browser-side) | Unlimited | n/a | ✅ $0 |
| Error tracking | Glitchtip self-host on Supabase | 5 K errors/mo | Sentry $26/mo | Optional $0 |
| Uptime monitoring | UptimeRobot free | 50 monitors / 5-min | $7/mo Pro | Optional $0 |
| AI (BYO key) | User-supplied key | n/a | Pay-per-use | Optional $0 |
| Analytics | None (zero-telemetry pledge) | n/a | n/a | ✅ $0 |

**Single-event self-host total: $0–$10/year (domain optional).**

Every external service has a `supabase start` local replacement for development. The supply-chain
SBOM (`sbom.cdx.json`) documents every dependency; no proprietary service is required to run a fork.

---

## 13. Success Metrics & SLOs

| Metric | v13.20 (now) | v14 target | v15 target | v16 target | v17 target |
| --- | --- | --- | --- | --- | --- |
| Tests passing | 4 179 / 268 files | ≥ 4 400 | ≥ 4 700 | ≥ 5 000 | ≥ 5 500 |
| Coverage lines (enforced) | 58% advisory | ≥ 80% **gate** | ≥ 83% | ≥ 87% | ≥ 90% |
| Coverage branches (enforced) | 51% advisory | ≥ 75% **gate** | ≥ 78% | ≥ 82% | ≥ 85% |
| TypeScript errors (`tsc --noEmit`) | **0** ✅ | 0 | 0 | 0 | 0 |
| Dead exports | 0 ✅ | 0 | 0 | 0 | 0 |
| Lint errors / warnings | 0 / 0 ✅ | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Lighthouse Performance | ≥ 95 | ≥ 96 | ≥ 97 | ≥ 98 | ≥ 99 |
| Lighthouse Accessibility | ≥ 95 | ≥ 97 | ≥ 99 | 100 | 100 |
| Bundle gzip | ~45 KB | ≤ 55 KB | ≤ 52 KB | ≤ 50 KB | ≤ 50 KB |
| axe violations | 0 ✅ | 0 | 0 | 0 | 0 |
| Services files | 25 ✅ | ≤ 25 | ≤ 22 | ≤ 20 | ≤ 18 |
| Active backend | Sheets ❌ | Supabase ✅ | Supabase | Supabase | Supabase |
| Error tracking | None | Active | Active | Active | Active |
| Auth SDKs | 3 | 1 (Supabase) | 1 | 1 | 1 + passkeys |
| Offline queue durability | IDB + queue | IDB + Background Sync | + Periodic Sync | + Push payload encrypt | + multi-region |
| Locales shipped | 5 (HE EN AR FR ES) | 5 | 5 + ICU plurals | 6 (+ RU) | 7+ |
| Realtime UI | Idle | Activated | Polished | Multi-section | Multi-tenant |
| P0 security issues | 3 | 0 | 0 | 0 | 0 |
| Admin management | Requires deploy | DB-driven | DB-driven | DB-driven | + WebAuthn |

### SLOs (production targets)

| SLO | Target |
| --- | --- |
| Availability (GH Pages canonical) | ≥ 99.9% (3 nines) |
| RSVP submission P99 latency | ≤ 2 s on 3G |
| Error budget | ≤ 0.1% of page loads produce an unhandled JS exception |
| CI pipeline (lint + test + build) | ≤ 3 min |
| Deploy after push to `main` | ≤ 2 min |
| First Contentful Paint (3G) | ≤ 1.5 s |
| Time to Interactive (3G) | ≤ 3 s |
| Cumulative Layout Shift | ≤ 0.05 |
| RTL parity (HE vs EN pixel diff) | ≤ 5% delta per section |
| DB query P99 (Supabase) | ≤ 200 ms |

---

## 14. Open Decisions Register

> Requires an ADR before implementation begins. Decision closes when ADR is accepted.

| # | Decision | Options | Leaning | Blocks |
| --- | --- | --- | --- | --- |
| OD-01 | Reactive store | Preact Signals · keep Proxy · MobX · Zustand | **Signals** | Sprint 400 |
| OD-02 | `<dialog>` on older Safari | polyfill · progressive enhancement · min-version gate | **Progressive** | Sprint 402 |
| OD-03 | Typed route definition | config-based (`route-table.js`) · file-based | **Config** | Sprint 390 |
| OD-04 | AI provider | OpenAI only · Anthropic · multi-provider · Ollama-first | **Multi-provider BYO key** | Phase C3 |
| OD-05 | WhatsApp integration level | `wa.me` only · Cloud API · both with toggle | **Both with toggle** | Sprint 395 |
| OD-06 | CDN provider | Cloudflare free · Fastly · none | **Cloudflare** | Phase D6 |
| OD-07 | Native app strategy | Capacitor · Expo · React Native · PWA-only | **Capacitor** | Phase D9 |
| OD-08 | Photo storage | Supabase Storage · Cloudinary · Bunny | **Supabase Storage** | Phase C7 |
| OD-09 | Plugin architecture | JSON manifest + dynamic import · iframe · none | **JSON manifest + dynamic import** | Phase D4 |
| OD-10 | Payments | Stripe only · multi-PSP · IL deep-links | **Stripe vendors; IL deep-links guests** | Phase C6 |
| OD-11 | AR locale strategy | In-house · machine-assisted + human · community | **Machine-assisted + human review** | Phase C10 |
| OD-12 | FB OAuth removal | Remove · keep flag · Supabase OIDC | **Remove entirely** | Sprint 387 |
| OD-13 | Analytics | None · Plausible · Umami self-host | **None default; Umami opt-in** | Phase B |
| OD-14 | Edge runtime split | Supabase only · Cloudflare only · hybrid | **Hybrid: Supabase DB-coupled + CF stateless** | Sprint 395 |
| OD-15 | Code language migration | full TS · JSDoc-strict · stay as-is | **JSDoc-strict; `.ts` opt-in for new modules** | ADR-OD15 |
| OD-16 | Coverage tool | c8 (`@vitest/coverage-v8`) · istanbul | **c8** (default; faster) | Sprint 379 |
| OD-17 | CRDT for collab | Yjs · Automerge · Realtime channels | **None** — Realtime channels + LWW suffice | n/a |
| OD-18 | Bundler evolution | Vite 8 (current) · Vite 9 · Bun build · Turbopack | **Vite 8 → Vite 9 when stable** | n/a |
| OD-19 | Package manager | npm 11 · pnpm · bun · yarn | **Pilot pnpm in CI; decide via ADR** | Sprint 407 |
| OD-20 | Deployment canonical | GH Pages · CF Pages · Vercel · Netlify | **GH Pages canonical + CF proxy** | Phase D6 |
| OD-21 | Virtual scroll library | none (pure DOM) · react-window · tanstack-virtual | **Pure DOM** — no dep | Sprint 397 |
| OD-22 | Mutation testing tool | Stryker · Mutant · none | **Stryker pilot** on `core/` + `repositories/` | Sprint 406 |
| OD-23 | Contract testing | Pact · MSW · none | **MSW** (already in test suite) for Supabase contracts | Phase B |
| OD-24 | TypeScript `.ts` new files | Opt-in per module · project-wide · never | **ADR opt-in per new module** (first: `core/nav.ts`) | ADR-OD24 |
| OD-25 | Bun for local dev | Node only · Bun optional · Bun mandatory | **Bun optional** — `bun test` as local speed-run | n/a |

---

## 15. Working Principles

1. **One source of truth per concern.** State in `store.js`; constants in `constants.js`; config in `config.js`.
2. **No workarounds — fix the root cause.** Every suppression needs a public ADR.
3. **Security is a first-class constraint.** Trusted Types + AES-GCM at rest + zero API keys in client +
   no `innerHTML` with unvalidated data + OWASP Top 10 scan on every PR.
4. **RTL is not an afterthought.** Every new UI feature tested in Hebrew. AR when shipped.
5. **Bundle size is a feature.** Every new runtime dep needs an ADR. Hard CI gate at 60 KB.
6. **Every utility ships with a UI.** "Built" ≠ "done". Tracked separately as built vs wired.
7. **Docs are code.** ADR per Replace decision. CHANGELOG per version. Instructions updated with
   every structural change.
8. **Offline-first means the queue never lies.** Writes persist to IDB; conflicts surface to user.
9. **Open source means auditable.** No secret algorithms, no vendor lock-in, no telemetry without opt-in.
10. **Accessibility is not a badge.** WCAG 2.2 AA is the floor. axe-zero is a CI gate. Hebrew RTL
    screen-reader parity tested in Playwright.
11. **Cost is a design constraint.** $0/month single-event. Free tiers cover 99% of usage.
12. **The release ratchet only goes one way.** Once a metric improves and is gated, it cannot regress
    without an ADR. (Bundle, dead exports, TSC errors, coverage, Trusted Types sinks.)
13. **No long-lived secrets.** OIDC for CI; AES-GCM for user data; 90-day rotation for everything else.
14. **Privacy by default.** Zero telemetry in upstream build. Analytics requires opt-in and self-hosting.
15. **Speed of iteration over perfection.** Prefer one focused sprint per feature over long-lived branches.

---

## 16. Release Line

| Version | Status | Theme | Key deliverables |
| --- | --- | --- | --- |
| v12.5.1–v12.5.4 | Released 2026-04-27 | Production hardening | A11y labels; TS strict; CI action pins; dead-export audit; Node 22 LTS; SBOM+Trivy+Scorecard; rotation runbook; arch enforcement; live theme picker |
| **v12.5.5** | Released 2026-04-27 | Roadmap deep rethink | ROADMAP v12.5.5 — verdict matrix; lessons; sprint backlog 77–130; JSDoc-strict path |
| **v12.6.0** | Released 2026-04-28 | Cluster V platform builders | S118–127: ICU format; theme-vars; print pipeline; notification centre; vendor timeline; RSVP funnel; budget burndown; run-of-show; What's New engine; CDN builder |
| **v12.7.0** | Released 2026-04-28 | Cluster VI platform scaffolding | S128–137: DNS helpers; deploy buttons; LHCI locale; theme.json; workspace RBAC; plugin validator; public site builder; FR+ES bootstrap |
| **v13.0.0** | Released 2025-07 | Codebase hardening | S183–185: dead-export purge; arch-check 0 violations; service consolidation 86→83 |
| **v13.3.0–v13.5.0** | Released 2025-07 | Notifications · TT · @scope · Cmd-K · TSC −100 | S206–S234: 5 locales; Trusted Types; CSS @scope; action namespace; 3 153 tests |
| **v13.8.0–v13.9.0** | Released 2025-08/09 | Service consolidation + TSC | S261–S274: 36→31 services; TSC 71→54; 3 149 tests |
| **v13.10.0** | Released 2026-04-29 | Phase B1 — service reduction | S276–S284: 33→25 services; TSC 49; 3 149 tests; all BaseSection |
| **v13.11.0–v13.12.0** | Released 2026-05 | TSC 0 · CI hardening | S286–S305: TSC 49→0; action namespace ratchet; arch-check strict; SQL lint 0; 100% BaseSection; 3 149 tests |
| **v13.13.0–v13.15.0** | Released 2026-05 | Phase C0–C2: TT · handlers · coverage | S306–S335: TT 34→5; 5 new test suites +177 tests; lines 56%/functions 64%; 3 494 tests |
| **v13.16.0–v13.18.0** | Released 2026-05 | Phase C3–C5: section + service tests | S336–S365: 15 new test suites; lines 57%/functions 66%; 4 108 tests |
| **v13.19.0** | Released 2026-05-01 | Phase C6 coverage uplift | S366–S375: 5 test suites (settings/seating/gallery/nav/guests-batch); lines 58%/branches 51%; 4 187 tests |
| **v13.21.0** | Released 2026-04-30 | Coverage gate, error boundaries, monitoring, DB indexes, auth cleanup | S379–S388: coverage CI gate (58/51/66/58); BaseSection error boundaries; monitoring DSN injection; composite DB indexes; OIDC; Trusted Types CSP sync; FB SDK drop; Google→Supabase Auth |
| **v13.20.0** | Released 2026-04-30 | Scope-lock cleanup + tooling/docs | S376–S378: removed orphan Capacitor workflow + dead util; locale ru→es/fr corrected; actions v4→v6; .vscode modernised; .github overhaul |
| **v14.0.0** | ✅ 2026-05-02 | Phase A — backend convergence + P0 | S379–S398: Supabase flip; pushState router; Supabase Auth (drop 3 SDKs); IDB primary; monitoring; coverage gate; indexes; error boundaries; View Transitions; URL filter state; virtual scroll; waba-bulk-send |
| **v15.0.0** | ✅ 2026-05-24 | Phase B — DX, architecture polish | S399–S408: JSDoc gate; Preact Signals store; SW 5-strategy rewrite; native `<dialog>` modals (8); Playwright E2E expansion; visual regression matrix; Stryker mutation pilot; pnpm CI pilot + ADR-043 |
| **v16.0.0** | ✅ 2026-06-01 | Phase C — smart + native-class | S409–S418: Realtime live indicator; presence avatars; Ctrl+Z undo; Supabase Storage gallery upload |
| **v17.0.0** | ✅ 2026-06-01 | Phase D — platform & scale | S419–S427: Vendor CSV; ICU AR plurals; venue links; QR cards; budget alerts; haptics; WABA bulk; onboarding wizard; Web Push test |
| **v18.0.0** | Candidate 2027-Q1 | Phase E — open platform | REST API; WebAuthn passkeys; theme marketplace; GDPR pack; multi-region |
| **v19.0.0** | Candidate 2028-Q1 | Phase F — AI-native + compliance | AI in every section; photo AI; no-show model; SOC 2 logging |

---

*Last updated: 2026-05-24 · v15.0.0 ·
See [CHANGELOG.md](CHANGELOG.md) for detailed history ·
Decisions: [docs/adr/](docs/adr/) ·
Runbooks: [docs/operations/](docs/operations/).*

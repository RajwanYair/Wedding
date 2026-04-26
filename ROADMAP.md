# Wedding Manager — Roadmap v11.0.0

> Architecture: `ARCHITECTURE.md` · History: `CHANGELOG.md` · Contributors: `CONTRIBUTING.md` · Previous roadmap: `ROADMAP.old.md`

This document is a **deep architectural re-evaluation** of every decision this project has taken so far — including the ones that appeared clean. Every layer is audited: frontend, backend, language, docs, code patterns, architecture, configuration, tools, external APIs, database, and infrastructure. Every assumption is challenged. The goal is to aim for a best-in-class wedding management application.

**Contents:** [1. Competitive Landscape](#1-competitive-landscape--best-in-class-comparison) · [2. Decision Audit](#2-honest-audit--every-major-decision-reopened) · [3. Debt Inventory](#3-technical-debt-inventory) · [4. What to Improve](#4-what-to-improve--rewrite--refactor--enhance) · [5. Phased Plan](#5-phased-plan-v12--v15) · [6. Metrics](#6-success-metrics) · [7. Open Decisions](#7-decision-register-open-questions) · [8. Principles](#8-working-principles-renewed) · [9. Release Line](#9-release-line)

---

## 1. Competitive Landscape — Best-in-Class Comparison

Twelve serious wedding / event-management products were evaluated. The table below is the harvest target: each row is a capability we measure ourselves against, and each column is a benchmark to learn from.

| Capability | **Zola** | **The Knot** | **WeddingWire** | **Joy** | **Appy Couple** | **RSVPify** | **Eventbrite** | **Notion+ specialty** | **Ours (v11.0.0)** | Harvest Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest list + RSVP | CRM, address book, +1 logic | Email RSVP | Vendor-attached RSVP | Group RSVP | Travel + meals | Best-in-class RSVP forms, dietary, custom Q | Ticket-style | Manual templates | Phone-first, WhatsApp, meal/accessibility, multi-event | Custom RSVP questions, plus-one chains, address harvest |
| Seating chart | Drag-and-drop, custom shapes | Basic | Vendor-supplied | DnD | None | Add-on | None | None | DnD, round/rect, capacity, conflict-detector service | AI-suggested seating, relationship-aware |
| Budget & expenses | Vendor + payments | Calculator | Local cost data | Simple | Basic | None | None | Manual | Categories, payment-rate, variance | Burn-down chart, cash-flow forecast |
| Vendor mgmt | Marketplace + booking + payments | Directory + reviews | Directory + RFP | List | List | None | None | None | Full CRUD, payment tracking, WhatsApp | Vendor messaging inbox, contracts, e-sign |
| Wedding website | 100+ themes, custom domain, password | Themes | Themes | Modern themes | App-style site | Form-only | None | Manual | 5 themes, RTL, PWA installable | Public site builder with theme picker, custom domain |
| Event-day check-in | None | None | None | None | Limited | Add-on | QR scan | None | **Real-time check-in stats** | NFC/QR scanning, kiosk mode, badge printing |
| WhatsApp / messaging | None (US email/SMS) | None | None | None | Push only | Email | Email | Manual | **Native wa.me + Cloud API helper** | Bulk WABA, template approval, delivery webhooks, AB tests |
| Offline | None | None | None | None | None | None | None | None | **SW + offline queue + IndexedDB** | Background Sync API, persistent retry, conflict resolution |
| Multi-language | EN | EN/ES | EN/ES/PT | EN | EN | EN | 50+ | Manual | **HE/EN/AR/RU + ICU plurals** | 6+ locales, RTL pair (HE/AR), community contrib pipeline |
| Accessibility | Partial | Partial | Partial | Partial | Partial | Partial | Solid | Manual | A11y in CI (axe-core) | WCAG 2.2 AA, screen-reader RTL parity, reduced-motion themes |
| Privacy / data ownership | Vendor lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Self-hosted | **Self-hosted, OSS, MIT** | Encrypted-at-rest tokens, GDPR erasure, exportable archives |
| Multi-event / planner mode | One event | One | One | One | One | Pro plan | Many | Many | **Multi-event namespacing** | Org/team workspaces, role-based access, vendor reuse |
| AI features | Venue match, invitation copy | ChatGPT planning | Vendor recs | Site builder | None | None | None | None | AI draft helper (LLM-agnostic prompt builder) | Seating CSP, copy generation, photo tagging, Q&A bot |
| Analytics | Basic | Basic | Basic | Minimal | None | Funnels | Solid | None | **Funnel, budget, check-in, dietary** | Cohort RSVP funnel, A/B test, vendor SLA, predictive no-shows |
| Native mobile | iOS+Android | iOS+Android | iOS+Android | iOS+Android | iOS+Android | Web | iOS+Android | Web | PWA only | Match native UX (haptics, share sheet, push, badging) |
| Realtime collaboration | Yes (couple co-edit) | No | No | No | No | No | Limited | Yes | Supabase realtime wired (presence service exists) | Presence indicators, CRDT-style merges, live cursors |
| Payments | Built-in (Zola) | Registry only | Registry only | Registry only | None | Stripe add-on | Stripe | Manual | Payment deep-links (Bit/PayBox/PayPal) | Stripe + PayPal + Bit, hosted checkout, receipts |
| Photos / gallery | Registry only | Registry only | Registry only | Site only | Native | None | None | Manual | Gallery section + photo-gallery util | Cloudinary/Bunny CDN, face tagging, guest uploads |
| Tech stack | React + Node + PG | React + Java | React + .NET | React + GraphQL | React Native + Rails | Vue + Rails | React + Java | Notion API | **Vanilla ES2025 + Vite + Supabase** | Stay vanilla; selectively adopt signals + web components |
| Open source | No | No | No | No | No | No | No | No | **Yes (MIT)** | Plugin system, theme marketplace, contributor program |

### Differentiators we already lead on (defend and double-down)

1. **WhatsApp-native** — competitors don't ship this. Move from `wa.me` to WhatsApp Cloud API for true bulk + delivery telemetry.
2. **RTL-first multi-language (HE + AR)** — no competitor supports RTL. Add a 5th locale and a community translation pipeline.
3. **Self-hosted + open source** — privacy moat. Publish a one-click deploy template (Vercel/Netlify/Cloudflare).
4. **Multi-event namespacing** — most consumer tools cap at one event; we support planners natively.
5. **Offline + PWA depth** — adopt Background Sync API + Periodic Sync to hit native-app parity.

### Capabilities to harvest aggressively

1. **RSVPify-class RSVP forms** — custom questions, plus-one chains, conditional logic, multi-language guest-side.
2. **Zola-class seating** — drag-and-drop with relationship constraints + conflict surfacing.
3. **Joy-class theme system** — picker, live preview, custom CSS variables exposed to non-developers.
4. **Eventbrite-class scan-in** — true QR/NFC reader on mobile with offline-first verification.
5. **Stripe-class payment flows** — hosted checkout, receipts, webhooks, payouts to vendors.
6. **AI for content generation** — invitation copy, FAQ answers, photo captions; we already have prompt builders, ship the integrations.

### Technical Architecture Comparison — Stack Decisions

> How our technical architecture stacks up against competitors. This determines what we can and cannot build.

| Dimension | **Zola** | **Joy** | **RSVPify** | **PlanningPod** | **Lystio (IL)** | **Ours (v11)** | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Frontend** | React 18 + Next.js SSR | React 18 + Apollo | Vue 3 + Nuxt | Angular 15 | PHP + jQuery (legacy) | Vanilla ES2025 + Vite | **Keep vanilla** — bundle is 6× smaller; add Signals for reactivity gaps |
| **CSS** | CSS Modules + Tailwind | Styled-components | Sass + Bootstrap | Material UI | Bootstrap 3 | `@layer` + nesting + 5 themes | **Keep** — ahead of most; add `@scope` for isolation |
| **State** | Redux Toolkit + RTK Query | Apollo Client cache | Vuex | NgRx | jQuery globals | Custom Proxy store | **Replace internals** — adopt Preact Signals under stable API |
| **Routing** | Next.js file router (SSR) | React Router 6 | Vue Router | Angular Router | PHP routes | Hash router (broken back btn) | **Replace** — `pushState` + typed route table |
| **Backend** | Node.js microservices | GraphQL + AWS Lambda | Rails monolith | .NET + SQL Server | PHP + MySQL | Supabase (PostgreSQL) — **Sheets is still active** | **Complete migration** — flip to Supabase now |
| **Auth** | NextAuth.js (JWT + sessions) | Auth0 (managed) | Devise (Rails) | Custom .NET auth | PHP sessions | Custom OAuth + localStorage | **Replace** — Supabase Auth (already configured) |
| **Database** | PostgreSQL + Redis cache | DynamoDB + RDS | PostgreSQL | SQL Server | MySQL | Supabase PostgreSQL (22 migrations) | **Keep + harden** — add RLS assertions in CI |
| **Realtime** | WebSockets (Pusher) | GraphQL subscriptions | Polling | SignalR | None | Supabase Realtime (wired, not active) | **Activate** — presence + live RSVP |
| **File storage** | AWS S3 + CloudFront | AWS S3 | S3-compatible | Azure Blob | Local disk | None (gallery section exists) | **Add** — Supabase Storage |
| **Search** | Elasticsearch | Algolia | pg_trgm | SQL LIKE | PHP LIKE | Client-side index (`search-index.js`) | **Keep** — wire to command palette |
| **Offline** | None | None | None | None | None | SW + memory queue | **Upgrade** — IndexedDB + Background Sync |
| **Error tracking** | Datadog | Sentry | Rollbar | Raygun | None | None | **Add** — Sentry (free tier, ~5 KB) |
| **Perf monitoring** | Datadog RUM | Datadog | Google Analytics | AppInsights | None | None | **Add** — Web Vitals + Lighthouse CI |
| **CI/CD** | GitHub Actions + Vercel | GitHub Actions + AWS CDK | CircleCI + Heroku | Azure DevOps | Manual FTP | 7 GitHub Actions workflows | **Keep + add** — Lighthouse CI gate, coverage gate |
| **Bundle size** | ~300 KB+ gzip | ~250 KB+ gzip | ~180 KB+ gzip | ~400 KB+ gzip | ~200 KB gzip | **~45 KB gzip** | **Defend** — maintain budget CI gate |
| **Hosting** | Vercel (SSR) | AWS CloudFront | Heroku | Azure | cPanel shared | GitHub Pages | **Keep + CDN** — Cloudflare in front |
| **Mobile** | React Native app | iOS + Android | PWA | iOS + Android | iOS + Android | PWA (no app store) | **Phase 4** — Capacitor wrapper |
| **Secrets** | Vercel env vars | AWS Secrets Manager | Heroku Config | Azure Key Vault | PHP `.env` | GitHub Secrets + `inject-config` | **Keep** — add rotation docs |

### Lystio (Israel) — Local Market Benchmark

Lystio is the dominant Israeli wedding platform. Direct comparison:

| Feature | **Lystio** | **Ours** | Gap |
| --- | --- | --- | --- |
| Hebrew UX | ✓ Hebrew-only | ✓ Hebrew-first + 3 more locales | We win |
| WhatsApp invites | Basic wa.me link | Full WABA helper + bulk | We win |
| Israeli vendor directory | ✓ 5000+ vendors | CRUD only, no directory | **Gap** |
| Payment: Bit / PayBox | ✗ | ✓ deep-link utils built | We win (wire it) |
| Israeli phone format | ✓ | ✓ `cleanPhone()` 05X → +972 | Parity |
| Offline | ✗ | ✓ | We win |
| PWA | ✗ | ✓ | We win |
| Tech stack age | PHP + jQuery (legacy) | ES2025 (modern) | We win |
| Pricing | Subscription (expensive) | Free + self-hosted | We win |

**Opportunity**: A polished Hebrew-first PWA wedding manager with offline, WhatsApp, and self-hosting is a genuine market gap vs. Lystio.

---

## 2. Honest Audit — Every Major Decision Reopened

Every decision below is reopened, even ones previously labeled "clean". Verdicts: **Keep**, **Adjust**, **Replace**, **Defer**.

### 2.1 Frontend

| Decision | Today | Verdict | Why / Action |
| --- | --- | --- | --- |
| Vanilla JS (no framework) | 21 sections, manual lifecycle | **Keep + augment** | Bundle and clarity stay strong, but add **Preact Signals** (3 KB) for fine-grained reactivity in dashboards/realtime; do not migrate sections wholesale. |
| Proxy-based store | `core/store.js` deep-watch arrays | **Adjust** | Replace ad-hoc proxy with a typed store using **Preact Signals** or **nanostores** internally; keep public API (`storeGet/storeSet/storeSubscribe`) stable so sections don't churn. |
| Section pattern with `mount/unmount` | 21 modules + 21 templates | **Keep** | Add a formal **section-contract** type guard in CI (`scripts/validate-sections.mjs` already exists — extend to lifecycle assertions). |
| Hash router | `core/nav.js`, swipe + shortcuts | **Replace** | Move to `pushState`/`popstate` with hash fallback for old PWAs; add typed route table + query-params; integrate **View Transitions** cross-document API. |
| CSS `@layer` + nesting (7 files) | components/layout/etc. | **Keep + scope** | Add **CSS `@scope`** rules per section to prevent global selector creep; keep tokens central. |
| Theming via body classes | 5 themes | **Adjust** | Move to **`color-scheme` + CSS custom properties on `:root`** with high-contrast and reduced-motion variants; expose theme picker to end-users (Joy parity). |
| Templates as static HTML strings | `src/templates/*.html`, lazy via `import.meta.glob` | **Keep** | Add a build-time validator that fails on missing `data-i18n` keys (we have `validate-i18n.mjs` — extend to template scanning). |
| Modals as separate HTML files | 7 modals lazy-loaded | **Keep** | Adopt the native `<dialog>` element fully (with focus trap polyfill where needed). |
| Event delegation via `data-action` | `events.js` + `action-registry.js` | **Keep** | Add namespaced actions (`guests:save`, `tables:add`) to scale past 100 actions; current registry pattern supports this. |
| Service Worker | `public/sw.js` + precache | **Adjust** | Replace handwritten SW with a thin **Workbox-style** strategy generator (or hand-written runtime caching) and add **Background Sync** for the offline queue. |
| Bundle target | ~45 KB gzip estimated | **Adjust** | Add a real measurement step (`npm run size` exists) and gate CI at `<= 60 KB` per-route, `<= 200 KB` total. |

### 2.2 Backend & Data

| Decision | Today | Verdict | Why / Action |
| --- | --- | --- | --- |
| Google Sheets as primary | Active write queue + RSVP log | **Replace (deprecate)** | Sheets becomes import/export only. Single source of truth = Supabase. Migration plan in §4. |
| Supabase Postgres | 22 migrations, RLS, audit, push subs, multi-event | **Keep — promote to primary** | Already extensive; finish: enforce `event_id` on every query, add CI `supabase db lint`, generate typed client from schema. |
| Auth: custom OAuth + allowlist | Google/FB/Apple + email allowlist | **Adjust** | Move to **Supabase Auth** as the auth provider (it already supports the same OIDC providers); keep `isApprovedAdmin(email)` as the admin gate. Removes ~3 SDKs from the runtime. |
| LocalStorage primary | `wedding_v1_*` keys | **Replace** | Already partially via `core/storage.js` adapter — finish migration to **IndexedDB** (idb-keyval-style API) and encrypt PII/tokens with **Web Crypto AES-GCM**. |
| Write queue via Sheets debounce | `enqueueWrite()` 1.5 s | **Keep + extend** | Persist queue entries in IndexedDB so they survive crashes; add **Background Sync** trigger. |
| RSVP-Log append-only | Sheet tab | **Keep concept, move backend** | Move to a Postgres `rsvp_log` table (migration 013 already exists); keep append-only semantics via DB triggers. |
| Multi-event scoping | `event_id` columns + service | **Keep** | Add an `org_id`/team layer for planner mode (one planner, many couples). |
| Realtime presence | `services/presence.js` + `realtime-presence.js` | **Activate** | Plumb into UI: who-is-editing badges on Tables and Guests sections. |
| Conflict resolution | `core/conflict-resolver.js` exists | **Activate** | Wire into store sync; add merge UI for last-write-wins fallback. |
| Edge Functions | Some present in `supabase/functions/` | **Expand** | Move WhatsApp Cloud API proxy, push send, RSVP webhook, GDPR erasure into edge functions to avoid client secrets. |

### 2.3 Code, Language & Methods

| Decision | Today | Verdict | Why / Action |
| --- | --- | --- | --- |
| ES2025, pure ESM, no `window.*` | `main.js` entry | **Keep — exemplary** | No change. |
| JS + JSDoc + `types.d.ts` | partial `@ts-check` | **Adjust** | Convert `src/core/`, `src/services/`, `src/handlers/` to **TypeScript** (strict). Keep `src/sections/` as `.js` to preserve velocity; type via JSDoc + ambient `.d.ts`. |
| Validation via Valibot | `sanitize()` schemas | **Keep** | Already excellent — extend coverage to every store mutation entry point. |
| Sanitization via DOMPurify | `utils/sanitize.js` | **Keep** | Required and minimal. |
| Runtime deps = 3 | supabase, dompurify, valibot | **Keep** | Add **Preact Signals (3 KB)** if §2.1 store decision lands. Total stays under 5. |
| Custom proxy vs. signals | custom | **Replace internally** (see §2.1) |  |
| Action registry pattern | `core/action-registry.js` | **Keep** | Add namespacing + dev-time duplicate detection. |
| Section handlers | `src/handlers/*` separated from sections | **Keep** | Clean separation; add explicit handler type contracts. |
| Repositories layer | `src/repositories/` exists | **Activate** | Make it the only path to backend reads/writes; sections must not import services directly. Enforce via ESLint `no-restricted-imports`. |
| Error handling | `services/error-pipeline.js` | **Keep + integrate** | Pipe to Sentry-free / Glitchtip in production via opt-in setting. |
| Constants & enums | `core/constants.js`, `domain-enums.js` | **Keep** | Already canonical. |
| File-naming | kebab-case `.js` | **Keep** | Done. |

### 2.4 Documentation

| Decision | Today | Verdict | Why / Action |
| --- | --- | --- | --- |
| Mermaid in `ARCHITECTURE.md` + ADRs | 12 ADRs, 9+ diagrams | **Keep** | Excellent culture. Add a CI check that ADRs cover every "Replace" decision in §2. |
| README badges | 8 badges | **Keep** | Add a *bundle-size* badge and *lighthouse* badge. |
| Per-language Copilot instructions | 7 files | **Keep** | Already strong. |
| AGENTS.md + per-domain `.agent.md` | 4 agents | **Keep** | Add a `release-engineer.agent.md` for version bumps + CHANGELOG. |
| `docs/operations/` runbooks | deploy, incident, migrations | **Keep** | Add a **disaster-recovery** runbook (Supabase backup restore). |
| Locale guide | `docs/locale-guide.md` | **Keep** | Add screenshots per locale. |
| Inline JSDoc | partial | **Adjust** | Require JSDoc on every public function in `core/` + `services/`; CI gate via `eslint-plugin-jsdoc`. |
| Doc volume | ~30 markdown files | **Audit** | Run a "doc relevance" sweep each release; archive stale items to `docs/archive/`. |

### 2.5 Configuration

| Decision | Today | Verdict | Why / Action |
| --- | --- | --- | --- |
| ESLint + Stylelint + HTMLHint + markdownlint | `--max-warnings 0` | **Keep** | World-class. |
| Vitest, `pool: forks`, no warnings | 2318 tests | **Keep** | Add coverage gate at 80 % lines. |
| Playwright E2E (smoke + visual) | `tests/e2e/` | **Adjust** | Add: full RSVP flow, multi-event switch, offline → online sync, a11y full-page audit. |
| Vite manual chunks | locale-en, public, analytics, gallery | **Adjust** | Move to **automatic code splitting** via dynamic `import()` in section/modal lazy loaders; manual chunks survive only for shared vendors. |
| `tsconfig.json` ES2022 | currently behind | **Adjust** | Bump `target/lib` to ES2025, `module` to ESNext, extend a shared base from `MyScripts/tooling/`. |
| Shared `node_modules` at parent | works | **Keep** | Document loudly. |
| `.editorconfig` + Prettier-free | EditorConfig only | **Keep** | Avoid formatter wars. |
| GitHub Actions matrix | Node 22 + 24 | **Keep** | Add Node 26 when LTS. |
| Dependabot grouped weekly | yes | **Keep** | Add npm + actions + supabase migrations groups. |
| CSP + SRI | enforced | **Keep** | Add **Trusted Types** policy in production. |
| `version` source | package.json + `sync-version.mjs` | **Keep** | Already canonical. |

### 2.6 Tools & Versions

| Tool | Current | Target | Why |
| --- | --- | --- | --- |
| Node | ≥ 22 | ≥ 22 LTS, 24/26 in matrix | LTS alignment |
| npm | 11.x | 11.x | matches Node |
| Vite | 8 | 8 → 9 when stable | fast |
| Vitest | 4 | 4 → 5 | aligned |
| Playwright | 1.59 | latest | a11y + traces |
| ESLint | 10 | 10 | flat config |
| Stylelint | 17 | 17 | standard |
| Supabase JS | 2.49 | 2.x latest |  |
| DOMPurify | 3.2 | 3.x latest |  |
| Valibot | 1.0 | 1.x latest |  |
| (new) Preact Signals | — | 1.x | reactive store internals |
| (new) idb-keyval | — | optional, or hand-rolled | IDB wrapper |

### 2.7 External Sources & APIs

| Integration | Status | Verdict | Action |
| --- | --- | --- | --- |
| Google OAuth (GIS SDK) | active | **Adjust** | Migrate behind Supabase Auth provider. |
| Facebook OAuth (FB SDK) | dynamic load | **Adjust** | Same — Supabase OIDC. Drop FB SDK from runtime. |
| Apple OAuth (AppleID SDK) | dynamic load | **Adjust** | Same — Supabase OIDC. |
| Google Sheets / Apps Script | active | **Deprecate** | Import/export only after Supabase cutover. |
| WhatsApp `wa.me` | active | **Keep + extend** | Add WhatsApp Cloud API via edge function (helper already in `utils/whatsapp-cloud-api.js`). |
| Web Push (VAPID) | helper exists | **Activate** | Wire end-to-end with edge function sender + `push_subscriptions` table (migration 020). |
| Calendar (.ics) | unknown | **Add** | Generate `.ics` server-side for guests — improves day-of attendance. |
| Maps | none | **Add** | Embed venue map (OpenStreetMap or Mapbox free tier) + Waze deep link. |
| Payments | links only (Bit/PayBox/PayPal) | **Add** | Stripe Checkout + receipts via edge function for vendor payouts. |
| LLM provider | none wired | **Add** | OpenAI / Anthropic via edge function; user-supplied key first, BYO key model. |
| Photo CDN | none | **Add** | Supabase Storage + image transformation; consider Cloudinary free tier. |
| Sentry / Glitchtip | none | **Add** | Opt-in error reporting via `services/error-pipeline.js`. |

### 2.8 Database & Infrastructure

| Concern | Today | Verdict | Action |
| --- | --- | --- | --- |
| Database engine | Supabase (Postgres) | **Keep** | Migrations in `supabase/migrations/` are well-numbered and current. |
| RLS | per-table policies (002, 018) | **Keep** | Add `supabase test db` policy assertions in CI. |
| Soft delete | migrations 009, 015, 017 | **Keep** | Add a scheduled hard-delete job for >90-day soft deletes (GDPR). |
| Audit log | migration 004 | **Keep** | Surface a "history" view in Settings. |
| Indexes | pagination 010 | **Adjust** | Add indexes for `event_id`-scoped queries on every hot table. |
| Backups | Supabase managed | **Keep + document** | Add a quarterly **restore drill** documented in `docs/operations/`. |
| Hosting | GitHub Pages | **Keep + add** | Add Cloudflare Pages mirror for SSR-ready future + better edge cache; GH Pages stays canonical. |
| Edge functions | partial | **Expand** | WABA proxy, push sender, GDPR erasure, RSVP webhook, LLM proxy. |
| CDN | GH Pages CDN | **Adjust** | Add Cloudflare in front for HTTP/3 + image transforms. |
| Monitoring | none | **Add** | UptimeRobot (free), Glitchtip (free OSS), Lighthouse CI weekly. |
| Secrets management | GitHub Secrets + `inject-config` | **Keep** | Document rotation cadence (90 days). |
| Domain | `rajwanyair.github.io/Wedding` | **Add custom** | Acquire short domain; configure DNS via Cloudflare. |

---

## 3. Technical Debt Inventory

> Prioritized list of concrete blockers and risks as of v11.0.0. P0 = production blocker. P1 = significant risk. P2 = maintenance drag. P3 = future capability gap.

| Priority | Area | Debt | Risk if ignored | Effort |
| --- | --- | --- | --- | --- |
| **P0** | Backend | `BACKEND_TYPE = "sheets"` still active at v11 — Supabase never flipped as primary | Rate limits, no auth, no realtime; data integrity risk at scale | L |
| **P0** | Security | Auth tokens in plaintext `localStorage` — any XSS reads sessions | OWASP A02:2021 Cryptographic Failures | M |
| **P0** | Monitoring | Zero production error tracking — failures are invisible | Silent data loss; no incident response capability | S |
| **P1** | Storage | `localStorage` as primary (5 MB quota, no encryption, no cross-tab sync) | Quota exceeded → silent failure; PII exposed | M |
| **P1** | Router | `replaceState` breaks browser back button; no query param deep links | Broken UX; cannot share direct links to guests/tables | S |
| **P1** | Dead code | 179 dead exports (20% of 904) including live-but-unconnected features | Inflated mental model; false test confidence | M |
| **P1** | PWA | Offline write queue lives in memory only — lost on crash/tab close | Data loss for offline users | M |
| **P2** | Auth | ADMIN_EMAILS array in `config.js` — adding admins requires a code deploy | Operational friction; security antipattern | S |
| **P2** | Auth | OAuth flows bypass Supabase Auth — custom session management prone to bugs | JWT expiry not handled uniformly; potential session fixation | L |
| **P2** | State | Deep Proxy mutations on nested objects silently do not fire reactivity | Hard-to-reproduce UI bugs when updating nested store properties | M |
| **P2** | CI | No Lighthouse CI gate — performance regressions go undetected between versions | Bundle bloat; LCP regression; no a11y regression detection | S |
| **P2** | CI | No test coverage gate — coverage can silently drop to 0% | Critical paths untested after refactors | S |
| **P2** | Build | Manual `manualChunks` in `vite.config.js` — breaks on any file rename | Build failures on routine refactors | S |
| **P3** | CSS | No `@scope` — global selectors leak between sections | Style conflicts when two sections share a class name | M |
| **P3** | Features | QR check-in util built, UI incomplete — event-day check-in not production-ready | Missing high-value day-of feature | M |
| **P3** | Features | 15+ utilities built with zero UI: Web Push, tour, AI draft, AI seating, PDF, vCard, etc. | Feature gap vs. Zola/Joy; wasted investment | L |
| **P3** | Realtime | Supabase Realtime wired but never activated — no live co-editing | Missing feature that Joy and Zola both ship | M |
| **P3** | Architecture | No `BaseSection` class — 18 sections each implement their own lifecycle | Copy-paste lifecycle bugs; store subscription leaks | L |
| **P4** | Mobile | PWA only — no Capacitor/TWA for app store distribution | App store absent; native share/NFC/haptics limited | XL |
| **P4** | API | No public REST API — no webhook/integration surface | Ecosystem closed; no vendor tool integration | XL |

---

## 4. What to Improve / Rewrite / Refactor / Enhance

Concrete, actionable backlog grouped by impact.

### 4.1 Improve (low risk, high payoff)

1. Bundle-size & Lighthouse badges in README; CI publishes JSON reports.
2. JSDoc completeness pass in `src/core/` + `src/services/` — gate via `eslint-plugin-jsdoc`.
3. Coverage gate at 80 % lines / 75 % branches.
4. RTL Playwright a11y suite (axe-core full scan per locale).
5. Add `release-engineer.agent.md` to automate version bumps + CHANGELOG.
6. Consolidate `docs/` — archive anything older than two minor versions.

### 4.2 Rewrite (worth the disruption)

1. **Auth subsystem** — drop direct Google/FB/Apple SDKs; use Supabase Auth providers; keep `isApprovedAdmin` gate. Removes ~30 KB and four moving parts.
2. **Storage layer** — finish IDB migration; encrypt session+PII; persist offline queue; deprecate `wedding_v1_*` direct reads.
3. **Router** — `pushState` + typed route table + query params + cross-doc View Transitions.
4. **Service Worker** — strategy-based runtime cache + Background Sync; precache from Vite manifest.
5. **Sheets sync layer** — replace runtime sync with one-shot import/export utilities.

### 4.3 Refactor (code health)

1. Move every backend call behind `src/repositories/`; ESLint-ban service imports from sections.
2. Convert `src/core/` + `src/services/` + `src/handlers/` to TypeScript (strict).
3. Deduplicate the 50-file `src/services/` directory — many helpers (e.g. `share.js` vs `share-service.js`, `audit.js` vs `audit-pipeline.js`) overlap.
4. Namespace `data-action` values (`guests:save`, `tables:add`) to scale past 100 actions.
5. Tighten store API: replace internal proxy with signals; keep external API stable.

### 4.4 Enhance (new capability)

1. WhatsApp Cloud API integration end-to-end (template approval, delivery webhook, AB tests).
2. Web Push end-to-end (VAPID keys, edge sender, opt-in UI).
3. AI message + seating suggestions (OpenAI/Anthropic via edge function, BYO key).
4. Public guest-facing wedding website builder (theme picker, custom domain).
5. QR/NFC kiosk mode for event-day check-in.
6. Stripe Checkout for vendor payments + receipts.
7. Calendar `.ics` generation + Google Calendar OAuth sync.
8. Photo gallery with Supabase Storage + guest uploads.
9. Plugin/extension surface (third-party themes + integrations).
10. Two new locales (FR, ES) via community pipeline; total 6.

---

## 5. Phased Plan (v12 → v15)

Versioning is **Active = current**, **Next = committed scope**, **Later = candidate scope**. Every phase boundary is a decision-review checkpoint.

### Phase A — v12.0.0 *Backend Convergence + Critical P0/P1 Fixes* (Next)

Goal: make Supabase the **single** authoritative backend, fix all P0 security issues, and repair the router.

| Workstream | Deliverable | Exit Condition |
| --- | --- | --- |
| Supabase primary | Repositories layer becomes the only write path; Sheets sync removed from hot path | `BACKEND_TYPE = "supabase"` in all environments; zero Sheets calls at runtime |
| Error tracking | Sentry (free tier, `@sentry/browser`) wired in `src/services/monitoring.js` | Production errors visible in Sentry dashboard |
| Auth token encryption | Web Crypto AES-GCM in `src/services/secure-storage.js`; migrate plaintext sessions | No raw JWT or email in `localStorage` |
| Auth migration | Switch to Supabase Auth (Google/FB/Apple) — drop runtime SDKs | FB SDK + AppleID SDK removed from runtime; `auth.js` calls `supabase.auth.*` |
| Storage upgrade | Finish IndexedDB cutover; encrypt tokens + PII; persistent offline queue | idb-store.js is the only storage path for guest/table/vendor/expense data |
| Router | `pushState` + typed routes + query params; back-button + deep-link parity | Browser back button works; `?id=<guestId>` opens guest modal directly |
| Edge functions | WABA proxy, push send, GDPR erasure, RSVP webhook | No API keys exposed in client bundle |
| Tests | Supabase integration tests in CI; full RSVP + offline E2E | CI: zero failing tests with `BACKEND_TYPE=supabase` |

**Key implementation specifics:**

Supabase schema (extend existing migrations):

```sql
-- Migration 023: canonical schema alignment
ALTER TABLE guests ADD COLUMN IF NOT EXISTS accessibility_needs text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS responded_at timestamptz;
CREATE INDEX IF NOT EXISTS guests_event_id_idx ON guests (event_id);
CREATE INDEX IF NOT EXISTS guests_phone_idx ON guests (phone);

-- Enforce event_id FK everywhere via RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event owner read" ON guests FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
CREATE POLICY "event owner write" ON guests FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
```

Router fix (`src/core/nav.js`):

```js
// Replace replaceState with pushState + popstate handler
function navigateTo(section, params = {}) {
  const url = new URL(location.pathname, location.origin);
  url.pathname = `/${section}`;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  history.pushState({ section, params }, "", url.toString());
  _mountSection(section, params);
}

window.addEventListener("popstate", (e) => {
  if (e.state?.section) _mountSection(e.state.section, e.state.params ?? {});
});
```

Auth token encryption (`src/services/secure-storage.js`):

```js
async function getDerivedKey() {
  const raw = await idbGet("__device_key__") ?? crypto.getRandomValues(new Uint8Array(32));
  if (!await idbGet("__device_key__")) await idbSet("__device_key__", raw);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function setSecure(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getDerivedKey(),
    new TextEncoder().encode(JSON.stringify(value)));
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ iv: [...iv], data: [...new Uint8Array(enc)] }));
}
```

Sentry (`src/services/monitoring.js`):

```js
import * as Sentry from "@sentry/browser";
export function initMonitoring() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.05, // 5% sampling — stay on free tier
    beforeSend: scrubPii,   // strip phone numbers, emails before sending
  });
}
```

### Phase B — v13.0.0 *DX, Type Safety + Architecture Cleanup* (Next)

| Workstream | Deliverable | Exit Condition |
| --- | --- | --- |
| BaseSection class | `src/core/section-base.js` — uniform mount/unmount/subscribe lifecycle | All 18+ sections extend BaseSection; no leaked subscriptions |
| TypeScript | `core/`, `services/`, `handlers/` migrated to `.ts` strict | `tsc --noEmit` exits 0; sections stay `.js` + JSDoc |
| Store internals | Preact Signals under stable `storeGet/storeSet/storeSubscribe` API | Nested object mutations fire reactivity; no external API changes |
| Service-Worker rewrite | Strategy-based runtime cache + Background Sync for offline queue | Offline write queue survives app crash; syncs on reconnect |
| Dead export purge | Run `audit:dead` → remove or wire every dead export | `dead exports < 5%` |
| Test infra | Coverage gate 80% lines in CI; Lighthouse-CI in PRs; axe full audit per locale | CI fails below threshold |
| `@scope` CSS isolation | Section-level `@scope` blocks prevent global selector leaks | No cross-section style bleed; all 5 themes pass |
| Auto code splitting | Remove `manualChunks`; use dynamic `import()` at section load | Vite builds without manual chunk config |

**Key patterns introduced:**

BaseSection class (`src/core/section-base.js`):

```js
export class BaseSection {
  #name; #unsubscribers = []; #cleanup = [];
  constructor(name) { this.#name = name; }

  // Lifecycle — override in subclass
  async onMount(_params) {}
  onUnmount() {}

  // Available to all sections
  subscribe(key, fn) {
    const unsub = storeSubscribe(key, fn);
    this.#unsubscribers.push(unsub);
    return unsub;
  }
  addCleanup(fn) { this.#cleanup.push(fn); }

  // Called by nav.js — do NOT override
  async mount(params) { await this.onMount(params); }
  unmount() {
    this.#unsubscribers.forEach(fn => fn());
    this.#cleanup.forEach(fn => fn());
    this.#unsubscribers = []; this.#cleanup = [];
    this.onUnmount();
  }
}
```

### Phase C — v14.0.0 *Smart & Native-Class* (Later)

| Workstream | Deliverable |
| --- | --- |
| Wire existing utilities | Connect 15+ built-but-unwired utils to real UI (see table below) |
| AI | Seating CSP solver UI + invitation copy via edge LLM proxy |
| WhatsApp | Cloud API end-to-end; template-approval workflow; delivery webhooks; A/B tests |
| Realtime | Presence badges, live cursors, conflict-resolver wired in UI |
| Native PWA | Background Sync, Periodic Sync, Web Push opt-in, Badging, Share Target |
| Payments | Stripe Checkout + receipts for vendor payouts; Bit/PayBox deep links in UI |
| Photos | Supabase Storage + guest uploads + on-the-fly image transforms |
| QR check-in | Event-day kiosk mode; per-guest QR codes; offline scan-and-confirm |

**Wire existing utilities to UI** — these are already built; just need a UI connection:

| Utility | Where to wire | UI element |
| --- | --- | --- |
| `qr-code.js` | Check-in section | "Print QR" button + event-day kiosk view |
| `push-manager.js` | Settings → Notifications | Web Push opt-in toggle |
| `tour-guide.js` | Dashboard (first-run) | Onboarding wizard overlay |
| `ai-draft.js` | WhatsApp section | "✨ Draft with AI" button + tone picker |
| `seating-ai.js` | Tables section | "✨ Auto-assign" button + diff view |
| `guest-relationships.js` | Tables section | Conflict highlights on seating chart |
| `pdf-layout.js` | Guests + Tables | "Export to PDF" button |
| `search-index.js` | Nav (Ctrl+K) | Command palette modal |
| `whatsapp-cloud-api.js` | WhatsApp section | Bulk send via Business API |
| `notification-builder.js` | Dashboard | In-app notification center badge |
| `event-schedule.js` | Timeline section | Run-of-show editor |
| `changelog-parser.js` | Dashboard | "What's New" modal on version bump |
| `rsvp-analytics.js` | Analytics section | 6-stage funnel chart |
| `budget-burndown.js` | Budget section | Burn-down area chart |
| `vendor-analytics.js` | Vendors section | Payment timeline chart |
| `message-personalizer.js` | WhatsApp + Invitation | Template variables live preview |
| `calendar-link.js` | RSVP confirmation | "Add to Calendar" button |
| `vcard.js` | Vendors section | "Download contact" per vendor |
| `payment-link.js` | Vendors section | Bit/PayBox/PayPal buttons |
| `seating-exporter.js` | Tables section | Export seating chart to CSV/JSON |

### Phase D — v15.0.0 *Platform & Scale* (Later)

| Workstream | Deliverable |
| --- | --- |
| Org/team mode | Wedding planner workspaces; role-based access (`owner/co-planner/photographer/vendor/guest`); vendor reuse |
| Public website builder | Theme picker, custom domain via CNAME, live preview, password protection |
| Plugin surface | Theme + integration plugin API; `plugin.json` manifest |
| Locales | FR + ES community-contributed; total 6 locales |
| Custom domain + CDN | Cloudflare in front; HTTP/3; Brotli; image transforms; custom `wedding.yourdomain.com` |
| Observability | Glitchtip (OSS Sentry) + UptimeRobot + Lighthouse-CI weekly cron |
| Capacitor wrapper | iOS + Android app store distribution; native NFC, haptics, share sheet |
| Public REST API | Supabase PostgREST + API key management UI + webhook subscriptions |

---

## 6. Success Metrics

| Metric | v11.0.0 (today) | v12 target | v13 target | v14+ target |
| --- | --- | --- | --- | --- |
| Lighthouse Performance | ~85 (est.) | ≥ 95 | ≥ 95 | ≥ 95 |
| Lighthouse Accessibility | ~90 (est.) | ≥ 95 | 100 | 100 |
| Lighthouse Best-Practices | ~95 | 100 | 100 | 100 |
| Bundle (gzip, total) | ~45 KB est. | ≤ 60 KB | ≤ 60 KB | ≤ 80 KB w/ AI |
| Per-route gzip | unmetered | ≤ 25 KB | ≤ 25 KB | ≤ 25 KB |
| Test count | 2 318 | 2 800+ | 3 200+ | 3 500+ |
| Line coverage | ~70 % est. | ≥ 80 % | ≥ 85 % | ≥ 85 % |
| Dead exports | 20 % | < 5 % | < 3 % | < 3 % |
| Time-to-Interactive (4G) | ~1.5 s est. | < 1 s | < 1 s | < 1 s |
| Offline RSVP | partial | full + persistent queue | + Background Sync | + conflict UI |
| Concurrent editors | 1 | 2+ realtime | 5+ realtime | 10+ realtime |
| Locales | 4 (he/en/ar/ru) | 4 | 5 | 6 |
| Lighthouse-CI run | manual | per PR | per PR | per PR |
| Supported auth providers | 4 + anon | 4 + anon (via Supabase) | + magic link | + passkeys (WebAuthn) |
| Monitoring | none | error pipeline opt-in | Glitchtip + uptime | + RUM |

---

## 7. Decision Register (open questions)

These remain explicitly **open** for review at each phase boundary; defaults below are current working assumptions.

| Open question | Working default | Trigger to revisit |
| --- | --- | --- |
| Adopt Preact (not just signals)? | No — signals only | Section count > 25 or duplicated render logic in 5+ places |
| Move to TypeScript across sections? | No (core/services/handlers only) | When section sprawl harms refactor speed |
| Adopt Capacitor for native shells? | No | When PWA install rate < 30 % of monthly users |
| Self-hosted Supabase? | No (managed) | Privacy demand from enterprise planners |
| Add Tailwind / utility CSS? | No (CSS @layer + tokens) | Theme picker work in Phase D |
| Switch hosting to Cloudflare Pages? | Mirror, not primary | If GH Pages cache TTL becomes a blocker |
| Replace Vitest with Node test runner? | No | If Vitest 5 destabilizes |
| Adopt CRDTs (Yjs/Automerge) for realtime? | No (last-write-wins + merge UI) | Realtime conflict reports > 1 % of writes |

---

## 8. Working Principles (renewed)

1. **Ship working software** over aspirational prose.
2. **Best-in-class is a sum of small disciplines** — every PR meets the gates: lint 0, tests 0 fail, a11y axe 0 violations, Lighthouse ≥ 95.
3. **One canonical source per concern** — version, constants, defaults, locale, schema.
4. **Security & data ownership** beat convenience — encrypt everything sensitive, exportable on demand.
5. **Offline & RTL are first-class** — every feature works in Hebrew, on a flaky 3G, and offline.
6. **Minimal dependencies, maximum native platform** — every `npm install` justifies its size, security, and maintenance cost.
7. **Open by default** — OSS, ADR-driven decisions, public roadmap, public CHANGELOG.
8. **Reopen every decision at every phase** — no decision is permanent.

---

## 9. Release Line

| Version | Focus | Status |
| --- | --- | --- |
| v8.x – v10.x | Foundation, security, dead-code purge, multi-event, Supabase wiring | **Done** |
| **v11.0.0** | Production cleanup, dead utils purge, handler test consolidation | **Active** |
| v12.0.0 | Backend convergence (Supabase primary, Sheets deprecated, IDB, router, edge fns) | **Next** |
| v13.0.0 | DX & type safety (TypeScript core, signals, SW rewrite, coverage gates) | **Next** |
| v14.0.0 | Smart features (AI, WABA, realtime, native-class PWA, payments, photos) | **Later** |
| v15.0.0 | Platform & scale (org mode, website builder, plugins, 6 locales, custom domain) | **Later** |

---

*Last updated: 2026-04-26 · v11.0.0 · Living document — re-audit §2 and §7 at every phase boundary. Every "Replace" or "Adjust" decision requires a new ADR in `docs/adr/`.*

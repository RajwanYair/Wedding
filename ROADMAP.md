# Wedding Manager — Roadmap v11.3.0

> Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · History: [CHANGELOG.md](CHANGELOG.md) ·
> Contributors: [CONTRIBUTING.md](CONTRIBUTING.md) · ADRs: [docs/adr/](docs/adr/)

This document is a **deep architectural re-evaluation** of every decision the project has taken so far
— including the ones that previously shipped under the label "clean". Every layer is audited from first
principles: frontend, backend, language, docs, code methods, architecture, configuration, tools and versions,
external sources and APIs, database, and infrastructure. Every assumption is reopened. The goal is to build,
ship, and defend a **best-in-class wedding management application** — Hebrew-first, RTL-native,
offline-capable, privacy-respecting, open source.

This roadmap is the **single source of truth** for direction. The previous `ROADMAP.old.md` has been
retired (see [CHANGELOG.md](CHANGELOG.md) entry for v11.2.0); anything still relevant from it is
consolidated below.

## Contents

0. [Executive Summary & North Star](#0-executive-summary--north-star)
1. [First-Principles Rethink](#1-first-principles-rethink--if-we-rebuilt-from-zero)
2. [Competitive Landscape & Harvest Matrix](#2-competitive-landscape--harvest-matrix)
3. [Honest Audit — Every Major Decision Reopened](#3-honest-audit--every-major-decision-reopened)
4. [Technical Debt & Risk Register](#4-technical-debt--risk-register)
5. [Improve / Rewrite / Refactor / Enhance](#5-improve--rewrite--refactor--enhance)
6. [Phased Plan v12 → v16](#6-phased-plan-v12--v16)
7. [Migration Playbooks (concrete code)](#7-migration-playbooks-concrete-code)
8. [Success Metrics & SLOs](#8-success-metrics--slos)
9. [Open Decisions Register](#9-open-decisions-register)
10. [Working Principles (renewed)](#10-working-principles-renewed)
11. [Release Line](#11-release-line)

---

## 0. Executive Summary & North Star

**State (v11.3.0)** — 2 385 tests passing, 0 lint errors / warnings, 21 sections, 4 locales (HE/EN/AR/RU),
Vanilla ES2025 + Vite 8, ~45 KB gzip bundle, 22 Supabase migrations, 7 GitHub Actions workflows, MIT-licensed.
Strong engineering hygiene; weak feature wiring (15+ utilities exist with no UI), Sheets is *still* the active
runtime backend, auth tokens live in plaintext `localStorage`, and the router silently breaks the browser back button.

**North Star** — *The fastest, most accessible, RTL-native, offline-first, open-source wedding manager on the web.
Self-hostable in one click, privately operable on a flaky 3G in Hebrew, integrated end-to-end with WhatsApp,
with planner-grade analytics and AI assistance, at a bundle size 5–10× smaller than every commercial competitor.*

**Top 5 priorities (next two minor releases):**

1. **Cut over to Supabase as the only runtime backend.** Sheets becomes import/export only. (`BACKEND_TYPE = "supabase"` everywhere.)
2. **Encrypt every credential and PII at rest.** Web Crypto AES-GCM in IndexedDB; remove plaintext JWT/email from `localStorage`.
3. **Replace the hash router with `pushState` + typed routes + query params.** Restore the back button; enable deep links.
4. **Wire production-grade observability.** Sentry-compatible error pipeline, Lighthouse CI hard gate, Web Vitals beacons.
5. **Activate every dormant utility.** ~15 utilities (QR, push, AI draft, AI seating, PDF, vCard,
   calendar, command palette, payments, etc.) exist with no UI — this is the highest leverage in
   the entire backlog.

**Single quality bar (every PR):** lint 0 errors / 0 warnings · test 0 fail · axe 0 violations ·
Lighthouse ≥ 95 · `npm run audit:security` 0 findings · bundle ≤ 60 KB gzip per route.

---

## 1. First-Principles Rethink — *If we rebuilt from zero*

> Pretend the repo doesn't exist. We have one Hebrew-first wedding to plan,
> four locales to support, a flaky-3G venue, and an ~$0/month budget.
> What would we choose? And how does each fresh choice compare to what we already have?

| Layer | Fresh-from-zero choice (2026) | Today's reality | Verdict | Action |
| --- | --- | --- | --- | --- |
| **UI runtime** | Vanilla ES2025 + Web Components for shared shells, **Preact Signals** for fine-grained reactivity. No framework. | Vanilla ES2025 + custom Proxy store, no Web Components, no signals. | **Keep direction; modernise internals.** | Adopt Signals under the existing `storeGet/Set/Subscribe` API; wrap 4–5 truly cross-cutting widgets (toast, modal, dialog, tabs) as Web Components. |
| **Build** | Vite 8 + esbuild, single ESM entry, automatic code splitting via dynamic `import()`. | Vite 8 with **manual `manualChunks`** that breaks on file rename. | **Keep tool; remove manual config.** | Drop `manualChunks`; let Vite split on dynamic imports introduced by the section/modal lazy loaders. |
| **CSS** | `@layer` + nesting + `@scope` + `light-dark()` + `color-mix()` + container queries. Theme tokens on `:root`. | `@layer` + nesting + 5 themes via `body.theme-*`. No `@scope`, no container queries. | **Keep + extend.** | Add `@scope` per section, `color-scheme: light dark`, container queries on dashboard cards, expose theme via `:root` data-attrs (Joy-class theme picker). |
| **Routing** | `pushState` + typed route table + query params + cross-doc View Transitions. | Hash router; `replaceState` breaks back; no query params. | **Replace.** | See §7.2 playbook. |
| **State** | Preact Signals (3 KB). Public API kept stable. | Custom recursive Proxy with deep-watch quirks. | **Replace internals; preserve API.** | §7.4 playbook. |
| **Storage** | IndexedDB primary; Web Crypto AES-256-GCM for PII; encrypted offline queue. | `localStorage` primary, plaintext sessions, in-memory write queue (lost on crash). | **Replace.** | §7.3 playbook (already partially staged: `secure-storage.js` exists). |
| **Backend** | Supabase Postgres + RLS + edge functions. Single source of truth. | Sheets is still primary at runtime; Supabase is wired but not flipped. | **Replace.** | §7.1 cutover playbook. |
| **Auth** | Supabase Auth (Google/FB/Apple OIDC) + magic link + WebAuthn passkeys. Email allowlist as admin gate. | Custom OAuth via three SDKs (GIS, FB, AppleID); session in plaintext `localStorage`. | **Replace.** | Drop FB/Apple SDKs; route all OAuth through Supabase. |
| **Realtime** | Supabase Realtime; presence + broadcast; CRDT-style merge for last-write conflicts. | Supabase Realtime wired but never activated; `conflict-resolver.js` not used. | **Activate.** | Phase C wiring. |
| **Lang** | TypeScript strict in `core/`, `services/`, `handlers/`; `.js` + JSDoc in `sections/`. | JS + JSDoc + partial `types.d.ts`. | **Adjust.** | Phase B migration. |
| **Validation** | Valibot at every boundary. | Valibot at most boundaries. | **Keep + complete.** | Coverage to 100 % of store mutations and external inputs. |
| **i18n** | ICU MessageFormat (plurals, gender, select). 6 locales (HE/AR/EN/RU/ES/FR). RTL-pair tested. | Flat key/value JSON; 4 locales. | **Adjust.** | Add ICU plurals; community pipeline; +ES, +FR. |
| **Offline** | SW + IndexedDB + Background Sync API + Periodic Sync + Push API. | SW + precache + memory queue. | **Adjust.** | Background Sync + persistent queue; opt-in periodic sync for upcoming events. |
| **Tests** | Vitest unit/integration + Playwright E2E + axe full-page + Lighthouse-CI gate + visual regression. | Vitest 2 385 tests + Playwright smoke + visual + axe (Lighthouse advisory until v12). | **Keep direction; tighten gates.** | Hard Lighthouse gate (already done in v11.3.0); coverage gate at 80 %. |
| **CI/CD** | GH Actions; Node 22+24+26 matrix; Lighthouse-CI; supply-chain scan; SBOM; reproducible build. | 7 workflows; pinned actions; CodeQL on. | **Keep + extend.** | Add SBOM (CycloneDX), Trivy scan, OpenSSF Scorecard badge. |
| **Hosting** | GH Pages canonical; Cloudflare in front for HTTP/3 + image transforms; preview URLs on every PR. | GH Pages canonical; preview workflow exists; no CDN. | **Adjust.** | Add Cloudflare proxy + custom short domain. |
| **Mobile** | PWA + Capacitor wrapper for App Store / Play Store distribution. | PWA only. | **Defer to v15.** | When PWA install rate < 30 % of MAU. |
| **AI** | Edge-function proxy; BYO key; OpenAI + Anthropic + local Ollama. | Prompt-builders exist; no provider wired. | **Add.** | v14, BYO key first. |
| **Payments** | Stripe Checkout + receipts via edge function; Bit/PayBox/PayPal deep links retained. | Helpers exist for Bit/PayBox/PayPal; no Stripe. | **Add.** | v14. |
| **Photos** | Supabase Storage + on-the-fly transforms; guest uploads via signed URL. | Gallery section exists; no storage backend. | **Add.** | v14. |
| **Monitoring** | Sentry (free tier) + Web Vitals + UptimeRobot + Lighthouse-CI weekly cron. | `monitoring.js` ships Sentry-compatible adapter; not yet enabled in production. | **Activate.** | v12. |
| **Docs** | Diátaxis split (tutorial / how-to / reference / explanation). ADR per "Replace" decision. | 12 ADRs, 4 agents, runbooks, locale guide. | **Keep + tighten.** | Diátaxis re-org of `docs/`; ADR-per-Replace gate in CI. |

**Net assessment:** the project's *direction* is overwhelmingly correct —
vanilla ES2025, RTL-first, OSS, minimal deps, Supabase, PWA. The *execution gaps*
are concentrated in a handful of replaceable subsystems (router, store internals,
storage layer, auth integration, runtime backend selector). Fixing those five
unlocks every other capability in §2's harvest list.

---

## 2. Competitive Landscape & Harvest Matrix

### 2.1 Capability comparison — 14 products

Fourteen serious wedding / event-management products were evaluated. Each row is a benchmark we measure ourselves against; each column is a product we learn from.

| Capability | **Zola** | **The Knot** | **WeddingWire** | **Joy (Withjoy)** | **Appy Couple** | **RSVPify** | **Eventbrite** | **Riley & Grey** | **Minted** | **Greenvelope** | **Bridebook (UK)** | **Loverly** | **Lystio (IL)** | **Notion specialty** | **Ours (v11.3)** | Harvest Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest list + RSVP | CRM, address book, +1 logic | Email RSVP | Vendor-attached RSVP | Group RSVP | Travel + meals | **Best-in-class** RSVP forms, dietary, custom Q | Ticket-style | Boutique, design-led | Gallery + RSVP | Email-rich RSVP | UK supplier-led | Inspiration-led | Hebrew, basic | Manual templates | Phone-first, WhatsApp, meal/accessibility, multi-event | Custom Q chains, conditional logic, address harvest |
| Seating chart | DnD, custom shapes | Basic | Vendor-supplied | DnD | None | Add-on | None | None | None | None | DnD | None | None | None | DnD, round/rect, capacity, conflict-detector service | **AI-suggested seating, relationship-aware (CSP)** |
| Budget & expenses | Vendor + payments | Calculator | Local cost data | Simple | Basic | None | None | None | None | None | UK budgeting, vendor-quoted | None | None | Manual | Categories, payment-rate, variance | **Burn-down chart, cash-flow forecast, vendor SLA** |
| Vendor mgmt | Marketplace + payments | Directory + reviews | Directory + RFP | List | List | None | None | Premium curated | Curated | Curated | UK directory 3 000+ | Directory | 5 000+ IL vendors | None | Full CRUD, payment tracking, WhatsApp | **Inbox, contracts, e-sign, payouts** |
| Wedding website | 100+ themes, custom domain, password | Themes | Themes | Modern themes | App-style site | Form-only | None | **Premium design, password, custom domain** | Premium themes | Email-card themes | Themes | Themes | None | Manual | 5 themes, RTL, PWA | **Public site builder, theme picker, custom domain, password** |
| Event-day check-in | None | None | None | None | Limited | Add-on | **QR scan, kiosk** | None | None | None | None | None | None | None | Real-time stats; QR util built (no UI) | **NFC/QR kiosk, badge print, offline scan** |
| WhatsApp messaging | None | None | None | None | Push only | Email | Email | None | None | Email-rich | None | None | wa.me link | Manual | **Native wa.me + WABA helper** | **Bulk WABA, template approval, delivery webhooks, A/B** |
| Offline | None | None | None | None | None | None | None | None | None | None | None | None | None | None | **SW + memory queue + IndexedDB partial** | **Background Sync, persistent queue, conflict UI** |
| Multi-language | EN | EN/ES | EN/ES/PT | EN | EN | EN | 50+ | EN | EN | EN | EN | EN | EN | Manual | **HE/EN/AR/RU + ICU plan** | **6+ locales, RTL pair, community pipeline, ICU plurals** |
| Accessibility | Partial | Partial | Partial | Partial | Partial | Partial | Solid | Partial | Partial | Partial | Partial | Partial | Partial | Manual | A11y in CI (axe) | **WCAG 2.2 AA, RTL screen-reader parity, reduced-motion themes** |
| Privacy / data ownership | Vendor lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Self-host | **Self-hosted, OSS, MIT** | **Encrypted at rest, GDPR erasure, exportable archives** |
| Multi-event / planner | One | One | One | One | One | Pro plan | Many | One | One | Multi | UK planners | One | One | Many | **Multi-event namespacing built** | **Org/team workspaces, role-based access, vendor reuse** |
| AI features | Venue match, copy gen | ChatGPT planning | Vendor recs | Site builder AI | None | None | None | None | None | None | None | None | None | None | Prompt-builders ready (no provider) | **Seating CSP, copy gen, photo tag, FAQ bot** |
| Analytics | Basic | Basic | Basic | Minimal | None | Funnels | Solid | None | None | Email opens | UK benchmarks | None | None | None | **Funnel, budget, check-in, dietary** | **Cohort funnel, A/B, vendor SLA, predictive no-shows** |
| Native mobile | iOS+Android | iOS+Android | iOS+Android | iOS+Android | iOS+Android | Web | iOS+Android | iOS+Android | iOS+Android | Web | iOS+Android | iOS+Android | iOS+Android | Web | PWA | **Capacitor wrapper (v15)** |
| Realtime collab | Couple co-edit | None | None | None | None | None | Limited | None | None | None | None | None | None | Yes | Wired (presence service exists) | **Presence indicators, CRDT-style merges, live cursors** |
| Payments | Built-in (Zola Pay) | Registry only | Registry only | Registry only | None | Stripe add-on | Stripe | Stripe | Stripe | Stripe | Stripe (UK) | None | None | Manual | Deep-links (Bit/PayBox/PayPal) | **Stripe Checkout + receipts + vendor payouts** |
| Photos / gallery | Registry only | Registry only | Registry only | Site only | Native | None | None | Premium | Premium | Limited | Yes | Inspiration | None | Manual | Gallery section + util | **Cloudinary/Bunny CDN, face tagging, guest uploads** |
| Open source | No | No | No | No | No | No | No | No | No | No | No | No | No | No | **Yes (MIT)** | **Plugin system, theme marketplace, contributor program** |
| Bundle size (gzip) | ~300 KB | ~400 KB | ~400 KB | ~250 KB | ~200 KB native | ~180 KB | ~250 KB | ~300 KB | ~350 KB | ~200 KB | ~250 KB | ~400 KB | ~200 KB | n/a | **~45 KB** | **Defend ≤ 60 KB hard gate** |

### 2.2 Differentiators we lead on — *defend and double-down*

1. **WhatsApp-native** — no commercial competitor ships this. We move from `wa.me` to **WhatsApp Cloud API** for true bulk send + delivery telemetry + template approval.
2. **RTL-first multi-language (HE + AR)** — no competitor supports RTL. We add a 5th locale (FR) and a community translation pipeline.
3. **Self-hosted + open source** — privacy moat. We publish a one-click deploy template (Vercel / Netlify / Cloudflare).
4. **Multi-event namespacing** — most consumer tools cap at one event; we already support planners natively. We layer org/team mode in v15.
5. **Offline + PWA depth** — adopt **Background Sync API** + Periodic Sync to hit native-app parity. Nobody else ships this.
6. **Bundle size** — at ~45 KB gzip we are 5–10× smaller than every commercial competitor. A hard CI gate at 60 KB defends it.

### 2.3 Capabilities to harvest aggressively

| From | What we steal | Why |
| --- | --- | --- |
| **RSVPify** | Custom RSVP question engine (conditional logic, plus-one chains, multi-language guest-side) | Every other RSVP feature is a strict subset of theirs. |
| **Zola** | DnD seating with relationship constraints + conflict surfacing | Industry-leading UX; our `seating-constraints.js` already has the algorithm. |
| **Joy** | Theme picker with live preview + custom CSS variables exposed to non-developers | Our 5 themes are static; users want to tweak without code. |
| **Eventbrite** | True QR/NFC scan-in on mobile with offline-first verification | Our `qr-code.js` and `nfc.js` services already exist; UI missing. |
| **Stripe-class flows (Zola/Joy)** | Hosted checkout, receipts, webhooks, vendor payouts | Replaces deep-link-only model. |
| **OpenAI/Claude** | Invitation copy, FAQ bot, photo captions, seating suggestions | Our prompt-builders exist; we ship via edge-function BYO key. |
| **Riley & Grey** | Premium typography + animated transitions on the public site | Lifts perceived quality of the wedding website. |
| **Bridebook** | Vendor SLA scoring + budget benchmarks per region | Adds planner-grade analytics. |
| **Lystio (IL)** | Israeli vendor directory model | We don't run a directory; we provide a *catalogue import* UX so couples can fill from any source. |

### 2.4 Technical architecture comparison — stack decisions

> How our technical architecture stacks up against five reference competitors. This determines what we can and cannot build.

| Dimension | **Zola** | **Joy** | **RSVPify** | **PlanningPod** | **Lystio (IL)** | **Ours (v11.3)** | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frontend | React 18 + Next.js SSR | React 18 + Apollo | Vue 3 + Nuxt | Angular 15 | PHP + jQuery (legacy) | Vanilla ES2025 + Vite | **Keep vanilla** — bundle 6× smaller. Add Signals to close the reactivity gap. |
| CSS | CSS Modules + Tailwind | Styled-components | Sass + Bootstrap | Material UI | Bootstrap 3 | `@layer` + nesting + 5 themes | **Keep** — ahead of most. Add `@scope` for isolation. |
| State | Redux Toolkit + RTK Query | Apollo cache | Vuex | NgRx | jQuery globals | Custom Proxy store | **Replace internals** — adopt Preact Signals under stable API. |
| Routing | Next.js file router (SSR) | React Router 6 | Vue Router | Angular Router | PHP routes | Hash router (broken back) | **Replace** — `pushState` + typed route table. |
| Backend | Node.js microservices | GraphQL + AWS Lambda | Rails monolith | .NET + SQL Server | PHP + MySQL | Supabase (Sheets still active) | **Complete migration** — flip to Supabase now. |
| Auth | NextAuth (JWT) | Auth0 | Devise | Custom .NET | PHP sessions | Custom OAuth + LS | **Replace** — Supabase Auth. |
| DB | PostgreSQL + Redis | DynamoDB + RDS | PostgreSQL | SQL Server | MySQL | Supabase Postgres (22 migrations) | **Keep + harden** — RLS assertions in CI. |
| Realtime | Pusher | GraphQL subs | Polling | SignalR | None | Supabase Realtime (idle) | **Activate** — presence + live RSVP. |
| File storage | S3 + CloudFront | S3 | S3-compatible | Azure Blob | Local disk | None | **Add** — Supabase Storage. |
| Search | Elasticsearch | Algolia | pg_trgm | SQL LIKE | LIKE | Client index (`search-index.js`) | **Keep** — wire to Cmd-K palette. |
| Offline | None | None | None | None | None | SW + memory queue | **Upgrade** — IDB + Background Sync. |
| Errors | Datadog | Sentry | Rollbar | Raygun | None | None (adapter ready) | **Activate** — Sentry free tier (~5 KB). |
| Perf | Datadog RUM | Datadog | GA | AppInsights | None | None | **Add** — Web Vitals + LH CI. |
| CI/CD | GHA + Vercel | GHA + AWS CDK | CircleCI + Heroku | Azure DevOps | Manual FTP | 7 GHA workflows (pinned) | **Keep + add** — SBOM, Trivy, Scorecard. |
| Bundle gzip | ~300 KB | ~250 KB | ~180 KB | ~400 KB | ~200 KB | **~45 KB** | **Defend** — hard CI gate. |
| Hosting | Vercel SSR | AWS CloudFront | Heroku | Azure | cPanel | GitHub Pages | **Keep + CDN** — Cloudflare front. |
| Mobile | React Native | iOS + Android | PWA | iOS + Android | iOS + Android | PWA | **Defer** — Capacitor in v15. |
| Secrets | Vercel env | AWS SM | Heroku Config | Azure KV | PHP `.env` | GH Secrets + `inject-config` | **Keep** — add 90-day rotation runbook. |

### 2.5 Lystio (Israel) — local-market benchmark

Lystio is the dominant Israeli wedding platform. Direct comparison:

| Feature | **Lystio** | **Ours** | Gap |
| --- | --- | --- | --- |
| Hebrew UX | Hebrew-only | Hebrew-first + 3 more locales | We win |
| WhatsApp invites | Basic `wa.me` link | Full WABA helper + bulk plan | We win |
| Israeli vendor directory | 5 000+ vendors | CRUD only, no directory | **Gap — we add catalogue import in v14** |
| Payment: Bit / PayBox | None | Deep-link utils built | We win (wire it) |
| Israeli phone format | Yes | `cleanPhone()` 05X → +972 | Parity |
| Offline | None | Yes | We win |
| PWA | None | Yes | We win |
| Tech stack age | PHP + jQuery (legacy) | ES2025 (modern) | We win |
| Pricing | Subscription | Free + self-hosted | We win |

**Opportunity:** a polished Hebrew-first PWA wedding manager with offline, WhatsApp, and self-hosting is a genuine market gap vs. Lystio.

---

## 3. Honest Audit — Every Major Decision Reopened

> Every decision below is reopened, even ones previously labelled "clean". Verdicts: **Keep**, **Adjust**, **Replace**, **Defer**, **Activate**.

### 3.1 Frontend

| Decision | Today | Verdict | Rationale & Action |
| --- | --- | --- | --- |
| Vanilla JS, no framework | 21 sections, manual lifecycle | **Keep + augment** | Bundle and clarity stay strong; add **Preact Signals (~3 KB)** for fine-grained reactivity in dashboards/realtime; do not migrate sections wholesale. |
| Proxy-based store | `core/store.js` deep-watch arrays | **Replace internals** | Replace ad-hoc proxy with **Preact Signals** under stable public API (`storeGet/Set/Subscribe`). Sections don't churn. |
| Section pattern (`mount/unmount`) | 21 modules + 21 templates | **Keep + tighten** | Promote `BaseSection` (already in `core/section-base.js`) to the only allowed pattern; CI assertion via `audit:sections`. |
| Hash router | `core/nav.js`, swipe + shortcuts | **Replace** | Move to `pushState` / `popstate` with hash fallback for old PWAs; typed route table + query params; integrate cross-doc View Transitions. |
| CSS `@layer` + nesting | 7 files | **Keep + scope** | Add **`@scope`** rules per section to prevent global selector creep; tokens stay central. |
| Theming via body classes | 5 themes | **Adjust** | Move to `:root` data-attrs + `light-dark()` + reduced-motion variants; expose theme picker (Joy parity). |
| Templates as static HTML | `src/templates/*.html` lazy via `import.meta.glob` | **Keep** | Add build-time validator that fails on missing `data-i18n` keys (extend `validate-i18n.mjs`). |
| Modals as separate HTML | 7 modals lazy-loaded | **Keep** | Adopt native `<dialog>` fully (with focus trap polyfill where needed). |
| Event delegation `data-action` | `events.js` + `action-registry.js` | **Keep + namespace** | Adopt `guests:save`, `tables:add` syntax (already supported); CI dup-detection. |
| Service Worker | `public/sw.js` + precache | **Adjust** | Strategy-based runtime cache + **Background Sync** for the offline queue; precache from Vite manifest. |
| Bundle target | ~45 KB gzip | **Adjust gates** | Real measurement (`npm run size`); CI gate at ≤ 60 KB total, ≤ 25 KB per route. |

### 3.2 Backend & Data

| Decision | Today | Verdict | Action |
| --- | --- | --- | --- |
| Google Sheets primary | Active write queue + RSVP log; `BACKEND_TYPE = "sheets"` | **Replace (deprecate)** | Sheets becomes import/export only. Single source of truth = Supabase. v12 cutover. |
| Supabase Postgres | 22 migrations, RLS, audit, push subs, multi-event | **Promote to primary** | Already extensive; finish: enforce `event_id` on every query, `supabase db lint` in CI, generate typed client. |
| Auth: custom OAuth + allowlist | Google/FB/Apple + email allowlist | **Replace** | Supabase Auth providers; keep `isApprovedAdmin(email)` admin gate. Removes ~3 SDKs from runtime. |
| LocalStorage primary | `wedding_v1_*` keys | **Replace** | Finish IDB migration via `core/storage.js` + `services/secure-storage.js`; encrypt PII/tokens with AES-GCM. |
| Write queue via Sheets debounce | `enqueueWrite()` 1.5 s | **Keep + extend** | Persist queue entries in IDB so they survive crashes; trigger via Background Sync. |
| RSVP-Log append-only | Sheet tab | **Keep concept; move backend** | Postgres `rsvp_log` table (migration 013 exists); append-only via DB triggers. |
| Multi-event scoping | `event_id` columns + service | **Keep** | Add an `org_id`/team layer for planner mode (one planner, many couples) — v15. |
| Realtime presence | `services/presence.js` + `realtime-presence.js` | **Activate** | UI: who-is-editing badges on Tables and Guests sections. |
| Conflict resolution | `core/conflict-resolver.js` | **Activate** | Wire into store sync; add merge UI for last-write-wins fallback. |
| Edge Functions | Some present | **Expand** | Move WABA proxy, push send, RSVP webhook, GDPR erasure, LLM proxy to edge functions. |

### 3.3 Code, Language & Methods

| Decision | Today | Verdict | Action |
| --- | --- | --- | --- |
| ES2025, pure ESM, no `window.*` | `main.js` entry | **Keep — exemplary** | No change. |
| JS + JSDoc + `types.d.ts` | partial `@ts-check` | **Adjust** | Convert `core/`, `services/`, `handlers/` to **TypeScript strict**. Sections stay `.js` + JSDoc. |
| Validation via Valibot | `sanitize()` schemas | **Keep + complete** | Coverage to every store mutation entry point. |
| Sanitization via DOMPurify | `utils/sanitize.js` | **Keep** | Required and minimal. |
| Runtime deps = 3 | supabase, dompurify, valibot | **Keep** | Add **Preact Signals (3 KB)** if §3.1 store decision lands. Total ≤ 5. |
| Action registry | `core/action-registry.js` | **Keep + namespace** | `guests:save`-style + dev-time duplicate detection. |
| Section handlers | `src/handlers/*` separated from sections | **Keep** | Clean separation; add explicit handler type contracts. |
| Repositories layer | `src/repositories/` exists | **Activate** | Make it the only path to backend reads/writes; ESLint `no-restricted-imports` ban services from sections. `arch-check.mjs` already advisory; flip to strict in v12. |
| Error handling | `services/error-pipeline.js` | **Keep + integrate** | Pipe to Sentry/Glitchtip in production via opt-in. |
| Constants & enums | `core/constants.js`, `domain-enums.js` | **Keep — canonical** | No change. |
| File-naming | kebab-case `.js` | **Keep** | Done. |

### 3.4 Documentation

| Decision | Today | Verdict | Action |
| --- | --- | --- | --- |
| Mermaid in `ARCHITECTURE.md` + ADRs | 12 ADRs, 9+ diagrams | **Keep — strong culture** | CI check that ADRs cover every "Replace" decision in §3. |
| README badges | 8 badges | **Keep + extend** | Add bundle-size badge, Lighthouse badge, OpenSSF Scorecard badge. |
| Per-language Copilot instructions | 7 files | **Keep** | Already strong. |
| `AGENTS.md` + `.agent.md` | 4 agents | **Keep + add** | Add `release-engineer.agent.md` for version bumps + CHANGELOG. |
| `docs/operations/` runbooks | deploy, incident, migrations | **Keep + add** | Add `disaster-recovery.md` (Supabase backup restore drill). |
| Locale guide | `docs/locale-guide.md` | **Keep + screenshot** | Add screenshots per locale. |
| Inline JSDoc | partial | **Adjust** | Require JSDoc on every public function in `core/` + `services/`; CI gate via `eslint-plugin-jsdoc`. |
| Doc volume | ~30 markdown files | **Audit each release** | Diátaxis re-org (tutorial / how-to / reference / explanation); archive items older than 2 minor versions. |
| Doc type & content | Heavy on architecture; light on user-facing | **Adjust** | Add `docs/users/` (couple guide, planner guide, vendor guide). |

### 3.5 Configuration

| Decision | Today | Verdict | Action |
| --- | --- | --- | --- |
| ESLint + Stylelint + HTMLHint + markdownlint + Prettier | `--max-warnings 0` | **Keep — world-class** | No change. |
| Vitest, `pool: forks`, no warnings | 2 385 tests | **Keep + gate** | Coverage gate 80 % lines / 75 % branches. (Already 85/75/85 internally — promote to CI fail.) |
| Playwright E2E | smoke + visual + axe | **Adjust** | Add full RSVP flow, multi-event switch, offline → online sync, full-page a11y per locale. |
| Vite manual chunks | locale-en, public, analytics, gallery | **Adjust** | Remove `manualChunks`; rely on dynamic `import()` in section/modal lazy loaders. |
| `tsconfig.json` ES2022 | currently behind | **Adjust** | Bump `target/lib` to ES2025, `module` to ESNext, extend a shared base. |
| Shared `node_modules` at parent | works | **Keep + document** | Doc loudly in README + `docs/operations/`. |
| `.editorconfig` + Prettier | enforced | **Keep** | No formatter wars. |
| GH Actions matrix | Node 22 + 24 | **Keep + extend** | Add Node 26 when LTS; pin all actions to exact SHA + tag (already done in v11.3.0 for major actions). |
| Dependabot grouped weekly | yes | **Keep** | Add npm + actions + supabase migrations groups. |
| CSP + SRI | enforced | **Keep + extend** | Add **Trusted Types** policy in production; CSP nonce on inline scripts. |
| Version source | package.json + `sync-version.mjs` | **Keep — canonical** | No change. |

### 3.6 Tools & Versions

| Tool | Current | Target | Why |
| --- | --- | --- | --- |
| Node | ≥ 22 | ≥ 22 LTS, 24 + 26 in matrix | LTS alignment |
| npm | 11.x | 11.x | matches Node |
| Vite | 8 | 8 → 9 when stable | fast |
| Vitest | 4 | 4 → 5 | aligned |
| Playwright | 1.59 | latest | a11y + traces |
| ESLint | 10 | 10 (flat config) | modern |
| Stylelint | 17 | 17 | standard |
| Prettier | 3.8 | 3.x latest | format |
| Supabase JS | 2.49 | 2.x latest | client |
| DOMPurify | 3.2 | 3.x latest | sanitiser |
| Valibot | 1.0 | 1.x latest | validator |
| (new) Preact Signals | — | 1.x | reactive store internals |
| (new) `idb-keyval` *or* hand-rolled IDB | — | optional | IDB wrapper |
| (new) `@sentry/browser` (opt-in) | — | 8.x | already adapter-ready in `monitoring.js` |
| (new) `@lhci/cli` | — | latest | Lighthouse CI gate (active in v11.3.0) |

### 3.7 External Sources & APIs

| Integration | Status | Verdict | Action |
| --- | --- | --- | --- |
| Google OAuth (GIS SDK) | active | **Adjust** | Migrate behind Supabase Auth provider. |
| Facebook OAuth (FB SDK) | dynamic load | **Adjust** | Same — Supabase OIDC. Drop FB SDK from runtime. |
| Apple OAuth (AppleID SDK) | dynamic load | **Adjust** | Same — Supabase OIDC. |
| Google Sheets / Apps Script | active | **Deprecate** | Import/export only after Supabase cutover. |
| WhatsApp `wa.me` | active | **Keep + extend** | Add WhatsApp Cloud API via edge function (helper exists in `utils/whatsapp-cloud-api.js`). |
| Web Push (VAPID) | helper exists | **Activate** | Wire end-to-end with edge sender + `push_subscriptions` table (migration 020). |
| Calendar (.ics) | helper exists (`calendar-link.js`) | **Activate** | Surface "Add to Calendar" on RSVP confirmation. |
| Maps | none | **Add** | Embed venue map (OSM or Mapbox free tier) + Waze deep link. |
| Payments | links only (Bit/PayBox/PayPal) | **Add** | Stripe Checkout + receipts via edge function for vendor payouts. |
| LLM provider | none wired | **Add** | OpenAI / Anthropic via edge function; user-supplied key first, BYO key model. |
| Photo CDN | none | **Add** | Supabase Storage + image transformation; consider Cloudinary free tier. |
| Sentry / Glitchtip | adapter ready | **Activate** | Opt-in via `services/error-pipeline.js`. |

### 3.8 Database & Infrastructure

| Concern | Today | Verdict | Action |
| --- | --- | --- | --- |
| Database engine | Supabase (Postgres) | **Keep** | 22 migrations are well-numbered and current. |
| RLS | per-table policies (002, 018) | **Keep + assert** | Add `supabase test db` policy assertions in CI. |
| Soft delete | migrations 009, 015, 017 | **Keep + schedule** | Scheduled hard-delete job for > 90-day soft deletes (GDPR). |
| Audit log | migration 004 | **Keep + surface** | "History" view in Settings. |
| Indexes | pagination 010 | **Adjust** | Add indexes for `event_id`-scoped queries on every hot table. |
| Backups | Supabase managed | **Keep + drill** | Quarterly **restore drill** documented in `docs/operations/disaster-recovery.md`. |
| Hosting | GitHub Pages | **Keep + CDN** | Cloudflare in front for HTTP/3 + image transforms; GH Pages stays canonical. |
| Edge functions | partial | **Expand** | WABA proxy, push sender, GDPR erasure, RSVP webhook, LLM proxy. |
| Monitoring | none in production | **Add** | UptimeRobot (free), Glitchtip (free OSS), Lighthouse CI weekly. |
| Secrets management | GH Secrets + `inject-config` | **Keep + rotate** | Document 90-day rotation cadence. |
| Domain | `rajwanyair.github.io/Wedding` | **Add custom** | Acquire short domain; configure DNS via Cloudflare. |
| Supply-chain | CodeQL on; Dependabot grouped | **Extend** | Add **Trivy** scan, **CycloneDX SBOM**, **OpenSSF Scorecard** workflow. |

---

## 4. Technical Debt & Risk Register

> Prioritised list of concrete blockers and risks as of v11.3.0.
> **P0** = production blocker · **P1** = significant risk · **P2** = maintenance drag · **P3** = future capability gap.
> Likelihood × Impact = Severity.

| Sev | Pri | Area | Debt / Risk | Likelihood | Impact | Effort | Mitigation owner phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **High** | P0 | Backend | `BACKEND_TYPE = "sheets"` still active at v11 — Supabase never flipped as primary | High | Critical (rate limits, no realtime, integrity) | L | v12.0.0 |
| **High** | P0 | Security | Auth tokens in plaintext `localStorage` — any XSS reads sessions (OWASP A02:2021) | Medium | Critical (data breach) | M | v12.0.0 |
| **High** | P0 | Monitoring | Zero production error tracking — failures invisible | High | High (silent data loss) | S | v12.0.0 |
| **High** | P1 | Storage | `localStorage` 5 MB cap, no encryption, no cross-tab sync | High | High (silent quota fail; PII exposed) | M | v12.0.0 |
| **High** | P1 | Router | `replaceState` breaks back button; no query-param deep links | High | Medium (broken UX, no shareable links) | S | v12.0.0 |
| **Med** | P1 | Dead code | 179 dead exports (~20 % of 904) including live-but-unwired features | Certain | Medium (mental model, false coverage) | M | v13.0.0 |
| **Med** | P1 | PWA | Offline write queue lives in memory only — lost on crash | Medium | High (data loss for offline users) | M | v13.0.0 |
| **Med** | P2 | Auth | `ADMIN_EMAILS` array in `config.js` — adding admins requires deploy | High | Low (operational friction) | S | v13.0.0 |
| **Med** | P2 | Auth | OAuth flows bypass Supabase Auth — custom session mgmt | High | Medium (JWT expiry not uniform) | L | v12.0.0 |
| **Med** | P2 | State | Deep Proxy mutations on nested objects silently miss reactivity | Medium | Medium (hard-to-repro UI bugs) | M | v13.0.0 |
| **Med** | P2 | CI | No coverage gate — coverage can drop silently | Medium | Medium (critical paths un-tested after refactor) | S | v12.0.0 |
| **Med** | P2 | CI | Lighthouse CI advisory until v11.3.0 — *now hard-gated* | — | — | done | v11.3.0 ✅ |
| **Med** | P2 | Build | Manual `manualChunks` — breaks on file rename | Medium | Low (build failures) | S | v13.0.0 |
| **Low** | P3 | CSS | No `@scope` — global selectors leak between sections | Low | Low (style conflicts) | M | v13.0.0 |
| **Low** | P3 | Features | QR check-in util built; UI incomplete | Low | Medium (missing day-of feature) | M | v14.0.0 |
| **Low** | P3 | Features | 15+ utilities built with no UI: Push, tour, AI draft, AI seating, PDF, vCard, calendar, command palette, payments, etc. | Certain | High (feature gap; wasted investment) | L | v14.0.0 |
| **Low** | P3 | Realtime | Supabase Realtime wired; never activated | Certain | Medium (missing live co-edit) | M | v14.0.0 |
| **Low** | P3 | Architecture | `BaseSection` class added but not adopted by all 18 sections | Medium | Medium (lifecycle bugs; sub leaks) | L | v13.0.0 |
| **Low** | P4 | Mobile | PWA only — no app-store distribution | Low | Low (limited reach) | XL | v15.0.0 |
| **Low** | P4 | API | No public REST API — closed ecosystem | Low | Low | XL | v16.0.0 |
| **Low** | P4 | Supply-chain | No SBOM, no Trivy scan, no Scorecard | Medium | Medium (CVE exposure unmonitored) | S | v13.0.0 |

### 4.1 Risks of *not* acting

- **Sheets rate-limit failure under realistic guest count.** A 300-guest wedding generating concurrent
  RSVPs will exceed Apps Script quotas; the queue retries silently and users see "saved" while nothing
  persists. Sentry would catch this; today it's invisible.
- **PII leak via XSS.** A single `innerHTML` slip + plaintext session = full account takeover.
  Trusted Types + AES-GCM encryption removes this class of risk.
- **Bundle size regression.** Without a CI gate, a single `import lodash from "lodash"` could quadruple our bundle overnight. The 60 KB gate prevents it.
- **Doc rot.** Without a relevance sweep per release, ADRs accumulate and conflict; new contributors lose orientation. Diátaxis re-org + archive policy fixes this.

---

## 5. Improve / Rewrite / Refactor / Enhance

> Concrete, actionable backlog grouped by impact. Items are not duplicated across categories.

### 5.1 Improve (low risk, high payoff)

1. **Bundle-size & Lighthouse badges** in README; CI publishes JSON reports.
2. **JSDoc completeness pass** in `src/core/` + `src/services/`; gate via `eslint-plugin-jsdoc`.
3. **Coverage gate** at 80 % lines / 75 % branches in CI (already 85/75/85 internally).
4. **RTL Playwright a11y suite** (axe-core full scan per locale, every section).
5. **`release-engineer.agent.md`** to automate version bumps + CHANGELOG.
6. **Diátaxis re-org of `docs/`** — archive items older than 2 minor versions.
7. **OpenSSF Scorecard + SBOM (CycloneDX) + Trivy scan** as a weekly workflow.
8. **README badges:** OpenSSF Scorecard, bundle gzip size, Lighthouse perf/a11y.
9. **`docs/operations/disaster-recovery.md`** — Supabase backup restore drill.
10. **Locale screenshots** in `docs/locale-guide.md` (per-locale per-section).

### 5.2 Rewrite (worth the disruption)

1. **Auth subsystem** — drop direct Google/FB/Apple SDKs; route OAuth through Supabase Auth; keep `isApprovedAdmin` gate. Removes ~30 KB and three moving parts.
2. **Storage layer** — finish IDB migration; encrypt session+PII via AES-GCM (`secure-storage.js` exists); persist offline queue; deprecate direct `wedding_v1_*` reads.
3. **Router** — `pushState` + typed route table + query params + cross-doc View Transitions (`route-table.js` ready).
4. **Service Worker** — strategy-based runtime cache + Background Sync; precache from Vite manifest.
5. **Sheets sync layer** — replace runtime sync with one-shot import/export utilities; remove `services/sheets.js` from hot path.

### 5.3 Refactor (code health)

1. **Repositories layer enforcement** — every backend call routes through `src/repositories/`;
   ESLint-ban service imports from sections via `no-restricted-imports`.
   (`arch-check.mjs` advisory; flip to strict.)
2. **TypeScript migration** — `src/core/` + `src/services/` + `src/handlers/` to `.ts` strict. Sections stay `.js` + JSDoc to preserve velocity.
3. **Service-directory dedup** — `src/services/` has overlapping helpers (`share.js` vs `share-service.js`, `audit.js` vs `audit-pipeline.js`, `sheets.js` vs `sheets-impl.js`). Consolidate.
4. **Action namespacing** — adopt `guests:save`, `tables:add` everywhere;
   CI duplicate-detection.
5. **Store internals to Signals** — replace recursive Proxy with Preact Signals; keep public API stable.
6. **`BaseSection` adoption** — migrate all 18 sections; add `audit:sections` strict mode.

### 5.4 Enhance (new capability)

1. **WhatsApp Cloud API** end-to-end — template approval, delivery webhooks, A/B tests.
2. **Web Push** end-to-end — VAPID keys, edge sender, opt-in UI.
3. **AI seating suggestions** — CSP solver on existing `seating-constraints.js` + LLM reasoning fallback.
4. **AI message drafts** — invitation copy, FAQ bot via OpenAI/Anthropic edge function (BYO key).
5. **Public guest-facing wedding website builder** — theme picker, custom domain, password protection.
6. **QR/NFC kiosk mode** for event-day check-in.
7. **Stripe Checkout** — vendor payments + receipts via edge function.
8. **Calendar `.ics` + Google Calendar OAuth sync** — per-event invites.
9. **Photo gallery** — Supabase Storage + guest uploads + signed URLs.
10. **Cmd-K command palette** — already wired to client search index.
11. **Plugin / extension surface** — third-party themes + integrations via `plugin.json` manifest.
12. **Two new locales (FR, ES)** via community pipeline; total 6.
13. **Org / team mode** — wedding-planner workspaces with role-based access.
14. **Public REST API** — Supabase PostgREST + API key UI + webhook subscriptions.

---

## 6. Phased Plan v12 → v16

> Versioning: **Active = current**, **Next = committed scope**, **Later = candidate scope**. Every phase boundary is a decision-review checkpoint with an ADR per "Replace" decision.

### Phase A — v12.0.0 *Backend Convergence + P0 Fixes* — *✅ Shipped 2026-04-27*

**Goal:** make Supabase the **single** authoritative backend, fix all P0 security issues, repair the router.

| # | Workstream | Deliverable | Exit Condition |
| --- | --- | --- | --- |
| A1 | Supabase primary | Repositories layer becomes the only write path; Sheets sync removed from hot path | `BACKEND_TYPE = "supabase"` everywhere; zero Sheets calls at runtime |
| A2 | Error tracking | Sentry-compatible (or Glitchtip) wired in `services/monitoring.js` | Production errors visible in dashboard; PII scrubbed |
| A3 | Auth token encryption | Web Crypto AES-GCM in `services/secure-storage.js` (exists); migrate plaintext sessions | No raw JWT or email in `localStorage` |
| A4 | Auth migration | Switch to Supabase Auth (Google/FB/Apple) — drop runtime SDKs | FB SDK + AppleID SDK removed from runtime; `auth.js` calls `supabase.auth.*` |
| A5 | Storage upgrade | Finish IDB cutover; encrypt tokens + PII; persistent offline queue | `idb-store.js` is the only storage path for guest/table/vendor/expense data |
| A6 | Router | `pushState` + typed routes + query params; back-button + deep-link parity | Browser back button works; `?id=<guestId>` opens guest modal directly |
| A7 | Edge functions | WABA proxy, push send, GDPR erasure, RSVP webhook | No API keys exposed in client bundle |
| A8 | Tests | Supabase integration tests in CI; full RSVP + offline E2E | CI: zero failing tests with `BACKEND_TYPE=supabase` |
| A9 | Coverage gate | CI fails below 80 % lines / 75 % branches | `vitest --coverage` enforced |

**Phase OKR:** *zero plaintext credentials in production; one canonical backend; one observable error stream; one router that respects the back button.*

### Phase B — v13.0.0 *DX, Type Safety, Architecture Cleanup* — *Next*

| # | Workstream | Deliverable | Exit Condition |
| --- | --- | --- | --- |
| B1 | `BaseSection` adoption | All 18 sections extend `BaseSection` | No leaked subscriptions; `audit:sections --strict` passes |
| B2 | TypeScript | `core/`, `services/`, `handlers/` → `.ts` strict | `tsc --noEmit` exits 0; sections stay `.js` + JSDoc |
| B3 | Store internals | Preact Signals under stable `storeGet/Set/Subscribe` API | Nested mutations fire reactivity; no external API change |
| B4 | SW rewrite | Strategy-based runtime cache + Background Sync | Offline write queue survives crash; syncs on reconnect |
| B5 | Dead-export purge | `audit:dead` runs in CI; remove or wire every dead export | Dead exports < 5 % |
| B6 | Test infra | Coverage gate 80 %; LH-CI per PR; axe full audit per locale | CI fails below thresholds |
| B7 | `@scope` CSS | Section-level `@scope` blocks | No cross-section style bleed; all 5 themes pass |
| B8 | Auto code splitting | Remove `manualChunks`; rely on dynamic `import()` | Vite builds without manual config |
| B9 | Repositories enforcement | `arch-check.mjs --strict` in CI; ESLint `no-restricted-imports` | Sections cannot import services directly |
| B10 | Supply-chain | SBOM (CycloneDX), Trivy weekly, OpenSSF Scorecard | Workflows green; badges in README |

> **v12.2.0 progress**: B2 tsc baseline 244→209 (35 errors fixed with JSDoc types); B9 arch violations 15→3 (12 sections redirected via `core/sync.js` bridge, CI `--baseline=3`). `audit:i18n-coverage --enforce --baseline=0` added to CI.
> **v12.3.0 progress**: B1 `audit:section-lifecycle` advisory script added to CI; B2 tsc baseline 209→184 (-25 type errors fixed); B9 ESLint `no-restricted-imports` blocks static section→service imports; dead-export baseline 193→192.
> **v12.4.0 progress**: B2 tsc baseline 184→160 (-24 errors fixed); B6 coverage gate recalibrated (83 new tests, thresholds aligned to actuals); B5 dead-export baseline stabilised at 201; A1 `audit:supabase` migration quality script added.
> **v12.5.0 progress**: B7 `@scope` CSS per-section isolation (4 scope blocks);
> B4 SW IndexedDB Background Sync queue (`rsvp-sync` + `write-sync`);
> B1 `audit:sections --strict` template gate in CI;
> B10 unified `security.yml` workflow (npm audit moderate+, dep-diff, security scan, gate job);
> A3 `crypto.js` → `secure-storage.js` wiring (encryptField/decryptField, backward-compat envelope).
> **v12.5.1 patch**: accessibility (for= labels, aria-labels), CSS -webkit-user-select prefix, TS strict fixes in analytics.js, CI action version pins corrected, htmlhintrc cleaned, scripts/lib deduplication, shared tooling updated.

**Phase OKR:** *strict TS in core; strict architecture; strict supply-chain; no dead code; signals everywhere internally.*

### Phase C — v14.0.0 *Smart & Native-Class* — *Later*

| # | Workstream | Deliverable |
| --- | --- | --- |
| C1 | Wire dormant utilities | Connect 15+ built-but-unwired utils to UI (table below) |

> **v12.2.0 progress (C1)**: 3/15 utilities wired — `seating-constraints.js` → Tables; `expense-analytics.js` → Expenses; `budget-tracker.js` → Budget.
> **v12.3.0 progress (C1)**: 7/15 utilities wired — additionally: `invitation-analytics.js` → Analytics funnel; `vcard.js` + `payment-link.js` → Vendors; `seating-exporter.js` → Tables export CSV/JSON.
> **v12.4.0 progress (C1)**: 12/15 utilities wired — additionally: `rsvp-analytics.js` → Analytics RSVP funnel;
> `vendor-analytics.js` → Vendors overdue banner; `budget-burndown.js` → Budget burndown card;
> `changelog-parser.js` → Dashboard What's New; `event-schedule.js` → Timeline run-of-show countdown.
> **v12.5.0 progress (C1)**: 15/15+ utilities wired — additionally: Print Guest QR Badges;
> `message-personalizer.js` → WhatsApp variable chips;
> `notification-preferences.js` → Settings panel;
> `pdf-export.js` → Guests + Tables "Export PDF" buttons.
| C2 | AI | Seating CSP solver UI + invitation copy via edge LLM proxy (BYO key) |
| C3 | WhatsApp | Cloud API end-to-end; template approval; delivery webhooks; A/B tests |
| C4 | Realtime | Presence badges, live cursors, conflict-resolver wired in UI |
| C5 | Native PWA | Background Sync, Periodic Sync, Web Push opt-in, Badging, Share Target |
| C6 | Payments | Stripe Checkout + receipts for vendor payouts; Bit/PayBox deep links surfaced |
| C7 | Photos | Supabase Storage + guest uploads + on-the-fly transforms |
| C8 | QR check-in | Event-day kiosk mode; per-guest QR codes; offline scan-and-confirm |
| C9 | Maps | Venue map (OSM/Mapbox free) + Waze deep link |
| C10 | Calendar sync | Google Calendar OAuth + per-guest `.ics` |

**Wire existing utilities to UI** — already built; just need a UI connection:

| Utility | Where to wire | UI element |
| --- | --- | --- |
| `qr-code.js` | Check-in section | "Print QR" button + event-day kiosk view |
| `push-manager.js` | Settings → Notifications | Web Push opt-in toggle |
| `tour-guide.js` | Dashboard (first-run) | Onboarding wizard overlay |
| `ai-draft.js` | WhatsApp section | "✨ Draft with AI" button + tone picker |
| `seating-ai.js` | Tables section | "✨ Auto-assign" button + diff view |
| `guest-relationships.js` | Tables section | Conflict highlights on seating chart |
| `pdf-layout.js` | Guests + Tables | "Export to PDF" button |
| `search-index.js` | Nav (Ctrl-K) | Command palette modal |
| `whatsapp-cloud-api.js` | WhatsApp section | Bulk send via Business API |
| `notification-builder.js` | Dashboard | In-app notification centre |
| `event-schedule.js` | Timeline section | Run-of-show editor |
| `changelog-parser.js` | Dashboard | "What's New" modal on version bump |
| `rsvp-analytics.js` | Analytics section | 6-stage funnel chart |
| `budget-burndown.js` | Budget section | Burn-down area chart |
| `vendor-analytics.js` | Vendors section | Payment timeline chart |
| `message-personalizer.js` | WhatsApp + Invitation | Template variables live preview |
| `calendar-link.js` | RSVP confirmation | "Add to Calendar" button |
| `vcard.js` | Vendors section | "Download contact" per vendor |
| `payment-link.js` | Vendors section | Bit / PayBox / PayPal buttons |
| `seating-exporter.js` | Tables section | Export seating chart to CSV/JSON |

**Phase OKR:** *every utility shipped is reachable from UI; AI is opt-in and BYO-key; payments and check-in are production-ready.*

### Phase D — v15.0.0 *Platform & Scale* — *Later*

| # | Workstream | Deliverable |
| --- | --- | --- |
| D1 | Org / team mode | Planner workspaces; roles (`owner / co-planner / photographer / vendor / guest`); vendor reuse |
| D2 | Public website builder | Theme picker, live preview, custom domain via CNAME, password protection |
| D3 | Plugin surface | Theme + integration plugin API; `plugin.json` manifest |
| D4 | Locales | FR + ES community-contributed; total 6 locales; ICU plurals |
| D5 | Custom domain + CDN | Cloudflare in front; HTTP/3; Brotli; image transforms |
| D6 | Observability | Glitchtip + UptimeRobot + Lighthouse-CI weekly cron |
| D7 | Capacitor wrapper | iOS + Android app-store distribution; native NFC, haptics, share sheet |

### Phase E — v16.0.0 *Open Platform* — *Candidate*

| # | Workstream | Deliverable |
| --- | --- | --- |
| E1 | Public REST API | Supabase PostgREST + API key management UI + webhook subscriptions |
| E2 | Vendor catalogue import | CSV/JSON import of any vendor list (no directory of our own) |
| E3 | One-click deploy templates | Vercel + Netlify + Cloudflare + Render |
| E4 | Theme marketplace | Community-submitted themes via plugin manifest |
| E5 | WebAuthn passkeys | Replace email allowlist with passkey-bound admin role |

---

## 7. Migration Playbooks (concrete code)

### 7.1 Sheets → Supabase cutover (Phase A1)

**Step 1 — flip the switch (single line):**

```js
// src/core/config.js
export const BACKEND_TYPE = "supabase"; // was "sheets"
```

**Step 2 — repositories become the *only* write path:**

```js
// src/repositories/guests.js
import { backend } from "../services/backend.js";
import { sanitize, GuestSchema } from "../utils/sanitize.js";

export async function saveGuest(input) {
  const { value, errors } = sanitize(input, GuestSchema);
  if (errors) throw new ValidationError(errors);
  return backend.upsert("guests", value); // backend.js dispatches by BACKEND_TYPE
}
```

**Step 3 — schema alignment migration:**

```sql
-- supabase/migrations/023_canonical_schema_alignment.sql
ALTER TABLE guests ADD COLUMN IF NOT EXISTS accessibility_needs text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS responded_at timestamptz;
CREATE INDEX IF NOT EXISTS guests_event_id_idx ON guests (event_id);
CREATE INDEX IF NOT EXISTS guests_phone_idx ON guests (phone);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event owner read" ON guests FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
CREATE POLICY "event owner write" ON guests FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
```

**Step 4 — Sheets becomes import/export only.** `services/sheets.js` is removed from runtime imports; one-shot CLI scripts in `scripts/` handle migration of legacy data.

### 7.2 Hash → `pushState` router (Phase A6)

```js
// src/core/nav.js
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

// Hash fallback for installed PWAs from previous versions
if (location.hash && !location.search) {
  const [section, qs] = location.hash.slice(1).split("?");
  navigateTo(section, Object.fromEntries(new URLSearchParams(qs)));
}
```

### 7.3 Plaintext → encrypted storage (Phase A3)

```js
// src/services/secure-storage.js  (already shipped in v11.1.0; activate)
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
  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getDerivedKey(),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  await idbSet(STORAGE_PREFIX + key, { v: 1, iv: [...iv], ct: [...new Uint8Array(enc)] });
}
```

### 7.4 Custom Proxy → Preact Signals (Phase B3)

```js
// src/core/store.js — internals only; public API unchanged
import { signal, effect } from "@preact/signals-core";

const _store = new Map(); // key → signal

export function storeGet(key) { return _store.get(key)?.value ?? defaults[key]; }
export function storeSet(key, value) {
  if (!_store.has(key)) _store.set(key, signal(value));
  else _store.get(key).value = structuredClone(value);
  persist(key, value);
}
export function storeSubscribe(key, fn) {
  return effect(() => fn(_store.get(key)?.value));
}
```

### 7.5 Sentry-compatible monitoring (Phase A2)

```js
// src/services/monitoring.js  (already shipped; activate via VITE_SENTRY_DSN)
export async function initMonitoring() {
  if (!import.meta.env.VITE_SENTRY_DSN) return; // local dev / tests opt-out
  const Sentry = await import("@sentry/browser");
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.05,           // 5 % — stay on free tier
    beforeSend: scrubPii,             // strip phone, email, JWT
    integrations: [Sentry.browserTracingIntegration({ tracingOrigins: [/supabase\.co/] })],
  });
}
```

---

## 8. Success Metrics & SLOs

| Metric | v11.3 (today) | v12 target | v13 target | v14+ target | SLO |
| --- | --- | --- | --- | --- | --- |
| Lighthouse Performance | ~85 (est.) | ≥ 95 | ≥ 95 | ≥ 95 | ≥ 90 mobile |
| Lighthouse Accessibility | ~90 (est.) | ≥ 95 | 100 | 100 | 100 |
| Lighthouse Best-Practices | ~95 | 100 | 100 | 100 | 100 |
| Lighthouse SEO | ~90 | ≥ 95 | 100 | 100 | ≥ 95 |
| Bundle gzip total | ~45 KB est. | ≤ 60 KB | ≤ 60 KB | ≤ 80 KB w/ AI | hard CI gate |
| Per-route gzip | unmetered | ≤ 25 KB | ≤ 25 KB | ≤ 25 KB | hard CI gate |
| Test count | 2 385 | 2 800+ | 3 200+ | 3 500+ | — |
| Line coverage | 85 % thresholds | ≥ 80 % CI gate | ≥ 85 % | ≥ 85 % | ≥ 80 % |
| Branch coverage | 75 % thresholds | ≥ 75 % CI gate | ≥ 80 % | ≥ 80 % | ≥ 75 % |
| Dead exports | 20 % | < 5 % | < 3 % | < 3 % | < 5 % |
| Time-to-Interactive (4G) | ~1.5 s est. | < 1 s | < 1 s | < 1 s | < 1.5 s |
| LCP (mobile, 4G) | unmetered | < 2.5 s | < 2.0 s | < 1.8 s | < 2.5 s |
| INP (p75) | unmetered | < 200 ms | < 150 ms | < 100 ms | < 200 ms |
| CLS | unmetered | < 0.05 | < 0.05 | < 0.05 | < 0.1 |
| Offline RSVP | partial | full + persistent queue | + Background Sync | + conflict UI | persistent across crash |
| Concurrent editors | 1 | 2+ realtime | 5+ realtime | 10+ realtime | — |
| Locales | 4 | 4 | 5 | 6 | — |
| Supported auth providers | 4 + anon | 4 + anon (via Supabase) | + magic link | + passkeys | — |
| Monitoring | none | error pipeline opt-in | + Glitchtip + uptime | + RUM | error rate < 0.1 % sessions |
| Production error rate | unmeasured | < 0.5 % | < 0.2 % | < 0.1 % | < 0.5 % |
| OpenSSF Scorecard | not run | ≥ 7 | ≥ 8 | ≥ 9 | ≥ 7 |
| Secret rotation cadence | manual | 90 d | 90 d | 90 d | ≤ 90 d |
| Backup restore drill | never | quarterly | quarterly | quarterly | ≤ 90 d |

---

## 9. Open Decisions Register

These remain explicitly **open** for review at each phase boundary; defaults below are current working assumptions.

| # | Open question | Working default | Trigger to revisit |
| --- | --- | --- | --- |
| O1 | Adopt Preact (not just signals)? | No — signals only | Section count > 25 or duplicated render logic in 5+ places |
| O2 | TypeScript across all sections? | No (core/services/handlers only) | When section sprawl harms refactor speed |
| O3 | Capacitor for native shells? | Defer to v15 | When PWA install rate < 30 % of MAU |
| O4 | Self-hosted Supabase? | No (managed) | Privacy demand from enterprise planners |
| O5 | Tailwind / utility CSS? | No (CSS `@layer` + tokens) | If theme picker adoption is slow |
| O6 | Cloudflare Pages as primary? | Mirror, not primary | If GH Pages cache TTL becomes a blocker |
| O7 | Replace Vitest with Node test runner? | No | If Vitest 5 destabilises |
| O8 | CRDTs (Yjs / Automerge)? | No (last-write-wins + merge UI) | Realtime conflict reports > 1 % of writes |
| O9 | Vendor directory? | No — *catalogue import* model only | Demand from Israeli market beats Lystio gap |
| O10 | Plugin sandboxing? | iframe + postMessage | When third-party plugins ship |
| O11 | Native HTTP server (Deno/Bun) for edge? | No (Supabase Edge) | If function cold starts > 500 ms |
| O12 | Adopt View Transitions API now? | Yes (progressive enhancement) | Already supported in evergreens |

---

## 10. Working Principles (renewed)

1. **Ship working software** over aspirational prose.
2. **Best-in-class is a sum of small disciplines** — every PR meets the gates: lint 0, tests 0 fail, axe 0 violations, Lighthouse ≥ 95, bundle ≤ 60 KB, security scan 0 findings.
3. **One canonical source per concern** — version, constants, defaults, locale, schema, route table, action registry.
4. **Security & data ownership beat convenience** — encrypt everything sensitive, exportable on demand, deletable on request.
5. **Offline & RTL are first-class** — every feature works in Hebrew, on a flaky 3G, and offline.
6. **Minimal dependencies, maximum native platform** — every `npm install` justifies its size, security, and maintenance cost.
7. **Open by default** — OSS licence, ADR-driven decisions, public roadmap, public CHANGELOG, public Scorecard.
8. **Reopen every decision at every phase** — no decision is permanent. Every "Replace" verdict requires a new ADR in `docs/adr/`.
9. **Wire what you build** — a feature without UI is technical debt, not a feature.
10. **Defend the bundle** — the 5–10× lead vs. competitors is a moat; protect it with a CI gate.

---

## 11. Release Line

| Version | Focus | Status |
| --- | --- | --- |
| v8.x – v10.x | Foundation, security, dead-code purge, multi-event, Supabase wiring | **Done** |
| v11.0.0 | Production cleanup, dead utils purge, handler test consolidation | Done |
| v11.1.0 | Phase A foundation: monitoring adapter, secure storage, BaseSection, route-table, calendar-link, action namespacing, LH-CI advisory | Done |
| v11.2.0 | Quality + tooling consolidation: Prettier, format gate, ARCHITECTURE diagrams, footprint reduction | Done |
| v11.3.0 | Production hardening: pinned actions, Lighthouse hard gate, htmlhint config consolidation, prettier in shared tooling | Done |
| v12.0.0 | Backend convergence — Supabase primary, Sheets deprecated, IDB + encryption, router, edge functions, Sentry on, coverage gate | Done |
| v12.1.0 | CI quality bar round 2 — coverage floors lifted; `audit:storage-prefix` + `audit:tsc` gates at baseline | Done |
| **v12.2.0** | Architecture bridge, C1 wiring (3/15 utilities), i18n coverage audit, tsc 244→209 | **Done** |
| v13.0.0 | DX & type safety — TS strict in core, signals internals, SW rewrite, dead-export purge, BaseSection across all sections, supply-chain hardening | **Next** |
| v14.0.0 | Smart features — AI seating + copy, WABA, realtime presence, Stripe, photos, QR kiosk, calendar sync, maps | Later |
| v15.0.0 | Platform & scale — org/team mode, public site builder, plugins, FR + ES, Cloudflare CDN, Capacitor wrapper | Later |
| v16.0.0 | Open platform — public REST API, vendor catalogue import, one-click deploy, theme marketplace, WebAuthn passkeys | Candidate |

---

*Last updated: 2026-05-06 · v12.2.0 · Living document — re-audit §3, §4 and §9 at every phase boundary. Every "Replace" or "Adjust" decision requires a new ADR in [docs/adr/](docs/adr/).*

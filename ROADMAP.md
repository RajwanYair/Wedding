# Wedding Manager — Roadmap v12.5.2

> Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · History: [CHANGELOG.md](CHANGELOG.md) ·
> Contributors: [CONTRIBUTING.md](CONTRIBUTING.md) · ADRs: [docs/adr/](docs/adr/)

This document is a **deep first-principles re-evaluation** of every significant decision made in this
project — including the ones previously labelled "clean" or "done". Every layer is audited from scratch:
frontend stack, backend, language, docs, architecture, configuration, tools, external APIs, database,
and infrastructure. The goal is to build, ship, and defend a **best-in-class Hebrew-first RTL wedding
management application** — open-source, offline-capable, WhatsApp-native, and privacy-respecting.

Previous roadmap items still relevant are consolidated below. Nothing has been silently dropped.

## Contents

0. [North Star & Current State](#0-north-star--current-state)
1. [First-Principles Rethink — If We Built Today](#1-first-principles-rethink)
2. [Competitive Landscape & Harvest Matrix](#2-competitive-landscape--harvest-matrix)
3. [Honest Audit — Every Major Decision Reopened](#3-honest-audit--every-major-decision-reopened)
4. [Technical Debt & Risk Register](#4-technical-debt--risk-register)
5. [Improve / Rewrite / Refactor / Enhance](#5-improve--rewrite--refactor--enhance)
6. [Phased Plan v13 → v17](#6-phased-plan-v13--v17)
7. [Migration Playbooks](#7-migration-playbooks)
8. [Success Metrics & SLOs](#8-success-metrics--slos)
9. [Open Decisions Register](#9-open-decisions-register)
10. [Working Principles](#10-working-principles)
11. [Release Line](#11-release-line)

---

## 0. North Star & Current State

### Actual state — v12.5.2 · 2026-04-27

| Metric | Value | Health |
| --- | --- | --- |
| Tests | **2 509 passing · 155 files · 0 Node warnings** | ✅ |
| Lint | 0 errors · 0 warnings | ✅ |
| Sections | 19 section modules · 18 templates · 8 modals | ✅ |
| Services | **62 files** (~3× the healthy max) | ⚠ consolidation needed |
| Repositories | 11 repository files | ✅ |
| Handlers | 6 handler files | ✅ |
| Locales shipped | **2 (HE primary, EN)** — AR/RU not yet complete | ⚠ |
| DB migrations | 22 Supabase migrations | ✅ |
| Active backend | `BACKEND_TYPE = "sheets"` — **Supabase not yet primary** | ❌ P0 |
| Auth tokens | Plaintext in `localStorage` | ❌ P0 |
| Bundle | ~45 KB gzip · hard CI gate ≤ 60 KB | ✅ |
| Node version | 25.9.0 — **non-LTS, no security patches** | ⚠ |
| Deploy | GitHub Pages · <https://rajwanyair.github.io/Wedding> | ✅ |

### North Star

*The fastest, most accessible, RTL-native, offline-first, open-source wedding manager on the web.
Self-hostable in one click. Privately operable on flaky 3G in Hebrew. Integrated end-to-end with
WhatsApp. With planner-grade analytics and AI assistance. At a bundle 5–10× smaller than every
commercial competitor.*

### Top 5 priorities right now

1. **Flip Supabase as the only runtime backend.** `BACKEND_TYPE = "supabase"`. Sheets becomes import/export only. This is the longest-standing deferred decision in the project — over three major version cycles.
2. **Encrypt every credential and PII at rest.** Web Crypto AES-GCM via `secure-storage.js`. No raw JWTs or emails in `localStorage`.
3. **Fix the router.** `pushState` + typed route table + query params. The browser back button is broken and deep links do not work.
4. **Reduce service sprawl.** 62 service files is ~3× healthy maximum. Consolidate duplicates; enforce repositories layer as the only data path.
5. **Wire every dormant utility to a UI.** Every built-but-dark helper is wasted investment and inflates coverage metrics without adding real quality.

**Quality bar (every PR):**
lint 0 · tests 0 fail · axe 0 violations · Lighthouse ≥ 95 · bundle ≤ 60 KB gzip · `npm run audit:security` 0 findings.

---

## 1. First-Principles Rethink

> Pretend the repo is blank. It is 2026. We are building a Hebrew-first RTL wedding manager for a
> 300-guest event with an ~$0/month budget, offline-capable, WhatsApp-native, and open-source.
> What would we choose — and how does that compare to what we have?

| Layer | Build-from-zero choice (2026) | Current reality | Verdict | Action |
| --- | --- | --- | --- | --- |
| **UI runtime** | Vanilla ES2025 + Preact Signals for fine-grained reactivity. No framework. | Vanilla ES2025 + custom Proxy store. No Signals. | **Keep direction; upgrade internals** | Adopt Preact Signals (~3 KB) under the existing `storeGet/Set/Subscribe` API. |
| **Build tool** | Vite 8 + ESM + automatic code-splitting via dynamic `import()`. | Vite 8 with `manualChunks` that breaks on rename. | **Keep tool; remove manual config** | Drop `manualChunks`; rely on dynamic `import()` in lazy loaders. |
| **CSS** | `@layer` + nesting + `@scope` + container queries + `light-dark()` + `color-mix()`. Tokens on `:root`. | `@layer` + nesting + 5 `body.theme-*` classes. No `@scope`. | **Keep + extend** | Add `@scope` per section; container queries on dashboard cards; CSS `light-dark()` theming. |
| **UI primitives** | Native `<dialog>` + Popover API + Anchor Positioning. Web Components for cross-cutting widgets. | Div-based modal system; 8 separate HTML modal files. | **Migrate** | Convert to native `<dialog>`; Popover API for dropdowns/tooltips. |
| **Routing** | `history.pushState` + typed route table + query params + View Transitions API. | Hash router; `replaceState` breaks back button; no query params. | **Replace** | §7.2 playbook. |
| **State** | Preact Signals (3 KB). Public `storeGet/Set/Subscribe` API unchanged. | Custom recursive Proxy; nested mutations silently miss reactivity. | **Replace internals** | §7.4 playbook. |
| **Storage** | IndexedDB primary; Web Crypto AES-256-GCM for PII; persistent offline queue. | `localStorage` primary; plaintext sessions; in-memory queue lost on crash. | **Replace** | §7.3 playbook. |
| **Backend** | Supabase Postgres + RLS + edge functions. Single source of truth. | Sheets still active (`BACKEND_TYPE = "sheets"`); Supabase wired but never primary. | **Flip now** | §7.1 playbook. |
| **Auth** | Supabase Auth (Google + Apple OIDC) + magic link + WebAuthn passkeys for admin. | 3 independent SDKs (GIS + FB + AppleID) + plaintext `localStorage` session. | **Replace** | Route all OAuth through Supabase Auth; drop the 3 SDKs. |
| **Code language** | TypeScript strict in `core/`, `services/`, `handlers/`. `.js` + JSDoc in `sections/`. | JS + JSDoc + partial `types.d.ts` with `checkJs`. | **Migrate incrementally** | Phase B. |
| **Validation** | Valibot at every store mutation and external input boundary. | Valibot at most boundaries; some handlers uncovered. | **Complete** | 100 % boundary coverage in Phase B. |
| **i18n** | ICU MessageFormat (plurals, gender, select). 4+ locales. RTL pair tested in CI. | Flat JSON key/value. 2 locales shipped (HE, EN). | **Add ICU + complete AR** | Phase C. |
| **Offline** | SW strategy caches + Background Sync API + Periodic Sync + Push API. | SW + precache + in-memory write queue (not persisted). | **Upgrade** | IDB queue + Background Sync in Phase B. |
| **Services count** | ≤ 20 service files with clear single-responsibility. | 62 service files with duplicate pairs. | **Consolidate** | Reduce to ≤ 25 in Phase A; ≤ 20 by Phase B. |
| **Tests** | Vitest unit/integration + Playwright E2E + axe full-page + LH-CI hard gate + visual regression. | Vitest 2 509 + Playwright smoke + visual + axe. LH hard gate since v11.3. | **Keep + tighten** | Coverage gate 80 %; full RSVP + offline + a11y per locale E2E. |
| **Node version** | Node 22 LTS in dev + 24 LTS in CI matrix. Never non-LTS in production. | Node 25.9.0 (non-LTS). | **Switch to 22 LTS** | Update `.nvmrc`, `package.json engines`, CI matrix. Immediate. |
| **Hosting** | GH Pages canonical + Cloudflare proxy (HTTP/3, Brotli, image transforms). | GH Pages only; no CDN. | **Add Cloudflare** | Phase D. |
| **AI** | Edge-function proxy; BYO API key; OpenAI + Anthropic + local Ollama. | Prompt-builders built; no provider wired. | **Add in Phase C** | BYO key first; edge function proxy. |
| **Payments** | Stripe Checkout + receipts via edge function. Regional deep-links retained. | Bit/PayBox/PayPal deep-link utils only. | **Add in Phase C** | Stripe edge function. |
| **Photos** | Supabase Storage + on-the-fly transforms; guest uploads via signed URL. | Gallery section with no storage backend. | **Add in Phase C** | Supabase Storage. |
| **Monitoring** | Sentry/Glitchtip (opt-in) + Web Vitals + UptimeRobot + LH-CI weekly. | Sentry-compatible adapter ready; nothing wired in production. | **Activate** | Phase A. |
| **Mobile** | PWA with full install; Capacitor for App Store / Play Store. | PWA only. | **Defer to Phase D** | Only after PWA install-rate data. |
| **Docs** | Diátaxis (tutorial / how-to / reference / explanation). ADR per Replace decision. | 12 ADRs, 5 agents, runbooks, locale guide. Strong culture. | **Keep + re-org** | Diátaxis structure in Phase B; archive stale items. |

**Net verdict:** the project's *direction* is exactly right — vanilla ES2025, RTL-first, offline-capable,
minimal deps, Supabase, PWA. The *execution gaps* are concentrated in five deferrable-no-longer systems:
active backend, auth integration, storage layer, router, and service sprawl. Fixing those five unlocks
every capability that follows.

---

## 2. Competitive Landscape & Harvest Matrix

### 2.1 Feature comparison — 14 products

| Capability | **Zola** | **Joy** | **RSVPify** | **Eventbrite** | **Appy Couple** | **Bridebook** | **Riley & Grey** | **PlanningPod** | **Greenvelope** | **Minted** | **Lystio (IL)** | **Withjoy** | **Aisle Planner** | **Notion (DIY)** | **Ours v12.5** | Next target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guest + RSVP | CRM, address book, +1 logic | Group RSVP | **Best-in-class forms** | Ticket-style | Travel + meals | Supplier-led | Boutique | Full CRM | Email-rich | Gallery | Basic HE | Modern | Pro planner | Manual | Phone-first, WhatsApp, multi-event | Conditional RSVP chains, custom Q engine |
| Seating chart | DnD, shapes, conflict | DnD | Add-on | None | None | DnD | None | DnD + floor plan | None | None | None | None | Floor plan + furniture | None | DnD, round/rect, capacity, conflict detection | AI suggestions, relationship-aware CSP solver |
| Budget & expenses | Vendor + payments | Simple | None | None | None | UK benchmarks | None | **Best-in-class** | None | None | None | None | Full budgeting | Manual | Category tracking, payment-rate, variance | Burn-down chart, cash-flow forecast, SLA alerts |
| Vendor management | Marketplace + pay | List | None | None | List | UK dir 3 000+ | Premium curated | **Full CRM + contracts** | Curated | Curated | 5 000+ IL | List | Best-in-class | None | CRUD + payment tracking + WhatsApp | Inbox, contracts, e-sign, payouts |
| Wedding website | 100+ themes, custom domain | Modern + AI builder | Form only | None | App-style | Themes | **Premium typography** | None | Email-card | Premium | None | Modern | Limited | Manual | 5 themes, RTL, PWA | Live theme picker, custom domain, password |
| Event-day check-in | None | None | Add-on | **QR + kiosk + NFC** | Limited | None | None | None | None | None | None | None | None | None | Real-time stats; QR util built, no UI | NFC/QR kiosk, badge print, offline scan |
| WhatsApp messaging | None | None | None | None | Push only | None | None | None | None | None | wa.me link | None | None | Manual | **Native wa.me + WABA helper** | Cloud API: bulk send, delivery webhooks, A/B |
| Offline support | None | None | None | None | None | None | None | None | None | None | None | None | None | None | **SW + memory queue + IDB partial** | Background Sync, persistent queue, conflict UI |
| Multi-language | EN | EN | EN | 50+ | EN | EN | EN | EN | EN | EN | **HE** | EN | EN | Manual | **HE + EN (AR/RU planned)** | 4+ with ICU plurals |
| Accessibility | Partial | Partial | Partial | Solid | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Manual | WCAG 2.2 axe in CI | WCAG 2.2 AA · RTL screen-reader parity |
| Privacy / self-hosting | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Lock-in | Self-host | **OSS · MIT · self-hosted** | Encrypted at rest, GDPR erasure, one-click deploy |
| Multi-event / planner | One | One | Pro plan | Many | One | UK planners | One | **Best-in-class** | Multi | One | One | One | Best-in-class | Many | Multi-event namespacing built | Org/team/planner workspaces |
| AI features | Venue match + copy gen | Site builder AI | None | None | None | None | None | None | None | None | None | None | None | Manual | Prompt-builders ready, no provider wired | Seating CSP, copy gen, FAQ bot, photo tagging |
| Analytics | Basic | Minimal | Funnels | Solid | None | UK benchmarks | None | Best-in-class | Email opens | None | None | None | Full analytics | None | **Funnel + budget + check-in + dietary** | Cohort funnel, A/B, predictive no-shows |
| Native mobile | iOS + Android | iOS + Android | Web | iOS + Android | iOS + Android | iOS + Android | iOS + Android | iOS + Android | Web | iOS + Android | iOS + Android | iOS + Android | iOS + Android | Web | **PWA** | Capacitor (Phase D) |
| Realtime collaboration | None | None | None | Limited | None | None | None | None | None | None | None | None | None | Yes | Wired but idle | Presence badges, live RSVP counter |
| Payments | Zola Pay | Registry | Stripe add-on | Stripe | None | Stripe (UK) | Stripe | Stripe | Stripe | Stripe | None | Registry | Stripe | Manual | Deep-links only | Stripe Checkout + vendor receipts |
| Open source | No | No | No | No | No | No | No | No | No | No | No | No | No | No | **Yes (MIT)** | Plugin system, theme marketplace |
| Bundle size (gzip) | ~300 KB | ~250 KB | ~180 KB | ~250 KB | ~200 KB | ~250 KB | ~300 KB | ~400 KB | ~200 KB | ~350 KB | ~200 KB | ~250 KB | ~350 KB | n/a | **~45 KB** | Hard gate ≤ 60 KB |

### 2.2 Our unique advantages — defend and double-down

| Advantage | Why it is a moat | Investment |
| --- | --- | --- |
| **WhatsApp-native** | No commercial competitor ships this | Upgrade from `wa.me` to WhatsApp Cloud API for bulk send + delivery telemetry + template approval |
| **RTL-first (Hebrew + Arabic)** | No competitor supports RTL at this depth | Complete AR locale; add FR via community pipeline |
| **Self-hosted + MIT** | Privacy moat; enterprises can deploy internally | One-click Vercel/Cloudflare/Netlify deploy templates in Phase D |
| **Offline + Background Sync** | No competitor ships offline write capabilities | Phase B SW rewrite with IDB queue + Periodic Sync |
| **Bundle ≤ 60 KB** | 5–10× smaller than every commercial competitor | Hard CI gate; `@scope` isolation; Signals instead of framework |
| **Multi-event planner model** | Most consumer tools cap at one event | Extend to org/team/planner mode in Phase D |
| **Open source** | Forkable, auditable, community-buildable | Plugin surface + theme marketplace in Phase E |

### 2.3 Capabilities to harvest — concrete sources

| From | What to steal | Why we want it |
| --- | --- | --- |
| **RSVPify** | Conditional RSVP question engine — plus-one chains, dietary, custom Q, branching logic | Best RSVP forms in the category. Our phone-first RSVP is shallow on question depth. |
| **Zola** | DnD seating with relationship constraints + visual conflict surfacing | Our `seating-constraints.js` + `guest-relationships.js` already have the algorithm. UI is missing. |
| **Joy** | Live theme picker — CSS variable sliders, no code required | Our 5 themes are static `body.theme-*` switches. Users want to tweak without a deploy. |
| **Eventbrite** | QR/NFC scan-in with offline-first verification + badge print | Our `qr-code.js` and `nfc.js` already exist. UI is missing. |
| **PlanningPod** | Vendor CRM with inbox, contracts, payment timeline, SLA tracking | Our vendor section is CRUD-only. PlanningPod defines planner-grade. |
| **Aisle Planner** | Full venue floor-plan builder with furniture, head table, dance floor | Extends our DnD seating chart to a venue layout system. |
| **Stripe-class flows** | Hosted checkout, receipts, webhooks, vendor payouts | Replaces deep-link-only model; removes payment friction for vendors. |
| **Riley & Grey** | Premium animated page transitions + typography system | Lifts perceived quality of the public wedding website without framework overhead. |
| **Bridebook** | Vendor SLA scoring + regional budget benchmarks | Adds planner-grade analytics that no other competitor combines with RTL + WhatsApp. |
| **OpenAI / Claude 2026** | Invitation copy, seating suggestions, FAQ bot, RSVP field extraction from photos | Our prompt-builders exist; edge-function proxy removes API key exposure. |

### 2.4 Technical stack comparison

| Dimension | **Zola** | **Joy** | **RSVPify** | **PlanningPod** | **Lystio (IL)** | **Ours v12.5** | 2026 verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frontend | React 18 + Next.js SSR | React 18 + Apollo | Vue 3 + Nuxt | Angular 15 | PHP + jQuery | Vanilla ES2025 + Vite 8 | **Keep vanilla** — bundle 6× smaller; Signals closes reactivity gap |
| CSS | CSS Modules + Tailwind | Styled-components | Sass + Bootstrap | Material UI | Bootstrap 3 | `@layer` + nesting | **Ahead** — add `@scope` + container queries |
| State | Redux Toolkit + RTK Query | Apollo cache | Vuex | NgRx | jQuery globals | Custom Proxy store | **Replace internals** with Preact Signals |
| Routing | Next.js file router (SSR) | React Router 6 | Vue Router | Angular Router | PHP routes | Hash router (broken back) | **Replace** with pushState + typed routes |
| Backend | Node microservices | GraphQL + Lambda | Rails monolith | .NET + SQL Server | PHP + MySQL | Supabase (Sheets still active) | **Complete cutover** |
| Auth | NextAuth (JWT) | Auth0 | Devise | Custom .NET | PHP sessions | 3 OAuth SDKs + custom LS session | **Replace** with Supabase Auth |
| DB | PostgreSQL + Redis | DynamoDB + RDS | PostgreSQL | SQL Server | MySQL | Supabase Postgres (22 migrations) | **Keep + harden** — RLS assertions in CI |
| Realtime | Pusher | GraphQL subs | Polling | SignalR | None | Supabase Realtime (wired, idle) | **Activate** — presence + live RSVP counter |
| File storage | S3 + CloudFront | S3 | S3-compatible | Azure Blob | Local disk | None wired | **Add** — Supabase Storage |
| Offline | None | None | None | None | None | SW + memory queue | **Upgrade** — IDB + Background Sync |
| Errors | Datadog | Sentry | Rollbar | Raygun | None | None (adapter ready) | **Activate** — Sentry/Glitchtip free tier |
| CI/CD | GHA + Vercel | GHA + AWS CDK | CircleCI + Heroku | Azure DevOps | Manual FTP | 7 GHA workflows (pinned) | **Keep + add** SBOM + Trivy + Scorecard |
| Bundle gzip | ~300 KB | ~250 KB | ~180 KB | ~400 KB | ~200 KB | **~45 KB** | **Defend** — hard CI gate at 60 KB |
| Hosting | Vercel SSR | AWS CloudFront | Heroku | Azure | cPanel | GitHub Pages | **Add CDN** — Cloudflare proxy |
| Mobile | React Native | iOS + Android native | PWA | iOS + Android | iOS + Android | PWA | **Defer** — Capacitor in Phase D |

### 2.5 Lystio (Israel) — local-market direct benchmark

| Feature | **Lystio** | **Ours** | Position |
| --- | --- | --- | --- |
| Hebrew UX | Hebrew-only | Hebrew-first + EN planned AR/RU | We lead |
| WhatsApp invites | Basic `wa.me` link | Full WABA helper + Cloud API plan | We lead |
| Israeli vendor directory | 5 000+ vendors | CRUD only, no directory | Gap — catalogue import in Phase C |
| Payments: Bit / PayBox | None | Deep-link utils built | We lead (wire it) |
| Israeli phone format (`05X → +972`) | Yes | `cleanPhone()` handles this | Parity |
| Offline support | None | Yes (SW + IDB plan) | We lead |
| PWA / installable | None | Yes | We lead |
| Tech stack age | PHP + jQuery (legacy) | ES2025 (modern) | We lead |
| Pricing | Subscription | Free + self-hosted | We lead |
| Open source | No | Yes (MIT) | We lead |

---

## 3. Honest Audit — Every Major Decision Reopened

### 3.1 Frontend decisions

| Decision | Today | Verdict | Rationale + Action |
| --- | --- | --- | --- |
| Vanilla JS, no framework | 19 sections, manual lifecycle | **Keep + augment** | Bundle and clarity stay strong. Add Preact Signals (~3 KB) for dashboards + realtime. Do not migrate sections. |
| Custom Proxy store | `core/store.js` deep-watch | **Replace internals** | Proxy nested mutations silently miss reactivity. Adopt Preact Signals under stable `storeGet/Set/Subscribe` — zero external API change. |
| Section `mount/unmount` pattern | 19 modules + 18 templates | **Keep + enforce** | `BaseSection` exists; all 19 sections must extend it. `audit:sections --strict` in CI. |
| Hash router | `core/nav.js` | **Replace** | `pushState` + `popstate` + typed route table + query params + View Transitions API. Hash fallback for already-installed PWAs. |
| Vite `manualChunks` | 4 manual entries | **Remove** | Rely on dynamic `import()` in lazy loaders. Removes build fragility on file rename. |
| CSS `@layer` + nesting | 7 files | **Keep + scope** | Add `@scope` per section. Container queries on dashboard cards. `light-dark()` for system theme. |
| 5 themes via `body.theme-*` | Static class switches | **Extend** | Move to `:root` data-attrs + `color-mix()` + live CSS variable picker (Joy-parity). |
| Modal HTML files (8) | Div-based, lazy-loaded | **Migrate to `<dialog>`** | Native `<dialog>` + `showModal()`. Removes focus-trap polyfill dep. Better accessibility. |
| `data-action` event delegation | `events.js` + `action-registry.js` | **Keep + namespace** | Adopt `module:action` syntax (e.g. `guests:save`) everywhere; CI dup-detection. |
| Service Worker | `public/sw.js` + precache | **Rewrite** | Strategy-based runtime cache + Background Sync + precache from Vite manifest. |
| Node version | 25.9.0 (non-LTS) | **Switch to 22 LTS** | Non-LTS receives no security patches. Update `.nvmrc`, `package.json engines`, CI matrix. Immediate. |

### 3.2 Backend and data decisions

| Decision | Today | Verdict | Action |
| --- | --- | --- | --- |
| Google Sheets as primary backend | `BACKEND_TYPE = "sheets"` | **Flip — P0** | The single most consequential deferred decision. Phase A1. Sheets quota fails under concurrent RSVP load. |
| Supabase Postgres | 22 migrations, RLS, audit, push | **Promote to primary** | `supabase db lint` in CI; `event_id` indexes on every hot table; generated typed client. |
| Auth: 3 independent OAuth SDKs | GIS + FB + AppleID at runtime | **Replace** | Supabase Auth handles Google + Apple + magic link. Drops ~30 KB and three moving parts. Keep `isApprovedAdmin` gate. |
| `localStorage` primary store | `wedding_v1_*` keys | **Replace** | IDB cutover via `core/storage.js`; AES-GCM encryption for PII/tokens via `secure-storage.js`. |
| In-memory write queue | `enqueueWrite()` 1.5 s debounce | **Persist** | IDB queue + Background Sync; survives page crash; retries on reconnect. |
| 62 service files | ~3× healthy maximum | **Consolidate** | Merge all duplicate pairs (`sheets.js/sheets-impl.js`, `audit.js/audit-pipeline.js`, `share.js/share-service.js`). Target ≤ 25. |
| Admin emails in `config.js` | `ADMIN_EMAILS` array | **Move to Supabase** | `admin_users` table + RLS. Adding a co-planner no longer requires a deploy. |
| Realtime presence | `services/presence.js` wired but idle | **Activate** | Who-is-editing badges on Tables + Guests. Phase C. |
| Conflict resolver | `core/conflict-resolver.js` built | **Activate** | Wire into store sync; surface merge UI for last-write-wins fallback. |
| Edge functions | Partial | **Expand** | WABA proxy, push sender, GDPR erasure, RSVP webhook, LLM proxy — never expose API keys in the client bundle. |

### 3.3 Language and code quality decisions

| Decision | Today | Verdict | Action |
| --- | --- | --- | --- |
| ES2025, pure ESM, no `window.*` | `src/main.js` entry | **Keep — exemplary** | No change. |
| JS + JSDoc + `types.d.ts` | Partial `@ts-check` | **Migrate `core/`, `services/`, `handlers/` to TS strict** | Sections stay `.js` + JSDoc to preserve velocity. |
| Valibot validation | Most boundaries | **Complete** | 100 % of store mutations and every external input. |
| DOMPurify sanitize | `utils/sanitize.js` | **Keep** | Required and minimal. |
| Runtime deps: 3 | supabase, dompurify, valibot | **Keep ≤ 5** | Add Preact Signals (3 KB). Total ≤ 5 runtime deps. |
| Repositories layer | `src/repositories/` (11 files) | **Enforce as only data path** | ESLint `no-restricted-imports`; `arch-check.mjs --strict` in CI. |
| Section handlers separated | `src/handlers/` (6 files) | **Keep** | Clean separation; add handler type contracts in Phase B. |
| Constants + enums centralised | `core/constants.js`, `domain-enums.js` | **Keep — canonical** | No change. |
| Action namespacing | Mixed styles | **Namespace uniformly** | `guests:save`, `tables:add` everywhere; CI dup-detection script. |

### 3.4 Documentation decisions

| Decision | Today | Verdict | Action |
| --- | --- | --- | --- |
| 12 ADRs | Strong culture | **Keep + mandate** | Every "Replace" decision in this ROADMAP requires a new ADR before implementation. |
| Copilot instructions + agents | 7 instruction files, 5 agents | **Keep + extend** | Agents for RSVP flow, seating, and vendor management. |
| Mermaid diagrams | `ARCHITECTURE.md` | **Keep** | Add sequence diagram for RSVP flow; add `mermaid-validate` check in CI. |
| Inline JSDoc | Partial | **Gate** | `eslint-plugin-jsdoc` on all public functions in `core/` + `services/`. |
| User-facing docs | None | **Add** | `docs/users/` — couple guide, planner guide, vendor guide, self-hosting guide. |
| Doc volume | ~30 markdown files | **Audit per release** | Diátaxis re-org (tutorial / how-to / reference / explanation); archive items older than 2 minor versions. |

### 3.5 Configuration and tooling

| Tool / Setting | Current | Target | Decision |
| --- | --- | --- | --- |
| Node | 25.9.0 (non-LTS) | **22 LTS** | Switch dev + CI immediately. `.nvmrc` + `engines` field. |
| Vite | 8 | 8 → 9 when stable | Monitor; no forced upgrade. |
| Vitest | 4 | 4 | Keep; add coverage gate. |
| Playwright | latest | latest | Add full RSVP + offline + multi-event + a11y per locale flows. |
| ESLint | 10 flat config | 10 | Add `no-restricted-imports` for arch enforcement. |
| TypeScript | `checkJs` strict | Incremental `.ts` migration | `core/` + `services/` first, then `handlers/`. |
| Preact Signals | not installed | 1.x (~3 KB) | Add when store internals are replaced. |
| Sentry browser | not wired | 8.x (opt-in DSN) | Wire in Phase A. |
| Coverage gate | advisory | **80 % lines / 75 % branches enforced** | `vitest --coverage` in CI fails below threshold. |
| `manualChunks` | active | **Remove** | Dynamic `import()` only; no manual config. |
| CSP + SRI | enforced | **Add Trusted Types** | Production `trustedTypes` policy; nonce on inline scripts. |
| `supabase db lint` | not in CI | **Add** | Phase A — catches RLS gaps and missing indexes. |

### 3.6 External APIs and services

| Integration | Status | Verdict | Action |
| --- | --- | --- | --- |
| Google OAuth (GIS SDK) | Active at runtime | **Migrate** | Supabase Auth Google provider. Drop GIS SDK. |
| Facebook OAuth (FB SDK) | Dynamic load | **Migrate** | Supabase Auth. Drop FB SDK entirely — low adoption, high complexity. |
| Apple OAuth (AppleID SDK) | Dynamic load | **Migrate** | Supabase Auth. Drop AppleID SDK. |
| Google Sheets | Runtime primary | **Demote to import/export** | One-shot scripts in `scripts/`; never in the hot path. |
| WhatsApp `wa.me` | Active | **Extend** | WhatsApp Cloud API via edge function. Template approval, delivery webhooks, A/B. |
| Web Push (VAPID) | Helper exists | **Activate** | Edge sender + `push_subscriptions` table (migration 020 exists). |
| Calendar `.ics` | Helper exists (`calendar-link.js`) | **Activate** | "Add to Calendar" on RSVP confirmation. |
| Maps | None | **Add** | OpenStreetMap embed + Waze deep link. Free; zero runtime dependency. |
| Payments | Deep links only | **Add Stripe** | Edge function; hosted checkout; vendor receipt emails. |
| LLM (OpenAI / Claude / Ollama) | Prompt-builders built | **Wire** | Edge function proxy; BYO API key; no key in bundle. |
| Photo CDN | None | **Add** | Supabase Storage + image transforms. Guest uploads via signed URL. |
| Sentry / Glitchtip | Adapter ready | **Activate** | Opt-in via env var DSN; PII scrubbed at source. |
| UptimeRobot | None | **Add** | Free tier; monitor GH Pages + Supabase edge function health. |

### 3.7 Database and infrastructure

| Area | Today | Verdict | Action |
| --- | --- | --- | --- |
| Postgres + RLS | 22 migrations | **Keep + harden** | `supabase test db` assertions in CI; `event_id` composite indexes on every hot table. |
| Soft delete | Migrations 009, 015, 017 | **Keep + schedule** | Supabase cron job: hard-delete records soft-deleted > 90 days (GDPR compliance). |
| Audit log | Migration 004 | **Surface** | "History" view in Settings section — show guest/RSVP change log. |
| Backups | Supabase managed | **Drill quarterly** | Document restore drill in `docs/operations/disaster-recovery.md`. |
| GH Pages hosting | Active | **Keep + CDN** | Cloudflare proxy for HTTP/3 + Brotli + image transforms. Phase D. |
| Custom domain | `github.io/Wedding` | **Acquire** | Short domain via Cloudflare registrar; CNAME to GH Pages. Phase D. |
| Secrets management | GH Secrets + `inject-config` | **Keep + rotate** | 90-day rotation runbook in `docs/operations/`. |
| Supply chain | CodeQL on, Dependabot grouped | **Extend** | CycloneDX SBOM + Trivy weekly + OpenSSF Scorecard badge. Phase B. |
| Edge functions | Partial | **Expand** | WABA proxy, push sender, GDPR erasure, RSVP webhook, LLM proxy. |

---

## 4. Technical Debt & Risk Register

> **P0** = production blocker · **P1** = significant risk · **P2** = maintenance drag · **P3** = future capability gap
> Severity = Likelihood × Impact

| Sev | Pri | Area | Debt / Risk | Likelihood | Impact | Effort | Target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **High** | P0 | Backend | `BACKEND_TYPE = "sheets"` still active. Sheets quotas fail under concurrent RSVP load. Failures are silent without monitoring. | High | Critical | L | v13.0 |
| **High** | P0 | Security | Auth tokens in plaintext `localStorage` — any XSS reads sessions (OWASP A02:2021). | Medium | Critical | M | v13.0 |
| **High** | P0 | Monitoring | Zero production error tracking — failures are invisible. | High | High | S | v13.0 |
| **High** | P1 | Services | 62 service files — ~3× healthy max; duplicate pairs cause confusion and inflate dead-export count. | Certain | Medium | M | v13.0 |
| **High** | P1 | Storage | `localStorage` 5 MB cap, no encryption, no cross-tab sync, no crash recovery. | High | High | M | v13.0 |
| **High** | P1 | Router | `replaceState` breaks browser back button. No query-param deep links. No View Transitions. | High | Medium | S | v13.0 |
| **Med** | P1 | Node | Node 25.9.0 is non-LTS — receives no security patches after 6 months from release. | Certain | Medium | XS | Immediate |
| **Med** | P2 | Auth | Three independent OAuth SDKs in runtime bundle (~30 KB combined); non-uniform JWT expiry; bypasses Supabase Auth. | High | Medium | L | v13.0 |
| **Med** | P2 | PWA | In-memory write queue lost on crash. Offline user data loss silently possible. | Medium | High | M | v13.0 |
| **Med** | P2 | State | Proxy deep mutations silently miss reactivity; hard-to-repro UI state bugs. | Medium | Medium | M | v13.0 |
| **Med** | P2 | CI | No coverage gate — coverage can drop silently across refactors. | Certain | Medium | S | v13.0 |
| **Med** | P2 | Build | `manualChunks` breaks build on file rename. | Medium | Low | S | v13.0 |
| **Med** | P2 | Admin | `ADMIN_EMAILS` in `config.js` — adding a co-planner requires a full deploy. | High | Low | S | v13.0 |
| **Med** | P2 | i18n | AR locale stub only; RU not started; ICU plurals absent; singular/plural forms hardcoded. | Certain | Medium | L | v14–v15 |
| **Low** | P3 | CSS | No `@scope` — global selectors can leak between sections and break under theme changes. | Low | Low | M | v14.0 |
| **Low** | P3 | Modals | 8 div-based modal HTML files; focus trap polyfill is an external dep. Native `<dialog>` eliminates both. | Low | Low | M | v14.0 |
| **Low** | P3 | Arch | `BaseSection` exists but not all 19 sections extend it — subscription leaks possible. | Medium | Medium | M | v14.0 |
| **Low** | P3 | Unwired | 15+ utilities with no UI: QR, Web Push, AI draft, AI seating, PDF, vCard, calendar, Cmd-K, Stripe, notification centre, etc. | Certain | High | L | v15.0 |
| **Low** | P3 | Realtime | Supabase Realtime wired but never activated in any UI. | Certain | Medium | M | v15.0 |
| **Low** | P4 | Supply-chain | No SBOM, no Trivy scan, no OpenSSF Scorecard badge. | Medium | Medium | S | v14.0 |
| **Low** | P4 | Mobile | PWA only — no App Store or Play Store listing. | Low | Low | XL | v16.0 |
| **Low** | P4 | API | No public REST API — closed ecosystem. | Low | Low | XL | v17.0 |

### 4.1 Risk of continued deferral

- **Sheets quota failure:** A 300-guest wedding with concurrent RSVPs will exceed Apps Script quotas.
  The in-memory queue retries silently and users see "saved" while nothing persists. Sentry would catch this; today it is invisible.
- **PII leak via XSS:** A single `innerHTML` slip + plaintext session token = full account takeover.
  Trusted Types + AES-GCM encryption eliminates this entire risk class.
- **Non-LTS Node in dev:** Security vulnerabilities in Node 25 will not receive patches. A single `npm audit` on v22 LTS would catch issues that v25 silently ignores.
- **Service sprawl compounds:** Every new developer interaction with 62 service files adds confusion and creates more dead exports. The baseline grows unless actively reversed.
- **Bundle regression:** Without a hard CI gate, a single `import lodash from "lodash"` could quadruple bundle size overnight. The 60 KB gate exists; every bypass is a risk.

---

## 5. Improve / Rewrite / Refactor / Enhance

### 5.1 Improve — low disruption, high payoff

1. **Switch Node to 22 LTS** — `.nvmrc`, `package.json engines`, CI matrix. 30-minute task. Do this week.
2. **Coverage gate 80 % / 75 %** — `vitest --coverage` enforced in CI. Single config change.
3. **Move `ADMIN_EMAILS` to `admin_users` Supabase table** — RLS + Settings UI. No more deploy to add co-planner.
4. **Activate Sentry/Glitchtip** — opt-in DSN env var; wire into `services/monitoring.js`. One afternoon.
5. **JSDoc gate** — `eslint-plugin-jsdoc` on all public functions in `core/` + `services/`.
6. **OpenSSF Scorecard + SBOM (CycloneDX) + Trivy** — weekly workflow; three new README badges.
7. **Diátaxis re-org of `docs/`** — tutorial / how-to / reference / explanation split; archive stale items.
8. **`docs/operations/disaster-recovery.md`** — Supabase backup restore drill.
9. **Locale screenshots** — per-locale per-section in `docs/locale-guide.md`.
10. **Dependency rotation runbook** — 90-day secrets rotation cadence in `docs/operations/`.

### 5.2 Rewrite — worth the disruption

1. **Auth subsystem** — drop GIS/FB/AppleID SDKs; route all OAuth through Supabase Auth. Removes ~30 KB and three moving parts. `isApprovedAdmin` gate stays.
2. **Storage layer** — complete IDB migration via `core/storage.js`; encrypt PII/tokens with AES-GCM (`secure-storage.js` already exists). Persist offline queue. Deprecate all direct `wedding_v1_*` `localStorage` reads.
3. **Router** — `pushState` + typed route table + query params + cross-doc View Transitions (`route-table.js` scaffolded).
4. **Service Worker** — strategy-based runtime cache + Background Sync + precache from Vite manifest. Remove memory-only queue.
5. **Sheets sync layer** — demote to import/export scripts; remove from hot path; flip `BACKEND_TYPE = "supabase"`.
6. **Service consolidation** — reduce 62 files to ≤ 25. Merge all duplicate pairs; eliminate orphan helpers.

### 5.3 Refactor — code health

1. **Repositories-layer enforcement** — every backend call through `src/repositories/`; `no-restricted-imports` in ESLint; `arch-check.mjs --strict` in CI.
2. **TypeScript migration** — `src/core/` + `src/services/` + `src/handlers/` → `.ts` strict. Sections remain `.js` + JSDoc.
3. **`BaseSection` adoption** — all 19 sections extend it; `audit:sections --strict` in CI.
4. **Store internals → Preact Signals** — replace Proxy with Signals; public API unchanged; nested mutations fire reliably.
5. **Remove `manualChunks`** — dynamic `import()` in lazy loaders; Vite auto-splits.
6. **Modal system → native `<dialog>`** — convert all 8 modals; remove focus-trap polyfill.
7. **Action namespacing** — `module:action` everywhere; CI dup-detection.
8. **`@scope` CSS** — per-section scope blocks; eliminate cross-section style bleed.

### 5.4 Enhance — new capabilities (grouped by priority)

| Priority | Feature | Section / Entry Point | Utility already built |
| --- | --- | --- | --- |
| **High** | QR / NFC event-day kiosk | Check-in section | `qr-code.js`, `nfc.js` |
| **High** | WhatsApp Cloud API end-to-end | WhatsApp section | `whatsapp-cloud-api.js` |
| **High** | Cmd-K command palette | Nav (Ctrl+K) | `search-index.js` |
| **High** | Web Push opt-in | Settings → Notifications | `push-manager.js` |
| **High** | "Add to Calendar" | RSVP confirmation | `calendar-link.js` |
| **High** | AI seating — CSP solver + UI | Tables section | `seating-constraints.js`, `seating-ai.js` |
| **High** | AI message drafts + tone picker | WhatsApp + Invitations | `ai-draft.js` |
| **Med** | PDF export (guests + seating) | Guests, Tables | `pdf-layout.js`, `pdf-export.js` |
| **Med** | Venue map + Waze deep link | New section / ceremony details | none (OSM embed, zero dep) |
| **Med** | Stripe Checkout | Vendors section | `payment-link.js` (partial) |
| **Med** | Photo gallery + guest uploads | Gallery section | Supabase Storage (needs wiring) |
| **Med** | Onboarding wizard (first-run) | Dashboard | `tour-guide.js` |
| **Med** | Realtime presence badges | Tables + Guests sections | `presence.js`, `realtime-presence.js` |
| **Med** | In-app notification centre | Nav / Dashboard | `notification-builder.js` |
| **Low** | Vendor contact vCard download | Vendors section | `vcard.js` |
| **Low** | Seating chart export (CSV/JSON) | Tables section | `seating-exporter.js` |
| **Low** | Live theme picker (CSS var sliders) | Settings | none (CSS vars easy to expose) |
| **Low** | Guest relationship editor | Tables section | `guest-relationships.js` |
| **Low** | Budget burn-down chart | Budget section | `budget-burndown.js` |
| **Low** | Vendor payment timeline chart | Vendors section | `vendor-analytics.js` |
| **Low** | Message personalizer live preview | WhatsApp | `message-personalizer.js` |
| **Low** | RSVP funnel chart | Analytics section | `rsvp-analytics.js` |
| **Low** | Run-of-show timeline editor | Timeline section | `event-schedule.js` |
| **Low** | What's New modal on version bump | Dashboard | `changelog-parser.js` |
| **Phase D** | Public wedding website builder | New section | none |
| **Phase D** | Plugin / extension surface | Settings | none |
| **Phase D** | FR + ES community locales | i18n | AR/RU stubs |
| **Phase D** | Org / team / planner mode | New section | multi-event namespacing built |
| **Phase E** | Capacitor native app (iOS + Android) | Build pipeline | none |

---

## 6. Phased Plan v13 → v17

> Each phase ends with a decision-review checkpoint. Every "Replace" decision requires an ADR written
> before implementation begins. Each phase ships with a Git tag.

### Phase A — v13.0.0 — *Backend Convergence + P0 Security*

**Goal:** Supabase is the single authoritative backend. Auth tokens never touch `localStorage` in plaintext. The back button works. Production errors are visible.

| # | Workstream | Deliverable | Exit Condition |
| --- | --- | --- | --- |
| A1 | Supabase primary | `BACKEND_TYPE = "supabase"` everywhere; Sheets removed from hot path | Zero Sheets calls at runtime; repositories layer is the only write path |
| A2 | Admin table | `admin_users` table + RLS; Settings UI to add/remove admins | Admin change requires zero deploys |
| A3 | Auth migration | Supabase Auth for Google + Apple; drop GIS/FB/AppleID SDKs | Three SDKs removed from bundle; `supabase.auth.*` everywhere |
| A4 | Storage encryption | AES-GCM via `secure-storage.js`; IDB migration complete | No raw JWT or email in `localStorage` |
| A5 | Router | `pushState` + typed routes + query params + View Transitions | Back button works; `?guestId=X` opens guest modal directly |
| A6 | Edge functions | WABA proxy, push sender, GDPR erasure, RSVP webhook | Zero API keys in client bundle |
| A7 | Monitoring | Sentry/Glitchtip wired in `monitoring.js`; opt-in DSN config | Production errors visible; PII scrubbed at source |
| A8 | Node version | Switch to 22 LTS; `.nvmrc`, `engines`, CI matrix | `node --version` on dev = `v22.*`; CI green on 22 + 24 |
| A9 | Coverage gate | CI fails below 80 % lines / 75 % branches | `vitest --coverage` enforced |
| A10 | Service consolidation (start) | Duplicate service pairs merged; ≤ 40 service files | `audit:services` passes |

**Phase OKR:** *Zero plaintext credentials · One canonical backend · Visible error stream · Back button works · Node on LTS.*

---

### Phase B — v14.0.0 — *DX, Type Safety, Architecture Cleanup*

| # | Workstream | Deliverable | Exit Condition |
| --- | --- | --- | --- |
| B1 | Service consolidation (finish) | ≤ 25 service files; all duplicate pairs merged | `audit:services` count ≤ 25 |
| B2 | TypeScript migration | `core/`, `services/`, `handlers/` → `.ts` strict | `tsc --noEmit` exits 0; sections stay `.js` + JSDoc |
| B3 | BaseSection adoption | All 19 sections extend `BaseSection` | `audit:sections --strict` passes; no subscription leaks |
| B4 | Store internals → Preact Signals | Signals under stable `storeGet/Set/Subscribe` API | Nested mutations fire reactivity; zero external API change |
| B5 | SW rewrite | Strategy cache + Background Sync; IDB offline queue | Queue survives crash; syncs on reconnect |
| B6 | Dead-export purge | `audit:dead` in CI; every dead export wired or removed | Dead exports ≤ 5 % |
| B7 | `@scope` CSS | Per-section scope blocks | Zero cross-section bleed; all 5 themes pass |
| B8 | Arch enforcement | `arch-check.mjs --strict`; `no-restricted-imports` | Sections cannot import services directly |
| B9 | Modal → native `<dialog>` | All 8 modals converted | Focus-trap polyfill removed; WCAG 2.2 focus management |
| B10 | Remove `manualChunks` | Dynamic `import()` only | Vite builds without manual config; no size regression |
| B11 | Supply chain | CycloneDX SBOM + Trivy weekly + OpenSSF Scorecard | Workflows green; three new README badges |
| B12 | Playwright expansion | Full RSVP + offline + multi-event + a11y per locale E2E | CI: zero axe violations across all locales |

**Phase OKR:** *Strict TS in core · Strict architecture · Services ≤ 25 · No dead code · Offline queue survives crash.*

---

### Phase C — v15.0.0 — *Smart and Native-Class*

| # | Workstream | Deliverable |
| --- | --- | --- |
| C1 | Wire all dormant utilities | Every High + Med utility in §5.4 wired to a UI — zero built-but-dark features |
| C2 | WhatsApp Cloud API | Template approval, bulk send, delivery webhooks, A/B tests; edge function proxy |
| C3 | AI edge functions | Seating CSP solver + invitation copy gen; BYO key; OpenAI + Anthropic + Ollama |
| C4 | Realtime | Presence badges, live RSVP counter, conflict-resolver UI |
| C5 | Web Push | End-to-end; VAPID keys; opt-in; Badge API; Share Target |
| C6 | Stripe Checkout | Vendor payments + receipts via edge function; Bit/PayBox deep-links surfaced in UI |
| C7 | Photo gallery | Supabase Storage + guest uploads + on-the-fly transforms; signed upload URLs |
| C8 | QR/NFC kiosk | Event-day scan mode; offline-first verify; badge print; per-guest QR codes |
| C9 | Maps + Calendar | OSM venue map + Waze deep link; Google Calendar OAuth + `.ics` per guest |
| C10 | AR locale | Complete Arabic translation; RTL parity Playwright tests |
| C11 | ICU plurals | MessageFormat engine; plural + gender forms in HE + AR |

**Phase OKR:** *Every built utility is reachable · AI is opt-in and BYO-key · Payments and check-in are production-ready · Arabic ships.*

---

### Phase D — v16.0.0 — *Platform and Scale*

| # | Workstream | Deliverable |
| --- | --- | --- |
| D1 | Live theme picker | CSS variable sliders + theme presets + export as `theme.json` |
| D2 | Public wedding website builder | Theme picker, live preview, custom domain via CNAME, password protection |
| D3 | Org / team / planner mode | Planner workspaces; roles (owner / co-planner / vendor / photographer / guest) |
| D4 | Plugin surface | `plugin.json` manifest; theme + integration API; community marketplace |
| D5 | FR + ES locales | Community-contributed; ICU plurals; total 4 locales shipped |
| D6 | Cloudflare CDN + custom domain | HTTP/3; Brotli; image transforms; short vanity domain |
| D7 | Capacitor native app | iOS + Android; native NFC, haptics, share sheet; App Store + Play Store |
| D8 | One-click deploy templates | Vercel + Netlify + Cloudflare + Render with single-button deploy |
| D9 | RU locale | Complete Russian; community pipeline for additional languages |

---

### Phase E — v17.0.0 — *Open Platform*

| # | Workstream | Deliverable |
| --- | --- | --- |
| E1 | Public REST API | Supabase PostgREST + API key management UI + webhook subscriptions |
| E2 | WebAuthn passkeys | Admin role bound to passkey; replaces email allowlist |
| E3 | Vendor catalogue import | CSV/JSON import from any vendor source; no walled directory |
| E4 | Theme marketplace | Community themes via plugin manifest; review + install UI |
| E5 | Multi-region support | Supabase region selection on self-hosted deploy; GDPR data-residency controls |
| E6 | Observability v2 | Glitchtip + UptimeRobot + LH-CI weekly cron; Datadog-compatible metrics export |

---

## 7. Migration Playbooks

### 7.1 Sheets → Supabase cutover (Phase A1)

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
CREATE INDEX IF NOT EXISTS guests_phone_idx ON guests (phone);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event owner read" ON guests FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
CREATE POLICY "event owner write" ON guests FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()));
```

### 7.2 Hash → `pushState` router (Phase A5)

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

// Hash fallback for PWAs installed from previous versions
if (location.hash && !location.pathname.includes("/")) {
  const [s, qs] = location.hash.slice(1).split("?");
  navigateTo(s, Object.fromEntries(new URLSearchParams(qs ?? "")));
}
```

### 7.3 `localStorage` → encrypted IDB (Phase A4)

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
    encoded
  );
  await idbSet(key, { iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) });
}

export async function getSecure(key) {
  const stored = await idbGet(key);
  if (!stored) return null;
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(stored.iv) },
    await getDerivedKey(),
    new Uint8Array(stored.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
```

### 7.4 Custom Proxy → Preact Signals (Phase B4)

```js
// src/core/store.js — drop-in internals replacement
import { signal, effect } from "@preact/signals-core";

const _signals = new Map();

function _getOrCreate(key, defaultVal) {
  if (!_signals.has(key)) _signals.set(key, signal(defaultVal));
  return _signals.get(key);
}

export function storeGet(key) {
  return _getOrCreate(key, undefined).value;
}

export function storeSet(key, value) {
  _getOrCreate(key, value).value = value;
}

export function storeSubscribe(key, cb) {
  const s = _getOrCreate(key, undefined);
  return effect(() => cb(s.value)); // returns cleanup function
}
```

### 7.5 Auth SDK consolidation (Phase A3)

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

---

## 8. Success Metrics & SLOs

| Metric | v12.5.2 (now) | v13 target | v14 target | v15 target |
| --- | --- | --- | --- | --- |
| Tests passing | 2 509 / 2 509 | ≥ 2 700 | ≥ 2 900 | ≥ 3 100 |
| Coverage (lines enforced) | advisory | ≥ 80 % | ≥ 85 % | ≥ 90 % |
| Lint errors / warnings | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Lighthouse Performance | ≥ 95 | ≥ 95 | ≥ 97 | ≥ 98 |
| Lighthouse Accessibility | ≥ 95 | ≥ 97 | ≥ 99 | 100 |
| Bundle (gzip) | ~45 KB | ≤ 60 KB | ≤ 55 KB | ≤ 50 KB |
| axe violations | 0 | 0 | 0 | 0 |
| Dead exports | ~193 | ≤ 100 | ≤ 20 | ≤ 5 |
| Service files | 62 | ≤ 40 | ≤ 25 | ≤ 20 |
| Locales shipped | 2 (HE, EN) | 2 | 2 | 3 (+ AR) |
| P0 security issues | 3 (Sheets, plaintext auth, no monitoring) | 0 | 0 | 0 |
| Active backend | Sheets | Supabase | Supabase | Supabase |
| Error tracking | None | Active (opt-in) | Active | Active |
| Offline queue durability | Memory-only | IDB-persisted | IDB + Sync | IDB + Sync + Periodic |
| Utilities wired / built | ~15/30+ | ~20/30 | 30/30 | 30/30 + new |
| Admin management | Requires deploy | DB-driven | DB-driven | DB-driven |

### SLOs (production targets)

| SLO | Target |
| --- | --- |
| Availability (GH Pages) | ≥ 99.9 % (3 nines) |
| RSVP submission P99 latency | ≤ 2 s on 3G |
| Error budget | ≤ 0.1 % of page loads produce an unhandled JS exception |
| CI pipeline (lint + test + build) | ≤ 3 min |
| Deploy after push to `main` | ≤ 2 min |

---

## 9. Open Decisions Register

> Each item requires an ADR before the phase begins. Decision closes when the ADR is accepted.

| # | Decision | Options | Current leaning | Blocks |
| --- | --- | --- | --- | --- |
| OD-01 | Reactive store: Preact Signals vs alternatives | Signals (3 KB) · keep Proxy · MobX · Zustand | **Signals** — smallest dep, no external API change | Phase B4 |
| OD-02 | `<dialog>` strategy for older Safari | `dialog-polyfill` (3 KB) · progressive enhancement · min-version policy | **Progressive enhancement** — readable without JS | Phase B9 |
| OD-03 | Typed route definition: config vs file-based | `route-table.js` config (scaffolded) · `src/routes/` directory | **Config** — already scaffolded | Phase A5 |
| OD-04 | AI provider strategy | OpenAI only · Anthropic only · multi-provider · Ollama-first local | **Multi-provider with BYO key** — open ecosystem | Phase C3 |
| OD-05 | WhatsApp integration level | `wa.me` links only · Cloud API only · both with progressive toggle | **Both with toggle** — gradual rollout | Phase C2 |
| OD-06 | CDN provider | Cloudflare (free) · Fastly · no CDN | **Cloudflare** — free tier, existing tooling | Phase D6 |
| OD-07 | Native app strategy | Capacitor · Expo · React Native · PWA-only | **Capacitor** — reuses 100 % of existing codebase | Phase D7 |
| OD-08 | Photo storage provider | Supabase Storage · Cloudinary · Bunny CDN | **Supabase Storage** — already integrated | Phase C7 |
| OD-09 | Plugin architecture | JSON manifest + dynamic import · iframe sandbox · none | **JSON manifest + dynamic import** | Phase D4 |
| OD-10 | Payments provider | Stripe only · multi-PSP · regional (Bit/PayBox/Stripe) | **Stripe for vendors; deep-links for guests** | Phase C6 |
| OD-11 | AR locale strategy | Full in-house translation · machine-assisted + human review · community | **Machine-assisted + human review** | Phase C10 |
| OD-12 | FB OAuth removal | Remove entirely · keep behind flag · move to Supabase OIDC | **Remove** — low adoption, high bundle cost | Phase A3 |

---

## 10. Working Principles

These principles govern every PR, every architecture decision, and every new feature addition.

1. **One source of truth per concern.** State lives in one place; constants in `core/constants.js`; config in `core/config.js`. Never duplicate.
2. **No workarounds — fix the root cause.** If a linter rule fires, fix the code. If a test fails, fix the code or the test. Suppression is a veto in code review.
3. **Security is a first-class constraint.** Trusted Types, AES-GCM at rest, no API keys in the client bundle, no `innerHTML` with unvalidated data, OWASP Top 10 scan on every PR.
4. **RTL is not an afterthought.** Every new UI feature must be tested in Hebrew. When AR ships, every feature is tested in Arabic. Playwright a11y runs per locale.
5. **Bundle size is a feature.** Every new runtime dependency must justify its weight in writing (ADR or PR description). Hard CI gate at 60 KB total. No framework migrations.
6. **Every utility ships with a UI.** Building a utility with no entry point is incomplete work. The backlog tracks wiring separately from building. "Built" ≠ "done".
7. **Docs are code.** ADR for every Replace decision. CHANGELOG entry for every version. Copilot instructions updated with every structural change.
8. **Offline-first means the queue never lies.** Write queue entries are persisted to IDB — never silently discarded. Conflict resolution surfaces to the user.
9. **Open source means auditable.** No secret algorithms, no vendor lock-in, no telemetry without explicit user opt-in. GDPR erasure is a first-class API.
10. **Accessibility is not a badge.** WCAG 2.2 AA is the floor, not the ceiling. axe-zero is a CI gate. Screen-reader testing is performed in real Hebrew RTL.

---

## 11. Release Line

| Version | Status | Theme | Key deliverables |
| --- | --- | --- | --- |
| v12.5.1 | **Released 2026-04-27** | Production hardening | A11y `for=` labels, `-webkit-user-select` prefix, TS strict analytics, CI action version pins, htmlhintrc cleanup |
| v12.5.2 | **Released 2026-04-27** | Tooling accuracy | Dead-export audit regex fix (202 false-positives → 117 actual); CI baseline lowered 201 → 117 |
| v12.6.x | Candidate patches | Node LTS + monitoring | Switch to Node 22 LTS; activate Sentry adapter; coverage gate |
| **v13.0.0** | **Next** | Backend convergence + P0 security | Supabase primary, Supabase Auth (drop 3 SDKs), encrypted IDB, pushState router, edge functions, monitoring |
| v13.x | Patch series | | Service consolidation; dead-export purge; arch enforcement patches |
| **v14.0.0** | Later | DX + type safety | TypeScript `core/services/handlers`; BaseSection all sections; Preact Signals; Background Sync SW; supply chain |
| v14.x | Patch series | | Utility wiring sprints (High priority); coverage push to 85 % |
| **v15.0.0** | Later | Smart + native-class | WhatsApp Cloud API, AI edge functions, Realtime, Stripe, photo gallery, QR kiosk, AR locale, ICU plurals |
| v15.x | Patch series | | FR locale; additional utility wiring (Med priority) |
| **v16.0.0** | Candidate | Platform + scale | Live theme picker, public website builder, org/team mode, Cloudflare CDN, custom domain, Capacitor native |
| **v17.0.0** | Candidate | Open platform | Public REST API, WebAuthn passkeys, vendor catalogue import, theme marketplace, multi-region |

---

*Last updated: 2026-04-27 · v12.5.2 · See [CHANGELOG.md](CHANGELOG.md) for detailed history.*

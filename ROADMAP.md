# Wedding Manager — Roadmap v6.0.0

> A brutally honest strategic review and forward plan for a best-in-class wedding management SPA.
> Last updated: 2026-04-16 · Current release: v5.5.0 · Next milestone: v6.0.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment (v5.5.0)](#current-state-assessment-v550)
3. [Decision Audit — Everything Reconsidered](#decision-audit--everything-reconsidered)
4. [Keep / Kill / Change Matrix](#keep--kill--change-matrix)
5. [Completed Work (v3.0 → v5.5)](#completed-work-v30--v55)
6. [Phase 6 — Architecture Renaissance (v6.0)](#phase-6--architecture-renaissance-v60)
7. [Phase 7 — Backend Overhaul (v6.1)](#phase-7--backend-overhaul-v61)
8. [Phase 8 — Security & Hardening (v6.2)](#phase-8--security--hardening-v62)
9. [Phase 9 — UX Excellence (v6.3)](#phase-9--ux-excellence-v63)
10. [Phase 10 — Intelligence & Automation (v6.4)](#phase-10--intelligence--automation-v64)
11. [Phase 11 — Platform & Ecosystem (v6.5)](#phase-11--platform--ecosystem-v65)
12. [Success Metrics](#success-metrics)
13. [Release Schedule](#release-schedule)
14. [Constraints (Non-Negotiable)](#constraints-non-negotiable)
15. [Principles](#principles)

---

## Executive Summary

Wedding Manager v5.5.0 is a feature-rich, zero-dependency wedding SPA. It works. But "works" is not "best in class." This roadmap re-examines **every major decision** — frontend, backend, infrastructure, tooling, API choices, security, architecture — and plots a path from "solid hobby project" to "production-grade platform."

### The Honest Assessment

**We got right:** ESM modules, zero runtime deps, reactive store, `data-action` delegation, lazy templates, IndexedDB fallback, 1864+ tests, 0 lint errors.

**We got wrong (or outgrew):**

- Google Sheets as primary database (fragile schema, no real-time, 429 rate limits, no CRDTs)
- `tsconfig.json` with `strict: false` and `target: "ES2020"` — we claim ES2025 but compile for 2020
- Supabase integration exists but is untested, unconfigured, and has no RLS ↔ OAuth bridge
- CSP via `<meta>` tag instead of HTTP headers — framing protection runs *before* CSP activates
- localStorage stores guest PII (phone, email) in plaintext, readable by any XSS
- No coverage gates in CI — coverage generates HTML report but doesn't enforce thresholds
- E2E only Chromium, only happy path — no Firefox/Safari, no offline, no conflict, no mobile
- `main.js` still 707 lines (target was ≤200) — handler extraction incomplete
- No error reporting in production — if sync fails for 1,000 guests, nobody knows
- Hardcoded GAS script URL + spreadsheet ID in config.js — if URL changes, manual localStorage edit required
- "both" mode (Sheets + Supabase parallel write) has no consistency guarantee
- Store subscriber cleanup not enforced — memory leak risk on repeated section nav
- OAuth SDK versions unpinned — CDN loads breaking changes silently
- 12+ files need manual version bump on release (even with sync-version.mjs)
- 4 language files but Arabic/Russian have zero E2E validation

---

## Current State Assessment (v5.5.0)

```text
Frontend     HTML5 · vanilla CSS3 (@layer + nesting) · vanilla JS (ES2025, ESM)
Build        Vite 8 · src/main.js entry · zero runtime deps
Backend      Google Sheets via Apps Script Web App · optional Supabase · "both" mode
Auth         Google GIS · Facebook SDK · Apple SDK · email allowlist · anonymous guest
Deploy       GitHub Pages (static) · $0 infrastructure
Tests        1864+ passing (34 suites) · Vitest 4.1 + Playwright 1.59 E2E
Lint         0 errors · 0 warnings (ESLint 10 + Stylelint 17 + HTMLHint + markdownlint)
Bundle       < 30 KB gzip main · < 15 KB gzip RSVP-only chunk
Sections     20 feature modules · 5 handler modules · mount/unmount lifecycle
Templates    15 HTML fragments · 8 modal HTML fragments (lazy-loaded)
i18n         Hebrew RTL primary · English · Arabic · Russian (lazy JSON)
Storage      IndexedDB primary → localStorage fallback → in-memory fallback
PWA          Service Worker · manifest.json · offline queue · push notifications
CI           6 jobs: lint+test (Node 22+24) · security · Lighthouse · size · E2E
main.js      707 lines (down from 1,700 — handler extraction done, not complete)
```

### Scoreboard

| Area | Score | Detail |
| --- | --- | --- |
| Architecture | ⭐⭐⭐⭐ | Clean ESM, Proxy store, `data-action` delegation. Subscriber leak risk. |
| CSS | ⭐⭐⭐⭐⭐ | 7 `@layer`, native nesting, 5 themes, dark/light, glassmorphism. Excellent. |
| Testing | ⭐⭐⭐⭐ | 1864 tests, but no coverage gate, no multi-browser E2E, no a11y gate. |
| Security | ⭐⭐⭐ | CSP + sanitize + no innerHTML. But PII unencrypted, CSP via meta tag, no audit log. |
| Backend | ⭐⭐ | Google Sheets works but is fragile. Supabase exists but is vapor. No real DB. |
| Performance | ⭐⭐⭐⭐ | Lazy sections + templates. Store notification N² issue at scale. |
| i18n | ⭐⭐⭐⭐ | 4 locales, ICU plurals. No RTL↔LTR toggle, no Hebrew calendar. |
| DevOps | ⭐⭐⭐ | 6-job CI. No canary deploy, no error reporting, no analytics. |
| Documentation | ⭐⭐⭐ | 5 root docs + ADRs. Version bump in 12+ places. |
| Infrastructure | ⭐⭐ | GitHub Pages (static only). No edge functions, no real backend. |

---

## Decision Audit — Everything Reconsidered

### D1. Vanilla JS (No Framework) — KEEP ✅

**Original rationale:** Zero runtime deps is core identity. Platform APIs suffice.
**2026 reassessment:** Still valid. Native ESM, Proxy, `structuredClone`, Popover API, View Transitions, `import.meta.glob` — the platform has caught up. Framework overhead for a 20-section SPA is unjustified.
**But:** Missing framework-level capabilities must be built ourselves: subscriber lifecycle cleanup, batch mutations, form validation DSL. Budget 1–2 sprints to harden our vanilla primitives.

### D2. TypeScript vs JSDoc — CHANGE ⚠️

**Original decision:** Stay JS, use JSDoc `@typedef` + `tsc --noEmit` for checking.
**Problem exposed:** `tsconfig.json` has `strict: false`, `target: "ES2020"`. We claim ES2025 but check against 2020 types. `@type {any[]}` casts scattered everywhere. `tsc` runs `continue-on-error: true` in CI — it's not actually blocking.
**New decision:** **Migrate to TypeScript (`.ts` files).** The zero-runtime-deps constraint applies to *shipped bundles*, not source code. TypeScript compiles away — zero bytes in dist. Benefits: strict null checks, discriminated unions for `Guest.status`, exhaustive switch checks, IDE autocomplete, refactoring confidence.
**Migration path:** Rename files `.js` → `.ts` one module at a time. Start with `src/core/`, then `src/utils/`, then `src/services/`, then `src/sections/`. Use `strict: true`. Remove all `@type {any}` casts.

### D3. Google Sheets as Primary Backend — RE-EVALUATE 🔴

**Original rationale:** Free, familiar, couple sees data in spreadsheet.
**Problems that emerged:**

- Column schema drift → silent data corruption (no foreign keys, no constraints)
- Rate limiting: Apps Script 429s with >50 concurrent users
- No real-time: polling only (30s intervals)
- Schema evolution requires lockstep GAS + client updates
- No transactions, no indexes, no query language
- Conflict resolution is last-write-wins by timestamp (unreliable for concurrent edits)
- GAS URL hardcoded; if redeployed, every client breaks until localStorage manually edited
**New decision:** **Supabase becomes the primary backend. Google Sheets becomes an optional export/sync target.**
- Supabase Free Tier: 500 MB DB, unlimited API calls, Realtime channels, Row-Level Security, SQL migrations, Edge Functions, built-in auth
- Real PostgreSQL: foreign keys, indexes, JSONB, triggers, `ON CONFLICT` upserts
- Realtime: WebSocket channels replace 30s polling
- Auth: Supabase Auth supports Google/Facebook/Apple natively — collapse our custom OAuth into Supabase Auth
- Migration: Export Sheets data → import into Supabase tables → keep Sheets as read-only mirror via webhook
**Sheets stays as:** Optional one-way sync (Supabase → Sheets via Edge Function cron). The couple can still *view* in spreadsheet but Supabase is source of truth.

### D4. GitHub Pages Deploy — CHANGE TO HYBRID ⚠️

**Original rationale:** $0, excellent CDN, no vendor lock-in.
**Limitation:** Static hosting only. No server-side rendering, no edge functions, no API routes, no dynamic OG images, no webhook receivers.
**New decision:** **Cloudflare Pages (free tier) for static + Supabase Edge Functions for dynamic.**

- Cloudflare Pages: free, global CDN, branch previews per PR, custom domains, redirect rules
- Supabase Edge Functions: webhook receivers, RSVP confirmation emails, WhatsApp Cloud API proxy
- GitHub Pages stays as fallback / mirror if needed
- **Cost: still $0** (Cloudflare free tier + Supabase free tier)

### D5. Service Worker Strategy — CHANGE ⚠️

**Current:** Manual SW with `CACHE_NAME` version bump. 5-min poll for updates. Full cache bust on any version change.
**Problem:** CSS fix → entire cache invalidated. User re-downloads everything. No user notification before refresh.
**New decision:** Use Workbox (build-time generation, no runtime dep). Content-hash URLs (Vite already generates these). Stale-while-revalidate for assets. Navigation preload for HTML. Broadcast-update pattern: user gets toast "New version available" with refresh button.

### D6. CSP Implementation — REWRITE 🔴

**Current:** CSP via `<meta http-equiv>`. Framebusting JS runs before CSP activates.
**Problem:** `<meta>` CSP cannot set `frame-ancestors`. The inline framebusting script violates its own CSP if strictly enforced.
**New decision:** Move CSP to HTTP response headers via Cloudflare Pages `_headers` file (already exists in `public/_headers`). Remove inline framebusting script. Add `frame-ancestors 'none'`. Add `report-uri` or `report-to` for CSP violation monitoring.

### D7. PII Storage — REWRITE 🔴

**Current:** Guest phone numbers, emails, and names stored as plaintext JSON in localStorage/IndexedDB.
**Problem:** Any XSS exploit reads the entire guest list. Even without XSS, browser extensions can read localStorage.
**New decision:** Encrypt PII fields at rest using `crypto.subtle.encrypt()` (AES-GCM, native Web Crypto API, zero deps). Key derived from admin session token via PBKDF2. Anonymous/guest users see only their own phone number (stored in sessionStorage). Full guest list only accessible to authenticated admins.

### D8. OAuth Provider SDKs — PIN VERSIONS ⚠️

**Current:** Google GIS, Facebook SDK, Apple SDK loaded from CDN without version pins.
**Problem:** Provider could push breaking change; our app breaks silently.
**New decision (interim):** Pin SDK versions via URL parameters where supported. Add periodic CI job that fetches SDK endpoints and diffs against baseline.
**New decision (post D3):** If Supabase Auth replaces custom OAuth, this problem disappears — Supabase handles provider SDKs server-side.

### D9. Store Reactivity Model — IMPROVE ⚠️

**Current:** Proxy-based store with subscriber `Set<Function>` per key. No batch API. No subscriber lifecycle management. Deep object mutations don't trigger notifications.
**Problems:**

- 1000 guests × sort → 1000 set traps × 10 subscribers = 10K callbacks (N² performance)
- Section unmount doesn't auto-unsubscribe — leak risk
- `storeGet()` vs `state.load()` semantic confusion
**New decision:**

1. Add `store.batch(() => { mutations })` — defer notifications until batch end
2. Add `storeSubscribeScoped(key, fn, scope)` — auto-unsubscribe when scope (section) unmounts
3. Unify `storeGet()`/`load()` — `storeGet()` for in-memory, `persist()` for disk, no more `load()` in section code
4. Consider deep Proxy (2 levels max) for `store.guests[0].status = x` reactivity

### D10. Documentation Strategy — SIMPLIFY ⚠️

**Current:** Version string in 12+ places. `sync-version.mjs` patches them, but it's fragile.
**New decision:**

1. Single source of truth: `package.json` `version` field
2. `sync-version.mjs` reads it and patches: `config.js`, `sw.js`, CI header comment, copilot-instructions.md
3. All other docs reference "current version" without hardcoded string — use "v{current}" with auto-replace at build
4. `ROADMAP.md`: Strategic only — no version numbers in sprint tables (use milestone labels)
5. `ARCHITECTURE.md`: Living doc — auto-generated where possible (mermaid from imports)

### D11. Supabase Integration — PROMOTE TO PRIMARY 🔴

**Current:** Empty `SUPABASE_URL`, empty `SUPABASE_ANON_KEY`. Zero tests. Zero production usage. Shallow PostgREST wrapper with no RLS↔OAuth bridge. Key-value format for weddingInfo is inefficient.
**New decision:** See [D3](#d3-google-sheets-as-primary-backend--re-evaluate-). Supabase becomes primary backend with:

- Proper SQL migrations in `supabase/migrations/`
- RLS policies per table (admin CRUD all; guest read own row only)
- Supabase Auth replaces custom OAuth (Google/Facebook/Apple providers built-in)
- Realtime channels for live collaborative editing
- Edge Functions for: RSVP confirmation emails, WhatsApp Cloud API proxy, Sheets export cron
- `weddingInfo` as JSONB column (not key-value rows)

### D12. WhatsApp Strategy — EVOLVE ⚠️

**Current:** `wa.me` deep links (free, manual). Green API mentioned as optional (paid).
**2026 assessment:** WhatsApp Business Cloud API has matured. Free tier: 1,000 service conversations/month. Official Meta API. Supports message templates, buttons, media.
**New decision:**

- Keep `wa.me` deep links as zero-config default
- Add WhatsApp Cloud API as opt-in (configured in Supabase Edge Function, not client-side)
- Route via Supabase Edge Function → Meta Graph API → guest WhatsApp
- Track delivery/read status via webhook → Supabase table → dashboard analytics

### D13. tsconfig Target — FIX 🔴

**Current:** `target: "ES2020"`, `lib: ["ES2020", "DOM"]`. We use ES2025 features (structuredClone, at(), findLast, import.meta.glob).
**New decision:** `target: "ES2022"` minimum (for top-level await, class fields, `at()`). `lib: ["ES2023", "DOM", "DOM.Iterable"]`. Vite's `build.target` already handles browser compat — tsconfig should match actual language usage.

### D14. Testing Strategy — UPGRADE 🔴

**Current:** 1864 tests in Vitest (happy-dom). Playwright E2E (Chromium only). Coverage report generated but no gate.
**Problems:** happy-dom doesn't implement CSS layout, SVG, Service Worker. No multi-browser E2E. No a11y gate. No performance benchmarks. No visual regression.
**New decision:**

1. **Coverage gate:** Enforce `lines: 85, functions: 85, branches: 75` in Vitest config — CI fails if missed
2. **Multi-browser E2E:** Playwright with Chromium + Firefox + WebKit (Safari)
3. **Accessibility gate:** `@axe-core/playwright` in E2E — fail on any WCAG 2.2 AA violation
4. **Visual regression:** Playwright screenshots compared to baseline for invitation, seating chart, print
5. **Performance bench:** CI job measuring bundle gzip size, LCP, store mutation latency at 1000 guests
6. **GAS backend tests:** Mock `SpreadsheetApp`, test `ensureSheets`, `replaceAll`, conflict merge. Run in CI.

### D15. Error Reporting — ADD 🔴

**Current:** `src/utils/error-monitor.js` exists. Errors go to `console.error`. Zero visibility in production.
**New decision:** Add lightweight error reporting. Options (all OSS/free):

- **Sentry Free Tier:** 5K errors/month, source map support, release tracking. *But: runtime SDK = dep violation.*
- **Self-hosted via Supabase Edge Function:** Capture `window.onerror` + `unhandledrejection` → POST to Edge Function → insert into `error_log` Supabase table. Zero runtime deps. Dashboard in analytics section.
- **Decision: Self-hosted approach.** POST errors as JSON to Edge Function. Store in Supabase. Show in admin analytics.

---

## Keep / Kill / Change Matrix

### KEEP (Validated Decisions)

| Decision | Why It Works | Risk If Changed |
| --- | --- | --- |
| Vanilla JS (no framework) | Zero runtime deps. Platform APIs sufficient. | Framework would add 30–80 KB gzip, vendor lock-in. |
| `data-action` event delegation | Single listener. HTML↔JS separation. Scalable. | Alternative is scattered addEventListener — worse. |
| CSS `@layer` + native nesting | Future-proof. No preprocessor. Clean cascade. | None — this is the modern standard. |
| 5 themes + glassmorphism | Visual identity. UserConfigurable. | Theme system is solid; keep enhancing. |
| Proxy-based reactive store | Fine-grained, lightweight. No dep needed. | Improve with batch + scoped subs; don't replace. |
| i18n: `t()` + `data-i18n` | Universal coverage. Lazy locale loading. | Keep pattern; improve plural/calendar handling. |
| Section mount/unmount lifecycle | Clean resource management. Easy to reason about. | Keep. Enhance with auto-unsubscribe. |
| `import.meta.glob` template discovery | Zero manual sync. New sections auto-discovered. | Keep. Extend to modal auto-discovery. |
| Vitest for unit/integration | Fast, ESM-native, Vite-compatible. | Keep. Add coverage gates. |
| Playwright for E2E | Cross-browser, reliable, CI-friendly. | Keep. Expand to multi-browser + a11y. |
| SRI hashing | Integrity verification for CDN-served assets. | Keep. Move enforcement to HTTP headers. |

### KILL (Remove / Sunset)

| Decision | Why Kill It | Replacement |
| --- | --- | --- |
| Google Sheets as *primary* backend | Fragile schema, no real-time, rate limits, no transactions | Supabase (PostgreSQL) as primary |
| CSP via `<meta>` tag | Cannot set `frame-ancestors`. Inline script violation. | HTTP `Content-Security-Policy` header |
| `tsc continue-on-error: true` in CI | Type checking exists but never blocks — theater | `tsc --noEmit` with `strict: true`, CI fails on error |
| `target: "ES2020"` in tsconfig | Doesn't match actual ES2025 usage | `target: "ES2022"`, `lib: ["ES2023"]` |
| Inline framebusting `<script>` | Runs before CSP. Redundant with `frame-ancestors`. | Delete. Use HTTP header `frame-ancestors 'none'`. |
| `load()` for direct localStorage reads in section code | Confusing dual API with `storeGet()` | Unified `storeGet()` only. `persist()` internal. |
| Manual SW cache versioning | Full cache bust on every release | Workbox build-time generation + content-hash |
| GAS URL hardcoded in config.js | If redeployed, all clients break | Supabase primary; GAS URL from runtime config API |

### CHANGE (Evolve / Improve)

| Area | From | To | Why |
| --- | --- | --- | --- |
| **Source language** | JS + JSDoc | TypeScript (strict) | Refactoring confidence, exhaustive checks. Zero bytes in dist. |
| **Primary backend** | Google Sheets | Supabase Free | Real DB, real-time, RLS, Edge Functions, auth |
| **Auth** | Custom OAuth (3 SDKs) | Supabase Auth | One provider, built-in social login, JWT, RLS integration |
| **Hosting** | GitHub Pages | Cloudflare Pages | Branch previews, `_headers`, redirects, custom domain |
| **Service Worker** | Manual SW | Workbox (build-time) | Stale-while-revalidate, broadcast-update, zero runtime |
| **Store** | Basic Proxy | Proxy + batch + scoped subs | Performance at scale, leak prevention |
| **PII storage** | Plaintext JSON | AES-GCM encrypted (Web Crypto) | Security hardening |
| **Error monitoring** | console.error only | Self-hosted via Supabase Edge | Production visibility |
| **Testing** | 1864 tests, no gates | Coverage gate + multi-browser + a11y gate | Regression prevention |
| **Docs versioning** | 12 manual touch points | `package.json` → auto-sync script | One source of truth |
| **WhatsApp** | `wa.me` links only | `wa.me` + Cloud API via Edge Function | Automated messaging |
| **CSS scoping** | 7 global files | Component-scoped CSS Modules (Vite) | No cascade surprises |

---

## Completed Work (v3.0 → v5.5)

<details>
<summary>Click to expand full history of 24+ sprints and 5 phases</summary>

### Sprints (v3.0–v4.7)

| Sprint | Milestone | Version |
| --- | --- | --- |
| S0 | Kill `window.*` — proper ESM, `import`/`export` | v3.0.0-alpha.1 |
| S1 | Split HTML — shell + 15 lazy templates + 6 modals | v3.0.0-alpha.2 |
| S2 | Modern UI — View Transitions, glassmorphism, swipe nav | v3.0.0-beta.1 |
| S3 | Backend — write queue, conflict resolution, RSVP_Log sync | v3.0.0-beta.2 |
| S4 | Security — session rotation, sanitize(), SRI, Lighthouse ≥ 0.90 | v3.0.0-rc.1 |
| S5 | GitHub DevOps — issue templates, Dependabot, auto-release | v3.0.0-rc.1 |
| S6 | Quality — coverage-v8, 1407+ tests, coverage gate 80%/70% | v3.0.0-rc.2 |
| S7 | Docs — instruction files, GUIDE, ARCHITECTURE mermaid diagrams | v3.8.0 |
| S8 | Analytics — heatmap, funnel, vendor timeline, PDF/CSV export | v3.9.0 |
| S9 | Multi-Event — event namespace, switcher, per-event Sheets | v4.0.0 |
| S10 | Real-time — polling sync, conflict UI, presence indicator | v4.0.0 |
| S11 | Quick Wins — per-guest RSVP links, transport, batch ops, gifts | v4.1.0 |
| S12 | UX Upgrades — WhatsApp reminders, QR check-in, drag-drop seating | v4.1.0 |
| S13 | Guest Experience — countdown, plus-ones, thank-you, seating map | v4.2.0 |
| S14 | Admin Productivity — multi-filter, budget widget, vendor due dates | v4.2.0 |
| S15 | UX & Smart — undo stack, shortcuts, auto-backup, activity feed | v4.3.0 |
| S16 | Day-Of — check-in sound, smart table assign, RSVP timeline | v4.3.0 |
| S17 | Data Quality — full-text search, bulk meal, expense donut, capacity colors | v4.4.0 |
| S18 | Sync & Forecast — queue monitor, arrival forecast, batch checkin, alarms | v4.4.0 |
| S19 | Vendor Intelligence — quick-dial, VIP flag, category cards, follow-up | v4.5.0 |
| S20 | Print & Reports — name badges, timeline print, expense filter | v4.5.0 |
| S21–22 | Changelog viewer, Supabase presence, conflict modal, modal refactor | v4.6.0 |
| S23–24 | Background sync, budget alerts, gallery lightbox v2, timeline done sync | v4.7.0 |

### Phase 1 — Foundations (v5.0) ✅

- ✅ Broke up main.js god module → 5 handler files (707 lines, 59% reduction)
- ✅ Deleted legacy `js/` directory entirely
- ✅ Created `src/types.d.ts` with 11 interfaces; `tsc --noEmit` in CI
- ✅ Template auto-discovery via `import.meta.glob`
- ✅ Error boundary in `events.js` + `beforeunload` flush + storage quota detection
- ✅ Lazy section JS via `import.meta.glob` (19 sections)
- ✅ Doc consolidation: 8 files → 5 + `sync-version.mjs` script

### Phase 2 — Backend Evolution (v5.1) ✅

- ✅ GAS schema validation + API version handshake + 429 backoff
- ✅ IndexedDB storage layer with auto-migration + 3-tier fallback
- ✅ Offline queue persisted to IndexedDB; drains on `navigator.onLine` + `visibilitychange`
- ⏳ Supabase RLS policies — deferred (decision: promote to primary in v6)
- ⏳ Supabase Realtime — deferred (decision: implement in v6.1)

### Phase 3 — UX & Accessibility (v5.2) ✅

- ✅ `aria-live`, `role="alert"`, `role="status"`, `:focus-visible` styles
- ✅ 4 locales: Hebrew, English, Arabic, Russian
- ✅ Haptic feedback, ≥48px touch targets, bottom sheet modals on mobile
- ✅ `prefers-color-scheme` auto-detect, scroll-driven animations
- ⏳ `@axe-core/playwright` CI gate — deferred (decision: implement in v6.3)
- ⏳ `prefers-reduced-motion` audit — deferred

### Phase 4 — Intelligence (v5.3) ✅

- ✅ Auto-suggest table assignments, no-show prediction, follow-up timing
- ✅ Budget forecast, vendor payment reminders, .ics calendar generation
- ✅ Response time histogram (SVG), burn-down chart, seating optimization score

### Phase 5 — Platform (v5.4–v5.5) ✅

- ✅ Plugin architecture (`registerPlugin()` with mount/unmount/i18n)
- ✅ ADRs for major decisions
- ✅ Copilot custom agents (guest, vendor, analytics, designer, explore)
- ✅ 45 intelligence helper functions (v5.5) across 12 modules + 85 tests
- ✅ 3 built-in plugins: contact-collector, gallery, registry

</details>

---

## Phase 6 — Architecture Renaissance (v6.0)

> **Theme:** Modernize the core. TypeScript migration. Fix the primitives.

### 6.1 — TypeScript Migration

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Update `tsconfig.json`: `strict: true`, `target: "ES2022"`, `lib: ["ES2023", "DOM"]` | S | P0 |
| 2 | Rename `src/core/*.js` → `.ts` (13 modules). Fix all type errors. | L | P0 |
| 3 | Rename `src/utils/*.js` → `.ts`. Add proper typed signatures. | M | P0 |
| 4 | Rename `src/services/*.js` → `.ts`. Type all API boundaries. | L | P0 |
| 5 | Rename `src/handlers/*.js` → `.ts`. | M | P1 |
| 6 | Rename `src/sections/*.js` → `.ts`. | XL | P1 |
| 7 | Convert `src/types.d.ts` interfaces to proper TS types with discriminated unions | M | P0 |
| 8 | Remove all `/** @type {any} */` casts — fix underlying type issues | L | P1 |
| 9 | `tsc --noEmit` in CI as blocking step (remove `continue-on-error`) | S | P0 |
| 10 | Update ESLint config: `@typescript-eslint/parser` + rules | M | P1 |
| 11 | Update Vite config for `.ts` entry point | S | P0 |

**Exit criteria:** All `src/` files are `.ts`. `strict: true` passes. Zero `any` casts. CI blocks on type errors.

### 6.2 — Store V2 (Batch + Scoped Subscriptions)

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Add `store.batch(callback)` — defer all notifications until callback completes | M | P0 |
| 2 | Add `storeSubscribeScoped(key, fn, sectionName)` — auto-cleanup on section unmount | M | P0 |
| 3 | Add `store.pauseNotifications()` / `store.resumeNotifications()` for bulk ops | S | P1 |
| 4 | Audit all `storeSubscribe()` calls — add unsubscribe to section `unmount()` | L | P0 |
| 5 | Add deep Proxy (1 level) for object properties: `store.guests[0].status = x` triggers | L | P2 |
| 6 | Unify API: deprecate `load()` in section code → `storeGet()` only | M | P1 |
| 7 | Add store dev tools: `storeDebug()` dumps state, subscriber count, dirty keys | S | P2 |

**Exit criteria:** Batch mutations work. Subscriber leaks impossible via scoped API. sort(1000 guests) triggers 1 notification.

### 6.3 — main.js → 200 Lines

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Extract remaining `on()` registrations from main.js → handler modules | M | P0 |
| 2 | Move `_buildStoreDefs()` + `_defaultWeddingInfo` to `src/core/defaults.ts` | S | P1 |
| 3 | Move `_resolveSection()` + section cache to `src/core/section-resolver.ts` | M | P1 |
| 4 | Move `switchEvent()` + event management to `src/core/event-manager.ts` | M | P1 |
| 5 | main.ts becomes: initStorage → initStore → initAuth → initRouter → initEvents | S | P0 |

**Exit criteria:** `main.ts` ≤ 200 lines. Pure orchestration, zero business logic.

### 6.4 — Build & Bundle Modernization

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Replace manual `manualChunks` with dynamic size-based chunking strategy | M | P1 |
| 2 | Merge templates < 5 KB into chunk groups (reduce HTTP overhead) | S | P2 |
| 3 | Add bundle size budget in CI (`performance.maxAssetSize` equivalent) | S | P0 |
| 4 | Target: < 15 KB gzip initial, < 8 KB gzip RSVP-only | — | Goal |
| 5 | Enable CSS code splitting per section (Vite CSS Modules) | M | P2 |
| 6 | Update Workbox integration for SW (build-time precache generation) | M | P1 |

**Exit criteria:** Initial load < 15 KB gzip. CI fails if bundle exceeds budget. SW uses Workbox.

### 6.5 — Constants & Configuration Cleanup

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Create `src/core/action-registry.ts` — typed action constants matching `data-action` | M | P1 |
| 2 | Pre-build validation: scan templates for orphaned `data-action` values | S | P1 |
| 3 | Move all hardcoded strings (section names, storage keys, action names) to typed enums | L | P1 |
| 4 | Validate `data-action` → handler mapping at compile time | M | P2 |

---

## Phase 7 — Backend Overhaul (v6.1)

> **Theme:** Supabase-first backend. Real database. Real-time. Real auth.

### 7.1 — Supabase as Primary Backend

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Design PostgreSQL schema: `guests`, `tables`, `vendors`, `expenses`, `budget`, `timeline`, `contacts`, `gallery`, `config`, `rsvp_log`, `error_log` | L | P0 |
| 2 | Write SQL migrations in `supabase/migrations/` (versioned, idempotent) | L | P0 |
| 3 | Add foreign keys: `guests.tableId → tables.id` (cascading nullify) | S | P0 |
| 4 | Add indexes: `guests(phone)`, `guests(status)`, `vendors(category)`, `rsvp_log(timestamp)` | S | P0 |
| 5 | Store `weddingInfo` as JSONB column in `config` table (not key-value rows) | M | P0 |
| 6 | Implement `ON CONFLICT (id) DO UPDATE` upserts (replace DELETE + INSERT) | M | P0 |
| 7 | Add `created_at`, `updated_at` triggers on all tables | S | P0 |
| 8 | Local dev: `supabase start` (Docker) for development/testing | M | P1 |
| 9 | CI: Supabase local for integration tests | M | P1 |

**Exit criteria:** Full PostgreSQL schema with FK constraints, indexes, and atomic upserts. Migrations run cleanly.

### 7.2 — Row-Level Security (RLS)

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Admin policy: `USING (auth.jwt() ->> 'role' = 'admin')` — full CRUD on all tables | M | P0 |
| 2 | Guest policy: `USING (phone = auth.jwt() ->> 'phone')` — read/update own row only | M | P0 |
| 3 | Anonymous policy: insert into `rsvp_log` only (append-only RSVP submission) | S | P0 |
| 4 | Service role key for Edge Functions (bypasses RLS for server-side ops) | S | P0 |
| 5 | Test RLS: verify admin can CRUD, guest can only read self, anonymous can only RSVP | L | P0 |

**Exit criteria:** RLS policies on all tables. Tested with 3 roles. No data leakage paths.

### 7.3 — Supabase Auth (Replace Custom OAuth)

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Configure Supabase Auth providers: Google, Facebook, Apple | M | P0 |
| 2 | Replace `src/services/auth.ts` OAuth SDK loading with `supabase.auth.signInWithOAuth()` | L | P0 |
| 3 | Map Supabase user to admin/guest role via email allowlist (custom claim in JWT) | M | P0 |
| 4 | Replace anonymous token with Supabase anonymous auth | S | P0 |
| 5 | Session management: use Supabase refresh tokens (auto-refresh, no manual rotation) | M | P1 |
| 6 | Remove Google GIS SDK, Facebook SDK, Apple SDK CDN loads | S | P1 |
| 7 | Update CSP: remove `*.google.com`, `connect.facebook.net`, `appleid.cdn-apple.com` | S | P1 |

**Exit criteria:** All login flows via Supabase Auth. Zero third-party SDK loading. JWT tokens carry role claim.

### 7.4 — Supabase Realtime

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Subscribe to `guests` table changes (INSERT, UPDATE, DELETE) via Realtime channel | M | P0 |
| 2 | Subscribe to `config` table (wedding info changes broadcast to all open tabs) | S | P1 |
| 3 | Replace 30s polling with Realtime push + reconciliation | L | P0 |
| 4 | Conflict resolution: compare `updated_at` + show conflict modal for diverged edits | L | P1 |
| 5 | Presence: show online admins via Supabase Presence channel | M | P2 |
| 6 | Offline graceful degradation: Realtime disconnects → queue writes locally → resync on reconnect | L | P0 |

**Exit criteria:** Multi-admin real-time collaboration works. Offline → online resync tested. No polling.

### 7.5 — Google Sheets as Mirror (Optional)

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Supabase Edge Function: `sync-to-sheets` — triggered by Supabase webhook on table changes | L | P2 |
| 2 | One-way sync: Supabase → Sheets (Sheets is read-only mirror) | M | P2 |
| 3 | UI toggle: "Enable Google Sheets export" in settings — off by default | S | P2 |
| 4 | Migration tool: "Import from Google Sheets" — one-time import into Supabase | L | P1 |

**Exit criteria:** Couple can still view data in Sheets, but writes go to Supabase only.

### 7.6 — Edge Functions

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | RSVP confirmation email: Edge Function → Supabase email service or Resend (free tier) | M | P1 |
| 2 | WhatsApp Cloud API proxy: Edge Function → Meta Graph API | L | P2 |
| 3 | Error logging: POST from client → Edge Function → `error_log` table | M | P0 |
| 4 | Health check endpoint: returns backend version + status | S | P1 |
| 5 | Webhook receiver: `wa.me` click tracking, delivery receipts | M | P2 |

---

## Phase 8 — Security & Hardening (v6.2)

> **Theme:** Production-grade security. Encrypted PII. Audit trails.

### 8.1 — CSP via HTTP Headers

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Move CSP from `<meta>` tag to Cloudflare `_headers` file | S | P0 |
| 2 | Add `frame-ancestors 'none'` (not possible in meta tag) | S | P0 |
| 3 | Remove inline framebusting `<script>` from index.html | S | P0 |
| 4 | Add `report-uri` or `report-to` for CSP violation reporting | M | P1 |
| 5 | CSP: remove CDN domains for OAuth SDKs (handled by Supabase Auth now) | S | P1 |

### 8.2 — PII Encryption at Rest

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Create `src/utils/crypto.ts` — AES-GCM encrypt/decrypt via `crypto.subtle` (zero deps) | M | P0 |
| 2 | Encrypt `phone`, `email`, `firstName`, `lastName` in IndexedDB | L | P0 |
| 3 | Derive encryption key from admin session token via PBKDF2 | M | P0 |
| 4 | Guest (anonymous) users: only their own phone in sessionStorage | S | P0 |
| 5 | Key rotation on session change | M | P1 |

### 8.3 — Audit Trail

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | `audit_log` Supabase table: `timestamp`, `user_id`, `action`, `entity`, `entity_id`, `diff` | M | P1 |
| 2 | Log all CRUD operations automatically via Supabase triggers | L | P1 |
| 3 | Admin UI: view audit log in settings | M | P2 |

### 8.4 — Security Scanning

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Add `innerHTML` + `eval` scan for `src/` *and* templates *and* modals | S | P0 |
| 2 | Add npm `audit --audit-level=moderate` (stricter than current `high`) | S | P1 |
| 3 | Add SAST step in CI (CodeQL or Semgrep OSS, free for open-source) | M | P1 |
| 4 | Validate `_headers` CSP syntax in CI | S | P1 |

---

## Phase 9 — UX Excellence (v6.3)

> **Theme:** WCAG 2.2 AAA compliance. Multi-browser. Visual regression. i18n polish.

### 9.1 — Accessibility Gate in CI

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Add `@axe-core/playwright` to E2E suite — fail on WCAG 2.2 AA violations | M | P0 |
| 2 | `prefers-reduced-motion: reduce` — disable all CSS animations + View Transitions | M | P0 |
| 3 | `forced-colors: active` — verify all UI in Windows High Contrast Mode | M | P1 |
| 4 | Color contrast verification across all 5 themes + light/dark | L | P0 |
| 5 | Verify `aria-label`, `aria-describedby`, `aria-expanded` on all interactive elements | L | P1 |
| 6 | Target: Lighthouse Accessibility = 1.00 | — | Goal |

### 9.2 — Multi-Browser E2E

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Expand Playwright: Chromium + Firefox + WebKit (Safari) | M | P0 |
| 2 | Add mobile viewport tests (360px, 768px) | M | P0 |
| 3 | Add offline scenario: disconnect → edit → reconnect → verify sync | L | P1 |
| 4 | Add conflict scenario: two tabs edit same guest → conflict modal | L | P1 |
| 5 | Visual regression: screenshot comparison for invitation, seating chart, print | L | P2 |

### 9.3 — i18n Improvements

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Dynamic `dir` attribute: `dir="rtl"` for he/ar, `dir="ltr"` for en/ru | M | P0 |
| 2 | CSS logical properties audit: replace all `margin-left/right` with `margin-inline-start/end` | L | P1 |
| 3 | Hebrew calendar dates via Temporal API (Stage 3) or `@hebcal/hdate` library | M | P2 |
| 4 | Preload secondary locale in `requestIdleCallback()` after 3s idle | S | P1 |
| 5 | Plural rule tests for all 4 locales (Russian 21 guests, Arabic 101 guests) | M | P0 |
| 6 | Validate all 4 locale JSON files have identical key sets in CI | S | P0 |

### 9.4 — Performance Optimization

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Show skeleton/spinner during template injection (instead of blank) | M | P0 |
| 2 | Open IndexedDB during bootstrap (not lazily on first access) | S | P1 |
| 3 | Cache `el.*` DOM refs in section mount (avoid repeated getElementById in loops) | M | P1 |
| 4 | Coalesce `enqueueWrite()` calls — batch multiple keys into single POST | L | P2 |
| 5 | Add performance budget in CI: LCP < 1.5s, INP < 200ms, CLS < 0.1 | M | P1 |

---

## Phase 10 — Intelligence & Automation (v6.4)

> **Theme:** Smart features. Production-ready messaging. AI assist.

### 10.1 — WhatsApp Cloud API Integration

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Supabase Edge Function: WhatsApp Cloud API proxy (register + send template messages) | L | P1 |
| 2 | Message templates: RSVP reminder, confirmation, thank-you, logistics | M | P1 |
| 3 | Delivery + read receipts via webhook → track in dashboard | M | P2 |
| 4 | Scheduled reminders: 1 week, 3 days, 1 day before event | M | P2 |
| 5 | Keep `wa.me` deep links as zero-config fallback | S | P0 |

### 10.2 — Communication Hub

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | RSVP confirmation email via Edge Function + Resend API (free: 3K emails/month) | M | P1 |
| 2 | Post-wedding thank-you message queue | M | P2 |
| 3 | SMS fallback via Twilio (for guests without WhatsApp) — evaluate only | M | P3 |
| 4 | Communication log: all sent messages tracked with status | L | P1 |

### 10.3 — Advanced Analytics

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | RSVP conversion funnel: invited → opened → started → submitted | L | P1 |
| 2 | One-page executive summary PDF (client-side, zero-dep SVG → canvas → PDF) | L | P2 |
| 3 | Self-hosted error analytics dashboard (from `error_log` table) | M | P1 |
| 4 | Budget forecast: ML-lite trend extrapolation from expense history | M | P2 |

### 10.4 — Smart Automation

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Auto-seat algorithm v2: constraint satisfaction (side, group, meal, accessibility) | L | P2 |
| 2 | Smart follow-up: auto-detect guests who haven't responded + suggest batch message | M | P1 |
| 3 | Day-of playbook: auto-generate timeline checklist from vendor due dates | M | P2 |

---

## Phase 11 — Platform & Ecosystem (v6.5)

> **Theme:** From app to platform. Multi-tenant. Extensible.

### 11.1 — Hosting Migration

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Set up Cloudflare Pages with branch preview deploys | M | P0 |
| 2 | Custom domain: `wedding.rajwan.dev` or similar | S | P1 |
| 3 | `_headers` file for CSP, HSTS, X-Frame-Options, Permissions-Policy | M | P0 |
| 4 | Redirect rules from GitHub Pages to Cloudflare Pages | S | P1 |
| 5 | Keep GitHub Pages as mirror / emergency fallback | S | P2 |

### 11.2 — Developer Experience

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Auto-generate API docs from TypeScript (TypeDoc) | M | P2 |
| 2 | Component gallery page (all UI states, themes, RTL/LTR) | L | P2 |
| 3 | Storybook-lite: static HTML page rendering each section in isolation | L | P3 |
| 4 | `npm run bench` — benchmark task for bundle size + store latency at 1K guests | M | P1 |
| 5 | `npm run validate` — template/action/handler consistency check | M | P1 |

### 11.3 — Plugin Architecture V2

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Plugin manifest: typed `PluginManifest` with version, deps, permissions | M | P2 |
| 2 | Plugin isolation: sandboxed stores (plugin can't mutate core state directly) | L | P2 |
| 3 | Plugin marketplace concept: load plugins from URL at runtime | L | P3 |
| 4 | Built-in plugins: seating-chart-visualizer, thank-you-cards, registry-tracker | L | P3 |

### 11.4 — Multi-Tenant (Evaluate)

| # | Task | Size | Priority |
| --- | --- | --- | --- |
| 1 | Per-wedding custom URLs: `elior-tova.wedding.rajwan.dev` | L | P3 |
| 2 | Template packages: pre-designed themes + default content | XL | P3 |
| 3 | Workspace invitations: admin invites co-admin via email | L | P3 |
| 4 | Data isolation: each wedding in separate Supabase schema or tenant ID prefix | L | P3 |

### 11.5 — Future Technology Watch

| Technology | Status in 2026 | Relevance | Action |
| --- | --- | --- | --- |
| **Temporal API** | Stage 3 / Safari shipped | Hebrew calendar, timezone-safe dates | Evaluate for v6.3 |
| **CSS `@scope`** | Baseline 2025 | Component-scoped styles without Shadow DOM | Evaluate for CSS refactor |
| **CSS Anchor Positioning** | Chrome shipped | Tooltip/dropdown positioning without JS | Adopt when cross-browser |
| **View Transition L2** | Cross-document | Page transitions without JS orchestration | Already partially adopted |
| **Popover API** | Baseline 2024 | Native modals/tooltips, replace custom modal system | Migrate modals to `popover` |
| **`import.meta.resolve()`** | Baseline 2023 | Dynamic import path resolution | Already using `import.meta.glob` |
| **WebAuthn / Passkeys** | Mainstream 2025 | Passwordless admin login | Add alongside Supabase Auth |
| **OPFS (Origin Private File System)** | Baseline 2023 | Larger offline storage than IndexedDB for photos | Evaluate for gallery plugin |
| **Shared Workers** | Broad support | Cross-tab sync without Supabase Realtime | Evaluate as offline bridge |
| **Compression Streams API** | Baseline 2023 | Client-side gzip for large export files | Add to data export |

---

## Success Metrics

| Metric | v5.5.0 Actual | v6.0 Target | v6.5 Target |
| --- | --- | --- | --- |
| `main.ts` lines | ~707 | ≤ 200 | ≤ 150 |
| Source language | JS + JSDoc | TypeScript (strict) | TypeScript (strict) |
| Type coverage | partial | 100% (`strict: true`) | 100% |
| Initial bundle (gzip) | < 30 KB | < 15 KB | < 12 KB |
| RSVP-only bundle (gzip) | < 15 KB | < 8 KB | < 6 KB |
| Lighthouse Performance | ≥ 0.90 | ≥ 0.95 | ≥ 0.98 |
| Lighthouse Accessibility | ≥ 0.95 | 1.00 | 1.00 |
| Test count | 1,864+ | 2,500+ | 3,000+ |
| Coverage (lines) | ≥ 80% (no gate) | ≥ 85% (CI gate) | ≥ 90% (CI gate) |
| Coverage (branches) | unknown | ≥ 75% (CI gate) | ≥ 80% (CI gate) |
| E2E browsers | 1 (Chromium) | 3 (Cr + FF + WK) | 3 + mobile viewports |
| Primary backend | Google Sheets | Supabase | Supabase + Edge Functions |
| Real-time sync | 30s polling | Supabase Realtime | Realtime + offline resync |
| Auth providers | 3 custom SDKs | Supabase Auth | Supabase Auth + Passkeys |
| CSP delivery | `<meta>` tag | HTTP headers | HTTP headers + report-to |
| PII encryption | plaintext | AES-GCM (Web Crypto) | AES-GCM + audit trail |
| Error monitoring | console.error | Self-hosted (Edge + DB) | Alerting + dashboard |
| Store subscriber leaks | possible | prevented (scoped API) | zero |
| Deploy platform | GitHub Pages | Cloudflare Pages | CF Pages + Supabase Edge |
| WhatsApp | `wa.me` links | `wa.me` + Cloud API | Cloud API + templates |
| Service Worker | manual versioning | Workbox build-time | Workbox + background sync |
| Bundle size gate | none | CI enforced | CI enforced |
| Locales validated | he (manual) | 4 locales (CI key-set check) | 4 locales (CI + plural tests) |

---

## Release Schedule

| Version | Phase | Theme | Key Deliverables |
| --- | --- | --- | --- |
| **v6.0** | Phase 6 | Architecture Renaissance | TypeScript migration, Store V2, main.ts ≤ 200, bundle optimization |
| **v6.1** | Phase 7 | Backend Overhaul | Supabase primary, RLS, Realtime, Supabase Auth, Edge Functions, Sheets as mirror |
| **v6.2** | Phase 8 | Security & Hardening | CSP via headers, PII encryption, audit trail, SAST in CI |
| **v6.3** | Phase 9 | UX Excellence | axe-core gate, multi-browser E2E, i18n RTL/LTR, performance budgets |
| **v6.4** | Phase 10 | Intelligence & Automation | WhatsApp Cloud API, communication hub, advanced analytics, smart automation |
| **v6.5** | Phase 11 | Platform & Ecosystem | Cloudflare Pages, plugin v2, developer experience, multi-tenant evaluation |

---

## Constraints (Non-Negotiable)

| Constraint | Detail |
| --- | --- |
| Runtime deps | **Zero** — TypeScript compiles away. All third-party is devDeps or server-side (Edge Functions) only. |
| Cost | **$0** — Cloudflare Pages free + Supabase free + Resend free. No paid infrastructure required. |
| Language | Hebrew RTL primary, English + Arabic + Russian lazy-loaded |
| Build | Vite — single `dist/` output. Pure ESM. |
| Auth | Supabase Auth (Google, Facebook, Apple, anonymous). Email allowlist for admin role. |
| Data ownership | Couple owns their data. Export to CSV/JSON/Sheets always available. No vendor lock-in. |
| Browser support | Last 2 versions of Chrome, Firefox, Safari, Edge |
| Accessibility | WCAG 2.2 AA minimum. Target AAA on core flows (RSVP, check-in). |
| Tests | All pass, 0 skip, 0 Node warnings. Coverage gates enforce thresholds. |
| Lint | 0 errors, 0 warnings (ESLint + Stylelint + HTMLHint + markdownlint). |

---

## Principles

1. **Zero runtime deps** — ship only our code. Build tools, test runners, linters are devDeps.
2. **TypeScript strict** — catch bugs at compile time. No `any`. Discriminated unions for domain types.
3. **Explicit > implicit** — `import { fn }` not `window.fn()`. Typed constants not magic strings.
4. **Lazy by default** — sections load JS + HTML on first visit. Locales on demand. Templates on navigation.
5. **Reactive store** — single source of truth. Batch mutations. Scoped subscriptions. Zero leaks.
6. **Security at every layer** — CSP headers, PII encryption, RLS, audit trail, sanitize all input.
7. **Mobile-first** — design for 360px, enhance for desktop. Touch targets ≥ 48px.
8. **Offline-capable** — IndexedDB + write queue + SW. Graceful online/offline transitions.
9. **Real-time collaborative** — Supabase Realtime for live updates. Conflict resolution for diverged edits.
10. **i18n everywhere** — `t()` for JS, `data-i18n` for HTML. ICU plurals. RTL↔LTR dynamic.
11. **Tested at every layer** — unit + integration + E2E + a11y + visual + performance. Gates in CI.
12. **$0 infrastructure** — free tiers only. Cloudflare + Supabase + Resend. No credit card required.
13. **Data ownership** — couple can export everything. Sheets mirror optional. No lock-in.

---

## Google Sheets Schema (Legacy / Migration Reference)

| Tab | Columns | Direction |
| --- | --- | --- |
| Attendees | Id · FirstName · LastName · Phone · Email · Count · Children · Status · Side · Group · Meal · MealNotes · Accessibility · Transport · TableId · Gift · Notes · Sent · CheckedIn · RsvpDate · CreatedAt · UpdatedAt | Read + Write |
| Tables | Id · Name · Capacity · Shape | Read + Write |
| Config | Key · Value (wedding info key-value pairs) | Read + Write |
| Vendors | Id · Category · Name · Contact · Phone · Price · Paid · Notes · DueDate · CreatedAt · UpdatedAt | Write |
| Expenses | Id · Category · Amount · Description · Date · CreatedAt | Write |
| Budget | Id · Category · Amount · Description · Date · CreatedAt | Write |
| Timeline | Id · Time · Title | Write |
| Contacts | Id · Name · Phone · Email · Notes | Write |
| Gallery | Id · Url · Caption · UploadedAt | Write |
| RSVP_Log | Timestamp · Phone · Name · Status · Count · Meal | Append-only |
| TimelineDone | Key · Value (done state map) | Read + Write |

> This schema is preserved for migration reference. New development targets Supabase PostgreSQL (see Phase 7).

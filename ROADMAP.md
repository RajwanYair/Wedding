# Wedding Manager — Roadmap v5.0

> A strategic review and forward-looking plan for a best-in-class wedding management SPA.
> Last updated: 2026-04-16 · Current release: v4.7.0

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Architectural Debt & Decision Review](#architectural-debt--decision-review)
3. [Strategic Decisions for v5](#strategic-decisions-for-v5)
4. [Completed Sprints (v3.0–v4.7)](#completed-sprints-v30v47)
5. [Phase 1 — Foundations (v5.0)](#phase-1--foundations-v50)
6. [Phase 2 — Backend Evolution (v5.1)](#phase-2--backend-evolution-v51)
7. [Phase 3 — UX & Accessibility (v5.2)](#phase-3--ux--accessibility-v52)
8. [Phase 4 — Intelligence & Automation (v5.3)](#phase-4--intelligence--automation-v53)
9. [Phase 5 — Platform & Ecosystem (v5.4)](#phase-5--platform--ecosystem-v54)
10. [Success Metrics](#success-metrics)
11. [Constraints](#constraints-non-negotiable)
12. [Key Principles](#key-principles)

---

## Current State Assessment

### What We Have (v4.7.0)

```text
Frontend     HTML5 + vanilla CSS3 (@layer + nesting) + vanilla JS (ES2025, ESM)
Build        Vite 8 · src/main.js entry · zero runtime deps
Backend      Google Sheets via Apps Script Web App + optional Supabase + "both" mode
Auth         Google · Facebook · Apple OAuth + email allowlist + anonymous guest
Deploy       GitHub Pages (free) · $0 infrastructure
Tests        1776+ passing (17+ suites) · Vitest + Playwright E2E
Lint         0 errors · 0 warnings (ESLint 10 + Stylelint 17 + HTMLHint + markdownlint)
Bundle       < 30 KB gzip main · < 15 KB gzip RSVP-only chunk
Sections     18 feature modules with mount/unmount lifecycle
Templates    15 HTML fragments · 7 modal fragments (lazy-loaded)
i18n         Hebrew RTL primary · English toggle (lazy JSON)
PWA          Service Worker · manifest.json · offline queue · push notifications
```

### What's Working Well

| Area | Strength |
| --- | --- |
| **Architecture** | Clean ESM modules, `data-action` delegation, Proxy-based reactive store |
| **CSS** | 7 `@layer` cascade layers, native nesting, 5 themes, dark/light, glassmorphism |
| **Zero deps** | No React, no Tailwind, no lodash — pure platform APIs |
| **Testing** | 1776+ tests, integration + unit + E2E, coverage gates in CI |
| **Security** | CSP headers, `sanitize()` for all input, no `innerHTML`, SRI hashes |
| **Offline** | localStorage-first, write queue with retry, service worker caching |
| **i18n** | Every string is either `data-i18n` or `t('key')`, full he+en coverage |
| **CI/CD** | 6-job pipeline: lint, test (Node 22+24), security, Lighthouse, size, E2E |
| **PWA** | Installable, offline-capable, push notifications, A2HS support |

---

## Architectural Debt & Decision Review

All major decisions made during v3–v4 are reviewed here with honest assessments.

### 1. `src/main.js` is a God Module (~1,700 lines)

**Problem:** 98+ `data-action` handler registrations live in main.js (lines 550–1400). Adding any feature requires editing this single file. Handler logic is copy-pasted — form-value extraction duplicated 10+ times with identical `getVal()` closures.

**Decision:** Extract handlers into co-located files under `src/handlers/`. Main.js should be ≤300 lines (bootstrap + imports).

### 2. `js/` Legacy Directory Still Exists (38 files, ~2,000 lines)

**Problem:** The entire `js/` folder is excluded from linting and not loaded by Vite. It was kept for "backward compat" but nothing in `src/` imports from it. It contains duplicated logic (`offline-queue.js`, `config.js`, `auth.js`, `store.js`).

**Decision:** Audit each file. Migrate anything still needed to `src/`. Delete the rest. Target: remove `js/` entirely.

### 3. Two Configs, Two Auth, Two Offline Queues

**Problem:** `js/config.js` and `src/core/config.js` both define `ADMIN_EMAILS`, `GOOGLE_CLIENT_ID`, etc. `js/offline-queue.js` has retry logic (`MAX_RETRIES=5`, `BASE=10s`) that conflicts with `src/services/sheets.js` (`MAX_RETRIES=4`, `BASE=2s`). Two different retry strategies for the same purpose.

**Decision:** Single source of truth in `src/`. Remove all `js/` duplicates. Align retry strategy.

### 4. No TypeScript — JSDoc Only (Partially Applied)

**Problem:** `tsconfig.json` exists but only checks `js/` (the legacy folder that's excluded from lint). `src/` has JSDoc annotations but no type checking enabled. Section code frequently casts with `/** @type {any[]} */`.

**Decision:** Enable `checkJs: true` for `src/` in tsconfig. Add `@typedef` for all data models (`Guest`, `Table`, `Vendor`, `Expense`, `WeddingInfo`). Add `tsc --noEmit` to CI. Stay with JS — no full TS migration (preserves zero-deps principle).

### 5. Hardcoded Section Lists (Duplicated in 3 Places)

**Problem:** The section names exist in `src/main.js` (SECTIONS object), `src/core/nav.js` (`_sections` array), and `src/core/template-loader.js` (`_loaders` map). Adding a section requires updating all three files.

**Decision:** Single `src/core/constants.js` exporting `SECTIONS`, `MODALS`, `PUBLIC_SECTIONS`, `SECTION_LIST`. All modules import from there.

### 6. Google Sheets Column Order is a Landmine

**Problem:** `_COL_ORDER` in `sheets-impl.js` must exactly match the GAS server column expectations. Zero runtime validation. If schema drifts between client and server: silent data corruption.

**Decision:** Add GAS `getSchema` endpoint. Client validates column order on first sync. Mismatch → warning toast + abort sync rather than corrupt data.

### 7. Template Loader Map is Hardcoded

**Problem:** `_loaders` in `template-loader.js` manually lists every template import path. Must stay in sync with the filesystem — no auto-discovery.

**Decision:** Replace with `import.meta.glob("../templates/*.html", { query: "?raw", eager: false })` — automatic discovery of all template files.

### 8. No `beforeunload` Flush — Data Loss Window

**Problem:** `store.js` debounces localStorage writes by 250ms. If the user closes the browser tab in that window, the last edit is lost.

**Decision:** Add `window.addEventListener("beforeunload", storeFlush)` in bootstrap. Critical for mobile users who switch apps rapidly.

### 9. Event Handler Error Boundary Missing

**Problem:** If a `data-action` handler throws, the error propagates unhandled. The action silently fails for the user. Other handlers are unaffected but the user has no indication of the failure.

**Decision:** Wrap handler dispatch in `events.js` with try-catch + error toast. Log to console in dev, show toast in production.

### 10. Supabase Integration is Shallow

**Problem:** Anon key stored in plain localStorage (readable by any script). No Row-Level Security documentation. No real-time subscriptions (just polling). Bulk operations use DELETE + INSERT (not atomic).

**Decision:** Add RLS policy templates and SQL migration scripts. Evaluate Supabase Realtime for live updates. Encrypt credentials if stored client-side. Document security requirements prominently.

### 11. Documentation is Massive but Fragmented

**Problem:** 8+ markdown files (`README`, `CHANGELOG`, `CLAUDE`, `ARCHITECTURE`, `ROADMAP`, `GUIDE`, `CONTRIBUTING`, `SECURITY`) + 3 instruction files + copilot-instructions. High content overlap. Version numbers must be updated in 12+ places on every release.

**Decision:** Consolidate to 5 files: `README` (user-facing), `ARCHITECTURE` (technical), `ROADMAP` (strategic), `CHANGELOG` (history), `CONTRIBUTING` (dev guide). Move `CLAUDE.md` content into copilot-instructions. Merge `GUIDE.md` into `README`. Single `VERSION` constant — derive all doc versions from `package.json`.

### 12. WhatsApp Integration Depends on Paid Service

**Problem:** Green API costs $5–10/month and requires a WhatsApp Business Account. Manual `wa.me` deep links are free but require the user to click each one individually.

**Decision:** Default to `wa.me` deep links (always free). Green API stays as optional premium feature. Investigate WhatsApp Business Cloud API (free tier: 1,000 service conversations/month) as a future replacement.

### 13. No Automated Testing for GAS Backend

**Problem:** `sheets-webapp.gs` has complex server-side logic (`ensureSheets`, `replaceAll`, `mergeConflict`, rate limiting) but zero tests. Every change is manually tested.

**Decision:** Add `@google/clasp` for GAS development (version-controlled push/pull). Write unit tests with mocked `SpreadsheetApp`. Run in CI.

### 14. Bundle Could Be Smaller with Lazy Section JS

**Problem:** 30 KB gzip is good but not optimal. All 18 section modules are imported eagerly in `main.js` even though only 1–3 are needed on initial load. Only HTML templates are lazy-loaded.

**Decision:** True lazy section imports — only import section JS when the user navigates to that section. Target: <20 KB initial, <10 KB RSVP-only.

---

## Strategic Decisions for v5

### Keep (Non-Negotiable Architecture)

| Decision | Rationale |
| --- | --- |
| **Vanilla JS (no framework)** | Zero runtime deps is the core identity. Platform APIs are mature enough in 2026. |
| **GitHub Pages deploy** | $0 hosting, excellent CDN, no vendor lock-in. |
| **Google Sheets as primary backend** | Free, familiar, shareable. The couple can see their data in a spreadsheet. |
| **Hebrew RTL primary** | Target audience. English as secondary (lazy-loaded). |
| **ESM modules + Vite** | Modern, fast, standard. No webpack/rollup complexity. |
| **CSS custom properties + @layer** | Future-proof, no preprocessor dependency, native cascade control. |
| **`data-action` event delegation** | Clean separation of HTML and JS. Scalable event handling. |

### Change

| Area | From (v4.x) | To (v5.x) | Why |
| --- | --- | --- | --- |
| **main.js** | 1,700-line god module | ≤300 lines + handler modules | Single responsibility |
| **Section loading** | Eager JS + lazy HTML | Lazy JS + lazy HTML | Smaller initial bundle |
| **Type checking** | JSDoc on `js/` only | JSDoc + `@typedef` on `src/`, checked in CI | Catch bugs at build time |
| **Constants** | Duplicated arrays in 3 files | Single `constants.js` export | DRY |
| **Legacy `js/`** | 38 files, excluded from lint | Migrate or delete entirely | Remove dead code |
| **Docs** | 8 markdown files | 5 files | Reduce maintenance burden |
| **Template loader** | Hardcoded map | `import.meta.glob` auto-discovery | Zero manual sync |
| **Error handling** | Silent failures in ~10 paths | Error boundary + toast in events.js | Users know when things fail |
| **Store flush** | 250ms debounce only | Debounce + `beforeunload` flush | No data loss on tab close |
| **GAS development** | Manual copy-paste | `@google/clasp` + tests in CI | Confidence in backend |
| **Storage** | localStorage only (5 MB limit) | IndexedDB with localStorage fallback | Large guest lists |

### Evaluate (Decide During Implementation)

| Idea | Upside | Downside | Decide By |
| --- | --- | --- | --- |
| **Supabase Realtime** | True live collaboration, no polling | Adds Supabase dependency, free tier limits | v5.1 |
| **WhatsApp Cloud API** | Free tier (1K/month), official Meta API | Requires business verification, complex auth | v5.3 |
| **IndexedDB** | 50× more storage than localStorage | Async API, migration complexity | v5.1 |
| **Web Components** | Encapsulated sections, native shadow DOM | Learning curve, SSR complexity | v5.4 |
| **ICU MessageFormat** | Proper plurals, gender, complex formatting | Extra complexity, more i18n maintenance | v5.2 |
| **Cloudflare Pages** | Edge functions, faster globally, free tier | Moves off GitHub Pages (constraint change) | v5.4 |
| **Deno/Bun runtime** | Faster tests, native TS support | Node ecosystem compatibility concerns | Monitor |

---

## Completed Sprints (v3.0–v4.7)

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

### Current State Summary

```text
index.html     ~430 lines (shell only — sections lazy-loaded)
src/           20 section modules · 10 core modules · 5 services · 6 utils
               5 handler modules · 15 template HTML files · 7 modal HTML files
               2 i18n JSON files (migrated from js/) · types.d.ts
js/            38 legacy modules (excluded from lint — partial migration done)
Tests          1776+ passing (17 suites) · 0 Node warnings
Lint           0 errors · 0 warnings (ESLint + Stylelint + HTMLHint + markdownlint)
Bundle         < 30 KB gzip main · < 15 KB gzip RSVP-only chunk
CI             6 jobs: lint+test (Node 22+24) · security · Lighthouse · size · E2E
Auth           Google/Facebook/Apple OAuth + email allowlist + anonymous guest
Sheets sync    11 tabs: Attendees, Tables, Config, Vendors, Expenses, Budget,
               Timeline, Contacts, Gallery, RSVP_Log, TimelineDone
main.js        707 lines (down from 1,720 — 59% reduction via handler extraction)
```

---

## Phase 1 — Foundations (v5.0)

> **Theme:** Clean the house. Remove debt. Strengthen the core.

### F1.1 — Break Up the God Module ✅

| # | Task | Size | Status |
| --- | --- | --- | --- |
| 1.1 | Create `src/core/constants.js` — export `SECTIONS`, `MODALS`, `PUBLIC_SECTIONS` | S | ✅ Done |
| 1.2 | Extract `src/handlers/guest-handlers.js` — all guest modal + CRUD actions | L | ✅ Done |
| 1.3 | Extract `src/handlers/table-handlers.js` — table CRUD + seating actions | M | ✅ Done |
| 1.4 | Extract `src/handlers/vendor-handlers.js` — vendor + expense actions | M | ✅ Done |
| 1.5 | Extract `src/handlers/modal-handlers.js` — shared `openAddModal` factory + close | M | ✅ Done (in form-helpers.js) |
| 1.6 | Extract `src/handlers/settings-handlers.js` — backend, sync, export actions | M | ✅ Done |
| 1.7 | Extract `src/utils/form-helpers.js` — shared `getFormValues(container, schema)` | S | ✅ Done |
| 1.8 | Slim `main.js` to bootstrap-only: init store → auth → router → import handlers | L | ✅ 707 lines (59% reduction) |

**Exit:** main.js 707 lines. All handlers in `src/handlers/`. All 1776 tests pass. Lint green.

### F1.2 — Delete Legacy `js/` Directory (partial)

| # | Task | Size | Status |
| --- | --- | --- | --- |
| 2.1 | Audit: trace every `js/*.js` import chain, identify what's still loaded at runtime | M | ✅ Done |
| 2.2 | Migrate `js/i18n/he.json` + `js/i18n/en.json` → `src/i18n/` | S | ✅ Done |
| 2.3 | Unify `js/config.js` constants into `src/core/config.js` (single source) | S | ✅ Done (inject-config patched) |
| 2.4 | Align `js/offline-queue.js` retry logic into `src/services/sheets.js` | S | ⏳ Deferred |
| 2.5 | Delete all remaining `js/*.js` files | M | ⏳ Blocked (6 modules lack src/ equivalents) |
| 2.6 | Remove `js/` from `tsconfig.json`, update `.gitignore` | S | ✅ Done (tsconfig, vite, CI updated) |
| 2.7 | Update all documentation references from `js/` to `src/` | S | ⏳ Deferred (tests still reference js/) |

**Exit:** i18n migrated. Config unified. Full deletion blocked pending migration of 6 standalone js/ modules.

### F1.3 — Type Safety via JSDoc ✅ (partial)

| # | Task | Size | Status |
| --- | --- | --- | --- |
| 3.1 | Create `src/types.d.ts` — `Guest`, `Table`, `Vendor`, `Expense`, `WeddingInfo` interfaces | M | ✅ Done |
| 3.2 | Update `tsconfig.json`: include `src/`, enable `strict: true`, `noImplicitAny: true` | S | ✅ src/ included (strict deferred) |
| 3.3 | Fix type errors surfaced by strict mode (estimate: 20–40) | L | ⏳ Deferred |
| 3.4 | Add `tsc --noEmit` step to CI pipeline | S | ⏳ Deferred |
| 3.5 | Add `@satisfies` / `@type` annotations to all store get/set operations | M | ⏳ Deferred |

**Exit:** `src/types.d.ts` created with 11 interfaces. tsconfig includes src/. Strict mode deferred.

### F1.4 — Template Auto-Discovery ✅

| # | Task | Size | Status |
| --- | --- | --- | --- |
| 4.1 | Replace `_loaders` map with `import.meta.glob("../templates/*.html", { query: "?raw" })` | M | ✅ Done |
| 4.2 | Replace `_modalLoaders` with same pattern for `../modals/*.html` | S | ⏳ Deferred |
| 4.3 | Add warning log when template/modal not found (instead of silent return) | S | ⏳ Deferred |

**Exit:** Template loader uses glob auto-discovery. Adding a new section requires no template-loader edits.

### F1.5 — Error Resilience ✅

| # | Task | Size | Status |
| --- | --- | --- | --- |
| 5.1 | Wrap handler dispatch in `events.js` with try-catch + error toast | S | ✅ Done |
| 5.2 | Add `window.addEventListener("beforeunload", storeFlush)` in bootstrap | S | ✅ Done |
| 5.3 | Add localStorage quota detection in `store.js` — toast "Storage full" on failure | S | ✅ Done (console.warn) |
| 5.4 | Add `console.assert` validation in `sheets-impl.js` for column order | S | ⏳ Deferred |
| 5.5 | Add `onStorageError` callback in store for UI notification | S | ⏳ Deferred |

**Exit:** All event dispatch paths wrapped with try-catch. beforeunload flush. Store quota warnings.

### F1.6 — Lazy Section JS ✅

| # | Task | Size | Status |
| --- | --- | --- | --- |
| 6.1 | Convert section imports from eager to `import.meta.glob` + `await import()` on navigation | L | ✅ Done |
| 6.2 | Eagerly load only `landing.js` + `rsvp.js` + `dashboard.js` (entry sections) | M | ⏳ Deferred |
| 6.3 | Add `prefetchSection(name)` using `requestIdleCallback` | S | ⏳ Deferred |
| 6.4 | Update Vite manual chunks config to produce per-section chunks | M | ⏳ Deferred |

**Exit:** 19 section modules lazy-loaded via import.meta.glob. Cached after first load.

### F1.7 — Documentation Consolidation

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 7.1 | Merge `GUIDE.md` content into `README.md` (usage section) | S | Fewer files to maintain |
| 7.2 | Merge `CLAUDE.md` into `.github/copilot-instructions.md` | S | Single AI instruction source |
| 7.3 | Delete `GUIDE.md` and `CLAUDE.md` | S | Cleaner root directory |
| 7.4 | Add automated version sync script that reads `package.json` and patches all docs | M | End 12-place manual updates |

**Exit:** 5 root docs remain: `README`, `ARCHITECTURE`, `ROADMAP`, `CHANGELOG`, `CONTRIBUTING`. Version string auto-synced.

---

## Phase 2 — Backend Evolution (v5.1)

> **Theme:** Make the data layer production-grade.

### F2.1 — GAS Backend Hardening

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 1.1 | Add `getSchema` GAS action — returns column order + sheet names + GAS version | M | Client validates schema |
| 1.2 | Client-side schema validation on first sync (compare returned schema vs `_COL_ORDER`) | M | Detect drift before corruption |
| 1.3 | API version handshake — client sends `clientVersion`, GAS rejects if incompatible | S | Safe client/server upgrades |
| 1.4 | Set up `@google/clasp` for GAS development workflow (push/pull/deploy) | M | Version-controlled backend |
| 1.5 | Write GAS unit tests (mock `SpreadsheetApp`, test `ensureSheets`, `replaceAll`) | L | Backend test coverage |
| 1.6 | Handle GAS 429 Too Many Requests (exponential backoff in `sheetsPost`) | S | Resilience under load |

**Exit:** GAS code managed via clasp. Schema validated on every sync cycle. GAS tests run in CI.

### F2.2 — Supabase Production-Ready

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 2.1 | Ship SQL migration scripts for all 9 tables (`supabase/migrations/`) | M | Reproducible setup |
| 2.2 | Add Row-Level Security policies — guests read own, admin CRUD all | L | Data security |
| 2.3 | Evaluate Supabase Realtime channels for live sync (replace 30s polling) | M | True collaboration |
| 2.4 | Implement Realtime subscription if evaluation passes | L | Eliminate polling |
| 2.5 | Add connection health check with auto-fallback to Sheets | S | Graceful degradation |
| 2.6 | Encrypt anon key in localStorage (AES-GCM with user-derived key) | M | Credential protection |

**Exit:** Supabase usable as standalone production backend. RLS enforced. Migration scripts versioned in repo.

### F2.3 — IndexedDB Storage Layer

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 3.1 | Create `src/core/storage.js` abstraction: `storageGet` / `storageSet` / `storageDel` | M | Single storage API |
| 3.2 | Implement IndexedDB adapter (idb-keyval pattern, ~60 lines, zero deps) | M | 50× more storage capacity |
| 3.3 | Auto-migrate existing localStorage data to IndexedDB on first run | M | Seamless upgrade |
| 3.4 | Fallback chain: IndexedDB → localStorage → in-memory | S | Never crash on storage |
| 3.5 | Update `store.js` to use new async storage API | L | Breaking internal change |

**Exit:** App stores data in IndexedDB. Old localStorage auto-migrated. Guest lists > 5 MB work. Fallback chain tested.

### F2.4 — Offline Queue Unification

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 4.1 | Consolidate retry logic: single `MAX_RETRIES`, `RETRY_BASE_MS` in `sheets.js` | S | One retry strategy |
| 4.2 | Add queue persistence to IndexedDB (survive browser restart) | M | Truly offline-first |
| 4.3 | Add queue drain progress indicator in settings | S | User visibility |
| 4.4 | Flush queue on `navigator.onLine` + `visibilitychange` events | S | Faster sync recovery |

**Exit:** Single retry strategy. Queue survives restart. Progress visible to user.

---

## Phase 3 — UX & Accessibility (v5.2)

> **Theme:** Polish the experience. Meet WCAG 2.2 AA.

### F3.1 — Accessibility Audit

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 1.1 | Integrate `@axe-core/playwright` in E2E suite — automated a11y gate in CI | M | Catch regressions |
| 1.2 | Ensure `aria-live="polite"` on all dynamic content update regions | S | Screen reader support |
| 1.3 | Ensure all interactive elements have `:focus-visible` styles | M | Keyboard navigation |
| 1.4 | Add `prefers-reduced-motion` media query to all CSS animations | S | Vestibular disorders |
| 1.5 | Verify color contrast ≥ 4.5:1 across all 5 themes + light mode | M | Visual impairment |
| 1.6 | Add `role="alert"` to toast notifications | S | Screen reader announcements |
| 1.7 | Add `role="status"` to sync indicator | S | Activity awareness |

**Exit:** axe-core CI gate passes on all pages. WCAG 2.2 AA compliance verified. Lighthouse Accessibility ≥ 0.98.

### F3.2 — i18n Expansion

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 2.1 | Add Arabic locale (`ar.json`) — shares RTL infrastructure with Hebrew | L | Broader audience |
| 2.2 | Add Russian locale (`ru.json`) — large Israeli demographic | M | Broader audience |
| 2.3 | Implement ICU MessageFormat for plurals: `{count, plural, one {# guest} other {# guests}}` | L | Correct grammar across locales |
| 2.4 | Use `Intl.DateTimeFormat` for all date rendering (locale-aware) | M | Proper locale formatting |
| 2.5 | Use `Intl.NumberFormat` for currency and number display | S | Correct currency symbols |

**Exit:** 4 locales (he, en, ar, ru). Plural forms correct. Dates/numbers locale-aware.

### F3.3 — Mobile Polish

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 3.1 | Haptic feedback on guest check-in (Vibration API) | S | Tactile confirmation |
| 3.2 | Ensure all touch targets ≥ 48×48 px (Material Design 3 guideline) | M | Finger-friendly |
| 3.3 | Bottom sheet pattern for modals on mobile (replace centered overlay) | L | Native mobile feel |
| 3.4 | Scroll-driven animations for timeline section (CSS `animation-timeline`) | M | Modern, smooth feel |
| 3.5 | Auto-detect `prefers-color-scheme` for light/dark mode | S | Respect system preference |

**Exit:** All touch targets ≥ 48px. Mobile modals are bottom sheets. LCP < 1.5s on 3G throttle.

---

## Phase 4 — Intelligence & Automation (v5.3)

> **Theme:** Smart features that save the couple time.

### F4.1 — Smart Suggestions

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 1.1 | Auto-suggest table assignments based on side + group + meal constraints | M | Save hours of manual work |
| 1.2 | Predict no-show rate from RSVP timing + pending/maybe historical patterns | M | Accurate headcount forecast |
| 1.3 | Suggest optimal follow-up timing for pending guests (days since invite) | S | Higher RSVP response rate |
| 1.4 | Budget forecast: confirmed headcount × per-plate cost vs. budget target | S | Financial planning |
| 1.5 | Vendor payment due reminders on dashboard (7d, 3d, overdue) | S | No missed payments |

### F4.2 — Communication Automation

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 2.1 | Scheduled WhatsApp reminders (1 week, 3 days, 1 day before event) | M | Zero manual follow-up |
| 2.2 | Evaluate WhatsApp Business Cloud API (free: 1K service conversations/mo) | M | Replace paid Green API |
| 2.3 | Post-wedding thank-you message queue (auto-send to checked-in guests) | M | Courteous automation |
| 2.4 | RSVP confirmation email with HTML template (via GAS `MailApp`) | M | Professional guest emails |
| 2.5 | Calendar invite (.ics file) generation for confirmed guests | S | Guest convenience |

### F4.3 — Advanced Analytics

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 3.1 | RSVP conversion funnel: invited → link clicked → form started → submitted | L | Understand drop-off points |
| 3.2 | Guest response time histogram (pure SVG, client-rendered) | M | Timing insights |
| 3.3 | Budget burn-down chart (committed vs. paid plotted over time) | M | Financial trajectory |
| 3.4 | Seating plan optimization score (conflict count + group-balance metric) | M | Quality measure |
| 3.5 | One-page executive summary PDF export (all key stats + charts) | L | Shareable report |

---

## Phase 5 — Platform & Ecosystem (v5.4)

> **Theme:** From app to platform. Enable extensibility and sharing.

### F5.1 — Developer Experience

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 1.1 | Auto-generate API docs from JSDoc (`typedoc` or custom script → HTML) | M | Contributor onboarding |
| 1.2 | Component gallery page — lightweight HTML page showing all UI states | L | Design system reference |
| 1.3 | Architecture Decision Records (ADRs) for major v5 decisions | M | Decision history |
| 1.4 | "Add a section" tutorial in CONTRIBUTING.md | S | Open-source readiness |
| 1.5 | Copilot custom agents per domain (guest, vendor, analytics) | M | AI-assisted development |

### F5.2 — Plugin Architecture (Evaluate)

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 2.1 | Define plugin API: `registerPlugin({ name, mount, unmount, routes, i18n })` | L | Extensibility |
| 2.2 | Move non-core sections to plugin pattern (gallery, registry, contact-collector) | L | Smaller core bundle |
| 2.3 | Document plugin authoring guide | M | Third-party extensions |

### F5.3 — Multi-Tenant / White-Label (Evaluate)

| # | Task | Size | Impact |
| --- | --- | --- | --- |
| 3.1 | Evaluate edge deployment (Cloudflare Pages/Workers) for dynamic features | M | Faster globally |
| 3.2 | Per-wedding custom URLs (`elior-tova.weddingapp.pages.dev`) | L | Professional branding |
| 3.3 | Theme/content template packages (pre-designed theme + default content) | XL | Onboarding acceleration |

---

## Success Metrics

| Metric | v4.7.0 Actual | v5.0 Target | v5.4 Target |
| --- | --- | --- | --- |
| `main.js` lines | ~1,700 | ≤ 300 | ≤ 200 |
| `js/` legacy files | 38 | 0 | 0 |
| Initial bundle (gzip) | < 30 KB | < 20 KB | < 15 KB |
| RSVP-only bundle (gzip) | < 15 KB | < 10 KB | < 8 KB |
| Lighthouse Performance | ≥ 0.90 | ≥ 0.95 | ≥ 0.98 |
| Lighthouse Accessibility | ≥ 0.95 | ≥ 0.98 | 1.00 |
| Test count | 1,776+ | 2,000+ | 2,500+ |
| Coverage (lines) | ≥ 80% | ≥ 85% | ≥ 90% |
| Type coverage (src/) | 0% checked | 100% (`tsc --noEmit`) | 100% (strict) |
| `window.*` cross-module | 0 | 0 | 0 |
| Duplicated section lists | 3 | 1 (constants.js) | 1 |
| Silent failure paths | ~10 | 0 | 0 |
| Locales | 2 (he, en) | 2 | 4 (he, en, ar, ru) |
| GAS backend tests | 0% | ≥ 50% | ≥ 80% |
| LCP (3G mobile) | ~2.5s | < 2.0s | < 1.5s |
| Root markdown files | 8 | 5 | 5 |

---

## Constraints (Non-Negotiable)

| Constraint | Detail |
| --- | --- |
| Deploy target | GitHub Pages — `https://rajwanyair.github.io/Wedding` |
| Primary backend | Google Sheets via Apps Script Web App |
| Runtime deps | **Zero** — all third-party is devDeps only |
| Language | Hebrew RTL primary, English lazy-loaded |
| Build | Vite — single `dist/` output |
| Auth | Email allowlist + Google / Facebook / Apple OAuth |
| Cost | $0 infrastructure — GitHub Pages + Google Sheets + Apps Script |
| Browser support | Last 2 versions of Chrome, Firefox, Safari, Edge |

---

## Key Principles

1. **Explicit over implicit** — `import { fn }` not `window.fn()`
2. **Lazy by default** — sections load JS + HTML on first visit only
3. **Section lifecycle** — `mount()`/`unmount()` for clean resource management
4. **Single source of truth** — reactive store drives all UI via subscriptions
5. **Progressive enhancement** — View Transitions, haptics, scroll animations degrade gracefully
6. **Security at every layer** — CSP, sanitization, server validation, rate limiting, RLS
7. **Zero runtime deps** — vanilla JS/CSS; build tools as devDeps only
8. **i18n everywhere** — `t('key')` for JS, `data-i18n` for HTML, ICU for plurals
9. **Mobile-first** — design for 360 px, enhance for desktop
10. **Offline-capable** — Service Worker + IndexedDB + write queue + `beforeunload` flush
11. **Type-safe** — JSDoc `@typedef` for all models, `tsc --noEmit` in CI
12. **Error-visible** — every failure surfaces via toast, log, or console — zero silent paths
13. **Single constant source** — section names, modal IDs, store keys defined once, imported everywhere

---

## Google Sheets Schema

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

---

## Release Schedule

| Version | Phase | Scope |
| --- | --- | --- |
| **v5.0** | Phase 1 — Foundations | Break up main.js, delete js/, types, lazy sections, error resilience, doc consolidation |
| **v5.1** | Phase 2 — Backend | GAS hardening + clasp, Supabase production, IndexedDB, queue unification |
| **v5.2** | Phase 3 — UX | Accessibility audit + CI gate, i18n expansion, mobile polish |
| **v5.3** | Phase 4 — Intelligence | Smart suggestions, communication automation, advanced analytics |
| **v5.4** | Phase 5 — Platform | Developer experience, plugin architecture evaluation, multi-tenant exploration |
# Wedding Manager — Roadmap

> Component-based SPA · Hebrew RTL · Vite 8 · Google Sheets sync · Zero Runtime Deps

## Constraints (Non-Negotiable)

| Constraint | Detail |
| --- | --- |
| Deploy target | GitHub Pages — `https://rajwanyair.github.io/Wedding` |
| Backend | Google Sheets via Apps Script Web App |
| Runtime deps | **Zero** — all third-party is devDeps only |
| Language | Hebrew RTL primary, English lazy-loaded |
| Build | Vite 8 — single `dist/` output |
| Auth | Email allowlist + Google / Facebook / Apple OAuth |
| Cost | $0 infrastructure — GitHub Pages + Google Sheets + Apps Script |

---

## Completed Sprints

| Sprint | Milestone | Version | Status |
| --- | --- | --- | --- |
| S0 — Kill `window.*` | Proper ES modules, `import`/`export`, `^_` varsIgnorePattern | v3.0.0-alpha.1 | ✅ Done |
| S1 — Split HTML | index.html → shell + 15 lazy templates + 6 modals | v3.0.0-alpha.2 | ✅ Done |
| S2 — Modern UI | View Transitions, skeleton screens, swipe nav, glassmorphism 2.0 | v3.0.0-beta.1 | ✅ Done |
| S3 — Backend | Exp. backoff, write queue, conflict resolution, RSVP_Log sync | v3.0.0-beta.2 | ✅ Done |
| S4 — Security | Session rotation, sanitize(), SRI, Workbox SW, Lighthouse ≥ 0.90 | v3.0.0-rc.1 | ✅ Done |
| S5 — GitHub DevOps | Issue/PR templates, Dependabot, branch protection, auto-release | v3.0.0-rc.1 | ✅ Done |
| S6 — Quality | Coverage-v8, 1407+ tests (106+ suites), coverage gate 80%/70% | v3.0.0-rc.2 | ✅ Done |
| S7 — Docs + Polish | Instruction files, GUIDE.md v3.8.0, ARCHITECTURE.md mermaid diagrams | v3.8.0 | ✅ Done |
| S8 — Analytics | Heatmap, funnel, vendor timeline, PDF/CSV export, delivery rate | v3.9.0 | ✅ Done |
| S9 — Multi-Event | Event namespace, switcher UI, per-event Sheets, import/export | v4.0.0 | ✅ Done |
| S10 — Real-time | Polling live sync, conflict resolution, presence indicator | v4.0.0 | ✅ Done |
| S11 — Quick Wins | Per-guest RSVP links, transport manifest, meal-per-table, batch ops, gift recording | v4.1.0 | ✅ Done |
| S12 — UX Upgrades | WhatsApp reminders, duplicate detection, QR check-in, drag-drop seating, RSVP deadline | v4.1.0 | ✅ Done |
| S13 — Guest Experience | Live countdown, plus-one names, thank-you messages, seating map, guest notes | v4.2.0 | ✅ Done |
| S14 — Admin Productivity | Multi-filter, budget widget, vendor due dates, event export, guest tags | v4.2.0 | ✅ Done |
| S15 — UX & Smart Features | Undo stack, shortcuts, auto-backup, activity feed, search highlight | v4.3.0 | ✅ Done |
| S16 — Day-Of & Advanced | Check-in sound, smart table assign, payment schedule, RSVP timeline, dietary cards | v4.3.0 | ✅ Done |
| S17 — Data Quality & Smart Insights | Full-text search, bulk meal, expense donut, table capacity colors, budget alert | v4.4.0 | ✅ Done |
| S18 — Sync, Forecast & Operations | Queue monitor, arrival forecast, batch checkin, timeline alarm, WhatsApp unsent filter | v4.4.0 | ✅ Done |
| S19 — Vendor Management & Guest Intelligence | Vendor quick-dial, VIP flag, vendor category card, follow-up list, bulk mark unsent | v4.5.0 | ✅ Done |
| S21–22 | Changelog viewer, Supabase presence, conflict modal, vendor/expense modal refactor | v4.6.0 | ✅ Done |
| S23–24 | Background sync, budget alerts, bulk export, gallery lightbox v2, timeline done sync, top-bar sync btn | v4.7.0 | ✅ Done |

### Current State (v4.7.0)

```text
index.html     ~430 lines (shell only — sections lazy-loaded)
src/           18 section modules · 9 core modules · 5 services · 5 utils
               15 template HTML files · 7 modal HTML files
Tests          1776+ passing (17 suites) · 0 Node warnings
Lint           0 errors · 0 warnings (ESLint + Stylelint + HTMLHint + markdownlint)
Bundle         < 30 KB gzip main · < 15 KB gzip RSVP-only chunk
CI             6 jobs: lint+test (Node 22+24) · security · Lighthouse · size · E2E
Auth           Google/Facebook/Apple OAuth + email allowlist + anonymous guest
Sheets sync    10 keys: guests, tables, vendors, expenses, budget, timeline, contacts, gallery, weddingInfo, timelineDone
```

---

## Active and Upcoming

### S8 — Analytics and Reporting

Richer dashboards with exportable reports.

| # | Task | Size |
| --- | --- | --- |
| 8.1 | Guest origin heatmap (groom/bride side by table) | M |
| 8.2 | RSVP funnel report (invited → confirmed → checked-in) | M |
| 8.3 | Vendor payment timeline chart | M |
| 8.4 | Export PDF report (print CSS optimized) | L |
| 8.5 | WhatsApp delivery rate tracking | S |

**Exit**: Analytics charts exportable as SVG/PDF. CI green.

### S9 — Multi-Event Support

Support managing multiple weddings from one app instance.

| # | Task | Size |
| --- | --- | --- |
| 9.1 | Event namespace in localStorage (`wedding_v1_{eventId}_*`) | L |
| 9.2 | Event switcher UI (top-bar selector) | M |
| 9.3 | Per-event Google Sheet binding | M |
| 9.4 | Import/export zip per event | M |

**Exit**: 2+ events can coexist. All data isolated by eventId. CI green.

### S10 — Real-time Collaboration

Live updates between multiple admin devices.

| # | Task | Size |
| --- | --- | --- |
| 10.1 | Polling-based live sync (30 s interval, configurable) | M |
| 10.2 | Conflict resolution UI (diff view + accept/reject) | L |
| 10.3 | Presence indicator (who is editing) | M |
| 10.4 | WebSocket upgrade path via Apps Script | XL |

**Exit**: Two admins can edit simultaneously without data loss. CI green.

### S13 — Guest Experience & Communication

Enhanced guest-facing features and communication tools.

| # | Task | Size |
| --- | --- | --- |
| 13.1 | Live countdown timer (d:h:m:s, 1-second interval) | S |
| 13.2 | Plus-one names in RSVP (dynamic fields when count > 1) | M |
| 13.3 | Thank-you WhatsApp messages (post-wedding for checked-in guests) | M |
| 13.4 | Seating chart SVG map (floor plan with table shapes + guests) | L |
| 13.5 | Guest notes timeline (timestamped admin notes per guest) | M |

**Exit**: All 5 features functional. i18n complete. CI green.

### S14 — Admin Productivity

Power-user tools for efficient wedding management.

| # | Task | Size |
| --- | --- | --- |
| 14.1 | Multi-criteria guest filter (status + side + group + meal + table) | M |
| 14.2 | Budget summary widget on dashboard (target, committed, paid, remaining) | M |
| 14.3 | Vendor due dates + overdue indicators (date field + red highlight) | S |
| 14.4 | Export event summary (comprehensive text file with all stats) | M |
| 14.5 | Guest custom tags/labels (add/remove/display badges) | M |

**Exit**: All 5 features functional. i18n complete. CI green.

### S15 — UX & Smart Features

Polish and smart automation for a refined user experience.

| # | Task | Size |
| --- | --- | --- |
| 15.1 | Undo stack — Ctrl+Z for guest/table/vendor deletes | M |
| 15.2 | Keyboard shortcuts help overlay (? key opens modal) | S |
| 15.3 | Auto-backup scheduler (periodic JSON snapshots + download/restore) | M |
| 15.4 | Dashboard activity feed (recent changes log with timestamps) | M |
| 15.5 | Guest search highlight (mark matched text in search results) | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S16 — Day-Of & Advanced

Day-of operations tools and advanced analytics.

| # | Task | Size |
| --- | --- | --- |
| 16.1 | Check-in sound + visual flash alerts (Web Audio API beep) | S |
| 16.2 | Smart table optimizer (balance by side, group, dietary) | M |
| 16.3 | Vendor payment schedule view (timeline of upcoming/overdue) | M |
| 16.4 | RSVP response timeline (SVG chart of responses over time) | M |
| 16.5 | Printable dietary cards (per-table dietary requirement cards) | M |

**Exit**: All 5 features functional. i18n complete. CI green.

### S17 — Data Quality & Smart Insights (v4.4.0)

Richer search, batch operations, and visual analytics improvements.

| # | Task | Size |
| --- | --- | --- |
| 17.1 | Full-text guest search — extend to email, notes, group, meal, tags | S |
| 17.2 | Bulk meal assignment — batch toolbar selector for meal type | S |
| 17.3 | Expense category donut chart — visual breakdown in Analytics | M |
| 17.4 | Table capacity color indicators — green/yellow/red + overbooking banner | M |
| 17.5 | Budget overshoot alert — dashboard warning when committed > target | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S18 — Sync, Forecast & Operations (v4.4.0)

Operational intelligence and day-of efficiency improvements.

| # | Task | Size |
| --- | --- | --- |
| 18.1 | Offline sync queue monitor — badge + list of pending store keys | M |
| 18.2 | Guest arrival forecast — projected headcount using maybe/pending weights | M |
| 18.3 | Batch check-in by table — one tap to arrive all guests at a table | S |
| 18.4 | Timeline event alarm — browser notification / in-app banner for upcoming events | M |
| 18.5 | WhatsApp unsent filter shortcut — one-click unsent filter with count badge | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S19 — Vendor Management & Guest Intelligence (v4.5.0)

Vendor quick-contact and guest VIP/follow-up tools.

| # | Task | Size |
| --- | --- | --- |
| 19.1 | Vendor quick-dial — tel: + wa.me buttons in vendor action cell | S |
| 19.2 | Guest VIP/star flag — toggle ⭐ per guest, filter VIP-only | S |
| 19.3 | Vendor category dashboard card — cost/paid/overdue per category | M |
| 19.4 | Follow-up pending list — sent guests still showing `pending` status | M |
| 19.5 | Bulk mark as unsent — reset `sent=false` for selected guests | S |

**Exit**: All 5 features functional. i18n complete. CI green.

### S20 — Print, Reports & UX Polish (v4.5.0)

Printing workflows, UX refinements, and invitation analytics.

| # | Task | Size |
| --- | --- | --- |
| 20.1 | Guest name badges print — 3-up badge grid for confirmed guests | M |
| 20.2 | Timeline schedule print — full schedule in print window | S |
| 20.3 | Expense category filter — click category chip to filter expense rows | S |
| 20.4 | Invitation stats dashboard card — sent/unsent/RSVP rate summary | S |
| 20.5 | Accessibility check-in filter — ♿ button to show accessibility-needed guests | S |

**Exit**: All 5 features functional. i18n complete. CI green.

| Version | Sprint | Status |
| --- | --- | --- |
| v3.0.0–v3.8.0 | S0–S7 | ✅ Released |
| v3.9.0 | S8 | ✅ Released |
| v4.0.0 | S9 + S10 | ✅ Released |
| v4.1.0 | S11 + S12 | ✅ Released |
| v4.2.0 | S13 + S14 | ✅ Released |
| v4.3.0 | S15 + S16 | ✅ Released |
| v4.4.0 | S17 + S18 | ✅ Released |
| v4.5.0 | S19 + S20 | ✅ Released |
| v4.6.0 | S21 + S22 | ✅ Released |
| v4.7.0 | S23 + S24 | ✅ Released |

---

## Success Metrics

| Metric | v2 baseline | v4.7.0 actual | Target |
| --- | --- | --- | --- |
| `index.html` lines | 1 774 | ~430 | < 250 |
| Initial bundle (gzip) | ~45 KB | < 30 KB | < 30 KB ✅ |
| RSVP-only bundle | ~45 KB | < 15 KB | < 15 KB ✅ |
| Lighthouse Performance | 0.85 | ≥ 0.90 | ≥ 0.95 |
| Lighthouse Accessibility | 0.90 | ≥ 0.95 | ≥ 0.95 ✅ |
| Test count | 689 | 1 776+ | ≥ 1 400 ✅ |
| Coverage (lines) | ~60% | ≥ 80% | ≥ 80% ✅ |
| `window.*` cross-module | ~200 | 0 | 0 ✅ |
| ESLint varsIgnorePattern | 70+ prefixes | `^_` only | `^_` ✅ |
| Node warnings in `npm test` | 1 | 0 | 0 ✅ |

---

## Google Sheets Schema

| Tab | Columns | Direction |
| --- | --- | --- |
| Guests | Id · FirstName · LastName · Phone · Email · Count · Children · Status · Side · Group · Meal · TableId · Notes · … | Read + Write |
| Tables | Id · Name · Capacity · Shape | Read + Write |
| Config | Key · Value (wedding details) | Read + Write |
| Vendors | Id · Category · Name · Contact · Phone · Price · Paid · Notes | Write |
| Expenses | Id · Category · Amount · Description · Date | Write |
| RSVP_Log | Timestamp · Phone · Name · Status · Count | Append-only |

---

## Key Principles

1. **Explicit over implicit** — `import { fn }` not `window.fn()`
2. **Lazy by default** — admin sections load on first visit only
3. **Section lifecycle** — `mount()`/`unmount()` for clean resource management
4. **Single source of truth** — reactive store drives all UI via subscriptions
5. **Progressive enhancement** — View Transitions, swipe gestures degrade gracefully
6. **Security at every layer** — CSP + sanitization + server validation + rate limiting
7. **Zero runtime deps** — vanilla JS/CSS, build tools as devDeps only
8. **i18n everywhere** — `t('key')` for JS, `data-i18n` for HTML
9. **Mobile-first** — design for 360 px, enhance for desktop
10. **Offline-capable** — Service Worker + localStorage + write queue

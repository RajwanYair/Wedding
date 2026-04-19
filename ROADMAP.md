# Wedding Manager — Roadmap

> Component-based SPA · Hebrew RTL · Vite 8 · Supabase backend · Production-grade

## Vision

A best-in-class, zero-compromise wedding management application. Hebrew-first RTL SPA that runs entirely on free-tier infrastructure, works offline without degradation, and delivers a UI experience comparable to commercial wedding platforms — without their complexity, cost, or vendor lock-in.

**Scale:** 206 source files · 37K LOC · 4047 tests · 221 test files · 9 Supabase edge functions · 22 DB migrations

---

## Part I — Honest Architecture Audit

> Every major decision re-examined from first principles. What was right, what must change.

### 1. Backend: Google Sheets → Supabase

**What was decided:** Google Sheets via Apps Script as the sole backend. Free, familiar, zero-server.

**What actually happened:** Supabase was added as an upgrade path. The repo now has 22 DB migrations, 9 TypeScript edge functions, 53 service files oriented toward Supabase — but `BACKEND_TYPE = "sheets"` is hardcoded and `SUPABASE_URL = ""` is empty. The Supabase infrastructure is fully designed and dormant.

**Verdict — must change:** This split-brain state is the biggest architectural debt. Commit to Supabase as the authoritative backend now. Google Sheets survives only as an export/import format. **Reasons:**

- Supabase provides WebSocket real-time, row-level security, proper SQL, edge functions, and a $0 free tier (500MB DB + 5GB bandwidth)
- The Apps Script Web App has a 6-second execution timeout, 20 req/min rate limit, and no real-time capability
- RLS eliminates an entire class of authorization bugs that are hard to enforce at the JS layer
- Multi-event isolation is trivially enforced via `event_id` FK (migration 018) — impossible in Sheets

**Migration path:** Keep the `BACKEND_TYPE` env flag and `sheets.js` for the transition period, then delete it at v9.0.0 with a migration guide.

---

### 2. Zero Runtime Dependencies

**What was decided:** Absolutely no runtime package. Build tools only.

**What's right:** Eliminates supply-chain risk entirely. No `node_modules` baggage in the shipped bundle. Forces understanding of what code actually does.

**What's wrong:** The project has written custom versions of `sanitize()`, `crypto.js`, `state-machine.js`, `virtual-list.js`, `form-validator.js`, `retry-with-backoff.js`, and 85 other utilities. Some of these (especially security-related ones) are inferior to well-audited tiny libraries.

**Revised constraint:** Zero large framework dependencies. Security-critical functions where a battle-tested library with active CVE tracking is demonstrably safer are exceptions worth reconsidering:

| Function | Current | Better option | Size |
| --- | --- | --- | --- |
| HTML sanitization | custom `sanitize.js` | DOMPurify 3.x | 6 KB gzip |
| Schema validation | custom `schema-validator.js` | Valibot 1.x | 3 KB gzip |
| Date formatting | custom `date.js` | Intl APIs (zero bundle) | 0 KB |

**Decision:** Allow security/validation libs under 10 KB gzip when they have active CVE tracking and a proven security record. Everything else stays vanilla.

---

### 3. JavaScript vs TypeScript

**What was decided:** Vanilla JS with JSDoc type annotations. `tsconfig.json` for IDE type checking via `checkJs`.

**What's right:** Zero build friction, readable source, no compile step visible to maintainers.

**What's wrong:** JSDoc types are not enforced at CI time. The Supabase edge functions are already TypeScript. At 37K LOC, JSDoc annotations are inconsistently applied and provide weaker protection than full TypeScript. Critical paths (auth, store, services) have no runtime type guarantees.

**Decision:** Migrate strategically — not all at once. Target:

1. `src/core/` (22 files) → TypeScript first — highest blast radius from bugs
2. `src/services/` (53 files) → TypeScript — these call external APIs
3. `src/utils/` (91 files) → TypeScript gradually, pure functions are easy to migrate
4. `src/sections/` — last, keep as TSX-annotated JS for now

Keep `.js` extension and `allowJs` in tsconfig during transition. Full `.ts` target at v9.x.

---

### 4. Storage: localStorage vs IndexedDB

**What was decided:** `localStorage` with `wedding_v1_` prefix, 5–10 MB browser limit.

**What exists now:** `src/core/storage.js` implements a full IndexedDB adapter with localStorage fallback and memory fallback. It is written, tested, and not wired to the primary data path (state.js still calls `localStorage.getItem` directly).

**Verdict:** The storage upgrade is done but not deployed. Wire `storage.js` as the state.js backend. IndexedDB gives 50+ MB (browser-allowed storage by quota), batch write support, and async reads. For a 300-guest wedding with full history, this matters.

---

### 5. Admin Credentials in Source Code

**What was decided:** `ADMIN_EMAILS` hardcoded in `src/core/config.js`. Google Apps Script URL public in source.

**What's wrong:** These are checked into git history. The Apps Script URL + spreadsheet ID enable anyone who reads the repo to send writes to the sheet. Admin email list should never be in source.

**Decision:** Move all credentials to:

- GitHub Secrets → injected at build time via `scripts/inject-config.mjs` (already exists)
- Runtime: fetch from Supabase config table (RLS-protected) — already designed in migration 006

At minimum, the current hardcoded values must be rotated and the pattern changed before v8.1.0.

---

### 6. CSS Architecture

**What was decided:** 7 CSS modules with `@layer`, CSS nesting, custom properties, glassmorphism + 5 themes.

**What's right:** Excellent foundation. `@layer` cascade control is production-correct. Theme system via `body.theme-*` is clean.

**What to enhance:**

- Replace most viewport breakpoints with **CSS container queries** (`@container`) — allows components to respond to their container size, not the viewport. Significantly better for the mosaic layout
- Use **`color-mix()`** for tinting/shading theme colors instead of preset variants
- Add **`@starting-style`** for element enter/exit animations — native, no JS, respects `prefers-reduced-motion`
- Upgrade glassmorphism to use modern **`backdrop-filter: blur()` + `color-mix()`** for semantic color blends
- Remove any remaining `z-index` magic numbers → **`@layer`-scoped stacking contexts**

---

### 7. PWA Completeness

**What was decided:** Service Worker with precache, `manifest.json`, install prompt.

**What's actually there:** Lighthouse PWA target is 0.6 (warn) vs accessibility 0.95. The PWA implementation is present but under-invested compared to the rest of the quality bar.

**Must reach:** Lighthouse PWA ≥ 0.85 at minimum for a production wedding app where guests use it on their phones. This means:

- Proper offline fallback page (not just cached assets)
- Background Sync API for RSVP submissions that fail while offline
- Web Push for day-of reminders to guests
- App manifest with proper `display: standalone`, splash screens, shortcuts

---

### 8. Internationalization

**What was decided:** 4 languages (he/en/ar/ru). Hebrew primary, others lazy-loaded. Custom `t()` function.

**What's right:** `src/i18n/` structure, parity check at CI time, `data-i18n` binding pattern.

**What to enhance:**

- More of the Intl API. Currently re-implementing number/date/currency formatting in custom utils. `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` eliminate entire categories of formatting utilities
- Arabic requires RTL (`dir="rtl"`) — currently Hebrew gets RTL layout but Arabic might be getting it by accident. Make RTL explicit per-locale, not assumed
- `Intl.ListFormat` for Hebrew/Arabic guest summary strings

---

### 9. Testing

**What was decided:** Vitest + happy-dom for unit/integration, Playwright for E2E. 4047 tests in 221 files.

**What's right:** 1:1 ratio of source LOC to test LOC is excellent discipline. CI-gated coverage. Security scan in CI.

**Missing:**

- **Mutation testing** (Stryker.js) — tests that verify the tests themselves catch real bugs
- **Accessibility CI testing** — axe-core / @axe-core/playwright in every E2E run, not just visual smoke
- **Performance regression guard** — Playwright's `page.metrics()` to catch JS execution time regressions
- **Contract testing** for Supabase edge functions — type-safe integration tests, not just unit
- **Visual regression** — Playwright screenshot baseline comparisons for the 5 themes

---

### 10. Feature Scope vs Complexity

**What happened:** 91 utilities, 53 services. Several files appear aspirational: `ab-test.js`, `donation-tracker.js`, `vendor-proposals.js`, `sms-service.js`, `query-builder.js`. The plugin system (`src/core/plugins.js`) was designed but never had real consumers.

**Verdict:** Run a quarterly dead-export audit. Any export not imported within 90 days of creation should be removed or documented with a concrete activation plan. Feature sprawl at 37K LOC creates maintenance burden with no user-visible return.

---

## Part II — Current Release State

### Completed Sprints (v3.0.0 → v8.1.0)

| Sprint | Milestone | Version |
| --- | --- | --- |
| S0 — Kill `window.*` | ESM, `import`/`export`, `^_` varsIgnorePattern | v3.0.0 |
| S1 — Split HTML | Shell + 15 lazy templates + 6 modals | v3.0.0 |
| S2 — Modern UI | View Transitions, skeleton screens, swipe nav, glassmorphism 2.0 | v3.0.0 |
| S3 — Backend | Exponential backoff, write queue, conflict resolution, RSVP_Log sync | v3.0.0 |
| S4 — Security | Session rotation, sanitize(), SRI, SW, Lighthouse ≥ 0.90 | v3.0.0 |
| S5 — GitHub DevOps | Issue/PR templates, Dependabot, branch protection, auto-release | v3.0.0 |
| S6 — Quality | Coverage-v8, 1407+ tests, coverage gate | v3.0.0 |
| S7 — Docs + Polish | Architecture docs, Mermaid diagrams, README consolidation | v3.8.0 |
| S8 — Analytics | Heatmap, funnel, PDF/CSV export, delivery rate | v3.9.0 |
| S9 — Multi-Event | Event namespace, per-event data, switcher UI | v4.0.0 |
| S10 — Real-time | Polling live sync, conflict resolver, presence indicator | v4.0.0 |
| S11 — Quick Wins | Per-guest RSVP links, transport manifest, batch ops, gift recording | v4.1.0 |
| S12 — UX Upgrades | WhatsApp reminders, duplicate detection, QR check-in, drag-drop seating | v4.1.0 |
| S13 — Architecture | Supabase services, repositories, handlers, migrations 001–022 | v8.0.0 |
| S14 — Test Quality | 4047 tests, 221 files, centralized helpers, domain constants | v8.0.8 |
| S15 — Security | HSTS, COOP/COEP/CORP, ADMIN_EMAILS injection, check-credentials CI scan | v8.1.0 |
| S16 — IndexedDB | initStorage() + migrateFromLocalStorage() wired to bootstrap | v8.1.0 |
| S18 — PWA | offline.html, Background Sync RSVP, manifest share_target + 4 shortcuts | v8.1.0 |
| S19 — CSS Modern | @container, @starting-style, color-mix(), :has(), light-dark(), prefers-reduced-motion | v8.1.0 |
| S20 — TypeScript | noUncheckedIndexedAccess, Supabase types template | v8.1.0 |
| S21 — Testing | axe-core WCAG AA E2E, LCP < 2500ms performance assertion | v8.1.0 |
| S22 — Intl | Intl.RelativeTimeFormat, Intl.ListFormat, Intl.PluralRules | v8.1.0 |

### Current Release (v8.1.0)

```text
Source         206 JS files · 37,346 LOC
Tests          221 files · 33,992 LOC · 4047 passing · 0 fail · 0 warn
Lint           0 errors · 0 warnings (ESLint + Stylelint + HTMLHint + markdownlint)
Build          Vite 8 · per-section manual chunks · postbuild precache
Bundle         < 30 KB gzip main · < 15 KB gzip RSVP chunk
CI             6 jobs: lint+test (Node 22+24) · security scan · Lighthouse · size gate · E2E
Backend        BACKEND_TYPE="sheets" active · Supabase built but dormant
DB             22 migrations applied · 9 edge functions written (TypeScript)
Auth           Google/Facebook/Apple OAuth + email allowlist + anonymous guest
i18n           he (eager) + en/ar/ru (lazy) · parity-checked at CI time
```

---

## Part III — Active Roadmap

### Release Line

| Version | Goal | Status |
| --- | --- | --- |
| v8.0.x | Production cleanup baseline, test quality, dead-code removal | ✅ Current |
| v8.1.0 | Security hardening: credential rotation + CSP tightening + IndexedDB migration | ⏳ Next |
| v8.2.0 | Supabase activation: wire backend, deploy edge functions, validate RLS | 🔜 |
| v8.3.0 | PWA upgrade: offline fallback + Background Sync + push notifications | 🔜 |
| v8.4.0 | CSS modernisation: container queries + `@starting-style` + `color-mix()` | 🔜 |
| v8.5.0 | TypeScript migration: `src/core/` + `src/services/` → `.ts` | 🔜 |
| v9.0.0 | Google Sheets backend retired · Supabase sole backend · DOMPurify + Valibot added | 🔜 |
| v9.1.0 | AI features: seating optimizer, duplicate detection, RSVP personalization | 🔜 |
| v9.2.0 | Mobile PWA excellence: install UX, offline-first, share sheet, NFC check-in | 🔜 |
| v9.3.0 | Multi-tenant: multiple events per deployment, admin dashboard, event templates | 🔜 |
| v10.0.0 | Best-in-class: full TypeScript, Supabase Realtime, sub-50ms interactions | 🔜 |

---

### S15 — Security Hardening (v8.1.0)

**Goal:** Eliminate credential exposure, harden auth token storage, tighten CSP.

| Task | Detail | Priority |
| --- | --- | --- |
| Rotate credentials | Apps Script URL + spreadsheet ID exposed in git history. Rotate both. | 🔴 Critical |
| env-inject admin emails | Move `ADMIN_EMAILS` out of source into GitHub Secret → `inject-config.mjs` | 🔴 Critical |
| Auth token storage | Move session data from `localStorage` to `sessionStorage` + in-memory; use Supabase session management | 🟠 High |
| CSP: nonce or hash | Replace `'unsafe-inline'` remnants with nonce-based or hash-based directives | 🟠 High |
| Subresource Integrity | Extend SRI to cover all CDN-fetched OAuth SDK scripts | 🟡 Medium |
| HSTS preloading | Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | 🟡 Medium |
| Replace custom sanitize | Evaluate DOMPurify 3.x as a production dependency (6 KB gzip, active CVE tracking) | 🟡 Medium |

**Success gate:** `npm audit` 0 high/critical · CSP scan passes · No credentials in source

---

### S16 — IndexedDB Storage Migration (v8.1.0)

**Goal:** Wire `src/core/storage.js` as the primary storage backend, replacing direct `localStorage` calls.

| Task | Detail |
| --- | --- |
| Audit direct localStorage calls | Find every `localStorage.getItem/setItem` call outside `storage.js` and `state.js` |
| Migrate state.js | Replace `localStorage.*` calls with `storageGet/storageSet` from `storage.js` |
| Wire `initStorage()` | Call in `src/main.js` bootstrap before `load()` |
| Migrate existing data | `migrateFromLocalStorage()` already exists in `storage.js` — wire it on first run |
| Batch writes | Replace looped `storeSet` on save with `storageSetBatch()` for IndexedDB efficiency |
| Update tests | Storage tests exist; extend with migration path tests |

**Success gate:** `storageAdapterType()` returns `"indexeddb"` in CI environment, all 4047 tests pass

---

### S17 — Supabase Activation (v8.2.0)

**Goal:** Wire Supabase as the active backend. Deprecate Google Sheets write path.

| Task | Detail |
| --- | --- |
| Provision Supabase project | Create project, apply 22 migrations, configure RLS policies |
| Set GitHub Secrets | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` |
| Update `BACKEND_TYPE` | Default to `"supabase"` in injected config |
| Wire `supabase.js` | Confirm all CRUD operations work against real Supabase instance |
| Deploy edge functions | `supabase functions deploy` for all 9 functions; wire to app |
| Real-time subscriptions | Activate `supabase-realtime.js` — live guest/table sync across admin tabs |
| Supabase Auth | Optionally replace custom OAuth flow with Supabase Auth providers |
| Keep Sheets as export | `sheets-impl.js` survives as an export-to-spreadsheet feature, not live sync |
| Validate RLS | `rls-audit.js` service exists — wire it to CI sanity check |
| Update CI | Add `BACKEND_TYPE=supabase` env to CI lint+test job for integration coverage |

**Success gate:** `BACKEND_TYPE=supabase` · E2E smoke passes against Supabase · Google Sheets write path formally deprecated in changelog

---

### S18 — PWA Excellence (v8.3.0)

**Goal:** Lighthouse PWA ≥ 0.85. Offline-first. Push notifications delivered.

| Task | Detail |
| --- | --- |
| Offline fallback page | Serve `/offline.html` from SW cache when network request fails |
| Background Sync API | RSVP submissions queued via `sync` event when offline; auto-retry on reconnect |
| Web Push | Wire `push-notifications.js` service + `push-dispatcher` edge function; VAPID keys in Secrets |
| PWA manifest | Add `screenshots`, `shortcuts`, `share_target`, `handle_links` to `manifest.json` |
| Install UI | Improve "Add to Home Screen" prompt with custom install modal + deferred prompt |
| Splash screens | Generate iOS + Android splash screens via `generate-icons.mjs` |
| `display: standalone` | Verify status bar theming on iOS/Android via `meta theme-color` dynamic updates |
| Periodic background sync | Day-of reminders via Periodic Background Sync API (where supported) |

**Success gate:** Lighthouse PWA ≥ 0.85 in CI · Background Sync verified in E2E · Push delivery confirmed

---

### S19 — CSS Modernisation (v8.4.0)

**Goal:** Replace all viewport-based component breakpoints with container queries. Add native entry animations.

| Task | Detail |
| --- | --- |
| Container queries | Convert guest card, table card, vendor card, stat block to `@container` |
| `@starting-style` | Add entry animations for modals, toasts, cards without JS |
| `color-mix()` | Theme tinting: replace hardcoded tint variants with `color-mix(in oklch, ...)` |
| `prefers-reduced-motion` | Audit every CSS animation — ensure all respect `@media (prefers-reduced-motion)` |
| `@layer` stacking | Remove any remaining `z-index` magic numbers — encode in clearly named layers |
| `oklch` colors | Migrate primary palette from `hsl()` to `oklch()` for better perceptual uniformity |
| `:has()` selectors | Replace JS show/hide patterns with `:has()` where possible |
| `light-dark()` | Migrate light/dark mode from class toggles to native `light-dark()` function |

**Success gate:** 0 viewport media queries in component CSS · Lighthouse accessibility unchanged or improved

---

### S20 — TypeScript Migration (v8.5.0)

**Goal:** Migrate `src/core/` and `src/services/` to TypeScript. All other dirs stay JSDoc+checkJs.

| Task | Detail |
| --- | --- |
| Strict tsconfig | Enable `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` |
| Migrate `src/core/` | 22 files → `.ts` — start with `constants.ts`, `defaults.ts`, `store.ts` |
| Migrate `src/services/` | 53 files → `.ts` — Supabase client types are already generated |
| Generate Supabase types | `supabase gen types typescript` → `src/types/supabase.d.ts` |
| Migrate `src/utils/` pure functions | Simple pure helpers first: `phone.ts`, `date.ts`, `misc.ts`, sanitize |
| Update Vite config | Add `@vitejs/plugin-typescript` or rely on Vite's native `.ts` handling |
| Update ESLint | Switch to `typescript-eslint` rules for `.ts` files |

**Success gate:** `tsc --noEmit` exits 0 · No `any` in core/services without explicit suppression comment

---

### S21 — Dependency Audit + Calibrated Additions (v8.5.0)

**Goal:** Re-evaluate the zero-deps constraint. Add only what earns its place.

| Package | Justification | Size gzip | Decision |
| --- | --- | --- | --- |
| `dompurify` | Active CVE tracking, security audited, used by OWASP. Replaces custom `sanitize.js` for HTML contexts | 6 KB | ✅ Add |
| `valibot` | 3 KB, tree-shakeable schema validation. Replaces `schema-validator.js` + `sanitize()` coercion | 3 KB | ✅ Add |
| `@supabase/supabase-js` | Required for Supabase client. Realtime, auth, storage. Already partially abstracted in `supabase.js` | 30 KB | ✅ Add (already implicit) |
| `date-fns` / `temporal` | Use `Temporal` API (Stage 3, polyfill tiny) for all date logic | 8 KB | 🟡 Evaluate |
| Any UI framework | React/Vue/Svelte | N/A | ❌ Never — ESM vanilla is the identity of this project |
| `zod` | Too heavy vs valibot | 15 KB | ❌ No |
| Any CSS-in-JS | N/A | N/A | ❌ Never |

**Budget:** Total runtime addition ≤ 50 KB gzip including `@supabase/supabase-js`.

---

### S22 — AI-Powered Features (v9.1.0)

**Goal:** Use LLM/ML to make the app genuinely smarter than any alternative.

| Feature | Implementation | Detail |
| --- | --- | --- |
| Seating optimizer | Supabase Edge Function + `seating-algorithm.js` | Group-aware, constraint-satisfying seat assignment. Input: guests + constraints + tables. Output: optimal arrangement |
| Duplicate detection | `contact-dedup.js` service UI + Supabase | Fuzzy phone/name match across guest list. Suggest merge with confirmation UI |
| RSVP message personalization | OpenAI API via edge function | Input: guest profile (side, group, language pref). Output: personalized WhatsApp/SMS message draft |
| Budget anomaly detection | Client-side heuristics | Flag vendors with payment amounts ±30% from category average |
| RSVP trend analysis | `rsvp-analytics.js` UI + Chart.js-free SVG rendering | RSVP acceptance rate by invite wave, reminder impact, timeline to wedding |

**Success gate:** All AI features degrade gracefully when API unavailable · Edge function latency < 2s P95

---

### S23 — Best-in-Class PWA (v9.2.0)

**Goal:** The app should feel better than native apps for guests.

| Feature | Detail |
| --- | --- |
| NFC check-in | Web NFC API (`NDEFReader`) for tap-to-check-in at venue entrance |
| QR code generation | Inline SVG QR codes for per-guest RSVP links — no external library |
| Share Sheet integration | Web Share API + `share_target` PWA handler for receiving shared contacts |
| Camera-based QR scanning | `BarcodeDetector` API for QR code check-in (no library needed) |
| Haptic feedback | `navigator.vibrate()` for confirmation actions (check-in success, RSVP submitted) |
| Local font loading | `@font-face` with `font-display: swap` and subset Hebrew Noto Sans from self-hosted CDN |
| Viewport lock | `screen.orientation.lock("portrait")` during check-in mode on mobile |

---

### S24 — Multi-Tenant Events (v9.3.0)

**Goal:** Multiple weddings on one deployment. Full event isolation.

| Feature | Detail |
| --- | --- |
| Event creation UI | Create new wedding event with name, date, bride/groom, locale |
| Per-event URL routing | `/#/event/:id/dashboard` style routing with event context resolving from URL |
| Event templates | Pre-fill common vendor categories, table shapes, expense categories |
| Event sharing | Invite co-admins by email; per-event allowlist in Supabase config table |
| Event archiving | Mark event as past → read-only with exportable archive bundle |
| Cross-event analytics | Admin-level view: RSVP acceptance rates, cost-per-head across weddings |

---

## Part IV — Success Metrics

| Metric | v8.0.8 Target | v10.0.0 Target |
| --- | --- | --- |
| Lighthouse Performance | ≥ 0.90 | ≥ 0.95 |
| Lighthouse Accessibility | ≥ 0.95 | 1.00 |
| Lighthouse PWA | ≥ 0.60 (warn) | ≥ 0.85 |
| Lighthouse SEO | ≥ 0.90 | ≥ 0.95 |
| Initial bundle gzip | < 30 KB | < 25 KB |
| RSVP-only chunk gzip | < 15 KB | < 10 KB |
| Total runtime deps | 0 | ≤ 3 (security-justified only) |
| Test pass rate | 4047/4047 (100%) | 100% always |
| Source-to-test LOC ratio | ~1:0.91 | ≥ 1:1 |
| Dead exports | unknown | 0 (quarterly audit) |
| `window.*` cross-module | 0 | 0 |
| TypeScript coverage (core) | 0% | 100% |
| TypeScript coverage (services) | 0% | 100% |
| Node warnings in `npm test` | 0 | 0 |
| Mutation test score | - | ≥ 80% |
| Axe violations in E2E | - | 0 |
| RSVP submission latency | - | < 300 ms P95 |
| Supabase query latency | - | < 100 ms P95 (UK region) |

---

## Part V — Constraints (Revised)

| Constraint | v8 Rule | v9+ Rule |
| --- | --- | --- |
| Deploy target | GitHub Pages | GitHub Pages (unchanged) |
| Backend | Google Sheets (active) / Supabase (wired but dormant) | Supabase sole backend |
| Runtime deps | Zero | ≤ 3 justified exceptions (DOMPurify, Valibot, @supabase/supabase-js) |
| Framework | Vanilla ESM JS | Vanilla ESM JS (non-negotiable) |
| Language | JS + JSDoc | TypeScript (core + services) + JS (sections) |
| Cost | $0 infrastructure | $0 infrastructure (Supabase free tier + GitHub Pages) |
| Primary locale | Hebrew RTL | Hebrew RTL |
| Build | Vite 8 | Vite 8+ |
| Auth | Email allowlist + multi-OAuth | Supabase Auth + email allowlist + multi-OAuth |
| Storage | localStorage | IndexedDB (localStorage fallback) |
| Credentials in source | Must fix | Never in source |

---

## Part VI — Key Principles (Updated)

1. **Supabase is the backend** — Google Sheets is an export format, not a data source
2. **Security above elegance** — DOMPurify over custom sanitize. RLS over JS-layer auth checks
3. **Explicit over implicit** — `import { fn }` not `window.fn()`, typed contracts not duck typing
4. **Lazy by default** — admin sections load on first visit; Supabase client loaded on auth
5. **Type safety at the edges** — TypeScript for anything that touches external APIs or the store
6. **Container-responsive** — `@container` queries; components define their own breakpoints
7. **Offline-first** — IndexedDB + Background Sync + SW; not offline-tolerant
8. **Zero framework tax** — vanilla ESM, direct DOM, CSS custom properties are the identity
9. **i18n everywhere** — `t('key')`, `Intl.*` APIs, RTL-explicit per locale
10. **Dead code is technical debt** — quarterly audit; aspirational code that isn't wired gets removed
11. **Credentials never in source** — GitHub Secrets → `inject-config.mjs` → config.js at build time
12. **Tests are documentation** — test names describe intent, not implementation; coverage gates enforced

---

## Part VII — Google Sheets Schema (Export Format)

Retained as the export/backup specification. Not a live sync target after v9.0.0.

| Tab | Columns | Mode |
| --- | --- | --- |
| Guests | Id · FirstName · LastName · Phone · Email · Count · Children · Status · Side · Group · Meal · TableId · Notes | Export |
| Tables | Id · Name · Capacity · Shape | Export |
| Config | Key · Value (wedding info) | Export |
| Vendors | Id · Category · Name · Contact · Phone · Price · Paid · Notes | Export |
| Expenses | Id · Category · Amount · Description · Date | Export |
| RSVP_Log | Timestamp · Phone · Name · Status · Count | Export (append) |

---

## Version History Snapshot

| Version | Sprint | Status |
| --- | --- | --- |
| v3.0.0–v3.8.0 | S0–S7 | ✅ Released |
| v3.9.0 | S8 | ✅ Released |
| v4.0.0 | S9 + S10 | ✅ Released |
| v4.1.0 | S11 + S12 | ✅ Released |
| v8.0.0–v8.0.8 | S13–S14 | ✅ Released |
| v8.1.0 | S15–S22 | ✅ Current |
| v8.1.0 | S15 + S16 — Security + IndexedDB | ⏳ |
| v8.2.0 | S17 — Supabase activation | 🔜 |
| v8.3.0 | S18 — PWA excellence | 🔜 |
| v8.4.0 | S19 — CSS modernisation | 🔜 |
| v8.5.0 | S20 + S21 — TypeScript + deps calibration | 🔜 |
| v9.0.0 | Sheets fully retired · Full stack Supabase | 🔜 |
| v9.1.0 | S22 — AI features | 🔜 |
| v9.2.0 | S23 — Best-in-class PWA | 🔜 |
| v9.3.0 | S24 — Multi-tenant | 🔜 |
| v10.0.0 | Full TypeScript · Supabase Realtime · production excellence | 🔜 |

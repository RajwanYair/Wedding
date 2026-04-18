# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [8.0.8] — 2026-05-17

### Added

- `src/utils/guest-search.js` — new pure utility: `normalizeSearch`, `guestMatchesQuery`, `filterGuests` (multi-criteria AND logic: status, side, group, meal, tableId, accessibility, checkedIn, query), `sortGuests`.
- `src/utils/rsvp-analytics.js` — new pure utility: `computeRsvpRates`, `computeMealDistribution`, `rsvpSubmissionsByDate`, `totalExpectedCount`, `guestStatsBySide`.
- `tests/unit/guest-search.test.mjs` — 30 unit tests covering all guest-search functions.
- `tests/unit/rsvp-analytics.test.mjs` — 24 unit tests covering all rsvp-analytics functions.
- Expanded `tests/unit/guest-handlers.test.mjs` from 5 to 24 tests — invokes registered callbacks, verifies `saveGuest` success/failure paths, delete confirm flow, filter/sort/export functions.
- Expanded `tests/unit/table-handlers.test.mjs` from 5 to 25 tests — saveTable, autoAssign, smartAutoAssign, print/export, deleteTable confirm, checkInGuest, QR scan, accessibility filter.
- Expanded `tests/unit/vendor-handlers.test.mjs` from 5 to 22 tests — saveVendor, saveExpense, delete with confirm, export, filter by category.
- Expanded `tests/unit/auth-handlers.test.mjs` from 5 to 17 tests — email login success/failure, signOut, modal open/close, FB/Apple guard.
- Expanded `tests/unit/settings-handlers.test.mjs` from 5 to 20 tests — addApprovedEmail, clearAllData, export/import JSON, backup lifecycle, checkDataIntegrity.
- Expanded `tests/unit/section-handlers.test.mjs` from 5 to 22 tests — analytics export, gallery upload/delete/lightbox, WhatsApp, timeline, budget.
- Expanded `tests/unit/event-handlers.test.mjs` from 5 to 13 tests — switchEvent, deleteEvent, doSwitchEvent (same-id guard, state/reinitStore), doDeleteEvent (default guard, confirmDialog).
- Expanded `tests/unit/section-resolver.test.mjs` from 3 to 10 tests — preloadSections, resolveSection, switchSection auth gating, admin access.
- Expanded `tests/unit/template-loader.test.mjs` from 3 to 12 tests — injectTemplate skip-if-loaded, Promise return, tpl-loading class lifecycle, prefetchTemplates.
- Expanded `tests/unit/focus-trap.test.mjs` from 4 to 10 tests — Tab/Shift+Tab wrapping, empty focusable list, activate/deactivate lifecycle.
- Expanded `tests/unit/status-bar.test.mjs` from 5 to 12 tests — admin/guest role display, multi-call stability, GAS empty state.

### Stats

- **Test files**: 214 (was 212)  
- **Tests**: 4047 (was 3857) — **+190 tests this release**

## [8.0.7] — 2026-05-01

### Added

- `tests/unit/supabase-repositories.test.mjs` expanded with 19 additional test cases covering `SupabaseBaseRepository` (`findById`, `update`, `delete`, `upsert`, `count`, `exists`, event-scoped constructor), `SupabaseGuestRepository` (`findByGroup`, `findUncheckedIn`, `confirmedCount`), `SupabaseTableRepository` (`findByShape`, `findByName`), `SupabaseVendorRepository` (`findUnpaid`, `totalCost`, `totalPaid`), and `SupabaseExpenseRepository` (`findByCategory`).
- `tests/unit/changelog.test.mjs` — 6 new happy-dom unit tests for `src/sections/changelog.js`: `renderChangelog` success/failure/missing-element paths and `mount`/`unmount` smoke tests.
- `tests/unit/backend.test.mjs` — 7 new unit tests for `backend.js` `getBackendType()`: priority order (localStorage → config → default), all four backend variants, whitespace trimming, and unknown-value fallback.
- `tests/unit/utils-barrel.test.mjs` — 15 structural smoke tests verifying `src/utils/index.js` correctly re-exports symbols from `phone`, `date`, `sanitize`, `misc`, `roles`, and `pagination` sub-modules.
- `tests/unit/in-memory-repositories.test.mjs` — 15 new unit tests for `ExpenseRepository` (`findByCategory`, `totalAmount`, `summaryByCategory`) and `VendorRepository` (`findByCategory`, `findUnpaid`, `totalCost`, `totalPaid`, `outstanding`) using an in-memory store stub.

## [8.0.6] — 2026-04-18

### Added

- `src/utils/compose.js` — `pipe`, `compose`, `curry2`, `curry3`, `memoize`, `memoizeKey`, `partial`, `onceOnly`, `noop`, `identity`, `tap` now have comprehensive unit test coverage (`tests/unit/compose.test.mjs`, 34 cases).
- `src/utils/md-to-html.js` — new pure utility extracted from `src/sections/changelog.js`, with full unit test coverage (`tests/unit/md-to-html.test.mjs`, 26 cases) including HTML-escaping security cases.
- `tests/unit/supabase-realtime.test.mjs` — 13 unit tests for subscription registry, unsubscribe, connection-state API, and store-integration helpers; runs without a live WebSocket.
- `tests/unit/guest-landing.test.mjs` — 11 unit tests (happy-dom) for guest-landing lifecycle, data-* DOM slot rendering, table lookup, RSVP status, and graceful degradation when slots are absent.

### Changed

- `src/sections/changelog.js` now imports `mdToHtml` from `src/utils/md-to-html.js` instead of embedding the private converter inline.

## [8.0.5] — 2026-04-18

### Changed

- Decoupled the Sheets schema-handshake major-version mismatch fixture from the current app patch version so patch releases no longer churn that unit test.
- Removed `tests/unit/sheets-impl.test.mjs` from `scripts/sync-version.mjs`, keeping release sync focused on real metadata surfaces instead of semantic test data.

## [8.0.4] — 2026-04-18

### Changed

- Expanded `scripts/sync-version.mjs` so release sync now updates the Service Worker header, Copilot instructions title, repo sanity version assertions, shared types header, architecture header, and the Sheets version fixture without manual patch follow-up.
- Added repo sanity coverage for the Copilot instructions title, architecture header, and shared types header so version-metadata drift fails fast in CI.
- Removed the remaining hardcoded Supabase session storage literal from tests and service documentation so that path also follows `STORAGE_KEYS` as the single source of truth.

## [8.0.3] — 2026-04-18

### Changed

- Centralized the remaining hardcoded direct-storage keys for push subscription cache, revoked guest tokens, Supabase session persistence, Sheets mirror toggle reads, and exported error diagnostics through the shared `STORAGE_KEYS` map.
- Added guardrail coverage so the repo sanity suite and constant tests catch future reintroduction of direct `wedding_v1_*` literals for those auth, diagnostics, and push-storage paths.

## [8.0.2] — 2026-04-18

### Changed

- Canonicalized active runtime store domains used by settings and service modules so defaults, data classification, admin-debug, and repo guardrails all cover the same persisted keys.
- Added first-class type coverage for runtime store domains such as RSVP logs, delivery tracking, notification preferences, webhook state, donation tracking, budget envelopes, and communication logs.
- Removed ad hoc `initStore()` calls from donation and seating-constraint services so those domains now depend on the shared bootstrap path instead of local service initialization.
- Moved multi-event persistence off the event-scoped reactive store and onto the global state layer so event registry data and active-event selection stay aligned with cross-event storage semantics.

## [8.0.1] — 2026-04-18

### Fixed

- Canonicalized direct-storage keys and data classification so runtime modules, privacy helpers, and tests reuse shared constants instead of duplicating localStorage keys and store sensitivity maps.
- Promoted `campaigns` into the canonical store defaults, type surface, and data-class map so messaging campaigns are a first-class store domain.
- Fixed landing-page registry rendering to read from `weddingInfo.registryLinks`, added the field to default wedding info, and extended the Sheets config schema to keep registry links in sync.
- Aligned diagnostics on the `appErrors` store key so analytics, settings cleanup actions, and error-pipeline storage all use the same error source of truth.

### Changed

- Removed unused maintenance scripts and an orphaned bundle-budget test that were no longer part of the package, CI, or runtime path.
- Deleted stale evaluation docs whose decisions were already captured by the active production docs.
- Simplified contributor and automation docs to remove stale test-count claims, legacy `js/` references, and incomplete agent inventory.
- Standardized the supported Node runtime on 22+ in package metadata and repo guidance.

## [4.1.0] — 2025-07-14

### Added — S11 Quick Wins + Day-of Essentials

- **S11.1 Per-guest unique RSVP links**: `{rsvpLink}` placeholder in WhatsApp templates, auto-prefill RSVP from `?guestId=` URL parameter.
- **S11.2 Transport manifest / bus lists**: grouped view by transport route with passenger counts, CSV export, print support.
- **S11.3 Caterer-ready meal report per table**: table × meal-type matrix in analytics with CSV export and print.
- **S11.4 Guest status batch update**: checkbox column in guest table, select-all, batch set status / batch delete.
- **S11.5 Day-of gift recording**: gift mode toggle in check-in screen, ₪ input alongside check-in button, running gift total.

### Added — S12 UX Upgrades + Automation

- **S12.1 RSVP reminders via WhatsApp**: separate reminder template, target guests who were sent invite but haven't RSVP'd, track `reminderSent`/`reminderSentAt`.
- **S12.2 Duplicate guest detection & merge**: scan for duplicate guests by phone/name, merge tool with keep-first/keep-second options.
- **S12.3 QR code check-in**: BarcodeDetector API camera scan, per-guest QR URL generation, auto check-in on scan.
- **S12.4 Drag-and-drop table seating**: draggable unassigned guest rows, drop zones on table cards, visual drop highlight.
- **S12.5 RSVP deadline enforcement**: form disabled after `weddingInfo.rsvpDeadline`, shows "deadline passed" message.
- 46 new i18n keys (he + en) for all S11/S12 features.
- CSS: drag-drop highlight, batch toolbar, gift input, transport route styles.

## [4.0.0] — 2025-07-14

### Added

- **S9 — Multi-Event Support**: event namespace in localStorage, event switcher UI, per-event Google Sheet binding, per-event import/export.
- **S10 — Real-time Collaboration**: polling-based live sync (30 s interval), conflict resolution modal with field-level diffs, presence indicator (heartbeat system).
- **Event namespace**: `wedding_v1_evt_{id}_` prefix per event; "default" event preserves backward compat with original `wedding_v1_` prefix.
- **Event switcher**: dropdown + add/delete buttons in top-bar; section unmount/remount on switch.
- **Per-event Sheets**: each event can bind its own Spreadsheet ID via localStorage.
- **Live sync toggle**: checkbox in Settings; preference persisted in localStorage; auto-restores on reload.
- **Conflict modal**: shows field-level local vs. remote diffs; accept all local/remote or cherry-pick per field.
- **Presence system**: 60 s heartbeat, 120 s stale threshold; badge shows count of other active users.
- **`reinitStore()`**: flush + reinitialize store for event switching without page reload.
- 19 new i18n keys (he + en) for events, conflicts, live sync, and presence.

## [3.9.0] — 2026-04-15

### Added

- **Status bar** — footer displays app version, GAS connection status, and user role in real time.
- **What's New popup** — admin users see a version-gated popup with latest changes on first login after an update.
- **Changelog section/tab** — dedicated browsable changelog section with nav tab; lazy-loaded template.
- **WhatsApp bilingual templates** — confirmation/reminder/custom messages now support Hebrew + English with WhatsApp-safe emoji.
- **Budget + checkedIn Sheets sync** — Budget sheet tab for gift tracking; `checkedIn` column synced to Attendees tab.
- **Contacts + Gallery Sheets sync** — guest-submitted contact details and photo metadata synced two-way with Google Sheets.
- **GAS v2.3.0** — `ALLOWED_SHEETS` expanded to 10 tabs: Attendees, Tables, Config, Vendors, Expenses, RSVP_Log, Timeline, Budget, Contacts, Gallery.
- **250 wiring cross-reference tests** — new `tests/unit/wiring.test.mjs` validates consistency across template-loader, nav, SECTIONS map, HTML containers, template files, barrel exports, i18n keys, and Sheets sync.
- **Modal lazy-loading** — `openModal()` now injects modal HTML via Vite `?raw` imports on first open; all 6 modal templates load on demand.

### Fixed

- **Guest landing page invisible** — added missing `sec-guest-landing` container, Home nav tab, and `"landing"` entry in `_sections` array.
- **Changelog template not loading** — added missing `changelog` entry in template-loader `_loaders` map.
- **Registry container missing** — added `sec-registry` div to `index.html` (caught by new wiring tests).
- **`closeModal` handler** — registered `on("closeModal", ...)` and `on("closeGalleryLightbox", ...)` data-action handlers in `main.js`.
- **Expenses section mount** — `expensesSection.mount()` now called when budget section mounts; unmounts alongside it.
- **`openModal` export** — changed to `export async function` for lazy template loading; updated test assertion.

- **S8.1 Guest side-by-table heatmap** — stacked horizontal SVG bars showing groom/bride/mutual guest split per table in Analytics.
- **S8.2 RSVP funnel report** — horizontal bar funnel visualizing invited → sent → confirmed → checked-in pipeline.
- **S8.3 Vendor payment timeline** — per-vendor SVG progress bars showing paid vs total amounts.
- **S8.4 Export analytics** — "Export PDF" (triggers print) and "Export CSV" buttons on the Analytics page.
- **S8.5 WhatsApp delivery rate** — donut chart showing sent vs unsent WhatsApp invitations with delivery percentage.
- **Group distribution chart** — bar chart of guests by group (family, friends, work, other).
- **Table fill-rate progress bars** — horizontal bars per table showing seated/capacity with color-coded thresholds.
- **Recent activity feed** — lists the 10 most recent guest/RSVP changes sorted by updatedAt.
- **20 new i18n keys** — Hebrew + English entries for all S8 analytics features (funnel, heatmap, delivery, group, activity).

### Changed

- Version bumped to v3.9.0 across `package.json`, `src/core/config.js`, `js/config.js`, `public/sw.js`, `tests/wedding.test.mjs`.
- Cache bust: `CACHE_NAME` → `wedding-v3.9.0`.
- Test count: 1735 tests across 17 suites.

## [3.8.3] — 2026-04-15

### Added

- **Two-way Google Sheets sync** — `pullAllFromSheetsImpl()` reads all 6 tabs via GViz and merges into local store; `pullFromSheets()` button added to Settings under Google Sheets actions.
- **Timeline tab synced** — `src/sections/timeline.js` now calls `enqueueWrite("timeline", ...)` on save/delete; `SHEETS_TIMELINE_TAB` added to `src/core/config.js`.
- **Config sheet key uniqueness** — GAS v2.1.0: `replaceAll` deduplicates incoming Config rows by key; new `cleanConfig` action deduplicates the sheet in-place. Button “🧹 נקה מפתחות כפולים” added to Settings.
- **Config sheet always complete** — `_WEDDING_INFO_KEYS` canonical list in `sheets-impl.js` guarantees all 14 `weddingInfo` keys are pushed to the Config tab with empty strings for unset fields; `_defaultWeddingInfo` in `main.js` expanded accordingly.
- **Push All to Sheets** — `pushAllToSheetsImpl()` force-syncs all 6 stores (header row + data) regardless of write queue; button “📤 שלח הכל ל-Google Sheets” added to Settings.
- **PWA install prompt** — `initInstallPrompt()` in `src/core/ui.js` listens for `beforeinstallprompt`, defers it, and shows a slide-up banner after 30 s inviting browser users to install the app; dismissal snoozed 30 days in `localStorage`.

### Changed

- `js/config.js`, `src/core/config.js`, `public/sw.js` — version bumped to v3.8.3.
- Cache bust: `CACHE_NAME` bumped to `wedding-v3.8.3` in `public/sw.js`.

## [3.8.2] — 2026-04-15

### Added

- **Default timeline** — `src/sections/timeline.js` now seeds a wedding-day timeline on first load with standard ceremony/reception milestones; ceremony time set to 18:50.

### Fixed

- **Hebrew "Find Your Table" translation** — corrected `tableFinder` i18n key in `js/i18n/he.json` to display proper Hebrew text.
- **Email login selector** — `#adminLoginEmail` selector mismatch in `src/services/auth.js` caused email input not to be found; now resolves correctly.

### Changed

- **AI/CI/VS Code configs** — updated `copilot-instructions.md`, `CLAUDE.md`, `.vscode/` settings, and CI workflows for pre-release discipline enforcement.
- Cache bust: `CACHE_NAME` bumped to `wedding-v3.8.2` in `public/sw.js`.

## [3.8.1] — 2026-04-15

### Added

- **SW update prompt** — `initSW()` in `src/core/ui.js` registers the service worker and detects new deployments via `updatefound`, `UPDATE_AVAILABLE` postMessage, and tab-refocus polling. Shows a dismissible top banner (`showUpdateBanner()`) prompting users to refresh; auto-reloads silently if the page has been open ≥ 5 minutes.
- **`showUpdateBanner()` / `applyUpdate()`** — New exports in `src/core/ui.js`; wired in `src/main.js` bootstrap.
- Cache bust: `CACHE_NAME` bumped to `wedding-v3.8.1` in `public/sw.js`.

### Fixed

- **Guest landing page** — Guests now land on the `landing` section (couple names, date, venue) instead of the bare RSVP form. `updateTopBar()` + `updateCountdown()` called at bootstrap so header shows wedding info immediately before any section mounts.
- **Sign-out** — Signs out to `landing` (was `rsvp`); unreachable non-public sections silently redirect to `landing`.
- **Admin emails** — Added `anat.rajwan@gmail.com` to default `ADMIN_EMAILS` in both `src/core/config.js` and `js/config.js` (was misspelled as `anar`).

## [3.8.0] — 2026-08-04

### Added

- **`appendToRsvpLog(entry)`** — New export in `src/services/sheets.js`; posts an RSVP submission row (timestamp, phone, name, status, count) to the `RSVP_Log` sheet tab, replacing the previous no-op `() => Promise.resolve()` placeholder.
- **`getVendorStats()`** — New export in `src/sections/vendors.js` returning `{ total, totalCost, totalPaid, outstanding, paymentRate }`.
- **`getCheckinStats()`** — New export in `src/sections/checkin.js` returning `{ total, checkedIn, checkinRate, remaining }` based on confirmed guests and their seat counts.
- **`getExpenseSummary()`** — New export in `src/sections/expenses.js` returning `{ total, byCategory: Record<string, number> }`.
- **`filterGuestsByStatus(status?)`** — New export in `src/sections/guests.js`; returns guests matching the given status, or all guests when status is omitted or `"all"`.
- **`announce(message, politeness?)`** — New a11y export in `src/core/ui.js`; creates/updates a `#ariaLiveRegion` div with `aria-live` for screen reader announcements. Uses `requestAnimationFrame` to force re-announcement of identical messages.
- **WhatsApp char counter** — `updateWaPreview()` in `src/sections/whatsapp.js` now updates a `#waCharCount` element with current length / 4096 and characters remaining. Adds CSS class `wa-char-warn` when fewer than 200 characters remain.
- **RSVP log sync** — `submitRsvp()` in `src/sections/rsvp.js` now calls `enqueueWrite("rsvp_log", () => appendToRsvpLog(...))` with the submitted data, activating the RSVP_Log sheet tab sync.
- **5 new i18n keys** — Added to both `js/i18n/he.json` and `js/i18n/en.json`: `vendor_total_cost`, `vendor_paid`, `vendor_outstanding`, `vendor_payment_rate`, `checkin_checked_in`, `checkin_rate`, `expense_by_category`, `wa_chars_left`, `filter_by_status`, `filter_all`.
- **`@vitest/coverage-v8`** — Added to `devDependencies`; required for `npm run test:coverage` to function in CI.
- **5 new test files** (58 new tests):
  - `tests/unit/rsvp.test.mjs` (10 tests) — `happy-dom`; covers `lookupRsvpByPhone`, `submitRsvp`.
  - `tests/unit/checkin.integration.test.mjs` (11 tests) — `happy-dom`; covers `checkInGuest`, `exportCheckinReport`, `resetAllCheckins`, `getCheckinStats`.
  - `tests/unit/expenses.integration.test.mjs` (14 tests) — `happy-dom`; covers `saveExpense`, `deleteExpense`, `getExpenseSummary`.
  - Extended `tests/unit/vendors.integration.test.mjs` (5 new tests) — `getVendorStats` scenarios.
  - Extended `tests/unit/guests.integration.test.mjs` (11 new tests) — `getGuestStats`, duplicate phone detection, `filterGuestsByStatus`.
  - Extended `tests/unit/nav.test.mjs` (7 new tests) — `initKeyboardShortcuts` alt-key routing, INPUT guard, cleanup.
- **Regression tests in `tests/wedding.test.mjs`** — 7 new describe blocks covering all v3.8.0 source-level changes.

### Fixed

- RSVP log write was a no-op (`enqueueWrite("rsvp", () => Promise.resolve())`). Fixed to call `appendToRsvpLog` with real RSVP data.
- Stale version in `GUIDE.md` (was v2.1.0), `workspace.instructions.md` (was v3.0.0), and `cicd.instructions.md` (was 689 tests).

## [3.7.0] — 2026-08-03

### Added

- **`getGuestStats()`** — New export in `src/sections/guests.js` returning aggregate guest metrics (total, confirmed/pending/declined/maybe, totalSeats/confirmedSeats, groom/bride/mutual, seated/unseated, vegetarian/vegan/glutenFree/kosher).
- **`getBudgetSummary()`** — New export in `src/sections/budget.js` returning `{ total, gifts, expenses, balance }` by aggregating budget entries + guest gifts + vendor prices.
- **`getTableStats()`** — New export in `src/sections/tables.js` returning `{ totalTables, totalCapacity, totalSeated, available }`.
- **`AUTH_SESSION_DURATION_MS`** — New named export in `src/core/config.js` (`2 * 60 * 60 * 1000` = 2 h), replacing the hardcoded constant in `auth.js`.
- **Duplicate phone detection** — `saveGuest()` in `src/sections/guests.js` now rejects a save if another guest already has the same normalized phone number, returning `{ ok: false, errors: ["error_duplicate_phone"] }`.
- **`initKeyboardShortcuts()`** — New export in `src/core/nav.js`; registers `Alt+1` through `Alt+9` keyboard shortcuts to jump between sections. Returns a cleanup function. Ignored when focus is in an `INPUT`, `TEXTAREA`, `SELECT`, or `contenteditable` element. Called automatically from `src/main.js` bootstrap.
- **Mermaid diagrams** — `ARCHITECTURE.md` v3.7.0: added Auth Flow `sequenceDiagram`, RSVP Data Flow `sequenceDiagram`, and Offline Sync `flowchart` under new titled sections.
- **6 new unit/integration test files** (107 new tests):
  - `tests/unit/state.test.mjs` (16 tests) — Node env with `vi.stubGlobal` localStorage mock; covers `load`, `save`, `saveAll`, `clearAll`.
  - `tests/unit/i18n.test.mjs` (17 tests) — `happy-dom`; covers `t()`, `loadLocale` with fetch mock, `applyI18n`, `currentLang`.
  - `tests/unit/config.test.mjs` (22 tests) — Node env; verifies all config exports exist and have correct types.
  - `tests/unit/tables.integration.test.mjs` (19 tests) — `happy-dom`; covers `saveTable`, `deleteTable`, `autoAssignTables`, `getTableStats`.
  - `tests/unit/budget.integration.test.mjs` (17 tests) — `happy-dom`; covers budget CRUD + `getBudgetSummary`.
  - `tests/unit/vendors.integration.test.mjs` (16 tests) — `happy-dom`; covers vendor CRUD + payment tracking.
- **E2E: Guest CRUD + Tables flows** — `tests/e2e/smoke.spec.mjs` extended with "Guest Management" and "Tables Section" describe blocks.
- **`v3.7.0` regression tests** — 33 new tests in `tests/wedding.test.mjs` covering all new features.

### Changed

- **`package.json`** — version `3.6.0` → `3.7.0`.
- **`public/sw.js`** — `CACHE_NAME` updated from `wedding-v3.6.0` to `wedding-v3.7.0`.
- **`js/config.js`** — version comment updated to v3.7.0.
- **`src/core/config.js`** — `APP_VERSION` updated from `"3.6.0"` to `"3.7.0"`.
- **`ARCHITECTURE.md`** — version in h1 updated from `v3.0.0` to `v3.7.0`.

## [3.6.0] — 2026-08-02

### Added

- **S3.9 — Offline-to-online sync** — `initOnlineSync()` exported from `src/services/sheets.js`; registers `window "online"` listener that flushes the write queue via `syncSheetsNow()` whenever the browser regains network connectivity. Called in `src/main.js` bootstrap. Also registers `"offline"` listener that resets sync status to idle.
- **S4.4 — Prebuild precache auto-injection** — `generate-precache.mjs` now also patches `dist/sw.js` APP_SHELL with the full list of Vite-built assets (excluding `.map` and `sw.js` itself). Added `"postbuild"` npm script so this runs automatically after every `npm run build`.
- **S6.4 — nav.js unit tests** — `tests/unit/nav.test.mjs` (20 tests, `happy-dom`): covers `navigateTo`, `activeSection`, `initRouter` (hash parsing, hashchange events), `initSwipe` (directional, short/vertical swipe ignored), and `initPullToRefresh` (threshold, callback, CSS class cleanup).
- **S6.7 — Guests section integration tests** — `tests/unit/guests.integration.test.mjs` (20 tests, `happy-dom`): mounts the guests section against real DOM, tests `saveGuest` CRUD (validation, phone normalization, unique IDs, DOM updates), `deleteGuest`, `setFilter`, `setSearchQuery`, `setSortField`, `renderGuests` idempotency.
- **S7.9 — A11y toast improvements** — `src/core/ui.js` now uses `role="alert"` + `aria-live="assertive"` for `error`/`warning` toasts; `role="status"` + `aria-live="polite"` for `success`/`info`. `index.html` `#toastContainer` updated to `role="region"` + `aria-atomic="false"` + `aria-label="Notifications"`.
- **SECURITY.md** — Security policy: supported versions, vulnerability reporting instructions, security measures (input sanitization, no innerHTML with user data, OAuth allowlist, session rotation, `npm audit`).
- **CONTRIBUTING.md** — Developer guide: quick start, project structure, development rules, feature checklist, commit convention, PR checklist.
- **README.md** — Version badge updated to v3.6.0; tests badge (1176+) added.
- **CLAUDE.md** — Updated to v3.6.0: test count (1176+), build command note (`postbuild`), new gotchas for `initOnlineSync`, unit test environment.
- **v3.6.0 regression tests** — 29 new tests in `tests/wedding.test.mjs` covering all new features.

### Changed

- **`package.json`** — version `3.5.0` → `3.6.0`; added `"postbuild": "node scripts/generate-precache.mjs"`.
- **`public/sw.js`** — `CACHE_NAME` updated from `wedding-v3.5.0` to `wedding-v3.6.0`.
- **`js/config.js`** — version comment updated to v3.6.0.

## [3.5.0] — 2026-08-01

### Added

- **S2.6 IntersectionObserver stat counters** — `initStatCounterObserver()` in `src/sections/dashboard.js` animates `.stat-value` / `.stat-number` elements from 0 to their current value when they scroll into view (600ms ease-out cubic). Disconnects on section unmount.
- **S2.8 Pull-to-refresh** — `initPullToRefresh(onRefresh)` in `src/core/nav.js`; CSS body classes `ptr--pulling` / `ptr--refreshing` with animated indicator; wired to `syncSheetsNow()` in `src/main.js` bootstrap.
- **S3.4 Conflict resolution** — `mergeLastWriteWins(local, remote)` exported from `src/services/sheets.js`; last `updatedAt` wins; local-only records are preserved.
- **S3.8 Vendor/Expense/Guest/Table/Settings sync** — replaced no-op `() => Promise.resolve()` callbacks in all data sections with `() => syncStoreKeyToSheets(key)`. Also added `syncStoreKeyToSheets(storeKey)` helper to `sheets.js` that POSTs `replaceAll` action to the GAS backend.
- **S4.6 Gallery lazy loading** — gallery thumbnail images already had `loading="lazy"` + `decoding="async"`; lightbox image now also uses `decoding="async"` for off-main-thread decode.
- **A11y skip-to-main link (S7.9)** — first child of `<body>` in `index.html`; keyboard-visible only (offscreen by default, shown on focus); `data-i18n="skip_to_main"`.
- **i18n: new keys** — `rsvp_deadline_soon`, `rsvp_deadline_passed`, `skip_to_main`, `ptr_release_to_refresh`, `ptr_refreshing` in both `he.json` and `en.json`.
- **CSS: `.skip-to-main`** — accessible skip link styles in `components.css`.
- **CSS: pull-to-refresh indicator** — `body.ptr--pulling::before` / `body.ptr--refreshing::before` pseudoelement spinner; `@keyframes spinCW`.
- **Unit tests (S6.2–S6.6)** — 4 new test files: `tests/unit/utils.test.mjs`, `tests/unit/store.test.mjs`, `tests/unit/sheets.test.mjs`, `tests/unit/auth.test.mjs` covering phone/date/sanitize/misc utils, reactive store, sheets sync + conflict resolution, and auth session logic.
- **v3.5.0 regression tests** — 28 new tests in `tests/wedding.test.mjs` covering all new features.
- **CI version updated** to v3.5.0.

## [3.4.0] — 2026-07-31

### Fixed (Critical Bug Fixes)

- **WhatsApp bulk-send ignores filter arg**: `sendWhatsAppAll()` now accepts `filter` parameter (`"pending"` sends only un-sent pending guests, `"all"` sends everyone except declined). Both `window.open` and Green API paths respect the filter.
- **WhatsApp sent state not tracked**: Added `markGuestSent(id)` — sets `guest.sent = true` + `sentAt` timestamp in the store. Called on every link click and API send. Sent badge shown in guest row.
- **`updateWaPreview` not wired**: Added `export function updateWaPreview(template, guest)` to whatsapp.js; wires template textarea changes to the preview bubble and time display.
- **`saveTransportSettings` used FormData**: Rewrote to read each transport input by element ID (`transportEnabled`, `transportTefachotTime`, etc.) directly — no `<form>` wrapper required.
- **`addApprovedEmail` used wrong ID**: Fixed typo `approvedEmail` → `newApproveEmail` (the actual input ID in settings.html).
- **`addRegistryLink` used form.querySelector**: Fixed to read `registryInputUrl` and `registryInputName` by ID — template uses IDs, not `name` attributes.
- **Gallery upload never fired**: Added `data-on-change` delegation to `src/core/events.js` — file inputs with `data-on-change="handleGalleryUpload"` now reliably dispatch through the event hub.
- **`data-on-enter` never fired**: Added `keydown` Enter delegation to `src/core/events.js` — inputs with `data-on-enter="addApprovedEmail"` (etc.) now fire on Enter.
- **Gallery admin bar never shown**: `gallery.js mount()` now reads auth session and shows `#galleryAdminBar` for authenticated, non-anonymous users.
- **Gallery missing delete buttons**: `renderGallery()` now appends a delete button per photo for admin users (calls `deleteGalleryPhoto` handler).
- **Gallery missing lightbox**: Added `openLightbox(id)` — creates fullscreen overlay with keyboard ESC + click-outside dismissal.
- **Green API status element missing**: Added `<p id="greenApiStatus">` to `settings.html` after the "Test Connection" button.
- **`template-loader.js` missing registry/guest-landing**: Added loaders for `registry.html` and `guest-landing.html` so lazy template injection works for those sections.

### Added

- **`updateRsvpDeadlineBanner()`** in `dashboard.js` — reads `weddingInfo.rsvpDeadline`, shows amber banner when ≤ 7 days remain, red banner when deadline has passed.
- **Sync status badge** — `#syncStatusBadge` span added to the top bar in `index.html`; wired to `onSyncStatus()` callback from `src/services/sheets.js`; shows Syncing / Synced / Error states with appropriate colors.
- **Exponential backoff for Sheets writes** — `src/services/sheets.js` `_flush()` now retries failed writes up to `_MAX_RETRIES = 4` times with jittered exponential delay (base `_BACKOFF_BASE_MS = 2000 ms`). Gives up and sets status `"error"` after all retries exhausted. Resets to `"idle"` 3 seconds after a successful sync.
- **`color-scheme: dark light`** declared in `css/variables.css :root` for better system-theme integration.
- **`.sync-badge` CSS** with `--syncing`, `--synced`, `--error` modifier classes (amber/green/red).
- **`.rsvp-deadline-banner--late` / `--soon` CSS** modifiers for deadline banner coloring.
- **45 new regression tests** for all v3.4.0 fixes (events delegation, gallery, WhatsApp, settings, sheets backoff, dashboard deadline, sync badge, CSS, template-loader).

## [3.3.0] — 2026-07-30

### Fixed (Critical Bug Fixes)

- **RSVP form never populated**: `_prefillForm()` used wrong element IDs (`rsvp-phone` → `rsvpPhone`, `rsvp-count` → `rsvpGuests`, etc.) and revealed wrong element (`rsvpFormBody` → `rsvpDetails`)
- **RSVP confirmation never shown**: `_showConfirmation()` targeted `rsvpConfirmMessage` which didn't exist; replaced with new `#rsvpConfirm` div added to `rsvp.html`; `"maybe"` status now handled
- **Analytics charts blank**: Template had `analyticsSideChart`/`analyticsMealChart` but JS rendered to `analyticsSideDonut`/`analyticsMealBar` — IDs unified across template and JS
- **Dashboard groom/bride/transport stats always 0**: Added the three missing calculations and `_setText` calls
- **Language toggle broken**: `switchLanguage()` called with no argument — now passes the toggled locale string
- **Invitation form changes never saved**: `on("updateWeddingDetails", ...)` was not registered; `renderInvitation()` now populates all form fields from store on mount
- **Contact form always failed**: Wrong show/hide element IDs (`contactForm` → `contactFormFields`, `contactSuccess` → `contactFormSuccess`); `on("submitContactForm", ...)` was not registered
- **Budget target save broken**: `saveBudgetTarget` handler passed the `<form>` element to `saveBudgetEntry()` instead of reading input value
- **Budget stat boxes always 0**: Stat elements (`budgetStatGifts`, `budgetStatTotal`, etc.) were never populated
- **Budget progress bar always hidden**: Progress wrap never shown even when budget target was set
- **Tables unassigned-guests list empty**: `renderTables()` never wrote into `#unassignedGuests`
- **Settings `populateSettings()` broken**: Used `setting-groom` / `setting-bride` IDs that don't exist; rewritten to call `updateDataSummary()` + `sheetsWebAppUrl` + approved-emails render
- **Settings CSV import never fired**: Template used `data-on-change="importCSV"` but handler is `importGuestsCSV`
- **Settings `saveWebAppUrl` wrong ID**: Looked for `settingWebAppUrl` — corrected to `sheetsWebAppUrl`
- **Landing couple-name wrong ID**: `landingCouple` → `landingCoupleName`; also wired `landingHebrewDate`, `landingAddress`, `landingVenue`, `landingWazeLink`, `landingTimeline`, `landingRegistrySection`
- **Check-in showed raw UUID for table**: `renderCheckin()` now resolves `g.tableId` to `table.name` from the tables store

### Added

- **`wa_default_template` i18n key** — default WhatsApp message template (Hebrew + English)
- **30+ missing i18n keys**: `rsvp_confirmed`, `rsvp_declined`, `language_switched`, `contact_sent`, `error_green_api_config`, `green_api_connected`, `green_api_not_connected`, `error_network`, `analytics_meal_summary_title`, `no_approved_emails`, `all_guests_seated`, `count`, `your_table`, `error_invalid_amount`, `chart`, `send_whatsapp`, `other`, `groom_placeholder`, `bride_placeholder`, `wedding_past`, `wedding_today`, `days_until_wedding`, `registry_subtitle`, `registry_empty`, `guest_landing_title`, `guest_landing_greeting`, `rsvp_status_label`, `table_tbd` (both `he.json` and `en.json`)
- **`src/templates/registry.html`** — guest-facing registry links template
- **`src/templates/guest-landing.html`** — personalised guest invitation landing template
- **Analytics headcount stats + meal summary**: `renderAnalytics()` now fills `analyticsHeadAdults/Children/Total/Confirmed/Access`, renders sent/unsent donut, and renders catering meal summary

## [3.2.0] — 2026-07-29

### Fixed (Critical Bug Fixes)

- **Modal saves never worked**: All 5 modal HTML files lacked `<form>` tags so `FormData` always returned empty. Rewrote all save handlers in `src/main.js` to read values from DOM element IDs directly (`saveGuest`, `saveTable`, `saveVendor`, `saveExpense`, `saveTimelineItem`)
- **Hebrew i18n always empty**: `src/main.js` bootstrap only called `loadLocale()` for English — Hebrew users saw raw key names everywhere. Fixed to always `await loadLocale(lang)`
- **`sortGuestsBy` never worked**: Handler read `el.dataset.field` but template uses `data-action-arg`. Fixed to `el.dataset.actionArg`
- **Table/div rendering in `<tbody>`**: `renderVendors()`, `renderExpenses()`, `renderCheckin()` were appending `<div>` elements into `<tbody>` — browsers silently discard invalid HTML. Rewrote all three to generate `<tr><td>` rows
- **budget.js subscriptions missing**: `mount()` never subscribed to `expenses`/`vendors` store changes, so `renderBudgetProgress()` never updated automatically
- **QR code element ID mismatch**: `settings.js` targeted `#rsvpQrCode` but template has `#rsvpQrImage`
- **SW install failure**: `invitation.jpg` in APP_SHELL caused SW to fail offline install if the file was missing. Removed; kept `icon-192.png` + `icon-512.png`
- **`input` events never delegated**: `src/core/events.js` had no `data-on-input` delegation. Added listener
- **Event name mismatches**: `data-on-input="filterGuests"` → `searchGuests`; `data-on-input="searchCheckin"` → `checkinSearch`

### Added

- **Edit modals for all entities**: `openGuestForEdit()`, `openVendorForEdit()`, `openExpenseForEdit()`, `openTableForEdit()`, `openTimelineForEdit()` — pre-fill modal fields for in-place editing
- **Delete handlers for tables + timeline**: `on("deleteTable", ...)` and `on("deleteTimelineItem", ...)` with confirmation dialog
- **`lookupRsvpByPhone` handler**: Wired phone input `data-on-input` to RSVP phone-first lookup flow
- **Hidden ID fields in all modals**: Added `<input type="hidden" id="xxxModalId">` to all 5 modal HTML files to track create vs. edit mode
- **Edit/delete buttons in all list renders**: `renderGuests()`, `renderVendors()`, `renderExpenses()`, `renderTimeline()`, `renderTables()` now include per-row/per-card action buttons
- **`analyticsBudgetBar` container**: Added missing `<div id="analyticsBudgetBar">` to `analytics.html` for `renderBudgetChart()` to target
- **`budgetProgressLabel`**: Added `<span id="budgetProgressLabel">` to `budget.html`; budget.js auto-generates QR on `mount()`
- **40+ new i18n keys**: Added `saved`, `syncing`, `synced`, `error_save`, `guest_saved`, `table_saved`, `vendor_saved`, `expense_saved`, `confirm_clear_all`, `auth_welcome`, `auth_signed_out`, `sheets_connected`, `sheets_not_connected`, `settings_saved`, and more to both `he.json` and `en.json`
- **`openAddXModal` clears hidden ID**: All "Add New" modal openers now reset the hidden `id` field so saves create new records instead of overwriting

### Tests

- Version checks updated to v3.2.0 — **965 tests, 97+ suites**

## [3.1.0] — 2026-07-28

### Added

- `importGuestsCSV()` in `src/sections/guests.js` — parse and bulk-import guests from CSV (columns: FirstName/LastName/Phone/Email/Count/Children/Status/Side/Group/Meal/Notes); updates existing guests by phone
- `exportExpensesCSV()` + `filterExpensesByCategory()` in `expenses.js`
- `exportVendorsCSV()` + `filterVendorsByCategory()` in `vendors.js`
- `exportCheckinReport()` + `resetAllCheckins()` in `checkin.js`
- `renderBudgetChart()` in `analytics.js` — SVG bar chart of expenses by category + vendor total; auto-updates on expenses/vendors store changes
- `renderBudgetProgress()` in `budget.js` — progress bar showing spent vs. `weddingInfo.budgetTarget`
- `buildWhatsAppMessage(guestId, template?)` in `whatsapp.js` — returns `{ message, link }` preview without opening a window
- `generateRsvpQrCode()` in `settings.js` — renders QR code via qrserver.com API into `#rsvpQrCode` img element
- `showConfirmDialog(message, onConfirm)` in `src/core/ui.js` — callback-based confirm wrapper

### Changed

- `src/main.js` — registered 11 new data-action handlers: `deleteGuest`, `deleteVendor`, `deleteExpense`, `deleteBudgetEntry`, `checkInGuest`, `checkinSearch`, `importGuestsCSV`, `exportExpensesCSV`, `exportVendorsCSV`, `exportCheckinReport`, `resetAllCheckins`, `generateRsvpQrCode`
- `analytics.js` mount now subscribes to `expenses` + `vendors` store changes for budget chart
- Coverage thresholds raised: lines/functions/statements 70→80%, branches 60→70%
- Coverage `include` expanded to `src/**` (previously only `js/**`)
- CI workflow header updated to v3.1.0

### i18n

- Added keys: `guests_imported`, `confirm_delete`, `confirm_reset_checkins`, `export_expenses_csv`, `export_vendors_csv`, `export_checkin_report`, `reset_checkins`, `filter_by_category`, `budget_progress`, `budget_chart`, `import_guests_csv` (Hebrew + English)

### Tests

- Added 57 new tests in 2 new suites: **v3.1.0 New section exports** + **v3.1.0 src/utils pure functions** — total: **961 tests, 97+ suites**

## [3.0.0] — 2026-07-27

### Breaking: ESM Entry Point Switch (S0.11 + S0.12)

- **S0.11 — Vite entry switched to `src/main.js`**: `index.html` now loads `src/main.js` instead of `js/main.js`. `vite-plugin-legacy-globals.mjs` plugin removed from `vite.config.js`. All `window.*` side-effect registrations eliminated.
- **S0.12 — ESLint simplified**: `varsIgnorePattern` reduced from 70+ prefix list to `^_` only. `js/` directory excluded from ESLint scope (legacy code). `lint:js` now covers `src/**/*.js`, `scripts/`, `vite.config.js`, `eslint.config.mjs`. `scripts/` override added for Node globals (`process`, `Buffer`) and `console.log`.
- **S0.11 — `src/main.js` rewrite**: Central bootstrap wires all ~50 `data-action` handlers via `on()` from `src/core/events.js`. Auth guard in `_switchSection` (public sections: rsvp, landing, contact-form, registry, guest-landing). Session rotation every 15 min.

### New Modules

- **`src/services/sheets.js`**: Added `syncSheetsNow()`, `sheetsCheckConnection()`, `createMissingSheetTabs()`.
- **`src/core/ui.js`**: Added `cycleTheme()`, `toggleLightMode()`, `toggleMobileNav()`, `restoreTheme()`.
- **`src/sections/settings.js`**: Added `clearAllData()`, `exportJSON()`, `importJSON()`, `copyRsvpLink()`, `copyContactLink()`, `saveWebAppUrl()`, `saveTransportSettings()`, `addApprovedEmail()`, `clearAuditLog()`, `clearErrorLog()`, `switchLanguage()`.
- **`src/sections/guests.js`**: Added `exportGuestsCSV()`, `setSideFilter()`, `printGuests()`, `downloadCSVTemplate()`.
- **`src/sections/tables.js`**: Added `printSeatingChart()`, `printPlaceCards()`, `printTableSigns()`, `findTable()`.
- **`src/sections/whatsapp.js`**: Added `sendWhatsAppAll()`, `sendWhatsAppAllViaApi()`, `checkGreenApiConnection()`, `saveGreenApiConfig()`.
- **`src/sections/registry.js`**: Added `addLink()` for registry URL management.

### Documentation

- **S7.5 — ARCHITECTURE.md**: Mermaid dependency graph showing all module relationships and data flow.
- **904 tests** (up from 899) — 5 new S0.11/S0.12 compliance tests verifying entry-point switch, ESLint ignores, and handler registration.

## [2.1.0] — 2026-07-26

### Sprint 3 — Sync & Offline Resilience

- **S3.3 — Optimistic UI**: `_guestPendingSync` Set in `guests.js`; `renderGuests()` marks rows with `data-sync-pending`; amber left-border + reduced opacity CSS in `components.css`; `clearGuestPendingSync()` called by `sheets.js` after successful flush.
- **S3.5 — Apps Script v2.0.0**: `sheets-webapp.gs` updated to v2.0.0 — `ALLOWED_SHEETS` now includes Vendors, Expenses, RSVP_Log; `deleteRow` action added; structured `{ ok, error, code }` error responses; `ensureSheets` creates all 6 tabs.
- **S3.9 — Offline-queue backoff**: `_MAX_RETRIES = 5`, `_RETRY_BASE_MS = 10_000`; failed items retried with exponential backoff (`2^retries × 10 s`, capped at 5 min); items exceeding retry limit are dropped silently.

### Sprint 4 — Quality Gates

- **S4.9 — Lighthouse thresholds**: `.lighthouserc.json` — severity upgraded from `warn` to `error`; performance raised to 0.90, accessibility to 0.95; `numberOfRuns: 2`, `throttlingMethod: simulate`, `preset: lighthouse:no-pwa`.

### Sprint 5 — DevOps & Protection

- **S5.4 — Branch protection**: `branch-protection.yml` workflow — weekly scheduled drift detection + manual apply job; uses `gh api` to verify required status checks, enforce_admins, disallow deletions.
- **S5.6 — Projects v2 automation**: `project-automation.yml` — auto-label via `actions/labeler`, auto-add to project board via `actions/add-to-project`, stale issue/PR management via `actions/stale`.
- **S5.10 — Deploy verification**: `deploy.yml` — post-deploy HTTP health check with 6 retries (exponential sleep); fails CI if site returns non-200 after all retries.

### Sprint 6 — Testing

- **S6.7 — Integration tests (DOM interaction)**: 57 new unit tests across 5 suites — offline-queue module, guest pending-sync, S3.3 CSS, branch-protection workflow, deploy verification, Lighthouse config assertions.
- **S6.9 — Visual regression**: `tests/e2e/visual.spec.mjs` — Playwright `toHaveScreenshot()` coverage for desktop (1280×720), mobile (390×844), and all 4 themes; 2% pixel-ratio tolerance.
- **S6.11 — CI coverage gate**: Removed `continue-on-error: true` from CI coverage step — failing thresholds now block CI.

### Sprint 7 — Documentation & Release

- **S7.2 — CLAUDE.md v3**: Updated test count (804+), commands (`test:e2e` includes visual), critical gotchas for S3.3/S3.5/S3.9/S4.9/S6.9/S6.11 + quote-style gotcha.
- **S7.3 — copilot-instructions.md v3**: Version bump to 2.1.0; test count to 804+; E2E note includes visual regression (S6.9).
- **S7.6 — GUIDE.md**: End-user guide (Markdown) covering all tabs, RSVP flow, WhatsApp, offline mode, admin login, troubleshooting.
- **S7.7 — CHANGELOG v2.1.0**: This entry.

### Sprint 0 — ESM Migration Scaffold

- **src/utils/**: Named-export ES modules — `phone.js` (cleanPhone, isValidPhone), `date.js` (formatDateHebrew, daysUntil), `sanitize.js` (sanitize, sanitizeInput), `misc.js` (uid, guestFullName), `index.js` barrel.
- **src/core/**: `store.js` (storeSubscribe, storeSet, storeGet, initStore), `events.js` (initEvents, on, off), `config.js` (app constants), `i18n.js` (t, applyI18n, loadLocale), `state.js` (save/load/remove/clearAll), `dom.js` (el Proxy), `ui.js` (showToast, openModal, closeModal), `nav.js` (navigateTo, initRouter, initSwipe).
- **src/services/**: `sheets.js` (enqueueWrite, sheetsPost, sheetsRead), `auth.js` (loginOAuth, loginAnonymous, isApprovedAdmin, maybeRotateSession).
- **src/main.js**: Bootstrap entry skeleton (not yet Vite entry — migration ongoing).
- **Tests**: 33 new tests across 4 `src/` structure suites (837 total).

### Sprint 3–7 (batch 2) — Security, Testing, DevOps, Docs

- **JS: utils.js** — `sanitize(input, schema)` (S4.2): schema-driven validation for string/number/boolean/phone/email/url types; drops script injection patterns; returns `{ value, errors }`.
- **JS: nav.js** — `_initSwipe()` (S2.7): touchstart/touchend-based swipe navigation across the main section list; ignores vertical scroll intent.
- **JS: sheets.js** — `enqueueSheetWrite(key, fn)` (S3.2): last-write-wins debounced write queue (1.5 s debounce, coalesces per key); `_mergeGuest()` (S3.4) last-write-wins conflict resolution via `updatedAt`; `syncVendorsToSheets()` + `syncExpensesToSheets()` (S3.8); RSVP log append to `SHEETS_RSVP_LOG_TAB` (S3.7); pull-to-refresh (S2.8): 80 px touch drag triggers Sheets sync.
- **JS: config.js** — Added `SHEETS_VENDORS_TAB`, `SHEETS_EXPENSES_TAB`, `SHEETS_RSVP_LOG_TAB` constants (S3.7).
- **JS: guests.js** — `syncGuestsToSheets()` routed through `enqueueSheetWrite()` (optimistic UI S3.3).
- **JS: gallery.js** — `decoding="async"`, explicit width/height on gallery images for CLS prevention (S4.6).
- **JS: ui.js** — `openModal()` sets `aria-modal=true`, clears `aria-hidden`, stores `_modalOpener`; `closeModal()` restores focus to opener (S7.9 a11y).
- **Vite** — Manual chunk splitting (S4.5): `locale-en`, `chunk-analytics`, `chunk-gallery`, `chunk-services` via `rollupOptions.output.manualChunks`; stable asset filenames with hashes.
- **Scripts** — `generate-precache.mjs` (S4.4): scans `dist/` after build, writes `precache-manifest.json`, outputs ready-to-paste `APP_SHELL` array for `sw.js`.
- **Scripts** — `sri-check.mjs` (S4.3): enhanced to also scan `dist/assets/` and print SRI hashes for built output.
- **Workflows** — `preview.yml` (S5.7): PR preview deploys to `/preview/pr-{n}/`; auto-cleans on PR close; sticky PR comment with preview URL.
- **Tests** — 82 new tests (772 total, 83+ suites): utils (S6.2), store (S6.3), router (S6.4), sheets (S6.5), auth (S6.6), sanitize (S4.2), swipe (S2.7), sheets tabs (S3.7), bundle chunks (S4.5), PR preview workflow (S5.7).
- **E2E** — Playwright expanded (S6.8): RSVP flow, navigation flow, a11y smoke (3 new describe groups, 11 new tests).
- **Coverage gate** — Raised to 70% lines/functions/statements, 60% branches (S6.10).
- **README** — Architecture `mermaid` diagram (S7.1/S7.5); updated project structure; themes table; test count 772+.
- **copilot-instructions.md** — Updated test count, file list, key patterns (S7.4).
- **package.json** — Added `precache` script.

### Sprint 2-6 (batch 1) — UI Modernization, Backend hardening, DevOps, Testing, Security

- **JS: nav.js** — `_withViewTransition()` helper; section switches use View Transitions API with graceful fallback.
- **JS: ui.js** — `showToast()` rewritten with icon/message spans, `toast-progress` bar with CSS animation, click-to-dismiss, `toast-out` exit animation.
- **JS: dashboard.js** — `IntersectionObserver`-based stat card reveal (`stat-hidden` → `stat-visible`) via `_observeStatCards()`.
- **JS: sheets.js** — Polling replaced `setInterval` with `setTimeout` + exponential backoff (30/60/120/300 s) + ±10 % jitter; `updateSyncStatus(state)` drives `.sync-status` indicator; `stopSheetsAutoSync` and visibility handler updated to `clearTimeout`.
- **JS: auth.js** — Session rotation every 2 h via `_maybeRotateSession()` + 15-min `setInterval` on admin login; `_SESSION_ROTATION_MS` constant added.
- **GitHub DevOps** — Bug report + feature request issue templates; `config.yml` disables blank issues; enhanced PR template with subsection checklists; Dependabot npm weekly; CODEOWNERS expanded with security-critical files; CI release workflow now runs `npm run ci` before release + `prerelease` flag for beta/alpha tags.
- **Security** — `public/_headers` for GitHub Pages: security headers + immutable cache for assets + no-cache for SW/manifest; `npm audit` step in CI security-scan job.
- **Testing** — Vitest v8 coverage (`test:coverage`); thresholds: 60 % lines/functions/statements, 50 % branches; coverage step in CI.
- **README** — CI + deploy live status badges added.

## [2.0.0-beta.2] — 2026-07-12

### Changed — Architecture & SEO

- **CSS `@layer` cascade management** — 7 named layers (`variables`, `base`, `layout`,
  `components`, `auth`, `responsive`, `print`) with explicit order declaration in `variables.css`.
- **CSS native nesting** — Converted 7 selector families in `components.css` to `&`-based nesting
  (card, stat-card, search-box, guest-table, form-group, empty-state, bottom-nav).
- **SEO meta tags** — Open Graph (`og:title/description/url/image/locale/site_name`), Twitter Card,
  canonical link, robots directive, and JSON-LD `Event` structured data.
- **Lighthouse CI thresholds raised** — perf ≥ 0.85, a11y ≥ 0.9, BP ≥ 0.9, SEO ≥ 0.9, PWA ≥ 0.6.
- **Removed stale preload hints** — Dropped 5 JS + 2 CSS `<link rel="preload">` tags that target
  source files (useless after Vite bundling).

## [2.0.0-beta.1] — 2026-07-11

### Changed — v2.0 Migration (Sprints 0–1)

- **Sprint 0 — Vite 8 build** — ES module entry (`js/main.js`), `vite-plugin-legacy-globals.mjs`
  auto-registers top-level declarations on `window`, `base: '/Wedding/'`, deploy `dist/`.
  Vitest 4 test runner (537 tests), ESLint flat config (`sourceType: "module"`).

- **Sprint 1.1 — Reactive store** — `js/store.js` Proxy-based store with debounced
  auto-persist to localStorage and `storeSubscribe(key, fn)` API.

- **Sprint 1.2 — Event delegation** — `js/events.js` replaces 110 inline `onclick=`
  handlers with `data-action` / `data-on-input` / `data-on-change` / `data-on-enter`.

- **Sprint 1.3 — Kill innerHTML** — 35/36 innerHTML calls replaced with
  `document.createElement` / `textContent` / `DocumentFragment`.

- **Sprint 1.4 — Tighten CSP** — `script-src 'self' 'sha256-...'` (no `unsafe-inline`).

- **Sprint 1.5 — i18n split to JSON** — Hebrew and English translations moved from JS
  objects to `js/i18n/he.json` and `js/i18n/en.json`. Hebrew loaded eagerly via Vite
  static import; English lazy-loaded on first language toggle via dynamic `import()`.
  Separate 35 KB async chunk for English locale.

- **Sprint 1.6 — JSDoc @ts-check** — `// @ts-check` added to all 37 JS files.
  `tsconfig.json` with `checkJs: true` for IDE type checking. `@typedef` for Guest,
  SeatingTable, WeddingInfo, and enum types in `js/config.js`.

### Fixed

- **Vite plugin async function support** — `vite-plugin-legacy-globals.mjs` now matches
  `async function` declarations (previously only `function`). Fixes tree-shaking of async
  functions like `loadExternalConfig`, `subscribePush`, and all Sheets API functions in
  production builds.

### Infrastructure

- **Bundle**: 45 KB gzip main + 12 KB gzip English locale (lazy)
- **Tests**: 537 pass (71 suites)
- **Lint**: 0 errors, 0 warnings

## [1.20.0] — 2026-04-14

Transportation option (bus pickup from 2 points), i18n locale split to separate files (`i18n.he.js` / `i18n.en.js`), JSDoc `@typedef` for Guest/Table/WeddingInfo, safer DOM writes (3 more innerHTML replaced).

## [1.19.0] — 2026-04-13

SRI tooling (`scripts/sri-check.mjs`), CI secrets injection (`scripts/inject-config.mjs`), Web Push notifications (`js/push.js`, VAPID, SW handlers, GAS helpers), bundle size report (`scripts/size-report.mjs`), Playwright E2E smoke tests (9 tests).

## [1.18.0] — 2026-04-13

Email notifications (`js/email.js`, GAS `MailApp`), Apps Script server-side validation + rate limiting (30 req/min), config externalization (`wedding.json`), Lighthouse CI (thresholds: perf ≥0.65, a11y ≥0.80, BP ≥0.80, SEO ≥0.70, PWA ≥0.50).

## [1.17.0] — 2025-07-18

Contact collector (`#contact-form`), offline RSVP queue + `#offlineBadge`, audit log (ring-buffer 200 entries, CSV export), error monitoring (`window.onerror` hook), PNG PWA icons (192/512), performance preloads + Apple PWA meta.

## [1.16.0] — 2025-07-17

Registry links (gift registry URLs on landing page), check-in mode + live headcount (`#sec-checkin`), table finder on landing page, print materials (`printPlaceCards` / `printTableSigns`), photo gallery (`#sec-gallery`, Canvas compression, lightbox).

## [1.15.0] — 2025-07-16

Guest-facing landing page (`#sec-landing`), hash router (`js/router.js`, `history.replaceState`), embedded venue map (Nominatim/OSM iframe), expense budget tracker (`js/expenses.js`, 8 categories), smart Sheets polling (pause on tab hidden/resume on focus).

## [1.14.0] — 2025-07-15

Mobile-first bottom navigation (5 tabs, ≤768px), animated stat counters, timeline section (`js/timeline.js`, CRUD, sorted), RSVP QR code (Settings card), accessibility (skip link, ARIA roles, focus management).

## [1.13.0] — 2025-07-14

Dark/light mode toggle (5 themes × 2 modes), `--header-bg` variable, `body.light-mode` palette, `toggleLightMode()` / `_applyThemeClasses()`, persisted with `prefers-color-scheme` fallback.

## [1.12.0] — 2025-07-13

Analytics section (`#sec-analytics`, admin-only): SVG donut (RSVP status), bar charts (side/meal/invitation), headcount grid — 5 cards, 9 DOM IDs, 7 CSS classes, 17 i18n keys.

## [1.11.0] — 2026-04-14

OAuth re-added (Google GIS, Facebook JS SDK, Apple Sign-In) — all check `isApprovedAdmin(email)`; ESLint upgraded to `ecmaVersion: 2025`; 6 new lint rules; `npm run lint:fix` + `npm run ci` aliases.

## [1.10.0] — 2026-04-13

Dashboard donut charts (RSVP status / meal preferences / sides) via Canvas 2D `renderCharts()` + HiDPI-aware `_drawDonut()`; DOM legend; 8 new tests (185 total); 6 i18n keys.

## [1.9.0] — 2026-04-13

Security hardening: brute-force lockout (5 attempts / 5 min), 8-hour session expiry, CSV injection guard (`csvCell()`), server-side admin mutation guards, guest field length-clamping via `sanitizeInput()`.

## [1.8.0] — 2026-04-13

Auth simplified to email-allowlist only (OAuth removed); guest auto-login; email modal sign-in; Settings → User Access for dynamic approved emails; auth overlay redesigned.

## [1.7.0] — 2025-08-01

CSP meta tag, framebusting guard, `sanitizeInput`/`isValidHttpsUrl` utilities, RSVP rate-limiting (90 s), JSON import scrubbing, `renderInvitation` data-URI guard, 9 security tests (163 total).

## [1.6.0] — 2026-04-13

Google Sheets backend: gviz public read, Apps Script Web App writes, `Config` tab for wedding info, 30 s auto-sync, `createMissingSheetTabs()`, runtime Web App URL in Settings.

## [1.5.0] — 2026-04-14

Multi-provider OAuth: Google GIS, Facebook JS SDK, Apple Sign-In — all dynamically loaded; Settings UI for credentials + approved-email management; `isApprovedAdmin()`, `loadFBSDK()`, `loadAppleSDK()`.

## [1.4.0] — 2026-04-13

Budget & Gift Tracker (`budget.js`): gift totals, progress bar, inline per-guest gift input, `parseGiftAmount()`, `saveBudgetTarget()`, 9 new tests.

## [1.3.0] — 2026-04-13

Seating chart PDF export (`printSeatingChart()`): print-ready popup, table grid with meal icons, zero dependencies.

## [1.2.0] — 2026-04-13

Modular architecture (`index.html` + `css/` + `js/`), real Facebook/Apple OAuth, Service Worker banner, ESLint globals for FB/AppleID, `.vscode/tasks.json`, CI Node matrix 22+24, `CLAUDE.md` rewritten.

## [1.1.0] — 2026-04-13

Enhanced guest model, emoji/tooltip system, Google/guest auth, Google Sheets sync, 0-warning lint baseline, architecture diagram, CLAUDE.md, CI and Copilot config improvements.

## [1.0.0] — 2026-04-13

Initial release: dashboard, guest management, table seating, SVG invitation, WhatsApp bulk send, RSVP, CSV export, Hebrew RTL + English i18n, 5 themes, PWA (offline SW), glassmorphism design, print stylesheet, 125 unit tests, GitHub Actions CI/CD.

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [6.4.0] — 2025-07-19

> **Utility & Developer Toolkit** — 9-sprint batch covering export helpers, a11y auditing, print layouts, guest token service, token-gate utility, performance utilities, and admin debug tools.

### Sprint 31 — Security regression tests

- `tests/unit/security.test.mjs`: 30 XSS / prototype-pollution / input-validation tests
- Fix: `src/utils/sanitize.js` email type now checks `_SCRIPTS_RE` (XSS in email fields)

### Sprint 32 — Skeleton loading states

- `src/utils/skeleton.js`: `showSkeleton`, `hideSkeleton`, `isSkeletonVisible`, `createSkeletonRows`, `clearSkeletonRows`, `runWithSkeleton`
- Tests: 19 new (skeleton.test.mjs)

### Sprint 33 — Export helpers CSV/JSON

- `src/utils/export-helpers.js`: `escapeCSV`, `rowsToCSV`, `guestsToCSV`, `vendorsToCSV`, `expensesToCSV`, `toJSON`, `jsonToBlob`, `downloadFile`, `parseCSV`
- Tests: 27 new (export-helpers.test.mjs); includes round-trip guard

### Sprint 34 — Accessibility audit utilities

- `src/utils/a11y.js`: `auditImages`, `auditForms`, `auditHeadings`, `auditInteractive`, `auditContrast`, `auditAll`
- Tests: 22 new (a11y.test.mjs)

### Sprint 35 — Print layout utilities

- `src/utils/print-helpers.js`: `buildPrintHTML`, `buildGuestListHTML`, `buildSeatingChartHTML`, `buildVendorListHTML`, `triggerPrint`, `stripTags`
- Tests: 19 new (print-helpers.test.mjs)

### Sprint 36 — Guest token service

- `src/services/guest-token.js`: `generateToken`, `parseToken`, `verifyToken`, `isTokenExpired`, `revokeToken`, `isRevoked`, `clearRevokedTokens`, `getGuestByToken`, `issueGuestToken`, `recordIssuedToken`
- Fix: `b64urlDecode` padding formula corrected from XOR formula to standard `remainder-based` padding
- Tests: 24 new (guest-token.test.mjs)

### Sprint 37 — Token-gate utility

- `src/utils/token-gate.js`: `isTokenValid`, `withTokenGate`, `requireToken`, `withTokenGateAsync`, `gateElement`, `gateControl`, `watchToken`
- Tests: 22 new (token-gate.test.mjs)

### Sprint 38 — Performance utilities

- `src/utils/perf.js`: `debounce` (with cancel/flush), `throttle`, `memoize`, `memoizeAsync`, `measureAsync`, `once`, `createBatcher`
- Tests: 21 new (perf.test.mjs)

### Sprint 39 — Admin debug utilities

- `src/utils/admin-debug.js`: `dumpStore`, `diffStore`, `validateStoreShape`, `getStoreHealth`, `resetKey`, `setDebugFlag`, `getDebugFlag`
- Tests: 17 new (admin-debug.test.mjs)

### Sprint 40 — v6.4.0 release

- Full test suite: **2605 tests / 71 suites** — all pass (0 failures)
- Version bump: `package.json`, `config.js`, `sw.js`, `wedding.test.mjs`, `README.md`

## [6.3.0] — 2025-07-18

> **Domain Service Layer & GDPR** — 10-sprint uplift covering immutable helpers, optimistic updates, soft-delete, store subscription tracking, guest/table/vendor/expense domain services, conflict resolution logic, and privacy admin utilities.

### Sprint 21 — Immutable update helpers

- `src/utils/immutable.js`: `replaceById`, `removeById`, `updateById`, `insertSorted`, `appendUnique`, `toggleIn`, `omitKeys`, `pickKeys`, `deepClone`
- Tests: 34 new (immutable.test.mjs)

### Sprint 22 — Optimistic update helpers

- `src/utils/optimistic.js`: `withOptimistic`, `createOptimisticCheckpoint`, `withOptimisticBatch`, `optimisticAppend`, `optimisticRemove`
- Tests: 19 new (optimistic.test.mjs)

### Sprint 23 — Soft-delete in repositories

- `src/services/repositories.js`: `getActive()`, `softDelete()`, `restore()`, `listDeleted()` on `guestRepo` and `vendorRepo`
- `supabase/migrations/015_tables_expenses_soft_delete.sql`: `deleted_at` column for tables + expenses
- Tests: +12 (repositories.test.mjs)

### Sprint 24 — Store subscription leak tests

- `src/core/store.js`: `getSubscriptionCount(scope?)` function
- Tests: 14 new (store-subscriptions.test.mjs)

### Sprint 25 — Guest domain service

- `src/services/guest-service.js`: `confirmGuest`, `declineGuest`, `tentativeGuest`, `resetGuestStatus`, `assignToTable`, `unassignFromTable`, `bulkSetStatus`, `importGuests`, `getGuestStats`, `findFollowUpCandidates`, `searchGuests`
- Tests: 30 new (guest-service.test.mjs)

### Sprint 26 — Table domain service

- `src/services/table-service.js`: `assignGuestToTable` (capacity guard + force mode), `unassignGuestFromTable`, `moveTable`, `getTableOccupancy`, `findAvailableTables`, `getCapacityReport`, `autoAssign`, `clearAssignments`
- Tests: 20 new (table-service.test.mjs)

### Sprint 27 — Vendor + expense domain services

- `src/services/vendor-service.js`: `markVendorPaid`, `addVendorPayment`, `markVendorBooked`, `getVendorsByPaymentStatus`, `getBudgetSummary`, `getUnpaidVendors`
- `src/services/expense-service.js`: `addExpense`, `updateExpense`, `removeExpense`, `getBudgetUsed`, `getBudgetTotal`, `getBudgetRemaining`, `getOverBudget`, `getExpenseSummary`, `getExpensesByDateRange`
- Tests: 34 new (vendor-service + expense-service)

### Sprint 28 — Conflict resolver pure logic

- `src/core/conflict-resolver.js`: `detectConflicts`, `fieldLevelMerge`, `autoResolve` (framework-agnostic, no DOM dependency)
- Tests: 18 new (conflict-resolver.test.mjs)

### Sprint 29 — Privacy admin utilities

- `src/utils/privacy.js`: `PII_FIELDS`, `exportGuestData` (Art. 20 GDPR), `anonymizeGuest`, `purgeGuestData` (Art. 17 GDPR), `getDataRetentionReport`
- Tests: 16 new (privacy.test.mjs)

### Sprint 30 — v6.3.0 release

- Version bump: `package.json`, `config.js`, `sw.js`, `wedding.test.mjs`, `README.md`
- Tests: **2404 pass** / 62 suites (baseline was 2207 / 53)



> **Infrastructure & Safety** — 10-sprint uplift covering section contracts, render primitives, store V2, pagination, repositories, DB migrations, RBAC, PII masking, and operations runbooks.

### Sprint 11 — Section contract system (Phase 1)

- `src/core/section-contract.js`: `SECTION_CAPABILITIES`, `validateSectionModule`, `buildCapabilityMap`, `getSectionsWithCapability`
- `scripts/validate-sections.mjs`: CI validator for section lifcycle contract
- `src/sections/guests.js`, `rsvp.js`: added `capabilities` exports
- `package.json`: `validate:sections` script wired into `ci`
- Tests: 17 new (section-contract.test.mjs)

### Sprint 12 — Render helpers & toast system (Phase 6)

- `src/utils/render-helpers.js`: `renderEmpty`, `renderLoading`, `renderError`, `renderCount` with safe ARIA roles
- `src/utils/toast.js`: accessible toast queue — MAX_VISIBLE=4, id-dedup, persistent option, `_resetToastState` for tests
- Tests: 33 new (render-helpers + toast)

### Sprint 13 — Store V2 enhancements (Phase 2)

- `src/core/store.js`: `storeSubscribeOnce`, `storeBatchAsync`, `getSubscriberStats`
- Tests: 7 new (store-v2 Sprint 13 suite)

### Sprint 14 — Pagination & virtual-list utilities (Phase 2)

- `src/utils/pagination.js`: `paginateArray`, `cursorPaginateArray`, `createPageState`, `buildPageButtons`
- `src/utils/virtual-list.js`: `createVirtualViewport` with `scrollTo`, `setItems`, `getViewport`
- Tests: 29 new (pagination + virtual-list)

### Sprint 15 — TimelineRepository + RsvpLogRepository (Phase 3)

- `src/types.d.ts`: `RsvpLogEntry`, `TimelineRepository`, `RsvpLogRepository` interfaces
- `src/services/repositories.js`: `timelineRepo` (CRUD + getOrdered + setDone), `rsvpLogRepo` (append-only + getByGuest)
- Tests: 16 new (repositories Sprint 15 suite)

### Sprint 16 — DB enum CHECK constraints (Phase 3)

- `supabase/migrations/011–014`: CHECK constraints for vendors/expenses/rsvp_log/contacts; ADD COLUMN rsvp_log.children/notes; config.json_value JSONB column

### Sprint 17 — Roles & permission model (Phase 4)

- `src/utils/roles.js`: `ROLES`, `ROLE_PERMISSIONS`, `resolveRole`, `hasPermission`, `getRoleFromUser`, `getAccessibleSections`, `canAccessSection`
- `src/services/audit.js`: `logAdminAction(permission, entityId, diff)`
- Tests: 21 new (roles.test.mjs)

### Sprint 18 — PII classification & masking (Phase 5)

- `src/utils/pii.js`: `DATA_CLASS`, `STORE_KEY_CLASSES`, `maskPhone`, `maskEmail`, `maskName`, `classifyRecord`, `redactForLog`, `safeGuestSummary`
- Tests: 25 new (pii.test.mjs)

### Sprint 19 — Operations & integrations documentation (Phase 9)

- `docs/operations/deploy-runbook.md`: GitHub Pages + Supabase deploy guide
- `docs/operations/incident-response.md`: P0/P1/P2/P3 runbook
- `docs/operations/migrations.md`: full migration inventory + authoring guide
- `docs/integrations/supabase.md`: architecture, RLS, write queue, setup
- `docs/integrations/overview.md`: all integrations, auth flow, offline support

### Sprint 20 — v6.2.0 release

- Version bump: `package.json`, `config.js`, `sw.js`, `wedding.test.mjs`, `README.md`
- Pre-existing lint fixes: unused imports, missing globals (HTMLSpanElement, TouchEvent, HashChangeEvent, global) in test ESLint config
- Tests: 2207 passing / 53 suites (up from 2053 / 46)

---

## [6.1.0] — 2025-07-13

> **Foundation Hardening** — 10-sprint quality & observability uplift across types, security, a11y, and local-first data.

### Sprint 1 — Documentation accuracy

- `ARCHITECTURE.md`, `ROADMAP.md`, `docs/API.md`: corrected version refs, module counts, feature parity

### Sprint 2 — TypeScript types expansion

- `src/types.d.ts`: Added `AppEvent`, `SyncState`, `DataClass`, `HealthReport`, `GuestRepository`, `VendorRepository`, `TableRepository`, generic `Repository<T>`, result wrappers

### Sprint 3 — Constants & action registry hardening

- `src/core/constants.js`: Added `GUEST_STATUSES`, `GUEST_SIDES`, `GUEST_GROUPS`, `MEAL_TYPES`, `TABLE_SHAPES`, `VENDOR_CATEGORIES`, `EXPENSE_CATEGORIES` freeze-arrays
- `scripts/validate-actions.mjs`: Detects data-action references not covered by ACTIONS registry

### Sprint 4 — Repository interface layer

- `src/services/repositories.js` (new): `GuestRepository`, `VendorRepository`, `TableRepository` wrapping store with typed CRUD + stats helpers

### Sprint 5 — Store V2 immutable helpers

- `src/core/store.js`: `getImmutable()`, `patchItem()`, `removeItem()`, `updateLookup()` on the store root

### Sprint 6 — Local-first data discipline

- `src/services/sync-tracker.js` (new): Per-domain `SyncState` tracker — `getSyncState`, `markSyncing`, `markSynced`, `markSyncError`, `markAllOffline`, `markAllOnline`, `watchSyncState`
- `src/services/offline-queue.js`: Added `getQueueStats()` and internal `_exhaustedCount` tracking
- 21 new tests (sync-tracker) + 10 new tests (offline-queue)

### Sprint 7 — Supabase schema migrations

- `supabase/migrations/007_fk_guests_table_id.sql`: FK `guests.table_id → tables(id) ON DELETE SET NULL`
- `supabase/migrations/008_unique_guest_phone.sql`: Partial unique index on `phone WHERE phone ≠ ''`
- `supabase/migrations/009_soft_delete.sql`: `deleted_at TIMESTAMPTZ` column on guests + vendors
- `supabase/migrations/010_pagination_indexes.sql`: Cursor-pagination indexes for all core tables
- `src/types.d.ts`: Added `deletedAt?: string | null` to `Guest` and `Vendor`

### Sprint 8 — Security & privacy hardening

- `public/_headers`: Added `https://*.supabase.co` and `wss://*.supabase.co` to CSP `connect-src`
- `scripts/security-scan.mjs` (new): Static OWASP scanner (no-eval, no-new-function, no-document-write, no-unsafe-innerHTML, no-http-url) with `// nosec` escape hatch
- `package.json`: Added `security-scan` script; wired into `ci` pipeline

### Sprint 9 — UX & accessibility polish

- `src/core/template-loader.js`: Sets `aria-busy="true"` during template load; calls `announce()` on completion
- `src/utils/form-validator.js` (new): Accessible form validation — `validateForm()`, `clearFormErrors()`, `setFieldError()` with `aria-invalid`, `aria-describedby`, `role=alert` error spans, auto-clear on input
- `src/utils/index.js`: Re-exports `form-validator.js`
- 16 new tests (form-validator)

### Sprint 10 — Observability & release (this release)

- `src/services/health.js` (new): Session error health monitor — `captureHealthError()`, `getHealthReport()` (status: healthy/degraded/critical), `resetHealthState()`; integrates with offline-queue stats; hooks `window.onerror` / `unhandledrejection`
- Version bumped to `6.1.0` across `package.json`, `src/core/config.js`, `public/sw.js`
- 12 new tests (health)

### Total new tests this release cycle: 1957+ (from 1915 baseline)

## [6.0.0] — 2025-07-10

> **Architecture Renaissance** — Modular core, Supabase-first backend, full security hardening.

### Breaking Changes

- `main.js` reduced from 553 → 162 lines; section loading moved to `src/core/section-resolver.js`
- Event handlers moved to `src/handlers/event-handlers.js`
- Auth handlers moved to `src/handlers/auth-handlers.js`; nav-auth to `src/core/nav-auth.js`

### Phase 6 — Architecture

#### Sprint S6 (Phase 6.3) — main.js modularization

- `src/core/section-resolver.js` — section lifecycle, lazy-loading, auth-gating
- `src/handlers/event-handlers.js` — event switcher (doSwitchEvent, doAddEvent)
- `src/core/nav-auth.js` — nav visibility based on auth state
- `src/handlers/auth-handlers.js` — registerAuthHandlers() for 6 auth actions
- 1896 tests passing (was 1864, +32 new tests)

#### Sprint S7 (Phase 6.5) — Action Registry

- `src/core/action-registry.js` — 108 typed `ACTIONS` constants, single source of truth
- `scripts/validate-actions.mjs` — pre-build validation: templates vs registry vs handlers
- `npm run validate` — exits non-zero on any mismatch

### Phase 7 — Supabase Backend

#### Sprint S8 (Phase 7.1) — Supabase Migrations

- `supabase/migrations/003_triggers.sql` — `updated_at` auto-triggers, `upsert_guest/upsert_table`
- `supabase/migrations/004_audit_log.sql` — audit trail table, RLS policies, diff tracking
- `supabase/migrations/005_error_log.sql` — error log, materialized hourly summary view
- `supabase/migrations/006_weddinginfo_config.sql` — weddingInfo as JSONB in config table

#### Sprint S9 (Phase 7.3+7.4) — Supabase Auth + Realtime Services

- `src/services/supabase-auth.js` — zero-dep Auth REST client (OAuth, magic link, anonymous)
- `src/services/supabase-realtime.js` — native WebSocket Realtime client, exponential backoff

### Phase 8 — Security

#### Sprint S10 (Phase 8.3+8.4) — Audit Client + CodeQL

- `src/services/audit.js` — fire-and-forget audit entry writer + error logger
- `.github/workflows/codeql.yml` — CodeQL SAST (weekly + on push to main)
- `npm audit --audit-level=moderate` (was `--audit-level=high`)

### Phase 9 — UX & Accessibility

#### Sprint S11 (Phase 9.1+9.2) — Mobile E2E + axe-core

- `tests/e2e/mobile.spec.mjs` — mobile (360px) and tablet (768px) viewport E2E tests
- Touch target validation (≥32px), no-overflow, reduced-motion CDP emulation
- `@axe-core/playwright` added to devDependencies

#### Sprint S12 (Phase 9.3) — i18n Parity + CSS Logical Props

- `scripts/validate-i18n.mjs` — 4-locale parity validator, included in `npm run ci`
- `scripts/_sync-i18n-parity.mjs` — synced all locales to 1048 keys each
- 32 new keys added to he/en (plural rules, WA reminders, email templates, PDF summary)
- 10 keys added to ar/ru (user_mgr, noshow, suggest, ics_wedding_title)
- `margin-right/left` → `margin-inline-start/end` in components.css (6 instances)

#### Sprint S13 (Phase 9.4) — Performance + CI Gates

- `storageSetBatch(entries)` in `storage.js` — batch IDB writes in single transaction
- CI: `npm run validate` + `npm run validate:i18n` gates before unit tests

### Phase 10 — Intelligence & Automation

#### Sprint S14 (Phase 10.4) — Smart Automation Helpers

- `src/utils/smart-automation.js` — pure utility functions, no side effects
  - `smartFollowUp(guests)` — follow-up candidates sorted by priority (high/medium/low)
  - `summarizeFollowUp(candidates)` — {high, medium, low, total} counts
  - `buildDayOfPlaybook(timeline, vendors)` — chronological day-of checklist
  - `scoreSeatingCandidate(guest, table, seated)` — 0-100 seating fit score
- `tests/unit/smart-automation.test.mjs` — 19 unit tests (39 test files total)

### Statistics

| Metric | v5.5.0 | v6.0.0 |
| --- | --- | --- |
| Tests | 1864 | **1915** |
| Test files | 34 | **39** |
| Source files | ~70 | **~85** |
| i18n keys | 1016 | **1048** |
| Supabase migrations | 2 | **6** |
| Action constants | — | **108** |
| CI steps | 4 | **8** |

## [5.5.0] — 2025-06-20

### Added — 45 Intelligence Helpers (Sprints 1–9)

#### Sprint 1 — Analytics Intelligence

- `getCostPerHead()` — cost per confirmed guest head
- `getSeatingCompletion()` — seated vs confirmed percentage
- `getBudgetCategoryBreakdown()` — budget breakdown by vendor category
- `getRsvpDeadlineCountdown()` — days until RSVP deadline
- `getVendorPaymentProgress()` — payment completion by vendor

#### Sprint 2 — Budget Intelligence

- `getBudgetVsActual()` — budgeted vs actual by category
- `getMonthlyExpenses()` — expenses grouped by YYYY-MM
- `getPaymentUtilization()` — payment rate by vendor category
- `getBudgetForecast()` — monthly burn rate + months-left prediction
- `getTopExpenses()` — combined expenses + vendors sorted by amount

#### Sprint 3 — Seating Intelligence

- `getTablesWithMixedDiets()` — tables with different meal types
- `getTableUtilization()` — seats used / capacity per table
- `getTableSideBalance()` — groom/bride/mutual count per table
- `getOverCapacityTables()` — tables exceeding capacity
- `getUnseatedGuestBreakdown()` — unseated confirmed guests by side/group

#### Sprint 4 — Guest Insights

- `getPlusOneStats()` — party size metrics for confirmed guests
- `getGuestsMissingMeal()` — confirmed guests with no meal preference
- `getGiftSummary()` — total/avg/max gift amounts
- `getGuestAge()` — days since creation per guest
- `getChildrenCount()` — children count from confirmed guests

#### Sprint 5 — Vendor Intelligence

- `getVendorTimeline()` — upcoming due dates sorted by urgency
- `getVendorsByCategory()` — grouped cost/payment totals per category
- `getVendorsMissingContract()` — vendors without contractUrl
- `getLowRatedVendors()` — vendors rated below threshold
- `getVendorBudgetShare()` — budget share percentage per vendor

#### Sprint 6 — RSVP & WhatsApp Analytics

- `getRsvpRateBySide()` — response rate by groom/bride/mutual
- `getRsvpResponseTime()` — avg/fastest/slowest response time in days
- `getRsvpDailyTrend()` — daily RSVP submission counts
- `getWhatsAppSendRate()` — sent vs eligible rate
- `getMessageStatsByGroup()` — message delivery breakdown by guest group

#### Sprint 7 — Check-in Intelligence

- `getCheckinRateBySide()` — check-in rate by side
- `getCheckinRateByTable()` — arrival rate per table
- `getVipNotCheckedIn()` — VIP guests not yet arrived
- `getAccessibilityNotCheckedIn()` — accessibility guests not arrived
- `getCheckinTimeline()` — check-ins bucketed by hour

#### Sprint 8 — Timeline & Dashboard

- `getTimelineCompletionStats()` — done/pending/rate for timeline
- `getTimelineDuration()` — total event duration in minutes
- `getUpcomingTimelineItems()` — next N undone timeline items
- `getWeddingReadinessScore()` — 0-100 composite readiness score
- `getDashboardSnapshot()` — key metrics for dashboard header

#### Sprint 9 — Expenses, Gallery & Settings

- `getExpenseMonthlyTrend()` — monthly expense totals
- `getLargestExpenses()` — top N expenses by amount
- `getGalleryStats()` — photo count, caption stats
- `getDataCompletenessScore()` — guest data quality percentage
- `getStoreSizes()` — store key sizes in bytes

### Changed

- Test count: 1779 → 1864+ (34 suites)
- New test file: `tests/unit/settings.test.mjs`

## [5.4.0] — 2026-04-17

### Added — 50 Features (Sprints 1–9)

#### Sprint 1 — Accessibility & High-Contrast

- Focus trap for modal dialogs (Tab/Shift+Tab cycling)
- `prefers-contrast: more` high-contrast CSS support
- `forced-colors: active` Windows High Contrast mode support
- Screen reader announcements on section navigation (`announce()`)
- Skip-to-content link integration

#### Sprint 2 — Data Export & Integrity

- `exportTimelineCSV()` — timeline items as CSV download
- `exportContactsCSV()` — contact collector export
- `exportAllCSV()` — bulk export 5 sections as separate CSVs
- `checkDataIntegrity()` — validates orphaned table IDs, duplicates, invalid statuses
- Data integrity i18n keys (he/en/ar/ru)

#### Sprint 3 — WhatsApp Enhancements

- Character counter for WhatsApp message templates
- Template variable insertion panel (7 variable buttons, cursor-aware)
- WhatsApp schedule UI (datetime-local + schedule/cancel)
- `scheduleReminders()` / `cancelScheduledReminders()` in WhatsApp section
- Schedule status display with pending count

#### Sprint 4 — RSVP & Guest UX

- RSVP rate limiting (1 submission per phone per hour, localStorage-based)
- RSVP success animation (`.rsvp-confirm--animated` + `@keyframes rsvpPop`)
- Wedding countdown on RSVP page (`renderRsvpCountdown()`)
- Duplicate phone detection warning in guest save
- RSVP countdown i18n keys (he/en/ar/ru)

#### Sprint 5 — Table & Seating Enhancements

- Table notes field (maxlength 200) in modal and card display
- Dietary summary icons per table (🥬🌱🚫🌾✡️)
- Table capacity progress bar in card view
- `exportTableCSV(tableId)` — single table guest list export
- Table notes i18n keys (he/en/ar/ru)

#### Sprint 6 — Vendor & Budget Enhancements

- Vendor rating field (1-5 stars, ★★★☆☆ display)
- Vendor payment filter (all/paid/unpaid/overdue)
- `getVendorPaymentSummary()` — total/paid/outstanding analytics
- Rating column in vendor table rendering
- Vendor filter i18n keys (he/en/ar/ru)

#### Sprint 7 — Guest Management Enhancements

- `getGuestGroupSummary()` — counts by group with status breakdown
- `exportGuestsByGroup(group)` — filtered CSV export
- `getAccessibilitySummary()` — accessibility needs aggregation
- `getTransportSummary()` — route-to-passenger mapping
- Group export action handler wiring

#### Sprint 8 — Analytics & Intelligence

- `computeResponseVelocity()` — RSVP submissions per day
- `getMealDistribution()` — meal counts + percentages for confirmed guests
- `getSideBalance()` — groom/bride/mutual distribution
- `getCheckinVelocity()` — arrivals per 15-minute slot
- `getRsvpConversionRate()` — sent/responded/confirmed funnel

#### Sprint 9 — Developer Experience

- Keyboard shortcuts help overlay (`?` key opens dialog)
- Global error monitor (`initErrorMonitor()`) — captures unhandled errors to localStorage
- Bootstrap performance timing (`performance.mark/measure`)
- `getAppHealth()` diagnostic utility in config.js
- `exportDebugReport()` — JSON download with errors + store diagnostics

## [5.3.0] — 2026-04-16

### Added — Sprints 1-10

- **F3.1.4** `prefers-reduced-motion` enhancements — kills particle, countdown, confetti animations.
- **F3.1.5** Color contrast boost — text opacities raised for dark/light themes (WCAG AA).
- **F2.4.1** Retry constant consolidation — `MAX_RETRIES`/`BACKOFF_BASE_MS` in `src/core/config.js`.
- **F3.2.1** Arabic locale (ar.json) — 988 RTL keys.
- **F3.2.2** Russian locale (ru.json) — 988 keys. Vite manualChunks for ar/ru.
- **F3.2.3** ICU MessageFormat — `formatMessage()` with `Intl.PluralRules`; `t()` accepts params.
- **F4.2.1** Scheduled reminder queue — localStorage-persisted `wedding_v1_reminderQueue`.
- **F4.2.3** Paced thank-you via Green API — 350ms delay, progress UI.
- **F4.2.4** Email templates — `generateMailtoLink()` + batch `sendBatchEmails()`.
- **F4.3.1** RSVP funnel — 6-stage tracking (invited → linkClicked → formStarted → confirmed → checkedIn).
- **F4.3.5** Executive PDF — one-page summary via `window.print()`.
- **F3.1.1** Accessibility E2E tests — 10 tests (axe-core ready + manual checks).
- **F5.1.1** API docs generator — `scripts/generate-docs.mjs` → `docs/API.md` (379 exports).
- **F5.1.5** Domain agents — analytics-agent + vendor-agent for Copilot.
- **F5.2.1** Plugin architecture — `registerPlugin/mountPlugin/unmountPlugin` API.
- **F5.2.2** Plugin demos — gallery, registry, contact-collector as plugin wrappers.
- **F5.2.3** Plugin authoring guide — `docs/PLUGINS.md`.
- **F1.6.4** Per-section Vite chunks — `sec-dashboard`, `sec-guests`, etc.
- **F1.2.4** Offline queue ESM — `src/services/offline-queue.js` using shared config constants.
- **F1.3.5** StoreKeys type map — typed store key → value interface.
- **F1.2.7** Doc references updated — `js/` → `src/` in README, copilot-instructions.
- **F2.2.1** SQL migrations — `supabase/migrations/001_create_tables.sql` (9 tables).
- **F2.2.2** RLS policies — `supabase/migrations/002_rls_policies.sql`.
- **F2.2.5** Backend health fallback — dual check in "both" mode with console warnings.
- **F4.2.2** WhatsApp Cloud API evaluation — `docs/WA-CLOUD-API-EVAL.md`.
- **F5.3.1** Edge deployment evaluation — `docs/EDGE-DEPLOYMENT-EVAL.md`.

### Stats

- **Tests**: 1812 passing (19 suites) — +15 plugin tests
- **Lint**: 0 errors, 0 warnings
- **i18n**: 4 languages (he, en, ar, ru) with ICU plural support
- **Agents**: 4 Copilot agents (guest-manager, wedding-designer, analytics, vendor)

## [5.2.0] — 2025-07-26

### Added — Phase 2-5 Features

- **F3.3.3 Bottom sheet modals**: Slide-up modal pattern on mobile (`@media max-width: 768px`) with `modalSlideUp` animation.
- **F3.3.4 Scroll-driven animations**: Timeline items reveal on scroll via `animation-timeline: view()`.
- **F4.1.5 Vendor payment due reminders**: Dashboard card showing vendors with payments due within 7 days (overdue/soon/upcoming).
- **F4.1.1 Table assignment suggestions**: `suggestTableAssignments()` — non-destructive scoring by side, group, meal to suggest optimal seating.
- **F4.1.2 No-show prediction**: `predictNoShowRate()` — estimates no-shows based on RSVP timing (5%/15%/25% tiers).
- **F4.2.5 Calendar invite (.ics)**: `generateICS()` + download button in WhatsApp section for adding wedding event to calendars.
- **F2.4.3 Queue drain progress bar**: Settings sync monitor shows progress bar with percentage as queue items drain.
- **F4.3.2 Response time histogram**: SVG bar chart showing guest RSVP response time distribution.
- **F4.3.3 Budget burn-down chart**: SVG line chart showing cumulative spending vs budget target.
- **F4.3.4 Seating quality score**: Side/group coherence scoring (A-D grade) for current table assignments.
- **F3.2.4 Intl.DateTimeFormat**: `formatDate()` in i18n module — locale-aware date formatting.
- **F3.2.5 Intl.NumberFormat**: `formatNumber()` and `formatCurrency()` in i18n module.
- **F2.1.1 getSchema client API**: `fetchServerSchema()` for retrieving GAS column order + version.
- **F2.1.2 Schema validation**: `validateSchema()` compares local `_COL_ORDER` against server schema.
- **F2.1.3 Version handshake**: `schemaHandshake()` checks major version compatibility between client and GAS.
- **F2.1.6 HTTP 429 backoff**: `sheetsPostImpl()` retries with exponential backoff on Too Many Requests.
- **F1.3.4 tsc in CI**: `npm run typecheck` step in CI workflow (non-blocking, informational).
- **F1.6.2 Eager entry sections**: Preload landing, rsvp, dashboard modules during bootstrap.
- **F5.1.3 ADRs**: Architecture Decision Records for zero-deps, ESM modules, store-driven reactivity.
- **F5.1.4 Add-section tutorial**: Step-by-step guide in CONTRIBUTING.md.

## [5.1.0] — 2025-07-25

### Added — Phase 1 Remaining + Phase 2-4 Features

- **F1.4.2 Modal glob auto-discovery**: Replace manual `_modalLoaders` object with `import.meta.glob("../modals/*.html")` → Map for zero-config modal loading.
- **F1.4.3 Missing modal warning**: `console.warn` when modal template not found (instead of silent return).
- **F1.5.4 Column order validation**: `sheets-impl.js` validates `_COL_ORDER` is non-empty, starts with "id", and has no duplicates on load.
- **F1.5.5 Storage error callback**: `onStorageError(fn)` export in `store.js` — callback when localStorage persist fails.
- **F1.6.3 Template prefetch**: `prefetchTemplates(["guests", "tables", "rsvp", "analytics"])` on idle after bootstrap.
- **F1.7 Doc consolidation**: Merge `GUIDE.md` into README, delete `GUIDE.md` + `CLAUDE.md`, add `scripts/sync-version.mjs`.
- **F2.3 IndexedDB storage**: `src/core/storage.js` — async storage abstraction with 3-tier fallback (IndexedDB → localStorage → in-memory). Auto-migration from localStorage on first run.
- **F2.4 Offline queue unification**: Queue keys persisted to IndexedDB (survive restart). `recoverOfflineQueue()` on reload. `visibilitychange` listener flushes queue.
- **F3.1 Accessibility**: `:focus-visible` outlines, `role="status"` on sync badge, verified aria-live regions and toast alert roles.
- **F3.3 Mobile polish**: Haptic feedback on check-in (`navigator.vibrate`), 48×48 px minimum touch targets (`pointer: coarse`), auto-detect `prefers-color-scheme`.
- **F4.1 Smart suggestions**: Budget forecast card on dashboard (headcount × per-plate vs target). Follow-up list sorted by days-pending with color-coded age badges.

### Changed — Phase 1 Foundations (v5.0 prep)

- **F1.1 Break up god module**: Extract 5 handler modules from main.js → `src/handlers/` (guest, table, vendor, section, settings). Create `src/core/constants.js` (single source of truth for sections). Create `src/utils/form-helpers.js` (shared `openAddModal` + `getVal`). main.js reduced from 1,720 → 707 lines (59% reduction).
- **F1.2 Partial js/ deprecation**: Migrate `js/i18n/*.json` → `src/i18n/`. Update inject-config.mjs to only patch `src/core/config.js`. Remove `js/` from tsconfig and vite coverage. Update CI security scan to scan `src/` instead of `js/`.
- **F1.3 Type safety**: Create `src/types.d.ts` with 11 shared interfaces (Guest, Table, Vendor, Expense, etc.). Update `tsconfig.json` to include `src/**/*.js` and `src/**/*.d.ts`.
- **F1.4 Template auto-discovery**: Replace hardcoded `_loaders` map with `import.meta.glob("../templates/*.html")` in template-loader.js.
- **F1.5 Error resilience**: Wrap all 4 event dispatch paths in events.js with try-catch. Add `beforeunload` flush in store.js. Add console.warn on localStorage quota errors.
- **F1.6 Lazy section JS**: Replace 19 static section imports with `import.meta.glob("./sections/*.js")` + cached `_resolveSection()`. Add `_SECTION_ALIASES` for filename-to-section-ID mapping.

## [4.7.0] — 2025-07-22

### Added — S23 Guest Follow-Up & Table Intelligence

- **S23.1 WhatsApp declined follow-up filter**: 📞 "מעקב מסרבים" toggle button shows only declined guests with a phone number in the WhatsApp section, for targeted re-engagement messaging.
- **S23.2 Print guests by table**: 🪑 "Print by Table" button generates a print-ready HTML document grouping all guests by their assigned table, with unseated guests listed at the end.
- **S23.3 Table dietary conflict indicator**: ⚠️ warning badge on any table card where a mix of vegan/vegetarian and non-veg guests are assigned to the same table. Tooltip shows clarifying text.
- **S23.4 Dashboard suggested actions card**: 💡 "Suggested Actions" card on the dashboard shows up to 3 priority tasks (unsent invitations, pending follow-ups, overdue vendor payments, unseated confirmed guests) as clickable shortcut buttons.
- **S23.5 Vendor overdue chip**: ⚠️ count badge in the vendors header bar updates automatically when any vendor has a past-due payment outstanding.

### Added — S24 Timeline, Analytics & Dashboard Depth

- **S24.1 Timeline item done checkbox**: ✅/⬜ toggle button per timeline item marks it as completed; done items are visually struck through. State persists in `timelineDone` store key.
- **S24.2 Export vendor payments CSV**: 📊 "Export Payments" button generates a detailed CSV with Name, Category, Contact, Phone, Price, Paid, Outstanding, Due Date, and Payment Status columns (including overdue detection).
- **S24.3 Dashboard gift progress widget**: 🎁 "Gift Tracker" card on the dashboard shows a progress bar and `X / Y (%)` count of confirmed guests who have a gift recorded.
- **S24.4 Analytics tag breakdown**: 🏷️ Tag Breakdown card in the analytics section renders a horizontal bar chart of the most-used guest tags (top 15), sorted by frequency.
- **S24.5 Dashboard next timeline event widget**: ⏰ "Next Event" card shows the next upcoming timeline event with dynamic time-until text; auto-hidden when no upcoming events exist.

## [4.6.0] — 2025-07-20

### Added — S21 Guest Analytics & Vendor Enrichment

- **S21.1 Meal count summary bar**: Colour-coded chip bar above the guest table showing per-meal-type counts across all guests (regular, vegetarian, vegan, kosher, gluten-free, other).
- **S21.2 Vendor contract URL field**: Optional URL input in the vendor modal stores a link to the signed contract; 📄 icon button in the vendor row opens it in a new tab.
- **S21.3 Gift log CSV export**: "Export gifts" button in check-in section generates a CSV of all guests who have a gift recorded (name, phone, gift, arrived, check-in time). Also surfaces the existing "Export check-in report" button.
- **S21.4 Per-table place-card print button**: 🃏 button on each table card triggers `printPlaceCards(tableId)` for that table only — no need to print all tables at once.
- **S21.5 Guest notes expandable row**: 📝 button in the guest action cell (visible only when the guest has notes) toggles an inline expansion row showing the full notes text.

### Added — S22 Dashboard & Analytics Depth

- **S22.1 Check-in progress card**: New dashboard card with a progress bar and counter showing how many confirmed guests have checked in (`arrived / confirmed (%)` ).
- **S22.2 Expense trend SVG chart**: Pure SVG line chart in the analytics section shows total expenses bucketed by month for the last 6 months.
- **S22.3 Expense category breakdown table**: New table card in the budget section shows each expense category with entry count, total amount, and percentage of overall spend — vendor payments included as a separate category.
- **S22.4 RSVP source field**: Guests now carry a `rsvpSource` field (web / WhatsApp / phone / manual / other). Editable via select in the guest modal; badges (🌐 💬 📞 ❓) appear in the action cell for non-manual sources.
- **S22.5 Confirmed guest target ring**: SVG donut ring on the dashboard shows the percentage of all invited guests who have confirmed attendance, with numeric breakdown.

## [4.5.0] — 2025-07-18

### Added — S19 Vendor Management & Guest Intelligence

- **S19.1 Vendor quick-dial**: Phone and WhatsApp `tel:` / `wa.me` link buttons in vendor action cell for instant one-tap contact.
- **S19.2 Guest VIP flag**: ⭐ toggle button per guest row; VIP-only filter button in toolbar to show starred guests.
- **S19.3 Vendor category dashboard card**: Dashboard card groups vendors by category showing cost, paid, and overdue payment count per category.
- **S19.4 Follow-up pending list**: Dashboard card lists guests who received an invitation (`sent=true`) but still have `pending` status — with one-tap phone link.
- **S19.5 Bulk mark as unsent**: Batch toolbar button resets `sent=false` for all selected guests, enabling invitation resend workflow.

### Added — S20 Print, Reports & UX Polish

- **S20.1 Guest name badges print**: "Print Badges" button opens a printable 3-column badge grid for all `confirmed` guests — name, table, and dietary need.
- **S20.2 Timeline schedule print**: "Print Schedule" button in Timeline section opens a print-ready table of all events sorted by time.
- **S20.3 Expense category filter**: Category column in expense table renders as clickable chips — click to filter by category, click again to clear.
- **S20.4 Invitation stats dashboard card**: Dashboard card shows Sent, Unsent, and RSVP Rate with animated counters.
- **S20.5 Accessibility check-in filter**: ♿ filter button in check-in toolbar narrows the list to guests with `accessibility=true` or wheelchair notes.

## [4.4.0] — 2025-07-17

### Added — S17 Data Quality & Smart Insights

- **S17.1 Full-text guest search**: Search now covers email, notes, group, meal type, and tags — in addition to name and phone.
- **S17.2 Bulk meal assignment**: Batch toolbar in guests section includes meal type selector; one action sets meal for all selected guests.
- **S17.3 Expense category donut chart**: Visual donut chart with legend in Analytics showing expenses broken down by category.
- **S17.4 Table capacity color indicators**: Table cards display green/yellow/red border based on fill percentage (half/almost/full). Overbooking banner appears when any table is over capacity.
- **S17.5 Budget overshoot alert**: Dashboard shows a red alert banner when total committed spend (vendors + expenses) exceeds the budget target.

### Added — S18 Sync, Forecast & Operations

- **S18.1 Offline sync queue monitor**: Settings page shows live badge + list of pending write keys waiting to sync to Google Sheets.
- **S18.2 Guest arrival forecast**: Dashboard and Analytics forecast projected headcount using 60% maybe + 40% pending probability weights, compared against total table capacity.
- **S18.3 Batch check-in by table**: New `checkInByTable(tableId)` function marks all confirmed guests at a given table as arrived in a single action.
- **S18.4 Timeline event alarm**: Timeline section starts a 5-minute interval alarm on mount; events due within 24 h trigger a browser Notification or in-app banner.
- **S18.5 WhatsApp unsent filter shortcut**: "Show unsent" button above the WhatsApp guest list filters to guests who haven't received a message; badge shows count.

## [4.3.0] — 2025-07-16

### Added — S15 UX & Smart Features

- **S15.1 Undo stack**: Ctrl+Z restores deleted guests/tables/vendors. 30-entry deep stack with snapshot isolation.
- **S15.2 Keyboard shortcuts overlay**: Press `?` to open help modal listing all keyboard shortcuts (Alt+1–9, Ctrl+Z).
- **S15.3 Auto-backup scheduler**: Configurable interval (default 30 min) periodic JSON backup with download/restore actions.
- **S15.4 Dashboard activity feed**: Live log of recent guest/vendor changes with relative timestamps and icons.
- **S15.5 Guest search highlight**: Matched search terms highlighted with `<mark>` elements in guest table name and phone columns.

### Added — S16 Day-Of & Advanced

- **S16.1 Check-in sound + visual alerts**: Web Audio API confirmation beep (800Hz) and animated green flash banner on guest check-in.
- **S16.2 Smart table optimizer**: Intelligent seating that groups guests by side, group, and dietary preferences. "Smart Assign" button on tables page.
- **S16.3 Vendor payment schedule**: Chronological table of vendor payments in analytics with overdue/paid/upcoming status indicators.
- **S16.4 RSVP response timeline**: SVG bar chart in analytics showing RSVP response rate over time grouped by date.
- **S16.5 Printable dietary cards**: Per-table dietary requirement cards for caterer, opened in new window for printing.

## [4.2.0] — 2025-07-15

### Added — S13 Guest Experience & Communication

- **S13.1 Live countdown timer**: Real-time d:h:m:s countdown on dashboard with 1-second interval.
- **S13.2 Plus-one names in RSVP**: Dynamic name input fields when guest count > 1, stored as `plusOneNames` array.
- **S13.3 Thank-you WhatsApp messages**: Post-wedding thank-you messages for checked-in guests with template support.
- **S13.4 Seating chart SVG map**: Visual floor plan with table shapes (round/rect), guest names, and fill-rate colors.
- **S13.5 Guest notes timeline**: Timestamped admin notes per guest, rendered in guest modal.

### Added — S14 Admin Productivity

- **S14.1 Multi-criteria guest filter**: Combined status + side + group + meal + table dropdown filters.
- **S14.2 Budget summary widget**: Dashboard card showing target, committed, paid, remaining with progress bar.
- **S14.3 Vendor due dates**: Due date field with overdue detection and visual indicators.
- **S14.4 Export event summary**: Comprehensive text file export with all event statistics.
- **S14.5 Guest custom tags/labels**: Add/remove tags per guest with badge display in guest table.

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

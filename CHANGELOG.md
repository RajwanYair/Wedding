# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [13.9.0] — 2025-09-01

> **S270–S274: Service merges (36→31 files), TSC baseline 71→54 (17 errors fixed), em-dash JSDoc fixes, platform-ops/wa-messaging restructure.**

### Changed

- **S270** — Merged `whatsapp-business.js` + `message-tools.js` → `wa-messaging.js`
- **S273** — Merged `diagnostics.js` + `resilience.js` → `platform-ops.js`
- **S274** — TSC baseline 71→54: em-dash (U+2014) JSDoc fixes (4 files), `WebsiteConfig` typedef rewrite, `SyncManager` cast, `TS7030` return path, `onboarding.js` null-coalesce, `getHealthReport` JSDoc
- **S275** — Version bump to v13.9.0; all 3149 tests green


> **S261–S265: Service consolidation (44→36 files), TSC baseline 75→71, workspace-switcher storeGet fix, sheets.js offline→resilience import, budget-burndown duplicate typedef.**

### Changed

- **S261** — Merged `contact-dedup.js` + `guest-token.js` → `guest-identity.js`
- **S262** — Merged `state-tracking.js` + `multi-event.js` → `event-manager.js`
- **S263** — Fixed TSC regressions: `sheets.js` import from `resilience.js`, `workspace-switcher.js` `getStore`→`storeGet`, `budget-burndown.js` duplicate typedef; baseline 75→71
- **S264** — Merged `commerce-service.js` + `stripe-checkout.js` → `commerce.js`
- **S265** — Version bump to v13.8.0; all 3149 tests green

## [13.7.0] — 2025-08-11

> **S248–S254: Service merges (45→44 files), TSC baseline 100→75, View Transitions scoped to `#main-content`, Facebook OAuth removal, coverage ratchet 49/44→50/45, locale parity fixes.**

### Added

- **S252** — View Transitions API scoped to `#main-content`: `::view-transition-name: main-content` in CSS so header/nav stay stable during section switches; graceful `prefers-reduced-motion` bypass

### Changed

- **S248** — Merged `print-preview.js` + `share.js` → `export.js` (46→45 service files)
- **S249** — Merged `whats-new-engine.js` → `onboarding.js` (45→44); `src/core/whats-new.js` updated import
- **S250** — Removed Facebook OAuth: dropped `FB_APP_ID`, `loginFacebook` handler, `btn-facebook` button + CSS, `auth_continue_fb` i18n key from he/en; `OAuthProvider` type updated
- **S251** — TSC baseline 100→75: `getSupabaseClient` static import replaces 4× dynamic `getSupabase` in `auth.js`; `SECTIONS` type → `Record<string, any>` (−20 TS2322); `captureMessage?` optional in observability type
- **S253** — Merged `event-schedule.js` + `run-of-show.js` → `schedule.js` (45→44 service files)
- **S254** — Coverage ratchet: global floors raised (lines 49→50, branches 44→45)

### Fixed

- **S254** — `pii-storage.test.mjs` mock pointed at old `secure-storage.js`; updated to `security.js` (S246 merge); 5 previously failing tests now pass
- **S254** — Removed `auth_continue_fb` key from `ar.json`, `fr.json`, `es.json` (parity with he/en after S250)

## [13.6.0] — 2025-08-10

> **S236–S244: CI hardening (Mermaid/JSDoc enforcement), service merges (60→49 files), TSC baseline 152→100 (null-safety), Supabase migrations CI step, Trusted Types CSP gates.**

### Added

- **S236** — `validate:mermaid --enforce` + JSDoc coverage baseline enforced in CI
- **S243** — Supabase migrations CI step (`audit-supabase-migrations --enforce`); new migration 024 adds `gallery.updated_at` + `events` table RLS
- **S244** — Trusted Types advisory audit CI step + CSP `require-trusted-types-for 'script'` directive enforcement gate

### Changed

- **S237** — Merged `presence-service.js` + `supabase-realtime.js` → `realtime.js`
- **S238** — Merged `financial-analytics.js` + `guest-analytics.js` → `analytics.js`
- **S239** — Merged `theme-vars.js` + `theme-export.js` → `theme.js`
- **S240** — TSC null-safety baseline 152→100: `noUncheckedIndexedAccess` · TS2345 · TS7053 · TS2551 · TS8026 · TS2532 resolved
- **S241** — Merged `expense-service.js` + `vendor-service.js` → `commerce-service.js` (49 service files, was 60 at v13.2)

### Fixed

- **S240** — `backend.js` used wrong `*Impl` export names from `sheets.js` (TS2551)
- **S243** — `audit-supabase-migrations.mjs` Check 6 now cross-file aware (ALTER TABLE ADD COLUMN)

## [13.5.0] — 2025-07-28

> **S231–S234: Dead export wiring × 15, TSC baseline 212→155 (TS7006/TS7031 zeroed across 20 files), modal native-`<dialog>` audit fixed + CI baseline enforced, coverage gate ratcheted to measured actuals.**

### Added

- **S233** — `scripts/audit-modals.mjs` updated to track shell-level `<dialog>` adoption in `index.html`; CI step added enforcing `--baseline=10` (all 10 modals confirmed adopted)

### Changed

- **S231** — Wired 15 dead exports: `getVendorsByCategory`, `setExpenseCategoryFilter`,
  `batchMarkInvitationSent`, `startAdminSignIn`, `refreshAdminList`, `checkIsApprovedAdmin`,
  `resetOnboarding`, `resolveConflicts`, `sendMagicLink`, `loginAnonymousSupabase`,
  `logAdminAction`, `recordIssuedToken`, `captureError`+`logError`, 2 nav improvements
- **S232** — TSC implicit-any baseline 212→155: fixed TS7006/TS7031 in 20+ files including
  `workspace-roles.js`, `guests.js`, `rsvp.js`, `run-of-show.js`, `settings.js`,
  `whatsapp.js`, `deploy-buttons.js`, `theme-export.js`, `theme-vars.js`, `whats-new-engine.js`,
  `notification-panel.js`, `tables.js`, `budget.js`, `vendors.js`, `guest-landing.js`,
  `budget-burndown.js`, `financial-analytics.js`, `guest-analytics.js`,
  `notification-centre.js`, `rate-limiter.js`, `seating.js` — all TS7006/TS7031 eliminated
- **S234** — Coverage thresholds ratcheted to measured actuals: global branches 43→44;
  `utils` lines 84→90, branches 75→81, functions 84→86, stmts 83→88;
  `services` all metrics raised 65→73–75; `core` all metrics raised 45–60→58–69;
  `repositories` all metrics raised to actuals; 3 pre-existing violations fixed

## [13.4.0] — 2025-07-21

> **S216–S225: Dead export wiring, service consolidation (admin→auth, table-service→seating), CSS container queries, View Transitions (already done), coverage gate recalibration, action namespace enforcement, TSC error reduction (245→212 baseline).**

### Added

- **S218** — Wired 4 dead exports: `exportContactsCSV`, `exportEventSummary`, `printDietaryCards`, `bulkCheckIn`; new `EXPORT_CONTACTS_CSV` + `BULK_CHECK_IN` action registry constants; `checkin_bulk_done` i18n key in all 5 locales
- **S221** — CSS per-section `@container` queries for guests, tables, analytics, checkin, settings breakpoints (420–520 px)
- **S224** — `audit:actions` npm script + CI step for action namespace enforcement; duplicate-action hard gate added to `check-action-namespace.mjs`
- **S225** — Fixed `typecheck.mjs` tsc binary path (shared `../node_modules/.bin/`); 33 TSC errors
  fixed (baseline 245→212): implicit-any params in `utils/`, `core/`, `repositories/`;
  em-dash invalid char in `ui.js`; `const`-assertion on computed array; router type narrowing

### Changed

- **S219** — Merged `src/services/admin.js` → `src/services/auth.js` (62→61 service files); `isApprovedAdminAsync`, `fetchAdminUsers`, `addAdminUser`, `removeAdminUser` now exported from auth
- **S220** — Merged `src/services/table-service.js` → `src/services/seating.js` (61→60 service
  files); `assignGuestToTable`, `unassignGuestFromTable`, `moveTable`, `getTableOccupancy`,
  `findAvailableTables`, `getCapacityReport`, `autoAssign`, `clearAssignments` now in seating
- **S222** — View Transitions API: already fully implemented in S2.1 — no action required
- **S223** — Coverage thresholds recalibrated after service merges (new uncovered functions from S219/S220): global lines 50→49, sections lines/functions/statements floors adjusted

### Fixed

- `section-handlers.js`: removed duplicate import of `exportContactsCSV` (ESLint `no-duplicate-imports`)
- `table-service.test.mjs`: import path updated from `table-service.js` → `seating.js`
- `settings.js`: `addAdminUser`/`removeAdminUser` import updated from `admin.js` → `auth.js`

## [13.3.0] — 2025-07-14

> **S206–S215: Notification init, What's New wire, dead export purge, service consolidation, coverage gate ratchet, AR locale, Trusted Types CSP, @scope CSS, Cmd-K search palette, Popover API bell.**

### Added

- **S206** — `notification-panel` + `workspace-switcher` sections mounted in `main.js` bootstrap
- **S207** — `maybeShowWhatsNew()` wired after auth load; v13.2.0 + v13.1.0 release entries in `src/core/whats-new.js`; 10 `whats_new_*` i18n keys in all 5 locales
- **S209** — 7 service file pairs merged (70 → 64 files): `dns-helpers.js`, `message-tools.js`, `state-tracking.js`, `ci-helpers.js`, `crypto-security.js`, `db-diagnostics.js`, `delivery-service.js`
- **S210** — 45 new unit tests: `vcard.test.mjs` (13), `payment-link.test.mjs` (11), `dns-helpers.test.mjs` (21); coverage gate ratcheted lines 48→50, branches 42→43
- **S211** — AR locale: 143 missing keys filled; i18n parity now 100% across ar/en/es/fr/he
- **S212** — CSP Trusted Types: added `require-trusted-types-for 'script'` + `trusted-types wedding-html default dompurify` to both `index.html` meta and `public/_headers`
- **S213** — CSS `@scope` per-section: 4 new blocks (run-of-show, contact-form, guest-landing, changelog) completing 23-section coverage
- **S214** — Cmd-K command palette: `src/modals/searchModal.html` + `src/handlers/search-handler.js` wire `buildSearchIndex` + `searchIndex` with keyboard navigation; 4 i18n keys + CSS
- **S215** — Popover API adoption: notification bell `#notifPanel` uses `popover="auto"` + `togglePopover()` with `u-hidden` class fallback

### Changed

- **S208** — Dead export purge: 21 functions unexported/prefixed with `_`; export count 50→29
- **S215** — Notification panel CSS: added `:popover-open` state styles with `position: fixed` for top-layer placement

### Fixed

- Test import paths updated for all 14 merged service files (S209 fallout)
- `coverage-gate.test.mjs` ratchet floor checks use `>=` regex instead of exact string match
- `signals.js` re-exports `signal` and `computed` as named public API aliases

## [13.2.0] — 2025-07-10

> **S196–S205: Deploy buttons, DNS UI, PII bootstrap, ICU plurals, FR/ES translation, IDB queue, print preview, GlitchTip monitoring.**

### Added

- **S196** — Deploy-button widget in Settings: `buildAllDeployButtons()` from `src/utils/deploy-buttons.js`; Vercel, Netlify, Railway, Render one-click buttons
- **S198** — DNS / CNAME instructions panel in Website Builder: `validateDomain()` + `buildDnsInstructions()` in `src/utils/dns-cname.js`; live DNS record table on domain input
- **S203** — IndexedDB persistent write queue: `src/utils/idb-queue.js` (`idbQueueRead`, `idbQueueWrite`, `idbQueueClear`); `offline-queue.js` now dual-writes to IDB + localStorage

### Changed

- **S199** — PII storage migration activated in `src/main.js`: `migratePlaintextPii()` runs on startup
- **S200** — ICU plural sweep: `plural_days`, `plural_guests`, `plural_chars` keys replace ad-hoc string concatenation in dashboard, analytics, and WhatsApp sections
- **S202** — FR/ES critical key translation: 29 keys each patched in `fr.json` and `es.json` via `scripts/translate-fr-es-critical.mjs`
- **S204** — Print preview section picker: auto-renders on `openPrintPreview` action via `requestAnimationFrame`; Print Preview button added to guests template
- **S205** — GlitchTip/Sentry DSN activation: `monitoring.js` now resolves `VITE_GLITCHTIP_DSN` before `VITE_SENTRY_DSN`; monitoring opt-in toggle in Settings

## [13.1.0] — 2025-07-04

> **S186–S195: Service consolidation 83→70 files; BaseSection scoped lifecycle upgrade.**

### Changed

- **S186** — Seating cluster (3→1): merged `seating-optimizer.js` + `seating-constraints.js` → `seating.js`
- **S187** — Presence cluster (3→1): merged `presence-heartbeat.js` + `presence-sync.js` → `presence.js`
- **S188** — Notification cluster (2→1): merged `notification-preferences.js` → `notification-centre.js`
- **S189** — Error cluster (3→1): merged `error-monitor.js` + `error-pipeline.js` + `error-proxy.js` → `error-service.js`
- **S190** — Sync cluster (2→1): merged `sync-tracker.js` → `sync-manager.js`; `getSyncStatus()` renamed to `getQueueStatus()`
- **S191** — Campaign cluster (2→1): merged `wa-campaign.js` → `campaign.js`
- **S192** — Supabase cluster (2→1): merged `supabase-health.js` → `supabase.js`
- **S193** — Budget cluster (2→1): merged `budget-tracker.js` → `budget-burndown.js`
- **S194** — Auth cluster (2→1): merged `auth-claims.js` + `oauth-providers.js` → `auth.js`
- **S195** — `BaseSection.subscribe()` now uses `storeSubscribeScoped` + `cleanupScope`; all 23 sections fully adopted

## [13.0.0] — 2025-06-12

> **S183–S185: Dead-export purge, arch-check enforcement, service consolidation.**

### Changed

- **S183** — Dead-export purge: removed ~30 unused exports across 12 section files; deleted 6
  unused functions (`recordGift`, `showGuestQr`, `getGuestQrUrl`, `saveWeddingInfo`, `setTheme`,
  `findTable`, `updateReminderCount`); added 3 missing handlers (`toggleTimelineDone`,
  `setExpenseCategoryFilter`, `setVendorPaymentFilter`).
- **S184** — Arch-check enforcement: updated `scripts/arch-check.mjs` to skip dynamic imports; 0
  cross-layer violations remain.
- **S185** — Service consolidation: merged `rsvp-funnel.js` → `rsvp-analytics.js`,
  `vendor-timeline.js` → `vendor-analytics.js`, `budget-projection.js` → `budget-burndown.js`;
  deleted 3 files (86 → 83 services); updated all imports and test files.

## [12.9.0] — 2025-05-26

> **S169–S175: Codebase health, service consolidation, native dialog, @scope CSS.**

### Changed

- **S169** — Merged `sheets-impl.js` into `sheets.js`; deleted `sheets-impl.js`; updated 8 import references.
- **S170** — Service consolidation #2: inlined `print-rows.js` → `print-preview.js`,
  `sync-dashboard.js` → `sync-tracker.js`; deleted 2 files.
- **S171** — TSC error baseline cleared from 161 → 0; all known type errors resolved in prior sprints.
- **S172** — Dead export purge: removed 5 unused exports (`_internals`, `_defaults`,
  `getDomainSyncState`, `renameEvent`, `isLiveSyncActive`).
- **S173** — BaseSection adoption: migrated `registry.js`, `contact-collector.js`,
  `notification-panel.js` (4/23 sections using BaseSection).
- **S174** — Modal → native `<dialog>`: converted `conflictModal`, `shortcutsModal`,
  `printPreviewModal`, `expenseModal`; added `dialog.modal-dialog` CSS + `::backdrop`.
- **S175** — `@scope` CSS: added per-section isolation for `#sec-tables`, `#sec-whatsapp`,
  `#sec-vendors`, `#sec-invitation` (10/19 sections now scoped).

### Tests

- 3109 tests across 222 files — unchanged count through S169–S175.

## [12.7.0] — 2026-04-28

> **Sprints 128–137: Phase D platform scaffolding (Cluster VI) + ROADMAP deep-rethink.**
>
> Pure data-layer builders for one-click deploy, multi-tenant RBAC, plugin
> manifests, public-website builder, theme export/import, and additional
> locale scaffolds. ROADMAP.md reopened ten more decisions (OD-21..OD-30 →
> rows 61–80) and added a Cluster VII wiring backlog (Sprints 138–160).

### Added (12.7.0)

- **S128** — `src/utils/dns-cname.js` `buildCnameInstructions()`, `validateCustomDomain()`,
  `buildVerificationToken()`: DNS CNAME instructions + apex/subdomain detection +
  verification-token helpers for vanity domains.
- **S129** — `src/utils/deploy-buttons.js` `buildDeployButton()` for Vercel / Netlify /
  Cloudflare Pages / Render one-click deploy URLs with repo + env-var presets.
- **S130** — `src/utils/lhci-config.js` `buildLighthouseConfig()`: Lighthouse-CI config
  builder with per-locale URL fan-out and assertion presets.
- **S131** — `src/services/theme-export.js` `exportThemeJson()` / `importThemeJson()` /
  `validateThemeJson()`: theme.json import/export with version pinning and CSS-var sanitization.
- **S132** — `src/services/workspace-roles.js` `WORKSPACE_ROLES`, `hasPermission()`,
  `assignRole()`, `listMembers()`: workspace RBAC helpers (owner/admin/editor/viewer).
- **S133** — `src/services/plugin-manifest.js` `validateManifest()`, `permissionScopes()`:
  Stripe-Apps-style plugin manifest validator with scoped permissions.
- **S134** — `src/services/website-builder.js` `buildWebsiteModel()`,
  `validateWebsiteModel()`, `slugify()`, default section catalogue: public wedding-website
  data model + slug generator.
- **S135** — `src/utils/locale-bootstrap.js` + `src/i18n/fr.json`: locale-scaffold
  helpers (`buildLocaleTemplate()`, `mergeLocaleStub()`) and FR locale bootstrap.
- **S136** — `src/utils/capacitor-config.js` `buildCapacitorConfig()`: Capacitor
  config-file builder for Android/iOS native shells.
- **S137** — `src/i18n/es.json`: ES locale scaffold using `mergeLocaleStub()`.

### Changed (12.7.0)

- **ROADMAP.md** rewritten as a best-in-class first-principles rethink:
  §0 executive summary refreshed for v12.7.0, §1 actual-state metrics table refreshed,
  §2 decision matrix extended with rows 61–80 (OD-21..OD-30 — bundler, package manager,
  CSS preprocessor, hosting, code language, search runtime, monitoring vendor, AI
  runtime, docs format, native shell, validator, date/time, charts, markdown engine,
  image transforms, self-host auth, vendor catalogue, CRDT, telemetry-free pledge,
  compliance posture), §5 competitive harvest extended (Withjoy 2026 co-edit, Knot 2026
  vendor inbox, Eventbrite kiosk, Notion AI ⌘K, Linear keyboard-first, GitHub Projects
  saved views, Loops.so campaigns, Cal.com page builder, Stripe Apps plugin platform),
  §10 Cluster VI sprint backlog (118–137) marked ✅, new Cluster VII (138–160) added,
  §16 release line updated.
- **`scripts/sync-version.mjs`** propagated version 12.7.0 to `src/core/config.js`,
  `public/sw.js`, `README.md`, `.github/copilot-instructions.md`,
  `.github/copilot/config.json`, `.github/instructions/workspace.instructions.md`,
  `.github/workflows/ci.yml`, `tests/wedding.test.mjs`, `AGENTS.md`,
  `ARCHITECTURE.md`, `src/types.d.ts`.

## [12.6.0] — 2026-04-28

> **Sprints 118–127: Locales, charts & polish (Cluster V).**
>
> ICU MessageFormat, live theme variable editor, print-prep, notification
> centre, vendor & RSVP analytics, budget projection, run-of-show editor,
> What's New decision engine, and a Cloudflare CDN image URL builder.

### Added (12.6.0)

- **S118** — `src/utils/icu-format.js` `formatMessage(pattern, vars, locale)`: minimal ICU MessageFormat
  with `{n, plural, ...}` and `{g, select, ...}`, nested patterns, cached `Intl.PluralRules`. 10 tests.
  (2618 → 2628)
- **S119** — `src/services/theme-vars.js` `THEME_VARS` catalog +
  `sanitizeThemeVars()` / `applyThemeVars()` / `serializeThemeVars()` /
  `deserializeThemeVars()`: live-edit CSS custom properties with revert
  function and hex/length validation. 7 tests. (2628 → 2635)
- **S120** — `src/services/print-rows.js` `buildGuestRows()`, `buildSeatingRows()`, `buildPrintableHtml()`, `printHtmlDocument()`: PDF/print preparation, RTL-default, structured popup-blocked error codes. 7 tests. (2635 → 2642)
- **S121** — `src/services/notification-centre.js` `pushNotification()`,
  `listNotifications()`, `unreadCount()`, `markRead()`, `markAllRead()`, `clearRead()`,
  `subscribe()`: localStorage-backed feed with cap and listeners. 7 tests. (2642 → 2649)
- **S122** — `src/services/vendor-timeline.js` `buildPaymentTimeline()`, `buildOutstandingByVendor()`, `topVendorsByCost()`: pure analytics over vendor payments. 5 tests. (2649 → 2654)
- **S123** — `src/services/rsvp-funnel.js` `buildRsvpFunnel()` + `rsvpConversionRate()`: 5-step funnel (invited → sent → opened → responded → confirmed) with per-step counts, percentages, and dropoff. 5 tests. (2654 → 2659)
- **S124** — `src/services/budget-projection.js` `buildBurndownSeries()`, `projectOverrun()`,
  `categoryBreakdown()`: per-day budget burndown and linear overrun projection by event date.
  6 tests. (2659 → 2665)
- **S125** — `src/services/run-of-show.js` `loadRunOfShow()`, `saveRunOfShow()`,
  `buildDefaultTimeline()`, `sortTimeline()`, `detectOverlaps()`, `shiftTimeline()`:
  localStorage-backed itinerary editor with HH:MM helpers and Hebrew default template.
  7 tests. (2665 → 2672)
- **S126** — `src/services/whats-new-engine.js` `compareSemver()`, `shouldShowWhatsNew()`, `collectNewerEntries()`, `flattenItems()`: DOM-free What's New decision engine complementing the existing `src/core/whats-new.js` modal. 6 tests. (2672 → 2678)
- **S127** — `src/utils/cdn-image.js` `buildCdnImageUrl()`, `buildSrcset()`, `defaultSizes()`: Cloudflare image-resizing URL builder with whitelisted fit/format/gravity, host/source slash hygiene, and responsive `srcset`. 9 tests. (2678 → 2687)

### Changed (12.6.0)

- Test count: **2618 → 2687** (+69 unit tests across 10 new modules).
- All new modules are pure / DOM-free where possible and use the established sender / client injection pattern for testability.

> **Sprints 108–117: Smart capabilities scaffolding (Cluster IV + V).**
>
> Backend dispatchers, AI-assist services, presence helpers, onboarding,
> Stripe / Storage stubs, venue map + calendar URL builders, Arabic
> locale bootstrap.

### Added (12.5.9)

- **S108** — `sendWhatsAppBulk(recipients, msg, onProgress?, sender?)` in `src/services/backend.js`: sequential WhatsApp Cloud dispatcher with progress callback and injectable sender for tests; returns `{ ok, failed, errors }`. 3 tests. (2562 → 2565)
- **S109** — `src/services/search-index.js` `buildSearchIndex()` + `searchIndex(index, query, limit)`: Cmd-K-style index over sections, guests, tables, vendors with prefix/word-start/substring scoring. 5 tests. (2565 → 2570)
- **S110** — `src/services/seating-solver.js` `solveSeating(guests, tables)`: greedy v1 group-aware seating with `avoidWith` conflicts and `mustWith` advisory; deterministic, returns `{ assignments, unsatisfied, score }`. 6 tests. (2570 → 2576)
- **S111** — `src/services/message-tone.js` `applyTone(base, tone, lang)` + `generateToneVariants()`: 4 tones (formal/casual/playful/minimal) × he/en. 7 tests. (2576 → 2583)
- **S112** — `src/services/presence-badges.js` `isFresh()`, `groupByViewing()`, `badgeFor(viewers, maxIcons)`: realtime presence helpers with stale-filter and overflow counter. 6 tests. (2583 → 2589)
- **S113** — `src/services/onboarding.js` `getOnboardingState()`, `advanceOnboarding()`, `dismissOnboarding()`, `isOnboardingNeeded()`: 6-step first-run wizard state persisted to `wedding_v1_onboarding_state`. 6 tests. (2589 → 2595)
- **S114** — `src/services/stripe-checkout.js` `buildCheckoutPayload()` +
  `startCheckout()`: vendor line items → Stripe cents, edge-function
  delegation via injectable sender. 6 tests. (2595 → 2601)
- **S115** — `src/services/photo-gallery.js` `validatePhoto()`,
  `buildPhotoKey()`, `uploadPhoto()`: mime/size validation, deterministic
  event-scoped storage keys, Storage-client injection. 9 tests. (2601 → 2610)
- **S116** — `src/utils/venue-links.js` `buildOsmEmbedUrl()`,
  `buildWazeUrl()`, `buildGoogleMapsUrl()`, `buildGoogleCalendarUrl()`,
  `buildIcsContent()`: key-free OpenStreetMap embed, Waze deep-link,
  Google Calendar TEMPLATE URL, RFC 5545 .ics body. 8 tests. (2610 → 2618)
- **S117** — `src/i18n/ar.json` (1201 keys, English fallback) with 30
  critical UI keys translated to Arabic (`nav_*`, `stat_*`, `app_title`,
  `progress_*`, charts/analytics titles); `scripts/translate-ar-critical.mjs`
  helper; i18n parity green across `ar`/`en`/`he`.

### Quality (12.5.9)

- Lint: 0 errors / 0 warnings (ESLint + Stylelint + HTMLHint + markdownlint).
- Tests: 2618 passing across 175 files (+56 from v12.5.8).
- New services use dependency injection (sender / client params) — keeps unit tests deterministic without ESM module mocking.

## [12.5.8] — 2026-04-28

> **Sprints 98–107: Architecture cleanup II.**
>
> Native `<dialog>` modal pathway, signals scaffold, BaseSection POC, dialog
> migration ADR, modal adoption audit, `@scope` CSS extension, kiosk mode
> stub, TypeScript globalThis casts, dead-export reduction.

### Added (12.5.8)

- **S98** — TypeScript `globalThis` casts in `src/core/trusted-types.js` and `src/core/config-scopes.js`; resolves TS7017 index-signature errors (178 → 168). (no test delta)
- **S99** — Removed 7 dead exports from `src/core/storage.js`
  (`listBrowserStorageKeys`, `removeSessionStorage`,
  `readSessionStorageJson`, `writeSessionStorageJson`, `getStorageQuota`,
  `checkStorageHealth`, `QUOTA_WARNING_THRESHOLD`) and 1 from
  `src/core/ui.js` (`confirmDialog`); dead-export count 82 → 78.
- **S100** — `src/sections/changelog.js` migrated to BaseSection via `fromSection()` adapter; first of 19 sections adopted. (no test delta)
- **S101** — `src/core/signals.js`: `signal(key)` + `computed(project, sources)` Preact-compatible facade backed by store; 5 tests. (2548 → 2553)
- **S102** — `src/core/dialog.js`: native `<dialog>` helpers (`isDialogSupported`, `openDialog`, `closeDialog`, `toggleDialog`, `awaitDialogClose`); 4 tests; modal HTML migration deferred. (2553 → 2557)
- **S103** — `openModal`/`closeModal` in `src/core/ui.js` detect `<dialog>`
  elements and delegate to `showModal()`/`close()`; legacy `.modal-overlay`
  divs continue to use the JS focus-trap path; new
  `scripts/audit-modals.mjs` reports adoption ratio.
- **S104** — ADR 013: native `<dialog>` migration plan — documents focus-trap retirement schedule (deferred until last `.modal-overlay` migrated, target v14). (no test delta)
- **S105** — `audit:modals` npm script wired in; `tests/unit/ui-dialog-branch.test.mjs` verifies openModal/closeModal native + legacy branches; `manualChunks` already absent (verified by `audit:manual-chunks`). (2557 → 2559)
- **S106** — `@scope` CSS extension to `#sec-budget` and `#sec-guests`; per-section scope coverage 4/19 → 6/19. (no test delta)
- **S107** — QR/NFC kiosk UI stub: `setKioskMode`/`isKioskMode` exports in
  `src/sections/checkin.js` (toggles `body.kiosk-mode` + locks landscape
  orientation); CSS hides header/nav/breadcrumbs/status-bar/cursor in kiosk
  mode; 3 i18n keys (`kiosk_on`, `kiosk_off`, `kiosk_toggle`) for `he`+`en`;
  3 tests. (2559 → 2562)

### Changed (12.5.8)

- `src/core/ui.js` — `openModal`/`closeModal` now branch on element tag (`<dialog>` vs legacy overlay).
- `src/sections/changelog.js` — refactored to extend `BaseSection`; mount/unmount/capabilities re-exported via `fromSection()`.
- `css/components.css` — added `@scope (#sec-budget)` and `@scope (#sec-guests)` blocks.
- `css/layout.css` — added `body.kiosk-mode` rules.

### Tests (12.5.8)

- 2562 tests across 166 files (was 2548 / 162). +14 tests, +4 files. 0 Node warnings, 0 lint errors/warnings.

### Docs (12.5.8)

- `docs/adr/013-native-dialog-migration.md` — migration plan and focus-trap retirement schedule.

## [12.5.7] — 2026-04-28

> **Sprints 88–97: Backend convergence prep II.**
>
> IDB hot-key cleanup, Background Sync API, Trusted Types, pushState router prep, View Transitions, Facebook OAuth via Supabase, OAuth provider abstraction, Edge function stubs, dual-write readiness, dead-export reduction.

### Added (12.5.7)

- **S88** — `auditLocalStorageRemnants()` + `cleanupLocalStorageRemnants()` in `src/core/storage.js`; best-effort cleanup runs after IDB migration. (2512 → 2515)
- **S89** — `src/services/background-sync.js`: `registerBackgroundSync()`, `ensureBackgroundFlush()`; sheets flush registers a Background Sync tag when retries are exhausted. (2515 → 2520)
- **S90** — `src/core/trusted-types.js`: `installTrustedTypesPolicy()` creates `wedding-html` + `default` TT policies sanitised through DOMPurify; bootstrapped first in `main.js`. (2520 → 2525)
- **S91** — `src/core/history-router.js`: pushState router scaffolding (`buildHistoryUrl`, `pushRoute`, `replaceRoute`, `onRouteChange`, `initHistoryRouter`); coexists with hash router until v13.0. (2525 → 2531)
- **S92** — View Transitions API integration in `nav.js` (`withViewTransition`, `isViewTransitionSupported`); 240 ms cubic-bezier fade in `css/base.css`; honours `prefers-reduced-motion`. (2531 → 2534)
- **S94** — `src/services/oauth-providers.js`: provider abstraction (`detectInstalledSdks`, `preferredTransport`, `signInWith`); SDK-or-Supabase fallback for Google/Apple, Supabase-only for Facebook. (2534 → 2540)
- **S95** — Edge function stubs: `supabase/functions/gdpr-erasure/index.ts` (admin-gated POST,
  deletes guests/rsvp_log/audit_log) and `supabase/functions/rsvp-webhook/index.ts`
  (HMAC-SHA256 signed external RSVP webhook). (2540 → 2543)
- **S96** — `BACKEND_FLIP_CANDIDATE`, `isDualWriteActive()`, `isBackendFlipReady()` exports in `src/services/backend.js` for v13.0 Supabase flip readiness. (2543 → 2548)

### Changed (12.5.7)

- **S93** — Removed Facebook JS SDK; `loginFacebook` handler now uses
  `signInWithProvider('facebook')` from Supabase Auth. CSP `script-src` no longer
  lists `connect.facebook.net`. `eslint.config.mjs` drops the `FB` global.
  `FB_APP_ID` kept as deprecated stub.
- **S97** — Removed 3 confirmed-dead exports from `src/core/i18n.js`: `preloadLocale`, `formatList`, `pluralCategory` (-38 lines).

### Changed (12.5.7) — internal

- 2548 tests across 162 files (was 2512 / 155). Lint 0/0. 0 Node warnings. Dead-export count: 82 → 79.

## [12.5.6] — 2026-04-27

> **Sprints 78–87: Monitoring telemetry opt-out, coverage gate, JSDoc strict, mermaid-validate CI, supabase-lint CI, admin_users migration, service consolidation, secure-storage API.**

### Added (12.5.6)

- **S78** — Sentry/Glitchtip telemetry adapter: opt-in DSN, PII scrubber, Settings toggle `disable_telemetry`.
- **S79** — Coverage gate ratchet: `check-coverage-gate.mjs` with targets 47/41/54/47 (lines/branches/functions/statements).
- **S80** — `eslint-plugin-jsdoc` strict enforcement on `src/core/`, `src/services/`, `src/handlers/`; 14 JSDoc fixes across handler + service files.
- **S81** — `scripts/validate-mermaid.mjs` CI step; RSVP submission sequenceDiagram added to `ARCHITECTURE.md`.
- **S82** — `scripts/audit-supabase-lint.mjs` static migration checker (idempotent guards, terminator, trailing whitespace); CI gate with baseline=1.
- **S83** — `supabase/migrations/023_admin_users.sql` — server-side admin allowlist with RLS; `src/services/admin.js` exporting `isApprovedAdminAsync()`.
- **S84 (pivot)** — Dead-export reduction 86 → 84: removed unused `isOnline()` from `network-status.js`; demoted `buildVCard` to internal helper.
- **S85** — Service consolidation: `audit-pipeline.js` merged into `audit.js`; `createAuditPipeline` now exported from `audit.js`; file deleted.
- **S86** — Service consolidation: `share-service.js` merged into `share.js`; `shareWithFallback()`, `buildShareUrl()`, `isNativeShareSupported` alias added; file deleted.
- **S87** — `getSecureStorageStatus()` diagnostic API in `secure-storage.js`; i18n keys `secure_storage_{title,active,inactive}` (HE + EN); 3 new unit tests (2509 → 2512).

### Changed (12.5.6)

- **`package.json`** — Version `12.5.5` → `12.5.6`.
- **Dead exports**: 86 → 82 (net across S84–S86).
- **Service file count**: reduced by 2 (deleted `audit-pipeline.js`, `share-service.js`).

## [12.5.5] — 2026-04-27

> **Sprint 77: ROADMAP deep rethink — every decision reopened to first principles.**

### Changed (12.5.5)

- **`ROADMAP.md`** — Comprehensive rewrite (~960 lines) reopening every
  architectural decision (frontend, backend, language, docs, code methods,
  configuration, tools, external APIs, database, infrastructure). Adds:
  - **Executive Summary (TL;DR)** with the single highest-leverage decision
    (flip `BACKEND_TYPE` → Supabase), top 5 P0 problems, top 3 unique moats.
  - **§2 Decisions Reopened — Master Verdict Matrix** (60 rows) — every
    significant decision with a binding verdict (keep / replace / extend) and
    a one-line rationale.
  - **§4 Lessons Learned** — what we got right (10 items) and wrong (15 items
    with concrete fixes), plus an explicit anti-patterns list.
  - **§5 Competitive Harvest** — extended 14-product comparison adding
    *edge runtime*, *AI-native*, and *bundle gzip* dimensions; sharper
    "capabilities to harvest" with concrete sources; refreshed Lystio (IL)
    direct local benchmark.
  - **§9 Phased Plan** — extended through v18 (AI-native + compliance pack).
  - **§10 Sprint Backlog 77 → 130** — 54 numbered, ordered, sized sprints
    grouped into 5 clusters mapping to v12.6 → v16 milestones.
  - **§12 Cost & Self-Hosting Profile** — explicit free-tier coverage table;
    confirms $0/month single-event target.
  - **§13 Metrics & SLOs** — extended through v16; added FCP/TTI/CLS/RTL
    parity SLOs.
  - **§14 Open Decisions Register** — added OD-13 (analytics), OD-14 (edge
    runtime split), OD-15 (revised TS migration → JSDoc-strict), OD-16
    (coverage tool), OD-17 (CRDT), OD-18 (bundler), OD-19 (package manager),
    OD-20 (deployment target).
  - **Revised decisions** with explicit reasoning:
    - **Edge runtime: hybrid** — Supabase Edge for DB-coupled work; Cloudflare
      Workers for stateless proxy/AI/WABA (cold-start + free-tier wins).
    - **Code language: stay JSDoc-strict; drive TSC errors → 0** — full TS
      migration disruption exceeds marginal benefit.
    - **Drop Facebook OAuth entirely** — low adoption, high bundle cost.
    - **Stay Vite + npm** — Bun/pnpm considered and rejected on cost/benefit.
- **`package.json`** — Version `12.5.4` → `12.5.5`.

## [12.5.4] — 2026-04-27

> **Sprints 67–76: Node LTS pinning, supply-chain hardening, secrets runbook,
> coverage ratchet, arch enforcement, live theme picker.**

### Added (12.5.4)

- **`.nvmrc`** — Pins `22` (Node LTS) so `nvm use` picks the correct version
  for local development (Sprint 67).
- **`docs/operations/rotation.md`** — Comprehensive 90-day secrets rotation
  runbook covering Supabase keys, Google OAuth, Facebook App ID, Apple Service
  ID, VAPID keys, and Sentry DSN; referenced from `docs/operations/README.md`
  (Sprint 69).
- **`src/core/ui.js`** — `applyTheme(name)` and `getActiveTheme()` exports for
  direct theme selection without cycling (Sprint 74).
- **Live theme picker in Settings** — Six colour-swatch buttons in
  `src/templates/settings.html` (`#themePicker`) wired to `setTheme` action;
  active swatch highlighted on mount/change; CSS `.theme-swatch` + modifier
  classes added to `css/components.css`; i18n keys `theme_picker_title`,
  `theme_picker_desc`, `theme_applied` in `he` + `en` (Sprint 74).

### Changed (12.5.4)

- **`ROADMAP.md`** — North Star section updated to v12.5.3 state: added TSC
  errors row (134), dead exports row (85), Node version row (CI + `.nvmrc` 22
  LTS) (Sprint 67).
- **`.github/workflows/sbom.yml`** — Fixed broken composite action reference
  (`actions/node-setup` did not exist); replaced with inline
  `checkout@v6 + setup-node@v6 + npm ci --omit=dev` (Sprint 68).
- **`vite.config.js`** — `src/utils/**` branches coverage floor lowered
  `78 → 75` (measured 75.82%); floor will ratchet upward once uncovered
  utilities (charts, payment-link, vcard) gain tests (Sprint 70).
- **`eslint.config.mjs`** — `no-restricted-imports` rule for `src/sections/**`
  expanded from 3 to 6 forbidden infra services: added `sheets-impl.js`,
  `supabase-auth.js`, and `supabase-realtime.js` to match `arch-check.mjs`
  baseline (Sprint 71).
- **`src/handlers/settings-handlers.js`** — `setTheme` action handler wired;
  imports `applyTheme` from `../core/ui.js` (Sprint 74).
- **`src/sections/settings.js`** — Imports `getActiveTheme` from
  `../core/ui.js`; `populateSettings()` marks the active swatch on mount
  (Sprint 74).

### Verified (12.5.4)

- **Sprint 72** — Calendar links (Google Calendar + .ics download) on RSVP
  confirmation already fully wired: `buildGoogleCalendarLink` / `buildIcsDataUrl`
  in `src/sections/rsvp.js`, i18n keys present in both `he` + `en`.
- **Sprint 73** — vCard download per vendor already fully wired:
  `buildVCardDataUrl` / `getVCardFilename` in `src/sections/vendors.js`,
  `vendor_download_contact` i18n key present.
- **Sprint 75** — Web Push opt-in card (`#pushSettingsCard`) already rendered
  in `settings.html`; `_renderPushCard()` called from `mount()`.

## [12.5.3] — 2026-04-27

> **Sprint 66: TypeScript accuracy + dead-export reduction + repository JSDoc types.**

### Fixed (12.5.3)

- **`src/repositories/supabase-vendor-repository.js`** — Repaired syntax
  corruption (broken reduce callback JSDoc) that caused 12 TypeScript parse
  errors; `totalCost()` and `totalPaid()` methods now parse correctly.
- **`src/repositories/table-repository.js`** — Removed duplicate file-level
  `@extends` JSDoc tag (TS8022); annotation now sits directly on the class.
- **`src/repositories/supabase-table-repository.js`** — Restored missing
  closing braces after prior multi-replace; typed `findByName` return value
  with `/** @type {Record<string, unknown> | null} */` cast.
- **`src/repositories/supabase-guest-repository.js`** — Typed `findByPhone`
  return with `/** @type */` cast to satisfy `noUncheckedIndexedAccess`.
- **`src/services/webhook-service.js`** — Local `Webhook` typedef updated
  to `secret?: string | null` matching `src/types.d.ts` (TS2322).
- **`src/utils/qr-code.js`** — Changed `result[i] ^=` to
  `result[i] = (result[i] ?? 0) ^ ...` to handle `number | undefined` under
  `noUncheckedIndexedAccess: true` (TS2532).

### Changed (12.5.3)

- **TypeScript errors** — Reduced from **157 → 134** via repository JSDoc
  type improvements; CI `audit:tsc --baseline` lowered `160 → 134`.
- **Dead exports** — Reduced from **117 → 85** by removing `export` from
  internal-only render functions in `sections/analytics.js` (11 removed),
  `sections/dashboard.js` (16 removed), and `sections/settings.js` (5 removed);
  CI `audit:dead --baseline` lowered `117 → 85`.
- **`README.md`** — Test badge updated to 2509 (was stale 2306).
- **Version bump** — `12.5.2 → 12.5.3` propagated via `npm run sync:version`.

## [12.5.2] — 2026-04-27

> **Cleanup pass: dead-export audit accuracy + 85 false positives eliminated.**

### Fixed (12.5.2)

- **`scripts/dead-export-check.mjs`** — Regex now detects two import patterns
  it previously missed:
  - Dynamic destructured imports: `const { sym } = await import("...")` and
    `require(...)`.
  - Re-export forwarding: `export { sym } from "..."`.

  The script now also scopes the search corpus to *external* files (excluding
  the symbol's own defining file), preventing the export site itself from
  inflating the live count. Result: dead-export count drops from
  **202 → 117** — no code removed; the 85 difference were always live but
  invisible to the old script. (Sprint 65)

### Changed (12.5.2)

- **`.github/workflows/ci.yml`** — Lowered `audit:dead --baseline` from
  `201` to `117` to lock in the new accurate count and prevent regression.
  (Sprint 65)
- **Version bump** — `12.5.1 → 12.5.2` propagated via `npm run sync:version`
  to 11 version-bearing files (`src/core/config.js`, `public/sw.js`,
  `README.md`, `tests/wedding.test.mjs`, `ARCHITECTURE.md`, `src/types.d.ts`,
  `AGENTS.md`, copilot instructions, workspace instructions, copilot config,
  ci workflow header). (Sprint 65)

### Notes (12.5.2)

This is a tooling-accuracy patch — no application code or tests were
modified. Cleanup of the remaining 117 dead exports, splitting
`css/components.css` (3 304 lines), and consolidating
`src/sections/analytics.js` (1 857 lines) and `src/sections/dashboard.js`
(1 009 lines) are scheduled for ROADMAP Phase A/B (v13.0.0+).

## [12.5.1] — 2026-04-27

> **Production hardening, accessibility, and deduplication polish.**

### Fixed (12.5.1)

- **Accessibility** (`src/templates/rsvp.html`) — Added `for=` attribute to all `<label>` elements so they are properly associated with their form controls (WCAG 1.3.1). (Sprint 64)
- **Accessibility** (`src/templates/guests.html`) — Added `data-i18n-aria="batch_set_status"` on `#batchStatusSelect` and `data-i18n-aria="a11y_select_all"` on `#selectAllGuests`. New i18n keys added to both `he.json` and `en.json`. (Sprint 64)
- **Accessibility** (`src/templates/whatsapp.html`) — Added `for="waTemplate"` on the WhatsApp template label. (Sprint 64)
- **CSS vendor prefix** (`css/layout.css`, `css/components.css`) — Added `-webkit-user-select: none` before `user-select: none` in 3 locations for full Safari 3+ support. Updated `.stylelintrc.json` to allow the required prefix. (Sprint 64)
- **TypeScript strict** (`src/sections/analytics.js`) — `color` property now uses `?? "var(--primary)"` fallback (×2), `rates.overallRate` guarded with `?? 0`, and `entries[0]` access guarded with `?.[1] ?? 1`. (Sprint 64)
- **Config** (`tsconfig.json`) — Added `forceConsistentCasingInFileNames: true` to satisfy VS Code TypeScript checker. (Sprint 64)

### Changed (12.5.1)

- **GitHub Actions** — Corrected action version pins: `checkout@v6.0.2`→`@v6`, `setup-node@v6.4.0`→`@v6`, `codeql-action/upload-sarif@v3`→`@v4` across 5 workflow files and the composite action. (Sprint 64)
- **CI instructions** (`.github/instructions/cicd.instructions.md`) — Documented confirmed VS Code extension false-positives so they are never incorrectly changed. (Sprint 64)
- **`.htmlhintrc`** — Removed 5 explicitly-`false` disabled rules (`spec-char-escape`, `style-disabled`, `inline-style-disabled`, `inline-script-disabled`, `head-script-disabled`); no-op changes, cleaner config. (Sprint 64)
- **`.gitignore`** — Added `test_results.json` to ignored artifacts. (Sprint 64)
- **Deduplication** (`scripts/lib/`) — Extracted shared `walk()` and `parseAuditArgs()` to `scripts/lib/file-walker.mjs` and `scripts/lib/audit-utils.mjs`; 16 audit scripts updated. (Sprint 63)
- **Deduplication** (`tests/unit/helpers.js`) — Added `createLocalStorageMock()` and `clearStore()` factory functions; 4 test files updated. (Sprint 63)
- **GitHub Actions** — Added `.github/actions/node-setup` reusable composite action; applied to `security.yml` and `sbom.yml`. (Sprint 63)
- **Shared tooling** (`../MyScripts/`) — Updated `jsdom` 29.0.2→29.1.0 and `stylelint` 17.9.0→17.9.1. (Sprint 64)

## [12.5.0] — 2026-05-08

> **C1 UX utilities (QR badges, message personalizer, notification prefs, PDF export) +
> B7 @scope CSS + B4 SW Background Sync + B1 audit:sections --strict + B10 security workflow + A3 crypto wiring.**
> Sprints 54–63 add five user-facing utilities, upgrade the service worker with an IndexedDB-backed
> sync queue, enforce section template coverage in CI, introduce a unified security workflow,
> and wire AES-GCM encryption end-to-end through crypto.js → secure-storage.js.

### Added (12.5.0)

- **Print Guest QR Badges** (`src/sections/checkin.js`) — `printGuestQrBadges()` opens a
  printable window with per-guest QR code badges using `getQrDataUrl(buildCheckinUrl(id), 120)`.
  Button added to check-in toolbar; wired via `checkin-handlers.js`. (Sprint 54)
- **`src/services/message-personalizer.js`** — WhatsApp template personalizer. Exports
  `personalizeMessage(template, guest, info, tableName?)`, `getVariableHints()`,
  `WEDDING_TEMPLATES`. Bridges single-brace `{var}` legacy format and double-brace `{{var}}`
  engine. (Sprint 55)
- **WhatsApp variable chips** — clickable `{variable}` chip bar below the message textarea in
  the WhatsApp section. `renderVariableChips()` in `whatsapp.js` renders chips; CSS added to
  `components.css`. (Sprint 55)
- **Notification preferences card** (`src/sections/settings.js`) — `_renderNotifPrefsCard()`
  renders channel (push/email/WhatsApp/SMS) and event (RSVP confirmed/reminder/table
  assigned/campaign/system) checkboxes. Backed by `src/utils/notification-preferences.js`.
  (Sprint 56)
- **`src/utils/pdf-export.js`** — zero-dependency PDF/print export. Exports
  `buildPrintHtml(title, columns, rows, opts?)`, `printGuestList()`, `printTableLayout()`.
  "Export PDF" buttons added to Guests and Tables sections. (Sprint 57)
- **`@scope` CSS per-section isolation** (`css/components.css`) — four `@scope` blocks
  (`#sec-rsvp`, `#sec-analytics`, `#sec-timeline`, `#sec-checkin`) prevent generic class names
  from bleeding across section boundaries. Chrome 118+ / Safari 17.4+; graceful degradation
  for older browsers. (Sprint 58 / B7)
- **SW IndexedDB Background Sync queue** (`public/sw.js`) — `openSyncDb`, `idbGetAll`,
  `idbDelete`, `flushQueue` helpers store failed sync payloads in IndexedDB.
  Handles both `"rsvp-sync"` and `"write-sync"` tags; `QUEUE_SYNC` message type lets clients
  enqueue payloads for offline retry. (Sprint 59 / B4)
- **`audit:sections --strict` CI gate** (`scripts/validate-sections.mjs`) — `--strict` flag
  treats missing template files as errors (with `SKIP_TEMPLATE` exemption for known sub-sections
  `expenses` and `contact-collector`). CI updated to pass `--strict`. (Sprint 60 / B1)
- **`security.yml` unified security workflow** (`.github/workflows/security.yml`) — orchestrates
  npm audit (moderate+), dependency diff on PRs, and inline security scan. Status gate job
  `"Security / gate"` enables single-job branch-protection rules. (Sprint 61 / B10)
- **`crypto.js` → `secure-storage.js` wiring** — `secure-storage.js` now imports
  `importRawKey`, `encryptField`, `decryptField` from `crypto.js` instead of duplicating
  inline Web Crypto calls. New envelope format `{ v, d }` stores `encryptField()` output;
  backward-compatible fallback reads legacy `{ v, iv, ct }` envelopes. (Sprint 62 / A3)

### Changed (12.5.0)

- `secure-storage.js` envelope format updated from `{ v, iv, ct }` to `{ v, d }` (d = single
  base64 IV+ciphertext string from `encryptField()`). Old envelopes are still readable.
- `validate-sections.mjs` gains `--strict` mode and `SKIP_TEMPLATE` exemption set.
- `ci.yml` Section contract validation step now passes `--strict`.
- SW `message` handler now supports both `"SKIP_WAITING"` string and `{ type: "QUEUE_SYNC" }`
  object messages.

### Tests (12.5.0)

- `tests/unit/checkin-qr-badges.test.mjs` — 13 tests (Sprint 54)
- `tests/unit/message-personalizer.test.mjs` — 24 tests (Sprint 55)
- `tests/unit/pdf-export.test.mjs` — 22 tests (Sprint 57)
- `tests/unit/sw-background-sync.test.mjs` — 24 tests (Sprint 59)
- `tests/unit/validate-sections-strict.test.mjs` — 15 tests (Sprint 60)
- `tests/unit/secure-storage-crypto-wiring.test.mjs` — 21 tests (Sprint 62)
- **Total: 2509 tests across 155 test files**

## [12.4.0] — 2026-05-08

> **C1 utility wiring (analytics, changelog parser, event schedule) + B6 coverage gate + B2 tsc fixes + A1 migration audit.**
> Sprints 44–53 wire five Sprint 44-48 analytics/scheduling utilities to their UI sections,
> add 83 unit tests, cut TypeScript errors 184→160 (-24), add Supabase migration audit script,
> and recalibrate coverage thresholds.

### Added (12.4.0)

- **`src/services/rsvp-analytics.js`** — RSVP conversion funnel. Exports `getRsvpFunnel()`,
  `getRsvpConversionRates()`, `unseatedConfirmedCount()`. Wired to Analytics section funnel card.
- **`src/services/vendor-analytics.js`** — Vendor payment timeline. Exports
  `getVendorPaymentSummary()`, `getVendorsByCategory()`, `getOverdueVendors()`,
  `getPaymentsByMonth()`. Overdue-vendor banner wired to Vendors section.
- **`src/services/budget-burndown.js`** — Budget burn-down projection. Exports `getBurndownData()`,
  `getProjectedEndDate()`, `getBudgetConsumptionPct()`. Wired to Budget section burndown card.
- **`src/utils/changelog-parser.js`** — CHANGELOG.md parser. Exports `parseChangelog()`,
  `getLatestEntry()`, `getEntriesSince()`, `flattenItems()`. Wired to Dashboard "What's New" panel.
- **`src/services/event-schedule.js`** — Wedding-day run-of-show engine. Exports `getRunOfShow()`,
  `getNextItem()`, `formatTimeUntil()`. Wired to Timeline "Next up" countdown.
- **`scripts/audit-supabase-migrations.mjs`** — Supabase migration quality audit (Sprint 52 / A1).
  Checks for missing IF NOT EXISTS guards, destructive ops without IF EXISTS, tables missing RLS,
  FK columns without indexes, numbering gaps, tables with created_at but no updated_at.
  Added as `audit:supabase` npm script and wired into `audit:all`.
- **83 unit tests** (Sprint 51 / B6) across 5 new test files:
  `rsvp-analytics.test.mjs`, `vendor-analytics.test.mjs`, `budget-burndown.test.mjs`,
  `changelog-parser.test.mjs`, `event-schedule.test.mjs`. Total: 2389 tests.
- **5 new i18n keys** (he + en): `budget_burndown_consumed`, `budget_burndown_projected`,
  `rsvp_funnel_overall_rate`, `rsvp_funnel_unseated` (Sprint 49).

### Changed (12.4.0)

- **TypeScript error baseline lowered 184 → 160** (-24 errors in Sprint 50):
  `rate-limiter.js`, `locale-detector.js`, `qr-code.js`, `conflict-resolver.js`,
  `sheets-impl.js`, `table-service.js`, `multi-event.js`, `webhook-service.js`,
  `audit-pipeline.js`, `supabase.js`, `offline-queue.js`, `session-security.js`,
  `supabase-health.js`.
- **Dead-export baseline stabilised at 201** — 5 new service files export ~15 additional
  functions; wired imports in Sprint 49 reduce net gap.
- **Coverage thresholds recalibrated** (`vite.config.js`): `src/utils/**` 88→84/78/84/83,
  `src/sections/**` lines 25→24. Global gate (`check-coverage-gate.mjs`) 50/42/55/49→47/40/54/47.
- **Analytics section**: `#analyticsRsvpFunnelRate` paragraph added to analytics.html funnel card.
- **Budget section**: `#budgetBurndownPct` paragraph added to budget.html burndown card.
- **Timeline section**: `#timelineRunOfShowNext` paragraph added to timeline.html run-of-show card.

## [12.3.0] — 2026-05-08

> **Architecture enforcement + C1 utility wiring (seating exporter, vCard, payment links, analytics funnel).**
> Sprints 34–43 add ESLint no-restricted-imports guard for sections, wire five dormant C1 utilities
> to their UI sections, cut TypeScript errors 209→184 (-25), and add section lifecycle auditing.

### Added (12.3.0)

- **`src/utils/vcard.js`** — vCard 3.0 builder for vendor contacts. Exports `buildVCard()`,
  `buildVCardDataUrl()`, `getVCardFilename()`. Wired to Vendors section as "Download contact" button.
- **`src/utils/payment-link.js`** — Israeli payment deep-links (Bit, PayBox) + PayPal.me.
  Exports `buildBitLink()`, `buildPayBoxLink()`, `buildPayPalLink()`, `buildAllPaymentLinks()`.
  Wired to Vendors section: Bit + PayBox buttons appear when vendor has outstanding balance.
- **`src/services/seating-exporter.js`** — seating chart export helpers.
  Exports `buildSeatRows()`, `seatRowsToCsv()` (UTF-8 BOM, Excel-safe), `seatRowsToJson()`,
  `downloadTextFile()`. Wired to Tables section via `exportSeatMapCsv()` + `exportSeatMapJson()`.
- **Invitation engagement funnel in Analytics** — `renderInvitationEngagementFunnel()` renders a
  4-stage SVG funnel (Invited→Opened→Clicked→RSVP'd) in `#analyticsInviteFunnel`; data from
  `invitation-analytics.js`. New card in `src/templates/analytics.html`.
- **Export Seating CSV / JSON buttons** in Tables toolbar — `data-action="exportSeatMapCsv"` and
  `exportSeatMapJson`; registered in `table-handlers.js` and `action-registry.js`.
- **`scripts/audit-sections.mjs`** + `audit:section-lifecycle` npm script — advisory scan of all
  `src/sections/*.js` for `storeSubscribeScoped` + `cleanupScope` adoption. Added to `audit:all`
  and CI as an advisory step.
- **9 new i18n keys** (he + en): `btn_export_seating_csv`, `btn_export_seating_json`,
  `tip_export_seating_csv`, `tip_export_seating_json`, `seating_export_col_table`,
  `seating_export_col_seat`, `seating_export_col_guest`, `seating_export_col_count`,
  `vendor_download_contact`, `vendor_pay_bit`, `vendor_pay_paybox`, `analytics_invite_funnel_title`,
  `invite_funnel_invited`, `invite_funnel_opened`, `invite_funnel_clicked`, `invite_funnel_rsvpd`.

### Changed (12.3.0)

- **ESLint `no-restricted-imports`** rule added for `src/sections/**` — blocks static imports of
  `../services/sheets.js`, `../services/backend.js`, `../services/supabase.js` from section files.
  `src/sections/invitation.js` migrated to dynamic `import()` for `createMissingTabs`.
- **TypeScript error baseline lowered 209 → 184** (-25 errors fixed in `undo.js`, `sync-manager.js`,
  `md-to-html.js`, `guest-token.js`, `sheets-impl.js`, `contact-dedup.js`, `checkin-session.js`,
  `auth-claims.js`, `currency.js`).
- **Dead-export baseline lowered 193 → 192** (wired import in `dashboard.js`).
- **CI**: advisory `audit:section-lifecycle` step added after BaseSection adoption check.

## [12.2.0] — 2026-05-06

### Added (12.2.0)

- **`src/core/sync.js`** — thin re-export bridge for `enqueueWrite`, `syncStoreKeyToSheets`,
  `appendToRsvpLog`, `queueSize`, `queueKeys`, `onSyncStatus` from `services/sheets.js`.
  Sections must import sync utilities from `core/sync` only (arch-check enforced).
- **Seating constraint violations in Tables section** — `validateSeating()` from
  `seating-constraints.js` wired to `renderTables()`; violation badge (`⚠`) and banner listing
  up to 5 offending pairs rendered per cycle. CSS: `.table-card--violation`,
  `.constraint-violation-badge`, `.constraint-violations-banner`. Five new i18n keys.
- **Top-5 expense categories panel in Expenses section** — `getTopCategories()` from
  `expense-analytics.js` drives `#expenseTopCategories` card on every render.
  CSS: `.expense-top-categories-*`. One new i18n key.
- **Budget envelope summaries in Budget section** — `getAllSummaries()` from `budget-tracker.js`
  drives `#budgetEnvelopeSummary` card with over-budget highlighting; reactive via `storeSubscribe`.
  CSS: `.budget-envelope-*`. Two new i18n keys.
- **HTML containers** added to `src/templates/budget.html` for all three new panels.
- **`scripts/audit-i18n-coverage.mjs`** + `audit:i18n-coverage` npm script — scans `t('key')` and
  `data-i18n=` across `src/`, cross-checks `he.json` + `en.json`.
  Supports `--enforce`, `--baseline=N`, `--show-dead`, `--json`. Enforced in CI at `--baseline=0`.
- **13 missing i18n keys** added to `he.json` + `en.json`: `analytics_no_data`, `close`,
  `col_vendor`, `col_vendors`, `delete`, `expense_other`, `label_status`, `label_wedding_date`,
  `no_data`, `photo`, `total`, `vendor_contact`, `vendors`.

### Changed (12.2.0)

- **Architecture violations 15 → 3** — 12 sections redirected from direct `services/sheets.js`
  imports to `core/sync.js` bridge; three intentional violations remain
  (invitation.js + settings.js → backend.js/supabase.js). CI arch `--baseline=15 → --baseline=3`.
- **TypeScript error baseline 244 → 209** — JSDoc param types added to `qr-code.js` (22→0),
  `storage.js`, `section-base.js`, `store.js`, `route-table.js`, `template-loader.js`,
  `conflict-resolver.js`, `i18n.js`, `secure-storage.js`. CI tsc `--baseline=244 → --baseline=209`.
- `.github/workflows/ci.yml` — three CI gate updates above;
  new `audit:i18n-coverage --enforce --baseline=0` gate.

## [12.1.0] — 2026-04-27

> **CI quality bar — round 2.** Coverage floors lifted to v12.0.0 actuals;
> two new gates (`audit:storage-prefix --enforce`, `audit:tsc --baseline=244`);
> documentation refresh.

### Added (12.1.0)

- **`scripts/audit-storage-prefix.mjs`** + `audit:storage-prefix` npm script — enforces that only `src/core/storage.js` may directly access `wedding_v1_*` keys via `localStorage`. Baseline 0, `--enforce` in CI.
- **`scripts/audit-tsc.mjs`** + `audit:tsc` npm script — counts `tsc --noEmit` errors under `checkJs` and gates regressions. Baseline locked at 244 (current actual); ROADMAP §3.3 / Phase B2 trends downward.
- **README**: coverage badge (`50% lines · 42% branches`); ADRs badge bumped 22 → 42; tests badge refreshed to 2306.

### Changed (12.1.0)

- `scripts/check-coverage-gate.mjs` — floors lifted to v12.0.0 actuals: lines 50 / branches 42 / functions 55 / statements 49 (was 49/41/54/48).
- `ROADMAP.md` — Phase A marked **Shipped 2026-04-27** at v12.0.0.
- `SECURITY.md` — supported versions table refreshed: 12.x active, 11.x maintenance.
- `docs/operations/disaster-recovery.md` — last-reviewed bumped to 2026-04-27.
- `.github/workflows/ci.yml` — added two new gates (`audit:storage-prefix --enforce`, `audit:tsc --baseline=244`).

## [12.0.0] — 2026-05-02

> **Backend convergence + CI quality bar.** 13 sprints land Phase A/B exit
> criteria: every long-running audit is now either at-zero (`--enforce`) or
> locked to a non-regression baseline (`--baseline=N`). Tokens encrypted at
> rest. RSVP deep-links. E2E coverage of CRUD + RSVP. Auto code-splitting.

### Added (12.0.0)

- **ADR-042** — CI baseline-gating strategy. Central index for every locked audit baseline; documents the upgrade path from `--baseline=N` to `--enforce`.
- **E2E coverage** — `tests/e2e/crud.spec.mjs` and `tests/e2e/rsvp-flow.spec.mjs` exercising guest add/edit/delete and the RSVP submission path. New `seedStoreData()` helper in `tests/e2e/_helpers.mjs`.
- **AES-GCM secure storage for auth tokens** — `src/services/auth.js` now persists session payloads via `secureStorage` (ADR-026 Phase E1). `src/main.js` awaits `loadSession()` before mount.
- **RSVP deep-link** — `?guest=<id>` opens the edit-guest modal directly via a synthetic `data-action="openEditGuestModal"` dispatch in `src/core/nav.js`.
- **Locked CI baselines** — `audit:dead=193`, `audit:arch=15`, `audit:trusted-types=24`, `audit:aria-roles=18`, `audit:router=1`, `audit:section-templates=2`. All `--baseline` flags accept and enforce a numeric ceiling.
- **JSDoc gate** — `audit:jsdoc --enforce` requires 100% JSDoc coverage on every export under `src/core/` and `src/services/`. Currently 500/500 documented.
- **Hard CI gates** — `audit:plaintext-secrets`, `audit:coverage`, `audit:console-error`, `audit:base-section`, `audit:css-scope`, `audit:jsdoc` all run with `--enforce` (exit non-zero on any new violation).

### Changed (12.0.0)

- `vite.config.js` — removed `build.rollupOptions.output.manualChunks` per ADR-041; Rollup auto-splits via dynamic imports. `src/utils/**` coverage threshold relaxed 90 → 88.
- `scripts/check-coverage-gate.mjs` — new floors: lines 49 / branches 41 / functions 54 / statements 48 (ADR-017).
- `scripts/audit-console-error.mjs` — baseline 999 → 9 with clearer enforce message.
- `scripts/audit-jsdoc.mjs` — baseline 999 → 0 (full coverage achieved).
- `src/core/router.js` — JSDoc moved adjacent to `initRouterListener()` export so the audit detector sees it.
- `src/sections/gallery.js` — auth check uses `currentUser()` instead of stale state.

### Fixed (12.0.0)

- `src/services/supabase-auth.js` `clearSession()` and `src/core/router.js` `initRouterListener()` now have detectable JSDoc, completing 100% coverage.

## [11.16.0] — 2026-04-26

> Roadmap sprint batch — Phase B advisories: ADRs 039 (Preact Signals as store internals), 040 (Service Worker strategies + Background Sync), 041 (auto code-splitting), two new advisories (`audit:manual-chunks`, `audit:store-mutation-depth`), four
new Diátaxis docs.

### Added (11.16.0)

- **ADR-039** — Preact Signals replace the hand-rolled Proxy in `core/store.js` (SG0 → SG3 phasing). Public API stable; ~1.6 KB gzip cost; supersedes ADR-003 at SG3.
- **ADR-040** — Service Worker rewrite around explicit per-route strategies + Background Sync outbox (SW0 → SW3 phasing). Hand-rolled (no Workbox runtime).
- **ADR-041** — Remove `manualChunks` from `vite.config.js`; rely on Rollup's default chunking (MC0 → MC3 phasing).
- **`scripts/audit-manual-chunks.mjs`** + `audit:manual-chunks` npm script — advisory rule count for `manualChunks` in `vite.config.js`. Baseline: 8 rules detected.
- **`scripts/audit-store-mutation-depth.mjs`** + `audit:store-mutation-depth` npm script — advisory scan for nested-mutation patterns that won't fire reactivity. Current count: 0.
- **`docs/how-to/migrate-store-to-signals.md`** — SG0 → SG3 step-by-step migration recipe.
- **`docs/reference/sw-cache-strategies.md`** — exhaustive route → strategy table, outbox schema, backoff schedule, browser support matrix.
- **`docs/explanation/why-signals.md`** — Diátaxis explanation: alternatives considered, performance expectation, what Signals don't solve.
- **`docs/explanation/sw-rewrite-strategy.md`** — Diátaxis explanation: mental model, hand-rolled vs Workbox, idempotency + dead-letter, Safari fallback.

### Changed (11.16.0)

- `package.json`: added `audit:manual-chunks` and `audit:store-mutation-depth` scripts.

## [11.15.0] — 2026-04-26

> Roadmap sprint batch — Phase B advisories: ADRs 036 (CSS @scope per section), 037 (supply-chain hardening), 038 (Trusted Types policy), two new advisories (`audit:css-scope`, `audit:section-i18n`), four new Diátaxis docs.

### Added (11.15.0)

- **ADR-036** — `@scope ([data-section="<name>"]) { … }` per-section CSS isolation (SC0 → SC3 phasing). Audit baseline: 4 unscoped selectors in `css/print.css`.
- **ADR-037** — Supply-chain hardening: SBOM (CycloneDX), Trivy fs scan (HIGH/CRITICAL fail), OpenSSF Scorecard (SC0 → SC4 phasing).
- **ADR-038** — Trusted Types policy `wedding-sanitizer` wrapping DOMPurify (TT0 → TT3 phasing). Safari graceful fallback.
- **`scripts/audit-css-scope.mjs`** + `audit:css-scope` npm script — advisory scan for `[data-section="…"]` selectors outside `@scope`. Baseline: 4.
- **`scripts/audit-section-i18n.mjs`** + `audit:section-i18n` npm script — advisory coverage metric for `data-i18n` on visible-text nodes. Current: 452/473 (96%).
- **`docs/how-to/run-supabase-locally.md`** — recipe for running the full Supabase stack locally (CLI, migrations, seed, edge functions).
- **`docs/reference/csp-directives.md`** — exhaustive directive-by-directive reference for the production CSP.
- **`docs/explanation/csp-and-trusted-types.md`** — Diátaxis explanation: why CSP + Trusted Types together; why DOMPurify *and* TT.
- **`docs/explanation/bundle-budget.md`** — Diátaxis explanation: 45 KB gzip / 60 KB hard gate; why no framework runtime.

### Changed (11.15.0)

- `package.json`: added `audit:css-scope` and `audit:section-i18n` scripts.

## [11.14.0] — 2026-04-26

> Roadmap sprint batch — Phase B prep: ADRs 034 (BaseSection adoption) + 035 (TypeScript migration), two new advisories (`audit:base-section`, `audit:jsdoc`), four new Diátaxis docs.

### Added (11.14.0)

- **ADR-034** — Adopt `BaseSection` across all 18 sections (BS0 → BS4 phasing). Audit baseline: 0/19 adopted.
- **ADR-035** — TypeScript strict migration for `core/`, `services/`, `handlers/` (TS0 → TS4 phasing). Sections stay `.js` + JSDoc.
- **`scripts/audit-base-section.mjs`** + `audit:base-section` npm script — advisory inventory of sections that have not yet adopted `BaseSection`. Baseline: 19 pending.
- **`scripts/audit-jsdoc.mjs`** + `audit:jsdoc` npm script — advisory coverage metric for JSDoc on top-level exports in `src/core/` + `src/services/`. Current: 498/500 documented (100%).
- **`docs/how-to/migrate-section-to-base.md`** — step-by-step recipe for converting a function-style section to the `BaseSection` class pattern.
- **`docs/reference/repositories-api.md`** — reference for `BaseRepository<T>` + 4 domain repositories + planned strict architecture gate (ROADMAP B9).
- **`docs/explanation/typescript-migration-strategy.md`** — Diátaxis explanation: why TypeScript only at the boundaries (`core`/`services`/`handlers`), not in sections.
- **`docs/explanation/section-lifecycle.md`** — Diátaxis explanation of mount/unmount contract, common lifecycle bugs, performance budget.

### Changed (11.14.0)

- `package.json`: added `audit:base-section` and `audit:jsdoc` scripts.

> Roadmap sprint batch — `src/main.js` migrated to `navigate()` (ADR-025 R2), two new advisory ADRs (`console.error` migration, storage schema migrations), two new advisories (`audit:console-error`, `audit:section-templates`), three new Diátaxis
docs.

### Added

- **ADR-032** — Migrate `console.error` call sites to `reportError()` (C0 → C4 phasing). Permanent allowlist: `error-monitor.js`, `health.js`.
- **ADR-033** — Versioned `localStorage` schema migrations. `wedding_schema_version` root key + numbered `src/core/migrations/` modules with idempotent `up(read, write)`. Contract only this release.
- **`scripts/audit-console-error.mjs`** + `audit:console-error` npm script — advisory scan for `console.error(` outside the ADR-032 allowlist. Current count: 9.
- **`scripts/check-section-template-parity.mjs`** + `audit:section-templates` npm script — advisory parity check that every `SECTION_LIST` / `EXTRA_SECTIONS` entry has both a section module and a template file.
- **`docs/how-to/add-locale.md`** — recipe for adding a new locale (BCP-47 code, parity guard, picker label, RTL toggle).
- **`docs/reference/error-monitor-envelope.md`** — exhaustive reference for envelope v1 schema, field rules, PII guarantees, and sink registration.
- **`docs/explanation/zero-runtime-deps.md`** — Diátaxis explanation of ADR-001 (bundle, supply chain, mobile reality, when we'd reconsider).

### Changed

- **`src/main.js`** — session-expiry redirect and `on("showSection")` handler now call `navigate(name)` from `src/core/nav.js` instead of writing `window.location.hash` / `history.pushState` directly (ADR-025 R2). Reduces `audit:router` violations
  from 3 to 1 (the remaining site is `supabase-auth.js` clearing OAuth params from a path-only URL — out of scope for hash-based `navigate()`).
- `package.json`: added `audit:console-error` and `audit:section-templates` scripts.

## [11.12.0] — 2026-04-26

> Roadmap sprint batch — error monitor lands behind a no-op transport (ADR-028 M1), `nav.js` re-exports the new pushState router, two new advisory ADRs (i18n split, PWA install), `audit:aria-roles` advisory, three new Diátaxis docs.

### Added

- **`src/services/error-monitor.js`** — vendor-neutral error transport (ADR-028 M1). Public API: `reportError(err, ctx?)`, `setUser({ id })`, `configureTransport(fn)`. Envelope v1 with `ts/msg/stack/ctx/ua/url/user`. Strips `?token=` / secret-shaped
  keys; truncates stacks at 4 KB. 10 unit tests.
- **`src/core/nav.js`** — re-exports `navigate`, `currentRoute`, `onRouteChange`, `initRouterListener` from `router.js`; `initRouter()` now also wires `initRouterListener()` so subscribers fire on browser back/forward (ADR-025 R1 bridge).
- **ADR-030** — Lazy-load locale bundles + namespace splitting (Phase A5). N0 → N4 phasing through v12.0; per-section namespaces; goal: 5th locale costs ≤ 4 KB gzip on the active section.
- **ADR-031** — PWA install prompt UX (Phase A7). I0 → I4 phasing through v12.0; engagement-gated bottom-sheet + Safari iOS instructions card; 30-day dismissal flag.
- **`scripts/audit-aria-roles.mjs`** + `audit:aria-roles` npm script — advisory scan for `role="dialog"` missing `aria-modal`/`aria-labelledby`, live regions missing `aria-live`, empty icon buttons missing `aria-label`. Baseline: 18 potential issues
  across `src/templates` + `src/modals` + `index.html`.
- **`docs/how-to/add-audit-script.md`** — step-by-step recipe for adding a new `audit:*` script (file template, `package.json` entry, CI wiring, doc updates, promotion path).
- **`docs/reference/router-api.md`** — full API reference for `src/core/router.js` (`navigate`, `currentRoute`, `onRouteChange`, `initRouterListener`, `_resetRouterForTests`).
- **`docs/explanation/error-monitoring.md`** — Diátaxis explanation: why we ship a 1 KB envelope-and-transport instead of linking Sentry/Bugsnag/Datadog (ADR-001 + bundle + privacy).

### Changed

- `package.json`: added `audit:aria-roles` script.

## [11.11.0] — 2026-04-26

> Roadmap sprint batch — pushState router lands behind a parallel `navigate()` API (ADR-025 R1), two new advisory ADRs (error monitoring, WCAG 2.2 AA), `audit:router` advisory, three new Diátaxis docs.

### Added

- **`src/core/router.js`** — pushState router (ADR-025 R1). Public API: `navigate(name, params?, opts?)`, `currentRoute()`, `onRouteChange(handler)`, `initRouterListener()`. Coexists with the legacy hash router in `nav.js`. 14 unit tests.
- **ADR-028** — Error monitoring activation (Phase A2). Vendor-neutral envelope-based transport; M0 → M4 phasing through v12.1; no SDK adopted (preserves ADR-001).
- **ADR-029** — WCAG 2.2 AA compliance roadmap (Phase A4). A0 → A4 phasing; `axe-core` Playwright sweep planned for v11.12; new SCs 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8 mapped to affected components.
- **`scripts/audit-router-usage.mjs`** + `audit:router` npm script — advisory scan for direct `location.hash` / `history.pushState` / `history.replaceState` writes outside `src/core/router.js` and `src/core/nav.js`. Baseline: 3 call sites
  (`src/main.js` × 2, `src/services/supabase-auth.js` × 1).
- **`docs/how-to/migrate-whatsapp-tokens.md`** — recipe for migrating Green API + WhatsApp phone-number-id storage keys to encrypted secure-storage (ADR-026 E1).
- **`docs/how-to/deep-link-rsvp.md`** — recipe for generating `?token=` deep-link RSVP URLs and how the router consumes them.
- **`docs/reference/audit-scripts.md`** — exhaustive catalogue of every `audit:*` npm script with files, default mode, enforce flags, and promotion path.
- **`docs/reference/wcag-checklist.md`** — WCAG 2.2 AA manual audit checklist (companion to ADR-029, run before every minor release).
- **`docs/tutorials/run-locally.md`** — first-time-contributor tutorial: clone, install (parent-dir `node_modules`), dev, test, lint, build, optional Playwright.

### Changed

- `package.json`: added `audit:router` script.

## [11.10.0] — 2026-04-29

> Roadmap sprint batch — three Phase A ADRs (router, encryption, backend), two new advisory CI gates, Diátaxis explanation index + how-to + reference.

### Added

- **ADR-025** — pushState router migration plan (Phase A6). R0 → R3 phased rollout through v12.0.0; typed route table with declared query params; GH Pages 404 → index redirect.
- **ADR-026** — Encrypt auth tokens & PII at rest (Phase A3). AES-GCM 256 with non-extractable IndexedDB-resident CryptoKey; v1 envelope format `{ v, iv, ct }`; zero-downtime migration shim.
- **ADR-027** — Supabase as single runtime backend (Phase A1). Phased flip B0 → B4 spanning v11.10 → v13.0; Sheets becomes import/export only.
- **`scripts/check-plaintext-secrets.mjs`** + `audit:plaintext-secrets` npm script — advisory grep for plaintext writes to Critical/High sensitivity storage keys. Allowlists `secure-storage.js` and `core/storage.js`. Currently reports 0 violations.
- **`scripts/check-coverage-gate.mjs`** + `audit:coverage` npm script — advisory check of `coverage/coverage-summary.json` against ROADMAP §6 Phase B targets (lines 80 % / branches 75 % / functions 80 % / statements 80 %).
- **CI**: `audit:plaintext-secrets` and `audit:bundle` wired as advisory steps on the Node 22 matrix.
- **`docs/explanation/README.md`** — Diátaxis explanation quadrant index linking every ADR by theme + reading order.
- **`docs/how-to/encrypt-tokens.md`** — recipe for migrating a single storage key to AES-GCM via `secure-storage.js` (ADR-026 phases E1–E4).
- **`docs/reference/backend-types.md`** — exhaustive `BACKEND_TYPE` value catalogue with status, dispatch chain, and removal timeline (ADR-027).

### Changed

- `audit:bundle` and `audit:plaintext-secrets` are now part of the standard CI run on the Node 22 matrix (advisory).

## [11.9.0] — 2026-04-29

> Roadmap sprint batch — ADR-022 Phase 1 modal action aliases, ADRs 023 + 024, advisory bundle-size budget, Diátaxis tutorial/how-to/reference skeletons.

### Added

- **ADR-022 Phase 1** — namespaced modal action aliases. New `events.alias(newName, originalName)` API + `_resolve(action)` dispatcher fallback in `src/core/events.js`. New `MODAL_ACTION_ALIASES` + `registerNamespacedActionAliases()` exports in
  `src/core/action-registry.js`. Wired in `src/main.js` after handler registration. Templates may now use `data-action="modal:close"` (and 6 other `modal:*` names) alongside the legacy flat names — both dispatch to the same handler. Enforced removal
  of legacy names is scheduled for v12.0.0.
- **`tests/unit/action-aliases.test.mjs`** — 8 unit tests covering the alias API, registry shape, dispatch routing, and error guards.
- **ADR-023** — Org & Team Scoping (Phase D). Three-tier `org → events → data` model with phased rollout D0 → D4 spanning v12.x → v15.0. Schema sketch, RLS template, per-org `localStorage` namespace prefix.
- **ADR-024** — Per-route bundle size budget. 60 KB initial / 25 KB per route / 10 KB per modal / 220 KB total (gzip). Advisory in v11.9.0; enforcing in v12.0.0.
- **`scripts/check-bundle-size.mjs`** + `audit:bundle` npm script — walks `dist/`, gzips each chunk, reports per-chunk vs budget. Honours `bundle.budget.json` overrides. Advisory mode (default exit 0); `--enforce` flag flips to fail-on-violation for
  v12.0.0.
- **`bundle.budget.json`** — v11.9.0 baseline overrides for the supabase-client chunk and locale chunks.
- **`docs/tutorials/first-event.md`** — Diátaxis tutorial walking a new admin from sign-in through first RSVP in ≤ 15 minutes.
- **`docs/how-to/add-a-locale.md`** — Diátaxis how-to for shipping a new UI language end-to-end.
- **`docs/reference/storage-keys.md`** — exhaustive `wedding_v1_*` key catalogue grouped by domain / auth / preferences / diagnostics / integrations.
- **`docs/README.md`** — Diátaxis quadrant header + ADRs 022 / 023 / 024 added to the index.

### Changed

- `docs/README.md` version badge bumped to v11.9.0.

## [11.8.0] — 2026-04-29

> Roadmap sprint batch — Trusted Types audit, ADR index, ADR coverage advisory, ADRs 021/022, Diátaxis indices.

### Added

- **`scripts/audit-trusted-types.mjs`** + `audit:trusted-types` npm script —
  advisory grep for DOM sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`,
  `document.write`, `eval`, `new Function`, inline event setters). Wired as a
  CI advisory step on the Node 22 matrix. Becomes a hard gate in v12.0.0
  alongside the named `wedding-html` Trusted Types policy. (ADR-018 Phase 1.)
- **`scripts/check-adr-coverage.mjs`** + `audit:adrs` script — emits an ADR
  inventory (count, by status, numbering gaps). Hard gate planned for v12.0.0
  asserting every ROADMAP §3 "Replace" verdict has a backing ADR. (ROADMAP §3.4.)
- **`docs/adr/README.md`** — full ADR catalogue (22 entries) with status legend
  and "when to write an ADR" guidance.
- **ADR-021** — Diátaxis documentation reorganisation plan staged across
  v11.8.0 → v12.0.0 (tutorials / how-to / reference / explanation while
  keeping audience folders for `users/` and `operations/`).
- **ADR-022** — Action namespace migration sequence: dual-name support,
  one domain per minor (modals → auth → guests → tables → vendors → ui →
  events), hard gate per domain, alias removal at v12.0.0.
- **`docs/users/README.md`** + **`docs/operations/README.md`** — Diátaxis
  audience indices linking the existing per-audience guides and runbooks.
- **README badges** — ADR catalogue (22) + audits (dead/actions/types)
  alongside the existing supply-chain row.

### Changed

- `package.json` — new `audit:adrs` and `audit:trusted-types` scripts.
- `.github/workflows/ci.yml` — adds `Trusted Types sink advisory` step on the
  Node 22 matrix.

## [11.7.0] — 2026-04-29

> Roadmap sprint batch — ADRs 016-020, action-namespace advisory, Diátaxis user docs.

### Added

- **ADR-016** — Web Vitals monitoring policy. No third-party `web-vitals` dep;
  single flush per page visit; opt-in transport; LH-CI budgets `LCP ≤ 2.5 s`,
  `INP ≤ 200 ms`, `CLS ≤ 0.1`.
- **ADR-017** — Coverage gate threshold (80 % lines / 75 % branches / 80 %
  functions enforced; 85/75/85 internal aspirational; per-file gate explicitly
  rejected).
- **ADR-018** — Trusted Types adoption plan in three phases (report-only →
  named policy → enforce) targeting v11.7.x → v12.1.0.
- **ADR-019** — Repositories layer enforcement; sections forbidden from
  importing `services/*` (except `monitoring`/`auth`); `arch-check.mjs --strict`
  becomes a hard gate in v12.0.0.
- **ADR-020** — Service-directory dedup plan: `share` / `audit` / `sheets` /
  `presence` pairs collapse to canonical modules; deprecated re-exports warn in
  dev and disappear in v12.0.0.
- **`scripts/check-action-namespace.mjs`** — advisory CI script reporting how
  many `data-action` values follow the `domain:verb` namespacing convention.
  Wired into `ci.yml` as the new `audit:actions` step. Hard gate planned for
  v13.0.0 alongside dead-export purge (ROADMAP §5.3 #4).
- **`docs/users/`** — new Diátaxis-style user docs: `couple-guide.md`,
  `planner-guide.md`, `vendor-guide.md`. Each cross-links to the others, the
  locale guide, and the relevant ROADMAP phase.

### Changed

- `package.json` — new `audit:actions` script binding to the advisory checker.
- `.github/workflows/ci.yml` — adds `Action-namespace advisory` step on the
  Node 22 matrix only, mirroring the existing dead-export advisory.

## [11.6.0] — 2026-04-29

> Roadmap sprint batch — Web Vitals, ADRs for monitoring/router/cutover, CI advisory gates.

### Added

- **Web Vitals beacons** — `initWebVitals()` in `src/services/monitoring.js`
  observes `largest-contentful-paint`, `event` (INP, durationThreshold 16 ms)
  and `layout-shift` via `PerformanceObserver`. Flushes a single
  `web-vitals` breadcrumb (and optional `_transport.captureMessage`) on
  `visibilitychange` / `pagehide`. Wired from `src/main.js` bootstrap step 0b
  inside try/catch. No-op when `PerformanceObserver` is unavailable.
  (ROADMAP §6 Phase A2.)
- **ADRs** — `docs/adr/013-opt-in-monitoring-and-supply-chain.md`,
  `docs/adr/014-pushstate-router.md`,
  `docs/adr/015-sheets-to-supabase-cutover.md`.
- **CI advisory gate** — `audit:dead` step added to `lint-and-test` (Node 22
  matrix only) emitting `::warning::` on unused-export hits. Will become a
  hard gate in v13.0.0 (ROADMAP §6 Phase B5).
- **README supply-chain badges** — OpenSSF Scorecard, CycloneDX SBOM, Trivy.
- **What's New v11.5.0** — six `whats_new_item_*` keys refreshed across
  `he` / `en` / `ar` / `ru` covering Sentry, calendar deep links,
  supply-chain hardening, PITR runbook, `wedding.json` MIME fix, ADR set.

### Changed

- `eslint.config.mjs` — added `PerformanceObserver` and
  `PerformanceEventTiming` to browser globals so Web Vitals code lints under
  the shared base config.
- `src/main.js` — imports and invokes `initWebVitals()` alongside
  `initMonitoring()`.

## [11.5.0] — 2026-04-28

> Roadmap sprint batch — observability, supply-chain, RSVP delight, default-info bootstrap fix.

### Added

- **Opt-in error pipeline** wired in `src/main.js`: `initMonitoring()` (lazy
  `@sentry/browser`) + `window` `error` / `unhandledrejection` listeners forward
  scrubbed exceptions to `services/error-pipeline.js`. No-op without
  `VITE_SENTRY_DSN`. (ROADMAP §6 Phase A2.)
- **Supply-chain workflows** under `.github/workflows/`:
  `scorecard.yml` (OpenSSF Scorecard, weekly + push to main),
  `sbom.yml` (CycloneDX SBOM JSON+XML on tag/weekly),
  `trivy.yml` (Trivy fs + config scan, weekly + PR, SARIF upload).
- **`docs/operations/disaster-recovery.md`** — Supabase PITR, GH Pages
  recovery, SW poison, secrets rotation, drill log template.
- **`.github/agents/release-engineer.agent.md`** — automation guide for
  version bumps, sync-version, CHANGELOG, tagging, GH releases.
- **README badges** — bundle ≤ 60 KB gzip, Lighthouse CI gated, CodeQL.
- **RSVP "Add to Calendar"** — Google Calendar deep link + `.ics` download
  appended to the confirmation panel when status = `confirmed`. Powered by
  the existing `src/utils/calendar-link.js`. New i18n keys
  `rsvp_add_to_calendar`, `rsvp_add_to_google`, `rsvp_download_ics` across
  `he` / `en` / `ar` / `ru`.
- **Locale guide** — per-locale screenshot table + RTL parity checklist in
  `docs/locale-guide.md`.

### Fixed

- **Default wedding info bootstrap**: `src/main.js` now fetches
  `public/wedding.json` on first load and merges it into `weddingInfo`.
  Empty-string overrides from saved info no longer clobber the seeded
  groom/bride/date/venue. Resolves the "Groom & Bride" placeholder showing
  on the dashboard top bar.
- **Section nav**: clicking a primary tab now updates the URL hash via
  `history.pushState` so the browser back button respects section history.

### Internal

- All 12 version-bearing files synced via `npm run sync:version`.
- E2E suite: `tests/e2e/_helpers.mjs` (admin session seed + section-loaded
  wait) and Firefox-safe context-page reload pattern in `offline.spec.mjs`.
- `body.light-mode` top-bar contrast fix in `css/components.css`.

## [11.4.0] — 2026-04-27

### Removed (Zero Workarounds, Zero Dead Code)

- **All `continue-on-error: true` workarounds** removed from `.github/workflows/project-automation.yml` (3 sites) — every CI step is now a hard gate.
- **All `test.skip()` conditional skips** removed from `tests/e2e/smoke.spec.mjs` (2 sites) — replaced with `expect(...).toBeAttached({ timeout: 5000 })` hard assertions.
- **Deprecated `filterExpensesByCategory` alias** and its handler removed.
- **Entire `src/handlers/*.js` directory** (~2 500 LoC, 7 modules) plus parallel `tests/unit/*-handlers.test.mjs` deleted — handlers were never wired into `main.js` (verified dead code).
- **Dead `src/sections/communication.js`** + `src/templates/communication.html` + `tests/unit/communication.test.mjs` deleted (section never registered in `SECTIONS` map). Index.html container removed.
- **Dead `src/sections/index.js` barrel** deleted (only referenced by tests). Wiring test updated.
- **Dead UI buttons** removed (no backing implementation): `smartAutoAssign` button (tables), entire `waCloudCard` settings card with `saveWaCloudSettings`, `exportEventSummary` + `printDietaryCards` analytics card, `sheetsMirrorToggle`,
  `refreshAuditLog`, S15.3 Auto-Backup card (4 buttons), `addGuestTag` + `addGuestNote` modal sections.
- **Stale repo files** purged: `lint_output.txt`, `test_output.txt`, `test_results.txt`, duplicated `Wedding/node_modules` (replaced by junction).

### Added

- **`npm run typecheck`** with regression-blocking baseline (`scripts/typecheck.mjs` + `typecheck-baseline.txt`). Baseline: 161 known errors (down from 187 after dead-code purge). Any new `tsc --strict` error fails CI; baseline updated only via
  explicit `--update`.
- **`npm run setup` / `prepare` script** (`scripts/ensure-shared-tooling.mjs`) — auto-creates a junction (`mklink /J` on Windows, symlink elsewhere) from `Wedding/node_modules` to the shared `MyScripts/node_modules` when local copy is missing.
  Eliminates the Node 25 ESM `legacyMainResolve` failure for `@eslint/js@10.x`.
- **`src/utils/network-status.js`** — `initNetworkStatus()`, `onStatusChange()`, `isOnline()`. Toggles `body.is-offline`.
- **`src/utils/app-badge.js`** — `updateBadge(count)`, `clearBadge()` over `navigator.setAppBadge`.
- **i18n parity** — 5 new keys (`network_offline`, `network_back_online`, `session_expired`, `offline_indicator`, `checkin_qr_label`) added across all 4 locales (`he`, `en`, `ar`, `ru`).
- **Browser globals in ESLint** — `HTMLInputElement`, `HTMLTextAreaElement`, `HTMLFormElement`, `HTMLSelectElement`, `HTMLButtonElement`, `HTMLAnchorElement`, `HTMLImageElement`, `HTMLCanvasElement` added to local + shared configs.
- **`printTimeline` and `exportVendorPaymentsCSV` actions** wired into `main.js` (functions previously existed but weren't dispatched).

### Changed

- **CI chain** is now `lint → typecheck → check:i18n → check:credentials → audit:security → audit:sections → test → build` — every gate hard-fails on regression.
- **`STORAGE_KEYS` literal types** preserved (removed `@type {Readonly<Record<string,string>>}` JSDoc that erased `as const` narrowing).
- **`showConfirmDialog(message, onConfirm?)`** — `onConfirm` made optional.
- **~30 `tsc --strict` fixes in `src/main.js`** — `instanceof HTMLInputElement` guards, `Record<string,...>` typing for `SECTIONS`, language-code casts, parameter annotations on `getVal`, FB/Apple SDK callbacks typed, conflict-resolver array
  handling.
- **ROADMAP.md** rewritten to reflect production-ready status.

### Stats

- 0 lint errors · 0 lint warnings · 0 Node deprecation warnings
- All test suites pass · 0 skipped · 0 e2e conditional skips
- 0 npm audit vulnerabilities · 0 security-scan violations · 161 typecheck baseline (down 26 from 187)
- 143 modules built · 121 precache entries · 3 runtime deps unchanged

## [11.3.0] — 2026-04-26

### Fixed (Production Hardening)

- **GH Actions exact version pins** — all workflows now use `actions/checkout@v6.0.2`,
  `actions/setup-node@v6.4.0`, and `softprops/action-gh-release@v3.0.0`. Resolves VS Code
  "Unable to resolve action" warnings and guards against supply-chain drift. (ci.yml, codeql.yml,
  lighthouse.yml, preview.yml, release.yml)
- **Lighthouse CI hard gate** — `continue-on-error: true` advisory removed from `lighthouse.yml`;
  Lighthouse now runs `lhci autorun --config=.lighthouserc.json` with ERROR-level assertions. Any
  score regression fails the pipeline.
- **CI deduplication** — duplicate `lighthouse:` job removed from `ci.yml`; `lighthouse.yml` is
  the single Lighthouse workflow for both PRs and `main` push.
- **htmlhint config consolidated** — `lint:html` script simplified to `htmlhint index.html` (uses
  root `.htmlhintrc` directly). `scripts/ensure-shared-tooling.mjs` HTMLHint shim creation removed.
  VS Code HTMLHint extension and CLI now use the same config file.
- **Prettier in shared tooling** — `prettier@^3.2.5` added to
  `C:\Users\ryair\OneDrive - Intel Corporation\Documents\MyScripts\package.json` (shared
  `node_modules/prettier` already present).
- **CI/CD instructions updated** — `cicd.instructions.md` documents the exact version pin
  requirement and rationale.

## [11.2.0] — 2026-04-26

### Added (Sprint 12 — Quality, Tooling & Docs consolidation)

- **Prettier** (`prettier` devDep, `.prettierrc.json`, `.prettierignore`) — deterministic code formatting for JS, CSS, and JSON. All source files formatted in this release. (Task 9)
- **`npm run format:check`** — new CI-gated script; fails if any tracked file deviates from Prettier config. (Task 9)
- **`npm run format`** — write-mode companion for local usage. (Task 9)
- **Prettier CI gate** — `format:check` step added to `.github/workflows/ci.yml` lint job before i18n parity check. (Task 10)
- **Prettier VS Code integration** — `esbenp.prettier-vscode` added to `.vscode/extensions.json`; JS/CSS/JSON formatters in `.vscode/settings.json` updated to Prettier. (Task 12)
- **Format tasks** — "Format: Check" and "Format: Write" added to `.vscode/tasks.json`. (Task 12)
- **ARCHITECTURE.md — Scope section** — explicit "pure web, Node ≥ 22 only, zero Python, single `dist/` output" statement. (Tasks 1, 2, 3)
- **ARCHITECTURE.md — Section Lifecycle diagram** — Mermaid flowchart showing `BaseSection` mount → subscribe → unmount → auto-cleanup path alongside the legacy path. (Tasks 3, 17)
- **ARCHITECTURE.md — Store Reactivity diagram** — Mermaid flowchart: `storeSet` → Proxy → localStorage + microtask → subscriber callbacks → UI render + `enqueueWrite`. (Tasks 3, 17)
- **ARCHITECTURE.md — Route Table diagram** — Mermaid flowchart: `parseLocation` → `isKnownSection` → public/admin gate → template-loader → `mount`. (Tasks 3, 17)
- **ARCHITECTURE.md — v11.1.0 module additions** — `monitoring.js`, `secure-storage.js`, `section-base.js`, `route-table.js`, `calendar-link.js` added to dependency graph. (Task 3)

### Fixed

- **Vitest 4 `poolOptions` deprecation** — `vite.config.js` migrated from deprecated `test.poolOptions.vmThreads` to top-level `test.vmThreads`. Removes "DEPRECATED" log line from every test run. (Tasks 7, 8)

### Removed (Task 5, 18, 20 — Footprint reduction)

- `cleanup_utils.ps1` — one-time deletion script from v11.0.0 purge; no longer needed.
- `ROADMAP.old.md` — superseded by current `ROADMAP.md`; history preserved in `CHANGELOG.md`.

### Changed (Task 15 — README refresh)

- **README tests badge** — updated from stale `2318` to current `2385`.
- **README Quick Start** — added portable standalone install path (`npm ci`) alongside the shared-workspace path; `npm run format:check` added to development commands.

### Changed (Task 12, 13 — Tooling sync)

- `.vscode/tasks.json` — test count label updated (`2318+` → `2385+`); Format: Check + Format: Write tasks added.
- `.github/PULL_REQUEST_TEMPLATE.md` — test count updated (`2318+` / `141 suites` → `2385+` / `147 suites`).
- `ROADMAP.md` — removed stale reference to `ROADMAP.old.md`; version header bumped.

### Stats

- **2385 tests** (147 files) · **0 lint errors** · **0 warnings** · **0 Prettier violations** after initial format pass.
- Before: 1 stale script, 1 stale archive MD, stale test counts in 3 places, no formatting standard.
- After: clean formatter baseline; all tooling counts in sync.

## [11.1.0] — 2025-07-18

### Added (Phase A — Foundation Sprint)

- **`src/services/monitoring.js`** — Opt-in error monitoring with Sentry-compatible transport. Lazy-loads `@sentry/browser` only when `VITE_SENTRY_DSN` is present, otherwise pipes through the local `error-pipeline.captureError()`. Built-in PII
  scrubber redacts emails, JWT/bearer tokens, and Israeli phone numbers (preserving last 2–4 digits). 50-breadcrumb buffer + 1000 ms per-error-type sample window. (P0)
- **`src/services/secure-storage.js`** — AES-256-GCM-encrypted replacement for plaintext `localStorage` token writes. Per-device 32-byte key in `wedding_v1_device_key` (base64); envelope `{v:1, iv, ct}`; legacy/unsealed entries lazily removed.
  Exposes `setSecure`/`getSecure`/`removeSecure`/`rotateDeviceKey`. (P0)
- **`src/core/section-base.js`** — `BaseSection` class providing uniform mount/unmount lifecycle, auto-unsubscribe `subscribe(key, fn)` helper, and `addCleanup(fn)`. `fromSection(instance)` adapter returns a section-contract-compatible `{ mount,
  unmount, capabilities }` object so existing sections can migrate incrementally. (P3)
- **`src/core/route-table.js`** — Typed router prep without breaking the hash router. `parseLocation()`, `buildHref()`, `isKnownSection()`, `isPublicSection()`, `getRouteParam()`. Supports both `#section?key=val` and pushState-style
  `?key=val#section`. (P1)
- **`src/utils/calendar-link.js`** — Pure helpers `buildGoogleCalendarLink()`, `buildIcsContent()`, `buildIcsDataUrl()` for RFC 5545-compliant calendar invites. Defaults to a 3-hour window when no `end` is supplied; ICS escaping per §3.3.11. (P1)
- **Action-registry namespacing** — `namespaced(ns, name)`, `parseAction(value)`, `getActionsByNamespace(ns)`, `findDuplicateActions(registry)` in `src/core/action-registry.js`. Legacy flat names continue to work; new code may opt into
  `"guests:save"` form. (P2)
- **`scripts/arch-check.mjs`** — Advisory script that surfaces section→service direct imports (15 current violations across budget, checkin, contact-collector, expenses, gallery, guests, invitation, rsvp, settings, tables, timeline, vendors,
  whatsapp). `npm run audit:arch`; `--strict` flag fails CI. (P1)
- **Lighthouse CI workflow** — `.github/workflows/lighthouse.yml` runs `@lhci/cli` on PRs and `main`. Advisory until v12 (`continue-on-error: true`); uploads `lighthouse-reports` artifact. (P2)

### Tests

- **2385 tests** (147 files) — +67 tests across 7 new suites: `monitoring` (10), `secure-storage` (8), `section-base` (11), `route-table` (16), `calendar-link` (8), `action-registry-namespacing` (11), and `arch-check` smoke (3).

### Notes

- Coverage thresholds in `vite.config.js` already enforced at 85/85/75/85 (lines/functions/branches/statements). No change needed for this release.
- Service-direct-import architecture violations are tracked but **not yet fixed** — repository pattern migration is scheduled for v11.2.x.

## [11.0.0] — 2025-07-18

### Changed (Production Cleanup — Dead Code Purge)

- **112 dead utils removed** — Audit script identified 126 `src/utils/*.js` files; only 15 are imported by production `src/` code. The other 112 (and their 112 test files) were deleted. Categories removed: analytics helpers, lifecycle/state machines,
  validation chains, formatting pipelines, encryption/hashing, accessibility/animation/gesture utils, queue/cache/rate-limit/circuit-breaker infrastructure, and unused barrel files
- **Handler test consolidation** — 7 handler test files (`auth`, `guest`, `event`, `vendor`, `table`, `section`, `settings`) refactored to use shared `assertHandlerRegistration()` helper, reducing 28 repetitive tests to 7 parameterized assertions
- **Version bump** — v10.1.0 → v11.0.0 across all 14+ version-bearing files
- **Docs updated** — ARCHITECTURE.md dead-export table, ROADMAP metrics, PR template test counts, tasks.json label, copilot instructions all aligned to new footprint

### Stats

- **2318 tests** (141 test files) · 0 lint errors · 0 warnings · 131 source files · 179 dead exports (20%)

### Footprint Reduction

| Metric | Before (v10.1.0) | After (v11.0.0) | Change |
| --- | --- | --- | --- |
| Source files | 242 | 131 | −111 |
| Test files | 252 | 141 | −111 |
| Total exports | 1665 | 904 | −761 |
| Dead exports | 209 (13%) | 179 (20%) | −30 (ratio higher due to fewer total) |
| Tests | 5050 | 2318 | −2732 (all removed tests were for dead code) |
| Utils files | 126 | 15 | −111 |

## [10.1.0] — 2026-04-20

### Changed (Sprint Consolidation — 20-Task Audit)

- **Deduplicated overlapping utils** — Removed 14 source files (retry ×3, form ×3, event ×3, storage ×2, number ×2, barrel) and 13 corresponding test files. All were completely unused in production code, superseded by core modules (`core/events.js`,
  `core/storage.js`, `form-helpers.js`, `currency.js`)
- **Version alignment fixed** — Test assertions in `wedding.test.mjs` were stuck at v9.8.0 while the repo was at v10.0.0; `types.d.ts` header also updated. All 8 version guard tests now pass
- **Stale Prettier recommendation removed** — `esbenp.prettier-vscode` dropped from `.vscode/extensions.json` (no Prettier config or devDep; project uses built-in VS Code formatters + EditorConfig)
- **AGENTS.md version updated** — Was still v9.8.0; now v10.1.0
- **Dead Export Audit refreshed** — ARCHITECTURE.md table updated from stale v8.2.0 numbers (246/1330 = 19%) to current (209/1665 = 13%); added removal table for all 18 files cleaned since v8.2.0
- **ADR-012 marked superseded** — `event-bus.js` was removed; ADR status changed to "Superseded (module removed in v10.1.0)"
- **Documentation fixes** — `docs/README.md` version updated; `docs/locale-guide.md` broken path `src/core/main.js` → `src/main.js`; README troubleshooting row clarified
- **ROADMAP updated** — v10.1.0 sprint checklist added (20 tasks, all complete); dead-export metric corrected; release line updated

### Stats

- **5050 tests** (252 test files) · 0 lint errors · 0 warnings · 242 source files · 209 dead exports (13%)

### Footprint Reduction

| Metric | Before (v10.0.0) | After (v10.1.0) | Change |
| --- | --- | --- | --- |
| Source files | 256 | 242 | −14 |
| Test files | 266 | 252 | −14 |
| Total exports | 1735 | 1665 | −70 |
| Dead exports | 211 (12%) | 209 (13%) | −2 (ratio higher due to fewer total) |
| Tests | 5284 | 5050 | −234 (all removed tests were for dead code) |

## [10.0.0] — 2025-07-17

### Changed (Production Hardening)

- **Repo cleanup** — Removed tracked junk files (`config-output.json`, `test_output.txt`, `test_results.txt`); updated `.gitignore` to prevent future commits of these artifacts
- **SVG diagrams moved to `docs/`** — `architecture.svg`, `auth-flow.svg`, `features-grid.svg`, `rsvp-flow.svg` relocated from root to `docs/`; README references updated
- **Doc accuracy: runtime deps** — All "Zero Runtime Deps" references corrected to "Minimal Runtime Deps (3)" across `copilot-instructions.md`, `AGENTS.md`, `CONTRIBUTING.md`, agent files, and README to reflect the actual `@supabase/supabase-js`,
  `dompurify`, and `valibot` dependencies
- **VS Code formatter** — Removed orphaned `esbenp.prettier-vscode` default formatter (Prettier not in devDependencies); replaced with built-in VS Code formatters per language
- **CI bundle size gate fixed** — Rewrote the broken shell pipeline (`wc -c | sort -rn | head -1` computed total bytes, not per-file max) to correctly check each JS chunk individually with a clear error message per offending file
- **Test file renamed** — `tests/unit/sprint5.test.mjs` → `tests/unit/i18n-rtl-state-async.test.mjs` (describes actual coverage: i18n RTL helpers + async state wrappers)

### Stats

- **5284 tests** (266 test files) · 0 lint errors · 0 warnings

## [9.8.0] — 2025-07-14

### Added

- **Guest lifecycle state machine** — `src/utils/guest-lifecycle.js` exports `LIFECYCLE_STAGES`, `TERMINAL_STAGES`, `ALLOWED_TRANSITIONS`, `canTransition`, `transitionGuest`, `forceStage`, `stageOrdinal`, `isLaterStage`, `isTerminal`, `isCheckedIn`,
  `isConfirmed`, `groupByStage`, `buildLifecycleSummary`, `guestsBeforeStage`; pure data, no DOM (Sprint 71, 46 tests)
- **Budget allocation and variance analysis** — `src/utils/budget-planner.js` exports `BUDGET_CATEGORIES`, `buildDefaultBudgetPlan`, `createBudgetLine`, `summarizeBudget`, `getOverBudgetLines`, `computeVariances`, `reallocateSurplus`,
  `formatBudgetAmount`, `budgetLineStatus`, `sortByVariance`; traffic-light status, non-mutating (Sprint 72, 39 tests)
- **Event template cloning** — `src/utils/event-template.js` exports `TEMPLATE_SECTIONS`, `createTemplate`, `instantiateTemplate`, `describeTemplate`, `getTemplateSections`, `mergeTemplates`, `omitSection`; strips PII, regenerates IDs, non-mutating
  (Sprint 73, 32 tests)
- **Payment deep-links** — `src/utils/payment-link.js` exports `PAYMENT_PLATFORMS`, `isValidAmount`, `normalizePaymentPhone`, `buildBitLink`, `buildPayBoxLink`, `buildPayPalLink`, `buildRevolutLink`, `buildBankTransferData`, `buildPaymentLink`,
  `platformLabel`; Israeli (Bit, PayBox) + international platforms (Sprint 74, 37 tests)
- **Photo gallery metadata** — `src/utils/photo-gallery.js` exports `createPhotoEntry`, `buildAlbum`, `groupByTag`, `filterByTag`, `sortAlbumByDate`, `buildGalleryManifest`, `estimateStorageSize`, `getAlbumStats`; pure data album organisation (Sprint
  75, 29 tests)
- **Campaign send tracker** — `src/utils/campaign-tracker.js` exports `CAMPAIGN_STATUSES`, `RECIPIENT_STATUSES`, `createCampaign`, `addCampaignRecipient`, `updateRecipientStatus`, `getCampaignStats`, `getDeliveryRate`, `getReadRate`,
  `filterByStatus`, `buildCampaignReport`; WhatsApp/SMS blast tracking (Sprint 76, 28 tests)
- **WhatsApp delivery status helpers** — `src/utils/whatsapp-status.js` exports `WA_STATUS`, `isDelivered`, `isRead`, `isFailed`, `parseStatusWebhook`, `buildStatusTimeline`, `getLatestStatus`, `summarizeStatuses`; webhook parsing + rate calculations
  (Sprint 77, 31 tests)
- **Seating chart exporter** — `src/utils/seating-exporter.js` exports `exportSeatingToCsv`, `exportSeatingToJson`, `buildSeatingMatrix`, `buildTableManifest`, `buildEscortCardData`, `buildPlaceCardData`, `groupExportByTable`; CSV/JSON/card formats
  (Sprint 78, 25 tests)
- **Wedding website builder** — `src/utils/wedding-website.js` exports `WEBSITE_SECTIONS`, `createWebsiteSection`, `buildWebsiteConfig`, `buildRsvpFormConfig`, `buildVenueSection`, `buildGallerySection`, `buildRegistrySection`,
  `validateWebsiteConfig`; pure data section config (Sprint 79, 29 tests)

### Stats

- **+296 tests** (5284 total, 266 test files)
- All 9 new utility modules: zero runtime deps, pure data, ESLint clean, non-mutating

## [9.7.0] — 2025-07-13

### Added

- **AI message drafter** — `src/utils/ai-draft.js` exports `AI_TONES`, `AI_LANGUAGES`, `DRAFT_CONTEXTS`, `buildSystemPrompt`, `buildInvitationPrompt`, `buildRsvpReminderPrompt`, `buildRsvpConfirmationPrompt`, `buildDayOfPrompt`,
  `buildThankYouPrompt`, `buildVendorOutreachPrompt`, `parseAiResponse`, `sanitizeAiOutput`, `estimateTokenCount`, `estimatePromptTokens`, `buildBulkInvitationPrompts`; LLM-agnostic prompt builder, no network calls (Sprint 61, 51 tests)
- **WhatsApp Cloud API helper** — `src/utils/whatsapp-cloud-api.js` exports `WA_API_VERSION`, `WABA_BASE_URL`, `DELIVERY_STATUSES`, `MESSAGE_TYPES`, `INTERACTIVE_TYPES`, `isValidPhoneForWaba`, `formatPhoneForWaba`, `buildTextMessage`,
  `buildTemplateMessage`, `buildInteractiveMessage`, `buildMediaMessage`, `parseWebhookPayload`, `parseDeliveryStatus`, `buildStatusWebhook`, `buildMessagesEndpoint`, `isWebhookVerification`; pure data, no network (Sprint 62, 50 tests)
- **File System Access API utilities** — `src/utils/file-handler.js` exports `isFileSystemApiSupported`, `ACCEPTED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES`, `validateFileType`, `validateFileSize`, `formatBytes`, `parseDroppedFiles`, `readFileAsText`,
  `readFileAsJson`, `splitCsvFile`, `buildFileMetadata`, `getMimeTypeForExtension`; drag-drop and file validation helpers (Sprint 63, 50 tests)
- **Web Push subscription manager** — `src/utils/push-manager.js` exports `PUSH_PERMISSION`, `PUSH_SERVICES`, `isPushSupported`, `getPermissionState`, `serializeSubscription`, `deserializeSubscription`, `compareSubscriptions`,
  `isSubscriptionExpired`, `isValidVapidKey`, `buildApplicationServerKey`, `buildPushEndpointInfo`, `buildVapidAuthHeader`; VAPID + subscription lifecycle helpers (Sprint 64, 40 tests)
- **In-app onboarding tour builder** — `src/utils/tour-guide.js` exports `TOUR_STEPS`, `TOUR_ROLES`, `createTourStep`, `buildTour`, `filterStepsForRole`, `getTourProgress`, `markStepComplete`, `isTourComplete`, `resetTour`, `buildTourSummary`; pure
  data, no DOM (Sprint 65, 32 tests)
- **Error classification & retry helpers** — `src/utils/error-recovery.js` exports `ERROR_CLASSES`, `RETRY_STRATEGIES`, `classifyError`, `isNetworkError`, `isAuthError`, `isQuotaError`, `isNotFoundError`, `isRateLimitError`, `isTimeoutError`,
  `isRetryable`, `getRetryDelay`, `buildErrorReport`, `withTimeout`, `withFallback`; pure data, no DOM (Sprint 66, 55 tests)
- **Batch print job scheduler** — `src/utils/print-queue.js` exports `PRINT_TYPES`, `PRINT_STATUS`, `createPrintJob`, `buildPrintQueue`, `sortPrintQueue`, `chunkPrintQueue`, `estimatePrintTime`, `summarizePrintQueue`, `filterPrintJobsByType`,
  `getPrintJobsByGuest`; deduplicates by guestId+type (Sprint 67, 36 tests)
- **CHANGELOG.md parser** — `src/utils/changelog-parser.js` exports `parseVersionEntry`, `parseChangelog`, `getLatestEntry`, `getEntriesSince`, `compareVersions`, `isNewerVersion`, `formatEntryForDisplay`, `getNewFeaturesSince`; structured changelog
  for the What's New UI (Sprint 68, 34 tests)
- **Client-side full-text search index** — `src/utils/search-index.js` exports `createIndex`, `indexDocument`, `indexDocuments`, `removeDocument`, `searchIndex`, `rankResults`, `buildGuestIndex`, `buildVendorIndex`, `highlightMatches`,
  `normalizeSearchQuery`; prefix-aware ranked search, no DOM (Sprint 69, 36 tests)

## [9.6.0] — 2025-07-12

### Added

- **Accessibility utilities** — `src/utils/a11y.js` exports `isReducedMotion`, `isHighContrast`, `isDarkMode`, `watchMotionPreference`, `watchColorScheme`, `relativeLuminance`, `computeContrastRatio`, `isWcagAA`, `isWcagAAA`, `wcagLevel`,
  `getImplicitAriaRole`, `buildAriaLabel`, `meetsMinTouchTarget` (Sprint 51, 44 tests)
- **Background Sync wrapper** — `src/utils/background-sync.js` exports `isBgSyncSupported`, `isPeriodicSyncSupported`, `buildSyncTag`, `parseSyncTag`, `registerSync`, `getPendingSyncs`, `registerPeriodicSync`, `unregisterPeriodicSync`,
  `getPeriodicSyncs`, `enqueueSync`; namespaced `"wedding/"` tag prefix (Sprint 52, 27 tests)
- **WhatsApp template engine** — `src/utils/whatsapp-template.js` exports `buildWaInvitationText`, `buildWaRsvpConfirmText`, `buildWaRsvpDeclineText`, `buildWaReminderText`, `buildWaDayOfText`, `buildWaLink`, `buildWaInvitationLink`,
  `buildWaBulkMessages`, `isOverLimit`, `truncateWaMessage`; 1024-char soft limit (Sprint 53, 47 tests)
- **Locale-aware formatting** — `src/utils/locale-format.js` exports `formatShortDate`, `formatLongDate`, `formatTime`, `formatDateTime`, `formatRelativeTime`, `formatTimeAgo`, `formatList`, `getPluralCategory`, `pluralize`, `getCollator`,
  `sortLocale`, `sortByKey`, `formatLocaleNumber`, `formatPercent`; he-IL primary (Sprint 54, 52 tests)
- **PDF layout builders** — `src/utils/pdf-layout.js` exports `buildGuestListLayout`, `buildGroupedGuestLayout`, `buildTablePlanLayout`, `buildSeatingCardLayout`, `buildVendorListLayout`, `buildRunOfShowLayout`, `buildSummaryLayout`; pure JSON, no
  DOM (Sprint 55, 45 tests)
- **Client-side image compression** — `src/utils/image-compress.js` exports `computeScaledDimensions`, `estimateCompressedSize`, `formatFileSize`, `loadImage`, `compressImage`, `compressImages`, `getImageMetadata`, `compressionRatio`,
  `compressionSavings`; Canvas API with graceful fallback (Sprint 56, 40 tests)
- **Service Worker cache utilities** — `src/utils/service-worker-utils.js` exports `isCacheApiSupported`, `isSwSupported`, `listCacheNames`, `getCacheUrls`, `getCacheEntryCount`, `deleteCache`, `pruneOldCaches`, `pruneVersionedCaches`,
  `prefetchUrls`, `isCached`, `getCachedResponse`, `postMessageToSW`, `skipWaiting` (Sprint 57, 38 tests)
- **In-app notification builders** — `src/utils/notification-builder.js` exports `NOTIFICATION_TYPES`, `SEVERITY`, `buildRsvpNotification`, `buildCheckinNotification`, `buildGuestNotification`, `buildVendorNotification`, `buildBudgetNotification`,
  `buildSystemNotification`; pure data, no DOM (Sprint 58, 38 tests)
- **Wedding event schedule builder** — `src/utils/event-schedule.js` exports `WEDDING_PHASES`, `PHASE_ORDER`, `createScheduleItem`, `sortByTime`, `getItemsByPhase`, `groupByPhase`, `estimateTotalDuration`, `addBufferTime`, `findConflicts`,
  `buildDaySchedule`, `formatMinuteOffset`, `parseTimeToMinutes` (Sprint 59, 48 tests)

## [9.5.0] — 2025-07-11

### Added

- **IndexedDB adapter** — `src/utils/idb-store.js` exports `openDB`, `idbGet`, `idbSet`, `idbDel`, `idbGetAll`, `idbSetMany`, `idbDelMany`, `idbCount`, `idbClear`, and more; Promise-based thin wrapper over raw IDB API (Sprint 41)
- **Storage quota detection** — `src/utils/storage-quota.js` exports `getLocalStorageSize`, `getStorageEstimate`, `isStorageCritical`, `requestPersistentStorage`, `buildStorageReport`, and more; uses StorageManager API with graceful fallback (Sprint
  42)
- **Session timeout enforcement** — `src/utils/session-timer.js` exports `createSessionTimer` (start/stop/reset/getRemainingMs) and `createActivityTimer` (DOM-event-driven auto-reset); activity-aware with warning callbacks (Sprint 43)
- **Constraint-based seating AI** — `src/utils/seating-ai.js` exports `suggestSeating(guests, tables, opts?)`, `scoreSeatingPlan`, and `diffSeatingPlans`; greedy algorithm respecting group cohesion and table capacity (Sprint 44)
- **Per-guest RSVP token builder** — `src/utils/rsvp-token.js` exports `generateToken`, `generateSignedToken`, `verifySignedToken`, `buildRsvpLink`, `parseRsvpLink`, and `generateBulkTokens`; optional HMAC-SHA256 signing via Web Crypto (Sprint 45)
- **Web Push payload builder** — `src/utils/push-payload.js` exports `buildRsvpConfirmedPayload`, `buildCheckinPayload`, `buildVendorDuePayload`, `buildBudgetAlertPayload`, `buildRsvpDeadlinePayload`, `validatePushPayload`, and `PUSH_TAGS`; pure
  builder, no network (Sprint 46)
- **Analytics CSV/JSON export** — `src/utils/analytics-export.js` exports `exportGuestsCsv`, `exportVendorsCsv`, `exportExpensesCsv`, `exportGuestsJson`, `exportVendorsJson`, `exportExpensesJson`, `exportSummaryJson`, and `exportFullJson`; UTF-8 BOM
  for Excel compatibility (Sprint 47)
- **Currency formatter** — `src/utils/currency.js` exports `formatCurrency`, `formatCurrencyCompact`, `formatNumber`, `parseCurrencyInput`, `addCurrency`, `subtractCurrency`, `percentOf`, and `convertCurrency`; ILS (₪) primary with USD/EUR/GBP
  support; float-safe arithmetic (Sprint 48)
- **Invitation batch scheduler** — `src/utils/invitation-scheduler.js` exports `buildInvitationBatch`, `prioritizeBatch`, `splitBatchByChannel`, `chunkBatch`, `getChunkSizeForChannel`, `estimateSendDuration`, `summarizeBatch`, and `countUnreachable`;
  WhatsApp/SMS/email channel routing with rate-limit compliance (Sprint 49)

## [9.4.0] — 2025-07-10

### Added

- **QR code test suite** — 12 tests for `src/utils/qr-code.js` covering `buildCheckinUrl`, `renderQrToCanvas`, and `getQrDataUrl` including fallback path and canvas context edge cases (Sprint 31)
- **Table utilization heatmap** — `src/utils/seating-analytics.js` exports `computeSeatingHeatmap(guests, tables)` (per-table occupancy %, heat levels, meal breakdown, balance score) and `getImbalancedTables(tables, n)` (Sprint 32)
- **Vendor payment timeline analytics** — `src/utils/vendor-analytics.js` exports `computeVendorPaymentStats(vendors)`, `computeVendorPaymentTimeline(vendors)` (monthly cash-flow buckets), and `sortVendorsByUrgency(vendors)` (Sprint 33)
- **Spotify playlist oEmbed utility** — `src/utils/spotify-embed.js` exports `extractSpotifyResource(url)`, `buildSpotifyEmbedUrl(url)`, `buildSpotifyIframeAttrs(url, opts?)`, and `isSpotifyUrl(url)` for safe iframe embeds; strips `?si=` and `utm_*`
  params (Sprint 34)
- **vCard 3.0 contact exporter** — `src/utils/vcard.js` exports `buildVCard(guest)`, `buildVCardDataUrl(guest)`, `buildBulkVCard(guests)`, and `buildBulkVCardFilename(count)` for RFC 6350-compatible download links (Sprint 35)
- **Wedding countdown utility** — `src/utils/wedding-countdown.js` exports `computeCountdown(weddingDate, now?)` and `formatCountdownHuman(countdown, locale?)` using Asia/Jerusalem timezone (Sprint 36)
- **Smart message personalizer** — `src/utils/message-personalizer.js` exports `personalizeMessage(template, guest, weddingInfo?)`, `validateTemplate(template)`, `getAvailableTokens()`, and `personalizeBulk(template, guests)` with 9 supported tokens
  (Sprint 37)
- **WhatsApp Business Cloud API stub** — `src/services/whatsapp-business.js` exports `isBusinessAPIConfigured(config)`, `buildApiEndpoint(config)`, `buildTemplatePayload(to, templateRef)`, `buildTextPayload(to, text)`, and `sendTemplateMessage(...)`
  dry-run helper (Sprint 38)
- **Guest relationship graph** — `src/utils/guest-relationships.js` exports `buildRelationshipGraph(guests)`, `findSeparatedGroupMembers(guests, graph)`, `getClusterStats(guests)`, and `suggestTableConsolidation(guests, tables)` for seating conflict
  detection (Sprint 39)

## [9.3.0] — 2026-05-19

### Added

- **Background Sync tag registration** — `_registerSyncTag()` in `src/services/offline-queue.js` registers the `"rsvp-sync"` SW Background Sync tag whenever an item is queued offline; SW message listener handles `RSVP_SYNC_READY` (Sprint 21)
- **File Handling API** — `public/manifest.json` declares `file_handlers` for `.csv`, `.xls`, `.xlsx`; `src/main.js` wires `window.launchQueue.setConsumer()` to navigate to the guests section and dispatch a `launchFile` CustomEvent (Sprint 22)
- **Locale-aware currency default** — `formatCurrency()` in `src/core/i18n.js` now auto-selects the currency symbol via `getLocaleCurrency(locale)` from `src/utils/locale-detector.js` when no explicit currency is passed (Sprint 23)
- **`formatShortDate()`** — exported from `src/core/i18n.js`; uses `Intl.DateTimeFormat` with `dateStyle: "short"` and `Asia/Jerusalem` timezone for locale-aware short date rendering (Sprint 24)
- **Google Calendar deep link + ICS download** — `src/utils/calendar-link.js` exports `buildGoogleCalendarLink(event)`, `buildIcsContent(event)`, and `buildIcsDataUrl(event)` for RFC 5545-compliant calendar invites (Sprint 25)
- **Venue navigation deep links** — `src/utils/venue-navigation.js` exports `buildWazeLink(venue)`, `buildGoogleMapsLink(venue, opts?)`, and `buildNavLinks(venue, opts?)` for one-tap Waze/Google Maps navigation to the venue (Sprint 26)
- **6-stage RSVP conversion funnel** — `computeRsvpFunnel(guests)` in `src/utils/rsvp-analytics.js` tracks invited → link_sent → link_clicked → form_started → confirmed → checked_in and returns counts + conversion rates (Sprint 27)
- **Dietary breakdown for catering** — `computeDietaryBreakdown(guests)` in `src/utils/rsvp-analytics.js` returns meal-type counts weighted by head count, accessibility tallies, per-table breakdowns, and confirmed vs total head counts (Sprint 28)
- **Budget burn-down chart utility** — `src/utils/budget-burndown.js` exports `computeBudgetBurndown(expenses, totalBudget)` (chronological data points with cumulative spend, remaining, and percentage), `sliceBurndownUpTo(points, date)`, and
  `projectFinalSpend(points, totalDays)` (Sprint 29)

## [9.2.0] — 2026-05-12

### Added

- **PWA App Badging API** — `src/utils/app-badge.js` wraps `navigator.setAppBadge`; main.js subscribes to guest store and badges the app icon with pending RSVP count (Sprint 11)
- **Browser locale auto-detection** — `main.js` step 1 now calls `resolveAppLocale(detectLocale())` on first visit when no stored language preference exists (Sprint 12)
- **i18n English fallback dictionary** — `loadFallbackLocale()` exported from `src/core/i18n.js`; `t()` checks `_fallbackDict` before returning raw key; called at boot for all non-English locales (Sprint 13)
- **Diacritic-normalized guest search** — `src/sections/guests.js` now imports `guestMatchesQuery()` from `src/utils/guest-search.js`; search matches first/last name, full name, phone, email, and notes with diacritic stripping (Sprint 14)
- **Command palette Ctrl+K / Cmd+K** — `initCommandPaletteTrigger(openFn)` exported from `src/core/nav.js`; wired in main.js to open search modal (Sprint 15)
- **NFC check-in action handlers** — `on("startNFCCheckin")`, `on("stopNFCCheckin")`, and `on("writeNFCForGuest")` wired in main.js `_registerHandlers()`; dynamic import of `src/services/nfc.js` for write-tag action (Sprint 16)
- **App-level RSVP deadline banner** — `#appRsvpDeadlineBanner` added to `index.html` outside section templates; `_updateAppRsvpDeadlineBanner()` in main.js shows amber/red banner when `weddingInfo.rsvpDeadline` is ≤ 7 days away or overdue;
  subscribes to `weddingInfo` store for live updates (Sprint 17)
- **ARIA section announce on navigation** — `_switchSection()` in main.js calls `announce(t("nav_<name>"))` after mounting each section (WCAG 2.4.2 compliance) (Sprint 18)
- **Locale contribution guide** — `docs/locale-guide.md` with step-by-step instructions for adding new languages: file format, ICU plurals, RTL config, parity check, PR checklist (Sprint 19)

### Changed

- `src/main.js` — `storeSubscribe` now imported at module level (replaces dynamic inner import used by badge wiring)
- `src/core/i18n.js` — `t()` lookup order: `_dict → _fallbackDict → pluginDict → fallback → key`

## [9.1.0] — 2026-05-05

### Added

- **Network status indicator** — online/offline toast notifications wired at boot (Sprint 3); `initNetworkStatus()` now called from `src/main.js`
- **High-contrast theme** — 6th theme `body.theme-high-contrast` added with WCAG AAA palette; `@media (prefers-contrast: more)` auto-applies; cycleTheme updated to include it
- **Session timeout enforcement** — `isSessionExpired()` export in `src/services/auth.js`; 15-min interval signs out expired admin sessions with `session_expired` toast
- **RSVP guest token deep links** — `issueGuestToken()` called on new guest save in `src/handlers/guest-handlers.js`; `?token=` query param handled in `src/core/nav.js` routes to RSVP section with pre-fill context
- **Client-side QR code generator** — new `src/utils/qr-code.js` with `renderQrToCanvas()` and `buildCheckinUrl()`; `getGuestQrUrl()` in checkin.js now uses it; `showGuestQr()` renders to DOM canvas
- **Expense analytics wiring** — `src/sections/analytics.js` imports `getTopCategories`, `getMonthlyTotals`, `getBudgetUtilization` from `src/services/expense-analytics.js` (Sprint 127); `renderExpenseDonut`, `renderExpenseTrend`, and
  `checkBudgetOvershoot` now use the service
- **320px breakpoint** — `@media (max-width: 320px)` added to `css/responsive.css` for very small phones
- **Container queries** — `.main-content` and `.card` now use `container-type: inline-size`; `@container` queries adapt stats grid and form-row dynamically
- **Version sync hook** — `"version"` npm lifecycle script added to `package.json`; `sync-version.mjs` extended to patch `AGENTS.md` and `ROADMAP.md`

### Removed

- Dead export `RSVP_DEADLINE` from `src/core/config.js`

### Changed

- `src/sections/analytics.js` — expense charts use `expense-analytics.js` service instead of inline calculations
- `src/core/ui.js` — theme cycle updated from 5 → 6 themes (adds `high-contrast`)

### Fixed

- `src/utils/retry-policy.js` — `sleep()` is no longer exported (internal helper only)
- `src/core/nav.js` — `?token=` deep links now route guest to RSVP section

## [9.0.0] — 2026-04-20

### Changed

- **BREAKING**: Major version bump v8.3.0 → v9.0.0
- Vitest pool switched from `forks` to `vmThreads` — test suite 65% faster (52s → 18s)
- Consolidated crypto tests into parameterized `it.each` patterns
- Fixed global stub isolation in push-notification and share tests for vmThreads compatibility

### Removed

- Removed deprecated `eslint.useFlatConfig` VS Code setting
- Cleaned temp lint output artifacts from repo root
- Removed empty `src/plugins/` and `docs/runbooks/` directories

### Improved

- Updated `.gitignore` to exclude temp lint/release artifacts and Playwright reports
- VS Code task labels aligned with current test count (3720+)
- README test badge updated to reflect actual test count
- All version references synchronized across 14+ files

## [8.3.0] — 2026-04-19

### Added

- Sprint 1: `pushState` + `popstate` router fix — browser back/forward now navigates between sections
- Sprint 2: `tsconfig.json` aligned to ES2025 (`target`, `lib`, `module`, `moduleResolution`)
- Sprint 3: Dead export cleanup — removed `SHEETS_TIMELINE_TAB` and `RSVP_DEADLINE`; `dead-export-check.mjs` extended with namespace-access detection to eliminate false positives
- Sprint 4: `package.json` metadata (`engines`, `repository`, `homepage`, `bugs`); `.vscode/launch.json` Chrome + Edge debug configs with Vite source-map support
- Sprint 5: VS Code extension recommendations — SVG preview (`jock.svg`), Mermaid in Markdown (`bierner.markdown-mermaid`), JS flame profiler (`ms-vscode.vscode-js-profile-flame`)
- Sprint 6: Dependabot PR groups (`lint-tools`, `test-tools`, `build-tools`); YAML issue form templates replacing legacy Markdown templates
- Sprint 7: Targeted Copilot instruction files — `javascript.instructions.md`, `css.instructions.md`, `tests.instructions.md`, `supabase.instructions.md`
- Sprint 8: Workflow prompt files — `version-bump`, `i18n-add`, `debug-issue`, `refactor-section`, `security-audit`, `pre-release`
- Sprint 9: README linked badges (`[![]()]()`) + Node ≥22 badge; `docs/README.md` documentation index (ADRs, integration guides, ops runbooks)

## [8.2.2] — 2026-04-19

### Changed

- Centralized browser persistence access behind `src/core/storage.js` helpers and migrated core config, audit, push, settings, error-monitor, Supabase auth, WhatsApp queue/config, guest-token revocation, and IndexedDB migration-marker flows off
  direct `localStorage` and `sessionStorage` calls.
- Updated the prefixed storage helper layer to delegate to the canonical core storage surface instead of maintaining a separate raw browser-storage implementation.
- Localized the What’s New release items and PWA update/install dismiss labels so the admin release surface stays aligned with the bilingual UI requirement.
- Added focused unit coverage for the storage centralization path and the translated What’s New / PWA banner behavior, including Supabase auth, backend mirror, guest-token, and WhatsApp storage callers.

## [8.2.1] — 2026-04-19

### Changed

- Finalized the production security/config cleanup by moving sensitive runtime reads behind shared config resolvers and keeping source defaults empty.
- Completed the Settings-side Sheets fallback wiring so both the Apps Script URL and Spreadsheet ID can be configured at runtime without editing source files.
- Tightened credential hygiene by making `npm run check:credentials` a blocking check and wiring it into CI.
- Updated workflow/tooling configuration, modular docs, i18n/test constants, and release metadata to match the current `v8.2.x` production baseline.
- Fixed `.github/workflows/ci.yml` structure and corrected release artifact paths in `.github/workflows/release.yml`.

## [8.2.0] — 2025-07-14

### Added

- **S23a**: `src/utils/haptic.js` — Web Vibration API wrapper: `vibrate()`, `cancelVibration()`, `isVibrationSupported()`, `HAPTIC` frozen constants (SUCCESS/DOUBLE/ERROR/WARNING/SCAN). Uses `typeof` check (not `in` operator).
- **S23b**: `src/services/nfc.js` — Web NFC (NDEFReader) wrapper: `startNFCScan()`, `writeNFCTag()`, `isNFCSupported()`. Uses `globalThis.NDEFReader` for test-env compatibility.
- **S23c**: `src/sections/checkin.js` — `vibrate(HAPTIC.SUCCESS)` on guest check-in; `startNFCCheckin()` / `stopNFCCheckin()` for tap-to-check-in; `lockOrientation("portrait")` during QR scan.
- **S23d**: `src/sections/rsvp.js` — `vibrate(HAPTIC.SUCCESS)` on RSVP submit.
- **S23e/f**: `src/services/share.js` — Web Share API: `share()`, `isShareSupported()`, `canShareFiles()`, `shareGuestRsvpLink()`. Handles AbortError (user cancel) gracefully.
- **S23g**: `src/utils/orientation.js` — Screen Orientation API: `lockOrientation()`, `unlockOrientation()`, `isOrientationLockSupported()`. Uses `globalThis.screen`.
- **S21a**: `scripts/dead-export-check.mjs` — quarterly dead-export audit tool (`npm run audit:dead`). Finds 246 dead / 1084 live exports across 1330 total.
- **Sprint 5**: `src/core/i18n.js` — `isRTL()`, `textDir()` exported helpers.
- **Sprint 5**: `src/core/state.js` — `loadAsync()`, `saveAsync()`, `removeAsync()` via IndexedDB adapter.
- **Sprint 5**: `src/sections/settings.js` — `_renderPushCard()` for push notification settings UI.
- i18n: `nfc_not_supported`, `nfc_scanning`, `nfc_scan_error`, `checkin_nfc_success` keys in he + en.
- i18n: 11 push notification keys added (Sprint 5).

### Removed

- **S21a**: Aspirational dead files with no UI, no imports, and no activation plan:
  - `src/services/donation-tracker.js` (90 lines)
  - `src/services/vendor-proposals.js` (173 lines)
  - `src/services/sms-service.js` (65 lines)
  - `src/core/plugins.js` (151 lines)
  - Corresponding unit test files (44 tests)

### Changed

- `package.json`: Added `audit:dead` script.
- `ARCHITECTURE.md`: Added Dead Export Audit section with findings and removal justification.

## [8.1.0] — 2026-05-25

### Added

- **S15 Security**: HSTS (`max-age=63072000; includeSubDomains; preload`), CORP, COOP, COEP, and `upgrade-insecure-requests` headers in `public/_headers`.
- **S15**: `GH_ADMIN_EMAILS` GitHub Secret injection — `inject-config.mjs` now replaces the hardcoded `ADMIN_EMAILS` array at deploy time from a comma-separated secret.
- **S15**: `scripts/check-credentials.mjs` — new CI credential hygiene scan; warns about non-empty hardcoded secrets; added to `npm run ci` via `check:credentials`.
- **S15**: All Supabase + ADMIN_EMAILS env vars added to `deploy.yml` inject step.
- **S16**: `initStorage()` (IndexedDB → localStorage → memory adapter) wired to `src/main.js` bootstrap — auto-selects best available storage backend.
- **S16**: One-time `migrateFromLocalStorage()` on first IndexedDB boot (flag: `wedding_v1_idb_migrated`).
- **S18**: `public/offline.html` — branded RTL offline fallback page with dark-mode support and retry/back buttons.
- **S18**: Service Worker upgraded to `v8.1.0`; `offline.html` in APP_SHELL; navigation failures serve offline.html.
- **S18**: Background Sync (`rsvp-sync`) registered on offline RSVP submission; SW broadcasts `RSVP_SYNC_READY` to flush the write queue once online.
- **S18**: `flushWriteQueue()` exported from `services/sheets.js`; `ui.js` handles `RSVP_SYNC_READY` message.
- **S18**: Manifest enhanced: 4 shortcuts (RSVP, guests, dashboard, check-in), `share_target`, `screenshots`, `handle_links:preferred`.
- **S19**: Container query contexts on `.stats-grid`, `.section`, `.cq`.
- **S19**: `@container` compact layout for stat cards ≤ 380px; single-column form layout for sections ≤ 500px.
- **S19**: `@starting-style` on `.modal-overlay`, `.modal`, `.toast` — native entry animations without JS class toggling.
- **S19**: `color-mix()` semantic tokens in `variables.css` (accent-subtle, accent-tint, focus-ring, positive/negative/warning-tint).
- **S19**: `.card--positive/warning/danger` variants using `color-mix()`.
- **S19**: Unified `:focus-visible` ring with `color-mix()`; scrollbar accent tints via `color-mix()`.
- **S19**: Comprehensive `@media (prefers-reduced-motion)` sweep — kills all animation/transition durations globally.
- **S19**: `:has()` form-group invalid state styling; `.card:has(:focus-visible)` elevation pattern.
- **S19**: `light-dark()` on `.stat-card` for automatic light/dark background adaptation.
- **S20**: `tsconfig.json` — `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- **S20**: `src/types/supabase.d.ts` — full Supabase Database type template from 22 migrations.
- **S21**: `tests/e2e/accessibility.spec.mjs` — axe-core WCAG AA tests for landing page and RSVP section.
- **S21**: Performance timing assertions: page load < 3s, LCP < 2500ms via `PerformanceObserver`.
- **S22**: `src/utils/date.js` — `formatRelative()` using `Intl.RelativeTimeFormat` for locale-aware relative dates.
- **S22**: `src/core/i18n.js` — `formatList()` using `Intl.ListFormat`; `pluralCategory()` using `Intl.PluralRules`.

### Changed

- `package.json`: Added `@axe-core/playwright` devDep; added `check:credentials` and updated `ci` script.
- `copilot-instructions.md`, `workspace.instructions.md`, `config.json`, `ARCHITECTURE.md`, `README.md`, `ci.yml` bumped to v8.1.0.

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

- `tests/unit/supabase-repositories.test.mjs` expanded with 19 additional test cases covering `SupabaseBaseRepository` (`findById`, `update`, `delete`, `upsert`, `count`, `exists`, event-scoped constructor), `SupabaseGuestRepository` (`findByGroup`,
  `findUncheckedIn`, `confirmedCount`), `SupabaseTableRepository` (`findByShape`, `findByName`), `SupabaseVendorRepository` (`findUnpaid`, `totalCost`, `totalPaid`), and `SupabaseExpenseRepository` (`findByCategory`).
- `tests/unit/changelog.test.mjs` — 6 new happy-dom unit tests for `src/sections/changelog.js`: `renderChangelog` success/failure/missing-element paths and `mount`/`unmount` smoke tests.
- `tests/unit/backend.test.mjs` — 7 new unit tests for `backend.js` `getBackendType()`: priority order (localStorage → config → default), all four backend variants, whitespace trimming, and unknown-value fallback.
- `tests/unit/utils-barrel.test.mjs` — 15 structural smoke tests verifying `src/utils/index.js` correctly re-exports symbols from `phone`, `date`, `sanitize`, `misc`, `roles`, and `pagination` sub-modules.
- `tests/unit/in-memory-repositories.test.mjs` — 15 new unit tests for `ExpenseRepository` (`findByCategory`, `totalAmount`, `summaryByCategory`) and `VendorRepository` (`findByCategory`, `findUnpaid`, `totalCost`, `totalPaid`, `outstanding`) using
  an in-memory store stub.

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

- Expanded `scripts/sync-version.mjs` so release sync now updates the Service Worker header, Copilot instructions title, repo sanity version assertions, shared types header, architecture header, and the Sheets version fixture without manual patch
  follow-up.
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
- **Config sheet always complete** — `_WEDDING_INFO_KEYS` canonical list in `sheets-impl.js` guarantees all 14 `weddingInfo` keys are pushed to the Config tab with empty strings for unset fields; `_defaultWeddingInfo` in `main.js` expanded
  accordingly.
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

- **SW update prompt** — `initSW()` in `src/core/ui.js` registers the service worker and detects new deployments via `updatefound`, `UPDATE_AVAILABLE` postMessage, and tab-refocus polling. Shows a dismissible top banner (`showUpdateBanner()`)
  prompting users to refresh; auto-reloads silently if the page has been open ≥ 5 minutes.
- **`showUpdateBanner()` / `applyUpdate()`** — New exports in `src/core/ui.js`; wired in `src/main.js` bootstrap.
- Cache bust: `CACHE_NAME` bumped to `wedding-v3.8.1` in `public/sw.js`.

### Fixed

- **Guest landing page** — Guests now land on the `landing` section (couple names, date, venue) instead of the bare RSVP form. `updateTopBar()` + `updateCountdown()` called at bootstrap so header shows wedding info immediately before any section
  mounts.
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
- **5 new i18n keys** — Added to both `js/i18n/he.json` and `js/i18n/en.json`: `vendor_total_cost`, `vendor_paid`, `vendor_outstanding`, `vendor_payment_rate`, `checkin_checked_in`, `checkin_rate`, `expense_by_category`, `wa_chars_left`,
  `filter_by_status`, `filter_all`.
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
- **`initKeyboardShortcuts()`** — New export in `src/core/nav.js`; registers `Alt+1` through `Alt+9` keyboard shortcuts to jump between sections. Returns a cleanup function. Ignored when focus is in an `INPUT`, `TEXTAREA`, `SELECT`, or
  `contenteditable` element. Called automatically from `src/main.js` bootstrap.
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

- **S3.9 — Offline-to-online sync** — `initOnlineSync()` exported from `src/services/sheets.js`; registers `window "online"` listener that flushes the write queue via `syncSheetsNow()` whenever the browser regains network connectivity. Called in
  `src/main.js` bootstrap. Also registers `"offline"` listener that resets sync status to idle.
- **S4.4 — Prebuild precache auto-injection** — `generate-precache.mjs` now also patches `dist/sw.js` APP_SHELL with the full list of Vite-built assets (excluding `.map` and `sw.js` itself). Added `"postbuild"` npm script so this runs automatically
  after every `npm run build`.
- **S6.4 — nav.js unit tests** — `tests/unit/nav.test.mjs` (20 tests, `happy-dom`): covers `navigateTo`, `activeSection`, `initRouter` (hash parsing, hashchange events), `initSwipe` (directional, short/vertical swipe ignored), and `initPullToRefresh`
  (threshold, callback, CSS class cleanup).
- **S6.7 — Guests section integration tests** — `tests/unit/guests.integration.test.mjs` (20 tests, `happy-dom`): mounts the guests section against real DOM, tests `saveGuest` CRUD (validation, phone normalization, unique IDs, DOM updates),
  `deleteGuest`, `setFilter`, `setSearchQuery`, `setSortField`, `renderGuests` idempotency.
- **S7.9 — A11y toast improvements** — `src/core/ui.js` now uses `role="alert"` + `aria-live="assertive"` for `error`/`warning` toasts; `role="status"` + `aria-live="polite"` for `success`/`info`. `index.html` `#toastContainer` updated to
  `role="region"` + `aria-atomic="false"` + `aria-label="Notifications"`.
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

- **S2.6 IntersectionObserver stat counters** — `initStatCounterObserver()` in `src/sections/dashboard.js` animates `.stat-value` / `.stat-number` elements from 0 to their current value when they scroll into view (600ms ease-out cubic). Disconnects
  on section unmount.
- **S2.8 Pull-to-refresh** — `initPullToRefresh(onRefresh)` in `src/core/nav.js`; CSS body classes `ptr--pulling` / `ptr--refreshing` with animated indicator; wired to `syncSheetsNow()` in `src/main.js` bootstrap.
- **S3.4 Conflict resolution** — `mergeLastWriteWins(local, remote)` exported from `src/services/sheets.js`; last `updatedAt` wins; local-only records are preserved.
- **S3.8 Vendor/Expense/Guest/Table/Settings sync** — replaced no-op `() => Promise.resolve()` callbacks in all data sections with `() => syncStoreKeyToSheets(key)`. Also added `syncStoreKeyToSheets(storeKey)` helper to `sheets.js` that POSTs
  `replaceAll` action to the GAS backend.
- **S4.6 Gallery lazy loading** — gallery thumbnail images already had `loading="lazy"` + `decoding="async"`; lightbox image now also uses `decoding="async"` for off-main-thread decode.
- **A11y skip-to-main link (S7.9)** — first child of `<body>` in `index.html`; keyboard-visible only (offscreen by default, shown on focus); `data-i18n="skip_to_main"`.
- **i18n: new keys** — `rsvp_deadline_soon`, `rsvp_deadline_passed`, `skip_to_main`, `ptr_release_to_refresh`, `ptr_refreshing` in both `he.json` and `en.json`.
- **CSS: `.skip-to-main`** — accessible skip link styles in `components.css`.
- **CSS: pull-to-refresh indicator** — `body.ptr--pulling::before` / `body.ptr--refreshing::before` pseudoelement spinner; `@keyframes spinCW`.
- **Unit tests (S6.2–S6.6)** — 4 new test files: `tests/unit/utils.test.mjs`, `tests/unit/store.test.mjs`, `tests/unit/sheets.test.mjs`, `tests/unit/auth.test.mjs` covering phone/date/sanitize/misc utils, reactive store, sheets sync + conflict
  resolution, and auth session logic.
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
- **Exponential backoff for Sheets writes** — `src/services/sheets.js` `_flush()` now retries failed writes up to `_MAX_RETRIES = 4` times with jittered exponential delay (base `_BACKOFF_BASE_MS = 2000 ms`). Gives up and sets status `"error"` after
  all retries exhausted. Resets to `"idle"` 3 seconds after a successful sync.
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
- **30+ missing i18n keys**: `rsvp_confirmed`, `rsvp_declined`, `language_switched`, `contact_sent`, `error_green_api_config`, `green_api_connected`, `green_api_not_connected`, `error_network`, `analytics_meal_summary_title`, `no_approved_emails`,
  `all_guests_seated`, `count`, `your_table`, `error_invalid_amount`, `chart`, `send_whatsapp`, `other`, `groom_placeholder`, `bride_placeholder`, `wedding_past`, `wedding_today`, `days_until_wedding`, `registry_subtitle`, `registry_empty`,
  `guest_landing_title`, `guest_landing_greeting`, `rsvp_status_label`, `table_tbd` (both `he.json` and `en.json`)
- **`src/templates/registry.html`** — guest-facing registry links template
- **`src/templates/guest-landing.html`** — personalised guest invitation landing template
- **Analytics headcount stats + meal summary**: `renderAnalytics()` now fills `analyticsHeadAdults/Children/Total/Confirmed/Access`, renders sent/unsent donut, and renders catering meal summary

## [3.2.0] — 2026-07-29

### Fixed (Critical Bug Fixes)

- **Modal saves never worked**: All 5 modal HTML files lacked `<form>` tags so `FormData` always returned empty. Rewrote all save handlers in `src/main.js` to read values from DOM element IDs directly (`saveGuest`, `saveTable`, `saveVendor`,
  `saveExpense`, `saveTimelineItem`)
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
- **40+ new i18n keys**: Added `saved`, `syncing`, `synced`, `error_save`, `guest_saved`, `table_saved`, `vendor_saved`, `expense_saved`, `confirm_clear_all`, `auth_welcome`, `auth_signed_out`, `sheets_connected`, `sheets_not_connected`,
  `settings_saved`, and more to both `he.json` and `en.json`
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

- `src/main.js` — registered 11 new data-action handlers: `deleteGuest`, `deleteVendor`, `deleteExpense`, `deleteBudgetEntry`, `checkInGuest`, `checkinSearch`, `importGuestsCSV`, `exportExpensesCSV`, `exportVendorsCSV`, `exportCheckinReport`,
  `resetAllCheckins`, `generateRsvpQrCode`
- `analytics.js` mount now subscribes to `expenses` + `vendors` store changes for budget chart
- Coverage thresholds raised: lines/functions/statements 70→80%, branches 60→70%
- Coverage `include` expanded to `src/**` (previously only `js/**`)
- CI workflow header updated to v3.1.0

### i18n

- Added keys: `guests_imported`, `confirm_delete`, `confirm_reset_checkins`, `export_expenses_csv`,
  `export_vendors_csv`, `export_checkin_report`, `reset_checkins`, `filter_by_category`,
  `budget_progress`, `budget_chart`, `import_guests_csv` (Hebrew and English)

### Tests

- Added 57 new tests in 2 new suites: **v3.1.0 New section exports** + **v3.1.0 src/utils pure functions** — total: **961 tests, 97+ suites**

## [3.0.0] — 2026-07-27

### Breaking: ESM Entry Point Switch (S0.11 + S0.12)

- **S0.11 — Vite entry switched to `src/main.js`**: `index.html` now loads `src/main.js` instead of `js/main.js`. `vite-plugin-legacy-globals.mjs` plugin removed from `vite.config.js`. All `window.*` side-effect registrations eliminated.
- **S0.12 — ESLint simplified**: `varsIgnorePattern` reduced from 70+ prefix list to `^_` only. `js/` directory excluded from ESLint scope (legacy code). `lint:js` now covers `src/**/*.js`, `scripts/`, `vite.config.js`, `eslint.config.mjs`.
  `scripts/` override added for Node globals (`process`, `Buffer`) and `console.log`.
- **S0.11 — `src/main.js` rewrite**: Central bootstrap wires all ~50 `data-action` handlers via `on()` from `src/core/events.js`. Auth guard in `_switchSection` (public sections: rsvp, landing, contact-form, registry, guest-landing). Session rotation
  every 15 min.

### New Modules

- **`src/services/sheets.js`**: Added `syncSheetsNow()`, `sheetsCheckConnection()`, `createMissingSheetTabs()`.
- **`src/core/ui.js`**: Added `cycleTheme()`, `toggleLightMode()`, `toggleMobileNav()`, `restoreTheme()`.
- **`src/sections/settings.js`**: Added `clearAllData()`, `exportJSON()`, `importJSON()`, `copyRsvpLink()`, `copyContactLink()`, `saveWebAppUrl()`, `saveTransportSettings()`, `addApprovedEmail()`, `clearAuditLog()`, `clearErrorLog()`,
  `switchLanguage()`.
- **`src/sections/guests.js`**: Added `exportGuestsCSV()`, `setSideFilter()`, `printGuests()`, `downloadCSVTemplate()`.
- **`src/sections/tables.js`**: Added `printSeatingChart()`, `printPlaceCards()`, `printTableSigns()`, `findTable()`.
- **`src/sections/whatsapp.js`**: Added `sendWhatsAppAll()`, `sendWhatsAppAllViaApi()`, `checkGreenApiConnection()`, `saveGreenApiConfig()`.
- **`src/sections/registry.js`**: Added `addLink()` for registry URL management.

### Documentation

- **S7.5 — ARCHITECTURE.md**: Mermaid dependency graph showing all module relationships and data flow.
- **904 tests** (up from 899) — 5 new S0.11/S0.12 compliance tests verifying entry-point switch, ESLint ignores, and handler registration.

## [2.1.0] — 2026-07-26

### Sprint 3 — Sync & Offline Resilience

- **S3.3 — Optimistic UI**: `_guestPendingSync` Set in `guests.js`; `renderGuests()` marks rows with `data-sync-pending`; amber left-border + reduced opacity CSS in `components.css`; `clearGuestPendingSync()` called by `sheets.js` after successful
  flush.
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
- **src/core/**: `store.js` (storeSubscribe, storeSet, storeGet, initStore), `events.js` (initEvents, on, off),
  `config.js` (app constants), `i18n.js` (t, applyI18n, loadLocale), `state.js` (save/load/remove/clearAll),
  `dom.js` (el Proxy), `ui.js` (showToast, openModal, closeModal), `nav.js` (navigateTo, initRouter, initSwipe).
- **src/services/**: `sheets.js` (enqueueWrite, sheetsPost, sheetsRead), `auth.js` (loginOAuth, loginAnonymous, isApprovedAdmin, maybeRotateSession).
- **src/main.js**: Bootstrap entry skeleton (not yet Vite entry — migration ongoing).
- **Tests**: 33 new tests across 4 `src/` structure suites (837 total).

### Sprint 3–7 (batch 2) — Security, Testing, DevOps, Docs

- **JS: utils.js** — `sanitize(input, schema)` (S4.2): schema-driven validation for string/number/boolean/phone/email/url types; drops script injection patterns; returns `{ value, errors }`.
- **JS: nav.js** — `_initSwipe()` (S2.7): touchstart/touchend-based swipe navigation across the main section list; ignores vertical scroll intent.
- **JS: sheets.js** — `enqueueSheetWrite(key, fn)` (S3.2): last-write-wins debounced write queue
  (1.5 s debounce, coalesces per key); `_mergeGuest()` (S3.4) last-write-wins conflict resolution via
  `updatedAt`; `syncVendorsToSheets()` + `syncExpensesToSheets()` (S3.8); RSVP log append to
  `SHEETS_RSVP_LOG_TAB` (S3.7); pull-to-refresh (S2.8): 80 px touch drag triggers Sheets sync.
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
- **JS: sheets.js** — Polling replaced `setInterval` with `setTimeout` + exponential backoff (30/60/120/300 s) + ±10 % jitter; `updateSyncStatus(state)` drives `.sync-status` indicator; `stopSheetsAutoSync` and visibility handler updated to
  `clearTimeout`.
- **JS: auth.js** — Session rotation every 2 h via `_maybeRotateSession()` + 15-min `setInterval` on admin login; `_SESSION_ROTATION_MS` constant added.
- **GitHub DevOps** — Bug report + feature request issue templates; `config.yml` disables blank issues;
  enhanced PR template with subsection checklists; Dependabot npm weekly; CODEOWNERS expanded with
  security-critical files; CI release workflow now runs `npm run ci` before release +
  `prerelease` flag for beta/alpha tags.
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

Guest-facing landing page (`#sec-landing`), hash router (`js/router.js`, `history.replaceState`),
embedded venue map (Nominatim/OSM iframe), expense budget tracker (`js/expenses.js`, 8 categories),
smart Sheets polling (pause on tab hidden/resume on focus).

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

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.19.0] — 2026-04-13

### Added

- **SRI tooling** (Sprint 4.5) — `scripts/sri-check.mjs` computes SHA-384 integrity
  hashes for all local `js/` and `css/` assets and prints ready-to-paste `integrity=`
  attributes. Adds `npm run sri` script. Added `crossorigin="anonymous"` to the Google
  GIS SDK `<script>` tag (required prerequisite for future SRI pinning; note that the SDK
  itself cannot have a hash because it is not version-pinned by Google).

- **Secrets injection via CI** (Sprint 4.6) — `scripts/inject-config.mjs` reads five
  environment variables (`GH_GOOGLE_CLIENT_ID`, `GH_FB_APP_ID`, `GH_APPLE_SERVICE_ID`,
  `GH_SHEETS_WEBAPP_URL`, `GH_SPREADSHEET_ID`) and patches the corresponding `const`
  declarations in `js/config.js` before the Pages artifact is assembled. Updated
  `deploy.yml` with a new "Inject GitHub Secrets into config" step that calls the script
  with secrets from the repository's Secrets store. Local dev is unaffected — the script
  is a no-op when env vars are absent.

- **Web Push notifications** (Sprint 5.4) — `js/push.js` provides full
  `PushManager.subscribe` / `unsubscribe` flows with VAPID authentication.
  - `initPushNotifications()` restores an existing subscription on load.
  - `subscribePush()` requests `Notification` permission, creates a push subscription
    using `VAPID_PUBLIC_KEY` from `config.js`, and posts the subscription to GAS.
  - `renderPushSettings()` draws the admin-only Enable / Disable button in Settings.
  - `sw.js` gains `push` and `notificationclick` event handlers.
  - `sheets-webapp.gs` gains `_savePushSubscription()` (stores up to ten subscriptions
    in Script Properties) and `_getPushSubscriptions()` (returned via `doGet`).
  - `scripts/send-push.mjs` — Node.js CLI script using the `web-push` devDep to fan out
    a push notification to all stored subscriptions. Intended for manual use or scheduled
    GitHub Actions jobs.
  - `VAPID_PUBLIC_KEY` constant added to `config.js`. Matching private key belongs in GAS
    Script Properties as `VAPID_PRIVATE_KEY`.

- **Bundle size report** (Sprint 6.2) — `scripts/size-report.mjs` walks `js/` and `css/`
  and prints a table of raw + gzip byte sizes with per-file thresholds (JS: 100 KB, CSS:
  30 KB). `--check` flag exits 1 if any file exceeds its limit. `npm run size` script
  added. `ci.yml` gains a `size-report` job that uploads the report as a 30-day artifact
  on every push.

- **Playwright E2E smoke tests** (Sprint 6.3) — `playwright.config.mjs` configures
  Chromium-only testing against a local `serve` static server. `tests/e2e/smoke.spec.mjs`
  contains 9 smoke tests: page load, RTL direction, navigation bar, hash routing, language
  toggle, theme toggle, and no-console-errors-on-load. `npm run test:e2e` script added.
  `ci.yml` gains an `e2e` job (main branch push only) that installs Chromium, runs the
  suite, and uploads the Playwright HTML report as a 7-day artifact.
  New devDependencies: `@playwright/test`, `serve`, `web-push`.

### Changed

- `index.html` — Push notifications card added before Email Notifications card in Settings.
  `push.js` script tag added.
- `js/config.js` — Added `VAPID_PUBLIC_KEY` constant (v1.19.0 header).
- `js/app.js` — `initPushNotifications()` called after `initErrorMonitor()`.
- `js/nav.js` — Settings handler now calls `renderPushSettings()` after
  `renderEmailSettings()`.
- `js/i18n.js` — Push notification keys added to both `he` and `en` locales.
- `sw.js` — Bumped to `wedding-v1.19.0`; `push.js` added to APP_SHELL; `push` and
  `notificationclick` handlers added.
- `eslint.config.mjs` — Push globals declared (`VAPID_PUBLIC_KEY`, `_pushEnabled`,
  `_pushSubscription`, `subscribePush`, `unsubscribePush`, `renderPushSettings`,
  `initPushNotifications`).
- `.github/workflows/ci.yml` — Updated to v1.19.0; `size-report` and `e2e` jobs added.
- `.github/workflows/deploy.yml` — Inject-secrets step added; Node.js setup step added.
- `sheets-webapp.gs` — Version bumped to `1.19.0`; push subscription helpers added.

## [1.18.0] — 2026-04-13

### Added

- **Email notifications** (Sprint 3.6) — `js/email.js` sends RSVP confirmation emails to
  guests (if they provided an email address) and admin alerts on new RSVPs, both via the
  Apps Script `MailApp`. Admin toggle in Settings → Email Notifications card.
  Features: enable/disable master toggle, per-event checkboxes (guest confirmation,
  admin notify). Settings persisted as `wedding_v1_emailSettings`.
- **Apps Script server-side validation** (Sprint 4.1) — `sheets-webapp.gs` now validates
  every Attendees row before writing: firstName required ≤100 chars, phone ≤30 chars, email
  format + ≤254 chars, count 0–200, status/side/meal/group against enums. Returns
  `{ok:false, error:"..."}` on invalid data. Column index constants `COL.*` defined for
  maintainability.
- **Server-side rate limiting** (Sprint 4.2) — `_checkRateLimit()` in `sheets-webapp.gs`
  uses `PropertiesService` to track request counts per UTC minute (key `rl_YYYYMMDDHHMM`).
  Hard limit 30 req/min; returns 429-style error when exceeded. Auto-purges keys older
  than 10 minutes.
- **Config externalization** (Sprint 4.4) — `wedding.json` in project root holds public
  event defaults (couple names, date, venue, etc.). `loadExternalConfig()` in `state.js`
  fetches it asynchronously at startup and merges into `_weddingDefaults`. User-saved
  localStorage settings always take precedence. Silent fallback to hardcoded defaults on
  any error. `wedding.json` added to SW APP_SHELL for offline serving.
- **Lighthouse CI** (Sprint 6.1) — `.lighthouserc.json` configures `@lhci/cli` with
  mobile emulation and warn-level score thresholds (performance ≥0.65, accessibility ≥0.80,
  best-practices ≥0.80, SEO ≥0.70, PWA ≥0.50). New `lighthouse` job in `ci.yml` runs on
  every push to `main`, after lint+test passes, using `lhci autorun` against the static
  dist served locally.

### Changed

- `sheets-webapp.gs` — refactored to use plain `var` declarations (ES3-compatible Apps
  Script runtime); `const` → `var` throughout; `Array.includes` → `indexOf` for compat.
  Version bumped to `1.18.0` in `doGet`.
- `js/app.js` — `loadExternalConfig().then(...)` called early in `init()` to refresh
  wedding details form after external config loads.
- `js/rsvp.js` — calls `sendRsvpConfirmation()` and `sendAdminRsvpNotify()` after every
  successful RSVP submission.
- `js/nav.js` — Settings section now also calls `renderEmailSettings()`.
- `sw.js` — bumped to `wedding-v1.18.0`; added `email.js` + `wedding.json` to APP_SHELL.
- `eslint.config.mjs` — added email.js + state.js globals; `loadExternalConfig` declared.
- `.github/workflows/ci.yml` — comment updated; `lighthouse` job added.

## [1.17.0] — 2025-07-18

### Added

- **Contact collector** (Sprint 3.4) — Shareable public link (`#contact-form`) lets missing
  guests submit their own name, phone, email, and address. Submissions create a guest record
  automatically. Admins copy the collector URL from a new Settings card.
- **Offline RSVP queue** (Sprint 3.8) — When a guest submits an RSVP without internet, the
  payload is queued in `localStorage` and automatically synced when connectivity is restored.
  An animated `#offlineBadge` in the top-bar shows pending count while offline.
- **Audit log** (Sprint 4.3) — Ring-buffer (max 200 entries) records guest add/edit/delete,
  RSVP submissions, contact submissions, and admin login/logout. Viewable in a paginated table
  in Settings. Persisted as `wedding_v1_audit`. UI buttons to export CSV or clear the log.
- **Error monitoring** (Sprint 6.4) — `initErrorMonitor()` hooks `window.onerror` and
  `window.onunhandledrejection`, storing up to 50 session errors. Admin-only Error Log card in
  Settings shows message, file, and line. Session-only (not persisted).
- **PNG PWA icons** (Sprint 6.5) — `icon-192.png` and `icon-512.png` generated via
  `npm run icons` (Node canvas script). Manifest and SW APP_SHELL updated. Passes Chrome
  installability requirements.
- **Performance preloads** (Sprint 6.6) — `<link rel="preload">` for critical CSS and JS;
  `apple-touch-icon`; Apple PWA meta tags added to `<head>`.

### Changed

- `js/guests.js` — `saveGuest` and `deleteGuest` call `logAudit`
- `js/rsvp.js` — `submitRSVP` checks `navigator.onLine` and queues payload offline if needed
- `js/auth.js` — `_oauthLogin` and `signOut` call `logAudit`
- `js/nav.js` — Settings section now renders audit log, error log, contact settings, and offline status
- `js/router.js` — `contact-form` added to `_ROUTER_VALID`
- `js/app.js` — `initOfflineQueue()` and `initErrorMonitor()` called on startup
- `js/state.js` — audit log persisted in `saveAll`/`loadAll`
- `sw.js` — bumped to `wedding-v1.17.0`; added 4 JS files + 2 PNG icons to APP_SHELL
- `eslint.config.mjs` — `^log|^enqueue|^flush|^queue` added to `varsIgnorePattern`;
  `sessionStorage`, `_sheetsWebAppPost` declared as globals

## [1.16.0] — 2025-07-17

### Added

- **Registry links** (Sprint 3.5) — Settings card lets admins add external gift-registry URLs
  (name + URL). All registered links appear as clickable cards on the guest-facing landing page
  (`#landingRegistryList`). Data stored in `_weddingInfo.registries`.
- **Check-in mode + live headcount** (Sprint 5.1 + 5.3) — New admin-only `#sec-checkin` section.
  Real-time stats bar shows arrived / confirmed / total counts plus a progress bar. Admins search
  guests by name or phone and toggle their `arrived` status with a single click. `arrivedAt`
  timestamp is saved per guest. Existing guests are migrated automatically.
- **Table finder** (Sprint 5.2) — Guest-facing search embedded in the landing page. Guest types
  their name or phone; the app looks up their table assignment and displays it inline with a
  colour-coded result card (found / not found / no table assigned).
- **Print materials** (Sprint 5.5) — New `css/print.css` loaded with `media="print"` (zero
  screen impact). `printPlaceCards()` builds a 3-per-row grid of place cards (3.5 × 2 in) and
  calls `window.print()`. `printTableSigns()` builds a 2-per-row grid of table signs (5 × 3 in)
  and calls `window.print()`. Print buttons added to the Settings page.
- **Photo gallery** (Sprint 3.1) — New public `#sec-gallery` section. Admins upload JPEG/PNG/WebP
  photos (max 20 per batch); images are compressed to max 480 px / JPEG 0.82 quality via Canvas
  before storage. Guests view a responsive CSS grid gallery with click-to-lightbox. Photos stored
  as `wedding_v1_gallery` in localStorage.

### Changed

- ESLint `varsIgnorePattern` extended with `^search|^find` prefixes.
- Service Worker cache bumped to `wedding-v1.16.0`; `APP_SHELL` expanded with
  `registry.js`, `checkin.js`, `gallery.js`, `css/print.css`.

## [1.15.0] — 2025-07-16

### Added

- **Guest-facing landing page** (Sprint 2.7) — Non-admin users land on `#sec-landing` instead
  of the RSVP form. Shows couple names (Hebrew + English), wedding date, Hebrew date, venue,
  address, Waze navigation link, and a read-only event timeline. Large RSVP CTA button.
- **Hash router** (Sprint 2.1) — `js/router.js` syncs URL hash with the active section via
  `history.replaceState`. Deep links (`?#guests`, `#budget`, etc.) are restored on page load.
  `initRouter()` is called last in `init()` so auth-determined defaults are not overridden
  unless an explicit hash is present.
- **Embedded venue map** (Sprint 3.2) — `renderVenueMap()` in `js/invitation.js` geocodes the
  venue address via Nominatim (OpenStreetMap) and embeds an OSM iframe with auto-centred marker.
  Falls back to a Google Maps search link when geocoding fails. Loaded lazily on
  `showSection('invitation')`. CSP updated with `nominatim.openstreetmap.org` in `connect-src`
  and `www.openstreetmap.org` in `frame-src`.
- **Expense budget tracker** (Sprint 3.3) — `js/expenses.js` adds a full CRUD expense list to
  the budget section. 8 translated categories (venue, catering, photography, flowers, music,
  transport, clothing, misc). Data persisted as `wedding_v1_expenses` in localStorage. Admin-only
  add/edit/delete; total display visible to all.
- **Smart Sheets polling** (Sprint 3.7) — `startSheetsAutoSync()` now pauses the polling
  interval when the browser tab is hidden (`document.hidden`) and resumes with an immediate
  `_checkSheetsForChanges()` call when the tab becomes visible again. Prevents wasted background
  API calls and catches up immediately on tab focus.

### Changed

- `applyUserLevel()` — non-admin guests now start on `#landing` instead of `#rsvp`.
- `showSection()` — calls `renderVenueMap()` when navigating to invitation; calls
  `renderGuestLanding()` when navigating to landing; calls `_routerPush(name)` to update URL.
- `renderBudget()` — also calls `renderExpenses()` so the expense table refreshes on budget renders.
- SW cache version bumped to `wedding-v1.15.0`; three new JS files added to `APP_SHELL`.

## [1.14.0] — 2025-07-15

### Added

- **Mobile-first bottom navigation** (Sprint 2.3) — Fixed 5-tab bottom bar (dashboard, guests,
  timeline, RSVP, settings) shown on ≤768px via `css/responsive.css`. Syncs active state with
  the top nav. A "More" button (`toggleMobileNav()`) toggles the full top nav on mobile.
  `role="navigation"` and `aria-label` added to both navs.

- **Animated stat counters** (Sprint 2.4) — `animateCounter(el, target)` in `js/dashboard.js`
  uses `requestAnimationFrame` with an ease-out cubic curve (500 ms) for all 10 dashboard stat
  cards.

- **Timeline section** (Sprint 2.5) — New wedding-day schedule section (`#sec-timeline`) with
  full admin CRUD (`js/timeline.js`). Data model `{ id, time, icon, title, description }` sorted
  by time; persisted to `localStorage: wedding_v1_timeline`. Guests see a read-only view; admins
  get add/edit/delete controls. New modal `#timelineModal`.

- **QR Code for RSVP** (Sprint 2.6) — Settings card with a live QR image from
  `api.qrserver.com` (CSP `img-src https:` already covers it). `renderRsvpQr()`,
  `printRsvpQr()` (Blob URL, no `document.write`), `copyRsvpLink()` (Clipboard API).

- **Accessibility improvements** (Sprint 2.8) — Skip link (`.skip-link`) with `id="main-content"`
  target; `role="dialog" aria-modal="true"` on all modals; `aria-live="polite" aria-atomic="true"`
  on toast container; `aria-label` on theme/dark-light icon buttons; focus management in
  `openModal()` (first focusable element) / `closeModal()` (`body.overflow` restored).

### Changed

- `sw.js`: version → `wedding-v1.14.0`; `timeline.js` added to `APP_SHELL`.
- `eslint.config.mjs`: new globals for `timeline.js` + QR + mobile nav + animated counters;
  `varsIgnorePattern` extended with `^copy|^animate`.
- 34 new tests added (325 total, 0 failures).

## [1.13.0] — 2025-07-14

### Added

- **Dark / Light mode toggle** — ☀️/🌙 button in top bar switches between dark and light UI.
  - `body.light-mode` CSS class controls the mode; combined with existing `body.theme-*` class for **10 total theme combinations** (5 colors × 2 modes).
  - `css/variables.css`: `--header-bg` variable; full `body.light-mode` palette block (bg, text, card, border, shadow); per-theme light variants for rose gold, classic gold, emerald, royal blue.
  - `css/layout.css`: `.header` background uses `var(--header-bg)` (was hardcoded).
  - `css/components.css`: `body.light-mode` overrides for top-bar, nav-tabs, countdown items, progress bar, guest table cells, modal overlay, tooltips, analytics stat boxes.
  - `js/ui.js`: `toggleLightMode()` and `_applyThemeClasses()` added; `cycleTheme()` updated to preserve `light-mode` class when cycling colour themes.
  - `js/config.js`: `_isLightMode` state variable.
  - `js/state.js`: `saveAll()` / `loadAll()` persist `_isLightMode`; first-visit default respects `prefers-color-scheme` media query.
  - `js/app.js`: `init()` calls `_applyThemeClasses()` and restores button icon from saved state.
  - `index.html`: `#btnDarkLight` button added to `.top-bar`.
  - `js/i18n.js`: `tip_btn_dark_light` key in both `he` and `en`.
  - `eslint.config.mjs`: `_isLightMode`, `toggleLightMode`, `_applyThemeClasses` declared as cross-file globals.
- **ROADMAP.md**: Sprint 2.2 (Light mode) marked complete with implementation summary; competitor table updated (Dark + light mode → **Y** unique).

## [1.12.0] — 2025-07-13

### Added

- **Analytics section** — new dedicated analytics page (📈 nav tab) wired from the pre-existing `analytics.js` module (SVG-based donut + bar charts).
  - 5 chart cards: RSVP status donut, side distribution bars, meal preference bars, invitation sent/unsent bars, headcount summary grid.
  - 9 new DOM IDs: `analyticsRsvpDonut`, `analyticsSideChart`, `analyticsMealChart`, `analyticsSentChart`, `analyticsHeadAdults`, `analyticsHeadChildren`, `analyticsHeadTotal`, `analyticsHeadConfirmed`, `analyticsHeadAccess`.
  - 7 new CSS classes in `components.css`: `.analytics-row`, `.analytics-card`, `.analytics-headcount-grid`, `.analytics-stat-box`, `.analytics-stat-num`, `.analytics-stat-lbl`, `.analytics-stat-highlight`.
  - 17 new i18n keys (he + en): `nav_analytics`, `tip_nav_analytics`, `stat_maybe`, `stat_guests`, `analytics_title`, `analytics_rsvp_title`, `analytics_side_title`, `analytics_meal_title`, `analytics_sent_title`, `analytics_headcount_title`, `analytics_confirmed_heads`, `analytics_total_guests`, `analytics_adults`, `analytics_children`, `analytics_total_heads`, `analytics_confirmed_count`, `analytics_access_count`.
  - Analytics section is admin-only (added to `adminOnly` array in `nav.js`).
  - `renderAnalytics()` called on section show and on init.
  - 10 new tests (187 total).

## [1.11.0] — 2026-04-14

### Added

- **OAuth re-added** — Google (GIS), Facebook (JS SDK), Apple Sign-In as supplementary login paths alongside email allowlist. All providers call `isApprovedAdmin(email)` — the allowlist remains the single authorization source. `handleGoogleCredential`, `loadFBSDK`, `loginFacebook`, `loadAppleSDK`, `loginApple`, `_oauthLogin` added to `auth.js`. `window.onGoogleLibraryLoad` callback in `app.js`. `FB_APP_ID`, `APPLE_SERVICE_ID` constants in `config.js`. New CSS classes: `.btn-facebook`, `.btn-apple` in `auth.css`.
- New i18n keys: `auth_or_social`, `auth_continue_google`, `auth_continue_fb`, `auth_continue_apple`, `auth_oauth_no_email`, `auth_oauth_not_configured` (both `he`+`en`).
- `npm run lint:fix` and `npm run ci` script aliases in `package.json`.

### Changed

- `eslint.config.mjs`: upgraded `ecmaVersion` to `2025`; added `no-throw-literal`, `no-self-compare`, `no-sequences`, `no-useless-concat`, `no-useless-return`, `no-lone-blocks`, `no-lonely-if` rules; declared `google` readonly global.
- `.vscode/tasks.json`: updated test label to "177 tests"; CI task now runs `npm run ci` directly.
- `.vscode/extensions.json`: added `GitHub.copilot` recommendation.
- `.vscode/settings.json`: removed corrupted duplicate block.
- `.github/workflows/ci.yml`: updated header comment to v1.11.0.
- `copilot-instructions.md` + `CLAUDE.md`: updated to v1.11.0, 177 tests, correct auth table.
- `CHANGELOG.md`: collapsed v1.3.0–v1.7.0 to one-liners.

## [1.10.0] — 2026-04-13

### Added

- **Dashboard donut charts** — three Canvas-based donut charts directly on the Dashboard:
  - *RSVP Status*: confirmed / pending / maybe / declined (by head count)
  - *Meal Preferences*: regular / vegetarian / vegan / kosher / gluten-free / other (by record)
  - *Sides Distribution*: groom / bride / mutual (by head count)
- `renderCharts()` in `dashboard.js` — called automatically from `renderStats()` on every data change.
- `_drawDonut(canvas, segments, centerLabel)` — pure Canvas 2D helper; HiDPI-aware via `devicePixelRatio`; empty state shows dashed ring.
- `_buildLegend(legendEl, segments)` — DOM-based color-dot legend (no `innerHTML`).
- New CSS classes in `components.css`: `.charts-row`, `.chart-wrap`, `.chart-label`, `.chart-legend`, `.chart-legend-item`, `.chart-legend-dot`.
- Responsive: charts stack naturally on 480 px mobile via `flex-wrap`.
- 8 new tests (185 total).
- New i18n keys: `charts_title`, `chart_rsvp_title`, `chart_meal_title`, `chart_side_title`, `chart_total`, `chart_guests` (both `he` + `en`).

## [1.9.0] — 2026-04-13

### Security

- **Login brute-force protection** — 5 failed attempts triggers a 5-minute lockout
  tracked in `localStorage` (`loginFail` key). New helpers: `_loginAttemptOk()`,
  `_recordLoginFailure()`, `_clearLoginFailures()`.
- **Admin session expiry** — sessions automatically expire after 8 hours of inactivity
  (`_SESSION_TTL_MS`). `expiresAt` timestamp stored with the session; on load, expired
  sessions are silently cleared and the user falls back to guest mode.
- **CSV injection guard** — `exportGuestsCSV` now applies a `csvCell()` helper that
  prefixes formula-injection characters (`=`, `+`, `-`, `@`, TAB, CR) with a tab so
  spreadsheet apps do not execute them as formulas.
- **Server-side mutation guards** — `saveGuest`, `deleteGuest`, `saveTable`, `deleteTable`,
  `updateWeddingDetails`, `importJSON`, `clearAllData` all now verify `_authUser.isAdmin`
  before executing, preventing console-based privilege escalation.
- **Guest field length-clamping** — `saveGuest` now passes every text field through
  `sanitizeInput()` with appropriate per-field limits instead of raw `.trim()`.
- **New i18n key** — `auth_login_locked` in both `he` and `en`.

## [1.8.0] — 2026-04-13

### Changed

- **Auth completely simplified** — removed Google/Facebook/Apple OAuth flows entirely.
  App now starts as guest automatically (no blocking login screen).
- **Email-allowlist sign-in**: pressing 🔑 opens a modal where you type your email.
  If it matches `ADMIN_EMAILS` (hardcoded: `yair.rajwan@gmail.com`) or the dynamic
  approved-email list in Settings → you get full manager access instantly.
- Any manager can add/remove approved emails in **Settings → User Access**.
- Removed: Google Client ID / FB App ID / Apple Service ID provider-config UI from Settings.
- Removed: Google GIS `onGoogleLibraryLoad` callback in `app.js` (GIS SDK still loaded for optional Sheets OAuth token path).
- `sheets.js` `initSheetsTokenClient` now reads `GOOGLE_CLIENT_ID` directly (no runtime override needed).
- i18n updated: new `auth_admin_login_sub`, `auth_sign_in_btn`, `auth_back_guest`, `auth_email_not_approved` keys; removed OAuth-only keys.
- Auth overlay redesigned: email input + "Sign In as Manager" button + "Continue as Guest" fallback.
- Added `.auth-email-input` CSS class for the styled email field.
- 163/163 tests pass.

## [1.7.0] — 2025-08-01

CSP meta tag, framebusting guard, `sanitizeInput`/`isValidHttpsUrl` utilities, RSVP rate-limiting (90 s), JSON import scrubbing, `renderInvitation` data-URI guard, 9 security tests (163 total).

## [1.6.0] — 2026-04-13

Google Sheets backend: gviz public read, Apps Script Web App writes, `Config` tab for wedding info, 30 s auto-sync, `createMissingSheetTabs()`, runtime Web App URL in Settings.

## [1.5.0] — 2026-04-14

Multi-provider OAuth: Google GIS, Facebook JS SDK, Apple Sign-In — all dynamically loaded; Settings UI for credentials + approved-email management; `isApprovedAdmin()`, `loadFBSDK()`, `loadAppleSDK()`.

## [1.4.0] — 2026-04-13

**Budget & Gift Tracker** (`budget.js`): gift totals, progress bar, inline per-guest gift input, `parseGiftAmount()`, `saveBudgetTarget()`, 9 new tests.

## [1.3.0] — 2026-04-13

Seating chart PDF export (`printSeatingChart()`): print-ready popup, table grid with meal icons, zero dependencies.

## [1.2.0] — 2026-04-13

### Added

- Modular architecture: `index.html` shell + `css/` (6 files) + `js/` (17 files) — no build step
- Anonymous guest mode: users auto-enter without login; admins sign in via Google
- Service Worker: stale-while-revalidate cache + 5-minute background update polling + "New version" banner
- Real Facebook auth: `FB.login()` → `/me` API; graceful degradation when SDK not loaded
- Real Apple auth: `AppleID.auth.signIn()` → JWT decode for email; silent popup-closed handling
- `FB_APP_ID` + `APPLE_SERVICE_ID` constants in `js/config.js` with setup comments
- `auth_error` i18n key (he + en) for failed sign-in toast
- ESLint globals for `FB`, `AppleID`, `FB_APP_ID`, `APPLE_SERVICE_ID`
- `.vscode/tasks.json` — one-click Lint: All, Lint: JS, Lint: CSS, Test, CI: Lint+Test
- CI: combined lint+test matrix job on Node 22 and 24; security scan covers `js/*.js` + `index.html`

### Changed

- CI jobs merged from 3 (lint · unit-tests · security-scan) to 2 (lint-and-test matrix · security-scan)
- CI Node matrix updated from `["20","22"]` to `["22","24"]` (LTS + current LTS)
- `README.md`: version badge v1.1.0 → v1.2.0; project structure updated to reflect modular layout; auth setup section added
- `CLAUDE.md`: rewritten to reflect modular file structure, updated lint commands, auth setup notes
- `.github/copilot-instructions.md`: deduplicated; single Quick Facts table, no stale single-file references
- `.vscode/settings.json`: added `chat.instructionFilesLocations`, `chat.promptFilesLocations`, `eslint.useFlatConfig`, `stylelint.configFile`, `nodejs-testing.include`; codeActionsOnSave for ESLint/Stylelint/markdownlint

## [1.1.0] — 2026-04-13

Enhanced guest model, emoji/tooltip system, Google/guest auth, Google Sheets sync, 0-warning lint baseline, architecture diagram, CLAUDE.md, CI and Copilot config improvements.

## [1.0.0] — 2026-04-13

Initial release: dashboard, guest management, table seating, SVG invitation, WhatsApp bulk send, RSVP, CSV export, Hebrew RTL + English i18n, 5 themes, PWA (offline SW), glassmorphism design, print stylesheet, 125 unit tests, GitHub Actions CI/CD.

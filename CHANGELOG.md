# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

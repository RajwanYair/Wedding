# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.7.0] — 2025-08-01

### Security

- Added comprehensive Content-Security-Policy meta tag (restricts `script-src`, `connect-src`, `img-src`, `frame-src`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`)
- Added JavaScript framebusting guard (`window.top !== window.self`) for clickjacking protection in browsers that ignore CSP `frame-ancestors` in meta tags
- Added `Referrer-Policy: strict-origin-when-cross-origin` meta tag
- Fixed three `rel="noopener"` links to include `noreferrer`
- Added `sanitizeInput(str, maxLen)` utility — trims + length-clamps all free-text user inputs
- Added `isValidHttpsUrl(url)` utility — rejects non-HTTPS and malformed URLs at system boundaries
- RSVP rate-limiting: 90-second cooldown per browser for non-admin users (stored as `wedding_v1_lastRsvp`)
- Validated `wazeLink` as a valid HTTPS URL before saving in `updateWeddingDetails()`; shows `toast_invalid_url` on rejection
- Applied `sanitizeInput()` to all wedding-info fields (groom, bride, venue, address, etc.) and all RSVP text inputs
- JSON import now scrubs and validates guest schema (known keys only, bounded lengths, allowlisted enum values) to prevent prototype pollution
- `renderInvitation()` now rejects `_invitationDataUrl` values that do not start with `data:image/`
- 9 new security tests added (163 total)

## [1.6.0] — 2026-04-13

### Added

- Google Sheet as primary backend database — public read via `gviz/tq` endpoint (no auth required)
- Apps Script Web App for writes — `replaceAll` + `append` + `ensureSheets` actions
- `Config` sheet tab for wedding info (key-value pairs: groom, bride, date, venue, etc.)
- `loadFromSheetsOnInit()` — loads all three tabs on startup, overwrites localStorage
- `startSheetsAutoSync()` — polls every 30 s for remote changes via fingerprint comparison
- `syncConfigToSheets()` — syncs wedding info to the Config tab on every save
- `saveWebAppUrl()` / `renderSheetsSettings()` — runtime Apps Script URL config in Settings
- `createMissingSheetTabs()` — button to create Attendees / Tables / Config tabs via Apps Script
- Sheets settings card redesign: Web App URL input, status badge (read-only vs read+write), direct link to spreadsheet
- `SHEETS_CONFIG_TAB = "Config"`, `SHEETS_SYNC_INTERVAL_MS = 30000` in config

### Changed

- `syncGuestsToSheets` / `syncTablesToSheets` now use Apps Script Web App (no-cors POST); OAuth v4 kept as optional fallback
- Settings nav tab now also calls `renderSheetsSettings()` on open
- `updateWeddingDetails()` now calls `syncConfigToSheets()` after saving

## [1.5.0] — 2026-04-14

### Added

- Full multi-provider auth support: Google (GIS), Facebook (JS SDK), Apple Sign-In — all SDKs loaded dynamically at runtime
- User Access Management UI in Settings: approve additional admin emails, configure provider credentials (Client ID / App ID / Service ID) without redeploying
- `isApprovedAdmin()` — checks both hardcoded `ADMIN_EMAILS` and runtime-approved list from localStorage
- `addApprovedEmail()` / `removeApprovedEmail()` — manage runtime admin list
- `saveProviderConfig()` / `renderUserManager()` — Settings card to configure SDKs and approved users
- `loadAuthConfig()` / `saveAuthConfig()` — persist auth config under `wedding_v1_authConfig`
- `loadFBSDK()` / `loadAppleSDK()` — dynamic SDK injection (no hard-wired `<script>` tags needed)
- Setup hint rendered in Google button area when no Client ID is configured
- Root admin `yair.rajwan@gmail.com` has full access (hardcoded, cannot be removed)

### Changed

- `initGoogleSignIn()` now uses runtime Client ID from Settings, not hardcoded placeholder
- `initAuth()` loads auth config and re-evaluates `isAdmin` against current approved list on every startup
- Facebook and Apple login use runtime App ID / Service ID respectively

## [1.4.0] — 2026-04-13

### Added

- **Budget & Gift Tracker** (`js/budget.js`): new admin-only section 🎁 to track per-guest gifts and total event budget
  - Summary stats: gifts received, total ₪ amount, pending guests, expected budget, % of target
  - Progress bar renders when a budget target is set
  - Inline gift input per guest (throttled 600ms save) — leverages existing `gift` field on the Guest model
  - Guests sorted by received-first then alphabetically; side icons (🤵👰🤝) and attendance multiplier shown
  - `parseGiftAmount()` parses numeric gift strings (with ₪/NIS/commas) for totals; descriptions treated as non-monetary
  - `saveBudgetTarget()` persists `_weddingInfo.giftBudget` via `saveAll()`
- `budget` route added to admin-only nav guard in `nav.js`
- `giftBudget: 0` default added to `_weddingDefaults` in `config.js`
- Budget section i18n keys (he + en): `nav_budget`, `budget_title`, `budget_target_label`, `budget_save`, `budget_stat_*`, `budget_gift_placeholder`, `budget_empty`, `toast_budget_saved`, `tip_nav_budget`, `col_gift_status`, `col_gift`, `col_amount`
- 9 new tests in *Budget & Gift Tracker* suite

## [1.3.0] — 2026-04-13

### Added

- Seating Chart PDF export (`printSeatingChart()`): opens a print-ready window with wedding header, table grid (guest names, meal icons, occupancy), unassigned guests section; auto-triggers `window.print()` for PDF save — zero dependencies (Blob URL API)
- `action_print_seating`, `seating_chart_title`, `toast_popup_blocked`, `tip_print_seating` i18n keys (he + en)
- "Export Seating Chart" 🖨️ button in Tables section header
- 2 new tests: `printSeatingChart` function presence, Blob URL export pattern

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

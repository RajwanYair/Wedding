# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

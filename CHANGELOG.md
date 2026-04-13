# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] — 2026-04-13

### Added

- Enhanced guest model: `firstName`, `lastName`, `side` (groom/bride/mutual), `meal` (5 types), `children`, `accessibility`, `email`, `relationship`, `gift`, `mealNotes`
- Default invitation background image (`invitation.jpg`)
- Full emoji/icon system across stat cards, status badges, sections, empty states, table cards, countdown, and WhatsApp list
- Hover tooltip system: 41 pure-CSS `[data-tooltip]` nodes, RTL-aware, bilingual he/en via `data-i18n-tooltip`
- Zero-warning linting: ESLint (`ecmaVersion:latest`), Stylelint (`stylelint-config-standard`), HTMLHint, markdownlint-cli2 — all `--max-warnings 0`
- `npm run lint` / `lint:*` scripts in `package.json`; `engines.node >= 20`
- `.markdownlint-cli2.jsonc` to exclude `node_modules`
- Architecture diagram (`architecture.svg`)
- `CLAUDE.md` project config for Claude AI integration

### Changed

- CI workflow: `actions@v4`, `npm ci` with cache, all lint steps via `npm run lint:*`
- Copilot agents: added `multi_replace_string_in_file`, `file_search`, `manage_todo_list`; prompts switched to `mode: agent`
- `workspace.instructions.md`: removed `applyTo: "**"` — now on-demand only (token optimization)
- `wedding.instructions.md`: replaced duplicated rules with implementation patterns (section/modal/JS cheatsheet)
- `cicd.instructions.md`: fixed action versions to `@v4`, added lint standards

### Fixed

- `let existing` → `const existing` (ESLint `prefer-const`)
- Font family keywords lowercased (`Tahoma→tahoma`, `Arial→arial`, `Georgia→georgia`) for `value-keyword-case`

## [1.0.0] — 2026-04-13

### Added

- Initial release
- Dashboard with stats, countdown, progress bars, quick actions
- Guest management: CRUD, search, filter by status, group tags
- Table seating: visual floor plan, round/rect shapes, drag-and-drop
- Wedding invitation: auto-generated SVG + custom image upload (JPG/PNG/SVG)
- WhatsApp integration: message templates with placeholders, bulk/individual send
- RSVP: public-facing form with auto-match to existing guests
- CSV export with UTF-8 BOM for Hebrew
- Full i18n: Hebrew (RTL) and English (LTR) with toggle
- 5 elegant themes: purple, rose gold, gold, emerald, royal blue
- PWA: installable, offline-capable via Service Worker
- Glassmorphism card design with particles animation
- Responsive design: 768px and 480px breakpoints
- Print-friendly stylesheet
- Test suite (Node.js built-in test runner)
- GitHub Actions: CI, deploy to Pages, auto-release
- Copilot integration: instructions, agents, prompts, modes

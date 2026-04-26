<div align="center">

# 💍 Wedding Manager

[![Version](https://img.shields.io/badge/version-v11.10.0-d4a574?style=flat-square)](https://github.com/RajwanYair/Wedding/releases)
[![CI](https://github.com/RajwanYair/Wedding/actions/workflows/ci.yml/badge.svg)](https://github.com/RajwanYair/Wedding/actions/workflows/ci.yml)
[![Deploy](https://github.com/RajwanYair/Wedding/actions/workflows/deploy.yml/badge.svg)](https://github.com/RajwanYair/Wedding/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/badge/tests-2385_passing-brightgreen?style=flat-square)](https://github.com/RajwanYair/Wedding/actions)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Modular](https://img.shields.io/badge/Modular-50%2B_JS_%2B_7_CSS-E34F26?style=flat-square&logo=html5&logoColor=white)](docs/README.md)
[![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)
[![Hebrew](https://img.shields.io/badge/שפה-עברית_RTL-60a5fa?style=flat-square)](src/i18n/he.json)
[![Bundle](https://img.shields.io/badge/bundle-%E2%89%A460KB_gzip-1abc9c?style=flat-square)](.github/workflows/ci.yml)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-CI_gated-6c5ce7?style=flat-square&logo=lighthouse&logoColor=white)](.github/workflows/lighthouse.yml)
[![CodeQL](https://github.com/RajwanYair/Wedding/actions/workflows/codeql.yml/badge.svg)](https://github.com/RajwanYair/Wedding/actions/workflows/codeql.yml)
[![Scorecard](https://github.com/RajwanYair/Wedding/actions/workflows/scorecard.yml/badge.svg)](https://github.com/RajwanYair/Wedding/actions/workflows/scorecard.yml)
[![SBOM](https://github.com/RajwanYair/Wedding/actions/workflows/sbom.yml/badge.svg)](https://github.com/RajwanYair/Wedding/actions/workflows/sbom.yml)
[![Trivy](https://github.com/RajwanYair/Wedding/actions/workflows/trivy.yml/badge.svg)](https://github.com/RajwanYair/Wedding/actions/workflows/trivy.yml)
[![ADRs](https://img.shields.io/badge/ADRs-22-7f5af0?style=flat-square)](docs/adr/README.md)
[![Audits](https://img.shields.io/badge/audits-dead%20%C2%B7%20actions%20%C2%B7%20types-1abc9c?style=flat-square)](.github/workflows/ci.yml)

**Wedding management app for RSVP, guest lists, table seating, WhatsApp outreach, and event-day operations.**
**Vite 8, vanilla JS/CSS, Hebrew RTL first, minimal runtime dependencies (3).**

Node 22+ is the supported local and CI runtime.

</div>

---

## Features

![Features](docs/features-grid.svg)

## RSVP Journey

![RSVP Flow](docs/rsvp-flow.svg)

## Quick Start

```bash
git clone https://github.com/RajwanYair/Wedding.git
cd Wedding

# Install dependencies (shared tooling lives at ../MyScripts/node_modules/)
# If you cloned into the recommended parent workspace:
npm install --prefix ../MyScripts  # one-time shared tooling
npm install                         # project devDependencies

# — OR — install standalone (CI / first-time setup):
npm ci

# Start local development
npm run dev
```

## Development

```bash
npm run lint          # HTML + CSS + JS + Markdown — 0 errors, 0 warnings
npm run format:check  # Prettier formatting check (add to pre-commit hook)
npm test              # 2385+ Vitest unit tests
npm run build         # Vite production bundle → dist/
```

## Overview

```text
index.html        HTML shell
css/              layered stylesheets
src/main.js       bootstrap entry
src/core/         app primitives: store, nav, events, i18n, ui
src/sections/     feature modules with mount/unmount lifecycle
src/services/     auth, sheets, backend, presence, supabase
src/templates/    lazy-loaded section markup
src/modals/       lazy-loaded modal markup
tests/            Vitest + Playwright coverage
```

## Production Notes

- Runtime entry is `src/main.js`; feature UIs mount from `src/sections/` and lazy templates/modals under `src/templates/` and `src/modals/`
- User-facing strings are localized through `src/i18n/`; Hebrew is the default UI, English is the supported alternate UI toggle
- Data persists locally and can sync through the configured backend path; service worker assets live under `public/`
- CI expects `npm run lint`, `npm test`, and `npm run build` to stay green

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md): runtime structure, module boundaries, data flow
- [CONTRIBUTING.md](CONTRIBUTING.md): contributor workflow, testing rules, review checklist
- [CHANGELOG.md](CHANGELOG.md): release history and shipped changes
- [ROADMAP.md](ROADMAP.md): active production roadmap and upcoming priorities

Detailed runtime and data-model notes intentionally live outside the README so this file stays public-facing and production-relevant.

## Themes

| Name | CSS class | Primary color |
|------|-----------|---------------|
| Default | (none) | Purple `#8b5cf6` |
| Rose Gold | `theme-rosegold` | `#d4a574` |
| Gold | `theme-gold` | `#f59e0b` |
| Emerald | `theme-emerald` | `#10b981` |
| Royal Blue | `theme-royal` | `#3b82f6` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Run from parent `MyScripts/` dir — deps are shared via `../MyScripts/node_modules/` |
| Lint errors after pull | `rm -rf node_modules/.cache` then re-run `npm run lint` |
| Tests show `pool deprecated` | Suppressed via `pool: "forks"` + `--no-warnings` — should not appear |
| SW not updating | Bump `CACHE_NAME` in `public/sw.js` to match the new version |
| OAuth redirect fails | Verify `GOOGLE_CLIENT_ID` / `FB_APP_ID` / `APPLE_SERVICE_ID` in `src/core/config.js` |
| Hebrew text reversed | Ensure `dir="rtl"` and `lang="he"` on `<html>` element |
| Vite build OOM | Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |

## License

MIT © [RajwanYair](https://github.com/RajwanYair)

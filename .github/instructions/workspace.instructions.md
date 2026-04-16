---
description: "Use when: exploring the Wedding workspace file structure, available agents, prompts, or project resources."
---

# Workspace — Wedding Manager v4.7.0

## Available Resources

| Type | Available |
| --- | --- |
| Agents | `@wedding-designer` — CSS/UI/themes; `@guest-manager` — data/RSVP/tables |
| Prompts | `/add-feature` — scaffold new section; `/code-review` — full audit |
| Instructions | `wedding` (*.html) — HTML patterns; `cicd` (*.yml) — CI/CD standards |
| MCP | `filesystem` — scoped project read/write; `fetch` — test endpoints |

## Sprint Summary (completed)

| Sprint | What shipped |
| --- | --- |
| S0–1 | HTML shell, lazy templates/modals, ESM nav, Proxy store, section extractions |
| S2 | Swipe gestures, pull-to-refresh, offline queue, keyboard shortcuts |
| S3 | Google Sheets sync (`enqueueWrite`/`syncStoreKeyToSheets`), RSVP_Log tab, online resume |
| S4 | Vite 8 build, SW update banner (`initSW`), coverage gate, Lighthouse CI, SRI |
| S5 | Auth overlay, Facebook + Apple OAuth, anonymous guest mode, email allowlist |
| S6 | Visual regression, coverage CI gate, analytics SVG, a11y live regions |
| S7 | Docs (GUIDE, ARCHITECTURE, CONTRIBUTING), copilot instructions, Supabase backend |
| S8 | Analytics heatmap, funnel, vendor timeline, PDF/CSV export, delivery rate |
| S9–10 | Multi-event namespace, event switcher, live sync polling, presence indicator (v4.0.0) |
| S11–12 | Per-guest RSVP links, transport manifest, WhatsApp reminders, duplicate detection, QR check-in (v4.1.0) |
| S13–14 | Countdown, plus-one names, thank-you messages, seating map, multi-filter, budget widget (v4.2.0) |
| S15–16 | Undo stack, shortcuts overlay, auto-backup, check-in sound, smart table assign (v4.3.0) |
| S17–18 | Full-text search, bulk meal, expense donut, sync queue monitor, arrival forecast (v4.4.0) |
| S19–20 | Vendor quick-dial, VIP flag, guest badges print, timeline print, accessibility filter (v4.5.0) |
| S21–22 | Changelog section, Supabase presence, conflict modal, `src/` ESM entry, 18 modules (v4.6.0) |
| S23–24 | Background sync, budget alerts, bulk ops, gallery lightbox, timeline done sync, top-bar sync btn (v4.7.0) |

## Detailed File Structure

```text
Wedding/
├── index.html            # HTML shell (~425 lines — links CSS + JS; sections lazy-loaded)
├── css/                  # 7 CSS modules
│   ├── variables.css     # CSS custom properties + 5 theme overrides + color-scheme
│   ├── base.css           # Reset, body, scrollbar, particles
│   ├── layout.css         # Header, top-bar, nav, main content, animations
│   ├── components.css     # Cards, stats, buttons, forms, modals, toasts, badges, tooltips
│   ├── responsive.css     # Media queries, prefers-reduced-motion
│   ├── auth.css           # Auth overlay, user bar
│   └── print.css          # Print styles
├── js/                   # 38 JS modules (Legacy Vite entry — active build)
│   ├── main.js            # ES module entry point (Vite entry)
│   ├── store.js           # Proxy-based reactive store
│   ├── events.js          # data-action event delegation hub
│   ├── config.js          # Constants, state vars, auth/sheets config, @typedef
│   ├── i18n.he.js         # Hebrew translations (eager)
│   ├── i18n.en.js         # English translations (lazy-loaded)
│   ├── i18n.js            # i18n engine (t(), applyLanguage())
│   ├── dom.js             # Lazy Proxy DOM cache (el.xxx → getElementById on demand)
│   ├── state.js           # Persistence (save/load/saveAll/loadAll, migration)
│   ├── utils.js           # uid, escapeHtml, cleanPhone, formatDateHebrew
│   ├── ui.js              # theme, modal, toast utilities
│   ├── nav.js             # Async section navigation (lazy template loading)
│   ├── dashboard.js       # Stats, countdown, RSVP deadline banner
│   ├── guests.js          # Guest CRUD, filter, sort, search, duplicate detection
│   ├── tables.js          # Table CRUD, drag-drop seating, auto-assign
│   ├── analytics.js       # SVG donut + bar charts, meal summary for caterer
│   ├── vendors.js         # Vendor CRUD with payment tracking
│   ├── invitation.js      # Invitation rendering (SVG + image upload)
│   ├── whatsapp.js        # WhatsApp template + Green API send
│   ├── rsvp.js            # Public RSVP form (phone-first lookup)
│   ├── settings.js        # Wedding details, export/import, CSV, RSVP deadline
│   ├── sheets.js          # Google Sheets API sync
│   ├── auth.js            # Google/Facebook/Apple/Guest OAuth auth
│   └── app.js             # init() entry + (timeline, gallery, checkin, registry,
│                           #   expenses, budget, contact-collector, offline-queue,
│                           #   audit, error-monitor, email, push, router, guest-landing)
├── src/                  # ESM v3 modules (active Vite entry — src/main.js is entry point)
│   ├── main.js            # Future entry — imports all 18 section modules
│   ├── core/              # Pure ESM equivalents of js/ core modules
│   │   ├── store.js       # Reactive store
│   │   ├── events.js      # Event delegation
│   │   ├── i18n.js        # i18n engine
│   │   ├── nav.js         # Navigation
│   │   ├── state.js       # Persistence
│   │   ├── ui.js          # Toast + modal
│   │   ├── dom.js         # DOM helpers
│   │   ├── config.js      # Config/constants
│   │   └── template-loader.js  # Lazy HTML template injector (S1.4)
│   ├── services/
│   │   ├── auth.js        # OAuth auth service
│   │   └── sheets.js      # Google Sheets service
│   ├── utils/
│   │   ├── index.js       # Barrel exports
│   │   ├── date.js        # Date formatting + Jerusalem timezone
│   │   ├── phone.js       # cleanPhone() + Israeli number normalization
│   │   ├── sanitize.js    # sanitize(input, schema) — S4.2
│   │   └── misc.js        # uid(), escapeHtml()
│   ├── sections/          # 18 ESM section modules with mount/unmount lifecycle
│   │   ├── dashboard.js, guests.js, tables.js, settings.js
│   │   ├── vendors.js, expenses.js, budget.js, analytics.js
│   │   ├── rsvp.js, checkin.js, gallery.js, timeline.js
│   │   ├── invitation.js, whatsapp.js, landing.js
│   │   ├── contact-collector.js, registry.js, guest-landing.js
│   │   └── index.js       # Barrel export (export * as xxxSection from ...)
│   ├── templates/         # 15 section HTML files (lazy-loaded by nav.js)
│   │   ├── dashboard.html, guests.html, tables.html, settings.html
│   │   ├── vendors.html, budget.html, analytics.html, timeline.html
│   │   ├── rsvp.html, checkin.html, gallery.html, invitation.html
│   │   ├── whatsapp.html, landing.html, contact-form.html
│   └── modals/            # 6 modal HTML files (lazy-loaded on first open)
│       ├── guestModal.html, tableModal.html, vendorModal.html
│       ├── galleryLightbox.html, expenseModal.html, timelineModal.html
├── public/
│   ├── sw.js              # ServiceWorker (offline cache, push notifications)
│   ├── manifest.json      # PWA manifest
│   └── icons/             # Generated PWA icons
├── scripts/              # sri-check, inject-config, size-report, send-push, generate-icons
├── tests/
│   ├── wedding.test.mjs   # 1776+ unit tests (17 suites, Vitest)
│   └── e2e/smoke.spec.mjs # Playwright smoke tests
├── .github/
│   ├── copilot-instructions.md   # master project spec (always loaded by Copilot)
│   ├── AGENTS.md                 # agent/prompt discovery index
│   ├── CODEOWNERS
│   ├── agents/                   # guest-manager.agent.md, wedding-designer.agent.md
│   ├── instructions/             # wedding.instructions.md, cicd.instructions.md, workspace.instructions.md
│   ├── prompts/                  # add-feature.prompt.md, code-review.prompt.md
│   ├── workflows/                # ci.yml, deploy.yml, release.yml
│   └── copilot/config.json
├── .vscode/
│   ├── settings.json    # ESLint/Stylelint/markdownlint, Copilot, test explorer
│   ├── extensions.json  # Recommended extensions
│   ├── tasks.json       # Lint, test, CI, E2E tasks
│   └── mcp.json         # MCP server config (filesystem + fetch)
├── eslint.config.mjs     # JS lint — flat config, ecmaVersion: 2025
├── .stylelintrc.json     # CSS lint — extends stylelint-config-standard
├── .htmlhintrc           # HTML lint
├── .markdownlint.json    # Markdown lint rules
├── vite.config.js        # Vite 8 build config (chunk-public + per-template chunks)
└── CLAUDE.md             # Minimal context for Claude/AI agents
```

## Template Lazy Loading — How It Works

1. `index.html` has section wrappers with `data-template="xxx"` and empty `<div class="section-skeleton">`.
2. `js/nav.js showSection()` checks `sec.dataset.template && sec.dataset.loaded !== "1"`.
3. If not loaded: fetches `./src/templates/${name}.html`, injects innerHTML, calls `refreshDomCache()`, sets `data-loaded="1"`.
4. Then `_renderSection(name)` fires `window.renderXxx()` as usual.
5. Modal lazy loading: `ensureModalLoaded(id)` fetches `./src/modals/${id}.html` on first open.

## Dependency Model

All `devDependencies` resolve from `../MyScripts/node_modules/` (parent shared install).
Local `package.json` keeps `devDependencies` listed for CI (`npm ci`), but **no local `node_modules/`**.
Run `npm install` from `../MyScripts` to provision once.

## What NOT To Do

- No runtime npm/build tools (devDeps for linting only)
- No external CSS/JS libraries or CDNs
- No hardcoded colors — CSS custom properties only
- No `innerHTML` with unsanitized data
- No visible text without `data-i18n` / `t()`
- Never `npx vitest run` — use `npm test` (avoids DEPRECATED cache warning)

## Session Commit Rule

After every Copilot chat session or sprint: `git add -A && git commit -m "<type>: <summary>" && git push`
Tags for releases: `git tag vX.Y.Z && git push --tags`

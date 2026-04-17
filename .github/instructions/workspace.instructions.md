---
description: "Use when: exploring the Wedding workspace file structure, available agents, prompts, or project resources."
---

# Workspace — Wedding Manager v7.9.0

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
├── src/                  # Active ESM source (Vite entry: src/main.js)
│   ├── main.js            # Entry point — imports all section modules
│   ├── core/              # Core infrastructure modules
│   │   ├── store.js       # Reactive store
│   │   ├── events.js      # Event delegation
│   │   ├── i18n.js        # i18n engine
│   │   ├── nav.js         # Navigation
│   │   ├── state.js       # Persistence
│   │   ├── ui.js          # Toast + modal
│   │   ├── dom.js         # DOM helpers
│   │   ├── config.js      # Config/constants
│   │   └── template-loader.js  # Lazy HTML template injector
│   ├── services/
│   │   ├── auth.js        # OAuth auth service
│   │   ├── sheets.js      # Google Sheets sync (enqueueWrite API)
│   │   ├── sheets-impl.js # Sheets implementation
│   │   ├── backend.js     # Supabase backend + offline queue
│   │   ├── presence.js    # Real-time presence
│   │   └── supabase.js    # Supabase client
│   ├── utils/
│   │   ├── date.js        # Date formatting + Jerusalem timezone
│   │   ├── phone.js       # cleanPhone() + Israeli number normalization
│   │   ├── sanitize.js    # sanitize(input, schema)
│   │   └── misc.js        # uid(), guestFullName(), parseGiftAmount(), isValidHttpsUrl()
│   ├── sections/          # 18 ESM section modules with mount/unmount lifecycle
│   │   ├── dashboard.js, guests.js, tables.js, settings.js
│   │   ├── vendors.js, expenses.js, budget.js, analytics.js
│   │   ├── rsvp.js, checkin.js, gallery.js, timeline.js
│   │   ├── invitation.js, whatsapp.js, landing.js
│   │   ├── contact-collector.js, registry.js, guest-landing.js
│   │   └── index.js       # Barrel export
│   ├── templates/         # 15 section HTML files (lazy-loaded by nav.js)
│   ├── modals/            # 7 modal HTML files (lazy-loaded on first open)
│   └── i18n/              # 4 language files (he.json, en.json, ar.json, ru.json)
├── public/
│   ├── sw.js              # ServiceWorker (offline cache, push notifications)
│   ├── manifest.json      # PWA manifest
│   └── wedding.json       # External config
├── scripts/              # sri-check, inject-config, size-report, send-push, generate-icons
├── tests/
│   ├── wedding.test.mjs   # Main test suite (Vitest)
│   ├── unit/              # 33 unit/integration test files
│   └── e2e/               # Playwright: smoke + visual regression
├── .github/
│   ├── copilot-instructions.md   # Master project spec
│   ├── AGENTS.md                 # Agent/prompt discovery index
│   ├── CODEOWNERS
│   ├── agents/                   # guest-manager.agent.md, wedding-designer.agent.md
│   ├── instructions/             # wedding, cicd, workspace instructions
│   ├── prompts/                  # add-feature, code-review prompts
│   ├── workflows/                # ci.yml, deploy.yml, release.yml
│   └── copilot/config.json
├── .vscode/
│   ├── settings.json, extensions.json, tasks.json, mcp.json
├── eslint.config.mjs     # JS lint — flat config, ecmaVersion: 2025
├── .stylelintrc.json     # CSS lint
├── vite.config.js        # Vite 8 build config
└── package.json          # Zero runtime deps — devDeps only
```

## Template Lazy Loading — How It Works

1. `index.html` has section wrappers with `data-template="xxx"` and empty `<div class="section-skeleton">`.
2. `src/core/nav.js showSection()` checks `sec.dataset.template && sec.dataset.loaded !== "1"`.
3. Template-loader uses `import.meta.glob` to discover and inject templates.
4. Then the section module's `mount()` is called.
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


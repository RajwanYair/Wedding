---
description: "Use when: exploring the Wedding workspace file structure, available agents, prompts, or project resources."
---

# Workspace — Wedding Manager

## Available Resources

| Type | Available |
| --- | --- |
| Agents | `@wedding-designer` — CSS/UI/themes; `@guest-manager` — data/RSVP/tables |
| Prompts | `/add-feature` — scaffold new section; `/code-review` — full audit |
| Instructions | `wedding` (*.html) — HTML patterns; `cicd` (*.yml) — CI/CD standards |
| MCP | `filesystem` — scoped project read/write; `fetch` — test endpoints |

## Detailed File Structure

```text
Wedding/
├── index.html            # HTML shell (825 lines — links CSS + JS)
├── css/
│   ├── variables.css     # CSS custom properties + 4 theme overrides
│   ├── base.css          # Reset, body, scrollbar, particles
│   ├── layout.css        # Header, top-bar, nav, main content, animations
│   ├── components.css    # Cards, stats, buttons, forms, modals, toasts, badges, tooltips
│   ├── responsive.css    # Media queries, print, prefers-reduced-motion
│   └── auth.css          # Auth overlay, user bar
├── js/
│   ├── config.js         # Constants, state variables, auth/sheets config
│   ├── i18n.js           # I18N translations (he + en)
│   ├── dom.js            # DOM element cache (el object)
│   ├── state.js          # Persistence (save/load/saveAll/loadAll, migration)
│   ├── utils.js          # uid, escapeHtml, cleanPhone, formatDateHebrew, initParticles
│   ├── ui.js             # i18n engine (t, applyLanguage), theme, modal, toast
│   ├── nav.js            # Section navigation with admin guard
│   ├── dashboard.js      # Stats, countdown, top bar, header info, badge maps
│   ├── guests.js         # Guest CRUD, filter, sort, search
│   ├── tables.js         # Table CRUD, drag-drop seating
│   ├── invitation.js     # Invitation rendering (SVG + image upload)
│   ├── whatsapp.js       # WhatsApp template + send
│   ├── rsvp.js           # Public RSVP form
│   ├── settings.js       # Wedding details, export/import, CSV, data management
│   ├── sheets.js         # Google Sheets API sync
│   ├── auth.js           # Google/Facebook/Apple/Guest auth
│   └── app.js            # init() entry point
├── sw.js                 # ServiceWorker (offline cache, APP_SHELL)
├── manifest.json         # PWA manifest
├── icon.svg              # 512×512 app icon (rings + heart)
├── invitation.jpg        # Default invitation background image
├── package.json          # devDeps: eslint, stylelint, htmlhint, markdownlint-cli2
├── eslint.config.mjs     # JS lint — cross-file globals, ecmaVersion: latest
├── .stylelintrc.json     # CSS lint — extends stylelint-config-standard
├── .htmlhintrc           # HTML lint
├── .markdownlint.json    # Markdown lint rules
├── .markdownlint-cli2.jsonc  # Ignore node_modules
├── .editorconfig / .gitignore / .gitattributes
├── tests/
│   └── wedding.test.mjs  # Node built-in test runner (177 tests)
├── .github/
│   ├── copilot-instructions.md   ← master project spec (always loaded)
│   ├── AGENTS.md                 ← agent/prompt discovery index
│   ├── CODEOWNERS
│   ├── agents/
│   │   ├── guest-manager.agent.md
│   │   └── wedding-designer.agent.md
│   ├── instructions/
│   │   ├── wedding.instructions.md    (applyTo: **/*.html)
│   │   ├── cicd.instructions.md       (applyTo: **/*.yml, .github/**)
│   │   └── workspace.instructions.md  (on-demand)
│   ├── prompts/
│   │   ├── add-feature.prompt.md
│   │   └── code-review.prompt.md
│   ├── workflows/
│   │   ├── ci.yml      # lint + test + security scan
│   │   ├── deploy.yml  # GitHub Pages deploy
│   │   └── release.yml # artifact attach on vX.Y.Z tags
│   └── copilot/config.json
└── .vscode/
    ├── settings.json    # ESLint/Stylelint/markdownlint inline
    ├── extensions.json  # Recommended extensions
    └── mcp.json         # MCP server config
```

## What NOT To Do

- No runtime npm/build tools (devDeps for linting only)
- No external CSS/JS libraries or CDNs
- No hardcoded colors — CSS custom properties only
- No `innerHTML` with unsanitized data
- No visible text without `data-i18n` / `t()`

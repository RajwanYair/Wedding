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
├── index.html            # App (HTML + CSS + JS — single file)
├── sw.js                 # ServiceWorker (offline cache, APP_SHELL)
├── manifest.json         # PWA manifest
├── icon.svg              # 512×512 app icon (rings + heart)
├── invitation.jpg        # Default invitation background image
├── package.json          # devDeps: eslint, stylelint, htmlhint, markdownlint-cli2
├── eslint.config.mjs     # JS lint — ecmaVersion: latest, all rules: error
├── .stylelintrc.json     # CSS lint — extends stylelint-config-standard
├── .htmlhintrc           # HTML lint
├── .markdownlint.json    # Markdown lint rules
├── .markdownlint-cli2.jsonc  # Ignore node_modules
├── .editorconfig / .gitignore / .gitattributes
├── tests/
│   └── wedding.test.mjs  # Node built-in test runner (125 tests)
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

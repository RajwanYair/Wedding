---
applyTo: "**"
description: "Use when: working on any file in the Wedding workspace. Provides project context and architecture overview."
---

# Workspace Instructions — Wedding Manager

## Project Overview

| Property | Value |
| --- | --- |
| **Name** | Wedding Manager |
| **Type** | Single-page HTML app |
| **Version** | v1.0.0 |
| **Owner** | @RajwanYair |
| **Stack** | HTML5, CSS3, vanilla JS (ES2020+) |
| **Dependencies** | Zero (no npm, no build) |
| **Language** | Hebrew RTL (primary), English (toggle) |
| **Themes** | 5 (purple, rose gold, gold, emerald, royal blue) |

## File Structure

```text
Wedding/
├── index.html            # App (HTML + CSS + JS)
├── sw.js                 # ServiceWorker (offline + cache, v1.0.0)
├── manifest.json         # PWA manifest
├── icon.svg              # 512×512 app icon (rings + heart)
├── README.md
├── CHANGELOG.md
├── LICENSE
├── .editorconfig
├── .gitignore / .gitattributes
├── eslint.config.mjs
├── tests/
│   └── wedding.test.mjs
├── .github/
│   ├── copilot-instructions.md
│   ├── copilot/config.json
│   ├── workflows/          # ci, deploy, release
│   ├── instructions/
│   ├── prompts/
│   ├── agents/
│   ├── AGENTS.md
│   └── CONTRIBUTING.md / CODEOWNERS
└── .vscode/
    ├── settings.json
    ├── extensions.json
    └── mcp.json
```

## Key Systems

| System | Details |
| --- | --- |
| **Storage** | localStorage with `wedding_v1_` prefix, JSON serialization |
| **i18n** | Dual-language (he/en) via `data-i18n` attrs + `t()` function |
| **Themes** | 5 CSS-variable themes, cycled with 🎨 button |
| **WhatsApp** | `wa.me` deep links with templated messages |
| **RSVP** | Client-side guest self-registration with auto-match |
| **Tables** | Visual floor plan with drag-and-drop seating |
| **Export** | CSV with UTF-8 BOM for Hebrew, print stylesheet |
| **PWA** | Installable, offline-first via `sw.js` |

## What NOT To Do

- Do NOT add npm/node/build tools
- Do NOT use external CSS/JS libraries
- Do NOT hardcode colors — use CSS custom properties
- Do NOT use `innerHTML` with unsanitized data
- Do NOT skip i18n for new visible text

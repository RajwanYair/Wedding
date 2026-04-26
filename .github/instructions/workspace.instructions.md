---
description: "Use when: exploring the Wedding workspace file structure, available agents, prompts, or project resources."
---

# Workspace — Wedding Manager v11.12.0

## Available Resources

| Type | Available |
| --- | --- |
| Agents | `@wedding-designer` — CSS/UI/themes; `@guest-manager` — data/RSVP/tables; `@vendor-agent` — vendors/budget; `@analytics-agent` — dashboards/reports |
| Prompts | `/add-feature` — scaffold new section; `/code-review` — full audit |
| Instructions | `wedding` (*.html) — HTML patterns; `cicd` (*.yml) — CI/CD standards |
| MCP | `filesystem` — scoped project read/write; `fetch` — test endpoints |

## Canonical Docs

- `.github/copilot-instructions.md` is the canonical project rules document
- `README.md` is the public overview and quick start
- `ARCHITECTURE.md` is the runtime and data-flow reference
- `CONTRIBUTING.md` is the contributor workflow reference

## Workspace Shape

```text
index.html       shell and nav chrome
css/             layered stylesheets
src/main.js      bootstrap entry
src/core/        store, nav, events, i18n, ui, config
src/sections/    runtime-mounted features
src/services/    auth, sheets, backend, presence, supabase
src/templates/   lazy section HTML
src/modals/      lazy modal HTML
tests/           repo sanity, unit, integration, e2e
```

## Notes

- Prefer the runtime path documented in `ARCHITECTURE.md` when exploring behavior
- Use `.github/copilot-instructions.md` for rules, not this file
- Keep workspace-specific notes here; avoid duplicating project-wide policy

---
description: "Use when: exploring the Wedding workspace file structure, available agents, prompts, or project resources."
---

# Workspace — Wedding Manager v32.0.0

## Available Agents

| Agent | Invoke | Use when |
| --- | --- | --- |
| `@wedding-designer` | `.github/agents/wedding-designer.agent.md` | CSS/UI/themes/RTL/glassmorphism |
| `@guest-manager` | `.github/agents/guest-manager.agent.md` | RSVP/tables/WhatsApp/data import |
| `@vendor-agent` | `.github/agents/vendor-agent.agent.md` | vendors/budget/payments/expenses |
| `@analytics-agent` | `.github/agents/analytics-agent.agent.md` | dashboards/funnels/reports/charts |
| `@release-engineer` | `.github/agents/release-engineer.agent.md` | version bump/CHANGELOG/tagging/GH release |
| `@supabase-agent` | `.github/agents/supabase-agent.agent.md` | migrations/RLS/edge functions/realtime |
| `@security-agent` | `.github/agents/security-agent.agent.md` | OWASP/CSP/secrets/supply chain |
| `@performance-agent` | `.github/agents/performance-agent.agent.md` | bundle size/LH scores/caching/lazy loading |
| `@i18n-agent` | `.github/agents/i18n-agent.agent.md` | locales/RTL parity/ICU/translations |

## Available Prompts

| Prompt | File | Use when |
| --- | --- | --- |
| `/add-feature` | `prompts/add-feature.prompt.md` | scaffold new section end-to-end |
| `/code-review` | `prompts/code-review.prompt.md` | full security + i18n + quality audit |
| `/debug-issue` | `prompts/debug-issue.prompt.md` | structured bug investigation |
| `/i18n-add` | `prompts/i18n-add.prompt.md` | add key to all 5 locale files |
| `/new-util` | `prompts/new-util.prompt.md` | scaffold a pure utility helper with tests |
| `/pre-release` | `prompts/pre-release.prompt.md` | full pre-release checklist |
| `/refactor-section` | `prompts/refactor-section.prompt.md` | bring section to mount/unmount contract |
| `/security-audit` | `prompts/security-audit.prompt.md` | OWASP Top 10 review |
| `/sprint` | `prompts/sprint.prompt.md` | implement N roadmap sprints + release |
| `/version-bump` | `prompts/version-bump.prompt.md` | bump version across all 14 files |

## Available Skills

| Skill | File | Use when |
| --- | --- | --- |
| `testing` | `skills/testing.skill.md` | writing unit/integration tests |
| `store-state` | `skills/store-state.skill.md` | working with store, localStorage, subscriptions |
| `auth-security` | `skills/auth-security.skill.md` | auth flow, token storage, input sanitization |
| `rtl-i18n` | `skills/rtl-i18n.skill.md` | Hebrew/RTL layout, i18n key management |
| `theming` | `skills/theming.skill.md` | CSS layers, themes, custom properties |

## Auto-Loaded Instructions

| Pattern | File | Triggers when |
| --- | --- | --- |
| `src/utils/**/*.js` | `instructions/utils.instructions.md` | editing any utility helper |
| `src/**/*.js,scripts/**/*.mjs` | `instructions/javascript.instructions.md` | any JS source file |
| `css/**/*.css` | `instructions/css.instructions.md` | any CSS file |
| `tests/**` | `instructions/tests.instructions.md` | any test file |
| `supabase/**` | `instructions/supabase.instructions.md` | Supabase migrations/functions |
| `**/*.html` | `instructions/wedding.instructions.md` | HTML templates/index |

## Canonical Docs

- `.github/copilot-instructions.md` — canonical project rules document
- `README.md` — public overview and quick start
- `ARCHITECTURE.md` — runtime and data-flow reference
- `CONTRIBUTING.md` — contributor workflow reference
- `AGENTS.md` — agent guide with task recipes

## Workspace Shape

```text
index.html         shell and nav chrome
css/               layered stylesheets (7 modules, @layer ordered)
src/main.js        bootstrap entry (Vite 8 ESM)
src/core/          store · nav · events · i18n · ui · config · dom · router
src/sections/      runtime-mounted features (24 modules)
src/handlers/      action dispatch (data-action handlers, domain-split)
src/repositories/  data access layer (CRUD helpers per domain)
src/services/      auth · sheets · backend · presence · supabase · seating · ai-proxy
src/types/         TypeScript type stubs
src/templates/     lazy section HTML (15 files)
src/modals/        lazy modal HTML (7 files)
src/i18n/          he · en · ar · es · fr locale files
tests/             repo sanity · unit · integration · e2e · perf (6450 tests, 458 files)
scripts/           build/lint/audit/sync scripts (.mjs)
supabase/          Edge Functions · migrations
worker/            Cloudflare Worker AI proxy (wrangler.toml · src/index.ts)
public/            sw.js · manifest.json · offline.html · _headers
docs/              ADRs · how-tos · integrations · operations
```

## Notes

- Prefer the runtime path documented in `ARCHITECTURE.md` when exploring behavior
- Use `.github/copilot-instructions.md` for rules, not this file
- Sections in `SECTION_LIST` are nav-accessible; `EXTRA_SECTIONS` (vendors, expenses) are sidebar-only

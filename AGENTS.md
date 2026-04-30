# Wedding Manager — Agent Guide

> For cloud agents (GitHub Copilot Workspace, Claude, ChatGPT) and CI pipelines.

## Project Identity

- **App**: Wedding Manager v13.19.0 — Hebrew RTL, RSVP, table seating, WhatsApp, multi-language
- **Stack**: Vanilla JS ES2025 + Vite 8 + CSS `@layer` — minimal runtime deps (`@supabase/supabase-js`, `dompurify`, `valibot`)
- **Entry**: `src/main.js` (ESM, Vite build)
- **Deploy**: GitHub Pages — <https://rajwanyair.github.io/Wedding>

## Repository Layout

```text
src/          — App source (core/, sections/, services/, utils/, i18n/, templates/)
css/          — 7 CSS modules (@layer ordered)
tests/        — Vitest unit + integration; tests/e2e/ Playwright
public/       — SW, manifest, offline.html
scripts/      — Build/lint/sync scripts (.mjs)
.github/      — Actions, Copilot instructions, agents, prompts, issue templates
docs/         — ADRs, integration guides, ops runbooks
supabase/     — Migrations and edge functions
```

## Before Every Change

1. Read the relevant section file in `src/sections/` and its template in `src/templates/`.
2. Check `src/core/constants.js` for existing enums before adding new ones.
3. Check `src/core/store.js` for existing store keys before adding storage.
4. Run `npm run lint` — must exit 0 (0 errors, 0 warnings).
5. Run `npm test` — all suites must pass.

## Non-Negotiable Rules

| Rule                                 | Detail                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| No `innerHTML` with unsanitized data | Use `textContent` or `sanitize()` from `src/utils/sanitize.js`                                       |
| i18n all strings                     | Every visible string needs `data-i18n="key"` (HTML) or `t('key')` (JS) with both `he` + `en` entries |
| CSS custom properties only           | No hardcoded colors; use `var(--color-*)` tokens                                                     |
| No direct Sheets calls               | Use `enqueueWrite('key', fn)` — never call `syncStoreKeyToSheets` directly                           |
| Auth guard                           | Supabase / OAuth flows must call `isApprovedAdmin(email)` before granting admin access               |
| localStorage prefix                  | All keys use `wedding_v1_` prefix                                                                    |

## Available Agents

| Agent            | File                                       | Use When                                                |
| ---------------- | ------------------------------------------ | ------------------------------------------------------- |
| Guest Manager    | `.github/agents/guest-manager.agent.md`    | Adding guest features, RSVP, table assignment, WhatsApp |
| Wedding Designer | `.github/agents/wedding-designer.agent.md` | UI/UX, themes, CSS, RTL layout, accessibility           |
| Analytics Agent  | `.github/agents/analytics-agent.agent.md`  | Dashboard stats, charts, reporting, export              |
| Vendor Agent     | `.github/agents/vendor-agent.agent.md`     | Vendors, expenses, budget tracking, payments            |
| Release Engineer | `.github/agents/release-engineer.agent.md` | Version bumps, CHANGELOG, sync-version, tagging, GH release notes |

## Common Tasks

### Add a new section

1. Create `src/sections/<name>.js` — export `mount()`, `unmount()`, `render<Name>()`.
2. Create `src/templates/<name>.html` — use `data-i18n` on all visible strings.
3. Add to `SECTION_LIST` in `src/core/constants.js`.
4. Import as namespace in `src/main.js`: `import * as <Name>Section from "./sections/<name>.js"`.
5. Add `he` + `en` keys to `src/i18n/he.json` and `src/i18n/en.json`.
6. Run `npm run lint && npm test`.

### Add a new i18n key

See `.github/prompts/i18n-add.prompt.md`.

### Bump the version

See `.github/prompts/version-bump.prompt.md`.

### Debug a failing test or UI bug

See `.github/prompts/debug-issue.prompt.md`.

### Run a security audit

See `.github/prompts/security-audit.prompt.md`.

## CI Commands

```bash
npm run lint          # ESLint + Stylelint + HTMLHint + markdownlint (0 errors, 0 warnings)
npm test              # Vitest unit + integration (all pass, 0 Node warnings)
npm run build         # Vite production build
npm run ci            # lint + i18n parity + credentials check + test + build
npm run size          # Bundle size report
npm run sri           # SRI hash check
npm run sync:version  # Propagate package.json version to all 12 version-bearing files
```

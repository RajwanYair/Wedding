---
description: "Workspace conventions — file routing, $TEMP enforcement, task runner, and DX patterns."
---

# Skill: Workspace Management

## Generated File Routing

All generated/intermediate files MUST route to `$TEMP/wedding-dev/` or a gitignored directory.

| Category     | Path                                      | Config                  |
| ------------ | ----------------------------------------- | ----------------------- |
| Vite cache   | `$TEMP/wedding-dev/vite-cache`            | `vite.config.js`        |
| Vitest cache | `$TEMP/wedding-dev/vitest-cache`          | `vite.config.js`        |
| Coverage     | `$TEMP/wedding-dev/coverage`              | `vite.config.js`        |
| Lint cache   | `node_modules/.cache/{eslint,stylelint}/` | npm scripts             |
| Build output | `dist/` (gitignored)                      | `vite.config.js`        |
| Stryker      | `.stryker-tmp/` (gitignored)              | `stryker.config.mjs`    |
| Playwright   | `playwright-report/` (gitignored)         | `playwright.config.mjs` |

## Task Runner Quick Reference

| Task         | Shortcut                           | Command                       |
| ------------ | ---------------------------------- | ----------------------------- |
| Lint all     | `Ctrl+Shift+B` → "CI: Lint + Test" | `npm run ci`                  |
| Test default | `Ctrl+Shift+T`                     | `npm test`                    |
| Dev server   | Background                         | `npx vite --port 5173 --open` |
| Build        | —                                  | `npm run build`               |
| Size check   | —                                  | `npm run size`                |

## VS Code Integration Points

- **Problem matchers**: ESLint (`$eslint-stylish`), Stylelint (`$stylelint`)
- **Code actions on save**: ESLint fix, Stylelint fix, markdownlint fix
- **Test explorer**: Vitest explorer auto-discovers `tests/**/*.test.mjs`
- **Debug**: Chrome/Edge with Vite sourcemaps, Node debugger for Vitest
- **Spell check**: Hebrew + English dictionaries active

## Script Conventions

Scripts in `scripts/` MUST:

1. Exit 0 on success, non-zero on failure
2. Use `--enforce` flag for CI strictness (soft warnings in dev)
3. Output to `stdout` — never write report files to workspace
4. Import `tmpdir` from `node:os` if file output is required
5. Support `--help` for self-documentation

## Node Modules

- **Local dev**: Shared at `../MyScripts/node_modules/` — run `npm install` from parent
- **CI**: Uses its own `npm ci` from workspace root
- **Never commit**: `node_modules/`, `package-lock.json` changes without dep changes

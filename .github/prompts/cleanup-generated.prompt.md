---
mode: agent
description: "Audit workspace for generated/intermediate files and enforce $TEMP routing."
---

# Clean Generated Files — Wedding Manager

Ensure all generated and intermediate files route to `$TEMP/wedding-dev/` instead of the workspace.

## $TEMP Routing Contract

| Output Type        | Target Path                           | Config Location                                   |
| ------------------ | ------------------------------------- | ------------------------------------------------- |
| Vite cache         | `$TEMP/wedding-dev/vite-cache`        | `vite.config.js → cacheDir`                       |
| Vitest cache       | `$TEMP/wedding-dev/vitest-cache`      | `vite.config.js → test.cacheDir`                  |
| Coverage HTML/LCOV | `$TEMP/wedding-dev/coverage`          | `vite.config.js → test.coverage.reportsDirectory` |
| Playwright report  | `$TEMP/wedding-dev/playwright-report` | `playwright.config.mjs → outputDir`               |
| Stryker tmp        | `.stryker-tmp/` (gitignored)          | `stryker.config.mjs`                              |
| Lint cache         | `node_modules/.cache/`                | ESLint/Stylelint `--cache-location` flags         |
| Build output       | `dist/` (gitignored, CI only)         | `vite.config.js → build.outDir`                   |

## Audit Steps

### 1. Scan for Leaked Files

```bash
git status --porcelain
Get-ChildItem -Recurse -File | Where-Object { $_.Extension -in '.lcov','.log','.tmp' -and $_.DirectoryName -notmatch 'node_modules' }
```

### 2. Verify Script Outputs

For each `scripts/*.mjs`, confirm it writes to:

- `stdout` (preferred for reports)
- `$TEMP/wedding-dev/` (if file output required)
- Never directly to workspace root

### 3. Fix Any Violations

- Update the script to use `import { tmpdir } from 'node:os'` + `join(tmpdir(), 'wedding-dev', ...)`
- Add pattern to `.gitignore` if temporary local file is unavoidable

### 4. Verify .gitignore Coverage

Ensure all generated patterns are covered. Run:

```bash
git ls-files --others --exclude-standard
```

Any untracked generated file = violation.

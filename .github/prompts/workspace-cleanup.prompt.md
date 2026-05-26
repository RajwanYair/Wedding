---
mode: agent
description: "Clean workspace: remove stale generated files, enforce $TEMP routing, verify .gitignore."
---

# Workspace Cleanup — Wedding Manager

Audit and clean the workspace of generated/intermediate files.

## Rules

- **Generated output** (coverage, dist, reports, logs) → `$TEMP/wedding-dev/` or gitignored
- **Build cache** (Vite, Vitest) → `$TEMP/wedding-dev/` (already configured in `vite.config.js`)
- **Lint cache** → `node_modules/.cache/` (already excluded)
- **Never commit**: `.env`, coverage HTML, dist/, test artifacts, log files

## Audit Steps

### 1. Find Untracked Generated Files

```bash
git status --porcelain | Where-Object { $_ -match "^\?\?" }
```

### 2. Verify $TEMP Routing

Check `vite.config.js`:

- `cacheDir` → `$TEMP/wedding-dev/vite-cache` ✓
- `test.cacheDir` → `$TEMP/wedding-dev/vitest-cache` ✓
- `test.coverage.reportsDirectory` → `$TEMP/wedding-dev/coverage` ✓

### 3. Check Scripts Output Paths

Audit each `scripts/*.mjs`:

- Any that write to workspace root → redirect to `$TEMP` or gitignored path
- `size-report.mjs` → stdout only (OK)
- `sri-check.mjs` → stdout only (OK)

### 4. Verify .gitignore Coverage

Ensure these patterns exist:

```text
coverage/
dist/
*.tsbuildinfo
.stryker-tmp/
playwright-report/
test-results/
*.log
.env
.env.local
.env.*.local
```

### 5. Clean Local Artifacts

```bash
# Remove local coverage if present
if (Test-Path coverage) { Remove-Item -Recurse -Force coverage }
# Remove dist if present (rebuild with npm run build)
if (Test-Path dist) { Remove-Item -Recurse -Force dist }
```

## Verification

```bash
git status  # Should show no untracked generated files
npm run build  # Verify build still works after cleanup
```

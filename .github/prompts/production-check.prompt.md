---
mode: agent
description: "Run the full production readiness checklist before a release."
---

# Production Readiness Check — Wedding Manager

Run all pre-release validation steps and report results.

## Automated Checks

Execute each in sequence — stop on first failure:

```bash
# 1. Lint (0 errors, 0 warnings)
npm run lint

# 2. Tests (all pass, 0 skipped)
npm test

# 3. Build (Vite production build)
npm run build

# 4. Bundle size within budget
npm run size

# 5. Security scan (no innerHTML, no eval, no plaintext secrets)
node scripts/security-scan.mjs
npm run check:credentials
node scripts/check-plaintext-secrets.mjs

# 6. i18n parity (all keys in he + en)
node scripts/check-i18n-parity.mjs

# 7. Dead exports audit
node scripts/dead-export-check.mjs

# 8. SRI hash check
npm run sri
```

## Manual Verification

| # | Check | Status |
|---|-------|--------|
| 1 | SW `CACHE_NAME` matches version in `package.json` | |
| 2 | `CHANGELOG.md` has entry for this version | |
| 3 | `README.md` badges show correct version + test count | |
| 4 | OAuth secrets in GitHub Secrets (Google, Facebook, Apple) | |
| 5 | No `console.log` in production code (only `console.error`/`warn`) | |
| 6 | All templates have `data-i18n` on visible strings | |

## Report Format

Output a summary table:

```text
| Check              | Result | Notes |
|--------------------|--------|-------|
| Lint               | ✅/❌  |       |
| Tests              | ✅/❌  |       |
| Build              | ✅/❌  |       |
| Bundle size        | ✅/❌  |       |
| Security scan      | ✅/❌  |       |
| i18n parity        | ✅/❌  |       |
| Dead exports       | ✅/❌  |       |
| SRI                | ✅/❌  |       |
```

If all pass, output: **READY FOR RELEASE**
If any fail, list exact errors and suggest fixes.

---
mode: agent
description: "Run full deployment readiness check — lint, test, build, size, security, i18n, and credentials."
---

# Deploy Check

Run the full production readiness gate sequence and report results:

```bash
npm run lint
npm test
npm run build
npm run size
npm run check:credentials
npm run check:i18n
npm run audit:arch
npm run sri
```

## Success criteria

- All commands exit 0
- Bundle ≤ 60 KB gzip
- 0 lint errors/warnings
- 0 test failures
- 0 credential leaks
- 100% i18n parity

Report a summary table with pass/fail status for each gate.
If any gate fails, diagnose the root cause and suggest a fix.

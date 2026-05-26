---
description: "Production operations — deployment, monitoring, rollback, health checks."
---

# Skill: Production Operations

## Deployment Pipeline

1. **Pre-deploy**: `npm run ci` (lint + i18n + credentials + canonical + utils + a11y + test + build)
2. **Deploy**: Push to `main` → CI runs → GH Pages auto-deploys
3. **Post-deploy**: Verify `https://rajwanyair.github.io/Wedding/health.json` returns 200

## Health Check

```bash
curl -s https://rajwanyair.github.io/Wedding/health.json | jq .
```

Expected: `{ "status": "ok", "version": "32.2.0" }`

## Rollback

1. Identify failing commit: `git log --oneline -5`
2. Revert: `git revert <sha> --no-edit`
3. Push: `git push origin main`
4. Verify GH Actions deploys clean build

## Service Worker Update

When deploying a new version:

1. Bump `CACHE_NAME` in `public/sw.js` to match new version
2. Users get update banner via `initSW()` in `src/core/ui.js`
3. Force-refresh: clear registration at `chrome://serviceworker-internals`

## Monitoring Checklist

| Signal                | Source                             | Alert                   |
| --------------------- | ---------------------------------- | ----------------------- |
| Build failure         | GH Actions CI                      | Email + GH notification |
| Lighthouse regression | `.github/workflows/lighthouse.yml` | PR comment              |
| Bundle size exceed    | `scripts/check-bundle-size.mjs`    | CI fail                 |
| Security scan         | `scripts/security-scan.mjs`        | CI fail                 |
| Link rot              | `.github/workflows/link-check.yml` | Issue auto-created      |

## Environment Variables (Secrets)

| Secret              | Used In            | Required For      |
| ------------------- | ------------------ | ----------------- |
| `GOOGLE_CLIENT_ID`  | OAuth login        | Google sign-in    |
| `APPLE_SERVICE_ID`  | OAuth login        | Apple sign-in     |
| `SHEETS_WEBAPP_URL` | Google Sheets sync | Guest data backup |
| `SPREADSHEET_ID`    | Google Sheets sync | Sheet targeting   |
| `SUPABASE_URL`      | Backend            | Database access   |
| `SUPABASE_ANON_KEY` | Backend            | Anon client auth  |
| `ADMIN_EMAILS`      | Auth guard         | Admin allowlist   |
| `GLITCHTIP_DSN`     | Error tracking     | Production errors |

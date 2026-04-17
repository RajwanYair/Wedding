# Operations Runbook — Wedding Manager

> Version: v7.0.0 ·  Last updated: 2025

## Table of Contents

1. [Deployment Checklist](#deployment-checklist)
2. [Database Migrations](#database-migrations)
3. [RLS Verification](#rls-verification)
4. [GDPR Erasure Process](#gdpr-erasure-process)
5. [Health Check](#health-check)
6. [Rollback Procedure](#rollback-procedure)
7. [Secrets Management](#secrets-management)

---

## Deployment Checklist

Run this checklist before every production deploy.

| # | Check | Command |
|---|-------|---------|
| 1 | Lint passes | `npm run lint` — 0 errors, 0 warnings |
| 2 | All tests pass | `npm test` — 0 failures |
| 3 | Vite build succeeds | `npm run build` |
| 4 | Bundle size acceptable | `npm run size` |
| 5 | `sw.js` cache name matches version | `grep CACHE_NAME public/sw.js` |
| 6 | CHANGELOG entry present | Review `CHANGELOG.md` |
| 7 | Version strings consistent | `grep -r '"version"' package.json src/core/config.js` |
| 8 | Git tag created | `git tag vX.Y.Z && git push --tags` |

---

## Database Migrations

Migrations live in `supabase/migrations/` as numbered SQL files.

### Apply pending migrations

```bash
supabase db push          # push all pending migrations to linked project
supabase db diff          # preview uncommitted schema diff
```

### Migration naming convention

```
NNN_short_description.sql
e.g. 019_guest_model_extended.sql
```

### Checklist before applying a migration

1. Review the SQL for destructive operations (`DROP`, `DELETE`, `TRUNCATE`).
2. Ensure every `ADD COLUMN` uses `IF NOT EXISTS`.
3. Ensure every `DROP COLUMN` has been approved and data has been exported.
4. Run `supabase db diff --local` to confirm expected diff only.
5. Apply to staging first and verify via `supabase db push --project-ref <staging>`.

### Rollback

Supabase does not auto-rollback migrations.  Write explicit down-migrations
(`NNN_rollback_description.sql`) that reverse any schema change.

---

## RLS Verification

Row-Level Security must be enabled on all tables before a release.

### Verify programmatically

```js
import { verifyRlsEnabled, verifySelectPolicies } from "./src/services/rls-audit.js";

const { ok, missing } = await verifyRlsEnabled(supabase);
if (!ok) console.error("RLS disabled on:", missing);

const { ok: policyOk, missing: noPolicy } = await verifySelectPolicies(supabase);
if (!policyOk) console.error("No SELECT policy on:", noPolicy);
```

### Required tables

```
guests · tables · vendors · expenses · contacts · timeline · rsvp_log · events
```

### Manual SQL check

```sql
SELECT tablename, rowsecurity
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER BY tablename;
```

All production tables must have `rowsecurity = true`.

---

## GDPR Erasure Process

When a guest requests erasure under GDPR / Israeli Privacy Protection Law:

### Steps

1. Identify the `guestId` from the database.
2. Call the erasure service:

   ```js
   import { eraseGuest } from "./src/services/gdpr-erasure.js";
   await eraseGuest(supabase, guestId, { requestedBy: adminEmail });
   ```

3. Confirm erasure:

   ```js
   import { isErased } from "./src/services/gdpr-erasure.js";
   const erased = await isErased(supabase, guestId);
   console.log(erased); // true
   ```

4. The `erasure_log` table records: `guest_id`, `requested_by`, `erased_at`,
   `columns_erased`.

### PII columns zeroed on erasure

`first_name · last_name · phone · email · notes · meal_notes · accessibility · gift`

> The guest record skeleton (id, rsvp status, table, timestamps) is retained
> for statistical integrity.  RSVP logs are **not** erased.

---

## Health Check

### Quick health ping

```js
import { checkSupabaseHealth } from "./src/services/supabase-health.js";
const { ok, latencyMs } = await checkSupabaseHealth(supabase);
```

### Full health report

```js
import { getHealthReport } from "./src/services/supabase-health.js";
const report = await getHealthReport(supabase);
console.table(report.tables);
```

### Expected output

```json
{
  "ok": true,
  "latencyMs": 42,
  "tables": {
    "guests":   true,
    "tables":   true,
    "vendors":  true,
    "expenses": true
  }
}
```

### Troubleshooting

| Symptom | Cause | Action |
|---------|-------|--------|
| `ok: false` | Supabase service outage | Check status.supabase.com |
| `latencyMs > 2000` | Cold start or high load | Retry; check Supabase dashboard |
| Table `false` | RLS blocking anon key | Verify RLS policies allow service-role read |

---

## Rollback Procedure

### Application rollback (GitHub Pages)

```bash
# Redeploy a previous commit
git revert HEAD --no-edit
git push origin main
# OR force-deploy a specific tag:
git checkout v6.9.0
npm run build
# Then push to gh-pages branch
```

### Database rollback

1. Identify the last clean migration number.
2. Apply the down-migration SQL manually via Supabase SQL editor or CLI.
3. Re-run `supabase db push` to sync the migration history.

### Service worker cache invalidation

Bump `CACHE_NAME` in `public/sw.js` — the SW update banner will prompt
all clients to reload within 24 hours, or immediately if they reload.

---

## Secrets Management

All runtime secrets are injected at build time via `scripts/inject-config.mjs`
or set as GitHub Actions repository secrets.

| Secret | Description | Where |
|--------|-------------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL | GitHub Secrets / `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | GitHub Secrets / `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (CI only) | GitHub Secrets only — never exposed client-side |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth | GitHub Secrets |
| `VITE_FB_APP_ID` | Facebook OAuth | GitHub Secrets |
| `VITE_APPLE_SERVICE_ID` | Apple OAuth | GitHub Secrets |

**Never** commit secrets in `.env` files tracked by git.
`.env.local` is in `.gitignore`.

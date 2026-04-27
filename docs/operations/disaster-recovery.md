# Disaster Recovery Runbook

> Last reviewed: 2026-04-27 · Owner: release-engineer · Drill cadence: quarterly

This runbook covers full data-plane and control-plane recovery for Wedding
Manager when Supabase, GitHub Pages, or DNS fail catastrophically.

## Scope

- **In scope:** Supabase Postgres restore, edge-function redeploy, secrets
  rotation, GH Pages re-deploy, custom-domain failover, browser-cache poison.
- **Out of scope:** end-user device recovery, third-party OAuth provider
  outages (Google / Facebook / Apple — degrade gracefully via email allowlist).

## RPO / RTO Targets

| Tier | RPO (data loss) | RTO (downtime) |
| --- | --- | --- |
| Pages site (read-only) | 0 (immutable per tag) | ≤ 30 min (re-deploy) |
| Supabase data plane | ≤ 24 h (managed daily backup) | ≤ 4 h |
| Edge functions | 0 (in repo) | ≤ 1 h |
| Custom domain (when on Cloudflare) | n/a | ≤ 15 min via dashboard |

## Backup Inventory

| Source | Where | Retention | Owner |
| --- | --- | --- | --- |
| Supabase Postgres daily snapshot | Supabase dashboard → Project → Backups | 7 days (free tier) | release-engineer |
| Migrations history | `supabase/migrations/*.sql` (git) | forever | repo |
| Edge function source | `supabase/functions/**` (git) | forever | repo |
| GH Pages artefact | GitHub Actions artefact for last 90 days | 90 days | GH |
| App tagged releases | `git tag vX.Y.Z` + GH releases | forever | repo |
| Local guest data | user-side IndexedDB / localStorage | user-controlled | user |

## Drill Schedule

Quarterly drill — first Monday of Q1/Q2/Q3/Q4. Document each drill in this
file under "Drill log" with date, scenario, observed RTO/RPO, and gaps found.

## Scenarios

### 1. Supabase project deleted or corrupted

1. Open Supabase dashboard → previous project → **Backups** tab.
2. Trigger PITR (point-in-time recovery) to a target timestamp ≤ RPO.
3. If project is fully gone:
   - Create a new Supabase project (same region for latency parity).
   - Run all migrations: `supabase db push` from repo root.
   - Restore the most recent SQL dump from your encrypted off-site backup.
4. Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in:
   - GitHub Secrets (production CI)
   - Local `.env` for any planner-side admin work
5. Rotate the service-role key (never used in client; only edge fns).
6. Re-deploy edge functions: `supabase functions deploy --project-ref <ref>`.
7. Trigger GH Pages re-deploy: push an empty commit or re-run the deploy
   workflow with the existing tag.
8. Smoke-test: anonymous RSVP, admin login, write+read across guest, table,
   vendor, expense.

### 2. GH Pages deploy is broken / serving wrong artefact

1. In GH Actions, find the last green `Deploy to Pages` run.
2. Click **Re-run all jobs** on that run — it reuses the artefact.
3. If the artefact has expired, run the deploy workflow against a known-good
   tag: `gh workflow run deploy.yml --ref vX.Y.Z`.
4. Hard-purge browser caches: bump `public/sw.js` `CACHE_NAME` and tag a new
   patch release.

### 3. Service Worker poisoned cache

If users report stale UI after deploy:

1. Confirm new deploy by visiting `/sw.js` and reading `CACHE_NAME`.
2. If users still see the old build, push a no-op patch release that bumps
   `CACHE_NAME`. The SW update banner triggers reload on next visit.
3. Worst case, instruct users to DevTools → Application → Service Workers →
   Unregister, then hard-reload.

### 4. Secrets compromised

1. Rotate immediately:
   - Supabase: revoke and regenerate anon + service-role keys.
   - OAuth: rotate Google / FB / Apple client secrets in respective consoles.
   - WhatsApp Cloud API token (when wired).
2. Update GH Secrets.
3. Trigger a deploy. Verify the bundle no longer carries the old key
   (search `dist/` for the prefix).
4. Audit the audit-log table (migration 004) for unauthorised writes.
5. Notify users only if PII may have been read (GDPR breach threshold).

### 5. Domain hijack / DNS failure

1. If Cloudflare-fronted: pause Cloudflare proxy → fall back to GH Pages
   default hostname (`rajwanyair.github.io/Wedding`).
2. If domain registrar compromised: contact registrar abuse line; lock
   domain; rotate registrar password and 2FA secret.
3. Update `_headers` and CSP frame-src lists if hostname changes.

### 6. Total repo loss

1. Restore from local clone or any contributor's clone — git is
   distributed; `main` HEAD is recoverable from any peer.
2. Recreate the GH repo (private clone push).
3. Recreate GH Secrets.
4. Re-add Pages source (Actions → Pages → Source: GitHub Actions).

## Verification After Recovery

Run this checklist after every drill or real recovery:

- [ ] `npm run lint && npm test` against restored backend → 0/0
- [ ] Anonymous user can land on `/landing`
- [ ] Admin OAuth login succeeds end-to-end
- [ ] Guest add → table assign → RSVP submit round-trip
- [ ] Vendor add + expense entry persist after reload
- [ ] WhatsApp `wa.me` link opens with correct phone format
- [ ] SW update banner appears on stale clients
- [ ] No console errors; Sentry shows zero unscrubbed PII

## Drill Log

| Date | Scenario | RTO observed | RPO observed | Gaps / actions |
| --- | --- | --- | --- | --- |
| _yyyy-mm-dd_ | _e.g. Supabase PITR to T-1h_ | _e.g. 32 min_ | _e.g. 8 min_ | _e.g. CI lacks dry-run flag_ |

## Related

- `docs/operations/deploy-runbook.md` — happy-path deploys
- `docs/operations/incident-response.md` — live incidents
- `docs/operations/migrations.md` — DB schema changes
- `SECURITY.md` — disclosure + secrets policy

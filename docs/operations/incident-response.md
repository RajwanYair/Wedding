# Incident Response Playbook

> **Wedding Manager** — On-call guide for production issues

## Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 — Critical** | App completely down or data loss | Immediate | Blank page for all users |
| **P1 — High** | Core feature broken | < 2 hours | RSVP cannot be submitted |
| **P2 — Medium** | Feature degraded | < 24 hours | Supabase sync fails silently |
| **P3 — Low** | Cosmetic / minor | Next sprint | Typography misalignment |

---

## Immediate Response Steps (P0 / P1)

### 1. Determine scope

```sh
# Check GitHub Pages deploy status
gh run list --workflow=ci.yml --limit=5

# Check Supabase project status
# → https://app.supabase.com/project/<your-project>/health
```

### 2. Check error logs

Supabase `error_log` table captures client-side errors automatically:

```sql
SELECT * FROM error_log ORDER BY created_at DESC LIMIT 50;
```

### 3. Rollback if needed

```sh
git log --oneline -10         # find last good commit
git revert <bad-commit-hash>  # or reset if not yet pushed
git push origin main
```

GitHub Pages redeploys in ~60 seconds after push.

---

## Common Failure Scenarios

### App shows blank white page

1. Open DevTools console — find first red error
2. If `MIME type error` → check Vite base URL in `vite.config.js`
3. If `SyntaxError` → a JS file failed to parse; check last commit diff
4. If `Failed to fetch` → CORS or network issue with Supabase

### RSVP submission silently failing

1. Check `rsvp_log` table in Supabase
2. Check RLS policies (migration 002) — guest may be blocked
3. Check `offline-queue.js` — records may be queued locally

```js
// In browser console:
JSON.parse(localStorage.getItem('wedding_v1_offline_queue') || '[]')
```

### Supabase sync not working

1. Verify `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` secrets are set
2. Check Supabase project is not paused (free tier pauses after 1 week idle)
3. Verify RLS policies allow anon reads

### Service worker serving stale content

1. Hard-refresh in browser (Ctrl+Shift+R)
2. Check `CACHE_NAME` in `public/sw.js` matches current version
3. If stuck: DevTools > Application > Service Workers > Unregister, then reload

### Auth provider not loading (Google / Facebook / Apple)

1. Check OAuth console credentials match domain (GitHub Pages URL)
2. Verify CSP headers in `public/_headers` allow provider SDK domains
3. Check browser console for CORS errors from OAuth JS SDKs

---

## Escalation Path

| Issue Type | Escalate To |
|-----------|------------|
| GitHub Pages outage | GitHub status: status.github.com |
| Supabase outage | Supabase status: status.supabase.com |
| Code regression | File GitHub issue with steps to reproduce |
| Data corruption | Immediate: export data, restore from Supabase backup |

---

## Post-Incident Checklist

- [ ] Root cause identified and documented
- [ ] Fix deployed and verified
- [ ] `CHANGELOG.md` updated with patch version
- [ ] GitHub issue opened/closed with commit reference
- [ ] Monitoring/alerting improved if gap found

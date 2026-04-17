# Deploy Runbook

> **Wedding Manager** — Production deployment guide (GitHub Pages + Supabase)

## Overview

Wedding Manager deploys to **GitHub Pages** (static assets) with **Supabase** as the optional backend (auth, real-time sync, persistent storage). The static bundle is fully functional without Supabase; backend features degrade gracefully when not configured.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Build + lint + test |
| git | any | Source control |
| GitHub CLI (`gh`) | ≥ 2.x | Release tagging |
| Supabase CLI | ≥ 1.x | Migrations (optional) |

---

## 1. Pre-Deploy Checklist

Run the full CI pipeline locally before any manual deploy:

```sh
npm run lint          # 0 errors, 0 warnings
npm test              # all tests pass, 0 failures
npm run build         # dist/ produced, exit 0
npm run size          # confirm bundle size acceptable
npm run sri           # SRI hashes valid
```

Also confirm:
- [ ] `public/sw.js` `CACHE_NAME` matches new version
- [ ] `CHANGELOG.md` entry written for this release
- [ ] All `t('key')` have both `he` + `en` translations
- [ ] GitHub Actions secrets current (see §4)

---

## 2. Build & Preview

```sh
npm run build          # Vite 8 — output to dist/
npx serve dist/        # local preview before push
```

Check that:
- Service worker registers without console errors
- All fonts/icons load
- Auth providers load (Google / Facebook / Apple buttons visible)

---

## 3. Deploy to GitHub Pages

Deployment is **automatic** on every push to `main` via `.github/workflows/ci.yml`.

Manual deploy (if CI is skipped or for a hotfix):

```sh
git push origin main   # triggers CI → Pages deploy
```

For a tagged release:

```sh
git tag v6.2.0
git push origin v6.2.0
gh release create v6.2.0 --title "v6.2.0" --notes-file RELEASE_NOTES.md
```

The Pages deploy URL is: <https://rajwanyair.github.io/Wedding>

---

## 4. GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_FB_APP_ID` | Facebook App ID |
| `VITE_APPLE_SERVICE_ID` | Apple service ID |
| `VITE_ADMIN_EMAILS` | Comma-separated admin email list |

Set secrets at: `github.com/rajwanyair/Wedding/settings/secrets/actions`

---

## 5. Supabase Migrations

Apply pending migrations to the remote project:

```sh
supabase db push --db-url "$SUPABASE_URL"
# OR paste SQL files manually in Supabase SQL Editor
```

Migration files are in `supabase/migrations/` in numeric order. Always apply sequentially. Never skip and never re-apply a migration.

---

## 6. Post-Deploy Verification

1. Visit <https://rajwanyair.github.io/Wedding>
2. Confirm service worker activates (DevTools > Application > Service Workers)
3. Test RSVP flow as guest (no auth required)
4. Sign in as admin; verify all sections load
5. Check DevTools console — no errors, no 404s
6. Verify WhatsApp links open correctly
7. Run Lighthouse audit — target ≥ 90 Performance, 100 Accessibility

---

## 7. Rollback

GitHub Pages serves the last successful deploy. To rollback:

```sh
git revert HEAD           # or specific commit
git push origin main
```

The previous service worker cache will be cleared automatically when the new SW version loads.

---

## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Blank page after deploy | SW cached stale build | Hard refresh or clear site data |
| Auth providers not loading | Missing GitHub secrets | Check secrets in repo settings |
| Supabase writes fail | Anon key expired or wrong | Regenerate key in Supabase dashboard |
| Build fails at SRI | Asset hash changed | `npm run sri` and commit updated hashes |
| 404 on subpages | Pages routing | Confirm `public/_headers` has `/*` route |

# Secrets Rotation Runbook

> Last reviewed: 2026-04-27 · Owner: release-engineer · Rotation cadence: 90 days

This runbook documents the 90-day secrets rotation process for all
credentials used by Wedding Manager.

## Secret inventory

| Secret name | Where stored | Scope | Rotation cadence |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | GitHub Secrets + `.env.local` | Project | On project recreation |
| `VITE_SUPABASE_ANON_KEY` | GitHub Secrets + `.env.local` | Project | 90 days |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets (CI only) | Project | 90 days |
| `VITE_GOOGLE_CLIENT_ID` | GitHub Secrets + `src/core/config.js` | OAuth | 90 days or on compromise |
| `VITE_FB_APP_ID` | GitHub Secrets + `src/core/config.js` | OAuth | 90 days |
| `VITE_APPLE_SERVICE_ID` | GitHub Secrets + `src/core/config.js` | OAuth | 90 days |
| `VITE_SENTRY_DSN` | GitHub Secrets + `.env.local` | Monitoring (opt-in) | On project recreation |
| `VITE_VAPID_PUBLIC_KEY` | GitHub Secrets + `.env.local` | Web Push | 90 days |
| `VAPID_PRIVATE_KEY` | GitHub Secrets (CI + edge fn) | Web Push | 90 days |
| `GITHUB_TOKEN` | Auto-provisioned by Actions | CI | N/A (auto-rotated) |

---

## Rotation procedure

### A. Supabase anon + service-role keys

> Rotating these does **not** affect stored data. Existing user sessions are
> invalidated — a brief sign-in prompt is expected for all users.

1. Open [Supabase dashboard → Project Settings → API](https://app.supabase.com/).
2. Click **"Reveal"** next to the `anon` key. Copy to clipboard — it has not changed yet.
3. Click **"Rotate keys"** → confirm. Two new keys are generated (`anon` + `service_role`).
4. Update GitHub Secrets:
   - `Settings → Secrets → Actions → VITE_SUPABASE_ANON_KEY` → paste new anon key.
   - `SUPABASE_SERVICE_ROLE_KEY` → paste new service role key.
5. Update local `.env.local` with the new values.
6. Re-deploy: push an empty commit (`git commit --allow-empty -m "chore: rotate supabase keys"`) or
   re-run the most recent deploy workflow run.
7. Smoke-test: anonymous RSVP, admin login, Supabase write round-trip (guest save → reload).
8. Record rotation in the **Drill log** below.

---

### B. Google OAuth Client ID

> Client ID rotation requires an app re-verification window — do this during
> low-traffic hours.

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Select the OAuth 2.0 client used for Wedding Manager.
3. Create a new client ID (same redirect URIs). Do **not** delete the old one yet.
4. Update `VITE_GOOGLE_CLIENT_ID` in GitHub Secrets and `.env.local`.
5. Re-deploy (CI picks up the new value at build time via `inject-config.mjs`).
6. Verify: sign in with Google on the deployed URL.
7. Delete the old client ID from Google Cloud Console after 24 h.
8. Record in Drill log.

---

### C. Facebook App ID

1. Open [Meta for Developers → App Settings → Basic](https://developers.facebook.com/).
2. Regenerate the **App Secret** (not the App ID — App ID is public and stable).
3. If the App ID itself needs rotation (after a breach), create a new app:
   - Add the same Facebook Login product and redirect URIs.
   - Update `VITE_FB_APP_ID` in GitHub Secrets and `.env.local`.
   - Re-deploy and verify.
4. Record in Drill log.

---

### D. Apple Service ID

1. Open [Apple Developer Portal → Certificates, IDs & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId).
2. Apple Service IDs cannot be rotated — if compromised, create a new one:
   - Register a new Service ID under the same Team ID.
   - Update `VITE_APPLE_SERVICE_ID` in GitHub Secrets, `.env.local`, and
     `src/core/config.js`.
   - Re-deploy.
3. For the associated private key (Sign in with Apple key):
   - Keys can be revoked but **not** regenerated for the same Key ID.
   - Create a new key, update any edge-function that uses it.
4. Record in Drill log.

---

### E. VAPID keys (Web Push)

> VAPID key rotation invalidates **all existing push subscriptions** — all
> opted-in users will stop receiving notifications and must re-subscribe.
> Do this during a version bump; notify users in advance via in-app toast.

1. Generate new VAPID key pair:

   ```bash
   npx web-push generate-vapid-keys --json
   ```

2. Update GitHub Secrets:
   - `VITE_VAPID_PUBLIC_KEY` → new public key.
   - `VAPID_PRIVATE_KEY` → new private key (edge function only, never in bundle).
3. Re-deploy (CI injects public key at build time).
4. On next app load, all push subscriptions are silently invalid. The
   `push-manager.js` re-subscription flow triggers automatically on the next
   notification attempt.
5. Record in Drill log.

---

### F. Sentry DSN (monitoring)

> DSN rotation has no user impact. Rate-limited events from the old DSN stop
> flowing; new events route to the new DSN.

1. Open [Sentry / Glitchtip → Project Settings → Client Keys](https://sentry.io).
2. Revoke the old DSN key.
3. Create a new key and copy the DSN.
4. Update `VITE_SENTRY_DSN` in GitHub Secrets and `.env.local`.
5. Re-deploy.
6. Verify: trigger a test error in the app and confirm it appears in Sentry/Glitchtip.
7. Record in Drill log.

---

## Post-rotation checklist

- [ ] All GitHub Secrets updated
- [ ] Local `.env.local` updated
- [ ] CI re-run green (lint + test + build)
- [ ] Smoke-test: RSVP, admin login, write round-trip
- [ ] Drill log entry added below with date + engineer initials

---

## Drill log

| Date | Secret(s) rotated | Engineer | Notes |
| --- | --- | --- | --- |
| 2026-04-27 | (initial baseline — no rotation yet) | — | First rotation runbook created |

---

## Emergency rotation (breach response)

If a secret is suspected compromised:

1. **Immediately** revoke the secret via the provider's dashboard (do not wait for the normal cadence).
2. Follow the relevant procedure above.
3. File a post-incident report in `docs/operations/incident-response.md`.
4. If user data may have been accessed: notify affected users within 72 hours per GDPR Article 33.

---

## See also

- [disaster-recovery.md](disaster-recovery.md) — full data-plane recovery
- [incident-response.md](incident-response.md) — severity matrix and comms template
- [SECURITY.md](../../SECURITY.md) — vulnerability disclosure policy

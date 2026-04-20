# Integrations Overview

> **Wedding Manager** — External service integrations

## Available Integrations

| Integration | Status | Purpose | Docs |
|------------|--------|---------|------|
| **Supabase** | ✅ Production | Database, Auth, Real-time | [supabase.md](supabase.md) |
| **WhatsApp** | ✅ Production | Guest communication via wa.me links | See WhatsApp section |
| **Google OAuth** | ✅ Production | Admin sign-in | `src/services/auth.js` |
| **Facebook OAuth** | ✅ Production | Admin sign-in | `src/services/auth.js` |
| **Apple OAuth** | ✅ Production | Admin sign-in | `src/services/auth.js` |
| **Google Sheets** | ⚠️ Legacy | CSV export reference | `src/services/sheets-impl.js` |
| **Service Worker** | ✅ Production | Offline support + push notifications | `public/sw.js` |

---

## Backend Modes

`BACKEND_TYPE` in `src/core/config.js` controls which backend is active:

| Value | Behavior |
|-------|---------|
| `"supabase"` | Full cloud sync, audit log, error log |
| `"none"` | localStorage only, no network calls |

Default is `"supabase"` when `VITE_SUPABASE_URL` is set in the build environment.

---

## Authentication Flow

```text
User visits site
    ↓
Guest auto-login (anonymous, RSVP-only)
    ↓
Admin clicks "Sign In"
    ↓
OAuth provider (Google / Facebook / Apple) or email
    ↓
isApprovedAdmin(email) check against ADMIN_EMAILS allowlist
    ↓
✅ Admin access granted — all sections unlocked
❌ Not in allowlist — shown error, guest access remains
```

---

## WhatsApp Integration

WhatsApp links are generated using the international `wa.me` deep-link format:

```js
import { cleanPhone } from "../utils/phone.js";
const phone = cleanPhone("054-123-4567"); // → "972541234567"
const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
```

`cleanPhone()` converts Israeli `05X` numbers to `+972` format automatically. No WhatsApp API key required — links open WhatsApp directly on mobile/desktop.

---

## Offline Support

The service worker (`public/sw.js`) caches all static assets and enables offline use. When offline:

- Guests can view the landing/invitation page
- RSVP submissions are queued in `offline-queue.js` and flushed on reconnect
- Admin data remains available from the last sync (localStorage)

The `initSW()` function in `src/core/ui.js` detects new deployments and shows a banner prompting users to reload.

---

## Adding a New Integration

1. Create `src/services/<name>.js` with the integration logic
2. Use `BACKEND_TYPE` guard if it only applies to one backend
3. All network calls must be fire-and-forget or go through the write queue
4. Add a doc file to `docs/integrations/<name>.md`
5. Update this overview table

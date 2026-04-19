---
applyTo: "supabase/**,src/services/supabase*.js,src/core/supabase-client.js"
---

# Supabase Conventions — Wedding Manager

## Client Initialization
- The singleton client lives in `src/core/supabase-client.js`. Import from there:
  ```js
  import { getSupabaseClient } from '../core/supabase-client.js';
  ```
- Never instantiate `createClient()` outside `supabase-client.js`.
- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are non-empty before calling `getSupabaseClient()`.

## Backend Selection
- `BACKEND_TYPE` in `src/core/config.js` controls which backend is active (`'supabase'` | `'sheets'` | `'none'`).
- All Supabase calls must be guarded: if `BACKEND_TYPE !== 'supabase'` → skip or fall back to localStorage.
- Use `src/services/backend.js` as the routing layer — do NOT call Supabase directly from section modules.

## RLS (Row Level Security)
- Every table in `supabase/migrations/` must have RLS enabled.
- Policy naming: `<table>_<role>_<action>`, e.g. `guests_admin_select`.
- Anon users: read-only access to RSVP-related tables only.
- Admin users: identified by JWT `email` claim matching `ADMIN_EMAILS` allowlist.

## Edge Functions
- Supabase Edge Functions live in `supabase/functions/<name>/index.ts`.
- Each function must validate its `Authorization` header against the service role key or a signed JWT.
- Return structured JSON: `{ data: ..., error: null }` on success; `{ data: null, error: { message: '...' } }` on failure.
- Timeout: max 10 seconds per function invocation.

## Realtime
- Subscribe only when the relevant section is mounted; unsubscribe in `unmount()`.
- Channel naming: `wedding:<table>:<event_id>`.
- Never subscribe to realtime in scripts or background workers.

## Migrations
- Migration files: `supabase/migrations/<timestamp>_<description>.sql`.
- Every migration must be idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Test locally with `supabase db reset` before committing.

## Security
- Never log or expose `service_role` key in client code.
- Store secrets only in GitHub Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- `scripts/inject-config.mjs` injects values at build time — never hardcode in source.

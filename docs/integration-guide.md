# Supabase Integration Guide — Wedding Manager

> Covers environment setup, repository pattern usage, auth, Edge Functions,
> and RLS policy setup.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Client Initialisation](#client-initialisation)
3. [Repository Pattern](#repository-pattern)
4. [Auth + JWT Claims](#auth--jwt-claims)
5. [Edge Functions](#edge-functions)
6. [RLS Policy Setup](#rls-policy-setup)
7. [Health Checks](#health-checks)

---

## Environment Setup

Create a `.env.local` file at the project root (git-ignored):

```ini
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

For CI/CD add these as GitHub repository secrets.  Server-side operations
(migrations, GDPR erasure) use `SUPABASE_SERVICE_ROLE_KEY` — never expose
this key to the browser.

---

## Client Initialisation

The application creates one shared Supabase client in `src/services/supabase.js`:

```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

All services import `supabase` from this module rather than creating new
instances.

---

## Repository Pattern

All database access goes through typed repository classes that extend
`SupabaseBaseRepository`.  This keeps query logic in one place and makes
testing straightforward with mock clients.

### Available repositories

| Repository | Table | Key methods |
|------------|-------|-------------|
| `SupabaseGuestRepository` | `guests` | `findByStatus`, `findByPhone`, `confirmedCount` |
| `SupabaseTableRepository` | `tables` | `findByShape`, `totalCapacity` |
| `SupabaseVendorRepository` | `vendors` | `findByCategory`, `outstanding` |
| `SupabaseExpenseRepository` | `expenses` | `summaryByCategory`, `totalAmount` |
| `SupabaseRsvpLogRepository` | `rsvp_log` | `logRsvp`, `findRecent` |

### Typical usage

```js
import { SupabaseGuestRepository }
  from "./repositories/supabase-guest-repository.js";

const repo = new SupabaseGuestRepository(supabase, "event-2025");

// Find all confirmed guests
const confirmed = await repo.findByStatus("confirmed");

// Create a new guest
const guest = await repo.create({
  first_name: "Alice", last_name: "Smith",
  phone: "+972541234567", count: 2, status: "pending",
});

// Soft-delete (sets deleted_at, not a physical DELETE)
await repo.delete(guest.id);
```

### Writing tests with a mock client

Use the flat chainable mock from the test suite.  See
[tests/unit/supabase-repositories.test.mjs](../tests/unit/supabase-repositories.test.mjs)
for the full pattern.

```js
const supabase = makeMockSupabase([{ id: "g1", status: "confirmed" }]);
const repo = new SupabaseGuestRepository(supabase);
const rows  = await repo.findByStatus("confirmed");
expect(rows).toHaveLength(1);
```

---

## Auth + JWT Claims

Admin authentication is validated by checking the JWT claims embedded in
the Supabase session token.

```js
import { hasRole, isEventOwner, isTokenExpired }
  from "./services/auth-claims.js";

const session = await supabase.auth.getSession();

if (isTokenExpired(session.data.session)) {
  // Redirect to login
}

if (hasRole(session.data.session, "admin")) {
  // Show admin controls
}
```

### Custom claims setup (Supabase dashboard)

Add a database hook that injects `role` and `event_id` into the JWT:

```sql
-- auth hook function (runs on every token mint)
CREATE OR REPLACE FUNCTION auth.custom_claims(uid UUID)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'role',     u.role,
    'event_id', u.event_id
  )
  FROM   public.user_profiles u
  WHERE  u.id = uid;
$$;
```

---

## Edge Functions

Edge Functions live in `supabase/functions/` and are deployed via the
Supabase CLI.

### Deploy all functions

```bash
supabase functions deploy
```

### Deploy a specific function

```bash
supabase functions deploy csp-report
```

### Available functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `csp-report` | POST `/functions/v1/csp-report` | Ingest browser CSP violation reports |

### Setting function secrets

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
```

---

## RLS Policy Setup

Every table **must** have RLS enabled and at least one SELECT policy.

### Enable RLS on a table

```sql
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
```

### Example policies

```sql
-- Admins can read/write all guests for their event
CREATE POLICY "admin_read_guests" ON guests
  FOR SELECT USING (
    auth.jwt() ->> 'event_id' = event_id::text
    AND auth.jwt() ->> 'role' = 'admin'
  );

-- Guests can read their own row during RSVP
CREATE POLICY "guest_read_own" ON guests
  FOR SELECT USING (
    phone = auth.jwt() ->> 'phone'
  );
```

### Verify programmatically

```js
import { verifyRlsEnabled } from "./services/rls-audit.js";
const { ok, missing } = await verifyRlsEnabled(supabase);
```

---

## Health Checks

```js
import { checkSupabaseHealth, getHealthReport }
  from "./services/supabase-health.js";

// Basic ping
const { ok, latencyMs } = await checkSupabaseHealth(supabase);

// Per-table status
const report = await getHealthReport(supabase);
```

See [docs/runbooks/ops-runbook.md](runbooks/ops-runbook.md#health-check) for
troubleshooting guidance.

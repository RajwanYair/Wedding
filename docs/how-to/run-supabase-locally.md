# How-to: Run Supabase locally

> Diátaxis: how-to. For deployment ops see
> [docs/operations/deploy-runbook.md](../operations/deploy-runbook.md).
> For migrations see [docs/operations/migrations.md](../operations/migrations.md).

This recipe sets up a local Supabase instance for development against
the same schema we run in production.

## When to use

- Hacking on edge functions without paying round-trip latency.
- Reproducing a Sev-2 data-corruption bug against a snapshot.
- Running the full integration test suite without touching production.

## You will need

- Docker Desktop (Windows / macOS) or Docker Engine (Linux).
- Supabase CLI ≥ 1.150 — install from <https://supabase.com/docs/guides/cli>.
- ~4 GB of disk space for the Postgres image and migrations.

## Steps

### 1. Install the CLI

Windows (Chocolatey):

```powershell
choco install supabase -y
```

macOS / Linux:

```bash
brew install supabase/tap/supabase
```

Verify:

```bash
supabase --version
```

### 2. Start the stack

From the repository root:

```bash
supabase start
```

The first run downloads ~2 GB of images. Subsequent starts are seconds.
The CLI prints local URLs:

```text
API URL:        http://localhost:54321
Studio URL:     http://localhost:54323
DB URL:         postgresql://postgres:postgres@localhost:54322/postgres
anon key:       eyJ...
service_role:   eyJ...
```

### 3. Apply migrations

Migrations live in `supabase/migrations/`. Apply them locally:

```bash
supabase db reset
```

This drops the local DB and re-runs every migration in order. It is
idempotent and safe — local data only.

### 4. Point the app at your local stack

Create a `.env.local` (gitignored) with the values printed in step 2:

```dotenv
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev` so `inject-config.mjs` picks up the new values.

### 5. Seed test data

```bash
supabase db remote commit --schema public
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f tests/fixtures/seed-dev.sql
```

The seed file (under `tests/fixtures/`) creates 10 guests, 3 tables,
and 5 vendors so you can exercise the UI immediately.

### 6. Hot-reload edge functions

```bash
supabase functions serve <function-name> --no-verify-jwt
```

Edge functions hot-reload on file change. JWT verification is off in
local dev only.

### 7. Stop the stack

```bash
supabase stop
```

This persists the data volume; `supabase start` resumes where you left
off. To wipe completely: `supabase stop --no-backup`.

## Troubleshooting

| Symptom                            | Likely cause                          | Fix                                          |
| ---------------------------------- | ------------------------------------- | -------------------------------------------- |
| `supabase start` hangs on `db`     | Port 54322 occupied                    | `supabase stop` then retry; or change port. |
| Migrations fail on a fresh reset   | One migration depends on data         | Open the offending file; add `IF EXISTS` guards or split into a seed file. |
| Studio shows "no rows"             | App points at hosted Supabase still   | Confirm `.env.local` is the active env.      |
| Edge function 500s with auth error | `--no-verify-jwt` not set             | Pass the flag in dev only; never in prod.    |

## See also

- [docs/operations/migrations.md](../operations/migrations.md)
- [docs/integrations/supabase.md](../integrations/supabase.md)
- [supabase/migrations/](../../supabase/migrations/)

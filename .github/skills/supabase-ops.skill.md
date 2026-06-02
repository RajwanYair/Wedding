---
description: "Supabase operations: migrations, RLS policies, edge functions, realtime subscriptions, and storage rules."
---

# Supabase Operations Skill

## Schema & Migrations

- Migrations live in `supabase/migrations/` — numbered sequentially
- Every migration must be idempotent (`IF NOT EXISTS`, `IF EXISTS`)
- Always include both UP and DOWN logic (commented DOWN at bottom)
- All tables require RLS enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Use `supabase db diff` to generate migration from local changes

## RLS Policies

- Every table must have at least one SELECT policy
- Admin access: `auth.jwt() ->> 'email' = ANY('{admin@example.com}'::text[])`
- Guest access: scope to `auth.uid()` matching `user_id` column
- Quarterly audit: `npm run audit:db` checks all tables have policies

## Edge Functions

- Live in `supabase/functions/` — one folder per function
- Runtime: Deno (TypeScript)
- Must NOT import from `src/` — separate bundle
- Use `supabase functions serve` for local dev
- Deploy: `supabase functions deploy <name>`

## Realtime

- Subscriptions use `supabase.channel()` API
- Always unsubscribe in section `unmount()` — no leaks
- Presence for multi-user features (co-edit, live RSVP)

## Storage

- Bucket policies mirror RLS — scope to authenticated user
- Image transforms via Supabase Image Transformation API
- Public bucket for wedding assets; private for PII docs

## Local Dev

```bash
supabase start          # Local Postgres + Auth + Storage
supabase db reset       # Apply all migrations fresh
supabase functions serve # Local edge function server
```

## CI Integration

- `npm run audit:db` — lint migration files
- `npm run audit:migrations` — validate migration sequence
- Supabase MCP server (read-only) available in VS Code chat

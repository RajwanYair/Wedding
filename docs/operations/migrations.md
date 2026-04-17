# Database Migrations Guide

> **Wedding Manager** — Supabase migration management

## Overview

All database schema changes are tracked as numbered SQL migration files in `supabase/migrations/`. Migrations are applied sequentially and are **never re-applied** once the database has been updated.

---

## Migration File Convention

```
supabase/migrations/NNN_description.sql
```

- `NNN` — zero-padded 3-digit sequence number (001, 002, … 014, …)
- `description` — snake_case summary of what the migration does
- Each file is idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ADD CONSTRAINT IF NOT EXISTS`)

---

## Current Migration Inventory

| File | Description |
|------|-------------|
| `001_create_tables.sql` | All core tables: guests, tables, vendors, expenses, budget, timeline, contacts, gallery, config, rsvp_log |
| `002_rls_policies.sql` | Row Level Security: anon read + authenticated write |
| `003_triggers.sql` | `set_updated_at()` trigger on mutable tables |
| `004_audit_log.sql` | `audit_log` table + insert trigger |
| `005_error_log.sql` | `error_log` table for client error capture |
| `006_weddinginfo_config.sql` | Pre-seed `config` table with wedding info keys |
| `007_fk_guests_table_id.sql` | FK `guests.table_id → tables.id` |
| `008_unique_guest_phone.sql` | Unique partial index on `guests.phone` (non-empty) |
| `009_soft_delete.sql` | `deleted_at` column on guests + views for active guests |
| `010_pagination_indexes.sql` | Indexes on `created_at`, `updated_at`, status, side, group for pagination performance |
| `011_vendor_category_constraint.sql` | CHECK on `vendors.category` — 16 valid values |
| `012_expense_category_constraint.sql` | CHECK on `expenses.category` — 16 valid values |
| `013_rsvp_log_constraints.sql` | ADD COLUMN children+notes + CHECK on status+source |
| `014_contacts_side_and_config_jsonb.sql` | CHECK on `contacts.side` + ADD COLUMN config.json_value JSONB |

---

## Applying Migrations

### Via Supabase CLI (recommended for staging/production)

```sh
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

### Via Supabase SQL Editor (manual)

1. Open Supabase dashboard → SQL Editor
2. Paste the SQL file content
3. Click "Run"
4. Verify no errors in the output

### Order matters

Always apply migrations in numeric order. If you need to re-run a specific migration on a fresh database, apply them all from 001 onward.

---

## Writing a New Migration

1. Determine the next sequence number (check `supabase/migrations/` for highest existing number)
2. Create `NNN_short_description.sql`
3. Use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency
4. Add a header comment with migration number, purpose, and the sprint it belongs to
5. Update this doc's inventory table
6. Apply to local dev database and verify
7. Commit alongside the code change that requires it

### Template

```sql
-- supabase/migrations/NNN_description.sql
-- Sprint N — Brief description of what this migration does

-- Your SQL here
ALTER TABLE tablename
  ADD COLUMN IF NOT EXISTS column_name TYPE NOT NULL DEFAULT value;
```

---

## Rollback Policy

Supabase does **not** auto-rollback migrations. To undo a change:

1. Write a new `NNN+1_revert_NNN_description.sql` that reverses the change
2. Apply it as a forward migration
3. Never delete or modify already-applied migration files

---

## Production Safety Rules

- Never `DROP TABLE` or `DROP COLUMN` without a deprecation window
- Always test on a staging project before applying to production
- Take a Supabase database backup before any destructive `ALTER TABLE`
- Verify RLS policies after every schema change

-- supabase/migrations/025_fix_unique_index_idempotent.sql
-- S304 (v13.12.0) — Re-creates the idx_guests_phone_unique index idempotently
-- to satisfy the audit-supabase-lint.mjs IF NOT EXISTS gate (ADR-043).
--
-- Migration 008 used a bare CREATE UNIQUE INDEX (without IF NOT EXISTS) which
-- is not idempotent. Postgres does not support `CREATE UNIQUE INDEX IF NOT EXISTS`
-- but wrapping in a DO block achieves the same guard.
--
-- This migration is safe to re-run: the DO block checks pg_indexes before
-- attempting to create the index.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'guests'
      AND indexname  = 'idx_guests_phone_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_guests_phone_unique
      ON public.guests (phone)
      WHERE phone <> '';

    COMMENT ON INDEX idx_guests_phone_unique IS
      'Enforces unique phone numbers; empty-string phones are excluded (multiple allowed). Re-created idempotently in 025.';
  END IF;
END $$;

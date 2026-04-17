-- supabase/migrations/015_tables_expenses_soft_delete.sql
-- Phase 3 — Sprint 23: Soft delete support for tables and expenses
--
-- Adds `deleted_at TIMESTAMPTZ NULL` to tables and expenses, mirroring
-- the guest and vendor columns introduced in migration 009.
--
-- Application code filters WHERE deleted_at IS NULL in normal queries.
-- Migration is idempotent: uses ADD COLUMN IF NOT EXISTS.

-- ── Tables ────────────────────────────────────────────────────────────────
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN tables.deleted_at IS
  'Soft-delete timestamp. NULL = active. Set to now() to soft-delete.';

CREATE INDEX IF NOT EXISTS idx_tables_deleted_at
  ON tables (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── Expenses ──────────────────────────────────────────────────────────────
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN expenses.deleted_at IS
  'Soft-delete timestamp. NULL = active. Set to now() to soft-delete.';

CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at
  ON expenses (deleted_at)
  WHERE deleted_at IS NOT NULL;

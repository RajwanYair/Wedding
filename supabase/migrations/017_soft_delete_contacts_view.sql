-- supabase/migrations/017_soft_delete_contacts_view.sql
-- Sprint 71: Soft delete for contacts table + active_* views for each domain
--
-- Adds `deleted_at` to contacts (not covered by 009/015).
-- Creates `active_guests`, `active_tables`, `active_expenses` views to
-- simplify queries — avoids repeating `WHERE deleted_at IS NULL` everywhere.
-- All views are security_invoker = true so RLS policies on base tables apply.

-- ── Contacts soft delete ──────────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN contacts.deleted_at IS
  'Soft-delete timestamp. NULL = active. Set to NOW() to soft-delete.';

CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at
  ON contacts (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── Helpers: active-record views ──────────────────────────────────────────

-- Drop views if they already exist (idempotent re-runs)
DROP VIEW IF EXISTS active_guests   CASCADE;
DROP VIEW IF EXISTS active_tables   CASCADE;
DROP VIEW IF EXISTS active_expenses CASCADE;
DROP VIEW IF EXISTS active_contacts CASCADE;
DROP VIEW IF EXISTS active_vendors  CASCADE;

CREATE VIEW active_guests WITH (security_invoker = true) AS
  SELECT * FROM guests   WHERE deleted_at IS NULL;

CREATE VIEW active_tables WITH (security_invoker = true) AS
  SELECT * FROM tables   WHERE deleted_at IS NULL;

CREATE VIEW active_expenses WITH (security_invoker = true) AS
  SELECT * FROM expenses WHERE deleted_at IS NULL;

CREATE VIEW active_contacts WITH (security_invoker = true) AS
  SELECT * FROM contacts WHERE deleted_at IS NULL;

CREATE VIEW active_vendors WITH (security_invoker = true) AS
  SELECT * FROM vendors  WHERE deleted_at IS NULL;

-- ── Purge helper: hard-delete records soft-deleted more than N days ago ───

-- Function signature: purge_deleted(days_old INT DEFAULT 90)
CREATE OR REPLACE FUNCTION purge_deleted(days_old INT DEFAULT 90)
RETURNS TABLE (table_name TEXT, purged BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - (days_old || ' days')::INTERVAL;
  n BIGINT;
BEGIN
  -- Guests
  DELETE FROM guests   WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'guests';   purged := n; RETURN NEXT;

  -- Tables
  DELETE FROM tables   WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'tables';   purged := n; RETURN NEXT;

  -- Expenses
  DELETE FROM expenses WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'expenses'; purged := n; RETURN NEXT;

  -- Contacts
  DELETE FROM contacts WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'contacts'; purged := n; RETURN NEXT;

  -- Vendors
  DELETE FROM vendors  WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT;
  table_name := 'vendors';  purged := n; RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION purge_deleted(INT) IS
  'Hard-deletes soft-deleted records older than days_old days (default 90). '
  'Returns per-table purge counts. Call as admin only.';

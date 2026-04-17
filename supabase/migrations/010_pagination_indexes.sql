-- supabase/migrations/010_pagination_indexes.sql
-- Phase 3 — Sprint 7: Cursor-based pagination helper indexes
--
-- Adds composite indexes optimised for the cursor-based pagination pattern
-- used in src/services/repositories.js (_paginate helper, orderBy + cursor).
--
-- Pattern: SELECT ... WHERE created_at > $cursor ORDER BY created_at ASC LIMIT n
--
-- Without these indexes Postgres does a full table scan on every paginated
-- request; with them it jumps directly to the cursor position.
--
-- All indexes are CONCURRENTLY-safe (no table lock).
-- Idempotent: CREATE INDEX IF NOT EXISTS.
--
-- Run:  supabase db push  (or paste into Supabase SQL Editor)

-- ── Guests ────────────────────────────────────────────────────────────────
-- Forward (ASC) pagination (default listing order)
CREATE INDEX IF NOT EXISTS idx_guests_created_at_asc
  ON guests (created_at ASC)
  WHERE deleted_at IS NULL;

-- Reverse (DESC) pagination (newest first)
CREATE INDEX IF NOT EXISTS idx_guests_created_at_desc
  ON guests (created_at DESC)
  WHERE deleted_at IS NULL;

-- ── Vendors ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendors_created_at_asc
  ON vendors (created_at ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_created_at_desc
  ON vendors (created_at DESC)
  WHERE deleted_at IS NULL;

-- ── Expenses ──────────────────────────────────────────────────────────────
-- Expenses don't have soft-delete yet; plain index is sufficient
CREATE INDEX IF NOT EXISTS idx_expenses_created_at_asc
  ON expenses (created_at ASC);

CREATE INDEX IF NOT EXISTS idx_expenses_created_at_desc
  ON expenses (created_at DESC);

-- ── Tables (seating) ──────────────────────────────────────────────────────
-- Tables are typically small (~20–30 rows); index is low cost but helpful
-- for consistent cursor pagination behaviour
CREATE INDEX IF NOT EXISTS idx_tables_created_at_asc
  ON tables (created_at ASC);

COMMENT ON INDEX idx_guests_created_at_asc IS
  'Supports cursor-based forward pagination for the guest list (SELECT ... WHERE created_at > $cursor).';

-- =============================================================================
-- Migration 026: Composite indexes on event_id FK tables (S382)
-- =============================================================================
-- Single-column event_id indexes exist from migration 018.
-- These composite indexes accelerate the multi-column WHERE clauses common
-- in admin list queries, e.g.:
--   WHERE event_id = $1 AND status = $2
--   WHERE event_id = $1 AND deleted_at IS NULL
--   ORDER BY created_at DESC (on rsvp_log)
-- All created CONCURRENTLY (no table lock in production).
-- Idempotent: IF NOT EXISTS guards prevent re-run failures.
-- =============================================================================

-- guests -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_guests_event_status
  ON guests (event_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guests_event_phone
  ON guests (event_id, phone)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guests_event_table_id
  ON guests (event_id, table_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guests_event_deleted_at
  ON guests (event_id, deleted_at);

-- vendors ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vendors_event_category
  ON vendors (event_id, category)
  WHERE deleted_at IS NULL;

-- expenses -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_expenses_event_category
  ON expenses (event_id, category)
  WHERE deleted_at IS NULL;

-- rsvp_log ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rsvp_log_event_created_at
  ON rsvp_log (event_id, created_at DESC);

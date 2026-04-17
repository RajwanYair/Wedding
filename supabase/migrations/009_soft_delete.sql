-- supabase/migrations/009_soft_delete.sql
-- Phase 3 — Sprint 7: Soft delete support for guests and vendors
--
-- Adds `deleted_at TIMESTAMPTZ NULL` to guests and vendors.
-- NULL means the row is active; a timestamp means it has been soft-deleted.
--
-- Benefits:
--   • Audit trail — know *when* a guest or vendor was removed
--   • Undo support — records can be restored by setting deleted_at back to NULL
--   • RSVP log integrity — rsvp_log entries retain their guest_id reference
--
-- RLS impact: existing admin_all policies still grant access to all rows,
-- including soft-deleted ones.  Application code (src/services/repositories.js)
-- is responsible for filtering WHERE deleted_at IS NULL in normal queries.
--
-- Run:  supabase db push  (or paste into Supabase SQL Editor)
--       Idempotent: uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

-- ── Guests ────────────────────────────────────────────────────────────────
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN guests.deleted_at IS
  'Soft-delete timestamp. NULL = active. Set to now() to soft-delete; restore by setting to NULL.';

CREATE INDEX IF NOT EXISTS idx_guests_deleted_at
  ON guests (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── Vendors ───────────────────────────────────────────────────────────────
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN vendors.deleted_at IS
  'Soft-delete timestamp. NULL = active. Set to now() to soft-delete; restore by setting to NULL.';

CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at
  ON vendors (deleted_at)
  WHERE deleted_at IS NOT NULL;

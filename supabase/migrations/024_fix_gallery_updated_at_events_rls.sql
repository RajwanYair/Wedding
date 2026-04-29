-- 024_fix_gallery_updated_at_events_rls.sql
-- Sprint S243 — Fix audit-supabase-migrations issues:
--   1. Add updated_at to gallery table (was missing, causing asymmetry with created_at)
--   2. Enable RLS on events table (created in 018 without ENABLE ROW LEVEL SECURITY)

-- ── gallery: add updated_at ───────────────────────────────────────────────
ALTER TABLE gallery
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── events: enable RLS ───────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow owners to read/write their own events; service role bypasses RLS.
CREATE POLICY IF NOT EXISTS "events_owner_all"
  ON events
  FOR ALL
  USING (owner_email = auth.email() OR auth.role() = 'service_role')
  WITH CHECK (owner_email = auth.email() OR auth.role() = 'service_role');

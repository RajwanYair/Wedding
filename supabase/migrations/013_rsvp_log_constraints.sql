-- supabase/migrations/013_rsvp_log_constraints.sql
-- Sprint 16 — CHECK constraints + missing columns for rsvp_log

-- Add columns that were missing from the original 001 migration
ALTER TABLE rsvp_log
  ADD COLUMN IF NOT EXISTS children  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes     TEXT    NOT NULL DEFAULT '';

-- Add CHECK constraints on status and source
ALTER TABLE rsvp_log
  ADD CONSTRAINT rsvp_log_status_check
    CHECK (status IN ('pending', 'confirmed', 'declined', 'maybe')),
  ADD CONSTRAINT rsvp_log_source_check
    CHECK (source IN ('web', 'manual', 'import'));

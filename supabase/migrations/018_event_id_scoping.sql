-- supabase/migrations/018_event_id_scoping.sql
-- Sprint 72: Multi-event support — add event_id FK to all domain tables
--
-- This migration adds multi-tenancy at the "event" level.  A single Supabase
-- project can host multiple wedding events.  Each row is scoped to an event
-- via a foreign key to the `events` table introduced here.
--
-- Strategy:
--   1. Create `events` table.
--   2. Add `event_id TEXT NOT NULL DEFAULT 'default'` to every domain table.
--   3. Add a compound PK-unique index so (id, event_id) remains unique per event.
--   4. Add FK constraints with ON DELETE CASCADE.
--   5. Update RLS helper function to scope queries to the current event.
--
-- Migration is idempotent (IF NOT EXISTS / IF NOT EXISTS guards everywhere).

-- ── Events master table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL DEFAULT '',
  owner_email TEXT NOT NULL DEFAULT '',
  date        DATE DEFAULT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE events IS
  'One row per wedding event. All domain tables are scoped to an event_id.';

-- Ensure a default event exists for upgraded databases
INSERT INTO events (id, name, owner_email, active)
  VALUES ('default', 'My Wedding', '', TRUE)
  ON CONFLICT (id) DO NOTHING;

-- ── Add event_id to domain tables ─────────────────────────────────────────

-- Guests
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_guests_event_id
  ON guests (event_id);

-- Tables (seating)
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tables_event_id
  ON tables (event_id);

-- Vendors
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vendors_event_id
  ON vendors (event_id);

-- Expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expenses_event_id
  ON expenses (event_id);

-- Contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contacts_event_id
  ON contacts (event_id);

-- Timeline
ALTER TABLE timeline
  ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_timeline_event_id
  ON timeline (event_id);

-- ── RLS helper: current event ─────────────────────────────────────────────

-- Returns the event_id stored in the JWT claim or falls back to 'default'.
CREATE OR REPLACE FUNCTION current_event_id()
RETURNS TEXT
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', TRUE)::JSONB ->> 'event_id',
    'default'
  );
$$;

COMMENT ON FUNCTION current_event_id() IS
  'Returns the event_id from the JWT claims (for RLS scoping). Falls back to ''default''.';

-- ── Recreate active_* views with event_id filter ──────────────────────────

DROP VIEW IF EXISTS active_guests   CASCADE;
DROP VIEW IF EXISTS active_tables   CASCADE;
DROP VIEW IF EXISTS active_expenses CASCADE;
DROP VIEW IF EXISTS active_contacts CASCADE;
DROP VIEW IF EXISTS active_vendors  CASCADE;

CREATE VIEW active_guests WITH (security_invoker = true) AS
  SELECT * FROM guests
  WHERE deleted_at IS NULL AND event_id = current_event_id();

CREATE VIEW active_tables WITH (security_invoker = true) AS
  SELECT * FROM tables
  WHERE deleted_at IS NULL AND event_id = current_event_id();

CREATE VIEW active_expenses WITH (security_invoker = true) AS
  SELECT * FROM expenses
  WHERE deleted_at IS NULL AND event_id = current_event_id();

CREATE VIEW active_contacts WITH (security_invoker = true) AS
  SELECT * FROM contacts
  WHERE deleted_at IS NULL AND event_id = current_event_id();

CREATE VIEW active_vendors WITH (security_invoker = true) AS
  SELECT * FROM vendors
  WHERE deleted_at IS NULL AND event_id = current_event_id();

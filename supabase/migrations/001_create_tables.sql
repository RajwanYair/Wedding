-- supabase/migrations/001_create_tables.sql
-- F2.2.1 — SQL migration for all Wedding Manager tables
-- Run: supabase db push  (or paste into Supabase SQL Editor)
--
-- Tables: guests, tables, vendors, expenses, budget, timeline,
--         contacts, gallery, config, rsvp_log

-- ── Guests ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id          TEXT PRIMARY KEY,
  first_name  TEXT NOT NULL DEFAULT '',
  last_name   TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 1,
  children    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'maybe')),
  side        TEXT NOT NULL DEFAULT 'mutual'
    CHECK (side IN ('groom', 'bride', 'mutual')),
  "group"     TEXT NOT NULL DEFAULT 'other'
    CHECK ("group" IN ('family', 'friends', 'work', 'other')),
  meal        TEXT NOT NULL DEFAULT 'regular'
    CHECK (meal IN ('regular', 'vegetarian', 'vegan', 'gluten_free', 'kosher')),
  meal_notes  TEXT NOT NULL DEFAULT '',
  accessibility TEXT NOT NULL DEFAULT '',
  transport   TEXT NOT NULL DEFAULT '',
  table_id    TEXT DEFAULT NULL,
  gift        TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  sent        BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in  BOOLEAN NOT NULL DEFAULT FALSE,
  rsvp_date   TIMESTAMPTZ DEFAULT NULL,
  rsvp_source TEXT NOT NULL DEFAULT '',
  tags        JSONB DEFAULT '[]',
  vip         BOOLEAN NOT NULL DEFAULT FALSE,
  history     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guests_status ON guests (status);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests (phone);
CREATE INDEX IF NOT EXISTS idx_guests_table ON guests (table_id);

-- ── Tables (seating) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL DEFAULT '',
  capacity  INTEGER NOT NULL DEFAULT 10,
  shape     TEXT NOT NULL DEFAULT 'round'
    CHECK (shape IN ('round', 'rect')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Vendors ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id           TEXT PRIMARY KEY,
  category     TEXT NOT NULL DEFAULT '',
  name         TEXT NOT NULL DEFAULT '',
  contact      TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  price        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date     TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  contract_url TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Expenses ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Budget ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget (
  id       TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  label    TEXT NOT NULL DEFAULT '',
  estimate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  actual   NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- ── Timeline ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline (
  id    TEXT PRIMARY KEY,
  time  TEXT NOT NULL DEFAULT '',
  icon  TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  note  TEXT NOT NULL DEFAULT ''
);

-- ── Contacts (contact collector) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  first_name   TEXT NOT NULL DEFAULT '',
  last_name    TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  side         TEXT NOT NULL DEFAULT '',
  dietary_notes TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Gallery ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id         TEXT PRIMARY KEY,
  data_url   TEXT NOT NULL DEFAULT '',
  caption    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Config (key-value for wedding info) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ── RSVP Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rsvp_log (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  guest_id   TEXT NOT NULL DEFAULT '',
  guest_name TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT '',
  count      INTEGER NOT NULL DEFAULT 1,
  source     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_log_guest ON rsvp_log (guest_id);

-- ── Updated-at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['guests', 'tables', 'vendors']) LOOP
    EXECUTE format(
      'CREATE TRIGGER IF NOT EXISTS trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- supabase/migrations/003_triggers.sql
-- Phase 7.1, Task 7 — Auto-update `updated_at` on all tables that have it.
-- Run via: supabase db push  or paste into Supabase SQL Editor.

-- ── updated_at trigger function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Apply trigger to all tables with updated_at ────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'guests', 'tables', 'vendors'
  ]) LOOP
    -- Drop existing trigger if any (idempotent re-run)
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

-- ── ON CONFLICT upsert function (used by client PATCH operations) ──────────
-- Guests upsert — inserts new or updates existing on id conflict
CREATE OR REPLACE FUNCTION upsert_guest(p_guest JSONB)
RETURNS guests AS $$
DECLARE
  result guests%ROWTYPE;
BEGIN
  INSERT INTO guests (
    id, first_name, last_name, phone, email, count, children,
    status, side, "group", meal, meal_notes, accessibility,
    transport, table_id, gift, notes, sent, checked_in,
    rsvp_date, rsvp_source, tags, vip, history
  )
  VALUES (
    p_guest->>'id',
    COALESCE(p_guest->>'first_name', ''),
    COALESCE(p_guest->>'last_name', ''),
    COALESCE(p_guest->>'phone', ''),
    COALESCE(p_guest->>'email', ''),
    COALESCE((p_guest->>'count')::INTEGER, 1),
    COALESCE((p_guest->>'children')::INTEGER, 0),
    COALESCE(p_guest->>'status', 'pending'),
    COALESCE(p_guest->>'side', 'mutual'),
    COALESCE(p_guest->>'group', 'other'),
    COALESCE(p_guest->>'meal', 'regular'),
    COALESCE(p_guest->>'meal_notes', ''),
    COALESCE(p_guest->>'accessibility', ''),
    COALESCE(p_guest->>'transport', ''),
    p_guest->>'table_id',
    COALESCE(p_guest->>'gift', ''),
    COALESCE(p_guest->>'notes', ''),
    COALESCE((p_guest->>'sent')::BOOLEAN, FALSE),
    COALESCE((p_guest->>'checked_in')::BOOLEAN, FALSE),
    (p_guest->>'rsvp_date')::TIMESTAMPTZ,
    COALESCE(p_guest->>'rsvp_source', ''),
    COALESCE(p_guest->'tags', '[]'::JSONB),
    COALESCE((p_guest->>'vip')::BOOLEAN, FALSE),
    COALESCE(p_guest->'history', '[]'::JSONB)
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name   = EXCLUDED.first_name,
    last_name    = EXCLUDED.last_name,
    phone        = EXCLUDED.phone,
    email        = EXCLUDED.email,
    count        = EXCLUDED.count,
    children     = EXCLUDED.children,
    status       = EXCLUDED.status,
    side         = EXCLUDED.side,
    "group"      = EXCLUDED."group",
    meal         = EXCLUDED.meal,
    meal_notes   = EXCLUDED.meal_notes,
    accessibility = EXCLUDED.accessibility,
    transport    = EXCLUDED.transport,
    table_id     = EXCLUDED.table_id,
    gift         = EXCLUDED.gift,
    notes        = EXCLUDED.notes,
    sent         = EXCLUDED.sent,
    checked_in   = EXCLUDED.checked_in,
    rsvp_date    = EXCLUDED.rsvp_date,
    rsvp_source  = EXCLUDED.rsvp_source,
    tags         = EXCLUDED.tags,
    vip          = EXCLUDED.vip,
    history      = EXCLUDED.history,
    updated_at   = now()
  RETURNING * INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Table upsert ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_table(p_table JSONB)
RETURNS tables AS $$
DECLARE
  result tables%ROWTYPE;
BEGIN
  INSERT INTO tables (id, name, capacity, shape)
  VALUES (
    p_table->>'id',
    COALESCE(p_table->>'name', ''),
    COALESCE((p_table->>'capacity')::INTEGER, 10),
    COALESCE(p_table->>'shape', 'round')
  )
  ON CONFLICT (id) DO UPDATE SET
    name     = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    shape    = EXCLUDED.shape,
    updated_at = now()
  RETURNING * INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

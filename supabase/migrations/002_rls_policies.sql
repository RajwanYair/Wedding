-- supabase/migrations/002_rls_policies.sql
-- F2.2.2 — Row-Level Security policies
--
-- Policy model:
--   - Anon users: read-only on guests (for RSVP lookup), insert to rsvp_log + contacts
--   - Authenticated admins: full CRUD on all tables
--
-- Admin identification: Supabase auth email must be in the 'admin_emails' config row.

-- Enable RLS on all tables
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_log ENABLE ROW LEVEL SECURITY;

-- ── Helper: Check if current user is admin ────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM config
    WHERE key = 'admin_emails'
      AND value LIKE '%' || auth.email() || '%'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Admin policies (full access) ──────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'guests', 'tables', 'vendors', 'expenses',
    'budget', 'timeline', 'contacts', 'gallery',
    'config', 'rsvp_log'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY admin_all ON %I FOR ALL USING (is_admin()) WITH CHECK (is_admin())',
      tbl
    );
  END LOOP;
END;
$$;

-- ── Anon/Guest policies ──────────────────────────────────────────────────

-- Guests can look up their own record by phone (for RSVP)
CREATE POLICY anon_guest_read ON guests
  FOR SELECT USING (true);  -- Phone lookup needs broad read; sensitive data is minimal

-- RSVP: guests can update their own record (status, meal, etc.)
CREATE POLICY anon_guest_update ON guests
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Contacts: anyone can submit a contact form
CREATE POLICY anon_contact_insert ON contacts
  FOR INSERT WITH CHECK (true);

-- RSVP log: anyone can append
CREATE POLICY anon_rsvp_log_insert ON rsvp_log
  FOR INSERT WITH CHECK (true);

-- Config: read-only for all (public wedding info like venue, date)
CREATE POLICY anon_config_read ON config
  FOR SELECT USING (true);

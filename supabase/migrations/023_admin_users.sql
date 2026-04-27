-- Migration 023 — admin_users table
-- Single source of truth for runtime admin allowlist when the active
-- backend flips from "sheets" to "supabase" (planned for v13). Until
-- then, src/services/auth.js still consults the static ADMIN_EMAILS
-- constant and the localStorage runtime list (`approvedEmails`).
--
-- RLS:
--   • Anyone can SELECT (frontend reads to render gating UI).
--   • Only existing admin_users may INSERT / UPDATE / DELETE.
--
-- Bootstrap: an initial admin must be inserted manually (or via the
-- Supabase dashboard) before the table is consulted by the app.

CREATE TABLE IF NOT EXISTS admin_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL CHECK (length(email) <= 320),
  added_by    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_users_email_idx
  ON admin_users (lower(email));

-- updated_at trigger ----------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_users_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION admin_users_set_updated_at();

-- RLS -------------------------------------------------------------------------

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_users_select_all ON admin_users;
CREATE POLICY admin_users_select_all
  ON admin_users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS admin_users_write_admins_only ON admin_users;
CREATE POLICY admin_users_write_admins_only
  ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
    )
  );

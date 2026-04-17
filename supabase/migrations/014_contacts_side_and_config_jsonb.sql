-- supabase/migrations/014_contacts_side_constraint.sql
-- Sprint 16 — CHECK constraint for contacts.side
-- Also adds config_jsonb column to config for complex structured values.

ALTER TABLE contacts
  ADD CONSTRAINT contacts_side_check
    CHECK (side IN ('groom', 'bride', 'mutual', ''));

-- Extend config table to store structured JSONB values alongside
-- the TEXT key-value store for backward compatibility.
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS json_value JSONB DEFAULT NULL;

COMMENT ON COLUMN config.json_value IS
  'Optional structured JSONB value; takes precedence over TEXT value when set.';

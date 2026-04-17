-- supabase/migrations/004_audit_log.sql
-- Phase 7.1 + 8.3 — Audit trail for all admin CRUD operations.
-- Provides visibility into who changed what and when.

-- ── Audit log table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     TEXT NOT NULL DEFAULT '',
  user_email  TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL DEFAULT ''
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SYNC', 'EXPORT', 'IMPORT')),
  entity      TEXT NOT NULL DEFAULT '',   -- e.g. 'guests', 'tables', 'vendors'
  entity_id   TEXT NOT NULL DEFAULT '',   -- affected row id
  diff        JSONB DEFAULT NULL          -- { before: {...}, after: {...} } for UPDATE
);

-- Index for fast lookups by entity and time
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_email);

-- ── RLS for audit_log ──────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read full audit log
CREATE POLICY audit_admin_read ON audit_log
  FOR SELECT USING (is_admin());

-- Service role can insert (called from triggers / Edge Functions)
-- Client-side inserts use service role key via Edge Function proxy
CREATE POLICY audit_service_insert ON audit_log
  FOR INSERT WITH CHECK (is_admin());

-- ── Auto-audit trigger function ────────────────────────────────────────────
-- Fires on INSERT/UPDATE/DELETE on core tables and logs to audit_log.
-- Note: user_email requires JWT claim — only populated when Supabase Auth is active.
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_action  TEXT;
  v_diff    JSONB;
  v_user    TEXT;
BEGIN
  v_user := COALESCE(auth.email(), 'system');

  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_diff := jsonb_build_object('after', row_to_json(NEW)::JSONB);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    -- Only store changed fields to keep diff compact
    SELECT jsonb_object_agg(
      n.key,
      jsonb_build_object('before', o.value, 'after', n.value)
    )
    INTO v_diff
    FROM jsonb_each(row_to_json(OLD)::JSONB) AS o(key, value)
    JOIN jsonb_each(row_to_json(NEW)::JSONB) AS n(key, value) ON o.key = n.key
    WHERE o.value IS DISTINCT FROM n.value
      AND n.key NOT IN ('updated_at');  -- exclude noise
  ELSEIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_diff := jsonb_build_object('before', row_to_json(OLD)::JSONB);
  END IF;

  INSERT INTO audit_log (user_email, action, entity, entity_id, diff)
  VALUES (
    v_user,
    v_action,
    TG_TABLE_NAME,
    COALESCE(
      (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)::TEXT,
      ''
    ),
    v_diff
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Apply audit trigger to core tables ────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'guests', 'tables', 'vendors', 'expenses', 'budget', 'timeline'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_audit
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION log_audit()',
      tbl
    );
  END LOOP;
END;
$$;

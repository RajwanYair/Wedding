-- supabase/migrations/005_error_log.sql
-- Phase 7.6 + 8.3 — Self-hosted error logging.
-- Client-side errors POST to an Edge Function → insert here.
-- Admin dashboard shows error trends without third-party analytics.

-- ── Error log table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_log (
  id          BIGSERIAL PRIMARY KEY,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  level       TEXT NOT NULL DEFAULT 'error'
    CHECK (level IN ('error', 'warn', 'info')),
  message     TEXT NOT NULL DEFAULT '',
  stack       TEXT DEFAULT NULL,
  url         TEXT NOT NULL DEFAULT '',   -- window.location.href at time of error
  user_agent  TEXT NOT NULL DEFAULT '',
  session_id  TEXT NOT NULL DEFAULT '',   -- anonymous session token
  version     TEXT NOT NULL DEFAULT '',   -- app version string (e.g. "6.0.0")
  context     JSONB DEFAULT NULL          -- extra structured data (component, action, etc.)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_error_log_timestamp ON error_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_level ON error_log (level);
CREATE INDEX IF NOT EXISTS idx_error_log_message ON error_log (message);

-- ── RLS for error_log ──────────────────────────────────────────────────────
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (client-side error reporting)
CREATE POLICY error_log_insert ON error_log
  FOR INSERT WITH CHECK (true);

-- Only admins can read
CREATE POLICY error_log_admin_read ON error_log
  FOR SELECT USING (is_admin());

-- ── Retention: auto-delete errors older than 90 days ─────────────────────
-- Run via pg_cron (Supabase cron jobs) — not installed by default.
-- Manual cleanup: DELETE FROM error_log WHERE timestamp < now() - INTERVAL '90 days';
COMMENT ON TABLE error_log IS
  'Client-side error log. Retention: 90 days. Admins read via analytics section.';

-- ── Materialized view: error summary (last 7d) ───────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS error_summary AS
SELECT
  date_trunc('hour', timestamp) AS hour,
  level,
  COUNT(*)                      AS count,
  COUNT(DISTINCT session_id)    AS unique_sessions
FROM error_log
WHERE timestamp > now() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY 1 DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_error_summary_hour_level
  ON error_summary (hour, level);

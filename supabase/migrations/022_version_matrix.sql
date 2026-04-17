-- Migration 022: Version Matrix & Feature Flags
-- Sprint 147 — tracks deployed version per event and feature flag state

BEGIN;

-- ── version_matrix ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS version_matrix (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version     text NOT NULL,                     -- semver string e.g. "7.4.0"
  deployed_at timestamptz NOT NULL DEFAULT now(),
  notes       text,
  CONSTRAINT version_matrix_version_format CHECK (version ~ '^\d+\.\d+\.\d+$')
);

CREATE INDEX IF NOT EXISTS idx_version_matrix_event_id ON version_matrix(event_id);
CREATE INDEX IF NOT EXISTS idx_version_matrix_deployed_at ON version_matrix(deployed_at DESC);

-- ── feature_flags ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    text REFERENCES events(id) ON DELETE CASCADE,  -- NULL = global
  flag        text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_unique UNIQUE (event_id, flag)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_event_id ON feature_flags(event_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag ON feature_flags(flag);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE version_matrix  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags   ENABLE ROW LEVEL SECURITY;

-- Admins can manage; anon can only read feature_flags
CREATE POLICY "admins_manage_version_matrix"
  ON version_matrix FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admins_manage_feature_flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_read_feature_flags"
  ON feature_flags FOR SELECT
  TO anon
  USING (true);

COMMIT;

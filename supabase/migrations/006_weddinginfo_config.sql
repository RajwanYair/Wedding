-- supabase/migrations/006_weddinginfo_config.sql
-- Phase 7.1, Task 5 — weddingInfo as JSONB column in config table.
-- Replaces the key-value row format with a single JSONB column for the
-- main wedding configuration. Existing key-value rows are preserved and
-- migrated on first access.

-- ── Add jsonb_value column to config for structured data ──────────────────
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS jsonb_value JSONB DEFAULT NULL;

-- ── weddingInfo config row ─────────────────────────────────────────────────
-- Upsert a dedicated 'wedding_info' config row with JSONB value.
-- The client reads this row and merges with localStorage fallback.
INSERT INTO config (key, value, jsonb_value)
VALUES (
  'wedding_info',
  '',  -- text value left empty; use jsonb_value
  '{
    "groom": "",
    "bride": "",
    "groomEn": "",
    "brideEn": "",
    "date": "",
    "time": "",
    "venue": "",
    "venueAddress": "",
    "city": "",
    "country": "Israel",
    "phone": "",
    "email": "",
    "websiteUrl": "",
    "dresscode": "",
    "notes": ""
  }'::JSONB
)
ON CONFLICT (key) DO UPDATE SET
  jsonb_value = COALESCE(EXCLUDED.jsonb_value, config.jsonb_value),
  updated_at  = now();

-- ── admin_emails config row ────────────────────────────────────────────────
INSERT INTO config (key, value)
VALUES ('admin_emails', '')
ON CONFLICT (key) DO NOTHING;

-- ── app_version config row ─────────────────────────────────────────────────
INSERT INTO config (key, value)
VALUES ('app_version', '6.0.0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── Index on config.key (for fast lookups) ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_config_key ON config (key);

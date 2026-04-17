-- supabase/migrations/016_delivery_tracking.sql
-- Sprint 46: Delivery tracking table
--
-- Records message delivery events for each guest (WhatsApp, email, SMS).
-- Used to track send outcomes, identify undelivered guests, and power the
-- delivery analytics dashboard.

-- ── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS delivery_tracking (
  id          TEXT        PRIMARY KEY,
  guest_id    UUID        NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  channel     TEXT        NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  status      TEXT        NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'bounced')),
  message_id  TEXT,
  campaign_id TEXT,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Fast lookup by guest
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_guest_id
  ON delivery_tracking (guest_id);

-- Undelivered query
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_status
  ON delivery_tracking (status)
  WHERE status IN ('failed', 'bounced');

-- Campaign stats
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_campaign_id
  ON delivery_tracking (campaign_id)
  WHERE campaign_id IS NOT NULL;

-- ── Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Admins can read and write all records
CREATE POLICY "admins_all" ON delivery_tracking
  FOR ALL
  USING (
    auth.email() IN (
      SELECT unnest(string_to_array(
        current_setting('app.admin_emails', TRUE), ','
      ))
    )
  );

-- Edge Functions (service role) bypass RLS automatically

-- ── Comments ──────────────────────────────────────────────────────────────

COMMENT ON TABLE  delivery_tracking                IS 'Per-guest message delivery events (WA, email, SMS)';
COMMENT ON COLUMN delivery_tracking.id             IS 'dlv_{timestamp}_{random} client-generated ID';
COMMENT ON COLUMN delivery_tracking.channel        IS 'whatsapp | email | sms';
COMMENT ON COLUMN delivery_tracking.status         IS 'sent | delivered | read | failed | bounced';
COMMENT ON COLUMN delivery_tracking.message_id     IS 'Provider message ID (wamid.*, Resend id, etc.)';
COMMENT ON COLUMN delivery_tracking.campaign_id    IS 'Optional link to campaigns.id';

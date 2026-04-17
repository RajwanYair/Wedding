-- supabase/migrations/019_guest_model_extended.sql
-- Sprint 78 — extended guest fields: language, WhatsApp opt-in, campaign_id, delivery_status
-- All changes are non-breaking (nullable / defaulted) and idempotent.

ALTER TABLE guests ADD COLUMN IF NOT EXISTS language          TEXT    DEFAULT 'he';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS whatsapp_opt_in  BOOLEAN DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS campaign_id      TEXT    DEFAULT NULL;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS delivery_status  TEXT    DEFAULT 'unsent'
  CONSTRAINT guests_delivery_status_check
  CHECK (delivery_status IN ('unsent', 'sent', 'delivered', 'failed', 'bounced'));

-- index for campaign queries
CREATE INDEX IF NOT EXISTS idx_guests_campaign_id
  ON guests (campaign_id)
  WHERE campaign_id IS NOT NULL;

-- index for delivery status filtering
CREATE INDEX IF NOT EXISTS idx_guests_delivery_status
  ON guests (delivery_status);

-- refresh comment
COMMENT ON COLUMN guests.language         IS 'Preferred communication language (he/en/ar/ru)';
COMMENT ON COLUMN guests.whatsapp_opt_in  IS 'Guest consented to receive WhatsApp messages';
COMMENT ON COLUMN guests.campaign_id      IS 'Optional marketing / save-the-date campaign reference';
COMMENT ON COLUMN guests.delivery_status  IS 'Last WhatsApp/email delivery status for this guest';

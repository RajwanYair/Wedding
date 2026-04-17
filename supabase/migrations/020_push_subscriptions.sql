-- supabase/migrations/020_push_subscriptions.sql — Sprint 102
-- Web Push subscription storage for admin push notifications (VAPID)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id      TEXT        NOT NULL DEFAULT 'default',
  endpoint      TEXT        NOT NULL,
  p256dh        TEXT        NOT NULL,
  auth_key      TEXT        NOT NULL,
  expiration_time BIGINT    DEFAULT NULL,
  user_agent    TEXT        DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (endpoint)
);

-- RLS: only authenticated admins can manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_own_push_sub" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Cleanup index: purge expired subscriptions periodically
CREATE INDEX IF NOT EXISTS idx_push_sub_event     ON push_subscriptions (event_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_user      ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_endpoint  ON push_subscriptions (endpoint);

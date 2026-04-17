-- supabase/migrations/021_event_metadata.sql — Sprint 119
-- Adds an event_metadata table to store flexible key-value metadata
-- per wedding event (from multi-event.js), such as custom fields,
-- venue details, timing, and app-specific flags.

CREATE TABLE IF NOT EXISTS public.event_metadata (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT        NOT NULL,               -- references multi-event.js event id
  key         TEXT        NOT NULL,
  value       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- enforce one record per event+key
  CONSTRAINT event_metadata_event_key_unique UNIQUE (event_id, key)
);

-- Index for fast lookup by event_id
CREATE INDEX IF NOT EXISTS idx_event_metadata_event_id
  ON public.event_metadata (event_id);

-- Row Level Security
ALTER TABLE public.event_metadata ENABLE ROW LEVEL SECURITY;

-- Admins can manage all metadata (service_role bypasses RLS)
CREATE POLICY "admin_manage_event_metadata"
  ON public.event_metadata
  FOR ALL
  USING     ( auth.role() = 'authenticated' )
  WITH CHECK( auth.role() = 'authenticated' );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER event_metadata_updated_at
BEFORE UPDATE ON public.event_metadata
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

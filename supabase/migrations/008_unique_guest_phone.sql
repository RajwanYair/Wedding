-- supabase/migrations/008_unique_guest_phone.sql
-- Phase 3 — Sprint 7: Unique conditional index on guests.phone
--
-- Prevents duplicate phone numbers in the guest list while still allowing
-- multiple guests with no phone number (empty string is common for children
-- or placeholder entries).
--
-- Uses a partial unique index: UNIQUE WHERE phone <> ''
-- This is Postgres-idiomatic for nullable/optional unique fields stored
-- as empty-string rather than NULL.
--
-- Run:  supabase db push  (or paste into Supabase SQL Editor)
--       Idempotent: DROP INDEX IF EXISTS before CREATE.

DROP INDEX IF EXISTS idx_guests_phone_unique;

-- Postgres does not support CREATE UNIQUE INDEX IF NOT EXISTS directly;
-- the DO block below achieves the same idempotency guard (S304 — ADR-043).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'guests'
      AND indexname  = 'idx_guests_phone_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_guests_phone_unique
      ON public.guests (phone)
      WHERE phone <> '';
  END IF;
END $$;

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

CREATE UNIQUE INDEX idx_guests_phone_unique
  ON guests (phone)
  WHERE phone <> '';

COMMENT ON INDEX idx_guests_phone_unique IS
  'Enforces unique phone numbers; empty-string phones are excluded (multiple allowed).';

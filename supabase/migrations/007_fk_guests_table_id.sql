-- supabase/migrations/007_fk_guests_table_id.sql
-- Phase 3 — Sprint 7: Add FK constraint guests.table_id → tables(id)
--
-- Adds a real foreign-key relationship so Supabase can enforce referential
-- integrity and clean up dangling table_id values when a table is deleted.
--
-- ON DELETE SET NULL: removing a seating table automatically un-seats the
-- guests that were assigned to it — sensible for a wedding where you may
-- rearrange or delete tables without losing guest records.
--
-- Run:  supabase db push  (or paste into Supabase SQL Editor)
--       This migration is idempotent: it drops the constraint first if it
--       already exists so re-running is safe.

-- Drop if previously added (idempotent re-run safety)
ALTER TABLE guests
  DROP CONSTRAINT IF EXISTS fk_guests_table_id;

-- Add the foreign-key constraint
ALTER TABLE guests
  ADD CONSTRAINT fk_guests_table_id
  FOREIGN KEY (table_id)
  REFERENCES tables (id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Comment for introspection
COMMENT ON CONSTRAINT fk_guests_table_id ON guests IS
  'Referential integrity: table_id must match a tables.id; nulled on table delete.';

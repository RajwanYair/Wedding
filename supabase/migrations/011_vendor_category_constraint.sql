-- supabase/migrations/011_vendor_category_constraint.sql
-- Sprint 16 — add CHECK constraint for vendors.category
-- Vendor categories as defined in the app's category list.

ALTER TABLE vendors
  ADD CONSTRAINT vendors_category_check
    CHECK (category IN (
      'venue', 'catering', 'photography', 'videography',
      'music', 'flowers', 'hair_makeup', 'invitations',
      'transport', 'officiant', 'lighting', 'cake',
      'honeymoon', 'rings', 'attire', 'other'
    ));

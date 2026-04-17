-- supabase/migrations/012_expense_category_constraint.sql
-- Sprint 16 — add CHECK constraint for expenses.category
-- Expense categories mirror the budget breakdown used in analytics.

ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_check
    CHECK (category IN (
      'venue', 'catering', 'photography', 'videography',
      'music', 'flowers', 'hair_makeup', 'invitations',
      'transport', 'officiant', 'lighting', 'cake',
      'honeymoon', 'rings', 'attire', 'other'
    ));

-- Bhalai Kosh: application/approval dates and next-month EMI schedule
-- Run after the base schema and accounting migrations.
BEGIN;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS approved_on DATE;
UPDATE loans SET approved_on = approved_at::date WHERE approved_on IS NULL AND approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loan_installments_due ON loan_installments(loan_id, due_date);
COMMIT;

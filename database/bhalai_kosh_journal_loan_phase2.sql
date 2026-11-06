-- Phase 2: Journal, payment and loan workflow support.
-- Run after bhalai_kosh_schema.sql and bhalai_kosh_accounting.sql.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_loans_org_status_date ON loans(organization_id,status,applied_on DESC);
CREATE INDEX IF NOT EXISTS idx_loan_installments_due ON loan_installments(loan_id,due_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_org_date ON loan_payments(organization_id,paid_on DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_org_type_date ON vouchers(organization_id,voucher_type,voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_bank_org_active ON cash_bank_accounts(organization_id,is_active);
-- Keep loan application numbers unique per organization (already enforced by base schema).
-- Add a safe default status index for installment collection/reporting.
CREATE INDEX IF NOT EXISTS idx_loan_installments_status ON loan_installments(loan_id,status,due_date);
COMMIT;

-- Bhalai Kosh Phase 1: double-entry accounting foundation
-- Run after database/bhalai_kosh_schema.sql in the separate Bhalai Kosh database.
BEGIN;
CREATE TABLE IF NOT EXISTS chart_of_accounts (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 account_code VARCHAR(20) NOT NULL, account_name VARCHAR(160) NOT NULL,
 account_type VARCHAR(20) NOT NULL CHECK(account_type IN ('asset','liability','equity','income','expense')),
 parent_id BIGINT REFERENCES chart_of_accounts(id), is_active BOOLEAN NOT NULL DEFAULT true,
 UNIQUE(organization_id,account_code)
);
CREATE TABLE IF NOT EXISTS vouchers (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 voucher_no VARCHAR(50) NOT NULL, voucher_type VARCHAR(20) NOT NULL CHECK(voucher_type IN ('receipt','payment','journal','contra')),
 voucher_date DATE NOT NULL, narration TEXT, reference_type VARCHAR(40), reference_id BIGINT,
 status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','reversed')),
 created_by BIGINT REFERENCES users(id), approved_by BIGINT REFERENCES users(id),
 posted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id,voucher_no)
);
CREATE TABLE IF NOT EXISTS voucher_lines (
 id BIGSERIAL PRIMARY KEY, voucher_id BIGINT NOT NULL REFERENCES vouchers(id),
 account_id BIGINT NOT NULL REFERENCES chart_of_accounts(id), member_id BIGINT REFERENCES members(id),
 debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(debit>=0),
 credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(credit>=0), narration TEXT,
 CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0))
);
CREATE TABLE IF NOT EXISTS member_ledger (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 member_id BIGINT NOT NULL REFERENCES members(id), voucher_id BIGINT REFERENCES vouchers(id),
 transaction_date DATE NOT NULL, transaction_type VARCHAR(40) NOT NULL,
 debit NUMERIC(14,2) NOT NULL DEFAULT 0, credit NUMERIC(14,2) NOT NULL DEFAULT 0,
 narration TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(debit>=0 AND credit>=0 AND NOT(debit>0 AND credit>0))
);
CREATE TABLE IF NOT EXISTS bank_reconciliations (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 account_id BIGINT NOT NULL REFERENCES cash_bank_accounts(id),
 statement_from DATE NOT NULL, statement_to DATE NOT NULL,
 statement_closing_balance NUMERIC(14,2) NOT NULL,
 book_closing_balance NUMERIC(14,2) NOT NULL, difference NUMERIC(14,2) NOT NULL,
 reconciled_by BIGINT REFERENCES users(id), reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(statement_to>=statement_from)
);
CREATE INDEX IF NOT EXISTS idx_vouchers_org_date ON vouchers(organization_id,voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_voucher_lines_voucher ON voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_member_ledger_member_date ON member_ledger(organization_id,member_id,transaction_date);
-- Standard chart of accounts; contribution liability is used until the fund policy says otherwise.
INSERT INTO chart_of_accounts(organization_id,account_code,account_name,account_type)
SELECT o.id,v.code,v.name,v.type
FROM organizations o
CROSS JOIN (VALUES
 ('1001','Cash in Hand','asset'),('1002','Bank Account','asset'),
 ('1101','Loan Receivable','asset'),('2001','Refundable Member Fund','liability'),
 ('3001','Welfare Fund Capital','equity'),('4001','Interest Income','income'),
 ('4002','Other Income','income'),('5001','Medical Support Expense','expense'),
 ('5002','Accident Support Expense','expense'),('5003','Death Relief Expense','expense'),
 ('5004','Other Welfare Expense','expense'),('5005','Bank Charges','expense')
) AS v(code,name,type)
ON CONFLICT(organization_id,account_code) DO NOTHING;
COMMIT;

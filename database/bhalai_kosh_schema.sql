-- Bhalai Kosh independent PostgreSQL schema
-- Run this migration in a NEW Neon database. Do not run against LedgerPro's database.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(180) NOT NULL, code VARCHAR(40) UNIQUE NOT NULL,
 address TEXT, phone VARCHAR(30), email VARCHAR(180), fiscal_year_start_month SMALLINT NOT NULL DEFAULT 4,
 currency CHAR(3) NOT NULL DEFAULT 'NPR', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 full_name VARCHAR(160) NOT NULL, email VARCHAR(180) NOT NULL, password_hash TEXT NOT NULL,
 role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK(role IN ('super_admin','admin','accountant','staff','viewer')),
 is_active BOOLEAN NOT NULL DEFAULT true, last_login_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id,email)
);
CREATE TABLE IF NOT EXISTS members (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 member_code VARCHAR(40) NOT NULL, full_name VARCHAR(180) NOT NULL, nepali_name VARCHAR(180),
 gender VARCHAR(20), date_of_birth DATE, phone VARCHAR(30), email VARCHAR(180),
 address TEXT, citizenship_no VARCHAR(80), joined_on DATE NOT NULL DEFAULT CURRENT_DATE,
 designation VARCHAR(120), department VARCHAR(120), bank_name VARCHAR(120), bank_branch VARCHAR(120),
 bank_account_name VARCHAR(180), bank_account_no VARCHAR(80), emergency_contact VARCHAR(30),
 status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','suspended','left')),
 notes TEXT, created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organization_id,member_code)
);
CREATE TABLE IF NOT EXISTS member_documents (
 id BIGSERIAL PRIMARY KEY, member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 document_type VARCHAR(60) NOT NULL, file_name TEXT NOT NULL, file_url TEXT NOT NULL,
 uploaded_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fund_settings (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL UNIQUE REFERENCES organizations(id),
 monthly_saving NUMERIC(14,2) NOT NULL DEFAULT 1000 CHECK(monthly_saving>=0),
 loan_interest_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
 interest_method VARCHAR(30) NOT NULL DEFAULT 'flat' CHECK(interest_method IN ('flat','reducing_balance')),
 max_loan_multiplier NUMERIC(8,2) NOT NULL DEFAULT 0,
 late_fee NUMERIC(14,2) NOT NULL DEFAULT 0, currency CHAR(3) NOT NULL DEFAULT 'NPR',
 fiscal_year_label VARCHAR(20), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS savings (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 member_id BIGINT NOT NULL REFERENCES members(id), period_year SMALLINT NOT NULL,
 period_month SMALLINT NOT NULL CHECK(period_month BETWEEN 1 AND 12),
 amount NUMERIC(14,2) NOT NULL CHECK(amount>=0), paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
 payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','bank','transfer','cheque','online')),
 reference_no VARCHAR(100), receipt_no VARCHAR(60), status VARCHAR(20) NOT NULL DEFAULT 'posted',
 received_by BIGINT REFERENCES users(id), notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(member_id,period_year,period_month)
);
CREATE TABLE IF NOT EXISTS deposits (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 member_id BIGINT NOT NULL REFERENCES members(id), transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
 transaction_type VARCHAR(30) NOT NULL CHECK(transaction_type IN ('saving','extra_saving','refund','other')),
 amount NUMERIC(14,2) NOT NULL CHECK(amount>0), payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
 reference_no VARCHAR(100), receipt_no VARCHAR(60), description TEXT, created_by BIGINT REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS loans (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 member_id BIGINT NOT NULL REFERENCES members(id), application_no VARCHAR(60) NOT NULL,
 applied_on DATE NOT NULL DEFAULT CURRENT_DATE, principal NUMERIC(14,2) NOT NULL CHECK(principal>0),
 annual_interest_rate NUMERIC(7,4) NOT NULL DEFAULT 0, interest_method VARCHAR(30) NOT NULL DEFAULT 'flat',
 term_months SMALLINT NOT NULL CHECK(term_months>0), purpose TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','disbursed','closed','cancelled')),
 approved_by BIGINT REFERENCES users(id), approved_at TIMESTAMPTZ, disbursed_on DATE,
 disbursed_amount NUMERIC(14,2), created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id,application_no)
);
CREATE TABLE IF NOT EXISTS loan_installments (
 id BIGSERIAL PRIMARY KEY, loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
 installment_no SMALLINT NOT NULL, due_date DATE NOT NULL, principal_due NUMERIC(14,2) NOT NULL DEFAULT 0,
 interest_due NUMERIC(14,2) NOT NULL DEFAULT 0, fee_due NUMERIC(14,2) NOT NULL DEFAULT 0,
 paid_principal NUMERIC(14,2) NOT NULL DEFAULT 0, paid_interest NUMERIC(14,2) NOT NULL DEFAULT 0,
 paid_fee NUMERIC(14,2) NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'due',
 UNIQUE(loan_id,installment_no)
);
CREATE TABLE IF NOT EXISTS loan_payments (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 loan_id BIGINT NOT NULL REFERENCES loans(id), installment_id BIGINT REFERENCES loan_installments(id),
 member_id BIGINT NOT NULL REFERENCES members(id), paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
 principal_amount NUMERIC(14,2) NOT NULL DEFAULT 0, interest_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
 fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0, payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
 reference_no VARCHAR(100), receipt_no VARCHAR(60), received_by BIGINT REFERENCES users(id),
 notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(principal_amount>=0 AND interest_amount>=0 AND fee_amount>=0),
 CHECK(principal_amount+interest_amount+fee_amount>0)
);
CREATE TABLE IF NOT EXISTS interest_records (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 member_id BIGINT NOT NULL REFERENCES members(id), loan_id BIGINT REFERENCES loans(id),
 period_start DATE NOT NULL, period_end DATE NOT NULL, basis_amount NUMERIC(14,2) NOT NULL,
 rate NUMERIC(7,4) NOT NULL, amount NUMERIC(14,2) NOT NULL, posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS penalties (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 member_id BIGINT NOT NULL REFERENCES members(id), loan_id BIGINT REFERENCES loans(id),
 penalty_date DATE NOT NULL DEFAULT CURRENT_DATE, reason TEXT NOT NULL,
 amount NUMERIC(14,2) NOT NULL CHECK(amount>0), status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
 paid_at TIMESTAMPTZ, created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cash_bank_accounts (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 account_name VARCHAR(160) NOT NULL, account_type VARCHAR(20) NOT NULL CHECK(account_type IN ('cash','bank')),
 bank_name VARCHAR(120), account_number VARCHAR(80), opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
 is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cash_bank_transactions (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id),
 account_id BIGINT NOT NULL REFERENCES cash_bank_accounts(id), transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
 direction VARCHAR(10) NOT NULL CHECK(direction IN ('in','out')), category VARCHAR(50) NOT NULL,
 amount NUMERIC(14,2) NOT NULL CHECK(amount>0), source_type VARCHAR(40), source_id BIGINT,
 reference_no VARCHAR(100), description TEXT, created_by BIGINT REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGSERIAL PRIMARY KEY, organization_id BIGINT REFERENCES organizations(id), user_id BIGINT REFERENCES users(id),
 action VARCHAR(80) NOT NULL, entity_type VARCHAR(80), entity_id BIGINT, ip_address INET,
 details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_members_org_status ON members(organization_id,status);
CREATE INDEX IF NOT EXISTS idx_savings_member_period ON savings(member_id,period_year,period_month);
CREATE INDEX IF NOT EXISTS idx_loans_member_status ON loans(member_id,status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_date ON loan_payments(loan_id,paid_on);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account_date ON cash_bank_transactions(account_id,transaction_date);
CREATE INDEX IF NOT EXISTS idx_audit_org_date ON audit_logs(organization_id,created_at DESC);
COMMIT;

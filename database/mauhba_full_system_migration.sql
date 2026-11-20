-- Manahari Business Management: performance indexes.
-- The existing primary keys are GENERATED AS IDENTITY; PostgreSQL manages their sequences.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uq ON app_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS businesses_business_code_uq ON businesses (business_code);
CREATE INDEX IF NOT EXISTS businesses_name_ne_idx ON businesses (name_ne);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON businesses(status);
CREATE INDEX IF NOT EXISTS business_addresses_ward_idx ON business_addresses(ward_no);
CREATE INDEX IF NOT EXISTS renewals_due_ad_idx ON business_renewals(next_renewal_due_ad);
CREATE INDEX IF NOT EXISTS tax_clearances_business_year_idx ON tax_clearances(business_id,fiscal_year);
COMMIT;

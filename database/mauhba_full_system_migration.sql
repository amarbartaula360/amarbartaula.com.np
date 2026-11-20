-- Manahari Business Management: ID generators and lookup indexes.
-- Run once against the dedicated manahari_business_db database.
BEGIN;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activity_logs','app_users','business_addresses','business_categories','business_contacts','business_owners','business_registrations','business_renewals','businesses','documents','memberships','tax_clearances']
  LOOP
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I_id_seq', t);
    EXECUTE format('ALTER SEQUENCE public.%I_id_seq OWNED BY public.%I.id', t, t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT nextval(''public.%I_id_seq'')', t, t);
    EXECUTE format('SELECT setval(''public.%I_id_seq'', GREATEST(COALESCE((SELECT max(id) FROM public.%I),0)+1,1), false)', t, t);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uq ON app_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS businesses_business_code_uq ON businesses (business_code);
CREATE INDEX IF NOT EXISTS businesses_name_ne_idx ON businesses (name_ne);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON businesses(status);
CREATE INDEX IF NOT EXISTS business_addresses_ward_idx ON business_addresses(ward_no);
CREATE INDEX IF NOT EXISTS renewals_due_ad_idx ON business_renewals(next_renewal_due_ad);
CREATE INDEX IF NOT EXISTS tax_clearances_business_year_idx ON tax_clearances(business_id,fiscal_year);
COMMIT;

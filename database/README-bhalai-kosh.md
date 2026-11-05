# Bhalai Kosh database setup

Bhalai Kosh uses a **separate PostgreSQL database**. It does not connect to or modify LedgerPro's Neon database.

## 1. Create a new Neon database
Create a new Neon project/database named `bhalaikosh`. Copy its pooled PostgreSQL connection string. Never commit this string to GitHub or expose it in browser code.

## 2. Run the schema
Open the new Neon project's SQL Editor and run the complete file `database/bhalai_kosh_schema.sql`.

## 3. Configure the Render web service
Add these environment variables to the Render service hosting `amarbartaula.com.np`:

- `BHALAI_KOSH_DATABASE_URL` — connection string for the new Bhalai Kosh database.
- `BHALAI_KOSH_SESSION_SECRET` — a random secret of at least 32 characters.
- `BHALAI_KOSH_SETUP_KEY` — a separate one-time setup secret.

Save the variables and redeploy.

## 4. Create the first organization and admin
After the schema and environment variables are ready, send one POST request to:

`https://www.amarbartaula.com.np/api/bhalai-kosh/setup`

Set header `Content-Type: application/json` and `x-bhalai-setup-key: YOUR_SETUP_KEY`. Example request body:

```json
{
  "organizationName": "United Employee Benefit Fund",
  "organizationCode": "UEBS-BK",
  "adminName": "Fund Administrator",
  "adminEmail": "admin@example.com",
  "adminPassword": "Use-a-unique-password-at-least-12-chars"
}
```

This endpoint only works while the database has no users. It hashes the password and creates the organization, default fund settings and first admin in one transaction. Keep the setup key private. Once the first admin is created, the endpoint refuses further initialization.

## 5. Login
Open `https://www.amarbartaula.com.np/bhalaikosh` and use the organization code, admin email and password created above.

## Included schema
The migration creates organizations, users, members, member documents, fund settings, monthly savings, deposits, loans, installment schedules, loan payments, interest records, penalties, cash/bank accounts and transactions, and audit logs. All amounts use PostgreSQL `NUMERIC(14,2)`; records are scoped to an organization.

## Important
The login and initial dashboard route are implemented. The dashboard's existing member/savings/loan sample views are still demonstration UI; the next implementation stage must connect each member, savings, loan, payment, report and import action to authenticated database APIs before real financial transactions are entered.

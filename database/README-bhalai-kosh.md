# Bhalai Kosh database setup

This is a separate database from LedgerPro. Create a new Neon PostgreSQL project/database named `bhalaikosh`, then run `bhalai_kosh_schema.sql` in its SQL Editor.

After deployment, add the new database connection string as the Render environment variable `BHALAI_KOSH_DATABASE_URL`. Do not commit the connection string or put it in browser code.

The migration creates organization/user access, members and documents, savings/deposits, loans/installments/payments, interest, penalties, cash/bank accounts and transactions, settings, and audit logs. Create the first organization and administrator only after the authentication API and secure bootstrap process are deployed.

# Online Construction Materials — Backend Setup

The customer portal now uses PostgreSQL APIs instead of browser LocalStorage. Admin and supplier access uses signed, HTTP-only sessions. Do not use demo credentials in production.

## 1. Database
Create a dedicated PostgreSQL database (Neon is supported), then run the complete file:

`database/construction_materials_schema.sql`

This creates products, admin users, suppliers, orders, status history, and inventory movement tables. It also inserts the initial material catalogue only when each SKU is not already present.

Recommended: use a separate database for this application and set `CONSTRUCTION_DATABASE_URL`. The API also accepts `DATABASE_URL` as a fallback, but a dedicated connection string is safer for separating application data.

## 2. Environment variables
Set these in the hosting provider's server environment (never expose them with a `NEXT_PUBLIC_` prefix):

- `CONSTRUCTION_DATABASE_URL`: PostgreSQL connection string, preferably Neon pooled connection string.
- `CONSTRUCTION_SESSION_SECRET`: random secret with at least 32 characters.
- `CONSTRUCTION_SETUP_SECRET`: one-time admin bootstrap secret.

The application already depends on `pg`, `bcryptjs`, and `jose` in package.json.

## 3. Create the first administrator
After applying the SQL schema and setting the environment variables, make a one-time POST request to:

`POST /api/construction-materials/setup`

Headers: `Content-Type: application/json` and `x-setup-secret: YOUR_CONSTRUCTION_SETUP_SECRET`

Body:
```json
{
  "username": "your-admin-id",
  "password": "use-a-unique-password-at-least-12-characters",
  "name": "System Administrator"
}
```

This endpoint refuses to create another first administrator once one exists. Keep the setup secret private and rotate/remove it after initialization.

## 4. API overview

Public:
- `GET /api/construction-materials/products`
- `POST /api/construction-materials/orders`
- `GET /api/construction-materials/tracking?id=CM-...`

Authentication:
- `POST /api/construction-materials/auth/login`
- `POST /api/construction-materials/auth/logout`
- `GET /api/construction-materials/auth/me`

Admin (requires admin session):
- `GET /api/construction-materials/admin/dashboard`
- `GET /api/construction-materials/admin/orders`
- `PATCH /api/construction-materials/admin/orders`
- `GET|POST|PATCH /api/construction-materials/admin/inventory`
- `GET|POST /api/construction-materials/admin/suppliers`

Supplier (requires supplier session; data is scoped to the logged-in supplier):
- `GET|PATCH /api/construction-materials/supplier/orders`

## 5. Operational notes
- Order creation locks the selected product row, checks available stock, creates the order, and reserves stock in one database transaction.
- Rejecting/cancelling an order restores reserved stock; reactivating a cancelled/rejected order checks stock before reserving again.
- Supplier passwords are hashed with bcrypt. The generated temporary password is returned only once when the admin creates the supplier.
- Public tracking intentionally returns limited order information and does not expose the customer's phone or delivery address.
- Configure HTTPS in production. The session cookie is HTTP-only, Secure in production, and SameSite=Lax.
- Configure database backups, monitoring, and API rate limiting before accepting high-volume public traffic.
- SMS, WhatsApp, email delivery, online payment gateway, supplier geospatial auto-matching, and proof-of-delivery uploads are not yet integrated; these require provider credentials and additional workflows.

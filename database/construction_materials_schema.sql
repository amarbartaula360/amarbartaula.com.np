-- Online Construction Materials: PostgreSQL schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS cm_products (
 id BIGSERIAL PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '',
 unit TEXT NOT NULL DEFAULT 'trip', price NUMERIC(14,2) NOT NULL CHECK(price >= 0),
 stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(stock >= 0), active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cm_admin_users (
 id BIGSERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 name TEXT NOT NULL DEFAULT 'Administrator', active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_login_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS cm_suppliers (
 id BIGSERIAL PRIMARY KEY, supplier_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
 phone TEXT NOT NULL, email TEXT, password_hash TEXT NOT NULL, address TEXT,
 service_areas TEXT[] NOT NULL DEFAULT '{}', active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cm_orders (
 id BIGSERIAL PRIMARY KEY, tracking_id TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL,
 customer_phone TEXT NOT NULL, customer_email TEXT, product_id BIGINT REFERENCES cm_products(id),
 product_name TEXT NOT NULL, unit TEXT NOT NULL, quantity NUMERIC(14,3) NOT NULL CHECK(quantity > 0),
 unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price >= 0), subtotal NUMERIC(14,2) NOT NULL,
 delivery_charge NUMERIC(14,2) NOT NULL DEFAULT 0, total NUMERIC(14,2) NOT NULL,
 delivery_address TEXT NOT NULL, landmark TEXT, latitude NUMERIC(10,7), longitude NUMERIC(10,7),
 customer_note TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','dispatched','delivered','rejected','cancelled')),
 supplier_id BIGINT REFERENCES cm_suppliers(id), payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid','refunded')),
 payment_method TEXT, amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 dispatched_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS cm_order_status_history (
 id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES cm_orders(id) ON DELETE CASCADE,
 old_status TEXT, new_status TEXT NOT NULL, note TEXT, changed_by TEXT NOT NULL DEFAULT 'system',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cm_inventory_movements (
 id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES cm_products(id),
 movement_type TEXT NOT NULL CHECK(movement_type IN ('opening','purchase','sale','adjustment','return')),
 quantity NUMERIC(14,3) NOT NULL, reference TEXT, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cm_orders_created_idx ON cm_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS cm_orders_supplier_idx ON cm_orders(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cm_orders_status_idx ON cm_orders(status);
CREATE INDEX IF NOT EXISTS cm_orders_tracking_idx ON cm_orders(tracking_id);
INSERT INTO cm_products(sku,name,description,unit,price,stock) VALUES
 ('SAND-RIVER','River Sand (बालुवा)','निर्माण कार्यका लागि सफा नदीजन्य बालुवा','ट्रिप',18000,12),
 ('GRAVEL-GITTI','Gravel / Gitti (गिट्टी)','विभिन्न साइजमा उपलब्ध गिट्टी','ट्रिप',22000,9),
 ('STONE','Stone (ढुंगा)','घर तथा संरचना निर्माणका लागि ढुंगा','ट्रिप',16000,15),
 ('STONE-CHIPS','Stone Chips (चिप्स)','कंक्रिट तथा अन्य निर्माण प्रयोजनका लागि','ट्रिप',24000,6)
ON CONFLICT(sku) DO NOTHING;

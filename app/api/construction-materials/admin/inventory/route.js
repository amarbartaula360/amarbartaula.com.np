import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole } from "@/lib/construction-materials-auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireConstructionRole("admin");
  if (response) return response;
  try {
    const { rows } = await getConstructionPool().query(
      "SELECT id,sku,name,description,unit,price::float,stock::float,active,updated_at FROM cm_products ORDER BY name"
    );
    return Response.json({ products: rows });
  } catch (error) {
    console.error("CM inventory GET:", error);
    return Response.json({ error: "Inventory unavailable" }, { status: 503 });
  }
}

export async function POST(request) {
  const { response } = await requireConstructionRole("admin");
  if (response) return response;
  const body = await request.json().catch(() => null);
  if (!body?.sku || !body?.name || !Number.isFinite(Number(body.price)) || Number(body.price) < 0 ||
      !Number.isFinite(Number(body.stock)) || Number(body.stock) < 0) {
    return Response.json({ error: "Valid SKU, name, price and stock required" }, { status: 400 });
  }
  try {
    const { rows } = await getConstructionPool().query(
      "INSERT INTO cm_products(sku,name,description,unit,price,stock) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,sku,name,description,unit,price::float,stock::float,active",
      [String(body.sku).trim().toUpperCase(), String(body.name).trim(), body.description || "", body.unit || "ट्रिप", Number(body.price), Number(body.stock)]
    );
    return Response.json({ product: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("CM inventory POST:", error);
    return Response.json({ error: "SKU already exists or product could not be saved" }, { status: 409 });
  }
}

export async function PATCH(request) {
  const { response } = await requireConstructionRole("admin");
  if (response) return response;
  const body = await request.json().catch(() => null);
  if (!Number.isInteger(Number(body?.id))) {
    return Response.json({ error: "Valid product id required" }, { status: 400 });
  }

  const pool = getConstructionPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT * FROM cm_products WHERE id=$1 FOR UPDATE", [Number(body.id)]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const current = result.rows[0];
    const sku = body.sku === undefined ? current.sku : String(body.sku).trim().toUpperCase();
    const name = body.name === undefined ? current.name : String(body.name).trim();
    const description = body.description === undefined ? current.description : String(body.description);
    const unit = body.unit === undefined ? current.unit : String(body.unit).trim();
    const price = body.price === undefined ? Number(current.price) : Number(body.price);
    const stock = body.stock === undefined ? Number(current.stock) : Number(body.stock);
    const active = body.active === undefined ? current.active : body.active;

    if (!sku || !name || !unit || !Number.isFinite(price) || price < 0 ||
        !Number.isFinite(stock) || stock < 0 || typeof active !== "boolean") {
      await client.query("ROLLBACK");
      return Response.json({ error: "SKU, name, unit, valid price, stock and active status are required" }, { status: 400 });
    }

    await client.query(
      "UPDATE cm_products SET sku=$1,name=$2,description=$3,unit=$4,price=$5,stock=$6,active=$7,updated_at=NOW() WHERE id=$8",
      [sku, name, description, unit, price, stock, active, current.id]
    );

    const difference = stock - Number(current.stock);
    if (difference !== 0) {
      await client.query(
        "INSERT INTO cm_inventory_movements(product_id,movement_type,quantity,note) VALUES($1,'adjustment',$2,'Admin stock adjustment')",
        [current.id, difference]
      );
    }
    await client.query("COMMIT");
    return Response.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("CM inventory PATCH:", error);
    if (error?.code === "23505") {
      return Response.json({ error: "यो SKU अर्को सामग्रीमा प्रयोग भइसकेको छ।" }, { status: 409 });
    }
    return Response.json({ error: "Could not update inventory" }, { status: 500 });
  } finally {
    client.release();
  }
}

import { getConstructionPool } from "@/lib/construction-materials-db";
export const dynamic = "force-dynamic";
export async function GET() {
 try {
  const { rows } = await getConstructionPool().query("SELECT id,sku,name,description,unit,price::float,stock::float FROM cm_products WHERE active=true ORDER BY name");
  return Response.json({ products: rows });
 } catch (error) { console.error("CM products:", error); return Response.json({ error: "Products service is not configured" }, { status: 503 }); }
}

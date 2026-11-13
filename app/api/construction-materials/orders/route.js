import { randomBytes } from "node:crypto";
import { getConstructionPool } from "@/lib/construction-materials-db";
export const dynamic = "force-dynamic";
export async function POST(request) {
 const body = await request.json().catch(() => null);
 if (!body || !String(body.name||"").trim() || !String(body.phone||"").trim() || !String(body.address||"").trim() || !Number.isFinite(Number(body.quantity)) || Number(body.quantity)<=0 || !Number.isInteger(Number(body.productId))) return Response.json({error:"नाम, फोन, ठेगाना, सामग्री र सही परिमाण आवश्यक छ।"},{status:400});
 const client = await getConstructionPool().connect();
 try {
  await client.query("BEGIN");
  const product = await client.query("SELECT * FROM cm_products WHERE id=$1 AND active=true FOR UPDATE",[Number(body.productId)]);
  if (!product.rowCount) { await client.query("ROLLBACK"); return Response.json({error:"सामग्री उपलब्ध छैन।"},{status:404}); }
  const p=product.rows[0], qty=Number(body.quantity);
  if (Number(p.stock)<qty) { await client.query("ROLLBACK"); return Response.json({error:"पर्याप्त स्टक उपलब्ध छैन।"},{status:409}); }
  const tracking="CM-"+randomBytes(5).toString("hex").toUpperCase();
  const subtotal=Number(p.price)*qty, delivery=Math.max(0,Number(body.deliveryCharge)||0), total=subtotal+delivery;
  const inserted=await client.query(`INSERT INTO cm_orders(tracking_id,customer_name,customer_phone,customer_email,product_id,product_name,unit,quantity,unit_price,subtotal,delivery_charge,total,delivery_address,landmark,latitude,longitude,customer_note)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id,tracking_id,product_name,unit,quantity::float,status,total::float,created_at`,
   [tracking,String(body.name).trim(),String(body.phone).trim(),body.email||null,p.id,p.name,p.unit,qty,p.price,subtotal,delivery,total,String(body.address).trim(),body.landmark||null,body.latitude||null,body.longitude||null,body.note||null]);
  await client.query("UPDATE cm_products SET stock=stock-$1,updated_at=NOW() WHERE id=$2",[qty,p.id]);
  await client.query("INSERT INTO cm_inventory_movements(product_id,movement_type,quantity,reference,note) VALUES($1,'sale',$2,$3,'Customer order reservation')",[p.id,-qty,tracking]);
  await client.query("INSERT INTO cm_order_status_history(order_id,new_status,note) VALUES($1,'pending','Order received')",[inserted.rows[0].id]);
  await client.query("COMMIT");
  return Response.json({order:inserted.rows[0],message:"Order received. Save your Tracking ID."},{status:201});
 } catch(error) { await client.query("ROLLBACK"); console.error("CM order:",error); return Response.json({error:"Order could not be saved"},{status:500}); }
 finally { client.release(); }
}

import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole } from "@/lib/construction-materials-auth";
export const dynamic = "force-dynamic";
export async function GET() {
 const {response}=await requireConstructionRole("admin"); if(response)return response;
 try { const {rows}=await getConstructionPool().query(`SELECT o.*,s.name AS supplier_name FROM cm_orders o LEFT JOIN cm_suppliers s ON s.id=o.supplier_id ORDER BY o.created_at DESC LIMIT 500`); return Response.json({orders:rows}); }
 catch(error){console.error("CM admin orders:",error);return Response.json({error:"Could not load orders"},{status:503});}
}
export async function PATCH(request) {
 const {response}=await requireConstructionRole("admin"); if(response)return response;
 const b=await request.json().catch(()=>null);
 if(!Number.isInteger(Number(b?.id)))return Response.json({error:"Valid order id required"},{status:400});
 const allowed=["pending","approved","dispatched","delivered","rejected","cancelled"];
 const client=await getConstructionPool().connect();
 try {
  await client.query("BEGIN");
  const old=await client.query("SELECT * FROM cm_orders WHERE id=$1 FOR UPDATE",[Number(b.id)]);
  if(!old.rowCount){await client.query("ROLLBACK");return Response.json({error:"Order not found"},{status:404});}
  const o=old.rows[0], status=b.status||o.status, supplierId=b.supplierId===undefined?o.supplier_id:(b.supplierId||null);
  if(!allowed.includes(status)){await client.query("ROLLBACK");return Response.json({error:"Invalid status"},{status:400});}
  if(supplierId){const s=await client.query("SELECT id FROM cm_suppliers WHERE id=$1 AND active=true",[supplierId]);if(!s.rowCount){await client.query("ROLLBACK");return Response.json({error:"Supplier not found"},{status:400});}}
  const paymentStatus=b.paymentStatus||o.payment_status, amountPaid=b.amountPaid===undefined?Number(o.amount_paid):Number(b.amountPaid);
  if(!["unpaid","partial","paid","refunded"].includes(paymentStatus)||!Number.isFinite(amountPaid)||amountPaid<0||amountPaid>Number(o.total)){await client.query("ROLLBACK");return Response.json({error:"Invalid payment details"},{status:400});}
  await client.query(`UPDATE cm_orders SET status=$1,supplier_id=$2,payment_status=$3,amount_paid=$4,payment_method=COALESCE($5,payment_method),updated_at=NOW(),dispatched_at=CASE WHEN $1='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,delivered_at=CASE WHEN $1='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END WHERE id=$6`,[status,supplierId,paymentStatus,amountPaid,b.paymentMethod||null,o.id]);
  if(status!==o.status)await client.query("INSERT INTO cm_order_status_history(order_id,old_status,new_status,note,changed_by) VALUES($1,$2,$3,$4,'admin')",[o.id,o.status,status,b.note||null]);
  await client.query("COMMIT"); return Response.json({ok:true});
 }catch(error){await client.query("ROLLBACK");console.error("CM update order:",error);return Response.json({error:"Could not update order"},{status:500});}finally{client.release();}
}

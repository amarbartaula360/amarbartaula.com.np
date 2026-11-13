import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole } from "@/lib/construction-materials-auth";
export const dynamic="force-dynamic";
export async function GET(request){
 const {response}=await requireConstructionRole("admin");if(response)return response;
 const url=new URL(request.url),supplierId=url.searchParams.get("supplierId");
 try{
  const pool=getConstructionPool();
  const suppliers=await pool.query(`SELECT s.id,s.supplier_code,s.name,s.phone,
    COALESCE(o.assigned_total,0)::float AS assigned_total,
    COALESCE(p.paid_total,0)::float AS paid_total,
    (COALESCE(o.assigned_total,0)-COALESCE(p.paid_total,0))::float AS due
   FROM cm_suppliers s
   LEFT JOIN (SELECT supplier_id,SUM(total) assigned_total FROM cm_orders WHERE supplier_id IS NOT NULL AND status NOT IN ('rejected','cancelled') GROUP BY supplier_id)o ON o.supplier_id=s.id
   LEFT JOIN (SELECT supplier_id,SUM(amount) paid_total FROM cm_supplier_payments GROUP BY supplier_id)p ON p.supplier_id=s.id
   ORDER BY s.name`);
  const orders=await pool.query(`SELECT o.id,o.tracking_id,o.product_name,o.quantity,o.unit,o.total::float AS total,o.status,o.created_at,s.id AS supplier_id,s.name AS supplier_name,
    COALESCE(p.paid,0)::float AS paid,(o.total-COALESCE(p.paid,0))::float AS due
   FROM cm_orders o JOIN cm_suppliers s ON s.id=o.supplier_id
   LEFT JOIN (SELECT order_id,SUM(amount) paid FROM cm_supplier_payments GROUP BY order_id)p ON p.order_id=o.id
   WHERE o.status NOT IN ('rejected','cancelled') AND ($1::bigint IS NULL OR s.id=$1)
   ORDER BY o.created_at DESC`,[supplierId?Number(supplierId):null]);
  const payments=await pool.query(`SELECT p.id,p.supplier_id,s.name AS supplier_name,p.order_id,o.tracking_id,p.amount::float AS amount,p.payment_method,p.reference_no,p.note,p.paid_at
   FROM cm_supplier_payments p JOIN cm_suppliers s ON s.id=p.supplier_id JOIN cm_orders o ON o.id=p.order_id
   WHERE ($1::bigint IS NULL OR p.supplier_id=$1) ORDER BY p.paid_at DESC,p.id DESC LIMIT 1000`,[supplierId?Number(supplierId):null]);
  return Response.json({suppliers:suppliers.rows,orders:orders.rows,payments:payments.rows});
 }catch(e){console.error("Supplier payment ledger:",e);return Response.json({error:"Supplier ledger unavailable"},{status:503});}
}
export async function POST(request){
 const {response,session}=await requireConstructionRole("admin");if(response)return response;
 const b=await request.json().catch(()=>null),orderId=Number(b?.orderId),amount=Number(b?.amount),method=String(b?.paymentMethod||"");
 if(!Number.isInteger(orderId)||orderId<1||!Number.isFinite(amount)||amount<=0||!["cash","bank","online","cheque"].includes(method))return Response.json({error:"Valid order, amount and payment method required"},{status:400});
 const client=await getConstructionPool().connect();
 try{
  await client.query("BEGIN");
  const found=await client.query("SELECT id,supplier_id,total,status FROM cm_orders WHERE id=$1 FOR UPDATE",[orderId]);
  if(!found.rowCount||!found.rows[0].supplier_id||["rejected","cancelled"].includes(found.rows[0].status)){await client.query("ROLLBACK");return Response.json({error:"Supplier-assigned active order not found"},{status:404});}
  const order=found.rows[0],paid=await client.query("SELECT COALESCE(SUM(amount),0)::numeric AS amount FROM cm_supplier_payments WHERE order_id=$1",[orderId]);
  const due=Number(order.total)-Number(paid.rows[0].amount);
  if(amount>due+0.0001){await client.query("ROLLBACK");return Response.json({error:"भुक्तानी बाँकी रकमभन्दा बढी भयो। बाँकी: "+due.toFixed(2)},{status:400});}
  const inserted=await client.query(`INSERT INTO cm_supplier_payments(supplier_id,order_id,amount,payment_method,reference_no,note,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,supplier_id,order_id,amount::float AS amount,payment_method,reference_no,note,paid_at`,
   [order.supplier_id,orderId,amount,method,String(b.referenceNo||"").trim()||null,String(b.note||"").trim()||null,session?.name||"admin"]);
  await client.query("COMMIT");return Response.json({payment:inserted.rows[0]},{status:201});
 }catch(e){await client.query("ROLLBACK");console.error("Supplier payment:",e);return Response.json({error:"Could not record supplier payment"},{status:500});}finally{client.release();}
}
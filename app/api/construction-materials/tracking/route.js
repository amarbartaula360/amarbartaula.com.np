import { getConstructionPool } from "@/lib/construction-materials-db";
export const dynamic = "force-dynamic";
export async function GET(request) {
 const id=new URL(request.url).searchParams.get("id")?.trim();
 if(!id) return Response.json({error:"Tracking ID is required"},{status:400});
 try {
  const {rows}=await getConstructionPool().query(`SELECT tracking_id,product_name,unit,quantity::float,total::float,status,payment_status,created_at,updated_at,dispatched_at,delivered_at FROM cm_orders WHERE tracking_id=$1`,[id.toUpperCase()]);
  if(!rows.length) return Response.json({error:"Tracking ID भेटिएन।"},{status:404});
  return Response.json({order:rows[0]});
 } catch(error) { console.error("CM tracking:",error); return Response.json({error:"Tracking service unavailable"},{status:503}); }
}

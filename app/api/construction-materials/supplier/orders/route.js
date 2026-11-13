import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole } from "@/lib/construction-materials-auth";
export const dynamic="force-dynamic";
export async function GET(){const {session,response}=await requireConstructionRole("supplier");if(response)return response;try{const {rows}=await getConstructionPool().query("SELECT tracking_id,customer_name,customer_phone,product_name,unit,quantity::float,total::float,delivery_address,landmark,latitude,longitude,status,payment_status,created_at FROM cm_orders WHERE supplier_id=$1 ORDER BY created_at DESC",[session.supplierId]);return Response.json({orders:rows});}catch(e){console.error(e);return Response.json({error:"Could not load assigned orders"},{status:503});}}

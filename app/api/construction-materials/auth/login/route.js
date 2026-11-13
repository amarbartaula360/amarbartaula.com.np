import bcrypt from "bcryptjs";
import { getConstructionPool } from "@/lib/construction-materials-db";
import { createConstructionSession } from "@/lib/construction-materials-auth";
export const dynamic = "force-dynamic";
export async function POST(request) {
 const body=await request.json().catch(()=>null);
 const username=String(body?.username||"").trim(), password=String(body?.password||"");
 if(!username||!password) return Response.json({error:"Username and password required"},{status:400});
 try {
  const pool=getConstructionPool();
  let result=await pool.query("SELECT id,username AS name,password_hash,'admin' AS role,NULL::bigint AS supplier_id FROM cm_admin_users WHERE username=$1 AND active=true",[username]);
  if(!result.rowCount) result=await pool.query("SELECT id,name,password_hash,'supplier' AS role,id AS supplier_id FROM cm_suppliers WHERE supplier_code=$1 AND active=true",[username]);
  const user=result.rows[0];
  if(!user||!(await bcrypt.compare(password,user.password_hash))) return Response.json({error:"Login विवरण मिलेन।"},{status:401});
  await createConstructionSession(user);
  if(user.role==="admin") await pool.query("UPDATE cm_admin_users SET last_login_at=NOW() WHERE id=$1",[user.id]);
  return Response.json({user:{id:user.id,name:user.name,role:user.role,supplierId:user.supplier_id}});
 } catch(error) { console.error("CM login:",error); return Response.json({error:"Authentication service unavailable"},{status:503}); }
}

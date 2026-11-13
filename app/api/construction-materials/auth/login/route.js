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
  const expectedRole=body?.expectedRole==="admin"||body?.expectedRole==="supplier"?body.expectedRole:null;
  const adminResult=await pool.query("SELECT id,username AS name,password_hash,'admin' AS role,NULL::bigint AS supplier_id FROM cm_admin_users WHERE username=$1 AND active=true",[username]);
  const supplierResult=await pool.query("SELECT id,name,password_hash,'supplier' AS role,id AS supplier_id FROM cm_suppliers WHERE supplier_code=$1 AND active=true",[username]);
  const candidates=[...adminResult.rows,...supplierResult.rows];
  let user=null;
  for(const candidate of candidates){if(await bcrypt.compare(password,candidate.password_hash)){user=candidate;break;}}
  if(!user) return Response.json({error:"Login ID वा Password मिलेन।"},{status:401});
  if(expectedRole&&user.role!==expectedRole){
   const message=expectedRole==="admin"
    ?"यो Supplier खाता हो। कृपया Supplier Login प्रयोग गर्नुहोस्।"
    :"यो Admin खाता हो। कृपया Admin Login प्रयोग गर्नुहोस्।";
   return Response.json({error:message,code:"ROLE_MISMATCH"},{status:403});
  }
  await createConstructionSession(user);
  if(user.role==="admin") await pool.query("UPDATE cm_admin_users SET last_login_at=NOW() WHERE id=$1",[user.id]);
  return Response.json({user:{id:user.id,name:user.name,role:user.role,supplierId:user.supplier_id}});
 } catch(error) { console.error("CM login:",error); return Response.json({error:"Authentication service unavailable"},{status:503}); }
}

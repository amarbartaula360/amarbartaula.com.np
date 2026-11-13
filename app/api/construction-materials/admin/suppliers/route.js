import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole } from "@/lib/construction-materials-auth";
export const dynamic="force-dynamic";
export async function GET(){const {response}=await requireConstructionRole("admin");if(response)return response;try{const {rows}=await getConstructionPool().query("SELECT id,supplier_code,name,phone,email,address,service_areas,active,created_at FROM cm_suppliers ORDER BY name");return Response.json({suppliers:rows});}catch(e){console.error(e);return Response.json({error:"Could not load suppliers"},{status:503});}}
export async function POST(request){const {response}=await requireConstructionRole("admin");if(response)return response;const b=await request.json().catch(()=>null);if(!b?.name)return Response.json({error:"Supplier name is required"},{status:400});const code=String(b.code||("SUP-"+randomBytes(3).toString("hex").toUpperCase()));const password=String(b.password||randomBytes(9).toString("base64url"));if(password.length<8)return Response.json({error:"Password must be at least 8 characters"},{status:400});try{const hash=await bcrypt.hash(password,12);const {rows}=await getConstructionPool().query("INSERT INTO cm_suppliers(supplier_code,name,phone,email,password_hash,address,service_areas) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,supplier_code,name,phone,email,address,service_areas,active",[code,b.name,String(b.phone||"").trim(),b.email||null,hash,b.address||null,Array.isArray(b.serviceAreas)?b.serviceAreas:[]]);return Response.json({supplier:rows[0],temporaryPassword:password},{status:201});}catch(e){console.error(e);return Response.json({error:"Supplier code already exists or could not be saved"},{status:409});}}

export async function PATCH(request){
 const {response}=await requireConstructionRole("admin");if(response)return response;
 const b=await request.json().catch(()=>null),id=Number(b?.id);
 if(!Number.isInteger(id)||id<1)return Response.json({error:"Valid supplier id required"},{status:400});
 const name=String(b?.name||"").trim(),code=String(b?.code||"").trim();
 if(!name||!code)return Response.json({error:"Supplier name and Login ID are required"},{status:400});
 const password=b.password===undefined||b.password===null?"":String(b.password);
 if(password&&password.length<8)return Response.json({error:"Password must be at least 8 characters"},{status:400});
 try{
  const passwordHash=password?await bcrypt.hash(password,12):null;
  const {rows}=await getConstructionPool().query("UPDATE cm_suppliers SET supplier_code=$1,name=$2,phone=$3,email=$4,address=$5,active=$6,password_hash=COALESCE($7,password_hash) WHERE id=$8 RETURNING id,supplier_code,name,phone,email,address,service_areas,active,created_at",
   [code,name,String(b.phone||"").trim(),String(b.email||"").trim()||null,String(b.address||"").trim()||null,b.active!==false,passwordHash,id]);
  if(!rows.length)return Response.json({error:"Supplier not found"},{status:404});
  return Response.json({supplier:rows[0],passwordUpdated:Boolean(password)});
 }catch(e){console.error("Update supplier:",e);return Response.json({error:"Login ID duplicate हुन सक्छ वा Supplier अपडेट हुन सकेन।"},{status:409});}
}

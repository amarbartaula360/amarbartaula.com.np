import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole } from "@/lib/construction-materials-auth";
export const dynamic="force-dynamic";
export async function GET(){const {response}=await requireConstructionRole("admin");if(response)return response;try{const {rows}=await getConstructionPool().query("SELECT id,supplier_code,name,phone,email,address,service_areas,active,created_at FROM cm_suppliers ORDER BY name");return Response.json({suppliers:rows});}catch(e){console.error(e);return Response.json({error:"Could not load suppliers"},{status:503});}}
export async function POST(request){const {response}=await requireConstructionRole("admin");if(response)return response;const b=await request.json().catch(()=>null);if(!b?.name)return Response.json({error:"Supplier name is required"},{status:400});const code=String(b.code||("SUP-"+randomBytes(3).toString("hex").toUpperCase()));const password=String(b.password||randomBytes(9).toString("base64url"));if(password.length<8)return Response.json({error:"Password must be at least 8 characters"},{status:400});try{const hash=await bcrypt.hash(password,12);const {rows}=await getConstructionPool().query("INSERT INTO cm_suppliers(supplier_code,name,phone,email,password_hash,address,service_areas) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,supplier_code,name,phone,email,address,service_areas,active",[code,b.name,String(b.phone||"").trim(),b.email||null,hash,b.address||null,Array.isArray(b.serviceAreas)?b.serviceAreas:[]]);return Response.json({supplier:rows[0],temporaryPassword:password},{status:201});}catch(e){console.error(e);return Response.json({error:"Supplier code already exists or could not be saved"},{status:409});}}

export async function PATCH(request){
 const {response}=await requireConstructionRole("admin");if(response)return response;
 const b=await request.json().catch(()=>null);
 const id=Number(b?.id);if(!Number.isInteger(id)||id<=0)return Response.json({error:"Valid supplier id is required"},{status:400});
 const name=String(b?.name||"").trim();if(!name)return Response.json({error:"Supplier name is required"},{status:400});
 const phone=String(b?.phone||"").trim(),email=String(b?.email||"").trim()||null,address=String(b?.address||"").trim()||null;
 const active=b?.active===undefined?true:Boolean(b.active);
 try{
  const {rows}=await getConstructionPool().query("UPDATE cm_suppliers SET name=$1,phone=$2,email=$3,address=$4,active=$5 WHERE id=$6 RETURNING id,supplier_code,name,phone,email,address,service_areas,active,created_at",[name,phone,email,address,active,id]);
  if(!rows.length)return Response.json({error:"Supplier not found"},{status:404});
  return Response.json({supplier:rows[0]});
 }catch(e){console.error("Update supplier:",e);return Response.json({error:"Could not update supplier information"},{status:500});}
}

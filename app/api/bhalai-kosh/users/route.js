import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
const MODULES = ["dashboard","members","savings","finance","vouchers","loans","reports","ledger","import","settings","users"];
const ensurePermissionsTable = async db => db.query(`
  CREATE TABLE IF NOT EXISTS bhalai_kosh_user_permissions (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);
const canManage = s => s && ["admin","super_admin"].includes(s.role);
const cleanPermissions = value => Object.fromEntries(MODULES.map(key=>[key,!!value?.[key]]));
export async function GET() {
  try {
    const s=await getBhalaiKoshSession();
    if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
    if(!canManage(s)&&!s.permissions?.users)return NextResponse.json({error:"प्रयोगकर्ता व्यवस्थापन अनुमति छैन।"},{status:403});
    const db=getBhalaiKoshPool();await ensurePermissionsTable(db);
    const {rows}=await db.query(`SELECT u.id,u.full_name,u.email,u.role,u.is_active,u.last_login_at,u.created_at,
      COALESCE(p.permissions,'{}'::jsonb) AS permissions
      FROM users u LEFT JOIN bhalai_kosh_user_permissions p ON p.user_id=u.id AND p.organization_id=u.organization_id
      WHERE u.organization_id=$1 ORDER BY u.created_at DESC,u.id DESC`,[s.oid]);
    return NextResponse.json({users:rows,modules:MODULES});
  } catch(e){console.error("Bhalai users GET",e);return NextResponse.json({error:"प्रयोगकर्ता सूची ल्याउन सकिएन।"},{status:500});}
}
export async function POST(request) {
  const s=await getBhalaiKoshSession();
  if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!canManage(s))return NextResponse.json({error:"प्रयोगकर्ता बनाउन Admin अनुमति आवश्यक छ।"},{status:403});
  const b=await request.json();
  const fullName=String(b.fullName||"").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
  const role=["admin","accountant","staff"].includes(String(b.role))?String(b.role):"staff";
  if(fullName.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<8)
    return NextResponse.json({error:"नाम, सही Email/User ID र कम्तीमा ८ अक्षरको Password आवश्यक छ।"},{status:400});
  const permissions=cleanPermissions(b.permissions);
  const db=getBhalaiKoshPool(),c=await db.connect();
  try{
    await ensurePermissionsTable(db);await c.query("BEGIN");
    const hash=await bcrypt.hash(password,12);
    const inserted=await c.query(`INSERT INTO users(organization_id,full_name,email,password_hash,role,is_active)
      VALUES($1,$2,$3,$4,$5,true) RETURNING id,full_name,email,role,is_active,created_at`,
      [s.oid,fullName,email,hash,role]);
    const user=inserted.rows[0];
    await c.query(`INSERT INTO bhalai_kosh_user_permissions(user_id,organization_id,permissions)
      VALUES($1,$2,$3::jsonb)`,[user.id,s.oid,JSON.stringify(permissions)]);
    await c.query("INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES($1,$2,'user_create','user',$2)",[s.oid,s.uid||null]);
    await c.query("COMMIT");
    return NextResponse.json({ok:true,user:{...user,permissions},message:"नयाँ User ID सफलतापूर्वक बन्यो।"},{status:201});
  }catch(e){await c.query("ROLLBACK");if(e.code==="23505")return NextResponse.json({error:"यो Email/User ID पहिले नै प्रयोग भएको छ।"},{status:409});console.error("Bhalai users POST",e);return NextResponse.json({error:"नयाँ प्रयोगकर्ता बनाउन सकिएन।"},{status:500});}
  finally{c.release();}
}
export async function PATCH(request) {
  const s=await getBhalaiKoshSession();
  if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!canManage(s))return NextResponse.json({error:"प्रयोगकर्ता परिवर्तन गर्न Admin अनुमति आवश्यक छ।"},{status:403});
  const b=await request.json(),id=Number(b.id);
  if(!Number.isInteger(id)||id<1)return NextResponse.json({error:"सही प्रयोगकर्ता छान्नुहोस्।"},{status:400});
  if(id===Number(s.uid)&&b.isActive===false)return NextResponse.json({error:"आफ्नो Login बन्द गर्न मिल्दैन।"},{status:400});
  const db=getBhalaiKoshPool(),c=await db.connect();
  try{
    await ensurePermissionsTable(db);await c.query("BEGIN");
    const found=await c.query("SELECT id FROM users WHERE id=$1 AND organization_id=$2 FOR UPDATE",[id,s.oid]);
    if(!found.rowCount)throw Object.assign(new Error("प्रयोगकर्ता भेटिएन।"),{status:404});
    if(typeof b.isActive==="boolean")await c.query("UPDATE users SET is_active=$1,updated_at=now() WHERE id=$2 AND organization_id=$3",[b.isActive,id,s.oid]);
    if(b.permissions)await c.query(`INSERT INTO bhalai_kosh_user_permissions(user_id,organization_id,permissions)
      VALUES($1,$2,$3::jsonb) ON CONFLICT(user_id) DO UPDATE SET permissions=EXCLUDED.permissions,updated_at=now()`,
      [id,s.oid,JSON.stringify(cleanPermissions(b.permissions))]);
    if(b.password){const password=String(b.password);if(password.length<8)throw Object.assign(new Error("Password कम्तीमा ८ अक्षरको हुनुपर्छ।"),{status:400});const hash=await bcrypt.hash(password,12);await c.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2 AND organization_id=$3",[hash,id,s.oid]);}
    await c.query("COMMIT");
    return NextResponse.json({ok:true,message:"प्रयोगकर्ता विवरण सुरक्षित भयो।"});
  }catch(e){await c.query("ROLLBACK");console.error("Bhalai users PATCH",e);return NextResponse.json({error:e.message||"प्रयोगकर्ता अपडेट गर्न सकिएन।"},{status:e.status||500});}
  finally{c.release();}
}

import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
export async function GET() {
  try {
    const s = await getBhalaiKoshSession();
    if (!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
    const db = getBhalaiKoshPool();
    const { rows } = await db.query(`
      SELECT m.id,m.member_code,m.full_name,m.nepali_name,m.phone,m.designation,m.department,m.joined_on,m.status,
      COALESCE((SELECT SUM(ml.credit-ml.debit) FROM member_ledger ml WHERE ml.member_id=m.id),0) AS ledger_balance
      FROM members m WHERE m.organization_id=$1 ORDER BY m.full_name
    `,[s.oid]);
    return NextResponse.json({members:rows});
  } catch(e) { console.error("Bhalai members GET:",e.message); return NextResponse.json({error:"सदस्य सूची ल्याउन सकिएन।"},{status:500}); }
}
export async function POST(request) {
  try {
    const s = await getBhalaiKoshSession();
    if (!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
    if (!["admin","super_admin","accountant","staff"].includes(s.role)) return NextResponse.json({error:"Permission denied"},{status:403});
    const b = await request.json();
    const code=String(b.memberCode||"").trim().toUpperCase(), name=String(b.fullName||"").trim();
    if(!/^[A-Z0-9_-]{2,40}$/.test(code)||!name) return NextResponse.json({error:"Member ID र नाम अनिवार्य छन्।"},{status:400});
    const db=getBhalaiKoshPool();
    const {rows}=await db.query(`INSERT INTO members(organization_id,member_code,full_name,nepali_name,phone,email,designation,department,joined_on,status,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::date,CURRENT_DATE),'active',$10)
      RETURNING id,member_code,full_name,phone,designation,department,joined_on,status`,
      [s.oid,code,name,b.nepaliName||null,b.phone||null,b.email||null,b.designation||null,b.department||null,b.joinedOn||null,s.uid||null]);
    return NextResponse.json({member:rows[0]}, {status:201});
  } catch(e) { if(e.code==="23505") return NextResponse.json({error:"यो Member ID पहिले नै प्रयोग भएको छ।"},{status:409}); console.error("Bhalai members POST:",e.message); return NextResponse.json({error:"सदस्य दर्ता गर्न सकिएन।"},{status:500}); }
}

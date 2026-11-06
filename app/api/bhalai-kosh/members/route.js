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
      SELECT m.id,m.member_code,m.full_name,m.nepali_name,m.gender,m.date_of_birth,m.phone,m.email,m.address,m.citizenship_no,m.designation,m.department,m.bank_name,m.bank_branch,m.bank_account_name,m.bank_account_no,m.emergency_contact,m.joined_on,m.status,m.notes,
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

export async function PUT(request) {
  try {
    const s = await getBhalaiKoshSession();
    if (!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
    if (!["admin","super_admin","accountant"].includes(s.role)) return NextResponse.json({error:"Permission denied"},{status:403});
    const b = await request.json();
    const id = Number(b.id);
    const code = String(b.memberCode||"").trim().toUpperCase();
    const name = String(b.fullName||"").trim();
    if (!Number.isInteger(id) || id < 1 || !/^[A-Z0-9_-]{2,40}$/.test(code) || !name)
      return NextResponse.json({error:"Member ID, कर्मचारी कोड र नाम अनिवार्य छन्।"},{status:400});
    const db = getBhalaiKoshPool();
    const {rows} = await db.query(`
      UPDATE members SET member_code=$3, full_name=$4, nepali_name=$5, gender=$6,
        date_of_birth=$7, phone=$8, email=$9, address=$10, citizenship_no=$11,
        designation=$12, department=$13, bank_name=$14, bank_branch=$15,
        bank_account_name=$16, bank_account_no=$17, emergency_contact=$18,
        joined_on=COALESCE($19::date,joined_on), status=$20, notes=$21, updated_at=now()
      WHERE id=$1 AND organization_id=$2
      RETURNING id,member_code,full_name,nepali_name,phone,email,designation,department,joined_on,status
    `,[id,s.oid,code,name,b.nepaliName||null,b.gender||null,b.dateOfBirth||null,b.phone||null,b.email||null,b.address||null,b.citizenshipNo||null,b.designation||null,b.department||null,b.bankName||null,b.bankBranch||null,b.bankAccountName||null,b.bankAccountNo||null,b.emergencyContact||null,b.joinedOn||null,b.status||"active",b.notes||null]);
    if (!rows[0]) return NextResponse.json({error:"सदस्य भेटिएन।"},{status:404});
    return NextResponse.json({member:rows[0]});
  } catch(e) {
    if(e.code==="23505") return NextResponse.json({error:"यो Member ID पहिले नै प्रयोग भएको छ।"},{status:409});
    console.error("Bhalai members PUT:",e.message);
    return NextResponse.json({error:"सदस्य विवरण अद्यावधिक गर्न सकिएन।"},{status:500});
  }
}
export async function DELETE(request) {
  try {
    const s = await getBhalaiKoshSession();
    if (!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
    if (!["admin","super_admin"].includes(s.role)) return NextResponse.json({error:"Delete गर्न Admin अनुमति आवश्यक छ।"},{status:403});
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({error:"सही सदस्य छान्नुहोस्।"},{status:400});
    const db = getBhalaiKoshPool();
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query("SELECT id FROM members WHERE id=$1 AND organization_id=$2 FOR UPDATE",[id,s.oid]);
      if (!found.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({error:"सदस्य भेटिएन।"},{status:404}); }
      const linked = await client.query(`
        SELECT
          EXISTS(SELECT 1 FROM savings WHERE member_id=$1) OR
          EXISTS(SELECT 1 FROM deposits WHERE member_id=$1) OR
          EXISTS(SELECT 1 FROM member_ledger WHERE member_id=$1) OR
          EXISTS(SELECT 1 FROM loans WHERE member_id=$1) OR
          EXISTS(SELECT 1 FROM loan_payments WHERE member_id=$1) AS has_history
      `,[id]);
      if (linked.rows[0].has_history) {
        await client.query("UPDATE members SET status='left',updated_at=now() WHERE id=$1 AND organization_id=$2",[id,s.oid]);
        await client.query("COMMIT");
        return NextResponse.json({deleted:false,archived:true,message:"यस सदस्यको आर्थिक कारोबार भएकाले अभिलेख सुरक्षित राखी सदस्यलाई निष्क्रिय (Left) बनाइयो।"});
      }
      await client.query("DELETE FROM members WHERE id=$1 AND organization_id=$2",[id,s.oid]);
      await client.query("COMMIT");
      return NextResponse.json({deleted:true,message:"सदस्य हटाइयो।"});
    } catch(e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  } catch(e) {
    console.error("Bhalai members DELETE:",e.message);
    return NextResponse.json({error:"सदस्य हटाउन सकिएन।"},{status:500});
  }
}

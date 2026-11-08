import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession, hasBhalaiKoshPermission } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const s=await getBhalaiKoshSession(); if(!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!hasBhalaiKoshPermission(s,"savings"))return NextResponse.json({error:"मासिक बचत अनुमति छैन।"},{status:403});
    if(!hasBhalaiKoshPermission(s,"savings"))return NextResponse.json({error:"मासिक बचत अनुमति छैन।"},{status:403});
    const {searchParams}=new URL(request.url);
    const year=Number(searchParams.get("year")||new Date().getFullYear());
    const month=Number(searchParams.get("month")||new Date().getMonth()+1);
    const {rows}=await getBhalaiKoshPool().query(`
      SELECT sv.id,sv.member_id,m.member_code,m.full_name,sv.period_year,sv.period_month,sv.amount,sv.paid_on,sv.payment_method,sv.receipt_no,sv.status
      FROM savings sv JOIN members m ON m.id=sv.member_id
      WHERE sv.organization_id=$1 AND sv.period_year=$2 AND sv.period_month=$3 AND sv.status='posted'
      ORDER BY m.full_name
    `,[s.oid,year,month]);
    return NextResponse.json({contributions:rows});
  } catch(e){console.error("Bhalai contributions GET:",e.message);return NextResponse.json({error:"योगदान विवरण ल्याउन सकिएन।"},{status:500});}
}

export async function POST(request) {
  const s=await getBhalaiKoshSession(); if(!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["admin","super_admin","accountant"].includes(s.role)||!hasBhalaiKoshPermission(s,"savings")) return NextResponse.json({error:"Permission denied"},{status:403});
  const b=await request.json(); const memberId=Number(b.memberId), year=Number(b.year), month=Number(b.month), amount=Number(b.amount);
  if(!Number.isInteger(memberId)||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12||!Number.isFinite(amount)||amount<=0)
    return NextResponse.json({error:"सदस्य, महिना र सही रकम आवश्यक छ।"},{status:400});
  const db=getBhalaiKoshPool(), c=await db.connect();
  try{
    await c.query("BEGIN");
    const member=await c.query("SELECT id,continue_saving FROM members WHERE id=$1 AND organization_id=$2 AND status='active' FOR UPDATE",[memberId,s.oid]);
    if(!member.rowCount) throw Object.assign(new Error("सक्रिय सदस्य भेटिएन।"),{status:404});
    if(member.rows[0].continue_saving===false) throw Object.assign(new Error("यस सदस्यको ऋण बन्द गर्दा बचत रोकिएको छ। नयाँ मासिक बचत दर्ता गर्न मिल्दैन।"),{status:409});
    const exists=await c.query("SELECT id,status FROM savings WHERE organization_id=$1 AND member_id=$2 AND period_year=$3 AND period_month=$4 FOR UPDATE",[s.oid,memberId,year,month]);
    if(exists.rowCount && exists.rows[0].status!=="voided") throw Object.assign(new Error("यो सदस्यको यस महिनाको योगदान पहिले नै दर्ता छ।"),{status:409});
    const acc=await c.query("SELECT id,account_code FROM chart_of_accounts WHERE organization_id=$1 AND account_code IN ('1001','1002','2001')",[s.oid]);
    const byCode=Object.fromEntries(acc.rows.map(x=>[x.account_code,x.id]));
    if(!byCode["1001"]||!byCode["2001"]) throw new Error("Chart of Accounts migration चलाइएको छैन।");
    const method=String(b.paymentMethod||"cash");
    const debitCode=method==="bank"||method==="transfer"||method==="cheque"||method==="online"?"1002":"1001";
    if(!byCode[debitCode]) throw new Error("Bank/Cash account setup अपूर्ण छ।");
    const receipt="BK-RC-"+Date.now();
    const paidOn=b.paidOn||null;
    const v=await c.query(`INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at)
      VALUES($1,$2,'receipt',COALESCE($3::date,CURRENT_DATE),$4,'saving',$5,'posted',$6,now()) RETURNING id`,
      [s.oid,receipt,paidOn,"Member monthly contribution",memberId,s.uid||null]);
    const voucherId=v.rows[0].id;
    await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit) VALUES($1,$2,$3,$4,0),($1,$5,$3,0,$4)",
      [voucherId,byCode[debitCode],memberId,amount,byCode["2001"]]);
    let savingId;
    if(exists.rowCount){
      const updated=await c.query(`UPDATE savings SET amount=$1,paid_on=COALESCE($2::date,CURRENT_DATE),payment_method=$3,receipt_no=$4,status='posted',received_by=$5
        WHERE id=$6 RETURNING id`,[amount,paidOn,method,receipt,s.uid||null,exists.rows[0].id]);
      savingId=updated.rows[0].id;
    } else {
      const sv=await c.query(`INSERT INTO savings(organization_id,member_id,period_year,period_month,amount,paid_on,payment_method,receipt_no,status,received_by)
        VALUES($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7,$8,'posted',$9) RETURNING id`,
        [s.oid,memberId,year,month,amount,paidOn,method,receipt,s.uid||null]);
      savingId=sv.rows[0].id;
    }
    await c.query(`INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,credit,narration)
      VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),'contribution',$5,$6)`,
      [s.oid,memberId,voucherId,paidOn,amount,"मासिक सदस्य योगदान"]);
    await c.query("COMMIT");
    return NextResponse.json({ok:true,savingId,voucherNo:receipt},{status:201});
  }catch(e){await c.query("ROLLBACK");const status=e.status||(e.code==="23505"?409:500);return NextResponse.json({error:e.code==="23505"?"यो सदस्यको यस महिनाको बचत पहिले नै दर्ता भइसकेको छ।":(e.message||"योगदान पोस्ट गर्न सकिएन।")},{status});}
  finally{c.release();}
}

export async function DELETE(request) {
  const s=await getBhalaiKoshSession(); if(!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!hasBhalaiKoshPermission(s,"savings"))return NextResponse.json({error:"मासिक बचत अनुमति छैन।"},{status:403});
  if(!["admin","super_admin","accountant"].includes(s.role)) return NextResponse.json({error:"Permission denied"},{status:403});
  const id=Number(new URL(request.url).searchParams.get("id"));
  if(!Number.isInteger(id)||id<=0) return NextResponse.json({error:"सही बचत अभिलेख छान्नुहोस्।"},{status:400});
  const c=await getBhalaiKoshPool().connect();
  try {
    await c.query("BEGIN");
    const found=await c.query("SELECT id,member_id,amount,paid_on,receipt_no,status FROM savings WHERE id=$1 AND organization_id=$2 FOR UPDATE",[id,s.oid]);
    if(!found.rowCount) throw Object.assign(new Error("बचत अभिलेख भेटिएन।"),{status:404});
    const saving=found.rows[0];
    if(saving.status!=="posted") throw Object.assign(new Error("यो बचत पहिले नै रद्द गरिएको छ।"),{status:409});
    if(saving.receipt_no){
      const voucher=await c.query("SELECT id FROM vouchers WHERE organization_id=$1 AND voucher_no=$2 FOR UPDATE",[s.oid,saving.receipt_no]);
      if(voucher.rowCount){
        await c.query("DELETE FROM member_ledger WHERE organization_id=$1 AND member_id=$2 AND voucher_id=$3",[s.oid,saving.member_id,voucher.rows[0].id]);
        await c.query("UPDATE vouchers SET status='reversed' WHERE id=$1 AND organization_id=$2",[voucher.rows[0].id,s.oid]);
      }
    } else {
      await c.query(`DELETE FROM member_ledger WHERE organization_id=$1 AND member_id=$2 AND transaction_type IN ('contribution','saving')
        AND transaction_date=$3::date AND credit=$4`,[s.oid,saving.member_id,saving.paid_on,saving.amount]);
    }
    await c.query("UPDATE savings SET status='voided' WHERE id=$1 AND organization_id=$2",[id,s.oid]);
    await c.query("COMMIT");
    return NextResponse.json({ok:true,message:"बचत रद्द गरियो। सम्बन्धित Voucher reverse गरियो; पुरानो हिसाबको audit record सुरक्षित छ।"});
  } catch(e) {
    await c.query("ROLLBACK");
    return NextResponse.json({error:e.message||"बचत रद्द गर्न सकिएन।"},{status:e.status||500});
  } finally { c.release(); }
}

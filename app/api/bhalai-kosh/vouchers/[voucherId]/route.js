import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
const allowed = ["admin","super_admin","accountant"];
const amount = value => Number(Number(value || 0).toFixed(2));

export async function GET(_request,{params}) {
  try {
    const session=await getBhalaiKoshSession();
    if(!session?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
    const {voucherId}=await params;
    const db=getBhalaiKoshPool();
    const v=await db.query(`SELECT id,voucher_no,voucher_type,voucher_date,narration,status,reference_type,reference_id
      FROM vouchers WHERE id=$1 AND organization_id=$2`,[voucherId,session.oid]);
    if(!v.rowCount)return NextResponse.json({error:"Voucher भेटिएन।"},{status:404});
    const lines=await db.query(`SELECT l.id,l.account_id,l.member_id,l.debit,l.credit,l.narration,
      a.account_code,a.account_name FROM voucher_lines l JOIN chart_of_accounts a ON a.id=l.account_id
      WHERE l.voucher_id=$1 ORDER BY l.id`,[voucherId]);
    return NextResponse.json({voucher:v.rows[0],lines:lines.rows});
  } catch(e){console.error("Voucher detail GET",e);return NextResponse.json({error:"Voucher विवरण ल्याउन सकिएन।"},{status:500});}
}

export async function PATCH(request,{params}) {
  const session=await getBhalaiKoshSession();
  if(!session?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!allowed.includes(session.role))return NextResponse.json({error:"Permission denied"},{status:403});
  const {voucherId}=await params;
  const body=await request.json();
  const date=String(body.date||"").trim(), narration=String(body.narration||"").trim();
  const lines=Array.isArray(body.lines)?body.lines:[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!narration||lines.length<2||lines.length>50)
    return NextResponse.json({error:"मिति, विवरण र कम्तीमा दुईवटा खाता लाइन आवश्यक छन्।"},{status:400});
  const normalized=lines.map(x=>({accountId:Number(x.accountId),memberId:x.memberId?Number(x.memberId):null,debit:amount(x.debit),credit:amount(x.credit),narration:String(x.narration||"").trim()}));
  if(normalized.some(x=>!Number.isInteger(x.accountId)||x.accountId<1||!Number.isFinite(x.debit)||!Number.isFinite(x.credit)||x.debit<0||x.credit<0||((x.debit>0)===(x.credit>0))||(x.memberId!==null&&(!Number.isInteger(x.memberId)||x.memberId<1))))
    return NextResponse.json({error:"प्रत्येक लाइनमा सही खाता र Debit वा Credit मध्ये एउटा मात्र रकम राख्नुहोस्।"},{status:400});
  const debit=amount(normalized.reduce((sum,x)=>sum+x.debit,0)),credit=amount(normalized.reduce((sum,x)=>sum+x.credit,0));
  if(debit<=0||Math.abs(debit-credit)>0.009)return NextResponse.json({error:"Debit र Credit बराबर हुनुपर्छ।"},{status:400});
  const db=getBhalaiKoshPool(),c=await db.connect();
  try{
    await c.query("BEGIN");
    const found=await c.query(`SELECT id,voucher_type,reference_type,reference_id,status
      FROM vouchers WHERE id=$1 AND organization_id=$2 FOR UPDATE`,[voucherId,session.oid]);
    if(!found.rowCount)throw Object.assign(new Error("Voucher भेटिएन।"),{status:404});
    const v=found.rows[0];
    if(v.status!=="posted")throw Object.assign(new Error("Posted Voucher मात्र सम्पादन गर्न मिल्छ।"),{status:400});
    if(v.reference_type||v.reference_id)throw Object.assign(new Error("यो Voucher बचत/ऋण जस्ता मूल कारोबारसँग जोडिएको छ। सम्बन्धित कारोबारबाट मात्र सम्पादन गर्नुहोस्।"),{status:409});
    const accountIds=[...new Set(normalized.map(x=>x.accountId))];
    const acc=await c.query("SELECT id,account_code,account_type FROM chart_of_accounts WHERE organization_id=$1 AND is_active=true AND id=ANY($2::bigint[])",[session.oid,accountIds]);
    if(acc.rowCount!==accountIds.length)throw Object.assign(new Error("छानिएको खाता भेटिएन वा निष्क्रिय छ।"),{status:400});
    const memberIds=[...new Set(normalized.filter(x=>x.memberId).map(x=>x.memberId))];
    if(memberIds.length){const m=await c.query("SELECT id FROM members WHERE organization_id=$1 AND id=ANY($2::bigint[])",[session.oid,memberIds]);if(m.rowCount!==memberIds.length)throw Object.assign(new Error("सदस्य विवरण मिलेन।"),{status:400});}
    if(v.voucher_type==="payment"){
      const cashLines=normalized.filter(x=>x.credit>0);
      if(cashLines.length!==1)throw Object.assign(new Error("Payment Voucher मा Cash/Bank को एउटा Credit लाइन हुनुपर्छ।"),{status:400});
      const a=acc.rows.find(x=>x.id===cashLines[0].accountId);
      if(a?.account_type!=="asset"||!["1001","1002"].includes(a.account_code))throw Object.assign(new Error("Payment Voucher को Credit खाता Cash वा Bank हुनुपर्छ।"),{status:400});
    }
    await c.query("UPDATE vouchers SET voucher_date=$1::date,narration=$2 WHERE id=$3 AND organization_id=$4",[date,narration,voucherId,session.oid]);
    await c.query("DELETE FROM voucher_lines WHERE voucher_id=$1",[voucherId]);
    await c.query("DELETE FROM member_ledger WHERE organization_id=$1 AND voucher_id=$2",[session.oid,voucherId]);
    for(const line of normalized){
      await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,$5,$6)",[voucherId,line.accountId,line.memberId,line.debit,line.credit,line.narration||narration]);
      if(line.memberId)await c.query(`INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,debit,credit,narration)
        VALUES($1,$2,$3,$4::date,$5,$6,$7,$8)`,[session.oid,line.memberId,voucherId,date,v.voucher_type,line.debit,line.credit,line.narration||narration]);
    }
    await c.query("DELETE FROM cash_bank_transactions WHERE organization_id=$1 AND source_type='voucher' AND source_id=$2",[session.oid,voucherId]);
    for(const line of normalized){
      const a=acc.rows.find(x=>x.id===line.accountId);
      if(a?.account_type!=="asset"||!["1001","1002"].includes(a.account_code))continue;
      const cashAccount=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[session.oid,a.account_code==="1002"?"bank":"cash"]);
      if(!cashAccount.rowCount)continue;
      const isIn=line.debit>0;
      await c.query(`INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by)
        VALUES($1,$2,$3::date,$4,'voucher_edit',$5,'voucher',$6,$7,$8,$9)`,[session.oid,cashAccount.rows[0].id,date,isIn?"in":"out",isIn?line.debit:line.credit,voucherId,(await c.query("SELECT voucher_no FROM vouchers WHERE id=$1",[voucherId])).rows[0].voucher_no,narration,session.uid||null]);
    }
    await c.query("COMMIT");
    return NextResponse.json({ok:true,message:"Voucher र त्यससँग जोडिएको Ledger तथा Cash/Bank कारोबार अपडेट भयो।",totalDebit:debit,totalCredit:credit});
  }catch(e){await c.query("ROLLBACK");console.error("Voucher PATCH",e);return NextResponse.json({error:e.message||"Voucher सम्पादन गर्न सकिएन।"},{status:e.status||500});}
  finally{c.release();}
}


export async function DELETE(_request,{params}) {
  const session=await getBhalaiKoshSession();
  if(!session?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!allowed.includes(session.role))return NextResponse.json({error:"Permission denied"},{status:403});
  const {voucherId}=await params;
  const db=getBhalaiKoshPool(),c=await db.connect();
  try {
    await c.query("BEGIN");
    const found=await c.query(`SELECT id,status,reference_type,reference_id,voucher_no
      FROM vouchers WHERE id=$1 AND organization_id=$2 FOR UPDATE`,[voucherId,session.oid]);
    if(!found.rowCount)throw Object.assign(new Error("Voucher भेटिएन।"),{status:404});
    const v=found.rows[0];
    if(v.status!=="posted")throw Object.assign(new Error("Posted Voucher मात्र हटाउन मिल्छ।"),{status:409});
    if(v.reference_type||v.reference_id)throw Object.assign(new Error("मूल बचत/ऋण कारोबारसँग जोडिएको Voucher यहाँबाट हटाउन मिल्दैन। सम्बन्धित कारोबारबाट मात्र सच्याउनुहोस्।"),{status:409});
    await c.query("DELETE FROM cash_bank_transactions WHERE organization_id=$1 AND source_type='voucher' AND source_id=$2",[session.oid,v.id]);
    await c.query("DELETE FROM member_ledger WHERE organization_id=$1 AND voucher_id=$2",[session.oid,v.id]);
    await c.query("DELETE FROM voucher_lines WHERE voucher_id=$1",[v.id]);
    await c.query("DELETE FROM vouchers WHERE id=$1 AND organization_id=$2",[v.id,session.oid]);
    await c.query("COMMIT");
    return NextResponse.json({ok:true,message:"Voucher र सम्बन्धित Ledger/Cash-Bank कारोबार हटाइयो।"});
  } catch(e) {
    await c.query("ROLLBACK");
    console.error("Voucher DELETE",e);
    return NextResponse.json({error:e.message||"Voucher हटाउन सकिएन।"},{status:e.status||500});
  } finally { c.release(); }
}

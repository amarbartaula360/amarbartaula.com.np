import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
const allowed = ["admin","super_admin","accountant"];
const money = n => Number(Number(n).toFixed(2));
export async function GET(request) {
  try {
    const s=await getBhalaiKoshSession(); if(!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
    const {searchParams}=new URL(request.url);
    const type=searchParams.get("type");
    const values=[s.oid]; let filter="";
    if(type && ["journal","payment","receipt","contra"].includes(type)){values.push(type);filter=" AND v.voucher_type=$2";}
    const {rows}=await getBhalaiKoshPool().query(`
      SELECT v.id,v.voucher_no,v.voucher_type,v.voucher_date,v.narration,v.status,
        COALESCE(SUM(l.debit),0) AS total_debit,COALESCE(SUM(l.credit),0) AS total_credit
      FROM vouchers v LEFT JOIN voucher_lines l ON l.voucher_id=v.id
      WHERE v.organization_id=$1 ${filter}
      GROUP BY v.id ORDER BY v.voucher_date DESC,v.id DESC LIMIT 150
    `,values);
    const accounts=await getBhalaiKoshPool().query("SELECT id,account_code,account_name,account_type FROM chart_of_accounts WHERE organization_id=$1 AND is_active=true ORDER BY account_code",[s.oid]);
    return NextResponse.json({vouchers:rows,accounts:accounts.rows});
  } catch(e){console.error("Voucher GET",e);return NextResponse.json({error:"Voucher विवरण ल्याउन सकिएन।"},{status:500});}
}
export async function POST(request) {
  const s=await getBhalaiKoshSession(); if(!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!allowed.includes(s.role)) return NextResponse.json({error:"Permission denied"},{status:403});
  const b=await request.json(), type=String(b.type||"");
  if(!["journal","payment"].includes(type)) return NextResponse.json({error:"Journal वा Payment Voucher छान्नुहोस्।"},{status:400});
  const date=b.date||null, narration=String(b.narration||"").trim(), lines=Array.isArray(b.lines)?b.lines:[];
  if(!narration || lines.length<2 || lines.length>50) return NextResponse.json({error:"विवरण र कम्तीमा दुईवटा खाता लाइन आवश्यक छन्।"},{status:400});
  const normalized=lines.map(x=>({accountId:Number(x.accountId),memberId:x.memberId?Number(x.memberId):null,debit:money(x.debit||0),credit:money(x.credit||0),narration:String(x.narration||"").trim()}));
  if(normalized.some(x=>!Number.isInteger(x.accountId)||x.accountId<1||x.debit<0||x.credit<0||((x.debit>0)===(x.credit>0))||(x.memberId!==null&&(!Number.isInteger(x.memberId)||x.memberId<1))))
    return NextResponse.json({error:"प्रत्येक लाइनमा सही खाता र Debit वा Credit मध्ये एउटा मात्र रकम राख्नुहोस्।"},{status:400});
  const debit=money(normalized.reduce((a,x)=>a+x.debit,0)), credit=money(normalized.reduce((a,x)=>a+x.credit,0));
  if(debit<=0 || Math.abs(debit-credit)>0.009) return NextResponse.json({error:"Debit र Credit बराबर हुनुपर्छ।"},{status:400});
  const db=getBhalaiKoshPool(),c=await db.connect();
  try {
    await c.query("BEGIN");
    const ids=[...new Set(normalized.map(x=>x.accountId))];
    const acc=await c.query("SELECT id FROM chart_of_accounts WHERE organization_id=$1 AND is_active=true AND id=ANY($2::bigint[])",[s.oid,ids]);
    if(acc.rowCount!==ids.length) throw Object.assign(new Error("छानिएको खाता भेटिएन वा निष्क्रिय छ।"),{status:400});
    const memberIds=[...new Set(normalized.filter(x=>x.memberId).map(x=>x.memberId))];
    if(memberIds.length){const m=await c.query("SELECT id FROM members WHERE organization_id=$1 AND id=ANY($2::bigint[])",[s.oid,memberIds]);if(m.rowCount!==memberIds.length)throw Object.assign(new Error("सदस्य विवरण मिलेन।"),{status:400});}
    let paymentCashLine=null;
    if(type==="payment"){
      const cashLines=normalized.filter(x=>x.credit>0);
      if(cashLines.length!==1) throw Object.assign(new Error("Payment Voucher मा Cash/Bank खाताको एउटा Credit लाइन हुनुपर्छ।"),{status:400});
      const cash=await c.query("SELECT account_type,account_code FROM chart_of_accounts WHERE id=$1 AND organization_id=$2",[cashLines[0].accountId,s.oid]);
      if(cash.rows[0]?.account_type!=="asset" || !["1001","1002"].includes(cash.rows[0]?.account_code)) throw Object.assign(new Error("भुक्तानीको Credit खाता Cash वा Bank हुनुपर्छ।"),{status:400});
      paymentCashLine=cashLines[0];
    }
    const voucherNo="BK-"+(type==="journal"?"JV":"PV")+"-"+Date.now();
    const v=await c.query(`INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,status,created_by,posted_at)
      VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,'posted',$6,now()) RETURNING id,voucher_no`,[s.oid,voucherNo,type,date,narration,s.uid||null]);
    for(const line of normalized){
      await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,$5,$6)",[v.rows[0].id,line.accountId,line.memberId,line.debit,line.credit,line.narration||narration]);
      if(line.memberId){
        await c.query(`INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,debit,credit,narration)
          VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7,$8)`,[s.oid,line.memberId,v.rows[0].id,date,type,line.debit,line.credit,line.narration||narration]);
      }
    }
    if(type==="payment"){
      const code=(await c.query("SELECT account_code FROM chart_of_accounts WHERE id=$1",[paymentCashLine.accountId])).rows[0].account_code;
      const cash=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,code==="1002"?"bank":"cash"]);
      if(cash.rowCount) await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,COALESCE($3::date,CURRENT_DATE),'out','payment_voucher',$4,'voucher',$5,$6,$7,$8)",[s.oid,cash.rows[0].id,date,paymentCashLine.credit,v.rows[0].id,voucherNo,narration,s.uid||null]);
    }
    await c.query("COMMIT");
    return NextResponse.json({ok:true,voucherId:v.rows[0].id,voucherNo:v.rows[0].voucher_no,totalDebit:debit,totalCredit:credit},{status:201});
  } catch(e){await c.query("ROLLBACK");console.error("Voucher POST",e);return NextResponse.json({error:e.message||"Voucher पोस्ट गर्न सकिएन।"},{status:e.status||500});}
  finally{c.release();}
}

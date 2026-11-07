import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
const roles=["admin","super_admin","accountant"];
const methodCode=m=>["bank","transfer","cheque","online"].includes(String(m||"cash"))?"1002":"1001";

export async function GET(){
  try{
    const s=await getBhalaiKoshSession();
    if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
    const db=getBhalaiKoshPool();
    const [members,refunds]=await Promise.all([
      db.query(`
        SELECT m.id,m.member_code,m.full_name,
          GREATEST(0,COALESCE(s.total_savings,0)-COALESCE(r.total_deducted,0)) AS current_saving
        FROM members m
        LEFT JOIN LATERAL (SELECT SUM(amount) total_savings FROM savings WHERE organization_id=m.organization_id AND member_id=m.id AND status='posted') s ON TRUE
        LEFT JOIN LATERAL (SELECT SUM(amount) total_deducted FROM deposits WHERE organization_id=m.organization_id AND member_id=m.id AND transaction_type IN ('refund','loan_settlement')) r ON TRUE
        WHERE m.organization_id=$1 AND m.status='active'
        ORDER BY m.full_name
      `,[s.oid]),
      db.query(`
        SELECT d.id,d.transaction_date,d.amount,d.payment_method,d.receipt_no,d.description,m.member_code,m.full_name
        FROM deposits d JOIN members m ON m.id=d.member_id AND m.organization_id=d.organization_id
        WHERE d.organization_id=$1 AND d.transaction_type='refund'
        ORDER BY d.transaction_date DESC,d.id DESC LIMIT 50
      `,[s.oid])
    ]);
    return NextResponse.json({members:members.rows.map(x=>({...x,current_saving:Number(x.current_saving||0)})),refunds:refunds.rows});
  }catch(e){console.error("Savings refunds GET:",e);return NextResponse.json({error:"बचत फिर्ता विवरण ल्याउन सकिएन।"},{status:500});}
}

export async function POST(request){
  const s=await getBhalaiKoshSession();
  if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!roles.includes(s.role))return NextResponse.json({error:"Permission denied"},{status:403});
  let b;
  try{b=await request.json();}catch{return NextResponse.json({error:"फाराम विवरण सही छैन।"},{status:400});}
  const memberId=Number(b.memberId),amount=Number(b.amount),date=String(b.date||""),method=String(b.paymentMethod||"cash"),description=String(b.description||"बचत फिर्ता");
  if(!Number.isInteger(memberId)||memberId<1||!Number.isFinite(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!["cash","bank","transfer","cheque","online"].includes(method))
    return NextResponse.json({error:"सदस्य, मिति, रकम र भुक्तानी माध्यम सही राख्नुहोस्।"},{status:400});
  const db=getBhalaiKoshPool(),c=await db.connect();
  try{
    await c.query("BEGIN");
    const member=await c.query("SELECT id FROM members WHERE id=$1 AND organization_id=$2 AND status='active' FOR UPDATE",[memberId,s.oid]);
    if(!member.rowCount)throw Object.assign(new Error("सक्रिय सदस्य भेटिएन।"),{status:404});
    const bal=await c.query(`
      SELECT GREATEST(0,
        COALESCE((SELECT SUM(amount) FROM savings WHERE organization_id=$1 AND member_id=$2 AND status='posted'),0)
        - COALESCE((SELECT SUM(amount) FROM deposits WHERE organization_id=$1 AND member_id=$2 AND transaction_type IN ('refund','loan_settlement')),0)
      ) AS available
    `,[s.oid,memberId]);
    const available=Number(bal.rows[0]?.available||0);
    if(amount>available)throw Object.assign(new Error("फिर्ता रकम हाल कायम बचतभन्दा बढी हुन मिल्दैन। हाल कायम बचत: रु. "+available.toLocaleString("en-IN")),{status:400});
    const cashCode=methodCode(method);
    const acc=await c.query("SELECT id,account_code FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,[cashCode,"2001"]]);
    const byCode=Object.fromEntries(acc.rows.map(x=>[x.account_code,x.id]));
    if(!byCode[cashCode]||!byCode["2001"])throw new Error("Cash/Bank वा बचत खाता उपलब्ध छैन।");
    const accountType=cashCode==="1002"?"bank":"cash";
    const cash=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND account_type=$2 AND is_active=true ORDER BY id LIMIT 1",[s.oid,accountType]);
    if(!cash.rowCount)throw new Error("छानिएको Cash/Bank खाता सक्रिय छैन।");
    const voucherNo="BK-PV-REF-"+Date.now();
    const v=await c.query(`INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at)
      VALUES($1,$2,'payment',$3,$4,'saving_refund',$5,'posted',$6,now()) RETURNING id`,
      [s.oid,voucherNo,date,description,memberId,s.uid||null]);
    const voucherId=Number(v.rows[0].id);
    await c.query(`INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration)
      VALUES($1,$2,$3,$4,0,$5),($1,$6,$3,0,$4,$5)`,
      [voucherId,byCode["2001"],memberId,amount,description,byCode[cashCode]]);
    await c.query(`INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,debit,narration)
      VALUES($1,$2,$3,$4,'refund',$5,$6)`,[s.oid,memberId,voucherId,date,amount,description]);
    await c.query(`INSERT INTO deposits(organization_id,member_id,transaction_date,transaction_type,amount,payment_method,receipt_no,description,created_by)
      VALUES($1,$2,$3,'refund',$4,$5,$6,$7,$8)`,[s.oid,memberId,date,amount,method,voucherNo,description,s.uid||null]);
    await c.query(`INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by)
      VALUES($1,$2,$3,'out','saving_refund',$4,'voucher',$5,$6,$7,$8)`,
      [s.oid,cash.rows[0].id,date,amount,voucherId,voucherNo,description,s.uid||null]);
    await c.query("COMMIT");
    return NextResponse.json({ok:true,voucherNo,message:"बचत फिर्ता सफल भयो। Voucher नं.: "+voucherNo},{status:201});
  }catch(e){
    await c.query("ROLLBACK");
    return NextResponse.json({error:e.message||"बचत फिर्ता पोस्ट गर्न सकिएन।"},{status:e.status||500});
  }finally{c.release();}
}


export async function PATCH(request){
  const s=await getBhalaiKoshSession();
  if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!roles.includes(s.role))return NextResponse.json({error:"Permission denied"},{status:403});
  let b;try{b=await request.json();}catch{return NextResponse.json({error:"फाराम विवरण सही छैन।"},{status:400});}
  const id=Number(b.id),amount=Number(b.amount),date=String(b.date||""),method=String(b.paymentMethod||"cash"),description=String(b.description||"बचत फिर्ता");
  if(!Number.isInteger(id)||id<1||!Number.isFinite(amount)||amount<=0||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!["cash","bank","transfer","cheque","online"].includes(method))return NextResponse.json({error:"मिति, रकम र भुक्तानी माध्यम सही राख्नुहोस्।"},{status:400});
  const db=getBhalaiKoshPool(),c=await db.connect();
  try{
    await c.query("BEGIN");
    const dr=await c.query("SELECT * FROM deposits WHERE id=$1 AND organization_id=$2 AND transaction_type='refund' FOR UPDATE",[id,s.oid]);
    if(!dr.rowCount)throw Object.assign(new Error("बचत फिर्ता रेकर्ड भेटिएन।"),{status:404});
    const old=dr.rows[0],memberId=Number(old.member_id);
    await c.query("SELECT id FROM members WHERE id=$1 AND organization_id=$2 FOR UPDATE",[memberId,s.oid]);
    const bal=await c.query("SELECT GREATEST(0,COALESCE((SELECT SUM(amount) FROM savings WHERE organization_id=$1 AND member_id=$2 AND status='posted'),0)-COALESCE((SELECT SUM(amount) FROM deposits WHERE organization_id=$1 AND member_id=$2 AND transaction_type IN ('refund','loan_settlement') AND id<>$3),0)) available",[s.oid,memberId,id]);
    if(amount>Number(bal.rows[0].available||0))throw Object.assign(new Error("सम्पादनपछि फिर्ता रकम हाल कायम बचतभन्दा बढी हुन मिल्दैन।"),{status:400});
    const cashCode=methodCode(method),accountType=cashCode==="1002"?"bank":"cash";
    const acc=await c.query("SELECT id,account_code FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,[cashCode,"2001"]]);
    const byCode=Object.fromEntries(acc.rows.map(x=>[x.account_code,x.id]));
    if(!byCode[cashCode]||!byCode["2001"])throw new Error("Cash/Bank वा बचत खाता उपलब्ध छैन।");
    const cash=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND account_type=$2 AND is_active=true ORDER BY id LIMIT 1",[s.oid,accountType]);
    if(!cash.rowCount)throw new Error("छानिएको Cash/Bank खाता सक्रिय छैन।");
    const vr=await c.query("SELECT * FROM vouchers WHERE organization_id=$1 AND voucher_no=$2 AND status='posted' FOR UPDATE",[s.oid,old.receipt_no]);
    if(!vr.rowCount)throw Object.assign(new Error("सम्बन्धित Voucher भेटिएन; सुरक्षितताका लागि Edit रोकियो।"),{status:409});
    const voucherId=Number(vr.rows[0].id);
    await c.query("UPDATE deposits SET transaction_date=$1,amount=$2,payment_method=$3,description=$4 WHERE id=$5",[date,amount,method,description,id]);
    await c.query("UPDATE member_ledger SET transaction_date=$1,debit=$2,credit=0,narration=$3 WHERE organization_id=$4 AND member_id=$5 AND voucher_id=$6 AND transaction_type='refund'",[date,amount,description,s.oid,memberId,voucherId]);
    await c.query("DELETE FROM voucher_lines WHERE voucher_id=$1",[voucherId]);
    await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,$5),($1,$6,$3,0,$4,$5)",[voucherId,byCode["2001"],memberId,amount,description,byCode[cashCode]]);
    await c.query("UPDATE vouchers SET voucher_date=$1,narration=$2 WHERE id=$3",[date,description,voucherId]);
    const tx=await c.query("SELECT id FROM cash_bank_transactions WHERE organization_id=$1 AND source_type='voucher' AND source_id=$2 FOR UPDATE",[s.oid,voucherId]);
    if(tx.rowCount)await c.query("UPDATE cash_bank_transactions SET account_id=$1,transaction_date=$2,amount=$3,direction='out',category='saving_refund',description=$4 WHERE id=$5",[cash.rows[0].id,date,amount,description,tx.rows[0].id]);
    else await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,$3,'out','saving_refund',$4,'voucher',$5,$6,$7,$8)",[s.oid,cash.rows[0].id,date,amount,voucherId,old.receipt_no,description,s.uid||null]);
    await c.query("COMMIT");
    return NextResponse.json({ok:true,message:"बचत फिर्ता विवरण सम्पादन भयो। Cash/Bank मौज्दात पनि मिलाइयो।"});
  }catch(e){await c.query("ROLLBACK");console.error("Savings refund PATCH:",e);return NextResponse.json({error:e.message||"बचत फिर्ता सम्पादन गर्न सकिएन।"},{status:e.status||500});}
  finally{c.release();}
}

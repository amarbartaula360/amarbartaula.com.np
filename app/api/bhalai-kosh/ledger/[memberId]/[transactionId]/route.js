import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime="nodejs";
const roles=["admin","super_admin","accountant"];
const n=x=>Number(Number(x||0).toFixed(2));
const cashCode=m=>["bank","transfer","cheque","online"].includes(String(m||"cash"))?"1002":"1001";
export async function PATCH(request,{params}){
 const s=await getBhalaiKoshSession();if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!roles.includes(s.role))return NextResponse.json({error:"Permission denied"},{status:403});
 const {memberId,transactionId}=await params,mid=Number(memberId),raw=String(transactionId);
 if(!Number.isInteger(mid)||mid<1)return NextResponse.json({error:"सही सदस्य छान्नुहोस्।"},{status:400});
 const b=await request.json(),date=String(b.date||""),method=String(b.paymentMethod||"cash");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!["cash","bank","transfer","cheque","online"].includes(method))return NextResponse.json({error:"मिति वा नगद/बैंक माध्यम सही राख्नुहोस्।"},{status:400});
 const c=await getBhalaiKoshPool().connect();
 try{
  await c.query("BEGIN");
  const member=await c.query("SELECT id FROM members WHERE id=$1 AND organization_id=$2",[mid,s.oid]);
  if(!member.rowCount)throw Object.assign(new Error("सदस्य भेटिएन।"),{status:404});
  let ledger=null;
  if(/^\d+$/.test(raw)){
   const x=await c.query("SELECT * FROM member_ledger WHERE id=$1 AND member_id=$2 AND organization_id=$3 FOR UPDATE",[Number(raw),mid,s.oid]);ledger=x.rows[0]||null;
  }
  const type=ledger?.transaction_type || String(b.transactionType||"");
  if(!["saving","contribution","loan_disbursement","loan_repayment"].includes(type))throw Object.assign(new Error("यो Ledger कारोबार सम्पादन गर्न मिल्दैन।"),{status:400});
  const amount=Number(b.amount),principal=Number(b.principalAmount),interest=Number(b.interestAmount||0),fee=Number(b.feeAmount||0);
  if(type==="saving"||type==="contribution"){
   if(!Number.isFinite(amount)||amount<=0)throw Object.assign(new Error("बचत रकम शून्यभन्दा बढी हुनुपर्छ।"),{status:400});
   let voucherId=ledger?.voucher_id||null,voucher=null,saving=null;
   if(raw.startsWith("saving-")){const sr=await c.query("SELECT * FROM savings WHERE id=$1 AND organization_id=$2 AND member_id=$3 AND status='posted' FOR UPDATE",[Number(raw.slice(7)),s.oid,mid]);saving=sr.rows[0]||null;}
   if(voucherId){const vr=await c.query("SELECT * FROM vouchers WHERE id=$1 AND organization_id=$2 FOR UPDATE",[voucherId,s.oid]);voucher=vr.rows[0]||null;}
   if(!voucher && ledger?.voucher_id==null && ledger){
    const sr=await c.query("SELECT * FROM savings WHERE organization_id=$1 AND member_id=$2 AND status='posted' AND paid_on=$3::date AND amount=$4 ORDER BY id LIMIT 1 FOR UPDATE",[s.oid,mid,ledger.transaction_date,ledger.credit]);saving=sr.rows[0]||null;
   } else if(voucher){
    const sr=await c.query("SELECT * FROM savings WHERE organization_id=$1 AND member_id=$2 AND receipt_no=$3 AND status='posted' FOR UPDATE",[s.oid,mid,voucher.voucher_no]);saving=sr.rows[0]||null;
   }
   if(saving)await c.query("UPDATE savings SET amount=$1,paid_on=$2,payment_method=$3 WHERE id=$4 AND organization_id=$5",[amount,date,method,saving.id]);
   if(voucher){
    const codes=await c.query("SELECT id,account_code FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,[cashCode(method),"2001"]]);
    const a=Object.fromEntries(codes.rows.map(x=>[x.account_code,x.id]));
    if(!a[cashCode(method)]||!a["2001"])throw new Error("Cash/Bank वा बचत खाता उपलब्ध छैन।");
    await c.query("DELETE FROM voucher_lines WHERE voucher_id=$1",[voucherId]);
    await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,'मासिक बचत'),($1,$5,$3,0,$4,'मासिक बचत')",[voucherId,a[cashCode(method)],mid,amount,a["2001"]]);
    await c.query("UPDATE vouchers SET voucher_date=$1 WHERE id=$2",[date,voucherId]);
    await c.query("UPDATE member_ledger SET transaction_date=$1,credit=$2,debit=0 WHERE id=$3",[date,amount,ledger.id]);
    const ca=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,cashCode(method)==="1002"?"bank":"cash"]);
    if(!ca.rowCount)throw Object.assign(new Error("छानिएको Cash/Bank खाता सक्रिय छैन।"),{status:400});
    const tx=await c.query("SELECT id FROM cash_bank_transactions WHERE organization_id=$1 AND source_type='voucher' AND source_id=$2 FOR UPDATE",[s.oid,voucherId]);
    if(tx.rowCount)await c.query("UPDATE cash_bank_transactions SET account_id=$1,transaction_date=$2,amount=$3,direction='in',category='saving' WHERE id=$4",[ca.rows[0].id,date,amount,tx.rows[0].id]);
    else await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,$3,'in','saving',$4,'voucher',$5,$6,'मासिक बचत',$7)",[s.oid,ca.rows[0].id,date,amount,voucherId,voucher.voucher_no,s.uid||null]);
   }else{
    if(ledger)await c.query("UPDATE member_ledger SET transaction_date=$1,credit=$2,debit=0,narration=COALESCE(narration,'मासिक बचत') WHERE id=$3",[date,amount,ledger.id]);
    if(!saving)throw Object.assign(new Error("सम्बन्धित बचत Ledger भेटिएन।"),{status:404});
   }
   await c.query("COMMIT");return NextResponse.json({ok:true,message:"बचत कारोबार सम्पादन भयो।"});
  }
  if(type==="loan_disbursement"){
   if(!Number.isFinite(amount)||amount<=0)throw Object.assign(new Error("ऋण वितरण रकम सही राख्नुहोस्।"),{status:400});
   let voucherId=ledger?.voucher_id||null,vr;
   let loanId=null;
   if(voucherId){vr=await c.query("SELECT * FROM vouchers WHERE id=$1 AND organization_id=$2 AND reference_type='loan_disbursement' FOR UPDATE",[voucherId,s.oid]);if(vr.rowCount)loanId=Number(vr.rows[0].reference_id);}
   if(!loanId&&raw.startsWith("loan-"))loanId=Number(raw.slice(5));
   if(!Number.isInteger(loanId))throw Object.assign(new Error("सम्बन्धित ऋण वितरण भेटिएन।"),{status:404});
   if(!voucherId){vr=await c.query("SELECT * FROM vouchers WHERE organization_id=$1 AND reference_type='loan_disbursement' AND reference_id=$2 FOR UPDATE",[s.oid,loanId]);if(vr.rowCount)voucherId=Number(vr.rows[0].id);}
   const loan=await c.query("SELECT * FROM loans WHERE id=$1 AND organization_id=$2 AND member_id=$3 FOR UPDATE",[loanId,s.oid,mid]);
   if(!loan.rowCount)throw Object.assign(new Error("सम्बन्धित ऋण भेटिएन।"),{status:404});
   if(!voucherId){const ca0=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,cashCode(method)==="1002"?"bank":"cash"]);if(!ca0.rowCount)throw Object.assign(new Error("छानिएको Cash/Bank खाता सक्रिय छैन।"),{status:400});const no="BK-EDIT-LN-"+Date.now();const vv=await c.query("INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at) VALUES($1,$2,'payment',$3,'पुरानो ऋण वितरण सम्पादन','loan_disbursement',$4,'posted',$5,now()) RETURNING id",[s.oid,no,date,loanId,s.uid||null]);voucherId=Number(vv.rows[0].id);}
   const paid=await c.query("SELECT COALESCE(SUM(principal_amount),0) p FROM loan_payments WHERE loan_id=$1",[loanId]);
   if(Number(paid.rows[0].p)>0)throw Object.assign(new Error("यस ऋणमा EMI भुक्तानी भइसकेको छ। पहिले EMI मिलाउनुहोस्; वितरण रकम परिवर्तन गर्न मिल्दैन।"),{status:409});
   const codes=await c.query("SELECT id,account_code FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,[cashCode(method),"1101"]]);
   const a=Object.fromEntries(codes.rows.map(x=>[x.account_code,x.id]));
   if(!a[cashCode(method)]||!a["1101"])throw new Error("Cash/Bank वा Loan Receivable खाता उपलब्ध छैन।");
   const ca=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,cashCode(method)==="1002"?"bank":"cash"]);
   if(!ca.rowCount)throw Object.assign(new Error("छानिएको Cash/Bank खाता सक्रिय छैन।"),{status:400});
   await c.query("DELETE FROM voucher_lines WHERE voucher_id=$1",[voucherId]);
   await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,'ऋण वितरण'),($1,$5,$3,0,$4,'ऋण वितरण')",[voucherId,a["1101"],mid,amount,a[cashCode(method)]]);
   await c.query("UPDATE vouchers SET voucher_date=$1 WHERE id=$2",[date,voucherId]);
   await c.query("UPDATE loans SET disbursed_on=$1,disbursed_amount=$2 WHERE id=$3",[date,amount,loanId]);
   if(ledger)await c.query("UPDATE member_ledger SET transaction_date=$1,debit=$2,credit=0 WHERE id=$3",[date,amount,ledger.id]);else await c.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,debit,narration) VALUES($1,$2,$3,$4,'loan_disbursement',$5,'ऋण वितरण')",[s.oid,mid,voucherId,date,amount]);
   const tx=await c.query("UPDATE cash_bank_transactions SET account_id=$1,transaction_date=$2,amount=$3 WHERE organization_id=$4 AND source_type='voucher' AND source_id=$5 RETURNING id",[ca.rows[0].id,date,amount,s.oid,voucherId]);
   if(!tx.rowCount)await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,$3,'out','loan_disbursement',$4,'voucher',$5,$6,'ऋण वितरण',$7)",[s.oid,ca.rows[0].id,date,amount,voucherId,vr.rows[0].voucher_no,s.uid||null]);
   await c.query("COMMIT");return NextResponse.json({ok:true,message:"ऋण वितरण कारोबार सम्पादन भयो।"});
  }
  // EMI / loan repayment
  if(!Number.isFinite(principal)||principal<0||!Number.isFinite(interest)||interest<0||!Number.isFinite(fee)||fee<0||n(principal+interest+fee)<=0)throw Object.assign(new Error("साँवा, ब्याज र शुल्क सही राख्नुहोस्।"),{status:400});
  let paymentId=null,voucherId=ledger?.voucher_id||null;
  if(voucherId){
   const vr=await c.query("SELECT * FROM vouchers WHERE id=$1 AND organization_id=$2 AND reference_type='loan_payment' FOR UPDATE",[voucherId,s.oid]);
   if(!vr.rowCount)throw Object.assign(new Error("EMI Voucher भेटिएन।"),{status:404});
   paymentId=Number(vr.rows[0].reference_id);
  }else if(raw.startsWith("loan-"))paymentId=Number(raw.slice(5));
  if(!Number.isInteger(paymentId))throw Object.assign(new Error("EMI भुक्तानी रेकर्ड भेटिएन।"),{status:404});
  const pr=await c.query("SELECT * FROM loan_payments WHERE id=$1 AND organization_id=$2 AND member_id=$3 FOR UPDATE",[paymentId,s.oid,mid]);
  if(!pr.rowCount)throw Object.assign(new Error("EMI भुक्तानी भेटिएन।"),{status:404});
  const payment=pr.rows[0],loanId=Number(payment.loan_id),total=n(principal+interest+fee);
  if(!voucherId){const vr=await c.query("SELECT id FROM vouchers WHERE organization_id=$1 AND reference_type='loan_payment' AND reference_id=$2 FOR UPDATE",[s.oid,paymentId]);if(vr.rowCount)voucherId=Number(vr.rows[0].id);}
  const other=await c.query("SELECT COALESCE(SUM(principal_amount),0) p,COALESCE(SUM(interest_amount),0) i,COALESCE(SUM(fee_amount),0) f FROM loan_payments WHERE loan_id=$1 AND id<>$2",[loanId,paymentId]);
  const inst=await c.query("SELECT COALESCE(SUM(principal_due),0) p,COALESCE(SUM(interest_due),0) i,COALESCE(SUM(fee_due),0) f FROM loan_installments WHERE loan_id=$1",[loanId]);
  if(Number(other.rows[0].p)+principal>Number(inst.rows[0].p)+0.009||Number(other.rows[0].i)+interest>Number(inst.rows[0].i)+0.009||Number(other.rows[0].f)+fee>Number(inst.rows[0].f)+0.009)throw Object.assign(new Error("यस ऋणको बाँकी किस्ता रकमभन्दा बढी Edit गर्न मिल्दैन।"),{status:400});
  const codes=await c.query("SELECT id,account_code FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,[cashCode(method),"1101","4001","4004"]]);
  const a=Object.fromEntries(codes.rows.map(x=>[x.account_code,x.id]));
  if(!a[cashCode(method)]||!a["1101"]||(interest>0&&!a["4001"])||(fee>0&&!a["4004"]))throw new Error("Cash/Bank, Loan Receivable वा आम्दानी खाता उपलब्ध छैन।");
  const ca=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,cashCode(method)==="1002"?"bank":"cash"]);
  if(!ca.rowCount)throw Object.assign(new Error("छानिएको Cash/Bank खाता सक्रिय छैन।"),{status:400});
  await c.query("UPDATE loan_payments SET paid_on=$1,principal_amount=$2,interest_amount=$3,fee_amount=$4,payment_method=$5 WHERE id=$6",[date,principal,interest,fee,method,paymentId]);
  if(voucherId){
   await c.query("DELETE FROM voucher_lines WHERE voucher_id=$1",[voucherId]);
   await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,'ऋण किस्ता प्राप्ति'),($1,$5,$3,0,$6,'साँवा असुली')",[voucherId,a[cashCode(method)],mid,total,a["1101"],principal]);
   if(interest>0)await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'ब्याज आम्दानी')",[voucherId,a["4001"],mid,interest]);
   if(fee>0)await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'जरिवाना/शुल्क आम्दानी')",[voucherId,a["4004"],mid,fee]);
   await c.query("UPDATE vouchers SET voucher_date=$1 WHERE id=$2",[date,voucherId]);
   if(ledger)await c.query("UPDATE member_ledger SET transaction_date=$1,debit=0,credit=$2 WHERE id=$3",[date,total,ledger.id]);else await c.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,credit,narration) VALUES($1,$2,$3,$4,'loan_repayment',$5,'ऋण किस्ता प्राप्ति')",[s.oid,mid,voucherId,date,total]);
  }
  const tx=await c.query("SELECT id FROM cash_bank_transactions WHERE organization_id=$1 AND source_type='loan_payment' AND source_id=$2 FOR UPDATE",[s.oid,paymentId]);
  if(tx.rowCount)await c.query("UPDATE cash_bank_transactions SET account_id=$1,transaction_date=$2,amount=$3,direction='in' WHERE id=$4",[ca.rows[0].id,date,total,tx.rows[0].id]);
  else await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,$3,'in','loan_repayment',$4,'loan_payment',$5,$6,'ऋण किस्ता',$7)",[s.oid,ca.rows[0].id,date,total,paymentId,payment.receipt_no,s.uid||null]);
  // Rebuild installment allocations from all payments in date order.
  const installments=await c.query("SELECT * FROM loan_installments WHERE loan_id=$1 ORDER BY due_date,installment_no FOR UPDATE",[loanId]);
  for(const x of installments.rows)await c.query("UPDATE loan_installments SET paid_principal=0,paid_interest=0,paid_fee=0,status='pending' WHERE id=$1",[x.id]);
  const pays=await c.query("SELECT * FROM loan_payments WHERE loan_id=$1 ORDER BY paid_on,id",[loanId]);
  for(const pay of pays.rows){
   let p=Number(pay.principal_amount),i=Number(pay.interest_amount),f=Number(pay.fee_amount);
   for(const x of installments.rows){if(p<=0&&i<=0&&f<=0)break;
    const cur=await c.query("SELECT paid_principal,paid_interest,paid_fee,principal_due,interest_due,fee_due FROM loan_installments WHERE id=$1 FOR UPDATE",[x.id]);
    const z=cur.rows[0],ap=Math.min(p,Math.max(0,Number(z.principal_due)-Number(z.paid_principal))),ai=Math.min(i,Math.max(0,Number(z.interest_due)-Number(z.paid_interest))),af=Math.min(f,Math.max(0,Number(z.fee_due)-Number(z.paid_fee)));
    p=n(p-ap);i=n(i-ai);f=n(f-af);
    await c.query("UPDATE loan_installments SET paid_principal=paid_principal+$2,paid_interest=paid_interest+$3,paid_fee=paid_fee+$4,status=CASE WHEN paid_principal+$2>=principal_due-0.009 AND paid_interest+$3>=interest_due-0.009 AND paid_fee+$4>=fee_due-0.009 THEN 'paid' ELSE CASE WHEN paid_principal+$2+paid_interest+$3+paid_fee+$4>0 THEN 'partial' ELSE 'pending' END END WHERE id=$1",[x.id,ap,ai,af]);
   }
  }
  const remaining=await c.query("SELECT COALESCE(SUM(principal_due-paid_principal),0) p,COALESCE(SUM(interest_due-paid_interest),0) i,COALESCE(SUM(fee_due-paid_fee),0) f FROM loan_installments WHERE loan_id=$1",[loanId]);
  await c.query("UPDATE loans SET status=CASE WHEN $2<=0.009 AND $3<=0.009 AND $4<=0.009 THEN 'closed' ELSE 'disbursed' END WHERE id=$1",[loanId,Number(remaining.rows[0].p),Number(remaining.rows[0].i),Number(remaining.rows[0].f)]);
  await c.query("COMMIT");return NextResponse.json({ok:true,message:"EMI कारोबार, Voucher र किस्ता तालिका सम्पादन भयो।"});
 }catch(e){await c.query("ROLLBACK");console.error("Ledger edit:",e);return NextResponse.json({error:e.message||"Ledger सम्पादन गर्न सकिएन।"},{status:e.status||500});}
 finally{c.release();}
}

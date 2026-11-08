import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession, hasBhalaiKoshPermission } from "@/lib/bhalai-kosh-auth";
export const runtime="nodejs";
const roles=["admin","super_admin","accountant"];
const n=x=>Number(Number(x).toFixed(2));
function schedule(principal,rate,term,method,start){
 const rows=[];let balance=principal;
 const monthlyRate=rate/1200;
 const emi=method==="reducing_balance"&&monthlyRate>0?principal*monthlyRate/(1-Math.pow(1+monthlyRate,-term)):0;
 const startDate=new Date(String(start).slice(0,10)+"T12:00:00");
 for(let i=1;i<=term;i++){
  const due=new Date(startDate.getFullYear(),startDate.getMonth()+i,Math.min(startDate.getDate(),new Date(startDate.getFullYear(),startDate.getMonth()+i+1,0).getDate()),12,0,0);
  let interest=method==="flat"?principal*rate/100/12:balance*monthlyRate;
  let principalDue=method==="flat"?principal/term:(i===term?balance:emi-interest);
  principalDue=Math.min(balance,n(principalDue));interest=n(interest);balance=n(balance-principalDue);
  rows.push({no:i,date:due.toISOString().slice(0,10),principal:n(principalDue),interest});
 }
 return rows;
}
export async function PATCH(request,{params}){
 const s=await getBhalaiKoshSession();if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!roles.includes(s.role)||!hasBhalaiKoshPermission(s,"loans"))return NextResponse.json({error:"Permission denied"},{status:403});
 const {loanId}=await params,id=Number(loanId),b=await request.json(),action=String(b.action||"");
 if(!Number.isInteger(id)||id<1)return NextResponse.json({error:"सही ऋण छान्नुहोस्।"},{status:400});
 const db=getBhalaiKoshPool(),c=await db.connect();
 try{
  await c.query("BEGIN");
  const q=await c.query("SELECT l.*,m.status AS member_status FROM loans l JOIN members m ON m.id=l.member_id WHERE l.id=$1 AND l.organization_id=$2 FOR UPDATE",[id,s.oid]);
  const loan=q.rows[0];if(!loan)throw Object.assign(new Error("ऋण भेटिएन।"),{status:404});
  if(action==="edit_payment_method"){
   if(!["disbursed","closed"].includes(loan.status))throw Object.assign(new Error("वितरण भइसकेको ऋणको भुक्तानी माध्यम मात्र सम्पादन गर्न मिल्छ।"),{status:409});
   const method=String(b.paymentMethod||"");
   if(!["cash","bank"].includes(method))throw Object.assign(new Error("नगद वा बैंक माध्यम छान्नुहोस्।"),{status:400});
   const code=method==="bank"?"1002":"1001";
   const cash=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,method]);
   if(!cash.rowCount)throw Object.assign(new Error(method==="bank"?"सक्रिय Bank Account उपलब्ध छैन।":"सक्रिय Cash Account उपलब्ध छैन।"),{status:400});
   const voucher=await c.query("SELECT id FROM vouchers WHERE organization_id=$1 AND reference_type IN ('loan','loan_disbursement') AND reference_id=$2 AND voucher_type='payment' AND status='posted' ORDER BY CASE WHEN reference_type='loan' THEN 0 ELSE 1 END,id DESC LIMIT 1 FOR UPDATE",[s.oid,id]);
   if(!voucher.rowCount)throw Object.assign(new Error("ऋण वितरण Voucher भेटिएन।"),{status:404});
   const voucherId=voucher.rows[0].id;
   const account=await c.query("SELECT id FROM chart_of_accounts WHERE organization_id=$1 AND account_code=$2 AND is_active=true",[s.oid,code]);
   if(!account.rowCount)throw Object.assign(new Error("छानिएको Cash/Bank लेखा खाता उपलब्ध छैन।"),{status:400});
   const line=await c.query("SELECT id FROM voucher_lines WHERE voucher_id=$1 AND credit>0 ORDER BY id DESC LIMIT 1 FOR UPDATE",[voucherId]);
   if(!line.rowCount)throw Object.assign(new Error("ऋण वितरण Voucher को भुक्तानी लाइन भेटिएन।"),{status:404});
   await c.query("UPDATE voucher_lines SET account_id=$1 WHERE id=$2",[account.rows[0].id,line.rows[0].id]);
   const tx=await c.query("SELECT id FROM cash_bank_transactions WHERE organization_id=$1 AND source_type='voucher' AND source_id=$2 FOR UPDATE",[s.oid,voucherId]);
   if(tx.rowCount)await c.query("UPDATE cash_bank_transactions SET account_id=$1,direction='out',category='loan_disbursement' WHERE id=$2",[cash.rows[0].id,tx.rows[0].id]);
   else await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) SELECT $1,$2,v.voucher_date,'out','loan_disbursement',$3,'voucher',v.id,v.voucher_no,v.narration,$4 FROM vouchers v WHERE v.id=$5",[s.oid,cash.rows[0].id,Number(loan.disbursed_amount||loan.principal),s.uid||null,voucherId]);
   await c.query("COMMIT");
   return NextResponse.json({ok:true,message:method==="bank"?"ऋण वितरण माध्यम बैंकमा परिवर्तन भयो।":"ऋण वितरण माध्यम नगदमा परिवर्तन भयो।"});
  }else if(action==="edit"){
   if(!["pending","approved"].includes(loan.status))throw Object.assign(new Error("वितरण भइसकेको ऋणको मूल सर्त यहाँबाट परिवर्तन गर्न मिल्दैन।"),{status:409});
   const principal=Number(b.principal),rate=Number(b.annualInterestRate),term=Number(b.termMonths),purpose=String(b.purpose||"").trim();
   const appliedOn=String(b.appliedOn||loan.applied_on).slice(0,10);
   if(!Number.isFinite(principal)||principal<=0||!Number.isFinite(rate)||rate<0||rate>100||!Number.isInteger(term)||term<1||term>360||!/^\\d{4}-\\d{2}-\\d{2}$/.test(appliedOn))throw Object.assign(new Error("ऋण रकम, ब्याजदर, अवधि र आवेदन मिति सही राख्नुहोस्।"),{status:400});
   await c.query("UPDATE loans SET principal=$2,annual_interest_rate=$3,term_months=$4,purpose=$5,applied_on=$6 WHERE id=$1",[id,principal,rate,term,purpose||null,appliedOn]);
   if(loan.status==="approved"){
    await c.query("DELETE FROM loan_installments WHERE loan_id=$1 AND NOT EXISTS(SELECT 1 FROM loan_payments WHERE loan_id=$1)",[id]);
    const due=schedule(principal,rate,term,loan.interest_method,loan.approved_at||appliedOn);
    for(const x of due)await c.query("INSERT INTO loan_installments(loan_id,installment_no,due_date,principal_due,interest_due) VALUES($1,$2,$3,$4,$5)",[id,x.no,x.date,x.principal,x.interest]);
   }
   await c.query("COMMIT");return NextResponse.json({ok:true,message:"ऋण आवेदन सम्पादन भयो।"});
  }else if(action==="approve"){
   if(loan.status!=="pending")throw Object.assign(new Error("Pending आवेदन मात्र स्वीकृत गर्न मिल्छ।"),{status:409});
   const approvedOn=String(b.approvedOn||new Date().toISOString().slice(0,10));
   if(!/^\d{4}-\d{2}-\d{2}$/.test(approvedOn))throw Object.assign(new Error("स्वीकृति मिति सही राख्नुहोस्।"),{status:400});
   await c.query("UPDATE loans SET status='approved',approved_by=$2,approved_at=($3::date::timestamp AT TIME ZONE 'UTC') WHERE id=$1",[id,s.uid||null,approvedOn]);
   // स्वीकृत भएको मितिको अर्को महिनादेखि EMI तालिका बनाउने।
   const due=schedule(Number(loan.principal),Number(loan.annual_interest_rate),Number(loan.term_months),loan.interest_method,approvedOn);
   for(const x of due)await c.query("INSERT INTO loan_installments(loan_id,installment_no,due_date,principal_due,interest_due) VALUES($1,$2,$3,$4,$5)",[id,x.no,x.date,x.principal,x.interest]);
  }else if(action==="reject"){
   if(loan.status!=="pending")throw Object.assign(new Error("Pending आवेदन मात्र अस्वीकृत गर्न मिल्छ।"),{status:409});
   await c.query("UPDATE loans SET status='rejected',approved_by=$2,approved_at=now() WHERE id=$1",[id,s.uid||null]);
  }else if(action==="disburse"){
   if(loan.status!=="approved")throw Object.assign(new Error("पहिले ऋण स्वीकृत गर्नुहोस्।"),{status:409});
   if(loan.member_status!=="active")throw Object.assign(new Error("Left वा निष्क्रिय सदस्यलाई ऋण वितरण गर्न मिल्दैन।"),{status:400});
   const amount=Number(b.amount||loan.principal),method=String(b.paymentMethod||"cash"),cashCode=["bank","transfer","cheque","online"].includes(method)?"1002":"1001";
   if(!Number.isFinite(amount)||amount<=0||Math.abs(amount-Number(loan.principal))>0.009)throw Object.assign(new Error("स्वीकृत ऋण रकम बराबर नै वितरण गर्नुपर्छ, किनकि EMI स्वीकृतिको समयमा तयार भइसकेको छ।"),{status:400});
   const by=await c.query("SELECT account_code,id FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,[cashCode,"1101"]]);
   const a=Object.fromEntries(by.rows.map(x=>[x.account_code,x.id]));if(!a[cashCode]||!a["1101"])throw new Error("Cash/Bank वा Loan Receivable खाता उपलब्ध छैन।");
   const cashAccount=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,cashCode==="1002"?"bank":"cash"]);
   if(!cashAccount.rowCount)throw Object.assign(new Error(cashCode==="1002"?"सक्रिय Bank Account दर्ता गर्नुहोस्।":"सक्रिय Cash Account भेटिएन।"),{status:400});
   const voucherNo="BK-PV-LN-"+Date.now();
   const v=await c.query("INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at) VALUES($1,$2,'payment',COALESCE($3::date,CURRENT_DATE),$4,'loan',$5,'posted',$6,now()) RETURNING id",[s.oid,voucherNo,b.date||null,"ऋण वितरण: "+loan.application_no,id,s.uid||null]);
   await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,$5),($1,$6,$3,0,$4,$5)",[v.rows[0].id,a["1101"],loan.member_id,amount,"ऋण वितरण",a[cashCode]]);
   await c.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,debit,narration) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),'loan_disbursement',$5,$6)",[s.oid,loan.member_id,v.rows[0].id,b.date||null,amount,"ऋण वितरण "+loan.application_no]);
   await c.query("UPDATE loans SET status='disbursed',disbursed_on=COALESCE($2::date,CURRENT_DATE),disbursed_amount=$3 WHERE id=$1",[id,b.date||null,amount]);

   await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,COALESCE($3::date,CURRENT_DATE),'out','loan_disbursement',$4,'voucher',$5,$6,$7,$8)",[s.oid,cashAccount.rows[0].id,b.date||null,amount,v.rows[0].id,voucherNo,"ऋण वितरण "+loan.application_no,s.uid||null]);
   return await finish(c,{ok:true,message:"ऋण वितरण भयो। Voucher: "+voucherNo, voucherNo});
  }else if(action==="close_loan"){
   if(loan.status!=="disbursed")throw Object.assign(new Error("वितरण भएको खुला ऋण मात्र बन्द गर्न मिल्छ।"),{status:409});
   const method=String(b.paymentMethod||"cash");
   if(!["cash","bank"].includes(method))throw Object.assign(new Error("नगद वा बैंक माध्यम छान्नुहोस्।"),{status:400});
   const continueSaving=!!b.continueSaving;
   const remain=await c.query(`SELECT
     COALESCE(SUM(principal_due-paid_principal),0) AS principal,
     COALESCE(SUM(interest_due-paid_interest),0) AS interest,
     COALESCE(SUM(fee_due-paid_fee),0) AS fee
     FROM loan_installments WHERE loan_id=$1`,[id]);
   const principal=n(remain.rows[0].principal),interest=n(remain.rows[0].interest),fee=n(remain.rows[0].fee);
   if(principal<=0.009&&interest<=0.009&&fee<=0.009)throw Object.assign(new Error("यस ऋणमा बाँकी रकम छैन।"),{status:409});
   if(fee>0.009)throw Object.assign(new Error("यस ऋणमा जरिवाना रु. "+fee+" बाँकी छ। पहिले जरिवाना मिलाउनुहोस्।"),{status:409});
   const total=n(principal+interest);
   // सदस्यको बचतबाट ऋण मिलान गर्दा बचत/फिर्ता/अघिल्लो सेटलमेन्ट एउटै member lock भित्र गणना हुन्छ।
   await c.query("SELECT id FROM members WHERE id=$1 AND organization_id=$2 FOR UPDATE",[loan.member_id,s.oid]);
   const bal=await c.query(`SELECT GREATEST(0,
     COALESCE((SELECT SUM(amount) FROM savings WHERE organization_id=$1 AND member_id=$2 AND status='posted'),0)
     - COALESCE((SELECT SUM(amount) FROM deposits WHERE organization_id=$1 AND member_id=$2 AND transaction_type IN ('refund','loan_settlement')),0)
   ) AS available`,[s.oid,loan.member_id]);
   const available=n(bal.rows[0]?.available||0);
   const savingsUsed=continueSaving?0:n(Math.min(available,total));
   const cashDue=n(total-savingsUsed);
   const code=method==="bank"?"1002":"1001";
   const requiredCodes=["1101",...(interest>0?["4001"]:[]),...(savingsUsed>0?["2001"]:[]),...(cashDue>0?[code]:[])];
   const acc=await c.query("SELECT account_code,id FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,requiredCodes]);
   const a=Object.fromEntries(acc.rows.map(x=>[x.account_code,x.id]));
   if(requiredCodes.some(x=>!a[x]))throw Object.assign(new Error("आवश्यक लेखा खाता (Cash/Bank, बचत, Loan Receivable वा Interest Income) उपलब्ध छैन।"),{status:400});
   let cash=null;
   if(cashDue>0){
     const cr=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,method]);
     if(!cr.rowCount)throw Object.assign(new Error(method==="bank"?"सक्रिय Bank Account उपलब्ध छैन।":"सक्रिय Cash Account उपलब्ध छैन।"),{status:400});
     cash=cr.rows[0];
   }
   const voucherNo="BK-RC-CLOSE-"+Date.now();
   const v=await c.query(`INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at)
     VALUES($1,$2,'journal',CURRENT_DATE,$3,'loan_settlement',$4,'posted',$5,now()) RETURNING id`,[s.oid,voucherNo,"ऋण पूर्ण भुक्तानी तथा बचतबाट सेटलमेन्ट: "+loan.application_no,id,s.uid||null]);
   const voucherId=v.rows[0].id;
   if(savingsUsed>0)await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,'सदस्य बचतबाट ऋण सेटलमेन्ट')",[voucherId,a["2001"],loan.member_id,savingsUsed]);
   if(cashDue>0)await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,'ऋण बन्द नगद/बैंक प्राप्ति')",[voucherId,a[code],loan.member_id,cashDue]);
   await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'बाँकी साँवा')",[voucherId,a["1101"],loan.member_id,principal]);
   if(interest>0)await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'बाँकी ब्याज आम्दानी')",[voucherId,a["4001"],loan.member_id,interest]);
   const payMethod=savingsUsed>0?(cashDue>0?"mixed":"savings"):method;
   const pay=await c.query(`INSERT INTO loan_payments(organization_id,loan_id,member_id,paid_on,principal_amount,interest_amount,fee_amount,payment_method,receipt_no,received_by,notes)
     VALUES($1,$2,$3,CURRENT_DATE,$4,$5,0,$6,$7,$8,$9) RETURNING id`,[s.oid,id,loan.member_id,principal,interest,payMethod,voucherNo,s.uid||null,savingsUsed>0?"बचतबाट ऋण सेटलमेन्ट":"ऋण पूर्ण बन्द"]);
   await c.query("UPDATE loan_installments SET paid_principal=principal_due,paid_interest=interest_due,paid_fee=fee_due,status='paid' WHERE loan_id=$1",[id]);
   await c.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,credit,narration) VALUES($1,$2,$3,CURRENT_DATE,'loan_repayment',$4,$5)",[s.oid,loan.member_id,voucherId,total,"ऋण पूर्ण बन्द "+loan.application_no]);
   if(savingsUsed>0){
     await c.query("INSERT INTO deposits(organization_id,member_id,transaction_date,transaction_type,amount,payment_method,receipt_no,description,created_by) VALUES($1,$2,CURRENT_DATE,'loan_settlement',$3,'internal',$4,$5,$6)",[s.oid,loan.member_id,savingsUsed,voucherNo,"बचतबाट ऋण सेटलमेन्ट (Settle to Loan) "+loan.application_no,s.uid||null]);
     await c.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,debit,narration) VALUES($1,$2,$3,CURRENT_DATE,'loan_settlement',$4,$5)",[s.oid,loan.member_id,voucherId,savingsUsed,"बचतबाट ऋण सेटलमेन्ट (Settle to Loan)"]);
   }
   if(cashDue>0)await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,CURRENT_DATE,'in','loan_repayment',$3,'loan_payment',$4,$5,$6,$7)",[s.oid,cash.id,cashDue,pay.rows[0].id,voucherNo,"ऋण बन्द "+loan.application_no,s.uid||null]);
   await c.query("UPDATE members SET continue_saving=$2,updated_at=now() WHERE id=$1 AND organization_id=$3",[loan.member_id,continueSaving,s.oid]);
   await c.query("UPDATE loans SET status='closed' WHERE id=$1",[id]);
   return await finish(c,{ok:true,voucherNo,total,principal,interest,savingsAvailable:available,savingsUsed,cashDue,continueSaving,message:"ऋण बन्द भयो। Voucher: "+voucherNo+(savingsUsed>0?" — रु. "+savingsUsed+" बचतबाट ऋण सेटलमेन्ट गरियो (Settle to Loan)।":"")+(cashDue>0?" — बाँकी रु. "+cashDue+" नगद/बैंकबाट प्राप्त भयो।":"")+(continueSaving?" — सदस्यको बचत जारी रहनेछ।":" — भविष्यको बचत रोकियो।")});
  }else if(action==="repay"){
   if(!["disbursed","closed"].includes(loan.status)||loan.status==="closed")throw Object.assign(new Error("वितरण भएको खुला ऋणमा मात्र किस्ता लिन मिल्छ।"),{status:409});
   const principal=n(b.principalAmount||0),interest=n(b.interestAmount||0),fee=n(b.feeAmount||0),total=n(principal+interest+fee);
   if(total<=0)throw Object.assign(new Error("किस्ता रकम राख्नुहोस्।"),{status:400});
   const outstanding=await c.query("SELECT COALESCE(SUM(principal_due-paid_principal),0) AS p,COALESCE(SUM(interest_due-paid_interest),0) AS i,COALESCE(SUM(fee_due-paid_fee),0) AS f FROM loan_installments WHERE loan_id=$1",[id]);
   if(principal>Number(outstanding.rows[0].p)+0.009||interest>Number(outstanding.rows[0].i)+0.009||fee>Number(outstanding.rows[0].f)+0.009)throw Object.assign(new Error("भुक्तानी बाँकी किस्ता रकमभन्दा बढी छ।"),{status:400});
   const method=String(b.paymentMethod||"cash"),cashCode=["bank","transfer","cheque","online"].includes(method)?"1002":"1001";
   const ac=await c.query("SELECT account_code,id FROM chart_of_accounts WHERE organization_id=$1 AND account_code=ANY($2::varchar[]) AND is_active=true",[s.oid,[cashCode,"1101","4001","4004"]]);
   const a=Object.fromEntries(ac.rows.map(x=>[x.account_code,x.id]));
   if(!a[cashCode]||!a["1101"]||(interest>0&&!a["4001"])||(fee>0&&!a["4004"]))throw new Error("Cash/Bank, Loan Receivable, Interest Income वा Penalty Income खाता उपलब्ध छैन।");
   const cashAccount=await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1",[s.oid,cashCode==="1002"?"bank":"cash"]);
   if(!cashAccount.rowCount)throw Object.assign(new Error(cashCode==="1002"?"सक्रिय Bank Account दर्ता गर्नुहोस्।":"सक्रिय Cash Account भेटिएन।"),{status:400});
   const voucherNo="BK-RC-LN-"+Date.now();
   const v=await c.query("INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at) VALUES($1,$2,'receipt',COALESCE($3::date,CURRENT_DATE),$4,'loan_payment',$5,'posted',$6,now()) RETURNING id",[s.oid,voucherNo,b.date||null,"ऋण किस्ता प्राप्ति "+loan.application_no,id,s.uid||null]);
   await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,'ऋण किस्ता प्राप्ति'),($1,$5,$3,0,$6,'साँवा असुली')",[v.rows[0].id,a[cashCode],loan.member_id,total,a["1101"],principal]);
   if(interest>0)await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'ब्याज आम्दानी')",[v.rows[0].id,a["4001"],loan.member_id,interest]);
   if(fee>0)await c.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'ढिलाइ/जरिवाना आम्दानी')",[v.rows[0].id,a["4004"],loan.member_id,fee]);
   const pay=await c.query("INSERT INTO loan_payments(organization_id,loan_id,member_id,paid_on,principal_amount,interest_amount,fee_amount,payment_method,receipt_no,received_by,notes) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7,$8,$9,$10,$11) RETURNING id",[s.oid,id,loan.member_id,b.date||null,principal,interest,fee,method,voucherNo,s.uid||null,b.notes||null]);
   await c.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,credit,narration) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),'loan_repayment',$5,$6)",[s.oid,loan.member_id,v.rows[0].id,b.date||null,total,"ऋण किस्ता प्राप्ति "+loan.application_no]);
   let leftP=principal,leftI=interest,leftF=fee;
   const inst=await c.query("SELECT * FROM loan_installments WHERE loan_id=$1 AND status<>'paid' ORDER BY due_date,installment_no FOR UPDATE",[id]);
   for(const row of inst.rows){if(leftP<=0&&leftI<=0&&leftF<=0)break;const p=Math.min(leftP,Number(row.principal_due)-Number(row.paid_principal)),i=Math.min(leftI,Number(row.interest_due)-Number(row.paid_interest)),f=Math.min(leftF,Number(row.fee_due)-Number(row.paid_fee));leftP=n(leftP-p);leftI=n(leftI-i);leftF=n(leftF-f);await c.query("UPDATE loan_installments SET paid_principal=paid_principal+$2,paid_interest=paid_interest+$3,paid_fee=paid_fee+$4,status=CASE WHEN paid_principal+$2>=principal_due-0.009 AND paid_interest+$3>=interest_due-0.009 AND paid_fee+$4>=fee_due-0.009 THEN 'paid' ELSE 'partial' END WHERE id=$1",[row.id,p,i,f]);}
   await c.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,COALESCE($3::date,CURRENT_DATE),'in','loan_repayment',$4,'loan_payment',$5,$6,$7,$8)",[s.oid,cashAccount.rows[0].id,b.date||null,total,pay.rows[0].id,voucherNo,"ऋण किस्ता "+loan.application_no,s.uid||null]);
   const remain=await c.query("SELECT COALESCE(SUM(principal_due-paid_principal),0) AS p,COALESCE(SUM(interest_due-paid_interest),0) AS i,COALESCE(SUM(fee_due-paid_fee),0) AS f FROM loan_installments WHERE loan_id=$1",[id]);
   if(Number(remain.rows[0].p)<=0.009&&Number(remain.rows[0].i)<=0.009&&Number(remain.rows[0].f)<=0.009)await c.query("UPDATE loans SET status='closed' WHERE id=$1",[id]);
   return await finish(c,{ok:true,paymentId:pay.rows[0].id,voucherNo,message:"ऋण किस्ता दर्ता भयो। Receipt: "+voucherNo});
  }else throw Object.assign(new Error("अमान्य कार्य।"),{status:400});
  await c.query("COMMIT");return NextResponse.json({ok:true});
 }catch(e){await c.query("ROLLBACK");console.error("Loan action",e);return NextResponse.json({error:e.message||"ऋण प्रक्रिया पूरा भएन।"},{status:e.status||500});}
 finally{c.release();}
}
async function finish(client,data){await client.query("COMMIT");return NextResponse.json(data,{status:200});}

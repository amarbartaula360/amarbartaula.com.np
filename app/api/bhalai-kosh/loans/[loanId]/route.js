import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
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
 if(!roles.includes(s.role))return NextResponse.json({error:"Permission denied"},{status:403});
 const {loanId}=await params,id=Number(loanId),b=await request.json(),action=String(b.action||"");
 if(!Number.isInteger(id)||id<1)return NextResponse.json({error:"सही ऋण छान्नुहोस्।"},{status:400});
 const db=getBhalaiKoshPool(),c=await db.connect();
 try{
  await c.query("BEGIN");
  const q=await c.query("SELECT l.*,m.status AS member_status FROM loans l JOIN members m ON m.id=l.member_id WHERE l.id=$1 AND l.organization_id=$2 FOR UPDATE",[id,s.oid]);
  const loan=q.rows[0];if(!loan)throw Object.assign(new Error("ऋण भेटिएन।"),{status:404});
  if(action==="approve"){
   if(loan.status!=="pending")throw Object.assign(new Error("Pending आवेदन मात्र स्वीकृत गर्न मिल्छ।"),{status:409});
   const approvedOn=String(b.approvedOn||new Date().toISOString().slice(0,10));
   if(!/^\d{4}-\d{2}-\d{2}$/.test(approvedOn))throw Object.assign(new Error("स्वीकृति मिति सही राख्नुहोस्।"),{status:400});
   await c.query("UPDATE loans SET status='approved',approved_on=$2::date,approved_by=$3,approved_at=now() WHERE id=$1",[id,approvedOn,s.uid||null]);
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

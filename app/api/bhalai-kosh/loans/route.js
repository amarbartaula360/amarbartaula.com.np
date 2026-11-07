import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
const canWrite=["admin","super_admin","accountant"];
export async function GET(){
 try{
  const s=await getBhalaiKoshSession();if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {rows}=await getBhalaiKoshPool().query(`
   SELECT l.*,m.member_code,m.full_name,
    COALESCE((SELECT SUM(i.principal_due+i.interest_due+i.fee_due-i.paid_principal-i.paid_interest-i.paid_fee) FROM loan_installments i WHERE i.loan_id=l.id),0) AS scheduled_balance,
    COALESCE((SELECT SUM(i.principal_due-i.paid_principal) FROM loan_installments i WHERE i.loan_id=l.id),0) AS principal_outstanding,
    COALESCE((SELECT SUM(i.interest_due-i.paid_interest) FROM loan_installments i WHERE i.loan_id=l.id),0) AS interest_outstanding,
    COALESCE((SELECT COUNT(*) FROM loan_installments i WHERE i.loan_id=l.id),0)::int AS installment_count,
    COALESCE((SELECT COUNT(*) FROM loan_installments i WHERE i.loan_id=l.id AND i.status='paid'),0)::int AS paid_installment_count,
    COALESCE((SELECT COUNT(*) FROM loan_installments i WHERE i.loan_id=l.id AND i.status<>'paid'),0)::int AS unpaid_installment_count,
    COALESCE((SELECT SUM(p.principal_amount) FROM loan_payments p WHERE p.loan_id=l.id),0) AS principal_paid,
    COALESCE((SELECT SUM(p.interest_amount) FROM loan_payments p WHERE p.loan_id=l.id),0) AS interest_paid,
    (SELECT MIN(i.due_date) FROM loan_installments i WHERE i.loan_id=l.id) AS first_emi_date
   FROM loans l JOIN members m ON m.id=l.member_id
   WHERE l.organization_id=$1 ORDER BY l.created_at DESC LIMIT 300`,[s.oid]);
  return NextResponse.json({loans:rows});
 }catch(e){console.error("Loans GET",e);return NextResponse.json({error:"ऋण विवरण ल्याउन सकिएन।"},{status:500});}
}
export async function POST(request){
 const s=await getBhalaiKoshSession();if(!s?.oid)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!canWrite.includes(s.role))return NextResponse.json({error:"Permission denied"},{status:403});
 const b=await request.json(),memberId=Number(b.memberId),principal=Number(b.principal),rate=Number(b.annualInterestRate||0),term=Number(b.termMonths),method=b.interestMethod==="reducing_balance"?"reducing_balance":"flat";
 if(!Number.isInteger(memberId)||principal<=0||!Number.isFinite(principal)||!Number.isFinite(rate)||rate<0||rate>100||!Number.isInteger(term)||term<1||term>360)
  return NextResponse.json({error:"सदस्य, ऋण रकम, ब्याजदर र अवधि सही राख्नुहोस्।"},{status:400});
 const db=getBhalaiKoshPool(),c=await db.connect();
 try{
  await c.query("BEGIN");
  const m=await c.query("SELECT id FROM members WHERE id=$1 AND organization_id=$2 AND status='active' FOR UPDATE",[memberId,s.oid]);
  if(!m.rowCount)throw Object.assign(new Error("सक्रिय सदस्य भेटिएन। Left सदस्यलाई नयाँ ऋण आवेदन दिन मिल्दैन।"),{status:400});
  const no="LN-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+Date.now().toString().slice(-6);
  const r=await c.query(`INSERT INTO loans(organization_id,member_id,application_no,applied_on,principal,annual_interest_rate,interest_method,term_months,purpose,status,created_by)
   VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7,$8,$9,'pending',$10) RETURNING *`,
   [s.oid,memberId,no,b.appliedOn||null,principal,rate,method,term,String(b.purpose||"").trim()||null,s.uid||null]);
  await c.query("COMMIT");return NextResponse.json({loan:r.rows[0]},{status:201});
 }catch(e){await c.query("ROLLBACK");console.error("Loans POST",e);return NextResponse.json({error:e.message||"ऋण आवेदन सुरक्षित गर्न सकिएन।"},{status:e.status||500});}
 finally{c.release();}
}

import { NextResponse } from "next/server";
import NepaliDate from "nepali-date-converter";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";

export const runtime = "nodejs";
const roles = ["admin", "super_admin", "accountant"];
const round = value => Number(Number(value || 0).toFixed(2));
const adDate = value => {
  const d = value instanceof Date ? value : new Date(value);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
};
function bsMonthRange(year, month) {
  const start = new NepaliDate(year + "-" + String(month).padStart(2,"0") + "-01").toJsDate();
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new NepaliDate(nextYear + "-" + String(nextMonth).padStart(2,"0") + "-01").toJsDate();
  return [adDate(start), adDate(end)];
}

export async function GET(request) {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const year = Number(params.get("year")), month = Number(params.get("month"));
    if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12)
      return NextResponse.json({ error: "वि.सं. वर्ष र महिना सही छान्नुहोस्।" }, { status: 400 });
    const [from, to] = bsMonthRange(year, month);
    const { rows } = await getBhalaiKoshPool().query(`
      SELECT m.id AS member_id,m.member_code,m.full_name,m.continue_saving,
        sv.id AS saving_id,sv.amount AS saving_amount,sv.paid_on AS saving_paid_on,
        sv.payment_method AS saving_payment_method,sv.receipt_no AS saving_receipt_no,
        l.id AS loan_id,l.application_no,l.status AS loan_status,
        COALESCE(l.disbursed_amount,l.principal) AS disbursed_amount,
        COALESCE(bal.principal,0) AS principal_outstanding,
        COALESCE(bal.interest,0) AS interest_outstanding,
        COALESCE(bal.fee,0) AS fee_outstanding,
        COALESCE(due.principal,0) AS month_principal_due,
        COALESCE(due.interest,0) AS month_interest_due,
        COALESCE(due.fee,0) AS month_fee_due,
        COALESCE(paid.principal,0) AS month_principal_paid,
        COALESCE(paid.interest,0) AS month_interest_paid,
        COALESCE(paid.fee,0) AS month_fee_paid
      FROM members m
      LEFT JOIN savings sv ON sv.organization_id=m.organization_id AND sv.member_id=m.id
        AND sv.period_year=$2 AND sv.period_month=$3 AND sv.status='posted'
      LEFT JOIN LATERAL (
        SELECT x.* FROM loans x WHERE x.organization_id=m.organization_id AND x.member_id=m.id
          AND x.status='disbursed' ORDER BY x.disbursed_on DESC,x.id DESC LIMIT 1
      ) l ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(GREATEST(0,i.principal_due-i.paid_principal)) AS principal,
               SUM(GREATEST(0,i.interest_due-i.paid_interest)) AS interest,
               SUM(GREATEST(0,i.fee_due-i.paid_fee)) AS fee
        FROM loan_installments i WHERE i.loan_id=l.id
      ) bal ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(GREATEST(0,i.principal_due-i.paid_principal)) AS principal,
               SUM(GREATEST(0,i.interest_due-i.paid_interest)) AS interest,
               SUM(GREATEST(0,i.fee_due-i.paid_fee)) AS fee
        FROM loan_installments i WHERE i.loan_id=l.id AND i.due_date >= $4::date AND i.due_date < $5::date
      ) due ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(p.principal_amount) AS principal,SUM(p.interest_amount) AS interest,SUM(p.fee_amount) AS fee
        FROM loan_payments p WHERE p.organization_id=m.organization_id AND p.member_id=m.id
          AND p.paid_on >= $4::date AND p.paid_on < $5::date AND p.loan_id=l.id
      ) paid ON TRUE
      WHERE m.organization_id=$1 AND m.status='active'
      ORDER BY m.full_name
    `, [session.oid, year, month, from, to]);
    return NextResponse.json({ year, month, from, to, members: rows });
  } catch (error) {
    console.error("Monthly collection GET:", error);
    return NextResponse.json({ error: error.message || "मासिक बचत तथा किस्ता विवरण ल्याउन सकिएन।" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getBhalaiKoshSession();
  if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roles.includes(session.role)) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  const body = await request.json();
  const year = Number(body.year), month = Number(body.month);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12 || !items.length)
    return NextResponse.json({ error: "महिना र कम्तीमा एउटा बचत वा किस्ता छान्नुहोस्।" }, { status: 400 });
  const db = getBhalaiKoshPool(), client = await db.connect();
  try {
    await client.query("BEGIN");
    const [from, to] = bsMonthRange(year, month);
    const codes = await client.query("SELECT account_code,id FROM chart_of_accounts WHERE organization_id=$1 AND is_active=true AND account_code=ANY($2::varchar[])", [session.oid, ["1001","1002","2001","1101","4001","4004"]]);
    const account = Object.fromEntries(codes.rows.map(row => [row.account_code, row.id]));
    const results = [];
    for (const item of items) {
      const memberId = Number(item.memberId);
      const saveSaving = item.saveSaving === true;
      const saveLoan = item.saveLoan === true;
      const savingAmount = saveSaving ? round(item.savingAmount) : 0;
      const principal = saveLoan ? round(item.principalAmount) : 0;
      const interest = saveLoan ? round(item.interestAmount) : 0;
      const fee = saveLoan ? round(item.feeAmount) : 0;
      const loanTotal = round(principal + interest + fee);
      if (!Number.isInteger(memberId) || memberId <= 0 || (!saveSaving && !saveLoan) ||
          (saveSaving && savingAmount <= 0) || (saveLoan && loanTotal <= 0))
        throw Object.assign(new Error("सदस्यको बचत वा किस्ता रकम सही राख्नुहोस्।"), { status: 400 });
      const member = await client.query("SELECT id,continue_saving FROM members WHERE id=$1 AND organization_id=$2 AND status='active' FOR UPDATE", [memberId, session.oid]);
      if (!member.rowCount) throw Object.assign(new Error("सक्रिय सदस्य भेटिएन।"), { status: 404 });
      if (saveSaving && member.rows[0].continue_saving === false)
        throw Object.assign(new Error("यस सदस्यको बचत रोकिएको छ। नयाँ बचत दर्ता गर्न मिल्दैन।"), { status: 409 });
      if (saveSaving) {
        const exists = await client.query("SELECT id FROM savings WHERE organization_id=$1 AND member_id=$2 AND period_year=$3 AND period_month=$4 AND status='posted' FOR UPDATE", [session.oid, memberId, year, month]);
        if (exists.rowCount) throw Object.assign(new Error("यस महिनाको बचत पहिले नै दर्ता छ।"), { status: 409 });
        if (!account["2001"]) throw new Error("बचत दायित्व खाता 2001 उपलब्ध छैन।");
      }
      let loan = null, installments = [];
      if (saveLoan) {
        const lr = await client.query("SELECT * FROM loans WHERE id=$1 AND member_id=$2 AND organization_id=$3 AND status='disbursed' FOR UPDATE", [Number(item.loanId), memberId, session.oid]);
        if (!lr.rowCount) throw Object.assign(new Error("सदस्यको खुला ऋण भेटिएन।"), { status: 404 });
        loan = lr.rows[0];
        const due = await client.query("SELECT * FROM loan_installments WHERE loan_id=$1 AND status<>'paid' ORDER BY due_date,installment_no FOR UPDATE", [loan.id]);
        installments = due.rows;
        const outstanding = installments.reduce((a, row) => ({
          principal: a.principal + Number(row.principal_due)-Number(row.paid_principal),
          interest: a.interest + Number(row.interest_due)-Number(row.paid_interest),
          fee: a.fee + Number(row.fee_due)-Number(row.paid_fee)
        }), { principal:0,interest:0,fee:0 });
        if (principal > outstanding.principal + 0.009 || interest > outstanding.interest + 0.009 || fee > outstanding.fee + 0.009)
          throw Object.assign(new Error("EMI रकम बाँकी साँवा/ब्याज/जरिवानाभन्दा बढी भयो।"), { status: 400 });
        if (!account["1101"] || (interest > 0 && !account["4001"]) || (fee > 0 && !account["4004"]))
          throw new Error("Loan Receivable, Interest Income वा Penalty Income खाता उपलब्ध छैन।");
      }
      const method = String(item.paymentMethod || "cash");
      if (!["cash","bank","transfer","cheque","online"].includes(method))
        throw Object.assign(new Error("भुक्तानी माध्यम सही छान्नुहोस्।"), { status: 400 });
      const cashCode = ["bank","transfer","cheque","online"].includes(method) ? "1002" : "1001";
      if (!account[cashCode]) throw new Error("Cash/Bank खाता उपलब्ध छैन।");
      const total = round(savingAmount + loanTotal);
      const cash = await client.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND is_active=true AND account_type=$2 ORDER BY id LIMIT 1", [session.oid, cashCode==="1002"?"bank":"cash"]);
      if (!cash.rowCount) throw Object.assign(new Error(cashCode==="1002"?"सक्रिय बैंक खाता भेटिएन।":"सक्रिय नगद खाता भेटिएन।"), { status: 400 });
      const voucherNo = "BK-MC-" + Date.now() + "-" + memberId;
      const date = body.paidOn || null;
      const narration = "मासिक बचत तथा ऋण किस्ता — " + member.rows[0].id;
      const voucher = await client.query(`INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,reference_id,status,created_by,posted_at)
        VALUES($1,$2,'receipt',COALESCE($3::date,CURRENT_DATE),$4,'monthly_collection',$5,'posted',$6,now()) RETURNING id`,
        [session.oid,voucherNo,date,narration,memberId,session.uid||null]);
      const voucherId = voucher.rows[0].id;
      await client.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,$4,0,$5)", [voucherId,account[cashCode],memberId,total,"नगद/बैंक प्राप्ति"]);
      if (savingAmount > 0) {
        await client.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'मासिक बचत')", [voucherId,account["2001"],memberId,savingAmount]);
        const receipt = await client.query(`INSERT INTO savings(organization_id,member_id,period_year,period_month,amount,paid_on,payment_method,receipt_no,status,received_by)
          VALUES($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7,$8,'posted',$9) RETURNING id`,
          [session.oid,memberId,year,month,savingAmount,date,method,voucherNo,session.uid||null]);
        await client.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,credit,narration) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),'contribution',$5,'मासिक बचत')",
          [session.oid,memberId,voucherId,date,savingAmount]);
        results.push({ memberId, savingId:receipt.rows[0].id, savingAmount });
      }
      if (saveLoan && loanTotal > 0) {
        await client.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'ऋण साँवा असुली')", [voucherId,account["1101"],memberId,principal]);
        if (interest > 0) await client.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'ब्याज आम्दानी')", [voucherId,account["4001"],memberId,interest]);
        if (fee > 0) await client.query("INSERT INTO voucher_lines(voucher_id,account_id,member_id,debit,credit,narration) VALUES($1,$2,$3,0,$4,'ढिलाइ/जरिवाना आम्दानी')", [voucherId,account["4004"],memberId,fee]);
        const payment = await client.query(`INSERT INTO loan_payments(organization_id,loan_id,member_id,paid_on,principal_amount,interest_amount,fee_amount,payment_method,receipt_no,received_by,notes)
          VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [session.oid,loan.id,memberId,date,principal,interest,fee,method,voucherNo,session.uid||null,"मासिक बचत तथा किस्ता"]);
        await client.query("INSERT INTO member_ledger(organization_id,member_id,voucher_id,transaction_date,transaction_type,credit,narration) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),'loan_repayment',$5,$6)",
          [session.oid,memberId,voucherId,date,loanTotal,"ऋण किस्ता " + loan.application_no]);
        let leftP=principal,leftI=interest,leftF=fee;
        for (const row of installments) {
          if (leftP<=0.009 && leftI<=0.009 && leftF<=0.009) break;
          const p=Math.min(leftP,Number(row.principal_due)-Number(row.paid_principal));
          const i=Math.min(leftI,Number(row.interest_due)-Number(row.paid_interest));
          const f=Math.min(leftF,Number(row.fee_due)-Number(row.paid_fee));
          leftP=round(leftP-p);leftI=round(leftI-i);leftF=round(leftF-f);
          await client.query("UPDATE loan_installments SET paid_principal=paid_principal+$2,paid_interest=paid_interest+$3,paid_fee=paid_fee+$4,status=CASE WHEN paid_principal+$2>=principal_due-0.009 AND paid_interest+$3>=interest_due-0.009 AND paid_fee+$4>=fee_due-0.009 THEN 'paid' ELSE 'partial' END WHERE id=$1",[row.id,p,i,f]);
        }
        const remaining = await client.query("SELECT COALESCE(SUM(principal_due-paid_principal),0) AS p,COALESCE(SUM(interest_due-paid_interest),0) AS i,COALESCE(SUM(fee_due-paid_fee),0) AS f FROM loan_installments WHERE loan_id=$1",[loan.id]);
        if (Number(remaining.rows[0].p)<=0.009 && Number(remaining.rows[0].i)<=0.009 && Number(remaining.rows[0].f)<=0.009)
          await client.query("UPDATE loans SET status='closed' WHERE id=$1",[loan.id]);
        results.push({ memberId, loanId:loan.id, paymentId:payment.rows[0].id, loanAmount:loanTotal });
      }
      await client.query("INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by) VALUES($1,$2,COALESCE($3::date,CURRENT_DATE),'in','monthly_collection','inbound',$4,'voucher',$5,$6,$7,$8)",
        [session.oid,cash.rows[0].id,date,total,voucherId,voucherNo,narration,session.uid||null]);
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok:true, count:results.length, results, message: "छानिएका सदस्यको मासिक बचत तथा किस्ता एकैपटक पोस्ट भयो।" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Monthly collection POST:", error);
    return NextResponse.json({ error:error.message || "मासिक बचत तथा किस्ता पोस्ट गर्न सकिएन।" }, { status:error.status || 500 });
  } finally { client.release(); }
}

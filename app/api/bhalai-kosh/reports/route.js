import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || null;
    const to = url.searchParams.get("to") || null;
    const validDate = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!validDate(from) || !validDate(to) || (from && to && from > to)) {
      return NextResponse.json({ error: "मिति दायरा सही राख्नुहोस्।" }, { status: 400 });
    }
    const db = getBhalaiKoshPool(), oid = session.oid;
    const range = (column) => `(${column} >= COALESCE($2::date,'0001-01-01'::date) AND ${column} <= COALESCE($3::date,'9999-12-31'::date))`;
    const [portfolio, payments, savings, cash, vouchers, summary, memberSavings, annualSavings, incomeStatement] = await Promise.all([
      db.query(`
        SELECT l.id,l.application_no,l.status,l.principal,l.disbursed_amount,l.disbursed_on,l.annual_interest_rate,l.term_months,
          m.member_code,m.full_name,
          COALESCE(i.principal_due,COALESCE(l.disbursed_amount,l.principal))-COALESCE(i.principal_paid,0) AS principal_outstanding,
          GREATEST(0,COALESCE(i.interest_due,0)-COALESCE(i.interest_paid,0)) AS interest_outstanding,
          COALESCE(p.principal_paid,0) AS principal_paid,COALESCE(p.interest_paid,0) AS interest_paid,COALESCE(p.fee_paid,0) AS fee_paid
        FROM loans l JOIN members m ON m.id=l.member_id
        LEFT JOIN LATERAL (SELECT SUM(principal_due) principal_due,SUM(paid_principal) principal_paid,SUM(interest_due) interest_due,SUM(paid_interest) interest_paid FROM loan_installments WHERE loan_id=l.id) i ON TRUE
        LEFT JOIN LATERAL (SELECT SUM(principal_amount) principal_paid,SUM(interest_amount) interest_paid,SUM(fee_amount) fee_paid FROM loan_payments WHERE loan_id=l.id) p ON TRUE
        WHERE l.organization_id=$1 AND l.status IN ('disbursed','closed')
        ORDER BY l.disbursed_on DESC,l.id DESC LIMIT 500
      `,[oid]),
      db.query(`
        SELECT p.id,p.paid_on,p.receipt_no,p.payment_method,p.principal_amount,p.interest_amount,p.fee_amount,
          l.application_no,m.member_code,m.full_name
        FROM loan_payments p JOIN loans l ON l.id=p.loan_id JOIN members m ON m.id=p.member_id
        WHERE p.organization_id=$1 AND ${range('p.paid_on')}
        ORDER BY p.paid_on DESC,p.id DESC LIMIT 1000
      `,[oid,from,to]),
      db.query(`
        SELECT s.period_year,s.period_month,COUNT(*)::int AS member_count,SUM(s.amount) AS amount
        FROM savings s WHERE s.organization_id=$1 AND s.status='posted' AND ${range('s.paid_on')}
        GROUP BY s.period_year,s.period_month ORDER BY s.period_year,s.period_month
      `,[oid,from,to]),
      db.query(`
        SELECT a.account_name,a.account_type,a.opening_balance,
          COALESCE(SUM(CASE WHEN t.direction='in' AND ${range('t.transaction_date')} THEN t.amount ELSE 0 END),0) AS total_in,
          COALESCE(SUM(CASE WHEN t.direction='out' AND ${range('t.transaction_date')} THEN t.amount ELSE 0 END),0) AS total_out,
          a.opening_balance+COALESCE(SUM(CASE WHEN t.direction='in' AND t.transaction_date<=COALESCE($3::date,'9999-12-31'::date) THEN t.amount WHEN t.direction='out' AND t.transaction_date<=COALESCE($3::date,'9999-12-31'::date) THEN -t.amount ELSE 0 END),0) AS balance
        FROM cash_bank_accounts a LEFT JOIN cash_bank_transactions t ON t.account_id=a.id AND t.organization_id=a.organization_id
        WHERE a.organization_id=$1 AND a.is_active=true
        GROUP BY a.id ORDER BY a.account_type,a.account_name
      `,[oid,from,to]),
      db.query(`
        SELECT v.voucher_no,v.voucher_type,v.voucher_date,v.narration,v.status,
          COALESCE(SUM(vl.debit),0) AS debit,COALESCE(SUM(vl.credit),0) AS credit
        FROM vouchers v LEFT JOIN voucher_lines vl ON vl.voucher_id=v.id
        WHERE v.organization_id=$1 AND ${range('v.voucher_date')}
        GROUP BY v.id ORDER BY v.voucher_date DESC,v.id DESC LIMIT 1000
      `,[oid,from,to]),
      db.query(`
        SELECT COALESCE(SUM(p.principal_amount),0) AS principal_collected,
          COALESCE(SUM(p.interest_amount),0) AS interest_income,
          COALESCE(SUM(p.fee_amount),0) AS fee_income,
          COUNT(p.id)::int AS payment_count
        FROM loan_payments p WHERE p.organization_id=$1 AND ${range('p.paid_on')}
      `,[oid,from,to])
,      db.query(`
        SELECT m.member_code,m.full_name,COUNT(s.id)::int AS deposit_count,COALESCE(SUM(s.amount),0) AS total_savings
        FROM members m LEFT JOIN savings s ON s.member_id=m.id AND s.organization_id=m.organization_id AND s.status='posted' AND ${range('s.paid_on')}
        WHERE m.organization_id=$1 GROUP BY m.id ORDER BY m.member_code
      `,[oid,from,to]),
      db.query(`
        SELECT s.period_year,COUNT(DISTINCT s.member_id)::int AS member_count,COUNT(*)::int AS deposit_count,COALESCE(SUM(s.amount),0) AS total_savings
        FROM savings s WHERE s.organization_id=$1 AND s.status='posted' AND ${range('s.paid_on')}
        GROUP BY s.period_year ORDER BY s.period_year
      `,[oid,from,to]),
      db.query(`
        SELECT a.account_code,a.account_name,a.account_type,COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.credit-vl.debit ELSE 0 END),0) AS net_amount
        FROM chart_of_accounts a LEFT JOIN voucher_lines vl ON vl.account_id=a.id
        LEFT JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=$1 AND v.status='posted' AND ${range('v.voucher_date')}
        WHERE a.organization_id=$1 AND a.account_type IN ('income','expense')
        GROUP BY a.id ORDER BY a.account_type,a.account_code
      `,[oid,from,to])
    ]);
    return NextResponse.json({filters:{from,to},loanPortfolio:portfolio.rows,loanPayments:payments.rows,savingsByPeriod:savings.rows,memberSavings:memberSavings.rows,annualSavings:annualSavings.rows,incomeStatement:incomeStatement.rows,cashBank:cash.rows,vouchers:vouchers.rows,summary:summary.rows[0]||{}});
  } catch (error) {
    console.error("Bhalai reports:", error);
    return NextResponse.json({ error: "वित्तीय प्रतिवेदन ल्याउन सकिएन।" }, { status: 500 });
  }
}

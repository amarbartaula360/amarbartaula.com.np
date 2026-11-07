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
          GREATEST(0,COALESCE(i.principal_due,COALESCE(l.disbursed_amount,l.principal))-COALESCE(i.principal_paid,p.principal_paid,0)) AS principal_outstanding,
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
      `,[oid,from,to]),
      db.query(`
        SELECT m.id AS member_id,m.member_code,m.full_name,
          COALESCE(period_savings.deposit_count,0)::int AS deposit_count,
          COALESCE(period_savings.total_savings,0) AS total_savings,
          GREATEST(0,COALESCE(all_savings.total_deposited,0)-COALESCE(refunds.total_refunded,0)) AS current_deposit
        FROM members m
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS deposit_count,COALESCE(SUM(s.amount),0) AS total_savings
          FROM savings s WHERE s.organization_id=m.organization_id AND s.member_id=m.id
            AND s.status='posted' AND ${range('s.paid_on')}
        ) period_savings ON TRUE
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(s.amount),0) AS total_deposited
          FROM savings s WHERE s.organization_id=m.organization_id AND s.member_id=m.id AND s.status='posted'
        ) all_savings ON TRUE
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(d.amount),0) AS total_refunded
          FROM deposits d WHERE d.organization_id=m.organization_id AND d.member_id=m.id AND d.transaction_type='refund'
        ) refunds ON TRUE
        WHERE m.organization_id=$1
          AND GREATEST(0,COALESCE(all_savings.total_deposited,0)-COALESCE(refunds.total_refunded,0)) > 0
        ORDER BY m.member_code
      `,[oid,from,to]),
      db.query(`
        SELECT s.period_year,COUNT(DISTINCT s.member_id)::int AS member_count,COUNT(*)::int AS deposit_count,COALESCE(SUM(s.amount),0) AS total_savings
        FROM savings s WHERE s.organization_id=$1 AND s.status='posted' AND ${range('s.paid_on')}
        GROUP BY s.period_year ORDER BY s.period_year
      `,[oid,from,to]),
      db.query(`
        SELECT a.account_code,a.account_name,a.account_type,COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN CASE WHEN a.account_type='expense' THEN vl.debit-vl.credit ELSE vl.credit-vl.debit END ELSE 0 END),0) AS net_amount
        FROM chart_of_accounts a LEFT JOIN voucher_lines vl ON vl.account_id=a.id
        LEFT JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=$1 AND v.status='posted' AND ${range('v.voucher_date')}
        WHERE a.organization_id=$1 AND a.account_type IN ('income','expense')
        GROUP BY a.id ORDER BY a.account_type,a.account_code
      `,[oid,from,to])
    ]);
    const accountingLedger = await db.query(`
      WITH account_opening AS (
        SELECT a.id AS account_id,a.account_code,a.account_name,a.account_type,
          COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN CASE WHEN a.account_type IN ('asset','expense') THEN vl.debit-vl.credit ELSE vl.credit-vl.debit END ELSE 0 END),0)::numeric AS opening_balance
        FROM chart_of_accounts a
        LEFT JOIN voucher_lines vl ON vl.account_id=a.id
        LEFT JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=$1 AND v.status='posted'
          AND ($2::date IS NULL OR v.voucher_date<$2::date)
          AND v.voucher_date<=COALESCE($3::date,'9999-12-31'::date)
        WHERE a.organization_id=$1 AND a.is_active=true
        GROUP BY a.id
      ), entries AS (
        SELECT a.account_id,a.account_code,a.account_name,a.account_type,a.opening_balance,
          v.id AS voucher_id,vl.id AS voucher_line_id,v.voucher_no,v.voucher_date,v.voucher_type,v.narration,
          COALESCE(vl.debit,0)::numeric AS debit,COALESCE(vl.credit,0)::numeric AS credit
        FROM account_opening a
        JOIN voucher_lines vl ON vl.account_id=a.account_id
        JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=$1 AND v.status='posted'
        WHERE v.voucher_date>=COALESCE($2::date,'0001-01-01'::date)
          AND v.voucher_date<=COALESCE($3::date,'9999-12-31'::date)
      ), balances AS (
        SELECT *,opening_balance+SUM(CASE WHEN account_type IN ('asset','expense') THEN debit-credit ELSE credit-debit END)
          OVER (PARTITION BY account_id ORDER BY voucher_date,voucher_id,voucher_line_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
        FROM entries
      )
      SELECT account_id,account_code,account_name,account_type,voucher_line_id,voucher_no,voucher_date,voucher_type,narration,
        opening_balance,debit,credit,running_balance
      FROM balances
      ORDER BY account_code,voucher_date,voucher_id,voucher_line_id
    `,[oid,from,to]);
    const [trialBalance, balanceRows] = await Promise.all([
      db.query(`SELECT a.id,a.account_code,a.account_name,a.account_type,
        COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.debit ELSE 0 END),0) AS total_debit,COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.credit ELSE 0 END),0) AS total_credit,
        GREATEST(0,COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.debit-vl.credit ELSE 0 END),0)) AS debit_balance,
        GREATEST(0,COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.credit-vl.debit ELSE 0 END),0)) AS credit_balance
        FROM chart_of_accounts a
        LEFT JOIN voucher_lines vl ON vl.account_id=a.id
        LEFT JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=$1 AND v.status='posted'
          AND v.voucher_date<=COALESCE($3::date,'9999-12-31'::date)
        WHERE a.organization_id=$1 AND a.is_active=true
        GROUP BY a.id ORDER BY a.account_code`,[oid,from,to]),
      db.query(`SELECT a.id,a.account_code,a.account_name,a.account_type,
        COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.debit ELSE 0 END),0) AS total_debit,
        COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.credit ELSE 0 END),0) AS total_credit,
        COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.debit-vl.credit ELSE 0 END),0) AS net
        FROM chart_of_accounts a
        LEFT JOIN voucher_lines vl ON vl.account_id=a.id
        LEFT JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=$1 AND v.status='posted'
          AND v.voucher_date<=COALESCE($2::date,'9999-12-31'::date)
        WHERE a.organization_id=$1 AND a.is_active=true
        GROUP BY a.id ORDER BY a.account_code`,[oid,to])
    ]);
    const bsRows=balanceRows.rows;
    const assets=bsRows.filter(x=>x.account_type==='asset').map(x=>({...x,balance:Number(x.net)}));
    const liabilities=bsRows.filter(x=>x.account_type==='liability').map(x=>({...x,balance:-Number(x.net)}));
    const equity=bsRows.filter(x=>x.account_type==='equity').map(x=>({...x,balance:-Number(x.net)}));
    const netIncome=bsRows.filter(x=>['income','expense'].includes(x.account_type)).reduce((sum,x)=>sum+(x.account_type==='income'?-Number(x.net):Number(x.net)),0);
    const sumRows=rows=>rows.reduce((sum,x)=>sum+Number(x.balance||0),0);
    const balanceSheet={asOf:to,assets,liabilities,equity,netIncome,totalAssets:sumRows(assets),totalLiabilities:sumRows(liabilities),totalEquity:sumRows(equity),totalLiabilitiesEquity:sumRows(liabilities)+sumRows(equity)+netIncome};
    const accountList = await db.query("SELECT id,account_code,account_name,account_type FROM chart_of_accounts WHERE organization_id=$1 AND is_active=true ORDER BY account_code",[oid]);
    return NextResponse.json({accountList:accountList.rows,filters:{from,to},loanPortfolio:portfolio.rows,loanPayments:payments.rows,savingsByPeriod:savings.rows,memberSavings:memberSavings.rows,annualSavings:annualSavings.rows,incomeStatement:incomeStatement.rows,accountingLedger:accountingLedger.rows,cashBank:cash.rows,vouchers:vouchers.rows,summary:summary.rows[0]||{},trialBalance:trialBalance.rows,balanceSheet});
  } catch (error) {
    console.error("Bhalai reports:", error);
    return NextResponse.json({ error: "वित्तीय प्रतिवेदन ल्याउन सकिएन।" }, { status: 500 });
  }
}

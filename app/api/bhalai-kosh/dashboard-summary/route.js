import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getBhalaiKoshPool();
    const oid = session.oid;
    const [loan, savings, cash, income, members, bankLedger, schoolInvestment] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE l.status IN ('disbursed','closed'))::int AS issued_loan_count,
          COUNT(*) FILTER (WHERE l.status='pending')::int AS pending_loan_count,
          COALESCE(SUM(CASE WHEN l.status IN ('disbursed','closed') THEN COALESCE(l.disbursed_amount,l.principal) ELSE 0 END),0) AS total_loan_issued,
          COALESCE(SUM(CASE WHEN l.status IN ('disbursed','closed') THEN
            CASE WHEN COALESCE(i.installment_count,0)>0 THEN i.principal_due-i.principal_paid
                 ELSE GREATEST(0,COALESCE(l.disbursed_amount,l.principal)-COALESCE(p.principal_paid,0)) END
            ELSE 0 END),0) AS principal_outstanding,
          COALESCE(SUM(CASE WHEN l.status IN ('disbursed','closed') THEN GREATEST(0,COALESCE(i.interest_due,0)-COALESCE(i.interest_paid,0)) ELSE 0 END),0) AS interest_outstanding,
          COALESCE(SUM(CASE WHEN l.status IN ('disbursed','closed') THEN COALESCE(p.interest_received,0) ELSE 0 END),0) AS interest_income_received,
          COALESCE(SUM(CASE WHEN l.status IN ('disbursed','closed') THEN COALESCE(p.fee_received,0) ELSE 0 END),0) AS fee_income_received
        FROM loans l
        LEFT JOIN LATERAL (SELECT COUNT(*) AS installment_count,SUM(principal_due) AS principal_due,SUM(paid_principal) AS principal_paid,SUM(interest_due) AS interest_due,SUM(paid_interest) AS interest_paid FROM loan_installments WHERE loan_id=l.id) i ON TRUE
        LEFT JOIN LATERAL (SELECT SUM(principal_amount) AS principal_paid,SUM(interest_amount) AS interest_received,SUM(fee_amount) AS fee_received FROM loan_payments WHERE loan_id=l.id) p ON TRUE
        WHERE l.organization_id=$1
      `, [oid]),
      db.query(`
        SELECT GREATEST(0,
          COALESCE((SELECT SUM(s.amount) FROM savings s WHERE s.organization_id=$1 AND s.status='posted'),0)
          - COALESCE((SELECT SUM(d.amount) FROM deposits d WHERE d.organization_id=$1 AND d.transaction_type IN ('refund','loan_settlement')),0)
        ) AS total_savings
      `, [oid]),
      db.query(`
        SELECT a.id,a.account_name,a.account_type,a.opening_balance,
          ca.account_code,
          COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.debit-vl.credit ELSE 0 END),0) AS movement,
          COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN vl.debit-vl.credit ELSE 0 END),0) AS balance
        FROM cash_bank_accounts a
        JOIN chart_of_accounts ca ON ca.organization_id=a.organization_id
          AND ca.account_code=CASE WHEN a.account_type='cash' THEN '1001' WHEN a.account_type='bank' THEN '1002' ELSE '' END
          AND ca.is_active=true
        LEFT JOIN voucher_lines vl ON vl.account_id=ca.id
        LEFT JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=a.organization_id AND v.status='posted'
        WHERE a.organization_id=$1 AND a.is_active=true
        GROUP BY a.id,ca.id ORDER BY a.account_type,a.account_name
      `, [oid]),
      db.query(`
        SELECT COALESCE(SUM(CASE WHEN a.account_code='4001' THEN vl.credit-vl.debit ELSE 0 END),0) AS interest_income,
               COALESCE(SUM(CASE WHEN a.account_code IN ('4003','4004') THEN vl.credit-vl.debit ELSE 0 END),0) AS other_loan_income,
               COALESCE(SUM(CASE WHEN a.account_type='income' THEN vl.credit-vl.debit ELSE 0 END),0) AS total_income
        FROM voucher_lines vl JOIN vouchers v ON v.id=vl.voucher_id AND v.organization_id=$1 AND v.status='posted'
        JOIN chart_of_accounts a ON a.id=vl.account_id AND a.organization_id=$1
      `, [oid]),
      db.query("SELECT COUNT(*) FILTER (WHERE status='active')::int AS active_members FROM members WHERE organization_id=$1", [oid]),
      db.query(`SELECT t.id,t.transaction_date,t.direction,t.category,t.amount,t.reference_no,t.description,a.account_name
        FROM cash_bank_transactions t JOIN cash_bank_accounts a ON a.id=t.account_id AND a.organization_id=t.organization_id
        WHERE t.organization_id=$1 AND a.account_type='bank'
        ORDER BY t.transaction_date DESC,t.id DESC LIMIT 30`, [oid]),
      db.query(`SELECT COALESCE(SUM(t.amount),0) AS amount,MIN(t.transaction_date) AS investment_date
        FROM cash_bank_transactions t
        WHERE t.organization_id=$1 AND t.reference_no='BK-RC-20810701-UEBS' AND t.direction='in'`, [oid])
    ]);
    const l=loan.rows[0]||{}, i=income.rows[0]||{};
    const accounts=cash.rows.map(x=>({...x,balance:Number(x.balance||0)}));
    return NextResponse.json({
      loans:{issuedCount:Number(l.issued_loan_count||0),pendingCount:Number(l.pending_loan_count||0),totalIssued:Number(l.total_loan_issued||0),principalOutstanding:Number(l.principal_outstanding||0),interestOutstanding:Number(l.interest_outstanding||0),interestIncomeReceived:Number(l.interest_income_received||0),feeIncomeReceived:Number(l.fee_income_received||0)},
      savings:{total:Number(savings.rows[0]?.total_savings||0)},
      schoolInvestment:{amount:Number(schoolInvestment.rows[0]?.amount||0),date:schoolInvestment.rows[0]?.investment_date||null},
      cashBank:{accounts,total:accounts.reduce((s,x)=>s+x.balance,0),cash:accounts.filter(x=>x.account_type==='cash').reduce((s,x)=>s+x.balance,0),bank:accounts.filter(x=>x.account_type==='bank').reduce((s,x)=>s+x.balance,0),bankLedger:bankLedger.rows},
      income:{interest:Number(l.interest_income_received||0),otherLoan:Number(l.fee_income_received||0),total:Number(i.total_income||0)},
      activeMembers:Number(members.rows[0]?.active_members||0)
    });
  } catch (error) {
    console.error("Bhalai dashboard summary:", error);
    return NextResponse.json({ error: "Dashboard वित्तीय विवरण ल्याउन सकिएन।" }, { status: 500 });
  }
}

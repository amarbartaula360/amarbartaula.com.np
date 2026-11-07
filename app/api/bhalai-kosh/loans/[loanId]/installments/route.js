import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { loanId } = await params;
    if (!/^\d+$/.test(String(loanId)) || Number(loanId) <= 0) {
      return NextResponse.json({ error: "सही ऋण छान्नुहोस्।" }, { status: 400 });
    }

    const db = getBhalaiKoshPool();
    const loan = await db.query(
      "SELECT id, member_id, principal, annual_interest_rate, interest_method, term_months FROM loans WHERE id=$1 AND organization_id=$2",
      [Number(id), session.oid]
    );
    if (!loan.rowCount) return NextResponse.json({ error: "ऋण विवरण भेटिएन।" }, { status: 404 });

    const { rows } = await db.query(
      `SELECT i.id, i.installment_no, i.due_date,
              i.principal_due, i.interest_due, i.fee_due,
              i.paid_principal, i.paid_interest, i.paid_fee, i.status,
              paid.paid_on
       FROM loan_installments i
       LEFT JOIN LATERAL (
         SELECT MIN(p.paid_on) AS paid_on
         FROM loan_payments p
         WHERE p.organization_id=$2 AND p.loan_id=i.loan_id AND p.installment_id=i.id
       ) paid ON TRUE
       WHERE i.loan_id=$1
       ORDER BY i.installment_no`,
      [Number(id), session.oid]
    );

    const totals = rows.reduce((a, i) => {
      a.scheduledPrincipal += Number(i.principal_due || 0);
      a.scheduledInterest += Number(i.interest_due || 0);
      a.paidPrincipal += Number(i.paid_principal || 0);
      a.paidInterest += Number(i.paid_interest || 0);
      a.principalOutstanding += Number(i.principal_due || 0) - Number(i.paid_principal || 0);
      a.interestOutstanding += Number(i.interest_due || 0) - Number(i.paid_interest || 0);
      a.feeOutstanding += Number(i.fee_due || 0) - Number(i.paid_fee || 0);
      return a;
    }, { scheduledPrincipal: 0, scheduledInterest: 0, paidPrincipal: 0, paidInterest: 0, principalOutstanding: 0, interestOutstanding: 0, feeOutstanding: 0 });

    return NextResponse.json({ loan: loan.rows[0], installments: rows, totals });
  } catch (error) {
    console.error("Loan installments GET:", error);
    return NextResponse.json({ error: "किस्ता तालिका ल्याउन सकिएन।" }, { status: 500 });
  }
}

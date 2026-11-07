import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
import NepaliDate from "nepali-date-converter";

export const runtime = "nodejs";

function bsDateToAd(value, label) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!match) throw new Error(label + " मिति YYYY-MM-DD (BS) ढाँचामा राख्नुहोस्।");
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 32) {
    throw new Error(label + " मिति सही छैन।");
  }
  const ad = new NepaliDate(year, month - 1, day).getAD();
  return String(ad.year).padStart(4, "0") + "-" + String(ad.month).padStart(2, "0") + "-" + String(ad.date).padStart(2, "0");
}

export async function GET(request, { params }) {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { memberId } = await params;
    if (!/^\d+$/.test(String(memberId)) || Number(memberId) <= 0) {
      return NextResponse.json({ error: "सही सदस्य छान्नुहोस्।" }, { status: 400 });
    }

    const url = new URL(request.url);
    const fromBs = url.searchParams.get("fromBs") || "";
    const toBs = url.searchParams.get("toBs") || "";
    let fromAd, toAd;
    try {
      fromAd = bsDateToAd(fromBs, "सुरु");
      toAd = bsDateToAd(toBs, "अन्तिम");
    } catch (dateError) {
      return NextResponse.json({ error: dateError.message }, { status: 400 });
    }
    if (fromAd && toAd && fromAd > toAd) {
      return NextResponse.json({ error: "सुरु मिति अन्तिम मितिभन्दा पछाडि हुन मिल्दैन।" }, { status: 400 });
    }

    const db = getBhalaiKoshPool();
    const id = Number(memberId);
    const memberResult = await db.query(
      "SELECT id, member_code, full_name FROM members WHERE id = $1 AND organization_id = $2",
      [id, session.oid]
    );
    if (!memberResult.rowCount) {
      return NextResponse.json({ error: "सदस्य भेटिएन।" }, { status: 404 });
    }

    // Posted member-ledger rows are the primary source. The NOT EXISTS fallbacks
    // expose older savings/loan records that pre-date ledger posting without mutating data.
    const [ledgerResult, savingsResult, refundResult, loanResult, legacySavingsResult, legacyLoanResult] = await Promise.all([
      db.query(
        `SELECT id::text AS id, transaction_date::text AS transaction_date, transaction_type, debit, credit, narration, voucher_id
         FROM member_ledger
         WHERE organization_id = $1 AND member_id = $2`,
        [session.oid, id]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount),0) AS total_savings, COUNT(*)::int AS saving_count
         FROM savings WHERE organization_id = $1 AND member_id = $2 AND status = 'posted'`,
        [session.oid, id]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount),0) AS total_refunded, COUNT(*)::int AS refund_count
         FROM deposits WHERE organization_id=$1 AND member_id=$2 AND transaction_type='refund'`,
        [session.oid, id]
      ),
      db.query(
        `SELECT
           COALESCE(SUM(CASE WHEN status IN ('disbursed','closed') THEN COALESCE(disbursed_amount, principal) ELSE 0 END),0) AS total_disbursed,
           COALESCE(SUM(CASE WHEN status IN ('disbursed','closed') THEN principal ELSE 0 END),0) -
             COALESCE((SELECT SUM(p.principal_amount) FROM loan_payments p WHERE p.organization_id=$1 AND p.member_id=$2),0) AS principal_outstanding,
           COALESCE((SELECT SUM(p.principal_amount) FROM loan_payments p WHERE p.organization_id=$1 AND p.member_id=$2),0) AS principal_paid,
           COALESCE((SELECT SUM(p.interest_amount+p.fee_amount) FROM loan_payments p WHERE p.organization_id=$1 AND p.member_id=$2),0) AS interest_paid,
           GREATEST(0, COALESCE((SELECT SUM(i.interest_due) FROM loan_installments i JOIN loans lx ON lx.id=i.loan_id WHERE lx.organization_id=$1 AND lx.member_id=$2 AND lx.status IN ('disbursed','closed')),0) - COALESCE((SELECT SUM(p.interest_amount) FROM loan_payments p WHERE p.organization_id=$1 AND p.member_id=$2),0)) AS interest_outstanding,
           COUNT(*) FILTER (WHERE status IN ('disbursed','closed'))::int AS loan_count
         FROM loans WHERE organization_id=$1 AND member_id=$2`,
        [session.oid, id]
      ),
      db.query(
        `SELECT s.id::text AS id, s.paid_on::text AS transaction_date, 'contribution' AS transaction_type,
                0::numeric AS debit, s.amount AS credit,
                'मासिक बचत (पुरानो बचत रेकर्ड)' AS narration, NULL::bigint AS voucher_id
         FROM savings s
         WHERE s.organization_id=$1 AND s.member_id=$2 AND s.status='posted'
           AND NOT EXISTS (
             SELECT 1 FROM member_ledger ml
             WHERE ml.organization_id=s.organization_id AND ml.member_id=s.member_id
               AND ml.transaction_type IN ('contribution','saving')
               AND ml.transaction_date=s.paid_on AND ml.credit=s.amount
           )`,
        [session.oid, id]
      ),
      db.query(
        `SELECT l.id::text AS id, l.disbursed_on::text AS transaction_date, 'loan_disbursement' AS transaction_type,
                COALESCE(l.disbursed_amount,l.principal) AS debit, 0::numeric AS credit,
                'ऋण वितरण (पुरानो ऋण रेकर्ड)' AS narration, NULL::bigint AS voucher_id
         FROM loans l
         WHERE l.organization_id=$1 AND l.member_id=$2 AND l.status IN ('disbursed','closed')
           AND l.disbursed_on IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM member_ledger ml
             WHERE ml.organization_id=l.organization_id AND ml.member_id=l.member_id
               AND ml.transaction_type IN ('loan_disbursement','loan')
               AND ml.transaction_date=l.disbursed_on
               AND ml.debit=COALESCE(l.disbursed_amount,l.principal)
           )
         UNION ALL
         SELECT p.id::text AS id, p.paid_on::text AS transaction_date, 'loan_repayment' AS transaction_type,
                0::numeric AS debit, (p.principal_amount+p.interest_amount+p.fee_amount) AS credit,
                'ऋण किस्ता प्राप्ति (पुरानो भुक्तानी)' AS narration, NULL::bigint AS voucher_id
         FROM loan_payments p
         WHERE p.organization_id=$1 AND p.member_id=$2
           AND NOT EXISTS (
             SELECT 1 FROM member_ledger ml
             WHERE ml.organization_id=p.organization_id AND ml.member_id=p.member_id
               AND ml.transaction_type IN ('loan_repayment','loan_payment')
               AND ml.transaction_date=p.paid_on
               AND ml.credit=(p.principal_amount+p.interest_amount+p.fee_amount)
           )`,
        [session.oid, id]
      )
    ]);

    const transactions = [
      ...ledgerResult.rows,
      ...legacySavingsResult.rows.map(row => ({ ...row, id: "saving-" + row.id })),
      ...legacyLoanResult.rows.map(row => ({ ...row, id: "loan-" + row.id }))
    ].sort((a, b) => {
      const dateCompare = String(a.transaction_date).localeCompare(String(b.transaction_date));
      return dateCompare || String(a.id).localeCompare(String(b.id));
    });

    let runningBalance = 0;
    const withBalance = transactions.map(row => {
      runningBalance += Number(row.credit || 0) - Number(row.debit || 0);
      return { ...row, running_balance: runningBalance };
    });
    const openingBalance = fromAd
      ? (withBalance.filter(row => String(row.transaction_date).slice(0, 10) < fromAd).at(-1)?.running_balance || 0)
      : 0;
    const filteredTransactions = withBalance.filter(row => {
      const date = String(row.transaction_date).slice(0, 10);
      return (!fromAd || date >= fromAd) && (!toAd || date <= toAd);
    });
    const closingBalance = filteredTransactions.length
      ? filteredTransactions[filteredTransactions.length - 1].running_balance
      : openingBalance;

    const savings = savingsResult.rows[0] || {};
    const refunds = refundResult.rows[0] || {};
    const loans = loanResult.rows[0] || {};
    const grossSavings = Number(savings.total_savings || 0);
    const totalRefunded = Number(refunds.total_refunded || 0);
    return NextResponse.json({
      member: memberResult.rows[0],
      transactions: filteredTransactions,
      filters: { fromBs, toBs, fromAd, toAd },
      openingBalance,
      closingBalance,
      summary: {
        grossSavings,
        totalRefunded,
        refundCount: Number(refunds.refund_count || 0),
        totalSavings: grossSavings - totalRefunded,
        savingCount: Number(savings.saving_count || 0),
        totalDisbursed: Number(loans.total_disbursed || 0),
        principalPaid: Number(loans.principal_paid || 0),
        principalOutstanding: Number(loans.principal_outstanding || 0),
        interestPaid: Number(loans.interest_paid || 0),
        interestOutstanding: Number(loans.interest_outstanding || 0),
        loanCount: Number(loans.loan_count || 0),
        ledgerBalance: runningBalance
      }
    });
  } catch (error) {
    console.error("Bhalai ledger:", error.message);
    const missingTable = error.code === "42P01";
    return NextResponse.json({
      error: missingTable
        ? "बचत/ऋण Ledger का आवश्यक टेबल भेटिएन। Neon मा Bhalai Kosh schema र accounting migration जाँच गर्नुहोस्।"
        : "Ledger ल्याउन सकिएन। Database connection र migration जाँच गर्नुहोस्।"
    }, { status: 500 });
  }
}

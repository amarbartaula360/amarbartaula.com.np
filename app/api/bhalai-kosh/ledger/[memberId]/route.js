import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { memberId } = await params;
    if (!/^\d+$/.test(String(memberId)) || Number(memberId) <= 0) {
      return NextResponse.json({ error: "सही सदस्य छान्नुहोस्।" }, { status: 400 });
    }

    const db = getBhalaiKoshPool();
    const memberResult = await db.query(
      "SELECT id, member_code, full_name FROM members WHERE id = $1 AND organization_id = $2",
      [Number(memberId), session.oid]
    );
    if (!memberResult.rowCount) {
      return NextResponse.json({ error: "सदस्य भेटिएन।" }, { status: 404 });
    }

    const ledgerResult = await db.query(
      `SELECT id, transaction_date, transaction_type, debit, credit, narration, voucher_id,
              SUM(credit - debit) OVER (
                PARTITION BY member_id
                ORDER BY transaction_date, id
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
              ) AS running_balance
       FROM member_ledger
       WHERE organization_id = $1 AND member_id = $2
       ORDER BY transaction_date, id`,
      [session.oid, Number(memberId)]
    );

    return NextResponse.json({
      member: memberResult.rows[0],
      transactions: ledgerResult.rows
    });
  } catch (error) {
    console.error("Bhalai ledger:", error.message);
    const missingTable = error.code === "42P01";
    return NextResponse.json({
      error: missingTable
        ? "member_ledger टेबल भेटिएन। Neon SQL Editor मा database/bhalai_kosh_accounting.sql migration चलाउनुहोस्।"
        : "Ledger ल्याउन सकिएन। Database connection र migration जाँच गर्नुहोस्।"
    }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { accountId: rawId } = await params;
    const accountId = Number(rawId);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return NextResponse.json({ error: "सही खाता छान्नुहोस्।" }, { status: 400 });
    }

    const db = getBhalaiKoshPool();
    const account = await db.query(
      `SELECT id, account_code, account_name, account_type
       FROM chart_of_accounts
       WHERE id = $1 AND organization_id = $2 AND is_active = true`,
      [accountId, session.oid]
    );
    if (!account.rowCount) return NextResponse.json({ error: "खाता भेटिएन।" }, { status: 404 });

    const result = await db.query(
      `WITH entries AS (
         SELECT
           a.id AS account_id,
           v.id AS voucher_id,
           vl.id AS voucher_line_id,
           v.voucher_no,
           v.voucher_date,
           v.voucher_type,
           v.narration,
           COALESCE(vl.debit, 0)::numeric AS debit,
           COALESCE(vl.credit, 0)::numeric AS credit,
           a.account_type
         FROM chart_of_accounts a
         JOIN voucher_lines vl ON vl.account_id = a.id
         JOIN vouchers v ON v.id = vl.voucher_id
         WHERE a.id = $1
           AND a.organization_id = $2
           AND v.organization_id = $2
           AND v.status = 'posted'
       )
       SELECT
         account_id, voucher_line_id, voucher_no, voucher_date, voucher_type, narration,
         debit, credit,
         SUM(CASE WHEN account_type IN ('asset', 'expense') THEN debit - credit ELSE credit - debit END)
           OVER (ORDER BY voucher_date, voucher_id, voucher_line_id
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
       FROM entries
       ORDER BY voucher_date, voucher_id, voucher_line_id`,
      [accountId, session.oid]
    );

    return NextResponse.json({ account: account.rows[0], ledger: result.rows });
  } catch (error) {
    console.error("Account ledger GET:", error);
    return NextResponse.json({ error: "खाताको Ledger ल्याउन सकिएन।" }, { status: 500 });
  }
}

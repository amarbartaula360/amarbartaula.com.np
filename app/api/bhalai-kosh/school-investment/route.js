import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";

export async function POST() {
  const s = await getBhalaiKoshSession();
  if (!s?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "super_admin", "accountant"].includes(s.role)) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

  const db = getBhalaiKoshPool();
  const c = await db.connect();
  const voucherNo = "BK-RC-20810701-UEBS";
  const amount = 1394000;
  const transactionDate = "2024-10-17";
  const accountName = "बैंक मौज्दात - United English Boarding School लगानी";
  const narration = "United English Boarding School ले भलाई कोषमा गरेको लगानी";

  try {
    await c.query("BEGIN");
    const existing = await c.query("SELECT id FROM vouchers WHERE organization_id=$1 AND voucher_no=$2", [s.oid, voucherNo]);
    if (existing.rowCount) {
      await c.query("COMMIT");
      return NextResponse.json({ ok: true, alreadyExists: true, message: "विद्यालयको रु. १३,९४,००० लगानी पहिले नै बैंक Ledger मा दर्ता छ।" });
    }
    const coa = await c.query("SELECT account_code,id FROM chart_of_accounts WHERE organization_id=$1 AND account_code IN ('1002','3001')", [s.oid]);
    const byCode = Object.fromEntries(coa.rows.map(x => [x.account_code, x.id]));
    if (!byCode["1002"] || !byCode["3001"]) throw new Error("Bank (1002) वा Welfare Fund Capital (3001) खाता भेटिएन।");
    let bank = await c.query("SELECT id FROM cash_bank_accounts WHERE organization_id=$1 AND account_name=$2 AND account_type='bank' LIMIT 1", [s.oid, accountName]);
    if (!bank.rowCount) bank = await c.query("INSERT INTO cash_bank_accounts(organization_id,account_name,account_type,opening_balance,is_active) VALUES($1,$2,'bank',0,true) RETURNING id", [s.oid, accountName]);
    const voucher = await c.query(
      `INSERT INTO vouchers(organization_id,voucher_no,voucher_type,voucher_date,narration,reference_type,status,created_by,posted_at)
       VALUES($1,$2,'receipt',$3::date,$4,'school_investment','posted',$5,now()) RETURNING id`,
      [s.oid, voucherNo, transactionDate, narration, s.uid || null]
    );
    const voucherId = voucher.rows[0].id;
    await c.query(
      "INSERT INTO voucher_lines(voucher_id,account_id,debit,credit,narration) VALUES($1,$2,$3,0,$4),($1,$5,0,$3,$6)",
      [voucherId, byCode["1002"], amount, "बैंकमा विद्यालय लगानी प्राप्त", byCode["3001"], "United English Boarding School को लगानी पूँजी"]
    );
    await c.query(
      `INSERT INTO cash_bank_transactions(organization_id,account_id,transaction_date,direction,category,amount,source_type,source_id,reference_no,description,created_by)
       VALUES($1,$2,$3::date,'in','school_investment',$4,'voucher',$5,$6,$7,$8)`,
      [s.oid, bank.rows[0].id, transactionDate, amount, voucherId, voucherNo, narration, s.uid || null]
    );
    await c.query("COMMIT");
    return NextResponse.json({ ok: true, voucherNo, amount, transactionDate, message: "२०८१/०७/०१ को रु. १३,९४,००० विद्यालय लगानी बैंक Ledger मा दर्ता भयो।" }, { status: 201 });
  } catch (error) {
    await c.query("ROLLBACK");
    console.error("Bhalai school investment:", error);
    return NextResponse.json({ error: error.message || "विद्यालय लगानी दर्ता गर्न सकिएन।" }, { status: 500 });
  } finally {
    c.release();
  }
}

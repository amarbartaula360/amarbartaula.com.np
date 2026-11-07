import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
const allowedRoles = ["admin", "super_admin", "accountant"];
const validTypes = ["asset", "liability", "equity", "income", "expense"];
export async function POST(request) {
  try {
    const session = await getBhalaiKoshSession();
    if (!session?.oid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!allowedRoles.includes(session.role)) return NextResponse.json({ error: "यो खाता थप्ने अनुमति छैन।" }, { status: 403 });
    const body = await request.json();
    const accountCode = String(body.accountCode || "").trim();
    const accountName = String(body.accountName || "").trim();
    const accountType = String(body.accountType || "").trim().toLowerCase();
    if (!/^[A-Za-z0-9._-]{2,20}$/.test(accountCode)) return NextResponse.json({ error: "खाता कोड २ देखि २० अक्षरसम्म राख्नुहोस् (अङ्क/अक्षर/.-_ मात्र)।" }, { status: 400 });
    if (accountName.length < 2 || accountName.length > 150) return NextResponse.json({ error: "खाताको नाम २ देखि १५० अक्षरसम्म राख्नुहोस्।" }, { status: 400 });
    if (!validTypes.includes(accountType)) return NextResponse.json({ error: "सही खाता समूह छान्नुहोस्।" }, { status: 400 });
    const result = await getBhalaiKoshPool().query(
      `INSERT INTO chart_of_accounts (organization_id, account_code, account_name, account_type, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (organization_id, account_code) DO NOTHING
       RETURNING id, account_code, account_name, account_type`,
      [session.oid, accountCode, accountName, accountType]
    );
    if (!result.rowCount) return NextResponse.json({ error: "यो खाता कोड पहिले नै प्रयोग भएको छ। अर्को कोड राख्नुहोस्।" }, { status: 409 });
    return NextResponse.json({ ok: true, account: result.rows[0], message: "नयाँ Ledger सफलतापूर्वक बन्यो।" }, { status: 201 });
  } catch (error) {
    console.error("Chart of Accounts POST:", error);
    return NextResponse.json({ error: "नयाँ Ledger बनाउन सकिएन। Database schema जाँच गर्नुहोस्।" }, { status: 500 });
  }
}
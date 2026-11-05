import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
export const runtime = "nodejs";
export async function POST(request) {
  try {
    const key = request.headers.get("x-bhalai-setup-key");
    if (!process.env.BHALAI_KOSH_SETUP_KEY || key !== process.env.BHALAI_KOSH_SETUP_KEY)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const orgName = String(body.organizationName || "").trim();
    const code = String(body.organizationCode || "").trim().toUpperCase();
    const name = String(body.adminName || "").trim();
    const email = String(body.adminEmail || "").trim().toLowerCase();
    const password = String(body.adminPassword || "");
    if (!orgName || !/^[A-Z0-9_-]{3,40}$/.test(code) || !name || !email || password.length < 12)
      return NextResponse.json({ error: "सबै विवरण दिनुहोस्। Admin password कम्तीमा १२ अक्षरको हुनुपर्छ।" }, { status: 400 });
    const db = getBhalaiKoshPool();
    const existing = await db.query("SELECT id FROM users LIMIT 1");
    if (existing.rowCount) return NextResponse.json({ error: "Initial setup पहिले नै भइसकेको छ।" }, { status: 409 });
    const hash = await bcrypt.hash(password, 12);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const org = await client.query("INSERT INTO organizations(name,code) VALUES($1,$2) RETURNING id", [orgName,code]);
      const orgId = org.rows[0].id;
      await client.query("INSERT INTO fund_settings(organization_id) VALUES($1)", [orgId]);
      await client.query("INSERT INTO users(organization_id,full_name,email,password_hash,role) VALUES($1,$2,$3,$4,'admin')", [orgId,name,email,hash]);
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, message: "Admin account तयार भयो। अब Login गर्नुहोस्।" });
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  } catch (error) {
    console.error("Bhalai Kosh setup error:", error.message);
    return NextResponse.json({ error: "Setup हुन सकेन। Database schema र configuration जाँच गर्नुहोस्।" }, { status: 500 });
  }
}

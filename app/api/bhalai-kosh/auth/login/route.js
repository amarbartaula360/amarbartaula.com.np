import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { createBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
export async function POST(request) {
  try {
    const body = await request.json();
    const code = String(body.organizationCode || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!code || !email || !password) return NextResponse.json({ error: "संस्था कोड, इमेल र पासवर्ड आवश्यक छ।" }, { status: 400 });
    const db = getBhalaiKoshPool();
    const result = await db.query(
      `SELECT u.id,u.organization_id,u.full_name,u.email,u.password_hash,u.role,u.is_active
       FROM users u JOIN organizations o ON o.id=u.organization_id
       WHERE upper(o.code)=$1 AND lower(u.email)=$2 LIMIT 1`, [code,email]
    );
    const user = result.rows[0];
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash)))
      return NextResponse.json({ error: "Login विवरण मिलेन। कृपया फेरि जाँच गर्नुहोस्।" }, { status: 401 });
    await db.query("UPDATE users SET last_login_at=now() WHERE id=$1", [user.id]);
    await createBhalaiKoshSession(user);
    await db.query("INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES($1,$2,'login','user',$2)", [user.organization_id,user.id]);
    return NextResponse.json({ ok: true, user: { name: user.full_name, role: user.role } });
  } catch (error) {
    console.error("Bhalai Kosh login error:", error.message);
    return NextResponse.json({ error: "Login सेवा उपलब्ध भएन। Database configuration जाँच गर्नुहोस्।" }, { status: 500 });
  }
}

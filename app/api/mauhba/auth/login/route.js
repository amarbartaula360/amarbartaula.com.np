import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/mauhba/db";
import { createSession } from "@/lib/mauhba/auth";

export const runtime = "nodejs";
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "इमेल र पासवर्ड आवश्यक छ" }, { status: 400 });
    const { rows } = await query("SELECT id, full_name, email, password_hash, role, is_active FROM app_users WHERE lower(email)=lower($1) LIMIT 1", [String(email).trim()]);
    const user = rows[0];
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) return NextResponse.json({ error: "इमेल वा पासवर्ड मिलेन" }, { status: 401 });
    await createSession(user);
    await query("UPDATE app_users SET last_login_at=now() WHERE id=$1", [user.id]);
    return NextResponse.json({ user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
  } catch (e) { return NextResponse.json({ error: e.message || "लगइन असफल भयो" }, { status: 500 }); }
}

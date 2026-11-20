import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/mauhba/db";

export const runtime = "nodejs";
export async function POST(request) {
  try {
    if (!process.env.SETUP_SECRET) return NextResponse.json({ error: "SETUP_SECRET सेट गरिएको छैन" }, { status: 503 });
    const body = await request.json();
    if (body.setupSecret !== process.env.SETUP_SECRET) return NextResponse.json({ error: "Setup secret मिलेन" }, { status: 403 });
    const { rows } = await query("SELECT count(*)::int AS count FROM app_users");
    if (rows[0].count > 0) return NextResponse.json({ error: "प्रारम्भिक Admin पहिले नै बनिसकेको छ" }, { status: 409 });
    if (!body.fullName || !body.email || !body.password || String(body.password).length < 12) return NextResponse.json({ error: "नाम, इमेल र कम्तीमा १२ अक्षरको पासवर्ड आवश्यक छ" }, { status: 400 });
    const hash = await bcrypt.hash(body.password, 12);
    const result = await query("INSERT INTO app_users (id,full_name,email,password_hash,role) VALUES (nextval(pg_get_serial_sequence('app_users','id')), $1, lower($2), $3, 'admin') RETURNING id,full_name,email,role", [body.fullName,body.email,hash]);
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

import { NextResponse } from "next/server";
import { query } from "@/lib/mauhba/db";
import { requireUser } from "@/lib/mauhba/auth";

export const runtime = "nodejs";
export async function GET(request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("q") || "").trim();
    const ward = searchParams.get("ward");
    const status = searchParams.get("status");
    const values = []; const where = [];
    if (search) { values.push(`%${search}%`); where.push(`(b.name_ne ILIKE $1 OR b.name_en ILIKE $1 OR b.business_code ILIKE $1 OR b.pan_number ILIKE $1 OR c.phone ILIKE $1)`); }
    if (ward) { values.push(Number(ward)); where.push(`a.ward_no=$${values.length}`); }
    if (status) { values.push(status); where.push(`b.status=$${values.length}`); }
    const sql = `SELECT b.id,b.business_code,b.name_ne,b.name_en,b.business_type,b.pan_number,b.vat_number,b.status,b.created_at,bc.name_ne AS category_name,a.ward_no,a.tole,c.phone,o.full_name_ne AS owner_name FROM businesses b LEFT JOIN business_categories bc ON bc.id=b.category_id LEFT JOIN business_addresses a ON a.business_id=b.id AND a.is_primary=true LEFT JOIN business_contacts c ON c.business_id=b.id AND c.is_primary=true LEFT JOIN business_owners o ON o.business_id=b.id AND o.is_primary=true ${where.length ? "WHERE "+where.join(" AND ") : ""} ORDER BY b.created_at DESC LIMIT 500`;
    const { rows } = await query(sql, values);
    return NextResponse.json({ businesses: rows });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
}
export async function POST(request) {
  const client = await (await import("@/lib/mauhba/db")).db().connect();
  try {
    const user = await requireUser(); const body = await request.json();
    if (!body.name_ne?.trim()) return NextResponse.json({ error: "व्यवसायको नाम आवश्यक छ" }, { status: 400 });
    await client.query("BEGIN");
    const code = body.business_code?.trim() || `MH-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const b = await client.query(`INSERT INTO businesses (business_code,name_ne,name_en,category_id,business_type,pan_number,vat_number,registration_number,registration_date_bs,registration_date_ad,status,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [code,body.name_ne.trim(),body.name_en||null,body.category_id||null,body.business_type||null,body.pan_number||null,body.vat_number||null,body.registration_number||null,body.registration_date_bs||null,body.registration_date_ad||null,body.status||"active",body.notes||null]);
    const id = b.rows[0].id;
    if (body.owner_name) await client.query("INSERT INTO business_owners (business_id,full_name_ne,is_primary) VALUES ($1,$2,true)",[id,body.owner_name]);
    if (body.phone || body.email) await client.query("INSERT INTO business_contacts (business_id,phone,email,is_primary) VALUES ($1,$2,$3,true)",[id,body.phone||null,body.email||null]);
    if (body.ward_no || body.tole) await client.query("INSERT INTO business_addresses (business_id,ward_no,tole,is_primary) VALUES ($1,$2,$3,true)",[id,body.ward_no||null,body.tole||null]);
    await client.query("INSERT INTO activity_logs (id,user_id,entity_type,entity_id,action,new_values) VALUES (nextval(pg_get_serial_sequence('activity_logs','id')),$1,'business',$2,'create',$3)",[user.id,id,JSON.stringify({business_code:code,name_ne:body.name_ne})]);
    await client.query("COMMIT");
    return NextResponse.json({ id, business_code: code }, { status: 201 });
  } catch (e) { await client.query("ROLLBACK").catch(()=>{}); return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
  finally { client.release(); }
}

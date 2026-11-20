import { NextResponse } from "next/server";
import { query } from "@/lib/mauhba/db";
import { requireUser } from "@/lib/mauhba/auth";
export const runtime="nodejs";
export async function GET(){
 try{await requireUser();
 const [businesses,renewals,members,tax,wards,categories]=await Promise.all([
 query("SELECT count(*)::int AS total,count(*) FILTER (WHERE status='active')::int AS active,count(*) FILTER (WHERE status='inactive')::int AS inactive FROM businesses"),
 query("SELECT count(*)::int AS due FROM business_registrations WHERE expiry_date_ad IS NOT NULL AND expiry_date_ad <= CURRENT_DATE + INTERVAL '30 days'"),
 query("SELECT count(*)::int AS total FROM memberships WHERE status='active'"),
 query("SELECT count(*)::int AS pending FROM businesses b WHERE NOT EXISTS (SELECT 1 FROM tax_clearances t WHERE t.business_id=b.id AND t.fiscal_year=(EXTRACT(YEAR FROM CURRENT_DATE)::int||'/'||(EXTRACT(YEAR FROM CURRENT_DATE)::int+1)))"),
 query("SELECT COALESCE(a.ward_no,0) AS ward,count(*)::int AS total FROM businesses b LEFT JOIN business_addresses a ON a.business_id=b.id AND a.is_primary=true GROUP BY a.ward_no ORDER BY a.ward_no"),
 query("SELECT COALESCE(c.name_ne,'वर्गीकरण नभएको') AS name,count(*)::int AS total FROM businesses b LEFT JOIN business_categories c ON c.id=b.category_id GROUP BY c.name_ne ORDER BY total DESC LIMIT 8")
 ]);
 return NextResponse.json({stats:{total:businesses.rows[0].total,active:businesses.rows[0].active,inactive:businesses.rows[0].inactive,renewalsDue:renewals.rows[0].due,members:members.rows[0].total,taxPending:tax.rows[0].pending},wards:wards.rows,categories:categories.rows});
 }catch(e){return NextResponse.json({error:e.message},{status:e.status||500});}
}

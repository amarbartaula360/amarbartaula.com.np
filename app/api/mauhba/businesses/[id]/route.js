import { NextResponse } from "next/server";
import { db, query } from "@/lib/mauhba/db";
import { requireUser, requireAdmin } from "@/lib/mauhba/auth";
export const runtime = "nodejs";
export async function GET(_request,{params}) {
  try { await requireUser(); const {id}=await params;
    const {rows}=await query(`SELECT b.*,bc.name_ne AS category_name,a.ward_no,a.tole,a.street_address,c.contact_name,c.phone,c.alternate_phone,c.email,o.full_name_ne AS owner_name,o.citizenship_number FROM businesses b LEFT JOIN business_categories bc ON bc.id=b.category_id LEFT JOIN business_addresses a ON a.business_id=b.id AND a.is_primary=true LEFT JOIN business_contacts c ON c.business_id=b.id AND c.is_primary=true LEFT JOIN business_owners o ON o.business_id=b.id AND o.is_primary=true WHERE b.id=$1`,[id]);
    if(!rows[0]) return NextResponse.json({error:"व्यवसाय भेटिएन"},{status:404}); return NextResponse.json({business:rows[0]});
  } catch(e){return NextResponse.json({error:e.message},{status:e.status||500});}
}
export async function PUT(request,{params}) {
  const client=await db().connect();
  try {const user=await requireUser();const {id}=await params;const body=await request.json();await client.query("BEGIN");
    const old=await client.query("SELECT * FROM businesses WHERE id=$1 FOR UPDATE",[id]);if(!old.rows[0]){await client.query("ROLLBACK");return NextResponse.json({error:"व्यवसाय भेटिएन"},{status:404});}
    await client.query(`UPDATE businesses SET name_ne=$2,name_en=$3,category_id=$4,business_type=$5,pan_number=$6,vat_number=$7,registration_number=$8,status=$9,notes=$10,updated_at=now() WHERE id=$1`,[id,body.name_ne,body.name_en||null,body.category_id||null,body.business_type||null,body.pan_number||null,body.vat_number||null,body.registration_number||null,body.status||"active",body.notes||null]);
    if(body.owner_name){const x=await client.query("UPDATE business_owners SET full_name_ne=$2 WHERE business_id=$1 AND is_primary=true",[id,body.owner_name]);if(!x.rowCount)await client.query("INSERT INTO business_owners (business_id,full_name_ne,is_primary) VALUES ($1,$2,true)",[id,body.owner_name]);}
    if(body.phone||body.email){const x=await client.query("UPDATE business_contacts SET phone=$2,email=$3 WHERE business_id=$1 AND is_primary=true",[id,body.phone||null,body.email||null]);if(!x.rowCount)await client.query("INSERT INTO business_contacts (business_id,phone,email,is_primary) VALUES ($1,$2,$3,true)",[id,body.phone||null,body.email||null]);}
    if(body.ward_no||body.tole){const x=await client.query("UPDATE business_addresses SET ward_no=$2,tole=$3 WHERE business_id=$1 AND is_primary=true",[id,body.ward_no||null,body.tole||null]);if(!x.rowCount)await client.query("INSERT INTO business_addresses (business_id,ward_no,tole,is_primary) VALUES ($1,$2,$3,true)",[id,body.ward_no||null,body.tole||null]);}
    await client.query("INSERT INTO activity_logs (user_id,entity_type,entity_id,action,old_values,new_values) VALUES ($1,'business',$2,'update',$3,$4)",[user.id,id,JSON.stringify(old.rows[0]),JSON.stringify(body)]);
    await client.query("COMMIT");return NextResponse.json({ok:true});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return NextResponse.json({error:e.message},{status:e.status||500});}finally{client.release();}
}
export async function DELETE(_request,{params}) {
  const client=await db().connect();
  try {const user=await requireAdmin();const {id}=await params;await client.query("BEGIN");
    await client.query("UPDATE businesses SET status='inactive',updated_at=now() WHERE id=$1",[id]);
    await client.query("INSERT INTO activity_logs (user_id,entity_type,entity_id,action) VALUES ($1,'business',$2,'deactivate')",[user.id,id]);
    await client.query("COMMIT");return NextResponse.json({ok:true});
  }catch(e){await client.query("ROLLBACK").catch(()=>{});return NextResponse.json({error:e.message},{status:e.status||500});}finally{client.release();}
}

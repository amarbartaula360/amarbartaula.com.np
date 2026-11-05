import { NextResponse } from "next/server";
import { getBhalaiKoshPool } from "@/lib/bhalai-kosh-db";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
export async function GET(request,{params}) {
  try{
    const s=await getBhalaiKoshSession(); if(!s?.oid) return NextResponse.json({error:"Unauthorized"},{status:401});
    const {memberId}=await params;
    const db=getBhalaiKoshPool();
    const m=await db.query("SELECT id,member_code,full_name FROM members WHERE id=$1 AND organization_id=$2",[memberId,s.oid]);
    if(!m.rowCount) return NextResponse.json({error:"सदस्य भेटिएन।"},{status:404});
    const {rows}=await db.query(`SELECT transaction_date,transaction_type,debit,credit,narration,voucher_id
      FROM member_ledger WHERE organization_id=$1 AND member_id=$2 ORDER BY transaction_date,id`,[s.oid,memberId]);
    return NextResponse.json({member:m.rows[0],transactions:rows});
  }catch(e){console.error("Bhalai ledger:",e.message);return NextResponse.json({error:"Ledger ल्याउन सकिएन।"},{status:500});}
}

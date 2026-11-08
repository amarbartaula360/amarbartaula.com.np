import { NextResponse } from "next/server";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
export async function GET() {
  const session = await getBhalaiKoshSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const all=["dashboard","members","savings","finance","vouchers","loans","reports","ledger","import","settings","users"];
  const defaults=session.role==="admin"||session.role==="super_admin"?all:session.role==="accountant"?["dashboard","members","savings","finance","vouchers","loans","reports","ledger"]:["dashboard","members","savings"];
  return NextResponse.json({ authenticated: true, user: { id: session.uid, organizationId: session.oid, name: session.name, role: session.role, permissions: Array.isArray(session.permissions)?session.permissions:defaults } });
}

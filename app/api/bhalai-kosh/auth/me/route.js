import { NextResponse } from "next/server";
import { getBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
export async function GET() {
  const session = await getBhalaiKoshSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, user: { id: session.uid, organizationId: session.oid, name: session.name, role: session.role } });
}

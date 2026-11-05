import { NextResponse } from "next/server";
import { clearBhalaiKoshSession } from "@/lib/bhalai-kosh-auth";
export const runtime = "nodejs";
export async function POST() {
  await clearBhalaiKoshSession();
  return NextResponse.json({ ok: true });
}

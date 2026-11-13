import { clearConstructionSession } from "@/lib/construction-materials-auth";
export async function POST() { await clearConstructionSession(); return Response.json({ok:true}); }

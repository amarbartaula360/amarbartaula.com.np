import { getConstructionSession } from "@/lib/construction-materials-auth";
export async function GET() { const user=await getConstructionSession(); return Response.json({user:user?{id:user.uid,name:user.name,role:user.role,supplierId:user.supplierId}:null}); }

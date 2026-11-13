import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole } from "@/lib/construction-materials-auth";
export const dynamic="force-dynamic";
export async function GET(request){
 const {response}=await requireConstructionRole("admin");if(response)return response;
 const url=new URL(request.url),from=url.searchParams.get("from"),to=url.searchParams.get("to");
 const validDate=v=>!v||/^\d{4}-\d{2}-\d{2}$/.test(v);
 if(!validDate(from)||!validDate(to))return Response.json({error:"Dates must use YYYY-MM-DD"},{status:400});
 const start=from||"2000-01-01",end=to||"2999-12-31";
 try{
  const pool=getConstructionPool();
  const totals=await pool.query(`SELECT COUNT(*)::int AS orders,COUNT(*) FILTER(WHERE status='delivered')::int AS delivered,COUNT(*) FILTER(WHERE status='pending')::int AS pending,COUNT(*) FILTER(WHERE status='rejected')::int AS rejected,COALESCE(SUM(total) FILTER(WHERE status NOT IN ('rejected','cancelled')),0)::float AS sales,COALESCE(SUM(amount_paid),0)::float AS collected,COALESCE(SUM(total-amount_paid),0)::float AS receivable FROM cm_orders WHERE created_at::date BETWEEN $1::date AND $2::date`,[start,end]);
  const products=await pool.query(`SELECT product_name,unit,SUM(quantity)::float AS quantity,COUNT(*)::int AS orders,SUM(total)::float AS sales FROM cm_orders WHERE created_at::date BETWEEN $1::date AND $2::date AND status NOT IN ('rejected','cancelled') GROUP BY product_name,unit ORDER BY sales DESC`,[start,end]);
  const payments=await pool.query(`SELECT payment_status,COUNT(*)::int AS orders,SUM(amount_paid)::float AS collected FROM cm_orders WHERE created_at::date BETWEEN $1::date AND $2::date GROUP BY payment_status ORDER BY payment_status`,[start,end]);
  return Response.json({from:start,to:end,totals:totals.rows[0],products:products.rows,payments:payments.rows});
 }catch(e){console.error("CM reports:",e);return Response.json({error:"Reports unavailable"},{status:503});}
}

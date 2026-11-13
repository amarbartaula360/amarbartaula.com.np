import bcrypt from "bcryptjs";
import { getConstructionPool } from "@/lib/construction-materials-db";
import { requireConstructionRole, getConstructionSession } from "@/lib/construction-materials-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireConstructionRole("admin");
  if (response) return response;
  try {
    const pool = getConstructionPool();
    const [admins, suppliers] = await Promise.all([
      pool.query("SELECT id, username AS login_id, name, active, created_at, last_login_at FROM cm_admin_users ORDER BY created_at DESC"),
      pool.query("SELECT id, supplier_code AS login_id, name, active, created_at FROM cm_suppliers ORDER BY name")
    ]);
    return Response.json({
      admins: admins.rows.map(row => ({ ...row, account_type: "admin" })),
      suppliers: suppliers.rows.map(row => ({ ...row, account_type: "supplier" }))
    });
  } catch (error) {
    console.error("User management GET:", error);
    return Response.json({ error: "User accounts could not be loaded" }, { status: 503 });
  }
}

export async function POST(request) {
  const { response } = await requireConstructionRole("admin");
  if (response) return response;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request" }, { status: 400 });
  const pool = getConstructionPool();
  const accountType = body.accountType === "supplier" ? "supplier" : "admin";
  const loginId = String(body.loginId || "").trim();
  const password = String(body.password || "");
  if (!loginId || !password) return Response.json({ error: "Login ID र Password आवश्यक छन्।" }, { status: 400 });
  const minimum = accountType === "admin" ? 12 : 8;
  if (password.length < minimum) return Response.json({ error: `Password कम्तीमा ${minimum} अक्षरको हुनुपर्छ।` }, { status: 400 });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    if (accountType === "admin") {
      const name = String(body.name || "Administrator").trim() || "Administrator";
      const { rows } = await pool.query(
        "INSERT INTO cm_admin_users(username,password_hash,name) VALUES($1,$2,$3) RETURNING id,username AS login_id,name,active,created_at",
        [loginId, passwordHash, name]
      );
      return Response.json({ account: { ...rows[0], account_type: "admin" } }, { status: 201 });
    }
    const supplierId = Number(body.supplierId);
    if (!Number.isInteger(supplierId) || supplierId < 1) return Response.json({ error: "Supplier छान्नुहोस्।" }, { status: 400 });
    const { rows } = await pool.query(
      "UPDATE cm_suppliers SET supplier_code=$1,password_hash=$2,active=TRUE,updated_at=NOW() WHERE id=$3 RETURNING id,supplier_code AS login_id,name,active,created_at",
      [loginId, passwordHash, supplierId]
    );
    if (!rows.length) return Response.json({ error: "Supplier भेटिएन।" }, { status: 404 });
    return Response.json({ account: { ...rows[0], account_type: "supplier" } }, { status: 200 });
  } catch (error) {
    console.error("User management POST:", error);
    if (error.code === "23505") return Response.json({ error: "यो Login ID पहिले नै प्रयोग भएको छ।" }, { status: 409 });
    return Response.json({ error: "खाता बनाउन सकिएन।" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { session, response } = await requireConstructionRole("admin");
  if (response) return response;
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Valid account ID required" }, { status: 400 });
  const active = body.active !== false;
  const password = body.password === undefined ? "" : String(body.password);
  const accountType = body.accountType === "supplier" ? "supplier" : "admin";
  const minimum = accountType === "admin" ? 12 : 8;
  if (password && password.length < minimum) return Response.json({ error: `Password कम्तीमा ${minimum} अक्षरको हुनुपर्छ।` }, { status: 400 });
  if (accountType === "admin" && id === Number(session.uid) && !active) {
    return Response.json({ error: "आफ्नो Admin खाता बन्द गर्न मिल्दैन।" }, { status: 400 });
  }
  try {
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    if (accountType === "admin") {
      if (!active) {
        const count = await getConstructionPool().query("SELECT COUNT(*)::int AS total FROM cm_admin_users WHERE active=TRUE");
        if (Number(count.rows[0].total) <= 1) return Response.json({ error: "कम्तीमा एक Active Admin खाता आवश्यक छ।" }, { status: 400 });
      }
      const { rows } = await getConstructionPool().query(
        "UPDATE cm_admin_users SET active=$1,password_hash=COALESCE($2,password_hash) WHERE id=$3 RETURNING id,username AS login_id,name,active,created_at,last_login_at",
        [active, passwordHash, id]
      );
      if (!rows.length) return Response.json({ error: "Admin खाता भेटिएन।" }, { status: 404 });
      return Response.json({ account: { ...rows[0], account_type: "admin" }, passwordUpdated: Boolean(password) });
    }
    const { rows } = await getConstructionPool().query(
      "UPDATE cm_suppliers SET active=$1,password_hash=COALESCE($2,password_hash),updated_at=NOW() WHERE id=$3 RETURNING id,supplier_code AS login_id,name,active,created_at",
      [active, passwordHash, id]
    );
    if (!rows.length) return Response.json({ error: "Supplier खाता भेटिएन।" }, { status: 404 });
    return Response.json({ account: { ...rows[0], account_type: "supplier" }, passwordUpdated: Boolean(password) });
  } catch (error) {
    console.error("User management PATCH:", error);
    return Response.json({ error: "खाता अपडेट हुन सकेन।" }, { status: 500 });
  }
}

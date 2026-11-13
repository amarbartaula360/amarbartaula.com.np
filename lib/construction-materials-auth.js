import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const COOKIE = "cm_session";
function key() {
  const value = process.env.CONSTRUCTION_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("CONSTRUCTION_SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
}
export async function createConstructionSession(user) {
  const token = await new SignJWT({ uid: user.id, role: user.role, supplierId: user.supplier_id || null, name: user.name })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}
export async function getConstructionSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, key()); return payload; } catch { return null; }
}
export async function clearConstructionSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
export async function requireConstructionRole(...roles) {
  const session = await getConstructionSession();
  if (!session || !roles.includes(session.role)) return { session: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  return { session, response: null };
}

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const COOKIE = "bk_session";
function secret() {
  const value = process.env.BHALAI_KOSH_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("BHALAI_KOSH_SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
}
export async function createBhalaiKoshSession(user) {
  const token = await new SignJWT({ uid: user.id, oid: user.organization_id, role: user.role, name: user.full_name, permissions: user.permissions || [] })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}
export async function getBhalaiKoshSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return payload; } catch { return null; }
}
export async function clearBhalaiKoshSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function hasBhalaiKoshPermission(session, permission) {
  if (!session) return false;
  if (["admin","super_admin"].includes(session.role)) return true;
  return Array.isArray(session.permissions) ? session.permissions.includes(permission) : false;
}

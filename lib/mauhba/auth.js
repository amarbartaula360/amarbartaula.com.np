import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "mauhba_session";
function key() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}
export async function createSession(user) {
  const token = await new SignJWT({ sub: String(user.id), role: user.role, name: user.full_name, email: user.email })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}
export async function getSession() {
  try {
    const jar = await cookies(); const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, key());
    return { id: Number(payload.sub), role: payload.role, name: payload.name, email: payload.email };
  } catch { return null; }
}
export async function requireUser() {
  const user = await getSession();
  if (!user) { const e = new Error("लगइन आवश्यक छ"); e.status = 401; throw e; }
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!["admin", "super_admin"].includes(user.role)) { const e = new Error("यो कामका लागि Admin अधिकार आवश्यक छ"); e.status = 403; throw e; }
  return user;
}
export async function destroySession() {
  const jar = await cookies(); jar.delete(COOKIE);
}

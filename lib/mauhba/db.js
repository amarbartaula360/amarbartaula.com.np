import pg from "pg";

const { Pool } = pg;
let pool;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined, max: 8, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  return pool;
}
export async function query(text, params = []) { return db().query(text, params); }

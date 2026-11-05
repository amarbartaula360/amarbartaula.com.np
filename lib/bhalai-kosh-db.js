import pg from "pg";
const { Pool } = pg;
let pool;
export function getBhalaiKoshPool() {
  const connectionString = process.env.BHALAI_KOSH_DATABASE_URL;
  if (!connectionString) throw new Error("BHALAI_KOSH_DATABASE_URL is not configured");
  if (!pool) pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  return pool;
}

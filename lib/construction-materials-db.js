import pg from "pg";
const { Pool } = pg;
let pool;
export function getConstructionPool() {
  const connectionString = process.env.CONSTRUCTION_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("CONSTRUCTION_DATABASE_URL or DATABASE_URL is not configured");
  if (!pool) pool = new Pool({ connectionString, ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }, max: 8, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  return pool;
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type GlobalWithDb = typeof globalThis & {
  __lb_pool?: Pool;
  __lb_db?: ReturnType<typeof drizzle>;
};

/**
 * Lazy DB access: returns null instead of crashing at import time when
 * DATABASE_URL is not configured (common on fresh hosts like Netlify/Vercel
 * before env vars are set). Routes turn a null into a clear 500 JSON error.
 */
export function getDb(): ReturnType<typeof drizzle> | null {
  const g = globalThis as GlobalWithDb;
  if (g.__lb_db) return g.__lb_db;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  g.__lb_pool = g.__lb_pool ?? new Pool({ connectionString: url });
  g.__lb_db = drizzle(g.__lb_pool);
  return g.__lb_db;
}

import { sql, type SQLWrapper } from "drizzle-orm";

type DbLike = {
  execute: (query: string | SQLWrapper) => PromiseLike<unknown>;
};

type GlobalWithSchema = typeof globalThis & { __lb_schema?: Promise<void> };

/**
 * Creates the applications table on first use (CREATE TABLE IF NOT EXISTS),
 * so a fresh host only needs DATABASE_URL — no CLI, no migration step.
 */
export function ensureSchema(db: DbLike): Promise<void> {
  const g = globalThis as GlobalWithSchema;
  if (!g.__lb_schema) {
    g.__lb_schema = (async () => {
      await db.execute(
        sql`CREATE TABLE IF NOT EXISTS applications (
          id serial PRIMARY KEY,
          tiktok_url text NOT NULL,
          followers integer NOT NULL,
          posting_frequency text NOT NULL,
          languages text NOT NULL,
          has_prior_collab boolean NOT NULL,
          prior_agents text,
          invited_users integer,
          active_users integer,
          discord text NOT NULL,
          email text NOT NULL,
          screenshot text,
          status text NOT NULL DEFAULT 'new',
          created_at timestamp DEFAULT now() NOT NULL
        )`,
      );
    })().catch((err) => {
      g.__lb_schema = undefined; // allow retry on next request
      throw err;
    });
  }
  return g.__lb_schema;
}

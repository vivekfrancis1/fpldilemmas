import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import * as watchlistSchema from "@shared/watchlist-schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Railway's Postgres proxy (both internal and public) presents a cert whose
// altnames don't match the connection hostname, so strict verification is
// disabled — the connection itself is still encrypted, just not hostname-checked.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle({ client: pool, schema: { ...schema, ...watchlistSchema } });
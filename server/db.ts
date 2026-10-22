import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import * as watchlistSchema from "@shared/watchlist-schema";
import { assertSafeDatabase, poolSslOption } from "./db-config";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Dev and test runs may only use a local database (see server/db-config.ts); TLS is off for a local database
// and, for Railway's proxy, on without hostname verification (its cert altnames don't match the hostname).
assertSafeDatabase(process.env.DATABASE_URL, process.env);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: poolSslOption(process.env.DATABASE_URL),
});
export const db = drizzle({ client: pool, schema: { ...schema, ...watchlistSchema } });

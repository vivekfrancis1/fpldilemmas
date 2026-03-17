import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readFileSync } from "fs";
import { createHash } from "crypto";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function bootstrapMigrationTracking() {
  const client = await pool.connect();
  try {
    // Drizzle uses the "drizzle" schema for its __drizzle_migrations table
    await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `);

    const { rows } = await client.query(
      `SELECT COUNT(*) as count FROM "drizzle"."__drizzle_migrations"`
    );
    if (parseInt(rows[0].count) > 0) {
      console.log("Migration tracking already initialized.");
      return;
    }

    // Read journal to determine which migrations exist and their timestamps
    const journal = JSON.parse(readFileSync("./migrations/meta/_journal.json", "utf8"));

    // Check which tables already exist in the DB
    const { rows: tables } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public'`
    );
    const existingTables = new Set(tables.map((r) => r.tablename));

    for (const entry of journal.entries) {
      const filePath = `./migrations/${entry.tag}.sql`;
      let fileContent;
      try {
        fileContent = readFileSync(filePath, "utf8");
      } catch {
        continue;
      }

      // Detect if this migration is already applied by checking for any table it creates
      const createMatches = fileContent.match(/CREATE TABLE[^"]*"([^"]+)"/gi) || [];
      const tablesInMigration = createMatches
        .map((m) => m.match(/"([^"]+)"/)?.[1])
        .filter(Boolean);

      const appearsApplied =
        tablesInMigration.length === 0 ||
        tablesInMigration.some((t) => existingTables.has(t));

      if (appearsApplied) {
        const hash = createHash("sha256").update(fileContent).digest("hex");
        await client.query(
          `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
          [hash, entry.when]
        );
        console.log(`Marked as applied: ${entry.tag}`);
      }
    }
  } finally {
    client.release();
  }
}

try {
  console.log("Bootstrapping migration tracking...");
  await bootstrapMigrationTracking();
  console.log("Running pending migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations complete.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}

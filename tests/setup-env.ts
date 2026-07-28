// Loads .env into process.env before tests run, so `npx vitest run` works the same
// whether or not the shell already has DATABASE_URL exported (matches how `npm run dev`
// is started locally: `set -a && source .env && set +a`).
import { existsSync } from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(import.meta.dirname, "..", ".env");
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

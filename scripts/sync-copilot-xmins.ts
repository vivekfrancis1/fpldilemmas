// Validates the local Copilot export and loads it into the database (production, when .env
// points there). Idempotent: a file that has already been loaded (same content hash) is skipped.
// Run automatically by the macOS file watcher in scripts/copilot-sync/, or manually:
//   npx tsx scripts/sync-copilot-xmins.ts
// Exit codes: 0 = loaded or already loaded, 1 = missing/invalid file or database error.
import fs from "fs";
import { COPILOT_XMINS_JSON_PATH, ingestCopilotExport, validateCopilotExport } from "../server/copilot-xmins-ingest";
import { hashCopilotExport } from "../server/copilot-xmins-sync-utils";

(async () => {
  if (!fs.existsSync(COPILOT_XMINS_JSON_PATH)) {
    console.error(`[copilot-sync] No file at ${COPILOT_XMINS_JSON_PATH}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(COPILOT_XMINS_JSON_PATH, "utf-8");
  let data;
  try {
    data = validateCopilotExport(JSON.parse(raw));
  } catch (e) {
    // A half-written file (the bot still saving) lands here — leave the database untouched.
    console.error(`[copilot-sync] Invalid export, nothing loaded: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  const result = await ingestCopilotExport(data, fs.statSync(COPILOT_XMINS_JSON_PATH).mtimeMs, { fileHash: hashCopilotExport(raw) });
  if (result.alreadyLoaded) {
    console.log(`[copilot-sync] Already loaded (export updated ${result.lastUpdated}) — nothing to do.`);
  } else {
    console.log(`[copilot-sync] Loaded ${result.written} rows for GW${result.gameweeks.join(", GW")} (export updated ${result.lastUpdated}).`);
  }
  process.exit(0);
})().catch((e) => {
  console.error("[copilot-sync] FATAL", e);
  process.exit(1);
});

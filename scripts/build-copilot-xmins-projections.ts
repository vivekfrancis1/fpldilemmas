// One-off CLI entrypoint for the shared ingestion logic in server/copilot-xmins-ingest.ts —
// see that file for the actual parsing/upsert. The recurring scheduler
// (server/copilot-xmins-scheduler.ts) calls the same function automatically; this script is
// for manually forcing a re-ingest without waiting for the scheduler's next check.
//
// Usage: npx tsx scripts/build-copilot-xmins-projections.ts
import { ingestCopilotXmins, COPILOT_XMINS_JSON_PATH } from "../server/copilot-xmins-ingest";

(async () => {
  const result = await ingestCopilotXmins();
  if (!result) {
    console.error(`No file found at ${COPILOT_XMINS_JSON_PATH}`);
    process.exit(1);
  }
  console.log(`Gameweeks covered: ${result.gameweeks.join(", ")}`);
  console.log(`Source last updated: ${result.lastUpdated}`);
  console.log(`Wrote ${result.written} rows to copilot_xmins_projections.`);
  process.exit(0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

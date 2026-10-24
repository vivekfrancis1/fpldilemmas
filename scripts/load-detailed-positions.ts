// One-off / occasional load of detailed positions into player_detailed_positions (the server also refreshes them weekly:
// server/detailed-positions-scheduler.ts). The matching and writing live in server/detailed-positions-loader.ts.
//
// Usage (dry run, default):  npx tsx scripts/load-detailed-positions.ts
//        write to the DB:    npx tsx scripts/load-detailed-positions.ts --apply
import { fetchDetailedPositions, writeDetailedPositions } from "../server/detailed-positions-loader";

(async () => {
  const apply = process.argv.includes("--apply");
  const load = await fetchDetailedPositions();
  console.log(`FPL players: ${load.playerCount}; matched: ${load.records.length}; by method: ${JSON.stringify(load.byMethod)}`);
  console.log(`\nOut of position (${load.outOfPosition.length}) — main position outside the FPL position:`);
  for (const { record: r, label } of load.outOfPosition) console.log(`  ${label}: FPL ${r.fplPosition}, plays ${r.mainPositionLabel}${r.otherPositions.length ? ` (also ${r.otherPositions.join(", ")})` : ""}`);
  console.log(`\nUnmatched FPL players: ${load.unmatchedCount} (${load.unmatchedWithMinutes.length} have played minutes)`);
  for (const e of load.unmatchedWithMinutes) console.log(`  ${e.label} — ${e.minutes} min, FPL ${e.fullName}`);

  if (!apply) { console.log("\nDry run only — pass --apply to write the table."); process.exit(0); }
  await writeDetailedPositions(load.records);
  console.log(`\nWrote ${load.records.length} rows to player_detailed_positions.`);
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

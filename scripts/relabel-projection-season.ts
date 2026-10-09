// One-off: projection cache rows written before the season constants were fixed carry the label
// '2025/26' although they hold current-season data. Relabels them to CURRENT_SEASON so the
// readers (which now filter on CURRENT_SEASON) see them immediately, without waiting for a cache
// refresh. Goals/assists projection tables are deliberately excluded — their rows are stale
// pre-season data (last written 2026-07-28); the next cache refresh replaces them wholesale.
//
// Usage (dry run, default):  npx tsx scripts/relabel-projection-season.ts
//        apply:               npx tsx scripts/relabel-projection-season.ts --apply
import { pool } from "../server/db";
import { CURRENT_SEASON } from "../shared/schema";

const TABLES = ["player_minutes_projections", "player_defensive_projections", "team_clean_sheet_projections", "team_projections"];
const OLD = "2025/26";

(async () => {
  const apply = process.argv.includes("--apply");
  for (const table of TABLES) {
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE season = $1`, [OLD]);
    console.log(`${table}: ${rows[0].n} rows labelled ${OLD}`);
    if (apply && rows[0].n > 0) {
      const res = await pool.query(`UPDATE ${table} SET season = $1 WHERE season = $2`, [CURRENT_SEASON, OLD]);
      console.log(`  -> relabelled ${res.rowCount} rows to ${CURRENT_SEASON}`);
    }
  }
  if (!apply) console.log("Dry run only — pass --apply to relabel.");
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

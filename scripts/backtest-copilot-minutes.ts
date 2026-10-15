// Back-tests every stored Copilot snapshot (copilot_xmins_history) against the minutes players
// actually played (gameweek_player_data). Read-only. Only gameweeks that have finished are used.
// For each player-gameweek the LATEST stored forecast is used; exports only cover upcoming
// gameweeks, so that is the last forecast made before the gameweek was played (no hindsight).
//
// Usage: npx tsx scripts/backtest-copilot-minutes.ts
import { pool } from "../server/db";
import { CURRENT_SEASON } from "../shared/schema";
import { summarizeMinutesForecast } from "../server/forecast-backtest";
import { pAtLeast60, pPlays } from "../shared/minutes-model";

(async () => {
  const { rows } = await pool.query(
    `SELECT h.gameweek, h.player_id, h.x_mins AS forecast, a.minutes AS actual
       FROM (
         SELECT DISTINCT ON (player_id, gameweek) player_id, gameweek, x_mins, loaded_at
           FROM copilot_xmins_history WHERE season = $1
          ORDER BY player_id, gameweek, loaded_at DESC
       ) h
       JOIN gameweek_player_data a
         ON a.player_id = h.player_id AND a.gameweek = h.gameweek AND a.season = $1`,
    [CURRENT_SEASON]
  );
  if (rows.length === 0) {
    console.log("No finished gameweeks with a stored Copilot forecast yet — try again after the next gameweek completes.");
    process.exit(0);
  }
  const s = summarizeMinutesForecast(rows.map((r) => ({ forecast: Number(r.forecast), actual: Number(r.actual) })));
  console.log(`Compared ${s.n} player-gameweeks (GW${[...new Set(rows.map((r) => r.gameweek))].sort((a: number, b: number) => a - b).join(", GW")}).`);
  console.log(`Forecast minus actual: bias ${s.bias.toFixed(1)} min, mean abs error ${s.meanAbsError.toFixed(1)} min`);
  console.log("\nBy forecast bucket (realised vs what the calibrated model predicts):");
  for (const b of s.byBucket) {
    if (b.n === 0) continue;
    console.log(`  ${b.label.padEnd(6)} n=${String(b.n).padStart(4)}  forecast ${b.forecastMean.toFixed(1).padStart(5)}  actual ${b.actualMean.toFixed(1).padStart(5)}  P(plays) ${b.actualPPlays.toFixed(2)} (model ${pPlays(b.forecastMean).toFixed(2)})  P(60+) ${b.actualP60.toFixed(2)} (model ${pAtLeast60(b.forecastMean).toFixed(2)})`);
  }
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

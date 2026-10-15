// Scores our stored projection snapshots (projection_snapshots) against the points players
// actually scored (gameweek_player_data), gameweek by gameweek, and — on the same players — against
// Copilot's own xPts (copilot_xmins_history). For each finished gameweek the latest snapshot taken
// BEFORE its deadline is used, so it measures what was known at the time. Read-only.
//
// Usage: npx tsx scripts/backtest-projections.ts
import { pool } from "../server/db";
import { CURRENT_SEASON } from "../shared/schema";
import { latestRunBefore, summarizeProjectionAccuracy } from "../server/projection-backtest";

const f = (x: number, d = 2) => x.toFixed(d);

(async () => {
  const exists = await pool.query(`SELECT to_regclass('projection_snapshot_runs') AS t`);
  if (!exists.rows[0].t) {
    console.log("No projection snapshots yet — they are saved on every Player Total Points refresh in production.");
    process.exit(0);
  }
  const bootstrap: any = await (await fetch("https://fantasy.premierleague.com/api/bootstrap-static/")).json();
  const finished = bootstrap.events.filter((e: any) => e.finished);
  const runs = (await pool.query(`SELECT snapshot_id, taken_at, model_version, start_gameweek FROM projection_snapshot_runs WHERE season = $1`, [CURRENT_SEASON]))
    .rows.map((r: any) => ({ snapshotId: r.snapshot_id, takenAt: new Date(r.taken_at).toISOString(), modelVersion: r.model_version, startGameweek: r.start_gameweek }));
  const copilotTableExists = (await pool.query(`SELECT to_regclass('copilot_xmins_history') AS t`)).rows[0].t;

  let overallOurs: Array<{ projected: number; actual: number }> = [];
  let overallCopilot: Array<{ projected: number; actual: number }> = [];
  let scoredAny = false;

  for (const ev of finished) {
    const run = latestRunBefore(runs, ev.deadline_time);
    if (!run) continue;
    const { rows } = await pool.query(
      `SELECT s.player_id, s.total AS ours, a.total_points AS actual, a.minutes
         FROM projection_snapshots s
         JOIN gameweek_player_data a ON a.player_id = s.player_id AND a.gameweek = s.gameweek AND a.season = $3
        WHERE s.snapshot_id = $1 AND s.gameweek = $2`,
      [run.snapshotId, ev.id, CURRENT_SEASON]
    );
    // Same population every time: players with a meaningful projection or who actually played.
    const pop = rows.filter((r: any) => Number(r.ours) >= 0.5 || Number(r.minutes) > 0);
    if (pop.length === 0) continue;
    scoredAny = true;
    const ours = pop.map((r: any) => ({ projected: Number(r.ours), actual: Number(r.actual) }));
    const s = summarizeProjectionAccuracy(ours);
    overallOurs = overallOurs.concat(ours);

    let copilotLine = "";
    if (copilotTableExists) {
      const cp = await pool.query(
        `SELECT DISTINCT ON (player_id) player_id, x_pts FROM copilot_xmins_history
          WHERE season = $1 AND gameweek = $2 AND x_pts IS NOT NULL AND loaded_at < $3
          ORDER BY player_id, loaded_at DESC`,
        [CURRENT_SEASON, ev.id, ev.deadline_time]
      );
      const cpMap = new Map(cp.rows.map((r: any) => [r.player_id, Number(r.x_pts)]));
      const common = pop.filter((r: any) => cpMap.has(r.player_id));
      if (common.length > 0) {
        const cRows = common.map((r: any) => ({ projected: cpMap.get(r.player_id)!, actual: Number(r.actual) }));
        const oRows = common.map((r: any) => ({ projected: Number(r.ours), actual: Number(r.actual) }));
        overallCopilot = overallCopilot.concat(cRows);
        const cs = summarizeProjectionAccuracy(cRows), os = summarizeProjectionAccuracy(oRows);
        copilotLine = `  | same ${common.length} players: ours MAE ${f(os.meanAbsError)} rho ${f(os.spearman, 3)}  vs  Copilot MAE ${f(cs.meanAbsError)} rho ${f(cs.spearman, 3)}`;
      }
    }
    console.log(`GW${ev.id}  [${run.modelVersion}, snapshot ${run.takenAt.slice(0, 16)}Z]  n=${s.n}  bias ${f(s.bias)}  MAE ${f(s.meanAbsError)}  RMSE ${f(s.rmse)}  rho ${f(s.spearman, 3)}${copilotLine}`);
  }

  if (!scoredAny) {
    console.log("Snapshots exist, but none was taken before the deadline of a finished gameweek yet — try again after the next gameweek completes.");
  } else {
    const o = summarizeProjectionAccuracy(overallOurs);
    console.log(`\nAll finished gameweeks: n=${o.n}  bias ${f(o.bias)}  MAE ${f(o.meanAbsError)}  RMSE ${f(o.rmse)}  rho ${f(o.spearman, 3)}`);
  }
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

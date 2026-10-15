// Saves a snapshot of every Player Total Points aggregation (per player, per gameweek, with the
// component breakdown) so projections can later be scored against what actually happened and
// compared across model versions. Tables are created on demand (no manual schema push).
import { randomUUID } from "crypto";
import { pool } from "./db";
import { CURRENT_SEASON } from "../shared/schema";
import { buildSnapshotRows, snapshotRunsToPrune, modelVersion } from "./projection-snapshot-utils";

const INSERT_CHUNK = 1500; // 15 columns each -> well under Postgres' 65535 parameter limit

export async function ensureProjectionSnapshotTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projection_snapshot_runs (
      snapshot_id text PRIMARY KEY,
      taken_at timestamptz NOT NULL DEFAULT now(),
      model_version text NOT NULL,
      season text NOT NULL,
      start_gameweek integer NOT NULL,
      end_gameweek integer NOT NULL,
      player_count integer NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projection_snapshots (
      snapshot_id text NOT NULL,
      gameweek integer NOT NULL,
      player_id integer NOT NULL,
      total real NOT NULL,
      goals real, assists real, clean_sheets real, minutes real, goals_conceded real,
      yellow_cards real, red_cards real, bonus real, saves real, defensive_contributions real
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS projection_snapshots_snapshot_idx ON projection_snapshots (snapshot_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS projection_snapshots_gw_player_idx ON projection_snapshots (gameweek, player_id)`);
}

export async function saveProjectionSnapshot(
  players: Array<{ playerId: number; gameweekBreakdown: { [gw: string]: any } }>,
  startGameweek: number,
  endGameweek: number
): Promise<string> {
  await ensureProjectionSnapshotTables();
  const rows = buildSnapshotRows(players);
  const snapshotId = randomUUID();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO projection_snapshot_runs (snapshot_id, model_version, season, start_gameweek, end_gameweek, player_count) VALUES ($1, $2, $3, $4, $5, $6)`,
      [snapshotId, modelVersion(), CURRENT_SEASON, startGameweek, endGameweek, players.length]
    );
    for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
      const chunk = rows.slice(start, start + INSERT_CHUNK);
      const values: string[] = [];
      const params: unknown[] = [];
      chunk.forEach((r, i) => {
        const b = i * 14;
        values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},$${b + 12},$${b + 13},$${b + 14})`);
        params.push(snapshotId, r.gameweek, r.playerId, r.total, r.goals, r.assists, r.cleanSheets, r.minutes, r.goalsConceded, r.yellowCards, r.redCards, r.bonus, r.saves, r.defensiveContributions);
      });
      await client.query(
        `INSERT INTO projection_snapshots (snapshot_id, gameweek, player_id, total, goals, assists, clean_sheets, minutes, goals_conceded, yellow_cards, red_cards, bonus, saves, defensive_contributions) VALUES ${values.join(",")}`,
        params
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await pruneProjectionSnapshots();
  return snapshotId;
}

// Keeps all runs from the last 2 days and the latest run of each older day.
export async function pruneProjectionSnapshots(): Promise<number> {
  const { rows } = await pool.query(`SELECT snapshot_id, taken_at FROM projection_snapshot_runs`);
  const ids = snapshotRunsToPrune(rows.map((r) => ({ snapshotId: r.snapshot_id, takenAt: new Date(r.taken_at).toISOString() })));
  if (ids.length === 0) return 0;
  await pool.query(`DELETE FROM projection_snapshots WHERE snapshot_id = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM projection_snapshot_runs WHERE snapshot_id = ANY($1)`, [ids]);
  return ids.length;
}

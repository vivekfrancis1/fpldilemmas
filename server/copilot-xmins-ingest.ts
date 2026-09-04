// Shared ingestion logic for fplcopilot.com's per-gameweek expected-minutes/points export
// (Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json), used both by the
// one-off CLI script (scripts/build-copilot-xmins-projections.ts) and the recurring scheduler
// (server/copilot-xmins-scheduler.ts) that picks up refreshed drops of that file.
import fs from "fs";
import path from "path";
import { pool } from "./db";
import { CURRENT_SEASON } from "../shared/schema";

export const COPILOT_XMINS_JSON_PATH = path.join(
  process.cwd(),
  "Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json",
);

interface CopilotPlayerRow {
  id: number;
  name: string;
  [key: string]: unknown; // GW{n}_xMins / GW{n}_xPts fields, keyed dynamically per gameweek
}

interface CopilotExport {
  source: string;
  current_gw: number;
  gameweeks: number[];
  last_updated: string;
  player_count: number;
  players: CopilotPlayerRow[];
}

export interface CopilotXminsIngestResult {
  written: number;
  gameweeks: number[];
  lastUpdated: string;
  sourceMtimeMs: number;
}

// Returns null when the source file doesn't exist (e.g. not yet dropped by the refresh job) —
// callers should treat that as "nothing to do" rather than an error.
export async function ingestCopilotXmins(): Promise<CopilotXminsIngestResult | null> {
  if (!fs.existsSync(COPILOT_XMINS_JSON_PATH)) return null;

  const stat = fs.statSync(COPILOT_XMINS_JSON_PATH);
  const raw = fs.readFileSync(COPILOT_XMINS_JSON_PATH, "utf-8");
  const data: CopilotExport = JSON.parse(raw);

  const rows: Array<{ playerId: number; gameweek: number; xMins: number; xPts: number | null }> = [];
  for (const player of data.players) {
    for (const gw of data.gameweeks) {
      const xMins = player[`GW${gw}_xMins`];
      const xPts = player[`GW${gw}_xPts`];
      if (typeof xMins !== "number") continue; // no data for this player+gameweek — skip, don't zero it
      rows.push({
        playerId: player.id,
        gameweek: gw,
        xMins,
        xPts: typeof xPts === "number" ? xPts : null,
      });
    }
  }

  await pool.query(
    `DELETE FROM copilot_xmins_projections WHERE season = $1 AND gameweek = ANY($2)`,
    [CURRENT_SEASON, data.gameweeks],
  );

  // Bulk insert via a single multi-row statement — a one-row-at-a-time loop over ~3,700 rows
  // (626 players x 6 gameweeks) took minutes; this takes a fraction of a second.
  if (rows.length > 0) {
    const values: string[] = [];
    const params: unknown[] = [];
    rows.forEach((row, i) => {
      const base = i * 5;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
      params.push(row.playerId, CURRENT_SEASON, row.gameweek, row.xMins, row.xPts);
    });
    await pool.query(
      `INSERT INTO copilot_xmins_projections (player_id, season, gameweek, x_mins, x_pts) VALUES ${values.join(", ")}`,
      params,
    );
  }

  return { written: rows.length, gameweeks: data.gameweeks, lastUpdated: data.last_updated, sourceMtimeMs: stat.mtimeMs };
}

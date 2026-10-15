// Shared ingestion logic for fplcopilot.com's per-gameweek expected-minutes/points export
// (Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json), used both by the
// one-off CLI script (scripts/build-copilot-xmins-projections.ts) and the recurring scheduler
// (server/copilot-xmins-scheduler.ts) that picks up refreshed drops of that file.
import fs from "fs";
import path from "path";
import { pool } from "./db";
import { CURRENT_SEASON } from "../shared/schema";
import { hashCopilotExport } from "./copilot-xmins-sync-utils";

export const COPILOT_XMINS_JSON_PATH = path.join(
  process.cwd(),
  "Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json",
);

interface CopilotPlayerRow {
  id: number;
  name: string;
  [key: string]: unknown; // GW{n}_xMins / GW{n}_xPts fields, keyed dynamically per gameweek
}

export interface CopilotExport {
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

// Reads both export formats: the original `GW6_xMins` and the current `xMins_6`.
export function extractCopilotRows(data: CopilotExport): Array<{ playerId: number; gameweek: number; xMins: number; xPts: number | null }> {
  const rows: Array<{ playerId: number; gameweek: number; xMins: number; xPts: number | null }> = [];
  for (const player of data.players) {
    for (const gw of data.gameweeks) {
      const xMins = player[`xMins_${gw}`] ?? player[`GW${gw}_xMins`];
      const xPts = player[`xPts_${gw}`] ?? player[`GW${gw}_xPts`];
      if (typeof xMins !== "number") continue; // no data for this player+gameweek — skip, don't zero it
      rows.push({ playerId: player.id, gameweek: gw, xMins, xPts: typeof xPts === "number" ? xPts : null });
    }
  }
  return rows;
}

// Throws a descriptive Error if `data` isn't a usable Copilot export — used for uploads, where the
// content comes from a person rather than the scheduler's own file.
export function validateCopilotExport(data: unknown): CopilotExport {
  const d = data as any;
  if (!d || typeof d !== "object") throw new Error("Export must be a JSON object");
  if (!Array.isArray(d.players)) throw new Error("Export is missing a players array");
  if (!Array.isArray(d.gameweeks) || d.gameweeks.length === 0 ||
      !d.gameweeks.every((g: unknown) => Number.isInteger(g) && (g as number) >= 1 && (g as number) <= 38)) {
    throw new Error("Export gameweeks must be a non-empty array of integers 1-38");
  }
  if (!d.players.every((p: any) => p && Number.isInteger(p.id))) throw new Error("Every player needs a numeric id");
  if (extractCopilotRows(d as CopilotExport).length === 0) throw new Error("Export contains no xMins values");
  return d as CopilotExport;
}

// Returns null when the source file doesn't exist (e.g. not yet dropped by the refresh job) —
// callers should treat that as "nothing to do" rather than an error.
export async function ingestCopilotXmins(): Promise<CopilotXminsIngestResult | null> {
  if (!fs.existsSync(COPILOT_XMINS_JSON_PATH)) return null;

  const stat = fs.statSync(COPILOT_XMINS_JSON_PATH);
  const raw = fs.readFileSync(COPILOT_XMINS_JSON_PATH, "utf-8");
  return ingestCopilotExport(JSON.parse(raw), stat.mtimeMs, { fileHash: hashCopilotExport(raw) });
}

// Snapshot history of every distinct export that has been loaded, so forecasts can later be
// back-tested against realised minutes/points. Created on demand so no manual schema push is needed.
export async function ensureCopilotHistoryTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS copilot_xmins_history (
      file_hash text NOT NULL,
      source_last_updated text,
      season text NOT NULL,
      gameweek integer NOT NULL,
      player_id integer NOT NULL,
      x_mins real NOT NULL,
      x_pts real,
      loaded_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS copilot_xmins_history_hash_idx ON copilot_xmins_history (file_hash)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS copilot_xmins_history_player_gw_idx ON copilot_xmins_history (player_id, gameweek)`);
}

export async function isCopilotFileAlreadyLoaded(fileHash: string): Promise<boolean> {
  await ensureCopilotHistoryTable();
  const { rows } = await pool.query(`SELECT 1 FROM copilot_xmins_history WHERE file_hash = $1 LIMIT 1`, [fileHash]);
  return rows.length > 0;
}

const INSERT_CHUNK = 2000; // rows per multi-row INSERT (keeps parameter counts far below Postgres' 65535 limit)

// Writes an already-parsed export to copilot_xmins_projections (replacing the gameweeks it covers)
// and appends a snapshot to copilot_xmins_history, all in one transaction. When `fileHash` is given
// and that exact file was already loaded, nothing is written and `alreadyLoaded` is true.
export async function ingestCopilotExport(
  data: CopilotExport,
  sourceMtimeMs: number,
  opts: { fileHash?: string } = {}
): Promise<CopilotXminsIngestResult & { alreadyLoaded?: boolean }> {
  const rows = extractCopilotRows(data);
  const base = { written: 0, gameweeks: data.gameweeks, lastUpdated: data.last_updated, sourceMtimeMs };

  await ensureCopilotHistoryTable();
  if (opts.fileHash && (await isCopilotFileAlreadyLoaded(opts.fileHash))) return { ...base, alreadyLoaded: true };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM copilot_xmins_projections WHERE season = $1 AND gameweek = ANY($2)`, [CURRENT_SEASON, data.gameweeks]);

    // Bulk multi-row inserts — a one-row-at-a-time loop over ~4,000 rows took minutes.
    for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
      const chunk = rows.slice(start, start + INSERT_CHUNK);
      const values: string[] = [];
      const params: unknown[] = [];
      chunk.forEach((row, i) => {
        const b = i * 5;
        values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`);
        params.push(row.playerId, CURRENT_SEASON, row.gameweek, row.xMins, row.xPts);
      });
      await client.query(
        `INSERT INTO copilot_xmins_projections (player_id, season, gameweek, x_mins, x_pts) VALUES ${values.join(", ")}`,
        params,
      );
    }

    if (opts.fileHash) {
      for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
        const chunk = rows.slice(start, start + INSERT_CHUNK);
        const values: string[] = [];
        const params: unknown[] = [];
        chunk.forEach((row, i) => {
          const b = i * 7;
          values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7})`);
          params.push(opts.fileHash, data.last_updated, CURRENT_SEASON, row.gameweek, row.playerId, row.xMins, row.xPts);
        });
        await client.query(
          `INSERT INTO copilot_xmins_history (file_hash, source_last_updated, season, gameweek, player_id, x_mins, x_pts) VALUES ${values.join(", ")}`,
          params,
        );
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return { ...base, written: rows.length };
}

// Remembers which Copilot load the Minutes / Player Total Points caches were last refreshed for,
// so a server restart or deploy can tell "data loaded but never refreshed" (refresh once) from
// "already refreshed" (do nothing). Single-row table, created on demand.
import { pool } from "./db";

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS copilot_refresh_state (
      id integer PRIMARY KEY DEFAULT 1,
      refreshed_marker timestamptz,
      refreshed_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT copilot_refresh_state_single_row CHECK (id = 1)
    )`);
}

// null = no refresh recorded yet; undefined = state could not be read (caller must not refresh blindly).
export async function loadRefreshedMarker(): Promise<string | null | undefined> {
  try {
    await ensureTable();
    const { rows } = await pool.query(`SELECT refreshed_marker FROM copilot_refresh_state WHERE id = 1`);
    return rows[0]?.refreshed_marker ? new Date(rows[0].refreshed_marker).toISOString() : null;
  } catch (e) {
    console.warn("⚠️ Could not read Copilot refresh state:", (e as Error).message);
    return undefined;
  }
}

export async function saveRefreshedMarker(marker: string): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO copilot_refresh_state (id, refreshed_marker, refreshed_at) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET refreshed_marker = EXCLUDED.refreshed_marker, refreshed_at = now()`,
    [marker]
  );
}

import { pool } from "./db";
import { isRefreshDue, REFRESH_INTERVAL_DAYS } from "../shared/detailed-positions";
import { refreshDetailedPositions } from "./detailed-positions-loader";

/**
 * Keeps player_detailed_positions up to date: once a week it re-reads the clubs' squad pages and updates the table (see
 * server/detailed-positions-loader.ts). The due check uses the table's own last-updated time, so a redeploy or restart does not
 * reset the week. A load that matched much fewer players than the table holds is not written (the source changed or blocked us).
 * Runs in production only (a local server gets its copy from the production data), unless DETAILED_POSITIONS_REFRESH=1.
 * A failure is logged and tried again at the next check; it never stops the server.
 */

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 10 * 60 * 1000;

export class DetailedPositionsScheduler {
  private timeoutId: NodeJS.Timeout | null = null;
  private running = false;

  start(): void {
    if (process.env.NODE_ENV !== "production" && process.env.DETAILED_POSITIONS_REFRESH !== "1") {
      console.log("⏭️ Detailed positions refresh only runs in production (set DETAILED_POSITIONS_REFRESH=1 to force it)");
      return;
    }
    console.log(`🕐 Starting Detailed Positions Scheduler (every ${REFRESH_INTERVAL_DAYS} days, checked every 6h)...`);
    this.timeoutId = setTimeout(() => this.check(), FIRST_CHECK_DELAY_MS);
  }

  stop(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  private async check(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const last = (await pool.query("SELECT max(updated_at) AS last FROM player_detailed_positions")).rows[0]?.last ?? null;
      if (isRefreshDue(last ? new Date(last) : null, new Date())) {
        console.log("🔄 Refreshing detailed positions...");
        const r = await refreshDetailedPositions();
        console.log(r.written
          ? `✓ Detailed positions refreshed: ${r.count} players (table had ${r.existing})`
          : `⚠️ Detailed positions NOT written: the load matched ${r.count} players but the table holds ${r.existing}; leaving it as it is`);
      }
    } catch (error) {
      console.error("Detailed positions refresh failed:", error);
    } finally {
      this.running = false;
      this.timeoutId = setTimeout(() => this.check(), CHECK_EVERY_MS);
    }
  }
}

export const detailedPositionsScheduler = new DetailedPositionsScheduler();

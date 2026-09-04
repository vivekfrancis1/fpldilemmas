// Watches for refreshed drops of Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json
// (an external process — currently a Grok Bot the user runs manually — updates this file about
// twice a week) and re-ingests it into copilot_xmins_projections whenever its mtime changes.
// Checking every few hours rather than twice a week keeps this simple (no cron-day-of-week
// logic) while still picking up a refresh well within the same day it lands.
import fs from "fs";
import { ingestCopilotXmins, COPILOT_XMINS_JSON_PATH } from "./copilot-xmins-ingest";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class CopilotXminsScheduler {
  private interval: NodeJS.Timeout | null = null;
  private lastIngestedMtimeMs: number | null = null;
  private isRunning = false;

  constructor() {
    this.checkAndIngest(); // pick up whatever's already there on startup
    this.interval = setInterval(() => this.checkAndIngest(), CHECK_INTERVAL_MS);
  }

  private async checkAndIngest(): Promise<void> {
    if (this.isRunning) return;
    if (!fs.existsSync(COPILOT_XMINS_JSON_PATH)) return;

    const mtimeMs = fs.statSync(COPILOT_XMINS_JSON_PATH).mtimeMs;
    if (this.lastIngestedMtimeMs !== null && mtimeMs === this.lastIngestedMtimeMs) return; // unchanged since last check

    this.isRunning = true;
    try {
      const result = await ingestCopilotXmins();
      if (result) {
        this.lastIngestedMtimeMs = result.sourceMtimeMs;
        console.log(`🧭 Copilot xMins re-ingested: ${result.written} rows for GW${result.gameweeks.join(", GW")} (source updated ${result.lastUpdated})`);
      }
    } catch (e) {
      console.error("⚠️ Copilot xMins ingestion failed:", e);
    } finally {
      this.isRunning = false;
    }
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}

export const copilotXminsScheduler = new CopilotXminsScheduler();

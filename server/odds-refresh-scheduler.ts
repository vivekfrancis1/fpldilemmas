import { refreshFixtureOdds } from "./odds-service";
import { CURRENT_SEASON } from "@shared/schema";

/**
 * Refreshes fixture odds from The Odds API on a fixed interval, appending a snapshot each time
 * (see server/odds-service.ts) so fixture_odds_snapshots accumulates a time series of how the
 * market moved leading up to kickoff. Cost is 2 credits per refresh (regions=uk, markets=h2h+
 * totals) regardless of how many fixtures come back, so a 4-hour interval (6 refreshes/day,
 * ~12 credits/day) stays well within even the free tier. No-ops entirely when ODDS_API_KEY
 * isn't configured, rather than failing the whole server.
 */

const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class OddsRefreshScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (!process.env.ODDS_API_KEY) {
      console.log("⏭️ ODDS_API_KEY not set, skipping odds refresh scheduler");
      return;
    }

    console.log(`🕐 Starting Odds Refresh Scheduler (every ${REFRESH_INTERVAL_MS / (60 * 60 * 1000)}h)...`);
    this.runRefresh();
    this.intervalId = setInterval(() => this.runRefresh(), REFRESH_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏹️ Odds Refresh Scheduler stopped");
    }
  }

  private async runRefresh(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Odds refresh already running, skipping...");
      return;
    }
    this.isRunning = true;
    try {
      const { fetched, stored } = await refreshFixtureOdds(CURRENT_SEASON);
      console.log(`✅ Odds refresh completed: ${stored}/${fetched} fixtures stored`);
    } catch (error) {
      console.error("❌ Odds refresh failed:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger a refresh (for admin/testing)
   */
  async runNow(): Promise<void> {
    await this.runRefresh();
  }
}

export const oddsRefreshScheduler = new OddsRefreshScheduler();

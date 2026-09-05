import { refreshFixtureOdds } from "./odds-service";
import { internalFetch } from "./config";
import { CURRENT_SEASON } from "@shared/schema";

/**
 * Refreshes fixture odds from The Odds API on a variable interval that tightens as kickoff
 * approaches, appending a snapshot each time (see server/odds-service.ts) so
 * fixture_odds_snapshots accumulates a time series of how the market moved. Cost is 2 credits
 * per refresh (regions=uk, markets=h2h+totals) regardless of how many fixtures come back, so
 * the real cost driver is how many minutes per day are spent at the tightest cadence, not the
 * per-call price.
 *
 * Interval, in priority order (checked against real fixture kickoff/finish state each cycle):
 *   - Any fixture kicking off within the next 4 hours (including one already live — a live match
 *     falls through to the matchday tier below, since in-play odds movement isn't consumed by
 *     anything here: the projection only needs the pre-kickoff consensus, and the odds-movement
 *     chart's value is pre-match drift, not in-play swings): every 15 min.
 *   - Any fixture today (matchday, nothing imminent right now): every 4 hours.
 *   - Otherwise: every 12 hours.
 *
 * A previous "any match live → every 5 min" tier was removed: it applied globally (any one
 * live match anywhere tightened the refresh for the whole board, including fixtures a week
 * out), and burned a large share of the monthly API quota over a single matchday weekend for
 * no consumed benefit.
 *
 * No-ops entirely when ODDS_API_KEY isn't configured, rather than failing the whole server.
 */

const INTERVAL_IMMINENT_MS = 15 * 60 * 1000;
const INTERVAL_MATCHDAY_MS = 4 * 60 * 60 * 1000;
const INTERVAL_DEFAULT_MS = 12 * 60 * 60 * 1000;
const IMMINENT_WINDOW_MS = 4 * 60 * 60 * 1000;

export class OddsRefreshScheduler {
  private timeoutId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (!process.env.ODDS_API_KEY) {
      console.log("⏭️ ODDS_API_KEY not set, skipping odds refresh scheduler");
      return;
    }

    console.log("🕐 Starting Odds Refresh Scheduler (variable interval: 15min imminent / 4h matchday / 12h default)...");
    this.runCycle();
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log("⏹️ Odds Refresh Scheduler stopped");
    }
  }

  /**
   * Determines the next refresh delay from real fixture state, in priority order (imminent >
   * matchday > default). Fixtures without a scheduled kickoff (event: null, i.e. TBC) are
   * skipped — there's nothing to be "imminent" about them yet. A live fixture counts as
   * "matchday" (its own kickoff was today) rather than getting a tighter tier of its own — see
   * the class-level comment for why in-play refreshing isn't worth its API cost.
   */
  private async computeNextDelayMs(): Promise<number> {
    try {
      const response = await internalFetch("api/fixtures");
      if (!response.ok) return INTERVAL_DEFAULT_MS;
      const fixtures: any[] = await response.json();

      const now = Date.now();
      const todayStr = new Date(now).toDateString();
      let hasImminent = false;
      let hasMatchday = false;

      for (const f of fixtures) {
        if (!f.kickoff_time) continue;
        const kickoff = new Date(f.kickoff_time).getTime();
        const msUntilKickoff = kickoff - now;
        if (!f.started && msUntilKickoff > 0 && msUntilKickoff <= IMMINENT_WINDOW_MS) {
          hasImminent = true;
        }
        if (new Date(kickoff).toDateString() === todayStr) {
          hasMatchday = true;
        }
      }

      if (hasImminent) return INTERVAL_IMMINENT_MS;
      if (hasMatchday) return INTERVAL_MATCHDAY_MS;
      return INTERVAL_DEFAULT_MS;
    } catch (error) {
      console.error("⚠️ Odds scheduler failed to compute next interval, falling back to default:", error);
      return INTERVAL_DEFAULT_MS;
    }
  }

  private async runCycle(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Odds refresh already running, skipping...");
    } else {
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

    const delayMs = await this.computeNextDelayMs();
    console.log(`⏰ Next odds refresh in ${Math.round(delayMs / 60000)} minute(s)`);
    this.timeoutId = setTimeout(() => this.runCycle(), delayMs);
  }

  /**
   * Manually trigger a refresh (for admin/testing) — runs once, without rescheduling.
   */
  async runNow(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await refreshFixtureOdds(CURRENT_SEASON);
    } finally {
      this.isRunning = false;
    }
  }
}

export const oddsRefreshScheduler = new OddsRefreshScheduler();

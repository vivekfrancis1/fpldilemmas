import { gameweekCacheService } from "./gameweek-cache-service";

class GameweekCacheScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 2 * 60 * 60 * 1000; // Check every 2 hours

  /**
   * Start the automated gameweek caching scheduler
   */
  start(): void {
    console.log("🔄 Starting gameweek cache scheduler (checks every 2 hours)");
    
    // Initial check on startup
    this.checkAndCacheGameweeks();
    
    // Set up recurring checks
    this.intervalId = setInterval(() => {
      this.checkAndCacheGameweeks();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏹️ Gameweek cache scheduler stopped");
    }
  }

  /**
   * Check for completed gameweeks and cache them automatically
   */
  private async checkAndCacheGameweeks(): Promise<void> {
    try {
      console.log("🔍 Gameweek cache scheduler: Checking for completed gameweeks...");
      await gameweekCacheService.autoCacheCompletedGameweeks();
    } catch (error) {
      console.error("❌ Error in gameweek cache scheduler:", error);
    }
  }

  /**
   * Manual trigger for immediate caching check
   */
  async triggerManualCheck(): Promise<void> {
    console.log("🔄 Manual gameweek cache check triggered");
    await this.checkAndCacheGameweeks();
  }
}

export const gameweekCacheScheduler = new GameweekCacheScheduler();
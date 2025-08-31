import { fplScoringCacheService } from "./fpl-scoring-cache-service";

class FPLScoringCacheScheduler {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private readonly TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  /**
   * Start the scheduler to fetch FPL scoring data twice daily
   */
  start(): void {
    console.log("🕐 Starting FPL Scoring Cache Scheduler (twice daily updates)");
    
    // Run initial cache update
    this.performCacheUpdate();
    
    // Schedule updates every 12 hours
    this.schedulerInterval = setInterval(() => {
      this.performCacheUpdate();
    }, this.TWELVE_HOURS_MS);
    
    console.log("✅ FPL Scoring Cache Scheduler started successfully");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log("🛑 FPL Scoring Cache Scheduler stopped");
    }
  }

  /**
   * Perform the cache update with error handling
   */
  private async performCacheUpdate(): Promise<void> {
    try {
      const startTime = Date.now();
      console.log("🚀 Starting scheduled FPL scoring cache update...");
      
      await fplScoringCacheService.updateAllScoringData();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Scheduled FPL scoring cache update completed in ${duration}ms`);
      
    } catch (error) {
      console.error("❌ Scheduled FPL scoring cache update failed:", error);
      
      // Optionally, you could implement retry logic here
      // For now, we'll just log the error and wait for the next scheduled update
    }
  }

  /**
   * Get the next scheduled update time
   */
  getNextUpdateTime(): Date {
    if (!this.schedulerInterval) {
      return new Date(); // If not scheduled, return current time
    }
    
    return new Date(Date.now() + this.TWELVE_HOURS_MS);
  }

  /**
   * Check if the scheduler is running
   */
  isRunning(): boolean {
    return this.schedulerInterval !== null;
  }
}

// Export singleton instance
export const fplScoringCacheScheduler = new FPLScoringCacheScheduler();
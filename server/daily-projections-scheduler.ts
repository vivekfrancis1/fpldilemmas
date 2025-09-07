import { dailyProjectionsService } from "./daily-projections-job";

/**
 * Daily Projections Scheduler - Runs daily calculations at 3 AM
 * Eliminates timeout issues by pre-calculating all projections
 */

export class DailyProjectionsScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the daily scheduler
   */
  start(): void {
    console.log('🕐 Starting Daily Projections Scheduler with Static Cache (3 AM daily)...');
    
    // Schedule to run daily at 3 AM
    this.scheduleDaily();
    
    // Also run once on startup if no data exists for today
    this.runIfNeeded();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Daily Projections Scheduler stopped');
    }
  }

  /**
   * Schedule the job to run daily at 3 AM
   */
  private scheduleDaily(): void {
    const now = new Date();
    const nextRun = new Date();
    
    // Set to 3 AM today
    nextRun.setHours(3, 0, 0, 0);
    
    // If it's already past 3 AM today, schedule for tomorrow
    if (now >= nextRun) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    const msUntilRun = nextRun.getTime() - now.getTime();
    
    console.log(`⏰ Next daily projections run scheduled for: ${nextRun.toISOString()}`);
    
    this.intervalId = setTimeout(() => {
      this.runDailyJob();
      
      // Schedule next run (24 hours later)
      this.intervalId = setInterval(() => {
        this.runDailyJob();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, msUntilRun);
  }

  /**
   * Run the daily calculations job
   */
  private async runDailyJob(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Daily projections already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Running scheduled daily projections...');
    
    try {
      // Run regular daily projections
      await dailyProjectionsService.runDailyCalculations();
      console.log('✅ Scheduled daily projections completed successfully');
      
      // Pre-calculate static cache ranges for instant access (Option 3)
      console.log('🚀 Starting static cache pre-calculation...');
      const { staticCacheService } = await import('./static-cache-service');
      await staticCacheService.preCalculateAllRanges();
      console.log('✅ Static cache pre-calculation completed');
      
    } catch (error) {
      console.error('❌ Scheduled daily projections failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run projections if no data exists for today (startup check)
   */
  private async runIfNeeded(): Promise<void> {
    try {
      const todayData = await dailyProjectionsService.getTeamProjectionsFromDB();
      
      if (todayData.length === 0) {
        console.log('🔄 No projections data for today, running initial calculation...');
        await this.runDailyJob();
      } else {
        console.log(`✅ Found ${todayData.length} team projections for today`);
      }
    } catch (error) {
      console.error('❌ Error checking existing data:', error);
      // Run anyway to be safe
      await this.runDailyJob();
    }
  }

  /**
   * Manually trigger a calculation (for admin/testing)
   */
  async runNow(): Promise<void> {
    console.log('🔄 Manually triggering daily projections...');
    await this.runDailyJob();
  }
}

// Singleton instance
export const dailyProjectionsScheduler = new DailyProjectionsScheduler();
import { projectionCacheWorker } from './projection-cache-worker';

class ProjectionCacheScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly SCHEDULE_TIMES = [
    { hour: 7, minute: 0 },   // 7:00 AM
    { hour: 19, minute: 0 }   // 7:00 PM
  ];
  
  /**
   * Start the projection cache scheduler
   */
  start(): void {
    console.log('🔄 Starting projection cache scheduler...');
    
    // Run immediately on startup to ensure we have cached data
    this.runCacheUpdate().catch(error => {
      console.error('❌ Initial cache update failed:', error);
    });
    
    // Schedule to check every hour and run at designated times
    this.intervalId = setInterval(() => {
      this.checkAndRunCache();
    }, 60 * 60 * 1000); // Check every hour
    
    console.log('✅ Projection cache scheduler started (runs at 7:00 AM and 7:00 PM daily)');
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Projection cache scheduler stopped');
    }
  }
  
  /**
   * Check if it's time to run and execute if needed
   */
  private checkAndRunCache(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if current time matches any scheduled time (within 1 minute window)
    const shouldRun = this.SCHEDULE_TIMES.some(schedule => 
      currentHour === schedule.hour && currentMinute >= schedule.minute && currentMinute < schedule.minute + 1
    );
    
    if (shouldRun) {
      console.log(`⏰ Scheduled cache update triggered at ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
      this.runCacheUpdate().catch(error => {
        console.error('❌ Scheduled cache update failed:', error);
      });
    }
  }
  
  /**
   * Execute the cache update
   */
  private async runCacheUpdate(): Promise<void> {
    try {
      console.log('🚀 Starting scheduled projection cache update...');
      const startTime = Date.now();
      
      await projectionCacheWorker.cacheAllProjections();
      
      // Get cache statistics
      const stats = await projectionCacheWorker.getCacheStats();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Projection cache update completed in ${Math.round(duration / 1000)}s`);
      console.log(`📊 Cache stats:`, stats);
      
    } catch (error) {
      console.error('❌ Projection cache update failed:', error);
    }
  }
  
  /**
   * Manually trigger cache update (for testing or API endpoint)
   */
  async manualUpdate(): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
      console.log('🔧 Manual projection cache update triggered');
      const startTime = Date.now();
      
      await projectionCacheWorker.cacheAllProjections();
      const stats = await projectionCacheWorker.getCacheStats();
      
      const duration = Date.now() - startTime;
      const message = `Cache updated successfully in ${Math.round(duration / 1000)}s`;
      
      return {
        success: true,
        message,
        stats
      };
      
    } catch (error) {
      console.error('❌ Manual cache update failed:', error);
      return {
        success: false,
        message: `Cache update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Get next scheduled run time
   */
  getNextScheduledRun(): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find next scheduled time today or tomorrow
    for (const schedule of this.SCHEDULE_TIMES) {
      const scheduledTime = new Date(today);
      scheduledTime.setHours(schedule.hour, schedule.minute, 0, 0);
      
      if (scheduledTime > now) {
        return scheduledTime;
      }
    }
    
    // If no more times today, return first time tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(this.SCHEDULE_TIMES[0].hour, this.SCHEDULE_TIMES[0].minute, 0, 0);
    
    return tomorrow;
  }
}

export const projectionCacheScheduler = new ProjectionCacheScheduler();
import { projectionCacheWorker } from './projection-cache-worker';

class ProjectionCacheScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly SCHEDULE_TIMES = [
    { hour: 6, minute: 0 },   // 6:00 AM
    { hour: 12, minute: 0 },  // 12:00 PM
    { hour: 18, minute: 0 },  // 6:00 PM
    { hour: 23, minute: 0 }   // 11:00 PM
  ];
  private readonly HOURLY_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  private lastFullUpdate: Date | null = null;
  
  /**
   * Start the projection cache scheduler with hourly updates
   */
  start(): void {
    console.log('🔄 Starting projection cache scheduler...');
    
    // Run immediately on startup to ensure we have cached data
    this.runCacheUpdate().catch(error => {
      console.error('❌ Initial cache update failed:', error);
    });
    
    // Schedule to run every hour for faster data freshness
    this.intervalId = setInterval(() => {
      this.runHourlyUpdate();
    }, this.HOURLY_UPDATE_INTERVAL);
    
    console.log('✅ Projection cache scheduler started (runs every hour)');
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
   * Run hourly cache updates for faster data freshness
   */
  private runHourlyUpdate(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if it's a scheduled full update time
    const isScheduledTime = this.SCHEDULE_TIMES.some(time => 
      time.hour === currentHour && currentMinute >= time.minute && currentMinute < time.minute + 5
    );
    
    if (isScheduledTime || this.shouldRunFullUpdate()) {
      console.log(`⏰ Full projection cache update triggered at ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
      this.runCacheUpdate(true).catch(error => {
        console.error('❌ Full cache update failed:', error);
      });
    } else {
      console.log(`⏰ Light projection cache update triggered at ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
      this.runCacheUpdate(false).catch(error => {
        console.error('❌ Light cache update failed:', error);
      });
    }
  }
  
  /**
   * Check if we should run a full update (if it's been more than 8 hours)
   */
  private shouldRunFullUpdate(): boolean {
    if (!this.lastFullUpdate) return true;
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    return this.lastFullUpdate < eightHoursAgo;
  }
  
  /**
   * Execute the cache update
   */
  private async runCacheUpdate(fullUpdate: boolean = true): Promise<void> {
    try {
      const updateType = fullUpdate ? 'full' : 'light';
      console.log(`🚀 Starting scheduled ${updateType} projection cache update...`);
      const startTime = Date.now();
      
      if (fullUpdate) {
        await projectionCacheWorker.cacheAllProjections();
        this.lastFullUpdate = new Date();
      } else {
        // Light update: only update the most critical cached data
        await projectionCacheWorker.cacheEssentialProjections();
      }
      
      // Get cache statistics
      const stats = await projectionCacheWorker.getCacheStats();
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${updateType} projection cache update completed in ${Math.round(duration / 1000)}s`);
      console.log(`📊 Cache stats:`, stats);
      
    } catch (error) {
      console.error(`❌ Projection cache update failed:`, error);
      // If full update fails, try light update as fallback
      if (fullUpdate) {
        console.log('🔄 Attempting light update as fallback...');
        try {
          await projectionCacheWorker.cacheEssentialProjections();
          console.log('✅ Fallback light update completed');
        } catch (fallbackError) {
          console.error('❌ Fallback update also failed:', fallbackError);
        }
      }
    }
  }
  
  /**
   * Manually trigger cache update (for testing or API endpoint)
   */
  async manualUpdate(): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      console.log('🔧 Manual projection cache update triggered');
      await this.runCacheUpdate(true);
      return {
        success: true,
        message: 'Manual cache update completed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Manual cache update failed:', error);
      return {
        success: false,
        message: `Manual cache update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
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
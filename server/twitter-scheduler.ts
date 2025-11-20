import { twitterService } from "./services/twitterService";
import { storage } from "./storage";

// IST timezone offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/**
 * Daily Twitter scheduler that posts price changes at 7 AM IST
 */
export class TwitterScheduler {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    // Don't auto-start, let server.ts control when to start
  }

  start() {
    const now = Date.now();
    const istNow = new Date(now + IST_OFFSET);
    const sevenAMToday = new Date(istNow);
    sevenAMToday.setHours(7, 0, 0, 0);
    
    const isAfter7AMToday = istNow.getTime() >= sevenAMToday.getTime();
    
    // If we're past 7 AM IST today, run immediately then schedule for tomorrow
    if (isAfter7AMToday) {
      console.log('🚀 Server started after 7 AM IST - running Twitter post immediately');
      this.postDailyPriceChanges().then(() => {
        console.log('✅ Immediate Twitter post completed');
      }).catch(err => {
        console.error('❌ Immediate Twitter post failed:', err);
      });
    }
    
    // Schedule next run (tomorrow at 7 AM IST)
    const nextRun = this.getNext7AMIST();
    const timeUntilRun = nextRun.getTime() - Date.now();
    
    console.log(`Next scheduled Twitter post: ${nextRun.toISOString()} (IST 7:00 AM) - in ${Math.round(timeUntilRun / 1000 / 60 / 60)} hours`);
    
    // Set initial timeout for next scheduled run
    setTimeout(() => {
      this.postDailyPriceChanges();
      
      // Then set daily interval (24 hours)
      this.interval = setInterval(() => {
        this.postDailyPriceChanges();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilRun);
  }

  private getNext7AMIST(): Date {
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    
    // Create target time: 7:00 AM IST today
    const target = new Date(istNow);
    target.setHours(7, 0, 0, 0);
    
    // If we've already passed 7:00 AM IST today, schedule for tomorrow
    if (istNow.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    
    // Convert back to UTC
    return new Date(target.getTime() - IST_OFFSET);
  }

  async postDailyPriceChanges(): Promise<void> {
    if (this.isRunning) {
      console.log("Twitter posting already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log("🐦 Starting daily Twitter price changes post at", new Date().toISOString());
      
      // Get today's price changes
      const todayChanges = await this.getTodaysPriceChanges();
      
      if (todayChanges.risers.length === 0 && todayChanges.fallers.length === 0) {
        console.log("ℹ️ No price changes today - skipping Twitter post");
        return;
      }
      
      console.log(`📊 Found ${todayChanges.risers.length} risers and ${todayChanges.fallers.length} fallers`);
      
      // Format date
      const date = new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      
      // Post tweets
      await twitterService.postPriceChangeTweets(todayChanges, date);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Twitter posting complete in ${duration.toFixed(2)}s`);
      
    } catch (error) {
      console.error("❌ Error during Twitter posting:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async getTodaysPriceChanges() {
    try {
      // Get all recent price changes (last 100)
      const allChanges = await storage.getPriceChanges(100);
      
      console.log(`📊 Retrieved ${allChanges.length} price changes from storage`);
      if (allChanges.length > 0) {
        console.log(`🔍 Sample change:`, {
          playerName: allChanges[0].playerName,
          oldPrice: allChanges[0].oldPrice,
          newPrice: allChanges[0].newPrice,
          priceChange: allChanges[0].priceChange,
          ownership: allChanges[0].ownership,
          changeDate: allChanges[0].changeDate
        });
      }
      
      // Get today's date in UTC (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter for today's changes only
      const todayChanges = allChanges.filter(change => {
        const changeDate = new Date(change.changeDate);
        changeDate.setHours(0, 0, 0, 0);
        return changeDate.getTime() === today.getTime();
      });
      
      console.log(`📅 Found ${todayChanges.length} changes for today`);
      
      // Separate into risers and fallers with validation
      const risers = todayChanges
        .filter(change => change.priceChange > 0)
        .map(change => {
          // Validate data before mapping (allow 0 ownership and 0 price)
          if (change.oldPrice == null || change.newPrice == null || change.ownership == null) {
            console.warn(`⚠️ Invalid data for ${change.playerName}:`, change);
            return null;
          }
          
          return {
            player_name: change.playerName,
            new_price: change.newPrice / 10, // Convert to actual price (stored as 10x)
            old_price: change.oldPrice / 10,
            ownership: typeof change.ownership === 'string' ? parseFloat(change.ownership) : change.ownership
          };
        })
        .filter((change): change is NonNullable<typeof change> => change !== null);
      
      const fallers = todayChanges
        .filter(change => change.priceChange < 0)
        .map(change => {
          // Validate data before mapping (allow 0 ownership and 0 price)
          if (change.oldPrice == null || change.newPrice == null || change.ownership == null) {
            console.warn(`⚠️ Invalid data for ${change.playerName}:`, change);
            return null;
          }
          
          return {
            player_name: change.playerName,
            new_price: change.newPrice / 10,
            old_price: change.oldPrice / 10,
            ownership: typeof change.ownership === 'string' ? parseFloat(change.ownership) : change.ownership
          };
        })
        .filter((change): change is NonNullable<typeof change> => change !== null);
      
      console.log(`✅ Processed ${risers.length} risers and ${fallers.length} fallers`);
      
      return { risers, fallers };
    } catch (error) {
      console.error("Error fetching today's price changes:", error);
      return { risers: [], fallers: [] };
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualPost(): Promise<void> {
    console.log("Manual Twitter post triggered");
    await this.postDailyPriceChanges();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("Twitter scheduler stopped");
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; nextRun: string } {
    const nextRun = this.getNext7AMIST();
    return {
      isRunning: this.isRunning,
      nextRun: nextRun.toISOString()
    };
  }
}

// Export singleton instance
export const twitterScheduler = new TwitterScheduler();

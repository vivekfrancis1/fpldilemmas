import { storage } from "./storage";

// IST timezone offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Daily price data fetcher that runs at 7:30 AM IST
 * Fetches all player data and stores prices, ownership, and transfer data
 */
export class PriceScheduler {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.startScheduler();
  }

  private startScheduler() {
    // Calculate time until next scheduled run (twice daily)
    const nextRun = this.getNextScheduledRun();
    const timeUntilRun = nextRun.getTime() - Date.now();
    
    console.log(`Next price data fetch scheduled for: ${nextRun.toISOString()}`);
    
    // Set initial timeout
    setTimeout(() => {
      this.fetchAndStorePriceData();
      
      // Then set interval for every 12 hours (twice daily)
      this.interval = setInterval(() => {
        this.fetchAndStorePriceData();
      }, 12 * 60 * 60 * 1000); // 12 hours
    }, timeUntilRun);
  }

  private getNextScheduledRun(): Date {
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    
    // Schedule times: 7:05 AM and 7:05 PM IST
    const scheduleTimes = [
      { hour: 7, minute: 5 },   // 7:05 AM
      { hour: 19, minute: 5 }   // 7:05 PM
    ];
    
    // Find next scheduled time today
    for (const time of scheduleTimes) {
      const target = new Date(istNow);
      target.setHours(time.hour, time.minute, 0, 0);
      
      if (istNow.getTime() < target.getTime()) {
        // Convert back to UTC
        return new Date(target.getTime() - IST_OFFSET);
      }
    }
    
    // If no more times today, return first time tomorrow
    const tomorrow = new Date(istNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(scheduleTimes[0].hour, scheduleTimes[0].minute, 0, 0);
    
    // Convert back to UTC
    return new Date(tomorrow.getTime() - IST_OFFSET);
  }

  private getNext705AMIST(): Date {
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    
    // Create target time: 7:05 AM IST today
    const target = new Date(istNow);
    target.setHours(7, 5, 0, 0);
    
    // If we've already passed 7:05 AM IST today, schedule for tomorrow
    if (istNow.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    
    // Convert back to UTC
    return new Date(target.getTime() - IST_OFFSET);
  }

  async fetchAndStorePriceData(): Promise<void> {
    if (this.isRunning) {
      console.log("Price data fetch already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log("🚀 Starting daily price data fetch at", new Date().toISOString());
      
      // Fetch bootstrap data from FPL API
      const response = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
      if (!response.ok) {
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const bootstrapData = await response.json();
      const players = bootstrapData.elements;
      const teams = bootstrapData.teams;
      const positions = bootstrapData.element_types;
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const dailyRecords = [];
      const currentPlayerPrices = [];
      
      for (const player of players) {
        // Get previous day's data to calculate daily transfers
        const latestData = await storage.getLatestPriceData(player.id);
        
        const currentTransfersIn = player.transfers_in || 0;
        const currentTransfersOut = player.transfers_out || 0;
        
        let dailyTransfersIn = 0;
        let dailyTransfersOut = 0;
        
        if (latestData) {
          dailyTransfersIn = Math.max(0, currentTransfersIn - latestData.totalTransfersIn);
          dailyTransfersOut = Math.max(0, currentTransfersOut - latestData.totalTransfersOut);
        }
        
        const team = teams.find((t: any) => t.id === player.team);
        const position = positions.find((p: any) => p.id === player.element_type);
        
        const record = {
          playerId: player.id,
          playerName: player.web_name,
          recordDate: today,
          originalPrice: player.now_cost - (player.cost_change_start || 0), // Start of season price
          currentPrice: player.now_cost,
          ownership: player.selected_by_percent || "0",
          totalTransfersIn: currentTransfersIn,
          totalTransfersOut: currentTransfersOut,
          dailyTransfersIn,
          dailyTransfersOut,
          priceChangeEvent: player.cost_change_event || 0,
          teamId: team?.id,
          position: position?.singular_name_short,
        };
        
        dailyRecords.push(record);
        
        // Track player data for price change detection
        currentPlayerPrices.push({
          playerId: player.id,
          price: player.now_cost,
          playerName: player.web_name,
          teamId: team?.id,
          teamName: team?.short_name,
          position: position?.singular_name_short,
          ownership: parseFloat(player.selected_by_percent || "0"),
          transfersIn: player.transfers_in || 0, // Season total transfers
          transfersOut: player.transfers_out || 0, // Season total transfers
          transfersInGw: player.transfers_in_event || 0, // Gameweek transfers
          transfersOutGw: player.transfers_out_event || 0, // Gameweek transfers
          totalSeasonChange: player.cost_change_start || 0,
          costChangeEvent: player.cost_change_event || 0 // Today's price change
        });
      }
      
      // Save all daily records to database
      await storage.saveDailyPriceData(dailyRecords);
      
      // Detect and store actual price changes (only rises/falls from tomorrow)
      console.log("🔍 Detecting actual price changes from previous day...");
      const priceChanges = await storage.detectPriceChanges(currentPlayerPrices);
      
      if (priceChanges.length > 0) {
        console.log(`💰 Found ${priceChanges.length} actual price changes, storing them...`);
        for (const change of priceChanges) {
          await storage.addPriceChange(change);
        }
        console.log(`✅ Successfully stored ${priceChanges.length} price changes`);
      } else {
        console.log("📊 No actual price changes detected since yesterday");
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Daily fetch complete: ${dailyRecords.length} players, ${priceChanges.length} price changes in ${duration.toFixed(2)}s`);
      
    } catch (error) {
      console.error("❌ Error fetching daily price data:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual trigger for testing or immediate data fetch
   */
  async triggerManualFetch(): Promise<void> {
    console.log("Manual price data fetch triggered");
    await this.fetchAndStorePriceData();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("Price scheduler stopped");
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; nextRun: string } {
    const nextRun = this.getNext705AMIST();
    return {
      isRunning: this.isRunning,
      nextRun: nextRun.toISOString()
    };
  }
}

// Export singleton instance
export const priceScheduler = new PriceScheduler();
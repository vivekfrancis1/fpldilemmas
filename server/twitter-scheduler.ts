import { twitterService } from "./services/twitterService";
import { storage } from "./storage";

// IST timezone offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/**
 * Daily Twitter scheduler that posts price changes at 7:05 AM IST
 * (5 minutes after FPL updates prices at 7:00 AM IST)
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
    const sevenO5AMToday = new Date(istNow);
    sevenO5AMToday.setHours(7, 5, 0, 0);
    
    const isAfter705AMToday = istNow.getTime() >= sevenO5AMToday.getTime();
    
    // If we're past 7:05 AM IST today, run immediately then schedule for tomorrow
    if (isAfter705AMToday) {
      const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
      console.log(`🚀 Server started after 7:05 AM IST (current IST time: ${istTime}) - running Twitter post immediately`);
      this.postDailyPriceChanges().then(() => {
        console.log('✅ Immediate Twitter post completed successfully');
      }).catch(err => {
        console.error('❌ Immediate Twitter post failed:', err.message || err);
        console.error('Full error:', err);
      });
    }
    
    // Schedule next run (tomorrow at 7:05 AM IST)
    const nextRun = this.getNext705AMIST();
    const timeUntilRun = nextRun.getTime() - Date.now();
    
    console.log(`⏰ Next scheduled Twitter post: ${nextRun.toISOString()} (IST 7:05 AM) - in ${Math.round(timeUntilRun / 1000 / 60 / 60)} hours`);
    
    // Set initial timeout for next scheduled run
    setTimeout(() => {
      this.postDailyPriceChanges();
      
      // Then set daily interval (24 hours)
      this.interval = setInterval(() => {
        this.postDailyPriceChanges();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilRun);
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

  async postDailyPriceChanges(): Promise<void> {
    if (this.isRunning) {
      console.log("Twitter posting already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log("🐦 Starting daily Twitter price changes post at", new Date().toISOString());
      
      // First, refresh price changes from FPL API
      console.log("🔄 Refreshing price changes from FPL API...");
      await this.refreshPricesFromFPL();
      
      // Get today's price changes
      const todayChanges = await this.getTodaysPriceChanges();
      
      if (todayChanges.risers.length === 0 && todayChanges.fallers.length === 0) {
        console.log("ℹ️ No price changes today - skipping Twitter post");
        return;
      }
      
      console.log(`📊 Found ${todayChanges.risers.length} risers and ${todayChanges.fallers.length} fallers`);
      if (todayChanges.risers.length > 0) {
        console.log(`📈 Top 3 risers:`, todayChanges.risers.slice(0, 3).map(r => `${r.player_name} (${r.team_name})`));
      }
      if (todayChanges.fallers.length > 0) {
        console.log(`📉 Top 3 fallers:`, todayChanges.fallers.slice(0, 3).map(f => `${f.player_name} (${f.team_name})`));
      }
      
      // Format date
      const date = new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      
      console.log(`📅 Posting tweets for date: ${date}`);
      
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

  private async refreshPricesFromFPL(): Promise<void> {
    try {
      // Fetch fresh bootstrap data from FPL API
      const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (!response.ok) {
        throw new Error(`Failed to fetch FPL bootstrap data: ${response.status}`);
      }
      
      const data = await response.json();
      const players = data.elements || [];
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      
      console.log(`📊 Fetched ${players.length} players from FPL API`);
      
      // For each player, check if price has changed and store it
      for (const player of players) {
        const existingChanges = await storage.getPriceChanges(100);
        const lastChange = existingChanges.find(c => c.playerId === player.id);
        
        // If we have a last price and it's different from current price
        if (lastChange) {
          const currentPrice = player.now_cost;
          const lastPrice = lastChange.newPrice;
          
          if (currentPrice !== lastPrice) {
            const priceChange = currentPrice - lastPrice;
            
            // Add new price change record
            await storage.addPriceChange({
              playerId: player.id,
              playerName: player.web_name,
              teamId: player.team,
              teamName: data.teams.find((t: any) => t.id === player.team)?.name || 'N/A',
              position: this.getPositionName(player.element_type),
              oldPrice: lastPrice,
              newPrice: currentPrice,
              priceChange: priceChange,
              changeDate: todayDateStr,
              ownership: player.selected_by_percent || '0',
              transfersIn: player.transfers_in || 0,
              transfersOut: player.transfers_out || 0,
              transfersInGw: player.transfers_in_event || 0,
              transfersOutGw: player.transfers_out_event || 0,
              totalSeasonChange: 0
            });
            
            console.log(`📈 Recorded price change for ${player.web_name}: ${lastPrice} → ${currentPrice}`);
          }
        }
      }
      
      console.log("✅ Price refresh from FPL API completed");
    } catch (error) {
      console.error("⚠️ Error refreshing prices from FPL API:", error);
      // Continue anyway - we'll use whatever prices we have
    }
  }

  private getPositionName(elementType: number): string {
    const positions: Record<number, string> = {
      1: 'GKP',
      2: 'DEF',
      3: 'MID',
      4: 'FWD'
    };
    return positions[elementType] || 'N/A';
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
            team_name: change.teamName || 'N/A',
            position: change.position || 'N/A',
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
            team_name: change.teamName || 'N/A',
            position: change.position || 'N/A',
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
    const nextRun = this.getNext705AMIST();
    return {
      isRunning: this.isRunning,
      nextRun: nextRun.toISOString()
    };
  }
}

// Export singleton instance
export const twitterScheduler = new TwitterScheduler();

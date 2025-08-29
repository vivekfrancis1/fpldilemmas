import { storage } from "./storage";

// IST timezone offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Daily price split worker that runs at 8:30 AM IST
 * Checks for any 0.2 price changes and splits them into two 0.1 changes
 */
export class PriceSplitWorker {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.startWorker();
  }

  private startWorker() {
    // Calculate time until next 8:30 AM IST
    const nextRun = this.getNext830AMIST();
    const timeUntilRun = nextRun.getTime() - Date.now();
    
    console.log(`Next price split check scheduled for: ${nextRun.toISOString()} (IST 8:30 AM)`);
    
    // Set initial timeout
    setTimeout(() => {
      this.checkAndSplitPriceChanges();
      
      // Then set daily interval (24 hours)
      this.interval = setInterval(() => {
        this.checkAndSplitPriceChanges();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilRun);
  }

  private getNext830AMIST(): Date {
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    
    // Create target time: 8:30 AM IST today
    const target = new Date(istNow);
    target.setHours(8, 30, 0, 0);
    
    // If we've already passed 8:30 AM IST today, schedule for tomorrow
    if (istNow.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    
    // Convert back to UTC
    return new Date(target.getTime() - IST_OFFSET);
  }

  async checkAndSplitPriceChanges(): Promise<void> {
    if (this.isRunning) {
      console.log("Price split check already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log("🔍 Starting daily price split check at", new Date().toISOString());
      
      // Get all price changes from database
      const allPriceChanges = await storage.getPriceChanges(1000);
      
      // Find any 0.2 changes (price_change = ±2)
      const twoPointChanges = allPriceChanges.filter(change => Math.abs(change.priceChange) === 2);
      
      if (twoPointChanges.length === 0) {
        console.log("✅ No 0.2 price changes found - all changes are properly split");
        return;
      }
      
      console.log(`🔄 Found ${twoPointChanges.length} price changes of 0.2 that need splitting`);
      
      for (const change of twoPointChanges) {
        await this.splitSinglePriceChange(change);
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Price split check complete: processed ${twoPointChanges.length} splits in ${duration.toFixed(2)}s`);
      
    } catch (error) {
      console.error("❌ Error during price split check:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async splitSinglePriceChange(originalChange: any): Promise<void> {
    try {
      const direction = originalChange.priceChange > 0 ? 1 : -1;
      const midPrice = originalChange.oldPrice + direction;
      
      console.log(`🔄 Splitting ${originalChange.playerName}: ${originalChange.oldPrice} → ${originalChange.newPrice} (change: ${originalChange.priceChange})`);
      
      // Remove the original 0.2 change
      await storage.removePriceChange(originalChange.id);
      
      // Add first 0.1 change
      const firstChange = {
        playerId: originalChange.playerId,
        playerName: originalChange.playerName,
        teamId: originalChange.teamId,
        teamName: originalChange.teamName,
        position: originalChange.position,
        oldPrice: originalChange.oldPrice,
        newPrice: midPrice,
        priceChange: direction,
        changeDate: originalChange.changeDate,
        ownership: originalChange.ownership,
        transfersIn: originalChange.transfersIn,
        transfersOut: originalChange.transfersOut,
        transfersInGw: originalChange.transfersInGw,
        transfersOutGw: originalChange.transfersOutGw,
        totalSeasonChange: originalChange.totalSeasonChange
      };
      
      await storage.addPriceChange(firstChange);
      
      // Add second 0.1 change
      const secondChange = {
        ...firstChange,
        oldPrice: midPrice,
        newPrice: originalChange.newPrice
      };
      
      await storage.addPriceChange(secondChange);
      
      console.log(`✅ Split complete: ${originalChange.playerName} (${originalChange.oldPrice} → ${midPrice} → ${originalChange.newPrice})`);
      
    } catch (error) {
      console.error(`❌ Error splitting price change for ${originalChange.playerName}:`, error);
    }
  }

  /**
   * Manual trigger for testing or immediate split check
   */
  async triggerManualSplitCheck(): Promise<void> {
    console.log("Manual price split check triggered");
    await this.checkAndSplitPriceChanges();
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("Price split worker stopped");
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; nextRun: string } {
    const nextRun = this.getNext830AMIST();
    return {
      isRunning: this.isRunning,
      nextRun: nextRun.toISOString()
    };
  }
}

// Export singleton instance
export const priceSplitWorker = new PriceSplitWorker();
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
      
      // Get all price changes from database table
      const allPriceChanges = await storage.getPriceChanges(1000);
      
      // Find any multi-step changes (abs > 1) — FPL prices can only change 0.1m per day
      const multiStepChanges = allPriceChanges.filter(change => Math.abs(change.priceChange) > 1);
      
      if (multiStepChanges.length === 0) {
        console.log("✅ No multi-step price changes found — all changes are properly split into 0.1m increments");
        return;
      }
      
      console.log(`🔄 Found ${multiStepChanges.length} records with multi-step price changes that need splitting`);
      
      for (const change of multiStepChanges) {
        await this.splitSinglePriceChange(change);
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Price split check complete: split ${multiStepChanges.length} records in ${duration.toFixed(2)}s`);
      
    } catch (error) {
      console.error("❌ Error during price split check:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Splits a multi-step price change into individual 0.1m (±1 in tenths) daily records.
   * Dates are spread backwards from the original changeDate so the most recent change
   * retains the original date and earlier changes get prior days.
   * e.g. a +3 change on Apr 13 becomes: Apr 11 +1, Apr 12 +1, Apr 13 +1
   */
  private async splitSinglePriceChange(originalChange: any): Promise<void> {
    try {
      const direction = originalChange.priceChange > 0 ? 1 : -1;
      const steps = Math.abs(originalChange.priceChange);
      
      console.log(`🔄 Splitting: ${originalChange.playerName} ${originalChange.oldPrice} → ${originalChange.newPrice} (${originalChange.priceChange}) into ${steps} × ${direction > 0 ? '+' : '-'}0.1m changes`);
      
      // Remove the original multi-step record
      await storage.removePriceChange(originalChange.id);
      console.log(`🗑️ Removed original record for ${originalChange.playerName}`);
      
      // Parse the original changeDate so we can offset days
      const baseDate = new Date(originalChange.changeDate);
      
      // Generate N individual ±1 records, oldest first
      // The most recent (last) entry uses the original changeDate; earlier entries go back 1 day each
      for (let i = 0; i < steps; i++) {
        const stepOldPrice = originalChange.oldPrice + direction * i;
        const stepNewPrice = stepOldPrice + direction;
        
        // Offset: step 0 is (steps-1) days before changeDate; last step is changeDate itself
        const dayOffset = -(steps - 1 - i);
        const stepDate = new Date(baseDate);
        stepDate.setDate(stepDate.getDate() + dayOffset);
        const stepDateStr = stepDate.toISOString().split('T')[0];
        
        const stepChange = {
          playerId: originalChange.playerId,
          playerName: originalChange.playerName,
          teamId: originalChange.teamId,
          teamName: originalChange.teamName,
          position: originalChange.position,
          oldPrice: stepOldPrice,
          newPrice: stepNewPrice,
          priceChange: direction,
          changeDate: stepDateStr,
          ownership: originalChange.ownership,
          transfersIn: originalChange.transfersIn,
          transfersOut: originalChange.transfersOut,
          transfersInGw: originalChange.transfersInGw,
          transfersOutGw: originalChange.transfersOutGw,
          totalSeasonChange: originalChange.totalSeasonChange
        };
        
        await storage.addPriceChange(stepChange);
        console.log(`➕ Added step ${i + 1}/${steps}: ${originalChange.playerName} ${stepOldPrice} → ${stepNewPrice} on ${stepDateStr}`);
      }
      
      console.log(`✅ Split complete: ${originalChange.playerName} (${originalChange.oldPrice} → ${originalChange.newPrice}) → ${steps} daily records`);
      
    } catch (error) {
      console.error(`❌ Error splitting record for ${originalChange.playerName}:`, error);
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
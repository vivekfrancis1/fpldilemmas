/**
 * Production Cache Initializer
 * Ensures critical cache data is populated when starting in production
 * This runs immediately on startup to prevent slow loading times
 */

import { db } from "./db";
import { playerGoalsProjections, playerAssistProjections, playerMinutesProjections } from "@shared/schema";
import { internalFetch } from "./config";
import { sql } from "drizzle-orm";

export class ProductionCacheInitializer {
  private readonly INITIALIZATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes max
  
  /**
   * Initialize critical cache data for production
   */
  async initializeProductionCache(): Promise<void> {
    console.log("🚀 Starting production cache initialization...");
    
    try {
      // Set overall timeout for initialization
      const initPromise = this.performInitialization();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Cache initialization timeout")), this.INITIALIZATION_TIMEOUT);
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log("✅ Production cache initialization completed successfully");
      
    } catch (error) {
      console.error("❌ Production cache initialization failed:", error);
      console.log("⚠️ Application will continue with slower initial loading times");
      // Don't throw - let the app start anyway
    }
  }
  
  private async performInitialization(): Promise<void> {
    // Check which caches need population
    const cacheStatus = await this.checkCacheStatus();
    
    if (cacheStatus.needsInitialization) {
      console.log("📊 Cache tables are empty or stale - populating essential data...");
      
      // Populate caches in parallel for speed, but with priorities
      const essentialCaches = [];
      
      if (cacheStatus.goalsEmpty) {
        essentialCaches.push(this.populateGoalsCache());
      }
      
      if (cacheStatus.assistsEmpty) {
        essentialCaches.push(this.populateAssistsCache());
      }
      
      if (cacheStatus.minutesEmpty) {
        essentialCaches.push(this.populateMinutesCache());
      }
      
      // Wait for essential caches to complete
      if (essentialCaches.length > 0) {
        await Promise.allSettled(essentialCaches);
        console.log("🎯 Essential cache population completed");
      }
    } else {
      console.log("✅ Cache data already present - skipping initialization");
    }
  }
  
  private async checkCacheStatus(): Promise<{
    needsInitialization: boolean;
    goalsEmpty: boolean;
    assistsEmpty: boolean;
    minutesEmpty: boolean;
  }> {
    try {
      const [goalsCount, assistsCount, minutesCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(playerGoalsProjections),
        db.select({ count: sql<number>`count(*)` }).from(playerAssistProjections),
        db.select({ count: sql<number>`count(*)` }).from(playerMinutesProjections)
      ]);
      
      const goalsEmpty = (goalsCount[0]?.count || 0) < 100;
      const assistsEmpty = (assistsCount[0]?.count || 0) < 100;
      const minutesEmpty = (minutesCount[0]?.count || 0) < 100;
      
      console.log(`📊 Cache status - Goals: ${goalsCount[0]?.count || 0}, Assists: ${assistsCount[0]?.count || 0}, Minutes: ${minutesCount[0]?.count || 0}`);
      
      return {
        needsInitialization: goalsEmpty || assistsEmpty || minutesEmpty,
        goalsEmpty,
        assistsEmpty,
        minutesEmpty
      };
    } catch (error) {
      console.error("Error checking cache status:", error);
      return {
        needsInitialization: true,
        goalsEmpty: true,
        assistsEmpty: true,
        minutesEmpty: true
      };
    }
  }
  
  private async populateGoalsCache(): Promise<void> {
    try {
      console.log("⚽ Populating goals cache...");
      const response = await internalFetch("api/player-goals-scored-projections");
      if (response.ok) {
        console.log("✅ Goals cache populated");
      } else {
        throw new Error(`Goals API failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to populate goals cache:", error);
    }
  }
  
  private async populateAssistsCache(): Promise<void> {
    try {
      console.log("🎯 Populating assists cache...");
      const response = await internalFetch("api/player-assist-projections");
      if (response.ok) {
        console.log("✅ Assists cache populated");
      } else {
        throw new Error(`Assists API failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to populate assists cache:", error);
    }
  }
  
  private async populateMinutesCache(): Promise<void> {
    try {
      console.log("⏱️ Populating minutes cache...");
      const response = await internalFetch("api/player-minutes-projections");
      if (response.ok) {
        console.log("✅ Minutes cache populated");
      } else {
        throw new Error(`Minutes API failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to populate minutes cache:", error);
    }
  }
}

// Create singleton instance
export const productionCacheInitializer = new ProductionCacheInitializer();
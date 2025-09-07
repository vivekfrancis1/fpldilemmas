import { db } from "./db";
import { cachedHistoricalData } from "@shared/schema";
import { storage } from "./storage";
import { eq } from "drizzle-orm";

/**
 * Service to manage pre-computed 2024/25 historical data cache
 * Eliminates expensive database lookups on every goal/assist share request
 */
export class HistoricalCacheService {
  
  /**
   * Pre-populate the 2024/25 cache from existing historical data
   */
  async populateCache(): Promise<void> {
    try {
      console.log(`📊 Pre-populating 2024/25 historical data cache...`);
      
      // Fetch 2024/25 data from storage
      const historical2024Data = await storage.getHistoricalPlayers("2024/25");
      
      if (!historical2024Data || historical2024Data.length === 0) {
        console.log(`⚠️ No 2024/25 data found, skipping cache population`);
        return;
      }
      
      console.log(`📥 Found ${historical2024Data.length} players in 2024/25 data`);
      
      // Clear existing cache
      await db.delete(cachedHistoricalData).where(eq(cachedHistoricalData.season, "2024/25"));
      
      // Transform and insert data
      const cacheRecords = historical2024Data.map(player => ({
        season: "2024/25",
        playerId: parseInt(player.id) || 0,
        teamId: typeof player.team === 'number' ? player.team : 0,
        teamName: player.team_name || player.teamName || "Unknown",
        firstName: player.first_name || player.firstName || "",
        secondName: player.second_name || player.secondName || "",
        webName: player.web_name || player.webName || null,
        positionName: player.position || "Unknown",
        goalsScored: player.goals_scored || player.goalsScored || 0,
        assists: player.assists || 0,
        totalPoints: player.total_points || player.totalPoints || 0,
        minutes: player.minutes || 0
      })).filter(record => record.playerId > 0 && record.teamName !== "Unknown");
      
      console.log(`📊 Inserting ${cacheRecords.length} cached historical records...`);
      
      // Insert in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < cacheRecords.length; i += batchSize) {
        const batch = cacheRecords.slice(i, i + batchSize);
        await db.insert(cachedHistoricalData).values(batch);
        console.log(`📊 Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cacheRecords.length/batchSize)}`);
      }
      
      console.log(`✅ 2024/25 historical data cache populated successfully with ${cacheRecords.length} records`);
      
    } catch (error) {
      console.error(`❌ Failed to populate 2024/25 cache:`, error);
      throw error;
    }
  }
  
  /**
   * Get cached 2024/25 data (much faster than database lookup)
   */
  async getCached2024Data(): Promise<any[]> {
    try {
      const cachedData = await db
        .select()
        .from(cachedHistoricalData)
        .where(eq(cachedHistoricalData.season, "2024/25"));
      
      if (cachedData.length === 0) {
        console.log(`⚠️ No cached 2024/25 data found, populating cache...`);
        await this.populateCache();
        
        // Try again after population
        const newCachedData = await db
          .select()
          .from(cachedHistoricalData)
          .where(eq(cachedHistoricalData.season, "2024/25"));
          
        return this.transformCachedData(newCachedData);
      }
      
      console.log(`📊 Serving ${cachedData.length} cached 2024/25 records`);
      return this.transformCachedData(cachedData);
      
    } catch (error) {
      console.error(`❌ Failed to get cached 2024/25 data:`, error);
      return [];
    }
  }
  
  /**
   * Transform cached data to match expected format for goal/assist share calculations
   */
  private transformCachedData(cachedData: any[]): any[] {
    return cachedData.map(record => ({
      id: record.playerId,
      playerId: record.playerId,
      team: record.teamId,
      team_name: record.teamName,
      teamName: record.teamName,
      first_name: record.firstName,
      second_name: record.secondName,
      firstName: record.firstName,
      secondName: record.secondName,
      web_name: record.webName,
      webName: record.webName,
      position: record.positionName,
      goals_scored: record.goalsScored,
      goalsScored: record.goalsScored,
      assists_scored: record.assists,
      assists: record.assists,
      total_points: record.totalPoints,
      totalPoints: record.totalPoints,
      minutes: record.minutes
    }));
  }
  
  /**
   * Check if cache needs refresh (run daily)
   */
  async shouldRefreshCache(): Promise<boolean> {
    try {
      const latestRecord = await db
        .select()
        .from(cachedHistoricalData)
        .where(eq(cachedHistoricalData.season, "2024/25"))
        .limit(1);
      
      if (latestRecord.length === 0) return true;
      
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(latestRecord[0].lastUpdated!).getTime()) / (24 * 60 * 60 * 1000)
      );
      
      return daysSinceUpdate >= 7; // Refresh weekly
    } catch (error) {
      return true; // Refresh on error
    }
  }
}

export const historicalCacheService = new HistoricalCacheService();
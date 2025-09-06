/**
 * Historical xG Data Service
 * Pre-calculates and caches historical xG data that never changes
 * This eliminates the need for expensive lookups during projection calculations
 */

import { db } from "./db";
import { historicalXGCache, type InsertHistoricalXGCache } from "@shared/schema";
import { storage } from "./storage";
import { eq, and } from "drizzle-orm";

export class HistoricalXGService {
  private readonly SEASONS = ["2024/25", "2023/24", "2022/23", "2021/22"];
  
  /**
   * Initialize historical xG data for all seasons
   * This should be run once when the service starts
   */
  async initializeHistoricalData(): Promise<void> {
    console.log("🔄 Initializing historical xG data cache...");
    
    for (const season of this.SEASONS) {
      await this.cacheSeasonXGData(season);
    }
    
    console.log("✅ Historical xG data cache initialized");
  }
  
  /**
   * Cache xG data for a specific season
   */
  private async cacheSeasonXGData(season: string): Promise<void> {
    try {
      console.log(`📊 Caching xG data for season ${season}...`);
      
      // Check if data already exists for this season
      const existingCount = await db.$count(
        historicalXGCache,
        eq(historicalXGCache.season, season)
      );
      
      if (existingCount > 0) {
        console.log(`✅ Season ${season} already cached (${existingCount} players)`);
        return;
      }
      
      // Fetch historical data from storage
      const historicalPlayers = await storage.getHistoricalPlayers(season);
      
      if (!historicalPlayers || historicalPlayers.length === 0) {
        console.log(`⚠️ No historical data found for season ${season}`);
        return;
      }
      
      // Transform and insert data
      const xgData: InsertHistoricalXGCache[] = historicalPlayers
        .filter(player => player.expectedGoals && player.minutes > 0)
        .map(player => ({
          playerId: player.id || 0,
          playerName: `${player.firstName || ''} ${player.secondName || ''}`.trim(),
          season,
          firstName: player.firstName,
          secondName: player.secondName,
          webName: player.webName,
          teamId: player.teamId,
          teamName: player.teamName,
          elementType: player.elementType || 4,
          expectedGoals: String(player.expectedGoals || 0),
          minutes: player.minutes || 0,
          xgPer90: player.minutes > 0 ? String(((player.expectedGoals || 0) / player.minutes) * 90) : "0",
        }));
      
      if (xgData.length > 0) {
        // Insert in batches to avoid memory issues
        const batchSize = 100;
        for (let i = 0; i < xgData.length; i += batchSize) {
          const batch = xgData.slice(i, i + batchSize);
          await db.insert(historicalXGCache).values(batch);
        }
        
        console.log(`✅ Cached ${xgData.length} players for season ${season}`);
      }
      
    } catch (error) {
      console.error(`❌ Error caching season ${season}:`, error);
    }
  }
  
  /**
   * Get historical xG data for specific seasons
   * Fast database lookup instead of expensive API calls
   */
  async getHistoricalXGData(seasons: string[]): Promise<{ [season: string]: any[] }> {
    const result: { [season: string]: any[] } = {};
    
    try {
      for (const season of seasons) {
        const data = await db.select()
          .from(historicalXGCache)
          .where(eq(historicalXGCache.season, season));
        
        result[season] = data;
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching historical xG data:", error);
      return {};
    }
  }
  
  /**
   * Find player in historical data by name matching
   */
  async findPlayerInHistory(playerName: string, season: string): Promise<any | null> {
    try {
      const data = await db.select()
        .from(historicalXGCache)
        .where(and(
          eq(historicalXGCache.season, season),
          eq(historicalXGCache.playerName, playerName)
        ));
      
      if (data.length > 0) {
        return data[0];
      }
      
      // Try fuzzy matching if exact match fails
      const allSeasonData = await db.select()
        .from(historicalXGCache)
        .where(eq(historicalXGCache.season, season));
      
      const fuzzyMatch = allSeasonData.find(player => {
        const historicalName = player.playerName.toLowerCase();
        const searchName = playerName.toLowerCase();
        return historicalName.includes(searchName) || 
               searchName.includes(historicalName) ||
               (player.webName && player.webName.toLowerCase() === searchName);
      });
      
      return fuzzyMatch || null;
    } catch (error) {
      console.error(`Error finding player ${playerName} in season ${season}:`, error);
      return null;
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ [season: string]: number }> {
    const stats: { [season: string]: number } = {};
    
    for (const season of this.SEASONS) {
      try {
        const count = await db.$count(
          historicalXGCache,
          eq(historicalXGCache.season, season)
        );
        stats[season] = count;
      } catch (error) {
        stats[season] = 0;
      }
    }
    
    return stats;
  }
}

export const historicalXGService = new HistoricalXGService();
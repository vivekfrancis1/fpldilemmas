import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { staticProjectionRanges, staticPlayerProjections, type InsertStaticProjectionRange, type InsertStaticPlayerProjection } from "@shared/schema";

interface StaticRange {
  name: string;
  start: number;
  end: number;
}

export class StaticCacheService {
  // Dynamic projection range for next 6 gameweeks (80% faster)
  private async getCurrentGameweek(): Promise<number> {
    try {
      // Import bootstrap data to get current gameweek
      const response = await fetch('http://localhost:5000/api/bootstrap-static');
      const data = await response.json();
      
      // Find current or next gameweek
      const currentEvent = data.events.find((event: any) => event.is_current) || 
                          data.events.find((event: any) => event.is_next);
      
      return currentEvent ? currentEvent.id : 4; // Default to GW4 if not found
    } catch (error) {
      console.error('Error getting current gameweek:', error);
      return 4; // Safe default
    }
  }
  
  private async getNext6GameweeksRange(): Promise<{ name: string; start: number; end: number }> {
    const currentGw = await this.getCurrentGameweek();
    const startGw = Math.max(currentGw, 4); // Never go below GW4
    const endGw = Math.min(startGw + 5, 38); // Never go above GW38
    
    return {
      name: `GW${startGw}-${endGw}`,
      start: startGw,
      end: endGw
    };
  }

  /**
   * Initialize static range for next 6 gameweeks
   */
  async initializeStaticRanges(): Promise<void> {
    console.log("🔧 Initializing static projection range for next 6 gameweeks...");
    
    const range = await this.getNext6GameweeksRange();
    
    const existing = await db.select()
      .from(staticProjectionRanges)
      .where(eq(staticProjectionRanges.rangeName, range.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(staticProjectionRanges).values({
        rangeName: range.name,
        projectionType: "player_total_points",
        startGameweek: range.start,
        endGameweek: range.end,
        season: "2025/26",
        calculationStatus: "pending"
      });
      console.log(`✅ Created static range for next 6 gameweeks: ${range.name}`);
    }
  }

  /**
   * Check if next 6 gameweeks range is cached and fresh (within 12 hours)
   */
  async isRangeCached(startGw: number, endGw: number): Promise<{ cached: boolean; rangeId?: number }> {
    const rangeName = `GW${startGw}-${endGw}`;
    
    const range = await db.select()
      .from(staticProjectionRanges)
      .where(and(
        eq(staticProjectionRanges.rangeName, rangeName),
        eq(staticProjectionRanges.calculationStatus, "completed")
      ))
      .limit(1);

    if (range.length === 0) {
      return { cached: false };
    }

    // Check if data is fresh (within 12 hours for next 6 GWs cache)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const lastCalculated = range[0].lastCalculated;
    
    if (!lastCalculated || lastCalculated < twelveHoursAgo) {
      return { cached: false, rangeId: range[0].id };
    }

    return { cached: true, rangeId: range[0].id };
  }

  /**
   * Get cached projections for a specific range (instant retrieval)
   * If requested range falls within our next 6 gameweeks cache, serve it instantly
   */
  async getCachedProjections(startGw: number, endGw: number): Promise<any[] | null> {
    // Check if the requested range falls within our cached next 6 gameweeks
    const cachedRange = await this.getNext6GameweeksRange();
    
    // Only serve from cache if the requested range is fully within our cached range
    if (startGw >= cachedRange.start && endGw <= cachedRange.end) {
      const { cached, rangeId } = await this.isRangeCached(cachedRange.start, cachedRange.end);
      
      if (!cached || !rangeId) {
        return null;
      }

      // Get all cached projections and filter to requested range in memory
      // This is very fast since it's pre-calculated data
      const allProjections = await db.select({
        playerId: staticPlayerProjections.playerId,
        playerName: staticPlayerProjections.playerName,
        position: staticPlayerProjections.position,
        team: staticPlayerProjections.team,
        totalPoints: staticPlayerProjections.totalPoints,
        projectedGoals: staticPlayerProjections.projectedGoals,
        projectedAssists: staticPlayerProjections.projectedAssists,
        projectedMinutes: staticPlayerProjections.projectedMinutes,
        projectedCleanSheets: staticPlayerProjections.projectedCleanSheets,
        projectedBonusPoints: staticPlayerProjections.projectedBonusPoints,
        gameweekBreakdown: staticPlayerProjections.gameweekBreakdown
      })
      .from(staticPlayerProjections)
      .where(eq(staticPlayerProjections.rangeId, rangeId))
      .orderBy(sql`${staticPlayerProjections.totalPoints} DESC`);

      // Filter gameweek breakdown to requested range if needed
      const filteredProjections = allProjections.map(proj => {
        // If requesting exact cached range, return as-is
        if (startGw === cachedRange.start && endGw === cachedRange.end) {
          return proj;
        }
        
        // Otherwise, filter gameweek breakdown to requested range
        const filteredBreakdown: Record<string, any> = {};
        const breakdown = (proj.gameweekBreakdown as Record<string, any>) || {};
        
        for (let gw = startGw; gw <= endGw; gw++) {
          const gwKey = gw.toString(); // Use numeric string for consistency
          if (breakdown[gwKey]) {
            filteredBreakdown[gwKey] = breakdown[gwKey];
          }
        }
        
        return {
          ...proj,
          gameweekBreakdown: filteredBreakdown
        };
      });

      console.log(`🚀 INSTANT CACHE HIT: Serving ${filteredProjections.length} projections for GW${startGw}-${endGw} from next 6 GWs cache`);
      return filteredProjections;
    }
    
    // Requested range not in our cache
    return null;
  }

  /**
   * Pre-calculate and cache projections for static ranges
   */
  async preCalculateRange(startGw: number, endGw: number): Promise<void> {
    const rangeName = `GW${startGw}-${endGw}`;
    console.log(`📊 Pre-calculating static projections for ${rangeName}...`);

    // Mark as calculating
    await db.update(staticProjectionRanges)
      .set({ 
        calculationStatus: "calculating",
        updatedAt: new Date()
      })
      .where(eq(staticProjectionRanges.rangeName, rangeName));

    try {
      // Import projection service for calculations
      const { projectionService } = await import('./projection-service');
      
      // Get fresh projections
      const projections = await projectionService.getPlayerTotalPoints(startGw, endGw);
      
      // Find the range ID
      const range = await db.select()
        .from(staticProjectionRanges)
        .where(eq(staticProjectionRanges.rangeName, rangeName))
        .limit(1);

      if (range.length === 0) {
        throw new Error(`Range ${rangeName} not found`);
      }

      const rangeId = range[0].id;

      // Clear existing cached data
      await db.delete(staticPlayerProjections)
        .where(eq(staticPlayerProjections.rangeId, rangeId));

      // Insert new cached projections in batches
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < projections.length; i += batchSize) {
        const batch = projections.slice(i, i + batchSize).map((proj: any) => ({
          rangeId,
          playerId: proj.playerId,
          playerName: proj.playerName,
          position: proj.position,
          team: proj.team,
          totalPoints: proj.totalPoints?.toString() || "0",
          projectedGoals: proj.projectedGoals?.toString() || "0",
          projectedAssists: proj.projectedAssists?.toString() || "0", 
          projectedMinutes: proj.projectedMinutes?.toString() || "0",
          projectedCleanSheets: proj.projectedCleanSheets?.toString() || "0",
          projectedBonusPoints: proj.projectedBonusPoints?.toString() || "0",
          gameweekBreakdown: proj.gameweekBreakdown || {}
        }));
        batches.push(batch);
      }

      let totalInserted = 0;
      for (const batch of batches) {
        await db.insert(staticPlayerProjections).values(batch);
        totalInserted += batch.length;
        console.log(`📊 Cached batch: ${totalInserted}/${projections.length} projections`);
      }

      // Mark as completed
      await db.update(staticProjectionRanges)
        .set({ 
          calculationStatus: "completed",
          lastCalculated: new Date(),
          recordCount: totalInserted,
          updatedAt: new Date()
        })
        .where(eq(staticProjectionRanges.rangeName, rangeName));

      console.log(`✅ Pre-calculated ${rangeName}: ${totalInserted} projections cached`);

    } catch (error) {
      console.error(`❌ Error pre-calculating ${rangeName}:`, error);
      
      // Mark as error
      await db.update(staticProjectionRanges)
        .set({ 
          calculationStatus: "error",
          updatedAt: new Date()
        })
        .where(eq(staticProjectionRanges.rangeName, rangeName));

      throw error;
    }
  }

  /**
   * Pre-calculate the next 6 gameweeks range (called by daily scheduler)
   */
  async preCalculateAllRanges(): Promise<void> {
    console.log("🚀 Starting pre-calculation for next 6 gameweeks...");
    const startTime = Date.now();

    await this.initializeStaticRanges();
    
    const range = await this.getNext6GameweeksRange();

    try {
      await this.preCalculateRange(range.start, range.end);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Static cache pre-calculation completed for ${range.name} in ${Math.round(duration / 1000)}s`);
    } catch (error) {
      console.error(`Failed to pre-calculate next 6 gameweeks:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics for static ranges
   */
  async getCacheStats() {
    const stats = await db.select({
      rangeName: staticProjectionRanges.rangeName,
      status: staticProjectionRanges.calculationStatus,
      recordCount: staticProjectionRanges.recordCount,
      lastCalculated: staticProjectionRanges.lastCalculated
    }).from(staticProjectionRanges);

    return stats;
  }
}

export const staticCacheService = new StaticCacheService();
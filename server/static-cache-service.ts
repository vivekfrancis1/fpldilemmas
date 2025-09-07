import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { staticProjectionRanges, staticPlayerProjections, type InsertStaticProjectionRange, type InsertStaticPlayerProjection } from "@shared/schema";

interface StaticRange {
  name: string;
  start: number;
  end: number;
}

export class StaticCacheService {
  // Common projection ranges for instant cache hits (80% faster)
  private readonly STATIC_RANGES: StaticRange[] = [
    { name: "GW4-9", start: 4, end: 9 },    // Most common 6-gameweek range
    { name: "GW4-15", start: 4, end: 15 },  // Extended 12-gameweek range
    { name: "GW10-15", start: 10, end: 15 }, // Mid-season range
  ];

  /**
   * Initialize static ranges in database if they don't exist
   */
  async initializeStaticRanges(): Promise<void> {
    console.log("🔧 Initializing static projection ranges...");
    
    for (const range of this.STATIC_RANGES) {
      const existing = await db.select()
        .from(staticProjectionRanges)
        .where(eq(staticProjectionRanges.rangeName, range.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(staticProjectionRanges).values({
          rangeName: range.name,
          startGameweek: range.start,
          endGameweek: range.end,
          season: "2025/26",
          calculationStatus: "pending"
        });
        console.log(`✅ Created static range: ${range.name}`);
      }
    }
  }

  /**
   * Check if a range is cached and fresh (within 6 hours)
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

    // Check if data is fresh (within 6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const lastCalculated = range[0].lastCalculated;
    
    if (!lastCalculated || lastCalculated < sixHoursAgo) {
      return { cached: false, rangeId: range[0].id };
    }

    return { cached: true, rangeId: range[0].id };
  }

  /**
   * Get cached projections for a specific range (instant retrieval)
   */
  async getCachedProjections(startGw: number, endGw: number): Promise<any[] | null> {
    const { cached, rangeId } = await this.isRangeCached(startGw, endGw);
    
    if (!cached || !rangeId) {
      return null;
    }

    const projections = await db.select({
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

    console.log(`🚀 Serving ${projections.length} cached projections for GW${startGw}-${endGw} (INSTANT)`);
    return projections;
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
          totalPoints: proj.totalPoints.toString(),
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
   * Pre-calculate all common ranges (called by daily scheduler)
   */
  async preCalculateAllRanges(): Promise<void> {
    console.log("🚀 Starting pre-calculation of all static ranges...");
    const startTime = Date.now();

    await this.initializeStaticRanges();

    for (const range of this.STATIC_RANGES) {
      try {
        await this.preCalculateRange(range.start, range.end);
      } catch (error) {
        console.error(`Failed to pre-calculate ${range.name}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Static range pre-calculation completed in ${Math.round(duration / 1000)}s`);
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
import { PlayerTotalPointsAggregator } from "./player-total-points-aggregator";
import { internalFetch } from "./config";
import { totalPointsCache } from "./total-points-cache";

export class FPLScoringCacheService {
  private static updateLock = false;
  
  async updateAllScoringData(startGameweek?: number, endGameweek?: number): Promise<void> {
    if (FPLScoringCacheService.updateLock) {
      console.log("⏳ Cache update already in progress, skipping duplicate request");
      return;
    }
    
    FPLScoringCacheService.updateLock = true;
    console.log("🚀 Starting FPL scoring component cache update...");
    
    try {
      // Determine dynamic GW range from current gameweek if not supplied
      let resolvedStart = startGameweek;
      let resolvedEnd = endGameweek;
      if (resolvedStart === undefined || resolvedEnd === undefined) {
        try {
          const bootstrapResp = await internalFetch("api/bootstrap-static");
          if (bootstrapResp.ok) {
            const bootstrapData = await bootstrapResp.json();
            const currentGW = bootstrapData.events.find((e: any) => e.is_current)?.id || 1;
            resolvedStart = currentGW + 1;
            resolvedEnd = Math.min(currentGW + 12, 38);
          }
        } catch {
          resolvedStart = resolvedStart ?? 25;
          resolvedEnd = resolvedEnd ?? 36;
        }
      }

      console.log(`🔧 Starting Player Total Points aggregation for GW${resolvedStart}-${resolvedEnd}...`);
      const aggregator = new PlayerTotalPointsAggregator();
      await aggregator.aggregatePlayerTotalPoints(resolvedStart, resolvedEnd);
      // Clear memory cache so the next request reads the freshly aggregated DB data
      totalPointsCache.clear();
      console.log("✅ FPL scoring component cache update completed successfully — memory cache cleared");
    } catch (error) {
      console.error("❌ FPL scoring component cache update failed:", error);
      throw error;
    } finally {
      FPLScoringCacheService.updateLock = false;
    }
  }

  getCachedPlayerSaves(): any[] {
    console.log("⚠️ getCachedPlayerSaves: Cache tables removed, returning empty array");
    return [];
  }

  getCachedPlayerGoalsConceded(): any[] {
    console.log("⚠️ getCachedPlayerGoalsConceded: Cache tables removed, returning empty array");
    return [];
  }

  getCachedPlayerYellowCards(): any[] {
    console.log("⚠️ getCachedPlayerYellowCards: Cache tables removed, returning empty array");
    return [];
  }

  getCachedPlayerRedCards(): any[] {
    console.log("⚠️ getCachedPlayerRedCards: Cache tables removed, returning empty array");
    return [];
  }

  getCachedPlayerBonusPoints(): any[] {
    console.log("⚠️ getCachedPlayerBonusPoints: Cache tables removed, returning empty array");
    return [];
  }

  getCachedPlayerSavePoints(): any[] {
    console.log("⚠️ getCachedPlayerSavePoints: Cache tables removed, returning empty array");
    return [];
  }

  getCachedPlayerCbitPoints(): any[] {
    console.log("⚠️ getCachedPlayerCbitPoints: Cache tables removed, returning empty array");
    return [];
  }

  getCachedPlayerMinutesPoints(): any[] {
    console.log("⚠️ getCachedPlayerMinutesPoints: Cache tables removed, returning empty array");
    return [];
  }
}

export const fplScoringCacheService = new FPLScoringCacheService();

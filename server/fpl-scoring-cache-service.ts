import { PlayerTotalPointsAggregator } from "./player-total-points-aggregator";
import { internalFetch } from "./config";
import { totalPointsCache } from "./total-points-cache";

export class FPLScoringCacheService {
  private static updateLock = false;
  static lastRunAt: Date | null = null;
  private static refreshCallbacks: Array<() => void> = [];

  static onRefresh(cb: () => void): void {
    FPLScoringCacheService.refreshCallbacks.push(cb);
  }

  private static fireRefreshCallbacks(): void {
    for (const cb of FPLScoringCacheService.refreshCallbacks) {
      try { cb(); } catch (err) {
        console.warn("⚠️ GW-range cache invalidation callback failed:", err);
      }
    }
  }

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
            resolvedEnd = Math.min(currentGW + 12, 39);
          }
        } catch {
          resolvedStart = resolvedStart ?? 25;
          resolvedEnd = resolvedEnd ?? 36;
        }
      }

      console.log(`🔧 Starting Player Total Points aggregation for GW${resolvedStart}-${resolvedEnd}...`);
      
      // Pre-warm TeamGoalsService so all 4 team-data-dependent components hit the cache immediately
      try {
        const { TeamGoalsService } = await import('./team-goals-service');
        await TeamGoalsService.getTeamGoalProjections(resolvedStart!, resolvedEnd!);
        console.log("🔥 TeamGoalsService pre-warmed for aggregation");
      } catch (e) {
        console.warn("⚠️ TeamGoalsService pre-warm failed (non-fatal):", e);
      }
      
      const aggregator = new PlayerTotalPointsAggregator();
      await aggregator.aggregatePlayerTotalPoints(resolvedStart, resolvedEnd);
      // Clear memory cache so the next request reads the freshly aggregated DB data
      totalPointsCache.clear();
      FPLScoringCacheService.lastRunAt = new Date();
      FPLScoringCacheService.fireRefreshCallbacks();
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

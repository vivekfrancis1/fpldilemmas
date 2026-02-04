import { PlayerTotalPointsAggregator } from "./player-total-points-aggregator";

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
      console.log("🔧 Starting Player Total Points aggregation...");
      const aggregator = new PlayerTotalPointsAggregator();
      await aggregator.aggregatePlayerTotalPoints(startGameweek, endGameweek);
      console.log("✅ FPL scoring component cache update completed successfully");
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

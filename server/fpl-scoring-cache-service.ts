import { PlayerTotalPointsAggregator } from "./player-total-points-aggregator";
import { internalFetch } from "./config";
import { totalPointsCache } from "./total-points-cache";
import { pool } from "./db";
import { CURRENT_SEASON } from "@shared/schema";

export class FPLScoringCacheService {
  private static updateLock = false;
  static lastRunAt: Date | null = null;
  private static refreshCallbacks: Array<() => Promise<void>> = [];

  private static cbitCache: Record<string, any> = {};
  private static minutesCache: Record<string, any> = {};
  private static savePointsCache: any[] = [];

  static onRefresh(cb: () => Promise<void>): void {
    FPLScoringCacheService.refreshCallbacks.push(cb);
  }

  private static async fireRefreshCallbacks(): Promise<void> {
    for (const cb of FPLScoringCacheService.refreshCallbacks) {
      try { await cb(); } catch (err) {
        console.warn("⚠️ GW-range cache invalidation callback failed:", err);
      }
    }
  }

  /**
   * Notify all registered onRefresh listeners that gameweek data has been
   * written to the DB (e.g. by the ingestion job).  Call this whenever
   * gameweek_player_data is updated outside of updateAllScoringData so that
   * the GW-range caches (cbitGWRangeCache, minutesGWRangeCache,
   * savePointsGWRangeCache) are immediately invalidated.
   */
  static async notifyDataUpdated(): Promise<void> {
    console.log("🗑️ Invalidating GW-range caches after gameweek data ingestion");
    await FPLScoringCacheService.fireRefreshCallbacks();
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

      // Pre-warm CBIT, minutes, and save-points caches so first requests never hit an empty cache
      const prewarmLabels = ["CBIT", "minutes-points", "save-points"];
      const prewarmResults = await Promise.allSettled([
        this.cachePlayerCbitPoints(),
        this.cachePlayerMinutesPoints(),
        this.cachePlayerSavePoints(),
      ]);
      let prewarmSucceeded = 0;
      prewarmResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          prewarmSucceeded++;
        } else {
          console.warn(`⚠️ ${prewarmLabels[i]} cache pre-warm failed (non-fatal):`, result.reason);
        }
      });
      console.log(`🔥 Scoring sub-caches pre-warm: ${prewarmSucceeded}/${prewarmLabels.length} succeeded (CBIT, minutes-points, save-points)`);

      FPLScoringCacheService.lastRunAt = new Date();
      await FPLScoringCacheService.fireRefreshCallbacks();
      console.log("✅ FPL scoring component cache update completed successfully — memory cache cleared");
    } catch (error) {
      console.error("❌ FPL scoring component cache update failed:", error);
      throw error;
    } finally {
      FPLScoringCacheService.updateLock = false;
    }
  }

  private async fetchPlayerInfoMap(): Promise<Map<number, { playerName: string; teamName: string; position: string }>> {
    const map = new Map<number, { playerName: string; teamName: string; position: string }>();
    try {
      const bootstrapResp = await internalFetch("api/bootstrap-static");
      if (bootstrapResp.ok) {
        const bootstrapData = await bootstrapResp.json();
        const teamsMap = new Map<number, string>(bootstrapData.teams.map((t: any) => [t.id, t.short_name]));
        const posMap = new Map<number, string>(bootstrapData.element_types.map((et: any) => [et.id, et.singular_name_short]));
        for (const el of bootstrapData.elements) {
          map.set(el.id, {
            playerName: el.web_name,
            teamName: teamsMap.get(el.team) || '',
            position: posMap.get(el.element_type) || '',
          });
        }
      }
    } catch (e) {
      console.warn("⚠️ Could not fetch bootstrap data for player info map:", e);
    }
    return map;
  }

  async cachePlayerCbitPoints(): Promise<void> {
    console.log("🔄 Populating CBIT points cache from gameweek_player_data...");
    try {
      const [queryResult, playerInfoMap] = await Promise.all([
        pool.query(
          `SELECT player_id, gameweek,
             CASE WHEN defensive_contribution >= 10 THEN 2 ELSE 0 END AS cbit_points
           FROM gameweek_player_data
           WHERE season = $1
           ORDER BY player_id, gameweek`,
          [CURRENT_SEASON]
        ),
        this.fetchPlayerInfoMap(),
      ]);

      const cbitData: Record<string, any> = {};
      for (const row of queryResult.rows) {
        const id = row.player_id.toString();
        if (!cbitData[id]) {
          const info = playerInfoMap.get(row.player_id) || { playerName: '', teamName: '', position: '' };
          cbitData[id] = {
            playerId: row.player_id,
            playerName: info.playerName,
            teamName: info.teamName,
            position: info.position,
            gameweeks: [],
            seasonTotal: 0,
          };
        }
        const pts = row.cbit_points || 0;
        cbitData[id].gameweeks.push({ gameweek: row.gameweek, cbitPoints: pts });
        cbitData[id].seasonTotal += pts;
      }

      FPLScoringCacheService.cbitCache = cbitData;
      console.log(`✅ CBIT cache populated: ${Object.keys(cbitData).length} players`);
    } catch (error) {
      console.error("❌ Failed to populate CBIT cache:", error);
      throw error;
    }
  }

  getCachedPlayerCbitPoints(): Record<string, any> {
    return FPLScoringCacheService.cbitCache;
  }

  async cachePlayerMinutesPoints(): Promise<void> {
    console.log("🔄 Populating minutes points cache from gameweek_player_data...");
    try {
      const [queryResult, playerInfoMap] = await Promise.all([
        pool.query(
          `SELECT player_id, gameweek,
             CASE WHEN minutes >= 60 THEN 2 WHEN minutes > 0 THEN 1 ELSE 0 END AS minutes_points
           FROM gameweek_player_data
           WHERE season = $1
           ORDER BY player_id, gameweek`,
          [CURRENT_SEASON]
        ),
        this.fetchPlayerInfoMap(),
      ]);

      const minutesData: Record<string, any> = {};
      for (const row of queryResult.rows) {
        const id = row.player_id.toString();
        if (!minutesData[id]) {
          const info = playerInfoMap.get(row.player_id) || { playerName: '', teamName: '', position: '' };
          minutesData[id] = {
            playerId: row.player_id,
            playerName: info.playerName,
            teamName: info.teamName,
            position: info.position,
            gameweeks: [],
            seasonTotal: 0,
          };
        }
        const pts = row.minutes_points || 0;
        minutesData[id].gameweeks.push({ gameweek: row.gameweek, minutesPoints: pts });
        minutesData[id].seasonTotal += pts;
      }

      FPLScoringCacheService.minutesCache = minutesData;
      console.log(`✅ Minutes points cache populated: ${Object.keys(minutesData).length} players`);
    } catch (error) {
      console.error("❌ Failed to populate minutes points cache:", error);
      throw error;
    }
  }

  getCachedPlayerMinutesPoints(): Record<string, any> {
    return FPLScoringCacheService.minutesCache;
  }

  async cachePlayerSavePoints(): Promise<void> {
    console.log("🔄 Populating save points cache from gameweek_player_data...");
    try {
      const queryResult = await pool.query(
        `SELECT player_id, gameweek, saves,
           COALESCE(penalties_saved, 0) AS penalties_saved,
           CASE WHEN saves >= 3 THEN (saves / 3) ELSE 0 END AS save_points
         FROM gameweek_player_data
         WHERE season = $1
         ORDER BY player_id, gameweek`,
        [CURRENT_SEASON]
      );

      const playerMap: Record<number, {
        playerId: number;
        savePoints: Record<string, number>;
        saves: Record<string, number>;
        penaltySaves: Record<string, number>;
        totalSavePoints: number;
      }> = {};

      for (const row of queryResult.rows) {
        const id = row.player_id;
        if (!playerMap[id]) {
          playerMap[id] = {
            playerId: id,
            savePoints: {},
            saves: {},
            penaltySaves: {},
            totalSavePoints: 0,
          };
        }
        const gwKey = String(row.gameweek);
        const pts = row.save_points || 0;
        playerMap[id].savePoints[gwKey] = pts;
        playerMap[id].saves[gwKey] = row.saves || 0;
        playerMap[id].penaltySaves[gwKey] = row.penalties_saved || 0;
        playerMap[id].totalSavePoints += pts;
      }

      FPLScoringCacheService.savePointsCache = Object.values(playerMap);
      console.log(`✅ Save points cache populated: ${FPLScoringCacheService.savePointsCache.length} players`);
    } catch (error) {
      console.error("❌ Failed to populate save points cache:", error);
      throw error;
    }
  }

  getCachedPlayerSavePoints(): any[] {
    return FPLScoringCacheService.savePointsCache;
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
}

export const fplScoringCacheService = new FPLScoringCacheService();

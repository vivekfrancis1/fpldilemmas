import { db } from "./db";
import { 
  cachedPlayerSaves, 
  cachedPlayerGoalsConceded, 
  cachedPlayerYellowCards, 
  cachedPlayerRedCards, 
  cachedPlayerBonusPoints 
} from "@shared/schema";
import { internalFetch } from "./config";

export class FPLScoringCacheService {
  
  /**
   * Fetch and cache all FPL scoring component data
   */
  async updateAllScoringData(): Promise<void> {
    console.log("🚀 Starting FPL scoring component cache update...");
    
    try {
      // Cache all scoring components in parallel
      await Promise.all([
        this.cachePlayerSaves(),
        this.cachePlayerGoalsConceded(),
        this.cachePlayerYellowCards(),
        this.cachePlayerRedCards(),
        this.cachePlayerBonusPoints()
      ]);
      
      console.log("✅ FPL scoring component cache update completed successfully");
    } catch (error) {
      console.error("❌ FPL scoring component cache update failed:", error);
      throw error;
    }
  }

  /**
   * Cache player saves data
   */
  private async cachePlayerSaves(): Promise<void> {
    console.log("📊 Caching player saves data...");
    
    try {
      const response = await internalFetch(`api/player-saves-projections?startGameweek=4&endGameweek=9`);
      if (!response.ok) throw new Error(`Failed to fetch saves data: ${response.statusText}`);
      
      const savesData = await response.json();
      
      // Clear existing data
      await db.delete(cachedPlayerSaves);
      
      // Insert new data in batches
      const batchSize = 50;
      for (let i = 0; i < savesData.length; i += batchSize) {
        const batch = savesData.slice(i, i + batchSize);
        await db.insert(cachedPlayerSaves).values(
          batch.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            gameweekData: player.saves,
            pointsData: player.pointsFromSaves,
            totalValue: player.totalSaves,
            totalPoints: player.totalPoints,
            averagePerGameweek: player.averagePerGameweek,
            lastUpdated: new Date()
          }))
        );
      }
      
      console.log(`✅ Cached ${savesData.length} player saves records`);
    } catch (error) {
      console.error("❌ Failed to cache player saves:", error);
      throw error;
    }
  }

  /**
   * Cache player goals conceded data
   */
  private async cachePlayerGoalsConceded(): Promise<void> {
    console.log("📊 Caching player goals conceded data...");
    
    try {
      const response = await fetch(`${this.baseUrl}/api/player-goals-conceded-projections?startGameweek=4&endGameweek=9`);
      if (!response.ok) throw new Error(`Failed to fetch goals conceded data: ${response.statusText}`);
      
      const goalsConcededData = await response.json();
      
      // Clear existing data
      await db.delete(cachedPlayerGoalsConceded);
      
      // Insert new data in batches
      const batchSize = 50;
      for (let i = 0; i < goalsConcededData.length; i += batchSize) {
        const batch = goalsConcededData.slice(i, i + batchSize);
        await db.insert(cachedPlayerGoalsConceded).values(
          batch.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            gameweekData: player.goalsConceded,
            pointsData: player.pointsFromGoalsConceded,
            totalValue: player.totalGoalsConceded,
            totalPoints: player.totalPoints,
            averagePerGameweek: player.averagePerGameweek,
            lastUpdated: new Date()
          }))
        );
      }
      
      console.log(`✅ Cached ${goalsConcededData.length} player goals conceded records`);
    } catch (error) {
      console.error("❌ Failed to cache player goals conceded:", error);
      throw error;
    }
  }

  /**
   * Cache player yellow cards data
   */
  private async cachePlayerYellowCards(): Promise<void> {
    console.log("📊 Caching player yellow cards data...");
    
    try {
      const response = await fetch(`${this.baseUrl}/api/player-yellow-cards-projections?startGameweek=4&endGameweek=9`);
      if (!response.ok) throw new Error(`Failed to fetch yellow cards data: ${response.statusText}`);
      
      const yellowCardsData = await response.json();
      
      // Clear existing data
      await db.delete(cachedPlayerYellowCards);
      
      // Insert new data in batches
      const batchSize = 50;
      for (let i = 0; i < yellowCardsData.length; i += batchSize) {
        const batch = yellowCardsData.slice(i, i + batchSize);
        await db.insert(cachedPlayerYellowCards).values(
          batch.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            gameweekData: player.yellowCards,
            pointsData: player.pointsFromYellowCards,
            totalValue: player.totalYellowCards,
            totalPoints: player.totalPoints,
            averagePerGameweek: player.averagePerGameweek,
            lastUpdated: new Date()
          }))
        );
      }
      
      console.log(`✅ Cached ${yellowCardsData.length} player yellow cards records`);
    } catch (error) {
      console.error("❌ Failed to cache player yellow cards:", error);
      throw error;
    }
  }

  /**
   * Cache player red cards data
   */
  private async cachePlayerRedCards(): Promise<void> {
    console.log("📊 Caching player red cards data...");
    
    try {
      const response = await fetch(`${this.baseUrl}/api/player-red-cards-projections?startGameweek=4&endGameweek=9`);
      if (!response.ok) throw new Error(`Failed to fetch red cards data: ${response.statusText}`);
      
      const redCardsData = await response.json();
      
      // Clear existing data
      await db.delete(cachedPlayerRedCards);
      
      // Insert new data in batches
      const batchSize = 50;
      for (let i = 0; i < redCardsData.length; i += batchSize) {
        const batch = redCardsData.slice(i, i + batchSize);
        await db.insert(cachedPlayerRedCards).values(
          batch.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            gameweekData: player.redCards,
            pointsData: player.pointsFromRedCards,
            totalValue: player.totalRedCards,
            totalPoints: player.totalPoints,
            averagePerGameweek: player.averagePerGameweek,
            lastUpdated: new Date()
          }))
        );
      }
      
      console.log(`✅ Cached ${redCardsData.length} player red cards records`);
    } catch (error) {
      console.error("❌ Failed to cache player red cards:", error);
      throw error;
    }
  }

  /**
   * Cache player bonus points data
   */
  private async cachePlayerBonusPoints(): Promise<void> {
    console.log("📊 Caching player bonus points data...");
    
    try {
      const response = await fetch(`${this.baseUrl}/api/player-bonus-points-projections?startGameweek=4&endGameweek=9`);
      if (!response.ok) throw new Error(`Failed to fetch bonus points data: ${response.statusText}`);
      
      const bonusPointsData = await response.json();
      
      // Clear existing data
      await db.delete(cachedPlayerBonusPoints);
      
      // Insert new data in batches
      const batchSize = 50;
      for (let i = 0; i < bonusPointsData.length; i += batchSize) {
        const batch = bonusPointsData.slice(i, i + batchSize);
        await db.insert(cachedPlayerBonusPoints).values(
          batch.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            gameweekData: player.bonusPoints,
            pointsData: player.pointsFromBonus,
            totalValue: player.totalBonusPoints,
            totalPoints: player.totalPoints,
            averagePerGameweek: player.averagePerGameweek,
            lastUpdated: new Date()
          }))
        );
      }
      
      console.log(`✅ Cached ${bonusPointsData.length} player bonus points records`);
    } catch (error) {
      console.error("❌ Failed to cache player bonus points:", error);
      throw error;
    }
  }

  /**
   * Get cached player saves data
   */
  async getCachedPlayerSaves(): Promise<any[]> {
    const data = await db.select().from(cachedPlayerSaves).orderBy(cachedPlayerSaves.totalValue);
    return data.map(record => ({
      playerId: record.playerId,
      playerName: record.playerName,
      teamName: record.teamName,
      position: record.position,
      saves: record.gameweekData,
      pointsFromSaves: record.pointsData,
      totalSaves: record.totalValue,
      totalPoints: record.totalPoints,
      averagePerGameweek: record.averagePerGameweek
    }));
  }

  /**
   * Get cached player goals conceded data
   */
  async getCachedPlayerGoalsConceded(): Promise<any[]> {
    const data = await db.select().from(cachedPlayerGoalsConceded).orderBy(cachedPlayerGoalsConceded.totalValue);
    return data.map(record => ({
      playerId: record.playerId,
      playerName: record.playerName,
      teamName: record.teamName,
      position: record.position,
      goalsConceded: record.gameweekData,
      pointsFromGoalsConceded: record.pointsData,
      totalGoalsConceded: record.totalValue,
      totalPoints: record.totalPoints,
      averagePerGameweek: record.averagePerGameweek
    }));
  }

  /**
   * Get cached player yellow cards data
   */
  async getCachedPlayerYellowCards(): Promise<any[]> {
    const data = await db.select().from(cachedPlayerYellowCards).orderBy(cachedPlayerYellowCards.totalValue);
    return data.map(record => ({
      playerId: record.playerId,
      playerName: record.playerName,
      teamName: record.teamName,
      position: record.position,
      yellowCards: record.gameweekData,
      pointsFromYellowCards: record.pointsData,
      totalYellowCards: record.totalValue,
      totalPoints: record.totalPoints,
      averagePerGameweek: record.averagePerGameweek
    }));
  }

  /**
   * Get cached player red cards data
   */
  async getCachedPlayerRedCards(): Promise<any[]> {
    const data = await db.select().from(cachedPlayerRedCards).orderBy(cachedPlayerRedCards.totalValue);
    return data.map(record => ({
      playerId: record.playerId,
      playerName: record.playerName,
      teamName: record.teamName,
      position: record.position,
      redCards: record.gameweekData,
      pointsFromRedCards: record.pointsData,
      totalRedCards: record.totalValue,
      totalPoints: record.totalPoints,
      averagePerGameweek: record.averagePerGameweek
    }));
  }

  /**
   * Get cached player bonus points data
   */
  async getCachedPlayerBonusPoints(): Promise<any[]> {
    const data = await db.select().from(cachedPlayerBonusPoints).orderBy(cachedPlayerBonusPoints.totalValue);
    return data.map(record => ({
      playerId: record.playerId,
      playerName: record.playerName,
      teamName: record.teamName,
      position: record.position,
      bonusPoints: record.gameweekData,
      pointsFromBonus: record.pointsData,
      totalBonusPoints: record.totalValue,
      totalPoints: record.totalPoints,
      averagePerGameweek: record.averagePerGameweek
    }));
  }
}

export const fplScoringCacheService = new FPLScoringCacheService();
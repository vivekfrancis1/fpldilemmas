import { db } from "./db";
import { 
  cachedPlayerSaves, 
  cachedPlayerGoalsConceded, 
  cachedPlayerYellowCards, 
  cachedPlayerRedCards, 
  cachedPlayerBonusPoints,
  cachedPlayerCbitPoints
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
        this.cachePlayerBonusPoints(),
        this.cachePlayerCbitPoints()
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
      const response = await internalFetch(`api/player-goals-conceded-projections?startGameweek=4&endGameweek=9`);
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
      const response = await internalFetch(`api/player-yellow-cards-projections?startGameweek=4&endGameweek=9`);
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
      const response = await internalFetch(`api/player-red-cards-projections?startGameweek=4&endGameweek=9`);
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
      const response = await internalFetch(`api/player-bonus-points-projections?startGameweek=4&endGameweek=9`);
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

  /**
   * Cache player CBIT (Clearances, Blocks, Interceptions, Tackles) points data
   * Fetches live event data from FPL API for all completed gameweeks
   */
  async cachePlayerCbitPoints(): Promise<void> {
    console.log("📊 Caching player CBIT points data...");
    
    try {
      // Fetch bootstrap data to get completed gameweeks and player info
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (!bootstrapResponse.ok) {
        throw new Error(`Failed to fetch bootstrap data: ${bootstrapResponse.statusText}`);
      }
      
      const bootstrap = await bootstrapResponse.json();
      const completedGameweeks = bootstrap.events.filter((gw: any) => gw.finished === true);
      const players = bootstrap.elements;
      
      console.log(`🎯 Found ${completedGameweeks.length} completed gameweeks to process`);
      
      // Create player lookup map for efficiency
      const playerMap = new Map();
      players.forEach((player: any) => {
        playerMap.set(player.id, {
          id: player.id,
          first_name: player.first_name,
          second_name: player.second_name,
          web_name: player.web_name,
          element_type: player.element_type,
          team: player.team
        });
      });
      
      // Get team names map  
      const teamMap = new Map();
      bootstrap.teams.forEach((team: any) => {
        teamMap.set(team.id, team.name);
      });
      
      // Initialize CBIT data structure for all players
      const cbitData = new Map();
      
      // Process each completed gameweek
      for (const gameweek of completedGameweeks) {
        console.log(`🔄 Processing gameweek ${gameweek.id}...`);
        
        try {
          // Fetch live event data with retry logic
          const liveResponse = await this.fetchWithRetry(
            `https://fantasy.premierleague.com/api/event/${gameweek.id}/live/`,
            3,
            2000
          );
          
          if (!liveResponse.ok) {
            console.warn(`⚠️ Skipping GW${gameweek.id} - API returned ${liveResponse.status}`);
            continue;
          }
          
          const liveData = await liveResponse.json();
          
          // Process each player's stats for this gameweek
          for (const playerData of liveData.elements) {
            const playerId = playerData.id;
            const player = playerMap.get(playerId);
            
            if (!player) continue;
            
            // Initialize player data if not exists
            if (!cbitData.has(playerId)) {
              cbitData.set(playerId, {
                playerId,
                playerName: `${player.first_name} ${player.second_name}`,
                teamName: teamMap.get(player.team) || 'Unknown',
                position: this.getPositionName(player.element_type),
                gameweekData: {},
                pointsData: {},
                totalCbitStats: 0,
                totalCbitPoints: 0
              });
            }
            
            const playerCbitData = cbitData.get(playerId);
            
            // Extract defensive stats (handle null/undefined gracefully)
            const stats = playerData.stats || {};
            const clearances = stats.clearances_blocks_interceptions || 0;
            const tackles = stats.tackles || 0;
            const recoveries = stats.recoveries || 0;
            
            // Calculate CBIT points based on position
            let cbitPoints = 0;
            let cbitStats = 0;
            
            if (player.element_type === 2) {
              // Defenders: (clearances_blocks_interceptions + tackles) >= 10 → 2 points
              cbitStats = clearances + tackles;
              cbitPoints = cbitStats >= 10 ? 2 : 0;
            } else if (player.element_type === 3 || player.element_type === 4) {
              // Midfielders/Forwards: (clearances_blocks_interceptions + tackles + recoveries) >= 12 → 2 points
              cbitStats = clearances + tackles + recoveries;
              cbitPoints = cbitStats >= 12 ? 2 : 0;
            }
            // Goalkeepers (element_type=1) don't get CBIT points
            
            // Store gameweek data
            playerCbitData.gameweekData[gameweek.id] = cbitStats;
            playerCbitData.pointsData[gameweek.id] = cbitPoints;
            playerCbitData.totalCbitStats += cbitStats;
            playerCbitData.totalCbitPoints += cbitPoints;
          }
          
          // Small delay to be respectful to FPL API
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.warn(`⚠️ Error processing gameweek ${gameweek.id}:`, error.message);
          continue;
        }
      }
      
      // Clear existing data
      await db.delete(cachedPlayerCbitPoints);
      
      // Convert map to array and calculate averages
      const cbitArray = Array.from(cbitData.values()).map(player => ({
        ...player,
        averagePerGameweek: completedGameweeks.length > 0 ? 
          player.totalCbitPoints / completedGameweeks.length : 0
      }));
      
      // Insert new data in batches
      const batchSize = 50;
      for (let i = 0; i < cbitArray.length; i += batchSize) {
        const batch = cbitArray.slice(i, i + batchSize);
        await db.insert(cachedPlayerCbitPoints).values(
          batch.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            gameweekData: player.gameweekData,
            pointsData: player.pointsData,
            totalValue: player.totalCbitStats,
            totalPoints: player.totalCbitPoints,
            averagePerGameweek: player.averagePerGameweek,
            lastUpdated: new Date()
          }))
        );
      }
      
      console.log(`✅ Cached ${cbitArray.length} player CBIT points records`);
    } catch (error) {
      console.error("❌ Failed to cache player CBIT points:", error);
      throw error;
    }
  }

  /**
   * Helper method to fetch with retry logic for FPL API calls
   */
  private async fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FPL-Analytics/1.0)',
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (i === retries - 1) throw error;
        
        const errorMsg = error instanceof Error && error.name === 'AbortError' 
          ? 'timeout' 
          : String(error);
        console.warn(`FPL API ${url} failed: ${errorMsg}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
    throw new Error('All retries failed');
  }

  /**
   * Helper function to get position name from element type
   */
  private getPositionName(elementType: number): string {
    switch (elementType) {
      case 1: return 'goalkeeper';
      case 2: return 'defender';
      case 3: return 'midfielder';
      case 4: return 'forward';
      default: return 'midfielder';
    }
  }

  /**
   * Get cached player CBIT points data
   * Returns object keyed by playerId to match frontend expectations
   */
  async getCachedPlayerCbitPoints(): Promise<{ [playerId: string]: { gameweeks: Array<{ gameweek: number; cbitPoints: number; tackles: number; recoveries: number; clearances_blocks_interceptions: number; }>; seasonTotal: number; } }> {
    const data = await db.select().from(cachedPlayerCbitPoints).orderBy(cachedPlayerCbitPoints.totalPoints);
    
    // If no data is cached, return empty object (will trigger fallback calculation)
    if (data.length === 0) {
      console.warn("⚠️ No CBIT points data found in cache - returning empty object");
      return {};
    }
    
    // Transform array data into object keyed by playerId
    const result: { [playerId: string]: { gameweeks: Array<{ gameweek: number; cbitPoints: number; tackles: number; recoveries: number; clearances_blocks_interceptions: number; }>; seasonTotal: number; } } = {};
    
    data.forEach(record => {
      // Parse gameweek data (stored as jsonb)
      const gameweekData = record.gameweekData as any || {};
      const pointsData = record.pointsData as any || {};
      
      // Build gameweeks array with proper structure
      const gameweeks = Object.keys(gameweekData).map(gw => {
        const gameweek = parseInt(gw);
        const cbitPoints = pointsData[gw] || 0;
        const cbitStats = gameweekData[gw] || 0;
        
        return {
          gameweek,
          cbitPoints,
          tackles: Math.floor(cbitStats * 0.4), // Approximate distribution
          recoveries: Math.floor(cbitStats * 0.4), // Approximate distribution
          clearances_blocks_interceptions: Math.floor(cbitStats * 0.2) // Approximate distribution
        };
      }).sort((a, b) => a.gameweek - b.gameweek);
      
      result[record.playerId.toString()] = {
        gameweeks,
        seasonTotal: record.totalPoints || 0
      };
    });
    
    return result;
  }
}

export const fplScoringCacheService = new FPLScoringCacheService();
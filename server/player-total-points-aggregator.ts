import { db } from "./db";
import { 
  cachedPlayerSaves,
  cachedPlayerGoalsConceded,
  cachedPlayerYellowCards,
  cachedPlayerRedCards,
  cachedPlayerBonusPoints,
  cachedPlayerCbitPoints,
  cachedPlayerSavePoints,
  cachedPlayerMinutesPoints,
  cachedPlayerTotalPoints,
  playerGoalsProjections,
  playerAssistProjections,
  playerMappings
} from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { internalFetch } from "./config";

interface PlayerPointsData {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  gameweekPoints: { [gameweek: string]: number };
  totalPoints: number;
}

export class PlayerTotalPointsAggregator {
  
  /**
   * Aggregate individual component caches into comprehensive Total Points cache
   */
  async aggregatePlayerTotalPoints(startGameweek: number = 6, endGameweek: number = 11): Promise<void> {
    console.log(`🔧 Starting Player Total Points aggregation for GW${startGameweek}-${endGameweek}...`);
    
    try {
      // Step 1: Fetch all individual component caches
      const [
        savesData,
        goalsConcededData,
        yellowCardsData,
        redCardsData,
        bonusPointsData,
        cbitPointsData,
        savePointsData,
        minutesPointsData,
        goalsPointsData,
        assistsPointsData
      ] = await Promise.all([
        this.fetchSavesData(),
        this.fetchGoalsConcededData(),
        this.fetchYellowCardsData(),
        this.fetchRedCardsData(),
        this.fetchBonusPointsData(),
        this.fetchCbitPointsData(),
        this.fetchSavePointsData(),
        this.fetchMinutesPointsData(),
        this.fetchGoalsPointsData(startGameweek, endGameweek),
        this.fetchAssistsPointsData(startGameweek, endGameweek)
      ]);

      console.log(`📊 Component data fetched - Saves: ${savesData.length}, Goals Conceded: ${goalsConcededData.length}, Cards: ${yellowCardsData.length + redCardsData.length}, Bonus: ${bonusPointsData.length}, CBIT: ${cbitPointsData.length}, Save Points: ${savePointsData.length}, Minutes: ${minutesPointsData.length}, Goals: ${goalsPointsData.length}, Assists: ${assistsPointsData.length}`);

      // Step 2: Aggregate all components by player
      const playerTotalPointsMap = new Map<number, PlayerPointsData>();

      // Aggregate each component
      this.aggregateComponentData(playerTotalPointsMap, savesData, "saves");
      this.aggregateComponentData(playerTotalPointsMap, goalsConcededData, "goalsConceded");
      this.aggregateComponentData(playerTotalPointsMap, yellowCardsData, "yellowCards");
      this.aggregateComponentData(playerTotalPointsMap, redCardsData, "redCards");
      this.aggregateComponentData(playerTotalPointsMap, bonusPointsData, "bonusPoints");
      this.aggregateComponentData(playerTotalPointsMap, cbitPointsData, "cbitPoints");
      this.aggregateComponentData(playerTotalPointsMap, savePointsData, "savePoints");
      this.aggregateMinutesData(playerTotalPointsMap, minutesPointsData);
      this.aggregateGoalsAssistsData(playerTotalPointsMap, goalsPointsData, "goals");
      this.aggregateGoalsAssistsData(playerTotalPointsMap, assistsPointsData, "assists");

      console.log(`🔄 Aggregated data for ${playerTotalPointsMap.size} players`);

      // Step 3: Clear existing cached data and insert new aggregated data
      await db.delete(cachedPlayerTotalPoints);
      
      const aggregatedData = Array.from(playerTotalPointsMap.values());
      const batchSize = 50;
      
      for (let i = 0; i < aggregatedData.length; i += batchSize) {
        const batch = aggregatedData.slice(i, i + batchSize);
        await db.insert(cachedPlayerTotalPoints).values(
          batch.map(player => ({
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            gameweekData: player.gameweekPoints,
            totalPointsData: player.gameweekPoints,
            totalExpectedPoints: player.totalPoints,
            averagePerGameweek: player.totalPoints / Object.keys(player.gameweekPoints).length,
            lastUpdated: new Date()
          }))
        );
      }

      console.log(`✅ Player Total Points aggregation completed successfully - ${aggregatedData.length} players cached`);
      
    } catch (error) {
      console.error("❌ Player Total Points aggregation failed:", error);
      throw error;
    }
  }

  /**
   * Fetch cached saves data
   */
  private async fetchSavesData() {
    return await db.select().from(cachedPlayerSaves);
  }

  /**
   * Fetch cached goals conceded data
   */
  private async fetchGoalsConcededData() {
    return await db.select().from(cachedPlayerGoalsConceded);
  }

  /**
   * Fetch cached yellow cards data
   */
  private async fetchYellowCardsData() {
    return await db.select().from(cachedPlayerYellowCards);
  }

  /**
   * Fetch cached red cards data
   */
  private async fetchRedCardsData() {
    return await db.select().from(cachedPlayerRedCards);
  }

  /**
   * Fetch cached bonus points data
   */
  private async fetchBonusPointsData() {
    return await db.select().from(cachedPlayerBonusPoints);
  }

  /**
   * Fetch cached CBIT points data
   */
  private async fetchCbitPointsData() {
    return await db.select().from(cachedPlayerCbitPoints);
  }

  /**
   * Fetch cached save points data
   */
  private async fetchSavePointsData() {
    return await db.select().from(cachedPlayerSavePoints);
  }

  /**
   * Fetch cached minutes points data
   */
  private async fetchMinutesPointsData() {
    return await db.select().from(cachedPlayerMinutesPoints);
  }

  /**
   * Fetch and convert goals projection data to points
   */
  private async fetchGoalsPointsData(startGameweek: number, endGameweek: number) {
    try {
      // PERFORMANCE OPTIMIZATION: Direct database query instead of internal HTTP call
      console.log(`🚀 OPTIMIZATION: Using direct database query for goals data (eliminating HTTP call)`);
      
      // Get goals data with player metadata
      const goalsData = await db
        .select({
          playerId: playerGoalsProjections.playerId,
          gameweek: playerGoalsProjections.gameweek,
          goals: playerGoalsProjections.goals,
          playerName: playerMappings.webName,
          teamName: playerMappings.currentTeamName,
          position: playerMappings.position
        })
        .from(playerGoalsProjections)
        .leftJoin(playerMappings, eq(playerGoalsProjections.playerId, playerMappings.id))
        .where(
          and(
            gte(playerGoalsProjections.gameweek, startGameweek),
            lte(playerGoalsProjections.gameweek, endGameweek)
          )
        );
      
      // Group by player and build gameweek projections object
      const playerMap = new Map<number, any>();
      
      for (const record of goalsData) {
        if (!playerMap.has(record.playerId)) {
          playerMap.set(record.playerId, {
            playerId: record.playerId,
            playerName: record.playerName || `Player ${record.playerId}`,
            teamName: record.teamName || 'Unknown Team',
            position: record.position || 'Unknown',
            gameweekProjections: {}
          });
        }
        
        const player = playerMap.get(record.playerId)!;
        player.gameweekProjections[`gw${record.gameweek}`] = record.goals || 0;
      }
      
      // Convert to array and calculate points
      return Array.from(playerMap.values()).map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: this.convertGoalsToPoints(player.gameweekProjections, player.position),
        totalPoints: Object.values(this.convertGoalsToPoints(player.gameweekProjections, player.position)).reduce((sum: number, points: any) => sum + points, 0)
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch goals points data, using empty array:", error);
      return [];
    }
  }

  /**
   * Fetch and convert assists projection data to points
   */
  private async fetchAssistsPointsData(startGameweek: number, endGameweek: number) {
    try {
      // PERFORMANCE OPTIMIZATION: Direct database query instead of internal HTTP call
      console.log(`🚀 OPTIMIZATION: Using direct database query for assists data (eliminating HTTP call)`);
      
      // Get assists data with player metadata
      const assistsData = await db
        .select({
          playerId: playerAssistProjections.playerId,
          gameweek: playerAssistProjections.gameweek,
          assists: playerAssistProjections.assists,
          playerName: playerMappings.webName,
          teamName: playerMappings.currentTeamName,
          position: playerMappings.position
        })
        .from(playerAssistProjections)
        .leftJoin(playerMappings, eq(playerAssistProjections.playerId, playerMappings.id))
        .where(
          and(
            gte(playerAssistProjections.gameweek, startGameweek),
            lte(playerAssistProjections.gameweek, endGameweek)
          )
        );
      
      // Group by player and build gameweek projections object
      const playerMap = new Map<number, any>();
      
      for (const record of assistsData) {
        if (!playerMap.has(record.playerId)) {
          playerMap.set(record.playerId, {
            playerId: record.playerId,
            playerName: record.playerName || `Player ${record.playerId}`,
            teamName: record.teamName || 'Unknown Team',
            position: record.position || 'Unknown',
            gameweekProjections: {}
          });
        }
        
        const player = playerMap.get(record.playerId)!;
        player.gameweekProjections[`gw${record.gameweek}`] = record.assists || 0;
      }
      
      // Convert to array and calculate points
      return Array.from(playerMap.values()).map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: this.convertAssistsToPoints(player.gameweekProjections),
        totalPoints: Object.values(this.convertAssistsToPoints(player.gameweekProjections)).reduce((sum: number, points: any) => sum + points, 0)
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch assists points data, using empty array:", error);
      return [];
    }
  }

  /**
   * Convert goals projections to FPL points
   */
  private convertGoalsToPoints(goalProjections: { [gameweek: string]: number }, position: string): { [gameweek: string]: number } {
    const goalPoints: { [gameweek: string]: number } = {};
    
    // Safety check: return empty object if goalProjections is null/undefined
    if (!goalProjections || typeof goalProjections !== 'object') {
      return goalPoints;
    }
    
    // FPL scoring: Forwards/Midfielders = 4 points, Defenders/Goalkeepers = 6 points
    const pointsPerGoal = (position === "Forward" || position === "Midfielder") ? 4 : 6;
    
    for (const [gameweek, goals] of Object.entries(goalProjections)) {
      goalPoints[gameweek] = goals * pointsPerGoal;
    }
    
    return goalPoints;
  }

  /**
   * Convert assists projections to FPL points (3 points per assist for all positions)
   */
  private convertAssistsToPoints(assistProjections: { [gameweek: string]: number }): { [gameweek: string]: number } {
    const assistPoints: { [gameweek: string]: number } = {};
    
    // Safety check: return empty object if assistProjections is null/undefined
    if (!assistProjections || typeof assistProjections !== 'object') {
      return assistPoints;
    }
    
    for (const [gameweek, assists] of Object.entries(assistProjections)) {
      assistPoints[gameweek] = assists * 3; // 3 points per assist
    }
    
    return assistPoints;
  }

  /**
   * Aggregate component data into player total points map
   */
  private aggregateComponentData(
    playerMap: Map<number, PlayerPointsData>, 
    componentData: any[], 
    componentName: string
  ) {
    for (const component of componentData) {
      if (!playerMap.has(component.playerId)) {
        playerMap.set(component.playerId, {
          playerId: component.playerId,
          playerName: component.playerName,
          teamName: component.teamName,
          position: component.position,
          gameweekPoints: {},
          totalPoints: 0
        });
      }

      const player = playerMap.get(component.playerId)!;
      const pointsData = component.pointsData || {};

      // Add points from this component to each gameweek
      for (const [gameweek, points] of Object.entries(pointsData)) {
        if (!player.gameweekPoints[gameweek]) {
          player.gameweekPoints[gameweek] = 0;
        }
        player.gameweekPoints[gameweek] += Number(points) || 0;
      }

      // Add to total points
      player.totalPoints += component.totalPoints || 0;
    }
  }

  /**
   * Aggregate minutes data (different structure)
   */
  private aggregateMinutesData(playerMap: Map<number, PlayerPointsData>, minutesData: any[]) {
    for (const minutesComponent of minutesData) {
      if (!playerMap.has(minutesComponent.playerId)) {
        // Skip if player not found in other components
        continue;
      }

      const player = playerMap.get(minutesComponent.playerId)!;
      const gameweeksData = minutesComponent.gameweeksData || {};

      // Minutes points are in gameweeksData structure
      for (const [gameweek, data] of Object.entries(gameweeksData)) {
        if (!player.gameweekPoints[gameweek]) {
          player.gameweekPoints[gameweek] = 0;
        }
        const minutesPoints = (data as any)?.points || 0;
        player.gameweekPoints[gameweek] += minutesPoints;
      }

      // Add season total to total points
      player.totalPoints += minutesComponent.seasonTotal || 0;
    }
  }

  /**
   * Aggregate goals/assists data (from API responses)
   */
  private aggregateGoalsAssistsData(
    playerMap: Map<number, PlayerPointsData>, 
    goalsAssistsData: any[], 
    type: "goals" | "assists"
  ) {
    for (const component of goalsAssistsData) {
      if (!playerMap.has(component.playerId)) {
        playerMap.set(component.playerId, {
          playerId: component.playerId,
          playerName: component.playerName,
          teamName: component.teamName,
          position: component.position,
          gameweekPoints: {},
          totalPoints: 0
        });
      }

      const player = playerMap.get(component.playerId)!;
      const pointsData = component.pointsData || {};

      // Add points from this component to each gameweek
      for (const [gameweek, points] of Object.entries(pointsData)) {
        if (!player.gameweekPoints[gameweek]) {
          player.gameweekPoints[gameweek] = 0;
        }
        player.gameweekPoints[gameweek] += Number(points) || 0;
      }

      // Add to total points
      player.totalPoints += component.totalPoints || 0;
    }
  }
}
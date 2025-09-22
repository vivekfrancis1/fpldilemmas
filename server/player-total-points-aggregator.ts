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
  playerAssistProjections
} from "@shared/schema";
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

      // Step 3: Calculate breakdown totals for each player
      console.log("🔢 Calculating breakdown totals for frontend display...");
      
      // Create lookup maps for breakdown totals
      const goalsBreakdown = new Map<number, number>();
      const assistsBreakdown = new Map<number, number>();
      const cleanSheetsBreakdown = new Map<number, number>();
      const defensiveBreakdown = new Map<number, number>();
      const minutesBreakdown = new Map<number, number>();
      const bonusBreakdown = new Map<number, number>();
      const savesBreakdown = new Map<number, number>();
      const goalsConcededBreakdown = new Map<number, number>();
      const yellowCardsBreakdown = new Map<number, number>();
      const redCardsBreakdown = new Map<number, number>();
      
      // Calculate goals totals
      for (const goalData of goalsPointsData) {
        goalsBreakdown.set(goalData.playerId, goalData.totalPoints);
      }
      
      // Calculate assists totals
      for (const assistData of assistsPointsData) {
        assistsBreakdown.set(assistData.playerId, assistData.totalPoints);
      }
      
      // Calculate other component totals with null safety
      for (const [playerId, cbitData] of Object.entries(cbitPointsData || {})) {
        if (cbitData && cbitData.gameweeks) {
          defensiveBreakdown.set(Number(playerId), Object.values(cbitData.gameweeks).reduce((sum: number, gw: any) => sum + (gw?.points || 0), 0));
        }
      }
      
      for (const [playerId, minutesData] of Object.entries(minutesPointsData || {})) {
        if (minutesData && minutesData.gameweeks) {
          minutesBreakdown.set(Number(playerId), Object.values(minutesData.gameweeks).reduce((sum: number, gw: any) => sum + (gw?.points || 0), 0));
        }
      }
      
      for (const [playerId, bonusData] of Object.entries(bonusPointsData || {})) {
        if (bonusData && bonusData.gameweeks) {
          bonusBreakdown.set(Number(playerId), Object.values(bonusData.gameweeks).reduce((sum: number, gw: any) => sum + (gw?.points || 0), 0));
        }
      }
      
      for (const [playerId, savesData] of Object.entries(savePointsData || {})) {
        if (savesData && savesData.gameweeks) {
          savesBreakdown.set(Number(playerId), Object.values(savesData.gameweeks).reduce((sum: number, gw: any) => sum + (gw?.points || 0), 0));
        }
      }
      
      // Step 4: Clear existing cached data and insert new aggregated data with breakdown totals
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
            // Add breakdown totals for frontend
            totalPointsFromGoals: goalsBreakdown.get(player.playerId) || 0,
            totalPointsFromAssists: assistsBreakdown.get(player.playerId) || 0,
            totalPointsFromDefensiveContributions: defensiveBreakdown.get(player.playerId) || 0,
            totalPointsFromMinutes: minutesBreakdown.get(player.playerId) || 0,
            totalPointsFromBonus: bonusBreakdown.get(player.playerId) || 0,
            totalPointsFromSaves: savesBreakdown.get(player.playerId) || 0,
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
   * Fetch and convert goals projection data to points - WITH RESILIENT FALLBACK
   */
  private async fetchGoalsPointsData(startGameweek: number, endGameweek: number) {
    try {
      // First try: Use cached database data directly
      console.log("🔄 Attempting to fetch goals data from cached database...");
      const cachedGoalsData = await db.select().from(playerGoalsProjections);
      
      if (cachedGoalsData.length > 0) {
        console.log(`✅ Using cached goals database data: ${cachedGoalsData.length} records`);
        
        // Convert cached data to expected format with null safety
        return cachedGoalsData.map((player: any) => {
          // Parse JSON data if it's stored as JSON, with null safety
          let goalProjections = null;
          try {
            if (player.gameweekData) {
              goalProjections = typeof player.gameweekData === 'string' 
                ? JSON.parse(player.gameweekData) 
                : player.gameweekData;
            }
          } catch (error) {
            console.warn(`Failed to parse gameweekData for player ${player.playerId}:`, error);
            goalProjections = {};
          }
          
          // Ensure goalProjections is a valid object
          if (!goalProjections || typeof goalProjections !== 'object') {
            goalProjections = {};
          }
            
          return {
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            pointsData: this.convertGoalsToPoints(goalProjections, player.position),
            totalPoints: Object.values(this.convertGoalsToPoints(goalProjections, player.position)).reduce((sum: number, points: any) => sum + points, 0)
          };
        });
      }
      
      // Second try: API call with extended timeout
      console.log("🌐 Cached data empty, trying API with extended timeout...");
      const response = await internalFetch(`api/cached/player-goals-projections`, 10000); // 10 second timeout
      if (response.ok) {
        const goalsData = await response.json();
        console.log(`✅ API call successful: ${goalsData.length} goals records`);
        
        // Convert API response to points format
        return goalsData.map((player: any) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: player.teamName,
          position: player.position,
          pointsData: this.convertGoalsToPoints(player.goalProjections || player.gameweekProjections, player.position),
          totalPoints: Object.values(this.convertGoalsToPoints(player.goalProjections || player.gameweekProjections, player.position)).reduce((sum: number, points: any) => sum + points, 0)
        }));
      }
      
      throw new Error(`API call failed: ${response.statusText}`);
      
    } catch (error) {
      console.warn("⚠️ All goals data sources failed, using empty array:", error);
      return [];
    }
  }

  /**
   * Fetch and convert assists projection data to points - WITH RESILIENT FALLBACK
   */
  private async fetchAssistsPointsData(startGameweek: number, endGameweek: number) {
    try {
      // First try: Use cached database data directly
      console.log("🔄 Attempting to fetch assists data from cached database...");
      const cachedAssistsData = await db.select().from(playerAssistProjections);
      
      if (cachedAssistsData.length > 0) {
        console.log(`✅ Using cached assists database data: ${cachedAssistsData.length} records`);
        
        // Convert cached data to expected format with null safety
        return cachedAssistsData.map((player: any) => {
          // Parse JSON data if it's stored as JSON, with null safety
          let assistProjections = null;
          try {
            if (player.gameweekData) {
              assistProjections = typeof player.gameweekData === 'string' 
                ? JSON.parse(player.gameweekData) 
                : player.gameweekData;
            }
          } catch (error) {
            console.warn(`Failed to parse gameweekData for player ${player.playerId}:`, error);
            assistProjections = {};
          }
          
          // Ensure assistProjections is a valid object
          if (!assistProjections || typeof assistProjections !== 'object') {
            assistProjections = {};
          }
            
          return {
            playerId: player.playerId,
            playerName: player.playerName,
            teamName: player.teamName,
            position: player.position,
            pointsData: this.convertAssistsToPoints(assistProjections),
            totalPoints: Object.values(this.convertAssistsToPoints(assistProjections)).reduce((sum: number, points: any) => sum + points, 0)
          };
        });
      }
      
      // Second try: API call with extended timeout
      console.log("🌐 Cached data empty, trying API with extended timeout...");
      const response = await internalFetch(`api/cached/player-assists-projections`, 10000); // 10 second timeout
      if (response.ok) {
        const assistsData = await response.json();
        console.log(`✅ API call successful: ${assistsData.length} assists records`);
        
        // Convert API response to points format
        return assistsData.map((player: any) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: player.teamName,
          position: player.position,
          pointsData: this.convertAssistsToPoints(player.assistProjections || player.gameweekProjections),
          totalPoints: Object.values(this.convertAssistsToPoints(player.assistProjections || player.gameweekProjections)).reduce((sum: number, points: any) => sum + points, 0)
        }));
      }
      
      throw new Error(`API call failed: ${response.statusText}`);
      
    } catch (error) {
      console.warn("⚠️ All assists data sources failed, using empty array:", error);
      return [];
    }
  }

  /**
   * Convert goals projections to FPL points - WITH NULL SAFETY
   */
  private convertGoalsToPoints(goalProjections: { [gameweek: string]: number } | null | undefined, position: string): { [gameweek: string]: number } {
    const goalPoints: { [gameweek: string]: number } = {};
    
    // Null safety check
    if (!goalProjections || typeof goalProjections !== 'object') {
      return goalPoints;
    }
    
    // FPL scoring: Forwards/Midfielders = 4 points, Defenders/Goalkeepers = 6 points
    const pointsPerGoal = (position === "Forward" || position === "Midfielder") ? 4 : 6;
    
    try {
      for (const [gameweek, goals] of Object.entries(goalProjections)) {
        const goalValue = Number(goals) || 0;
        goalPoints[gameweek] = goalValue * pointsPerGoal;
      }
    } catch (error) {
      console.warn(`Error converting goals to points for position ${position}:`, error);
    }
    
    return goalPoints;
  }

  /**
   * Convert assists projections to FPL points (3 points per assist for all positions) - WITH NULL SAFETY
   */
  private convertAssistsToPoints(assistProjections: { [gameweek: string]: number } | null | undefined): { [gameweek: string]: number } {
    const assistPoints: { [gameweek: string]: number } = {};
    
    // Null safety check
    if (!assistProjections || typeof assistProjections !== 'object') {
      return assistPoints;
    }
    
    try {
      for (const [gameweek, assists] of Object.entries(assistProjections)) {
        const assistValue = Number(assists) || 0;
        assistPoints[gameweek] = assistValue * 3; // 3 points per assist
      }
    } catch (error) {
      console.warn(`Error converting assists to points:`, error);
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
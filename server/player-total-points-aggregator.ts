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
  CURRENT_SEASON
} from "@shared/schema";
import { internalFetch } from "./config";
import { storage } from "./storage";

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
  async aggregatePlayerTotalPoints(startGameweek: number = 12, endGameweek: number = 23): Promise<void> {
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
      
      // Step 4: Also save to persistent database storage for historical tracking
      await this.saveToDatabaseStorage(aggregatedData, startGameweek, endGameweek);
      
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
      // Use fast cached endpoint instead of slow API
      const response = await internalFetch(`api/cached/player-goals-projections`);
      if (!response.ok) throw new Error(`Failed to fetch goals data: ${response.statusText}`);
      
      const goalsData = await response.json();
      
      // Convert goals projections to points using FPL scoring rules
      return goalsData.map((player: any) => ({
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
      // Use fast cached endpoint instead of slow API
      const response = await internalFetch(`api/cached/player-assists-projections`);
      if (!response.ok) throw new Error(`Failed to fetch assists data: ${response.statusText}`);
      
      const assistsData = await response.json();
      
      // Convert assists projections to points using FPL scoring rules (3 points per assist)
      return assistsData.map((player: any) => ({
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
      // NORMALIZE KEYS: Convert "gw13" format to numeric "13" for consistency
      for (const [gameweek, points] of Object.entries(pointsData)) {
        const normalizedGW = gameweek.replace(/^gw/i, ''); // Remove "gw" prefix if present
        if (!player.gameweekPoints[normalizedGW]) {
          player.gameweekPoints[normalizedGW] = 0;
        }
        player.gameweekPoints[normalizedGW] += Number(points) || 0;
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
      // NORMALIZE KEYS: Convert "gw13" format to numeric "13" for consistency
      for (const [gameweek, points] of Object.entries(pointsData)) {
        const normalizedGW = gameweek.replace(/^gw/i, ''); // Remove "gw" prefix if present
        if (!player.gameweekPoints[normalizedGW]) {
          player.gameweekPoints[normalizedGW] = 0;
        }
        player.gameweekPoints[normalizedGW] += Number(points) || 0;
      }

      // Add to total points
      player.totalPoints += component.totalPoints || 0;
    }
  }

  /**
   * Save aggregated data to persistent database storage for historical tracking
   */
  private async saveToDatabaseStorage(
    aggregatedData: PlayerPointsData[], 
    startGameweek: number, 
    endGameweek: number
  ): Promise<void> {
    try {
      console.log(`💾 Saving Player Total Points to database storage (GW${startGameweek}-${endGameweek})...`);
      
      // Step 1: Create or get active window
      let activeWindow = await storage.getActivePlayerTotalPointsWindow();
      
      if (!activeWindow || activeWindow.startGameweek !== startGameweek || activeWindow.endGameweek !== endGameweek) {
        // Create new window for current gameweek range
        const windowResponse = await storage.createPlayerTotalPointsWindow(startGameweek, endGameweek, CURRENT_SEASON);
        activeWindow = {
          windowId: windowResponse.windowId,
          startGameweek,
          endGameweek
        };
        console.log(`📊 Created new Player Total Points window: ${activeWindow.windowId}`);
      } else {
        console.log(`📊 Using existing active window: ${activeWindow.windowId}`);
      }

      // Step 2: Fetch current bootstrap data for price and ownership
      const bootstrapResponse = await internalFetch('api/bootstrap-static');
      if (!bootstrapResponse.ok) {
        throw new Error('Failed to fetch bootstrap data for prices and ownership');
      }
      const bootstrapData = await bootstrapResponse.json();
      const playersData = bootstrapData.elements || [];
      const teamsData = bootstrapData.teams || [];

      // Create lookup maps
      const playersMap = new Map(playersData.map((p: any) => [p.id, p]));
      const teamsMap = new Map(teamsData.map((t: any) => [t.id, t]));

      // Step 3: Transform aggregated data into snapshot format
      const snapshots = aggregatedData.map(player => {
        const playerBootstrap = playersMap.get(player.playerId);
        const team = playerBootstrap ? teamsMap.get(playerBootstrap.team) : null;

        return {
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: team?.short_name || player.teamName,
          position: player.position,
          price: playerBootstrap ? playerBootstrap.now_cost / 10 : 0, // Convert from tenths
          ownership: playerBootstrap ? parseFloat(playerBootstrap.selected_by_percent || '0') : 0,
          totalProjectedPoints: player.totalPoints,
          averagePointsPerGameweek: player.totalPoints / Math.max(Object.keys(player.gameweekPoints).length, 1),
          averageValue: playerBootstrap ? 
            (player.totalPoints / Math.max(playerBootstrap.now_cost / 10, 0.1)) : 0, // Points per million
          averageMinutes: 60, // Default estimate - could be enhanced with actual minutes data
          gameweekBreakdown: player.gameweekPoints
        };
      });

      // Step 4: Save snapshots to database
      await storage.savePlayerTotalPointsSnapshots(activeWindow.windowId, snapshots);
      
      console.log(`✅ Successfully saved ${snapshots.length} Player Total Points snapshots to database storage`);
      
    } catch (error) {
      console.error("❌ Failed to save Player Total Points to database storage:", error);
      // Don't throw error to avoid breaking the main aggregation process
    }
  }
}
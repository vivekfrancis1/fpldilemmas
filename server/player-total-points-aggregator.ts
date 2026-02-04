import { db } from "./db";
import { 
  playerGoalsProjections,
  playerAssistProjections,
  playerTotalPointsSnapshots,
  playerTotalPointsWindows,
  CURRENT_SEASON
} from "@shared/schema";
import { internalFetch } from "./config";
import { storage } from "./storage";
import { sql } from "drizzle-orm";

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
        assistsPointsData,
        cleanSheetPointsData
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
        this.fetchAssistsPointsData(startGameweek, endGameweek),
        this.fetchCleanSheetPointsData(startGameweek, endGameweek)
      ]);

      console.log(`📊 Component data fetched - Saves: ${savesData.length}, Goals Conceded: ${goalsConcededData.length}, Cards: ${yellowCardsData.length + redCardsData.length}, Bonus: ${bonusPointsData.length}, CBIT: ${cbitPointsData.length}, Save Points: ${savePointsData.length}, Minutes: ${minutesPointsData.length}, Goals: ${goalsPointsData.length}, Assists: ${assistsPointsData.length}, CleanSheets: ${cleanSheetPointsData.length}`);

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
      this.aggregateCleanSheetData(playerTotalPointsMap, cleanSheetPointsData);

      console.log(`🔄 Aggregated data for ${playerTotalPointsMap.size} players`);

      const aggregatedData = Array.from(playerTotalPointsMap.values());

      console.log(`✅ Player Total Points aggregation completed successfully - ${aggregatedData.length} players cached`);
      
      // Save to persistent database storage (playerTotalPointsSnapshots)
      await this.saveToDatabaseStorage(aggregatedData, startGameweek, endGameweek);
      
    } catch (error) {
      console.error("❌ Player Total Points aggregation failed:", error);
      throw error;
    }
  }

  /**
   * Fetch saves data from live API
   */
  private async fetchSavesData() {
    try {
      const response = await internalFetch(`api/player-saves-projections?startGameweek=25&endGameweek=36`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: player.pointsFromSaves || {},
        totalPoints: player.totalPoints || 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch saves data:", error);
      return [];
    }
  }

  /**
   * Fetch goals conceded data from live API
   */
  private async fetchGoalsConcededData() {
    try {
      const response = await internalFetch(`api/player-goals-conceded-projections?startGameweek=25&endGameweek=36`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: player.pointsFromGoalsConceded || {},
        totalPoints: player.totalPoints || 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch goals conceded data:", error);
      return [];
    }
  }

  /**
   * Fetch yellow cards data from live API
   */
  private async fetchYellowCardsData() {
    try {
      const response = await internalFetch(`api/player-yellow-cards-projections?startGameweek=25&endGameweek=36`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: player.pointsFromYellowCards || {},
        totalPoints: player.totalPoints || 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch yellow cards data:", error);
      return [];
    }
  }

  /**
   * Fetch red cards data from live API
   */
  private async fetchRedCardsData() {
    try {
      const response = await internalFetch(`api/player-red-cards-projections?startGameweek=25&endGameweek=36`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: player.pointsFromRedCards || {},
        totalPoints: player.totalPoints || 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch red cards data:", error);
      return [];
    }
  }

  /**
   * Fetch bonus points data from live API
   */
  private async fetchBonusPointsData() {
    try {
      const response = await internalFetch(`api/player-bonus-points-projections?startGameweek=25&endGameweek=36`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: player.pointsFromBonus || {},
        totalPoints: player.totalPoints || 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch bonus points data:", error);
      return [];
    }
  }

  /**
   * Fetch CBIT points data - skip for now (included in other components)
   */
  private async fetchCbitPointsData() {
    return []; // CBIT is a combination of other stats, not needed separately
  }

  /**
   * Fetch save points data - already covered by fetchSavesData
   */
  private async fetchSavePointsData() {
    return []; // Already fetched in fetchSavesData
  }

  /**
   * Fetch minutes points data from live API
   */
  private async fetchMinutesPointsData() {
    try {
      const response = await internalFetch(`api/player-minutes-projections`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamShort,
        position: player.position,
        minutesPerGame: player.pointsFromMinutes || 0,
        totalPoints: player.pointsFromMinutes * 12 || 0 // Estimate for 12 gameweeks
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch minutes points data:", error);
      return [];
    }
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
   * Fetch clean sheet points data from API
   */
  private async fetchCleanSheetPointsData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/player-cleansheet-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) throw new Error(`Failed to fetch clean sheet data: ${response.statusText}`);
      
      const cleanSheetData = await response.json();
      
      return cleanSheetData.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.team,
        position: player.position,
        pointsData: player.pointsFromCleanSheets || {},
        totalPoints: player.totalExpectedPoints || 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch clean sheet points data, using empty array:", error);
      return [];
    }
  }

  /**
   * Aggregate clean sheet data into player total points map
   */
  private aggregateCleanSheetData(playerMap: Map<number, PlayerPointsData>, cleanSheetData: any[]) {
    for (const component of cleanSheetData) {
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

      // Add points from clean sheets to each gameweek
      // NORMALIZE KEYS: Convert "gw13" format to numeric "13" for consistency
      for (const [gameweek, points] of Object.entries(pointsData)) {
        const normalizedGW = gameweek.replace(/^gw/i, '');
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
   * Aggregate minutes data - applies per-game points to each future gameweek
   */
  private aggregateMinutesData(playerMap: Map<number, PlayerPointsData>, minutesData: any[]) {
    for (const minutesComponent of minutesData) {
      const playerId = minutesComponent.playerId;
      
      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          playerId: playerId,
          playerName: minutesComponent.playerName,
          teamName: minutesComponent.teamName,
          position: minutesComponent.position,
          gameweekPoints: {},
          totalPoints: 0
        });
      }

      const player = playerMap.get(playerId)!;
      const minutesPerGame = minutesComponent.minutesPerGame || 0;
      
      // Apply minutes points to each gameweek (GW25-36)
      for (let gw = 25; gw <= 36; gw++) {
        const gwKey = String(gw);
        if (!player.gameweekPoints[gwKey]) {
          player.gameweekPoints[gwKey] = 0;
        }
        player.gameweekPoints[gwKey] += minutesPerGame;
      }

      // Add to total points (12 gameweeks)
      player.totalPoints += minutesPerGame * 12;
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
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

interface GWBreakdown {
  goals: number;
  assists: number;
  cleanSheets: number;
  minutes: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
  bonus: number;
  saves: number;
  points: number;
}

interface PlayerPointsData {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  gameweekBreakdown: { [gameweek: string]: GWBreakdown };
  totalPoints: number;
}

function emptyGW(): GWBreakdown {
  return { goals: 0, assists: 0, cleanSheets: 0, minutes: 0, goalsConceded: 0, yellowCards: 0, redCards: 0, bonus: 0, saves: 0, points: 0 };
}

export class PlayerTotalPointsAggregator {
  
  /**
   * Aggregate individual component caches into comprehensive Total Points cache.
   * 
   * FPL Scoring Components (9 total):
   * 1. Minutes (1-2 pts based on minutes played)
   * 2. Goals (4-6 pts based on position)
   * 3. Assists (3 pts)
   * 4. Clean Sheets (1-4 pts based on position)
   * 5. Goals Conceded (-0.5/-1 pts for DEF/GK)
   * 6. Yellow Cards (-1 pt)
   * 7. Red Cards (-3 pts)
   * 8. Bonus (1-3 pts)
   * 9. Saves (1 pt per 3 saves for GK)
   */
  async aggregatePlayerTotalPoints(startGameweek: number = 28, endGameweek: number = 38): Promise<void> {
    console.log(`🔧 Starting Player Total Points aggregation for GW${startGameweek}-${endGameweek}...`);
    
    try {
      // Sequential fetching: process one component at a time so only one large
      // response array is held in memory at once (reduces peak memory by ~9×).
      const playerMap = new Map<number, PlayerPointsData>();

      console.log(`📊 Fetching component 1/9: saves...`);
      this.addComponentPoints(playerMap, await this.fetchSavesData(startGameweek, endGameweek), "saves");

      console.log(`📊 Fetching component 2/9: goals conceded...`);
      this.addComponentPoints(playerMap, await this.fetchGoalsConcededData(startGameweek, endGameweek), "goalsConceded");

      console.log(`📊 Fetching component 3/9: yellow cards...`);
      this.addComponentPoints(playerMap, await this.fetchYellowCardsData(startGameweek, endGameweek), "yellowCards");

      console.log(`📊 Fetching component 4/9: red cards...`);
      this.addComponentPoints(playerMap, await this.fetchRedCardsData(startGameweek, endGameweek), "redCards");

      console.log(`📊 Fetching component 5/9: bonus points...`);
      this.addComponentPoints(playerMap, await this.fetchBonusPointsData(startGameweek, endGameweek), "bonus");

      console.log(`📊 Fetching component 6/9: minutes...`);
      this.addMinutesPoints(playerMap, await this.fetchMinutesPointsData(startGameweek, endGameweek), startGameweek, endGameweek);

      console.log(`📊 Fetching component 7/9: goals scored...`);
      this.addComponentPoints(playerMap, await this.fetchGoalsPointsData(startGameweek, endGameweek), "goals");

      console.log(`📊 Fetching component 8/9: assists...`);
      this.addComponentPoints(playerMap, await this.fetchAssistsPointsData(startGameweek, endGameweek), "assists");

      console.log(`📊 Fetching component 9/9: clean sheets...`);
      this.addComponentPoints(playerMap, await this.fetchCleanSheetPointsData(startGameweek, endGameweek), "cleanSheets");

      console.log(`📊 All 9 components fetched sequentially — peak memory reduced vs concurrent fetch`);

      // Recompute per-GW totals from components
      for (const player of playerMap.values()) {
        let runningTotal = 0;
        for (const gw of Object.values(player.gameweekBreakdown)) {
          gw.points = gw.goals + gw.assists + gw.cleanSheets + gw.minutes + gw.goalsConceded + gw.yellowCards + gw.redCards + gw.bonus + gw.saves;
          runningTotal += gw.points;
        }
        player.totalPoints = runningTotal;
      }

      console.log(`🔄 Aggregated data for ${playerMap.size} players`);
      const aggregatedData = Array.from(playerMap.values());
      console.log(`✅ Player Total Points aggregation completed successfully - ${aggregatedData.length} players cached`);
      
      await this.saveToDatabaseStorage(aggregatedData, startGameweek, endGameweek);
      
    } catch (error) {
      console.error("❌ Player Total Points aggregation failed:", error);
      throw error;
    }
  }

  private ensurePlayer(playerMap: Map<number, PlayerPointsData>, playerId: number, playerName: string, teamName: string, position: string): PlayerPointsData {
    if (!playerMap.has(playerId)) {
      playerMap.set(playerId, {
        playerId,
        playerName,
        teamName,
        position,
        gameweekBreakdown: {},
        totalPoints: 0
      });
    }
    return playerMap.get(playerId)!;
  }

  private ensureGW(player: PlayerPointsData, gwKey: string): GWBreakdown {
    if (!player.gameweekBreakdown[gwKey]) {
      player.gameweekBreakdown[gwKey] = emptyGW();
    }
    return player.gameweekBreakdown[gwKey];
  }

  /**
   * Add points from a component into the per-GW structured breakdown.
   * componentKey maps to the exact field name in GWBreakdown.
   */
  private addComponentPoints(
    playerMap: Map<number, PlayerPointsData>,
    componentData: any[],
    componentKey: keyof Omit<GWBreakdown, "points">
  ) {
    for (const component of componentData) {
      const player = this.ensurePlayer(playerMap, component.playerId, component.playerName, component.teamName, component.position);
      const pointsData = component.pointsData || {};

      for (const [rawKey, points] of Object.entries(pointsData)) {
        const gwKey = rawKey.replace(/^gw/i, '');
        if (isNaN(parseInt(gwKey))) continue;
        const gw = this.ensureGW(player, gwKey);
        gw[componentKey] += Number(points) || 0;
      }
    }
  }

  /**
   * Add minutes points — handles both per-GW objects and flat-rate fallback.
   */
  private addMinutesPoints(playerMap: Map<number, PlayerPointsData>, minutesData: any[], startGameweek: number, endGameweek: number) {
    for (const minutesComponent of minutesData) {
      const player = this.ensurePlayer(playerMap, minutesComponent.playerId, minutesComponent.playerName, minutesComponent.teamName, minutesComponent.position);
      const perGW = minutesComponent.pointsFromMinutesPerGW;
      const flatRate = minutesComponent.minutesPerGame || 0;

      if (perGW && typeof perGW === 'object' && Object.keys(perGW).length > 0) {
        for (const [rawKey, pts] of Object.entries(perGW as Record<string, number>)) {
          const gwKey = rawKey.replace(/^gw/i, '');
          if (isNaN(parseInt(gwKey))) continue;
          const gw = this.ensureGW(player, gwKey);
          gw.minutes += pts;
        }
      } else {
        for (let gwNum = startGameweek; gwNum <= endGameweek; gwNum++) {
          const gwKey = String(gwNum);
          const gw = this.ensureGW(player, gwKey);
          gw.minutes += flatRate;
        }
      }
    }
  }

  private async fetchSavesData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/player-saves-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
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

  private async fetchGoalsConcededData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/player-goals-conceded-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
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

  private async fetchYellowCardsData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/player-yellow-cards-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
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

  private async fetchRedCardsData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/player-red-cards-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
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

  private async fetchBonusPointsData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/player-bonus-points-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
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

  private async fetchMinutesPointsData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/player-minutes-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamShort || player.teamName,
        position: player.position,
        minutesPerGame: player.pointsFromMinutes || 0,
        pointsFromMinutesPerGW: player.pointsFromMinutesPerGW || null
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch minutes points data:", error);
      return [];
    }
  }

  private async fetchGoalsPointsData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/cached/player-goals-projections`);
      if (!response.ok) throw new Error(`Failed to fetch goals data: ${response.statusText}`);
      const goalsData = await response.json();
      return goalsData.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: this.convertGoalsToPoints(player.gameweekProjections, player.position, startGameweek, endGameweek),
        totalPoints: 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch goals points data:", error);
      return [];
    }
  }

  private async fetchAssistsPointsData(startGameweek: number, endGameweek: number) {
    try {
      const response = await internalFetch(`api/cached/player-assists-projections`);
      if (!response.ok) throw new Error(`Failed to fetch assists data: ${response.statusText}`);
      const assistsData = await response.json();
      return assistsData.map((player: any) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        position: player.position,
        pointsData: this.convertAssistsToPoints(player.gameweekProjections, startGameweek, endGameweek),
        totalPoints: 0
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch assists points data:", error);
      return [];
    }
  }

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
      console.warn("⚠️ Failed to fetch clean sheet points data:", error);
      return [];
    }
  }

  private convertGoalsToPoints(
    goalProjections: { [gameweek: string]: number },
    position: string,
    startGameweek: number,
    endGameweek: number
  ): { [gameweek: string]: number } {
    let pointsPerGoal: number;
    if (position === "Goalkeeper" || position === "GKP") pointsPerGoal = 10;
    else if (position === "Defender" || position === "DEF") pointsPerGoal = 6;
    else if (position === "Midfielder" || position === "MID") pointsPerGoal = 5;
    else pointsPerGoal = 4;

    const result: { [gameweek: string]: number } = {};
    for (const [gw, goals] of Object.entries(goalProjections)) {
      const gwNum = parseInt(gw.replace(/^gw/i, ''));
      if (isNaN(gwNum) || gwNum < startGameweek || gwNum > endGameweek) continue;
      result[String(gwNum)] = goals * pointsPerGoal;
    }
    return result;
  }

  private convertAssistsToPoints(
    assistProjections: { [gameweek: string]: number },
    startGameweek: number,
    endGameweek: number
  ): { [gameweek: string]: number } {
    const result: { [gameweek: string]: number } = {};
    for (const [gw, assists] of Object.entries(assistProjections)) {
      const gwNum = parseInt(gw.replace(/^gw/i, ''));
      if (isNaN(gwNum) || gwNum < startGameweek || gwNum > endGameweek) continue;
      result[String(gwNum)] = assists * 3;
    }
    return result;
  }

  private async saveToDatabaseStorage(
    aggregatedData: PlayerPointsData[], 
    startGameweek: number, 
    endGameweek: number
  ): Promise<void> {
    try {
      console.log(`💾 Saving Player Total Points to database storage (GW${startGameweek}-${endGameweek})...`);
      
      let activeWindow = await storage.getActivePlayerTotalPointsWindow();
      
      if (!activeWindow || activeWindow.startGameweek !== startGameweek || activeWindow.endGameweek !== endGameweek) {
        const windowResponse = await storage.createPlayerTotalPointsWindow(startGameweek, endGameweek, CURRENT_SEASON);
        activeWindow = { windowId: windowResponse.windowId, startGameweek, endGameweek };
        console.log(`📊 Created new Player Total Points window: ${activeWindow.windowId}`);
      } else {
        console.log(`📊 Using existing active window: ${activeWindow.windowId}`);
      }

      const bootstrapResponse = await internalFetch('api/bootstrap-static');
      if (!bootstrapResponse.ok) throw new Error('Failed to fetch bootstrap data');
      const bootstrapData = await bootstrapResponse.json();
      const playersMap = new Map((bootstrapData.elements || []).map((p: any) => [p.id, p]));
      const teamsMap = new Map((bootstrapData.teams || []).map((t: any) => [t.id, t]));

      const snapshots = aggregatedData.map(player => {
        const playerBootstrap = playersMap.get(player.playerId) as any;
        const team = playerBootstrap ? (teamsMap.get(playerBootstrap.team) as any) : null;
        const gwCount = Math.max(Object.keys(player.gameweekBreakdown).length, 1);

        return {
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: team?.short_name || player.teamName,
          position: player.position,
          price: playerBootstrap ? playerBootstrap.now_cost / 10 : 0,
          ownership: playerBootstrap ? parseFloat(playerBootstrap.selected_by_percent || '0') : 0,
          totalProjectedPoints: player.totalPoints,
          averagePointsPerGameweek: player.totalPoints / gwCount,
          averageValue: playerBootstrap ? (player.totalPoints / Math.max(playerBootstrap.now_cost / 10, 0.1)) : 0,
          averageMinutes: 60,
          gameweekBreakdown: player.gameweekBreakdown
        };
      });

      await storage.savePlayerTotalPointsSnapshots(activeWindow.windowId, snapshots);
      console.log(`✅ Successfully saved ${snapshots.length} Player Total Points snapshots to database storage`);
      
    } catch (error) {
      console.error("❌ Failed to save Player Total Points to database storage:", error);
    }
  }
}

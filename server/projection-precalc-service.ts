import { db } from "./db";
import { playerProjections } from "@shared/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";

interface PlayerProjectionData {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  position: string;
  elementType: number;
  gameweekProjections: Record<string, number>;
  totalPoints: number;
  totalGoals: number;
  totalAssists: number;
}

interface PlayerGoalProjectionData {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  projectedGoals: Record<string, number>;
  totalGoals: number;
}

class ProjectionPrecalcService {
  private isCalculating = false;
  private lastCalculationTime = 0;
  private readonly CALCULATION_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours

  async ensureProjectionsExist(startGameweek: number = 4, endGameweek: number = 38): Promise<void> {
    // Check if we need to calculate projections
    const shouldCalculate = 
      Date.now() - this.lastCalculationTime > this.CALCULATION_COOLDOWN ||
      await this.areProjectionsMissing(startGameweek, endGameweek);

    if (shouldCalculate && !this.isCalculating) {
      console.log(`🚀 Pre-calculating projections for GW${startGameweek}-${endGameweek}...`);
      await this.precalculateAllProjections(startGameweek, endGameweek);
    }
  }

  private async areProjectionsMissing(startGameweek: number, endGameweek: number): Promise<boolean> {
    try {
      const existingProjections = await db
        .select({ count: sql<number>`count(*)` })
        .from(gameweekProjections)
        .where(
          and(
            gte(gameweekProjections.gameweek, startGameweek),
            lte(gameweekProjections.gameweek, endGameweek)
          )
        );

      const expectedCount = (endGameweek - startGameweek + 1) * 700; // Rough estimate
      const actualCount = existingProjections[0]?.count || 0;
      
      return actualCount < expectedCount * 0.8; // 80% threshold
    } catch (error) {
      console.log("📊 No existing projections found, will calculate fresh data");
      return true;
    }
  }

  async precalculateAllProjections(startGameweek: number = 4, endGameweek: number = 38): Promise<void> {
    if (this.isCalculating) {
      console.log("⏳ Projection calculation already in progress...");
      return;
    }

    this.isCalculating = true;
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting comprehensive projection pre-calculation for GW${startGameweek}-${endGameweek}...`);

      // Calculate projections in batches by gameweek to avoid memory issues
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        console.log(`📊 Pre-calculating GW${gw} projections...`);
        await this.calculateGameweekProjections(gw);
      }

      this.lastCalculationTime = Date.now();
      const duration = Date.now() - startTime;
      console.log(`✅ Projection pre-calculation completed in ${duration}ms for GW${startGameweek}-${endGameweek}`);

    } catch (error) {
      console.error("❌ Projection pre-calculation failed:", error);
      throw error;
    } finally {
      this.isCalculating = false;
    }
  }

  private async calculateGameweekProjections(gameweek: number): Promise<void> {
    try {
      // Use existing API endpoints to get projection data for this gameweek
      const goalsResponse = await fetch(`http://localhost:5000/api/goals-projections-cached`);
      const assistsResponse = await fetch(`http://localhost:5000/api/assist-projections-cached`);
      const minutesResponse = await fetch(`http://localhost:5000/api/minutes-projections-cached`);
      const defensiveResponse = await fetch(`http://localhost:5000/api/defensive-contribution-projections-cached`);
      const cleanSheetsResponse = await fetch(`http://localhost:5000/api/team-cs-projections-cached`);

      if (!goalsResponse.ok || !assistsResponse.ok || !minutesResponse.ok || !defensiveResponse.ok || !cleanSheetsResponse.ok) {
        throw new Error(`Failed to fetch projection data for GW${gameweek}`);
      }

      const goalsData = await goalsResponse.json();
      const assistsData = await assistsResponse.json();
      const minutesData = await minutesResponse.json();
      const defensiveData = await defensiveResponse.json();
      const cleanSheetsData = await cleanSheetsResponse.json();

      // Process each player and store their gameweek projection
      const playerMap = new Map();

      // Collect all player data
      goalsData.forEach((player: any) => {
        if (!playerMap.has(player.playerId)) {
          playerMap.set(player.playerId, {
            playerId: player.playerId,
            playerName: player.playerName,
            teamId: player.teamId,
            teamName: player.teamName,
            position: player.position,
            goals: {},
            assists: {},
            minutes: {},
            defensive: {},
            cleanSheets: 0
          });
        }
        const gwKey = `gw${gameweek}`;
        if (player.projectedGoals && player.projectedGoals[gwKey] !== undefined) {
          playerMap.get(player.playerId).goals[gwKey] = player.projectedGoals[gwKey];
        }
      });

      // Add assists data
      assistsData.forEach((player: any) => {
        if (playerMap.has(player.playerId)) {
          const gwKey = `gw${gameweek}`;
          if (player.projectedAssists && player.projectedAssists[gwKey] !== undefined) {
            playerMap.get(player.playerId).assists[gwKey] = player.projectedAssists[gwKey];
          }
        }
      });

      // Add minutes data  
      minutesData.forEach((player: any) => {
        if (playerMap.has(player.playerId)) {
          const gwKey = `gw${gameweek}`;
          if (player.projectedMinutes && player.projectedMinutes[gwKey] !== undefined) {
            playerMap.get(player.playerId).minutes[gwKey] = player.projectedMinutes[gwKey];
          }
        }
      });

      // Add defensive data
      defensiveData.forEach((player: any) => {
        if (playerMap.has(player.playerId)) {
          const gwKey = `gw${gameweek}`;
          if (player.projectedDefensiveContributions && player.projectedDefensiveContributions[gwKey] !== undefined) {
            playerMap.get(player.playerId).defensive[gwKey] = player.projectedDefensiveContributions[gwKey];
          }
        }
      });

      // Calculate FPL points and store in database
      const projectionRecords = [];
      
      for (const [playerId, playerData] of Array.from(playerMap.entries())) {
        const gwKey = `gw${gameweek}`;
        
        // Calculate FPL points for this gameweek
        const goals = playerData.goals[gwKey] || 0;
        const assists = playerData.assists[gwKey] || 0;
        const minutes = playerData.minutes[gwKey] || 0;
        const defensive = playerData.defensive[gwKey] || 0;
        
        // FPL scoring rules
        const pointsFromGoals = this.calculateGoalPoints(goals, playerData.position);
        const pointsFromAssists = assists * 3;
        const pointsFromMinutes = minutes >= 60 ? 2 : (minutes > 0 ? 1 : 0);
        const pointsFromDefensive = defensive;
        
        const totalGameweekPoints = pointsFromGoals + pointsFromAssists + pointsFromMinutes + pointsFromDefensive;

        projectionRecords.push({
          playerId,
          playerName: playerData.playerName,
          teamId: playerData.teamId,
          teamName: playerData.teamName,
          position: playerData.position,
          gameweek,
          season: "2025/26",
          projectedGoals: goals,
          projectedAssists: assists,
          projectedMinutes: minutes,
          projectedDefensiveContributions: defensive,
          projectedCleanSheets: 0, // Will add clean sheets logic later
          projectedBonus: 0, // Will add bonus logic later
          pointsFromGoals: pointsFromGoals,
          pointsFromAssists: pointsFromAssists,
          pointsFromMinutes: pointsFromMinutes,
          pointsFromDefensiveContributions: pointsFromDefensive,
          pointsFromCleanSheets: 0,
          pointsFromBonus: 0,
          totalGameweekPoints,
          isCompleted: false,
          isCurrent: gameweek === 4 // Assuming GW4 is current
        });
      }

      // Batch insert/upsert to database
      if (projectionRecords.length > 0) {
        await this.batchUpsertProjections(projectionRecords);
        console.log(`✅ Stored ${projectionRecords.length} GW${gameweek} projections`);
      }

    } catch (error) {
      console.error(`❌ Failed to calculate GW${gameweek} projections:`, error);
      throw error;
    }
  }

  private calculateGoalPoints(goals: number, position: string): number {
    // FPL goal scoring rules
    if (position === "Goalkeeper" || position === "Defender") {
      return goals * 6;
    } else if (position === "Midfielder") {
      return goals * 5;
    } else { // Forward
      return goals * 4;
    }
  }

  private async batchUpsertProjections(records: any[]): Promise<void> {
    try {
      // Delete existing records for these gameweeks/players to avoid duplicates
      const gameweeks = [...new Set(records.map(r => r.gameweek))];
      const playerIds = [...new Set(records.map(r => r.playerId))];

      if (gameweeks.length > 0 && playerIds.length > 0) {
        await db.delete(gameweekProjections)
          .where(
            and(
              inArray(gameweekProjections.gameweek, gameweeks),
              inArray(gameweekProjections.playerId, playerIds)
            )
          );

        // Insert new records
        await db.insert(gameweekProjections).values(records);
      }
    } catch (error) {
      console.error("❌ Batch upsert failed:", error);
      throw error;
    }
  }

  async getPreCalculatedGoalProjections(startGameweek: number = 4, endGameweek: number = 9): Promise<PlayerGoalProjectionData[]> {
    try {
      await this.ensureProjectionsExist(startGameweek, endGameweek);

      const projections = await db
        .select({
          playerId: gameweekProjections.playerId,
          playerName: gameweekProjections.playerName,
          teamName: gameweekProjections.teamName,
          position: gameweekProjections.position,
          gameweek: gameweekProjections.gameweek,
          projectedGoals: gameweekProjections.projectedGoals
        })
        .from(gameweekProjections)
        .where(
          and(
            gte(gameweekProjections.gameweek, startGameweek),
            lte(gameweekProjections.gameweek, endGameweek)
          )
        );

      // Group by player and create gameweek data structure
      const playerMap = new Map<number, PlayerGoalProjectionData>();

      projections.forEach(proj => {
        if (!playerMap.has(proj.playerId)) {
          playerMap.set(proj.playerId, {
            playerId: proj.playerId,
            playerName: proj.playerName,
            teamName: proj.teamName,
            position: proj.position,
            projectedGoals: {},
            totalGoals: 0
          });
        }

        const player = playerMap.get(proj.playerId)!;
        const gwKey = `gw${proj.gameweek}`;
        const goals = Number(proj.projectedGoals) || 0;
        player.projectedGoals[gwKey] = goals;
        player.totalGoals += goals;
      });

      return Array.from(playerMap.values());

    } catch (error) {
      console.error("❌ Failed to get pre-calculated goal projections:", error);
      throw error;
    }
  }

  async getPreCalculatedTotalPointsProjections(startGameweek: number = 4, endGameweek: number = 9): Promise<PlayerProjectionData[]> {
    try {
      await this.ensureProjectionsExist(startGameweek, endGameweek);

      const projections = await db
        .select()
        .from(gameweekProjections)
        .where(
          and(
            gte(gameweekProjections.gameweek, startGameweek),
            lte(gameweekProjections.gameweek, endGameweek)
          )
        );

      // Group by player and create comprehensive data structure
      const playerMap = new Map<number, PlayerProjectionData>();

      projections.forEach(proj => {
        if (!playerMap.has(proj.playerId)) {
          playerMap.set(proj.playerId, {
            playerId: proj.playerId,
            playerName: proj.playerName || "",
            teamId: proj.teamId || 0,
            teamName: proj.teamName || "",
            position: proj.position || "",
            elementType: this.positionToElementType(proj.position || ""),
            gameweekProjections: {},
            totalPoints: 0,
            totalGoals: 0,
            totalAssists: 0
          });
        }

        const player = playerMap.get(proj.playerId)!;
        const gwKey = `gw${proj.gameweek}`;
        const points = Number(proj.totalGameweekPoints) || 0;
        player.gameweekProjections[gwKey] = points;
        player.totalPoints += points;
        player.totalGoals += Number(proj.projectedGoals) || 0;
        player.totalAssists += Number(proj.projectedAssists) || 0;
      });

      return Array.from(playerMap.values());

    } catch (error) {
      console.error("❌ Failed to get pre-calculated total points projections:", error);
      throw error;
    }
  }

  private positionToElementType(position: string): number {
    switch (position) {
      case "Goalkeeper": return 1;
      case "Defender": return 2;
      case "Midfielder": return 3;
      case "Forward": return 4;
      default: return 3;
    }
  }
}

// Add missing imports
import { sql } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';

export const projectionPrecalcService = new ProjectionPrecalcService();
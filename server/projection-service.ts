import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

interface ProjectionCache {
  lastUpdated: Date;
  data: any[];
}

class ProjectionService {
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly STALE_THRESHOLD = 4 * 60 * 60 * 1000; // 4 hours

  /**
   * Get player total points projections from database with fallback to calculation
   */
  async getPlayerTotalPoints(startGameweek: number, endGameweek: number): Promise<any[]> {
    try {
      // Try to get from database first
      const cached = await this.getPlayerProjectionsFromDB(startGameweek, endGameweek);
      
      if (cached && cached.length > 0) {
        console.log(`DEBUG: Serving ${cached.length} player projections from database`);
        return cached;
      }
      
      // If no cached data or stale, trigger background update
      console.log(`DEBUG: No cached projections found, triggering calculation`);
      return this.calculateAndCacheProjections(startGameweek, endGameweek);
      
    } catch (error) {
      console.error("Error in ProjectionService.getPlayerTotalPoints:", error);
      throw error;
    }
  }

  /**
   * Get cached projections from database using direct SQL
   */
  private async getPlayerProjectionsFromDB(startGameweek: number, endGameweek: number): Promise<any[]> {
    try {
      const projections = await db.execute(sql`
        SELECT * FROM player_projections 
        WHERE start_gameweek = ${startGameweek} 
          AND end_gameweek = ${endGameweek} 
          AND season = '2025/26'
        ORDER BY total_points DESC
      `);

      if (projections.rows.length === 0) {
        return [];
      }

      // Check if data is stale (older than 4 hours)
      const latestUpdate = projections.rows[0]?.last_updated;
      if (latestUpdate && Date.now() - new Date(latestUpdate as string).getTime() > this.STALE_THRESHOLD) {
        console.log(`DEBUG: Cached projections are stale (${Math.round((Date.now() - new Date(latestUpdate as string).getTime()) / (60 * 60 * 1000))} hours old)`);
        return [];
      }

      // Transform database format to API format with detailed breakdowns
      return projections.rows.map((projection: any) => ({
        playerId: projection.player_id,
        name: projection.player_name,
        fullName: projection.player_name,
        team: projection.team_name,
        position: ['', 'GKP', 'DEF', 'MID', 'FWD'][projection.element_type] || 'MID',
        price: projection.current_price / 10,
        ownership: parseFloat(projection.ownership.toString()),
        gameweekProjections: projection.total_points_projections,
        totalExpectedPoints: parseFloat(projection.total_points.toString()),
        seasonTotalPoints: projection.season_projected_points,
        averagePerGameweek: parseFloat(projection.average_points_per_gameweek.toString()),
        // Detailed point breakdowns for granular analysis
        pointsFromGoals: projection.points_from_goals || {},
        pointsFromAssists: projection.points_from_assists || {},
        pointsFromCleanSheets: projection.points_from_clean_sheets || {},
        pointsFromDefensiveContributions: projection.points_from_defensive_contributions || {},
        pointsFromMinutes: projection.points_from_minutes || {},
        pointsFromBonus: projection.points_from_bonus || {},
        totalPointsFromGoals: parseFloat(projection.total_points_from_goals || 0),
        totalPointsFromAssists: parseFloat(projection.total_points_from_assists || 0),
        totalPointsFromCleanSheets: parseFloat(projection.total_points_from_clean_sheets || 0),
        totalPointsFromDefensiveContributions: parseFloat(projection.total_points_from_defensive_contributions || 0),
        totalPointsFromMinutes: parseFloat(projection.total_points_from_minutes || 0),
        totalPointsFromBonus: parseFloat(projection.total_points_from_bonus || 0)
      }));

    } catch (error) {
      console.error("Error getting cached projections:", error);
      return [];
    }
  }

  /**
   * Calculate projections and cache them in database
   */
  private async calculateAndCacheProjections(startGameweek: number, endGameweek: number): Promise<any[]> {
    const startTime = Date.now();
    const updateId = crypto.randomUUID();
    
    try {
      console.log(`DEBUG: Starting projection calculation for GW${startGameweek}-${endGameweek}`);

      // Log the start of calculation using direct SQL
      await db.execute(sql`
        INSERT INTO projection_update_log (id, update_type, gameweek_range, started_at, status, duration)
        VALUES (${updateId}, 'player_projections', ${`${startGameweek}-${endGameweek}`}, NOW(), 'in_progress', 0)
      `);

      // Get fresh data from bootstrap API
      const bootstrapResponse = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
      if (!bootstrapResponse.ok) {
        throw new Error("Failed to fetch bootstrap data");
      }
      const bootstrapData = await bootstrapResponse.json();

      // Include ALL players in the FPL database (no filtering)
      const players = bootstrapData.elements
        .sort((a: any, b: any) => parseFloat(b.total_points) - parseFloat(a.total_points)) // Sort by total points
        .map((fplPlayer: any) => {
          const team = bootstrapData.teams.find((t: any) => t.id === fplPlayer.team);
          const position = ['', 'GKP', 'DEF', 'MID', 'FWD'][fplPlayer.element_type] || 'MID';
          
          // Enhanced projections with detailed point breakdowns
          const gameweekProjections: { [key: string]: number } = {};
          const pointsFromGoals: { [key: string]: number } = {};
          const pointsFromAssists: { [key: string]: number } = {};
          const pointsFromCleanSheets: { [key: string]: number } = {};
          const pointsFromDefensiveContributions: { [key: string]: number } = {};
          const pointsFromMinutes: { [key: string]: number } = {};
          const pointsFromBonus: { [key: string]: number } = {};
          
          let totalExpectedPoints = 0;
          let totalGoalPoints = 0, totalAssistPoints = 0, totalCleanSheetPoints = 0;
          let totalDefensivePoints = 0, totalMinutesPoints = 0, totalBonusPoints = 0;
          
          // FPL scoring system - CORRECT GOAL POINTS
          const goalPoints = position === 'GKP' ? 10 : position === 'DEF' ? 6 : position === 'MID' ? 5 : 4;
          const assistPoints = 3;
          const cleanSheetPoints = position === 'GKP' || position === 'DEF' ? 4 : position === 'MID' ? 1 : 0;
          
          for (let gw = startGameweek; gw <= endGameweek; gw++) {
            // Get gameweek-specific opponent strength and fixture context
            const form = parseFloat(fplPlayer.form || "0");
            const totalPoints = parseFloat(fplPlayer.total_points || "0");
            const selectedBy = parseFloat(fplPlayer.selected_by_percent || "1");
            const minutes = parseFloat(fplPlayer.minutes || "0");
            
            // Fixture difficulty based on team ID and gameweek (simulates opponent strength)
            const teamId = fplPlayer.team;
            const opponentStrengthSeed = ((teamId * 7) + (gw * 3)) % 20; // 0-19 range
            const isHomeFixture = (teamId + gw) % 2 === 0; // Alternating home/away
            
            // Opponent difficulty: Elite (0-4), Strong (5-9), Average (10-14), Weak (15-19)
            let difficultyMultiplier;
            if (opponentStrengthSeed <= 4) {
              difficultyMultiplier = isHomeFixture ? 0.75 : 0.65; // vs Elite teams
            } else if (opponentStrengthSeed <= 9) {
              difficultyMultiplier = isHomeFixture ? 0.90 : 0.80; // vs Strong teams
            } else if (opponentStrengthSeed <= 14) {
              difficultyMultiplier = isHomeFixture ? 1.10 : 1.00; // vs Average teams
            } else {
              difficultyMultiplier = isHomeFixture ? 1.35 : 1.25; // vs Weak teams
            }
            
            // Base form with season performance weighting
            const seasonPerformance = totalPoints / Math.max(minutes / 90, 1); // Points per 90 minutes
            const adjustedForm = Math.max(form * 0.7 + seasonPerformance * 0.3, 1.0);
            
            // 1. MINUTES CALCULATION
            const injuryRisk = (fplPlayer.chance_of_playing_next_round || 100) / 100;
            const rotationRisk = selectedBy > 30 ? 0.95 : selectedBy > 10 ? 0.85 : 0.75; // Popular players less rotated
            const expectedMinutes = Math.min(90, adjustedForm * 15) * injuryRisk * rotationRisk;
            const minutesPoints = expectedMinutes >= 60 ? 2 : expectedMinutes >= 1 ? 1 : 0;
            pointsFromMinutes[`gw${gw}`] = minutesPoints;
            totalMinutesPoints += minutesPoints;
            
            // 2. GOALS CALCULATION (per 90 minutes, scaled by expected minutes)
            let goalsExpected;
            if (position === 'FWD') {
              goalsExpected = (adjustedForm * 0.12 + seasonPerformance * 0.05) * difficultyMultiplier * (expectedMinutes / 90);
            } else if (position === 'MID') {
              goalsExpected = (adjustedForm * 0.06 + seasonPerformance * 0.03) * difficultyMultiplier * (expectedMinutes / 90);
            } else if (position === 'DEF') {
              goalsExpected = (adjustedForm * 0.02 + seasonPerformance * 0.01) * difficultyMultiplier * (expectedMinutes / 90);
            } else {
              goalsExpected = adjustedForm * 0.005 * difficultyMultiplier * (expectedMinutes / 90); // GKP
            }
            
            const gwGoalPoints = goalsExpected * goalPoints;
            pointsFromGoals[`gw${gw}`] = Math.round(gwGoalPoints * 100) / 100;
            totalGoalPoints += gwGoalPoints;
            
            // 3. ASSISTS CALCULATION
            let assistsExpected;
            if (position === 'MID') {
              assistsExpected = (adjustedForm * 0.08 + seasonPerformance * 0.04) * difficultyMultiplier * (expectedMinutes / 90);
            } else if (position === 'FWD') {
              assistsExpected = (adjustedForm * 0.04 + seasonPerformance * 0.02) * difficultyMultiplier * (expectedMinutes / 90);
            } else if (position === 'DEF') {
              assistsExpected = (adjustedForm * 0.025 + seasonPerformance * 0.01) * difficultyMultiplier * (expectedMinutes / 90);
            } else {
              assistsExpected = adjustedForm * 0.003 * difficultyMultiplier * (expectedMinutes / 90); // GKP
            }
            
            const gwAssistPoints = assistsExpected * assistPoints;
            pointsFromAssists[`gw${gw}`] = Math.round(gwAssistPoints * 100) / 100;
            totalAssistPoints += gwAssistPoints;
            
            // 4. CLEAN SHEET CALCULATION (defensive strength vs opponent attack)
            let cleanSheetProb = 0;
            if (position === 'GKP' || position === 'DEF' || position === 'MID') {
              // Team defensive strength based on form and opponent weakness
              const teamDefensiveStrength = (adjustedForm * 0.05) + 0.25; // Base 25% + form
              const opponentAttackStrength = opponentStrengthSeed <= 4 ? 0.85 : 
                                           opponentStrengthSeed <= 9 ? 0.65 : 
                                           opponentStrengthSeed <= 14 ? 0.45 : 0.25;
              
              cleanSheetProb = Math.max(0, teamDefensiveStrength - opponentAttackStrength);
              if (position === 'MID') cleanSheetProb *= 0.8; // Midfielders get reduced CS probability
              if (!isHomeFixture) cleanSheetProb *= 0.9; // Away fixtures slightly harder
            }
            
            const gwCleanSheetPoints = cleanSheetProb * cleanSheetPoints;
            pointsFromCleanSheets[`gw${gw}`] = Math.round(gwCleanSheetPoints * 100) / 100;
            totalCleanSheetPoints += gwCleanSheetPoints;
            
            // 5. DEFENSIVE CONTRIBUTIONS (2025/26 season) - Use same logic as individual DC tool
            let gwDefensivePoints = 0;
            if (position === 'DEF' || position === 'MID') {
              // Estimate DC value based on form and minutes
              const estimatedDC = position === 'DEF' ? 
                (adjustedForm * 0.8 + seasonPerformance * 0.3) * (expectedMinutes / 90) : 
                (adjustedForm * 0.4 + seasonPerformance * 0.2) * (expectedMinutes / 90);
              
              // Apply FPL threshold rule: 2 points if DC >= 10 for DEF, >= 12 for MID/FWD
              const dcThreshold = position === 'DEF' ? 10 : 12;
              gwDefensivePoints = estimatedDC >= dcThreshold ? 2 : 0; // Binary: either 0 or 2 points
            }
            pointsFromDefensiveContributions[`gw${gw}`] = Math.round(gwDefensivePoints * 100) / 100;
            totalDefensivePoints += gwDefensivePoints;
            
            // 6. BONUS POINTS - Only use actual data, no projections (we don't have a dedicated bonus tool)
            const bonusExpected = 0; // No bonus projections since we lack individual bonus projection tool
            pointsFromBonus[`gw${gw}`] = 0;
            totalBonusPoints += 0;
            
            // 7. TOTAL GAMEWEEK POINTS (sum all components - excluding bonus projections)
            const gwTotal = gwGoalPoints + gwAssistPoints + gwCleanSheetPoints + gwDefensivePoints + minutesPoints;
            gameweekProjections[`gw${gw}`] = Math.max(Math.round(gwTotal * 100) / 100, 0.0);
            totalExpectedPoints += gwTotal;
          }
          
          const avgPerGameweek = totalExpectedPoints / (endGameweek - startGameweek + 1);
          const seasonTotalPoints = Math.round(avgPerGameweek * 38);
          
          return {
            playerId: fplPlayer.id,
            playerName: fplPlayer.web_name,
            teamId: fplPlayer.team,
            teamName: team?.short_name || 'UNK',
            position,
            elementType: fplPlayer.element_type,
            currentPrice: fplPlayer.now_cost,
            ownership: parseFloat(fplPlayer.selected_by_percent),
            gameweekProjections,
            totalExpectedPoints,
            seasonTotalPoints,
            averagePerGameweek: avgPerGameweek,
            // Detailed breakdowns
            pointsFromGoals,
            pointsFromAssists,
            pointsFromCleanSheets,
            pointsFromDefensiveContributions,
            pointsFromMinutes,
            pointsFromBonus,
            totalGoalPoints,
            totalAssistPoints,
            totalCleanSheetPoints,
            totalDefensivePoints,
            totalMinutesPoints,
            totalBonusPoints
          };
        });

      // Cache in database using direct SQL
      const cachePromises = players.map(async (player) => {
        try {
          // Delete existing record if any
          await db.execute(sql`
            DELETE FROM player_projections 
            WHERE player_id = ${player.playerId} 
              AND start_gameweek = ${startGameweek}
              AND end_gameweek = ${endGameweek}
              AND season = '2025/26'
          `);

          // Insert new record with detailed point breakdowns
          await db.execute(sql`
            INSERT INTO player_projections (
              player_id, player_name, team_id, team_name, position, element_type,
              current_price, ownership, total_points_projections, total_points,
              average_points_per_gameweek, season_projected_points, gameweek_range,
              start_gameweek, end_gameweek, season,
              points_from_goals, points_from_assists, points_from_clean_sheets,
              points_from_defensive_contributions, points_from_minutes, points_from_bonus,
              total_points_from_goals, total_points_from_assists, total_points_from_clean_sheets,
              total_points_from_defensive_contributions, total_points_from_minutes, total_points_from_bonus
            ) VALUES (
              ${player.playerId}, ${player.playerName}, ${player.teamId}, ${player.teamName},
              ${player.position}, ${player.elementType}, ${player.currentPrice}, ${player.ownership},
              ${JSON.stringify(player.gameweekProjections)}, ${player.totalExpectedPoints},
              ${player.averagePerGameweek}, ${player.seasonTotalPoints}, ${`${startGameweek}-${endGameweek}`},
              ${startGameweek}, ${endGameweek}, '2025/26',
              ${JSON.stringify(player.pointsFromGoals)}, ${JSON.stringify(player.pointsFromAssists)}, 
              ${JSON.stringify(player.pointsFromCleanSheets)}, ${JSON.stringify(player.pointsFromDefensiveContributions)},
              ${JSON.stringify(player.pointsFromMinutes)}, ${JSON.stringify(player.pointsFromBonus)},
              ${player.totalGoalPoints}, ${player.totalAssistPoints}, ${player.totalCleanSheetPoints},
              ${player.totalDefensivePoints}, ${player.totalMinutesPoints}, ${player.totalBonusPoints}
            )
          `);
        } catch (error) {
          console.error(`Error caching player ${player.playerId}:`, error);
        }
      });

      await Promise.all(cachePromises);

      const duration = Date.now() - startTime;
      
      // Update log with success using direct SQL
      await db.execute(sql`
        UPDATE projection_update_log 
        SET status = 'success', players_updated = ${players.length}, duration = ${duration}, completed_at = NOW()
        WHERE id = ${updateId}
      `);

      console.log(`DEBUG: Cached ${players.length} player projections in ${duration}ms`);

      // Return in API format with detailed breakdowns
      return players.map(player => ({
        playerId: player.playerId,
        name: player.playerName,
        fullName: player.playerName,
        team: player.teamName,
        position: player.position,
        price: player.currentPrice / 10,
        ownership: player.ownership,
        gameweekProjections: player.gameweekProjections,
        totalExpectedPoints: player.totalExpectedPoints,
        seasonTotalPoints: player.seasonTotalPoints,
        averagePerGameweek: player.averagePerGameweek,
        // Include detailed point breakdowns for tooltip functionality
        pointsFromGoals: player.pointsFromGoals,
        pointsFromAssists: player.pointsFromAssists,
        pointsFromCleanSheets: player.pointsFromCleanSheets,
        pointsFromDefensiveContributions: player.pointsFromDefensiveContributions,
        pointsFromMinutes: player.pointsFromMinutes,
        pointsFromBonus: player.pointsFromBonus,
        totalPointsFromGoals: player.totalGoalPoints,
        totalPointsFromAssists: player.totalAssistPoints,
        totalPointsFromCleanSheets: player.totalCleanSheetPoints,
        totalPointsFromDefensiveContributions: player.totalDefensivePoints,
        totalPointsFromMinutes: player.totalMinutesPoints,
        totalPointsFromBonus: player.totalBonusPoints
      })).sort((a, b) => b.totalExpectedPoints - a.totalExpectedPoints);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update log with failure using direct SQL
      await db.execute(sql`
        UPDATE projection_update_log 
        SET status = 'failed', duration = ${duration}, 
            error_details = ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}, 
            completed_at = NOW()
        WHERE id = ${updateId}
      `);

      console.error("Error calculating projections:", error);
      throw error;
    }
  }

  /**
   * Force refresh of projections (admin function)
   */
  async refreshProjections(startGameweek: number, endGameweek: number): Promise<void> {
    console.log(`DEBUG: Force refreshing projections for GW${startGameweek}-${endGameweek}`);
    
    // Delete existing cached data using direct SQL
    await db.execute(sql`
      DELETE FROM player_projections 
      WHERE start_gameweek = ${startGameweek} 
        AND end_gameweek = ${endGameweek} 
        AND season = '2025/26'
    `);

    // Recalculate
    await this.calculateAndCacheProjections(startGameweek, endGameweek);
  }

  /**
   * Get projection update status
   */
  async getUpdateStatus(): Promise<any[]> {
    const recentUpdates = await db.execute(sql`
      SELECT * FROM projection_update_log 
      ORDER BY completed_at DESC 
      LIMIT 10
    `);

    return recentUpdates.rows;
  }
}

export const projectionService = new ProjectionService();
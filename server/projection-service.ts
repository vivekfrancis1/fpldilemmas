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
          
          // FPL scoring system
          const goalPoints = position === 'GKP' || position === 'DEF' ? 6 : position === 'MID' ? 5 : 4;
          const assistPoints = 3;
          const cleanSheetPoints = position === 'GKP' || position === 'DEF' ? 4 : position === 'MID' ? 1 : 0;
          
          for (let gw = startGameweek; gw <= endGameweek; gw++) {
            // Enhanced form-based projections with realistic scoring breakdown
            const form = parseFloat(fplPlayer.form || "0");
            const baseMinutes = Math.min(90, Math.max(60, form * 15)); // 60-90 minutes based on form
            
            // Goals projection (based on form and position)
            const goalProb = position === 'FWD' ? form * 0.15 : position === 'MID' ? form * 0.08 : form * 0.03;
            const gwGoalPoints = goalProb * goalPoints;
            pointsFromGoals[`gw${gw}`] = Math.round(gwGoalPoints * 100) / 100;
            totalGoalPoints += gwGoalPoints;
            
            // Assists projection
            const assistProb = position === 'MID' ? form * 0.12 : position === 'FWD' ? form * 0.08 : form * 0.04;
            const gwAssistPoints = assistProb * assistPoints;
            pointsFromAssists[`gw${gw}`] = Math.round(gwAssistPoints * 100) / 100;
            totalAssistPoints += gwAssistPoints;
            
            // Clean sheet projection (defenders and goalkeepers)
            const cleanSheetProb = position === 'GKP' ? 0.35 : position === 'DEF' ? 0.32 : position === 'MID' ? 0.28 : 0;
            const gwCleanSheetPoints = cleanSheetProb * cleanSheetPoints;
            pointsFromCleanSheets[`gw${gw}`] = Math.round(gwCleanSheetPoints * 100) / 100;
            totalCleanSheetPoints += gwCleanSheetPoints;
            
            // Defensive contribution points (2025/26 season)
            const defenseProb = position === 'DEF' ? 0.25 : position === 'MID' ? 0.15 : 0;
            const gwDefensivePoints = defenseProb * 2; // 2 points for defensive contribution
            pointsFromDefensiveContributions[`gw${gw}`] = Math.round(gwDefensivePoints * 100) / 100;
            totalDefensivePoints += gwDefensivePoints;
            
            // Minutes points (1 for 1-59 mins, 2 for 60+ mins)
            const minutesProb = baseMinutes >= 60 ? 2 : 1;
            pointsFromMinutes[`gw${gw}`] = minutesProb;
            totalMinutesPoints += minutesProb;
            
            // Bonus points (simplified)
            const bonusProb = form * 0.3;
            pointsFromBonus[`gw${gw}`] = Math.round(bonusProb * 100) / 100;
            totalBonusPoints += bonusProb;
            
            // Total gameweek points
            const gwTotal = gwGoalPoints + gwAssistPoints + gwCleanSheetPoints + gwDefensivePoints + minutesProb + bonusProb;
            gameweekProjections[`gw${gw}`] = Math.max(Math.round(gwTotal * 100) / 100, 2.0);
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
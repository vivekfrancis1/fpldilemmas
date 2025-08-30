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

      // Transform database format to API format
      return projections.rows.map((projection: any) => ({
        playerId: projection.player_id,
        name: projection.player_name,
        fullName: projection.player_name, // Use same for now
        team: projection.team_name,
        position: ['', 'GKP', 'DEF', 'MID', 'FWD'][projection.element_type] || 'MID',
        price: projection.current_price / 10,
        ownership: parseFloat(projection.ownership.toString()),
        gameweekProjections: projection.total_points_projections,
        totalExpectedPoints: parseFloat(projection.total_points.toString()),
        seasonTotalPoints: projection.season_projected_points,
        averagePerGameweek: parseFloat(projection.average_points_per_gameweek.toString())
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

      // Simple but fast calculation using bootstrap data
      const players = bootstrapData.elements
        .filter((p: any) => parseFloat(p.selected_by_percent) > 0.1)
        .slice(0, 150) // Limit to top 150 players for performance
        .map((fplPlayer: any) => {
          const team = bootstrapData.teams.find((t: any) => t.id === fplPlayer.team);
          const gameweekProjections: { [key: string]: number } = {};
          
          // Form-based simple projection
          const basePoints = Math.max(parseFloat(fplPlayer.form || "0") * 1.1, 2.5);
          let totalExpectedPoints = 0;
          
          for (let gw = startGameweek; gw <= endGameweek; gw++) {
            const gwPoints = basePoints + (Math.random() * 2 - 1); // Add slight variance
            gameweekProjections[`gw${gw}`] = Math.max(Math.round(gwPoints * 100) / 100, 1.0);
            totalExpectedPoints += gameweekProjections[`gw${gw}`];
          }
          
          const avgPerGameweek = totalExpectedPoints / (endGameweek - startGameweek + 1);
          const seasonTotalPoints = Math.round(avgPerGameweek * 38);
          
          return {
            playerId: fplPlayer.id,
            playerName: fplPlayer.web_name,
            teamId: fplPlayer.team,
            teamName: team?.short_name || 'UNK',
            position: ['', 'GKP', 'DEF', 'MID', 'FWD'][fplPlayer.element_type] || 'MID',
            elementType: fplPlayer.element_type,
            currentPrice: fplPlayer.now_cost,
            ownership: parseFloat(fplPlayer.selected_by_percent),
            gameweekProjections,
            totalExpectedPoints,
            seasonTotalPoints,
            averagePerGameweek: avgPerGameweek
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

          // Insert new record
          await db.execute(sql`
            INSERT INTO player_projections (
              player_id, player_name, team_id, team_name, position, element_type,
              current_price, ownership, total_points_projections, total_points,
              average_points_per_gameweek, season_projected_points, gameweek_range,
              start_gameweek, end_gameweek, season
            ) VALUES (
              ${player.playerId}, ${player.playerName}, ${player.teamId}, ${player.teamName},
              ${player.position}, ${player.elementType}, ${player.currentPrice}, ${player.ownership},
              ${JSON.stringify(player.gameweekProjections)}, ${player.totalExpectedPoints},
              ${player.averagePerGameweek}, ${player.seasonTotalPoints}, ${`${startGameweek}-${endGameweek}`},
              ${startGameweek}, ${endGameweek}, '2025/26'
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

      // Return in API format
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
        averagePerGameweek: player.averagePerGameweek
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
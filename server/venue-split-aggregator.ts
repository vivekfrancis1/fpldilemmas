import { pool } from "./db";

interface VenueSplitData {
  playerId: number;
  venue: 'home' | 'away';
  season: string;
  playerName: string;
  teamName: string | null;
  position: string | null;
  matches: number;
  starts: number;
  minutes: number;
  totalPoints: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  bonus: number;
  bps: number;
  expectedGoals: number;
  expectedAssists: number;
  expectedGoalInvolvements: number;
  expectedGoalsConceded: number;
  influence: number;
  creativity: number;
  threat: number;
  ictIndex: number;
  tackles: number;
  recoveries: number;
  clearancesBlocksInterceptions: number;
  defensiveContribution: number;
  cbitPoints: number;
  savePoints: number;
  minutesPoints: number;
}

class VenueSplitAggregator {
  private readonly CURRENT_SEASON = "2025/26";

  /**
   * Aggregate venue split data from cached gameweek data
   */
  async aggregateVenueSplits(season: string = this.CURRENT_SEASON): Promise<void> {
    console.log(`Starting venue split aggregation for season ${season}...`);
    
    try {
      // First, get all unique players from bootstrap-static
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      const bootstrapData = await bootstrapResponse.json();
      
      const players = bootstrapData.elements;
      const teams = bootstrapData.teams;
      const elementTypes = bootstrapData.element_types;
      
      // Create lookups
      const teamLookup = new Map<number, string>(teams.map((t: any) => [t.id, t.short_name]));
      const positionLookup = new Map<number, string>(elementTypes.map((et: any) => [et.id, et.singular_name_short]));
      
      console.log(`Processing ${players.length} players...`);
      
      // Aggregate data for each player by venue
      for (const player of players) {
        await this.aggregatePlayerVenueSplits(
          player.id,
          `${player.first_name} ${player.second_name}`,
          teamLookup.get(player.team) || null,
          positionLookup.get(player.element_type) || null,
          season
        );
      }
      
      console.log('Venue split aggregation completed successfully');
    } catch (error) {
      console.error('Error aggregating venue splits:', error);
      throw error;
    }
  }

  /**
   * Aggregate venue splits for a single player
   */
  private async aggregatePlayerVenueSplits(
    playerId: number,
    playerName: string,
    teamName: string | null,
    position: string | null,
    season: string
  ): Promise<void> {
    try {
      // Query gameweek data grouped by venue
      const result = await pool.query(`
        SELECT 
          was_home,
          COUNT(*) as matches,
          SUM(CASE WHEN starts > 0 THEN 1 ELSE 0 END) as starts,
          SUM(minutes) as minutes,
          SUM(total_points) as total_points,
          SUM(goals_scored) as goals_scored,
          SUM(assists) as assists,
          SUM(clean_sheets) as clean_sheets,
          SUM(goals_conceded) as goals_conceded,
          SUM(own_goals) as own_goals,
          SUM(penalties_saved) as penalties_saved,
          SUM(penalties_missed) as penalties_missed,
          SUM(yellow_cards) as yellow_cards,
          SUM(red_cards) as red_cards,
          SUM(saves) as saves,
          SUM(bonus) as bonus,
          SUM(bps) as bps,
          SUM(defensive_contribution) as defensive_contribution,
          SUM(tackles) as tackles,
          SUM(recoveries) as recoveries,
          SUM(clearances_blocks_interceptions) as clearances_blocks_interceptions
        FROM gameweek_player_data
        WHERE player_id = $1 AND season = $2 AND minutes > 0
        GROUP BY was_home
      `, [playerId, season]);
      
      // Process each venue (home/away)
      for (const row of result.rows) {
        const venue = row.was_home ? 'home' : 'away';
        
        // Calculate basic FPL points (skip expensive API-based calculations for now)
        const cbitPoints = 0; // Simplified - can be calculated later if needed
        const savePoints = 0; // Simplified - can be calculated later if needed  
        const minutesPoints = 0; // Simplified - can be calculated later if needed
        
        // Insert or update venue split data
        await pool.query(`
          INSERT INTO player_venue_splits (
            player_id, venue, season, player_name, team_name, position,
            matches, starts, minutes, total_points,
            goals_scored, assists, clean_sheets, goals_conceded,
            own_goals, penalties_saved, penalties_missed,
            yellow_cards, red_cards, saves, bonus, bps,
            expected_goals, expected_assists, expected_goal_involvements, expected_goals_conceded,
            influence, creativity, threat, ict_index,
            tackles, recoveries, clearances_blocks_interceptions, defensive_contribution,
            cbit_points, save_points, minutes_points,
            last_updated
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17,
            $18, $19, $20, $21, $22,
            0, 0, 0, 0,
            0, 0, 0, 0,
            $23, $24, $25, $26,
            $27, $28, $29,
            NOW()
          )
          ON CONFLICT (player_id, venue, season)
          DO UPDATE SET
            player_name = EXCLUDED.player_name,
            team_name = EXCLUDED.team_name,
            position = EXCLUDED.position,
            matches = EXCLUDED.matches,
            starts = EXCLUDED.starts,
            minutes = EXCLUDED.minutes,
            total_points = EXCLUDED.total_points,
            goals_scored = EXCLUDED.goals_scored,
            assists = EXCLUDED.assists,
            clean_sheets = EXCLUDED.clean_sheets,
            goals_conceded = EXCLUDED.goals_conceded,
            own_goals = EXCLUDED.own_goals,
            penalties_saved = EXCLUDED.penalties_saved,
            penalties_missed = EXCLUDED.penalties_missed,
            yellow_cards = EXCLUDED.yellow_cards,
            red_cards = EXCLUDED.red_cards,
            saves = EXCLUDED.saves,
            bonus = EXCLUDED.bonus,
            bps = EXCLUDED.bps,
            tackles = EXCLUDED.tackles,
            recoveries = EXCLUDED.recoveries,
            clearances_blocks_interceptions = EXCLUDED.clearances_blocks_interceptions,
            defensive_contribution = EXCLUDED.defensive_contribution,
            cbit_points = EXCLUDED.cbit_points,
            save_points = EXCLUDED.save_points,
            minutes_points = EXCLUDED.minutes_points,
            last_updated = NOW()
        `, [
          playerId, venue, season, playerName, teamName, position,
          row.matches, row.starts, row.minutes, row.total_points,
          row.goals_scored, row.assists, row.clean_sheets, row.goals_conceded,
          row.own_goals, row.penalties_saved, row.penalties_missed,
          row.yellow_cards, row.red_cards, row.saves, row.bonus, row.bps,
          row.tackles, row.recoveries, row.clearances_blocks_interceptions, row.defensive_contribution,
          cbitPoints, savePoints, minutesPoints
        ]);
      }
    } catch (error) {
      console.error(`Error aggregating venue splits for player ${playerId}:`, error);
    }
  }

  /**
   * Calculate CBIT points for a specific venue
   */
  private async calculateCBITPoints(playerId: number, venue: 'home' | 'away', season: string): Promise<number> {
    try {
      // Query gameweek data to calculate CBIT points
      const result = await pool.query(`
        SELECT 
          SUM(CASE 
            WHEN defensive_contribution >= 10 THEN 2 
            ELSE 0 
          END) as cbit_points
        FROM gameweek_player_data
        WHERE player_id = $1 AND season = $2 AND was_home = $3 AND minutes > 0
      `, [playerId, season, venue === 'home']);
      
      return parseInt(result.rows[0]?.cbit_points || 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate save points for a specific venue
   */
  private async calculateSavePoints(playerId: number, venue: 'home' | 'away', season: string): Promise<number> {
    try {
      // Query gameweek data to calculate save points
      const result = await pool.query(`
        SELECT 
          SUM(CASE 
            WHEN saves >= 3 THEN (saves / 3)::int 
            ELSE 0 
          END) as save_points
        FROM gameweek_player_data
        WHERE player_id = $1 AND season = $2 AND was_home = $3 AND minutes > 0
      `, [playerId, season, venue === 'home']);
      
      return parseInt(result.rows[0]?.save_points || 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate minutes points for a specific venue
   */
  private async calculateMinutesPoints(playerId: number, venue: 'home' | 'away', season: string): Promise<number> {
    try {
      // Query gameweek data to calculate minutes points
      const result = await pool.query(`
        SELECT 
          SUM(CASE 
            WHEN minutes >= 60 THEN 2
            WHEN minutes > 0 THEN 1
            ELSE 0 
          END) as minutes_points
        FROM gameweek_player_data
        WHERE player_id = $1 AND season = $2 AND was_home = $3
      `, [playerId, season, venue === 'home']);
      
      return parseInt(result.rows[0]?.minutes_points || 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get venue split data for specific players
   */
  async getPlayerVenueSplits(playerIds: number[], venue: 'all' | 'home' | 'away', season: string = this.CURRENT_SEASON): Promise<any[]> {
    try {
      if (venue === 'all') {
        // Return aggregated data across both venues
        const placeholders = playerIds.map((_, i) => `$${i + 2}`).join(',');
        const result = await pool.query(`
          SELECT 
            player_id,
            player_name,
            team_name,
            position,
            SUM(matches) as matches,
            SUM(starts) as starts,
            SUM(minutes) as minutes,
            SUM(total_points) as total_points,
            SUM(goals_scored) as goals_scored,
            SUM(assists) as assists,
            SUM(clean_sheets) as clean_sheets,
            SUM(goals_conceded) as goals_conceded,
            SUM(own_goals) as own_goals,
            SUM(penalties_saved) as penalties_saved,
            SUM(penalties_missed) as penalties_missed,
            SUM(yellow_cards) as yellow_cards,
            SUM(red_cards) as red_cards,
            SUM(saves) as saves,
            SUM(bonus) as bonus,
            SUM(bps) as bps,
            SUM(tackles) as tackles,
            SUM(recoveries) as recoveries,
            SUM(clearances_blocks_interceptions) as clearances_blocks_interceptions,
            SUM(defensive_contribution) as defensive_contribution,
            SUM(cbit_points) as cbit_points,
            SUM(save_points) as save_points,
            SUM(minutes_points) as minutes_points
          FROM player_venue_splits
          WHERE season = $1 AND player_id IN (${placeholders})
          GROUP BY player_id, player_name, team_name, position
        `, [season, ...playerIds]);
        
        return result.rows;
      } else {
        // Return venue-specific data
        const placeholders = playerIds.map((_, i) => `$${i + 3}`).join(',');
        const result = await pool.query(`
          SELECT *
          FROM player_venue_splits
          WHERE season = $1 AND venue = $2 AND player_id IN (${placeholders})
        `, [season, venue, ...playerIds]);
        
        return result.rows;
      }
    } catch (error) {
      console.error('Error getting player venue splits:', error);
      return [];
    }
  }
}

export const venueSplitAggregator = new VenueSplitAggregator();

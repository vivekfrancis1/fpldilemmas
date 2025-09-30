import { db, pool } from "./db";

// Direct database queries since these are new tables
const gameweekPlayerDataTable = "gameweek_player_data";
const gameweekUpdateLogTable = "gameweek_update_log";

interface GameweekPlayerData {
  playerId: number;
  gameweek: number;
  season: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  total_points: number;
  defensive_contribution: number;
  tackles: number;
  recoveries: number;
  clearances_blocks_interceptions: number;
  starts: number;
  wasHome: boolean;
  opponentTeam: number | null;
  fixtureId: number | null;
  kickoffTime: Date | null;
}

interface UpdateLogEntry {
  gameweek: number;
  season: string;
  updateType: "completed" | "partial" | "failed";
  playersUpdated: number;
  errors: any[] | null;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
}

class GameweekCacheService {
  private readonly FPL_API_BASE = "https://fantasy.premierleague.com/api";
  private readonly CURRENT_SEASON = "2025/26";

  /**
   * Check if gameweek data is already cached
   */
  async isGameweekCached(gameweek: number, season: string = this.CURRENT_SEASON): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM ${gameweekPlayerDataTable} WHERE gameweek = $1 AND season = $2`,
        [gameweek, season]
      );
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error("Error checking cached gameweek:", error);
      return false;
    }
  }

  /**
   * Get cached gameweek data for specific players
   */
  async getCachedPlayerData(playerIds: number[], gameweek: number, season: string = this.CURRENT_SEASON): Promise<GameweekPlayerData[]> {
    try {
      const placeholders = playerIds.map((_, i) => `$${i + 3}`).join(',');
      const result = await pool.query(
        `SELECT * FROM ${gameweekPlayerDataTable} WHERE gameweek = $1 AND season = $2 AND player_id IN (${placeholders})`,
        [gameweek, season, ...playerIds]
      );
      
      return result.rows.map(row => ({
        playerId: (row as any).player_id,
        gameweek: (row as any).gameweek,
        season: (row as any).season,
        minutes: (row as any).minutes || 0,
        goals_scored: (row as any).goals_scored || 0,
        assists: (row as any).assists || 0,
        clean_sheets: (row as any).clean_sheets || 0,
        goals_conceded: (row as any).goals_conceded || 0,
        own_goals: (row as any).own_goals || 0,
        penalties_saved: (row as any).penalties_saved || 0,
        penalties_missed: (row as any).penalties_missed || 0,
        yellow_cards: (row as any).yellow_cards || 0,
        red_cards: (row as any).red_cards || 0,
        saves: (row as any).saves || 0,
        bonus: (row as any).bonus || 0,
        bps: (row as any).bps || 0,
        total_points: (row as any).total_points || 0,
        defensive_contribution: (row as any).defensive_contribution || 0,
        tackles: (row as any).tackles || 0,
        recoveries: (row as any).recoveries || 0,
        clearances_blocks_interceptions: (row as any).clearances_blocks_interceptions || 0,
        starts: (row as any).starts || 0,
        wasHome: (row as any).was_home || false,
        opponentTeam: (row as any).opponent_team,
        fixtureId: (row as any).fixture_id,
        kickoffTime: (row as any).kickoff_time
      }));
    } catch (error) {
      console.error("Error getting cached player data:", error);
      return [];
    }
  }

  /**
   * Fetch and cache gameweek data for all players
   */
  async cacheGameweekData(gameweek: number, season: string = this.CURRENT_SEASON): Promise<UpdateLogEntry> {
    const startTime = Date.now();
    const logEntry: UpdateLogEntry = {
      gameweek,
      season,
      updateType: "failed",
      playersUpdated: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: null,
      duration: null
    };

    try {
      console.log(`🔄 Starting gameweek ${gameweek} data caching...`);

      // Check if already cached
      if (await this.isGameweekCached(gameweek, season)) {
        console.log(`✅ Gameweek ${gameweek} already cached`);
        logEntry.updateType = "completed";
        logEntry.completedAt = new Date();
        logEntry.duration = Date.now() - startTime;
        return logEntry;
      }

      // Fetch bootstrap data to get all players
      const bootstrapResponse = await fetch(`${this.FPL_API_BASE}/bootstrap-static/`);
      if (!bootstrapResponse.ok) {
        throw new Error(`Bootstrap API error: ${bootstrapResponse.status}`);
      }

      const bootstrapData = await bootstrapResponse.json();
      const players = bootstrapData.elements;
      const fixtures = bootstrapData.events.find((event: any) => event.id === gameweek);

      if (!fixtures) {
        throw new Error(`Gameweek ${gameweek} not found in bootstrap data`);
      }

      console.log(`📊 Processing ${players.length} players for gameweek ${gameweek}`);

      // Process players in batches to avoid overwhelming the API
      const batchSize = 50;
      let processedCount = 0;
      const errors: any[] = [];

      for (let i = 0; i < players.length; i += batchSize) {
        const batch = players.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (player: any) => {
          try {
            // Fetch player's gameweek data
            const playerResponse = await fetch(`${this.FPL_API_BASE}/element-summary/${player.id}/`);
            if (!playerResponse.ok) {
              throw new Error(`Player ${player.id} API error: ${playerResponse.status}`);
            }

            const playerData = await playerResponse.json();
            const gameweekData = playerData.history.find((h: any) => h.round === gameweek);

            if (gameweekData) {
              // FPL API doesn't have was_home in history - derive it from opponent_team
              // If opponent_team exists, we need to check which team was home
              // In FPL fixtures: team_h is home, team_a is away
              // So if player.team is NOT opponent_team, we need to look at fixture to see who was home
              // Simplified: check if opponent_team value indicates home/away
              // The gameweekData actually contains fixture ID, let's use that to determine was_home
              const opponentTeam = gameweekData.opponent_team || null;
              
              //  Determine was_home: In FPL, if your team played, you can check the fixture
              // The logic: get the fixture for this gameweek and check if player.team == team_h
              let wasHome = false;
              if (opponentTeam) {
                // Fetch the fixture to determine home/away
                // For now, use a simple heuristic: alternate home/away (this is temporary)
                // Better: fetch actual fixture data
                const fixtureResponse = await fetch(`${this.FPL_API_BASE}/fixtures/?event=${gameweek}`);
                if (fixtureResponse.ok) {
                  const fixtures = await fixtureResponse.json();
                  const playerFixture = fixtures.find((f: any) => 
                    (f.team_h === player.team && f.team_a === opponentTeam) || 
                    (f.team_a === player.team && f.team_h === opponentTeam)
                  );
                  if (playerFixture) {
                    wasHome = playerFixture.team_h === player.team;
                  }
                }
              }
              
              // Insert player gameweek data
              await this.insertPlayerGameweekData({
                playerId: player.id,
                gameweek,
                season,
                minutes: gameweekData.minutes || 0,
                goals_scored: gameweekData.goals_scored || 0,
                assists: gameweekData.assists || 0,
                clean_sheets: gameweekData.clean_sheets || 0,
                goals_conceded: gameweekData.goals_conceded || 0,
                own_goals: gameweekData.own_goals || 0,
                penalties_saved: gameweekData.penalties_saved || 0,
                penalties_missed: gameweekData.penalties_missed || 0,
                yellow_cards: gameweekData.yellow_cards || 0,
                red_cards: gameweekData.red_cards || 0,
                saves: gameweekData.saves || 0,
                bonus: gameweekData.bonus || 0,
                bps: gameweekData.bps || 0,
                total_points: gameweekData.total_points || 0,
                defensive_contribution: gameweekData.defensive_contribution || 0,
                tackles: gameweekData.tackles || 0,
                recoveries: gameweekData.recoveries || 0,
                clearances_blocks_interceptions: gameweekData.clearances_blocks_interceptions || 0,
                starts: gameweekData.starts || 0,
                wasHome: wasHome,
                opponentTeam: opponentTeam,
                fixtureId: gameweekData.fixture || null,
                kickoffTime: gameweekData.kickoff_time ? new Date(gameweekData.kickoff_time) : null
              });

              processedCount++;
            }
          } catch (error) {
            console.error(`Error processing player ${player.id}:`, error);
            errors.push({
              playerId: player.id,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });

        // Wait for batch to complete before processing next batch
        await Promise.allSettled(batchPromises);
        
        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logEntry.updateType = errors.length === 0 ? "completed" : "partial";
      logEntry.playersUpdated = processedCount;
      logEntry.errors = errors.length > 0 ? errors : null;
      logEntry.completedAt = new Date();
      logEntry.duration = Date.now() - startTime;

      console.log(`✅ Gameweek ${gameweek} caching completed: ${processedCount} players processed, ${errors.length} errors`);

    } catch (error) {
      console.error(`❌ Gameweek ${gameweek} caching failed:`, error);
      logEntry.updateType = "failed";
      logEntry.errors = [{ error: error instanceof Error ? error.message : String(error) }];
      logEntry.completedAt = new Date();
      logEntry.duration = Date.now() - startTime;
    }

    // Log the update
    await this.logUpdate(logEntry);
    return logEntry;
  }

  /**
   * Insert player gameweek data into cache
   */
  private async insertPlayerGameweekData(data: GameweekPlayerData): Promise<void> {
    try {
      // First check if record exists
      const existingResult = await pool.query(
        `SELECT id FROM ${gameweekPlayerDataTable} WHERE player_id = $1 AND gameweek = $2 AND season = $3`,
        [data.playerId, data.gameweek, data.season]
      );

      if (existingResult.rows.length > 0) {
        // Update existing record
        await pool.query(`
          UPDATE ${gameweekPlayerDataTable} SET
            minutes = $4,
            goals_scored = $5,
            assists = $6,
            clean_sheets = $7,
            goals_conceded = $8,
            own_goals = $9,
            penalties_saved = $10,
            penalties_missed = $11,
            yellow_cards = $12,
            red_cards = $13,
            saves = $14,
            bonus = $15,
            bps = $16,
            total_points = $17,
            defensive_contribution = $18,
            tackles = $19,
            recoveries = $20,
            clearances_blocks_interceptions = $21,
            starts = $22,
            was_home = $23,
            opponent_team = $24,
            fixture_id = $25,
            kickoff_time = $26,
            updated_at = NOW()
          WHERE player_id = $1 AND gameweek = $2 AND season = $3
        `, [
          data.playerId, data.gameweek, data.season, data.minutes, data.goals_scored,
          data.assists, data.clean_sheets, data.goals_conceded, data.own_goals,
          data.penalties_saved, data.penalties_missed, data.yellow_cards, data.red_cards,
          data.saves, data.bonus, data.bps, data.total_points, data.defensive_contribution,
          data.tackles, data.recoveries, data.clearances_blocks_interceptions, data.starts,
          data.wasHome, data.opponentTeam, data.fixtureId, data.kickoffTime
        ]);
      } else {
        // Insert new record
        await pool.query(`
          INSERT INTO ${gameweekPlayerDataTable} (
            player_id, gameweek, season, minutes, goals_scored, assists, clean_sheets,
            goals_conceded, own_goals, penalties_saved, penalties_missed, yellow_cards,
            red_cards, saves, bonus, bps, total_points, defensive_contribution,
            tackles, recoveries, clearances_blocks_interceptions, starts,
            was_home, opponent_team, fixture_id, kickoff_time
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
          )
        `, [
          data.playerId, data.gameweek, data.season, data.minutes, data.goals_scored,
          data.assists, data.clean_sheets, data.goals_conceded, data.own_goals,
          data.penalties_saved, data.penalties_missed, data.yellow_cards, data.red_cards,
          data.saves, data.bonus, data.bps, data.total_points, data.defensive_contribution,
          data.tackles, data.recoveries, data.clearances_blocks_interceptions, data.starts,
          data.wasHome, data.opponentTeam, data.fixtureId, data.kickoffTime
        ]);
      }
    } catch (error) {
      console.error("Error inserting player gameweek data:", error);
      throw error;
    }
  }

  /**
   * Log update operation
   */
  private async logUpdate(logEntry: UpdateLogEntry): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO ${gameweekUpdateLogTable} (
          gameweek, season, update_type, players_updated, errors,
          started_at, completed_at, duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        logEntry.gameweek,
        logEntry.season,
        logEntry.updateType,
        logEntry.playersUpdated,
        logEntry.errors ? JSON.stringify(logEntry.errors) : null,
        logEntry.startedAt,
        logEntry.completedAt,
        logEntry.duration
      ]);
    } catch (error) {
      console.error("Error logging update:", error);
    }
  }

  /**
   * Get list of completed gameweeks that have been cached
   */
  async getCachedGameweeks(season: string = this.CURRENT_SEASON): Promise<number[]> {
    try {
      const result = await pool.query(
        `SELECT DISTINCT gameweek FROM ${gameweekPlayerDataTable} WHERE season = $1 ORDER BY gameweek`,
        [season]
      );
      
      return result.rows.map(row => row.gameweek);
    } catch (error) {
      console.error("Error getting cached gameweeks:", error);
      return [];
    }
  }

  /**
   * Get update logs for monitoring
   */
  async getUpdateLogs(limit: number = 10): Promise<UpdateLogEntry[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ${gameweekUpdateLogTable} ORDER BY started_at DESC LIMIT $1`,
        [limit]
      );
      
      return result.rows.map(row => ({
        gameweek: row.gameweek,
        season: row.season,
        updateType: row.update_type as "completed" | "partial" | "failed",
        playersUpdated: row.players_updated,
        errors: row.errors,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        duration: row.duration_ms
      }));
    } catch (error) {
      console.error("Error getting update logs:", error);
      return [];
    }
  }

  /**
   * Check if a gameweek has finished (all fixtures completed)
   */
  async isGameweekFinished(gameweek: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.FPL_API_BASE}/bootstrap-static/`);
      if (!response.ok) return false;

      const data = await response.json();
      const event = data.events.find((e: any) => e.id === gameweek);
      
      return event ? event.finished : false;
    } catch (error) {
      console.error("Error checking gameweek status:", error);
      return false;
    }
  }

  /**
   * Auto-cache completed gameweeks (run this periodically)
   */
  async autoCacheCompletedGameweeks(): Promise<void> {
    try {
      console.log("🔍 Checking for completed gameweeks to cache...");
      
      const response = await fetch(`${this.FPL_API_BASE}/bootstrap-static/`);
      if (!response.ok) {
        console.error("Failed to fetch bootstrap data");
        return;
      }

      const data = await response.json();
      const finishedGameweeks = data.events.filter((e: any) => e.finished).map((e: any) => e.id);
      const cachedGameweeks = await this.getCachedGameweeks();
      
      const gameweeksToCache = finishedGameweeks.filter((gw: number) => !cachedGameweeks.includes(gw));
      
      if (gameweeksToCache.length === 0) {
        console.log("✅ All completed gameweeks are already cached");
        return;
      }

      console.log(`📥 Found ${gameweeksToCache.length} completed gameweeks to cache: ${gameweeksToCache.join(', ')}`);

      for (const gameweek of gameweeksToCache) {
        console.log(`📊 Caching gameweek ${gameweek}...`);
        await this.cacheGameweekData(gameweek);
        
        // Small delay between gameweeks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log("✅ Auto-caching completed");
    } catch (error) {
      console.error("Error in auto-cache:", error);
    }
  }
}

export const gameweekCacheService = new GameweekCacheService();
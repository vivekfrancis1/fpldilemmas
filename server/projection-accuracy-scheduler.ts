import { db } from './db';
import { sql } from 'drizzle-orm';
import { cachedPlayerTotalPoints } from '@shared/schema';

interface PlayerProjectionRecord {
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  position: string;
  projected_points: number;
  projected_minutes: number;
  projected_goals: number;
  projected_assists: number;
  projected_clean_sheet: number;
  projected_bonus: number;
  projected_saves: number;
}

interface TeamProjectionRecord {
  team_id: number;
  team_name: string;
  opponent_team_id: number | null;
  opponent_team_name: string | null;
  is_home: boolean | null;
  projected_goals_scored: number;
  projected_goals_conceded: number;
  projected_clean_sheet_prob: number;
}

class ProjectionAccuracyScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  private readonly SEASON = '2024/25';
  private readonly START_GAMEWEEK = 25;
  private readonly END_GAMEWEEK = 38;

  start(): void {
    console.log('📊 Starting Projection Accuracy Scheduler (GW25-38 tracking)...');
    
    this.intervalId = setInterval(() => {
      this.checkAndProcess();
    }, this.CHECK_INTERVAL);
    
    this.checkAndProcess();
    console.log('✅ Projection Accuracy Scheduler started (checks every 5 minutes)');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Projection Accuracy Scheduler stopped');
    }
  }

  private async checkAndProcess(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (!bootstrapResponse.ok) {
        console.error('❌ Failed to fetch FPL bootstrap data');
        return;
      }

      const bootstrapData = await bootstrapResponse.json();
      const events = bootstrapData.events || [];
      const currentEvent = events.find((e: any) => e.is_current);
      const nextEvent = events.find((e: any) => e.is_next);

      if (!currentEvent) {
        console.log('⚠️ No current gameweek found');
        return;
      }

      const currentGW = currentEvent.id;
      const nextGW = nextEvent?.id || currentGW;
      
      const currentInRange = currentGW >= this.START_GAMEWEEK && currentGW <= this.END_GAMEWEEK;
      const nextInRange = nextGW >= this.START_GAMEWEEK && nextGW <= this.END_GAMEWEEK;
      
      if (!currentInRange && !nextInRange) {
        console.log(`📊 Neither current GW${currentGW} nor next GW${nextGW} is in tracking range (GW25-38)`);
        return;
      }

      if (nextInRange) {
        await this.checkDeadlineSnapshot(currentEvent, nextEvent, bootstrapData);
      }
      
      if (currentInRange) {
        await this.checkGameweekCompletion(events, bootstrapData);
      }

    } catch (error) {
      console.error('❌ Projection accuracy check failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async checkDeadlineSnapshot(currentEvent: any, nextEvent: any, bootstrapData: any): Promise<void> {
    const targetEvent = nextEvent || currentEvent;
    const gameweek = targetEvent.id;
    
    if (gameweek < this.START_GAMEWEEK || gameweek > this.END_GAMEWEEK) return;

    const deadlineTime = new Date(targetEvent.deadline_time);
    const now = new Date();
    const hoursUntilDeadline = (deadlineTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 1) {
      const existingSnapshot = await db.execute(sql`
        SELECT id FROM gameweek_projection_snapshots 
        WHERE gameweek = ${gameweek} 
        AND season = ${this.SEASON} 
        AND snapshot_type = 'deadline'
      `);

      if (existingSnapshot.rows.length === 0) {
        console.log(`📊 Capturing deadline projections for GW${gameweek}...`);
        await this.captureDeadlineSnapshot(gameweek, bootstrapData);
      }
    }
  }

  private async checkGameweekCompletion(events: any[], bootstrapData: any): Promise<void> {
    for (const event of events) {
      const gameweek = event.id;
      
      if (gameweek < this.START_GAMEWEEK || gameweek > this.END_GAMEWEEK) continue;
      if (!event.finished) continue;

      const existingActuals = await db.execute(sql`
        SELECT id FROM gameweek_projection_snapshots 
        WHERE gameweek = ${gameweek} 
        AND season = ${this.SEASON} 
        AND snapshot_type = 'actual'
      `);

      if (existingActuals.rows.length === 0) {
        const deadlineSnapshot = await db.execute(sql`
          SELECT id FROM gameweek_projection_snapshots 
          WHERE gameweek = ${gameweek} 
          AND season = ${this.SEASON} 
          AND snapshot_type = 'deadline'
        `);

        if (deadlineSnapshot.rows.length > 0) {
          console.log(`📊 Capturing actual results for GW${gameweek}...`);
          await this.captureActualResults(gameweek, deadlineSnapshot.rows[0].id as number, bootstrapData);
        }
      }
    }
  }

  private async captureDeadlineSnapshot(gameweek: number, bootstrapData: any): Promise<void> {
    try {
      const existingSnapshot = await db.execute(sql`
        SELECT id FROM gameweek_projection_snapshots 
        WHERE gameweek = ${gameweek} AND season = ${this.SEASON} AND snapshot_type = 'deadline'
      `);
      
      let snapshotId: number;
      
      if (existingSnapshot.rows.length > 0) {
        snapshotId = existingSnapshot.rows[0].id as number;
        await db.execute(sql`DELETE FROM player_projection_records WHERE snapshot_id = ${snapshotId}`);
        await db.execute(sql`DELETE FROM team_projection_records WHERE snapshot_id = ${snapshotId}`);
        await db.execute(sql`
          UPDATE gameweek_projection_snapshots SET status = 'processing', captured_at = NOW() 
          WHERE id = ${snapshotId}
        `);
        console.log(`📊 Re-capturing deadline projections for GW${gameweek} (snapshot ${snapshotId})`);
      } else {
        const snapshotResult = await db.execute(sql`
          INSERT INTO gameweek_projection_snapshots (gameweek, season, snapshot_type, status)
          VALUES (${gameweek}, ${this.SEASON}, 'deadline', 'processing')
          RETURNING id
        `);
        snapshotId = snapshotResult.rows[0].id as number;
      }
      
      const playerProjections = await this.getPlayerProjections(gameweek, bootstrapData);
      const teamProjections = await this.getTeamProjections(gameweek);

      for (const player of playerProjections) {
        await db.execute(sql`
          INSERT INTO player_projection_records (
            snapshot_id, gameweek, season, player_id, player_name, team_id, team_name, position,
            projected_points, projected_minutes, projected_goals, projected_assists,
            projected_clean_sheet, projected_bonus, projected_saves
          ) VALUES (
            ${snapshotId}, ${gameweek}, ${this.SEASON}, ${player.player_id}, ${player.player_name},
            ${player.team_id}, ${player.team_name}, ${player.position},
            ${player.projected_points}, ${player.projected_minutes}, ${player.projected_goals},
            ${player.projected_assists}, ${player.projected_clean_sheet}, ${player.projected_bonus},
            ${player.projected_saves}
          )
        `);
      }

      for (const team of teamProjections) {
        await db.execute(sql`
          INSERT INTO team_projection_records (
            snapshot_id, gameweek, season, team_id, team_name, opponent_team_id, opponent_team_name,
            is_home, projected_goals_scored, projected_goals_conceded, projected_clean_sheet_prob
          ) VALUES (
            ${snapshotId}, ${gameweek}, ${this.SEASON}, ${team.team_id}, ${team.team_name},
            ${team.opponent_team_id}, ${team.opponent_team_name}, ${team.is_home},
            ${team.projected_goals_scored}, ${team.projected_goals_conceded}, ${team.projected_clean_sheet_prob}
          )
        `);
      }

      await db.execute(sql`
        UPDATE gameweek_projection_snapshots SET status = 'completed' WHERE id = ${snapshotId}
      `);

      console.log(`✅ Captured deadline projections for GW${gameweek}: ${playerProjections.length} players, ${teamProjections.length} teams`);
    } catch (error) {
      console.error(`❌ Failed to capture deadline snapshot for GW${gameweek}:`, error);
    }
  }

  private async captureActualResults(gameweek: number, deadlineSnapshotId: number, bootstrapData: any): Promise<void> {
    try {
      const snapshotResult = await db.execute(sql`
        INSERT INTO gameweek_projection_snapshots (gameweek, season, snapshot_type, status)
        VALUES (${gameweek}, ${this.SEASON}, 'actual', 'processing')
        RETURNING id
      `);
      
      const actualSnapshotId = snapshotResult.rows[0].id as number;
      
      const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`);
      if (!liveResponse.ok) {
        console.error(`❌ Failed to fetch live data for GW${gameweek}`);
        return;
      }
      const liveData = await liveResponse.json();
      const playerStats = new Map<number, any>();
      
      for (const element of liveData.elements || []) {
        const stats = element.stats || {};
        playerStats.set(element.id, {
          total_points: stats.total_points || 0,
          minutes: stats.minutes || 0,
          goals_scored: stats.goals_scored || 0,
          assists: stats.assists || 0,
          clean_sheets: stats.clean_sheets || 0,
          bonus: stats.bonus || 0,
          saves: stats.saves || 0
        });
      }

      const projectionRecords = await db.execute(sql`
        SELECT * FROM player_projection_records WHERE snapshot_id = ${deadlineSnapshotId}
      `);

      for (const record of projectionRecords.rows) {
        const actual = playerStats.get(record.player_id as number);
        if (actual) {
          const projectedPoints = Number(record.projected_points) || 0;
          const actualPoints = actual.total_points || 0;
          const pointsDifference = actualPoints - projectedPoints;
          const absoluteError = Math.abs(pointsDifference);
          const percentageError = projectedPoints > 0 ? (absoluteError / projectedPoints) * 100 : 0;

          await db.execute(sql`
            UPDATE player_projection_records SET
              actual_points = ${actual.total_points},
              actual_minutes = ${actual.minutes},
              actual_goals = ${actual.goals_scored},
              actual_assists = ${actual.assists},
              actual_clean_sheet = ${actual.clean_sheets},
              actual_bonus = ${actual.bonus},
              actual_saves = ${actual.saves},
              points_difference = ${pointsDifference},
              absolute_error = ${absoluteError},
              percentage_error = ${percentageError},
              updated_at = NOW()
            WHERE id = ${record.id}
          `);
        }
      }

      const fixturesResponse = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`);
      if (fixturesResponse.ok) {
        const fixtures = await fixturesResponse.json();
        const teamResults = new Map<number, { goals_scored: number; goals_conceded: number; clean_sheet: number }>();
        
        for (const fixture of fixtures) {
          if (fixture.finished) {
            teamResults.set(fixture.team_h, {
              goals_scored: fixture.team_h_score,
              goals_conceded: fixture.team_a_score,
              clean_sheet: fixture.team_a_score === 0 ? 1 : 0
            });
            teamResults.set(fixture.team_a, {
              goals_scored: fixture.team_a_score,
              goals_conceded: fixture.team_h_score,
              clean_sheet: fixture.team_h_score === 0 ? 1 : 0
            });
          }
        }

        const teamRecords = await db.execute(sql`
          SELECT * FROM team_projection_records WHERE snapshot_id = ${deadlineSnapshotId}
        `);

        for (const record of teamRecords.rows) {
          const actual = teamResults.get(record.team_id as number);
          if (actual) {
            const projectedGoals = Number(record.projected_goals_scored) || 0;
            const projectedConceded = Number(record.projected_goals_conceded) || 0;
            
            await db.execute(sql`
              UPDATE team_projection_records SET
                actual_goals_scored = ${actual.goals_scored},
                actual_goals_conceded = ${actual.goals_conceded},
                actual_clean_sheet = ${actual.clean_sheet},
                goals_scored_difference = ${actual.goals_scored - projectedGoals},
                goals_conceded_difference = ${actual.goals_conceded - projectedConceded},
                updated_at = NOW()
              WHERE id = ${record.id}
            `);
          }
        }
      }

      await this.calculateAccuracySummary(gameweek, deadlineSnapshotId);

      await db.execute(sql`
        UPDATE gameweek_projection_snapshots SET status = 'completed' WHERE id = ${actualSnapshotId}
      `);

      console.log(`✅ Captured actual results for GW${gameweek}`);
    } catch (error) {
      console.error(`❌ Failed to capture actual results for GW${gameweek}:`, error);
    }
  }

  private async getPlayerProjections(gameweek: number, bootstrapData: any): Promise<PlayerProjectionRecord[]> {
    const projections: PlayerProjectionRecord[] = [];
    
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/cached/player-total-points`);
      if (!response.ok) {
        console.error('❌ Failed to fetch cached player total points');
        return projections;
      }
      
      const cachedData = await response.json();
      const teams = bootstrapData.teams || [];
      const teamMap = new Map<number, string>(teams.map((t: any) => [t.id, t.name]));
      const gwKey = String(gameweek);

      for (const player of cachedData) {
        const projectedPoints = player.gameweekProjections?.[gwKey];
        const gwBreakdown = player.pointsFromGoals?.[gwKey] !== undefined ? {
          goals: player.pointsFromGoals?.[gwKey] || 0,
          assists: player.pointsFromAssists?.[gwKey] || 0,
          cleanSheet: player.pointsFromCleanSheets?.[gwKey] || 0,
          bonus: player.pointsFromBonus?.[gwKey] || 0,
          saves: player.pointsFromSaves?.[gwKey] || 0,
          minutes: player.avgMinutesPerGameweek || 0
        } : null;
        
        if (projectedPoints !== undefined && projectedPoints > 0) {
          const teamName = player.team || player.teamName || '';
          const teamId = typeof player.teamId === 'number' ? player.teamId : 
            (teams.find((t: any) => t.name === teamName || t.short_name === teamName)?.id || 0);
          
          projections.push({
            player_id: player.playerId,
            player_name: player.playerName,
            team_id: teamId,
            team_name: teamName || teamMap.get(teamId) || 'Unknown',
            position: player.position,
            projected_points: projectedPoints,
            projected_minutes: gwBreakdown?.minutes || 0,
            projected_goals: gwBreakdown?.goals || 0,
            projected_assists: gwBreakdown?.assists || 0,
            projected_clean_sheet: gwBreakdown?.cleanSheet || 0,
            projected_bonus: gwBreakdown?.bonus || 0,
            projected_saves: gwBreakdown?.saves || 0
          });
        }
      }
      console.log(`📊 Found ${projections.length} player projections for GW${gameweek} from cached API`);
    } catch (error) {
      console.error('Error fetching player projections:', error);
    }

    return projections;
  }

  private async getTeamProjections(gameweek: number): Promise<TeamProjectionRecord[]> {
    const projections: TeamProjectionRecord[] = [];
    
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/cached/team-goal-projections`);
      if (response.ok) {
        const data = await response.json();
        
        for (const team of data) {
          const gwKey = String(gameweek);
          const projectedGoals = team.gameweekProjections?.[gwKey];
          
          if (projectedGoals !== undefined) {
            projections.push({
              team_id: team.teamId,
              team_name: team.teamName,
              opponent_team_id: null,
              opponent_team_name: null,
              is_home: null,
              projected_goals_scored: projectedGoals,
              projected_goals_conceded: 0,
              projected_clean_sheet_prob: 0
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team projections:', error);
    }

    return projections;
  }

  private async calculateAccuracySummary(gameweek: number, snapshotId: number): Promise<void> {
    try {
      const playerStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_players,
          AVG(points_difference) as avg_difference,
          AVG(absolute_error) as avg_abs_error,
          AVG(percentage_error) as avg_pct_error
        FROM player_projection_records 
        WHERE snapshot_id = ${snapshotId} AND actual_points IS NOT NULL
      `);

      const teamStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_teams,
          AVG(ABS(goals_scored_difference)) as avg_goals_error,
          AVG(ABS(goals_conceded_difference)) as avg_conceded_error,
          AVG(CASE WHEN actual_clean_sheet = 1 AND projected_clean_sheet_prob > 0.5 THEN 1
                   WHEN actual_clean_sheet = 0 AND projected_clean_sheet_prob <= 0.5 THEN 1
                   ELSE 0 END) as cs_accuracy
        FROM team_projection_records 
        WHERE snapshot_id = ${snapshotId} AND actual_goals_scored IS NOT NULL
      `);

      const ps = playerStats.rows[0] || {};
      const ts = teamStats.rows[0] || {};

      await db.execute(sql`
        INSERT INTO projection_accuracy_summary (
          gameweek, season, total_players_projected, avg_player_points_difference,
          avg_player_absolute_error, avg_player_percentage_error,
          total_teams_projected, avg_goals_scored_error, avg_goals_conceded_error,
          clean_sheet_accuracy
        ) VALUES (
          ${gameweek}, ${this.SEASON}, ${ps.total_players || 0}, ${ps.avg_difference || 0},
          ${ps.avg_abs_error || 0}, ${ps.avg_pct_error || 0},
          ${ts.total_teams || 0}, ${ts.avg_goals_error || 0}, ${ts.avg_conceded_error || 0},
          ${ts.cs_accuracy || 0}
        )
        ON CONFLICT (gameweek, season) DO UPDATE SET
          total_players_projected = EXCLUDED.total_players_projected,
          avg_player_points_difference = EXCLUDED.avg_player_points_difference,
          avg_player_absolute_error = EXCLUDED.avg_player_absolute_error,
          avg_player_percentage_error = EXCLUDED.avg_player_percentage_error,
          total_teams_projected = EXCLUDED.total_teams_projected,
          avg_goals_scored_error = EXCLUDED.avg_goals_scored_error,
          avg_goals_conceded_error = EXCLUDED.avg_goals_conceded_error,
          clean_sheet_accuracy = EXCLUDED.clean_sheet_accuracy,
          updated_at = NOW()
      `);

      console.log(`📊 Calculated accuracy summary for GW${gameweek}`);
    } catch (error) {
      console.error(`❌ Failed to calculate accuracy summary:`, error);
    }
  }

  async manualCaptureDeadline(gameweek: number): Promise<{ success: boolean; message: string }> {
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (!bootstrapResponse.ok) {
        return { success: false, message: 'Failed to fetch FPL data' };
      }
      const bootstrapData = await bootstrapResponse.json();
      
      await this.captureDeadlineSnapshot(gameweek, bootstrapData);
      return { success: true, message: `Deadline projections captured for GW${gameweek}` };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  async manualCaptureActuals(gameweek: number): Promise<{ success: boolean; message: string }> {
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (!bootstrapResponse.ok) {
        return { success: false, message: 'Failed to fetch FPL data' };
      }
      const bootstrapData = await bootstrapResponse.json();
      
      const deadlineSnapshot = await db.execute(sql`
        SELECT id FROM gameweek_projection_snapshots 
        WHERE gameweek = ${gameweek} 
        AND season = ${this.SEASON} 
        AND snapshot_type = 'deadline'
      `);

      if (deadlineSnapshot.rows.length === 0) {
        return { success: false, message: `No deadline snapshot found for GW${gameweek}` };
      }

      await this.captureActualResults(gameweek, deadlineSnapshot.rows[0].id as number, bootstrapData);
      return { success: true, message: `Actual results captured for GW${gameweek}` };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }
}

export const projectionAccuracyScheduler = new ProjectionAccuracyScheduler();

import { db } from "./db";
import { sql } from "drizzle-orm";

class GameweekProjectionService {
  /**
   * Populate gameweek-level projections for a specific gameweek
   */
  async populateGameweekProjections(gameweek: number): Promise<void> {
    try {
      console.log(`DEBUG: Populating gameweek-level projections for GW${gameweek}`);
      
      // Get bootstrap data to determine gameweek status
      const bootstrapResponse = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
      if (!bootstrapResponse.ok) {
        throw new Error("Failed to fetch bootstrap data");
      }
      const bootstrapData = await bootstrapResponse.json();
      
      // Determine gameweek status
      const currentGameweek = bootstrapData.events.find((e: any) => e.is_current)?.id || 0;
      const isCompleted = gameweek < currentGameweek;
      const isCurrent = gameweek === currentGameweek;
      
      console.log(`DEBUG: GW${gameweek} status - Completed: ${isCompleted}, Current: ${isCurrent}`);
      
      // Get fixtures for this gameweek
      const fixturesResponse = await fetch("https://fantasy.premierleague.com/api/fixtures/");
      if (!fixturesResponse.ok) {
        throw new Error("Failed to fetch fixtures");
      }
      const allFixtures = await fixturesResponse.json();
      const gameweekFixtures = allFixtures.filter((f: any) => f.event === gameweek);
      
      // Clear existing data for this gameweek
      await db.execute(sql`
        DELETE FROM gameweek_projections 
        WHERE gameweek = ${gameweek} AND season = '2025/26'
      `);
      
      await db.execute(sql`
        DELETE FROM gameweek_team_projections 
        WHERE gameweek = ${gameweek} AND season = '2025/26'
      `);
      
      // Process ALL players in FPL database (no filtering)
      const players = bootstrapData.elements
        .sort((a: any, b: any) => parseFloat(b.total_points) - parseFloat(a.total_points)); // Sort by total points
      
      const playerPromises = players.map(async (fplPlayer: any) => {
        const team = bootstrapData.teams.find((t: any) => t.id === fplPlayer.team);
        const position = ['', 'GKP', 'DEF', 'MID', 'FWD'][fplPlayer.element_type] || 'MID';
        
        let projectedGoals = 0, projectedAssists = 0, projectedCleanSheets = 0;
        let projectedDefensive = 0, projectedMinutes = 0, projectedBonus = 0;
        let actualGoals = null, actualAssists = null, actualCleanSheets = null;
        let actualDefensive = null, actualMinutes = null, actualBonus = null, actualTotal = null;
        
        if (isCompleted) {
          // Get actual data from player's gameweek history
          try {
            const playerResponse = await fetch(`https://fantasy.premierleague.com/api/element-summary/${fplPlayer.id}/`);
            if (playerResponse.ok) {
              const playerData = await playerResponse.json();
              const gameweekData = playerData.history.find((h: any) => h.round === gameweek);
              
              if (gameweekData) {
                actualGoals = gameweekData.goals_scored;
                actualAssists = gameweekData.assists;
                actualCleanSheets = gameweekData.clean_sheets;
                actualDefensive = gameweekData.defensive_contribution || 0;
                actualMinutes = gameweekData.minutes;
                actualBonus = gameweekData.bonus;
                actualTotal = gameweekData.total_points;
                
                // Use actual data as projections for completed gameweeks
                projectedGoals = actualGoals;
                projectedAssists = actualAssists;
                projectedCleanSheets = actualCleanSheets;
                projectedDefensive = actualDefensive;
                projectedMinutes = actualMinutes;
                projectedBonus = actualBonus;
              }
            }
          } catch (error) {
            console.error(`Error fetching actual data for player ${fplPlayer.id}:`, error);
          }
        } else {
          // Calculate projections for upcoming gameweeks
          const form = parseFloat(fplPlayer.form || "0");
          
          // Form-based projections
          projectedGoals = position === 'FWD' ? form * 0.15 : position === 'MID' ? form * 0.08 : form * 0.03;
          projectedAssists = position === 'MID' ? form * 0.12 : position === 'FWD' ? form * 0.08 : form * 0.04;
          projectedCleanSheets = position === 'GKP' ? 0.35 : position === 'DEF' ? 0.32 : position === 'MID' ? 0.28 : 0;
          projectedDefensive = position === 'DEF' ? 0.25 : position === 'MID' ? 0.15 : 0;
          projectedMinutes = Math.min(90, Math.max(60, form * 15));
          projectedBonus = form * 0.3;
        }
        
        // Calculate FPL points
        const goalPoints = position === 'GKP' || position === 'DEF' ? 6 : position === 'MID' ? 5 : 4;
        const pointsFromGoals = projectedGoals * goalPoints;
        const pointsFromAssists = projectedAssists * 3;
        const pointsFromCleanSheets = projectedCleanSheets * (position === 'GKP' || position === 'DEF' ? 4 : position === 'MID' ? 1 : 0);
        const pointsFromDefensive = projectedDefensive * 2;
        const pointsFromMinutes = projectedMinutes >= 60 ? 2 : projectedMinutes >= 1 ? 1 : 0;
        const pointsFromBonus = projectedBonus;
        
        const totalGameweekPoints = pointsFromGoals + pointsFromAssists + pointsFromCleanSheets + 
                                    pointsFromDefensive + pointsFromMinutes + pointsFromBonus;
        
        // Insert into gameweek_projections table
        await db.execute(sql`
          INSERT INTO gameweek_projections (
            player_id, player_name, team_id, team_name, position, gameweek, season,
            projected_goals, projected_assists, projected_clean_sheets, 
            projected_defensive_contributions, projected_minutes, projected_bonus,
            points_from_goals, points_from_assists, points_from_clean_sheets,
            points_from_defensive_contributions, points_from_minutes, points_from_bonus,
            total_gameweek_points, is_completed, is_current,
            actual_goals, actual_assists, actual_clean_sheets,
            actual_defensive_contributions, actual_minutes, actual_bonus, actual_total_points
          ) VALUES (
            ${fplPlayer.id}, ${fplPlayer.web_name}, ${fplPlayer.team}, ${team?.short_name || 'UNK'},
            ${position}, ${gameweek}, '2025/26',
            ${projectedGoals}, ${projectedAssists}, ${projectedCleanSheets},
            ${projectedDefensive}, ${projectedMinutes}, ${projectedBonus},
            ${pointsFromGoals}, ${pointsFromAssists}, ${pointsFromCleanSheets},
            ${pointsFromDefensive}, ${pointsFromMinutes}, ${pointsFromBonus},
            ${totalGameweekPoints}, ${isCompleted}, ${isCurrent},
            ${actualGoals}, ${actualAssists}, ${actualCleanSheets},
            ${actualDefensive}, ${actualMinutes}, ${actualBonus}, ${actualTotal}
          )
        `);
      });
      
      await Promise.all(playerPromises);
      
      // Process team-level data
      const teamPromises = bootstrapData.teams.map(async (team: any) => {
        let projectedGoalsFor = 0, projectedGoalsAgainst = 0, projectedCleanSheetProb = 0, projectedAssists = 0;
        let actualGoalsFor = null, actualGoalsAgainst = null, actualCleanSheet = null, actualAssists = null;
        
        // Find team's fixture for this gameweek
        const teamFixture = gameweekFixtures.find((f: any) => 
          f.team_h === team.id || f.team_a === team.id
        );
        
        if (isCompleted && teamFixture) {
          // Use actual fixture data
          const isHome = teamFixture.team_h === team.id;
          actualGoalsFor = isHome ? teamFixture.team_h_score : teamFixture.team_a_score;
          actualGoalsAgainst = isHome ? teamFixture.team_a_score : teamFixture.team_h_score;
          actualCleanSheet = actualGoalsAgainst === 0;
          
          // Sum actual assists from all team players for this gameweek
          const teamPlayerAssists = await db.execute(sql`
            SELECT SUM(actual_assists) as total_assists
            FROM gameweek_projections 
            WHERE team_id = ${team.id} AND gameweek = ${gameweek} AND season = '2025/26'
          `);
          actualAssists = parseInt(teamPlayerAssists.rows[0]?.total_assists || "0");
          
          // Use actual data as projections
          projectedGoalsFor = actualGoalsFor;
          projectedGoalsAgainst = actualGoalsAgainst;
          projectedCleanSheetProb = actualCleanSheet ? 1.0 : 0.0;
          projectedAssists = actualAssists;
        } else {
          // Calculate projections based on team strength
          const teamStrength = team.strength || 1000;
          const strengthFactor = teamStrength / 1000;
          
          projectedGoalsFor = 1.5 * strengthFactor;
          projectedGoalsAgainst = 1.2 / strengthFactor;
          projectedCleanSheetProb = Math.max(0.1, Math.min(0.6, 0.35 * strengthFactor));
          projectedAssists = projectedGoalsFor * 0.8; // Rough estimate
        }
        
        // Insert team projection
        await db.execute(sql`
          INSERT INTO gameweek_team_projections (
            team_id, team_name, gameweek, season,
            projected_goals_for, projected_goals_against, projected_clean_sheet_probability, projected_assists,
            is_completed, is_current,
            actual_goals_for, actual_goals_against, actual_clean_sheet, actual_assists
          ) VALUES (
            ${team.id}, ${team.short_name}, ${gameweek}, '2025/26',
            ${projectedGoalsFor}, ${projectedGoalsAgainst}, ${projectedCleanSheetProb}, ${projectedAssists},
            ${isCompleted}, ${isCurrent},
            ${actualGoalsFor}, ${actualGoalsAgainst}, ${actualCleanSheet}, ${actualAssists}
          )
        `);
      });
      
      await Promise.all(teamPromises);
      
      console.log(`DEBUG: Successfully populated GW${gameweek} projections (${players.length} players, ${bootstrapData.teams.length} teams)`);
      
    } catch (error) {
      console.error(`Error populating gameweek ${gameweek} projections:`, error);
      throw error;
    }
  }
  
  /**
   * Populate multiple gameweeks (batch operation)
   */
  async populateGameweekRange(startGW: number, endGW: number): Promise<void> {
    console.log(`DEBUG: Populating gameweeks ${startGW} to ${endGW}`);
    
    for (let gw = startGW; gw <= endGW; gw++) {
      await this.populateGameweekProjections(gw);
      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`DEBUG: Completed gameweek range population (GW${startGW}-${endGW})`);
  }
}

export const gameweekProjectionService = new GameweekProjectionService();
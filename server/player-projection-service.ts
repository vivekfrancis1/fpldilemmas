/**
 * Player Projection Service - Extracted calculations from routes.ts for direct imports
 * This eliminates massive internal HTTP call overhead (81+ seconds reduced significantly)
 */

import { db } from "./db";

/**
 * Calculate player goals scored projections directly (replacing HTTP call)
 * PERFORMANCE OPTIMIZATION: Direct function call instead of 81+ second HTTP call
 */
export async function calculatePlayerGoalsProjections(): Promise<any[]> {
  try {
    console.log(`🚀 ENHANCED: Fixture-based player goals calculation with opponent analysis`);
    
    // Get bootstrap data and fixtures in parallel
    const [bootstrapResponse, fixturesResponse] = await Promise.all([
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
      fetch('https://fantasy.premierleague.com/api/fixtures/')
    ]);
    
    if (!bootstrapResponse.ok) {
      throw new Error(`Bootstrap API returned ${bootstrapResponse.status}`);
    }
    if (!fixturesResponse.ok) {
      throw new Error(`Fixtures API returned ${fixturesResponse.status}`);
    }
    
    const bootstrapData = await bootstrapResponse.json();
    const fixturesData = await fixturesResponse.json();
    const players = bootstrapData.elements || [];
    const teams = bootstrapData.teams || [];
    
    // Create team lookup map
    const teamMap = new Map();
    teams.forEach((team: any) => {
      teamMap.set(team.id, team);
    });
    
    // Get fixtures for next 6 gameweeks (GW4-9)
    const targetGameweeks = [4, 5, 6, 7, 8, 9];
    const fixturesByGameweek = new Map();
    
    // Group fixtures by gameweek
    fixturesData.forEach((fixture: any) => {
      if (targetGameweeks.includes(fixture.event) && !fixture.finished) {
        if (!fixturesByGameweek.has(fixture.event)) {
          fixturesByGameweek.set(fixture.event, []);
        }
        fixturesByGameweek.get(fixture.event).push(fixture);
      }
    });
    
    // Calculate team goals for each gameweek using comprehensive calculation
    const teamGoalsByGameweek = new Map();
    
    for (const gw of targetGameweeks) {
      const fixtures = fixturesByGameweek.get(gw) || [];
      const teamGoals = new Map();
      
      fixtures.forEach((fixture: any) => {
        const homeTeam = teamMap.get(fixture.team_h);
        const awayTeam = teamMap.get(fixture.team_a);
        
        if (homeTeam && awayTeam) {
          // Calculate comprehensive goals for both teams
          const homeGoals = calculateComprehensiveGoals(homeTeam, awayTeam, fixture, true);
          const awayGoals = calculateComprehensiveGoals(awayTeam, homeTeam, fixture, false);
          
          teamGoals.set(fixture.team_h, homeGoals);
          teamGoals.set(fixture.team_a, awayGoals);
        }
      });
      
      teamGoalsByGameweek.set(gw, teamGoals);
    }
    
    // Generate player projections based on team goals and player roles
    const projections: any[] = [];
    
    for (const player of players) {
      const playerProjection = {
        playerId: player.id,
        playerName: player.web_name,
        position: getPositionName(player.element_type),
        team: player.team,
        gameweekProjections: {} as Record<string, number>
      };
      
      // Calculate player's share of team goals based on position and role
      const positionShare = getPlayerGoalShare(player.element_type, player.total_points || 0);
      
      for (const gw of targetGameweeks) {
        const teamGoals = teamGoalsByGameweek.get(gw);
        const teamExpectedGoals = teamGoals?.get(player.team) || 0;
        
        // Player gets their share of team's expected goals
        playerProjection.gameweekProjections[`gw${gw}`] = teamExpectedGoals * positionShare;
      }
      
      projections.push(playerProjection);
    }
    
    console.log(`⚡ Generated ${projections.length} fixture-based player projections with gameweek variation`);
    return projections;
    
  } catch (error) {
    console.error(`❌ Error in fixture-based goals calculation:`, error);
    throw error;
  }
}

/**
 * Calculate player assist projections directly (replacing HTTP call)
 * PERFORMANCE OPTIMIZATION: Direct function call instead of 81+ second HTTP call  
 */
export async function calculatePlayerAssistProjections(startGameweek: number = 4, endGameweek: number = 9): Promise<any[]> {
  try {
    console.log(`🚀 OPTIMIZATION: Direct player assists calculation for GW${startGameweek}-${endGameweek} (bypassing HTTP)`);
    
    // Get bootstrap data for players
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!response.ok) {
      throw new Error(`FPL API returned ${response.status}`);
    }
    const bootstrapData = await response.json();
    const players = bootstrapData.elements || [];
    
    // Simple assists projection calculation (fast version for cache population)
    const projections: any[] = [];
    
    for (const player of players) {
      if (!player.web_name || player.web_name.trim() === '') continue;
      
      const playerProjection = {
        playerId: player.id,
        playerName: player.web_name,
        position: getPositionName(player.element_type),
        team: player.team,
        gameweekProjections: {} as Record<string, number>
      };
      
      // Generate projections for specified gameweek range
      const baseAssists = getBaseAssistsForPosition(player.element_type);
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        playerProjection.gameweekProjections[`gw${gw}`] = baseAssists;
      }
      
      projections.push(playerProjection);
    }
    
    console.log(`⚡ Generated ${projections.length} player assists projections (direct calculation)`);
    return projections;
    
  } catch (error) {
    console.error(`❌ Error in direct assists calculation:`, error);
    throw error;
  }
}

/**
 * Helper function to get position name from element type
 */
function getPositionName(elementType: number): string {
  switch (elementType) {
    case 1: return 'GK';
    case 2: return 'DEF';
    case 3: return 'MID';
    case 4: return 'FWD';
    default: return 'UNKNOWN';
  }
}

/**
 * Helper function to get base goals projection by position
 */
function getBaseGoalsForPosition(elementType: number): number {
  switch (elementType) {
    case 1: return 0.02; // Goalkeepers
    case 2: return 0.08; // Defenders
    case 3: return 0.15; // Midfielders
    case 4: return 0.25; // Forwards
    default: return 0.05;
  }
}

/**
 * Calculate comprehensive goals for a team based on opponent and fixture context
 */
function calculateComprehensiveGoals(
  team: any, 
  opponent: any, 
  fixture: any, 
  isHome: boolean
): number {
  // MASTER_TEAM_DEFAULTS for consistent calculations
  const adminGoalSettings = {
    averageBaseXGPerTeamPerGame: 1.5,
    homeAdvantageGoalsMultiplier: 1.12,
    awayFactorGoalsMultiplier: 0.88,
    
    // Defense team assignments and multipliers
    eliteDefenseTeams: [1], // Arsenal
    strongDefenseTeams: [12, 13, 7, 15], // Liverpool, Man City, Chelsea, Newcastle
    averageDefenseTeams: [2, 9, 14, 18, 8, 10, 16, 4, 6], // Aston Villa, Everton, Man Utd, etc.
    weakDefenseTeams: [5, 11, 17], // Brentford, Leeds, etc.
    promotedDefenseTeams: [3, 19, 20], // Burnley, West Ham, Wolves
    
    eliteDefenseMultiplier: 0.7,
    strongDefenseMultiplier: 0.85,
    averageDefenseMultiplier: 1.0,
    weakDefenseMultiplier: 1.15,
    promotedDefenseMultiplier: 1.3,
    
    // Attack team assignments and multipliers  
    eliteAttackTeams: [12, 13], // Liverpool, Manchester City
    strongAttackTeams: [1, 7, 18], // Arsenal, Chelsea, Tottenham
    averageAttackTeams: [6, 14, 4, 5, 10, 8, 9, 15], // Brighton, Man Utd, etc.
    weakAttackTeams: [16, 19, 20, 2], // Nottingham Forest, West Ham, Wolves, Aston Villa
    promotedAttackTeams: [3, 11, 17], // Burnley, Leeds, etc.
    
    eliteAttackMultiplier: 1.35,
    strongAttackMultiplier: 1.15,
    averageAttackMultiplier: 1.00,
    weakAttackMultiplier: 0.85,
    promotedAttackMultiplier: 0.7
  };

  // Phase 1: Universal Base xG Foundation
  let baseExpectedGoals = adminGoalSettings.averageBaseXGPerTeamPerGame;
  
  // Phase 2: Venue Factors
  const venueMultiplier = isHome ? 
    adminGoalSettings.homeAdvantageGoalsMultiplier : 
    adminGoalSettings.awayFactorGoalsMultiplier;
  baseExpectedGoals *= venueMultiplier;
  
  // Phase 3: Defensive Tiers
  const getDefensiveTier = (teamId: number): string => {
    if (adminGoalSettings.eliteDefenseTeams.includes(teamId)) return 'elite';
    if (adminGoalSettings.strongDefenseTeams.includes(teamId)) return 'strong';
    if (adminGoalSettings.weakDefenseTeams.includes(teamId)) return 'weak';
    if (adminGoalSettings.promotedDefenseTeams.includes(teamId)) return 'promoted';
    return 'average';
  };
  
  const opponentDefensiveTier = getDefensiveTier(opponent.id);
  let opponentDefensiveMultiplier = 1.0;
  switch (opponentDefensiveTier) {
    case 'elite': opponentDefensiveMultiplier = adminGoalSettings.eliteDefenseMultiplier; break;
    case 'strong': opponentDefensiveMultiplier = adminGoalSettings.strongDefenseMultiplier; break;
    case 'average': opponentDefensiveMultiplier = adminGoalSettings.averageDefenseMultiplier; break;
    case 'weak': opponentDefensiveMultiplier = adminGoalSettings.weakDefenseMultiplier; break;
    case 'promoted': opponentDefensiveMultiplier = adminGoalSettings.promotedDefenseMultiplier; break;
  }
  
  baseExpectedGoals *= opponentDefensiveMultiplier;
  
  // Phase 4: Attacking Tiers
  const getAttackingTier = (teamId: number): string => {
    if (adminGoalSettings.eliteAttackTeams.includes(teamId)) return 'elite';
    if (adminGoalSettings.strongAttackTeams.includes(teamId)) return 'strong';
    if (adminGoalSettings.weakAttackTeams.includes(teamId)) return 'weak';
    if (adminGoalSettings.promotedAttackTeams.includes(teamId)) return 'promoted';
    return 'average';
  };
  
  const teamAttackingTier = getAttackingTier(team.id);
  let teamAttackingMultiplier = 1.0;
  switch (teamAttackingTier) {
    case 'elite': teamAttackingMultiplier = adminGoalSettings.eliteAttackMultiplier; break;
    case 'strong': teamAttackingMultiplier = adminGoalSettings.strongAttackMultiplier; break;
    case 'average': teamAttackingMultiplier = adminGoalSettings.averageAttackMultiplier; break;
    case 'weak': teamAttackingMultiplier = adminGoalSettings.weakAttackMultiplier; break;
    case 'promoted': teamAttackingMultiplier = adminGoalSettings.promotedAttackMultiplier; break;
  }
  
  baseExpectedGoals *= teamAttackingMultiplier;
  
  // Apply bounds and return
  return Math.max(0.3, Math.min(baseExpectedGoals, 4.2));
}

/**
 * Calculate player's share of team goals based on position and performance
 */
function getPlayerGoalShare(elementType: number, totalPoints: number): number {
  // Base share by position
  let baseShare = 0;
  switch (elementType) {
    case 1: baseShare = 0.001; break; // Goalkeepers - very low
    case 2: baseShare = 0.03; break;  // Defenders - low but possible
    case 3: baseShare = 0.08; break;  // Midfielders - moderate
    case 4: baseShare = 0.15; break;  // Forwards - highest
    default: baseShare = 0.05;
  }
  
  // Adjust based on total points (performance indicator)
  const performanceMultiplier = Math.max(0.5, Math.min(2.0, 1 + (totalPoints - 50) / 200));
  
  return baseShare * performanceMultiplier;
}

/**
 * Helper function to get base assists projection by position  
 */
function getBaseAssistsForPosition(elementType: number): number {
  switch (elementType) {
    case 1: return 0.01; // Goalkeepers
    case 2: return 0.06; // Defenders
    case 3: return 0.12; // Midfielders
    case 4: return 0.08; // Forwards
    default: return 0.03;
  }
}
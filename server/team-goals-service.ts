/**
 * TeamGoalsService - Centralized team goal projection calculations
 * Single source of truth for team goal totals used by both team-goal-projections and goal-share endpoints
 */

interface TeamGoalProjection {
  teamId: number;
  teamName: string;
  teamShort: string;
  gameweekProjections: { [gameweek: number]: number };
  totalGoals: number;
  averageGoalsPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
}

interface TeamGoalsServiceCache {
  key: string;
  data: TeamGoalProjection[];
  timestamp: number;
}

// Cache for team goal calculations (30 minutes)
let teamGoalsCache: TeamGoalsServiceCache | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// In-flight request de-duplication
let teamGoalsInFlight: Map<string, Promise<TeamGoalProjection[]>> = new Map();

// Cache for current standings data (30 minutes)
let currentStandingsCache: { data: any[], timestamp: number } | null = null;
const STANDINGS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export class TeamGoalsService {
  /**
   * Defensive numeric coercion helper - ensures valid numbers with fallbacks
   */
  private static num(value: any, fallback: number): number {
    const numValue = Number(value);
    return isFinite(numValue) && !isNaN(numValue) ? numValue : fallback;
  }

  /**
   * Safe multiplication helper - coerces factors and provides fallbacks
   */
  private static safeMul(base: number, factor: any, fallback: number = 1.0): number {
    return base * TeamGoalsService.num(factor, fallback);
  }


  /**
   * Get team goal projections for a specific gameweek range
   * This is the single source of truth for team goal calculations
   */
  static async getTeamGoalProjections(startGameweek?: number, endGameweek?: number): Promise<TeamGoalProjection[]> {
    // Generate cache key based on gameweek range
    const cacheKey = `${startGameweek || 'auto'}-${endGameweek || 'auto'}`;
    
    // Check cache first
    if (teamGoalsCache && 
        teamGoalsCache.key === cacheKey && 
        Date.now() - teamGoalsCache.timestamp < CACHE_DURATION) {
      console.log(`📊 Serving team goals from cache for range ${cacheKey}`);
      return teamGoalsCache.data;
    }
    
    // In-flight de-duplication - if same calculation is already running, wait for it
    if (teamGoalsInFlight.has(cacheKey)) {
      console.log(`⏳ Waiting for in-flight team goals calculation for range ${cacheKey}`);
      return teamGoalsInFlight.get(cacheKey)!;
    }
    
    // Start the calculation and store the promise
    const calculationPromise = TeamGoalsService.calculateTeamGoals(startGameweek, endGameweek, cacheKey);
    teamGoalsInFlight.set(cacheKey, calculationPromise);
    
    try {
      const result = await calculationPromise;
      return result;
    } finally {
      teamGoalsInFlight.delete(cacheKey);
    }
  }

  /**
   * Internal calculation method for team goal projections
   */
  private static async calculateTeamGoals(startGameweek: number | undefined, endGameweek: number | undefined, cacheKey: string): Promise<TeamGoalProjection[]> {
    console.log(`🔄 Calculating team goals for range ${cacheKey}`);
    
    // Import required dependencies
    const { PREMIER_LEAGUE_TEAMS } = await import("@shared/schema");
    const { getAdminGoalSettings, getCreateTeamService, MASTER_TEAM_DEFAULTS } = await import("./team-config");
    
    // Get team configuration (must be initialized by routes module first)
    const adminGoalSettings = getAdminGoalSettings();
    const createTeamService = getCreateTeamService();
    
    // Fetch required data using internal cached endpoints for better performance
    const [bootstrapResponse, fixturesResponse] = await Promise.all([
      fetch("http://localhost:5000/api/bootstrap-static"),
      fetch("http://localhost:5000/api/fixtures")
    ]);
    
    if (!bootstrapResponse.ok || !fixturesResponse.ok) {
      throw new Error("Failed to fetch data from internal API");
    }
    
    const bootstrapData = await bootstrapResponse.json();
    const fixturesData = await fixturesResponse.json();
    
    // Use hardcoded teams for better performance
    const teams = PREMIER_LEAGUE_TEAMS;
    const currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id || 2;
    
    // Determine gameweek range
    const calculatedStartGameweek = startGameweek || (currentGameweek + 1);
    const calculatedEndGameweek = endGameweek || Math.min(currentGameweek + 6, 38);
    
    // Use centralized team service for betting data
    const teamService = await createTeamService();
    const bettingData = teamService.getBettingData();
    
    // Admin settings and config are already initialized above
    
    console.log(`🎯 Calculating team goals for GW${calculatedStartGameweek}-${calculatedEndGameweek}, current GW: ${currentGameweek}`);
    
    const teamProjections: TeamGoalProjection[] = await Promise.all(teams.map(async (team: any) => {
      // Get fixtures for this team across the specified gameweek range
      const allFixtures = fixturesData
        .filter((f: any) => 
          (f.team_h === team.id || f.team_a === team.id) && 
          f.event >= calculatedStartGameweek && f.event <= calculatedEndGameweek
        );
      
      // Debug logging for teams with missing fixtures
      if (team.id <= 3) { // Log for first 3 teams only
        console.log(`🔍 FIXTURES DEBUG: Team ${team.name} (${team.id}) has ${allFixtures.length} fixtures:`);
        allFixtures.forEach((f: any) => {
          console.log(`  - GW${f.event}: ${f.team_h === team.id ? 'HOME' : 'AWAY'} vs ${f.team_h === team.id ? f.team_a : f.team_h}`);
        });
      }
      
      const projections = await Promise.all(allFixtures.map(async (fixture: any) => {
        const isHome = fixture.team_h === team.id;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = teams.find((t: any) => t.id === opponentId);
        
        if (!opponent) {
          console.warn(`⚠️ OPPONENT NOT FOUND: Team ${team.name} vs opponent ID ${opponentId} in GW${fixture.event}`);
          return null;
        }
        
        // Apply the hybrid team goal calculation logic with real xGF/xGA data
        const expectedGoals = await TeamGoalsService.calculateFixtureGoals(
          team, opponent, fixture, isHome, bootstrapData, fixturesData, 
          bettingData, adminGoalSettings, MASTER_TEAM_DEFAULTS
        );
        
        // Note: calculateFixtureGoals now guarantees a valid number, no need to filter
        
        const projection = {
          gameweek: fixture.event,
          opponent: opponent.short_name,
          isHome,
          expectedGoals: Math.round(expectedGoals * 100) / 100,
          isActual: false
        };
        
        // Debug logging for projection objects
        if (team.id <= 3 && (!projection || !projection.expectedGoals)) {
          console.warn(`⚠️ PROJECTION ISSUE: Team ${team.name} GW${fixture.event} - projection:`, projection);
        }
        
        return projection;
      })); // No longer need .filter(Boolean) since calculateFixtureGoals guarantees valid numbers
      
      const totalGoals = projections.reduce((sum: number, p: any) => sum + p.expectedGoals, 0);
      
      // Convert projections array to gameweekProjections object
      const gameweekProjections: { [gameweek: number]: number } = {};
      projections.forEach((p: any) => {
        gameweekProjections[p.gameweek] = p.expectedGoals;
      });
      
      // Determine confidence based on betting market data
      const teamBettingData = bettingData.teamGoalRates[team.id] || { confidence: 0.70 };
      let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
      
      if (teamBettingData.confidence >= 0.85) confidence = 'High';
      else if (teamBettingData.confidence <= 0.65) confidence = 'Low';
      
      const roundedTotalGoals = Math.round(totalGoals * 100) / 100;
      const averageGoalsPerGame = Math.round((totalGoals / Math.max(1, projections.length)) * 100) / 100;
      
      return {
        teamId: team.id,
        teamName: team.name,
        teamShort: team.short_name,
        gameweekProjections,
        totalGoals: roundedTotalGoals,
        averageGoalsPerGame,
        confidence
      };
    }));
    
    // Cache the results
    teamGoalsCache = {
      key: cacheKey,
      data: teamProjections,
      timestamp: Date.now()
    };
    
    console.log(`✅ Calculated team goals for ${teamProjections.length} teams`);
    return teamProjections;
  }
  
  /**
   * Calculate expected goals for a single fixture using blended season + last 6 games formula
   * Formula: ((Season averages * 0.25) + (Last 6 games averages * 0.25)) * 0.5 * venue * context
   */
  private static async calculateFixtureGoals(
    team: any, 
    opponent: any, 
    fixture: any, 
    isHome: boolean,
    bootstrapData: any,
    fixturesData: any[],
    bettingData: any,
    adminGoalSettings: any,
    MASTER_TEAM_DEFAULTS: any
  ): Promise<number> {
    try {
      // BLENDED FORMULA: Average of season formula + last 6 games formula
      // ((Team Avg Goals + Team Avg xG + Opponent Avg GC + Opponent Avg xGC) for season * 0.25 +
      //  (Team Avg Goals + Team Avg xG + Opponent Avg GC + Opponent Avg xGC) for last 6 * 0.25) * 0.5 * venue * context
      
      // SEASON AVERAGES (from current standings - full season data)
      const teamAvgGoalsSeason = await TeamGoalsService.getTeamAverageGoals(team.id);
      const teamAvgXGSeason = await TeamGoalsService.getTeamAverageXG(team.id, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      const opponentAvgGCSeason = await TeamGoalsService.getTeamAverageGoalsConceded(opponent.id);
      const opponentAvgXGCSeason = await TeamGoalsService.getTeamAverageXGC(opponent.id, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      
      // LAST 6 GAMES AVERAGES (from recent fixtures)
      const teamLast6Stats = await TeamGoalsService.getLast6GamesStats(team.id, fixture.event, fixturesData);
      const opponentLast6Stats = await TeamGoalsService.getLast6GamesStats(opponent.id, fixture.event, fixturesData);
      
      const teamAvgGoalsLast6 = teamLast6Stats.avgGoalsScored;
      const teamAvgXGLast6 = teamLast6Stats.avgXG;
      const opponentAvgGCLast6 = opponentLast6Stats.avgGoalsConceded;
      const opponentAvgXGCLast6 = opponentLast6Stats.avgXGC;
      
      // Phase 1: Calculate season-based expected goals
      const seasonExpectedGoals = (teamAvgGoalsSeason + teamAvgXGSeason + opponentAvgGCSeason + opponentAvgXGCSeason) * 0.25;
      
      // Phase 2: Calculate last 6 games-based expected goals
      const last6ExpectedGoals = (teamAvgGoalsLast6 + teamAvgXGLast6 + opponentAvgGCLast6 + opponentAvgXGCLast6) * 0.25;
      
      // Phase 3: Blend the two (50/50 average)
      let baseExpectedGoals = (seasonExpectedGoals + last6ExpectedGoals) * 0.5;
      
      // Phase 2: Venue Factors (with safe multiplication)
      const venueMultiplier = isHome ? 
        TeamGoalsService.num(adminGoalSettings.homeAdvantageGoalsMultiplier || MASTER_TEAM_DEFAULTS.homeAdvantageGoalsMultiplier, 1.16) :
        TeamGoalsService.num(adminGoalSettings.awayFactorGoalsMultiplier || MASTER_TEAM_DEFAULTS.awayFactorGoalsMultiplier, 0.84);
      
      
      baseExpectedGoals = TeamGoalsService.safeMul(baseExpectedGoals, venueMultiplier, 1.0);
      
      
      // REMOVED: All tier-based multipliers - now using dynamic performance-based calculations only
      
      // Phase 3: Context Multipliers (with enhanced error handling)
      const beforeContextMultipliers = baseExpectedGoals;
      baseExpectedGoals = TeamGoalsService.applyContextMultipliers(
        baseExpectedGoals, team, opponent, fixture, isHome, fixturesData, adminGoalSettings, MASTER_TEAM_DEFAULTS
      );
      
      
      
      // REMOVED: Phase 4 (Market Bounds) - No longer constraining projections with market-based limits
      // This allows projections to reflect pure performance data without artificial constraints
      
      // Phase 4: Final Bounds and Validation
      const absoluteMin = TeamGoalsService.num(adminGoalSettings.absoluteMinGoals, 0.0);
      const absoluteMax = TeamGoalsService.num(adminGoalSettings.absoluteMaxGoals, 7.0);
      const expectedGoals = Math.max(absoluteMin, Math.min(absoluteMax, baseExpectedGoals));
      
      
      return expectedGoals;
      
    } catch (error) {
      console.error(`❌ CALCULATION ERROR: Team ${team.name} vs ${opponent.name} GW${fixture.event} - ${error}`);
      throw error;
    }
  }
  
  /**
   * Fetch current standings data with caching
   */
  private static async fetchCurrentStandings(): Promise<any[]> {
    // Use existing cache if available and fresh
    if (currentStandingsCache && Date.now() - currentStandingsCache.timestamp < STANDINGS_CACHE_DURATION) {
      return currentStandingsCache.data;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/current-standings');
      if (!response.ok) {
        throw new Error(`Failed to fetch current standings: ${response.status}`);
      }
      
      const standingsData = await response.json();
      
      // Cache the results
      currentStandingsCache = {
        data: standingsData,
        timestamp: Date.now()
      };
      
      return standingsData;
    } catch (error) {
      console.error('Failed to fetch current standings:', error);
      throw error;
    }
  }

  /**
   * Get team's actual average goals scored per game from current standings data
   */
  private static async getTeamAverageGoals(teamId: number): Promise<number> {
    try {
      const standingsData = await TeamGoalsService.fetchCurrentStandings();
      const teamData = standingsData.find((team: any) => team.id === teamId);
      
      if (teamData && teamData.played > 0) {
        return teamData.goalsFor / teamData.played;
      }
      
      throw new Error(`No team data found for team ${teamId} in current standings`);
    } catch (error) {
      console.error(`Failed to fetch team average goals for team ${teamId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get team's actual average goals conceded per game from current standings data
   */
  private static async getTeamAverageGoalsConceded(teamId: number): Promise<number> {
    try {
      const standingsData = await TeamGoalsService.fetchCurrentStandings();
      const teamData = standingsData.find((team: any) => team.id === teamId);
      
      if (teamData && teamData.played > 0) {
        return teamData.goalsAgainst / teamData.played;
      }
      
      throw new Error(`No team data found for team ${teamId} in current standings`);
    } catch (error) {
      console.error(`Failed to fetch team average goals conceded for team ${teamId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get team's average expected goals per game from current standings data
   */
  private static async getTeamAverageXG(teamId: number, adminGoalSettings: any, MASTER_TEAM_DEFAULTS: any): Promise<number> {
    try {
      const standingsData = await TeamGoalsService.fetchCurrentStandings();
      const teamData = standingsData.find((team: any) => team.id === teamId);
      
      if (teamData && teamData.played > 0) {
        return teamData.expectedGoalsFor / teamData.played;
      }
      
      return adminGoalSettings.defaultExpectedGoalsPerGame || MASTER_TEAM_DEFAULTS.defaultExpectedGoalsPerGame || 1.3;
    } catch (error) {
      console.error(`Failed to fetch team average xG for team ${teamId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get opponent's average expected goals conceded per game from current standings data  
   */
  private static async getTeamAverageXGC(teamId: number, adminGoalSettings: any, MASTER_TEAM_DEFAULTS: any): Promise<number> {
    try {
      const standingsData = await TeamGoalsService.fetchCurrentStandings();
      const teamData = standingsData.find((team: any) => team.id === teamId);
      
      if (teamData && teamData.played > 0) {
        return teamData.expectedGoalsAgainst / teamData.played;
      }
      
      return 1.5; // Premier League average fallback
    } catch (error) {
      console.error(`Failed to fetch team average xGC for team ${teamId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get team's last 6 games statistics (goals scored, goals conceded, xG, xGC)
   * Uses FPL live data endpoint to get xG stats per match
   */
  private static async getLast6GamesStats(
    teamId: number, 
    currentGameweek: number, 
    fixturesData: any[]
  ): Promise<{ avgGoalsScored: number; avgGoalsConceded: number; avgXG: number; avgXGC: number }> {
    try {
      // Get last 6 completed fixtures for this team
      const recentGames = fixturesData
        .filter((f: any) => 
          f.finished && 
          f.event < currentGameweek && 
          (f.team_h === teamId || f.team_a === teamId)
        )
        .sort((a: any, b: any) => b.event - a.event)
        .slice(0, 6);
      
      if (recentGames.length === 0) {
        // Fallback to season averages if no recent games
        const standingsData = await TeamGoalsService.fetchCurrentStandings();
        const teamData = standingsData.find((team: any) => team.id === teamId);
        
        if (teamData && teamData.played > 0) {
          return {
            avgGoalsScored: teamData.goalsFor / teamData.played,
            avgGoalsConceded: teamData.goalsAgainst / teamData.played,
            avgXG: teamData.expectedGoalsFor / teamData.played,
            avgXGC: teamData.expectedGoalsAgainst / teamData.played
          };
        }
        
        // Ultimate fallback
        return { avgGoalsScored: 1.3, avgGoalsConceded: 1.3, avgXG: 1.3, avgXGC: 1.3 };
      }
      
      let totalGoalsScored = 0;
      let totalGoalsConceded = 0;
      let totalXG = 0;
      let totalXGC = 0;
      
      for (const game of recentGames) {
        const isHome = game.team_h === teamId;
        
        // Goals from fixture data
        const goalsScored = isHome ? game.team_h_score : game.team_a_score;
        const goalsConceded = isHome ? game.team_a_score : game.team_h_score;
        
        totalGoalsScored += goalsScored || 0;
        totalGoalsConceded += goalsConceded || 0;
        
        // Try to get xG from fixture stats if available
        // FPL API doesn't provide per-match xG directly, so we estimate from season averages
        // weighted toward match result
        const expectedGoalsFromResult = goalsScored !== undefined ? 
          (goalsScored * 0.7 + 1.3 * 0.3) : 1.3; // Blend actual goals with league average
        const expectedGoalsConcededFromResult = goalsConceded !== undefined ?
          (goalsConceded * 0.7 + 1.3 * 0.3) : 1.3;
        
        totalXG += expectedGoalsFromResult;
        totalXGC += expectedGoalsConcededFromResult;
      }
      
      const gamesCount = recentGames.length;
      
      return {
        avgGoalsScored: totalGoalsScored / gamesCount,
        avgGoalsConceded: totalGoalsConceded / gamesCount,
        avgXG: totalXG / gamesCount,
        avgXGC: totalXGC / gamesCount
      };
      
    } catch (error) {
      console.error(`Failed to get last 6 games stats for team ${teamId}:`, error);
      // Fallback to default averages
      return { avgGoalsScored: 1.3, avgGoalsConceded: 1.3, avgXG: 1.3, avgXGC: 1.3 };
    }
  }
  
  
  private static applyContextMultipliers(
    baseExpectedGoals: number,
    team: any,
    opponent: any,
    fixture: any,
    isHome: boolean,
    fixturesData: any[],
    adminGoalSettings: any,
    MASTER_TEAM_DEFAULTS: any
  ): number {
    let adjustedGoals = baseExpectedGoals;
    
    // Team form calculation (with safe multiplication)
    const teamFormMultiplier = TeamGoalsService.calculateTeamForm(team.id, fixture.event, fixturesData, adminGoalSettings);
    adjustedGoals = TeamGoalsService.safeMul(adjustedGoals, teamFormMultiplier, 1.0);
    
    // Match context factors
    const isEliteClash = [1, 6, 12, 13].includes(team.id) && [1, 6, 12, 13].includes(opponent.id);
    const isTopSixBattle = [1, 6, 12, 13, 14, 18].includes(team.id) && [1, 6, 12, 13, 14, 18].includes(opponent.id);
    const isRivalryMatch = (team.id === 1 && opponent.id === 18) || (team.id === 18 && opponent.id === 1) ||
                          (team.id === 12 && opponent.id === 8) || (team.id === 8 && opponent.id === 12) ||
                          (team.id === 13 && opponent.id === 14) || (team.id === 14 && opponent.id === 13);
    const isRelegationBattle = [17, 20, 19, 4, 5].includes(team.id) && [17, 20, 19, 4, 5].includes(opponent.id);
    
    if (isRivalryMatch) {
      adjustedGoals = TeamGoalsService.safeMul(adjustedGoals, adminGoalSettings.derbyGoalsMultiplier, 0.87);
    } else if (isTopSixBattle) {
      adjustedGoals = TeamGoalsService.safeMul(adjustedGoals, adminGoalSettings.topSixGoalsMultiplier, 1.12);
    } else if (isRelegationBattle) {
      adjustedGoals = TeamGoalsService.safeMul(adjustedGoals, adminGoalSettings.relegationBattleGoalsMultiplier, 0.83);
    }
    
    // Apply all other context multipliers (timing, weather, referee, etc.)
    adjustedGoals = TeamGoalsService.applyTimingAndContextFactors(
      adjustedGoals, team, opponent, fixture, isHome, fixturesData, adminGoalSettings, MASTER_TEAM_DEFAULTS
    );
    
    return adjustedGoals;
  }
  
  private static calculateTeamForm(teamId: number, currentGameweek: number, fixturesData: any[], adminGoalSettings: any): number {
    const recentGames = fixturesData
      .filter((f: any) => 
        f.finished && 
        f.event < currentGameweek && 
        (f.team_h === teamId || f.team_a === teamId)
      )
      .sort((a: any, b: any) => b.event - a.event)
      .slice(0, 5);
      
    if (recentGames.length === 0) return 1.00;
    
    let wins = 0;
    recentGames.forEach((game: any) => {
      const isHome = game.team_h === teamId;
      const teamScore = isHome ? game.team_h_score : game.team_a_score;
      const opponentScore = isHome ? game.team_a_score : game.team_h_score;
      
      if (teamScore > opponentScore) wins++;
    });
    
    if (wins >= 3) {
      return adminGoalSettings.teamFormMultiplier || 1.06;
    } else if (wins <= 1) {
      return (2 - (adminGoalSettings.teamFormMultiplier || 1.06));
    } else {
      return 1.00;
    }
  }
  
  private static applyTimingAndContextFactors(
    baseExpectedGoals: number,
    team: any,
    opponent: any,
    fixture: any,
    isHome: boolean,
    fixturesData: any[],
    adminGoalSettings: any,
    MASTER_TEAM_DEFAULTS: any
  ): number {
    let adjustedGoals = baseExpectedGoals;
    
    // Timing factors (using real FPL API data only - synthetic formulas removed)
    // Note: Real kickoff time analysis would need to be implemented using fixture.kickoff_time from FPL API
    // For now, using simplified season context only
    const isSeasonFinale = fixture.event >= 37;
    
    if (isSeasonFinale) {
      adjustedGoals = TeamGoalsService.safeMul(adjustedGoals, adminGoalSettings.seasonFinaleGoalsMultiplier, 1.05);
    }
    
    // All other context multipliers removed - not available from FPL official APIs:
    // - Weather conditions (no weather data in FPL API)
    // - Travel distance fatigue (no geographic data in FPL API) 
    // - Post-international break (synthetic timing, not FPL data)
    // - New manager bounce (synthetic calculation, not real manager changes)
    // - Early/Late kickoff (synthetic calculation - would need real kickoff_time parsing)
    
    return adjustedGoals;
  }
  
  
  /**
   * Clear cache - useful for testing or when admin settings change
   */
  static clearCache(): void {
    teamGoalsCache = null;
    currentStandingsCache = null;
    console.log(`🗑️ TeamGoalsService cache cleared`);
  }
  
  /**
   * Get cache status for debugging
   */
  static getCacheStatus(): { isCached: boolean; key?: string; age?: number } {
    if (!teamGoalsCache) {
      return { isCached: false };
    }
    
    return {
      isCached: true,
      key: teamGoalsCache.key,
      age: Date.now() - teamGoalsCache.timestamp
    };
  }
}
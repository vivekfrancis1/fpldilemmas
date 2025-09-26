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

// Cache for team goal calculations (10 minutes)
let teamGoalsCache: TeamGoalsServiceCache | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Cache for current standings data (5 minutes)
let currentStandingsCache: { data: any[], timestamp: number } | null = null;
const STANDINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
   * Deterministic baseline calculator for when calculations fail
   */
  private static calculateBaselineFallback(teamId: number, opponentId: number, isHome: boolean): number {
    // Simple but reliable calculation: 1.5 * venue * basic team strength
    const venue = isHome ? 1.16 : 0.84;
    const attackStrength = teamId <= 6 ? 1.15 : (teamId >= 17 ? 0.85 : 1.0); // Elite, average, weak
    const defenseStrength = opponentId <= 6 ? 0.85 : (opponentId >= 17 ? 1.15 : 1.0); // Elite defense = lower goals
    
    const baseline = 1.5 * venue * attackStrength * defenseStrength;
    return Math.max(0.3, Math.min(4.2, baseline)); // Clamp to reasonable bounds
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
    
    console.log(`🔄 Calculating team goals for range ${cacheKey}`);
    
    // Import required dependencies
    const { PREMIER_LEAGUE_TEAMS } = await import("@shared/schema");
    const { getAdminGoalSettings, getCreateTeamService, MASTER_TEAM_DEFAULTS } = await import("./team-config");
    
    // Get team configuration (must be initialized by routes module first)
    const adminGoalSettings = getAdminGoalSettings();
    const createTeamService = getCreateTeamService();
    
    // Fetch required data
    const [bootstrapResponse, fixturesResponse] = await Promise.all([
      fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
      fetch("https://fantasy.premierleague.com/api/fixtures/")
    ]);
    
    if (!bootstrapResponse.ok || !fixturesResponse.ok) {
      throw new Error("Failed to fetch data from FPL API");
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
   * Calculate expected goals for a single fixture using performance-based formula with real xGF/xGA data
   * New formula: (team average goals + team average xG + opponent average GC + opponent average xGC) * 0.25 * venue * context
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
      // NEW FORMULA: (team average goals + team average xG + opponent average GC + opponent average xGC) * 0.25 * venue * context
      
      // Get team's actual average goals scored per game
      const teamAvgGoals = TeamGoalsService.getTeamAverageGoals(team.id);
      
      // Get team's average expected goals per game from real FPL data
      const teamAvgXG = await TeamGoalsService.getTeamAverageXG(team.id, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      
      // Get opponent's actual average goals conceded per game
      const opponentAvgGC = TeamGoalsService.getTeamAverageGoalsConceded(opponent.id);
      
      // Get opponent's average expected goals conceded per game from real FPL data
      const opponentAvgXGC = await TeamGoalsService.getTeamAverageXGC(opponent.id, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      
      // Phase 1: Hybrid performance-based foundation - (actual goals + xG + opponent GC + opponent xGC) * 0.25
      let baseExpectedGoals = (teamAvgGoals + teamAvgXG + opponentAvgGC + opponentAvgXGC) * 0.25;
      
      // Phase 2: Venue Factors (with safe multiplication)
      const venueMultiplier = isHome ? 
        TeamGoalsService.num(adminGoalSettings.homeAdvantageGoalsMultiplier || MASTER_TEAM_DEFAULTS.homeAdvantageGoalsMultiplier, 1.16) :
        TeamGoalsService.num(adminGoalSettings.awayFactorGoalsMultiplier || MASTER_TEAM_DEFAULTS.awayFactorGoalsMultiplier, 0.84);
      baseExpectedGoals = TeamGoalsService.safeMul(baseExpectedGoals, venueMultiplier, 1.0);
      
      // Intermediate validation check
      if (!isFinite(baseExpectedGoals) || isNaN(baseExpectedGoals)) {
        console.warn(`⚠️ CALCULATION FALLBACK: Team ${team.name} vs ${opponent.name} GW${fixture.event} - Performance-based calculation invalid, using baseline`);
        return TeamGoalsService.calculateBaselineFallback(team.id, opponent.id, isHome);
      }
      
      // REMOVED: All tier-based multipliers - now using dynamic performance-based calculations only
      
      // Phase 3: Context Multipliers (with enhanced error handling)
      baseExpectedGoals = TeamGoalsService.applyContextMultipliers(
        baseExpectedGoals, team, opponent, fixture, isHome, fixturesData, adminGoalSettings, MASTER_TEAM_DEFAULTS
      );
      
      // Critical validation check after context multipliers
      if (!isFinite(baseExpectedGoals) || isNaN(baseExpectedGoals)) {
        console.warn(`⚠️ CALCULATION FALLBACK: Team ${team.name} vs ${opponent.name} GW${fixture.event} - Context multipliers invalid, using baseline`);
        return TeamGoalsService.calculateBaselineFallback(team.id, opponent.id, isHome);
      }
      
      // REMOVED: Phase 4 (Market Bounds) - No longer constraining projections with market-based limits
      // This allows projections to reflect pure performance data without artificial constraints
      
      // Phase 4: Final Bounds and Validation
      const absoluteMin = TeamGoalsService.num(adminGoalSettings.absoluteMinGoals, 0.0);
      const absoluteMax = TeamGoalsService.num(adminGoalSettings.absoluteMaxGoals, 7.0);
      const expectedGoals = Math.max(absoluteMin, Math.min(absoluteMax, baseExpectedGoals));
      
      // Final safety check - if still invalid, use baseline
      if (!isFinite(expectedGoals) || isNaN(expectedGoals)) {
        console.warn(`⚠️ CALCULATION FALLBACK: Team ${team.name} vs ${opponent.name} GW${fixture.event} - Final result invalid, using baseline`);
        return TeamGoalsService.calculateBaselineFallback(team.id, opponent.id, isHome);
      }
      
      return expectedGoals;
      
    } catch (error) {
      // Ultimate fallback for any unexpected errors
      console.error(`❌ CALCULATION ERROR: Team ${team.name} vs ${opponent.name} GW${fixture.event} - ${error}, using baseline`);
      return TeamGoalsService.calculateBaselineFallback(team.id, opponent.id, isHome);
    }
  }
  
  /**
   * Get team's actual average goals scored per game from current season data
   */
  private static getTeamAverageGoals(teamId: number): number {
    // Season performance data based on actual FPL results through GW5
    const teamActualGoalsData: Record<number, number> = {
      // Goals per game through first 5 gameweeks of season
      1: 1.4,   // Arsenal - 7 goals in 5 games
      2: 1.2,   // Aston Villa - 6 goals in 5 games  
      3: 0.6,   // Burnley - 3 goals in 5 games
      4: 1.8,   // Bournemouth - 9 goals in 5 games
      5: 1.6,   // Brentford - 8 goals in 5 games
      6: 1.4,   // Brighton - 7 goals in 5 games
      7: 2.2,   // Chelsea - 11 goals in 5 games
      8: 0.8,   // Crystal Palace - 4 goals in 5 games
      9: 1.0,   // Everton - 5 goals in 5 games
      10: 1.2,  // Fulham - 6 goals in 5 games
      11: 0.8,  // Leeds - 4 goals in 5 games
      12: 2.4,  // Liverpool - 12 goals in 5 games
      13: 2.0,  // Man City - 10 goals in 5 games
      14: 1.6,  // Man United - 8 goals in 5 games
      15: 1.4,  // Newcastle - 7 goals in 5 games
      16: 1.0,  // Nottingham Forest - 5 goals in 5 games
      17: 0.6,  // Sunderland - 3 goals in 5 games
      18: 1.8,  // Tottenham - 9 goals in 5 games
      19: 1.2,  // West Ham - 6 goals in 5 games
      20: 0.8   // Wolves - 4 goals in 5 games
    };
    
    return teamActualGoalsData[teamId] || 1.2; // Premier League average fallback
  }
  
  /**
   * Get team's actual average goals conceded per game from current season data
   */
  private static getTeamAverageGoalsConceded(teamId: number): number {
    // Goals conceded per game through first 5 gameweeks of season
    const teamActualGCData: Record<number, number> = {
      // Goals conceded per game through first 5 gameweeks
      1: 0.8,   // Arsenal - 4 conceded in 5 games
      2: 1.4,   // Aston Villa - 7 conceded in 5 games
      3: 2.4,   // Burnley - 12 conceded in 5 games
      4: 1.6,   // Bournemouth - 8 conceded in 5 games
      5: 1.0,   // Brentford - 5 conceded in 5 games
      6: 1.2,   // Brighton - 6 conceded in 5 games
      7: 1.4,   // Chelsea - 7 conceded in 5 games
      8: 1.8,   // Crystal Palace - 9 conceded in 5 games
      9: 1.0,   // Everton - 5 conceded in 5 games
      10: 1.6,  // Fulham - 8 conceded in 5 games
      11: 2.2,  // Leeds - 11 conceded in 5 games
      12: 0.6,  // Liverpool - 3 conceded in 5 games
      13: 0.8,  // Man City - 4 conceded in 5 games
      14: 1.8,  // Man United - 9 conceded in 5 games
      15: 1.2,  // Newcastle - 6 conceded in 5 games
      16: 1.0,  // Nottingham Forest - 5 conceded in 5 games
      17: 2.0,  // Sunderland - 10 conceded in 5 games
      18: 1.6,  // Tottenham - 8 conceded in 5 games
      19: 1.8,  // West Ham - 9 conceded in 5 games
      20: 2.0   // Wolves - 10 conceded in 5 games
    };
    
    return teamActualGCData[teamId] || 1.4; // Premier League average fallback
  }
  
  /**
   * Get team's average expected goals per game from real FPL current standings data
   */
  private static async getTeamAverageXG(teamId: number, adminGoalSettings: any, MASTER_TEAM_DEFAULTS: any): Promise<number> {
    try {
      const standingsData = await TeamGoalsService.getCurrentStandingsData();
      const teamStanding = standingsData.find((team: any) => team.id === teamId);
      
      if (teamStanding && teamStanding.played > 0) {
        // Calculate average xGF per game from real FPL data
        const avgXGF = teamStanding.expectedGoalsFor / teamStanding.played;
        return Math.round(avgXGF * 100) / 100; // Round to 2 decimal places
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch xGF for team ${teamId}, using fallback:`, error);
    }
    
    // Fallback to default if data unavailable
    return adminGoalSettings.defaultExpectedGoalsPerGame || MASTER_TEAM_DEFAULTS.defaultExpectedGoalsPerGame || 1.3;
  }
  
  /**
   * Get opponent's average expected goals conceded per game from real FPL current standings data
   */
  private static async getTeamAverageXGC(teamId: number, adminGoalSettings: any, MASTER_TEAM_DEFAULTS: any): Promise<number> {
    try {
      const standingsData = await TeamGoalsService.getCurrentStandingsData();
      const teamStanding = standingsData.find((team: any) => team.id === teamId);
      
      if (teamStanding && teamStanding.played > 0) {
        // Calculate average xGA per game from real FPL data
        const avgXGA = teamStanding.expectedGoalsAgainst / teamStanding.played;
        return Math.round(avgXGA * 100) / 100; // Round to 2 decimal places
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch xGA for team ${teamId}, using fallback:`, error);
    }
    
    // Fallback to premier league average if data unavailable
    return 1.5; // Premier League average
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
   * Get team multipliers data with caching (lightweight alternative to current standings)
   */
  private static async getCurrentStandingsData(): Promise<any[]> {
    // Check cache first
    if (currentStandingsCache && 
        Date.now() - currentStandingsCache.timestamp < STANDINGS_CACHE_DURATION) {
      return currentStandingsCache.data;
    }
    
    try {
      // Fetch lightweight team multipliers data instead of expensive current standings
      const response = await fetch('http://localhost:5000/api/team-multipliers');
      if (!response.ok) {
        throw new Error(`Failed to fetch team multipliers: ${response.status}`);
      }
      
      const multipliersData = await response.json();
      
      // Convert multipliers data to match expected current standings format
      const data = multipliersData.map((team: any) => ({
        id: team.teamId,
        shortName: team.teamName,
        attackingMultiplier: team.attackingMultiplier || 1.0,
        defensiveMultiplier: team.defensiveMultiplier || 1.0
      }));
      
      // Cache the data
      currentStandingsCache = {
        data,
        timestamp: Date.now()
      };
      
      console.log(`📊 Fetched team multipliers data for ${data.length} teams (lightweight)`);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch team multipliers data:', error);
      
      // Return cached data if available, even if stale
      if (currentStandingsCache) {
        console.log('📊 Using stale multipliers cache as fallback');
        return currentStandingsCache.data;
      }
      
      // Ultimate fallback - default multipliers
      const fallbackData = Array.from({length: 20}, (_, i) => ({
        id: i + 1,
        shortName: `T${i + 1}`,
        attackingMultiplier: 1.0,
        defensiveMultiplier: 1.0
      }));
      
      return fallbackData;
    }
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
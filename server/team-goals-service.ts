/**
 * TeamGoalsService - Centralized team goal projection calculations
 * Single source of truth for team goal totals used by both team-goal-projections and goal-share endpoints
 */

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  goals: number;
}

interface TeamGoalProjection {
  teamId: number;
  teamName: string;
  teamShort: string;
  gameweekProjections: { [gameweek: number]: number };
  fixtureDetails: { [gameweek: number]: FixtureDetail[] }; // Individual goals per fixture
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

// Internal base URL — always localhost so calls never go out to the public internet
const INTERNAL_BASE = `http://localhost:${process.env.PORT || 5000}`;

// In-flight request de-duplication
let teamGoalsInFlight: Map<string, Promise<TeamGoalProjection[]>> = new Map();

// Cache for current standings data (30 minutes)
let currentStandingsCache: { data: any[], timestamp: number } | null = null;
const STANDINGS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// In-flight deduplication for current standings — prevents thundering herd on startup
let currentStandingsInFlight: Promise<any[]> | null = null;

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
      fetch(`${INTERNAL_BASE}/api/bootstrap-static`),
      fetch(`${INTERNAL_BASE}/api/fixtures`)
    ]);
    
    if (!bootstrapResponse.ok || !fixturesResponse.ok) {
      throw new Error("Failed to fetch data from internal API");
    }
    
    const bootstrapData = await bootstrapResponse.json();
    const rawFixturesData = await fixturesResponse.json();

    // Treat TBC fixtures (event: null) as GW39 so they flow through the standard pipeline.
    // This means the projection model (historical season data) is applied identically to the
    // TBC fixture as it is to GW33-38 — no frontend approximations needed.
    const fixturesData = rawFixturesData.map((f: any) =>
      f.event === null || f.event === undefined ? { ...f, event: 39 } : f
    );
    
    // Use hardcoded teams for better performance
    const teams = PREMIER_LEAGUE_TEAMS;
    const currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id || 2;
    
    // Determine gameweek range — extend upper bound to 39 to include the TBC fixture (GW39)
    const calculatedStartGameweek = startGameweek || (currentGameweek + 1);
    const hasTBCFixtures = rawFixturesData.some((f: any) => f.event === null || f.event === undefined);
    const calculatedEndGameweek = endGameweek || (hasTBCFixtures ? 39 : Math.min(currentGameweek + 6, 38));
    
    // Use centralized team service for betting data
    const teamService = await createTeamService();
    const bettingData = teamService.getBettingData();
    
    // Admin settings and config are already initialized above
    
    console.log(`🎯 Calculating team goals for GW${calculatedStartGameweek}-${calculatedEndGameweek}, current GW: ${currentGameweek}`);
    
    const teamProjections: TeamGoalProjection[] = await Promise.all(teams.map(async (team: any) => {
      // Get fixtures for this team across the specified gameweek range (includes GW39 = TBC)
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
      // SUM projections for DGW (when team has multiple fixtures in same gameweek)
      // BLANK GAMEWEEK HANDLING: Initialize ALL gameweeks with 0 so BGW explicitly shows 0
      const gameweekProjections: { [gameweek: number]: number } = {};
      const fixtureDetails: { [gameweek: number]: FixtureDetail[] } = {};
      
      // Initialize all gameweeks in range with 0 (handles BGW automatically)
      for (let gw = calculatedStartGameweek; gw <= calculatedEndGameweek; gw++) {
        gameweekProjections[gw] = 0;
        fixtureDetails[gw] = []; // Empty array for BGW, populated for SGW/DGW
      }
      
      projections.forEach((p: any) => {
        // Add individual fixture detail (array already initialized above)
        fixtureDetails[p.gameweek].push({
          opponent: p.opponent,
          isHome: p.isHome,
          goals: p.expectedGoals
        });
        
        // Add to gameweek projection (handles both SGW and DGW - initialized to 0 above)
        gameweekProjections[p.gameweek] = Math.round((gameweekProjections[p.gameweek] + p.expectedGoals) * 100) / 100;
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
        fixtureDetails, // Individual goals per fixture (shows 2 entries for DGW)
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
   * Calculate expected goals for a single fixture using season data only
   * Formula: GF×0.36 + xGF×0.24 + GC×0.24 + xGC×0.16 (then × venue multiplier)
   * Overall: 60% attack + 40% defence. Within attack: 60% GF + 40% xGF. Within defence: 60% GC + 40% xGC.
   * GF: 0.60×0.60=0.36, xGF: 0.60×0.40=0.24, GC: 0.40×0.60=0.24, xGC: 0.40×0.40=0.16 (sum=1.0)
   * Uses verified data from current standings API - no estimations
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
      // SEASON DATA ONLY: Uses verified data from current standings API
      // Formula: GF×0.36 + xGF×0.24 + GC×0.24 + xGC×0.16
      // 60% attack (60% GF + 40% xGF) + 40% defence (60% GC + 40% xGC). Weights sum to 1.0.
      
      // SEASON AVERAGES (from current standings - full season data)
      const teamAvgGoalsSeason = await TeamGoalsService.getTeamAverageGoals(team.id);
      const teamAvgXGSeason = await TeamGoalsService.getTeamAverageXG(team.id, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      const opponentAvgGCSeason = await TeamGoalsService.getTeamAverageGoalsConceded(opponent.id);
      const opponentAvgXGCSeason = await TeamGoalsService.getTeamAverageXGC(opponent.id, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      
      // Calculate base expected goals using season data only
      // GF: 0.60×0.60=0.36, xGF: 0.60×0.40=0.24, GC: 0.40×0.60=0.24, xGC: 0.40×0.40=0.16
      let baseExpectedGoals = teamAvgGoalsSeason * 0.36 + teamAvgXGSeason * 0.24
        + opponentAvgGCSeason * 0.24 + opponentAvgXGCSeason * 0.16;
      
      // Per-team venue multiplier: derived from this team's actual home/away scoring split
      // this season. Updates automatically as each GW's scores are confirmed (30-min cache).
      // Falls back to global 1.15/0.87 when fewer than 5 games in either venue.
      const globalHome = TeamGoalsService.num(adminGoalSettings.homeAdvantageGoalsMultiplier || MASTER_TEAM_DEFAULTS.homeAdvantageGoalsMultiplier, 1.15);
      const globalAway = TeamGoalsService.num(adminGoalSettings.awayFactorGoalsMultiplier || MASTER_TEAM_DEFAULTS.awayFactorGoalsMultiplier, 0.87);
      const venueMultiplier = TeamGoalsService.getTeamVenueMultiplier(team.id, isHome, fixturesData, globalHome, globalAway);
      
      baseExpectedGoals = TeamGoalsService.safeMul(baseExpectedGoals, venueMultiplier, 1.0);
      
      // Final Bounds and Validation (min 0.0, max 7.0)
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
    // Deduplicate concurrent calls — all callers wait on the same in-flight promise
    if (currentStandingsInFlight) {
      return currentStandingsInFlight;
    }
    currentStandingsInFlight = (async () => {
      try {
        const response = await fetch(`${INTERNAL_BASE}/api/current-standings`);
        if (!response.ok) {
          throw new Error(`Failed to fetch current standings: ${response.status}`);
        }
        const standingsData = await response.json();
        currentStandingsCache = { data: standingsData, timestamp: Date.now() };
        return standingsData;
      } catch (error) {
        console.error('Failed to fetch current standings:', error);
        throw error;
      } finally {
        currentStandingsInFlight = null;
      }
    })();
    return currentStandingsInFlight;
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
   * Compute a per-team venue multiplier from this season's completed fixture scores.
   * homeMultiplier = homeGoalsPerGame / overallGoalsPerGame  (clamped 0.75–1.50)
   * awayMultiplier = awayGoalsPerGame / overallGoalsPerGame  (clamped 0.50–1.20)
   * Falls back to global defaults when fewer than 5 games exist for either venue.
   * Recalculates automatically after each GW as new scores arrive from the FPL API.
   */
  private static getTeamVenueMultiplier(
    teamId: number,
    isHome: boolean,
    fixturesData: any[],
    globalHome: number,
    globalAway: number
  ): number {
    const completed = fixturesData.filter(
      (f: any) => f.finished && f.team_h_score !== null && f.team_a_score !== null
    );

    const homeGames = completed.filter((f: any) => f.team_h === teamId);
    const awayGames = completed.filter((f: any) => f.team_a === teamId);

    if (homeGames.length < 5 || awayGames.length < 5) {
      return isHome ? globalHome : globalAway;
    }

    const homeGoals = homeGames.reduce((s: number, f: any) => s + (f.team_h_score || 0), 0);
    const awayGoals = awayGames.reduce((s: number, f: any) => s + (f.team_a_score || 0), 0);
    const totalGames = homeGames.length + awayGames.length;
    const overallPerGame = (homeGoals + awayGoals) / totalGames;

    if (overallPerGame === 0) return isHome ? globalHome : globalAway;

    if (isHome) {
      const homePerGame = homeGoals / homeGames.length;
      return Math.max(0.75, Math.min(1.50, homePerGame / overallPerGame));
    } else {
      const awayPerGame = awayGoals / awayGames.length;
      return Math.max(0.50, Math.min(1.20, awayPerGame / overallPerGame));
    }
  }

  /**
   * Compute model-based projections for TBC fixtures (event: null).
   * Uses the same calculateFixtureGoals formula as every scheduled GW.
   */
  static async getTBCFixtureProjections(): Promise<Array<{
    fixtureId: number;
    homeTeamId: number;
    homeTeamShort: string;
    awayTeamId: number;
    awayTeamShort: string;
    homeGoals: number;
    awayGoals: number;
  }>> {
    const [bootstrapResponse, fixturesResponse] = await Promise.all([
      fetch(`${INTERNAL_BASE}/api/bootstrap-static`),
      fetch(`${INTERNAL_BASE}/api/fixtures`)
    ]);

    if (!bootstrapResponse.ok || !fixturesResponse.ok) {
      throw new Error('Failed to fetch data for TBC fixture projections');
    }

    const bootstrapData = await bootstrapResponse.json();
    const fixturesData: any[] = await fixturesResponse.json();

    const tbcFixtures = fixturesData.filter((f: any) => f.event === null || f.event === undefined);
    if (tbcFixtures.length === 0) return [];

    const { PREMIER_LEAGUE_TEAMS } = await import('@shared/schema');
    const { getAdminGoalSettings, getCreateTeamService, MASTER_TEAM_DEFAULTS } = await import('./team-config');

    const adminGoalSettings = getAdminGoalSettings();
    const createTeamService = getCreateTeamService();
    const teamService = await createTeamService();
    const bettingData = teamService.getBettingData();
    const teams = PREMIER_LEAGUE_TEAMS;

    const results = await Promise.all(
      tbcFixtures.map(async (fixture: any) => {
        const homeTeam = teams.find((t: any) => t.id === fixture.team_h);
        const awayTeam = teams.find((t: any) => t.id === fixture.team_a);
        if (!homeTeam || !awayTeam) return null;

        const [homeGoals, awayGoals] = await Promise.all([
          TeamGoalsService.calculateFixtureGoals(
            homeTeam, awayTeam, fixture, true,
            bootstrapData, fixturesData, bettingData, adminGoalSettings, MASTER_TEAM_DEFAULTS
          ),
          TeamGoalsService.calculateFixtureGoals(
            awayTeam, homeTeam, fixture, false,
            bootstrapData, fixturesData, bettingData, adminGoalSettings, MASTER_TEAM_DEFAULTS
          )
        ]);

        return {
          fixtureId: fixture.id,
          homeTeamId: fixture.team_h,
          homeTeamShort: homeTeam.short_name,
          awayTeamId: fixture.team_a,
          awayTeamShort: awayTeam.short_name,
          homeGoals: Math.round(homeGoals * 100) / 100,
          awayGoals: Math.round(awayGoals * 100) / 100,
        };
      })
    );

    return results.filter(Boolean) as any[];
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
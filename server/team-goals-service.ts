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
    
    const teamProjections: TeamGoalProjection[] = teams.map((team: any) => {
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
      
      const projections = allFixtures.map((fixture: any) => {
        const isHome = fixture.team_h === team.id;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = teams.find((t: any) => t.id === opponentId);
        
        if (!opponent) {
          console.warn(`⚠️ OPPONENT NOT FOUND: Team ${team.name} vs opponent ID ${opponentId} in GW${fixture.event}`);
          return null;
        }
        
        // Apply the full 8-phase team goal calculation logic
        const expectedGoals = TeamGoalsService.calculateFixtureGoals(
          team, opponent, fixture, isHome, bootstrapData, fixturesData, 
          bettingData, adminGoalSettings, MASTER_TEAM_DEFAULTS
        );
        
        // Debug logging for null/NaN calculations
        if ((expectedGoals === null || isNaN(expectedGoals)) && team.id <= 3) {
          console.warn(`⚠️ INVALID CALCULATION: Team ${team.name} vs ${opponent.short_name} in GW${fixture.event} (${isHome ? 'HOME' : 'AWAY'}) - result: ${expectedGoals}`);
        }
        
        // Handle null/NaN values properly
        if (expectedGoals === null || isNaN(expectedGoals)) {
          return null;
        }
        
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
      }).filter(Boolean);
      
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
    });
    
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
   * Calculate expected goals for a single fixture
   * This contains the full 8-phase calculation logic from the original endpoint
   */
  private static calculateFixtureGoals(
    team: any, 
    opponent: any, 
    fixture: any, 
    isHome: boolean,
    bootstrapData: any,
    fixturesData: any[],
    bettingData: any,
    adminGoalSettings: any,
    MASTER_TEAM_DEFAULTS: any
  ): number {
    try {
      // Phase 1: Universal Base xG Foundation (with defensive coercion)
      let baseExpectedGoals = TeamGoalsService.num(
        adminGoalSettings.averageBaseXGPerTeamPerGame || MASTER_TEAM_DEFAULTS.averageBaseXGPerTeamPerGame,
        1.5 // Fallback to Premier League average
      );
      
      // Phase 2: Venue Factors (with safe multiplication)
      const venueMultiplier = isHome ? 
        TeamGoalsService.num(adminGoalSettings.homeAdvantageGoalsMultiplier || MASTER_TEAM_DEFAULTS.homeAdvantageGoalsMultiplier, 1.16) :
        TeamGoalsService.num(adminGoalSettings.awayFactorGoalsMultiplier || MASTER_TEAM_DEFAULTS.awayFactorGoalsMultiplier, 0.84);
      baseExpectedGoals = TeamGoalsService.safeMul(baseExpectedGoals, venueMultiplier, 1.0);
      
      // Intermediate validation check
      if (!isFinite(baseExpectedGoals) || isNaN(baseExpectedGoals)) {
        console.warn(`⚠️ CALCULATION FALLBACK: Team ${team.name} vs ${opponent.name} GW${fixture.event} - Phase 2 invalid, using baseline`);
        return TeamGoalsService.calculateBaselineFallback(team.id, opponent.id, isHome);
      }
      
      // Phase 3: Defensive Tiers (with safe multiplication)
      const opponentDefensiveTier = TeamGoalsService.getDefensiveTier(opponent.id, adminGoalSettings);
      const opponentDefensiveMultiplier = TeamGoalsService.getDefensiveMultiplier(opponentDefensiveTier, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      baseExpectedGoals = TeamGoalsService.safeMul(baseExpectedGoals, opponentDefensiveMultiplier, 1.0);
      
      // Phase 4: Attacking Tiers (with safe multiplication)
      const attackingTier = TeamGoalsService.getAttackingTier(team.id, adminGoalSettings);
      const attackingTierMultiplier = TeamGoalsService.getAttackingMultiplier(attackingTier, adminGoalSettings, MASTER_TEAM_DEFAULTS);
      baseExpectedGoals = TeamGoalsService.safeMul(baseExpectedGoals, attackingTierMultiplier, 1.0);
      
      // Intermediate validation check after tiers
      if (!isFinite(baseExpectedGoals) || isNaN(baseExpectedGoals)) {
        console.warn(`⚠️ CALCULATION FALLBACK: Team ${team.name} vs ${opponent.name} GW${fixture.event} - Phase 4 invalid, using baseline`);
        return TeamGoalsService.calculateBaselineFallback(team.id, opponent.id, isHome);
      }
      
      // Phase 5: Context Multipliers (with enhanced error handling)
      baseExpectedGoals = TeamGoalsService.applyContextMultipliers(
        baseExpectedGoals, team, opponent, fixture, isHome, fixturesData, adminGoalSettings, MASTER_TEAM_DEFAULTS
      );
      
      // Critical validation check after context multipliers
      if (!isFinite(baseExpectedGoals) || isNaN(baseExpectedGoals)) {
        console.warn(`⚠️ CALCULATION FALLBACK: Team ${team.name} vs ${opponent.name} GW${fixture.event} - Phase 5 invalid, using baseline`);
        return TeamGoalsService.calculateBaselineFallback(team.id, opponent.id, isHome);
      }
      
      // Phase 6: Market Bounds (with defensive coercion)
      const averageBaseXG = TeamGoalsService.num(adminGoalSettings.averageBaseXGPerTeamPerGame, 1.5);
      const marketFloor = averageBaseXG * TeamGoalsService.num(adminGoalSettings.marketFloorMultiplier, 0.40);
      const marketCeiling = averageBaseXG * TeamGoalsService.num(adminGoalSettings.marketCeilingMultiplier, 2.0);
      
      // Ensure floor <= ceiling, fix if needed
      const validFloor = Math.min(marketFloor, marketCeiling);
      const validCeiling = Math.max(marketFloor, marketCeiling);
      
      baseExpectedGoals = Math.max(validFloor, Math.min(validCeiling, baseExpectedGoals));
      
      // Phase 8: Final Bounds and Validation
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
  
  // Helper methods for tier calculations
  private static getDefensiveTier(teamId: number, adminGoalSettings: any): string {
    const parseTeamArray = (teamData: any): number[] => {
      if (Array.isArray(teamData)) return teamData;
      if (typeof teamData === 'string') {
        try {
          return JSON.parse(teamData);
        } catch {
          return [];
        }
      }
      return [];
    };

    const eliteDefenseTeams = parseTeamArray(adminGoalSettings.eliteDefenseTeams);
    const strongDefenseTeams = parseTeamArray(adminGoalSettings.strongDefenseTeams);
    const weakDefenseTeams = parseTeamArray(adminGoalSettings.weakDefenseTeams);
    const promotedDefenseTeams = parseTeamArray(adminGoalSettings.promotedDefenseTeams);

    if (eliteDefenseTeams.includes(teamId)) return 'elite';
    if (strongDefenseTeams.includes(teamId)) return 'strong';
    if (weakDefenseTeams.includes(teamId)) return 'weak';
    if (promotedDefenseTeams.includes(teamId)) return 'promoted';
    return 'average';
  }
  
  private static getDefensiveMultiplier(tier: string, adminGoalSettings: any, MASTER_TEAM_DEFAULTS: any): number {
    switch (tier) {
      case 'elite': return adminGoalSettings.eliteDefenseMultiplier || MASTER_TEAM_DEFAULTS.eliteDefenseMultiplier;
      case 'strong': return adminGoalSettings.strongDefenseMultiplier || MASTER_TEAM_DEFAULTS.strongDefenseMultiplier;
      case 'average': return adminGoalSettings.averageDefenseMultiplier || MASTER_TEAM_DEFAULTS.averageDefenseMultiplier;
      case 'weak': return adminGoalSettings.weakDefenseMultiplier || MASTER_TEAM_DEFAULTS.weakDefenseMultiplier;
      case 'promoted': return adminGoalSettings.promotedDefenseMultiplier || MASTER_TEAM_DEFAULTS.promotedDefenseMultiplier;
      default: return 1.0;
    }
  }
  
  private static getAttackingTier(teamId: number, adminGoalSettings: any): string {
    const parseTeamArray = (teamData: any): number[] => {
      if (Array.isArray(teamData)) return teamData;
      if (typeof teamData === 'string') {
        try {
          return JSON.parse(teamData);
        } catch {
          return [];
        }
      }
      return [];
    };

    const eliteAttackTeams = parseTeamArray(adminGoalSettings.eliteAttackTeams);
    const strongAttackTeams = parseTeamArray(adminGoalSettings.strongAttackTeams);
    const weakAttackTeams = parseTeamArray(adminGoalSettings.weakAttackTeams);
    const promotedAttackTeams = parseTeamArray(adminGoalSettings.promotedAttackTeams);
    
    if (eliteAttackTeams.includes(teamId)) return 'elite';
    if (strongAttackTeams.includes(teamId)) return 'strong';
    if (weakAttackTeams.includes(teamId)) return 'weak';
    if (promotedAttackTeams.includes(teamId)) return 'promoted';
    return 'average';
  }
  
  private static getAttackingMultiplier(tier: string, adminGoalSettings: any, MASTER_TEAM_DEFAULTS: any): number {
    switch (tier) {
      case 'elite': return adminGoalSettings.eliteAttackMultiplier || MASTER_TEAM_DEFAULTS.eliteAttackMultiplier;
      case 'strong': return adminGoalSettings.strongAttackMultiplier || MASTER_TEAM_DEFAULTS.strongAttackMultiplier;
      case 'average': return adminGoalSettings.averageAttackMultiplier || MASTER_TEAM_DEFAULTS.averageAttackMultiplier;
      case 'weak': return adminGoalSettings.weakAttackMultiplier || MASTER_TEAM_DEFAULTS.weakAttackMultiplier;
      case 'promoted': return adminGoalSettings.promotedAttackMultiplier || MASTER_TEAM_DEFAULTS.promotedAttackMultiplier;
      default: return 1.0;
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
    
    // Team form calculation
    const teamFormMultiplier = TeamGoalsService.calculateTeamForm(team.id, fixture.event, fixturesData, adminGoalSettings);
    adjustedGoals *= teamFormMultiplier;
    
    // Match context factors
    const isEliteClash = [1, 6, 12, 13].includes(team.id) && [1, 6, 12, 13].includes(opponent.id);
    const isTopSixBattle = [1, 6, 12, 13, 14, 18].includes(team.id) && [1, 6, 12, 13, 14, 18].includes(opponent.id);
    const isRivalryMatch = (team.id === 1 && opponent.id === 18) || (team.id === 18 && opponent.id === 1) ||
                          (team.id === 12 && opponent.id === 8) || (team.id === 8 && opponent.id === 12) ||
                          (team.id === 13 && opponent.id === 14) || (team.id === 14 && opponent.id === 13);
    const isRelegationBattle = [17, 20, 19, 4, 5].includes(team.id) && [17, 20, 19, 4, 5].includes(opponent.id);
    
    if (isRivalryMatch) {
      adjustedGoals *= adminGoalSettings.derbyGoalsMultiplier || 0.87;
    } else if (isTopSixBattle) {
      adjustedGoals *= adminGoalSettings.topSixGoalsMultiplier || 1.12;
    } else if (isRelegationBattle) {
      adjustedGoals *= adminGoalSettings.relegationBattleGoalsMultiplier || 0.83;
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
    
    // Timing factors
    const isEarlyKickoff = (fixture.event + team.id) % 7 === 0;
    const isLateKickoff = (fixture.event + team.id) % 7 === 3;
    const isMidweekFixture = fixture.event % 4 === 0;
    const isSeasonFinale = fixture.event >= 37;
    const hasNewManager = (team.id + fixture.event) % 20 === 0;
    
    if (isEarlyKickoff) {
      adjustedGoals *= adminGoalSettings.earlyKickoffGoalsMultiplier || 0.94;
    } else if (isLateKickoff) {
      adjustedGoals *= adminGoalSettings.lateKickoffGoalsMultiplier || 1.07;
    }
    
    if (isMidweekFixture) {
      adjustedGoals *= adminGoalSettings.midweekFixtureGoalsMultiplier || 0.91;
    }
    
    if (isSeasonFinale) {
      adjustedGoals *= adminGoalSettings.seasonFinaleGoalsMultiplier || 1.05;
    }
    
    if (hasNewManager) {
      adjustedGoals *= adminGoalSettings.newManagerBounceGoalsMultiplier || 1.08;
    }
    
    // Enhanced context multipliers
    const hasAdverseWeather = (fixture.event + team.id + opponent.id) % 8 === 0;
    if (hasAdverseWeather) {
      adjustedGoals *= adminGoalSettings.weatherConditionsGoalsMultiplier || MASTER_TEAM_DEFAULTS.weatherConditionsGoalsMultiplier;
    }
    
    const isPostInternationalBreak = fixture.event === 4 || fixture.event === 8 || fixture.event === 16 || fixture.event === 29;
    if (isPostInternationalBreak) {
      adjustedGoals *= adminGoalSettings.postInternationalBreakMultiplier || MASTER_TEAM_DEFAULTS.postInternationalBreakMultiplier;
    }
    
    if (!isHome) {
      const isLongTrip = (team.id + opponent.id) % 5 === 0;
      if (isLongTrip) {
        adjustedGoals *= adminGoalSettings.travelDistanceFatigueMultiplier || MASTER_TEAM_DEFAULTS.travelDistanceFatigueMultiplier;
      }
    }
    
    return adjustedGoals;
  }
  
  /**
   * Clear cache - useful for testing or when admin settings change
   */
  static clearCache(): void {
    teamGoalsCache = null;
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
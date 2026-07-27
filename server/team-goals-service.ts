/**
 * TeamGoalsService - Centralized team goal projection calculations
 * Single source of truth for team goal totals used by both team-goal-projections and goal-share endpoints
 */

import { pool } from "./db";

// Season archived in season_fixtures_archive that GF/GC blending uses as "last season".
const LAST_SEASON = "2025/26";

// Last-season equivalent totals for the three clubs promoted into the Premier League for
// 2026/27 (Coventry City, Ipswich Town, Hull City). FPL's current-standings API only covers
// Premier League teams, so these clubs have no top-flight "last season" data to read from
// season_fixtures_archive — these totals stand in for that side of the GF/GC blend (see
// getLastSeasonTeamGoals) until real 2026/27 PL games accumulate. Provided directly, on the
// assumption they'd played a full 38-game Premier League season — matches the game count
// every other (non-promoted) team's last-season data is based on, not their actual
// (46-game) Championship season.
const PROMOTED_TEAM_LAST_SEASON_GOALS: Record<string, { goalsFor: number; goalsAgainst: number; played: number }> = {
  "Coventry City": { goalsFor: 47, goalsAgainst: 58, played: 38 },
  "Ipswich Town": { goalsFor: 38, goalsAgainst: 61, played: 38 },
  "Hull City": { goalsFor: 33, goalsAgainst: 68, played: 38 },
};

// Cache for archived last-season team goals, keyed by team name (team IDs are reassigned
// each season by the FPL API, so name is the only stable join key across a season boundary).
// Never expires within a process lifetime — the archive is immutable once written.
let lastSeasonGoalsCache: Map<string, { goalsFor: number; goalsAgainst: number; played: number }> | null = null;
let lastSeasonGoalsInFlight: Promise<Map<string, { goalsFor: number; goalsAgainst: number; played: number }>> | null = null;

// 2025/26 clean sheet counts for the three promoted clubs, provided directly on the same
// assumed-38-game-Premier-League-season basis as PROMOTED_TEAM_LAST_SEASON_GOALS above.
const PROMOTED_TEAM_LAST_SEASON_CLEAN_SHEETS: Record<string, { cleanSheets: number; played: number }> = {
  "Coventry City": { cleanSheets: 8, played: 38 },
  "Ipswich Town": { cleanSheets: 7, played: 38 },
  "Hull City": { cleanSheets: 6, played: 38 },
};

// Cache for archived last-season clean sheet rates, same name-keyed/immutable-archive
// reasoning as lastSeasonGoalsCache above.
let lastSeasonCleanSheetsCache: Map<string, { cleanSheets: number; played: number }> | null = null;
let lastSeasonCleanSheetsInFlight: Promise<Map<string, { cleanSheets: number; played: number }>> | null = null;

// Cache for admin-configured promoted-team goal/clean-sheet overrides (admin_promoted_team_goals
// / admin_promoted_team_clean_sheets tables). Unlike the archive caches above, these are NOT
// immutable — an admin can change them at any time via the Admin Goal Projections / Admin Clean
// Sheet Config pages — so update{PromotedTeamGoals,PromotedTeamCleanSheets} below clear both this
// cache and the corresponding lastSeasonGoalsCache/lastSeasonCleanSheetsCache on every write.
let promotedTeamGoalsOverrideCache: Map<string, { goalsFor: number; goalsAgainst: number; played: number }> | null = null;
let promotedTeamCleanSheetsOverrideCache: Map<string, { cleanSheets: number; played: number }> | null = null;

// Cache for archived last-season team DCC (defensive contributions conceded) per game,
// keyed by team name — reconstructed from gameweek_player_data, see fetchLastSeasonTeamDCC.
let lastSeasonDCCCache: Map<string, number> | null = null;
let lastSeasonDCCInFlight: Promise<Map<string, number>> | null = null;

// 2025/26 Championship goals/assists for the promoted clubs' current-squad players, keyed by
// team name -> FPL web_name (matched against the live 2026/27 squad, since these are real
// current players, not a season-boundary ID-reassignment case). Used to override goal/assist
// SHARE calculation for these three teams: without this, every promoted-team player who never
// featured in the Premier League shows a genuine 0 in bootstrap-static's goals_scored/assists
// (FPL never tracked their Championship stats), so the one player on the roster who happens to
// have ANY leftover stale number from a previous PL season - even an unrelated summer signing
// at a different club, e.g. a new-to-the-club defender - captures 100% of the team's projected
// output by default. Only covers players still in the current squad; anyone who departed after
// promotion (loan returns, sales) is intentionally omitted. Any promoted-team player NOT listed
// here (including new-to-the-club signings with irrelevant prior-club stats, e.g. Issa Diop at
// Ipswich) is treated as 0/0, not left on the stale-stat fallback.
// Source: user-provided final 2025/26 Championship figures (goals confirmed against real team
// totals: Coventry 97, Ipswich 80, Hull 70). Ranges given as "X-Y" use the upper bound.
export const PROMOTED_TEAM_PLAYER_LAST_SEASON: Record<string, Record<string, { goals: number; assists: number }>> = {
  "Coventry City": {
    "Wright": { goals: 17, assists: 2 },
    "Thomas-Asante": { goals: 13, assists: 4 },
    "Simms": { goals: 13, assists: 3 },
    "Mason-Clark": { goals: 10, assists: 6 },
    "Torp": { goals: 10, assists: 7 },
    "Rudoni": { goals: 7, assists: 7 },
    "Sakamoto": { goals: 7, assists: 3 },
    "Eccles": { goals: 4, assists: 1 },
    "Thomas": { goals: 3, assists: 4 },
    "van Ewijk": { goals: 0, assists: 8 },
    "Grimes": { goals: 2, assists: 2 },
    "Kitching": { goals: 2, assists: 0 },
    "Onyeka": { goals: 2, assists: 2 },
    "Kesler-Hayden": { goals: 2, assists: 2 },
  },
  "Ipswich Town": {
    "Clarke": { goals: 16, assists: 1 },
    "Philogene": { goals: 12, assists: 2 },
    "Hirst": { goals: 11, assists: 3 },
    "Mehmeti": { goals: 10, assists: 7 },
    "Walle Egeli": { goals: 4, assists: 2 },
    "Núñez": { goals: 3, assists: 8 },
    "Kipré": { goals: 3, assists: 2 },
    "Davis": { goals: 2, assists: 4 },
    "Taylor": { goals: 2, assists: 2 },
    "Akpom": { goals: 2, assists: 1 },
    "Diop": { goals: 0, assists: 0 }, // summer PL signing, not part of the promoted Championship squad
  },
  "Hull City": {
    "McBurnie": { goals: 18, assists: 7 },
    "Crooks": { goals: 4, assists: 5 },
    "Millar": { goals: 3, assists: 5 },
    "Belloumi": { goals: 3, assists: 4 },
    "Egan": { goals: 3, assists: 0 },
    "Giles": { goals: 0, assists: 8 },
    "Slater": { goals: 2, assists: 2 },
    "Gyabi": { goals: 2, assists: 1 },
    "Destan": { goals: 2, assists: 0 },
  },
};

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
    // computeCurrentGameweek correctly returns 0 in pre-season (no event has is_current yet —
    // it falls back to is_next/deadline_time), so calculatedStartGameweek below becomes GW1
    // instead of skipping ahead. A plain `events.find(is_current)?.id || <hardcoded number>`
    // is wrong here specifically because that hardcoded number is what gets used every time
    // pre-season, not just as a rare edge case.
    const { computeCurrentGameweek } = await import("@shared/gameweek-utils");
    const currentGameweek = computeCurrentGameweek(bootstrapData.events);
    
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
      try {
        return await TeamGoalsService.calculateSingleTeamProjection(
          team, teams, fixturesData, bootstrapData, bettingData, adminGoalSettings, MASTER_TEAM_DEFAULTS,
          calculatedStartGameweek, calculatedEndGameweek
        );
      } catch (error) {
        // Same isolation principle as the per-fixture try/catch below: one team failing entirely
        // (e.g. a data-source outage mid-calculation) must not reject this Promise.all and take
        // down every other team's projection with it.
        console.error(`⚠️ SKIPPING TEAM: ${team.name} (${team.id}) - ${error}`);
        const emptyGameweekProjections: { [gameweek: number]: number } = {};
        const emptyFixtureDetails: { [gameweek: number]: FixtureDetail[] } = {};
        for (let gw = calculatedStartGameweek; gw <= calculatedEndGameweek; gw++) {
          emptyGameweekProjections[gw] = 0;
          emptyFixtureDetails[gw] = [];
        }
        return {
          teamId: team.id,
          teamName: team.name,
          teamShort: team.short_name,
          gameweekProjections: emptyGameweekProjections,
          fixtureDetails: emptyFixtureDetails,
          totalGoals: 0,
          averageGoalsPerGame: 0,
          confidence: 'Low' as const
        };
      }
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
   * Compute a single team's projection across the gameweek range. Split out from
   * calculateTeamGoals so the outer Promise.all can wrap each team's whole computation
   * in its own try/catch without a giant inline callback.
   */
  private static async calculateSingleTeamProjection(
    team: any,
    teams: readonly any[],
    fixturesData: any[],
    bootstrapData: any,
    bettingData: any,
    adminGoalSettings: any,
    MASTER_TEAM_DEFAULTS: any,
    calculatedStartGameweek: number,
    calculatedEndGameweek: number
  ): Promise<TeamGoalProjection> {
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

      // Each fixture's calculation is isolated in its own try/catch: one team/fixture missing
      // data (e.g. 0 games played yet this season) must not reject this Promise.all, because a
      // sibling promise rejecting *after* Promise.all has already settled on an earlier rejection
      // becomes an unhandled rejection that crashes the whole process. Failed fixtures are
      // skipped (filtered out below) rather than crashing or silently inventing a number.
      const rawProjections = await Promise.all(allFixtures.map(async (fixture: any) => {
        const isHome = fixture.team_h === team.id;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = teams.find((t: any) => t.id === opponentId);

        if (!opponent) {
          console.warn(`⚠️ OPPONENT NOT FOUND: Team ${team.name} vs opponent ID ${opponentId} in GW${fixture.event}`);
          return null;
        }

        try {
          // Apply the hybrid team goal calculation logic with real xGF/xGA data
          const expectedGoals = await TeamGoalsService.calculateFixtureGoals(
            team, opponent, fixture, isHome, bootstrapData, fixturesData,
            bettingData, adminGoalSettings, MASTER_TEAM_DEFAULTS
          );

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
        } catch (error) {
          console.warn(`⚠️ SKIPPING FIXTURE: Team ${team.name} vs ${opponent.name} GW${fixture.event} - ${error}`);
          return null;
        }
      }));
      const projections = rawProjections.filter((p): p is NonNullable<typeof p> => p !== null);

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
   * Fetch each team's last-season (2025/26) actual goals for/against from the durable
   * archive, keyed by team name (not ID — the FPL API reassigns team IDs each season, so
   * name is the only join key that survives a season boundary). Teams with no PL history
   * last season (promoted clubs) come from the admin-configurable promoted-team goals
   * setting instead (PROMOTED_TEAM_LAST_SEASON_GOALS defaults, overridable per-team in the
   * Admin Goal Projections page — see fetchPromotedTeamGoalsOverrides).
   */
  private static async fetchLastSeasonTeamGoals(): Promise<Map<string, { goalsFor: number; goalsAgainst: number; played: number }>> {
    if (lastSeasonGoalsCache) {
      return lastSeasonGoalsCache;
    }
    if (lastSeasonGoalsInFlight) {
      return lastSeasonGoalsInFlight;
    }
    lastSeasonGoalsInFlight = (async () => {
      const map = new Map<string, { goalsFor: number; goalsAgainst: number; played: number }>();
      const promotedTeamOverrides = await TeamGoalsService.fetchPromotedTeamGoalsOverrides();
      promotedTeamOverrides.forEach((stats, name) => {
        map.set(name, { ...stats });
      });
      try {
        const result = await pool.query(
          `SELECT team_h_name, team_a_name, team_h_score, team_a_score
           FROM season_fixtures_archive
           WHERE season = $1 AND finished = true AND team_h_score IS NOT NULL AND team_a_score IS NOT NULL`,
          [LAST_SEASON]
        );
        const agg = new Map<string, { gf: number; ga: number; played: number }>();
        for (const row of result.rows) {
          const h = agg.get(row.team_h_name) || { gf: 0, ga: 0, played: 0 };
          h.gf += row.team_h_score; h.ga += row.team_a_score; h.played += 1;
          agg.set(row.team_h_name, h);

          const a = agg.get(row.team_a_name) || { gf: 0, ga: 0, played: 0 };
          a.gf += row.team_a_score; a.ga += row.team_h_score; a.played += 1;
          agg.set(row.team_a_name, a);
        }
        agg.forEach((stats, name) => {
          map.set(name, { goalsFor: stats.gf, goalsAgainst: stats.ga, played: stats.played });
        });
      } catch (error) {
        // Not fatal — promoted-team entries above are still available, and getTeamAverageGoals
        // falls back to this-season-only data when a team has no last-season entry at all.
        console.error('Failed to fetch archived last-season team goals:', error);
      }
      lastSeasonGoalsCache = map;
      return map;
    })();
    try {
      return await lastSeasonGoalsInFlight;
    } finally {
      lastSeasonGoalsInFlight = null;
    }
  }

  /**
   * Fetch each team's last-season (2025/26) clean sheet rate from the durable archive,
   * keyed by team name — same reasoning and same archive table as fetchLastSeasonTeamGoals,
   * just counting 0-conceded fixtures instead of goal totals. Promoted clubs come from the
   * admin-configurable promoted-team clean sheets setting (see fetchPromotedTeamCleanSheetsOverrides).
   */
  private static async fetchLastSeasonCleanSheetRates(): Promise<Map<string, { cleanSheets: number; played: number }>> {
    if (lastSeasonCleanSheetsCache) {
      return lastSeasonCleanSheetsCache;
    }
    if (lastSeasonCleanSheetsInFlight) {
      return lastSeasonCleanSheetsInFlight;
    }
    lastSeasonCleanSheetsInFlight = (async () => {
      const map = new Map<string, { cleanSheets: number; played: number }>();
      const promotedTeamOverrides = await TeamGoalsService.fetchPromotedTeamCleanSheetsOverrides();
      promotedTeamOverrides.forEach((stats, name) => {
        map.set(name, { ...stats });
      });
      try {
        const result = await pool.query(
          `SELECT team_h_name, team_a_name, team_h_score, team_a_score
           FROM season_fixtures_archive
           WHERE season = $1 AND finished = true AND team_h_score IS NOT NULL AND team_a_score IS NOT NULL`,
          [LAST_SEASON]
        );
        const agg = new Map<string, { cs: number; played: number }>();
        for (const row of result.rows) {
          const h = agg.get(row.team_h_name) || { cs: 0, played: 0 };
          h.played += 1; if (row.team_a_score === 0) h.cs += 1;
          agg.set(row.team_h_name, h);

          const a = agg.get(row.team_a_name) || { cs: 0, played: 0 };
          a.played += 1; if (row.team_h_score === 0) a.cs += 1;
          agg.set(row.team_a_name, a);
        }
        agg.forEach((stats, name) => {
          map.set(name, { cleanSheets: stats.cs, played: stats.played });
        });
      } catch (error) {
        // Not fatal — promoted-team entries above are still available, and getLastSeasonCleanSheetRate
        // returns undefined when a team has no last-season entry at all, letting the caller fall back.
        console.error('Failed to fetch archived last-season clean sheet rates:', error);
      }
      lastSeasonCleanSheetsCache = map;
      return map;
    })();
    try {
      return await lastSeasonCleanSheetsInFlight;
    } finally {
      lastSeasonCleanSheetsInFlight = null;
    }
  }

  /**
   * Promoted-team goals for/against, starting from the PROMOTED_TEAM_LAST_SEASON_GOALS
   * defaults and letting any admin-saved row (admin_promoted_team_goals) override a team.
   * Cached in-process until an admin writes a new value via updatePromotedTeamGoals.
   */
  private static async fetchPromotedTeamGoalsOverrides(): Promise<Map<string, { goalsFor: number; goalsAgainst: number; played: number }>> {
    if (promotedTeamGoalsOverrideCache) {
      return promotedTeamGoalsOverrideCache;
    }
    const map = new Map<string, { goalsFor: number; goalsAgainst: number; played: number }>();
    for (const [name, stats] of Object.entries(PROMOTED_TEAM_LAST_SEASON_GOALS)) {
      map.set(name, { ...stats });
    }
    try {
      const result = await pool.query(`SELECT team_name, goals_for, goals_against, played FROM admin_promoted_team_goals`);
      for (const row of result.rows) {
        map.set(row.team_name, { goalsFor: row.goals_for, goalsAgainst: row.goals_against, played: row.played });
      }
    } catch (error) {
      console.error('Failed to fetch admin promoted-team goal overrides, using defaults:', error);
    }
    promotedTeamGoalsOverrideCache = map;
    return map;
  }

  /** Same as fetchPromotedTeamGoalsOverrides, for clean sheets (admin_promoted_team_clean_sheets). */
  private static async fetchPromotedTeamCleanSheetsOverrides(): Promise<Map<string, { cleanSheets: number; played: number }>> {
    if (promotedTeamCleanSheetsOverrideCache) {
      return promotedTeamCleanSheetsOverrideCache;
    }
    const map = new Map<string, { cleanSheets: number; played: number }>();
    for (const [name, stats] of Object.entries(PROMOTED_TEAM_LAST_SEASON_CLEAN_SHEETS)) {
      map.set(name, { ...stats });
    }
    try {
      const result = await pool.query(`SELECT team_name, clean_sheets, played FROM admin_promoted_team_clean_sheets`);
      for (const row of result.rows) {
        map.set(row.team_name, { cleanSheets: row.clean_sheets, played: row.played });
      }
    } catch (error) {
      console.error('Failed to fetch admin promoted-team clean sheet overrides, using defaults:', error);
    }
    promotedTeamCleanSheetsOverrideCache = map;
    return map;
  }

  /** Admin-facing read for the Admin Goal Projections page's Promoted Teams section. */
  static async getPromotedTeamGoalsSettings(): Promise<Array<{ teamName: string; goalsFor: number; goalsAgainst: number; played: number }>> {
    const map = await TeamGoalsService.fetchPromotedTeamGoalsOverrides();
    return Array.from(map.entries()).map(([teamName, stats]) => ({ teamName, ...stats }));
  }

  /**
   * Admin-facing write for the Admin Goal Projections page's Promoted Teams section. Upserts
   * each team's goals for/against (played is always the assumed-38-game basis, not editable —
   * see the PROMOTED_TEAM_LAST_SEASON_GOALS comment above) and invalidates both the override
   * cache and the downstream lastSeasonGoalsCache so the new values take effect immediately.
   */
  static async updatePromotedTeamGoals(
    updates: Array<{ teamName: string; goalsFor: number; goalsAgainst: number }>,
    updatedBy: string
  ): Promise<void> {
    for (const { teamName, goalsFor, goalsAgainst } of updates) {
      if (!(teamName in PROMOTED_TEAM_LAST_SEASON_GOALS)) {
        throw new Error(`Unknown promoted team: ${teamName}`);
      }
      await pool.query(
        `INSERT INTO admin_promoted_team_goals (team_name, goals_for, goals_against, played, updated_by)
         VALUES ($1, $2, $3, 38, $4)
         ON CONFLICT (team_name) DO UPDATE SET goals_for = $2, goals_against = $3, updated_at = NOW(), updated_by = $4`,
        [teamName, goalsFor, goalsAgainst, updatedBy]
      );
    }
    promotedTeamGoalsOverrideCache = null;
    lastSeasonGoalsCache = null;
  }

  /** Admin-facing read for the Admin Clean Sheet Config page's Promoted Teams section. */
  static async getPromotedTeamCleanSheetSettings(): Promise<Array<{ teamName: string; cleanSheets: number; played: number }>> {
    const map = await TeamGoalsService.fetchPromotedTeamCleanSheetsOverrides();
    return Array.from(map.entries()).map(([teamName, stats]) => ({ teamName, ...stats }));
  }

  /** Admin-facing write for the Admin Clean Sheet Config page's Promoted Teams section — same shape as updatePromotedTeamGoals. */
  static async updatePromotedTeamCleanSheets(
    updates: Array<{ teamName: string; cleanSheets: number }>,
    updatedBy: string
  ): Promise<void> {
    for (const { teamName, cleanSheets } of updates) {
      if (!(teamName in PROMOTED_TEAM_LAST_SEASON_CLEAN_SHEETS)) {
        throw new Error(`Unknown promoted team: ${teamName}`);
      }
      await pool.query(
        `INSERT INTO admin_promoted_team_clean_sheets (team_name, clean_sheets, played, updated_by)
         VALUES ($1, $2, 38, $3)
         ON CONFLICT (team_name) DO UPDATE SET clean_sheets = $2, updated_at = NOW(), updated_by = $3`,
        [teamName, cleanSheets, updatedBy]
      );
    }
    promotedTeamCleanSheetsOverrideCache = null;
    lastSeasonCleanSheetsCache = null;
  }

  /**
   * Get a team's last-season (2025/26) clean sheet rate (0-1), or undefined if no last-season
   * data exists for them at all. Public — consumed directly by the /api/team-cs-projections
   * route to blend with this season's rate the same way team goals are blended.
   */
  static async getLastSeasonCleanSheetRate(teamId: number): Promise<number | undefined> {
    const { TEAMS_BY_ID } = await import("@shared/schema");
    const teamName = (TEAMS_BY_ID as any)[teamId]?.name;
    if (!teamName) return undefined;
    const map = await TeamGoalsService.fetchLastSeasonCleanSheetRates();
    const entry = map.get(teamName);
    return entry && entry.played > 0 ? entry.cleanSheets / entry.played : undefined;
  }

  /**
   * Get team's average goals scored per game: 50% this season (2026/27) + 50% last season
   * (2025/26), falling back to whichever side is actually available. Both sides missing
   * (shouldn't happen — every team has either an archive entry or a promoted-team entry)
   * still throws, same as before, so the caller's existing per-fixture error isolation applies.
   */
  static async getTeamAverageGoals(teamId: number): Promise<number> {
    try {
      const { TEAMS_BY_ID } = await import("@shared/schema");
      const teamName = (TEAMS_BY_ID as any)[teamId]?.name;

      const standingsData = await TeamGoalsService.fetchCurrentStandings();
      const teamData = standingsData.find((team: any) => team.id === teamId);
      const thisSeasonAvg = teamData && teamData.played > 0 ? teamData.goalsFor / teamData.played : undefined;

      const lastSeasonMap = await TeamGoalsService.fetchLastSeasonTeamGoals();
      const lastSeasonEntry = teamName ? lastSeasonMap.get(teamName) : undefined;
      const lastSeasonAvg = lastSeasonEntry && lastSeasonEntry.played > 0 ? lastSeasonEntry.goalsFor / lastSeasonEntry.played : undefined;

      if (thisSeasonAvg !== undefined && lastSeasonAvg !== undefined) {
        return thisSeasonAvg * 0.5 + lastSeasonAvg * 0.5;
      }
      if (lastSeasonAvg !== undefined) {
        return lastSeasonAvg;
      }
      if (thisSeasonAvg !== undefined) {
        return thisSeasonAvg;
      }

      throw new Error(`No team data found for team ${teamId} in current standings or last-season archive`);
    } catch (error) {
      console.error(`Failed to fetch team average goals for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Get team's average goals conceded per game: same 50/50 this-season/last-season blend
   * as getTeamAverageGoals, using goalsAgainst instead of goalsFor.
   */
  static async getTeamAverageGoalsConceded(teamId: number): Promise<number> {
    try {
      const { TEAMS_BY_ID } = await import("@shared/schema");
      const teamName = (TEAMS_BY_ID as any)[teamId]?.name;

      const standingsData = await TeamGoalsService.fetchCurrentStandings();
      const teamData = standingsData.find((team: any) => team.id === teamId);
      const thisSeasonAvg = teamData && teamData.played > 0 ? teamData.goalsAgainst / teamData.played : undefined;

      const lastSeasonMap = await TeamGoalsService.fetchLastSeasonTeamGoals();
      const lastSeasonEntry = teamName ? lastSeasonMap.get(teamName) : undefined;
      const lastSeasonAvg = lastSeasonEntry && lastSeasonEntry.played > 0 ? lastSeasonEntry.goalsAgainst / lastSeasonEntry.played : undefined;

      if (thisSeasonAvg !== undefined && lastSeasonAvg !== undefined) {
        return thisSeasonAvg * 0.5 + lastSeasonAvg * 0.5;
      }
      if (lastSeasonAvg !== undefined) {
        return lastSeasonAvg;
      }
      if (thisSeasonAvg !== undefined) {
        return thisSeasonAvg;
      }

      throw new Error(`No team data found for team ${teamId} in current standings or last-season archive`);
    } catch (error) {
      console.error(`Failed to fetch team average goals conceded for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Reconstruct each 2025/26 team's defensive-contributions-conceded per game — how many DC
   * points opposing outfield players earned against them, on average, per fixture. There's no
   * ready-made archive for this (unlike goals, which season_fixtures_archive stores directly),
   * so it's rebuilt from gameweek_player_data: every non-GK row's own defensive_contribution is
   * attributed as "conceded" to that row's opponent_team for the gameweek. Games-played per team
   * is reused from fetchLastSeasonTeamGoals (same season_fixtures_archive count), joined via
   * team name since gameweek_player_data's team ids are the 2025/26-season namespace.
   */
  private static async fetchLastSeasonTeamDCC(): Promise<Map<string, number>> {
    if (lastSeasonDCCCache) {
      return lastSeasonDCCCache;
    }
    if (lastSeasonDCCInFlight) {
      return lastSeasonDCCInFlight;
    }
    lastSeasonDCCInFlight = (async () => {
      const map = new Map<string, number>();
      try {
        // 2025/26 team id -> name, and which player ids are goalkeepers (excluded from DC)
        const teamRows = await pool.query(
          `SELECT DISTINCT team_id, team_name FROM historical_player_stats WHERE season = $1`,
          [LAST_SEASON]
        );
        const teamIdToName = new Map<number, string>();
        teamRows.rows.forEach((r: any) => teamIdToName.set(r.team_id, r.team_name));

        const gkRows = await pool.query(
          `SELECT player_id FROM historical_player_stats WHERE season = $1 AND element_type = 1`,
          [LAST_SEASON]
        );
        const goalkeeperIds = new Set<number>(gkRows.rows.map((r: any) => r.player_id));

        const dcRows = await pool.query(
          `SELECT player_id, opponent_team, defensive_contribution
           FROM gameweek_player_data
           WHERE season = $1 AND opponent_team IS NOT NULL AND defensive_contribution > 0`,
          [LAST_SEASON]
        );
        const dcConcededByTeamId = new Map<number, number>();
        for (const row of dcRows.rows) {
          if (goalkeeperIds.has(row.player_id)) continue;
          const current = dcConcededByTeamId.get(row.opponent_team) || 0;
          dcConcededByTeamId.set(row.opponent_team, current + row.defensive_contribution);
        }

        const gamesPlayedByName = await TeamGoalsService.fetchLastSeasonTeamGoals();
        dcConcededByTeamId.forEach((totalDC, teamId) => {
          const teamName = teamIdToName.get(teamId);
          if (!teamName) return;
          const played = gamesPlayedByName.get(teamName)?.played;
          if (played && played > 0) {
            map.set(teamName, totalDC / played);
          }
        });
      } catch (error) {
        // Not fatal — getLastSeasonTeamDCCRate falls back to this-season-only or league average.
        console.error('Failed to reconstruct archived last-season team DCC:', error);
      }
      lastSeasonDCCCache = map;
      return map;
    })();
    try {
      return await lastSeasonDCCInFlight;
    } finally {
      lastSeasonDCCInFlight = null;
    }
  }

  /**
   * A team's last-season (2025/26) defensive-contributions-conceded per game, or undefined if
   * they have no PL data for that season (promoted teams) — same "undefined means fall back"
   * contract as getLastSeasonCleanSheetRate.
   */
  static async getLastSeasonTeamDCCRate(teamId: number): Promise<number | undefined> {
    const { TEAMS_BY_ID } = await import("@shared/schema");
    const teamName = (TEAMS_BY_ID as any)[teamId]?.name;
    if (!teamName) return undefined;
    const map = await TeamGoalsService.fetchLastSeasonTeamDCC();
    return map.get(teamName);
  }

  /**
   * League-average 2025/26 DCC per game across every team that has archived data — the fallback
   * for promoted teams (Coventry/Ipswich/Hull), who have no Premier League DC data to blend.
   */
  static async getLeagueAverageDCCRate(): Promise<number> {
    const map = await TeamGoalsService.fetchLastSeasonTeamDCC();
    if (map.size === 0) return 0;
    const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0);
    return total / map.size;
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
import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

interface ProjectionCache {
  lastUpdated: Date;
  data: any[];
}

// Player availability now uses only official FPL API data (chance_of_playing_next_round, status, news)

class ProjectionService {
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly STALE_THRESHOLD = 4 * 60 * 60 * 1000; // 4 hours

  /**
   * Get player total points projections with next 6 gameweeks static cache priority (Option 3)
   */
  async getPlayerTotalPoints(startGameweek: number, endGameweek: number): Promise<any[]> {
    try {
      // OPTION 3: Check static cache for next 6 gameweeks first (80% faster)
      const { staticCacheService } = await import('./static-cache-service');
      const staticCached = await staticCacheService.getCachedProjections(startGameweek, endGameweek);
      
      if (staticCached) {
        console.log(`🚀 STATIC CACHE HIT: Serving GW${startGameweek}-${endGameweek} from next 6 gameweeks cache`);
        return staticCached;
      }
      
      // Fallback: Try regular database cache
      const cached = await this.getPlayerProjectionsFromDB(startGameweek, endGameweek);
      
      if (cached && cached.length > 0) {
        console.log(`DEBUG: Serving ${cached.length} player projections from regular database cache`);
        return cached;
      }
      
      // Last resort: Calculate fresh projections
      console.log(`DEBUG: No cached projections found for GW${startGameweek}-${endGameweek}, triggering calculation`);
      return this.calculateAndCacheProjections(startGameweek, endGameweek);
      
    } catch (error) {
      console.error("Error in ProjectionService.getPlayerTotalPoints:", error);
      throw error;
    }
  }

  /**
   * Get cached projections from database using the playerTotalPointsSnapshots table
   */
  private async getPlayerProjectionsFromDB(startGameweek: number, endGameweek: number): Promise<any[]> {
    try {
      // Query the playerTotalPointsSnapshots table 
      const projections = await db.execute(sql`
        SELECT * FROM player_total_points_snapshots 
        WHERE start_gameweek = ${startGameweek} AND end_gameweek = ${endGameweek}
        ORDER BY total_projected_points DESC
        LIMIT 800
      `);

      if (projections.rows.length === 0) {
        console.log(`DEBUG: No cached player total points found for GW${startGameweek}-${endGameweek}`);
        return [];
      }

      // Check if data is stale (older than 4 hours)
      const latestUpdate = projections.rows[0]?.created_at;
      if (latestUpdate && Date.now() - new Date(latestUpdate as string).getTime() > this.STALE_THRESHOLD) {
        console.log(`DEBUG: Cached projections are stale (${Math.round((Date.now() - new Date(latestUpdate as string).getTime()) / (60 * 60 * 1000))} hours old)`);
        return [];
      }

      console.log(`🎯 SUCCESS: Found ${projections.rows.length} players in playerTotalPointsSnapshots table`);

      // Transform database format to API format with detailed breakdowns
      return projections.rows.map((projection: any) => {
        // Parse JSON fields safely
        const gameweekData = projection.gameweek_data ? 
          (typeof projection.gameweek_data === 'string' ? JSON.parse(projection.gameweek_data) : projection.gameweek_data) : {};
        
        const pointsFromGoals = projection.points_from_goals ? 
          (typeof projection.points_from_goals === 'string' ? JSON.parse(projection.points_from_goals) : projection.points_from_goals) : {};
        
        const pointsFromAssists = projection.points_from_assists ? 
          (typeof projection.points_from_assists === 'string' ? JSON.parse(projection.points_from_assists) : projection.points_from_assists) : {};
        
        const pointsFromCleanSheets = projection.points_from_clean_sheets ? 
          (typeof projection.points_from_clean_sheets === 'string' ? JSON.parse(projection.points_from_clean_sheets) : projection.points_from_clean_sheets) : {};
        
        const pointsFromDefensiveContributions = projection.points_from_defensive_contributions ? 
          (typeof projection.points_from_defensive_contributions === 'string' ? JSON.parse(projection.points_from_defensive_contributions) : projection.points_from_defensive_contributions) : {};
        
        const pointsFromMinutes = projection.points_from_minutes ? 
          (typeof projection.points_from_minutes === 'string' ? JSON.parse(projection.points_from_minutes) : projection.points_from_minutes) : {};
        
        const pointsFromBonus = projection.points_from_bonus ? 
          (typeof projection.points_from_bonus === 'string' ? JSON.parse(projection.points_from_bonus) : projection.points_from_bonus) : {};
        
        const pointsFromGoalsConceded = projection.points_from_goals_conceded ? 
          (typeof projection.points_from_goals_conceded === 'string' ? JSON.parse(projection.points_from_goals_conceded) : projection.points_from_goals_conceded) : {};
        
        const pointsFromYellowCards = projection.points_from_yellow_cards ? 
          (typeof projection.points_from_yellow_cards === 'string' ? JSON.parse(projection.points_from_yellow_cards) : projection.points_from_yellow_cards) : {};
        
        const pointsFromRedCards = projection.points_from_red_cards ? 
          (typeof projection.points_from_red_cards === 'string' ? JSON.parse(projection.points_from_red_cards) : projection.points_from_red_cards) : {};
        
        const pointsFromSaves = projection.points_from_saves ? 
          (typeof projection.points_from_saves === 'string' ? JSON.parse(projection.points_from_saves) : projection.points_from_saves) : {};

        return {
          playerId: projection.player_id,
          playerName: projection.player_name,
          name: projection.player_name,
          fullName: projection.player_name,
          teamName: projection.team_name,
          team: projection.team_name,
          position: projection.position,
          price: parseFloat(projection.current_price || 0) / 10,
          ownership: parseFloat(projection.ownership || 0),
          gameweekProjections: gameweekData,
          totalExpectedPoints: parseFloat(projection.total_expected_points?.toString() || 0),
          totalPoints: parseFloat(projection.total_expected_points?.toString() || 0),
          averagePerGameweek: parseFloat(projection.average_per_gameweek?.toString() || 0),
          averageValue: parseFloat(projection.average_value?.toString() || 0),
          avgMinutesPerGameweek: parseFloat(projection.avg_minutes_per_gameweek?.toString() || 0),
          // Detailed point breakdowns for granular analysis
          pointsFromGoals,
          pointsFromAssists,
          pointsFromCleanSheets,
          pointsFromDefensiveContributions,
          pointsFromMinutes,
          pointsFromBonus,
          pointsFromGoalsConceded,
          pointsFromYellowCards,
          pointsFromRedCards,
          pointsFromSaves,
          totalPointsFromGoals: parseFloat(projection.total_points_from_goals || 0),
          totalPointsFromAssists: parseFloat(projection.total_points_from_assists || 0),
          totalPointsFromCleanSheets: parseFloat(projection.total_points_from_clean_sheets || 0),
          totalPointsFromDefensiveContributions: parseFloat(projection.total_points_from_defensive_contributions || 0),
          totalPointsFromMinutes: parseFloat(projection.total_points_from_minutes || 0),
          totalPointsFromBonus: parseFloat(projection.total_points_from_bonus || 0),
          totalPointsFromGoalsConceded: parseFloat(projection.total_points_from_goals_conceded || 0),
          totalPointsFromYellowCards: parseFloat(projection.total_points_from_yellow_cards || 0),
          totalPointsFromRedCards: parseFloat(projection.total_points_from_red_cards || 0),
          totalPointsFromSaves: parseFloat(projection.total_points_from_saves || 0)
        };
      });

    } catch (error) {
      console.error("Error getting cached projections:", error);
      return [];
    }
  }

  /**
   * Calculate projections and cache them in database
   */
  private async calculateAndCacheProjections(startGameweek: number, endGameweek: number): Promise<any[]> {
    const startTime = Date.now();
    const updateId = crypto.randomUUID();
    
    try {
      console.log(`DEBUG: Starting projection calculation for GW${startGameweek}-${endGameweek}`);

      // Log the start of calculation using direct SQL
      await db.execute(sql`
        INSERT INTO projection_update_log (id, update_type, gameweek_range, started_at, status, duration)
        VALUES (${updateId}, 'player_projections', ${`${startGameweek}-${endGameweek}`}, NOW(), 'in_progress', 0)
      `);

      // Get fresh data from bootstrap API
      const bootstrapResponse = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
      if (!bootstrapResponse.ok) {
        throw new Error("Failed to fetch bootstrap data");
      }
      const bootstrapData = await bootstrapResponse.json();

      // T001: Fetch real fixtures and standings for opponent-based projections
      const [fixturesRes, standingsRes] = await Promise.all([
        fetch("http://localhost:5000/api/fixtures"),
        fetch("http://localhost:5000/api/current-standings?venue=all")
      ]);
      const fixturesData: any[] = fixturesRes.ok ? await fixturesRes.json() : [];
      const standingsData: any[] = standingsRes.ok ? await standingsRes.json() : [];

      // Build per-team xG and xGC rates from standings
      const teamStatsMap = new Map<number, { xGFor: number; xGAgainst: number; played: number }>();
      standingsData.forEach((t: any) => {
        if (t.played > 0) {
          teamStatsMap.set(t.id, {
            xGFor: (t.expectedGoalsFor || 0) / t.played,
            xGAgainst: (t.expectedGoalsAgainst || 0) / t.played,
            played: t.played
          });
        }
      });

      // League average xG and xGC per game
      const teamStatValues = Array.from(teamStatsMap.values());
      const leagueAvgXG = teamStatValues.length > 0
        ? teamStatValues.reduce((s, t) => s + t.xGFor, 0) / teamStatValues.length : 1.3;
      const leagueAvgXGC = teamStatValues.length > 0
        ? teamStatValues.reduce((s, t) => s + t.xGAgainst, 0) / teamStatValues.length : 1.3;

      // T002: Per-team CS calibration coefficients (same approach as team CS projections page)
      // kCoeff[teamId] = leagueAvgCSRate / teamCSRate, clamped 0.70–1.40
      const finishedFixtures = fixturesData.filter((f: any) => f.finished && f.team_h_score != null);
      const leagueCSCount = finishedFixtures.filter((f: any) =>
        f.team_h_score === 0 || f.team_a_score === 0).length;
      const leagueAvgCSRate = finishedFixtures.length > 0
        ? leagueCSCount / (finishedFixtures.length * 2) : 0.26;

      const teamCSCoeffMap = new Map<number, number>();
      bootstrapData.teams.forEach((t: any) => {
        const teamGames = finishedFixtures.filter((f: any) => f.team_h === t.id || f.team_a === t.id);
        if (teamGames.length > 0) {
          const teamCS = teamGames.filter((f: any) =>
            (f.team_h === t.id && f.team_a_score === 0) ||
            (f.team_a === t.id && f.team_h_score === 0)).length;
          const teamCSRate = Math.max(0.05, teamCS / teamGames.length);
          const k = Math.max(0.70, Math.min(1.40, leagueAvgCSRate / teamCSRate));
          teamCSCoeffMap.set(t.id, k);
        } else {
          teamCSCoeffMap.set(t.id, 1.0);
        }
      });

      // Build fixture lookup: fixtureMap[teamId][gw] = { opponentXG, opponentXGC, isHome }
      const fixtureMap = new Map<number, Map<number, { opponentXG: number; opponentXGC: number; isHome: boolean }>>();
      fixturesData.filter((f: any) => !f.finished && f.event != null).forEach((f: any) => {
        // Home team perspective
        if (!fixtureMap.has(f.team_h)) fixtureMap.set(f.team_h, new Map());
        const homeMap = fixtureMap.get(f.team_h)!;
        if (!homeMap.has(f.event)) {
          const oppStats = teamStatsMap.get(f.team_a) || { xGFor: leagueAvgXG, xGAgainst: leagueAvgXGC, played: 1 };
          homeMap.set(f.event, { opponentXG: oppStats.xGFor, opponentXGC: oppStats.xGAgainst, isHome: true });
        }
        // Away team perspective
        if (!fixtureMap.has(f.team_a)) fixtureMap.set(f.team_a, new Map());
        const awayMap = fixtureMap.get(f.team_a)!;
        if (!awayMap.has(f.event)) {
          const oppStats = teamStatsMap.get(f.team_h) || { xGFor: leagueAvgXG, xGAgainst: leagueAvgXGC, played: 1 };
          awayMap.set(f.event, { opponentXG: oppStats.xGFor, opponentXGC: oppStats.xGAgainst, isHome: false });
        }
      });

      // Include ALL players in the FPL database (no filtering)
      const players = bootstrapData.elements
        .sort((a: any, b: any) => parseFloat(b.total_points) - parseFloat(a.total_points)) // Sort by total points
        .map((fplPlayer: any) => {
          const team = bootstrapData.teams.find((t: any) => t.id === fplPlayer.team);
          const position = ['', 'GKP', 'DEF', 'MID', 'FWD'][fplPlayer.element_type] || 'MID';
          
          // Enhanced projections with detailed point breakdowns
          const gameweekProjections: { [key: string]: number } = {};
          const pointsFromGoals: { [key: string]: number } = {};
          const pointsFromAssists: { [key: string]: number } = {};
          const pointsFromCleanSheets: { [key: string]: number } = {};
          const pointsFromDefensiveContributions: { [key: string]: number } = {};
          const pointsFromMinutes: { [key: string]: number } = {};
          const pointsFromBonus: { [key: string]: number } = {};
          
          let totalExpectedPoints = 0;
          let totalGoalPoints = 0, totalAssistPoints = 0, totalCleanSheetPoints = 0;
          let totalDefensivePoints = 0, totalMinutesPoints = 0, totalBonusPoints = 0;
          
          // FPL scoring system - CORRECT GOAL POINTS
          const goalPoints = position === 'GKP' ? 10 : position === 'DEF' ? 6 : position === 'MID' ? 5 : 4;
          const assistPoints = 3;
          const cleanSheetPoints = position === 'GKP' || position === 'DEF' ? 4 : position === 'MID' ? 1 : 0;
          
          for (let gw = startGameweek; gw <= endGameweek; gw++) {
            // Get gameweek-specific opponent strength and fixture context
            const form = parseFloat(fplPlayer.form || "0");
            const totalPoints = parseFloat(fplPlayer.total_points || "0");
            const selectedBy = parseFloat(fplPlayer.selected_by_percent || "1");
            const minutes = parseFloat(fplPlayer.minutes || "0");
            
            // T001: Use real fixture data for opponent strength instead of fake seed
            const teamId = fplPlayer.team;
            const teamGWFixtures = fixtureMap.get(teamId);
            const realFixture = teamGWFixtures?.get(gw);
            
            // If no fixture this GW (blank gameweek), skip — project 0 points for this GW
            if (!realFixture) {
              gameweekProjections[gw.toString()] = 0;
              pointsFromGoals[gw.toString()] = 0;
              pointsFromAssists[gw.toString()] = 0;
              pointsFromCleanSheets[gw.toString()] = 0;
              pointsFromMinutes[gw.toString()] = 0;
              pointsFromBonus[gw.toString()] = 0;
              continue;
            }
            
            const isHomeFixture = realFixture.isHome;
            const opponentXG = realFixture.opponentXG;   // Opponent's attacking rate (threat to our CS/saves)
            const opponentXGC = realFixture.opponentXGC; // Opponent's defensive weakness (opportunity for our attack)
            
            // Difficulty multiplier: relative opponent defensive weakness × venue adjustment
            const rawDifficulty = opponentXGC / Math.max(leagueAvgXGC, 0.5);
            const venueBase = isHomeFixture ? 1.00 : 0.84;
            const difficultyMultiplier = Math.max(0.60, Math.min(1.40, rawDifficulty * venueBase));
            
            // Base form with season performance weighting
            const seasonPerformance = totalPoints / Math.max(minutes / 90, 1); // Points per 90 minutes
            const adjustedForm = Math.max(form * 0.7 + seasonPerformance * 0.3, 1.0);
            
            // Calculate average minutes per game from season data
            const gamesPlayed = Math.max(startGameweek - 1, 1); // Number of gameweeks that have finished
            const averageMinutesPerGame = minutes > 0 ? (minutes / gamesPlayed) : 45; // Default to 45 if no data
            
            // 1. MINUTES CALCULATION
            const injuryRisk = (fplPlayer.chance_of_playing_next_round || 100) / 100;
            const rotationRisk = selectedBy > 30 ? 0.95 : selectedBy > 10 ? 0.85 : 0.75; // Popular players less rotated
            
            // Player availability uses official FPL API data
            let expectedMinutes = Math.min(90, adjustedForm * 15) * injuryRisk * rotationRisk;
            
            const minutesPoints = expectedMinutes >= 60 ? 2 : expectedMinutes >= 1 ? 1 : 0;
            pointsFromMinutes[gw.toString()] = minutesPoints; // Use numeric string for consistency
            totalMinutesPoints += minutesPoints;
            
            // 2. GOALS CALCULATION (per 90 minutes, NOT scaled by expected minutes)
            let goalsExpected;
            if (position === 'FWD') {
              goalsExpected = (adjustedForm * 0.12 + seasonPerformance * 0.05) * difficultyMultiplier;
            } else if (position === 'MID') {
              goalsExpected = (adjustedForm * 0.06 + seasonPerformance * 0.03) * difficultyMultiplier;
            } else if (position === 'DEF') {
              goalsExpected = (adjustedForm * 0.02 + seasonPerformance * 0.01) * difficultyMultiplier;
            } else {
              goalsExpected = adjustedForm * 0.005 * difficultyMultiplier; // GKP
            }
            
            const gwGoalPoints = goalsExpected * goalPoints;
            pointsFromGoals[gw.toString()] = Math.round(gwGoalPoints * 100) / 100; // Use numeric string for consistency
            totalGoalPoints += gwGoalPoints;
            
            // 3. ASSISTS CALCULATION (NOT scaled by expected minutes)
            let assistsExpected;
            if (position === 'MID') {
              assistsExpected = (adjustedForm * 0.08 + seasonPerformance * 0.04) * difficultyMultiplier;
            } else if (position === 'FWD') {
              assistsExpected = (adjustedForm * 0.04 + seasonPerformance * 0.02) * difficultyMultiplier;
            } else if (position === 'DEF') {
              assistsExpected = (adjustedForm * 0.025 + seasonPerformance * 0.01) * difficultyMultiplier;
            } else {
              assistsExpected = adjustedForm * 0.003 * difficultyMultiplier; // GKP
            }
            
            const gwAssistPoints = assistsExpected * assistPoints;
            pointsFromAssists[gw.toString()] = Math.round(gwAssistPoints * 100) / 100; // Use numeric string for consistency
            totalAssistPoints += gwAssistPoints;
            
            // 4. CLEAN SHEET CALCULATION (T002: Poisson model with real opponent xG)
            let cleanSheetProb = 0;
            if (position === 'GKP' || position === 'DEF' || position === 'MID') {
              // λ = opponent xG × venue scaling (opponents score more when we're away)
              const csVenueScale = isHomeFixture ? 0.84 : 1.16;
              const lambda = opponentXG * csVenueScale;
              // Calibrated Poisson CS probability using per-team coefficient
              const k = teamCSCoeffMap.get(teamId) ?? 1.0;
              cleanSheetProb = Math.max(0, Math.min(0.85, Math.exp(-lambda * k)));
              if (position === 'MID') cleanSheetProb *= 0.8;
              // No separate venue ×0.9 — venue is baked into λ above
            }
            
            const gwCleanSheetPoints = cleanSheetProb * cleanSheetPoints * (averageMinutesPerGame / 90);
            pointsFromCleanSheets[gw.toString()] = Math.round(gwCleanSheetPoints * 100) / 100; // Use numeric string for consistency
            
            // 5. SAVES CALCULATION (Goalkeepers Only) - Official FPL Rules: 1pt per 3 saves, 5pts per penalty save
            let savesPoints = 0;
            if (position === 'GKP') {
              // NEW FORMULA: (Goalkeeper Avg Saves/Game × Opponent AGR) / 1.35
              // Get goalkeeper's historical average saves per game from FPL data
              const goalkeeperAvgSavesPerGame = fplPlayer.saves && fplPlayer.minutes > 0 
                ? (fplPlayer.saves / (fplPlayer.minutes / 90)) 
                : 2.5; // Default to 2.5 saves per 90 if no data
              
              // T001: Use real opponent xG as Attacking Goal Rate
              const opponentAGR = opponentXG;
              
              // Calculate expected saves (no minutes multiplier)
              const expectedSaves = (goalkeeperAvgSavesPerGame * opponentAGR / 1.35);
              
              // Poisson probability-based saves points calculation
              // FPL awards 1 point per 3 saves (floor-based thresholds: 3=1pt, 6=2pt, 9=3pt, 12=4pt)
              const poissonProbAtLeast = (lambda: number, k: number): number => {
                if (lambda <= 0) return 0;
                let cumulativeProb = 0;
                for (let i = 0; i < k; i++) {
                  cumulativeProb += Math.exp(-lambda + i * Math.log(lambda) - Array.from({length: i}, (_, j) => Math.log(j + 1)).reduce((a, b) => a + b, 0));
                }
                return 1 - cumulativeProb;
              };
              savesPoints = poissonProbAtLeast(expectedSaves, 3)
                + poissonProbAtLeast(expectedSaves, 6)
                + poissonProbAtLeast(expectedSaves, 9)
                + poissonProbAtLeast(expectedSaves, 12);
              
              // Penalty save probability (rare event, ~3% chance per game for top keepers)
              const penaltySaveProbability = position === 'GKP' ? 0.03 * (adjustedForm / 10) : 0;
              const penaltySavePoints = penaltySaveProbability * 5; // 5 points per penalty save
              
              savesPoints += penaltySavePoints;
            }
            
            // 6. GOALS CONCEDED (Goalkeepers and Defenders Only) - Official FPL Rules: -1pt per 2 goals conceded
            let goalsConcededPoints = 0;
            if ((position === 'GKP' || position === 'DEF') && averageMinutesPerGame >= 1) {
              // T001: Use real opponent xG as attack strength for goals conceded
              const opponentAttackStrength = opponentXG;
              
              const teamDefenseStrength = (adjustedForm * 0.05) + 0.85; // Base 85% + form
              const expectedGoalsConceded = (opponentAttackStrength / teamDefenseStrength) * (averageMinutesPerGame / 90);
              
              // Poisson-based goals conceded points calculation
              // FPL rule: -1pt per 2 goals conceded (floor(gc/2) * -1)
              // E[points] = -Σ floor(k/2) * P(X=k) for k=0,1,2,...
              const lambda = expectedGoalsConceded;
              if (lambda > 0) {
                let expectedPenalty = 0;
                let cumulativeProb = 0;
                let logFactorial = 0;
                const maxK = Math.max(20, Math.ceil(lambda * 3));
                for (let k = 0; k <= maxK; k++) {
                  if (k > 0) logFactorial += Math.log(k);
                  const logProb = -lambda + k * Math.log(lambda) - logFactorial;
                  const prob = Math.exp(logProb);
                  cumulativeProb += prob;
                  expectedPenalty += Math.floor(k / 2) * prob;
                  if (cumulativeProb > 0.9999) break;
                }
                goalsConcededPoints = -expectedPenalty;
              }
            }
            
            // 7. YELLOW CARDS (All Positions) - Official FPL Rules: -1pt per yellow card
            let yellowCardPoints = 0;
            if (averageMinutesPerGame >= 1) {
              // Position-average league rates (empirical baseline)
              const positionAvgYCRate = position === 'DEF' ? 0.15 : position === 'MID' ? 0.12 : position === 'FWD' ? 0.08 : 0.03;
              
              // T002: Player-specific rate blended 50/50 with position average for accuracy
              const playerYellowCards = parseFloat((fplPlayer as any).yellow_cards || 0);
              const playerApps = gamesPlayed; // finished GWs = team games played denominator
              let yellowCardProbability: number;
              if (playerApps >= 5) {
                const playerYCRate = playerYellowCards / playerApps;
                yellowCardProbability = (playerYCRate * 0.5 + positionAvgYCRate * 0.5) * (adjustedForm / 10);
              } else {
                yellowCardProbability = positionAvgYCRate * (adjustedForm / 10);
              }
              
              // T001: Adjust for fixture difficulty using real opponent xGC (tougher defense = more cards trying to break down)
              const ycDiffRatio = opponentXGC / Math.max(leagueAvgXGC, 0.5);
              if (ycDiffRatio < 0.80) yellowCardProbability *= 1.3; // vs tight defensive teams (elite)
              else if (ycDiffRatio < 0.95) yellowCardProbability *= 1.1; // vs solid teams
              
              // Scale by average minutes
              yellowCardPoints = yellowCardProbability * (-1) * (averageMinutesPerGame / 90); // -1 point per yellow card (official FPL rule)
            }
            
            // 8. RED CARDS (All Positions) - Official FPL Rules: -3pts per red card
            let redCardPoints = 0;
            if (averageMinutesPerGame >= 1) {
              // Red card probability (much rarer than yellow cards)
              let redCardProbability;
              if (position === 'DEF') {
                redCardProbability = 0.02 * (adjustedForm / 10); // Defenders highest risk
              } else if (position === 'MID') {
                redCardProbability = 0.015 * (adjustedForm / 10); // Midfielders moderate
              } else if (position === 'FWD') {
                redCardProbability = 0.01 * (adjustedForm / 10); // Forwards lower risk
              } else {
                redCardProbability = 0.005 * (adjustedForm / 10); // Goalkeepers very rare
              }
              
              // Scale by average minutes
              redCardPoints = redCardProbability * (-3) * (averageMinutesPerGame / 90); // -3 points per red card (official FPL rule)
            }
            
            // 9. BONUS POINTS (All Positions) - Historical bonus-per-appearance approach
            // Uses player's actual demonstrated bonus earning rate from the season
            let bonusPoints = 0;
            const playerSeasonBonus = parseFloat(fplPlayer.bonus || "0");
            const finishedGWCount = Math.max(startGameweek - 1, 1);
            // bonus_per_gw includes both appearance rate and bonus earning rate naturally
            bonusPoints = playerSeasonBonus / finishedGWCount;
            totalCleanSheetPoints += gwCleanSheetPoints;
            
            // 10. DEFENSIVE CONTRIBUTIONS (2025/26 season) - Threshold-based scoring
            let gwDefensivePoints = 0;
            if (position === 'DEF' || position === 'MID' || position === 'FWD') {
              // Estimate DC value based on form and minutes
              const estimatedDC = position === 'DEF' ? 
                (adjustedForm * 0.8 + seasonPerformance * 0.3) * (expectedMinutes / 90) : 
                (adjustedForm * 0.4 + seasonPerformance * 0.2) * (expectedMinutes / 90);
              
              // Apply FPL threshold rule: 2 points if DC >= 10 for DEF, >= 12 for MID/FWD
              const dcThreshold = position === 'DEF' ? 10 : 12;
              gwDefensivePoints = estimatedDC >= dcThreshold ? 2 : 0;
            }
            pointsFromDefensiveContributions[gw.toString()] = Math.round(gwDefensivePoints * 100) / 100; // Use numeric string for consistency
            totalDefensivePoints += gwDefensivePoints;
            
            // Store bonus points in the dedicated tracking
            pointsFromBonus[gw.toString()] = Math.round(bonusPoints * 100) / 100; // Use numeric string for consistency
            totalBonusPoints += bonusPoints;
            
            // 11. TOTAL GAMEWEEK POINTS (sum ALL FPL scoring components)
            const gwTotal = gwGoalPoints + gwAssistPoints + gwCleanSheetPoints + gwDefensivePoints + 
                          minutesPoints + savesPoints + goalsConcededPoints + yellowCardPoints + 
                          redCardPoints + bonusPoints;
            gameweekProjections[gw.toString()] = Math.max(Math.round(gwTotal * 100) / 100, 0.0); // Use numeric string for consistency
            totalExpectedPoints += gwTotal;
          }
          
          const avgPerGameweek = totalExpectedPoints / (endGameweek - startGameweek + 1);
          
          // Calculate ACTUAL season total by summing ALL 38 gameweeks
          let seasonTotalPoints = 0;
          
          // For gameweeks in the requested range, use actual calculations
          const requestedRangeTotal = totalExpectedPoints;
          
          // For all 38 gameweeks, sum up the projections
          // Gameweeks 4-9 (requested range): use actual calculated points
          seasonTotalPoints += requestedRangeTotal;
          
          // Gameweeks 1-3 and 10-38 (outside range): use average projection
          const gameweeksOutsideRange = 38 - (endGameweek - startGameweek + 1);
          seasonTotalPoints += avgPerGameweek * gameweeksOutsideRange;
          
          seasonTotalPoints = Math.round(seasonTotalPoints);
          
          // Debug logging for Salah
          if (fplPlayer.web_name === "M.Salah") {
            console.log(`DEBUG: Salah season calculation:`);
            console.log(`  - Range GW${startGameweek}-${endGameweek}: ${requestedRangeTotal.toFixed(2)} points`);
            console.log(`  - Avg per GW: ${avgPerGameweek.toFixed(2)}`);
            console.log(`  - GWs outside range: ${gameweeksOutsideRange}`);
            console.log(`  - Points for outside GWs: ${(avgPerGameweek * gameweeksOutsideRange).toFixed(2)}`);
            console.log(`  - Season total: ${seasonTotalPoints}`);
          }
          
          return {
            playerId: fplPlayer.id,
            playerName: fplPlayer.web_name,
            teamId: fplPlayer.team,
            teamName: team?.short_name || 'UNK',
            position,
            elementType: fplPlayer.element_type,
            currentPrice: fplPlayer.now_cost,
            ownership: parseFloat(fplPlayer.selected_by_percent),
            gameweekProjections,
            totalExpectedPoints,
            seasonTotalPoints,
            averagePerGameweek: avgPerGameweek,
            // Detailed breakdowns
            pointsFromGoals,
            pointsFromAssists,
            pointsFromCleanSheets,
            pointsFromDefensiveContributions,
            pointsFromMinutes,
            pointsFromBonus,
            totalGoalPoints,
            totalAssistPoints,
            totalCleanSheetPoints,
            totalDefensivePoints,
            totalMinutesPoints,
            totalBonusPoints
          };
        });

      // Cache in database using direct SQL
      const cachePromises = players.map(async (player) => {
        try {
          // Delete existing record if any
          await db.execute(sql`
            DELETE FROM player_projections 
            WHERE player_id = ${player.playerId} 
              AND start_gameweek = ${startGameweek}
              AND end_gameweek = ${endGameweek}
              AND season = '2025/26'
          `);

          // Insert new record with detailed point breakdowns
          await db.execute(sql`
            INSERT INTO player_projections (
              player_id, player_name, team_id, team_name, position, element_type,
              current_price, ownership, total_points_projections, total_points,
              average_points_per_gameweek, season_projected_points, gameweek_range,
              start_gameweek, end_gameweek, season,
              points_from_goals, points_from_assists, points_from_clean_sheets,
              points_from_defensive_contributions, points_from_minutes, points_from_bonus,
              total_points_from_goals, total_points_from_assists, total_points_from_clean_sheets,
              total_points_from_defensive_contributions, total_points_from_minutes, total_points_from_bonus
            ) VALUES (
              ${player.playerId}, ${player.playerName}, ${player.teamId}, ${player.teamName},
              ${player.position}, ${player.elementType}, ${player.currentPrice}, ${player.ownership},
              ${JSON.stringify(player.gameweekProjections)}, ${player.totalExpectedPoints},
              ${player.averagePerGameweek}, ${player.seasonTotalPoints}, ${`${startGameweek}-${endGameweek}`},
              ${startGameweek}, ${endGameweek}, '2025/26',
              ${JSON.stringify(player.pointsFromGoals)}, ${JSON.stringify(player.pointsFromAssists)}, 
              ${JSON.stringify(player.pointsFromCleanSheets)}, ${JSON.stringify(player.pointsFromDefensiveContributions)},
              ${JSON.stringify(player.pointsFromMinutes)}, ${JSON.stringify(player.pointsFromBonus)},
              ${player.totalGoalPoints}, ${player.totalAssistPoints}, ${player.totalCleanSheetPoints},
              ${player.totalDefensivePoints}, ${player.totalMinutesPoints}, ${player.totalBonusPoints}
            )
          `);
        } catch (error) {
          console.error(`Error caching player ${player.playerId}:`, error);
        }
      });

      await Promise.all(cachePromises);

      const duration = Date.now() - startTime;
      
      // Update log with success using direct SQL
      await db.execute(sql`
        UPDATE projection_update_log 
        SET status = 'success', players_updated = ${players.length}, duration = ${duration}, completed_at = NOW()
        WHERE id = ${updateId}
      `);

      console.log(`DEBUG: Cached ${players.length} player projections in ${duration}ms`);

      // Return in API format with detailed breakdowns
      return players.map(player => ({
        playerId: player.playerId,
        name: player.playerName,
        fullName: player.playerName,
        team: player.teamName,
        position: player.position,
        price: player.currentPrice / 10,
        ownership: player.ownership,
        gameweekProjections: player.gameweekProjections,
        totalExpectedPoints: player.totalExpectedPoints,
        seasonTotalPoints: player.seasonTotalPoints,
        averagePerGameweek: player.averagePerGameweek,
        // Include detailed point breakdowns for tooltip functionality
        pointsFromGoals: player.pointsFromGoals,
        pointsFromAssists: player.pointsFromAssists,
        pointsFromCleanSheets: player.pointsFromCleanSheets,
        pointsFromDefensiveContributions: player.pointsFromDefensiveContributions,
        pointsFromMinutes: player.pointsFromMinutes,
        pointsFromBonus: player.pointsFromBonus,
        totalPointsFromGoals: player.totalGoalPoints,
        totalPointsFromAssists: player.totalAssistPoints,
        totalPointsFromCleanSheets: player.totalCleanSheetPoints,
        totalPointsFromDefensiveContributions: player.totalDefensivePoints,
        totalPointsFromMinutes: player.totalMinutesPoints,
        totalPointsFromBonus: player.totalBonusPoints
      })).sort((a, b) => b.totalExpectedPoints - a.totalExpectedPoints);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update log with failure using direct SQL
      await db.execute(sql`
        UPDATE projection_update_log 
        SET status = 'failed', duration = ${duration}, 
            error_details = ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}, 
            completed_at = NOW()
        WHERE id = ${updateId}
      `);

      console.error("Error calculating projections:", error);
      throw error;
    }
  }

  /**
   * Force refresh of projections (admin function)
   */
  async refreshProjections(startGameweek: number, endGameweek: number): Promise<void> {
    console.log(`DEBUG: Force refreshing projections for GW${startGameweek}-${endGameweek}`);
    
    // Delete existing cached data using direct SQL
    await db.execute(sql`
      DELETE FROM player_projections 
      WHERE start_gameweek = ${startGameweek} 
        AND end_gameweek = ${endGameweek} 
        AND season = '2025/26'
    `);

    // Recalculate
    await this.calculateAndCacheProjections(startGameweek, endGameweek);
  }

  /**
   * Get projection update status
   */
  async getUpdateStatus(): Promise<any[]> {
    const recentUpdates = await db.execute(sql`
      SELECT * FROM projection_update_log 
      ORDER BY completed_at DESC 
      LIMIT 10
    `);

    return recentUpdates.rows;
  }
}

export const projectionService = new ProjectionService();
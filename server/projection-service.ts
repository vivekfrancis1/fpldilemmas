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
      // Query the playerTotalPointsSnapshots table joined with windows for gameweek filtering
      const projections = await db.execute(sql`
        SELECT s.* FROM player_total_points_snapshots s
        JOIN player_total_points_windows w ON s.window_id = w.window_id
        WHERE w.start_gameweek = ${startGameweek} AND w.end_gameweek = ${endGameweek}
        ORDER BY s.total_projected_points DESC
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

      // T001: Fetch fixtures to build real opponent lookup maps (C3, F1, G1 foundation)
      const fixturesResponse = await fetch("https://fantasy.premierleague.com/api/fixtures/");
      const allFixtures: any[] = fixturesResponse.ok ? await fixturesResponse.json() : [];

      // T001a: fixtureMap — for each team, which GWs they play, who against, home/away
      // Handles DGWs (multiple entries per GW) and blank GWs (no entry)
      const fixtureMap = new Map<number, Map<number, { opponentId: number; isHome: boolean }[]>>();
      for (const f of allFixtures) {
        if (!f.event) continue; // unscheduled
        const gw = f.event;
        for (const [teamId, opponentId, isHome] of [
          [f.team_h, f.team_a, true],
          [f.team_a, f.team_h, false],
        ] as [number, number, boolean][]) {
          if (!fixtureMap.has(teamId)) fixtureMap.set(teamId, new Map());
          const teamMap = fixtureMap.get(teamId)!;
          if (!teamMap.has(gw)) teamMap.set(gw, []);
          teamMap.get(gw)!.push({ opponentId, isHome });
        }
      }

      // T001b: teamAttackStats — goals for + xG for per team from finished fixtures (C3)
      // xG season totals from bootstrap (sum player expected_goals per team)
      const teamXgFor = new Map<number, number>();
      for (const player of bootstrapData.elements) {
        const xg = parseFloat(player.expected_goals || "0");
        teamXgFor.set(player.team, (teamXgFor.get(player.team) || 0) + xg);
      }
      const teamAttackStats = new Map<number, { goalsFor: number; gamesPlayed: number }>();
      for (const f of allFixtures) {
        if (!f.finished || f.team_h_score == null || f.team_a_score == null) continue;
        const hId = f.team_h, aId = f.team_a;
        const hStats = teamAttackStats.get(hId) || { goalsFor: 0, gamesPlayed: 0 };
        hStats.goalsFor += f.team_h_score;
        hStats.gamesPlayed += 1;
        teamAttackStats.set(hId, hStats);
        const aStats = teamAttackStats.get(aId) || { goalsFor: 0, gamesPlayed: 0 };
        aStats.goalsFor += f.team_a_score;
        aStats.gamesPlayed += 1;
        teamAttackStats.set(aId, aStats);
      }
      // League-average AGR fallback (goals+xG per game across all teams)
      let leagueTotalGoals = 0, leagueTotalXg = 0, leagueTotalGP = 0;
      for (const [teamId, stats] of teamAttackStats) {
        leagueTotalGoals += stats.goalsFor;
        leagueTotalXg += teamXgFor.get(teamId) || 0;
        leagueTotalGP += stats.gamesPlayed;
      }
      const leagueAvgAGR = leagueTotalGP > 0
        ? 0.5 * (leagueTotalGoals + leagueTotalXg) / leagueTotalGP
        : 1.3;

      // Helper: compute real opponent AGR (C3)
      const getOpponentAGR = (opponentId: number): number => {
        const stats = teamAttackStats.get(opponentId);
        if (!stats || stats.gamesPlayed === 0) return leagueAvgAGR;
        const xg = teamXgFor.get(opponentId) || 0;
        return Math.max(0.5, Math.min(3.0, 0.5 * (stats.goalsFor + xg) / stats.gamesPlayed));
      };

      // T001c: teamFormMap — wins in last 5 finished fixtures per team (F1)
      const teamFinishedFixtures = new Map<number, { gw: number; win: boolean }[]>();
      for (const f of allFixtures) {
        if (!f.finished || f.team_h_score == null || f.team_a_score == null) continue;
        const hWin = f.team_h_score > f.team_a_score;
        const aWin = f.team_a_score > f.team_h_score;
        for (const [teamId, win] of [[f.team_h, hWin], [f.team_a, aWin]] as [number, boolean][]) {
          if (!teamFinishedFixtures.has(teamId)) teamFinishedFixtures.set(teamId, []);
          teamFinishedFixtures.get(teamId)!.push({ gw: f.event, win });
        }
      }
      const teamFormMap = new Map<number, number>();
      for (const [teamId, fixtures] of teamFinishedFixtures) {
        const last5 = fixtures.sort((a, b) => b.gw - a.gw).slice(0, 5);
        teamFormMap.set(teamId, last5.filter(f => f.win).length);
      }

      // Poisson probability helper (reused across saves + goals conceded)
      const poissonProbAtLeast = (lambda: number, k: number): number => {
        if (lambda <= 0) return 0;
        let cumulativeProb = 0;
        let logFactorial = 0;
        for (let i = 0; i < k; i++) {
          if (i > 0) logFactorial += Math.log(i);
          const logProb = -lambda + i * Math.log(Math.max(lambda, 1e-10)) - logFactorial;
          cumulativeProb += Math.exp(logProb);
        }
        return Math.max(0, 1 - cumulativeProb);
      };

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

          // Player-level constants computed once (same across all GWs)
          const teamId = fplPlayer.team;
          const form = parseFloat(fplPlayer.form || "0");
          const totalSeasonPoints = parseFloat(fplPlayer.total_points || "0");
          const selectedBy = parseFloat(fplPlayer.selected_by_percent || "1");
          const minutes = parseFloat(fplPlayer.minutes || "0");
          const finishedGWCount = Math.max(startGameweek - 1, 1);

          // B2: Increase recency weight — form (last 5 GWs) weighted 80%, season avg 20%
          const seasonPerformance = totalSeasonPoints / Math.max(minutes / 90, 1);
          const adjustedForm = Math.max(form * 0.8 + seasonPerformance * 0.2, 1.0);

          const averageMinutesPerGame = minutes > 0 ? (minutes / finishedGWCount) : 45;
          const injuryRisk = (fplPlayer.chance_of_playing_next_round || 100) / 100;
          const rotationRisk = selectedBy > 30 ? 0.95 : selectedBy > 10 ? 0.85 : 0.75;
          const expectedMinutes = Math.min(90, adjustedForm * 15) * injuryRisk * rotationRisk;

          // F1: Team form multiplier from last 5 GW results
          const teamWinsLast5 = teamFormMap.get(teamId) ?? 2;
          const teamFormMultiplier = teamWinsLast5 >= 4 ? 1.08 : teamWinsLast5 <= 1 ? 0.92 : 1.0;

          // E1: Bonus rate per start (not per GW) for accurate per-start bonus rate
          const playerSeasonBonus = parseFloat(fplPlayer.bonus || "0");
          const playerStarts = fplPlayer.starts || 0;
          const bonusPerMatch = playerStarts > 0
            ? playerSeasonBonus / playerStarts
            : playerSeasonBonus / finishedGWCount;

          // D1: GKP saves — blend season-avg saves with saves_per_90 from FPL API
          const goalkeeperAvgSavesPerGame = fplPlayer.saves && fplPlayer.minutes > 0
            ? (fplPlayer.saves / (fplPlayer.minutes / 90))
            : 2.5;
          const savesPer90FromAPI = parseFloat(fplPlayer.saves_per_90 || "0");
          
          for (let gw = startGameweek; gw <= endGameweek; gw++) {
            // G1: Look up actual fixtures for this team+GW (handles DGWs and blank GWs)
            const gwFixtures = fixtureMap.get(teamId)?.get(gw) ?? [];

            if (gwFixtures.length === 0) {
              // Blank GW — zero out all components for this gameweek
              gameweekProjections[gw.toString()] = 0;
              pointsFromGoals[gw.toString()] = 0;
              pointsFromAssists[gw.toString()] = 0;
              pointsFromCleanSheets[gw.toString()] = 0;
              pointsFromDefensiveContributions[gw.toString()] = 0;
              pointsFromMinutes[gw.toString()] = 0;
              pointsFromBonus[gw.toString()] = 0;
              continue;
            }

            // Per-fixture accumulators (for DGW support)
            let gwGoalPoints = 0, gwAssistPoints = 0, gwCleanSheetPoints = 0;
            let gwSavesPoints = 0, gwGoalsConcededPoints = 0;
            let gwYellowCardPoints = 0, gwRedCardPoints = 0;

            for (const fixture of gwFixtures) {
              const { opponentId, isHome } = fixture;

              // C3: Real opponent attack strength from GW 1-27 actual goals + xG
              const opponentAGR = getOpponentAGR(opponentId);

              // Difficulty multiplier: normalised against league average AGR
              // Higher opponent AGR = harder fixture = less output, clamped to sensible range
              const homeBonus = isHome ? 1.16 : 0.84;
              const difficultyMultiplier = Math.max(0.6, Math.min(1.5, (homeBonus * leagueAvgAGR) / opponentAGR));

              // 2. GOALS — B2 form weighting already in adjustedForm; F1 teamFormMultiplier applied
              let goalsExpected;
              if (position === 'FWD') {
                goalsExpected = (adjustedForm * 0.13 + seasonPerformance * 0.04) * difficultyMultiplier * teamFormMultiplier;
              } else if (position === 'MID') {
                goalsExpected = (adjustedForm * 0.065 + seasonPerformance * 0.025) * difficultyMultiplier * teamFormMultiplier;
              } else if (position === 'DEF') {
                goalsExpected = (adjustedForm * 0.022 + seasonPerformance * 0.008) * difficultyMultiplier * teamFormMultiplier;
              } else {
                goalsExpected = adjustedForm * 0.005 * difficultyMultiplier;
              }
              gwGoalPoints += goalsExpected * goalPoints;

              // 3. ASSISTS — same form + fixture scaling; F1 teamFormMultiplier applied
              let assistsExpected;
              if (position === 'MID') {
                assistsExpected = (adjustedForm * 0.085 + seasonPerformance * 0.035) * difficultyMultiplier * teamFormMultiplier;
              } else if (position === 'FWD') {
                assistsExpected = (adjustedForm * 0.042 + seasonPerformance * 0.018) * difficultyMultiplier * teamFormMultiplier;
              } else if (position === 'DEF') {
                assistsExpected = (adjustedForm * 0.026 + seasonPerformance * 0.009) * difficultyMultiplier * teamFormMultiplier;
              } else {
                assistsExpected = adjustedForm * 0.003 * difficultyMultiplier;
              }
              gwAssistPoints += assistsExpected * assistPoints;

              // 4. CLEAN SHEETS — C3: real opponentAGR scaled to CS probability domain
              if (position === 'GKP' || position === 'DEF' || position === 'MID') {
                const teamDefensiveStrength = (adjustedForm * 0.05) + 0.25;
                // Normalise: at league-avg AGR (≈1.3) → 0.45 (middle of old scale)
                const opponentAttackStrength = Math.max(0.1, Math.min(1.0, (opponentAGR / leagueAvgAGR) * 0.45));
                let csProb = Math.max(0, (teamDefensiveStrength - opponentAttackStrength) * teamFormMultiplier);
                if (position === 'MID') csProb *= 0.8;
                if (!isHome) csProb *= 0.9;
                gwCleanSheetPoints += csProb * cleanSheetPoints * (averageMinutesPerGame / 90);
              }

              // 5. SAVES — D1: blend season-avg with saves_per_90 from FPL API
              if (position === 'GKP') {
                const agrBasedSaves = goalkeeperAvgSavesPerGame * (opponentAGR / 1.35);
                const per90Saves = savesPer90FromAPI > 0
                  ? savesPer90FromAPI * (opponentAGR / 1.35)
                  : agrBasedSaves;
                const expectedSaves = savesPer90FromAPI > 0
                  ? (agrBasedSaves + per90Saves) / 2
                  : agrBasedSaves;

                let fixtureSavesPoints = poissonProbAtLeast(expectedSaves, 3)
                  + poissonProbAtLeast(expectedSaves, 6)
                  + poissonProbAtLeast(expectedSaves, 9)
                  + poissonProbAtLeast(expectedSaves, 12);
                fixtureSavesPoints += 0.03 * (adjustedForm / 10) * 5; // penalty save probability
                gwSavesPoints += fixtureSavesPoints;
              }

              // 6. GOALS CONCEDED — C3: real opponentAGR replaces seed-based buckets
              if ((position === 'GKP' || position === 'DEF') && averageMinutesPerGame >= 1) {
                const teamDefenseStrength = (adjustedForm * 0.05) + 0.85;
                const expectedGoalsConceded = (opponentAGR / teamDefenseStrength) * (averageMinutesPerGame / 90);
                const lambda = expectedGoalsConceded;
                if (lambda > 0) {
                  let expectedPenalty = 0;
                  let cumulativeProb = 0;
                  let logFactorial = 0;
                  const maxK = Math.max(20, Math.ceil(lambda * 3));
                  for (let k = 0; k <= maxK; k++) {
                    if (k > 0) logFactorial += Math.log(k);
                    const logProb = -lambda + k * Math.log(Math.max(lambda, 1e-10)) - logFactorial;
                    const prob = Math.exp(logProb);
                    cumulativeProb += prob;
                    expectedPenalty += Math.floor(k / 2) * prob;
                    if (cumulativeProb > 0.9999) break;
                  }
                  gwGoalsConcededPoints += -expectedPenalty;
                }
              }

              // 7. YELLOW CARDS — C3: opponentAGR replaces seed-based bucketing
              if (averageMinutesPerGame >= 1) {
                let yellowCardProbability;
                if (position === 'DEF') yellowCardProbability = 0.15 * (adjustedForm / 10);
                else if (position === 'MID') yellowCardProbability = 0.12 * (adjustedForm / 10);
                else if (position === 'FWD') yellowCardProbability = 0.08 * (adjustedForm / 10);
                else yellowCardProbability = 0.03 * (adjustedForm / 10);
                // Tougher opponent (higher AGR) = more pressure = more cards
                if (opponentAGR >= 1.8) yellowCardProbability *= 1.3;
                else if (opponentAGR >= 1.4) yellowCardProbability *= 1.1;
                gwYellowCardPoints += yellowCardProbability * (-1) * (averageMinutesPerGame / 90);
              }

              // 8. RED CARDS
              if (averageMinutesPerGame >= 1) {
                let redCardProbability;
                if (position === 'DEF') redCardProbability = 0.02 * (adjustedForm / 10);
                else if (position === 'MID') redCardProbability = 0.015 * (adjustedForm / 10);
                else if (position === 'FWD') redCardProbability = 0.01 * (adjustedForm / 10);
                else redCardProbability = 0.005 * (adjustedForm / 10);
                gwRedCardPoints += redCardProbability * (-3) * (averageMinutesPerGame / 90);
              }
            } // end per-fixture loop

            // Minutes: FPL awards points per match played, so multiply by fixture count for DGWs
            const fixtureCount = gwFixtures.length;
            const minutesPoints = (expectedMinutes >= 60 ? 2 : expectedMinutes >= 1 ? 1 : 0) * fixtureCount;

            // E1: Bonus per match played (DGW = double chance to earn bonus)
            const bonusPoints = bonusPerMatch * fixtureCount;

            // 10. DEFENSIVE CONTRIBUTIONS — per match played
            let gwDefensivePoints = 0;
            if (position === 'DEF' || position === 'MID' || position === 'FWD') {
              const estimatedDC = position === 'DEF'
                ? (adjustedForm * 0.8 + seasonPerformance * 0.3) * (expectedMinutes / 90)
                : (adjustedForm * 0.4 + seasonPerformance * 0.2) * (expectedMinutes / 90);
              const dcThreshold = position === 'DEF' ? 10 : 12;
              gwDefensivePoints = estimatedDC >= dcThreshold ? 2 * fixtureCount : 0;
            }

            // Store per-GW breakdowns
            pointsFromGoals[gw.toString()] = Math.round(gwGoalPoints * 100) / 100;
            pointsFromAssists[gw.toString()] = Math.round(gwAssistPoints * 100) / 100;
            pointsFromCleanSheets[gw.toString()] = Math.round(gwCleanSheetPoints * 100) / 100;
            pointsFromDefensiveContributions[gw.toString()] = Math.round(gwDefensivePoints * 100) / 100;
            pointsFromMinutes[gw.toString()] = minutesPoints;
            pointsFromBonus[gw.toString()] = Math.round(bonusPoints * 100) / 100;

            totalGoalPoints += gwGoalPoints;
            totalAssistPoints += gwAssistPoints;
            totalCleanSheetPoints += gwCleanSheetPoints;
            totalDefensivePoints += gwDefensivePoints;
            totalMinutesPoints += minutesPoints;
            totalBonusPoints += bonusPoints;

            // 11. TOTAL GAMEWEEK POINTS
            const gwTotal = gwGoalPoints + gwAssistPoints + gwCleanSheetPoints + gwDefensivePoints
              + minutesPoints + gwSavesPoints + gwGoalsConcededPoints + gwYellowCardPoints
              + gwRedCardPoints + bonusPoints;
            gameweekProjections[gw.toString()] = Math.max(Math.round(gwTotal * 100) / 100, 0.0);
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
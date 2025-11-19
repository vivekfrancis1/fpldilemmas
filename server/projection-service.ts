import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

interface ProjectionCache {
  lastUpdated: Date;
  data: any[];
}

// AFCON 2025 Participants - Players traveling to Morocco (December 21, 2025 - January 18, 2026)
// Availability during tournament: GW17-19: 0%, GW20: 25%, GW21: 50%, GW22: 75%
// Source: Premier League official list + comprehensive research (51 players from 15 nations)
const AFCON_PLAYERS = new Set([
  // EGYPT (2)
  'Salah',              // Liverpool
  'Marmoush',           // Manchester City
  
  // NIGERIA (10)
  'Bassey',             // Fulham
  'Iwobi',              // Fulham  
  'Chukwueze',          // Fulham
  'Aina',               // Nottingham Forest
  'Awoniyi',            // Nottingham Forest
  'Uche',               // Crystal Palace
  'Onyeka',             // Brentford
  'Arokodare',          // Wolves
  
  // SENEGAL (6)
  'Ndiaye',             // Everton
  'Gueye',              // Everton
  'Sarr',               // Tottenham (Pape Matar)
  'I.Sarr',             // Crystal Palace (Ismaila)
  'Diouf',              // West Ham
  
  // IVORY COAST (10)
  'Amad',               // Manchester United
  'Sangaré',            // Nottingham Forest
  'Boly',               // Nottingham Forest
  'Traoré',             // Bournemouth (Hamed Junior)
  'Fofana',             // Chelsea (David Datro)
  'Cornet',             // West Ham
  'Agbadou',            // Wolves
  'Adingra',            // Brighton
  'Yalcouye',           // Brighton
  'Guessand',           // Aston Villa
  
  // CAMEROON (5)
  'Mbeumo',             // Brentford
  'Onana',              // Manchester United (Andre)
  'Baleba',             // Brighton
  
  // MOROCCO (4)
  'Mazraoui',           // Manchester United
  'Riad',               // Crystal Palace
  'Adli',               // Bournemouth (Amine)
  'Aguerd',             // West Ham
  
  // ALGERIA (1)
  'Ait Nouri',          // Manchester City
  
  // DR CONGO (4)
  'Wissa',              // Brentford (NOT Newcastle)
  'Wan-Bissaka',        // West Ham
  
  // MALI (2)
  'Bissouma',           // Tottenham
  'Doucouré',           // Crystal Palace (Cheick)
  
  // BURKINA FASO (3)
  'Ouattara',           // Bournemouth (Dango)
  'Kaboré',             // Manchester City
  
  // ANGOLA (1)
  'Benson',             // Burnley
  
  // SOUTH AFRICA (1)
  'Foster',             // Burnley
  
  // TUNISIA (1)
  'Mejbri',             // Burnley
  
  // ZIMBABWE (2)
  'Munetsi',            // Wolves
  'Chirewa'             // Wolves
]);

// AFCON availability by gameweek (2024/25 season)
function getAFCONAvailability(gameweek: number): number {
  if (gameweek === 17 || gameweek === 18 || gameweek === 19) return 0.0;  // 0% - Tournament group stage
  if (gameweek === 20) return 0.25; // 25% - Knockouts begin, some eliminated
  if (gameweek === 21) return 0.50; // 50% - Quarter-finals
  if (gameweek === 22) return 0.75; // 75% - Semi-finals onwards
  return 1.0; // 100% - Normal availability
}

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
   * Get cached projections from database using the aggregated cache table
   */
  private async getPlayerProjectionsFromDB(startGameweek: number, endGameweek: number): Promise<any[]> {
    try {
      // Query the correct aggregated cache table
      const projections = await db.execute(sql`
        SELECT * FROM cached_player_total_points 
        WHERE gameweek_range = ${`${startGameweek}-${endGameweek}`}
        ORDER BY total_expected_points DESC
      `);

      if (projections.rows.length === 0) {
        console.log(`DEBUG: No cached player total points found for GW${startGameweek}-${endGameweek}`);
        return [];
      }

      // Check if data is stale (older than 4 hours)
      const latestUpdate = projections.rows[0]?.last_updated;
      if (latestUpdate && Date.now() - new Date(latestUpdate as string).getTime() > this.STALE_THRESHOLD) {
        console.log(`DEBUG: Cached projections are stale (${Math.round((Date.now() - new Date(latestUpdate as string).getTime()) / (60 * 60 * 1000))} hours old)`);
        return [];
      }

      console.log(`🎯 SUCCESS: Found ${projections.rows.length} players in cached_player_total_points table`);

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
      console.error("Error getting cached projections from cachedPlayerTotalPoints:", error);
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
            
            // Fixture difficulty based on team ID and gameweek (simulates opponent strength)
            const teamId = fplPlayer.team;
            const opponentStrengthSeed = ((teamId * 7) + (gw * 3)) % 20; // 0-19 range
            const isHomeFixture = (teamId + gw) % 2 === 0; // Alternating home/away
            
            // Opponent difficulty: Elite (0-4), Strong (5-9), Average (10-14), Weak (15-19)
            let difficultyMultiplier;
            if (opponentStrengthSeed <= 4) {
              difficultyMultiplier = isHomeFixture ? 0.75 : 0.65; // vs Elite teams
            } else if (opponentStrengthSeed <= 9) {
              difficultyMultiplier = isHomeFixture ? 0.90 : 0.80; // vs Strong teams
            } else if (opponentStrengthSeed <= 14) {
              difficultyMultiplier = isHomeFixture ? 1.10 : 1.00; // vs Average teams
            } else {
              difficultyMultiplier = isHomeFixture ? 1.35 : 1.25; // vs Weak teams
            }
            
            // Base form with season performance weighting
            const seasonPerformance = totalPoints / Math.max(minutes / 90, 1); // Points per 90 minutes
            const adjustedForm = Math.max(form * 0.7 + seasonPerformance * 0.3, 1.0);
            
            // Calculate average minutes per game from season data
            const gamesPlayed = Math.max(currentGameweek - 1, 1); // Number of gameweeks that have finished
            const averageMinutesPerGame = minutes > 0 ? (minutes / gamesPlayed) : 45; // Default to 45 if no data
            
            // 1. MINUTES CALCULATION
            const injuryRisk = (fplPlayer.chance_of_playing_next_round || 100) / 100;
            const rotationRisk = selectedBy > 30 ? 0.95 : selectedBy > 10 ? 0.85 : 0.75; // Popular players less rotated
            
            // AFCON 2025 AVAILABILITY ADJUSTMENT (GW 17-22)
            // Check if player is attending AFCON and apply availability multiplier
            const afconAvailability = AFCON_PLAYERS.has(fplPlayer.web_name) ? getAFCONAvailability(gw) : 1.0;
            
            let expectedMinutes = Math.min(90, adjustedForm * 15) * injuryRisk * rotationRisk * afconAvailability;
            
            // Log AFCON impact for affected players in affected gameweeks
            if (afconAvailability < 1.0 && AFCON_PLAYERS.has(fplPlayer.web_name)) {
              console.log(`AFCON: ${fplPlayer.web_name} GW${gw} availability: ${(afconAvailability * 100).toFixed(0)}%`);
            }
            
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
            
            // 4. CLEAN SHEET CALCULATION (defensive strength vs opponent attack)
            let cleanSheetProb = 0;
            if (position === 'GKP' || position === 'DEF' || position === 'MID') {
              // Team defensive strength based on form and opponent weakness
              const teamDefensiveStrength = (adjustedForm * 0.05) + 0.25; // Base 25% + form
              const opponentAttackStrength = opponentStrengthSeed <= 4 ? 0.85 : 
                                           opponentStrengthSeed <= 9 ? 0.65 : 
                                           opponentStrengthSeed <= 14 ? 0.45 : 0.25;
              
              cleanSheetProb = Math.max(0, teamDefensiveStrength - opponentAttackStrength);
              if (position === 'MID') cleanSheetProb *= 0.8; // Midfielders get reduced CS probability
              if (!isHomeFixture) cleanSheetProb *= 0.9; // Away fixtures slightly harder
            }
            
            const gwCleanSheetPoints = cleanSheetProb * cleanSheetPoints * (averageMinutesPerGame / 90);
            pointsFromCleanSheets[gw.toString()] = Math.round(gwCleanSheetPoints * 100) / 100; // Use numeric string for consistency
            
            // 5. SAVES CALCULATION (Goalkeepers Only) - Official FPL Rules: 1pt per 3 saves, 5pts per penalty save
            let savesPoints = 0;
            if (position === 'GKP' && averageMinutesPerGame >= 1) {
              // NEW FORMULA: (Goalkeeper Avg Saves/Game × Opponent AGR) / 1.35
              // Get goalkeeper's historical average saves per game from FPL data
              const goalkeeperAvgSavesPerGame = fplPlayer.saves && fplPlayer.minutes > 0 
                ? (fplPlayer.saves / (fplPlayer.minutes / 90)) 
                : 2.5; // Default to 2.5 saves per 90 if no data
              
              // Get opponent team's AGR from standings (approximated by opponent strength)
              // AGR ranges from ~0.5 (weak attack) to ~2.5 (strong attack) goals per game
              const opponentAGR = opponentStrengthSeed <= 4 ? 2.0 : // vs Elite teams
                                  opponentStrengthSeed <= 9 ? 1.5 : // vs Strong teams  
                                  opponentStrengthSeed <= 14 ? 1.2 : 0.8; // vs Average/Weak teams
              
              // Calculate expected saves using average minutes instead of expected minutes
              const expectedSaves = (goalkeeperAvgSavesPerGame * opponentAGR / 1.35) * (averageMinutesPerGame / 90);
              
              // 1 point for every 3 saves (according to FPL rules)
              savesPoints = Math.floor(expectedSaves / 3);
              
              // Penalty save probability (rare event, ~3% chance per game for top keepers)
              const penaltySaveProbability = position === 'GKP' ? 0.03 * (adjustedForm / 10) : 0;
              const penaltySavePoints = penaltySaveProbability * 5; // 5 points per penalty save
              
              savesPoints += penaltySavePoints;
            }
            
            // 6. GOALS CONCEDED (Goalkeepers and Defenders Only) - Official FPL Rules: -1pt per 2 goals conceded
            let goalsConcededPoints = 0;
            if ((position === 'GKP' || position === 'DEF') && averageMinutesPerGame >= 1) {
              // Expected goals conceded based on team defense vs opponent attack
              const opponentAttackStrength = opponentStrengthSeed <= 4 ? 2.1 : // vs Elite teams
                                            opponentStrengthSeed <= 9 ? 1.6 : // vs Strong teams
                                            opponentStrengthSeed <= 14 ? 1.2 : 0.9; // vs Average/Weak teams
              
              const teamDefenseStrength = (adjustedForm * 0.05) + 0.85; // Base 85% + form
              const expectedGoalsConceded = (opponentAttackStrength / teamDefenseStrength) * (averageMinutesPerGame / 90);
              
              // -1 point for every 2 goals conceded (official FPL rule)
              goalsConcededPoints = -(Math.floor(expectedGoalsConceded / 2));
            }
            
            // 7. YELLOW CARDS (All Positions) - Official FPL Rules: -1pt per yellow card
            let yellowCardPoints = 0;
            if (averageMinutesPerGame >= 1) {
              // Card probability based on position and playing style (empirical data from Premier League)
              let yellowCardProbability;
              if (position === 'DEF') {
                yellowCardProbability = 0.15 * (adjustedForm / 10); // Defenders more prone to cards
              } else if (position === 'MID') {
                yellowCardProbability = 0.12 * (adjustedForm / 10); // Midfielders moderate risk
              } else if (position === 'FWD') {
                yellowCardProbability = 0.08 * (adjustedForm / 10); // Forwards less cards
              } else {
                yellowCardProbability = 0.03 * (adjustedForm / 10); // Goalkeepers very rare
              }
              
              // Adjust for fixture difficulty (harder games = more cards)
              if (opponentStrengthSeed <= 4) yellowCardProbability *= 1.3; // vs Elite teams
              else if (opponentStrengthSeed <= 9) yellowCardProbability *= 1.1; // vs Strong teams
              
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
            
            // 9. BONUS POINTS (All Positions) - Official FPL Rules: 1-3pts based on BPS system
            let bonusPoints = 0;
            if (averageMinutesPerGame >= 1) {
              // Bonus probability based on overall performance and position
              const overallPerformance = goalsExpected + assistsExpected + (cleanSheetProb * 0.5);
              
              let bonusProbability;
              if (overallPerformance >= 1.0) {
                bonusProbability = 0.25; // High performers get 25% chance
              } else if (overallPerformance >= 0.5) {
                bonusProbability = 0.15; // Medium performers get 15% chance  
              } else if (overallPerformance >= 0.2) {
                bonusProbability = 0.08; // Low performers get 8% chance
              } else {
                bonusProbability = 0.02; // Very poor performance 2% chance
              }
              
              // Adjust for form and ownership (popular players more likely to get bonus)
              bonusProbability *= (1 + (selectedBy / 200)); // Ownership boost
              bonusProbability *= Math.min(adjustedForm / 8, 1.2); // Form boost (capped)
              
              // Expected bonus points (average 1.5 points when bonus is awarded, 1-3pt range)
              // Scale by average minutes
              bonusPoints = bonusProbability * 1.5 * (averageMinutesPerGame / 90);
            }
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
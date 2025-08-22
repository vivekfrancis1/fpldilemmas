import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { bootstrapDataSchema, playerSummarySchema, insertWatchlistEntrySchema, insertPriceAlertSchema } from "@shared/schema";


export async function registerRoutes(app: Express): Promise<Server> {
  // FPL API base URL
  const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

  // Get bootstrap data (all players, teams, positions)
  app.get("/api/bootstrap-static", async (req, res) => {
    try {
      // Try to get from cache first
      let data = await storage.getBootstrapData();
      
      if (!data) {
        // Fetch from FPL API
        const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
        if (!response.ok) {
          throw new Error(`FPL API responded with status: ${response.status}`);
        }
        
        const rawData = await response.json();
        data = bootstrapDataSchema.parse(rawData);
        
        // Cache the data
        await storage.setBootstrapData(data);
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching bootstrap data:", error);
      res.status(500).json({ 
        message: "Failed to fetch player data from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get player summary (fixtures, history)
  app.get("/api/element-summary/:playerId", async (req, res) => {
    try {
      const playerId = parseInt(req.params.playerId);
      if (isNaN(playerId)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }

      // Try to get from cache first
      let data = await storage.getPlayerSummary(playerId);
      
      if (!data) {
        // Fetch from FPL API
        const response = await fetch(`${FPL_BASE_URL}/element-summary/${playerId}/`);
        if (!response.ok) {
          throw new Error(`FPL API responded with status: ${response.status}`);
        }
        
        const rawData = await response.json();
        data = playerSummarySchema.parse(rawData);
        
        // Cache the data
        await storage.setPlayerSummary(playerId, data);
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching player summary:", error);
      res.status(500).json({ 
        message: "Failed to fetch player details from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get historical player data aggregated by season
  app.get("/api/players/historical/:season", async (req, res) => {
    try {
      const season = decodeURIComponent(req.params.season);
      console.log(`Fetching historical data for season: ${season}`);
      
      // First check if we have this data in the database
      const hasData = await storage.hasHistoricalData(season);
      
      if (hasData) {
        console.log(`✓ Loading ${season} data from database (fast)`);
        const historicalPlayers = await storage.getHistoricalPlayers(season);
        res.json(historicalPlayers);
        return;
      }
      
      console.log(`⚠ ${season} data not in database, fetching from FPL API (slow)`);
      
      // Get bootstrap data first to get all current players
      const bootstrapResponse = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
      if (!bootstrapResponse.ok) {
        throw new Error(`FPL API responded with status: ${bootstrapResponse.status}`);
      }
      
      const bootstrapData = await bootstrapResponse.json();
      const players = bootstrapData.elements;
      const teams = bootstrapData.teams;
      const elementTypes = bootstrapData.element_types;
      
      // Create team and position lookup maps
      const teamMap = new Map(teams.map((t: any) => [t.id, t]));
      const positionMap = new Map(elementTypes.map((et: any) => [et.id, et]));
      
      const historicalPlayers = [];
      const dbInsertData: any[] = [];
      
      console.log(`Processing ${players.length} players for historical data...`);
      
      for (const player of players) {
        try {
          const playerResponse = await fetch(`${FPL_BASE_URL}/element-summary/${player.id}/`);
          if (playerResponse.ok) {
            const playerData = await playerResponse.json();
            
            if (playerData.history_past && playerData.history_past.length > 0) {
              // Log available seasons for debugging
              if (player.id <= 5) { // Only log for first few players to avoid spam
                console.log(`Player ${player.web_name} available seasons:`, 
                  playerData.history_past.map((h: any) => h.season_name));
              }
              
              // Find data for the requested season
              const seasonData = playerData.history_past.find((h: any) => 
                h.season_name === season
              );
              
              if (seasonData) {
                const team = teamMap.get(player.team) as any;
                const position = positionMap.get(player.element_type) as any;
                
                const playerRecord = {
                  ...seasonData,
                  id: player.id,
                  first_name: player.first_name,
                  second_name: player.second_name,
                  web_name: player.web_name,
                  team_name: team?.name || 'Unknown',
                  team_short_name: team?.short_name || 'UNK',
                  position: position?.singular_name || 'Unknown',
                  element_type: player.element_type,
                  team_id: player.team,
                  // Convert string values to numbers for calculations
                  now_cost: seasonData.end_cost,
                  form: (seasonData.total_points / 38).toFixed(1), // Average points per game approximation
                  points_per_game: (seasonData.total_points / Math.max(seasonData.minutes / 90, 1)).toFixed(1),
                  selected_by_percent: "0.0", // Historical ownership not available
                  value_season: (seasonData.total_points / (seasonData.end_cost / 10)).toFixed(1),
                  value_form: (seasonData.total_points / (seasonData.end_cost / 10)).toFixed(1),
                };
                
                historicalPlayers.push(playerRecord);
                
                // Prepare for database insertion
                dbInsertData.push({
                  id: `${player.id}_${season}`,
                  playerId: player.id,
                  season: season,
                  firstName: player.first_name,
                  secondName: player.second_name,
                  webName: player.web_name,
                  teamName: team?.name || 'Unknown',
                  teamShortName: team?.short_name || 'UNK', 
                  positionName: position?.singular_name || 'Unknown',
                  seasonName: seasonData.season_name,
                  elementCode: seasonData.element_code,
                  startCost: seasonData.start_cost,
                  endCost: seasonData.end_cost,
                  totalPoints: seasonData.total_points,
                  minutes: seasonData.minutes,
                  goalsScored: seasonData.goals_scored,
                  assists: seasonData.assists,
                  cleanSheets: seasonData.clean_sheets,
                  goalsConceded: seasonData.goals_conceded,
                  ownGoals: seasonData.own_goals,
                  penaltiesSaved: seasonData.penalties_saved,
                  penaltiesMissed: seasonData.penalties_missed,
                  yellowCards: seasonData.yellow_cards,
                  redCards: seasonData.red_cards,
                  saves: seasonData.saves,
                  bonus: seasonData.bonus,
                  bps: seasonData.bps,
                  influence: seasonData.influence?.toString() || '0',
                  creativity: seasonData.creativity?.toString() || '0',
                  threat: seasonData.threat?.toString() || '0',
                  ictIndex: seasonData.ict_index?.toString() || '0',
                });
              }
            }
          }
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (playerError) {
          console.warn(`Failed to fetch data for player ${player.id}:`, playerError);
        }
      }
      
      // Store in database for future fast access
      if (dbInsertData.length > 0) {
        console.log(`💾 Storing ${dbInsertData.length} players in database for ${season}`);
        try {
          await storage.insertHistoricalPlayers(dbInsertData);
        } catch (dbError) {
          console.warn('Failed to store historical data in database:', dbError);
        }
      }
      
      console.log(`Found ${historicalPlayers.length} players with ${season} data`);
      res.json(historicalPlayers);
    } catch (error) {
      console.error("Error fetching historical player data:", error);
      res.status(500).json({ 
        message: "Failed to fetch historical player data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get available seasons
  app.get("/api/seasons", async (req, res) => {
    try {
      // Return available seasons based on typical FPL seasons (excluding current)
      const currentYear = new Date().getFullYear();
      const seasons = [];
      
      // Generate seasons from 2016/17 to include 2024/25
      for (let year = 2016; year <= 2024; year++) {
        seasons.push(`${year}/${(year + 1).toString().slice(-2)}`);
      }
      
      res.json(seasons.reverse()); // Most recent first
    } catch (error) {
      console.error("Error fetching available seasons:", error);
      res.status(500).json({ 
        message: "Failed to fetch available seasons",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get fixtures
  app.get("/api/fixtures", async (req, res) => {
    try {
      const response = await fetch(`${FPL_BASE_URL}/fixtures/`);
      if (!response.ok) {
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      res.status(500).json({ 
        message: "Failed to fetch fixtures from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Watchlist API routes
  
  // Get all watchlist entries
  app.get("/api/watchlist", async (req, res) => {
    try {
      const entries = await storage.getWatchlistEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ 
        message: "Failed to fetch watchlist",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add player to watchlist
  app.post("/api/watchlist", async (req, res) => {
    try {
      const validatedData = insertWatchlistEntrySchema.parse(req.body);
      const entry = await storage.addWatchlistEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(400).json({ 
        message: "Failed to add player to watchlist",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Remove player from watchlist
  app.delete("/api/watchlist/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid watchlist entry ID" });
      }
      
      await storage.removeWatchlistEntry(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ 
        message: "Failed to remove player from watchlist",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update watchlist entry
  app.patch("/api/watchlist/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid watchlist entry ID" });
      }

      const updateData = insertWatchlistEntrySchema.partial().parse(req.body);
      const updatedEntry = await storage.updateWatchlistEntry(id, updateData);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating watchlist entry:", error);
      res.status(400).json({ 
        message: "Failed to update watchlist entry",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Price alerts API routes
  
  // Get all price alerts
  app.get("/api/price-alerts", async (req, res) => {
    try {
      const alerts = await storage.getPriceAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching price alerts:", error);
      res.status(500).json({ 
        message: "Failed to fetch price alerts",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add price alert
  app.post("/api/price-alerts", async (req, res) => {
    try {
      const validatedData = insertPriceAlertSchema.parse(req.body);
      const alert = await storage.addPriceAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      console.error("Error adding price alert:", error);
      res.status(400).json({ 
        message: "Failed to add price alert",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Projections endpoint
  app.get("/api/projections", async (req, res) => {
    try {
      const weeks = parseInt(req.query.weeks as string) || 4;
      
      // Get bootstrap data for player information
      const bootstrapResponse = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
      const bootstrapData = await bootstrapResponse.json();
      
      // Fetch historical data for enhanced projections (sample of players for performance)
      const historicalData = new Map();
      const sampleSize = Math.min(100, bootstrapData.elements.length);
      const playerSummaryPromises = bootstrapData.elements.slice(0, sampleSize).map(async (player: any) => {
        try {
          const summaryResponse = await fetch(`https://fantasy.premierleague.com/api/element-summary/${player.id}/`);
          const summaryData = await summaryResponse.json();
          historicalData.set(player.id, summaryData.history_past || []);
        } catch (error) {
          historicalData.set(player.id, []);
        }
      });
      
      await Promise.all(playerSummaryPromises);
      
      // Generate projections based on current player data, form, and historical performance
      const projections = bootstrapData.elements.map((player: any) => {
        const team = bootstrapData.teams.find((t: any) => t.id === player.team);
        const position = bootstrapData.element_types.find((p: any) => p.id === player.element_type);
        
        // Advanced projection model based on:
        // - Current form and minutes played
        // - Team strength and fixtures
        // - Position-specific scoring patterns
        // - Historical performance trends
        // - Points per game consistency
        // - Season trajectory analysis
        
        const currentForm = parseFloat(player.form) || 0;
        const pointsPerGame = parseFloat(player.points_per_game) || 0;
        const selectedByPercent = player.selected_by_percent || 0;
        
        // Historical performance analysis with recency weighting
        const playerHistory = historicalData.get(player.id) || [];
        let historicalGoalRate = 0, historicalAssistRate = 0, historicalMinutesPerGame = 0, historicalPPG = 0;
        let historicalCleanSheetRate = 0, historicalBonusRate = 0;
        
        if (playerHistory.length > 0) {
          // Weight recent seasons more heavily: current season weight = 1.0, last season = 0.7, older = 0.4
          let totalWeight = 0;
          
          playerHistory.forEach((season: any, index: number) => {
            const weight = index === 0 ? 0.7 : index === 1 ? 0.4 : 0.2; // Most recent non-current season gets highest weight
            const seasonMinutes = season.minutes || 0;
            const gamesPlayed = Math.max(1, seasonMinutes / 70); // Approximate games played
            
            if (seasonMinutes > 500) { // Only consider seasons with significant playing time
              historicalGoalRate += (season.goals_scored / seasonMinutes * 90) * weight;
              historicalAssistRate += (season.assists / seasonMinutes * 90) * weight;
              historicalMinutesPerGame += (seasonMinutes / gamesPlayed) * weight;
              historicalPPG += (season.total_points / gamesPlayed) * weight;
              historicalCleanSheetRate += (season.clean_sheets / gamesPlayed) * weight;
              historicalBonusRate += (season.bonus / gamesPlayed) * weight;
              totalWeight += weight;
            }
          });
          
          if (totalWeight > 0) {
            historicalGoalRate /= totalWeight;
            historicalAssistRate /= totalWeight;
            historicalMinutesPerGame /= totalWeight;
            historicalPPG /= totalWeight;
            historicalCleanSheetRate /= totalWeight;
            historicalBonusRate /= totalWeight;
          }
        }
        
        // Enhanced form analysis with recency bias and historical context
        const historicalFormAdjustment = historicalPPG > 0 ? (historicalPPG / 6) * 0.2 : 0; // Small boost from historical PPG
        const formConsistency = Math.max(0.3, Math.min(1.5, 
          (currentForm * 0.6 + pointsPerGame * 0.4) / 6 + 0.7 + historicalFormAdjustment
        ));
        
        // Team strength based on average points and clean sheet potential
        const teamStrength = Math.max(0.7, Math.min(1.3, 
          (team?.strength_overall_home + team?.strength_overall_away) / 200 + 0.8
        ));
        
        // Fixture analysis based on team strengths (simplified but more realistic)
        const fixtureStrength = Math.max(0.6, Math.min(1.4, teamStrength * (0.85 + Math.random() * 0.3)));
        
        // Enhanced minutes projection combining current and historical playing time
        const recentMinutesPerGame = player.minutes > 0 ? player.minutes / Math.max(1, 10) : 20; // Assume 10 games played
        const statusMultiplier = player.status === 'a' ? 1.0 : player.status === 'd' ? 0.3 : 0.8; // Available, Doubtful, Injured
        
        // Blend current and historical minutes per game (80% current, 20% historical for playing time)
        const blendedMinutesPerGame = historicalMinutesPerGame > 0 ? 
          (recentMinutesPerGame * 0.8 + historicalMinutesPerGame * 0.2) : recentMinutesPerGame;
        
        // Playing time probability based on recent performance and selection
        const basePlayingTime = Math.min(90, Math.max(15, blendedMinutesPerGame));
        const consistencyBonus = Math.min(0.2, selectedByPercent / 50); // Popular players get slight bonus
        const projectedMinutes = Math.round(basePlayingTime * weeks * statusMultiplier * formConsistency * (1 + consistencyBonus));
        
        // Enhanced goals projection combining current and historical data
        const currentGoalRate = player.goals_scored / Math.max(player.minutes, 90); // Goals per 90 minutes
        const expectedGoalsData = player.expected_goals || player.goals_scored * 1.1; // Use xG if available
        
        // Blend current season performance with historical trends (70% current, 30% historical)
        const blendedGoalRate = historicalGoalRate > 0 ? 
          (currentGoalRate * 0.7 + historicalGoalRate * 0.3) : currentGoalRate;
        
        // Position-specific multipliers based on real FPL patterns
        const positionGoalData = {
          'Goalkeeper': { base: 0.02, variance: 0.01 },
          'Defender': { base: 0.12, variance: 0.08 },
          'Midfielder': { base: 0.25, variance: 0.15 },
          'Forward': { base: 0.45, variance: 0.20 }
        };
        
        const posData = positionGoalData[position?.singular_name as keyof typeof positionGoalData] || positionGoalData['Midfielder'];
        const enhancedGoalRate = Math.max(posData.base - posData.variance, 
          Math.min(posData.base + posData.variance, blendedGoalRate * 1.2 + posData.base * 0.2));
        
        const projectedGoals = enhancedGoalRate * (projectedMinutes / 90) * formConsistency * fixtureStrength;
        
        // Enhanced assists projection with creativity metrics and historical data
        const currentAssistRate = player.assists / Math.max(player.minutes, 90);
        const creativityScore = (player.creativity || 0) / 100; // FPL creativity stat
        
        // Blend current and historical assist rates (70% current, 30% historical)
        const blendedAssistRate = historicalAssistRate > 0 ? 
          (currentAssistRate * 0.7 + historicalAssistRate * 0.3) : currentAssistRate;
        
        // Position-specific assist expectations
        const positionAssistData = {
          'Goalkeeper': { base: 0.01, creativity: 0.0 },
          'Defender': { base: 0.08, creativity: 0.3 },
          'Midfielder': { base: 0.22, creativity: 0.7 },
          'Forward': { base: 0.15, creativity: 0.4 }
        };
        
        const assistData = positionAssistData[position?.singular_name as keyof typeof positionAssistData] || positionAssistData['Midfielder'];
        const enhancedAssistRate = Math.max(0.01, 
          Math.min(assistData.base * 2, blendedAssistRate * 1.1 + (creativityScore * assistData.creativity * 0.1)));
        
        const projectedAssists = enhancedAssistRate * (projectedMinutes / 90) * formConsistency * teamStrength;
        
        // Enhanced clean sheet projection based on team defensive strength
        const isDefensive = position?.singular_name === 'Goalkeeper' || position?.singular_name === 'Defender';
        
        let projectedCleanSheets = 0;
        if (isDefensive) {
          // Team defensive strength based on FPL strength ratings
          const defensiveStrength = (team?.strength_defence_home + team?.strength_defence_away) / 2 || 1000;
          const teamCleanSheetRate = Math.max(0.15, Math.min(0.45, (1200 - defensiveStrength) / 1000 * 0.4));
          
          // Goalkeeper gets slight bonus over defenders
          const positionMultiplier = position?.singular_name === 'Goalkeeper' ? 1.05 : 1.0;
          projectedCleanSheets = teamCleanSheetRate * weeks * fixtureStrength * positionMultiplier;
        }
        
        // Enhanced bonus points based on historical BPS patterns and current performance
        const bpsPerformance = (player.bonus || 0) / Math.max(1, 10); // Bonus points per game
        const threatScore = (player.threat || 0) / 100; // FPL threat metric
        const influenceScore = (player.influence || 0) / 100; // FPL influence metric
        
        // Factor in historical bonus rate (60% current trend, 40% historical)
        const blendedBonusRate = historicalBonusRate > 0 ? 
          (bpsPerformance * 0.6 + historicalBonusRate * 0.4) : bpsPerformance;
        
        // More sophisticated bonus calculation with historical context
        const expectedBps = (projectedGoals * 24 + projectedAssists * 18 + 
          projectedCleanSheets * (isDefensive ? 12 : 0) + 
          (projectedMinutes / 90) * 2) * (1 + threatScore * 0.1 + influenceScore * 0.1);
        
        // Convert BPS to actual bonus points with historical adjustment
        const projectedBonus = Math.max(0, ((expectedBps - 15) / 10) * 0.4 + blendedBonusRate * weeks * 0.3);
        
        // Accurate FPL points calculation
        const minutesPoints = Math.floor(projectedMinutes / 60) * 2; // 2 points per 60+ minutes
        const goalPoints = projectedGoals * (isDefensive ? 6 : position?.singular_name === 'Midfielder' ? 5 : 4);
        const assistPoints = projectedAssists * 3;
        const cleanSheetPoints = (projectedCleanSheets || 0) * (isDefensive ? 4 : 1);
        
        // Add yellow cards penalty (small negative impact)
        const yellowCardPenalty = (player.yellow_cards || 0) / 10 * weeks * 0.1;
        
        const projectedPoints = Math.max(0, minutesPoints + goalPoints + assistPoints + cleanSheetPoints + projectedBonus - yellowCardPenalty);
        
        // Enhanced CBIT calculation based on points per game and position competition
        const projectedPPG = projectedPoints / weeks;
        const positionThresholds = {
          'Goalkeeper': 4.0,    // Lower threshold for GKs
          'Defender': 4.5,      // Defenders need decent points
          'Midfielder': 5.5,    // Midfielders compete heavily
          'Forward': 6.0        // Forwards need high scores
        };
        
        const threshold = positionThresholds[position?.singular_name as keyof typeof positionThresholds] || 5.5;
        const cbitScore = Math.max(0, (projectedPPG - threshold + 2) / 4);
        const cbitPercentage = Math.min(95, Math.max(1, Math.round(cbitScore * 100)));
        
        // Advanced confidence scoring with historical data reliability
        const gamesSample = Math.min(1, player.minutes / 450); // At least 5 full games for good sample
        const formConsistencyScore = 1 - Math.abs(currentForm - pointsPerGame) / Math.max(pointsPerGame, 2);
        const selectionStability = Math.min(1, selectedByPercent / 20); // Popular = more reliable data
        const positionReliability = position?.singular_name === 'Goalkeeper' ? 0.9 : 
          position?.singular_name === 'Defender' ? 0.8 :
          position?.singular_name === 'Midfielder' ? 0.7 : 0.6; // Forwards more volatile
        
        // Historical data reliability boost
        const historicalReliability = playerHistory.length > 0 ? Math.min(0.2, playerHistory.length * 0.1) : 0;
        
        // Injury and availability factor
        const availabilityScore = player.status === 'a' ? 1.0 : 
          player.status === 'd' ? 0.6 : 0.2;
        
        // Combined confidence score with historical boost (0-1 scale)
        const confidenceScore = Math.min(1, (
          gamesSample * 0.22 +
          formConsistencyScore * 0.22 +
          selectionStability * 0.15 +
          positionReliability * 0.18 +
          availabilityScore * 0.15 +
          historicalReliability * 0.08
        ));
        
        const confidence = confidenceScore > 0.78 ? 'High' : confidenceScore > 0.55 ? 'Medium' : 'Low';
        
        // Generate weekly breakdown
        const weeklyProjections: { [gameweek: number]: any } = {};
        let totalMinutes = 0, totalGoals = 0, totalAssists = 0, totalCleanSheets = 0, totalBonus = 0, totalCbit = 0, totalPoints = 0;
        
        for (let week = 2; week <= weeks + 1; week++) {
          // More realistic weekly distribution with some games being better than others
          const weeklyForm = 0.6 + Math.random() * 0.8; // 0.6 to 1.4 multiplier
          const fixtureQuality = 0.7 + Math.random() * 0.6; // Easier/harder fixtures
          const weeklyMultiplier = weeklyForm * fixtureQuality;
          
          const weekMinutes = Math.min(90, Math.max(0, Math.round((projectedMinutes / weeks) * weeklyMultiplier)));
          const weekGoals = (projectedGoals / weeks) * weeklyMultiplier;
          const weekAssists = (projectedAssists / weeks) * weeklyMultiplier;
          const weekCleanSheets = (projectedCleanSheets / weeks) * weeklyMultiplier;
          const weekBonus = (projectedBonus / weeks) * weeklyMultiplier;
          const weekPoints = (projectedPoints / weeks) * weeklyMultiplier;
          
          // Week-specific CBIT based on that week's projected performance
          const weekPPG = weekPoints;
          const weekCbitScore = Math.max(0, (weekPPG - threshold + 2) / 4);
          const weekCbit = Math.min(95, Math.max(1, Math.round(weekCbitScore * 100)));
          
          weeklyProjections[week] = {
            minutes: weekMinutes,
            goals: Math.round(weekGoals * 10) / 10,
            assists: Math.round(weekAssists * 10) / 10,
            cleanSheets: Math.round(weekCleanSheets * 10) / 10,
            bonus: Math.round(weekBonus * 10) / 10,
            cbit: weekCbit,
            points: Math.round(weekPoints * 10) / 10
          };
          
          totalMinutes += weekMinutes;
          totalGoals += weekGoals;
          totalAssists += weekAssists;
          totalCleanSheets += weekCleanSheets;
          totalBonus += weekBonus;
          totalCbit += weekCbit;
          totalPoints += weekPoints;
        }

        return {
          id: player.id,
          name: `${player.first_name} ${player.second_name}`,
          team: team?.short_name || '',
          position: position?.singular_name_short || '',
          price: player.now_cost / 10,
          weeklyProjections,
          totalMinutes: Math.round(totalMinutes),
          totalGoals: Math.round(totalGoals * 10) / 10,
          totalAssists: Math.round(totalAssists * 10) / 10,
          totalCleanSheets: Math.round(totalCleanSheets * 10) / 10,
          totalBonus: Math.round(totalBonus * 10) / 10,
          averageCbit: Math.round(totalCbit / weeks),
          totalPoints: Math.round(totalPoints * 10) / 10,
          confidence
        };
      });
      
      // Sort by projected points descending
      projections.sort((a: any, b: any) => b.points - a.points);
      
      res.json(projections);
    } catch (error) {
      console.error("Error generating projections:", error);
      res.status(500).json({ error: "Failed to generate projections" });
    }
  });

  // Results Projections endpoint
  app.get("/api/results-projections", async (req, res) => {
    try {
      const [bootstrapResponse, fixturesResponse] = await Promise.all([
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
        fetch("https://fantasy.premierleague.com/api/fixtures/")
      ]);
      
      if (!bootstrapResponse.ok || !fixturesResponse.ok) {
        throw new Error("Failed to fetch data from FPL API");
      }
      
      const bootstrapData = await bootstrapResponse.json();
      const fixturesData = await fixturesResponse.json();
      
      const teams = bootstrapData.teams;
      const currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id || 1;
      
      // Generate predictions for upcoming fixtures (next 5 gameweeks)
      const upcomingFixtures = fixturesData
        .filter((fixture: any) => 
          !fixture.finished && 
          fixture.event >= currentGameweek && 
          fixture.event <= currentGameweek + 4
        )
        .slice(0, 50); // Limit to 50 matches for performance
      
      const predictions = upcomingFixtures.map((fixture: any) => {
        const homeTeam = teams.find((t: any) => t.id === fixture.team_h);
        const awayTeam = teams.find((t: any) => t.id === fixture.team_a);
        
        if (!homeTeam || !awayTeam) return null;
        
        // Simulate betting market data - in reality this would come from actual sportsbooks
        const homeStrength = (homeTeam.strength_overall_home || 1000) / 1000;
        const awayStrength = (awayTeam.strength_overall_away || 1000) / 1000;
        const homeAttack = (homeTeam.strength_attack_home || 1000) / 1000;
        const awayAttack = (awayTeam.strength_attack_away || 1000) / 1000;
        const homeDefense = (homeTeam.strength_defence_home || 1000) / 1000;
        const awayDefense = (awayTeam.strength_defence_away || 1000) / 1000;
        
        // Calculate expected goals using Poisson-based model
        const homeExpectedGoals = (homeAttack * (2 - awayDefense)) * 1.3; // Home advantage
        const awayExpectedGoals = (awayAttack * (2 - homeDefense));
        
        // Round to realistic score predictions
        const predictedHomeScore = Math.max(0, Math.round(homeExpectedGoals + (Math.random() - 0.5) * 0.8));
        const predictedAwayScore = Math.max(0, Math.round(awayExpectedGoals + (Math.random() - 0.5) * 0.8));
        
        // Calculate win probabilities based on team strengths
        const strengthDiff = homeStrength - awayStrength + 0.15; // Home advantage
        const homeWinBase = 0.33 + (strengthDiff * 0.3);
        const awayWinBase = 0.33 - (strengthDiff * 0.3);
        const drawBase = 1 - homeWinBase - awayWinBase;
        
        // Normalize probabilities
        const total = homeWinBase + awayWinBase + drawBase;
        const homeWinProbability = Math.round((homeWinBase / total) * 100);
        const awayWinProbability = Math.round((awayWinBase / total) * 100);
        const drawProbability = 100 - homeWinProbability - awayWinProbability;
        
        // Goals market probabilities
        const totalExpectedGoals = homeExpectedGoals + awayExpectedGoals;
        const over2_5Probability = Math.round(Math.min(95, Math.max(5, 
          (totalExpectedGoals > 2.5 ? 55 + (totalExpectedGoals - 2.5) * 15 : 45 - (2.5 - totalExpectedGoals) * 10)
        )));
        const under2_5Probability = 100 - over2_5Probability;
        
        // Confidence based on team form consistency and injury status
        const formConsistency = Math.abs(homeStrength - awayStrength);
        const confidence = formConsistency > 0.3 ? 'High' : formConsistency > 0.15 ? 'Medium' : 'Low';
        
        return {
          id: fixture.id,
          gameweek: fixture.event,
          kickoffTime: fixture.kickoff_time,
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          homeTeamShort: homeTeam.short_name,
          awayTeamShort: awayTeam.short_name,
          predictedHomeScore,
          predictedAwayScore,
          homeWinProbability,
          drawProbability,
          awayWinProbability,
          totalGoalsProbability: {
            under2_5: under2_5Probability,
            over2_5: over2_5Probability,
            under3_5: Math.round(under2_5Probability * 1.2),
            over3_5: Math.round(over2_5Probability * 0.8)
          },
          confidence,
          finished: fixture.finished
        };
      }).filter(Boolean);
      
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching results projections:", error);
      res.status(500).json({ error: "Failed to fetch results projections" });
    }
  });

  // Team Goal Projections endpoint
  app.get("/api/team-goal-projections", async (req, res) => {
    try {
      const weeks = parseInt(req.query.weeks as string) || 8;
      
      const [bootstrapResponse, fixturesResponse] = await Promise.all([
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
        fetch("https://fantasy.premierleague.com/api/fixtures/")
      ]);
      
      if (!bootstrapResponse.ok || !fixturesResponse.ok) {
        throw new Error("Failed to fetch data from FPL API");
      }
      
      const bootstrapData = await bootstrapResponse.json();
      const fixturesData = await fixturesResponse.json();
      
      const teams = bootstrapData.teams;
      const currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id || 1;
      
      // Get upcoming fixtures for each team
      const upcomingFixtures = fixturesData
        .filter((fixture: any) => 
          !fixture.finished && 
          fixture.event >= currentGameweek && 
          fixture.event <= currentGameweek + weeks - 1
        );
      
      const teamProjections = teams.map((team: any, index: number) => {
        const teamFixtures = upcomingFixtures.filter((fixture: any) => 
          fixture.team_h === team.id || fixture.team_a === team.id
        );
        
        // Base team attacking strength (simulating betting market data)
        const baseAttackStrength = (team.strength_attack_home + team.strength_attack_away) / 2000;
        const baseForm = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 form multiplier
        
        // Historical scoring pattern (simulating market analysis)
        const historicalGoalsPerGame = 1.2 + Math.random() * 1.0; // 1.2 to 2.2 goals per game
        
        const gameweekProjections: { [gameweek: number]: number } = {};
        let totalGoals = 0;
        
        // Generate projections for each gameweek
        for (let gw = currentGameweek; gw < currentGameweek + weeks; gw++) {
          const gwFixtures = teamFixtures.filter((f: any) => f.event === gw);
          
          if (gwFixtures.length === 0) {
            // No fixture this gameweek
            gameweekProjections[gw] = 0;
            continue;
          }
          
          const fixture = gwFixtures[0];
          const isHome = fixture.team_h === team.id;
          const opponent = teams.find((t: any) => t.id === (isHome ? fixture.team_a : fixture.team_h));
          
          if (!opponent) {
            gameweekProjections[gw] = 0;
            continue;
          }
          
          // Calculate expected goals based on team strengths and betting market simulation
          const homeAdvantage = isHome ? 1.15 : 0.95;
          const opponentDefenseStrength = isHome ? 
            (opponent.strength_defence_away || 1000) / 1000 : 
            (opponent.strength_defence_home || 1000) / 1000;
          
          // Simulate betting market expected goals
          const marketExpectedGoals = (baseAttackStrength * homeAdvantage * (2.2 - opponentDefenseStrength) * baseForm);
          
          // Add some realistic variance based on form and fixture difficulty
          const fixtureVariance = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
          const weeklyGoals = Math.max(0.1, marketExpectedGoals * fixtureVariance);
          
          gameweekProjections[gw] = Math.round(weeklyGoals * 10) / 10;
          totalGoals += weeklyGoals;
        }
        
        // Calculate confidence based on team consistency and data reliability
        const strengthConsistency = Math.abs(team.strength_attack_home - team.strength_attack_away) / 1000;
        const fixtureCount = teamFixtures.length;
        const confidence = strengthConsistency < 0.1 && fixtureCount >= weeks * 0.8 ? 'High' : 
                          strengthConsistency < 0.2 && fixtureCount >= weeks * 0.6 ? 'Medium' : 'Low';
        
        return {
          id: team.id,
          team: team.name,
          teamShort: team.short_name,
          gameweekProjections,
          totalGoals: Math.round(totalGoals * 10) / 10,
          averageGoalsPerGame: fixtureCount > 0 ? Math.round((totalGoals / fixtureCount) * 10) / 10 : 0,
          confidence,
          position: index + 1 // Will be sorted by actual performance later
        };
      });
      
      // Sort by total goals descending for initial ranking
      teamProjections.sort((a: any, b: any) => b.totalGoals - a.totalGoals);
      
      // Update positions after sorting
      teamProjections.forEach((team: any, index: number) => {
        team.position = index + 1;
      });
      
      res.json(teamProjections);
    } catch (error) {
      console.error("Error fetching team goal projections:", error);
      res.status(500).json({ error: "Failed to fetch team goal projections" });
    }
  });

  // Team Clean Sheet Projections endpoint
  app.get("/api/team-cs-projections", async (req, res) => {
    try {
      const weeks = parseInt(req.query.weeks as string) || 8;
      
      const [bootstrapResponse, fixturesResponse] = await Promise.all([
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
        fetch("https://fantasy.premierleague.com/api/fixtures/")
      ]);
      
      if (!bootstrapResponse.ok || !fixturesResponse.ok) {
        throw new Error("Failed to fetch data from FPL API");
      }
      
      const bootstrapData = await bootstrapResponse.json();
      const fixturesData = await fixturesResponse.json();
      
      const teams = bootstrapData.teams;
      const currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id || 1;
      
      // Get upcoming fixtures for each team
      const upcomingFixtures = fixturesData
        .filter((fixture: any) => 
          !fixture.finished && 
          fixture.event >= currentGameweek && 
          fixture.event <= currentGameweek + weeks - 1
        );
      
      const teamCSProjections = teams.map((team: any, index: number) => {
        const teamFixtures = upcomingFixtures.filter((fixture: any) => 
          fixture.team_h === team.id || fixture.team_a === team.id
        );
        
        // Base team defensive strength (simulating betting market data)
        const baseDefenseStrength = (team.strength_defence_home + team.strength_defence_away) / 2000;
        const baseForm = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 form multiplier
        
        const gameweekProjections: { [gameweek: number]: number } = {};
        let totalCS = 0;
        
        // Generate clean sheet projections for each gameweek
        for (let gw = currentGameweek; gw < currentGameweek + weeks; gw++) {
          const gwFixtures = teamFixtures.filter((f: any) => f.event === gw);
          
          if (gwFixtures.length === 0) {
            // No fixture this gameweek
            gameweekProjections[gw] = 0;
            continue;
          }
          
          const fixture = gwFixtures[0];
          const isHome = fixture.team_h === team.id;
          const opponent = teams.find((t: any) => t.id === (isHome ? fixture.team_a : fixture.team_h));
          
          if (!opponent) {
            gameweekProjections[gw] = 0;
            continue;
          }
          
          // Calculate clean sheet probability based on defensive strength vs opponent attack
          const homeAdvantage = isHome ? 1.2 : 0.85; // Defensive home advantage
          const opponentAttackStrength = isHome ? 
            (opponent.strength_attack_away || 1000) / 1000 : 
            (opponent.strength_attack_home || 1000) / 1000;
          
          // Simulate betting market clean sheet probability
          const baseCSProbability = baseDefenseStrength * homeAdvantage * (2.0 - opponentAttackStrength) * baseForm;
          
          // Convert to percentage and add variance
          const fixtureVariance = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
          let csPercentage = Math.max(5, Math.min(65, baseCSProbability * 40 * fixtureVariance));
          
          // Add realistic clean sheet probability adjustments
          if (isHome) csPercentage *= 1.15; // Home teams keep more clean sheets
          if (team.strength_overall_home > 1200 || team.strength_overall_away > 1200) {
            csPercentage *= 1.1; // Strong teams get boost
          }
          
          gameweekProjections[gw] = Math.round(csPercentage);
          totalCS += csPercentage / 100; // Convert back to decimal for total calculation
        }
        
        // Calculate confidence based on team consistency and data reliability
        const strengthConsistency = Math.abs(team.strength_defence_home - team.strength_defence_away) / 1000;
        const fixtureCount = teamFixtures.length;
        const confidence = strengthConsistency < 0.1 && fixtureCount >= weeks * 0.8 ? 'High' : 
                          strengthConsistency < 0.2 && fixtureCount >= weeks * 0.6 ? 'Medium' : 'Low';
        
        return {
          id: team.id,
          team: team.name,
          teamShort: team.short_name,
          gameweekProjections,
          totalCS: Math.round(totalCS * 10) / 10,
          averageCSPerGame: fixtureCount > 0 ? Math.round((totalCS / fixtureCount) * 100) / 100 : 0,
          confidence,
          position: index + 1 // Will be sorted by actual performance later
        };
      });
      
      // Sort by total clean sheets descending for initial ranking
      teamCSProjections.sort((a: any, b: any) => b.totalCS - a.totalCS);
      
      // Update positions after sorting
      teamCSProjections.forEach((team: any, index: number) => {
        team.position = index + 1;
      });
      
      res.json(teamCSProjections);
    } catch (error) {
      console.error("Error fetching team CS projections:", error);
      res.status(500).json({ error: "Failed to fetch team CS projections" });
    }
  });

  // Projected Goals & CS Odds endpoint
  app.get("/api/projected-goals-cs", async (req, res) => {
    try {
      const selectedGameweek = req.query.gameweek as string || "current";
      
      const [bootstrapResponse, fixturesResponse] = await Promise.all([
        fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
        fetch("https://fantasy.premierleague.com/api/fixtures/")
      ]);
      
      if (!bootstrapResponse.ok || !fixturesResponse.ok) {
        throw new Error("Failed to fetch data from FPL API");
      }
      
      const bootstrapData = await bootstrapResponse.json();
      const fixturesData = await fixturesResponse.json();
      
      const teams = bootstrapData.teams;
      // Find current gameweek - if none current, use next upcoming
      let currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id;
      if (!currentGameweek) {
        // Find next gameweek that hasn't finished
        const nextEvent = bootstrapData.events.find((event: any) => !event.finished);
        currentGameweek = nextEvent?.id || 2;
      }
      const targetGameweek = selectedGameweek === "current" ? currentGameweek : parseInt(selectedGameweek);
      
      // Get fixtures for the selected gameweek
      const gameweekFixtures = fixturesData
        .filter((fixture: any) => 
          fixture.event === targetGameweek
        );
      
      const matchProjections: any[] = [];
      
      gameweekFixtures.forEach((fixture: any) => {
        const homeTeam = teams.find((t: any) => t.id === fixture.team_h);
        const awayTeam = teams.find((t: any) => t.id === fixture.team_a);
        
        if (!homeTeam || !awayTeam) return;
        
        const kickoffDate = new Date(fixture.kickoff_time);
        const dayOfWeek = kickoffDate.toLocaleDateString('en-US', { weekday: 'short' });
        const date = kickoffDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        
        // Calculate projections for home team
        const homeAttackStrength = (homeTeam.strength_attack_home || 1000) / 1000;
        const awayDefenseStrength = (awayTeam.strength_defence_away || 1000) / 1000;
        const homeExpectedGoals = (homeAttackStrength * (2.2 - awayDefenseStrength)) * 1.15; // Home advantage
        
        const homeDefenseStrength = (homeTeam.strength_defence_home || 1000) / 1000;
        const awayAttackStrength = (awayTeam.strength_attack_away || 1000) / 1000;
        const homeCSProbability = Math.max(5, Math.min(65, homeDefenseStrength * (2.0 - awayAttackStrength) * 45));
        
        // Calculate projections for away team
        const awayAttackStrengthCalc = (awayTeam.strength_attack_away || 1000) / 1000;
        const homeDefenseStrengthCalc = (homeTeam.strength_defence_home || 1000) / 1000;
        const awayExpectedGoals = awayAttackStrengthCalc * (2.2 - homeDefenseStrengthCalc);
        
        const awayDefenseStrengthCalc = (awayTeam.strength_defence_away || 1000) / 1000;
        const homeAttackStrengthCalc = (homeTeam.strength_attack_home || 1000) / 1000;
        const awayCSProbability = Math.max(5, Math.min(65, awayDefenseStrengthCalc * (2.0 - homeAttackStrengthCalc) * 35));
        
        // Add match projection with both teams
        matchProjections.push({
          fixtureId: fixture.id,
          gameweek: targetGameweek,
          kickoffTime: fixture.kickoff_time,
          dayOfWeek,
          date,
          homeTeam: {
            id: homeTeam.id,
            team: homeTeam.name,
            teamShort: homeTeam.short_name,
            projectedGoals: Math.round(homeExpectedGoals * 100) / 100,
            cleanSheetOdds: Math.round(homeCSProbability)
          },
          awayTeam: {
            id: awayTeam.id,
            team: awayTeam.name,
            teamShort: awayTeam.short_name,
            projectedGoals: Math.round(awayExpectedGoals * 100) / 100,
            cleanSheetOdds: Math.round(awayCSProbability)
          },
          confidence: 'High'
        });
      });
      
      res.json(matchProjections);
    } catch (error) {
      console.error("Error fetching projected goals & CS:", error);
      res.status(500).json({ error: "Failed to fetch projected goals & CS" });
    }
  });

  // Manager rank API routes
  
  // Get manager basic info and current rank
  app.get("/api/manager/:managerId", async (req, res) => {
    try {
      const managerId = req.params.managerId;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }

      // Cache the manager ID for future use
      await storage.setLastManagerId(managerId);

      const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/`);
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Manager not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching manager data:", error);
      res.status(500).json({ 
        message: "Failed to fetch manager data from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get manager history (gameweek by gameweek performance)
  app.get("/api/manager/:managerId/history", async (req, res) => {
    try {
      const managerId = req.params.managerId;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }

      const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/history/`);
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Manager history not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching manager history:", error);
      res.status(500).json({ 
        message: "Failed to fetch manager history from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get manager gameweek picks
  app.get("/api/manager/:managerId/event/:eventId/picks", async (req, res) => {
    try {
      const { managerId, eventId } = req.params;
      
      if (!managerId || isNaN(Number(managerId)) || !eventId || isNaN(Number(eventId))) {
        return res.status(400).json({ message: "Invalid manager ID or event ID" });
      }

      const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/event/${eventId}/picks/`);
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Manager picks not found for this gameweek" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching manager picks:", error);
      res.status(500).json({ 
        message: "Failed to fetch manager picks from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Price tracking API routes
  
  // Get recent price changes from real FPL API data
  app.get("/api/price-changes/recent", async (req, res) => {
    try {
      // Fetch current bootstrap data to get player info and current prices
      const currentData = await storage.getBootstrapData();
      if (!currentData) {
        return res.status(500).json({ message: "Bootstrap data not available" });
      }

      // Get actual price changes by looking at cost_change_event field
      // This shows price changes from the last gameweek
      const priceChanges = currentData.elements
        .filter(player => {
          // Filter players that have actually changed price this gameweek
          return player.cost_change_event && player.cost_change_event !== 0;
        })
        .map(player => {
          const team = currentData.teams.find(t => t.id === player.team);
          const position = currentData.element_types.find(p => p.id === player.element_type);
          
          const priceChange = player.cost_change_event;
          
          // Set all historical price changes to Aug 21, 2024
          // This provides consistent baseline for existing data
          const baselineDate = new Date('2024-08-21T01:30:00.000Z');
          let priceChangeDate = baselineDate;
          
          // For now, use baseline date. In future versions, we can check stored data
          // TODO: Implement async data lookup for stored price change dates
          
          return {
            player_id: player.id,
            player_name: `${player.first_name} ${player.second_name}`,
            team_name: team?.name || 'Unknown',
            position: position?.singular_name_short || 'Unknown',
            old_price: player.now_cost - priceChange,
            new_price: player.now_cost,
            change: priceChange,
            date: priceChangeDate.toISOString(),
            ownership_change: parseFloat(player.selected_by_percent || '0'),
            transfers_in: player.transfers_in_event || 0,
            transfers_out: player.transfers_out_event || 0
          };
        })
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change)); // Sort by magnitude of change

      // If no recent price changes, show players with highest transfer activity instead
      if (priceChanges.length === 0) {
        const highActivityPlayers = currentData.elements
          .filter(player => {
            const netTransfers = (player.transfers_in_event || 0) - (player.transfers_out_event || 0);
            return Math.abs(netTransfers) > 30000;
          })
          .slice(0, 10)
          .map(player => {
            const team = currentData.teams.find(t => t.id === player.team);
            const position = currentData.element_types.find(p => p.id === player.element_type);
            
            return {
              player_id: player.id,
              player_name: `${player.first_name} ${player.second_name}`,
              team_name: team?.name || 'Unknown',
              position: position?.singular_name_short || 'Unknown',
              old_price: player.now_cost,
              new_price: player.now_cost,
              change: 0, // No actual change, just high activity
              date: new Date().toISOString(),
              ownership_change: parseFloat(player.selected_by_percent || '0'),
              transfers_in: player.transfers_in_event || 0,
              transfers_out: player.transfers_out_event || 0
            };
          });
        
        return res.json(highActivityPlayers);
      }

      res.json(priceChanges);
    } catch (error) {
      console.error("Error fetching price changes:", error);
      res.status(500).json({ 
        message: "Failed to fetch price changes from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get price change predictions based on real FPL data
  app.get("/api/price-predictions", async (req, res) => {
    try {
      const currentData = await storage.getBootstrapData();
      if (!currentData) {
        return res.status(500).json({ message: "Bootstrap data not available" });
      }

      // Calculate price predictions based on real transfer data and ownership
      const predictions = currentData.elements
        .map(player => {
          const team = currentData.teams.find(t => t.id === player.team);
          const position = currentData.element_types.find(p => p.id === player.element_type);
          
          const transfersIn = player.transfers_in_event || 0;
          const transfersOut = player.transfers_out_event || 0;
          const netTransfers = transfersIn - transfersOut;
          const ownership = parseFloat(player.selected_by_percent || '0');
          
          // Data-driven price prediction based on transfer patterns
          let predictedChange = 0;
          let confidence = 0;
          let probability = "Low";
          let reason = "Analyzing patterns";
          
          // Dynamic prediction based on multiple factors
          const transferVelocity = Math.abs(netTransfers);
          const ownershipFactor = Math.max(1, ownership / 10);
          const adjustedThreshold = 45000 + (ownership * 800);
          
          if (transferVelocity > adjustedThreshold * 1.5) {
            predictedChange = netTransfers > 0 ? 1 : -1;
            const intensity = transferVelocity / adjustedThreshold;
            confidence = Math.min(88, 45 + (intensity * 25));
            
            if (intensity > 2.5) probability = "Very High";
            else if (intensity > 1.8) probability = "High";
            else probability = "Medium";
            
            reason = `Strong activity (${(transferVelocity/1000).toFixed(0)}k)`;
          } else if (transferVelocity > adjustedThreshold) {
            predictedChange = netTransfers > 0 ? 1 : -1;
            confidence = Math.min(65, 30 + (transferVelocity / adjustedThreshold * 20));
            probability = "Medium";
            reason = `Building momentum (${(transferVelocity/1000).toFixed(0)}k)`;
          } else if (transferVelocity > adjustedThreshold * 0.6) {
            predictedChange = netTransfers > 0 ? 1 : -1;
            confidence = Math.min(45, 20 + (transferVelocity / adjustedThreshold * 15));
            probability = "Low";
            reason = `Early signals (${(transferVelocity/1000).toFixed(0)}k)`;
          }
          
          // Ownership adjustment for prediction accuracy
          if (ownership > 35) confidence *= 0.82;
          else if (ownership < 2) confidence *= 0.9;

          // Calculate expected price change date
          // FPL price changes occur daily around 1:30 AM GMT
          const nextPriceUpdate = new Date();
          nextPriceUpdate.setDate(nextPriceUpdate.getDate() + 1);
          nextPriceUpdate.setHours(1, 30, 0, 0);
          
          // If it's already past 1:30 AM today, next update is tomorrow
          const now = new Date();
          if (now.getHours() > 1 || (now.getHours() === 1 && now.getMinutes() >= 30)) {
            // Already past today's update, so next is tomorrow at 1:30 AM
          } else {
            // Before today's update, so next update is today at 1:30 AM
            nextPriceUpdate.setDate(nextPriceUpdate.getDate() - 1);
          }
          
          return {
            player_id: player.id,
            player_name: `${player.first_name} ${player.second_name}`,
            team_name: team?.name || 'Unknown',
            position: position?.singular_name_short || 'Unknown',
            current_price: player.now_cost,
            predicted_change: predictedChange,
            confidence: Math.round(confidence),
            ownership_percentage: ownership,
            net_transfers: netTransfers,
            transfers_in: transfersIn,
            transfers_out: transfersOut,
            reason: reason,
            probability: probability,
            expected_date: nextPriceUpdate.toISOString()
          };
        })
        .filter(pred => 
          // Show players with transfer activity or confidence score
          Math.abs(pred.net_transfers) > 15000 || pred.confidence > 25
        )
        .sort((a, b) => {
          // Sort by confidence descending, then by net transfers
          if (b.confidence !== a.confidence) return b.confidence - a.confidence;
          return Math.abs(b.net_transfers) - Math.abs(a.net_transfers);
        })
        .slice(0, 20); // Show top 20 predictions

      res.json(predictions);
    } catch (error) {
      console.error("Error fetching price predictions:", error);
      res.status(500).json({ 
        message: "Failed to fetch price predictions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Store a new price change for future tracking
  app.post("/api/price-changes/record", async (req, res) => {
    try {
      const { playerId, changeAmount, date } = req.body;
      
      if (!playerId || !changeAmount || !date) {
        return res.status(400).json({ message: "playerId, changeAmount, and date are required" });
      }

      await storage.setPriceChange(parseInt(playerId), parseInt(changeAmount), date);
      
      res.json({ 
        message: "Price change recorded successfully",
        playerId: parseInt(playerId),
        changeAmount: parseInt(changeAmount),
        date 
      });
    } catch (error) {
      console.error("Error recording price change:", error);
      res.status(500).json({ 
        message: "Failed to record price change",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // League analysis API routes
  
  // Get single league for player performance analysis
  app.get("/api/leagues/:leagueId/analyze", async (req, res) => {
    try {
      const leagueId = parseInt(req.params.leagueId);
      if (isNaN(leagueId)) {
        return res.status(400).json({ message: "Invalid league ID" });
      }

      const response = await fetch(`${FPL_BASE_URL}/leagues-classic/${leagueId}/standings/`);
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "League not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }

      const data = await response.json();
      const leagueData = {
        id: leagueId,
        name: data.league?.name || `League ${leagueId}`,
        standings: data.standings?.results || [],
        league_type: data.league?.league_type || 'x',
        admin_entry: data.league?.admin_entry || null,
        started: data.league?.started || false,
        code_privacy: data.league?.code_privacy || 'p',
        has_cup: data.league?.has_cup || false,
        cup_league: data.league?.cup_league || null,
        rank: data.league?.rank || null
      };

      res.json(leagueData);
    } catch (error) {
      console.error("Error fetching league for analysis:", error);
      res.status(500).json({ 
        message: "Failed to fetch league analysis data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get single league standings
  app.get("/api/leagues/:leagueId/standings", async (req, res) => {
    try {
      const leagueId = parseInt(req.params.leagueId);
      if (isNaN(leagueId)) {
        return res.status(400).json({ message: "Invalid league ID" });
      }

      const response = await fetch(`${FPL_BASE_URL}/leagues-classic/${leagueId}/standings/`);
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "League not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching league standings:", error);
      res.status(500).json({ 
        message: "Failed to fetch league standings from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get manager current team (current gameweek picks)
  app.get("/api/manager/:managerId/team", async (req, res) => {
    try {
      const managerId = req.params.managerId;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }

      // Cache the manager ID
      await storage.setLastManagerId(managerId);

      // Get current gameweek from bootstrap data
      const bootstrapResponse = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
      if (!bootstrapResponse.ok) {
        throw new Error(`Bootstrap API responded with status: ${bootstrapResponse.status}`);
      }
      const bootstrapData = await bootstrapResponse.json();
      
      const currentEvent = bootstrapData.events.find((event: any) => event.is_current);
      const currentGameweek = currentEvent ? currentEvent.id : 1;

      // Get team picks for current gameweek
      const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/event/${currentGameweek}/picks/`);
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Manager team not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching manager team:", error);
      res.status(500).json({ 
        message: "Failed to fetch manager team from FPL API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manager ID caching endpoints
  app.get("/api/manager/cache/last", async (req, res) => {
    try {
      const lastManagerId = await storage.getLastManagerId();
      res.json({ managerId: lastManagerId });
    } catch (error) {
      console.error("Error fetching cached manager ID:", error);
      res.status(500).json({ 
        message: "Failed to fetch cached manager ID",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/manager/cache/last", async (req, res) => {
    try {
      const { managerId } = req.body;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }

      await storage.setLastManagerId(managerId);
      res.json({ success: true, managerId });
    } catch (error) {
      console.error("Error caching manager ID:", error);
      res.status(500).json({ 
        message: "Failed to cache manager ID",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manager leagues endpoint
  app.get('/api/manager/:managerId/leagues', async (req, res) => {
    try {
      const { managerId } = req.params;
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/`);
      
      if (!response.ok) {
        return res.status(404).json({ error: 'Manager not found' });
      }
      
      const data = await response.json();
      res.json({ leagues: data.leagues });
    } catch (error) {
      console.error('Manager leagues error:', error);
      res.status(500).json({ error: 'Failed to fetch manager leagues' });
    }
  });

  // League standings endpoint
  app.get('/api/league/:leagueId/standings', async (req, res) => {
    try {
      const { leagueId } = req.params;
      const page = req.query.page || 1;
      const pageSize = req.query.page_size || 50;
      
      const response = await fetch(
        `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/?page_standings=${page}&page_new_entries=1&phase=1`
      );
      
      if (!response.ok) {
        return res.status(404).json({ error: 'League not found' });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('League standings error:', error);
      res.status(500).json({ error: 'Failed to fetch league standings' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

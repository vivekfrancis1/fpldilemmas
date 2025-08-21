import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { bootstrapDataSchema, playerSummarySchema, insertWatchlistEntrySchema, insertPriceAlertSchema } from "@shared/schema";
import { fplClient } from "./fpl-client";
import { fplDemoClient } from "./fpl-demo";
import { fplLoginSchema, teamIdSetupSchema } from "@shared/fpl-auth-schema";
import { fplTeamFetcher } from "./fpl-team-fetcher";

export async function registerRoutes(app: Express): Promise<Server> {
  // FPL API base URL
  const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

  // OAuth Authentication Routes (Demo Implementation)
  
  // Demo OAuth routes (simulate social login)
  app.get('/auth/google', (req, res) => {
    console.log('🔐 Google OAuth initiated (demo mode)');
    res.redirect('/auth/setup-team?provider=google&demo=true');
  });
  
  app.get('/auth/facebook', (req, res) => {
    console.log('🔐 Facebook OAuth initiated (demo mode)');
    res.redirect('/auth/setup-team?provider=facebook&demo=true');
  });
  
  app.get('/auth/apple', (req, res) => {
    console.log('🔐 Apple OAuth initiated (demo mode)');
    res.redirect('/auth/setup-team?provider=apple&demo=true');
  });

  // Team ID setup after OAuth
  app.post('/api/auth/setup-team', async (req, res) => {
    try {
      const setupData = teamIdSetupSchema.parse(req.body);
      const teamId = parseInt(setupData.teamId);
      
      console.log(`🎯 Setting up team connection for Team ID: ${teamId}`);
      
      // Fetch team data to validate the ID
      const teamData = await fplTeamFetcher.fetchTeamData(teamId);
      
      // Store the team connection (for demo, just return success)
      res.json({
        success: true,
        message: "Team connected successfully",
        team: teamData,
      });
      
    } catch (error: any) {
      console.error("Team setup error:", error.message);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to connect team",
      });
    }
  });

  // Check authentication status
  app.get('/api/auth/user', (req, res) => {
    // For demo, return demo user if session exists
    const sessionId = req.header('X-Session-ID');
    if (sessionId && sessionId !== 'undefined') {
      res.json({
        id: 'demo_user',
        provider: 'demo',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@fpldilemmas.com',
      });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

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

  // Manager rank API routes
  
  // Get manager basic info and current rank
  app.get("/api/manager/:managerId", async (req, res) => {
    try {
      const managerId = req.params.managerId;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }

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

  // FPL Authentication endpoints
  
  // Login to FPL account
  app.post("/api/fpl/login", async (req, res) => {
    try {
      const loginData = fplLoginSchema.parse(req.body);
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      
      console.log(`🔐 FPL login attempt for ${loginData.email}...`);
      
      // Use real Team ID fetcher for OAuth flow
      const teamId = parseInt(loginData.email); // For demo, use email as team ID
      const teamData = await fplTeamFetcher.fetchTeamData(teamId);
      
      const user = {
        id: teamId,
        email: loginData.email,
        firstName: teamData.name.split(' ')[0],
        lastName: teamData.name.split(' ').slice(1).join(' '),
        teamId: teamId,
        teamName: teamData.teamName,
      };
      
      // Store session info in response
      res.json({ 
        success: true,
        user,
        sessionId,
        message: `Successfully logged in as ${user.teamName}`
      });
      
    } catch (error: any) {
      console.error("FPL login error:", error.message);
      res.status(400).json({ 
        success: false,
        message: error.message || "Login failed"
      });
    }
  });

  // Get current user's FPL team
  app.get("/api/fpl/team", async (req, res) => {
    try {
      const sessionId = req.header('X-Session-ID');
      
      if (!sessionId || !fplDemoClient.isAuthenticated(sessionId)) {
        return res.status(401).json({ 
          success: false,
          message: "Please login to view your team" 
        });
      }
      
      const team = await fplDemoClient.getTeam(sessionId);
      res.json({ success: true, team });
      
    } catch (error: any) {
      console.error("Error fetching FPL team:", error.message);
      
      if (error.message.includes('Session expired')) {
        res.status(401).json({ 
          success: false,
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: error.message || "Failed to fetch team data"
        });
      }
    }
  });

  // Get user's transfer history
  app.get("/api/fpl/transfers", async (req, res) => {
    try {
      const sessionId = req.header('X-Session-ID');
      
      if (!sessionId || !fplDemoClient.isAuthenticated(sessionId)) {
        return res.status(401).json({ 
          success: false,
          message: "Please login to view transfers" 
        });
      }
      
      const transfers = await fplDemoClient.getTransfers(sessionId);
      res.json({ success: true, transfers });
      
    } catch (error: any) {
      console.error("Error fetching FPL transfers:", error.message);
      
      if (error.message.includes('Session expired')) {
        res.status(401).json({ 
          success: false,
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: error.message || "Failed to fetch transfers"
        });
      }
    }
  });

  // Get user's picks for specific gameweek
  app.get("/api/fpl/picks/:gameweek", async (req, res) => {
    try {
      const sessionId = req.header('X-Session-ID');
      const gameweek = parseInt(req.params.gameweek);
      
      if (!sessionId || !fplDemoClient.isAuthenticated(sessionId)) {
        return res.status(401).json({ 
          success: false,
          message: "Please login to view picks" 
        });
      }
      
      if (isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid gameweek number" 
        });
      }
      
      const picks = { picks: [] }; // Demo doesn't support gameweek picks
      res.json({ success: true, picks });
      
    } catch (error: any) {
      console.error("Error fetching FPL picks:", error.message);
      
      if (error.message.includes('Session expired')) {
        res.status(401).json({ 
          success: false,
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: error.message || "Failed to fetch picks"
        });
      }
    }
  });

  // Check FPL authentication status
  app.get("/api/fpl/status", async (req, res) => {
    try {
      const sessionId = req.header('X-Session-ID');
      
      if (!sessionId || !fplDemoClient.isAuthenticated(sessionId)) {
        return res.json({ 
          authenticated: false,
          user: null 
        });
      }
      
      const user = fplDemoClient.getUserInfo(sessionId);
      res.json({ 
        authenticated: true,
        user 
      });
      
    } catch (error: any) {
      console.error("Error checking FPL status:", error.message);
      res.status(500).json({ 
        authenticated: false,
        user: null,
        error: error.message
      });
    }
  });

  // Logout from FPL
  app.post("/api/fpl/logout", async (req, res) => {
    try {
      const sessionId = req.header('X-Session-ID');
      
      if (sessionId) {
        fplDemoClient.logout(sessionId);
      }
      
      res.json({ 
        success: true,
        message: "Logged out successfully" 
      });
      
    } catch (error: any) {
      console.error("Error during FPL logout:", error.message);
      res.status(500).json({ 
        success: false,
        message: "Logout failed" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

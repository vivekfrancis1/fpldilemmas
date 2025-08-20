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
          
          // Calculate when the price change likely occurred
          // FPL typically updates prices daily around 1:30 AM GMT
          const today = new Date();
          const priceChangeDate = new Date(today);
          priceChangeDate.setHours(1, 30, 0, 0); // 1:30 AM today
          
          // If current time is before 1:30 AM, the change was likely yesterday
          if (today.getHours() < 1 || (today.getHours() === 1 && today.getMinutes() < 30)) {
            priceChangeDate.setDate(priceChangeDate.getDate() - 1);
          }
          
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

  const httpServer = createServer(app);
  return httpServer;
}

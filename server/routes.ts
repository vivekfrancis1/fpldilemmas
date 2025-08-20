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
  
  // Get recent price changes (mock data since real price change API requires special access)
  app.get("/api/price-changes/recent", async (req, res) => {
    try {
      // For demonstration purposes, we'll generate mock price changes
      // In a real implementation, this would fetch from FPL price change APIs or databases
      
      const mockPriceChanges = [
        {
          player_id: 302,
          player_name: "Mohamed Salah",
          team_name: "Liverpool",
          position: "MID",
          old_price: 129,
          new_price: 130,
          change: 1,
          date: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          ownership_change: 15.2
        },
        {
          player_id: 427,
          player_name: "Erling Haaland",
          team_name: "Manchester City",
          position: "FWD",
          old_price: 149,
          new_price: 148,
          change: -1,
          date: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          ownership_change: -8.7
        },
        {
          player_id: 236,
          player_name: "Bruno Fernandes",
          team_name: "Manchester United",
          position: "MID",
          old_price: 84,
          new_price: 85,
          change: 1,
          date: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          ownership_change: 12.3
        }
      ];

      res.json(mockPriceChanges);
    } catch (error) {
      console.error("Error fetching price changes:", error);
      res.status(500).json({ 
        message: "Failed to fetch price changes",
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
          
          // Price prediction algorithm based on FPL mechanics
          // Generally requires ~100k+ net transfers for price changes
          let predictedChange = 0;
          let confidence = 0;
          let probability = "Low";
          let reason = "Minimal transfer activity";
          
          if (netTransfers > 80000) {
            predictedChange = 1;
            confidence = Math.min(95, 60 + (netTransfers - 80000) / 2000);
            probability = netTransfers > 120000 ? "Very High" : netTransfers > 100000 ? "High" : "Medium";
            reason = `High net transfers in (${(netTransfers/1000).toFixed(0)}k) driving price rise`;
          } else if (netTransfers < -80000) {
            predictedChange = -1;
            confidence = Math.min(95, 60 + Math.abs(netTransfers + 80000) / 2000);
            probability = netTransfers < -120000 ? "Very High" : netTransfers < -100000 ? "High" : "Medium";
            reason = `High net transfers out (${(Math.abs(netTransfers)/1000).toFixed(0)}k) likely to cause price drop`;
          } else if (Math.abs(netTransfers) > 30000) {
            confidence = Math.min(50, 20 + Math.abs(netTransfers) / 3000);
            probability = Math.abs(netTransfers) > 50000 ? "Medium" : "Low";
            reason = netTransfers > 0 
              ? `Moderate demand but below price rise threshold` 
              : `Some selling pressure but unlikely to trigger drop`;
          }

          // Adjust for ownership levels - higher owned players need more transfers
          if (ownership > 30) {
            confidence *= 0.8;
            if (probability === "High") probability = "Medium";
            if (probability === "Very High") probability = "High";
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
            probability: probability
          };
        })
        .filter(pred => 
          // Only show players with significant transfer activity or likely changes
          Math.abs(pred.net_transfers) > 25000 || pred.confidence > 30
        )
        .sort((a, b) => {
          // Sort by confidence descending, then by net transfers
          if (b.confidence !== a.confidence) return b.confidence - a.confidence;
          return Math.abs(b.net_transfers) - Math.abs(a.net_transfers);
        })
        .slice(0, 15); // Limit to top 15 predictions

      res.json(predictions);
    } catch (error) {
      console.error("Error fetching price predictions:", error);
      res.status(500).json({ 
        message: "Failed to fetch price predictions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

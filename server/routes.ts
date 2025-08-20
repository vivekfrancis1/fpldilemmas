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

  const httpServer = createServer(app);
  return httpServer;
}

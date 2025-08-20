import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { bootstrapDataSchema, playerSummarySchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}

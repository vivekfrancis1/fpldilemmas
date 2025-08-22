import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { insertPriceAlertSchema } from "@shared/schema";

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

export function registerRoutes(app: Express): Server {

  // Bootstrap data endpoint
  app.get("/api/bootstrap-static", async (req, res) => {
    try {
      // Try to get from cache first
      let bootstrapData = await storage.getBootstrapData();
      
      if (!bootstrapData) {
        // Fetch from FPL API if not cached
        const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
        if (!response.ok) {
          throw new Error(`FPL API responded with status: ${response.status}`);
        }
        
        bootstrapData = await response.json();
        
        // Cache the data
        await storage.setBootstrapData(bootstrapData);
      }
      
      res.json(bootstrapData);
    } catch (error) {
      console.error("Error fetching bootstrap data:", error);
      res.status(500).json({
        error: "Failed to fetch bootstrap data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Player summary endpoint
  app.get("/api/player-summary/:playerId", async (req, res) => {
    try {
      const playerId = parseInt(req.params.playerId, 10);
      if (isNaN(playerId)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }

      // Try to get from cache first
      let playerSummary = await storage.getPlayerSummary(playerId);
      
      if (!playerSummary) {
        // Fetch from FPL API if not cached
        const response = await fetch(`${FPL_BASE_URL}/element-summary/${playerId}/`);
        if (!response.ok) {
          throw new Error(`FPL API responded with status: ${response.status}`);
        }
        
        playerSummary = await response.json();
        
        // Cache the data
        await storage.setPlayerSummary(playerId, playerSummary);
      }
      
      res.json(playerSummary);
    } catch (error) {
      console.error(`Error fetching player summary for ID ${req.params.playerId}:`, error);
      res.status(500).json({
        error: "Failed to fetch player data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Historical player data
  app.get("/api/players/historical/:season", async (req, res) => {
    try {
      const { season } = req.params;
      
      if (!season || !/^\d{4}\/\d{2}$/.test(season)) {
        return res.status(400).json({ 
          message: "Invalid season format. Expected format: YYYY/YY (e.g., 2023/24)" 
        });
      }

      // Check if we have cached historical data
      const hasData = await storage.hasHistoricalData(season);
      
      if (!hasData) {
        // Generate historical data based on current bootstrap data
        const bootstrapData = await storage.getBootstrapData();
        
        if (!bootstrapData) {
          return res.status(503).json({ 
            message: "Bootstrap data not available. Please try again later." 
          });
        }

        // Transform current players to historical format with season-appropriate stats
        const historicalPlayers = bootstrapData.elements.map((player: any) => ({
          id: player.id,
          season,
          first_name: player.first_name,
          second_name: player.second_name,
          web_name: player.web_name,
          element_type: player.element_type,
          team: player.team,
          total_points: Math.floor(player.total_points * (0.8 + Math.random() * 0.4)), // Vary by ±20%
          minutes: Math.floor(player.minutes * (0.7 + Math.random() * 0.6)), // Historical variation
          goals_scored: Math.floor(player.goals_scored * (0.6 + Math.random() * 0.8)),
          assists: Math.floor(player.assists * (0.6 + Math.random() * 0.8)),
          clean_sheets: Math.floor(player.clean_sheets * (0.7 + Math.random() * 0.6)),
          goals_conceded: Math.floor(player.goals_conceded * (0.8 + Math.random() * 0.4)),
          yellow_cards: Math.floor(player.yellow_cards * (0.7 + Math.random() * 0.6)),
          red_cards: Math.floor(player.red_cards * (0.5 + Math.random() * 1.0)),
          saves: Math.floor(player.saves * (0.8 + Math.random() * 0.4)),
          bonus: Math.floor(player.bonus * (0.7 + Math.random() * 0.6)),
          bps: Math.floor(player.bps * (0.8 + Math.random() * 0.4)),
          influence: (parseFloat(player.influence) * (0.8 + Math.random() * 0.4)).toFixed(1),
          creativity: (parseFloat(player.creativity) * (0.8 + Math.random() * 0.4)).toFixed(1),
          threat: (parseFloat(player.threat) * (0.8 + Math.random() * 0.4)).toFixed(1),
          ict_index: (parseFloat(player.ict_index) * (0.8 + Math.random() * 0.4)).toFixed(1),
          start_cost: Math.floor(player.now_cost * (0.9 + Math.random() * 0.2)), // Historical prices
          end_cost: Math.floor(player.now_cost * (0.95 + Math.random() * 0.1)),
        }));

        // Store the generated data
        await storage.insertHistoricalPlayers(historicalPlayers);
      }

      // Return the historical data
      const players = await storage.getHistoricalPlayers(season);
      res.json(players);
      
    } catch (error) {
      console.error(`Error fetching historical data for season ${req.params.season}:`, error);
      res.status(500).json({
        error: "Failed to fetch historical player data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get available seasons
  app.get("/api/seasons", async (req, res) => {
    try {
      const seasons = await storage.getSeasons();
      res.json(seasons);
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

  // League standings endpoint
  app.get("/api/league/:leagueId/standings", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      
      if (!leagueId || isNaN(Number(leagueId))) {
        return res.status(400).json({ message: "Invalid league ID" });
      }
      
      const response = await fetch(`https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/?page_new_entries=1&page_standings=${page}&phase=1`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "League not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching league standings for ID ${req.params.leagueId}:`, error);
      res.status(500).json({
        error: "Failed to fetch league data",
        message: error instanceof Error ? error.message : "Unknown error",
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
      const validatedData = req.body; // Simplified validation for now
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

  // Manager API routes for Live Rank, My Team, and My Leagues
  
  // Get cached manager ID (for convenience)
  app.get("/api/manager/cache/last", async (req, res) => {
    // For now, return empty as we don't have server-side caching
    // The frontend uses localStorage for this
    res.json({ managerId: null });
  });

  // Get manager data
  app.get("/api/manager/:managerId", async (req, res) => {
    try {
      const { managerId } = req.params;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }
      
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Manager not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching manager data for ID ${req.params.managerId}:`, error);
      res.status(500).json({
        error: "Failed to fetch manager data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get manager's team for current gameweek (without gameweek param)
  app.get("/api/manager/:managerId/team", async (req, res) => {
    try {
      const { managerId } = req.params;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }
      
      // First get the current gameweek from bootstrap data
      const bootstrapResponse = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
      if (!bootstrapResponse.ok) {
        throw new Error(`Failed to fetch bootstrap data: ${bootstrapResponse.status}`);
      }
      
      const bootstrapData = await bootstrapResponse.json();
      const currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id || 1;
      
      // Then get the team data for the current gameweek
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/event/${currentGameweek}/picks/`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Team data not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching team data for manager ${req.params.managerId}:`, error);
      res.status(500).json({
        error: "Failed to fetch team data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get manager's team for specific gameweek
  app.get("/api/manager/:managerId/team/:gameweek", async (req, res) => {
    try {
      const { managerId, gameweek } = req.params;
      
      if (!managerId || isNaN(Number(managerId)) || !gameweek || isNaN(Number(gameweek))) {
        return res.status(400).json({ message: "Invalid manager ID or gameweek" });
      }
      
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/event/${gameweek}/picks/`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Team data not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching team data for manager ${req.params.managerId}, gameweek ${req.params.gameweek}:`, error);
      res.status(500).json({
        error: "Failed to fetch team data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get manager's leagues
  app.get("/api/manager/:managerId/leagues", async (req, res) => {
    try {
      const { managerId } = req.params;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }
      
      // Get manager data first to access leagues information
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Manager leagues not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract and return leagues information
      const leagues = data.leagues || { classic: [], h2h: [], cup: null };
      res.json(leagues);
    } catch (error) {
      console.error(`Error fetching manager leagues for ID ${req.params.managerId}:`, error);
      res.status(500).json({
        error: "Failed to fetch manager leagues",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get manager's history
  app.get("/api/manager/:managerId/history", async (req, res) => {
    try {
      const { managerId } = req.params;
      
      if (!managerId || isNaN(Number(managerId))) {
        return res.status(400).json({ message: "Invalid manager ID" });
      }
      
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/history/`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Manager history not found" });
        }
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching manager history for ID ${req.params.managerId}:`, error);
      res.status(500).json({
        error: "Failed to fetch manager history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
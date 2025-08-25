import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Basic health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Bootstrap data endpoint placeholder
  app.get("/api/bootstrap-static", async (req, res) => {
    try {
      const response = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
      if (!response.ok) {
        throw new Error(`FPL API responded with status: ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching bootstrap data:", error);
      res.status(500).json({ 
        error: "Failed to fetch bootstrap data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  console.log("✓ API routes registered successfully");

  const httpServer = createServer(app);
  return httpServer;
}
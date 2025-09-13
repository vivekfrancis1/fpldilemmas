import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { priceScheduler } from "./price-scheduler";
import { gameweekCacheScheduler } from "./gameweek-cache-scheduler";
import { priceSplitWorker } from "./price-split-worker";
import { projectionCacheScheduler } from "./projection-cache-scheduler";
import { fplScoringCacheScheduler } from "./fpl-scoring-cache-scheduler";
import { setupVite, serveStatic, log } from "./vite";
import { seedContentCreators } from "./seed-database";
import { seedAdminUser } from "./seed-admin-user";
import { productionCacheInitializer } from "./production-cache-initializer";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for deployment verification
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);
    
    // Seed database with initial data
    await seedContentCreators();
    await seedAdminUser();
    
    // Initialize production cache if needed (only runs if cache is empty)
    await productionCacheInitializer.initializeProductionCache();

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error for debugging but don't crash the application
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      
      // Start schedulers after server is running
      console.log("🚀 Starting schedulers...");
      
      // Start price scheduler if it has a start method
      if (typeof priceScheduler.start === 'function') {
        priceScheduler.start();
        console.log("✓ Price scheduler started");
      }
      
      // Start price split worker if it has a start method
      if (typeof priceSplitWorker.start === 'function') {
        priceSplitWorker.start();
        console.log("✓ Price split worker started");
      }
      
      // Start gameweek cache scheduler
      gameweekCacheScheduler.start();
      console.log("✓ Gameweek cache scheduler started");
      
      // Start projection cache scheduler (runs at 7 AM and 7 PM daily)
      projectionCacheScheduler.start();
      console.log("✓ Projection cache scheduler started");
      
      // Start FPL scoring cache scheduler (runs twice daily)
      fplScoringCacheScheduler.start();
      console.log("✓ FPL scoring cache scheduler started");
      
      // Start daily projections scheduler (runs at 3 AM daily for ultra-fast performance)
      import('./daily-projections-scheduler').then(({ dailyProjectionsScheduler }) => {
        dailyProjectionsScheduler.start();
        console.log("✓ Daily projections scheduler started");
      }).catch((error) => {
        console.error("Failed to start daily projections scheduler:", error);
      });
    });

    // Handle server startup errors
    server.on('error', (err: any) => {
      console.error('Server startup error:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
})();

import express, { type Request, Response, NextFunction } from "express";
import { setupAuth } from "./replitAuth";
import { registerRoutes } from "./routes";
import { priceScheduler } from "./price-scheduler";
import { gameweekCacheScheduler } from "./gameweek-cache-scheduler";
import { priceSplitWorker } from "./price-split-worker";
import { projectionCacheScheduler } from "./projection-cache-scheduler";
import { fplScoringCacheScheduler } from "./fpl-scoring-cache-scheduler";
// TWEETS PAUSED — re-enable when X Developer API plan is active
// import { twitterScheduler } from "./twitter-scheduler";
// import { deadlineTweetScheduler } from "./deadline-tweet-scheduler";
import { projectionAccuracyScheduler } from "./projection-accuracy-scheduler";
import { setupVite, serveStatic, log } from "./vite";
import { seedContentCreators } from "./seed-database";
import { seedAdminUser } from "./seed-admin-user";
import { seedManagerProfiles } from "./seed-manager-profiles";
import { productionCacheInitializer } from "./production-cache-initializer";
import { initializeGlobalOrchestrator } from "./routes";

// SIGHUP is sent by the Replit environment at ~T+30s — ignore it to prevent silent process termination.
// Without this handler Node.js's default SIGHUP behaviour exits the process with no error log.
process.on('SIGHUP', () => {
  console.log(`[server] SIGHUP received (uptime=${Math.round(process.uptime())}s) — continuing`);
});

// Surface unhandled async errors so crashes are never silent
process.on('uncaughtException',  (err)    => { console.error('[server] uncaughtException:', err);    process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error('[server] unhandledRejection:', reason); process.exit(1); });

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
    await setupAuth(app);
    const server = await registerRoutes(app);
    
    // Seed database with initial data
    await seedContentCreators();
    await seedAdminUser();
    seedManagerProfiles().catch(err => console.warn("Manager profiles seed error:", err));

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
    }, async () => {
      log(`serving on port ${port}`);
      
      // Initialize production cache with dependency management (only runs if cache is empty)
      console.log("🔧 Initializing dependency orchestrator...");
      const orchestrator = initializeGlobalOrchestrator();
      
      // Register cache jobs with global orchestrator
      await productionCacheInitializer.initializeProductionCache(orchestrator);
      
      // Execute all dependency jobs before starting schedulers
      await orchestrator.executeAll();
      console.log("✅ Global dependency orchestrator execution completed");
      
      // Start schedulers after server is running
      console.log("🚀 Starting schedulers...");
      
      // Price scheduler and price split worker auto-start in constructor
      console.log("✓ Price scheduler started");
      console.log("✓ Price split worker started");
      
      // Start gameweek cache scheduler
      gameweekCacheScheduler.start();
      console.log("✓ Gameweek cache scheduler started");
      
      // Start projection cache scheduler (runs at 7 AM and 7 PM daily)
      projectionCacheScheduler.start();
      console.log("✓ Projection cache scheduler started");
      
      // Start FPL scoring cache scheduler (runs twice daily)
      // Delayed by 10 minutes to avoid concurrent memory spikes with projection cache (which runs at T+3min)
      setTimeout(() => {
        fplScoringCacheScheduler.start();
        console.log("✓ FPL scoring cache scheduler started (delayed)");
      }, 25 * 60 * 1000);
      console.log("✓ FPL scoring cache scheduler queued (starts in 25 minutes)");
      
      // TWEETS PAUSED — re-enable when X Developer API plan is active
      // twitterScheduler.start();
      // console.log("✓ Twitter scheduler started");

      // deadlineTweetScheduler.start();
      // console.log("✓ Deadline tweet scheduler started");

      // import('./services/liveGoalMonitor').then(({ liveGoalMonitor }) => {
      //   liveGoalMonitor.start();
      //   console.log("✓ Live goal monitor started");
      // }).catch((error) => {
      //   console.error("Failed to start live goal monitor:", error);
      // });
      
      // Start daily projections scheduler (runs at 3 AM daily for ultra-fast performance)
      import('./daily-projections-scheduler').then(({ dailyProjectionsScheduler }) => {
        dailyProjectionsScheduler.start();
        console.log("✓ Daily projections scheduler started");
      }).catch((error) => {
        console.error("Failed to start daily projections scheduler:", error);
      });
      
      // Start projection accuracy scheduler (tracks GW25-38 projections vs actuals)
      projectionAccuracyScheduler.start();
      console.log("✓ Projection accuracy scheduler started");
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

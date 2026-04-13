/**
 * Production Cache Initializer with Dependency Management
 * Eliminates race conditions through proper initialization ordering
 * Uses InitializationOrchestrator to ensure team data is ready before player aggregation
 */

import { db } from "./db";
import { playerGoalsProjections, playerAssistProjections, playerMinutesProjections, gameweekProjectionSnapshots } from "@shared/schema";
import { internalFetch } from "./config";
import { sql } from "drizzle-orm";
import { InitializationOrchestrator, JobDefinition } from "./initialization-orchestrator";
import { prefetchAllPlayerHistories } from "./player-history-service";

export class ProductionCacheInitializer {
  private readonly INITIALIZATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes max
  
  /**
   * Initialize critical cache data with dependency management
   */
  async initializeProductionCache(globalOrchestrator?: InitializationOrchestrator): Promise<void> {
    console.log("🚀 Starting dependency-aware cache initialization...");
    
    try {
      // Set overall timeout for initialization
      const initPromise = this.performDependencyAwareInitialization(globalOrchestrator);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Cache initialization timeout")), this.INITIALIZATION_TIMEOUT);
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log("✅ Dependency-aware cache initialization completed successfully");
      
    } catch (error) {
      console.error("❌ Cache initialization failed:", error);
      console.log("⚠️ Application will continue with slower initial loading times");
      // Don't throw - let the app start anyway
    }
  }
  
  private async performDependencyAwareInitialization(globalOrchestrator?: InitializationOrchestrator): Promise<void> {
    // Check which caches need population
    const cacheStatus = await this.checkCacheStatus();
    
    if (cacheStatus.needsInitialization) {
      console.log("📊 Cache tables need population - using dependency-aware initialization...");
      
      // Use global orchestrator if provided, otherwise create new one
      const orchestrator = globalOrchestrator || new InitializationOrchestrator();
      
      // Register jobs with proper dependencies
      this.registerCacheJobs(orchestrator, cacheStatus);
      
      // Execute all jobs respecting dependencies (only if using local orchestrator)
      if (!globalOrchestrator) {
        await orchestrator.executeAll();
        console.log("🎯 Dependency-aware cache population completed");
      } else {
        console.log("🎯 Cache jobs registered with global orchestrator - will be executed in dependency order");
      }
    } else {
      console.log("✅ Cache data already present - skipping initialization");
    }
  }
  
  private async checkCacheStatus(): Promise<{
    needsInitialization: boolean;
    hasRecentSnapshots: boolean;
    goalsEmpty: boolean;
    assistsEmpty: boolean;
    minutesEmpty: boolean;
  }> {
    try {
      const [goalsCount, assistsCount, minutesCount, snapshotCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(playerGoalsProjections),
        db.select({ count: sql<number>`count(*)` }).from(playerAssistProjections),
        db.select({ count: sql<number>`count(*)` }).from(playerMinutesProjections),
        db.select({ count: sql<number>`count(*)` }).from(gameweekProjectionSnapshots)
      ]);
      
      const goalsEmpty = (goalsCount[0]?.count || 0) < 100;
      const assistsEmpty = (assistsCount[0]?.count || 0) < 100;
      const minutesEmpty = (minutesCount[0]?.count || 0) < 100;
      const hasRecentSnapshots = (snapshotCount[0]?.count || 0) > 0;
      
      console.log(`📊 Cache status - Goals: ${goalsCount[0]?.count || 0}, Assists: ${assistsCount[0]?.count || 0}, Minutes: ${minutesCount[0]?.count || 0}, Snapshots: ${snapshotCount[0]?.count || 0}`);
      
      if (hasRecentSnapshots) {
        console.log("📦 DB has recent projection snapshots - lightweight startup (bootstrap + histories only)");
      }
      
      return {
        needsInitialization: true, // Always run at least the lightweight bootstrap + history jobs
        hasRecentSnapshots,
        goalsEmpty,
        assistsEmpty,
        minutesEmpty
      };
    } catch (error) {
      console.error("Error checking cache status:", error);
      return {
        needsInitialization: true,
        hasRecentSnapshots: false,
        goalsEmpty: true,
        assistsEmpty: true,
        minutesEmpty: true
      };
    }
  }
  
  private async populateGoalsCache(): Promise<void> {
    try {
      console.log("⚽ Populating goals cache...");
      const response = await internalFetch("api/player-goals-scored-projections");
      if (response.ok) {
        console.log("✅ Goals cache populated");
      } else {
        throw new Error(`Goals API failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to populate goals cache:", error);
    }
  }
  
  private async populateAssistsCache(): Promise<void> {
    try {
      console.log("🎯 Populating assists cache...");
      const response = await internalFetch("api/player-assist-projections");
      if (response.ok) {
        console.log("✅ Assists cache populated");
      } else {
        throw new Error(`Assists API failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to populate assists cache:", error);
    }
  }
  
  private async populateMinutesCache(): Promise<void> {
    try {
      console.log("⏱️ Populating minutes cache...");
      const response = await internalFetch("api/player-minutes-projections");
      if (response.ok) {
        console.log("✅ Minutes cache populated");
      } else {
        throw new Error(`Minutes API failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to populate minutes cache:", error);
    }
  }

  /**
   * Register cache population jobs with proper dependencies
   */
  private registerCacheJobs(orchestrator: InitializationOrchestrator, cacheStatus: any): void {
    // Job 1: Bootstrap data (no dependencies) — uses internal endpoint to warm the shared cache
    orchestrator.registerJob({
      id: 'bootstrap-data',
      name: 'Bootstrap FPL Data',
      dependencies: [],
      executor: async () => {
        console.log("📡 Loading bootstrap data from FPL API...");
        const response = await internalFetch("api/bootstrap-static");
        if (!response.ok) {
          throw new Error(`Failed to load bootstrap data: ${response.status}`);
        }
        await response.json(); // Parse to ensure data is fully cached
        console.log("✅ Bootstrap data loaded and cached successfully");
      },
      timeout: 60000 // 60 seconds for network calls
    });

    // Job: Always warm TeamGoalsService — runs on every restart so downstream endpoints never hit a cold cache
    orchestrator.registerJob({
      id: 'team-goals-warmup',
      name: 'TeamGoals Service Warmup',
      dependencies: ['bootstrap-data'],
      executor: async () => {
        console.log("🔥 Pre-warming TeamGoalsService...");
        const bootstrapResp = await internalFetch("api/bootstrap-static");
        const bootstrapData = await bootstrapResp.json();
        const currentGW = bootstrapData.events.find((e: any) => e.is_current)?.id || 1;
        const { TeamGoalsService } = await import('./team-goals-service');
        await TeamGoalsService.getTeamGoalProjections(currentGW + 1, Math.min(currentGW + 12, 39));
        console.log("✅ TeamGoalsService pre-warmed successfully");
      },
      timeout: 60000
    });

    // Job 2: Player history prefetch (depends on bootstrap)
    // On normal restarts (DB has snapshots): fire-and-forget so startup is not blocked.
    // On first-time startup: await so the aggregation job has data to work with.
    const hasSnapshots = cacheStatus.hasRecentSnapshots;
    orchestrator.registerJob({
      id: 'player-histories',
      name: 'Player History Prefetch',
      dependencies: ['bootstrap-data'],
      executor: async () => {
        const response = await internalFetch("api/bootstrap-static");
        const bootstrapData = await response.json();
        const playerIds: number[] = bootstrapData.elements
          .filter((p: any) => (p.minutes || 0) >= 1)
          .map((p: any) => p.id);
        const finishedGW: number = bootstrapData.events.filter((e: any) => e.finished).length;
        // When histories are GW-stale and fully re-fetched, clear the goal/assist share caches
        // and re-run the scoring cache so the next DB snapshot uses fresh player history data.
        const onHistoryRefreshComplete = () => {
          // Clear share caches so next scoring re-run computes fresh goal/assist share from DB
          import('./goal-share-cache').then(({ clearGoalShareCaches }) => {
            clearGoalShareCaches();
          }).catch(console.error);

          // Retry until the existing scoring update lock is released, then re-run
          const attemptScoringRefresh = (attemptsLeft: number) => {
            import('./fpl-scoring-cache-service').then(({ FPLScoringCacheService }) => {
              if ((FPLScoringCacheService as any).updateLock) {
                if (attemptsLeft > 0) {
                  setTimeout(() => attemptScoringRefresh(attemptsLeft - 1), 30000);
                } else {
                  console.warn("⚠️ Could not run post-history scoring refresh — lock never released");
                }
                return;
              }
              console.log("🔄 Re-running scoring cache after player history refresh (fresh GW data)...");
              new FPLScoringCacheService().updateAllScoringData().catch(e =>
                console.warn("⚠️ Post-history scoring cache re-run failed:", e)
              );
            }).catch(console.error);
          };
          // Give the current scoring run 30s to finish, then attempt up to 10 times (5 min window)
          setTimeout(() => attemptScoringRefresh(10), 30000);
        };
        if (hasSnapshots) {
          console.log("📚 Player history prefetch starting in background (non-blocking)...");
          prefetchAllPlayerHistories(playerIds, finishedGW, onHistoryRefreshComplete).catch(e =>
            console.warn("⚠️ Background player history prefetch error:", e)
          );
        } else {
          console.log("📚 Prefetching player histories to DB cache (first-time setup)...");
          await prefetchAllPlayerHistories(playerIds, finishedGW, onHistoryRefreshComplete);
        }
      },
      timeout: hasSnapshots ? 10000 : 300000
    });

    // Heavy jobs: only run when DB has no recent snapshot data (first-ever startup)
    // On normal restarts, DB already has fresh snapshots — skip the 3-second 15MB aggregation
    if (!cacheStatus.hasRecentSnapshots) {
      console.log("🆕 No snapshots found — registering full aggregation jobs for first-time startup");

      if (cacheStatus.goalsEmpty) {
        orchestrator.registerJob({
          id: 'team-goals',
          name: 'Team Goal Projections',
          dependencies: ['bootstrap-data'],
          executor: () => this.populateGoalsCache(),
          timeout: 120000
        });
      }

      if (cacheStatus.assistsEmpty) {
        orchestrator.registerJob({
          id: 'team-assists',
          name: 'Team Assist Projections',
          dependencies: ['bootstrap-data'],
          executor: () => this.populateAssistsCache(),
          timeout: 120000
        });
      }

      if (cacheStatus.minutesEmpty) {
        orchestrator.registerJob({
          id: 'team-minutes',
          name: 'Team Minutes Projections',
          dependencies: ['bootstrap-data'],
          executor: () => this.populateMinutesCache(),
          timeout: 120000
        });
      }

      const teamDependencies: string[] = ['player-histories'];
      if (cacheStatus.goalsEmpty) teamDependencies.push('team-goals');
      if (cacheStatus.assistsEmpty) teamDependencies.push('team-assists');
      if (cacheStatus.minutesEmpty) teamDependencies.push('team-minutes');

      orchestrator.registerJob({
        id: 'player-total-points',
        name: 'Player Total Points Aggregation',
        dependencies: teamDependencies,
        executor: () => this.populatePlayerTotalPointsCache(),
        timeout: 180000
      });
    } else {
      // Snapshots exist in DB — mark scoring cache as recently run to prevent
      // the T+25 min scheduler from triggering an unnecessary aggregation cycle.
      // Also kick off a background re-aggregation asynchronously so that any
      // stale or 0-value snapshots (e.g. from the old public-URL bug) are
      // corrected within ~2 minutes without blocking server startup.
      orchestrator.registerJob({
        id: 'mark-scoring-cache-fresh',
        name: 'Mark Scoring Cache Fresh',
        dependencies: ['player-histories'],
        executor: async () => {
          const { FPLScoringCacheService } = await import('./fpl-scoring-cache-service');
          FPLScoringCacheService.lastRunAt = new Date();
          console.log("✅ Scoring cache marked fresh — startup aggregation skipped (DB has recent snapshots)");

          // Fire-and-forget background refresh so stale/0-value snapshots get corrected
          console.log("🔄 Scheduling background scoring cache refresh to correct any stale values...");
          setTimeout(async () => {
            try {
              console.log("🚀 Background scoring cache refresh starting...");
              const { fplScoringCacheService } = await import('./fpl-scoring-cache-service');
              await fplScoringCacheService.updateAllScoringData();
              console.log("✅ Background scoring cache refresh completed successfully");
            } catch (err) {
              console.warn("⚠️ Background scoring cache refresh failed (non-fatal):", err);
            }
          }, 30000); // 30s delay — lets all startup warmup jobs finish first
        },
        timeout: 5000
      });
    }
  }

  /**
   * Populate player total points cache by triggering aggregation
   */
  private async populatePlayerTotalPointsCache(): Promise<void> {
    try {
      console.log("🎯 Populating player total points cache via aggregator...");
      const { fplScoringCacheService } = await import('./fpl-scoring-cache-service');
      await fplScoringCacheService.updateAllScoringData();
      console.log("✅ Player total points cache populated");
    } catch (error) {
      console.error("❌ Failed to populate player total points cache:", error);
    }
  }
}

// Create singleton instance
export const productionCacheInitializer = new ProductionCacheInitializer();

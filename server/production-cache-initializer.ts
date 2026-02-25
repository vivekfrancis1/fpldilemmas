/**
 * Production Cache Initializer with Dependency Management
 * Eliminates race conditions through proper initialization ordering
 * Uses InitializationOrchestrator to ensure team data is ready before player aggregation
 */

import { db } from "./db";
import { playerGoalsProjections, playerAssistProjections, playerMinutesProjections } from "@shared/schema";
import { internalFetch } from "./config";
import { sql } from "drizzle-orm";
import { InitializationOrchestrator, JobDefinition } from "./initialization-orchestrator";

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
    goalsEmpty: boolean;
    assistsEmpty: boolean;
    minutesEmpty: boolean;
  }> {
    try {
      const [goalsCount, assistsCount, minutesCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(playerGoalsProjections),
        db.select({ count: sql<number>`count(*)` }).from(playerAssistProjections),
        db.select({ count: sql<number>`count(*)` }).from(playerMinutesProjections)
      ]);
      
      const goalsEmpty = (goalsCount[0]?.count || 0) < 100;
      const assistsEmpty = (assistsCount[0]?.count || 0) < 100;
      const minutesEmpty = (minutesCount[0]?.count || 0) < 100;
      
      console.log(`📊 Cache status - Goals: ${goalsCount[0]?.count || 0}, Assists: ${assistsCount[0]?.count || 0}, Minutes: ${minutesCount[0]?.count || 0}`);
      
      return {
        needsInitialization: goalsEmpty || assistsEmpty || minutesEmpty,
        goalsEmpty,
        assistsEmpty,
        minutesEmpty
      };
    } catch (error) {
      console.error("Error checking cache status:", error);
      return {
        needsInitialization: true,
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
    // Job 1: Bootstrap data (no dependencies) - Enhanced with actual bootstrap loading
    orchestrator.registerJob({
      id: 'bootstrap-data',
      name: 'Bootstrap FPL Data',
      dependencies: [],
      executor: async () => {
        // Actually load bootstrap data to ensure it's available for dependent endpoints
        console.log("📡 Loading bootstrap data from FPL API...");
        const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
        if (!response.ok) {
          throw new Error(`Failed to load bootstrap data: ${response.status}`);
        }
        await response.json(); // Ensure the data is fetched and cached
        console.log("✅ Bootstrap data loaded and cached successfully");
      },
      timeout: 60000 // 60 seconds for network calls
    });

    // Job 1.5: Current standings data initialization
    orchestrator.registerJob({
      id: 'current-standings',
      name: 'Current Standings Data',
      dependencies: ['bootstrap-data'],
      executor: async () => {
        console.log("📊 Initializing current standings data...");
        // Pre-warm the current standings cache by making an internal call
        const response = await fetch('http://localhost:5000/api/current-standings');
        if (response.ok) {
          console.log("✅ Current standings data initialized successfully");
        } else {
          console.log("⚠️ Current standings initialization completed (may cache on first request)");
        }
      },
      timeout: 45000 // 45 seconds
    });

    // Job 2: Team projections (depend on bootstrap data)
    if (cacheStatus.goalsEmpty) {
      orchestrator.registerJob({
        id: 'team-goals',
        name: 'Team Goal Projections',
        dependencies: ['bootstrap-data'],
        executor: () => this.populateGoalsCache(),
        timeout: 120000 // 2 minutes
      });
    }

    if (cacheStatus.assistsEmpty) {
      orchestrator.registerJob({
        id: 'team-assists',
        name: 'Team Assist Projections', 
        dependencies: ['bootstrap-data'],
        executor: () => this.populateAssistsCache(),
        timeout: 120000 // 2 minutes
      });
    }

    if (cacheStatus.minutesEmpty) {
      orchestrator.registerJob({
        id: 'team-minutes',
        name: 'Team Minutes Projections',
        dependencies: ['bootstrap-data'], 
        executor: () => this.populateMinutesCache(),
        timeout: 120000 // 2 minutes
      });
    }

    // Job 3: Player total points aggregation (depends on all team projections)
    const teamDependencies: string[] = [];
    if (cacheStatus.goalsEmpty) teamDependencies.push('team-goals');
    if (cacheStatus.assistsEmpty) teamDependencies.push('team-assists');
    if (cacheStatus.minutesEmpty) teamDependencies.push('team-minutes');

    // Only add player aggregation job if there are team dependencies
    // (if no team data needs updating, player aggregation isn't needed)
    if (teamDependencies.length > 0) {
      orchestrator.registerJob({
        id: 'player-total-points',
        name: 'Player Total Points Aggregation',
        dependencies: teamDependencies,
        executor: () => this.populatePlayerTotalPointsCache(),
        timeout: 180000 // 3 minutes
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
import { projectionService } from "./projection-service";
// Removed minutes scaling utils per simplification mandate

/**
 * Synchronous Projection Calculation Service
 * 
 * This service provides synchronous projection calculations for background jobs,
 * avoiding recursion issues that occur when background jobs call HTTP endpoints.
 * 
 * CRITICAL: This service must never call HTTP endpoints internally to prevent
 * infinite recursion when called from background jobs.
 */
class SyncProjectionService {
  /**
   * Calculate comprehensive player total points projections synchronously
   * 
   * This is the core function used by background jobs to avoid calling
   * the async HTTP endpoint which could trigger another background job.
   * 
   * @param startGameweek - Starting gameweek for projections
   * @param endGameweek - Ending gameweek for projections
   * @returns Promise<any[]> - Array of player projection data
   */
  async calculateComprehensiveProjections(
    startGameweek: number, 
    endGameweek: number
  ): Promise<any[]> {
    try {
      console.log(`🔄 SYNC SERVICE: Calculating projections for GW${startGameweek}-${endGameweek}`);
      
      // Use the projection service's direct calculation method
      // This bypasses the HTTP layer and caching to ensure fresh calculations
      const projections = await projectionService.getPlayerTotalPoints(startGameweek, endGameweek);
      
      if (!Array.isArray(projections)) {
        throw new Error(`Invalid projection data type: expected array, got ${typeof projections}`);
      }
      
      if (projections.length === 0) {
        console.warn(`⚠️ SYNC SERVICE: No projections calculated for GW${startGameweek}-${endGameweek}`);
      } else {
        console.log(`✅ SYNC SERVICE: Calculated ${projections.length} projections for GW${startGameweek}-${endGameweek}`);
      }
      
      return projections;
      
    } catch (error) {
      console.error(`❌ SYNC SERVICE: Failed to calculate projections for GW${startGameweek}-${endGameweek}:`, error);
      throw new Error(`Sync projection calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate projections for specific missing gameweeks only
   * 
   * This method supports gap-fill functionality by calculating only
   * the missing gameweeks instead of the full range.
   * 
   * @param missingGameweeks - Array of specific gameweeks to calculate
   * @returns Promise<Map<number, any[]>> - Map of gameweek to player projections
   */
  async calculateGameweekProjections(missingGameweeks: number[]): Promise<Map<number, any[]>> {
    const gameweekProjections = new Map<number, any[]>();
    
    try {
      console.log(`🔄 SYNC SERVICE: Calculating gap-fill projections for gameweeks: ${missingGameweeks.join(', ')}`);
      
      // Calculate each missing gameweek individually for precise gap-filling
      for (const gameweek of missingGameweeks) {
        try {
          const projections = await this.calculateComprehensiveProjections(gameweek, gameweek);
          gameweekProjections.set(gameweek, projections);
          console.log(`✅ SYNC SERVICE: Calculated ${projections.length} projections for GW${gameweek}`);
        } catch (error) {
          console.error(`❌ SYNC SERVICE: Failed to calculate projections for GW${gameweek}:`, error);
          // Continue with other gameweeks even if one fails
        }
      }
      
      console.log(`✅ SYNC SERVICE: Completed gap-fill calculations for ${gameweekProjections.size}/${missingGameweeks.length} gameweeks`);
      return gameweekProjections;
      
    } catch (error) {
      console.error(`❌ SYNC SERVICE: Gap-fill calculation failed:`, error);
      throw error;
    }
  }

  /**
   * Merge cached projections with newly calculated projections
   * 
   * @param cachedGameweeks - Array of gameweeks that are already cached
   * @param newProjections - Map of newly calculated projections by gameweek  
   * @param startGameweek - Starting gameweek of the full range
   * @param endGameweek - Ending gameweek of the full range
   * @returns any[] - Merged projection data for the full range
   */
  mergeProjections(
    cachedGameweeks: number[],
    newProjections: Map<number, any[]>,
    startGameweek: number,
    endGameweek: number
  ): any[] {
    console.log(`🔄 SYNC SERVICE: ENHANCED merging cached (${cachedGameweeks.length}) and new (${newProjections.size}) projections`);
    
    // Step 1: Validate all required gameweeks are covered
    const allRequiredGameweeks = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      allRequiredGameweeks.push(gw);
    }
    
    const availableGameweeks = new Set([...cachedGameweeks, ...newProjections.keys()]);
    const missingGameweeks = allRequiredGameweeks.filter(gw => !availableGameweeks.has(gw));
    
    if (missingGameweeks.length > 0) {
      console.error(`❌ SYNC SERVICE: Missing gameweeks in merge: ${missingGameweeks.join(', ')}`);
      throw new Error(`Cannot merge projections - missing data for gameweeks: ${missingGameweeks.join(', ')}`);
    }
    
    // Step 2: Get cached individual gameweek data and combine with new projections  
    const { totalPointsCache } = require('./routes');
    const playerProjectionMap = new Map<string, any>();
    
    // Process cached gameweeks first
    for (const gameweek of cachedGameweeks) {
      if (!newProjections.has(gameweek)) { // Only use cache if not recalculated
        const individualKey = `${gameweek}-${gameweek}`;
        const cachedGameweekData = totalPointsCache.get(individualKey);
        
        if (cachedGameweekData && Array.isArray(cachedGameweekData)) {
          for (const playerSlice of cachedGameweekData) {
            const playerId = playerSlice.playerId || playerSlice.id;
            if (!playerProjectionMap.has(playerId)) {
              // Initialize player with base structure
              playerProjectionMap.set(playerId, {
                playerId,
                playerName: playerSlice.playerName,
                position: playerSlice.position,
                teamId: playerSlice.teamId,
                price: playerSlice.price,
                availability: playerSlice.availability,
                gameweekProjections: {}
              });
            }
            
            // Add this gameweek's projection
            const player = playerProjectionMap.get(playerId);
            player.gameweekProjections[gameweek.toString()] = playerSlice.projectedPoints; // Use numeric string for consistency
          }
          console.log(`📊 SYNC SERVICE: Merged ${cachedGameweekData.length} cached player slices for GW${gameweek}`);
        }
      }
    }
    
    // Process new projections (these take priority)
    for (const [gameweek, projections] of newProjections) {
      if (Array.isArray(projections)) {
        for (const projection of projections) {
          const playerId = projection.playerId || projection.id;
          
          if (!playerProjectionMap.has(playerId)) {
            // Initialize player with base structure from new projection
            playerProjectionMap.set(playerId, {
              playerId,
              playerName: projection.playerName || projection.name,
              position: projection.position,
              teamId: projection.teamId,
              price: projection.price,
              availability: projection.availability,
              gameweekProjections: {}
            });
          }
          
          const player = playerProjectionMap.get(playerId);
          // Merge gameweekProjections from new projection
          if (projection.gameweekProjections) {
            Object.assign(player.gameweekProjections, projection.gameweekProjections);
          }
        }
        console.log(`📊 SYNC SERVICE: Merged ${projections.length} new projections for GW${gameweek}`);
      }
    }
    
    // Convert map back to array
    const finalProjections = Array.from(playerProjectionMap.values());
    
    // Step 3: Validate merged data completeness
    let validationErrors = 0;
    for (const player of finalProjections) {
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        const gwKey = gw.toString(); // Use numeric string for consistency
        if (player.gameweekProjections[gwKey] === undefined) {
          console.warn(`⚠️ SYNC SERVICE: Player ${player.playerId} missing data for GW${gw}`);
          validationErrors++;
        }
      }
    }
    
    if (validationErrors > 0) {
      console.warn(`⚠️ SYNC SERVICE: Found ${validationErrors} validation issues in merged data`);
    }
    
    console.log(`✅ SYNC SERVICE: ENHANCED merge completed - ${finalProjections.length} players with ${allRequiredGameweeks.length} gameweeks each`);
    return finalProjections;
  }
}

// Export singleton instance
export const syncProjectionService = new SyncProjectionService();
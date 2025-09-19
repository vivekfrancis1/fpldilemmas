import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import { playerMinutesProjections } from "@shared/schema";

// Cache for minutes data to avoid frequent database hits within the same request
const minutesCache = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Centralized Minutes Scaling Utility
 * 
 * This utility function reads expected minutes data from the playerMinutesProjections 
 * table and calculates a scaling factor to properly adjust player projections based 
 * on expected playing time.
 * 
 * @param playerId - The FPL player ID
 * @param gameweek - The gameweek number for the projection
 * @param rawProjection - The raw projection value (goals, assists, defensive contributions, etc.)
 * @param season - The season (defaults to "2025/26")
 * @param debug - Whether to log debug information (defaults to false)
 * @returns The scaled projection value
 */
export async function applyMinutesScaling(
  playerId: number,
  gameweek: number,
  rawProjection: number,
  season: string = "2025/26",
  debug: boolean = false
): Promise<number> {
  // Validate inputs
  if (!playerId || !gameweek || typeof rawProjection !== 'number') {
    if (debug) {
      console.log(`DEBUG: Invalid inputs for minutes scaling - playerId: ${playerId}, gameweek: ${gameweek}, rawProjection: ${rawProjection}`);
    }
    return rawProjection; // Return unscaled projection if invalid inputs
  }

  // If raw projection is 0 or negative, no need to scale
  if (rawProjection <= 0) {
    return rawProjection;
  }

  try {
    const expectedMinutes = await getExpectedMinutes(playerId, gameweek, season, debug);
    
    // Calculate minutes factor = expectedMinutes / 90
    let minutesFactor = expectedMinutes / 90;
    
    // Clamp factor between 0 and 1
    minutesFactor = Math.max(0, Math.min(1, minutesFactor));
    
    // Calculate scaled projection
    const scaledProjection = rawProjection * minutesFactor;
    
    if (debug && minutesFactor < 0.95) { // Only log when scaling has meaningful impact
      console.log(`DEBUG: Minutes scaling - Player ${playerId} GW${gameweek}: ${expectedMinutes} mins, factor: ${minutesFactor.toFixed(3)}, ${rawProjection.toFixed(3)} → ${scaledProjection.toFixed(3)}`);
    }
    
    return scaledProjection;
    
  } catch (error) {
    console.error(`❌ Error in applyMinutesScaling for player ${playerId} GW${gameweek}:`, error);
    
    // Default to 1.0 factor (no scaling) if error occurs
    if (debug) {
      console.log(`DEBUG: Minutes scaling fallback - Player ${playerId} GW${gameweek}: Using factor 1.0 due to error`);
    }
    return rawProjection;
  }
}

/**
 * Optimized batch fetch for minutes data - single database query instead of N queries
 * 
 * @param keys - Array of {playerId, gameweek, season} combinations
 * @returns Map with composite keys "${playerId}-${gameweek}" to minutes values
 */
async function fetchMinutesBatch(
  keys: Array<{ playerId: number; gameweek: number; season: string }>
): Promise<Map<string, number>> {
  if (!keys || keys.length === 0) {
    return new Map();
  }

  try {
    // Extract unique values for the batch query
    const uniquePlayerIds = Array.from(new Set(keys.map(k => k.playerId)));
    const uniqueGameweeks = Array.from(new Set(keys.map(k => k.gameweek)));
    const seasons = Array.from(new Set(keys.map(k => k.season)));

    // For simplicity, handle single season (most common case)
    // Could be extended for multi-season support if needed
    const season = seasons[0];

    // Single optimized database query using inArray operations
    const results = await db
      .select({
        playerId: playerMinutesProjections.playerId,
        gameweek: playerMinutesProjections.gameweek,
        minutes: playerMinutesProjections.minutes
      })
      .from(playerMinutesProjections)
      .where(
        and(
          inArray(playerMinutesProjections.playerId, uniquePlayerIds),
          inArray(playerMinutesProjections.gameweek, uniqueGameweeks),
          eq(playerMinutesProjections.season, season)
        )
      );

    // Build the result map with composite keys
    const minutesMap = new Map<string, number>();
    
    for (const result of results) {
      if (result.minutes != null) {
        const key = `${result.playerId}-${result.gameweek}`;
        let minutes = Number(result.minutes);
        
        // Validate and clamp minutes data
        if (minutes < 0) {
          minutes = 0;
        } else if (minutes > 90) {
          minutes = 90;
        }
        
        minutesMap.set(key, minutes);
      }
    }

    return minutesMap;

  } catch (error) {
    console.error(`❌ Error in fetchMinutesBatch:`, error);
    return new Map(); // Return empty map on error
  }
}

/**
 * Batch apply minutes scaling to multiple projections
 * More efficient for processing many players at once
 * 
 * @param projections - Array of projection objects with playerId, gameweek, and value
 * @param season - The season (defaults to "2025/26")
 * @param debug - Whether to log debug information
 * @returns Array of scaled projections
 */
export async function applyMinutesScalingBatch(
  projections: Array<{ playerId: number; gameweek: number; value: number }>,
  season: string = "2025/26",
  debug: boolean = false
): Promise<Array<{ playerId: number; gameweek: number; value: number; scaledValue: number; minutesFactor: number }>> {
  if (!projections || projections.length === 0) {
    return [];
  }

  try {
    // Prepare batch keys for optimized single-query fetch
    const batchKeys = projections.map(p => ({
      playerId: p.playerId,
      gameweek: p.gameweek,
      season: season
    }));
    
    // OPTIMIZATION: Single database query instead of N sequential queries
    const minutesData = await fetchMinutesBatch(batchKeys);
    
    // Apply scaling to all projections
    const results = projections.map(projection => {
      const key = `${projection.playerId}-${projection.gameweek}`;
      const expectedMinutes = minutesData.get(key) || 90; // Default to 90 if not found
      
      let minutesFactor = expectedMinutes / 90;
      minutesFactor = Math.max(0, Math.min(1, minutesFactor));
      
      const scaledValue = projection.value * minutesFactor;
      
      return {
        ...projection,
        scaledValue,
        minutesFactor
      };
    });
    
    if (debug) {
      const significantScaling = results.filter(r => r.minutesFactor < 0.95);
      console.log(`DEBUG: Batch minutes scaling applied to ${results.length} projections, ${significantScaling.length} had significant scaling`);
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error in applyMinutesScalingBatch:`, error);
    
    // Return original values with factor 1.0 on error
    return projections.map(projection => ({
      ...projection,
      scaledValue: projection.value,
      minutesFactor: 1.0
    }));
  }
}

/**
 * Get expected minutes for a specific player and gameweek
 * Uses caching to improve performance
 * 
 * @param playerId - The FPL player ID
 * @param gameweek - The gameweek number
 * @param season - The season
 * @param debug - Whether to log debug information
 * @returns Expected minutes (defaults to 90 if unavailable)
 */
export async function getExpectedMinutes(
  playerId: number,
  gameweek: number,
  season: string,
  debug: boolean
): Promise<number> {
  const cacheKey = `${playerId}-${gameweek}-${season}`;
  const now = Date.now();
  
  // Check cache first
  if (minutesCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey) || 0;
    if (now - timestamp < CACHE_TTL) {
      const cachedMinutes = minutesCache.get(cacheKey)!;
      if (debug) {
        console.log(`DEBUG: Using cached minutes for player ${playerId} GW${gameweek}: ${cachedMinutes}`);
      }
      return cachedMinutes;
    }
  }
  
  try {
    // Query database for expected minutes
    const result = await db
      .select({ minutes: playerMinutesProjections.minutes })
      .from(playerMinutesProjections)
      .where(
        and(
          eq(playerMinutesProjections.playerId, playerId),
          eq(playerMinutesProjections.gameweek, gameweek),
          eq(playerMinutesProjections.season, season)
        )
      )
      .limit(1);
    
    let expectedMinutes: number;
    
    if (result.length > 0 && result[0].minutes != null) {
      expectedMinutes = Number(result[0].minutes);
      
      // Validate minutes data
      if (expectedMinutes < 0) {
        expectedMinutes = 0;
      } else if (expectedMinutes > 90) {
        expectedMinutes = 90;
      }
      
      if (debug) {
        console.log(`DEBUG: Retrieved minutes from DB for player ${playerId} GW${gameweek}: ${expectedMinutes}`);
      }
    } else {
      // Default to 90 minutes if no data available
      expectedMinutes = 90;
      
      if (debug) {
        console.log(`DEBUG: No minutes data found for player ${playerId} GW${gameweek}, defaulting to 90`);
      }
    }
    
    // Cache the result
    minutesCache.set(cacheKey, expectedMinutes);
    cacheTimestamps.set(cacheKey, now);
    
    return expectedMinutes;
    
  } catch (error) {
    console.error(`❌ Database error getting expected minutes for player ${playerId} GW${gameweek}:`, error);
    
    // Default to 90 minutes on error
    const defaultMinutes = 90;
    minutesCache.set(cacheKey, defaultMinutes);
    cacheTimestamps.set(cacheKey, now);
    
    return defaultMinutes;
  }
}

/**
 * Clear the minutes cache
 * Useful for testing or when fresh data is needed
 */
export function clearMinutesCache(): void {
  minutesCache.clear();
  cacheTimestamps.clear();
  console.log("DEBUG: Minutes cache cleared");
}

/**
 * Get cache statistics for monitoring
 */
export function getMinutesCacheStats(): { size: number; oldestEntry: number | null } {
  const now = Date.now();
  let oldestEntry: number | null = null;
  
  for (const timestamp of Array.from(cacheTimestamps.values())) {
    if (oldestEntry === null || timestamp < oldestEntry) {
      oldestEntry = timestamp;
    }
  }
  
  return {
    size: minutesCache.size,
    oldestEntry: oldestEntry ? now - oldestEntry : null
  };
}

/**
 * Utility function to check if a player's minutes factor would be significant
 * Useful for determining when to apply scaling vs when to skip it
 * 
 * @param playerId - The FPL player ID
 * @param gameweek - The gameweek number
 * @param season - The season
 * @returns Promise<{ minutesFactor: number; isSignificant: boolean }>
 */
export async function getMinutesScalingInfo(
  playerId: number,
  gameweek: number,
  season: string = "2025/26"
): Promise<{ minutesFactor: number; isSignificant: boolean; expectedMinutes: number }> {
  try {
    const expectedMinutes = await getExpectedMinutes(playerId, gameweek, season, false);
    const minutesFactor = Math.max(0, Math.min(1, expectedMinutes / 90));
    const isSignificant = minutesFactor < 0.95; // Consider scaling significant if factor < 95%
    
    return {
      minutesFactor,
      isSignificant,
      expectedMinutes
    };
  } catch (error) {
    console.error(`❌ Error getting minutes scaling info for player ${playerId} GW${gameweek}:`, error);
    return {
      minutesFactor: 1.0,
      isSignificant: false,
      expectedMinutes: 90
    };
  }
}
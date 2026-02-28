import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useState, useCallback } from "react";

interface BatchProjectionsOptions {
  enabled?: boolean;
  staleTime?: number;
  batchSize?: number;
  maxConcurrency?: number;
}

interface BatchApiResponse<T> {
  data: T[];
  missingPlayerIds?: number[];
  gameweekRange: { start: number; end: number };
  totalPlayers: number;
  cachedPlayers: number;
}

interface PlayerGoalsProjection {
  playerId: number;
  playerName: string;
  teamName?: string;
  teamShort?: string;
  position?: string;
  gameweekProjections: { [gameweek: number]: number };
  projectedGoals: number;
  totalProjectedGoals: number;
}

interface PlayerAssistsProjection {
  playerId: number;
  playerName: string;
  teamShort?: string;
  position?: string;
  gameweekProjections: { [gameweek: string]: number };
  projectedAssists: number;
  totalProjectedAssists: number;
  assistShare: number;
}

// Feature flag for batch optimization
const ENABLE_BATCH_OPTIMIZATION = false;

// Utility function to chunk array into smaller batches
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Batch API request function
async function batchApiRequest<T>(
  endpoint: string,
  playerIds: number[],
  startGameweek: number,
  endGameweek: number
): Promise<BatchApiResponse<T>> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerIds,
      startGameweek,
      endGameweek,
    }),
  });

  if (!response.ok) {
    throw new Error(`Batch API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Process concurrent batches with controlled concurrency
async function processBatchesConcurrent<T>(
  endpoint: string,
  playerIdChunks: number[][],
  startGameweek: number,
  endGameweek: number,
  maxConcurrency: number = 3
): Promise<T[]> {
  const results: T[] = [];
  
  // Process batches with concurrency control
  for (let i = 0; i < playerIdChunks.length; i += maxConcurrency) {
    const concurrentChunks = playerIdChunks.slice(i, i + maxConcurrency);
    
    const batchPromises = concurrentChunks.map(chunk =>
      batchApiRequest<T>(endpoint, chunk, startGameweek, endGameweek)
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Flatten all batch results
    for (const batch of batchResults) {
      results.push(...batch.data);
    }
    
    console.log(`⚡ BATCH CLIENT: Processed ${Math.min(i + maxConcurrency, playerIdChunks.length)}/${playerIdChunks.length} batches`);
  }
  
  return results;
}

/**
 * Custom hook for batched goals projections with fallback
 */
export function useBatchGoalsProjections(
  startGameweek?: number,
  endGameweek?: number,
  options: BatchProjectionsOptions = {}
): UseQueryResult<PlayerGoalsProjection[], Error> & { usedBatch: boolean } {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    batchSize = 150,
    maxConcurrency = 3,
  } = options;

  const [usedBatch, setUsedBatch] = useState(false);

  const queryResult = useQuery<PlayerGoalsProjection[], Error>({
    queryKey: startGameweek && endGameweek 
      ? ["/api/batch/player-goals-projections", startGameweek, endGameweek, "batch"]
      : ["/api/cached/player-goals-projections", "batch"],
    queryFn: async () => {
      // If no gameweek range specified, use cached endpoint
      if (!startGameweek || !endGameweek) {
        console.log("📊 CLIENT: Using cached goals projections (no gameweek range)");
        const response = await fetch("/api/cached/player-goals-projections");
        if (!response.ok) {
          throw new Error(`Failed to fetch cached goals projections: ${response.statusText}`);
        }
        setUsedBatch(false);
        return response.json();
      }

      // Use batch optimization if enabled
      if (ENABLE_BATCH_OPTIMIZATION) {
        try {
          console.log(`🚀 CLIENT: Attempting batch goals projections for GW${startGameweek}-${endGameweek}`);
          
          // First, get all player IDs from cached data
          const cachedResponse = await fetch("/api/cached/player-goals-projections");
          if (!cachedResponse.ok) {
            throw new Error("Failed to fetch player IDs for batch request");
          }
          
          const cachedData: PlayerGoalsProjection[] = await cachedResponse.json();
          const allPlayerIds = cachedData.map(p => p.playerId);
          
          console.log(`📊 CLIENT: Batching ${allPlayerIds.length} players in chunks of ${batchSize}`);
          
          // Chunk players into batches
          const playerIdChunks = chunkArray(allPlayerIds, batchSize);
          
          // Process batches concurrently
          const results = await processBatchesConcurrent<PlayerGoalsProjection>(
            "/api/batch/player-goals-projections",
            playerIdChunks,
            startGameweek,
            endGameweek,
            maxConcurrency
          );
          
          console.log(`⚡ CLIENT: Batch optimization successful - ${results.length} players fetched`);
          setUsedBatch(true);
          return results;
          
        } catch (error) {
          console.warn("⚠️ CLIENT: Batch optimization failed, falling back to individual API:", error);
          setUsedBatch(false);
          
          // Fallback to existing individual API
          const response = await fetch(`/api/player-goals-scored-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
          if (!response.ok) {
            throw new Error(`Fallback API request failed: ${response.statusText}`);
          }
          return response.json();
        }
      } else {
        // Batch optimization disabled, use individual API
        console.log("📊 CLIENT: Batch optimization disabled, using individual API");
        const response = await fetch(`/api/player-goals-scored-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
        if (!response.ok) {
          throw new Error(`Individual API request failed: ${response.statusText}`);
        }
        setUsedBatch(false);
        return response.json();
      }
    },
    enabled,
    staleTime,
  });

  return { ...queryResult, usedBatch };
}

/**
 * Custom hook for batched assists projections with fallback
 */
export function useBatchAssistsProjections(
  startGameweek?: number,
  endGameweek?: number,
  options: BatchProjectionsOptions = {}
): UseQueryResult<PlayerAssistsProjection[], Error> & { usedBatch: boolean } {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    batchSize = 150,
    maxConcurrency = 3,
  } = options;

  const [usedBatch, setUsedBatch] = useState(false);

  const queryResult = useQuery<PlayerAssistsProjection[], Error>({
    queryKey: startGameweek && endGameweek 
      ? ["/api/batch/player-assists-projections", startGameweek, endGameweek, "batch"]
      : ["/api/cached/player-assists-projections", "batch"],
    queryFn: async () => {
      // If no gameweek range specified, use cached endpoint
      if (!startGameweek || !endGameweek) {
        console.log("📊 CLIENT: Using cached assists projections (no gameweek range)");
        const response = await fetch("/api/cached/player-assists-projections");
        if (!response.ok) {
          throw new Error(`Failed to fetch cached assists projections: ${response.statusText}`);
        }
        setUsedBatch(false);
        return response.json();
      }

      // Use batch optimization if enabled
      if (ENABLE_BATCH_OPTIMIZATION) {
        try {
          console.log(`🚀 CLIENT: Attempting batch assists projections for GW${startGameweek}-${endGameweek}`);
          
          // First, get all player IDs from cached data
          const cachedResponse = await fetch("/api/cached/player-assists-projections");
          if (!cachedResponse.ok) {
            throw new Error("Failed to fetch player IDs for batch request");
          }
          
          const cachedData: PlayerAssistsProjection[] = await cachedResponse.json();
          const allPlayerIds = cachedData.map(p => p.playerId);
          
          console.log(`📊 CLIENT: Batching ${allPlayerIds.length} players in chunks of ${batchSize}`);
          
          // Chunk players into batches
          const playerIdChunks = chunkArray(allPlayerIds, batchSize);
          
          // Process batches concurrently
          const results = await processBatchesConcurrent<PlayerAssistsProjection>(
            "/api/batch/player-assists-projections",
            playerIdChunks,
            startGameweek,
            endGameweek,
            maxConcurrency
          );
          
          console.log(`⚡ CLIENT: Batch optimization successful - ${results.length} players fetched`);
          setUsedBatch(true);
          return results;
          
        } catch (error) {
          console.warn("⚠️ CLIENT: Batch optimization failed, falling back to individual API:", error);
          setUsedBatch(false);
          
          // Fallback to existing individual API
          const response = await fetch(`/api/player-assist-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
          if (!response.ok) {
            throw new Error(`Fallback API request failed: ${response.statusText}`);
          }
          return response.json();
        }
      } else {
        // Batch optimization disabled, use individual API
        console.log("📊 CLIENT: Batch optimization disabled, using individual API");
        const response = await fetch(`/api/player-assist-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
        if (!response.ok) {
          throw new Error(`Individual API request failed: ${response.statusText}`);
        }
        setUsedBatch(false);
        return response.json();
      }
    },
    enabled,
    staleTime,
  });

  return { ...queryResult, usedBatch };
}
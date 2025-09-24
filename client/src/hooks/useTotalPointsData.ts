/**
 * Centralized hook for Player Total Points data fetching and loading state management
 * Prevents stuck loading states by deriving readiness from query status and data availability
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { computeCurrentGameweek, GameweekEvent } from "@shared/gameweek-utils";

interface BootstrapData {
  events: GameweekEvent[];
}

interface TotalPointsDataState {
  data: any[] | null;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  ready: boolean; // Single source of truth for UI readiness
  startGameweek: number | null;
  endGameweek: number | null;
}

export function useTotalPointsData() {
  const [startGameweek, setStartGameweek] = useState<number | null>(null);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Bootstrap data for gameweek calculation
  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ['/api/bootstrap-static'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Player total points data
  const { 
    data: totalPointsData, 
    isLoading: dataLoading, 
    isError,
    error 
  } = useQuery<any[]>({
    queryKey: ['/api/cached/player-total-points', startGameweek, endGameweek],
    enabled: startGameweek !== null && endGameweek !== null,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Initialize gameweek range once bootstrap data loads
  useEffect(() => {
    if (!bootstrapData?.events || initialized) return;
    
    const currentGW = computeCurrentGameweek(bootstrapData.events);
    const nextGW = Math.min((currentGW ?? 3) + 1, 38);
    const maxAvailableGW = Math.min(38, nextGW + 11);
    
    setStartGameweek(nextGW);
    setEndGameweek(Math.min(nextGW + 5, maxAvailableGW));
    setInitialized(true);
  }, [bootstrapData, initialized]);

  // Derive loading state from all prerequisites
  const isPending = bootstrapLoading || dataLoading || !initialized;
  
  // Derive readiness from data availability and error state
  const ready = !isPending && !isError && Array.isArray(totalPointsData) && totalPointsData.length > 0;

  // Development-only debugging
  if (process.env.NODE_ENV === 'development') {
    // Log state transitions to help debug stuck loading
    useEffect(() => {
      console.log('🔍 TotalPointsData State:', {
        bootstrapLoading,
        dataLoading,
        initialized,
        startGameweek,
        endGameweek,
        dataLength: Array.isArray(totalPointsData) ? totalPointsData.length : 0,
        isPending,
        ready
      });
    }, [bootstrapLoading, dataLoading, initialized, startGameweek, endGameweek, totalPointsData?.length, isPending, ready]);
  }

  const state: TotalPointsDataState = {
    data: totalPointsData || null,
    isPending,
    isError,
    error,
    ready,
    startGameweek,
    endGameweek
  };

  return {
    ...state,
    setStartGameweek,
    setEndGameweek
  };
}
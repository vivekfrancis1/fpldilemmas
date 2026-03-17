import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, Search, TrendingUp, TrendingDown, DollarSign, AlertCircle, Users, Target, Filter, Plus, X, Check, LayoutGrid, List } from "lucide-react";
import { PitchView, type PitchPlayer } from "@/components/pitch-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { LoadingExperience } from "@/components/loading-experience";
import { extractManagerId } from "@/lib/manager-id-utils";
import { FplConnectDialog } from "@/components/fpl-connect-dialog";
import { useAuth } from "@/hooks/useAuth";

interface TeamPick {
  element: number;
  position: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  projectedPoints?: number;
}

export default function TransferRecommendations() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<string | null>(null);
  const [useFallbackEndpoint, setUseFallbackEndpoint] = useState(false);
  const [positionFilter, setPositionFilter] = useState<string[]>([]);
  const [appliedTransfers, setAppliedTransfers] = useState<{ [gw: string]: any[] }>({});
  const [uniquePlayerOut, setUniquePlayerOut] = useState(true);
  const [uniquePlayerIn, setUniquePlayerIn] = useState(true);
  const [teamView, setTeamView] = useState<"pitch" | "list">("pitch");
  const { toast } = useToast();
  const { user } = useAuth();

  // Cache manager ID functionality
  const saveManagerIdToCache = (id: string) => {
    try {
      localStorage.setItem('fpl-manager-id', id);
    } catch (error) {
      console.warn('Failed to save manager ID to localStorage:', error);
    }
  };

  const getManagerIdFromCache = (): string | null => {
    try {
      return localStorage.getItem('fpl-manager-id');
    } catch (error) {
      console.warn('Failed to get manager ID from localStorage:', error);
      return null;
    }
  };

  // Auto-load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId); // Auto-trigger data loading
    }
  }, []);

  // Check if user is viewing their own team
  const isOwnTeam = user?.fplManagerId && searchedId && Number(searchedId) === user.fplManagerId;

  // Determine which endpoint to use (with fallback for expired sessions)
  const shouldUseAuthenticatedEndpoint = isOwnTeam && !useFallbackEndpoint;

  // Fetch recommended transfers - use authenticated endpoint for own team (shows GW 13 unconfirmed data)
  // Fall back to public endpoint if session expired (GW 12 confirmed data)
  const { data: recommendedTransfers, isLoading: isLoadingRecommendations, error: recommendationsError } = useQuery<any>({
    queryKey: shouldUseAuthenticatedEndpoint ? ["/api/fpl/recommended-transfers"] : ["/api/manager", searchedId, "recommended-transfers"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false, // Don't auto-retry if FPL session expired
  });

  // Handle FPL session expiry - fall back to public endpoint
  useEffect(() => {
    if (recommendationsError && shouldUseAuthenticatedEndpoint && searchedId) {
      console.log("⚠️ FPL session expired or unavailable, falling back to manager ID endpoint");
      setUseFallbackEndpoint(true);
    }
  }, [recommendationsError, shouldUseAuthenticatedEndpoint, searchedId]);

  // Fetch bootstrap data
  const { data: bootstrapData, isLoading: isLoadingBootstrap, error: bootstrapError } = useQuery<any>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 15 * 60 * 1000,
  });
  
  // Debug bootstrap loading
  useEffect(() => {
    console.log('🔍 Bootstrap Data Status:', {
      hasData: !!bootstrapData,
      isLoading: isLoadingBootstrap,
      error: bootstrapError?.message || null,
      dataKeys: bootstrapData ? Object.keys(bootstrapData) : null
    });
  }, [bootstrapData, isLoadingBootstrap, bootstrapError]);

  // Fetch team data for current squad
  const { data: teamData } = useQuery<any>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch full-range player projections once — filter to selectedGameweek client-side
  // Stable query key (not dependent on selectedGameweek) so no refetch on GW change
  const recCurrentGW = bootstrapData?.events?.find((e: any) => e.is_current)?.id || 27;
  const recNextGW = recCurrentGW + 1;
  const recMaxGW = Math.min(38, recNextGW + 11);
  const { data: playerProjections } = useQuery<any[]>({
    queryKey: ["/api/cached/player-total-points"],
    enabled: !!bootstrapData,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`/api/cached/player-total-points`);
      if (!response.ok) {
        throw new Error(`Failed to fetch projections: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch fixtures
  const { data: fixturesData } = useQuery<any[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 15 * 60 * 1000,
  });

  // Backend now applies availability adjustments, so we just use the data as-is
  const adjustedRecommendations = recommendedTransfers;
  
  // Use authenticated team picks if available (includes pending transfers), otherwise fall back to public team data
  const effectiveTeamPicks = adjustedRecommendations?.authenticatedTeamPicks || teamData?.picks;

  // Helper function to get opponent info for a player in a given gameweek
  const getOpponentInfo = (playerTeamId: number, gameweek: number): string => {
    if (!fixturesData || !bootstrapData) return '';
    
    const fixture = fixturesData.find((f: any) => 
      f.event === gameweek && (f.team_h === playerTeamId || f.team_a === playerTeamId)
    );
    
    if (!fixture) return '';
    
    const isHome = fixture.team_h === playerTeamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponent = bootstrapData.teams?.find((t: any) => t.id === opponentId);
    
    return opponent ? `vs ${opponent.short_name} (${isHome ? 'H' : 'A'})` : '';
  };

  // Auto-set first gameweek when recommendations load
  useEffect(() => {
    if (adjustedRecommendations?.gameweeks && !selectedGameweek) {
      const firstGW = Object.keys(adjustedRecommendations.gameweeks)[0];
      if (firstGW) {
        setSelectedGameweek(firstGW);
      }
    }
  }, [adjustedRecommendations, selectedGameweek]);

  // Memoized calculation of budget and free transfers timeline for each gameweek
  const gameweekFinances = useMemo(() => {
    if (!adjustedRecommendations?.gameweeks) return {};

    const gameweeks = Object.keys(adjustedRecommendations.gameweeks).sort((a, b) => parseInt(a) - parseInt(b));
    const finances: Record<string, { cashBefore: number; cashAfter: number; ftsAvailable: number }> = {};
    
    let acc = {
      bank: adjustedRecommendations.bank || 0,
      freeTransfers: adjustedRecommendations.freeTransfers || 1
    };

    gameweeks.forEach((gw, index) => {
      const gwData = adjustedRecommendations.gameweeks[gw];
      const primaryRec = gwData.recommendations?.[0];
      
      // Use API-provided values for bankBefore and freeTransfersAvailable
      const cashBefore = gwData.bankBefore ?? acc.bank;
      const cashAfter = primaryRec?.budgetAfter ?? acc.bank;
      const ftsAvailable = gwData.freeTransfersAvailable ?? acc.freeTransfers;
      
      finances[gw] = { cashBefore, cashAfter, ftsAvailable };
      
      // Update accumulator for next gameweek
      acc = {
        bank: cashAfter,
        freeTransfers: Math.min(2, Math.max(0, acc.freeTransfers - 1) + 1)
      };
    });

    return finances;
  }, [adjustedRecommendations]);

  // Helper to get player data by ID
  const getPlayerById = (playerId: number) => {
    return bootstrapData?.elements?.find((p: any) => p.id === playerId);
  };

  // Helper to get position abbreviation from element_type
  const getPositionFromElementType = (elementType: number): string => {
    switch (elementType) {
      case 1: return 'GKP';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return '';
    }
  };

  // Filter recommendations by position (based on player being transferred IN)
  const filterRecommendationsByPosition = (recommendations: any[]): any[] => {
    if (positionFilter.length === 0 || !recommendations) return recommendations;
    
    return recommendations.filter((rec: any) => {
      if (rec.type === 'roll') return true;
      const playerIn = getPlayerById(rec.playerIn?.id);
      if (!playerIn) return false;
      const position = getPositionFromElementType(playerIn.element_type);
      return positionFilter.includes(position);
    });
  };

  // Get sorted list of gameweeks with applied transfers
  const getSortedGameweeks = (): string[] => {
    if (!adjustedRecommendations?.gameweeks) return [];
    return Object.keys(adjustedRecommendations.gameweeks).sort((a, b) => parseInt(a) - parseInt(b));
  };

  // Cascading state calculator - computes cumulative squad, bank, and free transfers for each gameweek
  // based on all applied transfers from previous gameweeks
  const cascadedState = useMemo(() => {
    const gameweeks = getSortedGameweeks();
    const result: { [gw: string]: { 
      squadIds: number[]; 
      bank: number; 
      freeTransfersAvailable: number;
      freeTransfersRemaining: number;
      cumulativeTransfers: any[] 
    } } = {};
    
    // Start with original squad
    const originalSquadIds = effectiveTeamPicks?.map((p: any) => p.element) || [];
    const initialBank = adjustedRecommendations?.bank || 0;
    const MAX_FREE_TRANSFERS = 5; // FPL 2024/25 rule: max 5 FT can be banked
    
    let cumulativeSquadIds = [...originalSquadIds];
    let cumulativeBank = initialBank;
    let allPreviousTransfers: any[] = [];
    let previousGWRemainingFT = 0; // FT remaining after previous GW (to roll over)
    
    gameweeks.forEach((gw, index) => {
      // Get the bank before this gameweek from backend (accounts for price changes, etc.)
      const gwBankBefore = adjustedRecommendations?.gameweeks?.[gw]?.bankBefore ?? cumulativeBank;
      const backendFT = adjustedRecommendations?.gameweeks?.[gw]?.freeTransfersAvailable ?? 1;
      
      // For first GW, use backend values; for later GWs, calculate based on previous GW
      const isFirstGW = index === 0;
      const startingBank = isFirstGW ? gwBankBefore : cumulativeBank;
      
      // Calculate free transfers for this GW
      // First GW: use backend value
      // Later GWs: min(previous remaining + 1, MAX_FREE_TRANSFERS)
      let freeTransfersAvailable: number;
      if (isFirstGW) {
        freeTransfersAvailable = backendFT;
      } else {
        // Roll over unused FT from previous GW (max 1 can roll over per GW, capped at MAX)
        const rolledOver = Math.min(previousGWRemainingFT, MAX_FREE_TRANSFERS - 1);
        freeTransfersAvailable = Math.min(rolledOver + 1, MAX_FREE_TRANSFERS);
      }
      
      // Apply transfers from previous gameweeks to get starting squad for this GW
      let currentSquadIds = [...cumulativeSquadIds];
      let currentBank = startingBank;
      
      // Apply this gameweek's transfers
      const gwTransfers = appliedTransfers[gw] || [];
      gwTransfers.forEach(transfer => {
        const outIndex = currentSquadIds.indexOf(transfer.playerOut.id);
        if (outIndex !== -1) {
          currentSquadIds[outIndex] = transfer.playerIn.id;
          currentBank = currentBank - transfer.playerIn.nowCost + transfer.playerOut.sellingPrice;
        }
      });
      
      // Calculate remaining free transfers after this GW's transfers
      const freeTransfersRemaining = Math.max(0, freeTransfersAvailable - gwTransfers.length);
      
      result[gw] = {
        squadIds: [...currentSquadIds],
        bank: currentBank,
        freeTransfersAvailable,
        freeTransfersRemaining,
        cumulativeTransfers: [...allPreviousTransfers, ...gwTransfers]
      };
      
      // Update cumulative state for next gameweek
      cumulativeSquadIds = [...currentSquadIds];
      cumulativeBank = currentBank;
      allPreviousTransfers = [...allPreviousTransfers, ...gwTransfers];
      previousGWRemainingFT = freeTransfersRemaining;
    });
    
    return result;
  }, [adjustedRecommendations, effectiveTeamPicks, appliedTransfers]);

  // Get cumulative squad IDs for a gameweek (includes all transfers from previous GWs)
  const getCumulativeSquadForGW = (gw: string): number[] => {
    return cascadedState[gw]?.squadIds || effectiveTeamPicks?.map((p: any) => p.element) || [];
  };

  // Get cumulative bank for a gameweek (after all transfers from previous GWs)
  const getCumulativeBankForGW = (gw: string): number => {
    // For the starting bank of a GW, we need to look at the end state of the previous GW
    const gameweeks = getSortedGameweeks();
    const gwIndex = gameweeks.indexOf(gw);
    
    if (gwIndex === 0) {
      // First gameweek - use backend's bankBefore
      return adjustedRecommendations?.gameweeks?.[gw]?.bankBefore ?? adjustedRecommendations?.bank ?? 0;
    }
    
    // For later gameweeks, use the bank at end of previous GW
    // Use nullish coalescing (??) to properly handle bank value of 0
    const previousGW = gameweeks[gwIndex - 1];
    const previousBank = cascadedState[previousGW]?.bank;
    return previousBank !== undefined ? previousBank : (adjustedRecommendations?.bank ?? 0);
  };

  // Get applied transfers for current gameweek only (not cascaded)
  const getAppliedTransfersForGW = (gw: string): any[] => {
    return appliedTransfers[gw] || [];
  };

  // Apply a transfer (add to applied transfers list) with validation
  const applyTransfer = (gw: string, transfer: any) => {
    // Validate: Check if transfer is already applied
    if (isTransferApplied(gw, transfer)) {
      return; // Already applied, do nothing
    }
    
    // Validate: Check if player in is already in squad
    if (isPlayerInSquad(gw, transfer.playerIn.id)) {
      return; // Player already in squad, do nothing
    }
    
    // Validate: Check affordability - net cost must not exceed running bank
    const runningBank = getRunningBankForGW(gw);
    const netCost = transfer.playerIn.nowCost - transfer.playerOut.sellingPrice;
    if (netCost > runningBank) {
      return; // Cannot afford transfer, do nothing
    }
    
    setAppliedTransfers(prev => ({
      ...prev,
      [gw]: [...(prev[gw] || []), transfer]
    }));
  };

  // Remove an applied transfer
  const removeAppliedTransfer = (gw: string, transferIndex: number) => {
    setAppliedTransfers(prev => ({
      ...prev,
      [gw]: (prev[gw] || []).filter((_, idx) => idx !== transferIndex)
    }));
  };

  // Check if a transfer is already applied (player out already used in this GW)
  const isTransferApplied = (gw: string, transfer: any): boolean => {
    const applied = appliedTransfers[gw] || [];
    return applied.some(t => t.playerOut.id === transfer.playerOut.id);
  };

  // Check if player is already in the cascaded squad for a gameweek
  // This includes players from original squad + all transfers from previous GWs + current GW transfers
  const isPlayerInSquad = (gw: string, playerId: number): boolean => {
    // Get starting squad for this GW (after previous GW transfers)
    const gameweeks = getSortedGameweeks();
    const gwIndex = gameweeks.indexOf(gw);
    
    let startingSquadIds: number[];
    if (gwIndex === 0 || gwIndex === -1) {
      // First gameweek or not found - use original squad
      startingSquadIds = effectiveTeamPicks?.map((p: any) => p.element) || [];
    } else {
      // Use the squad at end of previous gameweek
      const previousGW = gameweeks[gwIndex - 1];
      startingSquadIds = cascadedState[previousGW]?.squadIds || effectiveTeamPicks?.map((p: any) => p.element) || [];
    }
    
    // Apply this gameweek's transfers to get current state
    const applied = appliedTransfers[gw] || [];
    const playersOut = applied.map(t => t.playerOut.id);
    const playersIn = applied.map(t => t.playerIn.id);
    
    // Player is in squad if: in starting squad and not transferred out, OR transferred in this GW
    const inStartingAndNotOut = startingSquadIds.includes(playerId) && !playersOut.includes(playerId);
    const transferredIn = playersIn.includes(playerId);
    
    return inStartingAndNotOut || transferredIn;
  };

  // Calculate running bank after applied transfers for this gameweek
  // Takes into account cascaded bank from previous gameweeks
  const getRunningBankForGW = (gw: string): number => {
    const applied = appliedTransfers[gw] || [];
    // Use cascaded bank (from previous GWs) as starting point
    const startingBank = getCumulativeBankForGW(gw);
    
    let runningBank = startingBank;
    applied.forEach(transfer => {
      runningBank = runningBank - transfer.playerIn.nowCost + transfer.playerOut.sellingPrice;
    });
    
    return runningBank;
  };

  // Get cascaded free transfers available for a gameweek (accounts for previous GW transfers)
  const getCascadedFreeTransfersAvailable = (gw: string): number => {
    return cascadedState[gw]?.freeTransfersAvailable || 
           adjustedRecommendations?.gameweeks?.[gw]?.freeTransfersAvailable || 1;
  };

  // Calculate free transfers remaining after applied transfers for this gameweek
  const getFreeTransfersRemaining = (gw: string): number => {
    return cascadedState[gw]?.freeTransfersRemaining ?? 
           Math.max(0, getCascadedFreeTransfersAvailable(gw) - (appliedTransfers[gw]?.length || 0));
  };

  // Calculate hits taken (transfers beyond free transfers)
  const getHitsTaken = (gw: string): number => {
    const applied = appliedTransfers[gw] || [];
    const totalFT = getCascadedFreeTransfersAvailable(gw);
    return Math.max(0, applied.length - totalFT) * 4;
  };

  // Filter out already applied transfers from recommendations
  // Also filters out recommendations for players not in the cascaded squad
  const filterAppliedFromRecommendations = (recommendations: any[], gw: string): any[] => {
    if (!recommendations) return [];
    const applied = appliedTransfers[gw] || [];
    const appliedOutIds = new Set(applied.map(t => t.playerOut.id));
    
    // Get the starting squad for this GW (after previous GW transfers)
    const gameweeks = getSortedGameweeks();
    const gwIndex = gameweeks.indexOf(gw);
    let startingSquadIds: number[];
    if (gwIndex === 0 || gwIndex === -1) {
      startingSquadIds = effectiveTeamPicks?.map((p: any) => p.element) || [];
    } else {
      const previousGW = gameweeks[gwIndex - 1];
      startingSquadIds = cascadedState[previousGW]?.squadIds || effectiveTeamPicks?.map((p: any) => p.element) || [];
    }
    
    return recommendations.filter((rec: any) => {
      if (rec.type === 'roll') return true;
      // Filter out if player out is already transferred out this GW
      if (appliedOutIds.has(rec.playerOut.id)) return false;
      // Filter out if player out is not in the starting squad for this GW
      if (!startingSquadIds.includes(rec.playerOut.id)) return false;
      // Filter out if player in is already in squad (cascaded check)
      if (isPlayerInSquad(gw, rec.playerIn.id)) return false;
      return true;
    });
  };

  // Apply cascaded transfers to current team (reflects all transfers from previous GWs + current GW)
  const applyRecommendedTransfers = useMemo(() => {
    if (!selectedGameweek || !effectiveTeamPicks) {
      return null;
    }

    // Get the cascaded squad IDs for this gameweek
    const cascadedSquadIds = getCumulativeSquadForGW(selectedGameweek);
    
    // Apply this gameweek's transfers on top
    const currentGWTransfers = appliedTransfers[selectedGameweek] || [];
    let finalSquadIds = [...cascadedSquadIds];
    
    // Note: cascadedState already includes current GW transfers in squadIds
    // So we can directly use the cascaded state
    const finalState = cascadedState[selectedGameweek];
    if (finalState) {
      finalSquadIds = finalState.squadIds;
    }

    // Map back to picks format, preserving original pick structure where possible
    return effectiveTeamPicks.map((pick: any, index: number) => ({
      ...pick,
      element: finalSquadIds[index] || pick.element,
    }));
  }, [selectedGameweek, effectiveTeamPicks, appliedTransfers, cascadedState]);

  // Track transferred-in players for highlighting (all players brought in up to and including this GW)
  const transferredInPlayers = useMemo(() => {
    if (!selectedGameweek) {
      return new Set<number>();
    }

    // Get all cumulative transfers up to and including this gameweek
    const cumulativeTransfers = cascadedState[selectedGameweek]?.cumulativeTransfers || [];
    return new Set(cumulativeTransfers.map((rec: any) => rec.playerIn.id));
  }, [selectedGameweek, cascadedState]);

  // Optimize lineup to maximize points
  const optimizedTeam = useMemo((): {
    lineup: TeamPick[];
    formation: { def: number; mid: number; fwd: number; name: string } | null;
    totalPoints: number;
  } | null => {
    if (!applyRecommendedTransfers || !playerProjections || !bootstrapData || !selectedGameweek) {
      return null;
    }

    // Get projected points for a player
    const getProjectedPoints = (playerId: number): number => {
      const projection = playerProjections.find((p: any) => p.playerId === playerId);
      if (!projection) return 0;
      
      // The API returns gameweekProjections as an object with gameweek keys
      // Extract the projected points for the selected gameweek
      const gwPoints = projection.gameweekProjections?.[selectedGameweek];
      return gwPoints || projection.totalExpectedPoints || projection.projectedPoints || 0;
    };

    // Group players by position
    const squadByPosition: {
      GKP: TeamPick[];
      DEF: TeamPick[];
      MID: TeamPick[];
      FWD: TeamPick[];
    } = {
      GKP: [],
      DEF: [],
      MID: [],
      FWD: []
    };

    applyRecommendedTransfers.forEach((pick: any) => {
      const player = getPlayerById(pick.element);
      if (!player) return;
      
      const positionType = player.element_type;
      const posKey = positionType === 1 ? 'GKP' : positionType === 2 ? 'DEF' : positionType === 3 ? 'MID' : 'FWD';
      squadByPosition[posKey].push({
        ...pick,
        projectedPoints: getProjectedPoints(pick.element)
      });
    });

    // Sort each position by projected points (descending)
    Object.keys(squadByPosition).forEach(pos => {
      squadByPosition[pos as keyof typeof squadByPosition].sort((a: any, b: any) => (b.projectedPoints || 0) - (a.projectedPoints || 0));
    });

    // Valid FPL formations
    const formations = [
      { def: 3, mid: 5, fwd: 2, name: '3-5-2' },
      { def: 3, mid: 4, fwd: 3, name: '3-4-3' },
      { def: 4, mid: 5, fwd: 1, name: '4-5-1' },
      { def: 4, mid: 4, fwd: 2, name: '4-4-2' },
      { def: 4, mid: 3, fwd: 3, name: '4-3-3' },
      { def: 5, mid: 4, fwd: 1, name: '5-4-1' },
      { def: 5, mid: 3, fwd: 2, name: '5-3-2' },
    ];

    let bestFormation: { def: number; mid: number; fwd: number; name: string } | null = null;
    let bestPoints = -1;
    let bestLineup: TeamPick[] = [];

    formations.forEach(formation => {
      const gkp = squadByPosition.GKP[0];
      const def = squadByPosition.DEF.slice(0, formation.def);
      const mid = squadByPosition.MID.slice(0, formation.mid);
      const fwd = squadByPosition.FWD.slice(0, formation.fwd);

      if (!gkp || def.length < formation.def || mid.length < formation.mid || fwd.length < formation.fwd) {
        return;
      }

      const starting11 = [gkp, ...def, ...mid, ...fwd];
      const totalPoints = starting11.reduce((sum, pick) => sum + (pick.projectedPoints || 0), 0);

      if (totalPoints > bestPoints) {
        bestPoints = totalPoints;
        bestFormation = formation;
        bestLineup = starting11;
      }
    });

    if (!bestLineup.length || !bestFormation) return null;

    // Store formation values (type assertion needed after forEach callback assignment)
    const finalFormation = bestFormation as { def: number; mid: number; fwd: number; name: string };
    const formationDef = finalFormation.def;
    const formationMid = finalFormation.mid;
    const formationFwd = finalFormation.fwd;

    // Reorganize starting 11: GKP, DEF, MID, FWD (in formation order)
    const starting11 = [
      squadByPosition.GKP[0], // Goalkeeper
      ...squadByPosition.DEF.slice(0, formationDef), // Defenders
      ...squadByPosition.MID.slice(0, formationMid), // Midfielders
      ...squadByPosition.FWD.slice(0, formationFwd)  // Forwards
    ];

    // Assign positions (1-11 for starting)
    const optimized = starting11.map((pick, idx) => ({
      ...pick,
      position: idx + 1,
      is_captain: false,
      is_vice_captain: false,
    }));

    // Add bench players
    const benchGKP = squadByPosition.GKP.filter(p => !optimized.find(o => o.element === p.element));
    const benchDEF = squadByPosition.DEF.filter(p => !optimized.find(o => o.element === p.element));
    const benchMID = squadByPosition.MID.filter(p => !optimized.find(o => o.element === p.element));
    const benchFWD = squadByPosition.FWD.filter(p => !optimized.find(o => o.element === p.element));

    // Bench: GKP first, then outfield players sorted by projected points
    const benchOutfield = [...benchDEF, ...benchMID, ...benchFWD]
      .sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0));
    
    const bench = [...benchGKP, ...benchOutfield]
      .slice(0, 4)
      .map((pick, idx) => ({
        ...pick,
        position: 12 + idx,
        is_captain: false,
        is_vice_captain: false,
      }));

    const finalLineup = [...optimized, ...bench];

    // Set captain (highest projected in starting 11)
    const captainPick = optimized.reduce((best, pick) => 
      (pick.projectedPoints || 0) > (best.projectedPoints || 0) ? pick : best
    );
    const captainIndex = finalLineup.findIndex(p => p.element === captainPick.element);
    if (captainIndex !== -1) {
      finalLineup[captainIndex].is_captain = true;
    }

    // Set vice captain (second highest in starting 11)
    const viceCaptainPick = optimized
      .filter(p => p.element !== captainPick.element)
      .reduce((best, pick) => 
        (pick.projectedPoints || 0) > (best.projectedPoints || 0) ? pick : best
      );
    const viceCaptainIndex = finalLineup.findIndex(p => p.element === viceCaptainPick.element);
    if (viceCaptainIndex !== -1) {
      finalLineup[viceCaptainIndex].is_vice_captain = true;
    }

    return {
      lineup: finalLineup,
      formation: bestFormation,
      totalPoints: bestPoints + (captainPick.projectedPoints || 0) // Add captain bonus
    };
  }, [applyRecommendedTransfers, playerProjections, bootstrapData, selectedGameweek]);

  // Handle search
  const handleSearch = () => {
    if (!managerId.trim()) {
      toast({
        title: "Manager ID Required",
        description: "Please enter a valid FPL Manager ID",
        variant: "destructive"
      });
      return;
    }
    setUseFallbackEndpoint(false); // Reset fallback flag to try authenticated endpoint first
    setSearchedId(managerId);
    saveManagerIdToCache(managerId);
  };

  // Debug logging
  useEffect(() => {
    console.log("🔍 Recommended Transfers Debug:", {
      searchedId,
      hasRecommendations: !!recommendedTransfers,
      recommendations: recommendedTransfers,
      isLoading: isLoadingRecommendations,
      error: recommendationsError
    });
  }, [searchedId, recommendedTransfers, isLoadingRecommendations, recommendationsError]);

  // Debug optimized team
  useEffect(() => {
    console.log("🔍 Optimized Team Debug:", {
      selectedGameweek,
      hasTeamData: !!teamData,
      teamDataPicks: teamData?.picks?.length,
      hasAdjustedRecommendations: !!adjustedRecommendations,
      hasGameweekData: !!adjustedRecommendations?.gameweeks?.[selectedGameweek || ''],
      hasApplyRecommendedTransfers: !!applyRecommendedTransfers,
      applyRecommendedTransfersLength: applyRecommendedTransfers?.length,
      hasPlayerProjections: !!playerProjections,
      playerProjectionsLength: playerProjections?.length,
      hasBootstrapData: !!bootstrapData,
      hasOptimizedTeam: !!optimizedTeam,
      optimizedTeam
    });
  }, [selectedGameweek, teamData, adjustedRecommendations, applyRecommendedTransfers, playerProjections, bootstrapData, optimizedTeam]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Compact */}
        <div className="text-center py-2">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mb-2">
            <ArrowRightLeft className="h-5 w-5 text-orange-600" />
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Transfer Recommendations</h1>
          <p className="text-xs text-gray-600 hidden sm:block">Maximize your projected points for remaining gameweeks</p>
        </div>

        {/* Manager Search Section - Compact */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-md">
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <Input
                id="manager-id"
                type="text"
                placeholder="Enter Manager ID or FPL URL"
                value={managerId}
                onChange={(e) => {
                  const extractedId = extractManagerId(e.target.value);
                  setManagerId(extractedId);
                }}
                onKeyDown={(e) => e.key === "Enter" && !isLoadingRecommendations && handleSearch()}
                className="flex-1 h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                data-testid="input-manager-id"
                disabled={isLoadingRecommendations}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleSearch} 
                  disabled={!managerId.trim() || isLoadingRecommendations}
                  className="flex-1 sm:flex-none h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 text-sm"
                  data-testid="button-search-manager"
                >
                  <Search className="h-4 w-4 mr-1" />
                  {isLoadingRecommendations ? "..." : "Search"}
                </Button>
                <FplConnectDialog />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session expiry notification for logged-in users */}
        {useFallbackEndpoint && isOwnTeam && (() => {
          const currentGW = bootstrapData?.events.find((e: any) => e.is_current)?.id || 
                           bootstrapData?.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;
          const upcomingGW = currentGW + 1;
          
          return (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    FPL session expired. Please reconnect to sync your latest GW {upcomingGW} team.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Notification for non-logged-in users */}
        {!user && searchedId && (() => {
          const currentGW = bootstrapData?.events.find((e: any) => e.is_current)?.id || 
                           bootstrapData?.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;
          const upcomingGW = currentGW + 1;
          
          return (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    The transfer recommendations are based on your team from GW {currentGW}. Login to FPL Dilemmas, and connect your FPL account to get transfer recommendations based on your latest team from GW {upcomingGW}.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Error state - only show if fallback also failed */}
        {recommendationsError && useFallbackEndpoint && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load transfer recommendations. Please check the Manager ID and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoadingRecommendations && searchedId && (
          <LoadingExperience
            variant="analysis"
            title="Analyzing Your Team"
            description="Calculating optimal transfer recommendations across all remaining gameweeks..."
            steps={[
              { text: "Analyzing current squad", delay: "0s" },
              { text: "Comparing 700+ player projections", delay: "0.2s" },
              { text: "Optimizing transfer strategy", delay: "0.4s" },
            ]}
          />
        )}

        {/* No search yet state */}
        {!searchedId && !isLoadingRecommendations && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <ArrowRightLeft className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Enter your FPL Manager ID to view transfer recommendations</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Recommendations */}
        {searchedId && !isLoadingRecommendations && adjustedRecommendations && adjustedRecommendations.gameweeks && Object.keys(adjustedRecommendations.gameweeks).length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                Transfer Recommendations
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Maximize your projected points for remaining gameweeks
              </CardDescription>
              {/* Position Filter Toggle */}
              <div className="flex items-center gap-2 pt-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-600">Position:</span>
                <ToggleGroup 
                  type="multiple" 
                  value={positionFilter} 
                  onValueChange={setPositionFilter}
                  className="flex flex-wrap gap-1"
                >
                  <ToggleGroupItem value="GKP" size="sm" className="text-xs px-2 py-1 h-7 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-900">
                    GKP
                  </ToggleGroupItem>
                  <ToggleGroupItem value="DEF" size="sm" className="text-xs px-2 py-1 h-7 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-900">
                    DEF
                  </ToggleGroupItem>
                  <ToggleGroupItem value="MID" size="sm" className="text-xs px-2 py-1 h-7 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-900">
                    MID
                  </ToggleGroupItem>
                  <ToggleGroupItem value="FWD" size="sm" className="text-xs px-2 py-1 h-7 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-900">
                    FWD
                  </ToggleGroupItem>
                </ToggleGroup>
                {positionFilter.length > 0 && (
                  <button 
                    onClick={() => setPositionFilter([])} 
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* Uniqueness Toggles */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="unique-out-toggle"
                    checked={uniquePlayerOut}
                    onCheckedChange={setUniquePlayerOut}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                  <label htmlFor="unique-out-toggle" className="text-xs text-gray-600 cursor-pointer">
                    Unique player out
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="unique-in-toggle"
                    checked={uniquePlayerIn}
                    onCheckedChange={setUniquePlayerIn}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                  <label htmlFor="unique-in-toggle" className="text-xs text-gray-600 cursor-pointer">
                    Unique player in
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(adjustedRecommendations.gameweeks)[0]} className="w-full" onValueChange={setSelectedGameweek}>
                <div className="overflow-x-auto -mx-6 px-6 mb-4">
                  <TabsList className="inline-flex w-auto min-w-full h-auto gap-2 bg-transparent">
                    {Object.keys(adjustedRecommendations.gameweeks).map((gw) => (
                      <TabsTrigger 
                        key={gw} 
                        value={gw} 
                        className="text-sm py-2.5 px-4 min-w-[80px] data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900" 
                        data-testid={`tab-transfer-gw-${gw}`}
                      >
                        GW{gw}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {Object.entries(adjustedRecommendations.gameweeks).map(([gw, gwData]: [string, any]) => {
                  const finances = gameweekFinances[gw];
                  return (
                  <TabsContent key={gw} value={gw} className="space-y-4">
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="text-sm text-gray-600">
                        <strong>Target:</strong> Maximise points for {gwData.targetRange}
                      </div>
                      {finances && (() => {
                        // Get all gameweek keys to identify the first (current) gameweek
                        const allGWKeys = Object.keys(adjustedRecommendations.gameweeks || {}).sort((a, b) => parseInt(a) - parseInt(b));
                        const isFirstGW = allGWKeys.length > 0 && gw === allGWKeys[0];
                        
                        // For the first gameweek, use pending transfers from authenticated data if available
                        const pendingTransfersMade = adjustedRecommendations?.pendingTransfersMade || 0;
                        const freeTransfersAtStartFromAPI = adjustedRecommendations?.freeTransfersAtStart;
                        
                        // Free transfers at start: use API value for first GW if available, otherwise calculate
                        const freeTransfersAtStart = isFirstGW && freeTransfersAtStartFromAPI !== undefined
                          ? freeTransfersAtStartFromAPI
                          : getCascadedFreeTransfersAvailable(gw);
                        
                        // Transfers made: for first GW, combine pending transfers + applied transfers
                        const appliedTransfersCount = getAppliedTransfersForGW(gw).length;
                        const transfersMade = isFirstGW 
                          ? pendingTransfersMade + appliedTransfersCount
                          : appliedTransfersCount;
                        
                        // Free transfers remaining: start - made
                        const freeTransfersRemaining = Math.max(0, freeTransfersAtStart - transfersMade);
                        
                        // Calculate hits: (transfers made - free transfers at start) * 4, if positive
                        const hitsTaken = Math.max(0, transfersMade - freeTransfersAtStart) * 4;
                        const hitsApplicable = hitsTaken > 0;
                        
                        return (
                        <div className="flex flex-wrap gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3" data-testid={`finance-summary-gw${gw}`}>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-xs text-gray-500">Cash in Bank</div>
                              <div className="text-sm font-bold text-green-700" data-testid={`cash-in-bank-gw${gw}`}>
                                £{(getRunningBankForGW(gw) / 10).toFixed(1)}m
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 border-l border-green-300 pl-3">
                            <ArrowRightLeft className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-xs text-gray-500">Free Transfers at Start</div>
                              <div className="text-sm font-bold text-green-700">
                                {freeTransfersAtStart}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 border-l border-green-300 pl-3">
                            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="text-xs text-gray-500">Transfers Made</div>
                              <div className={`text-sm font-bold ${hitsApplicable ? 'text-red-600' : 'text-blue-700'}`}>
                                {transfersMade}
                                {hitsApplicable && <span className="text-xs ml-1">(-{hitsTaken}pts)</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 border-l border-green-300 pl-3">
                            <ArrowRightLeft className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-xs text-gray-500">Free Transfers Left</div>
                              <div className="text-sm font-bold text-green-700" data-testid={`free-transfers-gw${gw}`}>
                                {freeTransfersRemaining}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })()}
                    </div>
                    {gwData.recommendations && gwData.recommendations.length > 0 ? (
                      <div className="space-y-3">
                        {/* Check if this is a roll transfer recommendation */}
                        {gwData.recommendations[0]?.type === 'roll' ? (
                          <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg" data-testid={`roll-transfer-gw${gw}`}>
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                              <ArrowRightLeft className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Roll Transfer</h3>
                          </div>
                        ) : (
                          <>
                            {/* Applied Transfers Section */}
                            {getAppliedTransfersForGW(gw).length > 0 && (
                              <div className="mb-4">
                                <h3 className="text-base font-semibold text-green-700 mb-2 flex items-center gap-2">
                                  <Check className="h-4 w-4" />
                                  Applied Transfers ({getAppliedTransfersForGW(gw).length})
                                </h3>
                                <div className="space-y-2">
                                  {getAppliedTransfersForGW(gw).map((rec: any, index: number) => (
                                    <div
                                      key={`applied-${rec.playerOut.id}-${rec.playerIn.id}`}
                                      className="p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg shadow-sm"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3 flex-wrap flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">OUT</Badge>
                                            <span className="text-sm font-medium">{rec.playerOut.webName}</span>
                                          </div>
                                          <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                                          <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">IN</Badge>
                                            <span className="text-sm font-medium">{rec.playerIn.webName}</span>
                                          </div>
                                          <span className="text-xs text-green-600 font-semibold">+{(rec.fourGWPointsGain || 0).toFixed(1)} pts</span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeAppliedTransfer(gw, index)}
                                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <X className="h-4 w-4" />
                                          <span className="hidden sm:inline ml-1">Remove</span>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Transfer Recommendations */}
                            {(() => {
                              const freeTransfers = gwData.freeTransfersAvailable || 1;
                              const positionFiltered = filterRecommendationsByPosition(gwData.recommendations);
                              const availableRecommendations = filterAppliedFromRecommendations(positionFiltered, gw);
                              const runningBank = getRunningBankForGW(gw);
                              
                              // Filter by affordability based on running bank
                              const affordableRecommendations = availableRecommendations.filter((rec: any) => {
                                if (rec.type === 'roll') return true;
                                const netCost = rec.playerIn.nowCost - rec.playerOut.sellingPrice;
                                return netCost <= runningBank;
                              });
                              
                              // Apply uniqueness filters if enabled
                              // uniquePlayerOut: only show first recommendation per player being transferred out
                              // uniquePlayerIn: only show first recommendation per player being transferred in
                              const finalRecommendations = (uniquePlayerOut || uniquePlayerIn)
                                ? affordableRecommendations.reduce((acc: any[], rec: any) => {
                                    if (rec.type === 'roll') {
                                      acc.push(rec);
                                      return acc;
                                    }
                                    // Check uniqueness constraints based on toggle states
                                    const playerOutUsed = uniquePlayerOut && acc.some((r: any) => r.playerOut?.id === rec.playerOut?.id);
                                    const playerInUsed = uniquePlayerIn && acc.some((r: any) => r.playerIn?.id === rec.playerIn?.id);
                                    // Only add if player passes the enabled uniqueness constraints
                                    if (!playerOutUsed && !playerInUsed) {
                                      acc.push(rec);
                                    }
                                    return acc;
                                  }, [])
                                : affordableRecommendations;

                              // Check if we should show "Roll Your Transfer" card instead of empty recommendations
                              // availableRecommendations contains all valid moves after position/applied filtering
                              const isRollGW = availableRecommendations.some(r => r.type === 'roll') || 
                                              (gwData.recommendations && gwData.recommendations.some((r: any) => r.type === 'roll'));
                              const appliedTransfersInGW = getAppliedTransfersForGW(gw);

                              if ((finalRecommendations.length === 0 || (finalRecommendations.length === 1 && finalRecommendations[0].type === 'roll')) 
                                  && isRollGW && appliedTransfersInGW.length === 0) {
                                return (
                                  <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm mt-4">
                                    <CardContent className="pt-8 pb-10">
                                      <div className="text-center py-6">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
                                          <ArrowRightLeft className="h-8 w-8 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Roll Your Transfer</h3>
                                        <p className="text-gray-600 max-w-md mx-auto px-4 leading-relaxed">
                                          Your current team is perfectly optimized for GW{gw}. No transfers are recommended this week - save your free transfer to have more flexibility next week!
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              }
                              
                              // Show message if filter returns no results
                              if (availableRecommendations.length === 0 && positionFilter.length > 0 && appliedTransfersInGW.length === 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                                    No {positionFilter.join('/')} transfer recommendations for this gameweek
                                  </div>
                                );
                              }

                              if (finalRecommendations.length === 0 && getAppliedTransfersForGW(gw).length > 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                                    No more affordable transfer recommendations available
                                  </div>
                                );
                              }
                              
                              return (
                                <>
                                  {(() => {
                                    const freeTransfersRemaining = getFreeTransfersRemaining(gw);
                                    if (freeTransfersRemaining < 2) return null;

                                    const appliedInGW = getAppliedTransfersForGW(gw);
                                    const appliedOutIds = new Set(appliedInGW.map((t: any) => t.playerOut.id));
                                    const appliedInIds = new Set(appliedInGW.map((t: any) => t.playerIn.id));

                                    // Individual recs for this GW (cascade-filtered, non-roll), sorted by gain descending
                                    // Use a copy to avoid mutating the finalRecommendations array used by the cards below
                                    const individualRecs = [...finalRecommendations]
                                      .filter((r: any) => r.type !== 'roll')
                                      .sort((a: any, b: any) => (b.fourGWPointsGain || 0) - (a.fourGWPointsGain || 0));

                                    // Build combo entries per size, largest first
                                    let comboEntries: Array<{ size: number; rawCombo: any[] }> = [];
                                    if (gwData.bestCombinations && Object.keys(gwData.bestCombinations).length > 0) {
                                      comboEntries = Object.entries(gwData.bestCombinations)
                                        .map(([sizeStr, data]: [string, any]) => ({ size: Number(sizeStr), rawCombo: data.combo }))
                                        .filter(e => e.size >= 2 && e.size <= freeTransfersRemaining)
                                        .sort((a, b) => b.size - a.size);
                                    } else if (gwData.bestCombination && gwData.bestCombination.length >= 2) {
                                      comboEntries = [{ size: gwData.bestCombination.length, rawCombo: gwData.bestCombination }];
                                    }
                                    if (comboEntries.length === 0) return null;

                                    // Track which displayed transfer counts have been shown
                                    // to prevent duplicate cards with the same label (e.g. two "Best 2-Transfer Combo")
                                    const shownDisplayCounts = new Set<number>();

                                    return (
                                      <>
                                        {comboEntries.map(({ size, rawCombo }) => {
                                          const validCombo = rawCombo.filter((c: any) => {
                                            if (appliedOutIds.has(c.playerOut.id)) return false;
                                            if (appliedInIds.has(c.playerIn.id)) return false;
                                            if (!filterAppliedFromRecommendations([c], gw).length) return false;
                                            return true;
                                          });

                                          const targetCount = Math.min(freeTransfersRemaining, size);
                                          let comboToShow: any[] = [];

                                          if (validCombo.length >= targetCount) {
                                            comboToShow = validCombo.slice(0, targetCount);
                                          } else {
                                            const fallback = individualRecs.slice(0, targetCount);
                                            if (fallback.length >= 2) {
                                              comboToShow = fallback;
                                            } else if (validCombo.length >= 2) {
                                              comboToShow = validCombo;
                                            } else {
                                              return null;
                                            }
                                          }

                                          if (comboToShow.length < 2) return null;
                                          if (shownDisplayCounts.has(comboToShow.length)) return null;
                                          shownDisplayCounts.add(comboToShow.length);
                                          const totalGain = comboToShow.reduce((s: number, c: any) => s + (c.fourGWPointsGain || 0), 0);
                                          return (
                                            <div key={`combo-size-${size}`} className="mb-4">
                                              <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <Target className="h-4 w-4 text-purple-600" />
                                                  </div>
                                                  <h3 className="text-base font-bold text-purple-800">Best {comboToShow.length}-Transfer Combo</h3>
                                                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 ml-auto">
                                                    +{totalGain.toFixed(1)} pts (4 GWs)
                                                  </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                  {comboToShow.map((combo: any, idx: number) => (
                                                    <div key={`combo-${combo.playerOut.id}-${combo.playerIn.id}`} className="p-2 bg-white/70 rounded-md border border-purple-200">
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold text-purple-600 w-4">{idx + 1}.</span>
                                                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">OUT</Badge>
                                                        <span className="text-sm font-medium">{combo.playerOut.webName}</span>
                                                        <span className="text-xs text-gray-500">£{(combo.playerOut.sellingPrice / 10).toFixed(1)}m</span>
                                                        <span className="text-xs text-gray-500">({(combo.playerOut.fourGWPoints || 0).toFixed(1)} pts)</span>
                                                        <ArrowRightLeft className="h-3.5 w-3.5 text-gray-400" />
                                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">IN</Badge>
                                                        <span className="text-sm font-medium">{combo.playerIn.webName}</span>
                                                        <span className="text-xs text-gray-500">£{(combo.playerIn.nowCost / 10).toFixed(1)}m</span>
                                                        <span className="text-xs text-gray-500">({(combo.playerIn.fourGWPoints || 0).toFixed(1)} pts)</span>
                                                        <span className="text-xs font-semibold text-green-600 ml-auto">+{(combo.fourGWPointsGain || 0).toFixed(1)}</span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                                <div className="mt-3 flex items-center justify-between">
                                                  <span className="text-xs text-purple-600">
                                                    Combined net cost: £{(comboToShow.reduce((sum: number, c: any) => sum + c.playerIn.nowCost - c.playerOut.sellingPrice, 0) / 10).toFixed(1)}m
                                                  </span>
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                      comboToShow.forEach((combo: any) => {
                                                        applyTransfer(gw, combo);
                                                      });
                                                    }}
                                                    className="h-8 px-3 bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400"
                                                  >
                                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                                    Apply All
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </>
                                    );
                                  })()}
                                  {finalRecommendations.length > 0 && (
                                <div>
                                  <h3 className="text-base font-semibold text-gray-700 mb-2">
                                    Transfer Recommendations
                                  </h3>
                                  <div className="space-y-2">
                                    {finalRecommendations.slice(0, 30).map((rec: any, index: number) => {
                                      const netCost = rec.playerIn.nowCost - rec.playerOut.sellingPrice;
                                      const itbAfterThisTransfer = runningBank - netCost;
                                      const freeTransfersRemaining = getFreeTransfersRemaining(gw);
                                      const isTopRecommendation = index < freeTransfersRemaining;
                                      
                                      return (
                                      <div
                                        key={`${rec.playerOut.id}-${rec.playerIn.id}`}
                                        className={`p-2 sm:p-3 rounded-lg shadow-sm space-y-2 transition-colors ${
                                          isTopRecommendation 
                                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 hover:border-green-500' 
                                            : 'bg-gradient-to-r from-orange-50 to-white border border-orange-200 hover:border-orange-300'
                                        }`}
                                        data-testid={`transfer-recommendation-gw${gw}-${index}`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="space-y-1 flex-1">
                                            <div className="flex items-start gap-2">
                                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 shrink-0">
                                                OUT
                                              </Badge>
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                <span className="text-sm font-medium text-gray-900 break-words" data-testid={`player-out-name-gw${gw}-${index}`}>{rec.playerOut.webName}</span>
                                                <span className="text-xs text-gray-500 whitespace-nowrap">£{(rec.playerOut.sellingPrice / 10).toFixed(1)}m</span>
                                                <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-out-points-gw${gw}-${index}`}>
                                                  ({(rec.playerOut.fourGWPoints || 0).toFixed(1)} pts)
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 shrink-0">
                                                IN
                                              </Badge>
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                                <span className="text-sm font-medium text-gray-900 break-words" data-testid={`player-in-name-gw${gw}-${index}`}>{rec.playerIn.webName}</span>
                                                <span className="text-xs text-gray-500 whitespace-nowrap">£{(rec.playerIn.nowCost / 10).toFixed(1)}m</span>
                                                <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-in-points-gw${gw}-${index}`}>
                                                  ({(rec.playerIn.fourGWPoints || 0).toFixed(1)} pts)
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyTransfer(gw, rec)}
                                            className="h-8 px-3 bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400 shrink-0"
                                          >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Apply
                                          </Button>
                                        </div>
                                        <div className={`grid grid-cols-3 sm:grid-cols-3 gap-2 pt-1.5 border-t ${isTopRecommendation ? 'border-green-300' : 'border-orange-200'}`}>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">Next 4 GWs</div>
                                            <div className="text-sm font-bold text-green-600" data-testid={`points-gain-4gw-${gw}-${index}`}>+{(rec.fourGWPointsGain || 0).toFixed(1)}</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">Cost</div>
                                            <div className={`text-xs sm:text-sm font-semibold ${netCost >= 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`cost-gw${gw}-${index}`}>
                                              {netCost < 0 ? '- ' : ''}{(Math.abs(netCost) / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">ITB After</div>
                                            <div className="text-xs sm:text-sm font-medium text-gray-700" data-testid={`budget-after-gw${gw}-${index}`}>
                                              £{(itbAfterThisTransfer / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </>
                          );
                        })()}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No transfer recommendations for this gameweek
                      </div>
                    )}
                  </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Optimized Team After Transfers */}
        {searchedId && !isLoadingRecommendations && optimizedTeam && selectedGameweek && (
          <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-white">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Updated Team - GW{selectedGameweek}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Optimized Lineup
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Team with primary transfers applied and optimized for maximum points
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-6">
                <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Formation</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {optimizedTeam.formation?.name || 'N/A'}
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Projected Points</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {optimizedTeam.totalPoints.toFixed(1)}
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border col-span-2 md:col-span-1">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Players</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {optimizedTeam.lineup.length}
                  </div>
                </div>
              </div>

              {/* Pitch View */}
              {(() => {
                // Transform to PitchPlayer format for starting 11
                const pitchPlayers: PitchPlayer[] = optimizedTeam.lineup.slice(0, 11).map((pick: TeamPick) => {
                  const player = getPlayerById(pick.element);
                  const team = bootstrapData?.teams?.find((t: any) => t.id === player?.team);
                  const isTransferredIn = transferredInPlayers.has(pick.element);
                  return {
                    element: pick.element,
                    element_type: player?.element_type || 4,
                    position: pick.position,
                    is_captain: pick.is_captain,
                    is_vice_captain: pick.is_vice_captain,
                    web_name: player?.web_name,
                    team_short_name: team?.short_name,
                    team_code: team?.code,
                    custom_badge_text: (pick.projectedPoints || 0).toFixed(1),
                    custom_badge_color: isTransferredIn ? 'bg-green-600' : 'bg-purple-600',
                    status: player?.status,
                    chance_of_playing: player?.chance_of_playing_next_round,
                    news: player?.news,
                  };
                });
                
                // Transform bench players
                const benchPitchPlayers: PitchPlayer[] = optimizedTeam.lineup.slice(11, 15).map((pick: TeamPick) => {
                  const player = getPlayerById(pick.element);
                  const team = bootstrapData?.teams?.find((t: any) => t.id === player?.team);
                  const isTransferredIn = transferredInPlayers.has(pick.element);
                  return {
                    element: pick.element,
                    element_type: player?.element_type || 4,
                    position: pick.position,
                    is_captain: false,
                    is_vice_captain: false,
                    web_name: player?.web_name,
                    team_short_name: team?.short_name,
                    team_code: team?.code,
                    custom_badge_text: (pick.projectedPoints || 0).toFixed(1),
                    custom_badge_color: isTransferredIn ? 'bg-green-500' : 'bg-gray-500',
                    status: player?.status,
                    chance_of_playing: player?.chance_of_playing_next_round,
                    news: player?.news,
                  };
                });
                
                return (
                  <PitchView 
                    players={pitchPlayers} 
                    benchPlayers={benchPitchPlayers}
                  />
                );
              })()}

            </CardContent>
          </Card>
        )}

        {/* No recommendations available state or Roll Transfer suggestion */}
        {searchedId && !isLoadingRecommendations && adjustedRecommendations && 
          (!adjustedRecommendations.gameweeks || !selectedGameweek || !adjustedRecommendations.gameweeks[selectedGameweek]) && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm mt-6">
            <CardContent className="pt-8 pb-10">
              <div className="text-center py-6 sm:py-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
                  <ArrowRightLeft className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Roll Your Transfer</h3>
                <p className="text-gray-600 max-w-md mx-auto px-4 leading-relaxed">
                  Your current team is perfectly optimized for GW{selectedGameweek}. No transfers are recommended this week - save your free transfer to have more flexibility next week!
                </p>
                <div className="mt-8">
                  <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-indigo-200 text-indigo-700 bg-indigo-50/50">
                    GW{selectedGameweek} Strategy: Save FT
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

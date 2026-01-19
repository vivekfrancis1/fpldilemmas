import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Search, TrendingUp, Crown, Users, AlertTriangle, AlertCircle, Heart, XCircle, Clock, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyAvailabilityAdjustments, type BootstrapData as AvailabilityBootstrapData } from "@/lib/availability-adjustments";
import { extractManagerId } from "@/lib/manager-id-utils";
import { FplConnectDialog } from "@/components/fpl-connect-dialog";
import { useAuth } from "@/hooks/useAuth";

// Player Availability Badge Component
function PlayerAvailabilityBadge({ player }: { player: any }) {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';

  if (chanceOfPlaying >= 100 && status === 'a') {
    return null;
  }

  let statusColor = 'text-yellow-600';
  let statusBg = 'bg-yellow-50';
  let statusIcon = Clock;
  let statusText = 'Doubtful';
  let statusBorder = 'border-yellow-200';

  if (status === 's' || status === 'suspended') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = XCircle;
    statusText = 'Suspended';
    statusBorder = 'border-red-200';
  } else if (status === 'i' || status === 'injured') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = Heart;
    statusText = 'Injured';
    statusBorder = 'border-red-200';
  } else if (status === 'd' || status === 'doubtful') {
    statusColor = 'text-yellow-600';
    statusBg = 'bg-yellow-50';
    statusIcon = AlertTriangle;
    statusText = 'Doubtful';
    statusBorder = 'border-yellow-200';
  } else if (status === 'u' || status === 'unavailable') {
    statusColor = 'text-gray-600';
    statusBg = 'bg-gray-50';
    statusIcon = XCircle;
    statusText = 'Unavailable';
    statusBorder = 'border-gray-200';
  }

  const StatusIcon = statusIcon;

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold cursor-help transition-colors hover:opacity-80 ${statusBg} ${statusBorder} border shadow-sm`}>
          <StatusIcon className={`h-3 w-3 ${statusColor}`} />
          <span className={statusColor}>{chanceOfPlaying}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            <span className="font-semibold text-gray-900">{statusText}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Chance of playing:</span> {chanceOfPlaying}%
          </div>
          {news && (
            <div className="text-sm text-gray-700 border-t pt-2">
              <span className="font-medium">News:</span> {news}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface TeamPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  selling_price: number;
  purchase_price?: number;
}

interface TeamData {
  picks: TeamPick[];
  transfers: {
    cost: number;
    status: string;
    limit: number;
    made: number;
    bank: number;
    value: number;
  };
  entry?: {
    bank: number;
    value: number;
  };
  chips?: Array<{
    name: string;
    time: string;
    event: number;
  }>;
}

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  status: string;
  news: string;
  chance_of_playing_next_round?: number;
}

interface BootstrapData {
  elements: Player[];
  element_types: Array<{
    id: number;
    plural_name: string;
    singular_name: string;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
  events: Array<{
    id: number;
    name: string;
    is_current: boolean;
    is_next: boolean;
    finished: boolean;
  }>;
}

interface OptimizedLineup {
  starting11: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>;
  bench: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    benchPosition: number;
  }>;
  totalProjectedPoints: number;
  captainProjectedPoints: number;
  gameweek: number;
}

export default function TeamOptimizer() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [optimizedLineups, setOptimizedLineups] = useState<Map<number, OptimizedLineup>>(new Map());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [gameweekHorizon] = useState<number>(12); // Fixed at 12 gameweeks
  const [freeHitOptimizations, setFreeHitOptimizations] = useState<Map<number, number>>(new Map());
  const [isOptimizingFreeHit, setIsOptimizingFreeHit] = useState(false);
  const [useFallbackEndpoint, setUseFallbackEndpoint] = useState(false);
  
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

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Check if user is viewing their own team
  const isOwnTeam = user?.fplManagerId && searchedId && Number(searchedId) === user.fplManagerId;

  // Determine which endpoint to use (with fallback for expired sessions)
  const shouldUseAuthenticatedEndpoint = isOwnTeam && !useFallbackEndpoint;

  // Use authenticated my-team endpoint for own team (shows GW 13 unconfirmed team)
  // Fall back to public picks endpoint if session expired (GW 12 confirmed team)
  const { data: teamData, isLoading: isLoadingTeam, error: teamDataError } = useQuery<TeamData>({
    queryKey: shouldUseAuthenticatedEndpoint ? ["/api/fpl/my-team"] : ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false, // Don't auto-retry if FPL session expired
  });

  // Handle FPL session expiry - fall back to public endpoint
  useEffect(() => {
    if (teamDataError && shouldUseAuthenticatedEndpoint && searchedId) {
      console.log("⚠️ FPL session expired or unavailable, falling back to manager ID endpoint");
      setUseFallbackEndpoint(true);
    }
  }, [teamDataError, shouldUseAuthenticatedEndpoint, searchedId]);

  // Fetch fixtures data
  const { data: fixturesData } = useQuery<any[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 10 * 60 * 1000,
  });

  // Calculate start and end gameweeks based on horizon
  const gameweekRange = useMemo(() => {
    if (!bootstrapData) return { start: 12, end: 23 };
    
    const nextEvent = bootstrapData.events.find(e => !e.finished && !e.is_current);
    let startGW = nextEvent?.id || 1;
    
    if (!nextEvent) {
      const currentEvent = bootstrapData.events.find(e => e.is_current);
      if (currentEvent) {
        startGW = currentEvent.id + 1;
      } else {
        const lastFinished = bootstrapData.events.filter(e => e.finished).sort((a, b) => b.id - a.id)[0];
        if (lastFinished) {
          startGW = lastFinished.id + 1;
        }
      }
    }
    
    return {
      start: startGW,
      end: Math.min(startGW + gameweekHorizon - 1, 38)
    };
  }, [bootstrapData, gameweekHorizon]);

  // Fetch projections using cached endpoint for faster loading (always gets next 12 GWs)
  const { data: playerProjections12GW, refetch: refetchProjections, isRefetching } = useQuery<any[]>({
    queryKey: ["/api/cached/player-total-points"],
    enabled: !!bootstrapData,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Apply availability adjustments and filter by selected horizon
  const adjustedPlayerProjections = useMemo(() => {
    if (!playerProjections12GW || !bootstrapData) return playerProjections12GW;

    const currentGameweek = bootstrapData.events.find((e: any) => e.is_current)?.id || 
                           bootstrapData.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;

    return playerProjections12GW.map(player => {
      // Find matching player in bootstrap data for availability info
      const bootstrapPlayer = bootstrapData.elements?.find((p: any) => p.id === player.playerId);
      if (!bootstrapPlayer) return player;

      // Create player object with required fields for availability adjustment
      const playerWithAvailability = {
        ...player,
        chanceOfPlayingNextRound: bootstrapPlayer.chance_of_playing_next_round,
        status: bootstrapPlayer.status,
        news: bootstrapPlayer.news
      };

      // Apply availability adjustments (handles injury/suspension/AFCON)
      const adjustedPlayer = applyAvailabilityAdjustments(playerWithAvailability, bootstrapData as any, currentGameweek);
      
      // Filter gameweek projections based on selected horizon
      const filteredGameweekProjections: { [key: string]: number } = {};
      let filteredTotal = 0;
      
      for (let gw = gameweekRange.start; gw <= gameweekRange.end; gw++) {
        const gwKey = gw.toString();
        if (adjustedPlayer.gameweekProjections?.[gwKey] !== undefined) {
          filteredGameweekProjections[gwKey] = adjustedPlayer.gameweekProjections[gwKey];
          filteredTotal += adjustedPlayer.gameweekProjections[gwKey];
        }
      }
      
      return {
        ...adjustedPlayer,
        gameweekProjections: filteredGameweekProjections,
        totalExpectedPoints: filteredTotal,
        averagePerGameweek: filteredTotal / gameweekHorizon
      };
    });
  }, [playerProjections12GW, bootstrapData, gameweekRange, gameweekHorizon]);

  // Get player by ID helper
  const getPlayerById = (id: number): Player | undefined => {
    // First try to get from adjusted projections (has availability data)
    const adjustedPlayer = adjustedPlayerProjections?.find(p => p.playerId === id);
    if (adjustedPlayer) {
      // Merge with bootstrap data for other fields
      const bootstrapPlayer = bootstrapData?.elements.find(p => p.id === id);
      return {
        ...bootstrapPlayer,
        chanceOfPlayingNextRound: adjustedPlayer.chanceOfPlayingNextRound,
        status: adjustedPlayer.status,
        news: adjustedPlayer.news
      } as Player;
    }
    return bootstrapData?.elements.find(p => p.id === id);
  };

  const handleSearch = () => {
    if (managerId.trim()) {
      setUseFallbackEndpoint(false); // Reset fallback flag to try authenticated endpoint first
      setSearchedId(managerId.trim());
      saveManagerIdToCache(managerId.trim());
    }
  };

  // Get next N gameweeks based on horizon
  const getNextGameweeks = () => {
    if (!bootstrapData) return [];
    
    const nextEvent = bootstrapData.events.find(e => !e.finished && !e.is_current);
    let startGW = nextEvent?.id || 1;
    
    if (!nextEvent) {
      const currentEvent = bootstrapData.events.find(e => e.is_current);
      if (currentEvent) {
        startGW = currentEvent.id + 1;
      } else {
        const lastFinished = bootstrapData.events.filter(e => e.finished).sort((a, b) => b.id - a.id)[0];
        if (lastFinished) {
          startGW = lastFinished.id + 1;
        }
      }
    }
    
    const nextGameweeks = [];
    for (let i = 0; i < gameweekHorizon; i++) {
      const gwNumber = startGW + i;
      const gw = bootstrapData.events.find(e => e.id === gwNumber);
      if (gw && gwNumber <= 38) {
        nextGameweeks.push(gw);
      }
    }
    
    return nextGameweeks;
  };

  const nextGameweeks = getNextGameweeks();

  // Initialize manual lineup when team data loads
  useEffect(() => {
    if (teamData?.picks && teamData.picks.length > 0) {
      // Auto-select first gameweek when team data loads
      if (!selectedGameweek && nextGameweeks.length > 0) {
        setSelectedGameweek(nextGameweeks[0].id);
      }
    }
  }, [teamData]);

  // Trigger auto-optimization when data is ready
  useEffect(() => {
    if (teamData?.picks && teamData.picks.length > 0 && adjustedPlayerProjections && adjustedPlayerProjections.length > 0) {
      const nextGWs = getNextGameweeks();
      // Re-optimize if we have no lineups OR if horizon changed
      if (optimizedLineups.size === 0 || optimizedLineups.size !== nextGWs.length) {
        optimizeAllGameweeks();
      }
    }
  }, [teamData, gameweekHorizon, adjustedPlayerProjections]);

  // Optimize lineup for all gameweeks
  const optimizeAllGameweeks = async () => {
    if (!teamData || !adjustedPlayerProjections) return;

    setIsOptimizing(true);
    const nextGWs = getNextGameweeks();
    const newOptimizedLineups = new Map<number, OptimizedLineup>();

    try {
      for (const gw of nextGWs) {
        const response = await fetch("/api/transfer-planner/auto-optimize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            picks: teamData.picks,
            gameweek: gw.id
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Optimization failed for GW${gw.id}`);
        }

        const data: OptimizedLineup = await response.json();
        newOptimizedLineups.set(gw.id, data);
      }

      setOptimizedLineups(newOptimizedLineups);
      toast({
        title: "Optimization Complete",
        description: `Optimized lineups for ${nextGWs.length} gameweeks`,
      });
    } catch (error: any) {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Calculate accurate Free Hit points for recommended gameweeks
  useEffect(() => {
    const calculateFreeHitOptimizations = async () => {
      if (optimizedLineups.size === 0 || !teamData) {
        return;
      }

      const nextGWs = getNextGameweeks();
      if (nextGWs.length === 0) return;

      // Split into two sets
      const set1GWs = nextGWs.filter(gw => gw.id <= 19);
      const set2GWs = nextGWs.filter(gw => gw.id >= 20);

      const gwsToOptimize: number[] = [];

      // Find best GW in Set 1 using estimation
      if (set1GWs.length > 0) {
        let bestSet1GW = set1GWs[0].id;
        let bestSet1Improvement = 0;

        set1GWs.forEach(gw => {
          const gwLineup = optimizedLineups.get(gw.id);
          if (gwLineup?.totalProjectedPoints) {
            const normalPoints = gwLineup.totalProjectedPoints;
            const estimatedFHPoints = normalPoints * 1.25;
            const improvement = estimatedFHPoints - normalPoints;
            
            if (improvement > bestSet1Improvement) {
              bestSet1Improvement = improvement;
              bestSet1GW = gw.id;
            }
          }
        });

        gwsToOptimize.push(bestSet1GW);
      }

      // Find best GW in Set 2 using estimation
      if (set2GWs.length > 0) {
        let bestSet2GW = set2GWs[0].id;
        let bestSet2Improvement = 0;

        set2GWs.forEach(gw => {
          const gwLineup = optimizedLineups.get(gw.id);
          if (gwLineup?.totalProjectedPoints) {
            const normalPoints = gwLineup.totalProjectedPoints;
            const estimatedFHPoints = normalPoints * 1.25;
            const improvement = estimatedFHPoints - normalPoints;
            
            if (improvement > bestSet2Improvement) {
              bestSet2Improvement = improvement;
              bestSet2GW = gw.id;
            }
          }
        });

        gwsToOptimize.push(bestSet2GW);
      }

      // Now get real FH optimizations for only these 2 gameweeks
      if (gwsToOptimize.length === 0) return;

      setIsOptimizingFreeHit(true);
      const newFreeHitOptimizations = new Map<number, number>();

      try {
        for (const gwId of gwsToOptimize) {
          const response = await fetch("/api/optimize-freehit-team", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ gameweek: gwId })
          });

          if (response.ok) {
            const data = await response.json();
            newFreeHitOptimizations.set(gwId, data.totalProjectedPoints);
          }
        }

        setFreeHitOptimizations(newFreeHitOptimizations);
      } catch (error) {
        console.error('Free Hit optimization error:', error);
      } finally {
        setIsOptimizingFreeHit(false);
      }
    };

    calculateFreeHitOptimizations();
  }, [optimizedLineups, teamData]);

  // Calculate total projected points for selected horizon
  const calculateTotalProjectedPoints = (): number => {
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0 || optimizedLineups.size === 0) return 0;
    
    let total = 0;
    nextGWs.forEach(gw => {
      const gwLineup = optimizedLineups.get(gw.id);
      if (gwLineup) {
        gwLineup.starting11.forEach(pick => {
          const points = pick.projectedPoints || 0;
          const multiplier = pick.isCaptain ? 2 : 1;
          total += points * multiplier;
        });
      }
    });
    
    return total;
  };

  const total6GWPoints = calculateTotalProjectedPoints();

  // Get player projected points
  const getPlayerProjectedPoints = (playerId: number, gameweek: number): number => {
    if (!adjustedPlayerProjections) return 0;
    const projection = adjustedPlayerProjections.find((p: any) => p.playerId === playerId);
    if (!projection?.gameweekProjections) return 0;
    return projection.gameweekProjections[gameweek.toString()] || 0;
  };

  // Calculate formation from picks
  const calculateFormation = (picks: any[]): string => {
    const defenders = picks.filter(p => {
      const player = getPlayerById(p.element);
      return player?.element_type === 2;
    }).length;

    const midfielders = picks.filter(p => {
      const player = getPlayerById(p.element);
      return player?.element_type === 3;
    }).length;

    const forwards = picks.filter(p => {
      const player = getPlayerById(p.element);
      return player?.element_type === 4;
    }).length;

    return `${defenders}-${midfielders}-${forwards}`;
  };

  // Get fixture info for a player in a gameweek
  const getPlayerFixtureInfo = (playerId: number, gameweek: number) => {
    if (!fixturesData || !bootstrapData) return null;

    const player = getPlayerById(playerId);
    if (!player) return null;

    const fixture = fixturesData.find(f => 
      f.event === gameweek && (f.team_h === player.team || f.team_a === player.team)
    );

    if (!fixture) return null;

    const isHome = fixture.team_h === player.team;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponent = bootstrapData.teams.find(t => t.id === opponentId);

    return {
      opponent: opponent?.short_name || '',
      isHome
    };
  };

  // Calculate chip recommendations
  const getChipRecommendations = () => {
    if (!adjustedPlayerProjections || !teamData || optimizedLineups.size === 0 || !bootstrapData) {
      return null;
    }

    const nextGWs = getNextGameweeks();
    const usedChips = teamData.chips || [];
    
    // Get current gameweek
    const currentGameweek = bootstrapData.events.find((e: any) => e.is_current)?.id || 
                           bootstrapData.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;
    
    // Split gameweeks: first half (≤19) and second half (≥20)
    const firstHalfGWs = nextGWs.filter(gw => gw.id <= 19);
    const secondHalfGWs = nextGWs.filter(gw => gw.id >= 20);
    
    // Check if first-half chips have expired (current GW > 19)
    const firstHalfChipsExpired = currentGameweek > 19;
    
    // Check if second-half chips are unlocked (current GW >= 20)
    const secondHalfChipsUnlocked = currentGameweek >= 20;

    type ChipOption = { gw: number; additionalPoints: number };
    type FreeHitOption = { gw: number; normalPoints: number; freeHitPoints: number };

    const recommendations = { 
      bboost1_options: [] as ChipOption[],
      tripleC1_options: [] as ChipOption[],
      freehit1_options: [] as FreeHitOption[],
      bboost2_options: [] as ChipOption[],
      tripleC2_options: [] as ChipOption[],
      freehit2_options: [] as FreeHitOption[]
    };

    const chipMaxUses: { [key: string]: number } = {
      'bboost': 2,
      '3xc': 2,
      'freehit': 2,
    };

    // Track chip uses by season half based on when they were actually used
    // FPL API my-team endpoint returns chips with: name, time, event (gameweek used)
    // A chip in the array means it has been used in that gameweek
    const getChipUsedGWs = (chipName: string): number[] => {
      return usedChips
        .filter((c: any) => c.name === chipName && c.event)
        .map((c: any) => c.event);
    };
    
    const countChipUses = (chipName: string) => 
      usedChips.filter((c: any) => c.name === chipName && c.event).length;
    const countFirstHalfChipUses = (chipName: string) => {
      const usedGWs = getChipUsedGWs(chipName);
      return usedGWs.filter(gw => gw <= 19).length;
    };
    const countSecondHalfChipUses = (chipName: string) => {
      const usedGWs = getChipUsedGWs(chipName);
      return usedGWs.filter(gw => gw >= 20).length;
    };
    
    const hasRemainingUses = (chipName: string) => {
      const used = countChipUses(chipName);
      const max = chipMaxUses[chipName] || 1;
      return used < max;
    };
    
    // Check if specific half chip is available
    const hasFirstHalfChipAvailable = (chipName: string) => {
      const firstHalfUsed = countFirstHalfChipUses(chipName);
      const secondHalfUsed = countSecondHalfChipUses(chipName);
      const totalMax = chipMaxUses[chipName] || 1;
      
      // If first-half chip already used, not available
      if (firstHalfUsed > 0) {
        return false;
      }
      
      // If we've already used the allotted chips, none available
      if (firstHalfUsed + secondHalfUsed >= totalMax) return false;
      
      // If first-half chips expired, none available
      if (firstHalfChipsExpired) return false;
      
      // Otherwise we have a first-half chip available
      return true;
    };
    
    const hasSecondHalfChipAvailable = (chipName: string) => {
      const secondHalfUsed = countSecondHalfChipUses(chipName);
      
      // If second-half chip already used, not available
      if (secondHalfUsed > 0) return false;
      
      // In FPL 2024/25, each chip can be used twice:
      // - First use must be in GW1-19 (first-half)
      // - Second use is available from GW20+ (second-half)
      // The second-half chip is always available if not yet used, regardless of first-half usage
      
      // Show recommendations for second-half chips (GW20+)
      return true;
    };

    // Helper to calculate bench points for a gameweek
    const getBenchPoints = (gwId: number) => {
      const benchPlayers = optimizedLineups.get(gwId)?.bench || [];
      let benchPoints = 0;
      benchPlayers.forEach(pick => {
        const projection = adjustedPlayerProjections.find((p: any) => p.playerId === pick.element);
        if (projection?.gameweekProjections) {
          benchPoints += projection.gameweekProjections[gwId.toString()] || 0;
        }
      });
      return benchPoints;
    };

    // Helper to calculate captain points for a gameweek
    const getCaptainPoints = (gwId: number) => {
      const gwLineup = optimizedLineups.get(gwId);
      if (gwLineup?.starting11) {
        const captain = gwLineup.starting11.find(p => p.isCaptain);
        if (captain) {
          return captain.projectedPoints || 0;
        }
      }
      return 0;
    };

    // Helper to calculate free hit improvement for a gameweek
    const getFreeHitImprovement = (gwId: number) => {
      let startingPoints = 0;
      const gwLineup = optimizedLineups.get(gwId);
      if (gwLineup?.totalProjectedPoints) {
        startingPoints = gwLineup.totalProjectedPoints;
      }
      const realFHPoints = freeHitOptimizations.get(gwId);
      const freeHitPoints = realFHPoints !== undefined ? realFHPoints : Math.round(startingPoints * 1.25);
      return {
        normalPoints: startingPoints,
        freeHitPoints: freeHitPoints,
        improvement: freeHitPoints - startingPoints
      };
    };

    // Bench Boost recommendations
    // BB1: Only show if available and first-half gameweeks exist
    if (hasFirstHalfChipAvailable('bboost') && firstHalfGWs.length > 0) {
      const bb1Scores = firstHalfGWs.map(gw => ({ gw: gw.id, points: getBenchPoints(gw.id) }));
      bb1Scores.sort((a, b) => b.points - a.points);

      if (bb1Scores.length >= 2) {
        recommendations.bboost1_options = bb1Scores.slice(0, 2).map(s => ({ gw: s.gw, additionalPoints: s.points }));
      } else if (bb1Scores.length === 1) {
        recommendations.bboost1_options = [
          { gw: bb1Scores[0].gw, additionalPoints: bb1Scores[0].points },
          { gw: bb1Scores[0].gw, additionalPoints: bb1Scores[0].points }
        ];
      }
    }
    
    // BB2: Only show if available and second-half gameweeks exist
    if (hasSecondHalfChipAvailable('bboost') && secondHalfGWs.length > 0) {
      const bb2Scores = secondHalfGWs.map(gw => ({ gw: gw.id, points: getBenchPoints(gw.id) }));
      bb2Scores.sort((a, b) => b.points - a.points);

      if (bb2Scores.length >= 2) {
        recommendations.bboost2_options = bb2Scores.slice(0, 2).map(s => ({ gw: s.gw, additionalPoints: s.points }));
      } else if (bb2Scores.length === 1) {
        recommendations.bboost2_options = [
          { gw: bb2Scores[0].gw, additionalPoints: bb2Scores[0].points },
          { gw: bb2Scores[0].gw, additionalPoints: bb2Scores[0].points }
        ];
      }
    }

    // Triple Captain 1 recommendations (first half GW ≤19)
    if (hasFirstHalfChipAvailable('3xc') && firstHalfGWs.length > 0) {
      const tc1Scores = firstHalfGWs.map(gw => ({ gw: gw.id, points: getCaptainPoints(gw.id) }));
      tc1Scores.sort((a, b) => b.points - a.points);
      
      if (tc1Scores.length >= 2) {
        recommendations.tripleC1_options = tc1Scores.slice(0, 2).map(s => ({ gw: s.gw, additionalPoints: s.points }));
      } else if (tc1Scores.length === 1) {
        recommendations.tripleC1_options = [
          { gw: tc1Scores[0].gw, additionalPoints: tc1Scores[0].points },
          { gw: tc1Scores[0].gw, additionalPoints: tc1Scores[0].points }
        ];
      }
    }

    // Triple Captain 2 recommendations (second half GW ≥20)
    if (hasSecondHalfChipAvailable('3xc') && secondHalfGWs.length > 0) {
      const tc2Scores = secondHalfGWs.map(gw => ({ gw: gw.id, points: getCaptainPoints(gw.id) }));
      tc2Scores.sort((a, b) => b.points - a.points);
      
      if (tc2Scores.length >= 2) {
        recommendations.tripleC2_options = tc2Scores.slice(0, 2).map(s => ({ gw: s.gw, additionalPoints: s.points }));
      } else if (tc2Scores.length === 1) {
        recommendations.tripleC2_options = [
          { gw: tc2Scores[0].gw, additionalPoints: tc2Scores[0].points },
          { gw: tc2Scores[0].gw, additionalPoints: tc2Scores[0].points }
        ];
      }
    }

    // Free Hit recommendations
    // FH1: Only show if available and first-half gameweeks exist
    if (hasFirstHalfChipAvailable('freehit') && firstHalfGWs.length > 0) {
      const fh1Scores = firstHalfGWs.map(gw => {
        const result = getFreeHitImprovement(gw.id);
        return { 
          gw: gw.id, 
          normalPoints: result.normalPoints,
          freeHitPoints: result.freeHitPoints,
          improvement: result.improvement
        };
      });
      fh1Scores.sort((a, b) => b.improvement - a.improvement);

      if (fh1Scores.length >= 2) {
        recommendations.freehit1_options = fh1Scores.slice(0, 2).map(s => ({ 
          gw: s.gw, 
          normalPoints: s.normalPoints, 
          freeHitPoints: s.freeHitPoints 
        }));
      } else if (fh1Scores.length === 1) {
        recommendations.freehit1_options = [
          { gw: fh1Scores[0].gw, normalPoints: fh1Scores[0].normalPoints, freeHitPoints: fh1Scores[0].freeHitPoints },
          { gw: fh1Scores[0].gw, normalPoints: fh1Scores[0].normalPoints, freeHitPoints: fh1Scores[0].freeHitPoints }
        ];
      }
    }
    
    // FH2: Only show if available and second-half gameweeks exist
    if (hasSecondHalfChipAvailable('freehit') && secondHalfGWs.length > 0) {
      const fh2Scores = secondHalfGWs.map(gw => {
        const result = getFreeHitImprovement(gw.id);
        return { 
          gw: gw.id, 
          normalPoints: result.normalPoints,
          freeHitPoints: result.freeHitPoints,
          improvement: result.improvement
        };
      });
      fh2Scores.sort((a, b) => b.improvement - a.improvement);

      if (fh2Scores.length >= 2) {
        recommendations.freehit2_options = fh2Scores.slice(0, 2).map(s => ({ 
          gw: s.gw, 
          normalPoints: s.normalPoints, 
          freeHitPoints: s.freeHitPoints 
        }));
      } else if (fh2Scores.length === 1) {
        recommendations.freehit2_options = [
          { gw: fh2Scores[0].gw, normalPoints: fh2Scores[0].normalPoints, freeHitPoints: fh2Scores[0].freeHitPoints },
          { gw: fh2Scores[0].gw, normalPoints: fh2Scores[0].normalPoints, freeHitPoints: fh2Scores[0].freeHitPoints }
        ];
      }
    }

    return recommendations;
  };

  // Render player row
  const renderPlayerRow = (pick: any, gw: any) => {
    const player = getPlayerById(pick.element);
    if (!player) return null;

    const points = pick.projectedPoints || 0;
    const fixtureInfo = getPlayerFixtureInfo(player.id, gw.id);

    return (
      <TableRow key={`${player.id}-${gw.id}`} className={!pick.benchPosition ? "bg-green-50/50 dark:bg-green-950/10" : "opacity-60"}>
        <TableCell className="sticky left-0 z-10 bg-white dark:bg-background text-[10px] sm:text-xs min-w-[120px] sm:min-w-[140px] md:min-w-[180px]">
          <div className="flex items-center justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {player.web_name}
              </div>
              <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-wrap">
                <span className="truncate">
                  {bootstrapData?.teams.find(t => t.id === player.team)?.short_name || ''}
                </span>
                {fixtureInfo && (
                  <Badge variant="outline" className="text-[8px] sm:text-[9px] px-0.5 sm:px-1 py-0 border-gray-300 dark:border-gray-600 whitespace-nowrap">
                    vs {fixtureInfo.opponent} ({fixtureInfo.isHome ? 'H' : 'A'})
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {pick.isCaptain && (
                <Badge className="bg-yellow-500 text-white text-[9px] sm:text-[10px] px-0.5 sm:px-1 py-0.5 h-3.5 sm:h-4 flex items-center gap-0.5">
                  <Crown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  <span className="hidden sm:inline">C</span>
                </Badge>
              )}
              {pick.isViceCaptain && (
                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-0.5 sm:px-1 py-0.5 h-3.5 sm:h-4 border-yellow-500 text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
                  <Crown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  <span className="hidden sm:inline">V</span>
                </Badge>
              )}
              <div className="hidden sm:block">
                <PlayerAvailabilityBadge player={player} />
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-center font-medium text-gray-900 dark:text-gray-100 text-xs">
          £{(player.now_cost / 10).toFixed(1)}m
        </TableCell>
        <TableCell className="text-center">
          <span className="font-bold text-purple-600 dark:text-purple-400 text-xs sm:text-sm">
            {points.toFixed(1)}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  if (!searchedId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Card>
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">Team Optimizer</CardTitle>
              <CardDescription>Auto-optimize your team lineup and get chip recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="manager-id" className="block text-sm font-medium text-gray-700 mb-2">
                  Manager ID
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    id="manager-id"
                    type="text"
                    placeholder="Paste browser URL or Manager ID (e.g., https://fantasy.premierleague.com/entry/123456)"
                    value={managerId}
                    onChange={(e) => {
                      const extractedId = extractManagerId(e.target.value);
                      setManagerId(extractedId);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !isLoadingTeam && handleSearch()}
                    data-testid="input-manager-id"
                    disabled={isLoadingTeam}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSearch}
                    className="flex items-center gap-2"
                    data-testid="button-search-manager"
                    disabled={!managerId.trim() || isLoadingTeam}
                  >
                    <Search className="h-4 w-4" />
                    {isLoadingTeam ? "Loading..." : "Search"}
                  </Button>
                  <FplConnectDialog />
                  {getManagerIdFromCache() && !searchedId && !isLoadingTeam && (
                    <Button 
                      onClick={() => {
                        const cachedId = getManagerIdFromCache();
                        if (cachedId) {
                          setManagerId(cachedId);
                          // Don't set searchedId - user must click Search button to fetch data
                        }
                      }}
                      variant="outline"
                      className="w-full sm:w-auto" 
                      data-testid="button-load-last-manager"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Load Last Manager
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4 flex items-center justify-center">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="text-gray-600">Loading team data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (teamDataError && !teamData) {
    const errorMessage = (teamDataError as any)?.message || '';
    const isSessionExpired = errorMessage.includes('session expired') || errorMessage.includes('401');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-2xl mx-auto pt-12 space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {isSessionExpired 
                ? `FPL session expired. Please reconnect to sync your latest team.`
                : `Unable to load team data for manager ID: ${searchedId}. Please check the ID and try again.`
              }
            </AlertDescription>
          </Alert>
          {isSessionExpired && (
            <div className="flex justify-center">
              <FplConnectDialog />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!teamData || !teamData.picks || teamData.picks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load team data for manager ID: {searchedId}. Please check the ID and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header - Compact */}
        <div className="text-center py-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Team Optimizer
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-300 hidden sm:block">
            Auto-optimized lineup and chip recommendations
          </p>
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
                onChange={(e) => setManagerId(e.target.value)}
                className="flex-1 h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                data-testid="input-manager-id"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleSearch} 
                  disabled={!managerId.trim()}
                  className="flex-1 sm:flex-none h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 text-sm"
                  data-testid="button-search-manager"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Search
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
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
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
                    The optimized team is based on your team from GW {currentGW}. Login to FPL Dilemmas, and connect your FPL account to get optimized team based on your latest team from GW {upcomingGW}.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Summary Card - Total Points */}
        <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-white text-sm sm:text-base md:text-lg">Next 12 Gameweeks Total Points</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            {isOptimizing || optimizedLineups.size === 0 ? (
              <div className="py-2 sm:py-4" data-testid="loader-optimizing-lineup">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white"></div>
                  <div className="text-base sm:text-xl md:text-2xl font-semibold">Optimizing...</div>
                </div>
                <div className="text-purple-100 text-xs sm:text-sm text-center px-2">
                  Finding best formations and captains
                </div>
              </div>
            ) : (
              <>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold">{total6GWPoints.toFixed(1)}</div>
                <div className="text-purple-100 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">
                  Auto Optimized Lineup
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Points by Gameweek */}
        {!isOptimizing && optimizedLineups.size > 0 && nextGameweeks.length > 0 && (
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                <span className="truncate">Points by Gameweek</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {nextGameweeks.map(gw => {
                  const gwLineup = optimizedLineups.get(gw.id);
                  let gwTotal = 0;
                  let formation = '';
                  
                  if (gwLineup?.starting11) {
                    gwLineup.starting11.forEach((pick: any) => {
                      const points = pick.projectedPoints || 0;
                      const multiplier = pick.isCaptain ? 2 : 1;
                      gwTotal += points * multiplier;
                    });
                    formation = calculateFormation(gwLineup.starting11);
                  }

                  return (
                    <Card 
                      key={gw.id} 
                      className={`cursor-pointer transition-all min-h-[90px] sm:min-h-[100px] ${
                        selectedGameweek === gw.id 
                          ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                      onClick={() => setSelectedGameweek(gw.id)}
                      data-testid={`card-gameweek-${gw.id}`}
                    >
                      <CardContent className="p-2 sm:p-3 text-center flex flex-col justify-center h-full">
                        <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1">GW{gw.id}</div>
                        <div className="text-base sm:text-lg md:text-xl font-bold text-purple-600 dark:text-purple-400 mb-0.5 sm:mb-1">{gwTotal.toFixed(1)}</div>
                        {formation && (
                          <div className="text-[9px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                            {formation}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimized Lineup Table */}
        {selectedGameweek && optimizedLineups.get(selectedGameweek) && (
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="truncate">GW{selectedGameweek} Optimized Lineup</span>
                </CardTitle>
                {(() => {
                  const gwLineup = optimizedLineups.get(selectedGameweek);
                  if (gwLineup?.starting11) {
                    const formation = calculateFormation(gwLineup.starting11);
                    return (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1">
                        {formation}
                      </Badge>
                    );
                  }
                  return null;
                })()}
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-white dark:bg-background text-[10px] sm:text-xs min-w-[120px] sm:min-w-[140px] md:min-w-[180px]">Player</TableHead>
                      <TableHead className="hidden lg:table-cell text-center text-[10px] sm:text-xs">Price</TableHead>
                      <TableHead className="text-center text-[10px] sm:text-xs">
                        GW{selectedGameweek}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const gwLineup = optimizedLineups.get(selectedGameweek)!;
                      const starting = gwLineup.starting11 || [];
                      const bench = gwLineup.bench || [];
                      const gw = nextGameweeks.find(g => g.id === selectedGameweek)!;

                      return (
                        <>
                          {starting.map(pick => renderPlayerRow(pick, gw))}
                          {bench.length > 0 && (
                            <TableRow className="bg-gray-100 dark:bg-gray-800">
                              <TableCell colSpan={3} className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 py-1.5 sm:py-2">
                                Bench
                              </TableCell>
                            </TableRow>
                          )}
                          {bench.map(pick => renderPlayerRow(pick, gw))}
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chip Recommendations */}
        {(() => {
          const recommendations = getChipRecommendations();
          if (!recommendations) return null;

          type ChipDisplay = {
            name: string;
            color: string;
            option1?: { gw: number; gain: number };
            option2?: { gw: number; gain: number };
            usedInGW?: number;
          };

          const usedChips = teamData?.chips || [];
          // FPL API my-team endpoint returns chips with: name, time, event (gameweek used)
          // A chip in the array means it has been used in that gameweek
          const getFirstHalfUsedGW = (chipName: string): number | undefined => {
            const chip = usedChips.find((c: any) => c.name === chipName && c.event && c.event <= 19);
            return chip?.event;
          };
          const getSecondHalfUsedGW = (chipName: string): number | undefined => {
            const chip = usedChips.find((c: any) => c.name === chipName && c.event && c.event >= 20);
            return chip?.event;
          };

          const chips: ChipDisplay[] = [
            {
              name: 'Bench Boost 1',
              color: 'green',
              option1: recommendations.bboost1_options[0] ? { 
                gw: recommendations.bboost1_options[0].gw, 
                gain: recommendations.bboost1_options[0].additionalPoints 
              } : undefined,
              option2: recommendations.bboost1_options[1] ? { 
                gw: recommendations.bboost1_options[1].gw, 
                gain: recommendations.bboost1_options[1].additionalPoints 
              } : undefined,
              usedInGW: getFirstHalfUsedGW('bboost'),
            },
            {
              name: 'Triple Captain 1',
              color: 'purple',
              option1: recommendations.tripleC1_options[0] ? { 
                gw: recommendations.tripleC1_options[0].gw, 
                gain: recommendations.tripleC1_options[0].additionalPoints 
              } : undefined,
              option2: recommendations.tripleC1_options[1] ? { 
                gw: recommendations.tripleC1_options[1].gw, 
                gain: recommendations.tripleC1_options[1].additionalPoints 
              } : undefined,
              usedInGW: getFirstHalfUsedGW('3xc'),
            },
            {
              name: 'Free Hit 1',
              color: 'blue',
              option1: recommendations.freehit1_options[0] ? { 
                gw: recommendations.freehit1_options[0].gw, 
                gain: recommendations.freehit1_options[0].freeHitPoints - recommendations.freehit1_options[0].normalPoints 
              } : undefined,
              option2: recommendations.freehit1_options[1] ? { 
                gw: recommendations.freehit1_options[1].gw, 
                gain: recommendations.freehit1_options[1].freeHitPoints - recommendations.freehit1_options[1].normalPoints 
              } : undefined,
              usedInGW: getFirstHalfUsedGW('freehit'),
            },
            {
              name: 'Bench Boost 2',
              color: 'green',
              option1: recommendations.bboost2_options[0] ? { 
                gw: recommendations.bboost2_options[0].gw, 
                gain: recommendations.bboost2_options[0].additionalPoints 
              } : undefined,
              option2: recommendations.bboost2_options[1] ? { 
                gw: recommendations.bboost2_options[1].gw, 
                gain: recommendations.bboost2_options[1].additionalPoints 
              } : undefined,
              usedInGW: getSecondHalfUsedGW('bboost'),
            },
            {
              name: 'Triple Captain 2',
              color: 'purple',
              option1: recommendations.tripleC2_options[0] ? { 
                gw: recommendations.tripleC2_options[0].gw, 
                gain: recommendations.tripleC2_options[0].additionalPoints 
              } : undefined,
              option2: recommendations.tripleC2_options[1] ? { 
                gw: recommendations.tripleC2_options[1].gw, 
                gain: recommendations.tripleC2_options[1].additionalPoints 
              } : undefined,
              usedInGW: getSecondHalfUsedGW('3xc'),
            },
            {
              name: 'Free Hit 2',
              color: 'blue',
              option1: recommendations.freehit2_options[0] ? { 
                gw: recommendations.freehit2_options[0].gw, 
                gain: recommendations.freehit2_options[0].freeHitPoints - recommendations.freehit2_options[0].normalPoints 
              } : undefined,
              option2: recommendations.freehit2_options[1] ? { 
                gw: recommendations.freehit2_options[1].gw, 
                gain: recommendations.freehit2_options[1].freeHitPoints - recommendations.freehit2_options[1].normalPoints 
              } : undefined,
              usedInGW: getSecondHalfUsedGW('freehit'),
            },
          ];

          return (
            <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                  <span className="truncate">Chip Recommendations</span>
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs md:text-sm">
                  Top 2 gameweeks for each chip based on projected points of the optimized team across the next 12 gameweeks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  {chips.map((chip, idx) => (
                    <div 
                      key={idx}
                      className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-md ${
                        chip.color === 'green' 
                          ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' 
                          : chip.color === 'purple'
                          ? 'bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800'
                          : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className={`text-[11px] sm:text-xs md:text-sm font-semibold mb-1.5 sm:mb-2 flex items-center gap-2 ${
                        chip.color === 'green'
                          ? 'text-green-700 dark:text-green-300'
                          : chip.color === 'purple'
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        {chip.name}
                        {chip.usedInGW && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-normal">
                            Already used in GW{chip.usedInGW}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {chip.usedInGW ? (
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 italic">
                            No recommendations available - chip already used
                          </div>
                        ) : (
                          <>
                            {chip.option1 && (
                              <div className={`flex-1 min-w-[100px] px-2 py-1 rounded text-[10px] sm:text-xs ${
                                chip.color === 'green'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : chip.color === 'purple'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              }`}>
                                <span className="font-medium">Option 1:</span> GW{chip.option1.gw} (+{chip.option1.gain.toFixed(1)} pts)
                              </div>
                            )}
                            {chip.option2 && (
                              <div className={`flex-1 min-w-[100px] px-2 py-1 rounded text-[10px] sm:text-xs ${
                                chip.color === 'green'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : chip.color === 'purple'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              }`}>
                                <span className="font-medium">Option 2:</span> GW{chip.option2.gw} (+{chip.option2.gain.toFixed(1)} pts)
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

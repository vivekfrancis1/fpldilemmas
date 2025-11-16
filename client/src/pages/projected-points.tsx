import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Search, TrendingUp, Crown, Users, AlertTriangle, Heart, XCircle, Clock, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyAvailabilityAdjustments, AFCON_PLAYERS, type BootstrapData as AvailabilityBootstrapData } from "@/lib/availability-adjustments";

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

export default function ProjectedPoints() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [plannerMode, setPlannerMode] = useState<"auto" | "manual">("manual");
  const [optimizedLineups, setOptimizedLineups] = useState<Map<number, OptimizedLineup>>(new Map());
  const [manualLineup, setManualLineup] = useState<TeamPick[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [gameweekHorizon, setGameweekHorizon] = useState<number>(6);
  
  const { toast } = useToast();

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

  // Load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId);
    }
  }, []);

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: teamData, isLoading: isLoadingTeam } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
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

  // Fetch projections based on selected horizon
  const { data: playerProjections6GW, isLoading: isLoadingProjections, refetch: refetchProjections } = useQuery<any[]>({
    queryKey: ["/api/player-total-points", gameweekRange.start, gameweekRange.end],
    queryFn: async () => {
      const response = await fetch(`/api/player-total-points?startGameweek=${gameweekRange.start}&endGameweek=${gameweekRange.end}`);
      if (!response.ok) throw new Error('Failed to fetch player projections');
      return response.json();
    },
    enabled: !!bootstrapData,
    staleTime: 10 * 60 * 1000,
  });

  // Apply availability adjustments to player projections
  const adjustedPlayerProjections = useMemo(() => {
    if (!playerProjections6GW || !bootstrapData) return playerProjections6GW;

    const currentGameweek = bootstrapData.events.find((e: any) => e.is_current)?.id || 
                           bootstrapData.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;

    return playerProjections6GW.map(player => {
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
      return applyAvailabilityAdjustments(playerWithAvailability, bootstrapData as any, currentGameweek);
    });
  }, [playerProjections6GW, bootstrapData]);

  // Initialize manual lineup when team data loads
  useEffect(() => {
    if (teamData?.picks && manualLineup.length === 0) {
      setManualLineup([...teamData.picks]);
    }
  }, [teamData]);

  // Set initial selected gameweek
  useEffect(() => {
    if (!selectedGameweek && bootstrapData) {
      const nextGWs = getNextGameweeks();
      if (nextGWs.length > 0) {
        setSelectedGameweek(nextGWs[0].id);
      }
    }
  }, [bootstrapData, selectedGameweek]);

  // Auto-optimize for all 12 gameweeks
  const optimizeAllGameweeks = async () => {
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0 || manualLineup.length === 0) {
      toast({
        title: "Cannot Optimize",
        description: "No gameweeks or lineup available",
        variant: "destructive"
      });
      return;
    }

    setIsOptimizing(true);
    const newOptimizedLineups = new Map<number, OptimizedLineup>();

    try {
      // Optimize for each gameweek
      for (const gw of nextGWs) {
        const response = await fetch("/api/transfer-planner/auto-optimize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            picks: manualLineup,
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

  // Get player by ID
  const getPlayerById = (id: number) => {
    return bootstrapData?.elements.find(p => p.id === id);
  };

  // Get team name
  const getTeamName = (player: Player) => {
    const team = bootstrapData?.teams.find(t => t.id === player.team);
    return team?.short_name || '';
  };

  // Get position name
  const getPositionName = (player: Player) => {
    const position = bootstrapData?.element_types.find(t => t.id === player.element_type);
    const positionMap: { [key: string]: string } = {
      'Goalkeeper': 'GKP',
      'Defender': 'DEF',
      'Midfielder': 'MID',
      'Forward': 'FWD'
    };
    return positionMap[position?.singular_name || ''] || position?.singular_name || '';
  };

  // Calculate formation from starting 11
  const calculateFormation = (starting11: Array<{ element: number }>): string => {
    if (!starting11 || starting11.length !== 11) return '';
    
    const positionCounts = {
      def: 0,
      mid: 0,
      fwd: 0
    };
    
    starting11.forEach(pick => {
      const player = getPlayerById(pick.element);
      if (!player) return;
      
      // element_type: 1=GKP, 2=DEF, 3=MID, 4=FWD
      if (player.element_type === 2) positionCounts.def++;
      else if (player.element_type === 3) positionCounts.mid++;
      else if (player.element_type === 4) positionCounts.fwd++;
    });
    
    return `${positionCounts.def}-${positionCounts.mid}-${positionCounts.fwd}`;
  };

  // Get player projected points
  const getPlayerProjectedPoints = (playerId: number, gameweek: number): number => {
    const playerData = adjustedPlayerProjections?.find((p: any) => p.playerId === playerId);
    const points = playerData?.gameweekProjections?.[gameweek.toString()];
    
    // Debug logging for GW16 issue
    if (gameweek === 16 && !points && playerData) {
      console.log(`GW16 Debug - Player ${playerId}:`, {
        gameweekProjections: playerData.gameweekProjections,
        availableGWs: Object.keys(playerData.gameweekProjections || {})
      });
    }
    
    return points || 0;
  };

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
    setSearchedId(managerId);
    saveManagerIdToCache(managerId);
  };

  // Trigger auto-optimization when switching to auto mode or when gameweek horizon changes
  useEffect(() => {
    if (plannerMode === "auto" && manualLineup.length > 0) {
      const nextGWs = getNextGameweeks();
      // Re-optimize if we have no lineups OR if horizon changed (current lineups don't match horizon)
      if (optimizedLineups.size === 0 || optimizedLineups.size !== nextGWs.length) {
        // Refetch projections data first to ensure we have the latest
        refetchProjections().then(() => {
          optimizeAllGameweeks();
        });
      }
    }
  }, [plannerMode, gameweekHorizon]);

  // Calculate total projected points for all 12 gameweeks
  const calculateTotal6GWProjectedPoints = (): number => {
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return 0;
    
    let total = 0;
    
    if (plannerMode === "manual") {
      const starting11 = manualLineup.filter(p => p.position <= 11);
      nextGWs.forEach(gw => {
        starting11.forEach(pick => {
          const points = getPlayerProjectedPoints(pick.element, gw.id);
          const multiplier = pick.is_captain ? 2 : 1;
          total += points * multiplier;
        });
      });
    } else {
      // For auto mode, sum up the optimized points for each gameweek
      nextGWs.forEach(gw => {
        const gwLineup = optimizedLineups.get(gw.id);
        if (gwLineup) {
          gwLineup.starting11.forEach(pick => {
            const points = getPlayerProjectedPoints(pick.element, gw.id);
            const multiplier = pick.isCaptain ? 2 : 1;
            total += points * multiplier;
          });
        }
      });
    }
    
    return total;
  };

  // Render player row for list view
  const renderPlayerRow = (pick: any, idx: number | string) => {
    const player = getPlayerById(pick.element || pick.element);
    if (!player) return null;

    const position = getPositionName(player);
    const teamName = getTeamName(player);
    const nextGWs = getNextGameweeks();
    
    // Get projected points for gameweeks
    const projections = nextGWs.map(gw => ({
      gw: gw.id,
      points: getPlayerProjectedPoints(player.id, gw.id)
    }));

    const isStarting = plannerMode === "manual" ? pick.position <= 11 : !pick.benchPosition;
    const isCaptain = plannerMode === "manual" ? pick.is_captain : pick.isCaptain;
    const isViceCaptain = plannerMode === "manual" ? pick.is_vice_captain : pick.isViceCaptain;

    // On mobile: show first 2 GWs, selected GW (if different), and total
    // On tablet: show first 4 GWs and total
    // On desktop: show all GWs
    const visibleProjectionsMobile = projections.filter((proj, i) => i < 2 || proj.gw === selectedGameweek);
    const visibleProjectionsTablet = projections.filter((proj, i) => i < 4);

    return (
      <TableRow key={idx} className={!isStarting ? "bg-gray-50 dark:bg-gray-900" : ""}>
        <TableCell className={`sticky left-0 z-10 font-medium min-w-[120px] sm:min-w-[140px] md:min-w-[180px] ${!isStarting ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-background'}`}>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">{player.web_name}</div>
              <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 flex-wrap">
                <Badge className={`text-[9px] sm:text-[10px] px-0.5 sm:px-1 py-0 h-3 sm:h-3.5 ${
                  position === 'GKP' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  position === 'DEF' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  position === 'MID' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {position}
                </Badge>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-0.5 sm:px-1 py-0 h-3 sm:h-3.5 text-gray-600 dark:text-gray-400">
                  {teamName}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isCaptain && (
                <Badge className="bg-yellow-500 text-white text-[9px] sm:text-[10px] px-0.5 sm:px-1 py-0.5 h-3.5 sm:h-4 flex items-center gap-0.5">
                  <Crown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  <span className="hidden sm:inline">C</span>
                </Badge>
              )}
              {isViceCaptain && (
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
        {/* Mobile: Show first 2 GWs + selected GW */}
        {projections.map((proj, i) => (
          <TableCell 
            key={proj.gw} 
            className={`text-center ${
              i >= 2 && proj.gw !== selectedGameweek ? 'hidden md:table-cell' : 
              i >= 4 ? 'hidden lg:table-cell' : ''
            }`}
          >
            <span className={`font-medium text-[10px] sm:text-xs ${
              proj.gw === selectedGameweek ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {proj.points.toFixed(1)}
            </span>
          </TableCell>
        ))}
        <TableCell className="text-center sticky right-0 bg-white dark:bg-background">
          <span className="font-bold text-purple-600 dark:text-purple-400 text-xs sm:text-sm">
            {projections.reduce((sum, p) => sum + p.points, 0).toFixed(1)}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  // Render player row for auto mode (shows only selected gameweek)
  const renderPlayerRowAutoMode = (pick: any, idx: number | string, gameweek: number) => {
    const player = getPlayerById(pick.element);
    if (!player) return null;

    const position = getPositionName(player);
    const teamName = getTeamName(player);
    const points = getPlayerProjectedPoints(player.id, gameweek);
    
    const isStarting = !pick.benchPosition;
    const isCaptain = pick.isCaptain;
    const isViceCaptain = pick.isViceCaptain;

    return (
      <TableRow key={idx} className={!isStarting ? "bg-gray-50" : ""}>
        <TableCell className={`sticky left-0 z-10 font-medium min-w-[140px] sm:min-w-[180px] ${!isStarting ? 'bg-gray-50' : 'bg-white'}`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{player.web_name}</div>
              <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
                <Badge className={`text-[10px] sm:text-xs px-0.5 sm:px-1 py-0 h-3.5 sm:h-4 ${
                  position === 'GKP' ? 'bg-yellow-100 text-yellow-800' :
                  position === 'DEF' ? 'bg-green-100 text-green-800' :
                  position === 'MID' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {position}
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs px-0.5 sm:px-1 py-0 h-3.5 sm:h-4 text-gray-600">
                  {teamName}
                </Badge>
                {!isStarting && (
                  <Badge variant="outline" className="hidden sm:inline-flex text-xs px-1 py-0 h-4 text-orange-600 border-orange-300">
                    Bench
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isCaptain && (
                <Badge className="bg-yellow-500 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 h-4 sm:h-5 flex items-center gap-0.5 sm:gap-1">
                  <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />C
                </Badge>
              )}
              {isViceCaptain && (
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 h-4 sm:h-5 border-yellow-500 text-yellow-600 flex items-center gap-0.5 sm:gap-1">
                  <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />V
                </Badge>
              )}
              <PlayerAvailabilityBadge player={player} />
            </div>
          </div>
        </TableCell>
        <TableCell className="text-center font-medium text-gray-900 text-xs sm:text-sm">
          £{(player.now_cost / 10).toFixed(1)}m
        </TableCell>
        <TableCell className="text-center">
          <span className="font-bold text-purple-600 text-sm sm:text-base">
            {points.toFixed(1)}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  // Calculate chip recommendations
  const getChipRecommendations = () => {
    console.log('🔍 Chip Recommendations Debug:', {
      hasPlayerProjections: !!adjustedPlayerProjections,
      projectionCount: adjustedPlayerProjections?.length,
      hasTeamData: !!teamData,
      hasChips: !!teamData?.chips,
      chipsData: teamData?.chips,
      plannerMode,
      manualLineupLength: manualLineup.length,
      optimizedLineupsSize: optimizedLineups.size
    });

    if (!adjustedPlayerProjections || !teamData) {
      console.log('⚠️ Missing basic data for chip recommendations');
      return null;
    }

    // Check if we have lineup data based on mode
    if (plannerMode === "manual" && !manualLineup.length) {
      console.log('⚠️ Manual mode but no manual lineup');
      return null;
    }
    if (plannerMode === "auto" && optimizedLineups.size === 0) {
      console.log('⚠️ Auto mode but no optimized lineups');
      return null;
    }

    const nextGWs = getNextGameweeks();
    const usedChips = teamData.chips || [];
    console.log('✅ Chip recommendations calculation starting:', { usedChipsCount: usedChips.length, nextGWCount: nextGWs.length });
    const recommendations = { 
      bboost: [] as { gw: number; additionalPoints: number }[], 
      tripleC: [] as { gw: number; additionalPoints: number }[], 
      freehit: [] as { gw: number; normalPoints: number; freeHitPoints: number }[] 
    };

    // Helper to check if chip has been used
    const isChipUsed = (chipName: string) => usedChips.some(c => c.name === chipName);

    // Best Bench Boost: Find top 2 gameweeks with maximum bench points
    if (!isChipUsed('bboost')) {
      const gwScores: { gw: number; points: number }[] = [];

      nextGWs.forEach(gw => {
        const benchPlayers = plannerMode === "manual" 
          ? manualLineup.filter(pick => pick.position > 11)
          : optimizedLineups.get(gw.id)?.bench || [];
        
        let benchPoints = 0;
        benchPlayers.forEach(pick => {
          const projection = adjustedPlayerProjections.find((p: any) => p.playerId === pick.element);
          if (projection?.gameweekProjections) {
            benchPoints += projection.gameweekProjections[gw.id.toString()] || 0;
          }
        });

        gwScores.push({ gw: gw.id, points: benchPoints });
      });

      gwScores.sort((a, b) => b.points - a.points);
      recommendations.bboost = gwScores.slice(0, 2).map(s => ({ gw: s.gw, additionalPoints: s.points }));
    }

    // Best Triple Captain: Find top 2 gameweeks where captain has highest points
    // Additional benefit = 3X - 2X = X (where X is base player points)
    if (!isChipUsed('3xc')) {
      const gwScores: { gw: number; points: number }[] = [];

      nextGWs.forEach(gw => {
        let captainBasePoints = 0;

        if (plannerMode === "manual") {
          const captainPick = manualLineup.find(p => p.is_captain);
          if (captainPick) {
            const projection = adjustedPlayerProjections.find((p: any) => p.playerId === captainPick.element);
            if (projection?.gameweekProjections) {
              // Get raw base points for the player (not captain-multiplied)
              const rawPoints = projection.gameweekProjections[gw.id.toString()] || 0;
              // Ensure we have base points: if this is already captain-adjusted (2X), divide by 2
              // The projection should be base points, but normalize just in case
              captainBasePoints = rawPoints;
            }
          }
        } else {
          const gwLineup = optimizedLineups.get(gw.id);
          if (gwLineup?.starting11) {
            // Find the captain in the starting 11
            const captain = gwLineup.starting11.find(p => p.isCaptain);
            if (captain) {
              // Get the raw projected points for the captain (base points, not multiplied)
              captainBasePoints = captain.projectedPoints || 0;
            }
          }
        }

        gwScores.push({ gw: gw.id, points: captainBasePoints });
      });

      gwScores.sort((a, b) => b.points - a.points);
      // Triple Captain gives 3X, normal captain gives 2X, so extra = X (base points)
      recommendations.tripleC = gwScores.slice(0, 2).map(s => ({ gw: s.gw, additionalPoints: s.points }));
    }

    // Best Free Hit: Find top 2 gameweeks where Free Hit improvement is maximum
    if (!isChipUsed('freehit')) {
      const gwScores: { gw: number; normalPoints: number; freeHitPoints: number; improvement: number }[] = [];

      nextGWs.forEach(gw => {
        let startingPoints = 0;

        if (plannerMode === "manual") {
          const startingPlayers = manualLineup.filter(pick => pick.position <= 11);
          startingPlayers.forEach(pick => {
            const projection = adjustedPlayerProjections.find((p: any) => p.playerId === pick.element);
            if (projection?.gameweekProjections) {
              const points = projection.gameweekProjections[gw.id.toString()] || 0;
              const multiplier = pick.is_captain ? 2 : 1;
              startingPoints += points * multiplier;
            }
          });
        } else {
          const gwLineup = optimizedLineups.get(gw.id);
          if (gwLineup?.totalProjectedPoints) {
            startingPoints = gwLineup.totalProjectedPoints;
          }
        }

        // Estimate Free Hit points as 25% improvement over normal team
        const estimatedFHPoints = Math.round(startingPoints * 1.25);
        const improvement = estimatedFHPoints - startingPoints;

        gwScores.push({ 
          gw: gw.id, 
          normalPoints: startingPoints,
          freeHitPoints: estimatedFHPoints,
          improvement: improvement
        });
      });

      // Sort by improvement (descending - highest improvement first)
      gwScores.sort((a, b) => b.improvement - a.improvement);
      recommendations.freehit = gwScores.slice(0, 2).map(s => ({ 
        gw: s.gw, 
        normalPoints: s.normalPoints,
        freeHitPoints: s.freeHitPoints
      }));
    }

    return recommendations;
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
              <CardTitle className="text-2xl">My Team Projected Points</CardTitle>
              <CardDescription>View projected points for your current FPL team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="manager-id" className="block text-sm font-medium text-gray-700 mb-2">
                  Manager ID
                </label>
                <div className="flex gap-3">
                  <Input
                    id="manager-id"
                    type="text"
                    placeholder="Enter your FPL Manager ID"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    data-testid="input-manager-id"
                  />
                  <Button
                    onClick={handleSearch}
                    className="flex items-center gap-2"
                    data-testid="button-search-manager"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-medium">To find your Manager ID:</p>
                <ol className="list-decimal list-inside space-y-1 mt-2 ml-2">
                  <li>Visit fantasy.premierleague.com and sign in</li>
                  <li>Click on the Points tab</li>
                  <li>Check the URL - your Manager ID is the number after "entry"</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingTeam || isLoadingProjections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
                <Target className="h-8 w-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isLoadingTeam ? "Loading Team Data..." : "Calculating Projections..."}
                </h3>
                <p className="text-sm text-gray-600">
                  {isLoadingTeam 
                    ? "Fetching your team lineup and player details from FPL" 
                    : `Generating ${gameweekHorizon} gameweeks of projected points for 450+ players`}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  This may take a few seconds...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load team data. Please check the Manager ID and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const nextGameweeks = getNextGameweeks();
  const total6GWPoints = calculateTotal6GWProjectedPoints();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 dark:from-gray-950 dark:to-gray-900 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
        {/* Header */}
        <div className="text-center py-2 sm:py-0">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 dark:bg-purple-900 rounded-full mb-2 sm:mb-4">
            <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2 px-2">My Team Projected Points</h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 px-2">View your current team's projected performance</p>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Manager ID</label>
                <Input
                  type="text"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  placeholder="Enter Manager ID"
                  className="text-sm sm:text-base min-h-10 sm:min-h-11"
                  data-testid="input-manager-id"
                />
              </div>
              <Button onClick={handleSearch} className="w-full sm:w-auto min-h-10 sm:min-h-11 text-sm sm:text-base" data-testid="button-search-manager">
                <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mode Toggle & Projection Horizon */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base md:text-lg">Settings</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Configure lineup mode and projection horizon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Lineup Mode</label>
              <Tabs value={plannerMode} onValueChange={(v) => setPlannerMode(v as "auto" | "manual")}>
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  <TabsTrigger value="manual" className="text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-3" data-testid="tab-manual-lineup">
                    Current Lineup
                  </TabsTrigger>
                  <TabsTrigger value="auto" className="text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-3" data-testid="tab-auto-lineup">
                    Auto Optimized
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Projection Horizon</label>
              <Select value={gameweekHorizon.toString()} onValueChange={(v) => setGameweekHorizon(parseInt(v))}>
                <SelectTrigger className="w-full text-xs sm:text-sm" data-testid="select-gameweek-horizon">
                  <SelectValue placeholder="Select gameweek horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6" data-testid="option-6gw">Next 6 Gameweeks</SelectItem>
                  <SelectItem value="8" data-testid="option-8gw">Next 8 Gameweeks</SelectItem>
                  <SelectItem value="10" data-testid="option-10gw">Next 10 Gameweeks</SelectItem>
                  <SelectItem value="12" data-testid="option-12gw">Next 12 Gameweeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card - Total Points */}
        <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-white text-sm sm:text-base md:text-lg">Next {gameweekHorizon} Gameweeks Total Points</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            {plannerMode === "auto" && (isOptimizing || optimizedLineups.size === 0) ? (
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
                  {plannerMode === "manual" ? "Current Lineup" : "Auto Optimized Lineup"}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Projected Points by Gameweek */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              <span className="truncate">Points by Gameweek</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plannerMode === "auto" && (isOptimizing || optimizedLineups.size === 0) ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="text-sm text-gray-600">Calculating gameweek projections...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {nextGameweeks.map(gw => {
                  // Calculate total for this gameweek
                  let gwTotal = 0;
                  let gwFormation = '';
                  
                  if (plannerMode === "manual") {
                    const starting11 = manualLineup.filter((p: any) => p.position <= 11);
                    starting11.forEach((pick: any) => {
                      const points = getPlayerProjectedPoints(pick.element, gw.id);
                      const multiplier = pick.is_captain ? 2 : 1;
                      gwTotal += points * multiplier;
                    });
                  } else {
                    // For auto mode, use the gameweek-specific optimized lineup
                    const gwLineup = optimizedLineups.get(gw.id);
                    if (gwLineup?.starting11) {
                      gwLineup.starting11.forEach(pick => {
                        const points = getPlayerProjectedPoints(pick.element, gw.id);
                        const multiplier = pick.isCaptain ? 2 : 1;
                        gwTotal += points * multiplier;
                      });
                      gwFormation = calculateFormation(gwLineup.starting11);
                    }
                  }

                  return (
                    <Card 
                      key={gw.id} 
                      className={`cursor-pointer transition-all min-h-[70px] sm:min-h-[80px] ${
                        selectedGameweek === gw.id 
                          ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                      onClick={() => setSelectedGameweek(gw.id)}
                      data-testid={`card-gameweek-${gw.id}`}
                    >
                      <CardContent className="p-2 sm:p-3 text-center flex flex-col justify-center h-full">
                        <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1">GW{gw.id}</div>
                        <div className="text-base sm:text-lg md:text-xl font-bold text-purple-600 dark:text-purple-400">{gwTotal.toFixed(1)}</div>
                        {plannerMode === "auto" && gwFormation && (
                          <div className="text-[9px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-500 mt-0.5 sm:mt-1">{gwFormation}</div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Team */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                <span className="truncate">
                  {plannerMode === "manual" ? "Current Team" : `GW${selectedGameweek} Optimized`}
                </span>
              </CardTitle>
              {(() => {
                let formation = '';
                if (plannerMode === "manual" && manualLineup.length > 0) {
                  const starting11 = manualLineup.filter(p => p.position <= 11);
                  formation = calculateFormation(starting11);
                } else if (plannerMode === "auto" && selectedGameweek) {
                  const gwLineup = optimizedLineups.get(selectedGameweek);
                  if (gwLineup?.starting11) {
                    formation = calculateFormation(gwLineup.starting11);
                  }
                }
                return formation ? (
                  <Badge variant="outline" className="text-xs sm:text-sm font-semibold px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                    {formation}
                  </Badge>
                ) : null;
              })()}
            </div>
            {plannerMode === "auto" && isOptimizing && (
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Optimizing lineups...</div>
            )}
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="overflow-x-auto -mx-2 sm:-mx-6 px-2 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-white dark:bg-background text-[10px] sm:text-xs min-w-[120px] sm:min-w-[140px] md:min-w-[180px]">Player</TableHead>
                    <TableHead className="hidden lg:table-cell text-center text-[10px] sm:text-xs">Price</TableHead>
                    {plannerMode === "manual" ? (
                      <>
                        {nextGameweeks.map((gw, i) => (
                          <TableHead 
                            key={gw.id} 
                            className={`text-center text-[10px] sm:text-xs ${
                              i >= 2 && gw.id !== selectedGameweek ? 'hidden md:table-cell' : 
                              i >= 4 ? 'hidden lg:table-cell' : ''
                            }`}
                          >
                            GW{gw.id}
                          </TableHead>
                        ))}
                        <TableHead className="text-center text-[10px] sm:text-xs sticky right-0 bg-white dark:bg-background">Total</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-center text-[10px] sm:text-xs">GW{selectedGameweek}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plannerMode === "manual" 
                    ? (() => {
                        const sortedLineup = [...manualLineup].sort((a, b) => a.position - b.position);
                        const starting11 = sortedLineup.filter(p => p.position <= 11);
                        const bench = sortedLineup.filter(p => p.position > 11);
                        
                        // Sort bench: goalkeeper first, then others
                        const benchSorted = bench.sort((a, b) => {
                          const playerA = getPlayerById(a.element);
                          const playerB = getPlayerById(b.element);
                          const posA = playerA?.element_type || 0;
                          const posB = playerB?.element_type || 0;
                          
                          // element_type 1 = GKP, prioritize it
                          if (posA === 1 && posB !== 1) return -1;
                          if (posA !== 1 && posB === 1) return 1;
                          return a.position - b.position;
                        });
                        
                        return (
                          <>
                            {starting11.map((pick, idx) => renderPlayerRow(pick, idx))}
                            <TableRow>
                              <TableCell colSpan={nextGameweeks.length + 3} className="bg-gray-100 text-center font-semibold text-gray-700 py-3">
                                BENCH
                              </TableCell>
                            </TableRow>
                            {benchSorted.map((pick, idx) => renderPlayerRow(pick, `bench-${idx}`))}
                          </>
                        );
                      })()
                    : selectedGameweek && optimizedLineups.get(selectedGameweek)
                      ? (() => {
                          const gwLineup = optimizedLineups.get(selectedGameweek)!;
                          const starting = gwLineup.starting11 || [];
                          const bench = gwLineup.bench || [];
                          
                          // Sort bench: goalkeeper first, then others
                          const benchSorted = [...bench].sort((a, b) => {
                            const playerA = getPlayerById(a.element);
                            const playerB = getPlayerById(b.element);
                            const posA = playerA?.element_type || 0;
                            const posB = playerB?.element_type || 0;
                            
                            if (posA === 1 && posB !== 1) return -1;
                            if (posA !== 1 && posB === 1) return 1;
                            return (a.benchPosition || 0) - (b.benchPosition || 0);
                          });
                          
                          return (
                            <>
                              {starting.map((pick, idx) => renderPlayerRowAutoMode(pick, idx, selectedGameweek))}
                              <TableRow>
                                <TableCell colSpan={3} className="bg-gray-100 text-center font-semibold text-gray-700 py-3">
                                  BENCH
                                </TableCell>
                              </TableRow>
                              {benchSorted.map((pick, idx) => renderPlayerRowAutoMode(pick, `bench-${idx}`, selectedGameweek))}
                            </>
                          );
                        })()
                      : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              <div className="flex items-center justify-center gap-3">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                <span className="text-sm text-gray-600">Loading optimized lineup...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Chip Recommendations */}
        {(() => {
          const recommendations = getChipRecommendations();
          const hasRecommendations = recommendations && (recommendations.bboost.length > 0 || recommendations.tripleC.length > 0 || recommendations.freehit.length > 0);
          
          return hasRecommendations ? (
            <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                  <span className="truncate">Chip Recommendations</span>
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs md:text-sm">
                  Based on next {gameweekHorizon} gameweek projections
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plannerMode === "manual" && (
                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-200">
                      <strong>Tip:</strong> Auto mode recommendations are more accurate as they use optimized lineups with best captains.
                    </p>
                  </div>
                )}
                <div className="space-y-2 sm:space-y-3">
                  {recommendations.bboost.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-green-700 dark:text-green-300 sm:min-w-[100px] sm:pt-1">
                        Bench Boost:
                      </span>
                      <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                        {recommendations.bboost.map((rec, index) => (
                          <div key={rec.gw} className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-green-700 dark:text-green-300">
                              Option {index + 1}: GW{rec.gw} (+{rec.additionalPoints.toFixed(1)} pts)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recommendations.tripleC.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-purple-700 dark:text-purple-300 sm:min-w-[100px] sm:pt-1">
                        Triple Captain:
                      </span>
                      <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                        {recommendations.tripleC.map((rec, index) => (
                          <div key={rec.gw} className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300">
                              Option {index + 1}: GW{rec.gw} (+{rec.additionalPoints.toFixed(1)} pts)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recommendations.freehit.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-300 sm:min-w-[100px] sm:pt-1">
                        Free Hit:
                      </span>
                      <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                        {recommendations.freehit.map((rec, index) => (
                          <div key={rec.gw} className="inline-flex flex-col gap-0.5 px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300">
                              Option {index + 1}: GW{rec.gw}
                            </span>
                            <span className="text-[9px] sm:text-[10px] md:text-xs text-blue-600 dark:text-blue-400">
                              Normal: {rec.normalPoints.toFixed(1)} | FH: ~{rec.freeHitPoints.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}

      </div>
    </div>
  );
}

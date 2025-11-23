import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Search, TrendingUp, Crown, Users, AlertTriangle, Heart, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyAvailabilityAdjustments, AFCON_PLAYERS, type BootstrapData as AvailabilityBootstrapData } from "@/lib/availability-adjustments";
import { extractManagerId } from "@/lib/manager-id-utils";
import { FplConnectDialog } from "@/components/fpl-connect-dialog";

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
  const [manualLineup, setManualLineup] = useState<TeamPick[]>([]);
  const [startGameweek, setStartGameweek] = useState<number | null>(null);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
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

  const { data: teamData, isLoading: isLoadingTeam } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch fixtures data
  const { data: fixturesData } = useQuery<any[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 10 * 60 * 1000,
  });

  // Initialize start and end gameweeks with defaults (next 6 gameweeks)
  useEffect(() => {
    if (!bootstrapData || startGameweek !== null) return;
    
    const nextEvent = bootstrapData.events.find(e => !e.finished && !e.is_current);
    let firstGW = nextEvent?.id || 1;
    
    if (!nextEvent) {
      const currentEvent = bootstrapData.events.find(e => e.is_current);
      if (currentEvent) {
        firstGW = currentEvent.id + 1;
      } else {
        const lastFinished = bootstrapData.events.filter(e => e.finished).sort((a, b) => b.id - a.id)[0];
        if (lastFinished) {
          firstGW = lastFinished.id + 1;
        }
      }
    }
    
    // Default to next 6 gameweeks
    setStartGameweek(firstGW);
    setEndGameweek(Math.min(firstGW + 5, 38));
  }, [bootstrapData, startGameweek]);
  
  // Get available gameweek options (next 12 gameweeks)
  const getAvailableGameweeks = (): number[] => {
    if (!bootstrapData) return [];
    
    const nextEvent = bootstrapData.events.find(e => !e.finished && !e.is_current);
    let firstGW = nextEvent?.id || 1;
    
    if (!nextEvent) {
      const currentEvent = bootstrapData.events.find(e => e.is_current);
      if (currentEvent) {
        firstGW = currentEvent.id + 1;
      } else {
        const lastFinished = bootstrapData.events.filter(e => e.finished).sort((a, b) => b.id - a.id)[0];
        if (lastFinished) {
          firstGW = lastFinished.id + 1;
        }
      }
    }
    
    const gameweeks = [];
    for (let i = 0; i < 12 && (firstGW + i) <= 38; i++) {
      gameweeks.push(firstGW + i);
    }
    return gameweeks;
  };

  // Fetch projections using cached endpoint for faster loading
  const { data: allPlayerProjections, isLoading: isLoadingProjections, refetch: refetchProjections } = useQuery<any[]>({
    queryKey: ["/api/cached/player-total-points"],
    enabled: !!bootstrapData,
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });

  // Filter projections to only the 15 players in the team for performance
  const playerProjections6GW = useMemo(() => {
    if (!allPlayerProjections || !teamData?.picks) return allPlayerProjections;
    
    // Get player IDs from team
    const teamPlayerIds = new Set(teamData.picks.map(pick => pick.element));
    
    // Filter to only team players
    return allPlayerProjections.filter(player => teamPlayerIds.has(player.playerId));
  }, [allPlayerProjections, teamData]);

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

  // Get gameweeks between start and end (inclusive)
  const getNextGameweeks = () => {
    if (!bootstrapData || startGameweek === null || endGameweek === null) return [];
    
    const nextGameweeks = [];
    for (let gwNumber = startGameweek; gwNumber <= endGameweek && gwNumber <= 38; gwNumber++) {
      const gw = bootstrapData.events.find(e => e.id === gwNumber);
      if (gw) {
        nextGameweeks.push(gw);
      }
    }
    
    return nextGameweeks;
  };

  // Get player by ID
  const getPlayerById = (id: number) => {
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
      };
    }
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

  // Get fixture information for a team in a specific gameweek
  const getFixtureInfo = (teamId: number, gameweek: number): { opponent: string; isHome: boolean } | null => {
    if (!fixturesData || !bootstrapData?.teams) return null;
    
    const fixture = fixturesData.find((f: any) => 
      f.event === gameweek && (f.team_h === teamId || f.team_a === teamId)
    );
    
    if (!fixture) return null;
    
    const isHome = fixture.team_h === teamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponent = bootstrapData.teams.find((t: any) => t.id === opponentId);
    
    return {
      opponent: opponent?.short_name || '',
      isHome
    };
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

  // Calculate total projected points for current lineup
  const calculateTotal6GWProjectedPoints = (): number => {
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return 0;
    
    let total = 0;
    const starting11 = manualLineup.filter(p => p.position <= 11);
    
    nextGWs.forEach(gw => {
      starting11.forEach(pick => {
        const points = getPlayerProjectedPoints(pick.element, gw.id);
        const multiplier = pick.is_captain ? 2 : 1;
        total += points * multiplier;
      });
    });
    
    return total;
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Get total projected points for a player
  const getPlayerTotalPoints = (pick: any): number => {
    const nextGWs = getNextGameweeks();
    let total = 0;
    nextGWs.forEach(gw => {
      total += getPlayerProjectedPoints(pick.element, gw.id);
    });
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

    const isCaptain = pick.is_captain;
    const isViceCaptain = pick.is_vice_captain;

    // On mobile: show first 2 GWs, selected GW (if different), and total
    // On tablet: show first 4 GWs and total
    // On desktop: show all GWs
    const visibleProjectionsMobile = projections.filter((proj, i) => i < 2 || proj.gw === selectedGameweek);
    const visibleProjectionsTablet = projections.filter((proj, i) => i < 4);

    return (
      <TableRow key={idx}>
        <TableCell className="sticky left-0 z-10 font-medium min-w-[140px] sm:min-w-[160px] md:min-w-[200px] bg-white dark:bg-background py-3 sm:py-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">{player.web_name}</div>
              <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                <Badge className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 h-4 sm:h-5 ${
                  position === 'GKP' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  position === 'DEF' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  position === 'MID' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {position}
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 h-4 sm:h-5 text-gray-600 dark:text-gray-400">
                  {teamName}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isCaptain && (
                <Badge className="bg-yellow-500 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 h-5 sm:h-6 flex items-center gap-0.5">
                  <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="hidden sm:inline">C</span>
                </Badge>
              )}
              {isViceCaptain && (
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 h-5 sm:h-6 border-yellow-500 text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
                  <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="hidden sm:inline">V</span>
                </Badge>
              )}
              <div className="hidden sm:block">
                <PlayerAvailabilityBadge player={player} />
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-center font-medium text-gray-900 dark:text-gray-100 text-sm py-3 sm:py-4">
          £{(player.now_cost / 10).toFixed(1)}m
        </TableCell>
        {/* Mobile: Show first 2 GWs + selected GW */}
        {projections.map((proj, i) => (
          <TableCell 
            key={proj.gw} 
            className={`text-center py-3 sm:py-4 ${
              i >= 2 && proj.gw !== selectedGameweek ? 'hidden md:table-cell' : 
              i >= 4 ? 'hidden lg:table-cell' : ''
            }`}
          >
            <span className={`font-semibold text-xs sm:text-sm md:text-base ${
              proj.gw === selectedGameweek ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {proj.points.toFixed(1)}
            </span>
          </TableCell>
        ))}
        <TableCell className="text-center sticky right-0 bg-white dark:bg-background py-3 sm:py-4">
          <span className="font-bold text-purple-600 dark:text-purple-400 text-sm sm:text-base md:text-lg">
            {projections.reduce((sum, p) => sum + p.points, 0).toFixed(1)}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  if (!searchedId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Team Projected Points</h1>
            <p className="text-lg text-gray-600">View projected points for your current FPL team</p>
          </div>

          {/* Manager Search Section */}
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="max-w-2xl mx-auto">
                <label htmlFor="manager-id" className="block text-sm font-medium text-gray-700 mb-2">
                  Manager ID
                </label>
                <div className="flex flex-col gap-3">
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
                    className="w-full border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                    data-testid="input-manager-id"
                    disabled={isLoadingTeam}
                  />
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                    <Button
                      onClick={handleSearch}
                      disabled={!managerId.trim() || isLoadingTeam}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                      data-testid="button-search-manager"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {isLoadingTeam ? "Loading..." : "Search Manager"}
                    </Button>
                  </div>
                </div>
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
                    : "Calculating projected points for your team"}
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
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">Manager ID</label>
                  <Input
                    type="text"
                    value={managerId}
                    onChange={(e) => {
                      const extractedId = extractManagerId(e.target.value);
                      setManagerId(extractedId);
                    }}
                    placeholder="Paste URL or Manager ID"
                    className="text-sm sm:text-base min-h-10 sm:min-h-11"
                    data-testid="input-manager-id"
                    disabled={isLoadingTeam}
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  className="w-full sm:w-auto min-h-10 sm:min-h-11 text-sm sm:text-base" 
                  data-testid="button-search-manager"
                  disabled={!managerId.trim() || isLoadingTeam}
                >
                  <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {isLoadingTeam ? "Loading..." : "Search"}
                </Button>
                <FplConnectDialog />
              </div>
              
              {searchedId && (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end border-t pt-4">
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Start Gameweek
                    </label>
                    <Select 
                      value={startGameweek?.toString() || ""} 
                      onValueChange={(value) => {
                        const newStart = parseInt(value);
                        setStartGameweek(newStart);
                        // Ensure end is not before start - update immediately
                        if (endGameweek !== null && endGameweek < newStart) {
                          setEndGameweek(newStart);
                        } else if (endGameweek === null) {
                          // If end not set, set it to start
                          setEndGameweek(newStart);
                        }
                      }}
                    >
                      <SelectTrigger className="text-sm sm:text-base min-h-10 sm:min-h-11" data-testid="select-start-gameweek">
                        <SelectValue placeholder="Select start GW" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableGameweeks().map(gw => (
                          <SelectItem 
                            key={gw} 
                            value={gw.toString()}
                            disabled={endGameweek !== null && gw > endGameweek}
                          >
                            GW {gw}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      End Gameweek
                    </label>
                    <Select 
                      value={endGameweek?.toString() || ""} 
                      onValueChange={(value) => {
                        const newEnd = parseInt(value);
                        setEndGameweek(newEnd);
                        // Ensure start is not after end - update immediately
                        if (startGameweek !== null && startGameweek > newEnd) {
                          setStartGameweek(newEnd);
                        } else if (startGameweek === null) {
                          // If start not set, set it to end
                          setStartGameweek(newEnd);
                        }
                      }}
                    >
                      <SelectTrigger className="text-sm sm:text-base min-h-10 sm:min-h-11" data-testid="select-end-gameweek">
                        <SelectValue placeholder="Select end GW" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableGameweeks().map(gw => (
                          <SelectItem 
                            key={gw} 
                            value={gw.toString()}
                            disabled={startGameweek !== null && gw < startGameweek}
                          >
                            GW {gw}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const available = getAvailableGameweeks();
                        if (available.length > 0) {
                          setStartGameweek(available[0]);
                          setEndGameweek(Math.min(available[0] + 5, available[available.length - 1]));
                        }
                      }}
                      className="min-h-10 sm:min-h-11 text-xs sm:text-sm"
                      data-testid="button-reset-6gw"
                    >
                      Reset to 6 GW
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Team */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg md:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              <span>Current Team</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="overflow-x-auto -mx-2 sm:-mx-6 px-2 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="sticky left-0 z-10 bg-white dark:bg-background text-xs sm:text-sm md:text-base font-semibold min-w-[140px] sm:min-w-[160px] md:min-w-[200px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 py-3 sm:py-4"
                      onClick={() => handleSort("player")}
                    >
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        Player
                        {sortColumn === "player" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-40" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="hidden lg:table-cell text-center text-xs sm:text-sm md:text-base font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 py-3 sm:py-4"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                        Price
                        {sortColumn === "price" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-40" />
                        )}
                      </div>
                    </TableHead>
                    {nextGameweeks.map((gw, i) => (
                      <TableHead 
                        key={gw.id} 
                        className={`text-center text-xs sm:text-sm md:text-base font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 py-3 sm:py-4 ${
                          i >= 2 && gw.id !== selectedGameweek ? 'hidden md:table-cell' : 
                          i >= 4 ? 'hidden lg:table-cell' : ''
                        }`}
                        onClick={() => handleSort(`gw${gw.id}`)}
                      >
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                          GW{gw.id}
                          {sortColumn === `gw${gw.id}` ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-40" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead 
                      className="text-center text-xs sm:text-sm md:text-base font-semibold sticky right-0 bg-white dark:bg-background cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 py-3 sm:py-4"
                      onClick={() => handleSort("total")}
                    >
                      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                        Total
                        {sortColumn === "total" ? (
                          sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-40" />
                        )}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Sort all 15 players based on selected column
                    const sortedLineup = [...manualLineup].sort((a, b) => {
                      let aValue: any;
                      let bValue: any;

                      if (sortColumn === "player") {
                        const playerA = getPlayerById(a.element);
                        const playerB = getPlayerById(b.element);
                        aValue = playerA?.web_name || "";
                        bValue = playerB?.web_name || "";
                        return sortDirection === "asc" 
                          ? aValue.localeCompare(bValue)
                          : bValue.localeCompare(aValue);
                      } else if (sortColumn === "price") {
                        const playerA = getPlayerById(a.element);
                        const playerB = getPlayerById(b.element);
                        aValue = playerA?.now_cost || 0;
                        bValue = playerB?.now_cost || 0;
                      } else if (sortColumn === "total") {
                        aValue = getPlayerTotalPoints(a);
                        bValue = getPlayerTotalPoints(b);
                      } else if (sortColumn.startsWith("gw")) {
                        const gwNumber = parseInt(sortColumn.replace("gw", ""));
                        aValue = getPlayerProjectedPoints(a.element, gwNumber);
                        bValue = getPlayerProjectedPoints(b.element, gwNumber);
                      }

                      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
                    });
                    
                    return sortedLineup.map((pick, idx) => renderPlayerRow(pick, idx));
                  })()}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

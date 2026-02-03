import { useState, useMemo, useEffect } from "react";

import { computeCurrentGameweek, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { BootstrapData } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBatchAssistsProjections } from "@/hooks/use-batch-projections";
import { Zap, TrendingUp, Users, Calendar, Target, Search, Filter, ArrowUpDown, RefreshCw, Loader2, X, ChevronDown, ChevronUp, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

interface PlayerAssistProjection {
  playerId: number;
  playerName: string;
  teamShort?: string;
  position?: string;
  gameweekProjections: { [gameweek: string]: number };
  totalProjectedAssists: number;
  assistShare: number;
}

interface PlayerAssistsHistory {
  lastFinishedGW: number;
  players: {
    playerId: number;
    playerName: string;
    teamName: string;
    teamShort: string;
    position: string;
    gameweekAssists: { [key: number]: number };
    totalAssists: number;
  }[];
}

interface PlayerXaHistory {
  lastFinishedGW: number;
  startGW: number;
  endGW: number;
  players: {
    id: number;
    name: string;
    teamName: string;
    teamShort: string;
    position: string;
    gameweekXa: { [key: number]: number };
    totalXa: number;
  }[];
}

type SortField = 'name' | 'team' | 'position' | 'totalAssists' | 'rangeTotal' | 'rangePoints' | 'assistShare' | string; // string allows dynamic gameweek fields like 'gw4', 'gw5', etc.
type SortDirection = 'asc' | 'desc';

export default function PlayerAssistProjections() {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  
  const queryClient = useQueryClient();
  
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch fixtures for opponent information
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // View mode: "future" for projections, "past" for historical data, "pastXa" for xA history
  const [viewMode, setViewMode] = useState<"future" | "past" | "pastXa">("future");

  // Fetch past player assists history
  const { data: historyData, isLoading: historyLoading } = useQuery<PlayerAssistsHistory>({
    queryKey: ["/api/player-assists-history"],
    enabled: viewMode === "past",
  });

  // All useState hooks (must come before xA query that depends on startGameweek/endGameweek)
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [sortField, setSortField] = useState<SortField>('rangeTotal');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch past player xA (expected assists) history (after startGameweek/endGameweek are defined)
  const { data: xaHistoryData, isLoading: xaHistoryLoading } = useQuery<PlayerXaHistory>({
    queryKey: ["/api/player-xa-history", startGameweek, endGameweek],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startGameweek) params.set('startGw', startGameweek.toString());
      if (endGameweek) params.set('endGw', endGameweek.toString());
      const response = await fetch(`/api/player-xa-history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch xA history");
      return response.json();
    },
    enabled: viewMode === "pastXa" && startGameweek > 0 && endGameweek > 0,
  });

  // Toggle gameweek exclusion
  const toggleGameweekExclusion = (gw: number) => {
    setExcludedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  // Clear all exclusions
  const clearExclusions = () => {
    setExcludedGameweeks(new Set());
  };

  // Toggle position selection
  const togglePositionSelection = (position: string) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(position)) newSet.delete(position);
      else newSet.add(position);
      return newSet;
    });
  };

  // Toggle team selection
  const toggleTeamSelection = (team: string) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(team)) newSet.delete(team);
      else newSet.add(team);
      return newSet;
    });
  };

  // Get available gameweeks for dropdown based on view mode
  const availableGameweeks = useMemo(() => {
    if (viewMode === "past" || viewMode === "pastXa") {
      // Past modes: GW1 to last finished gameweek
      const lastFinished = historyData?.lastFinishedGW || xaHistoryData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    // Future mode: next 12 gameweeks
    if (!bootstrapData?.events) {
      return [];
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12); // Show 12 gameweeks in dropdown
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, xaHistoryData?.lastFinishedGW]);

  // Initialize gameweeks when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, 6); // Default to 6 gameweeks
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 38) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
    }
  }, [bootstrapData, initialized]);

  // Reset gameweek range when viewMode changes
  useEffect(() => {
    if ((viewMode === "past" || viewMode === "pastXa") && (historyData?.lastFinishedGW || xaHistoryData?.lastFinishedGW)) {
      const lastFinished = historyData?.lastFinishedGW || xaHistoryData?.lastFinishedGW || 24;
      const startGW = Math.max(1, lastFinished - 5);
      setStartGameweek(startGW);
      setEndGameweek(lastFinished);
      setExcludedGameweeks(new Set());
    } else if (viewMode === "future" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, 6);
      setStartGameweek(parseInt(newRange.startGameweek));
      setEndGameweek(parseInt(newRange.endGameweek));
      setExcludedGameweeks(new Set());
    }
  }, [viewMode, historyData?.lastFinishedGW, xaHistoryData?.lastFinishedGW, bootstrapData?.events]);

  // BATCH OPTIMIZED: Use new batch hook for better performance
  const { 
    data: playerAssistData, 
    isLoading: projectionsLoading, 
    error, 
    usedBatch 
  } = useBatchAssistsProjections(
    initialized ? startGameweek : undefined,
    initialized ? endGameweek : undefined,
    {
      enabled: viewMode === "future",
      staleTime: 5 * 60 * 1000, // 5 minutes
      batchSize: 150, // Process 150 players per batch
      maxConcurrency: 3, // Max 3 concurrent requests
    }
  );

  // Transform history data to match projection format for unified display
  const displayData = useMemo(() => {
    if (viewMode === "past" && historyData?.players) {
      return historyData.players.map(player => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamShort: player.teamShort,
        position: player.position,
        gameweekProjections: Object.fromEntries(
          Object.entries(player.gameweekAssists).map(([gw, assists]) => [gw, assists])
        ),
        totalProjectedAssists: player.totalAssists,
        assistShare: 0, // Not available in history data
      }));
    }
    if (viewMode === "pastXa" && xaHistoryData?.players) {
      return xaHistoryData.players.map(player => ({
        playerId: player.id,
        playerName: player.name,
        teamShort: player.teamShort,
        position: player.position,
        gameweekProjections: Object.fromEntries(
          Object.entries(player.gameweekXa).map(([gw, xa]) => [gw, xa])
        ),
        totalProjectedAssists: player.totalXa,
        assistShare: 0, // Not available in history data
      }));
    }
    return playerAssistData || [];
  }, [viewMode, historyData, xaHistoryData, playerAssistData]);

  // Combined loading state
  const isLoading = (viewMode === "future" && projectionsLoading) || (viewMode === "past" && historyLoading) || (viewMode === "pastXa" && xaHistoryLoading);

  // ALL useMemo hooks
  // Create a mapping of teamShort + gameweek -> opponent info
  const opponentMap = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Map();
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        map.set(`${homeTeam.short_name}-${fixture.event}`, {
          opponent: awayTeam.short_name,
          opponentId: fixture.team_a,
          isHome: true
        });
        map.set(`${awayTeam.short_name}-${fixture.event}`, {
          opponent: homeTeam.short_name,
          opponentId: fixture.team_h,
          isHome: false
        });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  // Create availability map for player availability badges
  const playerAvailabilityMap = usePlayerAvailabilityMap(bootstrapData);

  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!displayData.length) return [];
    const uniqueTeams = Array.from(new Set(displayData.map(p => p.teamShort).filter((t): t is string => !!t)));
    return uniqueTeams.sort();
  }, [displayData]);

  const positions = useMemo(() => {
    if (!displayData.length) return [];
    const uniquePositions = Array.from(new Set(displayData.map(p => p.position)));
    return uniquePositions.sort();
  }, [displayData]);

  // Create teamNameToShort mapping from bootstrapData
  const teamNameToShort = useMemo(() => {
    if (!bootstrapData?.teams) return null;
    const map = new Map<string, string>();
    bootstrapData.teams.forEach((team: any) => {
      map.set(team.short_name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

  // Generate dynamic gameweek columns based on selected range (filtered by exclusions)
  const dynamicGameweekColumns = useMemo(() => {
    // Safe to use startGameweek and endGameweek (never null)
    const columns = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      if (!excludedGameweeks.has(gw)) {
        columns.push(gw);
      }
    }
    return columns;
  }, [startGameweek, endGameweek, excludedGameweeks]);

  // Calculate dynamic range label
  const rangeLabel = useMemo(() => {
    // Safe to use startGameweek and endGameweek (never null)
    const gwCount = endGameweek - startGameweek + 1;
    return `${gwCount}GW Total`;
  }, [startGameweek, endGameweek]);

  const handleRefreshData = async () => {
    console.log('🔄 Refresh button clicked!');
    setIsRefreshing(true);
    console.log('🔄 isRefreshing set to true');
    try {
      // Add a minimum delay to make spinner visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate all assist-related queries
      console.log('🔄 Invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ["/api/cached/player-assists-projections"] });
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/player-assist-projections") || key?.includes("/api/cached/player-assists-projections");
        }
      });
      // Force refetch
      console.log('🔄 Refetching data...');
      await queryClient.refetchQueries({ queryKey: ["/api/cached/player-assists-projections"] });
      console.log('🔄 Refresh completed!');
    } finally {
      setIsRefreshing(false);
      console.log('🔄 isRefreshing set to false');
    }
  };

  // Helper to normalize position strings for filtering
  const normalizePosition = (pos: string): string => {
    if (!pos) return '';
    const upper = pos.toUpperCase();
    if (upper === 'DEF' || upper.startsWith('DEFEND')) return 'Defender';
    if (upper === 'MID' || upper.startsWith('MIDFIEL')) return 'Midfielder';
    if (upper === 'FWD' || upper.startsWith('FORWARD')) return 'Forward';
    if (upper === 'GKP' || upper.startsWith('GOALK')) return 'Goalkeeper';
    return pos;
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!displayData.length) return [];
    
    let filtered = displayData.filter(player => {
      // Search filter
      if (searchTerm) {
        const matchesSearch = player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (player.teamShort?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        if (!matchesSearch) return false;
      }
      
      // Position filter - normalize both sides for comparison
      if (selectedPositions.size > 0) {
        const normalizedPos = normalizePosition(player.position || '');
        const matches = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
        if (!matches) return false;
      }
      if (selectedTeams.size > 0 && !selectedTeams.has(player.teamShort || '')) return false;
      return true;
    });

    // Calculate dynamic totals based on selected gameweek range (with availability adjustment)
    const getFilteredTotalForSort = (player: PlayerAssistProjection) => {
      const playerInfo = playerAvailabilityMap?.get(player.playerId);
      const gwMultipliers = applyAvailability 
        ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
        : {};
      let total = 0;
      dynamicGameweekColumns.forEach(gw => {
        const val = player.gameweekProjections[gw.toString()] || 0;
        const mult = gwMultipliers[gw] ?? 1;
        total += val * mult;
      });
      return total;
    };

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case 'team':
          aValue = a.teamShort || '';
          bValue = b.teamShort || '';
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        case 'totalAssists':
          aValue = a.totalProjectedAssists;
          bValue = b.totalProjectedAssists;
          break;
        case 'rangeTotal':
          aValue = getFilteredTotalForSort(a);
          bValue = getFilteredTotalForSort(b);
          break;
        case 'rangePoints':
          aValue = getFilteredTotalForSort(a) * 3;
          bValue = getFilteredTotalForSort(b) * 3;
          break;
        case 'assistShare':
          aValue = a.assistShare;
          bValue = b.assistShare;
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw4', 'gw5', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = parseInt(sortField.replace('gw', ''));
            if (!isNaN(gwNumber)) {
              const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
              const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
              const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
              const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
              aValue = (a.gameweekProjections[gwNumber.toString()] || 0) * (aMultipliers[gwNumber] ?? 1);
              bValue = (b.gameweekProjections[gwNumber.toString()] || 0) * (bMultipliers[gwNumber] ?? 1);
            } else {
              aValue = a.totalProjectedAssists;
              bValue = b.totalProjectedAssists;
            }
          } else {
            aValue = a.totalProjectedAssists;
            bValue = b.totalProjectedAssists;
          }
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [displayData, searchTerm, selectedPositions, selectedTeams, startGameweek, endGameweek, sortField, sortDirection, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData, dynamicGameweekColumns, viewMode]);

  // Calculate dynamic totals based on selected gameweek range (excluding excluded gameweeks)
  const getFilteredTotal = (player: PlayerAssistProjection, useAvailability: boolean = false) => {
    let total = 0;
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const availabilityFactor = useAvailability && playerInfo 
      ? (playerInfo.chanceOfPlayingNextRound ?? 100) / 100 
      : 1;
    for (const gw of dynamicGameweekColumns) {
      total += (player.gameweekProjections[gw.toString()] || 0) * availabilityFactor;
    }
    return total;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUpDown className="h-4 w-4 text-green-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-green-600" />;
  };

  // ALL CONDITIONAL LOGIC AND EARLY RETURNS MUST COME AFTER ALL HOOKS

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Zap className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load assist projections</h3>
                  <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || !initialized || displayData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              {viewMode === "future" ? "Loading Assist Projections" : "Loading Assist History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              {viewMode === "future" 
                ? "Calculating projected assists for all players across the next 12 gameweeks..."
                : "Loading historical assist data for all players..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Zap className="h-8 w-8" />
            <h1>{viewMode === "future" ? "Player Assist Projections" : viewMode === "pastXa" ? "Player xA History" : "Player Assist History"}</h1>
          </div>
          <p className="fpl-page-subtitle">
            {viewMode === "future" 
              ? "Projected assists for each player across upcoming gameweeks"
              : viewMode === "pastXa"
                ? "Expected Assists (xA) for each player in past gameweeks"
                : "Actual assists recorded by each player in past gameweeks"}
          </p>
          {/* Past/Future Toggle */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={viewMode === "past" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("past")}
              className={`flex items-center gap-1.5 ${viewMode === "past" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
            >
              <History className="h-4 w-4" />
              Past GW Assist Data
            </Button>
            <Button
              variant={viewMode === "pastXa" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("pastXa")}
              className={`flex items-center gap-1.5 ${viewMode === "pastXa" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
            >
              <TrendingUp className="h-4 w-4" />
              Past GW xA
            </Button>
            <Button
              variant={viewMode === "future" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("future")}
              className={`flex items-center gap-1.5 ${viewMode === "future" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
            >
              <Calendar className="h-4 w-4" />
              Future GW Projections
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-base sm:text-lg">Filters & Controls</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 md:hidden">
                      {isFiltersOpen ? 'Tap to collapse' : 'Tap to expand'}
                    </span>
                    {isFiltersOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">From GW</label>
                <Select value={String(startGameweek)} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">To GW</label>
                <Select value={String(endGameweek)} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  Search
                </label>
                <Input
                  data-testid="input-player-search"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              
              <div className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2 lg:col-span-3 xl:col-span-1 justify-center sm:justify-end">
                <TrendingUp className="h-4 w-4" />
                <span>{filteredAndSortedData.length} players</span>
              </div>
            </div>

            {/* Gameweek Toggle Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-3">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Toggle Gameweeks (click to exclude/include):
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {excludedGameweeks.size > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearExclusions}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 h-auto"
                      data-testid="button-clear-exclusions"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear exclusions
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApplyAvailability(!applyAvailability)}
                    className={`flex items-center gap-1.5 text-xs px-2 sm:px-3 py-1 h-auto ${
                      applyAvailability 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                    }`}
                    data-testid="button-toggle-availability"
                  >
                    {applyAvailability ? 'Availability Adjustment: ON' : 'Availability Adjustment: OFF'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOpponent(!showOpponent)}
                    className={`flex items-center gap-1.5 text-xs px-2 sm:px-3 py-1 h-auto ${
                      showOpponent 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                    }`}
                    data-testid="button-toggle-opponent"
                  >
                    {showOpponent ? 'Hide Opponent' : 'Show Opponent'}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {Array.from({ length: endGameweek - startGameweek + 1 }, (_, i) => {
                  const gwNumber = startGameweek + i;
                  const isExcluded = excludedGameweeks.has(gwNumber);
                  return (
                    <Button
                      key={gwNumber}
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGameweekExclusion(gwNumber)}
                      className={`min-w-[50px] sm:min-w-[60px] text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto ${
                        isExcluded 
                          ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' 
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                      }`}
                      data-testid={`button-toggle-gw-${gwNumber}`}
                    >
                      GW{gwNumber}
                    </Button>
                  );
                })}
              </div>
              {excludedGameweeks.size > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Excluded: {Array.from(excludedGameweeks).sort((a, b) => a - b).map(gw => `GW${gw}`).join(', ')}
                </p>
              )}
            </div>

            {/* Position Toggle Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Positions:</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPositions(new Set())}
                    className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-300">All</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPositions(new Set(['_none_']))}
                    className="text-xs px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border-red-300">None</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map(pos => {
                  const isSelected = selectedPositions.size === 0 || selectedPositions.has(pos);
                  const shortForm = pos === 'Goalkeeper' ? 'GKP' : pos === 'Defender' ? 'DEF' : pos === 'Midfielder' ? 'MID' : 'FWD';
                  return (
                    <Button key={pos} variant="outline" size="sm" onClick={() => togglePositionSelection(pos)}
                      className={`text-xs px-2 py-1 ${isSelected ? 'bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-300' : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'}`}
                      data-testid={`button-toggle-position-${pos}`}>{shortForm}</Button>
                  );
                })}
              </div>
            </div>

            {/* Team Toggle Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Teams:</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTeams(new Set())}
                    className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-300">All</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedTeams(new Set(['_none_']))}
                    className="text-xs px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border-red-300">None</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {teams.map(team => {
                  const isSelected = selectedTeams.size === 0 || selectedTeams.has(team);
                  const shortName = teamNameToShort?.get(team) || team;
                  return (
                    <Button key={team} variant="outline" size="sm" onClick={() => toggleTeamSelection(team)}
                      className={`text-xs px-2 py-1 ${isSelected ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300' : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'}`}
                      data-testid={`button-toggle-team-${team}`}>{shortName}</Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Loading State */}
        {(isLoading || !initialized) && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Results */}
        {!isLoading && initialized && filteredAndSortedData.length > 0 && (
          <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      {viewMode === "future" ? "Player Assist Projections" : "Player Assist History"}: GW{startGameweek}-GW{endGameweek}
                      {excludedGameweeks.size > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {excludedGameweeks.size} excluded
                        </Badge>
                      )}
                    </CardTitle>
                    <Button
                      onClick={handleRefreshData}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="button-refresh-data"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                      <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-1 md:px-3 py-2 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[100px] md:min-w-[150px]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs md:text-sm">
                              Player {getSortIcon('name')}
                            </Button>
                          </th>
                          {dynamicGameweekColumns.map((gw) => (
                            <th key={`assists-header-gw${gw}`} className="px-1 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider min-w-[40px] md:min-w-[50px]">
                              <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs md:text-sm">
                                {gw} {getSortIcon(`gw${gw}`)}
                              </Button>
                            </th>
                          ))}
                          <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 bg-orange-50 min-w-[50px] md:min-w-[70px]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('rangeTotal')} className="h-auto p-0 font-medium text-gray-500 hover:bg-orange-100 hover:text-gray-700 text-xs md:text-sm">
                              {viewMode === "pastXa" ? "xA" : "Assists"} {getSortIcon('rangeTotal')}
                            </Button>
                          </th>
                          <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider bg-blue-50 min-w-[50px] md:min-w-[70px]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('rangePoints')} className="h-auto p-0 font-medium text-gray-500 hover:bg-blue-100 hover:text-gray-700 text-xs md:text-sm">
                              Pts {getSortIcon('rangePoints')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => {
                          const playerInfo = playerAvailabilityMap?.get(player.playerId);
                          const gwMultipliers = applyAvailability 
                            ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
                            : {};
                          const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                          
                          let adjustedTotal = 0;
                          let originalTotal = 0;
                          dynamicGameweekColumns.forEach(gw => {
                            const val = player.gameweekProjections[gw.toString()] || 0;
                            const mult = gwMultipliers[gw] ?? 1;
                            adjustedTotal += val * mult;
                            originalTotal += val;
                          });
                          const pointsTotal = adjustedTotal * 3;
                          const originalPointsTotal = originalTotal * 3;
                          
                          return (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-2 px-1 md:px-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[100px] md:min-w-[150px]">
                              <div className="flex items-center gap-0.5 flex-wrap">
                                <PlayerNameCell 
                                  name={(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}
                                  position={player.position}
                                  team={player.teamShort}
                                  compact={true}
                                />
                                {playerAvailabilityMap && playerAvailabilityMap.get(player.playerId) && (
                                  <PlayerAvailabilityBadge player={playerAvailabilityMap.get(player.playerId)!} />
                                )}
                              </div>
                            </td>
                            {dynamicGameweekColumns.map((gw) => {
                              const projValue = player.gameweekProjections[gw.toString()] || 0;
                              const opponentInfo = opponentMap.get(`${player.teamShort}-${gw}`);
                              const multiplier = gwMultipliers[gw] ?? 1;
                              const displayValue = projValue * multiplier;
                              const hasGwAdjustment = applyAvailability && multiplier !== 1;
                              const formatValue = (val: number) => viewMode === "past" ? Math.round(val).toString() : val.toFixed(2);
                              return (
                                <td key={`assists-cell-${player.playerId}-gw${gw}`} className="text-center py-2 px-1 text-xs md:text-sm min-w-[40px] md:min-w-[50px]">
                                  <div className="flex flex-col items-center">
                                    {hasGwAdjustment && projValue > 0 ? (
                                      <>
                                        <span className="text-purple-700 font-medium">{formatValue(displayValue)}</span>
                                        <span className="text-gray-400 line-through text-xs">{formatValue(projValue)}</span>
                                      </>
                                    ) : (
                                      <span>{projValue > 0 ? formatValue(projValue) : "-"}</span>
                                    )}
                                    {showOpponent && opponentInfo && (
                                      <span className={`text-xs ${opponentInfo.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                        {opponentInfo.opponent} ({opponentInfo.isHome ? 'H' : 'A'})
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className={`text-center py-2 px-1 font-semibold min-w-[50px] md:min-w-[70px] ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-orange-50'}`}>
                              {hasAnyAdjustment ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-sm md:text-lg font-bold text-purple-700">{viewMode === "past" ? Math.round(adjustedTotal) : adjustedTotal.toFixed(2)}</span>
                                  <span className="text-gray-400 line-through text-[10px] md:text-xs">{viewMode === "past" ? Math.round(originalTotal) : originalTotal.toFixed(2)}</span>
                                </div>
                              ) : (
                                <span className="text-sm md:text-lg font-bold text-orange-900">{viewMode === "past" ? Math.round(adjustedTotal) : adjustedTotal.toFixed(2)}</span>
                              )}
                            </td>
                            <td className={`text-center py-2 px-1 font-semibold min-w-[50px] md:min-w-[70px] ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-blue-50'}`}>
                              {hasAnyAdjustment ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-sm md:text-lg font-bold text-purple-700">{viewMode === "past" ? Math.round(pointsTotal) : pointsTotal.toFixed(2)}</span>
                                  <span className="text-gray-400 line-through text-[10px] md:text-xs">{viewMode === "past" ? Math.round(originalPointsTotal) : originalPointsTotal.toFixed(2)}</span>
                                </div>
                              ) : (
                                <span className="text-sm md:text-lg font-bold text-blue-900">{viewMode === "past" ? Math.round(pointsTotal) : pointsTotal.toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredAndSortedData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
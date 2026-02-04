import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, ArrowUpDown, Users, Loader2, X, Filter, ChevronDown, ChevronUp, History, Calendar } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerNameCell } from "@/components/enhanced-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface SavesProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  saves: { [key: string]: number };
  pointsFromSaves: { [key: string]: number };
  totalSaves: number;
  totalPoints: number;
  averagePerGameweek: number;
}

interface PlayerSavesHistory {
  lastFinishedGW: number;
  players: {
    playerId: number;
    playerName: string;
    teamName: string;
    teamShort: string;
    position: string;
    gameweekSaves: { [key: number]: number };
    totalSaves: number;
  }[];
}

type SortField = 'name' | 'team' | 'totalSaves' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerSaves() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("totalSaves");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // View mode: "future" for projections, "past" for historical data
  const [viewMode, setViewMode] = useState<"future" | "past">("future");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch past player saves history
  const { data: historyData, isLoading: historyLoading } = useQuery<PlayerSavesHistory>({
    queryKey: ["/api/player-saves-history"],
    enabled: viewMode === "past",
  });

  // Get available gameweeks for dropdown based on view mode
  const availableGameweeks = useMemo(() => {
    if (viewMode === "past") {
      const lastFinished = historyData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    if (!bootstrapData?.events) {
      return [];
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12);
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW]);

  // Create teamName to short_name mapping
  const teamNameToShort = useMemo(() => {
    if (!bootstrapData?.teams) return new Map<string, string>();
    const map = new Map<string, string>();
    bootstrapData.teams.forEach((team: any) => {
      map.set(team.name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

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

  // Initialize gameweek range once bootstrap data is loaded
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
    if (viewMode === "past" && historyData?.lastFinishedGW) {
      const lastFinished = historyData.lastFinishedGW;
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
  }, [viewMode, historyData?.lastFinishedGW, bootstrapData?.events]);

  // API call for saves projections - use cached endpoint for 10-20x faster loading
  const { data: allSavesProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: ["/api/cached/player-saves-projections"],
    enabled: initialized && viewMode === "future",
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Filter cached data to selected gameweek range (client-side filtering is instant)
  const savesProjections = useMemo(() => {
    if (!allSavesProjections || !Array.isArray(allSavesProjections)) return null;
    
    // Filter each player's saves to only include selected range (excluding excluded gameweeks)
    return allSavesProjections.map((player: any) => {
      const filteredSaves: Record<string, number> = {};
      const filteredPoints: Record<string, number> = {};
      const originalSaves = player.saves || {};
      const originalPoints = player.pointsFromSaves || {};
      
      // Calculate total for selected range (only active gameweeks)
      let totalSaves = 0;
      let totalPoints = 0;
      let activeCount = 0;
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        const gwKey = `gw${gw}`;
        const saves = originalSaves[gwKey] || 0;
        const points = originalPoints[gwKey] || 0;
        filteredSaves[gwKey] = saves;
        filteredPoints[gwKey] = points;
        // Only sum non-excluded gameweeks
        if (!excludedGameweeks.has(gw)) {
          totalSaves += saves;
          totalPoints += points;
          activeCount++;
        }
      }
      
      return {
        ...player,
        saves: filteredSaves,
        pointsFromSaves: filteredPoints,
        totalSaves,
        totalPoints,
        averagePerGameweek: activeCount > 0 ? totalSaves / activeCount : 0
      };
    });
  }, [allSavesProjections, startGameweek, endGameweek, excludedGameweeks]);

  // Unified display data - transforms history data to match projection format
  const displayData = useMemo(() => {
    if (viewMode === "past" && historyData?.players) {
      return historyData.players.map(player => {
        const saves: Record<string, number> = {};
        let totalSaves = 0;
        let activeCount = 0;
        
        for (let gw = startGameweek; gw <= endGameweek; gw++) {
          const gwSaves = player.gameweekSaves[gw] || 0;
          saves[`gw${gw}`] = gwSaves;
          if (!excludedGameweeks.has(gw)) {
            totalSaves += gwSaves;
            activeCount++;
          }
        }
        
        return {
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: player.teamName,
          position: player.position,
          saves,
          pointsFromSaves: {},
          totalSaves,
          totalPoints: 0,
          averagePerGameweek: activeCount > 0 ? totalSaves / activeCount : 0
        } as SavesProjection;
      });
    }
    return savesProjections || [];
  }, [viewMode, historyData, savesProjections, startGameweek, endGameweek, excludedGameweeks]);

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
    if (!bootstrapData?.events) return 3;
    const currentEvent = bootstrapData.events.find((e: any) => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const teams = useMemo(() => {
    if (!displayData || !Array.isArray(displayData)) return [];
    const uniqueTeams = Array.from(new Set(displayData.map((p: SavesProjection) => p.teamName)));
    return uniqueTeams.sort();
  }, [displayData]);

  // Toggle team selection
  const toggleTeamSelection = (team: string) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(team)) newSet.delete(team);
      else newSet.add(team);
      return newSet;
    });
  };

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

  // Generate dynamic gameweek columns based on selected range (excluding excluded gameweeks)
  const dynamicGameweekColumns = useMemo(() => {
    const columns = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      if (!excludedGameweeks.has(gw)) {
        columns.push(gw);
      }
    }
    return columns;
  }, [startGameweek, endGameweek, excludedGameweeks]);

  // Calculate dynamic totals based on selected gameweek range (using filtered columns)
  const getFilteredTotal = (player: SavesProjection, useAvailability: boolean = false) => {
    let total = 0;
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const availabilityFactor = useAvailability && playerInfo 
      ? (playerInfo.chanceOfPlayingNextRound ?? 100) / 100 
      : 1;
    for (const gw of dynamicGameweekColumns) {
      total += (player.saves?.[`gw${gw}`] || 0) * availabilityFactor;
    }
    return total;
  };

  // Helper to get adjusted total for sorting
  const getAdjustedTotalForSort = (player: SavesProjection) => {
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const gwMultipliers = applyAvailability 
      ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
      : {};
    let total = 0;
    dynamicGameweekColumns.forEach(gw => {
      const val = player.saves?.[`gw${gw}`] || 0;
      const mult = gwMultipliers[gw] ?? 1;
      total += val * mult;
    });
    return total;
  };

  const filteredAndSortedData = useMemo(() => {
    if (!displayData || !Array.isArray(displayData)) return [];
    
    let filtered = displayData.filter((projection: SavesProjection) => {
      const matchesSearch = !searchTerm || 
        projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (selectedTeams.size > 0 && !selectedTeams.has(projection.teamName)) return false;
      
      return matchesSearch;
    });

    // Sort data
    filtered.sort((a: SavesProjection, b: SavesProjection) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case 'team':
          aValue = a.teamName;
          bValue = b.teamName;
          break;
        case 'totalSaves':
          aValue = getAdjustedTotalForSort(a);
          bValue = getAdjustedTotalForSort(b);
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw4', 'gw5', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = parseInt(sortField.replace('gw', ''));
            const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
            const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
            const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            aValue = (a.saves?.[`gw${gwNumber}`] || 0) * (aMultipliers[gwNumber] ?? 1);
            bValue = (b.saves?.[`gw${gwNumber}`] || 0) * (bMultipliers[gwNumber] ?? 1);
          } else {
            aValue = getAdjustedTotalForSort(a);
            bValue = getAdjustedTotalForSort(b);
          }
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [displayData, searchTerm, selectedTeams, sortField, sortDirection, startGameweek, endGameweek, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData, dynamicGameweekColumns, viewMode]);

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
      <ArrowUpDown className="h-4 w-4 text-blue-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-blue-600" />;
  };

  // Check if data is loading based on view mode
  const isDataLoading = isLoadingBootstrap || !initialized || 
    (viewMode === "future" && (isLoadingProjections || !displayData || displayData.length === 0)) ||
    (viewMode === "past" && historyLoading);

  // Show loading state while data is loading
  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              {viewMode === "future" ? "Loading Saves Projections" : "Loading Historical Saves"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              {viewMode === "future" 
                ? "Calculating goalkeeper saves and FPL points for all players across the next 12 gameweeks..."
                : "Loading historical goalkeeper saves data..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Shield className="h-8 w-8" />
            <h1>{viewMode === "future" ? "Goalkeeper Saves Projections" : "Goalkeeper Saves History"}</h1>
          </div>
          <p className="fpl-page-subtitle">
            {viewMode === "future" 
              ? "Goalkeeper save predictions and FPL points analysis for upcoming gameweeks"
              : "Actual goalkeeper saves from past gameweeks"}
          </p>
          {/* Past/Future Toggle */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={viewMode === "past" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("past")}
              className={`flex items-center gap-1.5 ${viewMode === "past" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
            >
              <History className="h-4 w-4" />
              Past GW Data
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
                    <Filter className="h-5 w-5 text-blue-600" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  Search
                </label>
                <Input
                  placeholder="Search goalkeepers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  data-testid="input-search"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 justify-center sm:justify-end">
                <Users className="h-4 w-4" />
                <span>{filteredAndSortedData.length} goalkeepers</span>
              </div>
            </div>

            {/* Gameweek Toggle Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Toggle Gameweeks:
                </label>
                {excludedGameweeks.size > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearExclusions}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 h-auto"
                    data-testid="button-clear-exclusions"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApplyAvailability(!applyAvailability)}
                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto ${
                      applyAvailability 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                    }`}
                    data-testid="button-toggle-availability"
                  >
                    {applyAvailability ? "Availability Adjustment: ON" : "Availability Adjustment: OFF"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOpponent(!showOpponent)}
                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto ${
                      showOpponent 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                    }`}
                    data-testid="button-toggle-opponent"
                  >
                    {showOpponent ? "Hide Opponent" : "Show Opponent"}
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

        {/* Results */}
        {filteredAndSortedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                {viewMode === "future" ? "Expected Saves" : "Actual Saves"}: GW{startGameweek}-GW{endGameweek}
                {excludedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {excludedGameweeks.size} excluded
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {viewMode === "future" 
                  ? "Projected number of saves for each goalkeeper based on opponent strength and team defensive quality"
                  : "Actual saves recorded for each goalkeeper in past gameweeks"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-1 md:px-3 py-2 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs md:text-sm">
                            Player {getSortIcon('name')}
                          </Button>
                        </th>
                        {dynamicGameweekColumns.map((gw) => (
                          <th key={`saves-header-gw${gw}`} className="px-1 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider min-w-[40px] md:min-w-[50px]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs md:text-sm">
                              {gw} {getSortIcon(`gw${gw}`)}
                            </Button>
                          </th>
                        ))}
                        <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 bg-blue-50 min-w-[50px] md:min-w-[70px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('totalSaves')} className="h-auto p-0 font-medium text-gray-500 hover:bg-blue-100 hover:text-gray-700 text-xs md:text-sm">
                            Total {getSortIcon('totalSaves')}
                          </Button>
                        </th>
                        <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider bg-green-50 min-w-[40px] md:min-w-[60px] hidden md:table-cell">
                          Avg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData.map((projection: SavesProjection, index) => {
                        const playerInfo = playerAvailabilityMap?.get(projection.playerId);
                        const gwMultipliers = applyAvailability 
                          ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
                          : {};
                        const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                        
                        let adjustedTotal = 0;
                        let originalTotal = 0;
                        dynamicGameweekColumns.forEach(gw => {
                          const val = projection.saves?.[`gw${gw}`] || 0;
                          const mult = gwMultipliers[gw] ?? 1;
                          adjustedTotal += val * mult;
                          originalTotal += val;
                        });
                        const adjustedAverage = adjustedTotal / dynamicGameweekColumns.length;
                        const originalAverage = originalTotal / dynamicGameweekColumns.length;
                        
                        return (
                        <tr key={projection.playerId} className={`border-b border-gray-100 hover:bg-blue-50/50 ${index < 10 ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-2 px-1 md:px-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                            <div className="flex items-center gap-0.5 flex-wrap">
                              <PlayerNameCell 
                                name={(playerIdToWebName && playerIdToWebName.get(projection.playerId)) || projection.playerName}
                                position={projection.position}
                                team={projection.teamName}
                                compact={true}
                              />
                              {playerAvailabilityMap && playerAvailabilityMap.get(projection.playerId) && (
                                <PlayerAvailabilityBadge player={playerAvailabilityMap.get(projection.playerId)!} />
                              )}
                            </div>
                          </td>
                          {dynamicGameweekColumns.map((gw) => {
                            const teamShort = teamNameToShort.get(projection.teamName) || '';
                            const opponentInfo = opponentMap.get(`${teamShort}-${gw}`);
                            const rawValue = projection.saves?.[`gw${gw}`] || 0;
                            const multiplier = gwMultipliers[gw] ?? 1;
                            const displayValue = rawValue * multiplier;
                            const hasGwAdjustment = applyAvailability && multiplier !== 1;
                            const formatValue = (val: number) => viewMode === "past" ? val.toFixed(0) : val.toFixed(2);
                            return (
                              <td key={`saves-cell-${projection.playerId}-gw${gw}`} className="text-center py-2 px-1 text-xs md:text-sm min-w-[40px] md:min-w-[50px]">
                                <div className="flex flex-col items-center">
                                  {hasGwAdjustment && rawValue ? (
                                    <>
                                      <span className="text-purple-700 font-medium">{formatValue(displayValue)}</span>
                                      <span className="text-gray-400 line-through text-xs">{formatValue(rawValue)}</span>
                                    </>
                                  ) : (
                                    <span>{rawValue ? formatValue(rawValue) : '-'}</span>
                                  )}
                                  {showOpponent && opponentInfo && (
                                    <span className={`text-xs mt-0.5 ${opponentInfo.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                      {opponentInfo.opponent} ({opponentInfo.isHome ? 'H' : 'A'})
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className={`text-center py-2 px-1 font-semibold min-w-[50px] md:min-w-[70px] ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-blue-50'}`}>
                            {hasAnyAdjustment ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm md:text-lg font-bold text-purple-700">{viewMode === "past" ? adjustedTotal.toFixed(0) : adjustedTotal.toFixed(2)}</span>
                                <span className="text-gray-400 line-through text-[10px] md:text-xs">{viewMode === "past" ? originalTotal.toFixed(0) : originalTotal.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-sm md:text-lg font-bold text-blue-900">{viewMode === "past" ? adjustedTotal.toFixed(0) : adjustedTotal.toFixed(2)}</span>
                            )}
                          </td>
                          <td className={`text-center py-2 px-1 min-w-[40px] md:min-w-[60px] hidden md:table-cell ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-green-50'}`}>
                            {hasAnyAdjustment ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-purple-700">{adjustedAverage.toFixed(2)}</span>
                                <span className="text-gray-400 line-through text-xs">{originalAverage.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-green-900">{adjustedAverage.toFixed(2)}</span>
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
        )}

        {/* No Results */}
        {filteredAndSortedData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goalkeepers found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
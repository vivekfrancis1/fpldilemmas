import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Search, ArrowUpDown, Users, Loader2, X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerNameCell } from "@/components/enhanced-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  bonusPoints: number;
}

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface BonusPointsProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  bonusPoints: { [key: string]: number };
  pointsFromBonus: { [key: string]: number };
  totalBonusPoints: number;
  totalPoints: number;
  averagePerGameweek: number;
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
}

type SortField = 'name' | 'team' | 'totalBonusPoints' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerBonusPoints() {
  const { defaultWeeks } = useProjectionSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("totalBonusPoints");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Get available gameweeks for dropdown (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12); // Show 12 gameweeks in dropdown
  }, [bootstrapData?.events]);

  // Initialize gameweek range once bootstrap data is loaded
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks); 
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 38) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
    }
  }, [bootstrapData, initialized]);

  // Simplified API call for bonus points projections (now projects future gameweeks only)
  const { data: bonusPointsProjections, isLoading: isLoadingProjections } = useQuery<BonusPointsProjection[]>({
    queryKey: ["/api/player-bonus-points-projections"],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes for live data
  });

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
    if (!bonusPointsProjections || !Array.isArray(bonusPointsProjections)) return [];
    const uniqueTeams = Array.from(new Set(bonusPointsProjections.map((p: BonusPointsProjection) => p.teamName)));
    return uniqueTeams.sort();
  }, [bonusPointsProjections]);

  const positions = ["GKP", "DEF", "MID", "FWD"];

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
  const getFilteredTotal = (player: BonusPointsProjection, useAvailability: boolean = false) => {
    let total = 0;
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const availabilityFactor = useAvailability && playerInfo 
      ? (playerInfo.chanceOfPlayingNextRound ?? 100) / 100 
      : 1;
    for (const gw of dynamicGameweekColumns) {
      total += (player.bonusPoints?.[`gw${gw}`] || 0) * availabilityFactor;
    }
    return total;
  };

  // Helper to get adjusted total for sorting
  const getAdjustedTotalForSort = (player: BonusPointsProjection) => {
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const gwMultipliers = applyAvailability 
      ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
      : {};
    let total = 0;
    dynamicGameweekColumns.forEach(gw => {
      const val = player.bonusPoints?.[`gw${gw}`] || 0;
      const mult = gwMultipliers[gw] ?? 1;
      total += val * mult;
    });
    return total;
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

  const filteredAndSortedData = useMemo(() => {
    if (!bonusPointsProjections || !Array.isArray(bonusPointsProjections)) return [];
    
    let filtered = bonusPointsProjections.filter((projection: BonusPointsProjection) => {
      const matchesSearch = !searchTerm || 
        projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Position filter - exclude semantics (set contains excluded positions)
      if (selectedPositions.size > 0) {
        const normalizedPos = normalizePosition(projection.position);
        const excluded = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
        if (excluded) return false;
      }
      if (selectedTeams.size > 0 && !selectedTeams.has(projection.teamName)) return false;
      
      return matchesSearch;
    });

    // Sort data
    filtered.sort((a: BonusPointsProjection, b: BonusPointsProjection) => {
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
        case 'totalBonusPoints':
          aValue = getAdjustedTotalForSort(a);
          bValue = getAdjustedTotalForSort(b);
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw11', 'gw12', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = parseInt(sortField.replace('gw', ''));
            const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
            const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
            const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            aValue = (a.bonusPoints?.[`gw${gwNumber}`] || 0) * (aMultipliers[gwNumber] ?? 1);
            bValue = (b.bonusPoints?.[`gw${gwNumber}`] || 0) * (bMultipliers[gwNumber] ?? 1);
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
  }, [bonusPointsProjections, searchTerm, selectedPositions, selectedTeams, sortField, sortDirection, dynamicGameweekColumns, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Show loading state while data is loading OR while initializing gameweeks OR when data is empty
  if (isLoadingBootstrap || isLoadingProjections || !initialized || !bonusPointsProjections || bonusPointsProjections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Bonus Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating BPS projections for all players across the next 12 gameweeks...
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
            <Star className="h-8 w-8" />
            <h1>Player Bonus Points</h1>
          </div>
          <p className="fpl-page-subtitle">
            Bonus Point System (BPS) projections and additional FPL rewards for top performers
          </p>
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
                    <Filter className="h-5 w-5 text-yellow-600" />
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
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* Gameweek Toggle Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Toggle Gameweeks (click to exclude/include):
                </label>
                <div className="flex gap-2">
                  {excludedGameweeks.size > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearExclusions}
                      className="text-xs text-gray-500 hover:text-gray-700"
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
                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto ${
                      applyAvailability 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                    }`}
                    data-testid="button-toggle-availability"
                  >
                    {applyAvailability ? "Availability Adjustment: ON" : "Availability Adjustment: OFF"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: endGameweek - startGameweek + 1 }, (_, i) => {
                  const gwNumber = startGameweek + i;
                  const isExcluded = excludedGameweeks.has(gwNumber);
                  return (
                    <Button
                      key={gwNumber}
                      variant={isExcluded ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleGameweekExclusion(gwNumber)}
                      className={`min-w-[60px] ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
                  <Button variant="outline" size="sm" onClick={() => setSelectedPositions(new Set(['GKP', 'DEF', 'MID', 'FWD']))}
                    className="text-xs px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border-red-300">None</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {['GKP', 'DEF', 'MID', 'FWD'].map(pos => {
                  const isSelected = !selectedPositions.has(pos);
                  return (
                    <Button key={pos} variant="outline" size="sm" onClick={() => togglePositionSelection(pos)}
                      className={`text-xs px-2 py-1 ${isSelected ? 'bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-300' : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'}`}
                      data-testid={`button-toggle-position-${pos}`}>{pos}</Button>
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
                  return (
                    <Button key={team} variant="outline" size="sm" onClick={() => toggleTeamSelection(team)}
                      className={`text-xs px-2 py-1 ${isSelected ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300' : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'}`}
                      data-testid={`button-toggle-team-${team}`}>{team}</Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
              <Users className="h-4 w-4" />
              <span>{filteredAndSortedData.length} players</span>
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
                Bonus Points Projections
                {excludedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {excludedGameweeks.size} excluded
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 border-b-2 border-blue-100 sticky top-0 z-10">
                      <tr>
                        <th className="text-left py-2 px-1 md:px-3 font-semibold text-gray-700 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px] text-xs md:text-sm">
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            Player
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        {dynamicGameweekColumns.map((gw) => (
                          <th key={`gw${gw}`} className="text-center py-2 px-1 text-xs md:text-sm font-semibold text-gray-700 min-w-[40px] md:min-w-[50px]">
                            <button
                              onClick={() => handleSort(`gw${gw}`)}
                              className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors w-full"
                            >
                              {gw}
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                        ))}
                        <th className="text-center py-2 px-1 text-xs md:text-sm font-bold bg-blue-100 border-l border-blue-200 min-w-[50px] md:min-w-[70px]">
                          <button
                            onClick={() => handleSort('totalBonusPoints')}
                            className="flex items-center justify-center gap-1 hover:text-blue-700 transition-colors w-full"
                          >
                            Total
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-center py-2 px-1 text-xs md:text-sm font-semibold bg-green-50 border-l border-green-200 min-w-[40px] md:min-w-[60px] hidden md:table-cell">
                          Avg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData.map((projection: BonusPointsProjection, index) => {
                        const playerInfo = playerAvailabilityMap?.get(projection.playerId);
                        const gwMultipliers = applyAvailability 
                          ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
                          : {};
                        const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                        
                        let adjustedTotal = 0;
                        let originalTotal = 0;
                        dynamicGameweekColumns.forEach(gw => {
                          const val = projection.bonusPoints?.[`gw${gw}`] || 0;
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
                            const rawValue = projection.bonusPoints?.[`gw${gw}`] || 0;
                            const multiplier = gwMultipliers[gw] ?? 1;
                            const displayValue = rawValue * multiplier;
                            const hasGwAdjustment = applyAvailability && multiplier !== 1;
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            return (
                              <td key={`bonus-cell-${projection.playerId}-gw${gw}`} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium min-w-[40px] md:min-w-[50px]">
                                {isDGW ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium">
                                        {hasGwAdjustment && rawValue ? (
                                          <span className="text-purple-700">{displayValue.toFixed(2)}</span>
                                        ) : (
                                          <span>{rawValue ? rawValue.toFixed(2) : '-'}</span>
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                      <div className="text-xs font-semibold mb-2">GW{gw} Fixture Breakdown</div>
                                      {fixtures.map((f: FixtureDetail, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                          <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                            {f.opponent} ({f.isHome ? 'H' : 'A'})
                                          </span>
                                          <span className="font-medium text-xs">{f.bonusPoints.toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                        <span>Total</span>
                                        <span>{rawValue.toFixed(2)}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : hasGwAdjustment && rawValue ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-purple-700 font-medium">{displayValue.toFixed(2)}</span>
                                    <span className="text-gray-400 line-through text-xs">{rawValue.toFixed(2)}</span>
                                  </div>
                                ) : (
                                  <span>{rawValue ? rawValue.toFixed(2) : '-'}</span>
                                )}
                              </td>
                            );
                          })}
                          <td className={`px-1 md:px-3 py-2 md:py-4 text-center min-w-[50px] md:min-w-[70px] ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-blue-50'}`}>
                            {hasAnyAdjustment ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm md:text-lg font-bold text-purple-700">{adjustedTotal.toFixed(2)}</span>
                                <span className="text-gray-400 line-through text-[10px] md:text-xs">{originalTotal.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-sm md:text-lg font-bold text-blue-900">{adjustedTotal.toFixed(2)}</span>
                            )}
                          </td>
                          <td className={`px-1 md:px-3 py-2 md:py-4 text-center min-w-[40px] md:min-w-[60px] hidden md:table-cell ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-green-50'}`}>
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

        {filteredAndSortedData.length === 0 && bonusPointsProjections && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">No players found</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
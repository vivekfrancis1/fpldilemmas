import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Search, ArrowUpDown, Users, Loader2, X } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerNameCell } from "@/components/enhanced-table";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";

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
}

type SortField = 'name' | 'team' | 'totalBonusPoints' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerBonusPoints() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("totalBonusPoints");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(false);

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

  const teams = useMemo(() => {
    if (!bonusPointsProjections || !Array.isArray(bonusPointsProjections)) return [];
    const uniqueTeams = Array.from(new Set(bonusPointsProjections.map((p: BonusPointsProjection) => p.teamName)));
    return uniqueTeams.sort();
  }, [bonusPointsProjections]);

  const positions = ["GKP", "DEF", "MID", "FWD"];

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
    const playerInfo = playerAvailabilityMap.get(player.playerId);
    const availabilityFactor = useAvailability && playerInfo 
      ? (playerInfo.chance_of_playing_next_round ?? 100) / 100 
      : 1;
    for (const gw of dynamicGameweekColumns) {
      total += (player.bonusPoints?.[`gw${gw}`] || 0) * availabilityFactor;
    }
    return total;
  };

  const filteredAndSortedData = useMemo(() => {
    if (!bonusPointsProjections || !Array.isArray(bonusPointsProjections)) return [];
    
    let filtered = bonusPointsProjections.filter((projection: BonusPointsProjection) => {
      const matchesSearch = !searchTerm || 
        projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
      const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
      
      return matchesSearch && matchesPosition && matchesTeam;
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
          aValue = getFilteredTotal(a);
          bValue = getFilteredTotal(b);
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw11', 'gw12', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = sortField.replace('gw', '');
            aValue = a.bonusPoints?.[`gw${gwNumber}`] || 0;
            bValue = b.bonusPoints?.[`gw${gwNumber}`] || 0;
          } else {
            aValue = getFilteredTotal(a);
            bValue = getFilteredTotal(b);
          }
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [bonusPointsProjections, searchTerm, positionFilter, teamFilter, sortField, sortDirection, dynamicGameweekColumns]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Show loading state while data is loading OR while initializing gameweeks
  if (isLoadingBootstrap || isLoadingProjections || !initialized) {
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
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
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
                <label className="text-sm font-medium text-gray-700">Position</label>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full" data-testid="select-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {positions.map((position, index) => (
                      <SelectItem key={`position-${position}-${index}`} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Team</label>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-full" data-testid="select-team">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((team, index) => (
                      <SelectItem key={`team-${team}-${index}`} value={team}>
                        {team}
                      </SelectItem>
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
                    {applyAvailability ? "Availability: ON" : "Availability: OFF"}
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

            <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
              <Users className="h-4 w-4" />
              <span>{filteredAndSortedData.length} players</span>
            </div>
          </CardContent>
        </Card>

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
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 sticky left-0 bg-blue-50 border-r border-blue-100 min-w-[140px] sm:min-w-[180px]">
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            Player
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        {dynamicGameweekColumns.map((gw) => (
                          <th key={`gw${gw}`} className="text-center py-3 px-2 text-sm font-semibold text-gray-700 min-w-[60px]">
                            <button
                              onClick={() => handleSort(`gw${gw}`)}
                              className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors w-full"
                            >
                              GW{gw}
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                        ))}
                        <th className="text-center py-3 px-1 text-sm font-bold bg-blue-100 border-l border-blue-200">
                          <button
                            onClick={() => handleSort('totalBonusPoints')}
                            className="flex items-center justify-center gap-1 hover:text-blue-700 transition-colors w-full"
                          >
                            Total
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-center py-3 px-1 text-sm font-semibold bg-green-50 border-l border-green-200">
                          Avg/GW
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData.map((projection: BonusPointsProjection, index) => {
                        const filteredTotal = getFilteredTotal(projection, applyAvailability);
                        const filteredAverage = filteredTotal / dynamicGameweekColumns.length;
                        const playerInfo = playerAvailabilityMap.get(projection.playerId);
                        const hasAvailabilityAdjustment = applyAvailability && playerInfo && (playerInfo.chance_of_playing_next_round ?? 100) < 100;
                        return (
                        <tr key={projection.playerId} className={`border-b border-gray-100 hover:bg-blue-50/50 ${index < 10 ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 sticky left-0 bg-white border-r border-gray-100">
                            <div className="flex items-center gap-1">
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
                            const availabilityFactor = hasAvailabilityAdjustment && playerInfo 
                              ? (playerInfo.chance_of_playing_next_round ?? 100) / 100 
                              : 1;
                            const displayValue = rawValue * availabilityFactor;
                            return (
                              <td key={`bonus-cell-${projection.playerId}-gw${gw}`} className="text-center py-2 sm:py-3 px-2 text-sm">
                                {hasAvailabilityAdjustment && rawValue ? (
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
                          <td className={`text-center py-3 px-1 font-semibold ${hasAvailabilityAdjustment ? 'bg-purple-50' : 'bg-blue-50'}`}>
                            {hasAvailabilityAdjustment ? (
                              <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-purple-700">{filteredTotal.toFixed(2)}</span>
                                <span className="text-gray-400 line-through text-xs">{getFilteredTotal(projection, false).toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-blue-900">{filteredTotal.toFixed(2)}</span>
                            )}
                          </td>
                          <td className={`text-center py-3 px-1 ${hasAvailabilityAdjustment ? 'bg-purple-50' : 'bg-green-50'}`}>
                            {hasAvailabilityAdjustment ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-purple-700">{filteredAverage.toFixed(2)}</span>
                                <span className="text-gray-400 line-through text-xs">{(getFilteredTotal(projection, false) / dynamicGameweekColumns.length).toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-green-900">{filteredAverage.toFixed(2)}</span>
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
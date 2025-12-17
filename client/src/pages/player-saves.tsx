import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, ArrowUpDown, Users, Loader2, X } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerNameCell } from "@/components/enhanced-table";

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

type SortField = 'name' | 'team' | 'totalSaves' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerSaves() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("totalSaves");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());

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

  // API call for saves projections - use cached endpoint for 10-20x faster loading
  const { data: allSavesProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: ["/api/cached/player-saves-projections"],
    enabled: initialized,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Filter cached data to selected gameweek range (client-side filtering is instant)
  const savesProjections = useMemo(() => {
    if (!allSavesProjections) return allSavesProjections;
    
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

  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  const teams = useMemo(() => {
    if (!savesProjections || !Array.isArray(savesProjections)) return [];
    const uniqueTeams = Array.from(new Set(savesProjections.map((p: SavesProjection) => p.teamName)));
    return uniqueTeams.sort();
  }, [savesProjections]);

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
  const getFilteredTotal = (player: SavesProjection) => {
    let total = 0;
    for (const gw of dynamicGameweekColumns) {
      total += player.saves?.[`gw${gw}`] || 0;
    }
    return total;
  };

  const filteredAndSortedData = useMemo(() => {
    if (!savesProjections || !Array.isArray(savesProjections)) return [];
    
    let filtered = savesProjections.filter((projection: SavesProjection) => {
      const matchesSearch = !searchTerm || 
        projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
      
      return matchesSearch && matchesTeam;
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
          aValue = getFilteredTotal(a);
          bValue = getFilteredTotal(b);
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw4', 'gw5', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = sortField.replace('gw', '');
            aValue = a.saves?.[`gw${gwNumber}`] || 0;
            bValue = b.saves?.[`gw${gwNumber}`] || 0;
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
  }, [savesProjections, searchTerm, teamFilter, sortField, sortDirection, startGameweek, endGameweek]);

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

  // Show loading state while data is loading OR while initializing gameweeks
  if (isLoadingBootstrap || isLoadingProjections || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Saves Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating goalkeeper saves and FPL points for all players across the next 12 gameweeks...
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
            <h1>Goalkeeper Saves Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Goalkeeper save predictions and FPL points analysis for upcoming gameweeks
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Toggle Gameweeks (click to exclude/include):
                </label>
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
                      className={`min-w-[60px] ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
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
          </CardContent>
        </Card>

        {/* Results */}
        {filteredAndSortedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Expected Saves: GW{startGameweek}-GW{endGameweek}
                {excludedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {excludedGameweeks.size} excluded
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Projected number of saves for each goalkeeper based on opponent strength and team defensive quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[140px] sm:min-w-[180px] border-r border-gray-100">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                            Player {getSortIcon('name')}
                          </Button>
                        </th>
                        {dynamicGameweekColumns.map((gw) => (
                          <th key={`saves-header-gw${gw}`} className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                              GW{gw} {getSortIcon(`gw${gw}`)}
                            </Button>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 bg-blue-50">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('totalSaves')} className="h-auto p-0 font-medium text-gray-500 hover:bg-blue-100 hover:text-gray-700">
                            Total Saves {getSortIcon('totalSaves')}
                          </Button>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                          Avg/GW
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData.map((projection: SavesProjection, index) => {
                        const filteredTotal = getFilteredTotal(projection);
                        const filteredAverage = filteredTotal / dynamicGameweekColumns.length;
                        return (
                        <tr key={projection.playerId} className={`border-b border-gray-100 hover:bg-blue-50/50 ${index < 10 ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 sticky left-0 bg-white border-r border-gray-100">
                            <PlayerNameCell 
                              name={(playerIdToWebName && playerIdToWebName.get(projection.playerId)) || projection.playerName}
                              position={projection.position}
                              team={projection.teamName}
                              compact={true}
                            />
                          </td>
                          {dynamicGameweekColumns.map((gw) => (
                            <td key={`saves-cell-${projection.playerId}-gw${gw}`} className="text-center py-2 sm:py-3 px-2 text-sm">
                              {projection.saves?.[`gw${gw}`] ? (projection.saves[`gw${gw}`]).toFixed(2) : '-'}
                            </td>
                          ))}
                          <td className="text-center py-3 px-1 font-semibold bg-blue-50">
                            <span className="text-lg font-bold text-blue-900">
                              {filteredTotal.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center py-3 px-1 bg-green-50">
                            <span className="text-sm font-medium text-green-900">
                              {filteredAverage.toFixed(2)}
                            </span>
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
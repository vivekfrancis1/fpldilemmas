import { useState, useMemo, useEffect } from "react";

import { computeCurrentGameweek } from "@shared/gameweek-utils";
import { BootstrapData } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBatchAssistsProjections } from "@/hooks/use-batch-projections";
import { Zap, TrendingUp, Users, Calendar, Target, Search, Filter, ArrowUpDown, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";

interface PlayerAssistProjection {
  playerId: number;
  playerName: string;
  teamShort?: string;
  position: string;
  gameweekProjections: { [gameweek: string]: number };
  totalProjectedAssists: number;
  assistShare: number;
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

  // All useState hooks
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startGameweek, setStartGameweek] = useState<number>(5);
  const [endGameweek, setEndGameweek] = useState<number>(10);
  const [initialized, setInitialized] = useState(false);
  const [sortField, setSortField] = useState<SortField>('rangeTotal');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // useEffect for initialization
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const currentGW = computeCurrentGameweek(bootstrapData.events);
    const nextGW = Math.min((currentGW ?? 3) + 1, 38);
    const maxAvailableGW = Math.min(38, nextGW + 5); // Next 6 gameweeks max
    
    setStartGameweek(nextGW);
    setEndGameweek(Math.min(nextGW + 5, maxAvailableGW)); // Next 6 gameweeks default
    setInitialized(true);
  }, [bootstrapData, initialized]);

  // BATCH OPTIMIZED: Use new batch hook for better performance
  const { 
    data: playerAssistData, 
    isLoading, 
    error, 
    usedBatch 
  } = useBatchAssistsProjections(
    initialized ? startGameweek : undefined,
    initialized ? endGameweek : undefined,
    {
      enabled: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      batchSize: 150, // Process 150 players per batch
      maxConcurrency: 3, // Max 3 concurrent requests
    }
  );

  // ALL useMemo hooks
  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek + 1;
  const maxAvailableGW = Math.min(38, nextGameweek + 5); // Next 6 gameweeks max

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!playerAssistData) return [];
    const uniqueTeams = Array.from(new Set(playerAssistData.map(p => p.teamShort)));
    return uniqueTeams.sort();
  }, [playerAssistData]);

  const positions = useMemo(() => {
    if (!playerAssistData) return [];
    const uniquePositions = Array.from(new Set(playerAssistData.map(p => p.position)));
    return uniquePositions.sort();
  }, [playerAssistData]);

  // Get available gameweeks for filtering
  const availableGameweeks = useMemo(() => {
    if (!playerAssistData || playerAssistData.length === 0) return [];
    const gameweeks = new Set<number>();
    playerAssistData.forEach(player => {
      Object.keys(player.gameweekProjections).forEach(gw => {
        const gwNum = parseInt(gw);
        if (gwNum >= nextGameweek && gwNum <= maxAvailableGW) { // Show next 6 gameweeks dynamically
          gameweeks.add(gwNum);
        }
      });
    });
    return Array.from(gameweeks).sort((a, b) => a - b);
  }, [playerAssistData, nextGameweek, maxAvailableGW]);

  // Generate dynamic gameweek columns based on selected range
  const dynamicGameweekColumns = useMemo(() => {
    // Safe to use startGameweek and endGameweek (never null)
    const columns = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      columns.push(gw);
    }
    return columns;
  }, [startGameweek, endGameweek]);

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

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!playerAssistData) return [];
    
    let filtered = playerAssistData.filter(player => {
      // Search filter
      if (searchTerm) {
        const matchesSearch = player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (player.teamShort?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        if (!matchesSearch) return false;
      }
      
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
      return true;
    });

    // Calculate dynamic totals based on selected gameweek range
    const getFilteredTotal = (player: PlayerAssistProjection) => {
      let total = 0;
      for (let gw = startGameweek || 0; gw <= (endGameweek || 0); gw++) {
        total += player.gameweekProjections[gw.toString()] || 0;
      }
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
          aValue = getFilteredTotal(a);
          bValue = getFilteredTotal(b);
          break;
        case 'rangePoints':
          aValue = getFilteredTotal(a) * 3;
          bValue = getFilteredTotal(b) * 3;
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
              aValue = a.gameweekProjections[gwNumber.toString()] || 0;
              bValue = b.gameweekProjections[gwNumber.toString()] || 0;
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
  }, [playerAssistData, searchTerm, selectedPosition, selectedTeam, startGameweek, endGameweek, sortField, sortDirection]);

  // Calculate dynamic totals based on selected gameweek range
  const getFilteredTotal = (player: PlayerAssistProjection) => {
    let total = 0;
    for (let gw = startGameweek || 0; gw <= (endGameweek || 0); gw++) {
      total += player.gameweekProjections[gw.toString()] || 0;
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

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Zap className="h-8 w-8" />
            <h1>Player Assists</h1>
          </div>
          <p className="fpl-page-subtitle">
            Projected Assists for each player across all upcoming fixtures
          </p>
          <div className="fpl-page-actions">
            <Button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-50"
              data-testid="button-refresh-data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-green-600" />
                  Search
                </label>
                <Input
                  data-testid="input-player-search"
                  placeholder="Search by player or team name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-2 border-gray-200 hover:border-green-400 transition-colors"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  Position
                </label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-full border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="pos-all" value="all">All</SelectItem>
                    {positions.map((position, index) => (
                      <SelectItem key={`pos-${position}-${index}`} value={position}>{position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  Team
                </label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-full border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="team-all" value="all">All</SelectItem>
                    {teams.map((team, index) => (
                      <SelectItem key={`team-${team}-${index}`} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  From GW
                </label>
                <Select value={String(startGameweek)} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(0, maxAvailableGW - nextGameweek + 1) }, (_, i) => i + nextGameweek).map((gw, index) => (
                      <SelectItem key={`start-gw-${gw}-${index}`} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">To GW</label>
                <Select value={String(endGameweek)} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {startGameweek && Array.from({ length: Math.max(0, maxAvailableGW - startGameweek + 1) }, (_, i) => i + startGameweek).map((gw, index) => (
                      <SelectItem key={`end-gw-${gw}-${index}`} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              
              <div className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2 lg:col-span-3 xl:col-span-1 justify-center sm:justify-end">
                <TrendingUp className="h-4 w-4" />
                <span>{filteredAndSortedData.length} players</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Results */}
        {!isLoading && filteredAndSortedData.length > 0 && (
          <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    Projected Assists by Gameweek
                  </CardTitle>
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
                            <th key={`assists-header-gw${gw}`} className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">
                              <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                GW{gw} {getSortIcon(`gw${gw}`)}
                              </Button>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 bg-orange-50">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('rangeTotal')} className="h-auto p-0 font-medium text-gray-500 hover:bg-orange-100 hover:text-gray-700">
                              6 GW Assists {getSortIcon('rangeTotal')}
                            </Button>
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('rangePoints')} className="h-auto p-0 font-medium text-gray-500 hover:bg-blue-100 hover:text-gray-700">
                              6 GW Pts {getSortIcon('rangePoints')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => {
                          const assistsTotal = getFilteredTotal(player);
                          const pointsTotal = assistsTotal * 3;
                          return (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 sticky left-0 bg-white border-r border-gray-100">
                              <PlayerNameCell 
                                name={(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}
                                position={player.position}
                                team={player.teamShort}
                                compact={true}
                              />
                            </td>
                            {dynamicGameweekColumns.map((gw) => (
                              <td key={`assists-cell-${player.playerId}-gw${gw}`} className="text-center py-2 sm:py-3 px-2 text-sm">
                                {(player.gameweekProjections[gw.toString()] || 0) > 0 ? (player.gameweekProjections[gw.toString()] || 0).toFixed(2) : "-"}
                              </td>
                            ))}
                            <td className="text-center py-3 px-1 font-semibold bg-orange-50">
                              <span className="text-lg font-bold text-orange-900">
                                {assistsTotal.toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1 font-semibold bg-blue-50">
                              <span className="text-lg font-bold text-blue-900">
                                {pointsTotal.toFixed(2)}
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
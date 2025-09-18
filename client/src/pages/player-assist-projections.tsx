import { useState, useMemo, useEffect } from "react";

import { computeCurrentGameweek } from "@shared/gameweek-utils";
import { BootstrapData } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Zap, TrendingUp, Users, Calendar, Target, Search, Filter, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";

interface PlayerAssistProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  gameweekProjections: { [gameweek: number]: number };
  totalProjectedAssists: number;
  assistShare: number;
}

type SortField = 'name' | 'team' | 'position' | 'totalAssists' | 'rangeTotal' | 'assistShare' | string; // string allows dynamic gameweek fields like 'gw4', 'gw5', etc.
type SortDirection = 'asc' | 'desc';

export default function PlayerAssistProjections() {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // All useState hooks
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [startGameweek, setStartGameweek] = useState<number>(5);
  const [endGameweek, setEndGameweek] = useState<number>(10);
  const [initialized, setInitialized] = useState(false);
  const [sortField, setSortField] = useState<SortField>('rangeTotal');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // useEffect for initialization
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const currentGW = computeCurrentGameweek(bootstrapData.events);
    const nextGW = Math.min((currentGW ?? 3) + 1, 38);
    const maxAvailableGW = Math.min(38, nextGW + 11); // Next 12 gameweeks max
    
    setStartGameweek(nextGW);
    setEndGameweek(Math.min(nextGW + 5, maxAvailableGW)); // Next 6 gameweeks default
    setInitialized(true);
  }, [bootstrapData, initialized]);

  // ALL useQuery hooks - REMOVED conditional enabled to ensure consistent hook order
  const { data: cachedAssistData, isLoading: cachedLoading, error: cachedError } = useQuery<PlayerAssistProjection[]>({
    queryKey: ["/api/cached/player-assists-projections"],
    staleTime: 30 * 60 * 1000, // 30 minutes - data updated hourly
  });

  const { data: liveAssistData, isLoading: liveLoading, error: liveError } = useQuery<PlayerAssistProjection[]>({
    queryKey: ["/api/player-assist-projections", startGameweek, endGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/player-assist-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch assist projections: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for live data
    enabled: true, // Always enabled since gameweeks have safe defaults
  });

  // ALL useMemo hooks
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek + 1;
  const maxAvailableGW = Math.min(38, nextGameweek + 11); // Next 12 gameweeks max

  // Data selection logic - prefer cached data but use live data when gameweeks not available
  const playerAssistData = useMemo(() => {
    // Check if cached data contains the requested gameweek range
    if (cachedAssistData && cachedAssistData.length > 0) {
      const samplePlayer = cachedAssistData[0];
      const hasRequestedRange = startGameweek && endGameweek && 
        samplePlayer.gameweekProjections[startGameweek] !== undefined && 
        samplePlayer.gameweekProjections[endGameweek] !== undefined;
      
      if (hasRequestedRange) {
        return cachedAssistData;
      }
    }
    // Use live data when cached data doesn't contain requested range or is unavailable
    return liveAssistData;
  }, [cachedAssistData, liveAssistData, startGameweek, endGameweek]);

  // Loading state - show loading if cached is loading, or if cached data is empty/unavailable and live is loading
  const isLoading = useMemo(() => {
    // If cached is loading, show loading
    if (cachedLoading) return true;
    // If cached data is empty or unavailable, and live data is loading, show loading
    if ((!cachedAssistData || cachedAssistData.length === 0) && liveLoading) return true;
    return false;
  }, [cachedLoading, liveLoading, cachedAssistData]);

  const error = cachedError || liveError;

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
        if (gwNum >= nextGameweek && gwNum <= maxAvailableGW) { // Show next 12 gameweeks dynamically
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

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!playerAssistData) return [];
    
    let filtered = playerAssistData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
      return true;
    });

    // Calculate dynamic totals based on selected gameweek range
    const getFilteredTotal = (player: PlayerAssistProjection) => {
      let total = 0;
      for (let gw = startGameweek || 0; gw <= (endGameweek || 0); gw++) {
        total += player.gameweekProjections[gw] || 0;
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
          aValue = a.teamShort;
          bValue = b.teamShort;
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
        case 'assistShare':
          aValue = a.assistShare;
          bValue = b.assistShare;
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw4', 'gw5', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = parseInt(sortField.replace('gw', ''));
            if (!isNaN(gwNumber)) {
              aValue = a.gameweekProjections[gwNumber] || 0;
              bValue = b.gameweekProjections[gwNumber] || 0;
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
  }, [playerAssistData, selectedPosition, selectedTeam, startGameweek, endGameweek, sortField, sortDirection]);

  // Calculate dynamic totals based on selected gameweek range
  const getFilteredTotal = (player: PlayerAssistProjection) => {
    let total = 0;
    for (let gw = startGameweek || 0; gw <= (endGameweek || 0); gw++) {
      total += player.gameweekProjections[gw] || 0;
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
            Projected Assists for each player across all remaining fixtures
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">Position:</label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-32 border-2 border-gray-200 hover:border-green-400 transition-colors">
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

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">Team:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-32 border-2 border-gray-200 hover:border-green-400 transition-colors">
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

              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">From GW:</label>
                <Select value={String(startGameweek)} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-20 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(0, maxAvailableGW - nextGameweek + 1) }, (_, i) => i + nextGameweek).map((gw, index) => (
                      <SelectItem key={`start-gw-${gw}-${index}`} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="text-sm font-semibold text-gray-700">To GW:</label>
                <Select value={String(endGameweek)} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-20 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {startGameweek && Array.from({ length: Math.max(0, maxAvailableGW - startGameweek + 1) }, (_, i) => i + startGameweek).map((gw, index) => (
                      <SelectItem key={`end-gw-${gw}-${index}`} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
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
          <Tabs defaultValue="assists" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assists">Assists</TabsTrigger>
              <TabsTrigger value="points">Points from Assists</TabsTrigger>
            </TabsList>

            <TabsContent value="assists">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    Projected Assists by Gameweek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                              Player {getSortIcon('name')}
                            </Button>
                          </th>
                          {dynamicGameweekColumns.map((gw) => (
                            <th key={`assists-header-gw${gw}`} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                GW{gw} {getSortIcon(`gw${gw}`)}
                              </Button>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('rangeTotal')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                              {rangeLabel} {getSortIcon('rangeTotal')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => {
                          return (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-3 px-1">
                              <PlayerNameCell 
                                name={player.playerName}
                                position={player.position}
                                team={player.teamShort}
                                compact={true}
                              />
                            </td>
                            {dynamicGameweekColumns.map((gw) => (
                              <td key={`assists-cell-${player.playerId}-gw${gw}`} className="text-center py-3 px-1">
                                {(player.gameweekProjections[gw] || 0) > 0 ? (player.gameweekProjections[gw] || 0).toFixed(2) : "-"}
                              </td>
                            ))}
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {getFilteredTotal(player).toFixed(2)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="points">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Points from Assists (3 pts per assist)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-scroll" style={{ overflowX: 'scroll', overflowY: 'visible', width: '100%', maxWidth: '100%', height: 'auto', display: 'block', scrollbarWidth: 'auto', scrollSnapType: 'none', overscrollBehaviorX: 'contain' }} onDoubleClick={(e) => { const target = e.currentTarget as HTMLElement; target.scrollLeft = 0; }}>
                    <table className="w-full" style={{ minWidth: '1200px', tableLayout: 'auto' }}>
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                              Player {getSortIcon('name')}
                            </Button>
                          </th>
                          {dynamicGameweekColumns.map((gw) => (
                            <th key={`points-header-gw${gw}`} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                GW{gw} {getSortIcon(`gw${gw}`)}
                              </Button>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('rangeTotal')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                              {rangeLabel} {getSortIcon('rangeTotal')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => {
                          const filteredGwPoints = Math.round(getFilteredTotal(player) * 3 * 10) / 10; // 3 points per assist
                          return (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-3 px-1">
                              <PlayerNameCell 
                                name={player.playerName}
                                position={player.position}
                                team={player.teamShort}
                                compact={true}
                              />
                            </td>
                            {dynamicGameweekColumns.map((gw) => (
                              <td key={`points-cell-${player.playerId}-gw${gw}`} className="text-center py-3 px-1">
                                {((player.gameweekProjections[gw] || 0) * 3) > 0 ? ((player.gameweekProjections[gw] || 0) * 3).toFixed(1) : "-"}
                              </td>
                            ))}
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {filteredGwPoints.toFixed(1)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
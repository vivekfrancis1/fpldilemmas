import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Filter, BarChart3, Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { computeCurrentGameweek } from "@shared/gameweek-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, SortableHeader, type TableColumn } from "@/components/enhanced-table";

interface PlayerGoalProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  teamShort: string;
  position: string;
  totalProjectedGoals: number;
  gameweekProjections: { [gameweek: string]: number };
  goalShare: number;
}

export default function PlayerGoalsScoredProjections() {
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [startGameweek, setStartGameweek] = useState<number | null>(null);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const queryClient = useQueryClient();

  // FPL points from goals based on position
  const getPointsFromGoals = (goals: number, position: string): number => {
    const multiplier = position === 'Goalkeeper' || position === 'GKP' ? 10 :
                      position === 'Defender' || position === 'DEF' ? 6 : 
                      position === 'Midfielder' || position === 'MID' ? 5 : 4; // Goalkeepers: 10pts, Defenders: 6pts, Midfielders: 5pts, Forwards: 4pts
    return goals * multiplier;
  };

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
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

  // One-time initialization when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const currentGW = computeCurrentGameweek(bootstrapData.events);
    const nextGW = Math.min((currentGW ?? 3) + 1, 38);
    const maxAvailableGW = Math.min(38, nextGW + 5); // Next 6 gameweeks max
    
    setStartGameweek(nextGW);
    setEndGameweek(Math.min(nextGW + 5, maxAvailableGW)); // Next 6 gameweeks default
    setInitialized(true);
  }, [bootstrapData, initialized]);

  // Use fast cached endpoint with robust error handling
  const { data: playerGoalData, isLoading: playerGoalLoading, error } = useQuery<PlayerGoalProjection[]>({
    queryKey: ["/api/player-goals-scored-projections"],
    staleTime: 30 * 60 * 1000, // 30 minute cache
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    refetchOnMount: false,
    retry: (failureCount, error) => {
      // Don't retry on 5xx server errors to avoid cascading failures
      if (error && typeof error === 'object' && 'status' in error && 
          typeof error.status === 'number' && error.status >= 500) {
        return false;
      }
      return failureCount < 2; // Max 2 retries for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    networkMode: 'online',
    placeholderData: [], // Show empty table immediately while loading
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    throwOnError: false // Don't throw errors, handle gracefully
  });

  // Get current gameweek from bootstrap data
  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 3;
  const nextGameweek = currentGameweek + 1;
  const maxAvailableGW = Math.min(38, nextGameweek + 5); // Next 6 gameweeks max

  // Dynamic gameweek range based on user selection (default: starts from next gameweek)
  const selectedGameweeks = useMemo(() => {
    if (!startGameweek || !endGameweek) return [];
    const gameweeks = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      gameweeks.push(gw);
    }
    return gameweeks;
  }, [startGameweek, endGameweek]);

  // Filter and sort data
  const filteredProjections = useMemo(() => {
    if (!playerGoalData) return [];

    return playerGoalData
      .filter(player => {
        if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
        if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
        if (searchQuery && player.playerName && !player.playerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber.toString()] || 0;
          const bValue = b.gameweekProjections[gwNumber.toString()] || 0;
          return bValue - aValue;
        }
        
        const multiplier = sortDirection === 'desc' ? 1 : -1;
        
        switch (sortBy) {
          case "total": {
            // Sort by total goals in selected gameweeks
            const aPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw.toString()] || 0), 0);
            const bPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw.toString()] || 0), 0);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
          case "totalPoints": {
            // Sort by total points from goals in selected gameweeks
            const aGoalsTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw.toString()] || 0), 0);
            const bGoalsTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw.toString()] || 0), 0);
            const aPointsTotal = getPointsFromGoals(aGoalsTotal, a.position);
            const bPointsTotal = getPointsFromGoals(bGoalsTotal, b.position);
            return (bPointsTotal - aPointsTotal) * multiplier;
          }
          case "season": {
            return (b.totalProjectedGoals - a.totalProjectedGoals) * multiplier;
          }
          case "name": return a.playerName.localeCompare(b.playerName) * multiplier;
          case "team": return a.teamName.localeCompare(b.teamName) * multiplier;
          case "position": return a.position.localeCompare(b.position) * multiplier;
          default: {
            const aPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw.toString()] || 0), 0);
            const bPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw.toString()] || 0), 0);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
        }
      });
  }, [playerGoalData, selectedTeam, selectedPosition, searchQuery, sortBy, sortDirection, selectedGameweeks]);

  const totalGoals = useMemo(() => {
    if (!filteredProjections.length) return { 
      gameweekTotals: {}, 
      overallTotal: 0, 
      seasonTotal: 0, 
      averagePerGame: 0,
      pointsGameweekTotals: {},
      pointsOverallTotal: 0,
      pointsSeasonTotal: 0,
      pointsAveragePerGame: 0
    };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    const pointsGameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    let pointsOverallTotal = 0;
    let pointsSeasonTotal = 0;
    
    const totalWeeks = selectedGameweeks.length;
    
    // Calculate totals for selected gameweeks
    selectedGameweeks.forEach(gwNumber => {
      const gwTotal = filteredProjections.reduce((sum, player) => sum + (player.gameweekProjections[gwNumber.toString()] || 0), 0);
      const gwPointsTotal = filteredProjections.reduce((sum, player) => {
        const goals = player.gameweekProjections[gwNumber.toString()] || 0;
        return sum + getPointsFromGoals(goals, player.position);
      }, 0);
      
      gameweekTotals[gwNumber] = gwTotal;
      pointsGameweekTotals[gwNumber] = gwPointsTotal;
      overallTotal += gwTotal;
      pointsOverallTotal += gwPointsTotal;
    });
    
    // Calculate season totals
    seasonTotal = filteredProjections.reduce((sum, player) => sum + player.totalProjectedGoals, 0);
    pointsSeasonTotal = filteredProjections.reduce((sum, player) => {
      return sum + getPointsFromGoals(player.totalProjectedGoals, player.position);
    }, 0);
    
    const averagePerGame = overallTotal / totalWeeks;
    const pointsAveragePerGame = pointsOverallTotal / totalWeeks;
    
    return { 
      gameweekTotals, 
      overallTotal, 
      seasonTotal, 
      averagePerGame,
      pointsGameweekTotals,
      pointsOverallTotal,
      pointsSeasonTotal,
      pointsAveragePerGame
    };
  }, [filteredProjections, selectedGameweeks, getPointsFromGoals]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!bootstrapData) return [];
    return bootstrapData.teams.map(team => ({
      id: team.id,
      name: team.name,
      short: team.short_name
    }));
  }, [bootstrapData]);

  const positions = useMemo(() => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(type => ({
      id: type.id,
      name: type.singular_name
    }));
  }, [bootstrapData]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const handleRefreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/cached/player-goals-projections"] });
    await queryClient.refetchQueries({ queryKey: ["/api/cached/player-goals-projections"] });
  };

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.5) return 'bg-green-50 text-green-800 font-semibold';
    if (goals >= 2.0) return 'bg-blue-50 text-blue-800 font-medium';
    if (goals >= 1.5) return 'bg-yellow-50 text-yellow-800';
    if (goals >= 1.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  const getPointsColor = (points: number) => {
    if (points >= 15) return 'bg-green-50 text-green-800 font-semibold';
    if (points >= 12) return 'bg-blue-50 text-blue-800 font-medium';
    if (points >= 8) return 'bg-yellow-50 text-yellow-800';
    if (points >= 5) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  // Show loading only when actually needed
  if (!initialized || !bootstrapData || isLoading || playerGoalLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Temporarily Unavailable</h1>
            <p className="text-lg text-gray-600 mb-4">
              The FPL API is currently experiencing issues. This usually resolves within a few minutes.
            </p>
            <div className="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>What's happening:</strong> The official Fantasy Premier League API is temporarily returning 503 errors. 
                This is not an issue with our platform.
              </p>
            </div>
            <Button
              onClick={handleRefreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              data-testid="button-retry"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
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
            <Target className="h-8 w-8" />
            <h1>Player Goal Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Projected Goals for each player across all upcoming fixtures
          </p>
          <div className="mt-4">
            <Button
              onClick={handleRefreshData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border-white/30 text-white"
              data-testid="button-refresh-data"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Controls */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
              {/* Gameweek Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  From GW
                </label>
                <Select value={startGameweek?.toString() || ""} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(0, maxAvailableGW - nextGameweek + 1) }, (_, i) => i + nextGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">To GW</label>
                <Select value={endGameweek?.toString() || ""} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(0, maxAvailableGW - (startGameweek ?? nextGameweek) + 1) }, (_, i) => i + (startGameweek ?? nextGameweek)).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  Team
                </label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.short}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Position</label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {positions.map(pos => (
                      <SelectItem key={pos.id} value={pos.name}>
                        {pos.name}
                      </SelectItem>
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
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  data-testid="input-search-players"
                />
              </div>




            </div>
          </CardContent>
        </Card>


        {/* Main Content */}
        <div className="w-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Player Goal Projections: GW{startGameweek}-GW{endGameweek}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[120px] sm:min-w-[180px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent text-xs md:text-sm"
                            onClick={() => handleSort("name")}
                            data-testid="sort-player-name"
                          >
                            Player
                            {sortBy === "name" && (
                              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                            )}
                            {sortBy !== "name" && <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />}
                          </Button>
                        </th>
                    {selectedGameweeks.map(gw => (
                      <th key={gw} className="px-1 sm:px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[50px] md:min-w-[60px]">
                        <div className="flex items-center justify-center gap-1" onClick={() => handleSort(`gw${gw}`)}>
                          GW{gw}
                          {sortBy === `gw${gw}` && (
                            sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                          )}
                          {sortBy !== `gw${gw}` && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </div>
                      </th>
                    ))}
                    <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100 transition-colors min-w-[80px]">
                      <div className="flex items-center justify-center gap-1" onClick={() => handleSort("total")}>
                        {selectedGameweeks.length} GW Goals
                        {sortBy === "total" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                        )}
                        {sortBy !== "total" && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </div>
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors min-w-[100px]">
                      <div className="flex items-center justify-center gap-1" onClick={() => handleSort("totalPoints")}>
                        {selectedGameweeks.length} GW Pts
                        {sortBy === "totalPoints" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                        )}
                        {sortBy !== "totalPoints" && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjections.map((player, index) => {
                    const selectedTotal = selectedGameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw.toString()] || 0), 0);
                    const totalPoints = getPointsFromGoals(selectedTotal, player.position);
                    
                    return (
                      <tr key={player.playerId} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-4 sticky left-0 bg-white border-r border-gray-100">
                          <PlayerNameCell 
                            name={(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}
                            position={player.position}
                            team={player.teamShort}
                            compact={false}
                          />
                        </td>
                        {selectedGameweeks.map(gw => {
                          const goals = player.gameweekProjections[gw.toString()] || 0;
                          return (
                            <td key={gw} className="px-2 sm:px-4 py-2 sm:py-4 text-center text-sm font-medium text-gray-900">
                              {goals > 0 ? goals.toFixed(2) : "-"}
                            </td>
                          );
                        })}
                        <td className="px-2 sm:px-4 py-2 sm:py-4 text-center bg-orange-50">
                          <span className="text-lg font-bold text-orange-900">
                            {selectedTotal.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-4 text-center bg-blue-50">
                          <span className="text-lg font-bold text-blue-900">
                            {totalPoints.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center text-sm font-bold text-gray-700 sticky left-0 bg-gray-100 border-r border-gray-200">
                      TOTAL
                    </td>
                    {selectedGameweeks.map(gw => (
                      <td key={gw} className="px-2 sm:px-4 py-2 sm:py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                        {(totalGoals.gameweekTotals[gw] || 0) > 0 ? (totalGoals.gameweekTotals[gw] || 0).toFixed(2) : "-"}
                      </td>
                    ))}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center bg-orange-100">
                      <span className="text-lg font-bold text-orange-900">
                        {totalGoals.overallTotal.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center bg-blue-100">
                      <span className="text-lg font-bold text-blue-900">
                        {totalGoals.pointsOverallTotal.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
                    </table>
                  </div>
                </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
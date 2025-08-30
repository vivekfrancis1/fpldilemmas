import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Filter, BarChart3, Trophy, Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PlayerGoalProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  teamShort: string;
  position: string;
  totalProjectedGoals: number;
  gameweekProjections: { [gameweek: number]: number };
  goalShare: number;
}

export default function PlayerGoalsScoredProjections() {
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [startGameweek, setStartGameweek] = useState<number>(3);
  const [endGameweek, setEndGameweek] = useState<number>(8);
  
  const queryClient = useQueryClient();

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: playerGoalData, isLoading: playerGoalLoading, error } = useQuery<PlayerGoalProjection[]>({
    queryKey: ["/api/player-goals-scored-projections"],
    staleTime: 0, // Force fresh data to show updated hybrid calculations
    refetchOnMount: true,
  });

  // Dynamic gameweek range based on user selection (default: GW3-GW8)
  const selectedGameweeks = useMemo(() => {
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
        if (searchQuery && !player.playerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber] || 0;
          const bValue = b.gameweekProjections[gwNumber] || 0;
          return bValue - aValue;
        }
        
        const multiplier = sortDirection === 'desc' ? 1 : -1;
        
        switch (sortBy) {
          case "total": {
            // Calculate selected gameweeks total for sorting
            const aPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
            const bPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
          case "season": return (b.totalProjectedGoals - a.totalProjectedGoals) * multiplier;
          case "name": return a.playerName.localeCompare(b.playerName) * multiplier;
          case "team": return a.teamName.localeCompare(b.teamName) * multiplier;
          case "position": return a.position.localeCompare(b.position) * multiplier;
          default: {
            const aPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
            const bPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
        }
      });
  }, [playerGoalData, selectedTeam, selectedPosition, searchQuery, sortBy, sortDirection, selectedGameweeks]);

  const totalGoals = useMemo(() => {
    if (!filteredProjections.length) return { gameweekTotals: {}, overallTotal: 0, seasonTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    
    const totalWeeks = selectedGameweeks.length;
    
    // Calculate totals for selected gameweeks
    selectedGameweeks.forEach(gwNumber => {
      const gwTotal = filteredProjections.reduce((sum, player) => sum + (player.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    });
    
    // Calculate season total
    seasonTotal = filteredProjections.reduce((sum, player) => sum + player.totalProjectedGoals, 0);
    
    const averagePerGame = overallTotal / totalWeeks;
    
    return { gameweekTotals, overallTotal, seasonTotal, averagePerGame };
  }, [filteredProjections, selectedGameweeks]);

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
    await queryClient.invalidateQueries({ queryKey: ["/api/player-goals-scored-projections"] });
    await queryClient.refetchQueries({ queryKey: ["/api/player-goals-scored-projections"] });
  };

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.5) return 'bg-green-50 text-green-800 font-semibold';
    if (goals >= 2.0) return 'bg-blue-50 text-blue-800 font-medium';
    if (goals >= 1.5) return 'bg-yellow-50 text-yellow-800';
    if (goals >= 1.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  if (isLoading || playerGoalLoading) {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Data</h1>
            <p className="text-lg text-red-600">Unable to load player goal projections. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50/30">
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Target className="h-8 w-8 text-orange-600" />
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Player Goals Scored Projections
            </h1>
            <Button
              onClick={handleRefreshData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              data-testid="button-refresh-data"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Hybrid projections using actual goals from completed matches + projected goals for remaining fixtures
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Gameweek Range Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">From GW:</label>
                <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 36 }, (_, i) => i + 3).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">To GW:</label>
                <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 39 - startGameweek }, (_, i) => i + startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Team:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-40">
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

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Position:</label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-32">
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

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                  data-testid="input-search-players"
                />
              </div>

              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">{selectedGameweeks.length} GW Total</SelectItem>
                    <SelectItem value="season">Season Total</SelectItem>
                    <SelectItem value="name">Player Name</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                    {selectedGameweeks.map(gw => (
                      <SelectItem key={gw} value={`gw${gw}`}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{filteredProjections.length}</p>
                <p className="text-sm text-gray-600">Players</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{totalGoals.overallTotal.toFixed(2)}</p>
                <p className="text-sm text-gray-600">{selectedGameweeks.length} GW Total</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalGoals.seasonTotal.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Season Total</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{totalGoals.averagePerGame.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Avg Per GW (GW{startGameweek}-{endGameweek})</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Goals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Player Goals - Next 6 Gameweeks ({filteredProjections.length} players)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 sticky left-0 bg-white border-r border-gray-200 z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold text-gray-900 hover:text-blue-600"
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
                    <th className="text-center py-3 px-2 font-semibold text-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold text-gray-900 hover:text-blue-600"
                        onClick={() => handleSort("team")}
                        data-testid="sort-team"
                      >
                        Team
                        {sortBy === "team" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                        )}
                        {sortBy !== "team" && <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />}
                      </Button>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold text-gray-900 hover:text-blue-600"
                        onClick={() => handleSort("position")}
                        data-testid="sort-position"
                      >
                        Pos
                        {sortBy === "position" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                        )}
                        {sortBy !== "position" && <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />}
                      </Button>
                    </th>
                    {selectedGameweeks.map(gw => (
                      <th key={gw} className="text-center py-3 px-2 font-semibold text-gray-900 min-w-[70px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-semibold text-gray-900 hover:text-blue-600"
                          onClick={() => handleSort(`gw${gw}`)}
                          data-testid={`sort-gw${gw}`}
                        >
                          GW{gw}
                          {sortBy === `gw${gw}` && (
                            sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                          )}
                          {sortBy !== `gw${gw}` && <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />}
                        </Button>
                      </th>
                    ))}
                    <th className="text-center py-3 px-2 font-semibold text-gray-900 border-l border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold text-gray-900 hover:text-blue-600"
                        onClick={() => handleSort("total")}
                        data-testid="sort-total"
                      >
                        {selectedGameweeks.length} GW
                        {sortBy === "total" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                        )}
                        {sortBy !== "total" && <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />}
                      </Button>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-900">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold text-gray-900 hover:text-blue-600"
                        onClick={() => handleSort("season")}
                        data-testid="sort-season"
                      >
                        Season
                        {sortBy === "season" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                        )}
                        {sortBy !== "season" && <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />}
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjections.map((player, index) => {
                    const selectedTotal = selectedGameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw] || 0), 0);
                    
                    return (
                      <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="py-3 px-4 sticky left-0 bg-white border-r border-gray-200 z-10">
                          <div className="font-semibold text-gray-900">
                            {player.playerName}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant="outline" className="text-xs font-medium">
                            {player.teamShort}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-center text-sm text-gray-600">
                          {player.position}
                        </td>
                        {selectedGameweeks.map(gw => {
                          const goals = player.gameweekProjections[gw] || 0;
                          return (
                            <td key={gw} className="py-3 px-2 text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getGoalsColor(goals)}`}>
                                {goals.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-3 px-2 text-center border-l border-gray-200">
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                            {selectedTotal.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-sm font-medium">
                            {player.totalProjectedGoals.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-blue-50">
                    <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-blue-50 border-r border-gray-200 z-10" colSpan={3}>
                      {selectedGameweeks.length} GW TOTAL
                    </td>
                    {selectedGameweeks.map(gw => (
                      <td key={gw} className="py-3 px-2 text-center font-bold text-blue-600">
                        {(totalGoals.gameweekTotals[gw] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="py-3 px-2 text-center font-bold text-blue-600">
                      {totalGoals.overallTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-gray-600">
                      -
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-green-50">
                    <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-green-50 border-r border-gray-200 z-10" colSpan={3}>
                      SEASON TOTAL
                    </td>
                    {selectedGameweeks.map(gw => (
                      <td key={gw} className="py-3 px-2 text-center font-bold text-gray-600">
                        -
                      </td>
                    ))}
                    <td className="py-3 px-2 text-center font-bold text-gray-600">
                      -
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-green-600">
                      {totalGoals.seasonTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
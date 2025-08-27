import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, Filter, BarChart3, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: playerGoalData, isLoading: playerGoalLoading, error } = useQuery<PlayerGoalProjection[]>({
    queryKey: ["/api/player-goals-scored-projections"],
    staleTime: 10 * 60 * 1000,
  });

  // Fixed to show GW3-GW8 (next 6 gameweeks)
  const next6Gameweeks = useMemo(() => {
    return [3, 4, 5, 6, 7, 8];
  }, []);

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
        
        switch (sortBy) {
          case "total": {
            // Calculate next 6 gameweeks total for sorting
            const aPeriodTotal = next6Gameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
            const bPeriodTotal = next6Gameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
            return bPeriodTotal - aPeriodTotal;
          }
          case "season": return b.totalProjectedGoals - a.totalProjectedGoals;
          case "name": return a.playerName.localeCompare(b.playerName);
          case "team": return a.teamName.localeCompare(b.teamName);
          case "position": return a.position.localeCompare(b.position);
          default: {
            const aPeriodTotal = next6Gameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
            const bPeriodTotal = next6Gameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
            return bPeriodTotal - aPeriodTotal;
          }
        }
      });
  }, [playerGoalData, selectedTeam, selectedPosition, searchQuery, sortBy, next6Gameweeks]);

  const totalGoals = useMemo(() => {
    if (!filteredProjections.length) return { gameweekTotals: {}, overallTotal: 0, seasonTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    
    const totalWeeks = next6Gameweeks.length;
    
    // Calculate totals for next 6 gameweeks
    next6Gameweeks.forEach(gwNumber => {
      const gwTotal = filteredProjections.reduce((sum, player) => sum + (player.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    });
    
    // Calculate season total
    seasonTotal = filteredProjections.reduce((sum, player) => sum + player.totalProjectedGoals, 0);
    
    const averagePerGame = overallTotal / totalWeeks;
    
    return { gameweekTotals, overallTotal, seasonTotal, averagePerGame };
  }, [filteredProjections, next6Gameweeks]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
            Player Goals Scored Projections
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Individual player goal projections for the next 6 gameweeks based on team shares and xG analysis
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
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

              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">6 GW Total</SelectItem>
                    <SelectItem value="season">Season Total</SelectItem>
                    <SelectItem value="name">Player Name</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                    {next6Gameweeks.map(gw => (
                      <SelectItem key={gw} value={`gw${gw}`}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-gray-700">Search:</label>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                <p className="text-sm text-gray-600">6 GW Total</p>
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
                <p className="text-sm text-gray-600">Avg Per GW</p>
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
                    <th 
                      className="text-left py-3 px-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("name")}
                    >
                      Player {sortBy === "name" && "↓"}
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("team")}
                    >
                      Team {sortBy === "team" && "↓"}
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("position")}
                    >
                      Pos {sortBy === "position" && "↓"}
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("total")}
                    >
                      6 GW {sortBy === "total" && "↓"}
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("season")}
                    >
                      Season {sortBy === "season" && "↓"}
                    </th>
                    {next6Gameweeks.map(gw => (
                      <th 
                        key={gw} 
                        className="text-center py-3 px-2 font-semibold text-gray-900 min-w-[60px] cursor-pointer hover:bg-gray-50"
                        onClick={() => setSortBy(`gw${gw}`)}
                      >
                        GW{gw} {sortBy === `gw${gw}` && "↓"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProjections.map((player, index) => {
                    const next6Total = next6Gameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw] || 0), 0);
                    
                    return (
                      <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
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
                        <td className="py-3 px-2 text-center">
                          <span className="font-bold text-gray-900">
                            {next6Total.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-sm text-gray-600">
                            {player.totalProjectedGoals.toFixed(2)}
                          </span>
                        </td>
                        {next6Gameweeks.map(gw => {
                          const goals = player.gameweekProjections[gw] || 0;
                          return (
                            <td key={gw} className="py-3 px-2 text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getGoalsColor(goals)}`}>
                                {goals.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-blue-50">
                    <td className="py-3 px-4 font-bold text-gray-900" colSpan={3}>
                      6 GW TOTAL
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-blue-600">
                      {totalGoals.overallTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-gray-600">
                      -
                    </td>
                    {next6Gameweeks.map(gw => (
                      <td key={gw} className="py-3 px-2 text-center font-bold text-blue-600">
                        {(totalGoals.gameweekTotals[gw] || 0).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-200 bg-green-50">
                    <td className="py-3 px-4 font-bold text-gray-900" colSpan={3}>
                      SEASON TOTAL
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-gray-600">
                      -
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-green-600">
                      {totalGoals.seasonTotal.toFixed(2)}
                    </td>
                    {next6Gameweeks.map(gw => (
                      <td key={gw} className="py-3 px-2 text-center font-bold text-gray-600">
                        -
                      </td>
                    ))}
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
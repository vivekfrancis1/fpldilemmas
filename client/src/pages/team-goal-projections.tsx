import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Filter, BarChart3, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TeamGoalProjection {
  id: number;
  team: string;
  teamShort: string;
  teamBadge?: string;
  gameweekProjections: {
    [gameweek: number]: number;
  };
  totalProjectedGoals: number;
  averageGoalsPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamGoalProjections() {
  const [startGameweek, setStartGameweek] = useState<string>("4");
  const [endGameweek, setEndGameweek] = useState<string>("9"); 
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading, error: projectionsError } = useQuery<TeamGoalProjection[]>({
    queryKey: ["/api/team-goal-projections"],
    retry: 2,
    retryDelay: 1000,
  });

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData
      .filter(team => selectedTeam === "all" || team.teamShort === selectedTeam)
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber] || 0;
          const bValue = b.gameweekProjections[gwNumber] || 0;
          return bValue - aValue;
        }
        
        switch (sortBy) {
          case "total": {
            // Calculate period total for sorting
            const startGW = parseInt(startGameweek);
            const endGW = parseInt(endGameweek);
            const aPeriodTotal = Object.keys(a.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw) => sum + (a.gameweekProjections[parseInt(gw)] || 0), 0);
            const bPeriodTotal = Object.keys(b.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw) => sum + (b.gameweekProjections[parseInt(gw)] || 0), 0);
            return bPeriodTotal - aPeriodTotal;
          }
          case "season": return b.totalProjectedGoals - a.totalProjectedGoals;
          case "average": return b.averageGoalsPerGame - a.averageGoalsPerGame;
          case "position": return a.position - b.position;
          default: return b.totalProjectedGoals - a.totalProjectedGoals;
        }
      });
  }, [projectionsData, selectedTeam, sortBy]);

  const totalGoals = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, seasonTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const totalWeeks = endGW - startGW + 1;
    
    // Calculate totals for selected gameweek range
    for (let gwNumber = startGW; gwNumber <= endGW; gwNumber++) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    }
    
    // Calculate rest of season total (gameweek 4 onwards)
    for (let gwNumber = 4; gwNumber <= 38; gwNumber++) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      seasonTotal += gwTotal;
    }
    
    const averagePerGame = overallTotal / totalWeeks;
    
    return { gameweekTotals, overallTotal, seasonTotal, averagePerGame };
  }, [filteredProjections, bootstrapData, startGameweek, endGameweek]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.5) return 'bg-green-50 text-green-800 font-semibold';
    if (goals >= 2.0) return 'bg-blue-50 text-blue-800 font-medium';
    if (goals >= 1.5) return 'bg-yellow-50 text-yellow-800';
    if (goals >= 1.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  if (isLoading || projectionsLoading) {
    return (
      
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      
    );
  }

  // Handle API errors gracefully
  if (projectionsError) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Unable to Load Team Goal Projections</h2>
          <p className="text-gray-600 mb-4">There was an error loading the projection data. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Handle missing data
  if (!projectionsData || projectionsData.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">No Data Available</h2>
          <p className="text-gray-600">Team goal projections are currently unavailable. Please try again later.</p>
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
            <h1>Team Goal Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Goals for each team across all 38 gameweeks - actual goals for completed games, projections for upcoming games
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Start GW:</label>
                  <Select value={startGameweek} onValueChange={setStartGameweek}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 35 }, (_, i) => (
                        <SelectItem key={i + 4} value={(i + 4).toString()}>
                          {i + 4}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">End GW:</label>
                  <Select value={endGameweek} onValueChange={setEndGameweek}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 35 }, (_, i) => (
                        <SelectItem key={i + 4} value={(i + 4).toString()}>
                          {i + 4}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Team:</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {bootstrapData?.teams?.map(team => (
                        <SelectItem key={team.id} value={team.short_name}>
                          {team.short_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Period Total</SelectItem>
                      <SelectItem value="season">Rest of Season Total</SelectItem>
                      <SelectItem value="average">Goals/Game</SelectItem>
                      <SelectItem value="position">League Position</SelectItem>
                      {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                        const gwNumber = parseInt(startGameweek) + i;
                        return (
                          <SelectItem key={`gw${gwNumber}`} value={`gw${gwNumber}`}>GW{gwNumber}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Goal Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {`Team Goal Projections: GW${startGameweek}-GW${endGameweek}`}
                <Badge variant="outline" className="ml-2">
                  {filteredProjections.length} teams
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50">
                        Team
                      </th>
                      {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                        const gwNumber = parseInt(startGameweek) + i;
                        return (
                          <th 
                            key={gwNumber} 
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setSortBy(`gw${gwNumber}`)}
                          >
                            <div className="flex items-center justify-center gap-1">
                              GW{gwNumber}
                              {sortBy === `gw${gwNumber}` && <TrendingUp className="h-3 w-3" />}
                            </div>
                          </th>
                        );
                      })}
                      <th 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => setSortBy('total')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Period Total
                          {sortBy === 'total' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setSortBy('season')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Rest of Season Total
                          {sortBy === 'season' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortBy('average')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Avg/Game
                          {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjections.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-projection-row-${team.id}`}>
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-500 sticky left-0 bg-white">
                          {index + 1}
                        </td>
                        
                        <td className="px-4 py-4 sticky left-12 bg-white">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{team.team}</div>
                              <div className="text-xs text-gray-500">{team.teamShort}</div>
                            </div>
                          </div>
                        </td>
                        
                        {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, weekIndex) => {
                          const gwNumber = parseInt(startGameweek) + weekIndex;
                          const goals = team.gameweekProjections[gwNumber] || 0;
                          return (
                            <td key={weekIndex} className={`px-4 py-4 text-center text-sm font-medium ${getGoalsColor(goals)}`}>
                              {goals > 0 ? goals.toFixed(2) : "-"}
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-4 text-center bg-orange-50">
                          <span className="text-lg font-bold text-orange-900">
                            {(() => {
                              const startGW = parseInt(startGameweek);
                              const endGW = parseInt(endGameweek);
                              const periodTotal = Object.keys(team.gameweekProjections)
                                .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
                                .reduce((sum, gw) => sum + (team.gameweekProjections[parseInt(gw)] || 0), 0);
                              return periodTotal.toFixed(2);
                            })()}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center bg-blue-50">
                          <span className="text-lg font-bold text-blue-900">
                            {team.totalProjectedGoals.toFixed(2)}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {team.averageGoalsPerGame.toFixed(2)}
                        </td>
                        
                      </tr>
                    ))}
                    
                    {/* Total Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-700 sticky left-0 bg-gray-100">
                        -
                      </td>
                      
                      <td className="px-4 py-4 sticky left-12 bg-gray-100">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-bold text-gray-900">TOTAL</div>
                            <div className="text-xs text-gray-600">All Teams</div>
                          </div>
                        </div>
                      </td>
                      
                      {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, weekIndex) => {
                        const gwNumber = parseInt(startGameweek) + weekIndex;
                        const gwTotal = totalGoals.gameweekTotals[gwNumber] || 0;
                        return (
                          <td key={weekIndex} className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                            {gwTotal > 0 ? gwTotal.toFixed(2) : "-"}
                          </td>
                        );
                      })}
                      
                      <td className="px-4 py-4 text-center bg-orange-100">
                        <span className="text-lg font-bold text-orange-900">
                          {totalGoals.overallTotal.toFixed(2)}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 text-center bg-blue-100">
                        <span className="text-lg font-bold text-blue-900">
                          {totalGoals.seasonTotal.toFixed(2)}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                        {totalGoals.averagePerGame.toFixed(2)}
                      </td>
                      
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>



          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Team Goal Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Team attacking performance data</li>
                    <li>• Historical goal-scoring patterns</li>
                    <li>• Current form and statistics</li>
                    <li>• Fixture context factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Projected goals per gameweek</li>
                    <li>• Season-long goal estimates</li>
                    <li>• Comparative team analysis</li>
                    <li>• Updated regularly throughout season</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
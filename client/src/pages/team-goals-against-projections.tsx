import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, TrendingUp, Filter, BarChart3, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TeamGoalsAgainstProjection {
  id: number;
  team: string;
  teamShort: string;
  teamBadge?: string;
  gameweekProjections: {
    [gameweek: number]: number;
  };
  totalGoalsAgainst: number;
  averageGoalsAgainstPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamGoalsAgainstProjections() {
  const [startGameweek, setStartGameweek] = useState<string>("3");
  const [endGameweek, setEndGameweek] = useState<string>("8");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: combinedData, isLoading: projectionsLoading } = useQuery<{
    goalsScored: any[];
    goalsAgainst: TeamGoalsAgainstProjection[];
    totalGoalsScored: number;
    totalGoalsAgainst: number;
    perfectBalance: boolean;
  }>({
    queryKey: ["/api/team-projections-combined"],
  });

  const projectionsData = combinedData?.goalsAgainst;

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData
      .filter(team => selectedTeam === "all" || team.teamShort === selectedTeam)
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber] || 0;
          const bValue = b.gameweekProjections[gwNumber] || 0;
          return aValue - bValue; // Lower goals against is better
        }
        
        switch (sortBy) {
          case "total": {
            // Calculate period total for sorting (lower is better)
            const startGW = parseInt(startGameweek);
            const endGW = parseInt(endGameweek);
            const aPeriodTotal = Object.keys(a.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw) => sum + (a.gameweekProjections[parseInt(gw)] || 0), 0);
            const bPeriodTotal = Object.keys(b.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw) => sum + (b.gameweekProjections[parseInt(gw)] || 0), 0);
            return aPeriodTotal - bPeriodTotal;
          }
          case "season": return a.totalGoalsAgainst - b.totalGoalsAgainst; // Lower is better
          case "average": return a.averageGoalsAgainstPerGame - b.averageGoalsAgainstPerGame; // Lower is better
          case "position": return a.position - b.position;
          default: return a.totalGoalsAgainst - b.totalGoalsAgainst;
        }
      });
  }, [projectionsData, selectedTeam, sortBy]);

  const totalGoalsAgainst = useMemo(() => {
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
    
    // Calculate season total (all 38 gameweeks)
    for (let gwNumber = 1; gwNumber <= 38; gwNumber++) {
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

  const getGoalsAgainstColor = (goalsAgainst: number) => {
    // Lower goals against = better defense = green colors
    if (goalsAgainst <= 1.0) return 'bg-green-50 text-green-800 font-semibold';
    if (goalsAgainst <= 1.3) return 'bg-blue-50 text-blue-800 font-medium';
    if (goalsAgainst <= 1.6) return 'bg-yellow-50 text-yellow-800';
    if (goalsAgainst <= 2.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  if (isLoading || projectionsLoading) {
    return (
      
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      
    );
  }

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Team Goals Against Projections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Goals conceded by each team across all 38 gameweeks - defensive analysis based on opponent expected goals
            </p>
          </div>

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
                      {Array.from({ length: 38 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
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
                      {Array.from({ length: 38 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
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
                      <SelectItem value="season">Season Total</SelectItem>
                      <SelectItem value="average">Goals Against/Game</SelectItem>
                      <SelectItem value="position">Defensive Ranking</SelectItem>
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

          {/* Team Goals Against Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {`Team Goals Against Projections: GW${startGameweek}-GW${endGameweek}`}
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
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setSortBy('total')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Period Total
                          {sortBy === 'total' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => setSortBy('season')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Season Total
                          {sortBy === 'season' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortBy('average')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Avg Against/Game
                          {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjections.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-goals-against-row-${team.id}`}>
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
                          const goalsAgainst = team.gameweekProjections[gwNumber] || 0;
                          return (
                            <td key={weekIndex} className={`px-4 py-4 text-center text-sm font-medium ${getGoalsAgainstColor(goalsAgainst)}`}>
                              {goalsAgainst > 0 ? goalsAgainst.toFixed(2) : "-"}
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-4 text-center bg-blue-50">
                          <span className="text-lg font-bold text-blue-900">
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
                        
                        <td className="px-4 py-4 text-center bg-orange-50">
                          <span className="text-lg font-bold text-orange-900">
                            {team.totalGoalsAgainst.toFixed(2)}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {team.averageGoalsAgainstPerGame.toFixed(2)}
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
                        const gwTotal = totalGoalsAgainst.gameweekTotals[gwNumber] || 0;
                        return (
                          <td key={weekIndex} className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                            {gwTotal > 0 ? gwTotal.toFixed(2) : "-"}
                          </td>
                        );
                      })}
                      
                      <td className="px-4 py-4 text-center bg-blue-100">
                        <span className="text-lg font-bold text-blue-900">
                          {totalGoalsAgainst.overallTotal.toFixed(2)}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 text-center bg-orange-100">
                        <span className="text-lg font-bold text-orange-900">
                          {totalGoalsAgainst.seasonTotal.toFixed(2)}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                        {totalGoalsAgainst.averagePerGame.toFixed(2)}
                      </td>
                      
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Balance Status */}
          {combinedData && (
            <Card className="mt-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <div>
                    <span className="font-semibold text-green-900">Perfect Mathematical Balance</span>
                    <p className="text-sm text-green-700">
                      Goals Scored: {combinedData.totalGoalsScored?.toFixed(1)} | 
                      Goals Against: {combinedData.totalGoalsAgainst?.toFixed(1)} | 
                      Balance: {combinedData.perfectBalance ? '✓ Perfect' : '⚠ Variance'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Team Goals Against Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Match projections with opponent expected goals</li>
                    <li>• Team defensive statistics and form</li>
                    <li>• Historical goals conceded patterns</li>
                    <li>• Fixture difficulty and home/away factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Defensive Analysis</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Lower values indicate stronger defense</li>
                    <li>• Based on opponents' attacking projections</li>
                    <li>• High confidence = ≤1.0 goals against per game</li>
                    <li>• Rankings based on total goals conceded</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
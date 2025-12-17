import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Filter, BarChart3, Trophy, Loader2, X } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { getDefaultGameweekRange, getNextGameweeksForDropdown, debugGameweekCalculation } from "@shared/gameweek-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Calculate dynamic gameweek defaults based on bootstrap data
  const defaultGameweekRange = useMemo(() => {
    if (!bootstrapData?.events) {
      return { startGameweek: "1", endGameweek: "6" }; // Fallback
    }
    debugGameweekCalculation(bootstrapData.events);
    return getDefaultGameweekRange(bootstrapData.events, 6);
  }, [bootstrapData?.events]);

  const [startGameweek, setStartGameweek] = useState<string>(defaultGameweekRange.startGameweek);
  const [endGameweek, setEndGameweek] = useState<string>(defaultGameweekRange.endGameweek); 
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");

  // Get active gameweeks (range minus excluded)
  const activeGameweeks = useMemo(() => {
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const gameweeks: number[] = [];
    for (let gw = startGW; gw <= endGW; gw++) {
      if (!excludedGameweeks.has(gw)) {
        gameweeks.push(gw);
      }
    }
    return gameweeks;
  }, [startGameweek, endGameweek, excludedGameweeks]);

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

  // Get available gameweeks for dropdown options (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return Array.from({ length: 12 }, (_, i) => i + 1); // Fallback
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12);
  }, [bootstrapData?.events]);

  // Update state when bootstrap data changes (e.g., on page load)
  useEffect(() => {
    if (bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, 6);
      setStartGameweek(newRange.startGameweek);
      setEndGameweek(newRange.endGameweek);
    }
  }, [bootstrapData?.events]);

  // Fetch fixtures for opponent information
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // State for showing opponent info
  const [showOpponent, setShowOpponent] = useState(true);

  // Create a mapping of teamShort + gameweek -> opponent info
  const opponentMap = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Map();
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        // Home team's opponent is away team
        map.set(`${homeTeam.short_name}-${fixture.event}`, {
          opponent: awayTeam.short_name,
          opponentId: fixture.team_a,
          isHome: true
        });
        // Away team's opponent is home team
        map.set(`${awayTeam.short_name}-${fixture.event}`, {
          opponent: homeTeam.short_name,
          opponentId: fixture.team_h,
          isHome: false
        });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  // Use cached endpoint for faster loading
  const { data: projectionsData, isLoading: projectionsLoading, error: projectionsError, refetch: refetchProjections } = useQuery<TeamGoalProjection[]>({
    queryKey: ["/api/cached/team-goal-projections"],
    staleTime: 60 * 60 * 1000, // 1 hour cache
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
            // Calculate period total for sorting (using active gameweeks only)
            const aPeriodTotal = activeGameweeks
              .reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
            const bPeriodTotal = activeGameweeks
              .reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
            return bPeriodTotal - aPeriodTotal;
          }
          case "season": return b.totalProjectedGoals - a.totalProjectedGoals;
          case "average": return b.averageGoalsPerGame - a.averageGoalsPerGame;
          case "position": return a.position - b.position;
          default: return b.totalProjectedGoals - a.totalProjectedGoals;
        }
      });
  }, [projectionsData, selectedTeam, sortBy, activeGameweeks]);


  const totalGoals = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, seasonTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    
    const totalWeeks = activeGameweeks.length;
    
    // Calculate totals for active gameweeks only (excluding excluded ones)
    for (const gwNumber of activeGameweeks) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    }
    
    // Calculate rest of season total (gameweek 4 onwards)
    for (let gwNumber = 4; gwNumber <= 38; gwNumber++) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      seasonTotal += gwTotal;
    }
    
    const averagePerGame = totalWeeks > 0 ? overallTotal / totalWeeks : 0;
    
    return { gameweekTotals, overallTotal, seasonTotal, averagePerGame };
  }, [filteredProjections, bootstrapData, activeGameweeks]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Team Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating team goal projections across the next 12 gameweeks...
            </p>
          </CardContent>
        </Card>
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
            Goals for each team across all upcoming gameweeks
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
                      {availableGameweeks.map(gameweek => (
                        <SelectItem key={gameweek} value={gameweek.toString()}>
                          {gameweek}
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
                      {availableGameweeks.map(gameweek => (
                        <SelectItem key={gameweek} value={gameweek.toString()}>
                          {gameweek}
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

              </div>

              {/* Gameweek Toggle Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Toggle Gameweeks (click to exclude/include):
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {excludedGameweeks.size > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearExclusions}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                        data-testid="button-clear-exclusions"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear exclusions
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOpponent(!showOpponent)}
                      className={`text-xs sm:text-sm px-2 sm:px-3 py-1 ${showOpponent ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'}`}
                      data-testid="button-toggle-opponent"
                    >
                      {showOpponent ? "Hide Opponent" : "Show Opponent"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                    const gwNumber = parseInt(startGameweek) + i;
                    const isExcluded = excludedGameweeks.has(gwNumber);
                    return (
                      <Button
                        key={gwNumber}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleGameweekExclusion(gwNumber)}
                        className={`min-w-[50px] sm:min-w-[60px] text-xs sm:text-sm px-2 sm:px-3 py-1 ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'}`}
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

          {/* Team Goal Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {`Team Goal Projections: GW${startGameweek}-GW${endGameweek}`}
                {excludedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {excludedGameweeks.size} excluded
                  </Badge>
                )}
                <Badge variant="outline" className="ml-2">
                  {filteredProjections.length} teams
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr key="header-row">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50">
                        Team
                      </th>
                      {activeGameweeks.map(gwNumber => (
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
                      ))}
                      <th 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => setSortBy('total')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Period Total
                          {sortBy === 'total' && <TrendingUp className="h-3 w-3" />}
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
                        
                        {activeGameweeks.map(gwNumber => {
                          const goals = team.gameweekProjections[gwNumber];
                          const opponentInfo = opponentMap.get(`${team.teamShort}-${gwNumber}`);
                          return (
                            <td key={`${team.id}-gw${gwNumber}`} className={`px-4 py-4 text-center text-sm font-medium ${getGoalsColor(goals || 0)}`}>
                              <div className="flex flex-col items-center">
                                <span>{goals !== undefined ? goals.toFixed(2) : "-"}</span>
                                {showOpponent && opponentInfo && (
                                  <span className="text-xs text-gray-500 mt-0.5">
                                    {opponentInfo.opponent} ({opponentInfo.isHome ? 'H' : 'A'})
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-4 text-center bg-orange-50">
                          <span className="text-lg font-bold text-orange-900">
                            {activeGameweeks.reduce((sum, gw) => sum + (team.gameweekProjections[gw] || 0), 0).toFixed(2)}
                          </span>
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
                      
                      {activeGameweeks.map(gwNumber => {
                        const gwTotal = totalGoals.gameweekTotals[gwNumber] || 0;
                        return (
                          <td key={`total-gw${gwNumber}`} className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                            {gwTotal.toFixed(2)}
                          </td>
                        );
                      })}
                      
                      <td className="px-4 py-4 text-center bg-orange-100">
                        <span className="text-lg font-bold text-orange-900">
                          {totalGoals.overallTotal.toFixed(2)}
                        </span>
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
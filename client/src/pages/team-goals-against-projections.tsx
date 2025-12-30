import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, TrendingUp, Filter, BarChart3, Trophy, Loader2, X } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { getDefaultGameweekRange, getNextGameweeksForDropdown, debugGameweekCalculation } from "@shared/gameweek-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TeamGoalsAgainstProjection {
  id: number;
  team: string;
  teamShort: string;
  teamBadge?: string;
  gameweekProjections: {
    [gameweek: number]: number;
  };
  totalProjectedGoalsAgainst: number;
  averageGoalsAgainstPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamGoalsAgainstProjections() {
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Fetch fixtures for opponent information
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Calculate dynamic gameweek defaults based on bootstrap data (next 6 gameweeks only)
  const defaultGameweekRange = useMemo(() => {
    if (!bootstrapData?.events) {
      return { startGameweek: "6", endGameweek: "11" }; // Fallback
    }
    debugGameweekCalculation(bootstrapData.events);
    return getDefaultGameweekRange(bootstrapData.events, 6);
  }, [bootstrapData?.events]);

  const [startGameweek, setStartGameweek] = useState<string>(defaultGameweekRange.startGameweek);
  const [endGameweek, setEndGameweek] = useState<string>(defaultGameweekRange.endGameweek);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");
  const [showOpponent, setShowOpponent] = useState<boolean>(false);

  // Create mapping from team name to FPL short_name
  const teamNameToShort = useMemo(() => {
    if (!bootstrapData?.teams) return new Map<string, string>();
    const map = new Map<string, string>();
    bootstrapData.teams.forEach((team: any) => {
      map.set(team.name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

  // Create a mapping of FPL short_name + gameweek -> opponent info
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

  // Active gameweeks (excluding excluded ones)
  const activeGameweeks = useMemo(() => {
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const allGameweeks = [];
    for (let gw = startGW; gw <= endGW; gw++) {
      if (!excludedGameweeks.has(gw)) {
        allGameweeks.push(gw);
      }
    }
    return allGameweeks;
  }, [startGameweek, endGameweek, excludedGameweeks]);

  // Get available gameweeks for dropdown options (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return Array.from({ length: 12 }, (_, i) => i + 6); // Fallback
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

  const { data: projectionsData, isLoading: projectionsLoading, error: projectionsError } = useQuery<TeamGoalsAgainstProjection[]>({
    queryKey: ["/api/team-goals-against-projections"],
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
          return aValue - bValue; // Lower goals against is better
        }
        
        switch (sortBy) {
          case "total": {
            // Calculate period total for sorting using active gameweeks only (lower is better)
            const aPeriodTotal = activeGameweeks
              .reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
            const bPeriodTotal = activeGameweeks
              .reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
            return aPeriodTotal - bPeriodTotal;
          }
          case "season": return a.totalProjectedGoalsAgainst - b.totalProjectedGoalsAgainst; // Lower is better
          case "average": return a.averageGoalsAgainstPerGame - b.averageGoalsAgainstPerGame; // Lower is better
          case "position": return a.position - b.position;
          default: return a.totalProjectedGoalsAgainst - b.totalProjectedGoalsAgainst;
        }
      });
  }, [projectionsData, selectedTeam, sortBy, activeGameweeks]);

  const totalGoalsAgainst = useMemo(() => {
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
    
    // Calculate season total (all 38 gameweeks)
    for (let gwNumber = 1; gwNumber <= 38; gwNumber++) {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Goals Against
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating team goals conceded projections across the next 12 gameweeks...
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
          <h2 className="text-xl font-semibold text-red-600 mb-4">Unable to Load Team Goals Conceded Projections</h2>
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
          <p className="text-gray-600">Team goals against projections are currently unavailable. Please try again later.</p>
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
            <Shield className="h-8 w-8" />
            <h1>Team Goals Conceded Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Goals conceded by each team across all upcoming gameweeks
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
                      {availableGameweeks.map((gw) => (
                        <SelectItem key={gw} value={gw.toString()}>
                          {gw}
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
                      {availableGameweeks.map((gw) => (
                        <SelectItem key={gw} value={gw.toString()}>
                          {gw}
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
                    Toggle Gameweeks:
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
                        Clear
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOpponent(!showOpponent)}
                      className={`text-xs sm:text-sm px-2 sm:px-3 py-1 ${showOpponent 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'}`}
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
                        className={`min-w-[50px] sm:min-w-[60px] text-xs sm:text-sm px-2 sm:px-3 py-1 ${isExcluded 
                          ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' 
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'}`}
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

          {/* Team Goals Conceded Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {`Team Goals Conceded Projections: GW${startGameweek}-GW${endGameweek}`}
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
                    <tr>
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
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
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
                        
                        {activeGameweeks.map(gwNumber => {
                          const goalsAgainst = team.gameweekProjections[gwNumber] || 0;
                          // Use team name to get correct FPL short_name for opponent lookup
                          const fplShortName = teamNameToShort.get(team.team) || team.teamShort;
                          const opponentInfo = opponentMap.get(`${fplShortName}-${gwNumber}`);
                          return (
                            <td key={gwNumber} className={`px-4 py-4 text-center text-sm font-medium ${getGoalsAgainstColor(goalsAgainst)}`}>
                              <div className="flex flex-col items-center">
                                <span>{goalsAgainst > 0 ? (goalsAgainst || 0).toFixed(2) : "-"}</span>
                                {showOpponent && opponentInfo && (
                                  <span className="text-xs text-gray-500 mt-0.5">
                                    {opponentInfo.opponent} ({opponentInfo.isHome ? 'H' : 'A'})
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-4 text-center bg-blue-50">
                          <span className="text-lg font-bold text-blue-900">
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
                        const gwTotal = totalGoalsAgainst.gameweekTotals[gwNumber] || 0;
                        return (
                          <td key={gwNumber} className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                            {gwTotal > 0 ? (gwTotal || 0).toFixed(2) : "-"}
                          </td>
                        );
                      })}
                      
                      <td className="px-4 py-4 text-center bg-blue-100">
                        <span className="text-lg font-bold text-blue-900">
                          {(totalGoalsAgainst.overallTotal || 0).toFixed(2)}
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
              <CardTitle className="text-lg">About Team Goals Conceded Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Team defensive performance data</li>
                    <li>• Historical goals conceded patterns</li>
                    <li>• Opposition attacking strength</li>
                    <li>• Fixture context factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Projected goals conceded per gameweek</li>
                    <li>• Lower values indicate stronger defense</li>
                    <li>• Comparative defensive rankings</li>
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
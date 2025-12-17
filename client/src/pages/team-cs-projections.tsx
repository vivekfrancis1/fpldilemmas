import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, TrendingUp, Filter, BarChart3, Trophy, Loader2, X } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { getDefaultGameweekRange, getNextGameweeksForDropdown, debugGameweekCalculation } from "@shared/gameweek-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TeamCSProjection {
  id: number;
  team: string;
  teamShort: string;
  gameweekProjections: {
    [gameweek: number]: number; // Clean sheet probability as percentage
  };
  totalCSProbability: number;
  averageCSProbability: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamCSProjections() {
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
  const [sortBy, setSortBy] = useState<string>("average");

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

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamCSProjection[]>({
    queryKey: ["/api/team-cs-projections"],
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
          case "average": {
            // Calculate period average for sorting using active gameweeks only
            const aPeriodAvg = activeGameweeks.length > 0
              ? activeGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0) / activeGameweeks.length
              : 0;
            const bPeriodAvg = activeGameweeks.length > 0
              ? activeGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0) / activeGameweeks.length
              : 0;
            return bPeriodAvg - aPeriodAvg;
          }
          case "season": return b.averageCSProbability - a.averageCSProbability;
          case "position": return a.position - b.position;
          default: return b.averageCSProbability - a.averageCSProbability;
        }
      });
  }, [projectionsData, selectedTeam, sortBy, activeGameweeks]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCSColor = (percentage: number) => {
    if (percentage >= 45) return 'bg-green-50 text-green-800 font-semibold';
    if (percentage >= 35) return 'bg-blue-50 text-blue-800 font-medium';
    if (percentage >= 25) return 'bg-yellow-50 text-yellow-800';
    if (percentage >= 15) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };


  if (isLoading || projectionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Clean Sheet Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating team clean sheet probabilities across the next 12 gameweeks...
            </p>
          </CardContent>
        </Card>
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
            <h1>Team Clean Sheet Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Clean sheet probabilities for each team across all upcoming gameweeks
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
                  {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                    const gwNumber = parseInt(startGameweek) + i;
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

          {/* Team CS Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {`Team Clean Sheet Projections: GW${startGameweek}-GW${endGameweek}`}
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
                        onClick={() => setSortBy('average')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Avg
                          {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjections.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-cs-projection-row-${team.id}`}>
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
                          const csPercentage = team.gameweekProjections[gwNumber] || 0;
                          return (
                            <td key={`${team.id}-gw${gwNumber}`} className={`px-4 py-4 text-center text-sm font-medium ${getCSColor(csPercentage)}`}>
                              {csPercentage > 0 ? `${csPercentage}%` : "-"}
                            </td>
                          );
                        })}
                        

                        
                        <td className="px-4 py-4 text-center bg-blue-50">
                          <span className="text-lg font-bold text-blue-900">
                            {(() => {
                              const periodValues = activeGameweeks.map(gw => team.gameweekProjections[gw] || 0);
                              const periodAvg = periodValues.length > 0 ? periodValues.reduce((sum, val) => sum + val, 0) / periodValues.length : 0;
                              return `${periodAvg.toFixed(1)}%`;
                            })()}
                          </span>
                        </td>
                        
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Clean Sheet Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Team defensive performance data</li>
                    <li>• Historical clean sheet patterns</li>
                    <li>• Opposition attacking strength</li>
                    <li>• Fixture context factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Clean sheet probability percentages</li>
                    <li>• Gameweek-by-gameweek analysis</li>
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
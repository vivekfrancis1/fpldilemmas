import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, TrendingUp, Filter, BarChart3, Trophy, Loader2, X, ChevronDown, ChevronUp, Users } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { getDefaultGameweekRange, getNextGameweeksForDropdown, debugGameweekCalculation } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  cleanSheetOdds: number;
}

interface TeamCSProjection {
  id: number;
  team: string;
  teamShort: string;
  gameweekProjections: {
    [gameweek: string]: number; // Clean sheet probability as percentage (summed for DGW)
  };
  fixtureDetails?: {
    [gameweek: string]: FixtureDetail[]; // Individual fixtures per gameweek (string keys from API)
  };
  totalCSProbability: number;
  averageCSProbability: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamCSProjections() {
  const { defaultWeeks } = useProjectionSettings();
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Calculate dynamic gameweek defaults based on bootstrap data
  const defaultGameweekRange = useMemo(() => {
    if (!bootstrapData?.events) {
      return { startGameweek: "1", endGameweek: "6" }; // Fallback
    }
    debugGameweekCalculation(bootstrapData.events);
    return getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
  }, [bootstrapData?.events]);

  const [startGameweek, setStartGameweek] = useState<string>(defaultGameweekRange.startGameweek);
  const [endGameweek, setEndGameweek] = useState<string>(defaultGameweekRange.endGameweek);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("average");
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

  const toggleTeamSelection = (shortName: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(shortName)) next.delete(shortName);
      else next.add(shortName);
      return next;
    });
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
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setStartGameweek(newRange.startGameweek);
      setEndGameweek(newRange.endGameweek);
    }
  }, [bootstrapData?.events]);

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamCSProjection[]>({
    queryKey: ["/api/team-cs-projections"],
  });

  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  const [showOpponent, setShowOpponent] = useState(false);

  // Create mapping from team name to FPL short_name
  const teamNameToShort = useMemo(() => {
    if (!bootstrapData?.teams) return new Map<string, string>();
    const map = new Map<string, string>();
    bootstrapData.teams.forEach((team: any) => {
      map.set(team.name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

  const opponentMap = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Map();
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        map.set(`${homeTeam.short_name}-${fixture.event}`, {
          opponent: awayTeam.short_name,
          opponentId: fixture.team_a,
          isHome: true
        });
        map.set(`${awayTeam.short_name}-${fixture.event}`, {
          opponent: homeTeam.short_name,
          opponentId: fixture.team_h,
          isHome: false
        });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData
      .filter(team => selectedTeams.size === 0 || selectedTeams.has(team.teamShort))
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
  }, [projectionsData, selectedTeams, sortBy, activeGameweeks]);

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
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <Card className="mb-6">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Filters & Options</span>
                    </div>
                    {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-6">
                  <div className="flex flex-wrap gap-4 items-end">

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">Start GW:</label>
                      <Select value={startGameweek} onValueChange={setStartGameweek}>
                        <SelectTrigger className="h-8 text-xs w-20">
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
                      <label className="text-xs font-medium text-gray-600">End GW:</label>
                      <Select value={endGameweek} onValueChange={setEndGameweek}>
                        <SelectTrigger className="h-8 text-xs w-20">
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
                  </div>

                  <Tabs defaultValue="gws" className="w-full mt-3">
                    <TabsList className="w-full grid grid-cols-2 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                      <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                        <span className="hidden sm:inline">Gameweeks</span><span className="sm:hidden">GWs</span>{excludedGameweeks.size > 0 && ` (${excludedGameweeks.size})`}
                      </TabsTrigger>
                      <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                        Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                      </TabsTrigger>
                    </TabsList>

                    {/* GWs tab */}
                    <TabsContent value="gws" className="mt-0">
                      <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                        {excludedGameweeks.size > 0 && (
                          <button onClick={clearExclusions} className="inline-flex items-center gap-0.5 rounded text-[11px] font-medium px-1.5 py-px leading-none cursor-pointer text-gray-500 hover:text-gray-700">
                            <X className="h-2.5 w-2.5" />Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => parseInt(startGameweek) + i).map(gw => {
                          const isExcluded = excludedGameweeks.has(gw);
                          return (
                            <button key={gw} onClick={() => toggleGameweekExclusion(gw)}
                              className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isExcluded ? 'bg-gray-100 text-gray-400 line-through border-gray-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
                              GW{gw}
                            </button>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Teams tab */}
                    <TabsContent value="teams" className="mt-0">
                      <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                        {selectedTeams.size > 0 && (
                          <button onClick={() => setSelectedTeams(new Set())} className="inline-flex items-center gap-0.5 rounded text-[11px] font-medium px-1.5 py-px leading-none cursor-pointer text-gray-500 hover:text-gray-700">
                            <X className="h-2.5 w-2.5" />Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        <button onClick={() => setSelectedTeams(new Set())}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedTeams.size === 0 ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          All
                        </button>
                        {bootstrapData?.teams?.sort((a, b) => a.short_name.localeCompare(b.short_name)).map(team => (
                          <button key={team.id}
                            onClick={() => toggleTeamSelection(team.short_name)}
                            className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedTeams.has(team.short_name) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                            {team.short_name}
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

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
                      <th className="px-1 md:px-3 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                        Team
                      </th>
                      {activeGameweeks.map(gwNumber => (
                        <th 
                          key={gwNumber} 
                          className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[40px] md:min-w-[50px]"
                          onClick={() => setSortBy(`gw${gwNumber}`)}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="md:hidden">{gwNumber}</span>
                            <span className="hidden md:inline">GW{gwNumber}</span>
                            {sortBy === `gw${gwNumber}` && <TrendingUp className="h-3 w-3" />}
                          </div>
                        </th>
                      ))}

                      <th 
                        className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors min-w-[50px] md:min-w-[70px]"
                        onClick={() => setSortBy('average')}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          Avg
                          {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjections.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-cs-projection-row-${team.id}`}>
                        <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                            {(() => {
                              const teamData = bootstrapData?.teams?.find((t: any) => t.short_name === team.teamShort || t.name === team.team);
                              const teamCode = teamData?.code;
                              return teamCode ? (
                                <img 
                                  src={teamCode === 14 
                                    ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                    : `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`}
                                  alt={`${team.team} badge`}
                                  className="w-5 h-5 object-contain"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : null;
                            })()}
                            <span className="text-xs md:text-sm font-medium text-gray-900">{team.teamShort}</span>
                          </div>
                        </td>
                        
                        {activeGameweeks.map(gwNumber => {
                          // Use string key to match API response format
                          const fixtures = team.fixtureDetails?.[gwNumber.toString()] || [];
                          const hasFixtures = fixtures.length > 0;
                          const isDGW = fixtures.length > 1;
                          const totalCS = hasFixtures ? fixtures.reduce((sum, f) => sum + f.cleanSheetOdds, 0) : 0;
                          const avgCS = hasFixtures ? totalCS / fixtures.length : 0;
                          
                          return (
                            <td key={`${team.id}-gw${gwNumber}`} className={`px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium min-w-[40px] md:min-w-[50px] ${getCSColor(avgCS)}`}>
                              {!hasFixtures ? (
                                <span className="text-gray-400">-</span>
                              ) : isDGW ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                      <div className="flex flex-col items-center">
                                        <span className="md:hidden">{Math.round(totalCS)}%</span>
                                        <span className="hidden md:inline">{totalCS.toFixed(1)}%</span>
                                        {showOpponent && (
                                          <span className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                                            {fixtures.map(f => `${f.opponent}(${f.isHome ? 'H' : 'A'})`).join(', ')}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                    <div className="space-y-2">
                                      <div className="font-semibold text-gray-900 border-b pb-2">
                                        GW{gwNumber} DGW Breakdown
                                      </div>
                                      {fixtures.map((f, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                          <span className="text-gray-600">vs {f.opponent} ({f.isHome ? 'H' : 'A'})</span>
                                          <span className="font-medium text-blue-700">{f.cleanSheetOdds.toFixed(1)}%</span>
                                        </div>
                                      ))}
                                      <div className="border-t pt-2 flex justify-between items-center text-sm font-semibold">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-blue-800">{totalCS.toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <div>
                                  <span className="md:hidden">{Math.round(fixtures[0].cleanSheetOdds)}%</span>
                                  <span className="hidden md:inline">{fixtures[0].cleanSheetOdds}%</span>
                                  {showOpponent && (
                                    <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 hidden md:block">
                                      {fixtures[0].opponent} ({fixtures[0].isHome ? 'H' : 'A'})
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        
                        <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-50 min-w-[50px] md:min-w-[70px]">
                          {(() => {
                            // Calculate average CS% per fixture across all active gameweeks (use string keys)
                            const allFixtures = activeGameweeks.flatMap(gw => team.fixtureDetails?.[gw.toString()] || []);
                            const periodAvg = allFixtures.length > 0 
                              ? allFixtures.reduce((sum, f) => sum + f.cleanSheetOdds, 0) / allFixtures.length 
                              : 0;
                            return (
                              <>
                                <span className="text-sm font-bold text-blue-900 md:hidden">{Math.round(periodAvg)}%</span>
                                <span className="hidden md:inline text-lg font-bold text-blue-900">{periodAvg.toFixed(1)}%</span>
                              </>
                            );
                          })()}
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
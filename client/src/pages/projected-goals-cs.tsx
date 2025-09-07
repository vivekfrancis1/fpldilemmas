import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Filter, Calendar, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface MatchProjection {
  id: number;
  gameweek: number;
  kickoffTime: string;
  finished: boolean;
  matchResult: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    expectedGoals: number;
    cleanSheetOdds: number;
    result: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    expectedGoals: number;
    cleanSheetOdds: number;
    result: string;
  };
  totalExpectedGoals: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export default function ProjectedGoalsCS() {
  const [startGameweek, setStartGameweek] = useState<string>("4");
  const [endGameweek, setEndGameweek] = useState<string>("4");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<MatchProjection[]>({
    queryKey: ["/api/projected-goals-cs"],
  });

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    
    return projectionsData
      .filter(match => 
        (match.gameweek >= startGW && match.gameweek <= endGW) &&
        (selectedTeam === "all" || 
        match.homeTeam.shortName === selectedTeam || 
        match.awayTeam.shortName === selectedTeam)
      )
      .sort((a, b) => {
        // Sort by gameweek, then by kickoff time
        if (a.gameweek !== b.gameweek) {
          return a.gameweek - b.gameweek;
        }
        return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
      });
  }, [projectionsData, startGameweek, endGameweek, selectedTeam]);

  // Group by gameweek for display
  const groupedProjections = useMemo(() => {
    const groups: { [key: string]: MatchProjection[] } = {};
    
    filteredProjections.forEach(match => {
      const key = `GW${match.gameweek}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(match);
    });
    
    return groups;
  }, [filteredProjections]);

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.5) return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
    if (goals >= 2.0) return 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border border-indigo-300';
    if (goals >= 1.5) return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
    if (goals >= 1.0) return 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300';
    return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300';
  };

  const getCSColor = (percentage: number) => {
    if (percentage >= 50) return 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300';
    if (percentage >= 40) return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300';
    if (percentage >= 30) return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
    if (percentage >= 20) return 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300';
    return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300';
  };

  const getResultColor = (result: string) => {
    if (result === 'win') return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
    if (result === 'loss') return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
    if (result === 'draw') return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300';
    if (result === 'projected_win') return 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300';
    if (result === 'projected_loss') return 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 border border-rose-300';
    if (result === 'projected_draw') return 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300';
    return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300';
  };

  const getResultText = (result: string) => {
    if (result === 'win') return 'W';
    if (result === 'loss') return 'L';
    if (result === 'draw') return 'D';
    if (result === 'projected_win') return 'PW';
    if (result === 'projected_loss') return 'PL';
    if (result === 'projected_draw') return 'PD';
    return '-';
  };

  if (isLoading || projectionsLoading) {
    return (
      
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      
    );
  }

  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 2;

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Target className="h-8 w-8" />
            <h1>Match Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Projected goals and clean sheet odds for each match
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

          {/* Controls - Compact */}
          <Card className="mb-3 shadow-sm border-0">
            <CardContent className="p-2">
              <div className="flex flex-wrap gap-3 items-center">

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <label className="text-xs font-semibold text-gray-700">From:</label>
                  <Select value={startGameweek} onValueChange={setStartGameweek}>
                    <SelectTrigger className="w-20 h-8 border-2 border-gray-200 hover:border-blue-400 transition-colors text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 35 }, (_, i) => i + 4).map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <label className="text-xs font-semibold text-gray-700">To:</label>
                  <Select value={endGameweek} onValueChange={setEndGameweek}>
                    <SelectTrigger className="w-20 h-8 border-2 border-gray-200 hover:border-blue-400 transition-colors text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 35 }, (_, i) => i + 4).map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <label className="text-xs font-semibold text-gray-700">Team:</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-28 h-8 border-2 border-gray-200 hover:border-blue-400 transition-colors text-xs">
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
            </CardContent>
          </Card>

          {/* Projections Table - Compact */}
          <Card className="overflow-hidden shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Match Projections
                <Badge className="bg-white/20 text-white border-white/30 ml-auto text-xs">
                  {filteredProjections.length} matches
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {Object.entries(groupedProjections).map(([groupKey, projections]) => {
                  const gwInfo = groupKey; // Just the gameweek info like "GW2"
                  
                  return (
                    <div key={groupKey}>
                      {/* Day Header - Compact */}
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-1.5 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-800">
                            GW{projections[0]?.gameweek}
                          </span>
                          <span className="text-xs text-gray-600 font-medium">{projections.length} matches</span>
                        </div>
                      </div>
                      
                      {/* Column Headers - Mobile: single row, Desktop: dual columns */}
                      <div className="px-2 pt-2 pb-1">
                        {/* Mobile header - single set of labels */}
                        <div className="lg:hidden flex items-center justify-end px-3 space-x-2">
                          <div className="text-center w-[45px]">
                            <span className="text-xs font-bold text-gray-600">GOALS</span>
                          </div>
                          {projections.some(p => !p.finished) && (
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">CS%</span>
                            </div>
                          )}
                          {projections.some(p => p.finished) && (
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">RESULT</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Desktop header - dual columns */}
                        <div className="hidden lg:grid lg:grid-cols-2 gap-3">
                          <div className="flex items-center justify-end px-3 space-x-2">
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">GOALS</span>
                            </div>
                            {projections.some(p => !p.finished) && (
                              <div className="text-center w-[45px]">
                                <span className="text-xs font-bold text-gray-600">CS%</span>
                              </div>
                            )}
                            {projections.some(p => p.finished) && (
                              <div className="text-center w-[45px]">
                                <span className="text-xs font-bold text-gray-600">RESULT</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-end px-3 space-x-2">
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">GOALS</span>
                            </div>
                            {projections.some(p => !p.finished) && (
                              <div className="text-center w-[45px]">
                                <span className="text-xs font-bold text-gray-600">CS%</span>
                              </div>
                            )}
                            {projections.some(p => p.finished) && (
                              <div className="text-center w-[45px]">
                                <span className="text-xs font-bold text-gray-600">RESULT</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Matches arranged in pairs - 2 matches per row - Compact Size */}
                      <div className="space-y-3 p-2 pt-0">
                        {Array.from({ length: Math.ceil(projections.length / 2) }, (_, pairIndex) => {
                          const match1 = projections[pairIndex * 2];
                          const match2 = projections[pairIndex * 2 + 1];
                          
                          return (
                            <div key={`pair-${pairIndex}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {/* First Match */}
                              {match1 && (
                                <div 
                                  className="bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
                                  data-testid={`match-row-${match1.homeTeam.shortName}-${match1.awayTeam.shortName}`}
                                >
                                  {/* Home Team - Compact */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match1.homeTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(H)</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match1.homeTeam.expectedGoals)}`}>
                                          {match1.homeTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      {/* Only show CS% for upcoming matches */}
                                      {!match1.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match1.homeTeam.cleanSheetOdds)}`}>
                                            {Math.round(match1.homeTeam.cleanSheetOdds)}%
                                          </div>
                                        </div>
                                      )}
                                      {match1.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getResultColor(match1.homeTeam.result)}`}>
                                            {getResultText(match1.homeTeam.result)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Away Team - Compact */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-sky-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match1.awayTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(A)</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match1.awayTeam.expectedGoals)}`}>
                                          {match1.awayTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      {/* Only show CS% for upcoming matches */}
                                      {!match1.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match1.awayTeam.cleanSheetOdds)}`}>
                                            {Math.round(match1.awayTeam.cleanSheetOdds)}%
                                          </div>
                                        </div>
                                      )}
                                      {match1.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getResultColor(match1.awayTeam.result)}`}>
                                            {getResultText(match1.awayTeam.result)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Second Match */}
                              {match2 && (
                                <div 
                                  className="bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
                                  data-testid={`match-row-${match2.homeTeam.shortName}-${match2.awayTeam.shortName}`}
                                >
                                  {/* Home Team - Compact */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match2.homeTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(H)</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match2.homeTeam.expectedGoals)}`}>
                                          {match2.homeTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      {/* Only show CS% for upcoming matches */}
                                      {!match2.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match2.homeTeam.cleanSheetOdds)}`}>
                                            {Math.round(match2.homeTeam.cleanSheetOdds)}%
                                          </div>
                                        </div>
                                      )}
                                      {match2.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getResultColor(match2.homeTeam.result)}`}>
                                            {getResultText(match2.homeTeam.result)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Away Team - Compact */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-sky-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match2.awayTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(A)</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match2.awayTeam.expectedGoals)}`}>
                                          {match2.awayTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      {/* Only show CS% for upcoming matches */}
                                      {!match2.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match2.awayTeam.cleanSheetOdds)}`}>
                                            {Math.round(match2.awayTeam.cleanSheetOdds)}%
                                          </div>
                                        </div>
                                      )}
                                      {match2.finished && (
                                        <div className="text-center w-[45px]">
                                          <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getResultColor(match2.awayTeam.result)}`}>
                                            {getResultText(match2.awayTeam.result)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Match Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Team performance analysis</li>
                    <li>• Historical match data</li>
                    <li>• Current form and statistics</li>
                    <li>• Fixture context factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Metrics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Goals: Projected team goals per match</li>
                    <li>• CS%: Clean sheet probability percentage</li>
                    <li>• Result: Match outcome predictions</li>
                    <li>• Updated regularly throughout the season</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
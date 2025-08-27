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
  const [startGameweek, setStartGameweek] = useState<string>("3");
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
    if (goals >= 2.0) return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-700';
    if (goals >= 1.5) return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
    if (goals >= 1.0) return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200';
  };

  const getCSColor = (percentage: number) => {
    if (percentage >= 40) return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-700';
    if (percentage >= 30) return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300';
    if (percentage >= 20) return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200';
  };

  const getResultColor = (result: string) => {
    if (result === 'win') return 'bg-green-500 text-white';
    if (result === 'loss') return 'bg-red-500 text-white';
    if (result === 'draw') return 'bg-gray-500 text-white';
    if (result === 'projected_win') return 'bg-green-100 text-green-800 border border-green-300';
    if (result === 'projected_loss') return 'bg-red-100 text-red-800 border border-red-300';
    if (result === 'projected_draw') return 'bg-gray-100 text-gray-800 border border-gray-300';
    return 'bg-gray-50 text-gray-600';
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
    
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50/30">
        <div className="w-full max-w-6xl mx-auto px-4 py-4">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
              {startGameweek === endGameweek ? 
                `PL GW${startGameweek}: Match Projections` : 
                `PL GW${startGameweek}-${endGameweek}: Match Projections`}
            </h1>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Goals and clean sheets for gameweeks {startGameweek} to {endGameweek} - actual results for completed games, projections for upcoming games
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-4 shadow-md border-0">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-4 items-center">

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <label className="text-xs font-semibold text-gray-700">From:</label>
                  <Select value={startGameweek} onValueChange={setStartGameweek}>
                    <SelectTrigger className="w-20 h-8 border-2 border-gray-200 hover:border-blue-400 transition-colors text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
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
                      {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
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

          {/* Projections Table */}
          <Card className="overflow-hidden shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
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
                      {/* Day Header */}
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-800">
                            GW{projections[0]?.gameweek}
                          </span>
                          <span className="text-xs text-gray-600 font-medium">{projections.length} matches</span>
                        </div>
                      </div>
                      
                      {/* Matches for this day */}
                      {projections.map((match, index) => (
                        <div 
                          key={`${match.id}-${index}`} 
                          className="px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-blue-50/50 transition-colors duration-200"
                          data-testid={`match-row-${match.homeTeam.shortName}-${match.awayTeam.shortName}`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {/* Home Team */}
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-100">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span className="font-bold text-sm text-gray-800">
                                  {match.homeTeam.shortName}
                                </span>
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">H</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-600 mb-0.5">GOALS</div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getGoalsColor(match.homeTeam.expectedGoals)}`}>
                                    {match.homeTeam.expectedGoals.toFixed(2)}
                                  </div>
                                </div>
                                {/* Only show CS% for upcoming matches */}
                                {!match.finished && (
                                  <div className="text-center">
                                    <div className="text-xs font-semibold text-gray-600 mb-0.5">CS%</div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getCSColor(match.homeTeam.cleanSheetOdds)}`}>
                                      {match.homeTeam.cleanSheetOdds}%
                                    </div>
                                  </div>
                                )}
                                {/* Only show RESULT for finished matches */}
                                {match.finished && (
                                  <div className="text-center">
                                    <div className="text-xs font-semibold text-gray-600 mb-0.5">RESULT</div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getResultColor(match.homeTeam.result)}`}>
                                      {getResultText(match.homeTeam.result)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                <span className="font-bold text-sm text-gray-800">
                                  {match.awayTeam.shortName}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">A</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-600 mb-0.5">GOALS</div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getGoalsColor(match.awayTeam.expectedGoals)}`}>
                                    {match.awayTeam.expectedGoals.toFixed(2)}
                                  </div>
                                </div>
                                {/* Only show CS% for upcoming matches */}
                                {!match.finished && (
                                  <div className="text-center">
                                    <div className="text-xs font-semibold text-gray-600 mb-0.5">CS%</div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getCSColor(match.awayTeam.cleanSheetOdds)}`}>
                                      {match.awayTeam.cleanSheetOdds}%
                                    </div>
                                  </div>
                                )}
                                {/* Only show RESULT for finished matches */}
                                {match.finished && (
                                  <div className="text-center">
                                    <div className="text-xs font-semibold text-gray-600 mb-0.5">RESULT</div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getResultColor(match.awayTeam.result)}`}>
                                      {getResultText(match.awayTeam.result)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
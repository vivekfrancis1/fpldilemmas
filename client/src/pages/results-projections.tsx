import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Calendar, Filter, Target, TrendingUp, Clock } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PredictedMatch {
  id: number;
  gameweek: number;
  kickoffTime: string;
  finished: boolean;
  predictedResult: string;
  actualResult: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    predictedScore: number;
    expectedGoals: number;
    cleanSheetOdds: number;
    result: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    predictedScore: number;
    expectedGoals: number;
    cleanSheetOdds: number;
    result: string;
  };
  totalPredictedGoals: number;
  totalExpectedGoals: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export default function ResultsProjections() {
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 5;
  const nextStartGameweek = currentGameweek + 1;
  const nextEndGameweek = Math.min(currentGameweek + 6, 38);

  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // Fetch team goal projections
  const { data: teamGoalData, isLoading: goalsLoading } = useQuery<any[]>({
    queryKey: ["/api/team-goal-projections"],
  });

  // Fetch team clean sheet projections  
  const { data: teamCSData, isLoading: csLoading } = useQuery<any[]>({
    queryKey: ["/api/team-cs-projections"],
  });

  // Fetch fixtures data to get actual match information
  const { data: fixturesData, isLoading: fixturesLoading } = useQuery<any[]>({
    queryKey: ["/api/fixtures"],
  });

  // Process data from separate endpoints to create match predictions
  const predictionsData = useMemo(() => {
    if (!teamGoalData || !teamCSData || !fixturesData || !bootstrapData) return [];

    const matches: PredictedMatch[] = [];

    // Create lookup maps for goal and CS data
    const goalMap = new Map();
    const csMap = new Map();

    (teamGoalData || []).forEach((team: any) => {
      goalMap.set(team.teamId, team.gameweekProjections);
    });

    (teamCSData || []).forEach((team: any) => {
      const teamId = bootstrapData.teams.find((t: any) => t.short_name === team.team)?.id;
      if (teamId) {
        csMap.set(teamId, team.gameweekProjections);
      }
    });

    // Filter fixtures for next 6 gameweeks (future only)
    const relevantFixtures = (fixturesData || []).filter((fixture: any) => 
      fixture.event >= nextStartGameweek && fixture.event <= nextEndGameweek
    );

    relevantFixtures.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);

      if (homeTeam && awayTeam) {
        const homeGoalData = goalMap.get(homeTeam.id) || {};
        const awayGoalData = goalMap.get(awayTeam.id) || {};
        const homeCSData = csMap.get(homeTeam.id) || {};
        const awayCSData = csMap.get(awayTeam.id) || {};

        const homeExpectedGoals = homeGoalData[fixture.event.toString()] || 0;
        const awayExpectedGoals = awayGoalData[fixture.event.toString()] || 0;
        const homeCleanSheetOdds = homeCSData[fixture.event.toString()] || 0;
        const awayCleanSheetOdds = awayCSData[fixture.event.toString()] || 0;

        // Calculate predicted scores based on expected goals
        const homePredictedScore = Math.round(homeExpectedGoals);
        const awayPredictedScore = Math.round(awayExpectedGoals);

        matches.push({
          id: fixture.id,
          gameweek: fixture.event,
          kickoffTime: fixture.kickoff_time,
          finished: fixture.finished,
          predictedResult: fixture.finished ? `${fixture.team_h_score}-${fixture.team_a_score}` : `${homePredictedScore}-${awayPredictedScore}`,
          actualResult: fixture.finished ? `${fixture.team_h_score}-${fixture.team_a_score}` : 'TBD',
          homeTeam: {
            id: homeTeam.id,
            name: homeTeam.name,
            shortName: homeTeam.short_name,
            predictedScore: homePredictedScore,
            expectedGoals: homeExpectedGoals,
            cleanSheetOdds: homeCleanSheetOdds,
            result: fixture.finished 
              ? (fixture.team_h_score > fixture.team_a_score ? 'win' : 
                 fixture.team_h_score < fixture.team_a_score ? 'loss' : 'draw')
              : 'TBD'
          },
          awayTeam: {
            id: awayTeam.id,
            name: awayTeam.name,
            shortName: awayTeam.short_name,
            predictedScore: awayPredictedScore,
            expectedGoals: awayExpectedGoals,
            cleanSheetOdds: awayCleanSheetOdds,
            result: fixture.finished 
              ? (fixture.team_a_score > fixture.team_h_score ? 'win' : 
                 fixture.team_a_score < fixture.team_h_score ? 'loss' : 'draw')
              : 'TBD'
          },
          totalPredictedGoals: homePredictedScore + awayPredictedScore,
          totalExpectedGoals: homeExpectedGoals + awayExpectedGoals,
          confidence: 'Medium' as const
        });
      }
    });

    return matches.sort((a, b) => {
      if (a.gameweek !== b.gameweek) {
        return a.gameweek - b.gameweek;
      }
      return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
    });
  }, [teamGoalData, teamCSData, fixturesData, bootstrapData, nextStartGameweek, nextEndGameweek]);

  const gameweeks = useMemo(() => {
    if (!predictionsData) return [];
    const gws = Array.from(new Set(predictionsData.map(m => m.gameweek))).sort((a, b) => a - b);
    return gws;
  }, [predictionsData]);

  const filteredPredictions = useMemo(() => {
    if (!predictionsData) return [];
    
    return predictionsData
      .filter(match => selectedGameweek === "all" || match.gameweek.toString() === selectedGameweek)
      .filter(match => 
        selectedTeam === "all" || 
        match.homeTeam.shortName === selectedTeam || 
        match.awayTeam.shortName === selectedTeam
      );
  }, [predictionsData, selectedGameweek, selectedTeam]);

  // Group filtered predictions by gameweek for card layout
  const groupedPredictions = useMemo(() => {
    const grouped: { [key: string]: typeof filteredPredictions } = {};
    
    filteredPredictions.forEach(prediction => {
      const key = `GW${prediction.gameweek}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(prediction);
    });
    
    // Sort each group by kickoff time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());
    });
    
    return grouped;
  }, [filteredPredictions]);

  const formatKickoffTime = (kickoffTime: string) => {
    const date = new Date(kickoffTime);
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const getResultType = (homeScore: number, awayScore: number) => {
    if (homeScore > awayScore) return 'home-win';
    if (awayScore > homeScore) return 'away-win';
    return 'draw';
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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


  if (isLoading || goalsLoading || csLoading || fixturesLoading) {
    return (
      
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <h1>Match Predictions</h1>
          </div>
          <p className="fpl-page-subtitle">
            Predicted match results based on statistical analysis and mathematical modeling
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Gameweek:</label>
                  <Select value={selectedGameweek} onValueChange={setSelectedGameweek}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Gameweeks</SelectItem>
                      {gameweeks.map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
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
            </CardContent>
          </Card>

          {/* Results Projections - Card Layout */}
          <Card className="overflow-hidden shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4" />
                Match Predictions
                <Badge className="bg-white/20 text-white border-white/30 ml-auto text-xs">
                  {filteredPredictions.length} matches
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {Object.entries(groupedPredictions).map(([groupKey, predictions]) => {
                  return (
                    <div key={groupKey}>
                      {/* Gameweek Header */}
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-1.5 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-800">
                            GW{predictions[0]?.gameweek}
                          </span>
                          <span className="text-xs text-gray-600 font-medium">{predictions.length} matches</span>
                        </div>
                      </div>
                      
                      {/* Column Headers */}
                      <div className="px-2 pt-2 pb-1">
                        <div className="lg:hidden flex items-center justify-end px-3 space-x-2">
                          <div className="text-center w-[45px]">
                            <span className="text-xs font-bold text-gray-600">XG</span>
                          </div>
                          <div className="text-center w-[45px]">
                            <span className="text-xs font-bold text-gray-600">CS%</span>
                          </div>
                        </div>
                        
                        <div className="hidden lg:grid lg:grid-cols-2 gap-3">
                          <div className="flex items-center justify-end px-3 space-x-2">
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">XG</span>
                            </div>
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">CS%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-end px-3 space-x-2">
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">XG</span>
                            </div>
                            <div className="text-center w-[45px]">
                              <span className="text-xs font-bold text-gray-600">CS%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Matches arranged in pairs */}
                      <div className="space-y-3 p-2 pt-0">
                        {Array.from({ length: Math.ceil(predictions.length / 2) }, (_, pairIndex) => {
                          const match1 = predictions[pairIndex * 2];
                          const match2 = predictions[pairIndex * 2 + 1];
                          
                          return (
                            <div key={`pair-${pairIndex}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {/* First Match */}
                              {match1 && (
                                <div 
                                  className="bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
                                  data-testid={`match-row-${match1.homeTeam.shortName}-${match1.awayTeam.shortName}`}
                                >
                                  {/* Match Header with Kickoff Time */}
                                  <div className="bg-gray-50 px-3 py-1 border-b border-gray-200">
                                    <div className="flex items-center justify-center text-xs text-gray-600">
                                      <span className="font-medium">{formatKickoffTime(match1.kickoffTime).date}</span>
                                      <span className="mx-2">•</span>
                                      <span>{formatKickoffTime(match1.kickoffTime).time}</span>
                                    </div>
                                  </div>

                                  {/* Home Team */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match1.homeTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(H)</span>
                                      <div className="px-2 py-1.5 rounded-lg font-bold text-lg bg-gray-50 text-gray-800 border min-w-[45px] ml-2">
                                        {match1.homeTeam.predictedScore}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match1.homeTeam.expectedGoals)}`}>
                                          {match1.homeTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match1.homeTeam.cleanSheetOdds)}`}>
                                          {match1.homeTeam.cleanSheetOdds.toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Away Team */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-sky-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match1.awayTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(A)</span>
                                      <div className="px-2 py-1.5 rounded-lg font-bold text-lg bg-gray-50 text-gray-800 border min-w-[45px] ml-2">
                                        {match1.awayTeam.predictedScore}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match1.awayTeam.expectedGoals)}`}>
                                          {match1.awayTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match1.awayTeam.cleanSheetOdds)}`}>
                                          {match1.awayTeam.cleanSheetOdds.toFixed(1)}%
                                        </div>
                                      </div>
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
                                  {/* Match Header with Kickoff Time */}
                                  <div className="bg-gray-50 px-3 py-1 border-b border-gray-200">
                                    <div className="flex items-center justify-center text-xs text-gray-600">
                                      <span className="font-medium">{formatKickoffTime(match2.kickoffTime).date}</span>
                                      <span className="mx-2">•</span>
                                      <span>{formatKickoffTime(match2.kickoffTime).time}</span>
                                    </div>
                                  </div>

                                  {/* Home Team */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match2.homeTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(H)</span>
                                      <div className="px-2 py-1.5 rounded-lg font-bold text-lg bg-gray-50 text-gray-800 border min-w-[45px] ml-2">
                                        {match2.homeTeam.predictedScore}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match2.homeTeam.expectedGoals)}`}>
                                          {match2.homeTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match2.homeTeam.cleanSheetOdds)}`}>
                                          {match2.homeTeam.cleanSheetOdds.toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Away Team */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-sky-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="font-bold text-sm text-gray-800">
                                        {match2.awayTeam.shortName}
                                      </span>
                                      <span className="text-xs text-gray-600 px-1.5 py-0.5 font-bold">(A)</span>
                                      <div className="px-2 py-1.5 rounded-lg font-bold text-lg bg-gray-50 text-gray-800 border min-w-[45px] ml-2">
                                        {match2.awayTeam.predictedScore}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getGoalsColor(match2.awayTeam.expectedGoals)}`}>
                                          {match2.awayTeam.expectedGoals.toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="text-center w-[45px]">
                                        <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] ${getCSColor(match2.awayTeam.cleanSheetOdds)}`}>
                                          {match2.awayTeam.cleanSheetOdds.toFixed(1)}%
                                        </div>
                                      </div>
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
              <CardTitle className="text-lg">About Result Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Mathematical modeling algorithms</li>
                    <li>• Historical team performance data</li>
                    <li>• Form analysis and head-to-head records</li>
                    <li>• Injury reports and team news</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Prediction Methodology</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Machine learning algorithms</li>
                    <li>• Poisson distribution modeling</li>
                    <li>• Market odds analysis</li>
                    <li>• Expected goals (xG) integration</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
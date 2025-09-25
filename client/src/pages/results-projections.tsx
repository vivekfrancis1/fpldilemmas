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

          {/* Results Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Match Predictions ({filteredPredictions.length} matches)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kickoff
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Match
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Score
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        xG
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clean Sheets
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPredictions.map((match) => {
                      const kickoff = formatKickoffTime(match.kickoffTime);
                      const resultType = getResultType(match.homeTeam.predictedScore, match.awayTeam.predictedScore);
                      
                      return (
                        <tr key={match.id} className="hover:bg-gray-50" data-testid={`prediction-row-${match.id}`}>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">
                            <div className="text-sm font-medium">{kickoff.date}</div>
                            <div className="text-xs text-gray-500">{kickoff.time}</div>
                            <Badge variant="outline" className="mt-1">
                              GW{match.gameweek}
                            </Badge>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">{match.homeTeam.shortName}</div>
                              <div className="text-xs text-gray-400">vs</div>
                              <div className="text-sm font-medium text-gray-900">{match.awayTeam.shortName}</div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-1 flex flex-col items-center">
                              <div className="px-3 py-2 rounded-lg font-bold text-lg bg-gray-50 text-gray-800 border min-w-[45px] w-[45px] h-[36px] flex items-center justify-center">
                                {match.homeTeam.predictedScore}
                              </div>
                              <div className="text-xs text-gray-400">-</div>
                              <div className="px-3 py-2 rounded-lg font-bold text-lg bg-gray-50 text-gray-800 border min-w-[45px] w-[45px] h-[36px] flex items-center justify-center">
                                {match.awayTeam.predictedScore}
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-2 flex flex-col items-center">
                              <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] w-[45px] h-[24px] flex items-center justify-center ${getGoalsColor(match.homeTeam.expectedGoals)}`}>
                                {match.homeTeam.expectedGoals.toFixed(2)}
                              </div>
                              <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] w-[45px] h-[24px] flex items-center justify-center ${getGoalsColor(match.awayTeam.expectedGoals)}`}>
                                {match.awayTeam.expectedGoals.toFixed(2)}
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-2 flex flex-col items-center">
                              <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] w-[45px] h-[24px] flex items-center justify-center ${getCSColor(match.homeTeam.cleanSheetOdds)}`}>
                                {match.homeTeam.cleanSheetOdds.toFixed(1)}%
                              </div>
                              <div className={`px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm min-w-[45px] w-[45px] h-[24px] flex items-center justify-center ${getCSColor(match.awayTeam.cleanSheetOdds)}`}>
                                {match.awayTeam.cleanSheetOdds.toFixed(1)}%
                              </div>
                            </div>
                          </td>
                          
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
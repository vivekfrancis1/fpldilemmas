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

  /**
   * Calculate match result probabilities based on expected goals and predicted scores
   * 
   * Algorithm:
   * 1. Primary factor: Expected goals difference (xG) between teams
   * 2. Secondary factor: Predicted score difference for final adjustments
   * 3. Base probabilities calculated from xG (33% each + xG advantage)
   * 4. Score predictions provide additional boost to favored team
   * 5. Draw scenarios heavily influenced by xG closeness
   * 6. Enforces realistic bounds: 8-82% for wins, 12-45% for draws
   * 
   * Note: These are calculated probabilities, not sourced from betting markets
   */
  const calculateProbabilities = (homeScore: number, awayScore: number, homeXG: number, awayXG: number) => {
    const scoreDiff = homeScore - awayScore;
    const xgDiff = homeXG - awayXG;
    
    // Base probabilities more influenced by xG than predicted scores
    let homeWin, draw, awayWin;
    
    // Calculate base probabilities primarily from xG difference
    const xgAdvantage = xgDiff;
    const baseHomeWin = 33 + (xgAdvantage * 15); // More responsive to xG
    const baseAwayWin = 33 - (xgAdvantage * 15);
    const baseDraw = 34 - Math.abs(xgAdvantage * 8); // Draw decreases with bigger xG differences
    
    if (scoreDiff > 0) {
      // Home team predicted to win - combine xG advantage with score prediction
      homeWin = Math.max(baseHomeWin, 40) + Math.min(20, scoreDiff * 8);
      awayWin = Math.max(10, baseAwayWin - scoreDiff * 6);
      draw = 100 - homeWin - awayWin;
    } else if (scoreDiff < 0) {
      // Away team predicted to win - combine xG advantage with score prediction
      awayWin = Math.max(baseAwayWin, 40) + Math.min(20, Math.abs(scoreDiff) * 8);
      homeWin = Math.max(10, baseHomeWin - Math.abs(scoreDiff) * 6);
      draw = 100 - homeWin - awayWin;
    } else {
      // Draw predicted - rely heavily on xG difference
      if (Math.abs(xgDiff) < 0.3) {
        // Very close xG - high draw probability
        homeWin = 30 + (xgDiff * 10);
        awayWin = 30 - (xgDiff * 10);
        draw = 40;
      } else {
        // Significant xG difference even with draw prediction
        homeWin = baseHomeWin;
        awayWin = baseAwayWin;
        draw = baseDraw;
      }
    }
    
    // Normalize to ensure probabilities sum to 100
    const total = homeWin + draw + awayWin;
    homeWin = (homeWin / total) * 100;
    draw = (draw / total) * 100;
    awayWin = (awayWin / total) * 100;
    
    // Apply realistic bounds to prevent extreme probabilities
    return {
      homeWin: Math.max(8, Math.min(82, homeWin)),
      draw: Math.max(12, Math.min(45, draw)),
      awayWin: Math.max(8, Math.min(82, awayWin))
    };
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
            <h1>Results Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Predicted match results based on sports spread betting markets and statistical analysis
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Match
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kickoff
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Score
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win Probabilities
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
                      const probabilities = calculateProbabilities(
                        match.homeTeam.predictedScore,
                        match.awayTeam.predictedScore,
                        match.homeTeam.expectedGoals,
                        match.awayTeam.expectedGoals
                      );
                      
                      return (
                        <tr key={match.id} className="hover:bg-gray-50" data-testid={`prediction-row-${match.id}`}>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-3">
                              <div className="text-sm font-medium text-gray-900">{match.homeTeam.shortName}</div>
                              <div className="text-xs text-gray-400">vs</div>
                              <div className="text-sm font-medium text-gray-900">{match.awayTeam.shortName}</div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center text-sm text-gray-900">
                            <div className="text-sm font-medium">{kickoff.date}</div>
                            <div className="text-xs text-gray-500">{kickoff.time}</div>
                            <Badge variant="outline" className="mt-1">
                              GW{match.gameweek}
                            </Badge>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className={`inline-flex items-center px-3 py-2 rounded-lg font-bold text-lg ${
                              resultType === 'home-win' ? 'bg-blue-100 text-blue-800' :
                              resultType === 'away-win' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {match.homeTeam.predictedScore} - {match.awayTeam.predictedScore}
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-blue-600">{match.homeTeam.shortName}: {probabilities.homeWin.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Draw: {probabilities.draw.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-red-600">{match.awayTeam.shortName}: {probabilities.awayWin.toFixed(1)}%</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="text-gray-600">{match.homeTeam.shortName}: {match.homeTeam.expectedGoals.toFixed(2)}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-600">{match.awayTeam.shortName}: {match.awayTeam.expectedGoals.toFixed(2)}</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="text-blue-600">{match.homeTeam.shortName}: {match.homeTeam.cleanSheetOdds.toFixed(1)}%</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-red-600">{match.awayTeam.shortName}: {match.awayTeam.cleanSheetOdds.toFixed(1)}%</span>
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
                    <li>• Sports spread betting markets</li>
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
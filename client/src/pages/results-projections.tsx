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
  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: predictionsData, isLoading: predictionsLoading } = useQuery<PredictedMatch[]>({
    queryKey: ["/api/predicted-scores"],
  });

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
      )
      .sort((a, b) => {
        // Sort by gameweek first, then by kickoff time
        if (a.gameweek !== b.gameweek) {
          return a.gameweek - b.gameweek;
        }
        return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
      });
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

  if (isLoading || predictionsLoading) {
    return (
      
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      
    );
  }

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Results Projections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Predicted match results based on sports spread betting markets and statistical analysis
            </p>
          </div>

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
                        Goals Market
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPredictions.map((match) => {
                      const kickoff = formatKickoffTime(match.kickoffTime);
                      const resultType = getResultType(match.predictedHomeScore, match.predictedAwayScore);
                      
                      return (
                        <tr key={match.id} className="hover:bg-gray-50" data-testid={`prediction-row-${match.id}`}>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-between">
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">{match.homeTeam}</div>
                                <div className="text-xs text-gray-500">{match.homeTeamShort}</div>
                              </div>
                              <div className="mx-4 text-xs text-gray-400">vs</div>
                              <div className="text-left">
                                <div className="text-sm font-medium text-gray-900">{match.awayTeam}</div>
                                <div className="text-xs text-gray-500">{match.awayTeamShort}</div>
                              </div>
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
                              {match.predictedHomeScore} - {match.predictedAwayScore}
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-blue-600">{match.homeTeamShort}: {match.homeWinProbability}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Draw: {match.drawProbability}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-red-600">{match.awayTeamShort}: {match.awayWinProbability}%</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="text-gray-600">O2.5: {match.totalGoalsProbability.over2_5}%</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-600">U2.5: {match.totalGoalsProbability.under2_5}%</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <Badge className={getConfidenceColor(match.confidence)}>
                              {match.confidence}
                            </Badge>
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
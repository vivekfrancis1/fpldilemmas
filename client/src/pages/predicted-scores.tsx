import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Target, Calendar, Filter, Trophy, Clock } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PredictedScore {
  id: number;
  gameweek: number;
  kickoffTime: string;
  finished: boolean;
  predictedResult: 'home_win' | 'away_win' | 'draw';
  actualResult?: 'home_win' | 'away_win' | 'draw';
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    predictedScore: number;
    expectedGoals: number;
    cleanSheetOdds: number;
    result: 'win' | 'loss' | 'draw';
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    predictedScore: number;
    expectedGoals: number;
    cleanSheetOdds: number;
    result: 'win' | 'loss' | 'draw';
  };
  totalPredictedGoals: number;
  totalExpectedGoals: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export default function PredictedScores() {
  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [showFinished, setShowFinished] = useState<string>("all");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: predictedScoresData, isLoading: scoresLoading } = useQuery<PredictedScore[]>({
    queryKey: ["/api/predicted-scores"],
  });

  const filteredScores = useMemo(() => {
    if (!predictedScoresData) return [];
    
    return predictedScoresData.filter(match => {
      const gameweekMatch = selectedGameweek === "all" || match.gameweek.toString() === selectedGameweek;
      const teamMatch = selectedTeam === "all" || 
        match.homeTeam.shortName === selectedTeam || 
        match.awayTeam.shortName === selectedTeam;
      const finishedMatch = showFinished === "all" ||
        (showFinished === "finished" && match.finished) ||
        (showFinished === "upcoming" && !match.finished);
      
      return gameweekMatch && teamMatch && finishedMatch;
    }).sort((a, b) => {
      if (a.gameweek !== b.gameweek) return a.gameweek - b.gameweek;
      return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
    });
  }, [predictedScoresData, selectedGameweek, selectedTeam, showFinished]);

  const getResultColor = (teamResult: string) => {
    switch (teamResult) {
      case 'win': return 'bg-green-500';
      case 'loss': return 'bg-red-500';
      case 'draw': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getResultText = (result: string, isFinished: boolean) => {
    if (isFinished) {
      switch (result) {
        case 'home_win': return 'Win';
        case 'away_win': return 'Win';
        case 'draw': return 'Draw';
        default: return '?';
      }
    } else {
      switch (result) {
        case 'home_win': return 'Projected Win';
        case 'away_win': return 'Projected Win';
        case 'draw': return 'Projected Draw';
        default: return '?';
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  if (isLoading || scoresLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Predicted Scores
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Match predictions with rounded scores and determined outcomes based on expected goals
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Gameweek:</label>
                  <Select value={selectedGameweek} onValueChange={setSelectedGameweek}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {Array.from({ length: 38 }, (_, i) => (
                        <SelectItem key={i + 1} value={`${i + 1}`}>GW{i + 1}</SelectItem>
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

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <Select value={showFinished} onValueChange={setShowFinished}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Matches</SelectItem>
                      <SelectItem value="finished">Finished</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predicted Scores Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Predicted Match Scores
                <Badge variant="outline" className="ml-2">
                  {filteredScores.length} matches
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GW
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Home Team
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Score
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Away Team
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expected Goals
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredScores.map((match) => (
                      <tr 
                        key={match.id} 
                        className={`hover:bg-gray-50 ${match.finished ? 'bg-gray-50/50' : ''}`}
                        data-testid={`predicted-score-row-${match.id}`}
                      >
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {match.gameweek}
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                          {formatDate(match.kickoffTime)}
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {match.homeTeam.shortName}
                            </span>
                            <Badge className={`${getResultColor(match.homeTeam.result)} text-white text-xs`}>
                              {match.homeTeam.result === 'win' ? (match.finished ? 'W' : 'PW') :
                               match.homeTeam.result === 'loss' ? (match.finished ? 'L' : 'PL') :
                               (match.finished ? 'D' : 'PD')}
                            </Badge>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-bold text-gray-900">
                              {match.homeTeam.predictedScore}
                            </span>
                            <span className="text-gray-500">-</span>
                            <span className="text-lg font-bold text-gray-900">
                              {match.awayTeam.predictedScore}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ({match.homeTeam.expectedGoals.toFixed(2)} - {match.awayTeam.expectedGoals.toFixed(2)})
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {match.awayTeam.shortName}
                            </span>
                            <Badge className={`${getResultColor(match.awayTeam.result)} text-white text-xs`}>
                              {match.awayTeam.result === 'win' ? (match.finished ? 'W' : 'PW') :
                               match.awayTeam.result === 'loss' ? (match.finished ? 'L' : 'PL') :
                               (match.finished ? 'D' : 'PD')}
                            </Badge>
                          </div>
                        </td>
                        
                        
                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                          {match.totalExpectedGoals.toFixed(2)}
                          <div className="text-xs text-gray-500">
                            ({match.totalPredictedGoals} predicted)
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          {match.finished ? (
                            <Badge variant="outline" className="bg-gray-100">
                              <Clock className="h-3 w-3 mr-1" />
                              Finished
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50">
                              Upcoming
                            </Badge>
                          )}
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
              <CardTitle className="text-lg">About Predicted Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">How It Works</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Expected goals rounded to nearest whole number</li>
                    <li>• Match outcomes determined by predicted scores</li>
                    <li>• Green (H) = Home Win, Blue (A) = Away Win, Yellow (D) = Draw</li>
                    <li>• Original expected goals shown for reference</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Result Comparison</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Solid badges show predicted outcomes</li>
                    <li>• Outlined badges show actual results (finished games)</li>
                    <li>• Compare prediction accuracy vs actual outcomes</li>
                    <li>• Confidence levels indicate prediction reliability</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
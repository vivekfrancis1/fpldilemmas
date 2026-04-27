import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Calendar, Filter, Trophy, Clock, RefreshCw } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

interface TBCGoalProjection {
  fixtureId: number;
  homeTeamId: number;
  homeTeamShort: string;
  awayTeamId: number;
  awayTeamShort: string;
  homeGoals: number;
  awayGoals: number;
}

export default function PredictedScores() {
  const [startGameweek, setStartGameweek] = useState<string>("4");
  const [endGameweek, setEndGameweek] = useState<string>("9");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [showFinished, setShowFinished] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');

  const queryClient = useQueryClient();

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: predictedScoresData, isLoading: scoresLoading } = useQuery<PredictedScore[]>({
    queryKey: ["/api/predicted-scores"],
  });

  const { data: tbcData } = useQuery<TBCGoalProjection[]>({
    queryKey: ["/api/tbc-goal-projections"],
    staleTime: 30 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/predicted-scores"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/bootstrap-static"] });
    setIsRefreshing(false);
  };

  const filteredScores = useMemo(() => {
    if (!predictedScoresData) return [];
    
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    
    return predictedScoresData.filter(match => {
      const gameweekMatch = match.gameweek >= startGW && match.gameweek <= endGW;
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
  }, [predictedScoresData, startGameweek, endGameweek, selectedTeam, showFinished]);

  // TBC assignments from localStorage
  const tbcAssignments = useMemo<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  }, [fixtureMode]);

  // Determine the label for TBC GW badge based on mode
  const getTBCGWLabel = (fixtureId: number): string => {
    if (fixtureMode === 'expert') return 'GW 36/37';
    if (fixtureMode === 'custom') {
      const gw = tbcAssignments[fixtureId];
      return gw ? `GW ${gw}` : 'TBC';
    }
    return 'TBC';
  };

  // TBC matches - unscheduled fixtures from /api/tbc-goal-projections
  const filteredTBCMatches = useMemo(() => {
    if (!tbcData || showFinished === "finished") return [];
    return tbcData.filter(f =>
      selectedTeam === "all" || f.homeTeamShort === selectedTeam || f.awayTeamShort === selectedTeam
    );
  }, [tbcData, selectedTeam, showFinished]);

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
            <h1>Predicted Scores</h1>
          </div>
          <p className="fpl-page-subtitle">
            Match predictions with rounded scores and determined outcomes based on expected goals
          </p>
          <div className="mt-6">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-refresh-predictions"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Predictions'}
            </Button>
          </div>
        </div>
      </div>

      {tbcData && tbcData.length > 0 && showFinished !== "finished" && (
        <div className="flex justify-center mb-5">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs shadow-sm">
            <button onClick={() => setFixtureMode('base')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Base Fixtures</button>
            {Object.keys(tbcAssignments).length > 0 && <button onClick={() => setFixtureMode('custom')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>My Fixtures</button>}
            <button onClick={() => setFixtureMode('expert')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'expert' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-gray-500 hover:text-gray-800'}`}>Expert Fixtures</button>
          </div>
          <a href="/fixtures" className="ml-2 self-center text-xs text-blue-600 hover:underline flex-shrink-0">⚙ Edit fixtures</a>
        </div>
      )}

      <div className="fpl-section-spacing">

          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-wrap gap-2 sm:gap-4 items-end">
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Start GW:</label>
                  <Select value={startGameweek} onValueChange={setStartGameweek}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 4} value={(i + 4).toString()}>
                          {i + 4}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">End GW:</label>
                  <Select value={endGameweek} onValueChange={setEndGameweek}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 4} value={(i + 4).toString()}>
                          {i + 4}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Team:</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-28 sm:w-32">
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
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Status:</label>
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
                  {filteredScores.length + filteredTBCMatches.length} matches
                </Badge>
                {filteredTBCMatches.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-300 ml-1 text-xs">
                    {filteredTBCMatches.length} GW39 (TBC)
                  </Badge>
                )}
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
                            {match.finished && (
                              <Badge className={`${getResultColor(match.homeTeam.result)} text-white text-xs`}>
                                {match.homeTeam.result === 'win' ? 'W' :
                                 match.homeTeam.result === 'loss' ? 'L' : 'D'}
                              </Badge>
                            )}
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
                            {match.finished && (
                              <Badge className={`${getResultColor(match.awayTeam.result)} text-white text-xs`}>
                                {match.awayTeam.result === 'win' ? 'W' :
                                 match.awayTeam.result === 'loss' ? 'L' : 'D'}
                              </Badge>
                            )}
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
                    {filteredTBCMatches.length > 0 && (
                      <>
                        <tr className="bg-amber-50/40 border-t-2 border-amber-200">
                          <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-amber-700 uppercase tracking-wider">
                            {fixtureMode === 'expert' ? 'GW 36/37 — Expert Assigned Fixtures (FPL Model)' : fixtureMode === 'custom' && tbcData?.[0] && tbcAssignments[tbcData[0].fixtureId] ? `GW ${tbcAssignments[tbcData[0].fixtureId]} — My Assigned Fixtures (FPL Model)` : 'GW39 (TBC) — Unscheduled Fixtures (FPL Model Projections)'}
                          </td>
                        </tr>
                        {filteredTBCMatches.map((f) => {
                          const homeScore = Math.round(f.homeGoals);
                          const awayScore = Math.round(f.awayGoals);
                          const homeResult = homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw';
                          const awayResult = awayScore > homeScore ? 'win' : awayScore < homeScore ? 'loss' : 'draw';
                          const gwLabel = getTBCGWLabel(f.fixtureId);
                          return (
                            <tr key={`tbc-${f.fixtureId}`} className="bg-amber-50/30 hover:bg-amber-50/60">
                              <td className="px-4 py-4 text-center">
                                <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold">
                                  {gwLabel}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-center text-sm text-amber-600 font-medium">
                                TBD
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{f.homeTeamShort}</span>
                                  <Badge className={`${getResultColor(homeResult)} text-white text-xs`}>
                                    {homeResult === 'win' ? 'W' : homeResult === 'loss' ? 'L' : 'D'}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-lg font-bold text-amber-800">{homeScore}</span>
                                  <span className="text-amber-500">-</span>
                                  <span className="text-lg font-bold text-amber-800">{awayScore}</span>
                                </div>
                                <div className="text-xs text-amber-500 mt-1">
                                  ({f.homeGoals.toFixed(2)} - {f.awayGoals.toFixed(2)})
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{f.awayTeamShort}</span>
                                  <Badge className={`${getResultColor(awayResult)} text-white text-xs`}>
                                    {awayResult === 'win' ? 'W' : awayResult === 'loss' ? 'L' : 'D'}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">
                                  {gwLabel === 'TBC' ? 'GW39 (TBC)' : gwLabel}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
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
    
  );
}
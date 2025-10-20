import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Filter, Calendar, Trophy, Clock } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { getDefaultGameweekRange, getNextGameweeksForDropdown, debugGameweekCalculation } from "@shared/gameweek-utils";
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
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Calculate dynamic gameweek defaults based on bootstrap data
  const defaultGameweekRange = useMemo(() => {
    if (!bootstrapData?.events) {
      return { startGameweek: "7", endGameweek: "12" }; // Fallback to likely next 6 gameweeks
    }
    debugGameweekCalculation(bootstrapData.events);
    return getDefaultGameweekRange(bootstrapData.events, 6);
  }, [bootstrapData?.events]);

  const [startGameweek, setStartGameweek] = useState<string>(defaultGameweekRange.startGameweek);
  const [endGameweek, setEndGameweek] = useState<string>(defaultGameweekRange.endGameweek);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // Get available gameweeks for dropdown options (next 6 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return Array.from({ length: 6 }, (_, i) => i + 7); // Fallback starting from GW7
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 6);
  }, [bootstrapData?.events]);

  // Update state when bootstrap data changes (e.g., on page load)
  useEffect(() => {
    if (bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, 6);
      setStartGameweek(newRange.startGameweek);
      setEndGameweek(newRange.endGameweek);
    }
  }, [bootstrapData?.events]);

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

  // Process data from separate endpoints to create match projections
  const projectionsData = useMemo(() => {
    if (!teamGoalData || !teamCSData || !fixturesData || !bootstrapData) return [];

    const matches: MatchProjection[] = [];
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);

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

    // Filter fixtures for the selected gameweek range
    const relevantFixtures = (fixturesData || []).filter((fixture: any) => 
      fixture.event >= startGW && fixture.event <= endGW
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

        matches.push({
          id: fixture.id,
          gameweek: fixture.event,
          kickoffTime: fixture.kickoff_time,
          finished: fixture.finished,
          matchResult: fixture.finished ? `${fixture.team_h_score}-${fixture.team_a_score}` : 'TBD',
          homeTeam: {
            id: homeTeam.id,
            name: homeTeam.name,
            shortName: homeTeam.short_name,
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
            expectedGoals: awayExpectedGoals,
            cleanSheetOdds: awayCleanSheetOdds,
            result: fixture.finished 
              ? (fixture.team_a_score > fixture.team_h_score ? 'win' : 
                 fixture.team_a_score < fixture.team_h_score ? 'loss' : 'draw')
              : 'TBD'
          },
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
  }, [teamGoalData, teamCSData, fixturesData, bootstrapData, startGameweek, endGameweek]);

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData.filter(match => 
      selectedTeam === "all" || 
      match.homeTeam.shortName === selectedTeam || 
      match.awayTeam.shortName === selectedTeam
    );
  }, [projectionsData, selectedTeam]);

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

  const formatKickoffTime = (kickoffTime: string) => {
    if (!kickoffTime) return '';
    
    const date = new Date(kickoffTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const matchDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate days difference
    const diffTime = matchDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // Format date and time in user's timezone
    const dateOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    const dayOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'short' 
    };
    
    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
    const formattedDay = date.toLocaleDateString('en-US', dayOptions);
    
    // Show relative date for near matches
    let dateDisplay = formattedDate;
    if (diffDays === 0) {
      dateDisplay = 'Today';
    } else if (diffDays === 1) {
      dateDisplay = 'Tomorrow';
    } else if (diffDays === -1) {
      dateDisplay = 'Yesterday';
    } else if (diffDays > 1 && diffDays <= 7) {
      dateDisplay = formattedDay;
    }
    
    return `${dateDisplay} • ${formattedTime}`;
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
                      {availableGameweeks.map(gameweek => (
                        <SelectItem key={gameweek} value={gameweek.toString()}>
                          GW{gameweek}
                        </SelectItem>
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
                      {availableGameweeks.map(gameweek => (
                        <SelectItem key={gameweek} value={gameweek.toString()}>
                          GW{gameweek}
                        </SelectItem>
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
                Goals and Clean Sheet Projections
                <Badge className="bg-white/20 text-white border-white/30 ml-auto text-xs">
                  {filteredProjections.length} {filteredProjections.length === 1 ? 'match' : 'matches'}
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
                          <span className="text-xs text-gray-600 font-medium">{projections.length} {projections.length === 1 ? 'match' : 'matches'}</span>
                        </div>
                      </div>
                      
                      {/* Column Headers - Mobile: single row, Desktop: single or dual columns based on match count */}
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
                        
                        {/* Desktop header - single column when only 1 match */}
                        {projections.length === 1 && (
                          <div className="hidden lg:flex items-center justify-end px-3 space-x-2">
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
                        )}
                        
                        {/* Desktop header - dual columns when multiple matches */}
                        {projections.length > 1 && (
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
                        )}
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
                                  {/* Kickoff Time Header */}
                                  {match1.kickoffTime && (
                                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-3 py-1.5 border-b border-gray-100">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <Clock className="h-3 w-3 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-700">
                                          {formatKickoffTime(match1.kickoffTime)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
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
                                  {/* Kickoff Time Header */}
                                  {match2.kickoffTime && (
                                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-3 py-1.5 border-b border-gray-100">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <Clock className="h-3 w-3 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-700">
                                          {formatKickoffTime(match2.kickoffTime)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
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
                  <h4 className="font-semibold text-gray-900 mb-2">Calculation Methodology</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Pure performance-based calculations</li>
                    <li>• Real-time FPL API data integration</li>
                    <li>• Team averages: goals, xG, goals conceded, xGC</li>
                    <li>• Venue and context multipliers applied</li>
                    <li>• No fallback formulas or artificial constraints</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Metrics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Goals: Performance-based projections per match</li>
                    <li>• CS%: Probability based on goals against data</li>
                    <li>• Result: Live calculations from current standings</li>
                    <li>• Updated with every FPL API refresh</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
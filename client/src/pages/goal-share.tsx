import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Target, Users, TrendingUp, Calendar, Trophy, Filter } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface GoalShareData {
  gameweek: number;
  teamId: number;
  teamName: string;
  teamShort: string;
  expectedGoals: number;
  players: {
    id: number;
    name: string;
    position: string;
    goalShare: number; // Percentage
    projectedGoals: number; // Calculated goals based on share
  }[];
}

export default function GoalShare() {
  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: matchOddsData, isLoading: matchOddsLoading } = useQuery({
    queryKey: ["/api/results-projections"],
    staleTime: 10 * 60 * 1000,
  });

  // Generate goal share data based on match odds
  const goalShareData = useMemo(() => {
    if (!bootstrapData?.elements || !matchOddsData) return [];

    const data: GoalShareData[] = [];
    const teams = bootstrapData.teams;
    
    // Get current gameweek for filtering
    let currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id;
    if (!currentGameweek) {
      const nextEvent = bootstrapData.events.find((event: any) => !event.finished);
      currentGameweek = nextEvent?.id || 2;
    }

    // Process match odds data to create goal share breakdowns
    if (Array.isArray(matchOddsData)) {
      matchOddsData.forEach((match: any) => {
      const homeTeam = teams.find((t: any) => t.name === match.homeTeam);
      const awayTeam = teams.find((t: any) => t.name === match.awayTeam);

      if (homeTeam && awayTeam && match.homeExpectedGoals && match.awayExpectedGoals) {
        // Home team goal share
        const homePlayersInSquad = bootstrapData.elements.filter((p: any) => p.team === homeTeam.id);
        const homePlayerShares = distributeGoalShares(homePlayersInSquad, bootstrapData.element_types, match.homeExpectedGoals);
        
        data.push({
          gameweek: match.gameweek,
          teamId: homeTeam.id,
          teamName: match.homeTeam,
          teamShort: match.homeTeamShort,
          expectedGoals: match.homeExpectedGoals,
          players: homePlayerShares
        });

        // Away team goal share
        const awayPlayersInSquad = bootstrapData.elements.filter((p: any) => p.team === awayTeam.id);
        const awayPlayerShares = distributeGoalShares(awayPlayersInSquad, bootstrapData.element_types, match.awayExpectedGoals);
        
        data.push({
          gameweek: match.gameweek,
          teamId: awayTeam.id,
          teamName: match.awayTeam,
          teamShort: match.awayTeamShort,
          expectedGoals: match.awayExpectedGoals,
          players: awayPlayerShares
        });
      }
      });
    }

    return data;
  }, [bootstrapData, matchOddsData]);

  // Function to distribute goal shares among players
  function distributeGoalShares(players: any[], positions: any[], teamExpectedGoals: number) {
    const playerShares: any[] = [];
    let totalShare = 0;

    // Calculate base shares based on position and performance
    players.forEach((player: any) => {
      const position = positions.find((p: any) => p.id === player.element_type);
      const positionName = position?.singular_name;

      // Position-specific base shares
      const positionShares = {
        'Goalkeeper': 1,
        'Defender': 6,
        'Midfielder': 15,
        'Forward': 35
      };

      const baseShare = positionShares[positionName as keyof typeof positionShares] || 10;
      
      // Adjust based on current performance
      const formAdjustment = parseFloat(player.form) || 0;
      const pointsAdjustment = parseFloat(player.points_per_game) || 0;
      const performanceMultiplier = Math.max(0.3, Math.min(2.0, (formAdjustment + pointsAdjustment) / 10 + 0.5));
      
      const adjustedShare = baseShare * performanceMultiplier;
      
      playerShares.push({
        id: player.id,
        name: `${player.first_name} ${player.second_name}`,
        position: position?.singular_name_short || '',
        rawShare: adjustedShare
      });
      
      totalShare += adjustedShare;
    });

    // Normalize to 100% and calculate projected goals
    return playerShares.map(player => {
      const goalShare = Math.round((player.rawShare / totalShare) * 100);
      const projectedGoals = Math.round((goalShare / 100) * teamExpectedGoals * 100) / 100; // Round to 2 decimal places
      return {
        ...player,
        goalShare,
        projectedGoals
      };
    }).filter(p => p.goalShare > 0).sort((a, b) => b.goalShare - a.goalShare);
  }

  // Filter data
  const filteredData = useMemo(() => {
    return goalShareData.filter(item => {
      if (selectedGameweek !== "all" && item.gameweek !== parseInt(selectedGameweek)) return false;
      if (selectedTeam !== "all" && item.teamId !== parseInt(selectedTeam)) return false;
      return true;
    });
  }, [goalShareData, selectedGameweek, selectedTeam]);

  // Get available gameweeks
  const availableGameweeks = useMemo(() => {
    const gameweekSet = new Set(goalShareData.map(item => item.gameweek));
    const gameweeks = Array.from(gameweekSet).sort((a, b) => a - b);
    return gameweeks;
  }, [goalShareData]);

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-6 w-6 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-red-800 font-medium">Failed to load goal share data</h3>
                    <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Goal Involvement Share
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Team expected goals breakdown by player percentage share based on Match Odds data
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
                      <SelectItem value="all">All GWs</SelectItem>
                      {availableGameweeks.map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW {gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Team:</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {bootstrapData?.teams?.map(team => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {(isLoading || matchOddsLoading) && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Goal Share Cards */}
          {!isLoading && !matchOddsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredData.map((teamData, index) => (
                <Card key={`${teamData.teamId}_${teamData.gameweek}`} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        <span>{teamData.teamShort}</span>
                      </div>
                      <Badge variant="secondary" className="bg-white text-blue-600">
                        GW {teamData.gameweek}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm opacity-90">
                      Expected Goals: <span className="font-bold text-lg">{teamData.expectedGoals}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Column Headers */}
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-3 pb-2 border-b">
                      <span>Player</span>
                      <div className="flex items-center gap-4">
                        <span>Goals</span>
                        <span>Share</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {teamData.players.slice(0, 8).map((player, playerIndex) => (
                        <div key={player.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              playerIndex === 0 ? 'bg-gold text-yellow-800' :
                              playerIndex === 1 ? 'bg-gray-200 text-gray-700' :
                              playerIndex === 2 ? 'bg-orange-200 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {playerIndex + 1}
                            </span>
                            <div>
                              <div className="font-medium text-sm">{player.name}</div>
                              <div className="text-xs text-gray-500">{player.position}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {player.projectedGoals}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              player.goalShare >= 20 ? 'bg-blue-100 text-blue-800' :
                              player.goalShare >= 10 ? 'bg-green-100 text-green-800' :
                              player.goalShare >= 5 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {player.goalShare}%
                            </span>
                          </div>
                        </div>
                      ))}
                      {teamData.players.length > 8 && (
                        <div className="text-xs text-gray-500 text-center pt-2 border-t">
                          +{teamData.players.length - 8} more players with smaller shares
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && !matchOddsLoading && filteredData.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">No goal share data found for the selected filters.</p>
              </CardContent>
            </Card>
          )}

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Goal Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">How It Works</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Based on Match Odds expected goals data</li>
                    <li>• Position-weighted goal distribution</li>
                    <li>• Adjusted by current form and performance</li>
                    <li>• All players in a team total 100%</li>
                    <li>• Assists always ≤ goals for logical consistency</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Use Cases</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Identify primary goal threats per team</li>
                    <li>• Compare player involvement across fixtures</li>
                    <li>• Captain and transfer decision support</li>
                    <li>• Understand team attacking dynamics</li>
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
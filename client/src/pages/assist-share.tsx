import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Users, TrendingUp, Calendar, Trophy, Filter, Zap } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AssistShareData {
  gameweek: number;
  teamId: number;
  teamName: string;
  teamShort: string;
  expectedAssists: number;
  players: {
    id: number;
    name: string;
    position: string;
    assistShare: number; // Percentage
  }[];
}

export default function AssistShare() {
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

  // Generate assist share data based on match odds
  const assistShareData = useMemo(() => {
    if (!bootstrapData?.elements || !matchOddsData) return [];

    const data: AssistShareData[] = [];
    const teams = bootstrapData.teams;
    
    // Get current gameweek for filtering
    let currentGameweek = bootstrapData.events.find((event: any) => event.is_current)?.id;
    if (!currentGameweek) {
      const nextEvent = bootstrapData.events.find((event: any) => !event.finished);
      currentGameweek = nextEvent?.id || 2;
    }

    // Process match odds data to create assist share breakdowns
    matchOddsData.forEach((match: any) => {
      const homeTeam = teams.find((t: any) => t.name === match.homeTeam);
      const awayTeam = teams.find((t: any) => t.name === match.awayTeam);

      if (homeTeam && awayTeam && match.homeExpectedGoals && match.awayExpectedGoals) {
        // Home team assist share (assists typically ~65% of goals)
        const homeExpectedAssists = match.homeExpectedGoals * 0.65;
        const homePlayersInSquad = bootstrapData.elements.filter((p: any) => p.team === homeTeam.id);
        const homePlayerShares = distributeAssistShares(homePlayersInSquad, bootstrapData.element_types);
        
        data.push({
          gameweek: match.gameweek,
          teamId: homeTeam.id,
          teamName: match.homeTeam,
          teamShort: match.homeTeamShort,
          expectedAssists: Math.round(homeExpectedAssists * 100) / 100,
          players: homePlayerShares
        });

        // Away team assist share
        const awayExpectedAssists = match.awayExpectedGoals * 0.65;
        const awayPlayersInSquad = bootstrapData.elements.filter((p: any) => p.team === awayTeam.id);
        const awayPlayerShares = distributeAssistShares(awayPlayersInSquad, bootstrapData.element_types);
        
        data.push({
          gameweek: match.gameweek,
          teamId: awayTeam.id,
          teamName: match.awayTeam,
          teamShort: match.awayTeamShort,
          expectedAssists: Math.round(awayExpectedAssists * 100) / 100,
          players: awayPlayerShares
        });
      }
    });

    return data;
  }, [bootstrapData, matchOddsData]);

  // Function to distribute assist shares among players
  function distributeAssistShares(players: any[], positions: any[]) {
    const playerShares: any[] = [];
    let totalShare = 0;

    // Calculate base shares based on position and creativity
    players.forEach((player: any) => {
      const position = positions.find((p: any) => p.id === player.element_type);
      const positionName = position?.singular_name;

      // Position-specific base assist shares (different from goals)
      const positionShares = {
        'Goalkeeper': 0.5,
        'Defender': 8,
        'Midfielder': 25,
        'Forward': 12
      };

      const baseShare = positionShares[positionName as keyof typeof positionShares] || 15;
      
      // Adjust based on creativity and current performance
      const creativityAdjustment = Math.max(0.5, Math.min(2.0, (player.creativity || 0) / 50 + 0.5));
      const formAdjustment = parseFloat(player.form) || 0;
      const assistsAdjustment = Math.max(0.5, Math.min(2.0, (player.assists || 0) * 2 + 0.5));
      
      const performanceMultiplier = Math.max(0.3, Math.min(2.5, 
        (creativityAdjustment + (formAdjustment / 10) + assistsAdjustment) / 3
      ));
      
      const adjustedShare = baseShare * performanceMultiplier;
      
      playerShares.push({
        id: player.id,
        name: `${player.first_name} ${player.second_name}`,
        position: position?.singular_name_short || '',
        rawShare: adjustedShare
      });
      
      totalShare += adjustedShare;
    });

    // Normalize to 100%
    return playerShares.map(player => ({
      ...player,
      assistShare: Math.round((player.rawShare / totalShare) * 100)
    })).filter(p => p.assistShare > 0).sort((a, b) => b.assistShare - a.assistShare);
  }

  // Filter data
  const filteredData = useMemo(() => {
    return assistShareData.filter(item => {
      if (selectedGameweek !== "all" && item.gameweek !== parseInt(selectedGameweek)) return false;
      if (selectedTeam !== "all" && item.teamId !== parseInt(selectedTeam)) return false;
      return true;
    });
  }, [assistShareData, selectedGameweek, selectedTeam]);

  // Get available gameweeks
  const availableGameweeks = useMemo(() => {
    const gameweeks = [...new Set(assistShareData.map(item => item.gameweek))].sort((a, b) => a - b);
    return gameweeks;
  }, [assistShareData]);

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Zap className="h-6 w-6 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-red-800 font-medium">Failed to load assist share data</h3>
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Assist Involvement Share
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Team expected assists breakdown by player percentage share based on Match Odds data
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          )}

          {/* Assist Share Cards */}
          {!isLoading && !matchOddsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredData.map((teamData, index) => (
                <Card key={`${teamData.teamId}_${teamData.gameweek}`} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        <span>{teamData.teamShort}</span>
                      </div>
                      <Badge variant="secondary" className="bg-white text-green-600">
                        GW {teamData.gameweek}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm opacity-90">
                      Expected Assists: <span className="font-bold text-lg">{teamData.expectedAssists}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {teamData.players.slice(0, 8).map((player, playerIndex) => (
                        <div key={player.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              playerIndex === 0 ? 'bg-gold text-yellow-800' :
                              playerIndex === 1 ? 'bg-gray-200 text-gray-700' :
                              playerIndex === 2 ? 'bg-orange-200 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {playerIndex + 1}
                            </span>
                            <div>
                              <div className="font-medium text-sm">{player.name}</div>
                              <div className="text-xs text-gray-500">{player.position}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              player.assistShare >= 20 ? 'bg-green-100 text-green-800' :
                              player.assistShare >= 15 ? 'bg-blue-100 text-blue-800' :
                              player.assistShare >= 10 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {player.assistShare}%
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
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">No assist share data found for the selected filters.</p>
              </CardContent>
            </Card>
          )}

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Assist Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">How It Works</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Based on Match Odds expected goals data</li>
                    <li>• Assists calculated as ~65% of team goals</li>
                    <li>• Weighted by creativity and assist history</li>
                    <li>• Midfielders prioritized for assist distribution</li>
                    <li>• All players in a team total 100%</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Use Cases</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Identify primary assist providers per team</li>
                    <li>• Compare creative players across fixtures</li>
                    <li>• Midfielder and wingback selection support</li>
                    <li>• Understand team's attacking creativity</li>
                    <li>• Captain choice for assist hunters</li>
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
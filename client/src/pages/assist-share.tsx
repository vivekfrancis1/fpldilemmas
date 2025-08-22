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
    rawShare: number;
    assistShare: number; // Percentage
    projectedAssists: number;
  }[];
}

export default function AssistShare() {
  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Get current gameweek for the API call
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 2;
    
    let gameweek = bootstrapData.events.find((event: any) => event.is_current)?.id;
    if (!gameweek) {
      const nextEvent = bootstrapData.events.find((event: any) => !event.finished);
      gameweek = nextEvent?.id || 2;
    }
    return gameweek;
  }, [bootstrapData]);

  // Use the dedicated assist-share API endpoint
  const { data: assistShareData = [], isLoading: assistShareLoading } = useQuery<AssistShareData[]>({
    queryKey: ["/api/assist-share", currentGameweek],
    staleTime: 10 * 60 * 1000,
    enabled: !!currentGameweek
  });

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
              Team expected assists breakdown by player percentage share with data consistency
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
          {(isLoading || assistShareLoading) && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          )}

          {/* Assist Share Cards */}
          {!isLoading && !assistShareLoading && (
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
                              {player.assistShare.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              {player.projectedAssists.toFixed(2)}
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

          {!isLoading && !assistShareLoading && filteredData.length === 0 && (
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
                    <li>• Based on deterministic expected assists calculations</li>
                    <li>• Weighted by creativity, form, and assist history</li>
                    <li>• Ensures assists ≤ goals constraint for logical consistency</li>
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
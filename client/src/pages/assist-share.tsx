import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Calendar, Trophy, Filter, Zap } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SeasonAssistShareData {
  gameweek: number; // Always 0 for season-long data
  teamId: number;
  teamName: string;
  teamShort: string;
  expectedAssists: number; // Season total
  players: {
    id: number;
    name: string;
    position: string;
    assistShare: number; // Percentage of team's season assists
    projectedAssists: number; // Season total projected assists
    xaPer90?: number; // xA per 90 minutes (enhanced methodology)
  }[];
}

export default function AssistShare() {
  const [selectedSeason, setSelectedSeason] = useState<string>("current");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch available seasons
  const { data: seasonsData } = useQuery<string[]>({
    queryKey: ["/api/seasons"],
    staleTime: 15 * 60 * 1000,
  });

  // Fetch assist share data from cached database for ultra-fast loading
  const { data: assistShareData, isLoading: assistShareLoading } = useQuery<SeasonAssistShareData[]>({
    queryKey: selectedSeason === "current" ? ["/api/cached/assist-share"] : ["/api/assist-share-historical", selectedSeason],
    enabled: selectedSeason === "current" || (selectedSeason !== "current" && !!selectedSeason),
    staleTime: 30 * 60 * 1000, // 30 minutes - data updated hourly
  });

  // Use season assist share data directly from API
  const processedAssistShareData = useMemo(() => {
    if (!assistShareData || !Array.isArray(assistShareData)) return [];
    return assistShareData;
  }, [assistShareData]);

  // Filter data by team only (no gameweek filtering for season data)
  const filteredData = useMemo(() => {
    return processedAssistShareData.filter(item => {
      if (selectedTeam !== "all" && item.teamId !== parseInt(selectedTeam)) return false;
      return true;
    });
  }, [processedAssistShareData, selectedTeam]);

  // Sort teams by total expected assists for better display
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => b.expectedAssists - a.expectedAssists);
  }, [filteredData]);

  if (error) {
    return (
      
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
      
    );
  }

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              {selectedSeason === "current" ? "Season Assist Share Projections" : `${selectedSeason} Assist Share Analysis`}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              {selectedSeason === "current" 
                ? "Each player's percentage share of their team's expected assists for the entire remaining season, optimized using historical patterns"
                : `Each player's percentage share of their team's actual assists provided in the ${selectedSeason} season`
              }
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <label className="text-sm font-semibold text-gray-700">Season:</label>
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger className="w-44 border-2 border-gray-200 hover:border-green-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">2025-26 Projections</SelectItem>
                      {seasonsData?.sort((a, b) => b.localeCompare(a)).map(season => (
                        <SelectItem key={season} value={season}>{season}</SelectItem>
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
              {sortedData.map((teamData, index) => (
                <Card key={`${teamData.teamId}_${teamData.gameweek}`} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <span>{teamData.teamShort}</span>
                      </div>
                      <Badge variant="secondary" className="bg-white text-teal-600">
                        {selectedSeason === "current" ? "Season Projection" : selectedSeason}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm opacity-90">
                      {selectedSeason === "current" ? "Expected" : "Total"} Assists: <span className="font-bold text-lg">{(teamData.expectedAssists || 0).toFixed(0)}</span>
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
                              {(player.assistShare || 0).toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              {(player.projectedAssists || 0).toFixed(1)} {selectedSeason === "current" ? "proj" : "actual"}
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

          {!isLoading && !assistShareLoading && sortedData.length === 0 && (
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
                    {selectedSeason === "current" ? (
                      <>
                        <li>• Season-long assist projections using advanced statistical modeling</li>
                        <li>• Enhanced with historical assist data from 2016-2024 seasons</li>
                        <li>• Elite assist providers identified from 5+ year Premier League history</li>
                        <li>• Advanced creativity metrics and ICT index correlation analysis</li>
                        <li>• Set piece responsibility and playing time factors included</li>
                        <li>• All players in a team total 100% with logical consistency</li>
                      </>
                    ) : (
                      <>
                        <li>• Historical assist data from actual {selectedSeason} season performance</li>
                        <li>• Shows each player's actual assist contribution to their team</li>
                        <li>• Based on real match results and official FPL records</li>
                        <li>• Percentage shares calculated from total team assists scored</li>
                        <li>• Useful for identifying consistent assist providers over time</li>
                        <li>• All percentages add up to 100% per team for accuracy</li>
                      </>
                    )}
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
    
  );
}
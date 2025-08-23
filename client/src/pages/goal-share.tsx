import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, Users, TrendingUp, Calendar, Trophy, Filter } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SeasonGoalShareData {
  gameweek: number; // Always 0 for season-long data
  teamId: number;
  teamName: string;
  teamShort: string;
  expectedGoals: number; // Season total
  players: {
    id: number;
    name: string;
    position: string;
    goalShare: number; // Percentage of team's season goals
    projectedGoals: number; // Season total projected goals
  }[];
}

export default function GoalShare() {
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

  // Fetch goal share data based on selected season
  const { data: goalShareData, isLoading: goalShareLoading } = useQuery<SeasonGoalShareData[]>({
    queryKey: selectedSeason === "current" ? ["/api/goal-share-season"] : ["/api/goal-share-historical", selectedSeason],
    enabled: selectedSeason === "current" || (selectedSeason !== "current" && !!selectedSeason),
    staleTime: 10 * 60 * 1000,
  });

  // Use season goal share data directly from API
  const processedGoalShareData = useMemo(() => {
    if (!goalShareData || !Array.isArray(goalShareData)) return [];
    return goalShareData;
  }, [goalShareData]);

  // Filter data by team only (no gameweek filtering for season data)
  const filteredData = useMemo(() => {
    return processedGoalShareData.filter(item => {
      if (selectedTeam !== "all" && item.teamId !== parseInt(selectedTeam)) return false;
      return true;
    });
  }, [processedGoalShareData, selectedTeam]);

  // Sort teams by total expected goals for better display
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => b.expectedGoals - a.expectedGoals);
  }, [filteredData]);

  if (error) {
    return (
      
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
      
    );
  }

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              {selectedSeason === "current" ? "Season Goal Share Projections" : `${selectedSeason} Goal Share Analysis`}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              {selectedSeason === "current" 
                ? "Each player's percentage share of their team's expected goals for the entire remaining season, optimized using historical patterns"
                : `Each player's percentage share of their team's actual goals scored in the ${selectedSeason} season`
              }
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-700">Season:</label>
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger className="w-44 border-2 border-gray-200 hover:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">2025-26 Projections</SelectItem>
                      {seasonsData?.map(season => (
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
          {(isLoading || goalShareLoading) && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Season Goal Share Cards */}
          {isLoading || goalShareLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sortedData.length === 0 ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-orange-800 mb-2">No Season Goal Share Data Available</h3>
                <p className="text-orange-600">No season goal involvement data found for the selected team filter.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedData.map((team) => (
                <Card key={team.teamId} className="shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{team.teamShort}</span>
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">{team.teamName}</CardTitle>
                          <p className="text-sm text-gray-500">
                            {selectedSeason === "current" ? "Expected Goals:" : "Actual Goals:"} 
                            <span className="font-semibold text-gray-700">{selectedSeason === "current" ? team.expectedGoals.toFixed(2) : team.expectedGoals.toFixed(0)}</span>
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                        {team.players.length} players
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {team.players.slice(0, 10).map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-bold text-xs">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{player.name}</p>
                              <p className="text-xs text-gray-500">{player.position}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200 font-bold"
                              >
                                {player.goalShare.toFixed(1)}%
                              </Badge>
                              <span className="text-xs text-gray-500 font-medium">
                                {selectedSeason === "current" ? player.projectedGoals.toFixed(1) : player.projectedGoals} goals
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {team.players.length > 10 && (
                        <div className="text-center pt-2">
                          <Badge variant="outline" className="text-xs text-gray-500">
                            +{team.players.length - 10} more players
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                    {selectedSeason === "current" ? (
                      <>
                        <li>• Aggregates expected goals across entire remaining season</li>
                        <li>• Position-weighted goal distribution</li>
                        <li>• Adjusted by historical performance and form</li>
                        <li>• All players in a team total 100%</li>
                        <li>• Shows season-long goal involvement patterns</li>
                      </>
                    ) : (
                      <>
                        <li>• Based on actual goals scored in {selectedSeason}</li>
                        <li>• Calculated from real historical data</li>
                        <li>• Shows actual goal distribution patterns</li>
                        <li>• All players in a team total 100%</li>
                        <li>• Reveals past season performance trends</li>
                      </>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Use Cases</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedSeason === "current" ? (
                      <>
                        <li>• Identify season-long goal threats per team</li>
                        <li>• Compare player value for long-term planning</li>
                        <li>• Season captain and transfer decision support</li>
                        <li>• Understand team attacking hierarchy</li>
                      </>
                    ) : (
                      <>
                        <li>• Analyze historical goal involvement patterns</li>
                        <li>• Compare past vs current season performances</li>
                        <li>• Identify consistent goal threats over time</li>
                        <li>• Understand historical team dynamics</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
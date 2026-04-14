import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, TrendingUp, Calendar, Trophy, Filter, Zap, Target, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SeasonAssistShareData {
  gameweek: number; // 0 for season-long data, or specific gameweek for range data
  teamId: number;
  teamName: string;
  teamShort: string;
  expectedAssists: number; // Total assists for the gameweek range
  players: {
    playerId: number;
    playerName: string;
    position: string;
    assistShare: number; // Percentage of team's assists for the range
    projectedAssists: number; // Total projected assists for the range
    xaPer90?: number; // xA per 90 minutes (enhanced methodology)
  }[];
}

type FilterOption = 'full' | 'last6' | 'last8' | 'last12';

export default function AssistShare() {
  const queryClient = useQueryClient();
  
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("full");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch current season assist share data using simplified calculation with filter
  const { data: assistShareData, isLoading: assistShareLoading } = useQuery<SeasonAssistShareData[]>({
    queryKey: ["/api/assist-share-season", selectedFilter],
    queryFn: async () => {
      const response = await fetch(`/api/assist-share-season?filter=${selectedFilter}`);
      if (!response.ok) throw new Error('Failed to fetch assist share data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for fresh data
  });

  // Dynamic label based on filter
  const filterLabel = useMemo(() => {
    switch (selectedFilter) {
      case 'last6': return 'Last 6 Gameweeks Total';
      case 'last8': return 'Last 8 Gameweeks Total';
      case 'last12': return 'Last 12 Gameweeks Total';
      default: return 'Season Total';
    }
  }, [selectedFilter]);

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

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await queryClient.invalidateQueries({ queryKey: ["/api/assist-share-season", selectedFilter] });
      await queryClient.refetchQueries({ queryKey: ["/api/assist-share-season", selectedFilter] });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="w-full py-4 sm:py-8">
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
        <div className="w-full py-4 sm:py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Assist Share - 2025/26 Season
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Each player's percentage share of their team's assists using current season data (assists + expected assists)
            </p>
            <div className="mt-6">
              <Button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 disabled:opacity-50"
                data-testid="button-refresh-data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </div>

          {/* Controls */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <Card className="mb-6">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Filters & Options</span>
                      <span className="text-xs text-gray-500 font-normal md:hidden">
                        (Tap to {isFiltersOpen ? 'collapse' : 'expand'})
                      </span>
                    </div>
                    {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <label className="text-sm font-medium text-gray-700">Period:</label>
                      <Select value={selectedFilter} onValueChange={(val) => setSelectedFilter(val as FilterOption)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Season</SelectItem>
                          <SelectItem value="last6">Last 6 Gameweeks</SelectItem>
                          <SelectItem value="last8">Last 8 Gameweeks</SelectItem>
                          <SelectItem value="last12">Last 12 Gameweeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-green-600" />
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
              </CollapsibleContent>
            </Card>
          </Collapsible>

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
                        2025/26
                      </Badge>
                    </CardTitle>
                    <div className="text-sm opacity-90">
                      {filterLabel} (Assists + xA): <span className="font-bold text-lg">{(teamData?.expectedAssists || 0).toFixed(1)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {(teamData.players || []).map((player, playerIndex) => (
                        <div key={player.playerId} className="flex items-center justify-between">
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
                              <div className="font-medium text-sm">{player.playerName}</div>
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
                              {(player.projectedAssists || 0).toFixed(1)} total
                            </span>
                          </div>
                        </div>
                      ))}
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
                    <li>• Simple formula: (Assists + Expected Assists) / Team Total × 100</li>
                    <li>• Uses current 2025/26 season data only</li>
                    <li>• Combines actual assists with expected assists for better accuracy</li>
                    <li>• All players in a team total 100%</li>
                    <li>• Shows each player's contribution to team's assist output</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Use Cases</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Identify top assist providers in each team</li>
                    <li>• Compare players for transfer decisions</li>
                    <li>• Captain selection based on assist involvement</li>
                    <li>• Understand team creativity patterns</li>
                    <li>• Find value picks with high assist share</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
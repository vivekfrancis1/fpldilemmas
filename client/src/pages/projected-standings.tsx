import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, TrendingUp, Target, Users, RefreshCw, Calendar } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TeamStanding {
  id: number;
  name: string;
  shortName: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  actualGames: number;
  projectedGames: number;
}

export default function ProjectedStandings() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 2;
  const maxEndGameweek = Math.min(currentGameweek + 6, 38); // Next 6 gameweeks (excluding current)
  const [selectedEndGameweek, setSelectedEndGameweek] = useState<number | null>(null);
  
  // Initialize selectedEndGameweek when bootstrapData is loaded
  useEffect(() => {
    if (bootstrapData && selectedEndGameweek === null) {
      setSelectedEndGameweek(maxEndGameweek);
    }
  }, [bootstrapData, maxEndGameweek, selectedEndGameweek]);

  const { data: standingsData, isLoading: standingsLoading } = useQuery<TeamStanding[]>({
    queryKey: ["/api/projected-standings", selectedEndGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/projected-standings?endGameweek=${selectedEndGameweek}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projected standings');
      }
      return response.json();
    },
    enabled: !!bootstrapData && selectedEndGameweek !== null,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/projected-standings"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/bootstrap-static"] });
    setIsRefreshing(false);
  };

  const handleEndGameweekChange = (value: string) => {
    setSelectedEndGameweek(parseInt(value));
  };

  const getPositionColor = (position: number) => {
    if (position <= 4) return 'bg-green-500 text-white'; // Champions League
    if (position === 5 || position === 6) return 'bg-blue-500 text-white'; // Europa League
    if (position === 7) return 'bg-purple-500 text-white'; // Conference League
    if (position >= 18) return 'bg-red-500 text-white'; // Relegation
    return 'bg-gray-500 text-white'; // Mid-table
  };

  const getPositionBadge = (position: number) => {
    if (position <= 4) return 'UCL';
    if (position === 5 || position === 6) return 'UEL';
    if (position === 7) return 'UECL';
    if (position >= 18) return 'REL';
    return '';
  };

  if (isLoading || standingsLoading) {
    return (
      
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      
    );
  }

  const totalGameweeks = selectedEndGameweek || maxEndGameweek;

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Trophy className="h-8 w-8" />
            <h1>Projected Standings</h1>
          </div>
          <p className="fpl-page-subtitle">
            Premier League table based on actual results and projected outcomes for next 6 gameweeks
          </p>
          <div className="mt-6">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-refresh-standings"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Standings'}
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

          {/* Filter Controls */}
          <Card className="mb-6 shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-6 items-center justify-between">
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Current Gameweek: {currentGameweek}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Based on: Actual + Projected Results</span>
                  </div>
                </div>
                
                {/* Gameweek Filter */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <Label htmlFor="end-gameweek" className="text-sm font-semibold text-gray-700">
                      Project to GW:
                    </Label>
                  </div>
                  <Select
                    value={selectedEndGameweek?.toString() || ""}
                    onValueChange={handleEndGameweekChange}
                    disabled={!bootstrapData || selectedEndGameweek === null}
                  >
                    <SelectTrigger className="w-24" data-testid="select-end-gameweek">
                      <SelectValue placeholder="Loading..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bootstrapData && Array.from({ length: 6 }, (_, i) => {
                        const gw = currentGameweek + 1 + i;
                        return (
                          <SelectItem key={gw} value={gw.toString()}>
                            {gw}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standings Table */}
          <Card className="overflow-hidden shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Trophy className="h-6 w-6" />
                Projected Table
                <Badge className="bg-white/20 text-white border-white/30 ml-auto">
                  {totalGameweeks} gameweeks
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        W
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        D
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        L
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GF
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GA
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GD
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {standingsData?.map((team) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`standing-row-${team.shortName}`}>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPositionColor(team.position)}`}>
                              {team.position}
                            </div>
                            {getPositionBadge(team.position) && (
                              <Badge variant="outline" className="text-xs">
                                {getPositionBadge(team.position)}
                              </Badge>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{team.name}</div>
                              <div className="text-xs text-gray-500">{team.shortName}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {team.played}
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-green-600">
                          {team.wins}
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-600">
                          {team.draws}
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-red-600">
                          {team.losses}
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {Math.round(team.goalsFor)}
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {Math.round(team.goalsAgainst)}
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-medium">
                          <span className={team.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {team.goalDifference >= 0 ? '+' : ''}{Math.round(team.goalDifference)}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center text-sm font-bold text-gray-900">
                          {team.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Table Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Position Colors</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      1st-4th: Champions League
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      5th-6th: Europa League
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      7th: Conference League
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      18th-20th: Relegation
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Projection Details</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Based on current results + expected outcomes</li>
                    <li>• Goals rounded to nearest whole number</li>
                    <li>• Updated after each gameweek</li>
                    <li>• Combines actual and projected data</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
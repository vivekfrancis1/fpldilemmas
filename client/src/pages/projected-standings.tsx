import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, TrendingUp, Target, Users, RefreshCw, Calendar, History } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  actualGames?: number;
  projectedGames?: number;
}

export default function ProjectedStandings() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"current" | "projected">("projected");
  const queryClient = useQueryClient();

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 2;
  const lastFinishedGameweek = useMemo(() => {
    if (!bootstrapData?.events) return currentGameweek - 1;
    const finishedEvents = bootstrapData.events.filter(e => e.finished);
    return finishedEvents.length > 0 ? Math.max(...finishedEvents.map(e => e.id)) : currentGameweek - 1;
  }, [bootstrapData?.events, currentGameweek]);
  
  const maxEndGameweek = Math.min(currentGameweek + 12, 38);
  const [selectedEndGameweek, setSelectedEndGameweek] = useState<number | null>(null);
  
  useEffect(() => {
    if (bootstrapData && selectedEndGameweek === null) {
      if (viewMode === "projected") {
        setSelectedEndGameweek(maxEndGameweek);
      } else {
        setSelectedEndGameweek(lastFinishedGameweek);
      }
    }
  }, [bootstrapData, maxEndGameweek, lastFinishedGameweek, selectedEndGameweek, viewMode]);

  useEffect(() => {
    if (viewMode === "projected") {
      setSelectedEndGameweek(maxEndGameweek);
    } else {
      setSelectedEndGameweek(lastFinishedGameweek);
    }
  }, [viewMode, maxEndGameweek, lastFinishedGameweek]);

  const { data: projectedStandingsData, isLoading: projectedLoading } = useQuery<TeamStanding[]>({
    queryKey: ["/api/projected-standings", selectedEndGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/projected-standings?endGameweek=${selectedEndGameweek}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projected standings');
      }
      return response.json();
    },
    enabled: viewMode === "projected" && !!bootstrapData && selectedEndGameweek !== null,
  });

  const { data: currentStandingsData, isLoading: currentLoading } = useQuery<TeamStanding[]>({
    queryKey: ["/api/current-standings"],
    queryFn: async () => {
      const response = await fetch(`/api/current-standings?venue=all`);
      if (!response.ok) {
        throw new Error('Failed to fetch current standings');
      }
      return response.json();
    },
    enabled: viewMode === "current" && !!bootstrapData,
  });

  const standingsData = viewMode === "projected" ? projectedStandingsData : currentStandingsData;
  const standingsLoading = viewMode === "projected" ? projectedLoading : currentLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (viewMode === "projected") {
      await queryClient.invalidateQueries({ queryKey: ["/api/projected-standings"] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ["/api/current-standings"] });
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/bootstrap-static"] });
    setIsRefreshing(false);
  };

  const handleEndGameweekChange = (value: string) => {
    setSelectedEndGameweek(parseInt(value));
  };

  const getPositionColor = (position: number) => {
    if (position <= 5) return 'bg-green-500 text-white';
    if (position >= 18) return 'bg-red-500 text-white';
    return 'bg-gray-500 text-white';
  };

  if (isLoading || standingsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalGameweeks = selectedEndGameweek || (viewMode === "projected" ? maxEndGameweek : lastFinishedGameweek);

  return (
    <div className="fpl-page-container">
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Trophy className="h-8 w-8" />
            <h1>{viewMode === "projected" ? "Projected Standings" : "Current Standings"}</h1>
          </div>
          <p className="fpl-page-subtitle">
            {viewMode === "projected" 
              ? "Premier League table based on actual results and projected outcomes"
              : "Premier League table based on actual results up to the last finished gameweek"}
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">
        <Card className="mb-6 shadow-md border-0">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={viewMode === "current" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("current")}
                  className={`flex items-center gap-1.5 ${viewMode === "current" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
                >
                  <History className="h-4 w-4" />
                  Current
                </Button>
                <Button
                  variant={viewMode === "projected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("projected")}
                  className={`flex items-center gap-1.5 ${viewMode === "projected" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Projected
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="text-xs md:text-sm font-semibold text-gray-700">
                      {viewMode === "projected" ? `Current GW: ${currentGameweek}` : `Last Finished: GW${lastFinishedGameweek}`}
                    </span>
                  </div>
                </div>
                
                {viewMode === "projected" && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <Label htmlFor="end-gameweek" className="text-xs md:text-sm font-semibold text-gray-700">
                      Project to:
                    </Label>
                    <Select
                      value={selectedEndGameweek?.toString() || ""}
                      onValueChange={handleEndGameweekChange}
                      disabled={!bootstrapData || selectedEndGameweek === null}
                    >
                      <SelectTrigger className="w-20" data-testid="select-end-gameweek">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bootstrapData && Array.from({ length: 12 }, (_, i) => {
                          const gw = currentGameweek + 1 + i;
                          if (gw > 38) return null;
                          return (
                            <SelectItem key={gw} value={gw.toString()}>
                              GW{gw}
                            </SelectItem>
                          );
                        }).filter(Boolean)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5" />
                {viewMode === "projected" ? "Projected Table" : "Current Table"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs"
                  data-testid="button-refresh-standings"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? '...' : 'Refresh'}
                </Button>
                <span className="px-2 py-1 text-xs bg-white/20 text-white border border-white/30 rounded">
                  {viewMode === "projected" ? `To GW${totalGameweeks}` : `GW${totalGameweeks}`}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Pos
                    </th>
                    <th className="px-1 md:px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Team
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      P
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      W
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      D
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      L
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      GF
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      GA
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      GD
                    </th>
                    <th className="px-1 md:px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {standingsData?.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50" data-testid={`standing-row-${team.shortName}`}>
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center">
                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs font-bold ${getPositionColor(team.position)}`}>
                          {team.position}
                        </div>
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2">
                        <div className="flex items-center gap-1">
                          {(() => {
                            const teamData = bootstrapData?.teams?.find((t: any) => t.short_name === team.shortName || t.name === team.name);
                            const teamCode = teamData?.code;
                            return teamCode ? (
                              <img 
                                src={teamCode === 14 
                                  ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                  : `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`}
                                alt={`${team.name} badge`}
                                className="w-4 h-4 md:w-5 md:h-5 object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : null;
                          })()}
                          <span className="text-xs md:text-sm font-medium text-gray-900">{team.shortName}</span>
                        </div>
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-medium text-gray-900">
                        {team.played}
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-medium text-green-600">
                        {team.wins}
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-medium text-gray-600">
                        {team.draws}
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-medium text-red-600">
                        {team.losses}
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-medium text-gray-900">
                        {Math.round(team.goalsFor)}
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-medium text-gray-900">
                        {Math.round(team.goalsAgainst)}
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-medium">
                        <span className={team.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {team.goalDifference >= 0 ? '+' : ''}{Math.round(team.goalDifference)}
                        </span>
                      </td>
                      
                      <td className="px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm font-bold text-gray-900">
                        {team.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
                    1st-5th: Champions League
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    18th-20th: Relegation
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  {viewMode === "projected" ? "Projection Details" : "Data Source"}
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {viewMode === "projected" ? (
                    <>
                      <li>• Based on current results + expected outcomes</li>
                      <li>• Projected results use team goal projections</li>
                      <li>• Updates automatically with new data</li>
                    </>
                  ) : (
                    <>
                      <li>• Based on actual match results</li>
                      <li>• Data up to GW{lastFinishedGameweek}</li>
                      <li>• Official FPL API data</li>
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

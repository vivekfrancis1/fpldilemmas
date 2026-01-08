import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Filter, BarChart3, Trophy, Zap, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TeamAssistProjection {
  id: number;
  team: string;
  teamShort: string;
  teamBadge?: string;
  gameweekProjections: {
    [gameweek: number]: number;
  };
  totalAssists: number;
  averageAssistsPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamAssistProjections() {
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Calculate dynamic gameweek ranges based on current gameweek
  const { defaultStart, defaultEnd } = useMemo(() => {
    const range = getDefaultGameweekRange(bootstrapData?.events || [], 6);
    return {
      defaultStart: range.startGameweek || "6",
      defaultEnd: range.endGameweek || "11"
    };
  }, [bootstrapData]);
  
  const availableGameweeks = useMemo(() => 
    getNextGameweeksForDropdown(bootstrapData?.events || [], 12), [bootstrapData]
  );

  const [startGameweek, setStartGameweek] = useState<string>("6");
  const [endGameweek, setEndGameweek] = useState<string>("11");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Update state when defaults change
  useMemo(() => {
    if (defaultStart && defaultStart !== startGameweek) setStartGameweek(defaultStart);
    if (defaultEnd && defaultEnd !== endGameweek) setEndGameweek(defaultEnd);
  }, [defaultStart, defaultEnd]);

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamAssistProjection[]>({
    queryKey: ["/api/team-assist-projections"],
  });

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData
      .filter(team => selectedTeam === "all" || team.teamShort === selectedTeam)
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber] || 0;
          const bValue = b.gameweekProjections[gwNumber] || 0;
          return bValue - aValue;
        }
        
        switch (sortBy) {
          case "total": {
            // Calculate period total for sorting
            const startGW = parseInt(startGameweek);
            const endGW = parseInt(endGameweek);
            const aPeriodTotal = Object.keys(a.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw) => sum + (a.gameweekProjections[parseInt(gw)] || 0), 0);
            const bPeriodTotal = Object.keys(b.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw) => sum + (b.gameweekProjections[parseInt(gw)] || 0), 0);
            return bPeriodTotal - aPeriodTotal;
          }
          case "average": return b.averageAssistsPerGame - a.averageAssistsPerGame;
          case "position": return a.position - b.position;
          default: return b.averageAssistsPerGame - a.averageAssistsPerGame;
        }
      });
  }, [projectionsData, selectedTeam, sortBy]);

  const totalAssists = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const totalWeeks = endGW - startGW + 1;
    
    // Calculate totals for selected gameweek range
    for (let gwNumber = startGW; gwNumber <= endGW; gwNumber++) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    }
    
    const averagePerGame = overallTotal / totalWeeks;
    
    return { gameweekTotals, overallTotal, averagePerGame };
  }, [filteredProjections, bootstrapData, startGameweek, endGameweek]);

  // Helper functions for styling
  const getAssistsColor = (assists: number) => {
    if (assists >= 1.5) return "text-green-600 bg-green-50";
    if (assists >= 1.0) return "text-blue-600 bg-blue-50";
    if (assists >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return "bg-green-100 text-green-800 border-green-200";
      case 'Medium': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'Low': return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading || projectionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Team Assists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating team assist projections across the next 12 gameweeks...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Zap className="h-8 w-8" />
            <h1>Team Assist Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Assists for each team across all 38 gameweeks - actual assists for completed games, projections for upcoming games
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From GW
                    </label>
                    <Select value={startGameweek} onValueChange={setStartGameweek}>
                      <SelectTrigger data-testid="select-start-gameweek">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGameweeks.map((gw) => (
                          <SelectItem key={gw} value={gw.toString()}>
                            {gw}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To GW
                    </label>
                    <Select value={endGameweek} onValueChange={setEndGameweek}>
                      <SelectTrigger data-testid="select-end-gameweek">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGameweeks.map((gw) => (
                          <SelectItem key={gw} value={gw.toString()}>
                            {gw}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team
                    </label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger data-testid="select-team">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {bootstrapData?.teams && bootstrapData.teams
                          .sort((a: any, b: any) => a.name.localeCompare(b.name))
                          .map((team: any) => (
                            <SelectItem key={team.id} value={team.short_name}>
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

        {/* Team Assist Projections Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Assist Projections: Gameweeks {startGameweek}-{endGameweek}
              <Badge variant="outline" className="ml-2">
                {filteredProjections.length} teams
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-1 md:px-3 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                      Team
                    </th>
                    {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                      const gwNumber = parseInt(startGameweek) + i;
                      return (
                        <th 
                          key={gwNumber} 
                          className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[40px] md:min-w-[50px]"
                          onClick={() => setSortBy(`gw${gwNumber}`)}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="md:hidden">{gwNumber}</span>
                            <span className="hidden md:inline">GW{gwNumber}</span>
                            {sortBy === `gw${gwNumber}` && <TrendingUp className="h-3 w-3" />}
                          </div>
                        </th>
                      );
                    })}
                    <th 
                      className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors min-w-[50px] md:min-w-[70px]"
                      onClick={() => setSortBy('total')}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="md:hidden">Tot</span>
                        <span className="hidden md:inline">Total</span>
                        {sortBy === 'total' && <TrendingUp className="h-3 w-3" />}
                      </div>
                    </th>
                    <th 
                      className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                      onClick={() => setSortBy('average')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Avg/Game
                        {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjections.map((team, index) => (
                    <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-projection-row-${team.id}`}>
                      <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                          <div>
                            <div className="text-xs md:text-sm font-medium text-gray-900 md:hidden">{team.teamShort}</div>
                            <div className="text-xs md:text-sm font-medium text-gray-900 hidden md:block">{team.team}</div>
                            <div className="text-[10px] text-gray-500 hidden md:block">{team.teamShort}</div>
                          </div>
                        </div>
                      </td>
                      
                      {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, weekIndex) => {
                        const gwNumber = parseInt(startGameweek) + weekIndex;
                        const assists = team.gameweekProjections[gwNumber] || 0;
                        return (
                          <td key={weekIndex} className={`px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium min-w-[40px] md:min-w-[50px] ${getAssistsColor(assists)}`}>
                            {assists > 0 ? assists.toFixed(2) : "-"}
                          </td>
                        );
                      })}
                      
                      <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-50 min-w-[50px] md:min-w-[70px]">
                        <span className="text-sm md:text-lg font-bold text-blue-900">
                          {(() => {
                            const startGW = parseInt(startGameweek);
                            const endGW = parseInt(endGameweek);
                            const periodTotal = Object.keys(team.gameweekProjections)
                              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
                              .reduce((sum, gw) => sum + (team.gameweekProjections[parseInt(gw)] || 0), 0);
                            return periodTotal.toFixed(2);
                          })()}
                        </span>
                      </td>
                      
                      <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-gray-900 hidden md:table-cell">
                        {team.averageAssistsPerGame.toFixed(2)}
                      </td>
                      
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-gray-100 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 w-4">-</span>
                        <div>
                          <div className="text-xs md:text-sm font-bold text-gray-900">TOTAL</div>
                          <div className="text-[10px] text-gray-600 hidden md:block">All Teams</div>
                        </div>
                      </div>
                    </td>
                    
                    {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, weekIndex) => {
                      const gwNumber = parseInt(startGameweek) + weekIndex;
                      const gwTotal = totalAssists.gameweekTotals[gwNumber] || 0;
                      return (
                        <td key={weekIndex} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-gray-900 bg-gray-100 min-w-[40px] md:min-w-[50px]">
                          {gwTotal > 0 ? gwTotal.toFixed(2) : "-"}
                        </td>
                      );
                    })}
                    
                    <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-100 min-w-[50px] md:min-w-[70px]">
                      <span className="text-sm md:text-lg font-bold text-blue-900">
                        {totalAssists.overallTotal.toFixed(2)}
                      </span>
                    </td>
                    
                    <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-gray-900 bg-gray-100 hidden md:table-cell">
                      {totalAssists.averagePerGame.toFixed(2)}
                    </td>
                    
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest Single GW</CardTitle>
              <Trophy className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {Math.max(...Object.values(totalAssists.gameweekTotals)).toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">Expected assists in peak gameweek</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Per GW</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalAssists.averagePerGame.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">League average assists per gameweek</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Creative Team</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {filteredProjections.length > 0 ? filteredProjections[0].team : "-"}
              </div>
              <p className="text-xs text-gray-600">
                {filteredProjections.length > 0 ? `${filteredProjections[0].totalAssists.toFixed(2)} assists` : "No data"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
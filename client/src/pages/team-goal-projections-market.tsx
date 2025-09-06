import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Filter, BarChart3, Trophy, Info } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MarketTeamGoalProjection {
  id: number;
  team: string;
  teamShort: string;
  teamName: string;
  gameweekProjections: {
    [gameweek: number]: number;
  };
  totalProjectedGoals: number;
  averageGoalsPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
  marketSource: string;
  lastUpdated: string;
}

export default function MarketTeamGoalProjections() {
  const [startGameweek, setStartGameweek] = useState<string>("4");
  const [endGameweek, setEndGameweek] = useState<string>("9"); 
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<MarketTeamGoalProjection[]>({
    queryKey: ["/api/team-goal-projections-market"],
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
          case "average":
            return b.averageGoalsPerGame - a.averageGoalsPerGame;
          case "team":
            return a.teamShort.localeCompare(b.teamShort);
          default:
            return b.totalProjectedGoals - a.totalProjectedGoals;
        }
      });
  }, [projectionsData, selectedTeam, sortBy, startGameweek, endGameweek]);

  const totalGoals = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, seasonTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const totalWeeks = endGW - startGW + 1;
    
    // Calculate totals for selected gameweek range
    for (let gwNumber = startGW; gwNumber <= endGW; gwNumber++) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    }
    
    // Calculate rest of season total (gameweek 4 onwards)
    for (let gwNumber = 4; gwNumber <= 38; gwNumber++) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      seasonTotal += gwTotal;
    }
    
    const averagePerGame = overallTotal / totalWeeks;
    
    return { gameweekTotals, overallTotal, seasonTotal, averagePerGame };
  }, [filteredProjections, bootstrapData, startGameweek, endGameweek]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.5) return 'bg-green-50 text-green-800 font-semibold';
    if (goals >= 2.0) return 'bg-blue-50 text-blue-800 font-medium';
    if (goals >= 1.5) return 'bg-yellow-50 text-yellow-800';
    if (goals >= 1.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  if (isLoading || projectionsLoading) {
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
            <DollarSign className="h-8 w-8" />
            <h1>Market-Based Team Goals</h1>
          </div>
          <p className="fpl-page-subtitle">
            Team goal projections derived from spread betting market data and over/under totals - the most accurate predictions available
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Market Data Notice */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Market-Powered Accuracy:</strong> These projections use spread betting market data that incorporates real money stakes, 
            injury updates, form analysis, and professional trader insights for maximum accuracy.
          </AlertDescription>
        </Alert>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Start GW:</label>
                <Select value={startGameweek} onValueChange={setStartGameweek}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 35 }, (_, i) => (
                      <SelectItem key={i + 4} value={(i + 4).toString()}>
                        {i + 4}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">End GW:</label>
                <Select value={endGameweek} onValueChange={setEndGameweek}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 35 }, (_, i) => (
                      <SelectItem key={i + 4} value={(i + 4).toString()}>
                        {i + 4}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Team:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-32">
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

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Period Total</SelectItem>
                    <SelectItem value="average">Goals/Game</SelectItem>
                    <SelectItem value="team">Team Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Period Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{totalGoals.overallTotal.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goals/Week</p>
                  <p className="text-2xl font-bold text-gray-900">{totalGoals.averagePerGame.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Season Total</p>
                  <p className="text-2xl font-bold text-gray-900">{totalGoals.seasonTotal.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data Source</p>
                  <p className="text-sm font-bold text-gray-900">Betting Markets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projections Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Market-Based Goal Projections ({filteredProjections.length} teams)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Goals/Game
                    </th>
                    {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                      const gw = parseInt(startGameweek) + i;
                      return (
                        <th key={gw} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          GW{gw}
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjections.map((team) => {
                    const startGW = parseInt(startGameweek);
                    const endGW = parseInt(endGameweek);
                    const periodTotal = Object.keys(team.gameweekProjections)
                      .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
                      .reduce((sum, gw) => sum + (team.gameweekProjections[parseInt(gw)] || 0), 0);
                    const periodAverage = periodTotal / (endGW - startGW + 1);
                    
                    return (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-row-${team.teamShort}`}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{team.teamShort}</div>
                            <div className="text-xs text-gray-500 ml-2">#{team.position}</div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGoalsColor(periodTotal)}`}>
                            {periodTotal.toFixed(1)}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-gray-900 font-medium">
                            {periodAverage.toFixed(2)}
                          </span>
                        </td>
                        
                        {Array.from({ length: endGW - startGW + 1 }, (_, i) => {
                          const gw = startGW + i;
                          const goals = team.gameweekProjections[gw] || 0;
                          return (
                            <td key={gw} className="px-2 py-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getGoalsColor(goals)}`}>
                                {goals.toFixed(1)}
                              </span>
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-4 text-center">
                          <Badge className={getConfidenceColor(team.confidence)}>
                            {team.confidence}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Market Data Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">About Market-Based Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Market Data Sources</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Over/Under betting totals from major bookmakers</li>
                  <li>• Team spread lines and goal handicaps</li>
                  <li>• Live odds movements reflecting real-time information</li>
                  <li>• Professional trader sentiment and money flow</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Market Advantages</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real money stakes ensure maximum accuracy</li>
                  <li>• Instant incorporation of injuries and team news</li>
                  <li>• Form analysis from professional traders</li>
                  <li>• Weather, referee, and tactical factors included</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
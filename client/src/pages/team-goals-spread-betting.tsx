import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Filter, Calculator, DollarSign } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SpreadBettingData {
  id: number;
  gameweek: number;
  kickoffTime: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    totalGoalsSpread: { sell: number; buy: number };
    supremacySpread: { sell: number; buy: number };
    expectedGoals: number;
    confidence: 'High' | 'Medium' | 'Low';
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    totalGoalsSpread: { sell: number; buy: number };
    supremacySpread: { sell: number; buy: number };
    expectedGoals: number;
    confidence: 'High' | 'Medium' | 'Low';
  };
  matchData: {
    totalGoalsMidpoint: number;
    supremacyMidpoint: number;
    spreadConfidence: 'High' | 'Medium' | 'Low';
  };
}

export default function TeamGoalsSpreadBetting() {
  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("expected_goals");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: spreadBettingData, isLoading: spreadLoading } = useQuery<SpreadBettingData[]>({
    queryKey: ["/api/team-goals-spread-betting"],
  });

  const gameweeks = useMemo(() => {
    if (!spreadBettingData) return [];
    const gws = Array.from(new Set(spreadBettingData.map(m => m.gameweek))).sort((a, b) => a - b);
    // Filter out completed gameweeks (only show future gameweeks)
    return gws.filter(gw => gw >= 4);
  }, [spreadBettingData]);

  const filteredData = useMemo(() => {
    if (!spreadBettingData) return [];
    
    return spreadBettingData
      .filter(match => selectedGameweek === "all" || match.gameweek.toString() === selectedGameweek)
      .filter(match => 
        selectedTeam === "all" || 
        match.homeTeam.shortName === selectedTeam || 
        match.awayTeam.shortName === selectedTeam
      )
      .sort((a, b) => {
        // Sort by gameweek first, then by kickoff time
        if (a.gameweek !== b.gameweek) {
          return a.gameweek - b.gameweek;
        }
        return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
      });
  }, [spreadBettingData, selectedGameweek, selectedTeam]);

  const formatKickoffTime = (kickoffTime: string) => {
    const date = new Date(kickoffTime);
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

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

  const getSpreadWidth = (spread: { sell: number; buy: number }) => {
    const width = spread.buy - spread.sell;
    if (width <= 0.2) return 'text-green-600 font-medium';
    if (width <= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading || spreadLoading) {
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
            <h1>Team Goals - Spread Betting</h1>
          </div>
          <p className="fpl-page-subtitle">
            Expected team goals calculated from spread betting market odds using T+S/2 and T-S/2 mathematical formulas
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">
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
                    {gameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Team:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {bootstrapData?.teams?.map(team => (
                      <SelectItem key={team.id} value={team.short_name}>{team.short_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort:</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expected_goals">Expected Goals</SelectItem>
                    <SelectItem value="gameweek">Gameweek</SelectItem>
                    <SelectItem value="total_spread">Total Goals Spread</SelectItem>
                    <SelectItem value="supremacy">Supremacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Method Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Spread Betting Calculation Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Mathematical Formula:</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                  <p><strong>Team A Expected Goals:</strong> (T + S) ÷ 2</p>
                  <p><strong>Team B Expected Goals:</strong> (T - S) ÷ 2</p>
                  <p className="text-xs text-gray-600 mt-2">
                    Where T = Total Goals Midpoint, S = Match Supremacy Midpoint
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Market Data Sources:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• Total Goals Spread: Combined goals by both teams</p>
                  <p>• Match Supremacy Spread: Goal difference (Home - Away)</p>
                  <p>• Midpoints represent bookmaker's implied expected values</p>
                  <p>• Narrower spreads indicate higher market confidence</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Team Expected Goals from Spread Markets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Match Details
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Goals
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supremacy
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Home Expected
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Away Expected
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((match) => {
                    const kickoff = formatKickoffTime(match.kickoffTime);
                    
                    return (
                      <tr key={match.id} className="hover:bg-gray-50" data-testid={`spread-betting-row-${match.id}`}>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-gray-900">
                                GW{match.gameweek}
                              </div>
                              <div className="text-xs text-gray-500">
                                {kickoff.date} • {kickoff.time}
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-sm font-medium">{match.homeTeam.shortName}</span>
                              <span className="text-xs text-gray-400">vs</span>
                              <span className="text-sm font-medium">{match.awayTeam.shortName}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {match.matchData.totalGoalsMidpoint.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({match.homeTeam.totalGoalsSpread.sell.toFixed(1)}-{match.homeTeam.totalGoalsSpread.buy.toFixed(1)})
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {match.matchData.supremacyMidpoint > 0 ? '+' : ''}{match.matchData.supremacyMidpoint.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({match.homeTeam.supremacySpread.sell.toFixed(1)}-{match.homeTeam.supremacySpread.buy.toFixed(1)})
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1">
                            <div className={`inline-flex px-2 py-1 rounded-full text-sm ${getGoalsColor(match.homeTeam.expectedGoals)}`}>
                              {match.homeTeam.expectedGoals.toFixed(2)}
                            </div>
                            <Badge variant="secondary" className={getConfidenceColor(match.homeTeam.confidence)}>
                              {match.homeTeam.confidence}
                            </Badge>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1">
                            <div className={`inline-flex px-2 py-1 rounded-full text-sm ${getGoalsColor(match.awayTeam.expectedGoals)}`}>
                              {match.awayTeam.expectedGoals.toFixed(2)}
                            </div>
                            <Badge variant="secondary" className={getConfidenceColor(match.awayTeam.confidence)}>
                              {match.awayTeam.confidence}
                            </Badge>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <Badge variant="secondary" className={getConfidenceColor(match.matchData.spreadConfidence)}>
                            {match.matchData.spreadConfidence}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredData.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No spread betting data available for the selected filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
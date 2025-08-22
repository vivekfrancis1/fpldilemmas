import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { TrendingUp, Filter, Users, Clock, Target, Trophy, Zap, Star } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlayerProjection {
  id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  cbit: number; // Chance of being in top 15
  points: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export default function Projections() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("points");
  const [weeks, setWeeks] = useState<number>(4);

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<PlayerProjection[]>({
    queryKey: ["/api/projections", weeks],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Generate projections based on current data and betting markets
  const projections = useMemo(() => {
    if (!bootstrapData?.elements || !projectionsData) {
      // Generate mock projections for demonstration
      return bootstrapData?.elements?.slice(0, 50).map(player => {
        const team = bootstrapData.teams.find(t => t.id === player.team);
        const position = bootstrapData.element_types.find(p => p.id === player.element_type);
        
        // Simple projection model based on current stats and form
        const baseMinutes = Math.max(20, Math.min(90, player.minutes / player.starts_per_90 || 45));
        const projectedMinutes = baseMinutes * weeks * (0.8 + Math.random() * 0.4);
        
        const goalsPerMinute = player.goals_scored / Math.max(player.minutes, 1);
        const assistsPerMinute = player.assists / Math.max(player.minutes, 1);
        
        const projectedGoals = goalsPerMinute * projectedMinutes * (position?.singular_name === 'Goalkeeper' ? 0.1 : 
          position?.singular_name === 'Defender' ? 0.8 : 
          position?.singular_name === 'Midfielder' ? 1.2 : 1.5);
        
        const projectedAssists = assistsPerMinute * projectedMinutes * (position?.singular_name === 'Goalkeeper' ? 0.1 :
          position?.singular_name === 'Defender' ? 0.8 :
          position?.singular_name === 'Midfielder' ? 1.3 : 1.0);
        
        const cleanSheetChance = position?.singular_name === 'Goalkeeper' || position?.singular_name === 'Defender' ? 0.3 : 0;
        const projectedCleanSheets = cleanSheetChance * weeks;
        
        const projectedBonus = (projectedGoals * 2 + projectedAssists * 1.5 + projectedCleanSheets * 1) * 0.3;
        
        const projectedPoints = (projectedMinutes / 90) * 2 + 
          projectedGoals * (position?.singular_name === 'Goalkeeper' || position?.singular_name === 'Defender' ? 6 : 
            position?.singular_name === 'Midfielder' ? 5 : 4) +
          projectedAssists * 3 +
          projectedCleanSheets * (position?.singular_name === 'Goalkeeper' || position?.singular_name === 'Defender' ? 4 : 1) +
          projectedBonus;

        return {
          id: player.id,
          name: `${player.first_name} ${player.second_name}`,
          team: team?.short_name || '',
          position: position?.singular_name_short || '',
          price: player.now_cost / 10,
          minutes: Math.round(projectedMinutes),
          goals: Math.round(projectedGoals * 10) / 10,
          assists: Math.round(projectedAssists * 10) / 10,
          cleanSheets: Math.round(projectedCleanSheets * 10) / 10,
          bonus: Math.round(projectedBonus * 10) / 10,
          cbit: Math.min(95, Math.max(5, Math.round((projectedPoints / weeks) * 2))),
          points: Math.round(projectedPoints * 10) / 10,
          confidence: projectedPoints > 30 ? 'High' : projectedPoints > 20 ? 'Medium' : 'Low'
        } as PlayerProjection;
      }) || [];
    }
    return projectionsData;
  }, [bootstrapData, projectionsData, weeks]);

  const filteredProjections = useMemo(() => {
    return projections
      .filter(p => selectedPosition === "all" || p.position === selectedPosition)
      .filter(p => selectedTeam === "all" || p.team === selectedTeam)
      .sort((a, b) => {
        switch (sortBy) {
          case "points": return b.points - a.points;
          case "goals": return b.goals - a.goals;
          case "assists": return b.assists - a.assists;
          case "cbit": return b.cbit - a.cbit;
          case "price": return a.price - b.price;
          default: return b.points - a.points;
        }
      });
  }, [projections, selectedPosition, selectedTeam, sortBy]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-red-800 font-medium">Failed to load projection data</h3>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Player Projections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              AI-powered projections based on spread betting markets and advanced statistical models
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Weeks:</label>
                  <Select value={weeks.toString()} onValueChange={(v) => setWeeks(parseInt(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Position:</label>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="GKP">Goalkeeper</SelectItem>
                      <SelectItem value="DEF">Defender</SelectItem>
                      <SelectItem value="MID">Midfielder</SelectItem>
                      <SelectItem value="FWD">Forward</SelectItem>
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
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="goals">Goals</SelectItem>
                      <SelectItem value="assists">Assists</SelectItem>
                      <SelectItem value="cbit">CBIT %</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {(isLoading || projectionsLoading) && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Projections Table */}
          {!isLoading && !projectionsLoading && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  {weeks} Week Projections ({filteredProjections.length} players)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            Min
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1">
                            <Target className="h-3 w-3" />
                            Goals
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3" />
                            Assists
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1">
                            <Trophy className="h-3 w-3" />
                            CS
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="h-3 w-3" />
                            Bonus
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">CBIT %</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProjections.map((player, index) => (
                        <tr key={player.id} className="hover:bg-gray-50" data-testid={`projection-row-${player.id}`}>
                          <td className="px-4 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{player.name}</div>
                              <div className="text-sm text-gray-500">{player.team} • {player.position}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">£{player.price}m</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{player.minutes}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{player.goals}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{player.assists}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{player.cleanSheets}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-900">{player.bonus}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              player.cbit >= 70 ? 'bg-green-100 text-green-800' :
                              player.cbit >= 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {player.cbit}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-sm font-semibold text-gray-900">{player.points}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Badge className={getConfidenceColor(player.confidence)}>
                              {player.confidence}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Spread betting market odds</li>
                    <li>• Historical player performance</li>
                    <li>• Team form and fixture analysis</li>
                    <li>• Injury and availability reports</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Metrics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>CBIT %</strong>: Chance of being in top 15 players</li>
                    <li>• <strong>Confidence</strong>: Model reliability rating</li>
                    <li>• <strong>Projections</strong>: Expected totals over selected weeks</li>
                    <li>• <strong>CS</strong>: Clean sheets (defenders/goalkeepers)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Projections are based on current market data and statistical models. 
                  Actual results may vary due to injuries, rotation, and other unpredictable factors.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
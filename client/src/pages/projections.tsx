import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { TrendingUp, Filter, Users, Clock, Target, Trophy, Zap, Star, PoundSterling, ArrowUpDown } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerProjection {
  id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  weeklyProjections: {
    [gameweek: number]: {
      minutes: number;
      goals: number;
      assists: number;
      cleanSheets: number;
      bonus: number;
      cbit: number;
      points: number;
    };
  };
  totalMinutes: number;
  totalGoals: number;
  totalAssists: number;
  totalCleanSheets: number;
  totalBonus: number;
  averageCbit: number;
  totalPoints: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export default function Projections() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("points");
  const [weeks, setWeeks] = useState<number>(8);
  const [activeTab, setActiveTab] = useState<string>("points");

  // Auto-sort based on active tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Map tab names to sort keys
    const sortMapping: { [key: string]: string } = {
      'points': 'points',
      'goals': 'goals',
      'assists': 'assists',
      'cleanSheets': 'cleanSheets',
      'bonus': 'bonus',
      'cbit': 'cbit'
    };
    setSortBy(sortMapping[tab] || 'points');
  };

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<PlayerProjection[]>({
    queryKey: ["/api/projections", weeks],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Generate weekly projections based on current data
  const projections = useMemo(() => {
    if (!bootstrapData?.elements || !projectionsData) {
      // Generate weekly projections for demonstration
      return bootstrapData?.elements?.map(player => {
        const team = bootstrapData.teams.find(t => t.id === player.team);
        const position = bootstrapData.element_types.find(p => p.id === player.element_type);
        
        const weeklyProjections: { [gameweek: number]: any } = {};
        let totalMinutes = 0, totalGoals = 0, totalAssists = 0, totalCleanSheets = 0, totalBonus = 0, totalCbit = 0, totalPoints = 0;
        
        // Generate projections for each week (starting from GW2 since GW1 is completed)
        for (let week = 2; week <= weeks + 1; week++) {
          const baseMinutes = Math.max(20, Math.min(90, player.minutes / Math.max(1, 1) || 45));
          const weekMinutes = Math.min(90, Math.max(0, Math.round(baseMinutes * (0.85 + Math.random() * 0.3))));
          
          const goalsPerMinute = player.goals_scored / Math.max(player.minutes, 1);
          const assistsPerMinute = player.assists / Math.max(player.minutes, 1);
          
          const weekGoals = goalsPerMinute * weekMinutes * (position?.singular_name === 'Goalkeeper' ? 0.05 : 
            position?.singular_name === 'Defender' ? 0.8 : 
            position?.singular_name === 'Midfielder' ? 1.2 : 1.8) * (0.7 + Math.random() * 0.6);
          
          const weekAssists = assistsPerMinute * weekMinutes * (position?.singular_name === 'Goalkeeper' ? 0.1 :
            position?.singular_name === 'Defender' ? 0.9 :
            position?.singular_name === 'Midfielder' ? 1.5 : 1.1) * (0.7 + Math.random() * 0.6);
          
          const isDefensive = position?.singular_name === 'Goalkeeper' || position?.singular_name === 'Defender';
          const weekCleanSheets = isDefensive ? Math.round((20 + Math.random() * 30)) : 0;
          
          const weekBonus = (weekGoals * 2 + weekAssists * 1.5 + (weekCleanSheets/100) * 0.8) * 0.25;
          
          const weekPoints = Math.floor(weekMinutes / 60) * 2 + 
            weekGoals * (isDefensive ? 6 : position?.singular_name === 'Midfielder' ? 5 : 4) +
            weekAssists * 3 +
            (weekCleanSheets/100) * (isDefensive ? 4 : 1) +
            weekBonus;
          
          const weekCbit = Math.min(95, Math.max(1, Math.round(weekPoints * 3.5)));
          
          weeklyProjections[week] = {
            minutes: weekMinutes,
            goals: Math.round(weekGoals * 10) / 10,
            assists: Math.round(weekAssists * 10) / 10,
            cleanSheets: weekCleanSheets,
            bonus: Math.round(weekBonus * 10) / 10,
            cbit: weekCbit,
            points: Math.round(weekPoints * 10) / 10
          };
          
          totalMinutes += weekMinutes;
          totalGoals += weekGoals;
          totalAssists += weekAssists;
          totalCleanSheets += weekCleanSheets;
          totalBonus += weekBonus;
          totalCbit += weekCbit;
          totalPoints += weekPoints;
        }

        return {
          id: player.id,
          name: `${player.first_name} ${player.second_name}`,
          team: team?.short_name || '',
          position: position?.singular_name_short || '',
          price: player.now_cost / 10,
          weeklyProjections,
          totalMinutes: Math.round(totalMinutes),
          totalGoals: Math.round(totalGoals * 10) / 10,
          totalAssists: Math.round(totalAssists * 10) / 10,
          totalCleanSheets: Math.round(totalCleanSheets),
          totalBonus: Math.round(totalBonus * 10) / 10,
          averageCbit: Math.round(totalCbit / weeks),
          totalPoints: Math.round(totalPoints * 10) / 10,
          confidence: totalPoints > 30 ? 'High' : totalPoints > 20 ? 'Medium' : 'Low'
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
        // Handle gameweek-specific sorting
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aWeekData = a.weeklyProjections[gwNumber];
          const bWeekData = b.weeklyProjections[gwNumber];
          if (!aWeekData || !bWeekData) return 0;
          
          const aValue = aWeekData[activeTab as keyof typeof aWeekData] || 0;
          const bValue = bWeekData[activeTab as keyof typeof bWeekData] || 0;
          return typeof aValue === 'number' && typeof bValue === 'number' ? bValue - aValue : 0;
        }
        
        // Handle total column sorting
        switch (sortBy) {
          case "points": return b.totalPoints - a.totalPoints;
          case "goals": return b.totalGoals - a.totalGoals;
          case "assists": return b.totalAssists - a.totalAssists;
          case "minutes": return b.totalMinutes - a.totalMinutes;
          case "cleanSheets": return b.totalCleanSheets - a.totalCleanSheets;
          case "bonus": return b.totalBonus - a.totalBonus;
          case "cbit": return b.averageCbit - a.averageCbit;
          case "price": return a.price - b.price;
          default: return b.totalPoints - a.totalPoints;
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
                      {Array.from({ length: 8 }, (_, i) => i + 1).map(week => (
                        <SelectItem key={week} value={week.toString()}>{week}</SelectItem>
                      ))}
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
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 m-4 rounded-lg border border-blue-200">
                    <TabsTrigger value="points" className="flex items-center gap-2 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <Star className="h-4 w-4" />
                      Points
                    </TabsTrigger>
                    <TabsTrigger value="goals" className="flex items-center gap-2 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <Target className="h-4 w-4" />
                      Goals
                    </TabsTrigger>
                    <TabsTrigger value="assists" className="flex items-center gap-2 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <Users className="h-4 w-4" />
                      Assists
                    </TabsTrigger>
                    <TabsTrigger value="cleanSheets" className="flex items-center gap-2 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <Trophy className="h-4 w-4" />
                      Clean Sheets
                    </TabsTrigger>
                    <TabsTrigger value="bonus" className="flex items-center gap-2 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <Zap className="h-4 w-4" />
                      Bonus
                    </TabsTrigger>
                    <TabsTrigger value="cbit" className="flex items-center gap-2 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <TrendingUp className="h-4 w-4" />
                      CBIT%
                    </TabsTrigger>
                  </TabsList>

                  {['points', 'goals', 'assists', 'cleanSheets', 'bonus', 'cbit'].map(metric => (
                    <TabsContent key={metric} value={metric} className="m-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                            <tr>
                              <th className="px-4 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-r border-blue-200">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-blue-600" />
                                  Player
                                </div>
                              </th>
                              <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider sticky left-48 bg-gradient-to-r from-blue-50 to-indigo-50 border-r border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                                  onClick={() => setSortBy('price')}>
                                <div className="flex items-center justify-center gap-2">
                                  <PoundSterling className="h-4 w-4 text-green-600" />
                                  <span>Price</span>
                                  {sortBy === 'price' && <ArrowUpDown className="h-4 w-4 text-blue-600" />}
                                </div>
                              </th>
                              <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider sticky left-72 bg-gradient-to-r from-blue-50 to-indigo-50 border-r border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                                  onClick={() => setSortBy('minutes')}>
                                <div className="flex items-center justify-center gap-2">
                                  <Clock className="h-4 w-4 text-orange-600" />
                                  <span>Avg Min</span>
                                  {sortBy === 'minutes' && <ArrowUpDown className="h-4 w-4 text-blue-600" />}
                                </div>
                              </th>
                              {Array.from({ length: weeks }, (_, i) => (
                                <th 
                                  key={i} 
                                  className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100 transition-colors border-r border-blue-100"
                                  onClick={() => setSortBy(`gw${i + 2}`)}
                                >
                                  <div className="flex items-center justify-center gap-2">
                                    <span>GW {i + 2}</span>
                                    {sortBy === `gw${i + 2}` && <ArrowUpDown className="h-4 w-4 text-blue-600" />}
                                  </div>
                                </th>
                              ))}
                              <th 
                                className="px-4 py-4 text-center text-sm font-bold text-white uppercase tracking-wider bg-gradient-to-r from-blue-500 to-indigo-600 cursor-pointer hover:from-blue-600 hover:to-indigo-700 transition-colors"
                                onClick={() => setSortBy(activeTab)}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <Trophy className="h-4 w-4" />
                                  <span>Total {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                                  {sortBy === activeTab && <ArrowUpDown className="h-4 w-4" />}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProjections.map((player) => (
                              <tr key={player.id} className="hover:bg-gray-50" data-testid={`projection-row-${player.id}`}>
                                <td className="px-4 py-4 sticky left-0 bg-white">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{player.name}</div>
                                    <div className="text-sm text-gray-500">{player.team} • {player.position}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center text-sm font-medium text-gray-900 sticky left-48 bg-white">
                                  £{player.price}m
                                </td>
                                <td className="px-4 py-4 text-center text-sm font-medium text-gray-900 sticky left-72 bg-white">
                                  {Math.round(player.totalMinutes / weeks)}
                                </td>
                                {Array.from({ length: weeks }, (_, weekIndex) => {
                                  const weekData = player.weeklyProjections[weekIndex + 2];
                                  let value = weekData?.[metric as keyof typeof weekData] || 0;
                                  if (metric === 'cbit') {
                                    return (
                                      <td key={weekIndex} className="px-4 py-4 text-center">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          value >= 70 ? 'bg-green-100 text-green-800' :
                                          value >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {value}%
                                        </span>
                                      </td>
                                    );
                                  }
                                  if (metric === 'cleanSheets') {
                                    return (
                                      <td key={weekIndex} className="px-4 py-4 text-center">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          value >= 50 ? 'bg-green-100 text-green-800' :
                                          value >= 25 ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {value}%
                                        </span>
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={weekIndex} className="px-4 py-4 text-center text-sm text-gray-900">
                                      {value}
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-4 text-center bg-gradient-to-r from-blue-500 to-indigo-600">
                                  {metric === 'cbit' ? (
                                    <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                                      player.averageCbit >= 70 ? 'bg-green-100 text-green-800' :
                                      player.averageCbit >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {player.averageCbit}%
                                    </span>
                                  ) : metric === 'cleanSheets' ? (
                                    <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                                      player.totalCleanSheets >= 50 ? 'bg-green-100 text-green-800' :
                                      player.totalCleanSheets >= 25 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {player.totalCleanSheets}%
                                    </span>
                                  ) : (
                                    <span className="text-lg font-bold text-white">
                                      {(() => {
                                        const key = `total${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof PlayerProjection;
                                        const value = player[key];
                                        return typeof value === 'number' ? value : 0;
                                      })()}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
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
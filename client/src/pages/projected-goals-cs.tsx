import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Target, TrendingUp, Filter, Calendar, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TeamProjection {
  id: number;
  team: string;
  teamShort: string;
  opponent: string;
  opponentShort: string;
  isHome: boolean;
  gameweek: number;
  kickoffTime: string;
  projectedGoals: number;
  cleanSheetOdds: number;
  dayOfWeek: string;
  date: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export default function ProjectedGoalsCS() {
  const [selectedGameweek, setSelectedGameweek] = useState<string>("current");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamProjection[]>({
    queryKey: [`/api/projected-goals-cs?gameweek=${selectedGameweek}`],
  });

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData
      .filter(team => selectedTeam === "all" || team.teamShort === selectedTeam)
      .sort((a, b) => {
        // Sort by gameweek, then by kickoff time
        if (a.gameweek !== b.gameweek) {
          return a.gameweek - b.gameweek;
        }
        return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
      });
  }, [projectionsData, selectedTeam]);

  // Group by gameweek and day
  const groupedProjections = useMemo(() => {
    const groups: { [key: string]: TeamProjection[] } = {};
    
    filteredProjections.forEach(projection => {
      const key = `GW${projection.gameweek}-${projection.dayOfWeek}-${projection.date}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(projection);
    });
    
    return groups;
  }, [filteredProjections]);

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.0) return 'bg-blue-500 text-white font-semibold';
    if (goals >= 1.5) return 'bg-blue-100 text-blue-800 font-medium';
    if (goals >= 1.0) return 'bg-gray-100 text-gray-800';
    return 'bg-gray-50 text-gray-600';
  };

  const getCSColor = (percentage: number) => {
    if (percentage >= 40) return 'bg-orange-500 text-white font-semibold';
    if (percentage >= 30) return 'bg-orange-100 text-orange-800 font-medium';
    if (percentage >= 20) return 'bg-gray-100 text-gray-800';
    return 'bg-gray-50 text-gray-600';
  };

  if (isLoading || projectionsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 2;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50/30">
        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              PL GW{selectedGameweek === "current" ? currentGameweek : selectedGameweek}: Projected Goals & CS Odds
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Expected goals and clean sheet probabilities based on betting market analysis
            </p>
          </div>

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
                      <SelectItem value="current">Current GW</SelectItem>
                      {Array.from({ length: 5 }, (_, i) => currentGameweek + i).map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
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
              </div>
            </CardContent>
          </Card>

          {/* Projections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(groupedProjections).map(([groupKey, projections]) => {
              const [gwInfo, dayOfWeek, date] = groupKey.split('-');
              
              return (
                <Card key={groupKey} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 py-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{dayOfWeek}</span>
                      <span className="text-sm font-normal text-gray-600">{date}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {projections.map((projection, index) => (
                        <div 
                          key={`${projection.id}-${index}`} 
                          className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-gray-50"
                          data-testid={`projection-row-${projection.teamShort}`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <span className="font-semibold text-sm truncate">
                                {projection.teamShort}
                              </span>
                              <span className="text-xs text-gray-500">
                                {projection.isHome ? 'vs' : '@'} {projection.opponentShort}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">GOALS</div>
                              <div className={`px-2 py-1 rounded text-sm ${getGoalsColor(projection.projectedGoals)}`}>
                                {projection.projectedGoals.toFixed(2)}
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">CS%</div>
                              <div className={`px-2 py-1 rounded text-sm ${getCSColor(projection.cleanSheetOdds)}`}>
                                {projection.cleanSheetOdds}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Projected Goals & CS Odds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Spreadex Sport market data</li>
                    <li>• Team attacking and defensive strength</li>
                    <li>• Historical performance patterns</li>
                    <li>• Home/away venue adjustments</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Metrics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Goals: Expected goals for the team</li>
                    <li>• CS%: Clean sheet probability percentage</li>
                    <li>• Color coding: Blue for high goals, Orange for high CS%</li>
                    <li>• Updated regularly based on market movements</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
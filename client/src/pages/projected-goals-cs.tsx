import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Target, TrendingUp, Filter, Calendar, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface MatchProjection {
  fixtureId: number;
  gameweek: number;
  kickoffTime: string;
  dayOfWeek: string;
  date: string;
  homeTeam: {
    id: number;
    team: string;
    teamShort: string;
    projectedGoals: number;
    cleanSheetOdds: number;
  };
  awayTeam: {
    id: number;
    team: string;
    teamShort: string;
    projectedGoals: number;
    cleanSheetOdds: number;
  };
  confidence: 'High' | 'Medium' | 'Low';
}

export default function ProjectedGoalsCS() {
  const [selectedGameweek, setSelectedGameweek] = useState<string>("current");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<MatchProjection[]>({
    queryKey: [`/api/projected-goals-cs?gameweek=${selectedGameweek}`],
  });

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData
      .filter(match => 
        selectedTeam === "all" || 
        match.homeTeam.teamShort === selectedTeam || 
        match.awayTeam.teamShort === selectedTeam
      )
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
    const groups: { [key: string]: MatchProjection[] } = {};
    
    filteredProjections.forEach(match => {
      const key = `GW${match.gameweek}-${match.dayOfWeek}-${match.date}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(match);
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

          {/* Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Projected Goals & CS Odds
                <Badge variant="outline" className="ml-2">
                  {filteredProjections.length} matches
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {Object.entries(groupedProjections).map(([groupKey, projections]) => {
                  const [gwInfo, dayOfWeek, date] = groupKey.split('-');
                  
                  return (
                    <div key={groupKey}>
                      {/* Day Header */}
                      <div className="bg-gray-100 px-4 py-2 border-b">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-gray-700">{dayOfWeek}</span>
                          <span className="text-xs text-gray-500">{date}</span>
                        </div>
                      </div>
                      
                      {/* Matches for this day */}
                      {projections.map((match, index) => (
                        <div 
                          key={`${match.fixtureId}-${index}`} 
                          className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
                          data-testid={`match-row-${match.homeTeam.teamShort}-${match.awayTeam.teamShort}`}
                        >
                          <div className="grid grid-cols-2 gap-4">
                            {/* Home Team */}
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">
                                {match.homeTeam.teamShort}
                              </span>
                              <div className="flex items-center space-x-3">
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">GOALS</div>
                                  <div className={`px-2 py-1 rounded text-sm ${getGoalsColor(match.homeTeam.projectedGoals)}`}>
                                    {match.homeTeam.projectedGoals.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">CS%</div>
                                  <div className={`px-2 py-1 rounded text-sm ${getCSColor(match.homeTeam.cleanSheetOdds)}`}>
                                    {match.homeTeam.cleanSheetOdds}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">
                                {match.awayTeam.teamShort}
                              </span>
                              <div className="flex items-center space-x-3">
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">GOALS</div>
                                  <div className={`px-2 py-1 rounded text-sm ${getGoalsColor(match.awayTeam.projectedGoals)}`}>
                                    {match.awayTeam.projectedGoals.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">CS%</div>
                                  <div className={`px-2 py-1 rounded text-sm ${getCSColor(match.awayTeam.cleanSheetOdds)}`}>
                                    {match.awayTeam.cleanSheetOdds}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Target, TrendingUp, Filter, Calendar, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface MatchProjection {
  id: number;
  gameweek: number;
  kickoffTime: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    expectedGoals: number;
    cleanSheetOdds: number;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    expectedGoals: number;
    cleanSheetOdds: number;
  };
  totalExpectedGoals: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export default function ProjectedGoalsCS() {
  const [selectedGameweek, setSelectedGameweek] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<MatchProjection[]>({
    queryKey: ["/api/projected-goals-cs"],
  });

  const filteredProjections = useMemo(() => {
    if (!projectionsData) return [];
    
    return projectionsData
      .filter(match => 
        (selectedGameweek === "all" || match.gameweek.toString() === selectedGameweek) &&
        (selectedTeam === "all" || 
        match.homeTeam.shortName === selectedTeam || 
        match.awayTeam.shortName === selectedTeam)
      )
      .sort((a, b) => {
        // Sort by gameweek, then by kickoff time
        if (a.gameweek !== b.gameweek) {
          return a.gameweek - b.gameweek;
        }
        return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
      });
  }, [projectionsData, selectedTeam]);

  // Group by gameweek for display
  const groupedProjections = useMemo(() => {
    const groups: { [key: string]: MatchProjection[] } = {};
    
    filteredProjections.forEach(match => {
      const key = `GW${match.gameweek}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(match);
    });
    
    return groups;
  }, [filteredProjections]);

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.0) return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-700';
    if (goals >= 1.5) return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
    if (goals >= 1.0) return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200';
  };

  const getCSColor = (percentage: number) => {
    if (percentage >= 40) return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-700';
    if (percentage >= 30) return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300';
    if (percentage >= 20) return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200';
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
              {selectedGameweek === "all" ? "PL Match Projections - Rest of Season" : 
               `PL GW${selectedGameweek}: Match Projections`}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Expected goals and clean sheet probabilities based on betting market analysis
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-6 shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-700">Gameweek:</label>
                  <Select value={selectedGameweek} onValueChange={setSelectedGameweek}>
                    <SelectTrigger className="w-36 border-2 border-gray-200 hover:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Available</SelectItem>
                      {Array.from({ length: Math.min(36, 38 - currentGameweek) }, (_, i) => currentGameweek + i + 1).map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Filter className="h-5 w-5 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-700">Team:</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-36 border-2 border-gray-200 hover:border-blue-400 transition-colors">
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
          <Card className="overflow-hidden shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Target className="h-6 w-6" />
                Match Projections
                <Badge className="bg-white/20 text-white border-white/30 ml-auto">
                  {filteredProjections.length} matches
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {Object.entries(groupedProjections).map(([groupKey, projections]) => {
                  const gwInfo = groupKey; // Just the gameweek info like "GW2"
                  
                  return (
                    <div key={groupKey}>
                      {/* Day Header */}
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-base text-gray-800">
                            {selectedGameweek === "all" ? `GW${projections[0]?.gameweek}` : `GW${selectedGameweek}`}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">{projections.length} matches</span>
                        </div>
                      </div>
                      
                      {/* Matches for this day */}
                      {projections.map((match, index) => (
                        <div 
                          key={`${match.id}-${index}`} 
                          className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 last:border-b-0 hover:bg-blue-50/50 transition-colors duration-200"
                          data-testid={`match-row-${match.homeTeam.shortName}-${match.awayTeam.shortName}`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                            {/* Home Team */}
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="font-bold text-base text-gray-800">
                                  {match.homeTeam.shortName}
                                </span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">HOME</span>
                              </div>
                              <div className="flex items-center space-x-2 sm:space-x-4">
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-600 mb-1">GOALS</div>
                                  <div className={`px-3 py-2 rounded-lg text-sm font-bold shadow-sm ${getGoalsColor(match.homeTeam.expectedGoals)}`}>
                                    {match.homeTeam.expectedGoals.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-600 mb-1">CS%</div>
                                  <div className={`px-3 py-2 rounded-lg text-sm font-bold shadow-sm ${getCSColor(match.homeTeam.cleanSheetOdds)}`}>
                                    {match.homeTeam.cleanSheetOdds}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="font-bold text-base text-gray-800">
                                  {match.awayTeam.shortName}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">AWAY</span>
                              </div>
                              <div className="flex items-center space-x-2 sm:space-x-4">
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-600 mb-1">GOALS</div>
                                  <div className={`px-3 py-2 rounded-lg text-sm font-bold shadow-sm ${getGoalsColor(match.awayTeam.expectedGoals)}`}>
                                    {match.awayTeam.expectedGoals.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-600 mb-1">CS%</div>
                                  <div className={`px-3 py-2 rounded-lg text-sm font-bold shadow-sm ${getCSColor(match.awayTeam.cleanSheetOdds)}`}>
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
              <CardTitle className="text-lg">About Match Odds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Sports market analysis</li>
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
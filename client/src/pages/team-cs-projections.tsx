import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Shield, TrendingUp, Filter, BarChart3, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TeamCSProjection {
  id: number;
  team: string;
  teamShort: string;
  gameweekProjections: {
    [gameweek: number]: number; // Clean sheet probability as percentage
  };
  totalCSProbability: number;
  averageCSProbability: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamCSProjections() {
  const [weeks, setWeeks] = useState<number>(6);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("average");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamCSProjection[]>({
    queryKey: [`/api/team-cs-projections?weeks=${weeks}`],
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
          case "average": return b.averageCSProbability - a.averageCSProbability;
          case "position": return a.position - b.position;
          default: return b.averageCSProbability - a.averageCSProbability;
        }
      });
  }, [projectionsData, selectedTeam, sortBy]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCSColor = (percentage: number) => {
    if (percentage >= 45) return 'bg-green-50 text-green-800 font-semibold';
    if (percentage >= 35) return 'bg-blue-50 text-blue-800 font-medium';
    if (percentage >= 25) return 'bg-yellow-50 text-yellow-800';
    if (percentage >= 15) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  // Show gameweeks 2-7 for 6 weeks
  const getGameweeks = () => {
    return Array.from({ length: weeks }, (_, i) => 2 + i);
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

  const gameweeks = getGameweeks();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Team CS Projections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Clean sheet probabilities for each team over the next {weeks === 35 ? 'remaining' : weeks} gameweeks
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
                      <SelectItem value="6">6 weeks</SelectItem>
                      <SelectItem value="10">10 weeks</SelectItem>
                      <SelectItem value="15">15 weeks</SelectItem>
                      <SelectItem value="20">20 weeks</SelectItem>
                      <SelectItem value="25">25 weeks</SelectItem>
                      <SelectItem value="30">30 weeks</SelectItem>
                      <SelectItem value="35">Rest of Season</SelectItem>
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
                      <SelectItem value="average">CS/Game</SelectItem>
                      <SelectItem value="position">League Position</SelectItem>
                      {bootstrapData?.events && Array.from({ length: weeks }, (_, i) => {
                        const currentGW = bootstrapData.events.find((event: any) => event.is_current)?.id || 2;
                        const gwNumber = currentGW + i + 1;
                        return (
                          <SelectItem key={`gw${gwNumber}`} value={`gw${gwNumber}`}>GW{gwNumber}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team CS Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Team CS Projections: Next {weeks === 35 ? 'Remaining' : weeks}GW
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50">
                        Team
                      </th>
                      {bootstrapData?.events && Array.from({ length: weeks }, (_, i) => {
                        const currentGW = bootstrapData.events.find((event: any) => event.is_current)?.id || 2;
                        const gwNumber = currentGW + i + 1;
                        return (
                          <th 
                            key={gwNumber} 
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setSortBy(`gw${gwNumber}`)}
                          >
                            <div className="flex items-center justify-center gap-1">
                              GW{gwNumber}
                              {sortBy === `gw${gwNumber}` && <TrendingUp className="h-3 w-3" />}
                            </div>
                          </th>
                        );
                      })}

                      <th 
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortBy('average')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          CS/Game
                          {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjections.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-cs-projection-row-${team.id}`}>
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-500 sticky left-0 bg-white">
                          {index + 1}
                        </td>
                        
                        <td className="px-4 py-4 sticky left-12 bg-white">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{team.team}</div>
                              <div className="text-xs text-gray-500">{team.teamShort}</div>
                            </div>
                          </div>
                        </td>
                        
                        {bootstrapData?.events && Array.from({ length: weeks }, (_, weekIndex) => {
                          const currentGW = bootstrapData.events.find((event: any) => event.is_current)?.id || 2;
                          const gwNumber = currentGW + weekIndex + 1;
                          const csPercentage = team.gameweekProjections[gwNumber] || 0;
                          return (
                            <td key={weekIndex} className={`px-4 py-4 text-center text-sm font-medium ${getCSColor(csPercentage)}`}>
                              {csPercentage}%
                            </td>
                          );
                        })}
                        

                        
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {team.averageCSProbability}%
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <Badge className={getConfidenceColor(team.confidence)}>
                            {team.confidence}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Clean Sheet Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Team defensive strength ratings</li>
                    <li>• Opposition attacking strength analysis</li>
                    <li>• Historical clean sheet patterns</li>
                    <li>• Fixture difficulty and venue factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Methodology</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Poisson distribution for goal probability</li>
                    <li>• Advanced statistical clean sheet modeling</li>
                    <li>• Home/away defensive adjustments</li>
                    <li>• Form and injury impact analysis</li>
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
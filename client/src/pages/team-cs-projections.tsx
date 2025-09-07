import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [startGameweek, setStartGameweek] = useState<string>("4");
  const [endGameweek, setEndGameweek] = useState<string>("9");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("average");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamCSProjection[]>({
    queryKey: ["/api/team-cs-projections"],
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
          case "average": {
            // Calculate period average for sorting
            const startGW = parseInt(startGameweek);
            const endGW = parseInt(endGameweek);
            const aPeriodAvg = Object.keys(a.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw, _, arr) => sum + (a.gameweekProjections[parseInt(gw)] || 0) / arr.length, 0);
            const bPeriodAvg = Object.keys(b.gameweekProjections)
              .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
              .reduce((sum, gw, _, arr) => sum + (b.gameweekProjections[parseInt(gw)] || 0) / arr.length, 0);
            return bPeriodAvg - aPeriodAvg;
          }
          case "season": return b.averageCSProbability - a.averageCSProbability;
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

  // Show all 38 gameweeks
  const getGameweeks = () => {
    return Array.from({ length: 38 }, (_, i) => i + 1);
  };

  if (isLoading || projectionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const gameweeks = getGameweeks();

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Shield className="h-8 w-8" />
            <h1>Team CS Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Clean sheet probabilities for each team across all upcoming gameweeks
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

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
                      {Array.from({ length: 12 }, (_, i) => (
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
                      {Array.from({ length: 12 }, (_, i) => (
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
                      <SelectItem value="average">Period CS/Game</SelectItem>
                      <SelectItem value="position">League Position</SelectItem>
                      {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                        const gwNumber = parseInt(startGameweek) + i;
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
                Team CS Projections: Gameweeks {startGameweek}-{endGameweek}
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
                      {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => {
                        const gwNumber = parseInt(startGameweek) + i;
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
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setSortBy('average')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Period CS/Game
                          {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                        </div>
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
                        
                        {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, weekIndex) => {
                          const gwNumber = parseInt(startGameweek) + weekIndex;
                          const csPercentage = team.gameweekProjections[gwNumber] || 0;
                          return (
                            <td key={weekIndex} className={`px-4 py-4 text-center text-sm font-medium ${getCSColor(csPercentage)}`}>
                              {csPercentage > 0 ? `${csPercentage}%` : "-"}
                            </td>
                          );
                        })}
                        

                        
                        <td className="px-4 py-4 text-center bg-blue-50">
                          <span className="text-lg font-bold text-blue-900">
                            {(() => {
                              const startGW = parseInt(startGameweek);
                              const endGW = parseInt(endGameweek);
                              const periodValues = Object.keys(team.gameweekProjections)
                                .filter(gw => parseInt(gw) >= startGW && parseInt(gw) <= endGW)
                                .map(gw => team.gameweekProjections[parseInt(gw)] || 0);
                              const periodAvg = periodValues.length > 0 ? periodValues.reduce((sum, val) => sum + val, 0) / periodValues.length : 0;
                              return `${periodAvg.toFixed(1)}%`;
                            })()}
                          </span>
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
                    <li>• Team defensive performance data</li>
                    <li>• Historical clean sheet patterns</li>
                    <li>• Opposition attacking strength</li>
                    <li>• Fixture context factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Clean sheet probability percentages</li>
                    <li>• Gameweek-by-gameweek analysis</li>
                    <li>• Comparative defensive rankings</li>
                    <li>• Updated regularly throughout season</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
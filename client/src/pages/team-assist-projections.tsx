import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Users, TrendingUp, Filter, BarChart3, Trophy } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  const [weeks, setWeeks] = useState<number>(6);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamAssistProjection[]>({
    queryKey: [`/api/team-assist-projections?weeks=${weeks}`],
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
          case "total": return b.totalAssists - a.totalAssists;
          case "average": return b.averageAssistsPerGame - a.averageAssistsPerGame;
          case "position": return a.position - b.position;
          default: return b.totalAssists - a.totalAssists;
        }
      });
  }, [projectionsData, selectedTeam, sortBy]);

  const totalAssists = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, averagePerGame: 0 };
    
    const currentGW = bootstrapData.events.find((event: any) => event.is_current)?.id || 2;
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    
    // Calculate totals for each gameweek
    for (let i = 0; i < weeks; i++) {
      const gwNumber = currentGW + i + 1;
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    }
    
    const averagePerGame = weeks > 0 ? overallTotal / weeks : 0;
    
    return { gameweekTotals, overallTotal, averagePerGame };
  }, [filteredProjections, weeks, bootstrapData]);

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
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading team assist projections...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
            Team Assist Projections
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Advanced assist forecasting using sophisticated 8-phase creativity analysis with statistical modeling and professional-grade accuracy for attacking prospects.
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Display Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Period
                </label>
                <Select value={weeks.toString()} onValueChange={(value) => setWeeks(parseInt(value))}>
                  <SelectTrigger data-testid="select-weeks">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">Next 6 GW</SelectItem>
                    <SelectItem value="10">Next 10 GW</SelectItem>
                    <SelectItem value="15">Next 15 GW</SelectItem>
                    <SelectItem value="35">Remaining Season</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Filter
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total Assists</SelectItem>
                    <SelectItem value="average">Avg/Game</SelectItem>
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

        {/* Team Assist Projections Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Assist Projections: Next {weeks === 35 ? 'Remaining' : weeks}GW
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
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => setSortBy('total')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Total
                        {sortBy === 'total' && <TrendingUp className="h-3 w-3" />}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setSortBy('average')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Avg/Game
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
                    <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-projection-row-${team.id}`}>
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
                        const assists = team.gameweekProjections[gwNumber] || 0;
                        return (
                          <td key={weekIndex} className={`px-4 py-4 text-center text-sm font-medium ${getAssistsColor(assists)}`}>
                            {assists.toFixed(2)}
                          </td>
                        );
                      })}
                      
                      <td className="px-4 py-4 text-center bg-blue-50">
                        <span className="text-lg font-bold text-blue-900">
                          {team.totalAssists.toFixed(2)}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                        {team.averageAssistsPerGame.toFixed(2)}
                      </td>
                      
                      <td className="px-4 py-4 text-center">
                        <Badge className={getConfidenceColor(team.confidence)}>
                          {team.confidence}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-700 sticky left-0 bg-gray-100">
                      -
                    </td>
                    
                    <td className="px-4 py-4 sticky left-12 bg-gray-100">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-bold text-gray-900">TOTAL</div>
                          <div className="text-xs text-gray-600">All Teams</div>
                        </div>
                      </div>
                    </td>
                    
                    {bootstrapData?.events && Array.from({ length: weeks }, (_, weekIndex) => {
                      const currentGW = bootstrapData.events.find((event: any) => event.is_current)?.id || 2;
                      const gwNumber = currentGW + weekIndex + 1;
                      const gwTotal = totalAssists.gameweekTotals[gwNumber] || 0;
                      return (
                        <td key={weekIndex} className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                          {gwTotal.toFixed(2)}
                        </td>
                      );
                    })}
                    
                    <td className="px-4 py-4 text-center bg-blue-100">
                      <span className="text-lg font-bold text-blue-900">
                        {totalAssists.overallTotal.toFixed(2)}
                      </span>
                    </td>
                    
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                      {totalAssists.averagePerGame.toFixed(2)}
                    </td>
                    
                    <td className="px-4 py-4 text-center bg-gray-100">
                      -
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
    </Layout>
  );
}
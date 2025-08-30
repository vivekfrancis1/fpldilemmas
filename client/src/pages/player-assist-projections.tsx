import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, TrendingUp, Users, Calendar, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerAssistProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  gameweekProjections: { [gameweek: number]: number };
  totalProjectedAssists: number;
  assistShare: number;
}

type SortField = 'name' | 'team' | 'position' | 'totalAssists' | 'gw4' | 'gw5' | 'gw6' | 'gw7' | 'gw8' | 'gw9';
type SortDirection = 'asc' | 'desc';

export default function PlayerAssistProjections() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('totalAssists');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch player assist projections data
  const { data: playerAssistData, isLoading, error } = useQuery<PlayerAssistProjection[]>({
    queryKey: ["/api/player-assist-projections"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!playerAssistData) return [];
    const uniqueTeams = [...new Set(playerAssistData.map(p => p.teamShort))];
    return uniqueTeams.sort();
  }, [playerAssistData]);

  const positions = useMemo(() => {
    if (!playerAssistData) return [];
    const uniquePositions = [...new Set(playerAssistData.map(p => p.position))];
    return uniquePositions.sort();
  }, [playerAssistData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!playerAssistData) return [];
    
    let filtered = playerAssistData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case 'team':
          aValue = a.teamShort;
          bValue = b.teamShort;
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        case 'totalAssists':
          aValue = a.totalProjectedAssists;
          bValue = b.totalProjectedAssists;
          break;
        case 'gw4':
          aValue = a.gameweekProjections[4] || 0;
          bValue = b.gameweekProjections[4] || 0;
          break;
        case 'gw5':
          aValue = a.gameweekProjections[5] || 0;
          bValue = b.gameweekProjections[5] || 0;
          break;
        case 'gw6':
          aValue = a.gameweekProjections[6] || 0;
          bValue = b.gameweekProjections[6] || 0;
          break;
        case 'gw7':
          aValue = a.gameweekProjections[7] || 0;
          bValue = b.gameweekProjections[7] || 0;
          break;
        case 'gw8':
          aValue = a.gameweekProjections[8] || 0;
          bValue = b.gameweekProjections[8] || 0;
          break;
        case 'gw9':
          aValue = a.gameweekProjections[9] || 0;
          bValue = b.gameweekProjections[9] || 0;
          break;
        default:
          aValue = a.totalProjectedAssists;
          bValue = b.totalProjectedAssists;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [playerAssistData, selectedPosition, selectedTeam, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUpDown className="h-4 w-4 text-green-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-green-600" />;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Zap className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load assist projections</h3>
                  <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/30">
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Zap className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
            Player Assist Projections
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Individual player assist projections for gameweeks 4-9, calculated using team assist projections and weighted historical assist share data with expected minutes factoring
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">Position:</label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-32 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {positions.map(position => (
                      <SelectItem key={position} value={position}>{position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">Team:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-32 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>{filteredAndSortedData.length} players</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Results */}
        {!isLoading && filteredAndSortedData.length > 0 && (
          <Tabs defaultValue="assists" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assists">Assists</TabsTrigger>
              <TabsTrigger value="share">Assist Share</TabsTrigger>
            </TabsList>

            <TabsContent value="assists">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    Projected Assists by Gameweek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="hover:bg-green-50">
                              Player {getSortIcon('name')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('team')} className="hover:bg-green-50">
                              Team {getSortIcon('team')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('position')} className="hover:bg-green-50">
                              Pos {getSortIcon('position')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('totalAssists')} className="hover:bg-green-50">
                              Total {getSortIcon('totalAssists')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('gw4')} className="hover:bg-green-50">
                              GW4 {getSortIcon('gw4')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('gw5')} className="hover:bg-green-50">
                              GW5 {getSortIcon('gw5')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('gw6')} className="hover:bg-green-50">
                              GW6 {getSortIcon('gw6')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('gw7')} className="hover:bg-green-50">
                              GW7 {getSortIcon('gw7')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('gw8')} className="hover:bg-green-50">
                              GW8 {getSortIcon('gw8')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('gw9')} className="hover:bg-green-50">
                              GW9 {getSortIcon('gw9')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-3 px-1">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{player.playerName}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-1">
                              <Badge variant="outline" className="text-xs">
                                {player.teamShort}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-1">
                              <Badge variant="secondary" className="text-xs">
                                {player.position.charAt(0)}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {player.totalProjectedAssists}
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[4] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {(player.gameweekProjections[4] || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[5] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {(player.gameweekProjections[5] || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[6] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {(player.gameweekProjections[6] || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[7] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {(player.gameweekProjections[7] || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[8] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {(player.gameweekProjections[8] || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[9] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {(player.gameweekProjections[9] || 0).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="share">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Team Assist Share Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-1">Player</th>
                          <th className="text-center py-2 px-1">Team</th>
                          <th className="text-center py-2 px-1">Position</th>
                          <th className="text-center py-2 px-1">Assist Share %</th>
                          <th className="text-center py-2 px-1">Season Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData
                          .sort((a, b) => b.assistShare - a.assistShare)
                          .map((player, index) => (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-3 px-1">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{player.playerName}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-1">
                              <Badge variant="outline" className="text-xs">
                                {player.teamShort}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-1">
                              <Badge variant="secondary" className="text-xs">
                                {player.position.charAt(0)}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {player.assistShare.toFixed(1)}%
                            </td>
                            <td className="text-center py-3 px-1">
                              {player.totalProjectedAssists}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* No Results */}
        {!isLoading && filteredAndSortedData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
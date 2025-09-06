import { useState, useMemo } from "react";

interface BootstrapData {
  events: Array<{ id: number; is_current: boolean; finished: boolean }>;
}
import { useQuery } from "@tanstack/react-query";
import { Zap, TrendingUp, Users, Calendar, Target, Search, Filter, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";

interface PlayerAssistProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  gameweekProjections: { [gameweek: number]: number };
  totalProjectedAssists: number;
  assistShare: number;
}

type SortField = 'name' | 'team' | 'position' | 'totalAssists' | 'sixGwTotal' | 'seasonTotal' | 'gw4' | 'gw5' | 'gw6' | 'gw7' | 'gw8' | 'gw9' | 'assistShare';
type SortDirection = 'asc' | 'desc';

export default function PlayerAssistProjections() {
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate current gameweek and upcoming gameweeks
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek + 1;
  const defaultEndGameweek = Math.min(nextGameweek + 5, 38); // Next 6 gameweeks or up to GW38

  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [startGameweek, setStartGameweek] = useState<number>(nextGameweek);
  const [endGameweek, setEndGameweek] = useState<number>(defaultEndGameweek);

  // Update start and end gameweeks when bootstrap data loads
  useMemo(() => {
    if (bootstrapData && startGameweek === nextGameweek) { // Only update if still at default
      setStartGameweek(nextGameweek);
      setEndGameweek(defaultEndGameweek);
    }
  }, [bootstrapData, nextGameweek, defaultEndGameweek, startGameweek]);
  const [sortField, setSortField] = useState<SortField>('sixGwTotal');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch player assist projections data
  const { data: playerAssistData, isLoading, error } = useQuery<PlayerAssistProjection[]>({
    queryKey: ["/api/player-assist-projections"],
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!playerAssistData) return [];
    const uniqueTeams = Array.from(new Set(playerAssistData.map(p => p.teamShort)));
    return uniqueTeams.sort();
  }, [playerAssistData]);

  const positions = useMemo(() => {
    if (!playerAssistData) return [];
    const uniquePositions = Array.from(new Set(playerAssistData.map(p => p.position)));
    return uniquePositions.sort();
  }, [playerAssistData]);

  // Get available gameweeks for filtering
  const availableGameweeks = useMemo(() => {
    if (!playerAssistData || playerAssistData.length === 0) return [];
    const gameweeks = new Set<number>();
    playerAssistData.forEach(player => {
      Object.keys(player.gameweekProjections).forEach(gw => {
        const gwNum = parseInt(gw);
        if (gwNum >= 1) { // Show from gameweek 1 onwards
          gameweeks.add(gwNum);
        }
      });
    });
    return Array.from(gameweeks).sort((a, b) => a - b);
  }, [playerAssistData]);

  // Calculate dynamic totals based on selected gameweek range
  const getFilteredTotal = (player: PlayerAssistProjection) => {
    let total = 0;
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      total += player.gameweekProjections[gw] || 0;
    }
    return total;
  };

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
        case 'sixGwTotal':
          aValue = getFilteredTotal(a);
          bValue = getFilteredTotal(b);
          break;
        case 'seasonTotal':
          aValue = a.totalProjectedAssists;
          bValue = b.totalProjectedAssists;
          break;
        case 'assistShare':
          aValue = a.assistShare;
          bValue = b.assistShare;
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
  }, [playerAssistData, selectedPosition, selectedTeam, startGameweek, endGameweek, sortField, sortDirection]);

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
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Zap className="h-8 w-8" />
            <h1>Player Assists</h1>
          </div>
          <p className="fpl-page-subtitle">
            Individual player assist projections for gameweeks 4-9, calculated using team assist projections and weighted historical assist share data with expected minutes factoring
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

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

              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">From GW:</label>
                <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-20 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => gw >= nextGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="text-sm font-semibold text-gray-700">To GW:</label>
                <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-20 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => gw >= nextGameweek && gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
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
              <TabsTrigger value="points">Points from Assists</TabsTrigger>
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
                  <div className="overflow-x-scroll" style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch', overflowX: 'scroll', width: '100%', display: 'block' }}>
                    <table className="w-full min-w-max">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="hover:bg-green-50">
                              Player {getSortIcon('name')}
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
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('sixGwTotal')} className="hover:bg-green-50">
                              6GW Total {getSortIcon('sixGwTotal')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('seasonTotal')} className="hover:bg-green-50">
                              Rest of Season Total {getSortIcon('seasonTotal')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => {
                          return (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-3 px-1">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{player.playerName}</span>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {player.position === 'MID' ? 'MID' : player.position.charAt(0)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {player.teamShort}
                                  </Badge>
                                </div>
                              </div>
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
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {getFilteredTotal(player).toFixed(2)}
                            </td>
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {player.totalProjectedAssists}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="points">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Points from Assists (3 pts per assist)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-scroll" style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch', overflowX: 'scroll', width: '100%', display: 'block' }}>
                    <table className="w-full min-w-max">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="hover:bg-green-50">
                              Player {getSortIcon('name')}
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
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('sixGwTotal')} className="hover:bg-green-50">
                              6GW Total {getSortIcon('sixGwTotal')}
                            </Button>
                          </th>
                          <th className="text-center py-2 px-1">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('seasonTotal')} className="hover:bg-green-50">
                              Rest of Season Total {getSortIcon('seasonTotal')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => {
                          const filteredGwPoints = Math.round(getFilteredTotal(player) * 3 * 10) / 10; // 3 points per assist
                          const seasonPoints = Math.round(player.totalProjectedAssists * 3 * 10) / 10;
                          return (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-3 px-1">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{player.playerName}</span>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {player.position === 'MID' ? 'MID' : player.position.charAt(0)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {player.teamShort}
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[4] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {((player.gameweekProjections[4] || 0) * 3).toFixed(1)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[5] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {((player.gameweekProjections[5] || 0) * 3).toFixed(1)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[6] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {((player.gameweekProjections[6] || 0) * 3).toFixed(1)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[7] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {((player.gameweekProjections[7] || 0) * 3).toFixed(1)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[8] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {((player.gameweekProjections[8] || 0) * 3).toFixed(1)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1">
                              <span className={`${(player.gameweekProjections[9] || 0) >= 0.15 ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                {((player.gameweekProjections[9] || 0) * 3).toFixed(1)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {filteredGwPoints}
                            </td>
                            <td className="text-center py-3 px-1 font-semibold text-green-700">
                              {seasonPoints}
                            </td>
                          </tr>
                          );
                        })}
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
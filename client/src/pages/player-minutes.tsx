import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, Users, Calendar, ArrowUpDown, Target, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerMinutesProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  currentMinutes: number;
  expectedMinutesPerGame: number;
  projectedMinutes: number;
  pointsPerGame: number;
  totalProjectedPoints: number;
  form: number;
  selectedByPercent: number;
  nowCost: number;
  valueRating: number;
}

type SortField = 'name' | 'team' | 'position' | 'expectedMinutes' | 'pointsPerGame' | 'totalPoints' | 'value';
type SortDirection = 'asc' | 'desc';

export default function PlayerMinutes() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [startGameweek, setStartGameweek] = useState<number>(4); // Default to next gameweek
  const [endGameweek, setEndGameweek] = useState<number>(9); // Default to 6 gameweeks ahead
  const [sortField, setSortField] = useState<SortField>('pointsPerGame');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [minMinutes, setMinMinutes] = useState<string>("30"); // Minimum minutes filter

  // Fetch player minutes projections data
  const { data: playerMinutesData, isLoading, error } = useQuery<PlayerMinutesProjection[]>({
    queryKey: ["/api/player-minutes-projections"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!playerMinutesData) return [];
    const uniqueTeams = Array.from(new Set(playerMinutesData.map(p => p.teamShort)));
    return uniqueTeams.sort();
  }, [playerMinutesData]);

  const positions = useMemo(() => {
    if (!playerMinutesData) return [];
    const uniquePositions = Array.from(new Set(playerMinutesData.map(p => p.position)));
    return uniquePositions.sort();
  }, [playerMinutesData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!playerMinutesData) return [];
    
    let filtered = playerMinutesData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
      if (player.expectedMinutesPerGame < parseInt(minMinutes)) return false;
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
        case 'expectedMinutes':
          aValue = a.expectedMinutesPerGame;
          bValue = b.expectedMinutesPerGame;
          break;
        case 'pointsPerGame':
          aValue = a.pointsPerGame;
          bValue = b.pointsPerGame;
          break;
        case 'totalPoints':
          aValue = a.totalProjectedPoints;
          bValue = b.totalProjectedPoints;
          break;
        case 'value':
          aValue = a.valueRating;
          bValue = b.valueRating;
          break;
        default:
          aValue = a.pointsPerGame;
          bValue = b.pointsPerGame;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [playerMinutesData, selectedPosition, selectedTeam, minMinutes, sortField, sortDirection]);

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
      <ArrowUpDown className="h-4 w-4 text-blue-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-blue-600" />;
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GKP': return 'bg-yellow-100 text-yellow-800';
      case 'DEF': return 'bg-green-100 text-green-800';
      case 'MID': return 'bg-blue-100 text-blue-800';
      case 'FWD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getValueRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 font-bold';
    if (rating >= 6) return 'text-blue-600 font-semibold';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load minutes projections</h3>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
            Player Minutes
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Expected minutes per game and points projections for each player, calculated using rotation patterns, form, and historical data
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-blue-100 text-sm">Total Players</p>
                  <p className="text-2xl font-bold">{filteredAndSortedData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-green-100 text-sm">Avg Points/Game</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.length > 0 ? 
                      (filteredAndSortedData.reduce((sum, p) => sum + p.pointsPerGame, 0) / filteredAndSortedData.length).toFixed(1) 
                      : '0.0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-purple-100 text-sm">Avg Minutes/Game</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.length > 0 ? 
                      Math.round(filteredAndSortedData.reduce((sum, p) => sum + p.expectedMinutesPerGame, 0) / filteredAndSortedData.length) 
                      : '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-orange-100 text-sm">Starters (60+ min)</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.filter(p => p.expectedMinutesPerGame >= 60).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">Position:</label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-32 border-2 border-gray-200 hover:border-blue-400 transition-colors">
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
                <Calendar className="h-5 w-5 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">Team:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-32 border-2 border-gray-200 hover:border-blue-400 transition-colors">
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
                <Filter className="h-5 w-5 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">Min Minutes:</label>
                <Select value={minMinutes} onValueChange={setMinMinutes}>
                  <SelectTrigger className="w-24 border-2 border-gray-200 hover:border-blue-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="75">75</SelectItem>
                    <SelectItem value="90">90</SelectItem>
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

        {/* Results Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-lg">Loading minutes projections...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center">
                <Clock className="h-6 w-6 text-blue-600 mr-2" />
                Player Minutes & Points Projections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('name')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto"
                        >
                          Player {getSortIcon('name')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('team')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto"
                        >
                          Team {getSortIcon('team')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('position')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto"
                        >
                          Position {getSortIcon('position')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('expectedMinutes')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto"
                        >
                          Expected Min/Game {getSortIcon('expectedMinutes')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('pointsPerGame')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto"
                        >
                          Points/Game {getSortIcon('pointsPerGame')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('totalPoints')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto"
                        >
                          6GW Points {getSortIcon('totalPoints')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('value')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto"
                        >
                          Value Rating {getSortIcon('value')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="font-semibold text-gray-700">Cost</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedData.map((player, index) => (
                      <tr 
                        key={player.playerId}
                        className={`hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="font-medium text-gray-900">{player.playerName}</div>
                              <div className="text-sm text-gray-500">Form: {player.form}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-mono">
                            {player.teamShort}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getPositionColor(player.position)}>
                            {player.position}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-semibold text-gray-900">
                            {player.expectedMinutesPerGame.toFixed(0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {(player.expectedMinutesPerGame / 90 * 100).toFixed(0)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-blue-600 text-lg">
                            {player.pointsPerGame.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-semibold text-green-600">
                            {player.totalProjectedPoints.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`font-bold text-lg ${getValueRatingColor(player.valueRating)}`}>
                            {player.valueRating.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-mono text-gray-900">
                            £{(player.nowCost / 10).toFixed(1)}m
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, TrendingUp, Users, Calendar, ArrowUpDown, Target, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlayerCleanSheetProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  gameweek: number;
  teamCleanSheetPercent: number;
  probabilityPlays60Plus: number;
  expectedCleanSheetPoints: number;
}

type SortField = 'name' | 'team' | 'position' | 'gameweek' | 'cleanSheetPercent' | 'probabilityPlays' | 'expectedPoints';
type SortDirection = 'asc' | 'desc';

export default function PlayerCleanSheetPoints() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedGameweek, setSelectedGameweek] = useState<number>(4);
  const [sortField, setSortField] = useState<SortField>('expectedPoints');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [minExpectedPoints, setMinExpectedPoints] = useState<string>("0.5");

  // Fetch player clean sheet points data
  const { data: cleanSheetData, isLoading, error } = useQuery<PlayerCleanSheetProjection[]>({
    queryKey: ["/api/player-cleansheet-points", selectedGameweek],
    queryFn: () => fetch(`/api/player-cleansheet-points?gameweek=${selectedGameweek}`).then(res => res.json()),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!cleanSheetData) return [];
    const uniqueTeams = Array.from(new Set(cleanSheetData.map(p => p.teamShort)));
    return uniqueTeams.sort();
  }, [cleanSheetData]);

  const positions = useMemo(() => {
    if (!cleanSheetData) return [];
    const uniquePositions = Array.from(new Set(cleanSheetData.map(p => p.position)));
    return uniquePositions.sort();
  }, [cleanSheetData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!cleanSheetData) return [];
    
    let filtered = cleanSheetData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
      if (player.expectedCleanSheetPoints < parseFloat(minExpectedPoints)) return false;
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
        case 'gameweek':
          aValue = a.gameweek;
          bValue = b.gameweek;
          break;
        case 'cleanSheetPercent':
          aValue = a.teamCleanSheetPercent;
          bValue = b.teamCleanSheetPercent;
          break;
        case 'probabilityPlays':
          aValue = a.probabilityPlays60Plus;
          bValue = b.probabilityPlays60Plus;
          break;
        case 'expectedPoints':
          aValue = a.expectedCleanSheetPoints;
          bValue = b.expectedCleanSheetPoints;
          break;
        default:
          aValue = a.expectedCleanSheetPoints;
          bValue = b.expectedCleanSheetPoints;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [cleanSheetData, selectedPosition, selectedTeam, minExpectedPoints, sortField, sortDirection]);

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
      case 'Goalkeeper': return 'bg-yellow-100 text-yellow-800';
      case 'Defender': return 'bg-green-100 text-green-800';
      case 'Midfielder': return 'bg-blue-100 text-blue-800';
      case 'Forward': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpectedPointsColor = (points: number) => {
    if (points >= 2.5) return 'text-green-600 font-bold';
    if (points >= 1.5) return 'text-blue-600 font-semibold';
    if (points >= 0.8) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load clean sheet points</h3>
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
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
            Player Clean Sheet Points
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Expected clean sheet points per gameweek: Defenders & Goalkeepers (4 pts), Midfielders (1 pt), Forwards (0 pts)
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-green-100 text-sm">Total Players</p>
                  <p className="text-2xl font-bold">{filteredAndSortedData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-blue-100 text-sm">Avg Expected CS Points</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.length > 0 ? 
                      (filteredAndSortedData.reduce((sum, p) => sum + p.expectedCleanSheetPoints, 0) / filteredAndSortedData.length).toFixed(2) 
                      : '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-purple-100 text-sm">High CS Potential</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.filter(p => p.expectedCleanSheetPoints >= 1.5).length}
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
                  <p className="text-orange-100 text-sm">Eligible Players</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.length}
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
                <Filter className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">Gameweek:</label>
                <Select value={selectedGameweek.toString()} onValueChange={(value) => setSelectedGameweek(parseInt(value))}>
                  <SelectTrigger className="w-24 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">GW4</SelectItem>
                    <SelectItem value="5">GW5</SelectItem>
                    <SelectItem value="6">GW6</SelectItem>
                    <SelectItem value="7">GW7</SelectItem>
                    <SelectItem value="8">GW8</SelectItem>
                    <SelectItem value="9">GW9</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">Min Expected Points:</label>
                <Select value={minExpectedPoints} onValueChange={setMinExpectedPoints}>
                  <SelectTrigger className="w-20 border-2 border-gray-200 hover:border-green-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0.0</SelectItem>
                    <SelectItem value="0.5">0.5</SelectItem>
                    <SelectItem value="1.0">1.0</SelectItem>
                    <SelectItem value="1.5">1.5</SelectItem>
                    <SelectItem value="2.0">2.0</SelectItem>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <span className="ml-4 text-lg">Loading clean sheet points...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center">
                <Shield className="h-6 w-6 text-green-600 mr-2" />
                Player Clean Sheet Points - GW{selectedGameweek}
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
                          className="font-semibold text-gray-700 hover:text-green-600 p-0 h-auto"
                        >
                          Player {getSortIcon('name')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('team')}
                          className="font-semibold text-gray-700 hover:text-green-600 p-0 h-auto"
                        >
                          Team {getSortIcon('team')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('position')}
                          className="font-semibold text-gray-700 hover:text-green-600 p-0 h-auto"
                        >
                          Position {getSortIcon('position')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('cleanSheetPercent')}
                          className="font-semibold text-gray-700 hover:text-green-600 p-0 h-auto"
                        >
                          Team CS % {getSortIcon('cleanSheetPercent')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('probabilityPlays')}
                          className="font-semibold text-gray-700 hover:text-green-600 p-0 h-auto"
                        >
                          Plays 60+ % {getSortIcon('probabilityPlays')}
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('expectedPoints')}
                          className="font-semibold text-gray-700 hover:text-green-600 p-0 h-auto"
                        >
                          Expected CS Points {getSortIcon('expectedPoints')}
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedData.map((player, index) => (
                      <tr 
                        key={`${player.playerId}-${player.gameweek}`}
                        className={`hover:bg-green-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="font-medium text-gray-900">{player.playerName}</div>
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
                          <div className="font-semibold text-blue-600">
                            {player.teamCleanSheetPercent.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-semibold text-purple-600">
                            {(player.probabilityPlays60Plus * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`font-bold text-lg ${getExpectedPointsColor(player.expectedCleanSheetPoints)}`}>
                            {player.expectedCleanSheetPoints.toFixed(2)}
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
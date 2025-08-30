import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Calendar, Filter, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PlayerCleanSheetData {
  playerId: number;
  playerName: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  gameweekProjections: { [key: string]: number };
  totalExpectedPoints: number;
  seasonTotalPoints: number;
}

type SortField = 'playerName' | 'position' | 'team' | 'totalExpectedPoints' | 'seasonTotalPoints';

export default function PlayerCleanSheetPoints() {
  const [startGameweek, setStartGameweek] = useState(4);
  const [endGameweek, setEndGameweek] = useState(9); // Default 6 gameweeks
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('totalExpectedPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch player clean sheet points data
  const { data: cleanSheetData, isLoading, error } = useQuery<PlayerCleanSheetData[]>({
    queryKey: ["/api/player-cleansheet-points", startGameweek, endGameweek],
    queryFn: () => fetch(`/api/player-cleansheet-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`).then(res => res.json()),
    staleTime: 10 * 60 * 1000,
    enabled: startGameweek <= endGameweek,
  });

  // Generate gameweek range for table headers
  const gameweekRange = useMemo(() => {
    const range = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      range.push(gw);
    }
    return range;
  }, [startGameweek, endGameweek]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!cleanSheetData) return [];
    return Array.from(new Set(cleanSheetData.map(p => p.team))).sort();
  }, [cleanSheetData]);

  const positions = useMemo(() => {
    if (!cleanSheetData) return [];
    return Array.from(new Set(cleanSheetData.map(p => p.position))).sort();
  }, [cleanSheetData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!cleanSheetData) return [];
    
    let filtered = cleanSheetData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.team !== selectedTeam) return false;
      if (searchTerm && !player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !player.team.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [cleanSheetData, selectedPosition, selectedTeam, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error loading clean sheet points data. Please try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <div className="container mx-auto px-6 py-8">
        {/* Professional Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
            Player Clean Sheet Points
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Expected clean sheet points per gameweek: Defenders & Goalkeepers (4 pts), Midfielders (1 pt), Forwards (0 pts)
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Gameweek Range */}
            <div className="space-y-2">
              <Label htmlFor="start-gameweek" className="text-sm font-medium">Start GW</Label>
              <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 35 }, (_, i) => i + 4).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-gameweek" className="text-sm font-medium">End GW</Label>
              <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 35 }, (_, i) => i + 4).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Player or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Position Filter */}
            <div className="space-y-2">
              <Label htmlFor="position-filter" className="text-sm font-medium">Position</Label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Filter */}
            <div className="space-y-2">
              <Label htmlFor="team-filter" className="text-sm font-medium">Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats Display */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Players</Label>
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-lg text-center">
                <span className="font-bold">{filteredAndSortedData.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <Card className="overflow-hidden shadow-xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading clean sheet points data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-green-700 transition-colors"
                          onClick={() => handleSort('playerName')}>
                        <div className="flex items-center gap-2">
                          Player {getSortIcon('playerName')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-green-700 transition-colors"
                          onClick={() => handleSort('position')}>
                        <div className="flex items-center gap-2">
                          Pos {getSortIcon('position')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-green-700 transition-colors"
                          onClick={() => handleSort('team')}>
                        <div className="flex items-center gap-2">
                          Team {getSortIcon('team')}
                        </div>
                      </th>
                      {gameweekRange.map(gw => (
                        <th key={gw} className="px-4 py-3 text-center font-semibold">GW{gw}</th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-green-700 transition-colors"
                          onClick={() => handleSort('totalExpectedPoints')}>
                        <div className="flex items-center justify-center gap-2">
                          Total {getSortIcon('totalExpectedPoints')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-green-700 transition-colors"
                          onClick={() => handleSort('seasonTotalPoints')}>
                        <div className="flex items-center justify-center gap-2">
                          Season {getSortIcon('seasonTotalPoints')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedData.map((player, index) => (
                      <tr key={player.playerId} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{player.playerName}</div>
                          <div className="text-sm text-gray-500">£{player.price}m • {player.ownership}%</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline"
                            className={`font-medium ${
                              player.position === 'Goalkeeper' ? 'border-yellow-400 text-yellow-700 bg-yellow-50' :
                              player.position === 'Defender' ? 'border-green-400 text-green-700 bg-green-50' :
                              player.position === 'Midfielder' ? 'border-blue-400 text-blue-700 bg-blue-50' :
                              'border-red-400 text-red-700 bg-red-50'
                            }`}
                          >
                            {player.position.slice(0, 3)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{player.team}</td>
                        {gameweekRange.map(gw => (
                          <td key={gw} className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded-md text-sm font-semibold ${
                              (player.gameweekProjections[gw.toString()] || 0) >= 1.5 ? 'bg-green-100 text-green-800' :
                              (player.gameweekProjections[gw.toString()] || 0) >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {(player.gameweekProjections[gw.toString()] || 0).toFixed(2)}
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
                            {player.totalExpectedPoints.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold">
                            {(player.seasonTotalPoints || 0).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Clean sheet points: Defenders & Goalkeepers = 4 pts, Midfielders = 1 pt, Forwards = 0 pts</p>
          <p>Calculations based on team clean sheet probability × player 60+ minutes probability × position points</p>
        </div>
      </div>
    </div>
  );
}
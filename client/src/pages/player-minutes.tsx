import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, Users, Calendar, ArrowUpDown, Target, Filter, Search, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import ProtectedRoute from "@/components/protected-route";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PlayerMinutesProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  currentMinutes: number;
  currentMinutesPerGame: number;
  expectedMinutesPerGame: number;
  pointsFromMinutes: number;
  benchAppearances: number;
}

type SortField = 'name' | 'team' | 'position' | 'currentMinutes' | 'expectedMinutes' | 'pointsFromMinutes';
type SortDirection = 'asc' | 'desc';

export default function PlayerMinutes() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startGameweek, setStartGameweek] = useState<number>(4); // Default to next gameweek
  const [endGameweek, setEndGameweek] = useState<number>(11); // Default to 8 gameweeks ahead
  const [sortField, setSortField] = useState<SortField>('expectedMinutes');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [minMinutes, setMinMinutes] = useState<string>("30"); // Minimum minutes filter
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);


  // Fetch player minutes projections data
  const { data: playerMinutesData, isLoading, error } = useQuery<PlayerMinutesProjection[]>({
    queryKey: ["/api/player-minutes-projections"],
    staleTime: 30 * 60 * 1000, // 30 minutes - data updated hourly
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
      // Search filter
      if (searchTerm) {
        const matchesSearch = player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            player.teamShort.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
      }
      
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
        case 'currentMinutes':
          aValue = a.currentMinutesPerGame;
          bValue = b.currentMinutesPerGame;
          break;
        case 'pointsFromMinutes':
          aValue = a.pointsFromMinutes;
          bValue = b.pointsFromMinutes;
          break;

        default:
          aValue = a.expectedMinutesPerGame;
          bValue = b.expectedMinutesPerGame;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [playerMinutesData, searchTerm, selectedPosition, selectedTeam, minMinutes, sortField, sortDirection]);

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

  const getMinutesColor = (minutes: number) => {
    if (minutes >= 80) return 'text-green-600 font-bold';
    if (minutes >= 60) return 'text-blue-600 font-semibold';
    if (minutes >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full py-4 sm:py-8">
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Minutes Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Calculating expected minutes for all players using rotation patterns and current form...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Clock className="h-8 w-8" />
            <h1>Player Minutes</h1>
          </div>
          <p className="fpl-page-subtitle">
            Expected minutes per game and FPL points from minutes for each player, calculated using rotation patterns and current form
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

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
                  <p className="text-green-100 text-sm">Avg Current Min/Game</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.length > 0 ? 
                      Math.round(filteredAndSortedData.reduce((sum, p) => sum + p.currentMinutesPerGame, 0) / filteredAndSortedData.length) 
                      : '0'}
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
                  <p className="text-orange-100 text-sm">Expected 60+ Min</p>
                  <p className="text-2xl font-bold">
                    {filteredAndSortedData.filter(p => p.expectedMinutesPerGame >= 60).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base sm:text-lg">Filters & Controls</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFiltersOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
              <div className="">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Search:</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    data-testid="input-player-search"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 text-xs pl-8 border-2 border-gray-200 hover:border-blue-400 transition-colors"
                  />
                </div>
              </div>
              
              <div className="">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Min Minutes:</label>
                <Select value={minMinutes} onValueChange={setMinMinutes}>
                  <SelectTrigger className="h-8 text-xs w-full border-2 border-gray-200 hover:border-blue-400 transition-colors">
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

              <div className="flex items-end">
                <div className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 h-8 rounded-md text-xs font-medium border border-blue-100">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{filteredAndSortedData.length} players</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="pos" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Position</span><span className="sm:hidden">Pos</span>{selectedPosition !== "all" && " (1)"}
                </TabsTrigger>
                <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  Teams{selectedTeam !== "all" && " (1)"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pos" className="mt-0">
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {['All', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => {
                    const value = pos === 'All' ? 'all' : pos;
                    const isActive = (selectedPosition === value) || (pos === 'All' && selectedPosition === 'all');
                    return (
                      <button key={pos}
                        onClick={() => setSelectedPosition(selectedPosition === value && value !== 'all' ? 'all' : value)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="teams" className="mt-0">
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  <button onClick={() => setSelectedTeam('all')}
                    className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedTeam === 'all' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                    All
                  </button>
                  {teams.map(team => (
                    <button key={team}
                      onClick={() => setSelectedTeam(selectedTeam === team ? 'all' : team)}
                      className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedTeam === team ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                      {team}
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
                Player Minutes & Points from Minutes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-left sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('name')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto text-xs md:text-sm"
                        >
                          Player {getSortIcon('name')}
                        </Button>
                      </th>
                      <th className="px-1 md:px-4 py-2 md:py-4 text-left hidden md:table-cell">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('team')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto text-xs md:text-sm"
                        >
                          Team {getSortIcon('team')}
                        </Button>
                      </th>
                      <th className="px-1 md:px-4 py-2 md:py-4 text-left hidden md:table-cell">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('position')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto text-xs md:text-sm"
                        >
                          Pos {getSortIcon('position')}
                        </Button>
                      </th>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-center w-[52px] min-w-[52px]">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('currentMinutes')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto text-xs md:text-sm"
                        >
                          <span className="hidden md:inline">Curr</span>
                          <span className="md:hidden">Cur</span> {getSortIcon('currentMinutes')}
                        </Button>
                      </th>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-center w-[52px] min-w-[52px]">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('expectedMinutes')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto text-xs md:text-sm"
                        >
                          <span className="hidden md:inline">Exp</span>
                          <span className="md:hidden">Exp</span> {getSortIcon('expectedMinutes')}
                        </Button>
                      </th>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-center w-[52px] min-w-[52px]">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('pointsFromMinutes')}
                          className="font-semibold text-gray-700 hover:text-blue-600 p-0 h-auto text-xs md:text-sm"
                        >
                          <span className="hidden md:inline">Pts</span>
                          <span className="md:hidden">Pts</span> {getSortIcon('pointsFromMinutes')}
                        </Button>
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
                        <td className="px-1 md:px-3 py-2 md:py-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900 text-xs md:text-sm truncate max-w-[90px] md:max-w-none">{player.playerName}</div>
                            <div className="text-[10px] md:text-sm text-gray-500">
                              <span className="md:hidden">{player.teamShort} • {player.position}</span>
                              <span className="hidden md:inline">Total: {player.currentMinutes} min</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-1 md:px-4 py-2 md:py-4 hidden md:table-cell">
                          <Badge variant="outline" className="font-mono text-xs">
                            {player.teamShort}
                          </Badge>
                        </td>
                        <td className="px-1 md:px-4 py-2 md:py-4 hidden md:table-cell">
                          <Badge className={`${getPositionColor(player.position)} text-xs`}>
                            {player.position}
                          </Badge>
                        </td>
                        <td className="px-1 md:px-3 py-2 md:py-3 text-center w-[52px] min-w-[52px]">
                          <div className={`font-semibold text-xs md:text-sm ${getMinutesColor(player.currentMinutesPerGame)}`}>
                            {Math.round(player.currentMinutesPerGame)}
                          </div>
                        </td>
                        <td className="px-1 md:px-3 py-2 md:py-3 text-center w-[52px] min-w-[52px]">
                          <div className={`font-bold text-xs md:text-sm ${getMinutesColor(player.expectedMinutesPerGame)}`}>
                            {Math.round(player.expectedMinutesPerGame)}
                          </div>
                        </td>
                        <td className="px-1 md:px-3 py-2 md:py-3 text-center w-[52px] min-w-[52px]">
                          <div className={`font-bold text-xs md:text-sm ${player.pointsFromMinutes >= 2 ? 'text-green-600' : player.pointsFromMinutes >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {player.pointsFromMinutes}
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
    </ProtectedRoute>
  );
}
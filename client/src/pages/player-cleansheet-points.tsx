import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Calendar, Filter, Search, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProtectedRoute from "@/components/protected-route";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { computeNextRange } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  cleanSheetPoints: number;
}

interface TBCGoalProjection {
  fixtureId: number;
  homeTeamId: number;
  homeTeamShort: string;
  awayTeamId: number;
  awayTeamShort: string;
  homeGoals: number;
  awayGoals: number;
}

interface PlayerCleanSheetData {
  playerId: number;
  playerName: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  gameweekProjections: { [key: string]: number };
  fixtureDetails?: { [key: string]: FixtureDetail[] };
  totalExpectedPoints: number;
  seasonTotalPoints: number;
}

type SortField = 'playerName' | 'position' | 'team' | 'totalExpectedPoints';

export default function PlayerCleanSheetPoints() {
  const { defaultWeeks } = useProjectionSettings();
  const [startGameweek, setStartGameweek] = useState(6);
  const [endGameweek, setEndGameweek] = useState(13); // Default 8 gameweeks
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('totalExpectedPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Fixture mode toggle
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');

  // Fetch bootstrap data to get events for dynamic gameweek calculation
  const { data: bootstrapData } = useQuery({
    queryKey: ["/api/bootstrap-static"],
    queryFn: async () => {
      const response = await fetch("/api/bootstrap-static");
      if (!response.ok) {
        throw new Error("Failed to fetch bootstrap data");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update gameweek range when bootstrap data is available
  useEffect(() => {
    if (bootstrapData?.events) {
      const nextRange = computeNextRange(bootstrapData.events, defaultWeeks);
      if (nextRange.list.length > 0) {
        setStartGameweek(nextRange.start);
        setEndGameweek(nextRange.end);
      }
    }
  }, [bootstrapData]);

  // Fetch player clean sheet points data
  const { data: cleanSheetData, isLoading, error } = useQuery<PlayerCleanSheetData[]>({
    queryKey: ["/api/player-cleansheet-points", startGameweek, endGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/player-cleansheet-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to load clean sheet points: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: startGameweek <= endGameweek,
    retry: 3,
    retryDelay: 1000,
  });

  // TBC goal projections for amber column
  const { data: tbcGoalData } = useQuery<TBCGoalProjection[]>({
    queryKey: ["/api/tbc-goal-projections"],
    staleTime: 30 * 60 * 1000,
  });

  // TBC team CS map: teamShort → { opponentGoals, opponent, isHome }
  const tbcTeamCSMap = useMemo(() => {
    const map = new Map<string, { opponentGoals: number; opponent: string; isHome: boolean }>();
    if (!tbcGoalData) return map;
    tbcGoalData.forEach(f => {
      map.set(f.homeTeamShort, { opponentGoals: f.awayGoals, opponent: f.awayTeamShort, isHome: true });
      map.set(f.awayTeamShort, { opponentGoals: f.homeGoals, opponent: f.homeTeamShort, isHome: false });
    });
    return map;
  }, [tbcGoalData]);

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

  // TBC CS points for a player: exp(-opponentGoals) × positionCSPoints
  const getPositionCSPoints = (position: string) => {
    if (position === "Goalkeeper" || position === "Defender") return 4;
    if (position === "Midfielder") return 1;
    return 0;
  };
  const getTBCCS = (player: any) => {
    const entry = tbcTeamCSMap.get(player.team);
    if (!entry) return 0;
    const csProb = Math.exp(-entry.opponentGoals);
    return csProb * getPositionCSPoints(player.position);
  };

  // TBC assignments from localStorage
  const tbcAssignments = useMemo<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  }, [fixtureMode]);

  // Returns unabsorbed TBC CS points (0 if absorbed into a GW column)
  const getPlayerUnabsorbedCSTBC = (player: any): number => {
    if (tbcTeamCSMap.size === 0) return 0;
    if (fixtureMode === 'expert') return 0;
    if (fixtureMode === 'base') return getTBCCS(player);
    const allAbsorbed = tbcGoalData?.every(f => {
      const a = tbcAssignments[f.fixtureId];
      return a !== undefined && a !== null && a >= startGameweek && a <= endGameweek;
    }) ?? false;
    return allAbsorbed ? 0 : getTBCCS(player);
  };

  // resolvedCleanSheetData: absorbs TBC into assigned GW for expert/custom modes
  const resolvedCleanSheetData = useMemo<PlayerCleanSheetData[]>(() => {
    if (!cleanSheetData || tbcTeamCSMap.size === 0 || fixtureMode === 'base') return cleanSheetData || [];
    const tbcFixtureId = tbcGoalData?.[0]?.fixtureId;
    const assignedGW = fixtureMode === 'expert' ? 36 : (tbcFixtureId !== undefined ? tbcAssignments[tbcFixtureId] : undefined);
    if (assignedGW === undefined || assignedGW === null || assignedGW < startGameweek || assignedGW > endGameweek) return cleanSheetData;
    return cleanSheetData.map(player => {
      const tbcEntry = tbcTeamCSMap.get(player.team);
      if (!tbcEntry) return player;
      const tbcCSVal = Math.exp(-tbcEntry.opponentGoals) * getPositionCSPoints(player.position);
      const prevVal = player.gameweekProjections[assignedGW.toString()] || 0;
      const newProjections = { ...player.gameweekProjections, [assignedGW.toString()]: prevVal + tbcCSVal };
      const prevDetails = player.fixtureDetails?.[assignedGW.toString()] || [];
      const newFixtureDetails = { ...(player.fixtureDetails || {}), [assignedGW.toString()]: [...prevDetails, { opponent: tbcEntry.opponent, isHome: tbcEntry.isHome, cleanSheetPoints: tbcCSVal }] };
      return { ...player, gameweekProjections: newProjections, fixtureDetails: newFixtureDetails, totalExpectedPoints: player.totalExpectedPoints + tbcCSVal };
    });
  }, [cleanSheetData, tbcTeamCSMap, fixtureMode, tbcAssignments, tbcGoalData, startGameweek, endGameweek]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!resolvedCleanSheetData.length) return [];
    
    let filtered = resolvedCleanSheetData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.team !== selectedTeam) return false;
      if (searchTerm && !player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !player.team.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any = sortField === 'totalExpectedPoints'
        ? (a.totalExpectedPoints + getPlayerUnabsorbedCSTBC(a))
        : a[sortField];
      let bValue: any = sortField === 'totalExpectedPoints'
        ? (b.totalExpectedPoints + getPlayerUnabsorbedCSTBC(b))
        : b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
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
  }, [resolvedCleanSheetData, selectedPosition, selectedTeam, searchTerm, sortField, sortDirection, tbcTeamCSMap, fixtureMode, tbcAssignments, tbcGoalData, startGameweek, endGameweek]);

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
      <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-8">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error loading clean sheet points data. Please try again.
          </div>
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
              Loading Clean Sheet Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Calculating clean sheet probabilities and FPL points for all players...
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
            <Shield className="h-8 w-8" />
            <h1>Player Clean Sheet Points</h1>
          </div>
          <p className="fpl-page-subtitle">
            Expected clean sheet points for the next 6 gameweeks: Defenders & Goalkeepers (4 pts), Midfielders (1 pt), Forwards (0 pts)
          </p>
        </div>
      </div>

      {tbcGoalData && tbcGoalData.length > 0 && (
        <div className="flex justify-center mb-5">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs shadow-sm">
            <button onClick={() => setFixtureMode('base')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Base Fixtures</button>
            {Object.keys(tbcAssignments).length > 0 && <button onClick={() => setFixtureMode('custom')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>My Fixtures</button>}
            <button onClick={() => setFixtureMode('expert')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'expert' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-gray-500 hover:text-gray-800'}`}>Expert Fixtures</button>
          </div>
        </div>
      )}

      <div className="fpl-section-spacing">

        {/* Filters and Controls */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-3 sm:py-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-green-600" />
                  <h3 className="text-base sm:text-lg font-semibold">Filters & Controls</h3>
                </div>
                <div className="flex items-center gap-2">
                  {isFiltersOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {/* Gameweek Range */}
            <div className="">
              <Label htmlFor="start-gameweek" className="text-xs font-medium text-gray-600 mb-1 block">Start GW</Label>
              <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 4).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="">
              <Label htmlFor="end-gameweek" className="text-xs font-medium text-gray-600 mb-1 block">End GW</Label>
              <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 4).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="">
              <Label htmlFor="search" className="text-xs font-medium text-gray-600 mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Player or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs pl-9"
                />
              </div>
            </div>

            {/* Stats Display */}
            <div className="">
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Players</Label>
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-lg text-center">
                <span className="font-bold">{filteredAndSortedData.length}</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="pos" className="w-full mt-2">
            <TabsList className="w-full grid grid-cols-2 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
              <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                <span className="hidden sm:inline">Position</span><span className="sm:hidden">Pos</span>{selectedPosition !== "all" && " (1)"}
              </TabsTrigger>
              <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                Teams{selectedTeam !== "all" && " (1)"}
              </TabsTrigger>
            </TabsList>

            {/* Pos tab */}
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

            {/* Teams tab */}
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
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

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
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                    <tr>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-left font-semibold cursor-pointer hover:bg-blue-700/50 transition-colors sticky left-0 bg-blue-600 border-r border-blue-500 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)] z-20 min-w-[56px] md:min-w-[80px] text-xs md:text-sm"
                          onClick={() => handleSort('playerName')}>
                        <div className="flex items-center gap-1">
                          Player {getSortIcon('playerName')}
                        </div>
                      </th>
                      <th className="px-1 md:px-4 py-2 md:py-3 text-left font-semibold cursor-pointer hover:bg-blue-700/50 transition-colors hidden md:table-cell text-xs md:text-sm"
                          onClick={() => handleSort('position')}>
                        <div className="flex items-center gap-1">
                          Pos {getSortIcon('position')}
                        </div>
                      </th>
                      <th className="px-1 md:px-4 py-2 md:py-3 text-left font-semibold cursor-pointer hover:bg-blue-700/50 transition-colors hidden md:table-cell text-xs md:text-sm"
                          onClick={() => handleSort('team')}>
                        <div className="flex items-center gap-1">
                          Team {getSortIcon('team')}
                        </div>
                      </th>
                      {gameweekRange.map(gw => (
                        <th key={gw} className="px-1 py-2 md:py-3 text-center font-semibold min-w-[40px] md:min-w-[50px] text-xs md:text-sm">{gw}</th>
                      ))}
                      {fixtureMode !== 'expert' && tbcTeamCSMap.size > 0 && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= startGameweek && a <= endGameweek; })) && (
                        <th className="px-1 py-2 md:py-3 text-center text-xs md:text-sm font-medium uppercase tracking-wider min-w-[40px] md:min-w-[50px] bg-amber-50/60 border-l border-amber-300 text-amber-700">
                          GW39 (TBC)
                        </th>
                      )}
                      <th className="px-1 md:px-3 py-2 md:py-3 text-center font-semibold cursor-pointer hover:bg-blue-700/50 transition-colors border-l border-blue-500 w-16 md:w-auto md:min-w-[70px] text-xs md:text-sm sticky right-0 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                          onClick={() => handleSort('totalExpectedPoints')}>
                        <div className="flex items-center justify-center gap-1">
                          Total {getSortIcon('totalExpectedPoints')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedData.map((player, index) => (
                      <tr key={player.playerId} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-1 md:px-3 py-2 md:py-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[56px] md:min-w-[80px]">
                          <div className="font-semibold text-gray-900 text-xs md:text-sm truncate max-w-[60px] md:max-w-none">{player.playerName}</div>
                          <div className="text-[10px] md:text-xs text-gray-500">
                            <span className="md:hidden">{player.position.slice(0,3)} • {player.team}</span>
                            <span className="hidden md:inline">£{player.price}m • {player.ownership}%</span>
                          </div>
                        </td>
                        <td className="px-1 md:px-4 py-2 md:py-3 hidden md:table-cell">
                          <Badge 
                            variant="outline"
                            className={`font-medium text-xs ${
                              player.position === 'Goalkeeper' ? 'border-yellow-400 text-yellow-700 bg-yellow-50' :
                              player.position === 'Defender' ? 'border-green-400 text-green-700 bg-green-50' :
                              player.position === 'Midfielder' ? 'border-blue-400 text-blue-700 bg-blue-50' :
                              'border-red-400 text-red-700 bg-red-50'
                            }`}
                          >
                            {player.position.slice(0, 3)}
                          </Badge>
                        </td>
                        <td className="px-1 md:px-4 py-2 md:py-3 font-medium text-gray-900 text-xs md:text-sm hidden md:table-cell">{player.team}</td>
                        {gameweekRange.map(gw => {
                          const fixtures = player.fixtureDetails?.[gw.toString()] || [];
                          const isDGW = fixtures.length > 1;
                          const value = player.gameweekProjections[gw.toString()] || 0;
                          
                          return (
                            <td key={gw} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium min-w-[40px] md:min-w-[50px]">
                              {isDGW ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className={`cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium ${
                                      value >= 1.5 ? 'text-green-700 font-bold' :
                                      value >= 0.5 ? 'text-yellow-700' :
                                      'text-gray-600'
                                    }`}>
                                      {value.toFixed(1)}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                    <div className="text-xs font-semibold mb-2">GW{gw} Fixture Breakdown</div>
                                    {fixtures.map((f: FixtureDetail, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                        <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                          {f.opponent} ({f.isHome ? 'H' : 'A'})
                                        </span>
                                        <span className="font-medium text-xs">{f.cleanSheetPoints.toFixed(1)}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                      <span>Total</span>
                                      <span>{value.toFixed(1)}</span>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className={`${
                                  value >= 1.5 ? 'text-green-700 font-bold' :
                                  value >= 0.5 ? 'text-yellow-700' :
                                  'text-gray-600'
                                }`}>
                                  {value.toFixed(1)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        {fixtureMode !== 'expert' && tbcTeamCSMap.size > 0 && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= startGameweek && a <= endGameweek; })) && (() => {
                          const tbcCSEntry = tbcTeamCSMap.get(player.team);
                          const tbcCSPoints = getPlayerUnabsorbedCSTBC(player);
                          return (
                            <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium min-w-[40px] md:min-w-[50px] bg-amber-50/60 border-l border-amber-300">
                              {tbcCSEntry && tbcCSPoints > 0 ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 text-amber-700 font-medium">
                                      {tbcCSPoints.toFixed(2)}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-amber-200 z-50">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <span className="text-xs font-semibold">GW39 (TBC)</span>
                                      <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1">FPL Model</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className={`text-xs ${tbcCSEntry.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                        {tbcCSEntry.opponent} ({tbcCSEntry.isHome ? 'H' : 'A'})
                                      </span>
                                      <span className="font-medium text-xs">{tbcCSPoints.toFixed(2)}</span>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })()}
                        <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-orange-50 w-16 md:w-auto md:min-w-[70px] border-l border-gray-300 sticky right-0 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <span className="text-sm md:text-lg font-bold text-orange-900">
                            {(player.totalExpectedPoints + getPlayerUnabsorbedCSTBC(player)).toFixed(1)}
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
    </ProtectedRoute>
  );
}
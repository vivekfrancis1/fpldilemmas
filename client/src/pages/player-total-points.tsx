import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Calendar, Filter, Search, ChevronDown, ChevronUp, Target, Info, Zap, Shield, Swords, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Gameweek Point Breakdown Tooltip Component
function GameweekPointBreakdownTooltip({ player, gameweek }: { player: PlayerTotalPointsData, gameweek: number }) {
  const hasBreakdownData = player.pointsFromGoals !== undefined;
  const gwKey = `gw${gameweek}`;
  const gwPoints = player.gameweekProjections?.[gwKey];
  
  if (!hasBreakdownData || !gwPoints) {
    return (
      <span className={`font-medium ${gwPoints >= 6 ? 'text-green-700' : gwPoints >= 4 ? 'text-blue-700' : 'text-gray-600'}`}>
        {gwPoints ? gwPoints.toFixed(1) : '0.0'}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button className={`font-medium cursor-help hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 ${
          gwPoints >= 6 ? 'text-green-700' : gwPoints >= 4 ? 'text-blue-700' : 'text-gray-600'
        }`}>
          {gwPoints.toFixed(1)}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            {player.name} - GW{gameweek} Breakdown
          </div>
          <div className="text-xs text-gray-500 mb-2">
            Completed GWs use full FPL data • Future GWs use projection tools
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚽ Goals:</span>
              <span className="font-medium text-green-700">
                {player.pointsFromGoals?.[gwKey]?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Assists:</span>
              <span className="font-medium text-blue-700">
                {player.pointsFromAssists?.[gwKey]?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛡️ Clean Sheets:</span>
              <span className="font-medium text-yellow-700">
                {player.pointsFromCleanSheets?.[gwKey]?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚔️ Defensive:</span>
              <span className="font-medium text-orange-700">
                {player.pointsFromDefensiveContributions?.[gwKey]?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xs text-gray-400 ml-1">(2 if DC≥10/12)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⏱️ Minutes:</span>
              <span className="font-medium text-purple-700">
                {player.pointsFromMinutes?.[gwKey]?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">✨ Bonus:</span>
              <span className="font-medium text-pink-700">
                {player.pointsFromBonus?.[gwKey]?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xs text-gray-400 ml-1">(actual only)</span>
            </div>
          </div>
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">GW{gameweek} Total:</span>
              <span className="text-green-800">
                {gwPoints.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Sum: {(
                (player.pointsFromGoals?.[gwKey] || 0) +
                (player.pointsFromAssists?.[gwKey] || 0) +
                (player.pointsFromCleanSheets?.[gwKey] || 0) +
                (player.pointsFromDefensiveContributions?.[gwKey] || 0) +
                (player.pointsFromMinutes?.[gwKey] || 0) +
                (player.pointsFromBonus?.[gwKey] || 0)
              ).toFixed(1)}
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Range Total Point Breakdown Tooltip Component
function RangeTotalBreakdownTooltip({ player }: { player: PlayerTotalPointsData }) {
  const hasBreakdownData = player.totalPointsFromGoals !== undefined;
  
  if (!hasBreakdownData) {
    return (
      <span className="font-bold text-green-800">
        {player.totalExpectedPoints?.toFixed(1) || '0.0'}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button className="font-bold text-green-800 cursor-help hover:text-green-900 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
          {player.totalExpectedPoints?.toFixed(1) || '0.0'}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            {player.name} - Range Total Breakdown
          </div>
          <div className="text-xs text-gray-500 mb-2">
            Combines actual FPL data + projection tools
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚽ Goals:</span>
              <span className="font-medium text-green-700">
                {player.totalPointsFromGoals?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Assists:</span>
              <span className="font-medium text-blue-700">
                {player.totalPointsFromAssists?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛡️ Clean Sheets:</span>
              <span className="font-medium text-yellow-700">
                {player.totalPointsFromCleanSheets?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚔️ Defensive:</span>
              <span className="font-medium text-orange-700">
                {player.totalPointsFromDefensiveContributions?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xs text-gray-400 ml-1">(2 if DC≥10/12)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⏱️ Minutes:</span>
              <span className="font-medium text-purple-700">
                {player.totalPointsFromMinutes?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">✨ Bonus:</span>
              <span className="font-medium text-pink-700">
                {player.totalPointsFromBonus?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xs text-gray-400 ml-1">(actual only)</span>
            </div>
          </div>
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">Range Total:</span>
              <span className="text-green-800">
                {player.totalExpectedPoints?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Sum: {(
                (player.totalPointsFromGoals || 0) +
                (player.totalPointsFromAssists || 0) +
                (player.totalPointsFromCleanSheets || 0) +
                (player.totalPointsFromDefensiveContributions || 0) +
                (player.totalPointsFromMinutes || 0) +
                (player.totalPointsFromBonus || 0)
              ).toFixed(1)}
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface PlayerTotalPointsData {
  playerId: number;
  name: string;
  fullName: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  gameweekProjections: { [key: string]: number };
  totalExpectedPoints: number;
  seasonTotalPoints: number;
  averagePerGameweek: number;
  // Detailed point breakdowns
  pointsFromGoals?: { [key: string]: number };
  pointsFromAssists?: { [key: string]: number };
  pointsFromCleanSheets?: { [key: string]: number };
  pointsFromDefensiveContributions?: { [key: string]: number };
  pointsFromMinutes?: { [key: string]: number };
  pointsFromBonus?: { [key: string]: number };
  totalPointsFromGoals?: number;
  totalPointsFromAssists?: number;
  totalPointsFromCleanSheets?: number;
  totalPointsFromDefensiveContributions?: number;
  totalPointsFromMinutes?: number;
  totalPointsFromBonus?: number;
}

type SortField = 'name' | 'position' | 'team' | 'totalExpectedPoints' | 'seasonTotalPoints' | 'averagePerGameweek' | string;

// Helper function to render component-specific table
function ComponentTable({ 
  component, 
  filteredAndSortedData, 
  gameweekRange, 
  handleSort, 
  getSortIcon,
  colorScheme
}: {
  component: 'total' | 'goals' | 'assists' | 'cleansheets' | 'defensive' | 'minutes';
  filteredAndSortedData: PlayerTotalPointsData[];
  gameweekRange: number[];
  handleSort: (field: SortField) => void;
  getSortIcon: (field: SortField) => JSX.Element | null;
  colorScheme: {
    bg: string;
    totalBg: string;
    textColor: string;
    totalField: string;
    pointsField: string;
  };
}) {
  const getComponentValue = (player: PlayerTotalPointsData, gw: number) => {
    const gwKey = `gw${gw}`;
    switch (component) {
      case 'total':
        return player.gameweekProjections?.[gwKey] || 0;
      case 'goals':
        return player.pointsFromGoals?.[gwKey] || 0;
      case 'assists':
        return player.pointsFromAssists?.[gwKey] || 0;
      case 'cleansheets':
        return player.pointsFromCleanSheets?.[gwKey] || 0;
      case 'defensive':
        return player.pointsFromDefensiveContributions?.[gwKey] || 0;
      case 'minutes':
        return player.pointsFromMinutes?.[gwKey] || 0;
      default:
        return 0;
    }
  };

  const getTotalValue = (player: PlayerTotalPointsData) => {
    switch (component) {
      case 'total':
        return player.totalExpectedPoints || 0;
      case 'goals':
        return player.totalPointsFromGoals || 0;
      case 'assists':
        return player.totalPointsFromAssists || 0;
      case 'cleansheets':
        return player.totalPointsFromCleanSheets || 0;
      case 'defensive':
        return player.totalPointsFromDefensiveContributions || 0;
      case 'minutes':
        return player.totalPointsFromMinutes || 0;
      default:
        return 0;
    }
  };

  const getValueColor = (value: number) => {
    if (component === 'minutes') {
      return value >= 2 ? colorScheme.textColor : value >= 1 ? 'text-gray-600' : 'text-gray-500';
    }
    return value >= 4 ? colorScheme.textColor : value >= 2 ? 'text-gray-600' : 'text-gray-500';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1">Player {getSortIcon('name')}</div>
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('position')}>
              <div className="flex items-center gap-1">Pos {getSortIcon('position')}</div>
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('team')}>
              <div className="flex items-center gap-1">Team {getSortIcon('team')}</div>
            </th>
            {gameweekRange.map(gw => (
              <th key={gw} className={`px-3 py-3 text-center font-medium text-gray-700 ${colorScheme.bg} border-x cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => handleSort(component === 'total' ? `gw${gw}` : `${colorScheme.pointsField}.gw${gw}`)}>
                <div className="flex items-center justify-center gap-1">
                  GW{gw} {getSortIcon(component === 'total' ? `gw${gw}` : `${colorScheme.pointsField}.gw${gw}`)}
                </div>
              </th>
            ))}
            <th className={`px-4 py-3 text-center font-medium text-gray-700 ${colorScheme.totalBg} cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => handleSort(colorScheme.totalField)}>
              <div className="flex items-center justify-center gap-1">
                Range Total {getSortIcon(colorScheme.totalField)}
              </div>
            </th>
            {component === 'total' && (
              <>
                <th className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors bg-gradient-to-r from-purple-50 to-violet-50" onClick={() => handleSort('seasonTotalPoints')}>
                  <div className="flex items-center justify-center gap-1">Season Total {getSortIcon('seasonTotalPoints')}</div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors bg-gradient-to-r from-orange-50 to-amber-50" onClick={() => handleSort('averagePerGameweek')}>
                  <div className="flex items-center justify-center gap-1">Avg/GW {getSortIcon('averagePerGameweek')}</div>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredAndSortedData.map((player, index) => (
            <tr key={player.playerId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="px-4 py-4">
                <div>
                  <div className="font-semibold text-gray-900">{player.name}</div>
                  <div className="text-xs text-gray-500">£{player.price ? (player.price / 10).toFixed(1) : '0.0'}m • {player.ownership ? player.ownership.toFixed(1) : '0.0'}%</div>
                </div>
              </td>
              <td className="px-4 py-4"><Badge variant="outline" className="text-xs">{player.position}</Badge></td>
              <td className="px-4 py-4 font-medium text-gray-700">{player.team}</td>
              {gameweekRange.map(gw => {
                const value = getComponentValue(player, gw);
                return (
                  <td key={gw} className={`px-3 py-4 text-center ${colorScheme.bg}/30 border-x`}>
                    {component === 'total' ? (
                      <GameweekPointBreakdownTooltip player={player} gameweek={gw} />
                    ) : (
                      <span className={`font-medium ${getValueColor(value)}`}>
                        {component === 'minutes' ? value.toFixed(0) : value.toFixed(1)}
                      </span>
                    )}
                  </td>
                );
              })}
              <td className={`px-4 py-4 text-center ${colorScheme.totalBg}`}>
                {component === 'total' ? (
                  <RangeTotalBreakdownTooltip player={player} />
                ) : (
                  <span className={`font-bold ${colorScheme.textColor}`}>
                    {component === 'minutes' ? getTotalValue(player).toFixed(0) : getTotalValue(player).toFixed(1)}
                  </span>
                )}
              </td>
              {component === 'total' && (
                <>
                  <td className="px-4 py-4 text-center bg-gradient-to-r from-purple-50 to-violet-50">
                    <span className="font-bold text-purple-800">
                      {player.seasonTotalPoints?.toFixed(1) || '0.0'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center bg-gradient-to-r from-orange-50 to-amber-50">
                    <span className="font-bold text-orange-800">
                      {player.averagePerGameweek?.toFixed(1) || '0.0'}
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlayerTotalPoints() {
  const [startGameweek, setStartGameweek] = useState(4);
  const [endGameweek, setEndGameweek] = useState(9); // Default 6 gameweeks
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('totalExpectedPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch player total points data
  const { data: totalPointsData, isLoading, error } = useQuery<PlayerTotalPointsData[]>({
    queryKey: ["/api/player-total-points", startGameweek, endGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/player-total-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to load total points: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: startGameweek <= endGameweek,
    retry: 3,
    retryDelay: 1000,
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
    if (!totalPointsData) return [];
    return Array.from(new Set(totalPointsData.map(p => p.team))).sort();
  }, [totalPointsData]);

  const positions = useMemo(() => {
    if (!totalPointsData) return [];
    return Array.from(new Set(totalPointsData.map(p => p.position))).sort();
  }, [totalPointsData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!totalPointsData) return [];
    
    let filtered = totalPointsData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.team !== selectedTeam) return false;
      if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !player.team.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      // Handle component-specific gameweek sorting (e.g., "pointsFromGoals.gw4")
      if (sortField.includes('.gw')) {
        const [component, gwKey] = sortField.split('.');
        aValue = a[component]?.[gwKey] || 0;
        bValue = b[component]?.[gwKey] || 0;
      }
      // Handle total points gameweek sorting
      else if (sortField.startsWith('gw')) {
        aValue = a.gameweekProjections?.[sortField] || 0;
        bValue = b.gameweekProjections?.[sortField] || 0;
      } 
      // Handle regular field sorting
      else {
        aValue = a[sortField];
        bValue = b[sortField];
      }
      
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
  }, [totalPointsData, selectedPosition, selectedTeam, searchTerm, sortField, sortDirection]);

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
            Error loading total points data. Please try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="container mx-auto px-6 py-8">
        {/* Professional Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
            Player Total Points Projections
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
            Complete FPL points projection combining goals, assists, clean sheets, and expected minutes performance
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
                  {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
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
                  {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
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

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedPosition("all");
                  setSelectedTeam("all");
                  setSearchTerm("");
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Data Tabs */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-lg text-gray-600">Loading player total points...</span>
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Player Total Points (GW{startGameweek}-{endGameweek})
                <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-white/30">
                  {filteredAndSortedData.length} players
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="total" className="w-full">
                <TabsList className="grid w-full grid-cols-6 bg-gray-50 p-1 m-4 mb-0">
                  <TabsTrigger value="total" className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Total Points
                  </TabsTrigger>
                  <TabsTrigger value="goals" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Goal Points
                  </TabsTrigger>
                  <TabsTrigger value="assists" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Assist Points
                  </TabsTrigger>
                  <TabsTrigger value="cleansheets" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    CS Points
                  </TabsTrigger>
                  <TabsTrigger value="defensive" className="flex items-center gap-2">
                    <Swords className="h-4 w-4" />
                    DC Points
                  </TabsTrigger>
                  <TabsTrigger value="minutes" className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Mins Points
                  </TabsTrigger>
                </TabsList>

                {/* Total Points Tab */}
                <TabsContent value="total">
                  <ComponentTable
                    component="total"
                    filteredAndSortedData={filteredAndSortedData}
                    gameweekRange={gameweekRange}
                    handleSort={handleSort}
                    getSortIcon={getSortIcon}
                    colorScheme={{
                      bg: 'bg-blue-50',
                      totalBg: 'bg-gradient-to-r from-green-50 to-emerald-50',
                      textColor: 'text-green-800',
                      totalField: 'totalExpectedPoints',
                      pointsField: 'gameweekProjections'
                    }}
                  />
                </TabsContent>

                {/* Goals Tab */}
                <TabsContent value="goals">
                  <ComponentTable
                    component="goals"
                    filteredAndSortedData={filteredAndSortedData}
                    gameweekRange={gameweekRange}
                    handleSort={handleSort}
                    getSortIcon={getSortIcon}
                    colorScheme={{
                      bg: 'bg-green-50',
                      totalBg: 'bg-gradient-to-r from-green-50 to-emerald-50',
                      textColor: 'text-green-800',
                      totalField: 'totalPointsFromGoals',
                      pointsField: 'pointsFromGoals'
                    }}
                  />
                </TabsContent>

                {/* Assists Tab */}
                <TabsContent value="assists">
                  <ComponentTable
                    component="assists"
                    filteredAndSortedData={filteredAndSortedData}
                    gameweekRange={gameweekRange}
                    handleSort={handleSort}
                    getSortIcon={getSortIcon}
                    colorScheme={{
                      bg: 'bg-blue-50',
                      totalBg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
                      textColor: 'text-blue-800',
                      totalField: 'totalPointsFromAssists',
                      pointsField: 'pointsFromAssists'
                    }}
                  />
                </TabsContent>

                {/* Clean Sheets Tab */}
                <TabsContent value="cleansheets">
                  <ComponentTable
                    component="cleansheets"
                    filteredAndSortedData={filteredAndSortedData}
                    gameweekRange={gameweekRange}
                    handleSort={handleSort}
                    getSortIcon={getSortIcon}
                    colorScheme={{
                      bg: 'bg-yellow-50',
                      totalBg: 'bg-gradient-to-r from-yellow-50 to-orange-50',
                      textColor: 'text-yellow-800',
                      totalField: 'totalPointsFromCleanSheets',
                      pointsField: 'pointsFromCleanSheets'
                    }}
                  />
                </TabsContent>

                {/* Defensive Tab */}
                <TabsContent value="defensive">
                  <ComponentTable
                    component="defensive"
                    filteredAndSortedData={filteredAndSortedData}
                    gameweekRange={gameweekRange}
                    handleSort={handleSort}
                    getSortIcon={getSortIcon}
                    colorScheme={{
                      bg: 'bg-orange-50',
                      totalBg: 'bg-gradient-to-r from-orange-50 to-red-50',
                      textColor: 'text-orange-800',
                      totalField: 'totalPointsFromDefensiveContributions',
                      pointsField: 'pointsFromDefensiveContributions'
                    }}
                  />
                </TabsContent>

                {/* Minutes Tab */}
                <TabsContent value="minutes">
                  <ComponentTable
                    component="minutes"
                    filteredAndSortedData={filteredAndSortedData}
                    gameweekRange={gameweekRange}
                    handleSort={handleSort}
                    getSortIcon={getSortIcon}
                    colorScheme={{
                      bg: 'bg-purple-50',
                      totalBg: 'bg-gradient-to-r from-purple-50 to-violet-50',
                      textColor: 'text-purple-800',
                      totalField: 'totalPointsFromMinutes',
                      pointsField: 'pointsFromMinutes'
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </TooltipProvider>
  );
}
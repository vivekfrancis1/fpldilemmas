import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Calendar, Filter, Search, ChevronDown, ChevronUp, Target, Info, Zap, Shield, Swords, Timer, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";

// Gameweek Point Breakdown Tooltip Component
function GameweekPointBreakdownTooltip({ player, gameweek }: { player: PlayerTotalPointsData, gameweek: number }) {
  const hasBreakdownData = player.pointsFromGoals !== undefined;
  const gwKey = `gw${gameweek}`;
  const gwPoints = player.gameweekProjections?.[gwKey];
  
  if (!hasBreakdownData || !gwPoints) {
    return (
      <ValueCell 
        value={gwPoints || 0} 
        format="points" 
        decimals={1} 
        colorScheme="points"
        fontWeight="medium"
      />
    );
  }

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button className="cursor-help hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
          <ValueCell 
            value={gwPoints} 
            format="points" 
            decimals={1} 
            colorScheme="points"
            fontWeight="medium"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            GW{gameweek} Points Breakdown
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚽ Goals:</span>
              <ValueCell 
                value={player.pointsFromGoals?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-green-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Assists:</span>
              <ValueCell 
                value={player.pointsFromAssists?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-blue-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛡️ Clean Sheets:</span>
              <ValueCell 
                value={player.pointsFromCleanSheets?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-yellow-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚔️ Defensive:</span>
              <ValueCell 
                value={player.pointsFromDefensiveContributions?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-orange-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⏱️ Minutes:</span>
              <ValueCell 
                value={player.pointsFromMinutes?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-purple-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">✨ Bonus:</span>
              <ValueCell 
                value={player.pointsFromBonus?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-pink-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🥅 Saves:</span>
              <ValueCell 
                value={player.pointsFromSaves?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-cyan-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🚪 Goals Conceded:</span>
              <ValueCell 
                value={player.pointsFromGoalsConceded?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-red-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟨 Yellow Cards:</span>
              <ValueCell 
                value={player.pointsFromYellowCards?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-yellow-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟥 Red Cards:</span>
              <ValueCell 
                value={player.pointsFromRedCards?.[gwKey] || 0} 
                format="points" 
                decimals={1} 
                className="text-red-700"
                fontWeight="medium"
              />
            </div>
          </div>
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">GW{gameweek} Points Total:</span>
              <ValueCell 
                value={gwPoints} 
                format="points" 
                decimals={1} 
                className="text-green-800"
                fontWeight="semibold"
              />
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
      <ValueCell 
        value={player.totalExpectedPoints || 0} 
        format="points" 
        decimals={1} 
        className="text-green-800"
        fontWeight="bold"
      />
    );
  }

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button className="cursor-help hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
          <ValueCell 
            value={player.totalExpectedPoints || 0} 
            format="points" 
            decimals={1} 
            className="text-green-800"
            fontWeight="bold"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            {player.name} - 6GW Total Breakdown
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚽ Goals:</span>
              <ValueCell 
                value={player.totalPointsFromGoals || 0} 
                format="points" 
                decimals={1} 
                className="text-green-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Assists:</span>
              <ValueCell 
                value={player.totalPointsFromAssists || 0} 
                format="points" 
                decimals={1} 
                className="text-blue-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛡️ Clean Sheets:</span>
              <ValueCell 
                value={player.totalPointsFromCleanSheets || 0} 
                format="points" 
                decimals={1} 
                className="text-yellow-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚔️ Defensive:</span>
              <ValueCell 
                value={player.totalPointsFromDefensiveContributions || 0} 
                format="points" 
                decimals={1} 
                className="text-orange-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⏱️ Minutes:</span>
              <ValueCell 
                value={player.totalPointsFromMinutes || 0} 
                format="points" 
                decimals={1} 
                className="text-purple-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">✨ Bonus:</span>
              <ValueCell 
                value={player.totalPointsFromBonus || 0} 
                format="points" 
                decimals={1} 
                className="text-pink-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🥅 Saves:</span>
              <ValueCell 
                value={player.totalPointsFromSaves || 0} 
                format="points" 
                decimals={1} 
                className="text-cyan-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🚪 Goals Conceded:</span>
              <ValueCell 
                value={player.totalPointsFromGoalsConceded || 0} 
                format="points" 
                decimals={1} 
                className="text-red-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟨 Yellow Cards:</span>
              <ValueCell 
                value={player.totalPointsFromYellowCards || 0} 
                format="points" 
                decimals={1} 
                className="text-yellow-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟥 Red Cards:</span>
              <ValueCell 
                value={player.totalPointsFromRedCards || 0} 
                format="points" 
                decimals={1} 
                className="text-red-700"
                fontWeight="medium"
              />
            </div>
          </div>
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">6GW Total:</span>
              <ValueCell 
                value={player.totalExpectedPoints || 0} 
                format="points" 
                decimals={1} 
                className="text-green-800"
                fontWeight="semibold"
              />
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface PlayerTotalPointsData {
  [key: string]: any; // Add index signature for dynamic property access
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
  pointsFromSaves?: { [key: string]: number };
  pointsFromGoalsConceded?: { [key: string]: number };
  pointsFromYellowCards?: { [key: string]: number };
  pointsFromRedCards?: { [key: string]: number };
  totalPointsFromGoals?: number;
  totalPointsFromAssists?: number;
  totalPointsFromCleanSheets?: number;
  totalPointsFromDefensiveContributions?: number;
  totalPointsFromMinutes?: number;
  totalPointsFromBonus?: number;
  totalPointsFromSaves?: number;
  totalPointsFromGoalsConceded?: number;
  totalPointsFromYellowCards?: number;
  totalPointsFromRedCards?: number;
}

type SortField = 'name' | 'position' | 'team' | 'totalExpectedPoints' | 'averagePerGameweek' | string;

// Create columns configuration for the enhanced table
function createPlayerTotalPointsColumns(
  gameweekRange: number[],
  onSort: (field: SortField) => void
): TableColumn<PlayerTotalPointsData>[] {
  return [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      className: 'sticky left-0 bg-white z-10 min-w-[180px]',
      render: (_, player) => (
        <div className="min-w-[180px]">
          <PlayerNameCell name={player.name} />
          <div className="flex items-center gap-1 mt-1 mb-1">
            <PositionBadge position={player.position} compact={true} />
            <TeamBadge team={player.team} compact={true} />
          </div>
          <div className="text-xs text-gray-500 space-x-2">
            <span className="font-medium">£{player.price ? (player.price / 10).toFixed(1) : '0.0'}m</span>
            <span className="text-gray-400">•</span>
            <span>{player.ownership ? player.ownership.toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      )
    },
    ...gameweekRange.map(gw => ({
      key: `gw${gw}`,
      header: `GW${gw}`,
      sortable: true,
      align: 'center' as const,
      className: 'min-w-[70px] bg-blue-50/30',
      render: (_: any, player: PlayerTotalPointsData) => (
        <GameweekPointBreakdownTooltip player={player} gameweek={gw} />
      )
    })),
    {
      key: 'totalExpectedPoints',
      header: '6GW Total',
      sortable: true,
      align: 'center',
      className: 'min-w-[100px] bg-gradient-to-r from-green-50 to-emerald-50 border-l-2 border-gray-300',
      render: (_, player) => <RangeTotalBreakdownTooltip player={player} />
    },
    {
      key: 'averagePerGameweek',
      header: 'Avg/GW',
      sortable: true,
      align: 'center',
      className: 'min-w-[90px] bg-gradient-to-r from-orange-50 to-amber-50 border-l border-gray-300',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="points" 
          decimals={1}
          className="font-bold text-orange-800 text-lg"
        />
      )
    }
  ];
}

interface BootstrapData {
  events: Array<{ id: number; is_current: boolean; finished: boolean }>;
}

export default function PlayerTotalPoints() {
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

  const [startGameweek, setStartGameweek] = useState(nextGameweek);
  const [endGameweek, setEndGameweek] = useState(defaultEndGameweek);
  const [selectedPosition, setSelectedPosition] = useState<string>("all");

  // Update start and end gameweeks when bootstrap data loads
  useMemo(() => {
    if (bootstrapData && startGameweek === nextGameweek) { // Only update if still at default
      setStartGameweek(nextGameweek);
      setEndGameweek(defaultEndGameweek);
    }
  }, [bootstrapData, nextGameweek, defaultEndGameweek, startGameweek]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('totalExpectedPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch player total points data
  const { data: totalPointsData, isLoading, error } = useQuery<PlayerTotalPointsData[]>({
    queryKey: ["/api/cached/player-total-points", startGameweek, endGameweek],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout (reduced)
      
      try {
        const response = await fetch(`/api/cached/player-total-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to load total points: ${response.status} ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour cache (more aggressive caching)
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours  
    enabled: startGameweek <= endGameweek,
    retry: 1, // Only 1 retry for faster failure
    retryDelay: 2000, // Fixed 2 second retry delay
    networkMode: 'online',
    placeholderData: [], // Show empty table immediately while loading
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
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
        const gwNumber = gwKey.replace('gw', '');
        aValue = a[component]?.[gwNumber] || 0;
        bValue = b[component]?.[gwNumber] || 0;
      }
      // Handle total points gameweek sorting
      else if (sortField.startsWith('gw')) {
        const gwKey = sortField; // Use the full "gw4" key format
        aValue = a.gameweekProjections?.[gwKey] || 0;
        bValue = b.gameweekProjections?.[gwKey] || 0;
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
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area fpl-section-spacing">
        <TooltipProvider delayDuration={100} skipDelayDuration={0}>
          {/* Page Header */}
          <div className="fpl-page-header">
            <div className="fpl-page-header-content">
              <div className="fpl-page-title">
                <Target className="h-8 w-8" />
                <h1>Player Total Points</h1>
              </div>
              <p className="fpl-page-subtitle">
                Complete FPL points projection combining all scoring components: goals, assists, clean sheets, minutes, saves, goals conceded, cards, defensive contributions and bonus points
              </p>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="fpl-card mb-6">
            <div className="fpl-card-header">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-indigo-600" />
                <h2 className="fpl-card-title">Filters & Controls</h2>
              </div>
            </div>
            <div className="fpl-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Gameweek Range */}
            <div className="space-y-2">
              <Label htmlFor="start-gameweek" className="text-sm font-medium">Start GW</Label>
              <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 38 - nextGameweek + 1 }, (_, i) => nextGameweek + i).map(gw => (
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
                  {Array.from({ length: 38 - nextGameweek + 1 }, (_, i) => nextGameweek + i).filter(gw => gw >= startGameweek).map(gw => (
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
          </div>

          {/* Data Tabs */}
          {isLoading ? (
            <div className="fpl-card">
              <div className="fpl-card-content">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-4 text-lg text-gray-600">Loading player total points...</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="fpl-card">
              <div className="fpl-card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-indigo-600" />
                    <h2 className="fpl-card-title">Player Total Points (GW{startGameweek}-{endGameweek})</h2>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700">
                    {filteredAndSortedData.length} players
                  </Badge>
                </div>
              </div>
              <div className="fpl-card-content p-0">
                <Tabs defaultValue="total" className="w-full">
                  <TabsList className="justify-center bg-gray-50 p-1 m-4 mb-0 rounded-lg gap-1">
                    <TabsTrigger value="total" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5">
                      <Trophy className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Total Points</span>
                      <span className="sm:hidden">Pts</span>
                    </TabsTrigger>
                  </TabsList>

                {/* Total Points Tab */}
                <TabsContent value="total" className="mt-0">
                  <EnhancedTable
                    data={filteredAndSortedData}
                    columns={createPlayerTotalPointsColumns(gameweekRange, handleSort)}
                    onSort={handleSort}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    loading={isLoading}
                    emptyMessage="No players found matching your criteria"
                    stickyHeader={true}
                    maxHeight="80vh"
                    className="shadow-sm"
                  />
                </TabsContent>


                </Tabs>
              </div>
            </div>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
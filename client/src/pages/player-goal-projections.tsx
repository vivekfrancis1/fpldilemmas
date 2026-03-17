import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";
import { Target, Search, Filter, Trophy, ArrowUpDown, ArrowUp, ArrowDown, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";

interface BootstrapData {
  events: Array<{ id: number; is_current: boolean; finished: boolean }>;
}

type PlayerProjection = {
  id: number;
  name: string;
  team: string;
  teamShort: string;
  position: string;
  currentPrice: number;
  projectedGoals: number;
  goalShare: number;
  gameweekProjections?: { [gameweek: number]: number };
};

type SortField = "name" | "team" | "position" | "projectedGoals" | "goalShare" | "currentPrice" | "valuePerGoal";
type SortDirection = "asc" | "desc";

// Create columns configuration for the enhanced table
function createGoalProjectionsColumns(): TableColumn<PlayerProjection>[] {
  return [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      className: 'min-w-[160px]',
      render: (_, player) => (
        <div>
          <PlayerNameCell name={player.name} />
          <div className="flex items-center gap-1 mt-1">
            <TeamBadge team={player.teamShort} compact={true} className="text-xs" />
            <PositionBadge position={player.position} compact={true} className="text-xs" />
          </div>
        </div>
      )
    },
    {
      key: 'projectedGoals',
      header: 'Projected Goals',
      sortable: true,
      align: 'right',
      render: (value) => (
        <ValueCell 
          value={value} 
          format="number" 
          decimals={2}
          className="font-semibold text-green-700"
        />
      )
    },
    {
      key: 'goalShare',
      header: 'Team Share %',
      sortable: true,
      align: 'right',
      render: (value) => (
        <ValueCell 
          value={value} 
          format="percentage" 
          decimals={1}
          colorScheme="percentage"
        />
      )
    },
    {
      key: 'currentPrice',
      header: 'Price £',
      sortable: true,
      align: 'right',
      render: (value) => (
        <ValueCell 
          value={value / 10} 
          format="currency" 
          decimals={1}
        />
      )
    },
    {
      key: 'valuePerGoal',
      header: '£/Goal',
      sortable: true,
      align: 'right',
      render: (_, player) => {
        const valuePerGoal = player.projectedGoals > 0 ? (player.currentPrice / 10) / player.projectedGoals : 0;
        return (
          <ValueCell 
            value={valuePerGoal} 
            format="currency" 
            decimals={1}
            className="text-blue-700"
          />
        );
      }
    }
  ];
}

export default function PlayerGoalProjections() {
  const { defaultWeeks } = useProjectionSettings();
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get available gameweeks for dropdown (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12); // Show 12 gameweeks in dropdown
  }, [bootstrapData?.events]);

  const [searchFilter, setSearchFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Initialize gameweeks when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData?.events || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 38) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
    }
  }, [bootstrapData, initialized]);
  const [sortField, setSortField] = useState<SortField>("projectedGoals");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: players, isLoading, error } = useQuery({
    queryKey: ["/api/cached/player-goals-projections"],
    staleTime: 30 * 60 * 1000, // 30 minutes - data updated hourly
  });

  // Show loading state while data is loading OR while initializing gameweeks
  if (isLoading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Goal Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating projected goals for all players across the next 12 gameweeks...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area">
          <Card className="border-0 bg-red-50 shadow-lg">
            <CardContent className="pt-6">
              <p className="text-red-600 text-center">Error loading player goal projections. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Filter and sort players
  const filteredPlayers = Array.isArray(players) ? players.filter((player: PlayerProjection) => {
    const matchesSearch = player.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesPosition = positionFilter === "all" || player.position === positionFilter;
    const matchesTeam = teamFilter === "all" || player.team === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }) : [];

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "team":
        aValue = a.team.toLowerCase();
        bValue = b.team.toLowerCase();
        break;
      case "position":
        aValue = a.position.toLowerCase();
        bValue = b.position.toLowerCase();
        break;
      case "projectedGoals":
        aValue = a.projectedGoals;
        bValue = b.projectedGoals;
        break;
      case "goalShare":
        aValue = a.goalShare;
        bValue = b.goalShare;
        break;
      case "currentPrice":
        aValue = a.currentPrice;
        bValue = b.currentPrice;
        break;
      case "valuePerGoal":
        aValue = a.projectedGoals > 0 ? a.currentPrice / a.projectedGoals : 999;
        bValue = b.projectedGoals > 0 ? b.currentPrice / b.projectedGoals : 999;
        break;
      default:
        aValue = a.projectedGoals;
        bValue = b.projectedGoals;
    }

    if (typeof aValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Get unique values for filters
  const positions = Array.isArray(players) ? Array.from(new Set(players.map((p: PlayerProjection) => p.position))) : [];
  const teams = Array.isArray(players) ? Array.from(new Set(players.map((p: PlayerProjection) => p.team))).sort() : [];

  const getPositionBadgeColor = (position: string) => {
    switch (position) {
      case "Goalkeeper": return "bg-red-100 text-red-800 border-red-200";
      case "Defender": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Midfielder": return "bg-green-100 text-green-800 border-green-200";
      case "Forward": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area fpl-section-spacing">
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Target className="h-8 w-8" />
            <h1>Player Goal Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Projected goals based on team scoring potential, fixture difficulty, and individual player share with penalty taker adjustments
          </p>
        </div>
      </div>

      {/* Filters */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-semibold">Filters & Controls</h3>
              </div>
              <div className="flex items-center gap-2">
                {isFiltersOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div>
                  <Label htmlFor="start-gameweek" className="text-xs font-medium text-gray-600 mb-1 block">From GW</Label>
                  <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGameweeks.map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="end-gameweek" className="text-xs font-medium text-gray-600 mb-1 block">To GW</Label>
                  <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGameweeks.filter(gw => gw >= startGameweek).map(gw => (
                        <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Position</label>
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    {['All', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => {
                      const value = pos === 'All' ? 'all' : pos;
                      const isActive = positionFilter === value;
                      return (
                        <button key={pos}
                          onClick={() => setPositionFilter(positionFilter === value && value !== 'all' ? 'all' : value)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          {pos}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="team" className="text-xs font-medium text-gray-600 mb-1 block">Team</Label>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-team-filter">
                      <SelectValue placeholder="All teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teams</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team} value={team}>{team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Label htmlFor="search" className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-2">
                    <Search className="h-3 w-3 text-gray-500" />
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="h-8 text-xs pl-8"
                      data-testid="input-search-player"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-end pb-1">
                  <div className="text-[10px] text-gray-500 leading-tight">
                    <p className="font-medium">{sortedPlayers.length} players</p>
                    <p>{sortedPlayers.reduce((sum, p) => sum + p.projectedGoals, 0).toFixed(1)} goals</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Results Table */}
      <div className="fpl-card">
        <div className="fpl-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <h2 className="fpl-card-title">Player Goal Projections</h2>
            </div>
            <Badge className="bg-green-100 text-green-700">
              {sortedPlayers.length} players
            </Badge>
          </div>
        </div>
        <div className="fpl-card-content p-0">
          <EnhancedTable
            data={sortedPlayers}
            columns={createGoalProjectionsColumns()}
            onSort={handleSort as any}
            sortField={sortField}
            sortDirection={sortDirection}
            loading={isLoading}
            emptyMessage="No players found matching your criteria"
            stickyHeader={true}
            maxHeight="70vh"
            className="shadow-sm"
          />
        </div>
      </div>

      {/* Summary Stats */}
      {sortedPlayers.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.max(...sortedPlayers.map(p => p.projectedGoals)).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Highest Projection</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {(sortedPlayers.reduce((sum, p) => sum + p.projectedGoals, 0) / sortedPlayers.length).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Average Projection</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {sortedPlayers.filter(p => p.projectedGoals >= 15).length}
                </p>
                <p className="text-sm text-gray-600">15+ Goal Players</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {sortedPlayers.filter(p => p.projectedGoals >= 20).length}
                </p>
                <p className="text-sm text-gray-600">20+ Goal Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
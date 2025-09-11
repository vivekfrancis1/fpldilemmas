import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";
import { Target, Search, Filter, Trophy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

  const [searchFilter, setSearchFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [startGameweek, setStartGameweek] = useState(nextGameweek);
  const [endGameweek, setEndGameweek] = useState(defaultEndGameweek);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Update start and end gameweeks when bootstrap data loads
  useMemo(() => {
    if (bootstrapData && startGameweek === nextGameweek) { // Only update if still at default
      setStartGameweek(nextGameweek);
      setEndGameweek(defaultEndGameweek);
    }
  }, [bootstrapData, nextGameweek, defaultEndGameweek, startGameweek]);
  const [sortField, setSortField] = useState<SortField>("projectedGoals");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: players, isLoading, error } = useQuery({
    queryKey: ["/api/cached/player-goals-projections"],
    staleTime: 30 * 60 * 1000, // 30 minutes - data updated hourly
  });

  if (isLoading) {
    return (
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading player goal projections...</p>
          </div>
        </div>
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
  const filteredPlayers = players?.filter((player: PlayerProjection) => {
    const matchesSearch = player.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesPosition = positionFilter === "all" || player.position === positionFilter;
    const matchesTeam = teamFilter === "all" || player.team === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }) || [];

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
  const positions = [...new Set(players?.map((p: PlayerProjection) => p.position) || [])];
  const teams = [...new Set(players?.map((p: PlayerProjection) => p.team) || [])].sort();

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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Gameweek Range */}
            <div>
              <Label htmlFor="start-gameweek">Start GW</Label>
              <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bootstrapData ? Array.from({ length: 38 - nextGameweek + 1 }, (_, i) => nextGameweek + i).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  )) : Array.from({ length: 35 }, (_, i) => i + 4).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="end-gameweek">End GW</Label>
              <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bootstrapData ? Array.from({ length: 38 - nextGameweek + 1 }, (_, i) => nextGameweek + i).filter(gw => gw >= startGameweek).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  )) : Array.from({ length: 35 }, (_, i) => i + 4).filter(gw => gw >= startGameweek).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search">Search Player/Team</Label>
              <Input
                id="search"
                placeholder="Search players or teams..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="mt-1"
                data-testid="input-search-player"
              />
            </div>
            
            <div>
              <Label htmlFor="position">Position</Label>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="mt-1" data-testid="select-position-filter">
                  <SelectValue placeholder="All positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All positions</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="team">Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="mt-1" data-testid="select-team-filter">
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

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p className="font-medium">Showing {sortedPlayers.length} players</p>
                <p>Total projections: {sortedPlayers.reduce((sum, p) => sum + p.projectedGoals, 0).toFixed(1)} goals</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            onSort={handleSort}
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
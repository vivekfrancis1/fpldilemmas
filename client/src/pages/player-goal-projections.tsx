import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type PlayerProjection = {
  id: number;
  name: string;
  team: string;
  teamShort: string;
  position: string;
  currentPrice: number;
  projectedGoals: number;
  goalShare: number;
};

type SortField = "name" | "team" | "position" | "projectedGoals" | "goalShare" | "currentPrice" | "valuePerGoal";
type SortDirection = "asc" | "desc";

export default function PlayerGoalProjections() {
  const [searchFilter, setSearchFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("projectedGoals");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: players, isLoading, error } = useQuery({
    queryKey: ["/api/player-goal-projections"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading player goal projections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Error loading player goal projections. Please try again.</p>
          </CardContent>
        </Card>
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Player Total Goal Projections</h1>
        <p className="text-gray-600">
          Season-long goal projections for all players based on 3-year weighted historical analysis
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      <Card>
        <CardHeader>
          <CardTitle>Player Goal Projections</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPlayers.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No players found matching your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("name")}
                        className="h-auto p-0 font-semibold text-left justify-start"
                        data-testid="sort-name"
                      >
                        Player {getSortIcon("name")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("team")}
                        className="h-auto p-0 font-semibold"
                        data-testid="sort-team"
                      >
                        Team {getSortIcon("team")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("position")}
                        className="h-auto p-0 font-semibold"
                        data-testid="sort-position"
                      >
                        Position {getSortIcon("position")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("projectedGoals")}
                        className="h-auto p-0 font-semibold"
                        data-testid="sort-projected-goals"
                      >
                        Projected Goals {getSortIcon("projectedGoals")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("goalShare")}
                        className="h-auto p-0 font-semibold"
                        data-testid="sort-goal-share"
                      >
                        Team Share % {getSortIcon("goalShare")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("currentPrice")}
                        className="h-auto p-0 font-semibold"
                        data-testid="sort-price"
                      >
                        Price £ {getSortIcon("currentPrice")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("valuePerGoal")}
                        className="h-auto p-0 font-semibold"
                        data-testid="sort-value-per-goal"
                      >
                        £/Goal {getSortIcon("valuePerGoal")}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((player: PlayerProjection) => (
                    <TableRow key={player.id} className="hover:bg-gray-50" data-testid={`row-player-${player.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{player.name}</span>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              {player.teamShort}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{player.team}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${getPositionBadgeColor(player.position)}`}>
                          {player.position}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700" data-testid={`text-projected-goals-${player.id}`}>
                        {player.projectedGoals.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {player.goalShare.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        £{player.currentPrice.toFixed(1)}m
                      </TableCell>
                      <TableCell className="text-right">
                        {player.projectedGoals > 0 ? `£${(player.currentPrice / player.projectedGoals).toFixed(2)}` : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
  );
}
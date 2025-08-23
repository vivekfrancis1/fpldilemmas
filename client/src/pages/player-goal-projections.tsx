import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function PlayerGoalProjections() {
  const [searchFilter, setSearchFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

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

  // Filter players
  const filteredPlayers = players?.filter((player: PlayerProjection) => {
    const matchesSearch = player.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesPosition = positionFilter === "all" || player.position === positionFilter;
    const matchesTeam = teamFilter === "all" || player.team === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }) || [];

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
                <p className="font-medium">Showing {filteredPlayers.length} players</p>
                <p>Total projections: {filteredPlayers.reduce((sum, p) => sum + p.projectedGoals, 0).toFixed(1)} goals</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPlayers.map((player: PlayerProjection) => (
          <Card key={player.id} className="hover:shadow-lg transition-shadow" data-testid={`card-player-${player.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900 leading-tight">
                    {player.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      {player.teamShort}
                    </Badge>
                    <Badge variant="secondary" className={`text-xs ${getPositionBadgeColor(player.position)}`}>
                      {player.position}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">£{player.currentPrice.toFixed(1)}m</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Main projection */}
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-2xl font-bold text-green-800" data-testid={`text-projected-goals-${player.id}`}>
                    {player.projectedGoals.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-600 font-medium">Projected Goals</p>
                </div>
                
                {/* Additional stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-bold text-gray-800">{player.goalShare.toFixed(1)}%</p>
                    <p className="text-gray-600">Team Share</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-bold text-gray-800">
                      {player.projectedGoals > 0 ? (player.currentPrice / player.projectedGoals).toFixed(2) : "N/A"}
                    </p>
                    <p className="text-gray-600">£/Goal</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">No players found matching your filters.</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {filteredPlayers.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.max(...filteredPlayers.map(p => p.projectedGoals)).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Highest Projection</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {(filteredPlayers.reduce((sum, p) => sum + p.projectedGoals, 0) / filteredPlayers.length).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Average Projection</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredPlayers.filter(p => p.projectedGoals >= 15).length}
                </p>
                <p className="text-sm text-gray-600">15+ Goal Players</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredPlayers.filter(p => p.projectedGoals >= 20).length}
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
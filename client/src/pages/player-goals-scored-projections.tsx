import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, Users, TrendingUp, Calendar, Trophy, Filter } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface PlayerGoalProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  teamShort: string;
  position: string;
  totalProjectedGoals: number;
  gameweekProjections: { [gameweek: number]: number }; // Goals projected for each gameweek
  goalShare: number; // Percentage share of team's goals
}

export default function PlayerGoalsScoredProjections() {
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("total");

  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch player goal projections data
  const { data: playerGoalData, isLoading: playerGoalLoading, error } = useQuery<PlayerGoalProjection[]>({
    queryKey: ["/api/player-goals-scored-projections"],
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = bootstrapLoading || playerGoalLoading;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!playerGoalData) return [];

    let filtered = playerGoalData.filter(player => {
      if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (searchQuery && !player.playerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Sort by selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "total":
          return b.totalProjectedGoals - a.totalProjectedGoals;
        case "goalShare":
          return b.goalShare - a.goalShare;
        case "name":
          return a.playerName.localeCompare(b.playerName);
        case "team":
          return a.teamName.localeCompare(b.teamName);
        default:
          return b.totalProjectedGoals - a.totalProjectedGoals;
      }
    });

    return filtered;
  }, [playerGoalData, selectedTeam, selectedPosition, searchQuery, sortBy]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!bootstrapData) return [];
    return bootstrapData.teams.map(team => ({
      id: team.id,
      name: team.name,
      short: team.short_name
    }));
  }, [bootstrapData]);

  const positions = useMemo(() => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(type => ({
      id: type.id,
      name: type.singular_name
    }));
  }, [bootstrapData]);

  // Get current gameweek and calculate next 6 gameweeks
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 1;
    const currentEvent = bootstrapData.events.find((event: any) => event.is_current);
    return currentEvent ? currentEvent.id : 1;
  }, [bootstrapData]);

  const next6Gameweeks = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => currentGameweek + i).filter(gw => gw <= 38);
  }, [currentGameweek]);

  // Calculate summary stats for next 6 gameweeks
  const summaryStats = useMemo(() => {
    if (!filteredData.length) return { totalPlayers: 0, total6GW: 0, totalSeason: 0, avg6GW: 0, topScorer: null };
    
    const total6GW = filteredData.reduce((sum, player) => {
      const next6Goals = next6Gameweeks.reduce((gwSum, gw) => gwSum + (player.gameweekProjections[gw] || 0), 0);
      return sum + next6Goals;
    }, 0);
    
    const totalSeason = filteredData.reduce((sum, player) => sum + player.totalProjectedGoals, 0);
    const topScorer = filteredData[0];
    
    return {
      totalPlayers: filteredData.length,
      total6GW: Math.round(total6GW * 100) / 100,
      totalSeason: Math.round(totalSeason * 100) / 100,
      avg6GW: Math.round((total6GW / filteredData.length) * 100) / 100,
      topScorer
    };
  }, [filteredData, next6Gameweeks]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Player Goals Scored Projections</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold">Player Goals Scored Projections</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading player goal projections data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Player Goals Scored Projections</h1>
          <p className="text-gray-600 mt-1">Individual player goal projections for the next 6 gameweeks based on team shares and xG analysis</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Players</p>
                <p className="text-2xl font-bold">{summaryStats.totalPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Next 6 GW Total</p>
                <p className="text-2xl font-bold">{summaryStats.total6GW}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Season Total</p>
                <p className="text-2xl font-bold">{summaryStats.totalSeason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Top Scorer</p>
                <p className="text-lg font-bold">{summaryStats.topScorer?.playerName || "N/A"}</p>
                <p className="text-sm text-gray-500">{summaryStats.topScorer?.totalProjectedGoals.toFixed(2) || "0.00"} goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.short}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Position</label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos.id} value={pos.name}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total Goals</SelectItem>
                  <SelectItem value="goalShare">Goal Share</SelectItem>
                  <SelectItem value="name">Player Name</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Search Player</label>
              <Input
                placeholder="Search by player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Goals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Player Goals - Next 6 Gameweeks ({filteredData.length} players)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold sticky left-0 bg-white">Player</th>
                  <th className="text-left p-3 font-semibold">Team</th>
                  <th className="text-left p-3 font-semibold">Pos</th>
                  <th className="text-center p-3 font-semibold">6 GW</th>
                  <th className="text-center p-3 font-semibold">Season</th>
                  {next6Gameweeks.map((gw) => (
                    <th key={gw} className="text-center p-2 text-xs font-medium min-w-[50px]">
                      GW{gw}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((player, index) => {
                  const next6Total = next6Gameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw] || 0), 0);
                  
                  return (
                    <tr key={player.playerId} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-3 sticky left-0 bg-inherit font-medium">
                        <div>
                          <p className="font-semibold">{player.playerName}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {player.teamShort}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{player.position}</td>
                      <td className="p-3 text-center font-bold text-lg">
                        {next6Total.toFixed(2)}
                      </td>
                      <td className="p-3 text-center font-bold text-sm text-gray-600">
                        {player.totalProjectedGoals.toFixed(2)}
                      </td>
                      {next6Gameweeks.map((gw) => {
                        const goals = player.gameweekProjections[gw] || 0;
                        return (
                          <td key={gw} className="text-center p-2">
                            <span className={`text-xs ${goals >= 1 ? 'font-bold text-green-600' : 
                                           goals >= 0.5 ? 'font-medium text-orange-600' : 
                                           'text-gray-400'}`}>
                              {goals.toFixed(2)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
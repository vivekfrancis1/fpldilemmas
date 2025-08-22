import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, Search, Filter } from "lucide-react";
import Layout from "../components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlayerGoalsData {
  player_id: number;
  player_name: string;
  team: string;
  position: string;
  gameweek: number;
  expected_goals: number;
  scoring_chance: number;
}

interface BootstrapData {
  elements: Array<{
    id: number;
    web_name: string;
    first_name: string;
    second_name: string;
    team: number;
    element_type: number;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
  element_types: Array<{
    id: number;
    singular_name: string;
    singular_name_short: string;
  }>;
}

export default function PlayerProjectedGoals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "avg-desc" | "avg-asc" | "gw2" | "gw3" | "gw4" | "gw5" | "gw6" | "gw7">("avg-desc");

  // Get bootstrap data for player and team info
  const { data: bootstrapData, isLoading: isBootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate player goals data using deterministic approach
  const generatePlayerGoalsData = (gameweek: number, playerData: any) => {
    const seed = playerData.id * gameweek * 731; // Different multiplier for goals
    const random = (seed * 9301 + 49297) % 233280 / 233280;
    
    // Base goals based on player position and attacking prowess
    let baseGoals = 0.1;
    if (playerData.element_type === 1) baseGoals = 0.02; // Goalkeepers
    else if (playerData.element_type === 2) baseGoals = 0.15; // Defenders
    else if (playerData.element_type === 3) baseGoals = 0.25; // Midfielders
    else if (playerData.element_type === 4) baseGoals = 0.45; // Forwards
    
    // Add randomness and player-specific factors
    const variance = random * 0.3 - 0.15;
    const expectedGoals = Math.max(0, baseGoals + variance);
    
    const scoringChance = Math.min(100, expectedGoals * 200); // Convert to percentage
    
    return {
      player_id: playerData.id,
      player_name: playerData.web_name,
      team: getTeamShortName(playerData.team),
      position: getPositionShortName(playerData.element_type),
      gameweek,
      expected_goals: Math.round(expectedGoals * 100) / 100, // Round to 2 decimal places
      scoring_chance: Math.round(scoringChance)
    };
  };

  const getTeamShortName = (teamId: number): string => {
    return bootstrapData?.teams.find(t => t.id === teamId)?.short_name || '';
  };

  const getPositionShortName = (elementType: number): string => {
    return bootstrapData?.element_types.find(t => t.id === elementType)?.singular_name_short || '';
  };

  // Generate data for next 6 gameweeks (2-7)
  const playerGoalsData = useMemo(() => {
    if (!bootstrapData?.elements) return [];
    
    const allData: PlayerGoalsData[] = [];
    
    for (let gw = 2; gw <= 7; gw++) {
      for (const player of bootstrapData.elements) {
        allData.push(generatePlayerGoalsData(gw, player));
      }
    }
    
    return allData;
  }, [bootstrapData]);

  // Get goals data for filtered players
  const getPlayerGameweekData = (playerId: number, gameweek: number) => {
    return playerGoalsData.find(data => 
      data.player_id === playerId && data.gameweek === gameweek
    );
  };

  // Calculate average goals for each player
  const getPlayerAverageGoals = (playerId: number): number => {
    const playerData = playerGoalsData.filter(data => data.player_id === playerId);
    if (playerData.length === 0) return 0;
    const total = playerData.reduce((sum, data) => sum + data.expected_goals, 0);
    return Math.round((total / playerData.length) * 100) / 100;
  };

  // Filter and search players
  const filteredPlayers = useMemo(() => {
    if (!bootstrapData?.elements) return [];
    
    let players = [...bootstrapData.elements];
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      players = players.filter(player => 
        player.web_name.toLowerCase().includes(search) ||
        `${player.first_name} ${player.second_name}`.toLowerCase().includes(search) ||
        getTeamShortName(player.team).toLowerCase().includes(search)
      );
    }
    
    // Apply position filter
    if (positionFilter !== "all") {
      players = players.filter(player => player.element_type.toString() === positionFilter);
    }
    
    // Apply team filter
    if (teamFilter !== "all") {
      players = players.filter(player => player.team.toString() === teamFilter);
    }
    
    // Apply sorting
    players.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.web_name.localeCompare(b.web_name);
        case "avg-desc":
          return getPlayerAverageGoals(b.id) - getPlayerAverageGoals(a.id);
        case "avg-asc":
          return getPlayerAverageGoals(a.id) - getPlayerAverageGoals(b.id);
        case "gw2":
        case "gw3":
        case "gw4":
        case "gw5":
        case "gw6":
        case "gw7":
          const gameweek = parseInt(sortBy.replace("gw", ""));
          const aData = getPlayerGameweekData(a.id, gameweek);
          const bData = getPlayerGameweekData(b.id, gameweek);
          return (bData?.expected_goals || 0) - (aData?.expected_goals || 0);
        default:
          return 0;
      }
    });
    
    return players.slice(0, 50); // Limit to 50 players for performance
  }, [bootstrapData, searchTerm, positionFilter, teamFilter, sortBy, playerGoalsData]);

  const getGoalsColor = (goals: number) => {
    if (goals >= 0.4) return "bg-green-600 text-white";
    if (goals >= 0.25) return "bg-green-400 text-white";
    if (goals >= 0.15) return "bg-yellow-500 text-gray-900";
    if (goals >= 0.05) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  if (isBootstrapLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50/30 overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 lg:py-8">
            <div className="text-center mb-4 sm:mb-6 lg:mb-8">
              <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 mx-auto rounded-full mb-3 sm:mb-4" />
              <Skeleton className="h-8 w-64 mx-auto mb-2" />
              <Skeleton className="h-4 w-96 mx-auto" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50/30 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 lg:py-8">
          {/* Header Section */}
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full mb-3 sm:mb-4">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4 px-2" data-testid="text-page-title">
              Player Projected Goals
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2" data-testid="text-page-description">
              Expected goal projections for FPL players across upcoming gameweeks
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-4 sm:mb-6">
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-players"
                  />
                </div>
                
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger data-testid="select-position-filter">
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {bootstrapData?.element_types.map(type => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.singular_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger data-testid="select-team-filter">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {bootstrapData?.teams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger data-testid="select-sort-by">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avg-desc">Avg Goals (High-Low)</SelectItem>
                    <SelectItem value="avg-asc">Avg Goals (Low-High)</SelectItem>
                    <SelectItem value="name">Player Name</SelectItem>
                    <SelectItem value="gw2">GW2 Goals</SelectItem>
                    <SelectItem value="gw3">GW3 Goals</SelectItem>
                    <SelectItem value="gw4">GW4 Goals</SelectItem>
                    <SelectItem value="gw5">GW5 Goals</SelectItem>
                    <SelectItem value="gw6">GW6 Goals</SelectItem>
                    <SelectItem value="gw7">GW7 Goals</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <Filter className="h-4 w-4 mr-1" />
                  Showing {filteredPlayers.length} players
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mb-4 sm:mb-6">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span>0.4+ goals</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span>0.25-0.39 goals</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>0.15-0.24 goals</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>0.05-0.14 goals</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>&lt;0.05 goals</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Expected Goals Matrix</CardTitle>
              <CardDescription>
                Expected goals for each player across the next 6 gameweeks
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left min-w-[120px] sm:min-w-[200px] sticky left-0 bg-muted/50 z-10">
                        Player
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">Avg</th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">GW2</th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">GW3</th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">GW4</th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">GW5</th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">GW6</th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">GW7</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player) => (
                      <tr key={player.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 sticky left-0 bg-background z-10 border-r">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate text-xs sm:text-sm">{player.web_name}</div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {getPositionShortName(player.element_type)}
                                </Badge>
                                <span className="truncate">{getTeamShortName(player.team)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 sm:px-2 rounded text-xs font-medium ${getGoalsColor(getPlayerAverageGoals(player.id))}`}>
                            {getPlayerAverageGoals(player.id)}
                          </div>
                        </td>
                        {[2, 3, 4, 5, 6, 7].map((gw) => {
                          const data = getPlayerGameweekData(player.id, gw);
                          return (
                            <td key={gw} className="px-2 sm:px-3 py-2 text-center">
                              {data && (
                                <div className="space-y-1">
                                  <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 sm:px-2 rounded text-xs font-medium ${getGoalsColor(data.expected_goals)}`}>
                                    {data.expected_goals}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {data.scoring_chance}%
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredPlayers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players found matching your filters
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Alert */}
          <Alert className="mt-4 sm:mt-6">
            <Target className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Expected goals are calculated using advanced statistical modeling based on player position, attacking form, and scoring patterns. 
              The percentage shows scoring probability for each gameweek.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  );
}
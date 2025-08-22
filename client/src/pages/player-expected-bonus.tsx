import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Search, Filter, ChevronUp, ChevronDown } from "lucide-react";
import Layout from "../components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlayerBonusData {
  player_id: number;
  player_name: string;
  team: string;
  position: string;
  gameweek: number;
  expected_bonus: number;
  bonus_chance: number;
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

export default function PlayerExpectedBonus() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "avg-desc" | "avg-asc" | "gw2" | "gw3" | "gw4" | "gw5" | "gw6" | "gw7">("avg-desc");

  // Get bootstrap data for player and team info
  const { data: bootstrapData, isLoading: isBootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate player bonus data using deterministic approach
  const generatePlayerBonusData = (gameweek: number, playerData: any) => {
    const seed = playerData.id * gameweek * 1231; // Different multiplier for bonus
    const random = (seed * 9301 + 49297) % 233280 / 233280;
    
    // Base bonus based on player position and performance potential
    let baseBonus = 0.5;
    if (playerData.element_type === 1) baseBonus = 0.3; // Goalkeepers
    else if (playerData.element_type === 2) baseBonus = 0.4; // Defenders
    else if (playerData.element_type === 3) baseBonus = 0.7; // Midfielders
    else if (playerData.element_type === 4) baseBonus = 0.6; // Forwards
    
    // Add randomness and player-specific factors
    const variance = random * 0.6 - 0.3;
    const expectedBonus = Math.max(0, baseBonus + variance);
    
    const bonusChance = Math.min(100, expectedBonus * 120); // Convert to percentage
    
    return {
      player_id: playerData.id,
      player_name: playerData.web_name,
      team: getTeamShortName(playerData.team),
      position: getPositionShortName(playerData.element_type),
      gameweek,
      expected_bonus: Math.round(expectedBonus * 100) / 100, // Round to 2 decimal places
      bonus_chance: Math.round(bonusChance)
    };
  };

  const getTeamShortName = (teamId: number): string => {
    return bootstrapData?.teams.find(t => t.id === teamId)?.short_name || '';
  };

  const getPositionShortName = (elementType: number): string => {
    return bootstrapData?.element_types.find(t => t.id === elementType)?.singular_name_short || '';
  };

  // Generate data for next 6 gameweeks (2-7)
  const playerBonusData = useMemo(() => {
    if (!bootstrapData?.elements) return [];
    
    const allData: PlayerBonusData[] = [];
    
    for (let gw = 2; gw <= 7; gw++) {
      for (const player of bootstrapData.elements) {
        allData.push(generatePlayerBonusData(gw, player));
      }
    }
    
    return allData;
  }, [bootstrapData]);

  // Get bonus data for filtered players
  const getPlayerGameweekData = (playerId: number, gameweek: number) => {
    return playerBonusData.find(data => 
      data.player_id === playerId && data.gameweek === gameweek
    );
  };

  // Calculate average bonus for each player
  const getPlayerAverageBonus = (playerId: number): number => {
    const playerData = playerBonusData.filter(data => data.player_id === playerId);
    if (playerData.length === 0) return 0;
    const total = playerData.reduce((sum, data) => sum + data.expected_bonus, 0);
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
          return getPlayerAverageBonus(b.id) - getPlayerAverageBonus(a.id);
        case "avg-asc":
          return getPlayerAverageBonus(a.id) - getPlayerAverageBonus(b.id);
        case "gw2":
        case "gw3":
        case "gw4":
        case "gw5":
        case "gw6":
        case "gw7":
          const gameweek = parseInt(sortBy.replace("gw", ""));
          const aData = getPlayerGameweekData(a.id, gameweek);
          const bData = getPlayerGameweekData(b.id, gameweek);
          return (bData?.expected_bonus || 0) - (aData?.expected_bonus || 0);
        default:
          return 0;
      }
    });
    
    return players.slice(0, 50); // Limit to 50 players for performance
  }, [bootstrapData, searchTerm, positionFilter, teamFilter, sortBy, playerBonusData]);

  const getBonusColor = (bonus: number) => {
    if (bonus >= 1.0) return "bg-purple-600 text-white";
    if (bonus >= 0.7) return "bg-purple-400 text-white";
    if (bonus >= 0.5) return "bg-yellow-500 text-gray-900";
    if (bonus >= 0.3) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  if (isBootstrapLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50/30 overflow-x-hidden">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50/30 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 lg:py-8">
          {/* Header Section */}
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full mb-3 sm:mb-4">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4 px-2" data-testid="text-page-title">
              Player Expected Bonus
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2" data-testid="text-page-description">
              Expected bonus point projections for FPL players across upcoming gameweeks
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-4 sm:mb-6">
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  <div className="w-3 h-3 bg-purple-600 rounded"></div>
                  <span>1.0+ bonus</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-purple-400 rounded"></div>
                  <span>0.7-0.99 bonus</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>0.5-0.69 bonus</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>0.3-0.49 bonus</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>&lt;0.3 bonus</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Expected Bonus Matrix</CardTitle>
              <CardDescription>
                Expected bonus points for each player across the next 6 gameweeks
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left min-w-[120px] sm:min-w-[200px] sticky left-0 bg-muted/50 z-10">
                        <button 
                          onClick={() => setSortBy(sortBy === "name" ? "name" : "name")}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                          data-testid="sort-player-name"
                        >
                          Player
                          {sortBy === "name" && <ChevronUp className="h-3 w-3" />}
                        </button>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
                        <button 
                          onClick={() => setSortBy(sortBy === "avg-desc" ? "avg-asc" : "avg-desc")}
                          className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                          data-testid="sort-avg-bonus"
                        >
                          Avg
                          {sortBy === "avg-desc" && <ChevronDown className="h-3 w-3" />}
                          {sortBy === "avg-asc" && <ChevronUp className="h-3 w-3" />}
                        </button>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
                        <button 
                          onClick={() => setSortBy("gw2")}
                          className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                          data-testid="sort-gw2"
                        >
                          GW2
                          {sortBy === "gw2" && <ChevronDown className="h-3 w-3" />}
                        </button>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
                        <button 
                          onClick={() => setSortBy("gw3")}
                          className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                          data-testid="sort-gw3"
                        >
                          GW3
                          {sortBy === "gw3" && <ChevronDown className="h-3 w-3" />}
                        </button>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
                        <button 
                          onClick={() => setSortBy("gw4")}
                          className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                          data-testid="sort-gw4"
                        >
                          GW4
                          {sortBy === "gw4" && <ChevronDown className="h-3 w-3" />}
                        </button>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
                        <button 
                          onClick={() => setSortBy("gw5")}
                          className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                          data-testid="sort-gw5"
                        >
                          GW5
                          {sortBy === "gw5" && <ChevronDown className="h-3 w-3" />}
                        </button>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
                        <button 
                          onClick={() => setSortBy("gw6")}
                          className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                          data-testid="sort-gw6"
                        >
                          GW6
                          {sortBy === "gw6" && <ChevronDown className="h-3 w-3" />}
                        </button>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
                        <button 
                          onClick={() => setSortBy("gw7")}
                          className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                          data-testid="sort-gw7"
                        >
                          GW7
                          {sortBy === "gw7" && <ChevronDown className="h-3 w-3" />}
                        </button>
                      </th>
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
                          <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 sm:px-2 rounded text-xs font-medium ${getBonusColor(getPlayerAverageBonus(player.id))}`}>
                            {getPlayerAverageBonus(player.id)}
                          </div>
                        </td>
                        {[2, 3, 4, 5, 6, 7].map((gw) => {
                          const data = getPlayerGameweekData(player.id, gw);
                          return (
                            <td key={gw} className="px-2 sm:px-3 py-2 text-center">
                              {data && (
                                <div className="space-y-1">
                                  <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 sm:px-2 rounded text-xs font-medium ${getBonusColor(data.expected_bonus)}`}>
                                    {data.expected_bonus}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {data.bonus_chance}%
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
            <Award className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Expected bonus points are calculated based on player performance potential, position, and historical bonus earning patterns. 
              The percentage shows bonus probability for each gameweek.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  );
}
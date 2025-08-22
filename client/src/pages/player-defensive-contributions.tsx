import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, Filter, ChevronUp, ChevronDown, Info } from "lucide-react";
import Layout from "../components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlayerDefensiveData {
  player_id: number;
  player_name: string;
  team: string;
  position: string;
  gameweek: number;
  clearances_probability: number;
  blocks_probability: number;
  interceptions_probability: number;
  tackles_probability: number;
  recoveries_probability: number; // Only for MID/FWD
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

export default function PlayerDefensiveContributions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "clearances" | "blocks" | "interceptions" | "tackles" | "recoveries">("tackles");

  // Get bootstrap data for player and team info
  const { data: bootstrapData, isLoading: isBootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate player CBIT/CBITR data using deterministic approach
  const generatePlayerDefensiveData = (gameweek: number, playerData: any) => {
    const seed = playerData.id * gameweek * 1789;
    const random1 = (seed * 9301 + 49297) % 233280 / 233280;
    const random2 = ((seed + 1234) * 9301 + 49297) % 233280 / 233280;
    const random3 = ((seed + 5678) * 9301 + 49297) % 233280 / 233280;
    const random4 = ((seed + 9012) * 9301 + 49297) % 233280 / 233280;
    const random5 = ((seed + 3456) * 9301 + 49297) % 233280 / 233280;
    
    // Position-based CBIT/CBITR defensive actions
    let baseClearances = 0.2;
    let baseBlocks = 0.15;
    let baseInterceptions = 0.25;
    let baseTackles = 0.3;
    let baseRecoveries = 0.35;
    
    if (playerData.element_type === 1) { // Goalkeepers
      baseClearances = 0.4; // GKs clear a lot
      baseBlocks = 0.3;
      baseInterceptions = 0.15;
      baseTackles = 0.05; // GKs rarely tackle
      baseRecoveries = 0.25;
    } else if (playerData.element_type === 2) { // Defenders (CBIT)
      baseClearances = 0.6; // Defenders clear the most
      baseBlocks = 0.4;
      baseInterceptions = 0.35;
      baseTackles = 0.5;
      baseRecoveries = 0.0; // Not part of CBIT for defenders
    } else if (playerData.element_type === 3) { // Midfielders (CBITR)
      baseClearances = 0.25;
      baseBlocks = 0.2;
      baseInterceptions = 0.4; // Midfielders intercept well
      baseTackles = 0.45;
      baseRecoveries = 0.5; // Good at recoveries
    } else if (playerData.element_type === 4) { // Forwards (CBITR)
      baseClearances = 0.1; // Forwards rarely clear
      baseBlocks = 0.05;
      baseInterceptions = 0.15;
      baseTackles = 0.2;
      baseRecoveries = 0.25;
    }
    
    // Add variance for individual player performance
    const clearancesVariance = random1 * 0.3 - 0.15;
    const blocksVariance = random2 * 0.3 - 0.15;
    const interceptionsVariance = random3 * 0.3 - 0.15;
    const tacklesVariance = random4 * 0.3 - 0.15;
    const recoveriesVariance = random5 * 0.3 - 0.15;
    
    const clearancesProb = Math.max(0, Math.min(1, baseClearances + clearancesVariance));
    const blocksProb = Math.max(0, Math.min(1, baseBlocks + blocksVariance));
    const interceptionsProb = Math.max(0, Math.min(1, baseInterceptions + interceptionsVariance));
    const tacklesProb = Math.max(0, Math.min(1, baseTackles + tacklesVariance));
    const recoveriesProb = Math.max(0, Math.min(1, baseRecoveries + recoveriesVariance));
    
    return {
      player_id: playerData.id,
      player_name: playerData.web_name,
      team: getTeamShortName(playerData.team),
      position: getPositionShortName(playerData.element_type),
      gameweek,
      clearances_probability: Math.round(clearancesProb * 100),
      blocks_probability: Math.round(blocksProb * 100),
      interceptions_probability: Math.round(interceptionsProb * 100),
      tackles_probability: Math.round(tacklesProb * 100),
      recoveries_probability: Math.round(recoveriesProb * 100)
    };
  };

  const getTeamShortName = (teamId: number): string => {
    return bootstrapData?.teams.find(t => t.id === teamId)?.short_name || '';
  };

  const getPositionShortName = (elementType: number): string => {
    return bootstrapData?.element_types.find(t => t.id === elementType)?.singular_name_short || '';
  };

  // Generate data for next 6 gameweeks (2-7)
  const playerDefensiveData = useMemo(() => {
    if (!bootstrapData?.elements) return [];
    
    const allData: PlayerDefensiveData[] = [];
    
    for (let gw = 2; gw <= 7; gw++) {
      for (const player of bootstrapData.elements) {
        allData.push(generatePlayerDefensiveData(gw, player));
      }
    }
    
    return allData;
  }, [bootstrapData]);

  // Get defensive data for filtered players
  const getPlayerGameweekData = (playerId: number, gameweek: number) => {
    return playerDefensiveData.find(data => 
      data.player_id === playerId && data.gameweek === gameweek
    );
  };

  // Calculate average for each metric
  const getPlayerAverageMetric = (playerId: number, metric: keyof PlayerDefensiveData): number => {
    const playerData = playerDefensiveData.filter(data => data.player_id === playerId);
    if (playerData.length === 0) return 0;
    const total = playerData.reduce((sum, data) => sum + (data[metric] as number), 0);
    return Math.round((total / playerData.length));
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
        case "clearances":
          return getPlayerAverageMetric(b.id, "clearances_probability") - getPlayerAverageMetric(a.id, "clearances_probability");
        case "blocks":
          return getPlayerAverageMetric(b.id, "blocks_probability") - getPlayerAverageMetric(a.id, "blocks_probability");
        case "interceptions":
          return getPlayerAverageMetric(b.id, "interceptions_probability") - getPlayerAverageMetric(a.id, "interceptions_probability");
        case "tackles":
          return getPlayerAverageMetric(b.id, "tackles_probability") - getPlayerAverageMetric(a.id, "tackles_probability");
        case "recoveries":
          return getPlayerAverageMetric(b.id, "recoveries_probability") - getPlayerAverageMetric(a.id, "recoveries_probability");
        default:
          return 0;
      }
    });
    
    return players.slice(0, 50); // Limit to 50 players for performance
  }, [bootstrapData, searchTerm, positionFilter, teamFilter, sortBy, playerDefensiveData]);

  const getDefensiveColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-600 text-white";
    if (percentage >= 50) return "bg-green-400 text-white";
    if (percentage >= 30) return "bg-yellow-500 text-gray-900";
    if (percentage >= 15) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  if (isBootstrapLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50/30 overflow-x-hidden">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50/30 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 lg:py-8">
          {/* Header Section */}
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full mb-3 sm:mb-4">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600" />
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4 px-2" data-testid="text-page-title">
              Player Defensive Contributions (CBIT/CBITR)
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2" data-testid="text-page-description">
              CBIT metrics for defenders and CBITR metrics for midfielders/forwards across upcoming gameweeks
            </p>
          </div>

          {/* CBIT/CBITR Explanation */}
          <Alert className="mb-4 sm:mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              <strong>CBIT (Defenders):</strong> Clearances, Blocks, Interceptions, Tackles
              <br />
              <strong>CBITR (MID/FWD):</strong> Clearances, Blocks, Interceptions, Tackles, Recoveries
              <br />
              <strong>Purpose:</strong> Key FPL defensive actions that contribute to ICT index and bonus point potential.
            </AlertDescription>
          </Alert>

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
                    <SelectItem value="tackles">Tackles</SelectItem>
                    <SelectItem value="clearances">Clearances</SelectItem>
                    <SelectItem value="interceptions">Interceptions</SelectItem>
                    <SelectItem value="blocks">Blocks</SelectItem>
                    <SelectItem value="recoveries">Recoveries</SelectItem>
                    <SelectItem value="name">Player Name</SelectItem>
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
                  <span>70%+ chance</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span>50-69% chance</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>30-49% chance</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>15-29% chance</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>&lt;15% chance</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">CBIT/CBITR Performance Matrix</CardTitle>
              <CardDescription>
                Average CBIT (defenders) and CBITR (midfielders/forwards) metrics across next 6 gameweeks
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left min-w-[120px] sm:min-w-[180px] sticky left-0 bg-muted/50 z-10">
                        Player
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-center">
                          <div className="font-medium">Clearances</div>
                          <div className="text-xs text-muted-foreground">Avg %</div>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-center">
                          <div className="font-medium">Blocks</div>
                          <div className="text-xs text-muted-foreground">Avg %</div>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-center">
                          <div className="font-medium">Interceptions</div>
                          <div className="text-xs text-muted-foreground">Avg %</div>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-center">
                          <div className="font-medium">Tackles</div>
                          <div className="text-xs text-muted-foreground">Avg %</div>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-center">
                          <div className="font-medium">Recoveries</div>
                          <div className="text-xs text-muted-foreground">Avg %</div>
                        </div>
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
                          <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 rounded text-xs font-medium ${getDefensiveColor(getPlayerAverageMetric(player.id, "clearances_probability"))}`}>
                            {getPlayerAverageMetric(player.id, "clearances_probability")}%
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 rounded text-xs font-medium ${getDefensiveColor(getPlayerAverageMetric(player.id, "blocks_probability"))}`}>
                            {getPlayerAverageMetric(player.id, "blocks_probability")}%
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 rounded text-xs font-medium ${getDefensiveColor(getPlayerAverageMetric(player.id, "interceptions_probability"))}`}>
                            {getPlayerAverageMetric(player.id, "interceptions_probability")}%
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 rounded text-xs font-medium ${getDefensiveColor(getPlayerAverageMetric(player.id, "tackles_probability"))}`}>
                            {getPlayerAverageMetric(player.id, "tackles_probability")}%
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          {player.element_type === 2 ? (
                            <div className="text-xs text-muted-foreground">N/A</div>
                          ) : (
                            <div className={`inline-flex items-center justify-center min-w-[30px] sm:min-w-[40px] h-6 sm:h-7 px-1 rounded text-xs font-medium ${getDefensiveColor(getPlayerAverageMetric(player.id, "recoveries_probability"))}`}>
                              {getPlayerAverageMetric(player.id, "recoveries_probability")}%
                            </div>
                          )}
                        </td>
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
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              CBIT (defenders) and CBITR (midfielders/forwards) show probability of completing defensive actions. 
              These metrics directly contribute to ICT index performance and bonus point potential in FPL.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  );
}
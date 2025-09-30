import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Save, Calendar, Target, Sparkles, Crown, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TeamPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface TeamData {
  picks: TeamPick[];
  transfers: {
    cost: number;
    status: string;
    limit: number;
    made: number;
    bank: number;
    value: number;
  };
}

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
}

interface BootstrapData {
  elements: Player[];
  element_types: Array<{
    id: number;
    plural_name: string;
    singular_name: string;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
  events: Array<{
    id: number;
    name: string;
    is_current: boolean;
    is_next: boolean;
    finished: boolean;
  }>;
}

interface OptimizedLineup {
  formation: string;
  starting11: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>;
  bench: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    benchPosition: number;
  }>;
  totalProjectedPoints: number;
  captainProjectedPoints: number;
  gameweek: number;
}

interface PlayerProjectionData {
  playerId: number;
  name: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  gameweekProjections: { [key: string]: number };
  totalExpectedPoints: number;
}

function AllPlayersProjectionsTab({ selectedGameweek }: { selectedGameweek: number }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [sortField, setSortField] = useState<'gwPoints' | 'price' | 'name'>('gwPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: allPlayersData, isLoading } = useQuery<PlayerProjectionData[]>({
    queryKey: ["/api/cached/player-total-points"],
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Loading player projections...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!allPlayersData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No projection data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const gwKey = selectedGameweek.toString();

  // Filter and sort players
  const filteredPlayers = allPlayersData
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'gwPoints') {
        const aPoints = a.gameweekProjections[gwKey] || 0;
        const bPoints = b.gameweekProjections[gwKey] || 0;
        comparison = aPoints - bPoints;
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

  const handleSort = (field: 'gwPoints' | 'price' | 'name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Players - GW{selectedGameweek} Projections</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <Input
            placeholder="Search players or teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-64"
            data-testid="input-player-search"
          />
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="md:w-48" data-testid="select-position-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="GKP">Goalkeepers</SelectItem>
              <SelectItem value="DEF">Defenders</SelectItem>
              <SelectItem value="MID">Midfielders</SelectItem>
              <SelectItem value="FWD">Forwards</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('name')}
                    data-testid="sort-name"
                  >
                    Player {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 inline ml-1" /> : <ChevronDown className="h-4 w-4 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-left p-2">Team</th>
                <th className="text-left p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('price')}
                    data-testid="sort-price"
                  >
                    Price {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 inline ml-1" /> : <ChevronDown className="h-4 w-4 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-left p-2">Own%</th>
                <th className="text-right p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('gwPoints')}
                    data-testid="sort-points"
                  >
                    GW{selectedGameweek} Pts {sortField === 'gwPoints' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 inline ml-1" /> : <ChevronDown className="h-4 w-4 inline ml-1" />)}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const gwPoints = player.gameweekProjections[gwKey] || 0;
                return (
                  <tr
                    key={player.playerId}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-900"
                    data-testid={`player-row-${player.playerId}`}
                  >
                    <td className="p-2">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">{player.position}</div>
                    </td>
                    <td className="p-2 text-sm">{player.team}</td>
                    <td className="p-2 text-sm">£{player.price.toFixed(1)}m</td>
                    <td className="p-2 text-sm">{player.ownership.toFixed(1)}%</td>
                    <td className="p-2 text-right">
                      <span className="font-bold text-purple-600 text-lg">
                        {gwPoints.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No players found matching your criteria
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TransferPlanner() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [plannerMode, setPlannerMode] = useState<"auto" | "manual">("auto");
  const [optimizedLineup, setOptimizedLineup] = useState<OptimizedLineup | null>(null);
  const [manualLineup, setManualLineup] = useState<TeamPick[]>([]);
  const { toast } = useToast();

  // Cache manager ID functionality
  const saveManagerIdToCache = (id: string) => {
    try {
      localStorage.setItem('fpl-manager-id', id);
    } catch (error) {
      console.warn('Failed to save manager ID to localStorage:', error);
    }
  };

  const getManagerIdFromCache = (): string | null => {
    try {
      return localStorage.getItem('fpl-manager-id');
    } catch (error) {
      console.warn('Failed to get manager ID from localStorage:', error);
      return null;
    }
  };

  // Load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId);
    }
  }, []);

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: teamData, isLoading: isLoadingTeam } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
  });

  // Initialize manual lineup when team data loads
  useEffect(() => {
    if (teamData?.picks) {
      setManualLineup([...teamData.picks]);
    }
  }, [teamData]);

  // Fetch player projections for the selected gameweek
  const { data: playerProjections } = useQuery<any[]>({
    queryKey: ["/api/player-total-points", selectedGameweek],
    enabled: !!selectedGameweek,
    queryFn: async () => {
      const response = await fetch(`/api/player-total-points?startGameweek=${selectedGameweek}&endGameweek=${selectedGameweek}`);
      return response.json();
    }
  });

  // Auto-optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!teamData || !selectedGameweek) {
        throw new Error("Team data and gameweek are required");
      }

      const response = await fetch("/api/transfer-planner/auto-optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          picks: teamData.picks,
          gameweek: selectedGameweek
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Optimization failed");
      }

      return response.json();
    },
    onSuccess: (data: OptimizedLineup) => {
      setOptimizedLineup(data);
      toast({
        title: "Team Optimized!",
        description: `Best formation: ${data.formation} with ${data.totalProjectedPoints.toFixed(1)} projected points`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Get next 6 gameweeks
  const getNextGameweeks = () => {
    if (!bootstrapData) return [];
    
    // Find the current or next gameweek
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const nextEvent = bootstrapData.events.find(e => e.is_next);
    
    // Start from current if it's not finished, otherwise start from next
    let startGW = currentEvent?.id || nextEvent?.id || 1;
    if (currentEvent?.finished) {
      startGW = nextEvent?.id || startGW + 1;
    }
    
    const nextGameweeks = [];
    
    // Get exactly 6 upcoming gameweeks
    for (let i = 0; i < 6; i++) {
      const gwNumber = startGW + i;
      const gw = bootstrapData.events.find(e => e.id === gwNumber);
      if (gw && gwNumber <= 38) {
        nextGameweeks.push(gw);
      }
    }
    
    return nextGameweeks;
  };

  // Set default gameweek when bootstrap data loads
  useEffect(() => {
    if (bootstrapData && !selectedGameweek) {
      const nextGWs = getNextGameweeks();
      if (nextGWs.length > 0) {
        setSelectedGameweek(nextGWs[0].id);
      }
    }
  }, [bootstrapData]);

  // Clear optimized lineup when gameweek or mode changes
  useEffect(() => {
    setOptimizedLineup(null);
  }, [selectedGameweek, plannerMode]);

  // Auto-run optimization when Auto mode is selected
  useEffect(() => {
    if (plannerMode === "auto" && selectedGameweek && teamData && !optimizeMutation.isPending) {
      optimizeMutation.mutate();
    }
  }, [plannerMode, selectedGameweek, teamData]);

  const handleSearch = () => {
    if (managerId.trim()) {
      const trimmedId = managerId.trim();
      setSearchedId(trimmedId);
      saveManagerIdToCache(trimmedId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getPlayerById = (id: number): Player | undefined => {
    return bootstrapData?.elements.find(p => p.id === id);
  };

  const getPositionName = (elementType: number): string => {
    const position = bootstrapData?.element_types.find(t => t.id === elementType);
    return position?.singular_name || "Unknown";
  };

  const getTeamName = (teamId: number): string => {
    const team = bootstrapData?.teams.find(t => t.id === teamId);
    return team?.short_name || 'Unknown';
  };

  const getPlayerProjectedPoints = (playerId: number): number | null => {
    if (!playerProjections || !selectedGameweek) return null;
    
    const projection = playerProjections.find(p => p.playerId === playerId);
    if (!projection) return null;

    // Get the points for the selected gameweek - API returns gameweekProjections with gameweek number as key
    const points = projection.gameweekProjections?.[selectedGameweek];
    return points !== undefined ? points : null;
  };

  // Swap a starting 11 player with a bench player
  const swapPlayers = (startingIndex: number, benchIndex: number) => {
    const newLineup = [...manualLineup];
    const temp = newLineup[startingIndex];
    newLineup[startingIndex] = newLineup[11 + benchIndex];
    newLineup[11 + benchIndex] = temp;
    
    // Update positions
    newLineup[startingIndex].position = startingIndex + 1;
    newLineup[11 + benchIndex].position = 11 + benchIndex + 1;
    
    setManualLineup(newLineup);
    toast({
      title: "Players Swapped",
      description: `${getPlayerById(newLineup[startingIndex].element)?.web_name} moved to starting 11`
    });
  };

  // Move bench player up or down (excluding GK)
  const moveBenchPlayer = (benchIndex: number, direction: 'up' | 'down') => {
    if (benchIndex === 0) return; // Can't move GK
    
    const actualIndex = 11 + benchIndex;
    const swapIndex = direction === 'up' ? actualIndex - 1 : actualIndex + 1;
    
    // Don't allow moving past GK or past last bench player
    if (swapIndex === 11 || swapIndex > 14) return;
    
    const newLineup = [...manualLineup];
    const temp = newLineup[actualIndex];
    newLineup[actualIndex] = newLineup[swapIndex];
    newLineup[swapIndex] = temp;
    
    // Update positions
    newLineup[actualIndex].position = actualIndex + 1;
    newLineup[swapIndex].position = swapIndex + 1;
    
    setManualLineup(newLineup);
  };

  const nextGameweeks = getNextGameweeks();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
          <Target className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Transfer Planner</h1>
          <p className="text-muted-foreground">Plan your transfers and optimize your team</p>
        </div>
      </div>

      {/* Manager ID Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manager ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter FPL Manager ID"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              data-testid="input-manager-id"
            />
            <Button 
              onClick={handleSearch}
              data-testid="button-search-manager"
            >
              Load Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gameweek and Mode Selection */}
      {searchedId && teamData && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Gameweek Selection */}
              <div>
                <div className="text-sm font-medium mb-2">Select GW</div>
                <div className="flex gap-2">
                  {nextGameweeks.map(gw => (
                    <Button
                      key={gw.id}
                      variant={selectedGameweek === gw.id ? "default" : "outline"}
                      size="lg"
                      className="text-lg font-semibold"
                      onClick={() => setSelectedGameweek(gw.id)}
                      data-testid={`gw-button-${gw.id}`}
                    >
                      {gw.id}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <div className="text-sm font-medium mb-2">Planning Mode</div>
                <div className="flex gap-2">
                  <Button
                    variant={plannerMode === "manual" ? "default" : "outline"}
                    size="lg"
                    className="flex-1"
                    onClick={() => setPlannerMode("manual")}
                    data-testid="mode-button-manual"
                  >
                    Manual
                  </Button>
                  <Button
                    variant={plannerMode === "auto" ? "default" : "outline"}
                    size="lg"
                    className="flex-1"
                    onClick={() => setPlannerMode("auto")}
                    data-testid="mode-button-auto"
                  >
                    Auto
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Selection Section */}
      {searchedId && teamData && selectedGameweek && plannerMode === "manual" && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Manual Team Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Starting 11 */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Starting 11
                </h3>
                <div className="grid gap-2">
                  {manualLineup.slice(0, 11).map((pick, index) => {
                    const player = getPlayerById(pick.element);
                    const projectedPoints = getPlayerProjectedPoints(pick.element);
                    if (!player) return null;
                    
                    return (
                      <div
                        key={pick.element}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          pick.is_captain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                          pick.is_vice_captain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                          'border-gray-200'
                        }`}
                        data-testid={`starting-player-${pick.element}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {pick.is_captain && (
                            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">C</span>
                          )}
                          {pick.is_vice_captain && (
                            <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">VC</span>
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{player.web_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {getTeamName(player.team)} • {getPositionName(player.element_type)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {projectedPoints !== null ? (
                              <>
                                <div className="font-bold text-blue-600">{projectedPoints.toFixed(1)} pts</div>
                                {pick.is_captain && (
                                  <div className="text-xs text-muted-foreground">({(projectedPoints * 2).toFixed(1)} with (C))</div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">No projection</div>
                            )}
                          </div>
                          <Select onValueChange={(value) => swapPlayers(index, parseInt(value))}>
                            <SelectTrigger className="w-[140px]" data-testid={`swap-${pick.element}`}>
                              <ArrowUpDown className="h-4 w-4 mr-2" />
                              <SelectValue placeholder="Swap" />
                            </SelectTrigger>
                            <SelectContent>
                              {manualLineup.slice(11, 15).map((benchPick, benchIndex) => {
                                const benchPlayer = getPlayerById(benchPick.element);
                                return (
                                  <SelectItem key={benchPick.element} value={benchIndex.toString()}>
                                    {benchPlayer?.web_name}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Bench */}
              <div>
                <h3 className="font-semibold mb-3">Bench (Current Order)</h3>
                <div className="grid gap-2">
                  {manualLineup.slice(11, 15).map((pick, index) => {
                    const player = getPlayerById(pick.element);
                    const projectedPoints = getPlayerProjectedPoints(pick.element);
                    const isGK = player?.element_type === 1;
                    if (!player) return null;
                    
                    return (
                      <div
                        key={pick.element}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900"
                        data-testid={`bench-player-${pick.element}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xs font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">{player.web_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {getTeamName(player.team)} • {getPositionName(player.element_type)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-muted-foreground">
                            {projectedPoints !== null ? `${projectedPoints.toFixed(1)} pts` : 'No projection'}
                          </div>
                          {!isGK && (
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => moveBenchPlayer(index, 'up')}
                                disabled={index === 1}
                                data-testid={`move-up-${pick.element}`}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => moveBenchPlayer(index, 'down')}
                                disabled={index === 3}
                                data-testid={`move-down-${pick.element}`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Projected Points */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {manualLineup
                      .slice(0, 11)
                      .reduce((total, pick) => {
                        const projectedPoints = getPlayerProjectedPoints(pick.element);
                        const multiplier = pick.is_captain ? 2 : 1;
                        return total + (projectedPoints || 0) * multiplier;
                      }, 0)
                      .toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Optimization Section */}
      {searchedId && teamData && selectedGameweek && plannerMode === "auto" && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Auto-Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {optimizeMutation.isPending && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-muted-foreground">Optimizing your team...</p>
              </div>
            )}

            {optimizedLineup && !optimizeMutation.isPending && (
              <div className="mt-6 space-y-6">
                {/* Formation and Points Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Formation</div>
                    <div className="text-2xl font-bold text-purple-600">{optimizedLineup.formation}</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Projected Points</div>
                    <div className="text-2xl font-bold text-purple-600">{optimizedLineup.totalProjectedPoints.toFixed(1)}</div>
                  </div>
                </div>

                {/* Starting 11 */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    Starting 11
                  </h3>
                  <div className="grid gap-2">
                    {optimizedLineup.starting11.map((player) => {
                      const fullPlayer = getPlayerById(player.element);
                      return (
                        <div
                          key={player.element}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            player.isCaptain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                            player.isViceCaptain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                            'border-gray-200'
                          }`}
                          data-testid={`optimized-player-${player.element}`}
                        >
                          <div className="flex items-center gap-3">
                            {player.isCaptain && (
                              <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">C</span>
                            )}
                            {player.isViceCaptain && (
                              <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">VC</span>
                            )}
                            <div>
                              <div className="font-medium">{player.web_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionName(fullPlayer.element_type)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-600">{player.projectedPoints.toFixed(1)} pts</div>
                            {player.isCaptain && (
                              <div className="text-xs text-muted-foreground">({(player.projectedPoints * 2).toFixed(1)} with (C))</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bench */}
                <div>
                  <h3 className="font-semibold mb-3">Bench (Recommended Order)</h3>
                  <div className="grid gap-2">
                    {optimizedLineup.bench.map((player) => {
                      const fullPlayer = getPlayerById(player.element);
                      return (
                        <div
                          key={player.element}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900"
                          data-testid={`bench-player-${player.element}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {player.benchPosition}
                            </span>
                            <div>
                              <div className="font-medium">{player.web_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionName(fullPlayer.element_type)}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">{player.projectedPoints.toFixed(1)} pts</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      {searchedId && teamData && selectedGameweek && (
        <Tabs defaultValue="projected-points" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projected-points" data-testid="tab-projected-points">
              <TrendingUp className="h-4 w-4 mr-2" />
              Projected Points
            </TabsTrigger>
            <TabsTrigger value="drafts" data-testid="tab-drafts">
              <Save className="h-4 w-4 mr-2" />
              My Drafts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projected-points" className="space-y-4">
            <AllPlayersProjectionsTab selectedGameweek={selectedGameweek} />
          </TabsContent>

          <TabsContent value="drafts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Draft Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Draft management coming soon...
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!searchedId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter your Manager ID to start planning your transfers</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

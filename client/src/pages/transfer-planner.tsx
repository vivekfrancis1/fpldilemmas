import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Save, Calendar, Target, Sparkles, Crown } from "lucide-react";
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

export default function TransferPlanner() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [plannerMode, setPlannerMode] = useState<"auto" | "manual">("auto");
  const [optimizedLineup, setOptimizedLineup] = useState<OptimizedLineup | null>(null);
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
    
    const currentGW = bootstrapData.events.find(e => e.is_current)?.id || 1;
    const nextGameweeks = [];
    
    for (let i = 0; i < 6; i++) {
      const gwNumber = currentGW + i;
      const gw = bootstrapData.events.find(e => e.id === gwNumber);
      if (gw && !gw.finished) {
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

    // Get the points for the selected gameweek
    const gwKey = `gw${selectedGameweek}`;
    return projection.gameweekBreakdown?.[gwKey]?.totalPoints || null;
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Gameweek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedGameweek?.toString()}
                onValueChange={(value) => setSelectedGameweek(parseInt(value))}
              >
                <SelectTrigger data-testid="select-gameweek">
                  <SelectValue placeholder="Select gameweek" />
                </SelectTrigger>
                <SelectContent>
                  {nextGameweeks.map(gw => (
                    <SelectItem key={gw.id} value={gw.id.toString()}>
                      Gameweek {gw.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Planning Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={plannerMode}
                onValueChange={(value: "auto" | "manual") => setPlannerMode(value)}
              >
                <SelectTrigger data-testid="select-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (AI Recommended)</SelectItem>
                  <SelectItem value="manual">Manual Selection</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
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
            <Button 
              onClick={() => optimizeMutation.mutate()}
              disabled={optimizeMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="button-auto-optimize"
            >
              {optimizeMutation.isPending ? "Optimizing..." : "Run Auto-Optimization"}
            </Button>

            {optimizedLineup && (
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
        <Tabs defaultValue="my-team" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-team" data-testid="tab-my-team">
              <Users className="h-4 w-4 mr-2" />
              My Team
            </TabsTrigger>
            <TabsTrigger value="projected-points" data-testid="tab-projected-points">
              <TrendingUp className="h-4 w-4 mr-2" />
              Projected Points
            </TabsTrigger>
            <TabsTrigger value="drafts" data-testid="tab-drafts">
              <Save className="h-4 w-4 mr-2" />
              My Drafts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Team - GW{selectedGameweek}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTeam ? (
                  <div className="text-center py-8">Loading team...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Display current team */}
                    <div className="grid gap-2">
                      {teamData?.picks.map((pick, index) => {
                        const player = getPlayerById(pick.element);
                        if (!player) return null;
                        const projectedPoints = getPlayerProjectedPoints(pick.element);
                        
                        return (
                          <div
                            key={pick.element}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`player-${pick.element}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-sm text-muted-foreground w-6">
                                {index + 1}
                              </span>
                              <div>
                                <div className="font-medium">{player.web_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {getTeamName(player.team)} • {getPositionName(player.element_type)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">£{(player.now_cost / 10).toFixed(1)}m</div>
                              <div className="text-sm text-muted-foreground">
                                {projectedPoints !== null ? (
                                  <span className="font-semibold text-purple-600">{projectedPoints.toFixed(1)} proj pts</span>
                                ) : (
                                  <span>{player.total_points} season pts</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Team Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div>
                        <div className="text-sm text-muted-foreground">Team Value</div>
                        <div className="text-xl font-bold">
                          £{((teamData?.transfers?.value || 0) / 10).toFixed(1)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">In Bank</div>
                        <div className="text-xl font-bold">
                          £{((teamData?.transfers?.bank || 0) / 10).toFixed(1)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Free Transfers</div>
                        <div className="text-xl font-bold">
                          {teamData?.transfers?.limit || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Transfers Made</div>
                        <div className="text-xl font-bold">
                          {teamData?.transfers?.made || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projected-points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Projected Points - GW{selectedGameweek}</CardTitle>
              </CardHeader>
              <CardContent>
                {!playerProjections ? (
                  <div className="text-center py-8">Loading projections...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Group players by position */}
                    {[1, 2, 3, 4].map((positionId) => {
                      const positionPlayers = teamData?.picks
                        .map(pick => {
                          const player = getPlayerById(pick.element);
                          const projectedPoints = getPlayerProjectedPoints(pick.element);
                          return { pick, player, projectedPoints };
                        })
                        .filter(p => p.player?.element_type === positionId);

                      if (!positionPlayers || positionPlayers.length === 0) return null;

                      return (
                        <div key={positionId}>
                          <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
                            {getPositionName(positionId)}s
                          </h3>
                          <div className="grid gap-2">
                            {positionPlayers.map(({ pick, player, projectedPoints }) => {
                              if (!player) return null;
                              
                              return (
                                <div
                                  key={pick.element}
                                  className="flex items-center justify-between p-3 border rounded-lg hover:border-purple-300 transition-colors"
                                  data-testid={`projection-${pick.element}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <div className="font-medium">{player.web_name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {getTeamName(player.team)} • £{(player.now_cost / 10).toFixed(1)}m
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {projectedPoints !== null ? (
                                      <>
                                        <div className="text-xl font-bold text-purple-600">
                                          {projectedPoints.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">projected pts</div>
                                      </>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">No projection</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Total projected points */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                        <span className="text-2xl font-bold text-purple-600">
                          {teamData?.picks
                            .reduce((total, pick) => {
                              const projectedPoints = getPlayerProjectedPoints(pick.element);
                              return total + (projectedPoints || 0);
                            }, 0)
                            .toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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

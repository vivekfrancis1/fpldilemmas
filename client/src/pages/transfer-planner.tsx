import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Save, Calendar, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function TransferPlanner() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [plannerMode, setPlannerMode] = useState<"auto" | "manual">("auto");

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
                              <div className="text-sm text-muted-foreground">{player.total_points} pts</div>
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
                          £{((teamData?.transfers.value || 0) / 10).toFixed(1)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">In Bank</div>
                        <div className="text-xl font-bold">
                          £{((teamData?.transfers.bank || 0) / 10).toFixed(1)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Free Transfers</div>
                        <div className="text-xl font-bold">
                          {teamData?.transfers.limit || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Transfers Made</div>
                        <div className="text-xl font-bold">
                          {teamData?.transfers.made || 0}
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
                <Alert>
                  <AlertDescription>
                    Projected points view coming soon...
                  </AlertDescription>
                </Alert>
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

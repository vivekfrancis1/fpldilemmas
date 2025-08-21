import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Trophy, Star, DollarSign } from "lucide-react";
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
  chips: Array<{
    name: string;
    time: string;
    event: number;
  }>;
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
  team_name: string;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  selected_by_percent: string;
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
  }>;
}

export default function MyTeam() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");

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

  const { data: teamData, isLoading: isLoadingTeam, error: teamError } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
  });

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

  const getTeamName = (player: Player): string => {
    const team = bootstrapData?.teams.find(t => t.id === player.team_name as any);
    return team?.short_name || player.team_name;
  };

  const getCurrentGameweek = (): number => {
    const currentEvent = bootstrapData?.events.find(e => e.is_current);
    return currentEvent?.id || 1;
  };

  const formatPrice = (price: number): string => {
    return `£${(price / 10).toFixed(1)}m`;
  };

  const getFormationCounts = () => {
    if (!teamData?.picks || !bootstrapData) return { gk: 0, def: 0, mid: 0, fwd: 0 };
    
    const startingEleven = teamData.picks.filter(pick => pick.position <= 11);
    const counts = { gk: 0, def: 0, mid: 0, fwd: 0 };
    
    startingEleven.forEach(pick => {
      const player = getPlayerById(pick.element);
      if (player) {
        switch (player.element_type) {
          case 1: counts.gk++; break;
          case 2: counts.def++; break;
          case 3: counts.mid++; break;
          case 4: counts.fwd++; break;
        }
      }
    });
    
    return counts;
  };

  const getFormationString = () => {
    const counts = getFormationCounts();
    return `${counts.def}-${counts.mid}-${counts.fwd}`;
  };

  const getTotalTeamValue = (): number => {
    if (!teamData?.picks || !bootstrapData) return 0;
    
    return teamData.picks.reduce((total, pick) => {
      const player = getPlayerById(pick.element);
      return total + (player?.now_cost || 0);
    }, 0);
  };

  const sortPlayersByPosition = (picks: TeamPick[]) => {
    return picks.sort((a, b) => {
      const playerA = getPlayerById(a.element);
      const playerB = getPlayerById(b.element);
      
      if (!playerA || !playerB) return 0;
      
      // Sort by position type first, then by position in team
      if (playerA.element_type !== playerB.element_type) {
        return playerA.element_type - playerB.element_type;
      }
      
      return a.position - b.position;
    });
  };

  if (!bootstrapData) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50/30 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading FPL data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50/30 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">My Team</h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                View your current FPL team formation, players, and squad value.
              </p>
            </div>

            {/* Search Section */}
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  Manager Search
                </CardTitle>
                <CardDescription>
                  Enter your FPL Manager ID to view your current team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    data-testid="input-manager-id"
                    placeholder="Enter Manager ID (e.g., 123456)"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 text-base"
                  />
                  <Button 
                    data-testid="button-search-manager"
                    onClick={handleSearch} 
                    disabled={!managerId.trim() || isLoadingTeam}
                    className="sm:px-6"
                  >
                    {isLoadingTeam ? "Loading..." : "Load Team"}
                  </Button>
                </div>
                
                {getManagerIdFromCache() && (
                  <p className="mt-3 text-green-600 font-medium text-sm">
                    ✓ Your last searched Manager ID ({getManagerIdFromCache()}) is automatically loaded
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {teamError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load team data. Please check the Manager ID and try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Team Overview */}
            {teamData && (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
                <Card className="bg-white shadow-sm border border-gray-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-600" />
                      Formation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600" data-testid="text-formation">
                        {getFormationString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Current Formation</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Squad Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600" data-testid="text-squad-value">
                        {formatPrice(getTotalTeamValue())}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Total Value</p>
                      {teamData.transfers && (
                        <p className="text-sm text-gray-500 mt-1">
                          Bank: {formatPrice(teamData.transfers.bank)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-blue-600" />
                      Transfers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600" data-testid="text-transfers">
                        {teamData.transfers ? `${teamData.transfers.made}/${teamData.transfers.limit}` : '0/1'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Transfers Made</p>
                      {teamData.transfers && teamData.transfers.cost > 0 && (
                        <p className="text-sm text-red-500 mt-1">
                          Cost: -{teamData.transfers.cost} pts
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Starting XI */}
            {teamData && (
              <Card className="bg-white shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle>Starting XI</CardTitle>
                  <CardDescription>
                    Your team for Gameweek {getCurrentGameweek()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11)).map((pick, index) => {
                      const player = getPlayerById(pick.element);
                      if (!player) return null;

                      return (
                        <div 
                          key={pick.element} 
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            pick.is_captain ? 'bg-yellow-50 border-yellow-200' : 
                            pick.is_vice_captain ? 'bg-blue-50 border-blue-200' : 
                            'bg-gray-50'
                          }`}
                          data-testid={`starting-player-${index}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{player.web_name}</span>
                              {pick.is_captain && (
                                <Badge variant="default" className="bg-yellow-500 text-white">C</Badge>
                              )}
                              {pick.is_vice_captain && (
                                <Badge variant="secondary">VC</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {getPositionName(player.element_type)} • {getTeamName(player)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatPrice(player.now_cost)}</p>
                            <p className="text-sm text-gray-600">{player.total_points} pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bench */}
            {teamData && (
              <Card className="bg-white shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle>Bench</CardTitle>
                  <CardDescription>
                    Substitute players
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {sortPlayersByPosition(teamData.picks.filter(pick => pick.position > 11)).map((pick, index) => {
                      const player = getPlayerById(pick.element);
                      if (!player) return null;

                      return (
                        <div 
                          key={pick.element} 
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                          data-testid={`bench-player-${index}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">{player.web_name}</span>
                              <Badge variant="outline">{pick.position - 11}</Badge>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {getPositionName(player.element_type)} • {getTeamName(player)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-700">{formatPrice(player.now_cost)}</p>
                            <p className="text-sm text-gray-600">{player.total_points} pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
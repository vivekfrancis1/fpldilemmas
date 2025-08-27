import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

  // Get fixtures for teams
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    enabled: !!bootstrapData && !!teamData,
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

  const getTeamById = (teamId: number) => {
    return bootstrapData?.teams.find(t => t.id === teamId);
  };

  const getTeamName = (player: Player): string => {
    const teamId = (player as any).team || player.team_name;
    const team = bootstrapData?.teams.find(t => t.id === teamId);
    return team?.short_name || 'Unknown';
  };

  const getPlayerTeam = (player: Player) => {
    // The Player type from FPL API has team as a number field, not team_name
    const teamId = (player as any).team || player.team_name;
    return bootstrapData?.teams.find(t => t.id === teamId);
  };

  const getNextFixtures = (teamId: number, count: number = 5) => {
    if (!fixturesData || !Array.isArray(fixturesData)) {
      return [];
    }
    
    const currentGW = getCurrentGameweek();
    
    return fixturesData
      .filter((fixture: any) => {
        const isTeamInFixture = fixture.team_h === teamId || fixture.team_a === teamId;
        const isUpcoming = !fixture.finished && fixture.event >= currentGW;
        return isTeamInFixture && isUpcoming;
      })
      .sort((a: any, b: any) => a.event - b.event)
      .slice(0, count)
      .map((fixture: any) => {
        const isHome = fixture.team_h === teamId;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = getTeamById(opponentId);
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
        
        return {
          opponent: opponent?.short_name || 'TBD',
          isHome,
          difficulty: difficulty || 3,
          gameweek: fixture.event
        };
      });
  };

  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty === 1) return "bg-green-600 text-white"; // Very Easy - Dark Green (softer)
    if (difficulty === 2) return "bg-green-100 text-green-800"; // Easy - Light Green
    if (difficulty === 3) return "bg-gray-100 text-gray-800"; // Medium - Grey
    if (difficulty === 4) return "bg-red-100 text-red-800"; // Hard - Light Red
    return "bg-red-600 text-white"; // Very Hard (5) - Dark Red (softer)
  };

  const getDifficultyTextColor = (difficulty: number): string => {
    // This function is now redundant as colors are handled in getDifficultyColor
    return '';
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
      
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50/30 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading FPL data...</p>
          </div>
        </div>
      
    );
  }

  return (
    
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

            {/* Team Overview Cards */}
            {teamData && (
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-700 mb-1">Formation</p>
                        <p className="text-3xl font-bold text-emerald-900" data-testid="text-formation">
                          {getFormationString()}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-200 rounded-full">
                        <Trophy className="h-6 w-6 text-emerald-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-1">Squad Value</p>
                        <p className="text-3xl font-bold text-green-900" data-testid="text-squad-value">
                          {formatPrice(getTotalTeamValue())}
                        </p>
                        {teamData.transfers && (
                          <p className="text-xs text-green-600 mt-1">
                            Bank: {formatPrice(teamData.transfers.bank)}
                          </p>
                        )}
                      </div>
                      <div className="p-3 bg-green-200 rounded-full">
                        <DollarSign className="h-6 w-6 text-green-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 mb-1">Transfers</p>
                        <p className="text-3xl font-bold text-blue-900" data-testid="text-transfers">
                          {teamData.transfers ? `${teamData.transfers.made}/${teamData.transfers.limit}` : '0/1'}
                        </p>
                        {teamData.transfers && teamData.transfers.cost > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            Cost: -{teamData.transfers.cost} pts
                          </p>
                        )}
                      </div>
                      <div className="p-3 bg-blue-200 rounded-full">
                        <Star className="h-6 w-6 text-blue-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700 mb-1">Gameweek</p>
                        <p className="text-3xl font-bold text-purple-900">
                          GW {getCurrentGameweek()}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">Current</p>
                      </div>
                      <div className="p-3 bg-purple-200 rounded-full">
                        <Target className="h-6 w-6 text-purple-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Legend */}
            {teamData && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-blue-900 mb-2">Fixture Difficulty Legend:</h4>
                    <div className="flex gap-2 items-center">
                      {[1, 2, 3, 4, 5].map(diff => (
                        <div key={diff} className="flex items-center gap-1">
                          <div className={`w-3 h-3 rounded ${getDifficultyColor(diff)}`}></div>
                          <span className="text-xs font-medium text-gray-700">{diff}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-blue-700">
                    Each fixture shows opponent team (H for Home, A for Away) with difficulty rating from 1 (easiest) to 5 (hardest)
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Starting XI */}
            {teamData && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-white shadow-lg border border-gray-200">
                  <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Starting XI
                    </CardTitle>
                    <CardDescription className="text-emerald-50">
                      Your team for Gameweek {getCurrentGameweek()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {/* Group by position */}
                      {[1, 2, 3, 4].map(positionType => {
                        const playersInPosition = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11))
                          .filter(pick => {
                            const player = getPlayerById(pick.element);
                            return player?.element_type === positionType;
                          });
                        
                        if (playersInPosition.length === 0) return null;

                        const positionName = getPositionName(positionType);
                        const positionColors = {
                          1: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                          2: 'bg-blue-50 border-blue-200 text-blue-800',
                          3: 'bg-green-50 border-green-200 text-green-800',
                          4: 'bg-red-50 border-red-200 text-red-800'
                        };

                        return (
                          <div key={positionType} className="border-b border-gray-100 last:border-b-0">
                            <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${positionColors[positionType as keyof typeof positionColors]} border-l-4`}>
                              {positionName}s ({playersInPosition.length})
                            </div>
                            {playersInPosition.map((pick, index) => {
                              const player = getPlayerById(pick.element);
                              if (!player) return null;

                              return (
                                <div 
                                  key={pick.element} 
                                  className={`flex items-center justify-between p-4 border-l-4 hover:bg-gray-50 transition-colors ${
                                    pick.is_captain ? 'bg-amber-50 border-amber-400' : 
                                    pick.is_vice_captain ? 'bg-blue-50 border-blue-400' : 
                                    'border-gray-200 hover:border-gray-300'
                                  }`}
                                  data-testid={`starting-player-${index}`}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                                      {player.web_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{player.web_name}</span>
                                        {pick.is_captain && (
                                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1">C</Badge>
                                        )}
                                        {pick.is_vice_captain && (
                                          <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs px-2 py-1">VC</Badge>
                                        )}
                                      </div>
                                      <div className="space-y-2 mt-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-700">{getTeamName(player)}</span>
                                          <span className="text-xs text-gray-500">Form: {player.form}</span>
                                        </div>
                                        
                                        {/* Next 3 fixtures */}
                                        <div className="space-y-1">
                                          <div className="text-xs font-medium text-gray-600">Next 3 fixtures:</div>
                                          <div className="flex gap-1">
                                            {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).map((fixture, idx) => (
                                              <div 
                                                key={idx}
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(fixture.difficulty)}`}
                                                title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                              >
                                                <span>{fixture.opponent}</span>
                                                <span className="text-xs opacity-75">({fixture.isHome ? 'H' : 'A'})</span>
                                              </div>
                                            ))}
                                            {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).length === 0 && (
                                              <span className="text-xs text-gray-400">No upcoming fixtures</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <p className="font-semibold text-green-600">{formatPrice(player.now_cost)}</p>
                                    <p className="text-sm text-gray-600">{player.total_points} pts</p>
                                    <div className="text-xs text-gray-500">
                                      <div>Sel: {parseFloat(player.selected_by_percent).toFixed(1)}%</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Bench */}
                <Card className="bg-white shadow-lg border border-gray-200">
                  <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Bench
                    </CardTitle>
                    <CardDescription className="text-gray-100">
                      Substitute players
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {sortPlayersByPosition(teamData.picks.filter(pick => pick.position > 11)).map((pick, index) => {
                        const player = getPlayerById(pick.element);
                        if (!player) return null;

                        return (
                          <div 
                            key={pick.element} 
                            className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                            data-testid={`bench-player-${index}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                {pick.position - 11}
                              </div>
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                                {player.web_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-800">{player.web_name}</span>
                                  <Badge variant="outline" className="text-xs px-2 py-1">{getPositionName(player.element_type)}</Badge>
                                </div>
                                <div className="space-y-2 mt-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">{getTeamName(player)}</span>
                                    <span className="text-xs text-gray-500">Form: {player.form}</span>
                                  </div>
                                  
                                  {/* Next 3 fixtures */}
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-gray-600">Next 3 fixtures:</div>
                                    <div className="flex gap-1 flex-wrap">
                                      {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).map((fixture, idx) => (
                                        <div 
                                          key={idx}
                                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(fixture.difficulty)}`}
                                          title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                        >
                                          <span>{fixture.opponent}</span>
                                          <span className="text-xs opacity-75">({fixture.isHome ? 'H' : 'A'})</span>
                                        </div>
                                      ))}
                                      {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).length === 0 && (
                                        <span className="text-xs text-gray-400">No upcoming fixtures</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="font-semibold text-green-600">{formatPrice(player.now_cost)}</p>
                              <p className="text-sm text-gray-600">{player.total_points} pts</p>
                              <div className="text-xs text-gray-500">
                                <div>Sel: {parseFloat(player.selected_by_percent).toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    
  );
}
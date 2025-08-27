import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Target, 
  Activity, 
  Calendar, 
  Users, 
  Star, 
  DollarSign,
  Search,
  Home,
  BarChart3,
  Clock,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";

interface ManagerData {
  id: number;
  player_first_name: string;
  player_last_name: string;
  player_region_name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  current_event: number;
  leagues: {
    classic: Array<{
      id: number;
      name: string;
      rank: number;
      entry_rank: number;
    }>;
  };
}

interface ManagerHistory {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
  }>;
  past: Array<{
    season_name: string;
    total_points: number;
    rank: number;
  }>;
  chips: Array<{
    name: string;
    time: string;
    event: number;
  }>;
}

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

export default function MyFPLDashboard() {
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

  const { data: managerData, isLoading: isLoadingManager, error: managerError } = useQuery<ManagerData>({
    queryKey: ["/api/manager", searchedId],
    enabled: !!searchedId,
  });

  const { data: historyData, isLoading: isLoadingHistory, error: historyError } = useQuery<ManagerHistory>({
    queryKey: ["/api/manager", searchedId, "history"],
    enabled: !!searchedId,
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

  const formatRank = (rank: number) => {
    return rank.toLocaleString();
  };

  const getRankChange = () => {
    if (!historyData?.current || historyData.current.length < 2) return null;
    
    const current = historyData.current[historyData.current.length - 1];
    const previous = historyData.current[historyData.current.length - 2];
    
    return previous.overall_rank - current.overall_rank;
  };

  const getTopLeagues = () => {
    if (!managerData?.leagues?.classic) return [];
    return managerData.leagues.classic
      .filter((league: any) => league.rank <= 100)
      .sort((a: any, b: any) => a.rank - b.rank)
      .slice(0, 5);
  };

  const getPlayerById = (id: number): Player | undefined => {
    return bootstrapData?.elements.find(player => player.id === id);
  };

  const getPositionName = (typeId: number): string => {
    const positionMap: { [key: number]: string } = {
      1: "GK",
      2: "DEF", 
      3: "MID",
      4: "FWD"
    };
    return positionMap[typeId] || "Unknown";
  };

  const formatPrice = (price: number) => {
    return (price / 10).toFixed(1);
  };

  const getCurrentGameweek = () => {
    return bootstrapData?.events.find(event => event.is_current)?.id || 1;
  };

  const getNextGameweek = () => {
    return bootstrapData?.events.find(event => event.is_next)?.id || 1;
  };

  const getFormationCounts = () => {
    if (!teamData?.picks || !bootstrapData) return { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    
    const starting11 = teamData.picks.filter(pick => pick.position <= 11);
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    
    starting11.forEach(pick => {
      const player = getPlayerById(pick.element);
      if (player) {
        const pos = getPositionName(player.element_type);
        if (pos === "GK") counts.GK++;
        else if (pos === "DEF") counts.DEF++;
        else if (pos === "MID") counts.MID++;
        else if (pos === "FWD") counts.FWD++;
      }
    });
    
    return counts;
  };

  const isLoading = isLoadingManager || isLoadingHistory || isLoadingTeam;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My FPL Dashboard</h1>
          <p className="text-muted-foreground">
            Complete overview of your Fantasy Premier League performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Manager ID Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enter Manager ID
          </CardTitle>
          <CardDescription>
            Find your FPL Manager ID in your team page URL or account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter your Manager ID..."
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!managerId.trim()}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {(managerError || historyError || teamError) && (
        <Alert>
          <AlertDescription>
            Failed to load manager data. Please check the Manager ID and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && searchedId && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading FPL data...</p>
          </div>
        </div>
      )}

      {/* Main Content - Tabs */}
      {managerData && !isLoading && (
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="leagues">Top Leagues</TabsTrigger>
            <TabsTrigger value="recent">Recent Performance</TabsTrigger>
            <TabsTrigger value="history">Historical Performance</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Manager</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {managerData.player_first_name} {managerData.player_last_name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {managerData.player_region_name}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Rank</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">#{formatRank(managerData.summary_overall_rank)}</div>
                  {getRankChange() && (
                    <p className={`text-xs flex items-center gap-1 ${getRankChange()! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {getRankChange()! > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {Math.abs(getRankChange()!).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{managerData.summary_overall_points}</div>
                  <p className="text-xs text-muted-foreground">
                    Season total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">GW Points</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{managerData.summary_event_points}</div>
                  <p className="text-xs text-muted-foreground">
                    GW{managerData.current_event} (Rank: #{formatRank(managerData.summary_event_rank)})
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            {teamData && (
              <>
                {/* Team Summary */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">£{teamData?.transfers?.value ? formatPrice(teamData.transfers.value) : 'N/A'}m</div>
                      <p className="text-xs text-muted-foreground">
                        Bank: £{teamData?.transfers?.bank ? formatPrice(teamData.transfers.bank) : 'N/A'}m
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Formation</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {getFormationCounts().DEF}-{getFormationCounts().MID}-{getFormationCounts().FWD}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Starting XI formation
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Transfers</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamData?.transfers?.made || 0}/{teamData?.transfers?.limit || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Cost: {teamData?.transfers?.cost || 0} points
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Next GW</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">GW{getNextGameweek()}</div>
                      <p className="text-xs text-muted-foreground">
                        {teamData?.transfers?.status || 'N/A'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Starting XI */}
                <Card>
                  <CardHeader>
                    <CardTitle>Starting XI</CardTitle>
                    <CardDescription>Your team lineup for the next gameweek</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {["GK", "DEF", "MID", "FWD"].map(position => {
                        const players = (teamData?.picks || [])
                          .filter(pick => pick.position <= 11)
                          .map(pick => ({ ...pick, player: getPlayerById(pick.element) }))
                          .filter(pick => pick.player && getPositionName(pick.player.element_type) === position);

                        return (
                          <div key={position} className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">{position}</h4>
                            <div className="grid gap-2">
                              {players.map(pick => (
                                <div key={pick.element} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      {pick.is_captain && <Badge variant="default" className="text-xs">C</Badge>}
                                      {pick.is_vice_captain && <Badge variant="secondary" className="text-xs">V</Badge>}
                                    </div>
                                    <div>
                                      <p className="font-medium">{pick.player?.web_name}</p>
                                      <p className="text-xs text-muted-foreground">{pick.player?.team_name}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">£{pick.player ? formatPrice(pick.player.now_cost) : 'N/A'}m</p>
                                    <p className="text-xs text-muted-foreground">{pick.player?.total_points} pts</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Bench */}
                <Card>
                  <CardHeader>
                    <CardTitle>Bench</CardTitle>
                    <CardDescription>Substitute players</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {(teamData?.picks || [])
                        .filter(pick => pick.position > 11)
                        .map(pick => {
                          const player = getPlayerById(pick.element);
                          return (
                            <div key={pick.element} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium">{player?.web_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getPositionName(player?.element_type || 0)} - {player?.team_name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">£{player ? formatPrice(player.now_cost) : 'N/A'}m</p>
                                <p className="text-xs text-muted-foreground">{player?.total_points} pts</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Top Leagues Tab */}
          <TabsContent value="leagues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top League Performances
                </CardTitle>
                <CardDescription>Your best ranking positions across all leagues</CardDescription>
              </CardHeader>
              <CardContent>
                {getTopLeagues().length > 0 ? (
                  <div className="space-y-3">
                    {getTopLeagues().map((league, index) => (
                      <div key={league.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            #{league.rank}
                          </Badge>
                          <span className="font-medium">{league.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Entry #{league.entry_rank}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No top 100 league positions found. Keep playing to improve your rankings!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Performance Tab */}
          <TabsContent value="recent" className="space-y-6">
            {historyData?.current && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Recent Gameweeks
                  </CardTitle>
                  <CardDescription>Your performance in recent gameweeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {historyData.current.slice(-6).map((gw) => (
                      <div key={gw.event} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">GW{gw.event}</Badge>
                          <span className="font-medium">{gw.points} points</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">#{formatRank(gw.overall_rank)}</p>
                          <p className="text-xs text-muted-foreground">
                            GW Rank: #{formatRank(gw.rank)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Historical Performance Tab */}
          <TabsContent value="history" className="space-y-6">
            {historyData?.past && historyData.past.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Season History
                  </CardTitle>
                  <CardDescription>Your performance in previous seasons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {historyData.past.map((season) => (
                      <div key={season.season_name} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{season.season_name}</Badge>
                          <span className="font-medium">{season.total_points} points</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">#{formatRank(season.rank)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {historyData?.chips && historyData.chips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Chips Used
                  </CardTitle>
                  <CardDescription>History of your chip usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {historyData.chips.map((chip, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{chip.name}</Badge>
                          <span className="font-medium">GW{chip.event}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(chip.time).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
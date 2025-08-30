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
  Crown,
  Medal,
  Award,
  Search,
  BarChart3,
  ChevronUp,
  ChevronDown
} from "lucide-react";

// Interfaces
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

interface LeagueEntry {
  id: number;
  entry_name: string;
  player_first_name: string;
  player_last_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
}

interface League {
  id: number;
  name: string;
  short_name: string;
  created: string;
  closed: boolean;
  max_entries: number | null;
  league_type: string;
  admin_entry: number;
  start_event: number;
  code_privacy: string;
}

interface LeagueData {
  id: number;
  name: string;
  standings: LeagueStanding[];
  league_type: string;
  admin_entry: number;
  started: boolean;
  code_privacy: string;
  has_cup: boolean;
  cup_league?: number;
  rank?: number;
}

interface LeagueStanding {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
  entry_name: string;
}

export default function MyDashboard() {
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

  // Data queries
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

  const { data: leaguesData, isLoading: isLoadingLeagues, error: leaguesError } = useQuery<LeagueData[]>({
    queryKey: ["/api/manager", searchedId, "leagues"],
    enabled: !!searchedId,
  });

  // Search handlers
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

  // Helper functions
  const formatRank = (rank: number) => {
    return rank.toLocaleString();
  };

  const formatPrice = (price: number) => {
    return `£${(price / 10).toFixed(1)}m`;
  };

  const getPositionName = (positionId: number): string => {
    const positions = {
      1: "Goalkeeper",
      2: "Defender", 
      3: "Midfielder",
      4: "Forward"
    };
    return positions[positionId as keyof typeof positions] || "Unknown";
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
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3);
  };

  const getCurrentGameweek = () => {
    if (!bootstrapData?.events) return null;
    return bootstrapData.events.find(event => event.is_current);
  };

  const getStartingEleven = () => {
    if (!teamData?.picks || !bootstrapData?.elements) return [];
    return teamData.picks
      .filter(pick => pick.position <= 11)
      .map(pick => {
        const player = bootstrapData.elements.find(p => p.id === pick.element);
        return { ...pick, player };
      })
      .sort((a, b) => a.position - b.position);
  };

  const getBench = () => {
    if (!teamData?.picks || !bootstrapData?.elements) return [];
    return teamData.picks
      .filter(pick => pick.position > 11)
      .map(pick => {
        const player = bootstrapData.elements.find(p => p.id === pick.element);
        return { ...pick, player };
      })
      .sort((a, b) => a.position - b.position);
  };

  const getTeamValue = () => {
    if (!teamData?.picks || !bootstrapData?.elements) return 0;
    return teamData.picks.reduce((total, pick) => {
      const player = bootstrapData.elements.find(p => p.id === pick.element);
      return total + (player?.now_cost || 0);
    }, 0) / 10;
  };

  const isLoading = isLoadingManager || isLoadingHistory || isLoadingTeam || isLoadingLeagues;
  const error = managerError || historyError || teamError || leaguesError;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My FPL Dashboard</h1>
          <p className="text-muted-foreground">
            Complete overview of your Fantasy Premier League performance
          </p>
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <Input
            type="text"
            placeholder="Enter Manager ID (e.g., 123456)"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            data-testid="input-manager-id"
          />
          <Button 
            onClick={handleSearch} 
            disabled={!managerId.trim()}
            data-testid="button-search-manager"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert className="max-w-2xl mx-auto">
          <AlertDescription>
            {error instanceof Error 
              ? error.message 
              : "Failed to load manager data. Please check the Manager ID and try again."
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && searchedId && (
        <div className="text-center py-8">
          <div className="text-lg">Loading manager data...</div>
        </div>
      )}

      {/* Dashboard Content */}
      {managerData && !isLoading && (
        <div className="space-y-6">
          {/* Manager Overview */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {managerData.player_first_name} {managerData.player_last_name}
              </CardTitle>
              <CardDescription>
                {managerData.player_region_name} • Manager ID: {managerData.id}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="leagues">Leagues</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Overall Rank */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Overall Rank</p>
                        <p className="text-2xl font-bold">{formatRank(managerData.summary_overall_rank)}</p>
                        {getRankChange() !== null && (
                          <div className={`flex items-center text-sm ${getRankChange()! > 0 ? 'text-green-600' : getRankChange()! < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {getRankChange()! > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : getRankChange()! < 0 ? (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            ) : null}
                            {getRankChange()! > 0 ? '+' : ''}{formatRank(getRankChange()!)}
                          </div>
                        )}
                      </div>
                      <Trophy className="h-8 w-8 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Points */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                        <p className="text-2xl font-bold">{managerData.summary_overall_points.toLocaleString()}</p>
                      </div>
                      <Target className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Gameweek Points */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">GW Points</p>
                        <p className="text-2xl font-bold">{managerData.summary_event_points}</p>
                        <p className="text-sm text-muted-foreground">
                          GW{managerData.current_event}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Gameweek Rank */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">GW Rank</p>
                        <p className="text-2xl font-bold">{formatRank(managerData.summary_event_rank)}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Leagues Preview */}
              {getTopLeagues().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Top League Positions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getTopLeagues().map((league, index: number) => (
                        <div key={league.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                            {index === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                            {index === 2 && <Award className="h-4 w-4 text-amber-600" />}
                            <span className="font-medium">{league.name}</span>
                          </div>
                          <Badge variant="secondary">
                            #{league.rank}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              {teamData && (
                <>
                  {/* Team Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Team Value</p>
                            <p className="text-2xl font-bold">£{getTeamValue().toFixed(1)}m</p>
                          </div>
                          <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">In the Bank</p>
                            <p className="text-2xl font-bold">£{(teamData.transfers.bank / 10).toFixed(1)}m</p>
                          </div>
                          <Target className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Transfers Made</p>
                            <p className="text-2xl font-bold">{teamData.transfers.made}/{teamData.transfers.limit}</p>
                          </div>
                          <Users className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Starting XI */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Starting XI
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {getStartingEleven().map((pick) => (
                          <div key={pick.element} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              {pick.is_captain && <Crown className="h-4 w-4 text-yellow-500" />}
                              {pick.is_vice_captain && <Star className="h-4 w-4 text-gray-400" />}
                              <div>
                                <div className="font-medium">{pick.player?.web_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {pick.player?.team_name} • {getPositionName(pick.player?.element_type || 0)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatPrice(pick.player?.now_cost || 0)}</div>
                              <div className="text-sm text-muted-foreground">{pick.player?.total_points} pts</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bench */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Bench
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {getBench().map((pick) => (
                          <div key={pick.element} className="flex items-center justify-between p-3 rounded-lg border opacity-75">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{pick.player?.web_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {pick.player?.team_name} • {getPositionName(pick.player?.element_type || 0)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatPrice(pick.player?.now_cost || 0)}</div>
                              <div className="text-sm text-muted-foreground">{pick.player?.total_points} pts</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Leagues Tab */}
            <TabsContent value="leagues" className="space-y-6">
              {leaguesData && leaguesData.length > 0 ? (
                <div className="space-y-6">
                  {leaguesData.map((league) => (
                    <Card key={league.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5" />
                          {league.name}
                        </CardTitle>
                        <CardDescription>
                          {league.league_type === 'x' ? 'Classic League' : 'Head-to-Head League'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {league.standings.slice(0, 10).map((entry, index) => (
                            <div 
                              key={entry.entry} 
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                entry.entry.toString() === searchedId ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant={entry.entry.toString() === searchedId ? 'default' : 'secondary'}>
                                  #{entry.rank}
                                </Badge>
                                <div>
                                  <div className="font-medium">
                                    {entry.player_name}
                                    {entry.entry.toString() === searchedId && (
                                      <span className="text-blue-600 ml-2 text-sm">(You)</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {entry.entry_name}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{entry.total.toLocaleString()} pts</div>
                                {entry.rank !== entry.last_rank && (
                                  <div className={`flex items-center text-xs ${
                                    entry.rank < entry.last_rank ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {entry.rank < entry.last_rank ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                    {Math.abs(entry.rank - entry.last_rank)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No leagues found for this manager.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              {historyData && (
                <>
                  {/* Season History */}
                  {historyData?.past && historyData.past.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Season History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {historyData.past.map((season, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="font-medium">{season.season_name}</div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="font-medium">{season.total_points.toLocaleString()} pts</div>
                                  <div className="text-sm text-muted-foreground">
                                    Rank: {formatRank(season.rank)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Chips Used */}
                  {historyData?.chips && historyData.chips.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5" />
                          Chips Used
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {historyData.chips.map((chip, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <div className="font-medium capitalize">{chip.name.replace('_', ' ')}</div>
                                <div className="text-sm text-muted-foreground">
                                  Gameweek {chip.event}
                                </div>
                              </div>
                              <Badge variant="outline">Used</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Gameweeks */}
                  {historyData?.current && historyData.current.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Recent Gameweeks
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {historyData.current.slice(-5).reverse().map((gw) => (
                            <div key={gw.event} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <div className="font-medium">Gameweek {gw.event}</div>
                                <div className="text-sm text-muted-foreground">
                                  {gw.event_transfers} transfers • {formatPrice(gw.bank)} bank
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{gw.points} pts</div>
                                <div className="text-sm text-muted-foreground">
                                  Rank: {formatRank(gw.overall_rank)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Initial State */}
      {!searchedId && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enter Your Manager ID</h2>
            <p className="text-muted-foreground mb-4">
              Find your Manager ID in the FPL app under "Points" → "Gameweek History" or in your team URL.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
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
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";



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
  active_chip: string | null;
  automatic_subs: Array<{
    entry: number;
    element_in: number;
    element_out: number;
    event: number;
  }>;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    rank_sort: number;
    overall_rank: number;
    percentile_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
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

interface LeagueResponse {
  classic: Array<{
    id: number;
    name: string;
    short_name: string;
    created: string;
    closed: boolean;
    max_entries: number | null;
    league_type: string;
    admin_entry: number | null;
    start_event: number;
    entry_can_leave: boolean;
    entry_can_admin: boolean;
    entry_can_invite: boolean;
    has_cup: boolean;
    cup_league: number | null;
    cup_qualified: boolean | null;
    rank_count: number | null;
    entry_percentile_rank: number | null;
    entry_rank: number;
    entry_last_rank: number;
  }>;
  h2h: any[];
  cup: any;
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

interface LeagueAnalysisProps {
  leagueId: number;
  managerId: string;
}

export default function MyDashboard() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");

  // League Analysis Component
  const LeagueAnalysis = ({ leagueId, managerId }: LeagueAnalysisProps) => {
    const { data: leagueData, isLoading, error } = useQuery({
      queryKey: [`/api/leagues-classic/${leagueId}/standings`],
      enabled: !!leagueId
    });

    // Fetch additional pages to find current manager if not in first page
    const { data: page2Data } = useQuery({
      queryKey: [`/api/leagues-classic/${leagueId}/standings?page=2`],
      enabled: !!leagueId && leagueData && !leagueData.standings?.results?.some((entry: any) => entry.entry.toString() === managerId)
    });

    const { data: page3Data } = useQuery({
      queryKey: [`/api/leagues-classic/${leagueId}/standings?page=3`],
      enabled: !!leagueId && page2Data && !page2Data.standings?.results?.some((entry: any) => entry.entry.toString() === managerId)
    });

    const { data: leagueAnalysisData } = useQuery({
      queryKey: [`/api/leagues/${leagueId}/analyze`],
      enabled: !!leagueId
    });

    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (error || !leagueData) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load league data</p>
        </div>
      );
    }

    // Combine all available data to search for current manager
    const allPages = [leagueData, page2Data, page3Data].filter(Boolean);
    let allPossibleEntries: any[] = [];
    let currentManagerEntry: any = null;

    for (const pageData of allPages) {
      const entries = pageData?.standings?.results || [];
      allPossibleEntries.push(...entries);
      
      if (!currentManagerEntry) {
        currentManagerEntry = entries.find((entry: any) => entry.entry.toString() === managerId);
      }
    }

    // Show top 50 plus current manager if not already included
    const allEntries = leagueData.standings?.results || [];
    let topEntries = allEntries.length > 50 ? allEntries.slice(0, 50) : allEntries;
    
    // Always add current manager if not in top 50 and exists in any page
    const currentManagerInTop50 = topEntries.some((entry: any) => entry.entry.toString() === managerId);
    if (!currentManagerInTop50 && currentManagerEntry) {
      topEntries = [...topEntries, currentManagerEntry];
    }
    
    console.log('Debug League Analysis:', {
      managerId,
      currentManagerEntry: currentManagerEntry ? { rank: currentManagerEntry.rank, name: currentManagerEntry.player_name } : null,
      currentManagerInTop50,
      allEntriesLength: allEntries.length,
      topEntriesLength: topEntries.length,
      pagesSearched: allPages.length
    });
    
    return (
      <div className="space-y-6">
        {/* League Standings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              League Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topEntries.map((entry: any, index: number) => {
                const isCurrentManager = entry.entry.toString() === managerId;
                return (
                  <div 
                    key={entry.entry} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isCurrentManager ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <p className="font-medium">
                          {entry.player_name}
                          {isCurrentManager && <span className="text-blue-600 ml-2 text-sm">(You)</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">{entry.entry_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{entry.total?.toLocaleString()} pts</p>
                      {entry.event_total && (
                        <p className="text-sm text-muted-foreground">GW: {entry.event_total}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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

  // Get fixtures for teams
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    enabled: !!bootstrapData && !!teamData,
  });

  const { data: leaguesData, isLoading: isLoadingLeagues, error: leaguesError } = useQuery<LeagueResponse>({
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



  const getRankChange = () => {
    if (!historyData?.current || historyData.current.length < 2) return null;
    
    const current = historyData.current[historyData.current.length - 1];
    const previous = historyData.current[historyData.current.length - 2];
    
    return previous.overall_rank - current.overall_rank;
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

  // Team helper functions (copied from My Team page)
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
    const teamId = (player as any).team || player.team_name;
    return bootstrapData?.teams.find(t => t.id === teamId);
  };

  const getNextFixtures = (teamId: number, count: number = 5) => {
    if (!fixturesData || !Array.isArray(fixturesData)) {
      return [];
    }
    
    const currentGW = getCurrentGameweekDashboard();
    
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
    if (difficulty === 1) return "bg-green-600 text-white";
    if (difficulty === 2) return "bg-green-100 text-green-800";
    if (difficulty === 3) return "bg-gray-100 text-gray-800";
    if (difficulty === 4) return "bg-red-100 text-red-800";
    return "bg-red-600 text-white";
  };

  const getCurrentGameweekDashboard = (): number => {
    const currentEvent = bootstrapData?.events.find(e => e.is_current);
    return currentEvent?.id || 1;
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

  const getCurrentGameweekPoints = (): number | null => {
    if (!historyData || !Array.isArray(historyData?.current)) return null;
    const currentGW = getCurrentGameweekDashboard();
    const currentGWData = historyData.current.find((gw: any) => gw.event === currentGW);
    return currentGWData?.points || null;
  };

  const getTotalPoints = (): number => {
    if (!historyData || !Array.isArray(historyData?.current)) return 0;
    return historyData.current.reduce((total: number, gw: any) => total + (gw.points || 0), 0);
  };

  const sortPlayersByPosition = (picks: TeamPick[]) => {
    return picks.sort((a, b) => {
      const playerA = getPlayerById(a.element);
      const playerB = getPlayerById(b.element);
      
      if (!playerA || !playerB) return 0;
      
      if (playerA.element_type !== playerB.element_type) {
        return playerA.element_type - playerB.element_type;
      }
      
      return a.position - b.position;
    });
  };

  const getTeamValue = () => {
    if (!teamData?.entry_history?.value) return 0;
    return teamData.entry_history.value / 10;
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
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

              {/* My Leagues */}
              {leaguesData && leaguesData.classic && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      My Leagues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaguesData.classic
                        .filter(league => {
                          // Show only: Overall League (id=314), Country leagues (India), and classic leagues
                          if (league.id === 314) return true; // Overall League
                          if (league.name.toLowerCase().includes('india')) return true; // India leagues
                          if (league.league_type === 'x' && league.id > 1000) return true; // Classic leagues (private leagues have id > 1000)
                          return false;
                        })
                        .filter(league => league.entry_rank > 0)
                        .sort((a, b) => {
                          // Sort by priority: Overall first, then India, then classic leagues by rank
                          if (a.id === 314) return -1;
                          if (b.id === 314) return 1;
                          if (a.name.toLowerCase().includes('india') && !b.name.toLowerCase().includes('india')) return -1;
                          if (b.name.toLowerCase().includes('india') && !a.name.toLowerCase().includes('india')) return 1;
                          return a.entry_rank - b.entry_rank;
                        })
                        .map((league, index: number) => {
                          let leagueTypeLabel = 'Classic League';
                          
                          if (league.id === 314) {
                            leagueTypeLabel = 'Overall League';
                          } else if (league.name.toLowerCase().includes('india')) {
                            leagueTypeLabel = 'Country League';
                          }

                          return (
                            <div key={league.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate" title={league.name}>
                                    {league.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {leagueTypeLabel} • {league.rank_count?.toLocaleString()} managers
                                    {league.rank_count && league.entry_rank && (
                                      <span> • {(() => {
                                        const percentile = Math.round(((league.rank_count - league.entry_rank) / league.rank_count) * 100);
                                        const suffix = percentile % 100 >= 11 && percentile % 100 <= 13 ? 'th' : 
                                                      percentile % 10 === 1 ? 'st' : 
                                                      percentile % 10 === 2 ? 'nd' : 
                                                      percentile % 10 === 3 ? 'rd' : 'th';
                                        return `${percentile}${suffix}`;
                                      })()} percentile</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div className="flex flex-col items-end space-y-1">
                                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                                    #{league.entry_rank.toLocaleString()}
                                  </div>
                                  {league.entry_rank !== league.entry_last_rank && (
                                    <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                                      league.entry_rank < league.entry_last_rank 
                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                        : 'bg-red-100 text-red-700 border border-red-200'
                                    }`}>
                                      {league.entry_rank < league.entry_last_rank ? (
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                      )}
                                      {Math.abs(league.entry_rank - league.entry_last_rank)}
                                    </div>
                                  )}
                                </div>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-xs">
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      View League
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="league-analysis-description">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <Trophy className="h-5 w-5" />
                                        {league.name}
                                      </DialogTitle>
                                      <p id="league-analysis-description" className="text-sm text-muted-foreground sr-only">
                                        Detailed analysis and standings for {league.name}
                                      </p>
                                    </DialogHeader>
                                    <LeagueAnalysis leagueId={league.id} managerId={managerId} />
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              {teamData && (
                <>
                  {/* Team Overview Cards */}
                  <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-5">
                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-emerald-700 mb-1 truncate">Formation</p>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-900 truncate">
                              {getFormationString()}
                            </p>
                          </div>
                          <div className="p-1.5 sm:p-2 bg-emerald-200 rounded-full flex-shrink-0">
                            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-700" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-green-700 mb-1 truncate">Squad Value</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-900 truncate">
                              {formatPrice(getTotalTeamValue())}
                            </p>
                            <p className="text-xs text-green-600 mt-1 truncate">
                              Bank: {formatPrice(teamData.entry_history?.bank || 0)}
                            </p>
                          </div>
                          <div className="p-1.5 sm:p-2 bg-green-200 rounded-full flex-shrink-0">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1 truncate">Transfers</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-900 truncate">
                              {teamData.entry_history?.event_transfers || 0}/1
                            </p>
                            {teamData.entry_history?.event_transfers_cost && teamData.entry_history.event_transfers_cost > 0 && (
                              <p className="text-xs text-red-600 mt-1 truncate">
                                Cost: -{teamData.entry_history.event_transfers_cost} pts
                              </p>
                            )}
                          </div>
                          <div className="p-1.5 sm:p-2 bg-blue-200 rounded-full flex-shrink-0">
                            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-orange-700 mb-1 truncate">Current GW Points</p>
                            <p className="text-xl sm:text-2xl font-bold text-orange-900 truncate">
                              {getCurrentGameweekPoints() !== null ? getCurrentGameweekPoints() : '-'}
                            </p>
                            <p className="text-xs text-orange-600 mt-1 truncate">GW {getCurrentGameweekDashboard()}</p>
                          </div>
                          <div className="p-1.5 sm:p-2 bg-orange-200 rounded-full flex-shrink-0">
                            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-orange-700" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-indigo-700 mb-1 truncate">Total Points</p>
                            <p className="text-xl sm:text-2xl font-bold text-indigo-900 truncate">
                              {getTotalPoints()}
                            </p>
                            <p className="text-xs text-indigo-600 mt-1 truncate">All gameweeks</p>
                          </div>
                          <div className="p-1.5 sm:p-2 bg-indigo-200 rounded-full flex-shrink-0">
                            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-700" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Legend */}
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

                  {/* Starting XI and Bench */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Starting XI */}
                    <Card className="bg-white shadow-lg border border-gray-200">
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Starting XI
                        </CardTitle>
                        <CardDescription className="text-emerald-50">
                          Your team for Gameweek {getCurrentGameweekDashboard()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="space-y-0">
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
                                              <div className="flex gap-1 flex-wrap">
                                                {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).map((fixture, idx) => (
                                                  <div 
                                                    key={idx}
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${getDifficultyColor(fixture.difficulty)} whitespace-nowrap`}
                                                    title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                                  >
                                                    <span className="truncate max-w-[40px]">{fixture.opponent}</span>
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
                                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${getDifficultyColor(fixture.difficulty)} whitespace-nowrap`}
                                              title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                            >
                                              <span className="truncate max-w-[40px]">{fixture.opponent}</span>
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
                </>
              )}
              
              {!teamData && searchedId && (
                <div className="text-center py-8">
                  <div className="text-lg">Loading team data...</div>
                </div>
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
                                  {gw.event_transfers || 0} transfers • {formatPrice(gw.bank || 0)} bank
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{gw.points || 0} pts</div>
                                <div className="text-sm text-muted-foreground">
                                  Rank: {formatRank(gw.overall_rank || 0)}
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
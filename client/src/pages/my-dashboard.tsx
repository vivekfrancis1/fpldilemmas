import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ExternalLink,
  ArrowLeftRight
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { FplConnectDialog } from "@/components/fpl-connect-dialog";



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
  team: number;
  team_name: string;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  selected_by_percent: string;
  event_points?: number;
  in_dreamteam?: boolean;
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


interface Transfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
}

export default function MyDashboard() {
  const [, setLocation] = useLocation();
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  // Default to pitch view on desktop (>=768px), list view on mobile
  const [teamView, setTeamView] = useState<"list" | "pitch">(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 ? "pitch" : "list";
    }
    return "list";
  });


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

  const { data: transfersData, isLoading: isLoadingTransfers, error: transfersError } = useQuery<Transfer[]>({
    queryKey: ["/api/manager", searchedId, "transfers"],
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
  const formatRank = (rank: number | null | undefined) => {
    if (rank === null || rank === undefined) return 'N/A';
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
    return bootstrapData?.teams.find(t => t.id === player.team);
  };

  const getTeamJerseyColor = (teamId: number): string => {
    const jerseyColors: Record<number, string> = {
      1: '#EF0107',      // Arsenal - Red
      2: '#95BFE5',      // Aston Villa - Claret & Blue (Light Blue)
      3: '#8B0000',      // Burnley - Dark Red (not in current PL)
      4: '#8B0000',      // Bournemouth - Dark Red/Black
      5: '#FDB913',      // Brentford - Red & White (Gold)
      6: '#0057B8',      // Brighton - Blue & White
      7: '#034694',      // Chelsea - Dark Blue
      8: '#1B458F',      // Crystal Palace - Blue & Pink
      9: '#003399',      // Everton - Dark Blue
      10: '#FFFFFF',     // Fulham - White
      11: '#FFFFFF',     // Leeds - White (not in current PL)
      12: '#C8102E',     // Liverpool - Red
      13: '#6CABDD',     // Man City - Sky Blue
      14: '#DA291C',     // Man Utd - Red
      15: '#241F20',     // Newcastle - Black & White
      16: '#DA020E',     // Nottm Forest - Red
      17: '#1B458F',     // Sunderland - Blue (not in current PL)
      18: '#FFFFFF',     // Spurs (Tottenham) - White
      19: '#FBEE23',     // West Ham - Claret & Blue (Gold)
      20: '#FDB913'      // Wolves - Gold & Black
    };
    
    return jerseyColors[teamId] || '#9CA3AF';
  };

  const getTextColor = (backgroundColor: string): string => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const getNextFixtures = (teamId: number, count: number = 3) => {
    if (!fixturesData || !Array.isArray(fixturesData)) {
      return [];
    }
    
    const currentGW = getCurrentGameweekDashboard();
    const nextGameweeks = Array.from({ length: count }, (_, i) => currentGW + i + 1);
    
    return nextGameweeks.map(gw => {
      const fixture = fixturesData.find((f: any) => 
        (f.team_h === teamId || f.team_a === teamId) && f.event === gw
      );
      
      if (!fixture) {
        return {
          opponent: 'BGW',
          isHome: true,
          difficulty: 3,
          gameweek: gw
        };
      }
      
      const isHome = fixture.team_h === teamId;
      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      const opponent = getTeamById(opponentId);
      const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
      
      return {
        opponent: opponent?.short_name || 'TBD',
        isHome,
        difficulty: difficulty || 3,
        gameweek: gw
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

  const getCurrentGameweekFixture = (teamId: number) => {
    if (!fixturesData || !Array.isArray(fixturesData)) return null;
    
    const currentGW = getCurrentGameweekDashboard();
    
    const fixture = fixturesData.find((f: any) => 
      (f.team_h === teamId || f.team_a === teamId) && f.event === currentGW
    );
    
    if (!fixture) return null;
    
    const isHome = fixture.team_h === teamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponent = getTeamById(opponentId);
    
    return {
      finished: fixture.finished,
      started: fixture.started,
      opponent: opponent?.short_name || 'TBD',
      isHome,
      fixture
    };
  };

  const getPlayerDisplayPoints = (player: any, teamId: number, isMultiplied: boolean = false) => {
    const points = player.event_points || 0;
    const displayPoints = points * (isMultiplied ? 2 : 1);
    
    const currentFixture = getCurrentGameweekFixture(teamId);
    
    if (!currentFixture) return displayPoints.toString();
    
    if (!currentFixture.started || (!currentFixture.finished && points === 0)) {
      return `vs ${currentFixture.opponent.substring(0, 3)} (${currentFixture.isHome ? 'H' : 'A'})`;
    }
    
    if (currentFixture.finished && points === 0) {
      return '-';
    }
    
    return displayPoints.toString();
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

  const sortBenchPlayers = (picks: TeamPick[]) => {
    return picks.sort((a, b) => a.position - b.position);
  };

  const getTeamValue = () => {
    if (!teamData?.entry_history?.value) return 0;
    return teamData.entry_history.value / 10;
  };

  // Derive loading state from all data dependencies - prevents stuck loading conditions
  const isLoading = isLoadingManager || isLoadingHistory || isLoadingTeam || isLoadingLeagues || isLoadingTransfers;
  const error = managerError || historyError || teamError || leaguesError || transfersError;
  const hasAnyData = managerData || historyData || teamData || leaguesData || transfersData;
  const ready = !isLoading && hasAnyData && searchedId;

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Trophy className="h-8 w-8" />
              <h1>My FPL Dashboard</h1>
            </div>
            <p className="fpl-page-subtitle">
              Complete overview of your Fantasy Premier League performance with detailed team analysis, league standings, and performance tracking
            </p>
          </div>
        </div>

        {/* Manager Search Section */}
        <Card className="mb-8 border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="max-w-2xl mx-auto">
              <label htmlFor="manager-id" className="block text-sm font-medium text-gray-700 mb-2">
                Manager ID
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-stretch">
                <Input
                  id="manager-id"
                  type="text"
                  placeholder="Enter your FPL Manager ID (e.g., 123456)"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                  data-testid="input-manager-id"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSearch} 
                    disabled={!managerId.trim()}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap"
                    data-testid="button-search-manager"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Manager
                  </Button>
                  <FplConnectDialog />
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3">
                <p className="font-medium">To find your Manager ID, follow these steps:</p>
                <ol className="list-decimal list-inside space-y-1 mt-2 ml-2">
                  <li>Visit fantasy.premierleague.com from your web browser (not the mobile app) and sign in to your account.</li>
                  <li>Click on the Points tab.</li>
                  <li>Check the URL in your browser's address bar. Your Manager ID is the number in the URL after "entry". For example, in https://fantasy.premierleague.com/entry/123456/event/3, the Manager ID is 123456.</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert className="max-w-2xl mx-auto mb-8 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error instanceof Error 
                ? error.message 
                : "Failed to load manager data. Please check the Manager ID and try again."
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && searchedId && (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-purple-500 bg-white transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading manager data...
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {managerData && !isLoading && (
          <div className="fpl-section-spacing">
            {/* Manager Overview */}
            <Card className="border-0 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg">
              <CardHeader className="text-center pb-6">
                <CardTitle className="fpl-heading-section text-gradient bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {managerData.player_first_name} {managerData.player_last_name}
                </CardTitle>
                <CardDescription className="fpl-text-body text-lg">
                  {managerData.player_region_name} • Manager ID: {managerData.id}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Main Dashboard Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              {/* All 5 tabs in one row on mobile */}
              <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2 md:py-3 font-medium transition-all duration-200 text-[10px] md:text-sm"
                  data-testid="tab-overview"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="team" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2 md:py-3 font-medium transition-all duration-200 text-[10px] md:text-sm"
                  data-testid="tab-team"
                >
                  Team
                </TabsTrigger>
                <TabsTrigger 
                  value="transfers" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2 md:py-3 font-medium transition-all duration-200 text-[10px] md:text-sm"
                  data-testid="tab-transfers"
                >
                  Transfers
                </TabsTrigger>
                <TabsTrigger 
                  value="chips" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2 md:py-3 font-medium transition-all duration-200 text-[10px] md:text-sm"
                  data-testid="tab-chips"
                >
                  Chips
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2 md:py-3 font-medium transition-all duration-200 text-[10px] md:text-sm"
                  data-testid="tab-performance"
                >
                  Performance
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="fpl-section-spacing mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Total Points */}
                  <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg hover:shadow-xl transition-all duration-300 mobile-dashboard-card" data-testid="card-total-points">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-600 mb-1">Total Points</p>
                          <p className="text-xl sm:text-2xl font-bold text-blue-900">{managerData.summary_overall_points.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Overall Rank */}
                  <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg hover:shadow-xl transition-all duration-300 mobile-dashboard-card" data-testid="card-overall-rank">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-xs font-medium text-amber-600 mb-2">Overall Rank</p>
                          <p className="text-xl sm:text-2xl font-bold text-amber-900 break-words">{formatRank(managerData.summary_overall_rank)}</p>
                          {getRankChange() !== null && getRankChange() !== 0 && (
                            <div className={`flex items-center text-xs mt-1 ${getRankChange()! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {getRankChange()! > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" />
                              )}
                              <span className="font-medium">
                                {getRankChange()! > 0 ? '+' : ''}{formatRank(getRankChange()!)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-amber-100 rounded-full flex-shrink-0 self-start">
                          <Trophy className="h-5 w-5 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gameweek Points */}
                  <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300 mobile-dashboard-card" data-testid="card-gameweek-points">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-green-600 mb-1">GW Points</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-900">{managerData.summary_event_points}</p>
                          <p className="text-xs text-green-600 font-medium mt-1">
                            GW{managerData.current_event}
                          </p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                          <Activity className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gameweek Rank */}
                  <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50 shadow-lg hover:shadow-xl transition-all duration-300 mobile-dashboard-card" data-testid="card-gameweek-rank">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-purple-600 mb-1">GW Rank</p>
                          <p className="text-xl sm:text-2xl font-bold text-purple-900">{formatRank(managerData.summary_event_rank)}</p>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-full flex-shrink-0">
                          <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              </div>

                {/* My Leagues */}
                {leaguesData && leaguesData.classic && (
                  <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg mobile-dashboard-card" data-testid="card-leagues">
                    <CardHeader className="mobile-dashboard-header">
                      <CardTitle className="fpl-heading-card flex items-center gap-2 text-indigo-800 mobile-dashboard-title">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Trophy className="h-5 w-5 text-indigo-600" />
                        </div>
                        My Leagues
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                    <div className="space-y-2 sm:space-y-3">
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
                          return (
                            <div 
                              key={league.id} 
                              className="mobile-league-item cursor-pointer"
                              onClick={() => {
                                setLocation(`/league-analysis/${league.id}/${encodeURIComponent(league.name)}/${searchedId}`);
                              }}
                              data-testid={`league-item-${league.id}`}
                            >
                              <div className="mobile-league-info">
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-800 truncate" title={league.name}>
                                    {league.name}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {league.rank_count?.toLocaleString()} managers
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-800">
                                  #{league.entry_rank.toLocaleString()}
                                </div>
                                {league.entry_last_rank && league.entry_last_rank !== league.entry_rank && (
                                  <div className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                    league.entry_last_rank > league.entry_rank 
                                      ? 'text-green-700 bg-green-50' 
                                      : 'text-red-700 bg-red-50'
                                  }`}>
                                    {league.entry_last_rank > league.entry_rank ? (
                                      <>
                                        <TrendingUp className="h-3 w-3" />
                                        <span>{(league.entry_last_rank - league.entry_rank).toLocaleString()}</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrendingDown className="h-3 w-3" />
                                        <span>{(league.entry_rank - league.entry_last_rank).toLocaleString()}</span>
                                      </>
                                    )}
                                  </div>
                                )}
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
                              {teamData.entry_history?.event_transfers || 0}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5 truncate">
                              {teamData.entry_history?.event_transfers || 0} made / {(() => {
                                const transfersMade = teamData.entry_history?.event_transfers || 0;
                                const transferCost = teamData.entry_history?.event_transfers_cost || 0;
                                const freeTransfers = transfersMade - (transferCost / 4);
                                return freeTransfers;
                              })()} free
                            </p>
                            {teamData.entry_history?.event_transfers_cost && teamData.entry_history.event_transfers_cost > 0 && (
                              <p className="text-xs text-red-600 font-semibold mt-1 truncate">
                                -{teamData.entry_history.event_transfers_cost} pts
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
                              {managerData?.summary_event_points || 0}
                            </p>
                            <p className="text-xs text-orange-600 mt-1 truncate">GW {managerData?.current_event || getCurrentGameweekDashboard()}</p>
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

                  {/* View Toggle - Hidden on mobile */}
                  <div className="hidden md:flex justify-center gap-2">
                    <Button
                      variant={teamView === "pitch" ? "default" : "outline"}
                      onClick={() => setTeamView("pitch")}
                      className="flex items-center gap-2"
                      data-testid="button-team-pitch-view"
                    >
                      <Target className="h-4 w-4" />
                      Pitch View
                    </Button>
                    <Button
                      variant={teamView === "list" ? "default" : "outline"}
                      onClick={() => setTeamView("list")}
                      className="flex items-center gap-2"
                      data-testid="button-team-list-view"
                    >
                      <Users className="h-4 w-4" />
                      List View
                    </Button>
                  </div>

                  {/* Pitch View - Hidden on mobile */}
                  {teamView === "pitch" && (
                    <div className="space-y-4">
                      {/* Pitch */}
                      <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 overflow-hidden">
                        {/* Pitch Lines and Graphics */}
                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                          {/* Center Line - Horizontal */}
                          <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
                          
                          {/* Center Line - Vertical */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white"></div>
                          
                          {/* Center Circle - centered in middle of pitch */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                          
                          {/* Top Goal Area (near goalkeeper) */}
                          {/* Penalty Box - 18 yard box */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-t-0 border-white"></div>
                          {/* 6-yard Box */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-t-0 border-white"></div>
                          {/* Penalty Spot */}
                          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                          {/* Penalty Arc */}
                          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-b-0 border-l-0 border-r-0 border-white rounded-t-full"></div>
                          
                          {/* Goal Post */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
                            {/* Goal Posts */}
                            <div className="absolute left-0 top-0 w-1 h-4 bg-white"></div>
                            <div className="absolute right-0 top-0 w-1 h-4 bg-white"></div>
                          </div>
                          
                          {/* Bottom Goal Area (near forwards) - Mirror of top */}
                          {/* Penalty Box - 18 yard box */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-b-0 border-white"></div>
                          {/* 6-yard Box */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-b-0 border-white"></div>
                          {/* Penalty Spot */}
                          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                          {/* Penalty Arc */}
                          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-t-0 border-l-0 border-r-0 border-white rounded-b-full"></div>
                          
                          {/* Bottom Goal Post */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
                            {/* Goal Posts */}
                            <div className="absolute left-0 bottom-0 w-1 h-4 bg-white"></div>
                            <div className="absolute right-0 bottom-0 w-1 h-4 bg-white"></div>
                          </div>
                          
                          {/* Corner Arcs */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-2 border-t-0 border-l-0 border-white rounded-br-full"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-2 border-t-0 border-r-0 border-white rounded-bl-full"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-2 border-b-0 border-l-0 border-white rounded-tr-full"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-2 border-b-0 border-r-0 border-white rounded-tl-full"></div>
                        </div>

                      <div className="relative space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
                        {/* Goalkeepers */}
                        {(() => {
                          const gks = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11))
                            .filter(pick => {
                              const player = getPlayerById(pick.element);
                              return player?.element_type === 1;
                            });
                          
                          return gks.length > 0 && (
                            <div className="flex justify-center gap-0.5">
                              {gks.map(pick => {
                                const player = getPlayerById(pick.element);
                                if (!player) return null;
                                const playerTeam = getPlayerTeam(player);
                                
                                const jerseyColor = getTeamJerseyColor(playerTeam?.id || 0);
                                const textColor = getTextColor(jerseyColor);
                                
                                return (
                                  <div key={pick.element} className="flex flex-col items-center w-[19.5%]" data-testid={`pitch-player-${player.id}`}>
                                    <div className="relative w-full">
                                      {/* Jersey-Shaped Card */}
                                      <svg viewBox="0 0 280 190" className="w-full drop-shadow-xl">
                                        <defs>
                                          <clipPath id={`jersey-clip-${player.id}`}>
                                            <path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" />
                                          </clipPath>
                                        </defs>
                                        
                                        {/* Jersey background */}
                                        <rect width="280" height="190" fill={jerseyColor} clipPath={`url(#jersey-clip-${player.id})`} />
                                        
                                        {/* Jersey outline with narrower shoulders aligned to upper body */}
                                        <path 
                                          d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" 
                                          fill="none" 
                                          stroke="rgba(0,0,0,0.15)" 
                                          strokeWidth="1.5"
                                        />
                                        
                                        {/* V-neck collar detail */}
                                        <path 
                                          d="M 90 10 L 100 18 L 110 25 L 120 29 Q 130 29 140 29 L 150 29 Q 160 29 170 25 L 180 18 L 190 10" 
                                          fill="none" 
                                          stroke="rgba(255,255,255,0.3)" 
                                          strokeWidth="1.5"
                                        />
                                        
                                        {/* Captain/Vice Captain Badge */}
                                        {pick.is_captain && (
                                          <g>
                                            <circle cx="75" cy="48" r="12" fill="#FCD34D" stroke="white" strokeWidth="2.5" />
                                            <text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">C</text>
                                          </g>
                                        )}
                                        {pick.is_vice_captain && (
                                          <g>
                                            <circle cx="75" cy="48" r="12" fill="#E5E7EB" stroke="#FCD34D" strokeWidth="2.5" />
                                            <text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">V</text>
                                          </g>
                                        )}
                                        
                                        {/* Dream Team Star Badge */}
                                        {player.in_dreamteam && (
                                          <g>
                                            <circle cx="205" cy="48" r="12" fill="#A855F7" stroke="white" strokeWidth="2.5" />
                                            <path d="M 205 39 L 207 45 L 213 45 L 208 49 L 210 55 L 205 51 L 200 55 L 202 49 L 197 45 L 203 45 Z" fill="white" />
                                          </g>
                                        )}
                                        
                                        {/* Team Name */}
                                        <text x="140" y="68" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>
                                          {playerTeam?.short_name || 'UNK'}
                                        </text>
                                        
                                        {/* Player Name */}
                                        <text x="140" y="100" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>
                                          {player.web_name}
                                        </text>
                                        
                                        {/* Points */}
                                        <text x="140" y="140" fontSize="27" fontWeight="bold" textAnchor="middle" fill={textColor}>
                                          {getPlayerDisplayPoints(player, playerTeam?.id || 0, pick.is_captain)}
                                        </text>
                                        
                                        {/* Next 3 Fixtures */}
                                        {getNextFixtures(playerTeam?.id || 0, 3).map((fixture, idx) => {
                                          const diffColor = fixture.difficulty <= 2 ? '#22C55E' : 
                                                          fixture.difficulty === 3 ? '#EAB308' : 
                                                          fixture.difficulty === 4 ? '#F97316' : '#EF4444';
                                          return (
                                            <g key={idx}>
                                              <rect 
                                                x={61 + (idx * 53)} 
                                                y="155" 
                                                width="50" 
                                                height="24" 
                                                rx="5" 
                                                fill={diffColor}
                                              />
                                              <text 
                                                x={86 + (idx * 53)} 
                                                y="170" 
                                                fontSize="14" 
                                                fontWeight="bold" 
                                                textAnchor="middle" 
                                                fill="white"
                                              >
                                                {fixture.opponent.substring(0, 3)}
                                              </text>
                                            </g>
                                          );
                                        })}
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Defenders */}
                        {(() => {
                          const defs = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11))
                            .filter(pick => {
                              const player = getPlayerById(pick.element);
                              return player?.element_type === 2;
                            });
                          
                          return defs.length > 0 && (
                            <div className="flex justify-center gap-0.5">
                              {defs.map(pick => {
                                const player = getPlayerById(pick.element);
                                if (!player) return null;
                                const playerTeam = getPlayerTeam(player);
                                
                                const jerseyColor = getTeamJerseyColor(playerTeam?.id || 0);
                                const textColor = getTextColor(jerseyColor);
                                
                                return (
                                  <div key={pick.element} className="flex flex-col items-center w-[19.5%]" data-testid={`pitch-player-${player.id}`}>
                                    <div className="relative w-full">
                                      <svg viewBox="0 0 280 190" className="w-full drop-shadow-xl">
                                        <defs><clipPath id={`jersey-clip-def-${player.id}`}><path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" /></clipPath></defs>
                                        <rect width="280" height="190" fill={jerseyColor} clipPath={`url(#jersey-clip-def-${player.id})`} />
                                        <path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                                        <path d="M 90 10 L 100 18 L 110 25 L 120 29 Q 130 29 140 29 L 150 29 Q 160 29 170 25 L 180 18 L 190 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                        {pick.is_captain && (<g><circle cx="75" cy="48" r="12" fill="#FCD34D" stroke="white" strokeWidth="2.5" /><text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">C</text></g>)}
                                        {pick.is_vice_captain && (<g><circle cx="75" cy="48" r="12" fill="#E5E7EB" stroke="#FCD34D" strokeWidth="2.5" /><text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">V</text></g>)}
                                        {player.in_dreamteam && (<g><circle cx="205" cy="48" r="12" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 205 39 L 207 45 L 213 45 L 208 49 L 210 55 L 205 51 L 200 55 L 202 49 L 197 45 L 203 45 Z" fill="white" /></g>)}
                                        <text x="140" y="68" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{playerTeam?.short_name || 'UNK'}</text>
                                        <text x="140" y="100" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name}</text>
                                        <text x="140" y="140" fontSize="27" fontWeight="bold" textAnchor="middle" fill={textColor}>{getPlayerDisplayPoints(player, playerTeam?.id || 0, pick.is_captain)}</text>
                                        {getNextFixtures(playerTeam?.id || 0, 3).map((fixture, idx) => {
                                          const diffColor = fixture.difficulty <= 2 ? '#22C55E' : fixture.difficulty === 3 ? '#EAB308' : fixture.difficulty === 4 ? '#F97316' : '#EF4444';
                                          return (<g key={idx}><rect x={61 + (idx * 53)} y="155" width="50" height="24" rx="5" fill={diffColor} /><text x={86 + (idx * 53)} y="170" fontSize="14" fontWeight="bold" textAnchor="middle" fill="white">{fixture.opponent.substring(0, 3)}</text></g>);
                                        })}
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Midfielders */}
                        {(() => {
                          const mids = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11))
                            .filter(pick => {
                              const player = getPlayerById(pick.element);
                              return player?.element_type === 3;
                            });
                          
                          return mids.length > 0 && (
                            <div className="flex justify-center gap-0.5">
                              {mids.map(pick => {
                                const player = getPlayerById(pick.element);
                                if (!player) return null;
                                const playerTeam = getPlayerTeam(player);
                                
                                const jerseyColor = getTeamJerseyColor(playerTeam?.id || 0);
                                const textColor = getTextColor(jerseyColor);
                                
                                return (
                                  <div key={pick.element} className="flex flex-col items-center w-[19.5%]" data-testid={`pitch-player-${player.id}`}>
                                    <div className="relative w-full">
                                      <svg viewBox="0 0 280 190" className="w-full drop-shadow-xl">
                                        <defs><clipPath id={`jersey-clip-mid-${player.id}`}><path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" /></clipPath></defs>
                                        <rect width="280" height="190" fill={jerseyColor} clipPath={`url(#jersey-clip-mid-${player.id})`} />
                                        <path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                                        <path d="M 90 10 L 100 18 L 110 25 L 120 29 Q 130 29 140 29 L 150 29 Q 160 29 170 25 L 180 18 L 190 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                        {pick.is_captain && (<g><circle cx="75" cy="48" r="12" fill="#FCD34D" stroke="white" strokeWidth="2.5" /><text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">C</text></g>)}
                                        {pick.is_vice_captain && (<g><circle cx="75" cy="48" r="12" fill="#E5E7EB" stroke="#FCD34D" strokeWidth="2.5" /><text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">V</text></g>)}
                                        {player.in_dreamteam && (<g><circle cx="205" cy="48" r="12" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 205 39 L 207 45 L 213 45 L 208 49 L 210 55 L 205 51 L 200 55 L 202 49 L 197 45 L 203 45 Z" fill="white" /></g>)}
                                        <text x="140" y="68" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{playerTeam?.short_name || 'UNK'}</text>
                                        <text x="140" y="100" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name}</text>
                                        <text x="140" y="140" fontSize="27" fontWeight="bold" textAnchor="middle" fill={textColor}>{getPlayerDisplayPoints(player, playerTeam?.id || 0, pick.is_captain)}</text>
                                        {getNextFixtures(playerTeam?.id || 0, 3).map((fixture, idx) => {
                                          const diffColor = fixture.difficulty <= 2 ? '#22C55E' : fixture.difficulty === 3 ? '#EAB308' : fixture.difficulty === 4 ? '#F97316' : '#EF4444';
                                          return (<g key={idx}><rect x={61 + (idx * 53)} y="155" width="50" height="24" rx="5" fill={diffColor} /><text x={86 + (idx * 53)} y="170" fontSize="14" fontWeight="bold" textAnchor="middle" fill="white">{fixture.opponent.substring(0, 3)}</text></g>);
                                        })}
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Forwards */}
                        {(() => {
                          const fwds = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11))
                            .filter(pick => {
                              const player = getPlayerById(pick.element);
                              return player?.element_type === 4;
                            });
                          
                          return fwds.length > 0 && (
                            <div className="flex justify-center gap-0.5">
                              {fwds.map(pick => {
                                const player = getPlayerById(pick.element);
                                if (!player) return null;
                                const playerTeam = getPlayerTeam(player);
                                
                                const jerseyColor = getTeamJerseyColor(playerTeam?.id || 0);
                                const textColor = getTextColor(jerseyColor);
                                
                                return (
                                  <div key={pick.element} className="flex flex-col items-center w-[19.5%]" data-testid={`pitch-player-${player.id}`}>
                                    <div className="relative w-full">
                                      <svg viewBox="0 0 280 190" className="w-full drop-shadow-xl">
                                        <defs><clipPath id={`jersey-clip-fwd-${player.id}`}><path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" /></clipPath></defs>
                                        <rect width="280" height="190" fill={jerseyColor} clipPath={`url(#jersey-clip-fwd-${player.id})`} />
                                        <path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                                        <path d="M 90 10 L 100 18 L 110 25 L 120 29 Q 130 29 140 29 L 150 29 Q 160 29 170 25 L 180 18 L 190 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                        {pick.is_captain && (<g><circle cx="75" cy="48" r="12" fill="#FCD34D" stroke="white" strokeWidth="2.5" /><text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">C</text></g>)}
                                        {pick.is_vice_captain && (<g><circle cx="75" cy="48" r="12" fill="#E5E7EB" stroke="#FCD34D" strokeWidth="2.5" /><text x="75" y="54" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">V</text></g>)}
                                        {player.in_dreamteam && (<g><circle cx="205" cy="48" r="12" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 205 39 L 207 45 L 213 45 L 208 49 L 210 55 L 205 51 L 200 55 L 202 49 L 197 45 L 203 45 Z" fill="white" /></g>)}
                                        <text x="140" y="68" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{playerTeam?.short_name || 'UNK'}</text>
                                        <text x="140" y="100" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name}</text>
                                        <text x="140" y="140" fontSize="27" fontWeight="bold" textAnchor="middle" fill={textColor}>{getPlayerDisplayPoints(player, playerTeam?.id || 0, pick.is_captain)}</text>
                                        {getNextFixtures(playerTeam?.id || 0, 3).map((fixture, idx) => {
                                          const diffColor = fixture.difficulty <= 2 ? '#22C55E' : fixture.difficulty === 3 ? '#EAB308' : fixture.difficulty === 4 ? '#F97316' : '#EF4444';
                                          return (<g key={idx}><rect x={61 + (idx * 53)} y="155" width="50" height="24" rx="5" fill={diffColor} /><text x={86 + (idx * 53)} y="170" fontSize="14" fontWeight="bold" textAnchor="middle" fill="white">{fixture.opponent.substring(0, 3)}</text></g>);
                                        })}
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bench Display */}
                      <div className="mt-6 pt-6 border-t-2 border-white/30">
                        <h3 className="text-white font-bold text-center mb-4">BENCH</h3>
                        <div className="flex justify-center gap-0.5">
                          {sortBenchPlayers(teamData.picks.filter(pick => pick.position > 11)).map((pick, index) => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            const playerTeam = getPlayerTeam(player);
                            
                            const jerseyColor = getTeamJerseyColor(playerTeam?.id || 0);
                            const textColor = getTextColor(jerseyColor);
                            
                            return (
                              <div key={pick.element} className="flex flex-col items-center w-[19.5%] opacity-90" data-testid={`pitch-bench-${player.id}`}>
                                <div className="relative w-full">
                                  <svg viewBox="0 0 280 190" className="w-full drop-shadow-lg">
                                    <defs><clipPath id={`jersey-clip-bench-${player.id}`}><path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" /></clipPath></defs>
                                    <rect width="280" height="190" fill={jerseyColor} clipPath={`url(#jersey-clip-bench-${player.id})`} />
                                    <path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                                    <path d="M 90 10 L 100 18 L 110 25 L 120 29 Q 130 29 140 29 L 150 29 Q 160 29 170 25 L 180 18 L 190 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                    {player.in_dreamteam && (<g><circle cx="205" cy="48" r="12" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 205 39 L 207 45 L 213 45 L 208 49 L 210 55 L 205 51 L 200 55 L 202 49 L 197 45 L 203 45 Z" fill="white" /></g>)}
                                    <text x="140" y="68" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{playerTeam?.short_name || 'UNK'}</text>
                                    <text x="140" y="100" fontSize="22" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name}</text>
                                    <text x="140" y="140" fontSize="27" fontWeight="bold" textAnchor="middle" fill={textColor}>{getPlayerDisplayPoints(player, playerTeam?.id || 0, false)}</text>
                                    {getNextFixtures(playerTeam?.id || 0, 3).map((fixture, idx) => {
                                      const diffColor = fixture.difficulty <= 2 ? '#22C55E' : fixture.difficulty === 3 ? '#EAB308' : fixture.difficulty === 4 ? '#F97316' : '#EF4444';
                                      return (<g key={idx}><rect x={61 + (idx * 53)} y="155" width="50" height="24" rx="5" fill={diffColor} /><text x={86 + (idx * 53)} y="170" fontSize="14" fontWeight="bold" textAnchor="middle" fill="white">{fixture.opponent.substring(0, 3)}</text></g>);
                                    })}
                                  </svg>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* List View - Starting XI and Bench - Mobile Optimized */}
                  {teamView === "list" && (
                  <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
                    {/* Starting XI */}
                    <Card className="bg-white shadow-lg border border-gray-200">
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg p-3 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <Users className="h-4 w-4 md:h-5 md:w-5" />
                          Starting XI
                        </CardTitle>
                        <CardDescription className="text-emerald-50 text-xs md:text-sm">
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
                                <div className={`px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold uppercase tracking-wide ${positionColors[positionType as keyof typeof positionColors]} border-l-2 md:border-l-4`}>
                                  {positionName}s ({playersInPosition.length})
                                </div>
                                {playersInPosition.map((pick, index) => {
                                  const player = getPlayerById(pick.element);
                                  if (!player) return null;

                                  return (
                                    <div 
                                      key={pick.element} 
                                      className={`flex items-start md:items-center justify-between p-2 md:p-4 border-l-2 md:border-l-4 hover:bg-gray-50 transition-colors ${
                                        pick.is_captain ? 'bg-amber-50 border-amber-400' : 
                                        pick.is_vice_captain ? 'bg-blue-50 border-blue-400' : 
                                        'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-start md:items-center gap-2 md:gap-3 flex-1 min-w-0">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 text-xs md:text-base truncate">{player.web_name}</span>
                                            {pick.is_captain && (
                                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1">C</Badge>
                                            )}
                                            {pick.is_vice_captain && (
                                              <Badge variant="outline" className="border-blue-300 text-blue-700 text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1">VC</Badge>
                                            )}
                                          </div>
                                          <div className="space-y-1 md:space-y-2 mt-1 md:mt-2">
                                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                              <span className="text-xs md:text-sm font-medium text-gray-700">{getTeamName(player)}</span>
                                              <span className="text-[10px] md:text-xs text-gray-500">Form: {player.form}</span>
                                            </div>
                                            
                                            {/* Next 3 fixtures - Simplified on mobile */}
                                            <div className="space-y-0.5 md:space-y-1">
                                              <div className="text-[10px] md:text-xs font-medium text-gray-600 hidden md:block">Next 3 fixtures:</div>
                                              <div className="flex gap-0.5 md:gap-1 flex-wrap">
                                                {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).map((fixture, idx) => (
                                                  <div 
                                                    key={idx}
                                                    className={`flex items-center gap-0.5 md:gap-1 px-1 md:px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium ${getDifficultyColor(fixture.difficulty)} whitespace-nowrap`}
                                                    title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                                  >
                                                    <span className="truncate max-w-[30px] md:max-w-[40px]">{fixture.opponent}</span>
                                                    <span className="text-[9px] md:text-xs opacity-75">({fixture.isHome ? 'H' : 'A'})</span>
                                                  </div>
                                                ))}
                                                {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).length === 0 && (
                                                  <span className="text-[10px] md:text-xs text-gray-400">No fixtures</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right space-y-0.5 md:space-y-1 ml-2 flex-shrink-0">
                                        <p className="font-semibold text-green-600 text-xs md:text-base">{formatPrice(player.now_cost)}</p>
                                        {pick.is_captain ? (
                                          <div className="space-y-0.5 md:space-y-1">
                                            <p className="text-xs md:text-sm font-semibold text-amber-600">
                                              {(player.event_points || 0) * 2} pts
                                            </p>
                                            <p className="text-[10px] md:text-xs text-gray-500 hidden md:block">
                                              ({player.event_points || 0}×2)
                                            </p>
                                          </div>
                                        ) : (
                                          <p className="text-xs md:text-sm text-gray-600">{player.event_points || 0} pts</p>
                                        )}
                                        <div className="text-[10px] md:text-xs text-gray-500">
                                          <div>{parseFloat(player.selected_by_percent).toFixed(1)}%</div>
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

                    {/* Bench - Mobile Optimized */}
                    <Card className="bg-white shadow-lg border border-gray-200">
                      <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg p-3 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <Users className="h-4 w-4 md:h-5 md:w-5" />
                          Bench
                        </CardTitle>
                        <CardDescription className="text-gray-100 text-xs md:text-sm">
                          Substitute players
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="space-y-0">
                          {sortBenchPlayers(teamData.picks.filter(pick => pick.position > 11)).map((pick, index) => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;

                            return (
                              <div 
                                key={pick.element} 
                                className="flex items-start md:items-center justify-between p-2 md:p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start md:items-center gap-2 md:gap-3 flex-1 min-w-0">
                                  <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-200 rounded-full flex items-center justify-center text-[10px] md:text-xs font-medium text-gray-600 flex-shrink-0">
                                    {pick.position - 11}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-800 text-xs md:text-base truncate">{player.web_name}</span>
                                      <Badge variant="outline" className="text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1">{getPositionName(player.element_type)}</Badge>
                                    </div>
                                    <div className="space-y-1 md:space-y-2 mt-1 md:mt-2">
                                      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                        <span className="text-xs md:text-sm font-medium text-gray-700">{getTeamName(player)}</span>
                                        <span className="text-[10px] md:text-xs text-gray-500">Form: {player.form}</span>
                                      </div>
                                      
                                      {/* Next 3 fixtures - Simplified on mobile */}
                                      <div className="space-y-0.5 md:space-y-1">
                                        <div className="text-[10px] md:text-xs font-medium text-gray-600 hidden md:block">Next 3 fixtures:</div>
                                        <div className="flex gap-0.5 md:gap-1 flex-wrap">
                                          {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).map((fixture, idx) => (
                                            <div 
                                              key={idx}
                                              className={`flex items-center gap-0.5 md:gap-1 px-1 md:px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium ${getDifficultyColor(fixture.difficulty)} whitespace-nowrap`}
                                              title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                            >
                                              <span className="truncate max-w-[30px] md:max-w-[40px]">{fixture.opponent}</span>
                                              <span className="text-[9px] md:text-xs opacity-75">({fixture.isHome ? 'H' : 'A'})</span>
                                            </div>
                                          ))}
                                          {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).length === 0 && (
                                            <span className="text-[10px] md:text-xs text-gray-400">No fixtures</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right space-y-0.5 md:space-y-1 ml-2 flex-shrink-0">
                                  <p className="font-semibold text-green-600 text-xs md:text-base">{formatPrice(player.now_cost)}</p>
                                  <p className="text-xs md:text-sm text-gray-600">{player.total_points} pts</p>
                                  <div className="text-[10px] md:text-xs text-gray-500">
                                    <div>{parseFloat(player.selected_by_percent).toFixed(1)}%</div>
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
                </>
              )}
              
              {!teamData && searchedId && (
                <div className="text-center py-8">
                  <div className="text-lg">Loading team data...</div>
                </div>
              )}
            </TabsContent>

              {/* Transfers Tab */}
              <TabsContent value="transfers" className="fpl-section-spacing mt-8">
                {transfersData && (
                  <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="fpl-heading-card flex items-center gap-2 text-orange-800">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <ArrowLeftRight className="h-5 w-5 text-orange-600" />
                        </div>
                        Transfer History
                      </CardTitle>
                      <CardDescription className="text-orange-700">
                        All transfers made this season with player prices and gameweek details
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {transfersData && transfersData.length > 0 ? (
                        <div className="space-y-3">
                          {transfersData
                            .slice()
                            .sort((a, b) => {
                              // Sort by timestamp (most recent first), then by gameweek (descending)
                              const timeA = new Date(a.time).getTime();
                              const timeB = new Date(b.time).getTime();
                              if (timeB !== timeA) return timeB - timeA;
                              return b.event - a.event;
                            })
                            .map((transfer, index) => {
                            const playerIn = bootstrapData?.elements.find(p => p.id === transfer.element_in);
                            const playerOut = bootstrapData?.elements.find(p => p.id === transfer.element_out);
                            
                            return (
                              <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-white/70 rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-200 gap-3">
                                <div className="flex-1">
                                  <div className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Gameweek {transfer.event}</div>
                                  
                                  {/* Transfer Details */}
                                  <div className="space-y-2">
                                    {/* Player In */}
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                        <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-green-800 text-sm sm:text-base truncate">
                                            {playerIn ? playerIn.web_name : `Player ${transfer.element_in}`}
                                          </span>
                                          <Badge className="bg-green-100 text-green-800 text-xs shrink-0">
                                            {formatPrice(transfer.element_in_cost)}
                                          </Badge>
                                        </div>
                                        {playerIn && (
                                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                                            {getTeamName(playerIn)} • {getPositionName(playerIn.element_type)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Player Out */}
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                        <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-red-800 text-sm sm:text-base truncate">
                                            {playerOut ? playerOut.web_name : `Player ${transfer.element_out}`}
                                          </span>
                                          <Badge variant="outline" className="border-red-200 text-red-800 text-xs shrink-0">
                                            {formatPrice(transfer.element_out_cost)}
                                          </Badge>
                                        </div>
                                        {playerOut && (
                                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                                            {getTeamName(playerOut)} • {getPositionName(playerOut.element_type)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex sm:flex-col justify-between sm:text-right sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0">
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    {new Date(transfer.time).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(transfer.time).toLocaleTimeString()}
                                  </div>
                                  {/* Net amount */}
                                  <div className={`text-sm font-medium mt-1 ${
                                    transfer.element_out_cost - transfer.element_in_cost > 0 
                                      ? 'text-green-600' 
                                      : transfer.element_out_cost - transfer.element_in_cost < 0 
                                      ? 'text-red-600' 
                                      : 'text-gray-600'
                                  }`}>
                                    {transfer.element_out_cost - transfer.element_in_cost > 0 ? '+' : ''}
                                    {formatPrice(transfer.element_out_cost - transfer.element_in_cost)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="p-4 bg-orange-100 rounded-full w-fit mx-auto mb-4">
                            <ArrowLeftRight className="h-8 w-8 text-orange-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Transfers Yet</h3>
                          <p className="text-gray-600">
                            No transfers have been made this season. Your transfer history will appear here once you make transfers.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {!transfersData && searchedId && (
                  <div className="text-center py-8">
                    <div className="text-lg">Loading transfer data...</div>
                  </div>
                )}
              </TabsContent>

              {/* Chips Tab */}
              <TabsContent value="chips" className="fpl-section-spacing mt-8">
                <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Chips Used
                    </CardTitle>
                    <CardDescription>Special chips played this season</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historyData?.chips && historyData.chips.length > 0 ? (
                      <div className="space-y-2">
                        {historyData.chips.map((chip, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-white/70">
                            <Badge variant="outline" className="capitalize">{chip.name.replace('_', ' ')}</Badge>
                            <span className="text-sm text-gray-600">Gameweek {chip.event}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {new Date(chip.time).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="p-4 bg-amber-100 rounded-full w-fit mx-auto mb-4">
                          <Star className="h-8 w-8 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Chips Used Yet</h3>
                        <p className="text-gray-600">No chips used yet this season</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="fpl-section-spacing mt-8">
                {historyData && (
                  <>
                    {/* Gameweek History */}
                    {historyData?.current && historyData.current.length > 0 && (
                      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg">
                        <CardHeader>
                          <CardTitle className="fpl-heading-card flex items-center gap-2 text-emerald-800">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                              <Activity className="h-5 w-5 text-emerald-600" />
                            </div>
                            Gameweek History
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {historyData.current.slice().reverse().map((gw) => (
                              <div key={gw.event} className="flex items-center justify-between p-3 sm:p-4 bg-white/70 rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-200 gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="text-base sm:text-lg font-semibold text-gray-800">Gameweek {gw.event}</div>
                                  <div className="text-xs sm:text-sm text-gray-600 truncate">
                                    {gw.event_transfers || 0} transfers • {formatPrice(gw.bank || 0)} bank
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-lg sm:text-xl font-bold text-emerald-700">{gw.points || 0} pts</div>
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    Rank: {formatRank(gw.overall_rank || 0)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Season History */}
                    {historyData?.past && historyData.past.length > 0 && (
                      <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
                        <CardHeader>
                          <CardTitle className="fpl-heading-card flex items-center gap-2 text-indigo-800">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <BarChart3 className="h-5 w-5 text-indigo-600" />
                            </div>
                            Season History
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {historyData.past.slice().reverse().map((season, index) => (
                              <div key={index} className="flex items-center justify-between p-4 bg-white/70 rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="text-lg font-semibold text-gray-800">{season.season_name}</div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-indigo-700">{season.total_points.toLocaleString()} pts</div>
                                    <div className="text-sm text-gray-600">
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
                </>
              )}
            </TabsContent>

            {/* Chips Tab */}
            <TabsContent value="chips" className="fpl-section-spacing mt-8">
              {historyData && (
                <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="fpl-heading-card flex items-center gap-2 text-amber-800">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Star className="h-5 w-5 text-amber-600" />
                      </div>
                      Chip Usage Summary
                    </CardTitle>
                    <CardDescription>
                      Complete overview of FPL chip usage for this season
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-2/5">Chip & Description</TableHead>
                          <TableHead className="text-center">Total Available</TableHead>
                          <TableHead className="text-center">Used</TableHead>
                          <TableHead className="text-center">Remaining</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const usedChips = historyData?.chips?.map((chip: any) => chip.name) || [];
                          const allChips = [
                            { 
                              name: 'Wildcard', 
                              apiNames: ['wildcard'], 
                              description: 'Transfer entire squad for free', 
                              maxUses: 2 
                            },
                            { 
                              name: 'Triple Captain', 
                              apiNames: ['3xc'], 
                              description: 'Captain gets 3x points instead of 2x', 
                              maxUses: 2 
                            },
                            { 
                              name: 'Bench Boost', 
                              apiNames: ['bboost'], 
                              description: 'Points from bench players count', 
                              maxUses: 2 
                            },
                            { 
                              name: 'Free Hit', 
                              apiNames: ['freehit'], 
                              description: 'Make unlimited transfers for one gameweek', 
                              maxUses: 2 
                            }
                          ];

                          return allChips.map((chip, idx) => {
                            const usedChipsDetails = historyData?.chips?.filter((usedChip: any) => 
                              chip.apiNames.includes(usedChip.name)
                            ) || [];
                            const usedCount = usedChipsDetails.length;
                            const remainingCount = chip.maxUses - usedCount;
                            
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  <div>
                                    <p className="font-semibold text-gray-900">{chip.name}</p>
                                    <p className="text-sm text-gray-600">{chip.description}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="font-semibold">
                                    {chip.maxUses}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {usedCount > 0 ? (
                                    <div className="space-y-1">
                                      {usedChipsDetails.map((usedChip: any, chipIdx: number) => (
                                        <div key={chipIdx} className="text-sm">
                                          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 mb-1">
                                            GW{usedChip.event}
                                          </Badge>
                                          <p className="text-xs text-gray-600">
                                            {new Date(usedChip.time).toLocaleDateString()}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-500">
                                      0
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    className={remainingCount > 0 ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-500"}
                                  >
                                    {remainingCount}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
              
              {!historyData && searchedId && (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              )}
            </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Initial State */}
        {!searchedId && (
          <Card className="max-w-2xl mx-auto border-0 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardContent className="text-center py-12">
              <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-6">
                <Trophy className="h-12 w-12 text-purple-600" />
              </div>
              <h2 className="fpl-heading-card mb-4">Enter Your Manager ID</h2>
              <div className="fpl-text-body mb-4 space-y-3">
                <p className="font-medium">To find your Manager ID, follow these steps:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Go to fantasy.premierleague.com and sign in to your account.</li>
                  <li>Click on the Points tab.</li>
                  <li>Check the URL in your browser's address bar. Your Manager ID is the number after "entry". For example, in https://fantasy.premierleague.com/entry/123456/event/3, the Manager ID is 123456.</li>
                </ol>
                <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                  <p className="font-medium text-yellow-800">Note:</p>
                  <p className="text-yellow-700">You cannot find your Manager ID directly in the official FPL mobile app. You'll need to use a web browser (e.g., Chrome or Safari) on your mobile device or a computer.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
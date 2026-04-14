import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerPopupDetails } from "@/components/player-popup-details";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeftRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Clock,
  Wallet,
  Zap,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { FplConnectDialog } from "@/components/fpl-connect-dialog";
import { LoadingExperience } from "@/components/loading-experience";
import { extractManagerId } from "@/lib/manager-id-utils";
import { calculateFreeTransfers } from "@/lib/free-transfers";
import { useAuth } from "@/hooks/useAuth";
import { ListView, type ListPlayer } from "@/components/list-view";
import { PitchView, type PitchPlayer, type PitchPlayerFixture } from "@/components/pitch-view";



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
  live_points?: number;
  live_minutes?: number;
  provisional_bonus?: number;
  provisional_cs_points?: number;
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
  entry_history?: {
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
  transfers?: {
    bank: number;
    limit: number;
    cost: number;
    status: string;
    made: number;
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

interface LiveLeagueEntry {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
  entry_name: string;
  live_points: number;
  live_total: number;
  live_rank: number;
  rank_change: number;
  auto_sub_points: number;
  bonus_points: number;
  players_played: number;
  captain_points: number;
  bench_points: number;
  active_chip: string | null;
}

interface LiveLeagueStandings {
  league: {
    id: number;
    name: string;
  };
  standings: {
    results: LiveLeagueEntry[];
  };
  current_gameweek: number;
  is_gameweek_finished: boolean;
  has_live_fixtures: boolean;
  has_provisional_bonus: boolean;
  last_updated: string;
}


interface Transfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
  isUpcoming?: boolean;
  isPending?: boolean;
  chipName?: string;
}

interface ManagerSearchResult {
  id: number;
  entry_name: string;
  player_first_name: string;
  player_last_name: string;
  player_region_name: string;
  summary_overall_rank: number | null;
}

export default function MyDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [searchMode, setSearchMode] = useState<"id" | "name">("id");
  const [nameSearchTeam, setNameSearchTeam] = useState("");
  const [nameSearchManager, setNameSearchManager] = useState("");
  const [nameSearchResults, setNameSearchResults] = useState<ManagerSearchResult[]>([]);
  const [isNameSearching, setIsNameSearching] = useState(false);
  const [nameSearchError, setNameSearchError] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });
  // Always default to pitch view
  const [teamView, setTeamView] = useState<"pitch" | "list">("pitch");
  const [nextTeamView, setNextTeamView] = useState<"pitch" | "list">("pitch");
  
  // Live standings state - tracks which league's live standings panel is open
  const [selectedLiveLeague, setSelectedLiveLeague] = useState<number | null>(null);
  
  // Player points breakdown modal state
  const [selectedPlayerForBreakdown, setSelectedPlayerForBreakdown] = useState<any | null>(null);
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [showGwLivePoints, setShowGwLivePoints] = useState(false);
  
  // Projection breakdown modal state (for nextteam tab)
  const [selectedPlayerForProjection, setSelectedPlayerForProjection] = useState<any | null>(null);
  const [showProjectionBreakdown, setShowProjectionBreakdown] = useState(false);
  const [optimisedPicks, setOptimisedPicks] = useState<TeamPick[] | null>(null);

  // Chip simulation state for GW Projections tab
  const [dashboardChip, setDashboardChip] = useState<string | null>(null);
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

  // Auto-load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId); // Auto-trigger data loading
    }
  }, []);

  // Name search handler — queries local manager_profiles DB via backend
  const handleNameSearch = async () => {
    const query = [nameSearchTeam.trim(), nameSearchManager.trim()].filter(Boolean).join(" ");
    if (query.length < 2) return;
    setIsNameSearching(true);
    setNameSearchError("");
    setNameSearchResults([]);
    try {
      const res = await fetch(`/api/managers/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNameSearchResults(data.map((m: any) => ({
            id: m.managerId,
            entry_name: m.entryName || "",
            player_first_name: m.playerFirstName || "",
            player_last_name: m.playerLastName || "",
            player_region_name: "",
            summary_overall_rank: m.overallRank || null,
          })));
          return;
        }
      }
      setNameSearchError("no_results");
    } catch {
      setNameSearchError("no_results");
    } finally {
      setIsNameSearching(false);
    }
  };

  // Data queries
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Check FPL connection status
  const { data: fplStatus } = useQuery<{
    connected: boolean;
    fplManagerId?: number;
    fplEmail?: string;
    needsReauth?: boolean;
  }>({
    queryKey: ["/api/fpl/status"],
    retry: false,
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

  // Fetch next gameweek's team data
  // Check if user is viewing their own team
  const isOwnTeam = user?.fplManagerId && searchedId && Number(searchedId) === user.fplManagerId;
  const nextGameweek = bootstrapData?.events.find(e => e.is_current)?.id ? Math.min((bootstrapData.events.find(e => e.is_current)?.id || 1) + 1, 38) : 2;
  
  // Use authenticated my-team endpoint for own team (shows current working team before confirmation)
  // Otherwise use public picks endpoint (only works after confirmation)
  const { data: nextTeamData, isLoading: isLoadingNextTeam, error: nextTeamError, refetch: refetchNextTeam } = useQuery<TeamData>({
    queryKey: isOwnTeam ? ["/api/fpl/my-team"] : [`/api/manager/${searchedId}/team?gameweek=${nextGameweek}`],
    enabled: !!searchedId && !!teamData && !!bootstrapData, // Only fetch if we have current team data and bootstrap data
    retry: false, // Don't auto-retry if FPL session expired
  });

  const { data: cachedPlayerProjections } = useQuery<any[]>({
    queryKey: ["/api/cached/player-total-points"],
    queryFn: async () => {
      const res = await fetch('/api/cached/player-total-points');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  const getProjectedPoints = (playerId: number, gameweek: number): number => {
    const playerData = cachedPlayerProjections?.find((p: any) => p.playerId === playerId);
    return playerData?.gameweekProjections?.[gameweek.toString()] || 0;
  };

  const optimizeLineup = (picks: TeamPick[], gameweek: number, activeChip?: string | null) => {
    const allPlayers = picks.map(pick => {
      const player = getPlayerById(pick.element);
      return {
        ...pick,
        element_type: player?.element_type || 0,
        proj: getProjectedPoints(pick.element, gameweek),
      };
    });

    const gks = allPlayers.filter(p => p.element_type === 1).sort((a, b) => b.proj - a.proj);
    const defs = allPlayers.filter(p => p.element_type === 2).sort((a, b) => b.proj - a.proj);
    const mids = allPlayers.filter(p => p.element_type === 3).sort((a, b) => b.proj - a.proj);
    const fwds = allPlayers.filter(p => p.element_type === 4).sort((a, b) => b.proj - a.proj);

    let bestTotal = -1;
    let bestStarting: typeof allPlayers = [];
    let bestBench: typeof allPlayers = [];

    for (const numDef of [3, 4, 5]) {
      for (const numMid of [2, 3, 4, 5]) {
        for (const numFwd of [1, 2, 3]) {
          if (numDef + numMid + numFwd !== 10) continue;
          if (numDef > defs.length || numMid > mids.length || numFwd > fwds.length) continue;

          const starting = [gks[0], ...defs.slice(0, numDef), ...mids.slice(0, numMid), ...fwds.slice(0, numFwd)];
          const total = starting.reduce((sum, p) => sum + p.proj, 0);

          if (total > bestTotal) {
            bestTotal = total;
            bestStarting = starting;
            const benchOutfield = [...defs.slice(numDef), ...mids.slice(numMid), ...fwds.slice(numFwd)];
            benchOutfield.sort((a, b) => b.proj - a.proj);
            bestBench = [gks[1], ...benchOutfield];
          }
        }
      }
    }

    const sorted = [...bestStarting].sort((a, b) => b.proj - a.proj);
    const captainId = sorted[0]?.element;
    const viceCaptainId = sorted[1]?.element;

    const newPicks: TeamPick[] = [];
    let pos = 1;
    for (const p of bestStarting) {
      const isCaptain = p.element === captainId;
      const isViceCaptain = p.element === viceCaptainId;
      newPicks.push({
        element: p.element,
        position: pos++,
        multiplier: isCaptain ? (activeChip === '3xc' ? 3 : 2) : 1,
        is_captain: isCaptain,
        is_vice_captain: isViceCaptain,
      });
    }
    for (const p of bestBench) {
      newPicks.push({
        element: p.element,
        position: pos++,
        multiplier: 0,
        is_captain: false,
        is_vice_captain: false,
      });
    }

    setOptimisedPicks(newPicks);
  };

  // Determine pre-chip baseline gameweek (for Free Hit/Wildcard comparison)
  // If Free Hit was used in GW13, we need GW12 team as the baseline
  const getPreChipGameweek = (): number | null => {
    if (!historyData?.chips) return null;
    const currentGW = bootstrapData?.events.find(e => e.is_current)?.id || 1;
    
    // Find if a Free Hit or Wildcard was used in the current/most recent GW
    const recentChip = historyData.chips.find(
      c => c.event === currentGW && (c.name === 'freehit' || c.name === 'wildcard')
    );
    
    if (recentChip) {
      // Return the gameweek before the chip was used
      return Math.max(1, recentChip.event - 1);
    }
    return null;
  };

  const preChipGameweek = getPreChipGameweek();

  // Fetch the pre-chip team (e.g., GW12 before Free Hit in GW13)
  const { data: preChipTeamData } = useQuery<TeamData>({
    queryKey: [`/api/manager/${searchedId}/team?gameweek=${preChipGameweek}`],
    enabled: Boolean(searchedId && preChipGameweek && isOwnTeam),
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

  // Live standings query for selected league
  const { data: liveStandingsData, isLoading: isLoadingLiveStandings, refetch: refetchLiveStandings } = useQuery<LiveLeagueStandings>({
    queryKey: [`/api/leagues-classic/${selectedLiveLeague}/live-standings`],
    enabled: !!selectedLiveLeague,
    refetchInterval: 30000, // Auto-refresh every 30 seconds during live matches
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Live gameweek data for player points breakdown
  const currentGameweek = bootstrapData?.events?.find((e: any) => e.is_current)?.id || 1;
  const { data: liveGameweekData } = useQuery<{ elements: Array<{ id: number; stats: any; explain: any[] }> }>({
    queryKey: [`/api/event/${currentGameweek}/live`],
    enabled: !!bootstrapData,
    staleTime: 60000,
  });

  // Use authenticated transfers endpoint for own team (includes upcoming GW transfers)
  // Otherwise use public transfers endpoint
  // Use separate cache keys to ensure proper refetch when auth state changes
  const { data: transfersData, isLoading: isLoadingTransfers, error: transfersError } = useQuery<Transfer[]>({
    queryKey: isOwnTeam 
      ? ["/api/fpl/my-transfers"] 
      : ["/api/manager", searchedId, "transfers"],
    enabled: !!searchedId && (isOwnTeam ? !!user : true),
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
  const formatChipName = (chipName: string): string => {
    const chipMap: Record<string, string> = {
      '3xc': 'Triple Captain',
      'bboost': 'Bench Boost',
      'freehit': 'Free Hit',
      'wildcard': 'Wildcard'
    };
    return chipMap[chipName] || chipName.replace('_', ' ');
  };

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
    const positionMap: Record<number, string> = {
      1: 'GKP',
      2: 'DEF',
      3: 'MID',
      4: 'FWD'
    };
    return positionMap[elementType] || "Unknown";
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

  // Get jersey image URL from FPL API based on team code and player position
  // FPL API provides team.code for jersey images (different from team.id)
  const getJerseyImageUrl = (teamCode: number, isGoalkeeper: boolean = false): string => {
    const suffix = isGoalkeeper ? '_1' : '';
    return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCode}${suffix}-110.webp`;
  };

  // Get team code for jersey images (FPL API uses 'code' field, not 'id')
  const getTeamCode = (team: any): number => {
    return team?.code || team?.id || 1;
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

  const getPlayerFixtureInfo = (playerId: number, gameweek: number): { opponent: string; isHome: boolean } | null => {
    const player = getPlayerById(playerId);
    if (!player || !fixturesData || !Array.isArray(fixturesData) || !bootstrapData) return null;
    const playerTeamId = player.team;
    const fixture = (fixturesData as any[]).find((f: any) => f.event === gameweek && (f.team_h === playerTeamId || f.team_a === playerTeamId));
    if (!fixture) return null;
    const isHome = fixture.team_h === playerTeamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponentTeam = bootstrapData.teams.find((t: any) => t.id === opponentId);
    return { opponent: opponentTeam?.short_name || 'Unknown', isHome };
  };

  const getPlayerFixtureInfos = (playerId: number, gameweek: number): { opponent: string; isHome: boolean }[] => {
    const player = getPlayerById(playerId);
    if (!player || !fixturesData || !Array.isArray(fixturesData) || !bootstrapData) return [];
    const playerTeamId = player.team;
    const fixtures = (fixturesData as any[]).filter((f: any) => f.event === gameweek && (f.team_h === playerTeamId || f.team_a === playerTeamId));
    return fixtures.map((fixture: any) => {
      const isHome = fixture.team_h === playerTeamId;
      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      const opponentTeam = bootstrapData.teams.find((t: any) => t.id === opponentId);
      return { opponent: opponentTeam?.short_name || 'Unknown', isHome };
    });
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

  const getNextGameweekDashboard = (): number => {
    const currentEvent = bootstrapData?.events.find(e => e.is_current);
    const currentId = currentEvent?.id || 1;
    // Return next gameweek, but cap at 38 (max gameweeks in a season)
    return Math.min(currentId + 1, 38);
  };

  const getUpcomingActiveChip = (): string | null => {
    if (!isOwnTeam) return null;
    if (nextTeamData?.active_chip) {
      const chipName = nextTeamData.active_chip.toLowerCase();
      // The FPL /api/my-team/ endpoint sometimes returns the CURRENT GW's active_chip
      // (e.g. Bench Boost played in GW32) rather than a genuinely upcoming chip.
      // Guard: if historyData already records this chip for the current GW, it has
      // already been played — don't surface it as an upcoming chip for the next GW.
      const currentGWId = bootstrapData?.events.find((e: any) => e.is_current)?.id;
      const alreadyPlayedThisGW = historyData?.chips?.some(
        (c: any) => c.name.toLowerCase() === chipName && c.event === currentGWId
      );
      if (alreadyPlayedThisGW) {
        // Fall through to simulated chip (likely null)
        return dashboardChip;
      }
      return chipName;
    }
    // Fall back to manually selected chip simulation
    return dashboardChip;
  };

  // Returns chips still available (not yet used in history)
  const getRemainingChipsForDashboard = (): string[] => {
    const limits: Record<string, number> = { wildcard: 2, '3xc': 2, bboost: 2, freehit: 2 };
    const used: Record<string, number> = {};
    (historyData?.chips || []).forEach((c: any) => {
      const key = c.name.toLowerCase();
      used[key] = (used[key] || 0) + 1;
    });
    return Object.keys(limits).filter(chip => (used[chip] || 0) < limits[chip]);
  };

  // Helper to check if unlimited transfers are active
  const isUnlimitedTransfersActive = (): boolean => {
    const chip = getUpcomingActiveChip();
    return chip === 'freehit' || chip === 'wildcard';
  };

  // Helper to get formatted chip name for display
  const getChipDisplayName = (chip: string | null): string => {
    if (!chip) return '';
    const chipLower = chip.toLowerCase();
    switch (chipLower) {
      case 'freehit': return 'FREE HIT';
      case 'wildcard': return 'WILDCARD';
      case 'bboost': return 'BENCH BOOST';
      case '3xc': return 'TRIPLE CAPTAIN';
      default: return chip.toUpperCase();
    }
  };

  // Helper to compute Free Hit/Wildcard "transfers" by comparing current team with next team
  const getUpcomingTransfers = (): Transfer[] => {
    const activeChip = getUpcomingActiveChip();
    
    // Only compute for Free Hit or Wildcard
    if (!activeChip || (activeChip !== 'freehit' && activeChip !== 'wildcard')) {
      return [];
    }
    
    // Additional safety check: if teamData has a chip but nextTeamData doesn't,
    // the chip was used in a past gameweek and has reverted - don't show synthetic transfers
    if (teamData?.active_chip && !nextTeamData?.active_chip) {
      console.log('Chip reverted - teamData has chip but nextTeamData does not, skipping synthetic transfers');
      return [];
    }
    
    // Need both current team and next team data
    if (!teamData?.picks || !nextTeamData?.picks || !bootstrapData) {
      return [];
    }
    
    const nextGw = getNextGameweekDashboard();
    const currentPlayerIds = new Set(teamData.picks.map(p => p.element));
    const nextPlayerIds = new Set(nextTeamData.picks.map(p => p.element));
    
    // Players transferred OUT (in current team but not in next team)
    const playersOut = teamData.picks.filter(p => !nextPlayerIds.has(p.element));
    
    // Players transferred IN (in next team but not in current team)
    const playersIn = nextTeamData.picks.filter(p => !currentPlayerIds.has(p.element));
    
    // Create synthetic transfer records - pair up IN and OUT players
    const syntheticTransfers: Transfer[] = [];
    const maxPairs = Math.max(playersIn.length, playersOut.length);
    
    for (let i = 0; i < maxPairs; i++) {
      const playerIn = playersIn[i];
      const playerOut = playersOut[i];
      
      if (playerIn && playerOut) {
        const playerInData = getPlayerById(playerIn.element);
        const playerOutData = getPlayerById(playerOut.element);
        
        syntheticTransfers.push({
          element_in: playerIn.element,
          element_in_cost: playerInData?.now_cost || 0,
          element_out: playerOut.element,
          element_out_cost: playerOutData?.now_cost || 0,
          event: nextGw,
          time: new Date().toISOString(),
          entry: 0, // Not needed for display
          isUpcoming: true, // Mark as upcoming transfer
          chipName: activeChip
        });
      } else if (playerIn && !playerOut) {
        // Extra player in (shouldn't happen with valid teams)
        const playerInData = getPlayerById(playerIn.element);
        syntheticTransfers.push({
          element_in: playerIn.element,
          element_in_cost: playerInData?.now_cost || 0,
          element_out: 0,
          element_out_cost: 0,
          event: nextGw,
          time: new Date().toISOString(),
          entry: 0,
          isUpcoming: true,
          chipName: activeChip
        });
      } else if (!playerIn && playerOut) {
        // Extra player out (shouldn't happen with valid teams)
        const playerOutData = getPlayerById(playerOut.element);
        syntheticTransfers.push({
          element_in: 0,
          element_in_cost: 0,
          element_out: playerOut.element,
          element_out_cost: playerOutData?.now_cost || 0,
          event: nextGw,
          time: new Date().toISOString(),
          entry: 0,
          isUpcoming: true,
          chipName: activeChip
        });
      }
    }
    
    return syntheticTransfers;
  };

  // Helper to get gameweeks where Free Hit was used (these transfers should be hidden from history)
  const getFreeHitGameweeks = (): Set<number> => {
    if (!historyData?.chips) return new Set();
    
    const freeHitGameweeks = historyData.chips
      .filter(c => c.name === 'freehit')
      .map(c => c.event);
    
    return new Set(freeHitGameweeks);
  };

  // Helper to get gameweeks where Free Hit OR Wildcard was used (exclude from transfer count)
  const getChipGameweeks = (): Set<number> => {
    if (!historyData?.chips) return new Set();
    
    const chipGameweeks = historyData.chips
      .filter(c => c.name === 'freehit' || c.name === 'wildcard')
      .map(c => c.event);
    
    return new Set(chipGameweeks);
  };

  // Calculate total transfers excluding Free Hit and Wildcard gameweeks
  const getTotalTransferCount = (): number => {
    if (!transfersData) return 0;
    const chipGWs = getChipGameweeks();
    return transfersData.filter(transfer => !chipGWs.has(transfer.event)).length;
  };

  // Helper to compute pending transfers for next gameweek
  // Compare current team with next team to find actual transfers made
  const getPendingTransfers = (): Transfer[] => {
    const nextGw = getNextGameweekDashboard();
    
    // Need nextTeamData and bootstrapData
    if (!nextTeamData?.picks || !bootstrapData) {
      return [];
    }
    
    // Get transfer count from nextTeamData - if 0, no pending transfers
    const transfersMade = nextTeamData.transfers?.made || 0;
    if (transfersMade === 0) {
      return [];
    }
    
    // Use preChipTeamData if available (post-Free Hit scenario), otherwise use teamData
    const baseTeam = preChipTeamData?.picks || teamData?.picks;
    if (!baseTeam) {
      return [];
    }
    
    const basePlayerIds = new Set(baseTeam.map(p => p.element));
    const nextPlayerIds = new Set(nextTeamData.picks.map(p => p.element));
    
    // Players transferred OUT (in base team but not in next team)
    const playersOut = baseTeam.filter(p => !nextPlayerIds.has(p.element));
    
    // Players transferred IN (in next team but not in base team)
    const playersIn = nextTeamData.picks.filter(p => !basePlayerIds.has(p.element));
    
    // Create pending transfer records - pair up IN and OUT players
    const pendingTransfers: Transfer[] = [];
    const maxPairs = Math.min(playersIn.length, playersOut.length, transfersMade);
    
    for (let i = 0; i < maxPairs; i++) {
      const playerIn = playersIn[i];
      const playerOut = playersOut[i];
      
      if (playerIn && playerOut) {
        const playerInData = getPlayerById(playerIn.element);
        const playerOutData = getPlayerById(playerOut.element);
        
        pendingTransfers.push({
          element_in: playerIn.element,
          element_in_cost: playerInData?.now_cost || 0,
          element_out: playerOut.element,
          element_out_cost: playerOutData?.now_cost || 0,
          event: nextGw,
          time: new Date().toISOString(),
          entry: 0,
          isPending: true
        });
      }
    }
    
    return pendingTransfers;
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

  const getNextGameweekFixture = (teamId: number) => {
    if (!fixturesData || !Array.isArray(fixturesData)) return null;
    
    const nextGW = getNextGameweekDashboard();
    
    const fixture = fixturesData.find((f: any) => 
      (f.team_h === teamId || f.team_a === teamId) && f.event === nextGW
    );
    
    if (!fixture) return null;
    
    const isHome = fixture.team_h === teamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponent = getTeamById(opponentId);
    
    return {
      opponent: opponent?.short_name || 'TBD',
      isHome
    };
  };

  const getNextGameweekFixtures = (teamId: number): { opponent: string; isHome: boolean }[] => {
    if (!fixturesData || !Array.isArray(fixturesData)) return [];
    const nextGW = getNextGameweekDashboard();
    const fixtures = (fixturesData as any[]).filter((f: any) =>
      (f.team_h === teamId || f.team_a === teamId) && f.event === nextGW
    );
    return fixtures.map((fixture: any) => {
      const isHome = fixture.team_h === teamId;
      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      const opponent = getTeamById(opponentId);
      return { opponent: opponent?.short_name || 'TBD', isHome };
    });
  };

  const getPlayerDisplayPoints = (player: any, teamId: number, captainMultiplier: number = 1) => {
    const points = player.event_points || 0;
    const multiplier = captainMultiplier;
    const displayPoints = points * multiplier;
    
    const currentFixture = getCurrentGameweekFixture(teamId);
    
    if (!currentFixture) return displayPoints.toString();
    
    if (!currentFixture.started || (!currentFixture.finished && points === 0)) {
      return `${currentFixture.opponent.substring(0, 3)} (${currentFixture.isHome ? 'H' : 'A'})`;
    }
    
    if (currentFixture.finished && points === 0) {
      return '-';
    }
    
    return displayPoints.toString();
  };

  const handlePlayerCardClick = (player: any, isCaptain: boolean = false, captainMultiplier: number = 1) => {
    const liveElement = liveGameweekData?.elements?.find((e: any) => e.id === player.id);
    setSelectedPlayerForBreakdown({
      ...player,
      liveStats: liveElement?.stats,
      explain: liveElement?.explain,
      isCaptain,
      captainMultiplier,
    });
    setShowPointsBreakdown(true);
  };

  const handleProjectionPlayerClick = (pitchPlayer: any) => {
    const fullPlayer = getPlayerById(pitchPlayer.element);
    if (!fullPlayer) return;
    const nextGW = getNextGameweekDashboard();
    const gwKey = nextGW.toString();
    const playerData = cachedPlayerProjections?.find((p: any) => p.playerId === pitchPlayer.element);
    const multiplier = pitchPlayer.multiplier || (pitchPlayer.is_captain ? 2 : 1);
    
    const components = [
      { label: 'Minutes', points: playerData?.pointsFromMinutes?.[gwKey] || 0, icon: '⏱️' },
      { label: 'Goals', points: playerData?.pointsFromGoals?.[gwKey] || 0, icon: '⚽' },
      { label: 'Assists', points: playerData?.pointsFromAssists?.[gwKey] || 0, icon: '🎯' },
      { label: 'Clean Sheets', points: playerData?.pointsFromCleanSheets?.[gwKey] || 0, icon: '🛡️' },
      { label: 'Goals Conceded', points: playerData?.pointsFromGoalsConceded?.[gwKey] || 0, icon: '🚪' },
      { label: 'Saves', points: playerData?.pointsFromSaves?.[gwKey] || 0, icon: '🧤' },
      { label: 'Bonus', points: playerData?.pointsFromBonus?.[gwKey] || 0, icon: '✨' },
      { label: 'Yellow Cards', points: playerData?.pointsFromYellowCards?.[gwKey] || 0, icon: '🟨' },
      { label: 'Red Cards', points: playerData?.pointsFromRedCards?.[gwKey] || 0, icon: '🟥' },
      { label: 'Defensive Contributions', points: playerData?.pointsFromDefensiveContributions?.[gwKey] || 0, icon: '🔒' },
    ];
    
    const fixtureDetailsForGW = playerData?.fixtureDetails?.[gwKey] || [];
    const totalProjected = playerData?.gameweekProjections?.[gwKey] || 0;
    
    setSelectedPlayerForProjection({
      ...fullPlayer,
      totalProjected,
      multiplier,
      isCaptain: pitchPlayer.is_captain,
      isViceCaptain: pitchPlayer.is_vice_captain,
      components,
      fixtureDetails: fixtureDetailsForGW,
      gameweek: nextGW,
    });
    setShowProjectionBreakdown(true);
  };

  const statIdentifierLabels: Record<string, string> = {
    'minutes': 'Minutes played',
    'goals_scored': 'Goals scored',
    'assists': 'Assists',
    'clean_sheets': 'Clean sheet',
    'goals_conceded': 'Goals conceded',
    'own_goals': 'Own goals',
    'penalties_saved': 'Penalties saved',
    'penalties_missed': 'Penalties missed',
    'yellow_cards': 'Yellow cards',
    'red_cards': 'Red cards',
    'saves': 'Saves',
    'bonus': 'Bonus',
    'bps': 'Bonus points system',
  };

  const getFixtureMatchLabel = (fixtureId: number, playerTeamId: number): { label: string; isHome: boolean } => {
    if (!Array.isArray(fixturesData) || !bootstrapData?.teams) return { label: `Fixture ${fixtureId}`, isHome: true };
    const fixture = (fixturesData as any[]).find((f: any) => f.id === fixtureId);
    if (!fixture) return { label: `Fixture ${fixtureId}`, isHome: true };
    const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
    const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
    const isHome = fixture.team_h === playerTeamId;
    const opponent = isHome ? awayTeam : homeTeam;
    const score = fixture.started ? `${fixture.team_h_score ?? 0}-${fixture.team_a_score ?? 0}` : '';
    const matchText = homeTeam && awayTeam
      ? `${homeTeam.short_name} ${score} ${awayTeam.short_name}`
      : `vs ${opponent?.short_name || 'TBD'}`;
    return { label: matchText, isHome };
  };

  const getPerFixtureBreakdown = (player: any) => {
    const explainEntries = player?.explain;
    if (!explainEntries || explainEntries.length === 0) return [];
    
    return explainEntries.map((ex: any) => {
      const fixtureId = ex.fixture;
      const { label, isHome } = getFixtureMatchLabel(fixtureId, player.team);
      const stats = (ex.stats || [])
        .filter((s: any) => s.points !== 0)
        .map((s: any) => ({
          label: statIdentifierLabels[s.identifier] || s.identifier.replace(/_/g, ' '),
          value: s.value,
          points: s.points,
          identifier: s.identifier,
        }));
      const totalPoints = (ex.stats || []).reduce((sum: number, s: any) => sum + (s.points || 0), 0);
      return { fixtureId, matchLabel: label, isHome, stats, totalPoints };
    });
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
    // Use the official FPL total from managerData for consistency (includes transfer costs)
    if (managerData?.summary_overall_points) {
      return managerData.summary_overall_points;
    }
    // Fallback to history calculation if managerData not available
    if (!historyData || !Array.isArray(historyData?.current)) return 0;
    // Sum points and subtract transfer costs for accurate total
    return historyData.current.reduce((total: number, gw: any) => 
      total + (gw.points || 0) - (gw.event_transfers_cost || 0), 0);
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

        {/* Manager Search Section - Compact */}
        <Card className="mb-3 sm:mb-4 border-0 bg-white/80 backdrop-blur-sm shadow-md">
          <CardContent className="p-2 sm:p-3 space-y-2">
            {/* Search mode toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => { setSearchMode("id"); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${searchMode === "id" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Manager ID
              </button>
              <button
                onClick={() => { setSearchMode("name"); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${searchMode === "name" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Name / Team
              </button>
            </div>

            {searchMode === "id" ? (
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Input
                  id="manager-id"
                  type="text"
                  placeholder="Enter Manager ID or FPL URL"
                  value={managerId}
                  onChange={(e) => {
                    const extractedId = extractManagerId(e.target.value);
                    setManagerId(extractedId);
                  }}
                  onKeyPress={handleKeyPress}
                  className="flex-1 h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  data-testid="input-manager-id"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSearch} 
                    disabled={!managerId.trim() || isLoading}
                    className="flex-1 sm:flex-none h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 text-sm"
                    data-testid="button-search-manager"
                  >
                    <Search className="h-4 w-4 mr-1" />
                    {isLoading ? "..." : "Search"}
                  </Button>
                  <FplConnectDialog />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-500 pl-1">FPL Team Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Maverick FC"
                      value={nameSearchTeam}
                      onChange={(e) => setNameSearchTeam(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (nameSearchTeam.trim() || nameSearchManager.trim()) && !isNameSearching) handleNameSearch(); }}
                      className="h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      data-testid="input-team-name"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-500 pl-1">Manager Name <span className="text-gray-400">(optional)</span></label>
                    <Input
                      type="text"
                      placeholder="e.g. John Smith"
                      value={nameSearchManager}
                      onChange={(e) => setNameSearchManager(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (nameSearchTeam.trim() || nameSearchManager.trim()) && !isNameSearching) handleNameSearch(); }}
                      className="h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      data-testid="input-manager-name"
                    />
                  </div>
                  <div className="flex gap-2 sm:self-end">
                    <Button
                      onClick={handleNameSearch}
                      disabled={(!nameSearchTeam.trim() && !nameSearchManager.trim()) || isNameSearching}
                      className="flex-1 sm:flex-none h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 text-sm"
                      data-testid="button-search-name"
                    >
                      {isNameSearching ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                      {isNameSearching ? "..." : "Search"}
                    </Button>
                    <FplConnectDialog />
                  </div>
                </div>
                {nameSearchError === "no_results" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-medium text-amber-800">No managers found</p>
                    <p className="text-amber-700 mt-1 text-xs">
                      Name-based search isn't always supported by the FPL public API.
                      You can find your Manager ID by visiting{" "}
                      <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        fantasy.premierleague.com
                      </a>{" "}
                      → My Team → check the number in your browser's URL bar after "entry/".
                    </p>
                  </div>
                )}
                {nameSearchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-64 overflow-y-auto">
                    {nameSearchResults.map((m) => (
                      <button
                        key={m.id}
                        className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-100 last:border-0 transition-colors"
                        onClick={() => {
                          const idStr = String(m.id);
                          setManagerId(idStr);
                          setSearchedId(idStr);
                          saveManagerIdToCache(idStr);
                          setSearchMode("id");
                          setNameSearchResults([]);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-sm text-gray-900">{m.player_first_name} {m.player_last_name}</span>
                            <span className="text-xs text-gray-500 ml-1">({m.entry_name})</span>
                          </div>
                          {m.summary_overall_rank && (
                            <span className="text-xs text-purple-600 whitespace-nowrap">Overall Rank #{m.summary_overall_rank.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {m.player_region_name ? `${m.player_region_name} • ` : ""}ID: {m.id}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert className="max-w-2xl mx-auto mb-6 sm:mb-8 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700 text-sm sm:text-base">
              {error instanceof Error && error.message.includes('session expired')
                ? `FPL session expired. Please reconnect to sync your latest GW ${getNextGameweekDashboard()} team.`
                : error instanceof Error 
                  ? error.message 
                  : "Failed to load manager data. Please check the Manager ID and try again."
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && searchedId && (
          <LoadingExperience
            variant="analysis"
            title="Loading Your FPL Dashboard"
            description="Gathering comprehensive manager data from multiple sources..."
            steps={[
              { text: "Fetching manager profile and history", delay: "0s" },
              { text: "Loading current team and transfers", delay: "0.2s" },
              { text: "Analyzing league standings", delay: "0.4s" },
            ]}
          />
        )}

        {/* Dashboard Content */}
        {managerData && !isLoading && (
          <div className="space-y-6 sm:space-y-8">
            {/* Manager Overview */}
            <Card className="border-0 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg">
              <CardHeader className="text-center p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gradient bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {managerData.player_first_name} {managerData.player_last_name}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-gray-600 mt-2">
                  {managerData.player_region_name} • Manager ID: {managerData.id}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Main Dashboard Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Dynamic grid based on whether next team data is available */}
              <TabsList className={`grid w-full ${teamData ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5'} gap-1 sm:gap-0 h-auto p-1 bg-white/70 backdrop-blur-sm border-0 shadow-lg`}>
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm min-h-[44px]"
                  data-testid="tab-overview"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="team" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm min-h-[44px]"
                  data-testid="tab-team"
                >
                  GW {getCurrentGameweekDashboard()} Points
                </TabsTrigger>
                {/* Next Gameweek Team Tab - only show if FPL is connected (teamData exists) */}
                {teamData && (
                  <TabsTrigger 
                    value="nextteam" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm min-h-[44px]"
                    data-testid="tab-nextteam"
                  >
                    GW {getNextGameweekDashboard()} Projections
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="transfers" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm min-h-[44px]"
                  data-testid="tab-transfers"
                >
                  Transfers
                </TabsTrigger>
                <TabsTrigger 
                  value="chips" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm min-h-[44px] col-span-1 sm:col-span-1"
                  data-testid="tab-chips"
                >
                  Chips
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm min-h-[44px] col-span-2 sm:col-span-1"
                  data-testid="tab-performance"
                >
                  Performance
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6 sm:mt-8">
                <div className="grid grid-cols-4 gap-1 sm:gap-6">
                  {/* Total Points */}
                  <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg hover:shadow-xl transition-all duration-300" data-testid="card-total-points">
                    <CardContent className="p-1.5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-sm font-medium text-blue-600 leading-tight sm:mb-2">Total Pts</p>
                          <p className="text-sm sm:text-2xl font-bold text-blue-900 truncate">{managerData.summary_overall_points.toLocaleString()}</p>
                        </div>
                        <div className="hidden sm:flex p-2.5 bg-blue-100 rounded-full flex-shrink-0">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Overall Rank */}
                  <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg hover:shadow-xl transition-all duration-300" data-testid="card-overall-rank">
                    <CardContent className="p-1.5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-sm font-medium text-amber-600 leading-tight sm:mb-2">Rank</p>
                          <p className="text-sm sm:text-2xl font-bold text-amber-900 truncate">{formatRank(managerData.summary_overall_rank)}</p>
                          {getRankChange() !== null && getRankChange() !== 0 && (
                            <div className={`hidden sm:flex items-center text-xs mt-1 ${getRankChange()! > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                        <div className="hidden sm:flex p-2.5 bg-amber-100 rounded-full flex-shrink-0">
                          <Trophy className="h-5 w-5 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bank */}
                  <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg hover:shadow-xl transition-all duration-300" data-testid="card-bank">
                    <CardContent className="p-1.5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-sm font-medium text-orange-600 leading-tight sm:mb-2">Bank</p>
                          <p className="text-sm sm:text-2xl font-bold text-orange-900 truncate">
                            {formatPrice(nextTeamData?.transfers?.bank || nextTeamData?.entry_history?.bank || teamData?.entry_history?.bank || 0)}
                          </p>
                          <p className="hidden sm:block text-xs text-orange-600 font-medium mt-1">
                            GW{nextTeamData ? getNextGameweekDashboard() : getCurrentGameweekDashboard()}
                          </p>
                        </div>
                        <div className="hidden sm:flex p-2.5 bg-orange-100 rounded-full flex-shrink-0">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Squad Value */}
                  <Card className="border-0 bg-gradient-to-br from-teal-50 to-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300" data-testid="card-squad-value">
                    <CardContent className="p-1.5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-sm font-medium text-teal-600 leading-tight sm:mb-2">Squad</p>
                          <p className="text-sm sm:text-2xl font-bold text-teal-900 truncate">
                            {formatPrice((() => {
                              const value = teamData?.entry_history?.value;
                              const bank = nextTeamData?.transfers?.bank ?? nextTeamData?.entry_history?.bank ?? teamData?.entry_history?.bank ?? 0;
                              if (value) return value - bank;
                              const picks = nextTeamData?.picks || teamData?.picks;
                              if (!picks) return 0;
                              return picks.reduce((total: number, pick: any) => {
                                const player = getPlayerById(pick.element);
                                return total + (player?.now_cost || 0);
                              }, 0);
                            })())}
                          </p>
                          <p className="hidden sm:block text-xs text-teal-600 font-medium mt-1">
                            GW{nextTeamData ? getNextGameweekDashboard() : getCurrentGameweekDashboard()}
                          </p>
                        </div>
                        <div className="hidden sm:flex p-2.5 bg-teal-100 rounded-full flex-shrink-0">
                          <TrendingUp className="h-5 w-5 text-teal-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              </div>

                {/* My Leagues */}
                {leaguesData && leaguesData.classic && (
                  <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg" data-testid="card-leagues">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-indigo-800 text-lg sm:text-xl">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        </div>
                        My Leagues
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                    {/* Table Header */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_110px_100px_90px_90px] gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-3 border-b pb-2">
                      <div>League</div>
                      <div className="text-center">Managers</div>
                      <div className="text-center">Rank</div>
                      <div className="text-center">Change</div>
                      <div className="text-center">Live Table</div>
                    </div>
                    <div className="space-y-2">
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
                          const isPrivateLeague = league.league_type === 'x' && league.id > 1000;
                          const isShowingLive = selectedLiveLeague === league.id;
                          
                          return (
                            <div key={league.id} className="space-y-1">
                              {/* Desktop: Single row with 5 columns */}
                              <div 
                                className="hidden sm:grid sm:grid-cols-[1fr_110px_100px_90px_90px] gap-4 items-center py-3 px-3 rounded-lg bg-white/60 border border-transparent hover:border-indigo-200 hover:bg-white hover:shadow-md cursor-pointer transition-all duration-200"
                                data-testid={`league-item-${league.id}`}
                                onClick={() => {
                                  setLocation(`/league-analysis/${league.id}/${encodeURIComponent(league.name)}/${searchedId}`);
                                }}
                              >
                                <div className="font-semibold text-gray-800 truncate" title={league.name}>
                                  {league.name}
                                </div>
                                <div className="text-center text-sm text-gray-600">
                                  {league.rank_count?.toLocaleString()}
                                </div>
                                <div className="text-center font-bold text-gray-800">
                                  #{league.entry_rank.toLocaleString()}
                                </div>
                                <div className="flex justify-center">
                                  {league.entry_last_rank && league.entry_last_rank !== league.entry_rank ? (
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
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </div>
                                <div className="flex justify-center">
                                  {isPrivateLeague ? (
                                    <Button
                                      variant={isShowingLive ? "default" : "outline"}
                                      size="sm"
                                      className={`h-6 px-2 text-xs ${isShowingLive ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isShowingLive) {
                                          setSelectedLiveLeague(null);
                                        } else {
                                          setSelectedLiveLeague(league.id);
                                        }
                                      }}
                                      data-testid={`live-points-btn-${league.id}`}
                                    >
                                      <Activity className="h-3 w-3" />
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Mobile: Compact row layout */}
                              <div 
                                className="sm:hidden flex items-center justify-between py-3 px-3 rounded-lg bg-white/60 border border-transparent hover:border-indigo-200 hover:bg-white hover:shadow-md cursor-pointer transition-all duration-200"
                                data-testid={`league-item-mobile-${league.id}`}
                                onClick={() => {
                                  setLocation(`/league-analysis/${league.id}/${encodeURIComponent(league.name)}/${searchedId}`);
                                }}
                              >
                                <div className="flex-1 min-w-0 mr-2">
                                  <div className="font-semibold text-gray-800 text-sm truncate" title={league.name}>
                                    {league.name}
                                  </div>
                                  <div className="text-xs text-gray-500">{league.rank_count?.toLocaleString()} managers</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="font-bold text-gray-800">#{league.entry_rank.toLocaleString()}</div>
                                    {league.entry_last_rank && league.entry_last_rank !== league.entry_rank && (
                                      <div className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                                        league.entry_last_rank > league.entry_rank 
                                          ? 'text-green-700' 
                                          : 'text-red-700'
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
                                  {isPrivateLeague && (
                                    <Button
                                      variant={isShowingLive ? "default" : "outline"}
                                      size="sm"
                                      className={`h-7 px-2 text-xs ${isShowingLive ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isShowingLive) {
                                          setSelectedLiveLeague(null);
                                        } else {
                                          setSelectedLiveLeague(league.id);
                                        }
                                      }}
                                      data-testid={`live-points-btn-mobile-${league.id}`}
                                    >
                                      <Activity className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Live Standings Panel */}
                              {isShowingLive && (
                                <div className="bg-white rounded-lg border border-green-200 p-3 mt-2 animate-in slide-in-from-top-2 duration-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Activity className="h-4 w-4 text-green-600 animate-pulse" />
                                      <span className="text-sm font-semibold text-green-800">Live Standings</span>
                                      {liveStandingsData && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          GW{liveStandingsData.current_gameweek}
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2"
                                      onClick={() => refetchLiveStandings()}
                                      disabled={isLoadingLiveStandings}
                                    >
                                      <RefreshCw className={`h-3 w-3 ${isLoadingLiveStandings ? 'animate-spin' : ''}`} />
                                    </Button>
                                  </div>
                                  
                                  {isLoadingLiveStandings ? (
                                    <div className="space-y-2">
                                      {[1, 2, 3, 4, 5].map(i => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                      ))}
                                    </div>
                                  ) : liveStandingsData ? (
                                    <div className="space-y-1 max-h-80 overflow-y-auto">
                                      {liveStandingsData.standings.results.map((entry, idx) => {
                                        const isCurrentManager = entry.entry.toString() === searchedId;
                                        return (
                                          <div 
                                            key={entry.entry}
                                            className={`flex items-center justify-between p-2 rounded-md text-sm ${
                                              isCurrentManager ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                                                entry.live_rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                                                entry.live_rank === 2 ? 'bg-gray-100 text-gray-800' :
                                                entry.live_rank === 3 ? 'bg-orange-100 text-orange-800' :
                                                'bg-blue-50 text-blue-800'
                                              }`}>
                                                {entry.live_rank}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="font-medium text-gray-800 truncate text-xs flex items-center gap-1">
                                                  {entry.player_name}
                                                  {entry.rank_change !== 0 && (
                                                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded ${
                                                      entry.rank_change > 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                                                    }`}>
                                                      {entry.rank_change > 0 ? (
                                                        <>
                                                          <ChevronUp className="h-2.5 w-2.5" />
                                                          <span>{entry.rank_change}</span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <ChevronDown className="h-2.5 w-2.5" />
                                                          <span>{Math.abs(entry.rank_change)}</span>
                                                        </>
                                                      )}
                                                    </span>
                                                  )}
                                                  {isCurrentManager && <Badge className="ml-1 bg-blue-600 text-[10px] py-0 px-1">You</Badge>}
                                                </div>
                                                <div className="text-[10px] text-gray-500 truncate">{entry.entry_name}</div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-semibold text-gray-800 text-xs">
                                                {entry.live_total?.toLocaleString()} pts
                                              </div>
                                              <div className="text-[10px] text-gray-500">
                                                GW {liveStandingsData.current_gameweek}: {entry.live_points}pts
                                                {entry.auto_sub_points > 0 && (
                                                  <span className="text-orange-600 ml-1">(+{entry.auto_sub_points} autosub)</span>
                                                )}
                                                {entry.bonus_points > 0 && liveStandingsData.has_provisional_bonus && (
                                                  <span className="text-green-600 ml-1">(+{entry.bonus_points} prov. bonus)</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center text-gray-500 text-sm py-4">
                                      Failed to load live standings
                                    </div>
                                  )}
                                  
                                  {liveStandingsData && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                                      Updated: {new Date(liveStandingsData.last_updated).toLocaleTimeString()}
                                      {liveStandingsData.is_gameweek_finished && (
                                        <span className="ml-2 text-amber-600">(GW Finished)</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>


            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6 mt-6 sm:mt-8">
              {teamData && (
                <>
                  {/* Team Overview Cards */}
                  <div className="grid gap-2 sm:gap-4 grid-cols-3 lg:grid-cols-6">
                    {/* 1. GW Points */}
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
                      <CardContent className="p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-green-700 mb-0.5">GW Points</p>
                        <p className="text-base sm:text-lg font-bold text-green-900">
                          {managerData?.summary_event_points || 0}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 2. GW Rank */}
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
                      <CardContent className="p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-purple-700 mb-0.5">GW Rank</p>
                        <p className="text-base sm:text-lg font-bold text-purple-900">
                          {formatRank(managerData?.summary_event_rank || 0)}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 3. Formation */}
                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm">
                      <CardContent className="p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-emerald-700 mb-0.5">Formation</p>
                        <p className="text-base sm:text-lg font-bold text-emerald-900">
                          {getFormationString()}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 4. Squad Value */}
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm">
                      <CardContent className="p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-orange-700 mb-0.5">Squad Value</p>
                        <p className="text-base sm:text-lg font-bold text-orange-900">
                          {formatPrice((teamData.entry_history?.value || 0) - (teamData.entry_history?.bank || 0))}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 5. Cash in Bank */}
                    <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-sm">
                      <CardContent className="p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-yellow-700 mb-0.5">Cash in Bank</p>
                        <p className="text-base sm:text-lg font-bold text-yellow-900">
                          {formatPrice(teamData.entry_history?.bank || 0)}
                        </p>
                      </CardContent>
                    </Card>

                    {/* 6. Transfers */}
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
                      <CardContent className="p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-blue-700 mb-0.5">Transfers</p>
                        <p className="text-base sm:text-lg font-bold text-blue-900">
                          {teamData.entry_history?.event_transfers || 0}/{(() => {
                            const transfersMade = teamData.entry_history?.event_transfers || 0;
                            const transferCost = teamData.entry_history?.event_transfers_cost || 0;
                            const freeTransfers = transfersMade - (transferCost / 4);
                            return freeTransfers;
                          })()}
                          {(teamData.entry_history?.event_transfers_cost || 0) > 0 && (
                            <span className="text-red-600 text-xs sm:text-sm ml-1">(-{teamData.entry_history.event_transfers_cost}pts)</span>
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pitch View — GW Points */}
                  {(() => {
                    const gwPointsPitchPlayers: PitchPlayer[] = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11)).map(pick => {
                      const player = getPlayerById(pick.element);
                      if (!player) return null;
                      const playerTeam = getPlayerTeam(player);
                      const fxs = getPlayerFixtureInfos(pick.element, currentGameweek);
                      const pts = (showGwLivePoints && pick.live_points !== undefined) ? pick.live_points : (player.event_points || 0);
                      return {
                        element: pick.element,
                        element_type: player.element_type,
                        position: pick.position,
                        is_captain: pick.is_captain,
                        is_vice_captain: pick.is_vice_captain,
                        multiplier: pick.multiplier,
                        web_name: player.web_name,
                        team_short_name: playerTeam?.short_name,
                        team_id: player.team,
                        team_code: getTeamCode(playerTeam),
                        event_points: pts,
                        live_minutes: pick.live_minutes ?? 0,
                        provisional_bonus: pick.provisional_bonus ?? 0,
                        provisional_cs_points: pick.provisional_cs_points ?? 0,
                        in_dreamteam: player.in_dreamteam,
                        points_display: showGwLivePoints ? (pts * (pick.multiplier || 1)).toString() : getPlayerDisplayPoints(player, playerTeam?.id || 0, pick.multiplier || 1),
                        fixtures: fxs,
                        status: player.status,
                        chance_of_playing: player.chance_of_playing_next_round,
                        news: player.news,
                      };
                    }).filter(Boolean) as PitchPlayer[];

                    const gwPointsBenchPlayers: PitchPlayer[] = sortBenchPlayers(teamData.picks.filter(pick => pick.position > 11)).map(pick => {
                      const player = getPlayerById(pick.element);
                      if (!player) return null;
                      const playerTeam = getPlayerTeam(player);
                      const fxs = getPlayerFixtureInfos(pick.element, currentGameweek);
                      const pts = (showGwLivePoints && pick.live_points !== undefined) ? pick.live_points : (player.event_points || 0);
                      return {
                        element: pick.element,
                        element_type: player.element_type,
                        position: pick.position,
                        is_captain: false,
                        is_vice_captain: false,
                        multiplier: pick.multiplier,
                        web_name: player.web_name,
                        team_short_name: playerTeam?.short_name,
                        team_id: player.team,
                        team_code: getTeamCode(playerTeam),
                        event_points: pts,
                        live_minutes: pick.live_minutes ?? 0,
                        provisional_bonus: pick.provisional_bonus ?? 0,
                        provisional_cs_points: pick.provisional_cs_points ?? 0,
                        in_dreamteam: player.in_dreamteam,
                        points_display: showGwLivePoints ? pts.toString() : getPlayerDisplayPoints(player, playerTeam?.id || 0, 1),
                        fixtures: fxs,
                        status: player.status,
                        chance_of_playing: player.chance_of_playing_next_round,
                        news: player.news,
                      };
                    }).filter(Boolean) as PitchPlayer[];

                    // Auto-subs derivation for GW Points live view
                    const gwFplAutoSubs = (teamData.automatic_subs || []).map(s => ({ element_in: s.element_in, element_out: s.element_out }));
                    const gwDerivedAutoSubs: Array<{ element_in: number; element_out: number }> = (() => {
                      if (gwFplAutoSubs.length > 0 || !showGwLivePoints) return [];
                      const result: Array<{ element_in: number; element_out: number }> = [];
                      const getFS = (teamId: number) => {
                        const f = Array.isArray(fixturesData) ? fixturesData.find((fx: any) => (fx.team_h === teamId || fx.team_a === teamId) && fx.event === currentGameweek) : null;
                        return { started: f?.started || false, finished: f?.finished || false };
                      };
                      const isDNP = (p: PitchPlayer) => {
                        const s = getFS(p.team_id || 0);
                        return (s.started || s.finished) && ((p as any).live_minutes ?? -1) === 0;
                      };
                      const benchSorted = [...gwPointsBenchPlayers].sort((a, b) => a.position - b.position);
                      const gkStarter = gwPointsPitchPlayers.find(p => p.element_type === 1);
                      if (gkStarter && isDNP(gkStarter)) {
                        const gkBench = benchSorted.find(p => p.element_type === 1 && ((p as any).live_minutes ?? 0) > 0);
                        if (gkBench) result.push({ element_in: gkBench.element, element_out: gkStarter.element });
                      }
                      const usedBench = new Set<number>();
                      let formation = gwPointsPitchPlayers.filter(p => p.element_type !== 1);
                      for (const dnp of gwPointsPitchPlayers.filter(p => p.element_type !== 1 && isDNP(p))) {
                        for (const bench of benchSorted.filter(p => p.element_type !== 1)) {
                          if (usedBench.has(bench.element) || ((bench as any).live_minutes ?? 0) === 0) continue;
                          const testF = formation.filter(p => p.element !== dnp.element).concat(bench);
                          if (testF.filter(p => p.element_type === 2).length >= 3 && testF.filter(p => p.element_type === 4).length >= 1) {
                            result.push({ element_in: bench.element, element_out: dnp.element });
                            usedBench.add(bench.element);
                            formation = testF;
                            break;
                          }
                        }
                      }
                      return result;
                    })();
                    const gwAutoSubs = [...gwFplAutoSubs, ...gwDerivedAutoSubs];

                    const gwEffectivePitch: PitchPlayer[] = showGwLivePoints && gwAutoSubs.length > 0
                      ? gwPointsPitchPlayers.map(p => {
                          const sub = gwAutoSubs.find(s => s.element_out === p.element);
                          if (sub) {
                            const subIn = gwPointsBenchPlayers.find(b => b.element === sub.element_in);
                            if (subIn) return { ...subIn, position: p.position, is_captain: p.is_captain, is_vice_captain: p.is_vice_captain, multiplier: p.multiplier, is_subbed_in: true } as PitchPlayer;
                          }
                          return p;
                        })
                      : gwPointsPitchPlayers;

                    const gwEffectiveBench: PitchPlayer[] = showGwLivePoints && gwAutoSubs.length > 0
                      ? gwPointsBenchPlayers.map(b => {
                          const sub = gwAutoSubs.find(s => s.element_in === b.element);
                          if (sub) {
                            const subbedOut = gwPointsPitchPlayers.find(p => p.element === sub.element_out);
                            if (subbedOut) return { ...subbedOut, position: b.position, is_subbed_out: true } as PitchPlayer;
                          }
                          return b;
                        })
                      : gwPointsBenchPlayers;

                    const { gwLiveTotal, gwHasProvisional } = (() => {
                      if (!showGwLivePoints) return { gwLiveTotal: null, gwHasProvisional: false };
                      let base = 0, provisional = 0;
                      for (const p of gwEffectivePitch) {
                        const mult = p.multiplier || 1;
                        base += (p.event_points || 0) * mult;
                        provisional += ((p.provisional_bonus || 0) + (p.provisional_cs_points || 0)) * mult;
                      }
                      return { gwLiveTotal: base + provisional, gwHasProvisional: provisional > 0 };
                    })();

                    return (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-600">GW Squad</span>
                          <Button
                            size="sm"
                            variant={showGwLivePoints ? "default" : "outline"}
                            className={showGwLivePoints ? "bg-green-600 hover:bg-green-700 text-white gap-1.5" : "gap-1.5"}
                            onClick={() => setShowGwLivePoints(v => !v)}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Live Points
                          </Button>
                        </div>
                        {showGwLivePoints && gwLiveTotal !== null && (
                          <div className="mb-3 flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <Zap className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-sm font-medium text-green-800">Live GW Score:</span>
                            <span className="text-lg font-bold text-green-700">{gwLiveTotal} pts</span>
                            <span className="text-xs text-green-600 ml-1">
                              {[
                                gwAutoSubs.length > 0 && `${gwAutoSubs.length} auto-sub${gwAutoSubs.length > 1 ? 's' : ''} applied`,
                                gwHasProvisional && 'inc. est. bonus & CS',
                              ].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        )}
                        <PitchView 
                          players={showGwLivePoints ? gwEffectivePitch : gwPointsPitchPlayers}
                          benchPlayers={showGwLivePoints ? gwEffectiveBench : gwPointsBenchPlayers}
                          activeChip={teamData.active_chip}
                          onPlayerClick={(player) => {
                            const fullPlayer = getPlayerById(player.element);
                            if (fullPlayer) handlePlayerCardClick(fullPlayer, player.is_captain, player.multiplier || 1);
                          }}
                        />
                      </>
                    );
                  })()}

                </>
              )}
              
              {!teamData && searchedId && (
                <div className="text-center py-8">
                  <div className="text-lg">Loading team data...</div>
                </div>
              )}
            </TabsContent>

            {/* Next Gameweek Team Tab */}
            <TabsContent value="nextteam" className="space-y-6 mt-3 sm:mt-4">
              {isLoadingNextTeam && fplStatus?.connected && (
                <div className="text-center py-8">
                  <div className="text-lg">Loading GW {getNextGameweekDashboard()} projections...</div>
                </div>
              )}
              
              {/* Show GW 21 team when FPL is NOT connected */}
              {!fplStatus?.connected && teamData && (
                <>
                  {/* Alert to connect FPL account */}
                  <Alert className="mb-4 border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800">
                      <div className="flex flex-col gap-2">
                        <div>
                          <strong>Showing GW {getNextGameweekDashboard()} fixtures and projections based on your GW {getCurrentGameweekDashboard()} team.</strong> Connect your FPL account to sync your latest GW {getNextGameweekDashboard()} team with any pending transfers.
                        </div>
                        <div className="mt-1">
                          <FplConnectDialog />
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  {/* Chip simulator for non-connected users */}
                  {isOwnTeam && (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Simulate chip:</span>
                      <Select
                        value={dashboardChip || "none"}
                        onValueChange={(val) => setDashboardChip(val === "none" ? null : val)}
                      >
                        <SelectTrigger className="h-8 text-xs w-44">
                          <SelectValue placeholder="No chip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No chip</SelectItem>
                          {getRemainingChipsForDashboard().map(chip => (
                            <SelectItem key={chip} value={chip}>
                              {getChipDisplayName(chip)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dashboardChip && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDashboardChip(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  {(() => {
                    const nextGW = getNextGameweekDashboard();
                    const activeChipVal = dashboardChip;
                    const normalizedPicks = teamData.picks.map(pick => ({
                      ...pick,
                      multiplier: pick.is_captain ? (activeChipVal === '3xc' ? 3 : 2) : (pick.position <= 11 ? 1 : 0)
                    }));
                    const activePicks = optimisedPicks || normalizedPicks;
                    const starting11 = activePicks.filter(pick => pick.position <= 11);
                    const bench = activePicks.filter(pick => pick.position > 11);
                    let totalStartingXPts = 0;
                    let totalBenchXPts = 0;
                    for (const pick of starting11) {
                      const proj = getProjectedPoints(pick.element, nextGW);
                      totalStartingXPts += proj * (pick.multiplier || 1);
                    }
                    for (const pick of bench) {
                      totalBenchXPts += getProjectedPoints(pick.element, nextGW);
                    }
                    if (activeChipVal === 'bboost') {
                      totalStartingXPts += totalBenchXPts;
                    }
                    return (
                      <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg mb-4">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-purple-200 rounded-full">
                                <Target className="h-6 w-6 text-purple-700" />
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-purple-700">GW {nextGW} Team Projected Points{optimisedPicks ? ' (Optimised)' : ''}</p>
                                <p className="text-2xl sm:text-3xl font-bold text-purple-900">{totalStartingXPts.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="text-right space-y-1.5">
                              {activeChipVal === 'bboost' ? (
                                <p className="text-xs text-purple-600">Incl. bench (BB)</p>
                              ) : (
                                <p className="text-xs text-purple-600">Bench: {totalBenchXPts.toFixed(2)}</p>
                              )}
                              <div className="flex gap-1.5 justify-end">
                                {optimisedPicks ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                                    onClick={() => setOptimisedPicks(null)}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Reset
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                                    onClick={() => optimizeLineup(normalizedPicks, nextGW, null)}
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Optimise Lineup
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
                    <CardHeader className="pt-3 px-4 pb-2 sm:pt-4 sm:px-6 sm:pb-3">
                      <CardTitle className="text-lg sm:text-xl text-amber-900">
                        GW {getNextGameweekDashboard()} Fixtures & Projections
                      </CardTitle>
                      <CardDescription className="text-amber-700 mt-1">
                        Showing GW {getNextGameweekDashboard()} fixtures and projected points for your {optimisedPicks ? 'optimised' : `GW ${getCurrentGameweekDashboard()}`} team.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <PitchView
                          players={(optimisedPicks || teamData.picks).filter(pick => pick.position <= 11).map(pick => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            const playerTeam = getPlayerTeam(player);
                            const fixtureInfos = getNextGameweekFixtures(playerTeam?.id || 0);
                            const nextGW = getNextGameweekDashboard();
                            const projected = getProjectedPoints(pick.element, nextGW);
                            const upcomingChip = getUpcomingActiveChip();
                            const multiplier = pick.is_captain ? (upcomingChip === '3xc' ? 3 : 2) : 1;
                            const displayPts = projected * multiplier;
                            return {
                              element: pick.element,
                              element_type: player.element_type,
                              position: pick.position,
                              is_captain: pick.is_captain,
                              is_vice_captain: pick.is_vice_captain,
                              multiplier: multiplier,
                              web_name: player.web_name,
                              team_short_name: playerTeam?.short_name,
                              team_id: player.team,
                              team_code: playerTeam?.code || playerTeam?.id || 0,
                              points_display: displayPts > 0 ? displayPts.toFixed(2) : '-',
                              fixtures: fixtureInfos as PitchPlayerFixture[],
                              status: player.status,
                              chance_of_playing: player.chance_of_playing_next_round,
                              news: player.news,
                            };
                          }).filter(Boolean) as PitchPlayer[]}
                          benchPlayers={(optimisedPicks || teamData.picks).filter(pick => pick.position > 11).map(pick => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            const playerTeam = getPlayerTeam(player);
                            const fixtureInfos = getNextGameweekFixtures(playerTeam?.id || 0);
                            const nextGW = getNextGameweekDashboard();
                            const projected = getProjectedPoints(pick.element, nextGW);
                            return {
                              element: pick.element,
                              element_type: player.element_type,
                              position: pick.position,
                              is_captain: false,
                              is_vice_captain: false,
                              web_name: player.web_name,
                              team_short_name: playerTeam?.short_name,
                              team_id: player.team,
                              team_code: playerTeam?.code || playerTeam?.id || 0,
                              points_display: projected > 0 ? projected.toFixed(2) : '-',
                              fixtures: fixtureInfos as PitchPlayerFixture[],
                              status: player.status,
                              chance_of_playing: player.chance_of_playing_next_round,
                              news: player.news,
                            };
                          }).filter(Boolean) as PitchPlayer[]}
                          onPlayerClick={handleProjectionPlayerClick}
                        />
                    </CardContent>
                  </Card>
                </>
              )}
              
              {/* Show error or loading state when FPL IS connected but no data */}
              {fplStatus?.connected && !isLoadingNextTeam && !nextTeamData && (
                <>
                  {user && (
                    <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
                      <CardContent className="p-6 sm:p-8 text-center">
                        <div className="max-w-md mx-auto space-y-4">
                          <div className="text-lg font-semibold text-blue-900">
                            GW {getNextGameweekDashboard()} Projections Not Available
                          </div>
                          {nextTeamError ? (
                            <>
                              <p className="text-sm text-red-700">
                                {isOwnTeam 
                                  ? `FPL session expired. Please reconnect to sync your latest GW ${getNextGameweekDashboard()} team for accurate projections.`
                                  : "Projections for the upcoming gameweek are not available yet."}
                              </p>
                              {isOwnTeam && (
                                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                                  <Button
                                    onClick={() => refetchNextTeam()}
                                    variant="outline"
                                    className="bg-white hover:bg-blue-50"
                                    data-testid="button-refetch-next-team"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Try Again
                                  </Button>
                                  <FplConnectDialog />
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-blue-700">
                                {isOwnTeam 
                                  ? "Projections will show here once your team data is available. Connect your FPL account to sync your latest team."
                                  : "Projections for the upcoming gameweek will be available once team data is confirmed in FPL."}
                              </p>
                              {isOwnTeam && (
                                <Button
                                  onClick={() => refetchNextTeam()}
                                  variant="outline"
                                  className="bg-white hover:bg-blue-50 mt-4"
                                  data-testid="button-fetch-next-team"
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Fetch Team
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
              
              {/* Show GW 22 team when FPL IS connected and data is available */}
              {fplStatus?.connected && nextTeamData && teamData && (
                <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
                  <CardHeader className="pt-3 px-4 pb-2 sm:pt-4 sm:px-6 sm:pb-3">
                    <CardTitle className="text-lg sm:text-xl text-green-900">
                      GW {getNextGameweekDashboard()} Fixtures & Projections
                    </CardTitle>
                    <CardDescription className="text-green-700 mt-1">
                      Showing GW {getNextGameweekDashboard()} fixtures and projected points for your synced team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {/* FPL Session Reminder for non-logged-in users */}
                    {searchedId && !user && (
                      <Alert className="mb-6 border-blue-200 bg-blue-50">
                        <AlertDescription className="text-sm text-blue-800">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              Login to FPL Dilemmas, and connect your FPL account to fetch your latest team for GW {getNextGameweekDashboard()}.
                              <div className="mt-2">
                                <FplConnectDialog />
                              </div>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Chip simulator — only show when no chip is already active from FPL */}
                    {isOwnTeam && !nextTeamData?.active_chip && (
                      <div className="mb-4 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Simulate chip:</span>
                        <Select
                          value={dashboardChip || "none"}
                          onValueChange={(val) => setDashboardChip(val === "none" ? null : val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-44">
                            <SelectValue placeholder="No chip" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No chip</SelectItem>
                            {getRemainingChipsForDashboard().map(chip => (
                              <SelectItem key={chip} value={chip}>
                                {getChipDisplayName(chip)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {dashboardChip && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDashboardChip(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}

                    {(() => {
                      const activeChip = getUpcomingActiveChip();
                      if (!activeChip) return null;
                      
                      const nextGw = getNextGameweekDashboard();
                      
                      return (
                        <Alert className="mb-6 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <AlertDescription className="text-sm text-purple-800">
                            <span className="font-semibold text-purple-900">
                              {getChipDisplayName(activeChip)} Active
                            </span>
                            {isUnlimitedTransfersActive() && (
                              <span className="text-purple-600 ml-1">
                                - Unlimited transfers available for GW {nextGw}!
                              </span>
                            )}
                            {activeChip === 'bboost' && (
                              <span className="text-purple-600 ml-1">
                                - All 15 players will earn points this gameweek!
                              </span>
                            )}
                            {activeChip === '3xc' && (
                              <span className="text-purple-600 ml-1">
                                - Your captain will earn 3x points this gameweek!
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      );
                    })()}

                    {(() => {
                      const nextGW = getNextGameweekDashboard();
                      const activeChipVal = getUpcomingActiveChip();
                      const normalizedNextPicks = nextTeamData.picks.map((pick: any) => ({
                        ...pick,
                        multiplier: pick.is_captain ? (activeChipVal === '3xc' ? 3 : 2) : (pick.position <= 11 ? 1 : 0)
                      }));
                      const activePicks = optimisedPicks || normalizedNextPicks;
                      const starting11 = activePicks.filter((p: any) => p.position <= 11);
                      const bench = activePicks.filter((p: any) => p.position > 11);
                      let totalStartingXPts = 0;
                      let totalBenchXPts = 0;
                      for (const pick of starting11) {
                        const proj = getProjectedPoints(pick.element, nextGW);
                        totalStartingXPts += proj * (pick.multiplier || 1);
                      }
                      for (const pick of bench) {
                        totalBenchXPts += getProjectedPoints(pick.element, nextGW);
                      }
                      if (activeChipVal === 'bboost') {
                        totalStartingXPts += totalBenchXPts;
                      }
                      const hitCost = (() => {
                        const made = nextTeamData.transfers?.made || 0;
                        const limit = nextTeamData.transfers?.limit || 1;
                        return Math.max(0, (made - limit) * 4);
                      })();
                      const netXPts = totalStartingXPts - hitCost;
                      return (
                        <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg mb-6">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-200 rounded-full">
                                  <Target className="h-6 w-6 text-purple-700" />
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm font-medium text-purple-700">GW {nextGW} Team Projected Points{optimisedPicks ? ' (Optimised)' : ''}</p>
                                  <div className="flex items-baseline gap-2">
                                    <p className="text-2xl sm:text-3xl font-bold text-purple-900">{netXPts.toFixed(2)}</p>
                                    {hitCost > 0 && (
                                      <span className="text-sm text-red-600 font-medium">(-{hitCost} hit)</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-1.5">
                                {activeChipVal === 'bboost' ? (
                                  <p className="text-xs text-purple-600">Incl. bench (BB)</p>
                                ) : (
                                  <p className="text-xs text-purple-600">Bench: {totalBenchXPts.toFixed(2)}</p>
                                )}
                                <div className="flex gap-1.5 justify-end items-center">
                                  {activeChipVal && activeChipVal !== 'bboost' && (
                                    <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-100">
                                      {activeChipVal === '3xc' ? '3xC' : activeChipVal === 'freehit' ? 'FH' : activeChipVal === 'wildcard' ? 'WC' : activeChipVal}
                                    </Badge>
                                  )}
                                  {optimisedPicks ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                                      onClick={() => setOptimisedPicks(null)}
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Reset
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                                      onClick={() => optimizeLineup(nextTeamData.picks, nextGW, activeChipVal)}
                                    >
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Optimise Lineup
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Team Overview Cards */}
                    <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 mb-6">
                      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-emerald-700 mb-1">Formation</p>
                              <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                                {(() => {
                                  const starting = (optimisedPicks || nextTeamData.picks).filter(p => p.position <= 11);
                                  const defs = starting.filter(p => {
                                    const player = getPlayerById(p.element);
                                    return player?.element_type === 2;
                                  }).length;
                                  const mids = starting.filter(p => {
                                    const player = getPlayerById(p.element);
                                    return player?.element_type === 3;
                                  }).length;
                                  const fwds = starting.filter(p => {
                                    const player = getPlayerById(p.element);
                                    return player?.element_type === 4;
                                  }).length;
                                  return `${defs}-${mids}-${fwds}`;
                                })()}
                              </p>
                            </div>
                            <div className="p-2 bg-emerald-200 rounded-full">
                              <Trophy className="h-5 w-5 text-emerald-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Transfers</p>
                              <p className="text-xl sm:text-2xl font-bold text-blue-900">
                                {isUnlimitedTransfersActive() ? (
                                  <span className="text-purple-600">∞ Unlimited</span>
                                ) : (
                                  <>
                                    {nextTeamData.transfers?.made ?? 0}/{nextTeamData.transfers?.limit ?? 1}
                                  </>
                                )}
                              </p>
                              {(() => {
                                const made = nextTeamData.transfers?.made || 0;
                                const limit = nextTeamData.transfers?.limit || 1;
                                const hitCost = Math.max(0, (made - limit) * 4);
                                if (hitCost > 0) {
                                  return (
                                    <p className="text-xs text-red-600 font-semibold mt-1">
                                      -{hitCost} pts
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="p-2 bg-blue-200 rounded-full">
                              <ArrowLeftRight className="h-5 w-5 text-blue-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-amber-700 mb-1">Bank</p>
                              <p className="text-xl sm:text-2xl font-bold text-amber-900">
                                {formatPrice(nextTeamData.transfers?.bank || nextTeamData.entry_history?.bank || 0)}
                              </p>
                            </div>
                            <div className="p-2 bg-amber-200 rounded-full">
                              <DollarSign className="h-5 w-5 text-amber-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-green-700 mb-1">Squad Value</p>
                              <p className="text-xl sm:text-2xl font-bold text-green-900">
                                {formatPrice((() => {
                                  const squadValue = nextTeamData.picks.reduce((total: number, pick: any) => {
                                    const player = getPlayerById(pick.element);
                                    return total + (player?.now_cost || 0);
                                  }, 0);
                                  return squadValue;
                                })())}
                              </p>
                            </div>
                            <div className="p-2 bg-green-200 rounded-full">
                              <TrendingUp className="h-5 w-5 text-green-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* GW Transfers Section */}
                    {(() => {
                      const nextGw = getNextGameweekDashboard();
                      const gwTransfers = transfersData?.filter(t => t.event === nextGw) || [];
                      
                      if (gwTransfers.length === 0) return null;
                      
                      return (
                        <Card className="mb-6 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                              <ArrowLeftRight className="h-5 w-5 text-orange-600" />
                              GW {nextGw} Transfers ({gwTransfers.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {gwTransfers.map((transfer, idx) => {
                                const playerIn = getPlayerById(transfer.element_in);
                                const playerOut = getPlayerById(transfer.element_out);
                                const teamIn = bootstrapData?.teams.find(t => t.id === playerIn?.team);
                                const teamOut = bootstrapData?.teams.find(t => t.id === playerOut?.team);
                                
                                return (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100 shadow-sm">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex flex-col items-center min-w-[80px]">
                                        <span className="text-xs text-red-600 font-medium mb-1">OUT</span>
                                        <div className="text-sm font-semibold text-gray-900 truncate max-w-[80px]">
                                          {playerOut?.web_name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-gray-500">{teamOut?.short_name || ''}</div>
                                        <div className="text-xs text-red-600">{formatPrice(transfer.element_out_cost)}</div>
                                      </div>
                                      
                                      <div className="flex-shrink-0">
                                        <ArrowLeftRight className="h-4 w-4 text-orange-500" />
                                      </div>
                                      
                                      <div className="flex flex-col items-center min-w-[80px]">
                                        <span className="text-xs text-green-600 font-medium mb-1">IN</span>
                                        <div className="text-sm font-semibold text-gray-900 truncate max-w-[80px]">
                                          {playerIn?.web_name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-gray-500">{teamIn?.short_name || ''}</div>
                                        <div className="text-xs text-green-600">{formatPrice(transfer.element_in_cost)}</div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-right ml-2">
                                      <div className={`text-sm font-medium ${
                                        transfer.element_out_cost - transfer.element_in_cost > 0 
                                          ? 'text-green-600' 
                                          : transfer.element_out_cost - transfer.element_in_cost < 0 
                                          ? 'text-red-600' 
                                          : 'text-gray-600'
                                      }`}>
                                        {transfer.element_out_cost - transfer.element_in_cost > 0 ? '+' : ''}
                                        {formatPrice(transfer.element_out_cost - transfer.element_in_cost)}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {new Date(transfer.time).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                      <div className="mt-6">
                        <PitchView
                          activeChip={getUpcomingActiveChip()}
                          players={(optimisedPicks || nextTeamData.picks).filter(pick => pick.position <= 11).map(pick => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            const playerTeam = getPlayerTeam(player);
                            const fixtureInfos = getNextGameweekFixtures(playerTeam?.id || 0);
                            const nextGW = getNextGameweekDashboard();
                            const projected = getProjectedPoints(pick.element, nextGW);
                            const upcomingChip = getUpcomingActiveChip();
                            const multiplier = pick.is_captain ? (upcomingChip === '3xc' ? 3 : 2) : 1;
                            const displayPts = projected * multiplier;
                            return {
                              element: pick.element,
                              element_type: player.element_type,
                              position: pick.position,
                              is_captain: pick.is_captain,
                              is_vice_captain: pick.is_vice_captain,
                              multiplier: multiplier,
                              web_name: player.web_name,
                              team_short_name: playerTeam?.short_name,
                              team_id: player.team,
                              team_code: playerTeam?.code || playerTeam?.id || 0,
                              points_display: displayPts > 0 ? displayPts.toFixed(2) : '-',
                              fixtures: fixtureInfos as PitchPlayerFixture[],
                              status: player.status,
                              chance_of_playing: player.chance_of_playing_next_round,
                              news: player.news,
                            };
                          }).filter(Boolean) as PitchPlayer[]}
                          benchPlayers={(optimisedPicks || nextTeamData.picks).filter(pick => pick.position > 11).sort((a, b) => a.position - b.position).map(pick => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            const playerTeam = getPlayerTeam(player);
                            const fixtureInfos = getNextGameweekFixtures(playerTeam?.id || 0);
                            const nextGW = getNextGameweekDashboard();
                            const projected = getProjectedPoints(pick.element, nextGW);
                            return {
                              element: pick.element,
                              element_type: player.element_type,
                              position: pick.position,
                              is_captain: false,
                              is_vice_captain: false,
                              web_name: player.web_name,
                              team_short_name: playerTeam?.short_name,
                              team_id: player.team,
                              team_code: playerTeam?.code || playerTeam?.id || 0,
                              points_display: projected > 0 ? projected.toFixed(2) : '-',
                              fixtures: fixtureInfos as PitchPlayerFixture[],
                              status: player.status,
                              chance_of_playing: player.chance_of_playing_next_round,
                              news: player.news,
                            };
                          }).filter(Boolean) as PitchPlayer[]}
                          onPlayerClick={handleProjectionPlayerClick}
                        />
                      </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

              {/* Transfers Tab */}
              <TabsContent value="transfers" className="space-y-6 mt-6 sm:mt-8">
                {/* Free Transfers Summary Card - Shows for all users, with more detail when FPL is synced */}
                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                          <ArrowLeftRight className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-emerald-800">
                            GW{getNextGameweekDashboard()} Transfer Summary
                          </h3>
                          <p className="text-sm text-emerald-600">
                            {nextTeamData?.transfers 
                              ? 'Pending transfers for next gameweek' 
                              : `${calculateFreeTransfers(historyData?.current, historyData?.chips, getNextGameweekDashboard())} free transfer${calculateFreeTransfers(historyData?.current, historyData?.chips, getNextGameweekDashboard()) === 1 ? '' : 's'} available at the beginning of the gameweek.`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                        {/* Free Transfers at Start - use FPL API limit if available, else calculate from history */}
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-blue-700">
                            {nextTeamData?.transfers?.limit ?? calculateFreeTransfers(historyData?.current, historyData?.chips, getNextGameweekDashboard())}
                          </div>
                          <div className="text-xs sm:text-sm text-blue-600 font-medium">
                            Free at Start
                          </div>
                        </div>
                        {/* Only show Made/Hit/Remaining when FPL is synced */}
                        {nextTeamData?.transfers && (
                          <>
                            {/* Transfers Made */}
                            <div className="text-center border-l border-emerald-200 pl-4 sm:pl-6">
                              <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                                {nextTeamData.transfers.made || 0}
                              </div>
                              <div className="text-xs sm:text-sm text-orange-600 font-medium">
                                Made
                              </div>
                            </div>
                            {/* Point Hit - only show if transfers exceed free transfer limit */}
                            {(() => {
                              const made = nextTeamData.transfers.made || 0;
                              const limit = nextTeamData.transfers.limit ?? calculateFreeTransfers(historyData?.current, historyData?.chips, getNextGameweekDashboard());
                              const hitCost = Math.max(0, (made - limit) * 4);
                              if (hitCost > 0) {
                                return (
                                  <div className="text-center border-l border-emerald-200 pl-4 sm:pl-6">
                                    <div className="text-2xl sm:text-3xl font-bold text-red-600">
                                      -{hitCost}
                                    </div>
                                    <div className="text-xs sm:text-sm text-red-600 font-medium">
                                      Point Hit
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {/* Remaining Free Transfers */}
                            <div className="text-center border-l border-emerald-200 pl-4 sm:pl-6">
                              <div className="text-2xl sm:text-3xl font-bold text-emerald-700">
                                {Math.max(0, (nextTeamData.transfers.limit ?? calculateFreeTransfers(historyData?.current, historyData?.chips, getNextGameweekDashboard())) - (nextTeamData.transfers.made || 0))}
                              </div>
                              <div className="text-xs sm:text-sm text-emerald-600 font-medium">
                                Remaining
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Transfers Section (Free Hit / Wildcard) */}
                {isOwnTeam && getUpcomingTransfers().length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-purple-800 text-lg sm:text-xl">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                        GW{getNextGameweekDashboard()} {getChipDisplayName(getUpcomingActiveChip())} Transfers
                      </CardTitle>
                      <CardDescription className="text-purple-700 text-sm sm:text-base mt-2">
                        Players changed for the upcoming gameweek with your {getChipDisplayName(getUpcomingActiveChip())} chip
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-3">
                        {getUpcomingTransfers().map((transfer, index) => {
                          const playerIn = bootstrapData?.elements.find(p => p.id === transfer.element_in);
                          const playerOut = bootstrapData?.elements.find(p => p.id === transfer.element_out);
                          
                          return (
                            <div key={`upcoming-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-white/70 rounded-xl border-2 border-purple-200 shadow-sm hover:shadow-md transition-all duration-200 gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    {getChipDisplayName(transfer.chipName || null)}
                                  </Badge>
                                  <span className="text-base sm:text-lg font-semibold text-gray-800">Gameweek {transfer.event}</span>
                                </div>
                                
                                <div className="space-y-2">
                                  {playerIn && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                        <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-green-800 text-sm sm:text-base truncate">
                                            {playerIn.web_name}
                                          </span>
                                          <Badge className="bg-green-100 text-green-800 text-xs shrink-0">
                                            {formatPrice(transfer.element_in_cost)}
                                          </Badge>
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600 truncate">
                                          {getTeamName(playerIn)} • {getPositionName(playerIn.element_type)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {playerOut && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                        <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-red-800 text-sm sm:text-base truncate">
                                            {playerOut.web_name}
                                          </span>
                                          <Badge variant="outline" className="border-red-200 text-red-800 text-xs shrink-0">
                                            {formatPrice(transfer.element_out_cost)}
                                          </Badge>
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600 truncate">
                                          {getTeamName(playerOut)} • {getPositionName(playerOut.element_type)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex sm:flex-col justify-between sm:text-right sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0">
                                <Badge className="bg-purple-500 text-white text-xs">
                                  UPCOMING
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pending Transfers Section (GW14 transfers after Free Hit reverts) */}
                {isOwnTeam && getPendingTransfers().length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-blue-800 text-lg sm:text-xl">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        GW{getNextGameweekDashboard()} Pending Transfers
                      </CardTitle>
                      <CardDescription className="text-blue-700 text-sm sm:text-base mt-2">
                        Transfers made for the upcoming gameweek (not yet confirmed in FPL history)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-3">
                        {getPendingTransfers().map((transfer, index) => {
                          const playerIn = bootstrapData?.elements.find(p => p.id === transfer.element_in);
                          const playerOut = bootstrapData?.elements.find(p => p.id === transfer.element_out);
                          
                          return (
                            <div key={`pending-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-white/70 rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-all duration-200 gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    PENDING
                                  </Badge>
                                  <span className="text-base sm:text-lg font-semibold text-gray-800">Gameweek {transfer.event}</span>
                                </div>
                                
                                <div className="space-y-2">
                                  {playerIn && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                        <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-green-800 text-sm sm:text-base truncate">
                                            {playerIn.web_name}
                                          </span>
                                          <Badge className="bg-green-100 text-green-800 text-xs shrink-0">
                                            {formatPrice(transfer.element_in_cost)}
                                          </Badge>
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600 truncate">
                                          {getTeamName(playerIn)} • {getPositionName(playerIn.element_type)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {playerOut && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                        <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-red-800 text-sm sm:text-base truncate">
                                            {playerOut.web_name}
                                          </span>
                                          <Badge variant="outline" className="border-red-200 text-red-800 text-xs shrink-0">
                                            {formatPrice(transfer.element_out_cost)}
                                          </Badge>
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600 truncate">
                                          {getTeamName(playerOut)} • {getPositionName(playerOut.element_type)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex sm:flex-col justify-between sm:text-right sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0">
                                <Badge className="bg-blue-500 text-white text-xs">
                                  PRE-DEADLINE
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Regular Transfer History */}
                {transfersData && (
                  <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-orange-800 text-lg sm:text-xl">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        </div>
                        Transfer History
                        {getTotalTransferCount() > 0 && (
                          <Badge className="bg-orange-500 text-white text-sm ml-2">
                            {getTotalTransferCount()} total
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-orange-700 text-sm sm:text-base mt-2">
                        All transfers made this season with player prices and gameweek details
                        {getTotalTransferCount() > 0 && (
                          <span className="block text-xs mt-1">(excludes Free Hit and Wildcard gameweek transfers)</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {transfersData && transfersData.length > 0 ? (
                        <div className="space-y-3">
                          {(() => {
                            const chipGWs = getChipGameweeks();
                            const filtered = transfersData
                              .slice()
                              .filter(t => !chipGWs.has(t.event))
                              .sort((a, b) => b.event - a.event || new Date(b.time).getTime() - new Date(a.time).getTime());

                            // Group by gameweek
                            const groups: { gw: number; transfers: typeof filtered }[] = [];
                            for (const t of filtered) {
                              const last = groups[groups.length - 1];
                              if (last && last.gw === t.event) {
                                last.transfers.push(t);
                              } else {
                                groups.push({ gw: t.event, transfers: [t] });
                              }
                            }

                            return groups.map(({ gw, transfers: gwTransfers }) => {
                              const netTotal = gwTransfers.reduce((sum, t) => sum + (t.element_out_cost - t.element_in_cost), 0);
                              const latestDate = new Date(Math.max(...gwTransfers.map(t => new Date(t.time).getTime())));
                              return (
                                <div key={gw} className="bg-white/70 rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                  {/* GW header */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-orange-50/80 border-b border-orange-100">
                                    <span className="text-sm font-semibold text-orange-800">Gameweek {gw}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-gray-500">{latestDate.toLocaleDateString()}</span>
                                      {netTotal !== 0 && (
                                        <span className={`text-xs font-medium ${netTotal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {netTotal > 0 ? '+' : ''}{formatPrice(netTotal)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Transfer rows */}
                                  <div className="divide-y divide-gray-100">
                                    {gwTransfers.map((transfer, idx) => {
                                      const playerIn = bootstrapData?.elements.find(p => p.id === transfer.element_in);
                                      const playerOut = bootstrapData?.elements.find(p => p.id === transfer.element_out);
                                      const net = transfer.element_out_cost - transfer.element_in_cost;
                                      return (
                                        <div key={idx} className="flex items-center gap-2 px-3 py-2 text-sm">
                                          {/* IN */}
                                          <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                          <span className="font-medium text-green-800 truncate min-w-0">
                                            {playerIn ? playerIn.web_name : `#${transfer.element_in}`}
                                          </span>
                                          <span className="text-xs text-green-700 shrink-0">{formatPrice(transfer.element_in_cost)}</span>
                                          {/* Arrow */}
                                          <span className="text-gray-400 shrink-0">→</span>
                                          {/* OUT */}
                                          <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                          <span className="font-medium text-red-800 truncate min-w-0">
                                            {playerOut ? playerOut.web_name : `#${transfer.element_out}`}
                                          </span>
                                          <span className="text-xs text-red-700 shrink-0">{formatPrice(transfer.element_out_cost)}</span>
                                          {/* Net per transfer */}
                                          <span className={`text-xs font-medium ml-auto shrink-0 ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                            {net > 0 ? '+' : ''}{formatPrice(net)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()}
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
              <TabsContent value="chips" className="space-y-6 mt-6 sm:mt-8">
                {/* Upcoming Active Chip (Free Hit / Wildcard) */}
                {isOwnTeam && getUpcomingActiveChip() && (
                  <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-purple-800 text-lg sm:text-xl">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                        Active Chip for GW{getNextGameweekDashboard()}
                      </CardTitle>
                      <CardDescription className="text-purple-700 text-sm sm:text-base mt-2">
                        This chip is active for the upcoming gameweek — you can cancel it in the FPL app before the deadline
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-4 p-4 border-2 border-purple-200 rounded-xl bg-white/70">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Sparkles className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-500 text-white text-sm px-3 py-1">
                              {getChipDisplayName(getUpcomingActiveChip())}
                            </Badge>
                            <Badge variant="outline" className="border-purple-300 text-purple-700 text-xs">
                              ACTIVE
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Gameweek {getNextGameweekDashboard()} • Cancel in FPL app before deadline
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-purple-600 font-medium">UPCOMING</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Previously Used Chips */}
                <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-amber-800 text-lg sm:text-xl">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                      Chips Used
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-2">Special chips played this season</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {historyData?.chips && historyData.chips.length > 0 ? (
                      <div className="space-y-2">
                        {historyData.chips.map((chip, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-white/70">
                            <Badge variant="outline">{formatChipName(chip.name)}</Badge>
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
              <TabsContent value="performance" className="space-y-6 mt-6 sm:mt-8">
                {historyData && (
                  <>
                    {/* Season History - Now on top */}
                    <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-indigo-800 text-lg sm:text-xl">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                          </div>
                          Season History
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                          {/* Current Season */}
                          {managerData && (
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-xl border-2 border-indigo-300 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-semibold text-gray-800">2025/26</div>
                                <Badge className="bg-indigo-600 text-white text-xs">Current</Badge>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-xl font-bold text-indigo-700">{getTotalPoints().toLocaleString()} pts</div>
                                  <div className="text-sm text-gray-600">
                                    Rank: {formatRank(managerData.summary_overall_rank)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Past Seasons */}
                          {historyData?.past && historyData.past.slice().reverse().map((season, index, reversedArray) => {
                            // Calculate rank change from previous season
                            // Since array is reversed (newest first), previous season is at index + 1
                            const prevSeason = reversedArray[index + 1];
                            const currentRank = season.rank || 0;
                            const prevRank = prevSeason?.rank || 0;
                            
                            // Rank change: positive means rank improved (went from higher number to lower)
                            const rankChange = prevSeason ? prevRank - currentRank : 0;
                            
                            return (
                              <div key={index} className="flex items-center justify-between p-4 bg-white/70 rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="text-lg font-semibold text-gray-800">{season.season_name}</div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-indigo-700">{season.total_points.toLocaleString()} pts</div>
                                    <div className="text-sm text-gray-600">
                                      Rank: {formatRank(season.rank)}
                                    </div>
                                    {prevSeason && rankChange !== 0 && (
                                      <div className={`flex items-center justify-end gap-1 mt-1 font-medium ${rankChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {rankChange > 0 ? (
                                          <>
                                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="text-xs">{formatRank(Math.abs(rankChange))}</span>
                                          </>
                                        ) : (
                                          <>
                                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="text-xs">{formatRank(Math.abs(rankChange))}</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gameweek History - Now below Season History */}
                    {historyData?.current && historyData.current.length > 0 && (
                      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg">
                        <CardHeader className="p-4 sm:p-6">
                          <CardTitle className="flex items-center gap-2 text-emerald-800 text-lg sm:text-xl">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                            </div>
                            Gameweek History
                          </CardTitle>
                          <CardDescription>Points and rank progression by gameweek</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs sm:text-sm">GW</TableHead>
                                  <TableHead className="text-xs sm:text-sm font-bold text-green-700 bg-green-50">GW Pts</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Total Pts</TableHead>
                                  <TableHead className="text-xs sm:text-sm">GW Rank</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Total Rank</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Gain</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Transfers</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Cost</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Bench Pts</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Chip</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  const sortedHistory = [...historyData.current].sort((a, b) => b.event - a.event);
                                  return sortedHistory.map((gw, index) => {
                                    const chipUsed = historyData.chips?.find((chip: any) => chip.event === gw.event);
                                    const getChipName = (chipName: string) => {
                                      switch (chipName) {
                                        case 'freehit': return 'Free Hit';
                                        case 'wildcard': return 'Wildcard';
                                        case '3xc': return 'Triple Captain';
                                        case 'bboost': return 'Bench Boost';
                                        default: return chipName;
                                      }
                                    };
                                    
                                    const currentEvent = bootstrapData?.events?.find((e: any) => e.is_current) as any;
                                    const isCurrentGW = currentEvent?.id === gw.event;
                                    const isInProgress = isCurrentGW && !currentEvent?.finished;
                                    
                                    const previousGW = sortedHistory[index + 1];
                                    const rankGain = previousGW ? (previousGW.overall_rank || 0) - (gw.overall_rank || 0) : 0;
                                    
                                    return (
                                      <TableRow key={gw.event} className={isInProgress ? "bg-green-50" : ""}>
                                        <TableCell className="font-medium text-xs sm:text-sm">
                                          <div className="flex items-center gap-1 sm:gap-2">
                                            {gw.event}
                                            {isInProgress && (
                                              <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-green-100 text-green-700 border-green-300 animate-pulse">
                                                LIVE
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-sm sm:text-base text-green-700 bg-green-50">{gw.points}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">{gw.total_points?.toLocaleString()}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">{gw.rank ? `#${gw.rank.toLocaleString()}` : '-'}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">#{gw.overall_rank?.toLocaleString()}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                          {previousGW ? (
                                            <span className={`font-medium ${rankGain > 0 ? 'text-green-600' : rankGain < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                              {rankGain > 0 ? '+' : ''}{rankGain.toLocaleString()}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm">{gw.event_transfers}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">{gw.event_transfers_cost > 0 ? `-${gw.event_transfers_cost}` : '0'}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                          {(() => {
                                            const isBB = chipUsed?.name === 'bboost';
                                            const benchPts = (gw as any).points_on_bench;
                                            if (isBB) {
                                              return <span className="text-green-600 font-medium" title="Bench Boost active - bench points included in total">BB</span>;
                                            }
                                            return benchPts ?? '-';
                                          })()}
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                          {chipUsed ? (
                                            <Badge variant="outline" className="text-[10px] sm:text-xs bg-amber-50 text-amber-700 border-amber-300">
                                              {getChipName(chipUsed.name)}
                                            </Badge>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  });
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </>
              )}
            </TabsContent>

            {/* Chips Tab */}
            <TabsContent value="chips" className="space-y-6 mt-6 sm:mt-8">
              {historyData && (
                <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-amber-800 text-lg sm:text-xl">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                      </div>
                      Chip Usage Summary
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-2">
                      Complete overview of FPL chip usage for this season
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
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

        {/* Initial State - How to find Manager ID */}
        {!searchedId && (
          <Card className="mb-6 sm:mb-8 border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="max-w-2xl mx-auto">
                <div className="text-sm sm:text-base text-gray-700 space-y-3">
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Player Projection Breakdown Modal */}
      <Dialog open={showProjectionBreakdown} onOpenChange={setShowProjectionBreakdown}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6 rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-bold truncate">
                  {selectedPlayerForProjection?.web_name || selectedPlayerForProjection?.second_name}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 font-normal truncate">
                  {selectedPlayerForProjection?.first_name} {selectedPlayerForProjection?.second_name}
                </span>
              </div>
              {selectedPlayerForProjection?.isCaptain && (
                <Badge className="bg-yellow-400 text-yellow-900 text-xs shrink-0">
                  {selectedPlayerForProjection.multiplier === 3 ? 'Triple Captain (3x)' : 'Captain (2x)'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlayerForProjection && (
            <PlayerPopupDetails player={selectedPlayerForProjection}>
              <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">GW {selectedPlayerForProjection.gameweek} Projected Points</p>
                <p className="text-3xl sm:text-4xl font-bold text-purple-700">
                  {(selectedPlayerForProjection.totalProjected * selectedPlayerForProjection.multiplier).toFixed(2)}
                </p>
                {selectedPlayerForProjection.multiplier > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    ({selectedPlayerForProjection.totalProjected.toFixed(2)} x {selectedPlayerForProjection.multiplier} {selectedPlayerForProjection.multiplier === 3 ? 'triple captain' : 'captain'} bonus)
                  </p>
                )}
              </div>

              {selectedPlayerForProjection.fixtureDetails?.length > 0 ? (
                <div className="space-y-3">
                  {selectedPlayerForProjection.fixtureDetails.map((fixture: any, fIdx: number) => {
                    const fixtureComponents = [
                      { label: 'Minutes', points: fixture.pointsFromMinutes || 0, icon: '⏱️' },
                      { label: 'Goals', points: fixture.pointsFromGoals || 0, icon: '⚽' },
                      { label: 'Assists', points: fixture.pointsFromAssists || 0, icon: '🎯' },
                      { label: 'Clean Sheets', points: fixture.pointsFromCleanSheets || 0, icon: '🛡️' },
                      { label: 'Goals Conceded', points: fixture.pointsFromGoalsConceded || 0, icon: '🚪' },
                      { label: 'Saves', points: fixture.pointsFromSaves || 0, icon: '🧤' },
                      { label: 'Bonus', points: fixture.pointsFromBonus || 0, icon: '✨' },
                      { label: 'Yellow Cards', points: fixture.pointsFromYellowCards || 0, icon: '🟨' },
                      { label: 'Red Cards', points: fixture.pointsFromRedCards || 0, icon: '🟥' },
                      { label: 'Defensive Contributions', points: fixture.pointsFromDefensiveContributions || 0, icon: '🔒' },
                    ].filter(c => Math.abs(c.points) >= 0.01);
                    
                    return (
                      <div key={fIdx} className="space-y-1">
                        <div className="flex justify-between items-center bg-gray-100 rounded-lg px-3 py-2">
                          <span className="font-semibold text-xs sm:text-sm text-gray-800">
                            {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-purple-700">
                            {(fixture.totalPoints || 0).toFixed(2)} pts
                          </span>
                        </div>
                        {fixtureComponents.length > 0 ? (
                          <div className="space-y-0.5 pl-2">
                            {fixtureComponents.map((comp, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1.5 sm:py-1 px-2 rounded hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-sm">{comp.icon}</span>
                                  <span className="text-xs sm:text-sm text-gray-700">{comp.label}</span>
                                </div>
                                <span className={`font-semibold text-xs sm:text-sm ${comp.points >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                  {comp.points > 0 ? '+' : ''}{comp.points.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 text-center py-1">No projected points</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-center bg-gray-100 rounded-lg px-3 py-2">
                    <span className="font-semibold text-xs sm:text-sm text-gray-800">Scoring Components</span>
                    <span className="font-bold text-xs sm:text-sm text-purple-700">
                      {selectedPlayerForProjection.totalProjected.toFixed(2)} pts
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    {selectedPlayerForProjection.components
                      .filter((c: any) => Math.abs(c.points) >= 0.01)
                      .map((comp: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 sm:py-1 px-2 rounded hover:bg-gray-50">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-sm">{comp.icon}</span>
                            <span className="text-xs sm:text-sm text-gray-700">{comp.label}</span>
                          </div>
                          <span className={`font-semibold text-xs sm:text-sm ${comp.points >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                            {comp.points > 0 ? '+' : ''}{comp.points.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </PlayerPopupDetails>
          )}
        </DialogContent>
      </Dialog>

      {/* Player Points Breakdown Modal - Mobile Optimized */}
      <Dialog open={showPointsBreakdown} onOpenChange={setShowPointsBreakdown}>
        <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6 rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-bold truncate">
                  {selectedPlayerForBreakdown?.web_name || selectedPlayerForBreakdown?.second_name}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 font-normal truncate">
                  {selectedPlayerForBreakdown?.first_name} {selectedPlayerForBreakdown?.second_name}
                </span>
              </div>
              {selectedPlayerForBreakdown?.isCaptain && (
                <Badge className="bg-yellow-400 text-yellow-900 text-xs shrink-0">
                  {(selectedPlayerForBreakdown.captainMultiplier || 2) === 3 ? 'Triple Captain (3x)' : 'Captain (2x)'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlayerForBreakdown && (
            <PlayerPopupDetails player={selectedPlayerForBreakdown}>
              {selectedPlayerForBreakdown?.liveStats ? (
                <>
                  {(() => {
                    const mult = selectedPlayerForBreakdown.captainMultiplier || (selectedPlayerForBreakdown.isCaptain ? 2 : 1);
                    const basePoints = selectedPlayerForBreakdown.liveStats.total_points || 0;
                    const totalPoints = basePoints * mult;
                    const fixtureBreakdowns = getPerFixtureBreakdown(selectedPlayerForBreakdown);
                    
                    return (
                      <>
                        <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Points</p>
                          <p className="text-3xl sm:text-4xl font-bold text-green-700">
                            {totalPoints}
                          </p>
                          {mult > 1 && (
                            <p className="text-xs text-gray-500 mt-1">
                              ({basePoints} × {mult} {mult === 3 ? 'triple captain' : 'captain'} bonus)
                            </p>
                          )}
                        </div>
                        
                        {fixtureBreakdowns.length > 0 ? (
                          <div className="space-y-3">
                            {fixtureBreakdowns.map((fb: any, fIdx: number) => (
                              <div key={fIdx} className="space-y-1">
                                <div className="flex justify-between items-center bg-gray-100 rounded-lg px-3 py-2">
                                  <span className="font-semibold text-xs sm:text-sm text-gray-800">{fb.matchLabel}</span>
                                  <span className="font-bold text-xs sm:text-sm text-green-700">{fb.totalPoints} pts</span>
                                </div>
                                {fb.stats.length > 0 ? (
                                  <div className="space-y-0.5 pl-2">
                                    {fb.stats.filter((s: any) => s.identifier !== 'bps').map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center py-1.5 sm:py-1 px-2 rounded hover:bg-gray-50 active:bg-gray-100 touch-manipulation">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                          <span className="text-xs sm:text-sm text-gray-700">{item.label}</span>
                                          <span className="text-xs text-gray-400">({item.value})</span>
                                        </div>
                                        <span className={`font-semibold text-xs sm:text-sm ${item.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {item.points > 0 ? '+' : ''}{item.points}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 text-center py-1">No points yet</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500 text-center py-2">No breakdown data available</p>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <p className="text-sm">No live data available for this player</p>
                  <p className="text-xs sm:text-sm mt-1">Match may not have started yet</p>
                </div>
              )}
            </PlayerPopupDetails>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
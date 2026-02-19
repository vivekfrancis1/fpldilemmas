import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Crown,
  DollarSign,
  Shield,
  Target,
  Trophy,
  Users,
  Star,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  ArrowLeftRight,
  Wallet
} from "lucide-react";
import { PitchView, type PitchPlayer } from "@/components/pitch-view";
import { ListView, type ListPlayer } from "@/components/list-view";
import { calculateFreeTransfers } from "@/lib/free-transfers";

type TeamPick = {
  element: number;
  position: string;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
  player_name: string;
  team_name: string;
  live_points?: number;
  live_minutes?: number;
  live_goals_scored?: number;
  live_assists?: number;
  live_bonus?: number;
  live_bps?: number;
};

type TeamData = {
  active_chip?: string;
  entry_history?: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks?: TeamPick[];
  gameweek?: number;
  manager?: string;
  general_info?: any;
  message?: string;
};

type HistoryEntry = {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  rank_sort: number;
  overall_rank: number;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
};

type ManagerHistory = {
  current: HistoryEntry[];
  past: any[];
  chips: any[];
};

type Transfer = {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
};

function getPositionName(elementType: number) {
  switch (elementType) {
    case 1:
      return 'Goalkeeper';
    case 2:
      return 'Defender';
    case 3:
      return 'Midfielder';
    case 4:
      return 'Forward';
    default:
      return 'Unknown';
  }
}

function getPositionIcon(position: string | number | undefined) {
  let posStr: string;
  
  if (typeof position === 'number') {
    posStr = getPositionName(position);
  } else if (typeof position === 'string') {
    posStr = position;
  } else {
    posStr = 'Unknown';
  }
  
  switch (posStr.toLowerCase()) {
    case 'goalkeeper':
      return <Shield className="h-4 w-4" />;
    case 'defender':
      return <Shield className="h-4 w-4" />;
    case 'midfielder':
      return <Target className="h-4 w-4" />;
    case 'forward':
      return <Star className="h-4 w-4" />;
    default:
      return <Users className="h-4 w-4" />;
  }
}

function getPositionColor(position: string | undefined) {
  if (!position || typeof position !== 'string') {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
  
  switch (position.toLowerCase()) {
    case 'goalkeeper':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'defender':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'midfielder':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'forward':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getRankChangeDisplay(rankChange: number) {
  if (rankChange > 0) {
    return (
      <span className="text-green-600 text-xs font-medium flex items-center">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{rankChange.toLocaleString()}
      </span>
    );
  } else if (rankChange < 0) {
    return (
      <span className="text-red-600 text-xs font-medium flex items-center">
        <TrendingDown className="h-3 w-3 mr-1" />
        {rankChange.toLocaleString()}
      </span>
    );
  } else {
    return (
      <span className="text-gray-500 text-xs">
        -
      </span>
    );
  }
}

export default function ManagerTeam() {
  const { managerId } = useParams<{ managerId: string }>();
  const [, navigate] = useLocation();
  
  // Fetch manager general info (name, etc.)
  const { data: managerInfo } = useQuery<any>({
    queryKey: [`/api/manager/${managerId}?source=navigation`],
    enabled: !!managerId,
    retry: 2,
  });
  
  const { data: teamData, isLoading, error } = useQuery<TeamData>({
    queryKey: [`/api/manager/${managerId}/team`],
    enabled: !!managerId,
    retry: 2,
  });

  const { data: managerHistory, isLoading: historyLoading } = useQuery<ManagerHistory>({
    queryKey: [`/api/manager/${managerId}/history`],
    enabled: !!managerId,
    retry: 2,
  });

  const { data: transfersData, isLoading: isLoadingTransfers } = useQuery<Transfer[]>({
    queryKey: [`/api/manager/${managerId}/transfers`],
    enabled: !!managerId,
    retry: 2,
  });

  // Get bootstrap data to determine completed gameweeks
  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<any>({
    queryKey: ['/api/bootstrap-static'],
  });

  // Get fixtures data for pitch view
  const { data: fixturesData } = useQuery<any>({
    queryKey: ['/api/fixtures'],
  });

  // State for view toggle (pitch or list)
  const [teamView, setTeamView] = useState<"pitch" | "list">("pitch");
  
  // Player points breakdown modal state
  const [selectedPlayerForBreakdown, setSelectedPlayerForBreakdown] = useState<any | null>(null);
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);

  // Live gameweek data for player points breakdown
  const currentGameweek = bootstrapData?.events?.find((e: any) => e.is_current)?.id || 1;
  const { data: liveGameweekData } = useQuery<{ elements: Array<{ id: number; stats: any; explain: any[] }> }>({
    queryKey: [`/api/event/${currentGameweek}/live`],
    enabled: !!bootstrapData,
    staleTime: 60000,
  });

  // Function to get completed gameweeks (1-3 only)
  const getCompletedGameweeks = () => {
    if (!bootstrapData?.events) return [1, 2, 3]; // Default fallback to show 1-3
    
    // For now, since we're early in the season, show gameweeks 1-3 regardless of finished status
    // We can make this more dynamic later when more gameweeks are completed
    return [1, 2, 3];
  };

  // Helper function to get chip name for a gameweek
  const getChipForGameweek = (gameweek: number) => {
    if (!managerHistory?.chips) return null;
    const chip = managerHistory.chips.find((c: any) => c.event === gameweek);
    return chip ? chip.name : null;
  };

  // Helper function to get player data from bootstrap
  const getPlayerData = (playerId: number) => {
    if (!bootstrapData?.elements) return null;
    return bootstrapData.elements.find((p: any) => p.id === playerId);
  };

  // Helper function to get position name from element_type
  const getPositionFromElementType = (elementType: number) => {
    if (!bootstrapData?.element_types) return 'Unknown';
    const position = bootstrapData.element_types.find((et: any) => et.id === elementType);
    return position ? position.singular_name : 'Unknown';
  };

  // Helper function to format price
  const formatPrice = (cost: number) => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  // Player points breakdown click handler
  const handlePlayerCardClick = (player: any, isCaptain: boolean = false) => {
    const liveElement = liveGameweekData?.elements?.find((e: any) => e.id === player.element || e.id === player.id);
    const playerData = getPlayerData(player.element || player.id);
    setSelectedPlayerForBreakdown({
      ...playerData,
      liveStats: liveElement?.stats,
      explain: liveElement?.explain,
      isCaptain,
      captainMultiplier: player.multiplier || (isCaptain ? 2 : 1),
    });
    setShowPointsBreakdown(true);
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
    const score = fixture.started ? `${fixture.team_h_score ?? 0}-${fixture.team_a_score ?? 0}` : '';
    const matchText = homeTeam && awayTeam
      ? `${homeTeam.short_name} ${score} ${awayTeam.short_name}`
      : `Fixture ${fixtureId}`;
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

  // Helper function to get position short name
  const getPositionShortName = (position: string) => {
    switch (position.toLowerCase()) {
      case 'goalkeeper':
        return 'GKP';
      case 'defender':
        return 'DEF';
      case 'midfielder':
        return 'MID';
      case 'forward':
        return 'FWD';
      default:
        return position.slice(0, 3).toUpperCase();
    }
  };

  // Helper functions for pitch view
  const getPlayerTeam = (player: any) => {
    const playerData = getPlayerData(player.element);
    return bootstrapData?.teams.find(t => t.id === playerData?.team);
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
      10: '#6CABDD',     // Fulham - White & Black (Light Blue)
      11: '#D71920',     // Liverpool - Red
      12: '#6CABDD',     // Man City - Sky Blue
      13: '#DA291C',     // Man Utd - Red
      14: '#241F20',     // Newcastle - Black & White
      15: '#EF0107',     // Nottm Forest - Red
      16: '#DA020E',     // Nottm Forest - Red
      17: '#1B458F',     // Sunderland - Blue (not in current PL)
      18: '#FFFFFF',     // Spurs (Tottenham) - White
      19: '#FBEE23',     // West Ham - Claret & Blue (Gold)
      20: '#FDB913'      // Wolves - Gold & Black
    };
    
    return jerseyColors[teamId] || '#9CA3AF';
  };

  const getTextColor = (backgroundColor: string): string => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const getTeamById = (teamId: number) => {
    return bootstrapData?.teams.find(t => t.id === teamId);
  };

  const getCurrentGameweek = (): number => {
    const currentEvent = bootstrapData?.events.find(e => e.is_current);
    return currentEvent?.id || 1;
  };

  const getCurrentGameweekFixture = (teamId: number) => {
    if (!fixturesData || !Array.isArray(fixturesData)) return null;
    
    const currentGW = getCurrentGameweek();
    
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

  const getNextFixtures = (teamId: number, count: number = 3) => {
    if (!fixturesData || !Array.isArray(fixturesData)) {
      return [];
    }
    
    const currentGW = getCurrentGameweek();
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

  const sortPlayersByPosition = (picks: TeamPick[]) => {
    return picks.sort((a, b) => {
      const playerA = getPlayerData(a.element);
      const playerB = getPlayerData(b.element);
      
      if (!playerA || !playerB) return 0;
      
      if (playerA.element_type !== playerB.element_type) {
        return playerA.element_type - playerB.element_type;
      }
      
      return (playerB.now_cost || 0) - (playerA.now_cost || 0);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !teamData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Team Data Unavailable</h3>
            <p className="text-gray-500 text-center max-w-md">
              Unable to fetch team data for this manager. The team information may not be publicly available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enrich picks with player data from bootstrap
  // Use live_points from API response (accurate) over event_points from bootstrap (may be stale)
  const enrichedPicks = teamData?.picks?.map(pick => {
    const playerData = getPlayerData(pick.element);
    const teamDataLocal = bootstrapData?.teams?.find((t: any) => t.id === playerData?.team);
    // Prefer live_points from API response over bootstrap event_points
    const points = pick.live_points !== undefined ? pick.live_points : (playerData?.event_points || 0);
    return {
      ...pick,
      player_name: playerData ? `${playerData.first_name} ${playerData.second_name}` : 'Unknown Player',
      team_name: teamDataLocal?.name || 'Unknown Team',
      now_cost: playerData?.now_cost || 0,
      event_points: points,
      element_type: playerData?.element_type || 1,
    };
  }) || [];

  const startingEleven = enrichedPicks.slice(0, 11);
  const substitutes = enrichedPicks.slice(11);

  const captain = enrichedPicks.find(p => p.is_captain);
  const viceCaptain = enrichedPicks.find(p => p.is_vice_captain);
  
  // Helper to get fixture status for a player's team
  const getPlayerFixtureStatus = (teamId: number) => {
    const fixture = getCurrentGameweekFixture(teamId);
    if (!fixture) {
      return { started: false, finished: false, opponent: undefined, isHome: true };
    }
    return {
      started: fixture.started,
      finished: fixture.finished,
      opponent: fixture.opponent,
      isHome: fixture.isHome,
    };
  };

  // Map enriched picks to PitchPlayer format for pitch view
  const pitchPlayers: PitchPlayer[] = startingEleven.map(pick => {
    const playerData = getPlayerData(pick.element);
    const teamDataLocal = bootstrapData?.teams?.find((t: any) => t.id === playerData?.team);
    const fixtureStatus = getPlayerFixtureStatus(playerData?.team || 0);
    
    return {
      element: pick.element,
      element_type: pick.element_type,
      position: typeof pick.position === 'number' ? pick.position : parseInt(pick.position || '0'),
      is_captain: pick.is_captain,
      is_vice_captain: pick.is_vice_captain,
      multiplier: pick.multiplier,
      player_name: playerData ? `${playerData.first_name} ${playerData.second_name}` : pick.player_name,
      web_name: playerData?.web_name || pick.player_name?.split(' ').pop() || `Player ${pick.element}`,
      team_name: pick.team_name,
      team_short_name: teamDataLocal?.short_name,
      team_id: playerData?.team,
      team_code: teamDataLocal?.code,
      event_points: pick.event_points,
      live_minutes: pick.live_minutes,
      in_dreamteam: playerData?.in_dreamteam || false,
      fixture_started: fixtureStatus.started,
      fixture_finished: fixtureStatus.finished,
      fixture_opponent: fixtureStatus.opponent,
      fixture_is_home: fixtureStatus.isHome,
      status: playerData?.status,
      chance_of_playing: playerData?.chance_of_playing_next_round,
      news: playerData?.news,
    };
  });

  // Map bench players to PitchPlayer format
  const benchPlayers: PitchPlayer[] = substitutes.map(pick => {
    const playerData = getPlayerData(pick.element);
    const teamDataLocal = bootstrapData?.teams?.find((t: any) => t.id === playerData?.team);
    const fixtureStatus = getPlayerFixtureStatus(playerData?.team || 0);
    
    return {
      element: pick.element,
      element_type: pick.element_type,
      position: typeof pick.position === 'number' ? pick.position : parseInt(pick.position || '0'),
      is_captain: false,
      is_vice_captain: false,
      multiplier: pick.multiplier,
      player_name: playerData ? `${playerData.first_name} ${playerData.second_name}` : pick.player_name,
      web_name: playerData?.web_name || pick.player_name?.split(' ').pop() || `Player ${pick.element}`,
      team_name: pick.team_name,
      team_short_name: teamDataLocal?.short_name,
      team_id: playerData?.team,
      team_code: teamDataLocal?.code,
      event_points: pick.event_points,
      live_minutes: pick.live_minutes,
      in_dreamteam: playerData?.in_dreamteam || false,
      fixture_started: fixtureStatus.started,
      fixture_finished: fixtureStatus.finished,
      fixture_opponent: fixtureStatus.opponent,
      fixture_is_home: fixtureStatus.isHome,
      status: playerData?.status,
      chance_of_playing: playerData?.chance_of_playing_next_round,
      news: playerData?.news,
    };
  });

  // Get manager name from manager info
  const managerName = managerInfo ? 
    `${managerInfo.player_first_name} ${managerInfo.player_last_name}` :
    `Manager ${managerId}`;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="hover:bg-blue-50"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {managerName}'s Team
              </h1>
              <p className="text-muted-foreground text-lg">
                {teamData?.gameweek ? `Gameweek ${teamData.gameweek}` : 'Team Overview'}
                {teamData?.message && ` • ${teamData.message}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              Manager ID: {managerId}
            </Badge>
          </div>
        </div>
      </div>

      {/* Team Statistics */}
      {teamData?.entry_history && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-2xl font-bold text-blue-700">{teamData.entry_history.points}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">GW Points</div>
                </div>
                <Trophy className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-2xl font-bold text-green-700">{teamData.entry_history.total_points}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Points</div>
                </div>
                <Star className="h-5 w-5 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-2xl font-bold text-purple-700 truncate">
                    #{teamData.entry_history.overall_rank?.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Overall Rank</div>
                </div>
                <Crown className="h-5 w-5 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-2xl font-bold text-orange-700">
                    £{(((teamData.entry_history.value || 0) - (teamData.entry_history.bank || 0)) / 10).toFixed(1)}m
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Squad Value</div>
                </div>
                <DollarSign className="h-5 w-5 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-2xl font-bold text-yellow-700">
                    £{((teamData.entry_history.bank || 0) / 10).toFixed(1)}m
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Cash in Bank</div>
                </div>
                <Wallet className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* General Info Fallback */}
      {managerInfo && !teamData?.entry_history && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-2xl font-bold text-green-700">{managerInfo.summary_overall_points}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Points</div>
                </div>
                <Star className="h-5 w-5 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-2xl font-bold text-purple-700 truncate">
                    #{managerInfo.summary_overall_rank?.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Overall Rank</div>
                </div>
                <Crown className="h-5 w-5 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-base sm:text-xl font-bold text-blue-700 truncate">{managerInfo.name}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Team Name</div>
                </div>
                <Trophy className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-50 to-white">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-sm sm:text-lg font-bold text-gray-700 truncate">
                    {managerInfo.player_first_name} {managerInfo.player_last_name}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Manager</div>
                </div>
                <Users className="h-5 w-5 sm:h-8 sm:w-8 text-gray-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-gray-100 rounded-lg p-1 h-auto">
          <TabsTrigger value="team" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 sm:py-2.5 px-1 sm:px-3 text-xs sm:text-sm min-h-[40px]">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
            Team
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 sm:py-2.5 px-1 sm:px-3 text-xs sm:text-sm min-h-[40px]">
            <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 sm:py-2.5 px-1 sm:px-3 text-xs sm:text-sm min-h-[40px]">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 sm:py-2.5 px-1 sm:px-3 text-xs sm:text-sm min-h-[40px]">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
            History
          </TabsTrigger>
          <TabsTrigger value="chips" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 sm:py-2.5 px-1 sm:px-3 text-xs sm:text-sm min-h-[40px]">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
            Chips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          {/* Team Formation */}
          {bootstrapLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : teamData.picks && teamData.picks.length > 0 && bootstrapData?.elements && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-4">Team Squad</h2>
                
                {/* Pitch View */}
                  <div className="-mx-2 sm:mx-0">
                    <Card className="bg-white shadow-none sm:shadow-lg border-0 sm:border border-gray-200 overflow-hidden">
                      <CardContent className="p-2 sm:p-6">
                        <PitchView 
                          players={pitchPlayers}
                          benchPlayers={benchPlayers}
                          getNextFixtures={getNextFixtures}
                          showFixtures={false}
                          activeChip={teamData?.active_chip}
                          onPlayerClick={(player) => handlePlayerCardClick(player, player.is_captain)}
                        />
                      </CardContent>
                    </Card>
                  </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Transfer History
              </CardTitle>
              <CardDescription>All transfers made this season (excluding Free Hit gameweeks)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransfers || historyLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (() => {
                const freeHitGameweeks = new Set(
                  managerHistory?.chips
                    ?.filter((c: any) => c.name === 'freehit')
                    .map((c: any) => c.event) || []
                );
                const wildcardGameweeks = new Set(
                  managerHistory?.chips
                    ?.filter((c: any) => c.name === 'wildcard')
                    .map((c: any) => c.event) || []
                );
                
                const filteredTransfers = (transfersData || [])
                  .filter(t => !freeHitGameweeks.has(t.event) && !wildcardGameweeks.has(t.event))
                  .sort((a, b) => {
                    if (b.event !== a.event) return b.event - a.event;
                    return new Date(b.time).getTime() - new Date(a.time).getTime();
                  });
                
                const totalTransfers = filteredTransfers.length;
                
                const currentGW = bootstrapData?.events?.find((e: any) => e.is_current)?.id || 1;
                
                const freeTransfersRemaining = calculateFreeTransfers(
                  managerHistory?.current,
                  managerHistory?.chips,
                  currentGW
                );
                
                if (filteredTransfers.length === 0) {
                  return <p className="text-gray-500">No transfers made this season</p>;
                }
                
                const groupedByGW = filteredTransfers.reduce((acc, t) => {
                  if (!acc[t.event]) acc[t.event] = [];
                  acc[t.event].push(t);
                  return acc;
                }, {} as Record<number, Transfer[]>);
                
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        Total Transfers: {totalTransfers}
                      </Badge>
                      <Badge variant="outline" className="text-sm px-3 py-1 bg-green-50 text-green-700 border-green-300">
                        Free Transfers Available: {freeTransfersRemaining}
                      </Badge>
                    </div>
                    
                    {Object.entries(groupedByGW)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([gw, transfers]) => {
                        const gwNum = Number(gw);
                        const isWildcard = wildcardGameweeks.has(gwNum);
                        
                        return (
                          <div key={gw} className="border rounded-lg overflow-hidden">
                            <div className={`px-3 py-2 flex items-center gap-2 ${isWildcard ? 'bg-purple-50' : 'bg-gray-50'}`}>
                              <span className="font-medium text-sm">Gameweek {gw}</span>
                              <span className="text-xs text-gray-500">({transfers.length} transfer{transfers.length > 1 ? 's' : ''})</span>
                              {isWildcard && (
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-purple-600 text-white">
                                  Wildcard
                                </Badge>
                              )}
                            </div>
                            <div className="divide-y">
                              {transfers.map((transfer, index) => {
                                const inPlayer = getPlayerData(transfer.element_in);
                                const outPlayer = getPlayerData(transfer.element_out);
                                
                                return (
                                  <div key={index} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3">
                                    <div className="flex-1 flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                                      <span className="text-red-600 text-xs sm:text-sm">
                                        {outPlayer ? `${outPlayer.first_name?.charAt(0)}. ${outPlayer.second_name}` : 'Unknown'}
                                      </span>
                                      <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                      <span className="text-green-600 text-xs sm:text-sm">
                                        {inPlayer ? `${inPlayer.first_name?.charAt(0)}. ${inPlayer.second_name}` : 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                      {formatPrice(transfer.element_out_cost)} → {formatPrice(transfer.element_in_cost)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Gameweek History
              </CardTitle>
              <CardDescription>Points and rank progression by gameweek</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : managerHistory?.current && managerHistory.current.length > 0 ? (
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
                        <TableHead className="text-xs sm:text-sm">Bench</TableHead>
                        <TableHead className="text-xs sm:text-sm">Chip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const sortedHistory = [...managerHistory.current].sort((a, b) => b.event - a.event);
                        return sortedHistory.map((gw, index) => {
                          const chipName = getChipForGameweek(gw.event);
                          const currentEvent = bootstrapData?.events?.find((e: any) => e.is_current);
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
                              <TableCell className="text-xs sm:text-sm">{gw.points_on_bench}</TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {chipName ? (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs bg-amber-50 text-amber-700 border-amber-300">
                                    {chipName}
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
              ) : (
                <p className="text-gray-500">No gameweek history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Season History
              </CardTitle>
              <CardDescription>Performance across previous seasons</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (managerHistory?.past && managerHistory.past.length > 0) || managerHistory?.current ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Season</TableHead>
                      <TableHead>Total Points</TableHead>
                      <TableHead>Overall Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const currentSeasonData = managerHistory?.current && managerHistory.current.length > 0 
                        ? managerHistory.current[managerHistory.current.length - 1]
                        : null;
                      const now = new Date();
                      const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
                      const seasonName = `${year}/${String(year + 1).slice(-2)}`;
                      const currentSeason = currentSeasonData ? {
                        season_name: seasonName,
                        total_points: currentSeasonData.total_points,
                        rank: currentSeasonData.overall_rank,
                        isCurrent: true
                      } : null;
                      const pastSeasons = [...(managerHistory?.past || [])]
                        .sort((a, b) => parseInt(b.season_name.split('/')[0]) - parseInt(a.season_name.split('/')[0]));
                      const allSeasons = currentSeason ? [currentSeason, ...pastSeasons] : pastSeasons;
                      
                      return allSeasons.map((season: any, index: number) => (
                        <TableRow key={index} className={season.isCurrent ? "bg-blue-50" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {season.season_name}
                              {season.isCurrent && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border-blue-300">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{season.total_points?.toLocaleString()}</TableCell>
                          <TableCell>{season.rank ? `#${season.rank.toLocaleString()}` : 'N/A'}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500">No season history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chips" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Chips Used
              </CardTitle>
              <CardDescription>Special chips played this season</CardDescription>
            </CardHeader>
            <CardContent>
              {managerHistory?.chips && managerHistory.chips.length > 0 ? (
                <div className="space-y-2">
                  {managerHistory.chips.map((chip, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Badge variant="outline">{chip.name}</Badge>
                      <span className="text-sm text-gray-600">Gameweek {chip.event}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No chips used yet this season</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
          
          <div className="space-y-3 sm:space-y-4">
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

            {selectedPlayerForBreakdown && (
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <Link href={`/player/${selectedPlayerForBreakdown.id}?from=${encodeURIComponent(window.location.pathname)}`} className="flex-1">
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-purple-600 hover:to-indigo-600 transition-all">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Season Statistics
                  </button>
                </Link>
                <Link href={`/fixtures?team=${selectedPlayerForBreakdown.team}&from=${encodeURIComponent(window.location.pathname)}`} className="flex-1">
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all">
                    <Calendar className="h-3.5 w-3.5" />
                    Upcoming Fixtures
                  </button>
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
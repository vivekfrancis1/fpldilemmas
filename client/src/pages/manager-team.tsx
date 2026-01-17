import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
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
  ArrowLeftRight
} from "lucide-react";
import { PitchView, type PitchPlayer } from "@/components/pitch-view";

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
  
  // Fetch manager general info (name, etc.)
  const { data: managerInfo } = useQuery<any>({
    queryKey: [`/api/manager/${managerId}`],
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
  const { data: bootstrapData } = useQuery<any>({
    queryKey: ['/api/bootstrap-static'],
  });

  // Get fixtures data for pitch view
  const { data: fixturesData } = useQuery<any>({
    queryKey: ['/api/fixtures'],
  });

  // State for view toggle (pitch or list)
  const [teamView, setTeamView] = useState<"pitch" | "list">("pitch");

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
      player_name: pick.player_name,
      web_name: playerData?.web_name,
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
      player_name: pick.player_name,
      web_name: playerData?.web_name,
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{teamData.entry_history.points}</div>
                  <div className="text-sm text-muted-foreground">GW Points</div>
                </div>
                <Trophy className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">{teamData.entry_history.total_points}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
                <Star className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    #{teamData.entry_history.overall_rank?.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Rank</div>
                </div>
                <Crown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    £{((teamData.entry_history.value || 0) / 10).toFixed(1)}m
                  </div>
                  <div className="text-sm text-muted-foreground">Team Value</div>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* General Info Fallback */}
      {managerInfo && !teamData?.entry_history && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">{managerInfo.summary_overall_points}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
                <Star className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    #{managerInfo.summary_overall_rank?.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Rank</div>
                </div>
                <Crown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-blue-700">{managerInfo.name}</div>
                  <div className="text-sm text-muted-foreground">Team Name</div>
                </div>
                <Trophy className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-700">
                    {managerInfo.player_first_name} {managerInfo.player_last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">Manager</div>
                </div>
                <Users className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="team" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ArrowLeftRight className="h-4 w-4" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="chips" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Star className="h-4 w-4" />
            Chips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          {/* Team Formation */}
          {teamData.picks && teamData.picks.length > 0 && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-4">Team Squad</h2>
                
                {/* View Toggle */}
                <div className="flex justify-center gap-2 mb-4 sm:mb-6">
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

                {/* Pitch View */}
                {teamView === "pitch" && (
                  <div className="-mx-2 sm:mx-0">
                    <Card className="bg-white shadow-none sm:shadow-lg border-0 sm:border border-gray-200 overflow-hidden">
                      <CardContent className="p-2 sm:p-6">
                        <PitchView 
                          players={pitchPlayers}
                          benchPlayers={benchPlayers}
                          getNextFixtures={getNextFixtures}
                          showFixtures={false}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* List View */}
                {teamView === "list" && (
                <div className="grid gap-6 lg:grid-cols-5">
                  {/* Starting XI */}
                  <div className="lg:col-span-3">
                    <Card className="bg-white shadow-lg border border-gray-200">
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Starting XI
                        </CardTitle>
                        <CardDescription className="text-emerald-50">
                          Current team formation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="space-y-0">
                          {startingEleven.map((player, idx) => (
                            <div
                              key={`starting-${idx}`}
                              className={`flex items-center justify-between p-4 border-l-4 hover:bg-gray-50 transition-colors ${
                                player.is_captain 
                                  ? 'bg-amber-50 border-amber-400' 
                                  : player.is_vice_captain 
                                  ? 'bg-blue-50 border-blue-400' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                                  {player.player_name ? player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{player.player_name || 'Unknown Player'}</span>
                                    {player.is_captain && (
                                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1">C</Badge>
                                    )}
                                    {player.is_vice_captain && (
                                      <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs px-2 py-1">VC</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-medium text-gray-700">{player.team_name}</span>
                                    <Badge className={`text-xs ${getPositionColor(getPositionFromElementType(player.element_type))}`}>
                                      {getPositionIcon(getPositionFromElementType(player.element_type))}
                                      <span className="ml-1">{getPositionShortName(getPositionFromElementType(player.element_type))}</span>
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                {(() => {
                                  const playerData = getPlayerData(player.element);
                                  return playerData ? (
                                    <>
                                      <p className="font-semibold text-green-600">{formatPrice(playerData.now_cost)}</p>
                                      {player.is_captain ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-semibold text-amber-600">
                                            {getPlayerDisplayPoints(playerData, playerData.team, true)}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {!isNaN(Number(getPlayerDisplayPoints(playerData, playerData.team, false))) && `(${getPlayerDisplayPoints(playerData, playerData.team, false)}×2 captain)`}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-600">{getPlayerDisplayPoints(playerData, playerData.team, false)}</p>
                                      )}
                                      {player.multiplier > 1 && (
                                        <Badge variant="outline" className="text-xs">
                                          ×{player.multiplier}
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-sm text-gray-500">Data unavailable</p>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Substitutes */}
                  <div className="lg:col-span-2">
                    <Card className="bg-white shadow-lg border border-gray-200">
                      <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Substitutes
                        </CardTitle>
                        <CardDescription className="text-gray-50">
                          Bench players
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="space-y-0">
                          {substitutes.map((player, idx) => (
                            <div
                              key={`substitute-${idx}`}
                              className="flex items-center justify-between p-4 border-l-4 border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                                  {player.player_name ? player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 text-sm">{player.player_name || 'Unknown Player'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-600">{player.team_name}</span>
                                    <Badge className={`text-xs ${getPositionColor(getPositionFromElementType(player.element_type))}`}>
                                      {getPositionIcon(getPositionFromElementType(player.element_type))}
                                      <span className="ml-1">{getPositionShortName(getPositionFromElementType(player.element_type))}</span>
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                {(() => {
                                  const playerData = getPlayerData(player.element);
                                  return playerData ? (
                                    <>
                                      <p className="font-medium text-green-600 text-sm">{formatPrice(playerData.now_cost)}</p>
                                      <p className="text-xs text-gray-600">{getPlayerDisplayPoints(playerData, playerData.team, false)}</p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">Data unavailable</p>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                )}
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
              <CardDescription>Recent transfer activity for this manager</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransfers ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transfersData && transfersData.length > 0 ? (
                <div className="space-y-2">
                  {transfersData
                    .slice()
                    .sort((a, b) => {
                      // Sort by timestamp (most recent first), then by gameweek (descending)
                      const timeA = new Date(a.time).getTime();
                      const timeB = new Date(b.time).getTime();
                      if (timeB !== timeA) return timeB - timeA;
                      return b.event - a.event;
                    })
                    .slice(0, 10)
                    .map((transfer, index) => {
                    const inPlayer = getPlayerData(transfer.element_in);
                    const outPlayer = getPlayerData(transfer.element_out);
                    
                    return (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="text-sm text-gray-500">
                          GW{transfer.event}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-red-600 text-sm">
                            {outPlayer ? `${outPlayer.first_name} ${outPlayer.second_name}` : 'Unknown'}
                          </span>
                          <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                          <span className="text-green-600 text-sm">
                            {inPlayer ? `${inPlayer.first_name} ${inPlayer.second_name}` : 'Unknown'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatPrice(transfer.element_out_cost)} → {formatPrice(transfer.element_in_cost)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">No transfer data available</p>
              )}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GW</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Transfers</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Bench</TableHead>
                      <TableHead>Chip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managerHistory.current.map((gw) => {
                      const chipName = getChipForGameweek(gw.event);
                      return (
                        <TableRow key={gw.event}>
                          <TableCell className="font-medium">{gw.event}</TableCell>
                          <TableCell>{gw.points}</TableCell>
                          <TableCell>{gw.total_points}</TableCell>
                          <TableCell>#{gw.overall_rank?.toLocaleString()}</TableCell>
                          <TableCell>{gw.event_transfers}</TableCell>
                          <TableCell>-{gw.event_transfers_cost}</TableCell>
                          <TableCell>{gw.points_on_bench}</TableCell>
                          <TableCell>
                            {chipName ? (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                {chipName}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
              ) : managerHistory?.past && managerHistory.past.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Season</TableHead>
                      <TableHead>Total Points</TableHead>
                      <TableHead>Overall Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managerHistory.past.map((season: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{season.season_name}</TableCell>
                        <TableCell>{season.total_points?.toLocaleString()}</TableCell>
                        <TableCell>#{season.rank?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
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
    </div>
  );
}
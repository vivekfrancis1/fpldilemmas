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
  Youtube,
  ArrowLeftRight,
  Eye,
  List
} from "lucide-react";
import { PitchView, type PitchPlayer } from "@/components/pitch-view";
import { ListView, type ListPlayer } from "@/components/list-view";
import { getPositionFromElementType } from "@/lib/pitch-utils";

type TeamPick = {
  element: number;
  position: string;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
  player_name: string;
  team_name: string;
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
  creator?: string;
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

function getPositionIcon(position: string) {
  switch (position.toLowerCase()) {
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

function getPositionColor(position: string) {
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

function getPositionShortName(position: string) {
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
}



export default function CreatorTeam() {
  const { id } = useParams<{ id: string }>();
  
  const { data: teamData, isLoading, error } = useQuery<TeamData>({
    queryKey: [`/api/content-creators/${id}/team`],
    enabled: !!id,
    retry: 2,
  });

  const { data: creatorInfo } = useQuery<any>({
    queryKey: [`/api/content-creators/${id}`],
    enabled: !!id,
  });

  const { data: managerHistory, isLoading: historyLoading } = useQuery<ManagerHistory>({
    queryKey: [`/api/manager/${creatorInfo?.managerId}/history`],
    enabled: !!creatorInfo?.managerId,
    retry: 2,
  });

  const { data: transfersData, isLoading: isLoadingTransfers } = useQuery<Transfer[]>({
    queryKey: [`/api/manager/${creatorInfo?.managerId}/transfers`],
    enabled: !!creatorInfo?.managerId,
    retry: 2,
  });

  // Fallback to our own tracking data if manager history is not available
  const { data: creatorHistory } = useQuery<any[]>({
    queryKey: [`/api/content-creators/${id}/history`],
    enabled: !!id,
    retry: 2,
  });

  // Always default to pitch view
  const [teamView, setTeamView] = useState<"pitch" | "list">("pitch");
  
  // State for points breakdown modal
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [selectedPlayerForBreakdown, setSelectedPlayerForBreakdown] = useState<{
    element: number;
    web_name?: string;
    first_name?: string;
    second_name?: string;
    element_type?: number;
    isCaptain?: boolean;
    liveStats?: any;
  } | null>(null);

  // Get bootstrap data to determine completed gameweeks
  const { data: bootstrapData } = useQuery<any>({
    queryKey: ['/api/bootstrap-static'],
  });

  // Get fixtures data
  const { data: fixturesData } = useQuery<any>({
    queryKey: ['/api/fixtures'],
  });

  // Function to get completed gameweeks
  const getCompletedGameweeks = () => {
    if (!bootstrapData?.events) return [];
    
    // Return all gameweeks that are finished
    return bootstrapData.events
      .filter((event: any) => event.finished)
      .map((event: any) => event.id);
  };

  // Filter manager history to only show completed gameweeks
  const filteredManagerHistory = managerHistory?.current?.filter((gw: HistoryEntry) => {
    const completedGameweeks = getCompletedGameweeks();
    return completedGameweeks.includes(gw.event);
  });

  // Filter creator history to only show completed gameweeks
  const filteredCreatorHistory = creatorHistory?.filter((gw: any) => {
    const completedGameweeks = getCompletedGameweeks();
    return completedGameweeks.includes(gw.gameweek);
  });

  // Helper function to get player data from bootstrap
  const getPlayerData = (playerId: number) => {
    if (!bootstrapData?.elements) return null;
    return bootstrapData.elements.find((p: any) => p.id === playerId);
  };

  // Helper function to format price
  const formatPrice = (cost: number) => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  const getTeamById = (teamId: number) => {
    return bootstrapData?.teams.find(t => t.id === teamId);
  };

  const getCurrentGameweek = (): number => {
    const currentEvent = bootstrapData?.events.find(e => e.is_current);
    return currentEvent?.id || 1;
  };

  // Query for live gameweek data
  const { data: liveGameweekData } = useQuery<any>({
    queryKey: [`/api/event/${getCurrentGameweek()}/live`],
    enabled: !!bootstrapData?.events,
    staleTime: 60000, // 1 minute
  });

  // Get player live stats from live gameweek data
  const getPlayerLiveStats = (playerId: number) => {
    if (!liveGameweekData?.elements) return null;
    return liveGameweekData.elements.find((el: any) => el.id === playerId);
  };

  // Helper function to get points breakdown for a player
  const getPointsBreakdown = (player: any) => {
    if (!player?.liveStats?.stats) return [];
    
    const stats = player.liveStats.stats;
    const elementType = player.element_type || 1;
    const breakdown: { label: string; value: any; points: number }[] = [];
    
    // Minutes
    if (stats.minutes > 0) {
      const minutePoints = stats.minutes >= 60 ? 2 : stats.minutes > 0 ? 1 : 0;
      breakdown.push({ label: "Minutes", value: stats.minutes, points: minutePoints });
    }
    
    // Goals Scored - points depend on position
    if (stats.goals_scored > 0) {
      const goalPoints = elementType <= 2 ? 6 : elementType === 3 ? 5 : 4;
      breakdown.push({ label: "Goals", value: stats.goals_scored, points: stats.goals_scored * goalPoints });
    }
    
    // Assists
    if (stats.assists > 0) {
      breakdown.push({ label: "Assists", value: stats.assists, points: stats.assists * 3 });
    }
    
    // Clean sheets - only for GK and DEF
    if (stats.clean_sheets > 0 && elementType <= 2) {
      breakdown.push({ label: "Clean Sheet", value: stats.clean_sheets, points: stats.clean_sheets * 4 });
    } else if (stats.clean_sheets > 0 && elementType === 3) {
      breakdown.push({ label: "Clean Sheet", value: stats.clean_sheets, points: stats.clean_sheets * 1 });
    }
    
    // Goals conceded (GK and DEF lose points)
    if (stats.goals_conceded >= 2 && elementType <= 2) {
      const penaltyPoints = -Math.floor(stats.goals_conceded / 2);
      breakdown.push({ label: "Goals Conceded", value: stats.goals_conceded, points: penaltyPoints });
    }
    
    // Saves (GK only, 3 saves = 1 point)
    if (stats.saves > 0 && elementType === 1) {
      const savePoints = Math.floor(stats.saves / 3);
      if (savePoints > 0) {
        breakdown.push({ label: "Saves", value: stats.saves, points: savePoints });
      }
    }
    
    // Penalties saved
    if (stats.penalties_saved > 0) {
      breakdown.push({ label: "Penalties Saved", value: stats.penalties_saved, points: stats.penalties_saved * 5 });
    }
    
    // Penalties missed
    if (stats.penalties_missed > 0) {
      breakdown.push({ label: "Penalties Missed", value: stats.penalties_missed, points: stats.penalties_missed * -2 });
    }
    
    // Bonus
    if (stats.bonus > 0) {
      breakdown.push({ label: "Bonus", value: stats.bonus, points: stats.bonus });
    }
    
    // Yellow cards
    if (stats.yellow_cards > 0) {
      breakdown.push({ label: "Yellow Cards", value: stats.yellow_cards, points: stats.yellow_cards * -1 });
    }
    
    // Red cards
    if (stats.red_cards > 0) {
      breakdown.push({ label: "Red Cards", value: stats.red_cards, points: stats.red_cards * -3 });
    }
    
    // Own goals
    if (stats.own_goals > 0) {
      breakdown.push({ label: "Own Goals", value: stats.own_goals, points: stats.own_goals * -2 });
    }
    
    return breakdown;
  };

  // Handle player card click for points breakdown
  const handlePlayerCardClick = (player: any, isCaptain: boolean = false) => {
    const playerData = getPlayerData(player.element);
    const liveStats = getPlayerLiveStats(player.element);
    
    setSelectedPlayerForBreakdown({
      element: player.element,
      web_name: playerData?.web_name,
      first_name: playerData?.first_name,
      second_name: playerData?.second_name,
      element_type: playerData?.element_type,
      isCaptain,
      liveStats,
    });
    setShowPointsBreakdown(true);
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
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
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Team Data Unavailable</h3>
            <p className="text-gray-500 text-center max-w-md">
              Unable to fetch team data for this creator. The team information may not be publicly available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startingEleven = teamData?.picks?.slice(0, 11) || [];
  const substitutes = teamData?.picks?.slice(11) || [];

  const captain = teamData.picks?.find(p => p.is_captain);
  const viceCaptain = teamData.picks?.find(p => p.is_vice_captain);

  // Map starting eleven to PitchPlayer format for pitch view
  const pitchPlayers: PitchPlayer[] = startingEleven.map(pick => {
    const playerData = getPlayerData(pick.element);
    const teamDataForPlayer = bootstrapData?.teams?.find((t: any) => t.id === playerData?.team);
    
    return {
      element: pick.element,
      element_type: playerData?.element_type || 1,
      position: typeof pick.position === 'number' ? pick.position : parseInt(pick.position || '0'),
      is_captain: pick.is_captain,
      is_vice_captain: pick.is_vice_captain,
      multiplier: pick.multiplier,
      player_name: playerData ? `${playerData.first_name} ${playerData.second_name}` : 'Unknown Player',
      web_name: playerData?.web_name,
      team_name: teamDataForPlayer?.name || 'Unknown Team',
      team_short_name: teamDataForPlayer?.short_name,
      team_id: playerData?.team,
      team_code: teamDataForPlayer?.code,
      event_points: playerData?.event_points || 0,
      in_dreamteam: playerData?.in_dreamteam || false,
    };
  });

  // Map bench players to PitchPlayer format
  const benchPlayers: PitchPlayer[] = substitutes.map(pick => {
    const playerData = getPlayerData(pick.element);
    const teamDataForPlayer = bootstrapData?.teams?.find((t: any) => t.id === playerData?.team);
    
    return {
      element: pick.element,
      element_type: playerData?.element_type || 1,
      position: typeof pick.position === 'number' ? pick.position : parseInt(pick.position || '0'),
      is_captain: false,
      is_vice_captain: false,
      multiplier: pick.multiplier,
      player_name: playerData ? `${playerData.first_name} ${playerData.second_name}` : 'Unknown Player',
      web_name: playerData?.web_name,
      team_name: teamDataForPlayer?.name || 'Unknown Team',
      team_short_name: teamDataForPlayer?.short_name,
      team_id: playerData?.team,
      team_code: teamDataForPlayer?.code,
      event_points: playerData?.event_points || 0,
      in_dreamteam: playerData?.in_dreamteam || false,
    };
  });

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <Link href="/content-creators">
            <Button 
              variant="outline" 
              size="sm" 
              className="hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Creators
            </Button>
          </Link>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {(teamData?.creator || creatorInfo?.name || 'Creator').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {teamData?.creator || creatorInfo?.name || 'Creator'}'s Team
              </h1>
              <p className="text-muted-foreground text-lg">
                {teamData?.gameweek ? `Gameweek ${teamData.gameweek}` : 'Team Overview'}
              </p>
            </div>
          </div>
          
          {creatorInfo?.platform && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                {creatorInfo.platform === 'youtube' && <Youtube className="h-3 w-3" />}
                {creatorInfo.platform === 'twitter' && <Users className="h-3 w-3" />}
                {creatorInfo.platform}
              </Badge>
              {creatorInfo.handle && (
                <span className="text-sm text-muted-foreground">@{creatorInfo.handle}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Team Statistics */}
      {teamData?.entry_history && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    #{teamData.entry_history.overall_rank != null ? teamData.entry_history.overall_rank.toLocaleString() : 'N/A'}
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
                    £{(((teamData.entry_history.value || 0) - (teamData.entry_history.bank || 0)) / 10).toFixed(1)}m
                  </div>
                  <div className="text-sm text-muted-foreground">Squad Value</div>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500 bg-gradient-to-r from-teal-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-teal-700">
                    £{((teamData.entry_history.bank || 0) / 10).toFixed(1)}m
                  </div>
                  <div className="text-sm text-muted-foreground">Money in Bank</div>
                </div>
                <DollarSign className="h-8 w-8 text-teal-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* General Info Fallback */}
      {teamData?.general_info && !teamData.entry_history && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">{teamData.general_info.summary_overall_points}</div>
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
                    #{teamData.general_info.summary_overall_rank != null ? teamData.general_info.summary_overall_rank.toLocaleString() : 'N/A'}
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
                  <div className="text-xl font-bold text-blue-700">{teamData.general_info.name}</div>
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
                    {teamData.general_info.player_first_name} {teamData.general_info.player_last_name}
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
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1">
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Team Squad</h2>
                  
                  {/* View Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={teamView === "pitch" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTeamView("pitch")}
                      className="flex items-center gap-2"
                      data-testid="button-view-pitch"
                    >
                      <Eye className="h-4 w-4" />
                      Pitch View
                    </Button>
                    <Button
                      variant={teamView === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTeamView("list")}
                      className="flex items-center gap-2"
                      data-testid="button-view-list"
                    >
                      <List className="h-4 w-4" />
                      List View
                    </Button>
                  </div>
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
                          showFixtures={true}
                          onPlayerClick={(player) => handlePlayerCardClick(player, player.is_captain)}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* List View - Team Formation Display */}
                {teamView === "list" && (
                  <ListView
                    startingPlayers={pitchPlayers.map(p => ({
                      ...p,
                      now_cost: getPlayerData(p.element)?.now_cost,
                      form: getPlayerData(p.element)?.form,
                      selected_by_percent: getPlayerData(p.element)?.selected_by_percent,
                    }))}
                    benchPlayers={benchPlayers.map(p => ({
                      ...p,
                      now_cost: getPlayerData(p.element)?.now_cost,
                      form: getPlayerData(p.element)?.form,
                      selected_by_percent: getPlayerData(p.element)?.selected_by_percent,
                    }))}
                    title="Starting XI"
                    subtitle="Current team formation"
                    benchTitle="Bench"
                    benchSubtitle="Substitute players"
                    formatPrice={formatPrice}
                    getPositionName={(type) => getPositionFromElementType(type)}
                    getPlayerDisplay={(player) => {
                      const playerData = getPlayerData(player.element);
                      if (!playerData) return "0 pts";
                      return getPlayerDisplayPoints(playerData, playerData.team, player.is_captain);
                    }}
                    showForm={true}
                    showOwnership={true}
                    showPrice={true}
                    onPlayerClick={(listPlayer) => handlePlayerCardClick(listPlayer, listPlayer.is_captain)}
                  />
                )}
              </div>

              {/* Captain & Vice Captain Info */}
          {(captain || viceCaptain) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {captain && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Crown className="h-5 w-5 mr-2 text-yellow-600" />
                      Captain
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{captain.player_name}</p>
                        <p className="text-sm text-muted-foreground">{captain.team_name}</p>
                      </div>
                      <Badge className={getPositionColor(captain.position)}>
                        {captain.position}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {viceCaptain && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Crown className="h-5 w-5 mr-2 text-gray-600" />
                      Vice Captain
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{viceCaptain.player_name}</p>
                        <p className="text-sm text-muted-foreground">{viceCaptain.team_name}</p>
                      </div>
                      <Badge className={getPositionColor(viceCaptain.position)}>
                        {viceCaptain.position}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          {isLoadingTransfers ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transfersData && transfersData.length > 0 ? (
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
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
                    const playerIn = bootstrapData?.elements.find((p: any) => p.id === transfer.element_in);
                    const playerOut = bootstrapData?.elements.find((p: any) => p.id === transfer.element_out);
                    
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
                                    {bootstrapData?.teams.find((t: any) => t.id === playerIn.team)?.short_name || 'Unknown'} • {bootstrapData?.element_types.find((et: any) => et.id === playerIn.element_type)?.singular_name || 'Unknown'}
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
                                    {bootstrapData?.teams.find((t: any) => t.id === playerOut.team)?.short_name || 'Unknown'} • {bootstrapData?.element_types.find((et: any) => et.id === playerOut.element_type)?.singular_name || 'Unknown'}
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
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg">
              <CardContent className="text-center py-8">
                <div className="p-4 bg-orange-100 rounded-full w-fit mx-auto mb-4">
                  <ArrowLeftRight className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Transfers Yet</h3>
                <p className="text-gray-600">
                  No transfers have been made this season. Transfer history will appear here once transfers are made.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {historyLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (filteredCreatorHistory && filteredCreatorHistory.length > 0) || (filteredManagerHistory && filteredManagerHistory.length > 0) ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Gameweek History
                </h2>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>GW</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Overall Rank</TableHead>
                          <TableHead>GW Rank</TableHead>
                          <TableHead>Squad Value</TableHead>
                          <TableHead>Bank</TableHead>
                          <TableHead>Transfers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          // Use creator history if available and has data, otherwise use manager history
                          let dataToShow: any[] = [];
                          if (filteredCreatorHistory && filteredCreatorHistory.length > 0) {
                            dataToShow = filteredCreatorHistory.map(track => ({
                              event: track.gameweek,
                              points: track.gameweekPoints,
                              total_points: track.overallPoints,
                              overall_rank: track.overallRank,
                              rank: track.gameweekRank,
                              value: parseFloat(track.teamValue) * 10,
                              bank: track.bank ? parseFloat(track.bank) * 10 : 0,
                              event_transfers: track.totalTransfers,
                              event_transfers_cost: track.hitsTaken * 4
                            }));
                          } else if (filteredManagerHistory && filteredManagerHistory.length > 0) {
                            dataToShow = filteredManagerHistory;
                          }
                          
                          return dataToShow
                            .sort((a, b) => b.event - a.event)
                            .slice(0, 10)
                            .map((entry, index) => {
                              const prevEntry = filteredManagerHistory?.find(e => e.event === entry.event - 1);
                              const rankChange = prevEntry ? prevEntry.overall_rank - entry.overall_rank : null;
                            
                            return (
                              <TableRow key={entry.event}>
                                <TableCell className="font-medium">{entry.event}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    {entry.points}
                                    {entry.event_transfers_cost > 0 && (
                                      <span className="text-red-500 text-xs ml-1">
                                        (-{entry.event_transfers_cost})
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{entry.total_points?.toLocaleString() ?? '-'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    #{entry.overall_rank?.toLocaleString() ?? 'N/A'}
                                    {rankChange !== null && (
                                      <span className={`ml-2 flex items-center text-xs ${
                                        rankChange > 0 ? 'text-green-600' : rankChange < 0 ? 'text-red-600' : 'text-gray-500'
                                      }`}>
                                        {rankChange > 0 ? (
                                          <TrendingUp className="h-3 w-3 mr-1" />
                                        ) : rankChange < 0 ? (
                                          <TrendingDown className="h-3 w-3 mr-1" />
                                        ) : null}
                                        {rankChange !== 0 && Math.abs(rankChange).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>#{entry.rank?.toLocaleString() ?? 'N/A'}</TableCell>
                                <TableCell>£{((entry.value - (entry.bank || 0)) / 10).toFixed(1)}m</TableCell>
                                <TableCell>£{((entry.bank || 0) / 10).toFixed(1)}m</TableCell>
                                <TableCell>
                                  {entry.event_transfers > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {entry.event_transfers}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Summary */}
              {(filteredManagerHistory || filteredCreatorHistory) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-blue-700">
                            {filteredCreatorHistory && filteredCreatorHistory.length > 0
                              ? Math.round(
                                  filteredCreatorHistory.reduce((sum, track) => sum + track.gameweekPoints, 0) / 
                                  filteredCreatorHistory.length
                                )
                              : filteredManagerHistory 
                                ? Math.round(
                                    filteredManagerHistory.reduce((sum, entry) => sum + entry.points, 0) / 
                                    filteredManagerHistory.length
                                  )
                                : 0
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Points/GW</div>
                        </div>
                        <BarChart3 className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-green-700">
                            {filteredCreatorHistory && filteredCreatorHistory.length > 0
                              ? Math.max(...filteredCreatorHistory.map(track => track.gameweekPoints))
                              : filteredManagerHistory 
                                ? Math.max(...filteredManagerHistory.map(e => e.points))
                                : 0
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">Best GW</div>
                        </div>
                        <Trophy className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-purple-700">
                            #{filteredCreatorHistory && filteredCreatorHistory.length > 0
                              ? Math.min(...filteredCreatorHistory.map(track => track.overallRank).filter(r => r != null))?.toLocaleString() ?? 'N/A'
                              : filteredManagerHistory && filteredManagerHistory.length > 0
                                ? Math.min(...filteredManagerHistory.map(e => e.overall_rank).filter(r => r != null))?.toLocaleString() ?? 'N/A'
                                : 'N/A'
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">Best Rank</div>
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
                            {filteredCreatorHistory && filteredCreatorHistory.length > 0
                              ? filteredCreatorHistory.filter(track => track.totalTransfers > 0).length
                              : filteredManagerHistory 
                                ? filteredManagerHistory.filter(e => e.event_transfers > 0).length
                                : 0
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">Transfer GWs</div>
                        </div>
                        <RefreshCw className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Season History */}
              {managerHistory?.past && managerHistory.past.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Season History
                  </h2>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Season</TableHead>
                            <TableHead>Total Points</TableHead>
                            <TableHead>Overall Rank</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {managerHistory.past
                            .sort((a, b) => parseInt(b.season_name.split('/')[0]) - parseInt(a.season_name.split('/')[0]))
                            .map((season) => (
                              <TableRow key={season.season_name}>
                                <TableCell className="font-medium">{season.season_name}</TableCell>
                                <TableCell>{season.total_points?.toLocaleString() ?? '-'}</TableCell>
                                <TableCell>#{season.rank?.toLocaleString() ?? 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Performance history is not available for this creator.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>


        <TabsContent value="chips" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Chip Usage Summary
              </CardTitle>
              <CardDescription>
                Complete overview of FPL chip usage for this content creator
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
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
                      const usedChips = managerHistory?.chips?.map((chip: any) => chip.name) || [];
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
                        const usedChipsDetails = managerHistory?.chips?.filter((usedChip: any) => 
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
                <Badge className="bg-yellow-400 text-yellow-900 text-xs shrink-0">Captain (2x)</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            {selectedPlayerForBreakdown?.liveStats ? (
              <>
                <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Points</p>
                  <p className="text-3xl sm:text-4xl font-bold text-green-700">
                    {(selectedPlayerForBreakdown.liveStats.stats?.total_points || 0) * (selectedPlayerForBreakdown.isCaptain ? 2 : 1)}
                  </p>
                  {selectedPlayerForBreakdown.isCaptain && (
                    <p className="text-xs text-gray-500 mt-1">
                      ({selectedPlayerForBreakdown.liveStats.stats?.total_points} × 2 captain bonus)
                    </p>
                  )}
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <h4 className="font-semibold text-xs sm:text-sm text-gray-700 border-b pb-1">Points Breakdown</h4>
                  {getPointsBreakdown(selectedPlayerForBreakdown).length > 0 ? (
                    <div className="space-y-0.5 sm:space-y-1">
                      {getPointsBreakdown(selectedPlayerForBreakdown).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 sm:py-1.5 px-2 rounded hover:bg-gray-50 active:bg-gray-100 touch-manipulation">
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
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-2">No points yet</p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <p className="text-sm">No live data available for this player</p>
                <p className="text-xs sm:text-sm mt-1">Match may not have started yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
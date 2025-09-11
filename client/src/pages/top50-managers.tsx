import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3,
  Crown,
  DollarSign,
  Home,
  RefreshCw,
  Shield,
  Star,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  Activity,
  PieChart,
  ArrowUpDown,
} from "lucide-react";

type Top50Manager = {
  rank: number;
  name: string;
  managerId: number;
  latestTracking?: {
    gameweek: number;
    overallRank: number;
    overallPoints: number;
    gameweekPoints: number;
    gameweekRank?: number;
    teamValue: number;
    totalTransfers: number;
    chipsUsed?: number;
  };
};

// Team analysis types
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
  entry_history: {
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
}

interface Top50TeamResponse {
  managerId: number;
  name: string;
  rank: number;
  teamData: TeamData | null;
  success: boolean;
  error: string | null;
}

interface Top50BatchResponse {
  teams: Top50TeamResponse[];
  metadata: {
    totalRequested: number;
    totalSuccessful: number;
    totalFailed: number;
    gameweek: number;
    fetchedAt: string;
    cacheExpiresAt: string;
  };
}

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  selected_by_percent: string;
  event_points?: number;
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

interface ManagerTeamData {
  managerId: number;
  name: string;
  rank: number;
  teamData: TeamData | null;
  success: boolean;
  error: string | null;
}

// Helper functions for team analysis
function getPositionName(elementType: number): string {
  const positions: { [key: number]: string } = {
    1: "Goalkeeper",
    2: "Defender", 
    3: "Midfielder",
    4: "Forward"
  };
  return positions[elementType] || "Unknown";
}

function getPositionColor(elementType: number): string {
  const colors: { [key: number]: string } = {
    1: "bg-yellow-100 text-yellow-800 border-yellow-200",
    2: "bg-blue-100 text-blue-800 border-blue-200",
    3: "bg-green-100 text-green-800 border-green-200",
    4: "bg-red-100 text-red-800 border-red-200"
  };
  return colors[elementType] || "bg-gray-100 text-gray-800 border-gray-200";
}

function getPositionIcon(elementType: number) {
  const icons: { [key: number]: JSX.Element } = {
    1: <Shield className="h-4 w-4" />,
    2: <Shield className="h-4 w-4" />,
    3: <Target className="h-4 w-4" />,
    4: <Star className="h-4 w-4" />
  };
  return icons[elementType] || <Users className="h-4 w-4" />;
}

function formatPrice(price: number): string {
  return `£${(price / 10).toFixed(1)}m`;
}

function getRankBadgeVariant(rank?: number): "default" | "secondary" | "destructive" | "outline" {
  if (!rank) return "outline";
  if (rank <= 1000000) return "default";
  if (rank <= 3000000) return "secondary";
  return "destructive";
}

function getRankChangeDisplay(change: number | undefined) {
  if (!change || change === 0) return null;
  if (change > 0) {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        +{change.toLocaleString()}
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        {change.toLocaleString()}
      </div>
    );
  }
}

// Manager Table Row Component
function ManagerTableRow({ manager }: { manager: Top50Manager }) {
  const [, setLocation] = useLocation();

  const handleViewTeam = (rank: number) => {
    setLocation(`/top50-managers/${rank}/team`);
  };

  return (
    <TableRow 
      className="hover:bg-green-50 hover:shadow-md cursor-pointer transition-all duration-200 hover:border-l-4 hover:border-l-green-500" 
      onClick={() => handleViewTeam(manager.rank)}
      data-testid={`row-manager-${manager.rank}`}
      title="Click to view team details"
    >
      <TableCell>
        <div className="flex items-center">
          <div>
            <div className="font-medium">{manager.name}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {manager.latestTracking?.overallRank !== undefined && manager.latestTracking?.overallRank !== null ? (
          <div className="space-y-1">
            <Badge variant={getRankBadgeVariant(manager.latestTracking.overallRank)} className="font-mono">
              #{manager.latestTracking.overallRank.toLocaleString()}
            </Badge>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Loading...</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.overallPoints !== undefined && manager.latestTracking?.overallPoints !== null ? manager.latestTracking.overallPoints : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.gameweekPoints !== undefined && manager.latestTracking?.gameweekPoints !== null ? manager.latestTracking.gameweekPoints : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.teamValue !== undefined && manager.latestTracking?.teamValue !== null 
          ? `£${(manager.latestTracking.teamValue / 10).toFixed(1)}m` 
          : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.totalTransfers !== undefined && manager.latestTracking?.totalTransfers !== null ? manager.latestTracking.totalTransfers : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.chipsUsed !== undefined ? manager.latestTracking.chipsUsed : "N/A"}
      </TableCell>
    </TableRow>
  );
}

export default function Top50Managers() {
  const [managersWithData, setManagersWithData] = useState<Top50Manager[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch top 50 managers data from API
  const { data: top50Data } = useQuery<Top50Manager[]>({
    queryKey: ['/api/top50-managers'],
    retry: 2,
  });

  // Fetch bootstrap data
  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch Top 50 teams data using batch endpoint with React Query
  const { 
    data: top50TeamsResponse, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams,
    isFetching: isTeamDataRefreshing
  } = useQuery<Top50BatchResponse>({
    queryKey: ["/api/top50/teams"],
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes 
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Transform the API response to match the expected data structure
  const managersTeamData: ManagerTeamData[] = useMemo(() => {
    if (!top50TeamsResponse?.teams) {
      return [];
    }
    
    return top50TeamsResponse.teams.map(team => ({
      managerId: team.managerId,
      name: team.name,
      rank: team.rank,
      teamData: team.teamData,
      success: team.success,
      error: team.error
    }));
  }, [top50TeamsResponse]);

  // Helper functions for analysis (memoized for performance)
  const validTeams = useMemo(() => 
    managersTeamData.filter(m => m.teamData && m.success),
    [managersTeamData]
  );

  const validTeamsCount = validTeams.length;

  const getMostOwnedPlayers = useMemo(() => {
    if (!validTeams.length || !bootstrapData) return [];

    const playerOwnership: { [key: number]: { count: number; player: Player } } = {};

    validTeams.forEach(manager => {
      if (manager.teamData?.picks) {
        manager.teamData.picks.forEach(pick => {
          const player = bootstrapData.elements.find(p => p.id === pick.element);
          if (player) {
            if (!playerOwnership[pick.element]) {
              playerOwnership[pick.element] = { count: 0, player };
            }
            playerOwnership[pick.element].count++;
          }
        });
      }
    });

    return Object.values(playerOwnership)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      .map(item => ({
        ...item.player,
        ownership: item.count,
        ownershipPercent: Math.round((item.count / validTeams.length) * 100)
      }));
  }, [validTeams, bootstrapData]);

  const getCaptaincyAnalysis = useMemo(() => {
    if (!validTeams.length || !bootstrapData) return [];

    const captaincy: { [key: number]: { count: number; player: Player } } = {};
    const viceCaptaincy: { [key: number]: { count: number; player: Player } } = {};

    validTeams.forEach(manager => {
      if (manager.teamData?.picks) {
        manager.teamData.picks.forEach(pick => {
          const player = bootstrapData.elements.find(p => p.id === pick.element);
          if (player) {
            if (pick.is_captain) {
              if (!captaincy[pick.element]) {
                captaincy[pick.element] = { count: 0, player };
              }
              captaincy[pick.element].count++;
            }
            if (pick.is_vice_captain) {
              if (!viceCaptaincy[pick.element]) {
                viceCaptaincy[pick.element] = { count: 0, player };
              }
              viceCaptaincy[pick.element].count++;
            }
          }
        });
      }
    });

    const captains = Object.values(captaincy)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({
        ...item.player,
        captainCount: item.count,
        captainPercent: Math.round((item.count / validTeams.length) * 100),
        viceCaptainCount: viceCaptaincy[item.player.id]?.count || 0
      }));

    return captains;
  }, [validTeams, bootstrapData]);

  const getFormationAnalysis = useMemo(() => {
    if (!validTeams.length) return [];

    const formations: { [key: string]: number } = {};

    validTeams.forEach(manager => {
      if (manager.teamData?.picks) {
        const startingXI = manager.teamData.picks.slice(0, 11);
        const positionCounts = [0, 0, 0, 0]; // GK, DEF, MID, FWD
        
        startingXI.forEach(pick => {
          if (bootstrapData) {
            const player = bootstrapData.elements.find(p => p.id === pick.element);
            if (player) {
              positionCounts[player.element_type - 1]++;
            }
          }
        });
        
        const formation = `${positionCounts[1]}-${positionCounts[2]}-${positionCounts[3]}`;
        formations[formation] = (formations[formation] || 0) + 1;
      }
    });

    return Object.entries(formations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([formation, count]) => ({
        formation,
        count,
        percentage: Math.round((count / validTeams.length) * 100)
      }));
  }, [validTeams, bootstrapData]);

  const getChipAnalysis = useMemo(() => {
    if (!validTeams.length) return { activeChips: [], noChipCount: 0 };

    const chipCounts: { [key: string]: number } = {};
    let noChipCount = 0;

    validTeams.forEach(manager => {
      if (manager.teamData?.active_chip) {
        chipCounts[manager.teamData.active_chip] = (chipCounts[manager.teamData.active_chip] || 0) + 1;
      } else {
        noChipCount++;
      }
    });

    const activeChips = Object.entries(chipCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([chip, count]) => ({
        chip,
        count,
        percentage: Math.round((count / validTeams.length) * 100)
      }));

    return { activeChips, noChipCount };
  }, [validTeams]);

  const getBudgetAnalysis = useMemo(() => {
    if (!validTeams.length) return {
      avgValue: 0,
      maxValue: 0,
      minValue: 0,
      avgBank: 0
    };

    const values = validTeams
      .filter(m => m.teamData?.entry_history?.value)
      .map(m => m.teamData!.entry_history.value / 10);
    
    const banks = validTeams
      .filter(m => m.teamData?.entry_history?.bank !== undefined)
      .map(m => m.teamData!.entry_history.bank / 10);

    return {
      avgValue: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      maxValue: values.length ? Math.max(...values) : 0,
      minValue: values.length ? Math.min(...values) : 0,
      avgBank: banks.length ? banks.reduce((a, b) => a + b, 0) / banks.length : 0
    };
  }, [validTeams]);

  const refreshTeamData = () => {
    refetchTeams();
  };

  // Fetch latest tracking data for all managers
  const fetchManagerData = async (managerId: number) => {
    try {
      // Fetch basic manager data
      const [managerResponse, historyResponse] = await Promise.all([
        fetch(`/api/manager/${managerId}`),
        fetch(`/api/manager/${managerId}/history`)
      ]);
      
      if (managerResponse.ok && historyResponse.ok) {
        const managerData = await managerResponse.json();
        const historyData = await historyResponse.json();
        
        // Count chips used
        const chipsUsed = historyData.chips ? historyData.chips.length : 0;
        
        return {
          gameweek: managerData.current_event || 0,
          overallRank: managerData.summary_overall_rank,
          overallPoints: managerData.summary_overall_points,
          gameweekPoints: managerData.summary_event_points,
          teamValue: managerData.last_deadline_value,
          totalTransfers: managerData.last_deadline_total_transfers,
          chipsUsed: chipsUsed,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch data for manager ${managerId}:`, error);
    }
    return null;
  };

  const refreshAllData = async () => {
    if (!top50Data) return;
    setIsRefreshing(true);
    const updatedManagers = await Promise.all(
      top50Data.map(async (manager) => {
        const latestTracking = await fetchManagerData(manager.managerId);
        return {
          ...manager,
          latestTracking: latestTracking || undefined,
        };
      })
    );
    setManagersWithData(updatedManagers);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (top50Data) {
      setManagersWithData(top50Data);
      refreshAllData();
    }
  }, [top50Data]);

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Trophy className="h-8 w-8" />
              <h1>Top 50 FPL Managers (Current)</h1>
            </div>
            <p className="fpl-page-subtitle">
              Current top 50 Fantasy Premier League managers from the overall league
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="fpl-controls">
          <div className="fpl-controls-right">
            <Button
              onClick={refreshAllData}
              disabled={isRefreshing}
              variant="outline"
              className="hover:bg-blue-50"
              data-testid="button-refresh-data"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <Button
              onClick={refreshTeamData}
              disabled={isTeamDataRefreshing}
              variant="outline"
              className="hover:bg-green-50"
              data-testid="button-refresh-team-data"
            >
              <BarChart3 className={`h-4 w-4 mr-2 ${isTeamDataRefreshing ? 'animate-spin' : ''}`} />
              {isTeamDataRefreshing ? 'Refreshing Teams...' : 'Refresh Team Data'}
            </Button>
          </div>
        </div>

        {/* Main Content - Tabs */}
        <Tabs defaultValue="managers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="managers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Managers
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Team Analysis
            </TabsTrigger>
          </TabsList>

          {/* Managers Tab */}
          <TabsContent value="managers">
            {/* Managers Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manager</TableHead>
                <TableHead>Current Rank</TableHead>
                <TableHead className="text-right">Total Points</TableHead>
                <TableHead className="text-right">GW Points</TableHead>
                <TableHead className="text-right">Team Value</TableHead>
                <TableHead className="text-right">Transfers</TableHead>
                <TableHead className="text-right">Chips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managersWithData.length > 0 ? (
                managersWithData.map((manager) => (
                  <ManagerTableRow key={manager.rank} manager={manager} />
                ))
              ) : (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
          </TabsContent>

          {/* Team Analysis */}
          <TabsContent value="analysis">
            {teamsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : teamsError ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-red-600 mb-4">
                    <Activity className="h-12 w-12 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Failed to Load Team Data</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Unable to fetch team analysis data. Please try refreshing.
                  </p>
                  <Button onClick={refreshTeamData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="players" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Players
                  </TabsTrigger>
                  <TabsTrigger value="captains" className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Captains
                  </TabsTrigger>
                  <TabsTrigger value="formations" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Formations
                  </TabsTrigger>
                  <TabsTrigger value="budget" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Teams Analyzed */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teams Analyzed</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{validTeamsCount}</div>
                        <p className="text-xs text-muted-foreground">
                          out of 50 managers
                        </p>
                      </CardContent>
                    </Card>

                    {/* Average Team Value */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Team Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          £{getBudgetAnalysis.avgValue.toFixed(1)}m
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Range: £{getBudgetAnalysis.minValue.toFixed(1)}m - £{getBudgetAnalysis.maxValue.toFixed(1)}m
                        </p>
                      </CardContent>
                    </Card>

                    {/* Average Bank */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg In Bank</CardTitle>
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          £{getBudgetAnalysis.avgBank.toFixed(1)}m
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Available funds
                        </p>
                      </CardContent>
                    </Card>

                    {/* Most Popular Formation */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Formation</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {getFormationAnalysis[0]?.formation || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getFormationAnalysis[0]?.percentage || 0}% of managers
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Popular Players Preview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5" />
                          Most Owned Players
                        </CardTitle>
                        <CardDescription>
                          Top picks among the 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {getMostOwnedPlayers.slice(0, 5).map((player, idx) => (
                            <div key={player.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{player.web_name}</div>
                                  <div className="text-sm text-gray-600">
                                    {bootstrapData?.teams.find(t => t.id === player.team)?.short_name || 'Unknown'} • {formatPrice(player.now_cost)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">{player.ownershipPercent}%</div>
                                <div className="text-xs text-gray-600">{player.ownership}/{validTeamsCount}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Formation Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Formation Distribution
                        </CardTitle>
                        <CardDescription>
                          Popular tactical setups
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {getFormationAnalysis.slice(0, 5).map((formation, index) => (
                            <div key={formation.formation}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{formation.formation}</span>
                                <span className="text-sm text-gray-600">
                                  {formation.count} managers ({formation.percentage}%)
                                </span>
                              </div>
                              <Progress value={formation.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Players Tab */}
                <TabsContent value="players">
                  <Card>
                    <CardHeader>
                      <CardTitle>Player Ownership Analysis</CardTitle>
                      <CardDescription>
                        All players owned by Top 50 managers, sorted by popularity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Ownership</TableHead>
                            <TableHead>%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getMostOwnedPlayers.map((player, index) => (
                            <TableRow key={player.id} data-testid={`row-player-${player.id}`}>
                              <TableCell>
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {index + 1}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{player.web_name}</div>
                                <div className="text-sm text-gray-600">
                                  {player.first_name} {player.second_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getPositionColor(player.element_type)}>
                                  {getPositionIcon(player.element_type)}
                                  <span className="ml-1">{getPositionName(player.element_type)}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {bootstrapData?.teams.find(t => t.id === player.team)?.short_name || 'Unknown'}
                              </TableCell>
                              <TableCell className="font-mono">{formatPrice(player.now_cost)}</TableCell>
                              <TableCell className="font-semibold">{player.ownership}/{validTeamsCount}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={player.ownershipPercent} className="h-2 flex-1" />
                                  <span className="text-sm font-semibold w-10">{player.ownershipPercent}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Captains Tab */}
                <TabsContent value="captains">
                  <Card>
                    <CardHeader>
                      <CardTitle>Captaincy Analysis</CardTitle>
                      <CardDescription>
                        Captain and vice-captain choices among Top 50 managers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Captain</TableHead>
                            <TableHead>Vice Captain</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCaptaincyAnalysis.map((player) => (
                            <TableRow key={player.id} data-testid={`row-captain-${player.id}`}>
                              <TableCell>
                                <div className="font-medium">{player.web_name}</div>
                                <div className="text-sm text-gray-600">
                                  {player.first_name} {player.second_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getPositionColor(player.element_type)}>
                                  {getPositionIcon(player.element_type)}
                                  <span className="ml-1">{getPositionName(player.element_type)}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {bootstrapData?.teams.find(t => t.id === player.team)?.short_name || 'Unknown'}
                              </TableCell>
                              <TableCell className="font-mono">{formatPrice(player.now_cost)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                  <span className="font-semibold">{player.captainCount}</span>
                                  <span className="text-sm text-gray-600">({player.captainPercent}%)</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-gray-400" />
                                  <span className="font-semibold">{player.viceCaptainCount}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-bold text-blue-600">
                                  {player.captainCount + player.viceCaptainCount}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Formations Tab */}
                <TabsContent value="formations">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Formation Analysis</CardTitle>
                        <CardDescription>
                          Tactical preferences of Top 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {getFormationAnalysis.slice(0, 5).map((formation, index) => (
                            <div key={formation.formation}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{formation.formation}</span>
                                <span className="text-sm text-gray-600">
                                  {formation.count} managers ({formation.percentage}%)
                                </span>
                              </div>
                              <Progress value={formation.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Active Chips
                        </CardTitle>
                        <CardDescription>
                          Chip usage in current gameweek
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {getChipAnalysis.activeChips.length > 0 ? (
                            getChipAnalysis.activeChips.map((chip: { chip: string; count: number; percentage: number }) => (
                              <div key={chip.chip} className="flex justify-between items-center">
                                <span className="font-medium capitalize">{chip.chip.replace('_', ' ')}</span>
                                <div className="text-right">
                                  <div className="font-semibold">{chip.count} managers</div>
                                  <div className="text-xs text-gray-600">{chip.percentage}%</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-600">
                              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No active chips this gameweek</p>
                            </div>
                          )}
                          <div className="border-t pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">No Chip</span>
                              <div className="text-right">
                                <div className="font-bold">
                                  {Math.round((getChipAnalysis.noChipCount / validTeamsCount) * 100)}%
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {getChipAnalysis.noChipCount} managers
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Team Analysis */}
                <TabsContent value="analysis">
                  {teamsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                          <CardHeader>
                            <Skeleton className="h-6 w-40" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-20 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : teamsError ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <div className="text-red-600 mb-4">
                          <Activity className="h-12 w-12 mx-auto mb-2" />
                          <h3 className="text-lg font-semibold">Failed to Load Team Data</h3>
                        </div>
                        <p className="text-muted-foreground mb-4">
                          Unable to fetch team analysis data. Please try refreshing.
                        </p>
                        <Button onClick={refreshTeamData} variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      </CardContent>
                    </Card>
                  ) : validTeamsCount === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold mb-2">Loading Team Data...</h3>
                        <p className="text-gray-600 mb-4">
                          Fetching team information for all managers. This may take a moment.
                        </p>
                        <Button onClick={refreshTeamData} variant="outline" disabled={isTeamDataRefreshing}>
                          <RefreshCw className={`h-4 w-4 mr-2 ${isTeamDataRefreshing ? 'animate-spin' : ''}`} />
                          {isTeamDataRefreshing ? 'Loading...' : 'Retry Loading'}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="players" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Players
                  </TabsTrigger>
                  <TabsTrigger value="captains" className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Captains
                  </TabsTrigger>
                  <TabsTrigger value="formations" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Formations
                  </TabsTrigger>
                  <TabsTrigger value="budget" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Teams Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Analysis Status
                        </CardTitle>
                        <CardDescription>
                          Data loading progress for all Top 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-green-600 font-medium">Teams Loaded</span>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              {validTeamsCount}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-red-600 font-medium">Load Errors</span>
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              {50 - validTeamsCount}
                            </Badge>
                          </div>
                          <div className="pt-2">
                            <Progress value={(validTeamsCount / 50) * 100} className="h-2" />
                            <p className="text-sm text-muted-foreground mt-1">
                              {Math.round((validTeamsCount / 50) * 100)}% complete
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Most Popular Players */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Most Popular Players
                        </CardTitle>
                        <CardDescription>
                          Players owned by the most Top 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {getMostOwnedPlayers.slice(0, 8).map((player, index) => (
                            <div key={player.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{player.web_name}</div>
                                  <div className="text-xs text-gray-600">
                                    {bootstrapData?.teams.find(t => t.id === player.team)?.short_name} • {formatPrice(player.now_cost)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{player.ownershipPercent}%</div>
                                <div className="text-xs text-gray-600">{player.ownership}/50</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Formation Analysis */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="h-5 w-5" />
                          Popular Formations
                        </CardTitle>
                        <CardDescription>
                          Formation preferences among Top 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {getFormationAnalysis.slice(0, 5).map((formation, index) => (
                            <div key={formation.formation}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{formation.formation}</span>
                                <span className="text-sm text-gray-600">
                                  {formation.count} managers ({formation.percentage}%)
                                </span>
                              </div>
                              <Progress value={formation.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                </TabsContent>

                {/* Players Tab */}
                <TabsContent value="players">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Player Ownership Analysis
                      </CardTitle>
                      <CardDescription>
                        All players owned by Top 50 managers with ownership percentages
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Ownership</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getMostOwnedPlayers.map((player, index) => (
                            <TableRow key={player.id}>
                              <TableCell>
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {index + 1}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{player.web_name}</TableCell>
                              <TableCell>
                                {bootstrapData?.teams.find(t => t.id === player.team)?.short_name}
                              </TableCell>
                              <TableCell>
                                <Badge className={getPositionColor(player.element_type)}>
                                  {getPositionIcon(player.element_type)}
                                  <span className="ml-1">{getPositionName(player.element_type)}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>{formatPrice(player.now_cost)}</TableCell>
                              <TableCell className="text-right font-bold">{player.ownershipPercent}%</TableCell>
                              <TableCell className="text-right">{player.ownership}/50</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Captains Tab */}
                <TabsContent value="captains">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5" />
                        Captaincy Analysis
                      </CardTitle>
                      <CardDescription>
                        Most popular captain and vice-captain choices among Top 50 managers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Captain %</TableHead>
                            <TableHead className="text-right">Captain Count</TableHead>
                            <TableHead className="text-right">Vice Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCaptaincyAnalysis.map((player, index) => (
                            <TableRow key={player.id}>
                              <TableCell>
                                <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {index + 1}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{player.web_name}</TableCell>
                              <TableCell>
                                {bootstrapData?.teams.find(t => t.id === player.team)?.short_name}
                              </TableCell>
                              <TableCell>
                                <Badge className={getPositionColor(player.element_type)}>
                                  {getPositionIcon(player.element_type)}
                                  <span className="ml-1">{getPositionName(player.element_type)}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>{formatPrice(player.now_cost)}</TableCell>
                              <TableCell className="text-right font-bold">{player.captainPercent}%</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline">{player.captainCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{player.viceCaptainCount || 0}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Formations Tab */}
                <TabsContent value="formations">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Formation Analysis
                        </CardTitle>
                        <CardDescription>
                          Formation preferences among Top 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {getFormationAnalysis.map((formation, index) => (
                            <div key={formation.formation} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {index + 1}
                                  </div>
                                  <span className="font-medium text-lg">{formation.formation}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg">{formation.percentage}%</div>
                                  <div className="text-xs text-muted-foreground">{formation.count} managers</div>
                                </div>
                              </div>
                              <Progress value={formation.percentage} className="h-3" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="h-5 w-5" />
                          Formation Insights
                        </CardTitle>
                        <CardDescription>
                          Strategic analysis of formation trends
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                              Most Popular: {getFormationAnalysis[0]?.formation}
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {getFormationAnalysis[0]?.count} managers ({getFormationAnalysis[0]?.percentage}%) prefer this formation
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                              Formation Diversity
                            </h4>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {getFormationAnalysis.length} different formations used by Top 50 managers
                            </p>
                          </div>
                          {validTeamsCount > 40 && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <h4 className="font-semibold mb-2 text-purple-900 dark:text-purple-100">
                                Strategic Balance
                              </h4>
                              <p className="text-sm text-purple-700 dark:text-purple-300">
                                Top managers show varied tactical approaches with balanced formations
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Budget Tab */}
                <TabsContent value="budget">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team Values */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Team Values
                        </CardTitle>
                        <CardDescription>
                          Squad valuation analysis across Top 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">£{getBudgetAnalysis.avgValue.toFixed(1)}m</div>
                              <div className="text-sm text-blue-700 dark:text-blue-300">Average Value</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">£{getBudgetAnalysis.maxValue.toFixed(1)}m</div>
                              <div className="text-sm text-green-700 dark:text-green-300">Highest Value</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">£{getBudgetAnalysis.minValue.toFixed(1)}m</div>
                              <div className="text-sm text-orange-700 dark:text-orange-300">Lowest Value</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">£{getBudgetAnalysis.avgBank.toFixed(1)}m</div>
                              <div className="text-sm text-purple-700 dark:text-purple-300">Average Bank</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Budget Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Budget Management
                        </CardTitle>
                        <CardDescription>
                          Financial strategy insights from Top 50 managers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                            <h4 className="font-semibold mb-2">Squad Value Range</h4>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">£{getBudgetAnalysis.minValue.toFixed(1)}m</span>
                              <span className="text-sm">£{getBudgetAnalysis.maxValue.toFixed(1)}m</span>
                            </div>
                            <Progress 
                              value={((getBudgetAnalysis.avgValue - getBudgetAnalysis.minValue) / (getBudgetAnalysis.maxValue - getBudgetAnalysis.minValue)) * 100} 
                              className="h-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Average: £{getBudgetAnalysis.avgValue.toFixed(1)}m
                            </p>
                          </div>
                          
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <h4 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
                              Budget Utilization
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              Top 50 managers keep an average of £{getBudgetAnalysis.avgBank.toFixed(1)}m in the bank
                            </p>
                          </div>
                          
                          {validTeamsCount > 40 && (
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                              <h4 className="font-semibold mb-2 text-indigo-900 dark:text-indigo-100">
                                Elite Strategy
                              </h4>
                              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                Balanced approach between premium players and squad depth
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
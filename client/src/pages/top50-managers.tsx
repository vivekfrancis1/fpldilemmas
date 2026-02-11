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
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import { getSharedColumns, sortManagerData, GWTransferDetail } from "@/lib/manager-standings-columns";
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
  Users,
  Activity,
  PieChart,
} from "lucide-react";
import { LoadingExperience } from "@/components/loading-experience";

type Top50Manager = {
  rank: number;
  name: string;
  managerId: number;
  rankChange?: number | null;
  historyData?: {
    current: Array<{ event: number; event_transfers: number; event_transfers_cost: number }>;
    chips: Array<{ event: number; name: string }>;
  };
  latestTracking?: {
    gameweek: number;
    overallRank: number;
    overallPoints: number;
    gameweekPoints: number;
    gameweekRank?: number;
    teamValue: number;
    bank: number;
    totalTransfers: number;
    chipsUsed?: number;
    secondHalfChipsUsed?: number;
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


const getTop50ManagerColumns = (currentGameweek?: number, upcomingGameweek?: number, gwTransfersMap?: Record<number, GWTransferDetail[]>): ResponsiveTableColumn<Top50Manager>[] => {
  const nameCol: ResponsiveTableColumn<Top50Manager> = {
    key: 'name',
    header: 'Manager',
    priority: 'essential',
    align: 'left',
    mobileLabel: 'Manager',
    cardOrder: 1,
    render: (value, manager) => (
      <div className="font-medium">{manager.name}</div>
    )
  };

  const sharedCols = getSharedColumns<Top50Manager>({
    currentGameweek,
    upcomingGameweek,
    valueScale: 'raw',
    gwTransfersMap: gwTransfersMap as Record<number | string, GWTransferDetail[]>,
    gwTransfersKeyField: 'managerId',
  });

  return [nameCol, ...sharedCols];
};

// Cached API response type
interface CachedTop50Response {
  managers: Array<{
    rank: number;
    name: string;
    managerId: number;
    entryName?: string;
    total?: number;
    managerData?: {
      current_event: number;
      summary_overall_rank: number;
      summary_overall_points: number;
      summary_event_points: number;
      last_deadline_value: number;
      last_deadline_bank: number;
      last_deadline_total_transfers: number;
    };
    historyData?: {
      current: Array<{ event: number; event_transfers: number; event_transfers_cost: number }>;
      chips: Array<{ event: number; name: string }>;
    };
    success: boolean;
  }>;
  metadata: {
    totalManagers: number;
    successfulFetches: number;
    fetchedAt: string;
    cacheExpiresAt: string;
  };
  fromCache: boolean;
}

export default function Top50Managers() {
  const [managersWithData, setManagersWithData] = useState<Top50Manager[]>([]);
  const [sortField, setSortField] = useState<string>('latestTracking.overallRank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [, navigate] = useLocation();

  // Fetch cached Top 50 managers data (30-minute cache)
  const { data: cachedData, isLoading: isLoadingCached, refetch: refetchCached, isFetching: isRefreshing } = useQuery<CachedTop50Response>({
    queryKey: ['/api/cached/top50-managers-data'],
    staleTime: 25 * 60 * 1000, // Consider stale after 25 minutes (cache is 30 min)
    gcTime: 35 * 60 * 1000, // Keep in memory for 35 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Transform cached data to match component state
  useEffect(() => {
    if (cachedData?.managers) {
      const transformedManagers = cachedData.managers.map(m => {
        const chips = m.historyData?.chips || [];
        const secondHalfChipsUsed = chips.filter((c: { event: number }) => c.event >= 20).length;
        
        return {
          rank: m.rank,
          name: m.name,
          managerId: m.managerId,
          rankChange: null,
          latestTracking: m.managerData ? {
            gameweek: m.managerData.current_event || 0,
            overallRank: m.managerData.summary_overall_rank,
            overallPoints: m.managerData.summary_overall_points,
            gameweekPoints: m.managerData.summary_event_points,
            teamValue: m.managerData.last_deadline_value,
            bank: m.managerData.last_deadline_bank,
            totalTransfers: m.managerData.last_deadline_total_transfers,
            chipsUsed: chips.length,
            secondHalfChipsUsed: secondHalfChipsUsed,
          } : undefined,
          historyData: m.historyData ? {
            current: m.historyData.current || [],
            chips: m.historyData.chips || [],
          } : undefined,
        };
      });
      setManagersWithData(transformedManagers);
    }
  }, [cachedData]);

  // Force refresh function (clears cache and refetches)
  const forceRefresh = async () => {
    try {
      await fetch('/api/cached/top50-managers-data/refresh', { method: 'POST' });
      refetchCached();
    } catch (error) {
      console.error('Failed to force refresh:', error);
    }
  };

  // Fetch bootstrap data
  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get current and upcoming gameweek from bootstrap data
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return undefined;
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent?.id;
  }, [bootstrapData]);

  const upcomingGameweek = useMemo(() => {
    if (!bootstrapData?.events) return undefined;
    const nextEvent = bootstrapData.events.find((e: any) => e.is_next);
    if (nextEvent) return nextEvent.id;
    // Fallback to current + 1
    return currentGameweek ? Math.min(currentGameweek + 1, 38) : undefined;
  }, [bootstrapData, currentGameweek]);

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

  // Sorting logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // GW transfers query
  const managerIdsForTransfers = useMemo(() => 
    managersWithData.map(m => m.managerId).filter(id => id > 0),
    [managersWithData]
  );

  const { data: gwTransfersData } = useQuery<{ transfers: Record<number, GWTransferDetail[]>; gameweek: number }>({
    queryKey: ['/api/managers/gw-transfers', managerIdsForTransfers.join(',')],
    queryFn: async () => {
      const res = await fetch(`/api/managers/gw-transfers?managerIds=${managerIdsForTransfers.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch GW transfers');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: managerIdsForTransfers.length > 0,
  });

  // Sort the managers data
  const sortedManagersData = useMemo(() => {
    return sortManagerData(managersWithData, sortField, sortDirection, currentGameweek, 'raw', upcomingGameweek);
  }, [managersWithData, sortField, sortDirection, currentGameweek, upcomingGameweek]);

  // Show loading screen when bootstrap data is loading
  if (bootstrapLoading) {
    return (
      <LoadingExperience
        variant="table"
        title="Loading Top 50 Managers"
        description="Fetching FPL data and current top 50 manager standings..."
        steps={[
          { text: "Connecting to FPL API", delay: "0s" },
          { text: "Loading manager rankings", delay: "0.2s" },
          { text: "Preparing team analysis data", delay: "0.4s" },
        ]}
      />
    );
  }

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Trophy className="h-8 w-8" />
              <h1>Top FPL Managers (Current Season)</h1>
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
              onClick={forceRefresh}
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
          <ResponsiveTable
            data={sortedManagersData}
            columns={getTop50ManagerColumns(currentGameweek, upcomingGameweek, gwTransfersData?.transfers)}
            enableMobileCards={true}
            mobileCardTitle={(manager) => manager.name}
            loading={managersWithData.length === 0}
            emptyMessage="No manager data available"
            onRowClick={(manager) => {
              navigate(`/top50-managers/${manager.rank}/team`);
            }}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            className="hover:shadow-sm"
            stickyHeader={true}
            enableHorizontalScroll={true}
            getRowTestId={(manager, index) => `row-manager-${manager.rank || index}`}
            data-testid="top50-managers-table"
          />
        </CardContent>
        </Card>
          </TabsContent>

          {/* Team Analysis Tab */}
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
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Team Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        £{getBudgetAnalysis.avgValue.toFixed(1)}m
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Range: £{getBudgetAnalysis.minValue.toFixed(1)}m - £{getBudgetAnalysis.maxValue.toFixed(1)}m
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Bank</CardTitle>
                      <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        £{getBudgetAnalysis.avgBank.toFixed(1)}m
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Money in the bank
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Most Owned Players */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Most Owned Players
                    </CardTitle>
                    <CardDescription>
                      Popular picks among the top 50 managers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getMostOwnedPlayers.slice(0, 10).map((player, idx) => (
                        <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </Badge>
                            <div>
                              <div className="font-medium">{player.web_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatPrice(player.now_cost)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{player.ownershipPercent}%</div>
                            <div className="text-sm text-muted-foreground">
                              {player.ownership}/{validTeamsCount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Captaincy Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      Captaincy Choices
                    </CardTitle>
                    <CardDescription>
                      Most popular captain picks this gameweek
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getCaptaincyAnalysis.map((player, idx) => (
                        <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </Badge>
                            <div>
                              <div className="font-medium">{player.web_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatPrice(player.now_cost)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{player.captainPercent}%</div>
                            <div className="text-sm text-muted-foreground">
                              C: {player.captainCount} | VC: {player.viceCaptainCount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Formation Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Formation Analysis
                      </CardTitle>
                      <CardDescription>
                        Most popular formations used
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getFormationAnalysis.map((formation, idx) => (
                          <div key={formation.formation} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                                {idx + 1}
                              </Badge>
                              <span className="font-medium">{formation.formation}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formation.percentage}%</div>
                              <div className="text-sm text-muted-foreground">
                                {formation.count} teams
                              </div>
                            </div>
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
                        Chips being used this gameweek
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getChipAnalysis.activeChips.length > 0 ? (
                          getChipAnalysis.activeChips.map((chip, idx) => (
                            <div key={chip.chip} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                                  {idx + 1}
                                </Badge>
                                <span className="font-medium capitalize">{chip.chip}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">{chip.percentage}%</div>
                                <div className="text-sm text-muted-foreground">
                                  {chip.count} managers
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            No active chips this gameweek
                          </p>
                        )}
                        {getChipAnalysis.noChipCount > 0 && (
                          <div className="flex items-center justify-between">
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
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
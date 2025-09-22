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
  rankChange?: number | null;
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

function getRankChangeDisplay(change: number | undefined | null) {
  if (!change || change === 0) return null;
  if (change > 0) {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{change.toLocaleString()}
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        {change.toLocaleString()}
      </div>
    );
  }
}

// Column configuration for ResponsiveTable
const getTop50ManagerColumns = (): ResponsiveTableColumn<Top50Manager>[] => [
  {
    key: 'name',
    header: 'Manager',
    priority: 'essential',
    align: 'left',
    mobileLabel: 'Manager',
    cardOrder: 1,
    render: (value, manager) => (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="font-medium">{manager.name}</div>
          {getRankChangeDisplay(manager.rankChange)}
        </div>
      </div>
    )
  },
  {
    key: 'latestTracking.overallRank',
    header: 'Current Rank',
    priority: 'important',
    align: 'left',
    mobileLabel: 'Rank',
    cardOrder: 2,
    sortable: true,
    render: (value, manager) => {
      const rank = manager.latestTracking?.overallRank;
      if (rank !== undefined && rank !== null) {
        return (
          <div className="space-y-1">
            <Badge variant={getRankBadgeVariant(rank)} className="font-mono">
              #{rank.toLocaleString()}
            </Badge>
          </div>
        );
      }
      return <span className="text-muted-foreground text-sm">Loading...</span>;
    }
  },
  {
    key: 'latestTracking.overallPoints',
    header: 'Total Points',
    priority: 'important',
    align: 'right',
    mobileLabel: 'Points',
    cardOrder: 3,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const points = manager.latestTracking?.overallPoints;
      return points !== undefined && points !== null ? points : "N/A";
    }
  },
  {
    key: 'latestTracking.gameweekPoints',
    header: 'GW Points',
    priority: 'secondary',
    align: 'right',
    mobileLabel: 'GW Points',
    cardOrder: 4,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const gwPoints = manager.latestTracking?.gameweekPoints;
      return gwPoints !== undefined && gwPoints !== null ? gwPoints : "N/A";
    }
  },
  {
    key: 'latestTracking.teamValue',
    header: 'Team Value',
    priority: 'secondary',
    align: 'right',
    mobileLabel: 'Value',
    cardOrder: 5,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const teamValue = manager.latestTracking?.teamValue;
      return teamValue !== undefined && teamValue !== null 
        ? `£${(teamValue / 10).toFixed(1)}m` 
        : "N/A";
    }
  },
  {
    key: 'latestTracking.totalTransfers',
    header: 'Transfers',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Transfers',
    cardOrder: 6,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const transfers = manager.latestTracking?.totalTransfers;
      return transfers !== undefined && transfers !== null ? transfers : "N/A";
    }
  },
  {
    key: 'latestTracking.chipsUsed',
    header: 'Chips',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Chips',
    cardOrder: 7,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const chips = manager.latestTracking?.chipsUsed;
      return chips !== undefined ? chips : "N/A";
    }
  }
];

export default function Top50Managers() {
  const [managersWithData, setManagersWithData] = useState<Top50Manager[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState<string>('latestTracking.overallRank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [, navigate] = useLocation();

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

  // Sorting logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort the managers data
  const sortedManagersData = useMemo(() => {
    const sorted = [...managersWithData].sort((a, b) => {
      const getValue = (manager: Top50Manager, field: string) => {
        switch (field) {
          case 'latestTracking.overallRank':
            return manager.latestTracking?.overallRank || Number.MAX_SAFE_INTEGER;
          case 'latestTracking.overallPoints':
            return manager.latestTracking?.overallPoints || 0;
          case 'latestTracking.gameweekPoints':
            return manager.latestTracking?.gameweekPoints || 0;
          case 'latestTracking.teamValue':
            return manager.latestTracking?.teamValue || 0;
          case 'name':
            return manager.name;
          default:
            return 0;
        }
      };

      const aVal = getValue(a, sortField);
      const bVal = getValue(b, sortField);
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [managersWithData, sortField, sortDirection]);

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
          <ResponsiveTable
            data={sortedManagersData}
            columns={getTop50ManagerColumns()}
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
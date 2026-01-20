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
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Crown,
  DollarSign,
  Home,
  RefreshCw,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  ArrowUpDown,
  BarChart3,
} from "lucide-react";
import Top25TeamAnalysis from "./top25-team-analysis";
import { LoadingExperience } from "@/components/loading-experience";
import { calculateFreeTransfers } from "@/lib/free-transfers";

interface GWHistory {
  event: number;
  event_transfers: number;
  event_transfers_cost: number;
}

interface ChipUsage {
  event: number;
  name: string;
}

type Top25Manager = {
  rank: number;
  name: string;
  managerId: number;
  rankChange?: number | null;
  historyData?: {
    current: GWHistory[];
    chips: ChipUsage[];
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

const TOP_25_MANAGERS: Top25Manager[] = [
  { rank: 1, name: "Tom Dollimore", managerId: 497000 },
  { rank: 2, name: "Ben Crellin", managerId: 6586 },
  { rank: 3, name: "Fábio Borges", managerId: 4783108 },
  { rank: 4, name: "John Walsh", managerId: 1277598 },
  { rank: 5, name: "Abhinav C", managerId: 175376 },
  { rank: 6, name: "Harry Daniels", managerId: 1320 },
  { rank: 7, name: "» elevenify.com", managerId: 9325733 },
  { rank: 8, name: "Cameron Scott", managerId: 43164 },
  { rank: 9, name: "Huss E", managerId: 10421 },
  { rank: 10, name: "Khaled Zaki", managerId: 202269 },
  { rank: 11, name: "Rob Mayes", managerId: 294590 },
  { rank: 12, name: "Mark Hurst", managerId: 62110 },
  { rank: 13, name: "Jesper Øiestad", managerId: 4455 },
  { rank: 14, name: "Even Skärholen", managerId: 227102 },
  { rank: 15, name: "Tom N", managerId: 386057 },
  { rank: 16, name: "Anthony Moylette", managerId: 78351 },
  { rank: 17, name: "Lukasz Woźniak", managerId: 859923 },
  { rank: 18, name: "Michael Giovanni", managerId: 69716 },
  { rank: 19, name: "Tommy Shinton", managerId: 155602 },
  { rank: 20, name: "Sean Connors", managerId: 207939 },
  { rank: 21, name: "Raphael Crettol", managerId: 1559332 },
  { rank: 22, name: "Simon MacNair", managerId: 742000 },
  { rank: 23, name: "Jovan Popović", managerId: 226819 },
  { rank: 24, name: "William Johansson", managerId: 3676 },
  { rank: 25, name: "Louis Reddington", managerId: 121680 },
];

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
const getTop25ManagerColumns = (currentGameweek?: number): ResponsiveTableColumn<Top25Manager>[] => [
  {
    key: 'rank',
    header: 'Rank',
    priority: 'essential',
    align: 'center',
    mobileLabel: 'Rank',
    cardOrder: 1,
    sortable: true,
    render: (value, manager) => (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
        <span className="text-white font-bold text-sm">#{manager.rank}</span>
      </div>
    )
  },
  {
    key: 'name',
    header: 'Manager',
    priority: 'essential',
    align: 'left',
    mobileLabel: 'Manager',
    cardOrder: 2,
    sortable: true,
    render: (value, manager) => (
      <div className="font-medium">{manager.name}</div>
    )
  },
  {
    key: 'latestTracking.overallRank',
    header: 'Current Rank',
    priority: 'important',
    align: 'left',
    mobileLabel: 'Current Rank',
    cardOrder: 3,
    sortable: true,
    render: (value, manager) => {
      const rank = manager.latestTracking?.overallRank;
      if (rank !== undefined && rank !== null) {
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={getRankBadgeVariant(rank)} className="font-mono">
                #{rank.toLocaleString()}
              </Badge>
              {getRankChangeDisplay(manager.rankChange ?? undefined)}
            </div>
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
    cardOrder: 4,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const points = manager.latestTracking?.overallPoints;
      return points !== undefined && points !== null ? points : "N/A";
    }
  },
  {
    key: 'latestTracking.gameweekPoints',
    header: currentGameweek ? `GW ${currentGameweek} Points` : 'GW Points',
    priority: 'secondary',
    align: 'right',
    mobileLabel: currentGameweek ? `GW ${currentGameweek}` : 'GW Points',
    cardOrder: 5,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const gwPoints = manager.latestTracking?.gameweekPoints;
      return gwPoints !== undefined && gwPoints !== null ? gwPoints : "N/A";
    }
  },
  {
    key: 'latestTracking.squadValue',
    header: 'Squad Value',
    priority: 'secondary',
    align: 'right',
    mobileLabel: 'Squad',
    cardOrder: 6,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const teamValue = manager.latestTracking?.teamValue;
      const bank = manager.latestTracking?.bank;
      if (teamValue === undefined || teamValue === null) return "N/A";
      const bankValue = bank !== undefined && bank !== null ? bank : 0;
      return `£${((teamValue - bankValue) / 10).toFixed(1)}m`;
    }
  },
  {
    key: 'latestTracking.bank',
    header: 'Bank',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Bank',
    cardOrder: 7,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const bank = manager.latestTracking?.bank;
      return bank !== undefined && bank !== null 
        ? `£${(bank / 10).toFixed(1)}m` 
        : "£0.0m";
    }
  },
  {
    key: 'freeTransfers',
    header: 'FT (GW23)',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'FT',
    cardOrder: 7,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const history = manager.historyData?.current;
      const chips = manager.historyData?.chips;
      if (!history || history.length === 0) return "N/A";
      
      const freeTransfers = calculateFreeTransfers(history, chips, 23);
      return freeTransfers;
    }
  },
  {
    key: 'chipsAvailable',
    header: 'Chips Available',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Chips',
    cardOrder: 8,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      // 4 chips available in second half of season (GW 20+)
      const secondHalfChipsUsed = manager.latestTracking?.secondHalfChipsUsed || 0;
      const chipsAvailable = Math.max(0, 4 - secondHalfChipsUsed);
      return chipsAvailable;
    }
  }
];

interface BootstrapData {
  events: Array<{
    id: number;
    is_current: boolean;
    is_next: boolean;
  }>;
}

// Cached API response type
interface CachedManagersResponse {
  managers: Array<{
    rank: number;
    name: string;
    managerId: number;
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

export default function Top25Managers() {
  const [managersWithData, setManagersWithData] = useState<Top25Manager[]>(TOP_25_MANAGERS);
  const [sortField, setSortField] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [, navigate] = useLocation();

  // Fetch bootstrap data for current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Get current gameweek from bootstrap data
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return undefined;
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent?.id;
  }, [bootstrapData]);

  // Fetch cached Top 25 managers data (30-minute cache)
  const { data: cachedData, isLoading: isLoadingCached, refetch: refetchCached, isFetching: isRefreshing } = useQuery<CachedManagersResponse>({
    queryKey: ['/api/cached/top25-managers-data'],
    staleTime: 25 * 60 * 1000, // Consider stale after 25 minutes (cache is 30 min)
    gcTime: 35 * 60 * 1000, // Keep in memory for 35 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch top 50 managers with rank change data
  const { data: top50Data, isLoading: isLoadingTop50 } = useQuery({
    queryKey: ['/api/top50-managers'],
    refetchInterval: 30000,
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
          rankChange: null
        };
      });
      setManagersWithData(transformedManagers);
    }
  }, [cachedData]);

  // Update managers with rank change data when top50Data is available
  useEffect(() => {
    if (top50Data && Array.isArray(top50Data) && managersWithData.length > 0) {
      const updatedManagers = managersWithData.map(manager => {
        const top50Manager = (top50Data as any[]).find((m: any) => m.managerId === manager.managerId);
        return {
          ...manager,
          rankChange: top50Manager?.rankChange || null
        };
      });
      setManagersWithData(updatedManagers);
    }
  }, [top50Data]);

  // Force refresh function (clears cache and refetches)
  const forceRefresh = async () => {
    try {
      await fetch('/api/cached/top25-managers-data/refresh', { method: 'POST' });
      refetchCached();
    } catch (error) {
      console.error('Failed to force refresh:', error);
    }
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

  // Sort the managers data
  const sortedManagersData = useMemo(() => {
    const sorted = [...managersWithData].sort((a, b) => {
      const getValue = (manager: Top25Manager, field: string) => {
        switch (field) {
          case 'rank':
            return manager.rank;
          case 'latestTracking.overallRank':
            return manager.latestTracking?.overallRank || Number.MAX_SAFE_INTEGER;
          case 'latestTracking.overallPoints':
            return manager.latestTracking?.overallPoints || 0;
          case 'latestTracking.gameweekPoints':
            return manager.latestTracking?.gameweekPoints || 0;
          case 'latestTracking.teamValue':
            return manager.latestTracking?.teamValue || 0;
          case 'latestTracking.squadValue': {
            const teamValue = manager.latestTracking?.teamValue || 0;
            const bank = manager.latestTracking?.bank || 0;
            return teamValue - bank;
          }
          case 'latestTracking.bank':
            return manager.latestTracking?.bank || 0;
          case 'freeTransfers':
            const history = manager.historyData?.current;
            const chips = manager.historyData?.chips;
            if (!history || history.length === 0) return 0;
            return calculateFreeTransfers(history, chips, 23);
          case 'chipsAvailable':
            // 4 chips in second half - second half chips used
            return 4 - (manager.latestTracking?.secondHalfChipsUsed || 0);
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

  // Show loading screen on initial load
  const hasNoTrackingData = managersWithData.every(m => !m.latestTracking);
  if (isRefreshing && hasNoTrackingData) {
    return (
      <LoadingExperience
        variant="table"
        title="Loading Top 25 Managers"
        description="Fetching live data for all 25 elite FPL managers..."
        steps={[
          { text: "Retrieving manager profiles", delay: "0s" },
          { text: "Fetching current rankings and points", delay: "0.2s" },
          { text: "Calculating team values and transfers", delay: "0.4s" },
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
              <Crown className="h-8 w-8" />
              <h1>Top 25 Managers (All Time)</h1>
            </div>
            <p className="fpl-page-subtitle">
              Elite Fantasy Premier League managers and their current standings
            </p>
          </div>
        </div>

        <Tabs defaultValue="managers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="managers" data-testid="tab-managers">
              <Crown className="h-4 w-4 mr-2" />
              Managers
            </TabsTrigger>
            <TabsTrigger value="team-analysis" data-testid="tab-team-analysis">
              <BarChart3 className="h-4 w-4 mr-2" />
              Team Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="managers">
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
              </div>
            </div>

            {/* Managers Table */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <ResponsiveTable
                  data={sortedManagersData}
                  columns={getTop25ManagerColumns(currentGameweek)}
                  enableMobileCards={true}
                  mobileCardTitle={(manager) => manager.name}
                  loading={isRefreshing}
                  emptyMessage="No manager data available"
                  onRowClick={(manager) => {
                    navigate(`/top25-managers/${manager.rank}/team`);
                  }}
                  onSort={handleSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  className="hover:shadow-sm"
                  stickyHeader={true}
                  enableHorizontalScroll={true}
                  getRowTestId={(manager, index) => `row-manager-${manager.rank || index}`}
                  data-testid="top25-managers-table"
                />
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Data based on{' '}
                <a 
                  href="https://www.fplresearch.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  FPL Research
                </a>{' '}
                as on January 20, 2026
              </p>
            </div>
          </TabsContent>

          <TabsContent value="team-analysis">
            <Top25TeamAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
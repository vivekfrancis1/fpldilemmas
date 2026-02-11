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
  Users,
  BarChart3,
} from "lucide-react";
import Top25TeamAnalysis from "./top25-team-analysis";
import { LoadingExperience } from "@/components/loading-experience";
import { getSharedColumns, sortManagerData, GWTransferDetail, GWHistory, ChipUsage } from "@/lib/manager-standings-columns";

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

const getTop25ManagerColumns = (currentGameweek?: number, gwTransfersMap?: Record<number, GWTransferDetail[]>, upcomingGameweek?: number): ResponsiveTableColumn<Top25Manager>[] => {
  const allTimeRankCol: ResponsiveTableColumn<Top25Manager> = {
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
  };

  const nameCol: ResponsiveTableColumn<Top25Manager> = {
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
  };

  const sharedCols = getSharedColumns<Top25Manager>({
    currentGameweek,
    upcomingGameweek,
    valueScale: 'raw',
    gwTransfersMap: gwTransfersMap as Record<number | string, GWTransferDetail[]>,
    gwTransfersKeyField: 'managerId',
  });

  return [allTimeRankCol, nameCol, ...sharedCols];
};

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

  const upcomingGameweek = useMemo(() => {
    if (!bootstrapData?.events) return currentGameweek ? currentGameweek + 1 : undefined;
    const nextEvent = bootstrapData.events.find(e => e.is_next);
    return nextEvent?.id || (currentGameweek ? currentGameweek + 1 : undefined);
  }, [bootstrapData, currentGameweek]);

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

  const managerIds = TOP_25_MANAGERS.map(m => m.managerId);
  const { data: gwTransfersData } = useQuery<{ transfers: Record<number, GWTransferDetail[]>; gameweek: number }>({
    queryKey: ['/api/managers/gw-transfers', managerIds.join(',')],
    queryFn: async () => {
      const res = await fetch(`/api/managers/gw-transfers?managerIds=${managerIds.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch GW transfers');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
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
    if (sortField === 'rank') {
      const sorted = [...managersWithData].sort((a, b) => {
        return sortDirection === 'asc' ? a.rank - b.rank : b.rank - a.rank;
      });
      return sorted;
    }
    return sortManagerData(managersWithData, sortField, sortDirection, currentGameweek, 'raw', upcomingGameweek);
  }, [managersWithData, sortField, sortDirection, currentGameweek, upcomingGameweek]);

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
              <h1>Top FPL Managers (All Time)</h1>
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
                  columns={getTop25ManagerColumns(currentGameweek, gwTransfersData?.transfers, upcomingGameweek)}
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
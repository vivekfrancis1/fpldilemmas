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
  History,
  Home,
  Loader2,
  RefreshCw,
  Trophy,
  Users,
  BarChart3,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Top25TeamAnalysis from "./top25-team-analysis";
import { LoadingExperience } from "@/components/loading-experience";
import { getSharedColumns, sortManagerData, GWTransferDetail, GWHistory, ChipUsage, getChipLabel } from "@/lib/manager-standings-columns";

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
  projected_points?: number;
  projected_bench_points?: number;
  active_chip?: string | null;
};

const TOP_25_MANAGERS: Top25Manager[] = [
  { rank: 1, name: "Cameron Scott", managerId: 43164 },
  { rank: 2, name: "Tom Dollimore", managerId: 497000 },
  { rank: 3, name: "- elevenify.com", managerId: 9325733 },
  { rank: 4, name: "Ben Crellin", managerId: 6586 },
  { rank: 5, name: "Fábio Borges", managerId: 4783108 },
  { rank: 6, name: "John Walsh", managerId: 1277598 },
  { rank: 7, name: "Michael Giovanni", managerId: 69716 },
  { rank: 8, name: "Abinav C", managerId: 175376 },
  { rank: 9, name: "Harry Daniels", managerId: 1320 },
  { rank: 10, name: "Uzair Rizwan", managerId: 642254 },
  { rank: 11, name: "Huss E", managerId: 10421 },
  { rank: 12, name: "Simon MacNair", managerId: 742000 },
  { rank: 13, name: "Sam Hackett", managerId: 143684 },
  { rank: 14, name: "Mark Hurst", managerId: 62110 },
  { rank: 15, name: "Dan Wright", managerId: 13498 },
  { rank: 16, name: "Rob Mayes", managerId: 294590 },
  { rank: 17, name: "Sam McKenzie", managerId: 256195 },
  { rank: 18, name: "-Calm -", managerId: 18383 },
  { rank: 19, name: "Calum Miller", managerId: 10285 },
  { rank: 20, name: "Ahmed Mohamed", managerId: 481452 },
  { rank: 21, name: "Tom N", managerId: 386057 },
  { rank: 22, name: "Elaine Ridgewell", managerId: 182534 },
  { rank: 23, name: "Jesper Øiestad", managerId: 4455 },
  { rank: 24, name: "Jonas Fougner", managerId: 12555 },
  { rank: 25, name: "Jovan Popović", managerId: 226819 },
];

const getTop25ManagerColumns = (currentGameweek?: number, gwTransfersMap?: Record<number, GWTransferDetail[]>, upcomingGameweek?: number, projectionGW?: number): ResponsiveTableColumn<Top25Manager>[] => {
  const xPtsGW = projectionGW ?? upcomingGameweek;
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

  const xPtsCol: ResponsiveTableColumn<Top25Manager> = {
    key: 'projected_points',
    header: xPtsGW ? <span className="leading-tight">xPts<br/>GW{xPtsGW}</span> : 'xPts',
    priority: 'secondary',
    align: 'right',
    mobileLabel: xPtsGW ? `xPts GW${xPtsGW}` : 'xPts',
    cardOrder: 3,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => (
      <div className="text-purple-600">
        <span>{manager.projected_points != null ? manager.projected_points.toFixed(1) : '-'}</span>
      </div>
    )
  };

  const chipCol: ResponsiveTableColumn<Top25Manager> = {
    key: 'active_chip',
    header: xPtsGW ? <span className="leading-tight">Chip<br/>GW{xPtsGW}</span> : 'Chip',
    priority: 'secondary',
    align: 'center',
    mobileLabel: xPtsGW ? `Chip GW${xPtsGW}` : 'Chip',
    cardOrder: 4,
    render: (value, manager) => (
      <div className="text-center">
        {manager.active_chip && getChipLabel(manager.active_chip) ? (
          <span className="text-xs font-medium px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">{getChipLabel(manager.active_chip)}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </div>
    )
  };

  const sharedCols = getSharedColumns<Top25Manager>({
    currentGameweek,
    upcomingGameweek,
    valueScale: 'raw',
    gwTransfersMap: gwTransfersMap as Record<number | string, GWTransferDetail[]>,
    gwTransfersKeyField: 'managerId',
  });

  // Column order: Rank | Manager | Overall Rank | Rank Gain | Total Pts | Pts (GW) | xPts (GW) | Chip (GW) | ...rest
  return [allTimeRankCol, nameCol, ...sharedCols.slice(0, 4), xPtsCol, chipCol, ...sharedCols.slice(4)];
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
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [historicalSortField, setHistoricalSortField] = useState<string>('rank');
  const [historicalSortDirection, setHistoricalSortDirection] = useState<'asc' | 'desc'>('asc');
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

  const managerIds = useMemo(() => {
    if (cachedData?.managers) {
      return cachedData.managers.map(m => m.managerId);
    }
    return TOP_25_MANAGERS.map(m => m.managerId);
  }, [cachedData]);

  const { data: gwTransfersData } = useQuery<{ transfers: Record<number, GWTransferDetail[]>; gameweek: number }>({
    queryKey: ['/api/managers/gw-transfers', managerIds.join(',')],
    queryFn: async () => {
      const res = await fetch(`/api/managers/gw-transfers?managerIds=${managerIds.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch GW transfers');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  interface BatchProjectedResult {
    managerId: number;
    projected_points: number;
    projected_bench_points: number;
    active_chip: string | null;
  }

  const { data: projectedData } = useQuery<{ managers: BatchProjectedResult[]; gameweek: number }>({
    queryKey: ['/api/managers/batch-projected-points', managerIds],
    queryFn: async () => {
      const res = await fetch('/api/managers/batch-projected-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerIds })
      });
      if (!res.ok) throw new Error('Failed to fetch projected points');
      return res.json();
    },
    enabled: managerIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const projectedPointsMap = useMemo(() => {
    const map = new Map<number, BatchProjectedResult>();
    if (projectedData?.managers) {
      for (const m of projectedData.managers) {
        map.set(m.managerId, m);
      }
    }
    return map;
  }, [projectedData]);

  // Transform cached data to match component state
  useEffect(() => {
    if (cachedData?.managers) {
      const transformedManagers = cachedData.managers.map(m => {
        const chips = m.historyData?.chips || [];
        const secondHalfChipsUsed = chips.filter((c: { event: number }) => c.event >= 20).length;
        const projData = projectedPointsMap.get(m.managerId);
        
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
          rankChange: (() => {
            const current = m.historyData?.current;
            if (current && current.length >= 2) {
              const latest = current[current.length - 1];
              const previous = current[current.length - 2];
              if (latest?.overall_rank && previous?.overall_rank) {
                return previous.overall_rank - latest.overall_rank;
              }
            }
            return null;
          })(),
          projected_points: projData?.projected_points,
          projected_bench_points: projData?.projected_bench_points,
          active_chip: projData?.active_chip,
        };
      });
      setManagersWithData(transformedManagers);
    }
  }, [cachedData, projectedPointsMap]);

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

  const { data: pastSeasonsData, isLoading: isPastSeasonsLoading } = useQuery<{ seasons: string[]; managers: any[] }>({
    queryKey: ['/api/managers/past-seasons', 'top25'],
    queryFn: async () => {
      const res = await fetch('/api/managers/past-seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerIds: TOP_25_MANAGERS.map(m => m.managerId),
          managerNames: TOP_25_MANAGERS.map(m => ({ managerId: m.managerId, playerName: m.name, entryName: '' })),
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch past seasons');
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (pastSeasonsData?.seasons?.length && !selectedSeason) {
      setSelectedSeason(pastSeasonsData.seasons[0]);
    }
  }, [pastSeasonsData?.seasons]);

  const historicalStandings = useMemo(() => {
    if (!pastSeasonsData?.managers || !selectedSeason) return [];
    return pastSeasonsData.managers
      .map((m: any) => {
        const seasonData = m.past.find((s: any) => s.season_name === selectedSeason);
        return {
          managerId: m.managerId,
          playerName: m.playerName,
          entryName: m.entryName,
          played: !!seasonData,
          totalPoints: seasonData?.total_points ?? null,
          rank: seasonData?.rank ?? null,
        };
      })
      .sort((a: any, b: any) => {
        if (historicalSortField === 'player_name') {
          const cmp = (a.playerName || '').localeCompare(b.playerName || '');
          return historicalSortDirection === 'asc' ? cmp : -cmp;
        }
        if (!a.played && !b.played) return 0;
        if (!a.played) return 1;
        if (!b.played) return -1;
        const aVal = historicalSortField === 'total_points' ? a.totalPoints : a.rank;
        const bVal = historicalSortField === 'total_points' ? b.totalPoints : b.rank;
        if (historicalSortField === 'rank') {
          if (!aVal && !bVal) return 0;
          if (!aVal) return 1;
          if (!bVal) return -1;
        }
        if (historicalSortField === 'total_points') {
          return historicalSortDirection === 'desc' ? (bVal - aVal) : (aVal - bVal);
        }
        return historicalSortDirection === 'asc' ? (aVal - bVal) : (bVal - aVal);
      });
  }, [pastSeasonsData, selectedSeason, historicalSortField, historicalSortDirection]);

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
                  columns={getTop25ManagerColumns(currentGameweek, gwTransfersData?.transfers, upcomingGameweek, projectedData?.gameweek ?? currentGameweek)}
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

            {/* Previous Seasons */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="fpl-heading-card flex items-center gap-2 text-base sm:text-lg">
                    <History className="h-4 w-4 sm:h-5 sm:w-5" />
                    Previous Seasons
                  </CardTitle>
                  <Select value={selectedSeason} onValueChange={(v) => setSelectedSeason(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Season" />
                    </SelectTrigger>
                    <SelectContent>
                      {(pastSeasonsData?.seasons || []).map((season: string) => (
                        <SelectItem key={season} value={season}>{season}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-muted-foreground text-sm">
                  {selectedSeason
                    ? `${selectedSeason} season — ${historicalStandings.filter((m: any) => m.played).length} of ${historicalStandings.length} managers played`
                    : 'Select a season to view past performance'}
                </p>
              </CardHeader>
              <CardContent>
                {isPastSeasonsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <span className="ml-3 text-muted-foreground">Loading historical data...</span>
                  </div>
                ) : !selectedSeason ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Choose a season from the dropdown above.
                  </div>
                ) : historicalStandings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for {selectedSeason}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50/80">
                          <th className="px-2 sm:px-3 py-2 text-left font-medium text-muted-foreground w-10 sm:w-12">#</th>
                          <th
                            className="px-2 sm:px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-gray-900"
                            onClick={() => {
                              if (historicalSortField === 'player_name') {
                                setHistoricalSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistoricalSortField('player_name');
                                setHistoricalSortDirection('asc');
                              }
                            }}
                          >
                            Manager {historicalSortField === 'player_name' && (historicalSortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                          <th
                            className="px-2 sm:px-3 py-2 text-right font-medium text-muted-foreground cursor-pointer hover:text-gray-900"
                            onClick={() => {
                              if (historicalSortField === 'total_points') {
                                setHistoricalSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistoricalSortField('total_points');
                                setHistoricalSortDirection('desc');
                              }
                            }}
                          >
                            <span className="hidden sm:inline">Total Points</span><span className="sm:hidden">Pts</span> {historicalSortField === 'total_points' && (historicalSortDirection === 'desc' ? '▼' : '▲')}
                          </th>
                          <th
                            className="px-2 sm:px-3 py-2 text-right font-medium text-muted-foreground cursor-pointer hover:text-gray-900"
                            onClick={() => {
                              if (historicalSortField === 'rank') {
                                setHistoricalSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                              } else {
                                setHistoricalSortField('rank');
                                setHistoricalSortDirection('asc');
                              }
                            }}
                          >
                            <span className="hidden sm:inline">Overall Rank</span><span className="sm:hidden">Rank</span> {historicalSortField === 'rank' && (historicalSortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalStandings.map((entry: any, index: number) => (
                          <tr
                            key={entry.managerId}
                            className="border-b hover:bg-gray-50/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/manager-team/${entry.managerId}`)}
                          >
                            <td className="px-2 sm:px-3 py-2">
                              {entry.played ? (
                                <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-semibold ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                  index === 1 ? 'bg-gray-100 text-gray-800' :
                                  index === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-50 text-blue-700'
                                }`}>
                                  {index + 1}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-3 py-2">
                              <div className="font-medium text-sm truncate max-w-[140px] sm:max-w-none">{entry.playerName}</div>
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-right font-mono font-semibold text-xs sm:text-sm">
                              {entry.played ? entry.totalPoints?.toLocaleString() : (
                                <span className="text-gray-400 text-[10px] sm:text-xs">Did not play</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-right font-mono text-xs sm:text-sm">
                              {entry.played && entry.rank ? entry.rank.toLocaleString() : (
                                <span className="text-gray-400 text-[10px] sm:text-xs">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
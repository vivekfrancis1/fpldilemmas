import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import { BarChart3, ArrowLeft, Trophy, Activity, RefreshCw, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { Link, useLocation } from "wouter";
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
  projected_points: number;
  projected_bench_points: number;
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

interface LeagueEntry {
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

interface ManagerBatchData {
  managerId: number;
  historyData: {
    current: GWHistory[];
    chips: ChipUsage[];
  } | null;
  managerData: {
    teamValue: number;
    bank: number;
    totalTransfers: number;
    overallRank: number;
    gameweekRank: number;
    gameweekPoints: number;
  } | null;
  chipsAvailable: number;
}

interface EnrichedLeagueEntry extends LeagueEntry {
  historyData?: {
    current: GWHistory[];
    chips: ChipUsage[];
  };
  managerData?: {
    teamValue: number;
    bank: number;
    totalTransfers: number;
    overallRank: number;
    gameweekRank: number;
    gameweekPoints: number;
  };
  chipsAvailable: number;
  rankChange: number;
}

interface EnrichedLiveEntry extends LiveLeagueEntry {
  historyData?: {
    current: GWHistory[];
    chips: ChipUsage[];
  };
  managerData?: {
    teamValue: number;
    bank: number;
    totalTransfers: number;
    overallRank: number;
    gameweekRank: number;
    gameweekPoints: number;
  };
  chipsAvailable: number;
}

function getRankChangeDisplay(change: number | undefined | null) {
  if (!change || change === 0) return null;
  if (change > 0) {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{change}
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        {change}
      </div>
    );
  }
}

export default function LeagueAnalysisPage() {
  const [location, navigate] = useLocation();
  const pathParts = location.split('/').filter(part => part);
  const leagueId = pathParts[1];
  const leagueName = pathParts[2] ? decodeURIComponent(pathParts[2]) : 'League Analysis';
  const managerId = pathParts[3];
  
  const [showLiveStandings, setShowLiveStandings] = useState(false);
  const [sortField, setSortField] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  if (!leagueId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Missing league information</p>
            <Link href="/my-dashboard">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: bootstrapData } = useQuery<any>({
    queryKey: ['/api/bootstrap-static'],
  });

  const currentGameweek = bootstrapData?.events?.find((e: any) => e.is_current)?.id || 24;
  const upcomingGameweek = bootstrapData?.events?.find((e: any) => e.is_next)?.id || currentGameweek + 1;

  const { data: leagueData, isLoading, error } = useQuery({
    queryKey: [`/api/leagues-classic/${leagueId}/standings`],
    enabled: !!leagueId
  });

  const { data: liveStandingsData, isLoading: isLoadingLive, refetch: refetchLive } = useQuery<LiveLeagueStandings>({
    queryKey: [`/api/leagues-classic/${leagueId}/live-standings`],
    enabled: !!leagueId && showLiveStandings,
    refetchInterval: showLiveStandings ? 30000 : false,
    staleTime: 15000,
  });

  const allEntries: LeagueEntry[] = (leagueData as any)?.standings?.results || [];
  const topEntries = allEntries.length > 100 ? allEntries.slice(0, 100) : allEntries;

  const managerIds = useMemo(() => topEntries.map(e => e.entry), [topEntries]);

  // Always fetch batch data (needed for both regular and live views)
  const { data: batchDataResponse } = useQuery<{ managers: ManagerBatchData[] }>({
    queryKey: [`/api/leagues/${leagueId}/manager-batch-data`, managerIds.join(',')],
    queryFn: async () => {
      if (managerIds.length === 0) return { managers: [] };
      const response = await fetch(`/api/managers/batch-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerIds: managerIds.slice(0, 50) })
      });
      if (!response.ok) return { managers: [] };
      return response.json();
    },
    enabled: managerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Create a map from batch data for easy lookup
  const batchDataMap = useMemo(() => {
    const map = new Map<number, ManagerBatchData>();
    if (batchDataResponse?.managers) {
      batchDataResponse.managers.forEach(m => {
        map.set(m.managerId, m);
      });
    }
    return map;
  }, [batchDataResponse]);

  const enrichedEntries: EnrichedLeagueEntry[] = useMemo(() => {
    return topEntries.map(entry => {
      const batchData = batchDataMap.get(entry.entry);
      return {
        ...entry,
        historyData: batchData?.historyData || undefined,
        managerData: batchData?.managerData || undefined,
        chipsAvailable: batchData?.chipsAvailable || 0,
        rankChange: entry.last_rank && entry.last_rank > 0 ? entry.last_rank - entry.rank : 0
      };
    });
  }, [topEntries, batchDataMap]);

  // Enrich live entries with batch data
  const enrichedLiveEntries: EnrichedLiveEntry[] = useMemo(() => {
    if (!liveStandingsData?.standings?.results) return [];
    return liveStandingsData.standings.results.map(entry => {
      const batchData = batchDataMap.get(entry.entry);
      return {
        ...entry,
        historyData: batchData?.historyData || undefined,
        managerData: batchData?.managerData || undefined,
        chipsAvailable: batchData?.chipsAvailable || 0
      };
    });
  }, [liveStandingsData, batchDataMap]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEntries = useMemo(() => {
    return [...enrichedEntries].sort((a, b) => {
      const getValue = (entry: EnrichedLeagueEntry, field: string) => {
        switch (field) {
          case 'rank':
            return entry.rank;
          case 'total':
            return entry.total || 0;
          case 'event_total':
            return entry.event_total || 0;
          case 'overallRank':
            return entry.managerData?.overallRank || 0;
          case 'gameweekRank':
            return entry.managerData?.gameweekRank || 0;
          case 'squadValue':
            const teamValue = entry.managerData?.teamValue || 0;
            const bank = entry.managerData?.bank || 0;
            return teamValue - bank;
          case 'bank':
            return entry.managerData?.bank || 0;
          case 'freeTransfers':
            if (!entry.historyData?.current) return 0;
            return calculateFreeTransfers(entry.historyData.current, entry.historyData.chips, upcomingGameweek);
          case 'chipsAvailable':
            return entry.chipsAvailable;
          case 'player_name':
            return entry.player_name;
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
  }, [enrichedEntries, sortField, sortDirection, upcomingGameweek]);

  const getColumns = (): ResponsiveTableColumn<EnrichedLeagueEntry>[] => [
    {
      key: 'player_name',
      header: 'Manager',
      priority: 'essential',
      align: 'left',
      mobileLabel: 'Manager',
      cardOrder: 1,
      sortable: true,
      render: (value, entry) => {
        const isCurrentManager = entry.entry.toString() === managerId;
        return (
          <div>
            <div className="font-medium flex items-center gap-2">
              {entry.player_name}
              {entry.rankChange !== 0 && getRankChangeDisplay(entry.rankChange)}
              {isCurrentManager && <Badge className="bg-blue-600 text-xs">You</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">{entry.entry_name}</div>
          </div>
        );
      }
    },
    {
      key: 'rank',
      header: 'Rank',
      priority: 'important',
      align: 'center',
      mobileLabel: 'Rank',
      cardOrder: 2,
      sortable: true,
      render: (value, entry) => (
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
          entry.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
          entry.rank === 2 ? 'bg-gray-100 text-gray-800' :
          entry.rank === 3 ? 'bg-orange-100 text-orange-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {entry.rank}
        </div>
      )
    },
    {
      key: 'total',
      header: <span className="whitespace-nowrap">Total Pts</span>,
      priority: 'important',
      align: 'right',
      mobileLabel: 'Points',
      cardOrder: 3,
      sortable: true,
      className: 'font-mono',
      render: (value, entry) => entry.total?.toLocaleString() || 'N/A'
    },
    {
      key: 'event_total',
      header: <span className="text-center">GW{currentGameweek}<br/>Pts</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: `GW ${currentGameweek}`,
      cardOrder: 4,
      sortable: true,
      className: 'font-mono',
      render: (value, entry) => entry.event_total || 0
    },
    {
      key: 'overallRank',
      header: <span className="text-center">Overall<br/>Rank</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'OR',
      cardOrder: 5,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const rank = entry.managerData?.overallRank;
        return rank ? rank.toLocaleString() : 'N/A';
      }
    },
    {
      key: 'gameweekRank',
      header: <span className="text-center">GW<br/>Rank</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'GWR',
      cardOrder: 6,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const rank = entry.managerData?.gameweekRank;
        return rank ? rank.toLocaleString() : 'N/A';
      }
    },
    {
      key: 'squadValue',
      header: <span className="text-center">Squad<br/>Value</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'Squad',
      cardOrder: 7,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const teamValue = entry.managerData?.teamValue;
        const bank = entry.managerData?.bank;
        if (teamValue === undefined || teamValue === null) return 'N/A';
        const bankValue = bank !== undefined && bank !== null ? bank : 0;
        return `£${((teamValue - bankValue) / 10).toFixed(1)}m`;
      }
    },
    {
      key: 'bank',
      header: 'Bank',
      priority: 'optional',
      align: 'right',
      mobileLabel: 'Bank',
      cardOrder: 8,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const bank = entry.managerData?.bank;
        return bank !== undefined && bank !== null 
          ? `£${(bank / 10).toFixed(1)}m` 
          : '£0.0m';
      }
    },
    {
      key: 'freeTransfers',
      header: <span className="text-center">Free<br/>Transfers</span>,
      priority: 'optional',
      align: 'right',
      mobileLabel: 'FT',
      cardOrder: 9,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        if (!entry.historyData?.current) return 'N/A';
        return calculateFreeTransfers(entry.historyData.current, entry.historyData.chips, upcomingGameweek);
      }
    },
    {
      key: 'chipsAvailable',
      header: <span className="text-center">Chips<br/>Available</span>,
      priority: 'optional',
      align: 'right',
      mobileLabel: 'Chips',
      cardOrder: 10,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => entry.chipsAvailable
    }
  ];

  const getLiveColumns = (): ResponsiveTableColumn<EnrichedLiveEntry>[] => [
    {
      key: 'player_name',
      header: 'Manager',
      priority: 'essential',
      align: 'left',
      mobileLabel: 'Manager',
      cardOrder: 1,
      sortable: true,
      render: (value, entry) => {
        const isCurrentManager = entry.entry.toString() === managerId;
        return (
          <div>
            <div className="font-medium flex items-center gap-2">
              {entry.player_name}
              {entry.rank_change !== 0 && (
                <div className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                  entry.rank_change > 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                }`}>
                  {entry.rank_change > 0 ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      <span>{entry.rank_change}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      <span>{Math.abs(entry.rank_change)}</span>
                    </>
                  )}
                </div>
              )}
              {isCurrentManager && <Badge className="bg-blue-600 text-xs">You</Badge>}
              {entry.active_chip && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  {entry.active_chip}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{entry.entry_name}</div>
          </div>
        );
      }
    },
    {
      key: 'live_rank',
      header: 'Rank',
      priority: 'important',
      align: 'center',
      mobileLabel: 'Rank',
      cardOrder: 2,
      sortable: true,
      render: (value, entry) => (
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
          entry.live_rank === 1 ? 'bg-yellow-100 text-yellow-800' :
          entry.live_rank === 2 ? 'bg-gray-100 text-gray-800' :
          entry.live_rank === 3 ? 'bg-orange-100 text-orange-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {entry.live_rank}
        </div>
      )
    },
    {
      key: 'live_total',
      header: <span className="whitespace-nowrap">Total Pts</span>,
      priority: 'important',
      align: 'right',
      mobileLabel: 'Total',
      cardOrder: 3,
      sortable: true,
      className: 'font-mono',
      render: (value, entry) => entry.live_total?.toLocaleString() || 'N/A'
    },
    {
      key: 'live_points',
      header: <span className="text-center">GW{liveStandingsData?.current_gameweek || currentGameweek}<br/>Pts</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'GW Pts',
      cardOrder: 4,
      sortable: true,
      className: 'font-mono',
      render: (value, entry) => (
        <div>
          <span>{entry.live_points}</span>
          {entry.auto_sub_points > 0 && (
            <span className="text-orange-600 text-xs ml-1">(+{entry.auto_sub_points})</span>
          )}
          {entry.bonus_points > 0 && liveStandingsData?.has_provisional_bonus && (
            <span className="text-green-600 text-xs ml-1">(+{entry.bonus_points})</span>
          )}
        </div>
      )
    },
    {
      key: 'projected_points',
      header: <span className="text-center">GW{liveStandingsData?.current_gameweek || currentGameweek}<br/>xPts</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'xPts',
      cardOrder: 5,
      sortable: true,
      className: 'font-mono',
      render: (value, entry) => (
        <div className="text-purple-600">
          <span>{entry.projected_points?.toFixed(1) || '-'}</span>
          {entry.active_chip === 'bboost' && entry.projected_bench_points > 0 && (
            <span className="text-xs ml-1">(BB)</span>
          )}
        </div>
      )
    },
    {
      key: 'overallRank',
      header: <span className="text-center">Overall<br/>Rank</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'OR',
      cardOrder: 5,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const rank = entry.managerData?.overallRank;
        return rank ? rank.toLocaleString() : 'N/A';
      }
    },
    {
      key: 'gameweekRank',
      header: <span className="text-center">GW<br/>Rank</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'GWR',
      cardOrder: 6,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const rank = entry.managerData?.gameweekRank;
        return rank ? rank.toLocaleString() : 'N/A';
      }
    },
    {
      key: 'squadValue',
      header: <span className="text-center">Squad<br/>Value</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: 'Squad',
      cardOrder: 7,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const teamValue = entry.managerData?.teamValue;
        const bank = entry.managerData?.bank;
        if (teamValue === undefined || teamValue === null) return 'N/A';
        const bankValue = bank !== undefined && bank !== null ? bank : 0;
        return `£${((teamValue - bankValue) / 10).toFixed(1)}m`;
      }
    },
    {
      key: 'bank',
      header: 'Bank',
      priority: 'optional',
      align: 'right',
      mobileLabel: 'Bank',
      cardOrder: 8,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        const bank = entry.managerData?.bank;
        return bank !== undefined && bank !== null 
          ? `£${(bank / 10).toFixed(1)}m` 
          : '£0.0m';
      }
    },
    {
      key: 'freeTransfers',
      header: <span className="text-center">Free<br/>Transfers</span>,
      priority: 'optional',
      align: 'right',
      mobileLabel: 'FT',
      cardOrder: 9,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => {
        if (!entry.historyData?.current) return 'N/A';
        return calculateFreeTransfers(entry.historyData.current, entry.historyData.chips, upcomingGameweek);
      }
    },
    {
      key: 'chipsAvailable',
      header: <span className="text-center">Chips<br/>Available</span>,
      priority: 'optional',
      align: 'right',
      mobileLabel: 'Chips',
      cardOrder: 10,
      sortable: true,
      className: 'font-mono text-xs',
      render: (value, entry) => entry.chipsAvailable
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !leagueData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load league data</p>
            <Link href="/my-dashboard">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/my-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="fpl-heading-page flex items-center gap-2 text-lg sm:text-xl">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                {decodeURIComponent(leagueName)}
              </h1>
              <p className="text-muted-foreground text-sm">League ID: {leagueId}</p>
            </div>
          </div>
        </div>

        {/* League Standings */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="fpl-heading-card flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                {showLiveStandings ? 'Live Standings' : 'Current Standings'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {showLiveStandings && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchLive()}
                    disabled={isLoadingLive}
                    className="h-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                <Button
                  variant={showLiveStandings ? "default" : "outline"}
                  size="sm"
                  className={`h-8 ${showLiveStandings ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                  onClick={() => setShowLiveStandings(!showLiveStandings)}
                >
                  <Activity className={`h-4 w-4 mr-1 ${showLiveStandings ? 'animate-pulse' : ''}`} />
                  {showLiveStandings ? 'Live On' : 'Live Points'}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              {showLiveStandings 
                ? liveStandingsData 
                  ? `GW${liveStandingsData.current_gameweek} • Updated ${new Date(liveStandingsData.last_updated).toLocaleTimeString()}${liveStandingsData.is_gameweek_finished ? ' (GW Finished)' : ''}`
                  : 'Loading live standings...'
                : `Showing ${topEntries.length === 100 ? 'top 100' : 'all'} managers${allEntries.length > 100 ? ` of ${allEntries.length} total members` : ''}`
              }
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {showLiveStandings ? (
              isLoadingLive ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : enrichedLiveEntries.length > 0 ? (
                <ResponsiveTable
                  data={enrichedLiveEntries}
                  columns={getLiveColumns()}
                  enableMobileCards={true}
                  mobileCardTitle={(entry) => entry.player_name}
                  loading={false}
                  emptyMessage="No standings data available"
                  onRowClick={(entry) => {
                    navigate(`/manager-team/${entry.entry}`);
                  }}
                  sortField="live_rank"
                  sortDirection="asc"
                  stickyHeader={true}
                  enableHorizontalScroll={true}
                  getRowTestId={(entry, index) => `row-live-${entry.entry}`}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Failed to load live standings
                </div>
              )
            ) : (
              <ResponsiveTable
                data={sortedEntries}
                columns={getColumns()}
                enableMobileCards={true}
                mobileCardTitle={(entry) => entry.player_name}
                loading={sortedEntries.length === 0}
                emptyMessage="No standings data available"
                onRowClick={(entry) => {
                  navigate(`/manager-team/${entry.entry}`);
                }}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
                stickyHeader={true}
                enableHorizontalScroll={true}
                getRowTestId={(entry, index) => `row-manager-${entry.entry}`}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

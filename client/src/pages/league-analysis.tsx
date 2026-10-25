import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LeagueOwnershipView from "@/components/league-ownership-view";
import { Users, BarChart3, ArrowLeft, Trophy, Activity, RefreshCw, ChevronUp, ChevronDown, History, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getSharedColumns, sortManagerData, GWTransferDetail, GWHistory, ChipUsage, renderRankChange, getChipLabel } from "@/lib/manager-standings-columns";
import { computeCurrentGameweek } from "@shared/gameweek-utils";
import { Pill, RankBadge, SectionCard } from "@/components/tool-ui";

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
  projection_gameweek?: number;
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
  managerId: number;
  name: string;
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
  latestTracking?: {
    overallRank?: number;
    overallPoints?: number;
    gameweekPoints?: number;
    gameweekRank?: number;
    teamValue?: number | string;
    bank?: number | string;
    totalTransfers?: number;
  };
  chipsAvailable: number;
  rankChange: number;
  projected_points?: number;
  projected_bench_points?: number;
  active_chip?: string | null;
}

interface EnrichedLiveEntry extends LiveLeagueEntry {
  managerId: number;
  name: string;
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
  latestTracking?: {
    overallRank?: number;
    overallPoints?: number;
    gameweekPoints?: number;
    gameweekRank?: number;
    teamValue?: number | string;
    bank?: number | string;
    totalTransfers?: number;
  };
  chipsAvailable: number;
}

interface PastSeasonEntry {
  season_name: string;
  total_points: number;
  rank: number;
}

interface ManagerPastSeasons {
  managerId: number;
  playerName: string;
  entryName: string;
  past: PastSeasonEntry[];
}

interface PastSeasonsData {
  leagueId: number;
  leagueName: string;
  seasons: string[];
  managers: ManagerPastSeasons[];
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
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [historicalSortField, setHistoricalSortField] = useState<string>('total_points');
  const [historicalSortDirection, setHistoricalSortDirection] = useState<'asc' | 'desc'>('desc');

  if (!leagueId) {
    return (
      <div className="min-h-screen p-4">
        <div className="w-full">
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

  const currentGameweek = computeCurrentGameweek((bootstrapData?.events || []) as any);
  const upcomingGameweek = bootstrapData?.events?.find((e: any) => e.is_next)?.id || currentGameweek + 1;

  const { data: leagueData, isLoading, error } = useQuery({
    queryKey: [`/api/leagues-classic/${leagueId}/standings`],
    enabled: !!leagueId
  });

  const { data: liveStandingsData, isLoading: isLoadingLive, refetch: refetchLive } = useQuery<LiveLeagueStandings>({
    queryKey: [`/api/leagues-classic/${leagueId}/live-standings`],
    enabled: !!leagueId,
    refetchInterval: showLiveStandings ? 30000 : false,
    staleTime: 15000,
  });

  const allEntries: LeagueEntry[] = (leagueData as any)?.standings?.results || [];
  const topEntries = allEntries.length > 100 ? allEntries.slice(0, 100) : allEntries;

  const managerIds = useMemo(() => topEntries.map(e => e.entry), [topEntries]);

  const { data: batchDataResponse } = useQuery<{ managers: ManagerBatchData[] }>({
    queryKey: [`/api/leagues/${leagueId}/manager-batch-data`, managerIds.join(',')],
    queryFn: async () => {
      if (managerIds.length === 0) return { managers: [] };
      const response = await fetch(`/api/managers/batch-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerIds: managerIds.slice(0, 100) })
      });
      if (!response.ok) return { managers: [] };
      return response.json();
    },
    enabled: managerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const batchDataMap = useMemo(() => {
    const map = new Map<number, ManagerBatchData>();
    if (batchDataResponse?.managers) {
      batchDataResponse.managers.forEach(m => {
        map.set(m.managerId, m);
      });
    }
    return map;
  }, [batchDataResponse]);

  const { data: gwTransfersData } = useQuery<{ transfers: Record<number, GWTransferDetail[]>; gameweek: number }>({
    queryKey: ['/api/managers/gw-transfers', managerIds.join(',')],
    queryFn: async () => {
      if (managerIds.length === 0) return { transfers: {}, gameweek: 0 };
      const res = await fetch(`/api/managers/gw-transfers?managerIds=${managerIds.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch GW transfers');
      return res.json();
    },
    enabled: managerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const isClassicLeague = (leagueData as any)?.league?.league_type === 'x';

  const { data: pastSeasonsData, isLoading: isPastSeasonsLoading } = useQuery<PastSeasonsData>({
    queryKey: ['/api/leagues-classic', leagueId, 'past-seasons'],
    queryFn: async () => {
      const res = await fetch(`/api/leagues-classic/${leagueId}/past-seasons`);
      if (!res.ok) throw new Error('Failed to fetch past seasons');
      return res.json();
    },
    enabled: !!leagueId && isClassicLeague,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (pastSeasonsData?.seasons?.length && !selectedSeason) {
      setSelectedSeason(pastSeasonsData.seasons[0]);
    }
  }, [pastSeasonsData?.seasons]);

  const historicalStandings = useMemo(() => {
    if (!pastSeasonsData?.managers || !selectedSeason) return [];
    return pastSeasonsData.managers
      .map(m => {
        const seasonData = m.past.find(s => s.season_name === selectedSeason);
        return {
          managerId: m.managerId,
          playerName: m.playerName,
          entryName: m.entryName,
          totalPoints: seasonData?.total_points ?? null,
          rank: seasonData?.rank ?? null,
          played: !!seasonData,
        };
      })
      .sort((a, b) => {
        if (historicalSortField === 'total_points') {
          if (!a.played && !b.played) return 0;
          if (!a.played) return 1;
          if (!b.played) return -1;
          return historicalSortDirection === 'desc'
            ? (b.totalPoints || 0) - (a.totalPoints || 0)
            : (a.totalPoints || 0) - (b.totalPoints || 0);
        }
        if (historicalSortField === 'rank') {
          if (!a.played && !b.played) return 0;
          if (!a.played) return 1;
          if (!b.played) return -1;
          if (!a.rank && !b.rank) return 0;
          if (!a.rank) return 1;
          if (!b.rank) return -1;
          return historicalSortDirection === 'asc'
            ? a.rank - b.rank
            : b.rank - a.rank;
        }
        if (historicalSortField === 'player_name') {
          return historicalSortDirection === 'asc'
            ? a.playerName.localeCompare(b.playerName)
            : b.playerName.localeCompare(a.playerName);
        }
        return 0;
      });
  }, [pastSeasonsData, selectedSeason, historicalSortField, historicalSortDirection]);

  const projectedPointsMap = useMemo(() => {
    const map = new Map<number, { projected_points: number; projected_bench_points: number; active_chip: string | null }>();
    if (liveStandingsData?.standings?.results) {
      for (const entry of liveStandingsData.standings.results) {
        map.set(entry.entry, {
          projected_points: entry.projected_points || 0,
          projected_bench_points: entry.projected_bench_points || 0,
          active_chip: entry.active_chip || null
        });
      }
    }
    return map;
  }, [liveStandingsData]);

  const enrichedEntries: EnrichedLeagueEntry[] = useMemo(() => {
    return topEntries.map(entry => {
      const batchData = batchDataMap.get(entry.entry);
      const projData = projectedPointsMap.get(entry.entry);
      return {
        ...entry,
        managerId: entry.entry,
        name: entry.player_name,
        historyData: batchData?.historyData || undefined,
        managerData: batchData?.managerData || undefined,
        latestTracking: {
          overallRank: batchData?.managerData?.overallRank,
          overallPoints: entry.total,
          gameweekPoints: entry.event_total,
          gameweekRank: batchData?.managerData?.gameweekRank,
          teamValue: batchData?.managerData?.teamValue,
          bank: batchData?.managerData?.bank,
          totalTransfers: batchData?.managerData?.totalTransfers,
        },
        chipsAvailable: batchData?.chipsAvailable || 0,
        rankChange: entry.last_rank && entry.last_rank > 0 ? entry.last_rank - entry.rank : 0,
        projected_points: projData?.projected_points,
        projected_bench_points: projData?.projected_bench_points,
        active_chip: projData?.active_chip
      };
    });
  }, [topEntries, batchDataMap, projectedPointsMap]);

  const enrichedLiveEntries: EnrichedLiveEntry[] = useMemo(() => {
    if (!liveStandingsData?.standings?.results) return [];
    return liveStandingsData.standings.results.map(entry => {
      const batchData = batchDataMap.get(entry.entry);
      return {
        ...entry,
        managerId: entry.entry,
        name: entry.player_name,
        historyData: batchData?.historyData || undefined,
        managerData: batchData?.managerData || undefined,
        latestTracking: {
          overallRank: batchData?.managerData?.overallRank,
          overallPoints: entry.live_total || entry.total,
          gameweekPoints: entry.live_points || entry.event_total,
          gameweekRank: batchData?.managerData?.gameweekRank,
          teamValue: batchData?.managerData?.teamValue,
          bank: batchData?.managerData?.bank,
          totalTransfers: batchData?.managerData?.totalTransfers,
        },
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
    const pageFields = ['rank', 'player_name', 'projected_points', 'gameweekRank'];
    if (pageFields.includes(sortField)) {
      return [...enrichedEntries].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortField) {
          case 'rank': aVal = a.rank; bVal = b.rank; break;
          case 'player_name': aVal = a.player_name.toLowerCase(); bVal = b.player_name.toLowerCase(); break;
          case 'projected_points': aVal = a.projected_points || 0; bVal = b.projected_points || 0; break;
          case 'gameweekRank': aVal = a.managerData?.gameweekRank || 0; bVal = b.managerData?.gameweekRank || 0; break;
          default: aVal = 0; bVal = 0;
        }
        if (typeof aVal === 'string') return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return sortManagerData(enrichedEntries, sortField, sortDirection, currentGameweek, 'raw', upcomingGameweek);
  }, [enrichedEntries, sortField, sortDirection, currentGameweek, upcomingGameweek]);

  const getColumns = (): ResponsiveTableColumn<EnrichedLeagueEntry>[] => {
    const managerCol: ResponsiveTableColumn<EnrichedLeagueEntry> = {
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
              {entry.rankChange !== 0 && renderRankChange(entry.rankChange)}
              {isCurrentManager && <Pill tone="indigo">You</Pill>}
            </div>
            <div className="text-sm text-muted-foreground">{entry.entry_name}</div>
          </div>
        );
      }
    };

    const leagueRankCol: ResponsiveTableColumn<EnrichedLeagueEntry> = {
      key: 'rank',
      header: 'Rank',
      priority: 'important',
      align: 'center',
      mobileLabel: 'Rank',
      cardOrder: 2,
      sortable: true,
      render: (value, entry) => (
        <div className="flex items-center justify-center">
          <RankBadge rank={entry.rank} />
        </div>
      )
    };

    const totalPtsCol: ResponsiveTableColumn<EnrichedLeagueEntry> = {
      key: 'latestTracking.overallPoints',
      header: <span className="leading-tight">Total<br/>Pts</span>,
      priority: 'important',
      align: 'right',
      mobileLabel: 'Total',
      cardOrder: 3,
      sortable: true,
      className: 'font-mono',
      render: (_, entry) => {
        const points = entry.latestTracking?.overallPoints ?? entry.total;
        return points !== undefined && points !== null ? points.toLocaleString() : 'N/A';
      }
    };

    const gwPtsCol: ResponsiveTableColumn<EnrichedLeagueEntry> = {
      key: 'latestTracking.gameweekPoints',
      header: <span className="text-center">GW{currentGameweek}<br/>Pts</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: `GW${currentGameweek}`,
      cardOrder: 4,
      sortable: true,
      className: 'font-mono',
      render: (_, entry) => {
        const gwPoints = entry.latestTracking?.gameweekPoints ?? entry.event_total;
        return (
          <span className="font-mono font-bold">
            {gwPoints !== undefined && gwPoints !== null ? gwPoints : 'N/A'}
          </span>
        );
      }
    };

    const chipCol: ResponsiveTableColumn<EnrichedLeagueEntry> = {
      key: 'active_chip',
      header: currentGameweek ? <span className="text-center leading-tight">Chip<br/>GW{currentGameweek}</span> : 'Chip',
      priority: 'secondary',
      align: 'center',
      mobileLabel: currentGameweek ? `Chip GW${currentGameweek}` : 'Chip',
      cardOrder: 6,
      sortable: false,
      render: (value, entry) => {
        const label = entry.active_chip ? getChipLabel(entry.active_chip) : null;
        return label ? (
          <Pill tone="indigo">{label}</Pill>
        ) : <span className="text-gray-400">-</span>;
      }
    };

    const gwRankCol: ResponsiveTableColumn<EnrichedLeagueEntry> = {
      key: 'gameweekRank',
      header: <span className="text-center">GW{currentGameweek}<br/>Rank</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: `GW${currentGameweek} Rank`,
      cardOrder: 6,
      sortable: true,
      className: 'font-mono text-xs',
      hideOnMobile: true,
      render: (value, entry) => {
        const rank = entry.managerData?.gameweekRank;
        return rank ? rank.toLocaleString() : 'N/A';
      }
    };

    const allSharedCols = getSharedColumns<EnrichedLeagueEntry>({
      currentGameweek,
      upcomingGameweek,
      valueScale: 'raw',
      gwTransfersMap: gwTransfersData?.transfers as Record<number | string, GWTransferDetail[]>,
      gwTransfersKeyField: 'managerId',
    });
    const overallRankCol = allSharedCols.find(col => col.key === 'latestTracking.overallRank')!;
    const sharedCols = allSharedCols.filter(col =>
      col.key !== 'latestTracking.overallPoints' &&
      col.key !== 'latestTracking.gameweekPoints' &&
      col.key !== 'rankChange' &&
      col.key !== 'latestTracking.overallRank'
    );

    return [leagueRankCol, managerCol, totalPtsCol, overallRankCol, gwPtsCol, chipCol, gwRankCol, ...sharedCols];
  };

  const getLiveColumns = (): ResponsiveTableColumn<EnrichedLiveEntry>[] => {
    const managerCol: ResponsiveTableColumn<EnrichedLiveEntry> = {
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
                  entry.rank_change > 0 ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15' : 'text-red-700 dark:text-red-300 bg-red-500/15'
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
              {isCurrentManager && <Pill tone="indigo">You</Pill>}
            </div>
            <div className="text-sm text-muted-foreground">{entry.entry_name}</div>
          </div>
        );
      }
    };

    const liveRankCol: ResponsiveTableColumn<EnrichedLiveEntry> = {
      key: 'live_rank',
      header: 'Rank',
      priority: 'important',
      align: 'center',
      mobileLabel: 'Rank',
      cardOrder: 2,
      sortable: true,
      render: (value, entry) => (
        <div className="flex items-center justify-center">
          <RankBadge rank={entry.live_rank} />
        </div>
      )
    };

    const liveTotalCol: ResponsiveTableColumn<EnrichedLiveEntry> = {
      key: 'live_total',
      header: <span className="leading-tight">Total<br/>Pts</span>,
      priority: 'important',
      align: 'right',
      mobileLabel: 'Total',
      cardOrder: 3,
      sortable: true,
      className: 'font-mono',
      render: (value, entry) => entry.live_total?.toLocaleString() || 'N/A'
    };

    const livePointsCol: ResponsiveTableColumn<EnrichedLiveEntry> = {
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
            <span className="text-amber-600 text-xs ml-1">(+{entry.auto_sub_points})</span>
          )}
          {entry.bonus_points > 0 && liveStandingsData?.has_provisional_bonus && (
            <span className="text-green-600 text-xs ml-1">(+{entry.bonus_points})</span>
          )}
        </div>
      )
    };

    const liveChipGW = liveStandingsData?.current_gameweek || currentGameweek;
    const liveChipCol: ResponsiveTableColumn<EnrichedLiveEntry> = {
      key: 'active_chip',
      header: liveChipGW ? <span className="text-center leading-tight">Chip<br/>GW{liveChipGW}</span> : 'Chip',
      priority: 'secondary',
      align: 'center',
      mobileLabel: liveChipGW ? `Chip GW${liveChipGW}` : 'Chip',
      cardOrder: 6,
      sortable: false,
      render: (value, entry) => {
        const label = entry.active_chip ? getChipLabel(entry.active_chip) : null;
        return label ? (
          <Pill tone="indigo">{label}</Pill>
        ) : <span className="text-gray-400">-</span>;
      }
    };

    const liveGW = liveStandingsData?.current_gameweek || currentGameweek;
    const gwRankCol: ResponsiveTableColumn<EnrichedLiveEntry> = {
      key: 'gameweekRank',
      header: <span className="text-center">GW{liveGW}<br/>Rank</span>,
      priority: 'secondary',
      align: 'right',
      mobileLabel: `GW${liveGW} Rank`,
      cardOrder: 6,
      sortable: true,
      className: 'font-mono text-xs',
      hideOnMobile: true,
      render: (value, entry) => {
        const rank = entry.managerData?.gameweekRank;
        return rank ? rank.toLocaleString() : 'N/A';
      }
    };

    const allSharedCols = getSharedColumns<EnrichedLiveEntry>({
      currentGameweek,
      upcomingGameweek,
      valueScale: 'raw',
      gwTransfersMap: gwTransfersData?.transfers as Record<number | string, GWTransferDetail[]>,
      gwTransfersKeyField: 'managerId',
    });
    const overallRankCol = allSharedCols.find(col => col.key === 'latestTracking.overallRank')!;
    const sharedCols = allSharedCols.filter(col => col.key !== 'latestTracking.overallRank');

    return [liveRankCol, managerCol, liveTotalCol, overallRankCol, livePointsCol, liveChipCol, gwRankCol, ...sharedCols];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4">
        <div className="w-full">
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
      <div className="min-h-screen p-4">
        <div className="w-full">
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
    <div className="min-h-screen p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <Link href="/my-dashboard">
              <Button variant="outline" size="sm" className="rounded-xl">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="fpl-page-title">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1>{decodeURIComponent(leagueName)}</h1>
            </div>
            <p className="fpl-page-subtitle">League ID: {leagueId}</p>
          </div>
        </div>

        {/* League Standings */}
        <SectionCard
          icon={BarChart3}
          title={showLiveStandings ? 'Live Standings' : 'Current Standings'}
          subtitle={showLiveStandings
            ? liveStandingsData
              ? `GW${liveStandingsData.current_gameweek} • Updated ${new Date(liveStandingsData.last_updated).toLocaleTimeString()}${liveStandingsData.is_gameweek_finished ? ' (GW Finished)' : ''}`
              : 'Loading live standings...'
            : `Showing ${topEntries.length === 100 ? 'top 100' : 'all'} managers${allEntries.length > 100 ? ` of ${allEntries.length} total members` : ''}`
          }
          bodyClassName="p-0"
          action={
            <div className="flex items-center gap-2">
              {showLiveStandings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchLive()}
                  disabled={isLoadingLive}
                  className="h-8 rounded-lg"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <Button
                variant={showLiveStandings ? "default" : "outline"}
                size="sm"
                className={`h-8 rounded-lg font-bold ${showLiveStandings ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'}`}
                onClick={() => setShowLiveStandings(!showLiveStandings)}
              >
                <Activity className={`h-4 w-4 mr-1 ${showLiveStandings ? 'animate-pulse' : ''}`} />
                {showLiveStandings ? 'Live On' : 'Live Points'}
              </Button>
            </div>
          }
        >
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
                  compact={true}
                  mobileCompactTable={true}
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
                compact={true}
                mobileCompactTable={true}
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
        </SectionCard>

        {/* League Comparison: your team against this league's squads */}
        {isClassicLeague && (
          <SectionCard
            icon={Users}
            title="League Comparison"
            subtitle="Compare your team with this league: what it owns and captains, its template XI, and your differentials and threats."
            testId="card-league-comparison"
          >
              <LeagueOwnershipView key={`${leagueId}:${managerId}`} leagueId={leagueId} managerId={managerId} />
          </SectionCard>
        )}

        {isClassicLeague && (
          <SectionCard
            icon={History}
            title="Previous Seasons"
            subtitle={selectedSeason
              ? `${selectedSeason} season — ${historicalStandings.filter(m => m.played).length} of ${historicalStandings.length} managers played`
              : 'Select a season to view how league members performed in past FPL seasons'}
            action={
              <Select
                value={selectedSeason}
                onValueChange={(v) => setSelectedSeason(v)}
              >
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Select Season" />
                </SelectTrigger>
                <SelectContent>
                  {(pastSeasonsData?.seasons || []).map((season) => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
              <p className="text-muted-foreground text-xs italic mb-3">
                Based on the current league member list, not the actual members of this league in that season.
              </p>
              {isPastSeasonsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="ml-3 text-muted-foreground">Loading historical data...</span>
                </div>
              ) : !selectedSeason ? (
                <div className="text-center py-8 text-muted-foreground">
                  Choose a season from the dropdown above to see how your league members performed.
                </div>
              ) : historicalStandings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for {selectedSeason}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-1.5 sm:px-3 py-1 sm:py-2 text-left font-medium text-muted-foreground w-8 sm:w-12">#</th>
                        <th
                          className="px-1.5 sm:px-3 py-1 sm:py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-gray-900"
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
                          className="px-1.5 sm:px-3 py-1 sm:py-2 text-right font-medium text-muted-foreground cursor-pointer hover:text-gray-900"
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
                          className="px-1.5 sm:px-3 py-1 sm:py-2 text-right font-medium text-muted-foreground cursor-pointer hover:text-gray-900"
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
                      {historicalStandings.map((entry, index) => {
                        const isCurrentManager = entry.managerId.toString() === managerId;
                        return (
                          <tr
                            key={entry.managerId}
                            className={`border-b hover:bg-gray-50/50 transition-colors cursor-pointer ${isCurrentManager ? 'bg-indigo-500/10' : ''}`}
                            onClick={() => navigate(`/manager-team/${entry.managerId}`)}
                          >
                            <td className="px-1.5 sm:px-3 py-1 sm:py-2">
                              {entry.played ? (
                                <RankBadge rank={index + 1} />
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-1.5 sm:px-3 py-1 sm:py-2">
                              <div className="font-medium flex items-center gap-1 sm:gap-2 text-sm">
                                <span className="truncate max-w-[90px] sm:max-w-none">{entry.playerName}</span>
                                {isCurrentManager && <Pill tone="indigo" className="shrink-0">You</Pill>}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">{entry.entryName}</div>
                            </td>
                            <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-right font-mono font-semibold text-xs sm:text-sm">
                              {entry.played ? entry.totalPoints?.toLocaleString() : (
                                <span className="text-gray-400 text-[10px] sm:text-xs">Did not play</span>
                              )}
                            </td>
                            <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-right font-mono text-xs sm:text-sm">
                              {entry.played && entry.rank ? entry.rank.toLocaleString() : (
                                <span className="text-gray-400 text-[10px] sm:text-xs">N/A</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </SectionCard>
        )}
      </div>
    </div>
  );
}

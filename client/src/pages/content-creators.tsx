import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Crown,
  DollarSign,
  Home,
  Plus,
  RefreshCw,
  Shield,
  Star,
  Target,
  Trophy,
  Users,
  Youtube,
  Zap,
  ArrowUpDown,
  Activity,
  PieChart,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { getSharedColumns, sortManagerData, GWTransferDetail as SharedGWTransferDetail, ManagerColumnsConfig, getChipLabel } from "@/lib/manager-standings-columns";

interface GWHistory {
  event: number;
  event_transfers: number;
  event_transfers_cost: number;
}

interface ChipUsage {
  event: number;
  name: string;
}

type FPLCreator = {
  id: number;
  name: string;
  managerId: number;
  managerName: string;
  playerName?: string;
  description?: string;
  twitterHandle?: string | null;
  youtubeUrl?: string | null;
  followers?: number;
  isActive: boolean;
  addedDate: string;
  lastUpdated: string;
  rankChange?: number;
  latestTracking?: FPLCreatorTracking;
  historyData?: {
    current: GWHistory[];
    chips: ChipUsage[];
  };
  projected_points?: number;
  projected_bench_points?: number;
  active_chip?: string | null;
};

type FPLCreatorTracking = {
  id: number;
  creatorId: number;
  gameweek: number;
  overallRank: number;
  overallPoints: number;
  gameweekPoints: number;
  gameweekRank?: number;
  teamValue: number | string;
  bank?: number | string;
  totalTransfers: number;
  recordedAt: string;
  wildcardUsed?: boolean;
  benchBoostUsed?: boolean;
  freeHitUsed?: boolean;
  tripleCaptainUsed?: boolean;
};

type CreatorWithLatestData = FPLCreator;

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

interface ContentCreatorTeamResponse {
  managerId: number;
  name: string;
  rank: number;
  teamData: TeamData | null;
  success: boolean;
  error: string | null;
}

interface ContentCreatorBatchResponse {
  teams: ContentCreatorTeamResponse[];
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

interface CreatorTeamData {
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


const getContentCreatorColumns = (currentGameweek?: number, gwTransfersMap?: Record<number, SharedGWTransferDetail[]>, upcomingGameweek?: number): ResponsiveTableColumn<CreatorWithLatestData>[] => {
  const nameColumn: ResponsiveTableColumn<CreatorWithLatestData> = {
    key: 'name',
    header: 'Creator',
    priority: 'essential',
    align: 'left',
    mobileLabel: 'Creator',
    cardOrder: 1,
    width: '300px',
    render: (value, creator) => (
      <div className="flex items-center gap-3">
        <div>
          <div className="font-medium">{creator.name}</div>
          <div className="flex flex-wrap gap-3 mt-2 hidden md:flex">
            {creator.twitterHandle && (
              <a
                href={`https://x.com/${creator.twitterHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                data-testid={`link-creator-twitter-${creator.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <SiX className="h-3 w-3" />
                {creator.twitterHandle}
              </a>
            )}
            {creator.youtubeUrl && (
              <a
                href={creator.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 hover:underline break-all flex items-center gap-1"
                data-testid={`link-creator-youtube-${creator.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <SiYoutube className="h-3 w-3" />
                {creator.youtubeUrl.split('/').pop() || 'YouTube'}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  };

  const xPtsCol: ResponsiveTableColumn<CreatorWithLatestData> = {
    key: 'projected_points',
    header: 'xPts',
    priority: 'secondary',
    align: 'right',
    mobileLabel: 'xPts',
    cardOrder: 2,
    sortable: true,
    className: 'font-mono',
    render: (value, creator) => (
      <div className="text-purple-600">
        <span>{creator.projected_points ? creator.projected_points.toFixed(1) : '-'}</span>
        {creator.active_chip && getChipLabel(creator.active_chip) && (
          <span className="text-xs ml-1">({getChipLabel(creator.active_chip)})</span>
        )}
      </div>
    )
  };

  const sharedCols = getSharedColumns<CreatorWithLatestData>({
    currentGameweek,
    upcomingGameweek,
    valueScale: 'millions',
    gwTransfersMap: gwTransfersMap as Record<number | string, SharedGWTransferDetail[]>,
    gwTransfersKeyField: 'id',
  });

  return [nameColumn, xPtsCol, ...sharedCols];
};

// Main Content Creators Component
export default function ContentCreators() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [sortBy, setSortBy] = useState<string>("latestTracking.overallRank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Cached Content Creators data response type
  interface CachedCreatorsResponse {
    creators: Array<{
      id: number;
      name: string;
      managerId: number;
      description?: string;
      twitterHandle?: string;
      youtubeUrl?: string;
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
      totalCreators: number;
      successfulFetches: number;
      fetchedAt: string;
      cacheExpiresAt: string;
    };
    fromCache: boolean;
  }

  // Fetch cached Content Creators data (30-minute cache)
  const { data: cachedCreatorsData, isLoading: isLoadingCached, refetch: refetchCached, isFetching: isCreatorDataRefreshing } = useQuery<CachedCreatorsResponse>({
    queryKey: ['/api/cached/content-creators-data'],
    staleTime: 25 * 60 * 1000, // Consider stale after 25 minutes (cache is 30 min)
    gcTime: 35 * 60 * 1000, // Keep in memory for 35 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
  });

  // Also fetch original creators for database info (name, social links etc)
  const { data: creators, isLoading } = useQuery<FPLCreator[]>({
    queryKey: ["/api/content-creators"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch bootstrap data
  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: gwTransfersData } = useQuery<{ transfers: Record<number, SharedGWTransferDetail[]>; gameweek: number }>({
    queryKey: ["/api/content-creators/gw-transfers"],
    staleTime: 10 * 60 * 1000,
  });

  interface BatchProjectedResult {
    managerId: number;
    projected_points: number;
    projected_bench_points: number;
    active_chip: string | null;
  }

  const creatorManagerIds = useMemo(() => (creators || []).map(c => c.managerId), [creators]);

  const { data: projectedData } = useQuery<{ managers: BatchProjectedResult[]; gameweek: number }>({
    queryKey: ['/api/managers/batch-projected-points', creatorManagerIds],
    queryFn: async () => {
      const res = await fetch('/api/managers/batch-projected-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerIds: creatorManagerIds })
      });
      if (!res.ok) throw new Error('Failed to fetch projected points');
      return res.json();
    },
    enabled: creatorManagerIds.length > 0,
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

  // Fetch Content Creators teams data using batch endpoint with React Query
  const { 
    data: contentCreatorsResponse, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams,
    isFetching: isTeamDataRefreshing
  } = useQuery<ContentCreatorBatchResponse>({
    queryKey: ["/api/content-creators/teams"],
    staleTime: 25 * 60 * 1000, // 25 minutes
    gcTime: 35 * 60 * 1000, // 35 minutes 
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
  });

  // Transform the API response to match the expected data structure
  const creatorsTeamData: CreatorTeamData[] = useMemo(() => {
    if (!contentCreatorsResponse?.teams) {
      return [];
    }
    
    return contentCreatorsResponse.teams.map(team => ({
      managerId: team.managerId,
      name: team.name,
      rank: team.rank,
      teamData: team.teamData,
      success: team.success,
      error: team.error
    }));
  }, [contentCreatorsResponse]);

  // Helper functions for analysis (memoized for performance)
  const validTeams = useMemo(() => 
    creatorsTeamData.filter(m => m.teamData && m.success),
    [creatorsTeamData]
  );

  const validTeamsCount = validTeams.length;

  const getMostOwnedPlayers = useMemo(() => {
    if (!validTeams.length || !bootstrapData) return [];

    const playerOwnership: { [key: number]: { count: number; player: Player } } = {};

    validTeams.forEach(creator => {
      if (creator.teamData?.picks) {
        creator.teamData.picks.forEach(pick => {
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

    validTeams.forEach(creator => {
      if (creator.teamData?.picks) {
        creator.teamData.picks.forEach(pick => {
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
    if (!validTeams.length || !bootstrapData) return [];

    const formations: { [key: string]: number } = {};

    validTeams.forEach(creator => {
      if (creator.teamData?.picks) {
        const startingEleven = creator.teamData.picks
          .filter(pick => pick.position <= 11)
          .sort((a, b) => a.position - b.position);

        const positionCounts = { gk: 0, def: 0, mid: 0, fwd: 0 };

        startingEleven.forEach(pick => {
          const player = bootstrapData.elements.find(p => p.id === pick.element);
          if (player) {
            switch (player.element_type) {
              case 1: positionCounts.gk++; break;
              case 2: positionCounts.def++; break;
              case 3: positionCounts.mid++; break;
              case 4: positionCounts.fwd++; break;
            }
          }
        });

        const formation = `${positionCounts.def}-${positionCounts.mid}-${positionCounts.fwd}`;
        formations[formation] = (formations[formation] || 0) + 1;
      }
    });

    return Object.entries(formations)
      .sort(([,a], [,b]) => b - a)
      .map(([formation, count]) => ({
        formation,
        count,
        percentage: Math.round((count / validTeams.length) * 100)
      }));
  }, [validTeams, bootstrapData]);

  const getChipAnalysis = useMemo(() => {
    if (!validTeams.length) return { activeChips: [], totalActive: 0, noChipCount: 0 };

    const activeChips: { [key: string]: number } = {};
    let totalActive = 0;

    validTeams.forEach(creator => {
      if (creator.teamData?.active_chip) {
        const chip = creator.teamData.active_chip;
        activeChips[chip] = (activeChips[chip] || 0) + 1;
        totalActive++;
      }
    });

    return { 
      activeChips: Object.entries(activeChips).map(([chip, count]) => ({
        chip,
        count,
        percentage: Math.round((count / validTeams.length) * 100)
      })),
      totalActive,
      noChipCount: validTeams.length - totalActive
    };
  }, [validTeams]);

  const getBudgetAnalysis = useMemo(() => {
    if (!validTeams.length) return { avgValue: 0, maxValue: 0, minValue: 0, avgBank: 0 };

    const values = validTeams
      .map((m: CreatorTeamData) => m.teamData?.entry_history?.value || 0)
      .filter((v: number) => v > 0);
    
    const banks = validTeams
      .map((m: CreatorTeamData) => m.teamData?.entry_history?.bank || 0);

    if (values.length === 0) return { avgValue: 0, maxValue: 0, minValue: 0, avgBank: 0 };

    return {
      avgValue: Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) / 10,
      maxValue: Math.max(...values) / 10,
      minValue: Math.min(...values) / 10,
      avgBank: Math.round(banks.reduce((a: number, b: number) => a + b, 0) / banks.length) / 10
    };
  }, [validTeams]);

  const refreshTeamData = () => {
    refetchTeams();
  };

  // State to store enriched creators with history data
  const [creatorsWithHistory, setCreatorsWithHistory] = useState<FPLCreator[]>([]);

  // Transform cached data to match enriched creators
  useEffect(() => {
    if (cachedCreatorsData?.creators && creators) {
      const enrichedCreators = creators.map(creator => {
        const cachedCreator = cachedCreatorsData.creators.find(c => c.managerId === creator.managerId);
        const projData = projectedPointsMap.get(creator.managerId);
        if (cachedCreator) {
          const chips = cachedCreator.historyData?.chips || [];
          const secondHalfChipsUsed = chips.filter((c: { event: number }) => c.event >= 20).length;
          
          return {
            ...creator,
            latestTracking: cachedCreator.managerData && creator.latestTracking ? {
              ...creator.latestTracking,
              overallRank: cachedCreator.managerData.summary_overall_rank,
              overallPoints: cachedCreator.managerData.summary_overall_points,
              gameweekPoints: cachedCreator.managerData.summary_event_points,
              teamValue: cachedCreator.managerData.last_deadline_value / 10,
              bank: cachedCreator.managerData.last_deadline_bank / 10,
              totalTransfers: cachedCreator.managerData.last_deadline_total_transfers,
            } as FPLCreatorTracking : creator.latestTracking,
            historyData: cachedCreator.historyData ? {
              current: cachedCreator.historyData.current || [],
              chips: cachedCreator.historyData.chips || [],
            } : undefined,
            projected_points: projData?.projected_points,
            projected_bench_points: projData?.projected_bench_points,
            active_chip: projData?.active_chip,
          };
        }
        return {
          ...creator,
          projected_points: projData?.projected_points,
          projected_bench_points: projData?.projected_bench_points,
          active_chip: projData?.active_chip,
        };
      });
      setCreatorsWithHistory(enrichedCreators);
    } else if (creators) {
      const enrichedCreators = creators.map(creator => {
        const projData = projectedPointsMap.get(creator.managerId);
        return {
          ...creator,
          projected_points: projData?.projected_points,
          projected_bench_points: projData?.projected_bench_points,
          active_chip: projData?.active_chip,
        };
      });
      setCreatorsWithHistory(enrichedCreators);
    }
  }, [cachedCreatorsData, creators, projectedPointsMap]);

  // Force refresh function for Content Creators
  const forceRefreshCreatorsCache = async () => {
    try {
      await fetch('/api/cached/content-creators-data/refresh', { method: 'POST' });
      refetchCached();
    } catch (error) {
      console.error('Failed to force refresh:', error);
    }
  };

  // Refresh FPL data mutation
  const refreshDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/content-creators/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to refresh FPL data");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-creators"] });
      toast({
        title: "Success",
        description: "FPL data refreshed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh FPL data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sortedCreators = useMemo(() => {
    const data = creatorsWithHistory.length > 0 ? creatorsWithHistory : (creators || []) as FPLCreator[];
    return sortManagerData(data, sortBy, sortOrder, currentGameweek, 'millions', upcomingGameweek);
  }, [creatorsWithHistory, creators, sortBy, sortOrder, currentGameweek, upcomingGameweek]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  if (isLoading || bootstrapLoading) {
    return (
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area">
          {/* Page Header */}
          <div className="fpl-page-header">
            <div className="fpl-page-header-content">
              <div className="fpl-page-title">
                <Users className="h-8 w-8" />
                <h1>FPL Content Creators</h1>
              </div>
              <p className="fpl-page-subtitle">
                Track performance of top Fantasy Premier League content creators and influencers
              </p>
            </div>
          </div>

          {/* Loading State */}
          <div className="fpl-loading">
            <RefreshCw className="fpl-loading-spinner" />
            <p className="fpl-loading-text">Loading content creators data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area fpl-section-spacing">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Users className="h-8 w-8" />
              <h1>FPL Content Creators</h1>
            </div>
            <p className="fpl-page-subtitle">
              Track performance of top Fantasy Premier League content creators and influencers
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="fpl-controls">
          <div className="fpl-controls-left">
            <Button
              onClick={() => refreshDataMutation.mutate()}
              disabled={refreshDataMutation.isPending}
              className="fpl-button-primary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshDataMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshDataMutation.isPending ? 'Refreshing...' : 'Refresh FPL Data'}
            </Button>
            <Link href="/">
              <Button variant="outline" className="fpl-button-secondary">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="fpl-controls-right">
            <p className="fpl-text-muted">
              Click column headers to sort • Showing {sortedCreators?.length || 0} creators
            </p>
          </div>
        </div>

        {/* Tabs for Content Creators and Team Analysis */}
        <Tabs defaultValue="creators" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="creators" data-testid="tab-creators">Content Creators</TabsTrigger>
            <TabsTrigger value="team-analysis" data-testid="tab-team-analysis">Team Analysis</TabsTrigger>
          </TabsList>

          {/* Content Creators Tab */}
          <TabsContent value="creators">
            {/* Content Creators Table */}
            <div className="fpl-table-container">
              <ResponsiveTable
                data={sortedCreators || []}
                columns={getContentCreatorColumns(currentGameweek, gwTransfersData?.transfers, upcomingGameweek)}
                enableMobileCards={true}
                mobileCardTitle={(creator) => creator.name}
                loading={isLoading}
                emptyMessage="No content creators available"
                onRowClick={(creator) => {
                  navigate(`/content-creators/${creator.id}/team`);
                }}
                onSort={handleSort}
                sortField={sortBy}
                sortDirection={sortOrder}
                className="hover:shadow-sm"
                stickyHeader={true}
                enableHorizontalScroll={true}
                getRowTestId={(creator, index) => `row-creator-${creator.id || index}`}
                data-testid="content-creators-table"
              />
            </div>
          </TabsContent>

          {/* Team Analysis Tab */}
          <TabsContent value="team-analysis">
            {/* Status Overview */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{validTeamsCount}</div>
                    <div className="text-sm text-gray-600">Teams Loaded</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{teamsLoading ? 'Loading...' : 0}</div>
                    <div className="text-sm text-gray-600">Loading</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{creatorsTeamData.filter(m => !m.success).length}</div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{creators?.length || 0}</div>
                    <div className="text-sm text-gray-600">Total Creators</div>
                  </div>
                </div>
                {validTeamsCount > 0 && creators && (
                  <div className="mt-4">
                    <Progress value={(validTeamsCount / creators.length) * 100} className="h-2" />
                    <p className="text-sm text-gray-600 mt-1 text-center">
                      Analysis based on {validTeamsCount} of {creators.length} teams
                    </p>
                  </div>
                )}
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={refreshTeamData}
                    disabled={isTeamDataRefreshing}
                    variant="outline"
                    className="hover:bg-blue-50"
                    data-testid="button-refresh-team-analysis"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isTeamDataRefreshing ? 'animate-spin' : ''}`} />
                    {isTeamDataRefreshing ? 'Refreshing...' : 'Refresh Team Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {validTeamsCount === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Loading Team Data...</h3>
                  <p className="text-gray-600 mb-4">
                    Fetching team information for all content creators. This may take a moment.
                  </p>
                  <Button onClick={refreshTeamData} variant="outline" disabled={isTeamDataRefreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isTeamDataRefreshing ? 'animate-spin' : ''}`} />
                    {isTeamDataRefreshing ? 'Loading...' : 'Retry Loading'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="players" data-testid="tab-players">Players</TabsTrigger>
                  <TabsTrigger value="captains" data-testid="tab-captains">Captains</TabsTrigger>
                  <TabsTrigger value="formations" data-testid="tab-formations">Formations</TabsTrigger>
                  <TabsTrigger value="budget" data-testid="tab-budget">Budget</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Most Popular Players */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Most Popular Players
                        </CardTitle>
                        <CardDescription>
                          Players owned by the most content creators
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
                                <div className="text-xs text-gray-600">{player.ownership}/{validTeamsCount}</div>
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
                          Formation preferences among content creators
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {getFormationAnalysis.slice(0, 5).map((formation, index) => (
                            <div key={formation.formation}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{formation.formation}</span>
                                <span className="text-sm text-gray-600">
                                  {formation.count} creators ({formation.percentage}%)
                                </span>
                              </div>
                              <Progress value={formation.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Chip Usage */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5" />
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
                                <span className="font-medium">{getChipLabel(chip.chip) || chip.chip}</span>
                                <div className="text-right">
                                  <div className="font-semibold">{chip.count} creators</div>
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
                                <div className="font-semibold">{getChipAnalysis.noChipCount || 0} creators</div>
                                <div className="text-xs text-gray-600">
                                  {Math.round(((getChipAnalysis.noChipCount || 0) / validTeamsCount) * 100)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Budget Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Budget Analysis
                        </CardTitle>
                        <CardDescription>
                          Team value and budget statistics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-semibold text-blue-700">£{getBudgetAnalysis.avgValue.toFixed(1)}m</div>
                            <div className="text-sm text-blue-600">Avg Team Value</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-semibold text-green-700">£{getBudgetAnalysis.avgBank.toFixed(1)}m</div>
                            <div className="text-sm text-green-600">Avg Bank</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-semibold text-purple-700">£{getBudgetAnalysis.maxValue.toFixed(1)}m</div>
                            <div className="text-sm text-purple-600">Highest Value</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-lg font-semibold text-orange-700">£{getBudgetAnalysis.minValue.toFixed(1)}m</div>
                            <div className="text-sm text-orange-600">Lowest Value</div>
                          </div>
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
                        Complete breakdown of player ownership among content creators
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {getMostOwnedPlayers.map((player, index) => (
                          <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <div className="flex items-center gap-3">
                                {getPositionIcon(player.element_type)}
                                <div>
                                  <div className="font-medium">{player.web_name}</div>
                                  <div className="text-sm text-gray-600">
                                    {player.first_name} {player.second_name}
                                  </div>
                                </div>
                              </div>
                              <Badge className={getPositionColor(player.element_type)}>
                                {getPositionName(player.element_type)}
                              </Badge>
                              <div className="text-sm text-gray-600">
                                {bootstrapData?.teams.find(t => t.id === player.team)?.short_name}
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="font-semibold">{formatPrice(player.now_cost)}</div>
                                <div className="text-xs text-gray-600">Price</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{player.total_points}</div>
                                <div className="text-xs text-gray-600">Points</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-blue-600">{player.ownershipPercent}%</div>
                                <div className="text-xs text-gray-600">{player.ownership}/{validTeamsCount} creators</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Captains Tab */}
                <TabsContent value="captains">
                  <Card>
                    <CardHeader>
                      <CardTitle>Captaincy Analysis</CardTitle>
                      <CardDescription>
                        Captain and vice-captain choices among content creators
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {getCaptaincyAnalysis.map((player, index) => (
                          <div key={player.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <div className="flex items-center gap-3">
                                <Crown className="h-5 w-5 text-yellow-600" />
                                <div>
                                  <div className="font-medium">{player.web_name}</div>
                                  <div className="text-sm text-gray-600">
                                    {bootstrapData?.teams.find(t => t.id === player.team)?.short_name} • {formatPrice(player.now_cost)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <div className="font-semibold text-yellow-600">{player.captainCount}</div>
                                <div className="text-xs text-gray-600">Captain ({player.captainPercent}%)</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-orange-600">{player.viceCaptainCount}</div>
                                <div className="text-xs text-gray-600">Vice Captain</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold">{player.total_points}</div>
                                <div className="text-xs text-gray-600">Points</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Formations Tab */}
                <TabsContent value="formations">
                  <Card>
                    <CardHeader>
                      <CardTitle>Formation Analysis</CardTitle>
                      <CardDescription>
                        Popular formation choices and their distribution
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {getFormationAnalysis.map((formation, index) => (
                          <div key={formation.formation} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="text-xl font-bold text-blue-700">{formation.formation}</div>
                                  <div className="text-sm text-blue-600">Formation</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-700">{formation.percentage}%</div>
                                <div className="text-sm text-blue-600">{formation.count} / {validTeamsCount} creators</div>
                              </div>
                            </div>
                            <Progress value={formation.percentage} className="h-3" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Budget Tab */}
                <TabsContent value="budget">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Budget Statistics</CardTitle>
                        <CardDescription>
                          Team value and bank balance analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">£{getBudgetAnalysis.avgValue.toFixed(1)}m</div>
                            <div className="text-blue-600">Average Team Value</div>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">£{getBudgetAnalysis.avgBank.toFixed(1)}m</div>
                            <div className="text-green-600">Average Bank Balance</div>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-700">£{getBudgetAnalysis.maxValue.toFixed(1)}m</div>
                            <div className="text-purple-600">Highest Team Value</div>
                          </div>
                          <div className="p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-700">£{getBudgetAnalysis.minValue.toFixed(1)}m</div>
                            <div className="text-orange-600">Lowest Team Value</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Budget Distribution</CardTitle>
                        <CardDescription>
                          How content creators allocate their budget
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <DollarSign className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                            <div className="text-lg font-semibold text-blue-700">Budget Management</div>
                            <div className="text-sm text-blue-600 mt-2">
                              Content creators maintain an average of £{getBudgetAnalysis.avgBank.toFixed(1)}m in the bank
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-lg font-semibold">Range</div>
                              <div className="text-sm text-gray-600">
                                £{getBudgetAnalysis.minValue.toFixed(1)}m - £{getBudgetAnalysis.maxValue.toFixed(1)}m
                              </div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-lg font-semibold">Teams Analyzed</div>
                              <div className="text-sm text-gray-600">{validTeamsCount} creators</div>
                            </div>
                          </div>
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
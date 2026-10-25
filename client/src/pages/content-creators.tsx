import { useState, useEffect, useMemo } from "react";
import { useViewModeParam } from "@/hooks/use-view-mode-param";
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
  History,
  Loader2 as Loader2Icon,
  PieChart,
} from "lucide-react";
import { EmptyNote, HeroPanel, HeroStat, Pill, RankBadge, SectionCard } from "@/components/tool-ui";
import { SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { getSharedColumns, getPositionColumn, sortManagerData, GWTransferDetail as SharedGWTransferDetail, ManagerColumnsConfig, getChipLabel } from "@/lib/manager-standings-columns";
import { CURRENT_SEASON } from "@shared/schema";
import { SeasonBadge } from "@/components/season-badge";
import { SeasonSelector, PREVIOUS_SEASON } from "@/components/season-selector";
import { positionsByTotal } from "@shared/group-placement";
import { MyTeamPlacementPanel, YouBadge, useMyEntry, withMyTeam, type MyEntry } from "@/components/my-team-placement";

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
  position?: number | null;
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

// The visitor's own team as a row of the creators table (id -1 marks it; the "You" badge shows in the name cell)
const MY_TEAM_ROW_ID = -1;
const myTeamRow = (e: MyEntry): FPLCreator => ({
  id: MY_TEAM_ROW_ID,
  name: e.teamName,
  managerId: e.managerId,
  managerName: e.name,
  isActive: true,
  addedDate: "",
  lastUpdated: "",
  latestTracking: {
    id: 0,
    creatorId: MY_TEAM_ROW_ID,
    gameweek: e.currentEvent,
    overallRank: e.overallRank ?? 0,
    overallPoints: e.totalPoints,
    gameweekPoints: e.gameweekPoints,
    gameweekRank: e.gameweekRank ?? undefined,
    teamValue: e.teamValue / 10,
    bank: e.bank / 10,
    totalTransfers: e.totalTransfers,
    recordedAt: "",
  },
});

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
    2: "bg-indigo-100 text-indigo-800 border-indigo-200",
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


const getContentCreatorColumns = (currentGameweek?: number, gwTransfersMap?: Record<number, SharedGWTransferDetail[]>, upcomingGameweek?: number, projectionGW?: number): ResponsiveTableColumn<CreatorWithLatestData>[] => {
  const nameColumn: ResponsiveTableColumn<CreatorWithLatestData> = {
    key: 'name',
    header: 'Creator',
    priority: 'essential',
    align: 'left',
    mobileLabel: 'Creator',
    render: (value, creator) => (
      <div className="flex items-center gap-3">
        <div>
          <div className="font-medium">{creator.id === MY_TEAM_ROW_ID && <YouBadge />}{creator.name}</div>
          <div className="flex flex-wrap gap-3 mt-2 hidden md:flex">
            {creator.twitterHandle && (
              <a
                href={`https://x.com/${creator.twitterHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
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

  const chipCol: ResponsiveTableColumn<CreatorWithLatestData> = {
    key: 'active_chip',
    header: currentGameweek ? <span className="leading-tight">Chip<br/>GW{currentGameweek}</span> : 'Chip',
    priority: 'secondary',
    align: 'center',
    mobileLabel: currentGameweek ? `Chip GW${currentGameweek}` : 'Chip',
    cardOrder: 60,
    render: (value, creator) => (
      <div className="text-center">
        {creator.active_chip && getChipLabel(creator.active_chip) ? (
          <span className="text-xs font-medium px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">{getChipLabel(creator.active_chip)}</span>
        ) : (
          <span className="text-gray-300">-</span>
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

  // Column order: Creator | Total Pts | Overall Rank | Rank Gain | Pts (GW) | Chip (GW) | ...rest
  return [nameColumn, getPositionColumn<CreatorWithLatestData>(), sharedCols[2], sharedCols[0], sharedCols[1], sharedCols[3], chipCol, ...sharedCols.slice(4)];
};

// Main Content Creators Component
export default function ContentCreators() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useViewModeParam<"creators" | "team-analysis">(
    "tab",
    "creators",
    ["creators", "team-analysis"],
  );
  const [activeSubTab, setActiveSubTab] = useViewModeParam<
    "overview" | "players" | "captains" | "formations" | "budget"
  >("subtab", "overview", ["overview", "players", "captains", "formations", "budget"]);

  const [sortBy, setSortBy] = useState<string>("latestTracking.overallRank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [historicalSortField, setHistoricalSortField] = useState<string>('rank');
  const [historicalSortDirection, setHistoricalSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewSeason, setViewSeason] = useState<string>(CURRENT_SEASON);

  // Always fetched (not gated on viewSeason): doubles as the 2025/26 Final Standings data
  // AND as the source of truth for which manager IDs are confirmed-current for 2026/27
  // (a creator only has an archived row here once their new id has been verified).
  const { data: seasonStandingsData, isLoading: isSeasonStandingsLoading } = useQuery<{
    season: string;
    managers: { id: number; name: string; managerId: number; confirmed: boolean; totalPoints: number | null; fplRank: number | null; rankPercentage: string | null }[];
  }>({
    queryKey: ["/api/content-creators/season-standings", PREVIOUS_SEASON],
    queryFn: async () => {
      const res = await fetch(`/api/content-creators/season-standings?season=${encodeURIComponent(PREVIOUS_SEASON)}`);
      if (!res.ok) throw new Error("Failed to fetch season standings");
      return res.json();
    },
  });

  const confirmedManagerIds = useMemo(() => {
    return new Set((seasonStandingsData?.managers || []).filter(m => m.confirmed).map(m => m.managerId));
  }, [seasonStandingsData]);

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
        // A creator whose 2026/27 id hasn't been confirmed post-renumbering may resolve
        // to an unrelated stranger, or silently fall back to stale DB-cached tracking data
        // below — never show live-derived stats for them until confirmed.
        if (!confirmedManagerIds.has(creator.managerId)) {
          return {
            ...creator,
            latestTracking: undefined,
            historyData: undefined,
            rankChange: undefined,
            projected_points: undefined,
            projected_bench_points: undefined,
            active_chip: undefined,
          };
        }
        const cachedCreator = cachedCreatorsData.creators.find(c => c.managerId === creator.managerId);
        const projData = projectedPointsMap.get(creator.managerId);
        if (cachedCreator) {
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
        if (!confirmedManagerIds.has(creator.managerId)) {
          return {
            ...creator,
            latestTracking: undefined,
            historyData: undefined,
            rankChange: undefined,
            projected_points: undefined,
            projected_bench_points: undefined,
            active_chip: undefined,
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
    }
  }, [cachedCreatorsData, creators, projectedPointsMap, confirmedManagerIds]);

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

  const { data: pastSeasonsData, isLoading: isPastSeasonsLoading } = useQuery<{ seasons: string[]; managers: any[] }>({
    queryKey: ['/api/managers/past-seasons', 'content-creators', creatorManagerIds.join(',')],
    queryFn: async () => {
      const res = await fetch('/api/managers/past-seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerIds: creatorManagerIds,
          managerNames: (creators || []).map(c => ({ managerId: c.managerId, playerName: c.name, entryName: '' })),
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch past seasons');
      return res.json();
    },
    enabled: creatorManagerIds.length > 0,
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

  // The visitor's own team, added to the table (unless already one of the creators) so they can see where they would sit
  const my = useMyEntry();
  const creatorRows = useMemo(
    () => (creatorsWithHistory.length > 0 ? creatorsWithHistory : (creators || []) as FPLCreator[]),
    [creatorsWithHistory, creators],
  );
  const placementMembers = useMemo(
    () => creatorRows.map(c => ({ managerId: c.managerId, totalPoints: c.latestTracking?.overallPoints ?? null, gameweekPoints: c.latestTracking?.gameweekPoints ?? null })),
    [creatorRows],
  );
  const sortedCreators = useMemo(() => {
    const withMe = withMyTeam(creatorRows, my.entry, myTeamRow);
    const positions = positionsByTotal(withMe.map(c => ({ managerId: c.managerId, totalPoints: c.latestTracking?.overallPoints ?? null, gameweekPoints: null })));
    const data = withMe.map(c => ({ ...c, position: positions.get(c.managerId) ?? null }));
    return sortManagerData(data, sortBy, sortOrder, currentGameweek, 'millions', upcomingGameweek);
  }, [creatorRows, my.entry, sortBy, sortOrder, currentGameweek, upcomingGameweek]);

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

  const shellTab = "rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm py-1.5 font-bold transition-all duration-200 text-xs sm:text-sm min-h-[34px]";
  const headTh = "px-2 sm:px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500";
  const trackedTotals = creatorRows.map(c => c.latestTracking?.overallPoints).filter((v): v is number => typeof v === "number" && v > 0);
  const leaderPoints = trackedTotals.length > 0 ? Math.max(...trackedTotals) : null;
  const leader = leaderPoints === null ? null : creatorRows.find(c => c.latestTracking?.overallPoints === leaderPoints);

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area fpl-section-spacing">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Users className="h-8 w-8" />
              <h1>FPL Content Creators</h1>
              <SeasonBadge season={viewSeason} />
            </div>
            <p className="fpl-page-subtitle">
              Track performance of top Fantasy Premier League content creators and influencers
            </p>
          </div>
        </div>

        <div className="mb-4">
          <SeasonSelector value={viewSeason} onChange={setViewSeason} />
        </div>

        {/* Tabs for Content Creators and Team Analysis */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "creators" | "team-analysis")}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 rounded-xl border border-gray-200 bg-gray-100 shadow-none">
            <TabsTrigger value="creators" className={shellTab} data-testid="tab-creators">Content Creators</TabsTrigger>
            <TabsTrigger value="team-analysis" className={shellTab} data-testid="tab-team-analysis">Team Analysis</TabsTrigger>
          </TabsList>

          {/* Content Creators Tab */}
          <TabsContent value="creators" className="space-y-5">
            {viewSeason === CURRENT_SEASON ? (
              <>
                <HeroPanel testId="content-creators-summary">
                  <div className="grid gap-6 sm:grid-cols-3">
                    <HeroStat label="Creators" value={creatorRows.length} sub="FPL content creators tracked" />
                    <HeroStat
                      label="Leader"
                      value={leaderPoints !== null ? leaderPoints.toLocaleString() : "-"}
                      sub={leader ? `${leader.name} · total points` : "Waiting for live data"}
                    />
                    <HeroStat
                      label="Gameweek"
                      value={currentGameweek ? `GW${currentGameweek}` : "-"}
                      sub={upcomingGameweek ? `Next up: GW${upcomingGameweek}` : undefined}
                    />
                  </div>
                </HeroPanel>

                <MyTeamPlacementPanel my={my} members={placementMembers} groupLabel="the content creators" />

                <SectionCard
                  icon={Users}
                  title="Content Creators"
                  subtitle={`Click a column to sort, click a row to open that creator's team • Showing ${sortedCreators?.length || 0} creators`}
                  bodyClassName="p-0"
                  testId="content-creators-card"
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => refreshDataMutation.mutate()}
                        disabled={refreshDataMutation.isPending}
                        className="h-9 gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 font-bold text-white hover:from-indigo-500 hover:to-violet-500"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshDataMutation.isPending ? 'animate-spin' : ''}`} />
                        {refreshDataMutation.isPending ? 'Refreshing...' : 'Refresh FPL Data'}
                      </Button>
                      <Link href="/">
                        <Button variant="outline" className="h-9 gap-2 rounded-xl font-semibold">
                          <Home className="h-4 w-4" />
                          Back to Home
                        </Button>
                      </Link>
                    </div>
                  }
                >
                  <ResponsiveTable
                    data={sortedCreators || []}
                    columns={getContentCreatorColumns(currentGameweek, gwTransfersData?.transfers, upcomingGameweek, projectedData?.gameweek ?? currentGameweek)}
                    compact={true}
                    mobileCompactTable={true}
                    mobileCardTitle={(creator) => creator.name}
                    loading={isLoading}
                    emptyMessage="No content creators available"
                    highlightRow={(creator) => creator.managerId === my.entry?.managerId}
                    onRowClick={(creator) => {
                      navigate(creator.id === MY_TEAM_ROW_ID ? `/manager-team/${creator.managerId}` : `/content-creators/${creator.id}/team`);
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
                </SectionCard>
              </>
            ) : (
              <SectionCard
                icon={Trophy}
                title={`${viewSeason} Final Standings`}
                subtitle="Season-end totals for each creator. Some 2026/27 manager IDs haven't been reconfirmed yet after FPL's account renumbering, so a few rows are still pending."
                bodyClassName="p-0"
                testId="content-creators-final-standings"
              >
                {isSeasonStandingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2Icon className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="ml-3 text-muted-foreground">Loading {viewSeason} standings...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80">
                          <th className={`${headTh} text-left`}>Creator</th>
                          <th className={`${headTh} text-right`}>Total Pts</th>
                          <th className={`${headTh} text-right`}>Overall Rank</th>
                          <th className={`${headTh} text-right`}>Top %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(seasonStandingsData?.managers || []).map((m) => (
                          <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-indigo-500/[0.04]" data-testid={`row-final-standing-${m.id}`}>
                            <td className="px-2 sm:px-3 py-2 font-semibold text-gray-900">{m.name}</td>
                            {m.confirmed ? (
                              <>
                                <td className="px-2 sm:px-3 py-2 text-right font-bold tabular-nums">{m.totalPoints?.toLocaleString()}</td>
                                <td className="px-2 sm:px-3 py-2 text-right tabular-nums">{m.fplRank?.toLocaleString()}</td>
                                <td className="px-2 sm:px-3 py-2 text-right tabular-nums">{m.rankPercentage}%</td>
                              </>
                            ) : (
                              <td className="px-2 sm:px-3 py-2 text-muted-foreground italic" colSpan={3}>
                                ID not yet confirmed for 2026/27
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Previous Seasons */}
            <SectionCard
              icon={History}
              title="Previous Seasons"
              subtitle={
                selectedSeason
                  ? `${selectedSeason} season — ${historicalStandings.filter((m: any) => m.played).length} of ${historicalStandings.length} creators played`
                  : 'Select a season to view past performance'
              }
              bodyClassName="p-0"
              testId="content-creators-previous-seasons"
              action={
                <Select value={selectedSeason} onValueChange={(v) => setSelectedSeason(v)}>
                  <SelectTrigger className="h-9 w-[150px] rounded-xl">
                    <SelectValue placeholder="Select Season" />
                  </SelectTrigger>
                  <SelectContent>
                    {(pastSeasonsData?.seasons || []).map((season: string) => (
                      <SelectItem key={season} value={season}>{season}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              {isPastSeasonsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="ml-3 text-muted-foreground">Loading historical data...</span>
                </div>
              ) : !selectedSeason ? (
                <div className="p-4 sm:p-5">
                  <EmptyNote icon={History}>Choose a season from the dropdown above.</EmptyNote>
                </div>
              ) : historicalStandings.length === 0 ? (
                <div className="p-4 sm:p-5">
                  <EmptyNote icon={History}>No data available for {selectedSeason}.</EmptyNote>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className={`${headTh} text-left w-8 sm:w-12`}>#</th>
                        <th
                          className={`${headTh} text-left cursor-pointer hover:text-gray-900`}
                          onClick={() => {
                            if (historicalSortField === 'player_name') {
                              setHistoricalSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                            } else {
                              setHistoricalSortField('player_name');
                              setHistoricalSortDirection('asc');
                            }
                          }}
                        >
                          Creator {historicalSortField === 'player_name' && (historicalSortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                          className={`${headTh} text-right cursor-pointer hover:text-gray-900`}
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
                          className={`${headTh} text-right cursor-pointer hover:text-gray-900`}
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
                          className="border-b border-gray-100 last:border-0 hover:bg-indigo-500/[0.04] transition-colors cursor-pointer"
                          onClick={() => navigate(`/manager-team/${entry.managerId}`)}
                        >
                          <td className="px-2 sm:px-3 py-2">
                            {entry.played ? <RankBadge rank={index + 1} /> : <span className="text-gray-400 text-xs">-</span>}
                          </td>
                          <td className="px-2 sm:px-3 py-2">
                            <div className="font-semibold text-gray-900 truncate max-w-[110px] sm:max-w-none">{entry.playerName}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-right font-bold tabular-nums text-xs sm:text-sm">
                            {entry.played ? entry.totalPoints?.toLocaleString() : (
                              <span className="text-gray-400 text-xs font-normal">Did not play</span>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-right tabular-nums text-sm">
                            {entry.played && entry.rank ? entry.rank.toLocaleString() : (
                              <span className="text-gray-400 text-xs">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </TabsContent>

          {/* Team Analysis Tab */}
          <TabsContent value="team-analysis">
            {/* Status Overview */}
            <HeroPanel className="mb-4 sm:mb-5" testId="content-creators-team-status">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <HeroStat size="md" label="Teams loaded" value={validTeamsCount} />
                <HeroStat size="md" label="Loading" value={teamsLoading ? 'Loading...' : 0} />
                <HeroStat size="md" label="Errors" value={creatorsTeamData.filter(m => !m.success).length} />
                <HeroStat size="md" label="Total creators" value={creators?.length || 0} />
              </div>
              {validTeamsCount > 0 && creators && (
                <div className="mt-5">
                  <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(validTeamsCount / creators.length) * 100}%`, backgroundColor: "rgba(255,255,255,0.85)" }} />
                  </div>
                  <p className="mt-1.5 text-center text-xs font-medium text-white/80">
                    Analysis based on {validTeamsCount} of {creators.length} teams
                  </p>
                </div>
              )}
              <div className="mt-5 flex justify-center">
                <Button
                  onClick={refreshTeamData}
                  disabled={isTeamDataRefreshing}
                  className="h-9 gap-2 rounded-xl border border-white/30 font-bold text-white hover:opacity-90"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                  data-testid="button-refresh-team-analysis"
                >
                  <RefreshCw className={`h-4 w-4 ${isTeamDataRefreshing ? 'animate-spin' : ''}`} />
                  {isTeamDataRefreshing ? 'Refreshing...' : 'Refresh Team Data'}
                </Button>
              </div>
            </HeroPanel>

            {validTeamsCount === 0 ? (
              <SectionCard icon={Activity} title="Loading Team Data..." subtitle="Fetching team information for all content creators. This may take a moment.">
                <Button onClick={refreshTeamData} variant="outline" disabled={isTeamDataRefreshing} className="h-9 gap-2 rounded-xl font-semibold">
                  <RefreshCw className={`h-4 w-4 ${isTeamDataRefreshing ? 'animate-spin' : ''}`} />
                  {isTeamDataRefreshing ? 'Loading...' : 'Retry Loading'}
                </Button>
              </SectionCard>
            ) : (
              <Tabs
                value={activeSubTab}
                onValueChange={(v) => setActiveSubTab(v as "overview" | "players" | "captains" | "formations" | "budget")}
                className="space-y-4"
              >
                <TabsList className="flex w-full justify-start overflow-x-auto h-auto p-1 rounded-xl border border-gray-200 bg-gray-100 shadow-none">
                  <TabsTrigger value="overview" className={`${shellTab} min-w-fit px-3`} data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="players" className={`${shellTab} min-w-fit px-3`} data-testid="tab-players">Players</TabsTrigger>
                  <TabsTrigger value="captains" className={`${shellTab} min-w-fit px-3`} data-testid="tab-captains">Captains</TabsTrigger>
                  <TabsTrigger value="formations" className={`${shellTab} min-w-fit px-3`} data-testid="tab-formations">Formations</TabsTrigger>
                  <TabsTrigger value="budget" className={`${shellTab} min-w-fit px-3`} data-testid="tab-budget">Budget</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Most Popular Players */}
                    <SectionCard icon={Users} title="Most Popular Players" subtitle="Players owned by the most content creators">
                        <div className="space-y-3">
                          {getMostOwnedPlayers.slice(0, 8).map((player, index) => (
                            <div key={player.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <RankBadge rank={index + 1} />
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
                      </SectionCard>

                    {/* Formation Analysis */}
                    <SectionCard icon={PieChart} title="Popular Formations" subtitle="Formation preferences among content creators">
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
                      </SectionCard>

                    {/* Chip Usage */}
                    <SectionCard icon={Star} title="Active Chips" subtitle="Chip usage in current gameweek">
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
                      </SectionCard>

                    {/* Budget Overview */}
                    <SectionCard icon={DollarSign} title="Budget Analysis" subtitle="Team value and budget statistics">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-indigo-50 rounded-lg">
                            <div className="text-lg font-semibold text-indigo-700">£{getBudgetAnalysis.avgValue.toFixed(1)}m</div>
                            <div className="text-sm text-indigo-600">Avg Team Value</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-semibold text-green-700">£{getBudgetAnalysis.avgBank.toFixed(1)}m</div>
                            <div className="text-sm text-green-600">Avg Bank</div>
                          </div>
                          <div className="text-center p-3 bg-violet-50 rounded-lg">
                            <div className="text-lg font-semibold text-violet-700">£{getBudgetAnalysis.maxValue.toFixed(1)}m</div>
                            <div className="text-sm text-violet-600">Highest Value</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-lg font-semibold text-orange-700">£{getBudgetAnalysis.minValue.toFixed(1)}m</div>
                            <div className="text-sm text-orange-600">Lowest Value</div>
                          </div>
                        </div>
                      </SectionCard>
                  </div>
                </TabsContent>

                {/* Players Tab */}
                <TabsContent value="players">
                  <SectionCard icon={Users} title="Player Ownership Analysis" subtitle="Complete breakdown of player ownership among content creators">
                      <div className="space-y-4">
                        {getMostOwnedPlayers.map((player, index) => (
                          <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-4">
                              <RankBadge rank={index + 1} />
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
                                <div className="font-semibold text-indigo-600">{player.ownershipPercent}%</div>
                                <div className="text-xs text-gray-600">{player.ownership}/{validTeamsCount} creators</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                </TabsContent>

                {/* Captains Tab */}
                <TabsContent value="captains">
                  <SectionCard icon={Crown} title="Captaincy Analysis" subtitle="Captain and vice-captain choices among content creators">
                      <div className="space-y-4">
                        {getCaptaincyAnalysis.map((player, index) => (
                          <div key={player.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center gap-4">
                              <RankBadge rank={index + 1} />
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
                    </SectionCard>
                </TabsContent>

                {/* Formations Tab */}
                <TabsContent value="formations">
                  <SectionCard icon={PieChart} title="Formation Analysis" subtitle="Popular formation choices and their distribution">
                      <div className="space-y-3 sm:space-y-4">
                        {getFormationAnalysis.map((formation, index) => (
                          <div key={formation.formation} className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-3">
                                <RankBadge rank={index + 1} />
                                <div>
                                  <div className="text-xl font-bold text-indigo-700">{formation.formation}</div>
                                  <div className="text-sm text-indigo-600">Formation</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-indigo-700">{formation.percentage}%</div>
                                <div className="text-sm text-indigo-600">{formation.count} / {validTeamsCount} creators</div>
                              </div>
                            </div>
                            <Progress value={formation.percentage} className="h-3" />
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                </TabsContent>

                {/* Budget Tab */}
                <TabsContent value="budget">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard icon={DollarSign} title="Budget Statistics" subtitle="Team value and bank balance analysis">
                        <div className="space-y-4">
                          <div className="p-4 bg-indigo-50 rounded-lg">
                            <div className="text-2xl font-bold text-indigo-700">£{getBudgetAnalysis.avgValue.toFixed(1)}m</div>
                            <div className="text-indigo-600">Average Team Value</div>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">£{getBudgetAnalysis.avgBank.toFixed(1)}m</div>
                            <div className="text-green-600">Average Bank Balance</div>
                          </div>
                          <div className="p-4 bg-violet-50 rounded-lg">
                            <div className="text-2xl font-bold text-violet-700">£{getBudgetAnalysis.maxValue.toFixed(1)}m</div>
                            <div className="text-violet-600">Highest Team Value</div>
                          </div>
                          <div className="p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-700">£{getBudgetAnalysis.minValue.toFixed(1)}m</div>
                            <div className="text-orange-600">Lowest Team Value</div>
                          </div>
                        </div>
                      </SectionCard>

                    <SectionCard icon={DollarSign} title="Budget Distribution" subtitle="How content creators allocate their budget">
                        <div className="space-y-4">
                          <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-indigo-50 rounded-lg border border-indigo-200">
                            <DollarSign className="h-12 w-12 mx-auto mb-3 text-indigo-600" />
                            <div className="text-lg font-semibold text-indigo-700">Budget Management</div>
                            <div className="text-sm text-indigo-600 mt-2">
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
                      </SectionCard>
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
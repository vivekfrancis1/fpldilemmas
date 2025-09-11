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
  TrendingDown,
  TrendingUp,
  Users,
  Youtube,
  Zap,
  ArrowUpDown,
  Activity,
  PieChart,
} from "lucide-react";
import { SiInstagram, SiTiktok } from "react-icons/si";

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
};

type FPLCreatorTracking = {
  id: number;
  creatorId: number;
  gameweek: number;
  overallRank: number;
  overallPoints: number;
  gameweekPoints: number;
  gameweekRank?: number;
  teamValue: number;
  totalTransfers: number;
  recordedAt: string;
  chipsUsed?: number;
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

// Creator Table Row Component
function CreatorTableRow({ creator }: { creator: CreatorWithLatestData }) {
  const latest = creator.latestTracking;
  const [, setLocation] = useLocation();
  const [chipsUsed, setChipsUsed] = useState<number | null>(null);

  const handleViewTeam = (creatorId: number) => {
    setLocation(`/content-creators/${creatorId}/team`);
  };

  // Fetch chip data for this creator
  useEffect(() => {
    const fetchChipData = async () => {
      if (creator.managerId) {
        try {
          const response = await fetch(`/api/manager/${creator.managerId}/history`);
          if (response.ok) {
            const historyData = await response.json();
            const chipCount = historyData.chips ? historyData.chips.length : 0;
            setChipsUsed(chipCount);
          }
        } catch (error) {
          console.error(`Failed to fetch chip data for ${creator.name}:`, error);
          setChipsUsed(0);
        }
      }
    };
    
    fetchChipData();
  }, [creator.managerId, creator.name]);

  return (
    <TableRow 
      className="hover:bg-emerald-50 hover:shadow-md cursor-pointer transition-all duration-200 hover:border-l-4 hover:border-l-emerald-500" 
      onClick={() => handleViewTeam(creator.id)}
      data-testid={`row-creator-${creator.id}`}
      title="Click to view team details"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-blue-600" />
          <div>
            <div className="font-medium">{creator.name}</div>
            {creator.description && (
              <div className="text-xs text-muted-foreground mt-1 max-w-xs">{creator.description}</div>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {creator.twitterHandle && (
                <a
                  href={`https://x.com/${creator.twitterHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                  data-testid={`link-creator-twitter-${creator.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {creator.twitterHandle}
                </a>
              )}
              {creator.youtubeUrl && (
                <a
                  href={creator.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-600 hover:underline break-all"
                  data-testid={`link-creator-youtube-${creator.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {creator.youtubeUrl.split('/').pop() || 'YouTube'}
                </a>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <Badge variant={getRankBadgeVariant(latest?.overallRank)} className="mb-1">
            {latest?.overallRank ? `#${latest.overallRank.toLocaleString()}` : "N/A"}
          </Badge>
          {getRankChangeDisplay(creator.rankChange)}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        {latest?.overallPoints !== undefined && latest?.overallPoints !== null ? latest.overallPoints : "N/A"}
      </TableCell>
      <TableCell className="text-right">
        <span className="font-mono font-bold">{latest?.gameweekPoints !== undefined && latest?.gameweekPoints !== null ? latest.gameweekPoints : "N/A"}</span>
      </TableCell>
      <TableCell className="text-right font-mono">
        £{latest?.teamValue || 'N/A'}m
      </TableCell>
      <TableCell className="text-right font-mono">
        {latest?.totalTransfers !== undefined && latest?.totalTransfers !== null ? latest.totalTransfers : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {chipsUsed !== null ? chipsUsed : "N/A"}
      </TableCell>
    </TableRow>
  );
}

// Main Content Creators Component
export default function ContentCreators() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sortBy, setSortBy] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: creators, isLoading } = useQuery<FPLCreator[]>({
    queryKey: ["/api/content-creators"],
  });

  // Fetch bootstrap data
  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch Content Creators teams data using batch endpoint with React Query
  const { 
    data: contentCreatorsResponse, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams,
    isFetching: isTeamDataRefreshing
  } = useQuery<ContentCreatorBatchResponse>({
    queryKey: ["/api/content-creators/teams"],
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes 
    retry: 2,
    refetchOnWindowFocus: false,
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

  // Sort creators
  const sortedCreators = [...((creators || []) as FPLCreator[])].sort((a, b) => {
    let valueA, valueB;
    
    switch (sortBy) {
      case "rank":
        valueA = a.latestTracking?.overallRank || 999999999;
        valueB = b.latestTracking?.overallRank || 999999999;
        break;
      case "points":
        valueA = a.latestTracking?.overallPoints || 0;
        valueB = b.latestTracking?.overallPoints || 0;
        break;
      case "gw_points":
        valueA = a.latestTracking?.gameweekPoints || 0;
        valueB = b.latestTracking?.gameweekPoints || 0;
        break;
      case "name":
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      default:
        return 0;
    }

    if (sortOrder === "asc") {
      return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    } else {
      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
    }
  });

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
            {sortedCreators && sortedCreators.length > 0 ? (
              <div className="fpl-table-container">
                <div className="fpl-table-scroll">
                  <Table>
                    <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Creator</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort('rank')}
                      >
                        Overall Rank 
                        {sortBy === 'rank' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort('points')}
                      >
                        Total Points 
                        {sortBy === 'points' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort('gw_points')}
                      >
                        GW Points 
                        {sortBy === 'gw_points' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                      </TableHead>
                      <TableHead className="text-right">Team Value</TableHead>
                      <TableHead className="text-right">Transfers</TableHead>
                      <TableHead className="text-right">Chips</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {sortedCreators.map((creator) => (
                        <CreatorTableRow key={creator.id} creator={creator} />
                      ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="fpl-empty">
                  <Users className="fpl-empty-icon" />
                  <h3 className="fpl-empty-title">No Content Creators Found</h3>
                  <p className="fpl-empty-message">
                    Get started by adding some FPL content creators to track their performance.
                  </p>
                </div>
              )}
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
                                <span className="font-medium capitalize">{chip.chip.replace('_', ' ')}</span>
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
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import {
  BarChart3,
  Crown,
  DollarSign,
  RefreshCw,
  Shield,
  Star,
  Target,
  Trophy,
  TrendingUp,
  Users,
  Activity,
  PieChart,
} from "lucide-react";

// Types
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

// API response types
interface Top25TeamResponse {
  managerId: number;
  name: string;
  rank: number;
  teamData: TeamData | null;
  success: boolean;
  error: string | null;
}

interface Top25BatchResponse {
  teams: Top25TeamResponse[];
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

// Constants
const TOP_25_MANAGERS = [
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

// Helper functions
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

export default function Top25TeamAnalysis() {
  // Fetch bootstrap data
  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch Top 25 teams data using batch endpoint with React Query
  const { 
    data: top25Response, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams,
    isFetching: isRefreshing
  } = useQuery<Top25BatchResponse>({
    queryKey: ["/api/top25/teams"],
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Transform the API response to match the expected data structure
  const managersData: ManagerTeamData[] = useMemo(() => {
    if (!top25Response?.teams) {
      return TOP_25_MANAGERS.map(manager => ({
        ...manager,
        teamData: null,
        success: false,
        error: null
      }));
    }
    
    return top25Response.teams.map(team => ({
      managerId: team.managerId,
      name: team.name,
      rank: team.rank,
      teamData: team.teamData,
      success: team.success,
      error: team.error
    }));
  }, [top25Response]);

  // Helper functions for analysis (memoized for performance)
  const validTeams = useMemo(() => 
    managersData.filter(m => m.teamData && m.success),
    [managersData]
  );

  const refreshAllData = () => {
    refetchTeams();
  };

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
    if (!validTeams.length || !bootstrapData) return [];

    const formations: { [key: string]: number } = {};

    validTeams.forEach(manager => {
      if (manager.teamData?.picks) {
        const startingEleven = manager.teamData.picks
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

    validTeams.forEach(manager => {
      if (manager.teamData?.active_chip) {
        const chip = manager.teamData.active_chip;
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
      .map((m: ManagerTeamData) => m.teamData?.entry_history?.value || 0)
      .filter((v: number) => v > 0);
    
    const banks = validTeams
      .map((m: ManagerTeamData) => m.teamData?.entry_history?.bank || 0);

    if (values.length === 0) return { avgValue: 0, maxValue: 0, minValue: 0, avgBank: 0 };

    return {
      avgValue: Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) / 10,
      maxValue: Math.max(...values) / 10,
      minValue: Math.min(...values) / 10,
      avgBank: Math.round(banks.reduce((a: number, b: number) => a + b, 0) / banks.length) / 10
    };
  }, [validTeams]);

  const validTeamsCount = validTeams.length;
  const errorTeamsCount = managersData.filter((m: ManagerTeamData) => !m.success).length;
  const loadingTeamsCount = teamsLoading ? 25 - validTeamsCount - errorTeamsCount : 0;

  if (bootstrapLoading) {
    return (
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-4 text-gray-600">Loading bootstrap data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Controls and Status */}
        <div className="fpl-controls">
          <div className="fpl-controls-right">
            <Button
              onClick={refreshAllData}
              disabled={isRefreshing}
              variant="outline"
              className="hover:bg-blue-50"
              data-testid="button-refresh-analysis"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{validTeamsCount}</div>
                <div className="text-sm text-gray-600">Teams Loaded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{loadingTeamsCount}</div>
                <div className="text-sm text-gray-600">Loading</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{errorTeamsCount}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">25</div>
                <div className="text-sm text-gray-600">Total Managers</div>
              </div>
            </div>
            {validTeamsCount > 0 && (
              <div className="mt-4">
                <Progress value={(validTeamsCount / 25) * 100} className="h-2" />
                <p className="text-sm text-gray-600 mt-1 text-center">
                  Analysis based on {validTeamsCount} of 25 teams
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {validTeamsCount === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Loading Team Data...</h3>
              <p className="text-gray-600 mb-4">
                Fetching team information for all 25 managers. This may take a moment.
              </p>
              <Button onClick={refreshAllData} variant="outline" disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Loading...' : 'Retry Loading'}
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
                      Players owned by the most Top 25 managers
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
                            <div className="text-xs text-gray-600">{player.ownership}/25</div>
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
                      Formation preferences among Top 25 managers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getFormationAnalysis.slice(0, 5).map((formation, index) => (
                        <div key={formation.formation}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{formation.formation}</span>
                            <span className="text-sm text-gray-600">
                              {formation.count} managers ({formation.percentage}%)
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
                    {(() => {
                      const chipData = getChipAnalysis;
                      return (
                        <div className="space-y-3">
                          {chipData.activeChips.length > 0 ? (
                            chipData.activeChips.map((chip: { chip: string; count: number; percentage: number }) => (
                              <div key={chip.chip} className="flex justify-between items-center">
                                <span className="font-medium capitalize">{chip.chip.replace('_', ' ')}</span>
                                <div className="text-right">
                                  <div className="font-semibold">{chip.count} managers</div>
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
                                <div className="font-semibold">{chipData.noChipCount || 0} managers</div>
                                <div className="text-xs text-gray-600">
                                  {Math.round(((chipData.noChipCount || 0) / validTeamsCount) * 100)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Budget Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Budget Overview
                    </CardTitle>
                    <CardDescription>
                      Team values and remaining budget
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const budgetData = getBudgetAnalysis;
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                £{budgetData.avgValue.toFixed(1)}m
                              </div>
                              <div className="text-sm text-gray-600">Avg Team Value</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                £{budgetData.avgBank.toFixed(1)}m
                              </div>
                              <div className="text-sm text-gray-600">Avg In Bank</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Highest Value:</span>
                              <span className="font-semibold">£{budgetData.maxValue.toFixed(1)}m</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Lowest Value:</span>
                              <span className="font-semibold">£{budgetData.minValue.toFixed(1)}m</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
                    All players owned by Top 25 managers, sorted by popularity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Ownership</TableHead>
                        <TableHead>%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getMostOwnedPlayers.map((player, index) => (
                        <TableRow key={player.id} data-testid={`row-player-${player.id}`}>
                          <TableCell>
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{player.web_name}</div>
                            <div className="text-sm text-gray-600">
                              {player.first_name} {player.second_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPositionColor(player.element_type)}>
                              {getPositionIcon(player.element_type)}
                              <span className="ml-1">{getPositionName(player.element_type)}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {bootstrapData?.teams.find(t => t.id === player.team)?.short_name || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-mono">{formatPrice(player.now_cost)}</TableCell>
                          <TableCell className="font-semibold">{player.ownership}/25</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={player.ownershipPercent} className="h-2 flex-1" />
                              <span className="text-sm font-semibold w-10">{player.ownershipPercent}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Captains Tab */}
            <TabsContent value="captains">
              <Card>
                <CardHeader>
                  <CardTitle>Captaincy Analysis</CardTitle>
                  <CardDescription>
                    Captain and vice-captain choices among Top 25 managers
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Captain</TableHead>
                        <TableHead>Vice Captain</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCaptaincyAnalysis.map((player) => (
                        <TableRow key={player.id} data-testid={`row-captain-${player.id}`}>
                          <TableCell>
                            <div className="font-medium">{player.web_name}</div>
                            <div className="text-sm text-gray-600">
                              {player.first_name} {player.second_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPositionColor(player.element_type)}>
                              {getPositionIcon(player.element_type)}
                              <span className="ml-1">{getPositionName(player.element_type)}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {bootstrapData?.teams.find(t => t.id === player.team)?.short_name || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-mono">{formatPrice(player.now_cost)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-yellow-500" />
                              <span className="font-semibold">{player.captainCount}</span>
                              <span className="text-sm text-gray-600">({player.captainPercent}%)</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold">{player.viceCaptainCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              {player.captainCount + player.viceCaptainCount}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Formations Tab */}
            <TabsContent value="formations">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Formation Distribution</CardTitle>
                    <CardDescription>
                      Tactical setups preferred by Top 25 managers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getFormationAnalysis.map((formation, index) => (
                        <div key={formation.formation} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {index + 1}
                              </div>
                              <h3 className="font-semibold text-lg">{formation.formation}</h3>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-2xl text-blue-600">{formation.count}</div>
                              <div className="text-sm text-gray-600">managers</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Progress value={formation.percentage} className="h-3" />
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Popularity</span>
                              <span className="font-semibold">{formation.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Formation Insights</CardTitle>
                    <CardDescription>
                      Analysis of tactical preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const formations = getFormationAnalysis;
                      const totalManagers = formations.reduce((sum, f) => sum + f.count, 0);
                      const mostPopular = formations[0];
                      const diversity = formations.length;
                      
                      return (
                        <div className="space-y-6">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                              {mostPopular?.formation || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">Most Popular Formation</div>
                            <div className="text-lg font-semibold mt-2">
                              {mostPopular?.count || 0} managers ({mostPopular?.percentage || 0}%)
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-xl font-bold text-green-600">{diversity}</div>
                              <div className="text-sm text-gray-600">Different Formations</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-purple-600">{totalManagers}</div>
                              <div className="text-sm text-gray-600">Total Analyzed</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-semibold">Formation Diversity</h4>
                            <div className="text-sm text-gray-600">
                              Top 25 managers are using {diversity} different formations, 
                              showing {diversity > 5 ? 'high' : diversity > 3 ? 'moderate' : 'low'} tactical diversity.
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent value="budget">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Values</CardTitle>
                    <CardDescription>
                      Squad value distribution among Top 25 managers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const budgetData = getBudgetAnalysis;
                      return (
                        <div className="space-y-6">
                          <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                              £{budgetData.avgValue.toFixed(1)}m
                            </div>
                            <div className="text-gray-600">Average Team Value</div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                              <div className="text-xl font-bold text-green-600">
                                £{budgetData.maxValue.toFixed(1)}m
                              </div>
                              <div className="text-sm text-gray-600">Highest Value</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <div className="text-xl font-bold text-red-600">
                                £{budgetData.minValue.toFixed(1)}m
                              </div>
                              <div className="text-sm text-gray-600">Lowest Value</div>
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Value Range:</span>
                              <span className="font-semibold">
                                £{(budgetData.maxValue - budgetData.minValue).toFixed(1)}m
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Budget Management</CardTitle>
                    <CardDescription>
                      Remaining budget and transfer strategies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const budgetData = getBudgetAnalysis;
                      return (
                        <div className="space-y-6">
                          <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                            <div className="text-3xl font-bold text-green-600 mb-2">
                              £{budgetData.avgBank.toFixed(1)}m
                            </div>
                            <div className="text-gray-600">Average In Bank</div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Budget Insights</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Total Budget Available:</span>
                                  <span className="font-semibold">£100.0m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Avg Invested:</span>
                                  <span className="font-semibold">
                                    £{(budgetData.avgValue - budgetData.avgBank).toFixed(1)}m
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Avg Utilization:</span>
                                  <span className="font-semibold">
                                    {((budgetData.avgValue - budgetData.avgBank) / 100 * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg">
                              <h4 className="font-semibold text-blue-800 mb-2">Strategy Note</h4>
                              <p className="text-sm text-blue-700">
                                Managers keeping £{budgetData.avgBank.toFixed(1)}m in bank on average, 
                                suggesting {budgetData.avgBank > 1 ? 'conservative' : 'aggressive'} transfer planning.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
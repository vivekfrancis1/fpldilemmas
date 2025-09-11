import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Crown,
  DollarSign,
  Shield,
  Target,
  Trophy,
  Users,
  Star,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  ArrowLeftRight
} from "lucide-react";

type TeamPick = {
  element: number;
  position: string;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
  player_name: string;
  team_name: string;
};

type TeamData = {
  active_chip?: string;
  entry_history?: {
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
  picks?: TeamPick[];
  gameweek?: number;
  manager?: string;
  general_info?: any;
  message?: string;
};

type HistoryEntry = {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  rank_sort: number;
  overall_rank: number;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
};

type ManagerHistory = {
  current: HistoryEntry[];
  past: any[];
  chips: any[];
};

type Transfer = {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
};

function getPositionName(elementType: number) {
  switch (elementType) {
    case 1:
      return 'Goalkeeper';
    case 2:
      return 'Defender';
    case 3:
      return 'Midfielder';
    case 4:
      return 'Forward';
    default:
      return 'Unknown';
  }
}

function getPositionIcon(position: string | number | undefined) {
  let posStr: string;
  
  if (typeof position === 'number') {
    posStr = getPositionName(position);
  } else if (typeof position === 'string') {
    posStr = position;
  } else {
    posStr = 'Unknown';
  }
  
  switch (posStr.toLowerCase()) {
    case 'goalkeeper':
      return <Shield className="h-4 w-4" />;
    case 'defender':
      return <Shield className="h-4 w-4" />;
    case 'midfielder':
      return <Target className="h-4 w-4" />;
    case 'forward':
      return <Star className="h-4 w-4" />;
    default:
      return <Users className="h-4 w-4" />;
  }
}

function getPositionColor(position: string | undefined) {
  if (!position || typeof position !== 'string') {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
  
  switch (position.toLowerCase()) {
    case 'goalkeeper':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'defender':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'midfielder':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'forward':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getRankChangeDisplay(rankChange: number) {
  if (rankChange > 0) {
    return (
      <span className="text-green-600 text-xs font-medium flex items-center">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{rankChange.toLocaleString()}
      </span>
    );
  } else if (rankChange < 0) {
    return (
      <span className="text-red-600 text-xs font-medium flex items-center">
        <TrendingDown className="h-3 w-3 mr-1" />
        {rankChange.toLocaleString()}
      </span>
    );
  } else {
    return (
      <span className="text-gray-500 text-xs">
        -
      </span>
    );
  }
}

export default function Top50ManagerTeam() {
  const { rank } = useParams<{ rank: string }>();
  
  // Fetch top 50 managers data to find manager info
  const { data: top50Data } = useQuery<Array<{ rank: number; name: string; managerId: number }>>({
    queryKey: ['/api/top50-managers'],
    retry: 2,
  });

  // Find manager info from the API data
  const managerInfo = top50Data?.find(m => m.rank === parseInt(rank || '0'));
  const managerId = managerInfo?.managerId;
  
  const { data: teamData, isLoading, error } = useQuery<TeamData>({
    queryKey: [`/api/manager/${managerId}/team`],
    enabled: !!managerId,
    retry: 2,
  });

  const { data: managerHistory, isLoading: historyLoading } = useQuery<ManagerHistory>({
    queryKey: [`/api/manager/${managerId}/history`],
    enabled: !!managerId,
    retry: 2,
  });

  const { data: transfersData, isLoading: isLoadingTransfers } = useQuery<Transfer[]>({
    queryKey: [`/api/manager/${managerId}/transfers`],
    enabled: !!managerId,
    retry: 2,
  });

  // Get bootstrap data to determine completed gameweeks
  const { data: bootstrapData } = useQuery<any>({
    queryKey: ['/api/bootstrap-static'],
  });

  // Function to get completed gameweeks (1-3 only)
  const getCompletedGameweeks = () => {
    if (!bootstrapData?.events) return [1, 2, 3]; // Default fallback to show 1-3
    
    // For now, since we're early in the season, show gameweeks 1-3 regardless of finished status
    // We can make this more dynamic later when more gameweeks are completed
    return [1, 2, 3];
  };

  // Filter manager history to only show completed gameweeks 1-3
  const filteredManagerHistory = managerHistory?.current?.filter((gw: HistoryEntry) => {
    const completedGameweeks = getCompletedGameweeks();
    return completedGameweeks.includes(gw.event);
  });

  // Helper function to get player data from bootstrap
  const getPlayerData = (playerId: number) => {
    if (!bootstrapData?.elements) return null;
    return bootstrapData.elements.find((p: any) => p.id === playerId);
  };

  // Helper function to get position name from element_type
  const getPositionFromElementType = (elementType: number) => {
    if (!bootstrapData?.element_types) return 'Unknown';
    const position = bootstrapData.element_types.find((et: any) => et.id === elementType);
    return position ? position.singular_name : 'Unknown';
  };

  // Helper function to format price
  const formatPrice = (cost: number) => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  // Helper function to get player name from player ID
  const getPlayerName = (playerId: number) => {
    if (!bootstrapData?.elements) return `Player ${playerId}`;
    const player = bootstrapData.elements.find((p: any) => p.id === playerId);
    return player ? `${player.first_name} ${player.second_name}` : `Player ${playerId}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !teamData || !managerInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Team Data Unavailable</h3>
            <p className="text-gray-500 text-center max-w-md">
              Unable to fetch team data for this manager. The team information may not be publicly available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enrich picks with player data from bootstrap
  const enrichedPicks = teamData?.picks?.map(pick => {
    const playerData = getPlayerData(pick.element);
    const teamData = bootstrapData?.teams?.find((t: any) => t.id === playerData?.team);
    return {
      ...pick,
      player_name: playerData ? `${playerData.first_name} ${playerData.second_name}` : 'Unknown Player',
      team_name: teamData?.name || 'Unknown Team',
      now_cost: playerData?.now_cost || 0,
      event_points: playerData?.event_points || 0,
      element_type: playerData?.element_type || 1,
    };
  }) || [];

  const startingEleven = enrichedPicks.slice(0, 11);
  const substitutes = enrichedPicks.slice(11);

  const captain = enrichedPicks.find(p => p.is_captain);
  const viceCaptain = enrichedPicks.find(p => p.is_vice_captain);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-4">
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              #{managerInfo.rank}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {managerInfo.name}'s Team
              </h1>
              <p className="text-muted-foreground text-lg">
                {teamData?.gameweek ? `Gameweek ${teamData.gameweek}` : 'Team Overview'}
                {teamData?.message && ` • ${teamData.message}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Rank #{managerInfo.rank}
            </Badge>
          </div>
        </div>
      </div>

      {/* Team Statistics */}
      {teamData?.entry_history && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{teamData.entry_history.points}</div>
                  <div className="text-sm text-muted-foreground">GW Points</div>
                </div>
                <Trophy className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">{teamData.entry_history.total_points}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
                <Star className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    #{teamData.entry_history.overall_rank?.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Rank</div>
                </div>
                <Crown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">
                    £{((teamData.entry_history.value || 0) / 10).toFixed(1)}m
                  </div>
                  <div className="text-sm text-muted-foreground">Team Value</div>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* General Info Fallback */}
      {teamData?.general_info && !teamData.entry_history && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">{teamData.general_info.summary_overall_points}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
                <Star className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    #{teamData.general_info.summary_overall_rank?.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Rank</div>
                </div>
                <Crown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-blue-700">{teamData.general_info.name}</div>
                  <div className="text-sm text-muted-foreground">Team Name</div>
                </div>
                <Trophy className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-700">
                    {teamData.general_info.player_first_name} {teamData.general_info.player_last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">Manager</div>
                </div>
                <Users className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="team" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ArrowLeftRight className="h-4 w-4" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="chips" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Star className="h-4 w-4" />
            Chips
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          {/* Team Formation */}
          {teamData.picks && teamData.picks.length > 0 && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-4">Team Squad</h2>
                
                {/* Team Formation Display */}
                <div className="grid gap-6 lg:grid-cols-5">
                  {/* Starting XI */}
                  <div className="lg:col-span-3">
                    <Card className="bg-white shadow-lg border border-gray-200">
                      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Starting XI
                        </CardTitle>
                        <CardDescription className="text-emerald-50">
                          Current team formation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="space-y-0">
                          {startingEleven.map((player, idx) => (
                            <div
                              key={`starting-${idx}`}
                              className={`flex items-center justify-between p-4 border-l-4 hover:bg-gray-50 transition-colors ${
                                player.is_captain 
                                  ? 'bg-amber-50 border-amber-400' 
                                  : player.is_vice_captain 
                                  ? 'bg-blue-50 border-blue-400' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                                  {player.player_name ? player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{player.player_name || 'Unknown Player'}</span>
                                    {player.is_captain && (
                                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1">C</Badge>
                                    )}
                                    {player.is_vice_captain && (
                                      <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs px-2 py-1">VC</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-medium text-gray-700">{player.team_name}</span>
                                    <Badge className={`text-xs ${getPositionColor(getPositionFromElementType(player.element_type))}`}>
                                      {getPositionIcon(getPositionFromElementType(player.element_type))}
                                      <span className="ml-1">{getPositionFromElementType(player.element_type).slice(0, 3).toUpperCase()}</span>
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                {(() => {
                                  const playerData = getPlayerData(player.element);
                                  return playerData ? (
                                    <>
                                      <p className="font-semibold text-green-600">{formatPrice(playerData.now_cost)}</p>
                                      {player.is_captain ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-semibold text-amber-600">
                                            {(playerData.event_points || 0) * 2} GW pts
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            ({playerData.event_points || 0}×2 captain)
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-600">{playerData.event_points || 0} GW pts</p>
                                      )}
                                      {player.multiplier > 1 && (
                                        <Badge variant="outline" className="text-xs">
                                          {player.multiplier}x
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-sm text-gray-500">N/A</p>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Substitutes */}
                  <div className="lg:col-span-2">
                    <Card className="bg-white shadow-lg border border-gray-200">
                      <CardHeader className="bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Substitutes
                        </CardTitle>
                        <CardDescription className="text-slate-50">
                          Bench players
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="space-y-0">
                          {substitutes.map((player, idx) => (
                            <div
                              key={`sub-${idx}`}
                              className="flex items-center justify-between p-4 border-l-4 border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                                  {player.player_name ? player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{player.player_name || 'Unknown Player'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-gray-600">{player.team_name}</span>
                                    <Badge className={`text-xs ${getPositionColor(getPositionFromElementType(player.element_type))}`}>
                                      {getPositionIcon(getPositionFromElementType(player.element_type))}
                                      <span className="ml-1">{getPositionFromElementType(player.element_type).slice(0, 3).toUpperCase()}</span>
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                {(() => {
                                  const playerData = getPlayerData(player.element);
                                  return playerData ? (
                                    <>
                                      <p className="font-semibold text-green-600 text-sm">{formatPrice(playerData.now_cost)}</p>
                                      <p className="text-sm text-gray-600">{playerData.event_points || 0} GW pts</p>
                                    </>
                                  ) : (
                                    <p className="text-sm text-gray-500">N/A</p>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Transfer Activity
              </CardTitle>
              <CardDescription>
                Manager's transfer history and decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransfers ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : transfersData && transfersData.length > 0 ? (
                <div className="space-y-4">
                  {transfersData.slice(0, 10).map((transfer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">GW{transfer.event}</Badge>
                        <div className="text-sm">
                          <p className="text-gray-600 font-medium">{new Date(transfer.time).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-red-600">Out:</span> {getPlayerName(transfer.element_out)} (£{(transfer.element_out_cost / 10).toFixed(1)}m)
                        </p>
                        <p className="text-sm">
                          <span className="text-green-600">In:</span> {getPlayerName(transfer.element_in)} (£{(transfer.element_in_cost / 10).toFixed(1)}m)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No transfer data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chips" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Chip Usage Summary
              </CardTitle>
              <CardDescription>
                Complete overview of FPL chip usage for this manager
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/5">Chip & Description</TableHead>
                      <TableHead className="text-center">Total Available</TableHead>
                      <TableHead className="text-center">Used</TableHead>
                      <TableHead className="text-center">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const usedChips = managerHistory?.chips?.map((chip: any) => chip.name) || [];
                      const allChips = [
                        { 
                          name: 'Wildcard', 
                          apiNames: ['wildcard'], 
                          description: 'Transfer entire squad for free', 
                          maxUses: 2 
                        },
                        { 
                          name: 'Triple Captain', 
                          apiNames: ['3xc'], 
                          description: 'Captain gets 3x points instead of 2x', 
                          maxUses: 2 
                        },
                        { 
                          name: 'Bench Boost', 
                          apiNames: ['bboost'], 
                          description: 'Points from bench players count', 
                          maxUses: 2 
                        },
                        { 
                          name: 'Free Hit', 
                          apiNames: ['freehit'], 
                          description: 'Make unlimited transfers for one gameweek', 
                          maxUses: 2 
                        }
                      ];

                      return allChips.map((chip, idx) => {
                        const usedChipsDetails = managerHistory?.chips?.filter((usedChip: any) => 
                          chip.apiNames.includes(usedChip.name)
                        ) || [];
                        const usedCount = usedChipsDetails.length;
                        const remainingCount = chip.maxUses - usedCount;
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-gray-900">{chip.name}</p>
                                <p className="text-sm text-gray-600">{chip.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-semibold">
                                {chip.maxUses}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {usedCount > 0 ? (
                                <div className="space-y-1">
                                  {usedChipsDetails.map((usedChip: any, chipIdx: number) => (
                                    <div key={chipIdx} className="text-sm">
                                      <Badge className="bg-red-100 text-red-800 hover:bg-red-200 mb-1">
                                        GW{usedChip.event}
                                      </Badge>
                                      <p className="text-xs text-gray-600">
                                        {new Date(usedChip.time).toLocaleDateString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-500">
                                  0
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                className={remainingCount > 0 ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-500"}
                              >
                                {remainingCount}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Gameweek History
              </CardTitle>
              <CardDescription>
                Performance across completed gameweeks (GW1-3)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredManagerHistory && filteredManagerHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gameweek</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Overall Rank</TableHead>
                      <TableHead>Rank Change</TableHead>
                      <TableHead>Team Value</TableHead>
                      <TableHead>Transfers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredManagerHistory.map((gw: HistoryEntry, idx: number) => {
                      const prevGw = idx > 0 ? filteredManagerHistory[idx - 1] : null;
                      const rankChange = prevGw ? prevGw.overall_rank - gw.overall_rank : 0;
                      
                      return (
                        <TableRow key={gw.event}>
                          <TableCell>
                            <Badge variant="outline">GW{gw.event}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{gw.points}</TableCell>
                          <TableCell>#{gw.overall_rank.toLocaleString()}</TableCell>
                          <TableCell>{getRankChangeDisplay(rankChange)}</TableCell>
                          <TableCell>£{(gw.value / 10).toFixed(1)}m</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{gw.event_transfers} transfers</div>
                              {gw.event_transfers_cost > 0 && (
                                <div className="text-xs text-red-600">-{gw.event_transfers_cost} pts</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">No gameweek history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
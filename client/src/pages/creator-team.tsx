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
  ArrowLeft,
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
  Youtube
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
  creator?: string;
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

function getPositionIcon(position: string) {
  switch (position.toLowerCase()) {
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

function getPositionColor(position: string) {
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



export default function CreatorTeam() {
  const { id } = useParams<{ id: string }>();
  
  const { data: teamData, isLoading, error } = useQuery<TeamData>({
    queryKey: [`/api/content-creators/${id}/team`],
    enabled: !!id,
    retry: 2,
  });

  const { data: creatorInfo } = useQuery<any>({
    queryKey: [`/api/content-creators/${id}`],
    enabled: !!id,
  });

  const { data: managerHistory, isLoading: historyLoading } = useQuery<ManagerHistory>({
    queryKey: [`/api/manager/${creatorInfo?.teamId}/history`],
    enabled: !!creatorInfo?.teamId,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/content-creators">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Creators
            </Button>
          </Link>
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

  if (error || !teamData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/content-creators">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Creators
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Team Data Unavailable</h3>
            <p className="text-gray-500 text-center max-w-md">
              Unable to fetch team data for this creator. The team information may not be publicly available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startingEleven = teamData?.picks?.slice(0, 11) || [];
  const substitutes = teamData?.picks?.slice(11) || [];

  const captain = teamData.picks?.find(p => p.is_captain);
  const viceCaptain = teamData.picks?.find(p => p.is_vice_captain);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/content-creators">
            <Button variant="outline" size="sm" className="hover:bg-blue-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Creators
            </Button>
          </Link>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {(teamData?.creator || creatorInfo?.name || 'Creator').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {teamData?.creator || creatorInfo?.name || 'Creator'}'s Team
              </h1>
              <p className="text-muted-foreground text-lg">
                {teamData?.gameweek ? `Gameweek ${teamData.gameweek}` : 'Team Overview'}
                {teamData?.message && ` • ${teamData.message}`}
              </p>
            </div>
          </div>
          
          {creatorInfo?.platform && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                {creatorInfo.platform === 'youtube' && <Youtube className="h-3 w-3" />}
                {creatorInfo.platform === 'twitter' && <Users className="h-3 w-3" />}
                {creatorInfo.platform}
              </Badge>
              {creatorInfo.handle && (
                <span className="text-sm text-muted-foreground">@{creatorInfo.handle}</span>
              )}
            </div>
          )}
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
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="team" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" />
            Performance
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Starting XI */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Starting XI</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {startingEleven.map((player, idx) => (
                          <div
                            key={`starting-${idx}`}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm ${
                              player.is_captain 
                                ? 'bg-yellow-50 border-yellow-200' 
                                : player.is_vice_captain 
                                ? 'bg-gray-50 border-gray-200' 
                                : 'bg-white border-gray-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <Badge className={`${getPositionColor(player.position)}`}>
                                  {getPositionIcon(player.position)}
                                  <span className="ml-1 text-xs">{player.position.slice(0, 3).toUpperCase()}</span>
                                </Badge>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {player.player_name}
                                  </p>
                                  {player.is_captain && (
                                    <Badge className="text-xs px-2 py-0.5 bg-yellow-500 text-white">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Captain
                                    </Badge>
                                  )}
                                  {player.is_vice_captain && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Vice
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{player.team_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {player.multiplier > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {player.multiplier}x
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Substitutes */}
                  {substitutes.length > 0 && (
                    <div className="lg:col-span-1">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Substitutes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {substitutes.map((player, idx) => (
                            <div
                              key={`sub-${idx}`}
                              className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 border-gray-200 opacity-75"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <Badge className={`${getPositionColor(player.position)}`}>
                                    {getPositionIcon(player.position)}
                                    <span className="ml-1 text-xs">{player.position.slice(0, 3).toUpperCase()}</span>
                                  </Badge>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-700 truncate">
                                      {player.player_name}
                                    </p>
                                    <Badge variant="outline" className="text-xs bg-gray-100">
                                      SUB
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">{player.team_name}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>

          {/* Captain & Vice Captain Info */}
          {(captain || viceCaptain) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {captain && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Crown className="h-5 w-5 mr-2 text-yellow-600" />
                      Captain
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{captain.player_name}</p>
                        <p className="text-sm text-muted-foreground">{captain.team_name}</p>
                      </div>
                      <Badge className={getPositionColor(captain.position)}>
                        {captain.position}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {viceCaptain && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Crown className="h-5 w-5 mr-2 text-gray-600" />
                      Vice Captain
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{viceCaptain.player_name}</p>
                        <p className="text-sm text-muted-foreground">{viceCaptain.team_name}</p>
                      </div>
                      <Badge className={getPositionColor(viceCaptain.position)}>
                        {viceCaptain.position}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {historyLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : managerHistory?.current ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Gameweek Performance
                </h2>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>GW</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Overall Rank</TableHead>
                          <TableHead>GW Rank</TableHead>
                          <TableHead>Team Value</TableHead>
                          <TableHead>Transfers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerHistory.current
                          .sort((a, b) => b.event - a.event)
                          .slice(0, 10)
                          .map((entry, index) => {
                            const prevEntry = managerHistory.current.find(e => e.event === entry.event - 1);
                            const rankChange = prevEntry ? prevEntry.overall_rank - entry.overall_rank : null;
                            
                            return (
                              <TableRow key={entry.event}>
                                <TableCell className="font-medium">{entry.event}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    {entry.points}
                                    {entry.event_transfers_cost > 0 && (
                                      <span className="text-red-500 text-xs ml-1">
                                        (-{entry.event_transfers_cost})
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{entry.total_points.toLocaleString()}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    #{entry.overall_rank.toLocaleString()}
                                    {rankChange !== null && (
                                      <span className={`ml-2 flex items-center text-xs ${
                                        rankChange > 0 ? 'text-green-600' : rankChange < 0 ? 'text-red-600' : 'text-gray-500'
                                      }`}>
                                        {rankChange > 0 ? (
                                          <TrendingUp className="h-3 w-3 mr-1" />
                                        ) : rankChange < 0 ? (
                                          <TrendingDown className="h-3 w-3 mr-1" />
                                        ) : null}
                                        {rankChange !== 0 && Math.abs(rankChange).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>#{entry.rank.toLocaleString()}</TableCell>
                                <TableCell>£{(entry.value / 10).toFixed(1)}m</TableCell>
                                <TableCell>
                                  {entry.event_transfers > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {entry.event_transfers}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-700">
                          {Math.round(
                            managerHistory.current.reduce((sum, entry) => sum + entry.points, 0) / 
                            managerHistory.current.length
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Points/GW</div>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-700">
                          {Math.max(...managerHistory.current.map(e => e.points))}
                        </div>
                        <div className="text-sm text-muted-foreground">Best GW</div>
                      </div>
                      <Trophy className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-purple-700">
                          #{Math.min(...managerHistory.current.map(e => e.overall_rank)).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Best Rank</div>
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
                          {managerHistory.current.filter(e => e.event_transfers > 0).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Transfer GWs</div>
                      </div>
                      <RefreshCw className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Performance history is not available for this creator.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {historyLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : managerHistory ? (
            <div className="space-y-6">
              {/* Season History */}
              {managerHistory.past && managerHistory.past.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Season History
                  </h2>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Season</TableHead>
                            <TableHead>Total Points</TableHead>
                            <TableHead>Overall Rank</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {managerHistory.past
                            .sort((a, b) => parseInt(b.season_name.split('/')[0]) - parseInt(a.season_name.split('/')[0]))
                            .map((season) => (
                              <TableRow key={season.season_name}>
                                <TableCell className="font-medium">{season.season_name}</TableCell>
                                <TableCell>{season.total_points.toLocaleString()}</TableCell>
                                <TableCell>#{season.rank.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Chips Used */}
              {managerHistory.chips && managerHistory.chips.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Chips Used This Season</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {managerHistory.chips.map((chip) => (
                      <Card key={chip.name}>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg font-bold capitalize">{chip.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {chip.time ? `GW${chip.event}` : 'Not Used'}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Season Summary */}
              {managerHistory.current && managerHistory.current.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Current Season Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {managerHistory.current.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Gameweeks Played</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {managerHistory.current.reduce((sum, entry) => sum + entry.event_transfers, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Transfers</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {managerHistory.current.reduce((sum, entry) => sum + entry.event_transfers_cost, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Transfer Cost</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Historical data is not available for this creator.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
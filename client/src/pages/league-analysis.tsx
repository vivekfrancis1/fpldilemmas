import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ArrowLeft, Trophy, Activity, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";

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

interface LeagueAnalysisProps {
  leagueId: number;
  managerId: string;
  leagueName: string;
}

export default function LeagueAnalysisPage() {
  const [location] = useLocation();
  const pathParts = location.split('/').filter(part => part);
  const leagueId = pathParts[1]; // league-analysis/:leagueId/:leagueName/:managerId
  const leagueName = pathParts[2] ? decodeURIComponent(pathParts[2]) : 'League Analysis';
  const managerId = pathParts[3];
  
  // Live standings state
  const [showLiveStandings, setShowLiveStandings] = useState(false);

  if (!leagueId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Missing league information</p>
            <Link href="/">
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

  const { data: leagueData, isLoading, error } = useQuery({
    queryKey: [`/api/leagues-classic/${leagueId}/standings`],
    enabled: !!leagueId
  });

  const { data: leagueAnalysisData } = useQuery({
    queryKey: [`/api/leagues/${leagueId}/analyze`],
    enabled: !!leagueId
  });

  // Live standings query
  const { data: liveStandingsData, isLoading: isLoadingLive, refetch: refetchLive } = useQuery<LiveLeagueStandings>({
    queryKey: [`/api/leagues-classic/${leagueId}/live-standings`],
    enabled: !!leagueId && showLiveStandings,
    refetchInterval: showLiveStandings ? 30000 : false, // Auto-refresh every 30 seconds when live view is active
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load league data</p>
            <Link href="/">
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

  const currentManagerEntry = (leagueData as any).standings?.results?.find(
    (entry: any) => entry.entry.toString() === managerId
  );

  // Show top 100 or all entries if less than 100
  const allEntries = (leagueData as any).standings?.results || [];
  const topEntries = allEntries.length > 100 ? allEntries.slice(0, 100) : allEntries;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="fpl-heading-page flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                {decodeURIComponent(leagueName)}
              </h1>
              <p className="text-muted-foreground">League ID: {leagueId}</p>
            </div>
          </div>
        </div>

        {/* League Standings */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="fpl-heading-card flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {showLiveStandings ? 'Live Standings' : 'Top 100 League Managers'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {showLiveStandings && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchLive()}
                    disabled={isLoadingLive}
                    className="h-8"
                    data-testid="btn-refresh-live"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                <Button
                  variant={showLiveStandings ? "default" : "outline"}
                  size="sm"
                  className={`h-8 ${showLiveStandings ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                  onClick={() => setShowLiveStandings(!showLiveStandings)}
                  data-testid="btn-toggle-live"
                >
                  <Activity className={`h-4 w-4 mr-1 ${showLiveStandings ? 'animate-pulse' : ''}`} />
                  {showLiveStandings ? 'Live On' : 'Live Points'}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground">
              {showLiveStandings 
                ? liveStandingsData 
                  ? `GW${liveStandingsData.current_gameweek} • Updated ${new Date(liveStandingsData.last_updated).toLocaleTimeString()}${liveStandingsData.is_gameweek_finished ? ' (GW Finished)' : ''}`
                  : 'Loading live standings...'
                : `Showing ${topEntries.length === 100 ? 'top 100' : 'all'} managers${allEntries.length > 100 ? ` of ${allEntries.length} total members` : ''}`
              }
            </p>
          </CardHeader>
          <CardContent>
            {showLiveStandings ? (
              // Live Standings View
              isLoadingLive ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : liveStandingsData ? (
                <div className="space-y-2">
                  {liveStandingsData.standings.results.map((entry, index) => {
                    const isCurrentManager = entry.entry.toString() === managerId;
                    return (
                      <Link 
                        key={entry.entry}
                        href={`/manager-team/${entry.entry}`}
                        className="block"
                      >
                        <div 
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                            isCurrentManager ? 'bg-blue-50 border-blue-200 shadow-md' : 'hover:bg-gray-50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                              entry.live_rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                              entry.live_rank === 2 ? 'bg-gray-100 text-gray-800' :
                              entry.live_rank === 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {entry.live_rank}
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {entry.player_name}
                                {isCurrentManager && <Badge className="bg-blue-600">You</Badge>}
                                {entry.active_chip && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    {entry.active_chip}
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">{entry.entry_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-green-700">
                                {entry.live_points} pts
                                {entry.auto_sub_points > 0 && (
                                  <span className="text-xs text-orange-600 ml-1">(+{entry.auto_sub_points} sub)</span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">Total: {entry.live_total?.toLocaleString()}</p>
                            </div>
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
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Failed to load live standings
                </div>
              )
            ) : (
              // Regular Standings View
              <div className="space-y-2">
                {topEntries.map((entry: any, index: number) => {
                  const isCurrentManager = entry.entry.toString() === managerId;
                  return (
                    <Link 
                      key={entry.entry}
                      href={`/manager-team/${entry.entry}`}
                      className="block"
                    >
                      <div 
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                          isCurrentManager ? 'bg-blue-50 border-blue-200 shadow-md' : 'hover:bg-gray-50 hover:shadow-sm'
                        }`}
                      >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.rank}
                        </div>
                        <div>
                          <p className="font-medium">
                            {entry.player_name}
                            {isCurrentManager && <Badge className="ml-2 bg-blue-600">You</Badge>}
                          </p>
                          <p className="text-sm text-muted-foreground">{entry.entry_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{entry.total?.toLocaleString()} pts</p>
                        <p className="text-sm text-muted-foreground">GW: {entry.event_total || 0}</p>
                      </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trophy, TrendingUp, BarChart3, Search, Target, Crown, Medal, Star, Activity } from "lucide-react";
import Layout from "../components/layout";

interface LeagueData {
  id: number;
  name: string;
  standings: LeagueStanding[];
  league_type: string;
  admin_entry: number;
  started: boolean;
  code_privacy: string;
  has_cup: boolean;
  cup_league?: number;
  rank?: number;
}

interface LeagueStanding {
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

interface PlayerPerformanceData {
  entry_id: number;
  player_name: string;
  entry_name: string;
  total_points: number;
  rank: number;
  last_rank: number;
  event_points: number;
  bank: number;
  value: number;
  kit?: string;
  region_name?: string;
  region_id?: number;
  region_code_short?: string;
  region_code_long?: string;
  years_active?: number;
  summary_overall_points?: number;
  summary_overall_rank?: number;
  summary_event_points?: number;
  summary_event_rank?: number;
}

export default function LeagueComparison() {
  const [leagueId, setLeagueId] = useState("");
  const [analyzedLeague, setAnalyzedLeague] = useState<LeagueData | null>(null);

  const { data: leagueData, isLoading, error } = useQuery({
    queryKey: ['/api/leagues', leagueId, 'analyze'],
    enabled: !!leagueId,
    refetchOnWindowFocus: false,
  });

  const analyzeLeague = () => {
    if (leagueData) {
      setAnalyzedLeague(leagueData as LeagueData);
    }
  };

  const getBadgeVariant = (rank: number) => {
    if (rank === 1) return "default";
    if (rank <= 3) return "secondary";
    if (rank <= 10) return "outline";
    return "destructive";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    return <Target className="h-4 w-4" />;
  };

  // Calculate performance metrics
  const getPerformanceMetrics = (standings: LeagueStanding[]) => {
    if (!standings.length) return null;

    const totalPoints = standings.reduce((sum, s) => sum + s.total, 0);
    const averagePoints = Math.round(totalPoints / standings.length);
    const topScore = Math.max(...standings.map(s => s.total));
    const lastGwAvg = Math.round(standings.reduce((sum, s) => sum + s.event_total, 0) / standings.length);
    
    const rankChanges = standings.filter(s => s.rank !== s.last_rank);
    const improvements = rankChanges.filter(s => s.rank < s.last_rank).length;
    const declines = rankChanges.filter(s => s.rank > s.last_rank).length;

    return {
      totalManagers: standings.length,
      averagePoints,
      topScore,
      lastGwAverage: lastGwAvg,
      rankChanges: rankChanges.length,
      improvements,
      declines
    };
  };

  const metrics = analyzedLeague ? getPerformanceMetrics(analyzedLeague.standings) : null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4" data-testid="text-page-title">
              League Analysis
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed" data-testid="text-page-description">
              Analyze player performance and compare managers within a single FPL mini-league
            </p>
          </div>

        {/* League Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Analyze League Performance
            </CardTitle>
            <CardDescription>
              Enter a league ID to analyze player performance and compare managers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter league ID..."
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && analyzeLeague()}
                data-testid="input-league-id"
              />
              <Button 
                onClick={analyzeLeague} 
                disabled={isLoading || !leagueId}
                data-testid="button-analyze-league"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {isLoading ? "Loading..." : "Analyze League"}
              </Button>
            </div>

            {leagueId && (
              <p className="text-sm text-muted-foreground">
                Analyzing League ID: <span className="font-medium">{leagueId}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <Search className="h-4 w-4" />
            <AlertDescription>
              Failed to load league data. Please check the league ID and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Analysis Results */}
        {analyzedLeague && metrics && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">League Overview</TabsTrigger>
              <TabsTrigger value="standings">Player Rankings</TabsTrigger>
              <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* League Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{analyzedLeague.name}</span>
                    <Badge variant="outline">
                      {analyzedLeague.league_type === 'x' ? 'Classic League' : 'Head-to-Head League'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>League ID: {analyzedLeague.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{metrics.totalManagers}</p>
                      <p className="text-xs text-muted-foreground">Total Managers</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Trophy className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{metrics.topScore.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Highest Score</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold">{metrics.averagePoints.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Average Score</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                      <p className="text-2xl font-bold">{metrics.lastGwAverage}</p>
                      <p className="text-xs text-muted-foreground">Last GW Average</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rank Movement Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rank Movement Summary
                  </CardTitle>
                  <CardDescription>Analysis of position changes from last gameweek</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg bg-green-50">
                      <p className="text-3xl font-bold text-green-600">{metrics.improvements}</p>
                      <p className="text-sm text-muted-foreground">Managers Improved</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-red-50">
                      <p className="text-3xl font-bold text-red-600">{metrics.declines}</p>
                      <p className="text-sm text-muted-foreground">Managers Declined</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-gray-50">
                      <p className="text-3xl font-bold text-gray-600">
                        {metrics.totalManagers - metrics.rankChanges}
                      </p>
                      <p className="text-sm text-muted-foreground">No Change</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="standings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Complete League Standings
                  </CardTitle>
                  <CardDescription>
                    All managers ranked by total points with gameweek performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyzedLeague.standings.map((standing) => (
                      <div 
                        key={standing.entry}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`standing-${standing.entry}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <Badge variant={getBadgeVariant(standing.rank)} className="mb-1">
                              #{standing.rank}
                            </Badge>
                            {standing.rank !== standing.last_rank && (
                              <div className="text-xs">
                                {standing.rank < standing.last_rank ? (
                                  <span className="text-green-600 font-medium">
                                    ↑{standing.last_rank - standing.rank}
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-medium">
                                    ↓{standing.rank - standing.last_rank}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-lg">{standing.player_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {standing.entry_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {standing.total.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            GW: {standing.event_total} pts
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Performance Categories
                  </CardTitle>
                  <CardDescription>
                    Managers grouped by performance levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Top Performers */}
                    <div>
                      <h4 className="font-medium mb-3 text-green-600">🏆 Top Performers (Top 20%)</h4>
                      <div className="grid gap-2">
                        {analyzedLeague.standings
                          .slice(0, Math.ceil(analyzedLeague.standings.length * 0.2))
                          .map((standing) => (
                            <div key={standing.entry} className="flex justify-between items-center p-2 bg-green-50 rounded">
                              <span className="font-medium">{standing.player_name}</span>
                              <span className="text-sm">{standing.total.toLocaleString()} pts</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Mid-tier */}
                    <div>
                      <h4 className="font-medium mb-3 text-blue-600">📈 Mid-tier (21%-80%)</h4>
                      <div className="text-sm text-muted-foreground mb-2">
                        {Math.ceil(analyzedLeague.standings.length * 0.2)} to {Math.floor(analyzedLeague.standings.length * 0.8)} managers
                      </div>
                      <div className="p-3 bg-blue-50 rounded text-center">
                        <p className="font-medium">
                          Average: {Math.round(
                            analyzedLeague.standings
                              .slice(Math.ceil(analyzedLeague.standings.length * 0.2), Math.floor(analyzedLeague.standings.length * 0.8))
                              .reduce((sum, s) => sum + s.total, 0) / 
                              (Math.floor(analyzedLeague.standings.length * 0.8) - Math.ceil(analyzedLeague.standings.length * 0.2))
                          ).toLocaleString()} pts
                        </p>
                      </div>
                    </div>

                    {/* Struggling */}
                    <div>
                      <h4 className="font-medium mb-3 text-red-600">🔄 Need Improvement (Bottom 20%)</h4>
                      <div className="grid gap-2">
                        {analyzedLeague.standings
                          .slice(Math.floor(analyzedLeague.standings.length * 0.8))
                          .map((standing) => (
                            <div key={standing.entry} className="flex justify-between items-center p-2 bg-red-50 rounded">
                              <span className="font-medium">{standing.player_name}</span>
                              <span className="text-sm">{standing.total.toLocaleString()} pts</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!analyzedLeague && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No League Analyzed Yet</h3>
              <p className="text-muted-foreground mb-4">
                Enter a league ID above to analyze player performance and compare managers within that league
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Find league IDs in the FPL website under "Leagues & Cups"</p>
                <p>Example league analysis includes standings, performance categories, and rank movements</p>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </Layout>
  );
}
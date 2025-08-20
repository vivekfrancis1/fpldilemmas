import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trophy, TrendingUp, BarChart3, Search, Plus, X, Target, Crown, Medal } from "lucide-react";
import Header from "../components/header";
import Footer from "../components/footer";

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

interface ComparedLeague {
  id: number;
  name: string;
  data: LeagueData;
  averageScore: number;
  topScore: number;
  totalManagers: number;
  yourRank?: number;
  yourPoints?: number;
}

export default function LeagueComparison() {
  const [leagueIds, setLeagueIds] = useState<string[]>([]);
  const [newLeagueId, setNewLeagueId] = useState("");
  const [comparedLeagues, setComparedLeagues] = useState<ComparedLeague[]>([]);

  const addLeague = () => {
    if (newLeagueId && !leagueIds.includes(newLeagueId)) {
      setLeagueIds([...leagueIds, newLeagueId]);
      setNewLeagueId("");
    }
  };

  const removeLeague = (idToRemove: string) => {
    setLeagueIds(leagueIds.filter(id => id !== idToRemove));
    setComparedLeagues(comparedLeagues.filter(league => league.id.toString() !== idToRemove));
  };

  const { data: leaguesData, isLoading, error } = useQuery({
    queryKey: ['/api/leagues/compare', leagueIds],
    enabled: leagueIds.length > 0,
    refetchOnWindowFocus: false,
  });

  const compareLeagues = () => {
    if (leaguesData && Array.isArray(leaguesData)) {
      const compared: ComparedLeague[] = leaguesData.map((league: LeagueData) => {
        const standings = league.standings || [];
        const averageScore = standings.length > 0 
          ? standings.reduce((sum, standing) => sum + standing.total, 0) / standings.length 
          : 0;
        const topScore = standings.length > 0 
          ? Math.max(...standings.map(s => s.total)) 
          : 0;

        return {
          id: league.id,
          name: league.name,
          data: league,
          averageScore: Math.round(averageScore),
          topScore,
          totalManagers: standings.length,
          yourRank: standings.find(s => s.rank === 1)?.rank, // This would be determined by user's team
          yourPoints: standings.find(s => s.rank === 1)?.total
        };
      });
      setComparedLeagues(compared);
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

  return (
    <div className="min-h-screen bg-fpl-light">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
            League Comparison Tool
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Compare performance across multiple FPL mini-leagues and analyze standings
          </p>
        </div>

        {/* Add Leagues Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Leagues to Compare
            </CardTitle>
            <CardDescription>
              Enter league IDs to compare their standings and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter league ID..."
                value={newLeagueId}
                onChange={(e) => setNewLeagueId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLeague()}
                data-testid="input-league-id"
              />
              <Button onClick={addLeague} data-testid="button-add-league">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Selected Leagues */}
            {leagueIds.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Leagues:</p>
                <div className="flex flex-wrap gap-2">
                  {leagueIds.map((id) => (
                    <Badge key={id} variant="secondary" className="flex items-center gap-2">
                      League {id}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeLeague(id)}
                        data-testid={`button-remove-${id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Button 
                  onClick={compareLeagues} 
                  disabled={isLoading}
                  data-testid="button-compare-leagues"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {isLoading ? "Loading..." : "Compare Leagues"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <Search className="h-4 w-4" />
            <AlertDescription>
              Failed to load league data. Please check the league IDs and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Comparison Results */}
        {comparedLeagues.length > 0 && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">League Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comparedLeagues.map((league) => (
                  <Card key={league.id} data-testid={`league-overview-${league.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{league.name}</span>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </CardTitle>
                      <CardDescription>ID: {league.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {league.topScore.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Top Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {league.averageScore.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Average</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-semibold">
                          {league.totalManagers}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Managers</p>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-center">League Type</p>
                        <Badge variant="outline" className="w-full justify-center mt-1">
                          {league.data.league_type === 'x' ? 'Classic' : 'Head-to-Head'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Stats Comparison */}
              {comparedLeagues.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Quick Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="font-medium mb-2">Highest Top Score</p>
                        {(() => {
                          const highest = comparedLeagues.reduce((prev, current) => 
                            current.topScore > prev.topScore ? current : prev
                          );
                          return (
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span className="font-semibold">{highest.name}</span>
                              <Badge variant="default">{highest.topScore.toLocaleString()}</Badge>
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="font-medium mb-2">Highest Average</p>
                        {(() => {
                          const highest = comparedLeagues.reduce((prev, current) => 
                            current.averageScore > prev.averageScore ? current : prev
                          );
                          return (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span className="font-semibold">{highest.name}</span>
                              <Badge variant="secondary">{highest.averageScore.toLocaleString()}</Badge>
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="font-medium mb-2">Largest League</p>
                        {(() => {
                          const largest = comparedLeagues.reduce((prev, current) => 
                            current.totalManagers > prev.totalManagers ? current : prev
                          );
                          return (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="font-semibold">{largest.name}</span>
                              <Badge variant="outline">{largest.totalManagers} managers</Badge>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              {comparedLeagues.map((league) => (
                <Card key={league.id} data-testid={`league-detailed-${league.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {league.name}
                      <Badge variant="outline">
                        {league.totalManagers} managers
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      League ID: {league.id} • Average: {league.averageScore} pts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium">Top 10 Standings</h4>
                      <div className="space-y-2">
                        {league.data.standings.slice(0, 10).map((standing) => (
                          <div 
                            key={standing.entry}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            data-testid={`standing-${standing.entry}`}
                          >
                            <div className="flex items-center gap-3">
                              {getRankIcon(standing.rank)}
                              <div>
                                <p className="font-medium">{standing.player_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {standing.entry_name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Badge variant={getBadgeVariant(standing.rank)}>
                                  #{standing.rank}
                                </Badge>
                                <span className="font-semibold">
                                  {standing.total.toLocaleString()} pts
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                GW: {standing.event_total} pts
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {leagueIds.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Leagues Selected</h3>
              <p className="text-muted-foreground mb-4">
                Add league IDs above to start comparing league performance and standings
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Find league IDs in the FPL website under "Leagues & Cups"</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
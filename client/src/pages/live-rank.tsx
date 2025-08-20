import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Target, Activity, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ManagerData {
  id: number;
  player_first_name: string;
  player_last_name: string;
  player_region_name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  current_event: number;
  leagues: {
    classic: Array<{
      id: number;
      name: string;
      rank: number;
      entry_rank: number;
    }>;
  };
}

interface ManagerHistory {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
  }>;
  past: Array<{
    season_name: string;
    total_points: number;
    rank: number;
  }>;
  chips: Array<{
    name: string;
    time: string;
    event: number;
  }>;
}

export default function LiveRank() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");

  const { data: managerData, isLoading: isLoadingManager, error: managerError } = useQuery({
    queryKey: ["/api/manager", searchedId],
    enabled: !!searchedId,
  });

  const { data: historyData, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ["/api/manager", searchedId, "history"],
    enabled: !!searchedId,
  });

  const handleSearch = () => {
    if (managerId.trim()) {
      setSearchedId(managerId.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatRank = (rank: number) => {
    return rank.toLocaleString();
  };

  const getRankChange = () => {
    if (!history?.current || history.current.length < 2) return null;
    
    const current = history.current[history.current.length - 1];
    const previous = history.current[history.current.length - 2];
    
    return previous.overall_rank - current.overall_rank;
  };

  const getTopLeagues = () => {
    if (!manager?.leagues?.classic) return [];
    
    return manager.leagues.classic
      .filter((league: any) => league.entry_rank <= 100) // Only show top 100 positions
      .sort((a: any, b: any) => a.entry_rank - b.entry_rank)
      .slice(0, 5); // Top 5 leagues
  };

  const manager = managerData as ManagerData;
  const history = historyData as ManagerHistory;
  const isLoading = isLoadingManager || isLoadingHistory;
  const error = managerError || historyError;

  return (
    <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Live Rank Tracker</h1>
          <p className="text-muted-foreground">
            Track your FPL rank in real-time. Enter your manager ID to see your current position.
          </p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Manager Search
            </CardTitle>
            <CardDescription>
              Enter your FPL Manager ID. You can find this in your FPL URL when logged in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                data-testid="input-manager-id"
                placeholder="Enter Manager ID (e.g., 123456)"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                data-testid="button-search-manager"
                onClick={handleSearch} 
                disabled={!managerId.trim() || isLoading}
              >
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium">How to find your Manager ID:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Go to <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">fantasy.premierleague.com</a></li>
                <li>Sign in and go to "Pick Team" or "Points"</li>
                <li>Your Manager ID is the number in the URL (e.g., /entry/123456/)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load manager data. Please check the Manager ID and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Manager Info and Ranks */}
        {manager && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Manager Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Manager Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-manager-name">
                    {manager.player_first_name} {manager.player_last_name}
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-manager-region">
                    {manager.player_region_name}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary" data-testid="text-total-points">
                      {manager.summary_overall_points.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold" data-testid="text-current-gameweek">
                      GW {manager.current_event}
                    </p>
                    <p className="text-sm text-muted-foreground">Current Gameweek</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Ranks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current Rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Overall Rank</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold" data-testid="text-overall-rank">
                        {formatRank(manager.summary_overall_rank)}
                      </span>
                      {getRankChange() !== null && (
                        <Badge variant={getRankChange()! > 0 ? "success" : "destructive"} className="text-xs">
                          {getRankChange()! > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {Math.abs(getRankChange()!).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gameweek Rank</span>
                    <span className="text-lg font-semibold" data-testid="text-gameweek-rank">
                      {manager.summary_event_rank ? formatRank(manager.summary_event_rank) : "N/A"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gameweek Points</span>
                    <span className="text-lg font-semibold" data-testid="text-gameweek-points">
                      {manager.summary_event_points || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* League Standings */}
        {manager && getTopLeagues().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top League Positions
              </CardTitle>
              <CardDescription>
                Your best positions in leagues you've joined
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getTopLeagues().map((league: any, index: number) => (
                  <div 
                    key={league.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`league-position-${index}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{league.name}</p>
                      <p className="text-sm text-muted-foreground">League ID: {league.id}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={league.entry_rank <= 10 ? "success" : league.entry_rank <= 50 ? "secondary" : "outline"}>
                        #{league.entry_rank}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Performance */}
        {history?.current && history.current.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Performance
              </CardTitle>
              <CardDescription>
                Last 5 gameweeks performance and rank changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.current.slice(-5).reverse().map((gameweek, index) => {
                  const previousGW = history.current[history.current.length - 1 - index - 1];
                  const rankChange = previousGW ? previousGW.overall_rank - gameweek.overall_rank : 0;
                  
                  return (
                    <div 
                      key={gameweek.event} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`gameweek-${gameweek.event}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="font-medium">GW {gameweek.event}</p>
                        </div>
                        <div>
                          <p className="font-medium">{gameweek.points} points</p>
                          <p className="text-sm text-muted-foreground">
                            Total: {gameweek.total_points.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">#{formatRank(gameweek.overall_rank)}</p>
                        {rankChange !== 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            {rankChange > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={rankChange > 0 ? "text-green-600" : "text-red-600"}>
                              {Math.abs(rankChange).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Seasons */}
        {history?.past && history.past.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historical Performance</CardTitle>
              <CardDescription>
                Your final rankings from previous seasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {history.past.slice(-4).reverse().map((season, index) => (
                  <div 
                    key={season.season_name} 
                    className="p-3 border rounded-lg"
                    data-testid={`season-${season.season_name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{season.season_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {season.total_points.toLocaleString()} points
                        </p>
                      </div>
                      <Badge variant="outline">
                        #{formatRank(season.rank)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
          </div>
        </div>
    </Layout>
  );
}
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Users, TrendingUp, Target, Search, Crown, Medal, Award, AlertTriangle } from "lucide-react";

interface LeagueEntry {
  id: number;
  entry_name: string;
  player_first_name: string;
  player_last_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
}

interface League {
  id: number;
  name: string;
  short_name: string;
  created: string;
  closed: boolean;
  max_entries: number | null;
  league_type: string;
  admin_entry: number;
  start_event: number;
  code_privacy: string;
}

interface LeagueStandings {
  league: League;
  new_entries: {
    has_next: boolean;
    page: number;
    results: LeagueEntry[];
  };
  standings: {
    has_next: boolean;
    page: number;
    results: LeagueEntry[];
  };
}

function MyLeagues() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");

  // Load cached manager ID on component mount
  useEffect(() => {
    const loadCachedManagerId = async () => {
      try {
        const response = await fetch("/api/manager/cache/last");
        if (response.ok) {
          const data = await response.json();
          if (data.managerId) {
            setManagerId(data.managerId);
            setSearchedId(data.managerId);
          }
        }
      } catch (error) {
        console.error("Failed to load cached manager ID:", error);
      }
    };

    loadCachedManagerId();
  }, []);

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

  // Get manager details
  const { data: managerData, isLoading: isLoadingManager, error: managerError } = useQuery<any>({
    queryKey: ["/api/manager", searchedId],
    enabled: !!searchedId,
  });

  // Get manager's leagues
  const { data: leaguesData, isLoading: isLoadingLeagues, error: leaguesError } = useQuery<any>({
    queryKey: ["/api/manager", searchedId, "leagues"],
    enabled: !!searchedId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getLeagueTypeDisplay = (leagueType: string) => {
    switch (leagueType) {
      case 'c': return 'Classic';
      case 'h2h': return 'Head-to-Head';
      default: return leagueType;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Leagues</h1>
            <p className="text-gray-600 mt-1">Track your performance across all leagues</p>
          </div>
        </div>

      {/* Manager Search */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enter Manager ID
          </CardTitle>
          <CardDescription>
            Enter your FPL Manager ID to view your leagues and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Manager ID (e.g., 123456)"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              data-testid="input-manager-id"
            />
            <Button 
              onClick={handleSearch} 
              disabled={!managerId.trim()}
              data-testid="button-search"
            >
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error States */}
      {managerError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            Failed to load manager data. Please check the Manager ID and try again.
          </AlertDescription>
        </Alert>
      )}

      {leaguesError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            Failed to load leagues data. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {(isLoadingManager || isLoadingLeagues) && searchedId && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading leagues...</p>
          </div>
        </div>
      )}

      {/* Manager Info */}
      {managerData && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-200 rounded-full">
                <Users className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">
                  {managerData.player_first_name} {managerData.player_last_name}
                </h2>
                <p className="text-blue-700">{managerData.name}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-blue-600">
                  <span>Overall Rank: #{managerData.summary_overall_rank?.toLocaleString()}</span>
                  <span>Total Points: {managerData.summary_overall_points}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Private Leagues Only */}
      {leaguesData && leaguesData.leagues && (() => {
        // Filter to only show private leagues (ID > 1000)
        const privateLeagues = leaguesData.leagues.classic.filter((league: any) => league.id > 1000);
        
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Your Leagues ({privateLeagues.length})</h2>
            </div>
            
            {privateLeagues.length > 0 ? (
              <div className="grid gap-4">
                {privateLeagues.map((league: any) => (
                  <LeagueCard 
                    key={league.id}
                    league={league}
                    managerId={searchedId}
                    managerName={managerData?.name}
                    formatDate={formatDate}
                    getLeagueTypeDisplay={getLeagueTypeDisplay}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-gray-50">
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No private leagues found for this manager.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}
      </div>
    </Layout>
  );
}

export default MyLeagues;



// Private League Card Component (detailed analysis)
function LeagueCard({ league, managerId, managerName, formatDate, getLeagueTypeDisplay }: { 
  league: any; 
  managerId: string; 
  managerName: string;
  formatDate: (dateString: string) => string;
  getLeagueTypeDisplay: (leagueType: string) => string;
}) {
  const { data: standingsData, isLoading } = useQuery<LeagueStandings>({
    queryKey: ["/api/league", league.id, "standings"],
    enabled: !!league.id,
  });

  const { data: userTeamData } = useQuery<any>({
    queryKey: ["/api/manager", managerId, "team"],
    enabled: !!managerId,
  });

  const { data: bootstrapData } = useQuery<any>({
    queryKey: ["/api/bootstrap-static"],
  });

  const getPositionIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getRankChange = (rank: number, lastRank: number) => {
    if (lastRank === 0) return null;
    const change = lastRank - rank;
    if (change > 0) {
      return <span className="text-green-600 text-xs">↑{change}</span>;
    } else if (change < 0) {
      return <span className="text-red-600 text-xs">↓{Math.abs(change)}</span>;
    }
    return <span className="text-gray-500 text-xs">-</span>;
  };

  const userEntry = standingsData?.standings.results.find(
    entry => entry.entry.toString() === managerId
  );

  const totalMembers = standingsData?.standings.results.length || 0;
  const userRank = userEntry?.rank || 0;
  const userPoints = userEntry?.total || 0;

  // Calculate performance metrics
  const topPercentile = totalMembers > 0 ? (userRank / totalMembers) * 100 : 0;
  const isTopHalf = topPercentile <= 50;
  const isTop10 = topPercentile <= 10;

  // Get average points for comparison
  const averagePoints = standingsData?.standings?.results && standingsData.standings.results.length > 0 
    ? standingsData.standings.results.reduce((sum, entry) => sum + entry.total, 0) / standingsData.standings.results.length
    : 0;

  const pointsAboveAverage = userPoints - averagePoints;

  // Calculate differentials and threats
  const getDifferentialsAndThreats = () => {
    if (!userTeamData?.picks || !standingsData?.standings?.results || !bootstrapData?.elements) {
      return { differentials: [], threats: [] };
    }

    // Get current user's players
    const userPlayers = new Set(userTeamData.picks.map((pick: any) => pick.element));
    
    // Get all other teams in the league (we'd need to fetch their teams)
    // For now, we'll use a simplified approach with ownership percentages from bootstrap data
    const players = bootstrapData.elements;
    
    // Find differentials (user owns, low ownership)
    const differentials = userTeamData.picks
      .map((pick: any) => {
        const player = players.find((p: any) => p.id === pick.element);
        return player ? {
          ...player,
          ownership: parseFloat(player.selected_by_percent),
          isOwned: true
        } : null;
      })
      .filter((p: any) => p && p.ownership < 15) // Low ownership threshold
      .sort((a: any, b: any) => a.ownership - b.ownership)
      .slice(0, 3);

    // Find threats (user doesn't own, high ownership)  
    const threats = players
      .filter((player: any) => 
        !userPlayers.has(player.id) && 
        parseFloat(player.selected_by_percent) > 30 // High ownership threshold
      )
      .map((player: any) => ({
        ...player,
        ownership: parseFloat(player.selected_by_percent),
        isOwned: false
      }))
      .sort((a: any, b: any) => b.ownership - a.ownership)
      .slice(0, 3);

    return { differentials, threats };
  };

  const { differentials, threats } = getDifferentialsAndThreats();

  return (
    <Card className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {getPositionIcon(userRank)}
              <span className="truncate">{league.name}</span>
              <Badge variant="outline" className="text-xs font-mono">
                #{league.id}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getLeagueTypeDisplay(league.league_type)}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Created: {formatDate(league.created)} • {totalMembers} members
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : standingsData && userEntry ? (
          <div className="space-y-4">
            {/* User Position */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Position</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-bold text-blue-900">#{userRank}</span>
                  {getRankChange(userEntry.rank, userEntry.last_rank)}
                </div>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Points</span>
                </div>
                <span className="text-xl font-bold text-green-900">{userPoints}</span>
              </div>

              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Percentile</span>
                </div>
                <span className={`text-xl font-bold ${isTop10 ? 'text-green-900' : isTopHalf ? 'text-yellow-900' : 'text-red-900'}`}>
                  {topPercentile.toFixed(1)}%
                </span>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">vs Avg</span>
                </div>
                <span className={`text-xl font-bold ${pointsAboveAverage >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {pointsAboveAverage >= 0 ? '+' : ''}{pointsAboveAverage.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Performance Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Your rank:</span>
                  <span className="font-medium">#{userRank} of {totalMembers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">League average:</span>
                  <span className="font-medium">{averagePoints.toFixed(0)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Performance:</span>
                  <span className={`font-medium ${isTop10 ? 'text-green-600' : isTopHalf ? 'text-yellow-600' : 'text-red-600'}`}>
                    {isTop10 ? 'Excellent' : isTopHalf ? 'Above Average' : 'Below Average'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Points difference:</span>
                  <span className={`font-medium ${pointsAboveAverage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pointsAboveAverage >= 0 ? '+' : ''}{pointsAboveAverage.toFixed(0)} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Top 3 Preview */}
            {standingsData.standings.results.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  League Leaders
                </h4>
                <div className="space-y-1 text-sm">
                  {standingsData.standings.results.slice(0, 3).map((entry, index) => (
                    <div key={entry.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {getPositionIcon(entry.rank)}
                        <span className={entry.entry.toString() === managerId ? 'font-semibold text-blue-900' : 'text-gray-700'}>
                          {entry.entry.toString() === managerId ? 'You' : entry.entry_name}
                        </span>
                      </div>
                      <span className="font-medium">{entry.total} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Differentials and Threats */}
            {(differentials.length > 0 || threats.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                {/* Differentials */}
                {differentials.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-sm text-green-700 mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Differentials (Low Ownership)
                    </h5>
                    <div className="space-y-1">
                      {differentials.map((player: any) => (
                        <div key={player.id} className="flex justify-between items-center text-xs bg-green-50 p-2 rounded">
                          <span className="font-medium text-green-900">{player.web_name}</span>
                          <span className="text-green-600">{player.ownership.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Threats */}
                {threats.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-sm text-red-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Threats (High Ownership)
                    </h5>
                    <div className="space-y-1">
                      {threats.map((player: any) => (
                        <div key={player.id} className="flex justify-between items-center text-xs bg-red-50 p-2 rounded">
                          <span className="font-medium text-red-900">{player.web_name}</span>
                          <span className="text-red-600">{player.ownership.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Unable to load league standings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
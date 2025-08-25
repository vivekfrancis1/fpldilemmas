import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, TrendingUp, Target, Search, Crown, Medal, Award, AlertTriangle, Eye, ChevronDown, ChevronUp, BarChart3, Star, Activity, ArrowLeft } from "lucide-react";

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

function MyLeagues() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [analyzedLeague, setAnalyzedLeague] = useState<LeagueData | null>(null);
  const [viewMode, setViewMode] = useState<'leagues' | 'analysis'>('leagues');

  // Cache manager ID functionality
  const saveManagerIdToCache = (id: string) => {
    try {
      localStorage.setItem('fpl-manager-id', id);
    } catch (error) {
      console.warn('Failed to save manager ID to localStorage:', error);
    }
  };

  const getManagerIdFromCache = (): string | null => {
    try {
      return localStorage.getItem('fpl-manager-id');
    } catch (error) {
      console.warn('Failed to get manager ID from localStorage:', error);
      return null;
    }
  };

  // Load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      // Auto-load the data for cached manager
      setSearchedId(cachedId);
    }
  }, []);

  const handleSearch = () => {
    if (managerId.trim()) {
      const trimmedId = managerId.trim();
      setSearchedId(trimmedId);
      // Save to cache for future use
      saveManagerIdToCache(trimmedId);
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

      {/* Analysis View */}
      {viewMode === 'analysis' && (
        <div className="mb-6">
          <Button 
            onClick={() => setViewMode('leagues')}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leagues
          </Button>
          
          {analyzedLeague ? (
            <LeagueAnalysisView league={analyzedLeague} />
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading league analysis...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Private Leagues Only */}
      {viewMode === 'leagues' && leaguesData && leaguesData.classic && (() => {
        // Filter to only show private leagues (ID > 1000)
        const privateLeagues = leaguesData.classic.filter((league: any) => league.id > 1000);
        
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
                    onAnalyzeLeague={(leagueId) => {
                      setAnalyzedLeague(null);
                      setViewMode('analysis');
                      // Fetch league analysis data
                      const fetchAnalysis = async () => {
                        try {
                          const response = await fetch(`/api/leagues/${leagueId}/analyze`);
                          const data = await response.json();
                          setAnalyzedLeague(data);
                        } catch (error) {
                          console.error('Failed to fetch league analysis:', error);
                        }
                      };
                      fetchAnalysis();
                    }}
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
    
  );
}

// League Analysis View Component
function LeagueAnalysisView({ league }: { league: LeagueData }) {
  // Calculate metrics
  const totalManagers = league.standings.length;
  const topScore = Math.max(...league.standings.map(s => s.total));
  const averagePoints = league.standings.reduce((sum, s) => sum + s.total, 0) / totalManagers;
  const lastGwAverage = Math.round(league.standings.reduce((sum, s) => sum + s.event_total, 0) / totalManagers);
  
  // Calculate rank movements
  const improvements = league.standings.filter(s => s.last_rank > 0 && s.rank < s.last_rank).length;
  const declines = league.standings.filter(s => s.last_rank > 0 && s.rank > s.last_rank).length;
  const rankChanges = improvements + declines;

  const getBadgeVariant = (rank: number) => {
    if (rank === 1) return "default";
    if (rank <= 3) return "secondary"; 
    return "outline";
  };

  const getRankChangeDisplay = (current: number, last: number) => {
    if (last === 0) return null;
    const change = last - current;
    if (change > 0) return <span className="text-green-600 text-xs">↑{change}</span>;
    if (change < 0) return <span className="text-red-600 text-xs">↓{Math.abs(change)}</span>;
    return <span className="text-gray-500 text-xs">-</span>;
  };

  return (
    <div className="space-y-6">
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
                <span className="truncate">{league.name}</span>
                <Badge variant="outline">
                  {league.league_type === 'x' ? 'Classic League' : 'Head-to-Head League'}
                </Badge>
              </CardTitle>
              <CardDescription>League ID: {league.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{totalManagers}</p>
                  <p className="text-xs text-muted-foreground">Total Managers</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{topScore.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Highest Score</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold">{averagePoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Average Score</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-2xl font-bold">{lastGwAverage}</p>
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
                  <p className="text-3xl font-bold text-green-600">{improvements}</p>
                  <p className="text-sm text-muted-foreground">Managers Improved</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <p className="text-3xl font-bold text-red-600">{declines}</p>
                  <p className="text-sm text-muted-foreground">Managers Declined</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-gray-50">
                  <p className="text-3xl font-bold text-gray-600">
                    {totalManagers - rankChanges}
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
                {league.standings.map((standing) => (
                  <div 
                    key={standing.entry}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant={getBadgeVariant(standing.rank)} className="min-w-[40px] justify-center">
                        #{standing.rank}
                      </Badge>
                      <div>
                        <p className="font-medium">{standing.entry_name}</p>
                        <p className="text-sm text-muted-foreground">{standing.player_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-bold">{standing.total.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Points</p>
                      </div>
                      <div>
                        <p className="font-medium">{standing.event_total}</p>
                        <p className="text-xs text-muted-foreground">Last GW</p>
                      </div>
                      <div className="w-12 text-center">
                        {getRankChangeDisplay(standing.rank, standing.last_rank)}
                      </div>
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
                Top Performers
              </CardTitle>
              <CardDescription>Highest scorers and recent gameweek standouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-3">Overall Leaders</h4>
                  <div className="space-y-2">
                    {league.standings.slice(0, 5).map((standing, index) => (
                      <div key={standing.entry} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">{standing.entry_name}</span>
                        </div>
                        <span className="text-sm font-bold">{standing.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Last Gameweek Stars</h4>
                  <div className="space-y-2">
                    {league.standings
                      .sort((a, b) => b.event_total - a.event_total)
                      .slice(0, 5)
                      .map((standing, index) => (
                        <div key={standing.entry} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-medium flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium">{standing.entry_name}</span>
                          </div>
                          <span className="text-sm font-bold">{standing.event_total}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MyLeagues;



// Private League Card Component (detailed analysis)
function LeagueCard({ league, managerId, managerName, formatDate, getLeagueTypeDisplay, onAnalyzeLeague }: { 
  league: any; 
  managerId: string; 
  managerName: string;
  formatDate: (dateString: string) => string;
  getLeagueTypeDisplay: (leagueType: string) => string;
  onAnalyzeLeague: (leagueId: number) => void;
}) {
  const { data: standingsData, isLoading } = useQuery<LeagueStandings>({
    queryKey: ["/api/leagues-classic", league.id, "standings"],
    enabled: !!league.id,
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

            {/* Analyze League Action */}
            <div className="pt-4 border-t border-gray-200">
              <Button 
                onClick={() => onAnalyzeLeague(league.id)}
                variant="default" 
                size="sm" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid={`button-analyze-league-${league.id}`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze League
              </Button>
            </div>

            {/* League Table - removed, replaced with Analyze button */}
            {false && standingsData?.standings?.results && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {standingsData.standings.results.map((entry: LeagueEntry) => (
                    <div 
                      key={entry.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        entry.entry.toString() === managerId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                      data-testid={`team-row-${entry.entry}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getPositionIcon(entry.rank)}
                          <span className="font-medium text-sm text-gray-900">
                            {entry.rank}
                          </span>
                        </div>
                        <div>
                          <div className={`font-medium text-sm ${
                            entry.entry.toString() === managerId ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {entry.entry.toString() === managerId ? 'You' : entry.entry_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {entry.player_first_name} {entry.player_last_name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{entry.total} pts</div>
                        <div className="text-xs text-gray-600">
                          {entry.rank > entry.last_rank ? (
                            <span className="text-red-600">↓ {entry.rank - entry.last_rank}</span>
                          ) : entry.rank < entry.last_rank ? (
                            <span className="text-green-600">↑ {entry.last_rank - entry.rank}</span>
                          ) : (
                            <span className="text-gray-500">→</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


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
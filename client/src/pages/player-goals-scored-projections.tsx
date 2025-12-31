import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Filter, BarChart3, Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Loader2, X } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { computeCurrentGameweek, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, SortableHeader, type TableColumn } from "@/components/enhanced-table";
import { LoadingExperience } from "@/components/loading-experience";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";

interface PlayerGoalProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  teamShort: string;
  position: string;
  totalProjectedGoals: number;
  gameweekProjections: { [gameweek: string]: number };
  goalShare: number;
}

export default function PlayerGoalsScoredProjections() {
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [startGameweek, setStartGameweek] = useState<number | null>(null);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const queryClient = useQueryClient();

  // FPL points from goals based on position
  const getPointsFromGoals = (goals: number, position: string): number => {
    const multiplier = position === 'Goalkeeper' || position === 'GKP' ? 10 :
                      position === 'Defender' || position === 'DEF' ? 6 : 
                      position === 'Midfielder' || position === 'MID' ? 5 : 4; // Goalkeepers: 10pts, Defenders: 6pts, Midfielders: 5pts, Forwards: 4pts
    return goals * multiplier;
  };

  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Fetch fixtures for opponent information
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a mapping of teamShort + gameweek -> opponent info
  const opponentMap = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Map();
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        // Home team's opponent is away team
        map.set(`${homeTeam.short_name}-${fixture.event}`, {
          opponent: awayTeam.short_name,
          opponentId: fixture.team_a,
          isHome: true
        });
        // Away team's opponent is home team
        map.set(`${awayTeam.short_name}-${fixture.event}`, {
          opponent: homeTeam.short_name,
          opponentId: fixture.team_h,
          isHome: false
        });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  // Create availability map for player availability badges
  const playerAvailabilityMap = usePlayerAvailabilityMap(bootstrapData);

  // Get available gameweeks for dropdown (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12); // Show 12 gameweeks in dropdown
  }, [bootstrapData?.events]);

  // One-time initialization when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, 6); // Default to 6 gameweeks
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 38) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
    }
  }, [bootstrapData, initialized]);

  // Use fast cached endpoint with robust error handling
  const { data: playerGoalData, isLoading: playerGoalLoading, error } = useQuery<PlayerGoalProjection[]>({
    queryKey: ["/api/player-goals-scored-projections"],
    staleTime: 30 * 60 * 1000, // 30 minute cache
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    refetchOnMount: false,
    retry: (failureCount, error) => {
      // Don't retry on 5xx server errors to avoid cascading failures
      if (error && typeof error === 'object' && 'status' in error && 
          typeof error.status === 'number' && error.status >= 500) {
        return false;
      }
      return failureCount < 2; // Max 2 retries for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    networkMode: 'online',
    placeholderData: [], // Show empty table immediately while loading
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    throwOnError: false // Don't throw errors, handle gracefully
  });

  // Get current gameweek from bootstrap data (for display purposes)
  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 3;

  // Toggle gameweek exclusion
  const toggleGameweekExclusion = (gw: number) => {
    setExcludedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  // Clear all exclusions
  const clearExclusions = () => {
    setExcludedGameweeks(new Set());
  };

  // Dynamic gameweek range based on user selection (default: starts from next gameweek)
  // Filters out excluded gameweeks
  const selectedGameweeks = useMemo(() => {
    if (!startGameweek || !endGameweek) return [];
    const gameweeks = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      if (!excludedGameweeks.has(gw)) {
        gameweeks.push(gw);
      }
    }
    return gameweeks;
  }, [startGameweek, endGameweek, excludedGameweeks]);

  // Filter and sort data
  const filteredProjections = useMemo(() => {
    if (!playerGoalData) return [];

    return playerGoalData
      .filter(player => {
        if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
        if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
        if (searchQuery && player.playerName && !player.playerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber.toString()] || 0;
          const bValue = b.gameweekProjections[gwNumber.toString()] || 0;
          return bValue - aValue;
        }
        
        const multiplier = sortDirection === 'desc' ? 1 : -1;
        
        switch (sortBy) {
          case "total": {
            // Sort by total goals in selected gameweeks
            const aPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw.toString()] || 0), 0);
            const bPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw.toString()] || 0), 0);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
          case "totalPoints": {
            // Sort by total points from goals in selected gameweeks
            const aGoalsTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw.toString()] || 0), 0);
            const bGoalsTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw.toString()] || 0), 0);
            const aPointsTotal = getPointsFromGoals(aGoalsTotal, a.position);
            const bPointsTotal = getPointsFromGoals(bGoalsTotal, b.position);
            return (bPointsTotal - aPointsTotal) * multiplier;
          }
          case "season": {
            return (b.totalProjectedGoals - a.totalProjectedGoals) * multiplier;
          }
          case "name": return a.playerName.localeCompare(b.playerName) * multiplier;
          case "team": return a.teamName.localeCompare(b.teamName) * multiplier;
          case "position": return a.position.localeCompare(b.position) * multiplier;
          default: {
            const aPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw.toString()] || 0), 0);
            const bPeriodTotal = selectedGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw.toString()] || 0), 0);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
        }
      });
  }, [playerGoalData, selectedTeam, selectedPosition, searchQuery, sortBy, sortDirection, selectedGameweeks]);

  const totalGoals = useMemo(() => {
    if (!filteredProjections.length) return { 
      gameweekTotals: {}, 
      overallTotal: 0, 
      seasonTotal: 0, 
      averagePerGame: 0,
      pointsGameweekTotals: {},
      pointsOverallTotal: 0,
      pointsSeasonTotal: 0,
      pointsAveragePerGame: 0
    };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    const pointsGameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    let pointsOverallTotal = 0;
    let pointsSeasonTotal = 0;
    
    const totalWeeks = selectedGameweeks.length;
    
    // Calculate totals for selected gameweeks
    selectedGameweeks.forEach(gwNumber => {
      const gwTotal = filteredProjections.reduce((sum, player) => sum + (player.gameweekProjections[gwNumber.toString()] || 0), 0);
      const gwPointsTotal = filteredProjections.reduce((sum, player) => {
        const goals = player.gameweekProjections[gwNumber.toString()] || 0;
        return sum + getPointsFromGoals(goals, player.position);
      }, 0);
      
      gameweekTotals[gwNumber] = gwTotal;
      pointsGameweekTotals[gwNumber] = gwPointsTotal;
      overallTotal += gwTotal;
      pointsOverallTotal += gwPointsTotal;
    });
    
    // Calculate season totals
    seasonTotal = filteredProjections.reduce((sum, player) => sum + player.totalProjectedGoals, 0);
    pointsSeasonTotal = filteredProjections.reduce((sum, player) => {
      return sum + getPointsFromGoals(player.totalProjectedGoals, player.position);
    }, 0);
    
    const averagePerGame = overallTotal / totalWeeks;
    const pointsAveragePerGame = pointsOverallTotal / totalWeeks;
    
    return { 
      gameweekTotals, 
      overallTotal, 
      seasonTotal, 
      averagePerGame,
      pointsGameweekTotals,
      pointsOverallTotal,
      pointsSeasonTotal,
      pointsAveragePerGame
    };
  }, [filteredProjections, selectedGameweeks, getPointsFromGoals]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!bootstrapData) return [];
    return bootstrapData.teams.map(team => ({
      id: team.id,
      name: team.name,
      short: team.short_name
    }));
  }, [bootstrapData]);

  const positions = useMemo(() => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(type => ({
      id: type.id,
      name: type.singular_name
    }));
  }, [bootstrapData]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const handleRefreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/cached/player-goals-projections"] });
    await queryClient.refetchQueries({ queryKey: ["/api/cached/player-goals-projections"] });
  };

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.5) return 'bg-green-50 text-green-800 font-semibold';
    if (goals >= 2.0) return 'bg-blue-50 text-blue-800 font-medium';
    if (goals >= 1.5) return 'bg-yellow-50 text-yellow-800';
    if (goals >= 1.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  const getPointsColor = (points: number) => {
    if (points >= 15) return 'bg-green-50 text-green-800 font-semibold';
    if (points >= 12) return 'bg-blue-50 text-blue-800 font-medium';
    if (points >= 8) return 'bg-yellow-50 text-yellow-800';
    if (points >= 5) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  // Show loading only when actually needed
  if (!initialized || !bootstrapData || isLoading || playerGoalLoading) {
    return (
      <LoadingExperience
        variant="analysis"
        title="Loading Goal Projections"
        description="Calculating projected goals for all players based on team projections and goal share..."
        steps={[
          { text: "Loading team goal projections", delay: "0s" },
          { text: "Analyzing player goal share percentages", delay: "0.2s" },
          { text: "Computing individual player projections", delay: "0.4s" },
        ]}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Target className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Temporarily Unavailable</h1>
            <p className="text-lg text-gray-600 mb-4">
              The FPL API is currently experiencing issues. This usually resolves within a few minutes.
            </p>
            <div className="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>What's happening:</strong> The official Fantasy Premier League API is temporarily returning 503 errors. 
                This is not an issue with our platform.
              </p>
            </div>
            <Button
              onClick={handleRefreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              data-testid="button-retry"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Loading overlay when refetching data after gameweek change */}
      {initialized && (isLoading || playerGoalLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="overlay-loading-goals">
          <LoadingExperience
            variant="analysis"
            title="Updating Goal Projections"
            description="Recalculating projected goals for the selected gameweek range..."
            steps={[
              { text: "Loading team goal projections", delay: "0s" },
              { text: "Updating player goal shares", delay: "0.2s" },
              { text: "Computing player projections", delay: "0.4s" },
            ]}
          />
        </div>
      )}
      
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Target className="h-8 w-8" />
            <h1>Player Goal Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Projected Goals for each player across all upcoming fixtures
          </p>
          <div className="mt-4">
            <Button
              onClick={handleRefreshData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border-white/30 text-white"
              data-testid="button-refresh-data"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Controls */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">From GW</label>
                <Select value={startGameweek?.toString() || ""} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">To GW</label>
                <Select value={endGameweek?.toString() || ""} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => !startGameweek || gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Position</label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {positions.map(pos => (
                      <SelectItem key={pos.id} value={pos.name}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Team</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.short}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  Search
                </label>
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  data-testid="input-search-players"
                />
              </div>
            </div>

            {/* Gameweek Toggle Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Toggle Gameweeks (click to exclude/include):
                </label>
                {excludedGameweeks.size > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearExclusions}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 sm:px-3"
                    data-testid="button-clear-exclusions"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear exclusions
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApplyAvailability(!applyAvailability)}
                  className={`text-xs sm:text-sm px-2 sm:px-3 ${applyAvailability ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'}`}
                  data-testid="button-toggle-availability"
                >
                  {applyAvailability ? 'Availability: ON' : 'Availability: OFF'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOpponent(!showOpponent)}
                  className={`text-xs sm:text-sm px-2 sm:px-3 ${showOpponent ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'}`}
                  data-testid="button-toggle-opponent"
                >
                  {showOpponent ? 'Hide Opponent' : 'Show Opponent'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {startGameweek && endGameweek && Array.from({ length: endGameweek - startGameweek + 1 }, (_, i) => {
                  const gwNumber = startGameweek + i;
                  const isExcluded = excludedGameweeks.has(gwNumber);
                  return (
                    <Button
                      key={gwNumber}
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGameweekExclusion(gwNumber)}
                      className={`min-w-[50px] sm:min-w-[60px] text-xs sm:text-sm px-2 sm:px-4 ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'}`}
                      data-testid={`button-toggle-gw-${gwNumber}`}
                    >
                      GW{gwNumber}
                    </Button>
                  );
                })}
              </div>
              {excludedGameweeks.size > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Excluded: {Array.from(excludedGameweeks).sort((a, b) => a - b).map(gw => `GW${gw}`).join(', ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Main Content */}
        <div className="w-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Player Goal Projections: GW{startGameweek}-GW{endGameweek}
                  {excludedGameweeks.size > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {excludedGameweeks.size} excluded
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[120px] sm:min-w-[180px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent text-xs md:text-sm"
                            onClick={() => handleSort("name")}
                            data-testid="sort-player-name"
                          >
                            Player
                            {sortBy === "name" && (
                              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                            )}
                            {sortBy !== "name" && <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />}
                          </Button>
                        </th>
                    {selectedGameweeks.map(gw => (
                      <th key={gw} className="px-1 sm:px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[50px] md:min-w-[60px]">
                        <div className="flex items-center justify-center gap-1" onClick={() => handleSort(`gw${gw}`)}>
                          GW{gw}
                          {sortBy === `gw${gw}` && (
                            sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                          )}
                          {sortBy !== `gw${gw}` && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </div>
                      </th>
                    ))}
                    <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100 transition-colors min-w-[80px]">
                      <div className="flex items-center justify-center gap-1" onClick={() => handleSort("total")}>
                        {selectedGameweeks.length} GW Goals
                        {sortBy === "total" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                        )}
                        {sortBy !== "total" && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </div>
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors min-w-[100px]">
                      <div className="flex items-center justify-center gap-1" onClick={() => handleSort("totalPoints")}>
                        {selectedGameweeks.length}GW Goal Pts
                        {sortBy === "totalPoints" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                        )}
                        {sortBy !== "totalPoints" && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjections.map((player, index) => {
                    const playerInfo = playerAvailabilityMap?.get(player.playerId);
                    const availabilityFactor = applyAvailability && playerInfo 
                      ? (playerInfo.chance_of_playing_next_round ?? 100) / 100 
                      : 1;
                    const hasAvailabilityAdjustment = applyAvailability && playerInfo && (playerInfo.chance_of_playing_next_round ?? 100) < 100;
                    const selectedTotal = selectedGameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw.toString()] || 0), 0) * availabilityFactor;
                    const totalPoints = getPointsFromGoals(selectedTotal, player.position);
                    
                    return (
                      <tr key={player.playerId} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-4 sticky left-0 bg-white border-r border-gray-100">
                          <div className="flex items-center gap-1">
                            <PlayerNameCell 
                              name={(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}
                              position={player.position}
                              team={player.teamShort}
                              compact={false}
                            />
                            {playerAvailabilityMap && playerAvailabilityMap.get(player.playerId) && (
                              <PlayerAvailabilityBadge player={playerAvailabilityMap.get(player.playerId)!} />
                            )}
                          </div>
                        </td>
                        {selectedGameweeks.map(gw => {
                          const goals = player.gameweekProjections[gw.toString()] || 0;
                          const displayGoals = goals * availabilityFactor;
                          const opponentInfo = opponentMap.get(`${player.teamShort}-${gw}`);
                          const opponent = opponentInfo?.opponent || 'TBD';
                          const isHome = opponentInfo?.isHome ?? true;
                          
                          return (
                            <td key={gw} className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                              <div className="text-sm">
                                {hasAvailabilityAdjustment && goals > 0 ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-bold text-purple-700">{displayGoals.toFixed(2)}</span>
                                    <span className="text-gray-400 line-through text-xs">{goals.toFixed(2)}</span>
                                  </div>
                                ) : (
                                  <div className="font-bold text-gray-900">
                                    {goals > 0 ? goals.toFixed(2) : "-"}
                                  </div>
                                )}
                                {showOpponent && (
                                  <div className={`text-xs ${isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                    {opponent} ({isHome ? 'H' : 'A'})
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className={`px-2 sm:px-4 py-2 sm:py-4 text-center ${hasAvailabilityAdjustment ? 'bg-purple-50' : 'bg-orange-50'}`}>
                          {hasAvailabilityAdjustment ? (
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-bold text-purple-700">{selectedTotal.toFixed(2)}</span>
                              <span className="text-gray-400 line-through text-xs">{selectedGameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw.toString()] || 0), 0).toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-orange-900">{selectedTotal.toFixed(2)}</span>
                          )}
                        </td>
                        <td className={`px-2 sm:px-4 py-2 sm:py-4 text-center ${hasAvailabilityAdjustment ? 'bg-purple-50' : 'bg-blue-50'}`}>
                          {hasAvailabilityAdjustment ? (
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-bold text-purple-700">{totalPoints.toFixed(1)}</span>
                              <span className="text-gray-400 line-through text-xs">{getPointsFromGoals(selectedGameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw.toString()] || 0), 0), player.position).toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-blue-900">{totalPoints.toFixed(1)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center text-sm font-bold text-gray-700 sticky left-0 bg-gray-100 border-r border-gray-200">
                      TOTAL
                    </td>
                    {selectedGameweeks.map(gw => (
                      <td key={gw} className="px-2 sm:px-4 py-2 sm:py-4 text-center text-sm font-bold text-gray-900 bg-gray-100">
                        {(totalGoals.gameweekTotals[gw] || 0) > 0 ? (totalGoals.gameweekTotals[gw] || 0).toFixed(2) : "-"}
                      </td>
                    ))}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center bg-orange-100">
                      <span className="text-lg font-bold text-orange-900">
                        {totalGoals.overallTotal.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center bg-blue-100">
                      <span className="text-lg font-bold text-blue-900">
                        {totalGoals.pointsOverallTotal.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
                    </table>
                  </div>
                </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
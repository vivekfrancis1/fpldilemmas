import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Filter, BarChart3, Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Loader2, X, ChevronDown, ChevronUp, History, Calendar } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { computeCurrentGameweek, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, SortableHeader, type TableColumn } from "@/components/enhanced-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingExperience } from "@/components/loading-experience";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  goals: number;
}

interface PlayerGoalProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  teamShort: string;
  position: string;
  totalProjectedGoals: number;
  gameweekProjections: { [gameweek: string]: number };
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
  goalShare: number;
}

interface PlayerGoalsHistory {
  lastFinishedGW: number;
  players: {
    playerId: number;
    playerName: string;
    teamName: string;
    teamShort: string;
    position: string;
    gameweekGoals: { [key: number]: number };
    totalGoals: number;
  }[];
}

export default function PlayerGoalsScoredProjections() {
  const { defaultWeeks } = useProjectionSettings();
  const [viewMode, setViewMode] = useState<"past" | "pastXg" | "future">("future");
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const togglePositionSelection = (position: string) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(position)) newSet.delete(position);
      else newSet.add(position);
      return newSet;
    });
  };

  const toggleTeamSelection = (team: string) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(team)) newSet.delete(team);
      else newSet.add(team);
      return newSet;
    });
  };
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [startGameweek, setStartGameweek] = useState<number | null>(null);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  const [initialized, setInitialized] = useState(false);
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

  // Fetch past player goals history
  const { data: historyData, isLoading: historyLoading } = useQuery<PlayerGoalsHistory>({
    queryKey: ["/api/player-goals-history"],
    enabled: viewMode === "past",
  });

  // Fetch past player xG history
  const { data: xgHistoryData, isLoading: xgHistoryLoading } = useQuery<{
    lastFinishedGW: number;
    players: Array<{
      id: number;
      name: string;
      teamName: string;
      teamShort: string;
      position: string;
      gameweekXg: { [gw: string]: number };
      totalXg: number;
    }>;
  }>({
    queryKey: ["/api/player-xg-history", startGameweek, endGameweek],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startGameweek) params.set('startGw', startGameweek.toString());
      if (endGameweek) params.set('endGw', endGameweek.toString());
      const response = await fetch(`/api/player-xg-history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch xG history");
      return response.json();
    },
    enabled: viewMode === "pastXg" && startGameweek !== null && endGameweek !== null,
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

  // Get available gameweeks for dropdown based on view mode
  const availableGameweeks = useMemo(() => {
    if (viewMode === "past" || viewMode === "pastXg") {
      const lastFinished = historyData?.lastFinishedGW || xgHistoryData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    if (!bootstrapData?.events) {
      return [];
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12); // Show 12 gameweeks in dropdown
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, xgHistoryData?.lastFinishedGW]);

  // Reset gameweek range when view mode changes
  useEffect(() => {
    if ((viewMode === "past" || viewMode === "pastXg") && (historyData?.lastFinishedGW || xgHistoryData?.lastFinishedGW || bootstrapData?.events)) {
      const lastFinished = historyData?.lastFinishedGW || xgHistoryData?.lastFinishedGW || 24;
      const startGW = Math.max(1, lastFinished - 5);
      setStartGameweek(startGW);
      setEndGameweek(lastFinished);
      setExcludedGameweeks(new Set());
      setInitialized(true);
    } else if (viewMode === "future" && bootstrapData?.events) {
      const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      const start = parseInt(range.startGameweek);
      const end = parseInt(range.endGameweek);
      if (start > 0 && end > 0 && start <= end && end <= 38) {
        setStartGameweek(start);
        setEndGameweek(end);
        setExcludedGameweeks(new Set());
        setInitialized(true);
      }
    }
  }, [viewMode, bootstrapData?.events, historyData?.lastFinishedGW, xgHistoryData?.lastFinishedGW]);

  // One-time initialization when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks); 
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
    throwOnError: false, // Don't throw errors, handle gracefully
    enabled: viewMode === "future"
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

  // Helper to normalize position strings for filtering
  const normalizePosition = (pos: string): string => {
    if (!pos) return '';
    const upper = pos.toUpperCase();
    if (upper === 'DEF' || upper.startsWith('DEFEND')) return 'Defender';
    if (upper === 'MID' || upper.startsWith('MIDFIEL')) return 'Midfielder';
    if (upper === 'FWD' || upper.startsWith('FORWARD')) return 'Forward';
    if (upper === 'GKP' || upper.startsWith('GOALK')) return 'Goalkeeper';
    return pos;
  };

  // Helper to get adjusted total for a player
  const getAdjustedTotal = (player: PlayerGoalProjection, gameweeks: number[]) => {
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const gwMultipliers = applyAvailability 
      ? getGameweekMultipliers(playerInfo, gameweeks, currentGameweek, bootstrapData)
      : {};
    let total = 0;
    gameweeks.forEach(gw => {
      const val = player.gameweekProjections[gw.toString()] || 0;
      const mult = gwMultipliers[gw] ?? 1;
      total += val * mult;
    });
    return total;
  };

  // Transform data based on view mode
  const displayData = useMemo(() => {
    if (viewMode === "past" && historyData?.players) {
      return historyData.players.map(player => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
        teamShort: player.teamShort,
        position: player.position,
        totalProjectedGoals: player.totalGoals,
        gameweekProjections: Object.fromEntries(
          Object.entries(player.gameweekGoals).map(([gw, goals]) => [gw, goals])
        ),
        goalShare: 0
      }));
    }
    if (viewMode === "pastXg" && xgHistoryData?.players) {
      return xgHistoryData.players.map(player => ({
        playerId: player.id,
        playerName: player.name,
        teamName: player.teamName,
        teamShort: player.teamShort,
        position: player.position,
        totalProjectedGoals: player.totalXg,
        gameweekProjections: Object.fromEntries(
          Object.entries(player.gameweekXg).map(([gw, xg]) => [gw, xg])
        ),
        goalShare: 0
      }));
    }
    return playerGoalData || [];
  }, [viewMode, historyData, xgHistoryData, playerGoalData]);

  // Filter and sort data
  const filteredProjections = useMemo(() => {
    if (!displayData.length) return [];

    return displayData
      .filter(player => {
        // Position filter - exclude semantics (set contains excluded positions)
        if (selectedPositions.size > 0) {
          const normalizedPos = normalizePosition(player.position);
          const excluded = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
          if (excluded) return false;
        }
        if (selectedTeams.size > 0 && !selectedTeams.has(player.teamShort)) return false;
        if (searchQuery && player.playerName && !player.playerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
          const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
          const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
          const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
          const aValue = (a.gameweekProjections[gwNumber.toString()] || 0) * (aMultipliers[gwNumber] ?? 1);
          const bValue = (b.gameweekProjections[gwNumber.toString()] || 0) * (bMultipliers[gwNumber] ?? 1);
          return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
        }
        
        const multiplier = sortDirection === 'desc' ? 1 : -1;
        
        switch (sortBy) {
          case "total": {
            // Sort by total goals in selected gameweeks (with availability adjustment)
            const aPeriodTotal = getAdjustedTotal(a, selectedGameweeks);
            const bPeriodTotal = getAdjustedTotal(b, selectedGameweeks);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
          case "totalPoints": {
            // Sort by total points from goals in selected gameweeks (with availability adjustment)
            const aGoalsTotal = getAdjustedTotal(a, selectedGameweeks);
            const bGoalsTotal = getAdjustedTotal(b, selectedGameweeks);
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
            const aPeriodTotal = getAdjustedTotal(a, selectedGameweeks);
            const bPeriodTotal = getAdjustedTotal(b, selectedGameweeks);
            return (bPeriodTotal - aPeriodTotal) * multiplier;
          }
        }
      });
  }, [displayData, selectedTeams, selectedPositions, searchQuery, sortBy, sortDirection, selectedGameweeks, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData, viewMode]);

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

  // Format goals based on view mode - integers for past, decimals for future
  const formatGoals = (goals: number) => {
    if (viewMode === "past") {
      return goals.toString();
    }
    if (viewMode === "pastXg") {
      return goals.toFixed(1);
    }
    return goals.toFixed(1);
  };

  const formatPoints = (points: number) => {
    if (viewMode === "past") {
      return Math.round(points).toString();
    }
    return points.toFixed(1);
  };

  // Show loading only when actually needed (also when data is empty/loading)
  const isDataLoading = isLoading || 
    (viewMode === "future" && (playerGoalLoading || !playerGoalData || playerGoalData.length === 0)) ||
    (viewMode === "past" && historyLoading) ||
    (viewMode === "pastXg" && xgHistoryLoading);
  
  const getLoadingTitle = () => {
    if (viewMode === "future") return "Loading Goal Projections";
    if (viewMode === "pastXg") return "Loading Historical xG Data";
    return "Loading Historical Goals";
  };
  
  const getLoadingDescription = () => {
    if (viewMode === "future") return "Calculating projected goals for all players based on team projections and goal share...";
    if (viewMode === "pastXg") return "Loading expected goals (xG) data for players in past gameweeks...";
    return "Loading actual goals scored by players in past gameweeks...";
  };
  
  if (!initialized || !bootstrapData || isDataLoading) {
    return (
      <LoadingExperience
        variant="analysis"
        title={getLoadingTitle()}
        description={getLoadingDescription()}
        steps={[
          { text: viewMode === "future" ? "Loading team goal projections" : "Loading gameweek results", delay: "0s" },
          { text: viewMode === "future" ? "Analyzing player goal share percentages" : viewMode === "pastXg" ? "Aggregating player xG data" : "Aggregating player goals", delay: "0.2s" },
          { text: viewMode === "future" ? "Computing individual player projections" : "Preparing data display", delay: "0.4s" },
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
      {initialized && (isLoading || playerGoalLoading || historyLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="overlay-loading-goals">
          <LoadingExperience
            variant="analysis"
            title={viewMode === "future" ? "Updating Goal Projections" : "Updating Historical Goals"}
            description={viewMode === "future" 
              ? "Recalculating projected goals for the selected gameweek range..."
              : "Loading actual goals scored in the selected gameweek range..."}
            steps={[
              { text: viewMode === "future" ? "Loading team goal projections" : "Loading gameweek results", delay: "0s" },
              { text: viewMode === "future" ? "Updating player goal shares" : "Aggregating player goals", delay: "0.2s" },
              { text: viewMode === "future" ? "Computing player projections" : "Preparing data display", delay: "0.4s" },
            ]}
          />
        </div>
      )}
      
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Target className="h-8 w-8" />
            <h1>{viewMode === "future" ? "Player Goal Projections" : viewMode === "pastXg" ? "Player xG History" : "Player Goals Scored"}</h1>
          </div>
          <p className="fpl-page-subtitle">
            {viewMode === "future" 
              ? "Projected Goals for each player across all upcoming fixtures"
              : viewMode === "pastXg"
                ? "Expected Goals (xG) for each player in past gameweeks"
                : "Actual goals scored by each player in past gameweeks"}
          </p>
          {/* Past/Future Toggle */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={viewMode === "past" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("past")}
              className={`flex items-center gap-1.5 ${viewMode === "past" ? "bg-orange-600 hover:bg-orange-700 text-white" : "text-gray-600"}`}
            >
              <History className="h-4 w-4" />
              Past GW Goals
            </Button>
            <Button
              variant={viewMode === "pastXg" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("pastXg")}
              className={`flex items-center gap-1.5 ${viewMode === "pastXg" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
            >
              <History className="h-4 w-4" />
              Past GW xG
            </Button>
            <Button
              variant={viewMode === "future" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("future")}
              className={`flex items-center gap-1.5 ${viewMode === "future" ? "bg-orange-600 hover:bg-orange-700 text-white" : "text-gray-600"}`}
            >
              <Calendar className="h-4 w-4" />
              Future GW Projections
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Controls */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-4 md:mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base sm:text-lg">Filters & Controls</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFiltersOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">From GW</label>
                <Select value={startGameweek?.toString() || ""} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">To GW</label>
                <Select value={endGameweek?.toString() || ""} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => !startGameweek || gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 lg:col-span-2 xl:col-span-4">
                <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  Search
                </label>
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-search-players"
                />
              </div>
            </div>

            <Tabs defaultValue="gws" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Gameweeks</span><span className="sm:hidden">GWs</span>{excludedGameweeks.size > 0 && ` (${excludedGameweeks.size})`}
                </TabsTrigger>
                <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Position</span><span className="sm:hidden">Pos</span>{selectedPositions.size > 0 && ` (${selectedPositions.size})`}
                </TabsTrigger>
                <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gws" className="mt-0">
                <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                  <button
                    onClick={() => setApplyAvailability(!applyAvailability)}
                    className={`inline-flex items-center gap-1 rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${applyAvailability ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                  >
                    Avail: {applyAvailability ? 'ON' : 'OFF'}
                  </button>
                  {excludedGameweeks.size > 0 && (
                    <button onClick={clearExclusions} className="inline-flex items-center gap-0.5 rounded text-[11px] font-medium px-1.5 py-px leading-none cursor-pointer text-gray-500 hover:text-gray-700">
                      <X className="h-2.5 w-2.5" />Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {availableGameweeks.filter(gw => startGameweek && endGameweek && gw >= startGameweek && gw <= endGameweek).map(gw => {
                    const isExcluded = excludedGameweeks.has(gw);
                    return (
                      <button key={gw} onClick={() => toggleGameweekExclusion(gw)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isExcluded ? 'bg-gray-100 text-gray-400 line-through border-gray-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}
                      >GW{gw}</button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="pos" className="mt-0">
                <div className="flex justify-end gap-1 mb-1">
                  <button onClick={() => setSelectedPositions(new Set())} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">All</button>
                  <button onClick={() => setSelectedPositions(new Set(['GKP','DEF','MID','FWD']))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-red-50 text-red-700 border-red-300">None</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {['GKP','DEF','MID','FWD'].map(pos => {
                    const isIncluded = !selectedPositions.has(pos);
                    return (
                      <button key={pos} onClick={() => togglePositionSelection(pos)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isIncluded ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-gray-100 text-gray-400 line-through border-gray-300'}`}
                      >{pos}</button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="teams" className="mt-0">
                <div className="flex justify-end gap-1 mb-1">
                  <button onClick={() => setSelectedTeams(new Set())} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">All</button>
                  <button onClick={() => setSelectedTeams(new Set(teams.map(t => t.short)))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-red-50 text-red-700 border-red-300">None</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {teams.map(team => {
                    const shortName = team.short;
                    const isIncluded = !selectedTeams.has(shortName);
                    return (
                      <button key={shortName} onClick={() => toggleTeamSelection(shortName)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isIncluded ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-400 line-through border-gray-300'}`}
                      >{shortName}</button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>


        {/* Main Content */}
        <div className="w-full">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Player Goal Projections: GW{startGameweek}-GW{endGameweek}
                    {excludedGameweeks.size > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {excludedGameweeks.size} excluded
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    onClick={handleRefreshData}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    data-testid="button-refresh-data"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-1 md:px-3 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[56px] md:min-w-[80px]">
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
                      <th key={gw} className="px-1 py-2 md:py-3 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[40px] md:min-w-[50px]">
                        <div className="flex items-center justify-center gap-1" onClick={() => handleSort(`gw${gw}`)}>
                          {gw}
                          {sortBy === `gw${gw}` && (
                            sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                          )}
                          {sortBy !== `gw${gw}` && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </div>
                      </th>
                    ))}
                    <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100 transition-colors w-12 md:w-auto md:min-w-[56px] sticky right-0 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center justify-center gap-1" onClick={() => handleSort("total")}>
                        {viewMode === "pastXg" ? "xG" : "Goals"}
                        {sortBy === "total" && (
                          sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                        )}
                        {sortBy !== "total" && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjections.map((player, index) => {
                    const playerInfo = playerAvailabilityMap?.get(player.playerId);
                    const gwMultipliers = applyAvailability 
                      ? getGameweekMultipliers(playerInfo, selectedGameweeks, currentGameweek, bootstrapData)
                      : {};
                    const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                    
                    let adjustedTotal = 0;
                    let originalTotal = 0;
                    selectedGameweeks.forEach(gw => {
                      const val = player.gameweekProjections[gw.toString()] || 0;
                      const mult = gwMultipliers[gw] ?? 1;
                      adjustedTotal += val * mult;
                      originalTotal += val;
                    });
                    const totalPoints = getPointsFromGoals(adjustedTotal, player.position);
                    const originalTotalPoints = getPointsFromGoals(originalTotal, player.position);
                    
                    return (
                      <tr key={player.playerId} className="hover:bg-gray-50">
                        <td className="px-1 md:px-3 py-2 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[56px] md:min-w-[80px]">
                          <div className="flex items-center gap-0.5 flex-wrap">
                            <PlayerNameCell 
                              name={(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}
                              position={player.position}
                              team={player.teamShort}
                              compact={true}
                              className="text-xs md:text-sm"
                            />
                            {playerAvailabilityMap && playerAvailabilityMap.get(player.playerId) && (
                              <PlayerAvailabilityBadge player={playerAvailabilityMap.get(player.playerId)!} />
                            )}
                          </div>
                        </td>
                        {selectedGameweeks.map(gw => {
                          const goals = player.gameweekProjections[gw.toString()] || 0;
                          const fixtures: FixtureDetail[] = (player as any).fixtureDetails?.[gw.toString()] || [];
                          const isDGW = fixtures.length > 1;
                          const multiplier = gwMultipliers[gw] ?? 1;
                          const displayGoals = goals * multiplier;
                          const hasGwAdjustment = applyAvailability && multiplier !== 1;
                          const opponentInfo = opponentMap.get(`${player.teamShort}-${gw}`);
                          const opponent = opponentInfo?.opponent || 'TBD';
                          const isHome = opponentInfo?.isHome ?? true;
                          
                          return (
                            <td key={gw} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium min-w-[40px] md:min-w-[50px]">
                              <div>
                                {isDGW && viewMode === "future" ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                        {hasGwAdjustment && goals > 0 ? (
                                          <div className="flex flex-col items-center">
                                            <span className="font-bold text-purple-700">{formatGoals(displayGoals)}</span>
                                            <span className="text-gray-400 line-through text-xs">{formatGoals(goals)}</span>
                                          </div>
                                        ) : (
                                          <span className="font-bold text-gray-900">{formatGoals(goals)}</span>
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                      <div className="text-xs font-semibold mb-2">GW{gw} Fixture Breakdown</div>
                                      {fixtures.map((f, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                          <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                            {f.opponent} ({f.isHome ? 'H' : 'A'})
                                          </span>
                                          <span className="font-medium text-xs">{formatGoals(f.goals * multiplier)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                        <span>Total</span>
                                        <span>{formatGoals(displayGoals)}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : hasGwAdjustment && goals > 0 && viewMode === "future" ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-bold text-purple-700">{formatGoals(displayGoals)}</span>
                                    <span className="text-gray-400 line-through text-xs">{formatGoals(goals)}</span>
                                  </div>
                                ) : (
                                  <div className="font-bold text-gray-900">
                                    {goals > 0 ? formatGoals(goals) : "-"}
                                  </div>
                                )}
                                {showOpponent && !isDGW && (
                                  <div className={`text-xs ${isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                    {opponent} ({isHome ? 'H' : 'A'})
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className={`px-1 md:px-3 py-2 md:py-4 text-center w-12 md:w-auto md:min-w-[56px] border-l border-gray-300 sticky right-0 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${hasAnyAdjustment && viewMode === "future" ? 'bg-purple-50' : 'bg-orange-50'}`}>
                          {hasAnyAdjustment && viewMode === "future" ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm md:text-lg font-bold text-purple-700">{formatGoals(adjustedTotal)}</span>
                              <span className="text-gray-400 line-through text-[10px] md:text-xs">{formatGoals(originalTotal)}</span>
                            </div>
                          ) : (
                            <span className="text-sm md:text-lg font-bold text-orange-900">{formatGoals(adjustedTotal)}</span>
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
                        {(totalGoals.gameweekTotals[gw] || 0) > 0 ? formatGoals(totalGoals.gameweekTotals[gw] || 0) : "-"}
                      </td>
                    ))}
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center bg-orange-100 w-12 md:w-auto border-l border-gray-300 sticky right-0 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      <span className="text-lg font-bold text-orange-900">
                        {formatGoals(totalGoals.overallTotal)}
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
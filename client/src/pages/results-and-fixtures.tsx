import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Trophy, Target, Home, Plane, ArrowUpDown, ArrowUp, ArrowDown, X, User, Shield, Star, Zap, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Fixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string;
  finished: boolean;
  team_h_score?: number;
  team_a_score?: number;
  minutes?: number;
  started?: boolean;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

interface PlayerStats {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  ict_index: number;
  total_points: number;
}

interface MatchStats {
  fixture: any;
  homeTeamStats: PlayerStats[];
  awayTeamStats: PlayerStats[];
}

export default function ResultsAndFixtures() {
  const [selectedGameweek, setSelectedGameweek] = useState<"all" | number>(5);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isPlayerStatsOpen, setIsPlayerStatsOpen] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [isLoadingMatchStats, setIsLoadingMatchStats] = useState(false);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData, isLoading: isLoadingFixtures } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Get available gameweeks
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) return [];
    return bootstrapData.events
      .map(event => event.id)
      .sort((a, b) => a - b);
  }, [bootstrapData]);

  // Navigation functions for gameweek
  const handlePreviousGameweek = () => {
    if (selectedGameweek === "all") return;
    const currentIndex = availableGameweeks.indexOf(selectedGameweek as number);
    if (currentIndex > 0) {
      setSelectedGameweek(availableGameweeks[currentIndex - 1]);
    }
  };

  const handleNextGameweek = () => {
    if (selectedGameweek === "all") return;
    const currentIndex = availableGameweeks.indexOf(selectedGameweek as number);
    if (currentIndex < availableGameweeks.length - 1) {
      setSelectedGameweek(availableGameweeks[currentIndex + 1]);
    }
  };

  // Get current gameweek for context
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 5;
    const currentEvent = bootstrapData.events.find(event => event.is_current);
    return currentEvent ? currentEvent.id : 5;
  }, [bootstrapData]);

  // Update selected gameweek to current gameweek when data loads
  useEffect(() => {
    if (bootstrapData?.events && currentGameweek) {
      setSelectedGameweek(currentGameweek);
    }
  }, [bootstrapData, currentGameweek]);

  // Process fixtures data
  const processedFixtures = useMemo(() => {
    if (!fixturesData || !bootstrapData?.teams) return [];

    return fixturesData.map(fixture => {
      const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
      
      return {
        ...fixture,
        homeTeam,
        awayTeam,
        isResult: fixture.finished,
        isUpcoming: !fixture.finished && !fixture.started,
        isLive: fixture.started && !fixture.finished,
      };
    });
  }, [fixturesData, bootstrapData]);

  // Filter fixtures based on selected gameweek
  const filteredFixtures = useMemo(() => {
    let filtered = processedFixtures;

    // Filter by gameweek
    if (selectedGameweek !== "all") {
      filtered = filtered.filter(f => f.event === selectedGameweek);
    }

    // Sort by gameweek and kickoff time
    return filtered.sort((a, b) => {
      if (a.event !== b.event) {
        return a.event - b.event;
      }
      // Secondary sort by date within gameweek
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    });
  }, [processedFixtures, selectedGameweek]);

  // Group fixtures by gameweek for organized display
  const fixturesByGameweek = useMemo(() => {
    const grouped: Record<number, typeof filteredFixtures> = {};
    
    filteredFixtures.forEach(fixture => {
      if (!grouped[fixture.event]) {
        grouped[fixture.event] = [];
      }
      grouped[fixture.event].push(fixture);
    });

    return Object.entries(grouped)
      .map(([gw, fixtures]) => ({
        gameweek: parseInt(gw),
        fixtures: fixtures.sort((a, b) => 
          new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
        )
      }))
      .sort((a, b) => a.gameweek - b.gameweek);
  }, [filteredFixtures]);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  // Fetch match statistics for a specific fixture
  const fetchMatchStats = async (fixture: any, isBackgroundUpdate = false) => {
    if (!fixture.isResult && !fixture.isLive) return null;
    
    if (!isBackgroundUpdate) {
      setIsLoadingMatchStats(true);
    } else {
      setIsBackgroundRefresh(true);
    }
    try {
      // Get all players from both teams
      const homeTeamPlayers = bootstrapData?.elements.filter(p => p.team === fixture.team_h) || [];
      const awayTeamPlayers = bootstrapData?.elements.filter(p => p.team === fixture.team_a) || [];
      
      // Fetch detailed stats for each player
      const [homeStats, awayStats] = await Promise.all([
        Promise.all(homeTeamPlayers.map(async (player: any) => {
          try {
            const response = await fetch(`/api/element-summary/${player.id}`);
            if (!response.ok) throw new Error('Failed to fetch player data');
            const data = await response.json();
            
            // Find the specific gameweek data
            const gameweekData = data.history?.find((h: any) => h.round === fixture.event);
            
            if (!gameweekData) return null;
            
            return {
              playerId: player.id,
              playerName: player.web_name,
              teamName: fixture.homeTeam?.short_name || 'Home',
              position: ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type] || 'Unknown',
              minutes: gameweekData.minutes || 0,
              goals_scored: gameweekData.goals_scored || 0,
              assists: gameweekData.assists || 0,
              clean_sheets: gameweekData.clean_sheets || 0,
              goals_conceded: gameweekData.goals_conceded || 0,
              own_goals: gameweekData.own_goals || 0,
              penalties_saved: gameweekData.penalties_saved || 0,
              penalties_missed: gameweekData.penalties_missed || 0,
              yellow_cards: gameweekData.yellow_cards || 0,
              red_cards: gameweekData.red_cards || 0,
              saves: gameweekData.saves || 0,
              bonus: gameweekData.bonus || 0,
              bps: gameweekData.bps || 0,
              influence: parseFloat(gameweekData.influence) || 0,
              creativity: parseFloat(gameweekData.creativity) || 0,
              threat: parseFloat(gameweekData.threat) || 0,
              ict_index: parseFloat(gameweekData.ict_index) || 0,
              total_points: gameweekData.total_points || 0
            };
          } catch (error) {
            console.error(`Error fetching data for player ${player.web_name}:`, error);
            return null;
          }
        })),
        Promise.all(awayTeamPlayers.map(async (player: any) => {
          try {
            const response = await fetch(`/api/element-summary/${player.id}`);
            if (!response.ok) throw new Error('Failed to fetch player data');
            const data = await response.json();
            
            // Find the specific gameweek data
            const gameweekData = data.history?.find((h: any) => h.round === fixture.event);
            
            if (!gameweekData) return null;
            
            return {
              playerId: player.id,
              playerName: player.web_name,
              teamName: fixture.awayTeam?.short_name || 'Away',
              position: ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type] || 'Unknown',
              minutes: gameweekData.minutes || 0,
              goals_scored: gameweekData.goals_scored || 0,
              assists: gameweekData.assists || 0,
              clean_sheets: gameweekData.clean_sheets || 0,
              goals_conceded: gameweekData.goals_conceded || 0,
              own_goals: gameweekData.own_goals || 0,
              penalties_saved: gameweekData.penalties_saved || 0,
              penalties_missed: gameweekData.penalties_missed || 0,
              yellow_cards: gameweekData.yellow_cards || 0,
              red_cards: gameweekData.red_cards || 0,
              saves: gameweekData.saves || 0,
              bonus: gameweekData.bonus || 0,
              bps: gameweekData.bps || 0,
              influence: parseFloat(gameweekData.influence) || 0,
              creativity: parseFloat(gameweekData.creativity) || 0,
              threat: parseFloat(gameweekData.threat) || 0,
              ict_index: parseFloat(gameweekData.ict_index) || 0,
              total_points: gameweekData.total_points || 0
            };
          } catch (error) {
            console.error(`Error fetching data for player ${player.web_name}:`, error);
            return null;
          }
        }))
      ]);
      
      // Type guard to filter out null results
      const isPlayerStats = (stat: PlayerStats | null): stat is PlayerStats => stat !== null;
      
      // Filter out null results and sort by total points
      const homeTeamStats = homeStats.filter(isPlayerStats).sort((a, b) => b.total_points - a.total_points);
      const awayTeamStats = awayStats.filter(isPlayerStats).sort((a, b) => b.total_points - a.total_points);
      
      return {
        fixture,
        homeTeamStats,
        awayTeamStats
      };
    } catch (error) {
      console.error('Error fetching match stats:', error);
      return null;
    } finally {
      if (!isBackgroundUpdate) {
        setIsLoadingMatchStats(false);
      } else {
        setIsBackgroundRefresh(false);
      }
    }
  };

  // Handle match click for player stats
  const handleMatchClick = async (fixture: any) => {
    if (!fixture.isResult && !fixture.isLive) return; // Allow clicks on completed and live matches
    
    setSelectedMatch(fixture);
    setIsPlayerStatsOpen(true);
    
    const stats = await fetchMatchStats(fixture);
    setMatchStats(stats);
  };

  // Auto-refresh player stats for live matches
  useEffect(() => {
    // Clear any existing interval
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }

    // Only set up auto-refresh if viewing a live match
    if (isPlayerStatsOpen && selectedMatch && selectedMatch.isLive) {
      const intervalId = setInterval(async () => {
        // Check if match is still live before refreshing
        const currentFixture = processedFixtures.find(f => f.id === selectedMatch.id);
        if (currentFixture && currentFixture.isLive) {
          const stats = await fetchMatchStats(selectedMatch, true);
          if (stats) {
            setMatchStats(stats);
          }
        } else {
          // Match is no longer live, clear interval
          if (autoRefreshIntervalRef.current) {
            clearInterval(autoRefreshIntervalRef.current);
            autoRefreshIntervalRef.current = null;
          }
        }
      }, 30000); // Refresh every 30 seconds

      autoRefreshIntervalRef.current = intervalId;
    }

    // Cleanup function
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [isPlayerStatsOpen, selectedMatch, processedFixtures]);

  // Get match status badge
  const getStatusBadge = (fixture: any) => {
    if (fixture.isResult) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">FT</Badge>;
    } else if (fixture.isLive) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800 animate-pulse">LIVE</Badge>;
    } else {
      const { time } = formatDateTime(fixture.kickoff_time);
      return <Badge variant="outline" className="text-gray-600">{time}</Badge>;
    }
  };


  // Statistics
  const stats = useMemo(() => {
    const completed = processedFixtures.filter(f => f.isResult).length;
    const upcoming = processedFixtures.filter(f => f.isUpcoming).length;
    const live = processedFixtures.filter(f => f.isLive).length;
    
    return {
      total: processedFixtures.length,
      completed,
      upcoming,
      live,
      currentGW: currentGameweek
    };
  }, [processedFixtures, currentGameweek]);

  if (isLoadingBootstrap || isLoadingFixtures) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-title">
            <Calendar className="h-8 w-8" />
            <h1>Results and Fixtures</h1>
          </div>
          <p className="fpl-page-subtitle">
            Complete Premier League schedule with results and upcoming fixtures
          </p>
        </div>
        <div className="fpl-section-spacing">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Calendar className="h-8 w-8" />
          <h1>Results and Fixtures</h1>
        </div>
        <p className="fpl-page-subtitle">
          Complete Premier League schedule with results and upcoming fixtures
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs sm:text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.live}</div>
              <div className="text-xs sm:text-sm text-gray-600">Live</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-600">{stats.upcoming}</div>
              <div className="text-xs sm:text-sm text-gray-600">Upcoming</div>
            </CardContent>
          </Card>
        </div>

        {/* Gameweek Navigation */}
        <div className="fpl-filters">
          <div className="fpl-card-content">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviousGameweek()}
                disabled={selectedGameweek === "all" || selectedGameweek === Math.min(...availableGameweeks)}
                className="px-2 sm:px-3 min-w-[44px]"
                data-testid="button-previous-gameweek"
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              <Select value={selectedGameweek.toString()} onValueChange={(value) => 
                setSelectedGameweek(value === "all" ? "all" : parseInt(value))
              }>
                <SelectTrigger data-testid="select-gameweek" className="w-32 sm:w-48">
                  <SelectValue placeholder="All Gameweeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gameweeks</SelectItem>
                  {availableGameweeks.map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>
                      GW{gw} {gw === currentGameweek ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNextGameweek()}
                disabled={selectedGameweek === "all" || selectedGameweek === Math.max(...availableGameweeks)}
                className="px-2 sm:px-3 min-w-[44px]"
                data-testid="button-next-gameweek"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="fpl-table-container">
          <div className="fpl-card-header">
            <div className="fpl-card-title">
              <Trophy className="h-5 w-5 text-blue-600" />
              {selectedGameweek === "all" 
                ? `All Gameweeks (${filteredFixtures.length} matches)`
                : `Gameweek ${selectedGameweek} (${filteredFixtures.length} matches)`
              }
            </div>
          </div>
          <div className="fpl-card-content">
            {selectedGameweek === "all" ? (
              // Grouped by gameweek view
              <div className="space-y-6">
                {fixturesByGameweek.map(({ gameweek, fixtures }) => (
                  <div key={gameweek} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Gameweek {gameweek}
                        {gameweek === currentGameweek && (
                          <Badge variant="outline" className="ml-2 text-blue-600">Current</Badge>
                        )}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {fixtures.length} match{fixtures.length !== 1 ? "es" : ""}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      {fixtures.map((fixture) => (
                        <div 
                          key={fixture.id} 
                          className={`p-3 bg-gray-50 rounded-lg transition-colors ${
                            (fixture.isResult || fixture.isLive)
                              ? 'hover:bg-blue-50 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => (fixture.isResult || fixture.isLive) && handleMatchClick(fixture)}
                          title={(fixture.isResult || fixture.isLive) ? 'Click to view match statistics' : ''}
                        >
                          {/* Mobile layout: stacked */}
                          <div className="flex flex-col space-y-2 md:hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                {fixture.homeTeam?.code ? (
                                  <img 
                                    src={fixture.homeTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.homeTeam.code}.png`}
                                    alt={`${fixture.homeTeam.short_name} badge`}
                                    className="w-4 h-4 object-contain shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Home className="h-3 w-3 text-blue-500 shrink-0" />}
                                <span className="font-medium text-gray-900 text-sm truncate">
                                  {fixture.homeTeam?.short_name || "TBD"}
                                </span>
                              </div>
                              {fixture.isResult && (
                                <span className="text-lg font-bold text-gray-900 mx-2 shrink-0">
                                  {fixture.team_h_score}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                {fixture.awayTeam?.code ? (
                                  <img 
                                    src={fixture.awayTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.awayTeam.code}.png`}
                                    alt={`${fixture.awayTeam.short_name} badge`}
                                    className="w-4 h-4 object-contain shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Plane className="h-3 w-3 text-gray-500 shrink-0" />}
                                <span className="font-medium text-gray-900 text-sm truncate">
                                  {fixture.awayTeam?.short_name || "TBD"}
                                </span>
                              </div>
                              {fixture.isResult && (
                                <span className="text-lg font-bold text-gray-900 mx-2 shrink-0">
                                  {fixture.team_a_score}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                              <div className="flex items-center space-x-2">
                                {!fixture.isResult && (
                                  <span className="text-xs text-gray-600">
                                    {formatDateTime(fixture.kickoff_time).time}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {formatDateTime(fixture.kickoff_time).date}
                                </span>
                                {getStatusBadge(fixture)}
                              </div>
                              
                            </div>
                          </div>
                          
                          {/* Desktop layout: horizontal */}
                          <div className="hidden md:flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              {/* Home Team */}
                              <div className="flex items-center space-x-2 min-w-[120px]">
                                <div className="text-right flex-1">
                                  <span className="font-medium text-gray-900">
                                    {fixture.homeTeam?.short_name || "TBD"}
                                  </span>
                                </div>
                                {fixture.homeTeam?.code ? (
                                  <img 
                                    src={fixture.homeTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.homeTeam.code}.png`}
                                    alt={`${fixture.homeTeam.short_name} badge`}
                                    className="w-5 h-5 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Home className="h-3 w-3 text-blue-500" />}
                              </div>

                              {/* Score or Time */}
                              <div className="flex items-center justify-center min-w-[80px]">
                                {fixture.isResult ? (
                                  <span className="text-lg font-bold text-gray-900">
                                    {fixture.team_h_score} - {fixture.team_a_score}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-600">
                                    {formatDateTime(fixture.kickoff_time).time}
                                  </span>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center space-x-2 min-w-[120px]">
                                {fixture.awayTeam?.code ? (
                                  <img 
                                    src={fixture.awayTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.awayTeam.code}.png`}
                                    alt={`${fixture.awayTeam.short_name} badge`}
                                    className="w-5 h-5 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Plane className="h-3 w-3 text-gray-500" />}
                                <div className="flex-1">
                                  <span className="font-medium text-gray-900">
                                    {fixture.awayTeam?.short_name || "TBD"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Date */}
                              <span className="text-xs text-gray-500 min-w-[60px]">
                                {formatDateTime(fixture.kickoff_time).date}
                              </span>
                              
                              {/* Status */}
                              {getStatusBadge(fixture)}
                              
                              {/* Click indicator for completed and live matches */}
                              {(fixture.isResult || fixture.isLive) && (
                                <Badge variant="outline" className="text-xs text-blue-600 opacity-70">
                                  Player Stats
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Single gameweek view
              <div className="grid gap-2">
                {filteredFixtures.map((fixture) => (
                  <div 
                    key={fixture.id} 
                    className={`p-3 sm:p-4 bg-white border rounded-lg transition-all ${
                      (fixture.isResult || fixture.isLive)
                        ? 'hover:shadow-md cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 hover:bg-blue-50' 
                        : 'hover:shadow-sm'
                    }`}
                    onClick={() => (fixture.isResult || fixture.isLive) && handleMatchClick(fixture)}
                    title={(fixture.isResult || fixture.isLive) ? 'Click to view match statistics' : ''}
                  >
                    {/* Mobile layout: stacked */}
                    <div className="flex flex-col space-y-2 md:hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Home className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {fixture.homeTeam?.short_name || "TBD"}
                          </span>
                        </div>
                        {fixture.isResult && (
                          <span className="text-xl font-bold text-gray-900 mx-2 shrink-0">
                            {fixture.team_h_score}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Plane className="h-3 w-3 text-gray-500 shrink-0" />
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {fixture.awayTeam?.short_name || "TBD"}
                          </span>
                        </div>
                        {fixture.isResult && (
                          <span className="text-xl font-bold text-gray-900 mx-2 shrink-0">
                            {fixture.team_a_score}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          {!fixture.isResult && (
                            <>
                              <span className="text-xs text-gray-600">
                                {formatDateTime(fixture.kickoff_time).time}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(fixture.kickoff_time).date}
                              </span>
                            </>
                          )}
                          {getStatusBadge(fixture)}
                        </div>
                        
                      </div>
                    </div>
                    
                    {/* Desktop layout: horizontal */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center space-x-6 flex-1">
                        {/* Home Team */}
                        <div className="flex items-center space-x-3 min-w-[140px]">
                          <div className="text-right flex-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {fixture.homeTeam?.name || "TBD"}
                            </span>
                          </div>
                          <Home className="h-4 w-4 text-blue-500" />
                        </div>

                        {/* Score or Time */}
                        <div className="flex items-center justify-center min-w-[100px]">
                          {fixture.isResult ? (
                            <span className="text-xl font-bold text-gray-900">
                              {fixture.team_h_score} - {fixture.team_a_score}
                            </span>
                          ) : (
                            <div className="text-center">
                              <div className="text-sm text-gray-600">
                                {formatDateTime(fixture.kickoff_time).time}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDateTime(fixture.kickoff_time).date}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center space-x-3 min-w-[140px]">
                          <Plane className="h-4 w-4 text-gray-500" />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {fixture.awayTeam?.name || "TBD"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Status */}
                        {getStatusBadge(fixture)}
                        
                        {/* Click indicator for completed and live matches */}
                        {(fixture.isResult || fixture.isLive) && (
                          <Badge variant="outline" className="text-xs text-blue-600 opacity-70">
                            Player Stats
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredFixtures.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            )}
          </div>
        </div>

        {/* Player Statistics Modal */}
        <Dialog open={isPlayerStatsOpen} onOpenChange={setIsPlayerStatsOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600 shrink-0" />
                  <span className="text-base sm:text-lg">Match Statistics</span>
                </div>
                {selectedMatch && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm sm:text-base font-medium">
                      {selectedMatch.homeTeam?.short_name} {selectedMatch.team_h_score} - {selectedMatch.team_a_score} {selectedMatch.awayTeam?.short_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-fit text-xs">
                        GW{selectedMatch.event} - {formatDateTime(selectedMatch.kickoff_time).date}
                      </Badge>
                      {selectedMatch.isLive && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 animate-pulse text-xs">
                          LIVE - Auto-updating every 30s
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingMatchStats ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading match statistics...</span>
              </div>
            ) : matchStats ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Match Summary */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-900 text-white rounded-lg">
                  <div className="text-center">
                    <div className="text-sm sm:text-base md:text-lg font-bold truncate max-w-[140px] sm:max-w-none">
                      {selectedMatch?.homeTeam?.name}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold px-4 sm:px-6 py-1 sm:py-2 bg-gray-800 rounded-lg">
                      {selectedMatch?.team_h_score} - {selectedMatch?.team_a_score}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm sm:text-base md:text-lg font-bold truncate max-w-[140px] sm:max-w-none">
                      {selectedMatch?.awayTeam?.name}
                    </div>
                  </div>
                </div>

                {/* Categorized Player Statistics */}
                <div className="space-y-2 sm:space-y-3">
                  {/* Goals Scored Section */}
                  {(() => {
                    const homeGoalScorers = matchStats.homeTeamStats.filter(p => p.goals_scored > 0).sort((a, b) => b.goals_scored - a.goals_scored);
                    const awayGoalScorers = matchStats.awayTeamStats.filter(p => p.goals_scored > 0).sort((a, b) => b.goals_scored - a.goals_scored);
                    if (homeGoalScorers.length === 0 && awayGoalScorers.length === 0) return null;
                    
                    const getGoalPoints = (goals: number, position: string) => {
                      if (position === 'FWD') return goals * 4;
                      if (position === 'MID') return goals * 5;
                      if (position === 'DEF') return goals * 6;
                      if (position === 'GKP') return goals * 6;
                      return goals * 4;
                    };
                    
                    return (
                      <div>
                        <div className="bg-gray-700 text-white text-center py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold">
                          Goals scored
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 px-2 sm:px-4">
                          <div className="space-y-1">
                            {homeGoalScorers.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  +{getGoalPoints(player.goals_scored, player.position)}
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName} {player.goals_scored > 1 ? `(${player.goals_scored})` : ''}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {awayGoalScorers.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  +{getGoalPoints(player.goals_scored, player.position)}
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName} {player.goals_scored > 1 ? `(${player.goals_scored})` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Assists Section */}
                  {(() => {
                    const homeAssistProviders = matchStats.homeTeamStats.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists);
                    const awayAssistProviders = matchStats.awayTeamStats.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists);
                    if (homeAssistProviders.length === 0 && awayAssistProviders.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-700 text-white text-center py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold">
                          Assists
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 px-2 sm:px-4">
                          <div className="space-y-1">
                            {homeAssistProviders.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  +{player.assists * 3}
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName} {player.assists > 1 ? `(${player.assists})` : ''}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {awayAssistProviders.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  +{player.assists * 3}
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName} {player.assists > 1 ? `(${player.assists})` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Yellow Cards Section */}
                  {(() => {
                    const homeYellowCards = matchStats.homeTeamStats.filter(p => p.yellow_cards > 0);
                    const awayYellowCards = matchStats.awayTeamStats.filter(p => p.yellow_cards > 0);
                    if (homeYellowCards.length === 0 && awayYellowCards.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-700 text-white text-center py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold">
                          Yellow cards
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 px-2 sm:px-4">
                          <div className="space-y-1">
                            {homeYellowCards.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-red-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  -1
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {awayYellowCards.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-red-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  -1
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Red Cards Section */}
                  {(() => {
                    const homeRedCards = matchStats.homeTeamStats.filter(p => p.red_cards > 0);
                    const awayRedCards = matchStats.awayTeamStats.filter(p => p.red_cards > 0);
                    if (homeRedCards.length === 0 && awayRedCards.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-700 text-white text-center py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold">
                          Red cards
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 px-2 sm:px-4">
                          <div className="space-y-1">
                            {homeRedCards.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-red-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  -3
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {awayRedCards.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-red-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  -3
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Saves Section */}
                  {(() => {
                    const homeSaves = matchStats.homeTeamStats.filter(p => p.saves > 0).sort((a, b) => b.saves - a.saves);
                    const awaySaves = matchStats.awayTeamStats.filter(p => p.saves > 0).sort((a, b) => b.saves - a.saves);
                    if (homeSaves.length === 0 && awaySaves.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-700 text-white text-center py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold">
                          Saves
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 px-2 sm:px-4">
                          <div className="space-y-1">
                            {homeSaves.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  +{Math.floor(player.saves / 3)}
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName} ({player.saves})</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {awaySaves.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                  +{Math.floor(player.saves / 3)}
                                </span>
                                <span className="text-xs sm:text-sm truncate">{player.playerName} ({player.saves})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bonus Points System Section */}
                  {(() => {
                    const homeBPS = matchStats.homeTeamStats.filter(p => p.bps > 0).sort((a, b) => b.bps - a.bps).slice(0, 10);
                    const awayBPS = matchStats.awayTeamStats.filter(p => p.bps > 0).sort((a, b) => b.bps - a.bps).slice(0, 10);
                    if (homeBPS.length === 0 && awayBPS.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-700 text-white text-center py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold">
                          Bonus Points System
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 px-2 sm:px-4">
                          <div className="space-y-1">
                            {homeBPS.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                {player.bonus > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                    +{player.bonus}
                                  </span>
                                )}
                                <span className="text-xs sm:text-sm truncate">{player.playerName} ({player.bps})</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {awayBPS.map((player) => (
                              <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                {player.bonus > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                    +{player.bonus}
                                  </span>
                                )}
                                <span className="text-xs sm:text-sm truncate">{player.playerName} ({player.bps})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Defensive Contributions Section */}
                  {(() => {
                    const homeDC = matchStats.homeTeamStats.filter(p => (p as any).defensive_contribution > 0).sort((a, b) => (b as any).defensive_contribution - (a as any).defensive_contribution).slice(0, 10);
                    const awayDC = matchStats.awayTeamStats.filter(p => (p as any).defensive_contribution > 0).sort((a, b) => (b as any).defensive_contribution - (a as any).defensive_contribution).slice(0, 10);
                    if (homeDC.length === 0 && awayDC.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-700 text-white text-center py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold">
                          Defensive Contributions
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 px-2 sm:px-4">
                          <div className="space-y-1">
                            {homeDC.map((player) => {
                              const dc = (player as any).defensive_contribution || 0;
                              const dcPoints = (player.position === 'DEF' || player.position === 'GKP') && dc >= 10 ? 2 : (player.position === 'MID' || player.position === 'FWD') && dc >= 12 ? 2 : 0;
                              return (
                                <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                  {dcPoints > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                      +{dcPoints}
                                    </span>
                                  )}
                                  <span className="text-xs sm:text-sm truncate">{player.playerName} ({dc})</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="space-y-1">
                            {awayDC.map((player) => {
                              const dc = (player as any).defensive_contribution || 0;
                              const dcPoints = (player.position === 'DEF' || player.position === 'GKP') && dc >= 10 ? 2 : (player.position === 'MID' || player.position === 'FWD') && dc >= 12 ? 2 : 0;
                              return (
                                <div key={player.playerId} className="flex items-center gap-1.5 sm:gap-2">
                                  {dcPoints > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 bg-green-500 text-white text-xs font-bold rounded px-1 shrink-0">
                                      +{dcPoints}
                                    </span>
                                  )}
                                  <span className="text-xs sm:text-sm truncate">{player.playerName} ({dc})</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No statistics available</h3>
                <p className="text-gray-600">Unable to load match statistics at this time.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

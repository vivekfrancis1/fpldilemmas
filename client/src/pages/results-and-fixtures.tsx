import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Trophy, Target, Home, Plane, ArrowUpDown, ArrowUp, ArrowDown, X, User, Shield, Star, Zap, Users } from "lucide-react";
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
  const [selectedGameweek, setSelectedGameweek] = useState<"all" | number>("all");
  const [viewMode, setViewMode] = useState<"results" | "fixtures" | "all">("all");
  const [sortBy, setSortBy] = useState<"gameweek" | "date" | "team">("gameweek");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isMatchStatsOpen, setIsMatchStatsOpen] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [isLoadingMatchStats, setIsLoadingMatchStats] = useState(false);
  const [isTeamStatsOpen, setIsTeamStatsOpen] = useState(false);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [isLoadingTeamStats, setIsLoadingTeamStats] = useState(false);
  const [isMatchTeamStatsOpen, setIsMatchTeamStatsOpen] = useState(false);
  const [matchTeamStats, setMatchTeamStats] = useState<any>(null);
  const [isLoadingMatchTeamStats, setIsLoadingMatchTeamStats] = useState(false);

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

  // Get current gameweek for context
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 1;
    const currentEvent = bootstrapData.events.find(event => event.is_current);
    return currentEvent ? currentEvent.id : 1;
  }, [bootstrapData]);

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

  // Filter fixtures based on selected gameweek and view mode
  const filteredFixtures = useMemo(() => {
    let filtered = processedFixtures;

    // Filter by gameweek
    if (selectedGameweek !== "all") {
      filtered = filtered.filter(f => f.event === selectedGameweek);
    }

    // Filter by view mode
    if (viewMode === "results") {
      filtered = filtered.filter(f => f.isResult);
    } else if (viewMode === "fixtures") {
      filtered = filtered.filter(f => f.isUpcoming || f.isLive);
    }

    // Sort fixtures
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "gameweek":
          if (a.event !== b.event) {
            return sortDirection === "asc" ? a.event - b.event : b.event - a.event;
          }
          // Secondary sort by date within gameweek
          return sortDirection === "asc" 
            ? new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
            : new Date(b.kickoff_time).getTime() - new Date(a.kickoff_time).getTime();
        case "date":
          return sortDirection === "asc" 
            ? new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
            : new Date(b.kickoff_time).getTime() - new Date(a.kickoff_time).getTime();
        case "team":
          const teamA = a.homeTeam?.short_name || "";
          const teamB = b.homeTeam?.short_name || "";
          return sortDirection === "asc" 
            ? teamA.localeCompare(teamB)
            : teamB.localeCompare(teamA);
        default:
          return 0;
      }
    });
  }, [processedFixtures, selectedGameweek, viewMode, sortBy, sortDirection]);

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
      .sort((a, b) => sortDirection === "asc" ? a.gameweek - b.gameweek : b.gameweek - a.gameweek);
  }, [filteredFixtures, sortDirection]);

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
  const fetchMatchStats = async (fixture: any) => {
    if (!fixture.isResult) return null;
    
    setIsLoadingMatchStats(true);
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
      
      // Filter out null results and sort by total points
      const homeTeamStats = homeStats.filter(Boolean).sort((a, b) => (b?.total_points || 0) - (a?.total_points || 0));
      const awayTeamStats = awayStats.filter(Boolean).sort((a, b) => (b?.total_points || 0) - (a?.total_points || 0));
      
      return {
        fixture,
        homeTeamStats,
        awayTeamStats
      };
    } catch (error) {
      console.error('Error fetching match stats:', error);
      return null;
    } finally {
      setIsLoadingMatchStats(false);
    }
  };

  // Fetch team statistics for a specific fixture
  const fetchTeamStats = async (fixture: any) => {
    setIsLoadingTeamStats(true);
    try {
      // Get all players from both teams
      const homeTeamPlayers = bootstrapData?.elements.filter(p => p.team === fixture.team_h) || [];
      const awayTeamPlayers = bootstrapData?.elements.filter(p => p.team === fixture.team_a) || [];
      
      // Calculate aggregated team stats
      const homeTeamStats = {
        name: fixture.homeTeam?.name || 'Home Team',
        totalPlayers: homeTeamPlayers.length,
        totalPoints: homeTeamPlayers.reduce((sum, p) => sum + (p.total_points || 0), 0),
        averagePrice: homeTeamPlayers.reduce((sum, p) => sum + (p.now_cost || 0), 0) / homeTeamPlayers.length / 10,
        totalValue: homeTeamPlayers.reduce((sum, p) => sum + (p.now_cost || 0), 0) / 10,
        form: (homeTeamPlayers.reduce((sum, p) => sum + parseFloat(p.form || '0'), 0) / homeTeamPlayers.length).toFixed(1),
        selectedBy: (homeTeamPlayers.reduce((sum, p) => sum + parseFloat(p.selected_by_percent || '0'), 0) / homeTeamPlayers.length).toFixed(1),
        playersByPosition: {
          GKP: homeTeamPlayers.filter(p => p.element_type === 1).length,
          DEF: homeTeamPlayers.filter(p => p.element_type === 2).length,
          MID: homeTeamPlayers.filter(p => p.element_type === 3).length,
          FWD: homeTeamPlayers.filter(p => p.element_type === 4).length,
        },
        topScorer: homeTeamPlayers.reduce((max, p) => (p.total_points || 0) > (max.total_points || 0) ? p : max, homeTeamPlayers[0] || {}),
        mostExpensive: homeTeamPlayers.reduce((max, p) => (p.now_cost || 0) > (max.now_cost || 0) ? p : max, homeTeamPlayers[0] || {}),
        bestForm: homeTeamPlayers.reduce((max, p) => parseFloat(p.form || '0') > parseFloat(max.form || '0') ? p : max, homeTeamPlayers[0] || {}),
      };

      const awayTeamStats = {
        name: fixture.awayTeam?.name || 'Away Team',
        totalPlayers: awayTeamPlayers.length,
        totalPoints: awayTeamPlayers.reduce((sum, p) => sum + (p.total_points || 0), 0),
        averagePrice: awayTeamPlayers.reduce((sum, p) => sum + (p.now_cost || 0), 0) / awayTeamPlayers.length / 10,
        totalValue: awayTeamPlayers.reduce((sum, p) => sum + (p.now_cost || 0), 0) / 10,
        form: (awayTeamPlayers.reduce((sum, p) => sum + parseFloat(p.form || '0'), 0) / awayTeamPlayers.length).toFixed(1),
        selectedBy: (awayTeamPlayers.reduce((sum, p) => sum + parseFloat(p.selected_by_percent || '0'), 0) / awayTeamPlayers.length).toFixed(1),
        playersByPosition: {
          GKP: awayTeamPlayers.filter(p => p.element_type === 1).length,
          DEF: awayTeamPlayers.filter(p => p.element_type === 2).length,
          MID: awayTeamPlayers.filter(p => p.element_type === 3).length,
          FWD: awayTeamPlayers.filter(p => p.element_type === 4).length,
        },
        topScorer: awayTeamPlayers.reduce((max, p) => (p.total_points || 0) > (max.total_points || 0) ? p : max, awayTeamPlayers[0] || {}),
        mostExpensive: awayTeamPlayers.reduce((max, p) => (p.now_cost || 0) > (max.now_cost || 0) ? p : max, awayTeamPlayers[0] || {}),
        bestForm: awayTeamPlayers.reduce((max, p) => parseFloat(p.form || '0') > parseFloat(max.form || '0') ? p : max, awayTeamPlayers[0] || {}),
      };
      
      return {
        fixture,
        homeTeamStats,
        awayTeamStats
      };
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return null;
    } finally {
      setIsLoadingTeamStats(false);
    }
  };

  // Handle match click
  const handleMatchClick = async (fixture: any) => {
    if (!fixture.isResult) return; // Only allow clicks on completed matches
    
    setSelectedMatch(fixture);
    setIsMatchStatsOpen(true);
    
    const stats = await fetchMatchStats(fixture);
    setMatchStats(stats);
  };

  // Fetch match-specific team statistics for a completed fixture
  const fetchMatchTeamStats = async (fixture: any) => {
    if (!fixture.isResult) return null;
    
    setIsLoadingMatchTeamStats(true);
    try {
      // Get all players from both teams
      const homeTeamPlayers = bootstrapData?.elements.filter(p => p.team === fixture.team_h) || [];
      const awayTeamPlayers = bootstrapData?.elements.filter(p => p.team === fixture.team_a) || [];
      
      // Fetch detailed match stats for each player
      const [homeMatchStats, awayMatchStats] = await Promise.all([
        Promise.all(homeTeamPlayers.map(async (player: any) => {
          try {
            const response = await fetch(`/api/element-summary/${player.id}`);
            if (!response.ok) throw new Error('Failed to fetch player data');
            const data = await response.json();
            
            // Find the specific gameweek data for this match
            const gameweekData = data.history?.find((h: any) => h.round === fixture.event);
            return gameweekData ? {
              playerId: player.id,
              playerName: player.web_name,
              position: ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type] || 'Unknown',
              minutes: gameweekData.minutes || 0,
              goals_scored: gameweekData.goals_scored || 0,
              assists: gameweekData.assists || 0,
              clean_sheets: gameweekData.clean_sheets || 0,
              goals_conceded: gameweekData.goals_conceded || 0,
              saves: gameweekData.saves || 0,
              yellow_cards: gameweekData.yellow_cards || 0,
              red_cards: gameweekData.red_cards || 0,
              bonus: gameweekData.bonus || 0,
              total_points: gameweekData.total_points || 0
            } : null;
          } catch (error) {
            console.error(`Error fetching match data for player ${player.web_name}:`, error);
            return null;
          }
        })),
        Promise.all(awayTeamPlayers.map(async (player: any) => {
          try {
            const response = await fetch(`/api/element-summary/${player.id}`);
            if (!response.ok) throw new Error('Failed to fetch player data');
            const data = await response.json();
            
            // Find the specific gameweek data for this match
            const gameweekData = data.history?.find((h: any) => h.round === fixture.event);
            return gameweekData ? {
              playerId: player.id,
              playerName: player.web_name,
              position: ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type] || 'Unknown',
              minutes: gameweekData.minutes || 0,
              goals_scored: gameweekData.goals_scored || 0,
              assists: gameweekData.assists || 0,
              clean_sheets: gameweekData.clean_sheets || 0,
              goals_conceded: gameweekData.goals_conceded || 0,
              saves: gameweekData.saves || 0,
              yellow_cards: gameweekData.yellow_cards || 0,
              red_cards: gameweekData.red_cards || 0,
              bonus: gameweekData.bonus || 0,
              total_points: gameweekData.total_points || 0
            } : null;
          } catch (error) {
            console.error(`Error fetching match data for player ${player.web_name}:`, error);
            return null;
          }
        }))
      ]);
      
      // Filter out null results and calculate team aggregates
      const homeStats = homeMatchStats.filter(Boolean);
      const awayStats = awayMatchStats.filter(Boolean);
      
      const homeTeamMatchStats = {
        name: fixture.homeTeam?.name || 'Home Team',
        totalPoints: homeStats.reduce((sum, p) => sum + p.total_points, 0),
        totalGoals: homeStats.reduce((sum, p) => sum + p.goals_scored, 0),
        totalAssists: homeStats.reduce((sum, p) => sum + p.assists, 0),
        totalMinutes: homeStats.reduce((sum, p) => sum + p.minutes, 0),
        totalSaves: homeStats.reduce((sum, p) => sum + p.saves, 0),
        totalGoalsConceded: homeStats.reduce((sum, p) => sum + p.goals_conceded, 0),
        totalYellowCards: homeStats.reduce((sum, p) => sum + p.yellow_cards, 0),
        totalRedCards: homeStats.reduce((sum, p) => sum + p.red_cards, 0),
        totalBonus: homeStats.reduce((sum, p) => sum + p.bonus, 0),
        cleanSheets: homeStats.some(p => p.clean_sheets > 0),
        playersUsed: homeStats.filter(p => p.minutes > 0).length,
        topScorer: homeStats.reduce((max, p) => p.total_points > max.total_points ? p : max, homeStats[0] || {}),
        topGoalScorer: homeStats.reduce((max, p) => p.goals_scored > max.goals_scored ? p : max, homeStats[0] || {}),
      };

      const awayTeamMatchStats = {
        name: fixture.awayTeam?.name || 'Away Team',
        totalPoints: awayStats.reduce((sum, p) => sum + p.total_points, 0),
        totalGoals: awayStats.reduce((sum, p) => sum + p.goals_scored, 0),
        totalAssists: awayStats.reduce((sum, p) => sum + p.assists, 0),
        totalMinutes: awayStats.reduce((sum, p) => sum + p.minutes, 0),
        totalSaves: awayStats.reduce((sum, p) => sum + p.saves, 0),
        totalGoalsConceded: awayStats.reduce((sum, p) => sum + p.goals_conceded, 0),
        totalYellowCards: awayStats.reduce((sum, p) => sum + p.yellow_cards, 0),
        totalRedCards: awayStats.reduce((sum, p) => sum + p.red_cards, 0),
        totalBonus: awayStats.reduce((sum, p) => sum + p.bonus, 0),
        cleanSheets: awayStats.some(p => p.clean_sheets > 0),
        playersUsed: awayStats.filter(p => p.minutes > 0).length,
        topScorer: awayStats.reduce((max, p) => p.total_points > max.total_points ? p : max, awayStats[0] || {}),
        topGoalScorer: awayStats.reduce((max, p) => p.goals_scored > max.goals_scored ? p : max, awayStats[0] || {}),
      };
      
      return {
        fixture,
        homeTeamMatchStats,
        awayTeamMatchStats
      };
    } catch (error) {
      console.error('Error fetching match team stats:', error);
      return null;
    } finally {
      setIsLoadingMatchTeamStats(false);
    }
  };

  // Handle team stats click
  const handleTeamStatsClick = async (fixture: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering match click
    
    setSelectedMatch(fixture);
    setIsTeamStatsOpen(true);
    
    const stats = await fetchTeamStats(fixture);
    setTeamStats(stats);
  };

  // Handle match team stats click (for completed matches only)
  const handleMatchTeamStatsClick = async (fixture: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering match click
    
    if (!fixture.isResult) return; // Only for completed matches
    
    setSelectedMatch(fixture);
    setIsMatchTeamStatsOpen(true);
    
    const stats = await fetchMatchTeamStats(fixture);
    setMatchTeamStats(stats);
  };

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

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column as any);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.live}</div>
              <div className="text-sm text-gray-600">Live</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.upcoming}</div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="fpl-filters">
          <div className="fpl-card-header">
            <div className="fpl-card-title">
              <Target className="h-5 w-5 text-blue-600" />
              Filters & Controls
            </div>
          </div>
          <div className="fpl-card-content">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Gameweek</label>
                <Select value={selectedGameweek.toString()} onValueChange={(value) => 
                  setSelectedGameweek(value === "all" ? "all" : parseInt(value))
                }>
                  <SelectTrigger data-testid="select-gameweek">
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
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">View</label>
                <Select value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                  <SelectTrigger data-testid="select-view-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Matches</SelectItem>
                    <SelectItem value="results">Results Only</SelectItem>
                    <SelectItem value="fixtures">Fixtures Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger data-testid="select-sort-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gameweek">Gameweek</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Order</label>
                <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as any)}>
                  <SelectTrigger data-testid="select-sort-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                          className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-colors ${
                            fixture.isResult 
                              ? 'hover:bg-blue-50 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => fixture.isResult && handleMatchClick(fixture)}
                          title={fixture.isResult ? 'Click to view match statistics' : ''}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            {/* Home Team */}
                            <div className="flex items-center space-x-2 min-w-[120px]">
                              <div className="text-right flex-1">
                                <span className="font-medium text-gray-900">
                                  {fixture.homeTeam?.short_name || "TBD"}
                                </span>
                              </div>
                              <Home className="h-3 w-3 text-blue-500" />
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
                              <Plane className="h-3 w-3 text-gray-500" />
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
                            
                            {/* Action buttons */}
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-2 py-1"
                                onClick={(e) => handleTeamStatsClick(fixture, e)}
                                data-testid={`team-stats-${fixture.id}`}
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Team Stats
                              </Button>
                              
                              {/* Match Stats button for completed matches only */}
                              {fixture.isResult && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs px-2 py-1"
                                  onClick={(e) => handleMatchTeamStatsClick(fixture, e)}
                                  data-testid={`match-stats-${fixture.id}`}
                                >
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Match Stats
                                </Button>
                              )}
                              
                              {/* Click indicator for completed matches */}
                              {fixture.isResult && (
                                <Badge variant="outline" className="text-xs text-blue-600 opacity-70">
                                  View Stats
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
                    className={`flex items-center justify-between p-4 bg-white border rounded-lg transition-all ${
                      fixture.isResult 
                        ? 'hover:shadow-md cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 hover:bg-blue-50' 
                        : 'hover:shadow-sm'
                    }`}
                    onClick={() => fixture.isResult && handleMatchClick(fixture)}
                    title={fixture.isResult ? 'Click to view match statistics' : ''}
                  >
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
                      
                      {/* Action buttons */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1"
                          onClick={(e) => handleTeamStatsClick(fixture, e)}
                          data-testid={`team-stats-${fixture.id}`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Team Stats
                        </Button>
                        
                        {/* Match Stats button for completed matches only */}
                        {fixture.isResult && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-2 py-1"
                            onClick={(e) => handleMatchTeamStatsClick(fixture, e)}
                            data-testid={`match-stats-${fixture.id}`}
                          >
                            <Trophy className="h-3 w-3 mr-1" />
                            Match Stats
                          </Button>
                        )}
                        
                        {/* Click indicator for completed matches */}
                        {fixture.isResult && (
                          <Badge variant="outline" className="text-xs text-blue-600 opacity-70">
                            View Stats
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

        {/* Match Statistics Modal */}
        <Dialog open={isMatchStatsOpen} onOpenChange={setIsMatchStatsOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-blue-600" />
                {selectedMatch && (
                  <>
                    {selectedMatch.homeTeam?.name} {selectedMatch.team_h_score} - {selectedMatch.team_a_score} {selectedMatch.awayTeam?.name}
                    <Badge variant="outline" className="ml-2">
                      GW{selectedMatch.event} - {formatDateTime(selectedMatch.kickoff_time).date}
                    </Badge>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingMatchStats ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading match statistics...</span>
              </div>
            ) : matchStats ? (
              <div className="space-y-6">
                {/* Match Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedMatch?.homeTeam?.name}
                    </div>
                    <div className="text-3xl font-bold mt-2">
                      {selectedMatch?.team_h_score}
                    </div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <div className="text-gray-600">Final Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedMatch?.awayTeam?.name}
                    </div>
                    <div className="text-3xl font-bold mt-2">
                      {selectedMatch?.team_a_score}
                    </div>
                  </div>
                </div>

                {/* Player Statistics Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Home Team Stats */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Home className="h-5 w-5 text-blue-500" />
                      {selectedMatch?.homeTeam?.name} Players
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="p-2 text-left">Player</th>
                            <th className="p-2 text-center">Pts</th>
                            <th className="p-2 text-center">G</th>
                            <th className="p-2 text-center">A</th>
                            <th className="p-2 text-center">Min</th>
                            <th className="p-2 text-center">Saves</th>
                            <th className="p-2 text-center">BPS</th>
                            <th className="p-2 text-center">YC</th>
                            <th className="p-2 text-center">RC</th>
                            <th className="p-2 text-center">Bonus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchStats.homeTeamStats.map((player) => (
                            <tr key={player.playerId} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <div>
                                  <div className="font-medium">{player.playerName}</div>
                                  <div className="text-xs text-gray-500">{player.position}</div>
                                </div>
                              </td>
                              <td className="p-2 text-center font-bold">{player.total_points}</td>
                              <td className="p-2 text-center">
                                {player.goals_scored > 0 && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    {player.goals_scored}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.assists > 0 && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {player.assists}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center text-gray-600">{player.minutes}'</td>
                              <td className="p-2 text-center">
                                {player.saves > 0 && (
                                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                                    {player.saves}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.bps > 0 && (
                                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                                    {player.bps}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.yellow_cards > 0 && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    {player.yellow_cards}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.red_cards > 0 && (
                                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                                    {player.red_cards}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.bonus > 0 && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                    {player.bonus}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Away Team Stats */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Plane className="h-5 w-5 text-gray-500" />
                      {selectedMatch?.awayTeam?.name} Players
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="p-2 text-left">Player</th>
                            <th className="p-2 text-center">Pts</th>
                            <th className="p-2 text-center">G</th>
                            <th className="p-2 text-center">A</th>
                            <th className="p-2 text-center">Min</th>
                            <th className="p-2 text-center">Saves</th>
                            <th className="p-2 text-center">BPS</th>
                            <th className="p-2 text-center">YC</th>
                            <th className="p-2 text-center">RC</th>
                            <th className="p-2 text-center">Bonus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchStats.awayTeamStats.map((player) => (
                            <tr key={player.playerId} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <div>
                                  <div className="font-medium">{player.playerName}</div>
                                  <div className="text-xs text-gray-500">{player.position}</div>
                                </div>
                              </td>
                              <td className="p-2 text-center font-bold">{player.total_points}</td>
                              <td className="p-2 text-center">
                                {player.goals_scored > 0 && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    {player.goals_scored}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.assists > 0 && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {player.assists}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center text-gray-600">{player.minutes}'</td>
                              <td className="p-2 text-center">
                                {player.saves > 0 && (
                                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                                    {player.saves}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.bps > 0 && (
                                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                                    {player.bps}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.yellow_cards > 0 && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    {player.yellow_cards}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.red_cards > 0 && (
                                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                                    {player.red_cards}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {player.bonus > 0 && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                    {player.bonus}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {matchStats.homeTeamStats.reduce((sum, p) => sum + p.goals_scored, 0) + 
                         matchStats.awayTeamStats.reduce((sum, p) => sum + p.goals_scored, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Goals</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {matchStats.homeTeamStats.reduce((sum, p) => sum + p.assists, 0) + 
                         matchStats.awayTeamStats.reduce((sum, p) => sum + p.assists, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Assists</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-cyan-600">
                        {matchStats.homeTeamStats.reduce((sum, p) => sum + p.saves, 0) + 
                         matchStats.awayTeamStats.reduce((sum, p) => sum + p.saves, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Saves</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {matchStats.homeTeamStats.reduce((sum, p) => sum + p.bps, 0) + 
                         matchStats.awayTeamStats.reduce((sum, p) => sum + p.bps, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total BPS</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {matchStats.homeTeamStats.reduce((sum, p) => sum + p.yellow_cards, 0) + 
                         matchStats.awayTeamStats.reduce((sum, p) => sum + p.yellow_cards, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Yellow Cards</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {matchStats.homeTeamStats.reduce((sum, p) => sum + p.red_cards, 0) + 
                         matchStats.awayTeamStats.reduce((sum, p) => sum + p.red_cards, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Red Cards</div>
                    </CardContent>
                  </Card>
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

        {/* Team Statistics Modal */}
        <Dialog open={isTeamStatsOpen} onOpenChange={setIsTeamStatsOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                Team Statistics Comparison
                {selectedMatch && (
                  <Badge variant="outline" className="ml-2">
                    {selectedMatch.homeTeam?.short_name} vs {selectedMatch.awayTeam?.short_name} - GW{selectedMatch.event}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingTeamStats ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading team statistics...</span>
              </div>
            ) : teamStats ? (
              <div className="space-y-6">
                {/* Team Overview */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Home Team */}
                  <Card>
                    <CardHeader className="bg-blue-50">
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-blue-600" />
                        {teamStats.homeTeamStats.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{teamStats.homeTeamStats.totalPoints}</div>
                          <div className="text-sm text-gray-600">Total Points</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">£{teamStats.homeTeamStats.totalValue.toFixed(1)}m</div>
                          <div className="text-sm text-gray-600">Total Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">£{teamStats.homeTeamStats.averagePrice.toFixed(1)}m</div>
                          <div className="text-sm text-gray-600">Avg Price</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{teamStats.homeTeamStats.form}</div>
                          <div className="text-sm text-gray-600">Avg Form</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Squad Composition</h4>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.homeTeamStats.playersByPosition.GKP}</div>
                            <div className="text-xs text-gray-600">GKP</div>
                          </div>
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.homeTeamStats.playersByPosition.DEF}</div>
                            <div className="text-xs text-gray-600">DEF</div>
                          </div>
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.homeTeamStats.playersByPosition.MID}</div>
                            <div className="text-xs text-gray-600">MID</div>
                          </div>
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.homeTeamStats.playersByPosition.FWD}</div>
                            <div className="text-xs text-gray-600">FWD</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Key Players</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Top Scorer:</span>
                            <span className="font-medium">{teamStats.homeTeamStats.topScorer.web_name} ({teamStats.homeTeamStats.topScorer.total_points} pts)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Most Expensive:</span>
                            <span className="font-medium">{teamStats.homeTeamStats.mostExpensive.web_name} (£{(teamStats.homeTeamStats.mostExpensive.now_cost / 10).toFixed(1)}m)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Best Form:</span>
                            <span className="font-medium">{teamStats.homeTeamStats.bestForm.web_name} ({teamStats.homeTeamStats.bestForm.form})</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Away Team */}
                  <Card>
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center gap-2">
                        <Plane className="h-5 w-5 text-gray-600" />
                        {teamStats.awayTeamStats.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{teamStats.awayTeamStats.totalPoints}</div>
                          <div className="text-sm text-gray-600">Total Points</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">£{teamStats.awayTeamStats.totalValue.toFixed(1)}m</div>
                          <div className="text-sm text-gray-600">Total Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">£{teamStats.awayTeamStats.averagePrice.toFixed(1)}m</div>
                          <div className="text-sm text-gray-600">Avg Price</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{teamStats.awayTeamStats.form}</div>
                          <div className="text-sm text-gray-600">Avg Form</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Squad Composition</h4>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.awayTeamStats.playersByPosition.GKP}</div>
                            <div className="text-xs text-gray-600">GKP</div>
                          </div>
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.awayTeamStats.playersByPosition.DEF}</div>
                            <div className="text-xs text-gray-600">DEF</div>
                          </div>
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.awayTeamStats.playersByPosition.MID}</div>
                            <div className="text-xs text-gray-600">MID</div>
                          </div>
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-bold">{teamStats.awayTeamStats.playersByPosition.FWD}</div>
                            <div className="text-xs text-gray-600">FWD</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Key Players</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Top Scorer:</span>
                            <span className="font-medium">{teamStats.awayTeamStats.topScorer.web_name} ({teamStats.awayTeamStats.topScorer.total_points} pts)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Most Expensive:</span>
                            <span className="font-medium">{teamStats.awayTeamStats.mostExpensive.web_name} (£{(teamStats.awayTeamStats.mostExpensive.now_cost / 10).toFixed(1)}m)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Best Form:</span>
                            <span className="font-medium">{teamStats.awayTeamStats.bestForm.web_name} ({teamStats.awayTeamStats.bestForm.form})</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Comparison Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Head-to-Head Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {teamStats.homeTeamStats.totalPoints > teamStats.awayTeamStats.totalPoints ? 
                            teamStats.homeTeamStats.name : teamStats.awayTeamStats.name}
                        </div>
                        <div className="text-sm text-gray-600">Higher Total Points</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {teamStats.homeTeamStats.totalValue > teamStats.awayTeamStats.totalValue ? 
                            teamStats.homeTeamStats.name : teamStats.awayTeamStats.name}
                        </div>
                        <div className="text-sm text-gray-600">Higher Squad Value</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          {teamStats.homeTeamStats.averagePrice > teamStats.awayTeamStats.averagePrice ? 
                            teamStats.homeTeamStats.name : teamStats.awayTeamStats.name}
                        </div>
                        <div className="text-sm text-gray-600">Higher Avg Price</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">
                          {parseFloat(teamStats.homeTeamStats.form) > parseFloat(teamStats.awayTeamStats.form) ? 
                            teamStats.homeTeamStats.name : teamStats.awayTeamStats.name}
                        </div>
                        <div className="text-sm text-gray-600">Better Form</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No team statistics available</h3>
                <p className="text-gray-600">Unable to load team statistics at this time.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Match Team Statistics Modal */}
        <Dialog open={isMatchTeamStatsOpen} onOpenChange={setIsMatchTeamStatsOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-blue-600" />
                Match Team Performance
                {selectedMatch && (
                  <Badge variant="outline" className="ml-2">
                    {selectedMatch.homeTeam?.short_name} {selectedMatch.team_h_score} - {selectedMatch.team_a_score} {selectedMatch.awayTeam?.short_name} (GW{selectedMatch.event})
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingMatchTeamStats ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading match team statistics...</span>
              </div>
            ) : matchTeamStats ? (
              <div className="space-y-6">
                {/* Match Score Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Final Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center space-x-8 text-4xl font-bold">
                      <div className="text-center">
                        <div className="text-blue-600">{matchTeamStats.homeTeamMatchStats.name}</div>
                        <div className="text-6xl mt-2">{selectedMatch?.team_h_score}</div>
                      </div>
                      <div className="text-gray-400">-</div>
                      <div className="text-center">
                        <div className="text-gray-600">{matchTeamStats.awayTeamMatchStats.name}</div>
                        <div className="text-6xl mt-2">{selectedMatch?.team_a_score}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Performance Comparison */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Home Team Match Stats */}
                  <Card>
                    <CardHeader className="bg-blue-50">
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-blue-600" />
                        {matchTeamStats.homeTeamMatchStats.name} Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{matchTeamStats.homeTeamMatchStats.totalPoints}</div>
                          <div className="text-sm text-gray-600">FPL Points</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{matchTeamStats.homeTeamMatchStats.totalGoals}</div>
                          <div className="text-sm text-gray-600">Goals</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{matchTeamStats.homeTeamMatchStats.totalAssists}</div>
                          <div className="text-sm text-gray-600">Assists</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{matchTeamStats.homeTeamMatchStats.playersUsed}</div>
                          <div className="text-sm text-gray-600">Players Used</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Match Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Minutes:</span>
                            <span className="font-medium">{matchTeamStats.homeTeamMatchStats.totalMinutes}'</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Clean Sheet:</span>
                            <span className="font-medium">{matchTeamStats.homeTeamMatchStats.cleanSheets ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Yellow Cards:</span>
                            <span className="font-medium">{matchTeamStats.homeTeamMatchStats.totalYellowCards}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Red Cards:</span>
                            <span className="font-medium">{matchTeamStats.homeTeamMatchStats.totalRedCards}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Saves:</span>
                            <span className="font-medium">{matchTeamStats.homeTeamMatchStats.totalSaves}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bonus Points:</span>
                            <span className="font-medium">{matchTeamStats.homeTeamMatchStats.totalBonus}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Star Performers</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Top FPL Scorer:</span>
                            <span className="font-medium">{matchTeamStats.homeTeamMatchStats.topScorer?.playerName} ({matchTeamStats.homeTeamMatchStats.topScorer?.total_points} pts)</span>
                          </div>
                          {matchTeamStats.homeTeamMatchStats.topGoalScorer?.goals_scored > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Top Goal Scorer:</span>
                              <span className="font-medium">{matchTeamStats.homeTeamMatchStats.topGoalScorer?.playerName} ({matchTeamStats.homeTeamMatchStats.topGoalScorer?.goals_scored} goals)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Away Team Match Stats */}
                  <Card>
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center gap-2">
                        <Plane className="h-5 w-5 text-gray-600" />
                        {matchTeamStats.awayTeamMatchStats.name} Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{matchTeamStats.awayTeamMatchStats.totalPoints}</div>
                          <div className="text-sm text-gray-600">FPL Points</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{matchTeamStats.awayTeamMatchStats.totalGoals}</div>
                          <div className="text-sm text-gray-600">Goals</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{matchTeamStats.awayTeamMatchStats.totalAssists}</div>
                          <div className="text-sm text-gray-600">Assists</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{matchTeamStats.awayTeamMatchStats.playersUsed}</div>
                          <div className="text-sm text-gray-600">Players Used</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Match Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Minutes:</span>
                            <span className="font-medium">{matchTeamStats.awayTeamMatchStats.totalMinutes}'</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Clean Sheet:</span>
                            <span className="font-medium">{matchTeamStats.awayTeamMatchStats.cleanSheets ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Yellow Cards:</span>
                            <span className="font-medium">{matchTeamStats.awayTeamMatchStats.totalYellowCards}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Red Cards:</span>
                            <span className="font-medium">{matchTeamStats.awayTeamMatchStats.totalRedCards}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Saves:</span>
                            <span className="font-medium">{matchTeamStats.awayTeamMatchStats.totalSaves}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bonus Points:</span>
                            <span className="font-medium">{matchTeamStats.awayTeamMatchStats.totalBonus}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Star Performers</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Top FPL Scorer:</span>
                            <span className="font-medium">{matchTeamStats.awayTeamMatchStats.topScorer?.playerName} ({matchTeamStats.awayTeamMatchStats.topScorer?.total_points} pts)</span>
                          </div>
                          {matchTeamStats.awayTeamMatchStats.topGoalScorer?.goals_scored > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Top Goal Scorer:</span>
                              <span className="font-medium">{matchTeamStats.awayTeamMatchStats.topGoalScorer?.playerName} ({matchTeamStats.awayTeamMatchStats.topGoalScorer?.goals_scored} goals)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Match Summary Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Match Performance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {matchTeamStats.homeTeamMatchStats.totalPoints > matchTeamStats.awayTeamMatchStats.totalPoints ? 
                            matchTeamStats.homeTeamMatchStats.name : 
                            matchTeamStats.awayTeamMatchStats.totalPoints > matchTeamStats.homeTeamMatchStats.totalPoints ?
                            matchTeamStats.awayTeamMatchStats.name : 'Tie'}
                        </div>
                        <div className="text-sm text-gray-600">More FPL Points</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {matchTeamStats.homeTeamMatchStats.totalPoints} - {matchTeamStats.awayTeamMatchStats.totalPoints}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {matchTeamStats.homeTeamMatchStats.totalGoals > matchTeamStats.awayTeamMatchStats.totalGoals ? 
                            matchTeamStats.homeTeamMatchStats.name : 
                            matchTeamStats.awayTeamMatchStats.totalGoals > matchTeamStats.homeTeamMatchStats.totalGoals ?
                            matchTeamStats.awayTeamMatchStats.name : 'Tie'}
                        </div>
                        <div className="text-sm text-gray-600">More Goals</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {matchTeamStats.homeTeamMatchStats.totalGoals} - {matchTeamStats.awayTeamMatchStats.totalGoals}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          {matchTeamStats.homeTeamMatchStats.totalAssists > matchTeamStats.awayTeamMatchStats.totalAssists ? 
                            matchTeamStats.homeTeamMatchStats.name : 
                            matchTeamStats.awayTeamMatchStats.totalAssists > matchTeamStats.homeTeamMatchStats.totalAssists ?
                            matchTeamStats.awayTeamMatchStats.name : 'Tie'}
                        </div>
                        <div className="text-sm text-gray-600">More Assists</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {matchTeamStats.homeTeamMatchStats.totalAssists} - {matchTeamStats.awayTeamMatchStats.totalAssists}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">
                          {matchTeamStats.homeTeamMatchStats.totalBonus > matchTeamStats.awayTeamMatchStats.totalBonus ? 
                            matchTeamStats.homeTeamMatchStats.name : 
                            matchTeamStats.awayTeamMatchStats.totalBonus > matchTeamStats.homeTeamMatchStats.totalBonus ?
                            matchTeamStats.awayTeamMatchStats.name : 'Tie'}
                        </div>
                        <div className="text-sm text-gray-600">More Bonus Points</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {matchTeamStats.homeTeamMatchStats.totalBonus} - {matchTeamStats.awayTeamMatchStats.totalBonus}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No match statistics available</h3>
                <p className="text-gray-600">Unable to load match team statistics at this time.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Filter, Clock, Target, Search, Loader2, X } from "lucide-react";

interface BootstrapData {
  events: Array<{ id: number; is_current: boolean; finished: boolean }>;
  elements: Array<{ id: number; first_name: string; second_name: string; web_name: string; team: number; element_type: number; form: number; minutes: number; clearances_blocks_interceptions: number; tackles: number; recoveries: number }>;
  teams: Array<{ id: number; name: string; short_name: string; code: number }>;
  element_types: Array<{ id: number; singular_name: string; singular_name_short: string }>;
}

interface PlayerDefensiveData {
  playerId: number;
  playerName: string;
  position: string;
  teamName: string;
  teamCode: number;
  currentSeasonStats: {
    dcPer90: number;
    tacklesPer90: number;
    recoveriesPer90: number;
    cbiPer90: number;
  };
  gameweekProjections: Array<{
    gameweek: number;
    defensiveContribution: number;
    tackles: number;
    recoveries: number;
    cbi: number;
    opponent: string;
    opponentTier: string;
    fixtureMultiplier: number;
    isActual?: boolean;
    isProjected?: boolean;
  }>;
  form: number;
  confidence: number;
}

export default function PlayerDefensiveContributions() {
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  // Calculate current gameweek and upcoming gameweeks
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek + 1;

  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0); // Will be set to current + 1
  const [endGameweek, setEndGameweek] = useState<number>(0); // Will be set to current + 6
  const [gameweekSortColumn, setGameweekSortColumn] = useState<number | null>(null);
  const [gameweekSortOrder, setGameweekSortOrder] = useState<"asc" | "desc">("desc");
  const [sortByCurrentDC, setSortByCurrentDC] = useState<boolean>(false);
  const [currentDCSortOrder, setCurrentDCSortOrder] = useState<"asc" | "desc">("desc");
  const [sortByTotal, setSortByTotal] = useState<boolean>(false);
  const [totalSortOrder, setTotalSortOrder] = useState<"asc" | "desc">("desc");
  const [sortByAvg, setSortByAvg] = useState<boolean>(false);
  const [avgSortOrder, setAvgSortOrder] = useState<"asc" | "desc">("desc");
  const [sortByDCPoints, setSortByDCPoints] = useState<boolean>(false);
  const [dcPointsSortOrder, setDCPointsSortOrder] = useState<"asc" | "desc">("desc");
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);

  // Dynamic gameweek range state (fetch 12 gameweeks for API, default display to 6)
  const [gameweekRange, setGameweekRange] = useState(() => {
    const start = nextGameweek;
    const end = Math.min(nextGameweek + 11, 38); // Fetch 12 gameweeks for dropdown
    return { start, end };
  });
  
  // Update range when current gameweek changes
  useEffect(() => {
    const start = nextGameweek;
    const end = Math.min(nextGameweek + 11, 38); // Fetch 12 gameweeks for dropdown
    setGameweekRange({ start, end });
  }, [nextGameweek]);

  // Fetch defensive contribution projections using new formula-based endpoint with current season data
  // Fetches 12 gameweeks to populate dropdown, but display defaults to 6
  const { data: defensiveData, isLoading } = useQuery({
    queryKey: ["player-defensive-contributions-current-season", gameweekRange.start, gameweekRange.end],
    queryFn: () => fetch(`/api/player-defensive-contributions-projections?startGameweek=${gameweekRange.start}&endGameweek=${gameweekRange.end}`).then(res => res.json()),
    staleTime: 1 * 60 * 1000, // 1 minute to see changes faster
  });

  // Fetch fixtures for opponent data
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Team attacking tier multipliers (from TEAM_MULTIPLIERS.attack)
  const ATTACK_MULTIPLIERS: { [key: number]: number } = {
    12: 1.35, 13: 1.35, // Liverpool, Man City (elite)
    1: 1.15, 7: 1.15, 15: 1.15, 18: 1.15, 2: 1.15, // Arsenal, Chelsea, Newcastle, Tottenham, Aston Villa (strong)
    9: 0.85, 16: 0.85, 19: 0.85, 20: 0.85, // Everton, Nottingham Forest, West Ham, Wolves (weak)
    3: 0.7, 11: 0.7, 17: 0.7 // Burnley, Leeds, Sunderland (promoted)
    // All others default to 1.0 (average)
  };

  const getAttackMultiplier = (teamId: number): number => {
    return ATTACK_MULTIPLIERS[teamId] || 1.0;
  };

  const getAttackTier = (teamId: number): string => {
    if ([12, 13].includes(teamId)) return "Elite";
    if ([1, 7, 15, 18, 2].includes(teamId)) return "Strong";
    if ([9, 16, 19, 20].includes(teamId)) return "Weak";
    if ([3, 11, 17].includes(teamId)) return "Promoted";
    return "Average";
  };

  // Transform API data to match expected format (new endpoint already does the calculations)
  const players: PlayerDefensiveData[] = useMemo(() => {
    if (!defensiveData || !Array.isArray(defensiveData)) return [];
    
    return defensiveData.map((player: any) => {
      // Extract gameweek projections from API response
      const gameweekProjections = Object.entries(player.gameweekProjections || {}).map(([gwKey, projection]: [string, any]) => {
        const gameweek = parseInt(gwKey.replace('gw', ''));
        
        // Find fixture data for opponent information  
        const playerTeam = bootstrapData?.teams?.find((t: any) => t.short_name === player.teamName);
        const playerTeamId = playerTeam?.id;
        
        const fixture = Array.isArray(fixturesData) ? fixturesData.find((f: any) => 
          f.event === gameweek && (f.team_h === playerTeamId || f.team_a === playerTeamId)
        ) : null;
        
        let opponent = "TBD";
        let opponentId = 1;
        if (fixture && playerTeamId) {
          if (fixture.team_h === playerTeamId) {
            opponentId = fixture.team_a;
          } else {
            opponentId = fixture.team_h;
          }
          
          const opponentTeam = bootstrapData?.teams?.find((t: any) => t.id === opponentId);
          opponent = opponentTeam ? opponentTeam.short_name : "TBD";
        }
        
        const attackMultiplier = getAttackMultiplier(opponentId);
        const opponentTier = getAttackTier(opponentId);
        
        return {
          gameweek,
          defensiveContribution: projection.dc || 0,
          tackles: Math.round((projection.dc || 0) * 0.4 * 100) / 100, // Estimate tackles as 40% of DC
          recoveries: Math.round((projection.dc || 0) * 0.3 * 100) / 100, // Estimate recoveries as 30% of DC
          cbi: Math.round((projection.dc || 0) * 0.3 * 100) / 100, // Estimate CBI as 30% of DC
          opponent,
          opponentTier,
          fixtureMultiplier: attackMultiplier,
          isProjected: true,
        };
      }).sort((a, b) => a.gameweek - b.gameweek);
      
      // Use actual current season stats from API (not legacy averages)
      const currentDCPer90 = player.dcPerGame || 0;
      const seasonTotalDC = player.seasonDefensiveContribution || 0;
      
      return {
        playerId: player.playerId,
        playerName: player.playerName,
        position: player.position,
        teamName: player.teamName,
        teamCode: 0, // Not provided by API
        currentSeasonStats: {
          dcPer90: Math.round(currentDCPer90 * 100) / 100,
          tacklesPer90: Math.round(currentDCPer90 * 0.4 * 100) / 100, // Estimated from current DC per 90
          recoveriesPer90: Math.round(currentDCPer90 * 0.3 * 100) / 100, // Estimated from current DC per 90  
          cbiPer90: Math.round(currentDCPer90 * 0.3 * 100) / 100, // Estimated from current DC per 90
        },
        gameweekProjections,
        form: 0, // Not provided by new API
        confidence: 0.75, // Default confidence
      };
    });
  }, [defensiveData, bootstrapData, fixturesData]);

  // Get all gameweeks from the API data (already filtered to future gameweeks, up to 12 available)
  const allGameweeks = players.length > 0 && players[0].gameweekProjections.length > 0 
    ? players[0].gameweekProjections.map(gw => gw.gameweek)
    : Array.from({ length: 12 }, (_, i) => gameweekRange.start + i).filter(gw => gw <= 38);
  
  // Set default gameweek range to 6 gameweeks (even though API fetches 12)
  useEffect(() => {
    setStartGameweek(gameweekRange.start);
    setEndGameweek(Math.min(gameweekRange.start + 5, 38)); // Default to 6 gameweeks
  }, [gameweekRange]);
  
  // Filter gameweeks based on selected range
  const gameweeks = useMemo(() => {
    return allGameweeks.filter(gw => gw >= startGameweek && gw <= endGameweek);
  }, [allGameweeks, startGameweek, endGameweek]);

  // Get active gameweeks (range minus excluded)
  const activeGameweeks = useMemo(() => {
    return gameweeks.filter(gw => !excludedGameweeks.has(gw));
  }, [gameweeks, excludedGameweeks]);

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

  // Calculate totals for each player
  const playersWithTotals = useMemo(() => {
    return players.map(player => {
      // Calculate defensive contribution points for each gameweek
      const gameweekPoints = player.gameweekProjections.map(gw => {
        let dcPoints = 0;
        const dc = gw.defensiveContribution;
        
        if (player.position === "GKP" || player.position === "Goalkeeper") {
          dcPoints = 0; // Goalkeepers don't get DC points
        } else if (player.position === "DEF" || player.position === "Defender") {
          dcPoints = dc >= 10 ? 2 : 0; // Defenders need 10+ DC for 2 points
        } else {
          dcPoints = dc >= 12 ? 2 : 0; // Midfielders/Forwards need 12+ DC for 2 points
        }
        
        return { ...gw, dcPoints };
      });
      
      // Filter projections to selected gameweek range (for table display)
      const rangeProjections = gameweekPoints.filter(gw => gw.gameweek >= startGameweek && gw.gameweek <= endGameweek);
      
      // Filter to active gameweeks only (excluding excluded ones) for totals/averages
      const activeProjections = gameweekPoints.filter(gw => activeGameweeks.includes(gw.gameweek));
      
      return {
        ...player,
        gameweekProjections: rangeProjections,
        totalDC: activeProjections.reduce((sum, gw) => sum + gw.defensiveContribution, 0),
        avgDC: activeProjections.length > 0 ? activeProjections.reduce((sum, gw) => sum + gw.defensiveContribution, 0) / activeProjections.length : 0,
        totalTackles: activeProjections.reduce((sum, gw) => sum + gw.tackles, 0),
        totalRecoveries: activeProjections.reduce((sum, gw) => sum + gw.recoveries, 0),
        totalCBI: activeProjections.reduce((sum, gw) => sum + gw.cbi, 0),
        totalDCPoints: activeProjections.reduce((sum, gw) => sum + gw.dcPoints, 0),
        avgDCPoints: activeProjections.length > 0 ? activeProjections.reduce((sum, gw) => sum + gw.dcPoints, 0) / activeProjections.length : 0
      };
    });
  }, [players, startGameweek, endGameweek, activeGameweeks]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = playersWithTotals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Position filter
    if (selectedPosition !== "all") {
      filtered = filtered.filter(p => p.position === selectedPosition);
    }

    // Team filter
    if (selectedTeam !== "all") {
      filtered = filtered.filter(p => p.teamName === selectedTeam);
    }

    // Sort by current DC/game if specified
    if (sortByCurrentDC) {
      filtered.sort((a, b) => {
        const aValue = a.currentSeasonStats.dcPer90;
        const bValue = b.currentSeasonStats.dcPer90;
        return currentDCSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }
    // Sort by Total if specified
    else if (sortByTotal) {
      filtered.sort((a, b) => {
        const aValue = a.totalDC;
        const bValue = b.totalDC;
        return totalSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }
    // Sort by Avg if specified
    else if (sortByAvg) {
      filtered.sort((a, b) => {
        const aValue = a.avgDC;
        const bValue = b.avgDC;
        return avgSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }
    // Sort by DC Points if specified
    else if (sortByDCPoints) {
      filtered.sort((a, b) => {
        const aValue = a.totalDCPoints;
        const bValue = b.totalDCPoints;
        return dcPointsSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }
    // Sort by gameweek column if specified
    else if (gameweekSortColumn !== null) {
      filtered.sort((a, b) => {
        const aGameweek = a.gameweekProjections.find(gw => gw.gameweek === gameweekSortColumn);
        const bGameweek = b.gameweekProjections.find(gw => gw.gameweek === gameweekSortColumn);
        
        const aValue = (aGameweek?.defensiveContribution || 0);
        const bValue = (bGameweek?.defensiveContribution || 0);
        
        return gameweekSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }
    // Default sort by total DC
    else {
      filtered.sort((a, b) => {
        return b.totalDC - a.totalDC; // Always sort by total DC descending
      });
    }

    return filtered;
  }, [playersWithTotals, searchTerm, selectedPosition, selectedTeam, gameweekSortColumn, gameweekSortOrder, sortByCurrentDC, currentDCSortOrder, sortByTotal, totalSortOrder, sortByAvg, avgSortOrder, sortByDCPoints, dcPointsSortOrder]);

  // Get unique values for filters
  const positions = Array.from(new Set(players.map(p => p.position).filter(Boolean)));
  const teams = Array.from(new Set(players.map(p => p.teamName).filter(Boolean))).sort();


  const handleGameweekSort = (gameweek: number) => {
    setSortByCurrentDC(false);
    setSortByTotal(false);
    setSortByAvg(false);
    setSortByDCPoints(false);
    if (gameweekSortColumn === gameweek) {
      setGameweekSortOrder(gameweekSortOrder === "desc" ? "asc" : "desc");
    } else {
      setGameweekSortColumn(gameweek);
      setGameweekSortOrder("desc");
    }
  };

  const handleCurrentDCSort = () => {
    setGameweekSortColumn(null);
    setSortByTotal(false);
    setSortByAvg(false);
    setSortByDCPoints(false);
    if (sortByCurrentDC) {
      setCurrentDCSortOrder(currentDCSortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortByCurrentDC(true);
      setCurrentDCSortOrder("desc");
    }
  };

  const handleTotalSort = () => {
    setGameweekSortColumn(null);
    setSortByCurrentDC(false);
    setSortByAvg(false);
    setSortByDCPoints(false);
    if (sortByTotal) {
      setTotalSortOrder(totalSortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortByTotal(true);
      setTotalSortOrder("desc");
    }
  };

  const handleAvgSort = () => {
    setGameweekSortColumn(null);
    setSortByCurrentDC(false);
    setSortByTotal(false);
    setSortByDCPoints(false);
    if (sortByAvg) {
      setAvgSortOrder(avgSortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortByAvg(true);
      setAvgSortOrder("desc");
    }
  };

  const handleDCPointsSort = () => {
    setGameweekSortColumn(null);
    setSortByCurrentDC(false);
    setSortByTotal(false);
    setSortByAvg(false);
    if (sortByDCPoints) {
      setDCPointsSortOrder(dcPointsSortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortByDCPoints(true);
      setDCPointsSortOrder("desc");
    }
  };

  const getOpponentColor = (tier: string) => {
    switch (tier) {
      case 'elite': return 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300';
      case 'strong': return 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-300';
      case 'weak': return 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300';
      case 'promoted': return 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300';
      default: return 'bg-gray-50 dark:bg-gray-900/10 text-gray-700 dark:text-gray-300';
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Defensive Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating defensive contribution projections for all players across the next 12 gameweeks...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Shield className="h-8 w-8" />
            <h1>Player Defensive Contributions Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Comprehensive defensive stats and FPL points projections with fixture-aware analysis
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-900">Players Analyzed</p>
                  <p className="text-2xl font-bold text-blue-700">{filteredPlayers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-900">Top Performer</p>
                  <p className="text-lg font-bold text-green-700">
                    {filteredPlayers.length > 0 ? filteredPlayers[0].playerName.split(' ').slice(-1)[0] : "None"}
                  </p>
                  <p className="text-sm text-green-600">
                    {filteredPlayers.length > 0 ? filteredPlayers[0].totalDC.toFixed(1) + " DC" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Filter className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-900">Average DC</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {filteredPlayers.length > 0 ? 
                      (filteredPlayers.reduce((sum, p) => sum + p.totalDC, 0) / filteredPlayers.length).toFixed(1) : "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-900">Active Gameweeks</p>
                  <p className="text-2xl font-bold text-orange-700">{activeGameweeks.length}</p>
                  <p className="text-sm text-orange-600">
                    {activeGameweeks.length > 0 ? `${activeGameweeks.length} of ${gameweeks.length} GWs` : "Select range"}
                    {excludedGameweeks.size > 0 && ` (${excludedGameweeks.size} excluded)`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Filters and Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From GW</label>
              <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allGameweeks.map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To GW</label>
              <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allGameweeks.filter(gw => gw >= startGameweek).map(gw => (
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
                  {positions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
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
                    <SelectItem key={team} value={team}>{team}</SelectItem>
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
                data-testid="input-player-search"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

          </div>

          {/* Gameweek Toggle Section */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Toggle Gameweeks (click to exclude/include):
              </label>
              {excludedGameweeks.size > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearExclusions}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  data-testid="button-clear-exclusions"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear exclusions
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {gameweeks.map(gwNumber => {
                const isExcluded = excludedGameweeks.has(gwNumber);
                return (
                  <Button
                    key={gwNumber}
                    variant={isExcluded ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleGameweekExclusion(gwNumber)}
                    className={`min-w-[60px] ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
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

          {/* Display Options */}
          <div className="mt-4 pt-4 border-t">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Display Options:</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOpponent(!showOpponent)}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto ${
                  showOpponent 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                }`}
                data-testid="button-toggle-opponent"
              >
                {showOpponent ? "Hide Opponent" : "Show Opponent"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Player Defensive Contributions Projections: GW{startGameweek}-GW{endGameweek}
            {excludedGameweeks.size > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {excludedGameweeks.size} excluded
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Fixture-aware projections with opponent difficulty indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full mt-4">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">
                    Player
                  </TableHead>

                  <TableHead 
                    className="hidden md:table-cell sticky left-[150px] bg-background z-10 min-w-[80px] cursor-pointer hover:bg-muted/50 px-1 py-2"
                    onClick={handleCurrentDCSort}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Current DC/game
                      {sortByCurrentDC && (
                        <span className="text-xs">
                          {currentDCSortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  {activeGameweeks.map(gw => (
                    <TableHead 
                      key={gw} 
                      className="text-center min-w-[100px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleGameweekSort(gw)}
                    >
                      <div className="flex items-center justify-center gap-1">
                        GW{gw}
                        {gameweekSortColumn === gw && (
                          <span className="text-xs">
                            {gameweekSortOrder === "desc" ? "↓" : "↑"}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead 
                    className="text-center min-w-[80px] font-bold cursor-pointer hover:bg-muted/50 bg-orange-50"
                    onClick={handleTotalSort}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {activeGameweeks.length} GW DC
                      {sortByTotal && (
                        <span className="text-xs">
                          {totalSortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center min-w-[80px] cursor-pointer hover:bg-muted/50"
                    onClick={handleAvgSort}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Avg
                      {sortByAvg && (
                        <span className="text-xs">
                          {avgSortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center min-w-[80px] font-bold cursor-pointer hover:bg-muted/50 bg-blue-50"
                    onClick={handleDCPointsSort}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {activeGameweeks.length}GW DC Pts
                      {sortByDCPoints && (
                        <span className="text-xs">
                          {dcPointsSortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      <div className="flex flex-col">
                        <span>{(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {player.position.slice(0, 3).toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {player.teamName.slice(0, 3).toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono sticky left-[150px] bg-background z-10 px-1 py-2">
                      {player.currentSeasonStats.dcPer90.toFixed(1)}
                    </TableCell>
                    {player.gameweekProjections
                      .filter(gw => activeGameweeks.includes(gw.gameweek))
                      .map((gw) => (
                      <TableCell key={gw.gameweek} className="text-center">
                        <div className={`p-2 rounded text-sm ${getOpponentColor(gw.opponentTier)} ${gw.isActual ? 'border-2 border-blue-400' : ''}`}>
                          <div className="font-bold">
                            {gw.defensiveContribution.toFixed(1)}
                            {gw.isActual && <span className="text-xs ml-1 text-blue-600">✓</span>}
                          </div>
                          {showOpponent && (
                            <div className="text-xs">
                              vs {gw.opponent}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold bg-orange-50">
                      <span className="text-lg font-bold text-orange-900">
                        {player.totalDC.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {player.avgDC.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center font-bold bg-blue-50">
                      <span className="text-lg font-bold text-blue-900">
                        {player.totalDCPoints}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Opponent Difficulty</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 dark:bg-red-900/10 border border-red-200 rounded"></div>
                  <span>Elite Attack Teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 rounded"></div>
                  <span>Strong Attack Teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-50 dark:bg-gray-900/10 border border-gray-200 rounded"></div>
                  <span>Average Attack Teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded"></div>
                  <span>Weak Attack Teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded"></div>
                  <span>Promoted Teams</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Types</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 rounded"></div>
                  <span className="text-blue-600">✓</span>
                  <span>Actual data from completed gameweeks/fixtures</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>Projected data for future gameweeks</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
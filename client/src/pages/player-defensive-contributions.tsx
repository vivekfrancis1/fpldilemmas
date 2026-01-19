import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Filter, Clock, Target, Search, Loader2, X } from "lucide-react";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

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
    isHome?: boolean;
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

  // Create availability map for player availability badges
  const playerAvailabilityMap = usePlayerAvailabilityMap(bootstrapData);

  // Calculate current gameweek and upcoming gameweeks from bootstrap data
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return null; // Return null until data loads
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    if (currentEvent) return currentEvent.id;
    // Fallback: find first unfinished event
    const nextEvent = bootstrapData.events.find(e => !e.finished);
    return nextEvent ? nextEvent.id : 38;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek ? Math.min(currentGameweek + 1, 38) : null;

  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [gameweekSortColumn, setGameweekSortColumn] = useState<number | null>(null);
  const [gameweekSortOrder, setGameweekSortOrder] = useState<"asc" | "desc">("desc");
  const [sortByCurrentDC, setSortByCurrentDC] = useState<boolean>(false);
  const [currentDCSortOrder, setCurrentDCSortOrder] = useState<"asc" | "desc">("desc");
  const [sortByTotal, setSortByTotal] = useState<boolean>(false);
  const [totalSortOrder, setTotalSortOrder] = useState<"asc" | "desc">("desc");
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Dynamic gameweek range state - only set once bootstrap data is loaded
  const [gameweekRange, setGameweekRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  
  // Update range when bootstrap data loads and currentGameweek becomes available
  useEffect(() => {
    if (nextGameweek && nextGameweek > 0) {
      const start = nextGameweek;
      const end = Math.min(nextGameweek + 11, 38);
      setGameweekRange({ start, end });
      // Also set display range
      setStartGameweek(start);
      setEndGameweek(Math.min(start + 5, 38));
    }
  }, [nextGameweek]);

  // Fetch defensive contribution projections using new formula-based endpoint with current season data
  // Only fetch when gameweekRange is valid (after bootstrap data loads)
  const { data: defensiveData, isLoading } = useQuery({
    queryKey: ["player-defensive-contributions-current-season", gameweekRange.start, gameweekRange.end],
    queryFn: () => fetch(`/api/player-defensive-contributions-projections?startGameweek=${gameweekRange.start}&endGameweek=${gameweekRange.end}`).then(res => res.json()),
    staleTime: 1 * 60 * 1000, // 1 minute to see changes faster
    enabled: gameweekRange.start > 0 && gameweekRange.end > 0, // Only fetch when range is valid
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
        let isHome = false;
        if (fixture && playerTeamId) {
          if (fixture.team_h === playerTeamId) {
            opponentId = fixture.team_a;
            isHome = true;
          } else {
            opponentId = fixture.team_h;
            isHome = false;
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
          isHome,
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
    : gameweekRange.start > 0 ? Array.from({ length: 12 }, (_, i) => gameweekRange.start + i).filter(gw => gw <= 38) : [];
  
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

  // Helper to get adjusted total for sorting with per-gameweek multipliers
  const getAdjustedTotalDC = (player: any) => {
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const gwMultipliers = applyAvailability 
      ? getGameweekMultipliers(playerInfo, activeGameweeks, currentGameweek, bootstrapData)
      : {};
    let total = 0;
    player.gameweekProjections.forEach((gw: any) => {
      if (activeGameweeks.includes(gw.gameweek)) {
        const mult = gwMultipliers[gw.gameweek] ?? 1;
        total += gw.defensiveContribution * mult;
      }
    });
    return total;
  };

  const getAdjustedTotalDCPoints = (player: any) => {
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const gwMultipliers = applyAvailability 
      ? getGameweekMultipliers(playerInfo, activeGameweeks, currentGameweek, bootstrapData)
      : {};
    let total = 0;
    player.gameweekProjections.forEach((gw: any) => {
      if (activeGameweeks.includes(gw.gameweek)) {
        const mult = gwMultipliers[gw.gameweek] ?? 1;
        total += gw.dcPoints * mult;
      }
    });
    return total;
  };

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

    // Position filter - normalize both sides for comparison
    if (selectedPositions.size > 0 && !selectedPositions.has('_none_')) {
      filtered = filtered.filter(p => {
        const normalizedPos = normalizePosition(p.position);
        return Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
      });
    } else if (selectedPositions.has('_none_')) {
      filtered = [];
    }

    // Team filter
    if (selectedTeams.size > 0 && !selectedTeams.has('_none_')) {
      filtered = filtered.filter(p => selectedTeams.has(p.teamName));
    } else if (selectedTeams.has('_none_')) {
      filtered = [];
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
        const aValue = getAdjustedTotalDC(a);
        const bValue = getAdjustedTotalDC(b);
        return totalSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }
    // Sort by gameweek column if specified
    else if (gameweekSortColumn !== null) {
      filtered.sort((a, b) => {
        const aGameweek = a.gameweekProjections.find((gw: any) => gw.gameweek === gameweekSortColumn);
        const bGameweek = b.gameweekProjections.find((gw: any) => gw.gameweek === gameweekSortColumn);
        
        const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
        const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
        const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gameweekSortColumn], currentGameweek, bootstrapData) : {};
        const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gameweekSortColumn], currentGameweek, bootstrapData) : {};
        
        const aValue = (aGameweek?.defensiveContribution || 0) * (aMultipliers[gameweekSortColumn] ?? 1);
        const bValue = (bGameweek?.defensiveContribution || 0) * (bMultipliers[gameweekSortColumn] ?? 1);
        
        return gameweekSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }
    // Default sort by total DC
    else {
      filtered.sort((a, b) => {
        const aValue = getAdjustedTotalDC(a);
        const bValue = getAdjustedTotalDC(b);
        return bValue - aValue; // Always sort by total DC descending
      });
    }

    return filtered;
  }, [playersWithTotals, searchTerm, selectedPositions, selectedTeams, gameweekSortColumn, gameweekSortOrder, sortByCurrentDC, currentDCSortOrder, sortByTotal, totalSortOrder, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData, activeGameweeks]);

  // Get unique values for filters
  const positions = Array.from(new Set(players.map(p => p.position).filter(Boolean)));
  const teams = Array.from(new Set(players.map(p => p.teamName).filter(Boolean))).sort();

  // Toggle functions for multi-select
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


  const handleGameweekSort = (gameweek: number) => {
    setSortByCurrentDC(false);
    setSortByTotal(false);
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
    if (sortByTotal) {
      setTotalSortOrder(totalSortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortByTotal(true);
      setTotalSortOrder("desc");
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


  if (isLoading || !defensiveData || players.length === 0) {
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
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-6">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Controls
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 md:hidden">
                    {isFiltersOpen ? 'Tap to collapse' : 'Tap to expand'}
                  </span>
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
                onClick={() => setApplyAvailability(!applyAvailability)}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto ${
                  applyAvailability 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                }`}
                data-testid="button-toggle-availability"
              >
                {applyAvailability ? "Availability Adjustment: ON" : "Availability Adjustment: OFF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOpponent(!showOpponent)}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1 h-auto ${
                  showOpponent 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                }`}
                data-testid="button-toggle-opponent"
              >
                {showOpponent ? "Hide Opponent" : "Show Opponent"}
              </Button>
            </div>
          </div>

          {/* Position Toggle Section */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Positions:</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPositions(new Set())}
                  className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-300">All</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedPositions(new Set(['_none_']))}
                  className="text-xs px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border-red-300">None</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {['Defender', 'Midfielder', 'Forward'].map(pos => {
                const isSelected = selectedPositions.size === 0 || selectedPositions.has(pos);
                const shortForm = pos === 'Defender' ? 'DEF' : pos === 'Midfielder' ? 'MID' : 'FWD';
                return (
                  <Button key={pos} variant="outline" size="sm" onClick={() => togglePositionSelection(pos)}
                    className={`text-xs px-2 py-1 ${isSelected ? 'bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-300' : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'}`}
                    data-testid={`button-toggle-position-${pos}`}>{shortForm}</Button>
                );
              })}
            </div>
          </div>

          {/* Team Toggle Section */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Teams:</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedTeams(new Set())}
                  className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-300">All</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedTeams(new Set(['_none_']))}
                  className="text-xs px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border-red-300">None</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {teams.map(team => {
                const isSelected = selectedTeams.size === 0 || selectedTeams.has(team);
                return (
                  <Button key={team} variant="outline" size="sm" onClick={() => toggleTeamSelection(team)}
                    className={`text-xs px-2 py-1 ${isSelected ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300' : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'}`}
                    data-testid={`button-toggle-team-${team}`}>{team}</Button>
                );
              })}
            </div>
          </div>
        </CardContent>
        </CollapsibleContent>
        </Card>
      </Collapsible>

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
                  <TableHead className="sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[100px] md:min-w-[150px] px-1 md:px-3 text-xs md:text-sm">
                    Player
                  </TableHead>

                  <TableHead 
                    className="hidden md:table-cell min-w-[60px] cursor-pointer hover:bg-muted/50 px-1 md:px-2 text-xs"
                    onClick={handleCurrentDCSort}
                  >
                    <div className="flex items-center justify-center gap-1">
                      DC/g
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
                      className="text-center min-w-[40px] md:min-w-[50px] cursor-pointer hover:bg-muted/50 px-1 text-xs md:text-sm"
                      onClick={() => handleGameweekSort(gw)}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {gw}
                        {gameweekSortColumn === gw && (
                          <span className="text-xs">
                            {gameweekSortOrder === "desc" ? "↓" : "↑"}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead 
                    className="text-center min-w-[50px] md:min-w-[70px] font-bold cursor-pointer hover:bg-muted/50 bg-orange-50 px-1 text-xs md:text-sm"
                    onClick={handleTotalSort}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Total
                      {sortByTotal && (
                        <span className="text-xs">
                          {totalSortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => {
                  const playerInfo = playerAvailabilityMap?.get(player.playerId);
                  const gwMultipliers = applyAvailability 
                    ? getGameweekMultipliers(playerInfo, activeGameweeks, currentGameweek, bootstrapData)
                    : {};
                  const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                  
                  let adjustedTotalDC = 0;
                  let originalTotalDC = 0;
                  player.gameweekProjections
                    .filter(gw => activeGameweeks.includes(gw.gameweek))
                    .forEach(gw => {
                      const mult = gwMultipliers[gw.gameweek] ?? 1;
                      adjustedTotalDC += gw.defensiveContribution * mult;
                      originalTotalDC += gw.defensiveContribution;
                    });
                  
                  return (
                  <TableRow key={player.playerId}>
                    <TableCell className="font-medium sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 px-1 md:px-3 min-w-[100px] md:min-w-[150px]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-0.5 flex-wrap">
                          <span className="font-semibold text-xs md:text-sm text-gray-900 truncate max-w-[80px] md:max-w-none">{(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}</span>
                          {playerAvailabilityMap && playerAvailabilityMap.get(player.playerId) && (
                            <PlayerAvailabilityBadge player={playerAvailabilityMap.get(player.playerId)!} />
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] md:text-xs px-1">
                            {player.position.slice(0, 3).toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] md:text-xs px-1">
                            {player.teamName.slice(0, 3).toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono px-1 py-2 text-xs">
                      {player.currentSeasonStats.dcPer90.toFixed(1)}
                    </TableCell>
                    {player.gameweekProjections
                      .filter(gw => activeGameweeks.includes(gw.gameweek))
                      .map((gw) => {
                        const multiplier = gwMultipliers[gw.gameweek] ?? 1;
                        const displayDC = gw.defensiveContribution * multiplier;
                        const hasGwAdjustment = applyAvailability && multiplier !== 1;
                        return (
                      <TableCell key={gw.gameweek} className="text-center min-w-[40px] md:min-w-[50px] px-1">
                        <div className={`p-1 md:p-2 rounded text-xs md:text-sm ${getOpponentColor(gw.opponentTier)} ${gw.isActual ? 'border-2 border-blue-400' : ''}`}>
                          {hasGwAdjustment && !gw.isActual ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-purple-700">{displayDC.toFixed(1)}</span>
                              <span className="text-gray-400 line-through text-xs">{gw.defensiveContribution.toFixed(1)}</span>
                            </div>
                          ) : (
                            <div className="font-bold">
                              {gw.isActual ? gw.defensiveContribution.toFixed(1) : displayDC.toFixed(1)}
                              {gw.isActual && <span className="text-xs ml-1 text-blue-600">✓</span>}
                            </div>
                          )}
                          {showOpponent && (
                            <div className={`text-xs ${gw.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                              {gw.opponent} ({gw.isHome ? 'H' : 'A'})
                            </div>
                          )}
                        </div>
                      </TableCell>
                        );
                    })}
                    <TableCell className={`text-center font-bold ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-orange-50'}`}>
                      {hasAnyAdjustment ? (
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-bold text-purple-700">{adjustedTotalDC.toFixed(1)}</span>
                          <span className="text-gray-400 line-through text-xs">{originalTotalDC.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-orange-900">{adjustedTotalDC.toFixed(1)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
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
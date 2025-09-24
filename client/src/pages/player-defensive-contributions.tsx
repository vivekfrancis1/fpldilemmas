import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Download, Filter, Clock, Target } from "lucide-react";

interface BootstrapData {
  events: Array<{ id: number; is_current: boolean; finished: boolean }>;
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

  // Calculate current gameweek and upcoming gameweeks
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek + 1;

  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showOnlyTopPlayers, setShowOnlyTopPlayers] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("defensive-contributions");
  const [startGameweek, setStartGameweek] = useState<number>(0); // Will be set to current + 1
  const [endGameweek, setEndGameweek] = useState<number>(0); // Will be set to current + 6
  const [gameweekSortColumn, setGameweekSortColumn] = useState<number | null>(null);
  const [gameweekSortOrder, setGameweekSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch defensive contribution projections from cache
  const { data: defensiveData, isLoading } = useQuery({
    queryKey: ["/api/cached/player-defensive-projections"],
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Transform cached data to match expected format
  const players: PlayerDefensiveData[] = useMemo(() => {
    if (!defensiveData || !bootstrapData) return [];
    
    // Create gameweek projections for next 6 gameweeks
    const futureGameweeks = Array.from({ length: 6 }, (_, i) => nextGameweek + i);
    
    // Transform the cached data format to match the expected PlayerDefensiveData interface
    return defensiveData.map((record: any) => {
      // Create projections for each future gameweek using historical averages
      const gameweekProjections = futureGameweeks.map(gw => ({
        gameweek: gw,
        defensiveContribution: Math.round(record.defensiveContributionPer90 || 0), // Per game projection
        tackles: Math.round(record.tacklesPer90 || 0),
        recoveries: Math.round(record.recoveriesPer90 || 0), 
        cbi: Math.round(record.cbiPer90 || 0),
        opponent: "TBD", // Placeholder since we don't have fixture data
        opponentTier: "2", // Default tier
        fixtureMultiplier: 1.0, // Default multiplier
        isProjected: true,
      }));

      return {
        playerId: record.playerId,
        playerName: record.playerName,
        position: record.position,
        teamName: record.teamName || '',
        teamCode: record.teamCode || 0,
        currentSeasonStats: {
          dcPer90: record.defensiveContributionPer90 || 0,
          tacklesPer90: record.tacklesPer90 || 0,
          recoveriesPer90: record.recoveriesPer90 || 0,
          cbiPer90: record.cbiPer90 || 0,
        },
        gameweekProjections,
        form: record.form || 0,
        confidence: record.confidence || 0.5,
      };
    });
  }, [defensiveData, bootstrapData, nextGameweek]);

  // Get all gameweeks from the first player's projections (only future gameweeks) - provide fallback
  const allGameweeks = players.length > 0 && players[0].gameweekProjections.length > 0 
    ? players[0].gameweekProjections.map(gw => gw.gameweek).filter(gw => gw >= nextGameweek)
    : Array.from({ length: 6 }, (_, i) => nextGameweek + i); // Fallback to next 6 gameweeks
  
  // Set default gameweek range (next 6 gameweeks) on first load
  React.useEffect(() => {
    if (allGameweeks.length > 0 && startGameweek === 0) {
      setStartGameweek(nextGameweek);
      setEndGameweek(Math.min(nextGameweek + 5, 38));
    }
  }, [allGameweeks, startGameweek, nextGameweek]);
  
  // Filter gameweeks based on selected range
  const gameweeks = allGameweeks.filter(gw => gw >= startGameweek && gw <= endGameweek);

  // Calculate totals for each player
  const playersWithTotals = useMemo(() => {
    return players.map(player => {
      // Calculate defensive contribution points for each gameweek
      const gameweekPoints = player.gameweekProjections.map(gw => {
        let dcPoints = 0;
        const dc = gw.defensiveContribution;
        
        if (player.position === "Goalkeeper") {
          dcPoints = 0; // Goalkeepers don't get DC points
        } else if (player.position === "Defender") {
          dcPoints = dc >= 10 ? 2 : 0; // Defenders need 10+ DC for 2 points
        } else {
          dcPoints = dc >= 12 ? 2 : 0; // Midfielders/Forwards need 12+ DC for 2 points
        }
        
        return { ...gw, dcPoints };
      });
      
      // Filter projections to selected gameweek range
      const filteredProjections = gameweekPoints.filter(gw => gw.gameweek >= startGameweek && gw.gameweek <= endGameweek);
      
      return {
        ...player,
        gameweekProjections: filteredProjections,
        totalDC: filteredProjections.reduce((sum, gw) => sum + gw.defensiveContribution, 0),
        avgDC: filteredProjections.length > 0 ? filteredProjections.reduce((sum, gw) => sum + gw.defensiveContribution, 0) / filteredProjections.length : 0,
        totalTackles: filteredProjections.reduce((sum, gw) => sum + gw.tackles, 0),
        totalRecoveries: filteredProjections.reduce((sum, gw) => sum + gw.recoveries, 0),
        totalCBI: filteredProjections.reduce((sum, gw) => sum + gw.cbi, 0),
        totalDCPoints: filteredProjections.reduce((sum, gw) => sum + gw.dcPoints, 0),
        avgDCPoints: filteredProjections.length > 0 ? filteredProjections.reduce((sum, gw) => sum + gw.dcPoints, 0) / filteredProjections.length : 0
      };
    });
  }, [players, startGameweek, endGameweek]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = playersWithTotals;

    // Position filter
    if (selectedPosition !== "all") {
      filtered = filtered.filter(p => p.position === selectedPosition);
    }

    // Team filter
    if (selectedTeam !== "all") {
      filtered = filtered.filter(p => p.teamName === selectedTeam);
    }

    // Top players filter (only show players with meaningful contributions)
    if (showOnlyTopPlayers) {
      filtered = filtered.filter(p => p.totalDC > 5); // Only players with >5 total DC across 6 gameweeks
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case "total":
          aValue = a.totalDC;
          bValue = b.totalDC;
          break;
        case "average":
          aValue = a.avgDC;
          bValue = b.avgDC;
          break;
        case "current":
          aValue = a.currentSeasonStats.dcPer90;
          bValue = b.currentSeasonStats.dcPer90;
          break;
        case "points":
          aValue = a.totalDCPoints;
          bValue = b.totalDCPoints;
          break;
        case "name":
          return sortOrder === "desc" 
            ? b.playerName.localeCompare(a.playerName)
            : a.playerName.localeCompare(b.playerName);
        default:
          aValue = a.totalDC;
          bValue = b.totalDC;
      }
      
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

    // Sort by gameweek column if specified
    if (gameweekSortColumn !== null) {
      filtered.sort((a, b) => {
        const aGameweek = a.gameweekProjections.find(gw => gw.gameweek === gameweekSortColumn);
        const bGameweek = b.gameweekProjections.find(gw => gw.gameweek === gameweekSortColumn);
        
        const aValue = activeTab === "points" 
          ? (aGameweek?.dcPoints || 0)
          : (aGameweek?.defensiveContribution || 0);
        const bValue = activeTab === "points"
          ? (bGameweek?.dcPoints || 0) 
          : (bGameweek?.defensiveContribution || 0);
        
        return gameweekSortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
    }

    return filtered;
  }, [playersWithTotals, selectedPosition, selectedTeam, sortBy, sortOrder, showOnlyTopPlayers, gameweekSortColumn, gameweekSortOrder, activeTab]);

  // Get unique values for filters
  const positions = Array.from(new Set(players.map(p => p.position).filter(Boolean)));
  const teams = Array.from(new Set(players.map(p => p.teamName).filter(Boolean))).sort();

  const handleSort = (column: string) => {
    // Clear gameweek sorting when sorting by other columns
    setGameweekSortColumn(null);
    
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleGameweekSort = (gameweek: number) => {
    // Clear general sorting when sorting by gameweek
    setSortBy("");
    
    if (gameweekSortColumn === gameweek) {
      setGameweekSortOrder(gameweekSortOrder === "desc" ? "asc" : "desc");
    } else {
      setGameweekSortColumn(gameweek);
      setGameweekSortOrder("desc");
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

  const exportToCSV = () => {
    if (activeTab === "defensive-contributions") {
      const headers = ['Player', 'Position', 'Team', 'Current DC/90', ...gameweeks.map(gw => `GW${gw}`), 'Total', 'Average'];
      const rows = filteredPlayers.map(player => [
        player.playerName,
        player.position,
        player.teamName,
        player.currentSeasonStats.dcPer90.toFixed(2),
        ...player.gameweekProjections.map(gw => gw.defensiveContribution.toFixed(1)),
        player.totalDC.toFixed(1),
        player.avgDC.toFixed(1)
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'defensive-contributions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Player', 'Position', 'Team', 'Current DC/90', ...gameweeks.map(gw => `GW${gw} Points`), 'Total Points', 'Average Points'];
      const rows = filteredPlayers.map(player => [
        player.playerName,
        player.position,
        player.teamName,
        player.currentSeasonStats.dcPer90.toFixed(2),
        ...player.gameweekProjections.map(gw => gw.dcPoints),
        player.totalDCPoints,
        player.avgDCPoints.toFixed(1)
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'defensive-contribution-points.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading defensive contributions...</span>
        </div>
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
            <h1>Player Defensive Contributions</h1>
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
                  <p className="text-sm font-medium text-orange-900">Gameweeks</p>
                  <p className="text-2xl font-bold text-orange-700">{gameweeks.length}</p>
                  <p className="text-sm text-orange-600">
                    {gameweeks.length > 0 ? `GW${gameweeks[0]} - GW${gameweeks[gameweeks.length - 1]}` : "Select range"}
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
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Position</label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-32">
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Start GW</label>
              <Select value={startGameweek.toString()} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allGameweeks.map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">End GW</label>
              <Select value={endGameweek.toString()} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allGameweeks.filter(gw => gw >= startGameweek).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total DC</SelectItem>
                  <SelectItem value="average">Average DC</SelectItem>
                  <SelectItem value="points">Total DC Points</SelectItem>
                  <SelectItem value="current">Current DC/90</SelectItem>
                  <SelectItem value="name">Player Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Quick Select</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (allGameweeks.length > 0) {
                      setStartGameweek(allGameweeks[0]);
                      setEndGameweek(Math.min(allGameweeks[0] + 5, allGameweeks[allGameweeks.length - 1]));
                    }
                  }}
                >
                  Next 6 GWs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (allGameweeks.length > 0) {
                      setStartGameweek(allGameweeks[0]);
                      setEndGameweek(allGameweeks[allGameweeks.length - 1]);
                    }
                  }}
                >
                  All Season
                </Button>
              </div>
            </div>

            <Button
              variant={showOnlyTopPlayers ? "default" : "outline"}
              onClick={() => setShowOnlyTopPlayers(!showOnlyTopPlayers)}
            >
              Top Players Only
            </Button>

            <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Defensive Contributions by Gameweek</CardTitle>
          <CardDescription>
            Fixture-aware projections with opponent difficulty indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="defensive-contributions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Defensive Contributions
              </TabsTrigger>
              <TabsTrigger value="points" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Points from DC
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="defensive-contributions" className="mt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 sticky left-0 bg-background z-10 min-w-[150px]"
                    onClick={() => handleSort("name")}
                  >
                    Player
                  </TableHead>

                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 sticky left-[150px] bg-background z-10 min-w-[100px]"
                    onClick={() => handleSort("current")}
                  >
                    Current/90
                  </TableHead>
                  {gameweeks.map(gw => (
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
                    className="cursor-pointer hover:bg-muted/50 text-center min-w-[80px] font-bold"
                    onClick={() => handleSort("total")}
                  >
                    Total
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-center min-w-[80px]"
                    onClick={() => handleSort("average")}
                  >
                    Avg
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      <div className="flex flex-col">
                        <span>{player.playerName}</span>
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
                    <TableCell className="font-mono sticky left-[150px] bg-background z-10">
                      {player.currentSeasonStats.dcPer90.toFixed(1)}
                    </TableCell>
                    {player.gameweekProjections.map((gw) => (
                      <TableCell key={gw.gameweek} className="text-center">
                        <div className={`p-2 rounded text-sm ${getOpponentColor(gw.opponentTier)} ${gw.isActual ? 'border-2 border-blue-400' : ''}`}>
                          <div className="font-bold">
                            {gw.defensiveContribution.toFixed(1)}
                            {gw.isActual && <span className="text-xs ml-1 text-blue-600">✓</span>}
                          </div>
                          <div className="text-xs">
                            vs {gw.opponent}
                          </div>
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold">
                      {player.totalDC.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {player.avgDC.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="points" className="mt-4">
          <div className="mb-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">FPL Defensive Contribution Points Rules:</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>Defenders:</strong> 2 points for 10+ Defensive Contributions (CBI + Tackles)</li>
                <li>• <strong>Midfielders/Forwards:</strong> 2 points for 12+ Defensive Contributions (CBI + Tackles + Recoveries)</li>
                <li>• <strong>Goalkeepers:</strong> Do not receive Defensive Contribution points</li>
              </ul>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50 sticky left-0 bg-background z-10 min-w-[150px]">
                    Player
                  </TableHead>

                  <TableHead className="sticky left-[310px] bg-background z-10 min-w-[100px]">
                    Current/90
                  </TableHead>
                  {gameweeks.map(gw => (
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
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-center min-w-[80px] font-bold">
                    Total Pts
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    Avg Pts
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      <div className="flex flex-col">
                        <span>{player.playerName}</span>
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
                    <TableCell className="font-mono sticky left-[150px] bg-background z-10">
                      {player.currentSeasonStats.dcPer90.toFixed(1)}
                    </TableCell>
                    {player.gameweekProjections.map((gw) => (
                      <TableCell key={gw.gameweek} className="text-center">
                        <div className={`p-2 rounded text-sm ${getOpponentColor(gw.opponentTier)} ${gw.isActual ? 'border-2 border-blue-400' : ''}`}>
                          <div className="font-bold text-lg">
                            {gw.dcPoints}
                            {gw.isActual && <span className="text-xs ml-1 text-blue-600">✓</span>}
                          </div>
                          <div className="text-xs">
                            DC: {gw.defensiveContribution.toFixed(1)}
                          </div>
                          <div className="text-xs">
                            vs {gw.opponent}
                          </div>
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-lg">
                      {player.totalDCPoints}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {player.avgDCPoints.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        </Tabs>
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
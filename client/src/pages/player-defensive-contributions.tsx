import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Download, Filter, Clock } from "lucide-react";

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
  }>;
  form: number;
  confidence: number;
}

export default function PlayerDefensiveContributions() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showOnlyTopPlayers, setShowOnlyTopPlayers] = useState<boolean>(true);

  // Fetch defensive contribution projections
  const { data: defensiveData, isLoading } = useQuery({
    queryKey: ["/api/defensive-contribution-projections"],
    queryFn: async () => {
      const response = await fetch("/api/defensive-contribution-projections");
      if (!response.ok) throw new Error("Failed to fetch defensive projections");
      return response.json();
    }
  });

  const players: PlayerDefensiveData[] = defensiveData?.data || [];

  // Get all gameweeks from the first player's projections
  const gameweeks = players.length > 0 ? players[0].gameweekProjections.map(gw => gw.gameweek) : [];

  // Calculate totals for each player
  const playersWithTotals = useMemo(() => {
    return players.map(player => ({
      ...player,
      totalDC: player.gameweekProjections.reduce((sum, gw) => sum + gw.defensiveContribution, 0),
      avgDC: player.gameweekProjections.reduce((sum, gw) => sum + gw.defensiveContribution, 0) / player.gameweekProjections.length,
      totalTackles: player.gameweekProjections.reduce((sum, gw) => sum + gw.tackles, 0),
      totalRecoveries: player.gameweekProjections.reduce((sum, gw) => sum + gw.recoveries, 0),
      totalCBI: player.gameweekProjections.reduce((sum, gw) => sum + gw.cbi, 0)
    }));
  }, [players]);

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

    return filtered;
  }, [playersWithTotals, selectedPosition, selectedTeam, sortBy, sortOrder, showOnlyTopPlayers]);

  // Get unique values for filters
  const positions = Array.from(new Set(players.map(p => p.position)));
  const teams = Array.from(new Set(players.map(p => p.teamName))).sort();

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
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
    <div className="p-6 max-w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Player Defensive Contributions
        </h1>
        <p className="text-muted-foreground mt-2">
          Gameweek-by-gameweek defensive contribution projections in table format
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPlayers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {filteredPlayers[0]?.playerName || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredPlayers[0]?.totalDC.toFixed(1) || "0"} total DC
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPlayers.length > 0 ? 
                (filteredPlayers.reduce((sum, p) => sum + p.totalDC, 0) / filteredPlayers.length).toFixed(1) : "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gameweeks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameweeks.length}</div>
            <div className="text-sm text-muted-foreground">
              GW{gameweeks[0]} - GW{gameweeks[gameweeks.length - 1]}
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
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total DC</SelectItem>
                  <SelectItem value="average">Average DC</SelectItem>
                  <SelectItem value="current">Current DC/90</SelectItem>
                  <SelectItem value="name">Player Name</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Defensive Contributions by Gameweek</CardTitle>
          <CardDescription>
            Fixture-aware projections with opponent difficulty indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableHead className="sticky left-[150px] bg-background z-10 min-w-[80px]">Pos</TableHead>
                  <TableHead className="sticky left-[230px] bg-background z-10 min-w-[80px]">Team</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 sticky left-[310px] bg-background z-10 min-w-[100px]"
                    onClick={() => handleSort("current")}
                  >
                    Current/90
                  </TableHead>
                  {gameweeks.map(gw => (
                    <TableHead key={gw} className="text-center min-w-[100px]">
                      GW{gw}
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
                      {player.playerName}
                    </TableCell>
                    <TableCell className="sticky left-[150px] bg-background z-10">
                      <Badge variant="outline" className="text-xs">
                        {player.position.slice(0, 3).toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="sticky left-[230px] bg-background z-10">
                      {player.teamName}
                    </TableCell>
                    <TableCell className="font-mono sticky left-[310px] bg-background z-10">
                      {player.currentSeasonStats.dcPer90.toFixed(1)}
                    </TableCell>
                    {player.gameweekProjections.map((gw) => (
                      <TableCell key={gw.gameweek} className="text-center">
                        <div className={`p-2 rounded text-sm ${getOpponentColor(gw.opponentTier)}`}>
                          <div className="font-bold">
                            {gw.defensiveContribution.toFixed(1)}
                          </div>
                          <div className="text-xs">
                            vs {gw.opponent}
                          </div>
                          <div className="text-xs font-medium">
                            {gw.fixtureMultiplier}x
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
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Opponent Difficulty Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 dark:bg-red-900/10 border border-red-200 rounded"></div>
              <span>Elite Attack (1.5x multiplier)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 rounded"></div>
              <span>Strong Attack (1.3x multiplier)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 dark:bg-gray-900/10 border border-gray-200 rounded"></div>
              <span>Average Attack (1.0x multiplier)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded"></div>
              <span>Weak Attack (0.8x multiplier)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded"></div>
              <span>Promoted Team (0.5x multiplier)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
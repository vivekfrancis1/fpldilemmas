import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, TrendingUp, BarChart3, Clock } from "lucide-react";
import ProtectedRoute from "@/components/protected-route";

interface DefensiveProjection {
  playerId: number;
  playerName: string;
  position: string;
  teamName: string;
  teamCode: number;
  currentSeasonMinutes: number;
  historicalSeasons: number;
  currentSeasonStats: {
    defensiveContribution: number;
    tackles: number;
    recoveries: number;
    cbi: number;
    dcPer90: number;
    tacklesPer90: number;
    recoveriesPer90: number;
    cbiPer90: number;
  };
  projectedDefensiveContribution: number;
  projectedTackles: number;
  projectedRecoveries: number;
  projectedCBI: number;
  form: number;
  confidence: number;
  gameweekProjections: Array<{
    gameweek: number;
    defensiveContribution: number;
    tackles: number;
    recoveries: number;
    cbi: number;
    minutes: number;
    opponent: string;
    opponentTier: string;
    fixtureMultiplier: number;
  }>;
}

interface HistoricalData {
  playerId: number;
  playerName: string;
  position: string;
  teamName: string;
  season: string;
  defensiveContribution: number;
  tackles: number;
  recoveries: number;
  clearancesBlocksInterceptions: number;
  minutes: number;
  defensiveContributionPer90: number;
  tacklesPer90: number;
  recoveriesPer90: number;
  cbiPer90: number;
}

export default function DefensiveContributionProjections() {
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("projectedDefensiveContribution");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch defensive contribution projections
  const { data: defensiveData, isLoading: defensiveLoading } = useQuery({
    queryKey: ["/api/defensive-contribution-projections"],
    queryFn: async () => {
      const response = await fetch("/api/defensive-contribution-projections");
      if (!response.ok) throw new Error("Failed to fetch defensive projections");
      return response.json();
    }
  });

  // Use the projections data directly from API
  const defensiveProjections = defensiveData?.data || [];

  // Filter and sort projections
  const filteredProjections = useMemo(() => {
    let filtered = defensiveProjections;

    if (selectedPosition !== "all") {
      filtered = filtered.filter(p => p.position === selectedPosition);
    }

    if (selectedTeam !== "all") {
      filtered = filtered.filter(p => p.teamName === selectedTeam);
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof DefensiveProjection] as number;
      const bValue = b[sortBy as keyof DefensiveProjection] as number;
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [defensiveProjections, selectedPosition, selectedTeam, sortBy, sortOrder]);

  // Get unique values for filters
  const positions = [...new Set(defensiveProjections.map(p => p.position))];
  const teams = [...new Set(defensiveProjections.map(p => p.teamName))].sort();

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (defensiveLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading defensive projections...</span>
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
            <h1>Defensive Contribution Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Fixture-aware defensive projections with up to 50% variance based on opponent attacking strength
          </p>
          <div className="fpl-page-tagline">
            Uses position-specific calculations: Defenders (CBI + Tackles), Midfielders/Forwards (CBI + Tackles + Recoveries)
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProjections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Defender</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {filteredProjections[0]?.playerName || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredProjections[0]?.projectedDefensiveContribution.toFixed(2)} per 90
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(filteredProjections.reduce((sum, p) => sum + p.projectedDefensiveContribution, 0) / 
                Math.max(filteredProjections.length, 1)).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">High Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredProjections.filter(p => p.confidence >= 0.8).length}
            </div>
            <div className="text-sm text-muted-foreground">Players (80%+ confidence)</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gameweeks">Gameweek Projections</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Defensive Contribution Overview</CardTitle>
              <CardDescription>
                Players ranked by projected defensive contribution per 90 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("playerName")}
                    >
                      Player
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("position")}
                    >
                      Position
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("teamName")}
                    >
                      Team
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("projectedDefensiveContribution")}
                    >
                      Projected DC/90
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("projectedTackles")}
                    >
                      Tackles/90
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("projectedRecoveries")}
                    >
                      Recoveries/90
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("confidence")}
                    >
                      Confidence
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjections.slice(0, 50).map((player) => (
                    <TableRow key={player.playerId}>
                      <TableCell className="font-medium">{player.playerName}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell>{player.teamName}</TableCell>
                      <TableCell className="font-mono">
                        {player.projectedDefensiveContribution.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {player.projectedTackles.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {player.projectedRecoveries.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-2 h-2 rounded-full ${getConfidenceColor(player.confidence)}`}
                          />
                          <span className="text-sm">{(player.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gameweeks">
          <Card>
            <CardHeader>
              <CardTitle>Next 6 Gameweeks Projections</CardTitle>
              <CardDescription>
                Fixture-aware defensive projections with up to 50% variance based on opponent attacking strength
              </CardDescription>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Opponent Difficulty Legend:</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 dark:bg-red-900/20 border border-red-200 rounded"></div>
                    <span>Elite (1.5x)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 rounded"></div>
                    <span>Strong (1.3x)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-muted border-border border rounded"></div>
                    <span>Average (1.0x)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 rounded"></div>
                    <span>Weak (0.8x)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 dark:bg-green-900/20 border border-green-200 rounded"></div>
                    <span>Promoted (0.5x)</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProjections.slice(0, 20).map((player) => (
                  <div key={player.playerId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{player.playerName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {player.position} - {player.teamName}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {player.projectedDefensiveContribution.toFixed(2)}/90
                      </Badge>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {player.gameweekProjections.map((gw) => {
                        const tierColor = gw.opponentTier === 'elite' ? 'bg-red-100 dark:bg-red-900/20 border-red-200' :
                                        gw.opponentTier === 'strong' ? 'bg-orange-100 dark:bg-orange-900/20 border-orange-200' :
                                        gw.opponentTier === 'average' ? 'bg-muted border-border' :
                                        gw.opponentTier === 'weak' ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-200' :
                                        'bg-green-100 dark:bg-green-900/20 border-green-200';
                        
                        return (
                          <div key={gw.gameweek} className={`text-center p-2 rounded border ${tierColor}`}>
                            <div className="text-xs font-medium">GW{gw.gameweek}</div>
                            <div className="text-sm font-bold">
                              {gw.defensiveContribution.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              vs {gw.opponent}
                            </div>
                            <div className="text-xs font-medium">
                              {gw.fixtureMultiplier}x
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
              <CardDescription>
                Comprehensive breakdown including form and historical comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Current DC/90</TableHead>
                    <TableHead>Current Projection</TableHead>
                    <TableHead>Form Factor</TableHead>
                    <TableHead>Minutes (24/25)</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjections.slice(0, 30).map((player) => (
                    <TableRow key={player.playerId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{player.playerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.position} - {player.teamName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {player.currentSeasonStats.dcPer90.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {player.projectedDefensiveContribution.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={player.form > 1.1 ? "default" : player.form < 0.9 ? "destructive" : "secondary"}>
                          {player.form.toFixed(2)}x
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {player.currentSeasonMinutes.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-2 h-2 rounded-full ${getConfidenceColor(player.confidence)}`}
                          />
                          <span className="text-sm">{(player.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
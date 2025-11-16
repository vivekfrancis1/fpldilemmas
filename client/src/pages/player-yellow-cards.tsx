import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProtectedRoute from "@/components/protected-route";

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface YellowCardProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  yellowCards: { [key: string]: number };
  pointsFromYellowCards: { [key: string]: number };
  totalYellowCards: number;
  totalPoints: number;
  averagePerGameweek: number;
}

export default function PlayerYellowCards() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalYellowCards" | "totalPoints">("totalYellowCards");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Cached API call for yellow card projections - 10-20x faster!
  const { data: yellowCardProjections, isLoading: isLoadingProjections } = useQuery<YellowCardProjection[]>({
    queryKey: ["/api/cached/player-yellow-cards-projections"],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Extract gameweeks dynamically from API response
  const gameweeks = yellowCardProjections && yellowCardProjections.length > 0 
    ? Object.keys(yellowCardProjections[0].yellowCards).map(gw => parseInt(gw.replace('gw', ''))).sort((a, b) => a - b)
    : [];
  
  const gameweekRange = gameweeks.length > 0 ? `${gameweeks[0]}-${gameweeks[gameweeks.length - 1]}` : "6-11";

  const teams = bootstrapData?.teams?.map(team => ({
    id: team.id,
    name: team.short_name
  })) || [];

  const positions = [
    { id: "GKP", name: "Goalkeeper" },
    { id: "DEF", name: "Defender" },
    { id: "MID", name: "Midfielder" },
    { id: "FWD", name: "Forward" }
  ];

  const filteredProjections = (yellowCardProjections || []).filter((projection: YellowCardProjection) => {
    const matchesSearch = !searchTerm || 
      projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
    const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }).sort((a: YellowCardProjection, b: YellowCardProjection) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (column: "totalYellowCards" | "totalPoints") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: "totalYellowCards" | "totalPoints") => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (isLoadingBootstrap || isLoadingProjections) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Yellow Card Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating yellow card probabilities and FPL point penalties for all players...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <AlertTriangle className="h-8 w-8" />
            <h1>Player Yellow Cards</h1>
          </div>
          <p className="fpl-page-subtitle">
            Yellow card probability analysis and FPL point penalties for all positions
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger data-testid="select-position">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger data-testid="select-team">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.name}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Tabs defaultValue="cards" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">Yellow Cards</TabsTrigger>
            <TabsTrigger value="points">Points from Yellow Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Yellow Cards (Gameweeks {gameweekRange})</CardTitle>
                <CardDescription>
                  Projected yellow card probability based on position and fixture difficulty
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="fpl-table">
                    <thead>
                      <tr>
                        <th className="text-left">Player</th>
                        <th className="text-center">Pos</th>
                        <th className="text-center">Team</th>
                        {gameweeks.map(gw => (
                          <th key={gw} className="text-center">GW{gw}</th>
                        ))}
                        <th className="text-center cursor-pointer" onClick={() => handleSort("totalYellowCards")}>
                          <div className="flex items-center justify-center gap-1">
                            Total {getSortIcon("totalYellowCards")}
                          </div>
                        </th>
                        <th className="text-center">Avg/GW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjections.map((projection: YellowCardProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          {gameweeks.map(gw => (
                            <td key={gw} className="text-center">{projection.yellowCards[`gw${gw}`]}</td>
                          ))}
                          <td className="text-center font-semibold text-yellow-600">
                            {projection.totalYellowCards}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {projection.averagePerGameweek}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Points from Yellow Cards (Gameweeks {gameweekRange})</CardTitle>
                <CardDescription>
                  FPL point penalties (-1 point per yellow card) across all positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="fpl-table">
                    <thead>
                      <tr>
                        <th className="text-left">Player</th>
                        <th className="text-center">Pos</th>
                        <th className="text-center">Team</th>
                        {gameweeks.map(gw => (
                          <th key={gw} className="text-center">GW{gw}</th>
                        ))}
                        <th className="text-center cursor-pointer" onClick={() => handleSort("totalPoints")}>
                          <div className="flex items-center justify-center gap-1">
                            Total {getSortIcon("totalPoints")}
                          </div>
                        </th>
                        <th className="text-center">Avg/GW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjections.map((projection: YellowCardProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          {gameweeks.map(gw => (
                            <td key={gw} className="text-center">{projection.pointsFromYellowCards[`gw${gw}`]}</td>
                          ))}
                          <td className="text-center font-semibold text-red-600">
                            {projection.totalPoints}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {gameweeks.length > 0 ? (projection.totalPoints / gameweeks.length).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </ProtectedRoute>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

interface GoalsConcededProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  goalsConceded: { [key: string]: number };
  pointsFromGoalsConceded: { [key: string]: number };
  totalGoalsConceded: number;
  totalPoints: number;
  averagePerGameweek: number;
}

export default function PlayerGoalsConceded() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("totalGoalsConceded");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Get current gameweek and calculate next 6 gameweeks
  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 5;
  const nextGameweek = currentGameweek + 1;
  const gameweeks = Array.from({ length: 6 }, (_, i) => nextGameweek + i);

  // Live API call for goals conceded projections for next 6 gameweeks
  const { data: goalsConcededProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: ["/api/player-goals-conceded-projections", { startGameweek: nextGameweek, endGameweek: gameweeks[gameweeks.length - 1] }],
    enabled: !!nextGameweek,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes for live data
  });

  const teams = bootstrapData?.teams?.map(team => ({
    id: team.id,
    name: team.short_name
  })) || [];

  const positions = [
    { id: "GKP", name: "Goalkeeper" },
    { id: "DEF", name: "Defender" }
  ];

  const filteredProjections = (goalsConcededProjections || []).filter((projection: GoalsConcededProjection) => {
    const matchesSearch = !searchTerm || 
      projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
    const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }).sort((a: GoalsConcededProjection, b: GoalsConcededProjection) => {
    let aValue: any;
    let bValue: any;
    
    // Handle different sort columns
    if (sortBy === "playerName") {
      aValue = a.playerName.toLowerCase();
      bValue = b.playerName.toLowerCase();
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else if (sortBy === "teamName") {
      aValue = a.teamName.toLowerCase();
      bValue = b.teamName.toLowerCase();
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else if (sortBy === "position") {
      aValue = a.position;
      bValue = b.position;
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else if (sortBy.startsWith("gw")) {
      // Handle gameweek sorting
      aValue = a.goalsConceded[sortBy] || 0;
      bValue = b.goalsConceded[sortBy] || 0;
    } else if (sortBy.startsWith("pts_gw")) {
      // Handle points gameweek sorting
      const gw = sortBy.replace("pts_", "");
      aValue = a.pointsFromGoalsConceded[gw] || 0;
      bValue = b.pointsFromGoalsConceded[gw] || 0;
    } else {
      // Handle numeric columns (totalGoalsConceded, totalPoints, averagePerGameweek)
      aValue = a[sortBy as keyof GoalsConcededProjection] || 0;
      bValue = b[sortBy as keyof GoalsConcededProjection] || 0;
    }
    
    return sortDirection === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      // Default sort direction based on column type
      if (column === "playerName" || column === "teamName" || column === "position") {
        setSortDirection("asc");
      } else {
        setSortDirection("desc"); // Numeric columns default to desc (high to low)
      }
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (isLoadingBootstrap || isLoadingProjections) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <ShieldAlert className="h-8 w-8" />
              <h1>Player Goals Conceded</h1>
            </div>
            <p className="fpl-page-subtitle">
              Goals conceded projections and FPL point penalties for goalkeepers and defenders
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fpl-loading-card" />
          ))}
        </div>
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
            <ShieldAlert className="h-8 w-8" />
            <h1>Player Goals Conceded</h1>
          </div>
          <p className="fpl-page-subtitle">
            Goals conceded projections and FPL point penalties for goalkeepers and defenders
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
        <Tabs defaultValue="conceded" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conceded">Goals Conceded</TabsTrigger>
            <TabsTrigger value="points">Points from Goals Conceded</TabsTrigger>
          </TabsList>

          <TabsContent value="conceded" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Goals Conceded (Next 6 Gameweeks)</CardTitle>
                <CardDescription>
                  Projected goals conceded based on team defensive strength vs opponent attack power for GW{nextGameweek}-{gameweeks[gameweeks.length - 1]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="fpl-table">
                    <thead>
                      <tr>
                        <th className="text-left cursor-pointer" onClick={() => handleSort("playerName")}>
                          <div className="flex items-center gap-1">
                            Player {getSortIcon("playerName")}
                          </div>
                        </th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("position")}>
                          <div className="flex items-center justify-center gap-1">
                            Pos {getSortIcon("position")}
                          </div>
                        </th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("teamName")}>
                          <div className="flex items-center justify-center gap-1">
                            Team {getSortIcon("teamName")}
                          </div>
                        </th>
                        {gameweeks.map(gw => (
                          <th key={gw} className="text-center cursor-pointer" onClick={() => handleSort(`gw${gw}`)}>
                            <div className="flex items-center justify-center gap-1">
                              GW{gw} {getSortIcon(`gw${gw}`)}
                            </div>
                          </th>
                        ))}
                        <th className="text-center cursor-pointer" onClick={() => handleSort("totalGoalsConceded")}>
                          <div className="flex items-center justify-center gap-1">
                            Total {getSortIcon("totalGoalsConceded")}
                          </div>
                        </th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("averagePerGameweek")}>
                          <div className="flex items-center justify-center gap-1">
                            Avg/GW {getSortIcon("averagePerGameweek")}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjections.map((projection: GoalsConcededProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          {gameweeks.map(gw => (
                            <td key={gw} className="text-center">{projection.goalsConceded[`gw${gw}`]}</td>
                          ))}
                          <td className="text-center font-semibold text-red-600">
                            {projection.totalGoalsConceded}
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
                <CardTitle>Points from Goals Conceded (Next 6 Gameweeks)</CardTitle>
                <CardDescription>
                  FPL point penalties (-1 point for every 2 goals conceded) for goalkeepers and defenders for GW{nextGameweek}-{gameweeks[gameweeks.length - 1]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="fpl-table">
                    <thead>
                      <tr>
                        <th className="text-left cursor-pointer" onClick={() => handleSort("playerName")}>
                          <div className="flex items-center gap-1">
                            Player {getSortIcon("playerName")}
                          </div>
                        </th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("position")}>
                          <div className="flex items-center justify-center gap-1">
                            Pos {getSortIcon("position")}
                          </div>
                        </th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("teamName")}>
                          <div className="flex items-center justify-center gap-1">
                            Team {getSortIcon("teamName")}
                          </div>
                        </th>
                        {gameweeks.map(gw => (
                          <th key={gw} className="text-center cursor-pointer" onClick={() => handleSort(`pts_gw${gw}`)}>
                            <div className="flex items-center justify-center gap-1">
                              GW{gw} {getSortIcon(`pts_gw${gw}`)}
                            </div>
                          </th>
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
                      {filteredProjections.map((projection: GoalsConcededProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          {gameweeks.map(gw => (
                            <td key={gw} className="text-center">{projection.pointsFromGoalsConceded[`gw${gw}`]}</td>
                          ))}
                          <td className="text-center font-semibold text-red-600">
                            {projection.totalPoints}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {(projection.totalPoints / 6).toFixed(1)}
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
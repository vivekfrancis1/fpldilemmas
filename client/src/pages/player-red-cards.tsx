import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { XCircle, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface RedCardProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  redCards: { [key: string]: number };
  pointsFromRedCards: { [key: string]: number };
  totalRedCards: number;
  totalPoints: number;
  averagePerGameweek: number;
}

export default function PlayerRedCards() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalRedCards" | "totalPoints">("totalRedCards");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Cached API call for red card projections - faster response from database
  const { data: redCardProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: ["/api/cached/player-red-cards-projections"],
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes since data is updated twice daily
  });

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

  const filteredProjections = (redCardProjections || []).filter((projection: RedCardProjection) => {
    const matchesSearch = !searchTerm || 
      projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
    const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }).sort((a: RedCardProjection, b: RedCardProjection) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (column: "totalRedCards" | "totalPoints") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: "totalRedCards" | "totalPoints") => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (isLoadingBootstrap || isLoadingProjections) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <XCircle className="h-8 w-8" />
              <h1>Player Red Cards</h1>
            </div>
            <p className="fpl-page-subtitle">
              Red card probability analysis and severe FPL point penalties for all positions
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
    <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <XCircle className="h-8 w-8" />
            <h1>Player Red Cards</h1>
          </div>
          <p className="fpl-page-subtitle">
            Red card probability analysis and severe FPL point penalties for all positions
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
            <TabsTrigger value="cards">Red Cards</TabsTrigger>
            <TabsTrigger value="points">Points from Red Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Red Cards (Gameweeks 4-9)</CardTitle>
                <CardDescription>
                  Projected red card probability based on position (very rare events with severe consequences)
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
                        <th className="text-center">GW4</th>
                        <th className="text-center">GW5</th>
                        <th className="text-center">GW6</th>
                        <th className="text-center">GW7</th>
                        <th className="text-center">GW8</th>
                        <th className="text-center">GW9</th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("totalRedCards")}>
                          <div className="flex items-center justify-center gap-1">
                            Total {getSortIcon("totalRedCards")}
                          </div>
                        </th>
                        <th className="text-center">Avg/GW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjections.map((projection: RedCardProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          <td className="text-center">{projection.redCards.gw4}</td>
                          <td className="text-center">{projection.redCards.gw5}</td>
                          <td className="text-center">{projection.redCards.gw6}</td>
                          <td className="text-center">{projection.redCards.gw7}</td>
                          <td className="text-center">{projection.redCards.gw8}</td>
                          <td className="text-center">{projection.redCards.gw9}</td>
                          <td className="text-center font-semibold text-red-600">
                            {projection.totalRedCards}
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
                <CardTitle>Points from Red Cards (Gameweeks 4-9)</CardTitle>
                <CardDescription>
                  FPL point penalties (-3 points per red card) - the most severe scoring penalty in FPL
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
                        <th className="text-center">GW4</th>
                        <th className="text-center">GW5</th>
                        <th className="text-center">GW6</th>
                        <th className="text-center">GW7</th>
                        <th className="text-center">GW8</th>
                        <th className="text-center">GW9</th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("totalPoints")}>
                          <div className="flex items-center justify-center gap-1">
                            Total {getSortIcon("totalPoints")}
                          </div>
                        </th>
                        <th className="text-center">Avg/GW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjections.map((projection: RedCardProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          <td className="text-center">{projection.pointsFromRedCards.gw4}</td>
                          <td className="text-center">{projection.pointsFromRedCards.gw5}</td>
                          <td className="text-center">{projection.pointsFromRedCards.gw6}</td>
                          <td className="text-center">{projection.pointsFromRedCards.gw7}</td>
                          <td className="text-center">{projection.pointsFromRedCards.gw8}</td>
                          <td className="text-center">{projection.pointsFromRedCards.gw9}</td>
                          <td className="text-center font-semibold text-red-600">
                            {projection.totalPoints}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {(projection.totalPoints / 6).toFixed(3)}
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
  );
}
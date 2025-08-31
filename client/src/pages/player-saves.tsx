import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface SavesProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  saves: { [key: string]: number };
  pointsFromSaves: { [key: string]: number };
  totalSaves: number;
  totalPoints: number;
  averagePerGameweek: number;
}

export default function PlayerSaves() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalSaves" | "totalPoints">("totalSaves");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Real API call for saves projections using probability calculations
  const { data: savesProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: ["/api/player-saves-projections?startGameweek=4&endGameweek=9"],
    staleTime: 5 * 60 * 1000,
  });

  const teams = bootstrapData?.teams?.map(team => ({
    id: team.id,
    name: team.short_name
  })) || [];

  const filteredProjections = (savesProjections || []).filter((projection: SavesProjection) => {
    const matchesSearch = !searchTerm || 
      projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
    
    return matchesSearch && matchesTeam;
  }).sort((a: SavesProjection, b: SavesProjection) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (column: "totalSaves" | "totalPoints") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: "totalSaves" | "totalPoints") => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (isLoadingBootstrap || isLoadingProjections) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Shield className="h-8 w-8" />
              <h1>Player Saves Projections</h1>
            </div>
            <p className="fpl-page-subtitle">
              Goalkeeper save predictions and FPL points analysis for upcoming gameweeks
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
            <Shield className="h-8 w-8" />
            <h1>Player Saves Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Goalkeeper save predictions and FPL points analysis for upcoming gameweeks
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search goalkeepers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
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
        <Tabs defaultValue="saves" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saves">Saves</TabsTrigger>
            <TabsTrigger value="points">Points from Saves</TabsTrigger>
          </TabsList>

          <TabsContent value="saves" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Saves (Gameweeks 4-9)</CardTitle>
                <CardDescription>
                  Projected number of saves for each goalkeeper based on opponent strength and team defensive quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="fpl-table">
                    <thead>
                      <tr>
                        <th className="text-left">Goalkeeper</th>
                        <th className="text-center">Team</th>
                        <th className="text-center">GW4</th>
                        <th className="text-center">GW5</th>
                        <th className="text-center">GW6</th>
                        <th className="text-center">GW7</th>
                        <th className="text-center">GW8</th>
                        <th className="text-center">GW9</th>
                        <th className="text-center cursor-pointer" onClick={() => handleSort("totalSaves")}>
                          <div className="flex items-center justify-center gap-1">
                            Total {getSortIcon("totalSaves")}
                          </div>
                        </th>
                        <th className="text-center">Avg/GW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjections.map((projection: SavesProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          <td className="text-center">{projection.saves.gw4}</td>
                          <td className="text-center">{projection.saves.gw5}</td>
                          <td className="text-center">{projection.saves.gw6}</td>
                          <td className="text-center">{projection.saves.gw7}</td>
                          <td className="text-center">{projection.saves.gw8}</td>
                          <td className="text-center">{projection.saves.gw9}</td>
                          <td className="text-center font-semibold text-blue-600">
                            {projection.totalSaves}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {projection.averagePerGameweek.toFixed(1)}
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
                <CardTitle>Points from Saves (Gameweeks 4-9)</CardTitle>
                <CardDescription>
                  FPL points earned from saves (1 point per 3 saves) plus penalty save bonuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="fpl-table">
                    <thead>
                      <tr>
                        <th className="text-left">Goalkeeper</th>
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
                      {filteredProjections.map((projection: SavesProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          <td className="text-center">{projection.pointsFromSaves.gw4}</td>
                          <td className="text-center">{projection.pointsFromSaves.gw5}</td>
                          <td className="text-center">{projection.pointsFromSaves.gw6}</td>
                          <td className="text-center">{projection.pointsFromSaves.gw7}</td>
                          <td className="text-center">{projection.pointsFromSaves.gw8}</td>
                          <td className="text-center">{projection.pointsFromSaves.gw9}</td>
                          <td className="text-center font-semibold text-green-600">
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
  );
}
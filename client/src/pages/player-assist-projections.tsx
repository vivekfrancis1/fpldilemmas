import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlayerAssistProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  gameweekProjections: { [gameweek: number]: number };
  totalProjectedAssists: number;
}

export default function PlayerAssistProjections() {
  const [sortBy, setSortBy] = useState("total");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterPosition, setFilterPosition] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: projections = [], isLoading } = useQuery({
    queryKey: ["/api/player-assist-projections"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: bootstrapData } = useQuery({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 30 * 60 * 1000,
  });

  // Fixed to show GW3-GW8 (next 6 gameweeks)
  const next6Gameweeks = useMemo(() => {
    return [3, 4, 5, 6, 7, 8];
  }, []);

  // Filter and sort data
  const filteredProjections = useMemo(() => {
    if (!projections.length) return [];

    let filtered = projections.filter((player: PlayerAssistProjection) => {
      const matchesTeam = filterTeam === "all" || player.teamShort === filterTeam;
      const matchesPosition = filterPosition === "all" || player.position === filterPosition;
      const matchesSearch = searchTerm === "" || 
        player.playerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesTeam && matchesPosition && matchesSearch;
    });

    // Sort the filtered data
    filtered.sort((a: PlayerAssistProjection, b: PlayerAssistProjection) => {
      switch (sortBy) {
        case "name":
          return a.playerName.localeCompare(b.playerName);
        case "team":
          return a.teamShort.localeCompare(b.teamShort);
        case "position":
          return a.position.localeCompare(b.position);
        case "total":
          const aNext6Total = next6Gameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
          const bNext6Total = next6Gameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
          return bNext6Total - aNext6Total;
        case "season":
          return b.totalProjectedAssists - a.totalProjectedAssists;
        default:
          if (sortBy.startsWith("gw")) {
            const gw = parseInt(sortBy.replace("gw", ""));
            return (b.gameweekProjections[gw] || 0) - (a.gameweekProjections[gw] || 0);
          }
          return 0;
      }
    });

    return filtered;
  }, [projections, filterTeam, filterPosition, searchTerm, sortBy, next6Gameweeks]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!bootstrapData?.teams) return [];
    return bootstrapData.teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      short_name: team.short_name,
    }));
  }, [bootstrapData]);

  const positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

  // Calculate total assists for footer
  const totalAssists = useMemo(() => {
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;

    filteredProjections.forEach((player: PlayerAssistProjection) => {
      const next6Total = next6Gameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw] || 0), 0);
      overallTotal += next6Total;
      seasonTotal += player.totalProjectedAssists;

      next6Gameweeks.forEach(gw => {
        if (!gameweekTotals[gw]) gameweekTotals[gw] = 0;
        gameweekTotals[gw] += player.gameweekProjections[gw] || 0;
      });
    });

    return { overallTotal, seasonTotal, gameweekTotals };
  }, [filteredProjections, next6Gameweeks]);

  // Color coding for assist cells
  const getAssistsColor = (assists: number) => {
    if (assists >= 1.5) return "bg-green-100 text-green-800 border-green-200";
    if (assists >= 1.0) return "bg-blue-100 text-blue-800 border-blue-200";
    if (assists >= 0.7) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (assists >= 0.5) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!filteredProjections.length) return [];

    const next6Total = totalAssists.overallTotal;
    const avgNext6 = next6Total / filteredProjections.length;
    const seasonTotal = totalAssists.seasonTotal;
    const avgSeason = seasonTotal / filteredProjections.length;

    return [
      { label: "Total Players", value: filteredProjections.length.toString(), color: "bg-blue-50 text-blue-700" },
      { label: "6 GW Total Assists", value: next6Total.toFixed(1), color: "bg-green-50 text-green-700" },
      { label: "Avg per Player (6 GW)", value: avgNext6.toFixed(2), color: "bg-yellow-50 text-yellow-700" },
      { label: "Season Total Assists", value: seasonTotal.toFixed(1), color: "bg-purple-50 text-purple-700" },
      { label: "Avg per Player (Season)", value: avgSeason.toFixed(2), color: "bg-indigo-50 text-indigo-700" }
    ];
  }, [filteredProjections, totalAssists]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading player assist projections...</div>
        </div>
      </div>
    );
  }

  if (!projections.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h2>
          <p className="text-gray-600">No assist projection data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Player Assist Projections
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Individual player assist projections for the next 6 gameweeks (GW3-GW8) based on historical data and team assist share analysis.
          </p>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {summaryStats.map((stat, index) => (
            <Card key={index} className="shadow-sm">
              <CardContent className={`p-4 text-center ${stat.color} rounded-lg`}>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters and Controls */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Team</label>
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((team: any) => (
                      <SelectItem key={team.id} value={team.short_name}>
                        {team.short_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Position</label>
                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {positions.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">6 GW Total</SelectItem>
                    <SelectItem value="season">Season Total</SelectItem>
                    <SelectItem value="name">Player Name</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                    {next6Gameweeks.map(gw => (
                      <SelectItem key={gw} value={`gw${gw}`}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search Player</label>
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl text-gray-800">
              Player Assist Projections (Next 6 Gameweeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th 
                      className="text-left py-3 px-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("name")}
                    >
                      Player {sortBy === "name" && "↓"}
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("team")}
                    >
                      Team {sortBy === "team" && "↓"}
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("position")}
                    >
                      Pos {sortBy === "position" && "↓"}
                    </th>
                    {next6Gameweeks.map(gw => (
                      <th 
                        key={gw} 
                        className="text-center py-3 px-2 font-semibold text-gray-900 min-w-[60px] cursor-pointer hover:bg-gray-50"
                        onClick={() => setSortBy(`gw${gw}`)}
                      >
                        GW{gw} {sortBy === `gw${gw}` && "↓"}
                      </th>
                    ))}
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("total")}
                    >
                      6 GW {sortBy === "total" && "↓"}
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" 
                      onClick={() => setSortBy("season")}
                    >
                      Season {sortBy === "season" && "↓"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjections.map((player: PlayerAssistProjection, index) => {
                    const next6Total = next6Gameweeks.reduce((sum, gw) => sum + (player.gameweekProjections[gw] || 0), 0);
                    
                    return (
                      <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {player.playerName}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant="outline" className="text-xs font-medium">
                            {player.teamShort}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-center text-sm text-gray-600">
                          {player.position}
                        </td>
                        {next6Gameweeks.map(gw => {
                          const assists = player.gameweekProjections[gw] || 0;
                          return (
                            <td key={gw} className="py-3 px-2 text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getAssistsColor(assists)}`}>
                                {assists.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-3 px-2 text-center">
                          <span className="font-bold text-gray-900">
                            {next6Total.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-sm text-gray-600">
                            {player.totalProjectedAssists.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-blue-50">
                    <td className="py-3 px-4 font-bold text-gray-900" colSpan={3}>
                      6 GW TOTAL
                    </td>
                    {next6Gameweeks.map(gw => (
                      <td key={gw} className="py-3 px-2 text-center font-bold text-blue-600">
                        {(totalAssists.gameweekTotals[gw] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="py-3 px-2 text-center font-bold text-blue-600">
                      {totalAssists.overallTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-gray-600">
                      -
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-green-50">
                    <td className="py-3 px-4 font-bold text-gray-900" colSpan={3}>
                      SEASON TOTAL
                    </td>
                    {next6Gameweeks.map(gw => (
                      <td key={gw} className="py-3 px-2 text-center font-bold text-gray-600">
                        -
                      </td>
                    ))}
                    <td className="py-3 px-2 text-center font-bold text-gray-600">
                      -
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-green-600">
                      {totalAssists.seasonTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
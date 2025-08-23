import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Users, TrendingUp, Filter, Search, Zap, ChevronUp, ChevronDown } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PlayerAssistProjection {
  id: number;
  name: string;
  team: string;
  teamShort: string;
  position: string;
  currentPrice: number;
  projectedAssists: number;
  assistShare: number;
}

export default function PlayerAssistProjections() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("assists");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: playerProjections, isLoading: projectionsLoading, error } = useQuery<PlayerAssistProjection[]>({
    queryKey: ["/api/player-assist-projections"],
    staleTime: 10 * 60 * 1000,
  });

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!playerProjections) return [];

    let filtered = playerProjections.filter(player => {
      const matchesSearch = searchTerm === "" || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeam = selectedTeam === "all" || player.teamShort === selectedTeam;
      const matchesPosition = selectedPosition === "all" || player.position === selectedPosition;
      
      return matchesSearch && matchesTeam && matchesPosition;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case "assists":
          result = b.projectedAssists - a.projectedAssists;
          break;
        case "share":
          result = b.assistShare - a.assistShare;
          break;
        case "price":
          result = a.currentPrice - b.currentPrice;
          break;
        case "name":
          result = a.name.localeCompare(b.name);
          break;
        case "team":
          result = a.team.localeCompare(b.team);
          break;
        default:
          result = b.projectedAssists - a.projectedAssists;
      }
      return sortDirection === "asc" ? -result : result;
    });

    return filtered;
  }, [playerProjections, searchTerm, selectedTeam, selectedPosition, sortBy, sortDirection]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection(column === "price" || column === "name" || column === "team" ? "asc" : "desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const isLoading = bootstrapLoading || projectionsLoading;

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Zap className="h-6 w-6 text-red-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-red-800">Error Loading Data</h3>
                    <p className="text-red-600">Unable to load player assist projections. Please try again later.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/30">
          <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading player assist projections...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const positions = Array.from(new Set(playerProjections?.map(p => p.position) || [])).sort();
  const teams = Array.from(new Set(playerProjections?.map(p => p.teamShort) || [])).sort();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-page-title">
              Player Assist Projections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Individual player assist projections for the 2025-26 season based on team assist distribution and historical patterns
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search players or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  data-testid="input-search"
                />
              </div>

              {/* Team Filter */}
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="border-gray-300 focus:border-purple-500" data-testid="select-team">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Position Filter */}
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="border-gray-300 focus:border-purple-500" data-testid="select-position">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="border-gray-300 focus:border-purple-500" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assists">Projected Assists</SelectItem>
                  <SelectItem value="share">Assist Share %</SelectItem>
                  <SelectItem value="price">Price (Low to High)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="team">Team (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* Results Count */}
              <div className="flex items-center justify-center bg-gray-50 rounded-lg px-4 py-2">
                <Users className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  {filteredAndSortedData.length} players
                </span>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-xl font-bold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Player Assist Projections 2025-26
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort("name")}
                        data-testid="header-name"
                      >
                        <div className="flex items-center">
                          Player
                          {getSortIcon("name")}
                        </div>
                      </th>
                      <th 
                        className="text-left py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort("team")}
                        data-testid="header-team"
                      >
                        <div className="flex items-center">
                          Team
                          {getSortIcon("team")}
                        </div>
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Position</th>
                      <th 
                        className="text-center py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort("price")}
                        data-testid="header-price"
                      >
                        <div className="flex items-center justify-center">
                          Price
                          {getSortIcon("price")}
                        </div>
                      </th>
                      <th 
                        className="text-center py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort("assists")}
                        data-testid="header-assists"
                      >
                        <div className="flex items-center justify-center">
                          Projected Assists
                          {getSortIcon("assists")}
                        </div>
                      </th>
                      <th 
                        className="text-center py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort("share")}
                        data-testid="header-share"
                      >
                        <div className="flex items-center justify-center">
                          Team Share %
                          {getSortIcon("share")}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedData.map((player, index) => (
                      <tr 
                        key={player.id} 
                        className="hover:bg-gray-50 transition-colors"
                        data-testid={`row-player-${player.id}`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className="font-semibold text-gray-900">{player.name}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {player.teamShort}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="text-xs">
                            {player.position}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-medium text-gray-900">
                            £{player.currentPrice.toFixed(1)}m
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-lg font-bold text-purple-600">
                            {player.projectedAssists.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-medium text-gray-700">
                            {player.assistShare.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
              <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">How It Works</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Season-long assist projections based on Team Assist Projections</li>
                    <li>• Historical assist patterns from 2023-24 and 2024-25 seasons</li>
                    <li>• Weighted distribution ensuring 100% team coverage</li>
                    <li>• Individual player assist shares calculated from historical data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Use Cases</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Identify season-long assist providers per team</li>
                    <li>• Compare creative players across different teams</li>
                    <li>• Plan long-term fantasy transfers for assist points</li>
                    <li>• Analyze value for money in creative midfielders</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProtectedRoute from "@/components/protected-route";

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface BonusPointsProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  bonusPoints: { [key: string]: number };
  pointsFromBonus: { [key: string]: number };
  totalBonusPoints: number;
  totalPoints: number;
  averagePerGameweek: number;
}

export default function PlayerBonusPoints() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalBonusPoints" | "totalPoints">("totalBonusPoints");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Simplified API call for bonus points projections (now projects future gameweeks only)
  const { data: bonusPointsProjections, isLoading: isLoadingProjections } = useQuery<BonusPointsProjection[]>({
    queryKey: ["/api/player-bonus-points-projections"],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes for live data
  });

  // Extract gameweeks dynamically from API response
  const gameweeks = bonusPointsProjections && bonusPointsProjections.length > 0 
    ? Object.keys(bonusPointsProjections[0].bonusPoints).map(gw => parseInt(gw.replace('gw', ''))).sort((a, b) => a - b)
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

  // Filter and sort bonus points projections
  const filteredBonusPointsProjections = (bonusPointsProjections || []).filter((item: BonusPointsProjection) => {
    const matchesSearch = !searchTerm || 
      item.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || item.position === positionFilter;
    const matchesTeam = teamFilter === "all" || item.teamName === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }).sort((a: BonusPointsProjection, b: BonusPointsProjection) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (column: "totalBonusPoints" | "totalPoints") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
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
              <Star className="h-8 w-8" />
              <h1>Player Bonus Points</h1>
            </div>
            <p className="fpl-page-subtitle">
              Bonus Point System (BPS) projections and additional FPL rewards for top performers
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
            <Star className="h-8 w-8" />
            <h1>Player Bonus Points</h1>
          </div>
          <p className="fpl-page-subtitle">
            Bonus Point System (BPS) projections and additional FPL rewards for top performers
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

        {/* Simplified Bonus Points Table */}
        <Card>
          <CardHeader>
            <CardTitle>Player Bonus Points (Gameweeks {gameweekRange})</CardTitle>
            <CardDescription>
              Simplified formula: (Player BPS ÷ Total BPS of both teams) × 6 for future gameweeks only
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
                    <th className="text-center cursor-pointer" onClick={() => handleSort("totalBonusPoints")}>
                      <div className="flex items-center justify-center gap-1">
                        Total {getSortIcon("totalBonusPoints")}
                      </div>
                    </th>
                    <th className="text-center">Avg/GW</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBonusPointsProjections.map((projection: BonusPointsProjection) => (
                    <tr key={projection.playerId}>
                      <td className="font-medium">{projection.playerName}</td>
                      <td className="text-center text-xs font-semibold">{projection.position}</td>
                      <td className="text-center text-sm">{projection.teamName}</td>
                      {gameweeks.map(gw => (
                        <td key={gw} className="text-center">{projection.bonusPoints?.[`gw${gw}`] || '-'}</td>
                      ))}
                      <td className="text-center font-semibold text-yellow-600">
                        {projection.totalBonusPoints}
                      </td>
                      <td className="text-center text-sm text-gray-600">
                        {gameweeks.length > 0 ? (projection.totalBonusPoints / gameweeks.length).toFixed(3) : '0.000'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </ProtectedRoute>
  );
}
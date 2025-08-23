import { useState } from "react";
import { TrendingUp, Target, Users, Search, Trophy, Zap, UserPlus } from "lucide-react";
import Layout from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SeasonProjection {
  rank: number;
  name: string;
  team: string;
  goals: number;
  assists: number;
  totalInvolvements: number;
  projectedPoints: number;
  position: string;
}

// Calculate projected points using FPL scoring: Goals (4-6pts), Assists (3pts), Appearance (2pts), Bonus (~1.5pt/game)
const calculateProjectedPoints = (goals: number, assists: number, position: string): number => {
  const goalPoints = position === "FWD" ? goals * 4 : position === "MID" ? goals * 5 : goals * 6;
  const assistPoints = assists * 3;
  const appearancePoints = 32 * 2; // ~32 appearances * 2pts
  const bonusPoints = (goals + assists) * 0.8; // Bonus correlation
  const cleanSheetPoints = position === "DEF" ? 12 * 4 : position === "GK" ? 15 * 4 : 0;
  return Math.round(goalPoints + assistPoints + appearancePoints + bonusPoints + cleanSheetPoints);
};

const seasonProjectionsData: SeasonProjection[] = [
  { rank: 1, name: "Haaland", team: "MCI", goals: 24.5, assists: 4.1, totalInvolvements: 28.6, projectedPoints: calculateProjectedPoints(24.5, 4.1, "FWD"), position: "FWD" },
  { rank: 2, name: "Salah", team: "LIV", goals: 18.3, assists: 10.3, totalInvolvements: 28.5, projectedPoints: calculateProjectedPoints(18.3, 10.3, "MID"), position: "MID" },
  { rank: 3, name: "Palmer", team: "CHE", goals: 9.8, assists: 10.3, totalInvolvements: 20.1, projectedPoints: calculateProjectedPoints(9.8, 10.3, "MID"), position: "MID" },
  { rank: 4, name: "Saka", team: "ARS", goals: 12.3, assists: 10.3, totalInvolvements: 22.5, projectedPoints: calculateProjectedPoints(12.3, 10.3, "MID"), position: "MID" },
  { rank: 5, name: "Isak", team: "NEW", goals: 17.3, assists: 4.1, totalInvolvements: 21.4, projectedPoints: calculateProjectedPoints(17.3, 4.1, "FWD"), position: "FWD" },
  { rank: 6, name: "Fernandes", team: "MUN", goals: 10.8, assists: 10.0, totalInvolvements: 20.8, projectedPoints: calculateProjectedPoints(10.8, 10.0, "MID"), position: "MID" },
  { rank: 7, name: "Gyokeres", team: "SCP", goals: 16.3, assists: 4.4, totalInvolvements: 20.6, projectedPoints: calculateProjectedPoints(16.3, 4.4, "FWD"), position: "FWD" },
  { rank: 8, name: "Marmous", team: "LIV", goals: 11.8, assists: 6.5, totalInvolvements: 18.3, projectedPoints: calculateProjectedPoints(11.8, 6.5, "MID"), position: "MID" },
  { rank: 9, name: "Wirtz", team: "LEV", goals: 9.8, assists: 8.3, totalInvolvements: 18.0, projectedPoints: calculateProjectedPoints(9.8, 8.3, "MID"), position: "MID" },
  { rank: 10, name: "Watkins", team: "AVL", goals: 13.3, assists: 4.6, totalInvolvements: 17.9, projectedPoints: calculateProjectedPoints(13.3, 4.6, "FWD"), position: "FWD" },
  { rank: 11, name: "Solanke", team: "TOT", goals: 13.8, assists: 3.6, totalInvolvements: 17.4, projectedPoints: calculateProjectedPoints(13.8, 3.6, "FWD"), position: "FWD" },
  { rank: 12, name: "Bowen", team: "WHU", goals: 10.3, assists: 6.8, totalInvolvements: 17.0, projectedPoints: calculateProjectedPoints(10.3, 6.8, "MID"), position: "MID" },
  { rank: 13, name: "Gordon", team: "NEW", goals: 10.3, assists: 6.5, totalInvolvements: 16.8, projectedPoints: calculateProjectedPoints(10.3, 6.5, "MID"), position: "MID" },
  { rank: 14, name: "Rogers", team: "AVL", goals: 9.0, assists: 7.3, totalInvolvements: 16.3, projectedPoints: calculateProjectedPoints(9.0, 7.3, "MID"), position: "MID" },
  { rank: 15, name: "Joao Pedro", team: "BHA", goals: 10.8, assists: 5.5, totalInvolvements: 16.3, projectedPoints: calculateProjectedPoints(10.8, 5.5, "FWD"), position: "FWD" },
  { rank: 16, name: "Foden", team: "MCI", goals: 9.5, assists: 6.8, totalInvolvements: 16.3, projectedPoints: calculateProjectedPoints(9.5, 6.8, "MID"), position: "MID" },
  { rank: 17, name: "Mateta", team: "CRY", goals: 12.8, assists: 2.9, totalInvolvements: 15.6, projectedPoints: calculateProjectedPoints(12.8, 2.9, "FWD"), position: "FWD" },
  { rank: 18, name: "Cunha", team: "WOL", goals: 9.0, assists: 6.5, totalInvolvements: 15.5, projectedPoints: calculateProjectedPoints(9.0, 6.5, "MID"), position: "MID" },
  { rank: 19, name: "Wood", team: "NEW", goals: 12.3, assists: 2.9, totalInvolvements: 15.1, projectedPoints: calculateProjectedPoints(12.3, 2.9, "FWD"), position: "FWD" },
  { rank: 20, name: "Elanga", team: "NFO", goals: 7.5, assists: 7.0, totalInvolvements: 14.5, projectedPoints: calculateProjectedPoints(7.5, 7.0, "MID"), position: "MID" },
  { rank: 21, name: "Gibbs-White", team: "NFO", goals: 7.0, assists: 7.5, totalInvolvements: 14.5, projectedPoints: calculateProjectedPoints(7.0, 7.5, "MID"), position: "MID" },
  { rank: 22, name: "Barnes", team: "NEW", goals: 8.0, assists: 6.3, totalInvolvements: 14.3, projectedPoints: calculateProjectedPoints(8.0, 6.3, "MID"), position: "MID" },
  { rank: 23, name: "Evanilson", team: "BOU", goals: 11.3, assists: 2.9, totalInvolvements: 14.1, projectedPoints: calculateProjectedPoints(11.3, 2.9, "FWD"), position: "FWD" },
  { rank: 24, name: "Str.Larsen", team: "WOL", goals: 10.8, assists: 3.4, totalInvolvements: 14.1, projectedPoints: calculateProjectedPoints(10.8, 3.4, "FWD"), position: "FWD" },
  { rank: 25, name: "Odegaard", team: "ARS", goals: 6.0, assists: 8.0, totalInvolvements: 14.0, projectedPoints: calculateProjectedPoints(6.0, 8.0, "MID"), position: "MID" },
  { rank: 26, name: "Sarr", team: "CRY", goals: 7.8, assists: 6.3, totalInvolvements: 14.0, projectedPoints: calculateProjectedPoints(7.8, 6.3, "MID"), position: "MID" },
  { rank: 27, name: "Mbeumo", team: "BRE", goals: 8.0, assists: 6.0, totalInvolvements: 14.0, projectedPoints: calculateProjectedPoints(8.0, 6.0, "MID"), position: "MID" },
  { rank: 28, name: "Johnson", team: "FUL", goals: 9.0, assists: 5.0, totalInvolvements: 14.0, projectedPoints: calculateProjectedPoints(9.0, 5.0, "FWD"), position: "FWD" },
  { rank: 29, name: "Semenyo", team: "BOU", goals: 9.3, assists: 4.6, totalInvolvements: 13.9, projectedPoints: calculateProjectedPoints(9.3, 4.6, "FWD"), position: "FWD" },
  { rank: 30, name: "Gakpo", team: "LIV", goals: 9.0, assists: 4.9, totalInvolvements: 13.9, projectedPoints: calculateProjectedPoints(9.0, 4.9, "MID"), position: "MID" },
  { rank: 31, name: "Martinelli", team: "ARS", goals: 7.3, assists: 6.5, totalInvolvements: 13.8, projectedPoints: calculateProjectedPoints(7.3, 6.5, "MID"), position: "MID" },
  { rank: 32, name: "Cherki", team: "LYO", goals: 6.0, assists: 7.8, totalInvolvements: 13.8, projectedPoints: calculateProjectedPoints(6.0, 7.8, "MID"), position: "MID" },
  { rank: 33, name: "Neto", team: "CHE", goals: 6.3, assists: 7.3, totalInvolvements: 13.5, projectedPoints: calculateProjectedPoints(6.3, 7.3, "MID"), position: "MID" },
  { rank: 34, name: "Kluivert", team: "BOU", goals: 8.8, assists: 4.6, totalInvolvements: 13.4, projectedPoints: calculateProjectedPoints(8.8, 4.6, "MID"), position: "MID" },
  { rank: 35, name: "Sesko", team: "RBL", goals: 10.8, assists: 2.6, totalInvolvements: 13.4, projectedPoints: calculateProjectedPoints(10.8, 2.6, "FWD"), position: "FWD" },
  { rank: 36, name: "Rice", team: "ARS", goals: 5.3, assists: 7.8, totalInvolvements: 13.0, projectedPoints: calculateProjectedPoints(5.3, 7.8, "MID"), position: "MID" },
  { rank: 37, name: "Mitoma", team: "BHA", goals: 7.8, assists: 5.3, totalInvolvements: 13.0, projectedPoints: calculateProjectedPoints(7.8, 5.3, "MID"), position: "MID" },
  { rank: 38, name: "Georginio", team: "LIV", goals: 7.5, assists: 5.3, totalInvolvements: 12.8, projectedPoints: calculateProjectedPoints(7.5, 5.3, "MID"), position: "MID" },
  { rank: 39, name: "Delap", team: "IPS", goals: 9.5, assists: 2.9, totalInvolvements: 12.4, projectedPoints: calculateProjectedPoints(9.5, 2.9, "FWD"), position: "FWD" },
  { rank: 40, name: "Raul", team: "WOL", goals: 9.8, assists: 2.6, totalInvolvements: 12.4, projectedPoints: calculateProjectedPoints(9.8, 2.6, "FWD"), position: "FWD" },
  { rank: 41, name: "Kudus", team: "WHU", goals: 7.3, assists: 5.0, totalInvolvements: 12.3, projectedPoints: calculateProjectedPoints(7.3, 5.0, "MID"), position: "MID" },
  { rank: 42, name: "Havertz", team: "ARS", goals: 8.5, assists: 3.6, totalInvolvements: 12.1, projectedPoints: calculateProjectedPoints(8.5, 3.6, "FWD"), position: "FWD" },
  { rank: 43, name: "Schade", team: "BRE", goals: 7.8, assists: 4.1, totalInvolvements: 11.9, projectedPoints: calculateProjectedPoints(7.8, 4.1, "FWD"), position: "FWD" },
  { rank: 44, name: "Szoboszlai", team: "LIV", goals: 5.8, assists: 6.0, totalInvolvements: 11.8, projectedPoints: calculateProjectedPoints(5.8, 6.0, "MID"), position: "MID" },
  { rank: 45, name: "Thiago", team: "SOU", goals: 9.3, assists: 2.4, totalInvolvements: 11.6, projectedPoints: calculateProjectedPoints(9.3, 2.4, "FWD"), position: "FWD" },
  { rank: 46, name: "Enzo", team: "CHE", goals: 5.5, assists: 6.0, totalInvolvements: 11.5, projectedPoints: calculateProjectedPoints(5.5, 6.0, "MID"), position: "MID" },
  { rank: 47, name: "Murphy", team: "NEW", goals: 4.9, assists: 6.5, totalInvolvements: 11.4, projectedPoints: calculateProjectedPoints(4.9, 6.5, "MID"), position: "MID" },
  { rank: 48, name: "Paqueta", team: "WHU", goals: 6.8, assists: 4.6, totalInvolvements: 11.4, projectedPoints: calculateProjectedPoints(6.8, 4.6, "MID"), position: "MID" },
  { rank: 49, name: "Amad", team: "MUN", goals: 5.5, assists: 5.8, totalInvolvements: 11.3, projectedPoints: calculateProjectedPoints(5.5, 5.8, "MID"), position: "MID" },
  { rank: 50, name: "Doku", team: "MCI", goals: 4.9, assists: 6.3, totalInvolvements: 11.1, projectedPoints: calculateProjectedPoints(4.9, 6.3, "MID"), position: "MID" }
];

export default function SeasonProjections() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"goals" | "assists" | "totalInvolvements" | "projectedPoints">("totalInvolvements");
  const [activeTab, setActiveTab] = useState("involvements");

  // Update sort when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "points") {
      setSortBy("projectedPoints");
    } else {
      setSortBy("totalInvolvements");
    }
  };
  const [positionFilter, setPositionFilter] = useState("all");

  const getTeamColor = (team: string): string => {
    const teamColors: Record<string, string> = {
      "MCI": "bg-sky-500",
      "LIV": "bg-red-600", 
      "CHE": "bg-blue-600",
      "ARS": "bg-red-500",
      "NEW": "bg-black",
      "MUN": "bg-red-600",
      "AVL": "bg-purple-600",
      "TOT": "bg-blue-900",
      "WHU": "bg-purple-800",
      "BHA": "bg-blue-400",
      "CRY": "bg-blue-700",
      "WOL": "bg-orange-500",
      "NFO": "bg-red-700",
      "BOU": "bg-red-800",
      "BRE": "bg-red-600",
      "FUL": "bg-black",
      "IPS": "bg-blue-600",
      "SOU": "bg-red-600",
      "LEI": "bg-blue-600"
    };
    return teamColors[team] || "bg-gray-500";
  };

  const filteredAndSortedData = seasonProjectionsData
    .filter(player => 
      !searchTerm || 
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "goals":
          return b.goals - a.goals;
        case "assists":
          return b.assists - a.assists;
        case "projectedPoints":
          return b.projectedPoints - a.projectedPoints;
        case "totalInvolvements":
        default:
          return b.totalInvolvements - a.totalInvolvements;
      }
    });

  return (
    <Layout>
      <div className="fpl-page-container">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-title">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            Season-Long Projections
          </div>
          <p className="fpl-page-subtitle">
            🎯 PL 25-26: Season-long goal involvements by @robtfpl | Data: @SpreadexSport
          </p>
        </div>

        <div className="fpl-section-spacing">
          {/* Filters */}
          <div className="fpl-filters">
            <div className="fpl-card-header">
              <div className="fpl-card-title">
                <Search className="h-5 w-5 text-blue-600" />
                Filter Season Projections
              </div>
            </div>
            <div className="fpl-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players or teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 md:h-12 border-2"
                    data-testid="input-search"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Sort By</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-sort">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="totalInvolvements">Total Involvements</SelectItem>
                      <SelectItem value="goals">Goals</SelectItem>
                      <SelectItem value="assists">Assists</SelectItem>
                      <SelectItem value="projectedPoints">Projected Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs for switching between views */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="involvements" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Goals & Assists
              </TabsTrigger>
              <TabsTrigger value="points" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Projected Points
              </TabsTrigger>
            </TabsList>

            <TabsContent value="involvements">
              {/* Summary Stats for Goals/Assists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="fpl-card border-2 border-green-200">
                  <div className="fpl-card-content p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <Target className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Top Scorer</p>
                        <p className="text-lg font-bold text-gray-900">Haaland (24.5)</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="fpl-card border-2 border-blue-200">
                  <div className="fpl-card-content p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Top Assists</p>
                        <p className="text-lg font-bold text-gray-900">Salah & Palmer (10.3)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fpl-card border-2 border-purple-200">
                  <div className="fpl-card-content p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Top Involvements</p>
                        <p className="text-lg font-bold text-gray-900">Haaland (28.6)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="points">
              {/* Summary Stats for Points */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="fpl-card border-2 border-yellow-200">
                  <div className="fpl-card-content p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Top Points</p>
                        <p className="text-lg font-bold text-gray-900">Salah ({Math.max(...seasonProjectionsData.map(p => p.projectedPoints))})</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="fpl-card border-2 border-orange-200">
                  <div className="fpl-card-content p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <Zap className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Avg Top 10</p>
                        <p className="text-lg font-bold text-gray-900">{Math.round(seasonProjectionsData.slice(0, 10).reduce((sum, p) => sum + p.projectedPoints, 0) / 10)} pts</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fpl-card border-2 border-purple-200">
                  <div className="fpl-card-content p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <UserPlus className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Top Forward</p>
                        <p className="text-lg font-bold text-gray-900">Haaland ({seasonProjectionsData.find(p => p.name === "Haaland")?.projectedPoints})</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Results Table */}
          <div className="fpl-table-container">
            <div className="fpl-card-header">
              <div className="fpl-card-title">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Season Projections Results
              </div>
            </div>
            <div className="fpl-card-content">
              <div className="w-full table-scroll overflow-y-auto max-h-[70vh] bg-white rounded-xl border border-gray-200">
                <table className="fpl-table text-xs min-w-[600px] w-full">
                  <thead className="fpl-table-header">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-center min-w-[50px] font-semibold text-gray-900 text-xs sm:text-sm">
                        Rank
                      </th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left min-w-[140px] font-semibold text-gray-900 text-xs sm:text-sm">
                        Player
                      </th>
                      <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[50px] font-semibold text-gray-900 text-xs sm:text-sm">Team</th>
                      {activeTab === "involvements" && (
                        <>
                          <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[70px] font-semibold text-gray-900 text-xs sm:text-sm">
                            <button 
                              onClick={() => setSortBy("goals")}
                              className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs sm:text-sm"
                            >
                              Goals
                            </button>
                          </th>
                          <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[70px] font-semibold text-gray-900 text-xs sm:text-sm">
                            <button 
                              onClick={() => setSortBy("assists")}
                              className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs sm:text-sm"
                            >
                              Assists
                            </button>
                          </th>
                        </>
                      )}
                      {activeTab === "involvements" ? (
                        <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[80px] font-semibold text-blue-900 bg-blue-50 text-xs sm:text-sm">
                          <button 
                            onClick={() => setSortBy("totalInvolvements")}
                            className="flex items-center justify-center gap-1 hover:text-blue-800 transition-colors text-xs sm:text-sm"
                          >
                            G+A
                          </button>
                        </th>
                      ) : (
                        <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[80px] font-semibold text-yellow-900 bg-yellow-50 text-xs sm:text-sm">
                          <button 
                            onClick={() => setSortBy("projectedPoints")}
                            className="flex items-center justify-center gap-1 hover:text-yellow-800 transition-colors text-xs sm:text-sm"
                          >
                            Points
                          </button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedData.map((player, index) => (
                      <tr 
                        key={player.rank}
                        className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">
                            {player.rank}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-left">
                          <span className="font-medium text-gray-900 text-xs sm:text-sm">
                            {player.name}
                          </span>
                        </td>
                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                          <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${getTeamColor(player.team)}`}>
                            {player.team.substring(0, 2)}
                          </span>
                        </td>
                        {activeTab === "involvements" && (
                          <>
                            <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                              <span className="text-xs sm:text-sm font-medium text-green-700">
                                {player.goals.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                              <span className="text-xs sm:text-sm font-medium text-blue-700">
                                {player.assists.toFixed(1)}
                              </span>
                            </td>
                          </>
                        )}
                        {activeTab === "involvements" ? (
                          <td className="px-1 sm:px-2 py-2 sm:py-3 text-center bg-blue-50">
                            <span className="text-xs sm:text-sm font-bold text-blue-900">
                              {player.totalInvolvements.toFixed(1)}
                            </span>
                          </td>
                        ) : (
                          <td className="px-1 sm:px-2 py-2 sm:py-3 text-center bg-yellow-50">
                            <span className="text-xs sm:text-sm font-bold text-yellow-900">
                              {player.projectedPoints}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer */}
              <div className="mt-4 text-center bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-700">
                  Showing <span className="font-bold">{filteredAndSortedData.length}</span> players • Data by @robtfpl/@SpreadexSport
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
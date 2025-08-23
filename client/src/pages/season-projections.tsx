import { useState } from "react";
import { TrendingUp, Target, Users, Search, ChevronUp, ChevronDown } from "lucide-react";
import Layout from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SeasonProjection {
  rank: number;
  name: string;
  team: string;
  goals: number;
  assists: number;
  totalInvolvements: number;
}

const seasonProjectionsData: SeasonProjection[] = [
  { rank: 1, name: "Haaland", team: "MCI", goals: 24.5, assists: 4.1, totalInvolvements: 28.6 },
  { rank: 2, name: "Salah", team: "LIV", goals: 18.3, assists: 10.3, totalInvolvements: 28.6 },
  { rank: 3, name: "Palmer", team: "CHE", goals: 14.8, assists: 10.3, totalInvolvements: 25.1 },
  { rank: 4, name: "Saka", team: "ARS", goals: 12.3, assists: 10.3, totalInvolvements: 22.6 },
  { rank: 5, name: "Isak", team: "NEW", goals: 17.3, assists: 4.1, totalInvolvements: 21.4 },
  { rank: 6, name: "Fernandes", team: "MUN", goals: 10.8, assists: 10.0, totalInvolvements: 20.8 },
  { rank: 7, name: "Gyokeres", team: "SCP", goals: 16.3, assists: 4.4, totalInvolvements: 20.6 },
  { rank: 8, name: "Marmous", team: "LIV", goals: 11.8, assists: 6.5, totalInvolvements: 18.3 },
  { rank: 9, name: "Wirtz", team: "LEV", goals: 9.8, assists: 8.3, totalInvolvements: 18.0 },
  { rank: 10, name: "Watkins", team: "AVL", goals: 13.3, assists: 4.6, totalInvolvements: 17.9 },
  { rank: 11, name: "Solanke", team: "TOT", goals: 13.8, assists: 3.6, totalInvolvements: 17.4 },
  { rank: 12, name: "Bowen", team: "WHU", goals: 10.3, assists: 6.8, totalInvolvements: 17.0 },
  { rank: 13, name: "Gordon", team: "NEW", goals: 10.3, assists: 6.5, totalInvolvements: 16.8 },
  { rank: 14, name: "Rogers", team: "AVL", goals: 9.0, assists: 7.3, totalInvolvements: 16.3 },
  { rank: 15, name: "Joao Pedro", team: "BHA", goals: 10.8, assists: 5.5, totalInvolvements: 16.3 },
  { rank: 16, name: "Foden", team: "MCI", goals: 9.5, assists: 6.8, totalInvolvements: 16.3 },
  { rank: 17, name: "Mateta", team: "CRY", goals: 12.8, assists: 2.9, totalInvolvements: 15.6 },
  { rank: 18, name: "Cunha", team: "WOL", goals: 9.0, assists: 6.5, totalInvolvements: 15.5 },
  { rank: 19, name: "Wood", team: "NEW", goals: 12.3, assists: 2.9, totalInvolvements: 15.1 },
  { rank: 20, name: "Elanga", team: "NFO", goals: 7.5, assists: 7.0, totalInvolvements: 14.5 },
  { rank: 21, name: "Gibbs-White", team: "NFO", goals: 7.0, assists: 7.5, totalInvolvements: 14.5 },
  { rank: 22, name: "Barnes", team: "NEW", goals: 8.0, assists: 6.3, totalInvolvements: 14.3 },
  { rank: 23, name: "Evanilson", team: "BOU", goals: 11.3, assists: 2.9, totalInvolvements: 14.1 },
  { rank: 24, name: "Str.Larsen", team: "WOL", goals: 10.8, assists: 3.4, totalInvolvements: 14.1 },
  { rank: 25, name: "Odegaard", team: "ARS", goals: 6.0, assists: 8.0, totalInvolvements: 14.0 },
  { rank: 26, name: "Sarr", team: "CRY", goals: 7.8, assists: 6.3, totalInvolvements: 14.0 },
  { rank: 27, name: "Mbeumo", team: "BRE", goals: 8.0, assists: 6.0, totalInvolvements: 14.0 },
  { rank: 28, name: "Johnson", team: "FUL", goals: 9.0, assists: 5.0, totalInvolvements: 14.0 },
  { rank: 29, name: "Semenyo", team: "BOU", goals: 9.3, assists: 4.6, totalInvolvements: 13.9 },
  { rank: 30, name: "Gakpo", team: "LIV", goals: 9.0, assists: 4.9, totalInvolvements: 13.9 },
  { rank: 31, name: "Martinelli", team: "ARS", goals: 7.3, assists: 6.5, totalInvolvements: 13.8 },
  { rank: 32, name: "Cherki", team: "LYO", goals: 6.0, assists: 7.8, totalInvolvements: 13.8 },
  { rank: 33, name: "Neto", team: "CHE", goals: 6.3, assists: 7.3, totalInvolvements: 13.5 },
  { rank: 34, name: "Kluivert", team: "BOU", goals: 8.8, assists: 4.6, totalInvolvements: 13.4 },
  { rank: 35, name: "Sesko", team: "RBL", goals: 10.8, assists: 2.6, totalInvolvements: 13.4 },
  { rank: 36, name: "Rice", team: "ARS", goals: 5.3, assists: 7.8, totalInvolvements: 13.0 },
  { rank: 37, name: "Mitoma", team: "BHA", goals: 7.8, assists: 5.3, totalInvolvements: 13.0 },
  { rank: 38, name: "Georginio", team: "LIV", goals: 7.5, assists: 5.3, totalInvolvements: 12.8 },
  { rank: 39, name: "Delap", team: "IPS", goals: 9.5, assists: 2.9, totalInvolvements: 12.4 },
  { rank: 40, name: "Raul", team: "WOL", goals: 9.8, assists: 2.6, totalInvolvements: 12.4 },
  { rank: 41, name: "Kudus", team: "WHU", goals: 7.3, assists: 5.0, totalInvolvements: 12.3 },
  { rank: 42, name: "Havertz", team: "ARS", goals: 8.5, assists: 3.6, totalInvolvements: 12.1 },
  { rank: 43, name: "Schade", team: "BRE", goals: 7.8, assists: 4.1, totalInvolvements: 11.9 },
  { rank: 44, name: "Szoboszlai", team: "LIV", goals: 5.8, assists: 6.0, totalInvolvements: 11.8 },
  { rank: 45, name: "Thiago", team: "SOU", goals: 9.3, assists: 2.4, totalInvolvements: 11.6 },
  { rank: 46, name: "Enzo", team: "CHE", goals: 5.5, assists: 6.0, totalInvolvements: 11.5 },
  { rank: 47, name: "Murphy", team: "NEW", goals: 4.9, assists: 6.5, totalInvolvements: 11.4 },
  { rank: 48, name: "Paqueta", team: "WHU", goals: 6.8, assists: 4.6, totalInvolvements: 11.4 },
  { rank: 49, name: "Amad", team: "MUN", goals: 5.5, assists: 5.8, totalInvolvements: 11.3 },
  { rank: 50, name: "Doku", team: "MCI", goals: 4.9, assists: 6.3, totalInvolvements: 11.1 }
];

export default function SeasonProjections() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"goals" | "assists" | "totalInvolvements">("totalInvolvements");
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
            Season long Projections
          </div>
          <p className="fpl-page-subtitle">
            🎯 PL 25-26: Season long goal involvements by @robtfpl | Data: @SpreadexSport
          </p>
        </div>

        <div className="fpl-section-spacing">
          {/* Smart Filters */}
          <div className="fpl-filters">
            <div className="fpl-card-header">
              <div className="fpl-card-title">
                <Search className="h-5 w-5 text-blue-600" />
                Smart Filters & Search
              </div>
            </div>
            <div className="fpl-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="relative sm:col-span-2 lg:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players or teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 md:h-12 border-2"
                    data-testid="input-search"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:col-span-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Sort By</label>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-sort">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="totalInvolvements">G+A (Total Goal Involvements)</SelectItem>
                        <SelectItem value="goals">Goals</SelectItem>
                        <SelectItem value="assists">Assists</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="fpl-card border-2 border-green-200">
              <div className="fpl-card-content p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Top Goal Scorer</p>
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
                    <p className="text-sm text-gray-600">Top Goal Involvements</p>
                    <p className="text-lg font-bold text-gray-900">Haaland (28.6)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="fpl-table-container">
            <div className="fpl-card-header">
              <div className="fpl-card-title">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Season Long Projections
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
                      <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[70px] font-semibold text-gray-900 text-xs sm:text-sm">
                        <button 
                          onClick={() => setSortBy("goals")}
                          className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs sm:text-sm w-full"
                        >
                          Goals
                          {sortBy === "goals" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[70px] font-semibold text-gray-900 text-xs sm:text-sm">
                        <button 
                          onClick={() => setSortBy("assists")}
                          className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs sm:text-sm w-full"
                        >
                          Assists
                          {sortBy === "assists" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[80px] font-semibold text-blue-900 bg-blue-50 text-xs sm:text-sm">
                        <button 
                          onClick={() => setSortBy("totalInvolvements")}
                          className="flex items-center justify-center gap-1 hover:text-blue-800 transition-colors text-xs sm:text-sm w-full"
                        >
                          G+A
                          {sortBy === "totalInvolvements" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
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
                        <td className="px-1 sm:px-2 py-2 sm:py-3 text-center bg-blue-50">
                          <span className="text-xs sm:text-sm font-bold text-blue-900">
                            {player.totalInvolvements.toFixed(1)}
                          </span>
                        </td>
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
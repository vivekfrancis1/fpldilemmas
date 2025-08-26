import { useState } from "react";
import { TrendingUp, Target, Users, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SeasonProjection {
  rank: number;
  name: string;
  fullName: string;
  team: string;
  teamName: string;
  position: string;
  goals: number;
  assists: number;
  totalInvolvements: number;
}

const seasonProjectionsData: SeasonProjection[] = [
  { rank: 1, name: "Haaland", fullName: "Erling Braut Haaland", team: "MCI", teamName: "Manchester City", position: "FWD", goals: 24.5, assists: 4.1, totalInvolvements: 28.6 },
  { rank: 2, name: "Salah", fullName: "Mohamed Salah", team: "LIV", teamName: "Liverpool", position: "FWD", goals: 18.3, assists: 10.3, totalInvolvements: 28.6 },
  { rank: 3, name: "Palmer", fullName: "Cole Palmer", team: "CHE", teamName: "Chelsea", position: "MID", goals: 14.8, assists: 10.3, totalInvolvements: 25.1 },
  { rank: 4, name: "Saka", fullName: "Bukayo Saka", team: "ARS", teamName: "Arsenal", position: "MID", goals: 12.3, assists: 10.3, totalInvolvements: 22.6 },
  { rank: 5, name: "Isak", fullName: "Alexander Isak", team: "NEW", teamName: "Newcastle United", position: "FWD", goals: 17.3, assists: 4.1, totalInvolvements: 21.4 },
  { rank: 6, name: "Fernandes", fullName: "Bruno Fernandes", team: "MUN", teamName: "Manchester United", position: "MID", goals: 10.8, assists: 10.0, totalInvolvements: 20.8 },
  { rank: 7, name: "Gyokeres", fullName: "Viktor Gyökeres", team: "SCP", teamName: "Sporting CP", position: "FWD", goals: 16.3, assists: 4.4, totalInvolvements: 20.6 },
  { rank: 8, name: "Marmoush", fullName: "Omar Marmoush", team: "LIV", teamName: "Liverpool", position: "FWD", goals: 11.8, assists: 6.5, totalInvolvements: 18.3 },
  { rank: 9, name: "Wirtz", fullName: "Florian Wirtz", team: "LEV", teamName: "Bayer Leverkusen", position: "MID", goals: 9.8, assists: 8.3, totalInvolvements: 18.0 },
  { rank: 10, name: "Watkins", fullName: "Ollie Watkins", team: "AVL", teamName: "Aston Villa", position: "FWD", goals: 13.3, assists: 4.6, totalInvolvements: 17.9 },
  { rank: 11, name: "Solanke", fullName: "Dominic Solanke", team: "TOT", teamName: "Tottenham Hotspur", position: "FWD", goals: 13.8, assists: 3.6, totalInvolvements: 17.4 },
  { rank: 12, name: "Bowen", fullName: "Jarrod Bowen", team: "WHU", teamName: "West Ham United", position: "MID", goals: 10.3, assists: 6.8, totalInvolvements: 17.0 },
  { rank: 13, name: "Gordon", fullName: "Anthony Gordon", team: "NEW", teamName: "Newcastle United", position: "MID", goals: 10.3, assists: 6.5, totalInvolvements: 16.8 },
  { rank: 14, name: "Rogers", fullName: "Morgan Rogers", team: "AVL", teamName: "Aston Villa", position: "MID", goals: 9.0, assists: 7.3, totalInvolvements: 16.3 },
  { rank: 15, name: "Joao Pedro", fullName: "João Pedro", team: "BHA", teamName: "Brighton & Hove Albion", position: "FWD", goals: 10.8, assists: 5.5, totalInvolvements: 16.3 },
  { rank: 16, name: "Foden", fullName: "Phil Foden", team: "MCI", teamName: "Manchester City", position: "MID", goals: 9.5, assists: 6.8, totalInvolvements: 16.3 },
  { rank: 17, name: "Mateta", fullName: "Jean-Philippe Mateta", team: "CRY", teamName: "Crystal Palace", position: "FWD", goals: 12.8, assists: 2.9, totalInvolvements: 15.6 },
  { rank: 18, name: "Cunha", fullName: "Matheus Cunha", team: "WOL", teamName: "Wolverhampton Wanderers", position: "FWD", goals: 9.0, assists: 6.5, totalInvolvements: 15.5 },
  { rank: 19, name: "Wood", fullName: "Chris Wood", team: "NEW", teamName: "Newcastle United", position: "FWD", goals: 12.3, assists: 2.9, totalInvolvements: 15.1 },
  { rank: 20, name: "Elanga", fullName: "Anthony Elanga", team: "NFO", teamName: "Nottingham Forest", position: "MID", goals: 7.5, assists: 7.0, totalInvolvements: 14.5 },
  { rank: 21, name: "Gibbs-White", fullName: "Morgan Gibbs-White", team: "NFO", teamName: "Nottingham Forest", position: "MID", goals: 7.0, assists: 7.5, totalInvolvements: 14.5 },
  { rank: 22, name: "Barnes", fullName: "Harvey Barnes", team: "NEW", teamName: "Newcastle United", position: "MID", goals: 8.0, assists: 6.3, totalInvolvements: 14.3 },
  { rank: 23, name: "Evanilson", fullName: "Evanilson", team: "BOU", teamName: "AFC Bournemouth", position: "FWD", goals: 11.3, assists: 2.9, totalInvolvements: 14.1 },
  { rank: 24, name: "Str.Larsen", fullName: "Jørgen Strand Larsen", team: "WOL", teamName: "Wolverhampton Wanderers", position: "FWD", goals: 10.8, assists: 3.4, totalInvolvements: 14.1 },
  { rank: 25, name: "Odegaard", fullName: "Martin Ødegaard", team: "ARS", teamName: "Arsenal", position: "MID", goals: 6.0, assists: 8.0, totalInvolvements: 14.0 },
  { rank: 26, name: "Sarr", fullName: "Ismaïla Sarr", team: "CRY", teamName: "Crystal Palace", position: "MID", goals: 7.8, assists: 6.3, totalInvolvements: 14.0 },
  { rank: 27, name: "Mbeumo", fullName: "Bryan Mbeumo", team: "BRE", teamName: "Brentford", position: "MID", goals: 8.0, assists: 6.0, totalInvolvements: 14.0 },
  { rank: 28, name: "Johnson", fullName: "Brennan Johnson", team: "FUL", teamName: "Fulham", position: "MID", goals: 9.0, assists: 5.0, totalInvolvements: 14.0 },
  { rank: 29, name: "Semenyo", fullName: "Antoine Semenyo", team: "BOU", teamName: "AFC Bournemouth", position: "MID", goals: 9.3, assists: 4.6, totalInvolvements: 13.9 },
  { rank: 30, name: "Gakpo", fullName: "Cody Gakpo", team: "LIV", teamName: "Liverpool", position: "FWD", goals: 9.0, assists: 4.9, totalInvolvements: 13.9 },
  { rank: 31, name: "Martinelli", fullName: "Gabriel Martinelli", team: "ARS", teamName: "Arsenal", position: "MID", goals: 7.3, assists: 6.5, totalInvolvements: 13.8 },
  { rank: 32, name: "Cherki", fullName: "Rayan Cherki", team: "LYO", teamName: "Olympique Lyonnais", position: "MID", goals: 6.0, assists: 7.8, totalInvolvements: 13.8 },
  { rank: 33, name: "Neto", fullName: "Pedro Neto", team: "CHE", teamName: "Chelsea", position: "MID", goals: 6.3, assists: 7.3, totalInvolvements: 13.5 },
  { rank: 34, name: "Kluivert", fullName: "Justin Kluivert", team: "BOU", teamName: "AFC Bournemouth", position: "MID", goals: 8.8, assists: 4.6, totalInvolvements: 13.4 },
  { rank: 35, name: "Sesko", fullName: "Benjamin Šeško", team: "RBL", teamName: "RB Leipzig", position: "FWD", goals: 10.8, assists: 2.6, totalInvolvements: 13.4 },
  { rank: 36, name: "Rice", fullName: "Declan Rice", team: "ARS", teamName: "Arsenal", position: "MID", goals: 5.3, assists: 7.8, totalInvolvements: 13.0 },
  { rank: 37, name: "Mitoma", fullName: "Kaoru Mitoma", team: "BHA", teamName: "Brighton & Hove Albion", position: "MID", goals: 7.8, assists: 5.3, totalInvolvements: 13.0 },
  { rank: 38, name: "Georginio", fullName: "Georginio Wijnaldum", team: "LIV", teamName: "Liverpool", position: "MID", goals: 7.5, assists: 5.3, totalInvolvements: 12.8 },
  { rank: 39, name: "Delap", fullName: "Liam Delap", team: "IPS", teamName: "Ipswich Town", position: "FWD", goals: 9.5, assists: 2.9, totalInvolvements: 12.4 },
  { rank: 40, name: "Raul", fullName: "Raúl Jiménez", team: "WOL", teamName: "Wolverhampton Wanderers", position: "FWD", goals: 9.8, assists: 2.6, totalInvolvements: 12.4 },
  { rank: 41, name: "Kudus", fullName: "Mohammed Kudus", team: "WHU", teamName: "West Ham United", position: "MID", goals: 7.3, assists: 5.0, totalInvolvements: 12.3 },
  { rank: 42, name: "Havertz", fullName: "Kai Havertz", team: "ARS", teamName: "Arsenal", position: "FWD", goals: 8.5, assists: 3.6, totalInvolvements: 12.1 },
  { rank: 43, name: "Schade", fullName: "Kevin Schade", team: "BRE", teamName: "Brentford", position: "FWD", goals: 7.8, assists: 4.1, totalInvolvements: 11.9 },
  { rank: 44, name: "Szoboszlai", fullName: "Dominik Szoboszlai", team: "LIV", teamName: "Liverpool", position: "MID", goals: 5.8, assists: 6.0, totalInvolvements: 11.8 },
  { rank: 45, name: "Thiago", fullName: "Thiago Alcântara", team: "SOU", teamName: "Southampton", position: "MID", goals: 9.3, assists: 2.4, totalInvolvements: 11.6 },
  { rank: 46, name: "Enzo", fullName: "Enzo Fernández", team: "CHE", teamName: "Chelsea", position: "MID", goals: 5.5, assists: 6.0, totalInvolvements: 11.5 },
  { rank: 47, name: "Murphy", fullName: "Jacob Murphy", team: "NEW", teamName: "Newcastle United", position: "MID", goals: 4.9, assists: 6.5, totalInvolvements: 11.4 },
  { rank: 48, name: "Paqueta", fullName: "Lucas Paquetá", team: "WHU", teamName: "West Ham United", position: "MID", goals: 6.8, assists: 4.6, totalInvolvements: 11.4 },
  { rank: 49, name: "Amad", fullName: "Amad Diallo", team: "MUN", teamName: "Manchester United", position: "MID", goals: 5.5, assists: 5.8, totalInvolvements: 11.3 },
  { rank: 50, name: "Doku", fullName: "Jérémy Doku", team: "MCI", teamName: "Manchester City", position: "MID", goals: 4.9, assists: 6.3, totalInvolvements: 11.1 }
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
      player.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.position.toLowerCase().includes(searchTerm.toLowerCase())
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
          {/* Search Only */}
          <div className="fpl-filters">
            <div className="fpl-card-header">
              <div className="fpl-card-title">
                <Search className="h-5 w-5 text-blue-600" />
                Search Players
              </div>
            </div>
            <div className="fpl-card-content">
              <div className="relative w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search players or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 border-2 text-base"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="fpl-card border-2 border-green-200">
              <div className="fpl-card-content p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600">Top Goal Scorer</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">Haaland (24.5)</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="fpl-card border-2 border-blue-200">
              <div className="fpl-card-content p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600">Top Assists</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">Salah & Palmer (10.3)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="fpl-card border-2 border-purple-200">
              <div className="fpl-card-content p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600">Top Goal Involvements</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">Haaland (28.6)</p>
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
              <div className="w-full table-scroll overflow-x-auto overflow-y-auto max-h-[70vh] bg-white rounded-xl border border-gray-200 -mx-2 sm:mx-0">
                <table className="fpl-table text-xs min-w-[580px] sm:min-w-[600px] w-full">
                  <thead className="fpl-table-header">
                    <tr>
                      <th className="px-2 py-3 text-center min-w-[40px] font-semibold text-gray-900 text-xs">
                        #
                      </th>
                      <th className="px-2 py-3 text-left min-w-[180px] font-semibold text-gray-900 text-xs">
                        Player
                      </th>
                      <th className="px-1 py-3 text-center min-w-[45px] font-semibold text-gray-900 text-xs">Pos</th>
                      <th className="px-1 py-3 text-center min-w-[120px] font-semibold text-gray-900 text-xs">Team</th>
                      <th className="px-1 py-3 text-center min-w-[65px] font-semibold text-gray-900 text-xs">
                        <button 
                          onClick={() => setSortBy("goals")}
                          className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs w-full py-2 px-1 -my-2 -mx-1 rounded touch-manipulation"
                        >
                          Goals
                          {sortBy === "goals" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-1 py-3 text-center min-w-[70px] font-semibold text-gray-900 text-xs">
                        <button 
                          onClick={() => setSortBy("assists")}
                          className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs w-full py-2 px-1 -my-2 -mx-1 rounded touch-manipulation"
                        >
                          Assists
                          {sortBy === "assists" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-1 py-3 text-center min-w-[70px] font-semibold text-blue-900 bg-blue-50 text-xs">
                        <button 
                          onClick={() => setSortBy("totalInvolvements")}
                          className="flex items-center justify-center gap-1 hover:text-blue-800 transition-colors text-xs w-full py-2 px-1 -my-2 -mx-1 rounded touch-manipulation"
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
                        <td className="px-2 py-3 text-center">
                          <span className="text-xs font-medium text-gray-600">
                            {player.rank}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-left">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-xs leading-tight">
                              {player.fullName}
                            </span>
                            <span className="text-xs text-gray-500 mt-0.5">
                              {player.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-1 py-3 text-center">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {player.position}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${getTeamColor(player.team)}`}>
                              {player.team}
                            </span>
                            <span className="text-xs text-gray-500 mt-0.5">
                              {player.teamName}
                            </span>
                          </div>
                        </td>
                        <td className="px-1 py-3 text-center">
                          <span className="text-xs font-medium text-green-700">
                            {player.goals.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-center">
                          <span className="text-xs font-medium text-blue-700">
                            {player.assists.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-center bg-blue-50">
                          <span className="text-xs font-bold text-blue-900">
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
                <div className="text-xs sm:text-sm text-purple-700">
                  Showing <span className="font-bold">{filteredAndSortedData.length}</span> players<br className="sm:hidden" />
                  <span className="hidden sm:inline"> • </span>Data by @robtfpl/@SpreadexSport
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    
  );
}
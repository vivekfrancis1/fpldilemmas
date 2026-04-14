import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [includeTBC, setIncludeTBC] = useState(false);

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Get current gameweek and calculate next 6 gameweeks
  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 5;
  const nextGameweek = currentGameweek + 1;
  const baseGameweeks = Array.from({ length: 6 }, (_, i) => nextGameweek + i);
  const gameweeks = includeTBC ? [...baseGameweeks, 39] : baseGameweeks;
  const endGameweek = includeTBC ? 39 : gameweeks[gameweeks.length - 1];

  // Live API call for goals conceded projections
  const { data: goalsConcededProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: [`/api/player-goals-conceded-projections?startGameweek=${nextGameweek}&endGameweek=${endGameweek}`],
    enabled: !!nextGameweek && gameweeks.length > 0,
    staleTime: 10 * 60 * 1000,
  });

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
      aValue = a.goalsConceded[sortBy] || 0;
      bValue = b.goalsConceded[sortBy] || 0;
    } else if (sortBy.startsWith("pts_gw")) {
      const gw = sortBy.replace("pts_", "");
      aValue = a.pointsFromGoalsConceded[gw] || 0;
      bValue = b.pointsFromGoalsConceded[gw] || 0;
    } else {
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
      if (column === "playerName" || column === "teamName" || column === "position") {
        setSortDirection("asc");
      } else {
        setSortDirection("desc");
      }
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (isLoadingBootstrap || isLoadingProjections) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Goals Conceded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Calculating goals conceded projections for goalkeepers and defenders...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true}>
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

      <div className="fpl-section-spacing">
        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold">Filters & Controls</h3>
                </div>
                <div className="flex items-center gap-2">
                  {isFiltersOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                  <div className="relative">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 text-xs pl-8"
                        data-testid="input-search"
                      />
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="pos" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                    <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                      <span className="hidden sm:inline">Position</span><span className="sm:hidden">Pos</span>{positionFilter !== "all" && " (1)"}
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                      Teams{teamFilter !== "all" && " (1)"}
                    </TabsTrigger>
                    <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                      Gameweeks
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pos" className="mt-0">
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      {['All', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => {
                        const value = pos === 'All' ? 'all' : pos;
                        const isActive = (positionFilter === value) || (pos === 'All' && positionFilter === 'all');
                        return (
                          <button key={pos}
                            onClick={() => setPositionFilter(positionFilter === value && value !== 'all' ? 'all' : value)}
                            className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                            {pos}
                          </button>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="teams" className="mt-0">
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      <button onClick={() => setTeamFilter('all')}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${teamFilter === 'all' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                        All
                      </button>
                      {Array.from(new Set((goalsConcededProjections || []).map((p: any) => p.teamName))).sort().map(team => (
                        <button key={team}
                          onClick={() => setTeamFilter(teamFilter === team ? 'all' : team)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${teamFilter === team ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          {team}
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="gws" className="mt-0">
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      <button
                        onClick={() => setIncludeTBC(!includeTBC)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${includeTBC ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                        GW39 (TBC)
                      </button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Results */}
        <Tabs defaultValue="conceded" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conceded">Goals Conceded</TabsTrigger>
            <TabsTrigger value="points">Points from Goals Conceded</TabsTrigger>
          </TabsList>

          <TabsContent value="conceded" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Goals Conceded (GW{nextGameweek}-{endGameweek}{includeTBC ? ' incl. TBC' : ''})</CardTitle>
                <CardDescription>
                  Projected goals conceded based on team defensive strength vs opponent attack power
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
                          <th key={gw} className={`text-center cursor-pointer${gw === 39 ? ' text-orange-600' : ''}`} onClick={() => handleSort(`gw${gw}`)}>
                            <div className="flex items-center justify-center gap-1">
                              {gw === 39 ? 'TBC' : `GW${gw}`} {getSortIcon(`gw${gw}`)}
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
                <CardTitle>Points from Goals Conceded (GW{nextGameweek}-{endGameweek}{includeTBC ? ' incl. TBC' : ''})</CardTitle>
                <CardDescription>
                  FPL point penalties (-1 point for every 2 goals conceded) for goalkeepers and defenders
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
                          <th key={gw} className={`text-center cursor-pointer${gw === 39 ? ' text-orange-600' : ''}`} onClick={() => handleSort(`pts_gw${gw}`)}>
                            <div className="flex items-center justify-center gap-1">
                              {gw === 39 ? 'TBC' : `GW${gw}`} {getSortIcon(`pts_gw${gw}`)}
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
                            {(projection.totalPoints / gameweeks.length).toFixed(1)}
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

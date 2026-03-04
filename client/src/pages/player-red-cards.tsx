import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { XCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProtectedRoute from "@/components/protected-route";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  redCards: number;
}

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
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
}

export default function PlayerRedCards() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalRedCards" | "totalPoints">("totalRedCards");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Cached API call for red card projections - 10-20x faster!
  const { data: redCardProjections, isLoading: isLoadingProjections } = useQuery<RedCardProjection[]>({
    queryKey: ["/api/cached/player-red-cards-projections"],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Extract gameweeks dynamically from API response
  const gameweeks = redCardProjections && redCardProjections.length > 0 
    ? Object.keys(redCardProjections[0].redCards).map(gw => parseInt(gw.replace('gw', ''))).sort((a, b) => a - b)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Red Card Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Calculating red card probabilities and FPL point penalties for all players...
            </p>
          </CardContent>
        </Card>
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
                  <TabsList className="w-full grid grid-cols-2 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                    <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                      Pos{positionFilter !== "all" && " (1)"}
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                      Teams{teamFilter !== "all" && " (1)"}
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
                      {Array.from(new Set((redCardProjections || []).map((p: any) => p.teamName))).sort().map(team => (
                        <button key={team}
                          onClick={() => setTeamFilter(teamFilter === team ? 'all' : team)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${teamFilter === team ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          {team}
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Results */}
        <Tabs defaultValue="cards" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">Red Cards</TabsTrigger>
            <TabsTrigger value="points">Points from Red Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Red Cards (Gameweeks {gameweekRange})</CardTitle>
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
                        {gameweeks.map(gw => (
                          <th key={gw} className="text-center">GW{gw}</th>
                        ))}
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
                          {gameweeks.map(gw => {
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            const value = projection.redCards[`gw${gw}`];
                            return (
                              <td key={gw} className="text-center">
                                {isDGW ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium">
                                        {typeof value === 'number' ? value.toFixed(2) : value}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                      <div className="text-xs font-semibold mb-2">GW{gw} Fixture Breakdown</div>
                                      {fixtures.map((f: FixtureDetail, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                          <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                            {f.opponent} ({f.isHome ? 'H' : 'A'})
                                          </span>
                                          <span className="font-medium text-xs">{f.redCards.toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                        <span>Total</span>
                                        <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  typeof value === 'number' ? value.toFixed(2) : value
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center font-semibold text-red-600">
                            {typeof projection.totalRedCards === 'number' ? projection.totalRedCards.toFixed(2) : projection.totalRedCards}
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
                <CardTitle>Points from Red Cards (Gameweeks {gameweekRange})</CardTitle>
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
                        {gameweeks.map(gw => (
                          <th key={gw} className="text-center">GW{gw}</th>
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
                      {filteredProjections.map((projection: RedCardProjection) => (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          {gameweeks.map(gw => {
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            const value = projection.pointsFromRedCards[`gw${gw}`];
                            return (
                              <td key={gw} className="text-center">
                                {isDGW ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium">
                                        {typeof value === 'number' ? value.toFixed(2) : value}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                      <div className="text-xs font-semibold mb-2">GW{gw} Points Breakdown</div>
                                      {fixtures.map((f: FixtureDetail, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                          <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                            {f.opponent} ({f.isHome ? 'H' : 'A'})
                                          </span>
                                          <span className="font-medium text-xs">{(-f.redCards * 3).toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                        <span>Total</span>
                                        <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  typeof value === 'number' ? value.toFixed(2) : value
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center font-semibold text-red-600">
                            {typeof projection.totalPoints === 'number' ? projection.totalPoints.toFixed(2) : projection.totalPoints}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {gameweeks.length > 0 ? (projection.totalPoints / gameweeks.length).toFixed(2) : '0.00'}
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
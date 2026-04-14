import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProtectedRoute from "@/components/protected-route";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  yellowCards: number;
}

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface YellowCardProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  yellowCards: { [key: string]: number };
  pointsFromYellowCards: { [key: string]: number };
  totalYellowCards: number;
  totalPoints: number;
  averagePerGameweek: number;
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
}

export default function PlayerYellowCards() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalYellowCards" | "totalPoints">("totalYellowCards");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [includeTBC, setIncludeTBC] = useState(false);
  const [selectedStartGW, setSelectedStartGW] = useState<number | null>(null);
  const [selectedEndGW, setSelectedEndGW] = useState<number | null>(null);

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // When includeTBC is on, fetch with endGameweek=39 (bypasses cache to include GW39)
  const { data: yellowCardProjections, isLoading: isLoadingProjections } = useQuery<YellowCardProjection[]>({
    queryKey: [includeTBC
      ? "/api/player-yellow-cards-projections?endGameweek=39"
      : "/api/cached/player-yellow-cards-projections"],
    staleTime: includeTBC ? 10 * 60 * 1000 : 60 * 60 * 1000,
  });

  // Extract gameweeks dynamically from API response
  const allGameweeks = yellowCardProjections && yellowCardProjections.length > 0 
    ? Object.keys(yellowCardProjections[0].yellowCards).map(gw => parseInt(gw.replace('gw', ''))).sort((a, b) => a - b)
    : [];
  
  // Filter out GW39 if not includeTBC
  const gameweeks = includeTBC ? allGameweeks : allGameweeks.filter(gw => gw !== 39);

  // Effective start/end for display (clamped to available gameweeks)
  const effectiveStartGW = selectedStartGW !== null && gameweeks.includes(selectedStartGW) ? selectedStartGW : (gameweeks[0] ?? 1);
  const effectiveEndGW = selectedEndGW !== null && gameweeks.includes(selectedEndGW) && selectedEndGW >= effectiveStartGW ? selectedEndGW : (gameweeks[gameweeks.length - 1] ?? 38);
  const displayGWs = gameweeks.filter(gw => gw >= effectiveStartGW && gw <= effectiveEndGW);
  
  const gameweekRange = displayGWs.length > 0 ? `${displayGWs[0]}-${displayGWs[displayGWs.length - 1]}` : "6-11";

  const filteredProjections = (yellowCardProjections || []).filter((projection: YellowCardProjection) => {
    const matchesSearch = !searchTerm || 
      projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
    const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }).sort((a: YellowCardProjection, b: YellowCardProjection) => {
    let aValue: number;
    let bValue: number;
    if (sortBy === "totalYellowCards") {
      aValue = displayGWs.reduce((sum, gw) => sum + (a.yellowCards[`gw${gw}`] || 0), 0);
      bValue = displayGWs.reduce((sum, gw) => sum + (b.yellowCards[`gw${gw}`] || 0), 0);
    } else {
      aValue = displayGWs.reduce((sum, gw) => sum + (a.pointsFromYellowCards[`gw${gw}`] || 0), 0);
      bValue = displayGWs.reduce((sum, gw) => sum + (b.pointsFromYellowCards[`gw${gw}`] || 0), 0);
    }
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (column: "totalYellowCards" | "totalPoints") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: "totalYellowCards" | "totalPoints") => {
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
              Loading Yellow Card Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Calculating yellow card probabilities and FPL point penalties for all players...
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
            <AlertTriangle className="h-8 w-8" />
            <h1>Player Yellow Cards</h1>
          </div>
          <p className="fpl-page-subtitle">
            Yellow card probability analysis and FPL point penalties for all positions
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
                      {Array.from(new Set((yellowCardProjections || []).map((p: any) => p.teamName))).sort().map(team => (
                        <button key={team}
                          onClick={() => setTeamFilter(teamFilter === team ? 'all' : team)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${teamFilter === team ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          {team}
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="gws" className="mt-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600">From</label>
                        <Select value={String(effectiveStartGW)} onValueChange={(v) => { setSelectedStartGW(Number(v)); if (selectedEndGW !== null && Number(v) > selectedEndGW) setSelectedEndGW(Number(v)); }}>
                          <SelectTrigger className="h-6 text-[10px] sm:text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {gameweeks.map(gw => (
                              <SelectItem key={gw} value={String(gw)}>{gw === 39 ? 'GW39 TBC' : `GW${gw}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600">To</label>
                        <Select value={String(effectiveEndGW)} onValueChange={(v) => setSelectedEndGW(Number(v))}>
                          <SelectTrigger className="h-6 text-[10px] sm:text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {gameweeks.filter(gw => gw >= effectiveStartGW).map(gw => (
                              <SelectItem key={gw} value={String(gw)}>{gw === 39 ? 'GW39 TBC' : `GW${gw}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
        <Tabs defaultValue="cards" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">Yellow Cards</TabsTrigger>
            <TabsTrigger value="points">Points from Yellow Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Yellow Cards (Gameweeks {gameweekRange}{includeTBC ? ' incl. TBC' : ''})</CardTitle>
                <CardDescription>
                  Projected yellow card probability based on position and fixture difficulty
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
                        {displayGWs.map(gw => (
                          <th key={gw} className={`text-center${gw === 39 ? ' text-orange-600' : ''}`}>
                            {gw === 39 ? 'TBC' : `GW${gw}`}
                          </th>
                        ))}
                        <th className="text-center cursor-pointer" onClick={() => handleSort("totalYellowCards")}>
                          <div className="flex items-center justify-center gap-1">
                            Total {getSortIcon("totalYellowCards")}
                          </div>
                        </th>
                        <th className="text-center">Avg/GW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjections.map((projection: YellowCardProjection) => {
                        const displayTotalYC = displayGWs.reduce((sum, gw) => sum + (projection.yellowCards[`gw${gw}`] || 0), 0);
                        return (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          {displayGWs.map(gw => {
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            const value = projection.yellowCards[`gw${gw}`];
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
                                          <span className="font-medium text-xs">{f.yellowCards.toFixed(2)}</span>
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
                          <td className="text-center font-semibold text-yellow-600">
                            {displayTotalYC.toFixed(2)}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {displayGWs.length > 0 ? (displayTotalYC / displayGWs.length).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Points from Yellow Cards (Gameweeks {gameweekRange}{includeTBC ? ' incl. TBC' : ''})</CardTitle>
                <CardDescription>
                  FPL point penalties (-1 point per yellow card) across all positions
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
                        {displayGWs.map(gw => (
                          <th key={gw} className={`text-center${gw === 39 ? ' text-orange-600' : ''}`}>
                            {gw === 39 ? 'TBC' : `GW${gw}`}
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
                      {filteredProjections.map((projection: YellowCardProjection) => {
                        const displayTotalPts = displayGWs.reduce((sum, gw) => sum + (projection.pointsFromYellowCards[`gw${gw}`] || 0), 0);
                        return (
                        <tr key={projection.playerId}>
                          <td className="font-medium">{projection.playerName}</td>
                          <td className="text-center text-xs font-semibold">{projection.position}</td>
                          <td className="text-center text-sm">{projection.teamName}</td>
                          {displayGWs.map(gw => {
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            const value = projection.pointsFromYellowCards[`gw${gw}`];
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
                                          <span className="font-medium text-xs">{(-f.yellowCards).toFixed(2)}</span>
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
                            {displayTotalPts.toFixed(2)}
                          </td>
                          <td className="text-center text-sm text-gray-600">
                            {displayGWs.length > 0 ? (displayTotalPts / displayGWs.length).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                        );
                      })}
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

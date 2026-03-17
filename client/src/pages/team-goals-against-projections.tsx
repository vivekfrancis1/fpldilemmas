import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, TrendingUp, Filter, BarChart3, Trophy, Loader2, X, ChevronDown, ChevronUp, History, Calendar, Users } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { getDefaultGameweekRange, getNextGameweeksForDropdown, debugGameweekCalculation } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  goalsAgainst: number;
}

interface TeamGoalsAgainstHistory {
  lastFinishedGW: number;
  teams: {
    id: number;
    team: string;
    teamShort: string;
    gameweekGoals: { [key: string]: number };
    fixtureDetails?: { [key: string]: FixtureDetail[] };
    totalGoals: number;
    averageGoalsPerGame: number;
    position: number;
  }[];
}

interface TeamGoalsAgainstProjection {
  id: number;
  team: string;
  teamShort: string;
  teamBadge?: string;
  gameweekProjections: {
    [gameweek: string]: number;
  };
  fixtureDetails?: {
    [gameweek: string]: FixtureDetail[];
  };
  totalProjectedGoalsAgainst: number;
  averageGoalsAgainstPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamGoalsAgainstProjections() {
  const { defaultWeeks } = useProjectionSettings();
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // View mode: "future" for projections, "past" for historical data
  const [viewMode, setViewMode] = useState<"future" | "past">("future");

  // Fetch past team goals against history
  const { data: historyData, isLoading: historyLoading } = useQuery<TeamGoalsAgainstHistory>({
    queryKey: ["/api/team-goals-against-history"],
    enabled: viewMode === "past",
  });

  // Fetch fixtures for opponent information
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Calculate dynamic gameweek defaults based on bootstrap data and view mode
  const defaultGameweekRange = useMemo(() => {
    if (viewMode === "past") {
      const lastFinished = historyData?.lastFinishedGW || 24;
      const startGW = Math.max(1, lastFinished - 5);
      return { startGameweek: String(startGW), endGameweek: String(lastFinished) };
    }
    if (!bootstrapData?.events) {
      return { startGameweek: "6", endGameweek: "11" }; // Fallback
    }
    debugGameweekCalculation(bootstrapData.events);
    return getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW]);

  const [startGameweek, setStartGameweek] = useState<string>(defaultGameweekRange.startGameweek);
  const [endGameweek, setEndGameweek] = useState<string>(defaultGameweekRange.endGameweek);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("total");
  const [showOpponent, setShowOpponent] = useState<boolean>(false);
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Create mapping from team name to FPL short_name
  const teamNameToShort = useMemo(() => {
    if (!bootstrapData?.teams) return new Map<string, string>();
    const map = new Map<string, string>();
    bootstrapData.teams.forEach((team: any) => {
      map.set(team.name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

  // Create a mapping of FPL short_name + gameweek -> opponent info
  const opponentMap = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Map();
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        // Home team's opponent is away team
        map.set(`${homeTeam.short_name}-${fixture.event}`, {
          opponent: awayTeam.short_name,
          opponentId: fixture.team_a,
          isHome: true
        });
        // Away team's opponent is home team
        map.set(`${awayTeam.short_name}-${fixture.event}`, {
          opponent: homeTeam.short_name,
          opponentId: fixture.team_h,
          isHome: false
        });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  // Toggle gameweek exclusion
  const toggleGameweekExclusion = (gw: number) => {
    setExcludedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  // Clear all exclusions
  const clearExclusions = () => {
    setExcludedGameweeks(new Set());
  };

  const toggleTeamSelection = (shortName: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(shortName)) next.delete(shortName);
      else next.add(shortName);
      return next;
    });
  };

  // Active gameweeks (excluding excluded ones)
  const activeGameweeks = useMemo(() => {
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const allGameweeks = [];
    for (let gw = startGW; gw <= endGW; gw++) {
      if (!excludedGameweeks.has(gw)) {
        allGameweeks.push(gw);
      }
    }
    return allGameweeks;
  }, [startGameweek, endGameweek, excludedGameweeks]);

  // Get available gameweeks for dropdown options based on view mode
  const availableGameweeks = useMemo(() => {
    if (viewMode === "past") {
      const lastFinished = historyData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    if (!bootstrapData?.events) {
      return Array.from({ length: 12 }, (_, i) => i + 6); // Fallback
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12);
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW]);

  // Update state when bootstrap data or view mode changes
  useEffect(() => {
    if (viewMode === "past" && historyData?.lastFinishedGW) {
      const lastFinished = historyData.lastFinishedGW;
      const startGW = Math.max(1, lastFinished - 5);
      setStartGameweek(String(startGW));
      setEndGameweek(String(lastFinished));
      setExcludedGameweeks(new Set());
    } else if (viewMode === "future" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setStartGameweek(newRange.startGameweek);
      setEndGameweek(newRange.endGameweek);
      setExcludedGameweeks(new Set());
    }
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW]);

  const { data: projectionsData, isLoading: projectionsLoading, error: projectionsError } = useQuery<TeamGoalsAgainstProjection[]>({
    queryKey: ["/api/team-goals-against-projections"],
    retry: 2,
    retryDelay: 1000,
    enabled: viewMode === "future",
  });

  // Unified data for display
  const displayData = useMemo(() => {
    if (viewMode === "past" && historyData?.teams) {
      return historyData.teams.map(team => ({
        id: team.id,
        team: team.team,
        teamShort: team.teamShort,
        gameweekProjections: team.gameweekGoals,
        totalProjectedGoalsAgainst: team.totalGoals,
        averageGoalsAgainstPerGame: team.averageGoalsPerGame,
        confidence: 'High' as const,
        position: team.position
      }));
    }
    return projectionsData || [];
  }, [viewMode, historyData, projectionsData]);

  const filteredProjections = useMemo(() => {
    if (!displayData.length) return [];
    
    return displayData
      .filter(team => selectedTeams.size === 0 || selectedTeams.has(team.teamShort))
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber] || 0;
          const bValue = b.gameweekProjections[gwNumber] || 0;
          return aValue - bValue; // Lower goals against is better
        }
        
        switch (sortBy) {
          case "total": {
            // Calculate period total for sorting using active gameweeks only (lower is better)
            const aPeriodTotal = activeGameweeks
              .reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0);
            const bPeriodTotal = activeGameweeks
              .reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0);
            return aPeriodTotal - bPeriodTotal;
          }
          case "season": return a.totalProjectedGoalsAgainst - b.totalProjectedGoalsAgainst; // Lower is better
          case "average": return a.averageGoalsAgainstPerGame - b.averageGoalsAgainstPerGame; // Lower is better
          case "position": return a.position - b.position;
          default: return a.totalProjectedGoalsAgainst - b.totalProjectedGoalsAgainst;
        }
      });
  }, [displayData, selectedTeams, sortBy, activeGameweeks]);

  const totalGoalsAgainst = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, seasonTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    
    const totalWeeks = activeGameweeks.length;
    
    // Calculate totals for active gameweeks only (excluding excluded ones)
    for (const gwNumber of activeGameweeks) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    }
    
    // Calculate season total (all 38 gameweeks)
    for (let gwNumber = 1; gwNumber <= 38; gwNumber++) {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      seasonTotal += gwTotal;
    }
    
    const averagePerGame = totalWeeks > 0 ? overallTotal / totalWeeks : 0;
    
    return { gameweekTotals, overallTotal, seasonTotal, averagePerGame };
  }, [filteredProjections, bootstrapData, activeGameweeks]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGoalsAgainstColor = (goalsAgainst: number) => {
    // Lower goals against = better defense = green colors
    if (goalsAgainst <= 1.0) return 'bg-green-50 text-green-800 font-semibold';
    if (goalsAgainst <= 1.3) return 'bg-blue-50 text-blue-800 font-medium';
    if (goalsAgainst <= 1.6) return 'bg-yellow-50 text-yellow-800';
    if (goalsAgainst <= 2.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  const isDataLoading = isLoading || (viewMode === "future" && projectionsLoading) || (viewMode === "past" && historyLoading);

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Goals Against
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              {viewMode === "future" 
                ? "Calculating team goals conceded projections across the next 12 gameweeks..."
                : "Loading historical goals conceded data..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle API errors gracefully
  if (viewMode === "future" && projectionsError) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Unable to Load Team Goals Conceded Projections</h2>
          <p className="text-gray-600 mb-4">There was an error loading the projection data. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Handle missing data
  if (!displayData.length) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">No Data Available</h2>
          <p className="text-gray-600">Team goals against projections are currently unavailable. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Shield className="h-8 w-8" />
            <h1>Team Goals Conceded</h1>
          </div>
          <p className="fpl-page-subtitle">
            {viewMode === "future" 
              ? "Projected goals conceded by each team across upcoming gameweeks"
              : "Actual goals conceded by each team in past gameweeks"}
          </p>
          {/* Past/Future Toggle */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={viewMode === "past" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("past")}
              className={`flex items-center gap-1.5 ${viewMode === "past" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
            >
              <History className="h-4 w-4" />
              Past GW Data
            </Button>
            <Button
              variant={viewMode === "future" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("future")}
              className={`flex items-center gap-1.5 ${viewMode === "future" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
            >
              <Calendar className="h-4 w-4" />
              Future GW Projections
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">

          {/* Controls */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <Card className="mb-6">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Filters & Options</span>
                    </div>
                    {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-6">
                  <div className="flex flex-wrap gap-4 items-end">

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">Start GW:</label>
                      <Select value={startGameweek} onValueChange={setStartGameweek}>
                        <SelectTrigger className="h-8 text-xs w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGameweeks.map((gw) => (
                            <SelectItem key={gw} value={gw.toString()}>
                              {gw}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">End GW:</label>
                      <Select value={endGameweek} onValueChange={setEndGameweek}>
                        <SelectTrigger className="h-8 text-xs w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGameweeks.map((gw) => (
                            <SelectItem key={gw} value={gw.toString()}>
                              {gw}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Tabs defaultValue="gws" className="w-full mt-3">
                    <TabsList className="w-full grid grid-cols-2 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                      <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                        <span className="hidden sm:inline">Gameweeks</span><span className="sm:hidden">GWs</span>{excludedGameweeks.size > 0 && ` (${excludedGameweeks.size})`}
                      </TabsTrigger>
                      <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                        Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                      </TabsTrigger>
                    </TabsList>

                    {/* GWs tab */}
                    <TabsContent value="gws" className="mt-0">
                      <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                        {excludedGameweeks.size > 0 && (
                          <button onClick={clearExclusions} className="inline-flex items-center gap-0.5 rounded text-[11px] font-medium px-1.5 py-px leading-none cursor-pointer text-gray-500 hover:text-gray-700">
                            <X className="h-2.5 w-2.5" />Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => parseInt(startGameweek) + i).map(gw => {
                          const isExcluded = excludedGameweeks.has(gw);
                          return (
                            <button key={gw} onClick={() => toggleGameweekExclusion(gw)}
                              className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isExcluded ? 'bg-gray-100 text-gray-400 line-through border-gray-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
                              GW{gw}
                            </button>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Teams tab */}
                    <TabsContent value="teams" className="mt-0">
                      <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                        {selectedTeams.size > 0 && (
                          <button onClick={() => setSelectedTeams(new Set())} className="inline-flex items-center gap-0.5 rounded text-[11px] font-medium px-1.5 py-px leading-none cursor-pointer text-gray-500 hover:text-gray-700">
                            <X className="h-2.5 w-2.5" />Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        <button onClick={() => setSelectedTeams(new Set())}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedTeams.size === 0 ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          All
                        </button>
                        {bootstrapData?.teams?.sort((a, b) => a.short_name.localeCompare(b.short_name)).map(team => (
                          <button key={team.id}
                            onClick={() => toggleTeamSelection(team.short_name)}
                            className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedTeams.has(team.short_name) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                            {team.short_name}
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Team Goals Conceded Projections Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {`Team Goals Conceded Projections: GW${startGameweek}-GW${endGameweek}`}
                {excludedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {excludedGameweeks.size} excluded
                  </Badge>
                )}
                <Badge variant="outline" className="ml-2">
                  {filteredProjections.length} teams
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                        Team
                      </th>
                      {activeGameweeks.map(gwNumber => (
                        <th 
                          key={gwNumber} 
                          className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[40px] md:min-w-[50px]"
                          onClick={() => setSortBy(`gw${gwNumber}`)}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="md:hidden">{gwNumber}</span>
                            <span className="hidden md:inline">GW{gwNumber}</span>
                            {sortBy === `gw${gwNumber}` && <TrendingUp className="h-3 w-3" />}
                          </div>
                        </th>
                      ))}
                      <th 
                        className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors min-w-[50px] md:min-w-[70px]"
                        onClick={() => setSortBy('total')}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="md:hidden">Tot</span>
                          <span className="hidden md:inline">Total</span>
                          {sortBy === 'total' && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjections.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-goals-against-row-${team.id}`}>
                        <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                            {(() => {
                              const teamData = bootstrapData?.teams?.find((t: any) => t.short_name === team.teamShort || t.name === team.team);
                              const teamCode = teamData?.code;
                              return teamCode ? (
                                <img 
                                  src={teamCode === 14 
                                    ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                    : `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`}
                                  alt={`${team.team} badge`}
                                  className="w-5 h-5 object-contain"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : null;
                            })()}
                            <span className="text-xs md:text-sm font-medium text-gray-900">{team.teamShort}</span>
                          </div>
                        </td>
                        
                        {activeGameweeks.map(gwNumber => {
                          // Use string key to match API response format
                          const teamWithDetails = team as TeamGoalsAgainstProjection;
                          const fixtures = teamWithDetails.fixtureDetails?.[gwNumber.toString()] || [];
                          const hasFixtures = fixtures.length > 0;
                          const isDGW = fixtures.length > 1;
                          const totalGA = hasFixtures ? fixtures.reduce((sum: number, f: FixtureDetail) => sum + f.goalsAgainst, 0) : 0;
                          const avgGA = hasFixtures ? totalGA / fixtures.length : 0;
                          
                          return (
                            <td key={gwNumber} className={`px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium min-w-[40px] md:min-w-[50px] ${getGoalsAgainstColor(avgGA)}`}>
                              {!hasFixtures ? (
                                <span className="text-gray-400">-</span>
                              ) : isDGW ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                      <div className="flex flex-col items-center">
                                        <span>{viewMode === "past" ? Math.round(totalGA) : totalGA.toFixed(2)}</span>
                                        {showOpponent && (
                                          <span className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                                            {fixtures.map((f: FixtureDetail) => `${f.opponent}(${f.isHome ? 'H' : 'A'})`).join(', ')}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                    <div className="space-y-2">
                                      <div className="font-semibold text-gray-900 border-b pb-2">
                                        GW{gwNumber} DGW Breakdown
                                      </div>
                                      {fixtures.map((f: FixtureDetail, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                          <span className="text-gray-600">vs {f.opponent} ({f.isHome ? 'H' : 'A'})</span>
                                          <span className="font-medium text-red-700">{f.goalsAgainst.toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="border-t pt-2 flex justify-between items-center text-sm font-semibold">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-red-800">{totalGA.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span>{viewMode === "past" ? Math.round(fixtures[0].goalsAgainst) : fixtures[0].goalsAgainst.toFixed(2)}</span>
                                  {showOpponent && (
                                    <span className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                                      {fixtures[0].opponent} ({fixtures[0].isHome ? 'H' : 'A'})
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        
                        <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-50 min-w-[50px] md:min-w-[70px]">
                          {(() => {
                            // Calculate average GA per fixture across all active gameweeks (use string keys)
                            const teamWithDetails = team as TeamGoalsAgainstProjection;
                            const allFixtures = activeGameweeks.flatMap(gw => teamWithDetails.fixtureDetails?.[gw.toString()] || []);
                            const totalGA = allFixtures.reduce((sum: number, f: FixtureDetail) => sum + f.goalsAgainst, 0);
                            const avgGA = allFixtures.length > 0 ? totalGA / allFixtures.length : 0;
                            return (
                              <span className="text-sm md:text-lg font-bold text-blue-900">
                                {viewMode === "past" ? Math.round(avgGA) : avgGA.toFixed(2)}
                              </span>
                            );
                          })()}
                        </td>
                        
                      </tr>
                    ))}
                    
                    {/* Total Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                      <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-gray-100 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[80px] md:min-w-[120px]">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 w-4">-</span>
                          <div>
                            <div className="text-xs md:text-sm font-bold text-gray-900">TOTAL</div>
                            <div className="text-[10px] text-gray-600 hidden md:block">All Teams</div>
                          </div>
                        </div>
                      </td>
                      
                      {activeGameweeks.map(gwNumber => {
                        const gwTotal = totalGoalsAgainst.gameweekTotals[gwNumber] || 0;
                        return (
                          <td key={gwNumber} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-gray-900 bg-gray-100 min-w-[40px] md:min-w-[50px]">
                            {gwTotal > 0 ? (viewMode === "past" ? Math.round(gwTotal) : gwTotal.toFixed(2)) : "-"}
                          </td>
                        );
                      })}
                      
                      <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-100 min-w-[50px] md:min-w-[70px]">
                        <span className="text-sm md:text-lg font-bold text-blue-900">
                          {viewMode === "past" 
                            ? Math.round(totalGoalsAgainst.overallTotal || 0)
                            : (totalGoalsAgainst.overallTotal || 0).toFixed(2)}
                        </span>
                      </td>
                      
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>



          {/* Info Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">About Team Goals Conceded Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Team defensive performance data</li>
                    <li>• Historical goals conceded patterns</li>
                    <li>• Opposition attacking strength</li>
                    <li>• Fixture context factors</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Projected goals conceded per gameweek</li>
                    <li>• Lower values indicate stronger defense</li>
                    <li>• Comparative defensive rankings</li>
                    <li>• Updated regularly throughout season</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
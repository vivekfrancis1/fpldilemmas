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

interface TBCGoalProjection {
  fixtureId: number;
  homeTeamId: number;
  homeTeamShort: string;
  awayTeamId: number;
  awayTeamShort: string;
  homeGoals: number;
  awayGoals: number;
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
      // Past mode: default from GW 1 to latest finished gameweek
      const lastFinished = historyData?.lastFinishedGW || 24;
      const startGW = 1;
      return { startGameweek: String(startGW), endGameweek: String(lastFinished) };
    }
    if (!bootstrapData?.events) {
      return { startGameweek: "6", endGameweek: "13" }; // Fallback
    }
    debugGameweekCalculation(bootstrapData.events);
    return getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW]);

  const [startGameweek, setStartGameweek] = useState<string>(defaultGameweekRange.startGameweek);
  const [endGameweek, setEndGameweek] = useState<string>(defaultGameweekRange.endGameweek);
  const [selectedGameweeks, setSelectedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("total");
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (col === sortBy) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };
  const [showOpponent, setShowOpponent] = useState<boolean>(false);
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');
  // Filter section collapse state - expanded on desktop, collapsed on mobile
  const [isFiltersOpen, setIsFiltersOpen] = useState(() => window.innerWidth >= 768);

  const [tbcAssignments, setTbcAssignments] = useState<Record<number, number>>(() => {
    try { const s = localStorage.getItem('fpl-tbc-assignments'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  useEffect(() => {
    const onFocus = () => { try { const s = localStorage.getItem('fpl-tbc-assignments'); setTbcAssignments(s ? JSON.parse(s) : {}); } catch {} };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

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
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }[]>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        // Home team's opponent is away team
        const homeKey = `${homeTeam.short_name}-${fixture.event}`;
        if (!map.has(homeKey)) map.set(homeKey, []);
        map.get(homeKey)!.push({ opponent: awayTeam.short_name, opponentId: fixture.team_a, isHome: true });
        // Away team's opponent is home team
        const awayKey = `${awayTeam.short_name}-${fixture.event}`;
        if (!map.has(awayKey)) map.set(awayKey, []);
        map.get(awayKey)!.push({ opponent: homeTeam.short_name, opponentId: fixture.team_h, isHome: false });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  const hasTBCFixture = useMemo(() => {
    if (!Array.isArray(fixturesData)) return false;
    return (fixturesData as any[]).some((f: any) => f.event === null || f.event === undefined);
  }, [fixturesData]);

  // Toggle gameweek exclusion
  const toggleGameweekSelection = (gw: number) => {
    setSelectedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  const clearGameweekSelections = () => {
    setSelectedGameweeks(new Set());
  };

  const toggleTeamSelection = (shortName: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(shortName)) next.delete(shortName);
      else next.add(shortName);
      return next;
    });
  };

  // Active gameweeks (filtered by selections)
  const activeGameweeks = useMemo(() => {
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const allGameweeks = [];
    for (let gw = startGW; gw <= endGW; gw++) {
      if (selectedGameweeks.size === 0 || selectedGameweeks.has(gw)) {
        allGameweeks.push(gw);
      }
    }
    return allGameweeks;
  }, [startGameweek, endGameweek, selectedGameweeks]);

  // Get available gameweeks for dropdown options based on view mode
  const availableGameweeks = useMemo(() => {
    if (viewMode === "past") {
      const lastFinished = historyData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    if (!bootstrapData?.events) {
      return Array.from({ length: 12 }, (_, i) => i + 6); // Fallback
    }
    const gws = getNextGameweeksForDropdown(bootstrapData.events, 12);
    // GW39 only appears in base mode — expert/custom modes absorb TBC into a regular GW
    if (hasTBCFixture && fixtureMode === 'base' && !gws.includes(39)) {
      return [...gws, 39];
    }
    return gws;
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, hasTBCFixture, fixtureMode]);

  // Update state when bootstrap data or view mode changes
  useEffect(() => {
    if (viewMode === "past" && historyData?.lastFinishedGW) {
      const lastFinished = historyData.lastFinishedGW;
      const startGW = 1;
      setStartGameweek(String(startGW));
      setEndGameweek(String(lastFinished));
      setSelectedGameweeks(new Set());
    } else if (viewMode === "future" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setStartGameweek(newRange.startGameweek);
      setEndGameweek(hasTBCFixture && fixtureMode === 'base' ? "39" : newRange.endGameweek);
      setSelectedGameweeks(new Set());
    }
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, hasTBCFixture, fixtureMode]);

  // When switching away from base mode, snap endGameweek back from GW39
  useEffect(() => {
    if (fixtureMode !== 'base' && endGameweek === "39" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setEndGameweek(newRange.endGameweek);
      setSelectedGameweeks(prev => { const s = new Set(prev); s.delete(39); return s; });
    }
  }, [fixtureMode]);

  const { data: projectionsData, isLoading: projectionsLoading, error: projectionsError } = useQuery<TeamGoalsAgainstProjection[]>({
    queryKey: ["/api/team-goals-against-projections"],
    retry: 2,
    retryDelay: 1000,
    enabled: viewMode === "future",
  });

  // Model-based TBC goal projections — goals against = opponent's goals
  const { data: tbcGoalData } = useQuery<TBCGoalProjection[]>({
    queryKey: ["/api/tbc-goal-projections"],
    staleTime: 30 * 60 * 1000,
    enabled: viewMode === "future",
  });

  // Map teamShort → { goalsAgainst, opponent, isHome }
  const tbcGAMap = useMemo(() => {
    const map = new Map<string, { goalsAgainst: number; opponent: string; isHome: boolean }>();
    if (!tbcGoalData) return map;
    tbcGoalData.forEach(f => {
      map.set(f.homeTeamShort, { goalsAgainst: Math.round(f.awayGoals * 100) / 100, opponent: f.awayTeamShort, isHome: true });
      map.set(f.awayTeamShort, { goalsAgainst: Math.round(f.homeGoals * 100) / 100, opponent: f.homeTeamShort, isHome: false });
    });
    return map;
  }, [tbcGoalData]);

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

  // Absorb TBC into assigned GW when fixtureMode is custom/expert (future mode only)
  const resolvedProjections = useMemo(() => {
    if (viewMode !== "future" || fixtureMode === 'base' || !tbcGoalData?.length) return displayData;
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    return displayData.map(team => {
      const tbcFixture = tbcGoalData.find(f => f.homeTeamShort === team.teamShort || f.awayTeamShort === team.teamShort);
      if (!tbcFixture) return team;
      const tbcEntry = tbcGAMap.get(team.teamShort);
      if (!tbcEntry) return team;
      let assignedGW: number | null = null;
      if (fixtureMode === 'expert') {
        assignedGW = tbcFixture.fixtureId === 307 ? 36 : 37;
      } else {
        const raw = tbcAssignments[tbcFixture.fixtureId] ?? null;
        if (raw !== null && raw >= startGW && raw <= endGW) assignedGW = raw;
      }
      if (assignedGW === null) return team;
      const key = String(assignedGW);
      const newProjections = { ...team.gameweekProjections, [key]: (Number(team.gameweekProjections[key]) || 0) + tbcEntry.goalsAgainst };
      const existing: FixtureDetail[] = (team as any).fixtureDetails?.[key] ? [...(team as any).fixtureDetails[key]] : [];
      const newFixtureDetails = { ...((team as any).fixtureDetails || {}), [key]: [...existing, { opponent: tbcEntry.opponent, isHome: tbcEntry.isHome, goalsAgainst: tbcEntry.goalsAgainst }] };
      return { ...team, gameweekProjections: newProjections, fixtureDetails: newFixtureDetails };
    });
  }, [viewMode, fixtureMode, displayData, tbcGoalData, tbcGAMap, tbcAssignments, startGameweek, endGameweek]);

  // TBC goals against still in TBC column (not absorbed)
  const getUnabsorbedTBC = (teamShort: string): number => {
    if (viewMode !== "future") return 0;
    if (fixtureMode === 'expert') return 0;
    if (fixtureMode === 'base') return tbcGAMap.get(teamShort)?.goalsAgainst || 0;
    const f = tbcGoalData?.find(x => x.homeTeamShort === teamShort || x.awayTeamShort === teamShort);
    if (!f) return 0;
    const assigned = tbcAssignments[f.fixtureId];
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    if (assigned !== undefined && assigned !== null && assigned >= startGW && assigned <= endGW) return 0;
    return tbcGAMap.get(teamShort)?.goalsAgainst || 0;
  };

  const filteredProjections = useMemo(() => {
    if (!resolvedProjections.length) return [];
    
    const dir = sortDir === 'asc' ? 1 : -1;
    return resolvedProjections
      .filter(team => selectedTeams.size === 0 || selectedTeams.has(team.teamShort))
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = (gwNumber === 39 && viewMode === 'future' && fixtureMode === 'base')
            ? (tbcGAMap.get(a.teamShort)?.goalsAgainst || 0)
            : (a.gameweekProjections[gwNumber] || 0);
          const bValue = (gwNumber === 39 && viewMode === 'future' && fixtureMode === 'base')
            ? (tbcGAMap.get(b.teamShort)?.goalsAgainst || 0)
            : (b.gameweekProjections[gwNumber] || 0);
          return (aValue - bValue) * dir;
        }
        
        switch (sortBy) {
          case "total": {
            const computeTotal = (team: typeof a) => {
              const regularGA = activeGameweeks
                .filter(gw => gw !== 39)
                .reduce((sum, gw) => sum + (team.gameweekProjections[gw] || 0), 0);
              const tbcGA = (activeGameweeks.includes(39) && viewMode === 'future' && fixtureMode === 'base')
                ? (tbcGAMap.get(team.teamShort)?.goalsAgainst || 0)
                : ((activeGameweeks.includes(39) || (selectedGameweeks.size > 0 && !selectedGameweeks.has(39))) ? 0 : getUnabsorbedTBC(team.teamShort));
              return regularGA + tbcGA;
            };
            return (computeTotal(a) - computeTotal(b)) * dir;
          }
          case "season": return (a.totalProjectedGoalsAgainst - b.totalProjectedGoalsAgainst) * dir;
          case "average": return (a.averageGoalsAgainstPerGame - b.averageGoalsAgainstPerGame) * dir;
          case "position": return (a.position - b.position) * dir;
          default: return (a.totalProjectedGoalsAgainst - b.totalProjectedGoalsAgainst) * dir;
        }
      });
  }, [resolvedProjections, selectedTeams, sortBy, sortDir, activeGameweeks, tbcGAMap, viewMode, fixtureMode, tbcAssignments, startGameweek, endGameweek]);

  const totalGoalsAgainst = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, seasonTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    let seasonTotal = 0;
    
    const totalWeeks = activeGameweeks.length;
    
    // Calculate totals for active gameweeks only (excluding excluded ones)
    for (const gwNumber of activeGameweeks) {
      const gwTotal = (gwNumber === 39 && viewMode === 'future' && fixtureMode === 'base')
        ? filteredProjections.reduce((sum, team) => sum + (tbcGAMap.get(team.teamShort)?.goalsAgainst || 0), 0)
        : filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Goals Against
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
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
            Projected and actual goals conceded by each team across selected gameweeks
          </p>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "future" | "past")} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="future" className="flex items-center gap-1.5 flex-1">
            <Calendar className="h-4 w-4" />
            Projections
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-1.5 flex-1">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === "future" && tbcGAMap.size > 0 && (
        <div className="flex justify-center mb-5">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs shadow-sm">
            <button onClick={() => setFixtureMode('base')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Base Fixtures</button>
            {Object.keys(tbcAssignments).length > 0 && <button onClick={() => setFixtureMode('custom')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>My Fixtures</button>}
            <button onClick={() => setFixtureMode('expert')} className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'expert' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-gray-500 hover:text-gray-800'}`}>Expert Fixtures</button>
          </div>
          <a href="/fixtures" className="ml-2 self-center text-xs text-blue-600 hover:underline flex-shrink-0">⚙ Edit fixtures</a>
        </div>
      )}

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
                        <SelectTrigger className={`h-8 text-xs ${hasTBCFixture && fixtureMode === 'base' ? 'w-32' : 'w-20'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGameweeks.map((gw) => (
                            <SelectItem key={gw} value={gw.toString()}>
                              {gw === 39 ? 'GW39 (TBC)' : `GW${gw}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">End GW:</label>
                      <Select value={endGameweek} onValueChange={setEndGameweek}>
                        <SelectTrigger className={`h-8 text-xs ${hasTBCFixture && fixtureMode === 'base' ? 'w-32' : 'w-20'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGameweeks.map((gw) => (
                            <SelectItem key={gw} value={gw.toString()}>
                              {gw === 39 ? 'GW39 (TBC)' : `GW${gw}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {viewMode === "past" && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 mb-1">
                      <span className="text-xs text-gray-500">Quick:</span>
                      {[6, 8, 12].map(n => {
                        const last = historyData?.lastFinishedGW || 24;
                        const start = Math.max(1, last - n + 1);
                        return (
                          <button
                            key={n}
                            onClick={() => { setStartGameweek(String(start)); setEndGameweek(String(last)); }}
                            className="text-xs px-2.5 py-0.5 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer font-medium"
                          >
                            Last {n} GWs
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <Tabs defaultValue="gws" className="w-full mt-3">
                    <TabsList className="w-full grid grid-cols-2 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                      <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                        <span className="hidden sm:inline">Gameweeks</span><span className="sm:hidden">GWs</span>{selectedGameweeks.size > 0 && ` (${selectedGameweeks.size})`}
                      </TabsTrigger>
                      <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                        Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                      </TabsTrigger>
                    </TabsList>

                    {/* GWs tab */}
                    <TabsContent value="gws" className="mt-0">
                      <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                        <button onClick={clearGameweekSelections} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">All</button>
                        <button onClick={() => setSelectedGameweeks(prev => new Set(Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => parseInt(startGameweek) + i).filter(gw => !prev.has(gw))))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-orange-50 text-orange-700 border-orange-300">Invert</button>
                      </div>
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => parseInt(startGameweek) + i).map(gw => {
                          const isActive = selectedGameweeks.size === 0 || selectedGameweeks.has(gw);
                          return (
                            <button key={gw} onClick={() => toggleGameweekSelection(gw)}
                              className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? (gw === 39 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-orange-100 text-orange-700 border-orange-300') : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                              {gw === 39 ? 'GW39 (TBC)' : `GW${gw}`}
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
                {selectedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedGameweeks.size} GW{selectedGameweeks.size === 1 ? '' : 's'} selected
                  </Badge>
                )}
                <Badge variant="outline" className="ml-2">
                  {filteredProjections.length} teams
                </Badge>
                <button onClick={() => setShowOpponent(!showOpponent)}
                  className={`ml-auto inline-flex items-center gap-1 rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${showOpponent ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                  <Users className="h-2.5 w-2.5" />{showOpponent ? 'Hide Opp' : 'Show Opp'}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[110px] min-w-[110px]">
                        Team
                      </th>
                      {activeGameweeks.map(gwNumber => (
                        <th 
                          key={gwNumber} 
                          className={`px-0.5 md:px-2 py-2 md:py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'} ${gwNumber === 39 ? 'text-amber-700 bg-amber-50/60' : 'text-gray-500'}`}
                          onClick={() => handleSort(`gw${gwNumber}`)}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="md:hidden">{gwNumber === 39 ? '39*' : gwNumber}</span>
                            <span className="hidden md:inline">{gwNumber === 39 ? 'GW39 (TBC)' : `GW${gwNumber}`}</span>
                            {sortBy === `gw${gwNumber}` && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </div>
                        </th>
                      ))}
                      {viewMode === "future" && fixtureMode !== 'expert' && tbcGAMap.size > 0 && (!activeGameweeks.includes(39) && (selectedGameweeks.size === 0 || selectedGameweeks.has(39)) && parseInt(endGameweek) >= 39) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (
                        <th className={`px-0.5 md:px-2 py-2 md:py-3 text-center text-xs font-medium text-amber-700 uppercase tracking-wider bg-amber-50/60 border-l border-amber-300 ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'}`}>
                          GW39 (TBC)
                        </th>
                      )}
                      <th 
                        className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors w-14 border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                        onClick={() => handleSort('total')}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="md:hidden">Tot</span>
                          <span className="hidden md:inline">Total</span>
                          {sortBy === 'total' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjections.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-goals-against-row-${team.id}`}>
                        <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[110px] min-w-[110px]">
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
                          // Past mode: read directly from gameweekProjections (fixtureDetails not available)
                          if (viewMode === "past") {
                            const value = team.gameweekProjections[gwNumber] ?? 0;
                            const pastOpponentInfos = opponentMap.get(`${team.teamShort}-${gwNumber}`) ?? [];
                            return (
                              <td key={gwNumber} className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-medium ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'} ${getGoalsAgainstColor(value)}`}>
                                <div className="flex flex-col items-center">
                                  <span>{value}</span>
                                  {showOpponent && (
                                    <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">
                                      {pastOpponentInfos.length > 0 ? pastOpponentInfos.map(o => `${o.opponent}(${o.isHome ? 'H' : 'A'})`).join(' / ') : '\u00A0'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          // GW39 in base mode: use tbcGAMap instead of empty fixtureDetails
                          if (gwNumber === 39 && fixtureMode === 'base') {
                            const tbcEntry = tbcGAMap.get(team.teamShort);
                            if (!tbcEntry) {
                              return (
                                <td key={gwNumber} className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm bg-amber-50/40 border-l border-amber-200 ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'}`}>
                                  <div className="flex flex-col items-center"><span className="text-gray-300">-</span>{showOpponent && <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">&nbsp;</span>}</div>
                                </td>
                              );
                            }
                            return (
                              <td key={gwNumber} className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-medium bg-amber-50/60 border-l border-amber-200 ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'} ${getGoalsAgainstColor(tbcEntry.goalsAgainst)}`}>
                                <div className="flex flex-col items-center">
                                  <span>{tbcEntry.goalsAgainst.toFixed(2)}</span>
                                  {showOpponent && <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">{tbcEntry.opponent} ({tbcEntry.isHome ? 'H' : 'A'})</span>}
                                </div>
                              </td>
                            );
                          }

                          // Future mode: use fixtureDetails for DGW Popover and opponent info
                          const teamWithDetails = team as TeamGoalsAgainstProjection;
                          const fixtures = teamWithDetails.fixtureDetails?.[gwNumber.toString()] || [];
                          const hasFixtures = fixtures.length > 0;
                          const isDGW = fixtures.length > 1;
                          const totalGA = hasFixtures ? fixtures.reduce((sum: number, f: FixtureDetail) => sum + f.goalsAgainst, 0) : 0;
                          const avgGA = hasFixtures ? totalGA / fixtures.length : 0;
                          
                          return (
                            <td key={gwNumber} className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-medium ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'} ${getGoalsAgainstColor(avgGA)}`}>
                              {!hasFixtures ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-gray-400">-</span>
                                  {showOpponent && <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">&nbsp;</span>}
                                </div>
                              ) : isDGW ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                      <div className="flex flex-col items-center">
                                        <span>{viewMode === "past" ? Math.round(totalGA) : totalGA.toFixed(2)}</span>
                                        {showOpponent && (
                                          <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">
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
                                    <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">
                                      {fixtures[0].opponent} ({fixtures[0].isHome ? 'H' : 'A'})
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        
                        {viewMode === "future" && fixtureMode !== 'expert' && tbcGAMap.size > 0 && (!activeGameweeks.includes(39) && (selectedGameweeks.size === 0 || selectedGameweeks.has(39)) && parseInt(endGameweek) >= 39) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (() => {
                          const tbcEntry = tbcGAMap.get(team.teamShort);
                          if (!tbcEntry) {
                            return (
                              <td className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm bg-amber-50/40 border-l border-amber-200 ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'}`}>
                                <span className="text-gray-300">-</span>
                              </td>
                            );
                          }
                          return (
                            <td className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm bg-amber-50/60 border-l border-amber-300 ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'}`}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                    <div className="flex flex-col items-center">
                                      <span className="font-semibold text-amber-800">{tbcEntry.goalsAgainst.toFixed(2)}</span>
                                      {showOpponent && (
                                        <span className="text-[9px] md:text-[10px] text-amber-600 mt-0.5">
                                          {tbcEntry.opponent}({tbcEntry.isHome ? 'H' : 'A'})
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-amber-200 z-50">
                                  <div className="space-y-2">
                                    <div className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                                      <span>TBC Fixture</span>
                                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">FPL Model</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-gray-600">vs {tbcEntry.opponent} ({tbcEntry.isHome ? 'H' : 'A'})</span>
                                      <span className="font-semibold text-amber-800">{tbcEntry.goalsAgainst.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pt-1">Opponent's projected goals using the same attack/defence model as scheduled GWs</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </td>
                          );
                        })()}

                        <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-50 w-14 border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <span className="text-sm md:text-lg font-bold text-blue-900">
                            {viewMode === "past"
                              ? activeGameweeks.reduce((sum, gw) => sum + (team.gameweekProjections[gw] || 0), 0)
                              : (() => {
                                  const regularGA = activeGameweeks
                                    .filter(gw => gw !== 39)
                                    .reduce((sum, gw) => sum + (team.gameweekProjections[gw] || 0), 0);
                                  const tbcGA = (activeGameweeks.includes(39) && fixtureMode === 'base')
                                    ? (tbcGAMap.get(team.teamShort)?.goalsAgainst || 0)
                                    : ((activeGameweeks.includes(39) || (selectedGameweeks.size > 0 && !selectedGameweeks.has(39))) ? 0 : getUnabsorbedTBC(team.teamShort));
                                  return (regularGA + tbcGA).toFixed(2);
                                })()}
                          </span>
                        </td>
                        
                      </tr>
                    ))}
                    
                    {/* Total Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                      <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-gray-100 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[110px] min-w-[110px]">
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
                          <td key={gwNumber} className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-gray-900 bg-gray-100 ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'}`}>
                            {gwTotal > 0 ? (viewMode === "past" ? Math.round(gwTotal) : gwTotal.toFixed(2)) : "-"}
                          </td>
                        );
                      })}

                      {viewMode === "future" && fixtureMode !== 'expert' && tbcGAMap.size > 0 && (!activeGameweeks.includes(39) && (selectedGameweeks.size === 0 || selectedGameweeks.has(39)) && parseInt(endGameweek) >= 39) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (() => {
                        const tbcTotal = filteredProjections.reduce((sum, team) => sum + getUnabsorbedTBC(team.teamShort), 0);
                        return (
                          <td className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-amber-900 bg-amber-50 border-l border-amber-300 ${showOpponent ? 'w-[52px] min-w-[52px]' : 'w-[52px] min-w-[52px]'}`}>
                            {tbcTotal.toFixed(2)}
                          </td>
                        );
                      })()}
                      
                      <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-100 w-14 border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
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
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Filter, BarChart3, Trophy, Loader2, X, ChevronDown, ChevronUp, History, Calendar, Users } from "lucide-react";
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
  goals: number;
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

interface TeamGoalsHistory {
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

interface TeamXgHistory {
  lastFinishedGW: number;
  startGW: number;
  endGW: number;
  teams: {
    id: number;
    team: string;
    teamShort: string;
    gameweekXg: { [key: string]: number };
    totalXg: number;
    averageXgPerGame: number;
    position: number;
  }[];
}

interface TeamGoalProjection {
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
  totalProjectedGoals: number;
  averageGoalsPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamGoalProjections() {
  const { defaultWeeks } = useProjectionSettings();
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // View mode: "future" for projections, "past" for historical data, "pastXg" for xG history
  const [viewMode, setViewMode] = useState<"future" | "past" | "pastXg">("future");

  // Fixture mode for TBC display (base=TBC column, custom=user's assignments, expert=all TBC→GW36)
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');

  // Load user's TBC fixture assignments from localStorage (synced with /fixtures page)
  const [tbcAssignments, setTbcAssignments] = useState<Record<number, number>>(() => {
    try {
      const stored = localStorage.getItem('fpl-tbc-assignments');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  // Re-sync assignments if the page re-focuses (user may have updated them in /fixtures)
  useEffect(() => {
    const onFocus = () => {
      try {
        const stored = localStorage.getItem('fpl-tbc-assignments');
        setTbcAssignments(stored ? JSON.parse(stored) : {});
      } catch { /* ignore */ }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Fetch past team goals history
  const { data: historyData, isLoading: historyLoading } = useQuery<TeamGoalsHistory>({
    queryKey: ["/api/team-goals-history"],
    enabled: viewMode === "past",
  });

  // Calculate dynamic gameweek defaults based on bootstrap data and view mode
  const defaultGameweekRange = useMemo(() => {
    if (viewMode === "past" || viewMode === "pastXg") {
      // Past modes: default from GW 1 to latest finished gameweek
      const lastFinished = historyData?.lastFinishedGW || 24;
      const startGW = 1;
      return { startGameweek: String(startGW), endGameweek: String(lastFinished) };
    }
    // Future mode: use existing logic
    if (!bootstrapData?.events) {
      return { startGameweek: "1", endGameweek: "8" }; // Fallback
    }
    debugGameweekCalculation(bootstrapData.events);
    return getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW]);

  const [startGameweek, setStartGameweek] = useState<string>(defaultGameweekRange.startGameweek);
  const [endGameweek, setEndGameweek] = useState<string>(defaultGameweekRange.endGameweek);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("total");
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch past team xG history (after startGameweek/endGameweek defined)
  const { data: xgHistoryData, isLoading: xgHistoryLoading } = useQuery<TeamXgHistory>({
    queryKey: ["/api/team-xg-history", startGameweek, endGameweek],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startGameweek) params.set('startGw', startGameweek);
      if (endGameweek) params.set('endGw', endGameweek);
      const response = await fetch(`/api/team-xg-history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch team xG history");
      return response.json();
    },
    enabled: viewMode === "pastXg" && parseInt(startGameweek) > 0 && parseInt(endGameweek) > 0,
  });

  // Get active gameweeks (range minus excluded)
  const activeGameweeks = useMemo(() => {
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const gameweeks: number[] = [];
    for (let gw = startGW; gw <= endGW; gw++) {
      if (!excludedGameweeks.has(gw)) {
        gameweeks.push(gw);
      }
    }
    return gameweeks;
  }, [startGameweek, endGameweek, excludedGameweeks]);

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

  // Fetch fixtures for opponent information (must be before hasTBCFixture)
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Detect TBC fixtures (event=null) from the fixtures cache — no extra HTTP call
  const hasTBCFixture = useMemo(() => {
    if (!Array.isArray(fixturesData)) return false;
    return (fixturesData as any[]).some((f: any) => f.event === null || f.event === undefined);
  }, [fixturesData]);

  // Get available gameweeks for dropdown options based on view mode
  const availableGameweeks = useMemo(() => {
    if (viewMode === "past" || viewMode === "pastXg") {
      // Past modes: GW1 to last finished gameweek
      const lastFinished = historyData?.lastFinishedGW || xgHistoryData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    // Future mode: next 12 gameweeks
    if (!bootstrapData?.events) {
      return Array.from({ length: 12 }, (_, i) => i + 1); // Fallback
    }
    const gws = getNextGameweeksForDropdown(bootstrapData.events, 12);
    // GW39 only appears in base mode — expert/custom modes absorb TBC into a regular GW
    if (hasTBCFixture && fixtureMode === 'base' && !gws.includes(39)) {
      return [...gws, 39];
    }
    return gws;
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, xgHistoryData?.lastFinishedGW, hasTBCFixture, fixtureMode]);

  // Update state when bootstrap data or view mode changes
  useEffect(() => {
    if ((viewMode === "past" || viewMode === "pastXg") && (historyData?.lastFinishedGW || xgHistoryData?.lastFinishedGW)) {
      const lastFinished = historyData?.lastFinishedGW || xgHistoryData?.lastFinishedGW || 24;
      const startGW = 1;
      setStartGameweek(String(startGW));
      setEndGameweek(String(lastFinished));
      setExcludedGameweeks(new Set());
    } else if (viewMode === "future" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setStartGameweek(newRange.startGameweek);
      // Extend default end to GW39 only in base mode (expert/custom absorb TBC into a regular GW)
      setEndGameweek(hasTBCFixture && fixtureMode === 'base' ? "39" : newRange.endGameweek);
      setExcludedGameweeks(new Set());
    }
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, xgHistoryData?.lastFinishedGW, hasTBCFixture, fixtureMode]);

  // When switching away from base mode, snap endGameweek back from GW39 to the regular range
  useEffect(() => {
    if (fixtureMode !== 'base' && endGameweek === "39" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setEndGameweek(newRange.endGameweek);
      setExcludedGameweeks(prev => { const s = new Set(prev); s.delete(39); return s; });
    }
  }, [fixtureMode]);

  // State for showing opponent info
  const [showOpponent, setShowOpponent] = useState(false);

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
      // Normalize TBC fixtures (event: null) to GW39 so they appear in opponent info
      const gwNumber = fixture.event ?? 39;
      if (homeTeam && awayTeam) {
        // Home team's opponent is away team
        map.set(`${homeTeam.short_name}-${gwNumber}`, {
          opponent: awayTeam.short_name,
          opponentId: fixture.team_a,
          isHome: true
        });
        // Away team's opponent is home team
        map.set(`${awayTeam.short_name}-${gwNumber}`, {
          opponent: homeTeam.short_name,
          opponentId: fixture.team_h,
          isHome: false
        });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  // Model-based TBC goal projections from backend (same formula as any scheduled GW)
  const { data: tbcGoalData } = useQuery<TBCGoalProjection[]>({
    queryKey: ["/api/tbc-goal-projections"],
    staleTime: 30 * 60 * 1000,
    enabled: viewMode === "future",
  });

  // Map from teamShort → { goals, opponent, isHome, opponentGoals }
  const tbcGoalMap = useMemo(() => {
    const map = new Map<string, { goals: number; opponent: string; isHome: boolean; opponentGoals: number }>();
    if (!tbcGoalData) return map;
    tbcGoalData.forEach(f => {
      map.set(f.homeTeamShort, { goals: f.homeGoals, opponent: f.awayTeamShort, isHome: true, opponentGoals: f.awayGoals });
      map.set(f.awayTeamShort, { goals: f.awayGoals, opponent: f.homeTeamShort, isHome: false, opponentGoals: f.homeGoals });
    });
    return map;
  }, [tbcGoalData]);

  // Use live endpoint to get fixtureDetails for DGW display
  const { data: projectionsData, isLoading: projectionsLoading, error: projectionsError, refetch: refetchProjections } = useQuery<TeamGoalProjection[]>({
    queryKey: ["/api/team-goal-projections"],
    staleTime: 60 * 60 * 1000, // 1 hour cache
    retry: 2,
    retryDelay: 1000,
    enabled: viewMode === "future",
  });

  // Unified data for display - adapts based on view mode
  const displayData = useMemo(() => {
    if (viewMode === "past" && historyData?.teams) {
      return historyData.teams.map(team => ({
        id: team.id,
        team: team.team,
        teamShort: team.teamShort,
        gameweekProjections: team.gameweekGoals,
        totalProjectedGoals: team.totalGoals,
        averageGoalsPerGame: team.averageGoalsPerGame,
        confidence: 'High' as const,
        position: team.position
      }));
    }
    if (viewMode === "pastXg" && xgHistoryData?.teams) {
      return xgHistoryData.teams.map(team => ({
        id: team.id,
        team: team.team,
        teamShort: team.teamShort,
        gameweekProjections: team.gameweekXg,
        totalProjectedGoals: team.totalXg,
        averageGoalsPerGame: team.averageXgPerGame,
        confidence: 'High' as const,
        position: team.position
      }));
    }
    return projectionsData || [];
  }, [viewMode, historyData, xgHistoryData, projectionsData]);

  // Merge TBC goals into assigned GW columns based on fixtureMode.
  // Base mode is excluded — GW39 data is already included by the backend when GW39 is selected.
  const resolvedProjections = useMemo(() => {
    if (viewMode !== "future" || fixtureMode === 'base' || !tbcGoalData?.length) return displayData;
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    return displayData.map(team => {
      const tbcFixture = tbcGoalData.find(f =>
        f.homeTeamShort === team.teamShort || f.awayTeamShort === team.teamShort
      );
      if (!tbcFixture) return team;
      const isHome = tbcFixture.homeTeamShort === team.teamShort;
      const tbcGoals = isHome ? tbcFixture.homeGoals : tbcFixture.awayGoals;
      const tbcOpponent = isHome ? tbcFixture.awayTeamShort : tbcFixture.homeTeamShort;
      let assignedGW: number | null = null;
      if (fixtureMode === 'expert') {
        assignedGW = 36;
      } else {
        const raw = tbcAssignments[tbcFixture.fixtureId] ?? null;
        // Only absorb if assigned GW is within the currently visible range
        if (raw !== null && raw >= startGW && raw <= endGW) assignedGW = raw;
      }
      if (assignedGW === null) return team; // unassigned or out-of-range → stays in TBC column
      const newProjections = { ...team.gameweekProjections };
      const key = String(assignedGW);
      const existingGoals = Number(newProjections[key]) || 0;
      newProjections[key] = existingGoals + tbcGoals;
      // Update fixtureDetails so the DGW matchwise split shows in the popover
      const teamData = team as TeamGoalProjection;
      const newFixtureDetails: { [gameweek: string]: FixtureDetail[] } = { ...(teamData.fixtureDetails || {}) };
      const existingFixtures: FixtureDetail[] = newFixtureDetails[key]
        ? [...newFixtureDetails[key]]
        : (existingGoals > 0 ? [{ opponent: opponentMap.get(`${team.teamShort}-${assignedGW}`)?.opponent || '?', isHome: opponentMap.get(`${team.teamShort}-${assignedGW}`)?.isHome ?? true, goals: existingGoals }] : []);
      newFixtureDetails[key] = [...existingFixtures, { opponent: tbcOpponent, isHome, goals: tbcGoals }];
      return { ...team, gameweekProjections: newProjections, fixtureDetails: newFixtureDetails };
    });
  }, [viewMode, fixtureMode, displayData, tbcGoalData, tbcAssignments, startGameweek, endGameweek, opponentMap, activeGameweeks]);

  // Helper: TBC goals still in TBC column (not absorbed into a visible GW) for a given team.
  // In base mode TBC is handled via the GW39 column (backend includes it), never unabsorbed.
  const getUnabsorbedTBC = (teamShort: string): number => {
    if (viewMode !== "future") return 0;
    if (fixtureMode === 'expert') return 0;
    if (fixtureMode === 'base') return 0;
    const f = tbcGoalData?.find(x => x.homeTeamShort === teamShort || x.awayTeamShort === teamShort);
    if (!f) return 0;
    const assigned = tbcAssignments[f.fixtureId];
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    // Absorbed only if assigned to a GW that is within the currently visible range
    if (assigned !== undefined && assigned !== null && assigned >= startGW && assigned <= endGW) return 0;
    return tbcGoalMap.get(teamShort)?.goals || 0;
  };

  const filteredProjections = useMemo(() => {
    if (!resolvedProjections.length) return [];
    
    return resolvedProjections
      .filter(team => selectedTeams.size === 0 || selectedTeams.has(team.teamShort))
      .sort((a, b) => {
        if (sortBy.startsWith('gw')) {
          const gwNumber = parseInt(sortBy.replace('gw', ''));
          const aValue = a.gameweekProjections[gwNumber] || 0;
          const bValue = b.gameweekProjections[gwNumber] || 0;
          return bValue - aValue;
        }
        
        switch (sortBy) {
          case "total": {
            // GW projections already have absorbed TBC; add only unabsorbed remainder
            const aPeriodTotal = activeGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0)
              + getUnabsorbedTBC(a.teamShort);
            const bPeriodTotal = activeGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0)
              + getUnabsorbedTBC(b.teamShort);
            return bPeriodTotal - aPeriodTotal;
          }
          case "season": return b.totalProjectedGoals - a.totalProjectedGoals;
          case "average": return b.averageGoalsPerGame - a.averageGoalsPerGame;
          case "position": return a.position - b.position;
          default: return b.totalProjectedGoals - a.totalProjectedGoals;
        }
      });
  }, [resolvedProjections, selectedTeams, sortBy, activeGameweeks, viewMode, fixtureMode, tbcGoalMap, tbcGoalData, tbcAssignments]);


  const totalGoals = useMemo(() => {
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
    
    // Calculate rest of season total (gameweek 4 onwards)
    for (let gwNumber = 4; gwNumber <= 38; gwNumber++) {
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

  const getGoalsColor = (goals: number) => {
    if (goals >= 2.5) return 'bg-green-50 text-green-800 font-semibold';
    if (goals >= 2.0) return 'bg-blue-50 text-blue-800 font-medium';
    if (goals >= 1.5) return 'bg-yellow-50 text-yellow-800';
    if (goals >= 1.0) return 'bg-orange-50 text-orange-800';
    return 'bg-red-50 text-red-800';
  };

  const isDataLoading = isLoading || (viewMode === "future" && projectionsLoading) || (viewMode === "past" && historyLoading) || (viewMode === "pastXg" && xgHistoryLoading);

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Team Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              {viewMode === "future" 
                ? "Calculating team goal projections across the next 12 gameweeks..."
                : "Loading historical team goals data..."}
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
          <h2 className="text-xl font-semibold text-red-600 mb-4">Unable to Load Team Goal Projections</h2>
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
          <p className="text-gray-600">
            {viewMode === "future" 
              ? "Team goal projections are currently unavailable. Please try again later."
              : "Historical team goals data is currently unavailable. Please try again later."}
          </p>
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
            <Target className="h-8 w-8" />
            <h1>Team Goals</h1>
          </div>
          <p className="fpl-page-subtitle">
            Projected and historical goals for each team across selected gameweeks
          </p>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "future" | "past" | "pastXg")} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="future" className="flex items-center gap-1.5 flex-1">
            <Calendar className="h-4 w-4" />
            Goals Projections
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-1.5 flex-1">
            <History className="h-4 w-4" />
            Goals History
          </TabsTrigger>
          <TabsTrigger value="pastXg" className="flex items-center gap-1.5 flex-1">
            <TrendingUp className="h-4 w-4" />
            xG History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === "future" && tbcGoalData && tbcGoalData.length > 0 && (
        <div className="flex justify-center mb-5">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs shadow-sm">
            <button
              onClick={() => setFixtureMode('base')}
              className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Base Fixtures
            </button>
            {Object.keys(tbcAssignments).length > 0 && (
              <button
                onClick={() => setFixtureMode('custom')}
                className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                My Fixtures
              </button>
            )}
            <button
              onClick={() => setFixtureMode('expert')}
              className={`rounded-md px-3 py-1.5 font-medium transition-all ${fixtureMode === 'expert' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Expert Fixtures
            </button>
          </div>
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
                        <SelectTrigger className={`h-8 text-xs ${hasTBCFixture ? 'w-32' : 'w-20'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGameweeks.map(gameweek => (
                            <SelectItem key={gameweek} value={gameweek.toString()}>
                              {gameweek === 39 ? 'GW39 (TBC)' : `GW${gameweek}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">End GW:</label>
                      <Select value={endGameweek} onValueChange={setEndGameweek}>
                        <SelectTrigger className={`h-8 text-xs ${hasTBCFixture ? 'w-32' : 'w-20'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGameweeks.map(gameweek => (
                            <SelectItem key={gameweek} value={gameweek.toString()}>
                              {gameweek === 39 ? 'GW39 (TBC)' : `GW${gameweek}`}
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
                      {excludedGameweeks.size > 0 && (
                        <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                          <button onClick={clearExclusions} className="inline-flex items-center gap-0.5 rounded text-[11px] font-medium px-1.5 py-px leading-none cursor-pointer text-gray-500 hover:text-gray-700">
                            <X className="h-2.5 w-2.5" />Clear
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {Array.from({ length: parseInt(endGameweek) - parseInt(startGameweek) + 1 }, (_, i) => parseInt(startGameweek) + i).map(gw => {
                          const isExcluded = excludedGameweeks.has(gw);
                          return (
                            <button key={gw} onClick={() => toggleGameweekExclusion(gw)}
                              className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isExcluded ? 'bg-gray-100 text-gray-400 line-through border-gray-300' : gw === 39 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
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

          {/* Team Goals Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <BarChart3 className="h-5 w-5" />
                {viewMode === "future" 
                  ? `Team Goal Projections: GW${startGameweek}-GW${endGameweek}`
                  : viewMode === "pastXg"
                    ? `Team xG History: GW${startGameweek}-GW${endGameweek}`
                    : `Team Goals History: GW${startGameweek}-GW${endGameweek}`}
                {excludedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {excludedGameweeks.size} excluded
                  </Badge>
                )}
                <Badge variant="outline" className="ml-2">
                  {filteredProjections.length} teams
                </Badge>
                {viewMode === "past" && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800">
                    Actual Data
                  </Badge>
                )}
                {viewMode === "pastXg" && (
                  <Badge className="ml-2 bg-green-100 text-green-800">
                    xG Data
                  </Badge>
                )}
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
                    <tr key="header-row">
                      <th className="px-1 md:px-3 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[64px] md:min-w-[96px]">
                        Team
                      </th>
                      {activeGameweeks.map(gwNumber => (
                        <th 
                          key={gwNumber} 
                          className={`px-0.5 md:px-2 py-2 md:py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${showOpponent ? 'min-w-[52px] md:min-w-[64px]' : 'min-w-[30px] md:min-w-[44px]'} ${gwNumber === 39 ? 'text-amber-700 bg-amber-50/60' : 'text-gray-500'}`}
                          onClick={() => setSortBy(`gw${gwNumber}`)}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="md:hidden">{gwNumber === 39 ? '39*' : gwNumber}</span>
                            <span className="hidden md:inline">{gwNumber === 39 ? 'GW39 (TBC)' : `GW${gwNumber}`}</span>
                            {sortBy === `gw${gwNumber}` && <TrendingUp className="h-3 w-3" />}
                          </div>
                        </th>
                      ))}
                      {viewMode === "future" && fixtureMode !== 'expert' && fixtureMode !== 'base' && tbcGoalMap.size > 0 && (!activeGameweeks.includes(39) && !excludedGameweeks.has(39)) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (
                        <th className={`px-0.5 md:px-2 py-2 md:py-3 text-center text-xs font-medium text-amber-700 uppercase tracking-wider bg-amber-50/60 border-l border-amber-300 ${showOpponent ? 'min-w-[52px] md:min-w-[64px]' : 'min-w-[44px] md:min-w-[56px]'}`}>
                          GW39 (TBC)
                        </th>
                      )}
                      <th 
                        className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100 transition-colors w-14 border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
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
                      <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-projection-row-${team.id}`}>
                        <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[64px] md:min-w-[96px]">
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
                          const rawGoals = team.gameweekProjections[gwNumber.toString()];
                          // GW39 is a provisional TBC fixture — only MCI/CRY have data; treat 0 as no fixture
                          const goals = (gwNumber === 39 && (rawGoals === undefined || rawGoals === 0)) ? undefined : rawGoals;
                          const teamWithDetails = team as TeamGoalProjection;
                          const fixtures = teamWithDetails.fixtureDetails?.[gwNumber.toString()] || [];
                          const isDGW = fixtures.length > 1;
                          const teamOpponentInfo = opponentMap.get(`${team.teamShort}-${gwNumber}`);
                          
                          const cellContent = (
                            <div className="flex flex-col items-center">
                              <span>{goals !== undefined ? (viewMode === "past" ? goals : goals.toFixed(2)) : "-"}</span>
                              {showOpponent && (
                                <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">
                                  {fixtures.length > 0
                                    ? fixtures.map((f: FixtureDetail) => `${f.opponent}(${f.isHome ? 'H' : 'A'})`).join(', ')
                                    : teamOpponentInfo
                                      ? `${teamOpponentInfo.opponent}(${teamOpponentInfo.isHome ? 'H' : 'A'})`
                                      : '\u00A0'}
                                </span>
                              )}
                            </div>
                          );
                          
                          return (
                            <td 
                              key={`${team.id}-gw${gwNumber}`} 
                              className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-medium ${showOpponent ? 'min-w-[52px] md:min-w-[64px]' : 'min-w-[30px] md:min-w-[44px]'} ${getGoalsColor(goals || 0)} ${isDGW ? 'cursor-help' : ''}`}
                            >
                              {isDGW ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                      <div className="flex flex-col items-center">
                                        <span>{goals !== undefined ? goals.toFixed(2) : "-"}</span>
                                        {showOpponent && (
                                          <span className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">
                                            {fixtures.length > 0 ? fixtures.map((f: FixtureDetail) => `${f.opponent}(${f.isHome ? 'H' : 'A'})`).join(', ') : '\u00A0'}
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
                                          <span className="font-medium text-green-700">{f.goals.toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="border-t pt-2 flex justify-between items-center text-sm font-semibold">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-green-800">{goals?.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : cellContent}
                            </td>
                          );
                        })}
                        
                        {viewMode === "future" && fixtureMode !== 'expert' && fixtureMode !== 'base' && tbcGoalMap.size > 0 && (!activeGameweeks.includes(39) && !excludedGameweeks.has(39)) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (() => {
                          const tbcEntry = tbcGoalMap.get(team.teamShort);
                          // In custom mode: show dash only if assigned to a GW within the visible range
                          const tbcFixture = tbcGoalData?.find(f => f.homeTeamShort === team.teamShort || f.awayTeamShort === team.teamShort);
                          const assigned = tbcFixture ? tbcAssignments[tbcFixture.fixtureId] : undefined;
                          const isAbsorbed = fixtureMode === 'custom' && tbcFixture && assigned !== undefined && assigned !== null && assigned >= parseInt(startGameweek) && assigned <= parseInt(endGameweek);
                          if (!tbcEntry || isAbsorbed) {
                            return (
                              <td className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm bg-amber-50/40 border-l border-amber-200 ${showOpponent ? 'min-w-[52px] md:min-w-[64px]' : 'min-w-[30px] md:min-w-[44px]'}`}>
                                <span className="text-gray-300">-</span>
                              </td>
                            );
                          }
                          return (
                            <td className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm bg-amber-50/60 border-l border-amber-300 ${showOpponent ? 'min-w-[52px] md:min-w-[64px]' : 'min-w-[30px] md:min-w-[44px]'}`}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                    <div className="flex flex-col items-center">
                                      <span className="font-semibold text-amber-800">{tbcEntry.goals.toFixed(2)}</span>
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
                                      <span className="font-semibold text-amber-800">{tbcEntry.goals.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pt-1">Projected using the same attack/defence model as scheduled GWs</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </td>
                          );
                        })()}
                        
                        <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-orange-50 w-14 border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <span className="text-sm md:text-lg font-bold text-orange-900">
                            {(() => {
                              const gwSum = activeGameweeks.reduce((sum, gw) => sum + (team.gameweekProjections[gw] || 0), 0);
                              const tbcGoals = getUnabsorbedTBC(team.teamShort);
                              const total = gwSum + tbcGoals;
                              return viewMode === "past" ? total : total.toFixed(2);
                            })()}
                          </span>
                        </td>
                        
                      </tr>
                    ))}
                    
                    {/* Total Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                      <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-gray-100 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 min-w-[64px] md:min-w-[96px]">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 w-4">-</span>
                          <div>
                            <div className="text-xs md:text-sm font-bold text-gray-900">TOTAL</div>
                            <div className="text-[10px] text-gray-600 hidden md:block">All Teams</div>
                          </div>
                        </div>
                      </td>
                      
                      {activeGameweeks.map(gwNumber => {
                        const gwTotal = totalGoals.gameweekTotals[gwNumber] || 0;
                        return (
                          <td key={`total-gw${gwNumber}`} className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-gray-900 bg-gray-100 ${showOpponent ? 'min-w-[52px] md:min-w-[64px]' : 'min-w-[30px] md:min-w-[44px]'}`}>
                            {viewMode === "past" ? gwTotal : gwTotal.toFixed(2)}
                          </td>
                        );
                      })}

                      {viewMode === "future" && fixtureMode !== 'expert' && fixtureMode !== 'base' && tbcGoalMap.size > 0 && (!activeGameweeks.includes(39) && !excludedGameweeks.has(39)) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (() => {
                        const tbcTotal = filteredProjections.reduce((sum, t) => sum + getUnabsorbedTBC(t.teamShort), 0);
                        return (
                          <td className={`px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-amber-900 bg-amber-50 border-l border-amber-300 ${showOpponent ? 'min-w-[52px] md:min-w-[64px]' : 'min-w-[30px] md:min-w-[44px]'}`}>
                            {tbcTotal.toFixed(2)}
                          </td>
                        );
                      })()}
                      
                      <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-orange-100 w-14 border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <span className="text-sm md:text-lg font-bold text-orange-900">
                          {(() => {
                            const tbcSum = filteredProjections.reduce((s, t) => s + getUnabsorbedTBC(t.teamShort), 0);
                            const grand = totalGoals.overallTotal + tbcSum;
                            return viewMode === "past" ? grand : grand.toFixed(2);
                          })()}
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
              <CardTitle className="text-lg">
                {viewMode === "future" ? "About Team Goal Projections" : viewMode === "pastXg" ? "About Team xG History" : "About Team Goals History"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {viewMode === "future" ? (
                      <>
                        <li>• Team attacking performance data</li>
                        <li>• Historical goal-scoring patterns</li>
                        <li>• Current form and statistics</li>
                        <li>• Fixture context factors</li>
                      </>
                    ) : (
                      <>
                        <li>• Official FPL match results</li>
                        <li>• Verified gameweek data</li>
                        <li>• Home and away goal breakdown</li>
                        <li>• Complete season history</li>
                      </>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {viewMode === "future" ? (
                      <>
                        <li>• Projected goals per gameweek</li>
                        <li>• Season-long goal estimates</li>
                        <li>• Comparative team analysis</li>
                        <li>• Updated regularly throughout season</li>
                      </>
                    ) : (
                      <>
                        <li>• Actual goals scored per gameweek</li>
                        <li>• Historical performance trends</li>
                        <li>• Team comparison across periods</li>
                        <li>• Filter by gameweek range</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    
  );
}
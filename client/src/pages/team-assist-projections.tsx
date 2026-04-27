import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Filter, BarChart3, Trophy, Zap, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  assists: number;
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

interface TeamAssistProjection {
  id: number;
  team: string;
  teamShort: string;
  teamBadge?: string;
  gameweekProjections: {
    [gameweek: number]: number;
  };
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
  totalAssists: number;
  averageAssistsPerGame: number;
  confidence: 'High' | 'Medium' | 'Low';
  position: number;
}

export default function TeamAssistProjections() {
  const { defaultWeeks } = useProjectionSettings();
  const { data: bootstrapData, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');

  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  const hasTBCFixture = useMemo(() => {
    if (!Array.isArray(fixturesData)) return false;
    return (fixturesData as any[]).some((f: any) => f.event === null || f.event === undefined);
  }, [fixturesData]);

  // Calculate dynamic gameweek ranges based on current gameweek
  const { defaultStart, defaultEnd } = useMemo(() => {
    const range = getDefaultGameweekRange(bootstrapData?.events || [], defaultWeeks);
    return {
      defaultStart: range.startGameweek || "6",
      defaultEnd: hasTBCFixture && fixtureMode === 'base' ? "39" : (range.endGameweek || "13")
    };
  }, [bootstrapData, hasTBCFixture, fixtureMode]);
  
  const availableGameweeks = useMemo(() => {
    const gws = getNextGameweeksForDropdown(bootstrapData?.events || [], 12);
    // GW39 only appears in base mode — expert/custom modes absorb TBC into a regular GW
    if (hasTBCFixture && fixtureMode === 'base' && !gws.includes(39)) {
      return [...gws, 39];
    }
    return gws;
  }, [bootstrapData, hasTBCFixture, fixtureMode]);

  const [startGameweek, setStartGameweek] = useState<string>("6");
  const [endGameweek, setEndGameweek] = useState<string>("13");
  const [selectedGameweeks, setSelectedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("total");
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [tbcAssignments, setTbcAssignments] = useState<Record<number, number>>(() => {
    try { const s = localStorage.getItem('fpl-tbc-assignments'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  useEffect(() => {
    const onFocus = () => { try { const s = localStorage.getItem('fpl-tbc-assignments'); setTbcAssignments(s ? JSON.parse(s) : {}); } catch {} };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Update state when defaults change
  useMemo(() => {
    if (defaultStart && defaultStart !== startGameweek) setStartGameweek(defaultStart);
    if (defaultEnd && defaultEnd !== endGameweek) setEndGameweek(defaultEnd);
  }, [defaultStart, defaultEnd]);

  const activeGameweeks = useMemo(() => {
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    const gameweeks: number[] = [];
    for (let gw = startGW; gw <= endGW; gw++) {
      if (selectedGameweeks.size === 0 || selectedGameweeks.has(gw)) {
        gameweeks.push(gw);
      }
    }
    return gameweeks;
  }, [startGameweek, endGameweek, selectedGameweeks]);

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

  // When switching away from base mode, snap endGameweek back from GW39
  useEffect(() => {
    if (fixtureMode !== 'base' && endGameweek === "39" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setEndGameweek(newRange.endGameweek);
    }
  }, [fixtureMode]);

  const { data: projectionsData, isLoading: projectionsLoading } = useQuery<TeamAssistProjection[]>({
    queryKey: ["/api/team-assist-projections"],
  });

  // Model-based TBC goal projections for assist derivation
  const { data: tbcGoalData } = useQuery<TBCGoalProjection[]>({
    queryKey: ["/api/tbc-goal-projections"],
    staleTime: 30 * 60 * 1000,
  });

  // Map teamShort → { assists, opponent, isHome } using team assist ratio from bootstrap
  const tbcAssistMap = useMemo(() => {
    const map = new Map<string, { assists: number; opponent: string; isHome: boolean }>();
    if (!tbcGoalData || !bootstrapData?.elements || !bootstrapData?.teams) return map;
    tbcGoalData.forEach(f => {
      const computeAssists = (teamShort: string, goals: number, isHome: boolean, opponentShort: string) => {
        const teamRecord = (bootstrapData.teams as any[]).find((t: any) => t.short_name === teamShort);
        if (!teamRecord) return;
        const players = (bootstrapData.elements as any[]).filter((p: any) => p.team === teamRecord.id);
        const totalGoals = players.reduce((s: number, p: any) => s + (parseInt(p.goals_scored) || 0), 0);
        const totalAssistsCount = players.reduce((s: number, p: any) => s + (parseInt(p.assists) || 0), 0);
        const ratio = totalGoals > 0 ? Math.min(1.0, Math.max(0.5, totalAssistsCount / totalGoals)) : 0.85;
        map.set(teamShort, { assists: Math.round(goals * ratio * 100) / 100, opponent: opponentShort, isHome });
      };
      computeAssists(f.homeTeamShort, f.homeGoals, true, f.awayTeamShort);
      computeAssists(f.awayTeamShort, f.awayGoals, false, f.homeTeamShort);
    });
    return map;
  }, [tbcGoalData, bootstrapData]);

  // Absorb TBC into assigned GW when fixtureMode is custom/expert
  const resolvedProjections = useMemo(() => {
    if (fixtureMode === 'base' || !tbcGoalData?.length || !projectionsData) return projectionsData || [];
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    return projectionsData.map(team => {
      const tbcFixture = tbcGoalData.find(f => f.homeTeamShort === team.teamShort || f.awayTeamShort === team.teamShort);
      if (!tbcFixture) return team;
      const tbcEntry = tbcAssistMap.get(team.teamShort);
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
      const newProjections = { ...team.gameweekProjections, [key]: (Number(team.gameweekProjections[key]) || 0) + tbcEntry.assists };
      const existing: FixtureDetail[] = team.fixtureDetails?.[key] ? [...team.fixtureDetails[key]] : [];
      const newFixtureDetails = { ...(team.fixtureDetails || {}), [key]: [...existing, { opponent: tbcEntry.opponent, isHome: tbcEntry.isHome, assists: tbcEntry.assists }] };
      return { ...team, gameweekProjections: newProjections, fixtureDetails: newFixtureDetails };
    });
  }, [fixtureMode, projectionsData, tbcGoalData, tbcAssistMap, tbcAssignments, startGameweek, endGameweek]);

  // TBC assists still in TBC column (not absorbed)
  const getUnabsorbedTBC = (teamShort: string): number => {
    if (fixtureMode === 'expert') return 0;
    if (fixtureMode === 'base') return tbcAssistMap.get(teamShort)?.assists || 0;
    const f = tbcGoalData?.find(x => x.homeTeamShort === teamShort || x.awayTeamShort === teamShort);
    if (!f) return 0;
    const assigned = tbcAssignments[f.fixtureId];
    const startGW = parseInt(startGameweek);
    const endGW = parseInt(endGameweek);
    if (assigned !== undefined && assigned !== null && assigned >= startGW && assigned <= endGW) return 0;
    return tbcAssistMap.get(teamShort)?.assists || 0;
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
            const aPeriodTotal = activeGameweeks.reduce((sum, gw) => sum + (a.gameweekProjections[gw] || 0), 0) + getUnabsorbedTBC(a.teamShort);
            const bPeriodTotal = activeGameweeks.reduce((sum, gw) => sum + (b.gameweekProjections[gw] || 0), 0) + getUnabsorbedTBC(b.teamShort);
            return bPeriodTotal - aPeriodTotal;
          }
          case "average": return b.averageAssistsPerGame - a.averageAssistsPerGame;
          case "position": return a.position - b.position;
          default: return b.averageAssistsPerGame - a.averageAssistsPerGame;
        }
      });
  }, [resolvedProjections, selectedTeams, sortBy, activeGameweeks, tbcAssistMap, fixtureMode, tbcAssignments, startGameweek, endGameweek]);

  const totalAssists = useMemo(() => {
    if (!filteredProjections.length || !bootstrapData?.events) return { gameweekTotals: {}, overallTotal: 0, averagePerGame: 0 };
    
    const gameweekTotals: { [gameweek: number]: number } = {};
    let overallTotal = 0;
    
    const totalWeeks = activeGameweeks.length;
    
    // Calculate totals for active (selected) gameweeks
    activeGameweeks.forEach(gwNumber => {
      const gwTotal = filteredProjections.reduce((sum, team) => sum + (team.gameweekProjections[gwNumber] || 0), 0);
      gameweekTotals[gwNumber] = gwTotal;
      overallTotal += gwTotal;
    });
    
    const averagePerGame = totalWeeks > 0 ? overallTotal / totalWeeks : 0;
    
    return { gameweekTotals, overallTotal, averagePerGame };
  }, [filteredProjections, bootstrapData, activeGameweeks]);

  // Helper functions for styling
  const getAssistsColor = (assists: number) => {
    if (assists >= 1.5) return "text-green-600 bg-green-50";
    if (assists >= 1.0) return "text-blue-600 bg-blue-50";
    if (assists >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return "bg-green-100 text-green-800 border-green-200";
      case 'Medium': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'Low': return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading || projectionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Team Assists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Calculating team assist projections across the next 12 gameweeks...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Zap className="h-8 w-8" />
            <h1>Team Assist Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Assists for each team across all 38 gameweeks - actual assists for completed games, projections for upcoming games
          </p>
        </div>
      </div>

      {tbcAssistMap.size > 0 && (
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
                      <SelectTrigger className={`h-8 text-xs ${hasTBCFixture && fixtureMode === 'base' ? 'w-32' : 'w-20'}`} data-testid="select-start-gameweek">
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
                      <SelectTrigger className={`h-8 text-xs ${hasTBCFixture && fixtureMode === 'base' ? 'w-32' : 'w-20'}`} data-testid="select-end-gameweek">
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

        {/* Team Assist Projections Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {`Team Assist Projections: GW${startGameweek}-GW${endGameweek}`}
              {selectedGameweeks.size > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedGameweeks.size} GW{selectedGameweeks.size === 1 ? '' : 's'} selected
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
                    <th className="px-1 md:px-3 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[110px] min-w-[110px]">
                      Team
                    </th>
                    {activeGameweeks.map(gwNumber => (
                      <th 
                        key={gwNumber} 
                        className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-[52px] min-w-[52px]"
                        onClick={() => setSortBy(`gw${gwNumber}`)}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="md:hidden">{gwNumber}</span>
                          <span className="hidden md:inline">GW{gwNumber}</span>
                          {sortBy === `gw${gwNumber}` && <TrendingUp className="h-3 w-3" />}
                        </div>
                      </th>
                    ))}
                    {fixtureMode !== 'expert' && tbcAssistMap.size > 0 && parseInt(endGameweek) >= 39 && !(parseInt(startGameweek) <= 39 && parseInt(endGameweek) >= 39) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (
                      <th className="px-0.5 md:px-2 py-2 md:py-3 text-center text-xs font-medium text-amber-700 uppercase tracking-wider bg-amber-50/60 border-l border-amber-300 w-[52px] min-w-[52px]">
                        GW39 (TBC)
                      </th>
                    )}
                    <th 
                      className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100 transition-colors w-[65px] min-w-[65px]"
                      onClick={() => setSortBy('total')}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="md:hidden">Tot</span>
                        <span className="hidden md:inline">Total</span>
                        {sortBy === 'total' && <TrendingUp className="h-3 w-3" />}
                      </div>
                    </th>
                    <th 
                      className="px-1 md:px-3 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                      onClick={() => setSortBy('average')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Avg/Game
                        {sortBy === 'average' && <TrendingUp className="h-3 w-3" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjections.map((team, index) => (
                    <tr key={team.id} className="hover:bg-gray-50" data-testid={`team-projection-row-${team.id}`}>
                      <td className="px-1 md:px-3 py-2 md:py-4 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[110px] min-w-[110px]">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                          <div>
                            <div className="text-xs md:text-sm font-medium text-gray-900 md:hidden">{team.teamShort}</div>
                            <div className="text-xs md:text-sm font-medium text-gray-900 hidden md:block">{team.team}</div>
                            <div className="text-[10px] text-gray-500 hidden md:block">{team.teamShort}</div>
                          </div>
                        </div>
                      </td>
                      
                      {activeGameweeks.map(gwNumber => {
                        const assists = team.gameweekProjections[gwNumber] || 0;
                        const fixtures: FixtureDetail[] = team.fixtureDetails?.[gwNumber.toString()] || [];
                        const isDGW = fixtures.length > 1;
                        return (
                          <td key={gwNumber} className={`px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium w-[52px] min-w-[52px] ${getAssistsColor(assists)}`}>
                            {isDGW ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium">
                                    {assists.toFixed(2)}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                  <div className="text-xs font-semibold mb-2">GW{gwNumber} Fixture Breakdown</div>
                                  {fixtures.map((f, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                      <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                        {f.opponent} ({f.isHome ? 'H' : 'A'})
                                      </span>
                                      <span className="font-medium text-xs">{f.assists.toFixed(2)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                    <span>Total</span>
                                    <span>{assists.toFixed(2)}</span>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              assists > 0 ? assists.toFixed(2) : "-"
                            )}
                          </td>
                        );
                      })}
                      
                      {fixtureMode !== 'expert' && tbcAssistMap.size > 0 && parseInt(endGameweek) >= 39 && !(parseInt(startGameweek) <= 39 && parseInt(endGameweek) >= 39) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (() => {
                        const tbcEntry = tbcAssistMap.get(team.teamShort);
                        if (!tbcEntry) {
                          return (
                            <td className="px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm bg-amber-50/40 border-l border-amber-200 w-[52px] min-w-[52px]">
                              <span className="text-gray-300">-</span>
                            </td>
                          );
                        }
                        return (
                          <td className="px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm bg-amber-50/60 border-l border-amber-300 w-[52px] min-w-[52px]">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                  <div className="flex flex-col items-center">
                                    <span className="font-semibold text-amber-800">{tbcEntry.assists.toFixed(2)}</span>
                                    <span className="text-[9px] md:text-[10px] text-amber-600 mt-0.5">
                                      {tbcEntry.opponent}({tbcEntry.isHome ? 'H' : 'A'})
                                    </span>
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
                                    <span className="font-semibold text-amber-800">{tbcEntry.assists.toFixed(2)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 pt-1">Projected assists from TBC goals × team assist ratio (capped 0.5–1.0 from season stats)</p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                        );
                      })()}

                      <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-50 w-[65px] min-w-[65px]">
                        <span className="text-sm md:text-lg font-bold text-blue-900">
                          {(activeGameweeks.reduce((sum, gw) => sum + (team.gameweekProjections[gw] || 0), 0) + getUnabsorbedTBC(team.teamShort)).toFixed(2)}
                        </span>
                      </td>
                      
                      <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-gray-900 hidden md:table-cell">
                        {team.averageAssistsPerGame.toFixed(2)}
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
                      const gwTotal = totalAssists.gameweekTotals[gwNumber] || 0;
                      return (
                        <td key={gwNumber} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-gray-900 bg-gray-100 w-[52px] min-w-[52px]">
                          {gwTotal > 0 ? gwTotal.toFixed(2) : "-"}
                        </td>
                      );
                    })}
                    
                    {fixtureMode !== 'expert' && tbcAssistMap.size > 0 && parseInt(endGameweek) >= 39 && !(parseInt(startGameweek) <= 39 && parseInt(endGameweek) >= 39) && !(fixtureMode === 'custom' && tbcGoalData?.every(f => { const a = tbcAssignments[f.fixtureId]; return a !== undefined && a !== null && a >= parseInt(startGameweek) && a <= parseInt(endGameweek); })) && (() => {
                      const tbcTotal = filteredProjections.reduce((sum, team) => sum + getUnabsorbedTBC(team.teamShort), 0);
                      return (
                        <td className="px-0.5 md:px-2 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-amber-900 bg-amber-50 border-l border-amber-300 w-[52px] min-w-[52px]">
                          {tbcTotal.toFixed(2)}
                        </td>
                      );
                    })()}

                    <td className="px-1 md:px-3 py-2 md:py-4 text-center bg-blue-100 w-[65px] min-w-[65px]">
                      <span className="text-sm md:text-lg font-bold text-blue-900">
                        {(totalAssists.overallTotal + filteredProjections.reduce((sum, team) => sum + getUnabsorbedTBC(team.teamShort), 0)).toFixed(2)}
                      </span>
                    </td>
                    
                    <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-bold text-gray-900 bg-gray-100 hidden md:table-cell">
                      {totalAssists.averagePerGame.toFixed(2)}
                    </td>
                    
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest Single GW</CardTitle>
              <Trophy className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {Math.max(...Object.values(totalAssists.gameweekTotals)).toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">Expected assists in peak gameweek</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Per GW</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalAssists.averagePerGame.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">League average assists per gameweek</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Creative Team</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {filteredProjections.length > 0 ? filteredProjections[0].team : "-"}
              </div>
              <p className="text-xs text-gray-600">
                {filteredProjections.length > 0 ? `${filteredProjections[0].totalAssists.toFixed(2)} assists` : "No data"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
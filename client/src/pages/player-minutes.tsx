import { useState, useMemo, useEffect } from "react";
import { getHeatmapColor } from "@/lib/heatmap-colors";
import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, Users, Calendar, ArrowUpDown, Target, Filter, Search, Loader2, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SeasonBadge } from "@/components/season-badge";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { useFitColumns } from "@/hooks/use-fit-columns";
import JerseyIcon from "@/components/jersey-icon";
import { getDefaultFiltersOpen } from "@/lib/utils";
import { IconTile, PosChip, SectionCard, StatTile, TeamChip, asPos } from "@/components/tool-ui";

// Filter chips in the shared tool look: indigo when on, muted grey when off.
const CHIP = "chip-toggle inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold leading-none cursor-pointer transition-colors";
const CHIP_ON = "bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:text-indigo-300";
const CHIP_OFF = "bg-gray-500/10 text-gray-400 border-gray-300/60";
const CHIP_ACTION = "bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:text-emerald-300";
const CHIP_AMBER = "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300";

interface BootstrapData {
  events: any[];
  teams: any[];
}

interface PlayerMinutesProjection {
  playerId: number;
  playerName: string;
  teamShort: string;
  position: string;
  currentMinutes: number;
  currentMinutesPerGame: number;
  expectedMinutesPerGame: number;
  pointsFromMinutes: number;
  benchAppearances: number;
  // Per-gameweek expected minutes, reflecting real injury/availability data and the
  // same-position teammate reallocation from server/xmins-reallocation.ts (e.g. an injured
  // player's minutes redistributed to whoever covers for them that gameweek).
  xMinsPerGW?: { [key: string]: number };
}

type SortField = 'name' | 'team' | 'position' | 'currentMinutes' | 'avgXMins' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerMinutes() {
  const { defaultWeeks, totalWeeks } = useProjectionSettings();
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [sortField, setSortField] = useState<SortField>('avgXMins');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [minMinutes, setMinMinutes] = useState<string>("30"); // Minimum minutes filter
  // Filter section collapse state - expanded on desktop, collapsed on mobile
  const [isFiltersOpen, setIsFiltersOpen] = useState(getDefaultFiltersOpen); // open on desktop, collapsed on mobile

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch fixtures to detect whether the current gameweek has an unstarted fixture (fold-in) and
  // which teams' current-GW fixture is decided (blanking a stale current-GW estimate).
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch player minutes projections data
  const { data: playerMinutesData, isLoading, error } = useQuery<PlayerMinutesProjection[]>({
    queryKey: ["/api/player-minutes-projections"],
    staleTime: 30 * 60 * 1000, // 30 minutes - data updated hourly
  });

  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3;
    const currentEvent = bootstrapData.events.find((e: any) => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  // True once the current gameweek has at least one fixture that's still to kick off — that's
  // when it's worth folding into the default range, same convention as the other Player
  // Projection pages. The backend already folds the current gameweek into its own xMinsPerGW
  // range unconditionally (see the /api/player-minutes-projections handler); this mirrors it
  // client-side so the dropdown/default range and the fetched data agree.
  const currentGWHasUnstarted = useMemo(() => {
    if (!Array.isArray(fixturesData) || currentGameweek <= 0) return false;
    return (fixturesData as any[]).some(f => f.event === currentGameweek && !f.started);
  }, [fixturesData, currentGameweek]);

  // Team SHORT codes whose own fixture in the current gameweek has kicked off or finished —
  // their current-GW expected-minutes estimate is stale (real minutes are already known) and
  // gets blanked client-side.
  const currentGWDecidedTeamShorts = useMemo(() => {
    const set = new Set<string>();
    if (!Array.isArray(fixturesData) || !bootstrapData?.teams || currentGameweek <= 0) return set;
    (fixturesData as any[]).filter(f => f.event === currentGameweek && (f.started || f.finished || f.finished_provisional)).forEach(f => {
      const homeTeam = (bootstrapData.teams as any[]).find((t: any) => t.id === f.team_h);
      const awayTeam = (bootstrapData.teams as any[]).find((t: any) => t.id === f.team_a);
      if (homeTeam) set.add(homeTeam.short_name);
      if (awayTeam) set.add(awayTeam.short_name);
    });
    return set;
  }, [fixturesData, bootstrapData, currentGameweek]);

  // Blank a decided team's current-GW estimate — strip the key entirely so it renders "-" and
  // is excluded from the Average's denominator, same convention as the other Player Projection
  // pages.
  const blankedMinutesData = useMemo(() => {
    if (!playerMinutesData) return playerMinutesData;
    if (currentGameweek <= 0 || currentGWDecidedTeamShorts.size === 0) return playerMinutesData;
    const gwKey = `gw${currentGameweek}`;
    return playerMinutesData.map(p => {
      if (!currentGWDecidedTeamShorts.has(p.teamShort) || !(gwKey in (p.xMinsPerGW || {}))) return p;
      const { [gwKey]: _omit, ...rest } = p.xMinsPerGW || {};
      return { ...p, xMinsPerGW: rest };
    });
  }, [playerMinutesData, currentGameweek, currentGWDecidedTeamShorts]);

  // Default gameweek range once bootstrap data loads, same pattern as player-saves.tsx. Waits on
  // fixturesData too — otherwise, on a cold cache, this can fire before fixturesData resolves,
  // lock in currentGWHasUnstarted=false (its default while fixtures are still loading), and
  // never reconsider once `initialized` gates it off.
  useEffect(() => {
    if (!bootstrapData || !fixturesData || initialized) return;
    const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    const effectiveStart = (currentGWHasUnstarted && currentGameweek > 0 && currentGameweek < start) ? currentGameweek : start;
    if (effectiveStart > 0 && end > 0 && effectiveStart <= end && end <= 39) {
      setStartGameweek(effectiveStart);
      setEndGameweek(end);
    }
    setInitialized(true);
  }, [bootstrapData, fixturesData, initialized, defaultWeeks, currentGWHasUnstarted, currentGameweek]);

  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) return [];
    const gws = getNextGameweeksForDropdown(bootstrapData.events, totalWeeks).filter(gw => gw !== 39);
    if (currentGWHasUnstarted && currentGameweek > 0 && !gws.includes(currentGameweek)) gws.unshift(currentGameweek);
    return gws;
  }, [bootstrapData?.events, totalWeeks, currentGWHasUnstarted, currentGameweek]);

  // GW columns for the table — xMinsPerGW never includes gw39 (no TBC handling needed here,
  // see server/routes.ts's minutes reallocation block).
  const dynamicGameweekColumns = useMemo(() => {
    if (!startGameweek || !endGameweek) return [];
    const columns: number[] = [];
    for (let gw = startGameweek; gw <= Math.min(endGameweek, 38); gw++) columns.push(gw);
    return columns;
  }, [startGameweek, endGameweek]);

  // On mobile, size the Curr/gameweek/Avg columns so a whole number always fits the visible
  // width at rest — never a sliver of the next column.
  const { containerRef: gwTableContainerRef, columnWidth, isScrollable: gwTableScrollable } = useFitColumns({
    count: dynamicGameweekColumns.length + 2,
    minWidth: 52,
    fixedLeftWidth: 130,
  });

  // Only counts gameweeks with a real (present) entry — a blanked current-GW cell isn't in
  // xMinsPerGW at all, so it's correctly excluded from the average's denominator.
  const getAvgXMins = (player: PlayerMinutesProjection) => {
    if (dynamicGameweekColumns.length === 0) return player.expectedMinutesPerGame;
    const presentGws = dynamicGameweekColumns.filter(gw => `gw${gw}` in (player.xMinsPerGW || {}));
    if (presentGws.length === 0) return 0;
    const total = presentGws.reduce((sum, gw) => sum + (player.xMinsPerGW?.[`gw${gw}`] ?? 0), 0);
    return total / presentGws.length;
  };

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!playerMinutesData) return [];
    const uniqueTeams = Array.from(new Set(playerMinutesData.map(p => p.teamShort)));
    return uniqueTeams.sort();
  }, [playerMinutesData]);

  const positions = useMemo(() => {
    if (!playerMinutesData) return [];
    const uniquePositions = Array.from(new Set(playerMinutesData.map(p => p.position)));
    return uniquePositions.sort();
  }, [playerMinutesData]);

  // /api/player-minutes-projections returns the full position name (e.g. "Forward"), not the
  // abbreviated code the filter buttons and badges use — normalize once so both agree.
  const normalizePosition = (position: string): string => {
    switch (position) {
      case 'Goalkeeper': return 'GKP';
      case 'Defender': return 'DEF';
      case 'Midfielder': return 'MID';
      case 'Forward': return 'FWD';
      default: return position;
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!blankedMinutesData) return [];

    let filtered = blankedMinutesData.filter(player => {
      // Search filter
      if (searchTerm) {
        const matchesSearch = player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            player.teamShort.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
      }
      
      if (selectedPosition !== "all" && normalizePosition(player.position) !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.teamShort !== selectedTeam) return false;
      if (player.expectedMinutesPerGame < parseInt(minMinutes)) return false;
      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case 'team':
          aValue = a.teamShort;
          bValue = b.teamShort;
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        case 'currentMinutes':
          aValue = a.currentMinutesPerGame;
          bValue = b.currentMinutesPerGame;
          break;
        case 'avgXMins':
          aValue = getAvgXMins(a);
          bValue = getAvgXMins(b);
          break;
        default:
          // Dynamic per-gameweek columns, e.g. 'gw6'
          if (sortField.startsWith('gw')) {
            aValue = a.xMinsPerGW?.[sortField] ?? 0;
            bValue = b.xMinsPerGW?.[sortField] ?? 0;
          } else {
            aValue = getAvgXMins(a);
            bValue = getAvgXMins(b);
          }
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [blankedMinutesData, searchTerm, selectedPosition, selectedTeam, minMinutes, sortField, sortDirection, dynamicGameweekColumns]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUpDown className="h-4 w-4 text-blue-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-blue-600" />;
  };

  const getPositionColor = (position: string) => {
    switch (normalizePosition(position)) {
      case 'GKP': return 'bg-yellow-100 text-yellow-800';
      case 'DEF': return 'bg-green-100 text-green-800';
      case 'MID': return 'bg-blue-100 text-blue-800';
      case 'FWD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMinutesColor = (minutes: number) => getHeatmapColor(minutes, [20, 45, 70, 85]);

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="w-full py-4 sm:py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load minutes projections</h3>
                  <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              Loading Minutes Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Calculating expected minutes for all players using rotation patterns and current form...
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
            <Clock className="h-8 w-8" />
            <h1>Player Minutes</h1><SeasonBadge />
          </div>
          <p className="fpl-page-subtitle">
            Expected minutes per gameweek for each player — reflecting real injury/availability data and reallocation to
            whichever teammate covers an absence in the same position that gameweek
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-5">
          <StatTile tone="indigo" label="Total Players" value={filteredAndSortedData.length} />
          <StatTile
            tone="green"
            label="Avg Current Min/Game"
            value={filteredAndSortedData.length > 0 ?
              Math.round(filteredAndSortedData.reduce((sum, p) => sum + p.currentMinutesPerGame, 0) / filteredAndSortedData.length)
              : '0'}
          />
          <StatTile
            tone="indigo"
            label="Avg Minutes/Game"
            value={filteredAndSortedData.length > 0 ?
              Math.round(filteredAndSortedData.reduce((sum, p) => sum + p.expectedMinutesPerGame, 0) / filteredAndSortedData.length)
              : '0'}
          />
          <StatTile
            tone="amber"
            label="Expected 60+ Min"
            value={filteredAndSortedData.filter(p => p.expectedMinutesPerGame >= 60).length}
          />
        </div>

        {/* Gameweek range + search — always visible, not buried behind the collapsible */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-500/[0.06] via-white to-violet-500/[0.04] p-4 shadow-sm dark:via-transparent sm:p-5">
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">From</label>
                <Select value={String(startGameweek)} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="h-9 w-full rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>{`GW${gw}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">To</label>
                <Select value={String(endGameweek)} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="h-9 w-full rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>{`GW${gw}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-500" />
                  <Input
                    data-testid="input-player-search"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 rounded-xl pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <div className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{filteredAndSortedData.length} players</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer bg-gradient-to-r from-indigo-500/[0.06] via-violet-500/[0.03] to-transparent px-4 py-3 transition-colors hover:bg-gray-50 sm:px-5">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <IconTile icon={Filter} />
                    <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-lg">Filters</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFiltersOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
          <div className="border-t border-gray-100 p-4 sm:p-5">
            <div className="max-w-[220px] mb-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Min Minutes</label>
              <Select value={minMinutes} onValueChange={setMinMinutes}>
                <SelectTrigger className="h-9 w-full rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="75">75</SelectItem>
                  <SelectItem value="90">90</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="pos" className="w-full">
              <TabsList className="mb-3 grid h-auto w-full max-w-xs grid-cols-2 rounded-xl border border-gray-200 bg-gray-100 p-1">
                <TabsTrigger value="pos" className="rounded-lg py-1.5 text-xs font-bold text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                  <span className="hidden sm:inline">Position</span><span className="sm:hidden">Pos</span>{selectedPosition !== "all" && " (1)"}
                </TabsTrigger>
                <TabsTrigger value="teams" className="rounded-lg py-1.5 text-xs font-bold text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                  Teams{selectedTeam !== "all" && " (1)"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pos" className="mt-0">
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {['All', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => {
                    const value = pos === 'All' ? 'all' : pos;
                    const isActive = (selectedPosition === value) || (pos === 'All' && selectedPosition === 'all');
                    return (
                      <button key={pos}
                        onClick={() => setSelectedPosition(selectedPosition === value && value !== 'all' ? 'all' : value)}
                        className={`${CHIP} ${isActive ? CHIP_ON : CHIP_OFF}`}>
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="teams" className="mt-0">
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  <button onClick={() => setSelectedTeam('all')}
                    className={`${CHIP} ${selectedTeam === 'all' ? CHIP_ON : CHIP_OFF}`}>
                    All
                  </button>
                  {teams.map(team => (
                    <button key={team}
                      onClick={() => setSelectedTeam(selectedTeam === team ? 'all' : team)}
                      className={`${CHIP} ${selectedTeam === team ? CHIP_ON : CHIP_OFF}`}>
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

        {/* Results Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-lg">Loading minutes projections...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <SectionCard icon={Clock} title="Player Minutes & Points from Minutes" bodyClassName="p-0" className="[&_h2]:overflow-visible [&_h2]:whitespace-normal">
            <div>
              <div className="relative">
              <div ref={gwTableContainerRef} className="overflow-x-auto snap-x snap-mandatory scroll-smooth">
                <table className="w-full [&_th]:snap-start [&_td]:snap-start">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-1 md:px-3 py-2 md:py-3 text-left sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('name')}
                          className="font-semibold text-gray-700 hover:text-indigo-600 p-0 h-auto text-xs md:text-sm"
                        >
                          Player {getSortIcon('name')}
                        </Button>
                      </th>
                      <th className="px-1 md:px-4 py-2 md:py-4 text-left hidden md:table-cell">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('team')}
                          className="font-semibold text-gray-700 hover:text-indigo-600 p-0 h-auto text-xs md:text-sm"
                        >
                          Team {getSortIcon('team')}
                        </Button>
                      </th>
                      <th className="px-1 md:px-4 py-2 md:py-4 text-left hidden md:table-cell">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('position')}
                          className="font-semibold text-gray-700 hover:text-indigo-600 p-0 h-auto text-xs md:text-sm"
                        >
                          Pos {getSortIcon('position')}
                        </Button>
                      </th>
                      <th
                        className={`px-1 md:px-3 py-2 md:py-3 text-center ${!columnWidth ? 'w-[52px] min-w-[52px]' : ''}`}
                        style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('currentMinutes')}
                          className="font-semibold text-gray-700 hover:text-indigo-600 p-0 h-auto text-xs md:text-sm"
                        >
                          <span className="hidden md:inline">Curr</span>
                          <span className="md:hidden">Cur</span> {getSortIcon('currentMinutes')}
                        </Button>
                      </th>
                      {dynamicGameweekColumns.map((gw) => (
                        <th
                          key={`xmins-header-gw${gw}`}
                          className={`px-1 py-2 md:py-3 text-center ${!columnWidth ? 'w-[52px] min-w-[52px]' : ''}`}
                          style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                        >
                          <Button
                            variant="ghost"
                            onClick={() => handleSort(`gw${gw}`)}
                            className="font-semibold text-gray-700 hover:text-indigo-600 p-0 h-auto text-xs md:text-sm"
                          >
                            <span className="md:hidden">{gw}</span>
                            <span className="hidden md:inline">GW{gw}</span>
                            {getSortIcon(`gw${gw}`)}
                          </Button>
                        </th>
                      ))}
                      <th
                        className={`px-1 md:px-3 py-2 md:py-3 text-center border-l border-gray-200 bg-indigo-50 md:sticky md:right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${!columnWidth ? 'w-[60px] min-w-[60px]' : ''}`}
                        style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('avgXMins')}
                          className="font-semibold text-gray-700 hover:text-indigo-600 p-0 h-auto text-xs md:text-sm"
                        >
                          Avg {getSortIcon('avgXMins')}
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedData.map((player, index) => (
                      <tr 
                        key={player.playerId}
                        className={`hover:bg-indigo-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-1 md:px-3 py-2 md:py-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                          <div className="flex items-center gap-1">
                            <JerseyIcon team={player.teamShort} position={player.position} className="h-7 w-7 object-contain shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                              <div className="font-medium text-gray-900 text-xs md:text-sm truncate max-w-[90px] md:max-w-none">{player.playerName}</div>
                              <div className="text-[10px] md:text-sm text-gray-500">
                                <span className="md:hidden">{player.teamShort} · {player.position}</span>
                                <span className="hidden md:inline">Total: {player.currentMinutes} min</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-1 md:px-4 py-2 md:py-4 hidden md:table-cell">
                          <TeamChip>{player.teamShort}</TeamChip>
                        </td>
                        <td className="px-1 md:px-4 py-2 md:py-4 hidden md:table-cell">
                          <PosChip pos={asPos(player.position)} />
                        </td>
                        <td
                          className={`px-1 md:px-3 py-2 md:py-3 text-center ${getMinutesColor(player.currentMinutesPerGame)} ${!columnWidth ? 'w-[52px] min-w-[52px]' : ''}`}
                          style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                        >
                          <div className="font-semibold text-xs md:text-sm">
                            {Math.round(player.currentMinutesPerGame)}
                          </div>
                        </td>
                        {dynamicGameweekColumns.map((gw) => {
                          const value = player.xMinsPerGW?.[`gw${gw}`];
                          return (
                            <td
                              key={`xmins-cell-${player.playerId}-gw${gw}`}
                              className={`px-1 py-2 md:py-3 text-center ${value !== undefined ? getMinutesColor(value) : ''} ${!columnWidth ? 'w-[52px] min-w-[52px]' : ''}`}
                              style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                            >
                              <div className="font-medium text-xs md:text-sm">
                                {value !== undefined ? value.toFixed(1) : <span className="text-gray-300">-</span>}
                              </div>
                            </td>
                          );
                        })}
                        <td
                          className={`px-1 md:px-3 py-2 md:py-3 text-center border-l border-gray-200 md:sticky md:right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${getMinutesColor(getAvgXMins(player))} ${!columnWidth ? 'w-[60px] min-w-[60px]' : ''}`}
                          style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                        >
                          <div className="font-bold text-xs md:text-sm">
                            {getAvgXMins(player).toFixed(1)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {gwTableScrollable && (
                <div className="pointer-events-none absolute top-0 right-0 h-9 flex items-center md:hidden">
                  <div className="flex items-center gap-0.5 bg-gray-900/70 text-white rounded-l-full pl-1.5 pr-1 py-1 animate-pulse">
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              )}
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
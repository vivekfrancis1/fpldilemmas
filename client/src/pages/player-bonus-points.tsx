import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Search, ArrowUpDown, Users, Loader2, X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerNameCell } from "@/components/enhanced-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  bonusPoints: number;
}


interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface BonusPointsProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  bonusPoints: { [key: string]: number };
  pointsFromBonus: { [key: string]: number };
  totalBonusPoints: number;
  totalPoints: number;
  averagePerGameweek: number;
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
}

type SortField = 'name' | 'team' | 'totalBonusPoints' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerBonusPoints() {
  const { defaultWeeks } = useProjectionSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("totalBonusPoints");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Fixture mode toggle
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch fixtures to detect TBC (event=null) fixtures for GW39 amber column
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // TBC team info map: teamShort → { opponent, isHome, fixtureId } built from fixtures with event=null
  const tbcTeamInfoMap = useMemo(() => {
    const map = new Map<string, { opponent: string; isHome: boolean; fixtureId: number }>();
    if (!Array.isArray(fixturesData) || !bootstrapData?.teams) return map;
    (fixturesData as any[]).filter(f => f.event === null || f.event === undefined).forEach(f => {
      const homeTeam = (bootstrapData.teams as any[]).find((t: any) => t.id === f.team_h);
      const awayTeam = (bootstrapData.teams as any[]).find((t: any) => t.id === f.team_a);
      if (homeTeam) map.set(homeTeam.short_name, { opponent: awayTeam?.short_name || '?', isHome: true, fixtureId: f.id });
      if (awayTeam) map.set(awayTeam.short_name, { opponent: homeTeam?.short_name || '?', isHome: false, fixtureId: f.id });
    });
    return map;
  }, [fixturesData, bootstrapData]);

  // Get available gameweeks for dropdown (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    const gws = getNextGameweeksForDropdown(bootstrapData.events, 12);
    if (fixtureMode === 'base' && tbcTeamInfoMap.size > 0 && !gws.includes(39)) gws.push(39);
    return gws;
  }, [bootstrapData?.events, fixtureMode, tbcTeamInfoMap]);

  // Initialize gameweek range once bootstrap data is loaded
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks); 
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 39) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
    }
  }, [bootstrapData, initialized]);

  // Auto-extend endGameweek to 39 in base mode when TBC fixture exists
  useEffect(() => {
    if (tbcTeamInfoMap.size > 0 && fixtureMode === 'base') {
      setEndGameweek(39);
    }
  }, [tbcTeamInfoMap.size, fixtureMode]);

  // Snap endGameweek back from 39 when leaving base mode
  useEffect(() => {
    if (fixtureMode !== 'base' && endGameweek === 39 && bootstrapData?.events) {
      const defaultRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setEndGameweek(parseInt(defaultRange.endGameweek));
    }
  }, [fixtureMode, endGameweek, bootstrapData?.events]);

  // Simplified API call for bonus points projections (now projects future gameweeks only)
  const { data: bonusPointsProjections, isLoading: isLoadingProjections } = useQuery<BonusPointsProjection[]>({
    queryKey: ["/api/player-bonus-points-projections"],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes for live data
  });

  // TBC assignments from localStorage
  const tbcAssignments = useMemo<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  }, [fixtureMode]);

  // resolvedBonusData: absorbs GW39 real data into assigned GW for expert/custom modes
  const resolvedBonusData = useMemo<BonusPointsProjection[]>(() => {
    if (!bonusPointsProjections || !Array.isArray(bonusPointsProjections)) return [];
    if (tbcTeamInfoMap.size === 0 || fixtureMode === 'base') return bonusPointsProjections;
    const startGW = startGameweek ?? 0;
    const endGW = endGameweek ?? 39;
    return bonusPointsProjections.map((p: BonusPointsProjection) => {
      const tbcInfo = tbcTeamInfoMap.get(p.teamName);
      if (!tbcInfo) return p;
      const gw39Bonus = p.bonusPoints?.['gw39'] || 0;
      if (!gw39Bonus) return p;
      let assignedGW: number | null = null;
      if (fixtureMode === 'expert') {
        assignedGW = 36;
      } else {
        const raw = tbcAssignments[tbcInfo.fixtureId] ?? null;
        if (raw !== null && raw >= startGW && raw <= endGW) assignedGW = raw;
      }
      if (assignedGW === null) return p;
      const gwKey = `gw${assignedGW}`;
      const prevVal = p.bonusPoints?.[gwKey] || 0;
      const newBonusPoints = { ...p.bonusPoints, [gwKey]: prevVal + gw39Bonus, 'gw39': 0 };
      const prevDetails = p.fixtureDetails?.[assignedGW.toString()] || [];
      const newFixtureDetails = { ...(p.fixtureDetails || {}), [assignedGW.toString()]: [...prevDetails, { opponent: tbcInfo.opponent, isHome: tbcInfo.isHome, bonusPoints: gw39Bonus }] };
      return { ...p, bonusPoints: newBonusPoints, fixtureDetails: newFixtureDetails };
    });
  }, [bonusPointsProjections, tbcTeamInfoMap, fixtureMode, tbcAssignments, startGameweek, endGameweek]);

  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  // Create availability map for player availability badges
  const playerAvailabilityMap = usePlayerAvailabilityMap(bootstrapData);

  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3;
    const currentEvent = bootstrapData.events.find((e: any) => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const teams = useMemo(() => {
    if (!bonusPointsProjections || !Array.isArray(bonusPointsProjections)) return [];
    const uniqueTeams = Array.from(new Set(bonusPointsProjections.map((p: BonusPointsProjection) => p.teamName)));
    return uniqueTeams.sort();
  }, [bonusPointsProjections]);

  const positions = ["GKP", "DEF", "MID", "FWD"];

  // Toggle position selection
  const togglePositionSelection = (position: string) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(position)) newSet.delete(position);
      else newSet.add(position);
      return newSet;
    });
  };

  // Toggle team selection
  const toggleTeamSelection = (team: string) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(team)) newSet.delete(team);
      else newSet.add(team);
      return newSet;
    });
  };

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

  // Whether the floating GW39 (TBC) column should be visible
  const showTBCColumn = useMemo(() => (
    endGameweek >= 39 && !excludedGameweeks.has(39) &&
    fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0
  ), [endGameweek, excludedGameweeks, fixtureMode, tbcTeamInfoMap]);

  // Generate dynamic gameweek columns based on selected range (excluding excluded gameweeks, capped at GW38)
  const dynamicGameweekColumns = useMemo(() => {
    const cappedEnd = Math.min(endGameweek, 38);
    const columns = [];
    for (let gw = startGameweek; gw <= cappedEnd; gw++) {
      if (!excludedGameweeks.has(gw)) {
        columns.push(gw);
      }
    }
    return columns;
  }, [startGameweek, endGameweek, excludedGameweeks]);

  // Calculate dynamic totals based on selected gameweek range (using filtered columns)
  const getFilteredTotal = (player: BonusPointsProjection, useAvailability: boolean = false) => {
    let total = 0;
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const availabilityFactor = useAvailability && playerInfo 
      ? (playerInfo.chanceOfPlayingNextRound ?? 100) / 100 
      : 1;
    for (const gw of dynamicGameweekColumns) {
      total += (player.bonusPoints?.[`gw${gw}`] || 0) * availabilityFactor;
    }
    return total;
  };

  // Helper to get adjusted total for sorting
  const getAdjustedTotalForSort = (player: BonusPointsProjection) => {
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const gwMultipliers = applyAvailability 
      ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
      : {};
    let total = 0;
    dynamicGameweekColumns.forEach(gw => {
      const val = player.bonusPoints?.[`gw${gw}`] || 0;
      const mult = gwMultipliers[gw] ?? 1;
      total += val * mult;
    });
    return total;
  };

  // Helper to normalize position strings for filtering
  const normalizePosition = (pos: string): string => {
    if (!pos) return '';
    const upper = pos.toUpperCase();
    if (upper === 'DEF' || upper.startsWith('DEFEND')) return 'Defender';
    if (upper === 'MID' || upper.startsWith('MIDFIEL')) return 'Midfielder';
    if (upper === 'FWD' || upper.startsWith('FORWARD')) return 'Forward';
    if (upper === 'GKP' || upper.startsWith('GOALK')) return 'Goalkeeper';
    return pos;
  };

  const filteredAndSortedData = useMemo(() => {
    if (!resolvedBonusData || !Array.isArray(resolvedBonusData)) return [];
    
    let filtered = resolvedBonusData.filter((projection: BonusPointsProjection) => {
      const matchesSearch = !searchTerm || 
        projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Position filter - exclude semantics (set contains excluded positions)
      if (selectedPositions.size > 0) {
        const normalizedPos = normalizePosition(projection.position);
        const excluded = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
        if (excluded) return false;
      }
      if (selectedTeams.size > 0 && !selectedTeams.has(projection.teamName)) return false;
      
      return matchesSearch;
    });

    // Sort data
    filtered.sort((a: BonusPointsProjection, b: BonusPointsProjection) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case 'team':
          aValue = a.teamName;
          bValue = b.teamName;
          break;
        case 'totalBonusPoints': {
          aValue = getAdjustedTotalForSort(a) + (showTBCColumn ? (a.bonusPoints?.['gw39'] || 0) : 0);
          bValue = getAdjustedTotalForSort(b) + (showTBCColumn ? (b.bonusPoints?.['gw39'] || 0) : 0);
          break;
        }
        default:
          // Handle dynamic gameweek fields (like 'gw11', 'gw12', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = parseInt(sortField.replace('gw', ''));
            const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
            const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
            const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            aValue = (a.bonusPoints?.[`gw${gwNumber}`] || 0) * (aMultipliers[gwNumber] ?? 1);
            bValue = (b.bonusPoints?.[`gw${gwNumber}`] || 0) * (bMultipliers[gwNumber] ?? 1);
          } else {
            aValue = getAdjustedTotalForSort(a);
            bValue = getAdjustedTotalForSort(b);
          }
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [resolvedBonusData, searchTerm, selectedPositions, selectedTeams, sortField, sortDirection, dynamicGameweekColumns, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData, showTBCColumn]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Show loading state while data is loading OR while initializing gameweeks OR when data is empty
  if (isLoadingBootstrap || isLoadingProjections || !initialized || !bonusPointsProjections || bonusPointsProjections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading Bonus Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Calculating BPS projections for all players across the next 12 gameweeks...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Star className="h-8 w-8" />
            <h1>Player Bonus Points</h1>
          </div>
          <p className="fpl-page-subtitle">
            Bonus Point System (BPS) projections and additional FPL rewards for top performers
          </p>
        </div>
      </div>

      {tbcTeamInfoMap.size > 0 && (
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
        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-base sm:text-lg">Filters & Controls</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFiltersOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">From GW</label>
                <Select value={String(startGameweek)} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>{gw === 39 ? 'GW39 (TBC)' : `GW${gw}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">To GW</label>
                <Select value={String(endGameweek)} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>{gw === 39 ? 'GW39 (TBC)' : `GW${gw}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  Search
                </label>
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-search"
                />
              </div>
            </div>

            <Tabs defaultValue="gws" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Gameweeks</span><span className="sm:hidden">GWs</span>{excludedGameweeks.size > 0 && ` (${excludedGameweeks.size})`}
                </TabsTrigger>
                <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Position</span><span className="sm:hidden">Pos</span>{selectedPositions.size > 0 && ` (${selectedPositions.size})`}
                </TabsTrigger>
                <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gws" className="mt-0">
                <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                  <button
                    onClick={() => setApplyAvailability(!applyAvailability)}
                    className={`inline-flex items-center gap-1 rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${applyAvailability ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                  >
                    Avail: {applyAvailability ? 'ON' : 'OFF'}
                  </button>
                  {excludedGameweeks.size > 0 && (
                    <button onClick={clearExclusions} className="inline-flex items-center gap-0.5 rounded text-[11px] font-medium px-1.5 py-px leading-none cursor-pointer text-gray-500 hover:text-gray-700">
                      <X className="h-2.5 w-2.5" />Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {Array.from({ length: Math.min(endGameweek, 38) - startGameweek + 1 }, (_, i) => {
                    const gw = startGameweek + i;
                    const isExcluded = excludedGameweeks.has(gw);
                    return (
                      <button key={gw} onClick={() => toggleGameweekExclusion(gw)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isExcluded ? 'bg-gray-100 text-gray-400 line-through border-gray-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}
                      >GW{gw}</button>
                    );
                  })}
                  {fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0 && endGameweek >= 39 && (
                    <button onClick={() => toggleGameweekExclusion(39)}
                      className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${excludedGameweeks.has(39) ? 'bg-gray-100 text-gray-400 line-through border-gray-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}
                    >GW39 (TBC)</button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pos" className="mt-0">
                <div className="flex justify-end gap-1 mb-1">
                  <button onClick={() => setSelectedPositions(new Set())} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">All</button>
                  <button onClick={() => setSelectedPositions(new Set(['GKP','DEF','MID','FWD']))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-red-50 text-red-700 border-red-300">None</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {['GKP','DEF','MID','FWD'].map(pos => {
                    const isIncluded = !selectedPositions.has(pos);
                    return (
                      <button key={pos} onClick={() => togglePositionSelection(pos)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isIncluded ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-gray-100 text-gray-400 line-through border-gray-300'}`}
                      >{pos}</button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="teams" className="mt-0">
                <div className="flex justify-end gap-1 mb-1">
                  <button onClick={() => setSelectedTeams(new Set())} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">All</button>
                  <button onClick={() => setSelectedTeams(new Set(teams))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-red-50 text-red-700 border-red-300">None</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {teams.map(team => {
                    const isIncluded = !selectedTeams.has(team);
                    return (
                      <button key={team} onClick={() => toggleTeamSelection(team)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isIncluded ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-400 line-through border-gray-300'}`}
                      >{team}</button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
              <Users className="h-4 w-4" />
              <span>{filteredAndSortedData.length} players</span>
            </div>
          </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Results */}
        {filteredAndSortedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Bonus Points Projections
                {excludedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {excludedGameweeks.size} excluded
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 border-b-2 border-blue-100 sticky top-0 z-10">
                      <tr>
                        <th className="text-left py-2 px-1 md:px-3 font-semibold text-gray-700 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px] text-xs md:text-sm">
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            Player
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        {dynamicGameweekColumns.map((gw) => (
                          <th key={`gw${gw}`} className="text-center py-2 px-1 text-xs md:text-sm font-semibold text-gray-700 w-[52px] min-w-[52px]">
                            <button
                              onClick={() => handleSort(`gw${gw}`)}
                              className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors w-full"
                            >
                              <span className="md:hidden">{gw}</span><span className="hidden md:inline">GW{gw}</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                        ))}
                        {showTBCColumn && (
                          <th className="text-center py-2 px-1 text-xs md:text-sm font-medium uppercase tracking-wider w-[52px] min-w-[52px] bg-amber-50/60 border-l border-amber-300 text-amber-700">
                            GW39 (TBC)
                          </th>
                        )}
                        <th className="text-center py-2 px-1 text-xs md:text-sm font-bold bg-blue-100 border-l border-blue-200 w-[65px] min-w-[65px] sticky right-0 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <button
                            onClick={() => handleSort('totalBonusPoints')}
                            className="flex items-center justify-center gap-1 hover:text-blue-700 transition-colors w-full"
                          >
                            Total
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-center py-2 px-1 text-xs md:text-sm font-semibold bg-green-50 border-l border-green-200 w-[52px] min-w-[52px] hidden md:table-cell">
                          Avg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData.map((projection: BonusPointsProjection, index) => {
                        const playerInfo = playerAvailabilityMap?.get(projection.playerId);
                        const gwMultipliers = applyAvailability 
                          ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
                          : {};
                        const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                        
                        let adjustedTotal = 0;
                        let originalTotal = 0;
                        dynamicGameweekColumns.forEach(gw => {
                          const val = projection.bonusPoints?.[`gw${gw}`] || 0;
                          const mult = gwMultipliers[gw] ?? 1;
                          adjustedTotal += val * mult;
                          originalTotal += val;
                        });
                        const adjustedAverage = adjustedTotal / dynamicGameweekColumns.length;
                        const originalAverage = originalTotal / dynamicGameweekColumns.length;
                        
                        return (
                        <tr key={projection.playerId} className={`border-b border-gray-100 hover:bg-blue-50/50 ${index < 10 ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-2 px-1 md:px-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                            <div className="flex items-center gap-0.5 flex-wrap">
                              <PlayerNameCell 
                                name={(playerIdToWebName && playerIdToWebName.get(projection.playerId)) || projection.playerName}
                                position={projection.position}
                                team={projection.teamName}
                                compact={true}
                                className="text-xs md:text-sm"
                              />
                              {playerAvailabilityMap && playerAvailabilityMap.get(projection.playerId) && (
                                <PlayerAvailabilityBadge player={playerAvailabilityMap.get(projection.playerId)!} />
                              )}
                            </div>
                          </td>
                          {dynamicGameweekColumns.map((gw) => {
                            const rawValue = projection.bonusPoints?.[`gw${gw}`] || 0;
                            const multiplier = gwMultipliers[gw] ?? 1;
                            const displayValue = rawValue * multiplier;
                            const hasGwAdjustment = applyAvailability && multiplier !== 1;
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            return (
                              <td key={`bonus-cell-${projection.playerId}-gw${gw}`} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium w-[52px] min-w-[52px]">
                                {isDGW ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium">
                                        {hasGwAdjustment && rawValue ? (
                                          <span className="text-purple-700">{displayValue.toFixed(1)}</span>
                                        ) : (
                                          <span>{rawValue ? rawValue.toFixed(1) : '-'}</span>
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                      <div className="text-xs font-semibold mb-2">GW{gw} Fixture Breakdown</div>
                                      {fixtures.map((f: FixtureDetail, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                          <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                            {f.opponent} ({f.isHome ? 'H' : 'A'})
                                          </span>
                                          <span className="font-medium text-xs">{f.bonusPoints.toFixed(1)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                        <span>Total</span>
                                        <span>{rawValue.toFixed(1)}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : hasGwAdjustment && rawValue ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-purple-700 font-medium">{displayValue.toFixed(1)}</span>
                                    <span className="text-gray-400 line-through text-xs">{rawValue.toFixed(1)}</span>
                                  </div>
                                ) : (
                                  <span>{rawValue ? rawValue.toFixed(1) : '-'}</span>
                                )}
                              </td>
                            );
                          })}
                          {showTBCColumn && (() => {
                            const tbcBonusEntry = tbcTeamInfoMap.get(projection.teamName);
                            const tbcBonusVal = projection.bonusPoints?.['gw39'] || 0;
                            return (
                              <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium w-[52px] min-w-[52px] bg-amber-50/60 border-l border-amber-300">
                                {tbcBonusEntry && tbcBonusVal > 0 ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 text-amber-700 font-medium">
                                        {tbcBonusVal.toFixed(1)}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-amber-200 z-50">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-xs font-semibold">GW39 (TBC)</span>
                                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1">FPL Model</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1">
                                        <span className={`text-xs ${tbcBonusEntry.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                          {tbcBonusEntry.opponent} ({tbcBonusEntry.isHome ? 'H' : 'A'})
                                        </span>
                                        <span className="font-medium text-xs">{tbcBonusVal.toFixed(1)}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })()}
                          <td className={`px-1 md:px-3 py-2 md:py-4 text-center w-[65px] min-w-[65px] border-l border-gray-300 sticky right-0 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-blue-50'}`}>
                            {(() => {
                              const tbcBonusVal2 = showTBCColumn ? (projection.bonusPoints?.['gw39'] || 0) : 0;
                              return hasAnyAdjustment ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-sm md:text-lg font-bold text-purple-700">{(adjustedTotal + tbcBonusVal2).toFixed(1)}</span>
                                  <span className="text-gray-400 line-through text-[10px] md:text-xs">{(originalTotal + tbcBonusVal2).toFixed(1)}</span>
                                </div>
                              ) : (
                                <span className="text-sm md:text-lg font-bold text-blue-900">{(adjustedTotal + tbcBonusVal2).toFixed(1)}</span>
                              );
                            })()}
                          </td>
                          <td className={`px-1 md:px-3 py-2 md:py-4 text-center w-[52px] min-w-[52px] hidden md:table-cell ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-green-50'}`}>
                            {hasAnyAdjustment ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-purple-700">{adjustedAverage.toFixed(1)}</span>
                                <span className="text-gray-400 line-through text-xs">{originalAverage.toFixed(1)}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-green-900">{adjustedAverage.toFixed(1)}</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredAndSortedData.length === 0 && bonusPointsProjections && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">No players found</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Search, ArrowUpDown, Users, Loader2, X, Filter, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown, isSeasonEnded, computeNextRange } from "@shared/gameweek-utils";
import { SeasonEndedNotice } from "@/components/season-ended-notice";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { useFitColumns } from "@/hooks/use-fit-columns";
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
import { SeasonBadge } from "@/components/season-badge";
import { ProjectionDisclaimer } from "@/components/projection-disclaimer";
import { getDefaultFiltersOpen } from "@/lib/utils";
import { getHeatmapColor, HEATMAP_TIERS } from "@/lib/heatmap-colors";
import { IconTile, Pill, SectionCard, SegmentedControl } from "@/components/tool-ui";

// Filter chips in the shared tool look: indigo when on, muted grey when off.
const CHIP = "chip-toggle inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold leading-none cursor-pointer transition-colors";
const CHIP_ON = "bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:text-indigo-300";
const CHIP_OFF = "bg-gray-500/10 text-gray-400 border-gray-300/60";
const CHIP_ACTION = "bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:text-emerald-300";
const CHIP_AMBER = "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300";

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

const getBonusColor = (bonus: number) => getHeatmapColor(bonus, [0.8, 1.15, 1.5, 2.0]);

export default function PlayerBonusPoints() {
  const { defaultWeeks, totalWeeks } = useProjectionSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("totalBonusPoints");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [selectedGameweeks, setSelectedGameweeks] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  // Filter section collapse state - expanded on desktop, collapsed on mobile
  const [isFiltersOpen, setIsFiltersOpen] = useState(getDefaultFiltersOpen); // open on desktop, collapsed on mobile
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

  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3;
    const currentEvent = bootstrapData.events.find((e: any) => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  // True once the current gameweek has at least one fixture that's still to kick off — that's
  // when it's worth folding into the default range, same convention as the other Player
  // Projection pages.
  const currentGWHasUnstarted = useMemo(() => {
    if (!Array.isArray(fixturesData) || currentGameweek <= 0) return false;
    return (fixturesData as any[]).some(f => f.event === currentGameweek && !f.started);
  }, [fixturesData, currentGameweek]);

  // Team SHORT codes (player-bonus-points-projections' teamName field is already the short code)
  // whose own fixture in the current gameweek has kicked off or finished — their current-GW
  // projection is a stale pre-match estimate and gets blanked client-side.
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

  // Get available gameweeks for dropdown (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    const gws = getNextGameweeksForDropdown(bootstrapData.events, totalWeeks);
    if (currentGWHasUnstarted && currentGameweek > 0 && !gws.includes(currentGameweek)) gws.unshift(currentGameweek);
    if (fixtureMode === 'base' && tbcTeamInfoMap.size > 0 && !gws.includes(39)) gws.push(39);
    return gws;
  }, [bootstrapData?.events, fixtureMode, tbcTeamInfoMap, currentGWHasUnstarted, currentGameweek]);

  // Full-range fetch window for the backend query — folds the current gameweek in the same way
  // as the dropdown, since the endpoint's own "default" (no explicit params) bucket always
  // starts at currentGameweek + 1 regardless of whether that gameweek has actually started.
  const fetchRange = useMemo(() => {
    if (!bootstrapData?.events) return { start: 0, end: 0 };
    const range = computeNextRange(bootstrapData.events, totalWeeks);
    const start = (currentGWHasUnstarted && currentGameweek > 0 && currentGameweek < range.start) ? currentGameweek : range.start;
    return { start, end: range.end };
  }, [bootstrapData?.events, totalWeeks, currentGWHasUnstarted, currentGameweek]);

  // Initialize gameweek range once bootstrap data is loaded. Marks the page ready regardless of
  // whether the future range is valid (it isn't, between seasons). Waits on fixturesData too —
  // otherwise, on a cold cache, this can fire before fixturesData resolves, lock in
  // currentGWHasUnstarted=false (its default while fixtures are still loading), and never
  // reconsider once `initialized` gates it off.
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
  }, [bootstrapData, fixturesData, initialized, currentGWHasUnstarted, currentGameweek]);

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

  // Simplified API call for bonus points projections (now projects future gameweeks only).
  // Explicit params fold the current gameweek in when it hasn't started (the endpoint's own
  // "default" bucket, used when no params are passed, always starts at currentGameweek + 1).
  const { data: bonusPointsProjections, isLoading: isLoadingProjections } = useQuery<BonusPointsProjection[]>({
    queryKey: ["/api/player-bonus-points-projections", fetchRange.start, fetchRange.end],
    queryFn: async () => {
      const response = await fetch(`/api/player-bonus-points-projections?startGameweek=${fetchRange.start}&endGameweek=${fetchRange.end}`);
      if (!response.ok) throw new Error("Failed to fetch player bonus points projections");
      return response.json();
    },
    enabled: fetchRange.start > 0 && fetchRange.end > 0,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes for live data
  });

  // TBC assignments from localStorage
  const tbcAssignments = useMemo<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  }, [fixtureMode]);

  // A decided team's current-GW projection is a stale pre-match estimate — strip the key
  // entirely so it renders blank ("-") and is excluded from the total/average, same convention
  // as the other Player Projection pages.
  const blankedBonusData = useMemo<BonusPointsProjection[]>(() => {
    if (!bonusPointsProjections || !Array.isArray(bonusPointsProjections)) return [];
    if (currentGameweek <= 0 || currentGWDecidedTeamShorts.size === 0) return bonusPointsProjections;
    const gwKey = `gw${currentGameweek}`;
    return bonusPointsProjections.map(p => {
      if (!currentGWDecidedTeamShorts.has(p.teamName) || !(gwKey in (p.bonusPoints || {}))) return p;
      const { [gwKey]: _omitBonus, ...restBonus } = p.bonusPoints || {};
      const { [gwKey]: _omitPoints, ...restPoints } = p.pointsFromBonus || {};
      return { ...p, bonusPoints: restBonus, pointsFromBonus: restPoints };
    });
  }, [bonusPointsProjections, currentGameweek, currentGWDecidedTeamShorts]);

  // resolvedBonusData: absorbs GW39 real data into assigned GW for expert/custom modes
  const resolvedBonusData = useMemo<BonusPointsProjection[]>(() => {
    if (!blankedBonusData || !Array.isArray(blankedBonusData)) return [];
    if (tbcTeamInfoMap.size === 0 || fixtureMode === 'base') return blankedBonusData;
    const startGW = startGameweek ?? 0;
    const endGW = endGameweek ?? 39;
    return blankedBonusData.map((p: BonusPointsProjection) => {
      const tbcInfo = tbcTeamInfoMap.get(p.teamName);
      if (!tbcInfo) return p;
      const gw39Bonus = p.bonusPoints?.['gw39'] || 0;
      if (!gw39Bonus) return p;
      let assignedGW: number | null = null;
      if (fixtureMode === 'expert') {
        assignedGW = tbcInfo.fixtureId === 307 ? 36 : 37;
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
  }, [blankedBonusData, tbcTeamInfoMap, fixtureMode, tbcAssignments, startGameweek, endGameweek]);

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

  // Clear all gameweek selections (show all)
  const clearGameweekSelections = () => {
    setSelectedGameweeks(new Set());
  };

  // Whether the floating GW39 (TBC) column should be visible
  const showTBCColumn = useMemo(() => (
    endGameweek >= 39 && (selectedGameweeks.size === 0 || selectedGameweeks.has(39)) &&
    fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0
  ), [endGameweek, selectedGameweeks, fixtureMode, tbcTeamInfoMap]);

  // Generate dynamic gameweek columns based on selected range (capped at GW38)
  const dynamicGameweekColumns = useMemo(() => {
    const cappedEnd = Math.min(endGameweek, 38);
    const columns = [];
    for (let gw = startGameweek; gw <= cappedEnd; gw++) {
      if (selectedGameweeks.size === 0 || selectedGameweeks.has(gw)) {
        columns.push(gw);
      }
    }
    return columns;
  }, [startGameweek, endGameweek, selectedGameweeks]);

  // On mobile, size gameweek/Total columns so a whole number always fits the visible width at
  // rest — never a sliver of the next column.
  const { containerRef: gwTableContainerRef, columnWidth, isScrollable: gwTableScrollable } = useFitColumns({
    count: dynamicGameweekColumns.length + 1,
    minWidth: 52,
    fixedLeftWidth: 130,
  });

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
      
      // Position filter - include semantics: non-empty set = show only those positions
      if (selectedPositions.size > 0) {
        const normalizedPos = normalizePosition(projection.position);
        const included = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
        if (!included) return false;
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

  if (bootstrapData && isSeasonEnded(bootstrapData.events)) {
    return (
      <div className="fpl-page-container">
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
        <SeasonEndedNotice />
      </div>
    );
  }

  // Show loading state while data is loading OR while initializing gameweeks OR when data is empty
  if (isLoadingBootstrap || isLoadingProjections || !initialized || !bonusPointsProjections || bonusPointsProjections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
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
            <h1>Player Bonus Points</h1><SeasonBadge />
          </div>
          <p className="fpl-page-subtitle">
            Bonus Point System (BPS) projections and additional FPL rewards for top performers
          </p>
          <ProjectionDisclaimer />
        </div>
      </div>

      {tbcTeamInfoMap.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SegmentedControl
            ariaLabel="Fixture mode"
            value={fixtureMode}
            onChange={(v) => setFixtureMode(v)}
            options={[
              { value: "base" as const, label: "Base Fixtures" },
              ...(Object.keys(tbcAssignments).length > 0 ? [{ value: "custom" as const, label: "My Fixtures" }] : []),
              { value: "expert" as const, label: "Expert Fixtures" },
            ]}
          />
          <a href="/fixtures" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300 flex-shrink-0">⚙ Edit fixtures</a>
        </div>
      )}

      <div className="fpl-section-spacing">
        {/* Gameweek range + search — always visible, not buried behind the collapsible */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-500/[0.06] via-white to-violet-500/[0.04] p-4 shadow-sm dark:via-transparent sm:p-5">
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">From</label>
                <Select value={String(startGameweek)} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>{gw === 39 ? 'GW39 (TBC)' : `GW${gw}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">To</label>
                <Select value={String(endGameweek)} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>{gw === 39 ? 'GW39 (TBC)' : `GW${gw}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <Search className="h-3.5 w-3.5 text-indigo-500" />
                  Search
                </label>
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/[0.06] via-violet-500/[0.03] to-transparent px-4 py-3 transition-colors hover:bg-gray-50 sm:px-5">
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
          </CollapsibleTrigger>
          <CollapsibleContent>
          <div className="border-t border-gray-100 p-4 sm:p-5">
            <div className="w-full space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Gameweeks{selectedGameweeks.size > 0 && ` (${selectedGameweeks.size})`}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => setApplyAvailability(!applyAvailability)}
                      className={`${CHIP} gap-1 ${applyAvailability ? CHIP_ON : CHIP_OFF}`}
                    >
                      Avail: {applyAvailability ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={clearGameweekSelections} className={`${CHIP} ${CHIP_ACTION}`} data-testid="button-clear-gw-selections">All</button>
                    <button onClick={() => setSelectedGameweeks(prev => new Set(Array.from({ length: Math.min(endGameweek, 38) - startGameweek + 1 }, (_, i) => startGameweek + i).filter(gw => !prev.has(gw))))} className={`${CHIP} ${CHIP_AMBER}`} data-testid="button-invert-gameweeks">Invert</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {Array.from({ length: Math.min(endGameweek, 38) - startGameweek + 1 }, (_, i) => {
                    const gw = startGameweek + i;
                    const isActive = selectedGameweeks.size === 0 || selectedGameweeks.has(gw);
                    return (
                      <button key={gw} onClick={() => toggleGameweekSelection(gw)}
                        className={`${CHIP} ${isActive ? CHIP_ON : CHIP_OFF}`}
                      >GW{gw}</button>
                    );
                  })}
                  {fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0 && endGameweek >= 39 && (
                    <button onClick={() => toggleGameweekSelection(39)}
                      className={`${CHIP} ${selectedGameweeks.size === 0 || selectedGameweeks.has(39) ? CHIP_AMBER : CHIP_OFF}`}
                    >GW39 (TBC)</button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Position{selectedPositions.size > 0 && ` (${selectedPositions.size})`}
                  </span>
                  <button onClick={() => setSelectedPositions(new Set())} className={`${CHIP} ${CHIP_ACTION}`}>All</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {['GKP','DEF','MID','FWD'].map(pos => {
                    const isActive = selectedPositions.size === 0 || selectedPositions.has(pos);
                    return (
                      <button key={pos} onClick={() => togglePositionSelection(pos)}
                        className={`${CHIP} ${isActive ? CHIP_ON : CHIP_OFF}`}
                      >{pos}</button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                  </span>
                  <button onClick={() => setSelectedTeams(new Set())} className={`${CHIP} ${CHIP_ACTION}`}>All</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {teams.map(team => {
                    const isActive = selectedTeams.size === 0 || selectedTeams.has(team);
                    return (
                      <button key={team} onClick={() => toggleTeamSelection(team)}
                        className={`${CHIP} ${isActive ? CHIP_ON : CHIP_OFF}`}
                      >{team}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
              <Users className="h-4 w-4" />
              <span>{filteredAndSortedData.length} players</span>
            </div>
          </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Results */}
        {filteredAndSortedData.length > 0 && (
          <SectionCard
            icon={Star}
            title="Bonus Points Projections"
            subtitle={selectedGameweeks.size > 0 ? <Pill tone="indigo">{selectedGameweeks.size} GW{selectedGameweeks.size === 1 ? '' : 's'} selected</Pill> : undefined}
            bodyClassName="p-0"
          >
            <div>
              <div className="overflow-hidden">
                <div className="relative">
                <div ref={gwTableContainerRef} className="overflow-x-auto snap-x snap-mandatory scroll-smooth">
                  <table className="w-full [&_th]:snap-start [&_td]:snap-start">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
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
                          <th
                            key={`gw${gw}`}
                            className={`text-center py-2 px-1 text-xs md:text-sm font-semibold text-gray-700 ${!columnWidth ? 'w-[52px] min-w-[52px]' : ''}`}
                            style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                          >
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
                        <th
                          className={`text-center py-2 px-1 text-xs md:text-sm font-bold bg-indigo-100 border-l border-indigo-200 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${!columnWidth ? 'w-[65px] min-w-[65px]' : ''}`}
                          style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                        >
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
                        // Only counts gameweeks with a real (present) entry — a blanked
                        // current-GW cell isn't in projection.bonusPoints at all, so it's
                        // correctly excluded from the average's denominator.
                        let countedWeeks = 0;
                        dynamicGameweekColumns.forEach(gw => {
                          const gwKey = `gw${gw}`;
                          if (!(gwKey in (projection.bonusPoints || {}))) return;
                          const val = projection.bonusPoints?.[gwKey] || 0;
                          const mult = gwMultipliers[gw] ?? 1;
                          adjustedTotal += val * mult;
                          originalTotal += val;
                          countedWeeks += 1;
                        });
                        const adjustedAverage = countedWeeks > 0 ? adjustedTotal / countedWeeks : 0;
                        const originalAverage = countedWeeks > 0 ? originalTotal / countedWeeks : 0;
                        
                        return (
                        <tr key={projection.playerId} className={`border-b border-gray-100 hover:bg-indigo-50/50 ${index < 10 ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-2 px-1 md:px-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                            <PlayerNameCell
                              name={(playerIdToWebName && playerIdToWebName.get(projection.playerId)) || projection.playerName}
                              position={projection.position}
                              team={projection.teamName}
                              compact={true}
                              className="text-xs md:text-sm"
                              playerId={projection.playerId}
                              availabilityBadge={playerAvailabilityMap && playerAvailabilityMap.get(projection.playerId) && (
                                <PlayerAvailabilityBadge player={playerAvailabilityMap.get(projection.playerId)!} compact />
                              )}
                            />
                          </td>
                          {dynamicGameweekColumns.map((gw) => {
                            const hasProjection = `gw${gw}` in (projection.bonusPoints || {});
                            const rawValue = projection.bonusPoints?.[`gw${gw}`] || 0;
                            const multiplier = gwMultipliers[gw] ?? 1;
                            const displayValue = rawValue * multiplier;
                            const hasGwAdjustment = applyAvailability && multiplier !== 1;
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            return (
                              <td
                                key={`bonus-cell-${projection.playerId}-gw${gw}`}
                                className={`px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium ${hasProjection ? getBonusColor(displayValue) : HEATMAP_TIERS[2]} ${!columnWidth ? 'w-[52px] min-w-[52px]' : ''}`}
                                style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                              >
                                {isDGW ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium">
                                        {hasGwAdjustment && rawValue ? (
                                          <span className="text-indigo-700">{displayValue.toFixed(1)}</span>
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
                                    <span className="text-indigo-700 font-medium">{displayValue.toFixed(1)}</span>
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
                          <td
                            className={`px-1 md:px-3 py-2 md:py-4 text-center border-l border-gray-300 md:static z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${hasAnyAdjustment ? 'bg-indigo-50' : getBonusColor(adjustedAverage)} ${!columnWidth ? 'w-[65px] min-w-[65px]' : ''}`}
                            style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : undefined}
                          >
                            {(() => {
                              const tbcBonusVal2 = showTBCColumn ? (projection.bonusPoints?.['gw39'] || 0) : 0;
                              return hasAnyAdjustment ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-sm md:text-lg font-bold text-indigo-700">{(adjustedTotal + tbcBonusVal2).toFixed(1)}</span>
                                  <span className="text-gray-400 line-through text-[10px] md:text-xs">{(originalTotal + tbcBonusVal2).toFixed(1)}</span>
                                </div>
                              ) : (
                                <span className="text-sm md:text-lg font-bold">{(adjustedTotal + tbcBonusVal2).toFixed(1)}</span>
                              );
                            })()}
                          </td>
                          <td className={`px-1 md:px-3 py-2 md:py-4 text-center w-[52px] min-w-[52px] hidden md:table-cell ${hasAnyAdjustment ? 'bg-indigo-50' : getBonusColor(adjustedAverage)}`}>
                            {hasAnyAdjustment ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-indigo-700">{adjustedAverage.toFixed(1)}</span>
                                <span className="text-gray-400 line-through text-xs">{originalAverage.toFixed(1)}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium">{adjustedAverage.toFixed(1)}</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
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
            </div>
          </SectionCard>
        )}

        {filteredAndSortedData.length === 0 && bonusPointsProjections && (
          <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-gray-500 shadow-sm">
            <p className="text-lg font-medium">No players found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
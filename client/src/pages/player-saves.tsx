import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, ArrowUpDown, Users, X, Filter, ChevronDown, ChevronUp, History, Calendar } from "lucide-react";
import { LoadingExperience } from "@/components/loading-experience";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerNameCell } from "@/components/enhanced-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  saves: number;
}


interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface SavesProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  saves: { [key: string]: number };
  pointsFromSaves: { [key: string]: number };
  totalSaves: number;
  totalPoints: number;
  averagePerGameweek: number;
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
}

interface PlayerSavesHistory {
  lastFinishedGW: number;
  players: {
    playerId: number;
    playerName: string;
    teamName: string;
    teamShort: string;
    position: string;
    gameweekSaves: { [key: number]: number };
    totalSaves: number;
  }[];
}

type SortField = 'name' | 'team' | 'totalSaves' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerSaves() {
  const { defaultWeeks } = useProjectionSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("totalSaves");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [selectedGameweeks, setSelectedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  // Filter section collapse state - expanded on desktop, collapsed on mobile
  const [isFiltersOpen, setIsFiltersOpen] = useState(() => window.innerWidth >= 768);
  // View mode: "future" for projections, "past" for historical data
  const [viewMode, setViewMode] = useState<"future" | "past">("future");
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');
  const [tbcAssignments, setTbcAssignments] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  });

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch past player saves history
  const { data: historyData, isLoading: historyLoading } = useQuery<PlayerSavesHistory>({
    queryKey: ["/api/player-saves-history"],
    enabled: viewMode === "past",
  });

  // TBC team info map: teamShort → { opponent, isHome, fixtureId } built from fixtures with event=null
  const tbcTeamInfoMap = useMemo(() => {
    const map = new Map<string, { opponent: string; isHome: boolean; fixtureId: number }>();
    if (!Array.isArray(fixturesData) || !bootstrapData?.teams || viewMode !== "future") return map;
    (fixturesData as any[]).filter(f => f.event === null || f.event === undefined).forEach(f => {
      const homeTeam = (bootstrapData.teams as any[]).find((t: any) => t.id === f.team_h);
      const awayTeam = (bootstrapData.teams as any[]).find((t: any) => t.id === f.team_a);
      if (homeTeam) map.set(homeTeam.short_name, { opponent: awayTeam?.short_name || '?', isHome: true, fixtureId: f.id });
      if (awayTeam) map.set(awayTeam.short_name, { opponent: homeTeam?.short_name || '?', isHome: false, fixtureId: f.id });
    });
    return map;
  }, [fixturesData, bootstrapData, viewMode]);

  // Get available gameweeks for dropdown based on view mode
  const availableGameweeks = useMemo(() => {
    if (viewMode === "past") {
      const lastFinished = historyData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    if (!bootstrapData?.events) {
      return [];
    }
    const gws = getNextGameweeksForDropdown(bootstrapData.events, 12);
    if (fixtureMode === 'base' && tbcTeamInfoMap.size > 0 && !gws.includes(39)) gws.push(39);
    return gws;
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, fixtureMode, tbcTeamInfoMap]);

  // Create teamName to short_name mapping
  const teamNameToShort = useMemo(() => {
    if (!bootstrapData?.teams) return new Map<string, string>();
    const map = new Map<string, string>();
    bootstrapData.teams.forEach((team: any) => {
      map.set(team.name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

  // Create a mapping of teamShort + gameweek -> opponent info
  const opponentMap = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Map<string, { opponent: string; opponentId: number; isHome: boolean }[]>();
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }[]>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        const homeKey = `${homeTeam.short_name}-${fixture.event}`;
        const awayKey = `${awayTeam.short_name}-${fixture.event}`;
        if (!map.has(homeKey)) map.set(homeKey, []);
        map.get(homeKey)!.push({ opponent: awayTeam.short_name, opponentId: fixture.team_a, isHome: true });
        if (!map.has(awayKey)) map.set(awayKey, []);
        map.get(awayKey)!.push({ opponent: homeTeam.short_name, opponentId: fixture.team_h, isHome: false });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

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

  // Reset gameweek range when viewMode changes
  useEffect(() => {
    if (viewMode === "past" && historyData?.lastFinishedGW) {
      const lastFinished = historyData.lastFinishedGW;
      const startGW = 1;
      setStartGameweek(startGW);
      setEndGameweek(lastFinished);
      setSelectedGameweeks(new Set());
    } else if (viewMode === "future" && bootstrapData?.events) {
      const newRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setStartGameweek(parseInt(newRange.startGameweek));
      setEndGameweek(parseInt(newRange.endGameweek));
      setSelectedGameweeks(new Set());
    }
  }, [viewMode, historyData?.lastFinishedGW, bootstrapData?.events]);

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

  // Sync tbcAssignments from localStorage when window regains focus
  useEffect(() => {
    const onFocus = () => {
      try {
        const key = fixtureMode === 'expert' ? 'fpl-tbc-expert-assignments' : 'fpl-tbc-assignments';
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        setTbcAssignments(stored);
      } catch {}
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fixtureMode]);

  useEffect(() => {
    try {
      const key = fixtureMode === 'expert' ? 'fpl-tbc-expert-assignments' : 'fpl-tbc-assignments';
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      setTbcAssignments(stored);
    } catch {}
  }, [fixtureMode]);

  // API call for saves projections - use cached endpoint for 10-20x faster loading
  const { data: allSavesProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: ["/api/cached/player-saves-projections"],
    enabled: initialized && viewMode === "future",
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Filter cached data to selected gameweek range (client-side filtering is instant)
  const savesProjections = useMemo(() => {
    if (!allSavesProjections || !Array.isArray(allSavesProjections)) return null;
    
    // Filter each player's saves to only include selected range (excluding excluded gameweeks)
    return allSavesProjections.map((player: any) => {
      const filteredSaves: Record<string, number> = {};
      const filteredPoints: Record<string, number> = {};
      const originalSaves = player.saves || {};
      const originalPoints = player.pointsFromSaves || {};
      
      // Calculate total for selected range (only active gameweeks)
      let totalSaves = 0;
      let totalPoints = 0;
      let activeCount = 0;
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        const gwKey = `gw${gw}`;
        const saves = originalSaves[gwKey] || 0;
        const points = originalPoints[gwKey] || 0;
        filteredSaves[gwKey] = saves;
        filteredPoints[gwKey] = points;
        // Only sum selected gameweeks (empty set = all)
        if (selectedGameweeks.size === 0 || selectedGameweeks.has(gw)) {
          totalSaves += saves;
          totalPoints += points;
          activeCount++;
        }
      }
      
      return {
        ...player,
        saves: filteredSaves,
        pointsFromSaves: filteredPoints,
        totalSaves,
        totalPoints,
        averagePerGameweek: activeCount > 0 ? totalSaves / activeCount : 0
      };
    });
  }, [allSavesProjections, startGameweek, endGameweek, selectedGameweeks]);

  // Unified display data - transforms history data to match projection format
  const displayData = useMemo(() => {
    if (viewMode === "past" && historyData?.players) {
      return historyData.players.map(player => {
        const saves: Record<string, number> = {};
        let totalSaves = 0;
        let activeCount = 0;
        
        for (let gw = startGameweek; gw <= endGameweek; gw++) {
          const gwSaves = player.gameweekSaves[gw] || 0;
          saves[`gw${gw}`] = gwSaves;
          if (selectedGameweeks.size === 0 || selectedGameweeks.has(gw)) {
            totalSaves += gwSaves;
            activeCount++;
          }
        }
        
        return {
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: player.teamName,
          position: player.position,
          saves,
          pointsFromSaves: {},
          totalSaves,
          totalPoints: 0,
          averagePerGameweek: activeCount > 0 ? totalSaves / activeCount : 0
        } as SavesProjection;
      });
    }
    return savesProjections || [];
  }, [viewMode, historyData, savesProjections, startGameweek, endGameweek, selectedGameweeks]);

  // Absorb GW39 real saves data into the assigned GW's saves when fixtureMode is custom/expert
  const resolvedDisplayData = useMemo(() => {
    if (viewMode !== "future" || fixtureMode === 'base' || tbcTeamInfoMap.size === 0) return displayData;
    const startGW = startGameweek ?? 0;
    const endGW = endGameweek ?? 39;
    return (displayData as SavesProjection[]).map(player => {
      const teamShort = teamNameToShort.get(player.teamName) || '';
      const tbcInfo = tbcTeamInfoMap.get(teamShort);
      if (!tbcInfo) return player;
      const gw39Saves = player.saves?.['gw39'] || 0;
      if (!gw39Saves) return player;
      let assignedGW: number | null = null;
      if (fixtureMode === 'expert') {
        assignedGW = tbcInfo.fixtureId === 307 ? 36 : 37;
      } else {
        const raw = tbcAssignments[tbcInfo.fixtureId] ?? null;
        if (raw !== null && raw >= startGW && raw <= endGW) assignedGW = raw;
      }
      if (assignedGW === null) return player;
      const key = `gw${assignedGW}`;
      const existingSaves = player.saves?.[key] || 0;
      const newSaves = { ...player.saves, [key]: existingSaves + gw39Saves, 'gw39': 0 };
      const existingDetails: FixtureDetail[] = (player as any).fixtureDetails?.[assignedGW.toString()] || [];
      const newDetails = [...existingDetails, { opponent: tbcInfo.opponent, isHome: tbcInfo.isHome, saves: gw39Saves }];
      const newFixtureDetails = { ...((player as any).fixtureDetails || {}), [assignedGW.toString()]: newDetails };
      return { ...player, saves: newSaves, fixtureDetails: newFixtureDetails };
    });
  }, [viewMode, fixtureMode, displayData, tbcTeamInfoMap, tbcAssignments, startGameweek, endGameweek, teamNameToShort]);

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
    if (!displayData || !Array.isArray(displayData)) return [];
    const uniqueTeams = Array.from(new Set(displayData.map((p: SavesProjection) => p.teamName)));
    return uniqueTeams.sort();
  }, [displayData]);

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
    viewMode === 'future' && fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0
  ), [endGameweek, selectedGameweeks, viewMode, fixtureMode, tbcTeamInfoMap]);

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

  // Calculate dynamic totals based on selected gameweek range (using filtered columns)
  const getFilteredTotal = (player: SavesProjection, useAvailability: boolean = false) => {
    let total = 0;
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const availabilityFactor = useAvailability && playerInfo 
      ? (playerInfo.chanceOfPlayingNextRound ?? 100) / 100 
      : 1;
    for (const gw of dynamicGameweekColumns) {
      total += (player.saves?.[`gw${gw}`] || 0) * availabilityFactor;
    }
    return total;
  };

  const getUnabsorbedTBCSavesForPlayer = (player: SavesProjection) => {
    if (viewMode !== "future") return 0;
    return player.saves?.['gw39'] || 0;
  };

  // Helper to get adjusted total for sorting
  const getAdjustedTotalForSort = (player: SavesProjection) => {
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const gwMultipliers = applyAvailability 
      ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
      : {};
    let total = 0;
    dynamicGameweekColumns.forEach(gw => {
      const val = player.saves?.[`gw${gw}`] || 0;
      const mult = gwMultipliers[gw] ?? 1;
      total += val * mult;
    });
    return total;
  };

  const filteredAndSortedData = useMemo(() => {
    if (!resolvedDisplayData || !Array.isArray(resolvedDisplayData)) return [];
    
    let filtered = resolvedDisplayData.filter((projection: SavesProjection) => {
      const matchesSearch = !searchTerm || 
        projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (selectedTeams.size > 0 && !selectedTeams.has(projection.teamName)) return false;
      
      return matchesSearch;
    });

    // Sort data
    filtered.sort((a: SavesProjection, b: SavesProjection) => {
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
        case 'totalSaves': {
          aValue = getAdjustedTotalForSort(a) + (showTBCColumn ? getUnabsorbedTBCSavesForPlayer(a) : 0);
          bValue = getAdjustedTotalForSort(b) + (showTBCColumn ? getUnabsorbedTBCSavesForPlayer(b) : 0);
          break;
        }
        default:
          // Handle dynamic gameweek fields (like 'gw4', 'gw5', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = parseInt(sortField.replace('gw', ''));
            const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
            const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
            const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
            aValue = (a.saves?.[`gw${gwNumber}`] || 0) * (aMultipliers[gwNumber] ?? 1);
            bValue = (b.saves?.[`gw${gwNumber}`] || 0) * (bMultipliers[gwNumber] ?? 1);
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
  }, [resolvedDisplayData, searchTerm, selectedTeams, sortField, sortDirection, startGameweek, endGameweek, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData, dynamicGameweekColumns, viewMode, teamNameToShort, showTBCColumn]);

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

  // Check if data is loading based on view mode
  const isDataLoading = isLoadingBootstrap || !initialized || 
    (viewMode === "future" && (isLoadingProjections || !displayData || displayData.length === 0)) ||
    (viewMode === "past" && historyLoading);

  // Show loading state while data is loading
  if (isDataLoading) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Shield className="h-8 w-8" />
              <h1>{viewMode === "future" ? "Goalkeeper Saves Projections" : "Goalkeeper Saves History"}</h1>
            </div>
            <p className="fpl-page-subtitle">
              {viewMode === "future"
                ? "Goalkeeper save predictions and FPL points analysis for upcoming gameweeks"
                : "Actual goalkeeper saves from past gameweeks"}
            </p>
          </div>
        </div>
        {viewMode === "future" ? (
          <LoadingExperience
            variant="analysis"
            title="Loading Saves Projections"
            description="Fetching goalkeeper data and calculating projected saves for all upcoming gameweeks..."
            steps={[
              { text: "Fetching goalkeeper stats and opponent data", delay: "0s" },
              { text: "Calculating saves using AGR formula", delay: "0.3s" },
              { text: "Applying availability adjustments", delay: "0.6s" },
            ]}
          />
        ) : (
          <LoadingExperience
            variant="table"
            title="Loading Historical Saves"
            description="Retrieving goalkeeper save data from completed gameweeks..."
            steps={[
              { text: "Connecting to data source", delay: "0s" },
              { text: "Loading historical records", delay: "0.3s" },
              { text: "Formatting display", delay: "0.6s" },
            ]}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Shield className="h-8 w-8" />
            <h1>Goalkeeper Saves</h1>
          </div>
          <p className="fpl-page-subtitle">
            Save predictions and FPL points analysis across upcoming and past gameweeks
          </p>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "future" | "past")} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="future" className="flex items-center gap-1.5 flex-1">
            <Calendar className="h-4 w-4" />
            Saves Projections
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-1.5 flex-1">
            <History className="h-4 w-4" />
            Saves History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="fpl-section-spacing">
        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="fpl-card mb-6">
          <CollapsibleTrigger asChild>
            <div className="fpl-card-header cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <h2 className="fpl-card-title">Filters & Controls</h2>
              </div>
              <div className="flex items-center gap-2">
                {isFiltersOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
          <div className="p-3 sm:p-4">
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
                  placeholder="Search goalkeepers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-search"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 justify-center sm:justify-end">
                <Users className="h-4 w-4" />
                <span>{filteredAndSortedData.length} goalkeepers</span>
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
                      onClick={() => { setStartGameweek(start); setEndGameweek(last); }}
                      className="text-xs px-2.5 py-0.5 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer font-medium"
                    >
                      Last {n} GWs
                    </button>
                  );
                })}
                <button
                  onClick={() => { const last = historyData?.lastFinishedGW || 24; setStartGameweek(1); setEndGameweek(last); }}
                  className="text-xs px-2.5 py-0.5 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer font-medium"
                >
                  All GWs
                </button>
              </div>
            )}

            <Tabs defaultValue="gws" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Gameweeks</span><span className="sm:hidden">GWs</span>{selectedGameweeks.size > 0 && ` (${selectedGameweeks.size})`}
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
                  <button onClick={clearGameweekSelections} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300" data-testid="button-clear-gw-selections">All</button>
                  <button onClick={() => setSelectedGameweeks(prev => new Set(Array.from({ length: Math.min(endGameweek, 38) - startGameweek + 1 }, (_, i) => startGameweek + i).filter(gw => !prev.has(gw))))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-orange-50 text-orange-700 border-orange-300" data-testid="button-invert-gameweeks">Invert</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {Array.from({ length: Math.min(endGameweek, 38) - startGameweek + 1 }, (_, i) => {
                    const gw = startGameweek + i;
                    const isActive = selectedGameweeks.size === 0 || selectedGameweeks.has(gw);
                    return (
                      <button key={gw} onClick={() => toggleGameweekSelection(gw)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                      >GW{gw}</button>
                    );
                  })}
                  {viewMode === 'future' && fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0 && endGameweek >= 39 && (
                    <button onClick={() => toggleGameweekSelection(39)}
                      className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedGameweeks.size === 0 || selectedGameweeks.has(39) ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                    >GW39 (TBC)</button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="teams" className="mt-0">
                <div className="flex justify-end gap-1 mb-1">
                  <button onClick={() => setSelectedTeams(new Set())} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">All</button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {teams.map(team => {
                    const isActive = selectedTeams.size === 0 || selectedTeams.has(team);
                    const shortName = teamNameToShort?.get(team) || team;
                    return (
                      <button key={team} onClick={() => toggleTeamSelection(team)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                      >{shortName}</button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
              <Users className="h-4 w-4" />
              <span>{filteredAndSortedData.length} goalkeepers</span>
            </div>
          </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Fixture Mode Toggle — only when TBC fixtures exist and in future mode */}
        {viewMode === "future" && tbcTeamInfoMap.size > 0 && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-lg border bg-gray-100 p-0.5 gap-0">
              <button
                onClick={() => setFixtureMode('base')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${fixtureMode === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >Base Fixtures</button>
              {Object.keys(tbcAssignments).length > 0 && <button
                onClick={() => setFixtureMode('custom')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${fixtureMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >My Fixtures</button>}
              <button
                onClick={() => setFixtureMode('expert')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${fixtureMode === 'expert' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-gray-500 hover:text-gray-800'}`}
              >Expert Fixtures</button>
            </div>
            <a href="/fixtures" className="ml-2 self-center text-xs text-blue-600 hover:underline flex-shrink-0">⚙ Edit fixtures</a>
          </div>
        )}

        {/* Results */}
        {filteredAndSortedData.length > 0 && (
          <div className="fpl-card">
            <div className="fpl-card-header">
              <h2 className="fpl-card-title flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                {viewMode === "future" ? "Expected Saves" : "Actual Saves"}: GW{startGameweek}-GW{endGameweek}
                {selectedGameweeks.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedGameweeks.size} GW{selectedGameweeks.size === 1 ? '' : 's'} selected
                  </Badge>
                )}
              </h2>
              <button
                onClick={() => setShowOpponent(!showOpponent)}
                className={`shrink-0 inline-flex items-center gap-1 rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${showOpponent ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
              >
                <Users className="h-2.5 w-2.5" />{showOpponent ? 'Hide Opp' : 'Show Opp'}
              </button>
            </div>
            <div className="fpl-card-content p-0">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-1 md:px-3 py-2 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs md:text-sm">
                            Player {getSortIcon('name')}
                          </Button>
                        </th>
                        {dynamicGameweekColumns.map((gw) => (
                          <th key={`saves-header-gw${gw}`} className="px-1 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider w-[52px] min-w-[52px]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs md:text-sm">
                              <span className="md:hidden">{gw}</span>
                              <span className="hidden md:inline">GW{gw}</span>
                              {getSortIcon(`gw${gw}`)}
                            </Button>
                          </th>
                        ))}
                        {showTBCColumn && (
                          <th className="px-1 py-2 text-center text-xs md:text-sm font-medium uppercase tracking-wider w-[52px] min-w-[52px] bg-amber-50/60 border-l border-amber-300 text-amber-700">
                            GW39 (TBC)
                          </th>
                        )}
                        <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 bg-blue-50 w-[65px] min-w-[65px] sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('totalSaves')} className="h-auto p-0 font-medium text-gray-500 hover:bg-blue-100 hover:text-gray-700 text-xs md:text-sm">
                            Total {getSortIcon('totalSaves')}
                          </Button>
                        </th>
                        <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider bg-green-50 w-[52px] min-w-[52px] hidden md:table-cell">
                          Avg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData.map((projection: SavesProjection, index) => {
                        const playerInfo = playerAvailabilityMap?.get(projection.playerId);
                        const gwMultipliers = applyAvailability 
                          ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
                          : {};
                        const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                        
                        let adjustedTotal = 0;
                        let originalTotal = 0;
                        dynamicGameweekColumns.forEach(gw => {
                          const val = projection.saves?.[`gw${gw}`] || 0;
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
                            const teamShort = teamNameToShort.get(projection.teamName) || '';
                            const opponentInfo = opponentMap.get(`${teamShort}-${gw}`);
                            const rawValue = projection.saves?.[`gw${gw}`] || 0;
                            const multiplier = gwMultipliers[gw] ?? 1;
                            const displayValue = rawValue * multiplier;
                            const hasGwAdjustment = applyAvailability && multiplier !== 1;
                            const formatValue = (val: number) => viewMode === "past" ? val.toFixed(0) : val.toFixed(1);
                            const fixtures = projection.fixtureDetails?.[gw.toString()] || [];
                            const isDGW = fixtures.length > 1;
                            return (
                              <td key={`saves-cell-${projection.playerId}-gw${gw}`} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium w-[52px] min-w-[52px]">
                                <div className="flex flex-col items-center">
                                  {isDGW && viewMode === "future" ? (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 font-medium">
                                          {hasGwAdjustment && rawValue ? (
                                            <span className="text-purple-700">{formatValue(displayValue)}</span>
                                          ) : (
                                            <span>{rawValue ? formatValue(rawValue) : '-'}</span>
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
                                            <span className="font-medium text-xs">{f.saves.toFixed(1)}</span>
                                          </div>
                                        ))}
                                        <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                          <span>Total</span>
                                          <span>{formatValue(rawValue)}</span>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  ) : hasGwAdjustment && rawValue ? (
                                    <>
                                      <span className="text-purple-700 font-medium">{formatValue(displayValue)}</span>
                                      <span className="text-gray-400 line-through text-xs">{formatValue(rawValue)}</span>
                                    </>
                                  ) : (
                                    <span>{rawValue ? formatValue(rawValue) : '-'}</span>
                                  )}
                                  {showOpponent && (
                                    opponentInfo && opponentInfo.length > 0 ? (
                                      <span className="text-[9px] md:text-[10px] mt-0.5">
                                        {opponentInfo.map((o, i) => (
                                          <span key={i} className={o.isHome ? 'text-green-400' : 'text-blue-400'}>
                                            {i > 0 && ' / '}{o.opponent} ({o.isHome ? 'H' : 'A'})
                                          </span>
                                        ))}
                                      </span>
                                    ) : <span className="text-[9px] md:text-[10px] mt-0.5">&nbsp;</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {showTBCColumn && (() => {
                            const teamShortKey = teamNameToShort.get(projection.teamName) || '';
                            const tbcSavesEntry = tbcTeamInfoMap.get(teamShortKey);
                            const tbcSavesVal = projection.saves?.['gw39'] || 0;
                            return (
                              <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium w-[52px] min-w-[52px] bg-amber-50/60 border-l border-amber-300">
                                {tbcSavesEntry && tbcSavesVal > 0 ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 text-amber-700 font-medium">
                                        {tbcSavesVal.toFixed(1)}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-amber-200 z-50">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-xs font-semibold">GW39 (TBC)</span>
                                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1">FPL Model</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1">
                                        <span className={`text-xs ${tbcSavesEntry.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                          {tbcSavesEntry.opponent} ({tbcSavesEntry.isHome ? 'H' : 'A'})
                                        </span>
                                        <span className="font-medium text-xs">{tbcSavesVal.toFixed(1)}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })()}
                          <td className={`px-1 md:px-3 py-2 md:py-4 text-center w-[65px] min-w-[65px] border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-blue-50'}`}>
                            {(() => {
                              const tbcVal2 = showTBCColumn ? getUnabsorbedTBCSavesForPlayer(projection) : 0;
                              return hasAnyAdjustment ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-sm md:text-lg font-bold text-purple-700">{viewMode === "past" ? (adjustedTotal + tbcVal2).toFixed(0) : (adjustedTotal + tbcVal2).toFixed(1)}</span>
                                  <span className="text-gray-400 line-through text-[10px] md:text-xs">{viewMode === "past" ? (originalTotal + tbcVal2).toFixed(0) : (originalTotal + tbcVal2).toFixed(1)}</span>
                                </div>
                              ) : (
                                <span className="text-sm md:text-lg font-bold text-blue-900">{viewMode === "past" ? (adjustedTotal + tbcVal2).toFixed(0) : (adjustedTotal + tbcVal2).toFixed(1)}</span>
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
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredAndSortedData.length === 0 && (
          <div className="fpl-card">
            <div className="fpl-card-content p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goalkeepers found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
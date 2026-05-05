import { useState, useMemo, useEffect } from "react";

import { computeCurrentGameweek, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
import { BootstrapData } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBatchAssistsProjections } from "@/hooks/use-batch-projections";
import { Zap, TrendingUp, Users, Calendar, Target, Search, Filter, ArrowUpDown, RefreshCw, Loader2, X, ChevronDown, ChevronUp, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlayerAvailabilityBadge, usePlayerAvailabilityMap } from "@/components/player-availability-badge";
import { getGameweekMultipliers } from "@/lib/availability-adjustments";

interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  assists: number;
}


interface PlayerAssistProjection {
  playerId: number;
  playerName: string;
  teamShort?: string;
  position?: string;
  gameweekProjections: { [gameweek: string]: number };
  fixtureDetails?: { [gameweek: string]: FixtureDetail[] };
  totalProjectedAssists: number;
  assistShare: number;
}

interface PlayerAssistsHistory {
  lastFinishedGW: number;
  players: {
    playerId: number;
    playerName: string;
    teamName: string;
    teamShort: string;
    position: string;
    gameweekAssists: { [key: number]: number };
    totalAssists: number;
  }[];
}

interface PlayerXaHistory {
  lastFinishedGW: number;
  startGW: number;
  endGW: number;
  players: {
    id: number;
    name: string;
    teamName: string;
    teamShort: string;
    position: string;
    gameweekXa: { [key: number]: number };
    totalXa: number;
  }[];
}

type SortField = 'name' | 'team' | 'position' | 'totalAssists' | 'rangeTotal' | 'rangePoints' | 'assistShare' | string; // string allows dynamic gameweek fields like 'gw4', 'gw5', etc.
type SortDirection = 'asc' | 'desc';

export default function PlayerAssistProjections() {
  const { defaultWeeks } = useProjectionSettings();
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  
  const queryClient = useQueryClient();
  
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch fixtures for opponent information
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // View mode: "future" for projections, "past" for historical data, "pastXa" for xA history
  const [viewMode, setViewMode] = useState<"future" | "past" | "pastXa">("future");

  // Fetch past player assists history
  const { data: historyData, isLoading: historyLoading } = useQuery<PlayerAssistsHistory>({
    queryKey: ["/api/player-assists-history"],
    enabled: viewMode === "past",
  });

  // All useState hooks (must come before xA query that depends on startGameweek/endGameweek)
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [sortField, setSortField] = useState<SortField>('rangeTotal');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGameweeks, setSelectedGameweeks] = useState<Set<number>>(new Set());
  const [showOpponent, setShowOpponent] = useState(false);
  const [applyAvailability, setApplyAvailability] = useState(true);
  // Filter section collapse state - expanded on desktop, collapsed on mobile
  const [isFiltersOpen, setIsFiltersOpen] = useState(() => window.innerWidth >= 768);
  // Fixture mode toggle for TBC column behaviour
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');

  // Fetch past player xA (expected assists) history (after startGameweek/endGameweek are defined)
  const { data: xaHistoryData, isLoading: xaHistoryLoading } = useQuery<PlayerXaHistory>({
    queryKey: ["/api/player-xa-history", startGameweek, endGameweek],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startGameweek) params.set('startGw', startGameweek.toString());
      if (endGameweek) params.set('endGw', endGameweek.toString());
      const response = await fetch(`/api/player-xa-history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch xA history");
      return response.json();
    },
    enabled: viewMode === "pastXa" && startGameweek > 0 && endGameweek > 0,
  });

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
    if (viewMode === "past" || viewMode === "pastXa") {
      // Past modes: GW1 to last finished gameweek
      const lastFinished = historyData?.lastFinishedGW || xaHistoryData?.lastFinishedGW || 24;
      return Array.from({ length: lastFinished }, (_, i) => i + 1);
    }
    // Future mode: next 12 gameweeks
    if (!bootstrapData?.events) {
      return [];
    }
    const gws = getNextGameweeksForDropdown(bootstrapData.events, 12);
    if (fixtureMode === 'base' && tbcTeamInfoMap.size > 0 && !gws.includes(39)) gws.push(39);
    return gws;
  }, [bootstrapData?.events, viewMode, historyData?.lastFinishedGW, xaHistoryData?.lastFinishedGW, fixtureMode, tbcTeamInfoMap]);

  // Initialize gameweeks when bootstrap data loads
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
    if ((viewMode === "past" || viewMode === "pastXa") && (historyData?.lastFinishedGW || xaHistoryData?.lastFinishedGW)) {
      const lastFinished = historyData?.lastFinishedGW || xaHistoryData?.lastFinishedGW || 24;
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
  }, [viewMode, historyData?.lastFinishedGW, xaHistoryData?.lastFinishedGW, bootstrapData?.events]);

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

  // BATCH OPTIMIZED: Use new batch hook for better performance
  const { 
    data: playerAssistData, 
    isLoading: projectionsLoading, 
    error, 
    usedBatch 
  } = useBatchAssistsProjections(
    initialized ? startGameweek : undefined,
    initialized ? endGameweek : undefined,
    {
      enabled: viewMode === "future",
      staleTime: 5 * 60 * 1000, // 5 minutes
      batchSize: 150, // Process 150 players per batch
      maxConcurrency: 3, // Max 3 concurrent requests
    }
  );

  // Transform history data to match projection format for unified display
  const displayData = useMemo(() => {
    if (viewMode === "past" && historyData?.players) {
      return historyData.players.map(player => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamShort: player.teamShort,
        position: player.position,
        gameweekProjections: Object.fromEntries(
          Object.entries(player.gameweekAssists).map(([gw, assists]) => [gw, assists])
        ),
        totalProjectedAssists: player.totalAssists,
        assistShare: 0, // Not available in history data
      }));
    }
    if (viewMode === "pastXa" && xaHistoryData?.players) {
      return xaHistoryData.players.map(player => ({
        playerId: player.id,
        playerName: player.name,
        teamShort: player.teamShort,
        position: player.position,
        gameweekProjections: Object.fromEntries(
          Object.entries(player.gameweekXa).map(([gw, xa]) => [gw, xa])
        ),
        totalProjectedAssists: player.totalXa,
        assistShare: 0, // Not available in history data
      }));
    }
    return playerAssistData || [];
  }, [viewMode, historyData, xaHistoryData, playerAssistData]);

  // Combined loading state
  const isLoading = (viewMode === "future" && projectionsLoading) || (viewMode === "past" && historyLoading) || (viewMode === "pastXa" && xaHistoryLoading);

  // ALL useMemo hooks
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
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!displayData.length) return [];
    const uniqueTeams = Array.from(new Set(displayData.map(p => p.teamShort).filter((t): t is string => !!t)));
    return uniqueTeams.sort();
  }, [displayData]);

  const positions = useMemo(() => {
    if (!displayData.length) return [];
    const uniquePositions = Array.from(new Set(displayData.map(p => p.position)));
    return uniquePositions.sort();
  }, [displayData]);

  // Create teamNameToShort mapping from bootstrapData
  const teamNameToShort = useMemo(() => {
    if (!bootstrapData?.teams) return null;
    const map = new Map<string, string>();
    bootstrapData.teams.forEach((team: any) => {
      map.set(team.short_name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

  // TBC assignments from localStorage (My Fixtures tab)
  const tbcAssignments = useMemo<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  }, [fixtureMode]);

  // resolvedDisplayData: absorbs GW39 real data into the assigned GW for expert/custom modes
  const resolvedDisplayData = useMemo(() => {
    if (viewMode !== "future" || tbcTeamInfoMap.size === 0 || fixtureMode === 'base') return displayData;
    const startGW = startGameweek ?? 0;
    const endGW = endGameweek ?? 39;
    return displayData.map(player => {
      const tbcInfo = tbcTeamInfoMap.get(player.teamShort || '');
      if (!tbcInfo) return player;
      const gw39Assists = Number(player.gameweekProjections?.['39']) || 0;
      if (!gw39Assists) return player;
      let assignedGW: number | null = null;
      if (fixtureMode === 'expert') {
        assignedGW = tbcInfo.fixtureId === 307 ? 36 : 37;
      } else {
        const raw = tbcAssignments[tbcInfo.fixtureId] ?? null;
        if (raw !== null && raw >= startGW && raw <= endGW) assignedGW = raw;
      }
      if (assignedGW === null) return player;
      const key = assignedGW.toString();
      const prevVal = player.gameweekProjections[key] || 0;
      const newProjections = { ...player.gameweekProjections, [key]: prevVal + gw39Assists, '39': 0 };
      const prevDetails = (player as any).fixtureDetails?.[key] || [];
      const newFixtureDetails = { ...((player as any).fixtureDetails || {}), [key]: [...prevDetails, { opponent: tbcInfo.opponent, isHome: tbcInfo.isHome, assists: gw39Assists }] };
      return { ...player, gameweekProjections: newProjections, fixtureDetails: newFixtureDetails };
    });
  }, [displayData, viewMode, tbcTeamInfoMap, fixtureMode, tbcAssignments, startGameweek, endGameweek]);

  // Whether the floating GW39 (TBC) column should be visible
  const showTBCColumn = useMemo(() => (
    endGameweek >= 39 && (selectedGameweeks.size === 0 || selectedGameweeks.has(39)) &&
    viewMode === 'future' && fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0
  ), [endGameweek, selectedGameweeks, viewMode, fixtureMode, tbcTeamInfoMap]);

  // Generate dynamic gameweek columns based on selected range (filtered by selections, capped at GW38)
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

  // Calculate dynamic range label
  const rangeLabel = useMemo(() => {
    // Safe to use startGameweek and endGameweek (never null)
    const gwCount = endGameweek - startGameweek + 1;
    return `${gwCount}GW Total`;
  }, [startGameweek, endGameweek]);

  const handleRefreshData = async () => {
    console.log('🔄 Refresh button clicked!');
    setIsRefreshing(true);
    console.log('🔄 isRefreshing set to true');
    try {
      // Add a minimum delay to make spinner visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate all assist-related queries
      console.log('🔄 Invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ["/api/cached/player-assists-projections"] });
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/player-assist-projections") || key?.includes("/api/cached/player-assists-projections");
        }
      });
      // Force refetch
      console.log('🔄 Refetching data...');
      await queryClient.refetchQueries({ queryKey: ["/api/cached/player-assists-projections"] });
      console.log('🔄 Refresh completed!');
    } finally {
      setIsRefreshing(false);
      console.log('🔄 isRefreshing set to false');
    }
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

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!displayData.length) return [];
    
    let filtered = resolvedDisplayData.filter(player => {
      // Search filter
      if (searchTerm) {
        const matchesSearch = player.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (player.teamShort?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        if (!matchesSearch) return false;
      }
      
      // Position filter - include semantics: non-empty set = show only those positions
      if (selectedPositions.size > 0) {
        const normalizedPos = normalizePosition(player.position || '');
        const included = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
        if (!included) return false;
      }
      if (selectedTeams.size > 0 && !selectedTeams.has(player.teamShort || '')) return false;
      return true;
    });

    // Calculate dynamic totals based on selected gameweek range (with availability adjustment)
    const getFilteredTotalForSort = (player: PlayerAssistProjection) => {
      const playerInfo = playerAvailabilityMap?.get(player.playerId);
      const gwMultipliers = applyAvailability 
        ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
        : {};
      let total = 0;
      dynamicGameweekColumns.forEach(gw => {
        const val = player.gameweekProjections[gw.toString()] || 0;
        const mult = gwMultipliers[gw] ?? 1;
        total += val * mult;
      });
      return total;
    };

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case 'team':
          aValue = a.teamShort || '';
          bValue = b.teamShort || '';
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        case 'totalAssists':
          aValue = a.totalProjectedAssists;
          bValue = b.totalProjectedAssists;
          break;
        case 'rangeTotal': {
          const aTBC = showTBCColumn ? (Number(a.gameweekProjections?.['39']) || 0) : 0;
          const bTBC = showTBCColumn ? (Number(b.gameweekProjections?.['39']) || 0) : 0;
          aValue = getFilteredTotalForSort(a) + aTBC;
          bValue = getFilteredTotalForSort(b) + bTBC;
          break;
        }
        case 'rangePoints': {
          const aTBC2 = showTBCColumn ? (Number(a.gameweekProjections?.['39']) || 0) : 0;
          const bTBC2 = showTBCColumn ? (Number(b.gameweekProjections?.['39']) || 0) : 0;
          aValue = (getFilteredTotalForSort(a) + aTBC2) * 3;
          bValue = (getFilteredTotalForSort(b) + bTBC2) * 3;
          break;
        }
        case 'assistShare':
          aValue = a.assistShare;
          bValue = b.assistShare;
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw4', 'gw5', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = parseInt(sortField.replace('gw', ''));
            if (!isNaN(gwNumber)) {
              const aPlayerInfo = playerAvailabilityMap?.get(a.playerId);
              const bPlayerInfo = playerAvailabilityMap?.get(b.playerId);
              const aMultipliers = applyAvailability ? getGameweekMultipliers(aPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
              const bMultipliers = applyAvailability ? getGameweekMultipliers(bPlayerInfo, [gwNumber], currentGameweek, bootstrapData) : {};
              aValue = (a.gameweekProjections[gwNumber.toString()] || 0) * (aMultipliers[gwNumber] ?? 1);
              bValue = (b.gameweekProjections[gwNumber.toString()] || 0) * (bMultipliers[gwNumber] ?? 1);
            } else {
              aValue = a.totalProjectedAssists;
              bValue = b.totalProjectedAssists;
            }
          } else {
            aValue = a.totalProjectedAssists;
            bValue = b.totalProjectedAssists;
          }
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [resolvedDisplayData, searchTerm, selectedPositions, selectedTeams, startGameweek, endGameweek, sortField, sortDirection, applyAvailability, playerAvailabilityMap, currentGameweek, bootstrapData, dynamicGameweekColumns, viewMode, showTBCColumn]);

  // Calculate dynamic totals based on selected gameweek range (excluding excluded gameweeks)
  const getFilteredTotal = (player: PlayerAssistProjection, useAvailability: boolean = false) => {
    let total = 0;
    const playerInfo = playerAvailabilityMap?.get(player.playerId);
    const availabilityFactor = useAvailability && playerInfo 
      ? (playerInfo.chanceOfPlayingNextRound ?? 100) / 100 
      : 1;
    for (const gw of dynamicGameweekColumns) {
      total += (player.gameweekProjections[gw.toString()] || 0) * availabilityFactor;
    }
    return total;
  };

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
      <ArrowUpDown className="h-4 w-4 text-green-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-green-600" />;
  };

  // ALL CONDITIONAL LOGIC AND EARLY RETURNS MUST COME AFTER ALL HOOKS

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full py-4 sm:py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center">
                <Zap className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load assist projections</h3>
                  <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || !initialized || displayData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              {viewMode === "future" ? "Loading Assist Projections" : "Loading Assist History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              {viewMode === "future" 
                ? "Calculating projected assists for all players across the next 12 gameweeks..."
                : "Loading historical assist data for all players..."}
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
            <h1>Player Assists</h1>
          </div>
          <p className="fpl-page-subtitle">
            Projected assists and historical data by player across selected gameweeks
          </p>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "future" | "past" | "pastXa")} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="future" className="flex items-center gap-1.5 flex-1">
            <Calendar className="h-4 w-4" />
            Assists Projections
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-1.5 flex-1">
            <History className="h-4 w-4" />
            Assists History
          </TabsTrigger>
          <TabsTrigger value="pastXa" className="flex items-center gap-1.5 flex-1">
            <TrendingUp className="h-4 w-4" />
            xA History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === "future" && tbcTeamInfoMap.size > 0 && (
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
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="fpl-card mb-6">
          <CollapsibleTrigger asChild>
            <div className="fpl-card-header cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-600" />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
              

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  Search
                </label>
                <Input
                  data-testid="input-player-search"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              
              <div className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2 lg:col-span-3 xl:col-span-1 justify-center sm:justify-end">
                <TrendingUp className="h-4 w-4" />
                <span>{filteredAndSortedData.length} players</span>
              </div>
            </div>

            {(viewMode === "past" || viewMode === "pastXa") && (
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-1">
                <span className="text-xs text-gray-500">Quick:</span>
                {[6, 8, 12].map(n => {
                  const last = historyData?.lastFinishedGW || xaHistoryData?.lastFinishedGW || 24;
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
              </div>
            )}

            <Tabs defaultValue="gws" className="w-full mt-3">
              <TabsList className="w-full grid grid-cols-3 mb-1 h-auto p-0.5 bg-white shadow-sm border border-gray-100">
                <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Gameweeks</span><span className="sm:hidden">GWs</span>{selectedGameweeks.size > 0 && ` (${selectedGameweeks.size})`}
                </TabsTrigger>
                <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  <span className="hidden sm:inline">Position</span><span className="sm:hidden">Pos</span>{selectedPositions.size > 0 && ` (${selectedPositions.size})`}
                </TabsTrigger>
                <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                  Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                </TabsTrigger>
              </TabsList>

              {/* GWs tab */}
              <TabsContent value="gws" className="mt-0">
                <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                  <button onClick={() => setApplyAvailability(!applyAvailability)}
                    className={`inline-flex items-center gap-1 rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${applyAvailability ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                    data-testid="button-toggle-availability">
                    {applyAvailability ? 'Avail: ON' : 'Avail: OFF'}
                  </button>
                  <button onClick={clearGameweekSelections}
                    className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300"
                    data-testid="button-clear-gw-selections">
                    All
                  </button>
                  <button onClick={() => setSelectedGameweeks(prev => new Set(Array.from({ length: Math.min(endGameweek, 38) - startGameweek + 1 }, (_, i) => startGameweek + i).filter(gw => !prev.has(gw))))}
                    className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-orange-50 text-orange-700 border-orange-300"
                    data-testid="button-invert-gameweeks">
                    Invert
                  </button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {Array.from({ length: Math.min(endGameweek, 38) - startGameweek + 1 }, (_, i) => {
                    const gwNumber = startGameweek + i;
                    const isActive = selectedGameweeks.size === 0 || selectedGameweeks.has(gwNumber);
                    return (
                      <button key={gwNumber} onClick={() => toggleGameweekSelection(gwNumber)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                        data-testid={`button-toggle-gw-${gwNumber}`}>
                        GW{gwNumber}
                      </button>
                    );
                  })}
                  {viewMode === 'future' && fixtureMode !== 'expert' && tbcTeamInfoMap.size > 0 && endGameweek >= 39 && (
                    <button onClick={() => toggleGameweekSelection(39)}
                      className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${selectedGameweeks.size === 0 || selectedGameweeks.has(39) ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                      GW39 (TBC)
                    </button>
                  )}
                </div>
              </TabsContent>

              {/* Pos tab */}
              <TabsContent value="pos" className="mt-0">
                <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                  <button onClick={() => setSelectedPositions(new Set())}
                    className="rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">
                    All
                  </button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {[{full: 'Goalkeeper', short: 'GKP'}, {full: 'Defender', short: 'DEF'}, {full: 'Midfielder', short: 'MID'}, {full: 'Forward', short: 'FWD'}].map(({full, short}) => {
                    const isActive = selectedPositions.size === 0 || selectedPositions.has(full);
                    return (
                      <button key={full} onClick={() => togglePositionSelection(full)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                        data-testid={`button-toggle-position-${full}`}>
                        {short}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Teams tab */}
              <TabsContent value="teams" className="mt-0">
                <div className="flex flex-wrap items-center justify-end gap-1 mb-1">
                  <button onClick={() => setSelectedTeams(new Set())}
                    className="rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300">
                    All
                  </button>
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {teams.map(team => {
                    const isActive = selectedTeams.size === 0 || selectedTeams.has(team);
                    const shortName = teamNameToShort?.get(team) || team;
                    return (
                      <button key={team} onClick={() => toggleTeamSelection(team)}
                        className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                        data-testid={`button-toggle-team-${team}`}>
                        {shortName}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Loading State */}
        {(isLoading || !initialized) && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Results */}
        {!isLoading && initialized && filteredAndSortedData.length > 0 && (
          <div className="space-y-6">
              <div className="fpl-card">
                <div className="fpl-card-header">
                  <h2 className="fpl-card-title flex items-center gap-2 flex-wrap">
                    <Zap className="h-5 w-5 text-green-600" />
                    {viewMode === "future" ? "Player Assist Projections" : "Player Assist History"}: GW{startGameweek}-GW{endGameweek}
                    {selectedGameweeks.size > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {selectedGameweeks.size} GW{selectedGameweeks.size === 1 ? '' : 's'} selected
                      </Badge>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowOpponent(!showOpponent)}
                      className={`inline-flex items-center gap-1 rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${showOpponent ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                      data-testid="button-toggle-opponent">
                      <Users className="h-2.5 w-2.5" />{showOpponent ? 'Hide Opp' : 'Show Opp'}
                    </button>
                    <Button
                      onClick={handleRefreshData}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="button-refresh-data"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                  </div>
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
                            <th key={`assists-header-gw${gw}`} className="px-1 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider w-[52px] min-w-[52px]">
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
                          <th className="px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 bg-orange-50 w-[65px] min-w-[65px] sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort('rangeTotal')} className="h-auto p-0 font-medium text-gray-500 hover:bg-orange-100 hover:text-gray-700 text-xs md:text-sm">
                              {viewMode === "pastXa" ? "xA" : "Assists"} {getSortIcon('rangeTotal')}
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedData.map((player, index) => {
                          const playerInfo = playerAvailabilityMap?.get(player.playerId);
                          const gwMultipliers = applyAvailability 
                            ? getGameweekMultipliers(playerInfo, dynamicGameweekColumns, currentGameweek, bootstrapData)
                            : {};
                          const hasAnyAdjustment = applyAvailability && Object.values(gwMultipliers).some(m => m !== 1);
                          
                          let adjustedTotal = 0;
                          let originalTotal = 0;
                          dynamicGameweekColumns.forEach(gw => {
                            const val = player.gameweekProjections[gw.toString()] || 0;
                            const mult = gwMultipliers[gw] ?? 1;
                            adjustedTotal += val * mult;
                            originalTotal += val;
                          });
                          const tbcAssistEntry = viewMode === "future" ? tbcTeamInfoMap.get(player.teamShort || '') : null;
                          const tbcAssists = Number(player.gameweekProjections?.['39']) || 0;
                          const pointsTotal = adjustedTotal * 3;
                          const originalPointsTotal = originalTotal * 3;
                          
                          return (
                          <tr key={player.playerId} className={`border-b border-gray-100 hover:bg-green-50/50 ${index < 10 ? 'bg-green-50/30' : ''}`}>
                            <td className="py-2 px-1 md:px-3 sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] z-20 w-[130px] min-w-[130px]">
                              <div className="flex items-center gap-0.5 flex-wrap">
                                <PlayerNameCell 
                                  name={(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName}
                                  position={player.position}
                                  team={player.teamShort}
                                  compact={true}
                                  className="text-xs md:text-sm"
                                />
                                {playerAvailabilityMap && playerAvailabilityMap.get(player.playerId) && (
                                  <PlayerAvailabilityBadge player={playerAvailabilityMap.get(player.playerId)!} />
                                )}
                              </div>
                            </td>
                            {dynamicGameweekColumns.map((gw) => {
                              const projValue = player.gameweekProjections[gw.toString()] || 0;
                              const fixtures: FixtureDetail[] = (player as any).fixtureDetails?.[gw.toString()] || [];
                              const isDGW = fixtures.length > 1;
                              const opponentInfo = opponentMap.get(`${player.teamShort}-${gw}`);
                              const multiplier = gwMultipliers[gw] ?? 1;
                              const displayValue = projValue * multiplier;
                              const hasGwAdjustment = applyAvailability && multiplier !== 1;
                              const formatValue = (val: number) => viewMode === "past" ? Math.round(val).toString() : val.toFixed(1);
                              return (
                                <td key={`assists-cell-${player.playerId}-gw${gw}`} className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium w-[52px] min-w-[52px]">
                                  <div className="flex flex-col items-center">
                                    {isDGW && viewMode === "future" ? (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
                                            {hasGwAdjustment && projValue > 0 ? (
                                              <div className="flex flex-col items-center">
                                                <span className="text-purple-700 font-medium">{formatValue(displayValue)}</span>
                                                <span className="text-gray-400 line-through text-xs">{formatValue(projValue)}</span>
                                              </div>
                                            ) : (
                                              <span className="font-medium">{formatValue(projValue)}</span>
                                            )}
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                                          <div className="text-xs font-semibold mb-2">GW{gw} Fixture Breakdown</div>
                                          {fixtures.map((f, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                              <span className={`text-xs ${f.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                                {f.opponent} ({f.isHome ? 'H' : 'A'})
                                              </span>
                                              <span className="font-medium text-xs">{formatValue(f.assists * multiplier)}</span>
                                            </div>
                                          ))}
                                          <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 font-semibold text-xs">
                                            <span>Total</span>
                                            <span>{formatValue(displayValue)}</span>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    ) : hasGwAdjustment && projValue > 0 ? (
                                      <>
                                        <span className="text-purple-700 font-medium">{formatValue(displayValue)}</span>
                                        <span className="text-gray-400 line-through text-xs">{formatValue(projValue)}</span>
                                      </>
                                    ) : (
                                      <span>{projValue > 0 ? formatValue(projValue) : "-"}</span>
                                    )}
                                    {showOpponent && (
                                      opponentInfo && opponentInfo.length > 0 ? (
                                        <span className="text-[9px] md:text-[10px]">
                                          {opponentInfo.map((o, i) => (
                                            <span key={i} className={o.isHome ? 'text-green-400' : 'text-blue-400'}>
                                              {i > 0 && ' / '}{o.opponent} ({o.isHome ? 'H' : 'A'})
                                            </span>
                                          ))}
                                        </span>
                                      ) : <span className="text-[9px] md:text-[10px]">&nbsp;</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            {showTBCColumn && (
                              <td className="px-1 md:px-3 py-2 md:py-4 text-center text-xs md:text-sm font-medium w-[52px] min-w-[52px] bg-amber-50/60 border-l border-amber-300">
                                {tbcAssistEntry && tbcAssists > 0 ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 text-amber-700 font-medium">
                                        {tbcAssists.toFixed(1)}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-amber-200 z-50">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-xs font-semibold">GW39 (TBC)</span>
                                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1">FPL Model</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1">
                                        <span className={`text-xs ${tbcAssistEntry.isHome ? 'text-green-600' : 'text-blue-600'}`}>
                                          {tbcAssistEntry.opponent} ({tbcAssistEntry.isHome ? 'H' : 'A'})
                                        </span>
                                        <span className="font-medium text-xs">{tbcAssists.toFixed(1)}</span>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            )}
                            <td className={`px-1 md:px-3 py-2 md:py-4 text-center w-[65px] min-w-[65px] border-l border-gray-300 sticky right-0 z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] ${hasAnyAdjustment ? 'bg-purple-50' : 'bg-orange-50'}`}>
                              {(() => {
                                const tbcContrib = showTBCColumn ? tbcAssists : 0;
                                return hasAnyAdjustment ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm md:text-lg font-bold text-purple-700">{viewMode === "past" ? Math.round(adjustedTotal + tbcContrib) : (adjustedTotal + tbcContrib).toFixed(1)}</span>
                                    <span className="text-gray-400 line-through text-[10px] md:text-xs">{viewMode === "past" ? Math.round(originalTotal + tbcContrib) : (originalTotal + tbcContrib).toFixed(1)}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm md:text-lg font-bold text-orange-900">{viewMode === "past" ? Math.round(adjustedTotal + tbcContrib) : (adjustedTotal + tbcContrib).toFixed(1)}</span>
                                );
                              })()}
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
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredAndSortedData.length === 0 && (
          <div className="fpl-card">
            <div className="fpl-card-content p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
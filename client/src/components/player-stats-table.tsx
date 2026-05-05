import { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Eye, UserPlus, UserMinus, ZoomIn, ZoomOut, Settings2, Check, GripVertical, MoveUp, MoveDown, RotateCcw, Plus, Minus } from "lucide-react";
import { BootstrapData, Player, Team, ElementType } from "@shared/schema";
import { FilterState, SortState, SortableField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface ColumnDefinition {
  id: string;
  field: SortableField;
  label: string;
  tooltip: string;
  category: 'core' | 'performance' | 'defensive' | 'expected' | 'transfers' | 'other';
  currentSeasonOnly?: boolean;
  totalsOnly?: boolean;
}

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { id: 'now_cost', field: 'now_cost', label: '£', tooltip: 'Price', category: 'core' },
  { id: 'games_played', field: 'games_played', label: 'MP', tooltip: 'Matches Played', category: 'core', totalsOnly: true },
  { id: 'total_points', field: 'total_points', label: 'Pts', tooltip: 'Total Points', category: 'core' },
  { id: 'goals_scored', field: 'goals_scored', label: 'G', tooltip: 'Goals Scored', category: 'performance' },
  { id: 'assists', field: 'assists', label: 'A', tooltip: 'Assists', category: 'performance' },
  { id: 'clean_sheets', field: 'clean_sheets', label: 'CS', tooltip: 'Clean Sheets', category: 'performance' },
  { id: 'defensive_contribution', field: 'defensive_contribution', label: 'DC', tooltip: 'Defensive Contribution', category: 'defensive', currentSeasonOnly: true },
  { id: 'defensive_contribution_points', field: 'defensive_contribution_points', label: 'DCP', tooltip: 'Defensive Contribution Points', category: 'defensive', currentSeasonOnly: true },
  { id: 'value_season', field: 'value_season', label: 'Val', tooltip: 'Value (Points per Million)', category: 'core' },
  { id: 'points_per_game', field: 'points_per_game', label: 'PPG', tooltip: 'Points Per Game', category: 'core', totalsOnly: true },
  { id: 'form', field: 'form', label: 'Form', tooltip: 'Form (Last 5 Gameweeks)', category: 'core', currentSeasonOnly: true, totalsOnly: true },
  { id: 'selected_by_percent', field: 'selected_by_percent', label: 'Own%', tooltip: 'Ownership Percentage', category: 'core', currentSeasonOnly: true },
  { id: 'expected_goals', field: 'expected_goals', label: 'xG', tooltip: 'Expected Goals', category: 'expected', currentSeasonOnly: true },
  { id: 'expected_assists', field: 'expected_assists', label: 'xA', tooltip: 'Expected Assists', category: 'expected', currentSeasonOnly: true },
  { id: 'expected_goal_involvements', field: 'expected_goal_involvements', label: 'xGI', tooltip: 'Expected Goal Involvements', category: 'expected', currentSeasonOnly: true },
  { id: 'expected_goals_conceded', field: 'expected_goals_conceded', label: 'xGC', tooltip: 'Expected Goals Conceded', category: 'expected', currentSeasonOnly: true },
  { id: 'minutes', field: 'minutes', label: 'Min', tooltip: 'Minutes Played', category: 'core' },
  { id: 'goals_conceded', field: 'goals_conceded', label: 'GC', tooltip: 'Goals Conceded', category: 'performance' },
  { id: 'saves', field: 'saves', label: 'Sav', tooltip: 'Saves', category: 'performance' },
  { id: 'save_points', field: 'save_points', label: 'SavP', tooltip: 'Save Points', category: 'defensive', currentSeasonOnly: true },
  { id: 'minutes_points', field: 'minutes_points', label: 'MinP', tooltip: 'Minutes Points', category: 'defensive', currentSeasonOnly: true },
  { id: 'tackles', field: 'tackles', label: 'Tck', tooltip: 'Tackles', category: 'defensive', currentSeasonOnly: true },
  { id: 'recoveries', field: 'recoveries', label: 'Rec', tooltip: 'Recoveries', category: 'defensive', currentSeasonOnly: true },
  { id: 'clearances_blocks_interceptions', field: 'clearances_blocks_interceptions', label: 'CBI', tooltip: 'Clearances, Blocks, Interceptions', category: 'defensive', currentSeasonOnly: true },
  { id: 'starts', field: 'starts', label: 'Starts', tooltip: 'Starts', category: 'core', currentSeasonOnly: true, totalsOnly: true },
  { id: 'bonus', field: 'bonus', label: 'Bonus', tooltip: 'Bonus Points', category: 'performance' },
  { id: 'bps', field: 'bps', label: 'BPS', tooltip: 'Bonus Points System', category: 'performance' },
  { id: 'event_points', field: 'event_points', label: 'GW Pts', tooltip: 'Gameweek Points', category: 'other', currentSeasonOnly: true, totalsOnly: true },
  { id: 'transfers_in_event', field: 'transfers_in_event', label: 'GW In', tooltip: 'Transfers In This Gameweek', category: 'transfers', currentSeasonOnly: true, totalsOnly: true },
  { id: 'transfers_out_event', field: 'transfers_out_event', label: 'GW Out', tooltip: 'Transfers Out This Gameweek', category: 'transfers', currentSeasonOnly: true, totalsOnly: true },
  { id: 'transfers_in', field: 'transfers_in', label: 'Total In', tooltip: 'Total Transfers In', category: 'transfers', currentSeasonOnly: true, totalsOnly: true },
  { id: 'transfers_out', field: 'transfers_out', label: 'Total Out', tooltip: 'Total Transfers Out', category: 'transfers', currentSeasonOnly: true, totalsOnly: true },
  { id: 'value_form', field: 'value_form', label: 'Val Form', tooltip: 'Value Form', category: 'other', currentSeasonOnly: true, totalsOnly: true },
  { id: 'influence', field: 'influence', label: 'Influence', tooltip: 'Influence', category: 'other', totalsOnly: true },
  { id: 'creativity', field: 'creativity', label: 'Creativity', tooltip: 'Creativity', category: 'other', totalsOnly: true },
  { id: 'threat', field: 'threat', label: 'Threat', tooltip: 'Threat', category: 'other', totalsOnly: true },
  { id: 'ict_index', field: 'ict_index', label: 'ICT', tooltip: 'ICT Index', category: 'other', totalsOnly: true },
  { id: 'dreamteam_count', field: 'dreamteam_count', label: 'Dream Team', tooltip: 'Dream Team Appearances', category: 'other', currentSeasonOnly: true, totalsOnly: true },
  { id: 'penalties_saved', field: 'penalties_saved', label: 'Pen Saved', tooltip: 'Penalties Saved', category: 'performance' },
  { id: 'penalties_missed', field: 'penalties_missed', label: 'Pen Missed', tooltip: 'Penalties Missed', category: 'performance' },
  { id: 'yellow_cards', field: 'yellow_cards', label: 'Yellow', tooltip: 'Yellow Cards', category: 'other' },
  { id: 'red_cards', field: 'red_cards', label: 'Red', tooltip: 'Red Cards', category: 'other' },
  { id: 'own_goals', field: 'own_goals', label: 'Own Goals', tooltip: 'Own Goals', category: 'other' },
  { id: 'cost_change_event', field: 'cost_change_event', label: 'Price Δ GW', tooltip: 'Price Change This Gameweek', category: 'other', currentSeasonOnly: true, totalsOnly: true },
  { id: 'cost_change_start', field: 'cost_change_start', label: 'Price Δ Start', tooltip: 'Price Change Since Start', category: 'other', totalsOnly: true },
];

const DEFAULT_VISIBLE_COLUMNS = [
  'now_cost', 'games_played', 'total_points', 'value_season', 'points_per_game', 'form', 'selected_by_percent', 'minutes', 'starts',
  'goals_scored', 'assists', 'clean_sheets', 'goals_conceded', 'saves', 'bonus', 'bps', 'penalties_saved',
  'expected_goals', 'expected_assists', 'expected_goal_involvements', 'expected_goals_conceded',
  'defensive_contribution',
  'value_form', 'dreamteam_count', 'yellow_cards', 'red_cards', 'cost_change_event', 'cost_change_start',
];

// Default column order (matches COLUMN_DEFINITIONS order)
const DEFAULT_COLUMN_ORDER = COLUMN_DEFINITIONS.map(c => c.id);

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core Stats',
  performance: 'Performance',
  defensive: 'Defensive',
  expected: 'Expected Stats',
  transfers: 'Transfers',
  other: 'Other'
};

interface PlayerStatsTableProps {
  data?: BootstrapData;
  historicalData?: any[];
  filteredPlayers?: any[]; // Gameweek-filtered player stats
  filters: FilterState;
  sort: SortState;
  setSort: (sort: SortState) => void;
  isLoading: boolean;
  season?: string;
  startGameweek?: number;
  endGameweek?: number | null;
  onPlayerDetailsClick?: (player: any) => void;
  onPlayerCompareClick?: (player: any) => void;
  compareList?: any[];
  maxCompareReached?: boolean;
}

interface CbitPointsData {
  [playerId: string]: {
    gameweeks: Array<{
      gameweek: number;
      cbitPoints: number;
      tackles: number;
      recoveries: number;
      clearances_blocks_interceptions: number;
    }>;
    seasonTotal: number;
  };
}

interface SavePointsData {
  [playerId: string]: {
    gameweeks: Array<{
      gameweek: number;
      savePoints: number;
      saves: number;
    }>;
    seasonTotal: number;
  };
}

interface MinutesPointsData {
  [playerId: string]: {
    gameweeks: Array<{
      gameweek: number;
      minutes: number;
      minutesPoints: number;
    }>;
    seasonTotal: number;
  };
}

const ITEMS_PER_PAGE = 20;
const COLUMN_SETTINGS_VERSION = 3; // Increment to reset user's column visibility to new defaults

export default function PlayerStatsTable({ 
  data, 
  historicalData,
  filteredPlayers,
  filters, 
  sort, 
  setSort, 
  isLoading,
  season,
  startGameweek,
  endGameweek,
  onPlayerDetailsClick,
  onPlayerCompareClick,
  compareList = [],
  maxCompareReached = false
}: PlayerStatsTableProps) {
  const [, navigate] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [displayMode, setDisplayMode] = useState<'totals' | 'per_match' | 'per_start' | 'per_90'>('totals');
  const [venueFilter, setVenueFilter] = useState<'all' | 'home' | 'away'>('all');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const savedVersion = localStorage.getItem('playerStatsColumnsVersion');
    const currentVersion = String(COLUMN_SETTINGS_VERSION);
    if (savedVersion !== currentVersion) {
      localStorage.setItem('playerStatsColumnsVersion', currentVersion);
      localStorage.removeItem('playerStatsVisibleColumns');
      return new Set(DEFAULT_VISIBLE_COLUMNS);
    }
    const saved = localStorage.getItem('playerStatsVisibleColumns');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set(DEFAULT_VISIBLE_COLUMNS);
      }
    }
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });
  
  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('playerStatsColumnOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all columns are present (in case new columns were added)
        const allColumnIds = COLUMN_DEFINITIONS.map(c => c.id);
        const missingColumns = allColumnIds.filter(id => !parsed.includes(id));
        return [...parsed.filter((id: string) => allColumnIds.includes(id)), ...missingColumns];
      } catch {
        return DEFAULT_COLUMN_ORDER;
      }
    }
    return DEFAULT_COLUMN_ORDER;
  });
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Save visible columns to localStorage
  useEffect(() => {
    localStorage.setItem('playerStatsVisibleColumns', JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem('playerStatsColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  // Move column up in order
  const moveColumnUp = (columnId: string) => {
    setColumnOrder(prev => {
      const index = prev.indexOf(columnId);
      if (index <= 0) return prev;
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  };

  // Move column down in order
  const moveColumnDown = (columnId: string) => {
    setColumnOrder(prev => {
      const index = prev.indexOf(columnId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  };

  // Select all columns
  const selectAllColumns = () => {
    setVisibleColumns(new Set(COLUMN_DEFINITIONS.map(c => c.id)));
  };

  // Reset to default columns (visibility only)
  const resetColumns = () => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
  };

  // Reset column order to default
  const resetColumnOrder = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
  };

  // Reset everything (visibility and order)
  const resetAll = () => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
    setColumnOrder(DEFAULT_COLUMN_ORDER);
  };

  // Reset horizontal scroll position when zoom changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [zoomLevel]);
  
  // Check if we're viewing historical data - current season shows defensive contribution fields
  const isHistoricalSeason = season && season !== "2025/26" && season !== "current";

  // Get available columns based on current mode (filtered but not reordered - for the selector UI)
  const availableColumns = useMemo(() => {
    return COLUMN_DEFINITIONS.filter(col => {
      if (col.currentSeasonOnly && isHistoricalSeason) return false;
      if (col.totalsOnly && displayMode !== 'totals') return false;
      return true;
    });
  }, [displayMode, isHistoricalSeason]);

  // Get columns in user's custom order (for display in table and reorder UI)
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(id => COLUMN_DEFINITIONS.find(c => c.id === id))
      .filter((col): col is ColumnDefinition => {
        if (!col) return false;
        if (col.currentSeasonOnly && isHistoricalSeason) return false;
        if (col.totalsOnly && displayMode !== 'totals') return false;
        return true;
      });
  }, [columnOrder, displayMode, isHistoricalSeason]);

  // Toggle all columns in a category
  const toggleCategory = (category: string) => {
    const categoryColumns = availableColumns.filter(c => c.category === category);
    const allVisible = categoryColumns.every(c => visibleColumns.has(c.id));
    
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      categoryColumns.forEach(c => {
        if (allVisible) {
          newSet.delete(c.id);
        } else {
          newSet.add(c.id);
        }
      });
      return newSet;
    });
  };

  // Check if all columns in a category are visible
  const isCategoryAllVisible = (category: string) => {
    const categoryColumns = availableColumns.filter(c => c.category === category);
    return categoryColumns.length > 0 && categoryColumns.every(c => visibleColumns.has(c.id));
  };

  // Check if some (but not all) columns in a category are visible
  const isCategorySomeVisible = (category: string) => {
    const categoryColumns = availableColumns.filter(c => c.category === category);
    const visibleCount = categoryColumns.filter(c => visibleColumns.has(c.id)).length;
    return visibleCount > 0 && visibleCount < categoryColumns.length;
  };


  // Check if column should be visible
  const isColumnVisible = (columnId: string) => {
    const col = COLUMN_DEFINITIONS.find(c => c.id === columnId);
    if (!col) return false;
    if (col.currentSeasonOnly && isHistoricalSeason) return false;
    if (col.totalsOnly && displayMode !== 'totals') return false;
    return visibleColumns.has(columnId);
  };
  
  // Determine if a specific GW range is active (filteredPlayers is being used)
  const hasGWFilter = !!filteredPlayers && startGameweek != null && endGameweek != null;
  const gwFilterSuffix = hasGWFilter ? `?startGW=${startGameweek}&endGW=${endGameweek}` : '';

  // Fetch CBIT points data from the API
  const { data: cbitPointsData, isLoading: isCbitPointsLoading, isError: isCbitPointsError } = useQuery<CbitPointsData>({
    queryKey: ['/api/player-cbit-points', startGameweek, endGameweek, hasGWFilter],
    queryFn: async () => {
      const response = await fetch(`/api/player-cbit-points${gwFilterSuffix}`);
      if (!response.ok) throw new Error('Failed to fetch CBIT points');
      return response.json();
    },
    enabled: !isHistoricalSeason,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch Save points data from the API
  const { data: savePointsData, isLoading: isSavePointsLoading, isError: isSavePointsError } = useQuery<SavePointsData>({
    queryKey: ['/api/player-save-points', startGameweek, endGameweek, hasGWFilter],
    queryFn: async () => {
      const response = await fetch(`/api/player-save-points${gwFilterSuffix}`);
      if (!response.ok) throw new Error('Failed to fetch save points');
      return response.json();
    },
    enabled: !isHistoricalSeason,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch Minutes points data from the API
  const { data: minutesPointsData, isLoading: isMinutesPointsLoading, isError: isMinutesPointsError } = useQuery<MinutesPointsData>({
    queryKey: ['/api/player-minutes-points', startGameweek, endGameweek, hasGWFilter],
    queryFn: async () => {
      const response = await fetch(`/api/player-minutes-points${gwFilterSuffix}`);
      if (!response.ok) throw new Error('Failed to fetch minutes points');
      return response.json();
    },
    enabled: !isHistoricalSeason,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch venue-specific stats when venue filter is active
  const { data: venueStatsData, isLoading: isVenueStatsLoading, isError: isVenueStatsError } = useQuery<{ [playerId: string]: any }>({
    queryKey: ['/api/player-venue-stats', { venue: venueFilter, season: season || 'current' }],
    queryFn: async () => {
      const response = await fetch(`/api/player-venue-stats?venue=${venueFilter}&season=${season || 'current'}`);
      if (!response.ok) throw new Error('Failed to fetch venue stats');
      return response.json();
    },
    enabled: venueFilter !== 'all' && !isHistoricalSeason && season === 'current',
    staleTime: 10 * 60 * 1000, // 10 minutes - longer since data changes less frequently
    gcTime: 30 * 60 * 1000,
    retry: 1, // Only retry once if it fails
  });

  // Helper function to get CBIT points for a player
  const getCbitPoints = (playerId: number): number => {
    if (isHistoricalSeason || !cbitPointsData || isCbitPointsError) {
      return 0; // Fallback for historical seasons or when data is unavailable
    }
    return cbitPointsData[playerId.toString()]?.seasonTotal || 0;
  };

  // Helper function to get Save points for a player
  const getSavePoints = (playerId: number): number => {
    if (isHistoricalSeason || !savePointsData || isSavePointsError) {
      return 0; // Fallback for historical seasons or when data is unavailable
    }
    return savePointsData[playerId.toString()]?.seasonTotal || 0;
  };

  // Helper function to get Minutes points for a player
  const getMinutesPoints = (playerId: number): number => {
    if (isHistoricalSeason || !minutesPointsData || isMinutesPointsError) {
      return 0; // Fallback for historical seasons or when data is unavailable
    }
    return minutesPointsData[playerId.toString()]?.seasonTotal || 0;
  };

  // Helper function to calculate stat based on display mode
  const calculateStat = (player: any, value: number): number => {
    if (displayMode === 'totals') {
      return value;
    }
    
    const pointsPerGame = parseFloat(player.points_per_game) || 0;
    const matches = pointsPerGame > 0 ? Math.round(player.total_points / pointsPerGame) : 0;
    const starts = player.starts || 0;
    const minutes = player.minutes || 0;
    
    if (displayMode === 'per_match') {
      return matches > 0 ? value / matches : 0;
    } else if (displayMode === 'per_start') {
      return starts > 0 ? value / starts : 0;
    } else if (displayMode === 'per_90') {
      const games90 = minutes / 90;
      return games90 > 0 ? value / games90 : 0;
    }
    
    return value;
  };

  // Helper function to render cell content for a given column
  const renderCellContent = (columnId: string, player: any, position: string) => {
    const formatValue = (value: any, type: string) => {
      if (type === 'decimal') {
        return parseFloat(value) || 0;
      }
      return value;
    };

    switch (columnId) {
      case 'now_cost':
        return <span className="text-gray-900">£{((player.now_cost || player.end_cost || 0) / 10).toFixed(1)}m</span>;
      case 'games_played':
        if (player.games_played != null) {
          return <span className="text-gray-900">{player.games_played}</span>;
        }
        const pointsPerGame = parseFloat(player.points_per_game) || 0;
        return <span className="text-gray-900">{pointsPerGame > 0 ? Math.round(player.total_points / pointsPerGame) : 0}</span>;
      case 'total_points':
        return <span className="font-bold text-fpl-purple">{calculateStat(player, player.total_points || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'goals_scored':
        return <span className="text-green-600">{calculateStat(player, player.goals_scored || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'assists':
        return <span className="text-blue-600">{calculateStat(player, player.assists || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'clean_sheets':
        return <span className="text-green-600">{calculateStat(player, player.clean_sheets || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'defensive_contribution':
        return <span className="text-orange-600">{calculateStat(player, player.defensive_contribution || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'defensive_contribution_points':
        if (isCbitPointsLoading) return <span className="text-gray-400">...</span>;
        if (isCbitPointsError) return <span className="text-gray-400" title="CBIT points data unavailable">N/A</span>;
        return <span className="text-yellow-600">{calculateStat(player, getCbitPoints(player.id)).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'value_season':
        return <span className="text-green-700 font-semibold">{calculateStat(player, parseFloat(player.value_season || player.value_form || 0)).toFixed(1)}</span>;
      case 'points_per_game':
        return <span className="text-gray-900">{calculateStat(player, parseFloat(player.points_per_game || player.form || 0)).toFixed(1)}</span>;
      case 'form':
        return <span className="text-gray-900">{calculateStat(player, parseFloat(player.form || 0)).toFixed(1)}</span>;
      case 'selected_by_percent':
        return <span className="text-purple-700">{formatValue(player.selected_by_percent || 0, 'decimal')}%</span>;
      case 'expected_goals':
        return <span className="text-purple-600">{calculateStat(player, parseFloat(player.expected_goals || 0)).toFixed(1)}</span>;
      case 'expected_assists':
        return <span className="text-blue-600">{calculateStat(player, parseFloat(player.expected_assists || 0)).toFixed(1)}</span>;
      case 'expected_goal_involvements':
        return <span className="text-indigo-600">{calculateStat(player, parseFloat(player.expected_goal_involvements || 0)).toFixed(1)}</span>;
      case 'expected_goals_conceded':
        return <span className="text-red-600">{calculateStat(player, parseFloat(player.expected_goals_conceded || 0)).toFixed(1)}</span>;
      case 'minutes':
        return <span className="text-gray-900">{displayMode === 'totals' ? (player.minutes || 0) : calculateStat(player, player.minutes || 0).toFixed(0)}</span>;
      case 'goals_conceded':
        return <span className="text-red-600">{calculateStat(player, player.goals_conceded || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'saves':
        return <span className="text-gray-900">{calculateStat(player, player.saves || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'save_points':
        if (position !== 'GKP') return <span className="text-gray-400">-</span>;
        if (isSavePointsLoading) return <span className="text-gray-400">...</span>;
        if (isSavePointsError) return <span className="text-gray-400" title="Save points data unavailable">N/A</span>;
        return <span className="text-blue-600">{calculateStat(player, getSavePoints(player.id)).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'minutes_points':
        if (isMinutesPointsLoading) return <span className="text-gray-400">...</span>;
        if (isMinutesPointsError) return <span className="text-gray-400" title="Minutes points data unavailable">N/A</span>;
        return <span className="text-orange-600">{calculateStat(player, getMinutesPoints(player.id)).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'tackles':
        return <span className="text-blue-700">{calculateStat(player, player.tackles || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'recoveries':
        return <span className="text-green-700">{calculateStat(player, player.recoveries || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'clearances_blocks_interceptions':
        return <span className="text-purple-700">{calculateStat(player, player.clearances_blocks_interceptions || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'starts':
        return <span className="text-gray-900">{player.starts || 0}</span>;
      case 'bonus':
        return <span className="text-gray-900">{calculateStat(player, player.bonus || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'bps':
        return <span className="text-gray-900">{calculateStat(player, player.bps || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'event_points':
        return <span className="text-fpl-purple">{calculateStat(player, player.event_points || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'transfers_in_event':
        return <span className="text-green-600">{(player.transfers_in_event || 0).toLocaleString()}</span>;
      case 'transfers_out_event':
        return <span className="text-red-600">{(player.transfers_out_event || 0).toLocaleString()}</span>;
      case 'transfers_in':
        return <span className="text-green-600">{(player.transfers_in || 0).toLocaleString()}</span>;
      case 'transfers_out':
        return <span className="text-red-600">{(player.transfers_out || 0).toLocaleString()}</span>;
      case 'value_form':
        return <span className="text-green-700 font-semibold">{formatValue(player.value_form || 0, 'decimal')}</span>;
      // Decimal precision policy:
      // - Integer stats (goals, assists, CS, cards, etc.): 0dp in totals, 1dp in per-match/per-90
      // - Continuous decimal stats (xG, xA, xGI, xGC, ICT family, points-rate stats): 1dp in ALL modes
      case 'influence':
        return <span className="text-gray-900">{calculateStat(player, parseFloat(player.influence || 0)).toFixed(1)}</span>;
      case 'creativity':
        return <span className="text-gray-900">{calculateStat(player, parseFloat(player.creativity || 0)).toFixed(1)}</span>;
      case 'threat':
        return <span className="text-gray-900">{calculateStat(player, parseFloat(player.threat || 0)).toFixed(1)}</span>;
      case 'ict_index':
        return <span className="text-fpl-purple">{calculateStat(player, parseFloat(player.ict_index || 0)).toFixed(1)}</span>;
      case 'dreamteam_count':
        return <span className="text-yellow-600">{player.dreamteam_count || 0}</span>;
      case 'penalties_saved':
        return <span className="text-green-600">{calculateStat(player, player.penalties_saved || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'penalties_missed':
        return <span className="text-red-600">{calculateStat(player, player.penalties_missed || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'yellow_cards':
        return <span className="text-yellow-600">{calculateStat(player, player.yellow_cards || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'red_cards':
        return <span className="text-red-600">{calculateStat(player, player.red_cards || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'own_goals':
        return <span className="text-red-600">{calculateStat(player, player.own_goals || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</span>;
      case 'cost_change_event':
        const eventChange = player.cost_change_event || 0;
        return (
          <span className={eventChange > 0 ? 'text-green-600' : eventChange < 0 ? 'text-red-600' : 'text-gray-900'}>
            {eventChange > 0 ? '+' : ''}{(eventChange / 10).toFixed(1)}
          </span>
        );
      case 'cost_change_start':
        const startChange = player.cost_change_start || 0;
        return (
          <span className={startChange > 0 ? 'text-green-600' : startChange < 0 ? 'text-red-600' : 'text-gray-900'}>
            {startChange > 0 ? '+' : ''}{(startChange / 10).toFixed(1)}
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const filteredAndSortedPlayers = useMemo(() => {
    // Use historical data if available, then filtered players, otherwise use current season data
    let players: any[] = [];
    
    if (historicalData && Array.isArray(historicalData) && historicalData.length > 0) {
      players = [...historicalData];
    } else if (filteredPlayers && Array.isArray(filteredPlayers) && filteredPlayers.length > 0) {
      // Use gameweek-filtered player stats when available
      players = [...filteredPlayers];
    } else if (data && data.elements && Array.isArray(data.elements)) {
      players = [...data.elements];
      
      // Merge venue-specific stats when venue filter is active
      if (venueFilter !== 'all' && venueStatsData && Object.keys(venueStatsData).length > 0) {
        players = players.map(player => {
          const venueStats = venueStatsData[player.id.toString()];
          
          if (venueStats) {
            // Overlay venue-specific stats onto bootstrap player object
            return {
              ...player,
              // Override statistics with venue-specific values
              total_points: venueStats.totalPoints || 0,
              minutes: venueStats.minutes || 0,
              goals_scored: venueStats.goalsScored || 0,
              assists: venueStats.assists || 0,
              clean_sheets: venueStats.cleanSheets || 0,
              goals_conceded: venueStats.goalsConceded || 0,
              own_goals: venueStats.ownGoals || 0,
              penalties_saved: venueStats.penaltiesSaved || 0,
              penalties_missed: venueStats.penaltiesMissed || 0,
              yellow_cards: venueStats.yellowCards || 0,
              red_cards: venueStats.redCards || 0,
              saves: venueStats.saves || 0,
              bonus: venueStats.bonus || 0,
              bps: venueStats.bps || 0,
              starts: venueStats.starts || 0,
              tackles: venueStats.tackles || 0,
              recoveries: venueStats.recoveries || 0,
              clearances_blocks_interceptions: venueStats.clearancesBlocksInterceptions || 0,
              defensive_contribution: venueStats.defensiveContribution || 0,
              // Recalculate derived stats
              points_per_game: venueStats.matches > 0 ? 
                ((venueStats.totalPoints / venueStats.matches).toFixed(1)) : "0.0",
              // Mark that this is venue-filtered data
              _venueFiltered: true,
              _venueMatches: venueStats.matches || 0
            };
          }
          
          return player;
        });
      }
    } else {
      return [];
    }

    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      players = players.filter(player => 
        player.web_name.toLowerCase().includes(searchTerm) ||
        `${player.first_name} ${player.second_name}`.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.position && filters.position !== "all") {
      players = players.filter(player => player.element_type?.toString() === filters.position);
    }

    if (filters.team && filters.team !== "all") {
      // For historical data, use team_id, for current data use team
      const teamId = filters.team;
      players = players.filter(player => 
        player.team?.toString() === teamId || player.team_id?.toString() === teamId
      );
    }

    if (filters.maxPrice && filters.maxPrice !== "all") {
      const maxPrice = parseInt(filters.maxPrice);
      players = players.filter(player => {
        const cost = player.now_cost || player.end_cost || 0;
        return cost <= maxPrice;
      });
    }

    // Apply sorting with comprehensive field support
    players.sort((a, b) => {
      const getValue = (player: Player, field: SortableField): number => {
        switch (field) {
          case "total_points": return player.total_points;
          case "minutes": return player.minutes;
          case "games_played": {
            if (player.games_played != null) return player.games_played;
            const pointsPerGame = parseFloat(player.points_per_game) || 0;
            return pointsPerGame > 0 ? Math.round(player.total_points / pointsPerGame) : 0;
          }
          case "goals_scored": return player.goals_scored;
          case "assists": return player.assists;
          case "clean_sheets": return player.clean_sheets;
          case "goals_conceded": return player.goals_conceded;
          case "penalties_saved": return player.penalties_saved;
          case "penalties_missed": return player.penalties_missed;
          case "yellow_cards": return player.yellow_cards;
          case "red_cards": return player.red_cards;
          case "saves": return player.saves;
          case "bonus": return player.bonus;
          case "bps": return player.bps;
          case "own_goals": return player.own_goals;
          case "event_points": return player.event_points;
          case "dreamteam_count": return player.dreamteam_count;
          case "transfers_in": return player.transfers_in;
          case "transfers_out": return player.transfers_out;
          case "transfers_in_event": return player.transfers_in_event;
          case "transfers_out_event": return player.transfers_out_event;
          case "now_cost": return player.now_cost;
          case "form": return parseFloat(player.form) || 0;
          case "points_per_game": return parseFloat(player.points_per_game) || 0;
          case "selected_by_percent": return parseFloat(player.selected_by_percent) || 0;
          case "value_form": return parseFloat(player.value_form) || 0;
          case "value_season": return parseFloat(player.value_season) || 0;
          case "influence": return parseFloat(player.influence) || 0;
          case "creativity": return parseFloat(player.creativity) || 0;
          case "threat": return parseFloat(player.threat) || 0;
          case "ict_index": return parseFloat(player.ict_index) || 0;
          case "cost_change_event": return player.cost_change_event;
          case "cost_change_event_fall": return player.cost_change_event_fall;
          case "cost_change_start": return player.cost_change_start;
          case "cost_change_start_fall": return player.cost_change_start_fall;
          case "ep_next": return parseFloat(player.ep_next || "0") || 0;
          case "ep_this": return parseFloat(player.ep_this || "0") || 0;
          case "squad_number": return player.squad_number || 0;
          // New defensive contribution fields (2025/26 season only)
          case "defensive_contribution": return player.defensive_contribution || 0;
          case "defensive_contribution_per_90": return player.defensive_contribution_per_90 || 0;
          case "tackles": return player.tackles || 0;
          case "recoveries": return player.recoveries || 0;
          case "clearances_blocks_interceptions": return player.clearances_blocks_interceptions || 0;
          case "starts": return player.starts || 0;
          case "starts_per_90": return player.starts_per_90 || 0;
          case "expected_goals": return parseFloat(player.expected_goals || "0") || 0;
          case "expected_assists": return parseFloat(player.expected_assists || "0") || 0;
          case "expected_goal_involvements": return parseFloat(player.expected_goal_involvements || "0") || 0;
          case "expected_goals_conceded": return parseFloat(player.expected_goals_conceded || "0") || 0;
          case "expected_goals_per_90": return player.expected_goals_per_90 || 0;
          case "expected_assists_per_90": return player.expected_assists_per_90 || 0;
          case "expected_goal_involvements_per_90": return player.expected_goal_involvements_per_90 || 0;
          case "expected_goals_conceded_per_90": return player.expected_goals_conceded_per_90 || 0;
          case "defensive_contribution_points": {
            // Use the CBIT points data from the API instead of inline calculation
            return getCbitPoints(player.id);
          }
          case "save_points": {
            // Use the Save points data from the API
            return getSavePoints(player.id);
          }
          case "minutes_points": {
            // Use the Minutes points data from the API
            return getMinutesPoints(player.id);
          }
          default: return player.total_points;
        }
      };

      const aValue = getValue(a, sort.field);
      const bValue = getValue(b, sort.field);

      return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
    });

    return players;
  }, [data, historicalData, filteredPlayers, filters, sort, venueFilter, venueStatsData]);

  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedPlayers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedPlayers, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedPlayers.length / ITEMS_PER_PAGE);

  const handleSort = (field: SortableField) => {
    if (sort.field === field) {
      setSort({ field, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      setSort({ field, direction: "desc" });
    }
    setCurrentPage(1);
  };

  const getTeamName = (player: any): string => {
    // For historical data, use the team name directly if available
    if (isHistoricalSeason && (player.team_short_name || player.teamShortName)) {
      return player.team_short_name || player.teamShortName;
    }
    // For current season, use team ID lookup
    const teamId = player.team || player.team_id;
    return data?.teams.find(team => team.id === teamId)?.short_name || "";
  };

  const getPositionName = (player: any): string => {
    // For historical data, use position name directly and convert to short form
    if (isHistoricalSeason && (player.position_name || player.positionName)) {
      const posName = player.position_name || player.positionName;
      if (posName === 'Goalkeeper') return 'GKP';
      if (posName === 'Defender') return 'DEF';
      if (posName === 'Midfielder') return 'MID';
      if (posName === 'Forward') return 'FWD';
      return posName.slice(0, 3).toUpperCase();
    }
    // For current season, use element_type lookup and convert to full abbreviations
    const elementType = player.element_type;
    const positionType = data?.element_types.find(type => type.id === elementType);
    if (!positionType) return "UNK";
    
    // Convert singular_name_short (G, D, M, F) to full abbreviations
    switch (positionType.singular_name_short) {
      case 'G': return 'GKP';
      case 'D': return 'DEF';
      case 'M': return 'MID';
      case 'F': return 'FWD';
      default: return positionType.singular_name_short || "UNK";
    }
  };

  const formatPrice = (cost: number): string => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  // Helper function to create sortable column headers with tooltips
  const SortableHeader = ({ field, label, tooltip, className = "" }: { 
    field: SortableField; 
    label: string; 
    tooltip?: string;
    className?: string;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center justify-center gap-0.5 hover:text-blue-600 transition-colors text-gray-700 text-xs ${className}`}
      data-testid={`sort-${field}`}
      title={tooltip || label}
    >
      <span className="truncate">{label}</span>
      {sort.field === field && (
        <div className="flex-shrink-0">
          {sort.direction === "asc" ? (
            <ArrowUp className="h-2.5 w-2.5" />
          ) : (
            <ArrowDown className="h-2.5 w-2.5" />
          )}
        </div>
      )}
      {sort.field !== field && (
        <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
      )}
    </button>
  );

  // Helper function to format numerical values
  const formatValue = (value: number | string, type: 'decimal' | 'integer' | 'percent' | 'price' = 'integer') => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    
    switch (type) {
      case 'decimal':
        return numValue.toFixed(1);
      case 'percent':
        return `${numValue}%`;
      case 'price':
        return formatPrice(numValue);
      default:
        return numValue.toString();
    }
  };

  const getPositionColor = (position: string): string => {
    switch (position) {
      case "GKP": return "bg-yellow-100 text-yellow-800";
      case "DEF": return "bg-green-100 text-green-800";
      case "MID": return "bg-blue-100 text-blue-800";
      case "FWD": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return null;
  };

  if (isLoading || (venueFilter !== 'all' && isVenueStatsLoading)) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4 border-b border-gray-200 flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-table-container">
      {/* Table Header */}
      <div className="fpl-card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="fpl-card-title" data-testid="text-table-title">
            Player Statistics
          </h3>
          <div className="flex items-center flex-wrap gap-2">
            <Select value={displayMode} onValueChange={(value: any) => setDisplayMode(value)}>
              <SelectTrigger className="w-[180px] h-9" data-testid="select-display-mode">
                <SelectValue placeholder="Display mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totals">Totals</SelectItem>
                <SelectItem value="per_match">Average per match</SelectItem>
                <SelectItem value="per_start">Average per start</SelectItem>
                <SelectItem value="per_90">Average per 90 mins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={venueFilter} onValueChange={(value: any) => setVenueFilter(value)}>
              <SelectTrigger className="w-[160px] h-9" data-testid="select-venue-filter">
                <SelectValue placeholder="Venue filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Matches</SelectItem>
                <SelectItem value="home">Home Matches only</SelectItem>
                <SelectItem value="away">Away Matches only</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1" data-testid="button-column-selector">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Columns</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {Array.from(visibleColumns).filter(id => availableColumns.some(c => c.id === id)).length}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 max-h-[500px] overflow-y-auto" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-semibold text-sm">Column Settings</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetAll} 
                      className="h-7 text-xs px-2 gap-1"
                      data-testid="button-reset-all"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset All
                    </Button>
                  </div>
                  
                  {/* Visibility Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold text-gray-700">Show/Hide Columns</h5>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={selectAllColumns} className="h-6 text-xs px-2">
                          All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={resetColumns} className="h-6 text-xs px-2">
                          Default
                        </Button>
                      </div>
                    </div>
                    {['core', 'performance', 'defensive', 'expected', 'transfers', 'other'].map(category => {
                      const categoryColumns = availableColumns.filter(c => c.category === category);
                      if (categoryColumns.length === 0) return null;
                      const allVisible = isCategoryAllVisible(category);
                      const someVisible = isCategorySomeVisible(category);
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allVisible}
                              ref={(el) => {
                                if (el) {
                                  (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someVisible && !allVisible;
                                }
                              }}
                              onCheckedChange={() => toggleCategory(category)}
                              className="h-3.5 w-3.5"
                              data-testid={`checkbox-category-${category}`}
                            />
                            <h6 
                              className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                              onClick={() => toggleCategory(category)}
                            >
                              {CATEGORY_LABELS[category]}
                            </h6>
                          </div>
                          <div className="grid grid-cols-3 gap-1 ml-5">
                            {categoryColumns.map(col => (
                              <label
                                key={col.id}
                                className="flex items-center gap-1.5 p-1 rounded hover:bg-gray-50 cursor-pointer text-xs"
                              >
                                <Checkbox
                                  checked={visibleColumns.has(col.id)}
                                  onCheckedChange={() => toggleColumn(col.id)}
                                  className="h-3.5 w-3.5"
                                  data-testid={`checkbox-column-${col.id}`}
                                />
                                <span className="truncate" title={col.tooltip}>{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Reorder Section */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold text-gray-700">Reorder Columns</h5>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetColumnOrder} 
                        className="h-6 text-xs px-2 gap-1"
                        data-testid="button-reset-order"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Default Order
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Use arrows to reorder visible columns:</p>
                    <div className="max-h-[200px] overflow-y-auto border rounded p-1 space-y-0.5">
                      {orderedColumns.filter(col => visibleColumns.has(col.id)).map((col, index, arr) => (
                        <div 
                          key={col.id} 
                          className="flex items-center justify-between p-1.5 rounded bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs font-medium">{col.label}</span>
                            <span className="text-xs text-gray-400">{col.tooltip}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveColumnUp(col.id)}
                              disabled={index === 0}
                              data-testid={`button-move-up-${col.id}`}
                            >
                              <MoveUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveColumnDown(col.id)}
                              disabled={index === arr.length - 1}
                              data-testid={`button-move-down-${col.id}`}
                            >
                              <MoveDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <span className="text-xs sm:text-sm text-gray-600" data-testid="text-results-count">
              Showing {filteredAndSortedPlayers.length} players
            </span>
          </div>
        </div>
      </div>

      {/* Venue filter notice */}
      {venueFilter !== 'all' && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-700">
            Showing {venueFilter === 'home' ? 'Home' : 'Away'} matches only 
            {venueStatsData && Object.keys(venueStatsData).length === 0 && (
              <span className="ml-2 text-blue-600">
                (Venue data not yet available - showing all matches)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Zoom Control */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3 max-w-lg">
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Zoom:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
            disabled={zoomLevel <= 50}
            className="h-7 w-7 p-0"
            data-testid="button-zoom-out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Slider
            value={[zoomLevel]}
            onValueChange={(value) => setZoomLevel(value[0])}
            min={50}
            max={200}
            step={10}
            className="flex-1 min-w-[100px]"
            data-testid="slider-table-zoom"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
            disabled={zoomLevel >= 200}
            className="h-7 w-7 p-0"
            data-testid="button-zoom-in"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold text-gray-900 w-10 text-center" data-testid="text-zoom-level">
            {zoomLevel}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(100)}
            className="h-7 px-2 text-xs"
            data-testid="button-reset-zoom"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Comprehensive Player Statistics Table */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto" 
        style={{ position: 'relative' }}
      >
        <div 
          style={{ 
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoomLevel / 100)}%`,
          }}
        >
        <table className="fpl-table text-sm min-w-[800px] w-full lg:min-w-full xl:min-w-full">
          <thead className="fpl-table-header">
            <tr>
              <th className="px-3 py-3 text-left min-w-[100px] text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r">
                Player
              </th>
              <th className="hidden md:table-cell px-1 py-2 text-center min-w-[40px] text-xs font-medium text-gray-500 uppercase tracking-wider">
                D
              </th>
              {onPlayerCompareClick && (
                <th className="hidden md:table-cell px-1 py-2 text-center min-w-[40px] text-xs font-medium text-gray-500 uppercase tracking-wider">
                  C
                </th>
              )}
              {/* Dynamic columns in user's custom order */}
              {orderedColumns.filter(col => visibleColumns.has(col.id)).map(col => (
                <th key={col.id} className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field={col.field} label={col.label} tooltip={col.tooltip} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedPlayers.map((player, index) => {
              const position = getPositionName(player);
              const teamName = getTeamName(player);
              const netTransfers = (player.transfers_in_event || 0) - (player.transfers_out_event || 0);
              
              return (
                <tr key={player.id} className="hover:bg-gray-50" data-testid={`row-player-${player.id}`}>
                  <td className="px-4 py-4 sticky left-0 bg-white hover:bg-gray-50 border-r min-w-[140px]">
                    <div className="flex items-center">
                      <div>
                        <div 
                          className="text-sm font-medium text-gray-900 hover:text-purple-700 cursor-pointer hover:underline"
                          onClick={() => navigate(`/player/${player.id}?from=${encodeURIComponent(window.location.pathname)}`)}
                        >
                          {player.web_name}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge className={`text-xs px-1 py-0 h-4 ${
                            position === 'GKP' ? 'bg-yellow-100 text-yellow-800' :
                            position === 'DEF' ? 'bg-green-100 text-green-800' :
                            position === 'MID' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {position}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-gray-600">
                            {teamName}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-1 py-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/player/${player.id}?from=${encodeURIComponent(window.location.pathname)}`)}
                      className="h-4 w-4 p-0 hover:bg-blue-50 hover:border-blue-300"
                      title="View detailed gameweek statistics"
                      data-testid={`button-player-details-${player.id}`}
                    >
                      <Eye className="h-1.5 w-1.5" />
                    </Button>
                  </td>
                  {onPlayerCompareClick && (
                    <td className="hidden md:table-cell px-1 py-2 text-center">
                      {compareList.some(p => p.id === player.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPlayerCompareClick?.(player)}
                          className="h-4 w-4 p-0 hover:bg-red-50 hover:border-red-300 border-red-300 text-red-600"
                          title="Remove from comparison"
                          data-testid={`button-player-remove-compare-${player.id}`}
                        >
                          <UserMinus className="h-1.5 w-1.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPlayerCompareClick?.(player)}
                          className="h-4 w-4 p-0 hover:bg-green-50 hover:border-green-300"
                          title="Add to comparison"
                          disabled={maxCompareReached}
                          data-testid={`button-player-add-compare-${player.id}`}
                        >
                          <UserPlus className="h-1.5 w-1.5" />
                        </Button>
                      )}
                    </td>
                  )}
                  {/* Dynamic columns in user's custom order */}
                  {orderedColumns.filter(col => visibleColumns.has(col.id)).map(col => (
                    <td key={col.id} className="px-2 py-4 text-center text-sm font-medium">
                      {renderCellContent(col.id, player, position)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Table Footer with Pagination */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600" data-testid="text-pagination-info">
            Showing <span className="font-medium text-blue-600">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
            <span className="font-medium text-blue-600">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedPlayers.length)}</span> of{" "}
            <span className="font-medium text-blue-600">{filteredAndSortedPlayers.length}</span> players
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? "bg-fpl-purple text-white" : ""}
                    data-testid={`button-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-3 py-1 text-sm text-gray-400">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    data-testid={`button-page-${totalPages}`}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
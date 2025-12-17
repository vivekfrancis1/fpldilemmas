import { useMemo, useState, useRef, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Eye, UserPlus, UserMinus, ZoomIn, ZoomOut, Settings2, Check } from "lucide-react";
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
  'now_cost', 'games_played', 'total_points', 'goals_scored', 'assists', 'clean_sheets',
  'defensive_contribution', 'defensive_contribution_points', 'value_season', 'points_per_game',
  'form', 'selected_by_percent', 'expected_goals', 'expected_assists', 'expected_goal_involvements',
  'minutes', 'bonus', 'bps'
];

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
  filters: FilterState;
  sort: SortState;
  setSort: (sort: SortState) => void;
  isLoading: boolean;
  season?: string;
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

export default function PlayerStatsTable({ 
  data, 
  historicalData,
  filters, 
  sort, 
  setSort, 
  isLoading,
  season,
  onPlayerDetailsClick,
  onPlayerCompareClick,
  compareList = [],
  maxCompareReached = false
}: PlayerStatsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [displayMode, setDisplayMode] = useState<'totals' | 'per_match' | 'per_start' | 'per_90'>('totals');
  const [venueFilter, setVenueFilter] = useState<'all' | 'home' | 'away'>('all');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Save visible columns to localStorage
  useEffect(() => {
    localStorage.setItem('playerStatsVisibleColumns', JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

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

  // Select all columns
  const selectAllColumns = () => {
    setVisibleColumns(new Set(COLUMN_DEFINITIONS.map(c => c.id)));
  };

  // Reset to default columns
  const resetColumns = () => {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
  };

  // Reset horizontal scroll position when zoom changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [zoomLevel]);
  
  // Check if we're viewing historical data - current season shows defensive contribution fields
  const isHistoricalSeason = season && season !== "2025/26" && season !== "current";

  // Get available columns based on current mode
  const availableColumns = useMemo(() => {
    return COLUMN_DEFINITIONS.filter(col => {
      if (col.currentSeasonOnly && isHistoricalSeason) return false;
      if (col.totalsOnly && displayMode !== 'totals') return false;
      return true;
    });
  }, [displayMode, isHistoricalSeason]);

  // Check if column should be visible
  const isColumnVisible = (columnId: string) => {
    const col = COLUMN_DEFINITIONS.find(c => c.id === columnId);
    if (!col) return false;
    if (col.currentSeasonOnly && isHistoricalSeason) return false;
    if (col.totalsOnly && displayMode !== 'totals') return false;
    return visibleColumns.has(columnId);
  };
  
  // Fetch CBIT points data from the API
  const { data: cbitPointsData, isLoading: isCbitPointsLoading, isError: isCbitPointsError } = useQuery<CbitPointsData>({
    queryKey: ['/api/player-cbit-points'],
    enabled: !isHistoricalSeason, // Only fetch for current season
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
  });

  // Fetch Save points data from the API
  const { data: savePointsData, isLoading: isSavePointsLoading, isError: isSavePointsError } = useQuery<SavePointsData>({
    queryKey: ['/api/player-save-points'],
    enabled: !isHistoricalSeason, // Only fetch for current season
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
  });

  // Fetch Minutes points data from the API
  const { data: minutesPointsData, isLoading: isMinutesPointsLoading, isError: isMinutesPointsError } = useQuery<MinutesPointsData>({
    queryKey: ['/api/player-minutes-points'],
    enabled: !isHistoricalSeason, // Only fetch for current season
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
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

  const filteredAndSortedPlayers = useMemo(() => {
    // Use historical data if available, otherwise use current season data
    let players: any[] = [];
    
    if (historicalData && Array.isArray(historicalData) && historicalData.length > 0) {
      players = [...historicalData];
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
  }, [data, historicalData, filters, sort, venueFilter, venueStatsData]);

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
              <PopoverContent className="w-80 max-h-[400px] overflow-y-auto" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-semibold text-sm">Select Columns</h4>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={selectAllColumns} className="h-7 text-xs px-2">
                        All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={resetColumns} className="h-7 text-xs px-2">
                        Reset
                      </Button>
                    </div>
                  </div>
                  {['core', 'performance', 'defensive', 'expected', 'transfers', 'other'].map(category => {
                    const categoryColumns = availableColumns.filter(c => c.category === category);
                    if (categoryColumns.length === 0) return null;
                    return (
                      <div key={category} className="space-y-2">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase">{CATEGORY_LABELS[category]}</h5>
                        <div className="grid grid-cols-2 gap-1">
                          {categoryColumns.map(col => (
                            <label
                              key={col.id}
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={visibleColumns.has(col.id)}
                                onCheckedChange={() => toggleColumn(col.id)}
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
        <div className="flex items-center gap-4 max-w-md">
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Table Zoom:</span>
          </div>
          <Slider
            value={[zoomLevel]}
            onValueChange={(value) => setZoomLevel(value[0])}
            min={50}
            max={200}
            step={10}
            className="flex-1"
            data-testid="slider-table-zoom"
          />
          <ZoomIn className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-semibold text-gray-900 w-12 text-center" data-testid="text-zoom-level">
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
              {/* Dynamic columns based on visibility */}
              {isColumnVisible('now_cost') && (
                <th className="px-1 py-1.5 text-center min-w-[50px]">
                  <SortableHeader field="now_cost" label="£" tooltip="Price" />
                </th>
              )}
              {isColumnVisible('games_played') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="games_played" label="MP" tooltip="Matches Played" />
                </th>
              )}
              {isColumnVisible('total_points') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="total_points" label="Pts" tooltip="Total Points" />
                </th>
              )}
              {isColumnVisible('goals_scored') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="goals_scored" label="G" tooltip="Goals Scored" />
                </th>
              )}
              {isColumnVisible('assists') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="assists" label="A" tooltip="Assists" />
                </th>
              )}
              {isColumnVisible('clean_sheets') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="clean_sheets" label="CS" tooltip="Clean Sheets" />
                </th>
              )}
              {isColumnVisible('defensive_contribution') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="defensive_contribution" label="DC" tooltip="Defensive Contribution" />
                </th>
              )}
              {isColumnVisible('defensive_contribution_points') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="defensive_contribution_points" label="DCP" tooltip="Defensive Contribution Points" />
                </th>
              )}
              {isColumnVisible('value_season') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="value_season" label="Val" tooltip="Value (Points per Million)" />
                </th>
              )}
              {isColumnVisible('points_per_game') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="points_per_game" label="PPG" tooltip="Points Per Game" />
                </th>
              )}
              {isColumnVisible('form') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="form" label="Form" tooltip="Form (Last 5 Gameweeks)" />
                </th>
              )}
              {isColumnVisible('selected_by_percent') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="selected_by_percent" label="Own%" tooltip="Ownership Percentage" />
                </th>
              )}
              {isColumnVisible('expected_goals') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="expected_goals" label="xG" tooltip="Expected Goals" />
                </th>
              )}
              {isColumnVisible('expected_assists') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="expected_assists" label="xA" tooltip="Expected Assists" />
                </th>
              )}
              {isColumnVisible('expected_goal_involvements') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="expected_goal_involvements" label="xGI" tooltip="Expected Goal Involvements" />
                </th>
              )}
              {isColumnVisible('expected_goals_conceded') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="expected_goals_conceded" label="xGC" tooltip="Expected Goals Conceded" />
                </th>
              )}
              {isColumnVisible('minutes') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="minutes" label="Min" tooltip="Minutes Played" />
                </th>
              )}
              {isColumnVisible('goals_conceded') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="goals_conceded" label="GC" tooltip="Goals Conceded" />
                </th>
              )}
              {isColumnVisible('saves') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="saves" label="Sav" tooltip="Saves" />
                </th>
              )}
              {isColumnVisible('save_points') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="save_points" label="SavP" tooltip="Save Points" />
                </th>
              )}
              {isColumnVisible('minutes_points') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="minutes_points" label="MinP" tooltip="Minutes Points" />
                </th>
              )}
              {isColumnVisible('tackles') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="tackles" label="Tck" tooltip="Tackles" />
                </th>
              )}
              {isColumnVisible('recoveries') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="recoveries" label="Rec" tooltip="Recoveries" />
                </th>
              )}
              {isColumnVisible('clearances_blocks_interceptions') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="clearances_blocks_interceptions" label="CBI" tooltip="Clearances, Blocks, Interceptions" />
                </th>
              )}
              {isColumnVisible('starts') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="starts" label="Starts" />
                </th>
              )}
              {isColumnVisible('bonus') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="bonus" label="Bonus" />
                </th>
              )}
              {isColumnVisible('bps') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="bps" label="BPS" />
                </th>
              )}
              {isColumnVisible('event_points') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="event_points" label="GW Pts" />
                </th>
              )}
              {isColumnVisible('transfers_in_event') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="transfers_in_event" label="GW In" />
                </th>
              )}
              {isColumnVisible('transfers_out_event') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="transfers_out_event" label="GW Out" />
                </th>
              )}
              {isColumnVisible('transfers_in') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="transfers_in" label="Total In" />
                </th>
              )}
              {isColumnVisible('transfers_out') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="transfers_out" label="Total Out" />
                </th>
              )}
              {isColumnVisible('value_form') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="value_form" label="Val Form" />
                </th>
              )}
              {isColumnVisible('influence') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="influence" label="Influence" />
                </th>
              )}
              {isColumnVisible('creativity') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="creativity" label="Creativity" />
                </th>
              )}
              {isColumnVisible('threat') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="threat" label="Threat" />
                </th>
              )}
              {isColumnVisible('ict_index') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="ict_index" label="ICT" />
                </th>
              )}
              {isColumnVisible('dreamteam_count') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="dreamteam_count" label="Dream Team" />
                </th>
              )}
              {isColumnVisible('penalties_saved') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="penalties_saved" label="Pen Saved" />
                </th>
              )}
              {isColumnVisible('penalties_missed') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="penalties_missed" label="Pen Missed" />
                </th>
              )}
              {isColumnVisible('yellow_cards') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="yellow_cards" label="Yellow" />
                </th>
              )}
              {isColumnVisible('red_cards') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="red_cards" label="Red" />
                </th>
              )}
              {isColumnVisible('own_goals') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="own_goals" label="Own Goals" />
                </th>
              )}
              {isColumnVisible('cost_change_event') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="cost_change_event" label="Price Δ GW" />
                </th>
              )}
              {isColumnVisible('cost_change_start') && (
                <th className="px-1 py-1 text-center min-w-[50px]">
                  <SortableHeader field="cost_change_start" label="Price Δ Start" />
                </th>
              )}

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
                        <div className="text-sm font-medium text-gray-900">
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
                      onClick={() => onPlayerDetailsClick?.(player)}
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
                  {/* Dynamic columns based on visibility */}
                  {isColumnVisible('now_cost') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">
                      £{((player.now_cost || player.end_cost || 0) / 10).toFixed(1)}m
                    </td>
                  )}
                  {isColumnVisible('games_played') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">
                      {(() => {
                        const pointsPerGame = parseFloat(player.points_per_game) || 0;
                        return pointsPerGame > 0 ? Math.round(player.total_points / pointsPerGame) : 0;
                      })()}
                    </td>
                  )}
                  {isColumnVisible('total_points') && (
                    <td className="px-2 py-4 text-center text-sm font-bold text-fpl-purple">{calculateStat(player, player.total_points || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('goals_scored') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-600">{calculateStat(player, player.goals_scored || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('assists') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-blue-600">{calculateStat(player, player.assists || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('clean_sheets') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-600">{calculateStat(player, player.clean_sheets || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('defensive_contribution') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-orange-600">{calculateStat(player, player.defensive_contribution || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('defensive_contribution_points') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-yellow-600" data-testid={`text-cbit-points-${player.id}`}>
                      {(() => {
                        if (isCbitPointsLoading) {
                          return <span className="text-gray-400">...</span>;
                        }
                        if (isCbitPointsError) {
                          return <span className="text-gray-400" title="CBIT points data unavailable">N/A</span>;
                        }
                        return calculateStat(player, getCbitPoints(player.id)).toFixed(displayMode === 'totals' ? 0 : 1);
                      })()}
                    </td>
                  )}
                  {isColumnVisible('value_season') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-700 font-semibold">{calculateStat(player, parseFloat(player.value_season || player.value_form || 0)).toFixed(1)}</td>
                  )}
                  {isColumnVisible('points_per_game') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{calculateStat(player, parseFloat(player.points_per_game || player.form || 0)).toFixed(1)}</td>
                  )}
                  {isColumnVisible('form') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{calculateStat(player, parseFloat(player.form || 0)).toFixed(1)}</td>
                  )}
                  {isColumnVisible('selected_by_percent') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-purple-700">{formatValue(player.selected_by_percent || 0, 'decimal')}%</td>
                  )}
                  {isColumnVisible('expected_goals') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-purple-600">{calculateStat(player, parseFloat(player.expected_goals || 0)).toFixed(1)}</td>
                  )}
                  {isColumnVisible('expected_assists') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-blue-600">{calculateStat(player, parseFloat(player.expected_assists || 0)).toFixed(1)}</td>
                  )}
                  {isColumnVisible('expected_goal_involvements') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-indigo-600">{calculateStat(player, parseFloat(player.expected_goal_involvements || 0)).toFixed(1)}</td>
                  )}
                  {isColumnVisible('expected_goals_conceded') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{calculateStat(player, parseFloat(player.expected_goals_conceded || 0)).toFixed(1)}</td>
                  )}
                  {isColumnVisible('minutes') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{displayMode === 'totals' ? (player.minutes || 0) : calculateStat(player, player.minutes || 0).toFixed(0)}</td>
                  )}
                  {isColumnVisible('goals_conceded') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{calculateStat(player, player.goals_conceded || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('saves') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{calculateStat(player, player.saves || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('save_points') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-blue-600" data-testid={`text-save-points-${player.id}`}>
                      {(() => {
                        const position = getPositionName(player);
                        if (position !== 'GKP') {
                          return <span className="text-gray-400">-</span>;
                        }
                        if (isSavePointsLoading) {
                          return <span className="text-gray-400">...</span>;
                        }
                        if (isSavePointsError) {
                          return <span className="text-gray-400" title="Save points data unavailable">N/A</span>;
                        }
                        return calculateStat(player, getSavePoints(player.id)).toFixed(displayMode === 'totals' ? 0 : 1);
                      })()} 
                    </td>
                  )}
                  {isColumnVisible('minutes_points') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-orange-600" data-testid={`text-minutes-points-${player.id}`}>
                      {(() => {
                        if (isMinutesPointsLoading) {
                          return <span className="text-gray-400">...</span>;
                        }
                        if (isMinutesPointsError) {
                          return <span className="text-gray-400" title="Minutes points data unavailable">N/A</span>;
                        }
                        return calculateStat(player, getMinutesPoints(player.id)).toFixed(displayMode === 'totals' ? 0 : 1);
                      })()}
                    </td>
                  )}
                  {isColumnVisible('tackles') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-blue-700">{calculateStat(player, player.tackles || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('recoveries') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-700">{calculateStat(player, player.recoveries || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('clearances_blocks_interceptions') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-purple-700">{calculateStat(player, player.clearances_blocks_interceptions || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('starts') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{player.starts || 0}</td>
                  )}
                  {isColumnVisible('bonus') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{calculateStat(player, player.bonus || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('bps') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{calculateStat(player, player.bps || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('event_points') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-fpl-purple">{calculateStat(player, player.event_points || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('transfers_in_event') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-600">{(player.transfers_in_event || 0).toLocaleString()}</td>
                  )}
                  {isColumnVisible('transfers_out_event') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{(player.transfers_out_event || 0).toLocaleString()}</td>
                  )}
                  {isColumnVisible('transfers_in') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-600">{(player.transfers_in || 0).toLocaleString()}</td>
                  )}
                  {isColumnVisible('transfers_out') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{(player.transfers_out || 0).toLocaleString()}</td>
                  )}
                  {isColumnVisible('value_form') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-700 font-semibold">{formatValue(player.value_form || 0, 'decimal')}</td>
                  )}
                  {isColumnVisible('influence') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{formatValue(player.influence || 0, 'decimal')}</td>
                  )}
                  {isColumnVisible('creativity') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{formatValue(player.creativity || 0, 'decimal')}</td>
                  )}
                  {isColumnVisible('threat') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">{formatValue(player.threat || 0, 'decimal')}</td>
                  )}
                  {isColumnVisible('ict_index') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-fpl-purple">{formatValue(player.ict_index || 0, 'decimal')}</td>
                  )}
                  {isColumnVisible('dreamteam_count') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-yellow-600">{player.dreamteam_count || 0}</td>
                  )}
                  {isColumnVisible('penalties_saved') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-green-600">{calculateStat(player, player.penalties_saved || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('penalties_missed') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{calculateStat(player, player.penalties_missed || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('yellow_cards') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-yellow-600">{calculateStat(player, player.yellow_cards || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('red_cards') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{calculateStat(player, player.red_cards || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('own_goals') && (
                    <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{calculateStat(player, player.own_goals || 0).toFixed(displayMode === 'totals' ? 0 : 1)}</td>
                  )}
                  {isColumnVisible('cost_change_event') && (
                    <td className="px-2 py-4 text-center text-sm font-medium">
                      <div className="flex items-center justify-center">
                        <span className={(player.cost_change_event || 0) > 0 ? 'text-green-600' : (player.cost_change_event || 0) < 0 ? 'text-red-600' : 'text-gray-900'}>
                          {(player.cost_change_event || 0) > 0 ? '+' : ''}{formatValue((player.cost_change_event || 0) / 10, 'decimal')}
                        </span>
                      </div>
                    </td>
                  )}
                  {isColumnVisible('cost_change_start') && (
                    <td className="px-2 py-4 text-center text-sm font-medium">
                      <div className="flex items-center justify-center">
                        <span className={(player.cost_change_start || 0) > 0 ? 'text-green-600' : (player.cost_change_start || 0) < 0 ? 'text-red-600' : 'text-gray-900'}>
                          {(player.cost_change_start || 0) > 0 ? '+' : ''}{formatValue((player.cost_change_start || 0) / 10, 'decimal')}
                        </span>
                      </div>
                    </td>
                  )}

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
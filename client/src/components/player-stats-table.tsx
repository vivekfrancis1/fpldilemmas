import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { BootstrapData, Player, Team, ElementType } from "@shared/schema";
import { FilterState, SortState, SortableField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PlayerStatsTableProps {
  data?: BootstrapData;
  historicalData?: any[];
  filters: FilterState;
  sort: SortState;
  setSort: (sort: SortState) => void;
  isLoading: boolean;
  season?: string;
}

const ITEMS_PER_PAGE = 20;

export default function PlayerStatsTable({ 
  data, 
  historicalData,
  filters, 
  sort, 
  setSort, 
  isLoading,
  season 
}: PlayerStatsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedPlayers = useMemo(() => {
    // Use historical data if available, otherwise use current season data
    let players: any[] = [];
    
    if (historicalData && Array.isArray(historicalData) && historicalData.length > 0) {
      players = [...historicalData];
    } else if (data && data.elements && Array.isArray(data.elements)) {
      players = [...data.elements];
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
          default: return player.total_points;
        }
      };

      const aValue = getValue(a, sort.field);
      const bValue = getValue(b, sort.field);

      return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
    });

    return players;
  }, [data, historicalData, filters, sort]);

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
    // For current season, use element_type lookup
    const elementType = player.element_type;
    return data?.element_types.find(type => type.id === elementType)?.singular_name_short || "";
  };

  const formatPrice = (cost: number): string => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  // Helper function to create sortable column headers
  const SortableHeader = ({ field, label, className = "" }: { 
    field: SortableField; 
    label: string; 
    className?: string;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center justify-center gap-1 hover:text-blue-600 transition-colors font-semibold text-gray-900 text-xs sm:text-sm ${className}`}
      data-testid={`sort-${field}`}
    >
      <span className="truncate">{label}</span>
      {sort.field === field && (
        <div className="flex-shrink-0">
          {sort.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
        </div>
      )}
      {sort.field !== field && (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
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

  // Check if we're viewing historical data - current season shows defensive contribution fields
  const isHistoricalSeason = season && season !== "2025/26" && season !== "current";

  if (isLoading) {
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
          <div className="flex items-center space-x-4">
            <span className="text-xs sm:text-sm text-gray-600" data-testid="text-results-count">
              Showing {filteredAndSortedPlayers.length} players
            </span>
          </div>
        </div>
      </div>

      {/* Comprehensive Player Statistics Table */}
      <div className="overflow-x-auto">
        <table className="fpl-table text-xs min-w-[800px] w-full lg:min-w-full xl:min-w-full">
          <thead className="fpl-table-header">
            <tr>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left min-w-[120px] sm:min-w-[160px] font-semibold text-gray-900 text-xs sm:text-sm sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                Player
              </th>
              <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[40px] sm:min-w-[50px] font-semibold text-gray-900 text-xs sm:text-sm">Team</th>
              <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[35px] sm:min-w-[50px] font-semibold text-gray-900 text-xs sm:text-sm">Pos</th>
              {/* Priority columns first */}
              <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[60px] sm:min-w-[80px]">
                <SortableHeader field="now_cost" label="Price" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="total_points" label="Total Pts" />
              </th>
              {/* Key Performance Stats - immediately after points */}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="goals_scored" label="Goals" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="assists" label="Assists" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="clean_sheets" label="CS" />
              </th>
              {/* New Defensive Contribution Fields - 2025/26 Season Only */}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[90px]">
                  <SortableHeader field="defensive_contribution" label="Def Contrib" />
                </th>
              )}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="value_season" label="Value" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="points_per_game" label="Pts/Match" />
              </th>
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="form" label="Form" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="selected_by_percent" label="Own%" />
                </th>
              )}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="minutes" label="Minutes" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="goals_conceded" label="GC" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="saves" label="Saves" />
              </th>
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[90px]">
                  <SortableHeader field="tackles" label="Tackles" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[90px]">
                  <SortableHeader field="recoveries" label="Recoveries" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[90px]">
                  <SortableHeader field="clearances_blocks_interceptions" label="CBI" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="starts" label="Starts" />
                </th>
              )}
              {/* All other data points */}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="bonus" label="Bonus" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="bps" label="BPS" />
              </th>
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="event_points" label="GW Pts" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="transfers_in_event" label="GW In" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="transfers_out_event" label="GW Out" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="transfers_in" label="Total In" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="transfers_out" label="Total Out" />
                </th>
              )}
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="value_form" label="Val Form" />
                </th>
              )}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="influence" label="Influence" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="creativity" label="Creativity" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="threat" label="Threat" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="ict_index" label="ICT" />
              </th>
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="dreamteam_count" label="Dream Team" />
                </th>
              )}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="penalties_saved" label="Pen Saved" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="penalties_missed" label="Pen Missed" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="yellow_cards" label="Yellow" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="red_cards" label="Red" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="own_goals" label="Own Goals" />
              </th>
              {!isHistoricalSeason && (
                <th className="px-2 py-3 text-center min-w-[80px]">
                  <SortableHeader field="cost_change_event" label="Price Δ GW" />
                </th>
              )}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="cost_change_start" label="Price Δ Start" />
              </th>

            </tr>
          </thead>
          <tbody>
            {paginatedPlayers.map((player, index) => {
              const position = getPositionName(player);
              const teamName = getTeamName(player);
              const netTransfers = (player.transfers_in_event || 0) - (player.transfers_out_event || 0);
              
              return (
                <tr key={player.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`} data-testid={`row-player-${player.id}`}>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-left sticky left-0 bg-white dark:bg-gray-950 z-10 border-r border-gray-200">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">
                        {player.web_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                    <span className="text-xs text-gray-600">{teamName}</span>
                  </td>
                  <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                    <span className={`inline-block w-4 h-4 sm:w-6 sm:h-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${
                      position === 'GKP' ? 'bg-yellow-500' :
                      position === 'DEF' ? 'bg-green-500' :
                      position === 'MID' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`}>
                      {position.charAt(0)}
                    </span>
                  </td>
                  {/* Priority columns first */}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm font-medium text-gray-900">
                    <span className="text-xs sm:text-sm font-medium">£{((player.now_cost || player.end_cost || 0) / 10).toFixed(1)}m</span>
                  </td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm font-bold text-fpl-purple">{player.total_points || 0}</td>
                  {/* Key Performance Stats - immediately after points */}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm font-bold text-green-600">{player.goals_scored || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm font-bold text-blue-600">{player.assists || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm font-bold text-green-600">{player.clean_sheets || 0}</td>
                  {/* New Defensive Contribution Fields - 2025/26 Season Only */}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm font-bold text-orange-600">{player.defensive_contribution || 0}</td>
                  )}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-green-700 font-semibold">{formatValue(player.value_season || player.value_form || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{formatValue(player.points_per_game || player.form || 0, 'decimal')}</td>
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{formatValue(player.form || 0, 'decimal')}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm font-medium text-purple-700">{formatValue(player.selected_by_percent || 0, 'decimal')}%</td>
                  )}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{player.minutes || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-red-600">{player.goals_conceded || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{player.saves || 0}</td>
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-blue-700">{player.tackles || 0}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-green-700">{player.recoveries || 0}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-purple-700">{player.clearances_blocks_interceptions || 0}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{player.starts || 0}</td>
                  )}
                  {/* All other data points */}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{player.bonus || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{player.bps || 0}</td>
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm font-bold text-fpl-purple">{player.event_points || 0}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-green-600">{(player.transfers_in_event || 0).toLocaleString()}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-red-600">{(player.transfers_out_event || 0).toLocaleString()}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-green-600">{(player.transfers_in || 0).toLocaleString()}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-red-600">{(player.transfers_out || 0).toLocaleString()}</td>
                  )}
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-green-700 font-semibold">{formatValue(player.value_form || 0, 'decimal')}</td>
                  )}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{formatValue(player.influence || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{formatValue(player.creativity || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-gray-900">{formatValue(player.threat || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm font-medium text-fpl-purple">{formatValue(player.ict_index || 0, 'decimal')}</td>
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm text-yellow-600">{player.dreamteam_count || 0}</td>
                  )}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-green-600">{player.penalties_saved || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-red-600">{player.penalties_missed || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-yellow-600">{player.yellow_cards || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-red-600">{player.red_cards || 0}</td>
                  <td className="px-2 py-4 text-center text-xs sm:text-sm text-red-600">{player.own_goals || 0}</td>
                  {!isHistoricalSeason && (
                    <td className="px-2 py-4 text-center text-xs sm:text-sm">
                      <div className="flex items-center justify-center">
                        <span className={(player.cost_change_event || 0) > 0 ? 'text-green-600' : (player.cost_change_event || 0) < 0 ? 'text-red-600' : 'text-gray-900'}>
                          {(player.cost_change_event || 0) > 0 ? '+' : ''}{formatValue((player.cost_change_event || 0) / 10, 'decimal')}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-2 py-4 text-center text-xs sm:text-sm">
                    <div className="flex items-center justify-center">
                      <span className={(player.cost_change_start || 0) > 0 ? 'text-green-600' : (player.cost_change_start || 0) < 0 ? 'text-red-600' : 'text-gray-900'}>
                        {(player.cost_change_start || 0) > 0 ? '+' : ''}{formatValue((player.cost_change_start || 0) / 10, 'decimal')}
                      </span>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
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
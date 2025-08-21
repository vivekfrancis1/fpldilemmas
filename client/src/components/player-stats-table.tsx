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
    
    if (historicalData && historicalData.length > 0) {
      console.log(`Using historical data: ${historicalData.length} players`);
      players = [...historicalData];
    } else if (data && data.elements) {
      console.log(`Using current data: ${data.elements.length} players`);
      players = [...data.elements];
    } else {
      console.log("No data available - historicalData:", !!historicalData, "data:", !!data);
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
      players = players.filter(player => (player.now_cost || player.end_cost) <= maxPrice);
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
          default: return player.total_points;
        }
      };

      const aValue = getValue(a, sort.field);
      const bValue = getValue(b, sort.field);

      return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
    });

    return players;
  }, [data, filters, sort]);

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

  const getTeamName = (teamId: number): string => {
    return data?.teams.find(team => team.id === teamId)?.short_name || "";
  };

  const getPositionName = (elementType: number): string => {
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
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className={`h-auto p-2 text-xs font-medium justify-start hover:bg-gray-50 ${className}`}
      data-testid={`sort-${field}`}
    >
      <span className="truncate">{label}</span>
      {sort.field === field && (
        <div className="ml-1 flex-shrink-0">
          {sort.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
        </div>
      )}
      {sort.field !== field && (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-table-title">
            Complete Player Statistics - All Data Points
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600" data-testid="text-results-count">
              Showing {filteredAndSortedPlayers.length} players
            </span>
          </div>
        </div>
      </div>

      {/* Comprehensive Player Statistics Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[2400px]">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left min-w-[200px]">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Player</div>
              </th>
              {/* Priority columns first */}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="now_cost" label="Price" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="total_points" label="Total Pts" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="value_season" label="Value" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="points_per_game" label="Pts/Match" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="form" label="Form" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="selected_by_percent" label="Own%" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="minutes" label="Minutes" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="goals_scored" label="Goals" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="assists" label="Assists" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="clean_sheets" label="CS" />
              </th>
              {/* Defensive contributions */}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="goals_conceded" label="GC" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="saves" label="Saves" />
              </th>
              {/* All other data points */}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="bonus" label="Bonus" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="bps" label="BPS" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="event_points" label="GW Pts" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="transfers_in_event" label="GW In" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="transfers_out_event" label="GW Out" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="transfers_in" label="Total In" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="transfers_out" label="Total Out" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="value_form" label="Val Form" />
              </th>
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
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="dreamteam_count" label="Dream Team" />
              </th>
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
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="cost_change_event" label="Price Δ GW" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="cost_change_start" label="Price Δ Start" />
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">EP This</div>
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">EP Next</div>
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Squad #</div>
              </th>
              <th className="px-2 py-3 text-center min-w-[80px]">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedPlayers.map((player) => {
              const position = getPositionName(player.element_type);
              const teamName = getTeamName(player.team || player.team_id);
              const netTransfers = (player.transfers_in_event || 0) - (player.transfers_out_event || 0);
              
              return (
                <tr key={player.id} className="hover:bg-gray-50 transition-colors" data-testid={`row-player-${player.id}`}>
                  <td className="px-4 py-4 whitespace-nowrap min-w-[200px]">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-fpl-purple flex items-center justify-center text-white font-semibold text-xs">
                          {player.first_name[0]}{player.second_name[0]}
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{player.web_name}</div>
                        <div className="text-xs text-gray-500">
                          <Badge variant="outline" className={`mr-1 ${getPositionColor(position)}`}>
                            {position}
                          </Badge>
                          {teamName}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Priority columns first */}
                  <td className="px-2 py-4 text-center text-sm font-medium text-gray-900">
                    <div className="flex items-center justify-center">
                      {formatPrice(player.now_cost || player.end_cost || 0)}
                      {getPriceChangeIcon(player.cost_change_event || 0)}
                    </div>
                  </td>
                  <td className="px-2 py-4 text-center text-sm font-bold text-fpl-purple">{player.total_points || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-fpl-green font-medium">{formatValue(player.value_season || player.value_form || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{formatValue(player.points_per_game || player.form || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{formatValue(player.form || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{formatValue(player.selected_by_percent || 0, 'decimal')}%</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{player.minutes || 0}</td>
                  <td className="px-2 py-4 text-center text-sm font-bold text-green-600">{player.goals_scored || 0}</td>
                  <td className="px-2 py-4 text-center text-sm font-bold text-blue-600">{player.assists || 0}</td>
                  <td className="px-2 py-4 text-center text-sm font-bold text-green-600">{player.clean_sheets || 0}</td>
                  {/* Defensive contributions */}
                  <td className="px-2 py-4 text-center text-sm text-red-600">{player.goals_conceded || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{player.saves || 0}</td>
                  {/* All other data points */}
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{player.bonus || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{player.bps || 0}</td>
                  <td className="px-2 py-4 text-center text-sm font-bold text-fpl-purple">{player.event_points || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-green-600">{(player.transfers_in_event || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center text-sm text-red-600">{(player.transfers_out_event || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center text-sm text-green-600">{(player.transfers_in || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center text-sm text-red-600">{(player.transfers_out || 0).toLocaleString()}</td>
                  <td className="px-2 py-4 text-center text-sm text-fpl-green font-medium">{formatValue(player.value_form || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{formatValue(player.influence || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{formatValue(player.creativity || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{formatValue(player.threat || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm font-medium text-fpl-purple">{formatValue(player.ict_index || 0, 'decimal')}</td>
                  <td className="px-2 py-4 text-center text-sm text-yellow-600">{player.dreamteam_count || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-green-600">{player.penalties_saved || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-red-600">{player.penalties_missed || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-yellow-600">{player.yellow_cards || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-red-600">{player.red_cards || 0}</td>
                  <td className="px-2 py-4 text-center text-sm text-red-600">{player.own_goals || 0}</td>
                  <td className="px-2 py-4 text-center text-sm">
                    <div className="flex items-center justify-center">
                      <span className={(player.cost_change_event || 0) > 0 ? 'text-green-600' : (player.cost_change_event || 0) < 0 ? 'text-red-600' : 'text-gray-900'}>
                        {(player.cost_change_event || 0) > 0 ? '+' : ''}{formatValue((player.cost_change_event || 0) / 10, 'decimal')}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-4 text-center text-sm">
                    <div className="flex items-center justify-center">
                      <span className={(player.cost_change_start || 0) > 0 ? 'text-green-600' : (player.cost_change_start || 0) < 0 ? 'text-red-600' : 'text-gray-900'}>
                        {(player.cost_change_start || 0) > 0 ? '+' : ''}{formatValue((player.cost_change_start || 0) / 10, 'decimal')}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{player.ep_this || '-'}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{player.ep_next || '-'}</td>
                  <td className="px-2 py-4 text-center text-sm text-gray-900">{player.squad_number || '-'}</td>
                  <td className="px-2 py-4 text-center text-sm">
                    <Badge variant={(player.status === "a" || !player.status) ? "default" : player.status === "d" ? "secondary" : "destructive"}>
                      {player.status === "a" ? "Available" : player.status === "d" ? "Doubtful" : player.status ? "Unavailable" : "Available"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600" data-testid="text-pagination-info">
            Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
            <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedPlayers.length)}</span> of{" "}
            <span className="font-medium">{filteredAndSortedPlayers.length}</span> players
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
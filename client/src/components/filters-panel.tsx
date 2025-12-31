import { Search, RotateCcw } from "lucide-react";
import { FilterState } from "@/lib/types";
import { Team, ElementType } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface FiltersPanelProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  teams?: Team[];
  elementTypes?: ElementType[];
  isLoading: boolean;
  isHistorical?: boolean;
  // Gameweek filter props (only for current season)
  startGameweek?: number;
  endGameweek?: number | null;
  currentGameweek?: number;
  availableGameweeks?: number[];
  onStartGWChange?: (gw: number) => void;
  onEndGWChange?: (gw: number) => void;
  showGWFilters?: boolean;
}

export default function FiltersPanel({ 
  filters, 
  setFilters, 
  teams, 
  elementTypes, 
  isLoading,
  isHistorical = false,
  startGameweek = 1,
  endGameweek,
  currentGameweek = 19,
  availableGameweeks = [],
  onStartGWChange,
  onEndGWChange,
  showGWFilters = false
}: FiltersPanelProps) {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      position: "all",
      team: "all",
      maxPrice: "all",
    });
  };


  if (isLoading) {
    return (
      <div className="fpl-filters">
        <div className="fpl-card-header">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="fpl-card-content">
          {/* Search Section Loading */}
          <div className="mb-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
          
          {/* Filters Section Loading */}
          <div className="space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Clear Button Loading */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-filters">
      <div className="fpl-card-header">
        <div className="fpl-card-title">
          <Search className="h-5 w-5 text-blue-600" />
          Smart Filters & Search
        </div>
      </div>
      <div className="fpl-card-content">
        {/* Search Section */}
        <div className="mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search Players</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by player name..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>

        {/* All Filters in One Row */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${showGWFilters ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-3`}>
          {/* Position Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Position</label>
            <Select value={filters.position} onValueChange={(value) => handleFilterChange("position", value)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-position">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {elementTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.singular_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Team</label>
            <Select value={filters.team} onValueChange={(value) => handleFilterChange("team", value)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-team">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Price Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Max Price</label>
            <Select value={filters.maxPrice} onValueChange={(value) => handleFilterChange("maxPrice", value)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-max-price">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Price</SelectItem>
                <SelectItem value="40">Under £4.0m</SelectItem>
                <SelectItem value="45">Under £4.5m</SelectItem>
                <SelectItem value="50">Under £5.0m</SelectItem>
                <SelectItem value="55">Under £5.5m</SelectItem>
                <SelectItem value="60">Under £6.0m</SelectItem>
                <SelectItem value="65">Under £6.5m</SelectItem>
                <SelectItem value="70">Under £7.0m</SelectItem>
                <SelectItem value="75">Under £7.5m</SelectItem>
                <SelectItem value="80">Under £8.0m</SelectItem>
                <SelectItem value="85">Under £8.5m</SelectItem>
                <SelectItem value="90">Under £9.0m</SelectItem>
                <SelectItem value="95">Under £9.5m</SelectItem>
                <SelectItem value="100">Under £10.0m</SelectItem>
                <SelectItem value="105">Under £10.5m</SelectItem>
                <SelectItem value="110">Under £11.0m</SelectItem>
                <SelectItem value="115">Under £11.5m</SelectItem>
                <SelectItem value="120">Under £12.0m</SelectItem>
                <SelectItem value="125">Under £12.5m</SelectItem>
                <SelectItem value="130">Under £13.0m</SelectItem>
                <SelectItem value="135">Under £13.5m</SelectItem>
                <SelectItem value="140">Under £14.0m</SelectItem>
                <SelectItem value="145">Under £14.5m</SelectItem>
                <SelectItem value="150">Under £15.0m</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* From GW Filter - Only for current season */}
          {showGWFilters && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">From GW</label>
              <Select 
                value={startGameweek.toString()} 
                onValueChange={(val) => onStartGWChange?.(parseInt(val))}
              >
                <SelectTrigger className="h-9 text-sm" data-testid="select-start-gw">
                  <SelectValue placeholder="GW1" />
                </SelectTrigger>
                <SelectContent>
                  {availableGameweeks.map((gw) => (
                    <SelectItem 
                      key={gw} 
                      value={gw.toString()}
                      disabled={endGameweek !== null && endGameweek !== undefined && gw > endGameweek}
                    >
                      GW{gw}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* To GW Filter - Only for current season */}
          {showGWFilters && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">To GW</label>
              <Select 
                value={endGameweek?.toString() || currentGameweek.toString()} 
                onValueChange={(val) => onEndGWChange?.(parseInt(val))}
              >
                <SelectTrigger className="h-9 text-sm" data-testid="select-end-gw">
                  <SelectValue placeholder={`GW${currentGameweek}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableGameweeks.map((gw) => (
                    <SelectItem 
                      key={gw} 
                      value={gw.toString()}
                      disabled={gw < startGameweek}
                    >
                      GW{gw}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clear Button */}
          <div className="space-y-1 flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 w-full text-gray-600 hover:text-gray-900"
              data-testid="button-clear-filters"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

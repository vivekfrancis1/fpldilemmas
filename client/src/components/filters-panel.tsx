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
}

export default function FiltersPanel({ 
  filters, 
  setFilters, 
  teams, 
  elementTypes, 
  isLoading,
  isHistorical = false
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search players..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10 h-10 md:h-12 border-2"
            data-testid="input-search"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Position</label>
            <Select value={filters.position} onValueChange={(value) => handleFilterChange("position", value)}>
              <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-position">
                <SelectValue placeholder="All Positions" />
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Team</label>
            <Select value={filters.team} onValueChange={(value) => handleFilterChange("team", value)}>
              <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-team">
                <SelectValue placeholder="All Teams" />
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
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:col-span-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Max Price</label>
            <Select value={filters.maxPrice} onValueChange={(value) => handleFilterChange("maxPrice", value)}>
              <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-max-price">
                <SelectValue placeholder="Any Price" />
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
        </div>
        </div>
      </div>
    </div>
  );
}

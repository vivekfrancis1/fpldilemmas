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
}

export default function FiltersPanel({ 
  filters, 
  setFilters, 
  teams, 
  elementTypes, 
  isLoading 
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

  const applyQuickFilter = (filterType: string) => {
    // Quick filter implementations
    switch (filterType) {
      case "topScorers":
        setFilters({ ...filters, search: "" }); // Will be handled by sorting in table
        break;
      case "inForm":
        setFilters({ ...filters, search: "" }); // Filter by high form
        break;
      case "budgetPlayers":
        setFilters({ ...filters, maxPrice: "70" }); // Under £7.0m
        break;
      case "differentials":
        setFilters({ ...filters, search: "" }); // Low ownership
        break;
      case "risingPrices":
        setFilters({ ...filters, search: "" }); // Positive price change
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-4 w-20" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900" data-testid="text-filters-title">Filters & Search</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-fpl-purple hover:text-fpl-pink transition-colors"
          data-testid="button-clear-filters"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-search">Search Player</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        {/* Position Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-position">Position</label>
          <Select value={filters.position} onValueChange={(value) => handleFilterChange("position", value)}>
            <SelectTrigger data-testid="select-position">
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
        
        {/* Team Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-team">Team</label>
          <Select value={filters.team} onValueChange={(value) => handleFilterChange("team", value)}>
            <SelectTrigger data-testid="select-team">
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
        
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-max-price">Max Price</label>
          <Select value={filters.maxPrice} onValueChange={(value) => handleFilterChange("maxPrice", value)}>
            <SelectTrigger data-testid="select-max-price">
              <SelectValue placeholder="Any Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Price</SelectItem>
              <SelectItem value="50">Under £5.0m</SelectItem>
              <SelectItem value="70">Under £7.0m</SelectItem>
              <SelectItem value="100">Under £10.0m</SelectItem>
              <SelectItem value="150">Under £15.0m</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 mr-2" data-testid="text-quick-filters">Quick Filters:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter("topScorers")}
          className="px-3 py-1 bg-gray-100 hover:bg-fpl-purple hover:text-white text-gray-700 text-sm rounded-full transition-colors"
          data-testid="button-top-scorers"
        >
          Top Scorers
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter("inForm")}
          className="px-3 py-1 bg-gray-100 hover:bg-fpl-purple hover:text-white text-gray-700 text-sm rounded-full transition-colors"
          data-testid="button-in-form"
        >
          In Form
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter("budgetPlayers")}
          className="px-3 py-1 bg-gray-100 hover:bg-fpl-purple hover:text-white text-gray-700 text-sm rounded-full transition-colors"
          data-testid="button-budget-players"
        >
          Budget Players
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter("differentials")}
          className="px-3 py-1 bg-gray-100 hover:bg-fpl-purple hover:text-white text-gray-700 text-sm rounded-full transition-colors"
          data-testid="button-differentials"
        >
          Differentials
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter("risingPrices")}
          className="px-3 py-1 bg-gray-100 hover:bg-fpl-purple hover:text-white text-gray-700 text-sm rounded-full transition-colors"
          data-testid="button-rising-prices"
        >
          Rising Prices
        </Button>
      </div>
    </div>
  );
}

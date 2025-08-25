import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar } from "lucide-react";
import StatsCards from "../components/stats-cards";
import FiltersPanel from "../components/filters-panel";
import PlayerStatsTable from "../components/player-stats-table";
import { FilterState, SortState } from "@/lib/types";
import { BootstrapData } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function PlayerStats() {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    position: "all",
    team: "all",
    maxPrice: "all",
  });

  const [sort, setSort] = useState<SortState>({
    field: "total_points",
    direction: "desc",
  });

  const [selectedSeason, setSelectedSeason] = useState<string>("current");

  // Get available seasons
  const { data: seasons } = useQuery<string[]>({
    queryKey: ["/api/seasons"],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Get current season data
  const { data: bootstrapData, isLoading: currentLoading, error: currentError } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: selectedSeason === "current",
  });

  // Get historical season data
  const { data: historicalData, isLoading: historicalLoading, error: historicalError } = useQuery<any[]>({
    queryKey: ["/api/players/historical", selectedSeason],
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: selectedSeason !== "current",
    retry: 1,
  });

  const isLoading = selectedSeason === "current" ? currentLoading : historicalLoading;
  const error = selectedSeason === "current" ? currentError : historicalError;
  


  if (error) {
    return (
      
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50/30 overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 shadow-sm" data-testid="error-state">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load player data</h3>
                  <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API. Please check your connection and try again.</p>
                  <button 
                    className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    onClick={() => window.location.reload()}
                    data-testid="button-retry"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 lg:py-8">
          {/* Header Section */}
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4 px-2" data-testid="text-page-title">
              Player Statistics
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2" data-testid="text-page-description">
              Comprehensive player performance data and analytics for informed FPL decisions. 
              Filter, sort, and analyze every player in the Premier League.
            </p>
            
            {/* Season Selector */}
            <div className="flex justify-center mt-4 sm:mt-6 px-2">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="w-40 sm:w-48" data-testid="select-season">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">
                      <div className="flex items-center space-x-2">
                        <span>2025-26 (Current)</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          Live
                        </Badge>
                      </div>
                    </SelectItem>
                    {seasons?.sort((a, b) => b.localeCompare(a)).map((season) => (
                      <SelectItem key={season} value={season}>
                        {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quick Stats Overview */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4" data-testid="text-quick-stats-title">
                Quick Stats Overview
              </h2>
              <StatsCards data={selectedSeason === "current" ? bootstrapData : undefined} isLoading={isLoading} />
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <FiltersPanel 
                filters={filters}
                setFilters={setFilters}
                teams={selectedSeason === "current" ? bootstrapData?.teams : undefined}
                elementTypes={selectedSeason === "current" ? bootstrapData?.element_types : undefined}
                isLoading={isLoading}
                isHistorical={selectedSeason !== "current"}
              />
            </div>
          </div>
          
          {/* Player Statistics Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <PlayerStatsTable 
              data={selectedSeason === "current" ? bootstrapData : undefined}
              historicalData={selectedSeason !== "current" ? (historicalData || []) : undefined}
              filters={filters}
              sort={sort}
              setSort={setSort}
              isLoading={isLoading}
              season={selectedSeason}
            />
          </div>

          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="loading-state">
              <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-700 font-medium">
                  {selectedSeason === "current" ? "Loading current player data..." : `Loading ${selectedSeason} season data...`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import Layout from "../components/layout";
import StatsCards from "../components/stats-cards";
import FiltersPanel from "../components/filters-panel";
import PlayerStatsTable from "../components/player-stats-table";
import { FilterState, SortState } from "@/lib/types";
import { BootstrapData } from "@shared/schema";

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

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4" data-testid="text-page-title">
              Player Statistics
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed" data-testid="text-page-description">
              Comprehensive player performance data and analytics for informed FPL decisions. 
              Filter, sort, and analyze every player in the Premier League.
            </p>
          </div>

          {/* Quick Stats Overview */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4" data-testid="text-quick-stats-title">
                Quick Stats Overview
              </h2>
              <StatsCards data={bootstrapData} isLoading={isLoading} />
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <FiltersPanel 
                filters={filters}
                setFilters={setFilters}
                teams={bootstrapData?.teams}
                elementTypes={bootstrapData?.element_types}
                isLoading={isLoading}
              />
            </div>
          </div>
          
          {/* Player Statistics Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <PlayerStatsTable 
              data={bootstrapData}
              filters={filters}
              sort={sort}
              setSort={setSort}
              isLoading={isLoading}
            />
          </div>

          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="loading-state">
              <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fpl-purple"></div>
                <span className="text-gray-700 font-medium">Loading player data...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
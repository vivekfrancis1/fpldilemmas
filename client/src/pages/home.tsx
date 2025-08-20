import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "../components/header";
import Footer from "../components/footer";
import StatsCards from "../components/stats-cards";
import FiltersPanel from "../components/filters-panel";
import PlayerStatsTable from "../components/player-stats-table";
import { FilterState, SortState } from "@/lib/types";
import { BootstrapData } from "@shared/schema";

export default function Home() {
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
      <div className="min-h-screen bg-fpl-light">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8" data-testid="error-state">
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
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fpl-light">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
            Player Stats Dashboard
          </h2>
          <p className="text-gray-600" data-testid="text-page-description">
            Analyze player performance, value, and upcoming fixtures to make informed FPL decisions
          </p>
        </div>

        <StatsCards data={bootstrapData} isLoading={isLoading} />
        
        <FiltersPanel 
          filters={filters}
          setFilters={setFilters}
          teams={bootstrapData?.teams}
          elementTypes={bootstrapData?.element_types}
          isLoading={isLoading}
        />
        
        <PlayerStatsTable 
          data={bootstrapData}
          filters={filters}
          sort={sort}
          setSort={setSort}
          isLoading={isLoading}
        />
      </main>

      <Footer />

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="loading-state">
          <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fpl-purple"></div>
            <span className="text-gray-700 font-medium">Loading player data...</span>
          </div>
        </div>
      )}
    </div>
  );
}

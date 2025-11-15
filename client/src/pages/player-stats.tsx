import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar } from "lucide-react";
import { LoadingExperience } from "@/components/loading-experience";
import StatsCards from "../components/stats-cards";
import FiltersPanel from "../components/filters-panel";
import PlayerStatsTable from "../components/player-stats-table";
import PlayerGameweekModal from "../components/player-gameweek-modal";
import PlayerComparisonModal from "../components/player-comparison-modal";
import { FilterState, SortState } from "@/lib/types";
import { BootstrapData } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Comparison state
  const [compareList, setCompareList] = useState<any[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

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

  // Fetch detailed player data when a player is selected
  const { data: playerDetailData, isLoading: isLoadingPlayerDetail } = useQuery<any>({
    queryKey: ["/api/element-summary", selectedPlayer?.id],
    enabled: !!selectedPlayer?.id && selectedSeason === "current",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle player details click
  const handlePlayerDetailsClick = (player: any) => {
    // Add team name to player data for the modal
    const teamName = bootstrapData?.teams.find(t => t.id === player.team)?.short_name || 'Unknown';
    setSelectedPlayer({ ...player, team_name: teamName });
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };

  // Handle player comparison
  const handlePlayerCompareClick = (player: any) => {
    const isPlayerInList = compareList.some(p => p.id === player.id);
    
    if (isPlayerInList) {
      // Remove player from comparison list
      setCompareList(prev => prev.filter(p => p.id !== player.id));
    } else {
      // Add player to comparison list (max 5)
      if (compareList.length < 5) {
        const teamName = bootstrapData?.teams.find(t => t.id === player.team)?.short_name || 'Unknown';
        setCompareList(prev => [...prev, { ...player, team_name: teamName }]);
      }
    }
  };

  // Handle compare modal open
  const handleCompareModalOpen = () => {
    if (compareList.length >= 2) {
      setIsCompareModalOpen(true);
    }
  };

  // Handle compare modal close
  const handleCompareModalClose = () => {
    setIsCompareModalOpen(false);
  };

  // Check if max compare reached
  const maxCompareReached = compareList.length >= 5;

  


  if (error) {
    return (
      <div className="fpl-page-container">
        <div className="flex justify-center items-center min-h-screen">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <h1 className="text-lg font-semibold text-red-800 mb-3">Failed to load player data</h1>
            <p className="text-sm text-red-600 mb-4">Unable to connect to FPL API. Please check your connection and try again.</p>
            <button 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              onClick={() => window.location.reload()}
              data-testid="button-retry"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Page Header - Simplified */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <BarChart3 className="h-8 w-8" />
            <h1>Player Statistics</h1>
          </div>
          <p className="fpl-page-subtitle">
            Comprehensive player performance data and analytics for informed FPL decisions with historical season coverage
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">
        {/* Season Selector */}
        <Card className="mb-6 shadow-md border-0 bg-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <span className="text-xs sm:text-sm font-semibold text-gray-700">Season:</span>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-full sm:w-48 bg-white text-sm" data-testid="select-season">
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
          </CardContent>
        </Card>

        {/* Quick Stats Overview */}
        <Card className="mb-6 shadow-md border-0">
          <CardContent className="p-3 sm:p-4">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3" data-testid="text-quick-stats-title">
              Quick Stats Overview
            </h2>
            <StatsCards data={selectedSeason === "current" ? bootstrapData : undefined} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6 shadow-md border-0 bg-white">
          <CardContent className="p-3 sm:p-4">
            <FiltersPanel 
              filters={filters}
              setFilters={setFilters}
              teams={selectedSeason === "current" ? bootstrapData?.teams : undefined}
              elementTypes={selectedSeason === "current" ? bootstrapData?.element_types : undefined}
              isLoading={isLoading}
              isHistorical={selectedSeason !== "current"}
            />
          </CardContent>
        </Card>
          
        {/* Player Statistics Table */}
        <Card className="overflow-hidden shadow-lg border-0">
          <CardContent className="p-0">
            <PlayerStatsTable 
              data={selectedSeason === "current" ? bootstrapData : undefined}
              historicalData={selectedSeason !== "current" ? (historicalData || []) : undefined}
              filters={filters}
              sort={sort}
              setSort={setSort}
              isLoading={isLoading}
              season={selectedSeason}
              onPlayerDetailsClick={selectedSeason === "current" ? handlePlayerDetailsClick : undefined}
              onPlayerCompareClick={selectedSeason === "current" ? handlePlayerCompareClick : undefined}
              compareList={compareList}
              maxCompareReached={maxCompareReached}
            />
          </CardContent>
        </Card>
      </div>


      {/* Comparison Panel */}
      {compareList.length > 0 && (
        <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 sm:p-3 z-40 max-w-[90vw] sm:max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Compare Players ({compareList.length}/5)</h3>
            <button
              onClick={() => setCompareList([])}
              className="text-gray-400 hover:text-gray-600 text-xs"
              title="Clear all"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 mb-2">
            {compareList.map(player => (
              <div key={player.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{player.web_name}</span>
                <button
                  onClick={() => handlePlayerCompareClick(player)}
                  className="text-red-500 hover:text-red-700 ml-2 text-sm"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleCompareModalOpen}
            disabled={compareList.length < 2}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            data-testid="button-open-comparison"
          >
            Compare {compareList.length < 2 ? `(Need ${2 - compareList.length} more)` : ''}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="loading-state">
          <LoadingExperience
            variant="table"
            title={selectedSeason === "current" ? "Loading Current Season" : `Loading ${selectedSeason} Season`}
            description={selectedSeason === "current" 
              ? "Fetching live player statistics and performance data..." 
              : `Retrieving historical player data from ${selectedSeason} season...`}
            steps={[
              { text: "Loading player information", delay: "0s" },
              { text: "Fetching team and position data", delay: "0.2s" },
              { text: "Preparing statistics table", delay: "0.4s" },
            ]}
          />
        </div>
      )}

      {/* Player Gameweek Details Modal */}
      <PlayerGameweekModal
        player={selectedPlayer}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        data={playerDetailData}
        isLoading={isLoadingPlayerDetail}
      />

      {/* Player Comparison Modal */}
      <PlayerComparisonModal
        players={compareList}
        isOpen={isCompareModalOpen}
        onClose={handleCompareModalClose}
        currentSeasonData={bootstrapData}
      />
    </div>
  );
}
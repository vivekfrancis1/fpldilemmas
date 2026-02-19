import { useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";

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
  
  // Gameweek filter state
  const [startGameweek, setStartGameweek] = useState<number>(1);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  
  // Comparison state
  const [compareList, setCompareList] = useState<any[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Get available seasons
  const { data: seasons } = useQuery<string[]>({
    queryKey: ["/api/seasons"],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Get current season data (for metadata like teams, current gameweek)
  const { data: bootstrapData, isLoading: currentLoading, error: currentError } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: selectedSeason === "current",
  });

  // Determine if we need gameweek-filtered data
  const needsGameweekFilter = selectedSeason === "current" && (startGameweek !== 1 || (endGameweek !== null && endGameweek !== currentGameweek));

  // Get gameweek-filtered player stats when filters are used
  const { data: filteredStatsData, isLoading: filteredLoading, error: filteredError } = useQuery<{players: any[], gameweekRange: {start: number, end: number}}>({
    queryKey: [`/api/player-stats-by-gameweek?startGW=${startGameweek}&endGW=${endGameweek}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: selectedSeason === "current" && endGameweek !== null,
  });

  // Get historical season data
  const { data: historicalData, isLoading: historicalLoading, error: historicalError } = useQuery<any[]>({
    queryKey: ["/api/players/historical", selectedSeason],
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: selectedSeason !== "current",
    retry: 1,
  });

  const isLoading = selectedSeason === "current" 
    ? (currentLoading || (endGameweek !== null && filteredLoading)) 
    : historicalLoading;
  const error = selectedSeason === "current" 
    ? (filteredError || currentError) 
    : historicalError;

  // Calculate current gameweek from bootstrap data
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 26;
    const currentEvent = bootstrapData.events.find((event: any) => event.is_current);
    if (currentEvent) return currentEvent.id;
    const finishedEvents = bootstrapData.events.filter((event: any) => event.finished);
    return finishedEvents.length > 0 ? finishedEvents[finishedEvents.length - 1].id : 26;
  }, [bootstrapData?.events]);

  // Available gameweeks for dropdowns (1 to current gameweek)
  const availableGameweeks = useMemo(() => {
    const gws = [];
    for (let i = 1; i <= currentGameweek; i++) {
      gws.push(i);
    }
    return gws;
  }, [currentGameweek]);

  // Set default end gameweek to current gameweek when data loads
  useMemo(() => {
    if (endGameweek === null && currentGameweek) {
      setEndGameweek(currentGameweek);
    }
  }, [currentGameweek, endGameweek]);

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
        {/* Season Selector - Compact */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            <Label className="text-xs sm:text-sm font-semibold text-gray-700">Season:</Label>
          </div>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-auto min-w-[140px] bg-white text-sm h-9" data-testid="select-season">
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
          {selectedSeason === "current" && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-1">
              GW{startGameweek}-{endGameweek || currentGameweek}
            </Badge>
          )}
        </div>

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
              showGWFilters={selectedSeason === "current"}
              startGameweek={startGameweek}
              endGameweek={endGameweek}
              currentGameweek={currentGameweek}
              availableGameweeks={availableGameweeks}
              onStartGWChange={setStartGameweek}
              onEndGWChange={setEndGameweek}
            />
          </CardContent>
        </Card>
          
        {/* Player Statistics Table */}
        <Card className="overflow-hidden shadow-lg border-0">
          <CardContent className="p-0">
            <PlayerStatsTable 
              data={selectedSeason === "current" ? bootstrapData : undefined}
              historicalData={selectedSeason !== "current" ? (historicalData || []) : undefined}
              filteredPlayers={selectedSeason === "current" && filteredStatsData?.players ? filteredStatsData.players : undefined}
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
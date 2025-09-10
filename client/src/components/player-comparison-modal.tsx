import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Users, Trophy, TrendingUp, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BootstrapData } from "@shared/schema";

interface PlayerComparisonModalProps {
  players: any[];
  isOpen: boolean;
  onClose: () => void;
  currentSeasonData?: BootstrapData;
}

export default function PlayerComparisonModal({ 
  players, 
  isOpen, 
  onClose,
  currentSeasonData 
}: PlayerComparisonModalProps) {
  const [activeTab, setActiveTab] = useState("current");

  // Get available seasons
  const { data: seasons } = useQuery<string[]>({
    queryKey: ["/api/seasons"],
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: isOpen && players.length > 0,
  });

  // State to hold historical season data
  const [historicalData, setHistoricalData] = useState<{[season: string]: any[]}>({});
  const [loadingSeasons, setLoadingSeasons] = useState<string[]>([]);

  // Fetch historical data when seasons are available
  useEffect(() => {
    if (!seasons || !isOpen || players.length === 0) return;

    const fetchSeasonData = async (season: string) => {
      if (historicalData[season]) return; // Already loaded
      
      setLoadingSeasons(prev => [...prev, season]);
      try {
        // Encode the season parameter to handle forward slashes properly
        const encodedSeason = encodeURIComponent(season);
        const response = await fetch(`/api/players/historical/${encodedSeason}`);
        if (response.ok) {
          const data = await response.json();
          setHistoricalData(prev => ({ ...prev, [season]: data }));
        } else {
          console.error(`Failed to fetch data for ${season}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${season}:`, error);
      } finally {
        setLoadingSeasons(prev => prev.filter(s => s !== season));
      }
    };

    // Fetch data for all seasons
    seasons.forEach(fetchSeasonData);
  }, [seasons, isOpen, players.length]);

  if (!isOpen || players.length === 0) return null;

  // Get historical season stats for selected players
  const getHistoricalSeasonStats = (playerId: number, season: string) => {
    const seasonData = historicalData[season];
    if (!seasonData) return null;
    
    // Find player by matching first_name and second_name since IDs might change
    const currentPlayer = players.find(p => p.id === playerId);
    if (!currentPlayer) return null;
    
    return seasonData.find(p => 
      p.first_name === currentPlayer.first_name && 
      p.second_name === currentPlayer.second_name
    );
  };

  const statLabels = {
    total_points: "Total Points",
    goals_scored: "Goals",
    assists: "Assists",
    clean_sheets: "Clean Sheets",
    goals_conceded: "Goals Conceded",
    own_goals: "Own Goals",
    penalties_saved: "Penalties Saved",
    penalties_missed: "Penalties Missed",
    yellow_cards: "Yellow Cards",
    red_cards: "Red Cards",
    saves: "Saves",
    bonus: "Bonus Points",
    bps: "BPS",
    influence: "Influence",
    creativity: "Creativity",
    threat: "Threat",
    ict_index: "ICT Index",
    now_cost: "Current Price",
    selected_by_percent: "Selected %",
    transfers_in_event: "Transfers In",
    transfers_out_event: "Transfers Out"
  };

  const formatStatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return "0";
    
    switch (key) {
      case "now_cost":
        return `£${(value / 10).toFixed(1)}m`;
      case "selected_by_percent":
        return `${value}%`;
      case "influence":
      case "creativity":
      case "threat":
      case "ict_index":
        return parseFloat(value).toFixed(1);
      default:
        return value.toString();
    }
  };

  const getPositionColor = (elementType: number) => {
    switch (elementType) {
      case 1: return "bg-green-100 text-green-800 border-green-200";
      case 2: return "bg-blue-100 text-blue-800 border-blue-200";
      case 3: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 4: return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPositionName = (elementType: number) => {
    const position = currentSeasonData?.element_types.find(t => t.id === elementType);
    return position?.singular_name_short || "Unknown";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Comparison ({players.length} players)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${seasons ? `grid-cols-${Math.min(seasons.length + 1, 6)}` : 'grid-cols-1'}`}>
            <TabsTrigger value="current" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              2025-26 Season
            </TabsTrigger>
            {seasons?.sort((a, b) => b.localeCompare(a)).map((season) => (
              <TabsTrigger key={season} value={season} className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {season}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="current" className="mt-6">
            <div className="space-y-6">
              {/* Player Headers */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {players.map(player => (
                  <div key={player.id} className="text-center p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900">{player.web_name}</h3>
                    <p className="text-sm text-gray-600">{player.team_name}</p>
                    <Badge 
                      variant="outline" 
                      className={`mt-2 ${getPositionColor(player.element_type)}`}
                    >
                      {getPositionName(player.element_type)}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Current Season Stats Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Statistic</th>
                      {players.map(player => (
                        <th key={player.id} className="text-center p-3 font-semibold">
                          {player.web_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(statLabels).map(([key, label]) => (
                      <tr key={key} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{label}</td>
                        {players.map(player => (
                          <td key={player.id} className="p-3 text-center">
                            {formatStatValue(key, player[key as keyof typeof player])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Historical Season Tabs */}
          {seasons?.map((season) => (
            <TabsContent key={season} value={season} className="mt-6">
              {loadingSeasons.includes(season) ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading {season} season data...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Player Headers */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {players.map(player => {
                      const historicalPlayer = getHistoricalSeasonStats(player.id, season);
                      return (
                        <div key={player.id} className="text-center p-4 bg-gray-50 rounded-lg">
                          <h3 className="font-semibold text-gray-900">{player.web_name}</h3>
                          <p className="text-sm text-gray-600">{player.team_name}</p>
                          {historicalPlayer ? (
                            <Badge variant="outline" className="mt-2 bg-green-100 text-green-800 border-green-200">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-200">
                              Not Found
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Historical Season Stats Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Statistic</th>
                          {players.map(player => (
                            <th key={player.id} className="text-center p-3 font-semibold">
                              {player.web_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(statLabels).map(([key, label]) => (
                          <tr key={key} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{label}</td>
                            {players.map(player => {
                              const historicalPlayer = getHistoricalSeasonStats(player.id, season);
                              return (
                                <td key={player.id} className="p-3 text-center">
                                  {historicalPlayer 
                                    ? formatStatValue(key, historicalPlayer[key as keyof typeof historicalPlayer])
                                    : "N/A"
                                  }
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
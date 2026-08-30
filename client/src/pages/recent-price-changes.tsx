import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Search, Calendar, BarChart3, RefreshCw, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { BootstrapData } from "@shared/schema";

interface PricePrediction {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  status: string;
  progress: number;
  predicted_progress: number;
  likelihood: number;
  ownership_trend: 'up' | 'down' | 'flat';
  ownership_percentage: number;
}

type PredictionSortField = 'progress' | 'predicted_progress' | 'ownership_percentage' | 'current_price';

interface PriceChange {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  old_price: number;
  current_price: number;
  price_change: number;
  change_date: string;
  ownership: number;
  transfers_in: number;
  transfers_out: number;
  transfers_in_gw: number;
  transfers_out_gw: number;
  is_recent_change: boolean;
  total_season_change: number;
}

type SortField = 'change_date' | 'player_name' | 'team_name' | 'position' | 'old_price' | 'current_price' | 'price_change' | 'ownership' | 'transfers_in' | 'transfers_out' | 'transfers_in_gw' | 'transfers_out_gw';
type SortDirection = 'asc' | 'desc';

export default function RecentPriceChanges() {
  const [activeTab, setActiveTab] = useState<"predicted" | "recent">("predicted");
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('change_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [predictionSearchTerm, setPredictionSearchTerm] = useState("");
  const [predictionPositionFilter, setPredictionPositionFilter] = useState("all");
  const [predictionSortField, setPredictionSortField] = useState<PredictionSortField>('progress');
  const [predictionSortDirection, setPredictionSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: predictionsData, isLoading: isLoadingPredictions, error: predictionsError } = useQuery<PricePrediction[]>({
    queryKey: ["/api/price-predictions"],
    enabled: activeTab === "predicted",
    staleTime: 5 * 60 * 1000,
  });

  const { data: priceChanges, isLoading: isLoadingChanges, error: changesError } = useQuery({
    queryKey: ["/api/price-changes/recent"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Refresh mutation for manual data update
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/price-changes/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to refresh price data");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch the price changes data
      queryClient.invalidateQueries({ queryKey: ["/api/price-changes/recent"] });
      toast({
        title: "Price Data Refreshed",
        description: data.message || "Successfully fetched latest data from FPL API",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh price data",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const resolveTeamName = (change: PriceChange): string => {
    if (!bootstrapData) return change.team_name;
    const player = bootstrapData.elements?.find((p: any) => p.id === change.player_id);
    if (!player) return change.team_name;
    const team = bootstrapData.teams?.find((t: any) => t.id === player.team);
    return team?.short_name || change.team_name;
  };

  const filteredAndSortedChanges = Array.isArray(priceChanges) ? priceChanges
    .map((change: PriceChange) => ({
      ...change,
      team_name: resolveTeamName(change),
    }))
    .filter((change: PriceChange) => {
      const matchesSearch = change.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           change.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || change.position === positionFilter;
      const matchesChangeType = changeTypeFilter === "all" || 
                               (changeTypeFilter === "rises" && change.price_change > 0) ||
                               (changeTypeFilter === "falls" && change.price_change < 0) ||
                               (changeTypeFilter === "active" && change.price_change === 0);
      return matchesSearch && matchesPosition && matchesChangeType;
    })
    .sort((a: PriceChange, b: PriceChange) => {
      // First, sort by date (most recent first)
      const dateComparison = b.change_date.localeCompare(a.change_date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // For same date, sort by price change type (rises first, then falls)
      const aPriceChange = a.price_change;
      const bPriceChange = b.price_change;
      
      // If one is rise and other is fall, rises come first
      if (aPriceChange > 0 && bPriceChange < 0) return -1;
      if (aPriceChange < 0 && bPriceChange > 0) return 1;
      
      // If both are rises or both are falls, sort by ownership (higher ownership first)
      if ((aPriceChange > 0 && bPriceChange > 0) || (aPriceChange < 0 && bPriceChange < 0)) {
        const aOwnership = typeof a.ownership === 'number' ? a.ownership : parseFloat(a.ownership || "0");
        const bOwnership = typeof b.ownership === 'number' ? b.ownership : parseFloat(b.ownership || "0");
        const ownershipComparison = bOwnership - aOwnership; // Higher ownership first
        if (ownershipComparison !== 0) {
          return ownershipComparison;
        }
      }
      
      // If ownership is the same, apply user-selected sorting
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle string comparison for dates and names
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      }
      
      // Handle numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
      
      return 0;
    }) : [];

  // FPL's own price-change page shows every player, sortable by progress toward the next
  // change — real official data (not a guessed threshold), so a player sitting at 0% is a
  // real, meaningful data point too, not something to filter out.
  const allPredictions = Array.isArray(predictionsData) ? predictionsData : [];

  const filteredAndSortedPredictions = allPredictions
    .filter((p: PricePrediction) => {
      const matchesSearch = p.player_name.toLowerCase().includes(predictionSearchTerm.toLowerCase()) ||
                           p.team_name.toLowerCase().includes(predictionSearchTerm.toLowerCase());
      const matchesPosition = predictionPositionFilter === "all" || p.position === predictionPositionFilter;
      return matchesSearch && matchesPosition;
    })
    .sort((a: PricePrediction, b: PricePrediction) => {
      const aValue = a[predictionSortField] ?? 0;
      const bValue = b[predictionSortField] ?? 0;
      const result = (predictionSortField === 'progress' || predictionSortField === 'predicted_progress')
        ? Math.abs(aValue) - Math.abs(bValue)
        : aValue - bValue;
      return predictionSortDirection === 'asc' ? result : -result;
    });

  const handlePredictionSort = (field: PredictionSortField) => {
    if (predictionSortField === field) {
      setPredictionSortDirection(predictionSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPredictionSortField(field);
      setPredictionSortDirection('desc');
    }
  };

  // Calculate today's price change statistics
  const getTodayStats = () => {
    if (!Array.isArray(priceChanges)) {
      return { todayRises: 0, todayFalls: 0, todayChanges: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayChanges = priceChanges.filter((c: PriceChange) => c.change_date === today);
    const todayRises = todayChanges.filter((c: PriceChange) => c.price_change > 0);
    const todayFalls = todayChanges.filter((c: PriceChange) => c.price_change < 0);

    return {
      todayRises: todayRises.length,
      todayFalls: todayFalls.length,
      todayChanges: todayChanges.length
    };
  };

  const todayStats = getTodayStats();

  const formatPrice = (price: number | string | undefined | null) => {
    if (price === null || price === undefined) {
      return "£?.?m";
    }
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      return "£?.?m";
    }
    
    return `£${(numPrice / 10).toFixed(1)}m`;
  };

  // Colors mirror FPL's own price-changes page: darker/more saturated = closer to certain.
  const statusBadgeClass = (status: string): string => {
    switch (status) {
      case "Very likely to rise": return "bg-green-700 text-white";
      case "Likely to rise": return "bg-green-100 text-green-800";
      case "Very likely to drop": return "bg-red-800 text-white";
      case "Likely to drop": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600"; // Unlikely to change
    }
  };

  const progressBadgeClass = (value: number): string => {
    if (value >= 100) return "bg-green-700 text-white";
    if (value > 0) return "bg-green-100 text-green-800";
    if (value <= -100) return "bg-red-800 text-white";
    if (value < 0) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Calendar className="h-8 w-8" />
          <h1>Price Changes</h1>
        </div>
        <p className="fpl-page-subtitle">
          Upcoming price change predictions and this season's confirmed price changes
        </p>
      </div>

      <div className="fpl-section-spacing">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "predicted" | "recent")}>
          <TabsList className="mb-4">
            <TabsTrigger value="predicted" data-testid="tab-predicted-price-changes">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Predicted Price Changes
            </TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent-price-changes">
              <Calendar className="h-4 w-4 mr-1.5" />
              Recent Price Changes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predicted">
            {predictionsError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load price predictions from FPL API. Please check your connection and try again.
                </AlertDescription>
              </Alert>
            )}

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search players or teams..."
                        value={predictionSearchTerm}
                        onChange={(e) => setPredictionSearchTerm(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-predictions"
                      />
                    </div>
                  </div>
                  <Select value={predictionPositionFilter} onValueChange={setPredictionPositionFilter}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-prediction-position-filter">
                      <SelectValue placeholder="All Positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {getPlayersByPosition().map(pos => (
                        <SelectItem key={pos.id} value={pos.name}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Predicted Price Changes
                </CardTitle>
                <CardDescription>
                  Real-time progress toward each player's next price change, straight from FPL's own official data — updates as transfers happen, same numbers you'd see on fantasy.premierleague.com.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPredictions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center p-3 border rounded">
                        <div className="h-4 w-4 bg-gray-200 rounded mr-3"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                          <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="h-4 w-16 bg-gray-200 rounded"></div>
                          <div className="h-3 w-12 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredAndSortedPredictions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left p-2 sm:p-3 font-medium">Player</th>
                          <th className="hidden sm:table-cell text-left p-3 font-medium">Status</th>
                          <th
                            className="text-right p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handlePredictionSort('progress')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Progress
                              {predictionSortField === 'progress' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="text-right p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handlePredictionSort('predicted_progress')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Predicted
                              {predictionSortField === 'predicted_progress' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="hidden md:table-cell text-center p-3 font-medium">Ownership Trend</th>
                          <th
                            className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handlePredictionSort('current_price')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Current Price
                              {predictionSortField === 'current_price' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="hidden lg:table-cell text-right p-3 font-medium">Purchase Price</th>
                          <th className="hidden lg:table-cell text-right p-3 font-medium">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedPredictions.map((prediction: PricePrediction) => (
                          <tr
                            key={prediction.player_id}
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`prediction-${prediction.player_id}`}
                          >
                            <td className="p-2 sm:p-3">
                              <div>
                                <p className="font-medium text-xs sm:text-sm leading-tight">{prediction.player_name}</p>
                                <p className="text-xs text-muted-foreground leading-tight">{prediction.team_name} · {prediction.position}</p>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell p-3">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusBadgeClass(prediction.status)}`}>
                                {prediction.status}
                              </span>
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${progressBadgeClass(prediction.progress)}`}>
                                {prediction.progress > 0 ? "+" : ""}{prediction.progress.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${progressBadgeClass(prediction.predicted_progress)}`}>
                                {prediction.predicted_progress > 0 ? "+" : ""}{prediction.predicted_progress.toFixed(1)}%
                              </span>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              <div className="flex items-center justify-center gap-1">
                                {prediction.ownership_trend === 'up' ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : prediction.ownership_trend === 'down' ? (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                ) : (
                                  <span className="h-4 w-4" />
                                )}
                                <span className="text-xs text-muted-foreground capitalize">{prediction.ownership_trend}</span>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right font-medium">
                              {formatPrice(prediction.current_price)}
                            </td>
                            <td className="hidden lg:table-cell p-3 text-right text-muted-foreground">-</td>
                            <td className="hidden lg:table-cell p-3 text-right text-muted-foreground">-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-3 px-1">
                      Purchase/Selling Price only apply to players in your own squad — link your team to see those here.
                    </p>
                  </div>
                ) : !isLoadingPredictions && !predictionsError ? null : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No predicted price changes found matching your filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
        {/* Today's Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 px-1">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-200 rounded-full mr-3">
                  <TrendingUp className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-700" data-testid="text-today-rises">
                    {todayStats.todayRises}
                  </p>
                  <p className="text-xs sm:text-sm text-green-600 font-medium">Price rises today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-200 rounded-full mr-3">
                  <TrendingDown className="h-6 w-6 text-red-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-red-700" data-testid="text-today-falls">
                    {todayStats.todayFalls}
                  </p>
                  <p className="text-xs sm:text-sm text-red-600 font-medium">Price falls today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-200 rounded-full mr-3">
                  <Calendar className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700" data-testid="text-today-changes">
                    {todayStats.todayChanges}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">Total price changes today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search players or teams..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-players"
                    />
                  </div>
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full sm:w-48" data-testid="select-position-filter">
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {getPlayersByPosition().map(pos => (
                      <SelectItem key={pos.id} value={pos.name}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48" data-testid="select-change-filter">
                    <SelectValue placeholder="All Changes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Changes</SelectItem>
                    <SelectItem value="rises">Price Rises</SelectItem>
                    <SelectItem value="falls">Price Falls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Refresh Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid="button-refresh-prices"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                  {refreshMutation.isPending ? "Refreshing..." : "Refresh from FPL API"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {changesError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load price data from FPL API. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Info message for new databases */}
        {!isLoadingChanges && Array.isArray(priceChanges) && priceChanges.length === 0 && (
          <Alert className="mb-6" data-testid="alert-no-recent-changes">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No 2026/27 price changes recorded yet — this fills in once FPL starts moving player prices for the new season. Click "Refresh from FPL API" to check for the latest data.
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Price Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Price Changes
            </CardTitle>
            <CardDescription>
              2026/27 season price changes ordered by recency and significance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingChanges ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center p-3 border rounded">
                    <div className="h-4 w-4 bg-gray-200 rounded mr-3"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      <div className="h-3 w-12 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th 
                        className="text-left p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('change_date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortField === 'change_date' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('player_name')}
                      >
                        <div className="flex items-center gap-1">
                          Player
                          {sortField === 'player_name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('team_name')}
                      >
                        <div className="flex items-center gap-1">
                          Team
                          {sortField === 'team_name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('position')}
                      >
                        <div className="flex items-center gap-1">
                          Pos
                          {sortField === 'position' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('ownership')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Own%
                          {sortField === 'ownership' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('old_price')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Old
                          {sortField === 'old_price' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('price_change')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Change
                          {sortField === 'price_change' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('current_price')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Price
                          {sortField === 'current_price' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedChanges.map((change: PriceChange, index: number) => {
                      const currentDate = change.change_date;
                      const previousDate = index > 0 ? filteredAndSortedChanges[index - 1].change_date : null;
                      const isNewDateGroup = currentDate !== previousDate;
                      
                      return (
                        <React.Fragment key={`${change.player_id}-${index}`}>
                          {isNewDateGroup && index > 0 && (
                            <tr>
                              <td colSpan={8} className="p-0">
                                <div className="border-t-2 border-gray-200 dark:border-gray-700"></div>
                              </td>
                            </tr>
                          )}
                          <tr 
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`price-change-${change.player_id}`}
                          >
                            <td className="p-2 sm:p-3">
                              <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(change.change_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3">
                              <div className="flex items-center gap-1.5">
                                {change.price_change > 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                                ) : change.price_change < 0 ? (
                                  <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                                ) : (
                                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium text-xs sm:text-sm leading-tight">{change.player_name}</p>
                                  <p className="text-xs text-muted-foreground sm:hidden leading-tight">{change.team_name} · {change.position}</p>
                                </div>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell p-3">
                              <div className="font-medium text-sm">{change.team_name}</div>
                            </td>
                            <td className="hidden sm:table-cell p-3">
                              <div className="text-sm text-muted-foreground">{change.position}</div>
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right font-medium">
                              <div className="text-sm">
                                {typeof change.ownership === 'number' 
                                  ? `${change.ownership.toFixed(1)}%` 
                                  : `${parseFloat(change.ownership || "0").toFixed(1)}%`}
                              </div>
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right font-medium">
                              {formatPrice(change.old_price)}
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right">
                              <Badge variant={change.price_change > 0 ? "success" : "destructive"}>
                                {change.price_change > 0 ? "+" : ""}{formatPrice(Math.abs(change.price_change))}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <div className="font-medium text-xs sm:text-sm">{formatPrice(change.current_price)}</div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No price changes found matching your filters</p>
                <p className="text-sm">Try adjusting your search criteria or change type filter</p>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
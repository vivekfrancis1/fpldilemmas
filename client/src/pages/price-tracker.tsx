import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayerNameCell, TeamBadge, PositionBadge, ValueCell } from "@/components/enhanced-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Search, Calendar, Target, BarChart3, RefreshCw } from "lucide-react";
import { BootstrapData } from "@shared/schema";

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
  is_recent_change: boolean;
  total_season_change: number;
}

interface PricePrediction {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  predicted_change: number;
  predicted_price?: number;
  confidence: number;
  ownership_percentage: number;
  net_transfers: number;
  transfers_in: number;
  transfers_out: number;
  reason: string;
  probability: string;
  expected_date?: string;
}

export default function PriceTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: priceChanges, isLoading: isLoadingChanges, error: changesError } = useQuery({
    queryKey: ["/api/price-changes/recent"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: predictions, isLoading: isLoadingPredictions, error: predictionsError } = useQuery({
    queryKey: ["/api/price-predictions"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const filteredChanges = Array.isArray(priceChanges) ? priceChanges.filter((change: PriceChange) => {
    const matchesSearch = change.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         change.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === "all" || change.position === positionFilter;
    const matchesChangeType = changeTypeFilter === "all" || 
                             (changeTypeFilter === "rises" && change.price_change > 0) ||
                             (changeTypeFilter === "falls" && change.price_change < 0) ||
                             (changeTypeFilter === "active" && change.price_change === 0);
    return matchesSearch && matchesPosition && matchesChangeType;
  }) : [];

  const filteredPredictions = Array.isArray(predictions) ? predictions.filter((pred: PricePrediction) => {
    const matchesSearch = pred.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pred.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === "all" || pred.position === positionFilter;
    const matchesChangeType = changeTypeFilter === "all" || 
                             (changeTypeFilter === "rises" && pred.predicted_change > 0) ||
                             (changeTypeFilter === "falls" && pred.predicted_change < 0) ||
                             (changeTypeFilter === "stable" && pred.predicted_change === 0);
    return matchesSearch && matchesPosition && matchesChangeType;
  }) : [];

  const formatPrice = (price: number | string | undefined | null) => {
    // Handle undefined, null, or invalid values
    if (price === null || price === undefined) {
      return "£?.?m";
    }
    
    // Convert to number if it's a string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Check if conversion resulted in NaN
    if (isNaN(numPrice)) {
      return "£?.?m";
    }
    
    return `£${(numPrice / 10).toFixed(1)}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability.toLowerCase()) {
      case "very high": return "bg-red-600";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Calculate comprehensive season statistics
  const getSeasonStats = () => {
    if (!Array.isArray(priceChanges)) {
      return { totalRises: 0, totalFalls: 0, totalChanges: 0, avgRiseAmount: 0, avgFallAmount: 0 };
    }

    const rises = priceChanges.filter((c: PriceChange) => c.price_change > 0);
    const falls = priceChanges.filter((c: PriceChange) => c.price_change < 0);
    
    const avgRiseAmount = rises.length > 0 ? 
      rises.reduce((sum, c) => sum + c.price_change, 0) / rises.length : 0;
    const avgFallAmount = falls.length > 0 ? 
      Math.abs(falls.reduce((sum, c) => sum + c.price_change, 0) / falls.length) : 0;

    return {
      totalRises: rises.length,
      totalFalls: falls.length,
      totalChanges: priceChanges.length,
      avgRiseAmount: avgRiseAmount,
      avgFallAmount: avgFallAmount
    };
  };

  const seasonStats = getSeasonStats();

  return (
    
      <div className="fpl-page-container">
        {/* Unified Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-title">
            <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            Price Tracker
          </div>
          <p className="fpl-page-subtitle">
            Real-time price analysis and data-driven predictions based on FPL transfer patterns
          </p>
        </div>

        <div className="fpl-section-spacing">

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8 px-1">
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full mr-3">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600" data-testid="text-total-rises">
                      {seasonStats.totalRises}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Total Price Rises This Season</p>
                    {seasonStats.avgRiseAmount > 0 && (
                      <p className="text-xs text-green-500 mt-1">
                        Avg: +£{(seasonStats.avgRiseAmount / 10).toFixed(1)}m
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-full mr-3">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600" data-testid="text-total-falls">
                      {seasonStats.totalFalls}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Total Price Falls This Season</p>
                    {seasonStats.avgFallAmount > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        Avg: -£{(seasonStats.avgFallAmount / 10).toFixed(1)}m
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full mr-3">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600" data-testid="text-total-changes">
                      {seasonStats.totalChanges}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Total Price Changes</p>
                    <p className="text-xs text-blue-500 mt-1">
                      {seasonStats.totalRises}↗ {seasonStats.totalFalls}↘
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
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
                  <SelectValue placeholder="All Players" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  <SelectItem value="rises">Likely to Rise</SelectItem>
                  <SelectItem value="falls">Likely to Fall</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {(changesError || predictionsError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load price data from FPL API. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="predictions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predictions" data-testid="tab-predictions">All Players (705)</TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent-changes">Recent Changes</TabsTrigger>
          </TabsList>

          {/* Recent Price Changes */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Price Changes
                </CardTitle>
                <CardDescription>
                  All season price changes ordered by recency and significance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingChanges ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                            <div className="space-y-1">
                              <div className="h-4 w-32 bg-gray-200 rounded"></div>
                              <div className="h-3 w-24 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                          <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredChanges.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Player</th>
                          <th className="text-left p-3 font-medium">Team</th>
                          <th className="text-left p-3 font-medium">Position</th>
                          <th className="text-right p-3 font-medium">Price Change</th>
                          <th className="text-right p-3 font-medium">Current Price</th>
                          <th className="text-right p-3 font-medium">Transfer Activity</th>
                          <th className="text-right p-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredChanges.map((change: PriceChange, index: number) => (
                          <tr 
                            key={`${change.player_id}-${index}`}
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`price-change-${change.player_id}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {change.price_change > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : change.price_change < 0 ? (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                ) : (
                                  <BarChart3 className="h-4 w-4 text-blue-600" />
                                )}
                                <PlayerNameCell 
                                  name={change.player_name}
                                  position={change.position}
                                  team={change.team_name}
                                  compact={true}
                                  showOwnership={true}
                                  ownership={change.ownership}
                                />
                              </div>
                            </td>
                            <td className="p-3 text-sm">
                              <TeamBadge team={change.team_name} compact={true} />
                            </td>
                            <td className="p-3 text-sm">
                              <PositionBadge position={change.position} compact={true} />
                            </td>
                            <td className="p-3 text-right">
                              {change.price_change !== 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    {formatPrice(change.old_price)}
                                  </span>
                                  <span>→</span>
                                  <Badge variant={change.price_change > 0 ? "success" : "destructive"}>
                                    {change.price_change > 0 ? "+" : ""}{formatPrice(Math.abs(change.price_change))}
                                  </Badge>
                                </div>
                              ) : (
                                <Badge variant="secondary">
                                  No Change
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatPrice(change.current_price)}
                            </td>
                            <td className="p-3 text-right">
                              <div className="text-xs">
                                <p className="text-green-600">In: {(change.transfers_in/1000).toFixed(0)}k</p>
                                <p className="text-red-600">Out: {(change.transfers_out/1000).toFixed(0)}k</p>
                                <p className="font-medium">Net: {((change.transfers_in - change.transfers_out)/1000).toFixed(0)}k</p>
                              </div>
                            </td>
                            <td className="p-3 text-right text-sm text-muted-foreground">
                              {new Date(change.change_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                              })}
                            </td>
                          </tr>
                        ))}
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

          {/* Price Predictions */}
          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  All Players Price Tracker ({Array.isArray(predictions) ? predictions.length : 0} players)
                </CardTitle>
                <CardDescription>
                  Comprehensive price tracking for all FPL players with predicted rises/falls
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
                ) : filteredPredictions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left p-3 font-medium">Player</th>
                          <th className="text-left p-3 font-medium">Team/Pos</th>
                          <th className="text-right p-3 font-medium">Current Price</th>
                          <th className="text-center p-3 font-medium">Change</th>
                          <th className="text-right p-3 font-medium">Ownership</th>
                          <th className="text-right p-3 font-medium">Net Transfers</th>
                          <th className="text-center p-3 font-medium">Probability</th>
                          <th className="text-left p-3 font-medium">Expected When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPredictions.map((prediction: PricePrediction, index: number) => (
                          <tr 
                            key={`${prediction.player_id}-${index}`}
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`prediction-${prediction.player_id}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {prediction.predicted_change > 0 ? (
                                  <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
                                ) : prediction.predicted_change < 0 ? (
                                  <TrendingDown className="h-3 w-3 text-red-600 flex-shrink-0" />
                                ) : (
                                  <BarChart3 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                )}
                                <span className="font-medium">{prediction.player_name}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <div className="font-medium text-xs">{prediction.team_name}</div>
                                <div className="text-xs text-muted-foreground">{prediction.position}</div>
                              </div>
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatPrice(prediction.current_price)}
                            </td>
                            <td className="p-3 text-center">
                              {prediction.predicted_change !== 0 ? (
                                <Badge 
                                  variant={prediction.predicted_change > 0 ? "success" : "destructive"}
                                  className="text-xs"
                                >
                                  {prediction.predicted_change > 0 ? "+" : ""}{formatPrice(Math.abs(prediction.predicted_change))}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  No Change
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right text-sm">
                              {prediction.ownership_percentage}%
                            </td>
                            <td className="p-3 text-right">
                              <div className="text-xs">
                                {prediction.net_transfers >= 0 ? (
                                  <span className="text-green-600">+{(prediction.net_transfers/1000).toFixed(0)}k</span>
                                ) : (
                                  <span className="text-red-600">{(prediction.net_transfers/1000).toFixed(0)}k</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {((prediction.transfers_in || 0)/1000).toFixed(0)}k in | {((prediction.transfers_out || 0)/1000).toFixed(0)}k out
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="space-y-1">
                                <Badge 
                                  className={`text-xs ${getProbabilityColor(prediction.probability)} text-white`}
                                >
                                  {prediction.probability}
                                </Badge>
                                <div className={`text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
                                  {prediction.confidence}%
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground max-w-[200px]">
                              {prediction.expected_date || 
                                (prediction.predicted_change !== 0 ? 
                                  (prediction.probability === "Very High" ? "Next 24hrs" :
                                   prediction.probability === "High" ? "Within 2 days" :
                                   prediction.probability === "Medium" ? "This week" : "Unlikely") 
                                  : "Stable")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No players found matching your filters</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How Predictions Work */}
            <Card>
              <CardHeader>
                <CardTitle>Prediction System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Machine Learning:</strong> Predictions improve continuously by analyzing transfer patterns and actual price changes
                </p>
                <p>
                  <strong>Multiple Factors:</strong> Considers ownership levels, transfer velocity, historical patterns, and market momentum
                </p>
                <p>
                  <strong>Confidence Scoring:</strong> Higher confidence indicates stronger prediction based on similar historical patterns
                </p>
                <p>
                  <strong>Live Data:</strong> Real-time analysis of official FPL transfer activity and ownership changes
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    
  );
}
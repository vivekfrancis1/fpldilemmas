import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle, Search, Target, BarChart3, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BootstrapData } from "@shared/schema";

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
  progress_percentage: number;
  progress_direction: string;
  estimated_time: string;
}

export default function PredictedPriceChanges() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    if (price === null || price === undefined) {
      return "£?.?m";
    }
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      return "£?.?m";
    }
    
    return `£${(numPrice / 10).toFixed(1)}m`;
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

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Target className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Predicted Price Changes
        </div>
        <p className="fpl-page-subtitle">
          Comprehensive price tracking for all FPL players with predicted rises/falls
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8 px-1">
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full mr-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600" data-testid="text-likely-rises">
                    {Array.isArray(predictions) ? predictions.filter((p: PricePrediction) => p.predicted_change > 0).length : 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Likely to Rise</p>
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
                  <p className="text-xl sm:text-2xl font-bold text-red-600" data-testid="text-likely-falls">
                    {Array.isArray(predictions) ? predictions.filter((p: PricePrediction) => p.predicted_change < 0).length : 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Likely to Fall</p>
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
                  <p className="text-xl sm:text-2xl font-bold text-blue-600" data-testid="text-high-confidence">
                    {Array.isArray(predictions) ? predictions.filter((p: PricePrediction) => p.probability !== "Low").length : 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">High Confidence Predictions</p>
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
        {predictionsError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load price predictions from FPL API. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* All Players Price Predictions */}
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
                      <th className="text-center p-3 font-medium">Progress</th>
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
                        <td className="p-3 min-w-[120px]">
                          <div className="space-y-1">
                            <Progress 
                              value={Math.min(100, prediction.progress_percentage || 0)} 
                              className={`h-2 ${
                                prediction.progress_direction === "rise" ? "[&>div]:bg-green-500" :
                                prediction.progress_direction === "fall" ? "[&>div]:bg-red-500" : 
                                "[&>div]:bg-gray-400"
                              }`}
                            />
                            <div className="text-xs text-center">
                              {prediction.progress_percentage?.toFixed(0) || 0}%
                            </div>
                          </div>
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
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {prediction.estimated_time || prediction.expected_date || "Stable"}
                          </div>
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
        <Card className="mt-6">
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
      </div>
    </div>
  );
}
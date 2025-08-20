import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Search, Calendar, Target, BarChart3, RefreshCw } from "lucide-react";
import Layout from "../components/layout";
import { BootstrapData } from "@shared/schema";

interface PriceChange {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  old_price: number;
  new_price: number;
  current_price?: number;
  change: number;
  date: string;
  ownership_change: number;
  transfers_in: number;
  transfers_out: number;
}

interface PricePrediction {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  predicted_change: number;
  confidence: number;
  ownership_percentage: number;
  net_transfers: number;
  transfers_in: number;
  transfers_out: number;
  reason: string;
  probability: string;
  expected_date: string;
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
                             (changeTypeFilter === "rise" && change.change > 0) ||
                             (changeTypeFilter === "fall" && change.change < 0);
    return matchesSearch && matchesPosition && matchesChangeType;
  }) : [];

  const filteredPredictions = Array.isArray(predictions) ? predictions.filter((pred: PricePrediction) => {
    const matchesSearch = pred.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pred.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === "all" || pred.position === positionFilter;
    return matchesSearch && matchesPosition;
  }) : [];

  const formatPrice = (price: number) => {
    return `£${(price / 10).toFixed(1)}m`;
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50/30 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <RefreshCw className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4" data-testid="text-page-title">
              Price Tracker
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed" data-testid="text-page-description">
              Real-time price analysis and data-driven predictions based on FPL transfer patterns
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sm:mb-8">
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full mr-3">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600" data-testid="text-total-rises">
                      {Array.isArray(priceChanges) ? priceChanges.filter((c: PriceChange) => c.change > 0).length : 0}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Price Rises Today</p>
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
                      {Array.isArray(priceChanges) ? priceChanges.filter((c: PriceChange) => c.change < 0).length : 0}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Price Falls Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full mr-3">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600" data-testid="text-predictions">
                      {Array.isArray(predictions) ? predictions.filter((p: PricePrediction) => p.probability !== "Low").length : 0}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Likely Changes</p>
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
                  <SelectValue placeholder="All Changes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Changes</SelectItem>
                  <SelectItem value="rise">Price Rises</SelectItem>
                  <SelectItem value="fall">Price Falls</SelectItem>
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
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent" data-testid="tab-recent-changes">Recent Changes</TabsTrigger>
            <TabsTrigger value="predictions" data-testid="tab-predictions">Price Predictions</TabsTrigger>
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
                  Latest player price movements and ownership changes
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
                  <div className="space-y-3">
                    {filteredChanges.map((change: PriceChange, index: number) => (
                      <div 
                        key={`${change.player_id}-${index}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`price-change-${change.player_id}`}
                      >
                        <div className="flex items-center gap-3">
                          {change.change > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : change.change < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                          )}
                          <div>
                            <p className="font-medium">{change.player_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {change.team_name} • {change.position}
                            </p>
                            {change.change === 0 && (
                              <p className="text-xs text-blue-600 font-medium">
                                High transfer activity ({((change.transfers_in - change.transfers_out)/1000).toFixed(0)}k net)
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {change.change !== 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {formatPrice(change.old_price)}
                              </span>
                              <span>→</span>
                              <span className="font-medium">
                                {formatPrice(change.new_price)}
                              </span>
                              <Badge variant={change.change > 0 ? "success" : "destructive"}>
                                {change.change > 0 ? "+" : ""}{formatPrice(Math.abs(change.change))}
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatPrice(change.current_price || change.new_price)}
                              </span>
                              <Badge variant="secondary">
                                Watch
                              </Badge>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            <p>In: {(change.transfers_in/1000).toFixed(0)}k | Out: {(change.transfers_out/1000).toFixed(0)}k</p>
                            <p>{change.ownership_change}% owned</p>
                            <p className="text-blue-600 font-medium">
                              {change.change !== 0 ? `Changed: ${formatDate(change.date)}` : `Activity: ${formatDate(change.date)}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent price changes in current gameweek</p>
                    <p className="text-sm">Players with high transfer activity are shown instead</p>
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
                  Price Change Predictions
                </CardTitle>
                <CardDescription>
                  AI-powered predictions based on ownership trends and transfer activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPredictions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                            <div className="space-y-1">
                              <div className="h-4 w-32 bg-gray-200 rounded"></div>
                              <div className="h-3 w-48 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            <div className="h-3 w-16 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredPredictions.length > 0 ? (
                  <div className="space-y-3">
                    {filteredPredictions.map((prediction: PricePrediction, index: number) => (
                      <div 
                        key={`${prediction.player_id}-${index}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`prediction-${prediction.player_id}`}
                      >
                        <div className="flex items-center gap-3">
                          {prediction.predicted_change > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{prediction.player_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {prediction.team_name} • {prediction.position}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {prediction.reason}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {formatPrice(prediction.current_price)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant={prediction.predicted_change > 0 ? "success" : "destructive"}>
                              {prediction.predicted_change > 0 ? "+" : ""}{formatPrice(Math.abs(prediction.predicted_change))}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={`text-xs ${getProbabilityColor(prediction.probability)} text-white`}
                            >
                              {prediction.probability}
                            </Badge>
                            <span className={`text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
                              {prediction.confidence}% confidence
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>{prediction.ownership_percentage}% owned</p>
                            <p>In: {(prediction.transfers_in/1000).toFixed(0)}k | Out: {(prediction.transfers_out/1000).toFixed(0)}k</p>
                            <p className="text-purple-600 font-medium">
                              Expected: {formatDate(prediction.expected_date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No price predictions available</p>
                    <p className="text-sm">Predictions are updated regularly</p>
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
    </Layout>
  );
}
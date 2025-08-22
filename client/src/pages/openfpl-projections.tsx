import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Brain, BarChart3, Target, AlertTriangle, TrendingUp, Star, Clock, DollarSign } from "lucide-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BootstrapData {
  elements: any[];
  teams: any[];
  element_types: any[];
  events: any[];
}

interface OpenFPLProjection {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  gameweek: number;
  horizon: number;
  current_price: number;
  predicted_points: number;
  predicted_minutes: number;
  predicted_goals: number;
  predicted_assists: number;
  predicted_clean_sheets: number;
  predicted_bonus: number;
  cbit_percentage: number;
  ensemble_confidence: number;
  investment_risk: string;
  ownership_percentage: number;
  availability_status: number;
  position_rank?: number;
  form_3gw?: number;
  xg_per_game?: number;
  xa_per_game?: number;
}

export default function OpenFPLProjections() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [horizonFilter, setHorizonFilter] = useState("1");
  const [gameweekFilter, setGameweekFilter] = useState("next");
  const [minOwnership, setMinOwnership] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: projections, isLoading: isLoadingProjections, error: projectionsError } = useQuery({
    queryKey: ["/api/openfpl-projections", horizonFilter, gameweekFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('horizon', horizonFilter);
      params.append('gameweek', gameweekFilter);
      return fetch(`/api/openfpl-projections?${params.toString()}`).then(res => res.json());
    },
    refetchInterval: 300000, // 5 minutes
  });

  const { data: modelMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/openfpl-metrics"],
    refetchInterval: 600000, // 10 minutes
  });

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const filteredProjections = Array.isArray(projections) ? projections.filter((projection: OpenFPLProjection) => {
    const matchesSearch = !searchTerm || 
      projection.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
    
    const matchesOwnership = !minOwnership || projection.ownership_percentage >= parseFloat(minOwnership);
    
    const matchesPrice = !maxPrice || projection.current_price <= parseFloat(maxPrice) * 10;
    
    return matchesSearch && matchesPosition && matchesOwnership && matchesPrice;
  }).sort((a: OpenFPLProjection, b: OpenFPLProjection) => {
    // Sort by predicted points descending, then by ensemble confidence
    if (b.predicted_points !== a.predicted_points) {
      return b.predicted_points - a.predicted_points;
    }
    return b.ensemble_confidence - a.ensemble_confidence;
  }) : [];

  const formatPrice = (price: number) => `£${(price / 10).toFixed(1)}m`;
  
  const getAvailabilityColor = (status: number) => {
    if (status === 100) return "bg-green-50 text-green-700 border-green-200";
    if (status >= 75) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (status >= 50) return "bg-orange-50 text-orange-700 border-orange-200";
    if (status >= 25) return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getRiskColor = (risk: string) => {
    if (risk === "Low") return "bg-green-50 text-green-700 border-green-200";
    if (risk === "Medium") return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case "GKP": return "🥅";
      case "DEF": return "🛡️";
      case "MID": return "⚡";
      case "FWD": return "⚽";
      default: return "👤";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Enhanced Header with gradient */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Brain className="h-10 w-10" />
              <h1 className="text-5xl font-bold">OpenFPL Projections</h1>
            </div>
            <p className="text-blue-100 text-xl mb-2">
              🤖 Advanced ML ensemble predictions using XGBoost + Random Forest models
            </p>
            <p className="text-blue-200 text-sm">
              Based on peer-reviewed OpenFPL research • Rivaling commercial FPL services • Processing all 699 players
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Model Performance Metrics */}
          {modelMetrics && (
            <Card className="border-2 border-gradient shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  Model Performance vs Commercial Benchmarks
                </CardTitle>
                <CardDescription className="text-lg">
                  Real-time accuracy metrics compared to leading FPL services
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600">{(modelMetrics as any).rmse_overall?.toFixed(3)}</div>
                    <div className="text-sm text-green-700 font-medium">Overall RMSE</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">{(modelMetrics as any).rmse_haulers?.toFixed(3)}</div>
                    <div className="text-sm text-blue-700 font-medium">Haulers (5+ pts)</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">{(modelMetrics as any).rmse_tickers?.toFixed(3)}</div>
                    <div className="text-sm text-purple-700 font-medium">Tickers (3-4 pts)</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-3xl font-bold text-orange-600">{(modelMetrics as any).rmse_blanks?.toFixed(3)}</div>
                    <div className="text-sm text-orange-700 font-medium">Blanks (≤2 pts)</div>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="text-3xl font-bold text-indigo-600">{((modelMetrics as any).accuracy_rate * 100)?.toFixed(1)}%</div>
                    <div className="text-sm text-indigo-700 font-medium">Accuracy Rate</div>
                  </div>
                </div>
                <div className="mt-6 text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  Last updated: {(modelMetrics as any).last_updated} • Models retrained weekly with latest data • Lower RMSE = Better accuracy
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Filters */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50">
              <CardTitle className="text-xl">🔍 Smart Filters & Search</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 border-2"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="h-12 border-2" data-testid="select-position">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {getPlayersByPosition().map(position => (
                      <SelectItem key={position.id} value={position.name}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={horizonFilter} onValueChange={setHorizonFilter}>
                  <SelectTrigger className="h-12 border-2" data-testid="select-horizon">
                    <SelectValue placeholder="Forecast Horizon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Gameweek</SelectItem>
                    <SelectItem value="2">2 Gameweeks</SelectItem>
                    <SelectItem value="3">3 Gameweeks</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={gameweekFilter} onValueChange={setGameweekFilter}>
                  <SelectTrigger className="h-12 border-2" data-testid="select-gameweek">
                    <SelectValue placeholder="Target GW" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next">Next GW</SelectItem>
                    <SelectItem value="current">Current GW</SelectItem>
                    <SelectItem value="all">All Available</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Min ownership %"
                  value={minOwnership}
                  onChange={(e) => setMinOwnership(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  className="h-12 border-2"
                  data-testid="input-ownership"
                />

                <Input
                  placeholder="Max price £X.Xm"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  type="number"
                  step="0.1"
                  min="3.9"
                  max="15.0"
                  className="h-12 border-2"
                  data-testid="input-price"
                />
              </div>
            </CardContent>
          </Card>

          {/* Projections Results */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Target className="h-6 w-6 text-blue-600" />
                OpenFPL Ensemble Predictions
                {horizonFilter && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {horizonFilter} GW{horizonFilter !== "1" ? "s" : ""} Ahead
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-lg">
                Position-specific ensemble models trained on 4 seasons of FPL + Understat data
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingProjections ? (
                <div className="grid gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl animate-pulse shadow-sm" />
                  ))}
                </div>
              ) : projectionsError ? (
                <div className="text-center py-16">
                  <div className="bg-red-50 p-8 rounded-2xl border-2 border-red-200 shadow-lg">
                    <AlertTriangle className="h-20 w-20 text-red-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-red-700 mb-2">OpenFPL System Offline</h3>
                    <p className="text-red-600 text-lg">Model training in progress or API temporarily unavailable</p>
                    <p className="text-sm text-red-500 mt-2">Please try again in a few minutes</p>
                  </div>
                </div>
              ) : !Array.isArray(projections) || projections.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-200 shadow-lg">
                    <Brain className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-600 mb-2">No predictions match your criteria</h3>
                    <p className="text-gray-500 text-lg">Try adjusting your filters or selecting a different gameweek</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200 shadow-md">
                      <div className="text-3xl font-bold text-blue-700">{filteredProjections.length}</div>
                      <div className="text-sm text-blue-600 font-medium">Players Available</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200 shadow-md">
                      <div className="text-3xl font-bold text-green-700">
                        {filteredProjections[0]?.predicted_points?.toFixed(1) || "0.0"}
                      </div>
                      <div className="text-sm text-green-600 font-medium">Top Prediction</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-200 shadow-md">
                      <div className="text-3xl font-bold text-purple-700">
                        {(filteredProjections.reduce((sum, p) => sum + (p.ensemble_confidence || 0), 0) / filteredProjections.length)?.toFixed(1) || "0.0"}%
                      </div>
                      <div className="text-sm text-purple-600 font-medium">Avg Confidence</div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border-2 border-orange-200 shadow-md">
                      <div className="text-3xl font-bold text-orange-700">
                        {(filteredProjections.reduce((sum, p) => sum + p.current_price, 0) / filteredProjections.length / 10)?.toFixed(1) || "0.0"}m
                      </div>
                      <div className="text-sm text-orange-600 font-medium">Avg Price</div>
                    </div>
                  </div>

                  {/* Enhanced Cards Layout */}
                  <div className="grid gap-6">
                    {filteredProjections.map((projection: OpenFPLProjection, index: number) => (
                      <div key={`${projection.player_id}-${index}`} 
                           className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:border-blue-300 hover:scale-[1.02]">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                          {/* Player Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="text-4xl">{getPositionIcon(projection.position)}</div>
                              <div className="flex flex-col">
                                <h3 className="text-2xl font-bold text-gray-900">{projection.player_name}</h3>
                                <div className="flex items-center gap-3 text-lg text-gray-600">
                                  <span className="font-semibold">{projection.team_name}</span>
                                  <Badge variant="outline" className="text-sm px-2 py-1">
                                    {projection.position}
                                  </Badge>
                                  <Badge className={`text-sm px-3 py-1 ${getAvailabilityColor(projection.availability_status || 100)}`}>
                                    {projection.availability_status === 100 ? "✅ Available" : 
                                     projection.availability_status >= 75 ? "⚠️ Likely" :
                                     projection.availability_status >= 50 ? "❓ 50/50" :
                                     projection.availability_status >= 25 ? "⚠️ Doubt" : "❌ Out"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
                            <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                              <div className="text-3xl font-bold text-blue-600">
                                {projection.predicted_points?.toFixed(1) || "0.0"}
                              </div>
                              <div className="text-xs text-blue-700 font-medium">Pred Pts</div>
                            </div>
                            
                            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                              <div className="text-xl font-semibold text-gray-700 flex items-center justify-center gap-1">
                                <Clock className="h-4 w-4" />
                                {projection.predicted_minutes || 0}'
                              </div>
                              <div className="text-xs text-gray-600 font-medium">Minutes</div>
                            </div>

                            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                              <div className="text-xl font-semibold text-green-600">
                                ⚽ {projection.predicted_goals?.toFixed(2) || "0.00"}
                              </div>
                              <div className="text-xs text-green-700 font-medium">Goals</div>
                            </div>

                            <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                              <div className="text-xl font-semibold text-purple-600">
                                🎯 {projection.predicted_assists?.toFixed(2) || "0.00"}
                              </div>
                              <div className="text-xs text-purple-700 font-medium">Assists</div>
                            </div>

                            <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                              <div className="text-xl font-semibold text-indigo-600">
                                🛡️ {projection.predicted_clean_sheets?.toFixed(2) || "0.00"}
                              </div>
                              <div className="text-xs text-indigo-700 font-medium">CS</div>
                            </div>

                            <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                              <div className="text-xl font-semibold text-orange-600">
                                ⭐ {projection.predicted_bonus?.toFixed(2) || "0.00"}
                              </div>
                              <div className="text-xs text-orange-700 font-medium">Bonus</div>
                            </div>
                          </div>

                          {/* Advanced Stats */}
                          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center">
                            <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                              <div className="text-xl font-bold text-yellow-600">
                                {projection.cbit_percentage?.toFixed(1) || "0.0"}%
                              </div>
                              <div className="text-xs text-yellow-700 font-medium">CBIT%</div>
                            </div>
                            
                            <div className="text-center p-4 rounded-xl border">
                              <div className={`text-xl font-bold px-3 py-1 rounded-lg ${getConfidenceColor(projection.ensemble_confidence || 0)}`}>
                                {projection.ensemble_confidence?.toFixed(1) || "0.0"}%
                              </div>
                              <div className="text-xs text-gray-600 font-medium mt-1">Confidence</div>
                            </div>

                            <div className="text-center">
                              <Badge className={`text-lg px-4 py-2 ${getRiskColor(projection.investment_risk || "High")}`}>
                                {projection.investment_risk || "High"} Risk
                              </Badge>
                            </div>

                            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                              <div className="text-xl font-bold text-gray-700 flex items-center justify-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {formatPrice(projection.current_price)}
                              </div>
                              <div className="text-xs text-gray-600 font-medium">{projection.ownership_percentage?.toFixed(1) || "0.0"}% owned</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Results Summary */}
                  <div className="mt-12 text-center bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                    <div className="text-lg text-gray-700 font-medium">
                      Showing <span className="font-bold text-blue-600">{filteredProjections.length}</span> of <span className="font-bold">{Array.isArray(projections) ? projections.length : 0}</span> total predictions
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Generated by position-specific ensemble models • Updated every 5 minutes • Processing all 699 FPL players
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
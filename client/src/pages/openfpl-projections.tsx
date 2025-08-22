import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Target, TrendingUp, BarChart3, Search, RefreshCw, Zap, AlertTriangle } from "lucide-react";
import Layout from "../components/layout";
import { BootstrapData } from "@shared/schema";

interface OpenFPLProjection {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  gameweek: number;
  horizon: number; // 1, 2, or 3 gameweeks ahead
  
  // Core predictions
  predicted_points: number;
  predicted_minutes: number;
  predicted_goals: number;
  predicted_assists: number;
  predicted_clean_sheets: number;
  predicted_bonus: number;
  
  // Model confidence metrics
  ensemble_confidence: number;
  xgboost_score: number;
  random_forest_score: number;
  position_rank: number;
  
  // OpenFPL features
  availability_status: number; // 0, 25, 50, 75, 100
  form_1gw: number;
  form_3gw: number;
  form_5gw: number;
  xg_per_game: number;
  xa_per_game: number;
  shots_per_game: number;
  key_passes_per_game: number;
  
  // Risk factors
  injury_risk: string;
  rotation_risk: string;
  fixture_difficulty: number;
  ownership_percentage: number;
}

interface ModelMetrics {
  rmse_overall: number;
  rmse_haulers: number; // >= 5 points
  rmse_tickers: number; // 3-4 points
  rmse_blanks: number;  // <= 2 points
  accuracy_rate: number;
  last_updated: string;
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
    if (status === 100) return "bg-green-100 text-green-800";
    if (status >= 75) return "bg-yellow-100 text-yellow-800";
    if (status >= 50) return "bg-orange-100 text-orange-800";
    if (status >= 25) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getRiskColor = (risk: string) => {
    if (risk === "Low") return "bg-green-100 text-green-800";
    if (risk === "Medium") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold">OpenFPL Projections</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Advanced ML-powered player projections using ensemble models (XGBoost + Random Forest) 
            based on OpenFPL research - rivaling commercial FPL services
          </p>
        </div>

        {/* Model Performance Metrics */}
        {modelMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Model Performance vs Commercial Benchmarks
              </CardTitle>
              <CardDescription>
                Real-time accuracy metrics compared to leading FPL services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{(modelMetrics as any).rmse_overall?.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">Overall RMSE</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{(modelMetrics as any).rmse_haulers?.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">Haulers (5+ pts)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{(modelMetrics as any).rmse_tickers?.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">Tickers (3-4 pts)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{(modelMetrics as any).rmse_blanks?.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">Blanks (≤2 pts)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{((modelMetrics as any).accuracy_rate * 100)?.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Last updated: {(modelMetrics as any).last_updated} • Models retrained weekly with latest data
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger data-testid="select-position">
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
                <SelectTrigger data-testid="select-horizon">
                  <SelectValue placeholder="Forecast Horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Gameweek</SelectItem>
                  <SelectItem value="2">2 Gameweeks</SelectItem>
                  <SelectItem value="3">3 Gameweeks</SelectItem>
                </SelectContent>
              </Select>

              <Select value={gameweekFilter} onValueChange={setGameweekFilter}>
                <SelectTrigger data-testid="select-gameweek">
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
                data-testid="input-price"
              />
            </div>
          </CardContent>
        </Card>

        {/* Projections Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              OpenFPL Ensemble Predictions
              {horizonFilter && (
                <Badge variant="outline">
                  {horizonFilter} GW{horizonFilter !== "1" ? "s" : ""} Ahead
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Position-specific ensemble models trained on 4 seasons of FPL + Understat data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProjections ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                        <div className="space-y-1">
                          <div className="h-4 w-40 bg-gray-200 rounded"></div>
                          <div className="h-3 w-32 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        <div className="h-3 w-20 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : projectionsError ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load OpenFPL projections. Model training in progress or API unavailable.
                </AlertDescription>
              </Alert>
            ) : filteredProjections.length > 0 ? (
              <div className="space-y-3">
                {filteredProjections.map((projection: OpenFPLProjection, index: number) => (
                  <div 
                    key={`${projection.player_id}-${projection.gameweek}-${index}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`projection-${projection.player_id}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <Badge className={`text-xs ${getAvailabilityColor(projection.availability_status)}`}>
                          {projection.availability_status}%
                        </Badge>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{projection.player_name}</p>
                          <Badge variant="outline" className="text-xs">
                            #{projection.position_rank}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {projection.team_name} • {projection.position} • {formatPrice(projection.current_price)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Form: {projection.form_3gw?.toFixed(1)}</span>
                          <span>xG: {projection.xg_per_game?.toFixed(2)}</span>
                          <span>xA: {projection.xa_per_game?.toFixed(2)}</span>
                          <span>{projection.ownership_percentage}% owned</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {projection.predicted_points?.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Points</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-medium">
                            {projection.predicted_minutes}
                          </div>
                          <div className="text-xs text-muted-foreground">Mins</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-center text-sm">
                          <div>
                            <div className="font-medium">{projection.predicted_goals?.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">G</div>
                          </div>
                          <div>
                            <div className="font-medium">{projection.predicted_assists?.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">A</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getConfidenceColor(projection.ensemble_confidence)}`}>
                          {projection.ensemble_confidence}% confidence
                        </Badge>
                        <Badge className={`text-xs ${getRiskColor(projection.injury_risk)}`}>
                          {projection.injury_risk} risk
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        XGB: {projection.xgboost_score?.toFixed(1)} | RF: {projection.random_forest_score?.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No projections found matching your criteria</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Methodology */}
        <Card>
          <CardHeader>
            <CardTitle>OpenFPL Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">Ensemble Architecture</h4>
                <ul className="space-y-1">
                  <li>• Position-specific XGBoost + Random Forest models</li>
                  <li>• Separate models for GK, DEF/MID/FWD, Assistant Managers</li>
                  <li>• K-Best hyperparameter search with cross-validation</li>
                  <li>• Weighted ensemble scoring with confidence metrics</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Feature Engineering</h4>
                <ul className="space-y-1">
                  <li>• Multi-horizon features (1, 3, 5, 10, 38 matches)</li>
                  <li>• Player, team, and opponent-specific metrics</li>
                  <li>• FPL availability status (0-100%)</li>
                  <li>• Understat advanced stats (xG, xA, xGA, PPDA)</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-center">
                <strong>Based on:</strong> OpenFPL research by Daniel Groos (2025) | 
                <a href="https://arxiv.org/abs/2508.09992" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  arXiv:2508.09992
                </a> | 
                <a href="https://github.com/daniegr/OpenFPL" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  GitHub Repository
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
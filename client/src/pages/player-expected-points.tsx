import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Target, TrendingUp, BarChart3, Search, RefreshCw, Zap, AlertTriangle, Star } from "lucide-react";
import Layout from "../components/layout";
import { BootstrapData } from "@shared/schema";

interface PlayerExpectedPoints {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  gameweek: number;
  
  // Expected points breakdown
  expected_points: number;
  expected_minutes: number;
  
  // Scoring breakdown
  appearance_points: number;
  goal_points: number;
  assist_points: number;
  clean_sheet_points: number;
  bonus_points: number;
  save_points: number;
  penalty_save_points: number;
  
  // Probability metrics
  goal_probability: number;
  assist_probability: number;
  clean_sheet_probability: number;
  bonus_probability: number;
  minutes_probability: number;
  
  // Expected counts
  expected_goals: number;
  expected_assists: number;
  expected_saves: number;
  expected_clean_sheets: number;
  expected_bonus: number;
  
  // Form and context
  form_rating: number;
  fixture_difficulty: number;
  ownership_percentage: number;
  price_value_ratio: number;
  
  // Risk factors
  injury_risk: string;
  rotation_risk: string;
  suspension_risk: string;
  
  // Model confidence
  confidence_score: number;
  variance: number;
  
  // Comparison metrics
  position_rank: number;
  price_rank: number;
  value_rank: number;
}

interface ExpectedPointsMetrics {
  total_players_analyzed: number;
  avg_expected_points: number;
  top_expected_points: number;
  model_accuracy: number;
  last_updated: string;
}

export default function PlayerExpectedPoints() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [gameweekFilter, setGameweekFilter] = useState("next");
  const [priceRangeMin, setPriceRangeMin] = useState("");
  const [priceRangeMax, setPriceRangeMax] = useState("");
  const [minOwnership, setMinOwnership] = useState("");
  const [sortBy, setSortBy] = useState("expected_points");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: expectedPoints, isLoading: isLoadingExpectedPoints, error: expectedPointsError } = useQuery({
    queryKey: ["/api/player-expected-points", gameweekFilter],
    refetchInterval: 300000, // 5 minutes
  });

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/expected-points-metrics"],
    refetchInterval: 600000, // 10 minutes
  });

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const filteredExpectedPoints = Array.isArray(expectedPoints) ? expectedPoints.filter((player: PlayerExpectedPoints) => {
    const matchesSearch = !searchTerm || 
      player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || player.position === positionFilter;
    
    const matchesPriceMin = !priceRangeMin || player.current_price >= parseFloat(priceRangeMin) * 10;
    const matchesPriceMax = !priceRangeMax || player.current_price <= parseFloat(priceRangeMax) * 10;
    
    const matchesOwnership = !minOwnership || player.ownership_percentage >= parseFloat(minOwnership);
    
    return matchesSearch && matchesPosition && matchesPriceMin && matchesPriceMax && matchesOwnership;
  }).sort((a: PlayerExpectedPoints, b: PlayerExpectedPoints) => {
    switch (sortBy) {
      case "expected_points":
        return b.expected_points - a.expected_points;
      case "value":
        return b.price_value_ratio - a.price_value_ratio;
      case "form":
        return b.form_rating - a.form_rating;
      case "ownership":
        return b.ownership_percentage - a.ownership_percentage;
      case "price":
        return a.current_price - b.current_price;
      default:
        return b.expected_points - a.expected_points;
    }
  }) : [];

  const formatPrice = (price: number) => `£${(price / 10).toFixed(1)}m`;
  
  const getRiskColor = (risk: string) => {
    if (risk === "Low") return "bg-green-100 text-green-800";
    if (risk === "Medium") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getValueColor = (ratio: number) => {
    if (ratio >= 1.2) return "text-green-600";
    if (ratio >= 0.8) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Calculator className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-bold">Player Expected Points</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive expected points analysis with detailed scoring breakdowns, 
            probability metrics, and risk assessment for optimal player selection
          </p>
        </div>

        {/* Summary Metrics */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Model Performance Summary
              </CardTitle>
              <CardDescription>
                Real-time analysis metrics and model accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{(metrics as any).total_players_analyzed}</div>
                  <div className="text-sm text-muted-foreground">Players Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{(metrics as any).avg_expected_points?.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Avg Expected Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{(metrics as any).top_expected_points?.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Top Expected Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{((metrics as any).model_accuracy * 100)?.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Model Accuracy</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Last updated: {(metrics as any).last_updated} • Updated every 30 minutes
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters & Sorting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
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

              <Select value={gameweekFilter} onValueChange={setGameweekFilter}>
                <SelectTrigger data-testid="select-gameweek">
                  <SelectValue placeholder="Target GW" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next">Next GW</SelectItem>
                  <SelectItem value="current">Current GW</SelectItem>
                  <SelectItem value="upcoming">Next 3 GWs</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Min price £X.X"
                value={priceRangeMin}
                onChange={(e) => setPriceRangeMin(e.target.value)}
                type="number"
                step="0.1"
                min="3.9"
                max="15.0"
                data-testid="input-price-min"
              />

              <Input
                placeholder="Max price £X.X"
                value={priceRangeMax}
                onChange={(e) => setPriceRangeMax(e.target.value)}
                type="number"
                step="0.1"
                min="3.9"
                max="15.0"
                data-testid="input-price-max"
              />

              <Input
                placeholder="Min ownership %"
                value={minOwnership}
                onChange={(e) => setMinOwnership(e.target.value)}
                type="number"
                min="0"
                max="100"
                data-testid="input-ownership"
              />

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expected_points">Expected Points</SelectItem>
                  <SelectItem value="value">Value Ratio</SelectItem>
                  <SelectItem value="form">Form Rating</SelectItem>
                  <SelectItem value="ownership">Ownership</SelectItem>
                  <SelectItem value="price">Price (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expected Points Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Expected Points Analysis
              {gameweekFilter && (
                <Badge variant="outline">
                  {gameweekFilter === "next" ? "Next GW" : 
                   gameweekFilter === "current" ? "Current GW" : "Next 3 GWs"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Comprehensive expected points with detailed scoring breakdown and probability analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingExpectedPoints ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
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
            ) : expectedPointsError ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load expected points analysis. Please try again or contact support.
                </AlertDescription>
              </Alert>
            ) : filteredExpectedPoints.length > 0 ? (
              <div className="space-y-4">
                {filteredExpectedPoints.map((player: PlayerExpectedPoints, index: number) => (
                  <div 
                    key={`${player.player_id}-${player.gameweek}-${index}`}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    data-testid={`expected-points-${player.player_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-purple-600" />
                          <Badge variant="outline" className="text-xs">
                            #{player.position_rank}
                          </Badge>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{player.player_name}</h3>
                            {player.value_rank <= 10 && (
                              <Badge className="bg-gold text-black">
                                <Star className="h-3 w-3 mr-1" />
                                Top Value
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-3">
                            {player.team_name} • {player.position} • {formatPrice(player.current_price)} • {player.ownership_percentage}% owned
                          </div>
                          
                          {/* Expected Points Breakdown */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                            <div className="bg-muted/30 rounded p-2 text-center">
                              <div className="text-xs text-muted-foreground">Appearance</div>
                              <div className="font-medium">{player.appearance_points?.toFixed(1)}</div>
                            </div>
                            <div className="bg-muted/30 rounded p-2 text-center">
                              <div className="text-xs text-muted-foreground">Goals</div>
                              <div className="font-medium text-green-600">{player.goal_points?.toFixed(1)}</div>
                            </div>
                            <div className="bg-muted/30 rounded p-2 text-center">
                              <div className="text-xs text-muted-foreground">Assists</div>
                              <div className="font-medium text-blue-600">{player.assist_points?.toFixed(1)}</div>
                            </div>
                            <div className="bg-muted/30 rounded p-2 text-center">
                              <div className="text-xs text-muted-foreground">Clean Sheet</div>
                              <div className="font-medium text-yellow-600">{player.clean_sheet_points?.toFixed(1)}</div>
                            </div>
                            <div className="bg-muted/30 rounded p-2 text-center">
                              <div className="text-xs text-muted-foreground">Bonus</div>
                              <div className="font-medium text-purple-600">{player.bonus_points?.toFixed(1)}</div>
                            </div>
                          </div>
                          
                          {/* Risk Assessment */}
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${getRiskColor(player.injury_risk)}`}>
                              {player.injury_risk} Injury Risk
                            </Badge>
                            <Badge className={`text-xs ${getRiskColor(player.rotation_risk)}`}>
                              {player.rotation_risk} Rotation Risk
                            </Badge>
                            {player.suspension_risk !== "None" && (
                              <Badge className="text-xs bg-red-100 text-red-800">
                                {player.suspension_risk} Suspension
                              </Badge>
                            )}
                          </div>
                          
                          {/* Form and Fixture */}
                          <div className="text-xs text-muted-foreground">
                            Form: {player.form_rating?.toFixed(1)}/10 • 
                            Fixture Difficulty: {player.fixture_difficulty}/5 • 
                            Minutes Probability: {(player.minutes_probability * 100)?.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">
                            {player.expected_points?.toFixed(1)}
                          </div>
                          <div className="text-sm text-muted-foreground">Expected Points</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-center text-sm">
                          <div>
                            <div className="font-medium">{player.expected_goals?.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">xG</div>
                          </div>
                          <div>
                            <div className="font-medium">{player.expected_assists?.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">xA</div>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getConfidenceColor(player.confidence_score)}`}
                            >
                              {player.confidence_score}% confidence
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline"
                              className={`text-xs ${getValueColor(player.price_value_ratio)}`}
                            >
                              {player.price_value_ratio?.toFixed(2)} value
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Variance: ±{player.variance?.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No players found matching your criteria</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Methodology */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Points Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">Scoring Components</h4>
                <ul className="space-y-1">
                  <li>• Appearance points based on minutes probability</li>
                  <li>• Goal points using position-specific xG models</li>
                  <li>• Assist points from creativity and chance creation</li>
                  <li>• Clean sheet probability for defenders/goalkeepers</li>
                  <li>• Bonus points prediction using BPS correlations</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Risk Analysis</h4>
                <ul className="space-y-1">
                  <li>• Injury risk from availability and fitness data</li>
                  <li>• Rotation risk based on squad depth and form</li>
                  <li>• Suspension risk from cards and disciplinary record</li>
                  <li>• Fixture difficulty using opponent strength ratings</li>
                  <li>• Variance calculations for confidence intervals</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-center">
                <strong>Advanced Analytics:</strong> Expected points calculated using ensemble models 
                combining historical performance, current form, fixture analysis, and position-specific 
                scoring patterns. Updated every 30 minutes with latest FPL data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
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
  const [viewMode, setViewMode] = useState<"list" | "table">("table");
  const [activeTab, setActiveTab] = useState("predicted_points");
  const [tableSortBy, setTableSortBy] = useState<{ gameweek: string; metric: string; direction: "asc" | "desc" }>({
    gameweek: "next",
    metric: "predicted_points", 
    direction: "desc"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: projections, isLoading: isLoadingProjections, error: projectionsError } = useQuery({
    queryKey: ["/api/openfpl-projections", horizonFilter, gameweekFilter],
    refetchInterval: 300000, // 5 minutes
  });

  // Fetch data for multiple gameweeks for table view (6 gameweeks)
  const { data: multiGwData, isLoading: isLoadingMultiGw } = useQuery({
    queryKey: ["/api/openfpl-projections-multi", horizonFilter],
    queryFn: async () => {
      const gameweeks = ["current", "next", "upcoming"];
      // For additional gameweeks, we'll use the horizon parameter to get multi-gameweek projections
      const promises = gameweeks.map(gw => 
        fetch(`/api/openfpl-projections/${horizonFilter}/${gw}`).then(res => res.json())
      );
      
      // Also fetch extended horizon data to simulate gw+3, gw+4, gw+5
      promises.push(
        fetch(`/api/openfpl-projections/2/next`).then(res => res.json()),
        fetch(`/api/openfpl-projections/3/next`).then(res => res.json()),
        fetch(`/api/openfpl-projections/3/upcoming`).then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      const allGameweeks = ["current", "next", "upcoming", "gw+3", "gw+4", "gw+5"];
      return allGameweeks.map((gw, index) => ({ gameweek: gw, data: results[index] || [] }));
    },
    refetchInterval: 300000,
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

  // Get actual gameweek numbers from bootstrap data
  const getGameweekNumber = (gwType: string) => {
    if (!bootstrapData?.events) return gwType;
    
    const currentGW = bootstrapData.events.find(event => event.is_current)?.id || 1;
    const nextGW = bootstrapData.events.find(event => event.is_next)?.id || currentGW + 1;
    
    switch (gwType) {
      case "current":
        return `GW${currentGW}`;
      case "next":
        return `GW${nextGW}`;
      case "upcoming":
        return `GW${nextGW + 1}`;
      case "gw+3":
        return `GW${nextGW + 2}`;
      case "gw+4":
        return `GW${nextGW + 3}`;
      case "gw+5":
        return `GW${nextGW + 4}`;
      case "total":
        return "Total";
      default:
        return gwType;
    }
  };

  // Create table data structure
  const getTableData = () => {
    if (!multiGwData || !Array.isArray(multiGwData)) return [];
    
    const playerMap = new Map();
    
    multiGwData.forEach(({ gameweek, data }) => {
      if (Array.isArray(data)) {
        data.forEach((projection: OpenFPLProjection) => {
          if (!playerMap.has(projection.player_id)) {
            playerMap.set(projection.player_id, {
              player_id: projection.player_id,
              player_name: projection.player_name,
              team_name: projection.team_name,
              position: projection.position,
              current_price: projection.current_price,
              ownership_percentage: projection.ownership_percentage,
              injury_risk: projection.injury_risk,
              rotation_risk: projection.rotation_risk,
              ensemble_confidence: projection.ensemble_confidence,
              gameweeks: {}
            });
          }
          
          playerMap.get(projection.player_id).gameweeks[gameweek] = projection;
        });
      }
    });
    
    return Array.from(playerMap.values()).filter(player => {
      const matchesSearch = !searchTerm || 
        player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      
      const matchesOwnership = !minOwnership || player.ownership_percentage >= parseFloat(minOwnership);
      
      const matchesPrice = !maxPrice || player.current_price <= parseFloat(maxPrice) * 10;
      
      return matchesSearch && matchesPosition && matchesOwnership && matchesPrice;
    }).sort((a, b) => {
      // Table view uses its own sorting
      if (viewMode === "table") {
        const aValue = a.gameweeks[tableSortBy.gameweek]?.[tableSortBy.metric as keyof OpenFPLProjection] || 0;
        const bValue = b.gameweeks[tableSortBy.gameweek]?.[tableSortBy.metric as keyof OpenFPLProjection] || 0;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return tableSortBy.direction === "desc" ? bValue - aValue : aValue - bValue;
        }
        return 0;
      }
      
      // List view uses original sorting
      const aData = a.gameweeks[gameweekFilter];
      const bData = b.gameweeks[gameweekFilter];
      if (!aData || !bData) return 0;
      
      if (bData.predicted_points !== aData.predicted_points) {
        return bData.predicted_points - aData.predicted_points;
      }
      return bData.ensemble_confidence - aData.ensemble_confidence;
    });
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

  const tableData = getTableData();
  const gameweekLabels = ["current", "next", "upcoming", "gw+3", "gw+4", "gw+5"];

  // Filter and paginate table data
  const filteredTableData = tableData.filter(player => {
    if (!searchQuery) return true;
    return player.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           player.team_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalPages = playersPerPage === 699 ? 1 : Math.ceil(filteredTableData.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const paginatedTableData = playersPerPage === 699 ? filteredTableData : filteredTableData.slice(startIndex, startIndex + playersPerPage);

  const formatPrice = (price: number) => `£${(price / 10).toFixed(1)}m`;

  const getRiskBadgeColor = (risk: string) => {
    if (risk === "Low") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (risk === "Medium") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const handleTableSort = (gameweek: string, metric: string) => {
    setTableSortBy(prev => ({
      gameweek,
      metric,
      direction: prev.gameweek === gameweek && prev.metric === metric && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  const getSortIcon = (gameweek: string, metric: string) => {
    if (tableSortBy.gameweek === gameweek && tableSortBy.metric === metric) {
      return tableSortBy.direction === "desc" ? "↓" : "↑";
    }
    return "⇅";
  };

  const getMetricValue = (player: any, gameweek: string, metric: string) => {
    if (gameweek === "total") {
      // Calculate total across all gameweeks
      let total = 0;
      gameweekLabels.forEach(gw => {
        const playerData = player.gameweeks[gw];
        if (playerData && typeof playerData[metric] === 'number') {
          total += playerData[metric];
        }
      });
      return total.toFixed(1);
    }
    
    const playerData = player.gameweeks[gameweek];
    if (!playerData) return "-";
    
    const value = playerData[metric];
    if (typeof value === 'number') {
      if (metric.includes('confidence') || metric.includes('percentage')) {
        return value.toFixed(1);
      }
      return value.toFixed(1);
    }
    return value || "-";
  };
  
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

              <Select value={viewMode} onValueChange={(value: "list" | "table") => setViewMode(value)}>
                <SelectTrigger data-testid="select-view-mode">
                  <SelectValue placeholder="View Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table View</SelectItem>
                  <SelectItem value="list">List View</SelectItem>
                </SelectContent>
              </Select>
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
              {viewMode === "table" ? 
                "Multi-gameweek table view with tabbed metrics for comprehensive ML analysis" :
                "Position-specific ensemble models trained on 4 seasons of FPL + Understat data"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === "table" ? (
              // Table View with Tabs
              <div className="space-y-4">
                {isLoadingMultiGw ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                    <p>Loading multi-gameweek ML projections...</p>
                  </div>
                ) : tableData.length > 0 ? (
                  <div>
                  {/* Table Controls */}
                  <div className="flex flex-wrap gap-4 mb-4 items-center justify-between">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Search players or teams..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-64"
                        data-testid="input-table-search"
                      />
                      <Select value={playersPerPage.toString()} onValueChange={(value) => {
                        setPlayersPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25 per page</SelectItem>
                          <SelectItem value="50">50 per page</SelectItem>
                          <SelectItem value="100">100 per page</SelectItem>
                          <SelectItem value="699">All players</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {playersPerPage === 699 ? 
                        `Showing all ${filteredTableData.length} players` :
                        `Showing ${startIndex + 1}-${Math.min(startIndex + playersPerPage, filteredTableData.length)} of ${filteredTableData.length} players`
                      }
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="predicted_points">Predicted Points</TabsTrigger>
                      <TabsTrigger value="predicted_minutes">Minutes</TabsTrigger>
                      <TabsTrigger value="predicted_goals">Goals</TabsTrigger>
                      <TabsTrigger value="predicted_assists">Assists</TabsTrigger>
                      <TabsTrigger value="predicted_clean_sheets">Clean Sheets</TabsTrigger>
                      <TabsTrigger value="predicted_bonus">Bonus</TabsTrigger>
                    </TabsList>
                    
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
                            <th className="border-r border-gray-200 dark:border-gray-700 p-4 text-left sticky left-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 min-w-[220px] z-10">
                              <div className="font-semibold">Player Info</div>
                              <div className="text-xs text-muted-foreground mt-1">Name • Team • Position • Price</div>
                            </th>
                            {gameweekLabels.map(gw => (
                              <th key={gw} className="border border-gray-200 dark:border-gray-700 p-3 text-center min-w-[100px]">
                                <button
                                  onClick={() => handleTableSort(gw, activeTab)}
                                  className="w-full text-center hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                                  title={`Sort by ${activeTab} for ${getGameweekNumber(gw)}`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{getGameweekNumber(gw)}</span>
                                    <span className="text-xs opacity-60">
                                      {getSortIcon(gw, activeTab)}
                                    </span>
                                  </div>
                                </button>
                              </th>
                            ))}
                            <th className="border border-gray-200 dark:border-gray-700 p-3 text-center min-w-[100px] bg-blue-50 dark:bg-blue-900/20">
                              <button
                                onClick={() => handleTableSort("total", activeTab)}
                                className="w-full text-center hover:bg-muted/50 rounded px-2 py-1 transition-colors font-semibold"
                                title={`Sort by total ${activeTab} across all gameweeks`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Total</span>
                                  <span className="text-xs opacity-60">
                                    {getSortIcon("total", activeTab)}
                                  </span>
                                </div>
                              </button>
                            </th>
                            <th className="border border-gray-200 dark:border-gray-700 p-3 text-center min-w-[120px]">
                              ML Stats
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedTableData.map((player, index) => (
                            <tr key={player.player_id} className="hover:bg-muted/30">
                              <td className="border border-gray-200 dark:border-gray-700 p-3 sticky left-0 bg-background">
                                <div className="space-y-1">
                                  <div className="font-medium">{player.player_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {player.team_name} • {player.position} • {formatPrice(player.current_price)}
                                  </div>
                                  <div className="flex gap-1">
                                    <Badge className={`text-xs ${getRiskBadgeColor(player.injury_risk)}`}>
                                      {player.injury_risk[0]}I
                                    </Badge>
                                    <Badge className={`text-xs ${getRiskBadgeColor(player.rotation_risk)}`}>
                                      {player.rotation_risk[0]}R
                                    </Badge>
                                  </div>
                                </div>
                              </td>
                              {gameweekLabels.map(gw => (
                                <td key={gw} className="border border-gray-200 dark:border-gray-700 p-3 text-center">
                                  <div className="font-medium">
                                    {getMetricValue(player, gw, activeTab)}
                                  </div>
                                  {player.gameweeks[gw] && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      H{horizonFilter}
                                    </div>
                                  )}
                                </td>
                              ))}
                              <td className="border border-gray-200 dark:border-gray-700 p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                  {getMetricValue(player, "total", activeTab)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  6 GWs
                                </div>
                              </td>
                              <td className="border border-gray-200 dark:border-gray-700 p-3">
                                <div className="space-y-1 text-xs">
                                  <div>Own: {player.ownership_percentage?.toFixed(1)}%</div>
                                  <div className="text-green-600">
                                    Conf: {player.ensemble_confidence?.toFixed(0)}%
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mt-4">
                      <p><strong>Legend:</strong> I = Injury Risk, R = Rotation Risk, H{horizonFilter} = {horizonFilter} Gameweek{horizonFilter !== "1" ? "s" : ""} Horizon, Conf = ML Ensemble Confidence</p>
                      <p>Showing {filteredTableData.length} players from all 699 analyzed with 6 gameweeks of projections plus totals. Click gameweek headers to sort by that metric. Switch tabs to view different ML predictions across gameweeks.</p>
                      <p><strong>Current sort:</strong> {getGameweekNumber(tableSortBy.gameweek)} - {activeTab} ({tableSortBy.direction === "desc" ? "Highest first" : "Lowest first"})</p>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </Tabs>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No players found matching your criteria</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            ) : (
              // List View (Original)
              <div>
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
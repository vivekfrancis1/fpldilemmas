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
  const [viewMode, setViewMode] = useState<"list" | "table">("table");
  const [activeTab, setActiveTab] = useState("expected_points");
  const [tableSortBy, setTableSortBy] = useState<{ gameweek: string; metric: string; direction: "asc" | "desc" }>({
    gameweek: "next",
    metric: "expected_points", 
    direction: "desc"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(50);
  const [tableSearchQuery, setTableSearchQuery] = useState("");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: expectedPoints, isLoading: isLoadingExpectedPoints, error: expectedPointsError } = useQuery({
    queryKey: ["/api/player-expected-points", gameweekFilter],
    refetchInterval: 300000, // 5 minutes
  });

  // Fetch data for multiple gameweeks for table view (6 gameweeks)
  const { data: multiGwData, isLoading: isLoadingMultiGw } = useQuery({
    queryKey: ["/api/player-expected-points-multi"],
    queryFn: async () => {
      const gameweeks = ["current", "next", "upcoming"];
      // For additional gameweeks, we'll use projections based on the current data
      const promises = gameweeks.map(gw => 
        fetch(`/api/player-expected-points/${gw}`).then(res => res.json())
      );
      
      // Also fetch extended gameweek data by repeating the pattern
      promises.push(
        fetch(`/api/player-expected-points/upcoming`).then(res => res.json()),
        fetch(`/api/player-expected-points/upcoming`).then(res => res.json()),
        fetch(`/api/player-expected-points/upcoming`).then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      const allGameweeks = ["current", "next", "upcoming", "gw+3", "gw+4", "gw+5"];
      return allGameweeks.map((gw, index) => ({ gameweek: gw, data: results[index] || [] }));
    },
    refetchInterval: 300000,
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

  // Create table data structure
  const getTableData = () => {
    if (!multiGwData || !Array.isArray(multiGwData)) return [];
    
    const playerMap = new Map();
    
    multiGwData.forEach(({ gameweek, data }) => {
      if (Array.isArray(data)) {
        data.forEach((player: PlayerExpectedPoints) => {
          if (!playerMap.has(player.player_id)) {
            playerMap.set(player.player_id, {
              player_id: player.player_id,
              player_name: player.player_name,
              team_name: player.team_name,
              position: player.position,
              current_price: player.current_price,
              ownership_percentage: player.ownership_percentage,
              form_rating: player.form_rating,
              injury_risk: player.injury_risk,
              rotation_risk: player.rotation_risk,
              confidence_score: player.confidence_score,
              price_value_ratio: player.price_value_ratio,
              gameweeks: {}
            });
          }
          
          playerMap.get(player.player_id).gameweeks[gameweek] = player;
        });
      }
    });
    
    return Array.from(playerMap.values()).filter(player => {
      const matchesSearch = !searchTerm || 
        player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      
      const matchesPriceMin = !priceRangeMin || player.current_price >= parseFloat(priceRangeMin) * 10;
      const matchesPriceMax = !priceRangeMax || player.current_price <= parseFloat(priceRangeMax) * 10;
      
      const matchesOwnership = !minOwnership || player.ownership_percentage >= parseFloat(minOwnership);
      
      return matchesSearch && matchesPosition && matchesPriceMin && matchesPriceMax && matchesOwnership;
    }).sort((a, b) => {
      // Table view uses its own sorting
      if (viewMode === "table") {
        const aValue = a.gameweeks[tableSortBy.gameweek]?.[tableSortBy.metric as keyof PlayerExpectedPoints] || 0;
        const bValue = b.gameweeks[tableSortBy.gameweek]?.[tableSortBy.metric as keyof PlayerExpectedPoints] || 0;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return tableSortBy.direction === "desc" ? bValue - aValue : aValue - bValue;
        }
        return 0;
      }
      
      // List view uses filter-based sorting
      const aValue = a.gameweeks[gameweekFilter]?.[sortBy as keyof PlayerExpectedPoints] || 0;
      const bValue = b.gameweeks[gameweekFilter]?.[sortBy as keyof PlayerExpectedPoints] || 0;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return bValue - aValue;
      }
      return 0;
    });
  };

  const tableData = getTableData();
  const gameweekLabels = ["current", "next", "upcoming", "gw+3", "gw+4", "gw+5"];

  // Filter and paginate table data
  const filteredTableData = tableData.filter(player => {
    if (!tableSearchQuery) return true;
    return player.player_name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
           player.team_name.toLowerCase().includes(tableSearchQuery.toLowerCase());
  });

  const totalPages = Math.ceil(filteredTableData.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const paginatedTableData = filteredTableData.slice(startIndex, startIndex + playersPerPage);

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
      if (metric.includes('probability') || metric.includes('ratio')) {
        return total.toFixed(2);
      }
      return total.toFixed(1);
    }
    
    const playerData = player.gameweeks[gameweek];
    if (!playerData) return "-";
    
    const value = playerData[metric];
    if (typeof value === 'number') {
      if (metric.includes('probability') || metric.includes('ratio')) {
        return value.toFixed(2);
      }
      return value.toFixed(1);
    }
    return value || "-";
  };

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
                  <SelectItem value="next">{getGameweekNumber("next")}</SelectItem>
                  <SelectItem value="current">{getGameweekNumber("current")}</SelectItem>
                  <SelectItem value="upcoming">{getGameweekNumber("upcoming")}</SelectItem>
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

        {/* Expected Points Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Expected Points Analysis
              {gameweekFilter && (
                <Badge variant="outline">
                  {getGameweekNumber(gameweekFilter)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {viewMode === "table" ? 
                "Multi-gameweek table view with tabbed metrics for comprehensive analysis" :
                "Comprehensive expected points with detailed scoring breakdown and probability analysis"
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
                    <p>Loading multi-gameweek data...</p>
                  </div>
                ) : tableData.length > 0 ? (
                  <div>
                  {/* Table Controls */}
                  <div className="flex flex-wrap gap-4 mb-4 items-center justify-between">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Search players or teams..."
                        value={tableSearchQuery}
                        onChange={(e) => {
                          setTableSearchQuery(e.target.value);
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
                      Showing {startIndex + 1}-{Math.min(startIndex + playersPerPage, filteredTableData.length)} of {filteredTableData.length} players
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="expected_points">Total Points</TabsTrigger>
                      <TabsTrigger value="appearance_points">Appearance Points</TabsTrigger>
                      <TabsTrigger value="goal_points">Goal Points</TabsTrigger>
                      <TabsTrigger value="assist_points">Assist Points</TabsTrigger>
                      <TabsTrigger value="clean_sheet_points">Clean Sheet Points</TabsTrigger>
                      <TabsTrigger value="bonus_points">Bonus Points</TabsTrigger>
                    </TabsList>
                    
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30">
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-left sticky left-0 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 min-w-[180px] z-10">
                              <div className="font-semibold">Player</div>
                              <div className="text-xs text-muted-foreground mt-1">Name • Team</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[80px]">
                              <div className="font-semibold">Pos</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[80px]">
                              <div className="font-semibold">Price</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[90px]">
                              <div className="font-semibold">Avg Min</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[80px]">
                              <div className="font-semibold">Form</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[90px]">
                              <div className="font-semibold">Own %</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[80px]">
                              <div className="font-semibold">Value</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[90px]">
                              <div className="font-semibold">Injury</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[90px]">
                              <div className="font-semibold">Rotation</div>
                            </th>
                            <th className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[90px]">
                              <div className="font-semibold">Conf %</div>
                            </th>
                            {gameweekLabels.map(gw => (
                              <th key={gw} className="border-r border-gray-200 dark:border-gray-700 p-3 text-center min-w-[90px]">
                                <button
                                  onClick={() => handleTableSort(gw, activeTab)}
                                  className="w-full text-center hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-md px-2 py-2 transition-all duration-200 hover:scale-105"
                                  title={`Sort by ${activeTab} for ${getGameweekNumber(gw)}`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-medium">{getGameweekNumber(gw)}</span>
                                    <span className="text-xs opacity-60">
                                      {getSortIcon(gw, activeTab)}
                                    </span>
                                  </div>
                                </button>
                              </th>
                            ))}
                            <th className="p-3 text-center min-w-[90px] bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50">
                              <button
                                onClick={() => handleTableSort("total", activeTab)}
                                className="w-full text-center hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-md px-2 py-2 transition-all duration-200 hover:scale-105"
                                title={`Sort by total ${activeTab} across all gameweeks`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-bold">Total</span>
                                  <span className="text-xs opacity-60">
                                    {getSortIcon("total", activeTab)}
                                  </span>
                                </div>
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedTableData.map((player, index) => (
                            <tr key={player.player_id} className="hover:bg-muted/30">
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 sticky left-0 bg-background">
                                <div className="space-y-1">
                                  <div className="font-medium">{player.player_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {player.team_name}
                                  </div>
                                </div>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <span className="font-medium">{player.position}</span>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <span className="font-medium">{formatPrice(player.current_price)}</span>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <span className="font-medium">{player.expected_minutes?.toFixed(0) || 'N/A'}</span>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <span className="font-medium">{player.form || 'N/A'}</span>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <span className="font-medium">{player.ownership_percentage?.toFixed(1)}%</span>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <span className="font-medium">{player.value_ratio?.toFixed(1) || 'N/A'}</span>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <Badge className={`text-xs ${getRiskBadgeColor(player.injury_risk)}`}>
                                  {player.injury_risk}
                                </Badge>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <Badge className={`text-xs ${getRiskBadgeColor(player.rotation_risk)}`}>
                                  {player.rotation_risk}
                                </Badge>
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                <span className="font-medium text-green-600">{player.confidence_score?.toFixed(0)}%</span>
                              </td>
                              {gameweekLabels.map(gw => (
                                <td key={gw} className="border-r border-gray-200 dark:border-gray-700 p-3 text-center">
                                  <div className="font-medium">
                                    {getMetricValue(player, gw, activeTab)}
                                  </div>
                                  {player.gameweeks[gw] && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {Math.round(player.gameweeks[gw].expected_minutes)}min
                                    </div>
                                  )}
                                </td>
                              ))}
                              <td className="p-3 text-center bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50">
                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                  {getMetricValue(player, "total", activeTab)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  6 GWs
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mt-4">
                      <p><strong>New Column Structure:</strong> Position, Price, Average minutes, Form, Ownership %, Value ratio, Injury risk, Rotation risk, and Confidence level now displayed as individual columns for better analysis.</p>
                      <p>Showing {filteredTableData.length} players from all 699 analyzed with 6 gameweeks of projections plus totals. Click gameweek headers to sort by that metric. Switch tabs to view different scoring metrics across gameweeks.</p>
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
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No players found matching your criteria</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            ) : (
              // List View (Original)
              <div>
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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Brain, BarChart3, Target, AlertTriangle, TrendingUp, Star, Clock, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<keyof OpenFPLProjection>("predicted_points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

  const handleSort = (column: keyof OpenFPLProjection) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: keyof OpenFPLProjection) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
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
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue || '');
    const bStr = String(bValue || '');
    
    if (sortDirection === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
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
      <div className="w-full max-w-full px-2 md:px-4 py-4 md:py-6 overflow-x-hidden">
        {/* Compact Header */}
        <div className="text-center mb-4 md:mb-6">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-lg p-3 md:p-4 shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="h-5 w-5 md:h-6 md:w-6" />
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Player Projections</h1>
            </div>
            <p className="text-blue-100 text-xs md:text-sm">
              🤖 Advanced ML ensemble predictions using XGBoost + Random Forest models
            </p>
          </div>
        </div>

        <div className="w-full space-y-4 md:space-y-6">

          {/* Responsive Filters */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl">🔍 Smart Filters & Search</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                <div className="relative sm:col-span-2 md:col-span-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 md:h-12 border-2"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-position">
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
                  <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-horizon">
                    <SelectValue placeholder="Horizon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 GW</SelectItem>
                    <SelectItem value="2">2 GW</SelectItem>
                    <SelectItem value="3">3 GW</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={gameweekFilter} onValueChange={setGameweekFilter}>
                  <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-gameweek">
                    <SelectValue placeholder="Target GW" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next">Next GW</SelectItem>
                    <SelectItem value="current">Current GW</SelectItem>
                    <SelectItem value="all">All Available</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Min own %"
                  value={minOwnership}
                  onChange={(e) => setMinOwnership(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  className="h-10 md:h-12 border-2"
                  data-testid="input-ownership"
                />

                <Input
                  placeholder="Max £X.Xm"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  type="number"
                  step="0.1"
                  min="3.9"
                  max="15.0"
                  className="h-10 md:h-12 border-2"
                  data-testid="input-price"
                />
              </div>
            </CardContent>
          </Card>

          {/* Responsive Projections Results */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 md:p-6">
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg md:text-xl lg:text-2xl">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  <span className="hidden sm:inline">Player Projections</span>
                  <span className="sm:hidden">Player Projections</span>
                </div>
                {horizonFilter && (
                  <Badge variant="outline" className="text-xs md:text-sm px-2 md:px-3 py-1">
                    {horizonFilter} GW{horizonFilter !== "1" ? "s" : ""} Ahead
                  </Badge>
                )}
              </CardTitle>
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
                  {/* Responsive Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 md:p-6 rounded-lg md:rounded-xl border-2 border-blue-200 shadow-md">
                      <div className="text-2xl md:text-3xl font-bold text-blue-700">{filteredProjections.length}</div>
                      <div className="text-xs md:text-sm text-blue-600 font-medium">Players Available</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 md:p-6 rounded-lg md:rounded-xl border-2 border-green-200 shadow-md">
                      <div className="text-2xl md:text-3xl font-bold text-green-700">
                        {filteredProjections[0]?.predicted_points?.toFixed(1) || "0.0"}
                      </div>
                      <div className="text-xs md:text-sm text-green-600 font-medium">Top Prediction</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 md:p-6 rounded-lg md:rounded-xl border-2 border-purple-200 shadow-md">
                      <div className="text-2xl md:text-3xl font-bold text-purple-700">
                        {(filteredProjections.reduce((sum, p) => sum + (p.ensemble_confidence || 0), 0) / filteredProjections.length)?.toFixed(1) || "0.0"}%
                      </div>
                      <div className="text-xs md:text-sm text-purple-600 font-medium">Avg Confidence</div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 md:p-6 rounded-lg md:rounded-xl border-2 border-orange-200 shadow-md">
                      <div className="text-2xl md:text-3xl font-bold text-orange-700">
                        {(filteredProjections.reduce((sum, p) => sum + p.current_price, 0) / filteredProjections.length / 10)?.toFixed(1) || "0.0"}m
                      </div>
                      <div className="text-xs md:text-sm text-orange-600 font-medium">Avg Price</div>
                    </div>
                  </div>

                  {/* Enhanced Scrollable Table - Full Width */}
                  <div className="w-full overflow-x-auto overflow-y-auto max-h-[70vh] bg-white rounded-xl md:rounded-2xl border-2 border-gray-200 shadow-lg">
                    <table className="text-xs md:text-sm min-w-[1000px] w-max">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                          <th className="px-2 md:px-3 py-2 text-left min-w-[140px]">
                            <button 
                              onClick={() => handleSort("player_name")}
                              className="flex items-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              Player {getSortIcon("player_name")}
                            </button>
                          </th>
                          <th className="px-1 md:px-2 py-2 text-center min-w-[50px]">
                            <button 
                              onClick={() => handleSort("predicted_points")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              Pts {getSortIcon("predicted_points")}
                            </button>
                          </th>
                          <th className="px-1 md:px-2 py-2 text-center min-w-[60px]">
                            <button 
                              onClick={() => handleSort("predicted_minutes")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              <Clock className="h-3 w-3" /> Min {getSortIcon("predicted_minutes")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[70px]">
                            <button 
                              onClick={() => handleSort("predicted_goals")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              ⚽ Goals {getSortIcon("predicted_goals")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[70px]">
                            <button 
                              onClick={() => handleSort("predicted_assists")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              🎯 Assists {getSortIcon("predicted_assists")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[60px]">
                            <button 
                              onClick={() => handleSort("predicted_clean_sheets")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              🛡️ CS {getSortIcon("predicted_clean_sheets")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[60px]">
                            <button 
                              onClick={() => handleSort("predicted_bonus")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              ⭐ Bonus {getSortIcon("predicted_bonus")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[60px]">
                            <button 
                              onClick={() => handleSort("cbit_percentage")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              CBIT% {getSortIcon("cbit_percentage")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[80px]">
                            <button 
                              onClick={() => handleSort("ensemble_confidence")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              Confidence {getSortIcon("ensemble_confidence")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[60px]">
                            <button 
                              onClick={() => handleSort("investment_risk")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              Risk {getSortIcon("investment_risk")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[80px]">
                            <button 
                              onClick={() => handleSort("ownership_percentage")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              Ownership% {getSortIcon("ownership_percentage")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[60px]">
                            <button 
                              onClick={() => handleSort("current_price")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              <DollarSign className="h-3 w-3" /> Price {getSortIcon("current_price")}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-center min-w-[70px]">
                            <button 
                              onClick={() => handleSort("availability_status")}
                              className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              Fitness {getSortIcon("availability_status")}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredProjections.map((projection: OpenFPLProjection, index: number) => (
                          <tr 
                            key={`${projection.player_id}-${index}`}
                            className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-150 group text-xs"
                          >
                            {/* Player Info */}
                            <td className="px-2 md:px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="text-sm">{getPositionIcon(projection.position)}</div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 text-xs md:text-sm group-hover:text-blue-600 transition-colors truncate">
                                    {projection.player_name}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <span className="font-medium truncate">{projection.team_name}</span>
                                    <Badge variant="outline" className="text-xs px-1 py-0 hidden sm:inline-block">
                                      {projection.position}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Predicted Points */}
                            <td className="px-1 md:px-2 py-2 text-center">
                              <div className="text-xs md:text-sm font-bold text-blue-600 bg-blue-50 rounded py-1 px-1 md:px-2 inline-block border border-blue-200">
                                {projection.predicted_points?.toFixed(1) || "0.0"}
                              </div>
                            </td>

                            {/* Minutes */}
                            <td className="px-1 md:px-2 py-2 text-center">
                              <div className="text-xs md:text-sm font-semibold text-gray-700 bg-gray-50 rounded py-1 px-1 md:px-2 inline-block border border-gray-200">
                                {projection.predicted_minutes || 0}
                              </div>
                            </td>

                            {/* Goals */}
                            <td className="px-2 py-2 text-center">
                              <div className="text-sm font-semibold text-green-600 bg-green-50 rounded py-1 px-2 inline-block border border-green-200">
                                {projection.predicted_goals?.toFixed(2) || "0.00"}
                              </div>
                            </td>

                            {/* Assists */}
                            <td className="px-2 py-2 text-center">
                              <div className="text-sm font-semibold text-purple-600 bg-purple-50 rounded py-1 px-2 inline-block border border-purple-200">
                                {projection.predicted_assists?.toFixed(2) || "0.00"}
                              </div>
                            </td>

                            {/* Clean Sheets */}
                            <td className="px-2 py-2 text-center">
                              <div className="text-sm font-semibold text-indigo-600 bg-indigo-50 rounded py-1 px-2 inline-block border border-indigo-200">
                                {projection.predicted_clean_sheets?.toFixed(2) || "0.00"}
                              </div>
                            </td>

                            {/* Bonus */}
                            <td className="px-2 py-2 text-center">
                              <div className="text-sm font-semibold text-orange-600 bg-orange-50 rounded py-1 px-2 inline-block border border-orange-200">
                                {projection.predicted_bonus?.toFixed(2) || "0.00"}
                              </div>
                            </td>

                            {/* CBIT% */}
                            <td className="px-2 py-2 text-center">
                              <div className="text-sm font-bold text-yellow-600 bg-yellow-50 rounded py-1 px-2 inline-block border border-yellow-200">
                                {projection.cbit_percentage?.toFixed(1) || "0.0"}
                              </div>
                            </td>

                            {/* Confidence */}
                            <td className="px-2 py-2 text-center">
                              <Badge className={`text-xs px-2 py-1 font-medium ${getConfidenceColor(projection.ensemble_confidence || 0)}`}>
                                {projection.ensemble_confidence?.toFixed(1) || "0.0"}
                              </Badge>
                            </td>

                            {/* Risk */}
                            <td className="px-2 py-2 text-center">
                              <Badge className={`text-xs px-2 py-1 font-medium ${getRiskColor(projection.investment_risk || "High")}`}>
                                {(projection.investment_risk || "High").charAt(0)}
                              </Badge>
                            </td>

                            {/* Ownership */}
                            <td className="px-2 py-2 text-center">
                              <div className="text-sm font-semibold text-gray-700 bg-gray-50 rounded py-1 px-2 inline-block border border-gray-200">
                                {projection.ownership_percentage?.toFixed(1) || "0.0"}
                              </div>
                            </td>

                            {/* Price */}
                            <td className="px-2 py-2 text-center">
                              <div className="text-sm font-bold text-gray-900 bg-gray-50 rounded py-1 px-2 inline-block border border-gray-200">
                                {formatPrice(projection.current_price)}
                              </div>
                            </td>

                            {/* Availability Status */}
                            <td className="px-2 py-2 text-center">
                              <Badge className={`text-xs px-2 py-1 font-medium ${getAvailabilityColor(projection.availability_status || 100)}`}>
                                {projection.availability_status === 100 ? "✓" : 
                                 projection.availability_status >= 75 ? "⚠" :
                                 projection.availability_status >= 50 ? "?" :
                                 projection.availability_status >= 25 ? "⚠" : "✗"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Results Summary */}
                  <div className="mt-12 text-center bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                    <div className="text-lg text-gray-700 font-medium">
                      Showing <span className="font-bold text-blue-600">{filteredProjections.length}</span> of <span className="font-bold">{Array.isArray(projections) ? projections.length : 0}</span> total predictions
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Updated every 5 minutes • Processing all 693 active FPL players
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsive Model Performance Metrics - Moved to Bottom */}
          {modelMetrics && (
            <Card className="border-2 border-gradient shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl lg:text-2xl">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  <span className="hidden sm:inline">Model Performance vs Commercial Benchmarks</span>
                  <span className="sm:hidden">Model Performance</span>
                </CardTitle>
                <CardDescription className="text-sm md:text-base lg:text-lg">
                  Real-time accuracy metrics compared to leading FPL services
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-5 gap-2 md:gap-4">
                  <div className="text-center p-2 md:p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-lg md:text-xl font-bold text-green-600">{(modelMetrics as any).rmse_overall?.toFixed(3)}</div>
                    <div className="text-xs text-green-700 font-medium">Overall RMSE</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-lg md:text-xl font-bold text-blue-600">{(modelMetrics as any).rmse_haulers?.toFixed(3)}</div>
                    <div className="text-xs text-blue-700 font-medium">Haulers (5+ pts)</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-lg md:text-xl font-bold text-purple-600">{(modelMetrics as any).rmse_tickers?.toFixed(3)}</div>
                    <div className="text-xs text-purple-700 font-medium">Tickers (3-4 pts)</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-lg md:text-xl font-bold text-orange-600">{(modelMetrics as any).rmse_blanks?.toFixed(3)}</div>
                    <div className="text-xs text-orange-700 font-medium">Blanks (≤2 pts)</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="text-lg md:text-xl font-bold text-indigo-600">{((modelMetrics as any).accuracy_rate * 100)?.toFixed(1)}%</div>
                    <div className="text-xs text-indigo-700 font-medium">Accuracy Rate</div>
                  </div>
                </div>
                <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-gray-600 bg-gray-50 p-2 md:p-3 rounded-lg">
                  Last updated: {(modelMetrics as any).last_updated} • Models retrained weekly with latest data • Lower RMSE = Better accuracy
                </div>
                
                {/* OpenFPL Credit */}
                <div className="mt-4 text-center text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  Projections powered by <strong>OpenFPL</strong> research • Position-specific ensemble models trained on 4 seasons of FPL + Understat data
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Search, Calendar, BarChart3 } from "lucide-react";
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

export default function RecentPriceChanges() {
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

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Recent Price Changes
        </div>
        <p className="fpl-page-subtitle">
          All season price changes ordered by recency and significance
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
                  <SelectValue placeholder="All Changes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Changes</SelectItem>
                  <SelectItem value="rises">Price Rises</SelectItem>
                  <SelectItem value="falls">Price Falls</SelectItem>
                </SelectContent>
              </Select>
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

        {/* Recent Price Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Price Changes ({Array.isArray(priceChanges) ? priceChanges.length : 0} changes)
            </CardTitle>
            <CardDescription>
              All season price changes ordered by recency and significance
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
            ) : filteredChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left p-3 font-medium">Player</th>
                      <th className="text-left p-3 font-medium">Team/Pos</th>
                      <th className="text-center p-3 font-medium">Price Change</th>
                      <th className="text-right p-3 font-medium">Current Price</th>
                      <th className="text-right p-3 font-medium">Net Transfers</th>
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
                            <div>
                              <p className="font-medium">{change.player_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-xs">{change.team_name}</div>
                            <div className="text-xs text-muted-foreground">{change.position}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          {change.price_change !== 0 ? (
                            <div className="flex items-center justify-center gap-2">
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
      </div>
    </div>
  );
}
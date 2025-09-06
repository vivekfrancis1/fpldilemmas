import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Search, Calendar, BarChart3, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
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
  transfers_in_gw: number;
  transfers_out_gw: number;
  is_recent_change: boolean;
  total_season_change: number;
}

type SortField = 'change_date' | 'player_name' | 'team_name' | 'position' | 'old_price' | 'current_price' | 'price_change' | 'ownership' | 'transfers_in' | 'transfers_out' | 'transfers_in_gw' | 'transfers_out_gw';
type SortDirection = 'asc' | 'desc';

export default function RecentPriceChanges() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('change_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: priceChanges, isLoading: isLoadingChanges, error: changesError } = useQuery({
    queryKey: ["/api/price-changes/recent"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Refresh mutation for manual data update
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/price-changes/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to refresh price data");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch the price changes data
      queryClient.invalidateQueries({ queryKey: ["/api/price-changes/recent"] });
      toast({
        title: "Price Data Refreshed",
        description: data.message || "Successfully fetched latest data from FPL API",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh price data",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const filteredAndSortedChanges = Array.isArray(priceChanges) ? priceChanges
    .filter((change: PriceChange) => {
      const matchesSearch = change.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           change.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || change.position === positionFilter;
      const matchesChangeType = changeTypeFilter === "all" || 
                               (changeTypeFilter === "rises" && change.price_change > 0) ||
                               (changeTypeFilter === "falls" && change.price_change < 0) ||
                               (changeTypeFilter === "active" && change.price_change === 0);
      return matchesSearch && matchesPosition && matchesChangeType;
    })
    .sort((a: PriceChange, b: PriceChange) => {
      // First, sort by date (most recent first)
      const dateComparison = b.change_date.localeCompare(a.change_date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // For same date, sort by price change type (rises first, then falls)
      const aPriceChange = a.price_change;
      const bPriceChange = b.price_change;
      
      // If one is rise and other is fall, rises come first
      if (aPriceChange > 0 && bPriceChange < 0) return -1;
      if (aPriceChange < 0 && bPriceChange > 0) return 1;
      
      // If both are rises or both are falls, sort by ownership (higher ownership first)
      if ((aPriceChange > 0 && bPriceChange > 0) || (aPriceChange < 0 && bPriceChange < 0)) {
        const aOwnership = typeof a.ownership === 'number' ? a.ownership : parseFloat(a.ownership || "0");
        const bOwnership = typeof b.ownership === 'number' ? b.ownership : parseFloat(b.ownership || "0");
        const ownershipComparison = bOwnership - aOwnership; // Higher ownership first
        if (ownershipComparison !== 0) {
          return ownershipComparison;
        }
      }
      
      // If ownership is the same, apply user-selected sorting
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle string comparison for dates and names
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      }
      
      // Handle numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
      
      return 0;
    }) : [];



  // Calculate today's price change statistics
  const getTodayStats = () => {
    if (!Array.isArray(priceChanges)) {
      return { todayRises: 0, todayFalls: 0, todayChanges: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayChanges = priceChanges.filter((c: PriceChange) => c.change_date === today);
    const todayRises = todayChanges.filter((c: PriceChange) => c.price_change > 0);
    const todayFalls = todayChanges.filter((c: PriceChange) => c.price_change < 0);

    return {
      todayRises: todayRises.length,
      todayFalls: todayFalls.length,
      todayChanges: todayChanges.length
    };
  };

  const todayStats = getTodayStats();

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
          <Calendar className="h-8 w-8" />
          <h1>Recent Price Changes</h1>
        </div>
        <p className="fpl-page-subtitle">
          All season price changes ordered by recency and significance
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Today's Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 px-1">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-200 rounded-full mr-3">
                  <TrendingUp className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-700" data-testid="text-today-rises">
                    {todayStats.todayRises}
                  </p>
                  <p className="text-xs sm:text-sm text-green-600 font-medium">Price rises today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-200 rounded-full mr-3">
                  <TrendingDown className="h-6 w-6 text-red-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-red-700" data-testid="text-today-falls">
                    {todayStats.todayFalls}
                  </p>
                  <p className="text-xs sm:text-sm text-red-600 font-medium">Price falls today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-200 rounded-full mr-3">
                  <Calendar className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700" data-testid="text-today-changes">
                    {todayStats.todayChanges}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">Total price changes today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
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
              
              {/* Refresh Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid="button-refresh-prices"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                  {refreshMutation.isPending ? "Refreshing..." : "Refresh from FPL API"}
                </Button>
              </div>
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

        {/* Info message for new databases */}
        {!isLoadingChanges && Array.isArray(priceChanges) && priceChanges.length === 0 && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No price changes recorded yet. Click "Refresh from FPL API" to initialize the database with season price changes.
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Price Changes */}
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
            ) : filteredAndSortedChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th 
                        className="text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('change_date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortField === 'change_date' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('player_name')}
                      >
                        <div className="flex items-center gap-1">
                          Player
                          {sortField === 'player_name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('team_name')}
                      >
                        <div className="flex items-center gap-1">
                          Team
                          {sortField === 'team_name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('position')}
                      >
                        <div className="flex items-center gap-1">
                          Position
                          {sortField === 'position' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('old_price')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Old Price
                          {sortField === 'old_price' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('price_change')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Price Change
                          {sortField === 'price_change' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('current_price')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Current Price
                          {sortField === 'current_price' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>

                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedChanges.map((change: PriceChange, index: number) => {
                      const currentDate = change.change_date;
                      const previousDate = index > 0 ? filteredAndSortedChanges[index - 1].change_date : null;
                      const isNewDateGroup = currentDate !== previousDate;
                      
                      return (
                        <React.Fragment key={`${change.player_id}-${index}`}>
                          {isNewDateGroup && index > 0 && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className="border-t-2 border-gray-200 dark:border-gray-700"></div>
                              </td>
                            </tr>
                          )}
                          <tr 
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`price-change-${change.player_id}`}
                          >
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground">
                            {new Date(change.change_date).toLocaleDateString()}
                          </div>
                        </td>
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
                          <div className="font-medium text-sm">{change.team_name}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground">{change.position}</div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatPrice(change.old_price)}
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant={change.price_change > 0 ? "success" : "destructive"}>
                            {change.price_change > 0 ? "+" : ""}{formatPrice(Math.abs(change.price_change))}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatPrice(change.current_price)}
                        </td>
                      </tr>
                        </React.Fragment>
                      );
                    })}
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
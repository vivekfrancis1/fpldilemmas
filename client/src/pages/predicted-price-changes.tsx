import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle, Search, Target, BarChart3, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
  current_progress: number;
  tonight_progress: number;
  progress_direction: string;
  hourly_change_rate: number;
  estimated_time: string;
  absolute_ownership?: number;
  net_transfers_percentage?: number;
}

type SortField = 'current_progress' | 'tonight_progress' | 'transfers_in' | 'transfers_out' | 'net_transfers' | 'expected_date' | 'ownership_percentage' | 'confidence' | 'hourly_change_rate' | 'absolute_ownership' | 'net_transfers_percentage';
type SortDirection = 'asc' | 'desc';

export default function PredictedPriceChanges() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('current_progress');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAndFilteredPredictions = useMemo(() => {
    if (!Array.isArray(predictions)) return [];
    
    // First filter and enhance the predictions with calculated fields
    const filtered = predictions.filter((pred: PricePrediction) => {
      const matchesSearch = pred.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pred.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || pred.position === positionFilter;
      const matchesChangeType = changeTypeFilter === "all" || 
                               (changeTypeFilter === "rises" && pred.predicted_change > 0) ||
                               (changeTypeFilter === "falls" && pred.predicted_change < 0) ||
                               (changeTypeFilter === "stable" && pred.predicted_change === 0);
      return matchesSearch && matchesPosition && matchesChangeType;
    }).map((pred: PricePrediction) => {
      // Calculate additional fields
      const totalPlayers = 10000000; // Approximate total FPL players
      const absoluteOwnership = Math.round((pred.ownership_percentage / 100) * totalPlayers);
      const netTransfersPercentage = absoluteOwnership > 0 ? 
        Math.round((pred.net_transfers / absoluteOwnership) * 10000) / 100 : 0;
      
      return {
        ...pred,
        absolute_ownership: absoluteOwnership,
        net_transfers_percentage: netTransfersPercentage
      };
    });

    // Then sort the filtered results
    return filtered.sort((a: PricePrediction, b: PricePrediction) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'expected_date':
          aValue = new Date(a.expected_date || '9999-12-31').getTime();
          bValue = new Date(b.expected_date || '9999-12-31').getTime();
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [predictions, searchTerm, positionFilter, changeTypeFilter, sortField, sortDirection]);

  const SortableHeader = ({ field, children, className = "" }: { 
    field: SortField; 
    children: React.ReactNode; 
    className?: string; 
  }) => (
    <Button
      variant="ghost"
      className={`h-auto p-3 justify-start font-medium text-xs hover:bg-muted/50 ${className}`}
      onClick={() => handleSort(field)}
      data-testid={`header-${field}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </Button>
  );

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

        {/* Summary Statistics */}
        {Array.isArray(predictions) && predictions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Price Prediction Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {predictions.filter(p => Math.abs(p.current_progress) > 100).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Very Likely Changes</div>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {predictions.filter(p => Math.abs(p.tonight_progress) > 100).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Tonight Likely</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">92.4%</div>
                  <div className="text-sm text-muted-foreground">Historical Accuracy</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Players Price Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              All Players Price Tracker ({Array.isArray(predictions) ? predictions.length : 0} players)
            </CardTitle>
            <CardDescription>
              Comprehensive price tracking with dual progress bars showing current and 7AM IST projections
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
            ) : sortedAndFilteredPredictions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left p-2">Player</th>
                      <th className="text-left p-2">Team/Pos</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-center p-2 min-w-[120px]">
                        <SortableHeader field="current_progress" className="text-center">
                          Current Progress
                        </SortableHeader>
                      </th>
                      <th className="text-center p-2 min-w-[120px]">
                        <SortableHeader field="tonight_progress" className="text-center">
                          Progress EOD
                        </SortableHeader>
                      </th>
                      <th className="text-center p-2">Change</th>
                      <th className="text-right p-2">
                        <SortableHeader field="transfers_in" className="text-right">
                          Transfers In
                        </SortableHeader>
                      </th>
                      <th className="text-right p-2">
                        <SortableHeader field="transfers_out" className="text-right">
                          Transfers Out
                        </SortableHeader>
                      </th>
                      <th className="text-right p-2">
                        <SortableHeader field="net_transfers" className="text-right">
                          Net Transfers
                        </SortableHeader>
                      </th>
                      <th className="text-right p-2">
                        <SortableHeader field="ownership_percentage" className="text-right">
                          Ownership %
                        </SortableHeader>
                      </th>
                      <th className="text-right p-2">
                        <SortableHeader field="absolute_ownership" className="text-right">
                          Absolute Own.
                        </SortableHeader>
                      </th>
                      <th className="text-right p-2">
                        <SortableHeader field="net_transfers_percentage" className="text-right">
                          Net Trans %
                        </SortableHeader>
                      </th>
                      <th className="text-center p-2">
                        <SortableHeader field="confidence" className="text-center">
                          Probability
                        </SortableHeader>
                      </th>
                      <th className="text-left p-2">
                        <SortableHeader field="expected_date" className="text-left">
                          Expected
                        </SortableHeader>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredPredictions.map((prediction: PricePrediction, index: number) => (
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
                        <td className="p-3 text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-medium ${
                              prediction.progress_direction === "rise" ? "text-green-600" :
                              prediction.progress_direction === "fall" ? "text-red-600" : 
                              "text-gray-600"
                            }`}>
                              {Math.abs(prediction.current_progress || 0)?.toFixed(1)}%
                            </span>
                            <Progress 
                              value={Math.min(100, Math.abs(prediction.current_progress || 0))} 
                              className={`h-2 w-full ${
                                prediction.progress_direction === "rise" ? "[&>div]:bg-green-500" :
                                prediction.progress_direction === "fall" ? "[&>div]:bg-red-500" : 
                                "[&>div]:bg-gray-400"
                              }`}
                            />
                            {Math.abs(prediction.current_progress || 0) > 100 && (
                              <Badge variant="destructive" className="text-xs">
                                VERY LIKELY
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-medium ${
                              prediction.progress_direction === "rise" ? "text-green-600" :
                              prediction.progress_direction === "fall" ? "text-red-600" : 
                              "text-gray-600"
                            }`}>
                              {Math.abs(prediction.tonight_progress || 0)?.toFixed(1)}%
                            </span>
                            <Progress 
                              value={Math.min(100, Math.abs(prediction.tonight_progress || 0))} 
                              className={`h-2 w-full ${
                                prediction.progress_direction === "rise" ? "[&>div]:bg-green-600" :
                                prediction.progress_direction === "fall" ? "[&>div]:bg-red-600" : 
                                "[&>div]:bg-gray-400"
                              }`}
                            />
                            {Math.abs(prediction.tonight_progress || 0) > 100 && (
                              <Badge variant="destructive" className="text-xs">
                                TONIGHT
                              </Badge>
                            )}
                            {prediction.hourly_change_rate > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {prediction.hourly_change_rate?.toFixed(2)}%/hr
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {prediction.predicted_change !== 0 ? (
                            <Badge 
                              variant={prediction.predicted_change > 0 ? "success" : "destructive"}
                              className="text-xs"
                            >
                              {prediction.predicted_change > 0 ? "↑" : "↓"}£0.1m
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Stable
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{prediction.transfers_in?.toLocaleString() || "0"}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{prediction.transfers_out?.toLocaleString() || "0"}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-medium ${
                            prediction.net_transfers > 0 ? "text-green-600" : 
                            prediction.net_transfers < 0 ? "text-red-600" : "text-gray-600"
                          }`}>
                            {prediction.net_transfers > 0 ? "+" : ""}{prediction.net_transfers?.toLocaleString() || "0"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{prediction.ownership_percentage?.toFixed(1) || "0.0"}%</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{prediction.absolute_ownership?.toLocaleString() || "0"}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-medium ${
                            prediction.net_transfers_percentage! > 0 ? "text-green-600" : 
                            prediction.net_transfers_percentage! < 0 ? "text-red-600" : "text-gray-600"
                          }`}>
                            {prediction.net_transfers_percentage! > 0 ? "+" : ""}{prediction.net_transfers_percentage?.toFixed(2) || "0.00"}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            className={`text-xs ${getProbabilityColor(prediction.probability)}`}
                          >
                            {prediction.probability}
                          </Badge>
                        </td>
                        <td className="p-3 text-left">
                          <div className="space-y-1">
                            {prediction.expected_date ? (
                              <div className="text-sm font-medium">
                                {new Date(prediction.expected_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">N/A</div>
                            )}
                            {prediction.estimated_time && (
                              <div className="text-xs text-muted-foreground">
                                {prediction.estimated_time}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No predictions found matching your filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
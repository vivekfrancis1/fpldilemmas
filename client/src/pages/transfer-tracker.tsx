import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle, Search, BarChart3, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BootstrapData } from "@shared/schema";

interface TransferData {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  ownership_percentage: number;
  net_transfers: number;
  transfers_in: number;
  transfers_out: number;
  hourly_change_rate: number;
  absolute_ownership?: number;
  net_transfers_percentage?: number;
  transfer_rate_trend?: string;
}

type SortField = 'net_transfers' | 'transfers_in' | 'transfers_out' | 'ownership_percentage' | 'absolute_ownership' | 'net_transfers_percentage' | 'current_price';
type SortDirection = 'asc' | 'desc';

export default function TransferTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [transferTypeFilter, setTransferTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('net_transfers');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: transferData, isLoading: isLoadingTransfers, error: transfersError } = useQuery({
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

  const sortedAndFilteredTransfers = useMemo(() => {
    if (!Array.isArray(transferData)) return [];
    
    // First filter and enhance the transfer data with calculated fields
    const filtered = transferData.filter((data: TransferData) => {
      const matchesSearch = data.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           data.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || data.position === positionFilter;
      const matchesTransferType = transferTypeFilter === "all" || 
                                 (transferTypeFilter === "in" && data.net_transfers > 0) ||
                                 (transferTypeFilter === "out" && data.net_transfers < 0) ||
                                 (transferTypeFilter === "stable" && data.net_transfers === 0);
      return matchesSearch && matchesPosition && matchesTransferType;
    }).map((data: TransferData) => {
      // Calculate additional transfer analysis fields using actual FPL total players
      const totalPlayers = bootstrapData?.total_players || 11131759; // Use actual current total as fallback
      const absoluteOwnership = Math.round((data.ownership_percentage / 100) * totalPlayers);
      const netTransfersPercentage = absoluteOwnership > 0 ? 
        Math.round((data.net_transfers / absoluteOwnership) * 10000) / 100 : 0;
      

      

      
      // Determine transfer trend based on net transfers magnitude
      const transferRateTrend = data.net_transfers > 50000 ? "Rising Fast" :
        data.net_transfers > 10000 ? "Rising" :
        data.net_transfers < -50000 ? "Falling Fast" :
        data.net_transfers < -10000 ? "Falling" : "Stable";
      
      return {
        ...data,
        absolute_ownership: absoluteOwnership,
        net_transfers_percentage: netTransfersPercentage,
        transfer_rate_trend: transferRateTrend
      };
    });

    // Then sort the filtered results
    return filtered.sort((a: TransferData, b: TransferData) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'absolute_ownership':
          aValue = a.absolute_ownership || 0;
          bValue = b.absolute_ownership || 0;
          break;
        case 'net_transfers_percentage':
          aValue = a.net_transfers_percentage || 0;
          bValue = b.net_transfers_percentage || 0;
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
  }, [transferData, searchTerm, positionFilter, transferTypeFilter, sortField, sortDirection]);

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

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Transfer Tracker
        </div>
        <p className="fpl-page-subtitle">
          Comprehensive transfer analysis and ownership tracking for all FPL players
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
                  <p className="text-xl sm:text-2xl font-bold text-green-600" data-testid="text-net-positive">
                    {Array.isArray(transferData) ? transferData.filter((p: any) => p.net_transfers > 0).length : 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Net Positive Transfers</p>
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
                  <p className="text-xl sm:text-2xl font-bold text-red-600" data-testid="text-net-negative">
                    {Array.isArray(transferData) ? transferData.filter((p: any) => p.net_transfers < 0).length : 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">Net Negative Transfers</p>
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
                  <p className="text-xl sm:text-2xl font-bold text-blue-600" data-testid="text-high-ownership">
                    {Array.isArray(transferData) ? transferData.filter((p: any) => p.ownership_percentage > 10).length : 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">High Ownership Players</p>
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
              <Select value={transferTypeFilter} onValueChange={setTransferTypeFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-transfer-type-filter">
                  <SelectValue placeholder="All Transfers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transfers</SelectItem>
                  <SelectItem value="in">Net In</SelectItem>
                  <SelectItem value="out">Net Out</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {transfersError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load transfer data from FPL API. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Statistics */}
        {Array.isArray(transferData) && transferData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Transfer Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {transferData.filter((p: any) => p.transfers_in > 50000).length}
                  </div>
                  <div className="text-sm text-muted-foreground">High Transfer In</div>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {transferData.filter((p: any) => p.transfers_out > 50000).length}
                  </div>
                  <div className="text-sm text-muted-foreground">High Transfer Out</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {transferData.filter((p: any) => p.ownership_percentage > 20).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Popular Players</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Players Transfer Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              All Players Transfer Tracker ({Array.isArray(transferData) ? transferData.length : 0} players)
            </CardTitle>
            <CardDescription>
              Season-to-date transfer activity, ownership levels, and comprehensive transfer analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isLoadingBootstrap || isLoadingTransfers) ? (
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : sortedAndFilteredTransfers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left p-2">Player</th>
                      <th className="text-left p-2">Team/Pos</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-center p-2">
                        <SortableHeader field="transfers_in" className="text-center">
                          Transfers In
                        </SortableHeader>
                      </th>
                      <th className="text-center p-2">
                        <SortableHeader field="transfers_out" className="text-center">
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
                        Transfer Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredTransfers.map((transfer: TransferData, index: number) => (
                      <tr 
                        key={`${transfer.player_id}-${index}`}
                        className="border-b hover:bg-muted/50 transition-colors"
                        data-testid={`transfer-${transfer.player_id}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {transfer.net_transfers > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
                            ) : transfer.net_transfers < 0 ? (
                              <TrendingDown className="h-3 w-3 text-red-600 flex-shrink-0" />
                            ) : (
                              <BarChart3 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="font-medium">{transfer.player_name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-xs">{transfer.team_name}</div>
                            <div className="text-xs text-muted-foreground">{transfer.position}</div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatPrice(transfer.current_price)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-medium text-green-600">
                            {transfer.transfers_in?.toLocaleString() || "0"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-medium text-red-600">
                            {transfer.transfers_out?.toLocaleString() || "0"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-medium ${
                            transfer.net_transfers > 0 ? "text-green-600" : 
                            transfer.net_transfers < 0 ? "text-red-600" : "text-gray-600"
                          }`}>
                            {transfer.net_transfers > 0 ? "+" : ""}{transfer.net_transfers?.toLocaleString() || "0"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{transfer.ownership_percentage?.toFixed(1) || "0.0"}%</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{transfer.absolute_ownership?.toLocaleString() || "0"}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-medium ${
                            transfer.net_transfers_percentage! > 0 ? "text-green-600" : 
                            transfer.net_transfers_percentage! < 0 ? "text-red-600" : "text-gray-600"
                          }`}>
                            {transfer.net_transfers_percentage! > 0 ? "+" : ""}{transfer.net_transfers_percentage?.toFixed(2) || "0.00"}%
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <Badge 
                            variant={
                              transfer.transfer_rate_trend?.includes("Fast") ? "destructive" :
                              transfer.transfer_rate_trend?.includes("Rising") ? "success" :
                              transfer.transfer_rate_trend?.includes("Falling") ? "destructive" : "outline"
                            }
                            className="text-xs"
                          >
                            {transfer.transfer_rate_trend || "Stable"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transfer data found matching your filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
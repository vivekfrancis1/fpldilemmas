import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, Search, TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TransferRecommendations() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const { toast } = useToast();

  // Cache manager ID functionality
  const saveManagerIdToCache = (id: string) => {
    try {
      localStorage.setItem('fpl-manager-id', id);
    } catch (error) {
      console.warn('Failed to save manager ID to localStorage:', error);
    }
  };

  const getManagerIdFromCache = (): string | null => {
    try {
      return localStorage.getItem('fpl-manager-id');
    } catch (error) {
      console.warn('Failed to get manager ID from localStorage:', error);
      return null;
    }
  };

  // Load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId);
    }
  }, []);

  // Fetch recommended transfers
  const { data: recommendedTransfers, isLoading: isLoadingRecommendations, error: recommendationsError } = useQuery<any>({
    queryKey: ["/api/manager", searchedId, "recommended-transfers"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Memoized calculation of budget and free transfers timeline for each gameweek
  const gameweekFinances = useMemo(() => {
    if (!recommendedTransfers?.gameweeks) return {};

    const gameweeks = Object.keys(recommendedTransfers.gameweeks).sort((a, b) => parseInt(a) - parseInt(b));
    const finances: Record<string, { cashBefore: number; cashAfter: number; ftsAvailable: number }> = {};
    
    let acc = {
      bank: recommendedTransfers.bank || 0,
      freeTransfers: recommendedTransfers.freeTransfers || 1
    };

    gameweeks.forEach((gw, index) => {
      const gwData = recommendedTransfers.gameweeks[gw];
      const primaryRec = gwData.recommendations?.[0];
      
      // Use API-provided values for bankBefore and freeTransfersAvailable
      const cashBefore = gwData.bankBefore ?? acc.bank;
      const cashAfter = primaryRec?.budgetAfter ?? acc.bank;
      const ftsAvailable = gwData.freeTransfersAvailable ?? acc.freeTransfers;
      
      finances[gw] = { cashBefore, cashAfter, ftsAvailable };
      
      // Update accumulator for next gameweek
      acc = {
        bank: cashAfter,
        freeTransfers: Math.min(2, Math.max(0, acc.freeTransfers - 1) + 1)
      };
    });

    return finances;
  }, [recommendedTransfers]);

  // Handle search
  const handleSearch = () => {
    if (!managerId.trim()) {
      toast({
        title: "Manager ID Required",
        description: "Please enter a valid FPL Manager ID",
        variant: "destructive"
      });
      return;
    }
    setSearchedId(managerId);
    saveManagerIdToCache(managerId);
  };

  // Debug logging
  useEffect(() => {
    console.log("🔍 Recommended Transfers Debug:", {
      searchedId,
      hasRecommendations: !!recommendedTransfers,
      recommendations: recommendedTransfers,
      isLoading: isLoadingRecommendations,
      error: recommendationsError
    });
  }, [searchedId, recommendedTransfers, isLoadingRecommendations, recommendationsError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <ArrowRightLeft className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Transfer Recommendations</h1>
          <p className="text-lg text-gray-600">Maximize your projected points for remaining gameweeks</p>
        </div>

        {/* Search Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager ID</label>
                <Input
                  type="text"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  placeholder="Enter Manager ID"
                  className="text-base"
                  data-testid="input-manager-id"
                />
              </div>
              <Button onClick={handleSearch} className="w-full sm:w-auto" data-testid="button-search-manager">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {recommendationsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load transfer recommendations. Please check the Manager ID and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoadingRecommendations && searchedId && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* No search yet state */}
        {!searchedId && !isLoadingRecommendations && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <ArrowRightLeft className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Enter your FPL Manager ID to view transfer recommendations</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Recommendations */}
        {searchedId && !isLoadingRecommendations && recommendedTransfers && recommendedTransfers.gameweeks && Object.keys(recommendedTransfers.gameweeks).length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                Transfer Recommendations
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Maximize your projected points for remaining gameweeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(recommendedTransfers.gameweeks)[0]} className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto mb-4">
                  {Object.keys(recommendedTransfers.gameweeks).map((gw) => (
                    <TabsTrigger key={gw} value={gw} className="text-xs sm:text-sm py-2 sm:py-2.5" data-testid={`tab-transfer-gw-${gw}`}>
                      GW{gw}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(recommendedTransfers.gameweeks).map(([gw, gwData]: [string, any]) => {
                  const finances = gameweekFinances[gw];
                  return (
                  <TabsContent key={gw} value={gw} className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <div className="text-xs sm:text-sm text-gray-600">
                        <strong>Target:</strong> Maximize points for {gwData.targetRange}
                      </div>
                      {finances && (
                        <div className="flex gap-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg px-4 py-2" data-testid={`finance-summary-gw${gw}`}>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-[10px] text-gray-500">Cash in Bank</div>
                              <div className="text-sm font-bold text-green-700" data-testid={`cash-in-bank-gw${gw}`}>£{(finances.cashBefore / 10).toFixed(1)}m</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 border-l border-green-300 pl-4">
                            <ArrowRightLeft className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-[10px] text-gray-500">Free Transfers</div>
                              <div className="text-sm font-bold text-green-700" data-testid={`free-transfers-gw${gw}`}>{finances.ftsAvailable}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {gwData.recommendations && gwData.recommendations.length > 0 ? (
                      <div className="space-y-4">
                        {/* Check if this is a roll transfer recommendation */}
                        {gwData.recommendations[0]?.type === 'roll' ? (
                          <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg" data-testid={`roll-transfer-gw${gw}`}>
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                              <ArrowRightLeft className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Roll Transfer</h3>
                            <p className="text-sm text-gray-700 text-center max-w-md mb-4">
                              {gwData.recommendations[0].message}
                            </p>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center gap-2 bg-white/50 rounded-lg px-4 py-2">
                                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="text-[10px] text-gray-500">Free Transfers</div>
                                  <div className="text-sm font-bold text-blue-700">{gwData.recommendations[0].freeTransfersAvailable}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 bg-white/50 rounded-lg px-4 py-2">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="text-[10px] text-gray-500">Bank Balance</div>
                                  <div className="text-sm font-bold text-blue-700">£{(gwData.recommendations[0].bankBalance / 10).toFixed(1)}m</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Primary Transfer Recommendations (based on free transfers available) */}
                            {(() => {
                              const freeTransfers = gwData.freeTransfersAvailable || 1;
                              const primaryTransfers = gwData.recommendations.slice(0, freeTransfers);
                              const otherTransfers = gwData.recommendations.slice(freeTransfers);
                              
                              return (
                                <>
                                  {primaryTransfers.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                    Primary Transfer Recommendation{primaryTransfers.length > 1 ? 's' : ''}
                                  </h3>
                                  <div className="space-y-3">
                                    {primaryTransfers.map((rec: any, index: number) => (
                                      <div
                                        key={`${rec.playerOut.id}-${rec.playerIn.id}`}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-white border-2 border-orange-300 rounded-lg shadow-sm"
                                        data-testid={`transfer-recommendation-gw${gw}-${index}`}
                                      >
                                        <div className="flex-1 w-full sm:w-auto mb-3 sm:mb-0">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                              OUT
                                            </Badge>
                                            <TrendingDown className="h-3 w-3 text-red-500" />
                                            <span className="text-sm font-medium text-gray-900" data-testid={`player-out-name-gw${gw}-${index}`}>{rec.playerOut.webName}</span>
                                            <span className="text-xs text-gray-500" data-testid={`player-out-points-gw${gw}-${index}`}>
                                              ({rec.playerOut.projectedPoints.toFixed(1)} pts)
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                              IN
                                            </Badge>
                                            <TrendingUp className="h-3 w-3 text-green-500" />
                                            <span className="text-sm font-medium text-gray-900" data-testid={`player-in-name-gw${gw}-${index}`}>{rec.playerIn.webName}</span>
                                            <span className="text-xs text-gray-500" data-testid={`player-in-points-gw${gw}-${index}`}>
                                              ({rec.playerIn.projectedPoints.toFixed(1)} pts)
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">Points Gain</div>
                                            <div className="text-lg font-bold text-green-600" data-testid={`points-gain-gw${gw}-${index}`}>+{rec.pointsGain.toFixed(1)}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">Cost</div>
                                            <div className={`text-sm font-semibold ${rec.cost >= 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`cost-gw${gw}-${index}`}>
                                              {rec.cost >= 0 ? '+' : ''}{(rec.cost / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">ITB After</div>
                                            <div className="text-sm font-medium text-gray-700" data-testid={`budget-after-gw${gw}-${index}`}>
                                              £{(rec.budgetAfter / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Other Transfer Recommendations */}
                              {otherTransfers.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Other Transfer Recommendations</h3>
                                  <div className="space-y-3">
                                    {otherTransfers.map((rec: any, index: number) => {
                                      const offsetIndex = freeTransfers + index;
                                      return (
                                      <div
                                        key={`${rec.playerOut.id}-${rec.playerIn.id}`}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-white border border-orange-100 rounded-lg hover:border-orange-300 transition-colors"
                                        data-testid={`transfer-recommendation-gw${gw}-${offsetIndex}`}
                                      >
                                        <div className="flex-1 w-full sm:w-auto mb-3 sm:mb-0">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                              OUT
                                            </Badge>
                                            <TrendingDown className="h-3 w-3 text-red-500" />
                                            <span className="text-sm font-medium text-gray-900" data-testid={`player-out-name-gw${gw}-${offsetIndex}`}>{rec.playerOut.webName}</span>
                                            <span className="text-xs text-gray-500" data-testid={`player-out-points-gw${gw}-${offsetIndex}`}>
                                              ({rec.playerOut.projectedPoints.toFixed(1)} pts)
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                              IN
                                            </Badge>
                                            <TrendingUp className="h-3 w-3 text-green-500" />
                                            <span className="text-sm font-medium text-gray-900" data-testid={`player-in-name-gw${gw}-${offsetIndex}`}>{rec.playerIn.webName}</span>
                                            <span className="text-xs text-gray-500" data-testid={`player-in-points-gw${gw}-${offsetIndex}`}>
                                              ({rec.playerIn.projectedPoints.toFixed(1)} pts)
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">Points Gain</div>
                                            <div className="text-lg font-bold text-green-600" data-testid={`points-gain-gw${gw}-${offsetIndex}`}>+{rec.pointsGain.toFixed(1)}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">Cost</div>
                                            <div className={`text-sm font-semibold ${rec.cost >= 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`cost-gw${gw}-${offsetIndex}`}>
                                              {rec.cost >= 0 ? '+' : ''}{(rec.cost / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">ITB After</div>
                                            <div className="text-sm font-medium text-gray-700" data-testid={`budget-after-gw${gw}-${offsetIndex}`}>
                                              £{(rec.budgetAfter / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No transfer recommendations for this gameweek
                      </div>
                    )}
                  </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* No recommendations available state */}
        {searchedId && !isLoadingRecommendations && recommendedTransfers && (!recommendedTransfers.gameweeks || Object.keys(recommendedTransfers.gameweeks).length === 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No transfer recommendations available for this manager</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

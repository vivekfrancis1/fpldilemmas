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
import { LoadingExperience } from "@/components/loading-experience";
import { applyAvailabilityAdjustments, type BootstrapData } from "@/lib/availability-adjustments";

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

  // Fetch bootstrap data for availability adjustments
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch current gameweek
  const { data: currentGWData } = useQuery<{ current_event: number }>({
    queryKey: ["/api/current-gameweek"],
    staleTime: 5 * 60 * 1000,
  });

  const currentGameweek = currentGWData?.current_event || 1;

  // Fetch recommended transfers
  const { data: recommendedTransfers, isLoading: isLoadingRecommendations, error: recommendationsError } = useQuery<any>({
    queryKey: ["/api/manager", searchedId, "recommended-transfers"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Apply availability adjustments to transfer recommendations
  const adjustedRecommendations = useMemo(() => {
    if (!recommendedTransfers?.gameweeks || !bootstrapData) return recommendedTransfers;

    const adjusted = { ...recommendedTransfers };
    const adjustedGameweeks: any = {};

    Object.entries(recommendedTransfers.gameweeks).forEach(([gw, gwData]: [string, any]) => {
      const adjustedRecs = gwData.recommendations?.map((rec: any) => {
        // Safety check: ensure playerOut and playerIn exist
        if (!rec.playerOut || !rec.playerIn) return rec;

        // Create player objects with required fields for availability adjustments
        const playerOutWithProjections = {
          playerName: rec.playerOut.webName,
          chanceOfPlayingNextRound: rec.playerOut.chanceOfPlayingNextRound,
          status: rec.playerOut.status,
          news: rec.playerOut.news,
          gameweekProjections: { [gw]: rec.playerOut.projectedPoints },
          totalExpectedPoints: rec.playerOut.projectedPoints,
          price: rec.playerOut.sellingPrice / 10,
        };

        const playerInWithProjections = {
          playerName: rec.playerIn.webName,
          chanceOfPlayingNextRound: rec.playerIn.chanceOfPlayingNextRound,
          status: rec.playerIn.status,
          news: rec.playerIn.news,
          gameweekProjections: { [gw]: rec.playerIn.projectedPoints },
          totalExpectedPoints: rec.playerIn.projectedPoints,
          price: rec.playerIn.nowCost / 10,
        };

        // Apply availability adjustments
        const adjustedPlayerOut = applyAvailabilityAdjustments(playerOutWithProjections, bootstrapData, currentGameweek);
        const adjustedPlayerIn = applyAvailabilityAdjustments(playerInWithProjections, bootstrapData, currentGameweek);

        // Calculate new points gain based on adjusted points
        const adjustedOutPoints = adjustedPlayerOut.gameweekProjections[gw] || 0;
        const adjustedInPoints = adjustedPlayerIn.gameweekProjections[gw] || 0;
        const adjustedPointsGain = adjustedInPoints - adjustedOutPoints;

        return {
          ...rec,
          playerOut: {
            ...rec.playerOut,
            projectedPoints: adjustedOutPoints,
            originalProjectedPoints: rec.playerOut.projectedPoints,
            availabilityAdjusted: adjustedOutPoints !== rec.playerOut.projectedPoints,
          },
          playerIn: {
            ...rec.playerIn,
            projectedPoints: adjustedInPoints,
            originalProjectedPoints: rec.playerIn.projectedPoints,
            availabilityAdjusted: adjustedInPoints !== rec.playerIn.projectedPoints,
          },
          pointsGain: adjustedPointsGain,
          originalPointsGain: rec.pointsGain,
        };
      });

      adjustedGameweeks[gw] = {
        ...gwData,
        recommendations: adjustedRecs,
      };
    });

    adjusted.gameweeks = adjustedGameweeks;
    return adjusted;
  }, [recommendedTransfers, bootstrapData, currentGameweek]);

  // Memoized calculation of budget and free transfers timeline for each gameweek
  const gameweekFinances = useMemo(() => {
    if (!adjustedRecommendations?.gameweeks) return {};

    const gameweeks = Object.keys(adjustedRecommendations.gameweeks).sort((a, b) => parseInt(a) - parseInt(b));
    const finances: Record<string, { cashBefore: number; cashAfter: number; ftsAvailable: number }> = {};
    
    let acc = {
      bank: adjustedRecommendations.bank || 0,
      freeTransfers: adjustedRecommendations.freeTransfers || 1
    };

    gameweeks.forEach((gw, index) => {
      const gwData = adjustedRecommendations.gameweeks[gw];
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
  }, [adjustedRecommendations]);

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
                  className="text-base min-h-11"
                  data-testid="input-manager-id"
                />
              </div>
              <Button onClick={handleSearch} className="w-full sm:w-auto min-h-11" data-testid="button-search-manager">
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
          <LoadingExperience
            variant="analysis"
            title="Analyzing Your Team"
            description="Calculating optimal transfer recommendations across all remaining gameweeks..."
            steps={[
              { text: "Analyzing current squad", delay: "0s" },
              { text: "Comparing 700+ player projections", delay: "0.2s" },
              { text: "Optimizing transfer strategy", delay: "0.4s" },
            ]}
          />
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
        {searchedId && !isLoadingRecommendations && adjustedRecommendations && adjustedRecommendations.gameweeks && Object.keys(adjustedRecommendations.gameweeks).length > 0 && (
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
              <Tabs defaultValue={Object.keys(adjustedRecommendations.gameweeks)[0]} className="w-full">
                <div className="overflow-x-auto -mx-6 px-6 mb-4">
                  <TabsList className="inline-flex w-auto min-w-full h-auto gap-2 bg-transparent">
                    {Object.keys(adjustedRecommendations.gameweeks).map((gw) => (
                      <TabsTrigger 
                        key={gw} 
                        value={gw} 
                        className="text-sm py-2.5 px-4 min-w-[80px] data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900" 
                        data-testid={`tab-transfer-gw-${gw}`}
                      >
                        GW{gw}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {Object.entries(adjustedRecommendations.gameweeks).map(([gw, gwData]: [string, any]) => {
                  const finances = gameweekFinances[gw];
                  return (
                  <TabsContent key={gw} value={gw} className="space-y-4">
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="text-sm text-gray-600">
                        <strong>Target:</strong> Maximize points for {gwData.targetRange}
                      </div>
                      {finances && (
                        <div className="flex flex-wrap gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3" data-testid={`finance-summary-gw${gw}`}>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-xs text-gray-500">Cash in Bank</div>
                              <div className="text-sm font-bold text-green-700" data-testid={`cash-in-bank-gw${gw}`}>£{(finances.cashBefore / 10).toFixed(1)}m</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 border-l border-green-300 pl-3">
                            <ArrowRightLeft className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-xs text-gray-500">Free Transfers</div>
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
                            <h3 className="text-lg font-bold text-gray-900">Roll Transfer</h3>
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
                                  <h3 className="text-base font-semibold text-gray-700 mb-3">
                                    Primary Transfer Recommendation{primaryTransfers.length > 1 ? 's' : ''}
                                  </h3>
                                  <div className="space-y-3">
                                    {primaryTransfers.map((rec: any, index: number) => (
                                      <div
                                        key={`${rec.playerOut.id}-${rec.playerIn.id}`}
                                        className="p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-white border-2 border-orange-300 rounded-lg shadow-sm space-y-3"
                                        data-testid={`transfer-recommendation-gw${gw}-${index}`}
                                      >
                                        <div className="space-y-2">
                                          <div className="flex items-start gap-2">
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 shrink-0">
                                              OUT
                                            </Badge>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                              <span className="text-sm sm:text-base font-medium text-gray-900 break-words" data-testid={`player-out-name-gw${gw}-${index}`}>{rec.playerOut.webName}</span>
                                              <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-out-points-gw${gw}-${index}`}>
                                                ({rec.playerOut.projectedPoints.toFixed(1)} pts)
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 shrink-0">
                                              IN
                                            </Badge>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                              <span className="text-sm sm:text-base font-medium text-gray-900 break-words" data-testid={`player-in-name-gw${gw}-${index}`}>{rec.playerIn.webName}</span>
                                              <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-in-points-gw${gw}-${index}`}>
                                                ({rec.playerIn.projectedPoints.toFixed(1)} pts)
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-orange-200">
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Points Gain</div>
                                            <div className="text-base sm:text-lg font-bold text-green-600" data-testid={`points-gain-gw${gw}-${index}`}>+{rec.pointsGain.toFixed(1)}</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Cost</div>
                                            <div className={`text-sm sm:text-base font-semibold ${rec.cost >= 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`cost-gw${gw}-${index}`}>
                                              {rec.cost >= 0 ? '+' : ''}{(rec.cost / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">ITB After</div>
                                            <div className="text-sm sm:text-base font-medium text-gray-700" data-testid={`budget-after-gw${gw}-${index}`}>
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
                                  <h3 className="text-base font-semibold text-gray-700 mb-3">Other Transfer Recommendations</h3>
                                  <div className="space-y-3">
                                    {otherTransfers.map((rec: any, index: number) => {
                                      const offsetIndex = freeTransfers + index;
                                      return (
                                      <div
                                        key={`${rec.playerOut.id}-${rec.playerIn.id}`}
                                        className="p-3 sm:p-4 bg-white border border-orange-100 rounded-lg hover:border-orange-300 transition-colors space-y-3"
                                        data-testid={`transfer-recommendation-gw${gw}-${offsetIndex}`}
                                      >
                                        <div className="space-y-2">
                                          <div className="flex items-start gap-2">
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 shrink-0">
                                              OUT
                                            </Badge>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                              <span className="text-sm sm:text-base font-medium text-gray-900 break-words" data-testid={`player-out-name-gw${gw}-${offsetIndex}`}>{rec.playerOut.webName}</span>
                                              <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-out-points-gw${gw}-${offsetIndex}`}>
                                                ({rec.playerOut.projectedPoints.toFixed(1)} pts)
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 shrink-0">
                                              IN
                                            </Badge>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                              <span className="text-sm sm:text-base font-medium text-gray-900 break-words" data-testid={`player-in-name-gw${gw}-${offsetIndex}`}>{rec.playerIn.webName}</span>
                                              <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-in-points-gw${gw}-${offsetIndex}`}>
                                                ({rec.playerIn.projectedPoints.toFixed(1)} pts)
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Points Gain</div>
                                            <div className="text-base sm:text-lg font-bold text-green-600" data-testid={`points-gain-gw${gw}-${offsetIndex}`}>+{rec.pointsGain.toFixed(1)}</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Cost</div>
                                            <div className={`text-sm sm:text-base font-semibold ${rec.cost >= 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`cost-gw${gw}-${offsetIndex}`}>
                                              {rec.cost >= 0 ? '+' : ''}{(rec.cost / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">ITB After</div>
                                            <div className="text-sm sm:text-base font-medium text-gray-700" data-testid={`budget-after-gw${gw}-${offsetIndex}`}>
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
        {searchedId && !isLoadingRecommendations && adjustedRecommendations && (!adjustedRecommendations.gameweeks || Object.keys(adjustedRecommendations.gameweeks).length === 0) && (
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

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, Search, TrendingUp, TrendingDown, DollarSign, AlertCircle, Users, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingExperience } from "@/components/loading-experience";
import { extractManagerId } from "@/lib/manager-id-utils";
import { FplConnectDialog } from "@/components/fpl-connect-dialog";
import { useAuth } from "@/hooks/useAuth";

interface TeamPick {
  element: number;
  position: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  projectedPoints?: number;
}

export default function TransferRecommendations() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<string | null>(null);
  const [useFallbackEndpoint, setUseFallbackEndpoint] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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

  // Auto-load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId); // Auto-trigger data loading
    }
  }, []);

  // Check if user is viewing their own team
  const isOwnTeam = user?.fplManagerId && searchedId && Number(searchedId) === user.fplManagerId;

  // Determine which endpoint to use (with fallback for expired sessions)
  const shouldUseAuthenticatedEndpoint = isOwnTeam && !useFallbackEndpoint;

  // Fetch recommended transfers - use authenticated endpoint for own team (shows GW 13 unconfirmed data)
  // Fall back to public endpoint if session expired (GW 12 confirmed data)
  const { data: recommendedTransfers, isLoading: isLoadingRecommendations, error: recommendationsError } = useQuery<any>({
    queryKey: shouldUseAuthenticatedEndpoint ? ["/api/fpl/recommended-transfers"] : ["/api/manager", searchedId, "recommended-transfers"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false, // Don't auto-retry if FPL session expired
  });

  // Handle FPL session expiry - fall back to public endpoint
  useEffect(() => {
    if (recommendationsError && shouldUseAuthenticatedEndpoint && searchedId) {
      console.log("⚠️ FPL session expired or unavailable, falling back to manager ID endpoint");
      setUseFallbackEndpoint(true);
    }
  }, [recommendationsError, shouldUseAuthenticatedEndpoint, searchedId]);

  // Fetch bootstrap data
  const { data: bootstrapData } = useQuery<any>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 15 * 60 * 1000,
  });

  // Fetch team data for current squad
  const { data: teamData } = useQuery<any>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch player projections for the selected gameweek
  const { data: playerProjections } = useQuery<any[]>({
    queryKey: ["/api/player-total-points", selectedGameweek],
    enabled: !!selectedGameweek && selectedGameweek !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!selectedGameweek) return [];
      const response = await fetch(`/api/player-total-points?startGameweek=${selectedGameweek}&endGameweek=${selectedGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch projections: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch fixtures
  const { data: fixturesData } = useQuery<any[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 15 * 60 * 1000,
  });

  // Backend now applies availability adjustments, so we just use the data as-is
  const adjustedRecommendations = recommendedTransfers;

  // Helper function to get opponent info for a player in a given gameweek
  const getOpponentInfo = (playerTeamId: number, gameweek: number): string => {
    if (!fixturesData || !bootstrapData) return '';
    
    const fixture = fixturesData.find((f: any) => 
      f.event === gameweek && (f.team_h === playerTeamId || f.team_a === playerTeamId)
    );
    
    if (!fixture) return '';
    
    const isHome = fixture.team_h === playerTeamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponent = bootstrapData.teams?.find((t: any) => t.id === opponentId);
    
    return opponent ? `vs ${opponent.short_name} (${isHome ? 'H' : 'A'})` : '';
  };

  // Auto-set first gameweek when recommendations load
  useEffect(() => {
    if (adjustedRecommendations?.gameweeks && !selectedGameweek) {
      const firstGW = Object.keys(adjustedRecommendations.gameweeks)[0];
      if (firstGW) {
        setSelectedGameweek(firstGW);
      }
    }
  }, [adjustedRecommendations, selectedGameweek]);

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

  // Helper to get player data by ID
  const getPlayerById = (playerId: number) => {
    return bootstrapData?.elements?.find((p: any) => p.id === playerId);
  };

  // Apply primary recommended transfers to current team (or return current team if rolling)
  const applyRecommendedTransfers = useMemo(() => {
    if (!selectedGameweek || !adjustedRecommendations?.gameweeks?.[selectedGameweek] || !teamData?.picks) {
      return null;
    }

    const gwData = adjustedRecommendations.gameweeks[selectedGameweek];
    const freeTransfers = gwData.freeTransfersAvailable || 1;
    const primaryTransfers = gwData.recommendations?.slice(0, freeTransfers) || [];

    // Clone current picks
    let updatedPicks = teamData.picks.map((pick: any) => ({ ...pick }));

    // If roll recommendation, just return current team without changes
    if (primaryTransfers.length > 0 && primaryTransfers[0]?.type === 'roll') {
      return updatedPicks;
    }

    // Apply each primary transfer
    primaryTransfers.forEach((rec: any) => {
      const outIndex = updatedPicks.findIndex((p: any) => p.element === rec.playerOut.id);
      if (outIndex !== -1) {
        updatedPicks[outIndex] = {
          ...updatedPicks[outIndex],
          element: rec.playerIn.id,
        };
      }
    });

    return updatedPicks;
  }, [selectedGameweek, adjustedRecommendations, teamData, bootstrapData]);

  // Track transferred-in players for highlighting
  const transferredInPlayers = useMemo(() => {
    if (!selectedGameweek || !adjustedRecommendations?.gameweeks?.[selectedGameweek]) {
      return new Set<number>();
    }

    const gwData = adjustedRecommendations.gameweeks[selectedGameweek];
    const freeTransfers = gwData.freeTransfersAvailable || 1;
    const primaryTransfers = gwData.recommendations?.slice(0, freeTransfers) || [];

    // Filter out recommendations without playerIn (e.g., roll recommendations)
    const validTransfers = primaryTransfers.filter((rec: any) => rec.playerIn?.id);
    return new Set(validTransfers.map((rec: any) => rec.playerIn.id));
  }, [selectedGameweek, adjustedRecommendations]);

  // Optimize lineup to maximize points
  const optimizedTeam = useMemo((): {
    lineup: TeamPick[];
    formation: { def: number; mid: number; fwd: number; name: string } | null;
    totalPoints: number;
  } | null => {
    if (!applyRecommendedTransfers || !playerProjections || !bootstrapData || !selectedGameweek) {
      return null;
    }

    // Get projected points for a player
    const getProjectedPoints = (playerId: number): number => {
      const projection = playerProjections.find((p: any) => p.playerId === playerId);
      if (!projection) return 0;
      
      // The API returns gameweekProjections as an object with gameweek keys
      // Extract the projected points for the selected gameweek
      const gwPoints = projection.gameweekProjections?.[selectedGameweek];
      return gwPoints || projection.totalExpectedPoints || projection.projectedPoints || 0;
    };

    // Group players by position
    const squadByPosition: {
      GKP: TeamPick[];
      DEF: TeamPick[];
      MID: TeamPick[];
      FWD: TeamPick[];
    } = {
      GKP: [],
      DEF: [],
      MID: [],
      FWD: []
    };

    applyRecommendedTransfers.forEach((pick: any) => {
      const player = getPlayerById(pick.element);
      if (!player) return;
      
      const positionType = player.element_type;
      const posKey = positionType === 1 ? 'GKP' : positionType === 2 ? 'DEF' : positionType === 3 ? 'MID' : 'FWD';
      squadByPosition[posKey].push({
        ...pick,
        projectedPoints: getProjectedPoints(pick.element)
      });
    });

    // Sort each position by projected points (descending)
    Object.keys(squadByPosition).forEach(pos => {
      squadByPosition[pos as keyof typeof squadByPosition].sort((a: any, b: any) => (b.projectedPoints || 0) - (a.projectedPoints || 0));
    });

    // Valid FPL formations
    const formations = [
      { def: 3, mid: 5, fwd: 2, name: '3-5-2' },
      { def: 3, mid: 4, fwd: 3, name: '3-4-3' },
      { def: 4, mid: 5, fwd: 1, name: '4-5-1' },
      { def: 4, mid: 4, fwd: 2, name: '4-4-2' },
      { def: 4, mid: 3, fwd: 3, name: '4-3-3' },
      { def: 5, mid: 4, fwd: 1, name: '5-4-1' },
      { def: 5, mid: 3, fwd: 2, name: '5-3-2' },
    ];

    let bestFormation: { def: number; mid: number; fwd: number; name: string } | null = null;
    let bestPoints = -1;
    let bestLineup: TeamPick[] = [];

    formations.forEach(formation => {
      const gkp = squadByPosition.GKP[0];
      const def = squadByPosition.DEF.slice(0, formation.def);
      const mid = squadByPosition.MID.slice(0, formation.mid);
      const fwd = squadByPosition.FWD.slice(0, formation.fwd);

      if (!gkp || def.length < formation.def || mid.length < formation.mid || fwd.length < formation.fwd) {
        return;
      }

      const starting11 = [gkp, ...def, ...mid, ...fwd];
      const totalPoints = starting11.reduce((sum, pick) => sum + (pick.projectedPoints || 0), 0);

      if (totalPoints > bestPoints) {
        bestPoints = totalPoints;
        bestFormation = formation;
        bestLineup = starting11;
      }
    });

    if (!bestLineup.length || !bestFormation) return null;

    // Reorganize starting 11: GKP, DEF, MID, FWD (in formation order)
    const starting11 = [
      squadByPosition.GKP[0], // Goalkeeper
      ...squadByPosition.DEF.slice(0, bestFormation.def), // Defenders
      ...squadByPosition.MID.slice(0, bestFormation.mid), // Midfielders
      ...squadByPosition.FWD.slice(0, bestFormation.fwd)  // Forwards
    ];

    // Assign positions (1-11 for starting)
    const optimized = starting11.map((pick, idx) => ({
      ...pick,
      position: idx + 1,
      is_captain: false,
      is_vice_captain: false,
    }));

    // Add bench players
    const benchGKP = squadByPosition.GKP.filter(p => !optimized.find(o => o.element === p.element));
    const benchDEF = squadByPosition.DEF.filter(p => !optimized.find(o => o.element === p.element));
    const benchMID = squadByPosition.MID.filter(p => !optimized.find(o => o.element === p.element));
    const benchFWD = squadByPosition.FWD.filter(p => !optimized.find(o => o.element === p.element));

    // Bench: GKP first, then outfield players sorted by projected points
    const benchOutfield = [...benchDEF, ...benchMID, ...benchFWD]
      .sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0));
    
    const bench = [...benchGKP, ...benchOutfield]
      .slice(0, 4)
      .map((pick, idx) => ({
        ...pick,
        position: 12 + idx,
        is_captain: false,
        is_vice_captain: false,
      }));

    const finalLineup = [...optimized, ...bench];

    // Set captain (highest projected in starting 11)
    const captainPick = optimized.reduce((best, pick) => 
      (pick.projectedPoints || 0) > (best.projectedPoints || 0) ? pick : best
    );
    const captainIndex = finalLineup.findIndex(p => p.element === captainPick.element);
    if (captainIndex !== -1) {
      finalLineup[captainIndex].is_captain = true;
    }

    // Set vice captain (second highest in starting 11)
    const viceCaptainPick = optimized
      .filter(p => p.element !== captainPick.element)
      .reduce((best, pick) => 
        (pick.projectedPoints || 0) > (best.projectedPoints || 0) ? pick : best
      );
    const viceCaptainIndex = finalLineup.findIndex(p => p.element === viceCaptainPick.element);
    if (viceCaptainIndex !== -1) {
      finalLineup[viceCaptainIndex].is_vice_captain = true;
    }

    return {
      lineup: finalLineup,
      formation: bestFormation,
      totalPoints: bestPoints + (captainPick.projectedPoints || 0) // Add captain bonus
    };
  }, [applyRecommendedTransfers, playerProjections, bootstrapData, selectedGameweek]);

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
    setUseFallbackEndpoint(false); // Reset fallback flag to try authenticated endpoint first
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

  // Debug optimized team
  useEffect(() => {
    console.log("🔍 Optimized Team Debug:", {
      selectedGameweek,
      hasTeamData: !!teamData,
      teamDataPicks: teamData?.picks?.length,
      hasAdjustedRecommendations: !!adjustedRecommendations,
      hasGameweekData: !!adjustedRecommendations?.gameweeks?.[selectedGameweek || ''],
      hasApplyRecommendedTransfers: !!applyRecommendedTransfers,
      applyRecommendedTransfersLength: applyRecommendedTransfers?.length,
      hasPlayerProjections: !!playerProjections,
      playerProjectionsLength: playerProjections?.length,
      hasBootstrapData: !!bootstrapData,
      hasOptimizedTeam: !!optimizedTeam,
      optimizedTeam
    });
  }, [selectedGameweek, teamData, adjustedRecommendations, applyRecommendedTransfers, playerProjections, bootstrapData, optimizedTeam]);

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

        {/* Manager Search Section */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
              <label htmlFor="manager-id" className="block text-sm font-medium text-gray-700 mb-2">
                Manager ID
              </label>
              <div className="flex flex-col gap-3">
                <Input
                  id="manager-id"
                  type="text"
                  placeholder="Paste browser URL or Manager ID (e.g., https://fantasy.premierleague.com/entry/123456)"
                  value={managerId}
                  onChange={(e) => {
                    const extractedId = extractManagerId(e.target.value);
                    setManagerId(extractedId);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !isLoadingRecommendations && handleSearch()}
                  className="w-full border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                  data-testid="input-manager-id"
                  disabled={isLoadingRecommendations}
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                  <Button 
                    onClick={handleSearch} 
                    disabled={!managerId.trim() || isLoadingRecommendations}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                    data-testid="button-search-manager"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isLoadingRecommendations ? "Analyzing..." : "Search Manager"}
                  </Button>
                  <FplConnectDialog />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session expiry notification for logged-in users */}
        {useFallbackEndpoint && isOwnTeam && (() => {
          const currentGW = bootstrapData?.events.find((e: any) => e.is_current)?.id || 
                           bootstrapData?.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;
          const upcomingGW = currentGW + 1;
          
          return (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    FPL session expired. Please reconnect to sync your latest GW {upcomingGW} team.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Notification for non-logged-in users */}
        {!user && searchedId && (() => {
          const currentGW = bootstrapData?.events.find((e: any) => e.is_current)?.id || 
                           bootstrapData?.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;
          const upcomingGW = currentGW + 1;
          
          return (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    The transfer recommendations are based on your team from GW {currentGW}. Login to FPL Dilemmas, and connect your FPL account to get transfer recommendations based on your latest team from GW {upcomingGW}.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Error state - only show if fallback also failed */}
        {recommendationsError && useFallbackEndpoint && (
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
              <Tabs defaultValue={Object.keys(adjustedRecommendations.gameweeks)[0]} className="w-full" onValueChange={setSelectedGameweek}>
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
                      <div className="space-y-3">
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
                              const otherTransfers = gwData.recommendations.slice(freeTransfers, freeTransfers + 5);
                              
                              return (
                                <>
                                  {primaryTransfers.length > 0 && (
                                <div>
                                  <h3 className="text-base font-semibold text-gray-700 mb-2">
                                    Primary Transfer Recommendation{primaryTransfers.length > 1 ? 's' : ''}
                                  </h3>
                                  <div className="space-y-2">
                                    {primaryTransfers.map((rec: any, index: number) => (
                                      <div
                                        key={`${rec.playerOut.id}-${rec.playerIn.id}`}
                                        className="p-2 sm:p-3 bg-gradient-to-r from-orange-50 to-white border-2 border-orange-300 rounded-lg shadow-sm space-y-2"
                                        data-testid={`transfer-recommendation-gw${gw}-${index}`}
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-start gap-2">
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 shrink-0">
                                              OUT
                                            </Badge>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                              <span className="text-sm font-medium text-gray-900 break-words" data-testid={`player-out-name-gw${gw}-${index}`}>{rec.playerOut.webName}</span>
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
                                              <span className="text-sm font-medium text-gray-900 break-words" data-testid={`player-in-name-gw${gw}-${index}`}>{rec.playerIn.webName}</span>
                                              <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-in-points-gw${gw}-${index}`}>
                                                ({rec.playerIn.projectedPoints.toFixed(1)} pts)
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-orange-200">
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">Points Gain</div>
                                            <div className="text-sm sm:text-base font-bold text-green-600" data-testid={`points-gain-gw${gw}-${index}`}>+{rec.pointsGain.toFixed(1)}</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">Cost</div>
                                            <div className={`text-xs sm:text-sm font-semibold ${rec.cost >= 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`cost-gw${gw}-${index}`}>
                                              {rec.cost >= 0 ? '+' : ''}{(rec.cost / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">ITB After</div>
                                            <div className="text-xs sm:text-sm font-medium text-gray-700" data-testid={`budget-after-gw${gw}-${index}`}>
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
                                  <h3 className="text-base font-semibold text-gray-700 mb-2">Other Transfer Recommendations</h3>
                                  <div className="space-y-2">
                                    {otherTransfers.map((rec: any, index: number) => {
                                      const offsetIndex = freeTransfers + index;
                                      return (
                                      <div
                                        key={`${rec.playerOut.id}-${rec.playerIn.id}`}
                                        className="p-2 sm:p-3 bg-white border border-orange-100 rounded-lg hover:border-orange-300 transition-colors space-y-2"
                                        data-testid={`transfer-recommendation-gw${gw}-${offsetIndex}`}
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-start gap-2">
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 shrink-0">
                                              OUT
                                            </Badge>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                              <span className="text-sm font-medium text-gray-900 break-words" data-testid={`player-out-name-gw${gw}-${offsetIndex}`}>{rec.playerOut.webName}</span>
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
                                              <span className="text-sm font-medium text-gray-900 break-words" data-testid={`player-in-name-gw${gw}-${offsetIndex}`}>{rec.playerIn.webName}</span>
                                              <span className="text-xs text-gray-500 whitespace-nowrap" data-testid={`player-in-points-gw${gw}-${offsetIndex}`}>
                                                ({rec.playerIn.projectedPoints.toFixed(1)} pts)
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-gray-200">
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">Points Gain</div>
                                            <div className="text-sm sm:text-base font-bold text-green-600" data-testid={`points-gain-gw${gw}-${offsetIndex}`}>+{rec.pointsGain.toFixed(1)}</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">Cost</div>
                                            <div className={`text-xs sm:text-sm font-semibold ${rec.cost >= 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`cost-gw${gw}-${offsetIndex}`}>
                                              {rec.cost >= 0 ? '+' : ''}{(rec.cost / 10).toFixed(1)}m
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-xs text-gray-500">ITB After</div>
                                            <div className="text-xs sm:text-sm font-medium text-gray-700" data-testid={`budget-after-gw${gw}-${offsetIndex}`}>
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

        {/* Optimized Team After Transfers */}
        {searchedId && !isLoadingRecommendations && optimizedTeam && selectedGameweek && (
          <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-white">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Updated Team - GW{selectedGameweek}
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  Optimized Lineup
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Team with primary transfers applied and optimized for maximum points
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-6">
                <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Formation</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {optimizedTeam.formation?.name || 'N/A'}
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Projected Points</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {optimizedTeam.totalPoints.toFixed(1)}
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border col-span-2 md:col-span-1">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Players</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {optimizedTeam.lineup.length}
                  </div>
                </div>
              </div>

              {/* Starting 11 */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  Starting XI
                </h3>
                <div className="space-y-2">
                  {optimizedTeam.lineup.slice(0, 11).map((pick: TeamPick, idx: number) => {
                    const player = getPlayerById(pick.element);
                    if (!player) return null;
                    const position = player.element_type === 1 ? 'GKP' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD';
                    const isTransferredIn = transferredInPlayers.has(pick.element);
                    const opponentInfo = getOpponentInfo(player.team, parseInt(selectedGameweek!));
                    
                    return (
                      <div 
                        key={pick.element} 
                        className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                          pick.is_captain 
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400' 
                            : pick.is_vice_captain
                            ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300'
                            : isTransferredIn
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400'
                            : 'bg-white border-gray-200 hover:border-green-300'
                        }`}
                        data-testid={`starting-player-${idx}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {position}
                                </Badge>
                                {pick.is_captain && <Badge className="bg-yellow-400 text-yellow-900 text-xs shrink-0">C</Badge>}
                                {pick.is_vice_captain && <Badge className="bg-orange-400 text-orange-900 text-xs shrink-0">VC</Badge>}
                                {isTransferredIn && <Badge className="bg-green-500 text-white text-xs shrink-0">NEW</Badge>}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                                <span className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                  {player.web_name}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <span>{bootstrapData?.teams?.find((t: any) => t.id === player.team)?.short_name || ''}</span>
                                  {opponentInfo && <span className="font-medium">{opponentInfo}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Projected</div>
                              <div className="text-sm sm:text-base font-bold text-green-600">
                                {(pick.projectedPoints || 0).toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bench */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3">Bench</h3>
                <div className="space-y-2">
                  {optimizedTeam.lineup.slice(11, 15).map((pick: TeamPick, idx: number) => {
                    const player = getPlayerById(pick.element);
                    if (!player) return null;
                    const position = player.element_type === 1 ? 'GKP' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD';
                    const isTransferredIn = transferredInPlayers.has(pick.element);
                    const opponentInfo = getOpponentInfo(player.team, parseInt(selectedGameweek!));
                    
                    return (
                      <div 
                        key={pick.element} 
                        className={`p-3 sm:p-4 rounded-lg border ${
                          isTransferredIn 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                        data-testid={`bench-player-${idx}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs w-fit">
                                  {position}
                                </Badge>
                                {isTransferredIn && <Badge className="bg-green-500 text-white text-xs shrink-0">NEW</Badge>}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                                <span className="text-sm sm:text-base font-medium text-gray-700 truncate">
                                  {player.web_name}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <span>{bootstrapData?.teams?.find((t: any) => t.id === player.team)?.short_name || ''}</span>
                                  {opponentInfo && <span className="font-medium">{opponentInfo}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Projected</div>
                            <div className="text-sm sm:text-base font-semibold text-gray-600">
                              {(pick.projectedPoints || 0).toFixed(1)} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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

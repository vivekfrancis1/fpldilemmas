import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Save, Calendar, Target, Sparkles, Crown, ArrowUpDown, ChevronUp, ChevronDown, X, Plus, RotateCcw, Copy, Trash2, Edit2, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TeamPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  selling_price: number;
  purchase_price?: number;
  is_transferred_out?: boolean;
}

interface TeamData {
  picks: TeamPick[];
  transfers: {
    cost: number;
    status: string;
    limit: number;
    made: number;
    bank: number;
    value: number;
  };
  entry?: {
    bank: number;
    value: number;
  };
}

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
}

interface BootstrapData {
  elements: Player[];
  element_types: Array<{
    id: number;
    plural_name: string;
    singular_name: string;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
  events: Array<{
    id: number;
    name: string;
    is_current: boolean;
    is_next: boolean;
    finished: boolean;
  }>;
}

interface OptimizedLineup {
  formation: string;
  starting11: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>;
  bench: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    benchPosition: number;
  }>;
  totalProjectedPoints: number;
  captainProjectedPoints: number;
  gameweek: number;
}

interface PlayerProjectionData {
  playerId: number;
  name: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  gameweekProjections: { [key: string]: number };
  totalExpectedPoints: number;
}

interface AllPlayersProjectionsTabProps {
  selectedGameweek: number;
  transferredOutPlayers: TransferOut[];
  onTransferIn: (playerId: number, playerElementType: number) => void;
  currentBank: number;
  initialPositionFilter?: string;
  scrollToView?: boolean;
  onScrollComplete?: () => void;
}

function AllPlayersProjectionsTab({ selectedGameweek, transferredOutPlayers, onTransferIn, currentBank, initialPositionFilter = "all", scrollToView = false, onScrollComplete }: AllPlayersProjectionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState(initialPositionFilter);
  const [teamFilter, setTeamFilter] = useState("all");
  const [loadGroupFilter, setLoadGroupFilter] = useState("All");
  const [sortField, setSortField] = useState<string>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const sectionRef = useRef<HTMLDivElement>(null);

  // Update position filter when initialPositionFilter changes
  useEffect(() => {
    setPositionFilter(initialPositionFilter);
  }, [initialPositionFilter]);

  // Scroll to view when requested
  useEffect(() => {
    if (scrollToView && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (onScrollComplete) {
        onScrollComplete();
      }
    }
  }, [scrollToView, onScrollComplete]);

  const { data: allPlayersData, isLoading } = useQuery<PlayerProjectionData[]>({
    queryKey: ["/api/cached/player-total-points"],
    staleTime: 60 * 60 * 1000,
  });

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Loading player projections...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!allPlayersData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No projection data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get next 6 gameweeks
  const getNextGameweeks = () => {
    if (!bootstrapData) return [];
    
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const nextEvent = bootstrapData.events.find(e => e.is_next);
    
    let startGW = currentEvent?.id || nextEvent?.id || 1;
    if (currentEvent?.finished) {
      startGW = nextEvent?.id || startGW + 1;
    }
    
    const gameweeks = [];
    for (let i = 0; i < 6; i++) {
      const gwNumber = startGW + i;
      if (gwNumber <= 38) {
        gameweeks.push(gwNumber);
      }
    }
    
    return gameweeks;
  };

  const nextGameweeks = getNextGameweeks();

  // Calculate top 3 players for each gameweek
  const getTop3ForGameweek = (gw: number) => {
    const sorted = [...allPlayersData]
      .map(p => ({ playerId: p.playerId, points: p.gameweekProjections[gw.toString()] || 0 }))
      .sort((a, b) => b.points - a.points);
    
    return {
      first: sorted[0]?.playerId,
      second: sorted[1]?.playerId,
      third: sorted[2]?.playerId,
    };
  };

  // Get unique teams for filter
  const teams = bootstrapData?.teams || [];
  const uniqueTeams = Array.from(new Set(allPlayersData.map(p => p.team))).sort();

  // Filter and sort players
  let filteredPlayers = allPlayersData
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      const matchesTeam = teamFilter === "all" || player.team === teamFilter;
      
      return matchesSearch && matchesPosition && matchesTeam;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'total') {
        comparison = (a.totalExpectedPoints || 0) - (b.totalExpectedPoints || 0);
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField.startsWith('gw_')) {
        const gwKey = sortField.replace('gw_', '');
        const aPoints = a.gameweekProjections[gwKey] || 0;
        const bPoints = b.gameweekProjections[gwKey] || 0;
        comparison = aPoints - bPoints;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

  // Apply load group filter
  if (loadGroupFilter !== "All") {
    const limit = parseInt(loadGroupFilter.replace("Top ", ""));
    filteredPlayers = filteredPlayers.slice(0, limit);
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as any);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <Card ref={sectionRef}>
      <CardHeader>
        <CardTitle>All Players - Next 6 Gameweeks Projections</CardTitle>
        <div className="flex flex-col gap-4 mt-4">
          {/* Row 1: Search and Position */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search players or teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-64"
              data-testid="input-player-search"
            />
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="md:w-48" data-testid="select-position-filter">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="Goalkeeper">Goalkeepers</SelectItem>
                <SelectItem value="Defender">Defenders</SelectItem>
                <SelectItem value="Midfielder">Midfielders</SelectItem>
                <SelectItem value="Forward">Forwards</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Row 2: Team and Load Group */}
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="md:w-48" data-testid="select-team-filter">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {uniqueTeams.map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={loadGroupFilter} onValueChange={setLoadGroupFilter}>
              <SelectTrigger className="md:w-48" data-testid="select-load-group">
                <SelectValue placeholder="Load Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Top 50">Top 50</SelectItem>
                <SelectItem value="Top 100">Top 100</SelectItem>
                <SelectItem value="Top 200">Top 200</SelectItem>
                <SelectItem value="All">All Players</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 sticky left-0 bg-white dark:bg-gray-950 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('name')}
                    data-testid="sort-name"
                  >
                    Player {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-left p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('price')}
                    data-testid="sort-price"
                  >
                    Price {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />)}
                  </Button>
                </th>
                {nextGameweeks.map((gw) => (
                  <th key={gw} className="text-center p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(`gw_${gw}`)}
                      data-testid={`sort-gw${gw}`}
                    >
                      GW{gw} {sortField === `gw_${gw}` && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />)}
                    </Button>
                  </th>
                ))}
                <th className="text-center p-2 font-bold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('total')}
                    data-testid="sort-total"
                  >
                    Total {sortField === 'total' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-center p-2 font-bold bg-gray-50 dark:bg-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                return (
                  <tr
                    key={player.playerId}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-900"
                    data-testid={`player-row-${player.playerId}`}
                  >
                    <td className="p-2 sticky left-0 bg-white dark:bg-gray-950">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.position} • {player.team} • £{player.price.toFixed(1)}m • {player.ownership.toFixed(1)}%
                      </div>
                    </td>
                    <td className="p-2 text-center">£{player.price.toFixed(1)}m</td>
                    {nextGameweeks.map((gw) => {
                      const gwPoints = player.gameweekProjections[gw.toString()] || 0;
                      const top3 = getTop3ForGameweek(gw);
                      
                      // Determine styling based on rank
                      let bgColor = '';
                      let textColor = 'text-purple-600';
                      
                      if (player.playerId === top3.first) {
                        bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
                        textColor = 'text-yellow-800 dark:text-yellow-300';
                      } else if (player.playerId === top3.second) {
                        bgColor = 'bg-gray-200 dark:bg-gray-700';
                        textColor = 'text-gray-800 dark:text-gray-300';
                      } else if (player.playerId === top3.third) {
                        bgColor = 'bg-orange-100 dark:bg-orange-900/30';
                        textColor = 'text-orange-800 dark:text-orange-300';
                      }
                      
                      return (
                        <td key={gw} className={`p-2 text-center ${bgColor}`}>
                          <span className={`${textColor} font-medium`}>
                            {gwPoints.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <span className="font-bold text-green-600 text-base">
                        {(player.totalExpectedPoints || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      {(() => {
                        // Map position names to element types
                        const positionMap: { [key: string]: number } = {
                          'Goalkeeper': 1,
                          'Defender': 2,
                          'Midfielder': 3,
                          'Forward': 4
                        };
                        const playerElementType = positionMap[player.position];
                        
                        // Check if there's a matching transfer out for this position
                        const hasMatchingTransferOut = transferredOutPlayers && transferredOutPlayers.length > 0 && transferredOutPlayers.some(
                          t => t.elementType === playerElementType
                        );
                        
                        // Calculate available budget: current bank + selling prices of transferred out players
                        const totalSellingPrice = transferredOutPlayers.reduce((sum, t) => sum + t.sellingPrice, 0);
                        const availableBudget = currentBank + totalSellingPrice;
                        
                        // Check if player is affordable
                        const isAffordable = player.price <= availableBudget;
                        
                        return hasMatchingTransferOut && isAffordable ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => onTransferIn(player.playerId, playerElementType)}
                            data-testid={`transfer-in-${player.playerId}`}
                            title="Transfer In"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : null;
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No players found matching your criteria
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TransferOut {
  playerId: number;
  playerName: string;
  position: number;
  elementType: number;
  sellingPrice: number;
}

interface CompletedTransfer {
  outPlayerId: number;
  outPlayerName: string;
  sellingPrice: number;
  inPlayerId: number;
  inPlayerName: string;
  buyingPrice: number;
}

interface GameweekTransfers {
  [gameweek: number]: {
    transferredOut: TransferOut[];
    completed: CompletedTransfer[];
  };
}

export default function TransferPlanner() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [plannerMode, setPlannerMode] = useState<"auto" | "manual">("manual");
  const [optimizedLineup, setOptimizedLineup] = useState<OptimizedLineup | null>(null);
  const [manualLineup, setManualLineup] = useState<TeamPick[]>([]);
  
  // Store transfers per gameweek for cumulative effect
  const [gameweekTransfers, setGameweekTransfers] = useState<GameweekTransfers>({});
  
  // Current gameweek's transfers (for convenience)
  const [transferredOutPlayers, setTransferredOutPlayers] = useState<TransferOut[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<CompletedTransfer[]>([]);
  
  // Player projections tab state for quick navigation
  const [projectionPositionFilter, setProjectionPositionFilter] = useState<string>("all");
  const [scrollToProjections, setScrollToProjections] = useState<boolean>(false);
  
  // Track which manager has been initialized to prevent unwanted resets
  const initializedManagerRef = useRef<string | null>(null);
  
  // Ref for scrolling to team lineup after transfer
  const teamLineupRef = useRef<HTMLDivElement>(null);
  
  // Draft management state
  const [activeDraft, setActiveDraft] = useState<string>("Base"); // Current working draft
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Buy price editing state
  const [editingBuyPrice, setEditingBuyPrice] = useState<number | null>(null);
  const [editBuyPriceValue, setEditBuyPriceValue] = useState<string>("");
  
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

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: teamData, isLoading: isLoadingTeam } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent auto-refetch that would reset transfers
  });

  // Fetch buy prices for all players in the team
  const { data: buyPricesData } = useQuery<{ buyPrices: Record<number, number> }>({
    queryKey: ["/api/manager", searchedId, "buy-prices"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Calculate baseline lineup for a given gameweek by applying all previous transfers
  const getBaselineLineup = (targetGameweek: number): TeamPick[] => {
    if (!teamData?.picks) return [];
    
    // Start with original team
    let baseline = [...teamData.picks];
    
    // Get the starting gameweek
    const firstGW = getNextGameweeks()[0]?.id || 7;
    
    // Apply all transfers from previous gameweeks
    for (let gw = firstGW; gw < targetGameweek; gw++) {
      const transfers = gameweekTransfers[gw];
      if (transfers && transfers.completed) {
        // Apply each completed transfer
        transfers.completed.forEach(transfer => {
          baseline = baseline.map(pick => {
            if (pick.element === transfer.outPlayerId) {
              // Replace with new player
              const inPlayer = getPlayerById(transfer.inPlayerId);
              if (inPlayer) {
                return {
                  ...pick,
                  element: transfer.inPlayerId,
                  selling_price: inPlayer.now_cost,
                };
              }
            }
            return pick;
          });
        });
      }
    }
    
    return baseline;
  };

  // Initialize manual lineup when team data loads (only on first load or manager change)
  useEffect(() => {
    if (teamData?.picks && searchedId && initializedManagerRef.current !== searchedId) {
      console.log("DEBUG: Initializing team for manager:", searchedId);
      console.log("DEBUG: First pick from teamData:", teamData.picks[0]);
      
      // Merge buy prices into picks if available, defaulting to current price
      let picksWithBuyPrices = teamData.picks.map(pick => {
        const player = getPlayerById(pick.element);
        const currentPrice = player?.now_cost || pick.selling_price;
        
        return {
          ...pick,
          purchase_price: buyPricesData?.buyPrices?.[pick.element] || currentPrice
        };
      });
      
      setManualLineup(picksWithBuyPrices);
      // Reset all transfers when loading NEW team data (different manager)
      setGameweekTransfers({});
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      // Mark this manager as initialized
      initializedManagerRef.current = searchedId;
    }
  }, [teamData, searchedId, buyPricesData]);

  // Fetch player projections for the selected gameweek
  const { data: playerProjections } = useQuery<any[]>({
    queryKey: ["/api/player-total-points", selectedGameweek],
    enabled: !!selectedGameweek,
    queryFn: async () => {
      const response = await fetch(`/api/player-total-points?startGameweek=${selectedGameweek}&endGameweek=${selectedGameweek}`);
      return response.json();
    }
  });

  // Fetch player projections for next 6 gameweeks (for 6GW total calculation)
  const { data: playerProjections6GW } = useQuery<any[]>({
    queryKey: ["/api/player-total-points-6gw", bootstrapData?.events],
    enabled: !!bootstrapData,
    queryFn: async () => {
      // Compute gameweek range inside queryFn
      const nextGWs = getNextGameweeks();
      const startGW = nextGWs[0]?.id || 7;
      const endGW = nextGWs[nextGWs.length - 1]?.id || (startGW + 5);
      const response = await fetch(`/api/player-total-points?startGameweek=${startGW}&endGameweek=${endGW}`);
      return response.json();
    }
  });

  // Auto-optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!teamData || !selectedGameweek || manualLineup.length === 0) {
        throw new Error("Team data and gameweek are required");
      }

      // Use manualLineup which includes all transfers for this gameweek
      // Filter out transferred-out players (empty slots)
      const activeLineup = manualLineup.filter(pick => !pick.is_transferred_out);

      const response = await fetch("/api/transfer-planner/auto-optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          picks: activeLineup,
          gameweek: selectedGameweek
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Optimization failed");
      }

      return response.json();
    },
    onSuccess: (data: OptimizedLineup) => {
      setOptimizedLineup(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Get next 6 gameweeks
  const getNextGameweeks = () => {
    if (!bootstrapData) return [];
    
    // Find the current or next gameweek
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const nextEvent = bootstrapData.events.find(e => e.is_next);
    
    // Start from current if it's not finished, otherwise start from next
    let startGW = currentEvent?.id || nextEvent?.id || 1;
    if (currentEvent?.finished) {
      startGW = nextEvent?.id || startGW + 1;
    }
    
    const nextGameweeks = [];
    
    // Get exactly 6 upcoming gameweeks
    for (let i = 0; i < 6; i++) {
      const gwNumber = startGW + i;
      const gw = bootstrapData.events.find(e => e.id === gwNumber);
      if (gw && gwNumber <= 38) {
        nextGameweeks.push(gw);
      }
    }
    
    return nextGameweeks;
  };

  // Set default gameweek when bootstrap data loads
  useEffect(() => {
    if (bootstrapData && !selectedGameweek) {
      const nextGWs = getNextGameweeks();
      if (nextGWs.length > 0) {
        setSelectedGameweek(nextGWs[0].id);
      }
    }
  }, [bootstrapData]);

  // Save and load transfers when gameweek changes
  useEffect(() => {
    if (!selectedGameweek || !teamData?.picks) return;
    
    // Clear optimized lineup when gameweek changes
    setOptimizedLineup(null);
    
    // Base Draft: ALWAYS show original team with NO transfers
    if (activeDraft === "Base") {
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      setManualLineup([...teamData.picks]);
      return;
    }
    
    // Other drafts: Load transfers for the selected gameweek
    const gwTransfers = gameweekTransfers[selectedGameweek] || { transferredOut: [], completed: [] };
    setTransferredOutPlayers(gwTransfers.transferredOut);
    setCompletedTransfers(gwTransfers.completed);
    
    // Calculate and set the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    
    // Apply current gameweek's completed transfers (so Vicario→Pope persists)
    let lineupWithTransfers = [...baseline];
    gwTransfers.completed.forEach(transfer => {
      lineupWithTransfers = lineupWithTransfers.map(pick => {
        if (pick.element === transfer.outPlayerId) {
          const inPlayer = getPlayerById(transfer.inPlayerId);
          if (inPlayer) {
            return {
              ...pick,
              element: transfer.inPlayerId,
              selling_price: inPlayer.now_cost,
              purchase_price: inPlayer.now_cost,
            };
          }
        }
        return pick;
      });
    });
    
    // Apply current gameweek's pending transfers (transferred out but not yet replaced)
    gwTransfers.transferredOut.forEach(transferOut => {
      lineupWithTransfers = lineupWithTransfers.map(pick => {
        if (pick.position === transferOut.position) {
          return { ...pick, is_transferred_out: true };
        }
        return pick;
      });
    });
    
    setManualLineup(lineupWithTransfers);
  }, [selectedGameweek, activeDraft]);

  // Auto-run optimization when Auto mode is selected
  useEffect(() => {
    if (plannerMode === "auto" && selectedGameweek && teamData && !optimizeMutation.isPending) {
      optimizeMutation.mutate();
    }
  }, [plannerMode, selectedGameweek, teamData]);

  const handleSearch = () => {
    if (managerId.trim()) {
      const trimmedId = managerId.trim();
      setSearchedId(trimmedId);
      saveManagerIdToCache(trimmedId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getPlayerById = (id: number): Player | undefined => {
    return bootstrapData?.elements.find(p => p.id === id);
  };

  const getPositionName = (elementType: number): string => {
    const position = bootstrapData?.element_types.find(t => t.id === elementType);
    return position?.singular_name || "Unknown";
  };

  const getTeamName = (teamId: number): string => {
    const team = bootstrapData?.teams.find(t => t.id === teamId);
    return team?.short_name || 'Unknown';
  };

  const getPlayerProjectedPoints = (playerId: number): number | null => {
    if (!playerProjections || !selectedGameweek) return null;
    
    const projection = playerProjections.find(p => p.playerId === playerId);
    if (!projection) return null;

    // Get the points for the selected gameweek - API returns gameweekProjections with gameweek number as key
    const points = projection.gameweekProjections?.[selectedGameweek];
    return points !== undefined ? points : null;
  };

  // Check if a player is transferred in (different from the baseline for this gameweek)
  const isPlayerTransferredIn = (pick: TeamPick): boolean => {
    if (!selectedGameweek) return false;
    
    const baseline = getBaselineLineup(selectedGameweek);
    const baselinePick = baseline.find(p => p.position === pick.position);
    
    // Player is transferred in if their ID is different from baseline
    return baselinePick ? pick.element !== baselinePick.element : false;
  };

  // Get selling price using FPL formula: Purchase Price + floor((Current - Purchase) / 0.2) * 0.1
  const getSellingPrice = (pick: TeamPick): number => {
    const player = getPlayerById(pick.element);
    if (!player) return 0;
    
    // If we have purchase_price, calculate using FPL rules
    // For every 0.2m rise (2 in API units), you get 0.1m profit (1 in API units)
    if (pick.purchase_price !== undefined && !isNaN(pick.purchase_price)) {
      const purchasePrice = pick.purchase_price;
      const currentPrice = player.now_cost;
      const profitPerRise = Math.floor((currentPrice - purchasePrice) / 2);
      const sellingPrice = purchasePrice + profitPerRise;
      return sellingPrice / 10;
    }
    
    // Fallback to selling_price from API if purchase_price not available
    if (pick.selling_price && !isNaN(pick.selling_price)) {
      return pick.selling_price / 10;
    }
    
    // Final fallback to current price
    return player.now_cost / 10;
  };

  // Update buy price for a player
  const updateBuyPrice = (playerId: number, newBuyPrice: number) => {
    setManualLineup(prev => prev.map(pick => {
      if (pick.element === playerId) {
        return {
          ...pick,
          purchase_price: Math.round(newBuyPrice * 10) // Convert to API format (tenths)
        };
      }
      return pick;
    }));
    setEditingBuyPrice(null);
    setEditBuyPriceValue("");
    setHasUnsavedChanges(true);
    toast({
      title: "Buy Price Updated",
      description: `Buy price set to £${newBuyPrice.toFixed(1)}m`
    });
  };

  // Start editing buy price
  const startEditingBuyPrice = (playerId: number, currentBuyPrice: number) => {
    setEditingBuyPrice(playerId);
    setEditBuyPriceValue((currentBuyPrice / 10).toFixed(1));
  };

  // Cancel editing buy price
  const cancelEditingBuyPrice = () => {
    setEditingBuyPrice(null);
    setEditBuyPriceValue("");
  };

  // Calculate initial bank for the selected gameweek (before any transfers in that GW)
  const calculateInitialBank = (): number => {
    if (!teamData?.transfers?.bank || !selectedGameweek) return 0;
    
    const nextGWs = getNextGameweeks();
    const firstGW = nextGWs[0]?.id;
    
    // For the first gameweek in the planning horizon, use the actual team bank
    if (selectedGameweek === firstGW) {
      return teamData.transfers.bank / 10; // Convert from API format
    }
    
    // For subsequent gameweeks, initial bank = max(0, Cash after transfers from previous GW)
    const previousGW = selectedGameweek - 1;
    
    // Calculate cash after transfers for previous gameweek
    const teamBank = teamData.transfers.bank / 10;
    let cumulativeBank = teamBank;
    
    nextGWs.forEach(gw => {
      if (gw.id <= previousGW) {
        const gwTransfers = gameweekTransfers[gw.id];
        if (gwTransfers) {
          // Add completed transfers effect
          if (gwTransfers.completed) {
            gwTransfers.completed.forEach(transfer => {
              cumulativeBank += transfer.sellingPrice - transfer.buyingPrice;
            });
          }
          
          // Add pending transferred out players' selling prices
          if (gw.id === previousGW && gwTransfers.transferredOut) {
            gwTransfers.transferredOut.forEach(transfer => {
              cumulativeBank += transfer.sellingPrice;
            });
          }
        }
      }
    });
    
    // Return max(0, previous GW's cash after transfers)
    return Math.max(0, cumulativeBank);
  };

  // Calculate bank after transfers for the selected gameweek
  const calculateBankAfterTransfers = (): number => {
    const initialBank = calculateInitialBank();
    
    // Add effect of current gameweek's transfers
    const totalBuyingPrice = completedTransfers.reduce((sum, t) => sum + t.buyingPrice, 0);
    const totalSellingPrice = completedTransfers.reduce((sum, t) => sum + t.sellingPrice, 0);
    
    // Add selling prices from players transferred out but not yet replaced
    const pendingSellingPrice = transferredOutPlayers.reduce((sum, t) => sum + t.sellingPrice, 0);
    
    return initialBank + totalSellingPrice + pendingSellingPrice - totalBuyingPrice;
  };

  // Calculate current bank based on initial bank and completed transfers (DEPRECATED - use calculateBankAfterTransfers)
  const calculateCurrentBank = (): number => {
    return calculateBankAfterTransfers();
  };

  // Calculate transfers used for a specific gameweek by comparing with baseline
  const calculateTransfersUsedForGameweek = (gameweek: number): number => {
    if (!teamData?.picks) return 0;
    
    // Get the baseline lineup for this gameweek
    const baseline = getBaselineLineup(gameweek);
    
    // Get the current/final lineup for this gameweek (with all cumulative transfers applied)
    let currentLineup = [...baseline];
    
    // Apply all transfers from previous gameweeks
    const nextGWs = getNextGameweeks();
    nextGWs.forEach(gw => {
      if (gw.id <= gameweek) {
        const gwTransfers = gameweekTransfers[gw.id];
        if (gwTransfers && gwTransfers.completed) {
          gwTransfers.completed.forEach(transfer => {
            // Replace the transferred out player with the transferred in player
            currentLineup = currentLineup.map(pick => {
              if (pick.element === transfer.outPlayerId) {
                return { ...pick, element: transfer.inPlayerId };
              }
              return pick;
            });
          });
        }
      }
    });
    
    // Count how many players are different from the baseline
    let transfersUsed = 0;
    baseline.forEach((baselinePick) => {
      const currentPick = currentLineup.find(p => p.position === baselinePick.position);
      if (currentPick && currentPick.element !== baselinePick.element) {
        transfersUsed++;
      }
    });
    
    return transfersUsed;
  };

  // Calculate actual transfers used by comparing with baseline lineup for this gameweek
  const calculateTransfersUsed = (): number => {
    if (!teamData?.picks || !selectedGameweek) return 0;
    return calculateTransfersUsedForGameweek(selectedGameweek);
  };

  // Calculate initial transfers available for a given gameweek (cumulative logic)
  const calculateInitialTransfers = (): number => {
    if (!teamData?.transfers || !selectedGameweek || !bootstrapData) return 0;
    
    // Get current gameweek and the first planning gameweek
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const currentGW = currentEvent?.id || 1;
    const firstPlanningGW = currentGW + 1;
    
    // For the first gameweek in planning, use the base from API
    if (selectedGameweek === firstPlanningGW) {
      return teamData.transfers.limit || 1;
    }
    
    // For subsequent gameweeks: Initial for GW_N = max(1, 1 + Transfers remaining for GW_(N-1))
    // Where Transfers remaining = Initial - Used
    let currentInitial = teamData.transfers.limit || 1;
    
    for (let gw = firstPlanningGW; gw < selectedGameweek; gw++) {
      const used = calculateTransfersUsedForGameweek(gw);
      // Calculate remaining for this gameweek
      const remaining = currentInitial - used;
      // Next gameweek's initial = max(1, 1 + this gameweek's remaining)
      currentInitial = Math.max(1, 1 + remaining);
    }
    
    return currentInitial;
  };

  // Calculate transfers remaining (initial - used, can be negative)
  const calculateTransfersRemaining = (): number => {
    const initial = calculateInitialTransfers();
    const used = calculateTransfersUsed();
    return initial - used;
  };

  // ===== DRAFT COMPARISON HELPERS =====
  
  // Get squad at a specific gameweek for a given draft (after applying cumulative transfers)
  const getSquadAtGameweek = (draftTransfers: Record<number, { transferredOut: any[], completed: any[] }>, targetGW: number): TeamPick[] => {
    if (!teamData?.picks) return [];
    
    // Start with base team
    let squad = [...teamData.picks];
    const nextGWs = getNextGameweeks();
    
    // Apply all completed transfers from GW7 up to and including targetGW
    nextGWs.forEach(gw => {
      if (gw.id <= targetGW) {
        // Try both string and numeric keys for compatibility
        const gwTransfers = draftTransfers[gw.id] || draftTransfers[gw.id.toString() as any];
        
        if (gwTransfers?.completed) {
          gwTransfers.completed.forEach(transfer => {
            squad = squad.map(pick => {
              if (pick.element === transfer.outPlayerId) {
                const inPlayer = getPlayerById(transfer.inPlayerId);
                if (inPlayer) {
                  return {
                    ...pick,
                    element: transfer.inPlayerId,
                    selling_price: inPlayer.now_cost,
                    purchase_price: inPlayer.now_cost,
                  };
                }
              }
              return pick;
            });
          });
        }
      }
    });
    
    return squad;
  };

  // Calculate manual mode points for a draft at a specific gameweek
  const calculateManualPointsForGameweek = (squad: TeamPick[], gameweek: number, projections6GW: any[]): number => {
    if (!projections6GW) return 0;
    
    // Get starting 11 (positions 1-11, more robust than slice)
    const starting11 = squad.filter(pick => pick.position <= 11);
    
    let totalPoints = 0;
    starting11.forEach(pick => {
      const projection = projections6GW.find((p: any) => p.playerId === pick.element);
      const gwPoints = projection?.gameweekProjections?.[gameweek.toString()] || 0;
      
      // Double points for captain
      const multiplier = pick.is_captain ? 2 : 1;
      totalPoints += gwPoints * multiplier;
    });
    
    return totalPoints;
  };

  // Calculate auto mode points for a draft at a specific gameweek
  const calculateAutoPointsForGameweek = (squad: TeamPick[], gameweek: number, projections6GW: any[]): number => {
    if (!projections6GW) return 0;
    
    // Get all 15 players with their projections for this gameweek
    const playersWithPoints = squad.map(pick => {
      const player = getPlayerById(pick.element);
      const playerData = projections6GW.find((p: any) => p.playerId === pick.element);
      const gwPoints = playerData?.gameweekProjections?.[gameweek.toString()] || 0;
      
      return {
        element: pick.element,
        position: player?.element_type || 0,
        projectedPoints: gwPoints
      };
    });
    
    // Group by position and sort by points
    const gkps = playersWithPoints.filter(p => p.position === 1).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const defs = playersWithPoints.filter(p => p.position === 2).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const mids = playersWithPoints.filter(p => p.position === 3).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const fwds = playersWithPoints.filter(p => p.position === 4).sort((a, b) => b.projectedPoints - a.projectedPoints);
    
    // Try all valid formations and find best for this gameweek
    const validFormations = [
      { def: 3, mid: 4, fwd: 3 }, { def: 3, mid: 5, fwd: 2 },
      { def: 4, mid: 3, fwd: 3 }, { def: 4, mid: 4, fwd: 2 },
      { def: 4, mid: 5, fwd: 1 }, { def: 5, mid: 3, fwd: 2 },
      { def: 5, mid: 4, fwd: 1 }, { def: 5, mid: 2, fwd: 3 }
    ];
    
    let bestPoints = 0;
    validFormations.forEach(formation => {
      if (defs.length >= formation.def && mids.length >= formation.mid && fwds.length >= formation.fwd) {
        const selected = [
          gkps[0],
          ...defs.slice(0, formation.def),
          ...mids.slice(0, formation.mid),
          ...fwds.slice(0, formation.fwd)
        ];
        
        const formationPoints = selected.reduce((sum, p) => sum + (p?.projectedPoints || 0), 0);
        
        // Find captain (highest points in starting 11)
        const captain = selected.slice(1).reduce((max, p) => 
          (p?.projectedPoints || 0) > (max?.projectedPoints || 0) ? p : max
        , selected[1]);
        
        const totalWithCaptain = formationPoints + (captain?.projectedPoints || 0);
        
        if (totalWithCaptain > bestPoints) {
          bestPoints = totalWithCaptain;
        }
      }
    });
    
    return bestPoints;
  };

  // Compute a canonical signature for a draft to detect duplicates
  // Signature includes: squad composition at each GW, captain/vice, and transfers
  const computeDraftSignature = (draftTransfers: any, nextGWs: any[]) => {
    const signature: any = {
      gameweeks: {}
    };
    
    nextGWs.forEach(gw => {
      const squad = getSquadAtGameweek(draftTransfers, gw.id);
      // Sort squad by element ID for consistent comparison
      const sortedSquad = squad
        .map(pick => ({
          element: pick.element,
          position: pick.position,
          multiplier: pick.multiplier,
          is_captain: pick.is_captain,
          is_vice_captain: pick.is_vice_captain
        }))
        .sort((a, b) => a.element - b.element);
      
      signature.gameweeks[gw.id] = sortedSquad;
    });
    
    // Include transfers for each gameweek in signature
    signature.transfers = {};
    nextGWs.forEach(gw => {
      const gwTransfers = draftTransfers[gw.id] || { transferredOut: [], completed: [] };
      signature.transfers[gw.id] = {
        transferredOut: [...gwTransfers.transferredOut].sort(),
        completed: [...gwTransfers.completed].sort((a, b) => {
          if (a.playerOut !== b.playerOut) return a.playerOut - b.playerOut;
          return a.playerIn - b.playerIn;
        })
      };
    });
    
    return JSON.stringify(signature);
  };

  // Identify duplicate drafts by comparing signatures
  const identifyDuplicateDrafts = () => {
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return {};
    
    // Map to store signature -> earliest draft with that signature
    const signatureMap = new Map<string, string>();
    const duplicates: Record<string, { isDuplicate: boolean; duplicateOfKey: string }> = {};
    
    // Array of all drafts in creation order (Base first, then saved drafts)
    const allDrafts = [
      { draftKey: 'Base', transfers: {} },
      ...savedDrafts.map((draft: any) => ({
        draftKey: draft.draftLetter,
        transfers: draft.draftLetter === activeDraft ? gameweekTransfers : (draft.gameweekTransfers || {})
      }))
    ];
    
    // Process each draft
    allDrafts.forEach(draft => {
      const signature = computeDraftSignature(draft.transfers, nextGWs);
      
      if (signatureMap.has(signature)) {
        // This is a duplicate
        const originalKey = signatureMap.get(signature)!;
        duplicates[draft.draftKey] = {
          isDuplicate: true,
          duplicateOfKey: originalKey
        };
      } else {
        // First draft with this signature
        signatureMap.set(signature, draft.draftKey);
        duplicates[draft.draftKey] = {
          isDuplicate: false,
          duplicateOfKey: ''
        };
      }
    });
    
    return duplicates;
  };

  // Build comparison data for all drafts with both Manual and Auto modes
  const buildDraftComparisonData = () => {
    if (!teamData?.picks || !playerProjections6GW) return [];
    
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return [];
    
    const comparisonRows: any[] = [];
    
    // Base Draft - Manual mode
    const baseManualRow = {
      draftKey: 'Base',
      mode: 'Manual',
      gameweeks: {} as Record<number, number>,
      total: 0
    };
    
    nextGWs.forEach(gw => {
      const squad = getSquadAtGameweek({}, gw.id); // Empty transfers = base team
      const points = calculateManualPointsForGameweek(squad, gw.id, playerProjections6GW);
      baseManualRow.gameweeks[gw.id] = points;
      baseManualRow.total += points;
    });
    comparisonRows.push(baseManualRow);
    
    // Base Draft - Auto mode
    const baseAutoRow = {
      draftKey: 'Base',
      mode: 'Auto',
      gameweeks: {} as Record<number, number>,
      total: 0
    };
    
    nextGWs.forEach(gw => {
      const squad = getSquadAtGameweek({}, gw.id);
      const points = calculateAutoPointsForGameweek(squad, gw.id, playerProjections6GW);
      baseAutoRow.gameweeks[gw.id] = points;
      baseAutoRow.total += points;
    });
    comparisonRows.push(baseAutoRow);
    
    // All saved drafts - both Manual and Auto modes
    savedDrafts.forEach(draft => {
      // Use current state for active draft, saved data for others
      const draftTransfers = draft.draftLetter === activeDraft ? gameweekTransfers : (draft.gameweekTransfers || {});
      
      // Manual mode row
      const draftManualRow = {
        draftKey: draft.draftLetter,
        mode: 'Manual',
        gameweeks: {} as Record<number, number>,
        total: 0
      };
      
      nextGWs.forEach(gw => {
        const squad = getSquadAtGameweek(draftTransfers, gw.id);
        const points = calculateManualPointsForGameweek(squad, gw.id, playerProjections6GW);
        draftManualRow.gameweeks[gw.id] = points;
        draftManualRow.total += points;
      });
      comparisonRows.push(draftManualRow);
      
      // Auto mode row
      const draftAutoRow = {
        draftKey: draft.draftLetter,
        mode: 'Auto',
        gameweeks: {} as Record<number, number>,
        total: 0
      };
      
      nextGWs.forEach(gw => {
        const squad = getSquadAtGameweek(draftTransfers, gw.id);
        const points = calculateAutoPointsForGameweek(squad, gw.id, playerProjections6GW);
        draftAutoRow.gameweeks[gw.id] = points;
        draftAutoRow.total += points;
      });
      comparisonRows.push(draftAutoRow);
    });
    
    return comparisonRows;
  };

  // Swap a starting 11 player with a bench player
  const swapPlayers = (startingIndex: number, benchIndex: number) => {
    const newLineup = [...manualLineup];
    const temp = newLineup[startingIndex];
    newLineup[startingIndex] = newLineup[11 + benchIndex];
    newLineup[11 + benchIndex] = temp;
    
    // Update positions
    newLineup[startingIndex].position = startingIndex + 1;
    newLineup[11 + benchIndex].position = 11 + benchIndex + 1;
    
    setManualLineup(newLineup);
    toast({
      title: "Players Swapped",
      description: `${getPlayerById(newLineup[startingIndex].element)?.web_name} moved to starting 11`
    });
  };

  // Move bench player up or down (excluding GK)
  const moveBenchPlayer = (benchIndex: number, direction: 'up' | 'down') => {
    if (benchIndex === 0) return; // Can't move GK
    
    const actualIndex = 11 + benchIndex;
    const swapIndex = direction === 'up' ? actualIndex - 1 : actualIndex + 1;
    
    // Don't allow moving past GK or past last bench player
    if (swapIndex === 11 || swapIndex > 14) return;
    
    const newLineup = [...manualLineup];
    const temp = newLineup[actualIndex];
    newLineup[actualIndex] = newLineup[swapIndex];
    newLineup[swapIndex] = temp;
    
    // Update positions
    newLineup[actualIndex].position = actualIndex + 1;
    newLineup[swapIndex].position = swapIndex + 1;
    
    setManualLineup(newLineup);
  };

  // Handle captain selection
  const handleSetCaptain = (playerId: number) => {
    setManualLineup(prev => prev.map(pick => ({
      ...pick,
      is_captain: pick.element === playerId,
      is_vice_captain: pick.is_vice_captain && pick.element !== playerId ? true : false
    })));
  };

  // Handle vice captain selection
  const handleSetViceCaptain = (playerId: number) => {
    setManualLineup(prev => prev.map(pick => ({
      ...pick,
      is_vice_captain: pick.element === playerId,
      is_captain: pick.is_captain && pick.element !== playerId ? true : false
    })));
  };

  // Handle transferring a player out
  const handleTransferOut = (pick: TeamPick) => {
    const player = getPlayerById(pick.element);
    if (!player) return;

    const sellingPrice = getSellingPrice(pick);

    const transferOut: TransferOut = {
      playerId: player.id,
      playerName: player.web_name,
      position: pick.position,
      elementType: player.element_type,
      sellingPrice: sellingPrice,
    };

    const newTransferredOut = [...transferredOutPlayers, transferOut];
    setTransferredOutPlayers(newTransferredOut);
    
    // Save to gameweek-specific storage immediately
    if (selectedGameweek) {
      setGameweekTransfers(gwTransfers => ({
        ...gwTransfers,
        [selectedGameweek]: {
          transferredOut: newTransferredOut,
          completed: completedTransfers
        }
      }));
    }
    
    // Mark player as transferred out instead of removing
    setManualLineup(prev => prev.map(p => 
      p.element === pick.element 
        ? { ...p, is_transferred_out: true }
        : p
    ));

    toast({
      title: "Player Transferred Out",
      description: `${player.web_name} has been transferred out (£${sellingPrice.toFixed(1)}m). Click "Needs Replacement" to select a replacement.`
    });
  };

  // Handle clicking "Needs Replacement" to scroll to projections
  const handleScrollToReplacement = (elementType: number) => {
    // Map element_type to position filter value
    const positionMap: { [key: number]: string } = {
      1: "Goalkeeper",
      2: "Defender",
      3: "Midfielder",
      4: "Forward"
    };
    
    // Set position filter and trigger scroll to projections
    const positionFilter = positionMap[elementType] || "all";
    setProjectionPositionFilter(positionFilter);
    setScrollToProjections(true);
  };

  // Handle transferring a player in
  const handleTransferIn = (playerId: number, playerElementType: number) => {
    const player = getPlayerById(playerId);
    if (!player) return;

    // Check if player is already in the team
    const isAlreadyInTeam = manualLineup.some(pick => 
      pick.element === playerId && !pick.is_transferred_out
    );
    
    if (isAlreadyInTeam) {
      toast({
        title: "Error",
        description: `${player.web_name} is already in your team`,
        variant: "destructive"
      });
      return;
    }

    // Find the matching transferred out player
    const transferOutIndex = transferredOutPlayers.findIndex(
      t => t.elementType === playerElementType
    );

    if (transferOutIndex === -1) {
      toast({
        title: "Error",
        description: "No matching position found for transfer",
        variant: "destructive"
      });
      return;
    }

    const transferredOut = transferredOutPlayers[transferOutIndex];
    const buyingPrice = player.now_cost / 10;

    // Record the completed transfer
    const completedTransfer: CompletedTransfer = {
      outPlayerId: transferredOut.playerId,
      outPlayerName: transferredOut.playerName,
      sellingPrice: transferredOut.sellingPrice,
      inPlayerId: playerId,
      inPlayerName: player.web_name,
      buyingPrice: buyingPrice,
    };

    // Calculate new states
    const newTransfers = [...completedTransfers, completedTransfer];
    const newTransferredOut = transferredOutPlayers.filter((_, i) => i !== transferOutIndex);
    
    // Update all states
    setCompletedTransfers(newTransfers);
    setTransferredOutPlayers(newTransferredOut);
    
    // Save to gameweek-specific storage immediately
    if (selectedGameweek) {
      setGameweekTransfers(gwTransfers => ({
        ...gwTransfers,
        [selectedGameweek]: {
          transferredOut: newTransferredOut,
          completed: newTransfers
        }
      }));
    }

    // Replace the transferred out player at the same position
    setManualLineup(prev => prev.map(p => {
      if (p.position === transferredOut.position && p.is_transferred_out) {
        return {
          element: playerId,
          position: transferredOut.position,
          multiplier: 1,
          is_captain: false,
          is_vice_captain: false,
          selling_price: player.now_cost,
          purchase_price: player.now_cost, // Set purchase price to current price for new transfers
          is_transferred_out: false,
        };
      }
      return p;
    }));

    toast({
      title: "Player Transferred In",
      description: `${player.web_name} has been added to your team (£${buyingPrice.toFixed(1)}m)`
    });

    // If in Auto mode, trigger re-optimization with the updated lineup
    if (plannerMode === "auto") {
      // Need to wait for state updates to complete, then re-optimize
      setTimeout(() => {
        optimizeMutation.mutate();
      }, 50);
    }

    // Scroll back to team lineup to see the new player
    setTimeout(() => {
      if (teamLineupRef.current) {
        teamLineupRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, plannerMode === "auto" ? 500 : 100); // Wait longer in auto mode for optimization to complete

    // Auto-save draft after transfer in ONLY if all positions are filled (no empty slots)
    if (activeDraft !== "Base" && newTransferredOut.length === 0) {
      setTimeout(() => saveCurrentDraft(), 200);
    }
  };

  // Reset all transfers for the current gameweek and restore baseline
  const handleResetTransfers = () => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Get the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    setManualLineup(baseline);
    
    // Clear transfers for this gameweek
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    
    // Clear from gameweek-specific storage
    setGameweekTransfers(gwTransfers => ({
      ...gwTransfers,
      [selectedGameweek]: {
        transferredOut: [],
        completed: []
      }
    }));
    
    toast({
      title: "Transfers Reset",
      description: "All transfers for this gameweek have been undone."
    });
  };

  // Reset all transfers across all gameweeks
  const handleResetAllTransfers = () => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Reset to original team data
    setManualLineup([...teamData.picks]);
    
    // Clear all transfer data
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    setGameweekTransfers({});
    
    toast({
      title: "All Transfers Reset",
      description: "All transfers across all gameweeks have been undone."
    });
  };

  // Undo a specific transfer and restore the baseline player
  const handleUndoTransfer = (position: number) => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Get the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    const baselinePick = baseline.find(p => p.position === position);
    if (!baselinePick) return;
    
    const baselinePlayer = getPlayerById(baselinePick.element);
    if (!baselinePlayer) return;
    
    // Restore the baseline player at this position
    setManualLineup(prev => prev.map(p => {
      if (p.position === position) {
        return { ...baselinePick };
      }
      return p;
    }));
    
    // Update transferred out list
    const newTransferredOut = transferredOutPlayers.filter(t => t.position !== position);
    setTransferredOutPlayers(newTransferredOut);
    
    // Remove any completed transfer related to this position
    const transferOutEntry = transferredOutPlayers.find(t => t.position !== position);
    const newCompletedTransfers = completedTransfers.filter(t => 
      !transferredOutPlayers.some(to => to.playerId === t.outPlayerId && to.position === position)
    );
    setCompletedTransfers(newCompletedTransfers);
    
    // Update gameweek-specific storage
    setGameweekTransfers(gwTransfers => ({
      ...gwTransfers,
      [selectedGameweek]: {
        transferredOut: newTransferredOut,
        completed: newCompletedTransfers
      }
    }));
    
    toast({
      title: "Transfer Undone",
      description: `${baselinePlayer.web_name} has been restored to your team`
    });
  };

  // Draft management functions
  const loadDrafts = async () => {
    if (!searchedId) return;
    try {
      const response = await fetch(`/api/transfer-planner/drafts/${searchedId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    }
  };

  const saveCurrentDraft = async () => {
    if (!searchedId || activeDraft === "Base") return;

    try {
      const response = await fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: activeDraft,
          gameweekTransfers,
          mode: plannerMode,
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0)
        })
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        toast({ title: "Draft Saved", description: `Draft ${activeDraft} saved successfully` });
        await loadDrafts();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
    }
  };

  const switchToDraft = async (draftLetter: string) => {
    if (draftLetter === "Base") {
      // Switch to Base Draft - reset to original team
      setGameweekTransfers({});
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      setActiveDraft("Base");
      setHasUnsavedChanges(false);
      if (teamData?.picks) {
        setManualLineup([...teamData.picks]);
      }
      toast({ title: "Base Draft", description: "Switched to base team (no transfers)" });
    } else {
      try {
        const response = await fetch(`/api/transfer-planner/drafts/${searchedId}/${draftLetter}`);
        if (response.ok) {
          const data = await response.json();
          const draft = data.draft;
          
          setGameweekTransfers(draft.gameweekTransfers);
          setPlannerMode(draft.mode);
          setActiveDraft(draftLetter);
          setHasUnsavedChanges(false);
          
          toast({ title: "Draft Loaded", description: `Switched to Draft ${draftLetter}` });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load draft", variant: "destructive" });
      }
    }
  };

  const createNewDraft = () => {
    // Find next available letter
    const usedLetters = savedDrafts.map(d => d.draftLetter);
    const allLetters = 'ABCDE'.split('');
    const nextLetter = allLetters.find(l => !usedLetters.includes(l));
    
    if (!nextLetter) {
      toast({ title: "Limit Reached", description: "Maximum 5 drafts allowed (A-E). Delete a draft to create a new one.", variant: "destructive" });
      return;
    }

    if (!searchedId) {
      toast({ title: "Error", description: "Manager ID not found", variant: "destructive" });
      return;
    }

    // Reset to Base Draft state
    const emptyGameweekTransfers = {};
    setGameweekTransfers(emptyGameweekTransfers);
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    setActiveDraft(nextLetter);
    if (teamData?.picks) {
      setManualLineup([...teamData.picks]);
    }
    
    // Auto-save the new draft immediately
    fetch("/api/transfer-planner/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: parseInt(searchedId),
        draftLetter: nextLetter,
        gameweekTransfers: emptyGameweekTransfers,
        mode: plannerMode,
        teamBank: teamData?.entry?.bank || 0,
        teamValue: teamData?.entry?.value || 0,
        totalProjectedPoints: 0,
        totalTransfersUsed: 0
      })
    }).then(response => {
      if (response.ok) {
        setHasUnsavedChanges(false);
        loadDrafts();
        toast({ title: "Draft Created & Saved", description: `Draft ${nextLetter} created from base team` });
      }
    }).catch(() => {
      setHasUnsavedChanges(true);
      toast({ title: "Draft Created", description: `Draft ${nextLetter} created (save manually)` });
    });
  };

  const duplicateCurrentDraft = async () => {
    if (activeDraft === "Base") {
      toast({ title: "Cannot Duplicate", description: "Create a new draft instead", variant: "destructive" });
      return;
    }

    const usedLetters = savedDrafts.map(d => d.draftLetter);
    const allLetters = 'ABCDEFGHIJ'.split('');
    const nextLetter = allLetters.find(l => !usedLetters.includes(l));
    
    if (!nextLetter) {
      toast({ title: "Limit Reached", description: "Maximum 10 drafts allowed (A-J)", variant: "destructive" });
      return;
    }

    // Save current transfers as the new draft
    try {
      const response = await fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: nextLetter,
          gameweekTransfers,
          mode: plannerMode,
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0)
        })
      });

      if (response.ok) {
        setActiveDraft(nextLetter);
        setHasUnsavedChanges(false);
        await loadDrafts();
        toast({ title: "Draft Duplicated", description: `Draft ${activeDraft} copied to Draft ${nextLetter}` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate draft", variant: "destructive" });
    }
  };

  const deleteCurrentDraft = async () => {
    if (activeDraft === "Base") {
      toast({ title: "Cannot Delete", description: "Base draft cannot be deleted", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/transfer-planner/drafts/${searchedId}/${activeDraft}`, {
        method: "DELETE"
      });

      if (response.ok) {
        // Switch to Base Draft
        switchToDraft("Base");
        await loadDrafts();
        toast({ title: "Draft Deleted", description: `Draft ${activeDraft} has been deleted` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" });
    }
  };

  const deleteAllDrafts = async () => {
    if (!searchedId) return;

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete all ${savedDrafts.length} draft(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/transfer-planner/drafts/${searchedId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        switchToDraft("Base");
        setSavedDrafts([]);
        toast({ title: "All Drafts Deleted", description: "All saved drafts have been deleted" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete all drafts", variant: "destructive" });
    }
  };

  const saveAllDrafts = async () => {
    if (!searchedId || savedDrafts.length === 0) return;

    const currentTransfers = gameweekTransfers;
    const currentMode = plannerMode;
    const currentBank = calculateBankAfterTransfers();
    const totalTransfers = Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0);

    try {
      // Save to all existing drafts
      const savePromises = savedDrafts.map(draft => 
        fetch("/api/transfer-planner/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managerId: parseInt(searchedId),
            draftLetter: draft.draftLetter,
            gameweekTransfers: currentTransfers,
            mode: currentMode,
            teamBank: currentBank,
            teamValue: 0,
            totalProjectedPoints: 0,
            totalTransfersUsed: totalTransfers
          })
        })
      );

      await Promise.all(savePromises);
      setHasUnsavedChanges(false);
      await loadDrafts();
      toast({ title: "All Drafts Saved", description: `Saved current plan to ${savedDrafts.length} draft(s)` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save all drafts", variant: "destructive" });
    }
  };

  // Auto-save to Draft A when first transfer is made
  useEffect(() => {
    const hasTransfers = Object.values(gameweekTransfers).some(gw => 
      gw.completed.length > 0 || gw.transferredOut.length > 0
    );

    if (hasTransfers && activeDraft === "Base" && searchedId) {
      // Auto-create and save Draft A
      setActiveDraft("A");
      
      // Auto-save Draft A immediately
      fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: "A",
          gameweekTransfers,
          mode: plannerMode,
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0)
        })
      }).then(response => {
        if (response.ok) {
          setHasUnsavedChanges(false);
          loadDrafts();
          toast({ title: "Draft A Created & Saved", description: "Your transfers are now in Draft A" });
        }
      }).catch(() => {
        setHasUnsavedChanges(true);
        toast({ title: "Draft A Created", description: "Your transfers are now in Draft A (save manually)" });
      });
    } else if (hasTransfers && activeDraft !== "Base") {
      setHasUnsavedChanges(true);
    }
  }, [gameweekTransfers]);

  // Load drafts when manager changes
  useEffect(() => {
    if (searchedId) {
      loadDrafts();
      setActiveDraft("Base");
    }
  }, [searchedId]);

  // Check if there are empty slots (transferred out players)
  const hasEmptySlots = manualLineup.some(pick => pick.is_transferred_out);

  const nextGameweeks = getNextGameweeks();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
          <Target className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Transfer Planner</h1>
          <p className="text-muted-foreground">Plan your transfers and optimize your team</p>
        </div>
      </div>

      {/* Manager ID Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manager ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter FPL Manager ID"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              data-testid="input-manager-id"
            />
            <Button 
              onClick={handleSearch}
              data-testid="button-search-manager"
            >
              Load Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Draft Management */}
      {searchedId && teamData && selectedGameweek && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-purple-600" />
                Draft Management
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-muted-foreground">
                  Active: <span className="font-bold text-purple-600">{activeDraft === "Base" ? "Base Draft" : `Draft ${activeDraft}`}</span>
                  {hasUnsavedChanges && activeDraft !== "Base" && <span className="ml-2 text-orange-600">●</span>}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Draft Controls */}
            <div className="flex gap-2 flex-wrap">
              {/* Switch to Base */}
              <Button
                onClick={() => switchToDraft("Base")}
                size="sm"
                variant={activeDraft === "Base" ? "default" : "outline"}
                className="gap-1"
                data-testid="button-switch-base"
              >
                Base
              </Button>

              {/* Saved Drafts */}
              {savedDrafts.map((draft: any) => (
                <Button
                  key={draft.draftLetter}
                  onClick={() => switchToDraft(draft.draftLetter)}
                  size="sm"
                  variant={activeDraft === draft.draftLetter ? "default" : "outline"}
                  data-testid={`button-switch-draft-${draft.draftLetter}`}
                >
                  {draft.draftLetter}
                </Button>
              ))}

              {/* New Draft Button */}
              {savedDrafts.length < 5 && (
                <Button
                  onClick={createNewDraft}
                  size="sm"
                  variant="outline"
                  className="gap-1 border-dashed"
                  data-testid="button-new-draft"
                >
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            {activeDraft !== "Base" && (
              <div className="flex gap-2 flex-wrap pt-2 border-t">
                <Button
                  onClick={saveCurrentDraft}
                  size="sm"
                  variant="default"
                  disabled={!hasUnsavedChanges}
                  data-testid="button-save-draft"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Draft {activeDraft} {hasUnsavedChanges && "●"}
                </Button>
                
                <Button
                  onClick={duplicateCurrentDraft}
                  size="sm"
                  variant="outline"
                  data-testid="button-duplicate-draft"
                >
                  Duplicate Draft {activeDraft}
                </Button>
                
                <Button
                  onClick={deleteCurrentDraft}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                  data-testid="button-delete-draft"
                >
                  Delete Draft {activeDraft}
                </Button>
              </div>
            )}

            {activeDraft === "Base" && (
              <div className="text-sm text-muted-foreground">
                Base Draft shows your current team with no transfers. Make a transfer to automatically create Draft A.
              </div>
            )}

            {/* Bulk Actions */}
            {savedDrafts.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2 border-t">
                <Button
                  onClick={saveAllDrafts}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                  data-testid="button-save-all-drafts"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save All Drafts
                </Button>
                
                <Button
                  onClick={deleteAllDrafts}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                  data-testid="button-delete-all-drafts"
                >
                  Delete All Drafts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft Comparison Table */}
      {searchedId && teamData && playerProjections6GW && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Draft Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const comparisonData = buildDraftComparisonData();
              const nextGWs = getNextGameweeks();
              
              if (comparisonData.length === 0 || nextGWs.length === 0) {
                return <p className="text-muted-foreground text-sm">No comparison data available</p>;
              }
              
              // Find the maximum total points
              const maxTotal = Math.max(...comparisonData.map(row => row.total));
              
              // Identify duplicate drafts
              const duplicateInfo = identifyDuplicateDrafts();
              
              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold" data-testid="header-draft">Draft</th>
                        {nextGWs.map(gw => (
                          <th key={gw.id} className="text-center p-2 font-semibold" data-testid={`header-gw${gw.id}`}>
                            GW{gw.id}
                          </th>
                        ))}
                        <th className="text-center p-2 font-semibold bg-blue-50 dark:bg-blue-950/20" data-testid="header-total">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((row, idx) => {
                        const isMaxTotal = row.total === maxTotal;
                        const isDuplicate = row.mode === 'Manual' && duplicateInfo[row.draftKey]?.isDuplicate;
                        const duplicateOf = duplicateInfo[row.draftKey]?.duplicateOfKey;
                        
                        return (
                          <tr 
                            key={`${row.draftKey}-${row.mode}`} 
                            className={`border-b hover:bg-gray-50 dark:hover:bg-gray-900 ${
                              isMaxTotal ? 'bg-green-100 dark:bg-green-950/20 border-2 border-green-500' : 
                              row.draftKey === activeDraft && row.mode === 'Manual' ? 'bg-blue-50 dark:bg-blue-950/10' : 
                              row.mode === 'Auto' ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                            }`}
                            data-testid={`row-${row.draftKey}-${row.mode.toLowerCase()}`}
                          >
                            <td className="p-2 font-medium" data-testid={`cell-draft-${row.draftKey}`}>
                              <div className="flex items-center gap-2">
                                <span>{row.draftKey}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  row.mode === 'Manual' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                }`}>
                                  {row.mode}
                                </span>
                                {row.draftKey === activeDraft && row.mode === 'Manual' && <span className="text-blue-600">●</span>}
                                
                                {isDuplicate && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs border-orange-400 text-orange-700 bg-orange-50 dark:bg-orange-950/20 flex items-center gap-1"
                                          data-testid={`badge-duplicate-${row.draftKey}`}
                                        >
                                          <Copy className="h-3 w-3" />
                                          Duplicate of {duplicateOf}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>This draft matches Draft {duplicateOf} exactly across lineup, captain, and transfers.</p>
                                        <p className="text-xs mt-1">You can delete it.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                
                                {isDuplicate && row.draftKey !== 'Base' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(`/api/transfer-planner/drafts/${searchedId}/${row.draftKey}`, {
                                          method: "DELETE"
                                        });
                                        if (response.ok) {
                                          if (activeDraft === row.draftKey) {
                                            switchToDraft("Base");
                                          }
                                          await loadDrafts();
                                          toast({ title: "Draft Deleted", description: `Duplicate Draft ${row.draftKey} has been deleted` });
                                        }
                                      } catch (error) {
                                        toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" });
                                      }
                                    }}
                                    data-testid={`button-delete-duplicate-${row.draftKey}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          {nextGWs.map(gw => (
                            <td 
                              key={gw.id} 
                              className="text-center p-2 text-sm"
                              data-testid={`cell-${row.draftKey}-gw${gw.id}`}
                            >
                              {row.gameweeks[gw.id]?.toFixed(1) || '0.0'}
                            </td>
                          ))}
                          <td 
                            className="text-center p-2 font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                            data-testid={`cell-${row.draftKey}-total`}
                          >
                            {row.total.toFixed(1)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            
            <div className="mt-4 text-xs text-muted-foreground">
              <p>● = Currently active draft (Manual mode)</p>
              <p><strong>Manual:</strong> Projected points based on your saved lineup and transfers.</p>
              <p><strong>Auto:</strong> Optimized lineup with best formation and captain for maximum points.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gameweek Selection */}
      {searchedId && teamData && (
        <Card>
          <CardContent className="pt-6">
            <div>
              <div className="text-sm font-medium mb-2">Select GW</div>
              <div className="flex gap-2">
                {nextGameweeks.map(gw => (
                  <Button
                    key={gw.id}
                    variant={selectedGameweek === gw.id ? "default" : "outline"}
                    size="lg"
                    className="text-lg font-semibold"
                    onClick={() => setSelectedGameweek(gw.id)}
                    data-testid={`gw-button-${gw.id}`}
                  >
                    {gw.id}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Summary Stats */}
      {searchedId && teamData && selectedGameweek && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Team Summary
              </div>
              <div className="flex gap-2">
                {(completedTransfers.length > 0 || transferredOutPlayers.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetTransfers}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    data-testid="button-reset-gw-transfers"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Undo This GW
                  </Button>
                )}
                {Object.keys(gameweekTransfers).some(gw => 
                  gameweekTransfers[parseInt(gw)]?.completed?.length > 0 || 
                  gameweekTransfers[parseInt(gw)]?.transferredOut?.length > 0
                ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetAllTransfers}
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                    data-testid="button-reset-all-transfers"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Undo All GWs
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {/* Total Projected Points for Selected GW */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">GW {selectedGameweek} Projected Points</div>
                <div className="text-2xl font-bold text-green-600">
                  {(() => {
                    let total = 0;
                    if (plannerMode === "manual") {
                      // Get starting 11 from manual lineup
                      manualLineup.slice(0, 11).forEach((pick: TeamPick) => {
                        const points = getPlayerProjectedPoints(pick.element);
                        if (points !== null) {
                          // Apply captain multiplier (2x for captain)
                          const multiplier = pick.is_captain ? 2 : 1;
                          total += points * multiplier;
                        }
                      });
                    } else if (optimizedLineup) {
                      // Get starting 11 from optimized lineup
                      optimizedLineup.starting11.forEach((pick: any) => {
                        const points = getPlayerProjectedPoints(pick.element);
                        if (points !== null) {
                          // Apply captain multiplier (2x for captain)
                          const multiplier = pick.isCaptain ? 2 : 1;
                          total += points * multiplier;
                        }
                      });
                    }
                    return total.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Total Projected Points for Next 6 GWs */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">
                  {nextGameweeks.length > 0 
                    ? `GW ${nextGameweeks[0].id}-${nextGameweeks[nextGameweeks.length - 1].id} Projected Points`
                    : 'Next 6 GWs Projected Points'}
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {(() => {
                    if (!playerProjections6GW || !teamData?.picks) return '0.0';
                    
                    let grandTotal = 0;
                    const nextGWs = nextGameweeks.map(gw => gw.id);
                    
                    // For each gameweek, calculate the optimal lineup's points for THAT specific gameweek
                    nextGWs.forEach(gw => {
                      // Get the lineup for this specific gameweek (with cumulative transfers applied)
                      const lineupForGW = getBaselineLineup(gw);
                      
                      if (plannerMode === "auto") {
                        // For auto mode: simulate auto-optimization for THIS specific gameweek
                        // Get all 15 players with their projections for this gameweek
                        const playersWithPoints = lineupForGW.map(pick => {
                          const player = getPlayerById(pick.element);
                          const playerData = playerProjections6GW.find((p: any) => p.playerId === pick.element);
                          const gwPoints = playerData?.gameweekProjections?.[gw.toString()] || 0;
                          
                          return {
                            element: pick.element,
                            position: player?.element_type || 0,
                            projectedPoints: gwPoints
                          };
                        });
                        
                        // Group by position
                        const gkps = playersWithPoints.filter(p => p.position === 1).sort((a, b) => b.projectedPoints - a.projectedPoints);
                        const defs = playersWithPoints.filter(p => p.position === 2).sort((a, b) => b.projectedPoints - a.projectedPoints);
                        const mids = playersWithPoints.filter(p => p.position === 3).sort((a, b) => b.projectedPoints - a.projectedPoints);
                        const fwds = playersWithPoints.filter(p => p.position === 4).sort((a, b) => b.projectedPoints - a.projectedPoints);
                        
                        // Try all valid formations and find best for this gameweek
                        const validFormations = [
                          { def: 3, mid: 4, fwd: 3 }, { def: 3, mid: 5, fwd: 2 },
                          { def: 4, mid: 3, fwd: 3 }, { def: 4, mid: 4, fwd: 2 },
                          { def: 4, mid: 5, fwd: 1 }, { def: 5, mid: 3, fwd: 2 },
                          { def: 5, mid: 4, fwd: 1 }, { def: 5, mid: 2, fwd: 3 }
                        ];
                        
                        let bestPoints = 0;
                        validFormations.forEach(formation => {
                          if (defs.length >= formation.def && mids.length >= formation.mid && fwds.length >= formation.fwd) {
                            const starting11 = [
                              gkps[0],
                              ...defs.slice(0, formation.def),
                              ...mids.slice(0, formation.mid),
                              ...fwds.slice(0, formation.fwd)
                            ].filter(Boolean);
                            
                            const formationPoints = starting11.reduce((sum, p) => sum + p.projectedPoints, 0);
                            // Add captain bonus (best player gets 2x)
                            const captain = starting11.reduce((best, p) => p.projectedPoints > best.projectedPoints ? p : best, starting11[0]);
                            const totalWithCaptain = formationPoints + (captain?.projectedPoints || 0);
                            
                            if (totalWithCaptain > bestPoints) {
                              bestPoints = totalWithCaptain;
                            }
                          }
                        });
                        
                        grandTotal += bestPoints;
                      } else {
                        // For manual mode: use the manual lineup for this gameweek
                        lineupForGW.slice(0, 11).forEach(pick => {
                          const playerData = playerProjections6GW.find((p: any) => p.playerId === pick.element);
                          const gwPoints = playerData?.gameweekProjections?.[gw.toString()] || 0;
                          // Apply captain multiplier if this is the selected GW
                          const multiplier = (gw === selectedGameweek && pick.is_captain) ? 2 : 1;
                          grandTotal += gwPoints * multiplier;
                        });
                      }
                    });
                    
                    return grandTotal.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Initial Cash in Bank */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Initial Cash in Bank</div>
                <div className={`text-2xl font-bold ${calculateInitialBank() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  £{calculateInitialBank().toFixed(1)}m
                </div>
              </div>

              {/* Cash in Bank After Transfers */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Cash After Transfers</div>
                <div className={`text-2xl font-bold ${calculateBankAfterTransfers() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  £{calculateBankAfterTransfers().toFixed(1)}m
                </div>
                {calculateBankAfterTransfers() < 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    These transfers may not be possible. But it depends on your actual sell value of the transferred out players.
                  </div>
                )}
              </div>

              {/* Initial Transfers Available */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Initial Transfers Available</div>
                <div className="text-2xl font-bold text-purple-600">
                  {calculateInitialTransfers()}
                </div>
              </div>

              {/* Transfers Used */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Transfers Used</div>
                <div className={`text-2xl font-bold ${calculateTransfersRemaining() < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {calculateTransfersUsed()}
                </div>
              </div>

              {/* Transfers Remaining */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Transfers Remaining</div>
                <div className={`text-2xl font-bold ${calculateTransfersRemaining() < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {calculateTransfersRemaining()}
                </div>
                {calculateTransfersRemaining() < 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    This will result in {Math.abs(calculateTransfersRemaining()) * 4} points penalty
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planning Mode Selection */}
      {searchedId && teamData && (
        <Card>
          <CardContent className="pt-6">
            <div>
              <div className="text-sm font-medium mb-2">Planning Mode</div>
              <div className="flex gap-2">
                <Button
                  variant={plannerMode === "manual" ? "default" : "outline"}
                  size="lg"
                  className="flex-1"
                  onClick={() => setPlannerMode("manual")}
                  data-testid="mode-button-manual"
                >
                  Manual lineup
                </Button>
                <Button
                  variant={plannerMode === "auto" ? "default" : "outline"}
                  size="lg"
                  className="flex-1"
                  onClick={() => setPlannerMode("auto")}
                  data-testid="mode-button-auto"
                >
                  Auto lineup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Selection Section */}
      {searchedId && teamData && selectedGameweek && plannerMode === "manual" && (
        <Card ref={teamLineupRef} className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Manual Team Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-4 italic">
              * Sell prices shown are approximate values and may not reflect exact FPL prices
            </div>
            <div className="space-y-6">
              {/* Current Starting 11 */}
              <div>
                {(() => {
                  // Calculate formation from starting 11
                  const starting11 = manualLineup.slice(0, 11).map(pick => getPlayerById(pick.element)).filter(Boolean);
                  const defs = starting11.filter(p => p!.element_type === 2).length;
                  const mids = starting11.filter(p => p!.element_type === 3).length;
                  const fwds = starting11.filter(p => p!.element_type === 4).length;
                  const formation = `${defs}-${mids}-${fwds}`;
                  
                  return (
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Starting 11 
                      <span className="text-sm font-normal text-muted-foreground">({formation})</span>
                    </h3>
                  );
                })()}
                <div className="space-y-4">
                  {/* Group players by position */}
                  {[1, 2, 3, 4].map(posType => {
                    const positionPlayers = manualLineup.slice(0, 11).filter(pick => {
                      const player = getPlayerById(pick.element);
                      return player?.element_type === posType;
                    });
                    
                    if (positionPlayers.length === 0) return null;
                    
                    return (
                      <div key={posType}>
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                          {posType === 1 ? 'Goalkeepers' : posType === 2 ? 'Defenders' : posType === 3 ? 'Midfielders' : 'Forwards'}
                        </div>
                        <div className="grid gap-2">
                          {positionPlayers.map((pick) => {
                            const player = getPlayerById(pick.element);
                            const projectedPoints = getPlayerProjectedPoints(pick.element);
                            if (!player) return null;
                            const actualIndex = manualLineup.findIndex(p => p.position === pick.position);
                    
                            // Check if this is an empty slot (transferred out)
                            if (pick.is_transferred_out) {
                              return (
                                <div
                                  key={`empty-${pick.position}`}
                                  className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20"
                                  data-testid={`empty-slot-${pick.position}`}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex-1">
                                      <div className="font-medium text-red-600">Empty Slot</div>
                                      <div className="text-sm text-muted-foreground">
                                        {getPositionName(player.element_type)} • Click "Needs Replacement" to find a player
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {plannerMode === "manual" && (
                                      <div 
                                        className="text-sm text-red-600 font-medium bg-red-100 dark:bg-red-900 px-3 py-1 rounded cursor-pointer hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                        onClick={() => handleScrollToReplacement(player.element_type)}
                                        data-testid={`needs-replacement-${pick.position}`}
                                      >
                                        Needs Replacement
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUndoTransfer(pick.position)}
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                      data-testid={`undo-transfer-${pick.position}`}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-1" />
                                      Undo
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div
                                key={pick.element}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                  pick.is_captain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                                  pick.is_vice_captain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                                  isPlayerTransferredIn(pick) ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                                  'border-gray-200'
                                }`}
                                data-testid={`starting-player-${pick.element}`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="flex-1">
                                    <div className="font-medium flex items-center gap-2">
                                      {player.web_name}
                                      {isPlayerTransferredIn(pick) && (
                                        <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">NEW</span>
                                      )}
                                      {pick.is_captain && (
                                        <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">C</span>
                                      )}
                                      {pick.is_vice_captain && (
                                        <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">VC</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {getTeamName(player.team)} • {getPositionName(player.element_type)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {editingBuyPrice === pick.element ? (
                                        <div className="flex items-center gap-2">
                                          <span>Buy: £</span>
                                          <Input
                                            type="number"
                                            step="0.1"
                                            min="4.0"
                                            max="15.0"
                                            value={editBuyPriceValue}
                                            onChange={(e) => setEditBuyPriceValue(e.target.value)}
                                            className="h-6 w-16 text-xs"
                                            autoFocus
                                            data-testid={`input-buy-price-${pick.element}`}
                                          />
                                          <span>m</span>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-5 w-5 text-green-600 hover:bg-green-50"
                                            onClick={() => {
                                              const price = parseFloat(editBuyPriceValue);
                                              if (!isNaN(price) && price >= 4.0 && price <= 15.0) {
                                                updateBuyPrice(pick.element, price);
                                              }
                                            }}
                                            data-testid={`button-save-buy-price-${pick.element}`}
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-5 w-5 text-red-600 hover:bg-red-50"
                                            onClick={cancelEditingBuyPrice}
                                            data-testid={`button-cancel-buy-price-${pick.element}`}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex gap-3 items-center">
                                          <span>Buy: £{((pick.purchase_price || player.now_cost) / 10).toFixed(1)}m</span>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-4 w-4 p-0 hover:bg-blue-50"
                                            onClick={() => startEditingBuyPrice(pick.element, pick.purchase_price || player.now_cost)}
                                            data-testid={`button-edit-buy-price-${pick.element}`}
                                          >
                                            <Edit2 className="h-3 w-3 text-blue-600" />
                                          </Button>
                                          <span>Current: £{(player.now_cost / 10).toFixed(1)}m</span>
                                          <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    {projectedPoints !== null ? (
                                      <>
                                        <div className="font-bold text-blue-600">{projectedPoints.toFixed(2)} pts</div>
                                        {pick.is_captain && (
                                          <div className="text-xs text-muted-foreground">({(projectedPoints * 2).toFixed(2)} with (C))</div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">No projection</div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {!pick.is_captain && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                                        onClick={() => handleSetCaptain(pick.element)}
                                        data-testid={`set-captain-${pick.element}`}
                                        title="Set as Captain"
                                      >
                                        <Crown className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {!pick.is_vice_captain && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                        onClick={() => handleSetViceCaptain(pick.element)}
                                        data-testid={`set-vice-${pick.element}`}
                                        title="Set as Vice Captain"
                                      >
                                        <Crown className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Select onValueChange={(value) => swapPlayers(actualIndex, parseInt(value))}>
                                      <SelectTrigger className="h-8 w-8 p-0 border-0 hover:bg-gray-100" data-testid={`swap-${pick.element}`} title="Swap with bench">
                                        <ArrowUpDown className="h-4 w-4" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {manualLineup.slice(11, 15).map((benchPick, benchIndex) => {
                                          const benchPlayer = getPlayerById(benchPick.element);
                                          return (
                                            <SelectItem key={benchPick.element} value={benchIndex.toString()}>
                                              {benchPlayer?.web_name}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    {plannerMode === "manual" && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleTransferOut(pick)}
                                        data-testid={`transfer-out-${pick.element}`}
                                        title="Transfer Out"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Bench */}
              <div>
                <h3 className="font-semibold mb-3">Bench (Current Order)</h3>
                <div className="grid gap-2">
                  {manualLineup.slice(11, 15).map((pick, index) => {
                    const player = getPlayerById(pick.element);
                    const projectedPoints = getPlayerProjectedPoints(pick.element);
                    const isGK = player?.element_type === 1;
                    if (!player) return null;
                    
                    // Check if this is an empty slot (transferred out)
                    if (pick.is_transferred_out) {
                      return (
                        <div
                          key={`empty-bench-${pick.position}`}
                          className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20"
                          data-testid={`empty-slot-bench-${pick.position}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xs font-bold text-red-600 bg-red-200 dark:bg-red-700 px-2 py-1 rounded">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium text-red-600">Empty Slot</div>
                              <div className="text-sm text-muted-foreground">
                                {getPositionName(player.element_type)} • Click "Needs Replacement" to find a player
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {plannerMode === "manual" && (
                              <div 
                                className="text-sm text-red-600 font-medium bg-red-100 dark:bg-red-900 px-3 py-1 rounded cursor-pointer hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                onClick={() => handleScrollToReplacement(player.element_type)}
                                data-testid={`needs-replacement-bench-${pick.position}`}
                              >
                                Needs Replacement
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndoTransfer(pick.position)}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              data-testid={`undo-transfer-bench-${pick.position}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Undo
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={pick.element}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          isPlayerTransferredIn(pick) 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                            : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                        }`}
                        data-testid={`bench-player-${pick.element}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xs font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {player.web_name}
                              {isPlayerTransferredIn(pick) && (
                                <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">NEW</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getTeamName(player.team)} • {getPositionName(player.element_type)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {editingBuyPrice === pick.element ? (
                                <div className="flex items-center gap-2">
                                  <span>Buy: £</span>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="4.0"
                                    max="15.0"
                                    value={editBuyPriceValue}
                                    onChange={(e) => setEditBuyPriceValue(e.target.value)}
                                    className="h-6 w-16 text-xs"
                                    autoFocus
                                    data-testid={`input-buy-price-${pick.element}`}
                                  />
                                  <span>m</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5 text-green-600 hover:bg-green-50"
                                    onClick={() => {
                                      const price = parseFloat(editBuyPriceValue);
                                      if (!isNaN(price) && price >= 4.0 && price <= 15.0) {
                                        updateBuyPrice(pick.element, price);
                                      }
                                    }}
                                    data-testid={`button-save-buy-price-${pick.element}`}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5 text-red-600 hover:bg-red-50"
                                    onClick={cancelEditingBuyPrice}
                                    data-testid={`button-cancel-buy-price-${pick.element}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-3 items-center">
                                  <span>Buy: £{((pick.purchase_price || player.now_cost) / 10).toFixed(1)}m</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-4 w-4 p-0 hover:bg-blue-50"
                                    onClick={() => startEditingBuyPrice(pick.element, pick.purchase_price || player.now_cost)}
                                    data-testid={`button-edit-buy-price-${pick.element}`}
                                  >
                                    <Edit2 className="h-3 w-3 text-blue-600" />
                                  </Button>
                                  <span>Current: £{(player.now_cost / 10).toFixed(1)}m</span>
                                  <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-muted-foreground">
                            {projectedPoints !== null ? `${projectedPoints.toFixed(2)} pts` : 'No projection'}
                          </div>
                          {!isGK && (
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => moveBenchPlayer(index, 'up')}
                                disabled={index === 1}
                                data-testid={`move-up-${pick.element}`}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => moveBenchPlayer(index, 'down')}
                                disabled={index === 3}
                                data-testid={`move-down-${pick.element}`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {plannerMode === "manual" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleTransferOut(pick)}
                              data-testid={`bench-transfer-out-${pick.element}`}
                              title="Transfer Out"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Projected Points */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {manualLineup
                      .slice(0, 11)
                      .reduce((total, pick) => {
                        const projectedPoints = getPlayerProjectedPoints(pick.element);
                        const multiplier = pick.is_captain ? 2 : 1;
                        return total + (projectedPoints || 0) * multiplier;
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Optimization Section */}
      {searchedId && teamData && selectedGameweek && plannerMode === "auto" && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Auto-Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {optimizeMutation.isPending && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-muted-foreground">Optimizing your team...</p>
              </div>
            )}

            {optimizedLineup && !optimizeMutation.isPending && (
              <div className="mt-6 space-y-6">
                <div className="text-xs text-muted-foreground mb-4 italic">
                  * Sell prices shown are approximate values and may not reflect exact FPL prices
                </div>
                {/* Formation and Points Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Formation</div>
                    <div className="text-2xl font-bold text-purple-600">{optimizedLineup.formation}</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Projected Points</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {(() => {
                        // Find captain and add the captain bonus (captain scores double)
                        const captain = optimizedLineup.starting11.find(p => p.isCaptain);
                        const captainBonus = captain ? captain.projectedPoints : 0;
                        const totalWithCaptain = optimizedLineup.totalProjectedPoints + captainBonus;
                        return totalWithCaptain.toFixed(2);
                      })()}
                    </div>
                  </div>
                </div>

                {/* Starting 11 */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    Starting 11
                    <span className="text-sm font-normal text-muted-foreground">({optimizedLineup.formation})</span>
                  </h3>
                  <div className="space-y-4">
                    {/* Group players by position */}
                    {[1, 2, 3, 4].map(posType => {
                      const positionPlayers = optimizedLineup.starting11.filter(player => {
                        const fullPlayer = getPlayerById(player.element);
                        return fullPlayer?.element_type === posType;
                      });
                      
                      if (positionPlayers.length === 0) return null;
                      
                      return (
                        <div key={posType}>
                          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                            {posType === 1 ? 'Goalkeepers' : posType === 2 ? 'Defenders' : posType === 3 ? 'Midfielders' : 'Forwards'}
                          </div>
                          <div className="grid gap-2">
                            {positionPlayers.map((player) => {
                              const fullPlayer = getPlayerById(player.element);
                              const pick = manualLineup.find(p => p.element === player.element);
                              
                              // Check if this player slot is transferred out
                              if (pick && pick.is_transferred_out) {
                                return (
                                  <div
                                    key={`empty-auto-${player.element}`}
                                    className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20"
                                    data-testid={`empty-slot-auto-${player.element}`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="flex-1">
                                        <div className="font-medium text-red-600">Empty Slot</div>
                                        <div className="text-sm text-muted-foreground">
                                          {fullPlayer && getPositionName(fullPlayer.element_type)} • Click "Needs Replacement" to find a player
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-sm text-red-600 font-medium">
                                        Switch to Manual mode to add replacement
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div
                                  key={player.element}
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                    player.isCaptain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                                    player.isViceCaptain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                                    pick && isPlayerTransferredIn(pick) ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                                    'border-gray-200'
                                  }`}
                                  data-testid={`optimized-player-${player.element}`}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex-1">
                                      <div className="font-medium flex items-center gap-2">
                                        {player.web_name}
                                        {pick && isPlayerTransferredIn(pick) && (
                                          <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">NEW</span>
                                        )}
                                        {player.isCaptain && (
                                          <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">C</span>
                                        )}
                                        {player.isViceCaptain && (
                                          <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">VC</span>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionName(fullPlayer.element_type)} • {pick && `Sell: ~£${getSellingPrice(pick).toFixed(1)}m`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className="font-bold text-purple-600">{player.projectedPoints.toFixed(2)} pts</div>
                                      {player.isCaptain && (
                                        <div className="text-xs text-muted-foreground">({(player.projectedPoints * 2).toFixed(2)} with (C))</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bench */}
                <div>
                  <h3 className="font-semibold mb-3">Bench (Recommended Order)</h3>
                  <div className="grid gap-2">
                    {optimizedLineup.bench.map((player) => {
                      const fullPlayer = getPlayerById(player.element);
                      const pick = manualLineup.find(p => p.element === player.element);
                      
                      // Check if this bench player is transferred out
                      if (pick && pick.is_transferred_out) {
                        return (
                          <div
                            key={`empty-bench-auto-${player.element}`}
                            className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20"
                            data-testid={`empty-slot-bench-auto-${player.element}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-xs font-bold text-red-600 bg-red-200 dark:bg-red-700 px-2 py-1 rounded">
                                {player.benchPosition}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-red-600">Empty Slot</div>
                                <div className="text-sm text-muted-foreground">
                                  {fullPlayer && getPositionName(fullPlayer.element_type)} • Click "Needs Replacement" to find a player
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-red-600 font-medium">
                                Switch to Manual mode to add replacement
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={player.element}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                            pick && isPlayerTransferredIn(pick) 
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                              : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                          }`}
                          data-testid={`bench-player-${player.element}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xs font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {player.benchPosition}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {player.web_name}
                                {pick && isPlayerTransferredIn(pick) && (
                                  <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">NEW</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionName(fullPlayer.element_type)} • {pick && `Sell: ~£${getSellingPrice(pick).toFixed(1)}m`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">{player.projectedPoints.toFixed(2)} pts</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      {searchedId && teamData && selectedGameweek && (
        <Tabs defaultValue="projected-points" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projected-points" data-testid="tab-projected-points">
              <TrendingUp className="h-4 w-4 mr-2" />
              Projected Points
            </TabsTrigger>
            <TabsTrigger value="drafts" data-testid="tab-drafts">
              <Save className="h-4 w-4 mr-2" />
              My Drafts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projected-points" className="space-y-4">
            <AllPlayersProjectionsTab 
              selectedGameweek={selectedGameweek as number} 
              transferredOutPlayers={transferredOutPlayers}
              onTransferIn={handleTransferIn}
              currentBank={calculateCurrentBank()}
              initialPositionFilter={projectionPositionFilter}
              scrollToView={scrollToProjections}
              onScrollComplete={() => setScrollToProjections(false)}
            />
          </TabsContent>

          <TabsContent value="drafts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Draft Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Draft management coming soon...
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!searchedId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter your Manager ID to start planning your transfers</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

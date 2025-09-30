import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Save, Calendar, Target, Sparkles, Crown, ArrowUpDown, ChevronUp, ChevronDown, X, Plus, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
}

function AllPlayersProjectionsTab({ selectedGameweek, transferredOutPlayers, onTransferIn, currentBank }: AllPlayersProjectionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [loadGroupFilter, setLoadGroupFilter] = useState("All");
  const [sortField, setSortField] = useState<string>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
    <Card>
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

  // Initialize manual lineup when team data loads
  useEffect(() => {
    if (teamData?.picks) {
      console.log("DEBUG: First pick from teamData:", teamData.picks[0]);
      setManualLineup([...teamData.picks]);
      // Reset all transfers when loading new team data
      setGameweekTransfers({});
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
    }
  }, [teamData]);

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
    queryKey: ["/api/player-total-points-6gw"],
    enabled: !!selectedGameweek,
    queryFn: async () => {
      const startGW = nextGameweeks[0]?.id || 7;
      const endGW = nextGameweeks[nextGameweeks.length - 1]?.id || 12;
      const response = await fetch(`/api/player-total-points?startGameweek=${startGW}&endGameweek=${endGW}`);
      return response.json();
    }
  });

  // Auto-optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!teamData || !selectedGameweek) {
        throw new Error("Team data and gameweek are required");
      }

      const response = await fetch("/api/transfer-planner/auto-optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          picks: teamData.picks,
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
      toast({
        title: "Team Optimized!",
        description: `Best formation: ${data.formation} with ${data.totalProjectedPoints.toFixed(1)} projected points`
      });
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
    
    // Save current gameweek's transfers before switching
    const prevGameweek = getNextGameweeks().find(gw => 
      gameweekTransfers[gw.id]?.transferredOut?.length > 0 || 
      gameweekTransfers[gw.id]?.completed?.length > 0
    );
    
    // Clear optimized lineup when gameweek or mode changes
    setOptimizedLineup(null);
    
    // Load transfers for the selected gameweek or use empty if none
    const gwTransfers = gameweekTransfers[selectedGameweek] || { transferredOut: [], completed: [] };
    setTransferredOutPlayers(gwTransfers.transferredOut);
    setCompletedTransfers(gwTransfers.completed);
    
    // Calculate and set the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    
    // Apply current gameweek's pending transfers (transferred out but not yet replaced)
    let lineupWithPendingTransfers = [...baseline];
    gwTransfers.transferredOut.forEach(transferOut => {
      lineupWithPendingTransfers = lineupWithPendingTransfers.map(pick => {
        if (pick.position === transferOut.position) {
          return { ...pick, is_transferred_out: true };
        }
        return pick;
      });
    });
    
    setManualLineup(lineupWithPendingTransfers);
  }, [selectedGameweek, plannerMode]);

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

  // Calculate current bank based on initial bank and completed transfers
  const calculateCurrentBank = (): number => {
    if (!teamData?.transfers?.bank) return 0;
    
    const initialBank = teamData.transfers.bank / 10; // Convert from API format
    
    // Calculate net transfer cost: sum of buying prices - sum of selling prices
    const totalBuyingPrice = completedTransfers.reduce((sum, t) => sum + t.buyingPrice, 0);
    const totalSellingPrice = completedTransfers.reduce((sum, t) => sum + t.sellingPrice, 0);
    
    // Add selling prices from players transferred out but not yet replaced
    const pendingSellingPrice = transferredOutPlayers.reduce((sum, t) => sum + t.sellingPrice, 0);
    
    // Current bank = Initial bank + Total sold + Pending sold - Total bought
    const currentBank = initialBank + totalSellingPrice + pendingSellingPrice - totalBuyingPrice;
    
    return currentBank;
  };

  // Calculate actual transfers used by comparing with baseline lineup for this gameweek
  const calculateTransfersUsed = (): number => {
    if (!teamData?.picks || !selectedGameweek) return 0;
    
    // Get the baseline lineup for this gameweek (includes all previous transfers)
    const baseline = getBaselineLineup(selectedGameweek);
    
    // Count how many players in current lineup differ from baseline
    let changedPlayers = 0;
    
    manualLineup.forEach((currentPick, index) => {
      const baselinePick = baseline[index];
      // If player ID is different (and not transferred out), it's a change
      if (currentPick.element !== baselinePick.element && !currentPick.is_transferred_out) {
        changedPlayers++;
      }
    });
    
    return changedPlayers;
  };

  // Calculate transfers available for a given gameweek
  const calculateTransfersAvailable = (): number => {
    if (!teamData?.transfers || !selectedGameweek || !bootstrapData) return 0;
    
    // Get current gameweek
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const currentGW = currentEvent?.id || 1;
    
    // Base transfers available (from API) - this is for the next gameweek after current
    let transfersAvailable = teamData.transfers.limit || 1;
    
    // If selected gameweek is beyond the immediate next gameweek, add extra transfers
    // Formula: For each gameweek beyond (current + 1), add 1 transfer
    if (selectedGameweek > currentGW + 1) {
      const extraGameweeks = selectedGameweek - currentGW - 1;
      transfersAvailable += extraGameweeks;
    }
    
    // Subtract actual transfers used (net changes from original lineup)
    transfersAvailable -= calculateTransfersUsed();
    
    // Ensure minimum of 0
    return Math.max(0, transfersAvailable);
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

    setTransferredOutPlayers(prev => {
      const newTransferredOut = [...prev, transferOut];
      
      // Save to gameweek-specific storage
      if (selectedGameweek) {
        setGameweekTransfers(gwTransfers => ({
          ...gwTransfers,
          [selectedGameweek]: {
            transferredOut: newTransferredOut,
            completed: completedTransfers
          }
        }));
      }
      
      return newTransferredOut;
    });
    
    // Mark player as transferred out instead of removing
    setManualLineup(prev => prev.map(p => 
      p.element === pick.element 
        ? { ...p, is_transferred_out: true }
        : p
    ));

    toast({
      title: "Player Transferred Out",
      description: `${player.web_name} has been transferred out (£${sellingPrice.toFixed(1)}m). Select a replacement from the Projected Points tab.`
    });
  };

  // Handle transferring a player in
  const handleTransferIn = (playerId: number, playerElementType: number) => {
    const player = getPlayerById(playerId);
    if (!player) return;

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

    setCompletedTransfers(prev => {
      const newTransfers = [...prev, completedTransfer];
      
      // Save to gameweek-specific storage
      if (selectedGameweek) {
        setGameweekTransfers(gwTransfers => ({
          ...gwTransfers,
          [selectedGameweek]: {
            transferredOut: transferredOutPlayers.filter((_, i) => i !== transferOutIndex),
            completed: newTransfers
          }
        }));
      }
      
      return newTransfers;
    });

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
    
    setTransferredOutPlayers(prev => prev.filter((_, i) => i !== transferOutIndex));

    toast({
      title: "Player Transferred In",
      description: `${player.web_name} has been added to your team (£${buyingPrice.toFixed(1)}m)`
    });
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

      {/* Gameweek and Mode Selection */}
      {searchedId && teamData && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Gameweek Selection */}
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

              {/* Mode Selection */}
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
              {hasEmptySlots && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetTransfers}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                  data-testid="button-reset-transfers"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Transfers
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Projected Points for Selected GW */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">GW{selectedGameweek} Projected</div>
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
                <div className="text-sm text-muted-foreground mb-1">Next 6 GWs Total</div>
                <div className="text-2xl font-bold text-blue-600">
                  {(() => {
                    if (!playerProjections6GW) return '0.0';
                    
                    let total = 0;
                    const nextGWs = nextGameweeks.map(gw => gw.id);
                    
                    // Get starting 11 player IDs based on mode
                    let starting11PlayerIds: number[] = [];
                    if (plannerMode === "manual") {
                      starting11PlayerIds = manualLineup.slice(0, 11).map((p: TeamPick) => p.element);
                    } else if (optimizedLineup) {
                      starting11PlayerIds = optimizedLineup.starting11.map((p: any) => p.element);
                    }
                    
                    // Sum up projected points for each player across all 6 gameweeks
                    starting11PlayerIds.forEach((playerId: number) => {
                      const player = getPlayerById(playerId);
                      if (player) {
                        const playerData = playerProjections6GW.find((p: any) => p.playerId === player.id);
                        if (playerData && playerData.gameweekProjections) {
                          // Sum points across all 6 gameweeks
                          nextGWs.forEach(gw => {
                            const gwPoints = playerData.gameweekProjections[gw.toString()] || 0;
                            total += gwPoints;
                          });
                        }
                      }
                    });
                    
                    return total.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Cash in Bank */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Cash in Bank</div>
                <div className={`text-2xl font-bold ${calculateCurrentBank() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  £{calculateCurrentBank().toFixed(1)}m
                </div>
              </div>

              {/* Initial Transfers Available */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Initial Transfers Available</div>
                <div className="text-2xl font-bold text-purple-600">
                  {calculateTransfersAvailable()}
                </div>
              </div>

              {/* Transfers Used */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Transfers Used</div>
                <div className={`text-2xl font-bold ${calculateTransfersAvailable() < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {calculateTransfersUsed()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Selection Section */}
      {searchedId && teamData && selectedGameweek && plannerMode === "manual" && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Manual Team Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Starting 11 */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Starting 11
                </h3>
                <div className="grid gap-2">
                  {manualLineup.slice(0, 11).map((pick, index) => {
                    const player = getPlayerById(pick.element);
                    const projectedPoints = getPlayerProjectedPoints(pick.element);
                    if (!player) return null;
                    
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
                                {getPositionName(player.element_type)} • Transfer a replacement from Projected Points tab
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-red-600 font-medium">
                              Needs Replacement
                            </div>
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
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          pick.is_captain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                          pick.is_vice_captain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                          'border-gray-200'
                        }`}
                        data-testid={`starting-player-${pick.element}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {player.web_name}
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
                            <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                              <span>Buy: £{pick.purchase_price ? (pick.purchase_price / 10).toFixed(1) : (player.now_cost / 10).toFixed(1)}m</span>
                              <span>Now: £{(player.now_cost / 10).toFixed(1)}m</span>
                              <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
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
                            <Select onValueChange={(value) => swapPlayers(index, parseInt(value))}>
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
                          </div>
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
                                {getPositionName(player.element_type)} • Transfer a replacement from Projected Points tab
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-red-600 font-medium">
                              Needs Replacement
                            </div>
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
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900"
                        data-testid={`bench-player-${pick.element}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xs font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">{player.web_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {getTeamName(player.team)} • {getPositionName(player.element_type)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                              <span>Buy: £{pick.purchase_price ? (pick.purchase_price / 10).toFixed(1) : (player.now_cost / 10).toFixed(1)}m</span>
                              <span>Now: £{(player.now_cost / 10).toFixed(1)}m</span>
                              <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
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
                  </h3>
                  <div className="grid gap-2">
                    {optimizedLineup.starting11.map((player) => {
                      const fullPlayer = getPlayerById(player.element);
                      const pick = teamData.picks.find(p => p.element === player.element);
                      return (
                        <div
                          key={player.element}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            player.isCaptain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                            player.isViceCaptain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                            'border-gray-200'
                          }`}
                          data-testid={`optimized-player-${player.element}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {player.web_name}
                                {player.isCaptain && (
                                  <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">C</span>
                                )}
                                {player.isViceCaptain && (
                                  <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">VC</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionName(fullPlayer.element_type)} • {pick && `Sell: £${getSellingPrice(pick).toFixed(1)}m`}
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
                            {pick && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleTransferOut(pick)}
                                data-testid={`transfer-out-${player.element}`}
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

                {/* Bench */}
                <div>
                  <h3 className="font-semibold mb-3">Bench (Recommended Order)</h3>
                  <div className="grid gap-2">
                    {optimizedLineup.bench.map((player) => {
                      const fullPlayer = getPlayerById(player.element);
                      const pick = teamData.picks.find(p => p.element === player.element);
                      return (
                        <div
                          key={player.element}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900"
                          data-testid={`bench-player-${player.element}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xs font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {player.benchPosition}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium">{player.web_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionName(fullPlayer.element_type)} • {pick && `Sell: £${getSellingPrice(pick).toFixed(1)}m`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">{player.projectedPoints.toFixed(2)} pts</div>
                            {pick && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleTransferOut(pick)}
                                data-testid={`transfer-out-bench-${player.element}`}
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

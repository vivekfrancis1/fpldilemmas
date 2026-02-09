import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star, Trophy, Users, Zap, Shield, Crown, X, Plus, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingExperience } from "@/components/loading-experience";

interface PlayerSnapshot {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  price: number;
  ownership: number;
  totalProjectedPoints: number;
  averagePointsPerGameweek: number;
  averageValue: number;
  averageMinutes: number;
  gameweekBreakdown: Record<string, number>;
  windowId: string;
  startGameweek: number;
  endGameweek: number;
}

interface OptimalTeam {
  squad: PlayerSnapshot[];
  starting11: PlayerSnapshot[];
  captain: PlayerSnapshot;
  viceCaptain: PlayerSnapshot;
  formation: string;
  totalPoints: number;
  totalValue: number;
}

interface TeamConstraints {
  goalkeepers: number;
  defenders: number;
  midfielders: number;
  forwards: number;
  minDefenders: number;
  maxPlayersPerTeam: number;
}

const SQUAD_CONSTRAINTS: TeamConstraints = {
  goalkeepers: 2,
  defenders: 5,
  midfielders: 5,
  forwards: 3,
  minDefenders: 3,
  maxPlayersPerTeam: 3
};

// Valid FPL formations (DEF-MID-FWD, always 1 GK)
const VALID_FORMATIONS = [
  { def: 3, mid: 4, fwd: 3, name: '3-4-3' },
  { def: 3, mid: 5, fwd: 2, name: '3-5-2' },
  { def: 4, mid: 3, fwd: 3, name: '4-3-3' },
  { def: 4, mid: 4, fwd: 2, name: '4-4-2' },
  { def: 4, mid: 5, fwd: 1, name: '4-5-1' },
  { def: 5, mid: 3, fwd: 2, name: '5-3-2' },
  { def: 5, mid: 4, fwd: 1, name: '5-4-1' }
];

export default function BestFreehitTeam() {
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery({
    queryKey: ['/api/bootstrap-static'],
    queryFn: async () => {
      const response = await fetch('/api/bootstrap-static');
      if (!response.ok) throw new Error('Failed to fetch bootstrap data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return new Map<number, string>();
    const map = new Map<number, string>();
    bootstrapData.elements.forEach((player: any) => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  // Calculate dynamic gameweek range (next 12 gameweeks)
  const currentGameweek = bootstrapData?.events.find((event: any) => event.is_current)?.id || 6;
  const startGameweek = currentGameweek + 1;
  const endGameweek = Math.min(startGameweek + 11, 38); // Next 12 gameweeks, max GW38

  const [selectedGameweek, setSelectedGameweek] = useState<number>(startGameweek);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimalTeam, setOptimalTeam] = useState<OptimalTeam | null>(null);
  const [unlimitedBudget, setUnlimitedBudget] = useState<boolean>(true);
  const [budgetConstraint, setBudgetConstraint] = useState<number>(100);
  const [includedPlayers, setIncludedPlayers] = useState<PlayerSnapshot[]>([]);
  const [excludedPlayers, setExcludedPlayers] = useState<PlayerSnapshot[]>([]);
  const [includePopoverOpen, setIncludePopoverOpen] = useState(false);
  const [excludePopoverOpen, setExcludePopoverOpen] = useState(false);
  const includeListRef = useRef<HTMLDivElement>(null);
  const excludeListRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch cached Player Total Points data (now uses live API with memory caching)
  const { data: allCachedData, isLoading, error, refetch: refetchProjections } = useQuery({
    queryKey: ['/api/cached/player-total-points'],
    enabled: !!bootstrapData,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Filter cached data to selected gameweek (instant filtering, no need to refetch!)
  const liveData = useMemo(() => {
    if (!allCachedData || !Array.isArray(allCachedData)) return allCachedData;
    
    // Filter each player's gameweek projections to only the selected gameweek
    // Handle both key formats: "25" (numeric) and "gw25" (prefixed)
    return (allCachedData as any[]).map((player: any) => {
      const originalProjections = player.gameweekProjections || {};
      const numericKey = selectedGameweek.toString();
      const prefixedKey = `gw${selectedGameweek}`;
      // Try both key formats
      const points = originalProjections[numericKey] ?? originalProjections[prefixedKey] ?? 0;
      
      return {
        ...player,
        gameweekProjections: { [numericKey]: points },
        totalExpectedPoints: points
      };
    });
  }, [allCachedData, selectedGameweek]);

  const snapshots: PlayerSnapshot[] = liveData ? liveData.map((player: any) => ({
    playerId: player.playerId || 0,
    playerName: player.name || player.playerName || '',
    teamName: player.team || '',
    position: player.position || '',
    price: player.price || 0,
    ownership: player.ownership || 0,
    totalProjectedPoints: player.totalExpectedPoints || 0,
    averagePointsPerGameweek: 0,
    averageValue: 0,
    averageMinutes: 0,
    gameweekBreakdown: player.gameweekProjections || {},
    windowId: '',
    startGameweek: selectedGameweek,
    endGameweek: selectedGameweek
  })) : [];
  const gameweekRange = `GW${selectedGameweek}`;

  // Update selected gameweek when bootstrap data loads
  useEffect(() => {
    if (bootstrapData && selectedGameweek < startGameweek) {
      setSelectedGameweek(startGameweek);
    }
  }, [bootstrapData, startGameweek]);

  // Clear optimal team when gameweek changes
  useEffect(() => {
    setOptimalTeam(null);
  }, [selectedGameweek]);

  // Refresh data handler
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await refetchProjections();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get gameweek options (dynamic range for freehit optimization - next 12 gameweeks)
  const getGameweekOptions = () => {
    const options = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      options.push(gw);
    }
    return options;
  };

  // Get points for specific gameweek
  const getGameweekPoints = (player: PlayerSnapshot, gameweek: number): number => {
    // Try numeric key first (this contains the total points), then string variants
    return player.gameweekBreakdown[gameweek.toString()] || player.gameweekBreakdown[`gw${gameweek}`] || 0;
  };

  // Normalize position to standard format
  const normalizePosition = (position: string): 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward' => {
    const pos = position.toLowerCase();
    if (pos.includes('goalkeeper') || pos === 'gkp') return 'Goalkeeper';
    if (pos.includes('defender') || pos === 'def') return 'Defender';
    if (pos.includes('midfielder') || pos === 'mid') return 'Midfielder';
    return 'Forward';
  };

  // Calculate minimum bench cost for a given formation
  const calculateMinBenchCost = (
    formation: typeof VALID_FORMATIONS[0],
    playersByPosition: Record<string, PlayerSnapshot[]>,
    startingXI: PlayerSnapshot[] = []
  ): number => {
    const usedPlayerIds = new Set(startingXI.map(p => p.playerId));
    const teamCounts: Record<string, number> = {};
    startingXI.forEach(p => {
      const teamName = p.teamName || '';
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
    });

    // Calculate what positions we need on the bench
    const startingCounts = startingXI.length > 0 ? {
      Goalkeeper: startingXI.filter(p => normalizePosition(p.position) === 'Goalkeeper').length,
      Defender: startingXI.filter(p => normalizePosition(p.position) === 'Defender').length,
      Midfielder: startingXI.filter(p => normalizePosition(p.position) === 'Midfielder').length,
      Forward: startingXI.filter(p => normalizePosition(p.position) === 'Forward').length
    } : {
      Goalkeeper: 1, // Formation always has 1 GK
      Defender: formation.def,
      Midfielder: formation.mid,
      Forward: formation.fwd
    };

    const benchNeeds = {
      Goalkeeper: SQUAD_CONSTRAINTS.goalkeepers - startingCounts.Goalkeeper,
      Defender: SQUAD_CONSTRAINTS.defenders - startingCounts.Defender,
      Midfielder: SQUAD_CONSTRAINTS.midfielders - startingCounts.Midfielder,
      Forward: SQUAD_CONSTRAINTS.forwards - startingCounts.Forward
    };

    let minCost = 0;
    const positions: Array<keyof typeof benchNeeds> = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

    for (const position of positions) {
      const needed = benchNeeds[position];
      if (needed <= 0) continue;

      // Find cheapest players for this position that respect team constraints
      const available = playersByPosition[position]
        .filter(p => {
          if (usedPlayerIds.has(p.playerId)) return false;
          const teamName = p.teamName || '';
          const teamCount = teamCounts[teamName] || 0;
          return teamCount < SQUAD_CONSTRAINTS.maxPlayersPerTeam;
        })
        .sort((a, b) => a.price - b.price);

      // Add the cheapest players for this position
      for (let i = 0; i < needed && i < available.length; i++) {
        minCost += available[i].price;
        usedPlayerIds.add(available[i].playerId);
        const teamName = available[i].teamName || '';
        teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
      }
    }

    return minCost;
  };

  // Build starting XI for a specific formation
  const buildStartingXIForFormation = (
    formation: typeof VALID_FORMATIONS[0],
    playersByPosition: Record<string, PlayerSnapshot[]>,
    includedPlayerIds: Set<number>,
    budget?: number
  ): { players: PlayerSnapshot[], totalCost: number, totalPoints: number } | null => {
    const startingXI: PlayerSnapshot[] = [];
    const teamCounts: Record<string, number> = {};
    let totalCost = 0;
    let totalPoints = 0;

    // Allocate 80% of total budget to starting XI, 20% for bench
    const maxXIBudget = budget ? budget * 0.8 : undefined;
    
    if (maxXIBudget) {
      console.log(`Building starting XI with max budget: £${maxXIBudget.toFixed(1)}m (80% of £${budget}m)`);
    }

    // Helper to check if player can be added
    const canAddPlayer = (player: PlayerSnapshot) => {
      const teamName = player.teamName || '';
      const teamCount = teamCounts[teamName] || 0;
      if (teamCount >= SQUAD_CONSTRAINTS.maxPlayersPerTeam) return false;
      if (maxXIBudget && totalCost + player.price > maxXIBudget) return false;
      return true;
    };

    // Helper to add player
    const addPlayer = (player: PlayerSnapshot) => {
      startingXI.push(player);
      const teamName = player.teamName || '';
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
      totalCost += player.price;
      totalPoints += getGameweekPoints(player, selectedGameweek);
    };

    // 1. Add 1 goalkeeper
    const includedGK = playersByPosition.Goalkeeper.filter(p => includedPlayerIds.has(p.playerId) && canAddPlayer(p));
    if (includedGK.length > 0) {
      addPlayer(includedGK[0]);
    } else {
      const bestGK = playersByPosition.Goalkeeper.find(canAddPlayer);
      if (!bestGK) return null;
      addPlayer(bestGK);
    }

    // 2. Add required defenders
    let addedDef = 0;
    for (const player of playersByPosition.Defender) {
      if (addedDef >= formation.def) break;
      if (includedPlayerIds.has(player.playerId) && canAddPlayer(player)) {
        addPlayer(player);
        addedDef++;
      }
    }
    for (const player of playersByPosition.Defender) {
      if (addedDef >= formation.def) break;
      if (!startingXI.some(s => s.playerId === player.playerId) && canAddPlayer(player)) {
        addPlayer(player);
        addedDef++;
      }
    }
    if (addedDef < formation.def) return null;

    // 3. Add required midfielders
    let addedMid = 0;
    for (const player of playersByPosition.Midfielder) {
      if (addedMid >= formation.mid) break;
      if (includedPlayerIds.has(player.playerId) && canAddPlayer(player)) {
        addPlayer(player);
        addedMid++;
      }
    }
    for (const player of playersByPosition.Midfielder) {
      if (addedMid >= formation.mid) break;
      if (!startingXI.some(s => s.playerId === player.playerId) && canAddPlayer(player)) {
        addPlayer(player);
        addedMid++;
      }
    }
    if (addedMid < formation.mid) return null;

    // 4. Add required forwards
    let addedFwd = 0;
    for (const player of playersByPosition.Forward) {
      if (addedFwd >= formation.fwd) break;
      if (includedPlayerIds.has(player.playerId) && canAddPlayer(player)) {
        addPlayer(player);
        addedFwd++;
      }
    }
    for (const player of playersByPosition.Forward) {
      if (addedFwd >= formation.fwd) break;
      if (!startingXI.some(s => s.playerId === player.playerId) && canAddPlayer(player)) {
        addPlayer(player);
        addedFwd++;
      }
    }
    if (addedFwd < formation.fwd) return null;

    return { players: startingXI, totalCost, totalPoints };
  };

  // Build bench with remaining budget
  // Starting XI uses 80% of budget, bench gets whatever remains
  const buildBenchWithBudget = (
    startingXI: PlayerSnapshot[],
    playersByPosition: Record<string, PlayerSnapshot[]>,
    includedPlayerIds: Set<number>,
    totalBudget: number
  ): PlayerSnapshot[] | null => {
    const bench: PlayerSnapshot[] = [];
    const usedPlayerIds = new Set(startingXI.map(p => p.playerId));
    
    // Clone team counts from starting XI to avoid mutation bugs
    const teamCounts: Record<string, number> = {};
    startingXI.forEach(p => {
      const teamName = p.teamName || '';
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
    });

    const startingXICost = startingXI.reduce((sum, p) => sum + p.price, 0);
    let remainingBudget = totalBudget - startingXICost;
    let benchCost = 0;

    console.log(`Building bench with remaining budget: £${remainingBudget.toFixed(1)}m (Total: £${totalBudget}m, XI: £${startingXICost.toFixed(1)}m)`);

    // Helper to check if player can be added to bench
    const canAddToBench = (player: PlayerSnapshot) => {
      if (usedPlayerIds.has(player.playerId)) return false;
      if (player.price > remainingBudget) return false;
      const teamName = player.teamName || '';
      const teamCount = teamCounts[teamName] || 0;
      return teamCount < SQUAD_CONSTRAINTS.maxPlayersPerTeam;
    };

    // Helper to add player to bench (only called after canAddToBench confirms it's valid)
    const addToBench = (player: PlayerSnapshot) => {
      bench.push(player);
      usedPlayerIds.add(player.playerId);
      const teamName = player.teamName || '';
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
      remainingBudget -= player.price;
      benchCost += player.price;
    };

    // Calculate what we need for bench: total squad - starting XI
    const startingCounts = {
      Goalkeeper: startingXI.filter(p => normalizePosition(p.position) === 'Goalkeeper').length,
      Defender: startingXI.filter(p => normalizePosition(p.position) === 'Defender').length,
      Midfielder: startingXI.filter(p => normalizePosition(p.position) === 'Midfielder').length,
      Forward: startingXI.filter(p => normalizePosition(p.position) === 'Forward').length
    };

    const benchNeeds = {
      Goalkeeper: SQUAD_CONSTRAINTS.goalkeepers - startingCounts.Goalkeeper,
      Defender: SQUAD_CONSTRAINTS.defenders - startingCounts.Defender,
      Midfielder: SQUAD_CONSTRAINTS.midfielders - startingCounts.Midfielder,
      Forward: SQUAD_CONSTRAINTS.forwards - startingCounts.Forward
    };

    // Try to fill bench with best affordable players, fallback to cheapest if needed
    const positions: Array<keyof typeof benchNeeds> = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    
    for (const position of positions) {
      const needed = benchNeeds[position];
      if (needed <= 0) continue;

      let addedForPosition = 0;

      // First, try included players (re-check constraint before each add)
      for (const player of playersByPosition[position]) {
        if (addedForPosition >= needed) break;
        if (includedPlayerIds.has(player.playerId) && canAddToBench(player)) {
          addToBench(player);
          addedForPosition++;
        }
      }

      // Then fill with best affordable players (sorted by points, re-check constraint before each add)
      if (addedForPosition < needed) {
        const sortedByPoints = playersByPosition[position]
          .sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek));
        
        for (const player of sortedByPoints) {
          if (addedForPosition >= needed) break;
          if (canAddToBench(player)) {
            addToBench(player);
            addedForPosition++;
          }
        }
      }

      // If still can't afford, try cheapest players
      if (addedForPosition < needed) {
        const sortedByPrice = playersByPosition[position]
          .sort((a, b) => a.price - b.price);
        
        for (const player of sortedByPrice) {
          if (addedForPosition >= needed) break;
          if (canAddToBench(player)) {
            addToBench(player);
            addedForPosition++;
          }
        }
      }
    }

    // Check if we filled all bench spots
    if (bench.length < 4) {
      console.log(`❌ Could not fill all 4 bench spots (only filled ${bench.length})`);
      return null;
    }
    
    // Final validation: ensure total cost doesn't exceed budget
    const totalCost = startingXICost + benchCost;
    if (totalCost > totalBudget) {
      console.log(`❌ Budget exceeded: £${totalCost.toFixed(1)}m > £${totalBudget}m (XI: £${startingXICost.toFixed(1)}m, Bench: £${benchCost.toFixed(1)}m)`);
      return null;
    }
    
    console.log(`✅ Bench built successfully: £${benchCost.toFixed(1)}m (remaining budget: £${remainingBudget.toFixed(1)}m)`);
    return bench;
  };

  // Main optimization function with budget awareness
  const buildOptimalTeamWithBudget = (
    playersByPosition: Record<string, PlayerSnapshot[]>,
    includedPlayerIds: Set<number>,
    budget?: number
  ): { squad: PlayerSnapshot[], starting11: PlayerSnapshot[], formation: string } | null => {
    console.log(`Building optimal team with budget: ${budget ? `£${budget}m` : 'unlimited'}`);

    // Try each formation, starting with those that maximize points
    const formationAttempts: Array<{ formation: typeof VALID_FORMATIONS[0], xi: ReturnType<typeof buildStartingXIForFormation> }> = [];

    for (const formation of VALID_FORMATIONS) {
      const xi = buildStartingXIForFormation(formation, playersByPosition, includedPlayerIds, budget);
      if (xi) {
        formationAttempts.push({ formation, xi });
      }
    }

    // Sort by total points (best first)
    formationAttempts.sort((a, b) => (b.xi?.totalPoints || 0) - (a.xi?.totalPoints || 0));

    console.log(`Found ${formationAttempts.length} valid starting XI candidates`);

    // Try each XI candidate, attempting to build a valid bench
    for (const { formation, xi } of formationAttempts) {
      if (!xi) continue;

      if (!budget) {
        // Unlimited budget: just build best bench
        const bench = buildBenchWithBudget(xi.players, playersByPosition, includedPlayerIds, 999);
        if (bench) {
          console.log(`✅ Built team with formation ${formation.name}, XI: £${xi.totalCost.toFixed(1)}m, Points: ${xi.totalPoints.toFixed(1)}`);
          return {
            squad: [...xi.players, ...bench],
            starting11: xi.players,
            formation: formation.name
          };
        }
      } else {
        // Budget-constrained: try to build bench with remaining budget
        const bench = buildBenchWithBudget(xi.players, playersByPosition, includedPlayerIds, budget);
        if (bench) {
          const totalCost = xi.totalCost + bench.reduce((sum, p) => sum + p.price, 0);
          console.log(`✅ Built team with formation ${formation.name}, Total: £${totalCost.toFixed(1)}m, XI Points: ${xi.totalPoints.toFixed(1)}`);
          return {
            squad: [...xi.players, ...bench],
            starting11: xi.players,
            formation: formation.name
          };
        } else {
          console.log(`❌ Formation ${formation.name}: Could not build affordable bench (XI cost: £${xi.totalCost.toFixed(1)}m, budget: £${budget}m)`);
        }
      }
    }

    console.log('❌ Could not build a valid team within budget');
    return null;
  };

  // Helper function to build unlimited budget team with inclusion/exclusion constraints
  const buildUnlimitedTeam = (playersWithPoints: any[], playersByPosition: any) => {
    console.log('UNLIMITED BUDGET MODE - Top players by GW' + selectedGameweek + ' points:');
    console.log('Included players:', includedPlayers.map(p => p.playerName));
    console.log('Excluded players:', excludedPlayers.map(p => p.playerName));

    // Filter out excluded players from all positions
    const excludedIds = new Set(excludedPlayers.map(p => p.playerId));
    const filteredPlayersByPosition = {
      Goalkeeper: playersByPosition.Goalkeeper.filter((p: any) => !excludedIds.has(p.playerId)),
      Defender: playersByPosition.Defender.filter((p: any) => !excludedIds.has(p.playerId)),
      Midfielder: playersByPosition.Midfielder.filter((p: any) => !excludedIds.has(p.playerId)),
      Forward: playersByPosition.Forward.filter((p: any) => !excludedIds.has(p.playerId))
    };

    console.log('Top 2 GKP:', filteredPlayersByPosition.Goalkeeper.slice(0, 2).map((p: any) => `${p.playerName} (${getGameweekPoints(p, selectedGameweek).toFixed(2)} pts GW${selectedGameweek})`));
    console.log('Top 5 DEF:', filteredPlayersByPosition.Defender.slice(0, 5).map((p: any) => `${p.playerName} (${getGameweekPoints(p, selectedGameweek).toFixed(2)} pts GW${selectedGameweek})`));
    console.log('Top 5 MID:', filteredPlayersByPosition.Midfielder.slice(0, 5).map((p: any) => `${p.playerName} (${getGameweekPoints(p, selectedGameweek).toFixed(2)} pts GW${selectedGameweek})`));
    console.log('Top 3 FWD:', filteredPlayersByPosition.Forward.slice(0, 3).map((p: any) => `${p.playerName} (${getGameweekPoints(p, selectedGameweek).toFixed(2)} pts GW${selectedGameweek})`));

    // Start with included players
    let squad: PlayerSnapshot[] = [...includedPlayers];
    const positionCounts = {
      Goalkeeper: includedPlayers.filter(p => p.position.toLowerCase().includes('goalkeeper') || p.position === 'GKP').length,
      Defender: includedPlayers.filter(p => p.position.toLowerCase().includes('defender') || p.position === 'DEF').length,
      Midfielder: includedPlayers.filter(p => p.position.toLowerCase().includes('midfielder') || p.position === 'MID').length,
      Forward: includedPlayers.filter(p => p.position.toLowerCase().includes('forward') || p.position === 'FWD').length
    };

    // Helper function to count players by team in current squad
    const getTeamCounts = () => {
      const teamCounts: { [teamName: string]: number } = {};
      squad.forEach(player => {
        const teamName = player.teamName || '';
        teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
      });
      return teamCounts;
    };

    // Fill remaining spots with best available players (enforcing 3-players-per-team limit)
    const fillPosition = (position: keyof typeof filteredPlayersByPosition, maxCount: number) => {
      const needed = maxCount - positionCounts[position];
      if (needed > 0) {
        const availablePlayers = filteredPlayersByPosition[position]
          .filter((p: any) => !squad.some(sp => sp.playerId === p.playerId));
        
        const toAdd: PlayerSnapshot[] = [];
        for (const player of availablePlayers) {
          if (toAdd.length >= needed) break;
          
          const teamCounts = getTeamCounts();
          const playerTeam = player.teamName || '';
          const currentTeamCount = teamCounts[playerTeam] || 0;
          
          // Only add player if it doesn't violate the 3-players-per-team constraint
          if (currentTeamCount < SQUAD_CONSTRAINTS.maxPlayersPerTeam) {
            toAdd.push(player);
            squad.push(player);
          }
        }
        
        return toAdd.length;
      }
      return 0;
    };

    fillPosition('Goalkeeper', SQUAD_CONSTRAINTS.goalkeepers);
    fillPosition('Defender', SQUAD_CONSTRAINTS.defenders);
    fillPosition('Midfielder', SQUAD_CONSTRAINTS.midfielders);
    fillPosition('Forward', SQUAD_CONSTRAINTS.forwards);

    // Select starting 11: prioritize included players, then best performers
    const squadByPosition = {
      Goalkeeper: squad.filter(p => p.position.toLowerCase().includes('goalkeeper') || p.position === 'GKP').sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek)),
      Defender: squad.filter(p => p.position.toLowerCase().includes('defender') || p.position === 'DEF').sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek)),
      Midfielder: squad.filter(p => p.position.toLowerCase().includes('midfielder') || p.position === 'MID').sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek)),
      Forward: squad.filter(p => p.position.toLowerCase().includes('forward') || p.position === 'FWD').sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek))
    };

    const starting11 = [
      squadByPosition.Goalkeeper[0], // 1 GK
      ...squadByPosition.Defender.slice(0, 4), // 4 DEF (minimum)
      ...squadByPosition.Midfielder.slice(0, 5), // 5 MID
      squadByPosition.Forward[0] // 1 FWD
    ].filter(Boolean);

    return { squad, starting11 };
  };

  // Helper function to adjust team for budget constraints
  const adjustTeamForBudget = (unlimitedSquad: PlayerSnapshot[], unlimitedStarting11: PlayerSnapshot[], budget: number) => {
    const currentValue = unlimitedSquad.reduce((total, player) => total + player.price, 0);
    
    if (budget >= currentValue) {
      // Budget is sufficient for unlimited team
      console.log(`Budget ${budget}m >= unlimited team value ${currentValue.toFixed(1)}m - using unlimited team`);
      return { squad: unlimitedSquad, starting11: unlimitedStarting11 };
    }

    console.log(`Budget ${budget}m < unlimited team value ${currentValue.toFixed(1)}m - making adjustments`);
    
    let adjustedSquad = [...unlimitedSquad];
    let adjustedStarting11 = [...unlimitedStarting11];
    let savings = currentValue - budget;

    // Create sets for quick lookup of constraint players
    const includedPlayerIds = new Set(includedPlayers.map(p => p.playerId));
    const excludedPlayerIds = new Set(excludedPlayers.map(p => p.playerId));

    // Step 1: Replace bench players with cheaper alternatives (prioritize bench changes)
    // Only consider players that are NOT in the included list
    const benchPlayers = adjustedSquad.filter(player => 
      !adjustedStarting11.some(starter => starter.playerId === player.playerId) &&
      !includedPlayerIds.has(player.playerId) // NEVER replace included players
    );

    // Sort bench by price (most expensive first for replacement)
    const expensiveBench = benchPlayers.sort((a, b) => b.price - a.price);

    for (const expensivePlayer of expensiveBench) {
      if (savings <= 0) break;

      const position = expensivePlayer.position;
      const allInPosition = snapshots.filter(p => 
        p.position === position &&
        !excludedPlayerIds.has(p.playerId) && // NEVER pick excluded players
        !includedPlayerIds.has(p.playerId) // Don't pick included players (they're already in squad)
      );
      const cheaperAlternatives = allInPosition
        .filter(p => {
          if (p.price >= expensivePlayer.price) return false;
          if (adjustedSquad.some(sq => sq.playerId === p.playerId)) return false;
          
          // Check team constraint: count current team members (excluding the player being replaced)
          const teamCounts: { [teamName: string]: number } = {};
          adjustedSquad.forEach(player => {
            if (player.playerId !== expensivePlayer.playerId) {
              const teamName = player.teamName || '';
              teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
            }
          });
          
          const replacementTeam = p.teamName || '';
          const currentTeamCount = teamCounts[replacementTeam] || 0;
          return currentTeamCount < SQUAD_CONSTRAINTS.maxPlayersPerTeam;
        })
        .sort((a, b) => a.price - b.price);

      if (cheaperAlternatives.length > 0) {
        const replacement = cheaperAlternatives[0];
        const savedAmount = expensivePlayer.price - replacement.price;
        
        if (savedAmount > 0) {
          // Replace expensive bench player with cheaper alternative
          adjustedSquad = adjustedSquad.map(p => 
            p.playerId === expensivePlayer.playerId ? replacement : p
          );
          savings -= savedAmount;
          console.log(`Replaced bench ${expensivePlayer.playerName} (£${expensivePlayer.price}m) with ${replacement.playerName} (£${replacement.price}m) - saved £${savedAmount.toFixed(1)}m`);
        }
      }
    }

    // Step 2: If still over budget, replace starting 11 players (most expensive first)
    // Only consider players that are NOT in the included list
    if (savings > 0) {
      const expensiveStarters = adjustedStarting11
        .filter(player => !includedPlayerIds.has(player.playerId)) // NEVER replace included players
        .sort((a, b) => b.price - a.price);

      for (const expensivePlayer of expensiveStarters) {
        if (savings <= 0) break;

        const position = expensivePlayer.position;
        const allInPosition = snapshots.filter(p => 
          p.position === position &&
          !excludedPlayerIds.has(p.playerId) && // NEVER pick excluded players
          !includedPlayerIds.has(p.playerId) // Don't pick included players (they're already in squad)
        );
        const cheaperAlternatives = allInPosition
          .filter(p => {
            if (p.price >= expensivePlayer.price) return false;
            if (adjustedSquad.some(sq => sq.playerId === p.playerId)) return false;
            
            // Check team constraint: count current team members (excluding the player being replaced)
            const teamCounts: { [teamName: string]: number } = {};
            adjustedSquad.forEach(player => {
              if (player.playerId !== expensivePlayer.playerId) {
                const teamName = player.teamName || '';
                teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
              }
            });
            
            const replacementTeam = p.teamName || '';
            const currentTeamCount = teamCounts[replacementTeam] || 0;
            return currentTeamCount < SQUAD_CONSTRAINTS.maxPlayersPerTeam;
          })
          .sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek)); // Best performing cheaper alternative

        if (cheaperAlternatives.length > 0) {
          const replacement = cheaperAlternatives[0];
          const savedAmount = expensivePlayer.price - replacement.price;
          
          if (savedAmount > 0) {
            // Replace expensive starting player with cheaper alternative
            adjustedSquad = adjustedSquad.map(p => 
              p.playerId === expensivePlayer.playerId ? replacement : p
            );
            adjustedStarting11 = adjustedStarting11.map(p => 
              p.playerId === expensivePlayer.playerId ? replacement : p
            );
            savings -= savedAmount;
            console.log(`Replaced starter ${expensivePlayer.playerName} (£${expensivePlayer.price}m) with ${replacement.playerName} (£${replacement.price}m) - saved £${savedAmount.toFixed(1)}m`);
          }
        }
      }
    }

    return { squad: adjustedSquad, starting11: adjustedStarting11 };
  };

  // Optimize team selection
  const optimizeTeam = async () => {
    if (snapshots.length === 0) {
      console.error('No snapshots available');
      return;
    }
    
    setIsOptimizing(true);
    
    try {
      console.log('Starting optimization for gameweek:', selectedGameweek);
      console.log('Total snapshots:', snapshots.length);
      console.log('Sample snapshot:', snapshots[0]);
      console.log('Unlimited budget mode:', unlimitedBudget);

      // Sort players by gameweek points for selected gameweek
      const playersWithPoints = snapshots.map(player => {
        const gameweekPoints = getGameweekPoints(player, selectedGameweek);
        return {
          ...player,
          gameweekPoints
        };
      }).filter(player => player.gameweekPoints > 0);

      console.log('Players with points:', playersWithPoints.length);
      
      if (playersWithPoints.length === 0) {
        throw new Error(`No players found with points for gameweek ${selectedGameweek}`);
      }

      // Get unique positions to debug
      const uniquePositions = Array.from(new Set(snapshots.map(p => p.position)));
      console.log('Unique positions in data:', uniquePositions);

      // Group by position and sort by selected gameweek points only
      const playersByPosition = {
        Goalkeeper: playersWithPoints.filter(p => p.position.toLowerCase().includes('goalkeeper') || p.position === 'GKP').sort((a, b) => b.gameweekPoints - a.gameweekPoints),
        Defender: playersWithPoints.filter(p => p.position.toLowerCase().includes('defender') || p.position === 'DEF').sort((a, b) => b.gameweekPoints - a.gameweekPoints),
        Midfielder: playersWithPoints.filter(p => p.position.toLowerCase().includes('midfielder') || p.position === 'MID').sort((a, b) => b.gameweekPoints - a.gameweekPoints),
        Forward: playersWithPoints.filter(p => p.position.toLowerCase().includes('forward') || p.position === 'FWD').sort((a, b) => b.gameweekPoints - a.gameweekPoints)
      };

      console.log('Players by position:', {
        Goalkeeper: playersByPosition.Goalkeeper.length,
        Defender: playersByPosition.Defender.length,
        Midfielder: playersByPosition.Midfielder.length,
        Forward: playersByPosition.Forward.length
      });

      // Validate we have enough players in each position
      if (playersByPosition.Goalkeeper.length < SQUAD_CONSTRAINTS.goalkeepers) {
        throw new Error(`Not enough goalkeepers (need ${SQUAD_CONSTRAINTS.goalkeepers}, found ${playersByPosition.Goalkeeper.length})`);
      }
      if (playersByPosition.Defender.length < SQUAD_CONSTRAINTS.defenders) {
        throw new Error(`Not enough defenders (need ${SQUAD_CONSTRAINTS.defenders}, found ${playersByPosition.Defender.length})`);
      }
      if (playersByPosition.Midfielder.length < SQUAD_CONSTRAINTS.midfielders) {
        throw new Error(`Not enough midfielders (need ${SQUAD_CONSTRAINTS.midfielders}, found ${playersByPosition.Midfielder.length})`);
      }
      if (playersByPosition.Forward.length < SQUAD_CONSTRAINTS.forwards) {
        throw new Error(`Not enough forwards (need ${SQUAD_CONSTRAINTS.forwards}, found ${playersByPosition.Forward.length})`);
      }

      // Filter out excluded players from all positions
      const excludedIds = new Set(excludedPlayers.map(p => p.playerId));
      const filteredPlayersByPosition = {
        Goalkeeper: playersByPosition.Goalkeeper.filter(p => !excludedIds.has(p.playerId)),
        Defender: playersByPosition.Defender.filter(p => !excludedIds.has(p.playerId)),
        Midfielder: playersByPosition.Midfielder.filter(p => !excludedIds.has(p.playerId)),
        Forward: playersByPosition.Forward.filter(p => !excludedIds.has(p.playerId))
      };

      const includedPlayerIds = new Set(includedPlayers.map(p => p.playerId));

      // Use new budget-aware optimization
      const result = buildOptimalTeamWithBudget(
        filteredPlayersByPosition,
        includedPlayerIds,
        unlimitedBudget ? undefined : budgetConstraint
      );

      if (!result) {
        throw new Error(`Could not build a valid team within budget of £${budgetConstraint}m. Try increasing the budget or removing player constraints.`);
      }

      const { squad, starting11, formation: optimalFormation } = result;

      console.log('Selected squad size:', squad.length);
      console.log('Starting 11 size:', starting11.length);
      
      if (starting11.length === 0) {
        throw new Error('Failed to select starting 11');
      }

      console.log('Starting 11 size:', starting11.length);
      
      // Find captain (highest points) and vice captain (second highest points) from starting 11
      const sortedByPoints = starting11.sort((a, b) => 
        getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek)
      );
      const captain = sortedByPoints[0];
      const viceCaptain = sortedByPoints[1];

      // Calculate total points (captain gets double)
      const totalPoints = starting11.reduce((total, player) => {
        const points = getGameweekPoints(player, selectedGameweek);
        return total + (player.playerId === captain.playerId ? points * 2 : points);
      }, 0);

      // Use formation from optimization
      const formation = optimalFormation;

      // Calculate total team value
      const totalValue = squad.reduce((total, player) => total + player.price, 0);

      // Final validation: ensure max 3 players per team constraint
      const teamCounts: Record<string, number> = {};
      squad.forEach(p => {
        const teamName = p.teamName || '';
        teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
      });
      const violations = Object.entries(teamCounts).filter(([, count]) => count > 3);
      if (violations.length > 0) {
        console.warn('Team constraint violations detected:', violations);
      }

      console.log('Optimization successful:', {
        squadSize: squad.length,
        starting11Size: starting11.length,
        formation,
        totalPoints,
        captainName: captain.playerName,
        teamCounts
      });

      setOptimalTeam({
        squad,
        starting11,
        captain,
        viceCaptain,
        formation,
        totalPoints,
        totalValue
      });

    } catch (error) {
      console.error('Error optimizing team:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        selectedGameweek,
        snapshotsLength: snapshots.length
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Budget-constrained optimization function
  const optimizeWithBudgetConstraint = (playersByPosition: any, budget: number): PlayerSnapshot[] => {
    // Simple greedy approach: pick best value players within budget
    const allPlayers = [
      ...playersByPosition.Goalkeeper,
      ...playersByPosition.Defender,
      ...playersByPosition.Midfielder,
      ...playersByPosition.Forward
    ];

    // Sort by points per million value 
    const sortedByValue = allPlayers.map(player => ({
      ...player,
      valueScore: getGameweekPoints(player, selectedGameweek) / player.price
    })).sort((a, b) => b.valueScore - a.valueScore);

    const selectedSquad: PlayerSnapshot[] = [];
    const positionCounts = { Goalkeeper: 0, Defender: 0, Midfielder: 0, Forward: 0 };
    let totalCost = 0;

    for (const player of sortedByValue) {
      const position = player.position.toLowerCase().includes('goalkeeper') || player.position === 'GKP' ? 'Goalkeeper' :
                      player.position.toLowerCase().includes('defender') || player.position === 'DEF' ? 'Defender' :
                      player.position.toLowerCase().includes('midfielder') || player.position === 'MID' ? 'Midfielder' : 'Forward';

      const maxForPosition = position === 'Goalkeeper' ? SQUAD_CONSTRAINTS.goalkeepers :
                            position === 'Defender' ? SQUAD_CONSTRAINTS.defenders :
                            position === 'Midfielder' ? SQUAD_CONSTRAINTS.midfielders :
                            SQUAD_CONSTRAINTS.forwards;

      if (positionCounts[position] < maxForPosition && 
          totalCost + player.price <= budget && 
          selectedSquad.length < 15) {
        selectedSquad.push(player);
        positionCounts[position]++;
        totalCost += player.price;
      }

      if (selectedSquad.length === 15) break;
    }

    // If we don't have a full squad, fill with cheapest remaining players
    if (selectedSquad.length < 15) {
      const remaining = allPlayers.filter(p => !selectedSquad.some(s => s.playerId === p.playerId))
        .sort((a, b) => a.price - b.price);
      
      for (const player of remaining) {
        const position = player.position.toLowerCase().includes('goalkeeper') || player.position === 'GKP' ? 'Goalkeeper' :
                        player.position.toLowerCase().includes('defender') || player.position === 'DEF' ? 'Defender' :
                        player.position.toLowerCase().includes('midfielder') || player.position === 'MID' ? 'Midfielder' : 'Forward';

        const maxForPosition = position === 'Goalkeeper' ? SQUAD_CONSTRAINTS.goalkeepers :
                              position === 'Defender' ? SQUAD_CONSTRAINTS.defenders :
                              position === 'Midfielder' ? SQUAD_CONSTRAINTS.midfielders :
                              SQUAD_CONSTRAINTS.forwards;

        if (positionCounts[position] < maxForPosition && selectedSquad.length < 15) {
          selectedSquad.push(player);
          positionCounts[position]++;
        }

        if (selectedSquad.length === 15) break;
      }
    }

    return selectedSquad;
  };

  // Find optimal starting 11 from 15-player squad
  const findOptimalStarting11 = (squad: PlayerSnapshot[]): PlayerSnapshot[] => {
    const squadByPosition = {
      Goalkeeper: squad.filter(p => p.position.toLowerCase().includes('goalkeeper') || p.position === 'GKP'),
      Defender: squad.filter(p => p.position.toLowerCase().includes('defender') || p.position === 'DEF'),
      Midfielder: squad.filter(p => p.position.toLowerCase().includes('midfielder') || p.position === 'MID'),
      Forward: squad.filter(p => p.position.toLowerCase().includes('forward') || p.position === 'FWD')
    };

    // Try different formation combinations (1 GK + 10 outfield players = 11 total)
    const formations = [
      { def: 3, mid: 5, fwd: 2 }, // 3-5-2 (1+3+5+2=11)
      { def: 3, mid: 4, fwd: 3 }, // 3-4-3 (1+3+4+3=11)
      { def: 4, mid: 5, fwd: 1 }, // 4-5-1 (1+4+5+1=11)
      { def: 4, mid: 4, fwd: 2 }, // 4-4-2 (1+4+4+2=11)
      { def: 4, mid: 3, fwd: 3 }, // 4-3-3 (1+4+3+3=11)
      { def: 5, mid: 4, fwd: 1 }, // 5-4-1 (1+5+4+1=11)
      { def: 5, mid: 3, fwd: 2 }, // 5-3-2 (1+5+3+2=11)
      { def: 3, mid: 3, fwd: 4 }  // 3-3-4 (1+3+3+4=11)
    ];

    let bestTeam: PlayerSnapshot[] = [];
    let bestPoints = 0;

    for (const formation of formations) {
      if (formation.def > squadByPosition.Defender.length ||
          formation.mid > squadByPosition.Midfielder.length ||
          formation.fwd > squadByPosition.Forward.length) {
        continue;
      }

      const team = [
        ...(squadByPosition.Goalkeeper.length > 0 ? [squadByPosition.Goalkeeper[0]] : []), // Best goalkeeper
        ...squadByPosition.Defender.slice(0, formation.def).sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek)),
        ...squadByPosition.Midfielder.slice(0, formation.mid).sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek)),
        ...squadByPosition.Forward.slice(0, formation.fwd).sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek))
      ];

      // Ensure exactly 11 players
      if (team.length !== 11) {
        console.warn(`Formation ${formation.def}-${formation.mid}-${formation.fwd} resulted in ${team.length} players, skipping`);
        continue;
      }

      const teamPoints = team.reduce((total, player) => total + getGameweekPoints(player, selectedGameweek), 0);

      if (teamPoints > bestPoints) {
        bestPoints = teamPoints;
        bestTeam = team;
      }
    }

    return bestTeam;
  };

  // Get formation string
  const getFormation = (starting11: PlayerSnapshot[]): string => {
    const positions = starting11.reduce((acc, player) => {
      // Normalize position names
      if (player.position.toLowerCase().includes('defender') || player.position === 'DEF') {
        acc.Defender = (acc.Defender || 0) + 1;
      } else if (player.position.toLowerCase().includes('midfielder') || player.position === 'MID') {
        acc.Midfielder = (acc.Midfielder || 0) + 1;
      } else if (player.position.toLowerCase().includes('forward') || player.position === 'FWD') {
        acc.Forward = (acc.Forward || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return `${positions.Defender || 0}-${positions.Midfielder || 0}-${positions.Forward || 0}`;
  };

  // Get position icon
  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'Goalkeeper': return Shield;
      case 'Defender': return Shield;
      case 'Midfielder': return Zap;
      case 'Forward': return Trophy;
      default: return Users;
    }
  };

  // Get position color
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Goalkeeper': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Defender': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Midfielder': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Forward': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Convert position to short form (GKP, DEF, MID, FWD)
  const getPositionShortForm = (position: string): string => {
    const pos = position.toLowerCase();
    if (pos.includes('goalkeeper') || pos === 'gkp') return 'GKP';
    if (pos.includes('defender') || pos === 'def') return 'DEF';
    if (pos.includes('midfielder') || pos === 'mid') return 'MID';
    if (pos.includes('forward') || pos === 'fwd') return 'FWD';
    return position;
  };

  // Show loading state while bootstrap data or cached data is loading
  if (!bootstrapData || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading player data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || (allCachedData && snapshots.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Best Freehit Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {error ? 'Failed to load player data. Please try again later.' : 'No player projection data available.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Optimization Loading Screen */}
      {isOptimizing && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          data-testid="overlay-optimizing-freehit"
        >
          <LoadingExperience
            variant="simulation"
            title="Optimizing Free Hit Team"
            description="Running advanced algorithms to find the best possible squad for the selected gameweek..."
            steps={[
              { text: "Analyzing player projections", delay: "0s" },
              { text: "Testing formation combinations", delay: "0.2s" },
              { text: "Selecting optimal captain", delay: "0.4s" },
            ]}
          />
        </div>
      )}

      {/* Header - Compact */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            <h1>Best Freehit Team</h1>
          </div>
          <p className="fpl-page-subtitle">
            Optimal 15-player squad for maximum points with captain selection
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Team Optimization</CardTitle>
              <CardDescription>
                Select a gameweek to optimize your freehit team for maximum points
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshData}
              disabled={isRefreshing || isLoading}
              className="shrink-0"
              data-testid="button-refresh-freehit-data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Optimization Mode */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Label htmlFor="unlimited-budget" className="text-sm font-medium">
                  {unlimitedBudget ? 'Unlimited Budget (Default)' : 'Budget Optimization Mode'}
                </Label>
                <Switch
                  id="unlimited-budget"
                  checked={unlimitedBudget}
                  onCheckedChange={setUnlimitedBudget}
                  data-testid="switch-unlimited-budget"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {unlimitedBudget ? 'Select top players by projected points (no budget limit)' : 'Optimize within budget using unlimited team as reference'}
              </p>
            </div>
            
            {!unlimitedBudget && (
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-sm font-medium">
                  Budget Constraint (£m)
                </Label>
                <Input
                  id="budget"
                  type="number"
                  value={budgetConstraint}
                  onChange={(e) => setBudgetConstraint(parseFloat(e.target.value) || 100)}
                  min="50"
                  max="200"
                  step="0.1"
                  className="w-32"
                  data-testid="input-budget"
                />
              </div>
            )}
          </div>

          {/* Player Inclusion/Exclusion */}
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              <h3 className="text-sm font-medium">Player Constraints</h3>
            </div>

            {/* Players to Include */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-green-700 dark:text-green-400">
                Players to Include (Must Have)
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {includedPlayers.map((player) => (
                  <Badge
                    key={player.playerId}
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1"
                  >
                    {playerIdToWebName.get(player.playerId) || player.playerName}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-green-600" 
                      onClick={() => setIncludedPlayers(prev => prev.filter(p => p.playerId !== player.playerId))}
                    />
                  </Badge>
                ))}
              </div>
              <Popover open={includePopoverOpen} onOpenChange={setIncludePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Add players to include
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search players..." 
                      onValueChange={() => {
                        if (includeListRef.current) {
                          includeListRef.current.scrollTop = 0;
                        }
                      }}
                    />
                    <CommandList ref={includeListRef} className="max-h-[300px] overflow-auto">
                      <CommandEmpty>No players found.</CommandEmpty>
                      <CommandGroup>
                        {snapshots
                          .filter(player => 
                            !includedPlayers.some(ip => ip.playerId === player.playerId) &&
                            !excludedPlayers.some(ep => ep.playerId === player.playerId)
                          )
                          .sort((a, b) => a.playerName.localeCompare(b.playerName))
                          .map((player) => (
                            <CommandItem
                              key={player.playerId}
                              onSelect={() => {
                                setIncludedPlayers(prev => [...prev, player]);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <span className="font-medium">{playerIdToWebName.get(player.playerId) || player.playerName}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {player.teamName} - {player.position}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  £{player.price}m
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                These players will definitely be included in your squad
              </p>
            </div>

            {/* Players to Exclude */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-red-700 dark:text-red-400">
                Players to Exclude (Avoid)
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {excludedPlayers.map((player) => (
                  <Badge
                    key={player.playerId}
                    variant="secondary"
                    className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1"
                  >
                    {playerIdToWebName.get(player.playerId) || player.playerName}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-red-600" 
                      onClick={() => setExcludedPlayers(prev => prev.filter(p => p.playerId !== player.playerId))}
                    />
                  </Badge>
                ))}
              </div>
              <Popover open={excludePopoverOpen} onOpenChange={setExcludePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <X className="h-4 w-4 mr-2" />
                    Add players to exclude
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search players..." 
                      onValueChange={() => {
                        if (excludeListRef.current) {
                          excludeListRef.current.scrollTop = 0;
                        }
                      }}
                    />
                    <CommandList ref={excludeListRef} className="max-h-[300px] overflow-auto">
                      <CommandEmpty>No players found.</CommandEmpty>
                      <CommandGroup>
                        {snapshots
                          .filter(player => 
                            !includedPlayers.some(ip => ip.playerId === player.playerId) &&
                            !excludedPlayers.some(ep => ep.playerId === player.playerId)
                          )
                          .sort((a, b) => a.playerName.localeCompare(b.playerName))
                          .map((player) => (
                            <CommandItem
                              key={player.playerId}
                              onSelect={() => {
                                setExcludedPlayers(prev => [...prev, player]);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <span className="font-medium">{playerIdToWebName.get(player.playerId) || player.playerName}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {player.teamName} - {player.position}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  £{player.price}m
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                These players will never be included in your squad
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gameweek</label>
              <Select value={selectedGameweek.toString()} onValueChange={(value) => setSelectedGameweek(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getGameweekOptions().map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>
                      GW {gw}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={optimizeTeam} 
              disabled={isOptimizing || isLoading || snapshots.length === 0}
              className="flex items-center gap-2"
              data-testid="button-optimize-team"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Optimizing...
                </>
              ) : isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading Data...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Optimize Freehit Team
                </>
              )}
            </Button>
          </div>
          
          {gameweekRange && (
            <p className="text-sm text-muted-foreground">
              Data available for {gameweekRange} • Based on latest projections
            </p>
          )}
        </CardContent>
      </Card>

      {/* Optimal Team Results */}
      {optimalTeam && (
        <div className="space-y-6">
          {/* Team Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {unlimitedBudget ? 'Top Players Selection' : 'Budget-Optimized Team'}
              </CardTitle>
              <CardDescription>
                {unlimitedBudget 
                  ? 'Best players by projected points with no budget constraints'
                  : `Optimized within £${budgetConstraint}m budget constraint`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Formation</p>
                  <p className="text-2xl font-bold">{optimalTeam.formation}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Projected Points</p>
                  <p className="text-2xl font-bold text-green-600">{optimalTeam.totalPoints.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Starting XI with captain doubled</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Captain (C)</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    {playerIdToWebName.get(optimalTeam.captain.playerId) || optimalTeam.captain.playerName}
                  </p>
                  <p className="text-xs text-green-600 font-medium">
                    {getGameweekPoints(optimalTeam.captain, selectedGameweek).toFixed(1)} × 2 = {(getGameweekPoints(optimalTeam.captain, selectedGameweek) * 2).toFixed(1)} pts
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vice Captain (V)</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    <Star className="h-4 w-4 text-blue-500" />
                    {(optimalTeam.viceCaptain && (playerIdToWebName.get(optimalTeam.viceCaptain.playerId) || optimalTeam.viceCaptain.playerName)) || 'TBD'}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    {optimalTeam.viceCaptain ? getGameweekPoints(optimalTeam.viceCaptain, selectedGameweek).toFixed(1) : '0.0'} pts
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Team Value</p>
                    <p className="text-xl font-bold">£{optimalTeam.totalValue.toFixed(1)}m</p>
                    <p className="text-xs text-muted-foreground">All 15 players</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Gameweek Range</p>
                    <p className="text-xl font-bold">GW{selectedGameweek}</p>
                    <p className="text-xs text-muted-foreground">Single gameweek optimization</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Starting 11 - Ordered by Position */}
          <Card>
            <CardHeader>
              <CardTitle>Starting XI</CardTitle>
              <CardDescription>
                Your optimal 11 players for GW{selectedGameweek} (ordered by position)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {optimalTeam.starting11
                  .sort((a, b) => {
                    // Position order: Goalkeeper -> Defender -> Midfielder -> Forward
                    const positionOrder: Record<string, number> = {
                      'Goalkeeper': 1,
                      'Defender': 2,
                      'Midfielder': 3,
                      'Forward': 4,
                      'GKP': 1,
                      'DEF': 2,
                      'MID': 3,
                      'FWD': 4
                    };
                    
                    const aOrder = positionOrder[a.position] || 5;
                    const bOrder = positionOrder[b.position] || 5;
                    
                    if (aOrder !== bOrder) {
                      return aOrder - bOrder;
                    }
                    
                    // Within same position, sort by points (highest first)
                    return getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek);
                  })
                  .map((player, index) => (
                    <div
                      key={player.playerId}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        player.playerId === optimalTeam.captain.playerId 
                          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' 
                          : player.playerId === optimalTeam.viceCaptain?.playerId
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-6">{index + 1}.</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{playerIdToWebName.get(player.playerId) || player.playerName}</p>
                            {player.playerId === optimalTeam.captain.playerId && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                            {player.playerId === optimalTeam.viceCaptain?.playerId && (
                              <Star className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getPositionColor(player.position)} variant="secondary">
                          {getPositionShortForm(player.position)}
                        </Badge>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <p className="font-medium">
                              {getGameweekPoints(player, selectedGameweek).toFixed(1)} pts
                            </p>
                            {player.playerId === optimalTeam.captain.playerId && (
                              <span className="text-yellow-600 font-medium">(C)</span>
                            )}
                            {player.playerId === optimalTeam.viceCaptain?.playerId && (
                              <span className="text-blue-600 font-medium">(V)</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">£{player.price}m</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Bench Players - Organized by Position */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Substitute Goalkeeper */}
            <Card>
              <CardHeader>
                <CardTitle>Substitute Goalkeeper</CardTitle>
                <CardDescription>
                  Only replaces starting goalkeeper
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const benchGK = optimalTeam.squad
                    .filter(player => !optimalTeam.starting11.some(p => p.playerId === player.playerId))
                    .filter(player => player.position.toLowerCase().includes('goalkeeper') || player.position === 'Goalkeeper');
                  
                  return benchGK.map(player => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="font-medium">{playerIdToWebName.get(player.playerId) || player.playerName}</p>
                          <p className="text-sm text-muted-foreground">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getPositionColor(player.position)} variant="secondary">
                          GKP
                        </Badge>
                        <div className="text-right">
                          <p className="font-medium">
                            {getGameweekPoints(player, selectedGameweek).toFixed(1)} pts
                          </p>
                          <p className="text-sm text-muted-foreground">£{player.price}m</p>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            {/* Outfield Substitutes */}
            <Card>
              <CardHeader>
                <CardTitle>Outfield Substitutes (3 players)</CardTitle>
                <CardDescription>
                  Substitution priority order (1st, 2nd, 3rd choice)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {optimalTeam.squad
                    .filter(player => !optimalTeam.starting11.some(p => p.playerId === player.playerId))
                    .filter(player => !player.position.toLowerCase().includes('goalkeeper') && player.position !== 'Goalkeeper')
                    .sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek))
                    .map((player, index) => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{playerIdToWebName.get(player.playerId) || player.playerName}</p>
                            <p className="text-sm text-muted-foreground">{player.teamName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            className={getPositionColor(player.position)} 
                            variant="secondary"
                          >
                            {getPositionShortForm(player.position)}
                          </Badge>
                          <div className="text-right">
                            <p className="font-medium">
                              {getGameweekPoints(player, selectedGameweek).toFixed(1)} pts
                            </p>
                            <p className="text-sm text-muted-foreground">£{player.price}m</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
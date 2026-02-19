import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star, Trophy, Users, Zap, Shield, Crown, X, Plus, Calendar, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface GameweekTeam {
  gameweek: number;
  starting11: PlayerSnapshot[];
  captain: PlayerSnapshot;
  viceCaptain: PlayerSnapshot;
  totalPoints: number;
  gameweekPoints: number;
  formation: string;
}

interface OptimalTeam {
  squad: PlayerSnapshot[];
  starting11: PlayerSnapshot[];
  captain: PlayerSnapshot;
  viceCaptain: PlayerSnapshot;
  formation: string;
  totalPoints: number;
  totalValue: number;
  gameweekBreakdown: GameweekTeam[];
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

export default function BestWildcardTeam() {
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

  // State for gameweek horizon selection
  const [gameweekHorizon, setGameweekHorizon] = useState<number>(12);
  
  // Calculate dynamic gameweek range based on selected horizon
  const currentGameweek = bootstrapData?.events.find((event: any) => event.is_current)?.id || 6;
  const startGameweek = currentGameweek + 1;
  const endGameweek = Math.min(startGameweek + gameweekHorizon - 1, 38); // Based on selected horizon, max GW38

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
    queryFn: async () => {
      const response = await fetch('/api/cached/player-total-points');
      if (!response.ok) throw new Error('Failed to fetch player total points');
      return response.json();
    },
  });

  // Filter cached data to selected gameweek horizon (client-side filtering is instant)
  const liveData = useMemo(() => {
    if (!allCachedData || !Array.isArray(allCachedData)) return allCachedData;
    
    // Filter each player's gameweek projections to only include selected range
    return (allCachedData as any[]).map((player: any) => {
      const filteredProjections: Record<string, number> = {};
      const originalProjections = player.gameweekProjections || {};
      
      // Calculate total points for selected range
      // Handle both key formats: "25" (numeric) and "gw25" (prefixed)
      let totalPoints = 0;
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        const numericKey = gw.toString();
        const prefixedKey = `gw${gw}`;
        // Try both key formats
        const points = originalProjections[numericKey] ?? originalProjections[prefixedKey] ?? 0;
        filteredProjections[numericKey] = points;
        totalPoints += points;
      }
      
      return {
        ...player,
        gameweekProjections: filteredProjections,
        totalExpectedPoints: totalPoints
      };
    });
  }, [allCachedData, startGameweek, endGameweek]);

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
    startGameweek: startGameweek,
    endGameweek: endGameweek
  })) : [];
  const gameweekRange = `GW${startGameweek}-${endGameweek}`;

  // Clear optimal team when gameweek horizon changes
  useEffect(() => {
    setOptimalTeam(null);
  }, [gameweekHorizon]);

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

  // Get points for specific gameweek
  const getGameweekPoints = (player: PlayerSnapshot, gameweek: number): number => {
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

  // Build starting XI for a specific formation (for wildcard, uses total projected points)
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
      totalPoints += player.totalProjectedPoints; // Use total projected points for wildcard
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

      // Then fill with best affordable players (sorted by total projected points, re-check constraint before each add)
      if (addedForPosition < needed) {
        const sortedByPoints = playersByPosition[position]
          .sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints);
        
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

  // Enforce team constraint: max 3 players per team
  const enforceTeamConstraint = (
    squad: PlayerSnapshot[],
    starting11: PlayerSnapshot[],
    allPlayersByPosition: Record<string, PlayerSnapshot[]>,
    includedPlayerIds: Set<number>
  ): { squad: PlayerSnapshot[], starting11: PlayerSnapshot[] } => {
    const teamCounts: Record<string, number> = {};
    squad.forEach(p => {
      const team = p.teamName || '';
      teamCounts[team] = (teamCounts[team] || 0) + 1;
    });
    const violations = Object.entries(teamCounts).filter(([, count]) => count > SQUAD_CONSTRAINTS.maxPlayersPerTeam);
    if (violations.length === 0) return { squad, starting11 };
    console.warn(`⚠️ Team constraint violations found, fixing:`, violations);
    let fixedSquad = [...squad];
    let fixedStarting11 = [...starting11];
    for (const [teamName, count] of violations) {
      let excess = count - SQUAD_CONSTRAINTS.maxPlayersPerTeam;
      const teamPlayers = fixedSquad
        .filter(p => (p.teamName || '') === teamName)
        .sort((a, b) => {
          if (includedPlayerIds.has(a.playerId) && !includedPlayerIds.has(b.playerId)) return -1;
          if (!includedPlayerIds.has(a.playerId) && includedPlayerIds.has(b.playerId)) return 1;
          const aInXI = fixedStarting11.some(s => s.playerId === a.playerId);
          const bInXI = fixedStarting11.some(s => s.playerId === b.playerId);
          if (aInXI && !bInXI) return -1;
          if (!aInXI && bInXI) return 1;
          return b.totalProjectedPoints - a.totalProjectedPoints;
        });
      const toRemove = teamPlayers.slice(SQUAD_CONSTRAINTS.maxPlayersPerTeam);
      for (const removePlayer of toRemove) {
        if (excess <= 0) break;
        const position = normalizePosition(removePlayer.position);
        const usedIds = new Set(fixedSquad.map(p => p.playerId));
        const currentTeamCounts: Record<string, number> = {};
        fixedSquad.forEach(p => {
          if (p.playerId !== removePlayer.playerId) {
            const t = p.teamName || '';
            currentTeamCounts[t] = (currentTeamCounts[t] || 0) + 1;
          }
        });
        const replacement = allPlayersByPosition[position]
          ?.filter(p => {
            if (usedIds.has(p.playerId)) return false;
            const t = p.teamName || '';
            const tc = currentTeamCounts[t] || 0;
            return tc < SQUAD_CONSTRAINTS.maxPlayersPerTeam;
          })
          .sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints)[0];
        if (replacement) {
          fixedSquad = fixedSquad.map(p => p.playerId === removePlayer.playerId ? replacement : p);
          fixedStarting11 = fixedStarting11.map(p => p.playerId === removePlayer.playerId ? replacement : p);
          console.log(`🔄 Replaced ${removePlayer.playerName} (${teamName}) with ${replacement.playerName} (${replacement.teamName})`);
          excess--;
        }
      }
    }
    return { squad: fixedSquad, starting11: fixedStarting11 };
  };

  // Main optimization function with budget awareness (for wildcard - uses total projected points)
  const buildOptimalTeamWithBudget = (
    playersByPosition: Record<string, PlayerSnapshot[]>,
    includedPlayerIds: Set<number>,
    budget?: number
  ): { squad: PlayerSnapshot[], starting11: PlayerSnapshot[], formation: string } | null => {
    console.log(`Building optimal wildcard team with budget: ${budget ? `£${budget}m` : 'unlimited'}`);

    // Try each formation, starting with those that maximize total projected points
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
          console.log(`✅ Built wildcard team with formation ${formation.name}, XI: £${xi.totalCost.toFixed(1)}m, Points: ${xi.totalPoints.toFixed(1)}`);
          const rawSquad = [...xi.players, ...bench];
          const { squad, starting11 } = enforceTeamConstraint(rawSquad, xi.players, playersByPosition, includedPlayerIds);
          return {
            squad,
            starting11,
            formation: formation.name
          };
        }
      } else {
        // Budget-constrained: try to build bench with remaining budget
        const bench = buildBenchWithBudget(xi.players, playersByPosition, includedPlayerIds, budget);
        if (bench) {
          const totalCost = xi.totalCost + bench.reduce((sum, p) => sum + p.price, 0);
          console.log(`✅ Built wildcard team with formation ${formation.name}, Total: £${totalCost.toFixed(1)}m, XI Points: ${xi.totalPoints.toFixed(1)}`);
          const rawSquad = [...xi.players, ...bench];
          const { squad, starting11 } = enforceTeamConstraint(rawSquad, xi.players, playersByPosition, includedPlayerIds);
          return {
            squad,
            starting11,
            formation: formation.name
          };
        } else {
          console.log(`❌ Formation ${formation.name}: Could not build affordable bench (XI cost: £${xi.totalCost.toFixed(1)}m, budget: £${budget}m)`);
        }
      }
    }

    console.log('❌ Could not build a valid wildcard team within budget');
    return null;
  };

  // Helper function to optimize starting XI for a specific gameweek
  const optimizeStartingXIForGameweek = (squad: PlayerSnapshot[], gameweek: number): { starting11: PlayerSnapshot[], captain: PlayerSnapshot, viceCaptain: PlayerSnapshot, gameweekPoints: number, formation: string } => {
    // Group squad by position and sort by gameweek-specific points
    const squadByPosition = {
      Goalkeeper: squad.filter(p => p.position.toLowerCase().includes('goalkeeper') || p.position === 'GKP')
        .sort((a, b) => getGameweekPoints(b, gameweek) - getGameweekPoints(a, gameweek)),
      Defender: squad.filter(p => p.position.toLowerCase().includes('defender') || p.position === 'DEF')
        .sort((a, b) => getGameweekPoints(b, gameweek) - getGameweekPoints(a, gameweek)),
      Midfielder: squad.filter(p => p.position.toLowerCase().includes('midfielder') || p.position === 'MID')
        .sort((a, b) => getGameweekPoints(b, gameweek) - getGameweekPoints(a, gameweek)),
      Forward: squad.filter(p => p.position.toLowerCase().includes('forward') || p.position === 'FWD')
        .sort((a, b) => getGameweekPoints(b, gameweek) - getGameweekPoints(a, gameweek))
    };

    // Try all valid formations and pick the one with highest gameweek points
    let bestFormation = null;
    let bestStarting11: PlayerSnapshot[] = [];
    let bestPoints = 0;

    for (const formation of VALID_FORMATIONS) {
      // Check if we have enough players in each position
      if (squadByPosition.Goalkeeper.length < 1 ||
          squadByPosition.Defender.length < formation.def ||
          squadByPosition.Midfielder.length < formation.mid ||
          squadByPosition.Forward.length < formation.fwd) {
        continue;
      }

      // Build starting 11 for this formation
      const starting11 = [
        squadByPosition.Goalkeeper[0],
        ...squadByPosition.Defender.slice(0, formation.def),
        ...squadByPosition.Midfielder.slice(0, formation.mid),
        ...squadByPosition.Forward.slice(0, formation.fwd)
      ].filter(Boolean);

      // Calculate total points for this formation (without captain)
      const formationPoints = starting11.reduce((sum, player) => 
        sum + getGameweekPoints(player, gameweek), 0
      );

      if (formationPoints > bestPoints) {
        bestPoints = formationPoints;
        bestStarting11 = starting11;
        bestFormation = formation;
      }
    }

    // If no valid formation found, fallback to default
    if (bestStarting11.length === 0) {
      bestStarting11 = [
        squadByPosition.Goalkeeper[0],
        ...squadByPosition.Defender.slice(0, 4),
        ...squadByPosition.Midfielder.slice(0, 5),
        squadByPosition.Forward[0]
      ].filter(Boolean);
      bestFormation = { name: '4-5-1', def: 4, mid: 5, fwd: 1 };
    }

    // Captain should be the player with the highest points for this specific gameweek
    const captain = bestStarting11.reduce((best, player) => 
      getGameweekPoints(player, gameweek) > getGameweekPoints(best, gameweek) ? player : best
    );

    // Vice-captain should be the second-highest scoring player for this gameweek
    const viceCaptain = bestStarting11
      .filter(player => player.playerId !== captain.playerId)
      .reduce((best, player) => 
        getGameweekPoints(player, gameweek) > getGameweekPoints(best, gameweek) ? player : best
      );

    const gameweekPoints = bestStarting11.reduce((sum, player) => {
      const playerPoints = getGameweekPoints(player, gameweek);
      // Double captain points
      if (player.playerId === captain.playerId) {
        return sum + (playerPoints * 2);
      }
      return sum + playerPoints;
    }, 0);

    return { starting11: bestStarting11, captain, viceCaptain, gameweekPoints, formation: bestFormation?.name || '4-5-1' };
  };

  // Helper function to build unlimited budget team with inclusion/exclusion constraints
  const buildUnlimitedTeam = (playersWithPoints: any[], playersByPosition: any) => {
    console.log(`UNLIMITED BUDGET MODE - Top players by total projected points (${gameweekRange}):`);
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

    console.log('Top 2 GKP:', filteredPlayersByPosition.Goalkeeper.slice(0, 2).map((p: any) => `${p.playerName} (${p.totalProjectedPoints.toFixed(2)} pts total)`));
    console.log('Top 5 DEF:', filteredPlayersByPosition.Defender.slice(0, 5).map((p: any) => `${p.playerName} (${p.totalProjectedPoints.toFixed(2)} pts total)`));
    console.log('Top 5 MID:', filteredPlayersByPosition.Midfielder.slice(0, 5).map((p: any) => `${p.playerName} (${p.totalProjectedPoints.toFixed(2)} pts total)`));
    console.log('Top 3 FWD:', filteredPlayersByPosition.Forward.slice(0, 3).map((p: any) => `${p.playerName} (${p.totalProjectedPoints.toFixed(2)} pts total)`));

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

    // Helper function to count attackers (forwards + midfielders) by team
    const getAttackerCounts = () => {
      const attackerCounts: { [teamName: string]: number } = {};
      squad.forEach(player => {
        const isAttacker = player.position.toLowerCase().includes('midfielder') || 
                          player.position.toLowerCase().includes('forward') || 
                          player.position === 'MID' || 
                          player.position === 'FWD';
        if (isAttacker) {
          const teamName = player.teamName || '';
          attackerCounts[teamName] = (attackerCounts[teamName] || 0) + 1;
        }
      });
      return attackerCounts;
    };

    // Helper function to count defenders (defenders + goalkeepers) by team
    const getDefenderCounts = () => {
      const defenderCounts: { [teamName: string]: number } = {};
      squad.forEach(player => {
        const isDefender = player.position.toLowerCase().includes('defender') || 
                          player.position.toLowerCase().includes('goalkeeper') || 
                          player.position === 'DEF' || 
                          player.position === 'GKP';
        if (isDefender) {
          const teamName = player.teamName || '';
          defenderCounts[teamName] = (defenderCounts[teamName] || 0) + 1;
        }
      });
      return defenderCounts;
    };

    // Fill remaining spots with best available players (enforcing team balance constraints)
    const fillPosition = (position: keyof typeof filteredPlayersByPosition, maxCount: number) => {
      const needed = maxCount - positionCounts[position];
      if (needed > 0) {
        const availablePlayers = filteredPlayersByPosition[position]
          .filter((p: any) => !squad.some(sp => sp.playerId === p.playerId));
        
        const toAdd: PlayerSnapshot[] = [];
        
        // Calculate initial counts once before the loop
        let teamCounts = getTeamCounts();
        let attackerCounts = getAttackerCounts();
        let defenderCounts = getDefenderCounts();
        
        for (const player of availablePlayers) {
          if (toAdd.length >= needed) break;
          
          const playerTeam = player.teamName || '';
          const currentTeamCount = teamCounts[playerTeam] || 0;
          
          // Check all constraints before adding player
          let canAddPlayer = true;
          
          // 1. General team constraint (max 3 players per team)
          if (currentTeamCount >= SQUAD_CONSTRAINTS.maxPlayersPerTeam) {
            canAddPlayer = false;
          }
          
          // 2. Attacker constraint (max 2 attackers per team)
          const isAttacker = player.position.toLowerCase().includes('midfielder') || 
                            player.position.toLowerCase().includes('forward') || 
                            player.position === 'MID' || 
                            player.position === 'FWD';
          if (isAttacker && (attackerCounts[playerTeam] || 0) >= 2) {
            canAddPlayer = false;
          }
          
          // 3. Defender constraint (max 2 defenders per team)
          const isDefender = player.position.toLowerCase().includes('defender') || 
                            player.position.toLowerCase().includes('goalkeeper') || 
                            player.position === 'DEF' || 
                            player.position === 'GKP';
          if (isDefender && (defenderCounts[playerTeam] || 0) >= 2) {
            canAddPlayer = false;
          }
          
          if (canAddPlayer) {
            toAdd.push(player);
            squad.push(player);
            
            // Incrementally update counts for next iteration
            teamCounts[playerTeam] = (teamCounts[playerTeam] || 0) + 1;
            if (isAttacker) {
              attackerCounts[playerTeam] = (attackerCounts[playerTeam] || 0) + 1;
            }
            if (isDefender) {
              defenderCounts[playerTeam] = (defenderCounts[playerTeam] || 0) + 1;
            }
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

    // Select starting 11: prioritize included players, then best performers by total points
    const squadByPosition = {
      Goalkeeper: squad.filter(p => p.position.toLowerCase().includes('goalkeeper') || p.position === 'GKP').sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints),
      Defender: squad.filter(p => p.position.toLowerCase().includes('defender') || p.position === 'DEF').sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints),
      Midfielder: squad.filter(p => p.position.toLowerCase().includes('midfielder') || p.position === 'MID').sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints),
      Forward: squad.filter(p => p.position.toLowerCase().includes('forward') || p.position === 'FWD').sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints)
    };

    const starting11 = [
      squadByPosition.Goalkeeper[0], // 1 GK
      ...squadByPosition.Defender.slice(0, 4), // 4 DEF (minimum)
      ...squadByPosition.Midfielder.slice(0, 5), // 5 MID
      squadByPosition.Forward[0] // 1 FWD
    ].filter(Boolean);

    return { squad, starting11 };
  };

  // Helper function to adjust team for budget constraints while respecting inclusion/exclusion constraints
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
          
          // Count current team members (excluding the player being replaced)
          const teamCounts: { [teamName: string]: number } = {};
          const attackerCounts: { [teamName: string]: number } = {};
          const defenderCounts: { [teamName: string]: number } = {};
          
          adjustedSquad.forEach(player => {
            if (player.playerId !== expensivePlayer.playerId) {
              const teamName = player.teamName || '';
              teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
              
              const isAttacker = player.position.toLowerCase().includes('midfielder') || 
                                player.position.toLowerCase().includes('forward') || 
                                player.position === 'MID' || 
                                player.position === 'FWD';
              if (isAttacker) {
                attackerCounts[teamName] = (attackerCounts[teamName] || 0) + 1;
              }
              
              const isDefender = player.position.toLowerCase().includes('defender') || 
                                player.position.toLowerCase().includes('goalkeeper') || 
                                player.position === 'DEF' || 
                                player.position === 'GKP';
              if (isDefender) {
                defenderCounts[teamName] = (defenderCounts[teamName] || 0) + 1;
              }
            }
          });
          
          const replacementTeam = p.teamName || '';
          const currentTeamCount = teamCounts[replacementTeam] || 0;
          
          // Check all constraints
          if (currentTeamCount >= SQUAD_CONSTRAINTS.maxPlayersPerTeam) return false;
          
          // Check attacker constraint for attacking positions
          const isReplacementAttacker = p.position.toLowerCase().includes('midfielder') || 
                                        p.position.toLowerCase().includes('forward') || 
                                        p.position === 'MID' || 
                                        p.position === 'FWD';
          if (isReplacementAttacker && (attackerCounts[replacementTeam] || 0) >= 2) return false;
          
          // Check defender constraint for defensive positions
          const isReplacementDefender = p.position.toLowerCase().includes('defender') || 
                                        p.position.toLowerCase().includes('goalkeeper') || 
                                        p.position === 'DEF' || 
                                        p.position === 'GKP';
          if (isReplacementDefender && (defenderCounts[replacementTeam] || 0) >= 2) return false;
          
          return true;
        })
        .sort((a, b) => a.price - b.price);

      if (cheaperAlternatives.length > 0) {
        const replacement = cheaperAlternatives[0];
        const savedAmount = expensivePlayer.price - replacement.price;
        
        if (savedAmount > 0) {
          // Replace the expensive player
          adjustedSquad = adjustedSquad.map(p => p.playerId === expensivePlayer.playerId ? replacement : p);
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
            
            // Count current team members (excluding the player being replaced)
            const teamCounts: { [teamName: string]: number } = {};
            const attackerCounts: { [teamName: string]: number } = {};
            const defenderCounts: { [teamName: string]: number } = {};
            
            adjustedSquad.forEach(player => {
              if (player.playerId !== expensivePlayer.playerId) {
                const teamName = player.teamName || '';
                teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
                
                const isAttacker = player.position.toLowerCase().includes('midfielder') || 
                                  player.position.toLowerCase().includes('forward') || 
                                  player.position === 'MID' || 
                                  player.position === 'FWD';
                if (isAttacker) {
                  attackerCounts[teamName] = (attackerCounts[teamName] || 0) + 1;
                }
                
                const isDefender = player.position.toLowerCase().includes('defender') || 
                                  player.position.toLowerCase().includes('goalkeeper') || 
                                  player.position === 'DEF' || 
                                  player.position === 'GKP';
                if (isDefender) {
                  defenderCounts[teamName] = (defenderCounts[teamName] || 0) + 1;
                }
              }
            });
            
            const replacementTeam = p.teamName || '';
            const currentTeamCount = teamCounts[replacementTeam] || 0;
            
            // Check all constraints
            if (currentTeamCount >= SQUAD_CONSTRAINTS.maxPlayersPerTeam) return false;
            
            // Check attacker constraint for attacking positions
            const isReplacementAttacker = p.position.toLowerCase().includes('midfielder') || 
                                          p.position.toLowerCase().includes('forward') || 
                                          p.position === 'MID' || 
                                          p.position === 'FWD';
            if (isReplacementAttacker && (attackerCounts[replacementTeam] || 0) >= 2) return false;
            
            // Check defender constraint for defensive positions
            const isReplacementDefender = p.position.toLowerCase().includes('defender') || 
                                          p.position.toLowerCase().includes('goalkeeper') || 
                                          p.position === 'DEF' || 
                                          p.position === 'GKP';
            if (isReplacementDefender && (defenderCounts[replacementTeam] || 0) >= 2) return false;
            
            return true;
          })
          .sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints); // Best performers first

        if (cheaperAlternatives.length > 0) {
          const replacement = cheaperAlternatives[0];
          const savedAmount = expensivePlayer.price - replacement.price;
          
          if (savedAmount > 0) {
            // Replace in both squad and starting 11
            adjustedSquad = adjustedSquad.map(p => p.playerId === expensivePlayer.playerId ? replacement : p);
            adjustedStarting11 = adjustedStarting11.map(p => p.playerId === expensivePlayer.playerId ? replacement : p);
            savings -= savedAmount;
            console.log(`Replaced starter ${expensivePlayer.playerName} (£${expensivePlayer.price}m) with ${replacement.playerName} (£${replacement.price}m) - saved £${savedAmount.toFixed(1)}m`);
          }
        }
      }
    }

    return { squad: adjustedSquad, starting11: adjustedStarting11 };
  };

  const optimizeTeam = async () => {
    console.log(`Starting WILDCARD optimization for next ${gameweekHorizon} gameweeks:`, gameweekRange);
    console.log('Total snapshots:', snapshots.length);
    if (snapshots.length > 0) {
      console.log('Sample snapshot:', snapshots[0]);
    }
    console.log('Unlimited budget mode:', unlimitedBudget);

    setIsOptimizing(true);

    try {
      const unavailablePlayerIds = new Set<number>();
      if (bootstrapData?.elements) {
        bootstrapData.elements.forEach((el: any) => {
          const status = el.status;
          const chance = el.chance_of_playing_next_round;
          if (status === 'i' || status === 'u' || status === 's' || status === 'n' || chance === 0) {
            unavailablePlayerIds.add(el.id);
          }
        });
        console.log(`Filtered out ${unavailablePlayerIds.size} unavailable/injured/suspended players`);
      }

      const playersWithPoints = snapshots.filter(player => player.totalProjectedPoints > 0 && !unavailablePlayerIds.has(player.playerId));
      console.log('Players with points:', playersWithPoints.length);

      if (playersWithPoints.length === 0) {
        console.error('No players with projected points available');
        return;
      }

      // Group players by position
      const positionGroups = playersWithPoints.reduce((groups, player) => {
        let position = player.position;
        
        // Normalize positions
        if (position.toLowerCase().includes('goalkeeper') || position === 'GKP') {
          position = 'Goalkeeper';
        } else if (position.toLowerCase().includes('defender') || position === 'DEF') {
          position = 'Defender';
        } else if (position.toLowerCase().includes('midfielder') || position === 'MID') {
          position = 'Midfielder';
        } else if (position.toLowerCase().includes('forward') || position === 'FWD') {
          position = 'Forward';
        }

        if (!groups[position]) {
          groups[position] = [];
        }
        groups[position].push(player);
        return groups;
      }, {} as Record<string, PlayerSnapshot[]>);

      console.log('Unique positions in data:', Object.keys(positionGroups));
      console.log('Players by position:', Object.fromEntries(
        Object.entries(positionGroups).map(([pos, players]) => [pos, players.length])
      ));

      // Sort players by total projected points (best first)
      Object.keys(positionGroups).forEach(position => {
        positionGroups[position].sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints);
      });

      // Filter out excluded players from all positions
      const excludedIds = new Set(excludedPlayers.map(p => p.playerId));
      const filteredPositionGroups = {
        Goalkeeper: positionGroups.Goalkeeper?.filter(p => !excludedIds.has(p.playerId)) || [],
        Defender: positionGroups.Defender?.filter(p => !excludedIds.has(p.playerId)) || [],
        Midfielder: positionGroups.Midfielder?.filter(p => !excludedIds.has(p.playerId)) || [],
        Forward: positionGroups.Forward?.filter(p => !excludedIds.has(p.playerId)) || []
      };

      const includedPlayerIds = new Set(includedPlayers.map(p => p.playerId));

      // Use new budget-aware optimization
      const result = buildOptimalTeamWithBudget(
        filteredPositionGroups,
        includedPlayerIds,
        unlimitedBudget ? undefined : budgetConstraint
      );

      if (!result) {
        throw new Error(`Could not build a valid wildcard team within budget of £${budgetConstraint}m. Try increasing the budget or removing player constraints.`);
      }

      const finalSquad = result.squad;
      const finalStarting11 = result.starting11;

      // Generate gameweek-by-gameweek breakdown
      const gameweekBreakdown: GameweekTeam[] = [];
      let totalOptimizedPoints = 0;

      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        const gameweekOptimization = optimizeStartingXIForGameweek(finalSquad, gw);
        gameweekBreakdown.push({
          gameweek: gw,
          starting11: gameweekOptimization.starting11,
          captain: gameweekOptimization.captain,
          viceCaptain: gameweekOptimization.viceCaptain,
          totalPoints: gameweekOptimization.gameweekPoints, // Points for this specific gameweek
          gameweekPoints: gameweekOptimization.gameweekPoints,
          formation: gameweekOptimization.formation
        });
        totalOptimizedPoints += gameweekOptimization.gameweekPoints;
      }

      // For display purposes, also calculate the "overall best" starting XI across all gameweeks
      const overallCaptain = finalSquad.reduce((best, player) => 
        player.totalProjectedPoints > best.totalProjectedPoints ? player : best
      );

      const overallViceCaptain = finalSquad
        .filter(player => player.playerId !== overallCaptain.playerId)
        .reduce((best, player) => 
          player.totalProjectedPoints > best.totalProjectedPoints ? player : best
        );

      const totalValue = finalSquad.reduce((sum, player) => sum + player.price, 0);

      console.log('Selected squad size:', finalSquad.length);
      console.log('Starting 11 size:', finalStarting11.length);
      console.log('Gameweek-optimized total points:', totalOptimizedPoints);

      setOptimalTeam({
        squad: finalSquad,
        starting11: finalStarting11,
        captain: overallCaptain,
        viceCaptain: overallViceCaptain,
        formation: '4-5-1',
        totalPoints: totalOptimizedPoints, // Use optimized points from gameweek breakdown
        totalValue,
        gameweekBreakdown
      });

      console.log('Optimization successful:', {
        squadSize: finalSquad.length,
        starting11Size: finalStarting11.length,
        formation: '4-5-1',
        totalPoints: totalOptimizedPoints,
        captainName: overallCaptain.playerName
      });

    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Optimization Loading Screen */}
      {isOptimizing && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          data-testid="overlay-optimizing-wildcard"
        >
          <LoadingExperience
            variant="simulation"
            title="Optimizing Wildcard Team"
            description="Running advanced algorithms to find the best possible squad across multiple gameweeks..."
            steps={[
              { text: "Analyzing player projections for all gameweeks", delay: "0s" },
              { text: "Testing formation combinations", delay: "0.2s" },
              { text: "Optimizing captain and vice-captain selections", delay: "0.4s" },
            ]}
          />
        </div>
      )}

      {/* Header - Compact */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
            <h1>Best Wildcard Team</h1>
          </div>
          <p className="fpl-page-subtitle">
            Optimize your wildcard team across {gameweekRange} • {snapshots.length} players analyzed
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <LoadingExperience
          variant="analysis"
          title="Loading Player Projections"
          description="Fetching projected points data for all players..."
          steps={[
            { text: "Connecting to projection service", delay: "0s" },
            { text: "Calculating player expected points", delay: "0.3s" },
            { text: "Preparing optimization data", delay: "0.6s" },
          ]}
        />
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-red-600">
              <p>Failed to load player data. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Wildcard Optimization</CardTitle>
              <CardDescription>
                Optimize your wildcard team for maximum points across the next {gameweekHorizon} gameweeks
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                disabled={isRefreshing || isLoading}
                className="shrink-0"
                data-testid="button-refresh-wildcard-data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gameweek Horizon Selection */}
          <div className="space-y-2 p-3 md:p-4 bg-muted/20 rounded-lg border">
            <Label htmlFor="gameweek-horizon" className="text-sm font-medium">
              Optimization Horizon
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select how many gameweeks ahead to optimize your wildcard team
            </p>
            <Select 
              value={gameweekHorizon.toString()} 
              onValueChange={(value) => setGameweekHorizon(parseInt(value))}
            >
              <SelectTrigger id="gameweek-horizon" className="w-full sm:w-48" data-testid="select-gameweek-horizon">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Next 6 Gameweeks</SelectItem>
                <SelectItem value="8">Next 8 Gameweeks</SelectItem>
                <SelectItem value="10">Next 10 Gameweeks</SelectItem>
                <SelectItem value="12">Next 12 Gameweeks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optimization Mode - Mobile Optimized */}
          <div className="space-y-4 p-3 md:p-4 bg-muted/30 rounded-lg">
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
                {unlimitedBudget ? 'Select top players by total projected points (no budget limit)' : 'Optimize within budget using unlimited team as reference'}
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
                  className="w-full sm:w-32"
                  data-testid="input-budget"
                />
              </div>
            )}
          </div>

          {/* Player Inclusion/Exclusion - Mobile Optimized */}
          <div className="space-y-4 p-3 md:p-4 bg-muted/20 rounded-lg border">
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
                <PopoverContent className="w-full max-w-sm sm:w-80 p-0" align="start">
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
                <PopoverContent className="w-full max-w-sm sm:w-80 p-0" align="start">
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
                  Optimize Wildcard Team
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {optimalTeam && (
        <div className="space-y-6">
          {/* Full Squad - First */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Set & Forget Squad (15 Players)
              </CardTitle>
              <CardDescription>
                Your best wildcard squad for the entire {gameweekRange} horizon. This is the optimal 15-player squad you'd pick if you activated your wildcard right now and kept it unchanged.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary Stats - Single line on mobile */}
              <div className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                <div className="md:hidden flex items-center justify-between px-2 py-1 bg-muted/30 rounded">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm font-bold text-green-600">{optimalTeam.totalPoints.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-blue-600">£{optimalTeam.totalValue.toFixed(1)}m</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-orange-600">{optimalTeam.squad.length}</span>
                      <span className="text-xs text-muted-foreground ml-1">players</span>
                    </div>
                  </div>
                </div>
                
                <div className="hidden md:block text-center">
                  <div className="text-2xl font-bold text-green-600">{optimalTeam.totalPoints.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
                <div className="hidden md:block text-center">
                  <div className="text-2xl font-bold text-blue-600">£{optimalTeam.totalValue.toFixed(1)}m</div>
                  <div className="text-sm text-muted-foreground">Team Value</div>
                </div>
                <div className="hidden md:block text-center">
                  <div className="text-2xl font-bold text-orange-600">{optimalTeam.squad.length}</div>
                  <div className="text-sm text-muted-foreground">Squad Size</div>
                </div>
              </div>
              <Separator className="mb-4" />

              <div className="grid gap-3 md:gap-4">
                {['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map((position) => {
                  const positionPlayers = optimalTeam.squad.filter(player => {
                    const pos = player.position;
                    if (position === 'Goalkeeper') return pos.toLowerCase().includes('goalkeeper') || pos === 'GKP';
                    if (position === 'Defender') return pos.toLowerCase().includes('defender') || pos === 'DEF';
                    if (position === 'Midfielder') return pos.toLowerCase().includes('midfielder') || pos === 'MID';
                    if (position === 'Forward') return pos.toLowerCase().includes('forward') || pos === 'FWD';
                    return false;
                  });

                  return (
                    <div key={position}>
                      <div className="flex items-center gap-2 mb-2 md:mb-3">
                        <Badge variant="secondary" className="text-xs md:text-sm">{position}s ({positionPlayers.length})</Badge>
                      </div>
                      <div className="grid gap-1 md:gap-2">
                        {positionPlayers.map((player) => {
                          const isStarter = optimalTeam.starting11.some(starter => starter.playerId === player.playerId);
                          return (
                            <div
                              key={player.playerId}
                              className={`flex items-center justify-between p-2 md:p-3 rounded-lg border ${
                                isStarter ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium flex items-center gap-1 md:gap-2 text-sm md:text-base">
                                    <span className="truncate">{playerIdToWebName.get(player.playerId) || player.playerName}</span>
                                    {isStarter && (
                                      <Badge variant="outline" className="text-xs whitespace-nowrap">Starting XI</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs md:text-sm text-muted-foreground">
                                    {player.teamName} • {player.position}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="font-medium text-sm md:text-base">£{player.price}m</div>
                                <div className="text-xs md:text-sm text-muted-foreground">
                                  {player.totalProjectedPoints.toFixed(1)} xPts
                                </div>
                                <div className="text-xs text-purple-600">
                                  ({endGameweek - startGameweek + 1} GWs)
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
            </CardContent>
          </Card>

          {/* Gameweek-by-Gameweek Breakdown */}
          {optimalTeam && optimalTeam.gameweekBreakdown && optimalTeam.gameweekBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Lineup Optimization
                </CardTitle>
                <CardDescription>
                  Using the 15-player squad above, this shows the best starting XI and captain pick for each gameweek based on fixtures and form.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="6" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    {optimalTeam.gameweekBreakdown.map((gameweekTeam) => (
                      <TabsTrigger key={gameweekTeam.gameweek} value={gameweekTeam.gameweek.toString()}>
                        GW{gameweekTeam.gameweek}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {optimalTeam.gameweekBreakdown.map((gameweekTeam) => (
                    <TabsContent key={gameweekTeam.gameweek} value={gameweekTeam.gameweek.toString()}>
                      <div className="space-y-4">
                    {/* Summary - Uniform styling */}
                    <div className="bg-muted/30 rounded-lg p-3 md:p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-purple-600 dark:text-purple-400">{gameweekTeam.formation}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium">{gameweekTeam.gameweekPoints.toFixed(1)} pts</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Crown className="h-3 w-3 md:h-4 md:w-4 text-yellow-600" />
                          <span className="font-medium">{playerIdToWebName.get(gameweekTeam.captain.playerId) || gameweekTeam.captain.playerName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                          <span className="font-medium">{playerIdToWebName.get(gameweekTeam.viceCaptain.playerId) || gameweekTeam.viceCaptain.playerName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-1 md:gap-2">
                      {gameweekTeam.starting11.map((player, index) => {
                        const gameweekPoints = getGameweekPoints(player, gameweekTeam.gameweek);
                        const isCaptain = player.playerId === gameweekTeam.captain.playerId;
                        const isViceCaptain = player.playerId === gameweekTeam.viceCaptain.playerId;
                        
                        return (
                          <div
                            key={player.playerId}
                            className={`flex items-center justify-between p-2 md:p-3 rounded ${
                              isCaptain 
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'
                                : isViceCaptain
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                                : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                              <div className="text-xs text-muted-foreground w-5 md:w-6 flex-shrink-0">
                                {index + 1}.
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium flex items-center gap-1 md:gap-2 text-sm md:text-base">
                                  <span className="truncate">{playerIdToWebName.get(player.playerId) || player.playerName}</span>
                                  {isCaptain && (
                                    <Crown className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                  )}
                                  {isViceCaptain && (
                                    <Shield className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {player.teamName} - {player.position}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-medium text-sm md:text-base">
                                {isCaptain ? (gameweekPoints * 2).toFixed(1) : gameweekPoints.toFixed(1)} pts
                              </div>
                              {isCaptain && (
                                <div className="text-xs text-yellow-600">
                                  {gameweekPoints.toFixed(1)} × 2
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bench Players for this Gameweek */}
                    <div className="mt-4 md:mt-6">
                      <h4 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm text-muted-foreground">Substitutes</h4>
                      
                      {/* Substitute Goalkeeper */}
                      <div className="mb-2 md:mb-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1 md:mb-2">Substitute Goalkeeper</div>
                        {(() => {
                          const benchGK = optimalTeam.squad
                            .filter(p => !gameweekTeam.starting11.some(s => s.playerId === p.playerId))
                            .filter(p => p.position.toLowerCase().includes('goalkeeper') || p.position === 'GKP');
                          
                          return benchGK.map(player => {
                            const gameweekPoints = getGameweekPoints(player, gameweekTeam.gameweek);
                            return (
                              <div
                                key={player.playerId}
                                className="flex items-center justify-between p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Shield className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium truncate">
                                      {playerIdToWebName.get(player.playerId) || player.playerName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {player.teamName} - GKP
                                    </div>
                                  </div>
                                </div>
                                <div className="text-sm font-medium flex-shrink-0">
                                  {gameweekPoints.toFixed(1)} pts
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Outfield Substitutes */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1 md:mb-2">Outfield Substitutes</div>
                        <div className="space-y-1 md:space-y-2">
                          {(() => {
                            const benchOutfield = optimalTeam.squad
                              .filter(p => !gameweekTeam.starting11.some(s => s.playerId === p.playerId))
                              .filter(p => !p.position.toLowerCase().includes('goalkeeper') && p.position !== 'GKP')
                              .sort((a, b) => getGameweekPoints(b, gameweekTeam.gameweek) - getGameweekPoints(a, gameweekTeam.gameweek));
                            
                            return benchOutfield.map((player, index) => {
                              const gameweekPoints = getGameweekPoints(player, gameweekTeam.gameweek);
                              return (
                                <div
                                  key={player.playerId}
                                  className="flex items-center justify-between p-2 rounded bg-muted/30 border"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs font-bold w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium truncate">
                                        {playerIdToWebName.get(player.playerId) || player.playerName}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {player.teamName} - {player.position}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium flex-shrink-0">
                                    {gameweekPoints.toFixed(1)} pts
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
          </Card>
          )}

        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star, Trophy, Users, Zap, Shield, Crown, X, Plus, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Calculate dynamic gameweek range (next 6 gameweeks)
  const currentGameweek = bootstrapData?.events.find((event: any) => event.is_current)?.id || 6;
  const startGameweek = currentGameweek + 1;
  const endGameweek = Math.min(startGameweek + 5, 38); // Next 6 gameweeks, max GW38

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

  // Fetch live Player Total Points data (dynamic next 6 gameweeks for wildcard optimization)
  const { data: liveData, isLoading, error } = useQuery({
    queryKey: ['/api/player-total-points', startGameweek, endGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/player-total-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch total points: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for live data
    enabled: !!bootstrapData, // Only fetch when bootstrap data is available
  });

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

    // Reserve budget for minimum bench cost (4 players at ~£4.5m each = £18m minimum)
    const MIN_BENCH_COST = 18;
    const maxXIBudget = budget ? budget - MIN_BENCH_COST : undefined;

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
    const includedGK = playersByPosition.Goalkeeper.filter(p => includedPlayerIds.has(p.playerId));
    if (includedGK.length > 0) {
      addPlayer(includedGK[0]);
    } else {
      const bestGK = playersByPosition.Goalkeeper.find(canAddPlayer);
      if (!bestGK) return null;
      addPlayer(bestGK);
    }

    // 2. Add required defenders
    const includedDef = playersByPosition.Defender.filter(p => includedPlayerIds.has(p.playerId));
    for (const player of includedDef.slice(0, formation.def)) {
      if (!canAddPlayer(player)) return null;
      addPlayer(player);
    }
    const neededDef = formation.def - includedDef.length;
    const availableDef = playersByPosition.Defender.filter(p => 
      !startingXI.some(s => s.playerId === p.playerId) && canAddPlayer(p)
    );
    for (let i = 0; i < neededDef && i < availableDef.length; i++) {
      addPlayer(availableDef[i]);
    }
    if (startingXI.filter(p => normalizePosition(p.position) === 'Defender').length < formation.def) return null;

    // 3. Add required midfielders
    const includedMid = playersByPosition.Midfielder.filter(p => includedPlayerIds.has(p.playerId));
    for (const player of includedMid.slice(0, formation.mid)) {
      if (!canAddPlayer(player)) return null;
      addPlayer(player);
    }
    const neededMid = formation.mid - includedMid.length;
    const availableMid = playersByPosition.Midfielder.filter(p => 
      !startingXI.some(s => s.playerId === p.playerId) && canAddPlayer(p)
    );
    for (let i = 0; i < neededMid && i < availableMid.length; i++) {
      addPlayer(availableMid[i]);
    }
    if (startingXI.filter(p => normalizePosition(p.position) === 'Midfielder').length < formation.mid) return null;

    // 4. Add required forwards
    const includedFwd = playersByPosition.Forward.filter(p => includedPlayerIds.has(p.playerId));
    for (const player of includedFwd.slice(0, formation.fwd)) {
      if (!canAddPlayer(player)) return null;
      addPlayer(player);
    }
    const neededFwd = formation.fwd - includedFwd.length;
    const availableFwd = playersByPosition.Forward.filter(p => 
      !startingXI.some(s => s.playerId === p.playerId) && canAddPlayer(p)
    );
    for (let i = 0; i < neededFwd && i < availableFwd.length; i++) {
      addPlayer(availableFwd[i]);
    }
    if (startingXI.filter(p => normalizePosition(p.position) === 'Forward').length < formation.fwd) return null;

    return { players: startingXI, totalCost, totalPoints };
  };

  // Build bench with remaining budget
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

      // First, try included players
      const includedAvailable = playersByPosition[position].filter(p => 
        includedPlayerIds.has(p.playerId) && canAddToBench(p)
      );
      for (const player of includedAvailable.slice(0, needed)) {
        addToBench(player);
      }

      // Then fill with best affordable players (sorted by total projected points)
      const remaining = needed - includedAvailable.length;
      if (remaining > 0) {
        const available = playersByPosition[position]
          .filter(canAddToBench)
          .sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints);
        
        for (let i = 0; i < remaining && i < available.length; i++) {
          addToBench(available[i]);
        }

        // If still can't afford, try cheapest players
        if (bench.filter(p => normalizePosition(p.position) === position).length < needed) {
          const cheapest = playersByPosition[position]
            .filter(canAddToBench)
            .sort((a, b) => a.price - b.price);
          
          const stillNeeded = needed - bench.filter(p => normalizePosition(p.position) === position).length;
          for (let i = 0; i < stillNeeded && i < cheapest.length; i++) {
            addToBench(cheapest[i]);
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
          console.log(`✅ Built wildcard team with formation ${formation.name}, Total: £${totalCost.toFixed(1)}m, XI Points: ${xi.totalPoints.toFixed(1)}`);
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

    console.log('❌ Could not build a valid wildcard team within budget');
    return null;
  };

  // Helper function to optimize starting XI for a specific gameweek
  const optimizeStartingXIForGameweek = (squad: PlayerSnapshot[], gameweek: number): { starting11: PlayerSnapshot[], captain: PlayerSnapshot, viceCaptain: PlayerSnapshot, gameweekPoints: number } => {
    // Group squad by position
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

    // Select starting 11 based on best performers for this specific gameweek
    const starting11 = [
      squadByPosition.Goalkeeper[0], // 1 GK (best for this gameweek)
      ...squadByPosition.Defender.slice(0, 4), // 4 DEF (best 4 for this gameweek)
      ...squadByPosition.Midfielder.slice(0, 5), // 5 MID (best 5 for this gameweek)
      squadByPosition.Forward[0] // 1 FWD (best for this gameweek)
    ].filter(Boolean);

    // Captain should be the player with the highest points for this specific gameweek
    const captain = starting11.reduce((best, player) => 
      getGameweekPoints(player, gameweek) > getGameweekPoints(best, gameweek) ? player : best
    );

    // Vice-captain should be the second-highest scoring player for this gameweek
    const viceCaptain = starting11
      .filter(player => player.playerId !== captain.playerId)
      .reduce((best, player) => 
        getGameweekPoints(player, gameweek) > getGameweekPoints(best, gameweek) ? player : best
      );

    const gameweekPoints = starting11.reduce((sum, player) => {
      const playerPoints = getGameweekPoints(player, gameweek);
      // Double captain points
      if (player.playerId === captain.playerId) {
        return sum + (playerPoints * 2);
      }
      return sum + playerPoints;
    }, 0);

    return { starting11, captain, viceCaptain, gameweekPoints };
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
    console.log('Starting WILDCARD optimization for next 6 gameweeks:', gameweekRange);
    console.log('Total snapshots:', snapshots.length);
    if (snapshots.length > 0) {
      console.log('Sample snapshot:', snapshots[0]);
    }
    console.log('Unlimited budget mode:', unlimitedBudget);

    setIsOptimizing(true);

    try {
      const playersWithPoints = snapshots.filter(player => player.totalProjectedPoints > 0);
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
          gameweekPoints: gameweekOptimization.gameweekPoints
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

  return (
    <div className="space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-4 md:p-6 text-white">
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <Trophy className="h-5 w-5 md:h-6 md:w-6" />
          <h1 className="text-xl md:text-2xl font-bold">Best Wildcard Team</h1>
        </div>
        <p className="text-green-100 text-sm md:text-base">
          Optimize your wildcard team considering total points across the next 6 gameweeks
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="h-3 w-3 md:h-4 md:w-4" />
          <span className="text-xs md:text-sm">{gameweekRange} • {snapshots.length} players analyzed</span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-4">Loading player data...</span>
          </CardContent>
        </Card>
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
          <CardTitle className="text-lg">Wildcard Optimization</CardTitle>
          <CardDescription>
            Optimize your wildcard team for maximum points across the next 6 gameweeks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Optimization Mode - Mobile Optimized */}
          <div className="space-y-4 p-3 md:p-4 bg-muted/30 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <div className="space-y-1">
                <Label htmlFor="unlimited-budget" className="text-sm font-medium">
                  {unlimitedBudget ? 'Unlimited Budget (Default)' : 'Budget Optimization Mode'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {unlimitedBudget ? 'Select top players by total projected points (no budget limit)' : 'Optimize within budget using unlimited team as reference'}
                </p>
              </div>
              <Switch
                id="unlimited-budget"
                checked={unlimitedBudget}
                onCheckedChange={setUnlimitedBudget}
                data-testid="switch-unlimited-budget"
              />
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
                    {player.playerName}
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
                                  <span className="font-medium">{player.playerName}</span>
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
                    {player.playerName}
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
                                  <span className="font-medium">{player.playerName}</span>
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
              disabled={isOptimizing}
              className="flex items-center gap-2"
              data-testid="button-optimize-team"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Optimizing...
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
                Full Squad (15 Players)
              </CardTitle>
              <CardDescription>
                Your complete squad optimized for maximum points across {gameweekRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                                    <span className="truncate">{player.playerName}</span>
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
                                  {player.totalProjectedPoints.toFixed(1)} pts
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
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{optimalTeam.totalPoints.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">£{optimalTeam.totalValue.toFixed(1)}m</div>
                  <div className="text-sm text-muted-foreground">Team Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{optimalTeam.formation}</div>
                  <div className="text-sm text-muted-foreground">Formation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{optimalTeam.squad.length}</div>
                  <div className="text-sm text-muted-foreground">Squad Size</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Starting XI - Second */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Starting XI (Overall Best)
              </CardTitle>
              <CardDescription>
                Best 11 players across all 6 gameweeks with highest total projected points
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Captain & Vice-Captain */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">Captain</span>
                  </div>
                  <div className="font-semibold">{optimalTeam.captain.playerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {optimalTeam.captain.teamName} • {optimalTeam.captain.totalProjectedPoints.toFixed(1)} pts
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">Vice-Captain</span>
                  </div>
                  <div className="font-semibold">{optimalTeam.viceCaptain.playerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {optimalTeam.viceCaptain.teamName} • {optimalTeam.viceCaptain.totalProjectedPoints.toFixed(1)} pts
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                {optimalTeam.starting11.map((player, index) => (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      player.playerId === optimalTeam.captain.playerId 
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                        : player.playerId === optimalTeam.viceCaptain.playerId
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground w-8">
                        {index + 1}.
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {player.playerName}
                          {player.playerId === optimalTeam.captain.playerId && (
                            <Crown className="h-4 w-4 text-yellow-600" />
                          )}
                          {player.playerId === optimalTeam.viceCaptain.playerId && (
                            <Shield className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {player.teamName} • {player.position}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">£{player.price}m</div>
                      <div className="text-sm text-muted-foreground">
                        {player.totalProjectedPoints.toFixed(1)} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gameweek-by-Gameweek Breakdown */}
          {optimalTeam && optimalTeam.gameweekBreakdown && optimalTeam.gameweekBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Gameweek-by-Gameweek Optimization
                </CardTitle>
                <CardDescription>
                  Optimal starting XI and captain for each individual gameweek
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
                          GW{gameweekTeam.gameweek}
                        </Badge>
                        <div className="text-lg font-semibold">
                          {gameweekTeam.gameweekPoints.toFixed(1)} points
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Crown className="h-4 w-4 text-yellow-600" />
                          {gameweekTeam.captain.playerName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4 text-blue-600" />
                          {gameweekTeam.viceCaptain.playerName}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      {gameweekTeam.starting11.map((player, index) => {
                        const gameweekPoints = getGameweekPoints(player, gameweekTeam.gameweek);
                        const isCaptain = player.playerId === gameweekTeam.captain.playerId;
                        const isViceCaptain = player.playerId === gameweekTeam.viceCaptain.playerId;
                        
                        return (
                          <div
                            key={player.playerId}
                            className={`flex items-center justify-between p-2 rounded ${
                              isCaptain 
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'
                                : isViceCaptain
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                                : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-xs text-muted-foreground w-6">
                                {index + 1}.
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {player.playerName}
                                  {isCaptain && (
                                    <Crown className="h-3 w-3 text-yellow-600" />
                                  )}
                                  {isViceCaptain && (
                                    <Shield className="h-3 w-3 text-blue-600" />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {player.teamName} - {player.position}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {isCaptain ? (gameweekPoints * 2).toFixed(1) : gameweekPoints.toFixed(1)} pts
                              </div>
                              {isCaptain && (
                                <div className="text-xs text-yellow-600">
                                  {gameweekPoints.toFixed(1)} × 2 (C)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
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
import { isSeasonEnded, computeCurrentGameweek } from "@shared/gameweek-utils";
import { SeasonEndedNotice } from "@/components/season-ended-notice";
import { SeasonBadge } from "@/components/season-badge";

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
  const currentGameweek = computeCurrentGameweek((bootstrapData?.events || []) as any);
  const startGameweek = currentGameweek + 1;
  const endGameweek = 38; // Gameweek dropdown offers every remaining gameweek through GW38

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

  // Fetch player projection data from cached endpoint (pre-computed at startup, all future GWs)
  // Stable query key — range filter applied client-side, no refetch on GW change
  const { data: allCachedData, isLoading, error, refetch: refetchProjections } = useQuery({
    queryKey: ["/api/cached/player-total-points"],
    enabled: !!bootstrapData && startGameweek > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`/api/cached/player-total-points`);
      if (!response.ok) throw new Error('Failed to fetch player total points');
      return response.json();
    },
  });

  // Filter cached data to selected gameweek (instant filtering, no need to refetch!)
  const liveData = useMemo(() => {
    if (!allCachedData || !Array.isArray(allCachedData)) return [];
    
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

  // Points per £m — used to rank players by value when filling/upgrading a squad
  const playerValue = (player: PlayerSnapshot): number => player.totalProjectedPoints / Math.max(player.price, 0.1);

  /**
   * Build a full 15-player squad for a given formation. The starting XI is solved completely
   * first — fill, then upgrade to convergence — before the bench is even considered.
   *   Phase 1 (XI):    a) force in must-includes that fit an XI slot, capped at 82% of budget
   *                    b) fill remaining XI slots by highest value (points per £m)
   *                    c) upgrade pass: replace weakest non-included XI player with the
   *                       highest-points affordable alternative, repeat until no upgrade fits
   *   Phase 2 (Bench):  a) any must-include that didn't fit the XI goes here instead
   *                    b) fill remaining bench slots by highest value, capped at 18% of budget
   *                       (falls back to whatever's left of the total budget if the strict 18%
   *                       pool can't be filled)
   *                    c) upgrade pass, same cap rule
   */
  const buildSquadForFormation = (
    formation: typeof VALID_FORMATIONS[0],
    playersByPosition: Record<string, PlayerSnapshot[]>,
    includedPlayerIds: Set<number>,
    budget?: number
  ): { squad: PlayerSnapshot[], starting11: PlayerSnapshot[], totalCost: number } | null => {
    const hasBudget = budget !== undefined;
    const benchBudgetCap = hasBudget ? budget! * 0.18 : Infinity;
    const positions: Array<'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'> = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    const totalNeeds = { Goalkeeper: SQUAD_CONSTRAINTS.goalkeepers, Defender: SQUAD_CONSTRAINTS.defenders, Midfielder: SQUAD_CONSTRAINTS.midfielders, Forward: SQUAD_CONSTRAINTS.forwards };
    const xiNeeds = { Goalkeeper: 1, Defender: formation.def, Midfielder: formation.mid, Forward: formation.fwd };
    const benchNeeds = { Goalkeeper: totalNeeds.Goalkeeper - xiNeeds.Goalkeeper, Defender: totalNeeds.Defender - xiNeeds.Defender, Midfielder: totalNeeds.Midfielder - xiNeeds.Midfielder, Forward: totalNeeds.Forward - xiNeeds.Forward };
    const teamCounts: Record<string, number> = {};
    const canAddTeam = (player: PlayerSnapshot) => (teamCounts[player.teamName || ''] || 0) < SQUAD_CONSTRAINTS.maxPlayersPerTeam;
    const usedIds = new Set<number>();

    // Reserve a cushion of near-minimum-price players at each position for the bench BEFORE
    // the XI is built (prevents XI's greedy fill from hoarding cheap "enabler" players)
    const reservedForBench = new Set<number>();
    let benchMinCostEstimate = 0;
    for (const pos of positions) {
      if (benchNeeds[pos] <= 0) continue;
      const eligible = playersByPosition[pos].filter(p => !includedPlayerIds.has(p.playerId));
      if (eligible.length === 0) continue;
      const cheapestSorted = [...eligible].sort((a, b) => a.price - b.price);
      const minPrice = cheapestSorted[0].price;
      cheapestSorted.filter(p => p.price <= minPrice + 0.5).forEach(p => reservedForBench.add(p.playerId));
      benchMinCostEstimate += cheapestSorted.slice(0, benchNeeds[pos]).reduce((sum, p) => sum + p.price, 0);
    }
    const xiBudgetCap = hasBudget ? Math.min(budget! * 0.82, budget! - benchMinCostEstimate) : Infinity;

    const runUpgradePass = (group: PlayerSnapshot[], cap: number, groupCost: () => number, addCost: (delta: number) => void) => {
      let upgraded = true;
      while (upgraded) {
        upgraded = false;
        const swappable = group.filter(p => !includedPlayerIds.has(p.playerId)).sort((a, b) => playerValue(a) - playerValue(b));
        for (const weakest of swappable) {
          const pos = normalizePosition(weakest.position);
          const candidates = playersByPosition[pos]
            .filter(p => !usedIds.has(p.playerId))
            .filter(p => p.totalProjectedPoints > weakest.totalProjectedPoints)
            .sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints);
          let swappedThisPlayer = false;
          for (const candidate of candidates) {
            const newCost = groupCost() - weakest.price + candidate.price;
            if (newCost > cap) continue;
            const weakestTeam = weakest.teamName || ''; const candidateTeam = candidate.teamName || '';
            const newCandidateTeamCount = (teamCounts[candidateTeam] || 0) + (candidateTeam === weakestTeam ? -1 : 0) + 1;
            if (newCandidateTeamCount > SQUAD_CONSTRAINTS.maxPlayersPerTeam) continue;
            const groupIdx = group.findIndex(p => p.playerId === weakest.playerId);
            group[groupIdx] = candidate;
            usedIds.delete(weakest.playerId); usedIds.add(candidate.playerId);
            teamCounts[weakestTeam] = (teamCounts[weakestTeam] || 0) - 1;
            teamCounts[candidateTeam] = (teamCounts[candidateTeam] || 0) + 1;
            addCost(candidate.price - weakest.price);
            upgraded = true; swappedThisPlayer = true; break;
          }
          if (swappedThisPlayer) break;
        }
      }
    };

    // Phase 1: XI
    const startingXI: PlayerSnapshot[] = [];
    const xiFilled: Record<string, number> = { Goalkeeper: 0, Defender: 0, Midfielder: 0, Forward: 0 };
    let xiCost = 0;
    const addToXI = (player: PlayerSnapshot) => { startingXI.push(player); usedIds.add(player.playerId); xiCost += player.price; teamCounts[player.teamName || ''] = (teamCounts[player.teamName || ''] || 0) + 1; xiFilled[normalizePosition(player.position)]++; };
    // (a) force must-includes
    for (const pos of positions) { for (const player of playersByPosition[pos]) { if (!includedPlayerIds.has(player.playerId) || usedIds.has(player.playerId)) continue; if (xiFilled[pos] >= xiNeeds[pos]) continue; if (!canAddTeam(player)) continue; addToXI(player); } }
    // (b) fill by value within cap, excluding bench-reserved cushion
    for (const pos of positions) {
      const candidates = playersByPosition[pos].filter(p => !usedIds.has(p.playerId) && !reservedForBench.has(p.playerId)).sort((a, b) => playerValue(b) - playerValue(a));
      for (const player of candidates) { if (xiFilled[pos] >= xiNeeds[pos]) break; if (!canAddTeam(player)) continue; if (xiCost + player.price > xiBudgetCap) continue; addToXI(player); }
      if (xiFilled[pos] < xiNeeds[pos]) return null;
    }
    // (c) upgrade pass
    runUpgradePass(startingXI, xiBudgetCap, () => xiCost, (delta) => { xiCost += delta; });

    // Phase 2: Bench
    const bench: PlayerSnapshot[] = [];
    const benchFilled: Record<string, number> = { Goalkeeper: 0, Defender: 0, Midfielder: 0, Forward: 0 };
    let benchCost = 0;
    const addToBench = (player: PlayerSnapshot) => { bench.push(player); usedIds.add(player.playerId); benchCost += player.price; teamCounts[player.teamName || ''] = (teamCounts[player.teamName || ''] || 0) + 1; benchFilled[normalizePosition(player.position)]++; };
    for (const pos of positions) { for (const player of playersByPosition[pos]) { if (!includedPlayerIds.has(player.playerId) || usedIds.has(player.playerId)) continue; if (benchFilled[pos] >= benchNeeds[pos]) continue; if (!canAddTeam(player)) continue; addToBench(player); } }
    const fillBench = (cap: number) => {
      for (const pos of positions) {
        const pool = playersByPosition[pos].filter(p => !usedIds.has(p.playerId));
        const reserved = pool.filter(p => reservedForBench.has(p.playerId)).sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints);
        const rest = pool.filter(p => !reservedForBench.has(p.playerId)).sort((a, b) => playerValue(b) - playerValue(a));
        for (const player of [...reserved, ...rest]) { if (benchFilled[pos] >= benchNeeds[pos]) break; if (!canAddTeam(player)) continue; if (benchCost + player.price > cap) continue; addToBench(player); }
      }
    };
    let benchCap = benchBudgetCap;
    fillBench(benchCap);
    if (positions.some(pos => benchFilled[pos] < benchNeeds[pos]) && hasBudget) { benchCap = Math.max(benchBudgetCap, budget! - xiCost); fillBench(benchCap); }
    for (const pos of positions) { if (benchFilled[pos] < benchNeeds[pos]) return null; }
    runUpgradePass(bench, benchCap, () => benchCost, (delta) => { benchCost += delta; });

    const squad = [...startingXI, ...bench];
    return { squad, starting11: startingXI, totalCost: xiCost + benchCost };
  };

  // Enforce max 3 players per team constraint on a built squad
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

  const buildOptimalTeamWithBudget = (
    playersByPosition: Record<string, PlayerSnapshot[]>,
    includedPlayerIds: Set<number>,
    budget?: number
  ): { squad: PlayerSnapshot[], starting11: PlayerSnapshot[], formation: string } | null => {
    let best: { squad: PlayerSnapshot[], starting11: PlayerSnapshot[], formation: string, totalCost: number, xiPoints: number, includedInXI: number } | null = null;
    for (const formation of VALID_FORMATIONS) {
      const result = buildSquadForFormation(formation, playersByPosition, includedPlayerIds, budget);
      if (!result) continue;
      const xiPoints = result.starting11.reduce((sum, p) => sum + p.totalProjectedPoints, 0);
      const includedInXI = result.starting11.filter(p => includedPlayerIds.has(p.playerId)).length;
      if (!best || includedInXI > best.includedInXI || (includedInXI === best.includedInXI && xiPoints > best.xiPoints)) {
        best = { squad: result.squad, starting11: result.starting11, formation: formation.name, totalCost: result.totalCost, xiPoints, includedInXI };
      }
    }
    if (!best) return null;
    const { squad, starting11 } = enforceTeamConstraint(best.squad, best.starting11, playersByPosition, includedPlayerIds);
    return { squad, starting11, formation: best.formation };
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

      // Projection-based eligibility only: players with gameweekPoints > 0 are considered
      // available. The projection system already applies injury/availability adjustments.
      // Relying on bootstrap status flags incorrectly excludes doubted premium players
      // (e.g. Haaland at 75% chance) who still have meaningful projected points.
      const excludedIds = new Set(excludedPlayers.map(p => p.playerId));
      const includedPlayerIds = new Set(includedPlayers.map(p => p.playerId));

      // All eligible players sorted globally by GW projected points descending.
      // Global sort ensures expensive forwards (Haaland) compete on equal footing
      // with midfielders rather than being evaluated after budget is allocated.
      const allCandidates = snapshots
        .map(player => ({ ...player, gameweekPoints: getGameweekPoints(player, selectedGameweek) }))
        .filter(p => p.gameweekPoints > 0 && !excludedIds.has(p.playerId))
        .sort((a, b) => b.gameweekPoints - a.gameweekPoints);

      console.log('Candidates with projected points:', allCandidates.length);
      if (allCandidates.length === 0) {
        throw new Error(`No players found with points for gameweek ${selectedGameweek}`);
      }

      // Per-real-world-team depth cap: only a club's clear top options at each position are
      // ever considered, so the optimizer can't suggest e.g. a team's backup goalkeeper over
      // their starter just because of price/fixtures (Meslier-behind-Raya style scenarios).
      // allCandidates is already sorted by gameweekPoints descending, so the Nth-ranked
      // player for a given team is exactly the Nth one encountered per team while walking the
      // array. Explicitly included players are exempt and don't consume a rank slot, so a
      // manual include never silently bumps a legitimately-ranked teammate out.
      const TEAM_POSITION_DEPTH: Record<string, number> = {
        Goalkeeper: 1,
        Defender: 5,
        Midfielder: 5,
        Forward: 2,
      };
      const rankSoFarByTeamPos: Record<string, number> = {};
      const depthFilteredCandidates = allCandidates.filter(player => {
        if (includedPlayerIds.has(player.playerId)) return true;
        const pos = normalizePosition(player.position);
        const key = `${player.teamName || ''}|${pos}`;
        rankSoFarByTeamPos[key] = (rankSoFarByTeamPos[key] || 0) + 1;
        return rankSoFarByTeamPos[key] <= TEAM_POSITION_DEPTH[pos];
      });

      const groupedByPos: Record<string, PlayerSnapshot[]> = {
        Goalkeeper: depthFilteredCandidates.filter(p => normalizePosition(p.position) === 'Goalkeeper'),
        Defender:   depthFilteredCandidates.filter(p => normalizePosition(p.position) === 'Defender'),
        Midfielder: depthFilteredCandidates.filter(p => normalizePosition(p.position) === 'Midfielder'),
        Forward:    depthFilteredCandidates.filter(p => normalizePosition(p.position) === 'Forward'),
      };

      const result = buildOptimalTeamWithBudget(
        groupedByPos,
        includedPlayerIds,
        unlimitedBudget ? undefined : budgetConstraint
      );

      if (!result) {
        throw new Error(`Could not build a valid team within budget of £${budgetConstraint}m. Try increasing the budget or removing player constraints.`);
      }

      const squadPlayers: PlayerSnapshot[] = result.squad;
      const bestXI: PlayerSnapshot[] = result.starting11;
      const optimalFormation = result.formation;

      if (bestXI.length === 0) {
        throw new Error('Could not derive a valid starting XI from the selected squad.');
      }

      console.log(`Built ${squadPlayers.length}-player squad`);
      const squad = squadPlayers;
      const starting11 = bestXI;

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
      <div className="w-full py-4 sm:py-8">
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
      <div className="w-full py-4 sm:py-8">
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

  if (bootstrapData && isSeasonEnded(bootstrapData.events)) {
    return (
      <div className="w-full py-4 sm:py-8 space-y-6">
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
        <SeasonEndedNotice />
      </div>
    );
  }

  return (
    <div className="w-full py-4 sm:py-8 space-y-6">
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
            <h1>Best Freehit Team</h1><SeasonBadge />
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
            <div className="flex items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Optimization Mode */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Label htmlFor="unlimited-budget" className="text-sm font-medium">
                  Set a Budget Limit
                </Label>
                <Switch
                  id="unlimited-budget"
                  checked={!unlimitedBudget}
                  onCheckedChange={(checked) => setUnlimitedBudget(!checked)}
                  data-testid="switch-unlimited-budget"
                />
                <Badge variant={unlimitedBudget ? "secondary" : "default"} className="text-xs">
                  {unlimitedBudget ? 'Off — Unlimited Budget' : 'On — Limited Budget'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {unlimitedBudget
                  ? 'Off (default): picks the best players by projected points, regardless of price.'
                  : 'On: builds the best squad that fits within the budget you set below.'}
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
                            {player.playerId === optimalTeam.captain.playerId ? (
                              <p className="font-medium text-yellow-600">
                                {getGameweekPoints(player, selectedGameweek).toFixed(1)}pt × 2 = {(getGameweekPoints(player, selectedGameweek) * 2).toFixed(1)}pts
                              </p>
                            ) : (
                              <p className="font-medium">
                                {getGameweekPoints(player, selectedGameweek).toFixed(1)} pts
                              </p>
                            )}
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
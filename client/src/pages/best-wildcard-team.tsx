import { useState, useEffect } from "react";
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

export default function BestWildcardTeam() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimalTeam, setOptimalTeam] = useState<OptimalTeam | null>(null);
  const [unlimitedBudget, setUnlimitedBudget] = useState<boolean>(true);
  const [budgetConstraint, setBudgetConstraint] = useState<number>(100);
  const [includedPlayers, setIncludedPlayers] = useState<PlayerSnapshot[]>([]);
  const [excludedPlayers, setExcludedPlayers] = useState<PlayerSnapshot[]>([]);

  // Fetch live Player Total Points data (same as Player Total Points page)
  const { data: liveData, isLoading, error } = useQuery({
    queryKey: ['/api/player-total-points', 6, 11],
    queryFn: async () => {
      const response = await fetch('/api/player-total-points?startGameweek=6&endGameweek=11');
      if (!response.ok) {
        throw new Error(`Failed to fetch total points: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for live data
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
    startGameweek: 6,
    endGameweek: 11
  })) : [];
  const gameweekRange = 'GW6-11';

  // Get points for specific gameweek
  const getGameweekPoints = (player: PlayerSnapshot, gameweek: number): number => {
    return player.gameweekBreakdown[gameweek.toString()] || player.gameweekBreakdown[`gw${gameweek}`] || 0;
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
    console.log('UNLIMITED BUDGET MODE - Top players by total projected points (GW6-11):');
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

      // Build unlimited budget team first
      const { squad: unlimitedSquad, starting11: unlimitedStarting11 } = buildUnlimitedTeam(playersWithPoints, positionGroups);

      let finalSquad: PlayerSnapshot[], finalStarting11: PlayerSnapshot[];

      if (unlimitedBudget) {
        // Use unlimited team directly
        finalSquad = unlimitedSquad;
        finalStarting11 = unlimitedStarting11;
      } else {
        // Apply budget constraints
        const budgetAdjusted = adjustTeamForBudget(unlimitedSquad, unlimitedStarting11, budgetConstraint);
        finalSquad = budgetAdjusted.squad;
        finalStarting11 = budgetAdjusted.starting11;
      }

      // Generate gameweek-by-gameweek breakdown
      const gameweekBreakdown: GameweekTeam[] = [];
      let totalOptimizedPoints = 0;

      for (let gw = 6; gw <= 11; gw++) {
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Add players to include
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full max-w-sm sm:w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search players..." />
                    <CommandList>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <X className="h-4 w-4 mr-2" />
                    Add players to exclude
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full max-w-sm sm:w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search players..." />
                    <CommandList>
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
                  {unlimitedBudget ? 'Select Top Players' : 'Optimize Team'}
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
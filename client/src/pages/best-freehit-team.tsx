import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, Users, Zap, Shield, Crown } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

export default function BestFreehitTeam() {
  const [selectedGameweek, setSelectedGameweek] = useState<number>(6);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimalTeam, setOptimalTeam] = useState<OptimalTeam | null>(null);

  // Fetch Player Total Points snapshots
  const { data: snapshotsData, isLoading, error } = useQuery({
    queryKey: ['/api/player-total-points/snapshots'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const snapshots: PlayerSnapshot[] = snapshotsData?.snapshots || [];
  const gameweekRange = snapshotsData?.gameweekRange || '';

  useEffect(() => {
    if (snapshots.length > 0 && snapshots[0].startGameweek) {
      setSelectedGameweek(snapshots[0].startGameweek);
    }
  }, [snapshots]);

  // Get gameweek options
  const getGameweekOptions = () => {
    if (snapshots.length === 0) return [];
    const startGw = snapshots[0].startGameweek;
    const endGw = snapshots[0].endGameweek;
    const options = [];
    for (let gw = startGw; gw <= endGw; gw++) {
      options.push(gw);
    }
    return options;
  };

  // Get points for specific gameweek
  const getGameweekPoints = (player: PlayerSnapshot, gameweek: number): number => {
    // Try numeric key first (this contains the total points), then string variants
    return player.gameweekBreakdown[gameweek.toString()] || player.gameweekBreakdown[`gw${gameweek}`] || 0;
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
      const uniquePositions = [...new Set(snapshots.map(p => p.position))];
      console.log('Unique positions in data:', uniquePositions);

      // Group by position (using flexible matching)
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

      // Select best squad of 15 players
      const squad: PlayerSnapshot[] = [
        ...playersByPosition.Goalkeeper.slice(0, SQUAD_CONSTRAINTS.goalkeepers),
        ...playersByPosition.Defender.slice(0, SQUAD_CONSTRAINTS.defenders),
        ...playersByPosition.Midfielder.slice(0, SQUAD_CONSTRAINTS.midfielders),
        ...playersByPosition.Forward.slice(0, SQUAD_CONSTRAINTS.forwards)
      ];

      console.log('Selected squad size:', squad.length);

      // Find optimal starting 11 from squad
      const starting11 = findOptimalStarting11(squad);
      
      if (starting11.length === 0) {
        throw new Error('Failed to select starting 11');
      }

      console.log('Starting 11 size:', starting11.length);
      
      // Find best captain (highest points in starting 11)
      const captain = starting11.reduce((best, player) => 
        getGameweekPoints(player, selectedGameweek) > getGameweekPoints(best, selectedGameweek) ? player : best
      );

      // Calculate total points (captain gets double)
      const totalPoints = starting11.reduce((total, player) => {
        const points = getGameweekPoints(player, selectedGameweek);
        return total + (player.playerId === captain.playerId ? points * 2 : points);
      }, 0);

      // Calculate formation
      const formation = getFormation(starting11);

      // Calculate total team value
      const totalValue = squad.reduce((total, player) => total + player.price, 0);

      console.log('Optimization successful:', {
        squadSize: squad.length,
        starting11Size: starting11.length,
        formation,
        totalPoints,
        captainName: captain.playerName
      });

      setOptimalTeam({
        squad,
        starting11,
        captain,
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

  if (isLoading) {
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

  if (error || snapshots.length === 0) {
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
      {/* Header */}
      <div className="fpl-page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Best Freehit Team</h1>
            <p className="text-muted-foreground">
              Optimal 15-player squad for maximum points with captain selection
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Optimization</CardTitle>
          <CardDescription>
            Select a gameweek to optimize your freehit team for maximum points
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  Optimize Team
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
                Optimal Team Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Formation</p>
                  <p className="text-2xl font-bold">{optimalTeam.formation}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Projected Points</p>
                  <p className="text-2xl font-bold text-green-600">{optimalTeam.totalPoints.toFixed(1)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Team Value</p>
                  <p className="text-2xl font-bold">£{optimalTeam.totalValue.toFixed(1)}m</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Captain</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    {optimalTeam.captain.playerName}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Starting 11 - Simple List */}
          <Card>
            <CardHeader>
              <CardTitle>Starting XI</CardTitle>
              <CardDescription>
                Your optimal 11 players for GW{selectedGameweek} (captain gets double points)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {optimalTeam.starting11.map((player, index) => (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      player.playerId === optimalTeam.captain.playerId 
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-6">{index + 1}.</span>
                      {player.playerId === optimalTeam.captain.playerId && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">{player.playerName}</p>
                        <p className="text-sm text-muted-foreground">{player.teamName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getPositionColor(player.position)} variant="secondary">
                        {player.position}
                      </Badge>
                      <div className="text-right">
                        <p className="font-medium">
                          {getGameweekPoints(player, selectedGameweek).toFixed(1)} pts
                          {player.playerId === optimalTeam.captain.playerId && (
                            <span className="text-yellow-600 ml-1">(C)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">£{player.price}m</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bench Players */}
          <Card>
            <CardHeader>
              <CardTitle>Bench (4 players)</CardTitle>
              <CardDescription>
                Substitutes in preferred order of priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {optimalTeam.squad
                  .filter(player => !optimalTeam.starting11.some(p => p.playerId === player.playerId))
                  .sort((a, b) => getGameweekPoints(b, selectedGameweek) - getGameweekPoints(a, selectedGameweek))
                  .map((player, index) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 border-muted"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-6">{index + 1}.</span>
                        <div>
                          <p className="font-medium">{player.playerName}</p>
                          <p className="text-sm text-muted-foreground">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={getPositionColor(player.position)} 
                          variant="secondary"
                        >
                          {player.position}
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
      )}
    </div>
  );
}
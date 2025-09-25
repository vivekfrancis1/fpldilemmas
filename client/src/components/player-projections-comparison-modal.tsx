import { useState } from "react";
import { X, Users, Trophy, Target, TrendingUp, ArrowRight, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ValueCell, PositionBadge, TeamBadge } from "@/components/enhanced-table";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlayerProjectionsComparisonModalProps {
  players: PlayerTotalPointsData[];
  isOpen: boolean;
  onClose: () => void;
  bootstrapData?: any;
  startGameweek: number;
  endGameweek: number;
}

interface PlayerTotalPointsData {
  playerId?: number;
  id?: number;
  playerName?: string;
  name?: string;
  fullName?: string;
  position?: string;
  team?: string;
  teamName?: string;
  teamId?: number;
  totalExpectedPoints?: number;
  totalPoints?: number;
  averagePerGameweek?: number;
  averageValue?: number;
  avgMinutesPerGameweek?: number;
  price?: number;
  ownership?: number;
  gameweekProjections?: { [key: string]: number };
  pointsFromGoals?: { [key: string]: number };
  pointsFromAssists?: { [key: string]: number };
  pointsFromCleanSheets?: { [key: string]: number };
  pointsFromMinutes?: { [key: string]: number };
  pointsFromGoalsConceded?: { [key: string]: number };
  pointsFromYellowCards?: { [key: string]: number };
  pointsFromRedCards?: { [key: string]: number };
  pointsFromBonus?: { [key: string]: number };
  pointsFromSaves?: { [key: string]: number };
  pointsFromDefensiveContributions?: { [key: string]: number };
  totalPointsFromGoals?: number;
  totalPointsFromAssists?: number;
  totalPointsFromCleanSheets?: number;
  totalPointsFromDefensiveContributions?: number;
  totalPointsFromMinutes?: number;
  totalPointsFromBonus?: number;
  totalPointsFromGoalsConceded?: number;
  totalPointsFromYellowCards?: number;
  totalPointsFromRedCards?: number;
  totalPointsFromSaves?: number;
}

export default function PlayerProjectionsComparisonModal({ 
  players, 
  isOpen, 
  onClose,
  bootstrapData,
  startGameweek,
  endGameweek
}: PlayerProjectionsComparisonModalProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const isMobile = useIsMobile();

  if (!isOpen || players.length === 0) return null;

  const getPlayerPosition = (player: PlayerTotalPointsData) => {
    return player.position || "Unknown";
  };

  const getPlayerTeam = (player: PlayerTotalPointsData) => {
    return player.teamName || player.team || "Unknown";
  };

  const getPlayerName = (player: PlayerTotalPointsData) => {
    return player.playerName || player.name || "Unknown Player";
  };

  const getPositionColor = (position: string) => {
    switch (position.toUpperCase()) {
      case 'GKP': return "bg-green-100 text-green-800 border-green-200";
      case 'DEF': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'MID': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'FWD': return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Generate gameweek range for display
  const gameweekRange = Array.from(
    { length: endGameweek - startGameweek + 1 },
    (_, i) => startGameweek + i
  );

  // Summary stats comparison
  const summaryStats = [
    {
      key: 'totalExpectedPoints',
      label: 'Total Expected Points',
      format: 'points',
      decimals: 2
    },
    {
      key: 'averagePerGameweek',
      label: 'Avg Points/GW',
      format: 'points',
      decimals: 2
    },
    {
      key: 'totalPointsFromGoals',
      label: 'Total Points from Goals',
      format: 'points',
      decimals: 2
    },
    {
      key: 'totalPointsFromAssists',
      label: 'Total Points from Assists',
      format: 'points',
      decimals: 2
    },
    {
      key: 'totalPointsFromCleanSheets',
      label: 'Total Points from Clean Sheets',
      format: 'points',
      decimals: 2
    },
    {
      key: 'avgMinutesPerGameweek',
      label: 'Avg Minutes/GW',
      format: 'number',
      decimals: 0
    }
  ];

  // Mobile-responsive content component
  const ComparisonContent = () => (
    <div className="w-full max-w-6xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`${isMobile ? 'grid grid-cols-1 gap-1 h-auto p-1' : 'grid grid-cols-2 w-full'}`}>
          <TabsTrigger 
            value="summary" 
            className={`flex items-center gap-2 ${isMobile ? 'justify-start py-3 px-4' : ''}`}
          >
            <Trophy className="h-4 w-4" />
            Summary Stats
          </TabsTrigger>
          <TabsTrigger 
            value="gameweeks" 
            className={`flex items-center gap-2 ${isMobile ? 'justify-start py-3 px-4' : ''}`}
          >
            <Target className="h-4 w-4" />
            Gameweek Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 mt-6">
          {/* Player Headers */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : `grid-cols-${Math.min(players.length, 4)}`}`}>
            {players.map((player) => (
              <Card key={player.playerId || player.id} className="bg-gradient-to-br from-blue-50 to-slate-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getPositionColor(getPlayerPosition(player))}>
                        {getPlayerPosition(player)}
                      </Badge>
                      <TeamBadge team={getPlayerTeam(player)} />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {getPlayerName(player)}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Summary Stats Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projected Performance Comparison (GW{startGameweek}-{endGameweek})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summaryStats.map((stat) => (
                  <div key={stat.key} className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      {stat.label}
                    </div>
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : `grid-cols-${Math.min(players.length, 4)}`}`}>
                      {players.map((player) => (
                        <div key={player.playerId || player.id} className="bg-gray-50 rounded-lg p-3 text-center">
                          <ValueCell 
                            value={(player as any)[stat.key] || 0}
                            format={stat.format as any}
                            decimals={stat.decimals}
                            className="text-lg font-semibold"
                          />
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gameweeks" className="space-y-6 mt-6">
          {/* Player Headers */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : `grid-cols-${Math.min(players.length, 4)}`}`}>
            {players.map((player) => (
              <Card key={player.playerId || player.id} className="bg-gradient-to-br from-green-50 to-blue-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getPositionColor(getPlayerPosition(player))}>
                        {getPlayerPosition(player)}
                      </Badge>
                      <TeamBadge team={getPlayerTeam(player)} />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {getPlayerName(player)}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Gameweek by Gameweek Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Gameweek Projections Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gameweekRange.map((gw) => (
                  <div key={gw} className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Gameweek {gw}
                    </div>
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : `grid-cols-${Math.min(players.length, 4)}`}`}>
                      {players.map((player) => (
                        <div key={player.playerId || player.id} className="bg-gray-50 rounded-lg p-3 text-center">
                          <ValueCell 
                            value={player.gameweekProjections?.[`gw${gw}`] || 0}
                            format="points"
                            decimals={2}
                            className="text-lg font-semibold"
                            colorScheme="points"
                          />
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Render content in appropriate container (dialog for desktop, drawer for mobile)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh] bg-white">
          <DrawerHeader className="text-left border-b">
            <DrawerTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Compare Player Projections ({players.length})
              </span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-6 overflow-y-auto">
            <ComparisonContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Compare Player Projections ({players.length})
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <ComparisonContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
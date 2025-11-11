import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Target, Award, Shield, Clock, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

interface GameweekData {
  round: number;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  value: number;
  transfers_balance: number;
  selected: number;
  transfers_in: number;
  transfers_out: number;
  opponent_team?: number;
  was_home?: boolean;
  kickoff_time?: string;
  team_h_score?: number;
  team_a_score?: number;
  starts?: number;
  expected_goals?: string;
  expected_assists?: string;
  expected_goal_involvements?: string;
  expected_goals_conceded?: string;
}

interface PlayerSummaryData {
  history: GameweekData[];
  fixtures: any[];
  history_past: any[];
}

interface PlayerGameweekModalProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
  data?: PlayerSummaryData;
  isLoading: boolean;
}

export default function PlayerGameweekModal({ 
  player, 
  isOpen, 
  onClose, 
  data, 
  isLoading 
}: PlayerGameweekModalProps) {
  const isMobile = useIsMobile();
  
  if (!player) return null;

  const gameweekHistory = data?.history || [];
  const sortedHistory = [...gameweekHistory].sort((a, b) => a.round - b.round);
  
  // Team ID to team name mapping
  const getTeamShortName = (teamId?: number) => {
    if (!teamId) return '-';
    const teamMap: { [key: number]: string } = {
      1: 'ARS', 2: 'AVL', 3: 'BOU', 4: 'BRE', 5: 'BHA', 6: 'CHE', 7: 'CRY',
      8: 'EVE', 9: 'FUL', 10: 'IPS', 11: 'LEI', 12: 'LIV', 13: 'MCI', 14: 'MUN',
      15: 'NEW', 16: 'NFO', 17: 'SOU', 18: 'TOT', 19: 'WHU', 20: 'WOL'
    };
    return teamMap[teamId] || 'UNK';
  };

  const getPositionColor = (elementType: number) => {
    switch (elementType) {
      case 1: return "bg-yellow-100 text-yellow-800"; // GKP
      case 2: return "bg-green-100 text-green-800";   // DEF
      case 3: return "bg-blue-100 text-blue-800";     // MID
      case 4: return "bg-red-100 text-red-800";       // FWD
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPositionName = (elementType: number) => {
    switch (elementType) {
      case 1: return "GKP";
      case 2: return "DEF";
      case 3: return "MID";
      case 4: return "FWD";
      default: return "UNK";
    }
  };

  const formatValue = (value: string | number, type: 'decimal' | 'percentage' = 'decimal') => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return type === 'percentage' ? '0.0%' : '0.0';
    
    if (type === 'percentage') {
      return `${num.toFixed(1)}%`;
    }
    return num.toFixed(1);
  };

  const getPointsColor = (points: number) => {
    if (points >= 10) return "text-green-700 font-bold";
    if (points >= 6) return "text-green-600 font-semibold";
    if (points >= 3) return "text-blue-600 font-medium";
    if (points >= 1) return "text-gray-700";
    return "text-gray-500";
  };

  const totalStats = sortedHistory.reduce((acc, gw) => ({
    totalPoints: acc.totalPoints + gw.total_points,
    totalMinutes: acc.totalMinutes + gw.minutes,
    totalGoals: acc.totalGoals + gw.goals_scored,
    totalAssists: acc.totalAssists + gw.assists,
    totalCleanSheets: acc.totalCleanSheets + gw.clean_sheets,
    totalBonus: acc.totalBonus + gw.bonus,
    gameweeksPlayed: gw.minutes > 0 ? acc.gameweeksPlayed + 1 : acc.gameweeksPlayed
  }), {
    totalPoints: 0,
    totalMinutes: 0,
    totalGoals: 0,
    totalAssists: 0,
    totalCleanSheets: 0,
    totalBonus: 0,
    gameweeksPlayed: 0
  });

  // Mobile-responsive content component
  const GameweekContent = () => (
    <>
      {isLoading ? (
        <div className="space-y-4">
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Total Points</span>
              </div>
              <div className="text-xl font-bold text-blue-900">{totalStats.totalPoints}</div>
              <div className="text-xs text-blue-600">
                {totalStats.gameweeksPlayed > 0 ? (totalStats.totalPoints / totalStats.gameweeksPlayed).toFixed(1) : '0.0'} avg
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">Goals + Assists</span>
              </div>
              <div className="text-xl font-bold text-green-900">{totalStats.totalGoals + totalStats.totalAssists}</div>
              <div className="text-xs text-green-600">
                {totalStats.totalGoals}G / {totalStats.totalAssists}A
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">Minutes</span>
              </div>
              <div className="text-xl font-bold text-purple-900">{totalStats.totalMinutes}</div>
              <div className="text-xs text-purple-600">
                {totalStats.gameweeksPlayed > 0 ? (totalStats.totalMinutes / totalStats.gameweeksPlayed).toFixed(0) : '0'} avg
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">Clean Sheets</span>
              </div>
              <div className="text-xl font-bold text-orange-900">{totalStats.totalCleanSheets}</div>
              <div className="text-xs text-orange-600">
                {totalStats.totalBonus} bonus pts
              </div>
            </div>
          </div>

          {/* Gameweek by Gameweek Performance */}
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900">Gameweek Performance</h3>
              <p className="text-xs text-gray-600 mt-1">
                {sortedHistory.length} gameweeks • {totalStats.gameweeksPlayed} appearances
              </p>
            </div>
            
            {isMobile ? (
              <div className="divide-y divide-gray-100">
                {sortedHistory.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No gameweek data available for this player
                  </div>
                ) : (
                  sortedHistory.map((gw, index) => (
                    <div key={gw.round} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">GW{gw.round}</div>
                        <div className={`text-lg font-bold ${getPointsColor(gw.total_points)}`}>
                          {gw.total_points} pts
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Minutes</div>
                          <div className="font-medium">{gw.minutes}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Goals</div>
                          <div className="font-medium text-green-600">{gw.goals_scored}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Assists</div>
                          <div className="font-medium text-blue-600">{gw.assists}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">CS</div>
                          <div className="font-medium text-green-600">{gw.clean_sheets}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">GC</div>
                          <div className="font-medium text-red-600">{gw.goals_conceded}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Saves</div>
                          <div className="font-medium">{gw.saves}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Bonus</div>
                          <div className="font-medium text-purple-600">{gw.bonus}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">ICT Index</div>
                          <div className="font-medium">{formatValue(gw.ict_index)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Value</div>
                          <div className="font-medium">{formatValue((gw.value || 0) / 10)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Selected By</div>
                          <div className="font-medium">{(gw.selected || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 min-w-[60px]">GW</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Opponent</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">£</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Pts</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">G</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">A</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">CS</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">xG</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">xA</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">xGI</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">xGC</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Min</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">GC</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Sav</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Starts</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Bonus</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">BPS</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Influence</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Creativity</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Threat</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">ICT</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Pen Saved</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Pen Missed</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">YC</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">RC</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">OG</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Trans In</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Trans Out</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[70px]">Selected By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.length === 0 ? (
                      <tr>
                        <td colSpan={29} className="px-3 py-8 text-center text-gray-500">
                          No gameweek data available for this player
                        </td>
                      </tr>
                    ) : (
                      sortedHistory.map((gw, index) => {
                        const opponent = gw.opponent_team ? getTeamShortName(gw.opponent_team) : '-';
                        const venue = gw.was_home ? '(H)' : gw.was_home === false ? '(A)' : '';
                        return (
                          <tr 
                            key={gw.round} 
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                          >
                            <td className="px-2 py-3 font-medium text-gray-900">GW{gw.round}</td>
                            <td className="px-2 py-3 text-center text-gray-700">
                              <span className="font-medium">{opponent}</span>
                              <span className="text-xs ml-1 text-gray-500">{venue}</span>
                            </td>
                            <td className="px-2 py-3 text-center text-gray-700">{formatValue((gw.value || 0) / 10)}</td>
                            <td className={`px-2 py-3 text-center font-semibold ${getPointsColor(gw.total_points)}`}>{gw.total_points}</td>
                            <td className="px-2 py-3 text-center font-medium text-green-600">{gw.goals_scored}</td>
                            <td className="px-2 py-3 text-center font-medium text-blue-600">{gw.assists}</td>
                            <td className="px-2 py-3 text-center font-medium text-green-600">{gw.clean_sheets}</td>
                            <td className="px-2 py-3 text-center font-medium text-purple-600">{gw.expected_goals ? formatValue(gw.expected_goals) : '-'}</td>
                            <td className="px-2 py-3 text-center font-medium text-blue-600">{gw.expected_assists ? formatValue(gw.expected_assists) : '-'}</td>
                            <td className="px-2 py-3 text-center font-medium text-indigo-600">{gw.expected_goal_involvements ? formatValue(gw.expected_goal_involvements) : '-'}</td>
                            <td className="px-2 py-3 text-center font-medium text-red-600">{gw.expected_goals_conceded ? formatValue(gw.expected_goals_conceded) : '-'}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{gw.minutes}</td>
                            <td className="px-2 py-3 text-center text-red-600">{gw.goals_conceded}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{gw.saves}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{gw.starts ?? '-'}</td>
                            <td className="px-2 py-3 text-center font-medium text-purple-600">{gw.bonus}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{gw.bps}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.influence)}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.creativity)}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.threat)}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.ict_index)}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{gw.penalties_saved || 0}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{gw.penalties_missed || 0}</td>
                            <td className="px-2 py-3 text-center text-yellow-600">{gw.yellow_cards}</td>
                            <td className="px-2 py-3 text-center text-red-600">{gw.red_cards}</td>
                            <td className="px-2 py-3 text-center text-red-600">{gw.own_goals || 0}</td>
                            <td className="px-2 py-3 text-center text-green-600">{gw.transfers_in || 0}</td>
                            <td className="px-2 py-3 text-center text-red-600">{gw.transfers_out || 0}</td>
                            <td className="px-2 py-3 text-center text-gray-700">{(gw.selected || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[95vh] overflow-y-auto">
          <DrawerHeader className="pb-4">
            <DrawerTitle className="flex items-center gap-3 text-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div className="flex items-center gap-2 flex-wrap">
                <span>{player.web_name}</span>
                <Badge className={`text-xs font-medium ${getPositionColor(player.element_type)}`}>
                  {getPositionName(player.element_type)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {player.team_name || 'Unknown Team'}
                </Badge>
              </div>
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <GameweekContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div className="flex items-center gap-2">
              <span>{player.web_name}</span>
              <Badge className={`text-xs font-medium ${getPositionColor(player.element_type)}`}>
                {getPositionName(player.element_type)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {player.team_name || 'Unknown Team'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-auto min-h-[44px]"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <GameweekContent />
      </DialogContent>
    </Dialog>
  );

}
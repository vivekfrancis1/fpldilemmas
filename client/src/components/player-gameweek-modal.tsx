import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Target, Award, Shield, Clock, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  if (!player) return null;

  const gameweekHistory = data?.history || [];
  const sortedHistory = [...gameweekHistory].sort((a, b) => a.round - b.round);

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
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            {/* Gameweek by Gameweek Table */}
            <div className="bg-white rounded-lg border">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">Gameweek Performance</h3>
                <p className="text-xs text-gray-600 mt-1">
                  {sortedHistory.length} gameweeks • {totalStats.gameweeksPlayed} appearances
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 min-w-[60px]">GW</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Pts</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Min</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">G</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">A</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">CS</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">GC</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Saves</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">YC</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[45px]">RC</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Bonus</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">BPS</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Influence</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Creativity</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Threat</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">ICT</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Pen Saved</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Pen Missed</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Own Goals</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px]">Value</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Trans In</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Trans Out</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">Selected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.length === 0 ? (
                      <tr>
                        <td colSpan={23} className="px-3 py-8 text-center text-gray-500">
                          No gameweek data available for this player
                        </td>
                      </tr>
                    ) : (
                      sortedHistory.map((gw, index) => (
                        <tr 
                          key={gw.round} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-2 py-3 font-medium text-gray-900">GW{gw.round}</td>
                          <td className={`px-2 py-3 text-center font-semibold ${getPointsColor(gw.total_points)}`}>
                            {gw.total_points}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-700">{gw.minutes}</td>
                          <td className="px-2 py-3 text-center font-medium text-green-600">{gw.goals_scored}</td>
                          <td className="px-2 py-3 text-center font-medium text-blue-600">{gw.assists}</td>
                          <td className="px-2 py-3 text-center font-medium text-green-600">{gw.clean_sheets}</td>
                          <td className="px-2 py-3 text-center text-red-600">{gw.goals_conceded}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{gw.saves}</td>
                          <td className="px-2 py-3 text-center text-yellow-600">{gw.yellow_cards}</td>
                          <td className="px-2 py-3 text-center text-red-600">{gw.red_cards}</td>
                          <td className="px-2 py-3 text-center font-medium text-purple-600">{gw.bonus}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{gw.bps}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.influence)}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.creativity)}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.threat)}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.ict_index)}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{gw.penalties_saved || 0}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{gw.penalties_missed || 0}</td>
                          <td className="px-2 py-3 text-center text-red-600">{gw.own_goals || 0}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{formatValue((gw.value || 0) / 10)}</td>
                          <td className="px-2 py-3 text-center text-green-600">{gw.transfers_in || 0}</td>
                          <td className="px-2 py-3 text-center text-red-600">{gw.transfers_out || 0}</td>
                          <td className="px-2 py-3 text-center text-gray-700">{formatValue(gw.selected || 0, 'percentage')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
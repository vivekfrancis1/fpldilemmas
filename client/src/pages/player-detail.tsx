import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Calendar, TrendingUp, Target, Award, Shield, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BootstrapData } from "@shared/schema";
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

const teamMap: { [key: number]: string } = {
  1: 'ARS', 2: 'AVL', 3: 'BOU', 4: 'BRE', 5: 'BHA', 6: 'CHE', 7: 'CRY',
  8: 'EVE', 9: 'FUL', 10: 'IPS', 11: 'LEI', 12: 'LIV', 13: 'MCI', 14: 'MUN',
  15: 'NEW', 16: 'NFO', 17: 'SOU', 18: 'TOT', 19: 'WHU', 20: 'WOL'
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

const getPositionColor = (elementType: number) => {
  switch (elementType) {
    case 1: return "bg-yellow-100 text-yellow-800";
    case 2: return "bg-green-100 text-green-800";
    case 3: return "bg-blue-100 text-blue-800";
    case 4: return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getPointsColor = (points: number) => {
  if (points >= 10) return "text-green-700 font-bold";
  if (points >= 6) return "text-green-600 font-semibold";
  if (points >= 3) return "text-blue-600 font-medium";
  if (points >= 1) return "text-gray-700";
  return "text-gray-500";
};

const formatValue = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.0';
  return num.toFixed(1);
};

type ColumnDef = {
  key: string;
  label: string;
  shortLabel?: string;
  positions: number[];
  render: (gw: GameweekData) => JSX.Element;
  aggregate?: (history: GameweekData[]) => string | number;
};

export default function PlayerDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const playerId = parseInt(params.id || '0');

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 30 * 60 * 1000,
  });

  const player = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    return bootstrapData.elements.find((el: any) => el.id === playerId);
  }, [bootstrapData, playerId]);

  const { data: playerDetailData, isLoading } = useQuery<PlayerSummaryData>({
    queryKey: ["/api/element-summary", playerId],
    enabled: playerId > 0,
    staleTime: 5 * 60 * 1000,
  });

  const teamName = useMemo(() => {
    if (!player || !bootstrapData?.teams) return 'Unknown';
    const team = bootstrapData.teams.find((t: any) => t.id === player.team);
    return team?.short_name || team?.name || 'Unknown';
  }, [player, bootstrapData]);

  const sortedHistory = useMemo(() => {
    if (!playerDetailData?.history) return [];
    return [...playerDetailData.history].sort((a, b) => b.round - a.round);
  }, [playerDetailData]);

  const elementType = player?.element_type || 0;

  const columns: ColumnDef[] = useMemo(() => {
    const sumField = (history: GameweekData[], field: keyof GameweekData) =>
      history.reduce((s, gw) => s + (Number(gw[field]) || 0), 0);
    const sumFloatField = (history: GameweekData[], field: keyof GameweekData) =>
      history.reduce((s, gw) => s + (parseFloat(String(gw[field] || '0')) || 0), 0).toFixed(1);

    const allColumns: ColumnDef[] = [
      {
        key: 'opponent',
        label: 'Opponent',
        shortLabel: 'Opp',
        positions: [1, 2, 3, 4],
        render: (gw) => {
          const opponent = gw.opponent_team ? teamMap[gw.opponent_team] || 'UNK' : '-';
          const venue = gw.was_home ? '(H)' : gw.was_home === false ? '(A)' : '';
          return <span><span className="font-medium">{opponent}</span><span className="text-xs ml-1 text-gray-500">{venue}</span></span>;
        },
        aggregate: () => '',
      },
      {
        key: 'score',
        label: 'Score',
        positions: [1, 2, 3, 4],
        render: (gw) => {
          if (gw.team_h_score == null || gw.team_a_score == null) return <span>-</span>;
          return <span className="text-gray-700">{gw.team_h_score}-{gw.team_a_score}</span>;
        },
        aggregate: () => '',
      },
      {
        key: 'price',
        label: 'Price',
        shortLabel: '£',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{formatValue((gw.value || 0) / 10)}</span>,
        aggregate: () => '',
      },
      {
        key: 'pts',
        label: 'Points',
        shortLabel: 'Pts',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className={`font-semibold ${getPointsColor(gw.total_points)}`}>{gw.total_points}</span>,
        aggregate: (h) => sumField(h, 'total_points'),
      },
      {
        key: 'min',
        label: 'Minutes',
        shortLabel: 'Min',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{gw.minutes}</span>,
        aggregate: (h) => sumField(h, 'minutes'),
      },
      {
        key: 'starts',
        label: 'Starts',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{gw.starts ?? '-'}</span>,
        aggregate: (h) => h.reduce((s, gw) => s + (gw.starts ?? 0), 0),
      },
      {
        key: 'goals',
        label: 'Goals',
        shortLabel: 'G',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-green-600 font-medium">{gw.goals_scored}</span>,
        aggregate: (h) => sumField(h, 'goals_scored'),
      },
      {
        key: 'assists',
        label: 'Assists',
        shortLabel: 'A',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-blue-600 font-medium">{gw.assists}</span>,
        aggregate: (h) => sumField(h, 'assists'),
      },
      {
        key: 'xg',
        label: 'xG',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-purple-600">{gw.expected_goals ? formatValue(gw.expected_goals) : '-'}</span>,
        aggregate: (h) => sumFloatField(h, 'expected_goals'),
      },
      {
        key: 'xa',
        label: 'xA',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-blue-600">{gw.expected_assists ? formatValue(gw.expected_assists) : '-'}</span>,
        aggregate: (h) => sumFloatField(h, 'expected_assists'),
      },
      {
        key: 'xgi',
        label: 'xGI',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-indigo-600">{gw.expected_goal_involvements ? formatValue(gw.expected_goal_involvements) : '-'}</span>,
        aggregate: (h) => sumFloatField(h, 'expected_goal_involvements'),
      },
      {
        key: 'cs',
        label: 'Clean Sheets',
        shortLabel: 'CS',
        positions: [1, 2, 3],
        render: (gw) => <span className="text-green-600">{gw.clean_sheets}</span>,
        aggregate: (h) => sumField(h, 'clean_sheets'),
      },
      {
        key: 'gc',
        label: 'Goals Conceded',
        shortLabel: 'GC',
        positions: [1, 2],
        render: (gw) => <span className="text-red-600">{gw.goals_conceded}</span>,
        aggregate: (h) => sumField(h, 'goals_conceded'),
      },
      {
        key: 'xgc',
        label: 'xGC',
        positions: [1, 2],
        render: (gw) => <span className="text-red-600">{gw.expected_goals_conceded ? formatValue(gw.expected_goals_conceded) : '-'}</span>,
        aggregate: (h) => sumFloatField(h, 'expected_goals_conceded'),
      },
      {
        key: 'saves',
        label: 'Saves',
        shortLabel: 'Sav',
        positions: [1],
        render: (gw) => <span>{gw.saves}</span>,
        aggregate: (h) => sumField(h, 'saves'),
      },
      {
        key: 'pen_saved',
        label: 'Pen Saved',
        shortLabel: 'PS',
        positions: [1],
        render: (gw) => <span>{gw.penalties_saved || 0}</span>,
        aggregate: (h) => sumField(h, 'penalties_saved'),
      },
      {
        key: 'bonus',
        label: 'Bonus',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-purple-600 font-medium">{gw.bonus}</span>,
        aggregate: (h) => sumField(h, 'bonus'),
      },
      {
        key: 'bps',
        label: 'BPS',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{gw.bps}</span>,
        aggregate: (h) => sumField(h, 'bps'),
      },
      {
        key: 'yc',
        label: 'Yellow Cards',
        shortLabel: 'YC',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-yellow-600">{gw.yellow_cards}</span>,
        aggregate: (h) => sumField(h, 'yellow_cards'),
      },
      {
        key: 'rc',
        label: 'Red Cards',
        shortLabel: 'RC',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-red-600">{gw.red_cards}</span>,
        aggregate: (h) => sumField(h, 'red_cards'),
      },
    ];

    return allColumns.filter(col => col.positions.includes(elementType));
  }, [elementType]);

  const totalStats = useMemo(() => {
    const history = sortedHistory;
    const played = history.filter(gw => gw.minutes > 0);
    return {
      totalPoints: history.reduce((s, gw) => s + gw.total_points, 0),
      totalMinutes: history.reduce((s, gw) => s + gw.minutes, 0),
      totalGoals: history.reduce((s, gw) => s + gw.goals_scored, 0),
      totalAssists: history.reduce((s, gw) => s + gw.assists, 0),
      totalCleanSheets: history.reduce((s, gw) => s + gw.clean_sheets, 0),
      totalGoalsConceded: history.reduce((s, gw) => s + gw.goals_conceded, 0),
      totalBonus: history.reduce((s, gw) => s + gw.bonus, 0),
      totalSaves: history.reduce((s, gw) => s + gw.saves, 0),
      totalPenSaved: history.reduce((s, gw) => s + (gw.penalties_saved || 0), 0),
      gameweeksPlayed: played.length,
      avgPoints: played.length > 0 ? (history.reduce((s, gw) => s + gw.total_points, 0) / played.length).toFixed(1) : '0.0',
    };
  }, [sortedHistory]);

  if (!player && !isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation('/player-statistics')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Player Statistics
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Player not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <Button variant="ghost" onClick={() => setLocation('/player-statistics')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Player Statistics
      </Button>

      {player && (
        <>
          <Card className="border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {player.first_name} {player.second_name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs font-medium ${getPositionColor(elementType)}`}>
                        {getPositionName(elementType)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{teamName}</Badge>
                      <Badge variant="outline" className="text-xs">£{((player.now_cost || 0) / 10).toFixed(1)}m</Badge>
                    </div>
                  </div>
                </div>
                {player.news && (
                  <div className="sm:ml-auto">
                    <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      {player.news}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className={`grid gap-3 ${isMobile ? 'grid-cols-3' : 'grid-cols-5 lg:grid-cols-7'}`}>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Total Points</div>
                <div className="text-lg font-bold text-purple-700">{totalStats.totalPoints}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">PPG</div>
                <div className="text-lg font-bold text-blue-700">{player.points_per_game || totalStats.avgPoints}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Form</div>
                <div className="text-lg font-bold text-indigo-700">{player.form || '0.0'}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Own%</div>
                <div className="text-lg font-bold text-gray-700">{player.selected_by_percent || '0'}%</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Value</div>
                <div className="text-lg font-bold text-teal-700">{player.value_season || '0.0'}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Val Form</div>
                <div className="text-lg font-bold text-teal-600">{player.value_form || '0.0'}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Appearances</div>
                <div className="text-lg font-bold text-gray-700">{totalStats.gameweeksPlayed}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Goals</div>
                <div className="text-lg font-bold text-green-700">{totalStats.totalGoals}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Assists</div>
                <div className="text-lg font-bold text-blue-600">{totalStats.totalAssists}</div>
              </CardContent>
            </Card>
            {[1, 2, 3].includes(elementType) && (
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Clean Sheets</div>
                  <div className="text-lg font-bold text-green-600">{totalStats.totalCleanSheets}</div>
                </CardContent>
              </Card>
            )}
            {[1, 2].includes(elementType) && (
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Goals Conceded</div>
                  <div className="text-lg font-bold text-red-600">{totalStats.totalGoalsConceded}</div>
                </CardContent>
              </Card>
            )}
            {elementType === 1 && (
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Saves</div>
                  <div className="text-lg font-bold text-blue-600">{totalStats.totalSaves}</div>
                </CardContent>
              </Card>
            )}
            {elementType === 1 && (
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Pen Saved</div>
                  <div className="text-lg font-bold text-green-700">{totalStats.totalPenSaved}</div>
                </CardContent>
              </Card>
            )}
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Bonus</div>
                <div className="text-lg font-bold text-purple-600">{totalStats.totalBonus}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">DC</div>
                <div className="text-lg font-bold text-orange-600">{player.defensive_contribution || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Dream Team</div>
                <div className="text-lg font-bold text-amber-600">{player.dreamteam_count || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Price &Delta; GW</div>
                <div className={`text-lg font-bold ${(player.cost_change_event || 0) > 0 ? 'text-green-600' : (player.cost_change_event || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {((player.cost_change_event || 0) / 10).toFixed(1)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Price &Delta; Season</div>
                <div className={`text-lg font-bold ${(player.cost_change_start || 0) > 0 ? 'text-green-600' : (player.cost_change_start || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {((player.cost_change_start || 0) / 10).toFixed(1)}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Gameweek Performance
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {sortedHistory.length} gameweeks • {totalStats.gameweeksPlayed} appearances • Latest first
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
                <p className="text-sm text-gray-500">Loading player data...</p>
              </div>
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-gray-100">
              {sortedHistory.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No gameweek data available for this player
                </div>
              ) : (
                <>
                <div className="p-3 space-y-2 bg-purple-50 border-b-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800">Total</span>
                    <div className="text-lg font-bold text-purple-800">
                      {totalStats.totalPoints} pts
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-purple-600">Min</div>
                      <div className="font-bold text-purple-800">{totalStats.totalMinutes}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-purple-600">Goals</div>
                      <div className="font-bold text-purple-800">{totalStats.totalGoals}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-purple-600">Assists</div>
                      <div className="font-bold text-purple-800">{totalStats.totalAssists}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-purple-600">Bonus</div>
                      <div className="font-bold text-purple-800">{totalStats.totalBonus}</div>
                    </div>
                    {[1, 2, 3].includes(elementType) && (
                      <div className="text-center">
                        <div className="text-xs text-purple-600">CS</div>
                        <div className="font-bold text-purple-800">{totalStats.totalCleanSheets}</div>
                      </div>
                    )}
                    {elementType === 1 && (
                      <div className="text-center">
                        <div className="text-xs text-purple-600">Saves</div>
                        <div className="font-bold text-purple-800">{totalStats.totalSaves}</div>
                      </div>
                    )}
                  </div>
                </div>
                {sortedHistory.map((gw) => {
                  const opponent = gw.opponent_team ? teamMap[gw.opponent_team] || 'UNK' : '-';
                  const venue = gw.was_home ? '(H)' : gw.was_home === false ? '(A)' : '';
                  const score = gw.team_h_score != null && gw.team_a_score != null
                    ? `${gw.team_h_score}-${gw.team_a_score}` : '';
                  return (
                    <div key={gw.round} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">GW{gw.round}</span>
                          <span className="text-xs text-gray-500">vs {opponent} {venue}</span>
                          {score && <span className="text-xs text-gray-400">{score}</span>}
                        </div>
                        <div className={`text-lg font-bold ${getPointsColor(gw.total_points)}`}>
                          {gw.total_points} pts
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Min</div>
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
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Bonus</div>
                          <div className="font-medium text-purple-600">{gw.bonus}</div>
                        </div>
                        {[1, 2, 3].includes(elementType) && (
                          <div className="text-center">
                            <div className="text-xs text-gray-500">CS</div>
                            <div className="font-medium text-green-600">{gw.clean_sheets}</div>
                          </div>
                        )}
                        {elementType === 1 && (
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Saves</div>
                            <div className="font-medium">{gw.saves}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-700 min-w-[55px]">GW</th>
                    {columns.map(col => (
                      <th key={col.key} className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px] whitespace-nowrap">
                        {col.shortLabel || col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-gray-500">
                        No gameweek data available for this player
                      </td>
                    </tr>
                  ) : (
                    <>
                    <tr className="bg-purple-50 border-b-2 border-purple-200 font-bold">
                      <td className="px-2 py-2.5 font-bold text-purple-800">Total</td>
                      {columns.map(col => (
                        <td key={col.key} className="px-2 py-2.5 text-center font-bold text-purple-800">
                          {col.aggregate ? col.aggregate(sortedHistory) : ''}
                        </td>
                      ))}
                    </tr>
                    {sortedHistory.map((gw, index) => (
                      <tr
                        key={gw.round}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-2 py-2.5 font-medium text-gray-900">GW{gw.round}</td>
                        {columns.map(col => (
                          <td key={col.key} className="px-2 py-2.5 text-center">
                            {col.render(gw)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

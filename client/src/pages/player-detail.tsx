import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface SeasonHistoryData {
  season_name: string;
  start_cost: number;
  end_cost: number;
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
  starts?: number;
  clearances_blocks_interceptions?: number;
  recoveries?: number;
  tackles?: number;
  defensive_contribution?: number;
  expected_goals?: string;
  expected_assists?: string;
  expected_goal_involvements?: string;
  expected_goals_conceded?: string;
}

interface PlayerSummaryData {
  history: GameweekData[];
  fixtures: any[];
  history_past: SeasonHistoryData[];
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

const formatKickoff = (kickoffTime?: string) => {
  if (!kickoffTime) return '-';
  const date = new Date(kickoffTime);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

type ColumnDef = {
  key: string;
  label: string;
  shortLabel?: string;
  positions: number[];
  render: (gw: GameweekData) => JSX.Element;
  aggregate?: (history: GameweekData[]) => string | number;
};

type SeasonColumnDef = {
  key: string;
  label: string;
  render: (season: SeasonHistoryData) => JSX.Element;
};

// Ordered to match COLUMN_DEFINITIONS in player-stats-table.tsx (Player Statistics), so
// stat columns appear in the same relative sequence across both pages.
const SEASON_COLUMNS: SeasonColumnDef[] = [
  {
    key: 'price',
    label: '£ (Start→End)',
    render: (s) => <span>{formatValue((s.start_cost || 0) / 10)} → {formatValue((s.end_cost || 0) / 10)}</span>,
  },
  {
    key: 'pts',
    label: 'Pts',
    render: (s) => <span className={`font-semibold ${getPointsColor(s.total_points)}`}>{s.total_points}</span>,
  },
  { key: 'g', label: 'G', render: (s) => <span className="text-green-600 font-medium">{s.goals_scored}</span> },
  { key: 'a', label: 'A', render: (s) => <span className="text-blue-600 font-medium">{s.assists}</span> },
  { key: 'cs', label: 'CS', render: (s) => <span>{s.clean_sheets}</span> },
  { key: 'dc', label: 'DC', render: (s) => <span>{s.defensive_contribution ?? '-'}</span> },
  { key: 'xg', label: 'xG', render: (s) => <span className="text-purple-600">{s.expected_goals ? formatValue(s.expected_goals) : '-'}</span> },
  { key: 'xa', label: 'xA', render: (s) => <span className="text-blue-600">{s.expected_assists ? formatValue(s.expected_assists) : '-'}</span> },
  { key: 'xgi', label: 'xGI', render: (s) => <span className="text-indigo-600">{s.expected_goal_involvements ? formatValue(s.expected_goal_involvements) : '-'}</span> },
  { key: 'xgc', label: 'xGC', render: (s) => <span className="text-red-600">{s.expected_goals_conceded ? formatValue(s.expected_goals_conceded) : '-'}</span> },
  { key: 'min', label: 'Min', render: (s) => <span>{s.minutes}</span> },
  { key: 'gc', label: 'GC', render: (s) => <span className="text-red-600">{s.goals_conceded}</span> },
  { key: 'saves', label: 'Saves', render: (s) => <span>{s.saves}</span> },
  { key: 'tackles', label: 'Tackles', render: (s) => <span>{s.tackles ?? '-'}</span> },
  { key: 'recoveries', label: 'Recoveries', render: (s) => <span>{s.recoveries ?? '-'}</span> },
  { key: 'cbi', label: 'CBI', render: (s) => <span>{s.clearances_blocks_interceptions ?? '-'}</span> },
  { key: 'starts', label: 'Starts', render: (s) => <span>{s.starts ?? '-'}</span> },
  { key: 'bonus', label: 'Bonus', render: (s) => <span className="text-purple-600 font-medium">{s.bonus}</span> },
  { key: 'bps', label: 'BPS', render: (s) => <span>{s.bps}</span> },
  { key: 'influence', label: 'Influence', render: (s) => <span>{formatValue(s.influence)}</span> },
  { key: 'creativity', label: 'Creativity', render: (s) => <span>{formatValue(s.creativity)}</span> },
  { key: 'threat', label: 'Threat', render: (s) => <span>{formatValue(s.threat)}</span> },
  { key: 'ict', label: 'ICT', render: (s) => <span>{formatValue(s.ict_index)}</span> },
  { key: 'pen_saved', label: 'Pen Saved', render: (s) => <span>{s.penalties_saved || 0}</span> },
  { key: 'pen_missed', label: 'Pen Missed', render: (s) => <span>{s.penalties_missed || 0}</span> },
  { key: 'yc', label: 'YC', render: (s) => <span className="text-yellow-600">{s.yellow_cards}</span> },
  { key: 'rc', label: 'RC', render: (s) => <span className="text-red-600">{s.red_cards}</span> },
  { key: 'og', label: 'OG', render: (s) => <span>{s.own_goals || 0}</span> },
];

export default function PlayerDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const playerId = parseInt(params.id || '0');
  const [returnPath] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('from') || '/player-statistics';
  });

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

  // Last season (2025/26) gameweek-by-gameweek breakdown. FPL's live element-summary
  // "history" field only ever covers the current season, so this is its own source
  // (this app's own gameweek_player_data archive, name-crosswalked to the player).
  const { data: lastSeasonData, isLoading: isLastSeasonLoading } = useQuery<{ history: GameweekData[] }>({
    queryKey: ["/api/player-gameweek-history", playerId, "2025/26"],
    queryFn: async () => {
      const response = await fetch(`/api/player-gameweek-history/${playerId}?season=2025%2F26`);
      if (!response.ok) throw new Error('Failed to fetch 2025/26 gameweek history');
      return response.json();
    },
    enabled: playerId > 0,
    staleTime: 30 * 60 * 1000,
  });

  const sortedLastSeasonHistory = useMemo(() => {
    if (!lastSeasonData?.history) return [];
    return [...lastSeasonData.history].sort((a, b) => b.round - a.round);
  }, [lastSeasonData]);

  const seasonHistory = useMemo(() => {
    return [...(playerDetailData?.history_past || [])].sort((a, b) => b.season_name.localeCompare(a.season_name));
  }, [playerDetailData]);

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

    // Ordered to match COLUMN_DEFINITIONS in player-stats-table.tsx (Player Statistics) —
    // opponent/date/score are identity columns (like the pinned Player column there) and
    // stay fixed up front; everything else follows the same relative sequence.
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
        key: 'date',
        label: 'Date',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-gray-600 text-xs">{formatKickoff(gw.kickoff_time)}</span>,
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
        key: 'cs',
        label: 'Clean Sheets',
        shortLabel: 'CS',
        positions: [1, 2, 3],
        render: (gw) => <span className="text-green-600">{gw.clean_sheets}</span>,
        aggregate: (h) => sumField(h, 'clean_sheets'),
      },
      {
        key: 'selected',
        label: 'Selected By',
        shortLabel: 'Sel',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{(gw.selected || 0).toLocaleString()}</span>,
        aggregate: () => '',
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
        key: 'xgc',
        label: 'xGC',
        positions: [1, 2],
        render: (gw) => <span className="text-red-600">{gw.expected_goals_conceded ? formatValue(gw.expected_goals_conceded) : '-'}</span>,
        aggregate: (h) => sumFloatField(h, 'expected_goals_conceded'),
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
        key: 'gc',
        label: 'Goals Conceded',
        shortLabel: 'GC',
        positions: [1, 2],
        render: (gw) => <span className="text-red-600">{gw.goals_conceded}</span>,
        aggregate: (h) => sumField(h, 'goals_conceded'),
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
        key: 'starts',
        label: 'Starts',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{gw.starts ?? '-'}</span>,
        aggregate: (h) => h.reduce((s, gw) => s + (gw.starts ?? 0), 0),
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
        key: 'transfers_in',
        label: 'Transfers In',
        shortLabel: 'T In',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-green-600">{(gw.transfers_in || 0).toLocaleString()}</span>,
        aggregate: (h) => sumField(h, 'transfers_in').toLocaleString(),
      },
      {
        key: 'transfers_out',
        label: 'Transfers Out',
        shortLabel: 'T Out',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-red-600">{(gw.transfers_out || 0).toLocaleString()}</span>,
        aggregate: (h) => sumField(h, 'transfers_out').toLocaleString(),
      },
      {
        key: 'influence',
        label: 'Influence',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{formatValue(gw.influence)}</span>,
        aggregate: (h) => sumFloatField(h, 'influence'),
      },
      {
        key: 'creativity',
        label: 'Creativity',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{formatValue(gw.creativity)}</span>,
        aggregate: (h) => sumFloatField(h, 'creativity'),
      },
      {
        key: 'threat',
        label: 'Threat',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{formatValue(gw.threat)}</span>,
        aggregate: (h) => sumFloatField(h, 'threat'),
      },
      {
        key: 'ict',
        label: 'ICT Index',
        shortLabel: 'ICT',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{formatValue(gw.ict_index)}</span>,
        aggregate: (h) => sumFloatField(h, 'ict_index'),
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
        key: 'pen_missed',
        label: 'Pen Missed',
        shortLabel: 'PM',
        positions: [1, 2, 3, 4],
        render: (gw) => <span>{gw.penalties_missed || 0}</span>,
        aggregate: (h) => sumField(h, 'penalties_missed'),
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
      {
        key: 'og',
        label: 'Own Goals',
        shortLabel: 'OG',
        positions: [1, 2, 3, 4],
        render: (gw) => <span className="text-red-600">{gw.own_goals || 0}</span>,
        aggregate: (h) => sumField(h, 'own_goals'),
      },
    ];

    return allColumns.filter(col => col.positions.includes(elementType));
  }, [elementType]);

  // Gameweek-by-gameweek card, reused for both the current-season and 2025/26 tabs.
  // Mobile renders the same `columns` set (minus opponent/score, shown in the row header)
  // in a compact grid, so every column added above shows up on mobile too.
  const renderGameweekCard = (history: GameweekData[], loading: boolean) => {
    const gameweeksPlayed = history.filter(gw => gw.minutes > 0).length;
    const mobileColumns = columns.filter(col => col.key !== 'opponent' && col.key !== 'score' && col.key !== 'date');

    return (
      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Gameweek Performance
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {history.length} gameweeks • {gameweeksPlayed} appearances • Latest first
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
                <p className="text-sm text-gray-500">Loading player data...</p>
              </div>
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No gameweek data available for this player
                </div>
              ) : (
                <>
                <div className="p-3 space-y-2 bg-purple-50 border-b-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800">Total</span>
                    <div className="text-lg font-bold text-purple-800">
                      {columns.find(c => c.key === 'pts')?.aggregate?.(history)} pts
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {mobileColumns.filter(col => col.aggregate && col.key !== 'pts').map(col => {
                      const value = col.aggregate!(history);
                      if (value === '') return null;
                      return (
                        <div key={col.key} className="text-center">
                          <div className="text-xs text-purple-600">{col.shortLabel || col.label}</div>
                          <div className="font-bold text-purple-800">{value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {history.map((gw) => {
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
                        {mobileColumns.filter(col => col.key !== 'pts').map(col => (
                          <div key={col.key} className="text-center">
                            <div className="text-xs text-gray-500">{col.shortLabel || col.label}</div>
                            <div className="font-medium">{col.render(gw)}</div>
                          </div>
                        ))}
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
                  {history.length === 0 ? (
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
                          {col.aggregate ? col.aggregate(history) : ''}
                        </td>
                      ))}
                    </tr>
                    {history.map((gw, index) => (
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
    );
  };

  if (!player && !isLoading) {
    return (
      <div className="w-full p-4 sm:p-6">
        <Button variant="ghost" onClick={() => setLocation(returnPath)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
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
    <div className="w-full p-2 sm:p-4 md:p-6 space-y-4">
      <Button variant="ghost" onClick={() => setLocation(returnPath)} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {player && (
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
      )}

      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Season History
            </h3>
            <p className="text-xs text-gray-600 mt-1">{seasonHistory.length} seasons</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 min-w-[70px]">Season</th>
                  {SEASON_COLUMNS.map(col => (
                    <th key={col.key} className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px] whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seasonHistory.length === 0 ? (
                  <tr>
                    <td colSpan={SEASON_COLUMNS.length + 1} className="px-3 py-8 text-center text-gray-500">
                      No season history available for this player
                    </td>
                  </tr>
                ) : (
                  seasonHistory.map((season, index) => (
                    <tr
                      key={season.season_name}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-2 py-3 font-medium text-gray-900">{season.season_name}</td>
                      {SEASON_COLUMNS.map(col => (
                        <td key={col.key} className="px-2 py-3 text-center">
                          {col.render(season)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">2026/27 (Current)</TabsTrigger>
          <TabsTrigger value="2025/26">2025/26 Season</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="mt-4">
          {renderGameweekCard(sortedHistory, isLoading)}
        </TabsContent>
        <TabsContent value="2025/26" className="mt-4">
          {renderGameweekCard(sortedLastSeasonHistory, isLastSeasonLoading)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

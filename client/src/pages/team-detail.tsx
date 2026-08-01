import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Calendar, Loader2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BootstrapData, CURRENT_SEASON } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

const LAST_SEASON = "2025/26";

interface TeamStanding {
  id: number;
  name: string;
  shortName: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  expectedGoalsFor: number;
  expectedGoalsAgainst: number;
  tackles: number;
  defensiveActions: number;
  defensiveContributions: number;
  defensiveContributionsConceded: number;
}

interface RawFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  kickoff_time?: string;
  finished: boolean;
}

interface HistoricalFixture {
  id: number;
  event: number;
  team_h_name: string;
  team_a_name: string;
  team_h_score: number | null;
  team_a_score: number | null;
  kickoff_time?: string;
  finished: boolean;
}

interface TeamGwStats {
  fixture_id: number;
  gameweek: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  bonus: number;
  bps: number;
  starts: number;
  defensive_contribution: number;
  tackles: number;
  recoveries: number;
  clearances_blocks_interceptions: number;
  expected_goals: number;
  expected_assists: number;
  expected_goals_conceded: number;
}

interface GameweekRow {
  gameweek: number;
  opponent: string;
  venue: 'H' | 'A';
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
  points: number;
  kickoffTime?: string;
  stats?: TeamGwStats;
}

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

const getResultColor = (result: 'W' | 'D' | 'L') => {
  if (result === 'W') return 'text-green-600 font-bold';
  if (result === 'D') return 'text-gray-600 font-medium';
  return 'text-red-600 font-medium';
};

type SeasonColumnDef = {
  key: string;
  label: string;
  render: (team: TeamStanding) => JSX.Element;
};

// Ordered to roughly follow the Team Statistics table (current-standings.tsx): record,
// goals, points first, then clean sheets/cards/saves, then expected-goals and defensive
// contribution stats.
const SEASON_COLUMNS: SeasonColumnDef[] = [
  { key: 'played', label: 'MP', render: (t) => <span>{t.played}</span> },
  { key: 'wins', label: 'W', render: (t) => <span className="text-green-600 font-medium">{t.wins}</span> },
  { key: 'draws', label: 'D', render: (t) => <span className="text-gray-600">{t.draws}</span> },
  { key: 'losses', label: 'L', render: (t) => <span className="text-red-600 font-medium">{t.losses}</span> },
  { key: 'gf', label: 'GF', render: (t) => <span>{t.goalsFor}</span> },
  { key: 'ga', label: 'GA', render: (t) => <span>{t.goalsAgainst}</span> },
  { key: 'gd', label: 'GD', render: (t) => <span className={t.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>{t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</span> },
  { key: 'pts', label: 'Pts', render: (t) => <span className="font-bold">{t.points}</span> },
  { key: 'cs', label: 'CS', render: (t) => <span>{t.cleanSheets}</span> },
  { key: 'xgf', label: 'xGF', render: (t) => <span className="text-indigo-600">{formatValue(t.expectedGoalsFor)}</span> },
  { key: 'xga', label: 'xGA', render: (t) => <span className="text-indigo-500">{formatValue(t.expectedGoalsAgainst)}</span> },
  { key: 'dc', label: 'DC', render: (t) => <span className="text-teal-700">{t.defensiveContributions}</span> },
  { key: 'dcc', label: 'DC Conceded', render: (t) => <span className="text-teal-800">{t.defensiveContributionsConceded}</span> },
  { key: 'tackles', label: 'Tackles', render: (t) => <span>{t.tackles}</span> },
  { key: 'defensive_actions', label: 'Defensive Actions', render: (t) => <span>{t.defensiveActions}</span> },
  { key: 'yc', label: 'YC', render: (t) => <span className="text-yellow-600">{t.yellowCards}</span> },
  { key: 'rc', label: 'RC', render: (t) => <span className="text-red-600">{t.redCards}</span> },
  { key: 'saves', label: 'Saves', render: (t) => <span>{t.saves}</span> },
  { key: 'pen_saved', label: 'Pen Saved', render: (t) => <span>{t.penaltiesSaved}</span> },
  { key: 'pen_missed', label: 'Pen Missed', render: (t) => <span>{t.penaltiesMissed}</span> },
  { key: 'og', label: 'OG', render: (t) => <span>{t.ownGoals}</span> },
];

type GwColumnDef = {
  key: string;
  label: string;
  shortLabel?: string;
  render: (row: GameweekRow) => JSX.Element;
  aggregate?: (rows: GameweekRow[]) => string | number;
};

export default function TeamDetail() {
  const params = useParams<{ name: string }>();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const teamName = decodeURIComponent(params.name || '');
  const returnPath = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('from') || '/current-standings';
  })();

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 30 * 60 * 1000,
  });

  const bootstrapTeam = useMemo(() => {
    return bootstrapData?.teams?.find((t: any) => t.name === teamName);
  }, [bootstrapData, teamName]);

  const { data: currentStandings, isLoading: isCurrentStandingsLoading } = useQuery<TeamStanding[]>({
    queryKey: ["/api/current-standings", "all", "current"],
    queryFn: async () => {
      const response = await fetch(`/api/current-standings?venue=all`);
      if (!response.ok) throw new Error('Failed to fetch current standings');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: lastSeasonStandings, isLoading: isLastSeasonStandingsLoading } = useQuery<TeamStanding[]>({
    queryKey: ["/api/current-standings", "all", LAST_SEASON],
    queryFn: async () => {
      const response = await fetch(`/api/current-standings?venue=all&season=${encodeURIComponent(LAST_SEASON)}`);
      if (!response.ok) throw new Error('Failed to fetch last season standings');
      return response.json();
    },
    staleTime: 30 * 60 * 1000,
  });

  const currentTeamStanding = useMemo(
    () => currentStandings?.find(t => t.name === teamName),
    [currentStandings, teamName]
  );
  const lastSeasonTeamStanding = useMemo(
    () => lastSeasonStandings?.find(t => t.name === teamName),
    [lastSeasonStandings, teamName]
  );

  const seasonHistory = useMemo(() => {
    const rows: { seasonName: string; standing: TeamStanding }[] = [];
    if (currentTeamStanding) rows.push({ seasonName: `${CURRENT_SEASON} (Current)`, standing: currentTeamStanding });
    if (lastSeasonTeamStanding) rows.push({ seasonName: LAST_SEASON, standing: lastSeasonTeamStanding });
    return rows;
  }, [currentTeamStanding, lastSeasonTeamStanding]);

  // Current-season fixtures (live FPL data, team ids resolved via bootstrap)
  const { data: currentFixtures, isLoading: isCurrentFixturesLoading } = useQuery<RawFixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // 2025/26 fixtures (season_fixtures_archive, embedded team names — no ID crosswalk needed)
  const { data: lastSeasonFixtures, isLoading: isLastSeasonFixturesLoading } = useQuery<HistoricalFixture[]>({
    queryKey: ["/api/fixtures-history", LAST_SEASON],
    queryFn: async () => {
      const response = await fetch(`/api/fixtures-history?season=${encodeURIComponent(LAST_SEASON)}`);
      if (!response.ok) throw new Error('Failed to fetch 2025/26 fixtures');
      return response.json();
    },
    staleTime: 30 * 60 * 1000,
  });

  // Team-level per-fixture aggregated player stats (goals, cards, bonus, DC, etc.). Grouped by
  // fixture_id, not gameweek — a postponed fixture can share its gameweek number with another
  // match (e.g. two Arsenal 2025/26 fixtures both tagged gameweek 26), so matching by gameweek
  // would attach the same stats bundle to both fixture rows and double-count it in the total.
  const { data: currentTeamGwStats, isLoading: isCurrentTeamGwStatsLoading } = useQuery<{ fixtures: TeamGwStats[] }>({
    queryKey: ["/api/team-gameweek-stats", teamName, CURRENT_SEASON],
    queryFn: async () => {
      const response = await fetch(`/api/team-gameweek-stats/${encodeURIComponent(teamName)}`);
      if (!response.ok) throw new Error('Failed to fetch current-season team gameweek stats');
      return response.json();
    },
    enabled: !!teamName,
    staleTime: 5 * 60 * 1000,
  });

  const { data: lastSeasonTeamGwStats, isLoading: isLastSeasonTeamGwStatsLoading } = useQuery<{ fixtures: TeamGwStats[] }>({
    queryKey: ["/api/team-gameweek-stats", teamName, LAST_SEASON],
    queryFn: async () => {
      const response = await fetch(`/api/team-gameweek-stats/${encodeURIComponent(teamName)}?season=${encodeURIComponent(LAST_SEASON)}`);
      if (!response.ok) throw new Error('Failed to fetch 2025/26 team gameweek stats');
      return response.json();
    },
    enabled: !!teamName,
    staleTime: 30 * 60 * 1000,
  });

  // Merge fixture results with aggregated player stats for the current season
  const currentGameweekRows = useMemo((): GameweekRow[] => {
    if (!currentFixtures || !bootstrapTeam) return [];
    const statsByFixtureId = new Map<number, TeamGwStats>();
    (currentTeamGwStats?.fixtures || []).forEach(f => statsByFixtureId.set(f.fixture_id, f));

    const rows: GameweekRow[] = [];
    for (const fixture of currentFixtures) {
      if (!fixture.event || !fixture.finished) continue;
      const isHome = fixture.team_h === bootstrapTeam.id;
      const isAway = fixture.team_a === bootstrapTeam.id;
      if (!isHome && !isAway) continue;

      const goalsFor = isHome ? fixture.team_h_score : fixture.team_a_score;
      const goalsAgainst = isHome ? fixture.team_a_score : fixture.team_h_score;
      if (goalsFor == null || goalsAgainst == null) continue;

      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      const opponent = bootstrapData?.teams?.find((t: any) => t.id === opponentId)?.short_name || 'UNK';
      const result: 'W' | 'D' | 'L' = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D';

      rows.push({
        gameweek: fixture.event,
        opponent,
        venue: isHome ? 'H' : 'A',
        goalsFor,
        goalsAgainst,
        result,
        points: result === 'W' ? 3 : result === 'D' ? 1 : 0,
        kickoffTime: fixture.kickoff_time,
        stats: statsByFixtureId.get(fixture.id),
      });
    }
    return rows.sort((a, b) => b.gameweek - a.gameweek);
  }, [currentFixtures, bootstrapTeam, bootstrapData, currentTeamGwStats]);

  // Merge fixture results with aggregated player stats for 2025/26
  const lastSeasonGameweekRows = useMemo((): GameweekRow[] => {
    if (!lastSeasonFixtures) return [];
    const statsByFixtureId = new Map<number, TeamGwStats>();
    (lastSeasonTeamGwStats?.fixtures || []).forEach(f => statsByFixtureId.set(f.fixture_id, f));

    const rows: GameweekRow[] = [];
    for (const fixture of lastSeasonFixtures) {
      const isHome = fixture.team_h_name === teamName;
      const isAway = fixture.team_a_name === teamName;
      if (!isHome && !isAway) continue;
      if (!fixture.finished) continue;

      const goalsFor = isHome ? fixture.team_h_score : fixture.team_a_score;
      const goalsAgainst = isHome ? fixture.team_a_score : fixture.team_h_score;
      if (goalsFor == null || goalsAgainst == null) continue;

      const opponent = isHome ? fixture.team_a_name : fixture.team_h_name;
      const result: 'W' | 'D' | 'L' = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D';

      rows.push({
        gameweek: fixture.event,
        opponent,
        venue: isHome ? 'H' : 'A',
        goalsFor,
        goalsAgainst,
        result,
        points: result === 'W' ? 3 : result === 'D' ? 1 : 0,
        kickoffTime: fixture.kickoff_time,
        stats: statsByFixtureId.get(fixture.id),
      });
    }
    return rows.sort((a, b) => b.gameweek - a.gameweek);
  }, [lastSeasonFixtures, teamName, lastSeasonTeamGwStats]);

  const gwColumns: GwColumnDef[] = useMemo(() => {
    const sumNum = (rows: GameweekRow[], field: keyof GameweekRow) =>
      rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
    const sumStat = (rows: GameweekRow[], field: keyof TeamGwStats) =>
      rows.reduce((s, r) => s + (Number(r.stats?.[field]) || 0), 0);
    const sumFloatStat = (rows: GameweekRow[], field: keyof TeamGwStats) =>
      rows.reduce((s, r) => s + (Number(r.stats?.[field]) || 0), 0).toFixed(1);

    return [
      { key: 'opponent', label: 'Opponent', shortLabel: 'Opp', render: (r) => <span><span className="font-medium">{r.opponent}</span><span className="text-xs ml-1 text-gray-500">({r.venue})</span></span>, aggregate: () => '' },
      { key: 'date', label: 'Date', render: (r) => <span className="text-gray-600 text-xs">{formatKickoff(r.kickoffTime)}</span>, aggregate: () => '' },
      { key: 'score', label: 'Score', render: (r) => <span className="text-gray-700">{r.goalsFor}-{r.goalsAgainst}</span>, aggregate: () => '' },
      { key: 'result', label: 'Result', render: (r) => <span className={getResultColor(r.result)}>{r.result}</span>, aggregate: () => '' },
      { key: 'pts', label: 'Points', shortLabel: 'Pts', render: (r) => <span className="font-semibold">{r.points}</span>, aggregate: (rows) => sumNum(rows, 'points') },
      { key: 'gf', label: 'GF', render: (r) => <span className="text-green-600 font-medium">{r.goalsFor}</span>, aggregate: (rows) => sumNum(rows, 'goalsFor') },
      { key: 'ga', label: 'GA', render: (r) => <span className="text-red-600">{r.goalsAgainst}</span>, aggregate: (rows) => sumNum(rows, 'goalsAgainst') },
      { key: 'cs', label: 'Clean Sheet', shortLabel: 'CS', render: (r) => <span>{r.goalsAgainst === 0 ? 'Yes' : '-'}</span>, aggregate: (rows) => rows.filter(r => r.goalsAgainst === 0).length },
      { key: 'xg', label: 'xG', render: (r) => <span className="text-purple-600">{r.stats ? formatValue(r.stats.expected_goals) : '-'}</span>, aggregate: (rows) => sumFloatStat(rows, 'expected_goals') },
      { key: 'xa', label: 'xA', render: (r) => <span className="text-blue-600">{r.stats ? formatValue(r.stats.expected_assists) : '-'}</span>, aggregate: (rows) => sumFloatStat(rows, 'expected_assists') },
      { key: 'xgc', label: 'xGC', render: (r) => <span className="text-red-600">{r.stats ? formatValue(r.stats.expected_goals_conceded) : '-'}</span>, aggregate: (rows) => sumFloatStat(rows, 'expected_goals_conceded') },
      { key: 'assists', label: 'Assists', shortLabel: 'A', render: (r) => <span>{r.stats?.assists ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'assists') },
      { key: 'dc', label: 'DC', render: (r) => <span className="text-teal-700">{r.stats?.defensive_contribution ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'defensive_contribution') },
      { key: 'tackles', label: 'Tackles', render: (r) => <span>{r.stats?.tackles ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'tackles') },
      { key: 'recoveries', label: 'Recoveries', render: (r) => <span>{r.stats?.recoveries ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'recoveries') },
      { key: 'cbi', label: 'CBI', render: (r) => <span>{r.stats?.clearances_blocks_interceptions ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'clearances_blocks_interceptions') },
      { key: 'saves', label: 'Saves', shortLabel: 'Sav', render: (r) => <span>{r.stats?.saves ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'saves') },
      { key: 'pen_saved', label: 'Pen Saved', render: (r) => <span>{r.stats?.penalties_saved ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'penalties_saved') },
      { key: 'pen_missed', label: 'Pen Missed', render: (r) => <span>{r.stats?.penalties_missed ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'penalties_missed') },
      { key: 'og', label: 'Own Goals', shortLabel: 'OG', render: (r) => <span>{r.stats?.own_goals ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'own_goals') },
      { key: 'bonus', label: 'Bonus', render: (r) => <span className="text-purple-600 font-medium">{r.stats?.bonus ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'bonus') },
      { key: 'bps', label: 'BPS', render: (r) => <span>{r.stats?.bps ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'bps') },
      { key: 'yc', label: 'Yellow Cards', shortLabel: 'YC', render: (r) => <span className="text-yellow-600">{r.stats?.yellow_cards ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'yellow_cards') },
      { key: 'rc', label: 'Red Cards', shortLabel: 'RC', render: (r) => <span className="text-red-600">{r.stats?.red_cards ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'red_cards') },
      { key: 'starts', label: 'Starts', render: (r) => <span>{r.stats?.starts ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'starts') },
      { key: 'minutes', label: 'Minutes', shortLabel: 'Min', render: (r) => <span>{r.stats?.minutes ?? '-'}</span>, aggregate: (rows) => sumStat(rows, 'minutes') },
    ];
  }, []);

  const renderGameweekCard = (rows: GameweekRow[], loading: boolean) => (
    <Card className="border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Gameweek Performance
          </h3>
          <p className="text-xs text-gray-600 mt-1">{rows.length} gameweeks • Latest first</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
              <p className="text-sm text-gray-500">Loading team data...</p>
            </div>
          </div>
        ) : isMobile ? (
          <div className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">No gameweek data available for this team</div>
            ) : (
              <>
              <div className="p-3 space-y-2 bg-purple-50 border-b-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-800">Total</span>
                  <div className="text-lg font-bold text-purple-800">
                    {gwColumns.find(c => c.key === 'pts')?.aggregate?.(rows)} pts
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {gwColumns.filter(col => col.aggregate && !['opponent', 'date', 'score', 'result', 'pts'].includes(col.key)).map(col => {
                    const value = col.aggregate!(rows);
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
              {rows.map((r) => (
                <div key={r.gameweek} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">GW{r.gameweek}</span>
                      <span className="text-xs text-gray-500">vs {r.opponent} ({r.venue})</span>
                    </div>
                    <div className={`text-lg ${getResultColor(r.result)}`}>{r.goalsFor}-{r.goalsAgainst}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {gwColumns.filter(c => !['opponent', 'date', 'score', 'result'].includes(c.key)).map(col => (
                      <div key={col.key} className="text-center">
                        <div className="text-xs text-gray-500">{col.shortLabel || col.label}</div>
                        <div className="font-medium">{col.render(r)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 min-w-[55px]">GW</th>
                  {gwColumns.map(col => (
                    <th key={col.key} className="px-2 py-2 text-center font-medium text-gray-700 min-w-[50px] whitespace-nowrap">
                      {col.shortLabel || col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={gwColumns.length + 1} className="px-3 py-8 text-center text-gray-500">
                      No gameweek data available for this team
                    </td>
                  </tr>
                ) : (
                  <>
                  <tr className="bg-purple-50 border-b-2 border-purple-200 font-bold">
                    <td className="px-2 py-2.5 font-bold text-purple-800">Total</td>
                    {gwColumns.map(col => (
                      <td key={col.key} className="px-2 py-2.5 text-center font-bold text-purple-800">
                        {col.aggregate ? col.aggregate(rows) : ''}
                      </td>
                    ))}
                  </tr>
                  {rows.map((r, index) => (
                    <tr key={r.gameweek} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-2 py-2.5 font-medium text-gray-900">GW{r.gameweek}</td>
                      {gwColumns.map(col => (
                        <td key={col.key} className="px-2 py-2.5 text-center">{col.render(r)}</td>
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

  const isLoading = isCurrentStandingsLoading || isLastSeasonStandingsLoading;
  const teamCrestCode = bootstrapTeam?.code;

  if (!teamName) {
    return (
      <div className="w-full p-4 sm:p-6">
        <Button variant="ghost" onClick={() => setLocation(returnPath)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">Team not found</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-2 sm:p-4 md:p-6 space-y-4">
      <Button variant="ghost" onClick={() => setLocation(returnPath)} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            {teamCrestCode && (
              <img
                src={teamCrestCode === 14
                  ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                  : `https://resources.premierleague.com/premierleague/badges/t${teamCrestCode}.png`}
                alt={`${teamName} badge`}
                className="w-10 h-10 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{teamName}</h1>
              {currentTeamStanding && (
                <Badge variant="outline" className="text-xs mt-1">
                  <Trophy className="h-3 w-3 mr-1" /> {currentTeamStanding.position}{currentTeamStanding.position === 1 ? 'st' : currentTeamStanding.position === 2 ? 'nd' : currentTeamStanding.position === 3 ? 'rd' : 'th'} in {CURRENT_SEASON}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Season History
            </h3>
            <p className="text-xs text-gray-600 mt-1">{seasonHistory.length} seasons</p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-700 min-w-[110px]">Season</th>
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
                        No season history available for this team
                      </td>
                    </tr>
                  ) : (
                    seasonHistory.map((row, index) => (
                      <tr key={row.seasonName} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-2 py-3 font-medium text-gray-900">{row.seasonName}</td>
                        {SEASON_COLUMNS.map(col => (
                          <td key={col.key} className="px-2 py-3 text-center">{col.render(row.standing)}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">{CURRENT_SEASON} (Current)</TabsTrigger>
          <TabsTrigger value="last">{LAST_SEASON} Season</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="mt-4">
          {renderGameweekCard(currentGameweekRows, isCurrentFixturesLoading || isCurrentTeamGwStatsLoading)}
        </TabsContent>
        <TabsContent value="last" className="mt-4">
          {renderGameweekCard(lastSeasonGameweekRows, isLastSeasonFixturesLoading || isLastSeasonTeamGwStatsLoading)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

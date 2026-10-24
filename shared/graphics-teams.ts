// Pure builders for the team graphics of the Graphics Maker: Team Projections and the Projected Table (upcoming), the
// League Table and Team History (past). Nothing here is a model of its own: projections are the site's own team
// projections (goals, goals against, clean sheets, assists) averaged over the chosen gameweeks, the projected table is the
// site's projected standings, and the league table and a club's results are the live standings and FPL's own fixtures.
// Missing data is null or left out, never invented.

import { DEFAULT_SPEC, MAX_RANGE_GAMEWEEKS, TEAM_METRIC_IDS, encodeSpec, type GraphicSpec, type TeamMetricId, type VenueId } from "./graphics";
import { isFixtureResult, type MatchFixtureInput } from "./graphics-matches";

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Team Projections ----------

export interface TeamMetric {
  id: TeamMetricId;
  label: string;
  /** The API route that serves it. */
  endpoint: string;
  /** The per-fixture value inside `fixtureDetails`. */
  detailKey: string;
  /** Which end of the list is best. */
  better: "higher" | "lower";
  unit: "goals" | "percent";
  /** What the big per-game number is, and what the small total beside it is. */
  perGameLabel: string;
  totalLabel: string;
}

export const TEAM_METRICS: Record<TeamMetricId, TeamMetric> = {
  "goals-for": { id: "goals-for", label: "Goals scored", endpoint: "team-goal-projections", detailKey: "goals", better: "higher", unit: "goals", perGameLabel: "goals per game", totalLabel: "goals" },
  "goals-against": { id: "goals-against", label: "Goals conceded", endpoint: "team-goals-against-projections", detailKey: "goalsAgainst", better: "lower", unit: "goals", perGameLabel: "goals conceded per game", totalLabel: "conceded" },
  "clean-sheets": { id: "clean-sheets", label: "Clean sheets", endpoint: "team-cs-projections", detailKey: "cleanSheetOdds", better: "higher", unit: "percent", perGameLabel: "clean-sheet chance per game", totalLabel: "clean sheets" },
  assists: { id: "assists", label: "Assists", endpoint: "team-assist-projections", detailKey: "assists", better: "higher", unit: "goals", perGameLabel: "assists per game", totalLabel: "assists" },
};

/** One club's row as the team projection endpoints return it (the id and short name are named differently by endpoint). */
export interface TeamProjectionRowInput {
  teamId?: number;
  id?: number;
  teamShort?: string;
  team?: string;
  fixtureDetails?: Record<string, Array<Record<string, unknown>>>;
}

export interface TeamProjectionRow {
  rank: number;
  teamId: number;
  short: string;
  name: string;
  /** The headline: the average over the club's fixtures in the range (percent for clean sheets). */
  perGame: number;
  /** The sum over those fixtures (for clean sheets: the expected number of clean sheets). */
  total: number;
  games: number;
  /** Value relative to the biggest, 0-1, for the bar. */
  share: number;
}

export interface TeamProjectionsContent {
  metric: TeamMetricId;
  rows: TeamProjectionRow[];
}

/**
 * Every club's projected average per game over the gameweeks, ranked best first (fewest first for goals conceded). Clubs
 * with no fixture in the range are left out; a double gameweek counts as two games.
 */
export function buildTeamProjections(input: {
  rows: TeamProjectionRowInput[];
  metric: TeamMetricId;
  gameweeks: number[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
}): TeamProjectionsContent {
  const { rows, metric, gameweeks, teamShortById, teamNameById } = input;
  const def = TEAM_METRICS[metric];
  const shortToId = new Map(Array.from(teamShortById, ([id, short]) => [short, id]));
  const out: Array<Omit<TeamProjectionRow, "rank" | "share">> = [];
  for (const r of rows) {
    const teamId = r.teamId ?? r.id ?? (r.teamShort ?? r.team ? shortToId.get((r.teamShort ?? r.team) as string) : undefined);
    if (teamId === undefined) continue;
    const values: number[] = [];
    for (const gw of gameweeks) {
      for (const f of r.fixtureDetails?.[String(gw)] ?? []) {
        const v = f[def.detailKey];
        if (typeof v === "number") values.push(v);
      }
    }
    if (!values.length) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    out.push({
      teamId,
      short: teamShortById.get(teamId) ?? r.teamShort ?? r.team ?? "?",
      name: teamNameById.get(teamId) ?? teamShortById.get(teamId) ?? "?",
      perGame: def.unit === "percent" ? round1(sum / values.length) : round2(sum / values.length),
      total: def.unit === "percent" ? round1(sum / 100) : round2(sum),
      games: values.length,
    });
  }
  out.sort((a, b) => (def.better === "higher" ? b.perGame - a.perGame : a.perGame - b.perGame) || a.name.localeCompare(b.name));
  const max = Math.max(0, ...out.map((r) => r.perGame));
  return { metric, rows: out.map((r, i) => ({ rank: i + 1, ...r, share: max > 0 ? r.perGame / max : 0 })) };
}

// ---------- tables ----------

export interface StandingsRowInput {
  id: number;
  name: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position?: number;
  cleanSheets?: number;
  expectedGoalsFor?: number;
  expectedGoalsAgainst?: number;
  actualGames?: number;
  projectedGames?: number;
}

export interface TableRow {
  position: number;
  teamId: number;
  short: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** The top four and the bottom three (only marked on a full 20-club table). */
  zone: "top4" | "relegation" | null;
}

export interface TableContent {
  rows: TableRow[];
  venue: VenueId;
  /** False when nobody has played a match yet (a league table with nothing to show). */
  started: boolean;
  /** Projected table only: the gameweek it is projected to, and how many matches are played and projected. */
  endGameweek: number | null;
  actualGames: number | null;
  projectedGames: number | null;
}

function orderRows(rows: StandingsRowInput[]): StandingsRowInput[] {
  const copy = [...rows];
  if (copy.every((r) => typeof r.position === "number")) return copy.sort((a, b) => (a.position as number) - (b.position as number));
  return copy.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
}

function toTable(rows: StandingsRowInput[], venue: VenueId, endGameweek: number | null): TableContent {
  const ordered = orderRows(rows);
  const full = ordered.length === 20;
  const tableRows: TableRow[] = ordered.map((r, i) => ({
    position: i + 1,
    teamId: r.id,
    short: r.shortName,
    name: r.name,
    played: r.played,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalDifference,
    points: r.points,
    zone: full ? (i < 4 ? "top4" : i >= 17 ? "relegation" : null) : null,
  }));
  return {
    rows: tableRows,
    venue,
    started: tableRows.some((r) => r.played > 0),
    endGameweek,
    actualGames: ordered[0]?.actualGames ?? null,
    projectedGames: ordered[0]?.projectedGames ?? null,
  };
}

/** The site's projected table to the end of a gameweek, in the order it gives (or points, goal difference, goals, name). */
export function buildProjectedTable(input: { rows: StandingsRowInput[]; endGameweek: number }): TableContent {
  return toTable(input.rows, "all", input.endGameweek);
}

/** The live league table (all matches, or home or away only). */
export function buildLeagueTable(input: { rows: StandingsRowInput[]; venue: VenueId }): TableContent {
  return toTable(input.rows, input.venue, null);
}

/** The gameweek a projected table is projected to: the chosen one when it is between the next gameweek and 38, otherwise the final table. */
export function resolveProjectedEndGameweek(to: number, nextGameweek: number): number {
  return Number.isInteger(to) && to >= nextGameweek && to <= 38 ? to : 38;
}

// ---------- Team History ----------

export interface TeamResultRow {
  gameweek: number;
  opponentShort: string;
  opponentName: string;
  isHome: boolean;
  scored: number;
  conceded: number;
  result: "W" | "D" | "L";
}

export interface TeamHistoryContent {
  teamId: number;
  name: string;
  short: string;
  /** Season figures from the live table (null when the table has no row for the club yet). */
  position: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  points: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
  cleanSheets: number | null;
  xgFor: number | null;
  xgAgainst: number | null;
  /** The finished results shown, oldest first. */
  results: TeamResultRow[];
  /** The record over exactly those results. */
  window: { wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
}

export const HISTORY_RESULTS = 8;
export const MAX_HISTORY_RESULTS = 10;

/**
 * A club's recent finished results (the last eight, or those in a chosen gameweek range) plus its season figures from the
 * live table. A live or unplayed match is never a result. Null for a club that is not in the player and club lists.
 */
export function buildTeamHistory(input: {
  teamId: number;
  fixtures: MatchFixtureInput[];
  standings: StandingsRowInput[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
  from: number;
  to: number;
}): TeamHistoryContent | null {
  const { teamId, fixtures, standings, teamShortById, teamNameById, from, to } = input;
  const short = teamShortById.get(teamId);
  if (short === undefined) return null;
  const mine = fixtures
    .filter((f) => isFixtureResult(f) && (f.team_h === teamId || f.team_a === teamId))
    .sort((a, b) => (a.event as number) - (b.event as number) || (a.kickoff_time ?? "").localeCompare(b.kickoff_time ?? "") || a.id - b.id);
  const inRange = from > 0 && to >= from ? mine.filter((f) => (f.event as number) >= from && (f.event as number) <= to) : [];
  const chosen = inRange.length ? inRange.slice(-MAX_HISTORY_RESULTS) : mine.slice(-HISTORY_RESULTS);
  const results: TeamResultRow[] = chosen.map((f) => {
    const isHome = f.team_h === teamId;
    const scored = (isHome ? f.team_h_score : f.team_a_score) as number;
    const conceded = (isHome ? f.team_a_score : f.team_h_score) as number;
    const opponent = isHome ? f.team_a : f.team_h;
    return {
      gameweek: f.event as number,
      opponentShort: teamShortById.get(opponent) ?? "?",
      opponentName: teamNameById.get(opponent) ?? teamShortById.get(opponent) ?? "?",
      isHome,
      scored,
      conceded,
      result: scored > conceded ? "W" : scored < conceded ? "L" : "D",
    };
  });
  const row = standings.find((s) => s.id === teamId);
  // the table's own position when it has one, otherwise the club's place in points / goal difference order
  const position = !row ? null : typeof row.position === "number" ? row.position : orderRows(standings).findIndex((s) => s.id === teamId) + 1;
  return {
    teamId,
    name: teamNameById.get(teamId) ?? row?.name ?? short,
    short,
    position,
    played: row?.played ?? null,
    wins: row?.wins ?? null,
    draws: row?.draws ?? null,
    losses: row?.losses ?? null,
    points: row?.points ?? null,
    goalsFor: row?.goalsFor ?? null,
    goalsAgainst: row?.goalsAgainst ?? null,
    goalDifference: row?.goalDifference ?? null,
    cleanSheets: row?.cleanSheets ?? null,
    xgFor: typeof row?.expectedGoalsFor === "number" ? round1(row.expectedGoalsFor) : null,
    xgAgainst: typeof row?.expectedGoalsAgainst === "number" ? round1(row.expectedGoalsAgainst) : null,
    results,
    window: {
      wins: results.filter((r) => r.result === "W").length,
      draws: results.filter((r) => r.result === "D").length,
      losses: results.filter((r) => r.result === "L").length,
      goalsFor: results.reduce((n, r) => n + r.scored, 0),
      goalsAgainst: results.reduce((n, r) => n + r.conceded, 0),
    },
  };
}

// ---------- who is in form ----------

export const FORM_WINDOW = 5;
export const MIN_FORM_RESULTS = 3;

/**
 * The club in the best and the club in the worst form after a gameweek: points over each club's last five finished results
 * up to and including that gameweek (3 for a win, 1 for a draw). Level points go to the better goal difference over those
 * results, then the lower club id. Clubs with fewer than three results are not considered, and the worst is null when it
 * would be the same club as the best.
 */
export function formExtremes(fixtures: MatchFixtureInput[], gameweek: number, teamIds: number[]): { best: number | null; worst: number | null } {
  const results = fixtures
    .filter((f) => isFixtureResult(f) && (f.event as number) <= gameweek)
    .sort((a, b) => (a.event as number) - (b.event as number) || (a.kickoff_time ?? "").localeCompare(b.kickoff_time ?? "") || a.id - b.id);
  const table: Array<{ id: number; points: number; goalDifference: number }> = [];
  for (const id of teamIds) {
    const mine = results.filter((f) => f.team_h === id || f.team_a === id).slice(-FORM_WINDOW);
    if (mine.length < MIN_FORM_RESULTS) continue;
    let points = 0;
    let goalDifference = 0;
    for (const f of mine) {
      const scored = (f.team_h === id ? f.team_h_score : f.team_a_score) as number;
      const conceded = (f.team_h === id ? f.team_a_score : f.team_h_score) as number;
      points += scored > conceded ? 3 : scored === conceded ? 1 : 0;
      goalDifference += scored - conceded;
    }
    table.push({ id, points, goalDifference });
  }
  if (!table.length) return { best: null, worst: null };
  const ranked = [...table].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || a.id - b.id);
  const best = ranked[0].id;
  const worst = [...table].sort((a, b) => a.points - b.points || a.goalDifference - b.goalDifference || a.id - b.id)[0].id;
  return { best, worst: worst === best ? null : worst };
}

// ---------- which data a team graphic needs ----------

/**
 * The API request a team graphic is built from (null when it needs none). The page and the pack fetch exactly this and hand
 * the result to the data builder together with the URL, so a graphic is never drawn from another range's data.
 */
export function teamGraphicUrl(spec: GraphicSpec, defaultRange: { from: number; to: number }, nextGameweek: number): string | null {
  switch (spec.template) {
    case "team-projections": {
      const from = spec.from || defaultRange.from;
      const to = Math.min(from + MAX_RANGE_GAMEWEEKS - 1, Math.max(from, spec.to || defaultRange.to));
      return `/api/${TEAM_METRICS[spec.metric].endpoint}?startGameweek=${from}&endGameweek=${to}`;
    }
    case "projected-table":
      return `/api/projected-standings?endGameweek=${resolveProjectedEndGameweek(spec.to, nextGameweek)}`;
    case "league-table":
      return `/api/current-standings?venue=${spec.venue}`;
    case "team-history":
      return "/api/current-standings?venue=all";
    default:
      return null;
  }
}

// ---------- links from other pages ----------

/**
 * The Graphics Maker link a "Share image" button on another page opens: a team template pre-filled with the range, measure,
 * venue, end gameweek or club the page is showing. Anything that is not real is left out, so the graphic picks its own default.
 */
export function teamGraphicLink(input: {
  template: "team-projections" | "projected-table" | "league-table" | "team-history";
  metric?: TeamMetricId;
  venue?: VenueId;
  from?: number;
  to?: number;
  endGameweek?: number;
  team?: number;
}): string {
  const real = (n: number | undefined): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;
  let range = { from: 0, to: 0 };
  if (input.template === "projected-table") range = real(input.endGameweek) ? { from: input.endGameweek, to: input.endGameweek } : range;
  else if (real(input.from) && real(input.to)) range = { from: input.from, to: input.to };
  const spec: GraphicSpec = {
    ...DEFAULT_SPEC,
    template: input.template,
    ...range,
    metric: input.metric && TEAM_METRIC_IDS.includes(input.metric) ? input.metric : DEFAULT_SPEC.metric,
    venue: input.venue ?? DEFAULT_SPEC.venue,
    teams: real(input.team) ? [input.team] : [],
  };
  return `/graphics?${encodeSpec(spec)}`;
}

// Pure builders for the match graphics of the Graphics Maker: Match Predictions and Match Preview (upcoming) and
// Match Results and Match Report (finished). Nothing here is a model of its own. Expected goals and clean-sheet
// chances are the site's own team projections, win chances are the bookmaker odds the site already shows, and every
// result, scorer, card and bonus point is FPL's official fixture data. Missing data is null (shown as a dash).

import { DEFAULT_SPEC, EXCLUDED_STATUS, POSITION_BY_TYPE, encodeSpec, formatDeadline, round2, type GraphicElement, type GraphicPosition, type SizeId } from "./graphics";
import { oddsApiTeamNameToFplId } from "./team-name-crosswalk";

// ---------- inputs ----------

export interface MatchStatEntry {
  value: number;
  element: number;
}

export interface MatchFixtureInput {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  kickoff_time?: string | null;
  started?: boolean;
  finished?: boolean;
  finished_provisional?: boolean;
  team_h_score?: number | null;
  team_a_score?: number | null;
  stats?: Array<{ identifier: string; a: MatchStatEntry[]; h: MatchStatEntry[] }>;
}

/** What /api/team-goal-projections, /api/team-cs-projections and /api/fixture-odds-current return for one gameweek. */
export interface MatchModelInput {
  goals: Array<{ teamId: number; fixtureDetails?: Record<string, Array<{ opponent: string; goals: number }>> }>;
  cs: Array<{ teamShort?: string; team?: string; fixtureDetails?: Record<string, Array<{ opponent: string; cleanSheetOdds: number }>> }>;
  odds: Array<{ homeTeam: string; awayTeam: string; homeWinProb: number | null; drawProb: number | null; awayWinProb: number | null }>;
}

export interface MatchProjectionInput {
  playerId: number;
  gameweekProjections?: Record<string, number>;
}

/** How many fixtures fit on one image of each size (a longer gameweek continues on page 2). */
export const MATCH_LIST_LIMIT: Record<SizeId, number> = { square: 10, portrait: 10, landscape: 6 };

// ---------- which fixtures count ----------

export const isFixtureFinished = (f: MatchFixtureInput): boolean => !!(f.finished || f.finished_provisional);

/** A fixture with a gameweek that has not started: the only kind a prediction may show. */
export const isFixtureUpcoming = (f: MatchFixtureInput): boolean => f.event !== null && f.event !== undefined && !isFixtureFinished(f) && !f.started;

/** A finished fixture with a gameweek and a score: the only kind a result may show (a live match has no final score). */
export const isFixtureResult = (f: MatchFixtureInput): boolean =>
  f.event !== null && f.event !== undefined && isFixtureFinished(f) && typeof f.team_h_score === "number" && typeof f.team_a_score === "number";

const byKickoff = (a: MatchFixtureInput, b: MatchFixtureInput): number => (a.kickoff_time ?? "").localeCompare(b.kickoff_time ?? "") || a.id - b.id;

const sortedUnique = (nums: number[]): number[] => Array.from(new Set(nums)).sort((a, b) => a - b);

export function predictionGameweeks(fixtures: MatchFixtureInput[]): number[] {
  return sortedUnique(fixtures.filter(isFixtureUpcoming).map((f) => f.event as number));
}

export function resultGameweeks(fixtures: MatchFixtureInput[]): number[] {
  return sortedUnique(fixtures.filter(isFixtureResult).map((f) => f.event as number));
}

/** The chosen gameweek if it has fixtures still to play, otherwise the first one that has (0 if none). */
export function resolvePredictionGameweek(from: number, fixtures: MatchFixtureInput[]): number {
  const gws = predictionGameweeks(fixtures);
  return from && gws.includes(from) ? from : gws[0] ?? 0;
}

/** Gameweeks in which every fixture (that has a gameweek) is finished. */
export function completedGameweeks(fixtures: MatchFixtureInput[]): number[] {
  return sortedUnique(fixtures.filter((f) => f.event !== null && f.event !== undefined).map((f) => f.event as number)).filter((gw) =>
    fixtures.filter((f) => f.event === gw).every(isFixtureFinished),
  );
}

/**
 * The chosen gameweek if it has finished results (an in-progress gameweek can be chosen). Otherwise the latest COMPLETED
 * gameweek, so a default image shows a whole round rather than the first match of a gameweek that is just under way; if none
 * is complete yet, the latest with any result (0 if none).
 */
export function resolveResultsGameweek(from: number, fixtures: MatchFixtureInput[]): number {
  const gws = resultGameweeks(fixtures);
  if (from && gws.includes(from)) return from;
  const complete = completedGameweeks(fixtures).filter((gw) => gws.includes(gw));
  return complete[complete.length - 1] ?? gws[gws.length - 1] ?? 0;
}

/**
 * The fixture a Match Preview ("upcoming") or Match Report ("finished") is about: the chosen one when it is the right kind,
 * otherwise the first of the chosen (or default) gameweek, otherwise null.
 */
export function resolveMatch(spec: { fixture: number; from: number }, fixtures: MatchFixtureInput[], kind: "upcoming" | "finished"): MatchFixtureInput | null {
  const eligible = fixtures.filter(kind === "upcoming" ? isFixtureUpcoming : isFixtureResult);
  const chosen = spec.fixture ? eligible.find((f) => f.id === spec.fixture) : undefined;
  if (chosen) return chosen;
  const gw = kind === "upcoming" ? resolvePredictionGameweek(spec.from, fixtures) : resolveResultsGameweek(spec.from, fixtures);
  return eligible.filter((f) => f.event === gw).sort(byKickoff)[0] ?? null;
}

/**
 * The Graphics Maker link a "Share image" button on another page opens: the match template, pre-filled with the gameweek
 * and/or fixture the page is showing. A gameweek that is not a real one is left out, so the graphic picks its own default.
 */
export function matchGraphicLink(input: { template: "match-predictions" | "match-results" | "match-preview" | "match-report"; gameweek?: number; fixture?: number }): string {
  const gw = input.gameweek && Number.isInteger(input.gameweek) && input.gameweek > 0 ? input.gameweek : 0;
  const qs = encodeSpec({ ...DEFAULT_SPEC, template: input.template, from: gw, to: gw, fixture: input.fixture && input.fixture > 0 ? input.fixture : 0 });
  return `/graphics?${qs}`;
}

/** How many images a gameweek's fixtures still to play need at this many per image (never fewer than one). */
export function predictionPageCount(fixtures: MatchFixtureInput[], gameweek: number, limit: number): number {
  return Math.max(1, Math.ceil(fixtures.filter((f) => isFixtureUpcoming(f) && f.event === gameweek).length / limit));
}

/** How many images a gameweek's finished matches need at this many per image (never fewer than one). */
export function resultsPageCount(fixtures: MatchFixtureInput[], gameweek: number, limit: number): number {
  return Math.max(1, Math.ceil(fixtures.filter((f) => isFixtureResult(f) && f.event === gameweek).length / limit));
}

// ---------- shared pieces ----------

function paginate<T>(items: T[], page: number, limit: number): { rows: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const current = Number.isInteger(page) && page >= 1 && page <= pages ? page : 1;
  return { rows: items.slice((current - 1) * limit, current * limit), page: current, pages, total: items.length };
}

/** Win / draw / win as whole percentages that always sum to 100 (largest remainder); null if any is missing. */
export function normaliseProbabilities(home: number | null | undefined, draw: number | null | undefined, away: number | null | undefined): { home: number; draw: number; away: number } | null {
  const values = [home, draw, away];
  if (!values.every((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0)) return null;
  const sum = (values as number[]).reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  const shares = (values as number[]).map((v) => (v / sum) * 100);
  const floors = shares.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = shares.map((s, i) => ({ i, frac: s - floors[i] })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return { home: floors[0], draw: floors[1], away: floors[2] };
}

interface Names {
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
}

export interface MatchTeamSide {
  id: number;
  short: string;
  name: string;
}

const side = (id: number, n: Names): MatchTeamSide => ({ id, short: n.teamShortById.get(id) ?? "?", name: n.teamNameById.get(id) ?? n.teamShortById.get(id) ?? "?" });

function modelFor(fixture: MatchFixtureInput, model: MatchModelInput, n: Names) {
  const gw = String(fixture.event);
  const homeShort = n.teamShortById.get(fixture.team_h) ?? "";
  const awayShort = n.teamShortById.get(fixture.team_a) ?? "";
  const goal = (teamId: number, opponent: string): number | null => {
    const v = model.goals.find((g) => g.teamId === teamId)?.fixtureDetails?.[gw]?.find((d) => d.opponent === opponent)?.goals;
    return typeof v === "number" ? v : null;
  };
  const cs = (short: string, opponent: string): number | null => {
    const v = model.cs.find((c) => (c.teamShort ?? c.team) === short)?.fixtureDetails?.[gw]?.find((d) => d.opponent === opponent)?.cleanSheetOdds;
    return typeof v === "number" ? v : null;
  };
  const odds = model.odds.find((o) => oddsApiTeamNameToFplId(o.homeTeam) === fixture.team_h && oddsApiTeamNameToFplId(o.awayTeam) === fixture.team_a);
  return {
    homeXg: goal(fixture.team_h, awayShort),
    awayXg: goal(fixture.team_a, homeShort),
    homeCs: cs(homeShort, awayShort),
    awayCs: cs(awayShort, homeShort),
    probs: odds ? normaliseProbabilities(odds.homeWinProb, odds.drawProb, odds.awayWinProb) : null,
  };
}

// ---------- Match Predictions ----------

export interface MatchPredictionTeam extends MatchTeamSide {
  /** Our expected goals for this fixture, null when the model has none. */
  xg: number | null;
  /** Clean-sheet chance in percent (0-100), null when the model has none. */
  cs: number | null;
}

export interface MatchPredictionRow {
  id: number;
  gameweek: number;
  kickoff: string | null;
  kickoffLabel: string;
  home: MatchPredictionTeam;
  away: MatchPredictionTeam;
  /** Win / draw / win percentages from the market odds; null when the market has none open. */
  probs: { home: number; draw: number; away: number } | null;
}

export interface MatchPredictionsContent {
  gameweek: number;
  rows: MatchPredictionRow[];
  page: number;
  pages: number;
  total: number;
}

/** The fixtures of a gameweek that have not started, in kick-off order, with the site's expected goals, clean-sheet chances and market odds. */
export function buildMatchPredictions(input: {
  fixtures: MatchFixtureInput[];
  gameweek: number;
  model: MatchModelInput;
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
  page: number;
  limit: number;
}): MatchPredictionsContent {
  const { fixtures, gameweek, model, page, limit } = input;
  const rows: MatchPredictionRow[] = fixtures
    .filter((f) => isFixtureUpcoming(f) && f.event === gameweek)
    .sort(byKickoff)
    .map((f) => {
      const m = modelFor(f, model, input);
      return {
        id: f.id,
        gameweek,
        kickoff: f.kickoff_time ?? null,
        kickoffLabel: formatDeadline(f.kickoff_time) ?? "",
        home: { ...side(f.team_h, input), xg: m.homeXg, cs: m.homeCs },
        away: { ...side(f.team_a, input), xg: m.awayXg, cs: m.awayCs },
        probs: m.probs,
      };
    });
  const p = paginate(rows, page, limit);
  return { gameweek, rows: p.rows, page: p.page, pages: p.pages, total: p.total };
}

// ---------- names, scorers and the like ----------

type StatList = NonNullable<MatchFixtureInput["stats"]>;

function entries(stats: StatList | undefined, identifier: string, which: "h" | "a"): MatchStatEntry[] {
  return stats?.find((s) => s.identifier === identifier)?.[which] ?? [];
}

const nameOf = (elements: Map<number, GraphicElement>, id: number): string => elements.get(id)?.web_name ?? "Unknown";

const positionOf = (elements: Map<number, GraphicElement>, id: number): GraphicPosition | null => {
  const e = elements.get(id);
  return e ? POSITION_BY_TYPE[e.element_type] ?? null : null;
};

/** "Name" or "Name (2)": most first, then by name. */
function countedNames(list: MatchStatEntry[], elements: Map<number, GraphicElement>): string[] {
  return list
    .filter((e) => e.value > 0)
    .map((e) => ({ name: nameOf(elements, e.element), value: e.value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .map((e) => (e.value > 1 ? `${e.name} (${e.value})` : e.name));
}

/** A side's scorers: its own goals, then own goals by the other side's players that count for it. */
function scorers(stats: StatList | undefined, which: "h" | "a", elements: Map<number, GraphicElement>): string[] {
  const other = which === "h" ? "a" : "h";
  const own = entries(stats, "own_goals", other)
    .filter((e) => e.value > 0)
    .map((e) => ({ name: nameOf(elements, e.element), value: e.value }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => (e.value > 1 ? `${e.name} (${e.value} og)` : `${e.name} (og)`));
  return [...countedNames(entries(stats, "goals_scored", which), elements), ...own];
}

// ---------- Match Results ----------

export interface MatchResultRow {
  id: number;
  gameweek: number;
  kickoffLabel: string;
  home: MatchTeamSide & { score: number };
  away: MatchTeamSide & { score: number };
  homeScorers: string[];
  awayScorers: string[];
  outcome: "home" | "draw" | "away";
}

export interface MatchResultsContent {
  gameweek: number;
  rows: MatchResultRow[];
  page: number;
  pages: number;
  /** Totals are over the whole gameweek, not just this page. */
  total: number;
  goals: number;
  homeWins: number;
  draws: number;
  awayWins: number;
}

/** The finished fixtures of a gameweek with the real score and scorers; live and unfinished fixtures are never included. */
export function buildMatchResults(input: {
  fixtures: MatchFixtureInput[];
  gameweek: number;
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
  page: number;
  limit: number;
}): MatchResultsContent {
  const { fixtures, gameweek, page, limit } = input;
  const elements = new Map(input.elements.map((e) => [e.id, e]));
  const rows: MatchResultRow[] = fixtures
    .filter((f) => isFixtureResult(f) && f.event === gameweek)
    .sort(byKickoff)
    .map((f) => {
      const hs = f.team_h_score as number;
      const as = f.team_a_score as number;
      return {
        id: f.id,
        gameweek,
        kickoffLabel: formatDeadline(f.kickoff_time) ?? "",
        home: { ...side(f.team_h, input), score: hs },
        away: { ...side(f.team_a, input), score: as },
        homeScorers: scorers(f.stats, "h", elements),
        awayScorers: scorers(f.stats, "a", elements),
        outcome: hs > as ? "home" : hs < as ? "away" : "draw",
      };
    });
  const p = paginate(rows, page, limit);
  return {
    gameweek,
    rows: p.rows,
    page: p.page,
    pages: p.pages,
    total: p.total,
    goals: rows.reduce((n, r) => n + r.home.score + r.away.score, 0),
    homeWins: rows.filter((r) => r.outcome === "home").length,
    draws: rows.filter((r) => r.outcome === "draw").length,
    awayWins: rows.filter((r) => r.outcome === "away").length,
  };
}

// ---------- Match Preview ----------

export interface MatchFormEntry {
  result: "W" | "D" | "L";
  /** From this club's point of view, e.g. "4-0". */
  score: string;
  opponent: string;
  isHome: boolean;
}

export interface MatchPreviewPlayer {
  id: number;
  name: string;
  position: GraphicPosition;
  xpts: number;
}

export interface MatchPreviewSide extends MatchPredictionTeam {
  /** Last five finished results, oldest first. */
  form: MatchFormEntry[];
  /** The three best expected-points players for this gameweek (fewer if the club has fewer with a projection). */
  topPlayers: MatchPreviewPlayer[];
}

export interface MatchPreviewContent {
  fixtureId: number;
  gameweek: number;
  kickoffLabel: string;
  home: MatchPreviewSide;
  away: MatchPreviewSide;
  probs: { home: number; draw: number; away: number } | null;
}

export const FORM_LENGTH = 5;
export const PREVIEW_PLAYERS = 3;

function formFor(teamId: number, fixtures: MatchFixtureInput[], n: Names): MatchFormEntry[] {
  return fixtures
    .filter((f) => isFixtureResult(f) && (f.team_h === teamId || f.team_a === teamId))
    .sort((a, b) => (a.event as number) - (b.event as number) || byKickoff(a, b))
    .slice(-FORM_LENGTH)
    .map((f) => {
      const isHome = f.team_h === teamId;
      const mine = (isHome ? f.team_h_score : f.team_a_score) as number;
      const theirs = (isHome ? f.team_a_score : f.team_h_score) as number;
      return {
        result: mine > theirs ? "W" : mine < theirs ? "L" : "D",
        score: `${mine}-${theirs}`,
        opponent: n.teamShortById.get(isHome ? f.team_a : f.team_h) ?? "?",
        isHome,
      };
    });
}

function topPlayersFor(teamId: number, gameweek: number, elements: GraphicElement[], projections: MatchProjectionInput[]): MatchPreviewPlayer[] {
  const byId = new Map(projections.map((p) => [p.playerId, p.gameweekProjections]));
  const out: MatchPreviewPlayer[] = [];
  for (const e of elements) {
    if (e.team !== teamId || EXCLUDED_STATUS.has(e.status ?? "a")) continue;
    const position = POSITION_BY_TYPE[e.element_type];
    const xpts = byId.get(e.id)?.[String(gameweek)];
    if (!position || typeof xpts !== "number") continue;
    out.push({ id: e.id, name: e.web_name, position, xpts: round2(xpts) });
  }
  return out.sort((a, b) => b.xpts - a.xpts || a.id - b.id).slice(0, PREVIEW_PLAYERS);
}

/** One upcoming fixture: expected goals, chances, each club's last five results and best-projected players. Null if the fixture has no gameweek. */
export function buildMatchPreview(input: {
  fixture: MatchFixtureInput;
  fixtures: MatchFixtureInput[];
  model: MatchModelInput;
  elements: GraphicElement[];
  projections: MatchProjectionInput[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
}): MatchPreviewContent | null {
  const { fixture, fixtures, model, elements, projections } = input;
  if (fixture.event === null || fixture.event === undefined) return null;
  const m = modelFor(fixture, model, input);
  return {
    fixtureId: fixture.id,
    gameweek: fixture.event,
    kickoffLabel: formatDeadline(fixture.kickoff_time) ?? "",
    home: { ...side(fixture.team_h, input), xg: m.homeXg, cs: m.homeCs, form: formFor(fixture.team_h, fixtures, input), topPlayers: topPlayersFor(fixture.team_h, fixture.event, elements, projections) },
    away: { ...side(fixture.team_a, input), xg: m.awayXg, cs: m.awayCs, form: formFor(fixture.team_a, fixtures, input), topPlayers: topPlayersFor(fixture.team_a, fixture.event, elements, projections) },
    probs: m.probs,
  };
}

// ---------- Match Report ----------

export interface MatchReportCard {
  name: string;
  teamShort: string;
  kind: "red" | "yellow";
}

export interface MatchReportBonus {
  name: string;
  teamShort: string;
  points: number;
}

/** A player's defensive contribution count in the match (FPL's own number) and whether it earned the 2 points. */
export interface MatchReportDefender {
  name: string;
  teamShort: string;
  value: number;
  earned: boolean;
}

/** A goalkeeper's saves in the match and the points they earn (1 for every 3). */
export interface MatchReportSaves {
  name: string;
  teamShort: string;
  value: number;
  points: number;
}

/** How many contributors the report lists (the face shows fewer on small sizes). */
export const DEFENSIVE_LIST_LIMIT = 6;

/**
 * FPL's rule for the 2 defensive contribution points: 10 or more for defenders, 12 or more for midfielders and forwards,
 * never for goalkeepers. The same rule the site's CBIT points use (computeCbitPoints in the scoring cache service).
 */
export function earnsDefensivePoints(value: number, position: GraphicPosition | null): boolean {
  if (position === "DEF") return value >= 10;
  if (position === "MID" || position === "FWD") return value >= 12;
  return false;
}

export interface MatchReportContent {
  fixtureId: number;
  gameweek: number;
  kickoffLabel: string;
  home: MatchTeamSide & { score: number };
  away: MatchTeamSide & { score: number };
  goals: { home: string[]; away: string[] };
  assists: { home: string[]; away: string[] };
  cards: MatchReportCard[];
  bonus: MatchReportBonus[];
  /** The biggest defensive contributors of both sides, most first (up to DEFENSIVE_LIST_LIMIT). */
  defensive: MatchReportDefender[];
  /** Goalkeepers with at least one save, most first. */
  saves: MatchReportSaves[];
  /** The clubs that conceded none (home side first). */
  cleanSheets: string[];
  /** Penalties missed and saved, then own goals. */
  notes: string[];
}

/** One finished match from FPL's own fixture stats. Null if the match has not finished (a live score is not a report). */
export function buildMatchReport(input: {
  fixture: MatchFixtureInput;
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
}): MatchReportContent | null {
  const { fixture: f } = input;
  if (!isFixtureResult(f)) return null;
  const elements = new Map(input.elements.map((e) => [e.id, e]));
  const home = { ...side(f.team_h, input), score: f.team_h_score as number };
  const away = { ...side(f.team_a, input), score: f.team_a_score as number };
  const sides: Array<["h" | "a", string]> = [["h", home.short], ["a", away.short]];

  const cards: MatchReportCard[] = [];
  for (const kind of ["red", "yellow"] as const) {
    for (const [which, teamShort] of sides) {
      entries(f.stats, `${kind}_cards`, which)
        .filter((e) => e.value > 0)
        .map((e) => nameOf(elements, e.element))
        .sort((a, b) => a.localeCompare(b))
        .forEach((name) => cards.push({ name, teamShort, kind }));
    }
  }

  // highest first; level points: home side first, then by name
  const bonus = sides
    .flatMap(([which, teamShort], sideIndex) =>
      entries(f.stats, "bonus", which)
        .filter((e) => e.value > 0)
        .map((e) => ({ name: nameOf(elements, e.element), teamShort, points: e.value, sideIndex })),
    )
    .sort((a, b) => b.points - a.points || a.sideIndex - b.sideIndex || a.name.localeCompare(b.name))
    .map(({ name, teamShort, points }): MatchReportBonus => ({ name, teamShort, points }));

  // most first; level counts: home side first, then by name
  const defensive = sides
    .flatMap(([which, teamShort], sideIndex) =>
      entries(f.stats, "defensive_contribution", which)
        .filter((e) => e.value > 0)
        .map((e) => ({ name: nameOf(elements, e.element), teamShort, value: e.value, earned: earnsDefensivePoints(e.value, positionOf(elements, e.element)), sideIndex })),
    )
    .sort((a, b) => b.value - a.value || a.sideIndex - b.sideIndex || a.name.localeCompare(b.name))
    .slice(0, DEFENSIVE_LIST_LIMIT)
    .map(({ sideIndex: _s, ...d }): MatchReportDefender => d);

  const notes: string[] = [];
  for (const [identifier, one, many] of [["penalties_missed", "missed a penalty", "missed {n} penalties"], ["penalties_saved", "saved a penalty", "saved {n} penalties"]] as const) {
    for (const [which] of sides) {
      for (const e of entries(f.stats, identifier, which)) {
        if (e.value > 0) notes.push(`${nameOf(elements, e.element)} ${e.value === 1 ? one : many.replace("{n}", String(e.value))}`);
      }
    }
  }

  for (const [which] of sides) {
    for (const e of entries(f.stats, "own_goals", which)) {
      if (e.value > 0) notes.push(`${nameOf(elements, e.element)} scored ${e.value === 1 ? "an own goal" : `${e.value} own goals`}`);
    }
  }

  // most first; level counts: home side first, then by name
  const saves = sides
    .flatMap(([which, teamShort], sideIndex) =>
      entries(f.stats, "saves", which)
        .filter((e) => e.value > 0)
        .map((e) => ({ name: nameOf(elements, e.element), teamShort, value: e.value, points: Math.floor(e.value / 3), sideIndex })),
    )
    .sort((a, b) => b.value - a.value || a.sideIndex - b.sideIndex || a.name.localeCompare(b.name))
    .map(({ sideIndex: _s, ...d }): MatchReportSaves => d);

  const cleanSheets = [...(away.score === 0 ? [home.short] : []), ...(home.score === 0 ? [away.short] : [])];

  return {
    fixtureId: f.id,
    gameweek: f.event as number,
    kickoffLabel: formatDeadline(f.kickoff_time) ?? "",
    home,
    away,
    goals: { home: scorers(f.stats, "h", elements), away: scorers(f.stats, "a", elements) },
    assists: { home: countedNames(entries(f.stats, "assists", "h"), elements), away: countedNames(entries(f.stats, "assists", "a"), elements) },
    cards,
    bonus,
    defensive,
    saves,
    cleanSheets,
    notes,
  };
}

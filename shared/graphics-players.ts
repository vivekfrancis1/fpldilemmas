// Pure builders for the player graphics of the Graphics Maker: Player Projections (upcoming), Gameweek Top Scorers and
// Player History (past). Nothing here is a model of its own. Projections are the site's cached expected points (and the
// components they are made of) summed over the chosen gameweeks; top scorers and history are FPL's own live points and
// match history for finished matches. Missing data is null or left out, never invented.

import { projectionWindow } from "./compare-utils";
import { DEFAULT_SPEC, EXCLUDED_STATUS, POSITION_BY_TYPE, encodeSpec, round2, toNumber, type GraphicElement, type GraphicPosition, type GraphicSpec } from "./graphics";

const POSITION_ORDER: GraphicPosition[] = ["GKP", "DEF", "MID", "FWD"];
const money = (tenths: number) => `£${(tenths / 10).toFixed(1)}m`;
const ownershipText = (e: GraphicElement): string => {
  const own = toNumber(e.selected_by_percent);
  return own === null ? "—" : `${own.toFixed(1)}%`;
};

// ---------- Player Projections ----------

/** The cached projection of one player: expected points per gameweek and the components they are made of. */
export interface PlayerProjectionInput {
  playerId: number;
  gameweekProjections?: Record<string, number>;
  [component: string]: unknown;
}

/** The components shown for a position (expected points from each, summed over the range), so a list explains where its points come from. */
export const PROJECTION_PARTS: Record<GraphicPosition, Array<{ label: string; keys: string[] }>> = {
  GKP: [
    { label: "Clean sheet", keys: ["pointsFromCleanSheets"] },
    { label: "Saves", keys: ["pointsFromSaves"] },
    { label: "Bonus", keys: ["pointsFromBonus"] },
  ],
  DEF: [
    { label: "Clean sheet", keys: ["pointsFromCleanSheets"] },
    { label: "Attack", keys: ["pointsFromGoals", "pointsFromAssists"] },
    { label: "Def. contr.", keys: ["pointsFromDefensiveContributions"] },
  ],
  MID: [
    { label: "Goals", keys: ["pointsFromGoals"] },
    { label: "Assists", keys: ["pointsFromAssists"] },
    { label: "Bonus", keys: ["pointsFromBonus"] },
  ],
  FWD: [
    { label: "Goals", keys: ["pointsFromGoals"] },
    { label: "Assists", keys: ["pointsFromAssists"] },
    { label: "Bonus", keys: ["pointsFromBonus"] },
  ],
};

/** How many players each position shows when all four are on one image. */
export const PROJECTION_GROUP_LIMIT = { square: 4, portrait: 5, landscape: 4 } as const;

export interface PlayerProjectionRow {
  rank: number;
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  ownership: string;
  /** Expected points over the chosen gameweeks. */
  xpts: number;
  /** Expected points from each of the position's components (empty in the all-positions view). */
  parts: number[];
  doubtful: boolean;
}

export interface PlayerProjectionsContent {
  /** The one position listed, or null when all four are shown. */
  single: GraphicPosition | null;
  partLabels: string[];
  groups: Array<{ position: GraphicPosition; rows: PlayerProjectionRow[] }>;
}

function sumComponent(p: PlayerProjectionInput, keys: string[], gameweeks: number[]): number {
  let total = 0;
  for (const key of keys) {
    const perGw = p[key];
    if (!perGw || typeof perGw !== "object") continue;
    for (const gw of gameweeks) {
      const v = (perGw as Record<string, unknown>)[String(gw)];
      if (typeof v === "number") total += v;
    }
  }
  return round2(total);
}

/**
 * The best-projected players over a gameweek range: one position (with the components their points come from) or the best
 * few of each of the four positions. Injured, suspended, unavailable and not-in-squad players are never listed; doubtful
 * players are, flagged. Players with no projection in the range are left out.
 */
export function buildPlayerProjections(input: {
  elements: GraphicElement[];
  projections: PlayerProjectionInput[];
  teamShortById: Map<number, string>;
  gameweeks: number[];
  pos: GraphicPosition | null;
  top: number;
  perGroup: number;
}): PlayerProjectionsContent {
  const { elements, projections, teamShortById, gameweeks, pos, top, perGroup } = input;
  const projectionById = new Map(projections.map((p) => [p.playerId, p]));
  const ranked = new Map<GraphicPosition, Array<Omit<PlayerProjectionRow, "rank" | "parts"> & { source: PlayerProjectionInput }>>(POSITION_ORDER.map((p) => [p, []]));
  for (const e of elements) {
    if (EXCLUDED_STATUS.has(e.status ?? "a")) continue;
    const position = POSITION_BY_TYPE[e.element_type];
    const source = projectionById.get(e.id);
    if (!position || !source) continue;
    const xpts = projectionWindow(source.gameweekProjections, gameweeks).total;
    if (xpts === null) continue;
    ranked.get(position)!.push({
      id: e.id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position,
      price: money(e.now_cost),
      ownership: ownershipText(e),
      xpts,
      doubtful: e.status === "d",
      source,
    });
  }
  const finish = (position: GraphicPosition, limit: number, withParts: boolean): PlayerProjectionRow[] =>
    ranked
      .get(position)!
      .sort((a, b) => b.xpts - a.xpts || a.id - b.id)
      .slice(0, limit)
      .map(({ source, ...r }, i) => ({
        rank: i + 1,
        ...r,
        parts: withParts ? PROJECTION_PARTS[position].map((part) => sumComponent(source, part.keys, gameweeks)) : [],
      }));
  if (pos) {
    return { single: pos, partLabels: PROJECTION_PARTS[pos].map((p) => p.label), groups: [{ position: pos, rows: finish(pos, top, true) }] };
  }
  return { single: null, partLabels: [], groups: POSITION_ORDER.map((position) => ({ position, rows: finish(position, perGroup, false) })) };
}

// ---------- Gameweek Top Scorers ----------

export interface LiveScorerInput {
  id: number;
  stats: { total_points: number; minutes: number; goals_scored?: number; assists?: number; bonus?: number };
  explain?: Array<{ fixture: number; stats: Array<{ identifier: string; points: number; value: number }> }>;
}

/** FPL's scoring identifiers as short labels, in the order used to settle equal points. */
const CHIP_ORDER: Array<[string, string]> = [
  ["goals_scored", "Goals"],
  ["assists", "Assists"],
  ["clean_sheets", "Clean sheet"],
  ["penalties_saved", "Pen. saved"],
  ["saves", "Saves"],
  ["bonus", "Bonus"],
  ["defensive_contribution", "Def. contr."],
  ["penalties_missed", "Pen. missed"],
  ["own_goals", "Own goal"],
  ["yellow_cards", "Yellow"],
  ["red_cards", "Red"],
  ["goals_conceded", "Conceded"],
  ["minutes", "Minutes"],
];
export const MAX_SCORER_CHIPS = 4;

export interface ScorerChip {
  label: string;
  points: number;
}

export interface TopScorerRow {
  rank: number;
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  points: number;
  minutes: number;
  /** Where the points came from (FPL's own breakdown, summed over a double gameweek), biggest first. */
  chips: ScorerChip[];
}

export interface TopScorersContent {
  gameweek: number;
  rows: TopScorerRow[];
}

function scorerChips(explain: LiveScorerInput["explain"]): ScorerChip[] {
  const sums = new Map<string, number>();
  for (const fixture of explain ?? []) for (const s of fixture.stats) sums.set(s.identifier, (sums.get(s.identifier) ?? 0) + s.points);
  const chips = CHIP_ORDER.map(([key, label], order) => ({ label, points: sums.get(key) ?? 0, key, order })).filter((c) => c.points !== 0);
  const others = chips.filter((c) => c.key !== "minutes");
  const pool = others.length ? others : chips; // minutes points only explain a score that has nothing else in it
  return pool
    .sort((a, b) => (a.points > 0 ? 0 : 1) - (b.points > 0 ? 0 : 1) || (a.points > 0 ? b.points - a.points : a.points - b.points) || a.order - b.order)
    .slice(0, MAX_SCORER_CHIPS)
    .map(({ label, points }) => ({ label, points }));
}

/**
 * The highest-scoring players of a finished gameweek by FPL's live points. A player counts only if they played and scored
 * above zero; level points go to the bigger goal involvement (goals + assists), then the lower id.
 */
export function buildTopScorers(input: {
  elements: GraphicElement[];
  live: LiveScorerInput[];
  teamShortById: Map<number, string>;
  gameweek: number;
  pos: GraphicPosition | null;
  top: number;
}): TopScorersContent {
  const { elements, live, teamShortById, gameweek, pos, top } = input;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const rows: Array<Omit<TopScorerRow, "rank"> & { involvement: number }> = [];
  for (const l of live) {
    const e = byId.get(l.id);
    const position = e ? POSITION_BY_TYPE[e.element_type] : undefined;
    if (!e || !position || (pos && position !== pos) || !(l.stats.minutes > 0) || !(l.stats.total_points > 0)) continue;
    rows.push({
      id: e.id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position,
      price: money(e.now_cost),
      points: l.stats.total_points,
      minutes: l.stats.minutes,
      chips: scorerChips(l.explain),
      involvement: (l.stats.goals_scored ?? 0) + (l.stats.assists ?? 0),
    });
  }
  rows.sort((a, b) => b.points - a.points || b.involvement - a.involvement || a.id - b.id);
  return { gameweek, rows: rows.slice(0, top).map(({ involvement: _i, ...r }, i) => ({ rank: i + 1, ...r })) };
}

// ---------- Player Points (chosen players, one gameweek) ----------

export interface GwPointsRow {
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  /** FPL's points for the gameweek (can be negative); null when FPL has no entry for the player. */
  points: number | null;
  minutes: number | null;
  isCaptain: boolean;
  /** On the bench rather than in the starting XI. */
  isBench: boolean;
  /** Where the points came from (FPL's own breakdown), worst first when the score is negative. */
  chips: ScorerChip[];
}

export interface GwPointsContent {
  gameweek: number;
  rows: GwPointsRow[];
}

/**
 * The points FPL gave the chosen players in one gameweek, in the order chosen. Nothing is filtered by score: a negative score
 * and a 0 for someone who did not play are shown as they are. A player FPL has no entry for gets null, never a made-up 0.
 * The captain is only marked if they are one of the chosen players; points are the player's own, not doubled.
 */
export function buildGwPoints(input: {
  elements: GraphicElement[];
  live: LiveScorerInput[];
  teamShortById: Map<number, string>;
  gameweek: number;
  playerIds: number[];
  /** Which of the chosen players are on the bench (ids that are not chosen players are ignored). */
  benchIds?: number[];
  captainId: number;
}): GwPointsContent {
  const { elements, live, teamShortById, gameweek, playerIds, captainId } = input;
  const bench = new Set(input.benchIds ?? []);
  const byId = new Map(elements.map((e) => [e.id, e]));
  const liveById = new Map(live.map((l) => [l.id, l]));
  const seen = new Set<number>();
  const rows: GwPointsRow[] = [];
  for (const id of playerIds) {
    const e = byId.get(id);
    const position = e ? POSITION_BY_TYPE[e.element_type] : undefined;
    if (!e || !position || seen.has(id)) continue;
    seen.add(id);
    const l = liveById.get(id);
    rows.push({
      id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position,
      points: l ? l.stats.total_points : null,
      minutes: l ? l.stats.minutes : null,
      isCaptain: captainId > 0 && id === captainId,
      isBench: bench.has(id),
      chips: l ? scorerChips(l.explain) : [],
    });
  }
  return { gameweek, rows };
}

// ---------- Player History ----------

/** One row of FPL's element-summary `history` (one finished or live match of the player). */
export interface HistoryRowInput {
  round: number;
  fixture: number;
  opponent_team: number;
  was_home: boolean;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  team_h_score: number | null;
  team_a_score: number | null;
}

export interface HistoryOpponent {
  short: string;
  isHome: boolean;
  /** The score from the player's side, e.g. "2-1"; empty when FPL has none. */
  score: string;
}

export interface HistoryBar {
  gameweek: number;
  /** null: no finished match for this player in that gameweek (blank gameweek, or not played yet). */
  points: number | null;
  minutes: number;
  goals: number;
  assists: number;
  bonus: number;
  cleanSheets: number;
  opponents: HistoryOpponent[];
}

export interface PlayerHistoryContent {
  playerId: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  ownership: string;
  bars: HistoryBar[];
  totals: {
    points: number;
    goals: number;
    assists: number;
    bonus: number;
    minutes: number;
    /** Gameweeks in which the player was on the pitch. */
    appearances: number;
    /** Points per appearance, one decimal; null with no appearances. */
    average: number | null;
    /** The best gameweek (the earliest if several are level); null with no appearances. */
    best: { gameweek: number; points: number } | null;
  };
}

export const HISTORY_BARS = 8;

/** The last eight gameweeks that have finished matches. */
export function defaultHistoryGameweeks(resultGameweeks: number[], limit = HISTORY_BARS): number[] {
  return resultGameweeks.slice(-limit);
}

/** The chosen range (only gameweeks that have finished matches), or the default when nothing is chosen or none of it has results. */
export function resolveHistoryGameweeks(spec: { from: number; to: number }, resultGameweeks: number[]): number[] {
  if (spec.from > 0 && spec.to >= spec.from) {
    const chosen = resultGameweeks.filter((gw) => gw >= spec.from && gw <= spec.to);
    if (chosen.length) return chosen;
  }
  return defaultHistoryGameweeks(resultGameweeks);
}

/** A player's points per gameweek over the chosen gameweeks, from finished matches only (a double gameweek is added up). */
export function buildPlayerHistory(input: {
  element: GraphicElement;
  history: HistoryRowInput[];
  finishedFixtureIds: Set<number>;
  teamShortById: Map<number, string>;
  gameweeks: number[];
}): PlayerHistoryContent {
  const { element, history, finishedFixtureIds, teamShortById, gameweeks } = input;
  const rows = history.filter((h) => finishedFixtureIds.has(h.fixture));
  const bars: HistoryBar[] = gameweeks.map((gameweek) => {
    const mine = rows.filter((r) => r.round === gameweek);
    if (!mine.length) return { gameweek, points: null, minutes: 0, goals: 0, assists: 0, bonus: 0, cleanSheets: 0, opponents: [] };
    const sum = (key: "total_points" | "minutes" | "goals_scored" | "assists" | "bonus" | "clean_sheets") => mine.reduce((n, r) => n + r[key], 0);
    return {
      gameweek,
      points: sum("total_points"),
      minutes: sum("minutes"),
      goals: sum("goals_scored"),
      assists: sum("assists"),
      bonus: sum("bonus"),
      cleanSheets: sum("clean_sheets"),
      opponents: mine.map((r) => {
        const own = r.was_home ? r.team_h_score : r.team_a_score;
        const against = r.was_home ? r.team_a_score : r.team_h_score;
        return { short: teamShortById.get(r.opponent_team) ?? "?", isHome: r.was_home, score: own === null || against === null ? "" : `${own}-${against}` };
      }),
    };
  });
  const played = bars.filter((b) => b.points !== null && b.minutes > 0);
  const points = bars.reduce((n, b) => n + (b.points ?? 0), 0);
  let best: { gameweek: number; points: number } | null = null;
  for (const b of played) if (best === null || (b.points as number) > best.points) best = { gameweek: b.gameweek, points: b.points as number };
  const position = POSITION_BY_TYPE[element.element_type] ?? "MID";
  return {
    playerId: element.id,
    name: element.web_name,
    teamShort: teamShortById.get(element.team) ?? "",
    position,
    price: money(element.now_cost),
    ownership: ownershipText(element),
    bars,
    totals: {
      points,
      goals: bars.reduce((n, b) => n + b.goals, 0),
      assists: bars.reduce((n, b) => n + b.assists, 0),
      bonus: bars.reduce((n, b) => n + b.bonus, 0),
      minutes: bars.reduce((n, b) => n + b.minutes, 0),
      appearances: played.length,
      average: played.length ? Math.round((points / played.length) * 10) / 10 : null,
      best,
    },
  };
}

// ---------- links from other pages ----------

/**
 * The Graphics Maker link a "Share image" button on another page opens: the player template pre-filled with the gameweek
 * range, position and/or player the page is showing. Anything that is not real is left out, so the graphic picks its own default.
 */
export function playerGraphicLink(input: {
  template: "player-projections" | "gw-top-scorers" | "player-history" | "stat-leaders";
  from?: number;
  to?: number;
  pos?: GraphicPosition | null;
  player?: number;
}): string {
  const real = (n: number | undefined): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;
  const range = real(input.from) && real(input.to) ? { from: input.from, to: input.to } : { from: 0, to: 0 };
  const spec: GraphicSpec = {
    ...DEFAULT_SPEC,
    template: input.template,
    ...range,
    pos: input.pos ?? null,
    players: real(input.player) ? [input.player] : [],
  };
  return `/graphics?${encodeSpec(spec)}`;
}

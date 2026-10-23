// Pure helpers for the Player Plot page (/player-plot): any player stat on X against any on Y.
// Nothing here is a model of its own. Every axis value is an official FPL number, one of our cached
// projections summed over the chosen gameweek range, or an exact ratio / difference of those (named
// in the stat's label). Missing data is null, never a made-up number.

export type PlotPosition = "GKP" | "DEF" | "MID" | "FWD";
export const PLOT_POSITIONS: PlotPosition[] = ["GKP", "DEF", "MID", "FWD"];
const POSITION_BY_TYPE: Record<number, PlotPosition> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

export type StatGroup = "Our projections" | "Team fixtures" | "Market" | "Results so far" | "Underlying" | "Luck check";
export type StatFormat = "int" | "dec1" | "dec2" | "price" | "percent";

export interface StatDef {
  key: string;
  label: string;
  group: StatGroup;
  format: StatFormat;
  /** Depends on the From-To gameweek range. */
  usesHorizon?: boolean;
}

export const PLOT_STATS: StatDef[] = [
  { key: "xpts_total", label: "Projected points (xPts, range total)", group: "Our projections", format: "dec1", usesHorizon: true },
  { key: "xpts_avg", label: "Projected points per GW", group: "Our projections", format: "dec2", usesHorizon: true },
  { key: "xpts_per_m", label: "xPts per £m (range total)", group: "Our projections", format: "dec2", usesHorizon: true },
  { key: "xmins_avg", label: "Expected minutes per GW", group: "Our projections", format: "int", usesHorizon: true },
  { key: "xgoal_pts", label: "Projected goal points", group: "Our projections", format: "dec1", usesHorizon: true },
  { key: "xassist_pts", label: "Projected assist points", group: "Our projections", format: "dec1", usesHorizon: true },

  { key: "team_goals_range", label: "Team projected goals (range total)", group: "Team fixtures", format: "dec1", usesHorizon: true },
  { key: "team_cs_avg", label: "Team clean-sheet chance (range average)", group: "Team fixtures", format: "percent", usesHorizon: true },

  { key: "price", label: "Price (£m)", group: "Market", format: "price" },
  { key: "ownership", label: "Ownership %", group: "Market", format: "percent" },
  { key: "transfers_in", label: "Transfers in this GW", group: "Market", format: "int" },
  { key: "transfers_out", label: "Transfers out this GW", group: "Market", format: "int" },
  { key: "net_transfers", label: "Net transfers this GW", group: "Market", format: "int" },
  { key: "price_change", label: "Price change since start (£m)", group: "Market", format: "dec1" },

  { key: "total_points", label: "Total points", group: "Results so far", format: "int" },
  { key: "ppg", label: "Points per game", group: "Results so far", format: "dec1" },
  { key: "form", label: "Form", group: "Results so far", format: "dec1" },
  { key: "points_per_m", label: "Points per £m", group: "Results so far", format: "dec2" },
  { key: "points_per_90", label: "Points per 90 minutes", group: "Results so far", format: "dec2" },
  { key: "minutes", label: "Minutes", group: "Results so far", format: "int" },
  { key: "starts", label: "Starts", group: "Results so far", format: "int" },
  { key: "goals", label: "Goals", group: "Results so far", format: "int" },
  { key: "assists", label: "Assists", group: "Results so far", format: "int" },
  { key: "goal_involvements", label: "Goal involvements (G+A)", group: "Results so far", format: "int" },
  { key: "clean_sheets", label: "Clean sheets", group: "Results so far", format: "int" },
  { key: "saves", label: "Saves", group: "Results so far", format: "int" },
  { key: "bonus", label: "Bonus points", group: "Results so far", format: "int" },
  { key: "bps", label: "BPS", group: "Results so far", format: "int" },

  { key: "xg", label: "Expected goals (xG)", group: "Underlying", format: "dec2" },
  { key: "xa", label: "Expected assists (xA)", group: "Underlying", format: "dec2" },
  { key: "xgi", label: "Expected goal involvements (xGI)", group: "Underlying", format: "dec2" },
  { key: "xg_90", label: "xG per 90", group: "Underlying", format: "dec2" },
  { key: "xa_90", label: "xA per 90", group: "Underlying", format: "dec2" },
  { key: "xgi_90", label: "xGI per 90", group: "Underlying", format: "dec2" },
  { key: "influence", label: "Influence", group: "Underlying", format: "dec1" },
  { key: "creativity", label: "Creativity", group: "Underlying", format: "dec1" },
  { key: "threat", label: "Threat", group: "Underlying", format: "dec1" },
  { key: "ict", label: "ICT index", group: "Underlying", format: "dec1" },
  { key: "dc_90", label: "Defensive contributions per 90", group: "Underlying", format: "dec2" },
  { key: "dc", label: "Defensive contributions (total)", group: "Underlying", format: "int" },
  { key: "saves_90", label: "Saves per 90", group: "Underlying", format: "dec2" },
  { key: "xgc_90", label: "Expected goals conceded per 90", group: "Underlying", format: "dec2" },
  { key: "gc_90", label: "Goals conceded per 90", group: "Underlying", format: "dec2" },
  { key: "cs_90", label: "Clean sheets per 90", group: "Underlying", format: "dec2" },

  { key: "goals_minus_xg", label: "Goals minus xG", group: "Luck check", format: "dec2" },
  { key: "assists_minus_xa", label: "Assists minus xA", group: "Luck check", format: "dec2" },
  { key: "gi_minus_xgi", label: "Goal involvements minus xGI", group: "Luck check", format: "dec2" },
];

export const STAT_GROUPS: StatGroup[] = ["Our projections", "Team fixtures", "Market", "Results so far", "Underlying", "Luck check"];

export function getStat(key: string): StatDef | undefined {
  return PLOT_STATS.find((s) => s.key === key);
}

export function formatStatValue(def: StatDef | undefined, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  switch (def?.format) {
    case "price": return `£${value.toFixed(1)}m`;
    case "percent": return `${value.toFixed(1)}%`;
    case "int": return Math.round(value).toLocaleString("en-GB");
    case "dec1": return value.toFixed(1);
    default: return value.toFixed(2);
  }
}

// ---------------------------------------------------------------------------------------------
// Building the plot rows
// ---------------------------------------------------------------------------------------------

/** The bootstrap-static element fields we read (FPL sends several numbers as strings). */
export interface PlotElement {
  id: number;
  web_name: string;
  element_type: number;
  team: number;
  now_cost: number;
  selected_by_percent: string;
  minutes: number;
  starts: number;
  total_points: number;
  points_per_game: string;
  form: string;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_per_90: number;
  expected_assists_per_90: number;
  expected_goal_involvements_per_90: number;
  defensive_contribution_per_90: number;
  defensive_contribution: number;
  saves_per_90: number;
  clean_sheets_per_90: number;
  expected_goals_conceded_per_90: number;
  goals_conceded_per_90: number;
  transfers_in_event: number;
  transfers_out_event: number;
  cost_change_start: number;
  status: string;
  chance_of_playing_next_round: number | null;
}

/** The cached projection fields we read (/api/cached/player-total-points). */
export interface PlotProjection {
  playerId: number;
  gameweekProjections?: Record<string, number>;
  xMinsPerGW?: Record<string, number>;
  pointsFromGoals?: Record<string, number>;
  pointsFromAssists?: Record<string, number>;
}

/** One team's per-gameweek projection (goals scored, or clean-sheet chance in %), as the team projection endpoints serve it. */
export interface TeamProjection {
  teamId: number;
  gameweekProjections: Record<string, number>;
}

export interface PlotPlayer {
  id: number;
  name: string;
  teamId: number;
  teamShort: string;
  position: PlotPosition;
  available: boolean;
  status: string;
  minutes: number;
  price: number;
  ownership: number;
  values: Record<string, number | null>;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function inRange(gw: string, from: number, to: number): boolean {
  const n = Number(gw);
  return Number.isFinite(n) && n >= from && n <= to;
}

/** Sum of the per-gameweek values from..to inclusive; null when none of those gameweeks has a value. */
export function horizonSum(map: Record<string, number> | undefined, from: number, to: number): number | null {
  if (!map) return null;
  let sum = 0;
  let count = 0;
  for (const [gw, v] of Object.entries(map)) {
    if (!inRange(gw, from, to) || typeof v !== "number" || !Number.isFinite(v)) continue;
    sum += v;
    count++;
  }
  return count === 0 ? null : sum;
}

function horizonMean(map: Record<string, number> | undefined, from: number, to: number): number | null {
  if (!map) return null;
  let sum = 0;
  let count = 0;
  for (const [gw, v] of Object.entries(map)) {
    if (!inRange(gw, from, to) || typeof v !== "number" || !Number.isFinite(v)) continue;
    sum += v;
    count++;
  }
  return count === 0 ? null : sum / count;
}

function horizonCount(map: Record<string, number> | undefined, from: number, to: number): number {
  if (!map) return 0;
  return Object.entries(map).filter(([gw, v]) => inRange(gw, from, to) && typeof v === "number" && Number.isFinite(v)).length;
}

function ratio(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b <= 0) return null;
  return a / b;
}

function diff(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a - b;
}

function isAvailable(e: PlotElement): boolean {
  if (["i", "s", "u", "n"].includes(e.status)) return false;
  if (e.chance_of_playing_next_round !== null && e.chance_of_playing_next_round !== undefined && e.chance_of_playing_next_round < 75) return false;
  return true;
}

export function buildPlotPlayers(input: {
  elements: PlotElement[];
  projections: PlotProjection[];
  teamShortById: Map<number, string>;
  fromGW: number;
  toGW: number;
  /** Our team-level projections per gameweek (goals scored, clean-sheet %), which already reflect each team's opponents. */
  teamProjections?: { goals?: TeamProjection[]; cs?: TeamProjection[] };
}): PlotPlayer[] {
  const { elements, projections, teamShortById, fromGW, toGW, teamProjections } = input;
  const projById = new Map(projections.map((p) => [p.playerId, p]));
  const teamGoals = new Map((teamProjections?.goals ?? []).map((t) => [t.teamId, t.gameweekProjections]));
  const teamCs = new Map((teamProjections?.cs ?? []).map((t) => [t.teamId, t.gameweekProjections]));
  return elements.map((e) => {
    const proj = projById.get(e.id);
    const price = e.now_cost / 10;
    const priceOrNull = price > 0 ? price : null;
    const minutes = e.minutes ?? 0;
    const goals = num(e.goals_scored);
    const assists = num(e.assists);
    const goalInvolvements = goals !== null && assists !== null ? goals + assists : null;
    const xg = num(e.expected_goals);
    const xa = num(e.expected_assists);
    const xgi = num(e.expected_goal_involvements);
    const totalPoints = num(e.total_points);
    const xptsTotal = horizonSum(proj?.gameweekProjections, fromGW, toGW);
    const xptsGWs = horizonCount(proj?.gameweekProjections, fromGW, toGW);
    const transfersIn = num(e.transfers_in_event);
    const transfersOut = num(e.transfers_out_event);
    const costChange = num(e.cost_change_start);

    const values: Record<string, number | null> = {
      xpts_total: xptsTotal,
      xpts_avg: xptsTotal !== null && xptsGWs > 0 ? xptsTotal / xptsGWs : null,
      xpts_per_m: ratio(xptsTotal, priceOrNull),
      xmins_avg: horizonMean(proj?.xMinsPerGW, fromGW, toGW),
      xgoal_pts: horizonSum(proj?.pointsFromGoals, fromGW, toGW),
      xassist_pts: horizonSum(proj?.pointsFromAssists, fromGW, toGW),

      team_goals_range: horizonSum(teamGoals.get(e.team), fromGW, toGW),
      team_cs_avg: horizonMean(teamCs.get(e.team), fromGW, toGW),

      price: priceOrNull ?? 0,
      ownership: num(e.selected_by_percent),
      transfers_in: transfersIn,
      transfers_out: transfersOut,
      net_transfers: transfersIn !== null && transfersOut !== null ? transfersIn - transfersOut : null,
      price_change: costChange !== null ? costChange / 10 : null,

      total_points: totalPoints,
      ppg: num(e.points_per_game),
      form: num(e.form),
      points_per_m: ratio(totalPoints, priceOrNull),
      points_per_90: minutes > 0 && totalPoints !== null ? (totalPoints / minutes) * 90 : null,
      minutes,
      starts: num(e.starts),
      goals,
      assists,
      goal_involvements: goalInvolvements,
      clean_sheets: num(e.clean_sheets),
      saves: num(e.saves),
      bonus: num(e.bonus),
      bps: num(e.bps),

      xg,
      xa,
      xgi,
      xg_90: num(e.expected_goals_per_90),
      xa_90: num(e.expected_assists_per_90),
      xgi_90: num(e.expected_goal_involvements_per_90),
      influence: num(e.influence),
      creativity: num(e.creativity),
      threat: num(e.threat),
      ict: num(e.ict_index),
      dc_90: num(e.defensive_contribution_per_90),
      dc: num(e.defensive_contribution),
      saves_90: num(e.saves_per_90),
      xgc_90: num(e.expected_goals_conceded_per_90),
      gc_90: num(e.goals_conceded_per_90),
      cs_90: num(e.clean_sheets_per_90),

      goals_minus_xg: diff(goals, xg),
      assists_minus_xa: diff(assists, xa),
      gi_minus_xgi: diff(goalInvolvements, xgi),
    };

    return {
      id: e.id,
      name: e.web_name,
      teamId: e.team,
      teamShort: teamShortById.get(e.team) ?? "",
      position: POSITION_BY_TYPE[e.element_type] ?? "MID",
      available: isAvailable(e),
      status: e.status,
      minutes,
      price,
      ownership: values.ownership ?? 0,
      values,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Filtering and ranking
// ---------------------------------------------------------------------------------------------

export interface PlotFilters {
  positions: PlotPosition[];
  teamIds: number[];
  minMinutes: number;
  maxPrice: number | null;
  ownershipMin: number | null;
  ownershipMax: number | null;
}

export function filterPlayers(players: PlotPlayer[], f: PlotFilters): PlotPlayer[] {
  return players.filter((p) => {
    if (f.positions.length && !f.positions.includes(p.position)) return false;
    if (f.teamIds.length && !f.teamIds.includes(p.teamId)) return false;
    if (p.minutes < f.minMinutes) return false;
    if (f.maxPrice !== null && p.price > f.maxPrice) return false;
    if (f.ownershipMin !== null && p.ownership < f.ownershipMin) return false;
    if (f.ownershipMax !== null && p.ownership > f.ownershipMax) return false;
    return true;
  });
}

/** The N players with the highest value of the stat (nulls skipped, ties by id). */
export function topByStat(players: PlotPlayer[], key: string, n: number): PlotPlayer[] {
  return players
    .filter((p) => p.values[key] !== null && p.values[key] !== undefined)
    .sort((a, b) => (b.values[key] as number) - (a.values[key] as number) || a.id - b.id)
    .slice(0, n);
}

export function median(values: Array<number | null | undefined>): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * The clearest players in the top-left (low X, high Y) and bottom-right (high X, low Y) corners around the
 * given medians, for the "Target / Avoid" lists on the share image. Ranked by distance into the corner,
 * with each axis normalised over the players passed in.
 */
export function quadrantPicks(
  players: PlotPlayer[],
  xKey: string,
  yKey: string,
  medX: number,
  medY: number,
  n: number,
): { tl: PlotPlayer[]; br: PlotPlayer[] } {
  const usable = players.filter((p) => p.values[xKey] != null && p.values[yKey] != null);
  if (usable.length === 0) return { tl: [], br: [] };
  const xs = usable.map((p) => p.values[xKey] as number);
  const ys = usable.map((p) => p.values[yKey] as number);
  const [xMin, xMax, yMin, yMax] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const nx = (v: number) => (xMax === xMin ? 0.5 : (v - xMin) / (xMax - xMin));
  const ny = (v: number) => (yMax === yMin ? 0.5 : (v - yMin) / (yMax - yMin));
  const rank = (list: PlotPlayer[], score: (p: PlotPlayer) => number) =>
    list.sort((a, b) => score(b) - score(a) || a.id - b.id).slice(0, n);
  const x = (p: PlotPlayer) => p.values[xKey] as number;
  const y = (p: PlotPlayer) => p.values[yKey] as number;
  return {
    tl: rank(usable.filter((p) => x(p) <= medX && y(p) >= medY), (p) => ny(y(p)) + (1 - nx(x(p)))),
    br: rank(usable.filter((p) => x(p) >= medX && y(p) <= medY), (p) => nx(x(p)) + (1 - ny(y(p)))),
  };
}

// ---------------------------------------------------------------------------------------------
// Scales and ticks
// ---------------------------------------------------------------------------------------------

export type ScaleKind = "linear" | "sqrt";

export interface Scale {
  /** value -> 0..1 along the axis */
  forward(v: number): number;
  inverse(t: number): number;
}

const signedSqrt = (v: number) => Math.sign(v) * Math.sqrt(Math.abs(v));
const signedSquare = (u: number) => Math.sign(u) * u * u;

/** "sqrt" is the stretched scale: it opens up the crowded low end (e.g. low ownership). Symmetric for negatives. */
export function makeScale(kind: ScaleKind, min: number, max: number): Scale {
  const f = kind === "sqrt" ? signedSqrt : (v: number) => v;
  const g = kind === "sqrt" ? signedSquare : (u: number) => u;
  const lo = f(min);
  const hi = f(max);
  const span = hi - lo;
  return {
    forward: (v) => (span === 0 ? 0.5 : (f(v) - lo) / span),
    inverse: (t) => (span === 0 ? min : g(lo + t * span)),
  };
}

const STEP_MULTIPLIERS = [1, 2, 2.5, 5];

function round10(v: number): number {
  return Math.round(v * 1e10) / 1e10;
}

function niceStep(rough: number): number {
  const exp = Math.floor(Math.log10(rough));
  const base = 10 ** exp;
  for (const m of [...STEP_MULTIPLIERS, 10]) {
    if (m * base >= rough - 1e-12) return m * base;
  }
  return 10 * base;
}

/** A round [lo, hi] that contains [min, max], sized for roughly `count` ticks. */
export function niceDomain(min: number, max: number, count: number): [number, number] {
  if (!(max > min)) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    min -= pad;
    max += pad;
  }
  const step = niceStep((max - min) / Math.max(1, count - 1));
  return [round10(Math.floor(min / step + 1e-9) * step), round10(Math.ceil(max / step - 1e-9) * step)];
}

/** Round tick values from lo to hi inclusive (lo and hi should come from niceDomain). */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  let best: number | null = null;
  let bestScore = Infinity;
  for (let exp = Math.floor(Math.log10(span)) - 3; exp <= Math.ceil(Math.log10(span)); exp++) {
    for (const m of STEP_MULTIPLIERS) {
      const step = m * 10 ** exp;
      const n = span / step;
      if (n < 1 || Math.abs(n - Math.round(n)) > 1e-6) continue;
      const score = Math.abs(Math.round(n) - (count - 1));
      if (score < bestScore) {
        bestScore = score;
        best = step;
      }
    }
  }
  if (best === null) return [lo, hi];
  const n = Math.round(span / best);
  return Array.from({ length: n + 1 }, (_, i) => (i === n ? hi : round10(lo + i * best!)));
}

// ---------------------------------------------------------------------------------------------
// Label placement
// ---------------------------------------------------------------------------------------------

export type LabelSide = "right" | "left" | "above" | "below";

export interface LabelPoint {
  id: number;
  /** dot centre in px */
  x: number;
  y: number;
  /** label box size in px */
  w: number;
  h: number;
  /** lower = more important, gets a label first */
  priority: number;
  /** dot radius in px */
  r: number;
}

export interface Rect { x: number; y: number; w: number; h: number }

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function labelRect(p: LabelPoint, side: LabelSide): Rect {
  const gap = p.r + 3;
  switch (side) {
    case "right": return { x: p.x + gap, y: p.y - p.h / 2, w: p.w, h: p.h };
    case "left": return { x: p.x - gap - p.w, y: p.y - p.h / 2, w: p.w, h: p.h };
    case "above": return { x: p.x - p.w / 2, y: p.y - gap - p.h, w: p.w, h: p.h };
    default: return { x: p.x - p.w / 2, y: p.y + gap, w: p.w, h: p.h };
  }
}

/**
 * Greedy label placement: points are visited in priority order; each takes the first of right / left /
 * above / below whose box stays inside the chart and overlaps neither a dot, an already placed label nor a
 * blocked area (e.g. a corner caption).
 * A point with no free side gets null (no label; it shows on hover or tap instead).
 */
export function declutterLabels(
  points: LabelPoint[],
  bounds: { width: number; height: number },
  blocked: Rect[] = [],
  /** The N highest-priority points may label over a blocked area if they have no other free side. */
  softTop = 0,
): Map<number, LabelSide | null> {
  const result = new Map<number, LabelSide | null>();
  const placed: Rect[] = [];
  const dots: Array<Rect & { id: number }> = points.map((p) => ({ id: p.id, x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }));
  const order = [...points].sort((a, b) => a.priority - b.priority || a.id - b.id);
  const tryPlace = (p: LabelPoint, avoid: Rect[]): LabelSide | null => {
    for (const side of ["right", "left", "above", "below"] as LabelSide[]) {
      const r = labelRect(p, side);
      if (r.x < 0 || r.y < 0 || r.x + r.w > bounds.width || r.y + r.h > bounds.height) continue;
      if (avoid.some((q) => overlaps(r, q))) continue;
      if (dots.some((d) => d.id !== p.id && overlaps(r, d))) continue;
      placed.push(r);
      return side;
    }
    return null;
  };
  order.forEach((p, i) => {
    let chosen = tryPlace(p, [...placed, ...blocked]);
    if (chosen === null && i < softTop) chosen = tryPlace(p, placed);
    result.set(p.id, chosen);
  });
  return result;
}

export { labelRect };

// ---------------------------------------------------------------------------------------------
// Page state <-> URL
// ---------------------------------------------------------------------------------------------

export type ColorMode = "club" | "position" | "price" | "ownership";
export type SizeMode = "none" | "ownership" | "price" | "minutes";

export const COLOR_MODES: Array<{ id: ColorMode; label: string }> = [
  { id: "club", label: "Club" },
  { id: "position", label: "Position" },
  { id: "price", label: "Price" },
  { id: "ownership", label: "Ownership" },
];
export const SIZE_MODES: Array<{ id: SizeMode; label: string }> = [
  { id: "none", label: "Same size" },
  { id: "ownership", label: "Ownership" },
  { id: "price", label: "Price" },
  { id: "minutes", label: "Minutes" },
];

export interface PlotState {
  x: string;
  y: string;
  positions: PlotPosition[];
  teamIds: number[];
  minMinutes: number;
  maxPrice: number | null;
  top: number;
  /** 0 = automatic (the next gameweeks) */
  from: number;
  to: number;
  xScale: ScaleKind;
  yScale: ScaleKind;
  median: boolean;
  /** An FPL team ID whose 15 players are ringed on the chart ("" = none). */
  mine: string;
  color: ColorMode;
  size: SizeMode;
  /** Draw the straight-line trend through the plotted players. */
  trend: boolean;
}

export const DEFAULT_PLOT_STATE: PlotState = {
  x: "ownership",
  y: "xpts_total",
  positions: [],
  teamIds: [],
  minMinutes: 0,
  maxPrice: null,
  top: 24,
  from: 0,
  to: 0,
  xScale: "sqrt",
  yScale: "linear",
  median: true,
  mine: "",
  color: "club",
  size: "none",
  trend: false,
};

export const MIN_TOP = 5;
export const MAX_TOP = 100;

function sameList<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function encodePlotState(state: PlotState): string {
  const d = DEFAULT_PLOT_STATE;
  // axes, scales and the minutes floor are only written when they differ from what the chosen position opens on
  const base = presetBaseline(state.positions);
  const params = new URLSearchParams();
  if (state.x !== base.x) params.set("x", state.x);
  if (state.y !== base.y) params.set("y", state.y);
  if (!sameList(state.positions, d.positions)) params.set("pos", state.positions.join(","));
  if (!sameList(state.teamIds, d.teamIds)) params.set("team", state.teamIds.join(","));
  if (state.minMinutes !== base.minMinutes) params.set("mins", String(state.minMinutes));
  if (state.maxPrice !== d.maxPrice && state.maxPrice !== null) params.set("maxp", String(state.maxPrice));
  if (state.top !== d.top) params.set("top", String(state.top));
  if (state.from !== d.from) params.set("from", String(state.from));
  if (state.to !== d.to) params.set("to", String(state.to));
  if (state.xScale !== base.xScale) params.set("xs", state.xScale);
  if (state.yScale !== base.yScale) params.set("ys", state.yScale);
  if (state.median !== d.median) params.set("med", state.median ? "1" : "0");
  if (state.mine) params.set("my", state.mine);
  if (state.color !== d.color) params.set("cb", state.color);
  if (state.size !== d.size) params.set("sz", state.size);
  if (state.trend) params.set("tr", "1");
  return params.toString().replace(/%2C/g, ",");
}

export function decodePlotState(search: string): PlotState {
  const d = DEFAULT_PLOT_STATE;
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const stat = (v: string | null, fallback: string) => (v && getStat(v) ? v : fallback);
  const int = (v: string | null, fallback: number, min: number) => {
    const n = v !== null && /^\d+$/.test(v) ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n >= min ? n : fallback;
  };
  const scale = (v: string | null, fallback: ScaleKind): ScaleKind => (v === "linear" || v === "sqrt" ? v : fallback);
  const maxPriceRaw = q.get("maxp");
  const maxPrice = maxPriceRaw !== null && /^\d+(\.\d+)?$/.test(maxPriceRaw) && parseFloat(maxPriceRaw) > 0 ? parseFloat(maxPriceRaw) : null;
  const positions = (q.get("pos") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is PlotPosition => (PLOT_POSITIONS as string[]).includes(s));
  const teamIds = (q.get("team") ?? "")
    .split(",")
    .filter((s) => /^\d+$/.test(s))
    .map((s) => parseInt(s, 10))
    .filter((n) => n > 0);
  const top = Math.min(MAX_TOP, Math.max(MIN_TOP, int(q.get("top"), d.top, 0)));
  const base = presetBaseline(positions);
  return {
    x: stat(q.get("x"), base.x),
    y: stat(q.get("y"), base.y),
    positions,
    teamIds,
    minMinutes: int(q.get("mins"), base.minMinutes, 0),
    maxPrice,
    top,
    from: int(q.get("from"), d.from, 1),
    to: int(q.get("to"), d.to, 1),
    xScale: scale(q.get("xs"), base.xScale),
    yScale: scale(q.get("ys"), base.yScale),
    median: q.get("med") === "0" ? false : q.get("med") === "1" ? true : d.median,
    mine: parseManagerId(q.get("my") ?? ""),
    color: COLOR_MODES.some((m) => m.id === q.get("cb")) ? (q.get("cb") as ColorMode) : d.color,
    size: SIZE_MODES.some((m) => m.id === q.get("sz")) ? (q.get("sz") as SizeMode) : d.size,
    trend: q.get("tr") === "1",
  };
}

/** A team ID from digits or an FPL entry link ("" when it is neither). */
export function parseManagerId(input: string): string {
  const text = input.trim();
  const fromLink = /entry\/(\d{1,9})(?:\D|$)/.exec(text);
  const id = fromLink ? fromLink[1] : /^\d{1,9}$/.test(text) ? text : "";
  return id && parseInt(id, 10) > 0 ? String(parseInt(id, 10)) : "";
}

// ---------------------------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------------------------

export interface PlotPreset {
  id: string;
  label: string;
  title: string;
  /** [] = the general presets (any/several positions); one entry = that position's presets */
  positions: PlotPosition[];
  x: string;
  y: string;
  xScale: ScaleKind;
  yScale: ScaleKind;
  /** Minutes floor applied with the preset (per-90 stats from a few minutes of football are noise). */
  minMinutes?: number;
  /** Corner captions, only where "top-left" etc. has a clear meaning for the two stats. */
  quadrants?: { tl: string; tr: string; bl: string; br: string };
  /** Top-left is the good corner and bottom-right the bad one (tints and Target/Avoid lists). Default true. */
  goodTopLeft?: boolean;
  hint: string;
}

const VALUE_QUADRANTS = { tl: "Bargains", tr: "Premium", bl: "Budget fillers", br: "Overpriced" };
const DIFF_QUADRANTS = { tl: "Differentials", tr: "Template picks", bl: "Avoid", br: "Overowned" };
const DIFF_HINT = "Up = more projected points. Left = fewer managers own them. Top-left players are your differentials; bottom-right are popular but projected to underdeliver.";
const VALUE_HINT = "Up = more projected points. Left = cheaper. Top-left players give the most points for the money.";

const FORM_PRICE_QUADRANTS = { tl: "Cheap and in form", tr: "Premium and in form", bl: "Cheap and cold", br: "Pricey and cold" };
const SEASON_QUADRANTS = { tl: "Bargains so far", tr: "Premium returners", bl: "Budget fillers", br: "Overpriced so far" };
const FORM_PRICE_HINT = "Up = better recent form (FPL's form figure). Left = cheaper.";
const SEASON_HINT = "Up = more points scored so far this season. Left = cheaper. Top-left players have returned the most for the money.";
const MINUTES_HINT = "Right = more expected minutes per gameweek (less rotation risk). Up = more projected points per gameweek. Top-right players are secure and productive.";

// The FIRST preset of each list is that list's default graph.
export const PLOT_PRESETS: PlotPreset[] = [
  // ---- All positions / several positions
  { id: "differentials", label: "Differentials", title: "Differentials: high xPts, low ownership", positions: [], x: "ownership", y: "xpts_total", xScale: "sqrt", yScale: "linear", quadrants: DIFF_QUADRANTS, hint: DIFF_HINT },
  { id: "value", label: "Value", title: "Value: projected points vs price", positions: [], x: "price", y: "xpts_total", xScale: "linear", yScale: "linear", quadrants: VALUE_QUADRANTS, hint: VALUE_HINT },
  {
    id: "form-price", label: "Form vs price", title: "Form vs price", positions: [], x: "price", y: "form", xScale: "linear", yScale: "linear",
    quadrants: { tl: "Cheap and in form", tr: "Premium and in form", bl: "Cheap and cold", br: "Pricey and cold" },
    hint: "Up = better recent form (FPL's form figure). Left = cheaper.",
  },
  {
    id: "luck", label: "Luck check", title: "Luck check: results vs underlying numbers", positions: [], x: "xgi", y: "gi_minus_xgi", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    hint: "Right = more expected goal involvements. Above zero = scoring/assisting more than the chances suggest (may cool off); below zero = unlucky (may come good).",
  },
  {
    id: "minutes", label: "Minutes security", title: "Minutes security: expected minutes vs projected points", positions: [], x: "xmins_avg", y: "xpts_avg", xScale: "linear", yScale: "linear", goodTopLeft: false,
    hint: "Right = more expected minutes per gameweek (less rotation risk). Up = more projected points per gameweek. Top-right players are secure and productive.",
  },

  {
    id: "market", label: "Market movers", title: "Market movers: who managers are buying and selling", positions: [], x: "net_transfers", y: "xpts_total", xScale: "linear", yScale: "linear", goodTopLeft: false,
    quadrants: { tl: "Sold but projected well", tr: "Bought and projected well", bl: "Sold and projected poorly", br: "Bought but projected poorly" },
    hint: "Right = more managers bought than sold the player this gameweek; left = more sold. Up = more projected points. Top-left is the contrarian zone; bottom-right is a bandwagon our projections do not back.",
  },
  {
    id: "form-xpts", label: "Form vs projection", title: "Form vs projection: is the form backed up?", positions: [], x: "form", y: "xpts_avg", xScale: "linear", yScale: "linear", goodTopLeft: false,
    quadrants: { tl: "Cold but projected well", tr: "In form and projected well", bl: "Cold and projected poorly", br: "Hot but may cool" },
    hint: "Right = better recent form (FPL's form figure). Up = more projected points per gameweek. Bottom-right players are hot now but our projections expect them to cool.",
  },
  {
    id: "form-diff", label: "In-form differentials", title: "In-form differentials: form vs ownership", positions: [], x: "ownership", y: "form", xScale: "sqrt", yScale: "linear",
    quadrants: { tl: "Hidden gems", tr: "Popular and hot", bl: "Under the radar", br: "Owned but cold" },
    hint: "Up = better recent form. Left = fewer managers own the player. Top-left players are hot and under-owned.",
  },
  { id: "season-value", label: "Season value", title: "Season value: points so far vs price", positions: [], x: "price", y: "total_points", xScale: "linear", yScale: "linear", quadrants: SEASON_QUADRANTS, hint: SEASON_HINT },
  {
    id: "efficiency", label: "Points per 90", title: "Efficiency: points per 90 vs minutes played", positions: [], x: "minutes", y: "points_per_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Efficient but rarely playing", tr: "Productive regulars", bl: "Quiet cameos", br: "Regulars returning little" },
    hint: "Right = more minutes played. Up = more points per 90 minutes. Top-right players are both regulars and productive; top-left players return well but play little.",
  },
  {
    id: "bonus", label: "Bonus magnets", title: "Bonus magnets: BPS vs bonus points", positions: [], x: "bps", y: "bonus", xScale: "linear", yScale: "linear", goodTopLeft: false,
    hint: "Right = more total BPS (the bonus points system's raw score). Up = more bonus points awarded. Players above the pack turn BPS into bonus most often.",
  },

  {
    id: "fixtures-attack", label: "Output vs fixtures", title: "Output vs fixtures: chances per 90 against the team's projected goals", positions: [], x: "team_goals_range", y: "xgi_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Good chances, tough run", tr: "Good chances, good run", bl: "Quiet, tough run", br: "Easy run, quiet so far" },
    hint: "Right = the team is projected to score more over the chosen gameweeks (a good run of fixtures). Up = more expected goal involvements per 90 so far. Top-right players have both the output and the fixtures.",
  },

  // ---- Goalkeepers
  { id: "gk-value", label: "Value", title: "Goalkeepers: value, xPts vs price", positions: ["GKP"], x: "price", y: "xpts_total", xScale: "linear", yScale: "linear", quadrants: VALUE_QUADRANTS, hint: VALUE_HINT },
  {
    id: "gk-saves", label: "Saves vs chances", title: "Goalkeepers: saves vs chances conceded", positions: ["GKP"], x: "xgc_90", y: "saves_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    hint: "Right = the team concedes better chances (expected goals conceded per 90). Up = more saves per 90, and save points. Busy keepers sit top-right, but they also concede more.",
  },
  {
    id: "gk-cs", label: "Clean sheets vs chances", title: "Goalkeepers: clean sheets vs chances conceded", positions: ["GKP"], x: "xgc_90", y: "cs_90", xScale: "linear", yScale: "linear", minMinutes: 180,
    quadrants: { tl: "Solid and lucky-proof", tr: "Keeping out chances", bl: "Poor defence", br: "Getting by" }, goodTopLeft: true,
    hint: "Left = the team allows fewer good chances (expected goals conceded per 90). Up = more clean sheets per 90. Top-left keepers are both well protected and keeping clean sheets.",
  },
  { id: "gk-diff", label: "Differentials", title: "Goalkeepers: high xPts, low ownership", positions: ["GKP"], x: "ownership", y: "xpts_total", xScale: "sqrt", yScale: "linear", quadrants: DIFF_QUADRANTS, hint: DIFF_HINT },
  { id: "gk-form", label: "Form vs price", title: "Goalkeepers: form vs price", positions: ["GKP"], x: "price", y: "form", xScale: "linear", yScale: "linear", quadrants: FORM_PRICE_QUADRANTS, hint: FORM_PRICE_HINT },
  { id: "gk-season", label: "Season value", title: "Goalkeepers: points so far vs price", positions: ["GKP"], x: "price", y: "total_points", xScale: "linear", yScale: "linear", quadrants: SEASON_QUADRANTS, hint: SEASON_HINT },
  {
    id: "gk-fixtures", label: "Clean sheets vs fixtures", title: "Goalkeepers: clean sheets so far vs the team's clean-sheet chance ahead", positions: ["GKP"], x: "team_cs_avg", y: "cs_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Overperforming the run", tr: "Solid and a good run", bl: "Poor so far, tough run", br: "Due clean sheets" },
    hint: "Right = our projections give the team a higher clean-sheet chance over the chosen gameweeks. Up = more clean sheets per 90 so far. Bottom-right keepers have a good run ahead but have not kept many so far.",
  },
  { id: "gk-minutes", label: "Minutes security", title: "Goalkeepers: expected minutes vs projected points", positions: ["GKP"], x: "xmins_avg", y: "xpts_avg", xScale: "linear", yScale: "linear", goodTopLeft: false, hint: MINUTES_HINT },

  // ---- Defenders
  {
    id: "def-attack", label: "Attack vs clean sheets", title: "Defenders: attacking threat vs clean sheets", positions: ["DEF"], x: "xgi_90", y: "cs_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Clean-sheet specialists", tr: "Attack and clean sheets", bl: "Quiet", br: "Attacking but leaky" },
    hint: "Right = more attacking threat (expected goal involvements per 90). Up = more clean sheets per 90. Top-right defenders return from both.",
  },
  { id: "def-value", label: "Value", title: "Defenders: value, xPts vs price", positions: ["DEF"], x: "price", y: "xpts_total", xScale: "linear", yScale: "linear", quadrants: VALUE_QUADRANTS, hint: VALUE_HINT },
  {
    id: "def-dc", label: "Defensive contributions", title: "Defenders: defensive contributions vs projected points", positions: ["DEF"], x: "dc_90", y: "xpts_total", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    hint: "Right = more defensive contributions per 90 (the extra-points threshold stat). Up = more projected points.",
  },
  { id: "def-diff", label: "Differentials", title: "Defenders: high xPts, low ownership", positions: ["DEF"], x: "ownership", y: "xpts_total", xScale: "sqrt", yScale: "linear", quadrants: DIFF_QUADRANTS, hint: DIFF_HINT },
  {
    id: "def-fixtures", label: "Clean sheets vs fixtures", title: "Defenders: clean sheets so far vs the team's clean-sheet chance ahead", positions: ["DEF"], x: "team_cs_avg", y: "cs_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Overperforming the run", tr: "Solid and a good run", bl: "Poor so far, tough run", br: "Due clean sheets" },
    hint: "Right = our projections give the team a higher clean-sheet chance over the chosen gameweeks. Up = more clean sheets per 90 so far. Bottom-right defenders have a good run ahead but have not kept many so far.",
  },
  { id: "def-form", label: "Form vs price", title: "Defenders: form vs price", positions: ["DEF"], x: "price", y: "form", xScale: "linear", yScale: "linear", quadrants: FORM_PRICE_QUADRANTS, hint: FORM_PRICE_HINT },
  { id: "def-season", label: "Season value", title: "Defenders: points so far vs price", positions: ["DEF"], x: "price", y: "total_points", xScale: "linear", yScale: "linear", quadrants: SEASON_QUADRANTS, hint: SEASON_HINT },
  { id: "def-minutes", label: "Minutes security", title: "Defenders: expected minutes vs projected points", positions: ["DEF"], x: "xmins_avg", y: "xpts_avg", xScale: "linear", yScale: "linear", goodTopLeft: false, hint: MINUTES_HINT },
  {
    id: "def-luck", label: "Luck check", title: "Defenders: luck check", positions: ["DEF"], x: "xgi", y: "gi_minus_xgi", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    hint: "Right = more expected goal involvements. Above zero = scoring/assisting more than the chances suggest (may cool off); below zero = unlucky (may come good).",
  },

  // ---- Midfielders
  {
    id: "mid-creators", label: "Creators vs scorers", title: "Midfielders: creators vs scorers", positions: ["MID"], x: "xa_90", y: "xg_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Goal threats", tr: "Complete mids", bl: "Quiet", br: "Creators" },
    hint: "Right = more expected assists per 90 (creating). Up = more expected goals per 90 (shooting). Top-right midfielders do both.",
  },
  { id: "mid-value", label: "Value", title: "Midfielders: value, xPts vs price", positions: ["MID"], x: "price", y: "xpts_total", xScale: "linear", yScale: "linear", quadrants: VALUE_QUADRANTS, hint: VALUE_HINT },
  {
    id: "mid-luck", label: "Luck check", title: "Midfielders: luck check", positions: ["MID"], x: "xgi", y: "gi_minus_xgi", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    hint: "Right = more expected goal involvements. Above zero = scoring/assisting more than the chances suggest (may cool off); below zero = unlucky (may come good).",
  },
  { id: "mid-diff", label: "Differentials", title: "Midfielders: high xPts, low ownership", positions: ["MID"], x: "ownership", y: "xpts_total", xScale: "sqrt", yScale: "linear", quadrants: DIFF_QUADRANTS, hint: DIFF_HINT },
  {
    id: "mid-threat", label: "Threat vs creativity", title: "Midfielders: threat vs creativity", positions: ["MID"], x: "creativity", y: "threat", xScale: "linear", yScale: "linear", goodTopLeft: false,
    quadrants: { tl: "Shooters", tr: "Complete mids", bl: "Quiet", br: "Creators" },
    hint: "Right = more creativity (FPL's chance-creation index). Up = more threat (FPL's goal-threat index). Top-right midfielders carry both.",
  },
  {
    id: "mid-fixtures", label: "Chances vs fixtures", title: "Midfielders: chances per 90 against the team's projected goals", positions: ["MID"], x: "team_goals_range", y: "xgi_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Good chances, tough run", tr: "Good chances, good run", bl: "Quiet, tough run", br: "Easy run, quiet so far" },
    hint: "Right = the team is projected to score more over the chosen gameweeks. Up = more expected goal involvements per 90. Top-right midfielders have the output and the fixtures.",
  },
  { id: "mid-form", label: "Form vs price", title: "Midfielders: form vs price", positions: ["MID"], x: "price", y: "form", xScale: "linear", yScale: "linear", quadrants: FORM_PRICE_QUADRANTS, hint: FORM_PRICE_HINT },
  { id: "mid-season", label: "Season value", title: "Midfielders: points so far vs price", positions: ["MID"], x: "price", y: "total_points", xScale: "linear", yScale: "linear", quadrants: SEASON_QUADRANTS, hint: SEASON_HINT },
  { id: "mid-minutes", label: "Minutes security", title: "Midfielders: expected minutes vs projected points", positions: ["MID"], x: "xmins_avg", y: "xpts_avg", xScale: "linear", yScale: "linear", goodTopLeft: false, hint: MINUTES_HINT },

  // ---- Forwards
  {
    id: "fwd-finishing", label: "Finishing", title: "Forwards: finishing vs chances", positions: ["FWD"], x: "xg", y: "goals_minus_xg", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    hint: "Right = more expected goals (better chances). Above zero = scoring more than the chances suggest (may cool off); below zero = unlucky or wasteful (may come good).",
  },
  { id: "fwd-value", label: "Value", title: "Forwards: value, xPts vs price", positions: ["FWD"], x: "price", y: "xpts_total", xScale: "linear", yScale: "linear", quadrants: VALUE_QUADRANTS, hint: VALUE_HINT },
  { id: "fwd-diff", label: "Differentials", title: "Forwards: high xPts, low ownership", positions: ["FWD"], x: "ownership", y: "xpts_total", xScale: "sqrt", yScale: "linear", quadrants: DIFF_QUADRANTS, hint: DIFF_HINT },
  {
    id: "fwd-minutes", label: "Minutes security", title: "Forwards: expected minutes vs projected points", positions: ["FWD"], x: "xmins_avg", y: "xpts_avg", xScale: "linear", yScale: "linear", goodTopLeft: false,
    hint: "Right = more expected minutes per gameweek (less rotation risk). Up = more projected points per gameweek.",
  },
  {
    id: "fwd-fixtures", label: "Chances vs fixtures", title: "Forwards: chances per 90 against the team's projected goals", positions: ["FWD"], x: "team_goals_range", y: "xg_90", xScale: "linear", yScale: "linear", minMinutes: 180, goodTopLeft: false,
    quadrants: { tl: "Good chances, tough run", tr: "Good chances, good run", bl: "Quiet, tough run", br: "Easy run, quiet so far" },
    hint: "Right = the team is projected to score more over the chosen gameweeks. Up = more expected goals per 90. Top-right forwards have the chances and the fixtures.",
  },
  { id: "fwd-form", label: "Form vs price", title: "Forwards: form vs price", positions: ["FWD"], x: "price", y: "form", xScale: "linear", yScale: "linear", quadrants: FORM_PRICE_QUADRANTS, hint: FORM_PRICE_HINT },
  { id: "fwd-season", label: "Season value", title: "Forwards: points so far vs price", positions: ["FWD"], x: "price", y: "total_points", xScale: "linear", yScale: "linear", quadrants: SEASON_QUADRANTS, hint: SEASON_HINT },
  {
    id: "fwd-chances", label: "Chances for the price", title: "Forwards: chance quality per 90 vs price", positions: ["FWD"], x: "price", y: "xg_90", xScale: "linear", yScale: "linear", minMinutes: 180,
    quadrants: { tl: "Cheap chance-getters", tr: "Premium chance-getters", bl: "Cheap and quiet", br: "Pricey and quiet" },
    hint: "Up = more expected goals per 90 (the quality and quantity of chances). Left = cheaper. Top-left forwards are getting premium-level chances at a lower price.",
  },
];

/** The presets to offer: that position's own list for exactly one position, otherwise the general list. */
export function presetsForPositions(positions: PlotPosition[]): PlotPreset[] {
  if (positions.length === 1) return PLOT_PRESETS.filter((p) => p.positions.length === 1 && p.positions[0] === positions[0]);
  return PLOT_PRESETS.filter((p) => p.positions.length === 0);
}

/** The graph a position (or All) opens on: the axes, scales and minutes floor of its first preset. */
export function presetBaseline(positions: PlotPosition[]): Pick<PlotState, "x" | "y" | "xScale" | "yScale" | "minMinutes"> {
  const first = presetsForPositions(positions)[0];
  return { x: first.x, y: first.y, xScale: first.xScale, yScale: first.yScale, minMinutes: first.minMinutes ?? 0 };
}

/** Apply a preset: its axes, scales and minutes floor (and its position, for a position preset); other filters stay. */
export function stateForPreset(state: PlotState, preset: PlotPreset): PlotState {
  return {
    ...state,
    positions: preset.positions.length === 1 ? [...preset.positions] : state.positions,
    x: preset.x,
    y: preset.y,
    xScale: preset.xScale,
    yScale: preset.yScale,
    minMinutes: preset.minMinutes ?? 0,
  };
}

/** Select one position (or null = All) and open its default graph; other filters stay. */
export function stateForPosition(state: PlotState, position: PlotPosition | null): PlotState {
  const positions = position ? [position] : [];
  return { ...state, positions, ...presetBaseline(positions) };
}

export function findPreset(state: Pick<PlotState, "x" | "y" | "positions">): PlotPreset | undefined {
  return presetsForPositions(state.positions).find((p) => p.x === state.x && p.y === state.y);
}

export function plotTitle(state: Pick<PlotState, "x" | "y" | "positions">): string {
  const preset = findPreset(state);
  if (preset) return preset.title;
  return `${getStat(state.y)?.label ?? state.y} vs ${getStat(state.x)?.label ?? state.x}`;
}

// ---------------------------------------------------------------------------------------------
// Colour and size by a third stat
// ---------------------------------------------------------------------------------------------

const POSITION_COLORS: Record<PlotPosition, string> = { GKP: "#f59e0b", DEF: "#10b981", MID: "#0ea5e9", FWD: "#f43f5e" };
const PRICE_BANDS = [
  { key: "p1", label: "Under £5.0m", color: "#34d399" },
  { key: "p2", label: "£5.0m to £6.9m", color: "#fbbf24" },
  { key: "p3", label: "£7.0m to £9.9m", color: "#fb923c" },
  { key: "p4", label: "£10.0m and over", color: "#ef4444" },
];
const OWNERSHIP_BANDS = [
  { key: "o1", label: "Under 5% owned", color: "#a5b4fc" },
  { key: "o2", label: "5% to 15%", color: "#818cf8" },
  { key: "o3", label: "15% to 30%", color: "#6366f1" },
  { key: "o4", label: "30% and over", color: "#4338ca" },
];

/** Which colour group a player falls in for this mode (null for club: the chart uses the club colour). */
export function colorCategory(p: PlotPlayer, mode: ColorMode): string | null {
  if (mode === "position") return p.position;
  if (mode === "price") return p.price < 5 ? "p1" : p.price < 7 ? "p2" : p.price < 10 ? "p3" : "p4";
  if (mode === "ownership") return p.ownership < 5 ? "o1" : p.ownership < 15 ? "o2" : p.ownership < 30 ? "o3" : "o4";
  return null;
}

export function colorLegend(mode: ColorMode): Array<{ key: string; label: string; color: string }> {
  if (mode === "position") return PLOT_POSITIONS.map((pos) => ({ key: pos, label: pos, color: POSITION_COLORS[pos] }));
  if (mode === "price") return PRICE_BANDS;
  if (mode === "ownership") return OWNERSHIP_BANDS;
  return [];
}

export function sizeValue(p: PlotPlayer, mode: SizeMode): number | null {
  if (mode === "ownership") return p.ownership;
  if (mode === "price") return p.price;
  if (mode === "minutes") return p.minutes;
  return null;
}

/** Dot radius: the base size, or 0.7x to 1.9x of it as the value goes from the smallest to the largest on the chart. */
export function dotRadius(value: number | null, min: number, max: number, base: number): number {
  if (value === null || !(max > min)) return base;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return base * (0.7 + 1.2 * t);
}

// ---------------------------------------------------------------------------------------------
// Trend line and outliers
// ---------------------------------------------------------------------------------------------

export interface TrendLine {
  slope: number;
  intercept: number;
  /** Share of the vertical spread the line explains (0 to 1). */
  r2: number;
  n: number;
}

/** Ordinary least squares through the points; null with fewer than three points or when x never changes. */
export function fitLine(points: Array<{ x: number; y: number }>): TrendLine | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const ssRes = points.reduce((a, p) => a + (p.y - (slope * p.x + intercept)) ** 2, 0);
  return { slope, intercept, r2: syy === 0 ? 1 : Math.max(0, 1 - ssRes / syy), n };
}

export interface Outlier {
  player: PlotPlayer;
  /** Actual minus what the line predicts (positive = above the line). */
  residual: number;
}

/** The players furthest above and below the line, largest gap first. */
export function trendOutliers(players: PlotPlayer[], xKey: string, yKey: string, line: TrendLine, n = 3): { above: Outlier[]; below: Outlier[] } {
  const rows: Outlier[] = [];
  for (const p of players) {
    const x = p.values[xKey];
    const y = p.values[yKey];
    if (x == null || y == null) continue;
    rows.push({ player: p, residual: y - (line.slope * x + line.intercept) });
  }
  return {
    above: rows.filter((r) => r.residual > 0).sort((a, b) => b.residual - a.residual).slice(0, n),
    below: rows.filter((r) => r.residual < 0).sort((a, b) => a.residual - b.residual).slice(0, n),
  };
}

// ---------------------------------------------------------------------------------------------
// My team on the chart
// ---------------------------------------------------------------------------------------------

/** The chart's players plus any of your squad that the filters or Top N left out (when they have both stats). */
export function withMine(shown: PlotPlayer[], all: PlotPlayer[], mine: Set<number>, xKey: string, yKey: string): PlotPlayer[] {
  if (mine.size === 0) return shown;
  const ids = new Set(shown.map((p) => p.id));
  const extra = all.filter((p) => mine.has(p.id) && !ids.has(p.id) && p.values[xKey] != null && p.values[yKey] != null);
  return extra.length ? [...shown, ...extra] : shown;
}

export interface MineRow {
  player: PlotPlayer;
  x: number | null;
  y: number | null;
  onChart: boolean;
}

/** Your squad with the two plotted values, best first by the vertical stat (missing values last). */
export function mineRows(all: PlotPlayer[], mine: Set<number>, xKey: string, yKey: string, shownIds: Set<number>): MineRow[] {
  return all
    .filter((p) => mine.has(p.id))
    .map((p) => {
      const x = p.values[xKey] ?? null;
      const y = p.values[yKey] ?? null;
      return { player: p, x, y, onChart: shownIds.has(p.id) && x !== null && y !== null };
    })
    .sort((a, b) => (b.y ?? -Infinity) - (a.y ?? -Infinity) || a.player.id - b.player.id);
}


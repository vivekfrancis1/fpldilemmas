// Pure helpers for the Player Plot page (/player-plot): any player stat on X against any on Y.
// Nothing here is a model of its own. Every axis value is an official FPL number, one of our cached
// projections summed over the chosen gameweek range, or an exact ratio / difference of those (named
// in the stat's label). Missing data is null, never a made-up number.

export type PlotPosition = "GKP" | "DEF" | "MID" | "FWD";
export const PLOT_POSITIONS: PlotPosition[] = ["GKP", "DEF", "MID", "FWD"];
const POSITION_BY_TYPE: Record<number, PlotPosition> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

export type StatGroup = "Our projections" | "Market" | "Results so far" | "Underlying" | "Luck check";
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

  { key: "goals_minus_xg", label: "Goals minus xG", group: "Luck check", format: "dec2" },
  { key: "assists_minus_xa", label: "Assists minus xA", group: "Luck check", format: "dec2" },
  { key: "gi_minus_xgi", label: "Goal involvements minus xGI", group: "Luck check", format: "dec2" },
];

export const STAT_GROUPS: StatGroup[] = ["Our projections", "Market", "Results so far", "Underlying", "Luck check"];

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
}): PlotPlayer[] {
  const { elements, projections, teamShortById, fromGW, toGW } = input;
  const projById = new Map(projections.map((p) => [p.playerId, p]));
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

interface Rect { x: number; y: number; w: number; h: number }

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
 * above / below whose box stays inside the chart and overlaps neither a dot nor an already placed label.
 * A point with no free side gets null (no label; it shows on hover or tap instead).
 */
export function declutterLabels(points: LabelPoint[], bounds: { width: number; height: number }): Map<number, LabelSide | null> {
  const result = new Map<number, LabelSide | null>();
  const placed: Rect[] = [];
  const dots: Array<Rect & { id: number }> = points.map((p) => ({ id: p.id, x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }));
  const order = [...points].sort((a, b) => a.priority - b.priority || a.id - b.id);
  for (const p of order) {
    let chosen: LabelSide | null = null;
    for (const side of ["right", "left", "above", "below"] as LabelSide[]) {
      const r = labelRect(p, side);
      if (r.x < 0 || r.y < 0 || r.x + r.w > bounds.width || r.y + r.h > bounds.height) continue;
      if (placed.some((q) => overlaps(r, q))) continue;
      if (dots.some((d) => d.id !== p.id && overlaps(r, d))) continue;
      chosen = side;
      placed.push(r);
      break;
    }
    result.set(p.id, chosen);
  }
  return result;
}

export { labelRect };

// ---------------------------------------------------------------------------------------------
// Page state <-> URL
// ---------------------------------------------------------------------------------------------

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
};

export const MIN_TOP = 5;
export const MAX_TOP = 100;

function sameList<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function encodePlotState(state: PlotState): string {
  const d = DEFAULT_PLOT_STATE;
  const params = new URLSearchParams();
  if (state.x !== d.x) params.set("x", state.x);
  if (state.y !== d.y) params.set("y", state.y);
  if (!sameList(state.positions, d.positions)) params.set("pos", state.positions.join(","));
  if (!sameList(state.teamIds, d.teamIds)) params.set("team", state.teamIds.join(","));
  if (state.minMinutes !== d.minMinutes) params.set("mins", String(state.minMinutes));
  if (state.maxPrice !== d.maxPrice && state.maxPrice !== null) params.set("maxp", String(state.maxPrice));
  if (state.top !== d.top) params.set("top", String(state.top));
  if (state.from !== d.from) params.set("from", String(state.from));
  if (state.to !== d.to) params.set("to", String(state.to));
  if (state.xScale !== d.xScale) params.set("xs", state.xScale);
  if (state.yScale !== d.yScale) params.set("ys", state.yScale);
  if (state.median !== d.median) params.set("med", state.median ? "1" : "0");
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
  return {
    x: stat(q.get("x"), d.x),
    y: stat(q.get("y"), d.y),
    positions,
    teamIds,
    minMinutes: int(q.get("mins"), d.minMinutes, 0),
    maxPrice,
    top,
    from: int(q.get("from"), d.from, 1),
    to: int(q.get("to"), d.to, 1),
    xScale: scale(q.get("xs"), d.xScale),
    yScale: scale(q.get("ys"), d.yScale),
    median: q.get("med") === "0" ? false : q.get("med") === "1" ? true : d.median,
  };
}

// ---------------------------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------------------------

export interface PlotPreset {
  id: string;
  label: string;
  title: string;
  x: string;
  y: string;
  xScale: ScaleKind;
  yScale: ScaleKind;
  /** Corner captions, only where "top-left" etc. has a clear meaning for the two stats. */
  quadrants?: { tl: string; tr: string; bl: string; br: string };
  hint: string;
}

export const PLOT_PRESETS: PlotPreset[] = [
  {
    id: "differentials",
    label: "Differentials",
    title: "Differentials: high xPts, low ownership",
    x: "ownership",
    y: "xpts_total",
    xScale: "sqrt",
    yScale: "linear",
    quadrants: { tl: "Differentials", tr: "Template picks", bl: "Avoid", br: "Overowned" },
    hint: "Up = more projected points. Left = fewer managers own them. Top-left players are your differentials; bottom-right are popular but projected to underdeliver.",
  },
  {
    id: "value",
    label: "Value",
    title: "Value: projected points vs price",
    x: "price",
    y: "xpts_total",
    xScale: "linear",
    yScale: "linear",
    quadrants: { tl: "Bargains", tr: "Premium", bl: "Budget fillers", br: "Overpriced" },
    hint: "Up = more projected points. Left = cheaper. Top-left players give the most points for the money.",
  },
  {
    id: "form-price",
    label: "Form vs price",
    title: "Form vs price",
    x: "price",
    y: "form",
    xScale: "linear",
    yScale: "linear",
    quadrants: { tl: "Cheap and in form", tr: "Premium and in form", bl: "Cheap and cold", br: "Pricey and cold" },
    hint: "Up = better recent form (FPL's form figure). Left = cheaper.",
  },
  {
    id: "luck",
    label: "Luck check",
    title: "Luck check: results vs underlying numbers",
    x: "xgi",
    y: "gi_minus_xgi",
    xScale: "linear",
    yScale: "linear",
    hint: "Right = more expected goal involvements. Above zero = scoring/assisting more than the chances suggest (may cool off); below zero = unlucky (may come good).",
  },
];

export function plotTitle(state: Pick<PlotState, "x" | "y">): string {
  const preset = PLOT_PRESETS.find((p) => p.x === state.x && p.y === state.y);
  if (preset) return preset.title;
  return `${getStat(state.y)?.label ?? state.y} vs ${getStat(state.x)?.label ?? state.x}`;
}

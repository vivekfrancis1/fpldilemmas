// Pure helpers for the radar chart on the Compare page (/compare). Every axis is a real FPL number, our own
// xPts projection, or an exact per-90 ratio of FPL season totals. Nothing is estimated: stats the FPL API does not
// carry (big chances, key passes, box touches, corners taken) are deliberately not offered.

export interface RadarAxisDef {
  key: string;
  label: string;
  /** Short label for the chart itself. */
  short: string;
  decimals: number;
  /** Per-90 axes need MIN_RADAR_MINUTES played; the projection axis does not. */
  per90: boolean;
}

export const RADAR_AXES: RadarAxisDef[] = [
  { key: "xg_90", label: "xG per 90", short: "xG/90", decimals: 2, per90: true },
  { key: "xa_90", label: "xA per 90", short: "xA/90", decimals: 2, per90: true },
  { key: "xgi_90", label: "xGI per 90", short: "xGI/90", decimals: 2, per90: true },
  { key: "goals_90", label: "Goals per 90", short: "Goals/90", decimals: 2, per90: true },
  { key: "assists_90", label: "Assists per 90", short: "Assists/90", decimals: 2, per90: true },
  { key: "threat_90", label: "Threat per 90", short: "Threat/90", decimals: 1, per90: true },
  { key: "creativity_90", label: "Creativity per 90", short: "Creativity/90", decimals: 1, per90: true },
  { key: "influence_90", label: "Influence per 90", short: "Influence/90", decimals: 1, per90: true },
  { key: "bonus_90", label: "Bonus per 90", short: "Bonus/90", decimals: 2, per90: true },
  { key: "points_90", label: "Points per 90", short: "Points/90", decimals: 1, per90: true },
  { key: "dc_90", label: "Defensive contributions per 90", short: "Def. contr./90", decimals: 1, per90: true },
  { key: "xpts_gw", label: "xPts per gameweek (next 5)", short: "xPts/GW", decimals: 1, per90: false },
];

export const DEFAULT_RADAR_AXES = ["xg_90", "xa_90", "threat_90", "creativity_90", "influence_90", "points_90", "xpts_gw"];
export const MIN_RADAR_AXES = 3;
export const MAX_RADAR_AXES = 8;
/** Below this many minutes a per-90 value is too noisy to plot, so it is treated as missing. */
export const MIN_RADAR_MINUTES = 180;

export interface RadarElement {
  minutes: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  bonus: number;
  threat: string | number;
  creativity: string | number;
  influence: string | number;
  expected_goals_per_90?: number | string | null;
  expected_assists_per_90?: number | string | null;
  expected_goal_involvements_per_90?: number | string | null;
  defensive_contribution_per_90?: number | string | null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function per90(total: unknown, minutes: number): number | null {
  const t = num(total);
  return t === null ? null : (t / minutes) * 90;
}

/** One player's value on one axis, or null when it is unavailable (unknown axis, too few minutes, missing data). */
export function radarValue(key: string, e: RadarElement, xptsPerGw: number | null): number | null {
  const def = RADAR_AXES.find((a) => a.key === key);
  if (!def) return null;
  if (key === "xpts_gw") return xptsPerGw;
  if (!(e.minutes >= MIN_RADAR_MINUTES)) return null;
  switch (key) {
    case "xg_90": return num(e.expected_goals_per_90);
    case "xa_90": return num(e.expected_assists_per_90);
    case "xgi_90": return num(e.expected_goal_involvements_per_90);
    case "dc_90": return num(e.defensive_contribution_per_90);
    case "goals_90": return per90(e.goals_scored, e.minutes);
    case "assists_90": return per90(e.assists, e.minutes);
    case "threat_90": return per90(e.threat, e.minutes);
    case "creativity_90": return per90(e.creativity, e.minutes);
    case "influence_90": return per90(e.influence, e.minutes);
    case "bonus_90": return per90(e.bonus, e.minutes);
    case "points_90": return per90(e.total_points, e.minutes);
    default: return null;
  }
}

export interface RadarSeries {
  id: number;
  raw: Array<number | null>;
  /** 0 to 1: the value divided by the best value among the compared players; missing values are 0. */
  scaled: number[];
}

export function buildRadarSeries(
  players: Array<{ id: number; element: RadarElement; xptsPerGw: number | null }>,
  axisKeys: string[],
): { axes: RadarAxisDef[]; max: number[]; series: RadarSeries[] } {
  const axes = axisKeys
    .map((k) => RADAR_AXES.find((a) => a.key === k))
    .filter((a): a is RadarAxisDef => !!a);
  const raws = players.map((p) => axes.map((a) => radarValue(a.key, p.element, p.xptsPerGw)));
  const max = axes.map((_, i) => {
    const vals = raws.map((r) => r[i]).filter((v): v is number => v !== null);
    return vals.length ? Math.max(...vals) : 0;
  });
  const series = players.map((p, row) => ({
    id: p.id,
    raw: raws[row],
    scaled: raws[row].map((v, i) => (v === null || max[i] <= 0 ? 0 : Math.max(0, v) / max[i])),
  }));
  return { axes, max, series };
}

/** Point at `radius` along axis `index` of `count`. Axis 0 points straight up and the rest follow clockwise. */
export function polarPoint(cx: number, cy: number, radius: number, index: number, count: number): { x: number; y: number } {
  const angle = (index / count) * 2 * Math.PI;
  return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
}

/** "xg_90,xa_90,..." -> valid keys in registry order. Too few valid keys (or nothing) means the default set. */
export function parseRadarAxes(param: string | null | undefined): string[] {
  if (!param) return DEFAULT_RADAR_AXES;
  const valid: string[] = [];
  for (const raw of param.split(",")) {
    const key = raw.trim();
    if (!RADAR_AXES.some((a) => a.key === key) || valid.includes(key)) continue;
    valid.push(key);
    if (valid.length === MAX_RADAR_AXES) break;
  }
  if (valid.length < MIN_RADAR_AXES) return DEFAULT_RADAR_AXES;
  return RADAR_AXES.map((a) => a.key).filter((k) => valid.includes(k));
}

/** Empty string for the default selection so the shared URL stays short. */
export function encodeRadarAxes(keys: string[]): string {
  const ordered = RADAR_AXES.map((a) => a.key).filter((k) => keys.includes(k));
  return ordered.join(",") === DEFAULT_RADAR_AXES.join(",") ? "" : ordered.join(",");
}

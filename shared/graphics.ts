// Pure helpers for the Graphics Maker (/graphics): branded, shareable images built from data the site already
// serves. Nothing here is a model of its own: every number is an official FPL value, one of our cached xPts
// projections summed over the chosen gameweeks, or a plain count/average of those. Missing data is null (shown
// as a dash), never a made-up number. The pixels live in the client; this module decides what goes on each graphic.

import { bestValueIndexes, fixturesForGameweeks, projectionWindow, teamsWithUnscheduledFixtures, type CompareFixtureInput, type TeamFixture } from "./compare-utils";
import { shareFileName } from "./share-cards";

// ---------- templates, sizes, themes ----------

export type TemplateId = "player-card" | "player-comparison" | "fixtures-comparison" | "price-change" | "top-differentials";

export const GRAPHIC_TEMPLATES: Array<{ id: TemplateId; label: string; description: string; headline: string }> = [
  { id: "player-card", label: "Player Card", description: "One player: price, ownership, form, points, xPts and next fixtures", headline: "Player Card" },
  { id: "player-comparison", label: "Player Comparison", description: "2-3 players side by side, best value highlighted", headline: "Player Comparison" },
  { id: "fixtures-comparison", label: "Fixtures Comparison", description: "2-4 teams over a gameweek range, coloured by official FDR", headline: "Fixture Comparison" },
  { id: "price-change", label: "Price Change", description: "Confirmed risers and fallers for a day", headline: "Price Changes" },
  { id: "top-differentials", label: "Top Differentials", description: "Highest xPts among low-owned players", headline: "Top Differentials" },
];

export type SizeId = "square" | "portrait" | "landscape";
export const GRAPHIC_SIZES: Record<SizeId, { label: string; width: number; height: number }> = {
  square: { label: "Square", width: 1080, height: 1080 },
  portrait: { label: "Portrait", width: 1080, height: 1350 },
  landscape: { label: "Landscape (X)", width: 1200, height: 675 },
};

export type ThemeId = "indigo" | "midnight" | "light" | "club";
export const GRAPHIC_THEMES: ThemeId[] = ["indigo", "midnight", "light", "club"];
export const THEME_LABEL: Record<ThemeId, string> = { indigo: "Indigo", midnight: "Midnight", light: "Light", club: "Club colour" };

export interface GraphicTheme {
  bg: string;
  bg2: string;
  text: string;
  muted: string;
  accent: string;
  panel: string;
  panelBorder: string;
  good: string;
  bad: string;
}

const THEMES: Record<Exclude<ThemeId, "club">, GraphicTheme> = {
  indigo: { bg: "#26235f", bg2: "#3730a3", text: "#ffffff", muted: "#c7d2fe", accent: "#fbbf24", panel: "rgba(255,255,255,0.10)", panelBorder: "rgba(255,255,255,0.18)", good: "#6ee7b7", bad: "#fca5a5" },
  midnight: { bg: "#0b1020", bg2: "#121936", text: "#f8fafc", muted: "#a5b4cb", accent: "#fbbf24", panel: "rgba(255,255,255,0.07)", panelBorder: "rgba(255,255,255,0.14)", good: "#34d399", bad: "#f87171" },
  light: { bg: "#f8fafc", bg2: "#e2e8f0", text: "#0f172a", muted: "#475569", accent: "#4338ca", panel: "rgba(15,23,42,0.06)", panelBorder: "rgba(15,23,42,0.14)", good: "#047857", bad: "#b91c1c" },
};

// ---------- colour helpers ----------

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex) ?? [148, 163, 184];
  const mixed = rgb.map((v) => Math.round(v + (255 - v) * amount));
  return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** The club theme is the Midnight look with the club colour as the accent, lightened only if too dark to read. */
export function resolveTheme(id: ThemeId, clubColor: string | null | undefined): GraphicTheme {
  if (id !== "club") return THEMES[id];
  if (!clubColor || !parseHex(clubColor)) return THEMES.indigo;
  const base = THEMES.midnight;
  let accent = clubColor;
  for (let i = 0; i < 12 && Math.min(contrastRatio(accent, base.bg), contrastRatio(accent, base.bg2)) < 3; i++) {
    accent = lighten(accent, 0.15);
  }
  return { ...base, accent };
}

// Official FPL fixture-difficulty colours.
const FDR: Record<number, { bg: string; fg: string }> = {
  1: { bg: "#257d5a", fg: "#ffffff" },
  2: { bg: "#00ff86", fg: "#000000" },
  3: { bg: "#ebebe4", fg: "#000000" },
  4: { bg: "#ff005a", fg: "#ffffff" },
  5: { bg: "#861d46", fg: "#ffffff" },
};

export function fdrColor(difficulty: number): { bg: string; fg: string } {
  const d = Math.min(5, Math.max(1, Math.round(difficulty)));
  return FDR[d];
}

// ---------- watermark and footer ----------

export const WATERMARK_NAME = "FPL DILEMMAS";
export const WATERMARK_SITE = "fpldilemmas.com";

/** Every graphic carries this, bottom right, in a footer strip reserved for it. */
export function watermarkText(): string {
  return `${WATERMARK_NAME} · ${WATERMARK_SITE}`;
}

/** Height of the footer strip (watermark + note) in image pixels: small, and outside the content area. */
export function footerHeight(size: SizeId): number {
  return size === "landscape" ? 52 : size === "portrait" ? 68 : 64;
}

/** How many risers / fallers fit on each size. */
export const PRICE_LIST_LIMIT: Record<SizeId, number> = { square: 7, portrait: 10, landscape: 5 };

export function usesProjections(spec: GraphicSpec): boolean {
  if (spec.template === "player-card" || spec.template === "top-differentials") return true;
  if (spec.template === "player-comparison") return (spec.stats.length ? spec.stats : DEFAULT_COMPARE_STATS).includes("xpts");
  return false;
}

export function footerNote(spec: GraphicSpec, gwLabel: string | null): string {
  const parts = [gwLabel, usesProjections(spec) ? "Projections are estimates, not guarantees" : null].filter((p): p is string => !!p);
  return parts.length ? parts.join(" · ") : "Data from the official FPL API";
}

export function gameweekLabel(from: number, to: number): string {
  return from === to ? `GW${from}` : `GW${from}-${to}`;
}

export function resolveHeadline(spec: GraphicSpec): string {
  const custom = spec.headline.trim();
  if (custom) return custom;
  return GRAPHIC_TEMPLATES.find((t) => t.id === spec.template)!.headline;
}

export function graphicFileName(spec: GraphicSpec, parts: string[] = []): string {
  return shareFileName([spec.template, ...parts]);
}

// ---------- the spec and its link ----------

export type GraphicPosition = "GKP" | "DEF" | "MID" | "FWD";
const POSITIONS: GraphicPosition[] = ["GKP", "DEF", "MID", "FWD"];
const POSITION_BY_TYPE: Record<number, GraphicPosition> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

export interface GraphicStat {
  key: string;
  label: string;
  better: "higher" | "lower" | null;
}

/** Stats a comparison can show. `better: null` stats (price, ownership) are never highlighted. */
export const GRAPHIC_STATS: GraphicStat[] = [
  { key: "xpts", label: "xPts (range total)", better: "higher" },
  { key: "now_cost", label: "Price", better: null },
  { key: "selected_by_percent", label: "Selected by", better: null },
  { key: "form", label: "Form", better: "higher" },
  { key: "points_per_game", label: "Points per game", better: "higher" },
  { key: "total_points", label: "Total points", better: "higher" },
  { key: "minutes", label: "Minutes", better: "higher" },
  { key: "goals_scored", label: "Goals", better: "higher" },
  { key: "assists", label: "Assists", better: "higher" },
  { key: "clean_sheets", label: "Clean sheets", better: "higher" },
  { key: "goals_conceded", label: "Goals conceded", better: "lower" },
  { key: "saves", label: "Saves", better: "higher" },
  { key: "bonus", label: "Bonus points", better: "higher" },
  { key: "bps", label: "BPS", better: "higher" },
  { key: "ict_index", label: "ICT index", better: "higher" },
  { key: "threat", label: "Threat", better: "higher" },
  { key: "creativity", label: "Creativity", better: "higher" },
  { key: "influence", label: "Influence", better: "higher" },
  { key: "yellow_cards", label: "Yellow cards", better: "lower" },
  { key: "red_cards", label: "Red cards", better: "lower" },
];

export const DEFAULT_COMPARE_STATS = ["xpts", "now_cost", "selected_by_percent", "form", "total_points", "goals_scored", "assists"];
export const MAX_STATS = 8;
export const MAX_RANGE_GAMEWEEKS = 8;
export const MAX_HEADLINE = 60;

export interface GraphicSpec {
  template: TemplateId;
  size: SizeId;
  theme: ThemeId;
  headline: string;
  players: number[];
  teams: number[];
  /** Comparison stats; empty means "use the defaults". */
  stats: string[];
  /** Gameweek range; 0/0 means "the next few gameweeks". */
  from: number;
  to: number;
  pos: GraphicPosition | null;
  /** Differentials: ownership must be under this %. */
  maxOwn: number;
  top: number;
  /** Price Change: YYYY-MM-DD; empty means "the latest day with changes". */
  date: string;
}

export const DEFAULT_SPEC: GraphicSpec = {
  template: "player-card",
  size: "square",
  theme: "indigo",
  headline: "",
  players: [],
  teams: [],
  stats: [],
  from: 0,
  to: 0,
  pos: null,
  maxOwn: 10,
  top: 5,
  date: "",
};

const MAX_PLAYERS: Record<TemplateId, number> = { "player-card": 1, "player-comparison": 3, "fixtures-comparison": 3, "price-change": 3, "top-differentials": 3 };
const MAX_TEAMS = 4;

const intOrNull = (v: string | null): number | null => (v !== null && /^\d+$/.test(v) ? parseInt(v, 10) : null);

function idList(v: string | null, max: number): number[] {
  const out: number[] = [];
  for (const raw of (v ?? "").split(",")) {
    if (!/^\d+$/.test(raw)) continue;
    const n = parseInt(raw, 10);
    if (n > 0 && !out.includes(n)) out.push(n);
    if (out.length === max) break;
  }
  return out;
}

export function decodeSpec(search: string): GraphicSpec {
  const d = DEFAULT_SPEC;
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const template = (GRAPHIC_TEMPLATES.find((t) => t.id === q.get("t"))?.id ?? d.template) as TemplateId;
  const size = (q.get("size") as SizeId) in GRAPHIC_SIZES ? (q.get("size") as SizeId) : d.size;
  const theme = GRAPHIC_THEMES.includes(q.get("theme") as ThemeId) ? (q.get("theme") as ThemeId) : d.theme;

  const stats: string[] = [];
  for (const key of (q.get("s") ?? "").split(",")) {
    if (GRAPHIC_STATS.some((s) => s.key === key) && !stats.includes(key)) stats.push(key);
    if (stats.length === MAX_STATS) break;
  }

  let from = intOrNull(q.get("from")) ?? 0;
  let to = intOrNull(q.get("to")) ?? 0;
  if (from < 1 || to < 1) {
    from = 0;
    to = 0;
  } else {
    to = Math.min(from + MAX_RANGE_GAMEWEEKS - 1, Math.max(from, to));
  }

  const posRaw = (q.get("pos") ?? "").toUpperCase();
  const own = intOrNull(q.get("own"));
  const top = intOrNull(q.get("top"));
  const date = q.get("d") ?? "";

  return {
    template,
    size,
    theme,
    headline: (q.get("h") ?? "").slice(0, MAX_HEADLINE),
    players: idList(q.get("p"), MAX_PLAYERS[template]),
    teams: idList(q.get("tm"), MAX_TEAMS),
    stats,
    from,
    to,
    pos: (POSITIONS as string[]).includes(posRaw) ? (posRaw as GraphicPosition) : null,
    maxOwn: own !== null && own >= 1 && own <= 100 ? own : d.maxOwn,
    top: top !== null && top >= 1 ? Math.min(10, Math.max(3, top)) : d.top,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
  };
}

/** The query string for a spec (no leading ?). Values equal to the defaults are left out, so the default is "". */
export function encodeSpec(spec: GraphicSpec): string {
  const d = DEFAULT_SPEC;
  const parts: string[] = [];
  const add = (key: string, value: string) => parts.push(`${key}=${encodeURIComponent(value).replace(/%2C/g, ",")}`);
  if (spec.template !== d.template) add("t", spec.template);
  if (spec.size !== d.size) add("size", spec.size);
  if (spec.theme !== d.theme) add("theme", spec.theme);
  if (spec.headline) add("h", spec.headline.slice(0, MAX_HEADLINE));
  if (spec.players.length) add("p", spec.players.join(","));
  if (spec.teams.length) add("tm", spec.teams.join(","));
  if (spec.stats.length) add("s", spec.stats.join(","));
  if (spec.from > 0 && spec.to > 0) {
    add("from", String(spec.from));
    add("to", String(spec.to));
  }
  if (spec.pos) add("pos", spec.pos);
  if (spec.maxOwn !== d.maxOwn) add("own", String(spec.maxOwn));
  if (spec.top !== d.top) add("top", String(spec.top));
  if (spec.date) add("d", spec.date);
  return parts.join("&");
}

// ---------- stat values ----------

/** The FPL element fields the graphics read. Numbers FPL sends as strings (form, ownership) are parsed here. */
export type GraphicElement = {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  status?: string;
  [key: string]: unknown;
};

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export function statValue(key: string, element: GraphicElement, xpts: number | null): number | null {
  if (key === "xpts") return xpts;
  if (key === "now_cost") return toNumber(element.now_cost) === null ? null : (element.now_cost as number) / 10;
  return toNumber(element[key]);
}

export function formatStat(key: string, value: number | null): string {
  if (value === null) return "—";
  switch (key) {
    case "now_cost": return `£${value.toFixed(1)}m`;
    case "selected_by_percent": return `${value.toFixed(1)}%`;
    case "xpts":
    case "form":
    case "points_per_game":
    case "ict_index":
    case "threat":
    case "creativity":
    case "influence":
      return value.toFixed(1);
    default: return String(Math.round(value));
  }
}

const money = (tenths: number) => `£${(tenths / 10).toFixed(1)}m`;

// ---------- Player Card ----------

export interface PlayerCardContent {
  name: string;
  fullName: string;
  teamShort: string;
  teamName: string;
  teamId: number;
  position: GraphicPosition;
  price: string;
  tiles: Array<{ label: string; value: string }>;
  xpts: { total: number | null; perGameweek: Array<{ gameweek: number; value: number | null }> };
  fixtures: Array<{ gameweek: number; items: Array<{ opponent: string; isHome: boolean; difficulty: number }> }>;
  news: string | null;
}

export function buildPlayerCard(input: {
  element: GraphicElement;
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
  gameweekProjections: Record<string, number> | undefined | null;
  gameweeks: number[];
  fixtures: CompareFixtureInput[];
}): PlayerCardContent {
  const { element, teamShortById, teamNameById, gameweekProjections, gameweeks, fixtures } = input;
  const position = POSITION_BY_TYPE[element.element_type] ?? "MID";
  const teamShort = teamShortById.get(element.team) ?? "";
  const tile = (label: string, key: string) => ({ label, value: formatStat(key, statValue(key, element, null)) });
  const specific =
    position === "GKP" ? [tile("Clean sheets", "clean_sheets"), tile("Saves", "saves")]
    : position === "DEF" ? [tile("Clean sheets", "clean_sheets"), tile("Goals", "goals_scored")]
    : [tile("Goals", "goals_scored"), tile("Assists", "assists")];
  const window = projectionWindow(gameweekProjections, gameweeks);
  const first = typeof element.first_name === "string" ? element.first_name : "";
  const second = typeof element.second_name === "string" ? element.second_name : "";
  const news = typeof element.news === "string" && element.news.trim() ? element.news.trim() : null;
  return {
    name: element.web_name,
    fullName: `${first} ${second}`.trim() || element.web_name,
    teamShort,
    teamName: teamNameById.get(element.team) ?? teamShort,
    teamId: element.team,
    position,
    price: money(element.now_cost),
    tiles: [
      tile("Selected by", "selected_by_percent"),
      tile("Form", "form"),
      tile("Points per game", "points_per_game"),
      tile("Total points", "total_points"),
      tile("Minutes", "minutes"),
      tile("Bonus points", "bonus"),
      ...specific,
    ],
    xpts: { total: window.total, perGameweek: window.gameweeks.map((gameweek, i) => ({ gameweek, value: window.perGameweek[i] })) },
    fixtures: fixturesForGameweeks(element.team, fixtures, gameweeks).map((g) => ({
      gameweek: g.gameweek,
      items: g.fixtures.map((f: TeamFixture) => ({ opponent: teamShortById.get(f.opponentId) ?? "?", isHome: f.isHome, difficulty: f.difficulty })),
    })),
    news,
  };
}

// ---------- Player Comparison ----------

export interface ComparisonContent {
  columns: Array<{ id: number; name: string; teamShort: string; teamId: number; position: GraphicPosition }>;
  rows: Array<{ key: string; label: string; values: string[]; best: number[] }>;
}

export function buildComparison(input: {
  elements: GraphicElement[];
  statKeys: string[];
  xptsByPlayer: Map<number, number | null>;
  teamShortById: Map<number, string>;
}): ComparisonContent {
  const { elements, xptsByPlayer, teamShortById } = input;
  const keys = (input.statKeys.length ? input.statKeys : DEFAULT_COMPARE_STATS).filter((k) => GRAPHIC_STATS.some((s) => s.key === k));
  return {
    columns: elements.map((e) => ({
      id: e.id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      teamId: e.team,
      position: POSITION_BY_TYPE[e.element_type] ?? "MID",
    })),
    rows: keys.map((key) => {
      const def = GRAPHIC_STATS.find((s) => s.key === key)!;
      const values = elements.map((e) => statValue(key, e, xptsByPlayer.get(e.id) ?? null));
      return {
        key,
        label: def.label,
        values: values.map((v) => formatStat(key, v)),
        best: def.better ? bestValueIndexes(values, def.better) : [],
      };
    }),
  };
}

// ---------- Fixtures Comparison ----------

export interface FixtureGridCell {
  gameweek: number;
  fixtures: Array<{ opponent: string; isHome: boolean; difficulty: number }>;
  /** "fixtures" has at least one match; "tbc" has none but an unscheduled match exists; "blank" has none. */
  status: "fixtures" | "tbc" | "blank";
}

export interface FixtureGridContent {
  gameweeks: number[];
  rows: Array<{ teamId: number; short: string; name: string; cells: FixtureGridCell[]; avgFdr: number | null }>;
}

export function buildFixturesGrid(input: {
  teamIds: number[];
  gameweeks: number[];
  fixtures: CompareFixtureInput[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
}): FixtureGridContent {
  const { teamIds, gameweeks, fixtures, teamShortById, teamNameById } = input;
  const unscheduled = teamsWithUnscheduledFixtures(fixtures);
  return {
    gameweeks,
    rows: teamIds.map((teamId) => {
      const cells: FixtureGridCell[] = fixturesForGameweeks(teamId, fixtures, gameweeks).map((g) => ({
        gameweek: g.gameweek,
        fixtures: g.fixtures.map((f) => ({ opponent: teamShortById.get(f.opponentId) ?? "?", isHome: f.isHome, difficulty: f.difficulty })),
        status: g.fixtures.length ? "fixtures" : unscheduled.has(teamId) ? "tbc" : "blank",
      }));
      const all = cells.flatMap((c) => c.fixtures.map((f) => f.difficulty));
      return {
        teamId,
        short: teamShortById.get(teamId) ?? "",
        name: teamNameById.get(teamId) ?? teamShortById.get(teamId) ?? "",
        cells,
        avgFdr: all.length ? all.reduce((a, b) => a + b, 0) / all.length : null,
      };
    }),
  };
}

// ---------- Price Change ----------

export interface PriceChangeInput {
  player_name: string;
  team_name: string;
  position: string;
  old_price: number;
  current_price: number;
  price_change: number;
  change_date: string;
  ownership: number;
}

export interface PriceChangeRow {
  name: string;
  team: string;
  position: string;
  price: string;
  change: string;
  ownership: number;
}

export interface PriceChangeContent {
  date: string | null;
  availableDates: string[];
  risers: PriceChangeRow[];
  fallers: PriceChangeRow[];
  moreRisers: number;
  moreFallers: number;
}

export function buildPriceChanges(input: { changes: PriceChangeInput[]; date: string | null; limit: number }): PriceChangeContent {
  const real = input.changes.filter((c) => c.price_change !== 0).map((c) => ({ ...c, day: String(c.change_date).slice(0, 10) }));
  const availableDates = Array.from(new Set(real.map((c) => c.day))).sort().reverse().slice(0, 14);
  const date = input.date || availableDates[0] || null;
  const day = real.filter((c) => c.day === date);
  const order = (a: PriceChangeInput, b: PriceChangeInput) => b.ownership - a.ownership || a.player_name.localeCompare(b.player_name);
  const toRow = (c: PriceChangeInput): PriceChangeRow => ({
    name: c.player_name,
    team: c.team_name,
    position: c.position,
    price: money(c.current_price),
    change: `${c.price_change > 0 ? "+" : "-"}£${(Math.abs(c.price_change) / 10).toFixed(1)}m`,
    ownership: c.ownership,
  });
  const risers = day.filter((c) => c.price_change > 0).sort(order);
  const fallers = day.filter((c) => c.price_change < 0).sort(order);
  return {
    date,
    availableDates,
    risers: risers.slice(0, input.limit).map(toRow),
    fallers: fallers.slice(0, input.limit).map(toRow),
    moreRisers: Math.max(0, risers.length - input.limit),
    moreFallers: Math.max(0, fallers.length - input.limit),
  };
}

// ---------- Top Differentials ----------

export interface DifferentialRow {
  rank: number;
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  ownership: string;
  xpts: number;
  doubtful: boolean;
}

// Players who cannot be picked are never recommended: injured, suspended, unavailable, not in the squad.
const EXCLUDED_STATUS = new Set(["i", "s", "u", "n"]);

export function buildDifferentials(input: {
  elements: GraphicElement[];
  projections: Array<{ playerId: number; gameweekProjections?: Record<string, number> }>;
  teamShortById: Map<number, string>;
  from: number;
  to: number;
  pos: GraphicPosition | null;
  maxOwn: number;
  top: number;
}): DifferentialRow[] {
  const { elements, projections, teamShortById, from, to, pos, maxOwn, top } = input;
  const gameweeks: number[] = [];
  for (let gw = from; gw <= to; gw++) gameweeks.push(gw);
  const projectionById = new Map(projections.map((p) => [p.playerId, p.gameweekProjections]));
  const rows: Array<Omit<DifferentialRow, "rank"> & { own: number }> = [];
  for (const e of elements) {
    if (EXCLUDED_STATUS.has(e.status ?? "a")) continue;
    const position = POSITION_BY_TYPE[e.element_type];
    if (!position || (pos && position !== pos)) continue;
    const own = toNumber(e.selected_by_percent);
    if (own === null || own >= maxOwn) continue;
    const total = projectionWindow(projectionById.get(e.id), gameweeks).total;
    if (total === null) continue;
    rows.push({
      id: e.id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position,
      price: money(e.now_cost),
      ownership: `${own.toFixed(1)}%`,
      xpts: total,
      doubtful: e.status === "d",
      own,
    });
  }
  rows.sort((a, b) => b.xpts - a.xpts || a.own - b.own || a.name.localeCompare(b.name));
  return rows.slice(0, top).map(({ own: _own, ...r }, i) => ({ rank: i + 1, ...r }));
}

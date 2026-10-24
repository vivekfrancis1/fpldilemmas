// Pure helpers for the Graphics Maker (/graphics): branded, shareable images built from data the site already
// serves. Nothing here is a model of its own: every number is an official FPL value, one of our cached xPts
// projections summed over the chosen gameweeks, or a plain count/average of those. Missing data is null (shown
// as a dash), never a made-up number. The pixels live in the client; this module decides what goes on each graphic.

import { bestValueIndexes, fixturesForGameweeks, projectionWindow, teamsWithUnscheduledFixtures, type CompareFixtureInput, type TeamFixture } from "./compare-utils";
import { shareFileName } from "./share-cards";
import { bestLineup, type LineupPlayer } from "./lineup";
import type { MatchPredictionsContent, MatchPreviewContent, MatchReportContent, MatchResultsContent } from "./graphics-matches";

// ---------- templates, sizes, themes ----------

export type TemplateId = "player-card" | "player-comparison" | "fixtures-comparison" | "price-change" | "top-differentials" | "predicted-lineup" | "team-reveal" | "cover" | "player-news" | "captain-picks" | "fixture-ticker" | "transfer-trends" | "team-of-the-week" | "stat-leaders" | "availability-watch" | "match-predictions" | "match-results" | "match-preview" | "match-report";

export const GRAPHIC_TEMPLATES: Array<{ id: TemplateId; label: string; description: string; headline: string }> = [
  { id: "player-card", label: "Player Card", description: "One player: price, ownership, form, points, xPts and next fixtures", headline: "Player Card" },
  { id: "player-comparison", label: "Player Comparison", description: "2-3 players side by side, best value highlighted", headline: "Player Comparison" },
  { id: "fixtures-comparison", label: "Fixtures Comparison", description: "2-4 teams over a gameweek range, coloured by official FDR", headline: "Fixture Comparison" },
  { id: "price-change", label: "Price Change", description: "Confirmed risers and fallers for a day", headline: "Price Changes" },
  { id: "top-differentials", label: "Top Differentials", description: "Highest xPts among low-owned players", headline: "Top Differentials" },
  { id: "predicted-lineup", label: "Predicted Lineups", description: "Most likely XI for a club, from expected minutes", headline: "Predicted Lineup" },
  { id: "team-reveal", label: "Team Reveal", description: "Your 15-man squad on a pitch with captain, bench and chip", headline: "Team Reveal" },
  { id: "cover", label: "Cover Generator", description: "A bold cover image with your headline and up to 3 featured players", headline: "Gameweek Preview" },
  { id: "player-news", label: "Player News Quote", description: "A player's official FPL news, or your own quote, as a shareable card", headline: "Player News" },
  { id: "captain-picks", label: "Captain Picks", description: "Top captain options for a gameweek by our expected points", headline: "Captain Picks" },
  { id: "fixture-ticker", label: "Fixture Ticker", description: "Every club's next fixtures in one grid, easiest run first", headline: "Fixture Ticker" },
  { id: "transfer-trends", label: "Transfer Trends", description: "Most transferred in and out this gameweek", headline: "Transfer Trends" },
  { id: "team-of-the-week", label: "Team of the Week", description: "The best legal XI of a finished gameweek by actual points", headline: "Team of the Week" },
  { id: "stat-leaders", label: "Stat Leaders", description: "Top players for any stat: goals, assists, xG, bonus and more", headline: "Stat Leaders" },
  { id: "availability-watch", label: "Availability Watch", description: "Injury, doubt and suspension news for the most-owned players", headline: "Availability Watch" },
  { id: "match-predictions", label: "Match Predictions", description: "Every fixture of a gameweek: expected goals, win chances and clean-sheet chances", headline: "Match Predictions" },
  { id: "match-results", label: "Match Results", description: "Every finished score of a gameweek, with the scorers", headline: "Match Results" },
  { id: "match-preview", label: "Match Preview", description: "One fixture: expected goals, chances, recent form and the best-projected players", headline: "Match Preview" },
  { id: "match-report", label: "Match Report", description: "One finished match: score, goals, assists, cards and bonus points", headline: "Match Report" },
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
  if (spec.template === "player-card" || spec.template === "top-differentials" || spec.template === "predicted-lineup" || spec.template === "captain-picks" || spec.template === "match-predictions" || spec.template === "match-preview") return true;
  if (spec.template === "player-comparison") return (spec.stats.length ? spec.stats : DEFAULT_COMPARE_STATS).includes("xpts");
  return false;
}

export function footerNote(spec: GraphicSpec, gwLabel: string | null): string {
  // A cover is just a headline and the watermark: no data note
  if (spec.template === "cover") return "";
  // Player News Quote: say whose words these are
  if (spec.template === "player-news") return spec.quote.trim() ? "Quote entered by the creator" : "Source: official FPL player news";
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
export const POSITION_BY_TYPE: Record<number, GraphicPosition> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

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
  /** Team Reveal: the 15 squad ids (order kept), the bench ids among them, captain / vice (0 = none), chip, manager name. */
  squad: number[];
  bench: number[];
  captain: number;
  vice: number;
  chip: ChipId;
  manager: string;
  /** Cover Generator: a line under the headline and a small tag (e.g. "GW9" or "Deadline tonight"). */
  subtitle: string;
  tag: string;
  /** Player News Quote: a typed quote (empty = use the official FPL news) and who it is attributed to. */
  quote: string;
  source: string;
  /** Stat Leaders: the FPL stat to rank by (a key of LEADER_STATS). */
  stat: string;
  /** Creator brand: an optional @handle (stored without the @) shown on the footer strip next to the watermark, and an accent colour (#rrggbb). */
  handle: string;
  accent: string;
  /** Match Preview / Match Report: the FPL fixture id (0 = the first fixture that fits). */
  fixture: number;
  /** Match Predictions / Match Results: which page of a long gameweek (1-based). */
  page: number;
}

export const MAX_PAGE = 20;

export type ChipId = "" | "wildcard" | "freehit" | "bboost" | "3xc";
export const CHIP_IDS: ChipId[] = ["", "wildcard", "freehit", "bboost", "3xc"];
export const CHIP_LABELS: Record<Exclude<ChipId, "">, string> = { wildcard: "Wildcard", freehit: "Free Hit", bboost: "Bench Boost", "3xc": "Triple Captain" };
export const SQUAD_SIZE = 15;
export const BENCH_PLAYERS = 4;
export const MAX_MANAGER_NAME = 40;
export const MAX_SUBTITLE = 80;
export const MAX_TAG = 24;
export const MAX_QUOTE = 280;
export const MAX_SOURCE = 60;

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
  squad: [],
  bench: [],
  captain: 0,
  vice: 0,
  chip: "",
  manager: "",
  subtitle: "",
  tag: "",
  quote: "",
  source: "",
  stat: "goals_scored",
  handle: "",
  accent: "",
  fixture: 0,
  page: 1,
};

const MAX_PLAYERS: Record<TemplateId, number> = { "player-card": 1, "player-comparison": 3, "fixtures-comparison": 3, "price-change": 3, "top-differentials": 3, "predicted-lineup": 3, "team-reveal": 3, cover: 3, "player-news": 1, "captain-picks": 3, "fixture-ticker": 3, "transfer-trends": 3, "team-of-the-week": 3, "stat-leaders": 3, "availability-watch": 3, "match-predictions": 3, "match-results": 3, "match-preview": 3, "match-report": 3 };
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

  const squad = idList(q.get("sq"), SQUAD_SIZE);
  const bench = idList(q.get("bn"), BENCH_PLAYERS).filter((id) => squad.includes(id));
  const captainRaw = intOrNull(q.get("cap")) ?? 0;
  const captain = squad.includes(captainRaw) ? captainRaw : 0;
  const viceRaw = intOrNull(q.get("vc")) ?? 0;
  const vice = squad.includes(viceRaw) && viceRaw !== captain ? viceRaw : 0;
  const chipRaw = q.get("chip") ?? "";

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
    squad,
    bench,
    captain,
    vice,
    chip: (CHIP_IDS as string[]).includes(chipRaw) ? (chipRaw as ChipId) : "",
    manager: (q.get("mgr") ?? "").slice(0, MAX_MANAGER_NAME),
    subtitle: (q.get("sub") ?? "").slice(0, MAX_SUBTITLE),
    tag: (q.get("tag") ?? "").slice(0, MAX_TAG),
    quote: (q.get("q") ?? "").slice(0, MAX_QUOTE),
    source: (q.get("src") ?? "").slice(0, MAX_SOURCE),
    stat: LEADER_STATS.some((x) => x.key === q.get("st")) ? (q.get("st") as string) : d.stat,
    handle: normaliseHandle(q.get("handle") ?? ""),
    accent: normaliseAccent(q.get("accent") ?? ""),
    fixture: intOrNull(q.get("fx")) ?? 0,
    page: Math.min(MAX_PAGE, Math.max(1, intOrNull(q.get("pg")) ?? 1)),
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
  if (spec.squad.length) add("sq", spec.squad.join(","));
  if (spec.bench.length) add("bn", spec.bench.join(","));
  if (spec.captain) add("cap", String(spec.captain));
  if (spec.vice) add("vc", String(spec.vice));
  if (spec.chip) add("chip", spec.chip);
  if (spec.manager) add("mgr", spec.manager.slice(0, MAX_MANAGER_NAME));
  if (spec.subtitle) add("sub", spec.subtitle.slice(0, MAX_SUBTITLE));
  if (spec.tag) add("tag", spec.tag.slice(0, MAX_TAG));
  if (spec.quote) add("q", spec.quote.slice(0, MAX_QUOTE));
  if (spec.source) add("src", spec.source.slice(0, MAX_SOURCE));
  if (spec.stat !== d.stat) add("st", spec.stat);
  if (spec.handle) add("handle", spec.handle);
  if (spec.accent) add("accent", spec.accent.replace(/^#/, ""));
  if (spec.fixture) add("fx", String(spec.fixture));
  if (spec.page > 1) add("pg", String(spec.page));
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

export function toNumber(v: unknown): number | null {
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

/** Expected goals to one decimal place, e.g. 1.64 -> "1.6". */
export function formatGoals(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
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
export const EXCLUDED_STATUS = new Set(["i", "s", "u", "n"]);

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

// ---------- Predicted Lineup ----------

export interface LineupProjection {
  playerId: number;
  /** Expected minutes per gameweek, keyed by gameweek number ("8"). */
  xMinsPerGW?: Record<string, number>;
  chanceOfPlayingNextRound?: number | null;
}

export interface LineupToken {
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  /** Whole expected minutes, capped at 90. */
  xMins: number;
  flag: "injured" | "doubtful" | null;
  /** Chance of playing (0-99) when FPL gives one below 100, otherwise null. */
  chance: number | null;
}

export interface PredictedLineupContent {
  teamId: number;
  teamShort: string;
  teamName: string;
  gameweek: number;
  /** "4-4-2"; null when no legal XI can be formed from the players with expected minutes. */
  formation: string | null;
  complete: boolean;
  rows: Array<{ position: GraphicPosition; players: LineupToken[] }>;
  /** Next players by expected minutes after the XI (at most BENCH_SIZE). */
  bench: LineupToken[];
  fixtures: Array<{ opponent: string; isHome: boolean }>;
  doubleGameweek: boolean;
  blank: boolean;
}

export const BENCH_SIZE = 5;
const ROW_ORDER: GraphicPosition[] = ["GKP", "DEF", "MID", "FWD"];
const TYPE_BY_POSITION: Record<GraphicPosition, 1 | 2 | 3 | 4> = { GKP: 1, DEF: 2, MID: 3, FWD: 4 };

/**
 * The likeliest XI for one club in one gameweek: the legal XI (1 GKP, 3-5 DEF, 2-5 MID, 1-3 FWD) with the most
 * total expected minutes, using the same formation search as the FPL lineup helper. Expected minutes are our
 * own projections (they already include injury news); this is not official team news. Players with no expected
 * minutes that gameweek, or who are unavailable or suspended, are never listed.
 */
export function buildPredictedLineup(input: {
  teamId: number;
  gameweek: number;
  elements: GraphicElement[];
  projections: LineupProjection[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
  fixtures: CompareFixtureInput[];
}): PredictedLineupContent {
  const { teamId, gameweek, elements, projections, teamShortById, teamNameById, fixtures } = input;
  const teamShort = teamShortById.get(teamId) ?? "";
  const projectionById = new Map(projections.map((p) => [p.playerId, p]));

  const tokens = new Map<number, LineupToken>();
  const candidates: LineupPlayer[] = [];
  for (const e of elements) {
    if (e.team !== teamId || e.status === "u" || e.status === "s") continue;
    const position = POSITION_BY_TYPE[e.element_type];
    const proj = projectionById.get(e.id);
    const raw = proj?.xMinsPerGW?.[String(gameweek)];
    if (!position || typeof raw !== "number" || !(raw > 0)) continue;
    const xMins = Math.min(90, Math.round(raw));
    const chance = typeof proj?.chanceOfPlayingNextRound === "number" && proj.chanceOfPlayingNextRound < 100 ? proj.chanceOfPlayingNextRound : null;
    tokens.set(e.id, {
      id: e.id,
      name: e.web_name,
      teamShort,
      position,
      xMins,
      flag: e.status === "i" ? "injured" : e.status === "d" ? "doubtful" : null,
      chance,
    });
    // rank on the unrounded minutes so near-ties are decided by the real forecast
    candidates.push({ id: e.id, elementType: TYPE_BY_POSITION[position], xPts: raw });
  }

  const best = bestLineup(candidates);
  const byMinutes = (a: LineupToken, b: LineupToken) => b.xMins - a.xMins || a.id - b.id;
  let starting: LineupToken[];
  let complete = best.complete && best.starting.length === 11;
  if (complete) {
    starting = best.starting.map((p) => tokens.get(p.id)!);
  } else {
    // No legal XI: show the most likely players that do exist, never invent the rest.
    starting = Array.from(tokens.values()).sort(byMinutes).slice(0, 11);
    complete = false;
  }
  const startingIds = new Set(starting.map((p) => p.id));
  const rows = ROW_ORDER.map((position) => ({
    position,
    players: starting.filter((p) => p.position === position).sort(byMinutes),
  }));
  const bench = Array.from(tokens.values()).filter((p) => !startingIds.has(p.id)).sort(byMinutes).slice(0, BENCH_SIZE);
  const count = (pos: GraphicPosition) => rows.find((r) => r.position === pos)!.players.length;
  const gw = fixturesForGameweeks(teamId, fixtures, [gameweek])[0].fixtures;
  return {
    teamId,
    teamShort,
    teamName: teamNameById.get(teamId) ?? teamShort,
    gameweek,
    formation: complete ? `${count("DEF")}-${count("MID")}-${count("FWD")}` : null,
    complete,
    rows,
    bench,
    fixtures: gw.map((f) => ({ opponent: teamShortById.get(f.opponentId) ?? "?", isHome: f.isHome })),
    doubleGameweek: gw.length > 1,
    blank: gw.length === 0,
  };
}


// ---------- Team Reveal ----------

export const SQUAD_QUOTA: Record<GraphicPosition, number> = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };
export const MAX_PER_CLUB = 3;
const POSITION_WORD: Record<GraphicPosition, string> = { GKP: "goalkeepers", DEF: "defenders", MID: "midfielders", FWD: "forwards" };
// Legal outfield counts in the starting XI (the goalkeeper is always 1).
const XI_RANGE: Record<"DEF" | "MID" | "FWD", [number, number]> = { DEF: [3, 5], MID: [2, 5], FWD: [1, 3] };

export interface RevealToken {
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  fixtures: Array<{ opponent: string; isHome: boolean; difficulty: number }>;
  isCaptain: boolean;
  isVice: boolean;
}

export interface TeamRevealContent {
  complete: boolean;
  /** What still needs fixing before the squad can be drawn; empty when complete. */
  problems: string[];
  /** "4-4-2"; null until the squad is complete. */
  formation: string | null;
  gameweek: number;
  /** The XI by position (GKP, DEF, MID, FWD); empty rows until the squad is complete. */
  rows: Array<{ position: GraphicPosition; players: RevealToken[] }>;
  /** Goalkeeper first, then the outfield bench in the order chosen. */
  bench: RevealToken[];
  /** Sum of the squad's current prices (not the manager's budget). */
  squadValue: string;
  chipLabel: string | null;
}

function resolveSquad(elements: GraphicElement[], squad: number[]): GraphicElement[] {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const seen = new Set<number>();
  const out: GraphicElement[] = [];
  for (const id of squad) {
    const e = byId.get(id);
    if (e && !seen.has(id)) {
      seen.add(id);
      out.push(e);
    }
  }
  return out;
}

export function squadCounts(elements: GraphicElement[], squad: number[]): Record<GraphicPosition, number> {
  const counts: Record<GraphicPosition, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const e of resolveSquad(elements, squad)) {
    const pos = POSITION_BY_TYPE[e.element_type];
    if (pos) counts[pos] += 1;
  }
  return counts;
}

/** Whether a player can join the squad, and if not, a short reason to show the user. */
export function canAddToSquad(input: {
  elements: GraphicElement[];
  squad: number[];
  id: number;
  teamShortById?: Map<number, string>;
}): { ok: boolean; reason: string | null } {
  const { elements, squad, id, teamShortById } = input;
  const element = elements.find((e) => e.id === id);
  if (!element) return { ok: false, reason: "Unknown player" };
  if (squad.includes(id)) return { ok: false, reason: "Already in your squad" };
  if (squad.length >= SQUAD_SIZE) return { ok: false, reason: `Your squad is full (${SQUAD_SIZE} players)` };
  const pos = POSITION_BY_TYPE[element.element_type];
  if (pos && squadCounts(elements, squad)[pos] >= SQUAD_QUOTA[pos]) return { ok: false, reason: `You already have ${SQUAD_QUOTA[pos]} ${POSITION_WORD[pos]}` };
  const sameClub = resolveSquad(elements, squad).filter((e) => e.team === element.team).length;
  if (sameClub >= MAX_PER_CLUB) return { ok: false, reason: `Max ${MAX_PER_CLUB} players from ${teamShortById?.get(element.team) ?? "one club"}` };
  return { ok: true, reason: null };
}

/**
 * The squad as the graphic will draw it. Nothing is guessed: a squad that breaks the FPL rules (2/5/5/3, at most 3
 * per club, bench of 1 goalkeeper + 3 outfield, legal XI, a captain) comes back with plain-language problems and
 * no pitch.
 */
export function buildTeamReveal(input: {
  elements: GraphicElement[];
  squad: number[];
  bench: number[];
  captain: number;
  vice: number;
  chip: ChipId;
  gameweek: number;
  fixtures: CompareFixtureInput[];
  teamShortById: Map<number, string>;
}): TeamRevealContent {
  const { elements, bench, captain, vice, chip, gameweek, fixtures, teamShortById } = input;
  const players = resolveSquad(elements, input.squad);
  const inSquad = new Set(players.map((p) => p.id));
  const counts = squadCounts(elements, input.squad);

  const problems: string[] = [];
  for (const pos of ROW_ORDER) {
    const need = SQUAD_QUOTA[pos];
    if (counts[pos] < need) problems.push(`Pick ${need} ${POSITION_WORD[pos]} (${counts[pos]}/${need})`);
    else if (counts[pos] > need) problems.push(`Too many ${POSITION_WORD[pos]} (${counts[pos]}/${need})`);
  }
  const perClub = new Map<number, number>();
  for (const p of players) perClub.set(p.team, (perClub.get(p.team) ?? 0) + 1);
  for (const [team, n] of Array.from(perClub.entries())) {
    if (n > MAX_PER_CLUB) problems.push(`Max ${MAX_PER_CLUB} players from one club (${teamShortById.get(team) ?? "a club"} has ${n})`);
  }

  const countsOk = ROW_ORDER.every((pos) => counts[pos] === SQUAD_QUOTA[pos]);
  const benchIds = bench.filter((id, i) => inSquad.has(id) && bench.indexOf(id) === i);
  const positionOf = (id: number) => POSITION_BY_TYPE[players.find((p) => p.id === id)!.element_type];
  if (countsOk) {
    const benchKeepers = benchIds.filter((id) => positionOf(id) === "GKP").length;
    if (benchIds.length !== BENCH_PLAYERS || benchKeepers !== 1) {
      problems.push("Bench needs exactly 1 goalkeeper and 3 outfield players");
    } else {
      const xi = players.filter((p) => !benchIds.includes(p.id));
      const n = (pos: GraphicPosition) => xi.filter((p) => POSITION_BY_TYPE[p.element_type] === pos).length;
      const legal = (["DEF", "MID", "FWD"] as const).every((pos) => n(pos) >= XI_RANGE[pos][0] && n(pos) <= XI_RANGE[pos][1]);
      if (!legal) problems.push("Starting XI needs 3-5 defenders, 2-5 midfielders and 1-3 forwards");
    }
    if (!inSquad.has(captain)) problems.push("Choose a captain");
  }

  const token = (e: GraphicElement): RevealToken => ({
    id: e.id,
    name: e.web_name,
    teamShort: teamShortById.get(e.team) ?? "",
    position: POSITION_BY_TYPE[e.element_type] ?? "MID",
    price: money(e.now_cost),
    fixtures: fixturesForGameweeks(e.team, fixtures, [gameweek])[0].fixtures.map((f) => ({
      opponent: teamShortById.get(f.opponentId) ?? "?",
      isHome: f.isHome,
      difficulty: f.difficulty,
    })),
    isCaptain: e.id === captain,
    isVice: e.id === vice && e.id !== captain,
  });

  const complete = problems.length === 0;
  const xiPlayers = complete ? players.filter((p) => !benchIds.includes(p.id)) : [];
  const rows = ROW_ORDER.map((position) => ({
    position,
    players: xiPlayers.filter((p) => POSITION_BY_TYPE[p.element_type] === position).map(token),
  }));
  const benchPlayers = complete ? benchIds.map((id) => players.find((p) => p.id === id)!) : [];
  const orderedBench = [
    ...benchPlayers.filter((p) => POSITION_BY_TYPE[p.element_type] === "GKP"),
    ...benchPlayers.filter((p) => POSITION_BY_TYPE[p.element_type] !== "GKP"),
  ].map(token);
  const count = (pos: GraphicPosition) => rows.find((r) => r.position === pos)!.players.length;
  return {
    complete,
    problems,
    formation: complete ? `${count("DEF")}-${count("MID")}-${count("FWD")}` : null,
    gameweek,
    rows,
    bench: orderedBench,
    squadValue: money(players.reduce((sum, p) => sum + p.now_cost, 0)),
    chipLabel: chip ? CHIP_LABELS[chip] : null,
  };
}

/** A squad loaded from FPL picks: players in pick order, bench = picks 12-15, captain and vice. */
export function squadFromPicks(
  picks: Array<{ element: number; position: number; is_captain?: boolean; is_vice_captain?: boolean }>,
): { squad: number[]; bench: number[]; captain: number; vice: number } {
  const sorted = [...picks].sort((a, b) => a.position - b.position);
  return {
    squad: sorted.map((p) => p.element),
    bench: sorted.filter((p) => p.position >= 12).map((p) => p.element),
    captain: sorted.find((p) => p.is_captain)?.element ?? 0,
    vice: sorted.find((p) => p.is_vice_captain)?.element ?? 0,
  };
}

/**
 * A starting point for a full squad: the XI with the most expected points (same formation search as the FPL
 * lineup helper), captain = its best player, vice = its second best. The user can change every choice.
 */
export function suggestSquadSetup(input: {
  elements: GraphicElement[];
  squad: number[];
  xptsById: Map<number, number | null>;
}): { bench: number[]; captain: number; vice: number } {
  const { elements, xptsById } = input;
  const players = resolveSquad(elements, input.squad);
  const counts = squadCounts(elements, input.squad);
  if (players.length !== SQUAD_SIZE || !ROW_ORDER.every((pos) => counts[pos] === SQUAD_QUOTA[pos])) return { bench: [], captain: 0, vice: 0 };
  const best = bestLineup(
    players.map((p) => ({ id: p.id, elementType: p.element_type as 1 | 2 | 3 | 4, xPts: xptsById.get(p.id) ?? null })),
  );
  if (!best.complete) return { bench: [], captain: 0, vice: 0 };
  const ranked = [...best.starting].sort((a, b) => (b.xPts ?? 0) - (a.xPts ?? 0) || a.id - b.id);
  return { bench: best.bench.map((p) => p.id), captain: ranked[0]?.id ?? 0, vice: ranked[1]?.id ?? 0 };
}


// ---------- Cover Generator ----------

export interface CoverContent {
  headline: string;
  subtitle: string;
  tag: string;
  /** Featured players in the order chosen (at most 3). */
  players: Array<{ id: number; name: string; teamShort: string; position: GraphicPosition }>;
}

/** The cover as drawn: trimmed text, the default headline when none is typed, and the featured players that exist. */
export function buildCover(input: { spec: GraphicSpec; elements: GraphicElement[]; teamShortById: Map<number, string> }): CoverContent {
  const { spec, elements, teamShortById } = input;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const players: CoverContent["players"] = [];
  for (const id of spec.players) {
    const e = byId.get(id);
    if (!e || players.length === MAX_PLAYERS.cover) continue;
    players.push({ id: e.id, name: e.web_name, teamShort: teamShortById.get(e.team) ?? "", position: POSITION_BY_TYPE[e.element_type] ?? "MID" });
  }
  return { headline: resolveHeadline(spec), subtitle: spec.subtitle.trim(), tag: spec.tag.trim(), players };
}

const COVER_TITLE_BASE: Record<SizeId, number> = { square: 140, portrait: 150, landscape: 96 };

/** Headline font size in image pixels: full size for short headlines, shrinking (never below 40%) as the text gets longer. */
export function coverTitleFont(text: string, size: SizeId): number {
  const chars = Math.max(1, text.trim().length);
  const factor = chars <= 8 ? 1 : Math.max(0.4, Math.pow(8 / chars, 0.65));
  return Math.round(COVER_TITLE_BASE[size] * factor);
}


// ---------- Player News Quote ----------

export interface NewsQuoteContent {
  player: { id: number; name: string; fullName: string; teamShort: string; teamName: string; position: GraphicPosition };
  /** "official" = FPL's own news text; "custom" = typed by the creator; "none" = nothing to show yet. */
  kind: "official" | "custom" | "none";
  quote: string;
  /** Attribution line: for official news "Official FPL news · 21 Oct 2026"; for a typed quote only what the creator typed. */
  source: string;
  statusLabel: string;
  tone: "ok" | "warn" | "bad";
  /** Chance of playing next round (0-99) when FPL gives one below 100, otherwise null. */
  chance: number | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-21T20:30:09Z" -> "21 Oct 2026" (UTC), or null when it is not a date. */
export function formatNewsDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const STATUS_LABEL: Record<string, { label: string; tone: NewsQuoteContent["tone"] }> = {
  a: { label: "Available", tone: "ok" },
  d: { label: "Doubtful", tone: "warn" },
  i: { label: "Injured", tone: "bad" },
  s: { label: "Suspended", tone: "bad" },
  u: { label: "Unavailable", tone: "bad" },
  n: { label: "Not in squad", tone: "bad" },
};

/**
 * One player's news as a quote card. By default the words are FPL's own news text for that player; a quote typed
 * by the creator replaces it and is attributed only to the source the creator typed (never to FPL). Null when no
 * player is chosen.
 */
export function buildNewsQuote(input: {
  spec: GraphicSpec;
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
}): NewsQuoteContent | null {
  const { spec, elements, teamShortById, teamNameById } = input;
  const e = elements.find((x) => x.id === spec.players[0]);
  if (!e) return null;
  const teamShort = teamShortById.get(e.team) ?? "";
  const first = typeof e.first_name === "string" ? e.first_name : "";
  const second = typeof e.second_name === "string" ? e.second_name : "";
  const official = typeof e.news === "string" ? e.news.trim() : "";
  const typed = spec.quote.trim();
  const status = STATUS_LABEL[e.status ?? "a"] ?? STATUS_LABEL.a;
  const chanceRaw = toNumber(e.chance_of_playing_next_round);
  const added = formatNewsDate(typeof e.news_added === "string" ? e.news_added : null);
  const kind: NewsQuoteContent["kind"] = typed ? "custom" : official ? "official" : "none";
  return {
    player: {
      id: e.id,
      name: e.web_name,
      fullName: `${first} ${second}`.trim() || e.web_name,
      teamShort,
      teamName: teamNameById.get(e.team) ?? teamShort,
      position: POSITION_BY_TYPE[e.element_type] ?? "MID",
    },
    kind,
    quote: kind === "custom" ? typed : kind === "official" ? official : "",
    source: kind === "custom" ? spec.source.trim() : kind === "official" ? `Official FPL news${added ? ` · ${added}` : ""}` : "",
    statusLabel: status.label,
    tone: status.tone,
    chance: chanceRaw !== null && chanceRaw < 100 ? chanceRaw : null,
  };
}

const QUOTE_FONT_BASE: Record<SizeId, number> = { square: 64, portrait: 70, landscape: 46 };

/** Quote font size in image pixels: full size up to 60 characters, then shrinking (never below 55%). */
export function quoteFont(text: string, size: SizeId): number {
  const chars = Math.max(1, text.trim().length);
  const factor = chars <= 60 ? 1 : Math.max(0.55, Math.pow(60 / chars, 0.6));
  return Math.round(QUOTE_FONT_BASE[size] * factor);
}


// ---------- Captain Picks ----------

export interface CaptainPickRow {
  rank: number;
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  ownership: string;
  /** Our expected points for the gameweek. */
  xpts: number;
  /** What a captain would score on that estimate: xPts doubled. */
  captainPoints: number;
  fixtures: Array<{ opponent: string; isHome: boolean; difficulty: number }>;
  doubtful: boolean;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The best captain options for one gameweek, ranked by our cached expected points for that gameweek. Injured,
 * suspended and unavailable players are never listed; doubtful ones are flagged; players with no projection that
 * gameweek (no fixture, or no data) are left out.
 */
export function buildCaptainPicks(input: {
  elements: GraphicElement[];
  projections: Array<{ playerId: number; gameweekProjections?: Record<string, number> }>;
  teamShortById: Map<number, string>;
  fixtures: CompareFixtureInput[];
  gameweek: number;
  top: number;
  pos: GraphicPosition | null;
}): CaptainPickRow[] {
  const { elements, projections, teamShortById, fixtures, gameweek, top, pos } = input;
  const projectionById = new Map(projections.map((p) => [p.playerId, p.gameweekProjections]));
  const rows: Array<Omit<CaptainPickRow, "rank"> & { raw: number }> = [];
  for (const e of elements) {
    if (EXCLUDED_STATUS.has(e.status ?? "a")) continue;
    const position = POSITION_BY_TYPE[e.element_type];
    if (!position || (pos && position !== pos)) continue;
    const raw = projectionById.get(e.id)?.[String(gameweek)];
    if (typeof raw !== "number") continue;
    const own = toNumber(e.selected_by_percent);
    rows.push({
      raw,
      id: e.id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position,
      price: money(e.now_cost),
      ownership: own === null ? "—" : `${own.toFixed(1)}%`,
      xpts: round2(raw),
      captainPoints: round2(raw * 2),
      fixtures: fixturesForGameweeks(e.team, fixtures, [gameweek])[0].fixtures.map((f) => ({
        opponent: teamShortById.get(f.opponentId) ?? "?",
        isHome: f.isHome,
        difficulty: f.difficulty,
      })),
      doubtful: e.status === "d",
    });
  }
  rows.sort((a, b) => b.raw - a.raw || a.id - b.id);
  return rows.slice(0, top).map(({ raw: _raw, ...r }, i) => ({ rank: i + 1, ...r }));
}

// ---------- Fixture Ticker ----------

/** Every team's fixtures over the gameweeks, sorted by average official difficulty (easiest run first; no fixtures last). */
export function buildFixtureTicker(input: {
  teamIds: number[];
  gameweeks: number[];
  fixtures: CompareFixtureInput[];
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
}): FixtureGridContent {
  const grid = buildFixturesGrid(input);
  const rows = [...grid.rows].sort((a, b) => {
    if (a.avgFdr === null && b.avgFdr === null) return a.name.localeCompare(b.name);
    if (a.avgFdr === null) return 1;
    if (b.avgFdr === null) return -1;
    return a.avgFdr - b.avgFdr || a.name.localeCompare(b.name);
  });
  return { gameweeks: grid.gameweeks, rows };
}

// ---------- Transfer Trends ----------

export interface TransferRow {
  rank: number;
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  ownership: string;
  count: number;
  countLabel: string;
}

/** 950 -> "950", 8450 -> "8.5k", 261437 -> "261k", 1250000 -> "1.25M". */
export function formatCount(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (Math.round(n / 1000) >= 1000) return `${(Math.round(n / 10000) / 100).toFixed(2)}M`;
  if (n < 10000) return `${(Math.round(n / 100) / 10).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

/** The most transferred in and out this gameweek, from FPL's own transfers_in_event / transfers_out_event counts. */
export function buildTransferTrends(input: {
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  pos: GraphicPosition | null;
  top: number;
}): { ins: TransferRow[]; outs: TransferRow[] } {
  const { elements, teamShortById, pos, top } = input;
  const make = (key: "transfers_in_event" | "transfers_out_event"): TransferRow[] => {
    const rows: Array<Omit<TransferRow, "rank">> = [];
    for (const e of elements) {
      const position = POSITION_BY_TYPE[e.element_type];
      const count = toNumber(e[key]);
      if (!position || (pos && position !== pos) || count === null || count <= 0) continue;
      const own = toNumber(e.selected_by_percent);
      rows.push({
        id: e.id,
        name: e.web_name,
        teamShort: teamShortById.get(e.team) ?? "",
        position,
        price: money(e.now_cost),
        ownership: own === null ? "—" : `${own.toFixed(1)}%`,
        count,
        countLabel: formatCount(count),
      });
    }
    rows.sort((a, b) => b.count - a.count || a.id - b.id);
    return rows.slice(0, top).map((r, i) => ({ rank: i + 1, ...r }));
  };
  return { ins: make("transfers_in_event"), outs: make("transfers_out_event") };
}

// ---------- Team of the Week ----------

export interface TotwToken {
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  points: number;
  isCaptain: boolean;
}

export interface TeamOfTheWeekContent {
  gameweek: number;
  complete: boolean;
  formation: string | null;
  rows: Array<{ position: GraphicPosition; players: TotwToken[] }>;
  /** The XI's points with the captain (the top scorer) counted twice, as in FPL. */
  total: number;
}

/**
 * The best legal XI of a finished gameweek by actual FPL points (same formation search as the FPL lineup helper),
 * captain = the top scorer. Only players who played (minutes > 0) are considered, and an XI is never padded.
 */
export function buildTeamOfTheWeek(input: {
  elements: GraphicElement[];
  live: Array<{ id: number; stats: { total_points: number; minutes: number } }>;
  teamShortById: Map<number, string>;
  gameweek: number;
}): TeamOfTheWeekContent {
  const { elements, live, teamShortById, gameweek } = input;
  const liveById = new Map(live.map((l) => [l.id, l.stats]));
  const tokens = new Map<number, TotwToken>();
  const candidates: LineupPlayer[] = [];
  for (const e of elements) {
    const stats = liveById.get(e.id);
    const position = POSITION_BY_TYPE[e.element_type];
    if (!stats || !position || !(stats.minutes > 0)) continue;
    tokens.set(e.id, { id: e.id, name: e.web_name, teamShort: teamShortById.get(e.team) ?? "", position, points: stats.total_points, isCaptain: false });
    candidates.push({ id: e.id, elementType: TYPE_BY_POSITION[position], xPts: stats.total_points });
  }
  const best = bestLineup(candidates);
  const complete = best.complete && best.starting.length === 11;
  const starting = complete ? best.starting.map((p) => ({ ...tokens.get(p.id)!, isCaptain: p.id === best.captainId })) : [];
  const byPoints = (a: TotwToken, b: TotwToken) => b.points - a.points || a.id - b.id;
  const rows = ROW_ORDER.map((position) => ({ position, players: starting.filter((p) => p.position === position).sort(byPoints) }));
  const count = (pos: GraphicPosition) => rows.find((r) => r.position === pos)!.players.length;
  return {
    gameweek,
    complete,
    formation: complete ? `${count("DEF")}-${count("MID")}-${count("FWD")}` : null,
    rows,
    total: complete ? best.total : 0,
  };
}

// ---------- Stat Leaders ----------

export interface LeaderStat {
  key: string;
  label: string;
  format: "int" | "dec1" | "percent";
  /** A per-game or form style stat: needs a minimum number of minutes so a cameo cannot top the list. */
  rate?: boolean;
}

export const LEADER_STATS: LeaderStat[] = [
  { key: "goals_scored", label: "Goals", format: "int" },
  { key: "assists", label: "Assists", format: "int" },
  { key: "expected_goals", label: "Expected goals (xG)", format: "dec1" },
  { key: "expected_assists", label: "Expected assists (xA)", format: "dec1" },
  { key: "expected_goal_involvements", label: "Expected goal involvements (xGI)", format: "dec1" },
  { key: "total_points", label: "Total points", format: "int" },
  { key: "points_per_game", label: "Points per game", format: "dec1", rate: true },
  { key: "form", label: "Form", format: "dec1", rate: true },
  { key: "bonus", label: "Bonus points", format: "int" },
  { key: "bps", label: "BPS", format: "int" },
  { key: "clean_sheets", label: "Clean sheets", format: "int" },
  { key: "saves", label: "Saves", format: "int" },
  { key: "defensive_contribution", label: "Defensive contributions", format: "int" },
  { key: "ict_index", label: "ICT index", format: "dec1" },
  { key: "minutes", label: "Minutes", format: "int" },
  { key: "selected_by_percent", label: "Ownership", format: "percent" },
];

export const MIN_RATE_MINUTES = 180;

export interface LeaderRow {
  rank: number;
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  value: number;
  valueLabel: string;
  /** value / the leader's value, 0 to 1, for the bar. */
  share: number;
}

export function buildStatLeaders(input: {
  elements: GraphicElement[];
  statKey: string;
  pos: GraphicPosition | null;
  top: number;
  teamShortById: Map<number, string>;
}): { stat: LeaderStat | null; rows: LeaderRow[]; minutesRule: boolean } {
  const { elements, statKey, pos, top, teamShortById } = input;
  const stat = LEADER_STATS.find((x) => x.key === statKey) ?? null;
  if (!stat) return { stat: null, rows: [], minutesRule: false };
  const minutesRule = !!stat.rate;
  const rows: Array<Omit<LeaderRow, "rank" | "share"> & { totalPoints: number }> = [];
  for (const e of elements) {
    const position = POSITION_BY_TYPE[e.element_type];
    const value = toNumber(e[statKey]);
    if (!position || (pos && position !== pos) || value === null || value <= 0) continue;
    if (minutesRule && (toNumber(e.minutes) ?? 0) < MIN_RATE_MINUTES) continue;
    rows.push({
      id: e.id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position,
      price: money(e.now_cost),
      value,
      valueLabel: stat.format === "int" ? String(Math.round(value)) : stat.format === "percent" ? `${value.toFixed(1)}%` : value.toFixed(1),
      totalPoints: toNumber(e.total_points) ?? 0,
    });
  }
  rows.sort((a, b) => b.value - a.value || b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  const lead = rows[0]?.value ?? 1;
  return { stat, minutesRule, rows: rows.slice(0, top).map(({ totalPoints: _tp, ...r }, i) => ({ rank: i + 1, share: r.value / lead, ...r })) };
}


// ---------- Creator brand: handle and accent colour ----------

/** An @handle as stored: letters, digits and underscore, 1-15 characters, one leading @ stripped. Anything else is "" (none). */
export function normaliseHandle(input: string): string {
  const text = input.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(text) ? text : "";
}

/** An accent colour as #rrggbb (lower case) from 6 or 3 hex digits with or without the #; anything else is "". */
export function normaliseAccent(input: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return "";
  const hex = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return `#${hex.toLowerCase()}`;
}

function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  const mixed = rgb.map((v) => Math.round(v * (1 - amount)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** The theme with the creator's accent colour, nudged lighter (dark themes) or darker (light theme) until it can be read on the background. */
export function withAccent(theme: GraphicTheme, accent: string): GraphicTheme {
  const base = normaliseAccent(accent);
  if (!base) return theme;
  const lightBackground = (luminance(theme.bg) + luminance(theme.bg2)) / 2 > 0.5;
  let color = base;
  for (let i = 0; i < 24 && Math.min(contrastRatio(color, theme.bg), contrastRatio(color, theme.bg2)) < 3; i++) {
    color = lightBackground ? darken(color, 0.15) : lighten(color, 0.15);
  }
  return { ...theme, accent: color };
}

// ---------- every graphic's data, in one type ----------

export type GraphicData =
  | { kind: "player-card"; card: PlayerCardContent; gwLabel: string }
  | { kind: "player-comparison"; comparison: ComparisonContent }
  | { kind: "fixtures-comparison"; grid: FixtureGridContent; gwLabel: string }
  | { kind: "price-change"; prices: PriceChangeContent; dateLabel: string }
  | { kind: "top-differentials"; rows: DifferentialRow[]; gwLabel: string; subtitle: string }
  | { kind: "predicted-lineup"; lineup: PredictedLineupContent; gwLabel: string }
  | { kind: "team-reveal"; reveal: TeamRevealContent; gwLabel: string }
  | { kind: "cover"; cover: CoverContent }
  | { kind: "player-news"; news: NewsQuoteContent }
  | { kind: "captain-picks"; rows: CaptainPickRow[]; gwLabel: string; subtitle: string }
  | { kind: "fixture-ticker"; grid: FixtureGridContent; gwLabel: string }
  | { kind: "transfer-trends"; trends: { ins: TransferRow[]; outs: TransferRow[] }; gwLabel: string; subtitle: string }
  | { kind: "team-of-the-week"; totw: TeamOfTheWeekContent; gwLabel: string }
  | { kind: "stat-leaders"; rows: LeaderRow[]; gwLabel: string; subtitle: string; statLabel: string }
  | { kind: "availability-watch"; rows: AvailabilityRow[]; gwLabel: string; subtitle: string }
  | { kind: "match-predictions"; predictions: MatchPredictionsContent; gwLabel: string; subtitle: string }
  | { kind: "match-results"; results: MatchResultsContent; gwLabel: string; subtitle: string }
  | { kind: "match-preview"; preview: MatchPreviewContent; gwLabel: string }
  | { kind: "match-report"; report: MatchReportContent; gwLabel: string };

// ---------- post captions ----------

/** X allows 280 characters and counts a link as 23 plus the space before it. */
const CAPTION_MAX = 256;

const KIND_TAG: Partial<Record<GraphicData["kind"], string>> = {
  "captain-picks": "#Captain",
  "fixture-ticker": "#FDR",
  "fixtures-comparison": "#FDR",
  "transfer-trends": "#FPLTransfers",
  "price-change": "#FPLPrices",
  "top-differentials": "#Differentials",
  "team-of-the-week": "#TeamOfTheWeek",
  "team-reveal": "#TeamReveal",
  "predicted-lineup": "#PredictedLineup",
  "player-news": "#FPLNews",
  "availability-watch": "#FPLInjuries",
  "match-predictions": "#FPLPredictions",
  "match-results": "#FPLResults",
  "match-preview": "#MatchPreview",
  "match-report": "#MatchReport",
};

function captionGw(label: string | null | undefined): string | null {
  const m = /GW(\d+)/i.exec(label ?? "");
  return m ? `#GW${m[1]}` : null;
}

function finishCaption(body: string, spec: GraphicSpec, kind: GraphicData["kind"], gwText: string | null | undefined): string {
  const handle = normaliseHandle(spec.handle);
  const tags = ["#FPL", "#FantasyPremierLeague", captionGw(gwText), KIND_TAG[kind]].filter((t): t is string => !!t).join(" ");
  const tail = `${handle ? ` by @${handle}` : ""} · fpldilemmas.com ${tags}`;
  const room = CAPTION_MAX - tail.length;
  const text = body.length <= room ? body : `${body.slice(0, Math.max(0, room - 1)).replace(/[\s,;·:.\-–(]+$/, "")}…`;
  return `${text}${tail}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A ready-to-post caption for a graphic, built only from the numbers and names on it: no claims beyond the data.
 * At most 256 characters, so it fits an X post with a link; the site and hashtags are never cut.
 */
export function buildCaption(data: GraphicData, spec: GraphicSpec): string {
  const done = (body: string, gw?: string | null) => finishCaption(body, spec, data.kind, gw);
  switch (data.kind) {
    case "captain-picks": {
      const top = data.rows.slice(0, 3).map((r) => `${r.rank}. ${r.name} ${r.xpts.toFixed(1)}`).join(" · ");
      return done(top ? `${data.gwLabel} captain picks by our xPts: ${top}` : `${data.gwLabel} captain picks`, data.gwLabel);
    }
    case "top-differentials": {
      const top = data.rows.slice(0, 3).map((r) => `${r.name} ${r.xpts.toFixed(1)} xPts (${r.ownership})`).join(" · ");
      return done(top ? `Top differentials ${data.gwLabel}: ${top}` : `Top differentials ${data.gwLabel}`, data.gwLabel);
    }
    case "fixture-ticker": {
      const rows = data.grid.rows.filter((r) => r.avgFdr !== null);
      const fmt = (r: { short: string; avgFdr: number | null }) => `${r.short} ${(r.avgFdr as number).toFixed(1)}`;
      const easy = rows.slice(0, 3);
      const hard = rows.slice(Math.max(3, rows.length - 3)).reverse();
      return done(`Easiest ${data.gwLabel} fixture runs (avg FDR): ${easy.map(fmt).join(", ")}${hard.length ? `. Toughest: ${hard.map(fmt).join(", ")}` : ""}`, data.gwLabel);
    }
    case "fixtures-comparison": {
      const list = data.grid.rows.map((r) => `${r.short} ${r.avgFdr === null ? "–" : r.avgFdr.toFixed(1)}`).join(" · ");
      return done(`${data.gwLabel} fixtures, avg FDR: ${list}`, data.gwLabel);
    }
    case "transfer-trends": {
      const part = (rows: TransferRow[]) => rows.slice(0, 3).map((r) => `${r.name} ${r.countLabel}`).join(", ");
      return done(`${data.gwLabel}: most in ${part(data.trends.ins) || "none yet"}; most out ${part(data.trends.outs) || "none yet"}`, data.gwLabel);
    }
    case "price-change": {
      const { prices } = data;
      const risers = prices.risers.length + prices.moreRisers;
      const fallers = prices.fallers.length + prices.moreFallers;
      const day = data.dateLabel.includes("·") ? data.dateLabel.split("·").slice(1).join("·").trim() : "";
      if (!prices.date || risers + fallers === 0) return done(`No price changes recorded${day ? ` for ${day}` : ""}`);
      const names = (rows: PriceChangeRow[]) => rows.slice(0, 2).map((r) => `${r.name} ${r.change}`).join(", ");
      return done(`Price changes${day ? ` · ${day}` : ""}: ▲ ${plural(risers, "riser", "risers")} (${names(prices.risers)}) · ▼ ${plural(fallers, "faller", "fallers")} (${names(prices.fallers)})`);
    }
    case "team-of-the-week": {
      const { totw } = data;
      if (!totw.complete) return done(`Team of the Week ${data.gwLabel}: not enough data yet`, data.gwLabel);
      const captain = totw.rows.flatMap((r) => r.players).find((p) => p.isCaptain);
      return done(`Team of the Week ${data.gwLabel}: ${totw.formation}, ${totw.total} pts${captain ? `. Captain ${captain.name} (${captain.points} pts)` : ""}`, data.gwLabel);
    }
    case "stat-leaders": {
      const top = data.rows.slice(0, 3).map((r) => `${r.name} ${r.valueLabel}`).join(" · ");
      return done(`${data.statLabel} leaders: ${top || "no one yet"} (season to date)`);
    }
    case "availability-watch": {
      const top = data.rows.slice(0, 3).map((r) => `${r.name} ${r.chance !== null ? `${r.chance}%` : r.statusLabel.toLowerCase()}`).join(" · ");
      return done(top ? `Availability watch, most-owned players: ${top}` : "Availability watch: no news on the most-owned players");
    }
    case "match-predictions": {
      const { predictions } = data;
      const list = predictions.rows.slice(0, 3).map((r) => `${r.home.short} ${r.home.xg === null ? "–" : formatGoals(r.home.xg)}-${r.away.xg === null ? "–" : formatGoals(r.away.xg)} ${r.away.short}`).join(" · ");
      return done(list ? `${data.gwLabel} match predictions (expected goals): ${list}` : `${data.gwLabel} match predictions`, data.gwLabel);
    }
    case "match-results": {
      const { results } = data;
      const list = results.rows.slice(0, 4).map((r) => `${r.home.short} ${r.home.score}-${r.away.score} ${r.away.short}`).join(" · ");
      return done(list ? `${data.gwLabel} results: ${list}${results.total > 4 ? ` · ${plural(results.goals, "goal", "goals")} in ${plural(results.total, "match", "matches")}` : ""}` : `${data.gwLabel} results`, data.gwLabel);
    }
    case "match-preview": {
      const { preview } = data;
      const xg = preview.home.xg !== null && preview.away.xg !== null ? `: expected goals ${formatGoals(preview.home.xg)}-${formatGoals(preview.away.xg)}` : "";
      const probs = preview.probs ? `, win chances ${preview.probs.home}/${preview.probs.draw}/${preview.probs.away}%` : "";
      return done(`${preview.home.short} v ${preview.away.short} ${data.gwLabel} preview${xg}${probs}`, data.gwLabel);
    }
    case "match-report": {
      const { report } = data;
      return done(`${report.home.short} ${report.home.score}-${report.away.score} ${report.away.short} ${data.gwLabel} report`, data.gwLabel);
    }
    case "cover": {
      const { cover } = data;
      return done(`${cover.headline}${cover.tag ? ` · ${cover.tag}` : ""}${cover.subtitle ? ` – ${cover.subtitle}` : ""}`, cover.headline);
    }
    case "player-news": {
      const { news } = data;
      const who = `${news.player.name} (${news.player.teamShort})`;
      if (news.kind === "official") return done(`${who}: ${news.quote} · source: official FPL news`);
      if (news.kind === "custom") return done(`${who}: “${news.quote}”${news.source ? ` — ${news.source}` : ""}`);
      return done(`${who}: no news right now`);
    }
    case "team-reveal": {
      const { reveal } = data;
      const players = [...reveal.rows.flatMap((r) => r.players), ...reveal.bench];
      const captain = players.find((p) => p.isCaptain);
      const vice = players.find((p) => p.isVice);
      const owner = spec.manager.trim();
      if (!reveal.complete) return done(`${owner ? `${owner}'s team` : "Team"} reveal ${data.gwLabel}: squad not finished yet`, data.gwLabel);
      return done(
        `${owner ? `${owner}'s team` : "Team"} reveal ${data.gwLabel}: ${reveal.formation}${captain ? `, captain ${captain.name}` : ""}${vice ? `, vice ${vice.name}` : ""}${reveal.chipLabel ? `, ${reveal.chipLabel}` : ""}`,
        data.gwLabel,
      );
    }
    case "predicted-lineup": {
      const { lineup } = data;
      if (!lineup.complete) return done(`${lineup.teamName} ${data.gwLabel}: not enough expected-minutes data for a predicted XI yet`, data.gwLabel);
      return done(`Predicted ${lineup.teamName} XI for ${data.gwLabel}${lineup.formation ? ` (${lineup.formation})` : ""}, from our expected minutes`, data.gwLabel);
    }
    case "player-card": {
      const { card } = data;
      const tile = (label: string) => card.tiles.find((t) => t.label === label)?.value;
      const bits = [
        card.xpts.total === null ? null : `${card.xpts.total.toFixed(1)} xPts`,
        tile("Selected by") ? `${tile("Selected by")} owned` : null,
        tile("Form") ? `form ${tile("Form")}` : null,
      ].filter((b): b is string => !!b);
      return done(`${card.name} (${card.teamShort}, ${card.price}) ${data.gwLabel}${bits.length ? `: ${bits.join(", ")}` : ""}`, data.gwLabel);
    }
    case "player-comparison": {
      const { comparison } = data;
      const rows = comparison.rows.slice(0, 3).map((r) => `${r.label} ${r.values.join(" / ")}`).join(" · ");
      return done(`${comparison.columns.map((c) => c.name).join(" vs ")}${rows ? `: ${rows}` : ""}`);
    }
  }
}

// ---------- the gameweek pack ----------

export const GAMEWEEK_PACK: Array<{ id: string; template: TemplateId; label: string }> = [
  { id: "deadline", template: "cover", label: "Deadline card" },
  { id: "captains", template: "captain-picks", label: "Captain picks" },
  { id: "differentials", template: "top-differentials", label: "Top differentials" },
  { id: "availability", template: "availability-watch", label: "Availability watch" },
  { id: "fixtures", template: "fixture-ticker", label: "Fixture ticker" },
  { id: "transfers", template: "transfer-trends", label: "Transfer trends" },
  { id: "prices", template: "price-change", label: "Price changes" },
];

/** The deadline as UK time, e.g. "Sat 24 Oct · 17:30"; null when it is not a date. */
export function formatDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} · ${get("hour")}:${get("minute")}`;
}

/**
 * The graphics of the standard pack for a gameweek. Each keeps the user's size, theme, handle and accent, but none of
 * the other settings (players, teams, quote...), so a pack never carries leftovers from the template being edited.
 */
export function packSpecs(
  base: GraphicSpec,
  gameweek: number,
  options: { deadline: string | null },
): Array<{ item: (typeof GAMEWEEK_PACK)[number]; spec: GraphicSpec }> {
  const common: GraphicSpec = { ...DEFAULT_SPEC, size: base.size, theme: base.theme, handle: base.handle, accent: base.accent };
  const deadline = formatDeadline(options.deadline);
  const overrides: Record<string, Partial<GraphicSpec>> = {
    deadline: { headline: `GW${gameweek} Deadline`, subtitle: "Captains, differentials, fixtures and price moves", tag: deadline ?? "" },
    captains: { from: gameweek, to: gameweek },
    differentials: { from: gameweek, to: gameweek + 3 },
    availability: {},
    fixtures: { from: gameweek, to: gameweek + 4 },
    transfers: {},
    prices: {},
  };
  return GAMEWEEK_PACK.map((item) => ({ item, spec: { ...common, template: item.template, ...overrides[item.id] } }));
}

export function packFileName(index: number, template: TemplateId): string {
  return `${String(index + 1).padStart(2, "0")}-${template}.png`;
}

export function packZipName(gameweek: number): string {
  return `fpl-dilemmas-gw${gameweek}-pack.zip`;
}

/** captions.txt for the pack: each image's file name followed by its caption. */
export function buildCaptionsFile(items: Array<{ fileName: string; caption: string }>): string {
  return `${items.map((i) => `${i.fileName}\n${i.caption}\n`).join("\n")}`;
}


// ---------- Availability Watch ----------

/** Only players owned by at least this % are listed: news on a player almost nobody owns is not what people are looking for. */
export const MIN_WATCH_OWNERSHIP = 5;
const WATCH_STATUS = new Set(["d", "i", "s"]);
const MAX_NEWS_CHARS = 90;

export interface AvailabilityRow {
  rank: number;
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  price: string;
  ownership: string;
  statusLabel: string;
  tone: "ok" | "warn" | "bad";
  /** Chance of playing next round (0-99) when FPL gives one below 100, otherwise null. */
  chance: number | null;
  /** FPL's own news text, cut to 90 characters. */
  news: string;
  /** When FPL added that news, e.g. "21 Oct 2026". */
  added: string | null;
}

/**
 * The most-owned players who are injured, doubtful or suspended, with FPL's own news and chance of playing. Fit
 * players, players who have left (unavailable) and players owned by less than the floor are never listed.
 */
export function buildAvailabilityWatch(input: {
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  pos: GraphicPosition | null;
  top: number;
}): AvailabilityRow[] {
  const { elements, teamShortById, pos, top } = input;
  const rows: Array<Omit<AvailabilityRow, "rank"> & { own: number }> = [];
  for (const e of elements) {
    if (!WATCH_STATUS.has(e.status ?? "a")) continue;
    const position = POSITION_BY_TYPE[e.element_type];
    const own = toNumber(e.selected_by_percent);
    if (!position || (pos && position !== pos) || own === null || own < MIN_WATCH_OWNERSHIP) continue;
    const status = STATUS_LABEL[e.status as string];
    const chance = toNumber(e.chance_of_playing_next_round);
    const news = typeof e.news === "string" ? e.news.trim() : "";
    rows.push({
      id: e.id,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position,
      price: money(e.now_cost),
      ownership: `${own.toFixed(1)}%`,
      statusLabel: status.label,
      tone: status.tone,
      chance: chance !== null && chance < 100 ? chance : null,
      news: news.length > MAX_NEWS_CHARS ? `${news.slice(0, MAX_NEWS_CHARS - 1)}…` : news,
      added: formatNewsDate(typeof e.news_added === "string" ? e.news_added : null),
      own,
    });
  }
  rows.sort((a, b) => b.own - a.own || a.id - b.id);
  return rows.slice(0, top).map(({ own: _own, ...r }, i) => ({ rank: i + 1, ...r }));
}

// ---------- empty graphics ----------

/** True when a graphic would be a blank card (no rows, no changes...): the pack skips these instead of drawing them. */
export function isEmptyGraphic(data: GraphicData): boolean {
  switch (data.kind) {
    case "captain-picks":
    case "top-differentials":
    case "availability-watch":
    case "stat-leaders":
      return data.rows.length === 0;
    case "fixture-ticker":
    case "fixtures-comparison":
      return data.grid.rows.length === 0;
    case "transfer-trends":
      return data.trends.ins.length + data.trends.outs.length === 0;
    case "price-change":
      return !data.prices.date || data.prices.risers.length + data.prices.fallers.length === 0;
    case "team-of-the-week":
      return !data.totw.complete;
    case "match-predictions":
      return data.predictions.rows.length === 0;
    case "match-results":
      return data.results.rows.length === 0;
    default:
      return false;
  }
}

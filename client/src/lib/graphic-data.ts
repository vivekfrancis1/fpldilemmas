import type { BootstrapData, Fixture } from "@shared/schema";
import { getDefaultGameweekRange } from "@shared/gameweek-utils";
import { projectionWindow } from "@shared/compare-utils";
import {
  TEAM_METRICS,
  buildLeagueTable,
  buildProjectedTable,
  buildTeamHistory,
  buildTeamProjections,
  resolveProjectedEndGameweek,
  teamGraphicUrl,
} from "@shared/graphics-teams";
import {
  PROJECTION_GROUP_LIMIT,
  buildPlayerHistory,
  buildPlayerProjections,
  buildTopScorers,
  resolveHistoryGameweeks,
  type HistoryRowInput,
  type LiveScorerInput,
} from "@shared/graphics-players";
import {
  MAX_RANGE_GAMEWEEKS,
  MIN_RATE_MINUTES,
  PRICE_LIST_LIMIT,
  MIN_WATCH_OWNERSHIP,
  buildAvailabilityWatch,
  buildCaptainPicks,
  buildComparison,
  buildCover,
  buildDifferentials,
  buildFixtureTicker,
  buildFixturesGrid,
  buildNewsQuote,
  buildPlayerCard,
  buildPredictedLineup,
  buildPriceChanges,
  buildStatLeaders,
  buildTeamOfTheWeek,
  buildTeamReveal,
  buildTransferTrends,
  gameweekLabel,
  type GraphicData,
  type GraphicElement,
  type GraphicSpec,
  type PriceChangeInput,
} from "@shared/graphics";
import {
  MATCH_LIST_LIMIT,
  buildMatchPredictions,
  buildMatchPreview,
  buildMatchReport,
  buildMatchResults,
  resolveMatch,
  resolvePredictionGameweek,
  resolveResultsGameweek,
  resultGameweeks,
  isFixtureResult,
  type MatchFixtureInput,
  type MatchModelInput,
} from "@shared/graphics-matches";

// Turns a graphic's settings plus the site's data into what gets drawn. Used by the page (the live preview) and by the
// Gameweek pack, so a pack image is exactly what the single graphic would be.

export interface PlayerProjection {
  playerId: number;
  gameweekProjections?: Record<string, number>;
  xMinsPerGW?: Record<string, number>;
  chanceOfPlayingNextRound?: number | null;
}

export type LiveElement = LiveScorerInput;

export interface GraphicDataContext {
  elements: GraphicElement[];
  teams: Array<{ id: number }>;
  teamShortById: Map<number, string>;
  teamNameById: Map<number, string>;
  projections: PlayerProjection[] | undefined;
  fixtures: Fixture[] | undefined;
  /** The default "next few gameweeks" range. */
  defaultRange: { from: number; to: number };
  /** The gameweek FPL's transfer counts are for right now. */
  transfersGw: number;
  finishedGameweeks: number[];
  /** Live points for the Team of the Week's gameweek; undefined while loading. */
  liveElements: LiveElement[] | undefined;
  /** Confirmed price changes; undefined while loading. */
  priceChanges: PriceChangeInput[] | undefined;
  /** Match Predictions / Match Preview: the team projections and odds for ONE gameweek (`matchModelGw`); undefined while loading. */
  matchModel?: MatchModelInput;
  matchModelGw?: number;
  /** Player History: FPL's match history of the chosen player; undefined while loading. */
  playerHistory?: { playerId: number; history: HistoryRowInput[] };
  /** The first gameweek that has not started (39 when the season is over). */
  nextGameweek: number;
  /** Team graphics: the response of the one request `teamGraphicUrl` names for the graphic, with that URL; undefined while loading. */
  teamData?: { url: string; data: any[] };
  /** Predicted Lineup: detailed position codes by FPL player id, main position first; undefined while loading (empty = none known). */
  detailedPositions?: Map<number, string[]>;
}

export interface ResolvedGameweeks {
  from: number;
  to: number;
  gameweeks: number[];
  gwLabel: string;
  /** Single-gameweek templates keep their gameweek in `from`. */
  singleGw: number;
}

export function resolveGameweeks(spec: Pick<GraphicSpec, "from" | "to">, defaultRange: { from: number; to: number }): ResolvedGameweeks {
  const from = spec.from || defaultRange.from;
  const to = Math.min(from + MAX_RANGE_GAMEWEEKS - 1, Math.max(from, spec.to || defaultRange.to));
  return { from, to, gameweeks: Array.from({ length: to - from + 1 }, (_, i) => from + i), gwLabel: gameweekLabel(from, to), singleGw: from };
}

/** Team of the Week's gameweek: the chosen one if it has finished, otherwise the latest finished one (0 if none). */
export function resolveTotwGw(spec: Pick<GraphicSpec, "from">, finishedGameweeks: number[]): number {
  return spec.from && finishedGameweeks.includes(spec.from) ? spec.from : finishedGameweeks[finishedGameweeks.length - 1] ?? 0;
}

const asMatchFixtures = (fixtures: Fixture[] | undefined): MatchFixtureInput[] => (fixtures ?? []) as unknown as MatchFixtureInput[];

/**
 * The gameweek whose team projections and odds a match graphic needs (0 = none needed or nothing to show). The page and the
 * pack fetch exactly that gameweek's data and hand it to computeGraphicData as `matchModel`.
 */
export function matchModelGameweek(spec: Pick<GraphicSpec, "template" | "from" | "fixture">, fixtures: Fixture[] | undefined): number {
  const list = asMatchFixtures(fixtures);
  if (spec.template === "match-predictions") return resolvePredictionGameweek(spec.from, list);
  if (spec.template === "match-preview") return resolveMatch(spec, list, "upcoming")?.event ?? 0;
  return 0;
}

export function longDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function computeGraphicData(spec: GraphicSpec, ctx: GraphicDataContext): { data: GraphicData | null; problem: string | null } {
  const { elements, teams, teamShortById, teamNameById, projections, fixtures } = ctx;
  if (!elements.length) return { data: null, problem: null };
  const { from, to, gameweeks, gwLabel, singleGw: lineupGw } = resolveGameweeks(spec, ctx.defaultRange);
  const totwGw = resolveTotwGw(spec, ctx.finishedGameweeks);
  const projectionById = new Map((projections ?? []).map((p) => [p.playerId, p.gameweekProjections]));
  const byId = new Map(elements.map((e) => [e.id, e]));
  const selectedElements = spec.players.map((id) => byId.get(id)).filter((e): e is GraphicElement => !!e);

  switch (spec.template) {
    case "player-card": {
      const e = selectedElements[0];
      if (!e) return { data: null, problem: "Search and pick a player to create the card." };
      return {
        data: {
          kind: "player-card",
          gwLabel,
          card: buildPlayerCard({ element: e, teamShortById, teamNameById, gameweekProjections: projectionById.get(e.id), gameweeks, fixtures: (fixtures ?? []) as any }),
        },
        problem: null,
      };
    }
    case "player-comparison": {
      if (selectedElements.length < 2) return { data: null, problem: "Pick at least two players to compare." };
      const xptsByPlayer = new Map(selectedElements.map((e) => [e.id, projectionWindow(projectionById.get(e.id), gameweeks).total]));
      return { data: { kind: "player-comparison", comparison: buildComparison({ elements: selectedElements, statKeys: spec.stats, xptsByPlayer, teamShortById }) }, problem: null };
    }
    case "fixtures-comparison": {
      if (spec.teams.length < 2) return { data: null, problem: "Pick at least two teams to compare." };
      if (!fixtures) return { data: null, problem: null };
      return { data: { kind: "fixtures-comparison", gwLabel, grid: buildFixturesGrid({ teamIds: spec.teams, gameweeks, fixtures: fixtures as any, teamShortById, teamNameById }) }, problem: null };
    }
    case "price-change": {
      if (!ctx.priceChanges) return { data: null, problem: null };
      const prices = buildPriceChanges({ changes: ctx.priceChanges, date: spec.date || null, limit: PRICE_LIST_LIMIT[spec.size] });
      const dateLabel = prices.date ? `Confirmed price changes · ${longDate(prices.date)}` : "Confirmed price changes";
      return { data: { kind: "price-change", prices, dateLabel }, problem: null };
    }
    case "predicted-lineup": {
      if (spec.teams.length < 1) return { data: null, problem: "Pick a club to predict its lineup." };
      if (!fixtures || !projections || !ctx.detailedPositions) return { data: null, problem: null };
      const lineup = buildPredictedLineup({ teamId: spec.teams[0], gameweek: lineupGw, elements, projections, teamShortById, teamNameById, fixtures: fixtures as any, detailedPositions: ctx.detailedPositions, formation: spec.formation, xi: spec.xi });
      return { data: { kind: "predicted-lineup", lineup, gwLabel: gameweekLabel(lineupGw, lineupGw) }, problem: null };
    }
    case "player-news": {
      const news = buildNewsQuote({ spec, elements, teamShortById, teamNameById });
      if (!news) return { data: null, problem: "Search and pick a player to quote their news." };
      if (news.kind === "none") return { data: null, problem: `There is no official FPL news for ${news.player.name} right now. Type a quote below to use your own words.` };
      return { data: { kind: "player-news", news }, problem: null };
    }
    case "cover":
      return { data: { kind: "cover", cover: buildCover({ spec, elements, teamShortById }) }, problem: null };
    case "team-reveal": {
      if (spec.squad.length === 0) return { data: null, problem: "Enter your FPL team ID on the left and your squad is picked for you, or add your 15 players one at a time." };
      if (!fixtures) return { data: null, problem: null };
      const reveal = buildTeamReveal({
        elements, squad: spec.squad, bench: spec.bench, captain: spec.captain, vice: spec.vice, chip: spec.chip,
        gameweek: lineupGw, fixtures: fixtures as any, teamShortById,
      });
      return { data: { kind: "team-reveal", reveal, gwLabel: gameweekLabel(lineupGw, lineupGw) }, problem: null };
    }
    case "captain-picks": {
      if (!fixtures || !projections) return { data: null, problem: null };
      const rows = buildCaptainPicks({ elements, projections, teamShortById, fixtures: fixtures as any, gameweek: lineupGw, top: spec.top, pos: spec.pos });
      const label = gameweekLabel(lineupGw, lineupGw);
      return { data: { kind: "captain-picks", rows, gwLabel: label, subtitle: `${label} · ${spec.pos ?? "all positions"} · ranked by our expected points` }, problem: null };
    }
    case "fixture-ticker": {
      if (!fixtures) return { data: null, problem: null };
      const grid = buildFixtureTicker({ teamIds: teams.map((t) => t.id), gameweeks, fixtures: fixtures as any, teamShortById, teamNameById });
      return { data: { kind: "fixture-ticker", grid, gwLabel }, problem: null };
    }
    case "transfer-trends": {
      const trends = buildTransferTrends({ elements, teamShortById, pos: spec.pos, top: spec.top });
      const label = ctx.transfersGw ? `GW${ctx.transfersGw} transfers so far` : "Transfers so far";
      return { data: { kind: "transfer-trends", trends, gwLabel: label, subtitle: `${spec.pos ?? "All positions"} · ${label}` }, problem: null };
    }
    case "team-of-the-week": {
      if (totwGw === 0) return { data: null, problem: "No gameweek has finished yet, so there is no Team of the Week to show." };
      if (!ctx.liveElements) return { data: null, problem: null };
      const totw = buildTeamOfTheWeek({ elements, live: ctx.liveElements, teamShortById, gameweek: totwGw });
      return { data: { kind: "team-of-the-week", totw, gwLabel: gameweekLabel(totwGw, totwGw) }, problem: null };
    }
    case "stat-leaders": {
      const result = buildStatLeaders({ elements, statKey: spec.stat, pos: spec.pos, top: spec.top, teamShortById });
      const label = `Season to date${result.minutesRule ? ` · min. ${MIN_RATE_MINUTES} minutes` : ""}`;
      const statLabel = result.stat?.label ?? spec.stat;
      return { data: { kind: "stat-leaders", rows: result.rows, gwLabel: label, statLabel, subtitle: `${statLabel}${spec.pos ? ` · ${spec.pos}` : ""} · season to date` }, problem: null };
    }
    case "availability-watch": {
      const rows = buildAvailabilityWatch({ elements, teamShortById, pos: spec.pos, top: spec.top });
      return { data: { kind: "availability-watch", rows, gwLabel: "Latest FPL news", subtitle: `Owned by ${MIN_WATCH_OWNERSHIP}%+ · ${spec.pos ?? "All positions"} · latest FPL news` }, problem: null };
    }
    case "match-predictions": {
      if (!fixtures) return { data: null, problem: null };
      const list = asMatchFixtures(fixtures);
      const gw = resolvePredictionGameweek(spec.from, list);
      if (gw === 0) return { data: null, problem: "There are no fixtures left to predict right now." };
      if (!ctx.matchModel || ctx.matchModelGw !== gw) return { data: null, problem: null };
      const predictions = buildMatchPredictions({ fixtures: list, gameweek: gw, model: ctx.matchModel, teamShortById, teamNameById, page: spec.page, limit: MATCH_LIST_LIMIT[spec.size] });
      const label = gameweekLabel(gw, gw);
      const pageText = predictions.pages > 1 ? ` · page ${predictions.page} of ${predictions.pages}` : "";
      return { data: { kind: "match-predictions", predictions, gwLabel: label, subtitle: `${label} · ${predictions.total === 1 ? "1 match" : `${predictions.total} matches`} · expected goals and chances${pageText}` }, problem: null };
    }
    case "match-results": {
      if (!fixtures) return { data: null, problem: null };
      const list = asMatchFixtures(fixtures);
      const gw = resolveResultsGameweek(spec.from, list);
      if (gw === 0) return { data: null, problem: "No match has finished yet, so there are no results to show." };
      const results = buildMatchResults({ fixtures: list, gameweek: gw, elements, teamShortById, teamNameById, page: spec.page, limit: MATCH_LIST_LIMIT[spec.size] });
      const label = gameweekLabel(gw, gw);
      const pageText = results.pages > 1 ? ` · page ${results.page} of ${results.pages}` : "";
      return { data: { kind: "match-results", results, gwLabel: label, subtitle: `${label} · ${results.total === 1 ? "1 match" : `${results.total} matches`} · ${results.goals === 1 ? "1 goal" : `${results.goals} goals`}${pageText}` }, problem: null };
    }
    case "match-preview": {
      if (!fixtures || !projections) return { data: null, problem: null };
      const list = asMatchFixtures(fixtures);
      const fixture = resolveMatch(spec, list, "upcoming");
      if (!fixture) return { data: null, problem: "There is no upcoming match to preview right now." };
      if (!ctx.matchModel || ctx.matchModelGw !== fixture.event) return { data: null, problem: null };
      const preview = buildMatchPreview({ fixture, fixtures: list, model: ctx.matchModel, elements, projections, teamShortById, teamNameById });
      if (!preview) return { data: null, problem: "That match has no gameweek yet, so there is nothing to preview." };
      return { data: { kind: "match-preview", preview, gwLabel: gameweekLabel(preview.gameweek, preview.gameweek) }, problem: null };
    }
    case "match-report": {
      if (!fixtures) return { data: null, problem: null };
      const list = asMatchFixtures(fixtures);
      const fixture = resolveMatch(spec, list, "finished");
      if (!fixture) return { data: null, problem: "No match has finished yet, so there is no match report to show." };
      const report = buildMatchReport({ fixture, elements, teamShortById, teamNameById });
      if (!report) return { data: null, problem: "That match has not finished yet." };
      return { data: { kind: "match-report", report, gwLabel: gameweekLabel(report.gameweek, report.gameweek) }, problem: null };
    }
    case "player-projections": {
      if (!projections) return { data: null, problem: null };
      const content = buildPlayerProjections({ elements, projections: projections as any, teamShortById, gameweeks, pos: spec.pos, top: spec.top, perGroup: PROJECTION_GROUP_LIMIT[spec.size] });
      return { data: { kind: "player-projections", projections: content, gwLabel, subtitle: `${gwLabel} · ${spec.pos ?? "best of each position"} · ranked by our expected points` }, problem: null };
    }
    case "gw-top-scorers": {
      if (totwGw === 0) return { data: null, problem: "No gameweek has finished yet, so there are no top scorers to show." };
      if (!ctx.liveElements) return { data: null, problem: null };
      const scorers = buildTopScorers({ elements, live: ctx.liveElements, teamShortById, gameweek: totwGw, pos: spec.pos, top: spec.top });
      const label = gameweekLabel(totwGw, totwGw);
      return { data: { kind: "gw-top-scorers", scorers, gwLabel: label, subtitle: `${label} · ${spec.pos ?? "all positions"} · actual FPL points` }, problem: null };
    }
    case "player-history": {
      const e = selectedElements[0];
      if (!e) return { data: null, problem: "Search and pick a player to see their history." };
      if (!fixtures) return { data: null, problem: null };
      const list = asMatchFixtures(fixtures);
      const gws = resolveHistoryGameweeks(spec, resultGameweeks(list));
      if (gws.length === 0) return { data: null, problem: "No match has finished yet, so there is no player history to show." };
      if (!ctx.playerHistory || ctx.playerHistory.playerId !== e.id) return { data: null, problem: null };
      const history = buildPlayerHistory({
        element: e,
        history: ctx.playerHistory.history,
        finishedFixtureIds: new Set(list.filter(isFixtureResult).map((f) => f.id)),
        teamShortById,
        gameweeks: gws,
      });
      return { data: { kind: "player-history", history, gwLabel: gameweekLabel(gws[0], gws[gws.length - 1]) }, problem: null };
    }
    case "team-projections": {
      const url = teamGraphicUrl(spec, ctx.defaultRange, ctx.nextGameweek);
      if (!url || !ctx.teamData || ctx.teamData.url !== url) return { data: null, problem: null };
      const teamsContent = buildTeamProjections({ rows: ctx.teamData.data, metric: spec.metric, gameweeks, teamShortById, teamNameById });
      return { data: { kind: "team-projections", teams: teamsContent, gwLabel, subtitle: `${gwLabel} · ${TEAM_METRICS[spec.metric].perGameLabel} · our projections` }, problem: null };
    }
    case "projected-table": {
      const url = teamGraphicUrl(spec, ctx.defaultRange, ctx.nextGameweek);
      if (!url || !ctx.teamData || ctx.teamData.url !== url) return { data: null, problem: null };
      const end = resolveProjectedEndGameweek(spec.to, ctx.nextGameweek);
      const table = buildProjectedTable({ rows: ctx.teamData.data, endGameweek: end });
      const counts = table.actualGames !== null && table.projectedGames !== null ? ` · ${table.actualGames} played, ${table.projectedGames} projected` : "";
      return { data: { kind: "projected-table", table, gwLabel: gameweekLabel(end, end), subtitle: `${end === 38 ? "Final table" : `After GW${end}`}${counts}` }, problem: null };
    }
    case "league-table": {
      const url = teamGraphicUrl(spec, ctx.defaultRange, ctx.nextGameweek);
      if (!url || !ctx.teamData || ctx.teamData.url !== url) return { data: null, problem: null };
      const table = buildLeagueTable({ rows: ctx.teamData.data, venue: spec.venue });
      if (!table.started) return { data: null, problem: "The season has not kicked off yet, so there is no league table to show." };
      const played = table.rows.reduce((n, r) => n + r.played, 0);
      const matches = spec.venue === "all" ? played / 2 : played;
      const latest = fixtures ? resultGameweeks(asMatchFixtures(fixtures)).slice(-1)[0] ?? 0 : 0;
      const venueText = spec.venue === "all" ? "All matches" : spec.venue === "home" ? "Home matches" : "Away matches";
      return { data: { kind: "league-table", table, gwLabel: latest ? gameweekLabel(latest, latest) : "", subtitle: `${venueText} · ${matches === 1 ? "1 match" : `${matches} matches`} played` }, problem: null };
    }
    case "team-history": {
      const teamId = spec.teams[0];
      if (!teamId) return { data: null, problem: "Pick a club to see its recent results." };
      if (!fixtures) return { data: null, problem: null };
      const url = teamGraphicUrl(spec, ctx.defaultRange, ctx.nextGameweek);
      if (!ctx.teamData || ctx.teamData.url !== url) return { data: null, problem: null };
      const history = buildTeamHistory({ teamId, fixtures: asMatchFixtures(fixtures), standings: ctx.teamData.data, teamShortById, teamNameById, from: spec.from, to: spec.to });
      if (!history) return { data: null, problem: "That club was not found." };
      const gws = history.results.map((r) => r.gameweek);
      return { data: { kind: "team-history", history, gwLabel: gws.length ? gameweekLabel(gws[0], gws[gws.length - 1]) : "" }, problem: null };
    }
    case "top-differentials": {
      const rows = buildDifferentials({ elements, projections: projections ?? [], teamShortById, from, to, pos: spec.pos, maxOwn: spec.maxOwn, top: spec.top });
      const subtitle = `Owned by under ${spec.maxOwn}% · ${spec.pos ?? "All positions"} · ${gwLabel}`;
      return { data: { kind: "top-differentials", rows, gwLabel, subtitle }, problem: null };
    }
  }
}


/**
 * Everything the graphics are built from, derived from the site's raw data. The page uses it for the live preview and the
 * Gameweek pack uses it with data it fetched itself, so both build from exactly the same pieces.
 */
export function makeGraphicDataContext(input: {
  bootstrap: BootstrapData | undefined;
  projections: PlayerProjection[] | undefined;
  fixtures: Fixture[] | undefined;
  liveElements: LiveElement[] | undefined;
  priceChanges: PriceChangeInput[] | undefined;
  defaultWeeks?: number;
  matchModel?: MatchModelInput;
  matchModelGw?: number;
  playerHistory?: { playerId: number; history: HistoryRowInput[] };
  teamData?: { url: string; data: any[] };
  detailedPositions?: Map<number, string[]>;
}): GraphicDataContext {
  const { bootstrap } = input;
  const teams = bootstrap?.teams ?? [];
  const events = (bootstrap?.events ?? []) as Array<{ id: number; finished?: boolean; is_next?: boolean; is_current?: boolean }>;
  const range = bootstrap?.events ? getDefaultGameweekRange(bootstrap.events as any, input.defaultWeeks ?? 5) : null;
  return {
    elements: (bootstrap?.elements ?? []) as unknown as GraphicElement[],
    teams,
    teamShortById: new Map(teams.map((t) => [t.id, t.short_name])),
    teamNameById: new Map(teams.map((t) => [t.id, t.name])),
    projections: input.projections,
    fixtures: input.fixtures,
    defaultRange: range ? { from: parseInt(range.startGameweek, 10), to: parseInt(range.endGameweek, 10) } : { from: 1, to: input.defaultWeeks ?? 5 },
    transfersGw: events.find((e) => e.is_next)?.id ?? events.find((e) => e.is_current)?.id ?? 0,
    finishedGameweeks: events.filter((e) => e.finished).map((e) => e.id).sort((a, b) => a - b),
    liveElements: input.liveElements,
    priceChanges: input.priceChanges,
    matchModel: input.matchModel,
    matchModelGw: input.matchModelGw,
    playerHistory: input.playerHistory,
    nextGameweek: events.find((e) => e.is_next)?.id ?? 39,
    teamData: input.teamData,
    detailedPositions: input.detailedPositions,
  };
}

export const DETAILED_POSITIONS_URL = "/api/player-detailed-positions";

/** The response of DETAILED_POSITIONS_URL as the lineup wants it: FPL player id -> position codes, main position first. */
export function detailedPositionsFromResponse(rows: Array<{ fplPlayerId: number; mainPosition: string; otherPositions?: string[] }> | null | undefined): Map<number, string[]> {
  return new Map((rows ?? []).map((r) => [r.fplPlayerId, [r.mainPosition, ...(r.otherPositions ?? [])]]));
}

// ---------- loading what a graphic needs ----------

export type JsonFetcher = (url: string) => Promise<any>;

/**
 * The requests a graphic needs beyond the base data (bootstrap, projections, fixtures): the team projections and odds of
 * one gameweek for a match graphic, the team table or projection a team graphic is built from, a finished gameweek's live
 * points, a player's match history. Empty for graphics built from the base data alone.
 */
export function graphicDataRequests(spec: GraphicSpec, ctx: GraphicDataContext): string[] {
  const urls: string[] = [];
  const modelGw = matchModelGameweek(spec, ctx.fixtures);
  if (modelGw > 0) {
    urls.push(`/api/team-goal-projections?startGameweek=${modelGw}&endGameweek=${modelGw}`);
    urls.push(`/api/team-cs-projections?startGameweek=${modelGw}&endGameweek=${modelGw}`);
    urls.push("/api/fixture-odds-current");
  }
  const team = teamGraphicUrl(spec, ctx.defaultRange, ctx.nextGameweek);
  if (team) urls.push(team);
  if (spec.template === "team-of-the-week" || spec.template === "gw-top-scorers") {
    const gw = resolveTotwGw(spec, ctx.finishedGameweeks);
    if (gw > 0) urls.push(`/api/event/${gw}/live`);
  }
  if (spec.template === "player-history" && spec.players[0]) urls.push(`/api/element-summary/${spec.players[0]}`);
  if (spec.template === "predicted-lineup") urls.push(DETAILED_POSITIONS_URL);
  return urls;
}

/**
 * The context with everything the graphic needs fetched and in place, so the Gameweek packs build each image from its own
 * data and never depend on what the page happened to have loaded. The original context is not changed; a failed request fails
 * the whole load.
 */
export async function loadGraphicData(spec: GraphicSpec, ctx: GraphicDataContext, fetchJson: JsonFetcher): Promise<GraphicDataContext> {
  const urls = graphicDataRequests(spec, ctx);
  if (urls.length === 0) return ctx;
  const bodies = await Promise.all(urls.map((u) => fetchJson(u)));
  const byUrl = new Map(urls.map((u, i) => [u, bodies[i]]));
  const next: GraphicDataContext = { ...ctx };
  const modelGw = matchModelGameweek(spec, ctx.fixtures);
  if (modelGw > 0) {
    next.matchModel = {
      goals: byUrl.get(`/api/team-goal-projections?startGameweek=${modelGw}&endGameweek=${modelGw}`) ?? [],
      cs: byUrl.get(`/api/team-cs-projections?startGameweek=${modelGw}&endGameweek=${modelGw}`) ?? [],
      odds: byUrl.get("/api/fixture-odds-current")?.odds ?? [],
    };
    next.matchModelGw = modelGw;
  }
  const team = teamGraphicUrl(spec, ctx.defaultRange, ctx.nextGameweek);
  if (team) next.teamData = { url: team, data: byUrl.get(team) ?? [] };
  if (spec.template === "team-of-the-week" || spec.template === "gw-top-scorers") {
    const gw = resolveTotwGw(spec, ctx.finishedGameweeks);
    if (gw > 0) next.liveElements = byUrl.get(`/api/event/${gw}/live`)?.elements ?? [];
  }
  if (spec.template === "player-history" && spec.players[0]) {
    next.playerHistory = { playerId: spec.players[0], history: byUrl.get(`/api/element-summary/${spec.players[0]}`)?.history ?? [] };
  }
  if (spec.template === "predicted-lineup") next.detailedPositions = detailedPositionsFromResponse(byUrl.get(DETAILED_POSITIONS_URL));
  return next;
}

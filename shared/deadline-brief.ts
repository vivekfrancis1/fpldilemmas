// Pre-deadline Brief: one page of facts for the next gameweek, assembled from data the site already serves.
// Official FPL data (deadline, availability, fixtures), our cached xPts (captains, picks) and the Price Changes
// page's own predictions, labelled as predictions. No new model and nothing is invented.
import { POSITION_SHORT } from "./captaincy-matrix";
import { fixturesForGameweeks, teamsWithUnscheduledFixtures, type CompareFixtureInput } from "./compare-utils";

export interface BriefElement {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  selected_by_percent: string | number;
  status: string;
  chance_of_playing_next_round: number | null;
  news: string;
  now_cost: number;
}

export interface BriefTeam {
  id: number;
  name: string;
  short_name: string;
}

export interface BriefProjection {
  playerId: number;
  gameweekProjections?: Record<string, number>;
}

export interface BriefPricePrediction {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  status: string;
  ownership_percentage: number;
  calibrating?: boolean;
}

export interface BriefPlayer {
  playerId: number;
  name: string;
  position: string;
  teamShort: string;
  xPts: number;
  /** 2 x xPts, rounded to 2 dp. */
  captainPoints: number;
  ownership: number | null;
  status: string;
  chanceOfPlayingNextRound: number | null;
  news: string;
}

export interface DeadlineBrief {
  gameweek: number;
  deadlineTime: string;
  /** false when the cached projections have no values for this gameweek yet. */
  projectionsAvailable: boolean;
  captains: BriefPlayer[];
  byPosition: Record<"GKP" | "DEF" | "MID" | "FWD", BriefPlayer[]>;
  availability: Array<{
    playerId: number; name: string; position: string; teamShort: string; status: string;
    chanceOfPlayingNextRound: number | null; news: string; ownership: number;
  }>;
  priceWatch: { risers: PriceRow[]; fallers: PriceRow[] };
  doubles: Array<{ teamId: number; name: string; shortName: string }>;
  blanks: Array<{ teamId: number; name: string; shortName: string }>;
  /** No fixture this gameweek, but an unscheduled one exists: not a confirmed blank. */
  tbc: Array<{ teamId: number; name: string; shortName: string }>;
}

export interface PriceRow {
  playerId: number;
  name: string;
  teamShort: string;
  position: string;
  /** The Price Changes page's own wording, unchanged. */
  status: string;
  currentPrice: number;
  ownership: number;
  calibrating: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const AVAILABILITY_OWNERSHIP_MIN = 10;

export function buildDeadlineBrief(input: {
  event: { id: number; name?: string; deadline_time: string };
  elements: BriefElement[];
  teams: BriefTeam[];
  fixtures: CompareFixtureInput[];
  projections: BriefProjection[];
  pricePredictions: BriefPricePrediction[];
}): DeadlineBrief {
  const { event, elements, teams, fixtures, projections, pricePredictions } = input;
  const gw = event.id;
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const elementById = new Map(elements.map((e) => [e.id, e]));
  const ownershipOf = (e: BriefElement) => {
    const n = parseFloat(String(e.selected_by_percent));
    return Number.isFinite(n) ? n : null;
  };

  const projected: BriefPlayer[] = [];
  for (const p of projections) {
    const x = p.gameweekProjections?.[String(gw)];
    const e = elementById.get(p.playerId);
    if (typeof x !== "number" || !e) continue;
    projected.push({
      playerId: e.id,
      name: e.web_name,
      position: POSITION_SHORT[e.element_type] ?? "",
      teamShort: teamById.get(e.team)?.short_name ?? "",
      xPts: x,
      captainPoints: round2(x * 2),
      ownership: ownershipOf(e),
      status: e.status,
      chanceOfPlayingNextRound: e.chance_of_playing_next_round ?? null,
      news: e.news ?? "",
    });
  }
  const byXPts = (a: BriefPlayer, b: BriefPlayer) => b.xPts - a.xPts || a.playerId - b.playerId;
  projected.sort(byXPts);

  const byPosition = { GKP: [], DEF: [], MID: [], FWD: [] } as DeadlineBrief["byPosition"];
  for (const pos of ["GKP", "DEF", "MID", "FWD"] as const) {
    byPosition[pos] = projected.filter((p) => p.position === pos).slice(0, 3);
  }

  const availability = elements
    .filter((e) => e.status !== "a" && (ownershipOf(e) ?? 0) >= AVAILABILITY_OWNERSHIP_MIN)
    .sort((a, b) => (ownershipOf(b) ?? 0) - (ownershipOf(a) ?? 0) || a.id - b.id)
    .map((e) => ({
      playerId: e.id,
      name: e.web_name,
      position: POSITION_SHORT[e.element_type] ?? "",
      teamShort: teamById.get(e.team)?.short_name ?? "",
      status: e.status,
      chanceOfPlayingNextRound: e.chance_of_playing_next_round ?? null,
      news: e.news ?? "",
      ownership: ownershipOf(e) ?? 0,
    }));

  const toPriceRow = (r: BriefPricePrediction): PriceRow => ({
    playerId: r.player_id,
    name: r.player_name,
    teamShort: r.team_name,
    position: r.position,
    status: r.status,
    currentPrice: r.current_price,
    ownership: r.ownership_percentage,
    calibrating: !!r.calibrating,
  });
  const byOwn = (a: BriefPricePrediction, b: BriefPricePrediction) => b.ownership_percentage - a.ownership_percentage || a.player_id - b.player_id;
  const risers = pricePredictions.filter((r) => /rise/i.test(r.status)).sort(byOwn).slice(0, 5).map(toPriceRow);
  const fallers = pricePredictions.filter((r) => /drop|fall/i.test(r.status)).sort(byOwn).slice(0, 5).map(toPriceRow);

  const doubles: DeadlineBrief["doubles"] = [];
  const blanks: DeadlineBrief["blanks"] = [];
  const tbc: DeadlineBrief["tbc"] = [];
  const tbcTeams = teamsWithUnscheduledFixtures(fixtures);
  for (const t of teams) {
    const n = fixturesForGameweeks(t.id, fixtures.map((f) => ({ ...f, finished: false })), [gw])[0].fixtures.length;
    if (n > 1) doubles.push({ teamId: t.id, name: t.name, shortName: t.short_name });
    if (n === 0) (tbcTeams.has(t.id) ? tbc : blanks).push({ teamId: t.id, name: t.name, shortName: t.short_name });
  }

  return {
    gameweek: gw,
    deadlineTime: event.deadline_time,
    projectionsAvailable: projected.length > 0,
    captains: projected.slice(0, 5),
    byPosition,
    availability,
    priceWatch: { risers, fallers },
    doubles,
    blanks,
    tbc,
  };
}

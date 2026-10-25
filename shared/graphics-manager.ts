// Pure builders for the two manager graphics of the Graphics Maker: My Gameweek (a finished or live gameweek: the pitch with
// every player's points, the gameweek total and rank, overall points and rank) and the extra figures on Team Reveal
// (this gameweek's transfers, overall points and rank). Everything is FPL's own data for the manager: nothing is modelled,
// a figure FPL does not have is null and left off the graphic, never shown as 0.

import { BENCH_PLAYERS, CHIP_IDS, CHIP_LABELS, MAX_BANK, POSITION_BY_TYPE, SQUAD_QUOTA, SQUAD_SIZE, squadFromPicks, type ChipId, type GraphicElement, type GraphicPosition } from "./graphics";
import type { LiveScorerInput } from "./graphics-players";

/** The part of FPL's `entry/{id}/event/{gw}/picks` response the graphics read. */
export interface EntryPicksInput {
  active_chip: string | null;
  automatic_subs?: Array<{ element_in: number; element_out: number }>;
  entry_history?: {
    event: number;
    /** Points after the transfer hit. */
    points: number;
    total_points: number;
    /** Gameweek rank: null or 0 until FPL has set it. */
    rank: number | null;
    overall_rank: number | null;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
    /** The bank at the end of the gameweek, in tenths of a million. */
    bank?: number;
  };
  picks: Array<{ element: number; position: number; multiplier: number; is_captain: boolean; is_vice_captain: boolean }>;
}

const MANAGER_CHIP_LABEL: Record<string, string> = { ...CHIP_LABELS, manager: "Assistant Manager" };
const ROWS: GraphicPosition[] = ["GKP", "DEF", "MID", "FWD"];

const positiveOrNull = (n: number | null | undefined): number | null => (typeof n === "number" && n > 0 ? n : null);

// ---------- My Gameweek ----------

export interface MyGameweekToken {
  id: number;
  name: string;
  teamShort: string;
  position: GraphicPosition;
  /** What the player added to the gameweek: their points times the captain multiplier. Null when FPL has no entry for them. */
  points: number | null;
  /** The player's own points, before any multiplier. */
  basePoints: number | null;
  multiplier: number;
  /** Counted towards the gameweek total (starting XI after substitutions, or everyone under a Bench Boost). */
  counted: boolean;
  isCaptain: boolean;
  isVice: boolean;
  /** Came on from the bench for a player who did not play. */
  subbedIn: boolean;
}

export interface MyGameweekContent {
  gameweek: number;
  complete: boolean;
  /** "4-4-2" of the XI that counted; null until complete. */
  formation: string | null;
  rows: Array<{ position: GraphicPosition; players: MyGameweekToken[] }>;
  /** Goalkeeper first, then the outfield bench in order. */
  bench: MyGameweekToken[];
  chipLabel: string | null;
  /** FPL's gameweek points (after the hit); null if FPL sent no entry history. */
  gwPoints: number | null;
  /** The points hit for extra transfers (0 when none). */
  transferCost: number | null;
  gwRank: number | null;
  overallPoints: number | null;
  overallRank: number | null;
  pointsOnBench: number | null;
  /** The counted players' points added up here, to compare with FPL's own figure (gwPoints + transferCost). Null if any are missing. */
  computedTotal: number | null;
}

const emptyMyGameweek = (gameweek: number, chipLabel: string | null = null): MyGameweekContent => ({
  gameweek, complete: false, formation: null, rows: ROWS.map((position) => ({ position, players: [] })), bench: [], chipLabel,
  gwPoints: null, transferCost: null, gwRank: null, overallPoints: null, overallRank: null, pointsOnBench: null, computedTotal: null,
});

/**
 * The manager's squad for one gameweek as FPL scored it. Players are drawn where FPL had them after automatic substitutions
 * (a Bench Boost has none and counts all 15). Points are the player's live gameweek points times the multiplier: 2 for the
 * captain (3 with Triple Captain). In a finished gameweek where the captain did not play the vice-captain takes the multiplier,
 * as FPL does. The totals and ranks are FPL's own, from the entry history.
 */
export function buildMyGameweek(input: {
  elements: GraphicElement[];
  live: LiveScorerInput[];
  teamShortById: Map<number, string>;
  gameweek: number;
  /** A finished gameweek: only then can "did not play" decide the armband. */
  finished: boolean;
  picks: EntryPicksInput | null;
}): MyGameweekContent {
  const { elements, live, teamShortById, gameweek, finished, picks } = input;
  const chipLabel = picks?.active_chip ? MANAGER_CHIP_LABEL[picks.active_chip] ?? null : null;
  if (!picks) return emptyMyGameweek(gameweek, chipLabel);

  const byId = new Map(elements.map((e) => [e.id, e]));
  const liveById = new Map(live.map((l) => [l.id, l]));
  const ordered = [...picks.picks].sort((a, b) => a.position - b.position);
  if (ordered.length !== SQUAD_SIZE || ordered.some((p) => !byId.has(p.element))) return emptyMyGameweek(gameweek, chipLabel);

  const benchBoost = picks.active_chip === "bboost";
  const subs = benchBoost ? [] : picks.automatic_subs ?? [];
  const subsOut = new Set(subs.map((s) => s.element_out));
  const subsIn = new Set(subs.map((s) => s.element_in));

  const captain = ordered.find((p) => p.is_captain);
  const vice = ordered.find((p) => p.is_vice_captain);
  const played = (id: number) => (liveById.get(id)?.stats.minutes ?? 0) > 0;
  // the armband: the captain, unless a finished gameweek shows they never played and the vice-captain did
  const armband = captain && vice && finished && !played(captain.element) && played(vice.element) ? vice : captain;
  const armbandMultiplier = picks.active_chip === "3xc" ? 3 : 2;

  const counted = (p: { element: number; position: number }) => (benchBoost ? true : p.position <= 11 ? !subsOut.has(p.element) : subsIn.has(p.element));

  const token = (p: (typeof ordered)[number]): MyGameweekToken => {
    const e = byId.get(p.element)!;
    const l = liveById.get(p.element);
    const isCounted = counted(p);
    const multiplier = !isCounted ? 0 : armband && p.element === armband.element ? armbandMultiplier : 1;
    const basePoints = l ? l.stats.total_points : null;
    return {
      id: p.element,
      name: e.web_name,
      teamShort: teamShortById.get(e.team) ?? "",
      position: POSITION_BY_TYPE[e.element_type] ?? "MID",
      points: basePoints === null ? null : isCounted ? basePoints * multiplier : basePoints,
      basePoints,
      multiplier,
      counted: isCounted,
      isCaptain: p.is_captain,
      isVice: p.is_vice_captain && !p.is_captain,
      subbedIn: subsIn.has(p.element) && isCounted && !benchBoost,
    };
  };

  const tokens = ordered.map(token);
  const xi = tokens.filter((t, i) => (benchBoost ? ordered[i].position <= 11 : t.counted));
  const bench = tokens.filter((t, i) => (benchBoost ? ordered[i].position > 11 : !t.counted));
  if (bench.length !== BENCH_PLAYERS || xi.length !== 11) return emptyMyGameweek(gameweek, chipLabel);

  // a bench goalkeeper stays first; the outfield bench keeps FPL's order
  const benchOrdered = [...bench].sort((a, b) => Number(b.position === "GKP") - Number(a.position === "GKP"));
  const rows = ROWS.map((position) => ({ position, players: xi.filter((t) => t.position === position) }));
  const formation = `${rows[1].players.length}-${rows[2].players.length}-${rows[3].players.length}`;

  const counted15 = tokens.filter((t) => t.counted);
  const computedTotal = counted15.some((t) => t.points === null) ? null : counted15.reduce((s, t) => s + (t.points ?? 0), 0);
  const h = picks.entry_history;
  return {
    gameweek,
    complete: true,
    formation,
    rows,
    bench: benchOrdered,
    chipLabel,
    gwPoints: h ? h.points : null,
    transferCost: h ? h.event_transfers_cost : null,
    gwRank: positiveOrNull(h?.rank),
    overallPoints: h ? h.total_points : null,
    overallRank: positiveOrNull(h?.overall_rank),
    pointsOnBench: h ? h.points_on_bench : null,
    computedTotal,
  };
}

// ---------- Team Reveal: transfers and overall figures ----------

/** One row of FPL's `entry/{id}/transfers`. */
export interface TransferInput {
  element_in: number;
  element_out: number;
  event: number;
  time?: string;
}

export interface RevealTransfer {
  inName: string;
  inTeam: string;
  outName: string;
  outTeam: string;
}

export interface RevealStats {
  /** The transfers made for this gameweek; null when nothing tells us (no starting squad and no FPL team to ask). */
  transfers: RevealTransfer[] | null;
  /** The points hit for this gameweek; null until FPL has this gameweek's picks. */
  transferCost: number | null;
  /** Where the manager stood after the previous gameweek; null in gameweek 1 or when FPL has no figure. */
  overallPoints: number | null;
  overallRank: number | null;
  /** The money in the bank the manager declared, in tenths of a million; null when not declared. */
  bank: number | null;
}

const byPositionOrder = (elements: Map<number, GraphicElement>) => (a: number, b: number) =>
  (elements.get(a)?.element_type ?? 9) - (elements.get(b)?.element_type ?? 9);

/**
 * The swaps between a starting squad and the squad now: the players who left matched with the players who came in, position
 * by position (a squad always has 2/5/5/3, so each position has as many in as out). Null unless both are 15 known players.
 */
function transfersBetween(elements: GraphicElement[], teamShortById: Map<number, string>, base: number[], squad: number[]): RevealTransfer[] | null {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const known = (ids: number[]) => ids.length === SQUAD_SIZE && new Set(ids).size === SQUAD_SIZE && ids.every((id) => byId.has(id));
  if (!known(base) || !known(squad)) return null;
  const out = base.filter((id) => !squad.includes(id)).sort(byPositionOrder(byId));
  const into = squad.filter((id) => !base.includes(id)).sort(byPositionOrder(byId));
  const pairs: RevealTransfer[] = [];
  for (const type of [1, 2, 3, 4]) {
    const outs = out.filter((id) => byId.get(id)!.element_type === type);
    const ins = into.filter((id) => byId.get(id)!.element_type === type);
    for (let i = 0; i < Math.min(outs.length, ins.length); i++) {
      const o = byId.get(outs[i])!;
      const n = byId.get(ins[i])!;
      pairs.push({ inName: n.web_name, inTeam: teamShortById.get(n.team) ?? "", outName: o.web_name, outTeam: teamShortById.get(o.team) ?? "" });
    }
  }
  return pairs;
}

export function buildRevealStats(input: {
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  gameweek: number;
  /** FPL's own transfer list for the team; null when there is no team to ask. */
  transfers: TransferInput[] | null;
  /** The squad being drawn, and the squad it started from (the previous gameweek's), to work the transfers out from. */
  squad: number[];
  baseSquad: number[] | null;
  /** The money in the bank the manager declared (tenths of a million). */
  bank: number | null;
  /** This gameweek's picks; null before they are out (the deadline has not passed). */
  currentPicks: EntryPicksInput | null;
  /** The previous gameweek's picks, for the overall figures. */
  previousPicks: EntryPicksInput | null;
}): RevealStats {
  const { elements, teamShortById, gameweek, transfers, squad, baseSquad, bank, currentPicks, previousPicks } = input;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const describe = (id: number) => {
    const e = byId.get(id);
    return e ? { name: e.web_name, team: teamShortById.get(e.team) ?? "" } : null;
  };
  let made: RevealTransfer[] | null;
  if (baseSquad) {
    // the squad on show may have been changed by the manager, which FPL's list cannot know about
    made = transfersBetween(elements, teamShortById, baseSquad, squad);
  } else if (transfers) {
    made = [];
    for (const t of [...transfers].filter((x) => x.event === gameweek).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))) {
      const incoming = describe(t.element_in);
      const outgoing = describe(t.element_out);
      if (incoming && outgoing) made.push({ inName: incoming.name, inTeam: incoming.team, outName: outgoing.name, outTeam: outgoing.team });
    }
  } else {
    made = null;
  }
  const previous = gameweek > 1 ? previousPicks?.entry_history : undefined;
  return {
    transfers: made,
    transferCost: currentPicks?.entry_history ? currentPicks.entry_history.event_transfers_cost : null,
    overallPoints: previous ? previous.total_points : null,
    overallRank: positiveOrNull(previous?.overall_rank),
    bank: typeof bank === "number" && bank >= 0 ? bank : null,
  };
}

// ---------- Team Reveal: choosing the formation ----------

/** The formations a starting XI can take (3-5 defenders, 2-5 midfielders, 1-3 forwards). */
export const SQUAD_FORMATIONS: readonly string[] = ["4-4-2", "4-3-3", "3-5-2", "3-4-3", "4-5-1", "5-3-2", "5-4-1", "5-2-3"];

const isFullSquad = (elements: GraphicElement[], squad: number[]): boolean => {
  const byId = new Map(elements.map((e) => [e.id, e]));
  if (squad.length !== SQUAD_SIZE || new Set(squad).size !== SQUAD_SIZE || !squad.every((id) => byId.has(id))) return false;
  const n = (type: number) => squad.filter((id) => byId.get(id)!.element_type === type).length;
  return n(1) === SQUAD_QUOTA.GKP && n(2) === SQUAD_QUOTA.DEF && n(3) === SQUAD_QUOTA.MID && n(4) === SQUAD_QUOTA.FWD;
};

/** "4-4-2" for the XI left when `bench` is taken out of `squad`; null when the squad or the bench is not a legal one. */
export function formationOfSquad(elements: GraphicElement[], squad: number[], bench: number[]): string | null {
  if (!isFullSquad(elements, squad) || bench.length !== BENCH_PLAYERS || new Set(bench).size !== BENCH_PLAYERS || !bench.every((id) => squad.includes(id))) return null;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const xi = squad.filter((id) => !bench.includes(id));
  const n = (type: number) => xi.filter((id) => byId.get(id)!.element_type === type).length;
  const f = `${n(2)}-${n(3)}-${n(4)}`;
  return n(1) === 1 && SQUAD_FORMATIONS.includes(f) ? f : null;
}

/**
 * The bench that makes the XI the chosen formation: the best players by expected points at each position start (those already
 * starting win a tie), the rest go to the bench, the goalkeeper first and the outfield best first. The goalkeeper already on
 * the bench stays there. Null for an unknown formation or a squad that is not a legal 15.
 */
export function benchForFormation(input: {
  elements: GraphicElement[];
  squad: number[];
  xptsById: Map<number, number | null>;
  formation: string;
  currentBench: number[];
}): number[] | null {
  const { elements, squad, xptsById, formation, currentBench } = input;
  if (!SQUAD_FORMATIONS.includes(formation) || !isFullSquad(elements, squad)) return null;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const [d, m, f] = formation.split("-").map(Number);
  const xp = (id: number) => xptsById.get(id) ?? -1;
  const benched = new Set(currentBench);
  const rank = (a: number, b: number) => xp(b) - xp(a) || Number(benched.has(a)) - Number(benched.has(b)) || a - b;
  const ofType = (type: number) => squad.filter((id) => byId.get(id)!.element_type === type);

  const keepers = ofType(1);
  const onBench = keepers.filter((id) => benched.has(id));
  const benchKeeper = onBench.length === 1 ? onBench[0] : [...keepers].sort(rank)[1];

  const outfieldBench: number[] = [];
  for (const [type, starters] of [[2, d], [3, m], [4, f]] as const) {
    outfieldBench.push(...[...ofType(type)].sort(rank).slice(starters));
  }
  outfieldBench.sort((a, b) => xp(b) - xp(a) || a - b);
  return [benchKeeper, ...outfieldBench];
}

// ---------- Team Reveal: money in the bank, and a logged-in manager's own team ----------

/**
 * The money in the bank as typed in £m ("0.5", "£1.2m", "0,5") in tenths of a million. Empty is "not declared" (null); anything
 * that is not a possible amount (negative, not a multiple of £0.1m, more than a team can hold) is undefined.
 */
export function parseBankInput(text: string): number | null | undefined {
  const cleaned = text.trim().replace(/^£/, "").replace(/m$/i, "").trim().replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d{0,3}(\.\d)?$/.test(cleaned) || cleaned === ".") return undefined;
  const tenths = Math.round(parseFloat(cleaned) * 10);
  return Number.isFinite(tenths) && tenths >= 0 && tenths <= MAX_BANK ? tenths : undefined;
}

/**
 * A logged-in manager's own team from FPL's `my-team` (the working team, with any transfers made for the coming gameweek
 * already in it): the squad, bench, captain and vice, the chip if one is active and the bank FPL reports. Null unless it is
 * a 15-player team.
 */
export function squadFromMyTeam(body: any): { squad: number[]; bench: number[]; captain: number; vice: number; bank: number | null; chip: ChipId } | null {
  const picks = body && Array.isArray(body.picks) ? body.picks : null;
  if (!picks || picks.length !== SQUAD_SIZE) return null;
  const bank = body.transfers && typeof body.transfers.bank === "number" && body.transfers.bank >= 0 ? body.transfers.bank : null;
  const chip = CHIP_IDS.includes(body.active_chip) ? (body.active_chip as ChipId) : "";
  return { ...squadFromPicks(picks), bank, chip };
}

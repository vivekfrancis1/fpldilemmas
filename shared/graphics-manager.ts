// Pure builders for the two manager graphics of the Graphics Maker: My Gameweek (a finished or live gameweek: the pitch with
// every player's points, the gameweek total and rank, overall points and rank) and the extra figures on Team Reveal
// (this gameweek's transfers, overall points and rank). Everything is FPL's own data for the manager: nothing is modelled,
// a figure FPL does not have is null and left off the graphic, never shown as 0.

import { BENCH_PLAYERS, CHIP_LABELS, POSITION_BY_TYPE, SQUAD_SIZE, type GraphicElement, type GraphicPosition } from "./graphics";
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
  /** The transfers made for this gameweek, in the order they were made. */
  transfers: RevealTransfer[];
  /** The points hit for this gameweek; null until FPL has this gameweek's picks. */
  transferCost: number | null;
  /** Where the manager stood after the previous gameweek; null in gameweek 1 or when FPL has no figure. */
  overallPoints: number | null;
  overallRank: number | null;
}

export function buildRevealStats(input: {
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  gameweek: number;
  transfers: TransferInput[];
  /** This gameweek's picks; null before they are out (the deadline has not passed). */
  currentPicks: EntryPicksInput | null;
  /** The previous gameweek's picks, for the overall figures. */
  previousPicks: EntryPicksInput | null;
}): RevealStats {
  const { elements, teamShortById, gameweek, transfers, currentPicks, previousPicks } = input;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const describe = (id: number) => {
    const e = byId.get(id);
    return e ? { name: e.web_name, team: teamShortById.get(e.team) ?? "" } : null;
  };
  const made: RevealTransfer[] = [];
  for (const t of [...transfers].filter((x) => x.event === gameweek).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))) {
    const incoming = describe(t.element_in);
    const outgoing = describe(t.element_out);
    if (incoming && outgoing) made.push({ inName: incoming.name, inTeam: incoming.team, outName: outgoing.name, outTeam: outgoing.team });
  }
  const previous = gameweek > 1 ? previousPicks?.entry_history : undefined;
  return {
    transfers: made,
    transferCost: currentPicks?.entry_history ? currentPicks.entry_history.event_transfers_cost : null,
    overallPoints: previous ? previous.total_points : null,
    overallRank: positiveOrNull(previous?.overall_rank),
  };
}

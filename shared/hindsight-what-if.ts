// Hindsight "what if" scenarios: exact arithmetic on a manager's real squads and each player's final points, answering
// questions like "what if I had never made a transfer" or "what if I had captained one player every week". Nothing is
// estimated. Auto-subs and vice-captain promotion are not re-run: final player points are used directly.
import { bestPossible } from "./hindsight";

export interface WhatIfPick {
  id: number;
  name: string;
  elementType: 1 | 2 | 3 | 4;
  /** In the original starting XI (position 1-11). */
  started: boolean;
  /** Official multiplier: 0 benched (except Bench Boost), 1 plays, 2 captain, 3 Triple Captain. */
  multiplier: number;
  isCaptain: boolean;
  isVice: boolean;
}

export interface WhatIfWeek {
  gameweek: number;
  chip: string | null;
  officialPoints: number;
  transferCost: number;
  picks: WhatIfPick[];
  /** Final points for every player that gameweek; a player missing from the feed scored 0. */
  pointsById: Map<number, number>;
}

const ptsOf = (w: WhatIfWeek, id: number) => w.pointsById.get(id) ?? 0;
const byWeek = (weeks: WhatIfWeek[]) => [...weeks].sort((a, b) => a.gameweek - b.gameweek);

// ---------------------------------------------------------------------------------------------------------------------
// Set and forget
// ---------------------------------------------------------------------------------------------------------------------

export interface SetAndForgetRow {
  gameweek: number;
  /** Best possible XI (no chip) from the squad actually held that week. */
  actualBest: number;
  /** Best possible XI (no chip) from the squad held at the starting gameweek. */
  fixedBest: number;
  delta: number;
}

export interface SetAndForgetResult {
  scenario: "set-and-forget";
  fromGameweek: number;
  squad: Array<{ id: number; name: string; elementType: 1 | 2 | 3 | 4 }>;
  rows: SetAndForgetRow[];
  totals: { actualBest: number; fixedBest: number; delta: number; hitsSaved: number; netDelta: number };
}

/** Keep the 15 players held at `fromGameweek` for every later week (no transfers, no chips) and compare like for like. */
export function setAndForget(allWeeks: WhatIfWeek[], fromGameweek: number): SetAndForgetResult | null {
  const weeks = byWeek(allWeeks).filter((w) => w.gameweek >= fromGameweek);
  const start = weeks.find((w) => w.gameweek === fromGameweek);
  if (!start) return null;

  const fixed = start.picks.map((p) => ({ id: p.id, name: p.name, elementType: p.elementType }));
  const best = (squad: Array<{ id: number; elementType: 1 | 2 | 3 | 4 }>, w: WhatIfWeek) =>
    bestPossible(squad.map((p) => ({ id: p.id, elementType: p.elementType, points: ptsOf(w, p.id) })), null).total;

  const rows: SetAndForgetRow[] = weeks.map((w) => {
    const actualBest = best(w.picks, w);
    const fixedBest = best(fixed, w);
    return { gameweek: w.gameweek, actualBest, fixedBest, delta: fixedBest - actualBest };
  });

  const sum = (pick: (r: SetAndForgetRow) => number) => rows.reduce((a, r) => a + pick(r), 0);
  // The hit in the starting gameweek bought the squad being kept, so only later hits count as saved.
  const hitsSaved = weeks.filter((w) => w.gameweek > fromGameweek).reduce((a, w) => a + w.transferCost, 0);
  const delta = sum((r) => r.delta);
  return {
    scenario: "set-and-forget",
    fromGameweek,
    squad: fixed,
    rows,
    totals: { actualBest: sum((r) => r.actualBest), fixedBest: sum((r) => r.fixedBest), delta, hitsSaved, netDelta: delta + hitsSaved },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Captain one player every week
// ---------------------------------------------------------------------------------------------------------------------

export type CaptainStatus = "already" | "applied" | "not-in-xi" | "not-in-squad" | "no-captain";

export interface CaptainRow {
  gameweek: number;
  status: CaptainStatus;
  /** The player's points that week; null when he was not in the squad. */
  playerPoints: number | null;
  captainPoints: number | null;
  delta: number;
}

export interface CaptainResult {
  scenario: "captain";
  rows: CaptainRow[];
  totals: { delta: number; weeksApplied: number; weeksAlready: number; weeksNotInXI: number; weeksNotInSquad: number };
}

/** Move the armband to `playerId` in every week he counts (multiplier > 0): delta = (his points - the captain's) x (armband multiplier - 1). */
export function captainEveryWeek(allWeeks: WhatIfWeek[], playerId: number): CaptainResult {
  const rows: CaptainRow[] = byWeek(allWeeks).map((w) => {
    const target = w.picks.find((p) => p.id === playerId);
    const captain = w.picks.find((p) => p.isCaptain);
    const captainPoints = captain ? ptsOf(w, captain.id) : null;
    if (!target) return { gameweek: w.gameweek, status: "not-in-squad", playerPoints: null, captainPoints, delta: 0 };
    const playerPoints = ptsOf(w, target.id);
    if (target.isCaptain) return { gameweek: w.gameweek, status: "already", playerPoints, captainPoints, delta: 0 };
    if (target.multiplier <= 0) return { gameweek: w.gameweek, status: "not-in-xi", playerPoints, captainPoints, delta: 0 };
    if (!captain) return { gameweek: w.gameweek, status: "no-captain", playerPoints, captainPoints, delta: 0 };
    return { gameweek: w.gameweek, status: "applied", playerPoints, captainPoints, delta: (playerPoints - captainPoints!) * (captain.multiplier - 1) };
  });
  const count = (s: CaptainStatus) => rows.filter((r) => r.status === s).length;
  return {
    scenario: "captain",
    rows,
    totals: {
      delta: rows.reduce((a, r) => a + r.delta, 0),
      weeksApplied: count("applied"),
      weeksAlready: count("already"),
      weeksNotInXI: count("not-in-xi"),
      weeksNotInSquad: count("not-in-squad"),
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Stop rotating the goalkeeper
// ---------------------------------------------------------------------------------------------------------------------

export type KeeperStatus = "same" | "changed" | "not-in-squad" | "bench-boost";

export interface KeeperRow {
  gameweek: number;
  status: KeeperStatus;
  /** The keeper actually started (null under Bench Boost). */
  started: { id: number; name: string; points: number } | null;
  keeperPoints: number | null;
  delta: number;
}

export interface KeeperResult {
  scenario: "keeper";
  keeper: { id: number; name: string };
  /** Keepers started, most weeks first. */
  startedCounts: Array<{ id: number; name: string; weeks: number }>;
  rows: KeeperRow[];
  totals: { delta: number; weeksChanged: number };
}

/** Start the same goalkeeper (default: the one started most weeks) whenever he is in the squad. */
export function stickWithKeeper(allWeeks: WhatIfWeek[], keeperId?: number): KeeperResult | null {
  const weeks = byWeek(allWeeks);
  const startedOf = (w: WhatIfWeek) => w.picks.find((p) => p.elementType === 1 && p.started);

  const counts = new Map<number, { id: number; name: string; weeks: number }>();
  for (const w of weeks) {
    const s = startedOf(w);
    if (!s) continue;
    const c = counts.get(s.id) ?? { id: s.id, name: s.name, weeks: 0 };
    c.weeks++;
    counts.set(s.id, c);
  }
  const startedCounts = [...counts.values()].sort((a, b) => b.weeks - a.weeks || a.id - b.id);

  let keeper = keeperId !== undefined ? undefined : startedCounts[0];
  if (keeperId !== undefined) {
    const name = weeks.flatMap((w) => w.picks).find((p) => p.id === keeperId && p.elementType === 1)?.name;
    if (name === undefined) return null;
    keeper = { id: keeperId, name, weeks: counts.get(keeperId)?.weeks ?? 0 };
  }
  if (!keeper) return null;
  const chosen = keeper;

  const rows: KeeperRow[] = weeks.map((w) => {
    const s = startedOf(w);
    const started = s ? { id: s.id, name: s.name, points: ptsOf(w, s.id) } : null;
    if (w.chip === "bboost") return { gameweek: w.gameweek, status: "bench-boost", started: null, keeperPoints: null, delta: 0 };
    if (!w.picks.some((p) => p.id === chosen.id)) return { gameweek: w.gameweek, status: "not-in-squad", started, keeperPoints: null, delta: 0 };
    const keeperPoints = ptsOf(w, chosen.id);
    if (!started || started.id === chosen.id) return { gameweek: w.gameweek, status: "same", started, keeperPoints, delta: 0 };
    return { gameweek: w.gameweek, status: "changed", started, keeperPoints, delta: keeperPoints - started.points };
  });

  return {
    scenario: "keeper",
    keeper: { id: chosen.id, name: chosen.name },
    startedCounts,
    rows,
    totals: { delta: rows.reduce((a, r) => a + r.delta, 0), weeksChanged: rows.filter((r) => r.status === "changed").length },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Vice-captain every week
// ---------------------------------------------------------------------------------------------------------------------

export type ViceStatus = "applied" | "not-in-xi" | "no-vice" | "no-captain";

export interface ViceRow {
  gameweek: number;
  status: ViceStatus;
  captain: { id: number; name: string; points: number } | null;
  vice: { id: number; name: string; points: number } | null;
  delta: number;
}

export interface ViceResult {
  scenario: "vice";
  rows: ViceRow[];
  totals: { delta: number; weeksApplied: number; weeksNotInXI: number };
}

/** Give the armband to the official vice-captain in every week he counts: delta = (his points - the captain's) x (armband multiplier - 1). */
export function viceEveryWeek(allWeeks: WhatIfWeek[]): ViceResult {
  const rows: ViceRow[] = byWeek(allWeeks).map((w) => {
    const c = w.picks.find((p) => p.isCaptain);
    const v = w.picks.find((p) => p.isVice);
    const captain = c ? { id: c.id, name: c.name, points: ptsOf(w, c.id) } : null;
    const vice = v ? { id: v.id, name: v.name, points: ptsOf(w, v.id) } : null;
    const row = (status: ViceStatus, delta = 0): ViceRow => ({ gameweek: w.gameweek, status, captain, vice, delta });
    if (!v) return row("no-vice");
    if (!c) return row("no-captain");
    if (v.multiplier <= 0) return row("not-in-xi");
    return row("applied", (vice!.points - captain!.points) * (c.multiplier - 1));
  });
  return {
    scenario: "vice",
    rows,
    totals: {
      delta: rows.reduce((a, r) => a + r.delta, 0),
      weeksApplied: rows.filter((r) => r.status === "applied").length,
      weeksNotInXI: rows.filter((r) => r.status === "not-in-xi").length,
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Chips: were they worth it
// ---------------------------------------------------------------------------------------------------------------------

/** A chip's availability window (official `chips[]` in bootstrap-static: start_event..stop_event). */
export interface ChipWindow {
  name: string;
  start: number;
  stop: number;
}

export interface ChipRow {
  chip: "bboost" | "3xc";
  usedGameweek: number;
  /** Bench Boost: points scored by the original bench. Triple Captain: the captain's points (the extra multiple). */
  gain: number;
  /** The best week for this chip among finished gameweeks in the same window (the used week wins a tie). */
  best: { gameweek: number; gain: number };
  missed: number;
}

export interface ChipResult {
  scenario: "chips";
  chips: ChipRow[];
  totals: { gain: number; missed: number };
}

const chipGain = (w: WhatIfWeek, chip: "bboost" | "3xc") =>
  chip === "bboost"
    ? w.picks.filter((p) => !p.started).reduce((a, p) => a + ptsOf(w, p.id), 0)
    : (() => {
        const c = w.picks.find((p) => p.isCaptain);
        return c ? ptsOf(w, c.id) : 0;
      })();

/** For each Bench Boost / Triple Captain played, its gain against the best week available for that chip. Wildcard and Free Hit change the squad, not the multiples, so they are not evaluated. */
export function chipTiming(allWeeks: WhatIfWeek[], windows: ChipWindow[]): ChipResult {
  const weeks = byWeek(allWeeks);
  const chips: ChipRow[] = [];
  for (const used of weeks) {
    if (used.chip !== "bboost" && used.chip !== "3xc") continue;
    const chip = used.chip;
    const win = windows.find((x) => x.name === chip && x.start <= used.gameweek && used.gameweek <= x.stop);
    const gain = chipGain(used, chip);
    let best = { gameweek: used.gameweek, gain };
    for (const w of weeks) {
      if (w === used || (w.chip !== null && w.chip !== undefined)) continue;
      if (win && (w.gameweek < win.start || w.gameweek > win.stop)) continue;
      const g = chipGain(w, chip);
      if (g > best.gain) best = { gameweek: w.gameweek, gain: g };
    }
    chips.push({ chip, usedGameweek: used.gameweek, gain, best, missed: best.gain - gain });
  }
  return { scenario: "chips", chips, totals: { gain: chips.reduce((a, c) => a + c.gain, 0), missed: chips.reduce((a, c) => a + c.missed, 0) } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Hits: were they worth it
// ---------------------------------------------------------------------------------------------------------------------

export interface HitRow {
  gameweek: number;
  cost: number;
  bought: Array<{ id: number; name: string }>;
  sold: Array<{ id: number; name: string }>;
  /** Raw points the players bought / sold scored over the counted gameweeks, whether or not they started. */
  pointsBought: number;
  pointsSold: number;
  net: number;
  weeksCounted: number;
  /** Fewer gameweeks than the horizon have been played since the hit. */
  partial: boolean;
}

export interface HitsResult {
  scenario: "hits";
  horizon: number;
  rows: HitRow[];
  totals: { hits: number; cost: number; net: number; worthIt: number };
}

/** For every week a transfer cost was paid: points of the players bought versus sold over that gameweek and the next `horizon - 1`, net of the hit. */
export function hitsWorthIt(allWeeks: WhatIfWeek[], horizon = 4): HitsResult {
  const weeks = byWeek(allWeeks);
  const rows: HitRow[] = [];
  weeks.forEach((w, i) => {
    if (w.transferCost <= 0) return;
    // The squad before this week's transfers: the latest earlier week that was not a Free Hit (a Free Hit squad is temporary).
    const prev = [...weeks.slice(0, i)].reverse().find((x) => x.chip !== "freehit");
    if (!prev) return;
    const prevIds = new Set(prev.picks.map((p) => p.id));
    const nowIds = new Set(w.picks.map((p) => p.id));
    const bought = w.picks.filter((p) => !prevIds.has(p.id)).map((p) => ({ id: p.id, name: p.name }));
    const sold = prev.picks.filter((p) => !nowIds.has(p.id)).map((p) => ({ id: p.id, name: p.name }));
    const counted = weeks.filter((x) => x.gameweek >= w.gameweek && x.gameweek < w.gameweek + horizon);
    const total = (players: Array<{ id: number }>) => counted.reduce((a, x) => a + players.reduce((b, p) => b + ptsOf(x, p.id), 0), 0);
    const pointsBought = total(bought);
    const pointsSold = total(sold);
    rows.push({
      gameweek: w.gameweek,
      cost: w.transferCost,
      bought,
      sold,
      pointsBought,
      pointsSold,
      net: pointsBought - pointsSold - w.transferCost,
      weeksCounted: counted.length,
      partial: counted.length < horizon,
    });
  });
  return {
    scenario: "hits",
    horizon,
    rows,
    totals: {
      hits: rows.length,
      cost: rows.reduce((a, r) => a + r.cost, 0),
      net: rows.reduce((a, r) => a + r.net, 0),
      worthIt: rows.filter((r) => r.net > 0).length,
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Form captain: last week's top scorer wears the armband
// ---------------------------------------------------------------------------------------------------------------------

export type FormCaptainStatus = "applied" | "already" | "no-previous" | "no-captain";

export interface FormCaptainRow {
  gameweek: number;
  status: FormCaptainStatus;
  /** The player who would have worn the armband (last gameweek's top scorer among those counted this week), with this week's points. */
  player: { id: number; name: string; points: number; previousPoints: number } | null;
  captain: { id: number; name: string; points: number } | null;
  delta: number;
}

export interface FormCaptainResult {
  scenario: "form-captain";
  rows: FormCaptainRow[];
  totals: { delta: number; weeksApplied: number; weeksAlready: number };
}

/** Each week the armband goes to the player in your counted XI who scored most in the previous gameweek (ties: lower id). */
export function formCaptain(allWeeks: WhatIfWeek[]): FormCaptainResult {
  const weeks = byWeek(allWeeks);
  const rows: FormCaptainRow[] = weeks.map((w) => {
    const c = w.picks.find((p) => p.isCaptain);
    const captain = c ? { id: c.id, name: c.name, points: ptsOf(w, c.id) } : null;
    const prev = weeks.find((x) => x.gameweek === w.gameweek - 1);
    const row = (status: FormCaptainStatus, player: FormCaptainRow["player"] = null, delta = 0): FormCaptainRow => ({ gameweek: w.gameweek, status, player, captain, delta });
    if (!prev) return row("no-previous");
    const candidates = w.picks.filter((p) => p.multiplier > 0);
    if (candidates.length === 0) return row("no-captain");
    const top = [...candidates].sort((a, b) => ptsOf(prev, b.id) - ptsOf(prev, a.id) || a.id - b.id)[0];
    const player = { id: top.id, name: top.name, points: ptsOf(w, top.id), previousPoints: ptsOf(prev, top.id) };
    if (!c) return row("no-captain", player);
    if (top.isCaptain) return row("already", player);
    return row("applied", player, (player.points - captain!.points) * (c.multiplier - 1));
  });
  const count = (s: FormCaptainStatus) => rows.filter((r) => r.status === s).length;
  return { scenario: "form-captain", rows, totals: { delta: rows.reduce((a, r) => a + r.delta, 0), weeksApplied: count("applied"), weeksAlready: count("already") } };
}

// ---------------------------------------------------------------------------------------------------------------------
// No Wildcard / no Free Hit
// ---------------------------------------------------------------------------------------------------------------------

export interface NoChipRow {
  gameweek: number;
  /** Best possible XI (no chip) from the squad actually held that week. */
  actualBest: number;
  /** Best possible XI (no chip) from the squad held before the chip. */
  fixedBest: number;
  /** fixedBest - actualBest: positive means keeping the old squad would have scored more. */
  delta: number;
}

export interface NoChipEntry {
  gameweek: number;
  /** The gameweek whose squad is kept. */
  squadFrom: number;
  rows: NoChipRow[];
  /** Fewer gameweeks than the horizon have been played since the chip. */
  partial: boolean;
  totals: { delta: number };
}

export interface NoChipResult {
  scenario: "wildcard" | "freehit";
  horizon: number;
  chips: NoChipEntry[];
  totals: { delta: number };
}

/** For each Wildcard / Free Hit: keep the squad held the week before it (latest earlier non-Free-Hit week) for the chip week and the next `horizon - 1`. */
export function noChip(allWeeks: WhatIfWeek[], chip: "wildcard" | "freehit", horizon: number): NoChipResult {
  const weeks = byWeek(allWeeks);
  const best = (squad: Array<{ id: number; elementType: 1 | 2 | 3 | 4 }>, w: WhatIfWeek) =>
    bestPossible(squad.map((p) => ({ id: p.id, elementType: p.elementType, points: ptsOf(w, p.id) })), null).total;

  const chips: NoChipEntry[] = [];
  weeks.forEach((w, i) => {
    if (w.chip !== chip) return;
    const prev = [...weeks.slice(0, i)].reverse().find((x) => x.chip !== "freehit");
    if (!prev) return;
    const window = weeks.filter((x) => x.gameweek >= w.gameweek && x.gameweek < w.gameweek + horizon);
    const rows: NoChipRow[] = window.map((x) => {
      const actualBest = best(x.picks, x);
      const fixedBest = best(prev.picks, x);
      return { gameweek: x.gameweek, actualBest, fixedBest, delta: fixedBest - actualBest };
    });
    chips.push({ gameweek: w.gameweek, squadFrom: prev.gameweek, rows, partial: rows.length < horizon, totals: { delta: rows.reduce((a, r) => a + r.delta, 0) } });
  });
  return { scenario: chip, horizon, chips, totals: { delta: chips.reduce((a, c) => a + c.totals.delta, 0) } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Stop rotating (any position)
// ---------------------------------------------------------------------------------------------------------------------

export type RotationPosition = "GKP" | "DEF" | "MID" | "FWD";
export type RotationStatus = "same" | "changed" | "bench-boost";

export interface RotationRow {
  gameweek: number;
  status: RotationStatus;
  /** The players of this position you started (captain excluded). */
  started: Array<{ id: number; name: string; points: number }>;
  /** The players you would have started instead. */
  instead: Array<{ id: number; name: string; points: number }>;
  delta: number;
}

export interface RotationResult {
  scenario: "rotation";
  position: RotationPosition;
  /** Players of this position you started, most weeks first. */
  core: Array<{ id: number; name: string; weeks: number }>;
  rows: RotationRow[];
  totals: { delta: number; weeksChanged: number };
}

const POSITION_CODE: Record<RotationPosition, 1 | 2 | 3 | 4> = { GKP: 1, DEF: 2, MID: 3, FWD: 4 };

/** Every week field the position's most-started players (as many as you started, captain left alone) instead of your actual picks. */
export function stopRotating(allWeeks: WhatIfWeek[], position: RotationPosition): RotationResult | null {
  const weeks = byWeek(allWeeks);
  const code = POSITION_CODE[position];

  const counts = new Map<number, { id: number; name: string; weeks: number }>();
  for (const w of weeks) {
    if (w.chip === "bboost") continue;
    for (const p of w.picks) {
      if (p.elementType !== code || !p.started) continue;
      const c = counts.get(p.id) ?? { id: p.id, name: p.name, weeks: 0 };
      c.weeks++;
      counts.set(p.id, c);
    }
  }
  if (counts.size === 0) return null;
  const core = [...counts.values()].sort((a, b) => b.weeks - a.weeks || a.id - b.id);
  const startedWeeks = (id: number) => counts.get(id)?.weeks ?? 0;

  const view = (w: WhatIfWeek) => (p: WhatIfPick) => ({ id: p.id, name: p.name, points: ptsOf(w, p.id) });
  const rows: RotationRow[] = weeks.map((w) => {
    if (w.chip === "bboost") return { gameweek: w.gameweek, status: "bench-boost", started: [], instead: [], delta: 0 };
    const actual = w.picks.filter((p) => p.elementType === code && p.started && !p.isCaptain);
    const pool = w.picks.filter((p) => p.elementType === code && !p.isCaptain);
    const chosen = [...pool].sort((a, b) => startedWeeks(b.id) - startedWeeks(a.id) || a.id - b.id).slice(0, actual.length);
    const actualIds = new Set(actual.map((p) => p.id));
    const same = chosen.every((p) => actualIds.has(p.id));
    const total = (ps: WhatIfPick[]) => ps.reduce((a, p) => a + ptsOf(w, p.id), 0);
    return {
      gameweek: w.gameweek,
      status: same ? "same" : "changed",
      started: actual.map(view(w)),
      instead: chosen.map(view(w)),
      delta: same ? 0 : total(chosen) - total(actual),
    };
  });

  return {
    scenario: "rotation",
    position,
    core,
    rows,
    totals: { delta: rows.reduce((a, r) => a + r.delta, 0), weeksChanged: rows.filter((r) => r.status === "changed").length },
  };
}

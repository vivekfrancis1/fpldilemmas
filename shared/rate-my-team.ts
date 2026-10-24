// Rate My Team: measurable facts about a squad, built from the same cached xPts the Points page shows.
// The team rating is your projected points as a percentage of the best squad we can build within your budget
// (bestSquad). That squad comes from a search, not an exact solver, so the rating is "against the best squad
// we found" and the search always starts from your own squad, which keeps it at or below 100%.
// Everything else is exact arithmetic on the projections or a fact from FPL.
import { bestLineup, type LineupPlayer } from "./lineup";
import { fixturesForGameweeks, teamsWithUnscheduledFixtures, type CompareFixtureInput } from "./compare-utils";

export interface RmtPlayer {
  id: number;
  name?: string;
  elementType: 1 | 2 | 3 | 4;
  team: number;
  /** Current price in tenths of a million (55 = £5.5m). */
  price: number;
  status: string;
  chanceOfPlayingNextRound: number | null;
  news: string;
}

type XPtsMap = Map<number, Record<string, number>>;

const xPtsFor = (map: XPtsMap, id: number, gw: number): number | null => {
  const v = map.get(id)?.[String(gw)];
  return typeof v === "number" ? v : null;
};

const toLineup = (squad: RmtPlayer[], map: XPtsMap, gw: number): LineupPlayer[] =>
  squad.map((p) => ({ id: p.id, elementType: p.elementType, xPts: xPtsFor(map, p.id, gw) }));

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface HorizonProjection {
  gameweeks: number[];
  perGameweek: Array<{ gameweek: number; total: number; captainId: number | null; startingIds: number[]; benchTotal: number }>;
  total: number;
  benchTotal: number;
}

/** Best XI + captain for each gameweek, summed. A player with no projection that week contributes 0. */
export function horizonProjection(squad: RmtPlayer[], xPtsByPlayer: XPtsMap, gameweeks: number[]): HorizonProjection {
  const perGameweek = gameweeks.map((gameweek) => {
    const lineup = bestLineup(toLineup(squad, xPtsByPlayer, gameweek));
    return {
      gameweek,
      total: lineup.total,
      captainId: lineup.captainId,
      startingIds: lineup.starting.map((p) => p.id),
      benchTotal: lineup.benchTotal,
    };
  });
  return {
    gameweeks,
    perGameweek,
    total: perGameweek.reduce((s, g) => s + g.total, 0),
    benchTotal: perGameweek.reduce((s, g) => s + g.benchTotal, 0),
  };
}

export interface FieldRank {
  /** 1 = would top the field. Squads that score exactly the same do not outrank the user. null for an empty field. */
  rank: number | null;
  fieldSize: number;
  average: number | null;
  best: number | null;
}

export function rankAmongField(userTotal: number, fieldTotals: number[]): FieldRank {
  if (fieldTotals.length === 0) return { rank: null, fieldSize: 0, average: null, best: null };
  const above = fieldTotals.filter((t) => t > userTotal).length;
  return {
    rank: above + 1,
    fieldSize: fieldTotals.length,
    average: round2(fieldTotals.reduce((a, b) => a + b, 0) / fieldTotals.length),
    best: Math.max(...fieldTotals),
  };
}

export interface Upgrade {
  outId: number;
  inId: number;
  /** New horizon total minus current horizon total (best XI + captain recomputed). Always > 0. */
  gain: number;
  newTotal: number;
  /** Replacement price minus the selling price of the player going out, in tenths (negative = frees money). */
  priceDelta: number;
  outHorizonXPts: number;
  inHorizonXPts: number;
}

const UNAVAILABLE = new Set(["i", "s", "u", "n"]);
const MAX_PER_CLUB = 3;

const horizonSum = (map: XPtsMap, id: number, gws: number[]) =>
  gws.reduce((s, gw) => s + (xPtsFor(map, id, gw) ?? 0), 0);

/**
 * For every squad player, the best single same-position replacement: not already owned, not injured/suspended/
 * unavailable, price <= selling price + bank, and the 3-per-club rule still holds for the rest of the squad.
 * Ranked by gain in the squad's horizon projection. Each row is an alternative, not additive with the others.
 */
export function findUpgrades(input: {
  squad: RmtPlayer[];
  pool: RmtPlayer[];
  xPtsByPlayer: XPtsMap;
  gameweeks: number[];
  /** Money in the bank, tenths. */
  bank: number;
  /** The manager's real selling prices where known (tenths); otherwise the current price is used. */
  sellingPrices?: Map<number, number>;
  topN?: number;
}): Upgrade[] {
  const { squad, pool, xPtsByPlayer, gameweeks, bank, sellingPrices, topN = 5 } = input;
  const base = horizonProjection(squad, xPtsByPlayer, gameweeks).total;
  const owned = new Set(squad.map((p) => p.id));
  const clubCounts = new Map<number, number>();
  for (const p of squad) clubCounts.set(p.team, (clubCounts.get(p.team) ?? 0) + 1);

  const results: Upgrade[] = [];
  for (const out of squad) {
    const sell = sellingPrices?.get(out.id) ?? out.price;
    const budget = sell + bank;
    const outSum = horizonSum(xPtsByPlayer, out.id, gameweeks);
    let best: { row: Upgrade; cand: RmtPlayer } | null = null;

    for (const cand of pool) {
      if (cand.elementType !== out.elementType || owned.has(cand.id) || UNAVAILABLE.has(cand.status)) continue;
      if (cand.price > budget) continue;
      const clubAfter = (clubCounts.get(cand.team) ?? 0) - (cand.team === out.team ? 1 : 0) + 1;
      if (clubAfter > MAX_PER_CLUB) continue;
      // The lineup total never decreases when a player's xPts rise, so a candidate that is no better
      // than the player leaving in every gameweek cannot produce a gain; skip the recomputation.
      if (!gameweeks.some((gw) => (xPtsFor(xPtsByPlayer, cand.id, gw) ?? 0) > (xPtsFor(xPtsByPlayer, out.id, gw) ?? 0))) continue;

      const next = squad.map((p) => (p.id === out.id ? cand : p));
      const newTotal = horizonProjection(next, xPtsByPlayer, gameweeks).total;
      const gain = newTotal - base;
      if (gain <= 1e-9) continue;
      const row: Upgrade = {
        outId: out.id,
        inId: cand.id,
        gain,
        newTotal,
        priceDelta: cand.price - sell,
        outHorizonXPts: outSum,
        inHorizonXPts: horizonSum(xPtsByPlayer, cand.id, gameweeks),
      };
      // best gain wins; on a tie the cheaper player, then the lower id
      const better =
        !best ||
        row.gain > best.row.gain ||
        (row.gain === best.row.gain && (cand.price < best.cand.price || (cand.price === best.cand.price && cand.id < best.cand.id)));
      if (better) best = { row, cand };
    }
    if (best) results.push(best.row);
  }

  return results.sort((a, b) => b.gain - a.gain || a.outId - b.outId).slice(0, topN);
}

export interface SquadFlags {
  availability: Array<{ playerId: number; name: string; status: string; chanceOfPlayingNextRound: number | null; news: string }>;
  blanks: Array<{ playerId: number; name: string; gameweeks: number[] }>;
  doubles: Array<{ playerId: number; name: string; gameweeks: number[] }>;
  /** No fixture that gameweek but the club has an unscheduled one: not a confirmed blank. */
  tbc: Array<{ playerId: number; name: string; gameweeks: number[] }>;
}

/** Plain facts from FPL: availability status/chance, and blank/double gameweeks from the official fixtures. */
export function squadFlags(input: { squad: RmtPlayer[]; fixtures: CompareFixtureInput[]; gameweeks: number[] }): SquadFlags {
  const { squad, fixtures, gameweeks } = input;
  const availability = squad
    .filter((p) => p.status !== "a" || (p.chanceOfPlayingNextRound !== null && p.chanceOfPlayingNextRound < 100))
    .map((p) => ({
      playerId: p.id,
      name: p.name ?? "",
      status: p.status,
      chanceOfPlayingNextRound: p.chanceOfPlayingNextRound,
      news: p.news,
    }));

  const blanks: SquadFlags["blanks"] = [];
  const doubles: SquadFlags["doubles"] = [];
  const tbc: SquadFlags["tbc"] = [];
  const tbcTeams = teamsWithUnscheduledFixtures(fixtures);
  for (const p of squad) {
    const perGw = fixturesForGameweeks(p.team, fixtures, gameweeks);
    const blank = perGw.filter((g) => g.fixtures.length === 0).map((g) => g.gameweek);
    const dbl = perGw.filter((g) => g.fixtures.length > 1).map((g) => g.gameweek);
    if (blank.length) (tbcTeams.has(p.team) ? tbc : blanks).push({ playerId: p.id, name: p.name ?? "", gameweeks: blank });
    if (dbl.length) doubles.push({ playerId: p.id, name: p.name ?? "", gameweeks: dbl });
  }
  return { availability, blanks, doubles, tbc };
}


/** Your projected points as a whole percent of the optimal squad's, 0 to 100. null when there is no optimal total to compare with. */
export function teamRating(yourTotal: number, optimalTotal: number): number | null {
  if (!(optimalTotal > 0)) return null;
  return Math.max(0, Math.min(100, Math.round((yourTotal / optimalTotal) * 100)));
}

export interface BestSquadResult {
  squad: RmtPlayer[];
  /** Horizon total (best XI + captain per gameweek, summed) of that squad. */
  total: number;
}

/**
 * The best legal squad we can find within a budget: 2 GKP, 5 DEF, 5 MID, 3 FWD, at most 3 per club, total price
 * <= budget, scored by horizonProjection (so the bench and the captain count the way they do for your own squad).
 * Hill-climbing from each start squad (pass the manager's own squad, plus any other good starting point):
 * best single swap until none helps, then pair swaps among the most promising candidates (a pair sells one player
 * down to afford another's upgrade), until neither helps or the time limit passes. Never worse than the best start.
 * Injured, suspended and unavailable players are never brought in.
 */
export function bestSquad(input: {
  starts: RmtPlayer[][];
  pool: RmtPlayer[];
  xPtsByPlayer: XPtsMap;
  gameweeks: number[];
  /** Tenths of a million. */
  budget: number;
  /** Stop searching for pair swaps after this long (default 3000 ms). Single swaps always finish. */
  timeLimitMs?: number;
}): BestSquadResult {
  const { starts, pool, xPtsByPlayer, gameweeks, budget, timeLimitMs = 3000 } = input;
  const deadline = Date.now() + timeLimitMs;
  const total = (sq: RmtPlayer[]) => horizonProjection(sq, xPtsByPlayer, gameweeks).total;
  const sumOf = (p: RmtPlayer) => horizonSum(xPtsByPlayer, p.id, gameweeks);
  const eligible = pool.filter((p) => !UNAVAILABLE.has(p.status));
  const byType = (t: number) => eligible.filter((p) => p.elementType === t);

  const clubsOk = (sq: RmtPlayer[]) => {
    const n = new Map<number, number>();
    for (const p of sq) n.set(p.team, (n.get(p.team) ?? 0) + 1);
    return Array.from(n.values()).every((c) => c <= MAX_PER_CLUB);
  };
  const cost = (sq: RmtPlayer[]) => sq.reduce((s, p) => s + p.price, 0);

  // The most promising outsiders per position: best by horizon points, plus best points per £ (the players who free money)
  const shortlist = (t: number, owned: Set<number>) => {
    const free = byType(t).filter((p) => !owned.has(p.id));
    const byPts = [...free].sort((a, b) => sumOf(b) - sumOf(a) || a.id - b.id).slice(0, 12);
    const byValue = [...free].sort((a, b) => sumOf(b) / Math.max(b.price, 1) - sumOf(a) / Math.max(a.price, 1) || a.id - b.id).slice(0, 12);
    return Array.from(new Map([...byPts, ...byValue].map((p) => [p.id, p])).values());
  };

  const climb = (start: RmtPlayer[]): BestSquadResult => {
    let squad = [...start];
    let current = total(squad);

    for (;;) {
      // 1) best single swap (same position, within budget, club cap holds)
      let bestNext: RmtPlayer[] | null = null;
      let bestTotal = current + 1e-9;
      const owned = new Set(squad.map((p) => p.id));
      const spent = cost(squad);
      for (let i = 0; i < squad.length; i++) {
        const out = squad[i];
        for (const cand of byType(out.elementType)) {
          if (owned.has(cand.id) || spent - out.price + cand.price > budget) continue;
          if (!gameweeks.some((gw) => (xPtsFor(xPtsByPlayer, cand.id, gw) ?? 0) > (xPtsFor(xPtsByPlayer, out.id, gw) ?? 0))) continue;
          const next = squad.map((p, k) => (k === i ? cand : p));
          if (!clubsOk(next)) continue;
          const t = total(next);
          if (t > bestTotal) {
            bestTotal = t;
            bestNext = next;
          }
        }
      }
      if (bestNext) {
        squad = bestNext;
        current = bestTotal;
        continue;
      }

      // 2) pair swaps: rank every affordable pair by a cheap estimate (change in horizon points), then score the best few for real
      if (Date.now() >= deadline) break;
      const ownedNow = new Set(squad.map((p) => p.id));
      const spentNow = cost(squad);
      const shortlists = new Map<number, RmtPlayer[]>([1, 2, 3, 4].map((t) => [t, shortlist(t, ownedNow)] as const));
      const moves: Array<{ est: number; i: number; j: number; a: RmtPlayer; b: RmtPlayer }> = [];
      for (let i = 0; i < squad.length; i++) {
        for (let j = i + 1; j < squad.length; j++) {
          const oi = squad[i];
          const oj = squad[j];
          const listA = shortlists.get(oi.elementType)!;
          const listB = shortlists.get(oj.elementType)!;
          for (const a of listA) {
            for (const b of listB) {
              if (a.id === b.id) continue;
              if (spentNow - oi.price - oj.price + a.price + b.price > budget) continue;
              const est = sumOf(a) + sumOf(b) - sumOf(oi) - sumOf(oj);
              if (est <= 0) continue;
              moves.push({ est, i, j, a, b });
            }
          }
        }
      }
      moves.sort((x, y) => y.est - x.est);
      let bestPair: RmtPlayer[] | null = null;
      let bestPairTotal = current + 1e-9;
      for (const m of moves.slice(0, 250)) {
        if (Date.now() >= deadline) break;
        const next = squad.map((p, k) => (k === m.i ? m.a : k === m.j ? m.b : p));
        if (!clubsOk(next)) continue;
        const t = total(next);
        if (t > bestPairTotal) {
          bestPairTotal = t;
          bestPair = next;
        }
      }
      if (!bestPair) break;
      squad = bestPair;
      current = bestPairTotal;
    }
    return { squad, total: current };
  };

  let best: BestSquadResult | null = null;
  for (const start of starts) {
    if (start.length !== 15) continue;
    const result = climb(start);
    if (!best || result.total > best.total) best = result;
  }
  return best ?? { squad: [], total: 0 };
}

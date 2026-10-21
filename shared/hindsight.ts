// Hindsight: the best a manager could have scored from the SAME 15 players in a finished gameweek, using each
// player's final points. Pure arithmetic on official points; the chip rules are Bench Boost (all 15 count),
// Triple Captain (captain x3), otherwise a legal XI with the captain doubled. Wildcard / Free Hit don't change scoring.
import { bestLineup } from "./lineup";

export interface HindsightPick {
  id: number;
  elementType: 1 | 2 | 3 | 4;
  /** The player's final points that gameweek. */
  points: number;
}

export type HindsightChip = "bboost" | "3xc" | "freehit" | "wildcard" | "manager" | null | undefined | string;

export interface BestPossible<T extends HindsightPick> {
  starting: T[];
  bench: T[];
  captainId: number | null;
  captainMultiplier: 2 | 3;
  total: number;
  /** e.g. "3-4-3"; null under Bench Boost. */
  formation: string | null;
  /** false when fewer than 11 suitable players were supplied. */
  complete: boolean;
}

const rank = (a: HindsightPick, b: HindsightPick) => b.points - a.points || a.id - b.id;

export function bestPossible<T extends HindsightPick>(players: T[], chip: HindsightChip): BestPossible<T> {
  if (chip === "bboost") {
    if (players.length < 11) {
      return { starting: [], bench: [...players].sort(rank), captainId: null, captainMultiplier: 2, total: 0, formation: null, complete: false };
    }
    const sorted = [...players].sort(rank);
    const captain = sorted[0];
    return {
      starting: sorted,
      bench: [],
      captainId: captain.id,
      captainMultiplier: 2,
      total: sorted.reduce((s, p) => s + p.points, 0) + captain.points,
      formation: null,
      complete: true,
    };
  }

  const lineup = bestLineup(players.map((p) => ({ id: p.id, elementType: p.elementType, xPts: p.points })));
  const byId = new Map(players.map((p) => [p.id, p]));
  const starting = lineup.starting.map((p) => byId.get(p.id)!);
  const bench = lineup.bench.map((p) => byId.get(p.id)!);
  if (!lineup.complete) {
    return { starting: [], bench: [...players].sort(rank), captainId: null, captainMultiplier: 2, total: 0, formation: null, complete: false };
  }

  const captainMultiplier = chip === "3xc" ? 3 : 2;
  const captainPoints = byId.get(lineup.captainId!)!.points;
  const n = (t: number) => starting.filter((p) => p.elementType === t).length;
  return {
    starting,
    bench,
    captainId: lineup.captainId,
    captainMultiplier,
    // lineup.total already counts the captain twice; Triple Captain adds one more
    total: lineup.total + (captainMultiplier === 3 ? captainPoints : 0),
    formation: `${n(2)}-${n(3)}-${n(4)}`,
    complete: true,
  };
}

// Best starting XI + captain for one gameweek from a 15-player squad and each player's xPts.
// This is the same formation search My Dashboard has always used (try every legal formation with
// the top-N of each position, keep the highest total, captain = best player in the XI counted twice),
// written once here so Rate My Team doesn't add a fourth copy. tests/lineup.test.ts pins it to that
// original algorithm.

export interface LineupPlayer {
  id: number;
  /** 1 = GKP, 2 = DEF, 3 = MID, 4 = FWD */
  elementType: 1 | 2 | 3 | 4;
  /** Expected points that gameweek; null = no projection (e.g. no fixture), treated as 0 but ranked below a real 0. */
  xPts: number | null;
}

export interface BestLineup {
  starting: LineupPlayer[];
  /** Reserve keeper first, then outfield by xPts. */
  bench: LineupPlayer[];
  captainId: number | null;
  /** Sum of the XI's xPts plus the captain's xPts a second time. 0 when no legal XI exists. */
  total: number;
  benchTotal: number;
  /** false when the squad can't field a legal XI (fewer than 11 suitable players). */
  complete: boolean;
}

const value = (p: LineupPlayer) => p.xPts ?? 0;
// Highest xPts first; at equal value a real projection beats a missing one; then lower id.
const rank = (a: LineupPlayer, b: LineupPlayer) =>
  value(b) - value(a) || Number(a.xPts === null) - Number(b.xPts === null) || a.id - b.id;

export function bestLineup(players: LineupPlayer[]): BestLineup {
  const by = (t: number) => players.filter((p) => p.elementType === t).sort(rank);
  const gkps = by(1);
  const defs = by(2);
  const mids = by(3);
  const fwds = by(4);

  let best: LineupPlayer[] = [];
  let bestTotal = -1;
  for (let nd = 3; nd <= 5; nd++) {
    for (let nm = 2; nm <= 5; nm++) {
      for (let nf = 1; nf <= 3; nf++) {
        if (nd + nm + nf !== 10) continue;
        if (nd > defs.length || nm > mids.length || nf > fwds.length || gkps.length < 1) continue;
        const candidate = [gkps[0], ...defs.slice(0, nd), ...mids.slice(0, nm), ...fwds.slice(0, nf)];
        const total = candidate.reduce((s, p) => s + value(p), 0);
        if (total > bestTotal) {
          bestTotal = total;
          best = candidate;
        }
      }
    }
  }

  if (best.length === 0) {
    return { starting: [], bench: [...players].sort(rank), captainId: null, total: 0, benchTotal: 0, complete: false };
  }

  const captain = [...best].sort(rank)[0];
  const startingIds = new Set(best.map((p) => p.id));
  const rest = players.filter((p) => !startingIds.has(p.id));
  const bench = [
    ...rest.filter((p) => p.elementType === 1).sort(rank),
    ...rest.filter((p) => p.elementType !== 1).sort(rank),
  ];

  return {
    starting: best,
    bench,
    captainId: captain.id,
    total: bestTotal + value(captain),
    benchTotal: bench.reduce((s, p) => s + value(p), 0),
    complete: true,
  };
}

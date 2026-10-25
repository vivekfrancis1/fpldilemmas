// Hindsight over a whole season: sums of the per-gameweek hindsight numbers (see shared/hindsight.ts). Pure arithmetic on
// official points; nothing is estimated and no grade is given.

export interface SeasonRow {
  gameweek: number;
  chip: string | null;
  officialPoints: number;
  transferCost: number;
  pointsOnBench: number;
  bestPossible: number;
  /** 2, or 3 under Triple Captain. */
  captainMultiplier: 2 | 3;
  captain: {
    chosen: { id: number; name: string; points: number } | null;
    best: { id: number; name: string; points: number } | null;
  };
}

export interface SeasonSummaryRow extends SeasonRow {
  gap: number;
  /** Chosen captain scored as much as the best captain in the squad (ties count); null when no captain is on record. */
  captainHit: boolean | null;
  /** Extra points the armband missed: (best captain's points - chosen's) x (multiplier - 1). */
  captainCost: number;
}

export interface SeasonSummary {
  gameweeks: number;
  rows: SeasonSummaryRow[];
  totals: {
    officialPoints: number;
    bestPossible: number;
    gap: number;
    pointsOnBench: number;
    transferCost: number;
    /** officialPoints / bestPossible, as a percentage; 0 when there is nothing to compare. */
    efficiencyPct: number;
  };
  captaincy: { gameweeks: number; hits: number; pointsLost: number };
  biggestGap: { gameweek: number; gap: number } | null;
  smallestGap: { gameweek: number; gap: number } | null;
  chips: Array<{ gameweek: number; chip: string }>;
}

export function summarizeSeason(input: SeasonRow[]): SeasonSummary {
  const rows: SeasonSummaryRow[] = [...input]
    .sort((a, b) => a.gameweek - b.gameweek)
    .map((r) => {
      const { chosen, best } = r.captain;
      const counted = !!chosen && !!best;
      return {
        ...r,
        gap: r.bestPossible - r.officialPoints,
        captainHit: counted ? chosen!.points >= best!.points : null,
        captainCost: counted ? Math.max(0, best!.points - chosen!.points) * (r.captainMultiplier - 1) : 0,
      };
    });

  const sum = (pick: (r: SeasonSummaryRow) => number) => rows.reduce((a, r) => a + pick(r), 0);
  const officialPoints = sum((r) => r.officialPoints);
  const bestPossible = sum((r) => r.bestPossible);

  // Strict comparisons keep the earliest gameweek on a tie (rows are in gameweek order).
  let biggest: SeasonSummaryRow | null = null;
  let smallest: SeasonSummaryRow | null = null;
  for (const r of rows) {
    if (!biggest || r.gap > biggest.gap) biggest = r;
    if (!smallest || r.gap < smallest.gap) smallest = r;
  }

  return {
    gameweeks: rows.length,
    rows,
    totals: {
      officialPoints,
      bestPossible,
      gap: bestPossible - officialPoints,
      pointsOnBench: sum((r) => r.pointsOnBench),
      transferCost: sum((r) => r.transferCost),
      efficiencyPct: bestPossible > 0 ? (officialPoints / bestPossible) * 100 : 0,
    },
    captaincy: {
      gameweeks: rows.filter((r) => r.captainHit !== null).length,
      hits: rows.filter((r) => r.captainHit === true).length,
      pointsLost: sum((r) => r.captainCost),
    },
    biggestGap: biggest && { gameweek: biggest.gameweek, gap: biggest.gap },
    smallestGap: smallest && { gameweek: smallest.gameweek, gap: smallest.gap },
    chips: rows.filter((r) => r.chip).map((r) => ({ gameweek: r.gameweek, chip: r.chip as string })),
  };
}

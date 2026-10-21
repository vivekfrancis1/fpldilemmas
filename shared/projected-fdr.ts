// "Projected" view for the Fixtures page: shows OUR per-fixture numbers (projected goals for the team = how
// attack-friendly the fixture is; clean-sheet chance = how defence-friendly) instead of an invented 1-5 rating.
// Colour is a plain rank rule: quintiles of the fixtures currently on screen (top 20% = tier 1 = easiest).

export type ProjectedKind = "attack" | "defence";

export interface ProjectionFixtureDetail {
  opponent: string;
  isHome: boolean;
  goals?: number;
  cleanSheetOdds?: number;
  source?: string;
}

export interface ProjectionRow {
  teamId: number;
  fixtureDetails: Record<string, ProjectionFixtureDetail[]>;
}

/**
 * Tier 1 (easiest) to 5 (hardest) by rank among `values`: the number of values strictly better (higher) than
 * this one decides the quintile, so ties share the better tier. Fewer than five values cannot form quintiles,
 * so everything is neutral (3).
 */
export function quintileTier(values: number[], value: number): 1 | 2 | 3 | 4 | 5 {
  const n = values.length;
  if (n < 5) return 3;
  const better = values.filter((v) => v > value).length;
  return (Math.min(4, Math.floor((better * 5) / n)) + 1) as 1 | 2 | 3 | 4 | 5;
}

/** One fixture's projected value for a team in a gameweek, matched by opponent and venue. null if we don't have it. */
export function lookupProjected(
  rowsByTeamId: Map<number, ProjectionRow>,
  teamId: number,
  gameweek: number,
  opponentShort: string,
  isHome: boolean,
  kind: ProjectedKind,
): { value: number; source: string | undefined } | null {
  const detail = rowsByTeamId
    .get(teamId)
    ?.fixtureDetails?.[String(gameweek)]?.find((d) => d.opponent === opponentShort && d.isHome === isHome);
  if (!detail) return null;
  const value = kind === "attack" ? detail.goals : detail.cleanSheetOdds;
  return typeof value === "number" ? { value, source: detail.source } : null;
}

export function formatProjected(kind: ProjectedKind, value: number): string {
  return kind === "attack" ? value.toFixed(1) : `${Math.round(value)}%`;
}

export function meanOf(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

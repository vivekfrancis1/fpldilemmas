/** True once a fixture's 90 minutes are over, even before FPL confirms bonus points. FPL's own
 * `finished` flag stays false for a while after full time (often ~1hr+) while bonus is being
 * finalized; `finished_provisional` flips the moment the match itself ends and is what "has this
 * team/player actually played" should key off, not the bureaucratic bonus-confirmation delay. */
export function isFixtureActuallyOver(fixture: { finished?: boolean; finished_provisional?: boolean }): boolean {
  return !!(fixture.finished || fixture.finished_provisional);
}

/** The matches the live table is built from: over (even before FPL confirms bonus points) and with a score. */
export function completedFixtures<T extends { finished?: boolean; finished_provisional?: boolean; team_h_score?: number | null; team_a_score?: number | null }>(fixtures: T[]): T[] {
  return fixtures.filter((f) => isFixtureActuallyOver(f) && f.team_h_score !== null && f.team_h_score !== undefined && f.team_a_score !== null && f.team_a_score !== undefined);
}

/**
 * The per-match stats cache (cards, saves, xG...) holds one fetch per gameweek. It can be reused while fresh, but only if it
 * already tried every gameweek the table now needs: the first match of a gameweek to end would otherwise be missing its stats
 * until the cache expired.
 */
export function xgfCacheUsable(cache: { timestamp: number; requested: Set<number> } | null, wanted: Iterable<number>, now: number, maxAgeMs: number): boolean {
  if (!cache || now - cache.timestamp >= maxAgeMs) return false;
  for (const gw of wanted) if (!cache.requested.has(gw)) return false;
  return true;
}

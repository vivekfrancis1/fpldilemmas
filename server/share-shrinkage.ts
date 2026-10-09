// Small-sample shrinkage for goal/assist share. A player with only a few minutes (e.g. a
// substitute with one goal in 117 minutes) has a per-minute rate that is mostly noise; blending
// it toward his same-position teammates' pooled rate stops that noise from being scaled up
// when reallocation hands him a starter's minutes. Full weight on his own rate is reached at
// MIN_RELIABLE_MINUTES (4 full games). The shrunk rate is also capped at that pooled
// teammate rate, so a short-cameo player can never project above the teammates he covers for.
export const MIN_RELIABLE_MINUTES = 360;

export interface ShareInput {
  id: number;
  position: number; // element_type
  minutes: number;
  combined: number; // 0.5×goals + 0.5×xG (or the assist equivalent)
}

// Returns each player's adjusted `combined`. By default rescaled so the team total is unchanged
// (right for shares of a fixed pie); pass conserveTotal:false for per-player quantities like
// bonus points, where there is no fixed total to redistribute.
export function shrinkCombinedByMinutes(
  players: ShareInput[],
  options: { conserveTotal?: boolean } = {}
): Map<number, number> {
  const conserveTotal = options.conserveTotal ?? true;
  const result = new Map<number, number>();
  const originalTotal = players.reduce((s, p) => s + p.combined, 0);

  for (const p of players) {
    if (p.minutes <= 0 || p.minutes >= MIN_RELIABLE_MINUTES) {
      result.set(p.id, p.combined);
      continue;
    }
    const mates = players.filter(o => o.id !== p.id && o.position === p.position && o.minutes > 0);
    const mateMinutes = mates.reduce((s, o) => s + o.minutes, 0);
    if (mateMinutes <= 0) {
      result.set(p.id, p.combined);
      continue;
    }
    const priorRate = mates.reduce((s, o) => s + o.combined, 0) / mateMinutes;
    const weight = p.minutes / MIN_RELIABLE_MINUTES;
    const rate = Math.min(priorRate, weight * (p.combined / p.minutes) + (1 - weight) * priorRate);
    result.set(p.id, rate * p.minutes);
  }

  const adjustedTotal = [...result.values()].reduce((s, v) => s + v, 0);
  if (conserveTotal && adjustedTotal > 0 && originalTotal > 0) {
    const scale = originalTotal / adjustedTotal;
    for (const [id, v] of result) result.set(id, v * scale);
  }
  return result;
}

// Convenience for the per-player projection endpoints: shrinks one season total (cards, DC,
// saves, bonus...) for every bootstrap element, grouped by team, without redistributing the
// removed amount to teammates. Returns playerId -> shrunk total.
export function shrinkTotalsByTeam(
  elements: any[],
  totalOf: (el: any) => number
): Map<number, number> {
  const byTeam = new Map<number, any[]>();
  for (const el of elements) {
    if (!byTeam.has(el.team)) byTeam.set(el.team, []);
    byTeam.get(el.team)!.push(el);
  }
  const result = new Map<number, number>();
  for (const members of byTeam.values()) {
    const adjusted = shrinkCombinedByMinutes(
      members.map(el => ({ id: el.id, position: el.element_type, minutes: el.minutes || 0, combined: totalOf(el) })),
      { conserveTotal: false }
    );
    adjusted.forEach((v, id) => result.set(id, v));
  }
  return result;
}

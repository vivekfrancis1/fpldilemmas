// Builds a full 15-player wildcard-equivalent squad from scratch: a budget- and
// team-quota-constrained greedy selection, not an exact optimizer (mirrors the
// heuristic approach client/src/components/wildcard-optimizer.tsx already uses
// for the standalone Wildcard/Free Hit builder pages, kept separate here since
// that component is React/DOM-coupled and this needs to run server-side, and
// only needs a full squad rather than a starting XI + formation).
export interface SquadCandidate {
  id: number;
  webName: string;
  team: number;
  elementType: 1 | 2 | 3 | 4; // 1=GKP, 2=DEF, 3=MID, 4=FWD
  price: number; // tenths of a million, e.g. 55 = £5.5m
  projectedPoints: number;
}

export interface WildcardSquadResult {
  squad: SquadCandidate[];
  totalCost: number;
  totalProjectedPoints: number;
}

const POSITION_QUOTAS: Record<1 | 2 | 3 | 4, number> = { 1: 2, 2: 5, 3: 5, 4: 3 };
const MAX_PER_TEAM = 3;
const MAX_UPGRADE_ITERATIONS = 300;

export function buildWildcardSquad(candidates: SquadCandidate[], budget: number): WildcardSquadResult | null {
  const byPosition: Record<1 | 2 | 3 | 4, SquadCandidate[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const c of candidates) byPosition[c.elementType].push(c);

  const teamCounts = new Map<number, number>();
  const squad: SquadCandidate[] = [];

  // Baseline: cheapest feasible player per required slot, respecting the per-team cap,
  // to establish a starting point we know fits (or definitively doesn't) the budget.
  for (const elementType of [1, 2, 3, 4] as const) {
    const sortedByPrice = [...byPosition[elementType]].sort((a, b) => a.price - b.price);
    let picked = 0;
    for (const candidate of sortedByPrice) {
      if (picked >= POSITION_QUOTAS[elementType]) break;
      const teamCount = teamCounts.get(candidate.team) || 0;
      if (teamCount >= MAX_PER_TEAM) continue;
      squad.push(candidate);
      teamCounts.set(candidate.team, teamCount + 1);
      picked++;
    }
    if (picked < POSITION_QUOTAS[elementType]) return null; // not enough eligible players to fill the position at all
  }

  let totalCost = squad.reduce((sum, p) => sum + p.price, 0);
  if (totalCost > budget) return null;

  // Greedy hill-climb: repeatedly swap in the highest-points available replacement
  // for whichever squad slot yields the single biggest points gain within budget
  // and the team cap, until no further improving swap exists.
  const squadIds = new Set(squad.map((p) => p.id));
  for (let iteration = 0; iteration < MAX_UPGRADE_ITERATIONS; iteration++) {
    let bestGain = 0;
    let bestSlotIndex = -1;
    let bestReplacement: SquadCandidate | null = null;

    for (let slotIndex = 0; slotIndex < squad.length; slotIndex++) {
      const current = squad[slotIndex];
      const remainingBudget = budget - totalCost + current.price;
      const sameTeamCountExcludingCurrent = (teamCounts.get(current.team) || 0) - 1;

      const positionMates = byPosition[current.elementType];
      for (const candidate of positionMates) {
        if (squadIds.has(candidate.id)) continue;
        if (candidate.projectedPoints <= current.projectedPoints) continue; // sorted search below relies on this early-exit too
        if (candidate.price > remainingBudget) continue;
        const candidateTeamCount = candidate.team === current.team
          ? sameTeamCountExcludingCurrent + 1
          : (teamCounts.get(candidate.team) || 0) + 1;
        if (candidateTeamCount > MAX_PER_TEAM) continue;

        const gain = candidate.projectedPoints - current.projectedPoints;
        if (gain > bestGain) {
          bestGain = gain;
          bestSlotIndex = slotIndex;
          bestReplacement = candidate;
        }
      }
    }

    if (bestSlotIndex === -1 || !bestReplacement) break;

    const outgoing = squad[bestSlotIndex];
    teamCounts.set(outgoing.team, (teamCounts.get(outgoing.team) || 0) - 1);
    teamCounts.set(bestReplacement.team, (teamCounts.get(bestReplacement.team) || 0) + 1);
    squadIds.delete(outgoing.id);
    squadIds.add(bestReplacement.id);
    totalCost += bestReplacement.price - outgoing.price;
    squad[bestSlotIndex] = bestReplacement;
  }

  return {
    squad,
    totalCost,
    totalProjectedPoints: squad.reduce((sum, p) => sum + p.projectedPoints, 0)
  };
}

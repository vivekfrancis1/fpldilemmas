// Splits a team's projected goals/assists among its players in proportion to
// (per-90 rate x expected minutes), so the squad always adds up to the team's projection and a
// teammate's absence (expected minutes 0) redistributes automatically.
import { fractionOfMatch } from "./minutes-scoring";

export function playerWeight(ratePer90: number, xMins: number): number {
  return ratePer90 * fractionOfMatch(xMins);
}

// Returns each player's share of `teamTotal`, or null when no one has a positive weight.
export function allocateTeamTotal(teamTotal: number, weights: Map<number, number>): Map<number, number> | null {
  const clean = new Map<number, number>();
  let sum = 0;
  for (const [id, w] of weights) {
    const v = Number.isFinite(w) && w > 0 ? w : 0;
    clean.set(id, v);
    sum += v;
  }
  if (sum <= 0) return null;
  const out = new Map<number, number>();
  for (const [id, v] of clean) out.set(id, (v / sum) * teamTotal);
  return out;
}

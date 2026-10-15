// Scoring maths driven by the calibrated minutes distribution (shared/minutes-model.ts).
//
// Copilot gives expected minutes (a mean). Components that are linear in minutes can use the mean
// directly; threshold/nonlinear ones (minutes points, clean sheets, goals conceded, defensive
// contributions) are averaged over the calibrated distribution of actual minutes.
import { BUCKET_MINUTES, minutesDistribution, pAtLeast60, pPlays } from "../shared/minutes-model";

// Rollout switch: on by default, set EXPECTED_MINUTES_MODE=off to fall back to the legacy maths.
export function expectedMinutesModeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.EXPECTED_MINUTES_MODE !== "off";
}

// Adjusted xMins (already includes availability and teammate reallocation) for gameweeks Copilot
// actually forecasts; undefined otherwise (mode off, no data, or a history-based fallback week).
export function coveredXMins(playerMinutes: any, gw: number, enabled = expectedMinutesModeEnabled()): number | undefined {
  if (!enabled || !playerMinutes) return undefined;
  if (!playerMinutes.xMinsFromCopilotPerGW?.[`gw${gw}`]) return undefined;
  const x = playerMinutes.xMinsPerGW?.[`gw${gw}`];
  return typeof x === "number" ? x : undefined;
}

// FPL: 60+ minutes = 2 points, 1-59 = 1 point.
export function minutesPointsFromXMins(xMins: number): number {
  return 2 * pAtLeast60(xMins) + (pPlays(xMins) - pAtLeast60(xMins));
}

// Expected penalty (negative points) from goals conceded: -1 per 2 goals, E = sum floor(k/2) P(k).
export function poissonGoalsConcededPenalty(lambda: number): number {
  if (!(lambda > 0)) return 0;
  let expectedPenalty = 0, cumulative = 0, logFactorial = 0;
  const maxK = Math.max(20, Math.ceil(lambda * 3));
  for (let k = 0; k <= maxK; k++) {
    if (k > 0) logFactorial += Math.log(k);
    const prob = Math.exp(-lambda + k * Math.log(lambda) - logFactorial);
    cumulative += prob;
    expectedPenalty += Math.floor(k / 2) * prob;
    if (cumulative > 0.9999) break;
  }
  return expectedPenalty;
}

const BUCKET_KEYS = ["zero", "p1to29", "p30to59", "p60to74", "p75plus"] as const;
type BucketKey = (typeof BUCKET_KEYS)[number];
const distKey: Record<BucketKey, "pZero" | "p1to29" | "p30to59" | "p60to74" | "p75plus"> = {
  zero: "pZero", p1to29: "p1to29", p30to59: "p30to59", p60to74: "p60to74", p75plus: "p75plus",
};

// Goals conceded exposure scales with minutes on the pitch: lambda_b = teamGA x bucketMinutes / 90.
export function expectedGoalsConcededFromXMins(teamGoalsAgainst: number, xMins: number) {
  const d = minutesDistribution(xMins);
  let expectedGoalsConceded = 0, expectedPenalty = 0;
  for (const key of BUCKET_KEYS) {
    const p = d[distKey[key]];
    if (p <= 0) continue;
    const lambda = (teamGoalsAgainst * BUCKET_MINUTES[key]) / 90;
    expectedGoalsConceded += p * lambda;
    expectedPenalty += p * poissonGoalsConcededPenalty(lambda);
  }
  return { expectedGoalsConceded, expectedPenalty };
}

// P(count >= threshold) when the event rate is per 90 minutes and minutes come from the distribution.
export function thresholdChanceFromXMins(
  ratePer90: number,
  threshold: number,
  xMins: number,
  poissonAtLeast: (lambda: number, k: number) => number
): number {
  const d = minutesDistribution(xMins);
  let chance = 0;
  for (const key of BUCKET_KEYS) {
    const p = d[distKey[key]];
    if (p <= 0 || BUCKET_MINUTES[key] <= 0) continue;
    chance += p * poissonAtLeast((ratePer90 * BUCKET_MINUTES[key]) / 90, threshold);
  }
  return chance;
}

// Expected minutes as a fraction of a full match — for components that are linear in minutes
// (cards, expected counts): expected events = per-90 rate x fractionOfMatch(xMins).
export function fractionOfMatch(xMins: number): number {
  return Math.min(90, Math.max(0, xMins)) / 90;
}

// Average of fn(fraction of a match played) over the calibrated minutes distribution — for
// nonlinear components (thresholds such as saves points) where only the mean minutes would mislead.
export function mixtureOverMinutes(xMins: number, fn: (fractionOfMatch: number) => number): number {
  const d = minutesDistribution(xMins);
  let total = 0;
  for (const key of BUCKET_KEYS) {
    const p = d[distKey[key]];
    if (p > 0) total += p * fn(BUCKET_MINUTES[key] / 90);
  }
  return total;
}

// Goalkeeper saves points (1 per 3 saves) averaged over the minutes distribution.
// lambdaPer90 is the expected saves over a full match (before any minutes scaling).
export function savesPointsFromXMins(
  lambdaPer90: number,
  xMins: number,
  poissonAtLeast: (lambda: number, k: number) => number
): number {
  return mixtureOverMinutes(xMins, (f) =>
    [3, 6, 9, 12].reduce((sum, k) => sum + poissonAtLeast(lambdaPer90 * f, k), 0)
  );
}

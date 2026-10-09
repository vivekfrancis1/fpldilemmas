// Per-gameweek minutes points. The historical minutes-points value is only meaningful relative
// to the historical xMins it was derived from, so scale by (adjusted xMins / historical xMins) —
// never by a ratio against some other base (e.g. a Copilot override), which blows up when that
// base is tiny. A single match can award at most 2 minutes points.
const MAX_MINUTES_POINTS = 2;

export function minutesPointsForGW(
  historicalMinutesPoints: number,
  historicalBaseXMins: number,
  adjustedXMins: number
): number {
  if (adjustedXMins <= 0) return 0;
  const raw = historicalBaseXMins > 0 && historicalMinutesPoints > 0
    ? historicalMinutesPoints * (adjustedXMins / historicalBaseXMins)
    : (adjustedXMins / 90) * MAX_MINUTES_POINTS;
  return Math.min(MAX_MINUTES_POINTS, raw);
}

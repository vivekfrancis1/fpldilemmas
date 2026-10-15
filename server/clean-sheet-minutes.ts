// Chance a player is on the pitch for 60+ minutes in a gameweek — the multiplier for clean sheet
// points (and the goals-conceded penalty), which both need 60+ minutes.
//
// Derived from the gameweek's projected minutes rather than the season's historical share of
// 60+ minute appearances, which is a tiny sample early in the season (one short early cameo left
// a regular starter at 60%). A projection of 60+ minutes counts as a certain 60+; below that it
// scales down proportionally.
//
// The projected (adjusted) xMins already include the player's own injury/availability, so
// availability must NOT be multiplied in again. Dividing by max(60, base) — base being the
// minutes he'd play if fit — keeps own-doubt as a probability (88 base × 75% available -> 0.75)
// while still giving full credit to a backup whose minutes are boosted by a teammate's absence.
export function cleanSheetMinutesFactor(args: {
  adjustedXMins: number | undefined;
  availabilityRatio: number | undefined;
  historicalPct60Plus: number; // 0-100
  availabilityProb: number;
}): number {
  const { adjustedXMins, availabilityRatio, historicalPct60Plus, availabilityProb } = args;
  if (adjustedXMins === undefined) return availabilityProb * (historicalPct60Plus / 100);
  if (adjustedXMins <= 0) return 0;
  const base = availabilityRatio && availabilityRatio > 0 ? adjustedXMins / availabilityRatio : adjustedXMins;
  return Math.min(1, adjustedXMins / Math.max(60, base));
}

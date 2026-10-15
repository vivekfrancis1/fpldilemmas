// Chance a player is on the pitch for 60+ minutes in a gameweek — the multiplier for clean sheet
// points, which need 60+ minutes.
//
// Where Copilot forecasts the gameweek, this is the CALIBRATED P(60+ | expected minutes) from the
// minutes model (shared/minutes-model.ts), not the season's historical share of 60+ appearances
// (a tiny sample early in the season) and not a hard threshold (a 59-minute average is a rotation
// player, not a certain starter). The adjusted xMins already include the player's own
// injury/availability and teammate reallocation, so availability is NOT multiplied in again.
// Elsewhere the legacy availability x historical pct60Plus applies.
import { pAtLeast60 } from "../shared/minutes-model";

export function cleanSheetMinutesFactor(args: {
  adjustedXMins: number | undefined;
  historicalPct60Plus: number; // 0-100
  availabilityProb: number;
}): number {
  const { adjustedXMins, historicalPct60Plus, availabilityProb } = args;
  if (adjustedXMins === undefined) return availabilityProb * (historicalPct60Plus / 100);
  return pAtLeast60(adjustedXMins);
}

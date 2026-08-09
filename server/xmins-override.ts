// Pre-season override: while bootstrap-static has no real current-season minutes signal yet
// (currentGameweek === 0), substitute the manually-sourced xMins projection (see
// scripts/build-xmins-projections.ts) for whatever the history-based estimate would otherwise
// produce. Self-disables the moment the season's first gameweek goes live.

export interface ManualXminsEntry {
  startProbability: number; // 0-100
  xMins: number; // 0-90
}

export interface MinutesEstimate {
  avgMinutesPerGame: number;
  appearances: number;
  gamesHit60Plus: number;
  gamesBelow60: number;
}

// Matches the "new to the league" fallback elsewhere in the minutes pipeline: a deliberate
// estimate isn't noisy small-sample data, so it gets the full confidence-threshold appearance
// count rather than being dampened by the low-appearances confidence factor.
const SYNTHETIC_APPEARANCES = 10;

export function applyPreSeasonXminsOverride(
  currentGameweek: number,
  manualEntry: ManualXminsEntry | undefined,
  base: MinutesEstimate
): MinutesEstimate {
  if (currentGameweek !== 0 || !manualEntry) return base;

  const gamesHit60Plus = (manualEntry.startProbability / 100) * SYNTHETIC_APPEARANCES;
  return {
    avgMinutesPerGame: manualEntry.xMins,
    appearances: SYNTHETIC_APPEARANCES,
    gamesHit60Plus,
    gamesBelow60: SYNTHETIC_APPEARANCES - gamesHit60Plus,
  };
}

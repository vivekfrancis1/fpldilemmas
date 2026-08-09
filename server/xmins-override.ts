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
  groupCovered: boolean,
  base: MinutesEstimate
): MinutesEstimate {
  if (currentGameweek !== 0) return base;

  if (manualEntry) {
    const gamesHit60Plus = (manualEntry.startProbability / 100) * SYNTHETIC_APPEARANCES;
    return {
      avgMinutesPerGame: manualEntry.xMins,
      appearances: SYNTHETIC_APPEARANCES,
      gamesHit60Plus,
      gamesBelow60: SYNTHETIC_APPEARANCES - gamesHit60Plus,
    };
  }

  // The lineup graphics comprehensively list every player from a covered team+position
  // group with any realistic chance of featuring (e.g. a team's two listed goalkeepers sum
  // to ~100% between them). A teammate in that same group who isn't listed at all — a
  // third-choice keeper, a fringe squad player — is deliberately excluded, not a data gap,
  // so falling back to their unrelated historical minutes (e.g. from a loan spell elsewhere)
  // would wrongly project them as if they're in line to start. Only fall back to the
  // history-based base estimate when the group has no manual coverage whatsoever.
  if (groupCovered) {
    return {
      avgMinutesPerGame: 0,
      appearances: SYNTHETIC_APPEARANCES,
      gamesHit60Plus: 0,
      gamesBelow60: SYNTHETIC_APPEARANCES,
    };
  }

  return base;
}

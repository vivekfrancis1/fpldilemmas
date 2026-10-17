// Overrides the flat, history-based expected-minutes estimate with fplcopilot.com's
// per-gameweek xMins export (see scripts/build-copilot-xmins-projections.ts) wherever it
// covers a given player + gameweek. Copilot's export only genuinely forecasts a handful of
// gameweeks ahead; extendCopilotXMinsForward then carries each player's last forecast value
// flat through the rest of the season, so later gameweeks keep Copilot's view of the player
// (e.g. a keeper it rates at 83 rather than snapping back to the history-based 90).

export function getEffectiveBaseXMins(
  gameweek: number,
  copilotByGW: Map<number, number> | undefined,
  historicalBaseXMins: number
): number {
  if (!copilotByGW) return historicalBaseXMins;
  const value = copilotByGW.get(gameweek);
  return value !== undefined ? value : historicalBaseXMins;
}

// The rest of the pipeline works per fixture (per-gameweek minutes are a per-match constant that
// gets multiplied across a double gameweek's fixtures). Copilot's xMins is a per-gameweek figure:
// a value above 90 can only be a total across several fixtures, so it is split evenly; a value of
// 90 or less is read as the per-fixture expectation. (This season has no double gameweeks yet, so
// the format is unverified — see plan-002.) A blank gameweek has nothing to play.
export function copilotPerFixtureXMins(xMins: number, nFixtures: number): number {
  if (nFixtures <= 0) return 0;
  const perFixture = xMins > 90 ? xMins / nFixtures : xMins;
  return Math.min(90, perFixture);
}

// Carries each player's last Copilot value forward, unchanged, through `throughGW` (capped at 90
// per fixture). Returns a new map. A forecast whose last gameweek is before `minLastGW` is stale
// (an old export) and is returned as-is rather than extended.
export function extendCopilotXMinsForward(
  copilotByGW: Map<number, number>,
  throughGW: number,
  minLastGW = 0
): Map<number, number> {
  const out = new Map(copilotByGW);
  if (out.size === 0) return out;
  const lastGW = Math.max(...out.keys());
  if (lastGW < minLastGW) return out;
  const carried = Math.min(90, out.get(lastGW)!);
  for (let gw = lastGW + 1; gw <= throughGW; gw++) out.set(gw, carried);
  return out;
}

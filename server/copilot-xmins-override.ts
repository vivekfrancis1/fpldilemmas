// Overrides the flat, history-based expected-minutes estimate with fplcopilot.com's
// per-gameweek xMins export (see scripts/build-copilot-xmins-projections.ts) wherever it
// covers a given player + gameweek. Copilot's export only genuinely forecasts a handful of
// gameweeks ahead — past that, its own numbers flatline to a single steady-state value, so
// gameweeks it doesn't cover fall back to the historical estimate rather than trusting a
// flatlined placeholder.

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

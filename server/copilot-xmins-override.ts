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

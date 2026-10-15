// Config + small pure helpers for the projection accuracy scheduler (kept DB-free so they are
// unit-testable). The scheduler used to hardcode last season's label and only gameweeks 29-38,
// so it sat idle (and mislabelled) for the first 28 gameweeks of every season.
import { CURRENT_SEASON } from "../shared/schema";

export const PROJECTION_ACCURACY_TRACKING = {
  season: CURRENT_SEASON,
  startGameweek: 1,
  endGameweek: 38,
} as const;

// Expected minutes for one gameweek: Copilot-covered gameweeks expose xMinsPerGW; otherwise fall
// back to the history-based season average.
export function projectedMinutesFor(
  player: { xMinsPerGW?: { [gw: string]: number }; avgMinutesPerGameweek?: number },
  gwKey: string
): number {
  const perGW = player.xMinsPerGW?.[gwKey];
  return typeof perGW === "number" ? perGW : player.avgMinutesPerGameweek || 0;
}

// How fresh the loaded Copilot xMins export is. Copilot updates about twice a week, so an export
// older than ~4 days is later than expected, and beyond a week it is stale. Also checks that the
// export still covers upcoming gameweeks (past coverage is useless however recent the file is).
export interface CopilotLoadInfo {
  sourceLastUpdated: string | null; // the export's own timestamp
  loadedAt: string; // when we loaded it
  gameweeks: number[];
}

export type FreshnessLevel = "fresh" | "aging" | "stale" | "none";

export function describeCopilotFreshness(info: CopilotLoadInfo | null, now: Date, currentGameweek: number) {
  if (!info) {
    return { level: "none" as FreshnessLevel, ageDays: null as number | null, gameweeksAhead: 0, message: "No Copilot xMins loaded yet." };
  }
  const sourceMs = info.sourceLastUpdated ? new Date(info.sourceLastUpdated).getTime() : NaN;
  const referenceMs = Number.isFinite(sourceMs) ? sourceMs : new Date(info.loadedAt).getTime();
  const ageDays = (now.getTime() - referenceMs) / 86_400_000;
  const gameweeksAhead = info.gameweeks.filter((g) => g > currentGameweek).length;

  let level: FreshnessLevel = ageDays <= 4 ? "fresh" : ageDays <= 7 ? "aging" : "stale";
  if (gameweeksAhead === 0) level = "stale";

  const ageText = `${Math.round(ageDays)} day${Math.round(ageDays) === 1 ? "" : "s"} old`;
  const message =
    gameweeksAhead === 0
      ? `Copilot export is ${ageText} and no longer covers any upcoming gameweek.`
      : level === "fresh"
        ? `Copilot export is ${ageText}; covers ${gameweeksAhead} upcoming gameweek${gameweeksAhead === 1 ? "" : "s"}.`
        : `Copilot export is ${ageText} (updates are expected about twice a week); covers ${gameweeksAhead} upcoming gameweek${gameweeksAhead === 1 ? "" : "s"}.`;
  return { level, ageDays, gameweeksAhead, message };
}

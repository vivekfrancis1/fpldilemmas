import { describe, it, expect } from "vitest";
import { PROJECTION_ACCURACY_TRACKING, projectedMinutesFor } from "../server/projection-accuracy-config";
import { CURRENT_SEASON } from "../shared/schema";

describe("projection accuracy tracking config", () => {
  it("tracks the current season (never a hardcoded past one) across every gameweek", () => {
    expect(PROJECTION_ACCURACY_TRACKING.season).toBe(CURRENT_SEASON);
    expect(PROJECTION_ACCURACY_TRACKING.startGameweek).toBe(1);
    expect(PROJECTION_ACCURACY_TRACKING.endGameweek).toBe(38);
  });
});

describe("projectedMinutesFor", () => {
  it("uses the gameweek's expected minutes when known", () => {
    expect(projectedMinutesFor({ xMinsPerGW: { "7": 88, "8": 0 }, avgMinutesPerGameweek: 60 }, "7")).toBe(88);
    expect(projectedMinutesFor({ xMinsPerGW: { "7": 88, "8": 0 }, avgMinutesPerGameweek: 60 }, "8")).toBe(0); // a genuine 0 is kept
  });
  it("falls back to the season average for gameweeks without a forecast", () => {
    expect(projectedMinutesFor({ xMinsPerGW: { "7": 88 }, avgMinutesPerGameweek: 60 }, "12")).toBe(60);
    expect(projectedMinutesFor({ avgMinutesPerGameweek: 45 }, "7")).toBe(45);
  });
  it("is 0 when nothing is known", () => {
    expect(projectedMinutesFor({}, "7")).toBe(0);
  });
});

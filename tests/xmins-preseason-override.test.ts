import { describe, it, expect } from "vitest";
import { applyPreSeasonXminsOverride, type MinutesEstimate } from "../server/xmins-override";

const base: MinutesEstimate = {
  avgMinutesPerGame: 45,
  appearances: 6,
  gamesHit60Plus: 2,
  gamesBelow60: 4,
};

describe("applyPreSeasonXminsOverride", () => {
  it("overrides with manual xMins data during pre-season (currentGameweek === 0)", () => {
    const result = applyPreSeasonXminsOverride(0, { startProbability: 90, xMins: 81 }, base);
    expect(result.avgMinutesPerGame).toBe(81);
    expect(result.appearances).toBe(10);
    expect(result.gamesHit60Plus).toBeCloseTo(9);
    expect(result.gamesBelow60).toBeCloseTo(1);
  });

  it("leaves the base estimate untouched once the season has started", () => {
    const result = applyPreSeasonXminsOverride(1, { startProbability: 90, xMins: 81 }, base);
    expect(result).toEqual(base);
  });

  it("leaves the base estimate untouched when there's no manual entry for the player", () => {
    const result = applyPreSeasonXminsOverride(0, undefined, base);
    expect(result).toEqual(base);
  });

  it("derives gamesHit60Plus/gamesBelow60 proportionally from startProbability", () => {
    const result = applyPreSeasonXminsOverride(0, { startProbability: 35, xMins: 31.5 }, base);
    expect(result.gamesHit60Plus).toBeCloseTo(3.5);
    expect(result.gamesBelow60).toBeCloseTo(6.5);
  });

  it("handles 0% start probability", () => {
    const result = applyPreSeasonXminsOverride(0, { startProbability: 0, xMins: 0 }, base);
    expect(result.avgMinutesPerGame).toBe(0);
    expect(result.gamesHit60Plus).toBe(0);
    expect(result.gamesBelow60).toBe(10);
  });
});

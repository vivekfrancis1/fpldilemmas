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
    const result = applyPreSeasonXminsOverride(0, { startProbability: 90, xMins: 81 }, true, base);
    expect(result.avgMinutesPerGame).toBe(81);
    expect(result.appearances).toBe(10);
    expect(result.gamesHit60Plus).toBeCloseTo(9);
    expect(result.gamesBelow60).toBeCloseTo(1);
  });

  it("leaves the base estimate untouched once the season has started", () => {
    const result = applyPreSeasonXminsOverride(1, { startProbability: 90, xMins: 81 }, true, base);
    expect(result).toEqual(base);
  });

  it("leaves the base estimate untouched when there's no manual entry and the player's team+position group has no manual coverage at all", () => {
    const result = applyPreSeasonXminsOverride(0, undefined, false, base);
    expect(result).toEqual(base);
  });

  it("zeroes out an unlisted player whose team+position group IS covered by manual data — a backup not pictured in the lineup graphic is not expected to play, so it must not fall back to unrelated historical minutes", () => {
    const result = applyPreSeasonXminsOverride(0, undefined, true, base);
    expect(result.avgMinutesPerGame).toBe(0);
    expect(result.appearances).toBe(10);
    expect(result.gamesHit60Plus).toBe(0);
    expect(result.gamesBelow60).toBe(10);
  });

  it("derives gamesHit60Plus/gamesBelow60 proportionally from startProbability", () => {
    const result = applyPreSeasonXminsOverride(0, { startProbability: 35, xMins: 31.5 }, true, base);
    expect(result.gamesHit60Plus).toBeCloseTo(3.5);
    expect(result.gamesBelow60).toBeCloseTo(6.5);
  });

  it("handles 0% start probability", () => {
    const result = applyPreSeasonXminsOverride(0, { startProbability: 0, xMins: 0 }, true, base);
    expect(result.avgMinutesPerGame).toBe(0);
    expect(result.gamesHit60Plus).toBe(0);
    expect(result.gamesBelow60).toBe(10);
  });
});

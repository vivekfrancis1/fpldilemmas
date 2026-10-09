import { describe, it, expect } from "vitest";
import { minutesPointsForGW } from "../server/minutes-points";

describe("minutesPointsForGW", () => {
  it("scales the historical minutes points by adjusted xMins relative to the SAME historical base", () => {
    // 60 historical xMins worth 1.2 pts; adjusted to 30 xMins -> half
    expect(minutesPointsForGW(1.2, 60, 30)).toBeCloseTo(0.6, 2);
  });

  it("never exceeds 2 points (max FPL minutes points for one match), even when xMins jumps far above history", () => {
    // Benitez case: tiny historical base, reallocation lifts him to ~90
    expect(minutesPointsForGW(1.1, 5.3, 90)).toBe(2);
  });

  it("returns 0 when adjusted xMins is 0", () => {
    expect(minutesPointsForGW(1.5, 80, 0)).toBe(0);
  });

  it("falls back to a linear xMins estimate (90 mins = 2 pts) when there is no historical base", () => {
    expect(minutesPointsForGW(0, 0, 45)).toBeCloseTo(1, 2);
    expect(minutesPointsForGW(0, 0, 90)).toBe(2);
  });
});

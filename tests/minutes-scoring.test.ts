import { describe, it, expect } from "vitest";
import {
  minutesPointsFromXMins,
  poissonGoalsConcededPenalty,
  expectedGoalsConcededFromXMins,
  thresholdChanceFromXMins,
  expectedMinutesModeEnabled,
  coveredXMins,
} from "../server/minutes-scoring";

describe("minutesPointsFromXMins", () => {
  it("is 0 for a player expected to play 0 minutes and ~2 for a nailed-on starter", () => {
    expect(minutesPointsFromXMins(0)).toBe(0);
    expect(minutesPointsFromXMins(90)).toBeCloseTo(2, 6);
    expect(minutesPointsFromXMins(88)).toBeGreaterThan(1.9);
  });
  it("rises with expected minutes and never exceeds 2", () => {
    let prev = -1;
    for (let x = 0; x <= 90; x += 3) {
      const v = minutesPointsFromXMins(x);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(v).toBeLessThanOrEqual(2 + 1e-9);
      prev = v;
    }
  });
  it("gives a rotation player (45 xMins) well under a starter's points but well over a sub's", () => {
    expect(minutesPointsFromXMins(45)).toBeGreaterThan(minutesPointsFromXMins(15));
    expect(minutesPointsFromXMins(45)).toBeLessThan(minutesPointsFromXMins(85));
  });
});

describe("poissonGoalsConcededPenalty", () => {
  it("is 0 at lambda 0 and matches the hand-computed expectation at lambda 1 (~0.2835)", () => {
    expect(poissonGoalsConcededPenalty(0)).toBe(0);
    expect(poissonGoalsConcededPenalty(1)).toBeCloseTo(0.2835, 2);
  });
  it("increases with lambda", () => {
    expect(poissonGoalsConcededPenalty(2)).toBeGreaterThan(poissonGoalsConcededPenalty(1));
  });
});

describe("expectedGoalsConcededFromXMins", () => {
  it("scales exposure with the minutes distribution: a sub concedes less than a starter", () => {
    const starter = expectedGoalsConcededFromXMins(1.2, 88);
    const sub = expectedGoalsConcededFromXMins(1.2, 20);
    expect(sub.expectedGoalsConceded).toBeLessThan(starter.expectedGoalsConceded);
    expect(sub.expectedPenalty).toBeLessThan(starter.expectedPenalty);
  });
  it("a starter's exposure is close to the full team figure", () => {
    expect(expectedGoalsConcededFromXMins(1.2, 90).expectedGoalsConceded).toBeCloseTo(1.2, 1);
  });
  it("is zero for a player expected to play 0 minutes", () => {
    expect(expectedGoalsConcededFromXMins(1.2, 0)).toEqual({ expectedGoalsConceded: 0, expectedPenalty: 0 });
  });
});

describe("thresholdChanceFromXMins (e.g. defensive contributions)", () => {
  const poissonAtLeast = (lambda: number, k: number) => {
    let cdf = 0, term = Math.exp(-lambda);
    for (let i = 0; i < k; i++) { cdf += term; term *= lambda / (i + 1); }
    return 1 - cdf;
  };
  it("is 0 for 0 expected minutes and grows with minutes", () => {
    expect(thresholdChanceFromXMins(8, 10, 0, poissonAtLeast)).toBe(0);
    expect(thresholdChanceFromXMins(8, 10, 88, poissonAtLeast)).toBeGreaterThan(thresholdChanceFromXMins(8, 10, 30, poissonAtLeast));
  });
  it("a full-time player is close to the plain 90-minute chance", () => {
    expect(thresholdChanceFromXMins(8, 10, 90, poissonAtLeast)).toBeCloseTo(poissonAtLeast(8 * 89.49 / 90, 10), 2);
  });
});

describe("expected-minutes mode switch and coverage", () => {
  const pm = { xMinsPerGW: { gw7: 88, gw12: 59 }, xMinsFromCopilotPerGW: { gw7: true, gw12: false } };
  it("is on by default and off only when EXPECTED_MINUTES_MODE=off", () => {
    expect(expectedMinutesModeEnabled({})).toBe(true);
    expect(expectedMinutesModeEnabled({ EXPECTED_MINUTES_MODE: "off" })).toBe(false);
    expect(expectedMinutesModeEnabled({ EXPECTED_MINUTES_MODE: "on" })).toBe(true);
  });
  it("returns xMins only for Copilot-covered gameweeks while the mode is on", () => {
    expect(coveredXMins(pm, 7, true)).toBe(88);
    expect(coveredXMins(pm, 12, true)).toBeUndefined(); // history-based, not covered
    expect(coveredXMins(pm, 7, false)).toBeUndefined(); // mode off
    expect(coveredXMins(undefined, 7, true)).toBeUndefined();
  });
});

import { fractionOfMatch, mixtureOverMinutes, savesPointsFromXMins } from "../server/minutes-scoring";

describe("fractionOfMatch", () => {
  it("is expected minutes over 90, clamped to [0, 1]", () => {
    expect(fractionOfMatch(0)).toBe(0);
    expect(fractionOfMatch(45)).toBe(0.5);
    expect(fractionOfMatch(90)).toBe(1);
    expect(fractionOfMatch(120)).toBe(1);
    expect(fractionOfMatch(-3)).toBe(0);
  });
});

describe("mixtureOverMinutes", () => {
  it("weights sum to 1: a constant function is returned unchanged", () => {
    for (const x of [0, 10, 45, 88, 90]) expect(mixtureOverMinutes(x, () => 1)).toBeCloseTo(1, 9);
  });
  it("is consistent with the mean: averaging the match fraction gives about xMins/90", () => {
    for (const x of [10, 30, 45, 60, 88]) expect(Math.abs(mixtureOverMinutes(x, (f) => f) - x / 90)).toBeLessThan(0.07);
  });
});

describe("savesPointsFromXMins", () => {
  const poissonAtLeast = (lambda: number, k: number) => {
    if (lambda <= 0) return 0;
    let cdf = 0, term = Math.exp(-lambda);
    for (let i = 0; i < k; i++) { cdf += term; term *= lambda / (i + 1); }
    return 1 - cdf;
  };
  const plain = (lambda: number) => [3, 6, 9, 12].reduce((s, k) => s + poissonAtLeast(lambda, k), 0);

  it("is 0 for a keeper expected to play 0 minutes and grows with minutes", () => {
    expect(savesPointsFromXMins(3.5, 0, poissonAtLeast)).toBe(0);
    expect(savesPointsFromXMins(3.5, 88, poissonAtLeast)).toBeGreaterThan(savesPointsFromXMins(3.5, 45, poissonAtLeast));
  });
  it("a nailed-on keeper is close to the plain full-match calculation", () => {
    const withMins = savesPointsFromXMins(3.5, 90, poissonAtLeast);
    expect(Math.abs(withMins - plain(3.5 * 89.49 / 90))).toBeLessThan(0.02);
  });
  it("a rotation keeper (45 xMins) gets well under a starter's saves points", () => {
    expect(savesPointsFromXMins(3.5, 45, poissonAtLeast)).toBeLessThan(0.8 * savesPointsFromXMins(3.5, 88, poissonAtLeast));
  });
});

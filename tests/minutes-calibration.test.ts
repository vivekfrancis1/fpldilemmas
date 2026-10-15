import { describe, it, expect } from "vitest";
import { calibrateMinutes, X_BIN_EDGES } from "../server/minutes-calibration";

const rows = (playerId: number, mins: number[]) => mins.map((minutes, i) => ({ playerId, gameweek: i + 1, minutes }));

describe("calibrateMinutes", () => {
  it("a nailed-on player (90 every week) lands in the top bin and plays 75+ with certainty", () => {
    const bins = calibrateMinutes(rows(1, Array(20).fill(90)), { window: 5, minGameweek: 6 });
    const top = bins[bins.length - 1];
    expect(top.n).toBeGreaterThan(0);
    expect(top.p75plus).toBe(1);
    expect(top.meanX).toBeCloseTo(90, 6);
  });

  it("a player who never plays lands in the lowest bin and never plays", () => {
    const bins = calibrateMinutes(rows(2, Array(20).fill(0)), { window: 5, minGameweek: 6 });
    expect(bins[0].n).toBeGreaterThan(0);
    expect(bins[0].pZero).toBe(1);
  });

  it("each bin's outcome probabilities sum to 1", () => {
    const mixed = [...rows(1, [90, 0, 90, 30, 90, 0, 60, 90, 0, 20, 90, 90, 45, 0, 90, 90]), ...rows(2, [10, 0, 0, 25, 0, 0, 90, 0, 0, 15, 0, 0, 0, 40, 0, 0])];
    for (const b of calibrateMinutes(mixed, { window: 5, minGameweek: 6 }).filter(b => b.n > 0)) {
      expect(b.pZero + b.p1to29 + b.p30to59 + b.p60to74 + b.p75plus).toBeCloseTo(1, 9);
    }
  });

  it("uses only PRIOR gameweeks to forecast a gameweek (no leakage of the outcome into x)", () => {
    // 5 weeks of 90 then a 0: the forecast for week 6 is 90, the outcome is 0
    const bins = calibrateMinutes(rows(1, [90, 90, 90, 90, 90, 0]), { window: 5, minGameweek: 6 });
    const top = bins[bins.length - 1];
    expect(top.n).toBe(1);
    expect(top.pZero).toBe(1);
    expect(top.meanX).toBe(90);
  });

  it("skips gameweeks before minGameweek and players without a full window of history", () => {
    const bins = calibrateMinutes(rows(1, [90, 90, 90]), { window: 5, minGameweek: 1 });
    expect(bins.reduce((s, b) => s + b.n, 0)).toBe(0);
  });

  it("exposes ascending, contiguous bin edges", () => {
    for (let i = 1; i < X_BIN_EDGES.length; i++) expect(X_BIN_EDGES[i]).toBeGreaterThan(X_BIN_EDGES[i - 1]);
  });
});

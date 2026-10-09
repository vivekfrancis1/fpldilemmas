import { describe, it, expect } from "vitest";
import { shrinkCombinedByMinutes } from "../server/share-shrinkage";

const FWD = 4;
describe("shrinkCombinedByMinutes", () => {
  it("leaves a player at or above the minutes threshold untouched when no one else is shrunk", () => {
    const out = shrinkCombinedByMinutes([
      { id: 1, position: FWD, minutes: 400, combined: 3 },
      { id: 2, position: FWD, minutes: 300, combined: 2 },
    ]);
    expect(out.get(1)).toBeCloseTo(3, 6);
    expect(out.get(2)).toBeCloseTo(2, 6);
  });

  it("pulls a hot small-sample player toward same-position teammates' rate", () => {
    // Starter: 0.5 per 90... Sub: 117 mins with a much higher per-minute rate
    const out = shrinkCombinedByMinutes([
      { id: 1, position: FWD, minutes: 399, combined: 3 },
      { id: 2, position: FWD, minutes: 117, combined: 1.2 },
    ]);
    // sub raw rate 1.2/117 = .01026/min ; starter 3/399 = .00752/min
    const subRate = out.get(2)! / 117;
    expect(subRate).toBeLessThan(1.2 / 117);
    expect(subRate).toBeGreaterThan(3 / 399);
  });

  it("conserves the team's total combined value", () => {
    const players = [
      { id: 1, position: FWD, minutes: 399, combined: 3 },
      { id: 2, position: FWD, minutes: 117, combined: 1.2 },
      { id: 3, position: 3, minutes: 450, combined: 1 },
    ];
    const out = shrinkCombinedByMinutes(players);
    const total = [...out.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(5.2, 6);
  });

  it("does not shrink a player with no same-position teammates to borrow from", () => {
    const out = shrinkCombinedByMinutes([
      { id: 1, position: FWD, minutes: 100, combined: 2 },
      { id: 2, position: 3, minutes: 400, combined: 1 },
    ]);
    expect(out.get(1)).toBeCloseTo(2, 6);
  });

  it("ignores players with 0 minutes (nothing to shrink, nothing to pool)", () => {
    const out = shrinkCombinedByMinutes([
      { id: 1, position: FWD, minutes: 0, combined: 0 },
      { id: 2, position: FWD, minutes: 400, combined: 3 },
    ]);
    expect(out.get(1)).toBe(0);
    expect(out.get(2)).toBeCloseTo(3, 6);
  });

  it("with conserveTotal:false, shrinks a hot sub without redistributing to teammates", () => {
    const out = shrinkCombinedByMinutes([
      { id: 1, position: FWD, minutes: 399, combined: 3 },
      { id: 2, position: FWD, minutes: 117, combined: 3 },
    ], { conserveTotal: false });
    expect(out.get(1)).toBe(3); // starter above threshold: untouched, not boosted
    expect(out.get(2)!).toBeLessThan(3);
    expect(out.get(2)!).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { spearman, comparePredictions } from "../server/projection-compare";

describe("spearman", () => {
  it("is 1 for identical ordering, -1 for reversed, 0-ish for unrelated", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 9);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 9);
    expect(Math.abs(spearman([1, 2, 3, 4, 5, 6], [2, 5, 1, 6, 3, 4]))).toBeLessThan(0.6);
  });
  it("handles ties and tiny inputs without NaN", () => {
    expect(spearman([1, 1, 1], [1, 2, 3])).toBe(0);
    expect(spearman([1], [1])).toBe(0);
  });
});

describe("comparePredictions", () => {
  const rows = [
    { name: "Starter", gw: 6, ours: 6, theirs: 5.8, xMins: 88 },
    { name: "Starter2", gw: 6, ours: 5, theirs: 5.1, xMins: 85 },
    { name: "Sub", gw: 6, ours: 7, theirs: 1.6, xMins: 22 },
    { name: "Sub2", gw: 6, ours: 4, theirs: 1.0, xMins: 15 },
  ];
  it("reports bias as ours minus theirs, split by expected-minutes bucket", () => {
    const r = comparePredictions(rows);
    expect(r.n).toBe(4);
    const low = r.byXMins.find((b) => b.label === "<45")!;
    const high = r.byXMins.find((b) => b.label === "75+")!;
    expect(low.n).toBe(2);
    expect(low.bias).toBeCloseTo((5.4 + 3.0) / 2, 6); // we over-project low-minutes players
    expect(Math.abs(high.bias)).toBeLessThan(0.3);
  });
  it("lists the largest absolute disagreements first", () => {
    const r = comparePredictions(rows, 2);
    expect(r.outliers.map((o) => o.name)).toEqual(["Sub", "Sub2"]);
  });
});

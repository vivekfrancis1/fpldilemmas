import { describe, it, expect } from "vitest";
import { computeMatchProbabilities } from "../shared/odds-utils";
import { projectedResult, resultProbabilities } from "../shared/projected-result";

describe("projectedResult — the most likely of home win / draw / away win", () => {
  it("picks the home win when it has the highest probability", () => {
    expect(projectedResult({ homeWinProb: 0.5, drawProb: 0.3, awayWinProb: 0.2 })).toBe("home_win");
  });

  it("picks the away win when it has the highest probability", () => {
    expect(projectedResult({ homeWinProb: 0.2, drawProb: 0.25, awayWinProb: 0.55 })).toBe("away_win");
  });

  it("picks the draw when it has the highest probability, even if the goals would say otherwise", () => {
    expect(projectedResult({ homeWinProb: 0.34, drawProb: 0.38, awayWinProb: 0.28 })).toBe("draw");
  });

  it("a win with 45% beats a draw with 30% even when a draw is the single likeliest scoreline", () => {
    expect(projectedResult({ homeWinProb: 0.45, drawProb: 0.3, awayWinProb: 0.25 })).toBe("home_win");
  });

  it("ties go to the draw (home = away, or either win = draw)", () => {
    expect(projectedResult({ homeWinProb: 0.4, drawProb: 0.2, awayWinProb: 0.4 })).toBe("draw");
    expect(projectedResult({ homeWinProb: 0.4, drawProb: 0.4, awayWinProb: 0.2 })).toBe("draw");
    expect(projectedResult({ homeWinProb: 0.2, drawProb: 0.4, awayWinProb: 0.4 })).toBe("draw");
  });
});

describe("resultProbabilities — where the three percentages come from", () => {
  it("uses the bookmaker odds when all three are present", () => {
    const p = resultProbabilities({ odds: { homeWinProb: 0.6, drawProb: 0.25, awayWinProb: 0.15 }, homeExpectedGoals: 1, awayExpectedGoals: 1 });
    expect(p).toEqual({ homeWinProb: 0.6, drawProb: 0.25, awayWinProb: 0.15 });
  });

  it("falls back to the Poisson model on the expected goals when there are no odds", () => {
    const expected = computeMatchProbabilities(2.1, 0.8);
    const p = resultProbabilities({ odds: null, homeExpectedGoals: 2.1, awayExpectedGoals: 0.8 });
    expect(p.homeWinProb).toBeCloseTo(expected.homeWinProb, 10);
    expect(p.drawProb).toBeCloseTo(expected.drawProb, 10);
    expect(p.awayWinProb).toBeCloseTo(expected.awayWinProb, 10);
  });

  it("falls back to the Poisson model when the odds are only partly filled in", () => {
    const expected = computeMatchProbabilities(1.4, 1.4);
    const p = resultProbabilities({ odds: { homeWinProb: 0.5, drawProb: null, awayWinProb: 0.2 }, homeExpectedGoals: 1.4, awayExpectedGoals: 1.4 });
    expect(p.drawProb).toBeCloseTo(expected.drawProb, 10);
  });

  it("two identical sides are projected a draw (draw ≈ 0.25, each win ≈ 0.375, and the tie between the wins goes to the draw)", () => {
    const p = resultProbabilities({ odds: null, homeExpectedGoals: 1.4, awayExpectedGoals: 1.4 });
    expect(projectedResult(p)).toBe("draw");
  });

  it("a clear favourite is projected to win even when the rounded goals would be level (1.4 v 0.6 rounds to 1-1)", () => {
    const p = resultProbabilities({ odds: null, homeExpectedGoals: 1.4, awayExpectedGoals: 0.6 });
    expect(Math.round(1.4)).toBe(Math.round(0.6)); // the old goals-based rule called this a draw
    expect(projectedResult(p)).toBe("home_win");
  });
});

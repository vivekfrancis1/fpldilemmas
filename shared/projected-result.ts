// The Projected Table awards each unfinished match to whichever of home win / draw / away win is the most likely,
// rather than comparing rounded projected goals (which calls 1.4 v 0.6 a 1-1 draw).
import { computeMatchProbabilities } from "./odds-utils";

export interface ResultProbabilities {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
}

export type ProjectedResult = "home_win" | "draw" | "away_win";

/**
 * The most likely of the three results. Exact ties go to the draw: two equal wins, or a win level with the draw, are
 * not a clear call either way.
 */
export function projectedResult(p: ResultProbabilities): ProjectedResult {
  const best = Math.max(p.homeWinProb, p.drawProb, p.awayWinProb);
  const isBest = (x: number) => best - x < TIE_TOLERANCE; // sums of the same numbers in a different order differ by ~1e-17
  if (isBest(p.drawProb)) return "draw";
  if (isBest(p.homeWinProb) && isBest(p.awayWinProb)) return "draw";
  return isBest(p.homeWinProb) ? "home_win" : "away_win";
}

const TIE_TOLERANCE = 1e-9;

/**
 * Win / draw / win percentages for a match: the bookmaker consensus when all three are available (they only exist for
 * the next gameweek or two), otherwise the independent-Poisson probabilities implied by the projected goals — the same
 * model the odds are converted to goals with, so the two sources agree when the goals themselves came from the odds.
 */
export function resultProbabilities(input: {
  odds: { homeWinProb: number | null; drawProb: number | null; awayWinProb: number | null } | null | undefined;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
}): ResultProbabilities {
  const { odds } = input;
  if (odds && odds.homeWinProb !== null && odds.drawProb !== null && odds.awayWinProb !== null) {
    return { homeWinProb: odds.homeWinProb, drawProb: odds.drawProb, awayWinProb: odds.awayWinProb };
  }
  const { homeWinProb, drawProb, awayWinProb } = computeMatchProbabilities(input.homeExpectedGoals, input.awayExpectedGoals);
  return { homeWinProb, drawProb, awayWinProb };
}

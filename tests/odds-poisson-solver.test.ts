import { describe, it, expect } from 'vitest';
import { computeMatchProbabilities, solveExpectedGoalsFromOdds } from '../shared/odds-utils';

describe('computeMatchProbabilities (forward Poisson model)', () => {
  it('gives equal home/away win probability for equal expected goals', () => {
    const result = computeMatchProbabilities(1.4, 1.4);
    expect(result.homeWinProb).toBeCloseTo(result.awayWinProb, 6);
  });

  it('favors the team with higher expected goals', () => {
    const result = computeMatchProbabilities(2.2, 0.9);
    expect(result.homeWinProb).toBeGreaterThan(result.awayWinProb);
  });

  it('produces probabilities that sum to ~1 across home/draw/away', () => {
    const result = computeMatchProbabilities(1.7, 1.1);
    expect(result.homeWinProb + result.drawProb + result.awayWinProb).toBeCloseTo(1, 4);
  });

  it('produces a higher over-2.5 probability for higher-scoring expected totals', () => {
    const lowScoring = computeMatchProbabilities(0.7, 0.6);
    const highScoring = computeMatchProbabilities(2.0, 1.8);
    expect(highScoring.over25Prob).toBeGreaterThan(lowScoring.over25Prob);
  });
});

describe('solveExpectedGoalsFromOdds (inverse solve)', () => {
  it('recovers expected goals close to the values used to generate the target odds (round-trip)', () => {
    const trueLambdaHome = 1.8;
    const trueLambdaAway = 1.1;
    const target = computeMatchProbabilities(trueLambdaHome, trueLambdaAway);

    const solved = solveExpectedGoalsFromOdds(target.homeWinProb, target.drawProb, target.awayWinProb, target.over25Prob);

    expect(solved).not.toBeNull();
    expect(solved!.lambdaHome).toBeCloseTo(trueLambdaHome, 1);
    expect(solved!.lambdaAway).toBeCloseTo(trueLambdaAway, 1);

    // Plugging the solved values back through the forward model should closely reproduce
    // the original target probabilities, regardless of how tight the lambda match itself is.
    const reproduced = computeMatchProbabilities(solved!.lambdaHome, solved!.lambdaAway);
    expect(reproduced.homeWinProb).toBeCloseTo(target.homeWinProb, 2);
    expect(reproduced.drawProb).toBeCloseTo(target.drawProb, 2);
    expect(reproduced.awayWinProb).toBeCloseTo(target.awayWinProb, 2);
  });

  it('solves a lopsided real fixture (Arsenal 80.7% vs promoted Coventry) to a strongly asymmetric result', () => {
    // Real de-vigged consensus fetched live from The Odds API this session.
    const solved = solveExpectedGoalsFromOdds(0.807, 0.132, 0.061, 0.591);
    expect(solved).not.toBeNull();
    expect(solved!.lambdaHome).toBeGreaterThan(solved!.lambdaAway * 2);
    expect(solved!.lambdaHome).toBeGreaterThan(1.5);
    expect(solved!.lambdaAway).toBeLessThan(1.0);
  });

  it('solves a near-even fixture to near-equal expected goals', () => {
    const target = computeMatchProbabilities(1.4, 1.35);
    const solved = solveExpectedGoalsFromOdds(target.homeWinProb, target.drawProb, target.awayWinProb, target.over25Prob);
    expect(solved).not.toBeNull();
    expect(Math.abs(solved!.lambdaHome - solved!.lambdaAway)).toBeLessThan(0.3);
  });
});
